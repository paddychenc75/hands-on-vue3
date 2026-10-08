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
import SchedulerStepper from '../labs/13-scheduler/SchedulerStepper.vue'
</script>

# 更新队列与 nextTick

::: goals
<Goal checks="sc:1">说明同步修改三次数据只渲染一次的原因。</Goal>
<Goal checks="sc:0,ex:focusTick,ex:phenoHeight">说明 nextTick 怎样等到 DOM 更新，并用 `flush: 'post'` 读取更新后的 DOM。</Goal>
<Goal checks="sc:2">说出一次刷新中各种回调的运行顺序。</Goal>
<Goal checks="sc:4,ex:miniScheduler">说明 queueJob 的去重和按 id 插入，说明 flushJobs 怎样处理运行中新入队的任务，并手写一个迷你调度器。</Goal>
<Goal checks="sc:5">判断 nextTick、Promise.then 和 queueMicrotask 的回调看到新 DOM 还是旧 DOM。</Goal>
<Goal checks="sc:6">说出哪些写法会触发 Maximum recursive updates exceeded，并解释为什么。</Goal>

:::

::: rt
阅读主线约 16 分钟，深入内容约 2 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
服务员不会每点一道菜就跑一趟厨房，而是**等你点完，一次性把整张单子送过去**。nextTick 就是“等菜上齐了再叫我”。
:::

::: terms
更新队列
: 等待执行的组件更新任务列表。

微任务
: 当前同步代码结束后立即运行的任务。

job
: 放进更新队列的函数，例如组件的更新函数。

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

### 13.5 队列里有什么：job、标记位和 queueJob

前四节讲了现象。从这一节起，对照 `runtime-core/scheduler.ts` 讲实现。

调度器管理两个数组：

| 数组 | 放什么 | 顺序 |
|---|---|---|
| `queue` | 组件的更新 job，`flush: 'pre'` 的侦听器 job | 入队时按 id 从小到大插入 |
| `pendingPostFlushCbs` | `flush: 'post'` 的侦听器、onMounted、onUpdated、模板 ref 的赋值 | 刷新时去重，再按 id 排序 |

job 是一个函数，上面挂着几个字段。`id` 是组件实例的 `uid`，创建时递增，所以父组件的 id 比子组件小。`flags` 是一个整数，每一位是一个标记：

| 标记 | 值 | 意思 |
|---|---|---|
| `QUEUED` | 1 | 已在队列里。再次入队会被忽略 |
| `PRE` | 2 | pre 侦听器。同一个 id 里，排在组件更新前面 |
| `ALLOW_RECURSE` | 4 | 运行时允许再次入队自己。组件更新和有回调的侦听器带这个标记 |
| `DISPOSED` | 8 | 已销毁。组件卸载时设置，刷新时跳过 |

下面是 `queueJob` 的简化代码，保留了真实实现的三个关键点：

```js
// runtime-core/scheduler.ts（简化）
const queue = []
let flushIndex = -1                                // 正在运行的下标，不在刷新时是 -1
let currentFlushPromise = null
const resolvedPromise = Promise.resolve()

function queueJob(job) {
  if (job.flags & QUEUED) return                   // ① 去重
  const lastJob = queue[queue.length - 1]
  if (!lastJob || (!(job.flags & PRE) && getId(job) >= getId(lastJob))) {
    queue.push(job)                                // 快速路径：id 不小于队尾，直接追加
  } else {
    queue.splice(findInsertionIndex(getId(job)), 0, job)
  }
  job.flags |= QUEUED
  queueFlush()
}

function findInsertionIndex(id) {
  let start = flushIndex + 1                       // ② 从正在运行的任务后面找，不会插到它前面
  let end = queue.length
  while (start < end) {                            // 二分查找
    const middle = (start + end) >>> 1
    const middleJob = queue[middle]
    if (getId(middleJob) < id || (getId(middleJob) === id && middleJob.flags & PRE)) start = middle + 1
    else end = middle
  }
  return start
}

function queueFlush() {
  if (!currentFlushPromise) {                      // ③ 只安排一次
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}
```

