---
title: 更新队列与 nextTick
id: scheduler
stage: 3
chapter: 13
desc: 更新队列
---

<script setup>
import BatchedUpdateQueue from '../figures/13-scheduler/BatchedUpdateQueue.vue'
import FlushOrder from '../figures/13-scheduler/FlushOrder.vue'
import TickDemo from '../labs/13-scheduler/TickDemo.vue'
import QueueDemo from '../labs/13-scheduler/QueueDemo.vue'
</script>

# 更新队列与 nextTick

::: goals
<Goal checks="sc:1">说明同步修改三次数据只渲染一次的原因。</Goal>
<Goal checks="sc:0,ex:focusTick,ex:phenoHeight">说明 nextTick 怎样等到 DOM 更新，并用 `flush: 'post'` 读取更新后的 DOM。</Goal>
<Goal checks="sc:2">说出一次刷新中各种回调的运行顺序。</Goal>

:::

::: rt
阅读主线约 8 分钟，深入内容约 2 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
服务员不会每点一道菜就跑一趟厨房，而是**等你点完，一次性把整张单子送过去**。nextTick 就是“等菜上齐了再叫我”。
:::

::: terms
更新队列
: 等待执行的组件更新任务列表。

微任务
: 当前同步代码结束后立即运行的任务。

nextTick
: 等待 Vue 完成已经安排的 DOM 更新。

批量更新
: 多次修改数据，组件只渲染一次。
:::

::: why
你修改列表后，立即读取列表的高度。读到的是修改前的高度。

原因：修改数据时，Vue 不立即渲染。它把更新放入队列，等同步代码结束后一次完成。所以修改 10 次也只渲染一次。

本章说明更新队列怎样工作，以及 nextTick 为什么能等到 DOM 更新。
:::

下图按时间顺序显示一次批量更新。

<Figure caption="三次修改只把 update 加入队列一次。同步代码结束后，微任务更新一次 DOM。然后 nextTick 之后的代码运行，读到新内容。">
<BatchedUpdateQueue />
</Figure>

### 13.1 批量更新：多次修改只渲染一次

修改数据时，Vue 不立即更新 DOM。它把组件的更新任务放入队列。数据改变时，Vue 按下面的步骤处理：

1. Vue 检查更新任务的 QUEUED 标记。任务已经在队列中时，Vue 不再加入。
2. Vue 按组件 id 把任务插入队列中的正确位置。父组件的 id 更小，所以父组件先更新。
3. 当前同步代码运行完成。
4. Vue 在一个微任务中按顺序运行所有任务。

父组件重新渲染时，props 改变的子组件在父组件的 patch 过程中同步更新，不单独排队（第 18 章讲 patch）。只有子组件自己的数据改变时，子组件才有自己的更新任务。

因此，同步修改十次数据，组件只渲染一次。你不需要自己合并修改。

<Lab id="demo-tick" title="实验台：同步修改三次数据" note="运行真实的 Vue">
<template #predict>
<Sc predict :a="1">

先猜：点击按钮后，代码同步执行 count.value++ 三次。onUpdated 运行几次？

```js
count.value++
count.value++
count.value++
```

<Opt>3 次</Opt>
<Opt>1 次</Opt>
<Opt>0 次</Opt>

<template #explain>

解析：修改数据只把组件的更新任务加入队列。同一个任务已经在队列中时，不再加入。所以三次修改只渲染一次，onUpdated 运行 1 次。第一项以为每次修改都立即渲染。第三项以为同步修改不触发更新。打开实验台，点击“count++ 三次”，看“组件重新渲染”的累计次数。

</template>
</Sc>
</template>

<TickDemo />
</Lab>

::: deep queueJob 的实现
下面是调度器的简化代码。它对应上面的四个步骤。

```js
// 简化
const queue = []
let pending = false
function queueJob(job) {
  if (job.flags & QUEUED) return                // 已经在队列中：不重复加入
  job.flags |= QUEUED
  const i = findInsertionIndex(job.id)          // 二分查找：父组件 id 小，排在前面
  queue.splice(i, 0, job)
  if (!pending) {
    pending = true
    Promise.resolve().then(flushJobs)           // 微任务：同步代码完成后运行
  }
}
function flushJobs() {
  for (const job of queue) {                    // 队列已经有序，不需要排序
    job.flags &= ~QUEUED
    job()
  }
  queue.length = 0
  pending = false
}
```
:::

### 13.2 nextTick 怎样等到 DOM 更新

[第 6.4 节](/chapters/06-lifecycle)用过 nextTick。本节说明它为什么能等到 DOM 更新。

修改数据后，Vue 把第一个任务加入队列时，用 `Promise.resolve().then(flushJobs)` 安排一次刷新（13.1 节）。Vue 把这个 Promise 保存为“当前的刷新 Promise”。nextTick 等待的就是它：

