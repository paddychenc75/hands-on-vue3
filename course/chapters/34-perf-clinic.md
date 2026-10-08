---
title: 性能诊断实战
id: perf-clinic
stage: 6
chapter: 34
desc: 先测量再优化：诊断流程、测量工具和六类常见病例
---

<script setup>
import DiagnosisLoop from '../figures/34-perf-clinic/DiagnosisLoop.vue'
import PerfClinic from '../labs/34-perf-clinic/PerfClinic.vue'
</script>

# 性能诊断实战

::: goals
<Goal checks="sc:0">写出诊断流程的六步，并把“页面很卡”改写成一个可验证的假设。</Goal>
<Goal checks="sc:1,sc:2,sc:3">区分 Performance 面板、`app.config.performance`、`onRenderTriggered` 和 Web Vitals 各自回答什么问题。</Goal>
<Goal checks="ex:clinicRerender">用更新次数定位并修复不必要的重渲染。</Goal>
<Goal checks="ex:clinicCompute">修复模板里的重复计算和侦听范围过大的 watch。</Goal>
<Goal checks="sc:4">判断一个组件是否泄漏，并写出清理代码。</Goal>

:::

::: rt
阅读主线约 16 分钟，深入内容约 2 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
诊断性能像**医生看病**：先问症状，再做检查，然后下诊断，开药，复查。医生不会因为病人说“头疼”就把所有药都开一遍。
:::

::: terms
基线
: 优化之前测到的数字，之后每次修改都和它比较。

性能预算
: 事先为一个操作定下的数字上限，超过它就算没有修好。

长任务
: 在浏览器主线程上连续运行超过 50 毫秒的任务。

堆快照
: 某一时刻内存中所有对象的记录。
:::

::: why
同事说：“搜索框打字很卡。”你想到了 `v-memo`、`shallowRef`、虚拟列表。你把它们都试了一遍，页面还是卡，也说不清哪一个起了作用。

原因：优化方法有很多，但一次卡顿通常只有一个原因。没有测量时，你在猜。

[第 26 章](/chapters/26-perf)讲了每种优化方法。本章讲它们的前一步：怎样复现、测量、定位，再决定用哪一种。
:::

### 34.1 诊断流程：把“很卡”变成数字

“很卡”不能被修复。“在搜索框连续输入 3 个字，8 个 Row 各更新了 3 次”可以。诊断的目标，就是把前者变成后者。

<Figure caption="六步流程。第 5 步的数字没有按预测变化时，撤销这次修改，回到第 4 步写下一个假设。">
<DiagnosisLoop />
</Figure>

| 步骤 | 做什么 | 例子：搜索框打字卡 |
|---|---|---|
| 1 复现 | 写出固定的操作步骤 | 打开页面，在搜索框里连续输入 3 个字 |
| 2 测量 | 记下基线数字 | Row 共更新 24 次 |
| 3 定位 | 找出哪个组件、哪份数据 | Row 的 props 没变，是父组件的渲染带着它们更新 |
| 4 假设 | 写成可证伪的预测 | 如果病因是内联对象，改成布尔值后 Row 的更新降到 0 |
| 5 验证 | 只改一处，再测量 | 更新次数从 24 降到 0，假设成立 |
| 6 回归 | 把数字定为预算，写进测试 | 测试里断言“输入 3 个字，Row 更新 0 次” |

好假设说清三件事：看到了什么，怀疑什么，改完数字会怎样变。“加个 `v-memo` 试试”不是假设，因为它不能被证伪。

最简单的计数工具是 `onUpdated`。它在组件每次更新后运行：

```js
// 在被怀疑的组件里调用：useUpdateCount('Row')
function useUpdateCount(name) {
  let n = 0
  onUpdated(() => console.log(`[${name}] 第 ${++n} 次更新`))
}
```

注意：钩子里不要修改响应式数据。更新钩子里改状态会触发新的更新，形成循环。用普通变量或 `console.log` 计数。

