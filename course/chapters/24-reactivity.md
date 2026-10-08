---
title: 响应式原理
id: reactivity
stage: 4
chapter: 24
desc: Proxy、track、trigger 手写实现
---

<script setup>
import TrackAndTrigger from '../figures/24-reactivity/TrackAndTrigger.vue'
import TargetMapStructure from '../figures/24-reactivity/TargetMapStructure.vue'
import LinkGrid from '../figures/24-reactivity/LinkGrid.vue'
import PrepareCleanup from '../figures/24-reactivity/PrepareCleanup.vue'
import RxLab from '../labs/24-reactivity/RxLab.vue'
import DepGraphLab from '../labs/24-reactivity/DepGraphLab.vue'
</script>

# 响应式原理

::: goals
<Goal checks="sc:1,ex:computedFill,ex:miniComputed">写出 reactive、effect、track 和 trigger。</Goal>
<Goal checks="sc:2">画出 targetMap 的三层结构。</Goal>
<Goal checks="sc:0,ex:depCleanup">说明每次运行副作用函数之前清理依赖的原因，并写出依赖清理。</Goal>
<Goal checks="sc:4,ex:versionComputed">说明 Dep、Link 和订阅者的关系，写出只靠版本号的 computed 缓存。</Goal>
<Goal checks="sc:5,sc:6,sc:7">说明批处理，以及数组 includes、push 和 Map 迭代的特殊处理。</Goal>
<Goal checks="sc:8,sc:9">区分四种 handler 和代理缓存，说明 ref 自动解包发生在哪里。</Goal>

:::

::: rt
阅读主线约 22 分钟，深入内容约 1 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
想象一个**订报系统**：每个属性是一份报纸，副作用函数是订户。读到 `state.price` 就自动订阅；price 改了，系统按名单送报，让订户重新运行。
:::

::: terms
Proxy
: JavaScript 对象，可以拦截另一个对象的读写。

副作用函数（effect）
: 读取响应式数据，并在数据改变时再次运行的函数。

收集依赖（track）
: 记录“哪个副作用函数读取了哪个属性”。

触发更新（trigger）
: 再次运行读取了被修改属性的副作用函数。

targetMap
: 一张表。它记录每个对象的每个属性被哪些函数读取。

Dep
: 一个可以被读取的数据（响应式属性、ref 或 computed）对应的记录。它有 `version`，并保存订阅它的链表。

订阅者（Subscriber）
: 读取 Dep，并在 Dep 改变时被通知的对象。副作用函数和 computed 都是订阅者。

Link
: 连接一个 Dep 和一个订阅者的节点。它同时挂在订阅者的依赖链表和 Dep 的订阅者链表上。

版本号（version）
: Dep 每次触发时加 1 的计数。订阅者对比它，判断依赖是否真的变了。
:::

::: why
你把 reactive 对象解构为几个变量，然后修改数据。界面不更新，控制台也没有报错。

原因：Vue 在你读取响应式属性时，记录谁在使用它。解构得到的变量是普通值，Vue 不再记录。

本章用 Proxy 手写 track 和 trigger。你会看到 Vue 怎样记录读取，并在修改时重新运行代码。
:::

### 24.1 读取时收集，写入时触发

响应式系统按下面的顺序工作：

1. 副作用函数开始运行。
2. 副作用函数读取 `state.price`。
3. Proxy 的 get 拦截读取，并收集依赖。
4. 其他代码写入 `state.price`。
5. Proxy 的 set 拦截写入，并触发更新。
6. 读取过 price 的副作用函数再次运行。

所以修改 price 时，只有读取过 price 的副作用函数运行。没有读取 price 的代码不受影响。下图说明 track 和 trigger 的过程。

<Figure caption="读取时，track 把副作用函数存入 dep。写入时，trigger 从 dep 取出它，并重新运行它。">
<TrackAndTrigger />
</Figure>

### 24.2 手写 reactive、effect、track 和 trigger

下面的代码约 40 行。它实现了上图的五步。

```js
let activeEffect = null
const targetMap = new WeakMap()   // 对象 -> Map(属性 -> Set<副作用函数>)

function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))
  dep.add(activeEffect)
  activeEffect.deps.push(dep)      // 反向记录，用于清理
}

function trigger(target, key) {
  const dep = targetMap.get(target)?.get(key)
  dep && [...dep].forEach(e => e !== activeEffect && e.run())
}

function reactive(obj) {
  return new Proxy(obj, {
    get(t, k, r) { track(t, k); return Reflect.get(t, k, r) },
    set(t, k, v, r) {
      const old = t[k]
      const ok = Reflect.set(t, k, v, r)
      if (!Object.is(old, v)) trigger(t, k)
      return ok
    }
  })
}

function effect(fn) {
  const e = {
    deps: [],
    run() {
      e.deps.forEach(dep => dep.delete(e))  // 先清理旧依赖
      e.deps.length = 0
      const prev = activeEffect
      activeEffect = e
      try { fn() } finally { activeEffect = prev }
    }
  }
  e.run()
  return e
}
```

run 每次运行前清理旧依赖。原因：分支改变后，函数可能不再读取某个属性。不清理时，这个属性改变仍会让函数运行。

trigger 跳过正在运行的副作用函数。否则函数修改自己读取的数据时，会无限循环。