三个关键点：

1. QUEUED 标记让同一个 job 在队列里最多一份。
2. 同一个 id 里，PRE 的 job 排在没有 PRE 的 job 前面。这就是组件内的 pre 侦听器先于渲染的原因（第 15 章讲侦听器怎样接到这里）。
3. `currentFlushPromise` 在 `flushJobs` 结束时才清空。一次刷新期间不管入队多少次，都只有一个微任务。

组件外创建的 pre 侦听器没有 id，排序时按 -1 处理，排在最前面。后置回调走 `queuePostFlushCb`：直接 push 到 `pendingPostFlushCbs`，同样调用 `queueFlush`。

### 13.6 flushJobs 的完整过程

微任务到来后，`flushJobs` 按下面的步骤运行：

1. 从 `flushIndex = 0` 开始遍历 `queue`。每一圈都重新读 `queue.length`，所以运行中新入队的任务也会在这一轮运行。
2. 带 `DISPOSED` 标记的 job 直接跳过。
3. 运行 job，并清除它的 `QUEUED` 标记。没有 `ALLOW_RECURSE` 的 job 运行结束后才清除，所以它在运行中修改自己依赖的数据时不会再次入队。
4. 遍历结束，清空 `queue`，运行 `flushPostFlushCbs`：先去重，再按 id 排序，然后逐个运行。
5. 清空 `currentFlushPromise`。如果这时 `queue` 或 `pendingPostFlushCbs` 又有内容，再运行一轮 `flushJobs`。

```js
// runtime-core/scheduler.ts（简化）
function flushJobs() {
  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex]
      if (job && !(job.flags & DISPOSED)) {
        checkRecursiveUpdates(seen, job)            // 仅开发环境，见 13.7
        if (job.flags & ALLOW_RECURSE) job.flags &= ~QUEUED
        job()
        if (!(job.flags & ALLOW_RECURSE)) job.flags &= ~QUEUED
      }
    }
  } finally {                                       // job 抛错时也会走到这里
    flushIndex = -1
    queue.length = 0
    flushPostFlushCbs(seen)
    currentFlushPromise = null
    if (queue.length || pendingPostFlushCbs.length) flushJobs(seen)
  }
}
```

**为什么按 id 排序。**有两个好处。第一，父组件先更新。父组件的 patch 会更新子组件的 props，子组件随后用新 props 渲染一次就够了。第二，父组件更新时可能卸载子组件。卸载时子组件的 job 被打上 `DISPOSED`，后面轮到它时直接跳过。实测：子组件的数据先改，父组件随后用 `v-if` 卸载子组件，一次刷新里只有 `parent render`，子组件的渲染函数一次都没有运行。

**flushPreFlushCbs 在什么时候调用。**不在 `flushJobs` 的主循环里，而在父组件 patch 子组件的过程中：`updateComponentPreRender` 先更新子组件的 props 和插槽，再调用 `flushPreFlushCbs(instance)`，取出队列里属于这个子组件的 pre job 并运行，最后才渲染子组件。所以子组件里监听 props 的 pre 侦听器看到的是新 props，而 DOM 还是旧的。实测日志：

```text
parent pre watch              ← 父组件自己的 pre 侦听器，在主循环里按 id 先运行
parent render a=1
child pre watch sees 1        ← flushPreFlushCbs：props 已是新值，子组件还没渲染
child render n=1
```

**运行中又有新任务。**在 job 里让别的组件入队，新 job 插在 `flushIndex` 后面，同一轮运行。在后置回调里让组件入队，要等 `flushPostFlushCbs` 结束，由第 5 步再来一轮。实测：父组件的 `onUpdated` 里把子组件用的数据加 1，日志依次是 `P render`、`P updated`、`C2 render`，然后 `await nextTick()` 返回。nextTick 等的 Promise 在递归的那一轮也结束之后才完成，所以它读到的 DOM 已经是第二轮的结果。

下面的实验台把这三个队列画出来，可以单步运行。

