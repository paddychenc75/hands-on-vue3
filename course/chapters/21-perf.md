---
title: 性能优化
id: perf
stage: 3
chapter: 21
desc: 虚拟列表、props 稳定性、懒加载
---

<script setup>
import VirtualListWindow from '../figures/21-perf/VirtualListWindow.vue'
import UnstablePropsRerender from '../figures/21-perf/UnstablePropsRerender.vue'
import VirtualList from '../labs/21-perf/VirtualList.vue'
import PropsStable from '../labs/21-perf/PropsStable.vue'
import VMemoLab from '../labs/21-perf/VMemoLab.vue'
</script>

# 性能优化

::: goals
<Goal checks="sc:0">用虚拟列表显示一万行数据。</Goal>
<Goal checks="sc:1">传递稳定的 props，防止子组件不必要的更新。</Goal>
<Goal checks="sc:2,ex:shallowBig,ex:fbPerf,ex:phenoDebounce">为每个性能问题选择正确的方法。</Goal>

:::

::: rt
阅读主线约 14 分钟，深入内容约 4 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
虚拟列表像**火车车窗**：窗外有一万棵树，但你同一时刻只看到窗框里的十几棵。
:::

::: terms
虚拟列表
: 只渲染可见区域中的行的列表。

稳定的 props
: 父组件更新时引用不变的 props。

v-memo
: 依赖不变时，跳过一个子树的更新。

懒加载
: 需要时才下载代码或图片。
:::

::: why
你渲染一万行的列表。首次显示要等好几秒，滚动也卡。在输入框中输入一个字，几十个子组件都重新渲染。

原因：每一行都创建一组 DOM 节点。父组件更新时，props 引用改变的子组件也要更新。

本章用虚拟列表、稳定的 props 和 v-memo，减少 Vue 要创建和比较的节点。
:::

优化之前，先测量。测量方法和选择方法的总表见 21.7 节。

### 21.1 用虚拟列表显示大列表

虚拟列表只渲染可见区域中的行。滚动时，它替换这些行的内容。DOM 节点的数量不随数据量增加。

<Lab id="demo-vlist" title="实验台：一万行数据" note="切换模式。比较时间和 DOM 行数。">
<template #predict>
<Sc predict :a="0">

先猜：列表有 10000 行，当前是“虚拟列表”模式。把列表滚动到中间（约第 5000 行）。“当前 DOM 行数”大约是多少？

<Opt>约 20 行</Opt>
<Opt>约 5000 行</Opt>
<Opt>10000 行</Opt>

<template #explain>

解析：虚拟列表根据 scrollTop 计算可见行的起止下标。它只渲染可见的行和上下几行。滚动时，Vue 替换这些行，不保留滚过的行。所以行数保持在 20 左右。“约 5000 行”以为滚过的行留在 DOM 中。10000 行是“全量渲染”模式的结果。打开实验台，滚动列表，看“当前 DOM 行数”。

</template>
</Sc>
</template>

<VirtualList />
</Lab>

下图显示虚拟列表的结构。

<Figure caption="内层容器有全部行的高度。DOM 中只有可见区域和缓冲区中的行。滚动时，这些行换成新的内容。">
<VirtualListWindow />
</Figure>

按下面的步骤实现虚拟列表：

1. 设置外层容器的高度，并允许滚动。
2. 设置内层容器的高度为“行数 × 行高”。
3. 监听 scroll 事件，记录 scrollTop。
4. 用 scrollTop 计算第一行和最后一行。
5. 只渲染这些行。把每一行定位到“下标 × 行高”。

```js
const rowH = 28, viewH = 280
const scrollTop = ref(0)
const visible = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / rowH) - 5)   // 上方多渲染 5 行
  const end = start + Math.ceil(viewH / rowH) + 10
  return items.slice(start, end)
    .map((item, i) => ({ item, index: start + i }))                 // 记下每一行在完整列表中的下标
})
// <div :style="{ height: viewH + 'px', overflow: 'auto' }" @scroll="scrollTop = $event.target.scrollTop">
//   <div :style="{ position: 'relative', height: items.length * rowH + 'px' }">
//     <div v-for="row in visible" :key="row.item.id"
//          :style="{ position: 'absolute', top: row.index * rowH + 'px', height: rowH + 'px' }">
//       {{ row.item.text }}
//     </div>
```

注意两点：