<Lab id="lab-rx" title="实验台：手写响应式" note="上面的代码运行这个实验台">
<template #predict>
<Sc predict :a="1">

先猜：取消选择 showDiscount，然后修改 discount。「优惠提示」会再运行吗？

```js
tip = state.showDiscount
  ? `省 ${price*qty*discount}`
  : '无优惠'
```

<Opt>会。第一次运行时已经收集了 discount</Opt>
<Opt>不会。它上次运行时没有读取 discount</Opt>
<Opt>会运行，但显示的结果不变</Opt>

<template #explain>

解析：每次运行前，副作用函数先清理旧依赖，再重新收集。showDiscount 为 false 时，代码不读取 discount。所以 discount 不再是依赖，修改它不触发运行。第一项是不清理依赖时的结果。第三项同样以为 discount 仍是依赖。打开实验台，按下方的 3 个步骤操作，看运行次数和依赖表。

</template>
</Sc>
</template>

<RxLab />
</Lab>

下面的练习使用上面的 effect、track 和 trigger。你要写一个有缓存、按需计算的 computed。

<Exercise id="computedFill" />

<Exercise id="miniComputed" />

::: think 迷你 computed 少了什么
练习里的 `miniComputed` 只有缓存。它还不是一个依赖：外层副作用函数读取 `total.value` 时，没有人记录这个外层函数。

在本章的 effect 中试一下：

```js
effect(() => seen.push(total.value))
state.price = 20
```

迷你版得到 `seen = [20]`。外层函数没有重新运行。Vue 的 computed 得到 `[20, 40]`。组件渲染函数读取 computed 时也是这样：数据改变，页面才会更新。

真实的 computed 有两个角色：

1. 它是订阅者。它的 getter 读取 `state.price`，所以 `state.price` 改变时会通知它。
2. 它是依赖。外层函数读取 `.value` 时，它记录这个外层函数。它被通知后，会再通知外层函数。

给迷你版补两行就有第 2 个角色：

```js
get value() { track(self, 'value'); /* 其余不变 */ }
scheduler() { dirty = true; trigger(self, 'value') }
```

这里的 `self` 是 computed 对象本身。Vue 3.5 又多做了一步：用版本号判断依赖是否真的改变。依赖的版本号没变，就不重算。重算的结果和上次相同，computed 自己的版本号不变，外层函数也不会更新（[第 4 章](/chapters/04-computed)的深入内容）。
:::

### 24.3 targetMap 的三层结构

track 把依赖存进 targetMap。trigger 按对象和属性名从中查找。下图显示 targetMap 的三层结构。

<Figure caption="targetMap 有三层：对象 → 属性 → 读取过这个属性的副作用函数。trigger 按对象和属性名找到要运行的函数。">
<TargetMapStructure />
</Figure>

::: think targetMap 为什么使用 WeakMap？
targetMap 的键是原始对象。WeakMap 不阻止垃圾回收。对象没有其他引用时，对象和它的依赖一起被回收。Map 会一直引用对象，造成内存泄漏。
:::

::: think get 为什么使用 Reflect.get(t, k, r)？
第三个参数 r 让 getter 中的 `this` 指向代理对象。示例：`get full() { return this.first + this.last }`。如果使用 `t[k]`，this 指向原始对象。这时读取 first 和 last 不经过代理，Vue 不能收集依赖。
:::

::: think Vue3 为什么用 Proxy 代替 Object.defineProperty？
defineProperty 只能拦截已有的属性。Vue2 不能检测新增属性和数组下标赋值。Vue2 在初始化时还要遍历整个对象。Proxy 拦截整个对象的操作，包括新增、删除和遍历。Proxy 在访问嵌套对象时才代理它。
:::

### 24.4 用 toRaw 取得原始对象

有些 API 不接受 Proxy。`toRaw(proxy)` 返回代理背后的原始对象。

```js
const obj = { n: 1 }
const state = reactive(obj)
toRaw(state) === obj                          // true
```

**场景：把任务草稿存入 IndexedDB 或发给 Web Worker。**structuredClone、postMessage 和 IndexedDB 都复制数据。它们不能复制 Proxy，会抛出 DataCloneError。先用 toRaw 取得原始对象。

```js
const draft = reactive({ title: '写测试', tags: [] })
draft.tags.push('前端')

structuredClone(draft)                        // 抛出 DataCloneError
const copy = structuredClone(toRaw(draft))    // 正常：{ title: '写测试', tags: ['前端'] }
worker.postMessage(toRaw(draft))              // postMessage 使用同样的规则
```

注意下面两点：

1. 不要通过 toRaw 返回的对象修改数据。修改原始对象不经过 set 拦截，trigger 不运行，界面不变。
2. toRaw 只去掉你传入的那一层 Proxy。你把 reactive 对象放进普通对象后，里面的 Proxy 仍然存在，structuredClone 仍然报错。

toRaw 的原理很简单。Proxy 的 get 遇到特殊的键 `__v_raw` 时，直接返回原始对象。toRaw 读取这个键：

```js
// get 拦截中（简化）
if (key === '__v_raw') return target

function toRaw(observed) {
  const raw = observed && observed.__v_raw
  return raw ? toRaw(raw) : observed           // readonly(reactive(obj)) 有两层，逐层去掉
}
```

要让 Vue 从一开始就不代理某个对象，用 `markRaw`。它的用法见 [第 3 章](/chapters/03-refs)。