<Lab id="demo-scheduler-stepper" title="实验台：单步运行更新队列" note="按 scheduler.ts 的算法模拟，不是真实的 Vue">
<template #predict>
<Sc predict :a="1">

先猜：依次点击“修改组件 3”“修改组件 1”“修改组件 3”“修改组件 2”。再全部运行。更新的运行顺序是什么？

<Opt>3、1、3、2</Opt>
<Opt>1、2、3</Opt>
<Opt>3、1、2</Opt>

<template #explain>

解析：第二次修改组件 3 时，它的 job 还带着 QUEUED 标记，所以被忽略。其余三个 job 按 id 插入，运行顺序是 1、2、3。第一项以为每次修改都入队。第三项只记住了去重，忘了排序。打开实验台试一试。勾选“#1 更新时又修改组件 3”，再看新任务插在哪里。

</template>
</Sc>
</template>

<SchedulerStepper />
</Lab>

### 13.7 递归保护：Maximum recursive updates exceeded

job 运行时可以让自己再次入队。如果每一轮都这样，刷新就永远不会结束。开发环境用 `RECURSION_LIMIT` 检查：

```js
// runtime-core/scheduler.ts（简化）
const RECURSION_LIMIT = 100
function checkRecursiveUpdates(seen, fn) {
  const count = seen.get(fn) || 0
  if (count > RECURSION_LIMIT) {
    handleError('Maximum recursive updates exceeded in component <' + name + '>. …')
    return true
  }
  seen.set(fn, count + 1)
}
```

`seen` 是 `flushJobs` 里的一个 Map，记录每个 job（和后置回调）在整个刷新里运行了几次。每次运行前检查。同一个 job 运行超过 100 次，第 102 次检查时报错。几个实测结果（Vue 3.5.43 开发构建）：

- 报错信息先是一条警告 `Unhandled error during execution of app errorHandler`，然后异常抛出，`flushJobs` 返回的 Promise 被拒绝，浏览器控制台显示 `Uncaught (in promise) Maximum recursive updates exceeded in component <…>`。
- `app.config.errorHandler` 收不到这个错误，因为内部以没有实例的方式调用 `handleError`。
- `finally` 会清空队列并清除标记，所以页面不会卡死。
- 生产构建没有这段检查。带回调的 `watch`、渲染函数里改数据这类写法，会在同一个微任务里一直循环，主线程被占住，页面卡死。`onUpdated` 和 `flush: 'post'` 的侦听器走后置队列，会一层层递归调用 `flushJobs`，在几千次后以 `Maximum call stack size exceeded` 结束，页面之后还能用。

哪些写法会触发：

| 写法 | 结果 | 原因 |
|---|---|---|
| `onUpdated(() => { n.value++ })`，模板显示 `n` | 触发 | 每次更新后修改渲染读取的数据，又入队一次更新 |
| `watch(n, () => { n.value++ })` | 触发 | 有回调的侦听器带 `ALLOW_RECURSE`，修改自己监听的数据会再次入队 |
| 渲染函数里 `n.value++` 并读取 `n` | 触发 | 渲染读取并修改同一个数据 |
| `watchEffect(() => { n.value++ })` | 不触发 | 没有回调，没有 `ALLOW_RECURSE`，运行中它保持 `QUEUED`，自己的修改不会让自己再次入队 |
| `watch(n, () => { m.value++ })`，`m` 不是 `n` 的来源 | 不触发 | 修改的不是自己依赖的数据 |

最后一行是最常见的安全写法：在侦听器里修改别的数据。修复前两行的办法是：把派生数据写成 `computed`，把一次性的修改移到事件处理函数里。

### 13.8 nextTick 的实现和微任务时序

13.2 节讲了 `nextTick` 的思路。下面是真实的实现，比简化版多一个 `this` 的处理：

```js
// runtime-core/scheduler.ts（简化）
function nextTick(fn) {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(this ? fn.bind(this) : fn) : p
}
```