### 34.2 测量工具：每个工具回答一个问题

| 工具 | 回答的问题 | 生产构建里能用吗 |
|---|---|---|
| Performance 面板 | 这次操作的时间花在哪一段？有没有长任务？ | 能 |
| `app.config.performance` | 每个组件的 `init`、`render`、`patch` 花了多久？ | 不能，只在开发构建 |
| `onRenderTracked` / `onRenderTriggered` | 这个组件依赖了什么？是哪次修改触发了它？ | 不能，只在开发构建 |
| `performance.mark` / `measure` | 我关心的这段代码花了多久？ | 能 |
| Vue DevTools 时间线 | 组件事件和性能数据在时间轴上怎样排列？ | 用于开发 |
| Web Vitals（LCP、INP、CLS） | 真实用户感受到的加载、响应和稳定性 | 能 |

**Performance 面板怎样读。**按下面的步骤操作：

1. 打开浏览器开发者工具的 Performance 面板。把 CPU 设为 4 倍减速，模拟较慢的手机。
2. 点击录制，做第 1 步写下的固定操作，停止录制。
3. 在 Main 轨道上找长任务。超过 50 毫秒的任务带红色标记。
4. 看 Summary 里的颜色：黄色是脚本，紫色是渲染（样式和布局），绿色是绘制。
5. 脚本最长，去找 JavaScript：Vue 的更新、你的函数。渲染或绘制最长，去查 DOM 数量和样式。

先分清慢在哪一段，再决定用哪个 Vue 工具。只有脚本那一段长，才需要下面的计数。

**`app.config.performance`。**设为 `true` 后，Vue 为每个组件的 `init`、`compile`、`render`、`patch`、`mount` 打上时间标记，Performance 面板的 Timings 轨道里能看到，名字形如 `<Row> render`：

```js
const app = createApp(App)
app.config.performance = true   // 只在开发构建生效

// 也可以用代码读取这些标记
new PerformanceObserver(list => {
  list.getEntries().forEach(e => console.log(e.name, e.duration.toFixed(2)))
}).observe({ type: 'measure' })
```

Vue 在读取标记后立即清除它们，所以 `performance.getEntriesByType('measure')` 读不到。要用 `PerformanceObserver`，或者在 Timings 轨道里看。

**`onRenderTracked` 和 `onRenderTriggered`。**前者在组件的渲染函数读取了一份响应式数据时调用，后者在这份数据改变、触发组件重新渲染时调用。事件对象有 `effect`、`target`、`type`、`key`、`newValue` 和 `oldValue`：

```js
onRenderTriggered(e => {
  console.log(e.type, e.key, e.target)   // 例如：set value RefImpl
})
```

有两点要记住：

1. 它们只在开发构建里被调用。生产构建里，你注册了钩子，但永远不会收到事件。
2. 子组件被父组件的新 props 带着更新时，子组件自己的 `onRenderTriggered` 不会被调用。因为它依赖的数据没有变。要看**父组件**的触发日志。

**`performance.mark` 和 `measure`。**测量一段你自己的代码。注意 `await nextTick()` 只包含 JavaScript 完成 DOM 更新的时间，不含之后的样式、布局和绘制：

```js
performance.mark('select:start')
selectedId.value = id
await nextTick()
performance.mark('select:end')
const m = performance.measure('select', 'select:start', 'select:end')
console.log(m.duration)
```

**Web Vitals。**这三个指标衡量真实用户的体验，“好”的标准取第 75 百分位的用户：

| 指标 | 衡量什么 | 好的标准 | 常见的 Vue 病因 |
|---|---|---|---|
| LCP（最大内容绘制） | 最大的内容元素多久出现 | 不超过 2.5 秒 | 首屏 JS 太大，图片太大，没有 SSR |
| INP（交互到下一次绘制） | 点击、按键之后多久能看到反应 | 不超过 200 毫秒 | 重渲染太多，长任务 |
| CLS（累计布局偏移） | 内容是否意外跳动 | 不超过 0.1 | 图片没有宽高，异步内容插入 |

