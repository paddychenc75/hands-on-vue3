# 写作约定：把旧章节迁到 VitePress

本文是迁移章节的人（或 agent）的唯一依据。只读本文就能迁一章。第 1、2 章（`chapters/01-first.md`、`02-template.md`）是完整样例，不确定时照着写。

多个 agent 会同时各迁几章。所以：**迁一章只新增这一章自己的文件，不改任何共享文件**（见第 2 节）。

铁律：

1. 正文文字逐字迁移。不润色，不改写，不增删。只改标记形式（HTML 变 Markdown）。
2. 练习的数据（`tpl js solTpl solJs hints check wrong`）原样复用。不改题目。
3. 自测题已有的只能在末尾追加。不能删除、调序、改题干和答案。
4. 不碰旧文件：`vue3-course.html`、`server.js`、`cm.min.js`、`vendor/`、`tests/` 下旧测试（`tests/site/` 除外）、根目录 `CLAUDE.md`、`README.md`。迁完全部章节后才会删。
5. 5199 端口有给用户看的开发服务器，不要关，不要占。本机 shell 设了 HTTP 代理，访问 localhost 时加 `NO_PROXY=localhost,127.0.0.1`。

## 1. 迁一章的流程

下面的 `NN-id` 是新文件名（章号两位 + 旧 section id，例如 `03-refs`），`id` 是旧 section id（例如 `refs`）。`node scripts/html2md.mjs --list` 列出全部 id 和章号。

1. **跑转换脚本**，得到初稿：
   ```bash
   node scripts/html2md.mjs refs               # 生成 course/chapters/03-refs.md 和 course/figures/03-refs/*.vue
   node scripts/html2md.mjs --exercises refs   # 生成 course/exercises/03-refs.ts
   ```
   文件已存在时不覆盖，要重新生成加 `--force`（会覆盖你的修改，先确认）。脚本的标准输出是本章清单：各种块的数量、示意图、**待人工改写的实验台**（附旧 HTML 和旧脚本的行号）、**未识别结构**（脚本原样保留成 HTML，要人工处理，不会悄悄丢掉）、练习的提示和注意。
2. **通读初稿**，对照旧 `<section>`（按行号范围读，不要整文件读 `vue3-course.html`）。脚本做了机械转换，要看的地方：
   - 示意图文件名是 `Fig1…` 加几个英文词，可以改成好懂的名字（同时改 `.md` 里的导入和标签）。
   - 代码块语言是猜的，选错只影响高亮，顺手改对。
   - 未识别结构按第 4 节处理。
3. **人工改写实验台**：每个 `<LabTodo …/>` 换成实验台 SFC（第 3.11 节、第 5 节）。旧脚本里的挂载代码行号在清单里。改写后删掉 `<LabTodo>`。给每个实验台写测试数据 `tests/site/labs/NN-id.js`（第 6 节）。
4. **核对练习文件** `exercises/NN-id.ts`：脚本把字段原样搬来，把 `hint`/`HINTS` 合并成 `hints` 数组。要看：清单里的“注意”；`check` 里原来的 `Vue.nextTick` 等已改成从 `'vue'` 导入；旧脚本在对象外面补充的字段（`EX.x.solJs = …`、`EX.x.lazy = true`）原样放在导出之后。章里的每个 `<Exercise id>` 和 `Goal` 的 `ex:id` 要对得上。
5. **跑该章测试**（只构建这一章，输出到独立临时目录，自动选端口）：
   ```bash
   NO_PROXY=localhost,127.0.0.1 node tests/site/exercises.test.js 03-refs
   ```
   可以同时写多章：`… 03-refs 04-computed`。测的内容：每道练习（初始不通过、答案通过、每个 `wrong` 不通过）、自测点选后刷新仍在、目标打勾、实验台、控制台无报错、练习 id 不重复、章里每个实验台都有测试数据。
6. **跑对照脚本**（只构建这一章；没有输出差异、退出码 0 才算正文无丢失）：
   ```bash
   node scripts/compare.mjs refs --build
   ```
   它比较旧 `<section>` 和构建后的页面：数量（小节、代码块、深入块、想一想、自测、先猜、练习、实验台、示意图、表格、目标、术语）、文字（两边去标签去空白后逐段 diff）、自测解析（对照 `.md`）、残留标记（字面的 `**`、`&lt;`、`:::`、`TODO`、没改写的 `<LabTodo>`）。已排除的界面性差异见脚本开头。
