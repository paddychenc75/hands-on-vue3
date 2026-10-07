---
title: 生命周期钩子
id: lifecycle
stage: 2
chapter: 6
desc: 挂载、更新、卸载、KeepAlive
---

<script setup>
import ParentChildHookOrder from '../figures/06-lifecycle/ParentChildHookOrder.vue'
import KeepAliveLifecycle from '../figures/06-lifecycle/KeepAliveLifecycle.vue'
import TemplateRefTiming from '../labs/06-lifecycle/TemplateRefTiming.vue'
import LifeHooks from '../labs/06-lifecycle/LifeHooks.vue'
</script>

# 生命周期钩子

::: goals
<Goal checks="sc:5,ex:timerLeak,ex:clockFill">为请求、DOM 操作和清理操作选择正确的钩子。</Goal>
<Goal checks="sc:0">说明父组件和子组件的钩子顺序。</Goal>
<Goal checks="sc:1">用模板 ref 在 onMounted 中读取元素。</Goal>
<Goal checks="sc:4,ex:tickReadFill">修改数据后，用 nextTick 等待 DOM 更新，再读取 DOM。</Goal>
<Goal checks="sc:2">说明 KeepAlive 对钩子的影响。</Goal>

:::

::: rt
阅读主线约 15 分钟，深入内容约 2 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
组件的一生：**出生**（setup）→ **入住新家**（mounted）→ **装修**（updated）→ **搬走**（unmounted）。搬走前要关水电（清理定时器、事件监听）。

KeepAlive 像**旅馆寄存**：组件离开时不拆房子，回来直接入住。
:::

::: terms
生命周期钩子
: Vue 在组件的特定时刻调用的函数。

卸载
: 从页面移除组件。

内存泄漏
: 不再使用的对象仍被引用，不能被回收。

模板 ref
: 指向模板中某个元素或子组件的 ref。

nextTick
: 等待 Vue 完成已经安排的 DOM 更新。

KeepAlive
: 缓存组件实例。组件离开时不卸载。
:::

::: why
你在 setup 中写 `document.querySelector('#chart')`，得到 null。组件删除后，控制台中一个定时器还在每秒打印。

原因：setup 运行时，组件的 DOM 还没有创建。组件删除时，Vue 不知道你创建过定时器。

本章的生命周期钩子让你在“DOM 已创建”和“组件将删除”这两个时刻运行代码。
:::

### 6.1 钩子的顺序和用途

生命周期钩子是 Vue 在组件的特定时刻调用的函数。在 setup 中调用 `onMounted(fn)` 等函数注册钩子。`setup` 代替了 Vue2 的 `beforeCreate` 和 `created`。

<Flow :steps='["setup","onBeforeMount","onMounted","onBeforeUpdate ⇄ onUpdated","onBeforeUnmount","onUnmounted"]' />

| 钩子 | 在这个钩子中做什么 |
|---|---|
| `setup` | 创建数据。发送不需要 DOM 的请求。这时没有 DOM。 |
| `onBeforeMount` | 第一次渲染之前运行。 |
| `onMounted` | 读取 DOM。初始化第三方库，例如图表。服务端渲染时不运行。 |
| `onBeforeUpdate / onUpdated` | 组件更新之前和之后运行。不要在 onUpdated 中修改数据。 |
| `onBeforeUnmount / onUnmounted` | 清除定时器。删除事件监听。销毁第三方实例。 |
| `onActivated / onDeactivated` | 被 `<KeepAlive>` 缓存的组件显示和隐藏时运行（6.5 节）。 |
| `onErrorCaptured` | 捕获后代组件的错误（6.6 节）。 |

父组件的模板中有子组件时，第一次挂载的顺序如下：

1. 父组件 onBeforeMount
2. 子组件 onBeforeMount
3. 子组件 onMounted
4. 父组件 onMounted

下图按时间顺序显示父组件和子组件的钩子。

<Figure caption="从上到下是时间顺序。挂载时，父组件先开始，子组件先完成。整棵树的 DOM 插入页面后，onMounted 才运行。卸载也是父组件先开始，子组件先完成。">
<ParentChildHookOrder />
</Figure>

::: deep 钩子怎样注册和运行
`onMounted(fn)` 不立即运行 fn。它把 fn 保存到当前组件实例的数组中。所以调用 onMounted 时，Vue 必须知道当前组件：

