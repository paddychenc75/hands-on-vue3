---
title: 响应式原理
id: reactivity
stage: 3
chapter: 12
desc: Proxy、track、trigger 手写实现
---

<script setup>
import TrackAndTrigger from '../figures/12-reactivity/TrackAndTrigger.vue'
import TargetMapStructure from '../figures/12-reactivity/TargetMapStructure.vue'
import RxLab from '../labs/12-reactivity/RxLab.vue'
</script>

# 响应式原理

::: goals
<Goal checks="sc:1,ex:computedFill,ex:miniComputed">写出 reactive、effect、track 和 trigger。</Goal>
<Goal checks="sc:2">画出 targetMap 的三层结构。</Goal>
<Goal checks="sc:0">说明每次运行副作用函数之前清理依赖的原因。</Goal>

:::

::: rt
阅读主线约 11 分钟，深入内容约 3 分钟（可选）。另外留时间做实验台、练习和自测。
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
:::

::: why
你把 reactive 对象解构为几个变量，然后修改数据。界面不更新，控制台也没有报错。

原因：Vue 在你读取响应式属性时，记录谁在使用它。解构得到的变量是普通值，Vue 不再记录。

本章用 Proxy 手写 track 和 trigger。你会看到 Vue 怎样记录读取，并在修改时重新运行代码。
:::

### 12.1 读取时收集，写入时触发

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

### 12.2 手写 reactive、effect、track 和 trigger

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

### 12.3 targetMap 的三层结构

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

### 12.4 用 toRaw 取得原始对象

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

### 12.5 Vue 3.5 的实际实现

本章的手写版本说明了原理。Vue 3.5 的实现还有下面的功能：

- 用双向链表和版本号管理依赖，减少内存分配。
- 特殊处理数组方法，例如 push 和 includes。
- 用 `pauseTracking` 防止 push 读取 length 时，两个副作用函数互相触发。
- computed 同时是订阅者和依赖（见 12.2 末尾的“迷你 computed 少了什么”）。
- 用调度器把组件更新放入更新队列（[第 13 章](/chapters/13-scheduler)）。

::: deep Vue 3.5 的依赖结构：双向链表
本章的手写版本用 Set 保存依赖。Vue 3.5 用 `Link` 节点连接依赖（Dep）和订阅者（Subscriber）。每个 Link 同时在两个链表中：

- 订阅者的依赖链表：这个副作用函数读取了哪些数据。
- 依赖的订阅者链表：哪些副作用函数读取了这个数据。

副作用函数重新运行时，Vue 不清空依赖再重建。Vue 按下面的步骤复用 Link：

1. 运行前，把每个 Link 的 version 设为 -1。
2. 运行时，读取一个依赖。如果对应的 Link 已经存在，把 version 设为依赖的当前 version。
3. 运行后，删除 version 仍为 -1 的 Link。这些是这次没有读取的依赖。

这个方法的结果和手写版本的“先清理”相同。但是依赖不变时，它不分配新内存。

```js
class Link {
  constructor(sub, dep) {
    this.sub = sub; this.dep = dep
    this.version = dep.version
    this.nextDep = this.prevDep = undefined    // 订阅者的依赖链表
    this.nextSub = this.prevSub = undefined    // 依赖的订阅者链表
  }
}
class Dep {
  version = 0
  subs = undefined                             // 订阅者链表的尾部
  track() { /* 找到或创建 Link，把 link.version 设为 this.version */ }
  trigger() {
    this.version++
    globalVersion++
    startBatch()
    for (let link = this.subs; link; link = link.prevSub) link.sub.notify()  // 只标记，不运行
    endBatch()                                 // 批处理结束时，统一运行副作用函数
  }
}
```
:::

::: deep 批处理
`trigger` 不立即运行副作用函数。它先调用 `notify()`，把订阅者加入批处理链表。`endBatch()` 时，Vue 运行这些订阅者。所以在一次触发中，同一个副作用函数只运行一次。

组件的副作用函数有调度器。调度器不运行渲染，而是把任务放入更新队列（第 13 章）。
:::

::: deep 集合和数组的特殊处理
| 情况 | 问题 | Vue 的处理 |
|---|---|---|
| `Map / Set` | 方法内部使用 this。代理上的 this 不能访问内部槽位，调用会报错。 | 用 `collectionHandlers` 重写 get、set、has、forEach 等方法。 |
| `arr.includes(obj)` | 原始数组中保存原始对象。传入的参数可能是代理，比较结果为 false。 | 先在原始数组上用原参数查找。找不到并且参数是代理时，用 toRaw(参数) 再查找一次。 |
| `arr.push(x)` | push 先读取 length，再写入 length。两个副作用函数各自对同一个数组调用 push 时，一个写 length 会触发另一个，两者互相触发，无限循环。 | 调用 push、pop、shift、unshift、splice 时暂停收集依赖。 |
| `for...in / Object.keys` | 没有具体的属性名可以收集。 | 收集特殊的 `ITERATE_KEY`。新增或删除属性时触发它。 |
:::

::: pitfalls
1. 不要在副作用函数外部解构 reactive 对象，再在函数中读取变量。原因：解构时没有正在运行的副作用函数，track 不记录。
2. 不要通过 toRaw 的结果修改数据。原因：修改不经过 set 拦截，界面不更新。
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

:::

::: summary
- 读取时收集依赖。写入时触发更新。
- 手写版本用 Proxy、track、trigger 和 effect 实现，约 40 行。
- targetMap 的结构：WeakMap(对象) → Map(属性) → Set(副作用函数)。
- 每次运行前清理旧依赖。这样分支改变后依赖仍然正确。
- toRaw 读取 \_\_v_raw，返回原始对象。只用它读取或复制数据，不用它修改数据。
:::