7. **截图自查**：
   ```bash
   node scripts/shot.mjs 03-refs
   ```
   输出浅色和深色两张整页图的路径，用 Read 工具看。脚本已展开深入块、点开实验台的“先猜”。图很高时看缩略图不够，需要细看就用 Playwright 自己截一段。
8. **提交**。提交信息用中文，只 `git add` 你动过的路径（你的章、图、实验台、练习、测试数据）。

不要运行 `npm run build` 和 `npm run test:site`：它们构建全站、输出到共享的 `course/.vitepress/dist`，会互相覆盖，别人写到一半的章还会让构建失败。主控会在最后统一跑。

## 2. 不要碰的共享文件，以及需要共享改动时怎么办

**不要改：**

- `course/.vitepress/config.mts`、`sidebar.mts`、`markdown-cjk.mts`
- `course/.vitepress/theme/index.ts`、`style.css`、`theme/components/*`、`theme/composables/*`
- `course/exercises/index.ts`、`exercises/types.ts`
- `tests/site/exercises.test.js`
- `scripts/` 下的所有脚本
- 其他章的任何文件
- `course/labs/_shared/*`（共用辅助函数。只导入，不改）

这些文件已经做到：侧边栏自动从 `chapters/*.md` 的 frontmatter 生成；练习自动汇总 `exercises/*.ts`；测试自动发现章节和 `tests/site/labs/*.js`；所有旧版块级 class 和实验台控件 class 已有样式。

**需要共享改动时**（例如某个组件缺功能、样式缺一条、转换脚本有 bug、测试脚本不支持你的实验台）：不要自己改。在最终报告里单独写一节“需要主控处理的共享改动”，写清：哪个文件、要什么、为什么、你临时怎么绕过。能绕过的先绕过（例如实验台私有的样式写在自己 SFC 的 `<style scoped>` 里）。

## 3. 目录、frontmatter 和章号

```
course/
  .vitepress/
    config.mts            站点配置、自定义容器、中文粗体修复、并行构建用的环境变量
    sidebar.mts           从 chapters/*.md 的 frontmatter 生成侧边栏
    markdown-cjk.mts      markdown-it 插件：中文标点旁的 **粗体** 也能生效
    theme/                主题：style.css、components/*.vue（自动全局注册）、composables/*
  index.md                首页
  chapters/NN-id.md       一章一个文件。NN = 两位章号，id = 旧的 section id
  figures/NN-id/*.vue     示意图，每张一个 SFC，只含 template
  labs/NN-id/*.vue        实验台，每个一个 SFC（多标签页的每页再拆一个小 SFC）
  labs/_shared/           各章实验台共用的辅助函数（domLog、dLogBuf、useMouse、useDebounced）
  exercises/NN-id.ts      该章的练习（自动汇总）；exercises/types.ts 是类型
  AUTHORING.md            本文
scripts/
  html2md.mjs             转换脚本（--list 列章，--exercises 抽练习，--stats 规模表）
  compare.mjs             对照脚本
  shot.mjs                截图脚本
tests/site/
  exercises.test.js       站点测试（共享，不要改）
  labs/NN-id.js           每章的实验台测试数据（你写）
```

### frontmatter 和章号

```md
---
title: 响应式基础
id: refs
stage: 2
chapter: 3
desc: ref、reactive、toRefs
---
```

- `title`：旧的 `data-title`，短名。侧边栏、上一章/下一章、页面标题用它。**不要求等于一级标题**：一级标题 `# …` 逐字用旧 `<h2>` 的文字（例如“响应式基础：ref 和 reactive”）。
- `id`：旧的 section id。自测答案的存储键用它，**不能改**。
- `stage`：1 到 4。`desc`：旧的 `data-desc`。值里有 `: ` 之类 YAML 特殊字符时加双引号（脚本会自动处理）。
- `chapter`：章号，决定侧边栏里的先后和页面上的“第 N 章”小字。旧版章号按出现顺序：第 1–25 章是 first … migrate，**综合实战（project）是第 26 章，综合测验（quiz）是第 27 章**，所以它们的文件是 `26-project.md`、`27-quiz.md`，写 `chapter: 26`、`chapter: 27`。
- **没有章号的页面**（只有速查表 `cheat`，旧版标“附录”）：文件名不带数字（`cheat.md`），frontmatter 不写 `chapter`，写 `order: 100`。侧边栏里它排在同阶段所有有章号的页面之后；几个无章号页面之间按 `order` 从小到大，侧边栏文字就是 `title`，页面上没有“第 N 章”小字。
- 页面顶部“第 N 章”由 `chapter` 自动生成。旧的“下一章”链接不迁，VitePress 按侧边栏顺序自动生成。
- 章内用到的示意图和实验台，在章开头的 `<script setup>` 里导入。通用组件（`Sc` `Opt` `Goal` `Lab` `LabCode` `Figure` `Exercise` `Flow` `TabbedLab` `LabTodo`）不用导入。

