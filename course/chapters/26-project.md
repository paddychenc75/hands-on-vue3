---
title: 综合实战
id: project
stage: 6
chapter: 26
desc: 五步完成一个任务看板
---

<script setup>
import TaskAppDataFlow from '../figures/26-project/TaskAppDataFlow.vue'
import TaskBoard from '../labs/26-project/TaskBoard.vue'
</script>

# 综合实战：任务看板

::: goals
<Goal checks="sc:1,sc:2,ex:kanbanSave">为一个小应用设计数据、组件和逻辑，并把数据保存到 localStorage。</Goal>
<Goal checks="sc:0,sc:1,sc:2,ex:kanbanItem,ex:kanbanDue">在一个项目中使用第 2–9 章的知识。</Goal>
<Goal checks="sc:3,ex:kanbanStore,ex:kanbanRoute">完成项目后的练习使用阶段五的知识。</Goal>

:::

::: rt
阅读主线约 11 分钟，深入内容约 1 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: terms
数据模型
: 应用中数据的结构，例如 Task 有哪些字段。

拥有数据的组件
: 保存并修改某份数据的唯一组件。

派生数据
: 可以从其他数据算出来的数据。

持久化
: 把数据保存到 localStorage，刷新后仍在。
:::

::: why
你已经会写计数器、列表和表单。把它们放进同一个页面时，会遇到三个新问题：

1. 任务数据放在哪个组件里？放错位置时，两个组件各有一份数据，显示不一致。
2. 一个组件超过 200 行时，怎样拆分？拆错时，父子组件互相修改数据，很难调试。
3. 刷新页面后，任务消失。怎样保存？

原因：前面各章每次只练一个功能。功能放在一起时，你要先决定数据归谁、组件怎样分界。

本章用一个任务看板解决这三个问题。步骤是：先设计数据，再拆分组件，最后提取组合式函数并保存数据。
:::

::: note
**你在前面已经写过的零件：**本章把它们装到一起。

- TaskItem：用 props 接收任务，用事件通知父组件。见[第 5 章](/chapters/05-comm)实验台。
- TaskForm：用 v-model 输入新任务。见[第 5 章](/chapters/05-comm)实验台。
- 带校验的 TaskForm：离开字段时显示错误，并检查同名任务。见[第 11 章](/chapters/11-forms)实验台。
- useTaskStore：多个组件共享同一份任务。见[第 18 章](/chapters/18-pinia)实验台。
- /task/:id：用路由参数打开一个任务。见[第 19 章](/chapters/19-router)实验台。
:::

下图显示本章应用的数据流。

<Figure caption="数据和方法在 useTasks 中。App 用 props 把任务传给 TaskItem。TaskItem 用事件通知 App 修改数据。">
<TaskAppDataFlow />
</Figure>

按下面的步骤学习本章：

1. 点击一个步骤按钮。
2. 阅读这一步的说明。
3. 阅读代码区。代码区只显示这一步新增或修改的代码。
4. 在应用区操作应用。
5. 点击“下一步”。

<Lab id="demo-project" title="项目：任务看板" note="运行真实的 Vue。每一步都可以操作。">
<template #predict>
<Sc predict :a="2">

先猜：第 3 步中，shown 和 left 都是 computed。选择“进行中”，然后勾选“完成练习”。会发生什么？

```js
const shown = computed(() => tasks.value.filter(t => !t.done))  // 进行中
const left = computed(() => tasks.value.filter(t => !t.done).length)
```

<Opt>仍显示，加删除线，筛选要刷新</Opt>
<Opt>从列表中消失，“还剩”仍是 2 项</Opt>
<Opt>从列表中消失，“还剩”变为 1 项</Opt>

<template #explain>

解析：done 改变后，依赖 tasks 的两个 computed 都重新计算。shown 不再包含这一项，left 减 1。不需要手动刷新筛选，也不需要另存一份数据。打开实验台，切换到第 3 步，选择“进行中”，勾选“完成练习”。

</template>
</Sc>
</template>

<TaskBoard />
</Lab>

完成项目后，做下面的练习。第一道练习让你亲手写第 4 步的 TaskItem：

<Exercise id="kanbanItem" />

第二道练习写第 5 步的持久化：

<Exercise id="kanbanSave" />

1. 为任务添加截止日期。按日期排序。（第 4 章）<br>验收标准：

   - 每个任务显示截止日期。没有日期的任务显示“无”。
   - 列表按日期从早到晚排列。没有日期的任务排在最后。
   - 排序用 computed 实现。修改一个日期后，列表立即重新排序。

   <Exercise id="kanbanDue" />
2. 把任务数据放入 Pinia。（第 18 章）<br>验收标准：

   - tasks 和 add、toggle、remove 都在 store 中。App 不再保存任务数组。
   - 另一个组件显示剩余任务数。添加任务后，这个数字立即改变。
   - 组件用 `storeToRefs` 解构 state。刷新页面后，任务仍在。

   <Exercise id="kanbanStore" />
3. 添加 `/task/:id` 详情页。（第 19 章）<br>验收标准：

   - 点击任务标题后，地址变为 `/task/` 加任务的 id，页面显示这个任务。
   - 在地址栏直接打开 `/task/1` 并刷新，页面仍显示任务 1。
   - 打开不存在的 id 时，页面显示“任务不存在”，控制台没有错误。

   <Exercise id="kanbanRoute" />
4. 用 TypeScript 为 Task 定义接口。（第 20 章）在本地项目里完成，页面上没有练习框。<br>验收标准：
   - Task 接口有 id、text、done 三个字段。它们的类型是 number、string、boolean。
   - TaskItem 用 `defineProps<{ task: Task }>()` 声明 props，并为 toggle 事件声明参数类型。
   - 运行 `vue-tsc --noEmit` 时没有错误。传入缺少 text 的对象时，编辑器报错。
