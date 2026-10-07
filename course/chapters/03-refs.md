---
title: 响应式基础
id: refs
stage: 1
chapter: 3
desc: ref、reactive 与解构问题
---

<script setup>
import Fig1RefValueReactive from '../figures/03-refs/Fig1RefValueReactive.vue'
import Fig2StateToRefsRef from '../figures/03-refs/Fig2StateToRefsRef.vue'
import ProxyIdentity from '../labs/03-refs/ProxyIdentity.vue'
import DestructureShallow from '../labs/03-refs/DestructureShallow.vue'
</script>

# 响应式基础：ref 和 reactive

::: goals
<Goal checks="sc:3">选择 ref 或 reactive。</Goal>
<Goal checks="sc:0">说明解构 reactive 对象后数据不更新的原因。</Goal>
<Goal checks="sc:1,ex:fixReactive,ex:refsFill">用 toRefs 解决这个问题。</Goal>
<Goal checks="sc:2">用 shallowRef、triggerRef 和 markRaw 处理大型数据和第三方对象。</Goal>

:::

::: rt
阅读主线约 10 分钟，深入内容约 3 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
响应式数据就像 **Excel 单元格**：A1 填了单价，B1 写着公式 `=A1*2`。你改 A1，B1 自动更新。Vue 里的模板就是那些“公式”。

`ref` 是一个**带盖子的盒子**：值放在 `.value` 里，Vue 盯着这个盒子。从 reactive 对象解构出来的值，就像给盒子里的东西**拍了张照片**，之后盒子里怎么变，照片都不会变。
:::

::: terms
ref
: 把值放在 .value 中的响应式对象。可用于所有类型。

reactive
: 把一个对象变为响应式数据。读写它的属性即可。

解构
: 把对象的属性取出，赋给单独的变量。

toRefs
: 把 reactive 对象的属性逐个转为 ref。

shallowRef
: 只跟踪 .value 被替换的 ref。
:::

::: why
你写 `let count = 0`，然后在点击时执行 `count++`。变量改变了，页面仍然显示 0。

原因：普通变量改变时，Vue 不知道。Vue 需要一种特殊的数据。读取时，Vue 记录谁在使用它。修改时，Vue 再次运行这些使用者。

本章的 ref 和 reactive 创建这种数据。
:::

### 3.1 ref 和 reactive：创建响应式数据

Vue 提供两个函数来创建响应式数据：`ref` 和 `reactive`。

```js
import { ref, reactive } from 'vue'

// ref：用于所有类型。在 JavaScript 中使用 .value
const count = ref(0)
count.value++

const user = ref({ name: 'Evan' })
user.value.name = 'You'        // 对象内部的属性也是响应式的
user.value = { name: 'New' }   // 可以替换整个值

// reactive：只用于对象、数组、Map 和 Set。不使用 .value
const form = reactive({ name: '', age: 18 })
form.age++
// form = reactive({...})      // ❌ 替换后，模板仍使用旧对象
```

两者的规则相同：读取时，Vue 记录谁在使用数据。修改时，Vue 通知这些使用者。下图比较两者的结构。

<Figure>
<Fig1RefValueReactive />
<template #caption>

ref 把值放在 `value` 中。reactive 用 Proxy 包住原始对象。两者的规则相同：读取时记录依赖（track），修改时通知依赖它的副作用函数（trigger）。

</template>
</Figure>

ref 是一个有 `value` 属性的对象。Vue 只能在读写 value 时收集依赖和触发更新。所以在 JavaScript 中，必须通过 `.value` 读写 ref。

**场景：编辑任务的表单。**字段相关，要一起提交和重置，用 reactive。重置时修改原对象的属性，不要给变量赋新对象。

```js
const initial = { title: '', owner: '', due: '' }
const form = reactive({ ...initial })

function reset() {
  Object.assign(form, initial)   // ✅ 模板使用的仍是同一个对象
}
```

按下表选择 API：

