# 内容写作与维护指南

本文说明**怎样写**：每种 Markdown 写法、练习字段、实验台、示意图、自测题，写作规则，以及踩过的坑。**规则和流程**（命令、加章步骤、卡片键、改引擎、学习机制、发布）在 [`AGENTS.md`](../AGENTS.md)，那里是唯一的规则源；两份文档里同一条规则只写一处，另一处指过去。

站点是 VitePress。一章是一个 Markdown 文件，通用的教学块（目标、类比、深入、自测……）用容器和组件写。第 1、2 章（`chapters/01-first.md`、`02-template.md`）是完整样例，不确定时照着写。

## 1. 目录

```
course/
  index.md                首页（只有一行：<CourseHome />）
  glossary.md             术语表页（内容是组件 GlossaryPage，数据自动汇总，见第 7 节）
  review.md               今日复习页（内容是组件 ReviewPage）
  check/N.md              阶段测验页，N 从 1 到阶段数（内容是组件 StageCheck）
  chapters/NN-id.md       一章一个文件。NN = 两位章号，id = 章的稳定编号（见第 2 节）；速查表 cheat.md 没有章号；27-quiz.md 只是旧地址的跳转页
  figures/NN-id/*.vue     示意图，每张一个 SFC，只含 template
  labs/NN-id/*.vue        实验台，每个一个 SFC（多标签页的每页再拆一个小 SFC）
  labs/_shared/           各章实验台共用的辅助函数（domLog、dLogBuf、useMouse、useDebounced）
  checks/questions.ts     阶段测验专用题库（179 道题，不存阶段号，由所属章决定阶段）
  stages.ts               阶段的唯一定义（编号、名称、英文副标题、说明）
  site.mjs                站点的部署路径 BASE_PATH，只在这里定义一处（见 4.14）
  learning-paths.mjs      首页“学习路线”的三条路线（只写章 id，章号由首页从章元数据取；check:content 校验）
  writing-terms.mjs       首页“写作规则”表的数据（带“不使用的同义词”），也是术语表页“不这样说”一栏的数据（见第 7 节）
  content-parse.mjs       章节 Markdown 的纯文本解析（frontmatter、自测题、小结、术语块、阅读时间、术语汇总）。站点构建和 Node 脚本共用这一份，不再有副本
  engine/                 学习机制：types.ts（进度结构）、store.ts（单键存储、旧键迁移）、cards.ts（复习卡片）、logic/（纯逻辑，有单元测试，见 tests/unit/README.md）
  exercises/NN-id.ts      该章的练习（自动汇总到 exercises/index.ts）；types.ts 是类型
  card-keys.snapshot.json 复习卡片键快照，由脚本更新（规则见 AGENTS.md）
  AUTHORING.md            本文
  .vitepress/
    config.mts            站点配置（base、自定义容器、章头和热身的自动注入、中文粗体修复、并行构建用的环境变量）
    sidebar.mts           从 chapters/*.md 的 frontmatter 生成侧边栏（顶部是今日复习、术语表和速查表，下面按阶段分组，每组末尾是阶段测验）
    course-data.mts       构建时从 chapters/*.md 抽数据，生成虚拟模块（见第 7 节）
    markdown-cjk.mts      markdown-it 插件：中文标点旁的 **粗体** 也能生效
    theme/
      index.ts            主题入口：布局插槽、全局注册 components/*.vue
      style.css           全部样式（含深色模式）
      components/*.vue    通用组件（全局注册，组件名 = 文件名）
      composables/        learn.ts（界面读写进度的唯一入口，封装 engine/）、catalog.ts（按需载入复习卡片目录）、terms.ts + term-match.ts（术语标注）、keys.ts、highlight.ts
editor/entry.js           练习编辑器（CodeMirror 6）的封装，被 Exercise 组件直接导入
scripts/                  check-content.mjs（内容校验）、check-docs.mjs（文档里的数字核对）、new-chapter.mjs（加章脚手架）、e2e.mjs（浏览器测试入口）、
                          shot.mjs（给一章截浅色和深色整页图）、setup-hooks.mjs（启用提交前钩子）；lib/ 是它们共用的（validate.mjs 是全部校验规则）
tests/unit/               Vitest 单元测试；tests/expected.cjs 集中放测试里锁定的章数和每阶段题数
tests/site/               Playwright 测试（见第 8 节）
```

## 2. frontmatter

```md
---
title: 响应式基础
id: refs
stage: 2
chapter: 3
desc: ref、reactive、toRefs
---
```

- `title`：短名。侧边栏、上一章/下一章、首页、页面标题都用它。**不要求等于一级标题**：一级标题 `# …` 可以更长（例如“响应式基础：ref 和 reactive”）。
- `id`：章的稳定编号（英文单词）。**进度存储（自测答案、练习、完成状态）的键都用它，创建后不能改。**
- `stage`：这一章属于第几个阶段（1 到阶段数，阶段数是 `stages.ts` 里的 `STAGE_COUNT`）。**阶段的名称、编号、说明只定义在 `course/stages.ts`**，侧边栏、首页、测验、引擎都从那里取，不要在别处再写一份。`desc`：一句话说明。值里有 `: ` 之类 YAML 特殊字符时加双引号。
- `chapter`：章号。决定侧边栏里的先后和页面上的“第 N / 总章数 章”小字。
- `optional`（可选）：写 `optional: true` 的章是**选读章**，不写或写 `false` 是必读章。选读章：侧边栏章名后、上一章/下一章、章头的元信息行、首页阶段卡片里都有一个小的“选读”标签；学了照常记录、章本身显示已完成，但**不计入**顶栏和首页的总进度、各阶段完成数的分母（“已完成 N/M”的 M 只数必读章），首页另外显示“选读 x / y 章”。计数规则在 `engine/logic/completion.ts` 的 `tallyProgress`（有单元测试）。`check:content` 校验取值只能是 `true` 或 `false`，没有章号的页面不能写，一个阶段不能全是选读章。目前的选读章锁定在 `tests/expected.cjs` 的 `OPTIONAL`。新建选读章：`npm run new-chapter -- … --optional`。项目章（标题以“项目：”或“收尾项目：”开头）靠标题前缀在侧边栏里辨认，不用额外字段。
- **只有写了 `stage` 的页面计入学习进度**（总数显示为“N/M”，M 是必读章数，从章元数据算出来，选读章不计入，见 `optional`）。有章号的正文章必须写 `stage`，否则构建会报错；`stage` 不在 1 到阶段数之间也会报错。
- 不写 `stage` 的页面（速查表 `cheat.md`）是侧边栏顶部的固定入口，不属于任何阶段，不计入进度，页面底部没有“掌握标准”条、自我解释和课前热身。速查表不带章号，写 `order: 100`；固定入口之间按 `order` 排序（没写的排在后面）。侧边栏最上面还有“今日复习”（`review.md`）和“术语表”（`glossary.md`），都不在 `chapters/` 里。`chapters/27-quiz.md` 只是旧地址的跳转页（没有 `id`，不是章）。

### 怎样给一章指定阶段

在它的 frontmatter 写 `stage: N`。侧边栏分组、首页卡片、阶段完成数、总进度都会自动更新，不用改别处。各阶段包含哪些章，看侧边栏或各章的 `stage`。要改阶段的名称或说明，只改 `course/stages.ts`。要把一章换到别的阶段，只改这一章的 `stage`；阶段测验专用题的阶段由所属章推出，不用改题库。章号要保持连续、阶段随章号不减（`check:content` 会查）。

- 章内用到的示意图和实验台在章开头的 `<script setup>` 里导入。通用组件（`Sc` `Opt` `Goal` `Lab` `LabCode` `Figure` `Exercise` `Flow` `TabbedLab`）不用导入。课前热身和自我解释不用写，见 4.13。

## 3. 写作规则

