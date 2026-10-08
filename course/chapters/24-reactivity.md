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
<Goal checks="sc:1,sc:2">说明读取时收集、写入时触发的流程，画出 targetMap 的三层结构。</Goal>
<Goal checks="sc:0,ex:depCleanup">写出带依赖清理的 effect，说明每次运行前清理依赖的原因。</Goal>
<Goal checks="sc:5,ex:computedFill,ex:miniComputed">写出有缓存、能被订阅的 computed，说明真实 Vue 里 computed 怎样做到惰性。</Goal>
<Goal checks="sc:3,sc:11">说明 ref 的实现，以及自动解包发生在哪里。</Goal>
<Goal checks="sc:4,sc:6">说明 Dep、Link、订阅者和版本号怎样让“没有变化就不运行”。</Goal>
<Goal checks="sc:7">说明批处理，以及它和第 25 章更新队列的分工。</Goal>
<Goal checks="sc:8,sc:9,sc:10">（选读）说明数组、Map、Set 的特殊处理，区分四种 handler 和代理缓存。</Goal>

:::

::: rt
阅读主线约 30 分钟，深入内容约 12 分钟（可选）。另外留时间做实验台、练习和自测。
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

本章用 Proxy 手写 track 和 trigger，再长出 effect、computed 和 ref。这套代码是全课程共用的“迷你 Vue”的第一块，第 25、26、31 章都建立在它上面。最后看真实的 Vue 3.5 怎样存依赖。
:::

### 24.1 数据变了，谁来知道？

先看一个问题：

```js
let price = 10
let qty = 2
let total = price * qty   // 20
price = 20
// total 还是 20
```

`total` 只算了一次。我们想要的是：`price` 一变，计算 `total` 的那段代码自动再运行一次。这需要两件事：

1. 知道这段代码读取了哪些数据。
2. 数据改变时，能找到这段代码。

Vue 的办法是：**读取时收集，写入时触发**。顺序如下：

1. 副作用函数开始运行。
2. 副作用函数读取 `state.price`。
3. Proxy 的 get 拦截读取，并收集依赖。
4. 其他代码写入 `state.price`。
5. Proxy 的 set 拦截写入，并触发更新。
6. 读取过 price 的副作用函数再次运行。

<Figure caption="读取时，track 把副作用函数存入 dep。写入时，trigger 从 dep 取出它，并重新运行它。">
<TrackAndTrigger />
</Figure>

后面几节把它写出来：24.2 到 24.6 手写迷你版，24.8 到 24.10 看真实的 Vue 3.5 有哪些不同。

### 24.2 用 Proxy 拦截读写

Proxy 包住一个对象，读和写都会先经过你写的函数：

```js
const log = []
const proxy = new Proxy({ price: 10 }, {
  get(target, key, receiver) { log.push('读 ' + String(key)); return Reflect.get(target, key, receiver) },
  set(target, key, value, receiver) { log.push('写 ' + String(key) + ' = ' + value); return Reflect.set(target, key, value, receiver) }
})
proxy.price        // 读 price
proxy.price = 20   // 写 price = 20
log                // ['读 price', '写 price = 20']
```

这两个拦截点，正好是放“收集”和“触发”的位置。下面是迷你 Vue 的 `reactive`（零件 1）。`track` 和 `trigger` 在 24.3 写：

<!-- mini:reactivity#reactive -->
```js
function reactive(target) {
  if (typeof target !== 'object' || target === null) return target
  if (target.__v_raw) return target        // 已经是代理
  if (proxyMap.has(target)) return proxyMap.get(target)
  const proxy = new Proxy(target, {
    get(t, key, receiver) {
      if (key === '__v_raw') return t
      track(t, key)
      const res = Reflect.get(t, key, receiver)
      return typeof res === 'object' && res !== null ? reactive(res) : res
    },
    set(t, key, value, receiver) {
      const old = t[key]
      const ok = Reflect.set(t, key, value, receiver)
      if (!Object.is(old, value)) trigger(t, key)
      return ok
    },
    deleteProperty(t, key) {
      const had = key in t
      const ok = Reflect.deleteProperty(t, key)
      if (had && ok) trigger(t, key)
      return ok
    }
  })
  proxyMap.set(target, proxy)
  return proxy
}
```