```js
let currentInstance = null                 // setup 运行期间指向当前组件

function setupStatefulComponent(instance) {
  currentInstance = instance
  instance.setupState = instance.type.setup(instance.props, ctx)
  currentInstance = null                     // setup 同步结束后清空
}

const onMounted = (fn) => injectHook('m', fn)
function injectHook(type, fn, target = currentInstance) {
  if (!target) { warn('onMounted 只能在 setup 中同步调用'); return }
  ;(target[type] ||= []).push(fn)            // instance.m = [fn1, fn2]
}
```

这段代码说明了两件事：

1. 在普通的 setup() 中，`await` 之后 `currentInstance` 是 null。所以钩子注册失败。
2. 在 `<script setup>` 的顶层 await 之后，钩子仍然可以注册。编译器用 `withAsyncContext` 恢复当前实例。这个组件必须放在 Suspense 中。
3. 一个组件可以多次调用 onMounted。所有函数按注册顺序运行。

mounted 和 updated 钩子不在 patch 过程中运行。Vue 把它们放入后置队列。整棵树 patch 完成后，后置队列才运行。所以在 onMounted 中，所有子组件的 DOM 都已经存在。
:::

### 6.2 在 onMounted 中初始化，在 onUnmounted 中清理

setup 运行时没有 DOM。组件删除时，Vue 不知道你创建过定时器。onMounted 和 onUnmounted 解决这两个问题。

```js
onMounted(() => {
  console.log(document.querySelector('#chart'))   // 组件已插入页面：div 元素
})
onUnmounted(() => {
  console.log('组件已从页面删除')                   // 在这里清理
})
// 模板：<div id="chart"></div>
```

上面的代码用 querySelector 只是为了演示。在组件中读取自己的元素，使用模板 ref（6.3 节）。

**场景：看板页每 5 秒刷新，并在窗口尺寸改变时重新计算布局。**注册和清理要成对写。否则组件卸载后，监听和定时器仍然运行。

```js
let timer
onMounted(() => {
  timer = setInterval(refresh, 5000)
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  clearInterval(timer)
  window.removeEventListener('resize', onResize)
})
```

**场景：在容器中创建图表。**第三方库需要真实的 DOM 元素。在 onMounted 中创建实例，在 onUnmounted 中销毁它。

```js
const el = useTemplateRef('chart')     // 模板中 ref="chart" 的元素（6.3 节）
let chart
onMounted(() => { chart = createChart(el.value, options) })   // createChart 来自你的图表库
onUnmounted(() => { chart.destroy() })
```

注意：removeEventListener 要传入同一个函数。传入新的箭头函数时，监听不会被删除。

::: think 请求数据应该写在 setup 中还是 onMounted 中？
两种写法都正确。请求不需要 DOM 时，写在 setup 中，请求可以更早发送。请求需要 DOM 尺寸时，写在 onMounted 中。只在浏览器中运行的请求，也写在 onMounted 中。
:::

下面的练习中，子组件挂载时启动定时器，卸载时没有清除它。

<Exercise id="clockFill" />

<Exercise id="timerLeak" />

### 6.3 模板 ref：在 onMounted 中读取元素

有时需要直接操作 DOM 元素，例如聚焦输入框，或把元素交给图表库。这时使用模板 ref。在模板中给元素写 ref 属性。在脚本中用 useTemplateRef 读取它。元素在挂载后才存在，所以在 onMounted 中读取。

```vue
<script setup>
import { ref, useTemplateRef, onMounted } from 'vue'

// 写法 1（Vue 3.5 及以上）：参数是模板中 ref 属性的值
const input = useTemplateRef('search')

// 写法 2（所有 Vue 3 版本）：变量名和 ref 属性的值相同
const box = ref(null)

onMounted(() => {
  input.value.focus()        // 挂载后，value 是 DOM 元素
})
</script>

<template>
  <input ref="search">
  <div ref="box"></div>
</template>
```

::: think ref(null) 的同名规则怎样工作？
在 `<script setup>` 中，编译器把 `ref="box"` 连接到同名的顶层变量 box。变量必须是 ref。重命名变量时，也要修改模板中的 ref 属性。useTemplateRef 用字符串连接，所以变量名可以不同。
:::

模板 ref 的值随组件的生命周期改变：

