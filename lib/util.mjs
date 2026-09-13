/**
 * Shared helpers for the AgentProof engine.
 * Zero dependencies: Node standard library only.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export function home(...parts) {
  return path.join(os.homedir(), ...parts);
}

export async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

export async function isDir(p) {
  try { return (await fs.stat(p)).isDirectory(); } catch { return false; }
}

/** Recursively collect files under `dir` whose name matches `filter`. */
export async function walkFiles(dir, filter, out = [], depth = 0) {
  if (depth > 12) return out;
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkFiles(full, filter, out, depth + 1);
    else if (entry.isFile() && filter(entry.name)) out.push(full);
  }
  return out;
}

/** Parse a .jsonl file into objects, tolerating malformed trailing lines. */
export async function readJsonl(file) {
  let text;
  try { text = await fs.readFile(file, 'utf8'); } catch { return []; }
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch { /* partial write mid-session: skip */ }
  }
  return rows;
}

export async function readJson(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return null; }
}

/** Collapse whitespace and cut to `n` characters. */
export function oneLine(value, n = 160) {
  const s = String(value ?? '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

/** JSON-unescape a string body captured by a regex (handles \" \n \u1234). */
export function unescapeBody(body) {
  try { return JSON.parse('"' + body + '"'); } catch { return body; }
}

export function asArray(value) {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

export function toMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000; // seconds vs milliseconds
  }
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

export function durationLabel(ms) {
  if (!ms || ms < 0) return null;
  const s = Math.round(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ' + String(s % 60).padStart(2, '0') + 's';
  return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm';
}

/** Normalise a filesystem path for display: forward slashes, no trailing sep. */
export function displayPath(p) {
  return String(p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

/** Strip the turn's injected context wrappers so only human text remains. */
export function isInjectedText(text) {
  const s = String(text || '').trim();
  if (!s) return true;
  return /^<(environment_context|permissions instructions|user_instructions|turn_aborted|system|skill)/i.test(s)
    || /^(# AGENTS\.md instructions|# Files mentioned by the user|## Skills|## My request:)/i.test(s)
    || /^<(app-context|response-annotations|collaboration_mode)/i.test(s)
    || /cc-switch:|response-annotations/i.test(s);
}

/** Local-time stamp used by the CLI (ISO strings are UTC and read wrong on a desk). */
export function localStamp(ms, withDate = true) {
  if (!ms) return '-';
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  const time = p(d.getHours()) + ':' + p(d.getMinutes());
  return withDate ? p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + time : time;
}

export function countLines(text) {
  const s = String(text ?? '');
  if (!s) return 0;
  return s.split('\n').length;
}

export function firstLine(text, n = 120) {
  const s = String(text ?? '').split('\n').find((l) => l.trim()) || '';
  return oneLine(s, n);
}

/**
 * Everything after the first line. Used so a prompt's body does not repeat the
 * headline that is already shown directly above it.
 */
export function restAfterFirstLine(text) {
  const s = String(text ?? '');
  const i = s.indexOf('\n');
  return i === -1 ? '' : oneLine(s.slice(i + 1).trim(), 400);
}
