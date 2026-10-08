---
title: 项目：待办清单
id: project-todo
stage: 1
chapter: 5
desc: 用 createApp、模板指令、ref、computed 和 watch 从空白做出一个完整的待办清单
---

<script setup>
import TodoApp from '../labs/05-project-todo/TodoApp.vue'
</script>

# 项目：待办清单

::: goals
<Goal checks="sc:0,sc:2,ex:todoAdd,ex:todoToggle">为待办清单设计数据：事项的形状，哪些数据要存，哪些数据从别的数据算出来。</Goal>
<Goal checks="sc:1,ex:todoFilter,ex:todoEdit">用 `computed` 实现筛选，用草稿数据实现“可以取消”的编辑。</Goal>
<Goal checks="sc:3,ex:todoSave">用 `watch` 把数据保存到 `localStorage`，并处理读取失败。</Goal>

:::

::: rt
阅读主线约 10 分钟。另外留 40 到 60 分钟做五道练习，它们合起来就是一个完整的应用。
:::

::: terms
派生数据
: 可以从其他数据算出来的数据。

持久化
: 把数据保存到 localStorage，刷新后仍在。
:::

::: why
前四章每次只练一个知识点，题目替你决定了数据放在哪里、用哪个 API。真正的应用没有人替你决定。

原因：同一个功能要同时决定“存什么”“算什么”“什么时候保存”。这些决定互相影响，只有从空白开始做一次才能练到。

本章带你从空白做出一个待办清单。五个步骤，每步一道练习。后一步的起始代码是前一步的参考答案，上一步没做完也能继续。
:::

### 5.1 成品和需求

先操作成品。它是一个普通的 Vue 单文件组件，用的全是前四章的知识。

<Lab id="demo-todo-app" title="实验台：成品待办清单" note="真实的 Vue 组件。下方的两个框显示“存了什么”和“算出什么”。">
<template #predict>
<Sc predict :a="1">

先猜：筛选选“未完成”，然后勾选列表里的一条事项。会发生什么？

<Opt>这条事项加上删除线，仍留在列表里</Opt>
<Opt>这条事项立刻从列表消失，“还剩”减 1</Opt>
<Opt>什么也不变，要再点一次“未完成”才刷新</Opt>

<template #explain>

解析：列表显示的是 `visible`，它是从 `todos` 和 `filter` 算出来的 computed。`done` 一变，`visible` 和 `left` 自动重新计算。没有“刷新列表”这个动作。你会在 5.4 节自己写出它。

</template>
</Sc>
</template>

<TodoApp />
</Lab>

下面是需求清单。最后一节会逐条对照。

| 编号 | 需求 |
|---|---|
| R1 | 输入文字，点“添加”或按回车，加到列表末尾。空文字不添加 |
| R2 | 勾选切换完成，已完成的事项有删除线。可以删除 |
| R3 | 显示“还剩 N 项”（没完成的数量） |
| R4 | 筛选：全部、未完成、已完成 |
| R5 | 双击文字编辑，回车保存，Esc 取消 |
| R6 | 刷新页面后事项还在；存储里的内容损坏时不报错 |

### 5.2 第 1 步：数据的形状，添加事项（R1）

先决定一件事：一条事项是什么。只存文字不够，后面要勾选、删除、编辑。所以事项是对象：`{ id, text, done }`。`id` 是这条事项的身份。`v-for` 的 `:key`（第 2 章 2.3 节）、删除、保存都靠它。

id 用一个只增不减的计数器 `nextId++`。不用数组长度：删除一条再添加，长度会让新 id 和旧 id 重复，5.3 节会验证这一点。

这一步用到：`ref`（第 1 章 1.3 节）、`v-model`（第 2 章 2.5 节）、`@click` 和 `@keyup.enter`（第 2 章 2.4 节）、`v-for`（第 2 章 2.3 节）。

<Exercise id="todoAdd" />

::: note
**你刚才做了什么决定？**事项是对象，不是字符串，以后加字段不用改已有代码。输入框里的文字单独放在 `draft` 里，点“添加”才变成事项：输入过程不属于数据。
:::

### 5.3 第 2 步：切换、删除和“还剩几项”（R2、R3）

“还剩几项”可以从 `todos` 数出来，它是派生数据（第 4 章 4.1 节）。有人会另存一个 `leftCount`，在添加、删除、勾选时加加减减。这样每多一个入口就多一个忘记更新的地方，而且 `v-model` 勾选根本不经过你的函数。

