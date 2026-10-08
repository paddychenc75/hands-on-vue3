---
title: watch 与 effectScope 的实现
id: watch-impl
stage: 4
chapter: 26
desc: watch 怎样建在 effect 上：侦听源变成 getter、深度遍历、更新任务、三种 flush、清理与停止，以及 effectScope
---

<script setup>
import WatchPipeline from '../figures/26-watch-impl/WatchPipeline.vue'
import ScopeTree from '../labs/26-watch-impl/ScopeTree.vue'
</script>

# watch 与 effectScope 的实现

::: goals
<Goal checks="sc:0,sc:1,sc:2">说明侦听源怎样变成 getter，判断一个 watch 会不会因某次修改而运行，以及回调里的新值和旧值何时是同一个对象。</Goal>
<Goal checks="sc:3,sc:4,ex:miniWatch">说明三种 flush 怎样接到更新队列上，写出一个支持 getter、新旧值、immediate、onCleanup 和停止的迷你 watch。</Goal>
<Goal checks="sc:5,sc:6,sc:7,ex:miniEffectScope">说明组件里的侦听器为什么会自动停止，异步里创建的为什么不会，并写出一个支持嵌套和 stop 的迷你 effectScope。</Goal>

:::

::: rt
阅读主线约 11 分钟，深入内容约 5 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
想象一间**监控室**。每个侦听器是一名保安：他盯着指定的几块屏幕（侦听源），屏幕上的画面一变，他就去叫值班经理（更新队列）。经理决定他现在冲过去，还是等本轮巡逻结束再去。

保安上岗时，登记在当班的**班组**名下（effectScope）。班组解散时，名下所有保安一起下班。在班组之外私自上岗的人，没人登记，也就没人通知他下班。
:::

::: terms
侦听器
: 数据改变后运行回调的函数，例如 watch。

副作用函数（effect）
: 读取响应式数据，并在数据改变时再次运行的函数。

侦听任务
: 侦听器放进更新队列（或直接运行）的更新任务。数据变化时，它运行 getter，比较新旧值，再调用回调。

作用域（effectScope）
: 收集在它里面创建的副作用函数和子作用域，并能一次全部停止的对象。
:::

::: why
你在组件的 `setup` 里写了 `watch`，组件卸载后它自动停止。你在一个 `setTimeout` 回调里写了同样的 `watch`，组件卸载后它仍然在运行，并且一直占着内存。

你还会遇到别的怪事：`watch(state.count, cb)` 永远不触发；侦听一个对象时，回调里的新值和旧值是同一个对象；在 `await` 之后调用 `onWatcherCleanup` 会得到警告。

原因：这些行为都来自 `watch` 的实现。第 4 章讲用法，本章讲它怎样工作：`watch` 是建在 effect（第 24 章）上的一层薄封装，它的调度借用更新队列（第 25 章），它的生命周期挂在 effectScope 上。本章的迷你版建立在你在第 24、25 章写的零件上。
:::

### 26.1 watch 是 effect 加一个调度函数

`watch(source, cb)` 做的事可以用一句话说完：<b>用一个 getter 创建 effect，再把它的调度函数设成更新任务</b>。getter 读到的数据变了，effect 不重新运行，而是调用调度函数。调度函数把这个更新任务交给更新队列（或者直接运行它）。更新任务才决定要不要运行 getter、要不要调用你的回调。

下面是迷你版的全部：`watch` 和 `watchEffect` 是入口，`doWatch` 是实现。后面的 26.2 到 26.5 逐段讲它。

<!-- mini:watch#watch -->
```js
function watch(source, cb, options = {}) { return doWatch(source, cb, options) }
function watchEffect(fn, options = {}) { return doWatch(fn, null, options) }

function doWatch(source, cb, { immediate = false, deep = false, flush = 'pre' } = {}) {
  let cleanupFn
  const onCleanup = fn => { cleanupFn = fn }
  const runCleanup = () => { if (cleanupFn) { const f = cleanupFn; cleanupFn = undefined; f() } }

  let getter
  if (!cb) getter = () => { runCleanup(); source(onCleanup) }      // watchEffect：重新运行前先清理上一次
  else if (source.__v_isRef) getter = () => source.value
  else if (typeof source === 'function') getter = source
  else { getter = () => source; deep = true }                      // reactive 对象：默认深度侦听
  if (cb && deep) { const g = getter; getter = () => traverse(g()) }

  const INITIAL = {}
  let oldValue = INITIAL
  function job() {
    if (!runner.active) return                                     // stop 之后，已经排进队列的任务也不再运行
    if (!cb) { runner.run(); return }
    const newValue = runner.run()
    if (deep || oldValue === INITIAL || !Object.is(newValue, oldValue)) {
      runCleanup()
      cb(newValue, oldValue === INITIAL ? undefined : oldValue, onCleanup)
      oldValue = newValue
    }
  }
  job.allowRecurse = !!cb                                          // 回调里改自己的来源：允许再触发一次
  if (flush === 'pre') {
    job.pre = true
    if (currentInstance) job.id = currentInstance.uid              // 和所属组件的更新任务同一个 id，排在它前面
  }
  const scheduler = flush === 'sync' ? job : flush === 'post' ? () => queuePostFlushCb(job) : () => queueJob(job)

  const runner = effect(getter, { lazy: true, scheduler })
  runner.onStop = runCleanup
  if (cb) {
    if (immediate) job()
    else oldValue = runner.run()
  } else if (flush === 'post') queuePostFlushCb(job)
  else runner.run()
  return () => runner.stop()
}
```

