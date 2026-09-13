/**
 * Codex rollout adapter.
 *
 * Reads ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl. Each line is
 * { timestamp, ordinal, type, payload } where type is one of:
 *   session_meta | turn_context | response_item | event_msg
 *   | token_usage_record | compacted | world_state
 */
import path from 'node:path';
import {
  readJsonl, oneLine, unescapeBody, toMs, isInjectedText, firstLine, restAfterFirstLine, countLines,
} from './util.mjs';

const TEST_RE = /(npm|pnpm|yarn|bun)\s+(run\s+)?(test|vitest|jest|typecheck|lint)|pytest|python\s+-m\s+(pytest|unittest)|go\s+test|cargo\s+(test|clippy)|dotnet\s+test|mvn\s+test|gradle\w*\s+test|node\s+--test|deno\s+test|flutter\s+test|tsc\b|eslint|ruff\b|biome\b/i;
const READ_RE = /^\s*(cat|ls|dir|type|head|tail|Get-Content|Get-ChildItem|Select-String|rg|grep|findstr|find|tree|git\s+(status|log|diff|show)|wc)\b/i;

/** Pull `cmd:"..."` out of the JavaScript body Codex sends to the exec tool. */
function extractShellCommand(body) {
  const m = String(body || '').match(/(?:^|[\s{,(])cmd\s*:\s*"((?:[^"\\]|\\.)*)"/);
  return m ? unescapeBody(m[1]) : null;
}

/**
 * Parse an "*** Begin Patch" body into per-file added/removed line counts.
 * The body usually reaches us as an escaped JS/JSON string literal
 * (`const patch = "*** Begin Patch\n*** Add File: ..."`), so unescape first --
 * otherwise the whole patch reads as a single line and no file is detected.
 */