### 24.5 Vue 3.5 的实际实现

本章的手写版本说明了原理。Vue 3.5 的 `@vue/reactivity` 在下面几处和它不同。后面几节逐项展开，并标出对应的源码文件。

| 手写版本 | Vue 3.5 | 本章 | 源码文件（`packages/reactivity/src/`） |
|---|---|---|---|
| 第三层是 `Set<effect>` | 第三层是 `Dep`，订阅者放进双向链表 | 24.6 | `dep.ts` |
| 运行前清空依赖，运行时重建 | 先标记，复用旧 Link，运行后摘掉没用到的 | 24.6 | `effect.ts` |
| computed 只有 dirty 标记 | 标记加版本号，值没变就不通知下游 | 24.7 | `effect.ts`、`computed.ts` |
| trigger 直接运行 effect | 先通知、排队，批结束再运行 | 24.8 | `effect.ts` |
| 只处理普通对象 | 数组和 Map/Set 有专门的拦截 | 24.9 | `arrayInstrumentations.ts`、`collectionHandlers.ts` |
| 一种 reactive | 四种 handler，四张缓存表 | 24.10 | `reactive.ts`、`baseHandlers.ts` |
| 没有 ref | `RefImpl` 自带一个 Dep | 24.11 | `ref.ts` |

调度器怎样把组件更新放进更新队列，见[第 25 章](/chapters/25-scheduler)。`watch` 和 `effectScope` 的实现见第 26 章。

### 24.6 Dep、Link 和订阅者：依赖怎样存

手写版本的 targetMap 有三层：`WeakMap(对象) → Map(属性) → Set(副作用函数)`。Vue 3.5 的前两层不变。变的是第三层：Set 换成了 `Dep`。

先认三个角色：

- **Dep** 对应一个可以被读取的数据：一个响应式属性、一个 ref 或一个 computed。它有 `version`，还保存订阅它的链表。
- **订阅者**（Subscriber）读取 Dep，并在 Dep 改变时被通知。`ReactiveEffect`（effect、组件的渲染函数和侦听器都建立在它上面）和 computed 都是订阅者。
- **Link** 连接一个 Dep 和一个订阅者。一个订阅者读了几个 Dep，就有几个 Link。

每个 Link 同时挂在两条双向链表上：

<Figure caption="每一行是订阅者的依赖链表（nextDep、prevDep）。每一列是 Dep 的订阅者链表（nextSub、prevSub）。订阅者的 deps 指向行首的 Link。Dep 的 subs 指向列尾的 Link。">
<LinkGrid />
</Figure>

官方给 3.5 这次重构定的目标是更快、更省内存（同一个测试用例的内存下降 56%）。链表带来这几点好处：

1. 一个 Link 同时是正向记录（Dep 的订阅者）和反向记录（订阅者的依赖）。手写版本要用 Set 和 `deps` 数组各存一份。
2. 副作用函数重新运行时，可以复用已有的 Link。依赖不变的话，不用创建新对象。
3. 依赖按读取顺序排列。检查依赖是否变化时，从头扫一遍就行。

**运行前后，链表怎样变。** 手写版本是“先全删，再重建”。Vue 3.5 是“先标记，能复用就复用，最后摘掉没用到的”：

1. `prepareDeps`：运行前，把订阅者每个旧 Link 的 `version` 设为 -1，并让对应 Dep 的 `activeLink` 指向它。
2. 运行 `fn`：每次读取 Dep，`Dep.track()` 先看 `activeLink`。找到的 Link 版本是 -1，就把它恢复成 Dep 当前的 `version`，读取顺序变了就把它移到链尾。没找到，就新建 Link 接到链尾。
3. `cleanupDeps`：运行后，从链尾向前扫，`version` 仍是 -1 的 Link 这次没被读到。把它从两条链表上摘掉（`removeSub`、`removeDep`）。

<Figure caption="effect 读取 flag ? a : b。flag 变为 false 后重新运行：旧 Link 先标成 -1，读到的恢复或新建，剩下的摘除。">
<PrepareCleanup />
</Figure>

结果和手写版本一样：分支切换后，不再读取的 Dep 不会通知这个订阅者。区别是依赖没变时，整个过程不分配新对象。

下面的练习让你实现手写版本的依赖清理。真实实现里它是上面三步。

<Exercise id="depCleanup" />

**版本号怎样让“没有变化就不重新运行”。** 三个数字：

- `dep.version`：这个 Dep 每次触发（trigger）加 1。把 ref 设成相同的值不触发，所以不加。
- `globalVersion`：一个模块级变量。任何 Dep 触发都加 1。
- `link.version`：订阅者上次读取时，记下的 `dep.version`。

订阅者被通知后，默认的做法是 `runIfDirty()`：先检查，有变化才运行。

```ts
// reactivity/src/effect.ts(简化)
function isDirty(sub) {
  for (let link = sub.deps; link; link = link.nextDep) {
    if (link.dep.version !== link.version) return true   // 有依赖变了
  }
  return false
}
// （真实实现还要先刷新依赖里的 computed，见 24.7）
```

“被通知”和“运行”是两件事。通知很便宜，只排队。运行前再用版本号确认，依赖真的变了才运行。

### 24.7 computed：既是订阅者，又是 Dep

