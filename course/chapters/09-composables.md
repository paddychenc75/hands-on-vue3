---
title: 组合式函数
id: composables
stage: 2
chapter: 9
desc: setup、useXxx 逻辑复用
---

<script setup>
import ComposableOwnState from '../figures/09-composables/ComposableOwnState.vue'
import ComposeDemo from '../labs/09-composables/ComposeDemo.vue'
import FetchDemo from '../labs/09-composables/FetchDemo.vue'
</script>

# 组合式函数

::: goals
<Goal checks="sc:0,ex:counterFill,ex:toggle">把有状态的逻辑提取为 `useXxx()` 函数。</Goal>
<Goal checks="sc:3">说明组合式函数比 mixin 好的原因。</Goal>
<Goal checks="sc:1,sc:2">使用组合式函数的约定：同步调用、返回 ref、接收 getter。</Goal>

:::

::: rt
阅读主线约 10 分钟，深入内容约 3 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
组合式函数就是**乐高积木**：`useMouse`、`useFetch` 各自封装好一块能力，组件需要什么就拼什么。
:::

::: terms
组合式函数（composable）
: 以 use 开头、使用响应式 API 的函数。

逻辑复用
: 多个组件调用同一个函数，得到各自的数据。

清理
: 组件卸载时删除监听、定时器等副作用。

toValue
: 把 ref、getter 或普通值统一读成普通值。
:::

::: why
你把跟踪鼠标坐标的代码复制到两个组件中。后来你修复了一个错误，但只改了一个组件。另一个组件仍然出错。

原因：同一段逻辑有两份副本。修改时，你必须同步修改每一份。

本章把这段逻辑提取为组合式函数 useMouse。每个组件调用它，得到自己的数据。
:::

### 9.1 把逻辑提取为 useMouse

`setup()` 在组件创建时运行一次。在 setup 中创建的 ref、computed 和 watch 属于当前组件。组件卸载时，Vue 停止它们。

组合式函数是一个普通函数。它使用响应式 API，并返回响应式数据。按下面的步骤提取：

1. 把 ref、监听和钩子移进一个以 use 开头的函数。
2. 在 onMounted 中添加监听，在 onUnmounted 中删除监听。
3. 返回由 ref 组成的普通对象。

```js
// useMouse.js
export function useMouse(target) {
  const x = ref(0), y = ref(0)
  function update(e) {
    const r = target.value.getBoundingClientRect()
    x.value = Math.round(e.clientX - r.left)
    y.value = Math.round(e.clientY - r.top)
  }
  let el = null
  onMounted(() => {
    el = target.value                 // 保存元素。卸载时 target.value 已经是 null
    el.addEventListener('pointermove', update)
  })
  onUnmounted(() => el?.removeEventListener('pointermove', update))
  return { x, y }               // 返回 ref。调用方可以解构
}

// 组件中：在 setup 顶层同步调用
const box = useTemplateRef('box')
const { x, y } = useMouse(box)
```

每次调用都创建新的数据。一个组件可以调用多个组合式函数，每个函数提供一种功能。下图说明两个组件调用同一个函数的结果。

<Figure caption="两个组件调用同一个组合式函数，各自得到新的 ref。钩子注册到调用它的组件上。">
<ComposableOwnState />
</Figure>

在 setup 顶层同步调用组合式函数。onMounted 把钩子注册到“当前组件”。在 setTimeout 回调中，或普通 setup 的 await 之后，没有当前组件，钩子不运行。要在组件之间共享同一份数据，使用 Pinia（[第 18 章](/chapters/18-pinia)）。

<Exercise id="counterFill" />

<Exercise id="toggle" />

### 9.2 用组合式函数代替 mixin

Vue 2 用 mixin 复用逻辑。mixin 的属性都合并到同一个 this 上。组合式函数用普通的函数调用和解构，没有这些问题：