倒数第六行是整个实现的核心：`effect(getter, { lazy: true, scheduler })`。这里的 `scheduler` 选项和第 24、31 章渲染副作用函数用的是同一个机制：渲染副作用函数的调度函数是 `queueJob(更新任务)`，侦听器的调度函数是更新任务本身，或者把它排进队列。`lazy` 让 effect 创建时不立即运行，因为侦听器要自己决定第一次怎么运行（迷你版用 `lazy` 选项做简化，真实的 3.5 没有这个选项，第 24 章讲过）。

真实的 3.5 把它拆成两层：`@vue/reactivity` 里的 `watch`（只认识 effect）和 `@vue/runtime-core` 里的 `doWatch`（给下层接上更新队列和组件）。迷你版把两层合在一起，细节见本节的深入块。

<Figure caption="一次修改怎样走到回调。虚线框里是 runtime-core 的 doWatch 提供的部分，其余在 @vue/reactivity。">
<WatchPipeline />
</Figure>

::: deep 真实的两层：baseWatch 和 doWatch
`@vue/reactivity` 里的 `watch`（源码里常叫 baseWatch）只认识 effect：侦听源处理、`traverse`、更新任务、清理、停止都在这里。你调用的 `watch`、`watchEffect` 都经过 `runtime-core` 的 `doWatch`，它给下层传三样东西：`scheduler`（按 `flush` 决定更新任务怎样排队）、`augmentJob`（给更新任务贴上队列要用的标记和 id）、`call`（用 `callWithAsyncErrorHandling` 调用，错误交给组件的错误处理，第 38 章）。

baseWatch 的骨架（简化，省略了警告、`call` 和暂停）：

```js
// reactivity/watch.ts(简化)
export function watch(source, cb, options = {}) {
  const { immediate, deep, once, scheduler, augmentJob } = options
  // ① 把侦听源变成 getter  ② 有 cb 并且 deep：getter = () => traverse(baseGetter(), depth)
  // ③ job：数据变了之后真正做事的函数
  const job = (immediateFirstRun) => { /* … */ }
  augmentJob && augmentJob(job)
  // ④ 创建 effect。数据变化时调用 scheduler，没有就直接调用 job
  effect = new ReactiveEffect(getter)
  effect.scheduler = scheduler ? () => scheduler(job, false) : job
  // ⑤ 第一次运行
  if (cb) immediate ? job(true) : (oldValue = effect.run())
  else if (scheduler) scheduler(job.bind(null, true), true)
  else effect.run()
  // ⑥ 返回句柄
  return watchHandle
}
```

第 ④ 步对应迷你版的 `effect(getter, { lazy: true, scheduler })`：真实版先 `new ReactiveEffect(getter)`，再设置 `effect.scheduler`，不需要 `lazy`。

`doWatch` 按 `flush` 传不同的 `scheduler`：

```js
// runtime-core/apiWatch.ts(简化)
if (flush === 'post') {
  baseWatchOptions.scheduler = job => queuePostRenderEffect(job)      // 进后置队列
} else if (flush !== 'sync') {                                         // 'pre'，默认值
  isPre = true
  baseWatchOptions.scheduler = (job, isFirstRun) => {
    if (isFirstRun) job()                                              // 第一次：同步运行
    else queueJob(job)                                                 // 之后：进更新队列
  }
}                                                                      // 'sync'：不传 scheduler
baseWatchOptions.augmentJob = job => {
  if (cb) job.flags |= ALLOW_RECURSE
  if (isPre) { job.flags |= PRE; if (instance) { job.id = instance.uid; job.i = instance } }
}
```
:::

### 26.2 侦听源怎样变成 getter，deep 怎样遍历

effect 只认识一个函数。所以不管你传什么侦听源，第一步都是把它变成 getter（对应 `doWatch` 中间那串 `if`）：

| 侦听源 | getter |
|---|---|
| ref | `() => source.value` |
| reactive 对象 | `() => traverse(source)`，遍历所有层，`deep` 默认为真 |
| 函数 | 函数本身 |
| 其他（数字、字符串） | 迷你版没有这一支。真实版用空函数并警告 |

真实版还支持数组（对每项按上面的规则求值）。这张表解释两件事。

**为什么 `watch(state.count, cb)` 不行。**`state.count` 在传参时就被读成了数字 `0`，`watch` 拿到的只是一个值。数字不是上表里任何一种，真实版的 getter 被设成空函数，effect 什么也没有读到，依赖是空的。开发环境会警告 `Invalid watch source`。要侦听一个属性，传 getter：`watch(() => state.count, cb)`。getter 的作用是让**读取**发生在 effect 里面。