- 简体中文，约 80% 的文字遵守 ASD-STE100：短句，一句一个意思，主动语态，步骤用编号祈使句。
- 比喻只放在“类比”块中。正文不用破折号（—）。
- 每个 API 的小节：问题 → 最小代码 → 1 到 3 个“场景：” → 注意 → 实验台/练习 → 深入（原理，放在 `::: deep`）。阶段一、二先讲用法后讲原理。
- 用到后面章节才讲的 API 时，写“（第 N 章）”或换掉。
- **引用的措辞要和对象章的位置一致**：对象章在本章后面，写“详见第 N 章”“第 N 章会讲”，不写“讲过”“回顾”；对象章在本章前面，写“第 N 章讲过”“回顾（第 N 章）”，不写“会讲”“后面的第 N 章”。章的顺序会变（重排章以后很多引用的前后会翻过来），所以 `check:content` 会查这类紧贴着引用的措辞，其余同一句里有“前面 / 之后 / 已经”等词的，用 `npm run check:content -- --tense` 列出来人工看。
- 技术内容以 Vue 3.5 为准。已核实（2026-10）：vue 3.5.43，vue-router 5.3.1（第 17 章讲的路由行为在 5.4.0 下相同，正文只写主版本号 5），vite 8.3.3（Rolldown），pinia 4.0.3。第 41 章（组件库工程）实测用的工具链：`@vitejs/plugin-vue` 6.0.9，`vue-tsc` 3.3.12，TypeScript 5.9.3（`vue-tsc` 3.3.12 与 TypeScript 7.0.2 不兼容，库项目钉在 5.9 或 6.0；本仓库自己用 7.0.2），`vite-plugin-dts` 5.1.2，`unplugin-vue-components` 32.1.0，publint 0.3.25，`@arethetypeswrong/cli` 0.18.5。另外已核实：Nuxt 4.6（第 37 章，2026-10 的稳定版）、Vitest 4.1（第 20 章，脚手架当前安装 4，4.1 和 5.0 写法相同）、`@pinia/testing` 2.0.1（与 Pinia 4 配套）、`@tanstack/vue-query` 5.104.1 与 `@pinia/colada` 1.4.8（第 18 章）、Zod 4.6.5 与 Valibot 1.5.0（第 39 章）；`npm create vue@latest`（create-vue）生成的 TypeScript 项目固定 TypeScript `~6.0.0`，实测 6.0.3，`vue-tsc` 3.3.12（第 14 章）。有疑问时用 `node_modules/vue` 运行代码核实。
- 一章内块的顺序：目标、阅读时间、类比、本章术语、为什么需要它、小节 `### N.M 标题`（含正文、代码、图、实验台、练习、深入块、注意框）、注意、自测、小结。
- 小节从 N.1 起连续编号，不能放在 `::: deep` 里。移动小节后，要更新练习提示和测验解析里引用的“N.M 标题”或“N.M 节”。
- 目标：`<Goal checks="…">` 的标签（自测 N 题 · 练习 M 道）自动算，不要手写。不要给目标挂“回顾”题。
- **自测题只能在末尾追加**：学习者的答案按序号保存，已有题不能删除、调序，也不能改题干和答案（见第 5 节）。
- 每道练习至少写 1 个 `wrong`（来自真实误解的错误解法）。
- 新概念第一次出现时给一句定义。一个概念只用一个说法（首页“写作规则”表和术语表是依据，见第 7 节）。
- 学习目标用“说明 / 写出 / 区分 / 判断……”这类可观察的动词开头。
- 自测题干扰项来自真实误解；正确项的位置和长度不要有规律；解析说明为什么对，并点出最迷惑的错误项错在哪。

## 4. 每种写法的示例

### 4.1 小节标题

```md
### 1.1 命令式和声明式
```

必须写成 `N.M 空格 标题`，编号自动变成绿色小编号。用三级标题 `###`。

### 4.2 目标

```md
::: goals
<Goal checks="sc:2">说明命令式和声明式的区别。</Goal>
<Goal checks="sc:0,sc:1,ex:counter,ex:firstFill">用 `createApp` 和 `ref` 写一个计数器。</Goal>

:::
```

- `sc:N` 是本章第 N 道自测（从 0 起，不含“先猜”题）。`ex:id` 是练习 id。
- 对应的题全部答对、练习通过（不是“看过答案后通过”）后，目标自动打勾。
- 结尾的 `:::` 前面要有空行。

### 4.3 阅读时间、类比、术语、为什么需要它

```md
::: rt
阅读主线约 7 分钟，深入内容约 2 分钟（可选）。另外留时间做练习和自测。
:::

::: analogy
原生 JS 写界面像**亲手搬家具**：每次状态变了，你都要找到 DOM 节点。
:::

::: terms
声明式
: 描述“数据是这样时页面是什么样”，由 Vue 修改 DOM。

挂载
: 把组件加入页面。
:::

::: why
你用原生 JS 写了一个计数器。

原因：数据每次改变，你都要手写代码修改每个相关节点。
:::
```

`::: rt` 写在章里原位，但页面上它显示在**章头**（一句话说明下面），正文里不再单独渲染：`config.mts` 的 `course_strip_rt` 规则把这个块的 token 去掉，章头从同一个块取文字（`course-data.mts` 的 `rt`）。所以阅读时间只写这一处，不要在别处重复写，也不要往这个块里放别的内容。

标题（类比、本章术语、为什么需要它）由容器自动加。术语用定义列表：第一行是术语，下一行以 `: ` 开头写解释，术语之间空一行。类比块始终显示，学习者不能隐藏它。

### 4.4 注意、小结

```md
::: pitfalls
1. 在 JavaScript 中不要写 `count++`。写 `count.value++`。
:::

::: pitfalls 注意：不要用 index 作为 key
标题不是默认的“注意”时，写在容器名后面。
:::

::: summary
- 你修改数据。Vue 更新页面。
:::
```

`::: note` 是说明框，`::: note warn` 是橙色警示版。

### 4.5 深入、想一想、速查表折叠块

```md
::: deep mount 之后发生了什么
正文、列表、代码块、表格都可以放在这里。
:::

::: think 可以在 {{ }} 中写 if 语句吗？
不可以。插值只接受一个表达式。
:::

::: cheat 常用 API 速查
外层折叠块。
:::
```

- 容器名后面的文字是标题；“深入”“可选”“想一想”标记自动加。
- `deep` 里不要放 `###` 小节标题，也不要再套别的容器。容器里有围栏代码块时，结尾 `:::` 单独占一行。
- 实验台放在 `::: deep` 里时，`<Lab>` 的结束标签和 `:::` 之间要空一行。`deep` 默认展开（渲染阶段就带 `open`），学习者可以手动收起单个块；收起的块里的实验台要展开后才挂载（测试里没展开才点开）。
- `deep` 默认展开，学习者可以手动点标题收起单个块。没有全局开关。

### 4.6 代码块

全部用围栏代码块并标语言：`js` `vue` `html` `ts` `bash`。围栏代码里的 `{{ }}` 直接写。模板片段和脚本混写的块：以模板为主用 `vue`，以脚本为主用 `js`。语言只影响高亮。

### 4.7 左右对照的代码

````md
:::: pair
::: col 原生 JS（命令式）：代码说明每一步操作。
```js
let count = 0
```
:::
::: col Vue（声明式）：代码只说明结果。
```vue
<button @click="count++">+1</button>
```
:::
::::
````

外层 `pair` 用四个冒号，内层 `col` 用三个。屏宽不够时上下排。

### 4.8 表格

用普通 Markdown 表格，单元格里的代码用反引号。有 `rowspan`/`colspan` 的表格写成 HTML 表格（`{{ }}` 要加 `v-pre`）。表格在窄屏上横向滚动。

### 4.9 示意图

1. 在 `figures/NN-id/` 下新建 `内容命名.vue`（大驼峰英文，按图画的是什么命名，例如 `TrackAndTrigger.vue`，不要用 `Fig1`）。文件里只有 `<template><svg viewBox="…">…</svg></template>`。
2. 在章节的 `<script setup>` 里导入。
3. 正文里这样用（三行之间不要空行）：

```md
<Figure caption="命令式代码自己修改每个节点。声明式代码只修改数据，Vue 按模板更新 DOM。">
<ImperativeVsDeclarative />
</Figure>
```

标题里有行内代码时，用 `#caption` 插槽：

```md
<Figure>
<DirectiveFlow />
<template #caption>

大部分指令把数据送到 DOM。`@` 把事件送回代码。

</template>
</Figure>
```

- SVG 里的颜色用 `var(--muted)`、`var(--ink)`、`var(--accent)`、`var(--accent-soft)`、`var(--surface)`，浅色和深色模式都有定义，不要写死颜色。
- **SVG 里的 `{{ }}` 会被 Vue 当成插值**：给那个 `<text>` 加 `v-pre`。
- marker 的 `id` 在整页内不能重复，用 `章id-名字`，例如 `first-arr`。
- 点击图可以放大（`Figure` 组件自带），不用另外处理。

### 4.10 练习

正文里：

```md
<Exercise id="counter" />
```

数据在 `exercises/NN-id.ts`，导出一个对象，键名就是练习 id（全站不能重复）：

```ts
import type { Exercise } from './types'

export const counter: Exercise = {
  title: '做一个计数器',
  ch: 1,
  task: '按钮显示“点了 N 次”。……',     // HTML 字符串，里面的 &lt; 要保留
  tpl: '<button>点我</button>',
  js: 'const count = ref(0)\n\nreturn { count }',
  solTpl: '<button @click="count++">点了 {{ count }} 次</button>',
  hints: ['提示 1', '提示 2', '答案'],
  faded: { tpl: '<button @click="/* ✏️ 点击时让 count 加 1 */">点了 {{ /* ✏️ 显示当前次数 */ }} 次</button>' },   // 必填：半成品，见下面
  async check(T) { /* 用 T.$ T.btn T.click T.ok 检查 */ },
  wrong: [{ tpl: '…', why: '…', expectFail: /失败信息里的关键字/ }]
}
```

