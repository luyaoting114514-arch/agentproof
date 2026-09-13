# Contributing

## 运行

```powershell
node agentproof.mjs serve --open
```

不需要构建步骤。改 `web/` 下的文件刷新浏览器即可，改 `lib/` 下的文件要重启服务。

## 加一个新的 Agent 适配器

1. 在 `lib/` 下新建适配器，导出一个 `parseXxxSession(file)`，返回 `lib/report.mjs` 里约定的会话对象
2. 在 `discover()` 里加上它的目录
3. 在 `collect()` 的分支里接上

适配器要遵守两条：

- **按真实字段解析**，不要靠正则猜结构。先打开几个原始文件确认字段名。
- **拿不准就返回 `null`**。`ok: null` 表示"无法判断"，比猜一个 `true` 诚实。

## 加一个证据检查项

改 `lib/report.mjs` 的 `verify()`：push 一项 `{ id, level, value, data, detail }`。
`data` 放结构化字段，前端 `web/app.js` 的 `checkText()` 负责按语言拼句子——
不要把英文句子写进 `detail` 当作最终展示文本。

同时补上 `web/app.js` 里 `check.*` 的中英两条文案，以及 `web/app.css` 里 `.check[data-level]` 的配色。

## 提交前

```powershell
node --check web/app.js
node --check agentproof.mjs
node agentproof.mjs ls --limit 3
```