1. 用下标计算位置，不用 id。原因：id 只在恰好等于下标时正确。数据被过滤或排序后，id 和位置就对不上了。key 仍然用 id。
2. 行元素要用 `position: absolute`，内层容器要用 `position: relative`。否则 `top` 不起作用，所有行都排在顶部。

实际项目中，使用 vue-virtual-scroller 或 @tanstack/vue-virtual。它们还处理行高不固定和横向滚动。

### 21.2 传递稳定的 props

父组件更新时，Vue 比较每个子组件的新旧 props。props 相同时，Vue 不更新子组件。这个判断的实现见第 31 章，这里只用它的结果。下图说明这个比较。

<Figure caption="Vue 比较子组件的新旧 props。模板中的对象字面量每次都是新对象，所以子组件每次都更新。">
<UnstablePropsRerender />
</Figure>

在模板中写对象字面量时，每次渲染都创建一个新对象。新对象和旧对象不相等。所以子组件每次都更新。

<Lab id="demo-stable" title="实验台：50 个子组件，两种传参方式" note="在输入框中输入文字。父组件会更新。">
<template #predict>
<Sc predict :a="1">

先猜：两组各有 50 个 Row。在输入框中输入一个字，父组件重新渲染。两组子组件分别更新几次？

```html
<Row :item="it" />                           <!-- 左边 -->
<Row :item="{ id: it.id, name: it.name }" />  <!-- 右边 -->
```

<Opt>左边 50 次，右边 50 次</Opt>
<Opt>左边 0 次，右边 50 次</Opt>
<Opt>左边 0 次，右边 0 次</Opt>

<template #explain>

解析：子组件更新前，Vue 用 === 比较新旧 props。左边每次传入同一个对象，props 没有改变，所以跳过。右边每次渲染都创建新对象，所以 50 个子组件都更新，显示的内容却相同。第一项以为父组件更新时子组件总是更新。第三项以为 Vue 比较对象的内容。打开实验台，在输入框中输入一个字，看两个更新次数。

</template>
</Sc>
</template>

<PropsStable />
</Lab>

按下面的规则传递 props：

1. 传原始值或已有的对象。不要在模板中写 `{...}` 或 `[...]`。
2. 把经常改变的部分拆为子组件。小数据改变时，只有这个子组件更新。

::: deep 保持计算属性稳定
3.4+ 中，计算属性重新计算后，只在值改变时才通知依赖它的地方。值用 `Object.is` 比较。

计算属性每次返回新对象时，比较总是不相等。所以依赖它的组件每次都更新。getter 的第一个参数是上一次的值，可以用它返回旧对象：

```js
const stats = computed(oldValue => {
  const next = { isEven: count.value % 2 === 0 }
  if (oldValue && oldValue.isEven === next.isEven) return oldValue   // 内容相同：返回旧对象，不触发更新
  return next
})
```
:::

### 21.3 用 v-memo 和 v-once 跳过不变的模板

每次渲染，Vue 都先用普通对象描述出页面的每个节点，这些对象叫虚拟节点（第 28 章），再和上一次的比较，只修改有差别的 DOM。`v-memo` 让 Vue 跳过其中一部分。它接收一个数组。重新渲染时，Vue 比较数组中的每个值。所有值都和上次相同时，Vue 复用上次的虚拟节点。这个子树不重新创建，也不比较。

**场景：大列表中切换选中项。**不使用 v-memo 时，选中项改变，所有行都重新创建虚拟节点并比较。使用 v-memo 后，只有选中状态改变的两行重新渲染。

```html
<div v-for="item in list" :key="item.id" v-memo="[item.id === selectedId]">
  <p>ID: {{ item.id }} - selected: {{ item.id === selectedId }}</p>
  …更多子节点
</div>
```

把 v-memo 和 v-for 写在同一个元素上。写在 v-for 内部的元素上时，它不生效。数组必须包含所有影响这一行输出的值。否则漏掉的值改变时，页面不更新。

<Lab id="demo-memo" title="实验台：5000 行中切换选中项" note="比较有和没有 v-memo 时的更新时间">
<template #predict>
<Sc predict :a="2">

先猜：列表有 5000 行。在“使用 v-memo”和“不使用 v-memo”两种模式下，各点击“随机选中”5 次。比较两个平均时间。结果是什么？

```html
<div v-for="it in items" :key="it.id"
     v-memo="[it.id === sel]">…</div>
```

<Opt>差不多。Vue 本来就跳过没变的行</Opt>
<Opt>v-memo 更慢，每行多比较一个数组</Opt>
<Opt>v-memo 明显更快，时间不到一半</Opt>