24.2 的“迷你 computed 少了什么”说过：真实的 computed 有两个角色。在源码里，`ComputedRefImpl` 的两个角色对应两组字段：

- 订阅者一面：`deps`、`depsTail`、`flags`。getter 里读取的数据通过它们订阅这个 computed。
- Dep 一面：`dep = new Dep(this)`。读取 `.value` 的外层 effect 通过它订阅这个 computed。

过程是这样的：

1. 创建时不运行 getter，只把 DIRTY 标志置位。
2. 读取 `.value`：先 `dep.track()`（让外层订阅者订阅它），再调用 `refreshComputed`。
3. 依赖改变时，Dep 调用 computed 的 `notify()`。它只做两件事：置 DIRTY 标志，然后返回 true，让调用方继续通知它自己的订阅者。**getter 不运行。**
4. `refreshComputed` 决定要不要运行 getter，有三道关：
   - 有订阅者而且没有 DIRTY：依赖肯定没变，直接返回。
   - `computed.globalVersion` 等于全局的 `globalVersion`：上次检查之后，没有任何数据变过，直接返回。
   - 算过，而且 `isDirty(computed)` 为 false：每个依赖的 version 都没变，直接返回。
5. 三道关都过不去，才运行 getter。得到新值后，用 `hasChanged` 比较：**值变了，才让 computed 自己的 `dep.version` 加 1。**

第 5 步保证了 3.4 起的行为：值没变，下游不重新运行。

```js
const n = ref(1)
const isOdd = computed(() => n.value % 2 === 1)
effect(() => console.log('odd?', isOdd.value))   // 打印 odd? true

n.value = 3   // isOdd 重新计算，结果仍是 true：effect 不运行
n.value = 4   // isOdd 变成 false：effect 运行，打印 odd? false
```

`n.value = 3` 时发生了什么：n 通知 isOdd（打 DIRTY 标志），isOdd 又通知 effect。effect 被通知后执行 `runIfDirty`，`isDirty` 检查到它依赖的 isOdd，先 `refreshComputed(isOdd)`。结果没变，`isOdd.dep.version` 不变，effect 不运行。

没有订阅者的 computed 更省：它不挂在上游 Dep 的订阅者链表上，所以不接收通知，只靠第 4 步的后两道关判断。第一个订阅者出现时，它才把自己挂到依赖上。最后一个订阅者离开，它又摘下来。

<Lab id="lab-depgraph" title="实验台：依赖图查看器" note="跑的是真实的 Vue 3.5，页面读取的是真实对象的内部字段">
<template #predict>
<Sc predict :a="1">

先猜：下面三个订阅者。把 n 从 1 改成 3（奇数变成奇数）。哪一项正确？

```js
const parity = computed(() => (n.value % 2 ? '奇' : '偶'))
effect(() => parity.value)                      // 渲染 A
effect(() => (tab.value ? n.value : m.value))   // 渲染 B
```

<Opt>parity 重新计算，渲染 A 也运行</Opt>
<Opt>parity 重新计算，渲染 A 被通知，但不运行</Opt>
<Opt>parity 不重新计算，渲染 A 不被通知</Opt>

<template #explain>

解析：n 的 version 加 1，所以 parity 被通知并打上 DIRTY。渲染 A 也被通知，因为 parity 把通知传给了它的订阅者。渲染 A 的 `runIfDirty` 先刷新 parity：重新计算，结果仍是“奇”，parity 的 version 不变，所以渲染 A 不运行。第一项忽略了 version 检查。第三项以为 computed 在 notify 时会先比较值，其实 notify 不计算。

</template>
</Sc>
</template>

<DepGraphLab />
</Lab>

下面的练习让你实现 3.5 的 computed 缓存：只靠版本号，不用 dirty 标记和 scheduler。

<Exercise id="versionComputed" />

### 24.8 批处理：一次修改，先排队再运行

一次修改可能通知多个订阅者，一个操作也可能包含多次写入。如果每次写入都立刻运行订阅者，同一个 effect 会运行很多次，还会读到只改了一半的数据。

```js
const list = reactive([])
effect(() => console.log('len', list.length))   // 打印 len 0

list.push('a', 'b', 'c')   // 只打印 len 3：三次下标写入和一次 length 写入合成一批
list[3] = 'd'              // 打印 len 4
list[4] = 'e'              // 打印 len 5：两次独立的赋值，各自运行一次
```

机制在 `effect.ts` 里：

- `batchDepth` 记录嵌套层数。`startBatch()` 加 1，`endBatch()` 减 1。只有减到 0（最外层）才真正刷新。
- `trigger`、`Dep.notify`、数组的 `push` 等内部操作都会包一层 `startBatch`/`endBatch`，所以嵌套时只刷新一次。
- effect 的 `notify()` 只做排队：置 NOTIFIED 标志，挂到 `batchedSub` 链表。已有 NOTIFIED 就不再挂，所以**同一批里一个订阅者只排一次**。computed 的 `notify()` 只打脏标记，刷新时不运行它。
- `endBatch()` 取出排队的订阅者，清掉 NOTIFIED，调用它的 `trigger()`：有 `scheduler` 就调 `scheduler`，没有就 `runIfDirty()`。

```ts
// reactivity/src/effect.ts(简化)
function endBatch() {
  if (--batchDepth > 0) return          // 嵌套：只有最外层刷新
  while (batchedSub) {
    const e = batchedSub
    batchedSub = e.next
    e.flags &= ~NOTIFIED
    e.trigger()                          // scheduler() 或 runIfDirty()
  }
}
```

