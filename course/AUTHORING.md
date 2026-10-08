# 内容写作与维护指南

本文说明怎样在这个站点里写和维护内容：新增一章、练习、实验台、示意图、自测题，怎样跑测试，以及踩过的坑。

站点是 VitePress。一章是一个 Markdown 文件，通用的教学块（目标、类比、深入、自测……）用容器和组件写。第 1、2 章（`chapters/01-first.md`、`02-template.md`）是完整样例，不确定时照着写。

## 1. 目录

```
course/
  index.md                首页（只有一行：<CourseHome />）
  chapters/NN-id.md       一章一个文件。NN = 两位章号，id = 章的稳定编号（见第 2 节）；速查表 cheat.md 没有章号
  figures/NN-id/*.vue     示意图，每张一个 SFC，只含 template
  labs/NN-id/*.vue        实验台，每个一个 SFC（多标签页的每页再拆一个小 SFC）
  labs/_shared/           各章实验台共用的辅助函数（domLog、dLogBuf、useMouse、useDebounced）
  checks/questions.ts     阶段测验专用题库（60 道题，不存阶段号，由所属章决定阶段）
  review.md               今日复习页（内容是组件 ReviewPage）
  check/1.md … 6.md       6 个阶段测验页（内容是组件 StageCheck）
  stages.ts               6 个阶段的唯一定义（编号、名称、英文副标题、说明）
  engine/                 学习机制：types.ts（进度结构）、store.ts（单键存储、旧键迁移）、cards.ts（复习卡片）、logic/（纯逻辑，有单元测试，见 tests/unit/README.md）
  exercises/NN-id.ts      该章的练习（自动汇总到 exercises/index.ts）；types.ts 是类型
  AUTHORING.md            本文
  .vitepress/
    config.mts            站点配置、自定义容器、中文粗体修复、并行构建用的环境变量
    sidebar.mts           从 chapters/*.md 的 frontmatter 生成侧边栏（顶部是今日复习和速查表，下面按 6 个阶段分组，每组末尾是阶段测验）
    course-data.mts       构建时从 chapters/*.md 抽数据，生成虚拟模块（见第 7 节）
    markdown-cjk.mts      markdown-it 插件：中文标点旁的 **粗体** 也能生效
    theme/
      index.ts            主题入口：布局插槽、全局注册 components/*.vue
      style.css           全部样式（含深色模式）
      components/*.vue    通用组件（全局注册，组件名 = 文件名）
      composables/        learn.ts（界面读写进度的唯一入口，封装 engine/）、catalog.ts（按需载入复习卡片目录）、keys.ts、highlight.ts
editor/entry.js           练习编辑器（CodeMirror 6）的封装，被 Exercise 组件直接导入
scripts/shot.mjs          给一章截浅色和深色整页图
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
- `stage`：这一章属于第几个阶段，1 到 6。**阶段的名称、编号、说明只定义在 `course/stages.ts`**，侧边栏、首页、测验、引擎都从那里取，不要在别处再写一份。`desc`：一句话说明。值里有 `: ` 之类 YAML 特殊字符时加双引号。
- `chapter`：章号。决定侧边栏里的先后和页面上的“第 N 章”小字。第 26 章是综合实战。
- **只有写了 `stage` 的页面计入学习进度**（现在是第 1 到 26 章，总数显示为“N/26”）。有章号的正文章必须写 `stage`，否则构建会报错；`stage` 不在 1 到 6 之间也会报错。
- 不写 `stage` 的页面（速查表 `cheat.md`）是侧边栏顶部的固定入口，不属于任何阶段，不计入进度，页面底部没有“掌握标准”条、自我解释和课前热身。速查表不带章号，写 `order: 100`；固定入口之间按 `order` 排序（没写的排在后面）。侧边栏最上面还有“今日复习”（`review.md`，不在 `chapters/` 里）。`chapters/27-quiz.md` 只是旧地址的跳转页（没有 `id`，不是章）。

### 怎样给一章指定阶段

当前划分（章号不变，只看 `stage`）：

| 阶段 | 名称 | 章 |
|---|---|---|
| 1 | 入门 Foundations | 1 到 4 |
| 2 | 进阶 | 5 到 11 |
| 3 | 高级 | 12 到 14 |
| 4 | 原理与架构 | 15 到 17 |
| 5 | 生态与实战 | 18 到 22 |
| 6 | 深入 | 23 到 26 |

新增一章时：在它的 frontmatter 写 `stage: N`。侧边栏分组、首页卡片、阶段完成数、总进度都会自动更新，不用改别处。要改阶段的名称或说明，只改 `course/stages.ts`。要把一章换到别的阶段，只改这一章的 `stage`；阶段测验专用题的阶段由所属章推出，不用改题库。
- 章内用到的示意图和实验台在章开头的 `<script setup>` 里导入。通用组件（`Sc` `Opt` `Goal` `Lab` `LabCode` `Figure` `Exercise` `Flow` `TabbedLab`）不用导入。课前热身和自我解释不用写，见 4.13。

## 3. 写作规则

- 简体中文，约 80% 的文字遵守 ASD-STE100：短句，一句一个意思，主动语态，步骤用编号祈使句。
- 比喻只放在“类比”块中。正文不用破折号（—）。
- 每个 API 的小节：问题 → 最小代码 → 1 到 3 个“场景：” → 注意 → 实验台/练习 → 深入（原理，放在 `::: deep`）。阶段一、二先讲用法后讲原理。
- 用到后面章节才讲的 API 时，写“（第 N 章）”或换掉。
- 技术内容以 Vue 3.5 为准。已核实（2026-10）：vue 3.5.43，vue-router 5.3.1，vite 8.3.3（Rolldown），pinia 4.0.3。有疑问时用 `node_modules/vue` 运行代码核实。
- 一章内块的顺序：目标、阅读时间、类比、本章术语、为什么需要它、小节 `### N.M 标题`（含正文、代码、图、实验台、练习、深入块、注意框）、注意、自测、小结。
- 小节从 N.1 起连续编号，不能放在 `::: deep` 里。移动小节后，要更新练习提示和测验解析里引用的“N.M 标题”或“N.M 节”。
- 目标：`<Goal checks="…">` 的标签（自测 N 题 · 练习 M 道）自动算，不要手写。不要给目标挂“回顾”题。
- **自测题只能在末尾追加**：学习者的答案按序号保存，已有题不能删除、调序，也不能改题干和答案（见第 5 节）。
- 每道练习至少写 1 个 `wrong`（来自真实误解的错误解法）。

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
  faded: { tpl: '<button @click="___">点了 {{ ___ }} 次</button>' },   // 可选：半成品，见下面
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
- **半成品 `faded`（可选）**：参考答案的“半成品”，关键处挖空，让学习者补全，比直接看答案学得多。写法：`faded: { tpl?, js? }`，只写有改动的那一段，没写的那段用起始代码补上。挖空处用 `___` 或 `// TODO` 标出，其余照参考答案写，**不要写成能通过检查的完整答案**（那就是第二个参考答案）。没有 `faded` 字段的练习，阶梯自动只有“提示”和“参考答案”两级。现有练习都还没有 `faded`，以后逐章补。测试里想临时给练习加半成品，用练习根元素上的 `__setFaded({ tpl, js })`（见 `tests/site/mechanics.test.js`）。

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

