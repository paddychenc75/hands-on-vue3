---
title: 更新队列与 nextTick
id: scheduler
stage: 4
chapter: 25
desc: 更新队列
---

<script setup>
import BatchedUpdateQueue from '../figures/25-scheduler/BatchedUpdateQueue.vue'
import FlushOrder from '../figures/25-scheduler/FlushOrder.vue'
import TickDemo from '../labs/25-scheduler/TickDemo.vue'
import QueueDemo from '../labs/25-scheduler/QueueDemo.vue'
import SchedulerStepper from '../labs/25-scheduler/SchedulerStepper.vue'
</script>

# 更新队列与 nextTick

::: goals
<Goal checks="sc:1">说明同步修改三次数据只渲染一次的原因。</Goal>
<Goal checks="sc:0,ex:focusTick,ex:phenoHeight">说明 nextTick 怎样等到 DOM 更新，并用 `flush: 'post'` 读取更新后的 DOM。</Goal>
<Goal checks="sc:2">说出一次刷新中各种回调的运行顺序。</Goal>
<Goal checks="sc:4,ex:miniScheduler">说明 queueJob 的去重和按 id 插入，说明 flushJobs 怎样处理运行中新入队的任务，并手写调度器的核心。</Goal>
<Goal checks="sc:5">判断 nextTick、Promise.then 和 queueMicrotask 的回调看到新 DOM 还是旧 DOM。</Goal>
<Goal checks="sc:6">说出哪些写法会触发 Maximum recursive updates exceeded，并解释为什么。</Goal>

:::

::: rt
阅读主线约 13 分钟，深入内容约 5 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
服务员不会每点一道菜就跑一趟厨房，而是**等你点完，一次性把整张单子送过去**。nextTick 就是“等菜上齐了再叫我”。
:::

::: terms
更新队列
: 等待执行的组件更新任务列表。

微任务
: 当前同步代码结束后立即运行的任务。

更新任务（job）
: 放进更新队列的函数。组件的更新任务是它的渲染副作用函数的 `runIfDirty`。

nextTick
: 等待 Vue 完成已经安排的 DOM 更新。

批量更新
: 多次修改数据，组件只渲染一次。
:::

::: why
你修改列表后，立即读取列表的高度。读到的是修改前的高度。

原因：修改数据时，Vue 不立即渲染。它把更新放入队列，等同步代码结束后一次完成。所以修改 10 次也只渲染一次。

本章说明更新队列怎样工作，以及 nextTick 为什么能等到 DOM 更新。队列的代码是 `runtime-core` 的 `scheduler.ts`，本章的迷你调度器是它的简化版，也是你在练习里要写的那一段。
:::

下图按时间顺序显示一次批量更新。

<Figure caption="三次修改只把 update 加入队列一次。同步代码结束后，微任务更新一次 DOM。然后 nextTick 之后的代码运行，读到新内容。">
<BatchedUpdateQueue />
</Figure>

### 25.1 一次修改之后发生了什么

修改数据时，Vue 不立即更新 DOM。第 24 章讲过，组件的渲染副作用函数（渲染函数和响应式连起来的那个 effect）带着一个调度函数：数据改变时，`trigger` 不直接运行它，而是调用它的调度函数。调度函数只做一件事：`queueJob(job)`，把组件的更新任务放进更新队列。从修改到 DOM 更新，按下面的步骤走：

1. 写入数据，`trigger` 通知渲染副作用函数。
2. 它的调度函数调用 `queueJob`。任务已经带着 `queued` 标记（已在队列里）时，直接忽略。
3. 否则 `queueJob` 把任务按组件 id 插进队列。队列此前是空的，就再安排一个微任务来刷新。
4. 当前同步代码继续往下运行，后面的修改重复第 1 到 2 步，都被忽略。
5. 同步代码结束，微任务运行 `flushJobs`，按顺序运行队列里的任务。

因此，同步修改十次数据，组件只渲染一次。你不需要自己合并修改。

父组件重新渲染时，props 改变的子组件在父组件的 patch 过程中同步更新，不单独排队（patch 的分发见第 31 章，列表的 diff 见第 30 章）。只有子组件自己的数据改变时，子组件才有自己的更新任务。

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

### 25.2 更新队列里有什么：两个数组，三类任务

调度器（`scheduler.ts` 这个模块）管理两个数组，里面放三类任务：