|  | Vue2 mixin | 组合式函数 |
|---|---|---|
| 数据来源 | 不能确定 this.x 来自哪个 mixin | `const { x } = useMouse()` 显示来源 |
| 名称冲突 | 同名属性互相覆盖 | 解构时可以改名 |
| 参数 | 不能直接传参数 | 使用普通函数参数 |
| TypeScript | 类型推导困难 | 支持类型推导 |

Vue 3 仍然支持 mixin，但不再推荐。新代码使用组合式函数。

::: deep VueUse：常用组合式函数的集合
VueUse 是一个开源库。它提供 200 多个组合式函数。安装 `@vueuse/core` 后使用：

```js
import { useMouse, useStorage, useFetch } from '@vueuse/core'

const { x, y } = useMouse()                        // 鼠标坐标。组件卸载时自动删除监听
const theme = useStorage('theme', 'light')         // 和 localStorage 同步的 ref
const { data, error, isFetching } = useFetch('/api/user').json()   // 请求数据
```

先在 VueUse 中查找需要的功能，再决定是否自己写。

VueUse 的源代码也是学习材料。每个函数都很短，并处理了清理、SSR 和参数为 ref 的情况。阅读 useMouse 和 useStorage 的源代码，学习这些写法。
:::

### 9.3 接收 ref 参数：useDebounced

组合式函数可以接收 ref，并侦听它。下面的 useDebounced 在 source 停止变化一段时间后，才更新输出。

```js
// useDebounced.js
export function useDebounced(source, delay = 400) {
  const out = ref(source.value)
  let timer
  watch(source, v => {
    clearTimeout(timer)
    timer = setTimeout(() => (out.value = v), delay)
  })
  return out
}
```

**场景：搜索框停止输入后才请求。**把输入框的 ref 传给 useDebounced。侦听输出，不侦听输入。

```js
const text = ref('')                          // <input v-model="text">
const debounced = useDebounced(text, 500)
watch(debounced, q => search(q))              // 停止输入 0.5 秒后才请求
```

传入 ref 本身，不要传入 `text.value`。传入的值是普通字符串，函数不能侦听它。

<Lab id="demo-compose" title="实验台：两个组合式函数" note="运行真实的 Vue">
<template #predict>
<Sc predict :a="0">

先猜：在输入框中快速输入 abc，然后停止。debounced 怎样变化？

```js
const debounced = useDebounced(text, 500)
// useDebounced 内部
watch(source, v => {
  clearTimeout(timer)
  timer = setTimeout(() => (out.value = v), delay)
})
```

<Opt>停止 0.5 秒后，直接变为 abc</Opt>
<Opt>依次变为 a、ab、abc，间隔 0.5 秒</Opt>
<Opt>每次按键后立即变化</Opt>

<template #explain>

解析：每次输入都清除上一个定时器。所以只有最后一个定时器运行，debounced 直接变为 abc。第二项以为每个定时器都保留。第三项忽略了 500 毫秒的延迟。打开实验台，在右边的输入框中快速输入 abc，看 debounced 一行。

</template>
</Sc>
</template>

<ComposeDemo />
</Lab>

### 9.4 用 toValue 接收 ref、getter 或普通值

调用方手中的数据有三种形式：普通值、ref 和 getter 函数。用 `toValue()` 统一读取。在 `watchEffect` 中调用 toValue，参数改变时，函数自动重新运行。

```js
toValue('/api/user/1')            // '/api/user/1'
toValue(urlRef)                   // urlRef.value
toValue(() => `/api/user/${id}`)  // 调用 getter，返回它的结果
```

**场景：props.id 改变时重新请求，并取消上一个请求。**useFetch 在 watchEffect 中读取 `toValue(url)`。`onWatcherCleanup` 在下次运行前取消旧请求。