运行顺序和订阅顺序一致。`Dep.notify` 从最后一个订阅者往前通知，排队是后进先出，取出时顺序又反过来。

**和第 25 章的分工。** 响应式层的批只覆盖“一次写入”的内部。两次独立的赋值是两批，没有 scheduler 的 effect 会各运行一次。组件的渲染 effect 有 scheduler：批结束时它只做 `queueJob`，真正的渲染等微任务。所以多次写入合并成一次渲染，靠的是[第 25 章](/chapters/25-scheduler)的更新队列。

::: note
`startBatch` 和 `endBatch` 是内部函数。`vue` 和 `@vue/reactivity` 都没有导出它们，业务代码不能用它们合并两次赋值。
:::

### 24.9 数组和集合：为什么要特殊处理

**数组。** `length` 和下标只是普通的 key，但数组操作会同时改变它们。`trigger` 里有专门的规则：

- 给数组新增一个下标：触发这个下标的 Dep、`length` 的 Dep 和 `ARRAY_ITERATE_KEY` 的 Dep。
- 设置 `arr.length = n`：触发 `length`、`ARRAY_ITERATE_KEY`，以及下标大于等于 n 的 Dep。读取 `arr[2]` 的 effect 会重新运行，读取 `arr[0]` 的不会。

`ARRAY_ITERATE_KEY` 是一个 Symbol，代表“整体读取了这个数组”。`map`、`forEach`、`includes` 和 `for...of` 等方法，在 `arrayInstrumentations` 里先对原始数组 `track(raw, 'iterate', ARRAY_ITERATE_KEY)`，再在原始数组上执行。所以它们不会对每个下标各登记一次，任何下标或长度的变化都会触发这个 Dep。

`includes`、`indexOf`、`lastIndexOf` 由 `searchProxy` 处理：

1. 在原始数组上，用传入的参数查找。
2. 找不到，而且参数是代理，就换成 `toRaw(参数)` 再找一次。

原因：数组里存的是原始对象，而 `list[0]` 取出来的是代理。

```js
const raw = { id: 1 }
const list = reactive([raw])
list.includes(raw)             // true：第一次就找到
list.includes(list[0])         // true：list[0] 是代理，第二次用原始对象找到
toRaw(list).includes(list[0])  // false：原生 includes 不认识代理
```

`push`、`pop`、`shift`、`unshift`、`splice` 由 `noTracking` 处理：`pauseTracking()` → `startBatch()` → 在原始数组上执行 → `endBatch()` → `resetTracking()`。

- **暂停收集**：push 内部先读 `length`，再写 `length`。如果在 effect 里调用 push，读取 length 会让这个 effect 订阅 length。两个 effect 都对同一个数组 push，就会互相触发。暂停后，effect 里调用 push 不产生任何依赖。
- **批处理**：一次 push 写多个下标和 length，合成一批，订阅者只运行一次。

**Map 和 Set。** 它们的方法依赖内部槽位，`this` 必须是真正的 Map：

```js
new Proxy(new Map(), {}).get('a')
// TypeError: Method Map.prototype.get called on incompatible receiver
```

所以 Vue 对 Map、Set、WeakMap、WeakSet 使用另一套 handler：`collectionHandlers`，只有一个 `get` 陷阱。读取 `get`、`set`、`has`、`add`、`delete`、`clear`、`forEach`、`size`、`keys`、`values`、`entries` 和迭代器时，它返回 `instrumentations` 里的同名函数。这些函数通过 `this.__v_raw` 拿到原始集合，在原始集合上调用方法，自己负责 track 和 trigger：

```ts
// reactivity/src/collectionHandlers.ts(简化)
const instrumentations = {
  get(key) {
    const target = toRaw(this)       // 真实实现读取 this.__v_raw
    track(target, 'get', key)
    return toReactive(target.get(key))
  },
  set(key, value) {
    const target = toRaw(this)
    const had = target.has(key), old = target.get(key)
    target.set(key, value)
    if (!had) trigger(target, 'add', key)
    else if (hasChanged(value, old)) trigger(target, 'set', key)
    return this
  }
}
// hasOwn 只认 instrumentations 自己的方法，不认 constructor 这类继承来的属性
const collectionHandlers = {
  get: (target, key, receiver) =>
    Reflect.get(hasOwn(instrumentations, key) && key in target ? instrumentations : target, key, receiver)
}
```

迭代有两个 key。`ITERATE_KEY` 对应值、条目和 `size`。`MAP_KEY_ITERATE_KEY` 只对应 `keys()`。给已有的 key 赋新值只触发 `ITERATE_KEY`，因为 key 的集合没有变。只遍历 key 的 effect 不会重新运行。

### 24.10 四种 handler、ReactiveFlags 和代理缓存

`reactive`、`shallowReactive`、`readonly`、`shallowReadonly` 都是同一个函数 `createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap)` 的薄包装，只是传入的参数不同：

