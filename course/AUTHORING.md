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
  labs/27-quiz/           综合测验：Quiz.vue（界面）、questions.ts（60 道题）
  exercises/NN-id.ts      该章的练习（自动汇总到 exercises/index.ts）；types.ts 是类型
  AUTHORING.md            本文
  .vitepress/
    config.mts            站点配置、自定义容器、中文粗体修复、并行构建用的环境变量
    sidebar.mts           从 chapters/*.md 的 frontmatter 生成侧边栏
    course-data.mts       构建时从 chapters/*.md 抽数据，生成虚拟模块（见第 7 节）
    markdown-cjk.mts      markdown-it 插件：中文标点旁的 **粗体** 也能生效
    theme/
      index.ts            主题入口：布局插槽、全局注册 components/*.vue
      style.css           全部样式（含深色模式）
      components/*.vue    通用组件（全局注册，组件名 = 文件名）
      composables/        store.ts（localStorage）、progress.ts（进度、复习）、registry.ts、keys.ts、highlight.ts
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
- `id`：章的稳定编号（英文单词）。**自测答案、完成状态、复习记录的存储键都用它，创建后不能改。**
- `stage`：1 到 4（四个学习阶段）。`desc`：一句话说明。值里有 `: ` 之类 YAML 特殊字符时加双引号。
- `chapter`：章号。决定侧边栏里的先后、页面上的“第 N 章”小字，并且**只有有章号的页面计入学习进度**。第 26 章是综合实战，第 27 章是综合测验。
- 没有章号的页面（只有速查表 `cheat.md`）：文件名不带数字，不写 `chapter`，写 `order: 100`（侧边栏里排在同阶段所有有章号的页面之后）。它不计入进度，页面底部没有完成状态。
- 章内用到的示意图和实验台在章开头的 `<script setup>` 里导入。通用组件（`Sc` `Opt` `Goal` `Lab` `LabCode` `Figure` `Exercise` `Flow` `TabbedLab`）不用导入。

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
- 做完章里所有练习（通过，不是看过答案后通过）并答完自测，本章自动标记完成。

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
- 解析以“解析：”开头。答题后前面自动加“正确。”或“不对。”。
- 数据来源见第 7 节：构建时会从这里抽出题干、选项、解析，供综合测验的“待复习”和“随机 10 题”使用。所以**必须按上面的格式写**（`<Sc ...>`、`<Opt>…</Opt>` 一行一个、`<template #explain>`），否则抽不出来。

**保存规则（重要）**：答案保存在 `vue3deep:sc`，键是 `章id:序号`。序号是这道题在本章所有自测题里的位置（从 0 起，按页面顺序，不含“先猜”题）。所以**已有的题不能删除、调序，也不能改题干和答案，只能在末尾追加**。`Goal` 的 `checks="sc:N"` 用同一个序号。

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

## 5. 新增内容的步骤

### 新增一章

1. 新建 `chapters/NN-id.md`（NN 为两位章号），写好 frontmatter（第 2 节）。章号要和已有章连续；中间插入会让后面的章号都变，只在末尾追加更稳妥。
2. 按第 3、4 节写正文。侧边栏、首页的阶段卡片、进度统计、复习都从 frontmatter 自动生成，**不用改任何共享文件**。例外：首页的路线说明文字（“25 章正文……”）是写死的，章数变了要手动改 `theme/components/CourseHome.vue`。
3. 需要时新增 `exercises/NN-id.ts`、`labs/NN-id/*.vue`、`figures/NN-id/*.vue`，和测试数据 `tests/site/labs/NN-id.js`（每个 `<Lab id>` 都要有一项，见第 8 节）。
4. 跑该章测试（第 8 节）。

### 新增练习 / 实验台 / 示意图

按 4.10、4.12、4.9。新增后：练习要在章里放 `<Exercise id>`，并在合适的 `<Goal checks>` 里加 `ex:id`；实验台要补 `tests/site/labs/NN-id.js` 里的一项。

### 新增自测题

只能在这一章已有自测题的**末尾**追加（4.11），不能插在中间。追加后，如果有目标要覆盖它，在 `<Goal checks>` 里加 `sc:N`。不用改别的：综合测验的复习题库在构建时重新抽取。

### 新增综合测验题

在 `labs/27-quiz/questions.ts` 的 `Q` 末尾追加一项：`[题目, 选项（第一个是正确答案，显示时按题号固定打乱）, 解析, 章 id, 阶段 1-4, 代码（可选）]`。答案按题号保存，只能追加。

## 6. 进度和存储

进度只存在浏览器的 localStorage，键前缀 `vue3deep:`。读写只经过 `theme/composables/store.ts` 的 `store`。没有服务端。

| 键 | 内容 | 谁写 |
|---|---|---|
| `sc` | 自测答案 `{ "<章id>:<序号>": 选项序号, "p:<实验台id>": 选项序号 }` | `Sc` |
| `guess` | 实验台“先猜”的猜测（还没核对） | `Sc` |
| `ex` | 练习通过状态 `{ <练习id>: true \| 'sol' }`，`sol` 表示看过答案后通过 | `Exercise` |
| `exSol` | 看过答案的练习 | `Exercise` |
| `ex:<id>` | 练习草稿 `{ tpl, js }` | `Exercise` |
| `quiz3` | 综合测验答案 `{ "<题号>": 选项在题库里的序号 }`，0 是正确答案 | `Quiz` |
| `done` / `doneAt` | 已完成的章 `{ <章id>: true }`，和第一次完成的时间 | `progress.ts`、`ChapterFoot` |
| `revAt` | 复习记录 `{ <章id>: { t: 上次复习时间, n: 连续成功次数 } }` | `progress.ts`（`markReviewed`） |
| `revLast` | 上次复习抽过的题 id，下次优先换别的 | `Quiz` |
| `last` | 上次阅读 `{ path, anchor, h, t }`：章路径、小节锚点（标题的 id）、小节标题、时间 | `AppEffects` |

规则：

- **自动完成**：一章的自测全部答过、练习全部通过（`ex` 的值是 `true`，不含 `sol`），就标记完成。在答题或练习通过的那一刻检查（`autoDone`）。没有自测题的章不会自动完成。手动取消完成后，不会被自动标回。
- **间隔复习**：标记完成时记 `doneAt`。第 1 次复习在完成后 2 天，第 2 次在上次复习后 7 天，之后每次隔 30 天（`GAPS = [2, 7, 30]`）。复习时一章的题全对：`n + 1`；有错：`n = 0`，2 天后再复习。
- **阅读位置**：进入一章时记下这一章；用户滚动停下后记下读到的小节。首页“继续学习”按钮回到那里。带锚点进入一章时，编辑器和实验台陆续挂载会把版面撑高，`AppEffects` 在 5 秒内持续把目标拉回顶栏下方（用户一动就停）。
- 页面挂载后才读 localStorage（`storeReady`），服务端渲染和首次渲染一律用默认值，避免水合不一致。

## 7. 自测题数据怎么传到别的页面

综合测验的“待复习”“随机 10 题”要用各章自测题的题干、选项、解析，进度功能要知道每章有几道自测、哪些练习。这些信息只存在于各章 `.md`，所以在**构建时**抽取：

- `.vitepress/course-data.mts` 是一个 Vite 插件，提供两个虚拟模块：
  - `virtual:course-meta`：每章的元数据（id、文件名、标题、阶段、章号、自测题数、练习 id 列表）。很小，章页面都会载入（自动完成、侧边栏标记、首页用）。
  - `virtual:course-selfchecks`：每道自测题的键（`章id:序号`）、正确选项、渲染成 HTML 的题干、选项、解析。只有综合测验页载入。
- 抽取用正则匹配 `<Sc …>…</Sc>`（跳过带 `predict` 的先猜题），序号规则和 `Sc` 组件一致。题干和解析用 VitePress 的 Markdown 渲染器渲染，所以代码块有高亮。
- 构建时总是最新的。开发服务器里改了自测题后，如果综合测验页的复习题库没有更新，重启 `npm run dev`。
- 测试 `tests/site/progress.test.js` 的第一项检查：每一章抽出的自测题数、练习 id 和页面上实际渲染的一致。格式写错时它会报出来。

## 8. 测试

```bash
npm run build                 # 构建全站（输出 course/.vitepress/dist）
npm test                      # = npm run test:site：先构建，再依次跑下面三个文件（约 6 分钟）

node tests/site/exercises.test.js 03-refs 04-computed   # 只测指定章：自己构建这些章到临时目录，端口自动选
node tests/site/exercises.test.js                        # 全部章，用已构建的 dist
node tests/site/progress.test.js                         # 跨章功能，用已构建的 dist
node tests/site/quiz.test.js                             # 综合测验，用已构建的 dist
node scripts/shot.mjs 03-refs                            # 截这一章的浅色和深色整页图（展开所有折叠块），打印图片路径
```

本机 shell 如果设了 HTTP 代理，访问 localhost 的命令前加 `NO_PROXY=localhost,127.0.0.1`。

三个测试文件：

- `exercises.test.js`（逐章）：每道练习（初始不通过、答案通过、每个 `wrong` 不通过）；编辑器能输入；自测点选后刷新仍在、目标打勾；每个实验台（先猜之前关着，选完后打开，做一次有代表性的操作并断言）；章里每个 `<Lab id>` 都有测试数据；控制台无报错；练习 id 不重复。
- `progress.test.js`：章元数据和页面一致；首页（路线说明、四个阶段、27 章、状态）；自动完成（答完最后一道自测、通过最后一道练习、`sol` 不算）；手动标记和取消；继续学习；间隔复习（2/7/30 天、到期提示、待复习标签页出题并记复习时间）；类比和深入开关；示意图放大。
- `quiz.test.js`：60 题、按阶段筛选、点选出解析、刷新后记录仍在、只看错题、重新作答、随机 10 题（含各章自测）、待复习。

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
10. **进度只存 localStorage。** 键的含义见第 6 节。不要做服务端同步。读存储要等 `storeReady`，否则水合不一致。
11. **VitePress 的 `html` 有 `scroll-behavior: smooth`。** 测试里滚动到某个位置要用 `scrollIntoView({ behavior: 'instant' })`，否则平滑滚动没结束就被下一步打断。
12. **带锚点进入页面后版面会变。** 编辑器和实验台晚挂载会撑高上方内容，标题被挤下去。`AppEffects` 已处理；写测试时要等 3 秒左右再断言位置。
13. **中文搜索**用的是 VitePress 本地搜索，对没有空格的中文分词一般。
14. 本机 4173 端口可能被别的项目占用。测试和截图脚本自己选空闲端口。手动预览时用 `npm run preview -- --port 4791`。