INP 在 2024 年取代了 FID 成为核心指标。Lighthouse 等实验室工具没有真实用户的交互，INP 要看真实用户的数据（例如 PageSpeed Insights 的“真实用户体验”部分，或 `web-vitals` 库的 `onINP`）。

::: note warn
开发构建带有额外的检查，所以耗时不能代表生产。**次数**（更新次数、函数调用次数）在两种构建里相同，**毫秒**要在生产构建里测：`vite build` 之后用 `vite preview`。
:::

### 34.3 病例 1：不必要的重渲染

**症状。**在搜索框里打字，页面卡。子组件显示的内容没有变，却在不停更新。

**怎样测出来。**在子组件里用 `onUpdated` 计数，再看父组件的 `onRenderTriggered`。下面的实验台里，先在“症状版”里操作，再切到“已修复”。

<Lab id="demo-clinic" title="实验台：病例诊所" note="五个小病例，每个有“症状版”和“已修复”。前三个运行在 Vue 的开发构建里，因为 onRenderTriggered 在生产构建里不存在">
<template #predict>
<Sc predict :a="2">

先猜：“内联对象 props”页的症状版里，Root 有 8 个 Row。每个 Row 的 props 里有一个内联对象 `{ hot: it.id === 3 }`。在搜索框输入一个字，8 个 Row 一共更新几次？

<Opt>0 次，Row 显示的内容没有变</Opt>
<Opt>1 次，只有被改的那个</Opt>
<Opt>8 次，每个 Row 一次</Opt>

<template #explain>

解析：Root 更新时，Vue 比较每个 Row 的新旧 props。内联对象每次都是新对象，新旧不相等，所以 8 个 Row 都更新，尽管显示的内容没有变。第一项以为 Vue 比较内容。第二项以为只更新“被改的”，可是这次输入没有改任何一个 Row 的数据。打开实验台，点“在搜索框输入一个字”，再切换到“已修复”重试。

</template>
</Sc>
</template>

<PerfClinic />
</Lab>

重渲染常见三种来源，根因和处方如下。前两种在实验台的前两页里复现：

| 症状 | 怎样测 | 根因 | 处方 |
|---|---|---|---|
| 打字时所有 Row 都更新 | “内联对象 props”页：Row 更新 8 次；Root 的日志显示被 `set value` 触发 | 模板里的 `{ … }` 或 `[ … ]` 每次渲染都是新对象 | 传原始值或稳定的引用（第 26 章 26.2） |
| 改了一个数量，调试面板也重渲染；改优惠码，只有调试面板重渲染 | “读了整个对象”页：Debug 的日志里每个字段都出现 | `{{ cart }}` 会遍历整个对象，把每个字段都变成它的依赖 | 只读需要的字段；调试面板在点击时才读取 |
| 打字时整页重渲染 | `onUpdated` 显示根组件每次按键都更新 | 快速变化的状态放在了太高的组件里 | 把状态和输入框下沉到一个小组件里 |

第三行的做法：把 `kw` 和输入框放进 `SearchBox` 组件。我们用同样的数据验证过，输入 3 个字后，SearchBox 更新 3 次，Root 和 Row 都是 0 次。

动手修复一个：

<Exercise id="clinicRerender" />

::: deep 同一个练习还有别的合理修法
`v-once`、给 `Row` 加 `v-memo="[it.id === 3]"` 都能让这个练习通过。原因：改名这件事改的是 `item` 对象本身，而 Row 的渲染直接读取了 `item.name`，所以 Row 自己会更新，不需要父组件带着它更新。`v-memo` 只拦住“父组件带着更新”这一条路。如果 Row 的内容来自父组件传下来的原始值，漏写依赖就会像第 26 章的注意 3 那样不更新。
:::

