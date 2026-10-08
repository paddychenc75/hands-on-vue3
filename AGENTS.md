# AGENTS.md：维护“动手学 Vue 3”课程

这是一套中文交互式 Vue 3 课程：42 章，6 个阶段（入门、进阶、生态与实战、响应式原理、渲染原理、架构与工程），其中六章是选读，四章是动手做的项目章，外加一页速查表。站点用 **VitePress** 构建，静态发布到 GitHub Pages。每章是一个 Markdown 文件，自测题内联在 Markdown 里；练习的判题数据在 `course/exercises/`，实验台是 Vue 组件，引擎逻辑在 `course/engine/`。进度只存在浏览器里。

用户用中文交流。回复、提交信息和课程文字都用中文。本文件是唯一的规则源：`CLAUDE.md` 只导入它，Codex 等其他 agent 直接读它。

姊妹课程是 [hands-on-react](https://github.com/paddychenc75/hands-on-react)（本机在 `../hands-on-react`）：两门课共用同一套学习机制、命令名和检查思路。差别只在内容形态：React 课用 MDX 加每课一个数据文件，Vue 课用 Markdown 加章内自测。

## 先记住这几条

1. **加章用脚手架**：`npm run new-chapter -- …`（见「怎样加一章」），不要手工拼多处。
2. **提交前跑 `npm run check`**（约 2 秒）：类型、内容校验、文档数字核对、单元测试。`npm test` 是完整流程（还要构建和浏览器测试）。
3. **复习卡片键 `章id#N` / `章id#cN` 不能变**：已有自测题的顺序不能调换、不能删中间的题，新题只追加到本章自测的末尾，专用题只追加到 `course/checks/questions.ts` 的末尾（见「卡片键快照」）。
4. **改引擎先改单元测试**，再改代码，最后跑 `npm run test:e2e -- mechanics`（见「改引擎的流程」）。
5. **“学习机制”一节的规则不能破坏**，那是用户明确要求保留的。
6. **章 id、实验台 id、练习 id 是存储键**，创建后不能改。
7. 具体的 Markdown 写法（容器、`<Sc>`、`<Lab>`、示意图、练习字段、写作规范、`check:content` 检查的规则、站内链接和 base）以 [`course/AUTHORING.md`](course/AUTHORING.md) 为准，本文件讲规则和流程，不重复抄写法。两份文档里同一条规则只写一处，另一处指过去。
8. **站内链接带 base**：站点部署在 `/hands-on-vue3/` 下，组件里手写链接用 `withBase`，localStorage 里存不带 base 的路径（见 AUTHORING 4.14）。

## 命令

```bash
npm install                        # 第一次；会自动启用提交前钩子（见下）
npx playwright install chromium    # 第一次（浏览器测试用）
```

| 命令 | 什么时候用 | 耗时 |
|---|---|---|
| `npm run dev` | 写章、改样式、改组件。热更新。**地址带 base：`http://localhost:5173/hands-on-vue3/`**（不是根路径，端口以输出为准）。已有人开着开发服务器就别杀它，换端口：`npm run dev -- --port 5200` | 启动几秒 |
| `npm run build` | 构建到 `course/.vitepress/dist`。Markdown 编译错误和死链接都会让构建失败 | 约 7 秒 |
| `npm run preview` | 预览构建结果，地址同样带 base：`http://localhost:4173/hands-on-vue3/`。端口被占用时：`npm run preview -- --port 4791` | 即时 |
| `npm run typecheck` | `tsc --noEmit`，范围是 `course/engine/`、`tests/unit/`、`vitest.config.mts`（见「类型检查的严格程度」） | 约 1 秒 |
| `npm run check:content` | 内容校验（不需要浏览器）：章节与 frontmatter、自测题格式、目标、练习、实验台、卡片键快照、站内引用等 | 不到 1 秒 |
| `npm run check:docs` | 核对本文件、`README.md`、`course/AUTHORING.md`、首页组件里带单位的数字（章数、练习数、实验台数、术语数……）与实际一致 | 不到 1 秒 |
| `npm run test:unit` | Vitest 单元测试：SRS、提示阶梯、自我解释、阶段测验等纯逻辑，术语标注的匹配规则，章节解析，以及内容校验规则的测试 | 约 1 秒 |
| **`npm run check`** | typecheck + check:content + check:docs + test:unit。**每次提交前跑** | 约 3 秒 |
| `npm run test:e2e` | 浏览器测试（Playwright），读 `course/.vitepress/dist`（或 `COURSE_OUT_DIR` 指向的目录），**先 `npm run build`** | 全部约 9 分钟 |
| `npm run test:e2e -- 03-refs 04-computed` | 只测指定章（exercises 套件）。它自己只构建这些章到临时目录，不用先 build | 每章几秒到十几秒 |
| `npm run test:e2e -- mechanics progress glossary folds` | 只跑学习机制 / 跨章功能 / 术语表 / 折叠只读块套件 | 各约 1 到 3 分钟 |
| **`npm test`** | check + build + test:e2e，**完整验收**。改引擎、主题组件、样式后必跑 | 约 9 分钟 |
| `npm run test:site` | build + test:e2e（旧名字，保留） | 约 9 分钟 |
| `npm run new-chapter -- <章id> --stage <1-6> --after <已有章id> --title "标题"` | 加一章 | 即时 |
| `npm run move-chapter -- <章id> --after <已有章id> [--stage <1-6>]` | 把一章移到另一个位置（可同时改阶段），自动改名和改引用 | 即时 |
| `npm run reorder-chapters -- <计划.json>` | 一次重排所有章的顺序和阶段（计划文件写新顺序），只扫一遍，所有章号同时映射 | 即时 |
| `npm run screenshots -- 03-refs` | 给一章截浅色和深色整页图（只构建这一章），改版面后人工看一眼。整页长图缩小后看不清，细看用下一行 | 十几秒 |
| `node scripts/shot.mjs --blocks 13-project-board [--out 目录]` | **逐区块截图**：章头与目标、每个实验台（先猜没答时和答完之后）、每道练习（编辑器加载完成后；含折叠块的再截展开后的）、每张表格、每张示意图、自测块（答一题后），浅色和深色各一套，桌面宽度；另外 390px 宽度下截实验台和练习。目标可写多个章，`all` 是全部章，`pages` 是首页、复习页、术语表页、一个阶段测验页和速查表页（这两个目标会构建全站）。还会写 `findings.txt`：自动发现残留的字面 `**`、`:::`、`【待写】`、HTML 实体，手机宽度横向溢出，控制台报错，实验台或练习没渲染。图片要用 Read 逐张看：自动检查只能发现文字层面的问题 | 一章约半分钟；全站约 40 分钟 |

- `npm run test:e2e` 的用法：`-- <套件> [章名 …]`，套件是 `exercises`（逐章：练习、半成品、自测、实验台）、`progress`（跨章功能）、`mechanics`（学习机制）、`glossary`（术语表和术语标注）、`folds`（练习里的折叠只读块）；写了章名就只跑 exercises；什么都不写就依次跑五个。
- 单个测试文件也可以直接运行：`node tests/site/exercises.test.js 03-refs`。
- 本机 shell 设了 HTTP 代理时，访问 localhost 的命令前加 `NO_PROXY=localhost,127.0.0.1`（`npm run test:e2e` 已自动加）。
- 并行构建的环境变量：`COURSE_CHAPTERS`（只构建这些章）、`COURSE_OUT_DIR`、`COURSE_CACHE_DIR`（独立的输出和缓存目录）。多个 agent 同时工作时，用独立目录构建，不要都写默认的 `course/.vitepress/dist`。**五个浏览器测试套件都认 `COURSE_OUT_DIR`**：先 `COURSE_OUT_DIR=/tmp/x/dist COURSE_CACHE_DIR=/tmp/x/cache npx vitepress build course`，再 `COURSE_OUT_DIR=/tmp/x/dist npm run test:e2e -- progress`。
- Node 版本：`.nvmrc` 是 24，`engines` 要求 `>=24`。`package.json` 没有 `"type": "module"`（测试用 CommonJS，VitePress 配置是 `.mts`），所以脚本都是 `.mjs`，不要给 `package.json` 加 `type`。
- **提交前钩子**：`npm install` 的 `prepare` 会把 `core.hooksPath` 设为 `.githooks/`（手动启用：`node scripts/setup-hooks.mjs`），每次提交前自动跑 `check:content` 和 `check:docs`（2 秒内）。CI 里和没有 `.git` 的环境不会启用。紧急跳过：`git commit --no-verify`。
- 本仓库没有 Biome：现有代码风格不统一（有的文件写分号，有的不写），强行格式化会改动大量文件。以后要加，先统一风格再启用。

## 目录约定

| 位置 | 放什么 | 不放什么 |
|---|---|---|
| `course/chapters/NN-id.md` | 一章一个文件，`NN` 是两位章号，`id` 是章的稳定编号。`cheat.md` 是速查表（没有章号）。`27-quiz.md` 只是旧地址的跳转页（它的文件名带 27，和第 27 章 `27-reactivity-pitfalls.md` 并存、互不冲突（文件名不同，输出的页面地址也不同）：它没有 `id`，不是章，`REDIRECT_PAGES` 把它排除在所有校验和侧边栏之外；URL 要保持 `/chapters/27-quiz`，所以不改名） | 练习判题、实验台代码 |
| `course/site.mjs` | 站点部署路径 `BASE_PATH`，**唯一的定义处**：`config.mts`、测试、脚本都从它取 | — |
| `course/mini/` | 迷你 Vue 零件库（响应式原理和渲染原理两个阶段共用：`reactive`、`effect`、`queueJob`、`watch`、`mountComponent`……），`src/` 是各章累加的源码，`index.ts` 汇总，`load.ts` 在练习和实验台里载入；编号约定、术语（渲染副作用函数、更新任务、调度函数、更新队列）和折叠块用法见 `course/mini/README.md` | 练习里另写一份零件 |
| `course/content-parse.mjs` | 章节 Markdown 的纯文本解析（frontmatter、自测题、小结、术语块、阅读时间、术语汇总）。站点构建和 Node 脚本共用这一份 | 读文件、DOM |
| `course/writing-terms.mjs` | 首页「写作规则」表的数据（带“不使用的同义词”），术语表页的“不这样说”一栏也用它 | — |
| `course/stages.ts` | 6 个阶段的唯一定义（编号、名称、英文副标题、说明）。一章属于哪个阶段，由它 frontmatter 的 `stage` 决定 | 章的内容 |
| `course/learning-paths.mjs` | 首页「学习路线」的三条路线（想尽快能做项目、想系统掌握、已有 Vue 经验想补原理）。只写章 id，章号由首页从元数据取；`check:content` 校验 id、阶段号、章按章号排列 | 写死的章号 |
| `course/exercises/NN-id.ts` | 该章的练习数据（判题函数、错误解法、提示、半成品）。自动汇总，不用登记；`types.ts` 是类型 | 共用辅助模块（会被当成一章的练习收集） |
| `course/labs/NN-id/*.vue` | 实验台组件；`_shared/` 是各章共用的辅助函数 | — |
| `course/figures/NN-id/*.vue` | 示意图（按内容命名，只含 `<template>`） | — |
| `course/checks/questions.ts` | 阶段测验专用题库（卡片键 `章id#cN` 靠它的出现顺序编号，只能在末尾追加） | — |
| `course/review.md`、`course/glossary.md`、`course/check/N.md` | 今日复习页、术语表页（自动汇总各章术语块）、各阶段测验页（内容是组件 `ReviewPage`、`GlossaryPage`、`StageCheck`） | — |
| `course/card-keys.snapshot.json` | 复习卡片键快照，**提交进仓库**，由脚本更新（见「卡片键快照」） | 手改 |
| `course/.vitepress/theme/composables/exerciseLibs.ts` | 练习声明 `libs: ['pinia' | 'vue-router']` 时，运行器载入真实的 Pinia 和 Vue Router 并装进练习应用（写法见 `AUTHORING.md` 4.10） | 其他练习的运行逻辑 |
| `course/engine/logic/folds.ts` | 练习代码里 `//#fold` 折叠只读块的解析（纯函数）；编辑器接线在 `editor/folds.js`，浏览器测试 `tests/site/folds.test.js` | DOM |
| `course/engine/logic/` | **纯函数**：不碰 DOM、localStorage，不读 `Date.now()`（时间由参数传入）。有单元测试，`tests/unit/purity.test.ts` 会挡住副作用；`tests/unit/cycles.test.ts` 检查没有循环依赖 | DOM、存储、`window` |
| `course/engine/*.ts` | 进度结构和存储（`types.ts`、`store.ts`）、复习卡片（`cards.ts`），模块清单见下面「引擎模块」 | 业务规则（放进 `logic/` 并写测试） |
| `course/.vitepress/` | `config.mts`（站点配置、base、自定义容器、章头和热身的自动注入、并行构建变量）、`sidebar.mts`、`course-data.mts`（构建时从各章抽数据，生成虚拟模块）、`markdown-cjk.mts`、`theme/`（`components/*.vue` 全局注册，`composables/learn.ts` 是界面读写进度的唯一入口，`composables/terms.ts` + `term-match.ts` 是术语标注，`style.css` 全部样式） | 学习机制的逻辑 |
| `course/AUTHORING.md` | 内容写作细则：每种 Markdown 写法、练习字段、实验台、示意图、测试数据、踩过的坑 | — |
| `editor/entry.js` | 练习编辑器（CodeMirror 6），被 `Exercise` 组件直接导入 | — |
| `scripts/` | `check-content.mjs`（内容校验）、`check-docs.mjs`（文档数字核对）、`new-chapter.mjs`（加章脚手架）、`e2e.mjs`（浏览器测试入口）、`setup-hooks.mjs`（启用提交前钩子）、`shot.mjs`（截图）；`lib/` 是它们共用的（`validate.mjs` 是全部校验规则，`section-refs.mjs` 是小节引用的统一扫描（校验和改号共用），`known-issues.mjs` 是临时豁免，目前是空的；`ref-tense.mjs` 查引用的措辞和对象章的位置是否一致；`reorder.mjs` 和 `reorder-chapters.mjs` 一次重排所有章） | — |
| `tests/unit/` | Vitest 单元测试（`*.test.ts`）；规则对照表见 `tests/unit/README.md` | 需要浏览器的测试 |
| `tests/site/` | Playwright 测试：`exercises.test.js`、`progress.test.js`、`mechanics.test.js`、`glossary.test.js`、`folds.test.js`，`helpers.js` 是共用的；`labs/NN-id.js` 是各章实验台的测试数据 | — |
| `tests/expected.cjs` | 测试里**锁定**的章数、选读章 id 和每阶段题数，集中在这一个文件；其余数字都从元数据算 | 别处再写死数字 |
| `docs/` | 三份旧审查报告和教学设计调研。**它们针对的是第 14 版单文件课程**（`vue3-course.html`，已删除，取回见提交 `a2fe105`），只作背景参考，不检查 | — |
| `.github/` | `workflows/ci.yml`（check + e2e）、`deploy.yml`（CI 通过后部署）、`dependabot.yml` | — |
| `.githooks/` | 提交前钩子（`check:content` + `check:docs`） | — |
| `course/.vitepress/dist`、`cache` | 构建产物和缓存，不提交 | — |

### 引擎模块（`course/engine/`）

| 模块 | 职责 |
|---|---|
| `types.ts` | 进度存储的类型（`Progress`、`SrsCard`、`StageRecord`…） |
| `store.ts` | 进度存储（`localStorage['hands-on-vue3-v1']`）、旧键一次性迁移 |
| `cards.ts` | 间隔复习卡片的读写（`__srs`）、卡片目录（`buildCatalog`）、卡片键（`scKey`、`checkKey`）、章内自测作答（`answerSelfCheck`） |
| `logic/srs.ts` | SRS 间隔推进、到期判断、热身选题、“到期才升级”的门 |
| `logic/ladder.ts` | 提示阶梯解锁、“代码是否真的改了”、粘贴答案判断 |
| `logic/exerciseState.ts` | 练习状态：失败记录、通过、草稿、借助答案的标记 |
| `logic/selfExplain.ts` | 自我解释有效字数 |
| `logic/stageCheck.ts` | 阶段测验抽题、及格、冷却、复测、交卷记录 |
| `logic/review.ts` | 今日复习队列和混合练习 |
| `logic/completion.ts` | 一章的完成判定和“掌握标准” |
| `logic/migrate.ts` | 旧版零散进度键的迁移 |
| `logic/random.ts` / `text.ts` | 洗牌和种子随机 / 文字小工具 |

界面组件（`course/.vitepress/theme/components/`）只调用 `engine/logic/` 里的纯函数，不在组件里重写规则。

**不允许循环依赖**：`logic/` 只依赖 `logic/` 里的纯文件和类型；`engine/` 不 import 主题或 VitePress。

## 怎样加一章

```bash
npm run new-chapter -- hooks-recap --stage 2 --after composables --title "组合式函数复盘"
```

脚本做的事：

1. 生成 `course/chapters/NN-id.md`（frontmatter、目标、阅读时间、类比、术语、为什么需要它、一个小节、一道示例练习、一道自测、小结，文字是“【待写】”占位）、`course/exercises/NN-id.ts`（一道能通过的小练习，带 `hints`、`wrong`、`faded`）、`tests/site/labs/NN-id.js`（空数组）。
2. 追加新卡片键到 `course/card-keys.snapshot.json`。
3. **插在中间时**，后面的章全部顺延：文件改名（章、练习、`labs/`、`figures/`、测试数据）、frontmatter 的 `chapter`、练习的 `ch`、小节标题 `### N.M`、所有写到旧文件名的地方，以及章节、练习、题库、术语表、首页、阶段测验页、实验台和示意图注释、浏览器测试里的“第 N 章”（含“第 N、M 章”“第 N–M 章”写法）、小节引用（“N.M 节”、并列和区间、不带“节”的“见 N.M”、“第 X 章 N.M”、表格引用列，认法见 `scripts/lib/section-refs.mjs`，校验和改号共用）和“N.M 标题”引用，全部 +1。另外，没有“节”字的裸 N.M（“（15.6）”“15.2 的 PatchFlag”“（29.1 和 29.2）”）只要真是某个小节的编号，改号时也会一起改（版本号 Vue 2.6 和数值 15.2 秒不改；校验不查这类写法）。区间“第 N 到 M 章”跨过新插入的章时含义会变宽，要人工核对。题干里带章号引用的自测题，指纹会随之改写，脚本会列出是哪几道（卡片键不变）。动手之前它要求 `check:content` 已通过、工作区干净（`--allow-dirty` 可跳过后一条），做完用 `check:content` 复核。`--dry-run` 只列计划不改文件。

**一次重排很多章**用 `npm run reorder-chapters -- plan.json`（`{ "order": [新顺序的章 id…], "stages": { "章id": 阶段号 } }`，规则同上，`scripts/lib/reorder.mjs` 算映射，有单元测试）；**拆章、挪小节**时，小节号的改写用 `scripts/lib/renumber.mjs` 的 `remapSections(text, (n, m) => [新章号, 新小节号])`。

**移动一章**（换位置、换阶段）用 `npm run move-chapter -- <章id> --after <章id> [--stage N]`：夹在中间的章顺延或前移，改名和改引用的规则与插入相同（两个脚本共用 `scripts/lib/renumber-plan.mjs`）；快照里已有键的顺序和值不动，只有题干里写着章号的自测题指纹会改写。做完同样要人工核对 `tests/expected.cjs`、`course/stages.ts` 和文档里写着章顺序的文字。
4. 脚本不改、但会列出来的地方：`tests/expected.cjs`（锁定的章数和“每个阶段的可用题数”表，章数变了测试会在这里失败）、`course/stages.ts` 里提到章范围的说明、文档里的章数（`README.md`、本文件；`npm run check:docs` 会查出过期的数字）。首页的章数、章头的总章数、侧边栏、进度统计都是从章元数据算的，不用改。

然后：

1. 把所有“【待写】”换成真内容（`npm run check:content` 会提示哪些章还有占位；`-- --strict` 把占位当错误）。写作规范见下。
2. 估算 `::: rt` 里的阅读时间；用到后面章节才讲的 API 时写“（第 N 章）”或换掉。
3. 要加实验台、示意图：照 `course/AUTHORING.md` 的 4.9、4.12，并在 `tests/site/labs/NN-id.js` 补测试数据（每个 `<Lab id>` 一项）。
4. 新阶段要同时改 `course/stages.ts` 和新建 `course/check/N.md`（阶段测验页，照抄现有的）；`check:content` 读 `STAGE_COUNT`，不用改。
5. `npm run check` → `node tests/site/exercises.test.js <NN-id>`（练习必须 PASS）→ 提交前 `npm test`。
6. 提交时新卡片键已经在快照里（脚本更新过），确认 `course/card-keys.snapshot.json` 一起提交。

手工加章也行：建 md 和练习文件、`npm run check:content -- --update`。

## 改已有的章

- **不要改动已有自测题的顺序，也不要删中间的题**。新题只追加到本章自测块的末尾。`check:content` 会拦住。
- 改题干的错别字：`npm run check:content -- --update --force`（它把已有键的指纹改成新的）。换了题就不是改错别字：追加新题，旧题留着或改成不会误导的说法。
- **自测题必须按 `AUTHORING.md` 4.11 的格式写**（`<Sc :a="N">`、`<Opt>` 一行一个、`<template #explain>`），否则构建时抽不出复习题库；`check:content` 会查。
- 改小节（`### N.M`）：小节从 N.1 起连续编号；移动后更新练习提示、测验解析里引用的“N.M 节”“N.M 标题”（`check:content` 会查引用对不对）。
- 改练习的检查函数：必须实测（参考答案通过、起始代码被拒、每个 `wrong` 被拒）。每道练习至少 1 个 `wrong`；`sub()` 造 wrong 时参考答案改了要同步（`WRONG_SUB_FAILED` 会被查出来）。
- **写用真实库的练习**（Pinia、Vue Router）：练习里写 `libs: ['pinia']` 或 `['vue-router']`，写法见 `course/AUTHORING.md` 4.10；讲库内部原理的练习不用声明，用迷你版。
- **用迷你零件和折叠块**（响应式原理和渲染原理两个阶段的练习）：零件来自 `course/mini/`，练习里已经写好、不要学习者改的大段代码用 `//#fold` 圈起来（编辑器里折叠并只读）。用法见 `course/mini/README.md` 和 `course/AUTHORING.md` 的“折叠只读块”一节；改了零件要重新跑用到它的所有章的练习测试。
- 改了任何章：`npm run check` → `node tests/site/exercises.test.js <章>`。
- 章文字改动要遵守「写作规范」。用户报告的缺陷：先写一个会失败的测试，再修复。

## 改引擎的流程

1. 先看这条规则属于哪一块。纯计算（不碰 DOM、存储、时间）放 `course/engine/logic/`；要读写进度的放 `store.ts` / `cards.ts`；界面行为放主题组件，但只调用 `logic/`。
2. **先加/改单元测试**（`tests/unit/*.test.ts`），写出期望的新行为，跑 `npm run test:unit` 看它失败。
3. 改代码，让单元测试通过。时间用参数传入（`now`），不要在 `logic/` 里读 `Date.now()`。
4. `npm run check`（类型、校验、单元测试）。
5. `npm run build`，再 `npm run test:e2e -- mechanics`；改动大就跑完整 `npm test`。
6. 如果代码行为和下面的「学习机制」描述不一致：不要悄悄改其中一边，先搞清楚哪个是用户要的，再同步两边（还要同步 `course/AUTHORING.md` 第 10 节的对照表和 `tests/unit/README.md`）。

## 类型检查的严格程度

`tsconfig.json`：`strict: true`，但 **`strictNullChecks: false`、`noImplicitAny: false`、`useUnknownInCatchVariables: false`**，与 hands-on-react 一致。范围只有 `course/engine/`、`tests/unit/`、`vitest.config.mts`：

- 引擎是纯 TypeScript，当前零报错；单元测试里有一些没写类型的辅助函数，开 `noImplicitAny` 要补几十处注解，收益小。
- **不检查** `course/.vitepress/`（主题组件是 `.vue` 单文件，需要 `vue-tsc`）、`course/exercises/`（判题函数是旧式脚本）、`scripts/`（`.mjs`，靠单元测试和 `check:content` 自检）。要覆盖它们，先引入 `vue-tsc` 并清掉存量报错，不要为了对齐一次放开。

以后收紧的顺序建议：先给 `logic/` 之外的引擎模块开 `noImplicitAny`，再考虑 `strictNullChecks`。

## 章节 Markdown 与练习数据

写法和 `check:content` 检查的规则（frontmatter、自测题、目标、练习字段、实验台、站内链接、引用、术语、残留）都在 [`course/AUTHORING.md`](course/AUTHORING.md) 第 11 节，这里不重复。几条最容易踩的：

- 每道练习**必须有 `faded` 半成品**（原样提交不能通过，不能与参考答案相同，至少 1 个 `✏️` 占位）。
- 每章**必须有且只有一个 `::: summary`**；`::: rt` 阅读时间块显示在章头，不要在别处重复写。
- 改了章的章号、id、自测题，先想卡片键（下一节）。

## 卡片键快照（`course/card-keys.snapshot.json`）

间隔复习和阶段测验按卡片键存学习者的记录：章内自测第 N 题（从 0 起，不含先猜）是 `章id#N`，阶段测验专用题（`checks/questions.ts` 里属于这一章的第 N 道）是 `章id#cN`。键一旦发布就**不能消失、不能换位置**，否则学习者的复习记录会错配到别的题上。

快照记录每个键，和这道题**题干文字的指纹**（8 位哈希，章内自测取整段题干含代码块，专用题取题目文字），以及“先猜”题所在的实验台 id（`predictions`）。`npm run check:content` 对照它：

- 键消失（删了题、删了章、改了章 id）→ 报错。
- 键的指纹变了（调换顺序、换了题）→ 报错，会指出“现在放的是原来 X 的题”。
- 先猜键消失（删了实验台、改了实验台 id、去掉了 `#predict`）→ 报错。
- 追加了新题（或新章、新实验台）→ 报错提示“还没记进快照”：确认都追加在末尾后，运行 **`npm run check:content -- --update`**（只追加新键），把快照一起提交。`new-chapter` 已经替你做了。
- 只是改了题干的错别字：`npm run check:content -- --update --force`，会重写已有键的指纹。换了题不要用它。
- 指纹只看题干，不看选项和 `:a`；改选项顺序或正确答案时，要自己确认学习者已存的 `sc[序号]` 答案不会错配（原则上不要改已发布的题）。

抽取逻辑只有一份：`course/content-parse.mjs`，站点构建（`course-data.mts`、`sidebar.mts`）和 Node 脚本（`check-content`、`new-chapter`）都 import 它。改自测题的写法或抽取规则时只改这一处，`tests/unit/content-parse.test.ts` 测这份实现，并守着不再出现第二份副本。

## 学习机制（不要破坏）

课程按学习科学设计，用户明确要求保留（两门课 hands-on-react 和 hands-on-vue3 共用同一套规则，“课”在这里叫“章”）。实现在 `course/engine/`，纯逻辑部分有单元测试（`tests/unit/`，规则和测试名的对照表见 `tests/unit/README.md`，规则和实现位置的对照表见 `course/AUTHORING.md` 第 10 节）。界面在 `course/.vitepress/theme/components/`，只调用 `engine/logic/` 里的纯函数，不在组件里重写规则：

- **先预测再运行**：实验台预测前隐藏说明（`Lab`、`Sc predict`）。
- **课前热身（提取练习）和间隔复习**：答错的题第二天再出（固定隔 1 天，不看盒子）；答对的题只有**到期**了才提升复习间隔，没到期的答对不改任何记录（盒子、到期时间、次数都不变）；答错不管到没到期都回到盒子 0。这条“到期才升级”的门由 `logic/srs.ts` 的 `shouldRecord` / `gatedNextCard`（引擎里的 `srsRecordGated`）实现，**课前热身、复习页的混合练习、阶段测验三处共用**。“今日复习”只出到期卡，所以不受影响。章内自测（`Sc`）是第一次作答，直接记录（`answerSelfCheck`）；只有第一次作答计入复习。
- **“12 小时内答过的不再出”只适用于课前热身**（`warmupPool`）。混合练习和阶段测验不过滤：阶段测验是固定 12 题的测验，不是复习，过滤会抽不满。
- **间隔序列**：盒子 0..5 对应 0/1/3/7/16/35 天。答对进下一个盒子（到顶不再升）；答错回到盒子 0 并安排明天再出。`SRS_DAYS[0] = 0` 只是占位，不参与计算（用它的话答错的题当天就到期，会违反“答错第二天再出”）。
- **测验答错不亮正确答案，重试时隐藏上次选的项**：章内自测（`Sc`）和课前热身（`Question` 的 `retry` 方式）。今日复习是复习，答完显示答案和解析；阶段测验是交卷模式。
- **提示阶梯**：`[提示, 失败 1 次], [半成品, 失败 2 次且 2 分钟], [参考答案, 失败 3 次且 5 分钟]`（分钟从第一次失败算起）；练习没有 `faded` 字段时没有半成品这一级，其余门槛不变。只有代码真的改了才算一次失败：模板和脚本分别去掉注释、空白、分号、逗号后，至少一段要和起始代码、**上一次失败的代码**都不同（所以来回切换两份不同的失败代码，每次都算一次失败；半成品和参考答案另有 2 分钟、5 分钟的时间门槛，刷失败次数绕不过时间）。粘贴参考答案原文（两段都与答案相同）不能通过，也不计失败，除非看过答案后按了“重置”自己重写；借助答案完成会单独标记（`help`：`solution` 是看过答案后改写通过，`rewrite` 是点了重置自己重写通过，界面分开说明）。`hints` 里的多条提示整体算第一级，解锁后可以逐条展开。（实现：`logic/ladder.ts`、`logic/exerciseState.ts`，界面 `Exercise.vue`。）
- **自我解释**：至少 30 个有效字（去掉空白和标点，连续重复的字折叠；不同字少于 10 个会被压低到最多 9）才展示参考要点。参考要点是本章“小结”块，章里的小结块默认隐藏（`sx-hidden`），写够字、点了“对照本章要点”才在自我解释区域里显示。它不是章完成的必要条件。（实现：`logic/selfExplain.ts`，界面 `SelfExplain.vue`。）
- **阶段测验**：12 题（8 道专用题优先没见过的 + 4 道常规题，不足时互相补位），交卷后才显示解析，80% 通过（12 题要答对 10 题）；中途离开算未通过（每答一题记一次 `pending`，下次进入页面时结算）；未通过要等 30 分钟；以最近一次为准；通过后清掉之前未通过留下的“需要加强的章”（`weak`）；35 天后提示复测；答错的题进入复习队列。（实现：`logic/stageCheck.ts`，界面 `StageCheck.vue`。）
- **章完成标准**：章内自测全部答对 + 本章练习全部通过，达标自动完成，没有手动标记按钮。章末的“掌握标准”条列出还差什么，借助答案通过的练习会单独标注。
- **阶段**：6 个阶段（`course/stages.ts`）。给一章指定阶段，只在它的 frontmatter 写 `stage: 1` 到 `6`；速查表不写 `stage`，是侧边栏顶部的固定入口，不计入进度。每个阶段末尾有一个阶段测验页（`/check/N`）。

**自动注入**：课前热身（`Warmup`）和自我解释（`SelfExplain`）不写在章的 Markdown 里。热身由 `config.mts` 的 markdown 规则插在每个带 `stage` 的章的一级标题后面；自我解释由主题布局的 `doc-footer-before` 插槽放在掌握标准条之前。新增一章不用做任何事。

**页面**：今日复习 `/review`（`course/review.md`，侧边栏最上面，徽标是到期题数）；阶段测验 `/check/1` 到 `/check/6`（侧边栏每个阶段末尾，显示通过状态）。

改引擎或这些组件后，跑 `npm run test:unit` 和 `npm run test:e2e -- mechanics`（后者要先 `npm run build`）。它用 Playwright 的 `page.clock.setFixedTime` 控制时间，覆盖上面每一条（提示阶梯三级的解锁条件、代码没改不计失败、粘贴答案不通过、半成品、自我解释 30 字门槛、热身出题和记录、复习页、阶段测验、390px 无横向滚动）。

## 写作规范

写作规则（句子长度、术语、类比、学习目标、自测题、技术版本）在 [`course/AUTHORING.md`](course/AUTHORING.md) 第 3 节，用户明确要求按它写。改章文字前先读一遍。

## 架构要点

- **进度**只存在浏览器 `localStorage['hands-on-vue3-v1']`（单个键，结构见 `course/engine/types.ts` 的 `Progress`，细则见 `course/AUTHORING.md` 第 6 节）；服务端渲染时为空。界面读写只经过 `theme/composables/learn.ts`，它封装 `course/engine/`。旧版零散的进度键由引擎第一次读取时一次性迁移，之后不再读写。依赖进度的组件挂载后才显示真实数字（`ensureReady()`），避免水合不一致；引擎的进度对象是原地修改的，**不要把 `cpOf()` 的结果缓存在 `computed` 里**（引用不变，下游不会重算），要在每个 `computed` 里直接调用。存进去的页面路径（`__last.path`）不带 base。
- **章数据在构建时抽取**：`course/.vitepress/course-data.mts` 是一个 Vite 插件，用 `content-parse.mjs` 从各章 Markdown 抽出元数据、自测题、小结、术语，生成虚拟模块（`virtual:course-meta`、`-selfchecks`、`-summaries`、`-glossary`，说明见 `course/AUTHORING.md` 第 7 节）。复习页、阶段测验、热身用动态 import 载入大的那一个。术语表页和术语标注（章里术语的虚线下划线）也由它供数据。
- **实验台直接用的 Vue 编译器和开发构建**：第 29 章的实验台动态载入 `@vue/compiler-dom` 和 `@vue/compiler-sfc` 的浏览器构建；第 27、40、41 章的实验台动态载入 `vue/dist/vue.esm-browser.js`（开发构建，因为 `onRenderTracked`、`onRenderTriggered` 等钩子只有开发构建才有；第 41 章还把它当作“库自带的第二份 Vue”）。它们都是按需加载的独立分块（第 27、40、41 章共用同一个 `vue.esm-browser.js` 分块），只在用到它们的章页面预加载，不在站点入口里；页面上因此有两份 Vue（站点自己的生产构建和实验台里的开发构建，各有各的响应式和调度队列，实验台的应用挂在自己新建的 div 里）。两份 Vue 之间断开的是响应式（“当前正在运行的副作用”各记各的），**当前组件实例不会断开**：runtime-core 把设置当前实例的函数登记在 `globalThis.__VUE_INSTANCE_SETTERS__`，每份 Vue 设置当前实例时通知所有副本，所以 `provide/inject` 和生命周期钩子跨副本仍然能用。后果是响应式悄悄失效而没有任何报错（第 41 章实测）。`@vue/compiler-dom`、`@vue/compiler-sfc` 在 `devDependencies` 里固定为和 `vue` 相同的版本，升级 `vue` 时三个一起升（Dependabot 已把 `@vue/*` 和 `vue` 分在同一组）。
- **练习和实验台只在浏览器里渲染**，服务端渲染出来的只有占位。练习需要运行时编译模板，`Exercise` 组件挂载后动态 `import('vue/dist/vue.esm-bundler.js')`，所以**不要给站点的 `vue` 做 alias**。
- **侧边栏**由 `sidebar.mts` 从各章 frontmatter（`chapter`、`stage`、`title`）自动生成，不用手写；顶部固定入口是今日复习、术语表、速查表；动态标记由 `AppEffects` 写成属性（`data-badge`、`data-count`、`data-check`）。
- **选读章**：frontmatter 写 `optional: true`。侧边栏（`sidebar.mts` 在章名后加 `.opt-tag` 标签）、章头、首页阶段卡片显示“选读”；顶栏和首页的“已完成 N/M”、各阶段完成数只数必读章，选读章学了照常记录和显示已完成，另外统计（`engine/logic/completion.ts` 的 `tallyProgress`，界面经 `learn.ts` 的 `stageCount`、`totalCount` 取）。
- **章头**（`ChapterMeta`：阶段标签、第 N / 总章数 章、选读标签、`desc`、阅读时间）由 `config.mts` 在一级标题后自动注入；阅读时间取自章里的 `::: rt` 块，正文里不再渲染那个块。
- **配置文件是 `config.mts` 和 `vitest.config.mts`，不是 `.ts`**（`package.json` 没有 `"type": "module"`，`.ts` 配置里写 ESM 会有警告）。
- **`exercises/index.ts` 里的 `import.meta.glob` 那一行不要改写法**：`config.mts` 里有个 Vite 插件会按文本替换它的参数（只构建部分章时用）。
- 其余的坑（`{{ }}` 插值、行首组件标签开 HTML 块、中文粗体、围栏里的 `<script>`、平滑滚动、锚点进入后的版面变化……）见 `course/AUTHORING.md` 第 9 节。

## 发布

- 推送到 `main` 后，`ci.yml` 先跑 `check`（含 check:docs）和 `e2e` 两个 job；全部通过后 `deploy.yml` 把 CI 构建好的站点发布到 GitHub Pages（不重复构建）。pull request 只跑 CI，不部署。
- 第一次要在仓库 **Settings → Pages → Source** 选 “GitHub Actions”。站点地址 `https://paddychenc75.github.io/hands-on-vue3/`；base 是 `/hands-on-vue3/`，**只在 `course/site.mjs` 定义一处**（配置、测试、脚本都从那里取），换仓库名只改那里。
- 依赖更新：Dependabot（`.github/dependabot.yml`，npm 和 GitHub Actions，每周一次，同类合并成一个 PR）。
- `course/.vitepress/dist` 是纯静态文件，也可以放到任何静态托管（注意保持 base 路径）。
- 学习进度存在浏览器 localStorage，不同网址的进度不互通。
- 许可证：代码 MIT（`LICENSE`），课程内容 CC BY-NC-SA 4.0（`LICENSE-CONTENT`），范围见 `README.md`。
