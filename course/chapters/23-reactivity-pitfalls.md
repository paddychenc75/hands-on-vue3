---
title: 响应式陷阱诊断
id: reactivity-pitfalls
stage: 4
chapter: 23
desc: 用诊断四问把响应式症状归类，再按症状、确认、根因、处方逐类定位
---

<script setup>
import FourQuestions from '../figures/23-reactivity-pitfalls/FourQuestions.vue'
import ReactivityClinic from '../labs/23-reactivity-pitfalls/ReactivityClinic.vue'
</script>

# 响应式陷阱诊断

::: goals
<Goal checks="sc:0">用诊断四问把一个响应式症状归入“数据没变、没触发、读到旧值、触发太多”之一，并选出对应的调试工具。</Goal>
<Goal checks="sc:1,ex:pitfallLost">说明解构、快照和整体替换让界面失去响应的原因，并修复。</Goal>
<Goal checks="sc:2,sc:7">判断代理身份导致的比较失败，以及模板里 ref 解包的边界。</Goal>
<Goal checks="sc:3,sc:4,ex:pitfallAwait">说明 3.5 的 props 解构为什么不丢响应、边界在哪里，并解释 `await` 之后读取的数据为什么没有被追踪。</Goal>
<Goal checks="sc:5">区分 `watch` 传值和传 getter。</Goal>
<Goal checks="sc:6,ex:pitfallLeak">找出没有随组件停止的侦听器，并让它跟随组件的生命周期。</Goal>

:::

::: rt
阅读主线约 16 分钟，深入内容约 3 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
排查响应式问题像**查热水器不出热水**：水龙头开了（数据变了），水管有没有接到热水器（依赖有没有被收集），热水器有没有点火（副作用函数有没有运行），出来的水是不是刚烧的（读到的是不是新值）。从水龙头开始一段一段问，第一个“没有”的地方就是故障段。
:::

::: terms
副作用函数（effect）
: 读取响应式数据，并在数据改变时再次运行的函数。

收集依赖（track）
: 记录“哪个副作用函数读取了哪个属性”。

触发更新（trigger）
: 再次运行读取了被修改属性的副作用函数。

快照
: 把响应式数据在某一刻的值取出来，存成普通变量。之后数据改变，快照不变。

代理身份
: `reactive` 返回的 Proxy 和原始对象是两个不同的对象，用 `===` 比较不相等。
:::

::: why
同事说：“数据明明变了，页面不动。”你打开代码，每一行看起来都对。

原因：响应式只有两个动作，读取时收集，写入时触发（第 20 章）。几乎所有陷阱，都是这两个动作之一没有发生，或者发生在错误的地方。如果你学过 React 的“闭包陷阱”：Vue 的 `setup` 只运行一次，`ref` 是一个稳定的盒子，旧值不会因为“重新渲染”产生，只会来自你自己取出来的快照。

本章先给你一套定位方法，再按病例逐个诊断。每个病例都按“症状、怎样确认、根因、处方”写，根因会指回第 20 章和第 21 章的机制。
:::

### 23.1 诊断四问和调试工具

一个响应式症状只会出在四个环节。按顺序问四个问题，第一个回答“否”的位置就是类别。

<Figure caption="诊断四问。先问数据，再问副作用函数，再问读到的值，最后问次数。">
<FourQuestions />
</Figure>

每个问题有对应的工具：

| 要确认的 | 工具 |
|---|---|
| 这个变量是不是响应式 | `isRef(x)`、`isReactive(x)`、`isProxy(x)`；`toRaw(x) === x` 为真说明它是普通值 |
| 数据现在的值 | `toRaw(state)` 打印原始对象；Vue DevTools 的组件面板可以看 `setup` 状态和 props 的当前值，也可以直接改值，验证界面会不会跟着变 |
| 组件的渲染依赖了什么，谁触发了它 | `onRenderTracked`、`onRenderTriggered` |
| `watch`、`watchEffect` 依赖了什么 | 选项里的 `onTrack`、`onTrigger` |
| 运行了几次 | 在回调里用普通变量计数 |