| API | 使用场景 | 注意 |
|---|---|---|
| `ref` | 基本类型。需要替换的值。组合式函数的返回值。 | 在 JavaScript 中使用 `.value`。 |
| `reactive` | 一组相关的数据，例如表单。 | 不要替换整个对象。解构时使用 `toRefs`。 |
| `readonly` | 传给其他组件、但不允许修改的数据。 | 修改时，开发环境显示警告。 |
| `shallowRef`、`markRaw` | 大型数据。第三方实例，例如图表。 | 见 3.3 节。 |

::: note
**说明：**Vue 官方文档推荐默认使用 `ref`。原因：ref 可以用于所有类型，也可以替换整个值。
:::

### 3.2 解构 reactive：用 toRefs 保持连接

解构 reactive 对象时，变量得到的是属性当时的值。之后 state 改变，这个变量不变。`toRefs` 为每个属性创建一个 ref。这个 ref 每次都读写 state 的属性，所以保持连接。

```js
const state = reactive({ count: 0 })
let { count } = state                 // ❌ count 是数字 0 的副本
const { count: c2 } = toRefs(state)   // ✅ c2 是连接到 state.count 的 ref
```

下图说明解构和 toRefs 的区别。

<Figure>
<Fig2StateToRefsRef />
<template #caption>

解构只复制当时的值，之后和 state 断开。toRefs 创建的 ref 把读写都转到 `state.count`，所以保持连接。

</template>
</Figure>

**场景：组合式函数返回一组状态。**函数内部用 reactive 管理分页。返回 `toRefs(state)`，调用者可以放心解构。

```js
function usePager() {
  const state = reactive({ page: 1, size: 20 })
  const next = () => state.page++
  return { ...toRefs(state), next }
}

const { page, size, next } = usePager()   // page 和 size 是 ref，保持响应
next()                                     // page.value 变为 2
```

注意：只需要一个属性时，用 `toRef(state, 'page')`。

3.3 节末尾的实验台可以试验解构和 toRefs。

<Exercise id="refsFill" />

<Exercise id="fixReactive" />

::: deep ref 和 reactive 的内部结构
ref 用 getter 和 setter 拦截 value 的读写：

```js
class RefImpl {
  dep = new Dep()                          // 这个 ref 自己的依赖列表
  constructor(value) {
    this._rawValue = toRaw(value)          // 原始值，用于比较
    this._value = toReactive(value)        // 对象转为 reactive
  }
  get value() {
    this.dep.track()                       // 读：收集依赖
    return this._value
  }
  set value(v) {
    if (hasChanged(toRaw(v), this._rawValue)) {   // 用 Object.is 比较新旧值
      this._rawValue = toRaw(v)
      this._value = toReactive(v)
      this.dep.trigger()                   // 写：值改变时才触发更新
    }
  }
}
```

setter 先比较新旧值。值相同时，Vue 不触发更新。所以 `count.value = count.value` 不会让页面重新渲染。

reactive 不会为同一个对象创建两个代理。Vue 用 `WeakMap` 缓存代理：

```js
const reactiveMap = new WeakMap()       // 原始对象 -> 代理

function createReactiveObject(target, baseHandlers) {
  if (typeof target !== 'object' || target === null) return target  // 基本类型：直接返回
  if (target.__v_raw && target.__v_isReactive) return target         // 已经是代理：直接返回
  const existing = reactiveMap.get(target)
  if (existing) return existing                                      // 已有代理：返回缓存
  const proxy = new Proxy(target, baseHandlers)
  reactiveMap.set(target, proxy)
  return proxy
}

// get 拦截器的关键部分
get(target, key, receiver) {
  if (key === '__v_isReactive') return true        // isReactive() 读取这个标记
  if (key === '__v_raw') return target             // toRaw() 读取这个标记
  const res = Reflect.get(target, key, receiver)
  track(target, key)
  if (isRef(res)) return isArray(target) && isIntegerKey(key) ? res : res.value  // 解包 ref，数组除外
  if (isObject(res)) return reactive(res)          // 访问时才代理嵌套对象（懒代理）
  return res
}
```

<Lab id="demo-identity" title="实验台：代理的身份" note="每一行都在你的浏览器中真实运行">
<template #predict>
<Sc predict :a="2">

先猜：运行这段代码。isRef(p.list[0]) 的结果是什么？