| API | 普通对象和数组 | Map、Set 等 | 缓存表 |
|---|---|---|---|
| `reactive` | `mutableHandlers` | `mutableCollectionHandlers` | `reactiveMap` |
| `shallowReactive` | `shallowReactiveHandlers` | `shallowCollectionHandlers` | `shallowReactiveMap` |
| `readonly` | `readonlyHandlers` | `readonlyCollectionHandlers` | `readonlyMap` |
| `shallowReadonly` | `shallowReadonlyHandlers` | `shallowReadonlyCollectionHandlers` | `shallowReadonlyMap` |

四个普通 handler 来自三个类（`baseHandlers.ts`）：`BaseReactiveHandler` 实现 `get`。`MutableReactiveHandler` 继承它，加上 `set`、`deleteProperty`、`has`、`ownKeys`。`ReadonlyReactiveHandler` 继承它，`set` 和 `deleteProperty` 只在开发环境警告，不修改数据。两个布尔字段 `_isReadonly` 和 `_isShallow` 决定 `get` 的分支：

```ts
// reactivity/src/baseHandlers.ts(简化)
get(target, key, receiver) {
  if (key === '__v_isReactive') return !this._isReadonly
  if (key === '__v_isReadonly') return this._isReadonly
  if (key === '__v_isShallow') return this._isShallow
  if (key === '__v_raw') return target          // 真实实现还会核对 receiver
  const res = Reflect.get(target, key, receiver)
  if (!this._isReadonly) track(target, 'get', key)   // 只读对象自己不会变，不收集
  if (this._isShallow) return res                    // 浅层：不包装嵌套对象，不解包 ref
  if (isRef(res)) return res.value                   // 数组下标除外
  if (isObject(res)) return this._isReadonly ? readonly(res) : reactive(res)
  return res
}
```

**ReactiveFlags** 是 `__v_isReactive`、`__v_isReadonly`、`__v_isShallow`、`__v_raw`、`__v_skip`、`__v_isRef` 这几个特殊的键。前四个在目标对象上并不存在，是 `get` 陷阱“回答”的问题：`reactive(o).__v_raw` 是 `o`，而 `o.__v_raw` 是 `undefined`。`isReactive(x)` 就是读 `x.__v_isReactive`，`isReadonly`、`isShallow`、`toRaw` 同理。`__v_skip` 是真实的属性：`markRaw` 用 `def` 在对象上定义一个不可枚举的 `__v_skip`。`__v_isRef` 是 RefImpl 实例上的属性。

`readonly(reactive(o))` 仍然会随 `o` 变化。原因：它的 `target` 是内层的 reactive 代理，`Reflect.get(target, …)` 经过内层代理的 `get`，内层负责 track。

**代理缓存。** 四个 handler 各有一张 `WeakMap(原始对象 → 代理)`。`createReactiveObject` 的流程：

```ts
// reactivity/src/reactive.ts(简化)
function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
  if (!isObject(target)) return target
  // 已经是代理就原样返回。例外：readonly(reactive(x)) 允许再包一层
  if (target.__v_raw && !(isReadonly && target.__v_isReactive)) return target
  if (target.__v_skip || !Object.isExtensible(target)) return target   // markRaw、不可扩展的对象
  const existing = proxyMap.get(target)
  if (existing) return existing
  const type = targetTypeMap(toRawType(target))   // Object、Array → 普通；Map、Set、WeakMap、WeakSet → 集合；其他不代理
  if (type === INVALID) return target
  const proxy = new Proxy(target, type === COLLECTION ? collectionHandlers : baseHandlers)
  proxyMap.set(target, proxy)
  return proxy
}
```

于是：`reactive(o) === reactive(o)`；`reactive(reactive(o)) === reactive(o)`；`reactive(readonly(o))` 直接返回只读代理（`reactive` 入口先检查 `isReadonly`）；`reactive(markRaw(o)) === o`。四张表分开，同一个对象可以同时有 reactive 代理和 readonly 代理，互不覆盖。

按对象缓存很重要：同一个对象永远对应同一个代理，所以 `===` 比较、`includes` 和 Map 里按对象查找才有意义。

### 24.11 ref 的实现

`ref(x)` 创建一个 `RefImpl`：

```ts
// reactivity/src/ref.ts(简化)
class RefImpl {
  dep = new Dep()
  __v_isRef = true
  constructor(value, isShallow) {
    this._rawValue = isShallow ? value : toRaw(value)
    this._value = isShallow ? value : toReactive(value)   // 对象 → reactive(对象)
  }
  get value() {
    this.dep.track()
    return this._value
  }
  set value(newValue) {
    newValue = this.__v_isShallow ? newValue : toRaw(newValue)
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue
      this._value = this.__v_isShallow ? newValue : toReactive(newValue)
      this.dep.trigger()
    }
  }
}
```

- **只有一个 Dep。** ref 不需要 targetMap。读取 `.value` 订阅 `this.dep`，赋值触发它。
- **对象值为什么包一层 reactive。** ref 的 Dep 只管 `.value` 被整体替换。`r.value.n++` 是对象内部的变化，要靠 reactive 代理自己的 track 和 trigger。`toReactive` 在赋值时执行一次，结果存进 `_value`，所以 `r.value === r.value`。
- **为什么存 `_rawValue`。** 比较新旧值用原始对象。`r.value = r.value`（把代理赋回去）不触发更新。赋一个新对象才触发。
- **`shallowRef`**：`isShallow` 为真，不包 reactive。`r.value.n++` 没有任何东西触发，所以要 `triggerRef(r)`，它就是强制执行一次 `r.dep.trigger()`。
- **`customRef`**：用 `factory(dep.track, dep.trigger)` 把 track 和 trigger 的时机交给你。