```js
watchEffect(() => { /* ... */ }, {
  onTrack(e) { console.log('收集', e.type, e.key) },     // 读取被记录时调用
  onTrigger(e) { console.log('触发', e.type, e.key) }    // 被哪次写入触发时调用
})
onRenderTracked(e => console.log('渲染收集', e.type, e.key))
onRenderTriggered(e => console.log('渲染被触发', e.type, e.key, e.newValue))
```

事件对象有 `target`（被读写的对象）、`type`（`get`、`set` 等）和 `key`。这四个钩子**只在开发构建里被调用**。我们用 `vue.cjs.prod.js` 实测过：注册了钩子，一次也不会收到事件。所以用它们诊断时，要在开发服务器里跑。

**没有日志本身就是线索。**如果某个组件的 `onRenderTracked` 一条记录也没有，说明渲染函数没有通过响应式对象读取任何数据。下面的实验台先带你看一遍这个现象，后面每个病例会回到对应的页签。

<Lab id="demo-reactivity-clinic" title="实验台：响应式诊所" note="六个病例，每个有“症状版”和“已修复”。例子运行在 Vue 的开发构建里，因为 onRenderTracked 等钩子在生产构建中不工作">
<template #predict>
<Sc predict :a="1">

先猜：“解构丢响应”页签的症状版里，代码是 `const { count } = state`，界面显示这个 `count`。点三次“count + 1”后，“数据里的值”和界面显示分别是多少？

<Opt>都是 3</Opt>
<Opt>数据里是 3，界面显示 0</Opt>
<Opt>数据里是 0，界面显示 3</Opt>

<template #explain>

解析：`state.count` 确实加了三次，所以数据里是 3。界面显示的是解构出来的数字，它在 setup 里读取时就固定成了 0。第一项以为解构出的变量还连着 state。第三项把方向弄反了。打开实验台试一试，注意下面的日志一直是空的：渲染没有收集到任何依赖。再切到“已修复”，点一下，日志里出现了 `get count`。

</template>
</Sc>
</template>

<ReactivityClinic />
</Lab>

### 23.2 病例组 1：丢失响应

**症状：**数据变了，界面不动。第一问“数据变了吗”回答是，第二问“副作用函数重新运行了吗”回答否。

**怎样确认：**打开 `onRenderTracked` 看渲染收集了什么。如果相关的数据一条记录也没有，说明读取没有经过响应式对象。

**根因：**依赖只在两个条件同时成立时才被收集：有副作用函数正在运行，并且读取经过了代理或 ref（第 20 章）。下面三种写法破坏其中一个。

| 写法 | 为什么丢 | 处方 |
|---|---|---|
| `const { count } = state` | 取出的是数字，是一份快照（第 3 章 3.2 节） | `toRefs(state)`，或 `toRef(state, 'count')` |
| `let n = count.value` | 同上，`.value` 的读取发生在 `setup` 里，没有副作用函数在运行 | 保留 ref，到用的地方再 `.value` |
| `state = { a: 2 }`，或 `state = reactive({ a: 2 })` | 依赖挂在“对象和属性”上，不挂在变量名上。副作用函数订阅的还是旧对象 | 对象用 `Object.assign(state, next)`；数组用 `arr.splice(0, arr.length, ...next)`；或者整个换成 `ref`，赋值 `.value = next` |

我们验证过：`Object.assign` 之后，读取 `a` 和 `b` 的副作用函数会重新运行；重新赋值变量之后，旧订阅者不再运行。

还有一个边界：`ref` 放进 `reactive` 的对象属性里会自动解包，放进数组或 `Map` 里不会。

```js
const o = reactive({ n: ref(1), list: [ref(2)] })
o.n            // 1：自动解包
o.list[0]      // 仍然是 ref，要写 o.list[0].value
o.n = 5        // 写入的是那个 ref，toRaw(o).n.value 变成 5
```

