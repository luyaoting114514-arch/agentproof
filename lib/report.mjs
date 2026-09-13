/**
 * Discovery + aggregation + the verification model.
 *
 * Everything here reads local files only. No network, no telemetry.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { home, exists, isDir, walkFiles, displayPath } from './util.mjs';
import { parseCodexSession } from './codex.mjs';
import { parseClaudeSession } from './claude.mjs';
import { gitContext } from './git.mjs';

export const DEFAULT_SOURCES = {
  codex: home('.codex', 'sessions'),
  claude: home('.claude', 'projects'),
};

/** List candidate transcript files, newest first, without parsing them yet. */
export async function discover(opts = {}) {
  const sources = Object.assign({}, DEFAULT_SOURCES, opts.sources || {});
  const found = [];

  if (!opts.only || opts.only === 'codex') {
    const root = sources.codex;
    if (root && await isDir(root)) {
      const files = await walkFiles(root, (n) => n.startsWith('rollout-') && n.endsWith('.jsonl'));
      for (const file of files) {
        const st = await fs.stat(file).catch(() => null);
        if (st) found.push({ file, source: 'codex', mtime: st.mtimeMs, size: st.size });
      }
    }
  }

  if (!opts.only || opts.only === 'claude') {
    const root = sources.claude;
    if (root && await isDir(root)) {
      const files = await walkFiles(root, (n) => n.endsWith('.jsonl'));
      for (const file of files) {
        const st = await fs.stat(file).catch(() => null);
        if (st) found.push({ file, source: 'claude', mtime: st.mtimeMs, size: st.size });
      }
    }
  }

  found.sort((a, b) => b.mtime - a.mtime);
  return found;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * Cheap census of what exists on disk (readdir + stat only, no parsing).
 * The UI needs honest per-source totals even when it only parsed a slice.
 */
export async function inventory() {
  const found = await discover({});
  const bySource = {};
  for (const f of found) bySource[f.source] = (bySource[f.source] || 0) + 1;
  return { total: found.length, bySource };
}

/** Parse the newest `limit` transcripts, optionally filtered by working directory. */
export async function collect(opts = {}) {
  const limit = Number(opts.limit) > 0 ? Number(opts.limit) : 40;
  const rootFilter = opts.root ? displayPath(path.resolve(opts.root)).toLowerCase() : null;
  // Parsing is the expensive step, so only read as many transcripts as we need.
  // A root filter can drop sessions after parsing, hence the headroom.
  const scanCount = rootFilter ? limit * 2 : Math.max(limit, 8);
  const candidates = (await discover(opts)).slice(0, scanCount);

  const parsed = await mapLimit(candidates, 8, async (c) => {
    try {
      return c.source === 'codex'
        ? await parseCodexSession(c.file)
        : await parseClaudeSession(c.file);
    } catch (error) {
      return { id: path.basename(c.file), source: c.source, error: String(error && error.message || error), origin: c.file, events: [] };
    }
  });

  const sessions = parsed
    .filter(Boolean)
    .filter((s) => !rootFilter || displayPath(s.cwd || '').toLowerCase().startsWith(rootFilter))
    .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0))
    .slice(0, limit);

  return sessions;
}

/**
 * Turn raw counters into explicit checks. `level: ok` means the claim is backed by
 * something we can point at; `warn` means it needs a human look.
 */
