# 写作约定：把旧章节迁到 VitePress

本文给迁移章节的人（或 agent）用。只读本文就能迁一章。第 1 章（`chapters/01-first.md`）是完整样例，不确定时照着它写。

铁律：

1. 正文文字逐字迁移。不润色，不改写，不增删。只改标记形式（HTML 变 Markdown）。
2. 练习的数据（`tpl js solTpl solJs hints check wrong`）原样复用。不改题目。
3. 自测题已有的只能在末尾追加。不能删除、调序、改题干和答案。
4. 不碰旧文件：`vue3-course.html`、`server.js`、`cm.min.js`、`vendor/`、`tests/` 下旧测试。迁完全部章节后才会删。

## 1. 目录约定

```
course/
  .vitepress/
    config.mts            站点配置、侧边栏、自定义容器（注意扩展名是 .mts）
    theme/
      index.ts            扩展默认主题，自动全局注册 components/*.vue
      style.css           旧色板和课程块样式
      components/         通用组件：Exercise Sc Opt Goal Lab LabCode Figure ChapterHead
      composables/        store.ts（localStorage）、registry.ts、keys.ts
  index.md                首页
  chapters/NN-id.md       一章一个文件。NN = 两位章号，id = 旧的 section id
  figures/NN-id/*.vue     示意图，每张一个 SFC，只含 template
  labs/NN-id/*.vue        实验台，每个一个 SFC（一个实验台含多个标签页时，每页再拆一个小 SFC）
  exercises/NN-id.ts      该章的练习；exercises/index.ts 汇总；exercises/types.ts 是类型
  AUTHORING.md            本文（不会生成页面）
```

命令：

- `npm run dev`：开发服务器。
- `npm run build`：构建到 `course/.vitepress/dist`。
- `npm run test:site`：先构建，再用 Playwright 测每章的练习、自测、控制台报错。

## 2. 章节文件

文件开头是 frontmatter，然后是一级标题。标题文字必须等于 `title`。

```md
---
title: 第一个 Vue 应用
id: first
stage: 1
chapter: 1
desc: 声明式渲染、createApp、单文件组件
---

<script setup>
import ImperativeVsDeclarative from '../figures/01-first/ImperativeVsDeclarative.vue'
</script>

# 第一个 Vue 应用
```

- `id`：旧的 section id。自测答案的存储键用它，**不能改**。
- `stage`：1 到 4。`chapter`：章号。`desc`：旧的 data-desc。
- 页面顶部的“第 N 章”小字由 `chapter` 自动生成。
- 章内用到的示意图和实验台，在 `<script setup>` 里导入。通用组件（`Sc` `Opt` `Goal` `Lab` `LabCode` `Figure` `Exercise`）不用导入。实验台 SFC 里也能直接用 `<LabCode>`。
- 旧的“下一章”链接不用迁。VitePress 自动生成上一章和下一章。

章内块的顺序（和旧版相同）：

1. 目标（`::: goals`）
2. 阅读时间（`::: rt`）
3. 类比（`::: analogy`）
4. 本章术语（`::: terms`）
5. 为什么需要它（`::: why`）
6. 小节 `### N.M 标题`，每个小节里有正文、代码、图、实验台、练习、深入块
7. 注意（`::: pitfalls`）
8. 自测（`::: selfcheck`）
9. 小结（`::: summary`）

## 3. 每种写法的完整示例

### 3.1 小节标题

```md
### 1.1 命令式和声明式
```

- 必须写成 `N.M 空格 标题`。编号会自动变成绿色的小编号。
- 用三级标题 `###`。小节不能放进 `::: deep` 里。

### 3.2 目标

```md
::: goals
<Goal checks="sc:2">说明命令式和声明式的区别。</Goal>
<Goal checks="sc:0,sc:1,ex:counter,ex:firstFill">用 `createApp` 和 `ref` 写一个计数器。</Goal>
<Goal checks="sc:3">说明 `.vue` 文件的三个部分。</Goal>

:::
```

- `checks` 里：`sc:N` 是本章第 N 道自测（从 0 起，不含“先猜”题）。`ex:id` 是练习 id。
- “自测 N 题 · 练习 M 道”标签由组件自动算。不要手写。
- 目标对应的题全部答对、练习通过（不是“看过答案后通过”）后，目标自动打勾。
- 结尾的 `:::` 前面要有空行（见第 6 节）。
- 不要给目标挂“回顾”题。

### 3.3 阅读时间、类比、术语、为什么需要它