```js
function useDebouncedRef(value, delay = 200) {
  let timer
  return customRef((track, trigger) => ({
    get() { track(); return value },
    set(next) {
      clearTimeout(timer)
      timer = setTimeout(() => { value = next; trigger() }, delay)   // 过了 delay 才通知
    }
  }))
}
```

**模板里的自动解包。** 解包发生在三个地方：

1. `proxyRefs(obj)` 是 `new Proxy(obj, shallowUnwrapHandlers)`：读取时 `unref(...)`，写入时如果旧值是 ref 而新值不是，就写 `旧值.value`。`setup()` 返回的对象在 `handleSetupResult` 里这样处理：`instance.setupState = proxyRefs(setupResult)`（`runtime-core/component.ts`）。
2. `<script setup>` 的内联模板（生产构建）在编译时就知道 `count` 是 ref，直接生成 `count.value`，不经过 `proxyRefs`。
3. `reactive` 的 `get` 也会解包嵌套的 ref：`reactive({ a: ref(1) }).a` 是 `1`。数组下标例外：`reactive([ref(1)])[0]` 仍然是 ref 对象。

::: pitfalls
1. 不要在副作用函数外部解构 reactive 对象，再在函数中读取变量。原因：解构时没有正在运行的副作用函数，track 不记录。
2. 不要通过 toRaw 的结果修改数据。原因：修改不经过 set 拦截，界面不更新。
3. 不要在业务代码里读 `dep`、`deps`、`flags` 这些内部字段。它们没有公开，小版本可能改名。本章的实验台读它们，只为观察。
4. 在 effect 里调用 `push`、`splice` 等方法不会收集 `length`。需要在长度变化时重新运行，就在 effect 里读 `arr.length`。
:::

::: selfcheck
<Sc :a="1">

下面的代码运行后，`runs` 是多少？（`effect` 是本章的副作用函数）

```js
const state = reactive({ a: 1, b: 2, show: true })
let runs = 0
effect(() => { runs++; state.show ? state.a : state.b })
state.show = false
state.a = 10
```

<Opt>1</Opt>
<Opt>2</Opt>
<Opt>3</Opt>

<template #explain>

解析：第一次运行，runs 为 1。修改 show 后，函数再次运行，runs 为 2。这次运行读取 b，不读取 a。运行前 Vue 清理了旧依赖，所以修改 a 不触发运行。答案是 2。

</template>
</Sc>

<Sc :a="2">

下面的代码中，修改 `state.price` 后，副作用函数一共运行几次？

```js
const state = reactive({ price: 10 })
const { price } = state
effect(() => console.log(price))
state.price = 20
```

<Opt>2 次，输出 10 和 20</Opt>
<Opt>2 次，两次都输出 10</Opt>
<Opt>1 次</Opt>

<template #explain>

解析：解构在副作用函数外部读取 price。这时没有正在运行的副作用函数，track 不记录。函数内部只读取普通变量 price，不经过 Proxy。所以 dep 中没有这个函数，它只运行 1 次。

</template>
</Sc>

<Sc :a="0">

`targetMap.get(state).get('price')` 返回什么？

<Opt>读取过 state.price 的副作用函数集合</Opt>
<Opt>state.price 的当前值</Opt>
<Opt>state 的所有属性名</Opt>

<template #explain>

解析：第一层用对象查找，第二层用属性名查找。第三层是 Set，保存读取过这个属性的副作用函数。值保存在原始对象中，不在 targetMap 中。

</template>
</Sc>

<Sc :a="1">

回顾（第 3 章）：`r = shallowRef({ n: 1 })`。用本章的 track 和 trigger 解释：为什么 `r.value.n++` 不更新页面？

<Opt>track 没有记录对 r.value 的读取</Opt>
<Opt>只有 value 的 setter 调用 trigger</Opt>
<Opt>trigger 运行了，但被调度器丢弃</Opt>

<template #explain>

解析：`r.value.n++` 先读取 `r.value`，这次读取调用了 track。然后修改普通对象的 n。shallowRef 不代理内部对象。所以这次修改不经过 set 拦截，trigger 没有运行。读取 value 时 track 正常运行，所以“没有记录读取”是错的。trigger 根本没有运行，所以也谈不上被丢弃。

</template>
</Sc>

<Sc :a="2">

下面的代码运行后，`runs` 是多少？（`effect` 在它读取的数据改变时，同步重新运行）

```js
const n = ref(1)
const parity = computed(() => n.value % 2)
let runs = 0
effect(() => { runs++; parity.value })
n.value = 3
```

<Opt>2</Opt>
<Opt>3</Opt>
<Opt>1</Opt>

<template #explain>

解析：`n.value = 3` 让 n 的 version 加 1，parity 被通知，effect 也被通知。effect 运行前先 `isDirty`：刷新 parity，重新计算得到 `3 % 2 = 1`，和旧值相同，所以 parity 自己的 version 不变，effect 不运行。答案是 1。选 2 的人以为通知就等于运行。通知只是排队，运行前还要用版本号确认。

</template>
</Sc>

<Sc :a="0">

下面的代码运行后，`runs` 是多少？

```js
const list = reactive([])
let runs = 0
effect(() => { runs++; list.length })
list.push('a', 'b', 'c')
list[3] = 'd'
```