逐段看：

- **get**：先 `track`，再读值。值是对象就返回它的代理，嵌套对象在被访问时才包装。
- **set**：新旧值相同（`Object.is`）就不触发。**deleteProperty**：删除确实存在的属性也要触发。
- **proxyMap**：同一个对象只有一个代理，`reactive(o) === reactive(o)`。
- <b>`__v_raw`</b>：特殊的键，读它得到原始对象。24.7 的 `toRaw` 用它。

::: think get 为什么使用 Reflect.get(t, k, r)？
第三个参数 r 让 getter 中的 `this` 指向代理对象。示例：`get full() { return this.first + this.last }`。如果使用 `t[k]`，this 指向原始对象。这时读取 first 和 last 不经过代理，Vue 不能收集依赖。
:::

::: think Vue3 为什么用 Proxy 代替 Object.defineProperty？
defineProperty 只能拦截已有的属性。Vue2 不能检测新增属性和数组下标赋值。Vue2 在初始化时还要遍历整个对象。Proxy 拦截整个对象的操作，包括新增、删除和遍历。Proxy 在访问嵌套对象时才代理它。
:::

### 24.3 track 和 trigger：手写最小的响应式

迷你 Vue 开头有三个变量：

```js
let activeEffect = null          // 正在运行的副作用函数
const targetMap = new WeakMap()  // 原始对象 → Map(属性名 → Set(副作用函数))
const proxyMap = new WeakMap()   // 原始对象 → 它的代理
```

`targetMap` 有三层：对象 → 属性 → 读取过这个属性的副作用函数。

<Figure caption="targetMap 有三层：对象 → 属性 → 读取过这个属性的副作用函数。trigger 按对象和属性名找到要运行的函数。">
<TargetMapStructure />
</Figure>

`track` 沿着这三层，把正在运行的副作用函数放进去：

<!-- mini:reactivity#track -->
```js
function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))
  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}
```

- 没有正在运行的副作用函数，就什么也不记。所以在副作用函数外面解构 reactive 对象，Vue 记不到这次读取。
- `activeEffect.deps.push(dep)` 是反向记录：副作用函数记住自己订阅了哪些 dep，24.4 的清理要用。

`trigger` 按对象和属性名找到 dep，运行里面的副作用函数：

<!-- mini:reactivity#trigger -->
```js
function trigger(target, key) {
  const dep = targetMap.get(target)?.get(key)
  if (!dep) return
  for (const e of [...dep]) {
    if (e === activeEffect) continue       // 副作用函数改自己读的数据：不再触发自己
    e.dirty = true
    e.scheduler ? e.scheduler() : e.run()
  }
}
```

- `[...dep]` 先复制一份：副作用函数运行时会修改 dep 本身。
- 跳过正在运行的副作用函数，否则函数改自己读的数据会无限循环。
- 有调度函数（`e.scheduler`）就调用它，不直接运行。它是 computed 和第 25 章更新队列的入口。`e.dirty` 记录“被通知过”。

::: think targetMap 为什么使用 WeakMap？
targetMap 的键是原始对象。WeakMap 不阻止垃圾回收。对象没有其他引用时，对象和它的依赖一起被回收。Map 会一直引用对象，造成内存泄漏。
:::

### 24.4 effect 与依赖清理

`activeEffect` 是谁设置的？是 `effect`。它把函数包成一个对象，运行函数前后设置和还原 `activeEffect`：

<!-- mini:reactivity#effect -->
```js
function effect(fn, options = {}) {
  const e = {
    deps: [], active: true, dirty: true, scheduler: options.scheduler,
    run() {
      if (!e.active) return fn()           // 已经 stop：只运行，不再收集依赖
      cleanup(e)
      const prev = activeEffect
      activeEffect = e
      e.dirty = false
      try { return fn() } finally { activeEffect = prev }
    },
    runIfDirty() { if (e.dirty) return e.run() },   // 数据没变过就不运行（第 25、31 章用）
    stop() {
      cleanup(e)
      e.active = false
      e.onStop && e.onStop()
    }
  }
  activeScope && activeScope.effects.push(e)
  if (!options.lazy) e.run()
  return e
}
```