**为什么 reactive 对象默认深度侦听。**reactive 对象本身没有“值”可读，读 `state` 这个变量不会触发任何 `get`。要建立依赖，就必须读它的属性，所以 Vue 对它调用 `traverse`，递归地读取每个属性：

```js
function traverse(value, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) return value
  seen.add(value)
  for (const key in value) traverse(value[key], seen)
  return value
}
```

**读取就是收集。**`value[key]` 经过 Proxy，每次读取都被 `track`。`traverse` 不做别的，只是把所有属性读一遍。它有两个后果：

- 每次依赖变化后 effect 重新运行，getter 里的 `traverse` 也重新遍历。实测：reactive 对象有 1000 个属性，`deep` 侦听下修改其中一个，1000 个属性被全部重新读取一遍；改成侦听 `() => state.ver`，一个属性都不读。大对象上只侦听你关心的值。
- 深层属性变了，对象仍然是同一个对象，所以不能靠比较新旧值来判断要不要运行回调。26.3 讲这一点。

::: deep 真实的 traverse：层数、循环引用和 markRaw
真实版的 `traverse` 多了三件事（简化）：

```js
// reactivity/watch.ts(简化)
function traverse(value, depth = Infinity, seen = new Map()) {
  if (depth <= 0 || !isObject(value) || value.__v_skip) return value   // __v_skip：markRaw 的对象
  if ((seen.get(value) || 0) >= depth) return value                    // 这个对象已经以不小于当前深度遍历过
  seen.set(value, depth)
  depth--
  if (isRef(value)) traverse(value.value, depth, seen)
  else if (isArray(value)) for (const v of value) traverse(v, depth, seen)
  else if (isSet(value) || isMap(value)) value.forEach(v => traverse(v, depth, seen))
  else if (isPlainObject(value)) for (const key in value) traverse(value[key], depth, seen)
  return value
}
```

- **深度限制（3.5）。**`deep: 2` 遍历两层。实测：`watch(() => d, cb, { deep: 2 })`，替换 `d.a.b` 会触发，修改 `d.a.b.c` 不会。对 reactive 对象写 `deep: 1`，只依赖它自己的属性，替换 `a.b` 不触发，替换 `a` 才触发。`deep: false` 或 `0` 对 reactive 对象表示只遍历一层。
- **循环引用。**`seen` 记录每个对象已经遍历的深度，再次遇到同一个对象时直接返回，所以 `circ.self = circ` 不会死循环。
- **markRaw。**对象标记过 `markRaw`（`__v_skip`）时，`traverse` 不进入，它内部的修改不会触发。
:::

### 26.3 更新任务：回调什么时候运行

数据变化后，调度函数把更新任务（`doWatch` 里的 `job`）交给更新队列。轮到它时，它做这几件事：

1. **检查是否已停止。**`runner.active` 为假就直接返回。已经排进队列的任务，停止之后到了也不会运行。
2. **重新运行 getter。**`runner.run()` 返回新值，同时重新收集依赖。
3. **比较。**`deep` 为真，或者这是第一次，或者 `Object.is(新值, 旧值)` 为假，才继续。值没变（例如 `ref` 先改成 1 再改回 0，同步完成）就不调用回调，也不会先调用清理函数。
4. **先清理，再调用回调。**调用 `runCleanup()`，然后 `cb(新值, 旧值, onCleanup)`，最后 `oldValue = newValue`。

有三个现象来自这几步。

**`deep` 跳过比较，所以新旧值是同一个对象。**深度侦听 `ref({ x: 1 })`，`list.value.push(2)` 之后 getter 返回的还是同一个对象，比较永远是“没变”，所以必须跳过比较。实测 `n === o` 为 `true`。需要旧值时，让 getter 返回拷贝：`watch(() => [...list.value], (n, o) => …)`。拷贝每次都是新数组，比较永远是“变了”，回调在每次依赖变化时都运行。

**第一次触发时的旧值是创建时的值。**不带 `immediate` 的 `watch` 在创建时就运行了一次 getter（`oldValue = runner.run()`），所以第一次触发时旧值是创建时的值。只有 `immediate` 的第一次调用，`oldValue` 还是哨兵 `INITIAL`：更新任务同步运行，新值是当前值，旧值是 `undefined`。

**`watchEffect` 没有比较。**它没有 `cb`：getter 就是副作用本身，更新任务只做 `runner.run()`，没有新旧值。getter 外面有一层包装，每次运行副作用之前先调用清理函数。`watchPostEffect` 和 `watchSyncEffect` 就是 `watchEffect` 加 `flush: 'post'` 或 `'sync'`。

真实版在比较之前还有一步脏检查，`once` 选项也在这里处理，见本节末尾的深入块。

