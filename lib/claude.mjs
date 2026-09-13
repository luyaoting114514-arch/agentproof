/**
 * Claude Code transcript adapter.
 *
 * Reads ~/.claude/projects/<slug>/<session-uuid>.jsonl. Line shapes we use:
 *   user / assistant      -> message.content is a string or a block array
 *                            (text | thinking | tool_use | tool_result)
 *   ai-title              -> { aiTitle }
 *   permission-mode       -> { permissionMode }
 *   system / attachment / file-history-snapshot -> ignored
 */
import path from 'node:path';
import { readJsonl, oneLine, toMs, isInjectedText, firstLine, restAfterFirstLine, countLines } from './util.mjs';

const TEST_RE = /(npm|pnpm|yarn|bun)\s+(run\s+)?(test|vitest|jest|typecheck|lint)|pytest|python\s+-m\s+(pytest|unittest)|go\s+test|cargo\s+(test|clippy)|dotnet\s+test|mvn\s+test|gradle\w*\s+test|node\s+--test|deno\s+test|flutter\s+test|tsc\b|eslint|ruff\b|biome\b/i;
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const READ_TOOLS = new Set(['Read', 'Glob', 'Grep', 'LS']);

function blockText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((b) => {
    if (!b || typeof b !== 'object') return '';
    if (b.type === 'text') return b.text || '';
    if (b.type === 'thinking') return b.thinking || '';
    if (b.type === 'tool_result') return blockText(b.content);
    return '';
  }).filter(Boolean).join('\n');
}