在实验台的“解构丢响应”页签里，对比两个版本的渲染日志。然后修复这道病例：

<Exercise id="pitfallLost" />

### 23.3 病例组 2：身份不相等

**症状：**`===`、`includes`、`indexOf`、`Set.has` 找不到明明存在的对象。

**怎样确认：**对两边分别调用 `toRaw`，再比较。如果这时相等，就是代理身份问题。

**根因：**`reactive` 返回的是 Proxy，原始对象仍然存在。Vue 用一个 `WeakMap` 缓存它们（第 20 章），所以同一个原始对象永远得到同一个代理：

```js
const raw = { id: 1 }
const p = reactive(raw)
p === raw                    // false
reactive(raw) === p          // true：同一个原始对象，同一个代理
reactive(p) === p            // true：代理的代理还是它自己
const list = ref([raw])
list.value.includes(raw)     // true：Vue 改写了响应式数组的 includes、indexOf、lastIndexOf
[raw].includes(p)            // false：普通数组没有这层处理
new Set([raw]).has(p)        // false
```

响应式数组被改写过，先按你传入的值找，找不到再按原始值找一次。所以出问题的总是“一边是普通容器，一边是代理”的比较。

**处方：**比较之前统一身份，用 `toRaw` 把两边都变成原始对象，或者比较 `id` 这样的标识字段。

**第三方实例。**图表、地图、编辑器的实例放进 `ref` 或 `reactive`，会被代理。有私有字段的类会直接报错：

```js
class Chart { #x = 1; get x() { return this.#x } }
reactive({ chart: new Chart() }).chart.x
// TypeError: Cannot read private member #x from an object whose class did not declare it
reactive({ chart: markRaw(new Chart()) }).chart.x   // 1
```

方法里的 `this` 是代理，私有字段只属于原始对象。处方是 `markRaw`，或者用 `shallowRef` 保存实例（第 3 章 3.3 节）。`Date` 这样的内置对象本来就不会被代理。实验台的“身份不相等”页签可以逐行运行这些表达式。

### 23.4 病例组 3：读到旧值

Vue 版的“闭包陷阱”。**症状：**界面或回调里的值比数据旧。第二问“副作用函数运行了吗”回答是，第三问“读到的是新值吗”回答否。

**根因：**读到的是快照。有三种来源。

**① 在 `setup` 里把值算好存成常量。**`setup` 只运行一次：

```js
const props = defineProps(['n'])
const label = '第 ' + props.n + ' 项'                       // 快照，只算一次
const label = computed(() => '第 ' + props.n + ' 项')       // 修复：每次依赖变化重新算
```

确认方法：看 `onRenderTracked`。症状版里子组件渲染的是一个普通字符串，没有收集到 `n`。实验台的“setup 里的快照”页签可以看到。

**② 定时器和事件监听。**回调里读 `.value`，读取发生在回调运行的那一刻，总是新值。旧值只会来自回调外面取出的快照：

```js
const n = count.value
setInterval(() => console.log(n), 1000)               // 永远是创建时的值
setInterval(() => console.log(count.value), 1000)     // 总是最新
```

**③ `watch` 回调里的新值和旧值是同一个对象。**深度侦听对象时，修改发生在原对象上，新值和旧值是同一个引用。我们验证过：侦听 `reactive` 对象，或者 `deep: true` 侦听 `ref` 的对象，`newValue === oldValue` 都为真。要对比前后，让 getter 返回一个新结果：

```js
watch(() => [state.a, state.b], ([a, b], [oldA, oldB]) => { /* 新旧不同 */ })
watch(() => ({ ...state }), (now, before) => { /* 浅拷贝，前后是两个对象 */ })
```

**3.5 的 props 解构为什么不丢响应。**解构 `defineProps` 的结果时，编译器把每一次使用改写成 `props.x`（第 5 章 5.1 节）。我们编译了下面的代码，验证过输出：

