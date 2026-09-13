# AgentProof

AI Agent 说它做完了。AgentProof 告诉你它**到底做了什么**，以及**哪些结论有证据**。

它直接读你本机的 Agent 会话记录——Codex 的 rollout、Claude Code 的 transcript——加上当前 Git 仓库状态，
生成一份逐条可核对的执行审计报告。零依赖、零上传、零遥测。

```
npm 不需要。安装包不需要。双击 启动AgentProof.bat 就行。
```

## 它解决什么问题

Agent 的"我改好了，测试通过了"无法验证。日志散在好几个工具的私有目录里，格式各不相同。
AgentProof 把这些记录统一成一件事：**每条结论背后有哪次工具调用、哪条命令输出、哪个文件改动在支撑。**

具体能拿到的东西：

- 每条 shell 命令的原文和捕获到的输出
- 哪些命令返回了错误（Claude Code 的 `is_error` 是官方字段，不是猜的）
- 每个被修改的文件，以及 `+/−` 行数
- 测试与 lint 命令跑了多少次、结果如何
- 会话跑在什么权限模式下（`bypassPermissions`、`danger-full-access` 这类会显式标出来）
- 当前仓库的分支、提交、未提交改动、真实 diff 统计

## 快速开始

需要 Node.js 18 或更高版本（[nodejs.org](https://nodejs.org)）。除此之外没有任何依赖。

```powershell
cd agentproof
node agentproof.mjs serve --open
```

浏览器会打开 `http://127.0.0.1:7317/`，左侧列出本机发现的所有 Agent 会话，点开就是审计详情。
Windows 用户可以直接双击 `启动AgentProof.bat`。

如果从 GitHub Releases 下载 `AgentProof-*-win-x64-portable.zip`，解压后直接双击其中的 `AgentProof.exe` 即可使用，不需要安装 Node.js、npm 或 PowerShell。应用只读取当前用户自己的 Codex / Claude Code 日志，日志不会上传。

想在看之前先拿到一份文件：

```powershell
node agentproof.mjs scan --out report.json   # 生成 JSON 报告
node agentproof.mjs ls --limit 20            # 终端里直接列最近会话
node agentproof.mjs show claude:71ceb88d-... # 终端里看单个会话
```

## 数据从哪来

| 来源 | 路径 | 读取内容 |
| --- | --- | --- |
| Codex | `~/.codex/sessions/**/rollout-*.jsonl` | 会话元数据、用户指令、推理摘要、工具调用与输出、token 用量 |
| Claude Code | `~/.claude/projects/**/*.jsonl` | 会话标题、指令、思考、工具调用（Bash/Edit/Write/Read）、工具结果 |
| Git | 会话记录的 `cwd` | 分支、提交、`status`、`diff HEAD --numstat` |

两边格式都没有公开标准，适配器是按真实文件字段写的，不是猜的。字段变了会退化而不是崩掉——
解析失败的会话会被跳过，不会污染其他结果。

## 隐私

- 服务只监听 `127.0.0.1`，不对外暴露
- 不发起任何外部网络请求，没有账号，没有分析上报
- 日志始终在你机器上，读出来的内容只在你自己的浏览器里渲染

## 界面

深色、紧凑、键盘可操作。苹果那套排版与动效基础（字号层级、留白、`linear()` 采样的临界阻尼弹簧曲线、
`prefers-reduced-motion` / `prefers-reduced-transparency` / `prefers-contrast` 三档降级）
加上明日方舟式的工业 HUD 细节（斜切角面板、细发丝线、琥珀色信号强调、等宽微标签）。

界面中英双语，右上角切换，默认跟随系统语言。

快捷键：`/` 搜索 · `↑` `↓` 切换会话 · `r` 重新扫描 · `e` 导出报告 · `Esc` 清空搜索

会话可以深链：`http://127.0.0.1:7317/#s=claude:71ceb88d-...&kind=cmd&lang=en`

## 桌面应用与打包

```powershell
npm install       # 只有参与源码开发才需要
npm run desktop
npm run portable  # 生成无需安装的 Windows 便携目录到 dist/win-unpacked/
npm run dist      # 生成 Windows NSIS 安装包到 dist/
```

Electron 壳启动的是同一个本地引擎，所以桌面版和网页版行为一致。Release 同时提供便携版 zip；NSIS 安装包适合希望有开始菜单/卸载入口的用户。

## 项目结构

```
agentproof.mjs        命令行入口：ls / scan / show / serve
lib/codex.mjs         Codex rollout 适配器
lib/claude.mjs        Claude Code transcript 适配器
lib/git.mjs           实时 Git 证据
lib/report.mjs        发现、归一化、证据核对模型
lib/server.mjs        本地 HTTP API（Node 标准库）
web/app.js            前端逻辑
web/app.css           设计系统
index.html            页面骨架
```

## 已知边界

- **权限模式不等于行为证据**：`bypassPermissions` 是"权限放宽"的信号，不代表这次运行做了危险操作。
- **命令成败是从输出推断的**：Claude Code 有 `is_error` 字段，Codex 只能靠输出文本判断，判定为 `null` 表示无法确定。
- **文件行数来自工具调用内容**：不是 `git diff` 的结果，导入与删除混合时会有偏差。
- **没有接入 Cursor / Gemini CLI**：目前只做了 Codex 和 Claude Code，其余目录存在但未解析。
- **CI 结果未接入**。

## 路线图

1. 补齐适配器：Cursor、Gemini CLI、以及 Codex CLI 与 Desktop 的差异字段
2. 接入 CI 结果（GitHub Actions / GitLab）作为外部证据
3. 会话之间对比：同一个仓库上的多次运行，改动是否重叠
4. 签发安装包并配置自动构建（`.github/workflows/release.yml`）

## 许可证

MIT，见 [LICENSE](LICENSE)。`LICENSE` 里的版权行是占位，正式开源前换成你自己的署名。

---

## English summary

AgentProof reads your local AI coding-agent transcripts (Codex rollouts, Claude Code sessions)
plus live Git state, and renders a report that answers one question: **what did the agent
actually do, and which claims are backed by evidence?**

Zero dependencies, no build step, no network calls, nothing uploaded.

```powershell
node agentproof.mjs serve --open
```

It surfaces recorded shell commands with their captured output, failing commands, per-file
line deltas, test/lint runs, the session's permission mode, and the repository's real
`git status` / `diff` numbers. The UI is bilingual (Chinese / English) and keyboard driven.
