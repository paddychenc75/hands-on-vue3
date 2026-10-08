---
title: 项目：任务看板
id: project-board
stage: 2
chapter: 13
desc: 用组件、组合式函数、插槽、依赖注入、表单、Teleport、指令和过渡做出一个三列任务看板
---

<script setup>
import BoardDemo from '../labs/13-project-board/BoardDemo.vue'
</script>

# 项目：任务看板

::: goals
<Goal checks="sc:0,sc:3,ex:boardTasks,ex:boardCards">把任务看板拆成组合式函数和组件：数据和逻辑放在 `useTasks`，组件只显示和发事件。</Goal>
<Goal checks="sc:1,ex:boardInject">判断什么时候用 `provide` / `inject` 代替逐层转发事件，并说明它的代价。</Goal>
<Goal checks="sc:2,ex:boardForm,ex:boardPolish,ex:boardSave">写带校验和草稿的任务表单，用 Teleport 渲染弹窗，用自定义指令和 TransitionGroup 打磨，并把任务保存到 `localStorage`。</Goal>

:::

::: rt
阅读主线约 12 分钟。另外留 1.5 到 2.5 小时做六道练习，它们合起来就是一个完整的看板。
:::

::: why
第 6 到 12 章每章教一种零件：组件通信、生命周期、组合式函数、内置组件、指令、应用与插件、表单。单独练的时候，每个零件放在哪里是题目替你定的。

真实的应用要自己回答：这份数据归谁？这个按钮离数据三层远，怎样让它改数据？弹窗放在哪个组件里？

原因：零件之间的接口是设计决定，只有把它们装到同一个应用里才会碰到。本章带你做一个三列任务看板，六步，每步一道练习。后一步的起始代码是前一步的参考答案。

这个看板就是第 23 章要工程化的那个：任务的字段一样，需求一样。你在这里做页面版，第 23 章把它搬进真实的 Vite 项目，加上 TypeScript、Pinia、路由和测试。
:::

### 13.1 成品和需求

先操作成品。它由五个单文件组件和一个组合式函数组成，下面六步会一个一个做出来。

<Lab id="demo-board-app" title="实验台：成品任务看板" note="真实的 Vue 组件。任务保存在 localStorage。">
<template #predict>
<Sc predict :a="1">

先猜：在待办列里，“做任务表单”没有日期，排在“加列表过渡”（2026-06-05）后面。把它的日期改成 2026-06-01，会发生什么？

<Opt>位置不变，要点“恢复示例数据”或刷新才会重新排序</Opt>
<Opt>立刻排到“加列表过渡”前面</Opt>
<Opt>它被移到“进行中”列</Opt>

<template #explain>

解析：每列显示的是 `byStatus` 算出来的，一个依赖 `tasks` 的 computed。日期变了，它自动重新排序，没有“刷新列表”这个动作。你会在第 1 步自己写出它。第三项把日期和状态弄混了：移动列只由 `status` 决定。

</template>
</Sc>
</template>

<BoardDemo />
</Lab>

任务是 `{ id, title, status, due }`。`status` 是 `todo`、`doing`、`done` 之一，`due` 是 `YYYY-MM-DD` 或空字符串。这些字段和第 23 章一致。

| 编号 | 需求 |
|---|---|
| R1 | 三列：待办、进行中、已完成。每列按截止日期从早到晚排，没有日期的排最后 |
| R2 | 点“新建任务”，在弹窗里填标题和日期。标题必填，最多 20 个字，提交后才显示错误 |
| R3 | 点卡片标题编辑。点“取消”，任务不变 |
| R4 | 每张卡片可以移到其他列、改日期、删除 |
| R5 | 页面顶部显示“还剩 N 项”（待办和进行中的数量） |
| R6 | 弹窗打开时光标已在标题框里；卡片的增删有过渡 |
| R7 | 刷新后任务还在；存储里的内容损坏时不报错 |