```js
const { count } = defineProps(['count'])
const snap = count                       // 编译为 const snap = __props.count，仍然是快照
const triple = computed(() => count * 3) // 编译为 __props.count * 3，在 computed 里被追踪
useFoo(count)                            // 编译为 useFoo(__props.count)，传进去的是当前的值
useFoo(() => count)                      // 传 getter，被调用方在副作用函数里读取（第 8 章 8.4 节）
watch(count, cb)                         // 编译报错：要写成 watch(() => count, cb)
```

规则是：解构出来的变量，每次使用都等于读一次 `props.x`。读取发生在 `setup` 顶层，就是快照；发生在副作用函数里，就是被追踪的依赖。传给函数时要包成 getter。

### 23.5 病例组 4：依赖没有被收集

**症状：**数据变了，`watchEffect`、`watch` 或 `computed` 不重新运行。第二问回答否，但数据确实经过了响应式对象。

**根因：**副作用函数只在**同步运行期间**收集依赖。读取发生在别处，就不会被记录。

| 读取发生的位置 | 被收集吗 |
|---|---|
| 副作用函数的同步部分 | 是 |
| `await` 之后、`.then` 回调里、`setTimeout` 回调里 | 否 |
| 这一次运行没有走到的分支 | 这一次不收集；分支条件变化、重新运行后会收集。这不是病 |
| 读取的不是响应式数据：`Date.now()`、`window.innerWidth`、`localStorage`、普通对象 | 没有可收集的 |

我们验证过：`watchEffect(async () => { await ...; y.value })` 里的 `y` 改变后，函数不会重新运行。`computed(() => Date.now())` 读两次得到同一个值，因为它没有依赖，也就不会失效。

**怎样确认：**用 `onTrack` 打印。日志里看不到的那个数据，就是没有被收集的。

**处方：**

1. `await` 之前先读完所有要追踪的数据。或者拆成两步：`watchEffect` 只负责请求并保存结果，显示用 `computed` 组合结果和其他数据。
2. 非响应式的来源，用 `ref` 包起来，由事件更新它，例如监听 `resize` 写入 `width.value`，再让 `computed` 读 `width.value`。

<Exercise id="pitfallAwait" />

### 23.6 病例组 5：侦听器不触发，或时机不对

`watch` 的数据源只有四种：`ref`、`reactive` 对象、getter 函数，以及由它们组成的数组。其他值都不是数据源。

| 写法 | 症状 | 根因 | 处方 |
|---|---|---|---|
| `watch(state.count, cb)` | 开发构建警告 `Invalid watch source`，永远不触发 | 传进去的是数字，不是数据源 | `watch(() => state.count, cb)` |
| `watch(() => state.user, cb)`，然后改 `state.user.name` | 不触发 | getter 返回的对象引用没变 | `{ deep: true }`，或者让 getter 读到具体字段 |
| `watch(state.user, cb)`，然后 `state.user = {...}` | 替换之后再也不触发 | 侦听的是旧对象 | `watch(() => state.user, cb, { deep: true })` |
| 回调里读 DOM 是旧的 | 读到更新之前的页面 | 默认 `flush: 'pre'` 在 DOM 更新前运行（第 21 章） | `flush: 'post'` |
| 页面一进来没有执行 | 首次不运行 | `watch` 默认惰性 | `immediate: true` |

后三种我们都实测过：第一行的警告文字、`state.user.name` 的修改会触发 `deep` 的 getter 和对象数据源、整体替换之后对象数据源不再触发。

### 23.7 病例组 6：无限循环和重复触发

**症状：**页面卡死，或者控制台出现 `Maximum recursive updates exceeded in component <X>`。第四问“次数合理吗”回答否。

**根因：**副作用函数修改了自己依赖的数据，写入触发更新，更新又读取并写入。Vue 的保护是：同一个任务在一次刷新里运行超过 100 次，就抛出上面的错误。我们实测，下面几种写法都在 100 多次后停下：

