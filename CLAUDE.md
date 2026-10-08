# 动手学 Vue 3：维护说明

互动课程站点（VitePress）：26 章（6 个阶段，见 `course/stages.ts`）加速查表、134 道章内自测、60 道阶段测验专用题、70 道可判题练习、42 个实验台、46 张示意图。进度只存在浏览器里。（这些数字用脚本数过；增删内容后重新数，不要估。）

写内容、新增章节/练习/实验台/示意图/自测题前，先读 [`course/AUTHORING.md`](course/AUTHORING.md)。它是内容写作和维护的唯一依据（目录约定、frontmatter、各种写法、写作规则、测试、踩过的坑）。

## 文件

| 路径 | 内容 |
|---|---|
| `course/chapters/NN-id.md` | 一章一个文件；`cheat.md` 是速查表。frontmatter 里的 `id` 是存储键，不能改；`stage`（1 到 6）决定这一章属于哪个阶段 |
| `course/stages.ts` | 6 个阶段的唯一定义（编号、名称、英文副标题、说明）。侧边栏、首页、测验、引擎都从这里取，不要写第二份 |
| `course/engine/` | 学习机制：进度结构和单键存储（`types.ts`、`store.ts`）、复习卡片（`cards.ts`）、纯逻辑（`logic/`：间隔复习、提示阶梯、自我解释、阶段测验、复习队列，有单元测试） |
| `course/exercises/NN-id.ts` | 该章的练习（判题函数、错误解法） |
| `course/labs/NN-id/*.vue` | 实验台 |
| `course/checks/questions.ts` | 阶段测验专用题库（60 题，卡片键 `章id#cN` 靠它的出现顺序编号，只能在末尾追加） |
| `course/review.md`、`course/check/1.md` 到 `6.md` | 今日复习页、6 个阶段测验页（页面内容是组件 `ReviewPage`、`StageCheck`）。旧地址 `chapters/27-quiz.md` 只是跳转页 |
| `course/figures/NN-id/*.vue` | 示意图（按内容命名） |
| `course/.vitepress/config.mts` | 站点配置、自定义容器、并行构建的环境变量 |
| `course/.vitepress/course-data.mts` | 构建时从各章 `.md` 抽数据，生成 `virtual:course-meta`、`virtual:course-selfchecks`（题干选项解析）和 `virtual:course-summaries`（各章小结，自我解释用） |
| `course/.vitepress/theme/` | 主题：`components/*.vue`（全局注册）、`composables/learn.ts`（界面读写进度的唯一入口，封装 engine/）、`composables/catalog.ts`（按需载入复习卡片目录）、`style.css` |
| `editor/entry.js` | 练习编辑器（CodeMirror 6），被 `Exercise` 组件直接导入 |
| `scripts/shot.mjs` | 给一章截浅色和深色整页图 |
| `tests/unit/` | 学习机制的单元测试（vitest）。规则对照表见 `tests/unit/README.md` |
| `tests/site/` | Playwright 测试：`exercises.test.js`、`progress.test.js`、`mechanics.test.js`（学习机制）、`labs/NN-id.js`（实验台测试数据）、`helpers.js` |
| `docs/` | 三份旧审查报告和教学设计调研。**它们针对的是第 14 版单文件课程**（`vue3-course.html`，已删除，取回见提交 `a2fe105`），不是现在的站点，只作背景参考 |

## 常用命令

