# 动手学 Vue 3：维护说明

互动课程站点（VitePress）：27 章（6 个阶段，见 `course/stages.ts`）加速查表、132 道章内自测、60 道综合测验、67 道可判题练习、42 个实验台、46 张示意图。进度只存在浏览器里。

写内容、新增章节/练习/实验台/示意图/自测题前，先读 [`course/AUTHORING.md`](course/AUTHORING.md)。它是内容写作和维护的唯一依据（目录约定、frontmatter、各种写法、写作规则、测试、踩过的坑）。

## 文件

| 路径 | 内容 |
|---|---|
| `course/chapters/NN-id.md` | 一章一个文件；`cheat.md` 是速查表。frontmatter 里的 `id` 是存储键，不能改；`stage`（1 到 6）决定这一章属于哪个阶段 |
| `course/stages.ts` | 6 个阶段的唯一定义（编号、名称、英文副标题、说明）。侧边栏、首页、测验、引擎都从这里取，不要写第二份 |
| `course/engine/` | 学习机制：进度结构和单键存储（`types.ts`、`store.ts`）、复习卡片（`cards.ts`）、纯逻辑（`logic/`，有单元测试） |
| `course/exercises/NN-id.ts` | 该章的练习（判题函数、错误解法） |
| `course/labs/NN-id/*.vue` | 实验台；`labs/27-quiz/` 是综合测验（`questions.ts` 是 60 题） |
| `course/figures/NN-id/*.vue` | 示意图（按内容命名） |
| `course/.vitepress/config.mts` | 站点配置、自定义容器、并行构建的环境变量 |
| `course/.vitepress/course-data.mts` | 构建时从各章 `.md` 抽数据，生成 `virtual:course-meta` 和 `virtual:course-selfchecks` |
| `course/.vitepress/theme/` | 主题：`components/*.vue`（全局注册）、`composables/learn.ts`（界面读写进度的唯一入口，封装 engine/）、`style.css` |
| `editor/entry.js` | 练习编辑器（CodeMirror 6），被 `Exercise` 组件直接导入 |
| `scripts/shot.mjs` | 给一章截浅色和深色整页图 |
| `tests/unit/` | 学习机制的单元测试（vitest）。规则对照表见 `tests/unit/README.md` |
| `tests/site/` | Playwright 测试：`exercises.test.js`、`progress.test.js`、`quiz.test.js`、`labs/NN-id.js`（实验台测试数据）、`helpers.js` |
| `docs/` | 三份旧审查报告和教学设计调研。**它们针对的是第 14 版单文件课程**（`vue3-course.html`，已删除，取回见提交 `a2fe105`），不是现在的站点，只作背景参考 |

## 常用命令

```bash
npm install
npx playwright install chromium     # 只需一次
npm run dev                         # 开发服务器（热更新）
npm run build                       # 构建到 course/.vitepress/dist
npm run preview -- --port 4791      # 预览构建结果
npm test                            # 全部测试：单元测试 + 先构建再跑三个浏览器测试文件（约 6 分钟）
npm run test:unit                   # 只跑单元测试（很快）
npm run check                       # 检查（目前只跑单元测试，以后内容校验会加进来）
node tests/site/exercises.test.js 03-refs   # 只测一章（只构建这一章，快）
node scripts/shot.mjs 03-refs       # 截图自查
```

本机 shell 设了 HTTP 代理时，访问 localhost 的命令前加 `NO_PROXY=localhost,127.0.0.1`。

## 进度存储

只存在浏览器 `localStorage` 的**单个键 `hands-on-vue3-v1`**（结构见 `course/engine/types.ts`，规则见 `course/AUTHORING.md` 第 6 节）。界面读写只经过 `theme/composables/learn.ts`，它封装 `course/engine/`。旧版零散的进度键由引擎第一次读取时一次性迁移，之后不再读写。

- **自测答错**：不亮正确答案、不显示解析，提示再试，重试时隐藏上次选错的那一项；只有答对才显示解析。只有第一次作答计入复习卡片和首答记录。
- **章完成标准**：章内自测全部答对 + 本章练习全部通过，达标自动完成，没有手动标记按钮。章末的“掌握标准”条列出还差什么，借助答案通过的练习会单独标注。
- **阶段**：6 个阶段（`course/stages.ts`）。给一章指定阶段，只在它的 frontmatter 写 `stage: 1` 到 `6`；速查表和综合测验不写 `stage`，是侧边栏顶部的固定入口，不计入进度（总数是 26 章）。

## 必须遵守

- **自测题只能在末尾追加**：答案按序号保存（进度里 `<章id>.sc[序号]`），已有题不能删除、调序，也不能改题干和答案。自测题必须按 `AUTHORING.md` 4.11 的格式写，构建时靠它抽取复习题库。
- 章的 `id`（frontmatter）、实验台的 `id`、练习 id 都是存储键，创建后不能改。
- 写作规则（ASD-STE100、类比块、不用破折号等）见 `course/AUTHORING.md` 第 3 节。
- 技术内容以 Vue 3.5 为准，有疑问时用 `node_modules/vue` 运行代码核实。

## 修改流程

1. 改 `course/` 下的文件。新增一章不需要改任何共享文件（侧边栏、首页、进度都从 frontmatter 自动生成，别忘了写 `stage`）。
2. 跑相关测试（单章用 `node tests/site/exercises.test.js <章>`）；提交前运行 `npm test`（先单元测试，再浏览器测试），全部通过。
3. 用户报告的缺陷：先写一个会失败的测试，再修复。
4. 提交信息用中文。