章内块的顺序（和旧版相同）：目标、阅读时间、类比、本章术语、为什么需要它、小节 `### N.M 标题`（含正文、代码、图、实验台、练习、深入块、注意框）、注意、自测、小结。

## 3A. 每种写法的完整示例（子节 3.1 到 3.11）

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

- `caption` 是纯文字属性。旧的 `<figcaption>` 里有 `<code>` 时，用 `#caption` 插槽（见第 5 节），行内代码样式就保留了。
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
- 实验台里的通用控件类名已在 `style.css` 里，完整列表见第 5 节“样式”。
- 实验台里展示一段代码（旧版的 `<pre class="code" v-html="hl(code)">`）用 `<LabCode :code="字符串" />`。代码是动态的（随开关变化）或属于某个标签页时用它；章节正文里的静态代码仍用围栏代码块。
- **多标签页实验台**：用通用组件 `<TabbedLab :tabs>`，见第 5 节。
- **读 DOM 的实验台**（旧版里“渲染出的属性”“当前 HTML”）：用 `ref` 拿元素，`onMounted` 和 `watch(…, { flush: 'post' })` 里读 `getAttribute` 或 `innerHTML`。要在 `<div>` 里显示多行文字时，写成表达式 `{{ 'class="' + cls + '"\nstyle="' + sty + '"' }}`。模板里直接换行会被压成一个空格。
- **指令钩子的日志不能用响应式数据。** 钩子在渲染中运行，钩子里改响应式数据会触发新的渲染，新的渲染又运行钩子，形成死循环。旧版用 `document.createElement` 直接往 DOM 里加日志，SFC 里照做：模板里放一个空的 `<div ref="logRef">`，钩子里用普通函数往里 `prepend`。
- 自定义指令在 `<script setup>` 里写成 `const vXxx = {…}`，模板里就是 `v-xxx`，不用注册。
- **实验台放在 `::: deep` 里时**（第 2 章的 `demo-directive`），`<Lab>` 的结束标签和 `:::` 之间要空一行。浏览器里，折叠的深入块里实验台不会挂载，展开后才挂载。测试要先点开深入块（见第 6 节）。

## 4. 从旧 HTML 到新写法对照表

“脚本”列：转换脚本是否自动做。

| 旧 | 新 | 脚本 |
|---|---|---|
| `<section class="ch" id data-stage data-title data-desc>` | frontmatter（`id stage title desc chapter`） | 是 |
| `<h2>`（旧章标题） | `# 标题` | 是 |
| `<div class="goal">` + `li[data-checks]` | `::: goals` + `<Goal checks>`（标签自动算） | 是 |
| `.rt` `.analogy` `.terms>dl` `.why` `.pitfalls` `.summary` `.selfcheck` | `::: rt` `analogy` `terms`（定义列表）`why` `pitfalls` `summary` `selfcheck` | 是 |
| 上面这些块的标题 `div.t` 和默认不同（例如“注意：不要用 index 作为 key”） | 写在容器名后面：`::: pitfalls 注意：不要用 index 作为 key` | 是 |
| `<h3><span class="step">N.M</span>标题</h3>` | `### N.M 标题` | 是 |
| `<p>` `<code>` `<b>` `<i>` `<a>` `<ol>` `<ul>` `<br>` | 段落、反引号、`**粗体**`、`*斜体*`、链接、列表、`<br>` | 是 |
| `<a href="#comm">第 5 章</a>` | `[第 5 章](/chapters/05-comm)` | 是 |
| `<script type="text/x-code">` 和 `pre.sc-code` | 围栏代码块（还原 `<\/script>`、`<\!--`，猜语言） | 是 |
| `.code-pair` | `:::: pair` + `::: col 说明` | 是 |
| `figure.fig>svg+figcaption` | `figures/…/X.vue` + `<Figure caption>`；标题里有 `<code>` 用 `#caption` 插槽 | 是 |
| `<div class="ex" data-ex>` | `<Exercise id />` | 是 |
| `div.lab.gated` + `.sc.predict` + `.lab-body` | `<Lab>` + `#predict` + `<LabTodo>` 占位，**人工**换成实验台 SFC | 外壳是，正文否 |
| `details.deep` | `::: deep 标题` | 是 |
| `details.think` | `::: think 问题` | 是 |
| `div.tbl-wrap>table.t` | Markdown 表格；有 `rowspan`/`colspan` 或无表头时保留成 HTML 表格（脚本会报告） | 是 |
| `div.note`（`.note.warn`） | `::: note`（`::: note warn`） | 是 |
| `div.steps-flow>span+i` | `<Flow :steps="['setup', 'onMounted']" />` | 是 |
| `details.cheatwrap` | `::: cheat 标题` | 是 |
| `a.nextch` | 不迁 | 是 |
| 旧 `div.score`、`#qzTabs`、`#qzList`（综合测验，由脚本生成内容） | `<LabTodo>`，人工做成组件 | 占位 |
| 其他不认识的块 | 原样保留成 HTML，标准输出里报告行号。人工决定：改成上面某种写法，或原样留着（注意 `{{ }}` 要加 `v-pre`） | 报告 |