```js
// 简化
const resolvedPromise = Promise.resolve()
let currentFlushPromise = null

function queueFlush() {                          // queueJob 第一次加入任务时调用
  currentFlushPromise = resolvedPromise.then(flushJobs)
}
function nextTick(fn) {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(fn) : p
}
```

所以 nextTick 的回调排在 flushJobs 后面。flushJobs 运行完，DOM 已经更新，回调才运行。

还没有安排刷新时，currentFlushPromise 是 null。这时 nextTick 返回一个已经完成的 Promise。它不等待任何更新。因此：

1. 先修改数据，再调用 nextTick。回调在这次更新之后运行，读到新 DOM。
2. 先调用 nextTick，再修改数据。回调排在 flushJobs 前面，在更新之前运行，读到旧 DOM。

```js
nextTick(() => log(el.textContent))   // 这时没有安排刷新：打印 0
count.value++                          // 现在才安排刷新
```

在组合式函数和第三方库中，常见“先 nextTick、后修改数据”的写法。读到旧 DOM 时，先检查调用顺序。

下面的练习修复一个常见错误：显示输入框后立即调用 focus()。

<Exercise id="focusTick" />

再看一个读取尺寸的例子：添加一项后，立即读取列表的高度，得到的仍是添加之前的值。

<Exercise id="phenoHeight" />

### 13.3 在侦听器中读取新 DOM：flush: 'post'

侦听器默认在 DOM 更新之前运行（[第 4 章](/chapters/04-computed)讲了 flush 的三个值）。这时回调读到的是旧 DOM。设置 `flush: 'post'`，回调在 DOM 更新之后运行。

```js
watch(source, callback, { flush: 'post' })
watchPostEffect(() => { /* 读取 DOM */ })     // 等于 flush: 'post' 的 watchEffect
```

**场景：添加任务后，列表滚动到最后一项。**回调运行时，新任务的 li 已经在页面上。

```js
const listEl = useTemplateRef('list')

watch(() => tasks.value.length, (n, old) => {
  if (n > old) listEl.value.lastElementChild?.scrollIntoView({ behavior: 'smooth' })
}, { flush: 'post' })

// 模板：<ul ref="list"><li v-for="t in tasks" :key="t.id">{{ t.text }}</li></ul>
```

**场景：任务描述输入框按内容调整高度。**watchPostEffect 第一次运行也在挂载之后，所以 box.value 已经是元素。用户输入或从服务器加载描述时，高度都更新。

```js
const desc = ref('')
const box = useTemplateRef('box')

watchPostEffect(() => {
  desc.value                                   // 读取 desc，收集依赖
  box.value.style.height = 'auto'
  box.value.style.height = box.value.scrollHeight + 'px'
})
// 模板：<textarea ref="box" v-model="desc"></textarea>
```

在 flush: 'post' 的回调中只读取或修改 DOM。不要修改模板使用的数据。否则组件再次渲染，可能造成无限更新。

### 13.4 一次刷新中回调的顺序

调度器有三种任务。一次刷新按下面的顺序运行：

1. **前置任务**：`flush: 'pre'` 的侦听器。3.5 没有单独的前置队列。这些任务带有 PRE 标记，在主队列中排在同一组件的更新任务之前。它们可以修改数据。
2. **组件更新任务**：按组件 id 从小到大运行。父组件先更新。
3. **后置任务**：`flush: 'post'` 的侦听器、onMounted、onUpdated、模板 ref 的赋值。这时 DOM 已经更新。

后置任务按加入队列的先后运行。模板 ref 的赋值例外，它排在最前面。下面三点解释实验台的日志：

- `flush: 'post'` 的侦听器在数据改变的那一刻就进入后置队列。组件更新还没开始，所以它排在所有 onUpdated 之前。
- onUpdated 要等所在组件 patch 完才进入后置队列。
- 父组件这次渲染改变了子组件的 props 时，子组件在父组件的 patch 里同步更新。子组件先完成，所以子组件的 onUpdated 先进入队列，先运行。子组件的 onBeforeUpdate 则在父组件的 onBeforeUpdate 和 onUpdated 之间运行。

规则是：谁先 patch 完，谁的 onUpdated 先进入队列，先运行。

- 父组件改变了子组件的 props：子组件在父组件的 patch 里更新，先完成。顺序和上面的实验台相同。如果这时子组件自己的数据也改了，子组件自己的更新任务运行时已经没有事可做，顺序不变。
- 父组件没有改变子组件的 props：子组件不在父组件的 patch 里更新，只有自己的更新任务，排在父组件之后。例如父组件改了只有自己用的数据，子组件同时改了自己的数据：父组件的 onUpdated 先进入后置队列，所以它在子组件的 onUpdated 之前运行。

最后，`nextTick` 的回调运行。下图显示这个顺序。

<Figure caption="一次刷新按 ①→④ 的顺序运行。只有 ② 修改 DOM。所以 ③ 和 ④ 中可以读取新的 DOM。">
<FlushOrder />
</Figure>

<Lab id="demo-queues" title="实验台：一次修改中所有回调的顺序" note="运行真实的 Vue">
<template #predict>
<Sc predict :a="2">