### 34.4 病例 2：多余的计算和侦听

**症状。**在不相关的输入框里打字，统计面板反复重新计算，数据被反复保存。

**怎样测出来。**在昂贵的函数里加一个计数，在 `watch` 回调里加一个计数。实验台的“多余的计算和保存”页显示这两个数字。我们用练习里的代码实测：打 3 个字，`summarize` 从 1 次增加到 4 次，保存从 0 次增加到 3 次。

**根因有两个，且不同：**

1. 模板里的 `{{ summarize(list) }}` 是函数调用。组件每次渲染都会运行它，不管 `list` 有没有变。`computed` 带缓存，只在依赖改变时重新计算。
2. `watch(state, 回调, { deep: true })` 侦听整个 `state`。`state.query` 也在里面，所以搜索词一变就保存。

**处方。**统计放进 `computed`。侦听的来源写成 getter，只返回需要的部分：

```js
const summary = computed(() => summarize(state.todos))
watch(() => state.todos, save, { deep: true })   // query 不在里面
```

我们验证过修复后的数字：打 3 个字，`summarize` 仍是 1 次，保存仍是 0 次；勾选一项后分别是 2 次和 1 次。

还有一种连锁：`watch` 的回调里修改了另一份数据，又触发了别的 `watch`。一次操作触发了好几轮更新。诊断办法同样是在每个回调里计数，看一次操作产生了几次回调。

<Exercise id="clinicCompute" />

### 34.5 病例 3：大列表和深层响应式

**大列表。症状**是首次显示慢，切换选中项时卡。**怎样测**：在控制台运行 `document.querySelectorAll('li').length`，数字和数据量同数量级；Performance 面板里脚本和渲染两段都长。**根因**：DOM 节点数随数据量增长，每次更新 Vue 要遍历所有行。**处方**：虚拟列表，把 DOM 行数降到几十行；或者用 `v-memo` 跳过没变的行。两者的实验台在[第 26 章](/chapters/26-perf)的 26.1 和 26.3。

**深层响应式。症状**是一次装入很大的数组后，遍历或首次渲染变慢，而每一项并不需要被单独跟踪。**怎样测**：`toRaw(list.value[0]) !== list.value[0]` 为真，说明这一项已经被代理。再比较读取同样数据的耗时。**根因**：`ref` 和 `reactive` 在读取时为每个嵌套对象创建代理并收集依赖（第 3 章）。**处方**：只整体替换的大数据用 `shallowRef`（第 26 章 26.4）。

在实验台里切到“深层响应式”页，点两个按钮。我们在生产构建的 Chromium 里测过 5 万项：`ref` 约 10 毫秒，`shallowRef` 约 0.5 毫秒，相差约 20 倍。你的机器上数字不同，比值的数量级应该相近。

### 34.6 病例 4：首屏包体积

**症状。**第一次打开页面，白屏时间长，LCP 差。

**怎样测出来。**运行 `vite build`，看输出里每个文件的大小：

```bash
dist/index.html                  0.13 kB │ gzip:  0.13 kB
dist/assets/Report-CArjw4ej.js   0.11 kB │ gzip:  0.12 kB
dist/assets/index-tcm3OA2H.js   66.04 kB │ gzip: 26.02 kB
```

这是一个最小项目的真实输出（Vite 8.3，只用了 Vue 运行时和一个异步组件）。`Report-*.js` 是单独拆出来的文件，首屏不下载它。`index-*.js` 约 26 kB（gzip），主要是 Vue 本身。真实项目里，如果入口文件的体积大得多，运行 `npx vite-bundle-visualizer` 看是哪个依赖占的。Network 面板里按 JS 过滤，也能看到首屏实际下载了什么。

**根因。**所有路由、大组件和大依赖都被打进入口文件。