| 时间 | 模板 ref 的值 |
|---|---|
| setup 运行时 | `null`。元素还没有创建。 |
| onMounted 中 | DOM 元素 |
| 元素被 v-if 删除后 | `null` |
| onBeforeUnmount 中 | DOM 元素 |
| onUnmounted 中 | `null` |

**场景：卸载时移除事件监听。**清理代码需要元素时，在 onMounted 中把元素保存到局部变量。原因：onUnmounted 运行时，模板 ref 已经是 null。

```js
const chart = useTemplateRef('chart')
let node = null

onMounted(() => {
  node = chart.value                          // 保存元素
  node.addEventListener('wheel', onWheel)
})
onUnmounted(() => {
  node.removeEventListener('wheel', onWheel)  // 这时 chart.value 已经是 null
})
```

**场景：列表中的每一行。**在 v-for 中使用 ref 时，ref 的值是一个数组：

```js
const items = useTemplateRef('items')     // items.value 是元素数组
// 模板：<li v-for="t in list" :key="t.id" ref="items">{{ t.text }}</li>
```

数组中元素的顺序不一定和 list 的顺序相同。所以需要对应关系时，用 data 属性记录 id。

ref 也可以写在子组件上。这时它的值是子组件的实例。父组件怎样调用子组件的函数（defineExpose），见[第 5.7 节](/chapters/05-comm)。

下面的实验台在 setup、onMounted 和卸载时读取模板 ref。

<Lab id="demo-tref" title="实验台：模板 ref 的值什么时候改变" note="日志显示每个时刻的值">
<template #predict>
<Sc predict :a="0">

先猜：Child 有一个 ref="inp" 的输入框。点击“卸载 Child”，再点击“挂载 Child”。新的 Child 在 setup 和 onMounted 中读取 inp.value。结果是什么？

```js
const inp = useTemplateRef('inp')
console.log(inp.value)            // setup 中
onMounted(() => console.log(inp.value))
```

<Opt>setup 中 null，onMounted 中 \<input></Opt>
<Opt>setup 中 \<input>，onMounted 中 \<input></Opt>
<Opt>setup 中 null，onMounted 中 null</Opt>

<template #explain>

解析：setup 运行时，组件还没有渲染，所以没有 DOM 元素。挂载完成后，Vue 把元素写入 ref，所以 onMounted 中可以读到。第二项以为 ref 在 setup 中已经可用。第三项以为 onMounted 中还要等 nextTick 才能读到。打开实验台，点击“卸载 Child”和“挂载 Child”。从下向上读日志。

</template>
</Sc>
</template>

<TemplateRefTiming />
</Lab>

### 6.4 修改数据后等待 DOM：nextTick

修改数据后，Vue 不立即更新 DOM。它等当前的同步代码结束，再一次更新。所以修改数据后立即读取 DOM，读到的是旧内容。v-if 刚变为 true 的元素也还不存在。`await nextTick()` 等待这次更新完成。

```js
import { nextTick } from 'vue'

count.value++
console.log(el.textContent)   // 旧值：DOM 还没有更新
await nextTick()
console.log(el.textContent)   // 新值
```

**场景：点击“编辑”后，显示输入框并聚焦。**修改 editing 后，input 还没有创建，inputRef.value 是 null。所以先等待 nextTick，再调用 focus()。

```js
const editing = ref(false)
const inputRef = useTemplateRef('input')

async function startEdit() {
  editing.value = true
  await nextTick()          // 等待 DOM 更新。这时 input 已在页面上
  inputRef.value.focus()
}
// 模板：<button @click="startEdit">编辑</button>
//       <input v-if="editing" ref="input">
```

nextTick 也接受一个回调：`nextTick(() => inputRef.value.focus())`。不要用 `setTimeout` 代替它。setTimeout 的等待时间不确定，也更晚运行。

注意：先修改数据，再调用 nextTick。nextTick 只等待已经安排的那次更新。在修改数据之前调用 nextTick 时，它的回调在这次更新之前运行，读到旧 DOM。

```js
// 错误：回调在 DOM 更新之前运行，打印旧值
nextTick(() => console.log(el.textContent))
count.value++

// 正确：先修改数据，再调用 nextTick
count.value++
nextTick(() => console.log(el.textContent))
```

下面的练习修改数据后读取 DOM。nextTick 为什么能等到 DOM 更新，见[第 13.2 节](/chapters/13-scheduler)。

<Exercise id="tickReadFill" />