- 练习脚本里可直接用的名字：`ref reactive computed watch watchEffect toRefs toRef shallowRef nextTick provide inject`，生命周期钩子 `onBeforeMount onMounted onBeforeUpdate onUpdated onBeforeUnmount onUnmounted onActivated onDeactivated`，以及 `useTemplateRef onWatcherCleanup watchPostEffect readonly shallowReactive toRaw markRaw triggerRef unref isRef toValue customRef useId effectScope onScopeDispose`，还有全局 `Vue`（整个 Vue 命名空间）。
- `check` 函数本身是模块里的代码，没有全局 `Vue`：用到时 `import { nextTick } from 'vue'`。
- 练习脚本里已经用 `const { h } = Vue` 取出的名字（`h createApp createRenderer createSSRApp onErrorCaptured useModel`）不在上面的名单里，新增名字前先确认练习代码里没有同名声明，否则会是「Identifier has already been declared」。
- `wrong` 里每个错误解法，判题必须判它不通过；测试会逐个验证。
- `wrong` 的可选字段 `expectFail`：一个正则。测试断言这个错解的失败信息（✗ 那几行文字）里至少有一条匹配，确认它是因为预期的原因被拒。新写的 `wrong` 尽量带上。
- 在参考答案上做替换造错解，用 `types.ts` 导出的 `sub(src, from, to)`：替换串里的 `$` 当字面文字；找不到 `from` 时不抛错，而是返回以 `WRONG_SUB_FAILED` 开头的文字，测试会报告出来（抛错会让整个练习模块加载失败，站点所有练习都不能用）。
- 起始代码本身有 TODO 而报错是正常的。想让进入页面时不自动运行，设 `lazy: true`。
- 章完成标准：章内自测**全部答对** + 本章练习**全部通过**，达到后自动标记完成（没有手动按钮）。借助答案通过的练习也算通过，但章末的“掌握标准”条会单独标注。
- **提示阶梯**（规则见第 10 节）：练习下面的按钮分三级，没解锁时是锁定状态并写明条件。`hints` 是**一整级**：第一级解锁后，多条提示用“下一级提示”逐条展开。参考答案是 `solTpl`/`solJs`（省略的那段用 `tpl`/`js`）。点参考答案时，编辑器里原来的代码会先存下来，可以点“找回我的代码”。
- **半成品 `faded`（必填）**：参考答案的“半成品”，关键处挖空，让学习者补全，比直接看答案学得多。`check:content` 要求每道练习都写。
  - 写法：`faded: { tpl?, js? }`，只写有改动的那一段，没写的那段用起始代码补上（和 `Exercise.vue` 一致：`faded.tpl || tpl`、`faded.js || js`）。
  - 挖空：一般挖 1 到 4 处。脚本里写 `/* ✏️ 说明 */`，模板里元素位置写 `<!-- ✏️ 说明 -->`；落在 `{{ }}` 或属性表达式里时只能用 `/* ✏️ 说明 */`。说明写“要做什么”，不写答案。其余照参考答案写。
  - 三条硬要求：**原样提交不能通过**；补全后能通过（就是参考答案）；**不能与参考答案完全相同**。另外不能含 `WRONG_SUB_FAILED`，至少有 1 个 `✏️` 占位。`check:content` 查静态的几条，`tests/site/exercises.test.js` 真的把半成品原样提交一次，确认不通过。
  - 阶梯里“没有半成品时只有提示和参考答案两级”的规则仍在引擎里，测试用练习根元素上的 `__setFaded(undefined)` 临时去掉它来验证，`__setFaded({ tpl, js })` 临时换一份（见 `tests/site/mechanics.test.js`）。

#### 折叠只读块：`//#fold`（长代码练习）

起始代码、`faded`、`solTpl` / `solJs` 里，已经写好、不要学习者改的大段代码用一对标记圈起来，编辑器会把它折叠成一行并设为只读，学习者只看到和要写的部分。`course/mini` 的 `fold(标题, code)` 就是生成这对标记（见 `course/mini/README.md` 第 6 节）。

```js
//#fold 前面各章你写过的零件
…… 几百行已有代码 ……
//#endfold
const count = ref(0)      // 这里往下是学习者要写的
```

- **写法**：脚本用 `//#fold 标题` … `//#endfold`；模板用 `<!--#fold 标题-->` … `<!--#endfold-->`（模板里的 `//` 不是注释）。标记独占一行，可以有缩进，标题可以省略。两种写法在两个编辑器里都认。
- **行为**：初始折叠成「▸ 标题（N 行）」，N 是两条标记之间的行数；点它或键盘（Esc 之后 Tab 到按钮，回车或空格）展开，再点折回。块里的代码只读，展开后也是；输入、删除、粘贴碰到块都不生效，并显示一次性提示；块外照常编辑。标记行在展开时显示成按钮，学习者删不掉；全选删除只删块外的代码，块原样保留。「重置」恢复完整的起始代码。
- **行号**：编辑器的行号栏始终是完整代码的真实行号，折叠时中间会跳号，和报错一致。出错行在折叠块里时，错误信息写明「（脚本第 N 行，在折叠块「标题」里）」，编辑器自动展开该块并滚到那一行。
- **只是显示层面的事**：运行、判题、草稿保存、「代码是否改过」的比较、粘贴答案判定，用的都是含标记的完整代码。标记是注释，规范化时和别的注释一起去掉，不影响这些判断。折叠块里的代码要保持完整可运行，因为运行的就是整段。
- **不支持**：嵌套（外层块里再写 `//#fold`，里面那行当普通内容）；没有配对的 `#fold` / `#endfold`（当普通注释，不折叠）；学习者自己在块外打出的标记（块只在载入起始代码、重置、填入半成品或答案、找回代码时识别）。旧草稿里没有标记而新起始代码有：旧草稿照原样载入、不折叠（和以前一样），点「重置」后换成带折叠块的新起始代码。
- **测试**：纯逻辑在 `course/engine/logic/folds.ts`（`tests/unit/folds.test.ts`）；编辑器接线在 `editor/folds.js`；浏览器测试 `tests/site/folds.test.js`（`npm run test:e2e -- folds`）用根元素上的 `__setStarter({ tpl?, js? }, { tpl?, js? })` 临时换成带折叠块的起始代码和参考答案。

#### 练习里的真实库：`libs`（Pinia、Vue Router）

默认情况下练习只有 Vue（上面那份名单）。讲库的**用法**（怎样定义 store、写路由表、守卫、读路由参数）的练习应当声明 `libs`，让学习者在真实的库上写和真实项目一样的代码；讲库的**内部原理**（迷你 `defineStore`、迷你路由怎样匹配）的练习继续在脚本里写迷你实现，不声明 `libs`。判断标准：学完这道题，学习者能不能直接把代码抄进自己的项目？能，就用真实的库。

```ts
export const myStore: Exercise = {
  libs: ['pinia'],              // 或 ['vue-router']，或两个都写
  // …其余字段照常
}
```

声明后，运行器做这几件事（实现在 `theme/composables/exerciseLibs.ts`，没声明 `libs` 的练习完全不受影响，也不会加载这两个库）：

- **按需加载**：进入页面时才 `import('pinia')` / `import('vue-router')`，各自是独立分块，不进首屏。两个库内部的 `import 'vue'` 和练习用的带编译器的 Vue 共用同一份 `@vue/runtime-dom`，所以 store 的状态、`useRoute()` 都能驱动练习模板重新渲染。
- **注入名字**：和真实项目里 `import { … } from 'pinia'` 同名，脚本里直接用，不用 import，也不要自己再声明同名变量（`check:content` 会报错）。
  - `pinia`：`createPinia defineStore storeToRefs setActivePinia getActivePinia disposePinia mapState mapGetters mapActions mapStores mapWritableState setMapStoreSuffix skipHydrate MutationType`，命名空间对象 `Pinia`。
  - `vue-router`：`createRouter createMemoryHistory useRoute useRouter useLink RouterView RouterLink onBeforeRouteLeave onBeforeRouteUpdate isNavigationFailure NavigationFailureType START_LOCATION parseQuery stringifyQuery`，以及 `createWebHistory`、`createWebHashHistory`（调用就抛错，见下），命名空间对象 `VueRouter`。
  - 编辑器的补全名单和脚本框上方"可直接使用 …"的提示会自动带上这些名字，题目下面也会多一行说明。
- **每次运行都是全新的环境**：每次"运行""只运行""检查"（含检查后的还原运行）都新建 pinia 和 router，store 状态不跨次残留。上一次运行的 pinia 会被 `disposePinia` 清掉。

**Pinia 的约定**：运行器在挂载前替学习者 `app.use(createPinia())`，所以脚本顶层就能调用 `useXxxStore()`，脚本里不用也不应该自己 `createPinia`（教"怎样安装 pinia"的讲解放正文，不放练习）。判题里用 `T.store(id)` 取这次运行里已经创建的 store（按 `defineStore` 的 id；学习者还没调用过 `useXxxStore()` 时是 `undefined`），或者用 `T.pinia.state.value[id]` 读 state。判题不要 import pinia（练习数据文件会进主包），也不要依赖学习者给 `useXxxStore` 起的名字。