- `watch(items, () => { items.value = items.value.filter(Boolean) })`：`filter` 每次返回新数组，写入一定触发。
- 两个 `watch` 互相修改对方的数据源。
- `onUpdated` 或渲染函数里修改渲染依赖的数据。

**生产构建里没有这道保护**：源码里的检查在生产构建中被编译掉了。所以这类问题在开发时报错。在线上，同步循环的写法（带回调的 `watch`、渲染函数里写数据、两个 `watch` 互相修改）会占满主线程，页面卡死；`onUpdated` 里的循环会在几千次后以栈溢出报错结束（见第 21 章 21.7 节），页面之后还能用。

**处方：**把“算出来再写回”改成 `computed`；写回前判断是否真的不同，保证收敛；不要让两个侦听器互相写。

::: deep 为什么 watchEffect 里读了又写同一个 ref 不会死循环
副作用函数在运行期间收到自己的通知时，默认直接忽略，除非它带 `ALLOW_RECURSE` 标志。`watchEffect` 的函数就是副作用函数本身，所以读了又写同一个 ref 时，写入的通知被忽略。带回调的 `watch` 不同：回调不在副作用函数里运行，它是调度器里的一个任务，这个任务带 `ALLOW_RECURSE` 标志，允许在运行期间再次排队，所以会循环。组件的更新任务也带这个标志。我们验证过：`watchEffect(() => { c.value++ })` 只运行 1 次，`c.value` 是 1。注意这不等于安全：它不会“追上”自己的写入，结果停在中间状态。
:::

**`computed` 里的副作用。**`computed` 不一定造成循环，但它的写入只在有人读取它时才发生。我们验证过：`computed` 里写 `total.value = ...`，没有人读它之前 `total` 一直是 0；在 `computed` 里 `list.sort()` 会原地修改源数组，页面上显示同一份数据的别处也被改了顺序。`computed` 要保持纯：排序写 `[...list.value].sort()`。

**重复触发。**一次操作里对同一个数据修改多次，只会触发一次回调，修改被合并（第 21 章）。回调运行次数多，先查有没有连锁的 `watch`、`deep` 范围是否过大。更多性能病例见第 35 章。

### 23.8 病例组 7：生命周期之外的副作用

**症状：**组件卸载后，侦听器的回调仍在运行；反复进出页面，内存和回调数越来越多。

**根因：**`watch`、`watchEffect` 创建时，会登记到“当前活动的组件作用域”，组件卸载时作用域一起停止其中的副作用。登记只在创建的那一刻发生。异步回调运行时，`setup` 早已结束，没有当前组件，创建的侦听器不属于任何人。

我们实测了这些情况：

- `setTimeout` 回调里创建的 `watch`：卸载后继续运行。
- 手写的 `async setup()` 里，`await` 之后创建的 `watch`：继续运行。
- `onMounted(async () => { await ...; watch(...) })`：继续运行。
- `<script setup>` 顶层的 `await`：编译器插入 `withAsyncContext`，会在 `await` 之后恢复当前组件，侦听器正常停止。
- 在 `setup` 里同步创建的 `effectScope()` 是组件作用域的子作用域，之后在异步回调里 `scope.run(() => watch(...))`，卸载时一起停止。

处方按优先级：能同步创建就同步创建；必须异步时用 `effectScope`（第 7 章 7.5 节）或保存 `stop` 句柄；定时器和事件监听照常在 `onUnmounted` 里清理。3.5 的 `computed` 没有订阅者时不会挂在依赖上，所以主要泄漏的是 `watch` 和 `watchEffect`。

模块顶层的 `ref` 是整个进程的单例：浏览器里表现为跨页面共享，服务端渲染时会在不同请求之间泄漏数据（第 16 章 16.6 节、第 32 章）。

<Exercise id="pitfallLeak" />

### 23.9 病例组 8：模板里的边界

三个常见的误会，我们都在浏览器里验证过。