::: deep 真实版更新任务多出的两步
- **脏检查。**侦听一个 computed，它依赖变了但算出的值没变时，更新任务检查 `effect.dirty`（第 24 章的版本号）后直接返回，getter 都不运行。实测：`watch(() => c.value, cb)`，`c` 是 `m % 2`，`m` 从 1 改到 3，getter 没有重新运行。
- **`once: true`。**回调被包了一层：调用原回调，然后停止自己。
:::

### 26.4 三种 flush 怎样接到更新队列

第 25 章讲了更新队列里的三类任务。`doWatch` 根据 `flush` 把更新任务接到不同的地方，对应 `doWatch` 里的这三行：

```js
job.pre = true                                    // 'pre'：带 pre 标记，id 是所属组件的 uid
const scheduler = flush === 'sync' ? job
  : flush === 'post' ? () => queuePostFlushCb(job)
  : () => queueJob(job)
```

| flush | 数据变化时 | 典型用途 | 风险 |
|---|---|---|---|
| `'pre'`（默认） | `queueJob(更新任务)`，带 `pre` 标记，进 `queue` | 根据数据改别的数据；发请求 | 回调里读到的是旧 DOM |
| `'post'` | `queuePostFlushCb(更新任务)`，进后置队列 | 读更新后的 DOM、测量尺寸 | 在回调里改数据会再触发一轮渲染 |
| `'sync'` | 不经过队列，在修改的那一刻直接运行 | 同步镜像到 Vue 之外的状态；调试 | 每次修改都运行，批量修改变成多次；可能在一个操作做到一半时运行 |

**为什么 pre 的更新任务先于组件渲染。**25.2 讲过：队列按 id 排序，id 相同时前置任务排在前面。组件里创建的 pre 侦听器，更新任务的 id 是所属组件的 uid（`currentInstance` 在第 31 章才会设置，迷你版里它一直是 `null`），和组件自己的更新任务 id 相同，所以先运行，再渲染。在组件之外创建的 pre 侦听器没有 id，排在最前面。

**`watchEffect` 的第一次运行。**pre 的第一次运行是同步的，发生在 `watchEffect()` 调用处，也就是 `setup` 里，早于组件第一次渲染（迷你版：`else runner.run()`）。post 的第一次运行进后置队列，挂载完成后才运行（`else if (flush === 'post') queuePostFlushCb(job)`）。这就是 `watchEffect` 默认在渲染前运行的原因：pre 的目的，是让侦听器在渲染之前把状态改完，同一轮刷新里只渲染一次。

实测一次修改后的完整顺序（一个组件里同时有四种侦听器）：`sync` 回调在 `n.value++` 那一行就运行；同步代码结束后，微任务里依次是 `pre` 回调、`watchEffect`、`onBeforeUpdate`、渲染；最后是后置队列里的 `post` 回调、`watchPostEffect`、`onUpdated`（25.4 讲过为什么 post 侦听器排在 `onUpdated` 前面）。

### 26.5 清理：回调挂在哪里，什么时候调用

第 4 章讲过 `onCleanup` 的用法。迷你版里它只有两行：`onCleanup(fn)` 把 `fn` 存进 `cleanupFn`；`runCleanup()` 运行它并清空。有三个地方调用 `runCleanup`：

1. 更新任务里，比较通过之后、调用回调之前。所以顺序是：`cleanup for 1`、然后 `run 2`。新值和旧值相同、回调没有运行时，清理函数也不运行。
2. `watchEffect` 的 getter 包装里，每次重新运行副作用之前。
3. `runner.onStop = runCleanup`：停止侦听器时，最后一次注册的清理函数也会运行，这就是卸载组件时请求会被取消的原因。

**`onCleanup` 参数和 `onWatcherCleanup` 的区别。**参数 `onCleanup` 在创建时就绑定了这个侦听器，在哪里调用都可以，包括 `await` 之后。全局的 `onWatcherCleanup` 要靠一个模块变量 `activeWatcher` 找到所属的侦听器：更新任务只在同步调用回调的那一刻把它设成当前侦听器，调用返回就恢复。异步回调遇到第一个 `await` 后，函数已经返回过一次，`activeWatcher` 早就恢复成 `undefined`。这时调用 `onWatcherCleanup`，得到警告，清理函数没有被注册。同理，在 `watch(getter, cb)` 的 getter 里调用也不行，因为只有回调被包在 `activeWatcher` 里。需要在 `await` 之后注册，用 `onCleanup` 参数，或者把 `onWatcherCleanup` 调用移到 `await` 之前。（迷你版没有 `onWatcherCleanup`。）

下面的练习实现迷你 watch 的核心：`doWatch`。前两章的零件已经折叠在脚本最上面。

<Exercise id="miniWatch" />

### 26.6 停止，以及组件卸载时的自动停止

`watch` 的返回值是停止函数，迷你版里是 `() => runner.stop()`。`stop` 做三件事：把 effect 从所有依赖的订阅列表里移除，调用 `onStop`（26.5 的清理函数），把 `active` 置为假。已经排进队列的更新任务到了也不会运行，因为它第一行检查 `runner.active`。