先猜：点击 count++ 后，下面的回调都会运行。哪一个最后运行？

```js
watch(count, f)                     // pre
watch(count, f, { flush: 'post' })
onUpdated(f)                        // 父组件和子组件

count.value++
nextTick(f)
```

<Opt>watch flush: 'post'</Opt>
<Opt>父组件 onUpdated</Opt>
<Opt>nextTick 回调</Opt>

<template #explain>

解析：nextTick 在 count.value++ 之后调用，所以它等待这次刷新。它返回的 Promise 在整个更新队列完成后才完成。队列的顺序是：pre 侦听器，父组件更新（其中同步更新子组件），后置任务。onUpdated 和 post 侦听器都是后置任务。所以 nextTick 回调最后运行。打开实验台，点击 count++，看日志最上面一行。

</template>
</Sc>
</template>

<QueueDemo />
</Lab>

::: deep 防止无限更新
一个任务在运行时可能再次修改数据，并把自己加入队列。Vue 记录每个任务在一次刷新中运行的次数。只有开发环境检查这个次数。超过 100 次时，Vue 跳过这个任务，并显示警告：`Maximum recursive updates exceeded`。

生产环境不检查次数。页面会进入真正的无限循环。按下面的步骤找到原因：

1. 查看警告中的组件名。
2. 在这个组件中，查找 onUpdated 或 `flush: 'post'` 的侦听器。
3. 检查它们是否修改了渲染函数读取的数据。
4. 把这个修改移到 computed 或事件处理函数中。
:::

::: pitfalls
1. 修改数据后，不要在同一段同步代码中读取 DOM。原因：DOM 还没有更新。先修改数据，再 `await nextTick()`。在修改之前调用 nextTick，读到的仍是旧 DOM。
2. 默认的侦听器读不到新 DOM。要在侦听器中操作 DOM，设置 `flush: 'post'` 或使用 watchPostEffect。
3. 不要在 onUpdated 或 flush: 'post' 的回调中修改模板使用的数据。原因：组件会再次渲染，可能无限更新。
:::

::: selfcheck
<Sc :a="2">

组件显示 `count`，初始值是 0。`el` 是显示它的元素。两次输出是什么？

```js
count.value++
console.log(el.textContent)
await nextTick()
console.log(el.textContent)
```

<Opt>1，1</Opt>
<Opt>0，0</Opt>
<Opt>0，1</Opt>

<template #explain>

解析：修改数据后，更新任务只进入队列。第一次输出时 DOM 还没有更新，输出 0。await nextTick() 等待队列运行完成，第二次输出 1。

</template>
</Sc>

<Sc :a="0">

在一个点击事件中，同步执行 `n.value++` 三次。组件的 `onUpdated` 运行几次？

<Opt>1 次</Opt>
<Opt>3 次</Opt>
<Opt>0 次</Opt>

<template #explain>

解析：第二次和第三次修改时，更新任务已经有 QUEUED 标记，Vue 不再加入。微任务中组件只渲染一次，onUpdated 也只运行一次。

</template>
</Sc>

<Sc :a="1">

组件中有下面的代码。输出的顺序是什么？

```js
watch(n, () => log('watch'))
onUpdated(() => log('updated'))
// 在事件处理函数中：
n.value++
nextTick(() => log('tick'))
```

<Opt>tick → watch → updated</Opt>
<Opt>watch → updated → tick</Opt>
<Opt>updated → watch → tick</Opt>

<template #explain>

解析：watch 默认是 flush: 'pre'，在组件更新之前运行。onUpdated 是后置任务，在 DOM 更新之后运行。nextTick 的回调等待整个刷新完成，所以最后运行。

</template>
</Sc>

<Sc :a="0">

回顾（第 4 章）：组件模板显示 `count`，`el` 是显示它的元素。下面的侦听器使用默认选项。count 从 0 改为 1 后，打印什么？

```js
watch(count, () => console.log(el.textContent))
```

<Opt>打印 0</Opt>
<Opt>打印 1</Opt>
<Opt>打印空字符串</Opt>

<template #explain>

解析：第 4 章：watch 默认的 flush 是 pre。所以回调在组件更新之前运行。所以 DOM 中仍然是 0。要读到 1，设置 `flush: 'post'`，或在回调中 `await nextTick()`。元素已经挂载并显示 0，所以不是空字符串。

</template>
</Sc>

:::

::: summary
- 数据同步改变。DOM 在微任务中异步批量更新。同一个组件只渲染一次。
- 更新队列不重复加入任务，并按 id 排序。父组件先更新。
- nextTick 等待当前已经安排的那次刷新。先修改数据，再调用 nextTick，才能读到新 DOM。
- 在侦听器中操作新 DOM，用 `flush: 'post'` 或 watchPostEffect。
- 一次刷新的顺序：pre 侦听器 → 组件更新 → 后置任务 → nextTick 回调。
:::
