---
title: SSR 与水合
id: ssr
stage: 6
chapter: 26
desc: renderToString、水合、不匹配
---

<script setup>
import SsrTimeline from '../figures/26-ssr/SsrTimeline.vue'
import HydrationMatching from '../figures/26-ssr/HydrationMatching.vue'
import HydrationDemo from '../labs/26-ssr/HydrationDemo.vue'
</script>

# SSR 与水合

::: goals
<Goal checks="sc:2,sc:3">说明服务端渲染（SSR）的完整流程。</Goal>
<Goal checks="sc:0,sc:3">说明水合做了什么。</Goal>
<Goal checks="sc:0,sc:1,ex:ssrMismatch,ex:fbSsr">找到并修复水合不匹配。</Goal>

:::

::: rt
阅读主线约 13 分钟。另外留时间做实验台、练习和自测。
:::

::: analogy
SSR 像**先寄来一张房子的照片**，让你马上看到样子；水合就是**工人进屋接上水电**，房子才能真正使用。工人不重新盖房子，只检查照片和实物是否一致。
:::

::: terms
服务端渲染（SSR）
: 在服务器上运行组件，生成 HTML。

水合
: 浏览器接管服务器发来的 HTML，并让它响应点击。

水合不匹配
: 浏览器算出的页面和服务器发来的 HTML 不同。

状态传输
: 把服务器上获取的数据写入 HTML，交给浏览器。
:::

::: why
在慢速网络中打开你的页面，用户先看到几秒白屏。部分搜索引擎收录到的页面也是空的。

原因：客户端渲染时，HTML 中只有一个空的容器。浏览器下载并运行 JavaScript 后，才显示内容。

本章用 SSR 在服务器上生成 HTML。浏览器收到后立即显示内容，然后进行水合。
:::

### 26.1 用 renderToString 和 createSSRApp 渲染页面

下图按时间顺序显示 SSR 的过程。

<Figure caption="SSR 先发送 HTML，用户马上看到内容。水合完成后，按钮等元素才能交互。">
<SsrTimeline />
</Figure>

SSR 按下面的步骤工作：

1. 服务器运行组件，并调用 `renderToString(app)`。
2. 服务器把 HTML 字符串和状态数据发给浏览器。
3. 浏览器立即显示 HTML。这时按钮还不能点击。
4. 浏览器下载并运行 JavaScript。
5. `createSSRApp(App).mount('#app')` 开始水合。
6. 水合完成后，页面可以交互。

服务器和浏览器使用同一个 App 组件。服务器用 createSSRApp 和 renderToString 生成 HTML。浏览器用 createSSRApp 挂载：

```html
// server.js
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
const app = createSSRApp(App)
const html = await renderToString(app)        // '<div><h3>你好</h3><button>点击 0</button></div>'
res.send(`<div id="app">${html}</div><script type="module" src="/client.js"></script>`)

// client.js
createSSRApp(App).mount('#app')               // mount 检测到已有内容：水合，不重新渲染
```

setup 也在服务器上运行。服务器上没有 window 和 document。浏览器专有的代码放在 onMounted 中（见 [第 6 章](/chapters/06-lifecycle)）。服务器不运行 onMounted。

::: deep renderToString 不创建 VNode 树
编译器为每个模板另外生成一个 `ssrRender` 函数。这个函数直接把字符串写进输出，不创建 VNode，也不做 patch。没有 `ssrRender` 的组件（例如手写渲染函数）才先渲染 VNode，再把 VNode 序列化成字符串。

`v-for` 和多根节点的输出里有一对注释，标出片段的边界：

```html
<ul><!--[--><li>1</li><li>2</li><!--]--></ul>
```

水合时，Vue 按 `<!--[-->` 和 `<!--]-->` 对齐这些节点。所以你自己写服务器 HTML 去对照时，不要漏掉这对注释。
:::

### 26.2 理解水合

水合不创建新的 DOM。Vue 遍历虚拟节点，同时遍历已有的 DOM 节点。下图说明水合怎样比较节点。

<Figure caption="水合时，Vue 逐个比较虚拟节点和已有的 DOM 节点。匹配时复用节点。不匹配时按类型处理。">
<HydrationMatching />
</Figure>

- 节点匹配时，Vue 把虚拟节点的 el 指向这个 DOM 节点，并添加事件监听。
- 文字不匹配时，Vue 修改这段文字。
- 属性、class 或 style 不匹配时，Vue 不修改 DOM。开发环境显示警告。
- 元素类型不匹配时，Vue 删除这个 DOM 节点，并创建新节点。