**组件里的侦听器为什么自动停止。**effect 创建时，如果当前有活动的作用域，就把自己登记到 `scope.effects`（迷你版：`activeScope && activeScope.effects.push(e)`，在第 24 章的 `effect` 里）。侦听器创建时是不是在某个作用域里，决定了它会不会被收集。

组件实例创建时带一个作用域，`instance.scope = new EffectScope(true)`。运行 `setup` 之前，Vue 把它设成活动作用域，结束后恢复。所以 `setup` 里创建的 effect 都登记在 `instance.scope.effects` 里，包括组件自己的渲染副作用函数。生命周期钩子（`onMounted` 等）被调用前，Vue 同样打开这个作用域，所以在 `onMounted` 里创建的侦听器也被收集。卸载时，`unmountComponent` 调用 `scope.stop()`，它逐个调用 `effects` 里每个 effect 的 `stop()`。

**异步里创建的为什么漏掉。**`setTimeout` 回调、`Promise.then`、事件处理函数里，没有活动的作用域。effect 没有登记到任何作用域，组件卸载时没人通知它。它还会继续订阅依赖，回调继续运行，闭包里引用的东西不能被回收。解决办法是自己保存句柄，在 `onUnmounted` 里调用 `stop()`，或者把创建放进一个自己管理的 `effectScope`。

<Lab id="demo-scope-tree" title="实验台：组件卸载时，哪些侦听器被停止" note="真实的 Vue；scope 的 active 和 effects 是读真实实例得到的">
<template #predict>
<Sc predict :a="1">

先猜：子组件创建了五个侦听器：A 在 `setup` 里，B 在 `onMounted` 里，C 在 `setTimeout` 回调里，D 在 `setup` 里的 `effectScope()` 中，E 在 `setup` 里的 `effectScope(true)` 中。挂载、等一秒、卸载，再让数据改一次。哪些侦听器的回调还会运行？

<Opt>A、B、C、D、E 都还会运行</Opt>
<Opt>C 和 E</Opt>
<Opt>只有 C</Opt>

<template #explain>

解析：A 和 B 登记在组件的作用域里，D 的作用域是组件作用域的子作用域，都随组件停止。C 创建时没有活动作用域，没人收集它。E 用 `effectScope(true)` 创建，是游离的（detached）：它不挂在任何父作用域下，组件停止时不会带上它。所以 C 和 E 泄漏。第三项忘了 detached 的作用域不属于组件。打开实验台，挂载后看每个侦听器创建时的活动作用域，卸载后点“改 src”看哪些计数还在增加。

</template>
</Sc>
</template>

<ScopeTree />
</Lab>

::: deep 暂停和恢复：pause 与 resume
真实的 `watch` 返回的句柄既是函数，也有 `pause`、`resume`、`stop` 属性（迷你版只返回一个停止函数）：

- `pause()`：给 effect 加 PAUSED 标记。暂停期间依赖变化时，effect 不调用调度函数，只记在 `pausedQueueEffects` 里。
- `resume()`：去掉标记，如果暂停期间有过触发，就补一次 `trigger`，走正常的 flush。实测：暂停期间改两次，恢复后在下一个 tick 运行一次。
- `stop()`：除了 `effect.stop()`，还会把 effect 从创建时所在作用域的 `effects` 里移除。
:::

### 26.7 effectScope：自动清理的来源

作用域解决的问题是：**一批副作用需要在同一个时刻停止**。迷你版的实现很小：

<!-- mini:watch#effectScope -->
```js
function effectScope(detached = false) {
  const scope = {
    active: true, effects: [], cleanups: [], scopes: [],
    parent: detached ? null : activeScope,
    run(fn) {
      if (!scope.active) return
      const prev = activeScope
      activeScope = scope
      try { return fn() } finally { activeScope = prev }
    },
    stop(fromParent) {
      if (!scope.active) return
      scope.active = false
      scope.effects.forEach(e => e.stop())
      scope.cleanups.forEach(fn => fn())
      scope.scopes.forEach(s => s.stop(true))
      if (scope.parent && !fromParent) scope.parent.scopes.splice(scope.parent.scopes.indexOf(scope), 1)
      scope.parent = null
    }
  }
  if (scope.parent) scope.parent.scopes.push(scope)
  return scope
}

function onScopeDispose(fn) { activeScope && activeScope.cleanups.push(fn) }
function getCurrentScope() { return activeScope }
```

几个要点，每一条都在 3.5.43 实测过：