**Vue Router 的约定**：
- 学习者在脚本里 `createRouter({ history: createMemoryHistory(), routes })`，并在脚本最后 **`return { router, … }`**，运行器在挂载前替他 `app.use(router)`（和 `components` 的约定同类）。创建了 router 却没有返回，会报错并说明原因。因为是在 setup 返回之后才安装，**根脚本里不能调用 `useRoute()`、`useRouter()`**（这时路由还没装）；放进子组件的 setup 里，或者在根模板里用 `$route`、`$router`。
- **只能用 `createMemoryHistory`**：页面真实的地址由 VitePress 管理，用 web history 会破坏站点导航。`createWebHistory()`、`createWebHashHistory()` 一调用就抛错（"练习里不能用 createWebHistory：它会改动页面真实的地址栏……请改用 createMemoryHistory()"），`createRouter` 也只接受 `createMemoryHistory()` 造出来的 history，一次运行只能创建一个 router。
- 守卫的无限重定向会被运行器截断（同一个宏任务里守卫运行超过 50 次就报错），不会卡死标签页。
- 守卫抛错、懒加载路由组件失败、异步 action 里没人接住的 Promise 拒绝，都显示在练习的红色错误区，不会变成页面的未捕获错误。
- 输出区里 `<RouterLink>` 的 `<a>` 会自动补 `target="_self"`：VitePress 在捕获阶段监听所有站内链接的点击，没有这个属性它会把练习里的链接当成换页。

**判题 `T` 多出来的辅助**（`ExerciseHelper`，所有练习都有 `waitFor`、`settle`，其余按 `libs` 提供）：

| 辅助 | 说明 |
|---|---|
| `await T.waitFor(() => 条件, ms = 1000)` | 每 10 毫秒查一次条件，最多等 ms 毫秒，返回条件最终是否成立。等异步 action、懒加载路由组件 |
| `await T.settle()` | 等一个宏任务加一次 nextTick |
| `T.pinia` | 这次运行的 pinia 实例 |
| `T.store(id)` | 这次运行里 id 对应的 store（还没创建是 `undefined`） |
| `T.router` | 脚本 `return` 的 router（已安装，检查开始前已等初始导航完成） |
| `await T.push(to)` | `router.push(to)` 并等渲染完成；返回 `NavigationFailure` 或 `undefined`。导航抛错不会往外抛，而是显示在错误区，这次检查会多一条"运行时发生错误"失败 |

判题里的模板：写法见 `exercises/16-pinia.ts` 的 `realPiniaStore` 和 `exercises/17-router.ts` 的 `realRouterGuard`。用 `T.click` 点 `RouterLink` 的 `<a>` 后，导航是异步的，要 `await T.waitFor(() => 路径变了)` 再断言；读当前路径用 `T.router.currentRoute.value`。判行为不判写法：不要要求学习者用 `meta` 还是用路径前缀、用 `beforeEach` 还是 `beforeEnter`，只断言跳转结果和页面内容。

写 `libs` 练习的注意：
1. 练习里的 Pinia 和 Vue Router 版本就是 `package.json` 里的版本（pinia 4、vue-router 5）；用不了的功能见下。
2. `wrong` 里的 `js` 里同样不能声明注入的同名变量。
3. 起始脚本里不要抛错的 `TODO`：可以写成返回 `{}` 或半成品，让页面能运行、检查按条目失败，比"代码没有运行"更有信息量。
4. 每道题至少用 3 种不同的正确写法在浏览器里试一遍（选项式 store 和 setup store、`beforeEach` 和 `beforeEnter` 等），确认判题不误伤。

**限制**：
- Router 只有 memory history：不能演示地址栏变化、`createWebHistory` 的 base、hash 模式、`scrollBehavior`（需要真实滚动）和页面刷新后保持路由。要讲这些就写在正文里，练习里用 `router.currentRoute` 代替"看地址栏"。
- 路由组件的懒加载只能写 `() => Promise.resolve(组件)` 或带 `setTimeout` 的 Promise，不能 `import('./X.vue')`（练习里没有文件）。
- 没有 SFC：组件写成对象（`{ setup, template }`），和其他练习一样。
- Pinia 没有 devtools，没有 SSR 水合（`skipHydrate` 在练习里没有意义）。
- 不加载 `@pinia/colada`、`pinia-colada` 等其他库。

### 4.11 自测题

```md
::: selfcheck
<Sc :a="0">

点击按钮 3 次后，按钮显示什么？

```js
let count = 0
```

<Opt>一直显示 0</Opt>
<Opt>显示 3</Opt>
<Opt>控制台报错</Opt>

<template #explain>

解析：count 是普通变量，不是响应式数据。写 `const count = ref(0)`。

</template>
</Sc>

:::
```

规则：

- `a` 是正确选项的序号，从 0 起。题干是 `<Sc>` 后的第一段（可以有多段和代码块）。选项用 `<Opt>`，每个一行，写在一起。
- `<Sc :a="0">` 后面、`<Opt>` 前后、`<template #explain>` 前后、`</template>` 后面都要有空行。`</template>` 和 `</Sc>` 之间不要空行。最后一个 `</Sc>` 和结尾 `:::` 之间也要空一行。
- `<Opt>` 必须单独占行首，一行一个，里面可以写行内 Markdown。
- 解析以“解析：”开头。答对后前面自动加“正确。”。
- **答错的行为**：答错时不亮出正确答案，也不显示解析，只标出选错的那一项并提示再试。点“再答一次”后，上次选错的那一项被隐藏。只有答对才显示解析。所以解析里不需要考虑“答错的人看到它”的情况，但解析要说明为什么对，并点出最迷惑的错误项错在哪。
- 只有第一次作答计入复习卡片和首答记录；之后重答只更新选中的选项。
- 数据来源见第 7 节：构建时会从这里抽出题干、选项、解析，供复习卡片使用。所以**必须按上面的格式写**（`<Sc ...>`、`<Opt>…</Opt>` 一行一个、`<template #explain>`），否则抽不出来。

**保存规则（重要）**：答案保存在进度的 `<章id>.sc[序号]`（见第 6 节）。序号是这道题在本章所有自测题里的位置（从 0 起，按页面顺序，不含“先猜”题）。所以**已有的题不能删除、调序，也不能改题干和答案，只能在末尾追加**（`check:content` 对照卡片键快照拦截，规则见 AGENTS.md「卡片键快照」）。`Goal` 的 `checks="sc:N"` 用同一个序号。

### 4.12 实验台

实验台本体是 `labs/NN-id/名字.vue`，在 `<script setup>` 里导入。正文里这样写：

```md
<Lab id="demo-mig-counter" title="实验台：两种 API 写的同一个计数器" note="两个组件都在真实的 Vue 3 中运行">
<template #predict>
<Sc predict :a="1">

先猜：两个计数器都用 start 初始化 count。把 props.start 从 5 改为 10，两个 count 是多少？

<Opt>都变为 10</Opt>
<Opt>都仍是 5</Opt>
<Opt>只有选项式变为 10</Opt>

<template #explain>

解析：……

</template>
</Sc>
</template>

<MigCounter />
</Lab>
```

- `id`：实验台唯一编号，也是“先猜”答案的存储键（`p:id`），不能改。`title`、`note` 是标题和说明。
- `#predict` 插槽放一道 `<Sc predict>`。没有这个插槽，实验台一开始就是打开的。有时：猜之前实验台正文不显示；选完后打开；出现“核对我的猜测”按钮，点它才显示解析。也可以点“跳过，直接打开实验台”。
- 默认插槽放实验台组件。它只在浏览器里渲染，接近视口时才挂载，实验台组件不用自己处理。
- 实验台组件用普通 SFC 写法（`<script setup>` + `<template>`），可以直接 `import { ref } from 'vue'`。
- 展示一段代码用 `<LabCode :code="字符串" />`。
- **多标签页实验台**：用 `<TabbedLab :tabs="TABS" />`，每个标签页拆成一个小 SFC，`TABS = [{ name, tip, code, comp }]`（`code` 省略就只显示运行效果；默认插槽参数 `{ tab, index }` 可在下面加内容）。样例：`labs/02-template/DirectivePlayground.vue`。
- 共用辅助函数从 `labs/_shared` 导入：`import { domLog, dLogBuf, useMouse, useDebounced } from '../_shared'`。
- 控件类名已在 `style.css` 里：`.row .b(.pri .on) .cap .cols .box .t .ctl .tabs .log .pill .domview pre.code .kv .bucket .keys .kbox .legend .ops .hook-grid .hook .view .vl .vrow .stepper .kanban .task .q .opts .opt .explain .score .flash textarea.t`。实验台私有的样式写在自己 SFC 的 `<style scoped>` 里。
- **读 DOM 的实验台**（显示“渲染出的属性”“当前 HTML”）：用 `ref` 拿元素，在 `onMounted` 和 `watch(…, { flush: 'post' })` 里读 `getAttribute` 或 `innerHTML`。多行文字写成表达式 `{{ 'a' + '\n' + 'b' }}`，模板里直接换行会被压成一个空格。
- **指令钩子、生命周期钩子的日志不能用响应式数据**：钩子在渲染中运行，里面改响应式数据会触发新渲染，形成死循环。用 `domLog` 往空的 `<div class="log" ref="logRef">` 里写。
- 自定义指令在 `<script setup>` 里写成 `const vXxx = {…}`，模板里就是 `v-xxx`。
- 手机上：触控目标不小于 32px 的规则已在 `style.css` 里统一处理（复选框、滑块、按钮）。新实验台用 `.b`、`label.ctl` 等已有类名即可。

