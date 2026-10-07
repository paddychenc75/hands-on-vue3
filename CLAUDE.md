# Vue3 从零到专家：维护说明

单文件互动课程：27 章（4 个阶段）、综合实战、60 道测验、67 道可判题练习、42 个实验台。所有内容和逻辑都在 `vue3-course.html` 中。

## 文件

| 路径 | 内容 |
|---|---|
| `vue3-course.html` | 课程。CSS、正文、脚本都在这个文件中（约 1.2 MB）。 |
| `cm.min.js` | 练习编辑器（CodeMirror 6）的打包结果。由 `editor/entry.js` 生成，不要手改。 |
| `editor/entry.js` | 编辑器源码：语言、主题、补全、出错行标记。导出 `window.VueCM.create()`。 |
| `vendor/vue.global.prod.js` | Vue 3.5.43。CDN 不可用时页面使用它。 |
| `server.js` | 本地服务：静态文件 + SQLite 进度接口。零依赖，需要 Node 22.13+。 |
| `data/progress.db` | 学习进度（运行服务后生成，不要提交）。 |
| `tests/*.test.js` | Playwright 测试。`npm test` 运行全部。 |
| `docs/` | 第 14 版的两份专家审查报告和教学设计调研。 |

## 常用命令

```bash
npm install
npx playwright install chromium   # 只需一次
npm start                         # http://localhost:8080/
npm test                          # 全部测试（约 10 分钟）
node tests/exercises.test.js      # 只测练习：初始代码不通过、答案通过、wrong 不通过
npm run build:editor              # 修改 editor/entry.js 后重新生成 cm.min.js
```

测试把 jsDelivr 的 Vue 换成 `node_modules/vue`，所以不需要网络。

## 页面结构（vue3-course.html）

- 每章是 `<section class="ch" id="…" data-stage="1-4" data-title="…">`。章标题 h2 必须等于 `data-title`（或 `data-title：副标题`）。目录、"下一章"链接都从 `data-title` 生成。
- 小节是 `<h3><span class="step">N.M</span>标题</h3>`，从 N.1 起连续编号，不能放在 `details.deep` 中。
- 代码块：`<script type="text/x-code">…</script>`，加载时高亮。代码中的 `</script>` 写成 `<\/script>`，`<!--` 写成 `<\!--`。
- 实验台：`<div class="lab">` 中的 `.lab-body[id]`，由页面底部脚本按 id 挂载（接近视口时才挂载）。
- 练习：脚本中的 `EX.<id> = { title, ch, task, tpl, js, solTpl, solJs, hints, check(T), wrong }`；页面位置是 `<div class="ex" data-ex="<id>"></div>`。每道新练习至少写 1 个 `wrong`（来自真实误解的错误解法）。
- 自测：`.selfcheck` 中的 `.sc`。**学习者的答案按序号保存，已有题只能在末尾追加，不能删除、调序或改题干和答案。**
- 目标：`li[data-checks="sc:0,ex:id"]`，后面的 `<span class="gtag">自测 N 题 · 练习 M 道</span>` 要和实际数量一致。不要挂"回顾"题。
- 移动小节后，要更新练习提示（`HINTS`、`EX.*.hints`）和测验解析中引用的"N.M 标题"或"N.M 节"。

## 进度和存储

- 浏览器：`localStorage` 中的 `vue3deep:<键>`。同步的键见脚本中的 `SYNC`。每个键带修改时间（`vue3deep:ts`），合并时较新的一方生效。练习草稿 `vue3deep:ex:<id>` 只存在浏览器中。
- 同步目标（`remote.init()` 按顺序选择）：
  1. 作为 claude.ai Artifact 打开时：`window.claude` 的 db（账号中的私有文档）。
  2. 通过 `server.js` 打开时：`GET/PUT /api/progress`，保存在 SQLite（表 `progress`，单用户 `local`）。
  3. 都没有时（例如直接双击 HTML 文件）：只用 localStorage。
- 阅读位置 `last` = {id, k, v: POS_V, a 稳定锚点, dy, h, deep, t}。**改了章节结构时把 `POS_V` 加 1**；旧记录会按锚点或小节标题（`relocate()`）找到新位置。
- 小节已读 `secRead`：停留时间（正文字数 ÷ 20 秒，8 到 90 秒）且看到小节末尾才算。标记为已完成的章，所有小节都算已读。

## 练习编辑器

- 文本框（`textarea[data-k="tpl"|"js"]`）始终保存代码：判题读它，草稿也存它。
- 编辑器接近视口时，`cmUpgrade()` 用 CodeMirror 替换显示；CodeMirror 修改后写回文本框并触发 `input`。程序修改文本框（重置、看答案）后调用 `fit(el)`，它把内容和出错行推回 CodeMirror。
- `cm.min.js` 加载失败时，使用带高亮层（`pre.hlay`）和 `edKeys()` 按键的文本框编辑器。`tests/editor-fallback.test.js` 测试这条路径。

## 写作规则

- 简体中文，约 80% ASD-STE100：短句，一句一个意思，主动语态，步骤用编号祈使句。
- 比喻只放在"类比"块中。正文不用破折号（—）。
- 每个 API 的小节：问题 → 最小代码 → 1 到 3 个"场景：" → 注意 → 实验台/练习 → 深入（原理，放在 `details.deep`）。阶段一、二先讲用法后讲原理。
- 用后面章节才讲的 API 时，写"（第 N 章）"或换掉。
- 技术内容以 Vue 3.5 为准。已核实（2026-10）：vue 3.5.43，vue-router 5.3.1，vite 8.3.3（Rolldown），pinia 4.0.3。有疑问时用 `node_modules/vue` 运行代码核实。

## 修改流程

1. 改 `vue3-course.html`（或 `editor/entry.js` 后运行 `npm run build:editor`）。
2. 运行相关测试；提交前运行 `npm test`，全部通过。
3. 用户报告的缺陷：先写一个会失败的测试，再修复。