<Lab id="demo-ssr" title="实验台：真实的水合" note="在浏览器中调用 createSSRApp 水合下面的 HTML">
<template #predict>
<Sc predict :a="2">

先猜：服务器 HTML 的标题是“服务器上的旧标题”，客户端渲染“你好，水合”。选择“文字不匹配”，依次点击 1 和 2。结果是什么？

```html
<!-- 服务器 HTML -->
<div><h3>服务器上的旧标题</h3><button>点击 0</button></div>
<!-- 客户端模板 -->
<div><h3>{{ title }}</h3><button @click="n++">点击 {{ n }}</button></div>
```

<Opt>标题保留旧文字，Vue 只添加事件</Opt>
<Opt>Vue 丢弃全部服务器节点，重新创建</Opt>
<Opt>复用全部元素，只替换标题的文字节点</Opt>

<template #explain>

解析：水合时，Vue 逐个比较节点。h3 的文字不同，Vue 报告不匹配，然后把 h3 的文字改为客户端的值。所以只有旧的文字节点被替换，h3 和其他节点都复用。（这里文字是 h3 的唯一子节点，Vue 用 textContent 整体替换文字节点。文字和其他元素混排时，Vue 原地修改文字节点的内容，节点也复用。）第一项以为水合不检查内容。结构不同（例如 h3 和 h4）时，Vue 才替换元素。打开实验台，选择“文字不匹配”，点击 1，再点击 2。看报告中的“复用”和“替换”。

</template>
</Sc>
</template>

<HydrationDemo />
</Lab>

### 26.3 修复水合不匹配

服务器和浏览器渲染的结果不同时，就产生水合不匹配。常见的原因和修复方法如下：

| 原因 | 示例 | 修复方法 |
|---|---|---|
| 服务器和浏览器的数据不同 | `{{ new Date().toLocaleString() }}`、`Math.random()` | 在 onMounted 中设置这个值 |
| 读取浏览器专有的对象 | `window.innerWidth`、`localStorage` | 在 onMounted 中读取 |
| HTML 结构无效 | `<p><div></div></p>`：浏览器会修改这个结构 | 使用有效的嵌套 |
| 随机的 id | 表单 label 的 for 属性 | 使用 3.5 的 `useId()` |
| 差异无法避免 | 时间戳 | 在元素上加 `data-allow-mismatch="text"`（3.5） |

`useId()`（3.5）生成在服务器和浏览器上相同的 id。在 setup 顶层调用它，不要在 computed 或事件函数中调用。

**场景：任务表单中关联 label 和输入框。**表单组件在一个页面中出现多次，id 不能写死。

```vue
<script setup>
const id = useId()               // 例如 'v-0'。每个组件实例不同
const title = defineModel()
</script>

<template>
  <label :for="id">任务标题</label>
  <input :id="id" v-model="title">
</template>
```

**场景：为输入框关联提示和错误信息。**屏幕阅读器通过 aria-describedby 读出提示。用一个 useId 的结果拼出多个 id。

```js
const id = useId()
const hintId = `${id}-hint`
const errorId = `${id}-error`
// <input :id="id" :aria-describedby="`${hintId} ${errorId}`">
// <p :id="hintId">截止日期不能早于今天</p>
// <p :id="errorId" v-if="error">{{ error }}</p>
```

**场景：一个页面中有多个 Vue 应用。**两个应用都从 v-0 开始编号，id 会重复。为每个应用设置不同的 idPrefix。

```js
const boardApp = createSSRApp(Board)
boardApp.config.idPrefix = 'board'   // useId 返回 'board-0'、'board-1'……
const chatApp = createSSRApp(Chat)
chatApp.config.idPrefix = 'chat'
```

不要用 `Math.random()` 或模块级的计数器生成 id。服务器和浏览器的结果不同。

有些差异无法避免。在元素上加 `data-allow-mismatch`（3.5）。Vue 仍把文字改为浏览器的值，但不报告警告。

**场景：按用户时区显示任务的创建时间。**服务器的时区和用户的时区不同，文字一定不同。

```html
<span class="created" data-allow-mismatch="text">
  {{ new Date(task.createdAt).toLocaleString() }}
</span>
```

