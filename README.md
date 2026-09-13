# AgentProof

**Evidence-first observability for AI coding agents.**

AgentProof turns local Codex and Claude Code transcripts into a searchable audit trail: what the agent was asked to do, which commands it ran, what those commands returned, which files changed, and which claims are actually supported by evidence.

It is local-first by design. The app listens only on `127.0.0.1`, does not require an account, and does not upload transcripts or telemetry.

## Why AgentProof

AI coding agents are fast, but “done” is not the same as “verified”. AgentProof gives teams and individuals a compact, inspectable record for debugging, handoff, review, and incident analysis.

| Capability | What you can inspect |
| --- | --- |
| Session discovery | Local Codex rollouts and Claude Code transcripts |
| Command evidence | Original shell command, captured output, and failure signal |
| Change evidence | Touched files, estimated line deltas, Git status and diff statistics |
| Quality signals | Test and lint runs, token usage, duration, permission mode |
| Review workflow | Search, filters, expandable evidence, keyboard shortcuts, JSON export |

## Get started

### Windows users: no setup required

Download the latest `AgentProof-*-win-x64-portable.zip` from [Releases](https://github.com/luyaoting114514-arch/agentproof/releases), extract it, and double-click `AgentProof.exe`.

The portable build bundles its runtime. You do **not** need Node.js, npm, PowerShell, or a separate database. It reads only the current Windows user's local agent directories.

### Run from source

Requires Node.js 18 or newer:

```powershell
git clone https://github.com/luyaoting114514-arch/agentproof.git
cd agentproof
npm install
npm run serve
```

The browser opens at `http://127.0.0.1:7317/`. On Windows, `AgentProof.bat` is a convenience launcher for the source checkout.

Useful commands:

```powershell
node agentproof.mjs scan --out report.json
node agentproof.mjs ls --limit 20
node agentproof.mjs show claude:<session-id>
```

## Data sources

| Source | Default location | Parsed evidence |
| --- | --- | --- |
| Codex | `~/.codex/sessions/**/rollout-*.jsonl` | Prompts, reasoning summaries, tool calls, outputs, token usage |
| Claude Code | `~/.claude/projects/**/*.jsonl` | Prompts, thinking, Bash/Edit/Write/Read calls, tool results |
| Git | Each session's recorded `cwd` | Branch, commit, status, and `diff --numstat` |

Adapters tolerate unknown fields and skip malformed sessions instead of stopping the whole scan. No transcript is bundled in this repository.

## Privacy and security

- The local server binds to `127.0.0.1`; it is not exposed to your network.
- The application makes no external API requests and has no analytics or telemetry.
- Source and portable distributions contain application code only, not your local transcripts.
- Generated reports can contain prompts, command output, filenames, and local paths. **Do not commit or share a report without reviewing it first.** Reports are ignored by `.gitignore` by default.
- The Electron shell disables Node integration in the renderer and opens external links through the system browser.

## Interface

The UI combines Apple-inspired typography, spacing, and motion with a restrained industrial HUD treatment inspired by Arknights. It supports Chinese and English, follows the system language on first launch, and remembers the selected language locally.

Keyboard shortcuts: `/` search · `↑` / `↓` switch sessions · `r` rescan · `e` export · `Esc` clear search.

## Desktop builds

```powershell
npm install
npm run desktop
npm run portable   # unpacked portable build in dist/win-unpacked/
npm run dist:win   # Windows NSIS installer
npm run dist:mac   # macOS DMG (run on macOS)
npm run dist:linux # Linux AppImage (run on Linux)
```

Pushing a `v*` tag runs the GitHub Actions release workflow and builds platform-specific artifacts. The workflow does not have access to your local agent directories; CI builds from the repository source only.

## Current scope

Supported: Codex and Claude Code transcripts, local Git evidence, bilingual web UI, Electron desktop shell.

Planned: Cursor and Gemini CLI adapters, CI result ingestion, cross-session comparisons, and signed releases.

## Contributing

Bug reports, sample-format fixtures with secrets removed, and adapter improvements are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).

---

## English summary

AgentProof is a local-first audit viewer for AI coding-agent runs. It reads Codex rollouts and Claude Code transcripts, correlates them with live Git state, and presents evidence for commands, outputs, failures, file changes, tests, permissions, and token usage. The server is localhost-only and does not upload data. Windows users can download the portable release and run `AgentProof.exe` without installing Node.js.