`currentFlushPromise` 是 `resolvedPromise.then(flushJobs)`。它在 `flushJobs` 全部结束（包括 13.6 的递归一轮和后置回调）后才完成。所以：

1. 修改数据之后调用，等的是这次刷新，回调读到新 DOM。
2. 修改数据之前调用，当时没有安排刷新，等的是 `resolvedPromise`。回调在刷新之前运行，读到旧 DOM。
3. 在 job 或后置回调里调用，`currentFlushPromise` 还在，回调要等这次刷新整个结束。

和原生的异步任务比较。下面的代码在浏览器里（Vue 3.5.43 开发构建）运行，每个回调打印它看到的 DOM 文本：

```js
await nextTick()                                   // 先让第一次渲染完成
Promise.resolve().then(() => log('then (修改前注册)'))
queueMicrotask(() => log('queueMicrotask (修改前注册)'))
count.value++                                      // 第一次修改：安排刷新微任务
Promise.resolve().then(() => log('then (修改后注册)'))
queueMicrotask(() => log('queueMicrotask (修改后注册)'))
nextTick(() => log('nextTick'))
setTimeout(() => log('setTimeout'), 0)
requestAnimationFrame(() => log('requestAnimationFrame'))
log('同步结束')
```

打印顺序和看到的 DOM：

| 顺序 | 回调 | 看到的 DOM |
|---|---|---|
| 1 | 同步结束 | 旧 |
| 2 | then (修改前注册) | 旧 |
| 3 | queueMicrotask (修改前注册) | 旧 |
| 4 | then (修改后注册) | 新 |
| 5 | queueMicrotask (修改后注册) | 新 |
| 6 | nextTick | 新 |
| 7、8 | requestAnimationFrame、setTimeout | 新 |

规则有两条：

- 微任务按注册顺序运行。刷新的微任务是在 `count.value++` 那一刻注册的。在它前面注册的微任务读到旧 DOM，在它后面注册的读到新 DOM。
- `nextTick` 的回调挂在 `currentFlushPromise` 上。刷新的微任务结束后，Promise 才完成，回调再多等一拍，所以排在同时注册的普通微任务后面。

`requestAnimationFrame` 和 `setTimeout` 都在全部微任务之后运行，DOM 已经更新。这两个之间谁先谁后，由浏览器决定（上面的运行里是 rAF 先），不要依赖。

### 13.9 手写一个迷你调度器

把 13.5 到 13.8 压成几十行：去重、按 id 排序、微任务里刷新、`nextTick`。练习里的脚本已经给了两个组件的更新任务，你来实现调度器本身。

<Exercise id="miniScheduler" />

::: deep 迷你调度器和真实实现的差别
迷你版省掉了这些东西：

- **标记位**：用 `job.queued` 一个布尔值代替 flags。没有 PRE、ALLOW_RECURSE、DISPOSED。
- **插入位置**：从队尾向前线性找位置，没有二分查找，也没有 `flushIndex`。运行中入队 id 更小的任务时，真实实现保证它插在正在运行的任务后面，迷你版没有处理这个情况。
- **后置队列**：没有 `pendingPostFlushCbs`，所以没有去重、按 id 排序和递归一轮。
- **递归检查**：没有 `RECURSION_LIMIT`。迷你版的 `for` 循环遇到无限入队会真的死循环。
- **错误处理**：真实实现用 `callWithErrorHandling` 运行 job，并在 `finally` 里清理状态。
:::

::: pitfalls
1. 修改数据后，不要在同一段同步代码中读取 DOM。原因：DOM 还没有更新。先修改数据，再 `await nextTick()`。在修改之前调用 nextTick，读到的仍是旧 DOM。
2. 默认的侦听器读不到新 DOM。要在侦听器中操作 DOM，设置 `flush: 'post'` 或使用 watchPostEffect。
3. 不要在 onUpdated 或 flush: 'post' 的回调中修改模板使用的数据。原因：组件会再次渲染，可能无限更新。开发环境运行超过 100 次后报 Maximum recursive updates exceeded（13.7），生产环境没有这个保护。
4. 不要依赖 `requestAnimationFrame` 和 `setTimeout` 的先后。两者都在微任务之后，DOM 已经更新，先后由浏览器决定。
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