```md
::: rt
阅读主线约 7 分钟，深入内容约 2 分钟（可选）。另外留时间做练习和自测。
:::

::: analogy
原生 JS 写界面像**亲手搬家具**：每次状态变了，你都要找到 DOM 节点。

Vue 像**给装修队一张图纸**：你只描述“数据是这样时，页面长这样”。
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

- 标题（类比、本章术语、为什么需要它）由容器自动加。不要自己写。
- 术语用定义列表：第一行是术语，下一行以 `: ` 开头写解释。术语之间空一行。
- 旧的 `<dl><dt><dd>` 直接改成这个写法。

### 3.4 注意、小结

```md
::: pitfalls
1. 在 JavaScript 中不要写 `count++`。写 `count.value++`。
2. 在 `setup()` 中，用 `return` 返回模板需要的数据。
:::

::: summary
- 你修改数据。Vue 更新页面。
- `ref(初始值)` 创建响应式数据。
:::
```

注意用有序列表，小结用无序列表。小结前面的对勾由样式生成。

### 3.5 深入（默认折叠）

```md
::: deep mount 之后发生了什么
正文、列表、代码块、表格都可以放在这里。

```js
// 代码块
```
:::
```

- 容器名后面的文字是标题。“深入”和“可选”标记自动加。
- 深入块里不要放 `###` 小节标题。
- 容器里面有围栏代码块时，容器的结尾 `:::` 单独占一行。

### 3.5.1 想一想（默认折叠的小问答）

```md
::: think 可以在 {{ }} 中写 if 语句吗？
不可以。插值只接受一个表达式。`{{ ok ? '是' : '否' }}` 是正确的。
:::
```

- 对应旧的 `<details class="think"><summary>问题</summary><div>回答</div></details>`。容器名后面的文字是问题，“想一想”标记自动加。
- 回答里可以写行内 Markdown 和多段文字。和 `deep` 一样，不要再套别的容器，不要放 `###`。
- 它不是“深入”：不计入深入块数量，样式也不同。数量对照时分开数。

### 3.6 代码块

````md
```js
const count = ref(0)
```
````

- 全部用围栏代码块，并标语言：`js` `vue` `html` `ts` `bash`。
- 旧的 `<\/script>` 改回 `</script>`。旧的 `<\!--` 改回 `<!--`。
- 围栏代码里的 `{{ }}` 不会被 Vue 处理，直接写。
- 模板片段和脚本混写的块：以模板为主用 `vue`，以脚本为主用 `js`。
- 旧的 `pre.sc-code`（自测题里的代码）也改成围栏代码块。
- 只有模板标签的片段用 `html`；模板和函数混写（旧版常见的“模板 + 空行 + function”）用 `vue`。语言只影响高亮，选错不会报错。
- 数量对照时，旧版的 `<script type="text/x-code">` 加 `pre.sc-code` 的总数，等于新版围栏代码块的总数。

### 3.7 左右对照的代码

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

- 外层 `pair` 用四个冒号，内层 `col` 用三个冒号。外层冒号必须比内层多，否则嵌套会出错。
- `col` 后面的文字是代码上方的说明（旧的 `.cap`）。
- 屏宽不够时，两栏自动上下排。

### 3.7.1 表格

用普通 Markdown 表格。单元格里的代码用反引号。

### 3.8 示意图

1. 把旧的内联 SVG 复制到 `figures/NN-id/名字.vue`，放进 `<template>`。文件名用大驼峰英文。
2. 去掉 `<figure>` 和 `<figcaption>`，只留 `<svg>…</svg>`。
3. 在章节的 `<script setup>` 里导入。
4. 正文里这样用：

```md
<Figure caption="命令式代码自己修改每个节点。声明式代码只修改数据，Vue 按模板更新 DOM。">
<ImperativeVsDeclarative />
</Figure>
```

- `caption` 是旧的 `<figcaption>` 文字。它是普通属性，只能放纯文字。旧的 `<figcaption>` 里如果有 `<code>`，迁移后只剩文字，没有代码样式（这是已知的小损失）。
- 这三行之间不要有空行（见第 6 节）。
- SVG 里的颜色用 `var(--muted)`、`var(--ink)`、`var(--accent)`、`var(--accent-soft)`、`var(--surface)` 等。浅色和深色模式都有定义。不要写死颜色。
- **SVG 里的 `{{ }}` 会被 Vue 当成插值。** 图里常有这样的文字（例如 `<text>{{ name }}</text>`）。给这个 `<text>` 加 `v-pre`：`<text v-pre>{{ name }}</text>`。围栏代码和行内代码已自动处理，SFC 里的标签不会。
- marker 的 `id` 在整页内不能重复。沿用旧的 `章id-名字`，例如 `first-arr`。