可选的值有 text、children、class、style 和 attribute。不写值时，允许所有类型。它只关闭警告，不能用来隐藏真正的错误。class、style 和其他属性不匹配时，Vue 仍不修正 DOM。能在 onMounted 中设置的值，在 onMounted 中设置。

**场景：线上页面有水合问题，控制台却没有详情。**从 3.4 开始，生产构建默认不输出不匹配的详情，只打印一句 `Hydration completed but contains mismatches.`。按下面的步骤找到出问题的元素：

1. 在 vite.config 的 `define` 中打开开关。
2. 重新构建，部署到测试环境，复现问题。
3. 在控制台中查看哪个元素、哪个属性不匹配。
4. 修复后关闭开关。它会增加包的体积。

```js
// vite.config.ts
export default defineConfig({
  plugins: [vue()],
  define: {
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true',   // 生产构建也输出水合不匹配的详情
  },
})
```

开发构建总是输出详情，不需要这个开关。

<Exercise id="fbSsr" />

<Exercise id="ssrMismatch" />

### 26.4 在服务器上获取数据，并传给浏览器

`onServerPrefetch(fn)` 只在服务器上运行。fn 返回 Promise 时，renderToString 等待它完成，然后渲染这个组件。

```js
const store = useArticleStore()
onServerPrefetch(async () => {
  await store.load(route.params.id)      // 服务器上：渲染前请求数据
})
onMounted(() => {
  if (!store.article) store.load(route.params.id)   // 浏览器上：只在没有数据时请求
})
```

服务器获取的数据，浏览器也需要。否则水合时数据为空，产生不匹配。按下面的步骤传输 Pinia 的状态：

1. 在服务器上，为每个请求创建新的 pinia。
2. 渲染完成后，把 `pinia.state.value` 序列化。
3. 把结果写入 HTML 的 `window.__INITIAL_STATE__`。
4. 在浏览器中，mount 之前把它赋值给 `pinia.state.value`。

```vue
// server.js
import { uneval } from 'devalue'
const pinia = createPinia()
const app = createSSRApp(App).use(pinia)
const html = await renderToString(app)
const state = uneval(pinia.state.value)        // 转义 < 等字符，防止 XSS
res.send(`<div id="app">${html}</div>
<script>window.__INITIAL_STATE__ = ${state}</script>`)

// client.js
const pinia = createPinia()
const app = createSSRApp(App).use(pinia)
if (window.__INITIAL_STATE__) pinia.state.value = window.__INITIAL_STATE__
app.mount('#app')
```

不要直接用 JSON.stringify 写入 HTML。数据中的 `</script>` 会结束脚本标签，造成 XSS。使用 devalue 或 serialize-javascript。

### 26.5 用流式渲染和延迟水合加快页面

`renderToString` 等待整个页面渲染完成。流式渲染一边渲染一边发送 HTML。浏览器可以更早开始显示。

```js
import { renderToWebStream } from 'vue/server-renderer'
const stream = renderToWebStream(app)          // 返回 ReadableStream
return new Response(stream, { headers: { 'content-type': 'text/html' } })
// Node.js 中：pipeToNodeWritable(app, {}, res)
```

使用流式渲染时，状态要在流结束之后才能序列化。在流的末尾追加状态脚本。

延迟水合（3.5）让异步组件在需要时才水合。这样可以减少首次交互前的 JavaScript 执行时间。

**场景：文章页底部的评论区。**用户滚动到评论区时，它才需要交互。

```js
import { defineAsyncComponent, hydrateOnVisible, hydrateOnIdle, hydrateOnInteraction } from 'vue'

const Comments = defineAsyncComponent({
  loader: () => import('./Comments.vue'),
  hydrate: hydrateOnVisible()          // 进入可见区域时才水合
})
// hydrateOnIdle()：浏览器空闲时水合
// hydrateOnInteraction('click')：用户第一次点击时水合
```

SSR 有代价：要运行 Node 服务器，所有组件代码要在服务器上也能运行。下表帮你判断要不要用。

| 页面情况 | 建议 |
|---|---|
| 首屏内容对搜索引擎或首屏速度重要：营销页、内容站、电商列表 | 用 SSR |
| 登录后才能看的后台、以交互为主的工具 | 不用。纯客户端渲染就够 |
| 内容很少变化 | 考虑静态生成：构建时渲染成 HTML |
| 团队没有 Node 服务器可用 | 不用，或选静态生成 |