## 5. 新增练习、实验台、示意图

### 练习

脚本已生成 `exercises/NN-id.ts`。人工核对要点见第 1 节第 4 步。格式：

```ts
import type { Exercise } from './types'

export const counter: Exercise = {
  title: '做一个计数器',
  ch: 1,
  task: '按钮显示“点了 N 次”。……',     // HTML 字符串，里面的 &lt; 要保留
  tpl: '<button>点我</button>',
  js: 'const count = ref(0)\n\nreturn { count }',
  solTpl: '<button @click="count++">点了 {{ count }} 次</button>',
  hints: ['提示 1', '提示 2', '答案'],       // 只留一个 hints 数组，不写 hint 和 HINTS
  async check(T) { /* … */ },
  wrong: [{ tpl: '…', why: '…' }]
}
```

- 字段和旧版完全一致，字符串原样。旧版提示优先级 `hints > HINTS[id] > [hint]`，只留优先级最高的那个。
- 练习脚本里可直接用的名字：`ref reactive computed watch watchEffect toRefs toRef shallowRef nextTick onMounted onUnmounted provide inject`，还有**全局 `Vue`**（整个 Vue 命名空间，例如 `const { useModel } = Vue`、`Vue.createApp`）。这是旧版 `window.Vue` 的等价物，练习数据里的 `Vue.xxx` 不用改。
- `check` 函数本身是模块里的代码，没有全局 `Vue`：用到时 `import { nextTick } from 'vue'`（脚本已自动改）。
- 每道新练习至少写 1 个 `wrong`。迁移旧练习时，旧版有就保留，没有不补。
- 练习 id 全站不能重复（开发环境会报错，测试也会查）。
- 起始代码本身有 TODO 而报错是正常的，要用户补全。
- 想让进入页面时不自动运行（例如运行会触发控制台报错的练习），设 `lazy: true`。

### 示意图

脚本已抽到 `figures/NN-id/FigN….vue`。规则：

- 每张图一个 SFC，只含 `<template>` 和一个 `<svg>`。颜色用 `var(--muted)` `var(--ink)` `var(--accent)` `var(--accent-soft)` `var(--surface)`，不写死颜色。
- **SVG 里的 `{{ }}` 会被 Vue 当插值**：给那个 `<text>` 加 `v-pre`（脚本已自动加）。
- marker 的 `id` 在整页内不能重复。沿用旧的 `章id-名字`。
- 正文里：

```md
<Figure caption="纯文字标题">
<FigName />
</Figure>
```

标题里有行内代码时：

```md
<Figure>
<FigName />
<template #caption>

大部分指令把数据送到 DOM。`@` 把事件送回代码。

</template>
</Figure>
```

`<Figure>` 和 `<FigName />` 之间不要空行。

### 实验台

脚本生成 `<Lab>` 外壳和“先猜”题：

```md
<Lab id="demo-refs" title="实验台：解构和浅层响应" note="运行真实的 Vue">
<template #predict>
<Sc predict :a="1">

先猜：……

<Opt>选项一</Opt>
<Opt>选项二</Opt>

<template #explain>

解析：……

</template>
</Sc>
</template>

<LabTodo id="demo-refs" hint="旧脚本第 9539 行" />
</Lab>
```

你要做的：把旧脚本里挂载这个实验台的代码（清单里有行号）改写成 `labs/NN-id/名字.vue`，把 `<LabTodo …/>` 换成 `<名字 />`，并在章开头导入。