**保存规则（重要）**：答案保存在进度的 `<章id>.sc[序号]`（见第 6 节）。序号是这道题在本章所有自测题里的位置（从 0 起，按页面顺序，不含“先猜”题）。所以**已有的题不能删除、调序，也不能改题干和答案，只能在末尾追加**。`Goal` 的 `checks="sc:N"` 用同一个序号。

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
- `<ChapterHead>`、`<ChapterFoot>`、`<AppEffects>`、`<CourseHome>`：由主题插槽自动放置，章里不要手写。
- **`<Warmup>`（课前热身）和 `<SelfExplain>`（自我解释）也是自动放置的，章的 Markdown 里不要写，也不要改任何章文件**：热身由 `config.mts` 的 markdown 规则（`course_inject_warmup`）插在每个带 `stage` 的章的一级标题后面（标题 → 热身 → 目标）；自我解释由主题布局的 `doc-footer-before` 插槽放在掌握标准条之前。章里的 `::: summary` 小结块因此默认隐藏（`sx-hidden`），内容在构建时抽出（`virtual:course-summaries`），学习者写够 30 个有效字、点“对照本章要点”后，在自我解释区域里显示。**每章必须有且只有一个 `::: summary`**，它是自我解释的参考要点。
- `<Question>`：题目组件（热身、复习页、阶段测验共用），不在章里用。章内自测用 `<Sc>`。
- `<ReviewPage>`、`<StageCheck :stage="N">`：只在 `review.md` 和 `check/N.md` 里用。