### 3.9 练习

```md
<Exercise id="counter" />
```

- 放在旧的 `<div class="ex" data-ex="counter"></div>` 的位置，顺序也一样。
- 练习数据在 `exercises/NN-id.ts`。见第 5 节。

### 3.10 自测题

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

<Sc :a="2">

第二道题的题干。

<Opt>`count++`</Opt>
<Opt>`count = count + 1`</Opt>
<Opt>`count.value++`</Opt>

<template #explain>

解析：……

</template>
</Sc>

:::
```

规则：

- `a` 是正确选项的序号，从 0 起。
- 题干是 `<Sc>` 后的第一段（可以有多段和代码块）。选项用 `<Opt>`，每个一行，写在一起。
- `<Sc :a="0">` 后面、`<Opt>` 前后、`<template #explain>` 前后、`</template>` 后面，都要有空行。`</template>` 和 `</Sc>` 之间不要空行。
- `<Opt>` 里可以写行内 Markdown，例如反引号。`<Opt>` 必须单独占行首，一行一个。
- 解析文字以“解析：”开头。答题后，前面自动加“正确。”或“不对。”。
- `<Sc>` 之间空一行。最后一个 `</Sc>` 和结尾 `:::` 之间也要空一行。

**保存规则（重要）**：

- 答案保存在 localStorage 的 `vue3deep:sc`，键是 `章id:序号`。序号是这道题在本章所有自测题里的位置（从 0 起，按页面顺序，不含“先猜”题）。
- 所以：**已有的题不能删除、调序，也不能改题干和答案。只能在末尾追加新题。**
- `Goal` 的 `checks="sc:N"` 用同一个序号。
- 实验台里的“先猜”题的键是 `p:实验台id`，不受这条限制。

### 3.11 实验台外壳

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

- `id`：旧的 `.lab-body` 的 id，也是“先猜”答案的存储键（`p:id`）。必须唯一，不能改。
- `title`：旧的 `.lab-title` 文字。`note`：旧的 `<small>` 文字。
- `#predict` 插槽放一道 `<Sc predict>`。没有这个插槽，实验台一开始就是打开的。
- 有“先猜”题时：猜之前实验台正文不显示。选择后实验台打开，出现“核对我的猜测”按钮，点它才显示答案。也可以点“跳过，直接打开实验台”。
- 默认插槽放实验台组件。它只在浏览器里渲染，并且接近视口时才挂载。实验台组件不用自己处理这两点。
- 实验台组件里可以直接 `import { ref } from 'vue'`，用普通的 SFC 写法（`<script setup>` + `<template>`）。需要运行时编译模板字符串时，才用带编译器的构建（见 Exercise）。
- 实验台里的通用控件类名已在 `style.css` 里：`.row` `.b`（含 `.pri` `.on`）`.cap` `.cols` `.box` `.t`（`input.t` `select.t`）`.ctl` `.tabs` `.log` `.pill` `.domview` `pre.code`。还没搬的有 `.kv` `.flash` `.task` 等。用到时，从旧 CSS（`vue3-course.html` 第 5 到 429 行）搬到 `style.css`，选择器前加 `.vp-doc `，并把它加进这一条。
- 实验台里展示一段代码（旧版的 `<pre class="code" v-html="hl(code)">`）用 `<LabCode :code="字符串" />`。代码是动态的（随开关变化）或属于某个标签页时用它；章节正文里的静态代码仍用围栏代码块。
- **多标签页实验台**（旧版 `TABS = [{name, tip, code, comp}]`）：每个标签页的 `comp` 拆成一个独立的小 SFC，放在同一个 `labs/NN-id/` 目录，文件名用统一前缀（第 2 章用 `Dir*.vue`）。再写一个外壳 SFC，里面保留 `TABS` 数组（`name` `tip` `code` 和导入的组件），用 `<component :is="TABS[i].comp" :key="i" />` 切换。`code` 字段的字符串原样沿用。
- **读 DOM 的实验台**（旧版里“渲染出的属性”“当前 HTML”）：用 `ref` 拿元素，`onMounted` 和 `watch(…, { flush: 'post' })` 里读 `getAttribute` 或 `innerHTML`。要在 `<div>` 里显示多行文字时，写成表达式 `{{ 'class="' + cls + '"\nstyle="' + sty + '"' }}`。模板里直接换行会被压成一个空格。
- **指令钩子的日志不能用响应式数据。** 钩子在渲染中运行，钩子里改响应式数据会触发新的渲染，新的渲染又运行钩子，形成死循环。旧版用 `document.createElement` 直接往 DOM 里加日志，SFC 里照做：模板里放一个空的 `<div ref="logRef">`，钩子里用普通函数往里 `prepend`。
- 自定义指令在 `<script setup>` 里写成 `const vXxx = {…}`，模板里就是 `v-xxx`，不用注册。
- **实验台放在 `::: deep` 里时**（第 2 章的 `demo-directive`），`<Lab>` 的结束标签和 `:::` 之间要空一行。浏览器里，折叠的深入块里实验台不会挂载，展开后才挂载。测试要先点开深入块（见第 6 节）。