### 13.2 第 1 步：数据和逻辑放进 useTasks（R1、R4、R5）

先不管界面，决定数据归谁。任务数组以及增删改移的函数，放进一个组合式函数 `useTasks`（第 8 章 8.1 节）。组件只调用它，不自己改数据。

每一列显示什么，是从 `tasks` 算出来的派生数据，用 `computed`。注意排序会改数组：先放进新数组，再排。练习里还有一个 `lastAction`，记录最近一次操作并显示在页面上。后面几步用它验证“改数据的是谁”。

<Exercise id="boardTasks" />

::: note
**你刚才做了什么决定？**`tasks` 只有一份，列是它的视图，不是三个数组。任务换列只改 `status`，不需要“从一个数组删、往另一个数组加”。`left` 也是派生的，不另存。
:::

### 13.3 第 2 步：拆出 TaskCard 和 Column（R1）

`Board` 现在又长又杂。拆的原则：一个组件管一件事。`TaskCard` 显示一张卡片，`Column` 是一列的外框。

两个组件的接口不同。`TaskCard` 用 props 接收 `task`，用事件把用户的操作发回去（第 6 章 6.1、6.2 节）。`Column` 只管标题和外框，卡片由看板放进插槽（第 6 章 6.5 节）：它不需要知道里面是什么。

<Exercise id="boardCards" />

::: note
**你刚才做了什么决定？**卡片不改 `task`，只发事件，改数据的是 `useTasks`。页面上的“最近操作”能证明这一点。`Column` 用插槽而不是 `tasks` 属性，所以以后列里放别的内容也不用改它。
:::

### 13.4 第 3 步：用 provide / inject 把操作传给深处的按钮（R4）

产品要求每张卡片有一组操作区，于是它被拆成 `CardActions`。层级变成 Board → Column → TaskCard → CardActions。

用事件，`CardActions` 通知 `TaskCard`，`TaskCard` 再通知 `Board`，`TaskCard` 只是转发。改用依赖注入（第 6 章 6.6 节）：`Board` 提供一次，深处的组件直接取。

代价也要知道：`CardActions` 现在悄悄依赖一个祖先。把它放到没有 `provide('board')` 的地方，它读到 `undefined`。所以只对“整个看板共用、稳定不变”的操作用它，其他数据仍然用 props。

<Exercise id="boardInject" />

::: note
**你刚才做了什么决定？**操作（`move`、`update`、`remove`）注入，数据（`task`）仍然是 props。数据流向在模板里看得见，操作的来路藏在 `inject` 里。
:::

### 13.5 第 4 步：表单、校验和 Teleport（R2、R3）

新建和编辑是同一个表单，只是初始值不同，所以共用一个 `TaskForm`：`task` 为 `null` 是新建。

表单有两个设计要点。一是草稿：表单复制任务的值，输入时改草稿，保存时才通过事件交出去。直接绑定任务对象，“取消”就无法恢复（第 12 章 12.1 节）。二是校验：错误是从 `form.title` 算出来的派生数据，用 `computed`（第 12 章 12.4 节）。但它在用户提交过之后才显示。

弹窗用 `Teleport` 渲染到 `body`（第 9 章 9.3 节）。这样祖先的 `overflow` 或 `z-index` 不会裁掉它。Teleport 只改 DOM 的位置，组件的父子关系不变：弹窗里的表单照样能收到 `Board` 的 props 和事件。

<Exercise id="boardForm" />

::: note
**你刚才做了什么决定？**“弹窗开着吗、编辑哪个任务”是界面状态，放在 `Board` 的 `editing`，一个变量同时表示关闭、新建和编辑，不放进任务里。校验放在表单里，不放进 `useTasks`：规则是“表单怎样才算填对”，不是“数据结构的约束”。
:::

### 13.6 第 5 步：自动聚焦指令和列表过渡（R6）

两处打磨，各用一个零件。