5. 用 Vitest 为 TaskItem 写一个组件测试。（第 22 章）在本地项目里完成，页面上没有练习框。<br>验收标准：
   - 测试挂载 TaskItem 后，检查页面显示任务的文字。
   - 测试点击复选框后，检查组件发出 toggle 事件，参数是任务的 id。
   - 运行 `npx vitest run` 时测试通过。把 emit 的事件名改错后，测试失败。
6. 把添加任务的输入框改为带验证的表单。（第 11 章）在本地项目里完成，页面上没有练习框。<br>验收标准：
   - 输入为空或只有空格时，不添加任务，并在输入框下方显示错误信息。
   - 用户还没有输入或提交时，不显示错误。
   - 添加成功后，输入框清空，错误信息消失。

::: deep 为组件写测试
用 Vitest 和 @vue/test-utils 测试组件。按下面的步骤操作：

1. 安装 `vitest`、`@vue/test-utils` 和 `jsdom`。
2. 在 vite.config 中设置 `test.environment` 为 `'jsdom'`。
3. 用 `mount` 挂载组件。
4. 用 `trigger` 触发事件。等待 DOM 更新。
5. 检查渲染结果和发出的事件。

```js
import { test, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import TaskItem from './TaskItem.vue'

test('点击复选框时发出 toggle 事件', async () => {
  const wrapper = mount(TaskItem, {
    props: { task: { id: 1, text: '写测试', done: false } },
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }  // action 替换为 vi.fn
  })
  expect(wrapper.text()).toContain('写测试')
  await wrapper.find('input[type=checkbox]').trigger('change')   // await：等待 nextTick
  expect(wrapper.emitted('toggle')[0]).toEqual([1])
})

test('组合式函数可以单独测试', () => {
  const { count, inc } = useCounter()
  inc()
  expect(count.value).toBe(1)
})
```
:::

::: pitfalls
1. trigger 和 setValue 返回 Promise。先 await，再检查 DOM。原因：DOM 在下一次更新后才改变。
2. 测试行为，不测试实现细节。检查用户看到的内容和组件发出的事件。原因：这样修改内部代码后，测试仍然有效。
:::

::: selfcheck
<Sc :a="2">

哪个操作会调用 `save`？

```js
const tasks = ref([{ id: 1, text: 'a', done: false }])
watch(tasks, v => save(v))      // 没有 deep
```

<Opt>tasks.value.push(t)</Opt>
<Opt>tasks.value[0].done = true</Opt>
<Opt>tasks.value = [...tasks.value, t]</Opt>

<template #explain>

解析：侦听一个 ref 时，默认只侦听 .value 的替换。push 和修改属性都不触发。加上 `{ deep: true }`，三种操作都会保存。

</template>
</Sc>

<Sc :a="0">

剩余任务的数量应该怎样得到？

<Opt>用 computed 从 tasks 计算</Opt>
<Opt>用另一个 ref 保存。添加和删除时手动修改</Opt>
<Opt>在模板中写一个循环来数</Opt>

<template #explain>

解析：派生数据用 computed。第二份数据容易和 tasks 不一致。

</template>
</Sc>

<Sc :a="1">

在 TaskItem 中点击复选框。谁修改 `task.done`？

<Opt>TaskItem 直接修改 props.task.done</Opt>
<Opt>TaskItem 发出 toggle 事件，App 调用 toggle 修改数据</Opt>
<Opt>浏览器自动修改</Opt>

<template #explain>

解析：子组件不修改 props。子组件发出事件。拥有数据的一方修改数据。

</template>
</Sc>

<Sc :a="0">

你完成了延伸练习“添加 /task/:id 详情页”。打开 /task/3 时，页面显示“任务不存在”。任务 3 确实存在。下面的代码错在哪里？

```js
const route = useRoute()
const store = useTaskStore()   // 创建时从 localStorage 读取任务
const task = computed(() =>
  store.tasks.find(t => t.id === route.params.id))
```

<Opt>route.params.id 是字符串，t.id 是数字</Opt>
<Opt>刷新页面后，Pinia 的数据被清空</Opt>
<Opt>computed 不跟踪 route 的变化</Opt>

<template #explain>

解析：路由参数总是字符串。`'3' === 3` 为假，所以 find 找不到任务。修复：写 `Number(route.params.id)`。store 创建时从 localStorage 读取数据，所以刷新不会丢失任务。route 是响应式的，computed 能跟踪 `route.params.id`。

</template>
</Sc>

<Sc :a="1">

回顾（第 13 章）：添加任务后，要把列表滚动到新任务。下面的代码为什么没有滚动到新任务？

```js
function add(text) {
  tasks.value.push({ id: Date.now(), text })
  listEl.value.lastElementChild.scrollIntoView()
}
```

<Opt>push 不触发更新，要替换整个数组</Opt>
<Opt>DOM 还没有更新，最后一项是旧任务</Opt>
<Opt>滚动只能写在 onUpdated 中</Opt>

<template #explain>

解析：第 13 章：修改数据后，Vue 在微任务中更新 DOM。push 之后立即读取，`lastElementChild` 还是旧的最后一项。修复：在 push 之后 `await nextTick()`。ref 数组的 push 会触发更新，只是不同步。onUpdated 也能读到新 DOM。但是它在每次更新后都运行，不只在添加任务时运行。

</template>
</Sc>

:::

::: summary
- 先设计数据。然后写模板。然后用 computed 计算派生数据。
- 界面复杂时，拆分组件。逻辑复杂时，提取组合式函数。
- 用 watch 保存数据。
:::