- **收集靠“当前作用域”这个全局变量。**`run(fn)` 临时设置它，`fn` 里同步创建的 effect、watch、子作用域都登记到这个作用域。`finally` 里恢复成进入前的值，所以嵌套 `run` 能回到外层。`fn` 里 `await` 之后创建的不会被收集，原因和 26.6 一样。
- **游离的作用域。**`effectScope(true)` 不挂在父作用域下。父作用域 `stop` 时，它仍然活着。`instance.scope` 本身就是游离的：组件的作用域不挂在父组件的作用域下，子组件靠 `unmountComponent` 递归卸载。
- **`onScopeDispose(fn)`** 把 `fn` 放进当前作用域的 `cleanups`，作用域停止时运行。组件卸载时 `scope.stop()` 会调用它，`effectScope().run()` 里创建的同样有效，所以组合式函数用它清理（第 8 章 8.5 节讲过这个选择）。没有活动作用域时，真实版警告而不报错。
- **`scope.stop()` 之后 `scope.run()`**：返回 `undefined`，不运行 `fn`，真实版在开发环境警告 `cannot run an inactive effect scope`。
- **computed 不在 `effects` 里。**真实的 3.5 里，只有 `ReactiveEffect` 的实例会登记，computed 不是，所以 `scope.stop()` 不会“停止”它。实测：`scope.stop()` 之后修改依赖，读 `double.value` 仍然得到新的结果。它不泄漏，因为没有 effect 订阅它之后，它也不被任何依赖列表引用，可以被回收（所以第 8 章 8.5 节和第 35 章 35.1 节只说 `watch` 和 `watchEffect` 随作用域停止，`computed` 不用停止）。迷你版的 computed 内部用 `effect` 实现，会登记进作用域，这是和真实版的差别。

下面的练习实现迷你 effectScope，支持嵌套、游离和 stop。

<Exercise id="miniEffectScope" />

::: deep 用 effectScope 写“引用计数归零时销毁”的组合式函数
多个组件要共享同一份状态，状态里有 watch 或定时器。第一个使用者创建，最后一个使用者卸载时销毁（`createSharedComposable` 的思路，VueUse 里有同名函数）：

```js
function createSharedComposable(composable) {
  let users = 0, state, scope
  const dispose = () => {
    if (--users <= 0) { scope.stop(); state = scope = undefined }
  }
  return (...args) => {
    users++
    if (!state) {
      scope = effectScope(true)                    // 游离：不随第一个使用者卸载
      state = scope.run(() => composable(...args))
    }
    getCurrentScope() && onScopeDispose(dispose)   // 登记在“调用者”的作用域上
    return state
  }
}
```

两个作用域各司其职。共享状态住在游离的 `scope` 里，不属于任何调用者。每个调用者的作用域（组件的，或手动创建的）登记一个 `dispose`，作用域停止时计数减一。实测：两个作用域先后调用，创建只发生一次；先停一个，不销毁；停掉第二个，销毁运行一次。
:::

::: deep 调试：onTrack 和 onTrigger
`watch`、`watchEffect` 和 `computed` 接受 `onTrack` 与 `onTrigger` 选项，用来回答“这个侦听器依赖了什么”和“是什么让它运行的”：

```js
watchEffect(() => { n.value }, {
  onTrack(e)   { console.log('依赖', e.type, e.key) },          // 收集依赖时
  onTrigger(e) { console.log('触发', e.type, e.key, e.oldValue, e.newValue) }   // 被触发时
})
```

它们的实现位置在 `@vue/reactivity` 的 `Dep` 里，不在 `watch` 里。`watch` 只负责把选项赋给 effect：`effect.onTrack = options.onTrack`。`Dep.track` 建立订阅关系后检查 `activeSub.onTrack` 并调用；`Dep.notify` 遍历订阅者，对每个有 `onTrigger` 的订阅者调用它，**早于**它的调度函数和重新运行。这些调用点只存在于开发构建里，生产构建把它们删掉，所以不要把业务逻辑写在里面。组件的 `onRenderTracked` 和 `onRenderTriggered` 是同一个机制（第 31 章）。
:::

::: deep 迷你版和真实实现的差别
| 方面 | 真实实现（3.5.43） | 迷你版 |
|---|---|---|
| 侦听源 | `ref`、`reactive`、getter、以上的数组 | `ref`、`reactive`、getter（没有数组） |
| 选项 | `immediate`、`deep`（可给层数）、`once`、`flush`、`onTrack / onTrigger` | `immediate`、`deep`（布尔）、`flush` |
| 比较 | `hasChanged`，`deep`、`forceTrigger` 跳过比较，多源逐项比较；`effect.dirty` 为假时不运行 getter | `Object.is`，`deep` 跳过比较；没有脏检查 |
| 清理 | 第三个参数 `onCleanup` 和全局 `onWatcherCleanup`，清理函数是数组，按注册顺序运行 | 只有第三个参数 `onCleanup`，只存一个清理函数 |
| 返回值 | `WatchHandle`：可调用，带 `pause / resume / stop` | 只是一个 `stop` 函数 |
| 错误处理 | `call` 把错误交给组件（第 38 章） | 无 |
| 组件内的 `flush: 'pre'` | `job.id = instance.uid`，`job.i = instance` | `job.id = currentInstance.uid` |
| `effectScope` | 链表、`paused` 状态、`on / off`；computed 不登记 | 数组；有 `run / stop`、嵌套、`detached`；没有暂停；computed 内部用 `effect`，会登记 |
:::