| 数组 | 放什么 | 顺序 |
|---|---|---|
| `queue` | **前置任务**：`flush: 'pre'` 的侦听器。**组件更新任务**：渲染副作用函数的 `runIfDirty` | 入队时按 id 从小到大插入。id 相同时，前置任务排在更新任务前面 |
| `pendingPostFlushCbs` | **后置任务**：`flush: 'post'` 的侦听器、onMounted、onUpdated 等钩子、模板 ref 的赋值 | 刷新时去重，再按 id 排序 |

3.5 没有单独的前置队列：前置任务和组件更新任务在同一个数组里，靠 `pre` 标记区分。

更新任务是一个函数，上面挂着几个字段：

| 字段 | 意思 |
|---|---|
| `id` | 组件实例的 `uid`，创建时递增，所以父组件的 id 比子组件小 |
| `queued` | 已在队列里。再次入队会被忽略 |
| `pre` | 前置任务。同一个 id 里，排在组件更新任务前面 |
| `allowRecurse` | 运行时允许再次入队自己。组件更新任务和有回调的侦听器带这个字段 |
| `disposed` | 已销毁。组件卸载时设置，刷新时跳过 |

真实实现把这四个字段合成一个整数 `flags`，每一位是一个标记（深入块“标记位的数值”）。迷你版用四个布尔字段，意思相同。

**后置任务的 id。**钩子和 post 侦听器没有 id，排序后顺序不变，仍是入队的先后。模板 ref 的赋值任务 id 是 -1，排在最前，所以在 `onMounted` 里已经能读到 ref。在组件之外创建的前置任务也没有 id，排序时按 -1 处理，排在最前面。

下面是 `queueJob` 的迷你实现：

<!-- mini:scheduler#queueJob -->
```js
function queueJob(job) {
  if (job.queued) return                  // 去重：同一个任务只排一次
  if (!job.pre && (!queue.length || getId(job) >= getId(queue[queue.length - 1]))) {
    queue.push(job)                       // 快路径：id 不小于队尾
  } else {
    queue.splice(findInsertionIndex(job), 0, job)
  }
  job.queued = true
  queueFlush()
}

// 二分查找：保持按 id 升序，所以父组件（id 小）总在子组件前面更新
function findInsertionIndex(job) {
  const id = getId(job)
  let start = 0
  let end = queue.length
  while (start < end) {
    const middle = (start + end) >>> 1
    const mid = queue[middle]
    if (getId(mid) < id || (getId(mid) === id && mid.pre)) start = middle + 1
    else end = middle
  }
  return start
}
```

三个要点：

1. `queued` 让同一个任务在队列里最多一份。
2. 同一个 id 里，前置任务排在没有 `pre` 的任务前面（`findInsertionIndex` 里的第二个条件）。这就是组件里的 pre 侦听器先于渲染的原因（第 26 章讲侦听器怎样接到这里）。
3. `queueFlush` 只在还没有安排刷新时才安排一次微任务。一次刷新期间不管入队多少次，都只有一个微任务。

后置任务走 `queuePostFlushCb(cb)`：把 `cb` 放进 `pendingPostFlushCbs`，同样调用 `queueFlush`。

::: deep 标记位的数值
真实实现里，更新任务的 `flags` 是一个整数，每一位是一个标记：

| 标记 | 值 | 对应迷你版 |
|---|---|---|
| `QUEUED` | 1 | `queued` |
| `PRE` | 2 | `pre` |
| `ALLOW_RECURSE` | 4 | `allowRecurse` |
| `DISPOSED` | 8 | `disposed` |

`getId(job)` 在 `job.id` 为空时：带 `PRE` 返回 -1，否则返回 `Infinity`，所以没有 id 的任务排在最后。真实的 `findInsertionIndex(id)` 从 `flushIndex + 1` 开始二分，保证新任务不会插到正在运行的任务前面。迷你版运行任务时先从数组里取出（`shift`），所以不需要这个下标。
:::

### 25.3 flushJobs 的过程：排序有什么用

微任务到来后，`flushJobs` 运行：

<!-- mini:scheduler#flushJobs -->
```js
function flushJobs() {
  while (queue.length) {
    const job = queue.shift()
    if (job.disposed) continue            // 所属组件已卸载
    if (job.allowRecurse) job.queued = false
    job()
    job.queued = false                    // 不允许递归的任务，运行期间再入队会被忽略
  }
  flushPostFlushCbs()
  currentFlushPromise = null
  if (queue.length || pendingPostFlushCbs.length) flushJobs()   // 后置任务里又改了数据：接着刷新
}
```

按步骤看：