### 4.13 其他组件

- `<Flow :steps="['setup', 'onMounted']" />`：一行步骤箭头。
- `<ChapterMeta>`（章头）、`<ChapterFoot>`、`<AppEffects>`、`<CourseHome>`、`<GlossaryPage>`：由主题插槽或页面自动放置，章里不要手写。
- **`<Warmup>`（课前热身）和 `<SelfExplain>`（自我解释）也是自动放置的，章的 Markdown 里不要写，也不要改任何章文件**：热身由 `config.mts` 的 markdown 规则（`course_inject_warmup`）插在每个带 `stage` 的章的一级标题后面（标题 → 章头 `ChapterMeta` → 热身 → 目标）。章头（阶段标签、第 N / 总章数 章、`desc` 一句话、阅读时间）也是自动放的，阅读时间就是章里 `::: rt` 块的文字（见 4.3）；自我解释由主题布局的 `doc-footer-before` 插槽放在掌握标准条之前。章里的 `::: summary` 小结块因此默认隐藏（`sx-hidden`），内容在构建时抽出（`virtual:course-summaries`），学习者写够 30 个有效字、点“对照本章要点”后，在自我解释区域里显示。**每章必须有且只有一个 `::: summary`**，它是自我解释的参考要点。
- `<Question>`：题目组件（热身、复习页、阶段测验共用），不在章里用。章内自测用 `<Sc>`。
- `<ReviewPage>`、`<StageCheck :stage="N">`：只在 `review.md` 和 `check/N.md` 里用。

### 4.14 站内链接和 base

站点部署在子路径下（`BASE_PATH = '/hands-on-vue3/'`，只在 `course/site.mjs` 定义一处，`config.mts` 的 `base` 和所有测试、脚本都从那里取）。写链接时：

- **Markdown 里**写不带 base 的站内路径：`[第 3 章](/chapters/03-refs)`、`[今日复习](/review)`、`[术语表](/glossary)`、`[入门阶段测验](/check/1)`。VitePress 会自动加 base；`check:content` 检查这些目标存在。
- **组件里**手写 `<a href>` 或 `router.go()` 时，用 `withBase('/review')`（来自 `vitepress`）。不要写 `href="/review"`，也不要用 `location.href = '/…'`。
- **存进 localStorage 的路径不带 base**（`__last.path` 是 `/chapters/05-comm`）：换部署路径不会让旧数据失效。读出来再用 `withBase` 拼地址；`chapterByPath` 对带不带 base、带不带 `.html` 的路径都认。
- 虚拟模块里渲染好的 HTML（自测题、小结、术语释义）也带 base：`course-data.mts` 创建渲染器时传的是 `BASE_PATH`。
- 本地开发和预览的地址都带 base：`http://localhost:5173/hands-on-vue3/`。测试里页面地址一律写 `base + '/chapters/…'`，其中 `base` 是 `helpers.js` 的 `startPreview()` 返回的（已含 base 路径）。

## 5. 新增内容的步骤

### 新增一章

用脚手架：`npm run new-chapter -- <章id> --stage <阶段> --after <已有章id> --title "标题"`。它生成章、练习、实验台测试数据的骨架，更新卡片键快照，插在中间时把后面的章顺延改名和改引用。完整步骤和脚本不改的地方见 AGENTS.md「怎样加一章」。手工新建也行，要点：

1. 文件名 `chapters/NN-id.md`（NN 为两位章号），frontmatter 见第 2 节（别忘了 `stage`）。章号要和已有章连续。
2. 按第 3、4 节写正文。侧边栏、首页的阶段卡片、进度统计、首页路线说明里的章数、章头的总章数都从 frontmatter 自动生成，**不用改任何共享文件**。
3. 需要时新增 `exercises/NN-id.ts`、`labs/NN-id/*.vue`、`figures/NN-id/*.vue`，和测试数据 `tests/site/labs/NN-id.js`（每个 `<Lab id>` 都要有一项，见第 8 节）。
4. 测试里锁定的章数和每阶段题数在 `tests/expected.cjs`，加章后测试会提示去改它。文档里的章数（README、AGENTS）由 `npm run check:docs` 核对。
5. 跑该章测试（第 8 节）。

### 新增练习 / 实验台 / 示意图

按 4.10、4.12、4.9。新增后：练习要在章里放 `<Exercise id>`，并在合适的 `<Goal checks>` 里加 `ex:id`；实验台要补 `tests/site/labs/NN-id.js` 里的一项。

### 新增自测题

只能在这一章已有自测题的**末尾**追加（4.11），不能插在中间。追加后，如果有目标要覆盖它，在 `<Goal checks>` 里加 `sc:N`。不用改别的：复习题库在构建时重新抽取。

### 新增阶段测验专用题

在 `course/checks/questions.ts` 的 `Q` 末尾追加一项：`[题目, 选项（第一个是正确答案，显示时按题号固定打乱）, 解析, 章 id, 代码（可选）]`。题目属于哪个阶段，由它的章 id 对应那一章的 `stage` 决定，题库里不存阶段号。键（`章id#cN`，N 是这一章的第几道专用题）按出现顺序编号，所以只能在末尾追加。

## 6. 进度和存储

进度只存在浏览器的 localStorage，**单个键 `hands-on-vue3-v1`**，值是一个 JSON 对象。没有服务端。结构定义在 `course/engine/types.ts` 的 `Progress`，业务规则在 `course/engine/logic/`，规则和测试的对照表见 `tests/unit/README.md`。

界面读写进度只经过 `theme/composables/learn.ts`（它封装引擎，提供 `cpOf`、`mutate`、`completeIfMet`、`chapterState` 等），不要在组件里直接读写 localStorage。旧版零散的进度键（前缀见 `engine/logic/migrate.ts`）只在引擎的一次性迁移里出现：第一次读取时新键不存在、旧键存在，就迁过来，之后不再迁移，旧键不删。

结构：

```
{
  "<章id>": {
    "sc":    { "<题号>": 选中的选项序号 },    章内自测，答错的选项也会记（用来还原“答错等待重试”的样子）
    "tried": { "<题号>": true },              答过的题。只有第一次作答计入复习卡片和首答记录
    "first": { "<题号>": 首答是否答对 },
    "ex":    { "<练习id>": { passed, code: {tpl, js}（草稿）, fails / firstFail / lastFail（提示阶梯的失败记录）, sawSol（看过答案）, rewrite（看过答案后点了重置）, stash（填入半成品或答案前自己的代码）, help（借助答案的标记：'solution' 或 'rewrite'）} },
    "done": true, "doneAt": 毫秒时间,
    "note": "自我解释写的文字", "sx": true（点过“对照本章要点”）
  },
  "__pred": { "<实验台id>": { pick, checked } },   先猜
  "__srs":  { "<章id>#N 或 <章id>#cN": 复习卡片 },   间隔复习卡片（Leitner 盒子）
  "__stage": { "<阶段号>": 阶段测验记录（passed、last、best、failedAt、passedAt、weak、答到一半的 pending） },
  "__last": { path, anchor, h, t }                上次阅读位置
}
```

规则：