```ts
import { ref, shallowRef, watchEffect, toValue, onWatcherCleanup } from 'vue'

export function useFetch(url) {            // url: string | Ref<string> | () => string
  const data = shallowRef(null)
  const error = ref(null)
  const loading = ref(false)

  watchEffect(async () => {
    const controller = new AbortController()
    onWatcherCleanup(() => controller.abort())   // url 改变：取消上一个请求
    loading.value = true
    error.value = null
    try {
      const res = await fetch(toValue(url), { signal: controller.signal })  // toValue(url) 在 await 之前读取，所以 url 成为依赖（第 4.3 节）
      data.value = await res.json()
    } catch (e) {
      if (e.name === 'AbortError') return         // 已取消：新请求仍在进行，不修改 loading
      error.value = e
    }
    loading.value = false
  })
  return { data, error, loading }
}

useFetch('/api/user/1')
useFetch(userUrlRef)
useFetch(() => `/api/user/${props.id}`)    // props.id 改变时自动重新请求
```

不要写 ``useFetch(`/api/user/${props.id}`)``。调用时就读取了 props.id，传入的只是一个字符串。传入 getter，或传入 `toRef(props, 'id')`。

<Lab id="demo-fetch" title="实验台：useFetch 和请求取消" note="模拟的 fetch 需要 300 到 1200 毫秒，并支持 AbortSignal">
<template #predict>
<Sc predict :a="1">

先猜：等待 /api/user/1 完成。然后快速点击 2、3、4。每个请求需要 300 到 1200 毫秒。哪些请求完成？

```js
watchEffect(async () => {
  const controller = new AbortController()
  onWatcherCleanup(() => controller.abort())
  data.value = await fetch(url, { signal: controller.signal })
})
```

<Opt>2、3、4 都完成，data 是最后返回的</Opt>
<Opt>只有 4 完成，2 和 3 被取消</Opt>
<Opt>只有 2 完成，之后的点击被忽略</Opt>

<template #explain>

解析：id 改变时，watchEffect 重新运行。重新运行前，onWatcherCleanup 调用 controller.abort()，取消上一个请求。所以只有最后的 4 完成，data 总是和 id 一致。第一项是没有取消时的结果。第三项把取消的方向弄反了。打开实验台，等 id 1 完成，快速点击 2、3、4。看日志中的“取消”和“完成”。

</template>
</Sc>
</template>

<FetchDemo />
</Lab>

::: deep 组合式函数的 API 设计
组合式函数的参数和返回值就是它的 API。下面是 4 条设计规则。

**1. 可选参数放在一个选项对象中，并提供默认值。**以后增加选项时，调用方的代码不用改。

```ts
export interface UseCounterOptions { min?: number; max?: number; step?: number }

export function useCounter(initial = 0, options: UseCounterOptions = {}) {
  const { min = -Infinity, max = Infinity, step = 1 } = options    // 解构并设置默认值
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  // …
}
useCounter(5, { max: 10 })     // 只传需要的选项
```

**2. 需要校验的状态，返回可写的计算属性。**可写 computed 的写法见 [第 4 章](/chapters/04-computed)。调用方可以直接用 v-model，写入的值仍经过检查：

```js
  const raw = ref(clamp(initial))
  const count = computed({
    get: () => raw.value,
    set: v => { raw.value = clamp(Number(v)) }   // 所有写入都经过 clamp
  })
  const inc = () => { count.value += step }
  const dec = () => { count.value -= step }
  return { count, inc, dec }
// 模板：<input type="number" v-model="count"> 输入 99 时，count 变为 10
```

**3. 只想让调用方读取的状态，返回 readonly，并提供修改函数。**这样所有修改都经过一个入口：

```js
export function useCart() {
  const items = ref<Item[]>([])
  const add = (item: Item) => { items.value.push(item) }
  return { items: readonly(items), add }     // items.value.push() 会失败并警告
}
```

需要用属性访问时，调用方写 `reactive(useCart())`。

**4. 在服务端渲染中也能运行。**按下面的规则写：

1. 不要在函数顶层访问 window 和 document。在 onMounted 中访问。
2. 不要把每个用户的状态放在模块顶层。服务器上的所有请求共享模块。
3. 用 `getCurrentInstance()` 判断是否在组件中，再注册生命周期钩子。`getCurrentInstance` 没有列在官方 API 文档中。Vue 把它当作内部函数，VueUse 等库在用。自己的项目里更稳妥的写法是：让调用方在 setup 中同步调用组合式函数，把 SSR 的判断交给 `import.meta.env.SSR` 或 `typeof window`。
4. 用 `onScopeDispose` 清理。它在组件和 effectScope 中都能运行。