::: pitfalls
1. 不要写 `watch(state.count, cb)`。原因：传参时就读成了数字，getter 是空函数，永远不触发。写 `watch(() => state.count, cb)`。
2. 不要对大对象写 `deep: true`，也不要期待深度侦听的旧值。原因：每次触发都重新遍历全部属性，并且新旧值是同一个对象。
3. 不要在 `await` 之后调用 `onWatcherCleanup`。原因：它依赖同步调用期间的 `activeWatcher`。用 `onCleanup` 参数，或者在 `await` 之前调用。
4. 不要在定时器、`Promise.then`、事件处理函数里创建侦听器而不保存句柄。原因：这时没有活动作用域，组件卸载时不会停止它。
5. 不要用 `flush: 'sync'` 处理会连续修改的数据。原因：每次修改都立刻运行回调，没有批量。
:::

::: selfcheck
<Sc :a="2">

下面的代码修改数据后，会发生什么？

```js
const state = reactive({ count: 0 })
watch(state.count, v => console.log('count', v))
state.count++
```

<Opt>控制台输出 `count 1`</Opt>
<Opt>Vue 自动把它转成 getter，输出 `count 1`</Opt>
<Opt>控制台警告侦听源无效，回调永远不会运行</Opt>

<template #explain>

解析：`state.count` 在传参时被读成数字 `0`，`watch` 收到的是一个数字。数字不是 ref、reactive 对象、函数或数组，getter 被设成空函数，effect 没有收集到任何依赖，开发环境警告 `Invalid watch source`。第二项以为 Vue 能看到你传参之前的表达式，它做不到：表达式在 `watch` 被调用之前就求值了。要侦听属性，传 getter `() => state.count`。

</template>
</Sc>

<Sc :a="1">

下面三个侦听器同时存在。执行 `state.user.name = 'b'` 之后，哪几个的回调会运行？

```js
const state = reactive({ user: { name: 'a' } })
watch(state, cbA)                                    // A
watch(() => state.user, cbB)                         // B
watch(() => state.user, cbC, { deep: true })         // C
```

<Opt>A、B、C</Opt>
<Opt>A 和 C</Opt>
<Opt>只有 C</Opt>

<template #explain>

解析：A 的侦听源是 reactive 对象，默认对它调用 `traverse`，遍历所有层，`user.name` 也被读到，所以 A 会运行。B 的 getter 只读了 `state.user`，返回同一个对象，依赖只有 `user` 这个属性，`name` 变了它不知道，也没有深度，所以不运行。C 加了 `deep`，getter 返回值被 `traverse`，会运行。第一项把 B 也算上，忘了 getter 只收集它读到的属性。

</template>
</Sc>

<Sc :a="0">

下面的代码，回调里 `n === o` 的结果是什么？

```js
const list = ref([1])
watch(list, (n, o) => console.log(n === o), { deep: true })
list.value.push(2)
```

<Opt>`true`：新旧值是同一个数组</Opt>
<Opt>`false`：旧值是修改前的拷贝</Opt>
<Opt>回调不运行，因为 `list.value` 的引用没有变</Opt>

<template #explain>

解析：`push` 修改的是同一个数组，Vue 不会为旧值做拷贝。`deep` 为真时更新任务跳过新旧值比较，直接调用回调，参数是同一个对象，所以输出 `true`。第三项把深度侦听当成了浅比较：正是因为 `deep`，才会在引用没变时仍然运行。要得到旧快照，侦听返回拷贝的 getter，例如 `() => [...list.value]`。

</template>
</Sc>

<Sc :a="2">

下面的组件里，点击按钮执行 `n.value++` 之后，日志的顺序是什么？

```js
watch(n, () => log('pre'))
watch(n, () => log('post'), { flush: 'post' })
watch(n, () => log('sync'), { flush: 'sync' })
onBeforeUpdate(() => log('beforeUpdate'))
function inc() { n.value++; log('end') }
```

<Opt>pre、beforeUpdate、post、sync、end</Opt>
<Opt>end、sync、pre、beforeUpdate、post</Opt>
<Opt>sync、end、pre、beforeUpdate、post</Opt>

<template #explain>

解析：`sync` 侦听器的调度函数就是更新任务本身，在 `n.value++` 触发时直接运行，所以 `sync` 最先。`inc` 里的同步代码继续，输出 `end`。微任务里的刷新：pre 的更新任务带 `pre` 标记，`id` 与组件相同，排在组件更新任务前面，所以 `pre`、再 `beforeUpdate`（它在组件的更新任务里）。`post` 在后置队列，最后运行。第二项把 `sync` 排在 `end` 之后，以为它也要等同步代码结束。

</template>
</Sc>

<Sc :a="1">

下面的代码，`onWatcherCleanup` 会怎样？

```js
watch(id, async (newId) => {
  const res = await fetch('/api/' + newId)
  onWatcherCleanup(() => console.log('清理'))
  data.value = await res.json()
})
```

<Opt>正常注册，下一次回调运行前输出“清理”</Opt>
<Opt>开发环境警告，清理函数没有被注册</Opt>
<Opt>抛出异常，回调中止</Opt>