## 4. 从旧 HTML 到新写法对照表

| 旧 | 新 |
|---|---|
| `<section class="ch" id data-stage data-title data-desc>` | frontmatter：`id stage title desc`，加 `chapter` |
| `<div class="kicker">第 N 章</div><h2>标题</h2>` | `# 标题`（kicker 自动生成） |
| `<div class="goal"><ul><li data-checks="…">文字 <span class="gtag">…</span></li></ul></div>` | `::: goals` + `<Goal checks="…">文字</Goal>`，标签自动算 |
| `<div class="rt">` | `::: rt` |
| `<div class="analogy">` | `::: analogy` |
| `<div class="terms"><dl>` | `::: terms` + 定义列表 |
| `<div class="why">` | `::: why` |
| `<h3><span class="step">N.M</span>标题</h3>` | `### N.M 标题` |
| `<p>` `<code>` `<b>` `<ol>` `<ul>` | 普通段落、反引号、`**粗体**`、列表 |
| `<script type="text/x-code">` | 围栏代码块，标语言 |
| `<div class="code-pair">` | `:::: pair` + `::: col 说明` |
| `<figure class="fig"><svg>…</svg><figcaption>` | `figures/…/X.vue` + `<Figure caption>` |
| `<div class="ex" data-ex="id">` | `<Exercise id="id" />` |
| `<div class="lab gated">` + `.sc.predict` + `.lab-body` | `<Lab>` + `#predict` + 实验台 SFC |
| `<details class="deep"><summary>…` | `::: deep 标题` |
| `<div class="tbl-wrap"><table class="t">` | Markdown 表格 |
| `<div class="pitfalls"><ol>` | `::: pitfalls` + 有序列表 |
| `<div class="selfcheck"><div class="sc" data-a>` | `::: selfcheck` + `<Sc :a>` |
| `.sc-q` / `pre.sc-code` / `button.sc-o` / `.sc-x` | 题干段落 / 围栏代码 / `<Opt>` / `#explain` |
| `<div class="summary"><ul>` | `::: summary` + 无序列表 |
| `<a class="nextch">` | 不迁（自动生成） |
| `<details class="think"><summary>问<div>答` | `::: think 问`（见 3.5.1） |
| `<pre class="code" v-html="hl(…)">`（实验台里） | `<LabCode :code="…" />` |
| `.note` `.steps-flow` 等其他块 | 本步未处理。遇到时先在 `style.css` 里加样式，再在 `config.mts` 里加容器，并更新本文。做法见第 2 章的 `think`：配置里 `md.use(container, 名字, { render })`，样式选择器加 `.vp-doc ` 前缀 |

## 5. 新增练习、实验台、示意图

### 跨章链接

旧文字里的“第 8 章”如果是链接（`<a href="#directives">`），迁成 `[第 8 章](/chapters/08-directives)`。文件名 = 章号两位 + `-` + 旧的 section id。目标章还没迁时，这是死链（站点配置了 `ignoreDeadLinks`，不会报错），等那一章迁完就通了。不是链接的“第 4 章”“第 4.1 节”保持纯文字。

### 新增练习

1. 打开旧版里这道练习的定义：`EX.<id> = {…}`（`vue3-course.html` 约 9947 行起和 11918 行起），再找 `HINTS[id]`（约 10603 行起）。
2. 在 `exercises/NN-id.ts` 里导出一个同名常量，类型是 `Exercise`：