```js
export function useWindowWidth(): { width: Readonly<Ref<number>> } {
  const width = ref(0)                          // 服务器上返回 0。不访问 window
  const update = () => { width.value = window.innerWidth }
  if (getCurrentInstance()) {
    onMounted(() => {                           // 只在浏览器中运行
      update()
      window.addEventListener('resize', update)
    })
  }
  onScopeDispose(() => {
    if (typeof window !== 'undefined') window.removeEventListener('resize', update)
  })
  return { width: readonly(width) }
}
```

为返回值声明接口，例如 `UseCounterReturn`。调用方可以用这个类型声明自己的变量。
:::

### 9.5 用 effectScope 停止一组副作用

在 setup 之外创建的 computed 和 watch 不属于任何组件。它们不会自动停止。`effectScope()` 收集在 `scope.run()` 中创建的副作用。`scope.stop()` 一次停止它们。

```js
const scope = effectScope()
scope.run(() => {
  const double = computed(() => count.value * 2)
  watch(double, v => console.log(v))
  onScopeDispose(() => console.log('已停止'))   // scope.stop() 时运行
})
scope.stop()                                     // computed 和 watch 一起停止
```

**场景：看板的“实时同步”开关。**syncOn 绑定到开关。打开时，侦听任务修改并定时拉取。关闭时，停止全部。这个 scope 在侦听器回调中创建，不属于组件。所以组件卸载时也要停止它。

```js
let scope
watch(syncOn, on => {
  scope?.stop()                                     // 先停止上一组
  if (!on) return
  scope = effectScope()
  scope.run(() => {
    watch(() => board.tasks, saveTasks, { deep: true })
    const timer = setInterval(pullChanges, 5000)
    onScopeDispose(() => clearInterval(timer))      // scope.stop() 时运行
  })
})
onUnmounted(() => scope?.stop())
```

**场景：用户退出登录时，停止和这个用户有关的副作用。**下面的代码在组件之外运行，Vue 不会自动停止这些侦听器。把它们放进一个 scope，退出登录时停止它。

```js
// session.js
let userScope
export function onLogin(user) {
  userScope = effectScope()
  userScope.run(() => {
    watch(() => prefs.theme, theme => api.savePrefs(user.id, { theme }))
    watchEffect(() => { document.title = `(${unread.value}) 任务看板` })
  })
}
export function onLogout() {
  userScope?.stop()                                 // 两个侦听器一起停止
}
```

不要在 setup 顶层用 effectScope 包装普通的侦听器。组件卸载时，Vue 已经停止它们。Pinia 也用 effectScope 管理每个 store。

::: deep 用 effectScope 共享一个组合式函数
多个组件共享同一份数据时，只创建一次副作用。最后一个组件卸载时，停止它们。

```js
// 多个组件共享一个组合式函数的数据。最后一个组件卸载时，停止副作用
function createSharedComposable(composable) {
  let users = 0, state, scope
  return (...args) => {
    users++
    if (!state) {
      scope = effectScope(true)                  // true：不属于当前组件
      state = scope.run(() => composable(...args))
    }
    onScopeDispose(() => {                       // 当前组件卸载时运行
      if (--users === 0) { scope.stop(); state = scope = undefined }
    })
    return state
  }
}
export const useSharedMouse = createSharedComposable(useMouse)  // 只添加一个监听
```
:::

::: pitfalls
1. 在 setup 的顶层同步调用组合式函数。不要在 `setTimeout` 回调中或普通 setup 的 `await` 之后调用。否则钩子不运行。
2. 返回由 ref 组成的普通对象。不要返回 reactive 对象。否则调用方解构后数据不更新。
3. 在 onUnmounted 中删除组合式函数添加的监听。否则组件卸载后，监听仍然运行，造成内存泄漏。
:::