- `id`：旧 `.lab-body` 的 id，也是“先猜”答案的存储键（`p:id`）。必须唯一，不能改。
- 没有 `#predict` 插槽的实验台一开始就是打开的。有时：猜之前正文不显示；选完后打开；出现“核对我的猜测”按钮，点它才显示解析。
- 实验台正文只在浏览器里渲染，接近视口才挂载；放在折叠的 `::: deep` 里时，展开后才挂载（测试要先点开深入块）。`<Lab>` 的结束标签和 `:::` 之间要空一行。
- 实验台 SFC 用普通写法（`<script setup>` + `<template>`），逻辑不变，只把命令式 DOM 操作改成模板。可直接用 `<LabCode>`（旧 `pre.code` + `hl()`）。
- **样式**：控件类名已在 `style.css`：`.row .b(.pri .on) .cap .cols .box .t .ctl .tabs .log .pill .domview pre.code .kv .bucket .keys .kbox .legend .ops .hook-grid .hook .view .vl .vrow .stepper .kanban .task .q .opts .opt .explain .score .flash textarea.t`，旧版 CSS（`vue3-course.html` 5–429 行）里有的都已搬来。**实验台私有的、旧 CSS 里没有的样式**写在自己 SFC 的 `<style scoped>` 里。旧 CSS 里没有的类名（`.card` `.item` `.pheno-modal` 等）本来就没有样式，不用补。
- **多标签页实验台**（旧版 `TABS = [{name, tip, code, comp}]`）：每个标签页的 `comp` 拆成一个小 SFC，放在同一个 `labs/NN-id/` 目录；外壳直接用通用组件 `<TabbedLab :tabs="TABS" />`（`name` `tip` `code` `comp`，`code` 省略就只显示运行效果；默认插槽参数 `{ tab, index }` 可在下面加内容）。第 2 章 `labs/02-template/DirectivePlayground.vue` 是样例。
- **共用辅助函数**从 `labs/_shared` 导入：`import { domLog, dLogBuf, useMouse, useDebounced } from '../_shared'`。`domLog(el, 类, 消息)` 往一个 `<div class="log">` 里写日志（原生 DOM，不用响应式数组）；`dLogBuf()` 在日志元素出现前缓存；`useMouse`、`useDebounced` 是第 9 章的组合式函数示例。旧脚本里别的实验台共用的函数（`$`、`esc`、`hl` 等）：`hl` 对应 `<LabCode>`，其余用不到。要新增共用函数时记进报告，交给主控。
- **读 DOM 的实验台**（“渲染出的属性”“当前 HTML”）：用 `ref` 拿元素，在 `onMounted` 和 `watch(…, { flush: 'post' })` 里读 `getAttribute` 或 `innerHTML`。多行文字写成表达式 `{{ 'a' + '\n' + 'b' }}`，模板里直接换行会被压成一个空格。
- **指令钩子、生命周期钩子的日志不能用响应式数据**：钩子在渲染中运行，里面改响应式数据会触发新渲染，形成死循环。用 `domLog` 往空的 `<div class="log" ref="logRef">` 里写。
- 自定义指令在 `<script setup>` 里写成 `const vXxx = {…}`，模板里就是 `v-xxx`。
- 旧脚本里有 `safeMount` / `mountNow` / `lazyIO`：旧的按需挂载机制，`<Lab>` 已经自带，不用搬。
- 手写的大型交互（响应式原理的手写响应式、diff 模拟器、宏编译对照、在线编译、综合实战看板、综合测验）：脚本行号范围在转换脚本的清单里。逻辑尽量原样搬，拆成几个小 SFC。

## 6. 实验台测试数据 `tests/site/labs/NN-id.js`

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

测试自动检查：答题前实验台关着（`.lab.gated`）、选完后打开、没有控制台报错；在深入块里的实验台会先自动点开。`run` 里做一次有代表性的操作并断言。第 2 章的 `tests/site/labs/02-template.js` 是样例。

## 7. 踩过的坑