`run()` 运行 `fn` 并收集依赖，`prev` 让 effect 可以嵌套。`scheduler` 选项和 `runIfDirty()` 在第 25、31 章用，`stop()` 退订所有依赖。`lazy` 为 true 时创建后不运行：**这是迷你版的简化**，真实 Vue 3.5 的 `effect()` 没有这个选项，24.5 说明 computed 怎样不靠它。

每次 `run` 开头都有 `cleanup(e)`：

<!-- mini:reactivity#cleanup -->
```js
function cleanup(e) {
  e.deps.forEach(dep => dep.delete(e))     // 先退出所有旧的订阅，运行时再重新收集
  e.deps.length = 0
}
```

**为什么每次运行前都要清理？** 分支改变后，函数可能不再读取某个属性。不清理时，这个属性改变仍会让函数运行。清理后重新收集，依赖就等于“最近一次运行读到的数据”。

<Lab id="lab-rx" title="实验台：手写响应式" note="跑的就是上面的迷你 Vue 零件 1，实验台只在函数入口记日志">
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

下面的练习去掉了依赖清理。你来补回来：

<Exercise id="depCleanup" />

### 24.5 computed：惰性与缓存

一个派生值 `total = price * qty` 想要三样东西：

1. **惰性**：没人读取时不计算。
2. **缓存**：依赖没变时，再读取直接用上次的结果。
3. **能被订阅**：外层 effect 读取 `total.value`，`price` 变了，外层 effect 要重新运行。

迷你 Vue 用一个 effect 加一个 `stale` 标记做到前两样，再加两行 track 和 trigger 做到第三样：

<!-- mini:reactivity#computed -->
```js
function computed(getter) {
  let value
  let stale = true
  const runner = effect(getter, {
    lazy: true,
    scheduler() { if (!stale) { stale = true; trigger(c, 'value') } }   // 依赖变了：作废缓存，通知读过它的副作用函数
  })
  const c = {
    __v_isRef: true,
    get value() {
      track(c, 'value')
      if (stale) { value = runner.run(); stale = false }
      return value
    }
  }
  return c
}
```

`computed` 有两个角色。**订阅者**：getter 读取 `state.price`，`price` 改变时调用它的 `scheduler`，它只作废缓存，不计算。**被订阅的数据**：外层 effect 读取 `.value` 时 `track(c, 'value')`，`scheduler` 里 `trigger(c, 'value')` 把通知传给外层 effect。

用数字走一遍（`price = 10`，`qty = 2`）：

1. 创建：getter 没有运行。
2. 读 `.value` 两次：第一次运行 getter，得到 20。第二次直接返回 20。
3. `price = 20`：`scheduler` 作废缓存，通知外层 effect。getter 仍没有运行。
4. 外层 effect 重新运行，读 `.value`，这时才运行 getter，得到 40。

<Exercise id="computedFill" />

<Exercise id="miniComputed" />

**真实的 Vue 怎样做到惰性？** 上面用了 `lazy` 选项。Vue 3.5 的 `effect(fn, { lazy: true })` 里没有这个选项，`fn` 仍然会立即运行。真实的 computed 也不用 `effect` 建 runner：`ComputedRefImpl` 自己就是订阅者。创建时什么都不做，读取 `.value` 时才调用内部的刷新函数 `refreshComputed` 去运行 getter。迷你版的 `lazy` 是为了少写一个类的简化。24.9 会看到真实版多做的一步：先比较结果，没变就不通知下游。

### 24.6 ref 的实现

`reactive` 只能包装对象。基本值（数字、字符串）需要一个容器，这就是 ref。迷你 Vue 的 ref：

<!-- mini:reactivity#ref -->
```js
function ref(value) {
  const r = {
    __v_isRef: true,
    get value() { track(r, 'value'); return reactive(value) },
    set value(v) { if (!Object.is(v, value)) { value = v; trigger(r, 'value') } }
  }
  return r
}
```

