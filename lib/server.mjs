/**
 * Local-only HTTP API. Binds to 127.0.0.1 by default so nothing leaves the machine.
 * Node standard library only -- no Express, no build step.
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect, summarise, toListEntry, inventory, verify as verifySession } from './report.mjs';
import { gitContext } from './git.mjs';
import { exists } from './util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function json(res, status, value) {
  send(res, status, JSON.stringify(value), 'application/json; charset=utf-8');
}

/** Serve a file from the project root, refusing anything outside it. */
async function serveStatic(res, urlPath) {
  const rel = decodeURIComponent(urlPath === '/' ? '/index.html' : urlPath);
  const target = path.resolve(ROOT, '.' + rel);
  if (!target.startsWith(ROOT)) return send(res, 403, 'forbidden', 'text/plain; charset=utf-8');
  try {
    const stat = await fs.stat(target);
    if (stat.isDirectory()) return send(res, 404, 'not found', 'text/plain; charset=utf-8');
    const body = await fs.readFile(target);
    return send(res, 200, body, MIME[path.extname(target).toLowerCase()] || 'application/octet-stream');
  } catch {
    return send(res, 404, 'not found', 'text/plain; charset=utf-8');
  }
}

/*
 * One memoised collection per option set. Parsing every transcript costs real
 * time, and the list view and the detail view must not each pay for it.
 */
const MEMO_TTL_MS = 60 * 1000;
let memo = { key: null, at: 0, sessions: [] };
/* Every session we have parsed, keyed by "source:id", across all collections. */
const byId = new Map();

async function getSessions(opts) {
  const accept = (sessions) => {
    for (const s of sessions) byId.set(s.source + ':' + s.id, s);
    return sessions;
  };
  const key = JSON.stringify(opts);
  if (memo.key === key && Date.now() - memo.at < MEMO_TTL_MS) return memo.sessions;
  const sessions = accept(await collect(opts));
  memo = { key, at: Date.now(), sessions };
  return sessions;
}

/** A session id carries its source, so a miss can be resolved by reading just that source. */
function sourceOf(id) {
  if (id.startsWith('codex:')) return 'codex';
  if (id.startsWith('claude:')) return 'claude';
  return null;
}

export async function createServer(options = {}) {
  const defaults = { limit: Number(options.limit) || 60, only: options.only || null, root: options.root || null };

  const server = http.createServer(async (req, res) => {
    let url;
    try { url = new URL(req.url, 'http://127.0.0.1'); } catch { return send(res, 400, 'bad request', 'text/plain; charset=utf-8'); }
    const route = url.pathname;

    try {
      if (route === '/api/health') {
        return json(res, 200, { ok: true, version: '0.2.0', pid: process.pid });
      }

      if (route === '/api/report') {
        const opts = {
          limit: Number(url.searchParams.get('limit')) || defaults.limit,
          only: url.searchParams.get('only') || defaults.only,
          root: url.searchParams.get('root') || defaults.root,
        };
        const started = Date.now();
        const [sessions, inv] = await Promise.all([getSessions(opts), inventory()]);
        return json(res, 200, {
          generatedAt: Date.now(),
          tookMs: Date.now() - started,
          host: { platform: process.platform, node: process.version },
          inventory: inv,
          totals: summarise(sessions),
          sessions: sessions.map(toListEntry),
        });
      }

      if (route === '/api/session') {
        const id = url.searchParams.get('id');
        if (!id) return json(res, 400, { error: 'id required' });
        if (url.searchParams.get('fresh')) memo = { key: null, at: 0, sessions: [] };
        const known = byId.get(id);
        const source = sourceOf(id);
        const opts = {
          limit: Number(url.searchParams.get('limit')) || defaults.limit,
          only: source || defaults.only,
          root: defaults.root,
        };
        const sessions = known ? [] : await getSessions(opts);
        const session = known || sessions.find((s) => s.source + ':' + s.id === id || s.id === id);
        if (!session) return json(res, 404, { error: 'session not found', id });
        let git = null;
        if (session.cwd && await exists(session.cwd)) git = await gitContext(session.cwd);
        return json(res, 200, { session, git, verify: verifySession(session, git) });
      }

      if (route.startsWith('/api/')) return json(res, 404, { error: 'unknown endpoint' });
      return serveStatic(res, route);
    } catch (error) {
      return json(res, 500, { error: String(error && error.message || error) });
    }
  });

  return server;
}

export function listen(server, port, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve(server.address()));
  });
}