```bash
npm install
npx playwright install chromium     # 只需一次
npm run dev                         # 开发服务器（热更新）
npm run build                       # 构建到 course/.vitepress/dist
npm run preview -- --port 4791      # 预览构建结果
npm test                            # 全部测试：单元测试 + 先构建再跑三个浏览器测试文件（约 7 分钟）
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
- **阶段**：6 个阶段（`course/stages.ts`）。给一章指定阶段，只在它的 frontmatter 写 `stage: 1` 到 `6`；速查表不写 `stage`，是侧边栏顶部的固定入口，不计入进度（总数是 26 章）。每个阶段末尾有一个阶段测验页（`/check/N`）。

## 学习机制（不要破坏）

课程按学习科学设计，用户明确要求保留（两门课 hands-on-react 和 hands-on-vue3 共用同一套规则，"课"在这里叫"章"）。实现在 `course/engine/`，纯逻辑部分有单元测试（`tests/unit/`，规则和测试名的对照表见 `tests/unit/README.md`）。界面在 `course/.vitepress/theme/components/`，只调用 `engine/logic/` 里的纯函数，不在组件里重写规则：

- **先预测再运行**：实验台预测前隐藏说明（`Lab`、`Sc predict`）。
- **课前热身（提取练习）和间隔复习**：答错的题第二天再出（固定隔 1 天，不看盒子）；答对的题只有**到期**了才提升复习间隔，没到期的答对不改任何记录（盒子、到期时间、次数都不变）；答错不管到没到期都回到盒子 0。这条"到期才升级"的门由 `logic/srs.ts` 的 `shouldRecord` / `gatedNextCard`（引擎里的 `srsRecordGated`）实现，**课前热身、复习页的混合练习、阶段测验三处共用**。"今日复习"只出到期卡，所以不受影响。章内自测（`Sc`）是第一次作答，直接记录（`answerSelfCheck`）；只有第一次作答计入复习。
- **"12 小时内答过的不再出"只适用于课前热身**（`warmupPool`）。混合练习和阶段测验不过滤：阶段测验是固定 12 题的测验，不是复习，过滤会抽不满。
- **间隔序列**：盒子 0..5 对应 0/1/3/7/16/35 天。答对进下一个盒子（到顶不再升）；答错回到盒子 0 并安排明天再出。`SRS_DAYS[0] = 0` 只是占位，不参与计算（用它的话答错的题当天就到期，会违反"答错第二天再出"）。
- **测验答错不亮正确答案，重试时隐藏上次选的项**：章内自测（`Sc`）和课前热身（`Question` 的 `retry` 方式）。今日复习是复习，答完显示答案和解析；阶段测验是交卷模式。
- **提示阶梯**：`[提示, 失败 1 次], [半成品, 失败 2 次且 2 分钟], [参考答案, 失败 3 次且 5 分钟]`（分钟从第一次失败算起）；练习没有 `faded` 字段时没有半成品这一级，其余门槛不变。只有代码真的改了才算一次失败：模板和脚本分别去掉注释、空白、分号、逗号后，至少一段要和起始代码、**上一次失败的代码**都不同（所以来回切换两份不同的失败代码，每次都算一次失败；半成品和参考答案另有 2 分钟、5 分钟的时间门槛，刷失败次数绕不过时间）。粘贴参考答案原文（两段都与答案相同）不能通过，也不计失败，除非看过答案后按了"重置"自己重写；借助答案完成会单独标记（`help`：`solution` 是看过答案后改写通过，`rewrite` 是点了重置自己重写通过，界面分开说明）。`hints` 里的多条提示整体算第一级，解锁后可以逐条展开。（实现：`logic/ladder.ts`、`logic/exerciseState.ts`，界面 `Exercise.vue`。）
- **自我解释**：至少 30 个有效字（去掉空白和标点，连续重复的字折叠；不同字少于 10 个会被压低到最多 9）才展示参考要点。参考要点是本章"小结"块，章里的小结块默认隐藏（`sx-hidden`），写够字、点了"对照本章要点"才在自我解释区域里显示。它不是章完成的必要条件。（实现：`logic/selfExplain.ts`，界面 `SelfExplain.vue`。）
- **阶段测验**：12 题（8 道专用题优先没见过的 + 4 道常规题，不足时互相补位），交卷后才显示解析，80% 通过（12 题要答对 10 题）；中途离开算未通过（每答一题记一次 `pending`，下次进入页面时结算）；未通过要等 30 分钟；以最近一次为准；通过后清掉之前未通过留下的"需要加强的章"（`weak`）；35 天后提示复测；答错的题进入复习队列。（实现：`logic/stageCheck.ts`，界面 `StageCheck.vue`。）

**自动注入**：课前热身（`Warmup`）和自我解释（`SelfExplain`）不写在章的 Markdown 里。热身由 `config.mts` 的 markdown 规则插在每个带 `stage` 的章的一级标题后面；自我解释由主题布局的 `doc-footer-before` 插槽放在掌握标准条之前。新增一章不用做任何事。

**页面**：今日复习 `/review`（`course/review.md`，侧边栏最上面，徽标是到期题数）；阶段测验 `/check/1` 到 `/check/6`（`course/check/N.md`，侧边栏每个阶段末尾，显示通过状态）。

改引擎或这些组件后，跑 `npm run test:unit` 和 `node tests/site/mechanics.test.js`（先 `npm run build`）。后者用 Playwright 的 `page.clock.setFixedTime` 控制时间，覆盖上面每一条（提示阶梯三级的解锁条件、代码没改不计失败、粘贴答案不通过、半成品、自我解释 30 字门槛、热身出题和记录、复习页、阶段测验、390px 无横向滚动）。

## 必须遵守

- **自测题只能在末尾追加**：答案按序号保存（进度里 `<章id>.sc[序号]`），已有题不能删除、调序，也不能改题干和答案。自测题必须按 `AUTHORING.md` 4.11 的格式写，构建时靠它抽取复习题库。阶段测验专用题（`course/checks/questions.ts`）同样只能在末尾追加：卡片键 `章id#cN` 按出现顺序编号。
- 章的 `id`（frontmatter）、实验台的 `id`、练习 id 都是存储键，创建后不能改。
- 写作规则（ASD-STE100、类比块、不用破折号等）见 `course/AUTHORING.md` 第 3 节。
- 技术内容以 Vue 3.5 为准，有疑问时用 `node_modules/vue` 运行代码核实。

## 修改流程

1. 改 `course/` 下的文件。新增一章不需要改任何共享文件（侧边栏、首页、进度都从 frontmatter 自动生成，别忘了写 `stage`）。
2. 跑相关测试（单章用 `node tests/site/exercises.test.js <章>`）；提交前运行 `npm test`（先单元测试，再浏览器测试），全部通过。
3. 用户报告的缺陷：先写一个会失败的测试，再修复。
4. 提交信息用中文。