- **章内自测**：答对 → 标出正确项并显示解析；答错 → 不亮正确答案、不显示解析，提示再试，点“再答一次”后隐藏上次选错的那一项（`Sc` / `Opt` 组件）。只有第一次作答计入复习卡片和首答记录（`answerSelfCheck`）。
- **章完成**：章内自测全部答对 + 本章练习全部通过（`shouldAutoComplete`）。在答题或练习通过的那一刻检查，达标就标记完成并记 `doneAt`。没有手动“标记完成/取消”按钮。没有自测题也没有练习的页面不参与。
- **掌握标准条**（`ChapterFoot`，章末）：列出还差哪几道自测没答对、哪几道练习没通过（`completionNeeds`）；全部达成显示“已完成”；借助答案通过的练习单独标注（`helpedExercises`）。
- **练习**：通过、草稿、失败次数、是否看过答案都在 `ex[练习id]`，用 `exerciseState.ts` 的 `recordFailure`、`recordPass`、`saveDraft`、`viewSolution`、`resetExercise`、`stashCode`、`restoreStash` 改。练习类型的 `faded`（半成品，见 4.10）在校验里是必填。
- **目标勾选**：`<Goal checks="sc:0,ex:counter">` 里自测要**答对**才算，练习要通过才算。
- **阅读位置**：进入一章时记下这一章；用户滚动停下后记下读到的小节。首页“继续学习”按钮回到那里。带锚点进入一章时，编辑器和实验台陆续挂载会把版面撑高，`AppEffects` 在 5 秒内持续把目标拉回顶栏下方（用户一动就停）。
- **侧边栏和顶栏**：侧边栏最上面是“今日复习”（右侧徽标是今天到期的题数，`AppEffects` 写 `data-badge`）、“术语表”和速查表；下面按阶段分组，标题形如 `01 入门`，右侧显示这个阶段的完成数（`AppEffects` 写 `data-count`，样式在 `style.css`），已完成的章带 ✓；每组末尾是“阶段测验”，右边显示通过状态（`data-check`：通过 ✓、该复测、未通过）。顶栏右侧（`NavProgress`）显示总进度条和“已完成 N/总章数”。
- **水合**：页面挂载后才读 localStorage（组件的 `onMounted` 调用 `ensureReady()`，之前 `ready` 为假），服务端渲染和首次渲染一律用空进度，避免水合不一致。`cpOf()` 的结果不能缓存在 `computed` 里，见 AGENTS.md「架构要点」。

## 7. 自测题数据怎么传到别的页面

复习卡片要用各章自测题的题干、选项、解析，自我解释要用各章的小结，进度功能要知道每章的阶段、有几道自测和它们的正确答案、哪些练习。这些信息只存在于各章 `.md`，所以在**构建时**抽取：

- `.vitepress/course-data.mts` 是一个 Vite 插件，提供四个虚拟模块；抽取用的解析函数（自测题、小结、术语块、阅读时间、frontmatter）在 `course/content-parse.mjs`，**站点和 Node 脚本（`check:content`、`new-chapter`）共用这一份**，没有副本：
  - `virtual:course-meta`：每章的元数据（id、文件名、标题、阶段（没有阶段的页面是 null）、章号、自测题数、自测正确答案 `scAnswers`、练习 id 列表、阶段测验专用题数 `checkCount`、阅读时间文字 `rt`）。很小，章页面都会载入（章完成判定、侧边栏标记、首页、复习题数用）。
  - `virtual:course-selfchecks`：每道自测题的键（`章id:序号`）、正确选项、渲染成 HTML 的题干、选项、解析。很大，所以只在需要时动态载入（`composables/catalog.ts`：课前热身、复习页、阶段测验页），章页面平时不载入它。
  - `virtual:course-summaries`：每章 `::: summary` 小结块的内容，渲染成 HTML（章 id → HTML）。自我解释写够字后在页面里显示它。
  - `virtual:course-glossary`：全站术语表（见下面“术语表和术语标注”）。

### 术语表和术语标注

`/glossary`（`course/glossary.md`，组件 `GlossaryPage.vue`）是**自动汇总**的，没有手写数据：构建时 `content-parse.mjs` 的 `collectGlossary` 扫每个带 `stage` 的章里的 `::: terms` 块，合并成 `virtual:course-glossary`。

写术语块要遵守的格式（不对会让构建报错）：

- 用定义列表：第一行是术语，下一行以 `: `（冒号加空格）开头写解释，术语之间空一行。解释写在一行里，可以用行内代码和粗体。
- 术语写成你希望它在正文里出现的样子，例如 `ref`、`事件（emit）`。术语表和术语标注都按这个文字逐字匹配，所以带括号的术语只有正文里写成完整括号形式才会被标注。
- 每章只写一个 `::: terms` 块。不带 `stage` 的页面（速查表）不参与汇总。

重名术语的处理：

- 同一个术语（文字完全相同）在多章出现，只留一条：用**章号最小的那一章**里的解释，“出自”列出所有出现过的章，链接回去。
- 不同章里的解释文字不同时，构建会打印警告“术语“X”在多章里的定义不同”。页面仍用首次出现的解释。这类术语要么改成同一句解释，要么改个名字，避免同一个词两种说法（课程规则：一个概念只用一个说法）。
- 术语表按首次出现的先后（阶段、章号）排，可以按术语或解释搜索。
- **“不这样说”一栏**：首页「本课程的写作规则」里有一张“术语 / 意思 / 不使用的同义词”的表，那是写作规范用词，性质和自动汇总的术语表不同，所以保留在首页；它的数据在 `course/writing-terms.mjs`（`label`、`terms`、`meaning`、`avoid`）。`terms` 里的名字和术语表条目同名时，术语表页在这个条目上显示 `avoid`。`check:content` 校验 `terms` 里的每个名字都能在术语表里找到，找不到的会报错（目前有登记在 `scripts/lib/known-issues.mjs` 里的豁免，修法见那里）。

术语标注（`composables/terms.ts`，由 `AppEffects.vue` 在每次进入章页时执行）：

- 章正文里出现的术语带虚线下划线，悬停、聚焦（键盘）或点按显示定义和出处章。
- 只标这一章及更早的章定义的术语，不标还没学到的。
- 每个术语在每个小节（`h2`/`h3` 之间）只标第一次出现。匹配规则在 `composables/term-match.ts`（纯函数，有单元测试 `tests/unit/term-match.test.ts`）：
  - 同一位置多个术语匹配时取最长的（“单文件组件”优先于“组件”）。
  - **复合词里的子串不标**：术语前后紧邻着别的字，并且“术语 + 相邻字”正好是另一个更长的已知术语（全部章的术语加首页写作规则表里的术语，含还没学到的）时不标。例：“子组件”里的“组件”、“响应式数据”里的“响应式”、第 2 章里“自定义指令”里的“指令”都不标。
  - 纯英文术语（`ref`、`key`、`props`）要求词边界：前后不能紧挨字母、数字、下划线、`$`、连字符，前面也不能是点。所以 `refs`、`keyup`、`defineProps`、`toRef`、`template-ref`、`a.ref` 里都不标。
- 不标：代码块、行内代码、标题、链接、术语块、章头、目标、类比、自测、实验台、练习、热身、自我解释、图。速查表和阶段测验页不标。
- 不需要在章里做任何事。想让某个词被标注，把它写进本章术语块；不想被标注，别写进术语块。
- 改规则时同步改 `tests/site/glossary.test.js`。
- 抽取用正则匹配 `<Sc …>…</Sc>`（跳过带 `predict` 的先猜题），序号规则和 `Sc` 组件一致。题干和解析用 VitePress 的 Markdown 渲染器渲染，所以代码块有高亮。
- 构建时总是最新的。开发服务器里改了自测题或 `stage` 后，如果数据没有更新，重启 `npm run dev`。
- 测试 `tests/site/progress.test.js` 的第一项检查：每一章抽出的自测题数、练习 id 和页面上实际渲染的一致。格式写错时它会报出来。

## 8. 测试

命令、耗时、什么时候跑哪个，见 AGENTS.md「命令」一节（`npm run check` 提交前跑；`npm test` 完整验收；`npm run test:e2e -- <套件或章名>` 跑指定的浏览器测试）。所有浏览器测试套件都读已构建的站点，默认 `course/.vitepress/dist`，设了 `COURSE_OUT_DIR` 就读那个目录；页面地址都带 base（第 4.14 节）。

四个浏览器测试文件（`tests/site/`）：

- `exercises.test.js`（逐章）：每道练习（初始不通过、答案通过、每个 `wrong` 不通过）；每道练习的半成品原样提交不通过、不等于参考答案、至少有一个 `✏️` 占位；编辑器能输入；自测答错不显示解析、刷新后仍是答错状态、重试隐藏上次选项、答对才显示解析、目标打勾；每个实验台（先猜之前关着，选完后打开，做一次有代表性的操作并断言）；章里每个 `<Lab id>` 都有测试数据；控制台无报错；练习 id 不重复。
- `progress.test.js`：章元数据和页面一致；首页（路线说明里的阶段数和章数是算出来的、状态、阶段测验入口、怎样用这套课程）；侧边栏的阶段分组和完成数、✓、顶部固定入口（今日复习、术语表、速查表）、每个阶段末尾的阶段测验、顶栏总进度、旧地址 27-quiz 的跳转；自测答错的行为；掌握标准条和自动完成；目标勾选；继续学习；站点 base（站内链接都带 base、继续学习在各种旧数据下都不是 404）；存储只有单键；旧键迁移；类比和深入开关；390px 无横向滚动；示意图放大。
- `mechanics.test.js`：学习机制（规则对照见第 10 节）：提示阶梯的解锁条件、代码没改不计失败、粘贴答案原文不通过、重置重写、半成品、课前热身出题和记录、自我解释 30 字门槛、复习页、首页复习入口、阶段测验、390px 无横向滚动。时间用 Playwright 的 `page.clock.setFixedTime` 控制，不真的等。
- `glossary.test.js`：术语表页（条目数 = 各章术语块去重后的总数、同名合并、搜索、“不这样说”一栏、390px）、侧边栏顶部入口、术语标注（只标已学过的、每小节一次、不标代码和标题等、复合词里的子串不标、悬停和触屏的气泡）。