<template #explain>

解析：每次点击只改变新旧两个选中行。不使用 v-memo 时，Vue 为 5000 行都创建新的虚拟节点并比较。使用 v-memo 时，依赖数组没变的行直接复用旧节点，所以只处理 2 行。第一项错在：没有 v-memo 时，Vue 要先创建并比较节点。比较之后，才知道哪些行没变。第二项错在：比较一个短数组比创建节点便宜得多。具体毫秒数取决于设备。打开实验台，两种模式各点击 5 次，比较平均时间。

</template>
</Sc>
</template>

<VMemoLab />
</Lab>

`v-once` 只渲染一次元素和它的子元素。之后的更新跳过它们。

**场景：显示很长的用户协议。**协议内容在页面打开后不再改变。

```html
<article v-once v-html="termsHtml"></article>   <!-- termsHtml 以后改变，这里也不更新 -->
```

::: deep Vapor Mode
Vapor Mode 是一种不使用虚拟 DOM（第 28 章）的编译模式。编译器直接生成操作 DOM 的代码。Vue 3.6 开始提供它。截至 2026 年 10 月，3.6 处于 RC（候选发布）阶段，npm 上的最新版本是 3.6.0-rc.10，稳定版仍是 3.5。

它是可选功能，默认不启用。只支持 `<script setup>` 组件。在单文件组件中用 `<script setup vapor>` 启用。在生产环境使用前，阅读官方文档中的当前状态。
:::

### 21.4 减少响应式的开销

reactive 只在读取嵌套对象时创建代理。但是遍历一个大数组时，每个元素都会被代理，并收集依赖。对于大数据，按下表选择。shallowRef、triggerRef 和 markRaw 的完整用法见 [第 3 章](/chapters/03-refs)。

| 数据 | 方法 | 原因 |
|---|---|---|
| 从接口得到、只整体替换的列表 | `shallowRef` | 只跟踪 .value，不代理元素 |
| 永远不修改的配置或字典 | `Object.freeze` 或 `markRaw` | Vue 不代理冻结的对象 |
| 图表、地图、编辑器实例 | `markRaw` 或 shallowRef | 代理会让第三方库内部的比较失败 |

下面的练习比较 ref 和 shallowRef。对于只整体替换的大数组，使用 shallowRef。

<Exercise id="shallowBig" />

<Exercise id="fbPerf" />

### 21.5 用 defineAsyncComponent 减少首次加载的代码

首次加载的 JS 文件太大时，页面显示得慢。把不是马上需要的组件拆为单独的文件。需要时才下载。`defineAsyncComponent` 的基本用法见[第 9 章](/chapters/09-builtins)，这里讲它在性能上的用法。

```js
const BigChart = defineAsyncComponent(() => import('./BigChart.vue'))
// 模板中照常使用：<BigChart v-if="show" />
```

**场景：任务报表弹窗的加载状态。**报表组件很大。用户打开弹窗时才下载它。设置 loadingComponent 和 delay，加载超过 200ms 时才显示加载提示。设置 errorComponent 和 timeout，加载失败或超时时显示错误提示。

```js
const ReportDialog = defineAsyncComponent({
  loader: () => import('./ReportDialog.vue'),
  loadingComponent: LoadingSpinner,   // 加载中显示
  delay: 200,                         // 200ms 内加载完成：不显示加载提示
  errorComponent: LoadError,          // 失败或超时后显示
  timeout: 10000                      // 10 秒后算作超时
})
// 模板：<ReportDialog v-if="showReport" :board-id="boardId" />
```

**场景：网络不稳定时自动重试。**移动网络中，下载可能失败。在 onError 中调用 retry 重新加载。超过次数后，调用 fail 显示错误组件。

```js
const TaskChart = defineAsyncComponent({
  loader: () => import('./TaskChart.vue'),
  errorComponent: LoadError,
  onError(error, retry, fail, attempts) {
    if (attempts <= 3) retry()   // attempts 从 1 开始
    else fail()
  }
})
```

不要用 defineAsyncComponent 包装路由组件。路由中直接写 `component: () => import('./Page.vue')`。Vue Router 自己处理懒加载。

下面的方法也能减少首次加载的代码：

1. Vue 的 API 支持 tree-shaking。不使用 Transition 或 KeepAlive 时，它们不进入打包结果。
2. 运行 `npx vite-bundle-visualizer`，找到最大的依赖。
3. 鼠标移到链接上时，提前调用 import()。同一个 import() 只下载一次，路由以后直接使用缓存。