::: selfcheck
<Sc :a="1">

组件 A 和组件 B 都调用 `useCounter()`。在组件 A 中调用 `inc()` 两次。B 中的 count 是多少？

```js
export function useCounter() {
  const count = ref(0)
  return { count, inc: () => count.value++ }
}
```

<Opt>2</Opt>
<Opt>0</Opt>
<Opt>1</Opt>

<template #explain>

解析：ref(0) 在函数中创建。每次调用都创建新的 ref，所以 A 和 B 不共享数据。要共享数据，使用 Pinia。

</template>
</Sc>

<Sc :a="0">

200ms 后，x 的值是多少？

```js
function usePoint() {
  const p = reactive({ x: 0 })
  setTimeout(() => { p.x = 5 }, 100)
  return p
}
const { x } = usePoint()
```

<Opt>0</Opt>
<Opt>5</Opt>
<Opt>undefined</Opt>

<template #explain>

解析：解构 reactive 对象时，x 得到当时的普通值 0。之后的修改与 x 无关。返回由 ref 组成的普通对象，调用方解构后仍是响应式数据。

</template>
</Sc>

<Sc :a="2">

useMouse 内部调用 `onMounted`。下面哪种调用方式会让这个钩子不运行？

<Opt>在 setup 顶层同步调用 useMouse()</Opt>
<Opt>在另一个组合式函数中调用，那个函数在 setup 顶层同步调用</Opt>
<Opt>在 setTimeout 回调中调用 useMouse()</Opt>

<template #explain>

解析：onMounted 把钩子注册到当前组件。setTimeout 回调运行时，setup 已经结束，没有当前组件。所以钩子不运行。嵌套调用没有问题，只要整个调用是同步的。

</template>
</Sc>

<Sc :a="1">

组件同时使用 mouseMixin 和 scrollMixin。两个 mixin 的 data 中都有 x。和 `useMouse()` 相比，这里有什么问题？

<Opt>mixin 中 data 的 x 不是响应式的</Opt>
<Opt>同名的 x 互相覆盖，也看不出来源</Opt>
<Opt>Vue 3 已经不能使用 mixin</Opt>

<template #explain>

解析：mixin 的属性都合并到同一个 this 上，所以同名的 x 只剩一个。读 `this.x` 时，也看不出它来自哪个 mixin。组合式函数没有这些问题：`const { x: mouseX } = useMouse()` 可以改名，来源也清楚。mixin 中的 data 是响应式的。Vue 3 仍然支持 mixin，只是不再推荐。

</template>
</Sc>

<Sc :a="1">

回顾（第 5 章）：子组件写 `useTitle(props.title)`。useTitle 在 watchEffect 中把参数写入 `document.title`。父组件改变 title 后，页面标题会怎样？

```js
function useTitle(title) {
  watchEffect(() => { document.title = title })
}
```

<Opt>随之改变，props 是响应式的</Opt>
<Opt>不变，传入的只是当时的字符串</Opt>
<Opt>报错，props 不能传给组合式函数</Opt>

<template #explain>

解析：第 5 章：props 是响应式对象。但是 `props.title` 在调用时就被读取，传入的是一个字符串。watchEffect 只读取这个字符串，没有读取 props。所以它没有依赖，标题不变。props 可以传给组合式函数，不会报错。修复：传入 getter `useTitle(() => props.title)`，在 useTitle 中调用它；或传入 `toRef(props, 'title')`。

</template>
</Sc>

:::

::: summary
- 组合式函数以 use 开头，并使用响应式 API。每次调用都创建新的数据。要共享数据，使用 Pinia。
- 同步调用。返回 ref。自己清理。
- 和 mixin 相比，组合式函数显示数据来源，可以改名，可以传参数。
- 接收 ref 或 getter，不要接收读取后的值。用 toValue 统一读取。
- effectScope 收集一组副作用，scope.stop() 一次停止它们。
:::