## 5. 新增内容的步骤

### 新增一章

1. 新建 `chapters/NN-id.md`（NN 为两位章号），写好 frontmatter（第 2 节）。章号要和已有章连续；中间插入会让后面的章号都变，只在末尾追加更稳妥。
2. 按第 3、4 节写正文。侧边栏、首页的阶段卡片、进度统计都从 frontmatter 自动生成，**不用改任何共享文件**（别忘了 `stage`，见第 2 节）。例外：首页的路线说明文字（“25 章正文……”）是写死的，章数变了要手动改 `theme/components/CourseHome.vue`。
3. 需要时新增 `exercises/NN-id.ts`、`labs/NN-id/*.vue`、`figures/NN-id/*.vue`，和测试数据 `tests/site/labs/NN-id.js`（每个 `<Lab id>` 都要有一项，见第 8 节）。
4. 跑该章测试（第 8 节）。

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
  "__stage": { "<阶段号 1 到 6>": 阶段测验记录（passed、last、best、failedAt、passedAt、weak、答到一半的 pending） },
  "__last": { path, anchor, h, t }                上次阅读位置
}
```

规则：

- **章内自测**：答对 → 标出正确项并显示解析；答错 → 不亮正确答案、不显示解析，提示再试，点“再答一次”后隐藏上次选错的那一项（`Sc` / `Opt` 组件）。只有第一次作答计入复习卡片和首答记录（`answerSelfCheck`）。
- **章完成**：章内自测全部答对 + 本章练习全部通过（`shouldAutoComplete`）。在答题或练习通过的那一刻检查，达标就标记完成并记 `doneAt`。没有手动“标记完成/取消”按钮。没有自测题也没有练习的页面不参与。
- **掌握标准条**（`ChapterFoot`，章末）：列出还差哪几道自测没答对、哪几道练习没通过（`completionNeeds`）；全部达成显示“已完成”；借助答案通过的练习单独标注（`helpedExercises`）。
- **练习**：通过、草稿、失败次数、是否看过答案都在 `ex[练习id]`，用 `exerciseState.ts` 的 `recordFailure`、`recordPass`、`saveDraft`、`viewSolution`、`resetExercise`、`stashCode`、`restoreStash` 改。练习类型有可选字段 `faded`（半成品，见 4.10）。
- **目标勾选**：`<Goal checks="sc:0,ex:counter">` 里自测要**答对**才算，练习要通过才算。
- **阅读位置**：进入一章时记下这一章；用户滚动停下后记下读到的小节。首页“继续学习”按钮回到那里。带锚点进入一章时，编辑器和实验台陆续挂载会把版面撑高，`AppEffects` 在 5 秒内持续把目标拉回顶栏下方（用户一动就停）。
- **侧边栏和顶栏**：侧边栏最上面是“今日复习”（右侧徽标是今天到期的题数，`AppEffects` 写 `data-badge`）和速查表；下面按 6 个阶段分组，标题形如 `01 入门`，右侧显示这个阶段的完成数（`AppEffects` 写 `data-count`，样式在 `style.css`），已完成的章带 ✓；每组末尾是“阶段测验”，右边显示通过状态（`data-check`：通过 ✓、该复测、未通过）。顶栏右侧（`NavProgress`）显示总进度条和“已完成 N/26”。
- **水合**：页面挂载后才读 localStorage（组件的 `onMounted` 调用 `ensureReady()`，之前 `ready` 为假），服务端渲染和首次渲染一律用空进度，避免水合不一致。引擎的进度对象是原地修改的：**不要把 `cpOf()` 的结果缓存在 `computed` 里**（引用不变，下游不会重算），要在每个 `computed` 里直接调用。

## 7. 自测题数据怎么传到别的页面

复习卡片要用各章自测题的题干、选项、解析，自我解释要用各章的小结，进度功能要知道每章的阶段、有几道自测和它们的正确答案、哪些练习。这些信息只存在于各章 `.md`，所以在**构建时**抽取：

- `.vitepress/course-data.mts` 是一个 Vite 插件，提供三个虚拟模块：
  - `virtual:course-meta`：每章的元数据（id、文件名、标题、阶段（没有阶段的页面是 null）、章号、自测题数、自测正确答案 `scAnswers`、练习 id 列表、阶段测验专用题数 `checkCount`）。很小，章页面都会载入（章完成判定、侧边栏标记、首页、复习题数用）。
  - `virtual:course-selfchecks`：每道自测题的键（`章id:序号`）、正确选项、渲染成 HTML 的题干、选项、解析。很大，所以只在需要时动态载入（`composables/catalog.ts`：课前热身、复习页、阶段测验页），章页面平时不载入它。
  - `virtual:course-summaries`：每章 `::: summary` 小结块的内容，渲染成 HTML（章 id → HTML）。自我解释写够字后在页面里显示它。
- 抽取用正则匹配 `<Sc …>…</Sc>`（跳过带 `predict` 的先猜题），序号规则和 `Sc` 组件一致。题干和解析用 VitePress 的 Markdown 渲染器渲染，所以代码块有高亮。
- 构建时总是最新的。开发服务器里改了自测题或 `stage` 后，如果数据没有更新，重启 `npm run dev`。
- 测试 `tests/site/progress.test.js` 的第一项检查：每一章抽出的自测题数、练习 id 和页面上实际渲染的一致。格式写错时它会报出来。

## 8. 测试

```bash
npm run build                 # 构建全站（输出 course/.vitepress/dist）
npm test                      # = npm run test:unit 再 npm run test:site（先构建，再依次跑下面三个文件，约 7 分钟）
npm run test:unit             # 学习机制的单元测试（vitest，不需要浏览器，几百毫秒）
npm run check                 # 目前只跑 test:unit，以后内容校验会加进来