`helpers.js` 是共用的（起 preview、读章节数据）；`labs/NN-id.js` 是各章实验台的测试数据。锁定的数字（章数、每阶段题数）集中在 `tests/expected.cjs`，其余数字都从元数据算。

### 实验台测试数据 `tests/site/labs/NN-id.js`

章里每个 `<Lab id>` 都要有一项（测试会检查）。CommonJS，导出数组：

```js
module.exports = [
  {
    id: 'demo-refs',                       // <Lab id>
    name: '点“解构”按钮后 count 停在 0',     // 说明
    pick: 1,                               // “先猜”点哪一项（任意一项都会打开实验台）
    async run(p, body, ok) {               // p：Playwright 页面；body：实验台正文的 locator；ok(条件, 说明)
      await body.getByRole('button', { name: '解构' }).click()
      ok(/count = 0/.test(await body.textContent()), '解构后的 count 仍是 0')
    }
  }
]
```

测试自动检查：答题前实验台关着、选完后打开、没有控制台报错；在深入块里的实验台会先自动点开。第 2 章的 `tests/site/labs/02-template.js` 是样例。

### 并行构建用的环境变量

`COURSE_CHAPTERS`、`COURSE_OUT_DIR`、`COURSE_CACHE_DIR`，用法见 AGENTS.md「命令」。

## 9. 踩过的坑

1. **`{{ }}` 会被 Vue 当成插值。** 本站已处理：正文文字里的 `{{` 自动转成实体，行内代码自动加 `v-pre`，围栏代码本来就安全。所以正文里直接写 `{{ count }}` 即可。但是你自己写的 HTML 标签（例如 `<span>{{ x }}</span>`）和 SVG 的 `<text>` 里的 `{{ }}` 不会被处理，要给标签加 `v-pre`。
2. **行首的组件标签会开一个“HTML 块”，到下一个空行才结束。** 块里的 Markdown 不会被解析。所以：
   - `<Sc>`、`<Figure>`、`<Lab>`、`<Exercise>`、`<template>` 这类块级标签，后面如果要写 Markdown，必须空一行。
   - `<Figure>` 里的三行不要空行，否则图会被拆开。
   - 块后面紧跟 `:::` 时，中间要空一行，否则 `:::` 会被当成块里的文字。
   - `<Goal>` 和 `<Opt>` 是例外：已被配置成行内组件，行内的反引号和粗体照常解析，可以一行一个、连续写。
3. **中文粗体已修好。** `markdown-cjk.mts` 放宽了 `**` 的判断，所以 `**场景：……。**后台页面`、`的**“小纸条”**，告诉` 都能直接写 `**`。仍然失败的少数情况（例如 `**` 里面以空格开头）改用 `<b>…</b>`。
4. **代码块外的 `<script>` 标签。** VitePress 会把行首的 `<script>` 当成页面脚本抽走。正文里讲 `<script setup>` 时，要么放进围栏代码块，要么放进行内代码。只有每章开头那一个 `<script setup>` 是真的脚本。
5. **正文文字里不要用 HTML 实体。** `&lt;p&gt;` 会被站点的文字规则再转义，页面上显示成字面的 `&lt;p&gt;`。写成行内代码 `` `<p>` `` 或转义的 `\<`。`Exercise` 的 `task` 字符串是 HTML，里面的 `&lt;` 仍然要保留。
6. **容器嵌套要用更多的冒号。** `pair` 里套 `col`，外层四个冒号，内层三个。`deep` 里不要再套别的容器。
7. **配置文件是 `config.mts`、`vitest.config.mts`**，不是 `.ts`；不要给 `package.json` 加 `"type": "module"`。**不要给站点的 `vue` 做 alias。**（原因见 AGENTS.md「架构要点」。）
8. **站内链接要带 base。** Markdown 里写 `/chapters/…` 就行，组件里手写要用 `withBase`（见 4.14）。
9. **练习和实验台只在浏览器里渲染**，服务端渲染出来的页面里只有占位。测试要等编辑器出现（`.ex[data-ex] .cm-content`）。组件在异步加载编辑器期间被卸载（用户马上换页）时，`Exercise` 要提前返回，不能再访问已卸载的元素。
10. **进度只存 localStorage。** 键的含义见第 6 节。不要做服务端同步。读进度要等挂载后（`ensureReady()` 之后 `ready` 为真），否则水合不一致。
11. **VitePress 的 `html` 有 `scroll-behavior: smooth`。** 测试里滚动到某个位置要用 `scrollIntoView({ behavior: 'instant' })`，否则平滑滚动没结束就被下一步打断。
12. **带锚点进入页面后版面会变。** 编辑器和实验台晚挂载会撑高上方内容，标题被挤下去。`AppEffects` 已处理；写测试时要等 3 秒左右再断言位置。
13. **中文搜索**用的是 VitePress 本地搜索，对没有空格的中文分词一般。
14. 本机的预览端口可能被别的项目占用。测试和截图脚本自己选空闲端口。手动预览时用 `npm run preview -- --port 4791`，地址是 `http://localhost:4791/hands-on-vue3/`。
15. **练习的长代码编辑器自动限高。** 编辑器超过约 24 行（手机上不超过屏高的 70%）时在内部滚动（`style.css` 里 `.vp-doc .ed .cm-editor` 的 `max-height`），所以起始代码写几百行也不会把整页撑长；但页面仍然要给学习者足够的上下文，长脚本尽量把需要改的地方放在前面或用 `✏️` 标出来。`tests/site/mechanics.test.js` 的“长代码的编辑器限高”测它。

## 10. 学习机制（不要破坏）

课程按学习科学设计，用户明确要求保留，和 hands-on-react 共用同一套规则（那边叫“课”，这边叫“章”）。完整的规则文字在 `AGENTS.md` 的“学习机制（不要破坏）”一节。下表是每条规则对应的实现位置和测试。单元测试的细表见 `tests/unit/README.md`；浏览器测试在 `tests/site/mechanics.test.js`，括号里是测试组的开头几个字。