### 6.5 KeepAlive 中的 onActivated 和 onDeactivated

被 `<KeepAlive>` 缓存的组件离开时不卸载。Vue 保留它的实例和 DOM。所以 onMounted 和 onUnmounted 不再随显示和隐藏运行。这时使用两个专用钩子：

- `onActivated`：第一次挂载时运行，以后每次从缓存中恢复时也运行。
- `onDeactivated`：组件被切换掉、进入缓存时运行。

<Figure caption="组件挂载后可以多次更新。在 KeepAlive 中，离开的组件进入缓存，不卸载。它回来时运行 onActivated。">
<KeepAliveLifecycle />
</Figure>

```js
onActivated(() => {
  timer = setInterval(poll, 5000)    // 显示时恢复轮询
})
onDeactivated(() => {
  clearInterval(timer)               // 隐藏时停止轮询。组件没有卸载，onUnmounted 不运行
})
```

**场景：返回缓存的任务列表时刷新数据。**从缓存恢复时，setup 不再运行。把请求写在 onActivated 中。

```js
const tasks = ref([])
let loadedAt = 0

onActivated(async () => {
  if (Date.now() - loadedAt < 60000) return   // 1 分钟内不重复请求
  tasks.value = await api.getTasks()
  loadedAt = Date.now()
})
```

**场景：恢复任务列表的滚动位置。**组件失活时，Vue 把 DOM 移出页面。内部滚动容器的位置会丢失。滚动时记录位置，在 onActivated 中写回。

```js
const list = useTemplateRef('list')
let top = 0

function onScroll(e) { top = e.target.scrollTop }   // 滚动时记录
onActivated(() => { list.value.scrollTop = top })   // 恢复时写回
// 模板：<ul ref="list" class="task-list" @scroll="onScroll">
```

注意：不要把首次请求同时写在 setup 和 onActivated 中。onActivated 在第一次挂载时也运行，请求会发送两次。这两个钩子只在 KeepAlive 中的组件上运行。KeepAlive 的 include 和 max 见[第 7 章](/chapters/07-builtins)。

下面的实验台显示挂载、更新和卸载的日志。勾选 KeepAlive 后，比较两组日志。

<Lab id="demo-life" title="实验台：挂载、更新和卸载一个子组件" note="运行真实的 Vue">
<template #predict>
<Sc predict :a="0">

先猜：勾选“用 KeepAlive 包裹”，点击“清空日志”。然后点击“卸载 Child”，再点击“挂载 Child”。日志中出现哪些钩子？

<Opt>onDeactivated、onActivated</Opt>
<Opt>onBeforeUnmount、onUnmounted、setup、onMounted</Opt>
<Opt>onDeactivated、setup、onActivated</Opt>

<template #explain>

解析：KeepAlive 不卸载被缓存的组件。它把 DOM 移到隐藏的容器中，并运行 onDeactivated。再次显示时，Vue 复用缓存的实例，只运行 onActivated，不再运行 setup。第二项是没有 KeepAlive 时的结果。第三项以为实例被重新创建。打开实验台，按同样的步骤操作，看日志。

</template>
</Sc>
</template>

<LifeHooks />
</Lab>

### 6.6 用 onErrorCaptured 捕获后代的错误

后代组件在渲染、钩子或事件处理中出错时，Vue 调用祖先组件的 `onErrorCaptured`。用它在出错的部分显示提示，页面的其他部分照常工作。[第 10.5 节](/chapters/10-app)用它写错误边界，并说明错误的传递顺序。

::: pitfalls
1. 在 onMounted 中添加事件监听后，在 onUnmounted 中删除它。否则会发生内存泄漏。
2. 不要在普通 setup() 或组合式函数内部的 `await` 之后注册钩子。原因：await 之后，Vue 找不到当前组件，钩子不运行。`<script setup>` 顶层的 await 是例外。
3. 不要在 onUpdated 中修改响应式数据。原因：修改会再次触发更新。更新完成后，onUpdated 又运行，形成无限更新。
4. 清理代码需要元素时，在 onMounted 中把元素保存到变量。原因：onUnmounted 运行时，模板 ref 已经是 null。
5. 先修改数据，再调用 nextTick。原因：nextTick 只等待已经安排的更新。先调用 nextTick 时，它的回调读到旧 DOM。
:::

::: selfcheck
<Sc :a="2">

父组件的模板中有一个子组件。第一次挂载时，钩子的顺序是什么？