1. 每一圈重新读 `queue.length`，所以运行中新入队的任务也会在这一轮运行。它们按 id 插进队列：id 比当前任务大的排在后面，id 更小的排在最前，马上就是下一个。
2. 带 `disposed` 的任务直接跳过。
3. 不带 `allowRecurse` 的任务，`queued` 要等运行结束才清除。所以它在运行中修改自己依赖的数据，不会再次入队。
4. 队列清空后，`flushPostFlushCbs` 把后置队列去重、按 id 排序，再逐个运行。
5. 清空 `currentFlushPromise`。如果这时又有新任务，再来一轮 `flushJobs`。后置任务里让组件入队，就是这样处理的。

**为什么按 id 排序。**有两个好处。第一，父组件先更新。父组件的 patch 会更新子组件的 props，子组件随后用新 props 渲染一次就够了。第二，父组件更新时可能卸载子组件。卸载时子组件的任务被标上 `disposed`，后面轮到它时直接跳过。实测：子组件的数据先改，父组件随后用 `v-if` 卸载子组件，一次刷新里只有 `parent render`，子组件的渲染函数一次都没有运行。

下面的实验台运行的就是迷你调度器本身，微任务换成了“单步”按钮：点“单步”时它先一次性把整个刷新真的跑完，再按顺序一步一步回放这次刷新的过程（所以回放时数据已经是刷新之后的结果）。

<Lab id="demo-scheduler-stepper" title="实验台：单步运行更新队列" note="运行本章的迷你调度器，不是真实的 Vue">
<template #predict>
<Sc predict :a="1">

先猜：依次点击“修改组件 3”“修改组件 1”“修改组件 3”“修改组件 2”。再全部运行。更新的运行顺序是什么？

<Opt>3、1、3、2</Opt>
<Opt>1、2、3</Opt>
<Opt>3、1、2</Opt>

<template #explain>

解析：第二次修改组件 3 时，它的更新任务还带着 queued 标记，所以被忽略。其余三个任务按 id 插入，运行顺序是 1、2、3。第一项以为每次修改都入队。第三项只记住了去重，忘了排序。打开实验台试一试。勾选“#1 更新时又修改组件 3”，再看新任务插在哪里。

</template>
</Sc>
</template>

<SchedulerStepper />
</Lab>

::: deep 父组件改 props 时，子组件的前置任务怎样赶在渲染之前
`flushPreFlushCbs` 不在 `flushJobs` 的主循环里，而在父组件 patch 子组件的过程中：`updateComponentPreRender`（第 31 章）先更新子组件的 props 和插槽，再调用 `flushPreFlushCbs(instance)`，取出队列里属于这个子组件的前置任务并运行，最后才渲染子组件。所以子组件里监听 props 的 pre 侦听器看到的是新 props，而 DOM 还是旧的。实测日志：

```text
parent pre watch              ← 父组件自己的 pre 侦听器，在主循环里按 id 先运行
parent render a=1
child pre watch sees 1        ← flushPreFlushCbs：props 已是新值，子组件还没渲染
child render n=1
```
:::

### 25.4 一次刷新中回调的顺序

三类任务按下面的顺序运行：

1. **前置任务**：`flush: 'pre'` 的侦听器。它们可以修改数据。
2. **组件更新任务**：按组件 id 从小到大运行。父组件先更新。
3. **后置任务**：`flush: 'post'` 的侦听器、onMounted、onUpdated、模板 ref 的赋值。这时 DOM 已经更新。

后置任务按加入队列的先后运行（它们没有 id，见 25.2）。模板 ref 的赋值例外，它排在最前面。下面三点解释实验台的日志：

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

### 25.5 nextTick：什么时候拿到新 DOM

[第 7.4 节](/chapters/07-lifecycle)用过 nextTick。它的实现只有三行：

<!-- mini:scheduler#nextTick -->
```js
function nextTick(fn) {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(fn) : p
}
```

`currentFlushPromise` 是 `queueFlush` 安排的那次刷新：`resolvedPromise.then(flushJobs)`，它在 `flushJobs` 全部结束后才完成。`flushJobs` 结束意味着更新任务、后置任务、后置任务引起的再一轮刷新都已完成。所以 nextTick 的回调运行时，DOM 已经是最新的。

还没有安排刷新时，`currentFlushPromise` 是 `null`。这时 nextTick 返回一个已经完成的 Promise，不等待任何更新。因此：

1. 先修改数据，再调用 nextTick。回调在这次更新之后运行，读到新 DOM。
2. 先调用 nextTick，再修改数据。回调排在刷新前面，在更新之前运行，读到旧 DOM。