```js
const raw = { nested: { a: 1 }, list: [ref(1)] }
const p = reactive(raw)
isRef(p.list[0])
```

<Opt>false，p.list[0] 自动解包为 1</Opt>
<Opt>报错，reactive 不接受 ref</Opt>
<Opt>true，数组中的 ref 不解包</Opt>

<template #explain>

解析：reactive 只解包对象属性中的 ref。数组和 Map 中的 ref 保持原样，所以要写 p.list[0].value。第一项把对象属性的规则用到了数组上。reactive 可以包含 ref，所以不报错。打开实验台，看表格中 isRef(p.list[0]) 一行，再和 p2.r 一行比较。

</template>
</Sc>
</template>

<ProxyIdentity />
</Lab>
:::

### 3.3 shallowRef、triggerRef 和 markRaw

ref 和 reactive 会深层代理对象。数据很大，或者对象来自第三方库时，深层代理浪费性能，还可能出错。下面三个 API 解决这个问题：

- `shallowRef`：只跟踪 `.value` 的替换，不代理内部。
- `triggerRef`：手动触发 shallowRef 的更新。
- `markRaw`：标记一个对象，Vue 永远不代理它。

```js
const list = shallowRef([1, 2])
list.value.push(3)            // 只改内部：页面不更新
list.value = [...list.value]  // 替换 .value：页面更新
```

**场景：接口返回的大任务列表。**列表有几千项，每次都整体替换。用 shallowRef。Vue 不为每个任务创建代理。

```js
const tasks = shallowRef([])

async function loadTasks() {
  tasks.value = await api.getTasks()   // 替换 .value：页面更新
}
function addTask(task) {
  tasks.value = [...tasks.value, task] // 不用 push：push 不触发更新
}
```

**场景：原地修改一项后通知页面。**复制整个数组的代价太大时，直接修改元素。然后调用 triggerRef，手动触发更新。

```js
function markDone(index) {
  tasks.value[index].done = true   // 只改内部：页面不更新
  triggerRef(tasks)                // 手动通知依赖 tasks 的渲染
}
```

**场景：把实时同步的客户端放在 reactive 对象中。**看板用第三方库的 SyncClient 通过 WebSocket 接收任务的修改。Vue 默认深层代理放入的对象和类实例。代理这个实例浪费性能，还可能让库出错。例如，类用私有字段（`#socket`）时，通过代理调用它的方法会抛出 TypeError。用 markRaw 标记实例。

```js
const board = reactive({ client: null, online: false })

function connect(url) {
  board.client = markRaw(new SyncClient(url))   // isReactive(board.client) 为 false
  board.client.on('open', () => { board.online = true })
}
```

说明：浏览器内置的对象，例如 `WebSocket` 和 `Date`，Vue 本来就不代理。markRaw 用于库创建的普通对象和类实例。

注意：不要对需要逐个字段编辑的数据用 shallowRef，例如表单。修改字段时页面不更新。这类数据用 ref 或 reactive。

下面的实验台有两部分。“解构”部分对应 3.2 节。“浅层响应”部分试验 shallowRef 和 triggerRef。

<Lab id="demo-refs" title="实验台：解构和浅层响应" note="运行真实的 Vue">
<template #predict>
<Sc predict :a="1">

先猜：点击 state.count++ 三次。state.count、count、countRef 分别显示什么？

```js
const state = reactive({ count: 0 })
let { count } = state
const { count: countRef } = toRefs(state)
```

<Opt>3、3、3</Opt>
<Opt>3、0、3</Opt>
<Opt>3、0、0</Opt>

<template #explain>

解析：解构只复制当时的值，所以 count 停在 0。toRefs 为每个属性创建一个 ref。这个 ref 读写原对象的属性，所以 countRef 跟随更新。“3、3、3”以为解构保持响应式。“3、0、0”以为 toRefs 也只复制值。打开实验台，点击 state.count++ 三次，看三行数字。

</template>
</Sc>
</template>

<DestructureShallow />
</Lab>

::: deep customRef：控制收集依赖和触发更新的时间
`customRef` 给你 `track` 和 `trigger` 两个函数。你决定什么时候调用它们。下面的示例写入后延迟触发更新：