| 规则 | 实现 | 测试 |
|---|---|---|
| 先预测再运行：预测前隐藏说明 | `Lab.vue`、`Sc.vue`（predict） | `exercises.test.js`（实验台：先猜之前关着，选完后打开） |
| 到期才升级的门：答对没到期不改记录，答错回盒子 0（热身、混合练习、阶段测验共用） | `logic/srs.ts` 的 `shouldRecord`/`gatedNextCard`，`cards.ts` 的 `srsRecordGated`；界面 `Warmup.vue`、`ReviewPage.vue`、`StageCheck.vue` | `srs.test.ts > 只有到期的卡片才提升复习间隔`、`cards.test.ts > srsRecordGated`；mechanics：热身作答、没有到期的（混合练习）、今日复习 |
| 间隔序列 0/1/3/7/16/35 天，答错明天再出 | `logic/srs.ts` 的 `SRS_DAYS`、`nextCard` | `srs.test.ts > 间隔序列`；mechanics：今日复习（答错回盒子 0，明天再出） |
| 今日复习只出到期卡，最多 20 道；没到期时有 10 道混合练习 | `logic/review.ts`，`ReviewPage.vue` | `review.test.ts`；mechanics：今日复习、没有到期的 |
| 12 小时内答过的不再出：只适用于热身 | `logic/srs.ts` 的 `warmupPool`；`Warmup.vue` | `srs.test.ts > 热身题库`；mechanics：热身（12 小时内答过的卡不出） |
| 热身选 2 题：先到期、再上一章 | `logic/srs.ts` 的 `pickWarmup`；`Warmup.vue`；`config.mts` 自动插入 | `srs.test.ts > pickWarmup`；mechanics：课前热身 |
| 章内自测和热身答错不亮正确答案，重试时隐藏上次选的项；只有第一次作答计入复习 | `Sc.vue`、`Question.vue`（retry）；`cards.ts` 的 `answerSelfCheck` | `progress.test.js`（自测答错）、`exercises.test.js`；mechanics：热身作答；`cards.test.ts > 章内自测作答` |
| 提示阶梯三级：提示（失败 1 次）、半成品（2 次且 2 分钟）、参考答案（3 次且 5 分钟）；没有 `faded` 时跳过半成品 | `logic/ladder.ts` 的 `LADDER`、`ladderStatus`、`unlockNote`；`Exercise.vue` | `ladder.test.ts > 提示阶梯`、`exerciseState.test.ts > 阶梯状态和失败后的说明`；mechanics：提示阶梯、半成品示例 |
| 只有代码真的改了才算一次失败（和起始代码、上一次失败都不同） | `logic/ladder.ts` 的 `isAttempt`；`logic/exerciseState.ts` 的 `recordFailure` | `ladder.test.ts > 代码是否真的改了`、`isAttempt`；mechanics：提示阶梯（没改代码、只加分号、来回切换） |
| 粘贴参考答案原文不能通过，除非看过答案后按了“重置”；借助答案单独标记（`solution` / `rewrite`） | `logic/ladder.ts` 的 `isPastedSolution`；`logic/exerciseState.ts` 的 `recordPass`、`resetExercise`；`Exercise.vue`、`ChapterFoot.vue` | `ladder.test.ts > 粘贴参考答案原文不能通过`、`exerciseState.test.ts > 借助答案的标记`；mechanics：参考答案、看答案后点重置 |
| 填入半成品或答案前，自己的代码能找回 | `logic/exerciseState.ts` 的 `stashCode`、`restoreStash` | `exerciseState.test.ts > 填入半成品…先存下自己的代码`；mechanics：半成品示例 |
| 自我解释至少 30 个有效字才展示参考要点（小结块默认隐藏） | `logic/selfExplain.ts`；`SelfExplain.vue`；`config.mts`（`sx-hidden`）；`course-data.mts`（`virtual:course-summaries`） | `selfExplain.test.ts`；mechanics：自我解释 |
| 阶段测验：12 题（8 新 + 4 常规）、交卷后才显示解析、80% 通过 | `logic/stageCheck.ts` 的 `pickStageQuestions`、`isPass`；`StageCheck.vue`、`Question.vue`（defer） | `stageCheck.test.ts > 抽题`、`及格判定`；`cards.test.ts > 阶段题池`；mechanics：阶段测验 12 题、各阶段测验页 |
| 中途离开算未通过；未通过冷却 30 分钟；以最近一次为准；通过后清掉 `weak`；35 天后提示复测 | `logic/stageCheck.ts` 的 `settlePending`、`cooldownLeft`、`settleResult`、`needsRetest`、`stageStatus` | `stageCheck.test.ts`（中途离开、冷却、交卷后的记录、35 天、状态）；mechanics：中途离开、答对 10 题通过、答对 9 题不通过 |
| 章完成 = 自测全部答对 + 练习全部通过，自动标记 | `logic/completion.ts`，`learn.ts` 的 `completeIfMet`；`ChapterFoot.vue` | `completion.test.ts`；`progress.test.js`（掌握标准条和自动完成） |
| 卡片键 `章id#N` / `章id#cN` 不能变 | `cards.ts`（`scKey`、`checkKey`、`buildCatalog`） | `cards.test.ts > 卡片键规则`、`179 道阶段测验专用题…` |
| `logic/` 不碰 DOM、localStorage、`Date.now()`；不允许循环依赖 | `course/engine/logic/` | `purity.test.ts`、`cycles.test.ts` |
| 手机宽度无横向滚动 | `style.css` | mechanics：390px 宽下没有横向滚动 |

改规则时：先改 `AGENTS.md` 的这一节，再写会失败的测试，最后改实现。行为和规则文字不一致时，不要悄悄改其中一边，先搞清楚哪个是用户要的。

## 11. check:content 检查的规则

`npm run check:content`（不需要浏览器，1 到 2 秒；提交前钩子也会跑）检查下面这些。规则的实现在 `scripts/lib/validate.mjs`，每条都有单元测试（`tests/unit/check-content.test.ts`）。写内容时最容易踩的是：

- **frontmatter**：`title`（短名）、`id`（存储键，不能改）、`stage`、`chapter`（章号）、`desc`，可选的 `optional`（只能是 `true` 或 `false`，且一个阶段不能全是选读章）。文件名 `NN-id.md` 的 `NN` 等于 `chapter`，`id` 等于文件名里的 id。一级标题 `# …` 必须以 `title` 开头，可以更长（如 `响应式基础：ref 和 reactive`）。章号从 1 起连续，阶段随章号不减。
- **一章的块**：目标、阅读时间、类比、术语、为什么需要它、小节 `### N.M 标题`、注意、自测、小结。**每章必须有且只有一个 `::: summary`**（自我解释的参考要点）。热身和自我解释是自动注入的，章里不要写。术语块的格式不对（术语一行，下一行以 `: ` 开头）也会报错。
- **自测题**：`<Sc :a="N">` 至少 2 个 `<Opt>`，`a` 在范围内，解析以“解析：”开头；格式必须能被 `content-parse.mjs` 的正则抽取。序号从 0 起、按页面顺序、不含带 `predict` 的先猜题。
- **目标**：`<Goal checks="sc:N,ex:练习id">` 引用的自测序号和练习 id 必须存在，练习必须在本章用 `<Exercise id>` 放出来。标签（自测 N 题 · 练习 M 道）自动算，不要手写。
- **练习**（`course/exercises/NN-id.ts`）：每个导出对象的键名就是练习 id（全站唯一），字段：`title`、`ch`（所在章号）、`task`、`tpl`、`js`、`solTpl`/`solJs`（至少一个与起始不同）、`hints`（非空，由浅到深）、`check`、`wrong`（**至少 1 个**，来自真实误解，没有 `WRONG_SUB_FAILED`）、`faded`（**必填**的半成品：`{ tpl?, js? }` 非空，不与参考答案相同，至少 1 个 `✏️` 占位，见 4.10）、`lazy`（可选）。每个练习必须被某一章使用，且放在以该章命名的文件里。
- **实验台**：`<Lab id>` 全站唯一；有 `#predict` 插槽的才有先猜记录（进度里 `__pred[实验台 id]`）；每个 `<Lab id>` 在 `tests/site/labs/NN-id.js` 里有一项测试数据；`import` 的实验台和示意图文件必须存在。
- **阶段测验专用题**（`checks/questions.ts`）：格式对、章 id 存在；每个阶段有测验页 `check/N.md`，题量够抽一套题。
- **站内链接**：`/chapters/NN-id`、`/check/N`（N 在阶段数内）、`/review`、`/glossary`。`check:content` 扫章、`index.md`、`glossary.md`、`review.md`、`check/*.md`、练习的提示和题库里的链接；构建另外检查 Markdown 里的死链接。链接要不要带 base 见 4.14。
- **引用**：“第 N 章”的 N 在范围内；“N.M 标题”对应真实小节；**小节引用**（`scripts/lib/section-refs.mjs`，校验和插入、移动章时的改号共用）认这几种写法：`N.M 节`、`N.M、N.M 节`、`N.M 至 N.M 节`（分隔符 `、 ， 和 与 及 至 到 – —  - ~`）、不带“节”字的 `见 N.M`、`第 X 章 N.M`、表头含“位置 / 小节 / 章节 / 出处 / 对应 / 节”的表格列里的裸 `N.M`；每个小节必须存在，区间两端必须在同一章且顺序对，前面写了“第 X 章”的 N 要等于 X，不带“节”字的 `见 N.M` 和表格里的裸 `N.M` 只能指本章（指别的章写成“第 N 章 N.M 节”）。版本号和小数（`3.5`、`1.5 倍`）没有这些记号，不当引用。同样的规则也扫练习的提示、题库和实验台、示意图 `.vue` 里的文字；校验只认上面这些有记号的写法，没有记号的裸 N.M（“（15.6）”“15.2 的 PatchFlag”）校验不管，但插入、移动章时脚本会按“真实存在的小节编号”把它们一起改号（版本号和数值除外），所以写小节引用尽量带“节”字，方便校验；`[第 N 章](/chapters/NN-id)` 的章号和链接目标一致；`第 N 章“词”` 的词要出现在第 N 章里。插入章会让后面的章号顺延，用 `new-chapter` 自动处理；移动章用 `move-chapter`。
- **引用的时态**：说“第 N 章讲过 / 回顾（第 N 章）”但第 N 章在本章后面，或说“第 N 章会讲 / 后面的第 N 章”但第 N 章在本章前面，算错误（`scripts/lib/ref-tense.mjs`）。
- **首页学习路线**（`course/learning-paths.mjs`）：路线里的章 id 必须存在、阶段号在范围内、同一条路线里章不重复、按章号从小到大排列。
- **术语**：首页写作规则表（`course/writing-terms.mjs`）里的术语都要能在术语表里找到。
- **卡片键快照**：见 AGENTS.md「卡片键快照」。
- **残留**：章节里不能有 `TODO`、未闭合的 `:::`；`【待写】` 只提示（`--strict` 时算错误）。

注意：插入、移动章时，脚本会把“真是某个小节编号”的裸 N.M 也一起改号（见上），偶尔会误改成小节编号的数值（例如“输入 12.3”“某某库 11.5”）。改号以后用 `git diff` 看一眼没有“节”字的 N.M 变化。

另有 `npm run check:docs`：核对 `AGENTS.md`、`README.md`、本文和首页组件里带单位的数字（“26 章”“60 道阶段测验专用题”……）与实际一致。数字确实是别的意思时，在该行末尾加 `<!-- check-docs: skip -->`。