```js
nextTick(() => log(el.textContent))   // 这时没有安排刷新：打印 0
count.value++                          // 现在才安排刷新
```

在组合式函数和第三方库中，常见“先 nextTick、后修改数据”的写法。读到旧 DOM 时，先检查调用顺序。

对 `Promise.then` 和 `queueMicrotask` 也是同样的道理：微任务按注册顺序运行，刷新的微任务在 `count.value++` 那一刻注册。在它前面注册的读到旧 DOM，在它后面注册的读到新 DOM。nextTick 的回调要等刷新结束后才进入微任务队列，所以排在同时注册的普通微任务后面（完整的对照见本节末尾的深入块）。

下面的练习修复一个常见错误：显示输入框后立即调用 focus()。

<Exercise id="focusTick" />

再看一个读取尺寸的例子：添加一项后，立即读取列表的高度，得到的仍是添加之前的值。

<Exercise id="phenoHeight" />

::: deep nextTick、Promise.then、queueMicrotask 和定时器的时序
下面的代码在浏览器里（Vue 3.5.43 开发构建）运行，每个回调打印它看到的 DOM 文本：

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

| 顺序 | 回调 | 看到的 DOM |
|---|---|---|
| 1 | 同步结束 | 旧 |
| 2 | then (修改前注册) | 旧 |
| 3 | queueMicrotask (修改前注册) | 旧 |
| 4 | then (修改后注册) | 新 |
| 5 | queueMicrotask (修改后注册) | 新 |
| 6 | nextTick | 新 |
| 7、8 | requestAnimationFrame、setTimeout | 新 |

`requestAnimationFrame` 和 `setTimeout` 都在全部微任务之后运行，DOM 已经更新。这两个之间谁先谁后，由浏览器决定（上面的运行里是 rAF 先），不要依赖。

真实的 `nextTick` 比迷你版多一个 `this` 的处理：`fn ? p.then(this ? fn.bind(this) : fn) : p`。
:::

### 25.6 在侦听器里读新 DOM：flush: 'post'

侦听器默认在 DOM 更新之前运行（[第 4 章](/chapters/04-computed)讲了 flush 的三个值）。这时回调读到的是旧 DOM。设置 `flush: 'post'`，回调作为后置任务，在 DOM 更新之后运行。

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

在 flush: 'post' 的回调中只读取或修改 DOM。不要修改模板使用的数据。否则组件再次渲染，可能造成无限更新（25.7）。

### 25.7 递归更新的保护

更新任务运行时可以让自己再次入队。如果每一轮都这样，刷新就永远不会结束。

开发环境里，`flushJobs` 用一个 Map 记录每个任务（和后置回调）在这一次刷新里运行了几次，每次运行前检查。同一个任务运行超过 100 次，就抛出 `Maximum recursive updates exceeded in component <…>`，`flushJobs` 返回的 Promise 被拒绝。`finally` 会清空队列并清除标记，所以页面不会卡死。

**生产构建没有这段检查**，行为不同：

- 同步循环的写法（带回调的 `watch`、渲染函数里改数据）会在同一个微任务里一直循环，主线程被占住，页面卡死。
- `onUpdated` 和 `flush: 'post'` 的侦听器走后置队列，会一层层递归调用 `flushJobs`，在几千次后以 `Maximum call stack size exceeded` 报错结束，页面之后还能用。

哪些写法会触发：

| 写法 | 结果 | 原因 |
|---|---|---|
| `onUpdated(() => { n.value++ })`，模板显示 `n` | 触发 | 每次更新后修改渲染读取的数据，又入队一次更新 |
| `watch(n, () => { n.value++ })` | 触发 | 有回调的侦听器带 `allowRecurse`，修改自己监听的数据会再次入队 |
| 渲染函数里 `n.value++` 并读取 `n` | 触发 | 渲染读取并修改同一个数据 |
| `watchEffect(() => { n.value++ })` | 不触发 | 没有回调，没有 `allowRecurse`，运行中它保持 `queued`，自己的修改不会让自己再次入队 |
| `watch(n, () => { m.value++ })`，`m` 不是 `n` 的来源 | 不触发 | 修改的不是自己依赖的数据 |

最后一行是最常见的安全写法：在侦听器里修改别的数据。修复前两行的办法是：把派生数据写成 `computed`，把一次性的修改移到事件处理函数里。

### 25.8 手写迷你调度器