```js
function useDebouncedRef(value, delay = 300) {
  let timer
  return customRef((track, trigger) => ({
    get() {
      track()                       // 读取时收集依赖
      return value
    },
    set(v) {
      clearTimeout(timer)
      timer = setTimeout(() => {
        value = v
        trigger()                   // 停止输入 delay 毫秒后触发更新
      }, delay)
    }
  }))
}
const keyword = useDebouncedRef('')   // 可以直接用于 v-model
```
:::

::: pitfalls
1. 不要直接解构 reactive 对象。使用 `toRefs`。否则解构出的值不更新。
2. 不要给 reactive 变量赋一个新对象，例如 `form = reactive({...})`。原因：模板在第一次渲染时记住的是旧对象。赋值只改变变量，不改变模板使用的对象。要重置表单，写 `Object.assign(form, 初始值)`。
3. 读取数组和 Map 中的 ref 时，写 `list[0].value`。原因：Vue 只在 reactive 对象的属性中自动解包 ref。数组元素和 Map 的值不解包。
:::

::: selfcheck
<Sc :a="1">

下面的代码打印什么？

```js
const state = reactive({ count: 0 })
let { count } = state
state.count++
console.log(count)
```

<Opt>1</Opt>
<Opt>0</Opt>
<Opt>undefined</Opt>

<template #explain>

解析：解构时，count 得到数字 0 的副本。之后 state.count 改变，副本不变。

</template>
</Sc>

<Sc :a="2">

下面的代码打印什么？

```js
const state = reactive({ count: 0 })
const { count } = toRefs(state)
state.count = 5
console.log(count.value)
```

<Opt>0</Opt>
<Opt>undefined</Opt>
<Opt>5</Opt>

<template #explain>

解析：toRefs 为每个属性创建一个 ref。读取 `count.value` 时，ref 读取 `state.count`。所以值是 5。

</template>
</Sc>

<Sc :a="0">

模板显示 `{{ list.length }}`。执行下面的代码后，页面显示什么？

```js
const list = shallowRef([1, 2])
list.value.push(3)
```

<Opt>仍然显示 2</Opt>
<Opt>显示 3</Opt>
<Opt>控制台报错</Opt>

<template #explain>

解析：shallowRef 只跟踪 `.value` 的替换。push 修改数组内部，不触发更新。写 `list.value = [...list.value, 3]`，或调用 `triggerRef(list)`。

</template>
</Sc>

<Sc :a="0">

下面哪种数据最适合用 reactive，而不是 ref？

<Opt>有多个字段的表单对象</Opt>
<Opt>一个计数器的数字</Opt>
<Opt>一个会被整体替换的列表</Opt>
<Opt>组合式函数返回的单个值</Opt>

<template #explain>

解析：表单的字段相关，放在一个 reactive 对象中，可以一次提交或重置。reactive 不能保存数字等基本类型，所以计数器用 ref。会被整体替换的值用 ref。原因：替换 reactive 变量后，模板仍使用旧对象。组合式函数返回 ref，这样调用者可以解构。Vue 官方推荐默认使用 ref。

</template>
</Sc>

<Sc :a="0">

回顾（第 1 章）：第 1 章写了 `const count = ref(0)`，然后执行 `count.value++`。`count` 用 const 声明，为什么还能改变？

<Opt>const 只固定 ref 对象，.value 可以改</Opt>
<Opt>ref 让 const 变量可以重新赋值</Opt>
<Opt>count.value++ 创建了一个新的 ref</Opt>

<template #explain>

解析：const 只禁止给变量重新赋值。`count` 一直指向同一个 ref 对象，改变的是它的 value 属性。ref 不改变 JavaScript 的 const 规则。`count.value++` 只调用 value 的 setter，不创建新 ref。所以模板一直跟踪同一个对象。

</template>
</Sc>

:::

::: summary
- ref 用于所有类型，使用 .value。reactive 只用于对象，不要整体替换。
- 从 reactive 对象解构出的普通值不更新。用 toRefs 或 toRef 保持连接。
- 只整体替换的大型数据用 shallowRef。原地修改后调用 triggerRef。第三方实例用 markRaw。
:::