export function parsePatch(raw) {
  let text = String(raw || '');
  if (text.includes('\\n')) {
    text = text
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"');
  }

  const files = [];
  let current = null;
  for (const line of text.split('\n')) {
    const head = line.match(/\*\*\* (Add|Update|Delete) File:\s*(.+?)\s*$/);
    if (head) {
      const clean = head[2]
        .replace(/^["']|["']$/g, '')
        .replace(/\\\\/g, '\\')
        .replace(/\\/g, '/')
        .trim();
      current = { file: clean, added: 0, removed: 0, op: head[1].toLowerCase() };
      files.push(current);
      continue;
    }
    if (/\*\*\* (End Patch|Move to:)/.test(line)) { current = null; continue; }
    if (!current) continue;
    if (line.startsWith('+')) current.added++;
    else if (line.startsWith('-')) current.removed++;
  }
  return files.filter((f) => f.file);
}

/** Heuristic success read-out from a captured tool output. */
function inferOutcome(text) {
  const s = String(text || '');
  if (!s) return null;
  if (/Script failed|Script error|Traceback \(most recent|Unhandled exception|is not recognized as the name|command not found|No such file or directory|fatal: |FATAL ERROR/i.test(s)) return false;
  if (/Script completed|Wall time|exit\s*0\b/i.test(s)) return true;
  if (/\bexit\s*[1-9]\d*\b|\bexit code\s*[1-9]/i.test(s)) return false;
  return null;
}

function outputToText(output) {
  if (typeof output === 'string') return output;
  return (Array.isArray(output) ? output : [])
    .map((part) => (part && typeof part === 'object' ? part.text || '' : String(part || '')))
    .join('\n');
}

export async function parseCodexSession(file) {
  const rows = await readJsonl(file);
  if (!rows.length) return null;

  const pending = new Map();      // call_id -> event awaiting its output
  const events = [];
  const files = new Map();        // path -> { path, added, removed, op, at }
  const commands = [];
  let counts = { prompts: 0, thinks: 0, reads: 0, edits: 0, cmds: 0, says: 0 };
  let cwd = null, model = null, version = null, source = null, threadId = null;
  let startedAt = null, endedAt = null, turns = 0, aborted = 0;
  let contextPeak = 0, outputTokens = 0, cachedTokens = 0;
  let title = null, lastTurnId = null, approvals = null;

  const note = (ev) => { events.push(ev); return ev; };

  for (const row of rows) {
    const ts = toMs(row.timestamp);
    if (ts) { if (startedAt === null) startedAt = ts; endedAt = ts; }
    const payload = row.payload || {};

    if (row.type === 'session_meta') {
      cwd = payload.cwd || cwd;
      version = payload.cli_version || version;
      source = payload.source || source;
      threadId = payload.session_id || payload.id || threadId;
    }

    if (row.type === 'turn_context') {
      cwd = payload.cwd || cwd;
      model = payload.model || model;
    }

    if (row.type === 'event_msg') {
      if (payload.type === 'thread_settings_applied') {
        const s = payload.thread_settings || {};
        model = s.model || model;
        approvals = {
          approval: s.approval_policy || null,
          sandbox: (s.active_permission_profile && s.active_permission_profile.id)
            || (s.permission_profile && s.permission_profile.type) || null,
        };
      }
      if (payload.type === 'task_started') { turns++; lastTurnId = payload.turn_id || lastTurnId; }
      if (payload.type === 'turn_aborted') aborted++;
    }

    if (row.type === 'token_usage_record') {
      const u = payload.usage || {};
      const total = Number(u.total_tokens) || 0;
      if (total > contextPeak) contextPeak = total;
      outputTokens += Number(u.output_tokens) || 0;
      cachedTokens += Number(u.cached_input_tokens) || 0;
    }

    if (row.type !== 'response_item') continue;
    const kind = payload.type;

    if (kind === 'message') {
      const text = (Array.isArray(payload.content) ? payload.content : [])
        .map((c) => (typeof c === 'string' ? c : c && c.text) || '').join('\n').trim();
      if (!text || isInjectedText(text)) continue;
      if (payload.role === 'user') {
        counts.prompts++;
        if (!title) title = firstLine(text, 80);
        note({ at: ts, kind: 'prompt', title: firstLine(text, 96), detail: restAfterFirstLine(text) });
      } else if (payload.role === 'assistant') {
        counts.says++;
        note({ at: ts, kind: 'say', title: firstLine(text, 96), detail: restAfterFirstLine(text) });
      }
      continue;
    }

    if (kind === 'reasoning') {
      const summary = (Array.isArray(payload.summary) ? payload.summary : [])
        .map((s) => (s && s.text) || '').join(' ');
      if (!summary.trim()) continue;
      counts.thinks++;
      note({ at: ts, kind: 'think', title: oneLine(summary.replace(/\*\*/g, ''), 110), detail: '' });
      continue;
    }

    const isCall = kind === 'function_call' || kind === 'custom_tool_call';
    const isOutput = kind === 'function_call_output' || kind === 'custom_tool_call_output';

    if (isCall) {
      const name = payload.name || 'tool';
      const body = payload.input !== undefined ? payload.input : payload.arguments;
      const text = typeof body === 'string' ? body : JSON.stringify(body ?? '');
      const at = ts;
      const callId = payload.call_id || payload.id;

      if (/\*\*\* Begin Patch/.test(text)) {
        const touched = parsePatch(text);
        for (const f of touched) {
          const prev = files.get(f.file) || { path: f.file, added: 0, removed: 0, op: f.op, at };
          prev.added += f.added; prev.removed += f.removed; prev.op = f.op;
          files.set(f.file, prev);
        }
        counts.edits++;
        const ev = note({
          at, kind: 'edit', name: 'apply_patch',
          title: touched.length === 1 ? touched[0].file : touched.length + ' files patched',
          detail: touched.map((f) => f.op + ' ' + f.file).join('\n'),
          files: touched.map((f) => f.file),
          evidence: oneLine(text.split('\n').slice(0, 6).join(' '), 260),
        });
        if (callId) pending.set(callId, ev);
        continue;
      }

      const shell = name === 'exec_command' && typeof body === 'object' && body
        ? body.cmd
        : extractShellCommand(text);

      if (shell) {
        const isTest = TEST_RE.test(shell);
        const isRead = !isTest && READ_RE.test(shell);
        if (isRead) counts.reads++; else counts.cmds++;
        const ev = note({
          at,
          kind: isRead ? 'read' : 'cmd',
          name: name,
          title: oneLine(shell, 150),
          detail: '',
          cmd: shell,
          test: isTest,
          ok: null,
          evidence: null,
        });
        if (callId) pending.set(callId, ev);
        commands.push({ cmd: shell, at, test: isTest, ok: null, kind: isRead ? 'read' : 'cmd' });
        continue;
      }

      note({ at, kind: 'note', name, title: name, detail: oneLine(text, 300), evidence: null });
      continue;
    }

    if (isOutput) {
      const text = outputToText(payload.output);
      const ev = payload.call_id ? pending.get(payload.call_id) : null;
      if (ev) {
        ev.ok = inferOutcome(text);
        ev.evidence = oneLine(text, 320);
        const rec = commands.find((c) => c.cmd === ev.cmd && c.at === ev.at);
        if (rec) rec.ok = ev.ok;
      }
    }
  }

  if (!events.length) return null;
  const lastSay = [...events].reverse().find((e) => e.kind === 'say');
  if (lastSay) lastSay.final = true;
  const id = path.basename(file, '.jsonl').replace(/^rollout-/, '');
  const prompts = events.filter((e) => e.kind === 'prompt').length;

  return {
    id,
    source: 'codex',
    sourceLabel: 'Codex',
    title: title || oneLine(path.basename(file), 70),
    cwd,
    model,
    version,
    client: source,
    threadId,
    approvals,
    startedAt,
    endedAt,
    durationMs: startedAt && endedAt ? endedAt - startedAt : null,
    counts: Object.assign({}, counts, { prompts }),
    turns: turns || prompts,
    aborted,
    tokens: { contextPeak, output: outputTokens, cached: cachedTokens },
    files: [...files.values()],
    commands,
    events: events.slice(-4000),
    eventsTotal: events.length,
    truncated: events.length > 4000,
    origin: file,
  };
}