```ts
import type { Exercise } from './types'

export const counter: Exercise = {
  title: '做一个计数器',
  ch: 1,
  task: '按钮显示“点了 N 次”。每次点击，N 加 1。只修改模板。',
  tpl: '<button>点我</button>',
  js: 'const count = ref(0)\n\nreturn { count }',
  solTpl: '<button @click="count++">点了 {{ count }} 次</button>',
  hints: ['提示 1……', '提示 2……', '答案'],
  async check(T) {
    const b = T.$('button')
    T.ok(!!b, '页面上有一个按钮')
    // ……
  },
  wrong: [{ tpl: '…', why: '…' }]
}
```

3. 字段和旧版完全一致。字符串原样复制。
4. 旧版的提示可能分散在 `hint`、`hints`、`HINTS[id]` 三处。优先级是 `ex.hints || HINTS[id] || [ex.hint]`。迁移时只留一个 `hints` 数组，内容取优先级最高的那个。不要写 `hint` 和 `HINTS`。
5. 新章第一次迁时，在 `exercises/index.ts` 里加两行：`import * as ch02 from './02-xxx'` 和 `...ch02`。
6. 判题里如果旧代码用了全局 `Vue.nextTick`，在文件顶部写 `import { nextTick } from 'vue'`，然后改用 `nextTick`。不要用全局变量。（`T.click` 已经会等 nextTick。）
7. 练习脚本里可直接用的名字：`ref reactive computed watch watchEffect toRefs toRef shallowRef nextTick onMounted onUnmounted provide inject`。
8. 每道新练习至少写 1 个 `wrong`（来自真实误解的错误解法）。迁移旧练习时，旧版有就保留，没有不补。
9. 在章节里加 `<Exercise id="…" />`，并确认 `Goal` 的 `checks` 有 `ex:id`。
10. `npm run test:site`：测试会自动测每道练习：初始代码不通过，答案通过，每个 `wrong` 不通过。

### 新增示意图

见 3.8。每张图一个 SFC，放在 `figures/NN-id/`。

### 新增实验台

1. 把旧版实验台的挂载函数（页面底部脚本里，用 `#demo-xxx` 找到）改写成一个 SFC：`labs/NN-id/名字.vue`。逻辑不变，只把命令式 DOM 操作改成模板。
2. 在章节里用 `<Lab>` 包住（见 3.11）。
3. 把旧版的“先猜”题搬进 `#predict` 插槽。`id` 沿用旧的 `data-lab`。

### 把一章加进侧边栏

1. 打开 `course/.vitepress/config.mts`，找到 `themeConfig.sidebar`。
2. 在对应阶段（`stage`）的 `items` 末尾加一行：

```ts
{ text: '2 模板语法与指令', link: '/chapters/02-template' }
```

3. 顶部导航 `nav` 只放固定入口（首页、课程）。迁章节时不用改它，章节只加进侧边栏。
4. 上一章和下一章按侧边栏顺序自动生成。

## 6. 迁一章的步骤清单

1. 读旧章节：`vue3-course.html` 里 `<section class="ch" id="…">` 到 `</section>`。按行号范围读，不要整文件读。
2. 建 `chapters/NN-id.md`，写 frontmatter 和 `# 标题`。
3. 按顺序迁：目标、阅读时间、类比、术语、为什么、各小节、注意、自测、小结。一块一块对着旧文字迁。
4. 迁代码块，还原转义，标语言。
5. 迁示意图到 `figures/`，正文里用 `<Figure>`。
6. 迁练习数据到 `exercises/NN-id.ts`，并更新 `exercises/index.ts`。
7. 迁实验台（如果有）到 `labs/`，用 `<Lab>`。
8. 把章加进侧边栏。
9. 运行 `npm run build`。没有报错。
10. 运行 `npm run test:site`。全部通过。
11. 数量对照：小节数、代码块数（旧版 `text/x-code` 加 `pre.sc-code`）、深入块数、想一想数、自测题数（含“先猜”）、练习数、实验台数、示意图数、表格数，和旧版一致。逐段对照文字，没有丢段落。（可以写个小脚本：旧文字去掉标签、新页面 HTML 去掉标签，去掉所有空白后做 diff，只应剩下代码语言标签、“跳过，直接打开实验台”这类界面文字，和自测解析——解析在答题前不渲染。）
12. 用 Playwright 给页面截图，浅色和深色各一张，看一遍版面。深色用 `browser.newContext({ colorScheme: 'dark' })`，站点默认跟随系统。实验台要先点“先猜”的一项才会出现；在深入块里的要先点开块。
12.5. 给每个实验台在 `tests/site/exercises.test.js` 的 `LABS` 里加一项：`id`（Lab 的 id）、`pick`（“先猜”点哪一项）、`run(p, body, ok)`（做一次有代表性的操作并断言）。测试自动检查：答题前实验台关着、选完后打开、没有控制台报错。章节列表是自动读 `chapters/` 目录的，不用改。
13. 提交。提交信息用中文。只 `git add` 动过的路径。