**① 只有顶层的 ref 会自动解包。**`o` 是普通对象 `{ r: ref(5) }` 时：

```vue
{{ o.r }}       <!-- 显示 5：显示时 Vue 会解包 -->
{{ o.r + 1 }}   <!-- 显示 [object Object]1：运算时拿到的是 ref 本身 -->
```

处方：把它放到顶层（`const { r } = o`，`r` 本身仍然是 ref），或者写成 `o.r.value + 1`，或者用 `reactive` 包住 `o`。

**② `v-for` 的别名是局部变量。**

```vue
<li v-for="{ name } in items" @click="name = 'x'">{{ name }}</li>   <!-- 没有效果，也不报错 -->
<li v-for="(item, i) in items" @click="items[i].name = 'x'">      <!-- 修改的是数据 -->
```

**③ 模板 ref 的时机。**`useTemplateRef` 的值在 `setup` 里是 `null`，在 `onMounted` 里是元素，所在元素被 `v-if` 移除后又变回 `null`。读取它的 `watch` 或副作用函数要处理 `null`。

### 23.10 速查诊断表

先问四问，再查这张表。每行的三个原因按出现频率排序。

| 症状 | 最可能的三个原因 | 先查什么 |
|---|---|---|
| 数据变了，界面不动 | 1. 解构、`.value` 取值、整体替换（23.2）<br>2. 读取在 `await` 之后或回调里（23.5）<br>3. 模板里嵌套的 ref 没有解包（23.9） | `onRenderTracked` 有没有这份数据；`isRef`、`isReactive` |
| `watch`、`watchEffect` 不运行 | 1. 传了值不是 getter（23.6）<br>2. 依赖读取在 `await` 之后（23.5）<br>3. 侦听的对象被整体替换，或缺 `deep`（23.6） | `onTrack` 的日志；开发构建的警告 |
| 回调运行了，值是旧的 | 1. `setup` 里存的快照（23.4）<br>2. `deep` 侦听时新旧是同一个对象（23.4）<br>3. 回调读 DOM 但 `flush` 不对（23.6） | 回调里打印数据当前值，对比读到的值 |
| 运行次数太多，或卡死 | 1. 写自己依赖的数据（23.7）<br>2. 两个侦听器互相修改（23.7）<br>3. `deep` 范围过大（第 35 章） | 回调里计数；看控制台有没有 `Maximum recursive updates` |
| `===`、`includes` 找不到对象 | 1. 一边是代理一边是原始对象（23.3）<br>2. `Set`、`Map` 的键混用了两种身份（23.3）<br>3. 第三方实例被代理（23.3） | 两边都 `toRaw` 再比较 |
| 卸载后仍在运行，越用越卡 | 1. 异步里创建的 `watch`（23.8）<br>2. 定时器和监听器没有清理（第 35 章）<br>3. 模块级的单例 `ref`（23.8） | 卸载后改一次数据，看回调还运行不运行 |

::: pitfalls
1. 看到数据没更新就加 `watch` 手动同步。原因：这是盖住症状，根因（读取没有连接上）还在，别的修改路径仍然不更新。先问四问。
2. 在生产构建里用 `onRenderTriggered` 诊断。原因：这些钩子只在开发构建里被调用，生产构建里什么也收不到。
3. 为了让 `computed` 里的值“更新”，在里面写赋值或原地排序。原因：`computed` 要保持纯，写入只在被读取时发生，原地排序还会改动源数据。
4. 把所有对象都 `markRaw`。原因：被标记的对象内部不再响应，读写它的属性不会触发更新。只给第三方实例用。
5. 修好之后不留回归。原因：同一个陷阱会再出现。把“次数”和“卸载后不运行”写进测试，和第 35 章的预算一样。
:::

::: selfcheck
<Sc :a="1">

点击按钮后，控制台打印 `state.count` 是 1，页面上仍显示 0。`onRenderTracked` 没有任何关于 `count` 的记录。这个症状属于哪一类？