export async function parseClaudeSession(file) {
  const rows = await readJsonl(file);
  if (!rows.length) return null;

  const pending = new Map();
  const events = [];
  const files = new Map();
  const commands = [];
  const counts = { prompts: 0, thinks: 0, reads: 0, edits: 0, cmds: 0 };
  let cwd = null, branch = null, version = null, sessionId = null, permission = null, model = null;
  let title = null, startedAt = null, endedAt = null;
  let inputTokens = 0, outputTokens = 0, cachedTokens = 0, contextPeak = 0;
  let turns = 0;

  for (const row of rows) {
    const ts = toMs(row.timestamp);
    if (ts) { if (startedAt === null) startedAt = ts; endedAt = ts; }
    cwd = row.cwd || cwd;
    branch = row.gitBranch || branch;
    version = row.version || version;
    sessionId = row.sessionId || sessionId;

    if (row.type === 'permission-mode') { permission = row.permissionMode || permission; continue; }
    if (row.type === 'ai-title') { title = row.aiTitle || title; continue; }
    if (row.type !== 'user' && row.type !== 'assistant') continue;
    if (row.isSidechain) continue;

    const message = row.message || {};
    const usage = message.usage || {};
    if (message.model && message.model !== '<synthetic>') model = message.model;
    if (usage.input_tokens || usage.cache_read_input_tokens) {
      const live = (Number(usage.input_tokens) || 0) + (Number(usage.cache_read_input_tokens) || 0)
        + (Number(usage.cache_creation_input_tokens) || 0);
      if (live > contextPeak) contextPeak = live;
    }
    outputTokens += Number(usage.output_tokens) || 0;
    inputTokens += Number(usage.input_tokens) || 0;
    cachedTokens += Number(usage.cache_read_input_tokens) || 0;

    const content = message.content;
    const blocks = Array.isArray(content) ? content : [];
    const isToolResultCarrier = blocks.some((b) => b && b.type === 'tool_result');

    // --- plain human prompt ---
    if (row.type === 'user' && !isToolResultCarrier) {
      const text = (typeof content === 'string' ? content : blockText(content)).trim();
      if (!text || isInjectedText(text)) continue;
      counts.prompts++;
      if (!title) title = firstLine(text, 80);
      events.push({ at: ts, kind: 'prompt', title: firstLine(text, 96), detail: restAfterFirstLine(text) });
      continue;
    }

    for (const b of blocks) {
      if (!b || typeof b !== 'object') continue;

      if (b.type === 'thinking') {
        const text = String(b.thinking || '').trim();
        if (!text) continue;
        counts.thinks++;
        events.push({ at: ts, kind: 'think', title: oneLine(text.replace(/[*#`]/g, ''), 110), detail: '' });
        continue;
      }

      if (b.type === 'text' && row.type === 'assistant') {
        const text = String(b.text || '').trim();
        if (!text) continue;
        events.push({ at: ts, kind: 'say', title: firstLine(text, 96), detail: restAfterFirstLine(text) });
        continue;
      }

      if (b.type === 'tool_result') {
        const ev = pending.get(b.tool_use_id);
        const text = blockText(b.content);
        if (ev) {
          ev.ok = b.is_error ? false : true;
          ev.evidence = oneLine(text, 320);
          const rec = commands.find((c) => c.id === b.tool_use_id);
          if (rec) rec.ok = ev.ok;
        }
        continue;
      }

      if (b.type !== 'tool_use') continue;
      const input = b.input || {};
      const at = ts;
      const toolId = b.id;

      if (EDIT_TOOLS.has(b.name)) {
        const target = String(input.file_path || input.notebook_path || input.path || '(unknown file)').replace(/\\/g, '/');
        let added = 0, removed = 0;
        if (b.name === 'Write') added = countLines(input.content);
        else if (b.name === 'Edit') {
          added = countLines(input.new_string); removed = countLines(input.old_string);
        } else if (b.name === 'MultiEdit' && Array.isArray(input.edits)) {
          for (const e of input.edits) { added += countLines(e.new_string); removed += countLines(e.old_string); }
        }
        if (input.content) added = countLines(input.content);
        const prev = files.get(target) || { path: target, added: 0, removed: 0, op: b.name.toLowerCase(), at };
        prev.added += added; prev.removed += removed;
        files.set(target, prev);
        counts.edits++;
        const ev = {
          at, kind: 'edit', name: b.name, title: target,
          detail: b.name + ' · +' + added + ' −' + removed,
          files: [target],
          evidence: oneLine(input.new_string || input.content || input.old_string || '', 260),
        };
        events.push(ev);
        if (toolId) pending.set(toolId, ev);
        continue;
      }

      if (b.name === 'Bash') {
        const cmd = String(input.command || '');
        const isTest = TEST_RE.test(cmd);
        counts.cmds++;
        const ev = {
          at, kind: 'cmd', name: 'Bash',
          title: oneLine(cmd, 150),
          detail: oneLine(input.description || '', 120),
          cmd, test: isTest, ok: null, evidence: null, id: toolId,
        };
        events.push(ev);
        if (toolId) pending.set(toolId, ev);
        commands.push({ id: toolId, cmd, at, test: isTest, ok: null, kind: 'cmd' });
        continue;
      }

      if (READ_TOOLS.has(b.name)) {
        counts.reads++;
        const target = input.file_path || input.path || input.pattern || b.name;
        events.push({
          at, kind: 'read', name: b.name,
          title: oneLine(b.name + ' ' + target, 130), detail: '', evidence: null,
        });
        continue;
      }

      events.push({
        at, kind: 'note', name: b.name,
        title: oneLine(b.name + ' ' + (input.description || input.subject || ''), 130),
        detail: '', evidence: null,
      });
    }
  }

  if (!events.length) return null;
  const lastSay = [...events].reverse().find((e) => e.kind === 'say');
  if (lastSay) lastSay.final = true;
  const prompts = events.filter((e) => e.kind === 'prompt').length;

  return {
    id: sessionId || path.basename(file, '.jsonl'),
    source: 'claude',
    sourceLabel: 'Claude Code',
    title: title || oneLine(path.basename(file), 70),
    cwd,
    model,
    version,
    client: 'claude-code',
    threadId: sessionId,
    approvals: permission ? { approval: null, sandbox: permission } : null,
    startedAt,
    endedAt,
    durationMs: startedAt && endedAt ? endedAt - startedAt : null,
    counts: Object.assign({}, counts, { prompts }),
    turns: prompts,
    aborted: 0,
    tokens: { contextPeak, output: outputTokens, cached: cachedTokens, input: inputTokens },
    files: [...files.values()],
    commands,
    events: events.slice(-4000),
    eventsTotal: events.length,
    truncated: events.length > 4000,
    origin: file,
    branchAtStart: branch && branch !== 'HEAD' ? branch : null,
  };
}