规则：能算出来的，不要存。用 `computed`。

<Exercise id="todoToggle" />

::: note
**你刚才做了什么决定？**`left` 是 computed，不是 ref。勾选、删除、编辑、将来任何新入口改了 `todos`，它都自动正确。删除按 id 过滤出新数组，不按文字，也不按下标。
:::

### 5.4 第 3 步：筛选（R4）

筛选有两份东西：当前选了哪个（`filter`），和要显示哪些（`visible`）。前者是用户选的，必须存。后者能从 `todos` 和 `filter` 算出来，所以是 computed。

不要在筛选时改 `todos`。筛选只是“看哪些”。一旦把数据过滤掉，就找不回来了。

<Exercise id="todoFilter" />

::: note
**你刚才做了什么决定？**`left` 仍然从 `todos` 算，不从 `visible` 算：剩余数量是所有事项的统计，不该随筛选变化。同一份源数据，两个 computed，各管各的问题。
:::

### 5.5 第 4 步：编辑，要能取消（R5）

编辑的难点在“取消”。如果输入框直接绑定 `todo.text`，每敲一个字都改了数据，按 Esc 时原文字已经丢了。所以编辑用两份新状态：`editingId` 记住正在编辑哪一条，`editText` 是草稿。回车时才把草稿写回事项，Esc 只是丢掉草稿。

模板里用 `v-if` / `v-else`（第 2 章 2.2 节）让正在编辑的那一行显示输入框。

<Exercise id="todoEdit" />

::: note
**你刚才做了什么决定？**“正在编辑”是界面状态，不属于事项。它放在应用里，不放进 `todo` 对象，所以保存数据时不会把它也存进去。
:::

### 5.6 第 5 步：用 watch 保存（R6）

保存分两半：创建 `todos` 时读，`todos` 改变后写。写是副作用（第 4 章 4.3 节），用 `watch`。

两个坑，练习的判题都会碰到：

1. `watch` 一个 ref 时，默认只看 `.value` 有没有被替换。`push`、勾选、编辑只改内部，不会触发。要加 `{ deep: true }`。
2. `localStorage` 里的内容不可信。没有数据时 `getItem` 返回 `null`；被改坏时 `JSON.parse` 抛错；解析出来也可能不是数组。读取要写在 `try` / `catch` 里，失败就回到示例数据。

读回数据后，`nextId` 也要接着已有的最大 id 往后，否则新事项的 id 会和旧的重复。

练习里用一个“模拟刷新”按钮：它销毁并重新创建 `TodoApp`，`setup` 重新运行，效果和刷新页面相同。组件是第 6 章的内容，这里只用它做测试。

<Exercise id="todoSave" />

::: note
**你刚才做了什么决定？**只保存 `todos`，不保存 `filter`、`draft`、`editingId`。要不要存，看“刷新后用户希望它还在吗”。筛选停在“已完成”再打开页面，多数人会觉得奇怪。
:::

### 5.7 回顾：需求对照和设计

| 需求 | 在哪一步实现 | 用到的知识 |
|---|---|---|
| R1 添加 | 5.2 | `ref`、`v-model`、`@keyup.enter`、`v-for`（第 1、2 章） |
| R2 切换、删除 | 5.3 | `v-model` 绑定对象属性、`:class`（第 2 章） |
| R3 还剩 N 项 | 5.3 | `computed`（第 4 章 4.1 节） |
| R4 筛选 | 5.4 | `computed`（第 4 章 4.1 节） |
| R5 编辑 | 5.5 | `v-if` / `v-else`、`@dblclick`、`@keyup.esc`（第 2 章） |
| R6 持久化 | 5.6 | `watch` 与 `deep`（第 4 章 4.3 节） |

**设计回顾。**

- **数据结构**：`todos` 是 `{ id, text, done }` 的数组。id 来自只增不减的计数器。
- **存下来的状态**：`todos`、`filter`、`draft`、`editingId`、`editText`。其中只有 `todos` 保存到 `localStorage`。
- **派生的状态**：`visible`、`left`。它们不存，永远从上面算出来。
- **副作用**：只有一个，`watch(todos)` 写 `localStorage`。
- **需求变了怎么改**：加“优先级”字段，改 `seed`、`add` 和模板，派生数据不动。加“清除已完成”，只多一个 `todos.value = todos.value.filter(...)`。加“按创建时间排序”，把排序写进 `visible`。