**处方。**路由写成 `component: () => import('./views/Report.vue')`；很大的组件（图表、编辑器）用 `defineAsyncComponent`；按需导入库。细节见[第 26 章](/chapters/26-perf)的 26.5。

**回归。**给入口文件定一个 gzip 后的体积预算，在 CI 里检查构建输出。

### 34.7 病例 5：内存泄漏

**症状。**页面用得越久越卡。反复进出一个页面，内存只升不降。

**怎样测出来。**有三种办法，从便宜到贵：

1. 自己加计数。包装 `setInterval`，记录“已启动”和“已清除”的个数。实验台的“没有清理的定时器”页就是这样做的。
2. 在 Console 里运行 `getEventListeners(window)`（Chrome 控制台自带的工具函数）。进出页面 10 次，如果某种事件的监听器数量跟着增长，就有泄漏。
3. Memory 面板的堆快照：进出页面前后各拍一次，用 Comparison 视图比较，在过滤框里输入 `Detached` 找已分离的 DOM 元素，用 Retainers 看是谁在引用它。完整步骤见[第 26 章](/chapters/26-perf)的深入块“查找内存泄漏”。

**根因。**组件卸载时，没有清理它创建的、生命周期比组件更长的东西：

| 原因 | 处方 |
|---|---|
| `setInterval`、`setTimeout` | `onUnmounted` 里清除 |
| `window`、`document` 上的监听 | `onUnmounted` 里移除；或用 VueUse 的 `useEventListener` |
| 第三方实例（图表、地图） | `onUnmounted` 里调用它的 `destroy` |
| 组件外创建的 `watch` 和 `effect` | 调用返回的 stop 函数，或放进 `effectScope`（第 9 章） |

```js
const id = setInterval(tick, 1000)
onUnmounted(() => clearInterval(id))
```

在实验台里切到“没有清理的定时器”页，症状版连续卸载、挂载几次，看“仍在运行的定时器”的数字；切到“已修复”再试一遍。

### 34.8 修好了：用预算做回归

流程的第 6 步，是把这次测到的数字留下来。耗时在测试环境里不稳定，所以**测试里断言次数，不断言毫秒**：

| 操作 | 预算 | 怎样自动检查 |
|---|---|---|
| 输入 3 个字 | 无关的子组件更新 0 次 | 组件测试：挂载，输入，断言 `onUpdated` 的次数 |
| 勾选一项 | 统计函数运行 1 次 | 测试里给函数加 spy，断言调用次数 |
| 进出页面 10 次 | 活跃的定时器和监听器数不增加 | 测试里 spy 在 `setInterval` 和 `clearInterval` 上 |
| 首屏 | 入口文件 gzip 不超过一个固定值 | CI 里读取构建输出 |

数字达到预算就停手。不要为了“更快一点”再加优化：每多一个 `v-memo` 或 `shallowRef`，代码就更难读，也更容易出错。收尾项目（[第 36 章](/chapters/36-project)）要求你给自己的项目定一份预算。

::: pitfalls
1. 在开发构建里测毫秒，再据此判断生产环境。原因：开发构建带有额外检查。次数可以在开发构建里测，毫秒要在生产构建里测。
2. 一次改好几处，再看数字变好了。原因：你不知道是哪一处起了作用，也不知道其他几处是不是多余的。一次只改一处。
3. 在 `onUpdated` 或 `onRenderTriggered` 里修改响应式数据来记录次数。原因：这会触发新的更新，形成循环。用普通变量或 `console.log`。
4. 把子组件的更新原因找错了地方。原因：被父组件的新 props 带着更新的子组件，自己的 `onRenderTriggered` 不会被调用。要看父组件。
5. 在 CI 里用毫秒做断言。原因：测试环境的耗时不稳定，测试会随机失败。断言次数。
:::

::: selfcheck
<Sc :a="1">

同事说：“搜索框打字很卡。”你要先做什么？