<Opt>父 onBeforeMount → 父 onMounted → 子 onBeforeMount → 子 onMounted</Opt>
<Opt>子 onBeforeMount → 子 onMounted → 父 onBeforeMount → 父 onMounted</Opt>
<Opt>父 onBeforeMount → 子 onBeforeMount → 子 onMounted → 父 onMounted</Opt>

<template #explain>

解析：父组件先开始渲染。渲染中遇到子组件，子组件开始挂载。子组件先完成，所以子组件的 onMounted 先运行。

</template>
</Sc>

<Sc :a="0">

setup 中的 `console.log` 打印什么？

```js
const box = useTemplateRef('box')
console.log(box.value)
// 模板：<div ref="box"></div>
```

<Opt>null</Opt>
<Opt>div 元素</Opt>
<Opt>字符串 'box'</Opt>

<template #explain>

解析：setup 运行时，DOM 还没有创建。在 onMounted 中，`box.value` 才是 div 元素。

</template>
</Sc>

<Sc :a="1">

组件 A 放在 `<KeepAlive>` 中。页面从 A 切换到 B 时，A 的哪个钩子运行？

<Opt>onUnmounted</Opt>
<Opt>onDeactivated</Opt>
<Opt>onBeforeMount</Opt>

<template #explain>

解析：KeepAlive 缓存 A，不卸载 A。所以运行 onDeactivated，不运行 onUnmounted。A 回来时运行 onActivated。

</template>
</Sc>

<Sc :a="1">

回顾（第 2 章）：Child 在 `onUnmounted` 中打印日志。父组件同时写下面两行。show 从 true 变为 false。哪一个 Child 打印日志？

```html
<Child v-if="show" />
<Child v-show="show" />
```

<Opt>两个 Child 都打印</Opt>
<Opt>只有 v-if 的 Child</Opt>
<Opt>只有 v-show 的 Child</Opt>
<Opt>两个 Child 都不打印</Opt>

<template #explain>

解析：第 2 章：v-if 为假时删除元素。用在组件上时，Vue 卸载这个组件，所以运行 onUnmounted。v-show 只设置 `display: none`，组件仍然挂载，所以不运行卸载钩子。因此只有 v-if 的 Child 打印。要释放定时器等资源，用 v-if。要保留组件的状态，用 v-show 或 KeepAlive。

</template>
</Sc>

<Sc :a="2">

组件显示 `count`，初始值是 0。`el` 是显示它的元素。点击按钮后运行下面的代码。回调打印什么？

```js
nextTick(() => console.log(el.textContent))
count.value++
```

<Opt>1，回调在更新之后运行</Opt>
<Opt>undefined，元素被替换</Opt>
<Opt>0，回调在更新之前运行</Opt>
<Opt>报错，el 是 null</Opt>

<template #explain>

解析：nextTick 只等待已经安排的那次更新。调用它时，数据还没有修改，也没有安排更新，所以回调排在这次更新之前，打印 0。先写 `count.value++`，再调用 nextTick，才打印 1。修改 count 只改变元素的文字，不替换元素，el 也不是 null。

</template>
</Sc>


<Sc :a="1">

组件要用 `canvas` 元素画一张图表。图表库需要读取这个元素。应该在哪个钩子里初始化图表库？

<Opt>`setup`，它最先运行</Opt>
<Opt>`onMounted`，这时元素已经在页面中</Opt>
<Opt>`onBeforeMount`，这样图表和元素同时出现</Opt>

<template #explain>

解析：`setup` 和 `onBeforeMount` 运行时，组件还没有渲染出 DOM，模板 ref 是 null，图表库读不到 canvas。`onMounted` 运行时，元素已经插入页面。别忘了在 `onUnmounted` 中销毁图表。

</template>
</Sc>

:::

::: summary
- 挂载顺序：父组件开始，子组件完成，父组件完成。
- 在 onMounted 中操作 DOM。在 onUnmounted 中清理。注册和清理成对写。
- 模板 ref 在 onMounted 之后才是元素。卸载后是 null。
- 修改数据后读取 DOM，先 `await nextTick()`。先修改，再调用。
- KeepAlive 中的组件使用 onActivated 和 onDeactivated 刷新数据、恢复状态和暂停轮询。
- onErrorCaptured 捕获后代的错误。第 10.5 节用它写错误边界。
:::