```js
const loadReport = () => import('./views/Report.vue')
// <RouterLink to="/report" @mouseenter="loadReport">报表</RouterLink>
```

::: deep 图片
```html
<img
  :src="item.cover"
  :srcset="`${item.cover}?w=400 400w, ${item.cover}?w=800 800w`"
  sizes="(max-width: 600px) 400px, 800px"
  width="800" height="450"
  loading="lazy"
  alt="">
<!-- width 和 height：浏览器提前保留空间，图片加载后页面不跳动 -->
```

首屏中最大的图片不要使用 `loading="lazy"`。它影响 LCP 指标。
:::

### 21.6 减少请求和事件处理的次数

输入框每输入一个字就发请求时，请求太多。用防抖等用户停止输入。滚动事件触发太频繁时，用节流限制次数。下面的函数来自 VueUse（第 8 章）：

```js
import { useDebounceFn, useThrottleFn, watchDebounced } from '@vueuse/core'

const search = useDebounceFn(q => api.search(q), 300)        // 停止输入 300ms 后才运行
const onScroll = useThrottleFn(() => savePosition(), 200)    // 每 200ms 最多运行一次
watchDebounced(keyword, q => api.search(q), { debounce: 300 })
```

::: deep 并行请求
```js
// 错误：三个请求按顺序进行，总时间是三者之和
const user = await getUser(id)
const posts = await getPosts(id)
const stats = await getStats(id)

// 正确：互相不依赖的请求同时发送，总时间是最慢的一个
const [user2, posts2, stats2] = await Promise.all([getUser(id), getPosts(id), getStats(id)])
```
:::

::: deep 客户端缓存
stale-while-revalidate 策略先显示缓存的数据。同时，它在后台请求新数据。新数据返回后，页面更新。用户不用看加载动画。

```js
const cache = new Map()

export function useCachedFetch(url) {
  const data = ref(cache.get(url) ?? null)        // 有缓存：立即显示
  fetch(url).then(r => r.json()).then(json => {   // 同时请求最新的数据
    cache.set(url, json)
    data.value = json
  })
  return { data }
}
```

实际项目中，使用 TanStack Query 或 Pinia Colada。它们还处理重复请求、过期时间和失效。数据请求的缓存和取消，第 18 章会系统地讲。
:::

### 21.7 测量，然后选择方法

没有测量结果时，不要优化。你可能优化了不慢的代码，还让代码更难读。按下面的步骤找到慢的部分：

1. 运行 Lighthouse 或 PageSpeed Insights，看 LCP、INP 和 CLS 等指标。
2. 打开 Vue DevTools（第 6 章）的 Timeline 面板，查看组件渲染和更新所花的时间，找到耗时长的组件。
3. 开发模式中设置 `app.config.performance = true`。浏览器 Performance 面板中会显示每个组件的渲染时间。

找到问题后，按下表选择方法：

| 问题 | 方法 | 本章位置 |
|---|---|---|
| 行数太多。首次显示慢，滚动卡。 | 虚拟列表 | 21.1 |
| 父组件更新时，所有子组件都更新。 | 稳定的 props，拆分组件 | 21.2 |
| Vue 反复比较很少改变的模板。 | `v-memo` / `v-once` | 21.3 |
| Vue 代理大型数据或第三方实例，开销大。 | `shallowRef` / `markRaw` | 21.4 |
| 首次加载的 JS 文件太大。 | 异步组件，路由懒加载 | 21.5 |
| 输入或滚动时请求太多。 | 防抖、节流、缓存 | 21.6 |
| 模板中重复进行复杂计算。 | `computed` | [第 4 章](/chapters/04-computed) |
| 来回切换的页面每次都重新创建。 | `<KeepAlive :max="10">` | [第 9 章](/chapters/09-builtins) |

::: deep 查找内存泄漏
组件卸载后，如果还有对象引用它，它就不能被回收。常见的原因如下：

| 原因 | 修复 |
|---|---|
| window 或 document 上的事件监听 | 在 onUnmounted 中删除。或者使用 VueUse 的 useEventListener |
| setInterval 和 setTimeout | 在 onUnmounted 中清除 |
| 第三方实例，例如图表和地图 | 在 onUnmounted 中调用它们的 destroy 或 dispose |
| 模块级的数组或 Map 保存了组件的数据或 DOM 元素 | 卸载时删除这些项。或者使用 WeakMap |
| 在组件外创建的 watch 和 effect | 调用返回的 stop 函数，或者使用 effectScope |