<Opt>给所有子组件加上 `v-memo`</Opt>
<Opt>写下固定的复现步骤，并记录基线数字</Opt>
<Opt>把所有 `ref` 换成 `shallowRef`</Opt>

<template #explain>

解析：没有复现步骤和基线，就无法判断一次修改有没有用。第 1 步先复现，第 2 步测量。`v-memo` 和 `shallowRef` 是第 5 步的处方，它们要等定位出原因之后才能选。最迷惑的是第一项：它可能有效，但你不知道，也不知道是不是多余。

</template>
</Sc>

<Sc :a="1">

下面的代码用 `vite build` 构建并部署后，用户打开页面。控制台里会怎样？

```js
app.config.performance = true
// Row.vue
onRenderTriggered(e => console.log('Row 被触发', e.key))
```

<Opt>仍然有日志，只是更慢</Opt>
<Opt>没有日志，这些功能只在开发构建里工作</Opt>
<Opt>报错，生产构建里没有这些 API</Opt>

<template #explain>

解析：`onRenderTriggered` 和 `app.config.performance` 的 API 在生产构建里仍然存在，调用它们不会报错，但钩子永远不会被调用，也不会产生性能标记。所以测次数用开发构建，测毫秒用生产构建。第三项错在：API 存在，只是不工作。

</template>
</Sc>

<Sc :a="0">

8 个 Row 在父组件打字时全部更新。你在 Row 里加了 `onRenderTriggered(e => console.log(e.key))`，然后打一个字。开发构建的控制台里会怎样？

<Opt>一条也没有。要看父组件的触发日志</Opt>
<Opt>打印 8 条，key 是 `opts`</Opt>
<Opt>打印 8 条，key 是 `value`</Opt>

<template #explain>

解析：Row 被更新，是因为父组件传来了新的 props，Row 自己依赖的数据并没有变，所以它的 `onRenderTriggered` 不会被调用。触发源在父组件：它的日志显示是 `kw` 这个 ref 的 `set value`。第三项的 `value` 确实是那条父组件日志的 key，但它出现在父组件里，不在 Row 里。

</template>
</Sc>

<Sc :a="2">

用户说：“点按钮之后，页面要等半秒才有反应。”应该首先看哪个指标？

<Opt>CLS，内容是否跳动</Opt>
<Opt>LCP，最大内容出现的时间</Opt>
<Opt>INP，交互之后多久看到反应</Opt>

<template #explain>

解析：INP 衡量点击、按键之后到下一次绘制的延迟，不超过 200 毫秒算好。半秒的延迟远超这个标准。LCP 衡量的是页面加载，不是交互之后的反应。CLS 衡量内容有没有意外跳动。

</template>
</Sc>

<Sc :a="1">

组件挂载时启动了定时器，没有清除。这个组件被挂载并卸载了 3 次，现在页面上没有它。还有几个定时器在运行？

```js
setup() {
  setInterval(tick, 1000)
}
```

<Opt>0 个，组件卸载时 Vue 自动清除</Opt>
<Opt>3 个</Opt>
<Opt>1 个，同一个函数只会启动一次</Opt>

<template #explain>

解析：`setInterval` 属于浏览器，不属于组件。Vue 卸载组件时不会清除它。每次挂载都启动一个新的定时器，所以有 3 个。修复：保存返回的 id，在 `onUnmounted` 里调用 `clearInterval`。

</template>
</Sc>

:::

::: summary
- 诊断分六步：复现，测量，定位，假设，验证，回归。先把“很卡”变成数字。
- Performance 面板回答时间花在哪一段。`onRenderTriggered` 回答谁触发了更新，它只在开发构建里工作。
- 常见病例：内联对象引起的重渲染、模板里的函数调用、侦听范围太大、大列表、深层响应式、入口包太大、没有清理的定时器和监听器。
- 一次只改一处，数字没有按预测变化就撤销。
- 测试里断言次数，不断言毫秒。数字达到预算就停手。
:::