读 `.value` 就是 track，写 `.value` 就是 trigger。ref 只有一个属性，不需要 targetMap 的三层结构。真实 Vue 的 `RefImpl` 思路相同：只有一个 Dep；对象值包一层 `reactive`，因为 ref 的 Dep 只管 `.value` 被整体替换，`r.value.n++` 要靠代理自己的 track 和 trigger；比较用原始值，所以 `r.value = r.value` 不触发。

**模板里的自动解包。** 解包发生在三个地方：

1. `setup()` 返回的对象，被 Vue 用 `proxyRefs` 包一层：读取时自动取 `.value`，写入时如果旧值是 ref 而新值不是，就写到旧值的 `.value` 上。
2. `<script setup>` 的内联模板（生产构建）在编译时就知道 `count` 是 ref，直接生成 `count.value`，不经过 `proxyRefs`。
3. `reactive` 的 `get` 也会解包嵌套的 ref：`reactive({ a: ref(1) }).a` 是 `1`。数组下标例外：`reactive([ref(1)])[0]` 仍然是 ref 对象。

::: deep shallowRef、triggerRef 和 customRef 的实现
读它能回答：`shallowRef` 为什么要 `triggerRef`？`customRef` 把什么交给了你？

- <b>`shallowRef`</b>：不包 reactive，`r.value.n++` 没有任何东西触发，所以要 `triggerRef(r)`。它就是强制触发一次 `r` 自己的 Dep。
- <b>`customRef`</b>：工厂函数拿到 `track` 和 `trigger`，由你决定什么时候收集、什么时候通知：

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
:::

### 24.7 用 toRaw 取得原始对象

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

原理就是 24.2 看到的 `__v_raw`：代理的 get 遇到这个键时返回原始对象，`toRaw` 读取它（有多层代理时逐层去掉）。注意两点：

1. 不要通过 toRaw 返回的对象修改数据。修改原始对象不经过 set 拦截，trigger 不运行，界面不变。
2. toRaw 只去掉你传入的那一层 Proxy。你把 reactive 对象放进普通对象后，里面的 Proxy 仍然存在，structuredClone 仍然报错。

要让 Vue 从一开始就不代理某个对象，用 `markRaw`。它的用法见 [第 3 章](/chapters/03-refs)。

### 24.8 真实的 3.5 怎样存依赖：Dep、Link 和订阅者

迷你版的 targetMap 有三层：`WeakMap(对象) → Map(属性) → Set(副作用函数)`。Vue 3.5 的前两层不变，变的是第三层：Set 换成了 `Dep`。读完这一节和下一节，你应该能看懂 24.9 实验台里的每一列。

先认三个角色：

- **Dep** 对应一个可以被读取的数据：一个响应式属性、一个 ref 或一个 computed。它有 `version`，还保存订阅它的链表。
- **订阅者**（Subscriber）读取 Dep，并在 Dep 改变时被通知。`ReactiveEffect`（effect、组件的渲染函数和侦听器都建立在它上面）和 computed 都是订阅者。
- **Link** 连接一个 Dep 和一个订阅者。一个订阅者读了几个 Dep，就有几个 Link。

每个 Link 同时挂在两条双向链表上：

<Figure caption="每一行是订阅者的依赖链表（nextDep、prevDep）。每一列是 Dep 的订阅者链表（nextSub、prevSub）。订阅者的 deps 指向行首的 Link。Dep 的 subs 指向列尾的 Link。">
<LinkGrid />
</Figure>

官方给 3.5 这次重构定的目标是更快、更省内存（同一个测试用例的内存下降 56%）。好处有三点：一个 Link 同时是正向和反向记录（迷你版要用 Set 和 `deps` 数组各存一份）；重新运行时可以复用已有的 Link，依赖不变就不创建新对象；依赖按读取顺序排列，检查时从头扫一遍。

**依赖清理变成三个动作。** 迷你版是“先全删，再重建”。Vue 3.5 是“标记、复用、摘除”：