按下面的步骤用 Chrome DevTools 查找泄漏：

1. 打开 Memory 面板，选择 Heap snapshot。
2. 拍一个快照。
3. 多次打开并关闭可疑的页面或组件。
4. 点击垃圾回收图标，然后再拍一个快照。
5. 选择 Comparison 视图，比较两个快照。
6. 在类过滤器中输入 Detached，查找已分离的 DOM 元素。
7. 选择一个对象，在 Retainers 中查看引用它的对象。
:::

<Exercise id="phenoReuse" />

<Exercise id="phenoDebounce" />

::: pitfalls
1. 优化之前，先测量。原因：不测量时，你可能优化了不慢的代码，还让代码更难读。
2. 不要在模板中给子组件传 `{...}` 或 `[...]` 字面量。原因：每次渲染都创建新对象，子组件每次都更新。
3. v-memo 的数组必须包含所有影响这一行输出的值。否则漏掉的值改变时，页面不更新。
4. 不要把 v-memo 用在 v-for 内部的元素上。把 v-memo 和 v-for 写在同一个元素上。原因：v-memo 在 v-for 内部的元素上不生效。
5. 不要用 defineAsyncComponent 包装路由组件。原因：Vue Router 直接支持 `() => import()`。
:::

::: selfcheck
<Sc :a="2">

使用 21.1 的代码。数据有 10000 行，`scrollTop` 是 2800。DOM 中渲染多少行？

```js
const rowH = 28, viewH = 280
const start = Math.max(0, Math.floor(scrollTop / rowH) - 5)
const end = start + Math.ceil(viewH / rowH) + 10
```

<Opt>10 行</Opt>
<Opt>10000 行</Opt>
<Opt>20 行</Opt>

<template #explain>

解析：start = 100 − 5 = 95。end = 95 + 10 + 10 = 115。所以渲染 20 行。行数不随数据量增加。

</template>
</Sc>

<Sc :a="0">

父组件每次更新时，哪个子组件也会更新？

```html
<Child :opt="{ a: 1 }" />
<Child :opt="opt" />   <!-- opt 在 setup 中只创建一次 -->
```

<Opt>第一个。每次渲染都创建新对象</Opt>
<Opt>第二个</Opt>
<Opt>两个都不更新</Opt>

<template #explain>

解析：对象字面量每次渲染都生成新对象。新旧 props 不相等，所以第一个子组件更新。第二个子组件得到同一个对象，Vue 跳过它。

</template>
</Sc>

<Sc :a="1">

修改 `list[1].name`。页面上第二行会怎样？

```html
<div v-for="item in list" :key="item.id"
     v-memo="[item.id === sel]">{{ item.name }}</div>
```

<Opt>显示新名字</Opt>
<Opt>不更新。v-memo 的数组中没有 item.name</Opt>
<Opt>报错</Opt>

<template #explain>

解析：v-memo 的数组没有改变，Vue 复用上次的虚拟节点。把影响输出的值都放入数组：`[item.id === sel, item.name]`。

</template>
</Sc>

<Sc :a="0">

回顾（第 3 章）：10000 行数据保存在 `list = shallowRef([...])` 中。要把第一行标记为完成，并更新页面。哪种写法正确？

<Opt>list.value[0].done = true; triggerRef(list)</Opt>
<Opt>list.value[0].done = true</Opt>
<Opt>list.value[0] = { ...list.value[0], done: true }</Opt>

<template #explain>

解析：第 3 章：shallowRef 只跟踪 .value 的替换。后两种写法都修改了数组内部，没有替换 .value，所以不触发更新。triggerRef 手动触发依赖 list 的渲染。也可以把 `list.value` 替换为一个新数组。用 shallowRef 的原因：Vue 不为 10000 个对象创建代理。

</template>
</Sc>

:::

::: summary
- 大列表使用虚拟列表。DOM 数量不随数据量增加。
- props 改变时，子组件才更新。保持 props 的引用稳定。
- v-memo 和 v-once 跳过不变的模板。v-memo 的数组要包含所有影响输出的值。
- 只整体替换的大数据用 shallowRef。不需要响应式的对象用 markRaw。
- defineAsyncComponent 按需下载组件。路由组件直接用 import()。
- 防抖和节流减少请求和事件处理的次数。
- 先测量，再按问题选择优化方法。
:::