export function verify(session, git) {
  const checks = [];
  const c = session.counts || {};
  const cmds = session.commands || [];
  const resolved = cmds.filter((x) => x.ok === true || x.ok === false);
  const failed = cmds.filter((x) => x.ok === false);
  const tests = cmds.filter((x) => x.test);
  const failedTests = tests.filter((x) => x.ok === false);
  const edits = (session.files || []).length;

  checks.push({
    id: 'commands',
    level: cmds.length === 0 ? 'info' : (resolved.length / cmds.length >= 0.5 ? 'ok' : 'warn'),
    value: cmds.length,
    data: { total: cmds.length, resolved: resolved.length },
    detail: resolved.length + ' of ' + cmds.length + ' with captured output',
  });

  checks.push({
    id: 'failures',
    level: failed.length === 0 ? 'ok' : 'warn',
    value: failed.length,
    data: { count: failed.length, samples: failed.slice(0, 3).map((f) => f.cmd) },
    detail: failed.length ? failed.slice(0, 3).map((f) => f.cmd).join(' · ') : 'no failing command recorded',
  });

  checks.push({
    id: 'tests',
    level: tests.length === 0 ? 'info' : (failedTests.length ? 'warn' : 'ok'),
    value: tests.length,
    data: { total: tests.length, failed: failedTests.length },
    detail: tests.length
      ? (failedTests.length ? failedTests.length + ' test run(s) reported a failure' : 'all recorded test runs passed')
      : 'no test or lint command in this session',
  });

  checks.push({
    id: 'edits',
    level: edits === 0 ? 'info' : 'ok',
    value: edits,
    data: { files: edits, added: (session.files || []).reduce((n, f) => n + (f.added || 0), 0) },
    detail: (session.files || []).reduce((n, f) => n + (f.added || 0), 0) + ' lines added across ' + edits + ' file(s)',
  });

  if (git) {
    checks.push({
      id: 'repo',
      level: 'ok',
      value: git.dirty.length,
      data: { root: git.root, branch: git.branch, dirty: git.dirty.length, adds: git.diff.adds, dels: git.diff.dels },
      detail: git.root + ' @ ' + (git.branch || 'detached') + (git.dirty.length ? ' · ' + git.dirty.length + ' uncommitted change(s)' : ' · clean'),
    });
  } else if (session.cwd) {
    checks.push({ id: 'repo', level: 'info', value: 0, data: { none: true }, detail: 'working directory is not a git repository' });
  }

  const approvals = session.approvals || {};
  if (approvals.sandbox || approvals.approval) {
    const loose = /danger|bypass|never/i.test(String(approvals.sandbox) + ' ' + String(approvals.approval));
    checks.push({
      id: 'permissions',
      level: loose ? 'warn' : 'ok',
      value: 0,
      data: { sandbox: approvals.sandbox || null, approval: approvals.approval || null, loose },
      detail: 'sandbox ' + (approvals.sandbox || 'n/a') + ' · approval ' + (approvals.approval || 'n/a'),
    });
  }

  const scored = checks.filter((x) => x.level !== 'info');
  const ok = scored.filter((x) => x.level === 'ok').length;
  return { score: scored.length ? Math.round((ok / scored.length) * 100) : 0, checks };
}

export function summarise(sessions) {
  const totals = {
    sessions: sessions.length,
    events: 0, commands: 0, failures: 0, tests: 0, files: 0, prompts: 0,
    added: 0, removed: 0, outputTokens: 0, durationMs: 0,
    first: null, last: null,
    bySource: {},
  };
  for (const s of sessions) {
    const c = s.counts || {};
    totals.events += s.eventsTotal || (s.events || []).length;
    totals.commands += (s.commands || []).length;
    totals.failures += (s.commands || []).filter((x) => x.ok === false).length;
    totals.tests += (s.commands || []).filter((x) => x.test).length;
    totals.files += (s.files || []).length;
    totals.prompts += c.prompts || 0;
    totals.added += (s.files || []).reduce((n, f) => n + (f.added || 0), 0);
    totals.removed += (s.files || []).reduce((n, f) => n + (f.removed || 0), 0);
    totals.outputTokens += (s.tokens && s.tokens.output) || 0;
    totals.durationMs += s.durationMs || 0;
    const key = s.source || 'unknown';
    totals.bySource[key] = (totals.bySource[key] || 0) + 1;
    if (s.startedAt) {
      if (!totals.first || s.startedAt < totals.first) totals.first = s.startedAt;
      if (!totals.last || s.endedAt > totals.last) totals.last = s.endedAt;
    }
  }
  return totals;
}

/** Compact list payload: enough for the rail, no event bodies. */
export function toListEntry(session) {
  const cmds = session.commands || [];
  return {
    id: session.source + ':' + session.id,
    source: session.source,
    sourceLabel: session.sourceLabel,
    title: session.title,
    cwd: session.cwd,
    model: session.model,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationMs: session.durationMs,
    counts: {
      prompts: (session.counts && session.counts.prompts) || 0,
      commands: cmds.length,
      failures: cmds.filter((x) => x.ok === false).length,
      tests: cmds.filter((x) => x.test).length,
      edits: (session.files || []).length,
      events: session.eventsTotal || 0,
    },
    error: session.error || null,
  };
}

export async function buildReport(opts = {}) {
  const started = Date.now();
  const sessions = await collect(opts);
  return {
    generatedAt: Date.now(),
    tookMs: Date.now() - started,
    host: { platform: process.platform, node: process.version, home: home() },
    sources: Object.assign({}, DEFAULT_SOURCES, opts.sources || {}),
    totals: summarise(sessions),
    sessions: sessions.map(toListEntry),
    full: sessions,
  };
}

export async function sessionDetail(id, opts = {}) {
  const key = String(id || '');
  // The id carries its source; without this, one global newest-first slice can
  // hide an entire source (Claude Code transcripts are often older than Codex's).
  const source = key.startsWith('claude:') ? 'claude' : (key.startsWith('codex:') ? 'codex' : null);
  const sessions = await collect(Object.assign({ limit: 80 }, opts, source ? { only: source } : {}));
  const session = sessions.find((s) => s.source + ':' + s.id === key || s.id === key);
  if (!session) return null;
  let git = null;
  if (session.cwd && await exists(session.cwd)) git = await gitContext(session.cwd);
  return { session, git, verify: verify(session, git) };
}