1. **标记**：运行前，把订阅者每个旧 Link 的 `version` 设为 -1。
2. **复用**：运行时，每次读取一个 Dep，如果它已有 Link 就把 `version` 恢复成 Dep 当前的值（读取顺序变了就挪到链尾），没有就新建 Link 接到链尾。
3. **摘除**：运行后，`version` 仍是 -1 的 Link 这次没被读到，从两条链表上摘掉。

<Figure caption="effect 读取 flag ? a : b。flag 变为 false 后重新运行：旧 Link 先标成 -1，读到的恢复或新建，剩下的摘除。">
<PrepareCleanup />
</Figure>

结果和迷你版一样：分支切换后，不再读取的 Dep 不会通知这个订阅者。区别是依赖没变时，整个过程不分配新对象。

### 24.9 版本号：没有真的变，就不运行

“被通知”和“运行”是两件事。通知很便宜，只做记号；运行前再用版本号确认，依赖真的变了才运行。三个数字：

- `dep.version`：这个 Dep 每次触发加 1。把 ref 设成相同的值不触发，所以不加。
- `globalVersion`：一个模块级变量。任何 Dep 触发都加 1。
- `link.version`：订阅者上次读取时，记下的 `dep.version`。

订阅者被通知后，对自己的每个 Link 比较 `link.version` 和 `dep.version`。有一个不相等，才运行；全部相等就什么都不做。迷你版只用 `e.dirty` 布尔值，没有这一步。

computed 多做一步：**它自己也有 Dep 和版本号。** 读取 `.value` 时先检查自己依赖的版本号，没变就返回缓存。重新运行 getter 后比较新旧值：**值变了，才让 computed 自己的 `dep.version` 加 1。** 值没变，下游比较版本号时发现一样，就不运行。这就是迷你版缺的“先比较结果，再通知下游”。

```js
const n = ref(1)
const isOdd = computed(() => n.value % 2 === 1)
effect(() => console.log('odd?', isOdd.value))   // 打印 odd? true

n.value = 3   // isOdd 重新计算，结果仍是 true：effect 不运行
n.value = 4   // isOdd 变成 false：effect 运行，打印 odd? false
```

`n.value = 3` 时发生了什么：

1. `n` 的 `version` 加 1，通知它的订阅者 `isOdd`。`isOdd` 只作废缓存，并把通知传给读过它的 effect。
2. effect 被通知后，先检查自己的依赖。依赖里有 `isOdd`，所以先让 `isOdd` 刷新：重新运行 getter，得到 `true`。
3. 结果没变，`isOdd` 的 `version` 不变。effect 比较版本号，发现全都相等，不运行。

**看懂实验台的每一列。** 实验台跑的是真实的 Vue 3.5。左表“Dep”：`version` 是 `dep.version`，“订阅者”顺着订阅者链表读出。右表“订阅者”：“依赖链”顺着依赖链表读出，`v` 后面是 `link.version`，“次数”是运行或计算的次数。上方四行：这一步里谁的 `version` 变了、谁被通知、谁重新计算、谁重新运行。

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

::: deep refreshComputed 的三道关
读它能回答：读取一个 computed 时，Vue 怎样判断要不要运行 getter？

三道关，过得去才运行：1. 有订阅者而且没有 DIRTY 标志：直接返回。2. `computed.globalVersion` 等于全局的 `globalVersion`（上次检查后没有任何数据变过）：直接返回。3. 每个依赖的 `link.version` 都等于 `dep.version`：直接返回。`notify()` 只置 DIRTY 标志，不运行 getter。没有订阅者的 computed 不挂在上游 Dep 的订阅者链表上，不接收通知，只靠后两道关判断；第一个订阅者出现时它才挂上去。
:::

### 24.10 批处理，和第 25 章的分工

一个操作可能包含多次写入。如果每次写入都立刻运行订阅者，同一个 effect 会运行很多次，还会读到只改了一半的数据。

```js
const list = reactive([])
effect(() => console.log('len', list.length))   // 打印 len 0

list.push('a', 'b', 'c')   // 只打印 len 3：三次下标写入和一次 length 写入合成一批
list[3] = 'd'              // 打印 len 4
list[4] = 'e'              // 打印 len 5：两次独立的赋值，各自运行一次
```