1. **`{{ }}` 会被 Vue 当成插值。** 本站已处理：正文文字里的 `{{` 会自动转成实体，行内代码自动加 `v-pre`，围栏代码本来就安全。所以正文里直接写 `{{ count }}` 即可。但是，你自己写的 HTML 标签（例如 `<span>{{ x }}</span>`）里的 `{{ }}` 不会被处理。要用时给标签加 `v-pre`。
2. **行首的组件标签会开一个“HTML 块”，到下一个空行才结束。** 块里的 Markdown 不会被解析。所以：
   - `<Sc>`、`<Figure>`、`<Lab>`、`<Exercise>`、`<template>` 这类块级标签，后面如果要写 Markdown，必须空一行。
   - `<Figure>` 里的三行不要空行，否则图会被拆开。
   - 块后面紧跟 `:::` 时，中间要空一行。否则 `:::` 会被当成块里的文字，容器不结束。
   - `<Goal>` 和 `<Opt>` 是例外：它们已被配置成行内组件，行内的反引号和粗体照常解析，所以可以一行一个、连续写。
3. **中文粗体已修好。** `markdown-cjk.mts` 放宽了 `**` 的判断：中文标点和弯引号当普通文字，`**` 紧邻汉字时也允许贴着 ASCII 标点。所以 `**场景：……。**后台页面`、`的**“小纸条”**，告诉`、`**说明：**Vue` 都能直接写 `**`，不用 `<b>`（第 1、2 章里已有的 `<b>` 保留不动）。仍然失败的少数情况（例如 `**` 里面以空格开头）：`compare.mjs` 会报“字面的 **”，改用 `<b>…</b>`。
4. **代码块外的 `<script>` 标签。** VitePress 会把行首的 `<script>` 当成页面脚本抽走。正文里讲 `<script setup>` 时，要么放进围栏代码块，要么放进行内代码（反引号）。只有每章开头那一个 `<script setup>` 是真的脚本。
4.5. **正文文字里不要用 HTML 实体。** `&lt;p&gt;` 会被站点的文字规则再转义一次，页面上显示成字面的 `&lt;p&gt;`。脚本把旧文字里的 `&lt;` 输出成转义的 `\<`（页面上显示 `<`，没有代码样式）；如果旧文字这里本来是标签名，建议手工改成行内代码 `` `<p>` ``（第 2 章的做法，只多了代码样式，文字不变）。`Exercise` 的 `task` 字符串是 HTML，里面的 `&lt;` 仍然要保留。
5. **围栏代码块里的 `</script>` 不用转义。** 旧的 `<\/script>` 和 `<\!--` 要改回正常写法。
6. **容器嵌套要用更多的冒号。** `pair` 里套 `col`，外层四个冒号，内层三个。`deep` 里不要再套别的容器。
7. **`::: deep` 的标题里可以写行内 Markdown**（反引号等）。但不要写 `{{ }}` 以外的特殊字符。
8. **配置文件是 `config.mts`，不是 `config.ts`。** 项目的 `package.json` 没有 `"type": "module"`（旧的 `server.js` 和 `tests/` 要用 CommonJS），VitePress 配置必须是 ESM，所以用 `.mts`。不要给 `package.json` 加 `"type": "module"`。
9. **不要给站点的 `vue` 做 alias。** 练习需要运行时编译模板，Exercise 组件挂载后会动态 `import('vue/dist/vue.esm-bundler.js')`。这个构建和站点共用同一个 `@vue/runtime-dom`，同时注册了编译器。不要改这个做法。
10. **练习组件只在浏览器里渲染。** 服务端渲染出来的页面里只有占位。测试要等编辑器出现（`.ex[data-ex]`）。
11. **进度只存 localStorage**，键前缀 `vue3deep:`。键的含义见 `composables/store.ts` 开头的注释。不要做服务端同步。
12. **中文搜索**用的是 VitePress 本地搜索，对没有空格的中文分词一般。第 1 章没有处理。
13. 本机 4173 端口可能被别的项目占用。测试和截图脚本自己选空闲端口，不受影响。手动预览时用 `-- --port 4791`。
14. **不要用 `npm run build` 或 `npm run test:site` 验证自己的章。** 它们构建全站、写共享的 `dist`。用 `tests/site/exercises.test.js 章名`、`compare.mjs … --build`、`shot.mjs`，它们只构建你的章到临时目录。原理：环境变量 `COURSE_CHAPTERS`（只构建这些章，其余 `srcExclude`）、`COURSE_OUT_DIR`、`COURSE_CACHE_DIR`。
15. **别人写到一半的 `exercises/*.ts` 会让全站构建失败**，但只构建指定章时 `exercises/index.ts` 只加载这些章的练习文件，不受影响。你自己的练习文件有语法错误时，构建会报错。
16. **实验台里用到 `<LabCode>`、`<TabbedLab>` 等通用组件时直接写标签**，主题已全局注册，不用导入。