<Opt>3</Opt>
<Opt>2</Opt>
<Opt>6</Opt>

<template #explain>

解析：创建时运行 1 次。`push` 内部写了 3 个下标和 length，被包进同一个批，effect 只运行 1 次，累计 2 次。`list[3] = 'd'` 是独立的赋值，新增下标触发 length 的订阅者，再运行 1 次，累计 3 次。选 6 的人以为 push 的每次内部写入都会运行 effect。那正是 `noTracking` 里的 `startBatch` 要避免的事。

</template>
</Sc>

<Sc :a="1">

下面三个表达式的结果分别是什么？

```js
const raw = { id: 1 }
const list = reactive([raw])
list.includes(raw)               // ①
list.includes(list[0])           // ②
toRaw(list).includes(list[0])    // ③
```

<Opt>① true　② true　③ true</Opt>
<Opt>① true　② true　③ false</Opt>
<Opt>① true　② false　③ false</Opt>

<template #explain>

解析：① 响应式数组的 `includes` 先在原始数组上用原参数找，`raw` 就在里面，是 true。② `list[0]` 是代理，第一次找不到，`searchProxy` 把参数换成 `toRaw(list[0])` 再找一次，是 true。③ 原生数组的 `includes` 不认识代理，是 false。选第三项的人，没有想到 Vue 会再找一次。

</template>
</Sc>

<Sc :a="1">

下面的 effect 一共运行几次？

```js
const m = reactive(new Map([['a', 1]]))
let runs = 0
effect(() => { runs++; [...m.keys()] })
m.set('a', 2)
m.set('b', 3)
```

<Opt>1</Opt>
<Opt>2</Opt>
<Opt>3</Opt>

<template #explain>

解析：`keys()` 订阅的是 `MAP_KEY_ITERATE_KEY`。给已有的 key 赋新值，key 的集合没有变，只触发值相关的 `ITERATE_KEY`，这个 effect 不运行。`m.set('b', 3)` 新增了 key，触发它，所以共运行 2 次。选 3 的人，以为任何 `set` 都会通知遍历者。如果把 `m.keys()` 换成 `m.values()`，答案就是 3。

</template>
</Sc>

<Sc :a="0">

下面四个比较的结果分别是什么？

```js
const o = { n: 1 }
const a = reactive(o) === reactive(o)
const b = reactive(reactive(o)) === reactive(o)
const c = isReactive(readonly(reactive(o)))
const d = isReadonly(reactive(readonly(o)))
```

<Opt>四个都是 true</Opt>
<Opt>只有 a、b 是 true</Opt>
<Opt>a、b、d 是 true，c 是 false</Opt>

<template #explain>

解析：a、b：`reactiveMap` 按原始对象缓存代理，对代理再调用 `reactive` 直接返回它。c：`isReactive` 遇到只读代理，会去问它背后的对象，背后是 reactive 代理，所以是 true。d：`reactive(readonly(o))` 在入口发现参数是只读代理，直接返回它，所以结果仍然只读。选第三项的人，没有注意到 `isReactive` 会穿过只读这一层。

</template>
</Sc>

<Sc :a="2">

下面的代码中，`state.a` 和 `list[0]` 分别是什么？

```js
const state = reactive({ a: ref(1) })
const list = reactive([ref(1)])
```

<Opt>`state.a` 是 ref 对象，`list[0]` 是 ref 对象</Opt>
<Opt>`state.a` 是 1，`list[0]` 是 1</Opt>
<Opt>`state.a` 是 1，`list[0]` 是 ref 对象</Opt>

<template #explain>

解析：reactive 的 `get` 会解包 ref，所以 `state.a` 是 1。但数组的整数下标是例外：`list[0]` 仍然是 ref 对象，需要写 `list[0].value`。选第二项的人，把对象属性的规则用到了数组上。

</template>
</Sc>

:::

::: summary
- 读取时收集依赖。写入时触发更新。
- 手写版本用 Proxy、track、trigger 和 effect 实现，约 40 行。
- targetMap 的结构：WeakMap(对象) → Map(属性) → Set(副作用函数)。
- 每次运行前清理旧依赖。这样分支改变后依赖仍然正确。
- toRaw 读取 \_\_v_raw，返回原始对象。只用它读取或复制数据，不用它修改数据。
- Vue 3.5 的 targetMap 第三层是 Dep。每个 Link 同时挂在订阅者的依赖链表和 Dep 的订阅者链表上。运行前把 Link 标成 -1，运行后摘掉仍是 -1 的。
- dep.version 和 globalVersion 让“没有变化就不重新运行”：订阅者被通知后，先对比版本号，再决定运行。
- computed 既是订阅者，又是 Dep。notify 只打脏标记。读取时 refreshComputed 才计算，值变了才让自己的 version 加 1。
- 批处理（startBatch、endBatch）保证一次写入内部，每个订阅者只排一次队。跨多次写入的合并靠第 25 章的更新队列。
- 数组用 ARRAY_ITERATE_KEY、searchProxy 和 noTracking；Map、Set 用 collectionHandlers，避免 this 指向代理。
- 四种 handler 加四张缓存表实现 reactive、shallowReactive、readonly、shallowReadonly。RefImpl 自带一个 Dep，proxyRefs 负责自动解包。
:::