机制有三点：

- 写入前后有一对内部操作 `startBatch` 和 `endBatch`，嵌套时只有最外层的 `endBatch` 才真正刷新。
- 订阅者被通知时只排队，不运行。同一批里一个订阅者只排一次。
- 批结束时取出排队的订阅者：有 `scheduler` 就调用它，没有就 `runIfDirty()`。

**和第 25 章的分工。** 响应式层的批只覆盖“一次写入”的内部。两次独立的赋值是两批，没有 `scheduler` 的 effect 会各运行一次。组件的渲染副作用函数有 `scheduler`：批结束时它只做 `queueJob`，真正的渲染等微任务。所以多次写入合并成一次渲染，靠的是[第 25 章](/chapters/25-scheduler)的更新队列。

::: note
`startBatch` 和 `endBatch` 是内部函数。`vue` 和 `@vue/reactivity` 都没有导出它们，业务代码不能用它们合并两次赋值。
:::

::: deep 数组和集合的特殊处理
读它能回答：为什么在 effect 里调用 `push` 不会死循环？为什么 `list.includes(list[0])` 能找到？Map 和 Set 为什么要另一套 handler？

**数组。** 数组操作会同时改变下标和 `length`，所以 `trigger` 有专门的规则：新增下标时触发该下标、`length` 和 `ARRAY_ITERATE_KEY` 的 Dep；设置 `arr.length = n` 时触发 `length`、`ARRAY_ITERATE_KEY` 和下标大于等于 n 的 Dep。`ARRAY_ITERATE_KEY` 是一个 Symbol，代表“整体读取了这个数组”，`map`、`forEach`、`for...of` 等方法只登记它，不对每个下标各登记一次。

`includes`、`indexOf`、`lastIndexOf` 先用原参数在原始数组上找，找不到且参数是代理，就换成 `toRaw(参数)` 再找一次。原因：数组里存的是原始对象，`list[0]` 取出来的是代理。

```js
const raw = { id: 1 }
const list = reactive([raw])
list.includes(raw)             // true
list.includes(list[0])         // true：第二次用原始对象找到
toRaw(list).includes(list[0])  // false：原生 includes 不认识代理
```

`push`、`pop`、`shift`、`unshift`、`splice` 会暂停依赖收集并开一个批。push 内部先读再写 `length`，不暂停的话，effect 里调用 push 会订阅 length，两个 effect 对同一个数组 push 就互相触发。开批让一次 push 的多次写入只通知一次。

**Map 和 Set。** 它们的方法依赖内部槽位，`this` 必须是真正的 Map，否则 `new Proxy(new Map(), {}).get('a')` 抛 `TypeError: Method Map.prototype.get called on incompatible receiver`。所以 Vue 对集合用只有一个 `get` 陷阱的 handler：读取 `get`、`set`、`has`、`add`、`delete`、`size`、迭代器等成员时，返回一份在原始集合上调用方法、自己负责 track 和 trigger 的同名函数：

```ts
// reactivity/src/collectionHandlers.ts(简化)
const instrumentations = {
  get(key) {
    const target = toRaw(this)
    track(target, 'get', key)
    return toReactive(target.get(key))
  }
  // set、add、delete……类似
}
// hasOwn 只认 instrumentations 自己的方法，不认 constructor 这类继承来的属性
const collectionHandlers = {
  get: (target, key, receiver) =>
    Reflect.get(hasOwn(instrumentations, key) && key in target ? instrumentations : target, key, receiver)
}
```

迭代有两个 key：`ITERATE_KEY` 对应值、条目和 `size`，`MAP_KEY_ITERATE_KEY` 只对应 `keys()`。给已有的 key 赋新值只触发前者，所以只遍历 key 的 effect 不会重新运行。
:::

::: deep 四种 handler、ReactiveFlags 和代理缓存
读它能回答：四个 reactive API 是不是四套实现？`isReactive(x)` 怎样判断？为什么 `readonly(reactive(o))` 还会随 `o` 变？