<Opt>数据没变，写入根本没有发生</Opt>
<Opt>数据变了，但渲染从来没有收集到这份数据，所以没有触发</Opt>
<Opt>触发了，但回调读到的是旧值</Opt>
<Opt>触发太多次</Opt>

<template #explain>

解析：控制台打印证明数据变了，排除第一项。`onRenderTracked` 没有记录，说明渲染函数没有通过响应式对象读取 `count`，所以写入没有可触发的对象，属于“变了没触发”。第三项会出现 `onRenderTriggered` 的记录，只是读到旧值；这里连触发都没有，所以不是它。

</template>
</Sc>

<Sc :a="1">

下面的代码输出什么？

```js
let state = reactive({ n: 1 })
watchEffect(() => console.log(state.n))
state = reactive({ n: 2 })
state.n = 3
```

<Opt>1、2、3</Opt>
<Opt>只有 1</Opt>
<Opt>1、3</Opt>

<template #explain>

解析：`watchEffect` 订阅的是第一个代理的 `n`。变量 `state` 重新赋值后指向新对象，后面对新对象的修改，旧订阅者看不到。依赖挂在对象和属性上，不挂在变量名上。第一项、第三项以为变量名里带着响应式。修复：用 `Object.assign(state, { n: 2 })`，或者把 `state` 换成 `ref` 再改 `.value`。

</template>
</Sc>

<Sc :a="0">

下面两个比较的结果分别是什么？

```js
const raw = { id: 1 }
const state = reactive({ list: [raw] })
const picked = state.list[0]
const rawList = [raw]
rawList.includes(picked)        // ①
state.list.includes(raw)        // ②
```

<Opt>① false，② true</Opt>
<Opt>① true，② true</Opt>
<Opt>① false，② false</Opt>
<Opt>① true，② false</Opt>

<template #explain>

解析：`picked` 是代理，`rawList` 是普通数组，里面是原始对象，普通数组的 `includes` 用严格相等，所以 ① 是 false。`state.list` 是响应式数组，Vue 改写了它的 `includes`，找不到传入的值时会再按原始值找一次，所以 ② 是 true。最迷惑的是第二项：以为代理和原始对象能互相识别，只有 Vue 改写过的响应式数组方法是这样。

</template>
</Sc>

<Sc :a="0">

子组件用 Vue 3.5 的 props 解构。父组件把 `count` 从 1 改成 2。`double` 和 `triple` 分别是多少？

```vue
<script setup>
const { count } = defineProps(['count'])
const double = count * 2
const triple = computed(() => count * 3)
</script>
```

<Opt>`double` 仍是 2，`triple` 变成 6</Opt>
<Opt>`double` 变成 4，`triple` 变成 6</Opt>
<Opt>`double` 变成 4，`triple` 仍是 3</Opt>

<template #explain>

解析：编译器把每次使用 `count` 改写成 `__props.count`。`double` 的这次读取发生在 `setup` 顶层，只运行一次，是快照，仍是 2。`triple` 的读取发生在 `computed` 里，被追踪，变成 6。第二项以为解构出的变量到处都是响应式的。解构只保证“每次使用都读最新的 props”，不保证你存下来的结果会更新。

</template>
</Sc>

<Sc :a="2">

下面的代码创建后过 100 毫秒执行 `a.value++`。再过 200 毫秒，控制台一共输出几次？

```js
const a = ref(1)
watchEffect(async () => {
  await Promise.resolve()
  console.log(a.value)
})
setTimeout(() => { a.value++ }, 100)
```

<Opt>0 次，`a` 在 `await` 之后读取，函数不会运行</Opt>
<Opt>2 次</Opt>
<Opt>1 次</Opt>

<template #explain>

解析：`watchEffect` 创建时立即运行一次，同步部分遇到 `await` 就暂停，稍后接着运行并打印 1，共 1 次。读取 `a.value` 发生在 `await` 之后，没有被收集，之后 `a.value++` 不会再触发它。第一项忘了首次一定会运行。第二项以为 `a` 被追踪了。修复：在 `await` 之前读取 `a.value`。