自动聚焦要直接操作 DOM（`el.focus()`），而且别的表单也可能用到，所以写成自定义指令（第 10 章 10.2 节）。要用 `mounted` 钩子：这时元素才在页面里。

列表的增删用 `TransitionGroup`（第 9 章 9.2 节）。它给增删的子元素加进入和离开的类，离开过渡结束后才移除元素。子元素必须有 `key`。

<Exercise id="boardPolish" />

::: note
**你刚才做了什么决定？**这两处都不改数据流。删掉它们，看板功能不变，只是少了手感。这类“只影响体验”的零件，放在最外层，不要让业务逻辑依赖它们。
:::

### 13.7 第 6 步：保存任务（R7）

回到第 5 章的老问题：读一次，写一次，读取要防坏数据，`nextId` 要接着最大 id。区别是现在它在 `useTasks` 里。看板、卡片、表单一行都不用改：它们不知道数据存在哪里。这就是把逻辑放进组合式函数的回报。

<Exercise id="boardSave" />

::: note
**你刚才做了什么决定？**只存 `tasks`，不存 `editing`、表单草稿。以后要换成接口请求或 Pinia（第 16 章会讲），只改 `useTasks` 内部。
:::

### 13.8 回顾：需求对照和设计

| 需求 | 在哪一步实现 | 用到的知识 |
|---|---|---|
| R1 三列、按日期排序 | 13.2、13.3 | `computed`；props、插槽（第 4、6 章） |
| R2 新建任务、校验 | 13.5 | `v-model`、`computed`、`emit`（第 12 章） |
| R3 编辑、取消 | 13.5 | 草稿；`Teleport`（第 9 章） |
| R4 移动、改日期、删除 | 13.2、13.4 | 组合式函数（第 8 章）；`provide` / `inject`（第 6 章） |
| R5 还剩 N 项 | 13.2 | 派生数据（第 4 章） |
| R6 聚焦、过渡 | 13.6 | 自定义指令（第 10 章）；`TransitionGroup`（第 9 章） |
| R7 保存 | 13.7 | `watch` 与 `deep`（第 4、5 章） |

**设计回顾。**

- **数据结构**：一份 `tasks` 数组，每个任务有 `status` 字段。列是视图。第 23 章会把它改成 `byId` 加 `ids`，那是为了大量数据下的更新性能，不是本章的需求。
- **谁拥有什么**：`useTasks` 拥有任务；`Board` 拥有 `editing`；`TaskForm` 拥有草稿；组件之间，数据用 props 向下，操作用事件或注入。
- **派生的状态**：`byStatus`、`left`、表单的 `error`。
- **副作用**：一个，`watch(tasks)` 写 `localStorage`。
- **需求变了怎么改**：加“优先级”字段，改 `seed`、`add`、表单和卡片，`byStatus` 不动。加第四列“已取消”，改 `COLUMNS` 和 `byStatus` 里写死的三个键。两个组件要共享同一份任务，不能各调用一次 `useTasks()`：见自测第 4 题。

**可选的延伸**（没有判题，在第 6 步的结果上自己改）：

1. 用原生拖放事件拖动卡片换列，调用同一个 `move`。想想：拖动和按钮两条路径，为什么都应该走 `move`？
2. 用第 10 章 10.5 节的 `v-click-outside` 指令，让点击弹窗外面也能关闭弹窗。
3. 把 `useTasks` 换成 Pinia store（第 16 章），给每个任务加详情页路由（第 17 章）。这正是第 23 章的路线。

::: selfcheck
<Sc :a="0">

`TaskCard` 里的移动按钮写成 `@click="task.status = c.status"`，直接改了 props 里的任务对象。页面上看起来完全正常。这为什么仍然是错误的设计？

<Opt>改数据的逻辑绕过了 `useTasks`：记录、保存、校验都在那里，以后会漏掉</Opt>
<Opt>Vue 会报错并阻止这次赋值</Opt>
<Opt>任务对象会因此变成非响应式，页面不再更新</Opt>