`reactive`、`shallowReactive`、`readonly`、`shallowReadonly` 是同一个函数 `createReactiveObject` 的四组参数：各用自己的 handler（普通对象一套、Map 和 Set 一套）和自己的缓存表（`reactiveMap`、`shallowReactiveMap`、`readonlyMap`、`shallowReadonlyMap`）。两个布尔值 `_isReadonly` 和 `_isShallow` 决定 `get` 的分支：只读对象自己不收集依赖，浅层对象不包装嵌套对象也不解包 ref。

**ReactiveFlags**（`__v_isReactive`、`__v_isReadonly`、`__v_isShallow`、`__v_raw`）在目标对象上并不存在，是 `get` 陷阱“回答”的问题：`reactive(o).__v_raw` 是 `o`，`o.__v_raw` 是 `undefined`。`isReactive(x)` 就是读 `x.__v_isReactive`，`toRaw` 同理。

`readonly(reactive(o))` 仍随 `o` 变化：它的 `target` 是内层的 reactive 代理，`Reflect.get(target, …)` 经过内层的 `get`，内层负责 track。

**代理缓存。** 每张表是 `WeakMap(原始对象 → 代理)`。于是 `reactive(o) === reactive(o)`，`reactive(reactive(o)) === reactive(o)`，`reactive(readonly(o))` 直接返回只读代理，`reactive(markRaw(o)) === o`。四张表分开，同一个对象才能同时有 reactive 和 readonly 两个代理。按对象缓存让 `===` 比较、`includes` 和 Map 里按对象查找有意义。
:::

### 24.11 与 signals 的关系

**signal** 是一个装着值的容器：读取时记录“谁在用我”，写入时通知这些使用者。Solid、Angular、Preact 和 Qwik 都有自己的 signals。这个模型并不新，可以追溯到 Knockout 的 observable 和 Meteor 的 Tracker。

Vue 的 `ref` 就是同一类东西：读 `.value` 是 track，写 `.value` 是 trigger（24.6）。官方文档指出，Preact 和 Qwik 的 signals 与 `shallowRef` 非常像，都用一个可变的 `.value`。Vue 的取舍是：用 `.value` 和 Proxy 换来深层响应、模板自动解包。喜欢别的写法，可以用 `shallowRef` 搭，比如 Angular 风格的 signal：

```js
function signal(initialValue) {
  const r = shallowRef(initialValue)
  const s = () => r.value            // 调用即读取
  s.set = value => { r.value = value }
  s.update = updater => { r.value = updater(r.value) }
  return s
}

const count = signal(0)
effect(() => console.log(count()))   // 打印 0
count.set(1)                         // 打印 1
count.update(n => n + 1)             // 打印 2
```

官方文档里还有 Solid 风格的 `createSignal`（读和写分成两个函数）。Vue 的响应式系统是一块通用的底座，各种 signals 的 API 都能在上面搭出来。

::: pitfalls
1. 不要在副作用函数外部解构 reactive 对象，再在函数中读取变量。原因：解构时没有正在运行的副作用函数，track 不记录。
2. 不要通过 toRaw 的结果修改数据。原因：修改不经过 set 拦截，界面不更新。
3. 不要在业务代码里读 `dep`、`deps`、`flags` 这些内部字段。它们没有公开，小版本可能改名。本章的实验台读它们，只为观察。
4. 在 effect 里调用 `push`、`splice` 等方法不会收集 `length`。需要在长度变化时重新运行，就在 effect 里读 `arr.length`。
5. 不要照搬迷你版的 `lazy` 选项。真实的 `effect()` 没有它，传了也会立即运行。
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
<Opt>trigger 运行了，但被调度函数丢弃</Opt>

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

<Sc :a="1">

下面的代码在 Vue 3.5 里运行，`n` 最后是多少？

```js
import { effect, ref } from 'vue'

let n = 0
const r = ref(1)
effect(() => { n++; r.value }, { lazy: true })
```

<Opt>0，`lazy: true` 让 effect 创建时不运行</Opt>
<Opt>1，`effect()` 没有 `lazy` 选项，立即运行了一次</Opt>
<Opt>2，创建时运行，选项又让它再运行一次</Opt>