把 25.2 到 25.5 压成几十行：去重、按 id 排序、微任务里刷新、`nextTick`。练习里的脚本已经给了两个组件的更新任务，也给了调度器的其余部分（`findInsertionIndex`、`queueFlush`、`flushPostFlushCbs` 等）。你来写 `queueJob`、`flushJobs` 和 `nextTick`，就是本章前面几节的三段代码。

<Exercise id="miniScheduler" />

这份调度器会在后面的章节里继续用：第 26 章的 `watch` 用它排前置任务，第 31 章的组件更新任务用它排队。

::: deep 迷你调度器和真实实现的差别
| 方面 | 真实实现（3.5.43） | 迷你版 |
|---|---|---|
| 去重和标记 | `job.flags` 里的 `QUEUED / PRE / ALLOW_RECURSE / DISPOSED` 位 | 布尔字段 `queued / pre / allowRecurse / disposed` |
| 队列遍历 | `flushIndex` 下标遍历，任务运行时仍在数组里 | `queue.shift()`，当前任务已不在队列里 |
| 递归保护 | 同一个任务超过 100 次报 `Maximum recursive updates exceeded` | 无 |
| 错误处理 | 任务抛错走 `callWithErrorHandling`，队列的标记位在 `finally` 里复位 | 无；任务抛错会让队列停摆 |
| 后置队列 | 嵌套的 `flushPostFlushCbs` 会并入正在运行的列表 | 不处理嵌套；后置任务里再入队的更新任务由 `flushJobs` 末尾的重新刷新处理 |
| 其他 | Suspense 的后置队列、`flushPreFlushCbs` 带递归检查 | 无 |
:::

::: pitfalls
1. 修改数据后，不要在同一段同步代码中读取 DOM。原因：DOM 还没有更新。先修改数据，再 `await nextTick()`。在修改之前调用 nextTick，读到的仍是旧 DOM。
2. 默认的侦听器读不到新 DOM。要在侦听器中操作 DOM，设置 `flush: 'post'` 或使用 watchPostEffect。
3. 不要在 onUpdated 或 flush: 'post' 的回调中修改模板使用的数据。原因：组件会再次渲染，可能无限更新。开发环境运行超过 100 次后报 Maximum recursive updates exceeded（25.7），生产环境没有这个保护。
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

解析：第二次和第三次修改时，更新任务已经有 queued 标记，Vue 不再加入。微任务中组件只渲染一次，onUpdated 也只运行一次。

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

解析：Item 的第二次修改时，它的更新任务还带着 queued 标记，不会重复入队。三个更新任务按 id 插入队列，运行顺序是 id 小的在前：App、List、Item。第一项以为每次修改都入队，并按修改顺序运行。第三项记住了去重，但按修改的先后排序，忘了队列是按 id 排序的。

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

解析：onUpdated 里修改渲染读取的 `n`，每次更新后又让组件的更新任务入队，刷新永远不会结束，运行超过 100 次后报错。第二项最迷惑：watchEffect 读取并修改同一个 `n`，但它没有回调，没有 allowRecurse 标记，运行中保持 queued，自己的修改不会让自己再次入队，所以不报错。第三项修改的是 `m`，不是它依赖的数据。

</template>
</Sc>

:::

::: summary
- 数据同步改变。DOM 在微任务中异步批量更新。同一个组件只渲染一次。
- 更新队列不重复加入任务，并按 id 排序。父组件先更新。
- nextTick 等待当前已经安排的那次刷新。先修改数据，再调用 nextTick，才能读到新 DOM。
- 在侦听器中操作新 DOM，用 `flush: 'post'` 或 watchPostEffect。
- 一次刷新的顺序：pre 侦听器 → 组件更新 → 后置任务 → nextTick 回调。
- 更新队列是两个数组，三类任务：`queue` 放前置任务和组件更新任务，`pendingPostFlushCbs` 放后置任务。钩子和 post 侦听器没有 id，排序后顺序不变；模板 ref 的 id 是 -1，排最前。
- `queueJob` 用 `queued` 去重，用二分查找按 id 插入，只在还没有安排刷新时安排一个微任务运行 `flushJobs`。
- `flushJobs` 遍历到队列清空。运行中新入队的任务同一轮运行，后置回调里新入队的任务再来一轮。卸载的组件带 `disposed` 标记，被跳过。
- 开发环境同一个更新任务运行超过 100 次就抛出 Maximum recursive updates exceeded。生产环境不检查。
- `nextTick` 等的是 `currentFlushPromise || resolvedPromise`。在修改之前注册的微任务读到旧 DOM，在修改之后注册的读到新 DOM。
:::