**可选的延伸**（没有判题，在练习的最后一步上自己改）：

1. 输入框失去焦点时也保存编辑（`@blur`）。想想：回车保存后输入框消失，会不会再触发一次 `blur`？
2. 加一个“清除已完成”按钮。它应该在没有已完成事项时禁用，怎样用 `left` 和 `todos.length` 判断？
3. 把整个应用拆成组件：`TodoItem` 负责一行，应用负责数据。第 6 章教你怎样拆，第 13 章会把一个看板拆成组件、组合式函数和表单。

::: selfcheck
<Sc :a="2">

有人给待办清单另存了一个 `leftCount = ref(2)`，在 `add` 里加 1，在 `remove` 里按删除的事项是否已完成减 1。复选框写的是 `v-model="todo.done"`。用户勾选一条事项后，页面上的“还剩”会怎样？

<Opt>减 1，因为 `done` 变了</Opt>
<Opt>不变，因为勾选触发了 `watch`，要手动刷新</Opt>
<Opt>不变，因为 `v-model` 直接改了 `todo.done`，没有经过 `add` 或 `remove`</Opt>

<template #explain>

解析：`leftCount` 只在你写了更新代码的地方变化。`v-model` 直接改 `todo.done`，不经过你的函数，所以数字不变。它是派生数据，用 `computed` 从 `todos` 算出来，就没有“忘记更新”这回事。第一项以为 Vue 会自动更新任何数字，只有 computed 才会。

</template>
</Sc>

<Sc :a="1">

编辑事项时，输入框写成 `v-model="todo.text"`。用户双击，删光文字，然后按 Esc。事项变成什么样？

<Opt>恢复成原文字，因为 Esc 触发了取消</Opt>
<Opt>文字是空的，原文字已经丢了</Opt>
<Opt>输入框保持打开，等用户重新输入</Opt>

<template #explain>

解析：`v-model` 每次输入都改数据，数据一变原文字就没了。Esc 的处理函数只能关闭输入框，找不回原文字。所以编辑用 `editText` 草稿，回车才写回事项，Esc 丢掉草稿。第一项把“取消”想成了 Vue 的内置能力，Vue 没有。

</template>
</Sc>

<Sc :a="0">

`const filter = ref('all')`，`visible` 是 computed。用户在“已完成”下勾选取消一条事项。为了让剩余数量也正确，`left` 应该从哪里算？

<Opt>从 `todos` 算，数 `done` 为 `false` 的事项</Opt>
<Opt>从 `visible` 算，因为用户看到的就是它</Opt>
<Opt>另存一个数字，在筛选和勾选时都更新</Opt>

<template #explain>

解析：“还剩几项”是所有事项的统计，和当前看到哪些无关。从 `visible` 算，在“已完成”下永远得到 0。另存数字会重新带来“忘记更新”的问题。同一份 `todos`，`visible` 回答“显示什么”，`left` 回答“还剩几项”，两个 computed 各自独立。

</template>
</Sc>

<Sc :a="1">

`watch(todos, save)` 没有写 `deep`。`todos` 是 `ref([])`。下面四个操作里，哪一个会触发 `save`？

```js
todos.value.push({ id: 3, text: 'a', done: false })   // ①
todos.value[0].done = true                            // ②
todos.value[0].text = 'b'                             // ③
todos.value = todos.value.filter(t => t.id !== 1)     // ④
```

<Opt>①②③④ 都会</Opt>
<Opt>只有 ④</Opt>
<Opt>只有 ①④</Opt>

<template #explain>

解析：侦听 ref 时，默认只跟踪 `.value`。只有 ④ 替换了 `.value`。①②③ 只修改了数组或对象的内部，不触发。所以保存功能要写 `{ deep: true }`。第三项以为 `push` 算替换，它修改的是同一个数组。

</template>
</Sc>

:::

::: summary
- 先决定数据：事项是 `{ id, text, done }` 对象，id 来自只增不减的计数器。
- 能算出来的不存：`visible` 和 `left` 都是 computed，不是另存的 ref。
- 编辑用草稿：输入框改 `editText`，回车才写回事项，Esc 才有东西可以取消。
- 保存用 `watch` 加 `deep: true`；读取要 `try` / `catch`，失败回到示例数据；读回后 `nextId` 接着最大 id。
- 只保存 `todos`，界面状态（筛选、草稿、正在编辑）不保存。
:::