node tests/site/exercises.test.js 03-refs 04-computed   # 只测指定章：自己构建这些章到临时目录，端口自动选
node tests/site/exercises.test.js                        # 全部章，用已构建的 dist
node tests/site/progress.test.js                         # 跨章功能，用已构建的 dist
node tests/site/mechanics.test.js                        # 学习机制，用已构建的 dist
node scripts/shot.mjs 03-refs                            # 截这一章的浅色和深色整页图（展开所有折叠块），打印图片路径
```

本机 shell 如果设了 HTTP 代理，访问 localhost 的命令前加 `NO_PROXY=localhost,127.0.0.1`。

三个浏览器测试文件：

- `exercises.test.js`（逐章）：每道练习（初始不通过、答案通过、每个 `wrong` 不通过）；编辑器能输入；自测答错不显示解析、刷新后仍是答错状态、重试隐藏上次选项、答对才显示解析、目标打勾；每个实验台（先猜之前关着，选完后打开，做一次有代表性的操作并断言）；章里每个 `<Lab id>` 都有测试数据；控制台无报错；练习 id 不重复。
- `progress.test.js`：章元数据和页面一致；首页（路线说明、6 个阶段、26 章、状态、阶段测验入口、怎样用这套课程）；侧边栏 6 个阶段和完成数、✓、每个阶段末尾的阶段测验、顶栏总进度、旧地址 27-quiz 的跳转；自测答错的行为（不亮答案、不显示解析、重试隐藏上次选项、只有第一次计入复习）；掌握标准条和自动完成（自测答对 + 练习通过、借助答案的标注、没有手动按钮）；目标勾选；继续学习；存储只有单键；旧键迁移；类比和深入开关；390px 无横向滚动；示意图放大。
- `mechanics.test.js`：学习机制（规则对照见第 10 节）：提示阶梯三级的解锁条件、代码没改不计失败、粘贴答案原文不通过、重置重写、半成品、课前热身出题和记录、自我解释 30 字门槛、复习页（到期卡、答对升级、答错明天再出、没到期答对不改记录）、首页复习入口、阶段测验（12 题、交卷前不显示答案、80% 通过、中途离开冷却、通过后的状态、35 天复测）、390px 无横向滚动。时间用 Playwright 的 `page.clock.setFixedTime` 控制，不真的等。

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

`COURSE_CHAPTERS=03-refs,04-computed`（只构建这些章，其余 `srcExclude`）、`COURSE_OUT_DIR`、`COURSE_CACHE_DIR`（独立的输出和缓存目录）。`exercises.test.js` 和 `shot.mjs` 用它们只构建指定章，互不覆盖。日常开发和正式构建不设。

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
7. **配置文件是 `config.mts`，不是 `config.ts`。** `package.json` 没有 `"type": "module"`（测试用 CommonJS），VitePress 配置必须是 ESM，所以用 `.mts`。不要给 `package.json` 加 `"type": "module"`。
8. **不要给站点的 `vue` 做 alias。** 练习需要运行时编译模板，`Exercise` 组件挂载后会动态 `import('vue/dist/vue.esm-bundler.js')`。这个构建和站点共用同一个 `@vue/runtime-dom`，同时注册了编译器。
9. **练习和实验台只在浏览器里渲染**，服务端渲染出来的页面里只有占位。测试要等编辑器出现（`.ex[data-ex] .cm-content`）。组件在异步加载编辑器期间被卸载（用户马上换页）时，`Exercise` 要提前返回，不能再访问已卸载的元素。
10. **进度只存 localStorage。** 键的含义见第 6 节。不要做服务端同步。读进度要等挂载后（`ensureReady()` 之后 `ready` 为真），否则水合不一致。
11. **VitePress 的 `html` 有 `scroll-behavior: smooth`。** 测试里滚动到某个位置要用 `scrollIntoView({ behavior: 'instant' })`，否则平滑滚动没结束就被下一步打断。
12. **带锚点进入页面后版面会变。** 编辑器和实验台晚挂载会撑高上方内容，标题被挤下去。`AppEffects` 已处理；写测试时要等 3 秒左右再断言位置。
13. **中文搜索**用的是 VitePress 本地搜索，对没有空格的中文分词一般。
14. 本机 4173 端口可能被别的项目占用。测试和截图脚本自己选空闲端口。手动预览时用 `npm run preview -- --port 4791`。

## 10. 学习机制（不要破坏）

课程按学习科学设计，用户明确要求保留，和 hands-on-react 共用同一套规则（那边叫“课”，这边叫“章”）。完整的规则文字在 `CLAUDE.md` 的“学习机制（不要破坏）”一节。下表是每条规则对应的实现位置和测试。单元测试的细表见 `tests/unit/README.md`；浏览器测试在 `tests/site/mechanics.test.js`，括号里是测试组的开头几个字。

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
| 阶段测验：12 题（8 新 + 4 常规）、交卷后才显示解析、80% 通过 | `logic/stageCheck.ts` 的 `pickStageQuestions`、`isPass`；`StageCheck.vue`、`Question.vue`（defer） | `stageCheck.test.ts > 抽题`、`及格判定`；`cards.test.ts > 阶段题池`；mechanics：阶段测验 12 题、6 个阶段测验页 |
| 中途离开算未通过；未通过冷却 30 分钟；以最近一次为准；通过后清掉 `weak`；35 天后提示复测 | `logic/stageCheck.ts` 的 `settlePending`、`cooldownLeft`、`settleResult`、`needsRetest`、`stageStatus` | `stageCheck.test.ts`（中途离开、冷却、交卷后的记录、35 天、状态）；mechanics：中途离开、答对 10 题通过、答对 9 题不通过 |
| 章完成 = 自测全部答对 + 练习全部通过，自动标记 | `logic/completion.ts`，`learn.ts` 的 `completeIfMet`；`ChapterFoot.vue` | `completion.test.ts`；`progress.test.js`（掌握标准条和自动完成） |
| 卡片键 `章id#N` / `章id#cN` 不能变 | `cards.ts`（`scKey`、`checkKey`、`buildCatalog`） | `cards.test.ts > 卡片键规则`、`60 道阶段测验专用题…` |
| `logic/` 不碰 DOM、localStorage、`Date.now()`；不允许循环依赖 | `course/engine/logic/` | `purity.test.ts`、`cycles.test.ts` |
| 手机宽度无横向滚动 | `style.css` | mechanics：390px 宽下没有横向滚动 |

改规则时：先改 `CLAUDE.md` 这一节，再写会失败的测试，最后改实现。行为和规则文字不一致时，不要悄悄改其中一边，先搞清楚哪个是用户要的。