### 26.6 实际项目：使用 Nuxt

自己搭建 SSR 需要处理很多问题：服务器、路由、数据预取、状态传输和构建。实际项目中，使用 Nuxt。Nuxt 提供下面这些功能：

- 基于文件的路由。
- `useFetch` 和 `useAsyncData`：在服务器上请求数据，并把结果传给浏览器。
- 自动的状态传输和水合。
- 按页面选择 SSR、静态生成或只在客户端渲染。

::: pitfalls
1. 不要在 setup 中直接读取 window 或 document。在 onMounted 中读取。原因：setup 也在服务器上运行。服务器上没有这些对象。
2. 不要在模块顶层创建共享的响应式数据。为每个请求创建新的应用和 Pinia 实例。原因：服务器上的模块只加载一次。所有请求共享这个数据，用户会看到别人的数据。
3. 不要用 Math.random() 生成 id。使用 useId()。原因：服务器和浏览器的结果不同，水合时不匹配。
4. 不要用 data-allow-mismatch 隐藏真正的错误。原因：它只关闭警告。属性不匹配时，Vue 仍不修正 DOM。
:::

::: selfcheck
<Sc :a="1">

服务器渲染 `<p>server</p>`。客户端渲染 `<p>client</p>`。水合后，p 中的文字是什么？

<Opt>server</Opt>
<Opt>client</Opt>
<Opt>两段文字都有</Opt>

<template #explain>

解析：文字不匹配时，Vue 把文字改为客户端的值，并报告不匹配。

</template>
</Sc>

<Sc :a="0">

服务器渲染 `class="a"`。客户端渲染 `class="b"`。水合后，元素的 class 是什么？

<Opt>a。Vue 不修改属性，只报告不匹配</Opt>
<Opt>b</Opt>
<Opt>a b</Opt>

<template #explain>

解析：水合时，Vue 不修正属性、class 和 style。页面保留错误的值。所以要消除不匹配的原因。

</template>
</Sc>

<Sc :a="2">

下面哪行 setup 代码在服务器上出错？

<Opt>const n = ref(0)</Opt>
<Opt>onMounted(() => console.log(window.innerWidth))</Opt>
<Opt>const w = window.innerWidth</Opt>

<template #explain>

解析：服务器上没有 window。onMounted 只在浏览器中运行，所以第二行安全。在 setup 中直接读取 window 会出错。

</template>
</Sc>

<Sc :a="0">

SSR 页面已经显示了内容。但是这时点击按钮没有反应。最可能的原因是什么？

<Opt>JavaScript 还没运行完，水合没有完成</Opt>
<Opt>renderToString 生成的 HTML 有错误</Opt>
<Opt>水合正在删除并重建全部的 DOM</Opt>

<template #explain>

解析：SSR 的 HTML 只有内容，没有事件监听。浏览器下载并运行 JavaScript 后，`createSSRApp(App).mount()` 开始水合，这时才添加事件监听。所以在这之前按钮不能点击。HTML 中没有事件监听是正常的，不是错误。水合复用已有的 DOM，不重建它。

</template>
</Sc>

<Sc :a="0">

回顾（第 6 章）：组件在 `onMounted` 中从 `localStorage` 读取主题。使用 SSR 时，会发生什么？

<Opt>服务器不运行 onMounted，水合后才设置</Opt>
<Opt>服务器运行 onMounted，然后报错</Opt>
<Opt>服务器运行 onMounted，读到空值</Opt>

<template #explain>

解析：第 6 章：onMounted 在 DOM 挂载后运行。服务器不挂载 DOM，所以不运行 onMounted，也就不会报错或读到空值。服务器的 HTML 使用默认主题。水合完成后，浏览器运行 onMounted，再改为保存的主题。所以浏览器专有的 API 要放在 onMounted 中。

</template>
</Sc>

:::

::: summary
- 服务器用 renderToString 生成 HTML。浏览器用 createSSRApp 挂载并水合。
- SSR 先显示 HTML，水合之后页面才可以交互。
- 水合复用 DOM 节点。不匹配时，Vue 修改文字或替换节点，但不修正属性。
- 浏览器专有的代码放在 onMounted 中。id 用 useId()。无法避免的差异用 data-allow-mismatch。
- onServerPrefetch 在服务器上获取数据。状态安全地序列化后传给浏览器。
- 流式渲染和延迟水合让页面更早显示和交互。实际项目使用 Nuxt。
:::