</template>
</Sc>

<Sc :a="1">

下面的代码，每一步之间都 `await nextTick()`。`'changed'` 一共打印几次？

```js
const state = reactive({ user: { name: 'A' } })
watch(state.user, () => console.log('changed'))
state.user.name = 'B'            // ①
state.user = { name: 'C' }       // ②
state.user.name = 'D'            // ③
```

<Opt>3 次</Opt>
<Opt>1 次，只有 ①</Opt>
<Opt>2 次，① 和 ②</Opt>

<template #explain>

解析：`watch(state.user, ...)` 传进去的是当时那个 `user` 对象（响应式对象，可以作数据源）。① 修改了它，触发。② 把 `state.user` 换成了新对象，侦听器仍然盯着旧对象，没有触发。③ 修改的是新对象，也没有触发。要跟随替换，写 `watch(() => state.user, cb, { deep: true })`。第三项把整体替换也算作了变化。

</template>
</Sc>

<Sc :a="1">

组件的 `setup` 里有三处创建侦听器。组件卸载后，改变各自的数据源，哪些回调仍然会运行？

```js
setup() {
  watch(a, cbA)                                            // ①
  setTimeout(() => watch(b, cbB), 0)                       // ②
  onMounted(async () => { await load(); watch(c, cbC) })   // ③
}
```

<Opt>只有 ②</Opt>
<Opt>② 和 ③</Opt>
<Opt>①、② 和 ③</Opt>

<template #explain>

解析：① 在 `setup` 同步部分创建，登记到组件，卸载时停止。② 的回调运行时没有当前组件，不属于任何组件。③ 虽然写在 `onMounted` 里，但 `await` 之后当前组件已经丢失，同样不属于任何组件。最迷惑的是第一项：以为只有明显的 `setTimeout` 才会泄漏，却忘了 `await` 之后的位置也一样。

</template>
</Sc>

<Sc :a="1">

`o` 是普通对象 `{ r: ref(5) }`，且没有被 `reactive` 包裹。模板里写 `{{ o.r }}` 和 `{{ o.r + 1 }}`，分别显示什么？

<Opt>5 和 6</Opt>
<Opt>5 和 [object Object]1</Opt>
<Opt>[object Object] 和 [object Object]1</Opt>

<template #explain>

解析：模板只对顶层的 ref 自动解包。`{{ o.r }}` 显示时，Vue 的 `toDisplayString` 会把 ref 取出 `.value`，所以显示 5。`o.r + 1` 先做运算，拿到的是 ref 对象，转成字符串是 `[object Object]`，再拼上 1。第一项以为嵌套的 ref 在表达式里也会解包。第三项忽略了显示时的特殊处理。

</template>
</Sc>

:::

::: summary
- 诊断四问：数据变了吗，副作用函数运行了吗，读到的是新值吗，次数合理吗。第一个回答“否”的位置就是类别。
- `onRenderTracked`、`onRenderTriggered`、`onTrack`、`onTrigger` 只在开发构建里工作；没有日志本身就是线索。
- 丢失响应：解构、`.value` 取值、整体替换都让读取脱离了响应式对象。依赖挂在对象和属性上，不挂在变量名上。
- 读到旧值来自快照：`setup` 里存的常量，`deep` 侦听时同一个对象。3.5 的 props 解构在每次使用处改写成 `props.x`，传给函数要包成 getter。
- 副作用函数只在同步运行期间收集依赖：`await` 之后、回调里的读取不被追踪。
- `watch` 要传 ref、reactive 对象、getter 或它们的数组；传值不会触发。
- 带回调的 `watch` 或渲染里写自己依赖的数据会循环，生产构建没有 100 次的保护。
- 异步里创建的 `watch` 不属于组件，要用 `effectScope` 或保存 `stop`。
:::
