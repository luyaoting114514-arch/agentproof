#!/usr/bin/env node
/**
 * AgentProof CLI -- reads your local AI-agent transcripts and answers one question:
 * what did the agent actually do, and what can we prove?
 *
 *   node agentproof.mjs scan   [--limit 30] [--only codex] [--root PATH] [--out report.json]
 *   node agentproof.mjs serve  [--port 7317] [--open] [--limit 60]
 *   node agentproof.mjs ls     [--limit 20]
 *
 * Zero dependencies. No network access. Nothing is uploaded anywhere.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { buildReport, sessionDetail, summarise, DEFAULT_SOURCES } from './lib/report.mjs';
import { createServer, listen } from './lib/server.mjs';
import { localStamp } from './lib/util.mjs';

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

function fmtDuration(ms) {
  if (!ms) return '-';
  const s = Math.round(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 48) return h + 'h ' + (m % 60) + 'm';
  return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
}

function pad(v, n) { return String(v).padEnd(n).slice(0, n); }

async function cmdLs(args) {
  const sessions = await buildReport({ limit: Number(args.limit) || 20, only: args.only, root: args.root });
  const rows = sessions.sessions;
  if (!rows.length) {
    console.log('\nNo agent transcripts found.');
    console.log('  looked in ' + DEFAULT_SOURCES.codex);
    console.log('  looked in ' + DEFAULT_SOURCES.claude + '\n');
    return;
  }
  console.log('');
  console.log(pad('SOURCE', 13) + pad('WHEN', 12) + pad('CMD', 5) + pad('FAIL', 5) + pad('FILES', 6) + 'TITLE');
  console.log('-'.repeat(96));
  for (const s of rows) {
    const when = localStamp(s.endedAt);
    console.log(pad(s.sourceLabel, 13) + pad(when, 12) + pad(s.counts.commands, 5)
      + pad(s.counts.failures, 5) + pad(s.counts.edits, 6) + String(s.title).slice(0, 44));
  }
  console.log('-'.repeat(96));
  console.log(rows.length + ' sessions · ' + rows.reduce((n, s) => n + s.counts.commands, 0) + ' commands · '
    + rows.reduce((n, s) => n + s.counts.failures, 0) + ' failures · '
    + rows.reduce((n, s) => n + s.counts.edits, 0) + ' files touched\n');
}

async function cmdScan(args) {
  const limit = Number(args.limit) || 40;
  console.log('Scanning local agent transcripts...');
  const report = await buildReport({ limit, only: args.only, root: args.root });
  const totals = report.totals;

  console.log('');
  console.log('  sessions   ' + totals.sessions);
  console.log('  commands   ' + totals.commands + '  (' + totals.failures + ' failed)');
  console.log('  files      ' + totals.files + '  (+' + totals.added + ' / -' + totals.removed + ' lines)');
  console.log('  prompts    ' + totals.prompts);
  if (totals.first) {
    console.log('  range      ' + new Date(totals.first).toISOString().slice(0, 10)
      + '  ->  ' + new Date(totals.last).toISOString().slice(0, 10) + '  (' + fmtDuration(totals.durationMs) + ' logged)');
  }
  console.log('  took       ' + report.tookMs + ' ms');
  console.log('');

  for (const s of report.sessions.slice(0, 10)) {
    console.log('  [' + s.sourceLabel + '] ' + String(s.title).slice(0, 58));
    console.log('     ' + (s.cwd || '-'));
    console.log('     ' + s.counts.commands + ' commands · ' + s.counts.failures + ' failed · '
      + s.counts.edits + ' files · ' + fmtDuration(s.durationMs));
  }
  if (report.sessions.length > 10) console.log('\n  ... and ' + (report.sessions.length - 10) + ' more\n');

  const out = args.out || 'agentproof-report.json';
  delete report.full;
  await fs.writeFile(path.resolve(out), JSON.stringify(report, null, 2), 'utf8');
  console.log('Wrote ' + path.resolve(out) + '\n');
}

async function cmdServe(args) {
  const server = await createServer({ limit: Number(args.limit) || 60, only: args.only, root: args.root });
  const first = Number(args.port) || 7317;
  let address = null;
  // A second instance must not die just because the default port is taken.
  for (let port = first; port < first + 12; port++) {
    try {
      address = await listen(server, port);
      break;
    } catch (error) {
      if (error && error.code === 'EADDRINUSE') continue;
      throw error;
    }
  }
  if (!address) {
    console.error('agentproof: no free port in range ' + first + '-' + (first + 11));
    process.exitCode = 1;
    return;
  }
  const url = 'http://127.0.0.1:' + address.port + '/';
  console.log('');
  console.log('  AgentProof is running at ' + url);
  console.log('  reading ' + DEFAULT_SOURCES.codex);
  console.log('  reading ' + DEFAULT_SOURCES.claude);
  console.log('  press Ctrl+C to stop');
  console.log('');
  if (args.open) {
    const opener = process.platform === 'win32' ? 'cmd' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
    const openerArgs = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    try { spawn(opener, openerArgs, { detached: true, stdio: 'ignore', windowsHide: true }).unref(); } catch { /* user can open it manually */ }
  }
}

async function cmdShow(args) {
  const id = args._[1];
  if (!id) { console.error('usage: node agentproof.mjs show <source:id>'); process.exitCode = 1; return; }
  const detail = await sessionDetail(id, { limit: Number(args.limit) || 60 });
  if (!detail) { console.error('session not found: ' + id); process.exitCode = 1; return; }
  const { session, git, verify } = detail;
  console.log('\n' + session.title + '\n' + '='.repeat(Math.min(80, session.title.length)));
  console.log('source     ' + session.sourceLabel + '  ' + (session.model || ''));
  console.log('cwd        ' + session.cwd);
  console.log('window     ' + localStamp(session.startedAt) + '  ->  ' + localStamp(session.endedAt));
  console.log('duration   ' + fmtDuration(session.durationMs));
  console.log('counts     ' + JSON.stringify(session.counts));
  if (git) console.log('git        ' + git.branch + ' @ ' + git.commit + '  dirty=' + git.dirty.length + '  +' + git.diff.adds + '/-' + git.diff.dels);
  console.log('\nchecks (score ' + verify.score + ')');
  for (const c of verify.checks) console.log('  [' + c.level.padEnd(4) + '] ' + c.id.padEnd(12) + c.detail);
  console.log('\nevents');
  for (const e of session.events.slice(0, 40)) {
    const t = e.at ? localStamp(e.at, false) + ':' + String(new Date(e.at).getSeconds()).padStart(2, '0') : '--:--:--';
    console.log('  ' + t + '  ' + e.kind.padEnd(6) + ' ' + String(e.title).slice(0, 90));
  }
  console.log('');
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0] || 'ls';
try {
  if (cmd === 'ls' || cmd === 'list') await cmdLs(args);
  else if (cmd === 'scan') await cmdScan(args);
  else if (cmd === 'serve' || cmd === 'ui') await cmdServe(args);
  else if (cmd === 'show') await cmdShow(args);
  else {
    console.log('\nAgentProof -- local AI agent run inspector\n');
    console.log('  node agentproof.mjs ls      list recent agent sessions');
    console.log('  node agentproof.mjs scan    full scan, writes agentproof-report.json');
    console.log('  node agentproof.mjs show <source:id>   one session in detail');
    console.log('  node agentproof.mjs serve --open       open the local UI\n');
  }
} catch (error) {
  console.error('agentproof: ' + (error && error.stack || error));
  process.exitCode = 1;
}