<template #explain>

解析：Vue 3.5 的 `effect()` 没有 `lazy` 选项，传了也被忽略，函数创建后立即运行一次，所以 `n` 是 1。本章迷你版里的 `lazy` 是简化。真实的 computed 靠自己是订阅者，读取 `.value` 时才运行 getter。选 0 的人把迷你版的选项当成了真实 API。

</template>
</Sc>

<Sc :a="2">

`dep` 是 `r` 内部的 Dep。运行下面的代码后，`r.dep.version` 是多少？

```js
const r = ref(0)   // 此时 version 是 0
r.value = 1
r.value = 1
r.value = 2
```

<Opt>3</Opt>
<Opt>1</Opt>
<Opt>2</Opt>

<template #explain>

解析：Dep 每次触发加 1。第一次赋值 1 变了，version 为 1。第二次赋同一个值不触发，version 不变。赋 2 又变了，version 为 2。选 3 的人把相同值的赋值也算成一次触发。

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
- 迷你版用 Proxy、track、trigger 和 effect 实现，是全课程共用的迷你 Vue 的零件 1。
- targetMap 的结构：WeakMap(对象) → Map(属性) → Set(副作用函数)。
- 每次运行前清理旧依赖。这样分支改变后依赖仍然正确。
- computed 是订阅者，也是被订阅的数据。迷你版靠 `lazy` 和 `stale` 标记；真实的 `effect()` 没有 `lazy`，computed 自己是订阅者，读取时才运行 getter。
- ref 只有一个 Dep：读 `.value` 是 track，写 `.value` 是 trigger。对象值会被 reactive 包一层。
- toRaw 读取 \_\_v_raw，返回原始对象。只用它读取或复制数据，不用它修改数据。
- Vue 3.5 的 targetMap 第三层是 Dep。每个 Link 同时挂在订阅者的依赖链表和 Dep 的订阅者链表上。依赖清理是三个动作：标记、复用、摘除。
- dep.version 让“没有变化就不重新运行”：订阅者被通知后，先对比版本号，再决定运行。computed 值没变，自己的 version 就不变，下游不运行。
- 批处理保证一次写入内部，每个订阅者只排一次队。跨多次写入的合并靠第 25 章的更新队列。
- ref 就是一种 signal。其他框架的 signals 风格，可以用 shallowRef 搭出来。
:::

::: deep 迷你版和真实实现的差别
读它能回答：迷你版（零件 1）省略了真实 Vue 3.5 的哪些行为？

| 方面 | 真实实现（3.5.43） | 迷你版 |
|---|---|---|
| 依赖存储 | `Dep` 和 `Link` 双向链表，每个 Dep 带版本号 `version`，副作用函数运行后只清理没用到的 Link | `Set`；每次运行前清掉全部依赖再重新收集 |
| 判断“要不要重新运行” | `runIfDirty` 比较 Dep 的版本号 | `e.dirty` 布尔值：被通知时置 true，运行时置 false |
| `effect` 的返回值 | 返回 runner 函数（带 `.effect`） | 返回 `e` 对象（`e.run()`、`e.stop()`） |
| `lazy` 选项 | 3.5 已移除（用 `new ReactiveEffect(fn)` 手动运行） | 保留，用来建 computed 和渲染副作用函数 |
| 批处理 | `startBatch` / `endBatch`，一次写入通知的多个订阅者在批末尾按订阅顺序运行 | 无；`trigger` 里逐个运行 |
| `computed` | 同时是订阅者和 Dep，依赖变了先检查结果是否真的变了，没变不通知下游 | 一变就通知下游；下游读取时才重新计算 |
| 代理的覆盖范围 | `get / set / has / deleteProperty / ownKeys`，数组方法、`Map / Set`、`readonly`、`shallow` | 只有 `get / set / deleteProperty`；`in`、`for…in`、`Object.keys` 不收集，没有数组和集合的专门处理 |
| `ref` | 类 `RefImpl`，包装对象时用 `toReactive` | 对象字面量加 getter / setter，值读出时用 `reactive` 包 |
:::