<template #explain>

解析：`onWatcherCleanup` 靠模块变量 `activeWatcher` 找到所属的侦听器。这个变量只在回调同步运行期间有值。遇到第一个 `await`，回调函数返回了一个 Promise，`activeWatcher` 被恢复成 `undefined`。之后调用只会警告，不会抛出异常，回调继续执行，但清理函数没有登记。第三项以为它会抛错。解决：把调用移到 `await` 之前，或者用回调的第三个参数 `onCleanup`，它在创建时就绑定了 effect。

</template>
</Sc>

<Sc :a="2">

组件挂载后又卸载。之后改变 `src`，下面哪些回调还会运行？

```js
// setup
const src = ref(0)
watch(src, () => log('A'))                                   // A
setTimeout(() => watch(src, () => log('B')), 0)              // B：定时器回调里创建
const det = effectScope(true)
det.run(() => watch(src, () => log('C')))                    // C
```

<Opt>只有 B</Opt>
<Opt>A 和 B</Opt>
<Opt>B 和 C</Opt>

<template #explain>

解析：A 创建时 `instance.scope` 是活动作用域，登记在它的 `effects` 里，卸载时随 `scope.stop()` 停止。B 创建在定时器回调里，没有活动作用域，不会被收集。C 在 `effectScope(true)` 里，游离的作用域不属于组件，卸载组件不会停止它。所以 B 和 C 泄漏。第一项漏了 C：只想到异步创建会泄漏，没有想到 detached 作用域也不跟着组件走。

</template>
</Sc>

<Sc :a="0">

执行完下面的代码，`a.active` 和 `b.active` 分别是什么？

```js
const outer = effectScope()
const a = outer.run(() => effectScope())
const b = outer.run(() => effectScope(true))
outer.stop()
```

<Opt>`a.active` 为 `false`，`b.active` 为 `true`</Opt>
<Opt>两个都是 `false`</Opt>
<Opt>两个都是 `true`，嵌套的作用域要单独停止</Opt>

<template #explain>

解析：`a` 在 `outer.run` 里创建，且不是游离的，构造函数把它登记到 `outer.scopes`，`outer.stop()` 会逐个停止子作用域。`b` 传了 `true`，构造函数跳过登记，`outer` 不认识它。第二项忽略了 `detached`。第三项以为子作用域不自动停止，那样组件里的 `effectScope()` 就不会随组件卸载了。

</template>
</Sc>

<Sc :a="1">

下面的代码输出什么？

```js
const scope = effectScope()
const n = ref(1)
const double = scope.run(() => computed(() => n.value * 2))
scope.stop()
n.value = 5
console.log(double.value)
```

<Opt>`2`：scope 停止后 computed 不再更新</Opt>
<Opt>`10`：computed 没有登记在 scope 里，仍然可用</Opt>
<Opt>`undefined`：停止的 computed 返回空值</Opt>

<template #explain>

解析：3.5 的 `scope.effects` 只登记 `ReactiveEffect` 的实例，computed 不是，所以 `scope.stop()` 对它没有任何作用，读取时照常重新计算，得到 `10`。第一项是常见的印象：以为作用域会冻结里面的 computed。真正被停止的是在 scope 里创建的 `watch` 和 `watchEffect`。

</template>
</Sc>

:::

::: summary
- `watch` 是 effect 加调度函数：effect 的 getter 读侦听源，数据变时调用调度函数，由更新任务运行 getter、比较新旧值、清理上一次、调用回调。3.5 把核心放在 `@vue/reactivity` 的 `watch`，runtime-core 的 `doWatch` 接上队列和组件。
- 侦听源统一变成 getter。传 `state.count` 是传了一个数字，getter 为空，永远不触发。reactive 对象默认用 `traverse` 遍历所有层，`deep` 可以是层数，`seen` 处理循环引用，每次触发都重新遍历，大对象代价高。
- `deep` 和 reactive 源跳过新旧值比较，所以新旧值是同一个对象。`immediate` 的旧值是 `undefined`，`once` 在回调后停止自己，值没变时回调和清理函数都不运行。
- `pre` 的更新任务带 `pre` 标记，id 等于组件 uid，排在组件更新之前，第一次运行是同步的；`post` 进后置队列；`sync` 的调度函数就是更新任务本身，在修改时直接运行。
- 清理函数存在以 effect 为键的表里，在下一次回调之前和停止时调用。`onWatcherCleanup` 靠同步期间的 `activeWatcher`，所以只能在 `await` 之前调用；`onCleanup` 参数没有这个限制。
- effect 创建时登记到当前 effectScope。组件的 `instance.scope` 在 `setup` 和钩子期间是当前作用域，卸载时 `stop`。异步里创建的、`effectScope(true)` 里创建的不会被带走。computed 不登记在 scope 里。
- `onScopeDispose` 加游离的 scope 加引用计数，就能写出共享的组合式函数。`onTrack` 和 `onTrigger` 在 `Dep` 里被调用，只在开发构建里有效。
:::