<template #explain>

解析：Vue 只对 props 本身（`props.task = ...`）报警，不拦截对象内部属性的修改，页面还会更新。问题在设计：数据的所有者是 `useTasks`，所有修改都应该经过它的函数，这样“最近操作”、保存、将来的校验才不会漏。卡片只发事件。第二项混淆了“替换 prop”和“修改 prop 指向的对象”。

</template>
</Sc>

<Sc :a="2">

`CardActions` 用 `inject('board')` 取操作。另一个页面直接把 `CardActions` 放进来，但没有任何祖先提供 `board`。用户点击“删除”会怎样？

<Opt>按钮什么也不做，没有任何提示</Opt>
<Opt>Vue 在挂载时就报错，组件无法显示</Opt>
<Opt>开发环境警告“injection 'board' not found”，点击时读到 `undefined.remove` 抛出 TypeError</Opt>

<template #explain>

解析：`inject` 找不到 key 时返回 `undefined`（开发环境警告），组件照常渲染。错误要到点击、读 `board.remove` 时才出现。这就是依赖注入的代价：依赖藏在 `inject` 里，从组件的接口看不出来。所以注入的东西要少而稳定，并且在文档或类型里写明。第一项以为错误会被吞掉，事件处理函数里的错误会抛出。

</template>
</Sc>

<Sc :a="1">

弹窗里的 `TaskForm` 被 `Teleport` 渲染到 `body` 下。`Board` 通过 `:task` 传给它数据，通过 `@save` 接收它的事件，祖先还 `provide` 了东西。传送之后，这些还有效吗？

<Opt>props 和事件有效，但 `inject` 取不到祖先提供的值，因为 DOM 不在祖先里面了</Opt>
<Opt>全部有效：Teleport 只改变 DOM 的位置，组件树里的父子关系不变</Opt>
<Opt>全部失效，要用全局事件总线重新连接</Opt>

<template #explain>

解析：Teleport 搬走的只是渲染出来的 DOM 节点。组件实例仍然是 `Board` 的后代：props、事件、`provide` / `inject` 都沿组件树工作，和 DOM 在哪里无关。第一项把 DOM 的祖先和组件的祖先弄混了。

</template>
</Sc>

<Sc :a="1">

`Board` 里调用了 `useTasks()`，页面顶部的 `BoardHeader` 组件为了显示“还剩 N 项”，也自己调用了一次 `useTasks()`。用户在 `Board` 里移动一张卡片后，`BoardHeader` 显示的数字会怎样？

<Opt>跟着变化，因为两处用的是同一份任务</Opt>
<Opt>不变：每次调用 `useTasks()` 都创建一份新的 `tasks`，两处互不相干</Opt>
<Opt>报错，组合式函数不能在两个组件里调用</Opt>

<template #explain>

解析：组合式函数是普通函数。每次调用，里面的 `ref` 都重新创建，所以每个调用者拿到独立的状态。两个组件要共享同一份任务，就在共同的祖先里调用一次，用 props 或 `provide` 传下去；或者把状态放到模块级或 Pinia（第 16 章会讲）。第一项把组合式函数当成了全局单例。

</template>
</Sc>

:::

::: summary
- 数据归一处：`useTasks` 拥有任务和增删改移；组件只显示和发事件，卡片不直接改 `task`。
- 一份 `tasks`，列是视图：每列用 `computed` 算出，排序前先复制数组。
- props 向下传数据，事件向上传操作；深处的按钮可以用 `provide` / `inject` 取稳定的操作，代价是依赖变隐蔽。
- 表单改草稿，保存才交出去；校验错误是派生数据，提交后才显示；弹窗用 Teleport，组件树关系不变。
- 自定义指令（聚焦）和 TransitionGroup（增删过渡）只影响体验，不影响数据流。
- 每次调用 `useTasks()` 得到独立状态；要共享就在共同祖先调用一次再传下去。
:::
