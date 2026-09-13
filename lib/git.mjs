/**
 * Git evidence: what the repository looks like right now, next to the session cwd.
 * This is first-hand evidence, not log replay -- it is read live from the working tree.
 */
import { execFile } from 'node:child_process';

function run(cwd, args, timeout = 8000) {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, timeout, maxBuffer: 8 * 1024 * 1024, windowsHide: true },
      (error, stdout) => resolve(error ? null : String(stdout)));
  });
}

export async function gitContext(cwd) {
  if (!cwd) return null;
  const top = await run(cwd, ['rev-parse', '--show-toplevel']);
  if (!top) return null; // not a repository, or git is unavailable
  const root = top.trim();

  const [branchRaw, commitRaw, statusRaw, numstatRaw, logRaw] = await Promise.all([
    run(root, ['rev-parse', '--abbrev-ref', 'HEAD']),
    run(root, ['rev-parse', '--short', 'HEAD']),
    run(root, ['status', '--porcelain']),
    run(root, ['diff', 'HEAD', '--numstat']),
    run(root, ['log', '-1', '--pretty=%s|%an|%aI']),
  ]);

  const dirty = [];
  for (const line of String(statusRaw || '').split('\n')) {
    if (!line.trim()) continue;
    const m = line.match(/^\s*(\S+)\s+(.*)$/);
    if (m) dirty.push({ state: m[1], file: m[2].trim() });
  }

  let adds = 0, dels = 0;
  const files = [];
  for (const line of String(numstatRaw || '').split('\n')) {
    if (!line.trim()) continue;
    const [a, d, file] = line.split('\t');
    const added = a === '-' ? 0 : Number(a) || 0;
    const removed = d === '-' ? 0 : Number(d) || 0;
    adds += added; dels += removed;
    files.push({ file, added, removed });
  }
  const log = String(logRaw || '').trim().split('|');

  return {
    root,
    branch: branchRaw ? branchRaw.trim() : null,
    commit: commitRaw ? commitRaw.trim() : null,
    lastCommit: log[0] || null,
    lastAuthor: log[1] || null,
    lastCommitAt: log[2] || null,
    dirty,
    diff: { files, adds, dels },
  };
}