## 7. 踩过的坑

1. **`{{ }}` 会被 Vue 当成插值。** 本站已处理：正文文字里的 `{{` 会自动转成实体，行内代码自动加 `v-pre`，围栏代码本来就安全。所以正文里直接写 `{{ count }}` 即可。但是，你自己写的 HTML 标签（例如 `<span>{{ x }}</span>`）里的 `{{ }}` 不会被处理。要用时给标签加 `v-pre`。
2. **行首的组件标签会开一个“HTML 块”，到下一个空行才结束。** 块里的 Markdown 不会被解析。所以：
   - `<Sc>`、`<Figure>`、`<Lab>`、`<Exercise>`、`<template>` 这类块级标签，后面如果要写 Markdown，必须空一行。
   - `<Figure>` 里的三行不要空行，否则图会被拆开。
   - 块后面紧跟 `:::` 时，中间要空一行。否则 `:::` 会被当成块里的文字，容器不结束。
   - `<Goal>` 和 `<Opt>` 是例外：它们已被配置成行内组件，行内的反引号和粗体照常解析，所以可以一行一个、连续写。
3. **`**粗体**` 后面紧跟汉字会失败。** 例如 `**场景：……。**后台页面` 不会变粗，星号会原样显示。原因：结尾的 `**` 前面是句号，后面是汉字。遇到时改用 `<b>场景：……。</b>`。文字不变。
3.5. **`**粗体**` 前面紧跟汉字、里面又以中文引号开头也会失败。** 例如 `的**“小纸条”**，告诉` 不会变粗：开头的 `**` 前面是汉字、后面是引号，不算“左侧可粘连”。同样改用 `<b>“小纸条”</b>`。
4. **代码块外的 `<script>` 标签。** VitePress 会把行首的 `<script>` 当成页面脚本抽走。正文里讲 `<script setup>` 时，要么放进围栏代码块，要么放进行内代码（反引号）。只有每章开头那一个 `<script setup>` 是真的脚本。
4.5. **正文文字里不要用 HTML 实体。** `&lt;p&gt;` 会被站点的文字规则再转义一次，页面上显示成字面的 `&lt;p&gt;`。旧文字里的 `&lt;p&gt;` 改写成行内代码 `` `<p>` ``（只多了代码样式，文字不变）。`Exercise` 的 `task` 字符串是 HTML，里面的 `&lt;` 仍然要保留。
5. **围栏代码块里的 `</script>` 不用转义。** 旧的 `<\/script>` 和 `<\!--` 要改回正常写法。
6. **容器嵌套要用更多的冒号。** `pair` 里套 `col`，外层四个冒号，内层三个。`deep` 里不要再套别的容器。
7. **`::: deep` 的标题里可以写行内 Markdown**（反引号等）。但不要写 `{{ }}` 以外的特殊字符。
8. **配置文件是 `config.mts`，不是 `config.ts`。** 项目的 `package.json` 没有 `"type": "module"`（旧的 `server.js` 和 `tests/` 要用 CommonJS），VitePress 配置必须是 ESM，所以用 `.mts`。不要给 `package.json` 加 `"type": "module"`。
9. **不要给站点的 `vue` 做 alias。** 练习需要运行时编译模板，Exercise 组件挂载后会动态 `import('vue/dist/vue.esm-bundler.js')`。这个构建和站点共用同一个 `@vue/runtime-dom`，同时注册了编译器。不要改这个做法。
10. **练习组件只在浏览器里渲染。** 服务端渲染出来的页面里只有占位。测试要等编辑器出现（`.ex[data-ex]`）。
11. **进度只存 localStorage**，键前缀 `vue3deep:`。键的含义见 `composables/store.ts` 开头的注释。不要做服务端同步。
12. **中文搜索**用的是 VitePress 本地搜索，对没有空格的中文分词一般。第 1 章没有处理。
13. 本机 4173 端口可能被别的项目占用。`test:site` 自己选空闲端口，不受影响。手动 `npm run preview` 时用 `-- --port 4791`。