<Sc :a="1">

组件 App（id 1）、List（id 2）、Item（id 3）各有一个只读取自己数据的渲染函数，Item 没有从父组件接收 props。下面的代码同步运行。三个组件的渲染函数各运行几次，顺序是什么？

```js
itemData.value++
listData.value++
appData.value++
itemData.value++
```

<Opt>Item、List、App、Item</Opt>
<Opt>App、List、Item，各一次</Opt>
<Opt>Item、List、App，各一次</Opt>

<template #explain>

解析：Item 的第二次修改时，它的更新 job 还带着 QUEUED 标记，不会重复入队。三个 job 按 id 插入队列，运行顺序是 id 小的在前：App、List、Item。第一项以为每次修改都入队，并按修改顺序运行。第三项记住了去重，但按修改的先后排序，忘了队列是按 id 排序的。

</template>
</Sc>

<Sc :a="2">

`count` 显示在组件里。下面的代码在事件处理函数中运行。三个回调打印的顺序是什么？

```js
count.value++
Promise.resolve().then(() => log('A'))
nextTick(() => log('B'))
queueMicrotask(() => log('C'))
```

<Opt>A、B、C</Opt>
<Opt>B、A、C</Opt>
<Opt>A、C、B</Opt>

<template #explain>

解析：`count.value++` 已经安排了刷新微任务。A 和 C 是直接注册的微任务，排在刷新微任务后面，按注册顺序运行。B 挂在刷新的 Promise 上，刷新结束后才进入微任务队列，所以排在 A 和 C 之后。第一项按代码的书写顺序判断，忘了 nextTick 多等一拍。第二项以为 nextTick 最先运行，但它要等刷新结束。

</template>
</Sc>

<Sc :a="0">

下面三段代码都在组件的 setup 里。`n` 和 `m` 是 ref，模板显示 `n`。哪一段会在开发环境报 `Maximum recursive updates exceeded`？

<Opt>`onUpdated(() => { n.value++ })`</Opt>
<Opt>`watchEffect(() => { n.value++ })`</Opt>
<Opt>`watch(n, () => { m.value++ })`</Opt>

<template #explain>

解析：onUpdated 里修改渲染读取的 `n`，每次更新后又让组件的更新 job 入队，刷新永远不会结束，运行超过 100 次后报错。第二项最迷惑：watchEffect 读取并修改同一个 `n`，但它没有回调，没有 ALLOW_RECURSE 标记，运行中保持 QUEUED，自己的修改不会让自己再次入队，所以不报错。第三项修改的是 `m`，不是它依赖的数据。

</template>
</Sc>

:::

::: summary
- 数据同步改变。DOM 在微任务中异步批量更新。同一个组件只渲染一次。
- 更新队列不重复加入任务，并按 id 排序。父组件先更新。
- nextTick 等待当前已经安排的那次刷新。先修改数据，再调用 nextTick，才能读到新 DOM。
- 在侦听器中操作新 DOM，用 `flush: 'post'` 或 watchPostEffect。
- 一次刷新的顺序：pre 侦听器 → 组件更新 → 后置任务 → nextTick 回调。
- `queue` 放带 id 的 job，`pendingPostFlushCbs` 放后置回调。`queueJob` 用 QUEUED 标记去重，用二分查找按 id 插入，用一个已完成的 Promise 安排一次 `flushJobs`。
- `flushJobs` 遍历到队列清空。运行中新入队的任务同一轮运行，后置回调里新入队的任务再来一轮。卸载的组件带 DISPOSED 标记，被跳过。
- 开发环境同一个 job 运行超过 100 次就抛出 Maximum recursive updates exceeded。生产环境不检查。
- `nextTick` 返回 `currentFlushPromise || resolvedPromise`。在修改之前注册的微任务读到旧 DOM，在修改之后注册的读到新 DOM。
:::
