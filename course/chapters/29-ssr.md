---
title: SSR 与水合
id: ssr
stage: 6
chapter: 29
desc: renderToString、水合、不匹配
---

<script setup>
import SsrTimeline from '../figures/29-ssr/SsrTimeline.vue'
import HydrationMatching from '../figures/29-ssr/HydrationMatching.vue'
import StreamTimeline from '../figures/29-ssr/StreamTimeline.vue'
import HydrationDemo from '../labs/29-ssr/HydrationDemo.vue'
import HydrationMatrix from '../labs/29-ssr/HydrationMatrix.vue'
</script>

# SSR 与水合

::: goals
<Goal checks="sc:2,sc:3">说明服务端渲染（SSR）的完整流程。</Goal>
<Goal checks="sc:0,sc:3">说明水合做了什么。</Goal>
<Goal checks="sc:0,sc:1,ex:ssrMismatch,ex:fbSsr">找到并修复水合不匹配。</Goal>
<Goal checks="sc:5,ex:miniHydrate">说明 hydrateNode 怎样按 vnode 类型和现有 DOM 对上，并写出迷你 hydrate。</Goal>
<Goal checks="sc:6">说明流式渲染按什么顺序发送 HTML，以及 Suspense 在服务器上做什么。</Goal>
<Goal checks="sc:7,sc:8">区分延迟水合策略的触发条件，说明 useId 在两端一致的原因。</Goal>

:::

::: rt
阅读主线约 20 分钟，深入内容约 8 分钟（可选）。另外留时间做实验台、练习和自测。
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

流式渲染
: 服务器一边渲染一边发送 HTML，不等整页完成。

延迟水合
: 先显示服务器的 HTML，等条件满足后才让 Vue 接管这个组件。
:::

::: why
在慢速网络中打开你的页面，用户先看到几秒白屏。部分搜索引擎收录到的页面也是空的。

原因：客户端渲染时，HTML 中只有一个空的容器。浏览器下载并运行 JavaScript 后，才显示内容。

本章用 SSR 在服务器上生成 HTML。浏览器收到后立即显示内容，然后进行水合。
:::

### 29.1 用 renderToString 和 createSSRApp 渲染页面

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

### 29.2 理解水合

水合不创建新的 DOM。Vue 遍历虚拟节点，同时遍历已有的 DOM 节点。下图说明水合怎样比较节点。

<Figure caption="水合时，Vue 逐个比较虚拟节点和已有的 DOM 节点。匹配时复用节点。不匹配时按类型处理。">
<HydrationMatching />
</Figure>

- 节点匹配时，Vue 把虚拟节点的 el 指向这个 DOM 节点，并添加事件监听。
- 文字不匹配时，Vue 修改这段文字。
- class 或 style 不匹配时，Vue 不修改 DOM。开发环境显示警告。
- 用 `v-bind` 绑定的其他属性（例如 `:title`）不匹配时，Vue 把它改成客户端的值。完整的对照表在 29.7。
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

### 29.3 修复水合不匹配

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

可选的值有 text、children、class、style 和 attribute。不写值时，允许所有类型。它只关闭警告，不能用来隐藏真正的错误。class 和 style 不匹配时，Vue 仍不修正 DOM。用 `v-bind` 绑定的其他属性会被改成客户端的值（见 29.7）。能在 onMounted 中设置的值，在 onMounted 中设置。

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

### 29.4 在服务器上获取数据，并传给浏览器

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

### 29.5 用流式渲染和延迟水合加快页面

`renderToString` 等待整个页面渲染完成。流式渲染一边渲染一边发送 HTML。浏览器可以更早开始显示。

```js
import { renderToWebStream } from 'vue/server-renderer'
const stream = renderToWebStream(app)          // 返回 ReadableStream
return new Response(stream, { headers: { 'content-type': 'text/html' } })
// Node.js 中：pipeToNodeWritable(app, {}, res)
```

使用流式渲染时，状态要在流结束之后才能序列化。在流的末尾追加状态脚本。29.8 讲这几个函数的工作方式，以及为什么 Suspense 不改变发送顺序。

延迟水合（3.5）让异步组件在需要时才水合。这样可以减少首次交互前的 JavaScript 执行时间。29.9 讲每种策略的触发条件。

**场景：文章页底部的评论区。**用户滚动到评论区时，它才需要交互。

```js
import { defineAsyncComponent, hydrateOnVisible, hydrateOnIdle, hydrateOnInteraction } from 'vue'

const Comments = defineAsyncComponent({
  loader: () => import('./Comments.vue'),
  hydrate: hydrateOnVisible()          // 进入可见区域时才水合
})
// hydrateOnIdle()：浏览器空闲时水合
// hydrateOnMediaQuery('(min-width: 800px)')：屏幕满足条件时水合
// hydrateOnInteraction('click')：用户第一次点击时水合
```

SSR 有代价：要运行 Node 服务器，所有组件代码要在服务器上也能运行。下表帮你判断要不要用。

| 页面情况 | 建议 |
|---|---|
| 首屏内容对搜索引擎或首屏速度重要：营销页、内容站、电商列表 | 用 SSR |
| 登录后才能看的后台、以交互为主的工具 | 不用。纯客户端渲染就够 |
| 内容很少变化 | 考虑静态生成：构建时渲染成 HTML |
| 团队没有 Node 服务器可用 | 不用，或选静态生成 |

### 29.6 实际项目：使用 Nuxt

自己搭建 SSR 需要处理很多问题：服务器、路由、数据预取、状态传输和构建。实际项目中，使用 Nuxt。Nuxt 提供下面这些功能：

- 基于文件的路由。
- `useFetch` 和 `useAsyncData`：在服务器上请求数据，并把结果传给浏览器。
- 自动的状态传输和水合。
- 按页面选择 SSR、静态生成或只在客户端渲染。

### 29.7 水合怎样把 vnode 和 DOM 对上

29.1 到 29.6 讲怎样用 SSR。29.7 到 29.9 看 Vue 在里面做了什么。读这三节时，用第 18 章的 patch 作对照。

水合没有“创建”这一步。它同时走两棵树：虚拟节点树，和浏览器已经解析好的 DOM。Vue 用 `hydrateNode(node, vnode)` 把它们逐个对上。`node` 是游标：指向当前要配对的那个 DOM 节点。这个函数做三件事：

1. 把 `vnode.el` 指向 `node`。
2. 按 vnode 的类型检查 `node` 对不对得上，并做这种类型该做的事。
3. 返回下一个要处理的 DOM 节点，调用方拿它去配下一个 vnode。

下面是 `runtime-core/hydration.ts` 的简化版。它省略了开发版的属性检查、指令钩子、Teleport 和 Suspense。

```js
function hydrateNode(node, vnode, parentComponent) {
  vnode.el = node                                          // 1. 配对
  switch (vnode.type) {
    case Text:
      if (node.nodeType !== 3) return handleMismatch(node, vnode)
      if (node.data !== vnode.children) node.data = vnode.children   // 文字不同：就地修改
      return node.nextSibling                              // 3. 返回下一个
    case Fragment:
      if (!isFragmentStart(node)) return handleMismatch(node, vnode) // 必须是 <!--[-->
      return hydrateFragment(node, vnode, parentComponent)
    default:
      if (vnode.shapeFlag & ELEMENT) {
        if (node.nodeType !== 1 || node.tagName.toLowerCase() !== vnode.type)
          return handleMismatch(node, vnode)               // 标签对不上
        return hydrateElement(node, vnode, parentComponent)
      }
      if (vnode.shapeFlag & COMPONENT) {
        // 单根组件占一个节点；多根组件占 <!--[--> 到 <!--]--> 之间的一段
        const next = isFragmentStart(node) ? locateClosingAnchor(node) : node.nextSibling
        mountComponent(vnode, parentNode(node), null, parentComponent)
        return next
      }
  }
}
```

组件最特别。`mountComponent` 照常运行 setup 和 render，得到子树。但渲染 effect 看到 `vnode.el` 已经有值，就不再调用 `patch(null, 子树)` 创建 DOM，而是调用 `hydrateNode(el, 子树)`，让子树和同一个 DOM 节点配对。（组件挂载的完整流程见第 19 章。）

元素用 `hydrateElement` 处理。它先处理子节点，再处理属性。下面是开发版的流程：

```js
function hydrateElement(el, vnode, parentComponent) {
  // 1. 子节点
  if (vnode.shapeFlag & ARRAY_CHILDREN) {
    let next = hydrateChildren(el.firstChild, vnode, el, parentComponent)
    while (next) {                       // 游标上剩下的，是服务器多出来的节点
      const cur = next
      next = next.nextSibling
      remove(cur)
    }
  } else if (vnode.shapeFlag & TEXT_CHILDREN && el.textContent !== vnode.children) {
    el.textContent = vnode.children      // 只有文字的子节点：整段替换
  }
  // 2. 属性：只处理三类
  for (const key in vnode.props) {
    if (isOn(key) || key[0] === '.' || vnode.dynamicProps?.includes(key)) {
      patchProp(el, key, null, vnode.props[key])   // 就是渲染器的 patchProp（第 30 章）
    }
  }
  return el.nextSibling
}
```

属性这一步决定了 29.2 的那条规则。只有三类属性被处理：

- **事件**（`onClick` 这类）。HTML 里没有事件，必须接上。
- **`.prop` 修饰符**绑定的属性（编译后的 key 以 `.` 开头）。
- **`dynamicProps` 里的属性**。它由编译器生成：模板里用 `v-bind` 绑定的属性（`:title`、`:data-x`）会进去（第 17 章）。

其余属性不碰：静态属性、`class`、`style`。这是一个取舍。`dynamicProps` 是编译器白送的，几乎没有成本。比较所有属性，要解析 class 和 style 的字符串，成本高。开发版会额外比较 class、style 和已知属性并发出警告，生产版不比较。（真实代码还会强制处理 `<input>` 的 value 和自定义元素，这里省略。）

**生产版比开发版更省。** 生产构建的 `hydrateElement` 多了两个捷径（开发版没有，因为开发版要检查并发出警告）：

1. **完全静态的元素整个跳过。** 编译器把没有任何动态内容的子树缓存起来，并标成 `patchFlag === -1`。这种元素没有 `dynamicProps` 时，`hydrateElement` 直接返回，连它的子节点都不走。
2. **Block 树里没有动态属性的元素，不遍历 props。** 唯一的例外是 `onClick`，它走一条快路。其他事件（`@input` 等）由编译器加上 `NEED_HYDRATION` 标记（第 17 章），带标记的元素才遍历 props 接上事件。

```js
// 生产版的 hydrateElement 开头和属性部分（简化）
if (!dynamicProps && patchFlag === -1) return el.nextSibling      // 捷径 1：静态元素整个跳过
// …… 处理子节点 ……
if (props) {
  if (dynamicProps || !optimized || patchFlag & (FULL_PROPS | NEED_HYDRATION)) {
    // 遍历 props：事件、`.prop`、dynamicProps 里的
  } else if (props.onClick) {
    patchProp(el, 'onClick', null, props.onClick)                 // 捷径 2：只接 click
  }
}
```

后果是开发版和生产版对**静态子树里的不匹配**反应不同。用同一份只改了静态部分的服务器 HTML，在两种构建里各水合一次（实测）：

| 静态部分的差异 | 开发版 | 生产版 |
|---|---|---|
| `<p>static text</p>` 的文字改成 `OLD` | 改回 static text | 保留 OLD |
| 静态的 `ul` 多一个 `li` | 删掉多出的 | 保留 |
| 静态的 `ul` 少一个 `li` | 补上 | 保留 |
| 静态的 `ul` 变成 `ol` | 重建成 `ul` | 重建成 `ul` |

最后一行相同，因为标签检查在 `hydrateNode` 里，早于 `hydrateElement`。前三行说明：开发版里被悄悄修好的静态内容，在生产版里会保持服务器的样子。下面的实验台特意用动态元素（带 `v-bind` 属性或插值），避开这个差异。

下面的实验台对 9 种差异各水合一次，读出水合后的 DOM。

<Lab id="demo-ssr-matrix" title="实验台：哪些差异会被改成客户端的值" note="真实的 createSSRApp。每一行只有一处不同">
<template #predict>
<Sc predict :a="1">

先猜：服务器 HTML 是 `<div lang="en" title="server">`。客户端模板写 `<div lang="en" :title="t">`，t 是 `'client'`。水合后 title 是什么？

<Opt>server。Vue 不修改属性，和 class 一样</Opt>
<Opt>client。:title 是动态属性，会被改成客户端的值</Opt>
<Opt>整个 div 被删除并重新创建</Opt>

<template #explain>

解析：`:title` 进了编译器生成的 `dynamicProps`，`hydrateElement` 对它调用 `patchProp`，所以变成 client。只有 class 和 style 不修正。如果服务器的是 `lang="fr"` 而模板里写的是静态的 `lang="en"`，它不在 `dynamicProps` 里，会保留 fr。第三项把属性不同当成了标签不同。只有标签对不上，Vue 才重建节点。打开实验台，看每一行的结果。

</template>
</Sc>
</template>

<HydrationMatrix />
</Lab>

::: pitfalls 注意：手写 h() 的 vnode 没有 dynamicProps
`dynamicProps` 来自模板编译。用 `h('div', { title: 'b' })` 手写渲染函数时，vnode 没有 `dynamicProps`，所以 title 也不会被修正：服务器是 `title="a"`，水合后仍是 `a`。把水合不匹配的修复交给 Vue，只对模板成立，不要依赖它。
:::

#### 子节点怎样配对

`hydrateChildren` 用一个游标走 DOM。它按顺序取每个子 vnode，调用 `hydrateNode(游标, 子 vnode)`，游标移到返回的下一个节点。有两种异常：

- **游标用完了，但还有 vnode。** 服务器缺子节点。Vue 警告，并用 `patch(null, vnode, 容器)` 把剩下的挂载上去。
- **vnode 用完了，游标上还有节点。** 服务器多子节点。`hydrateElement` 把它们逐个删掉。

文字有一个特别之处。服务器的 HTML 会把相邻的文字写成一个文本节点，而 vnode 里可能是两个文本。Vue 先把 DOM 的文本节点从中间切开，再逐个配对。`h('p', ['a', 'b'])` 水合 `<p>ab</p>` 时没有警告，水合后 p 里有两个文本节点。

#### 不匹配时的处理路径

节点配不上时，`hydrateNode` 调用 `handleMismatch`：

1. 警告（除非用 `data-allow-mismatch` 允许）。
2. 如果游标是 `<!--[-->`，说明要换掉整段：先删掉这一段里游标后面的所有节点，直到结束注释（含）。
3. 记下游标的下一个兄弟，删掉游标。
4. 调用 `patch(null, vnode, 容器, 下一个兄弟)`，在原位置挂载一份新的。
5. 返回那个下一个兄弟，水合继续。

所以一个不匹配只让这一个子树重建，兄弟和祖先不受影响。生产版只在文字、子节点或标签不匹配时，于水合结束时打印一次 `Hydration completed but contains mismatches.`。class、style 和属性的不匹配，生产版不检查，也不打印（实测）。

#### data-allow-mismatch 的范围

`data-allow-mismatch` 在不同类型上的范围不同（实测）：

- **text 和 children**：向上找祖先。在祖先元素上写一次，里面所有的文字、子节点、标签不匹配都不再警告。`children` 包含 `text`。
- **class、style、attribute**：只看元素自己。写在祖先上不起作用。

它只关闭警告，不改变修正的行为。

::: deep Fragment 的锚点注释：它是怎么配对的，缺了会怎样
Fragment 没有自己的元素。它的子节点和别的兄弟混在一起，从 HTML 里数不出它有几个子节点。所以服务器用一对注释圈出范围。多根组件的模板也会得到这一对注释：

```html
<!-- 模板：<p>a</p><p>b</p>（两个根节点） -->
<!--[--><p>a</p><p>b</p><!--]-->
```

`v-if` 为假时，服务器输出一个空注释 `<!---->` 占位，客户端的 Comment vnode 和它配对。

`hydrateFragment` 的步骤：

1. 容器是游标的父节点。
2. 从 `<!--[-->` 的下一个节点开始，调用 `hydrateChildren`。
3. 结束后，游标应该停在 `<!--]-->`。把它记为 `vnode.anchor`，返回它的下一个兄弟。
4. 不是 `<!--]-->` 就警告，并补插一个结束注释。

组件如果是多根的，`locateClosingAnchor` 从 `<!--[-->` 往后数，遇到嵌套的 `[` 加一，遇到 `]` 减一，找到配对的结束位置，这样才知道组件占了多长一段。

如果注释被丢掉了，会怎样？服务器是 `<ul><li>1</li><li>2</li></ul>`，客户端是 `ul` 里放一个 Fragment。水合到第一个 `li` 时，Fragment 要求 `<!--[-->`，却遇到了 `li`。`handleMismatch` 删掉它并重新挂载整个片段。实测：水合后 `li` 不再是原来的节点。
:::

<Exercise id="miniHydrate" />

### 29.8 流式渲染怎样一边渲染一边发送

先看 `renderToString` 的内部。组件渲染的结果不是字符串，而是一个 buffer 数组。里面有三种东西：字符串（同步渲染出来的 HTML）、Promise（`async setup` 或 `onServerPrefetch` 还没完成的组件）和嵌套的 buffer（子组件）。`renderToString` 把整个 buffer 展开成一个字符串，要等最慢的 Promise。

流式 API 用同一个 buffer，但按顺序展开：遇到字符串就立即写出去，遇到 Promise 就等它完成再继续。

```js
// server-renderer/renderToStream.ts（简化）
async function unrollBuffer(buffer, stream) {
  for (const item of buffer) {
    const value = await item              // 字符串直接通过，Promise 等待
    if (typeof value === 'string') stream.push(value)
    else await unrollBuffer(value, stream)   // 嵌套的 buffer
  }
}
```

对外有四个出口，底层都是同一个 `renderToSimpleStream`，只是 `push` 写到哪里不同：

| 函数 | 写到哪里 |
|---|---|
| `renderToNodeStream(app)` | 返回 Node 的 `Readable` |
| `pipeToNodeWritable(app, ctx, writable)` | 写进已有的 `Writable`（例如 `res`），结束时调用 `writable.end()` |
| `renderToWebStream(app)` | 返回 Web 的 `ReadableStream`（内容是 `Uint8Array`） |
| `pipeToWebWritable(app, ctx, writable)` | 写进已有的 `WritableStream` |

下面用一个例子看输出顺序。A 的 `async setup` 等 100 毫秒，B 的等 300 毫秒：

```js
// <main><h1>head</h1><A /><p>mid</p><B /><footer>end</footer></main>
const stream = renderToNodeStream(createSSRApp(App))
stream.on('data', chunk => console.log(Date.now() - t0, chunk.toString()))
// 1    <main><h1>head</h1>
// 104  <section>slow 100</section>
// 105  <p>mid</p>
// 303  <section>slow 300</section>
// 304  <footer>end</footer></main>
```

`renderToString` 在 306 毫秒时一次返回整页。

<Figure caption="A 和 B 同时开始，不是一个等另一个：总时间是 300 毫秒，不是 400。流按文档顺序发送，所以 A 之前的内容立即发出，B 之后的内容要等 B。">
<StreamTimeline />
</Figure>

从这个例子可以得到四条规则：

1. **同时开始，按文档顺序发送。** 父组件渲染时，同步地启动了 A 和 B 的 `setup`，所以它们并行。但 `<p>mid</p>` 排在 A 后面，A 没完成它就不能发。
2. **慢组件挡住它后面的内容，不挡前面的。** 把慢的组件放在页面靠后的位置，前面的内容可以更早到达。
3. **根组件的 async setup 挡住一切。** 流要拿到根组件的 buffer 才能开始，所以根组件如果 `await` 了数据，第一个字节要等它。实测只有一个 `async setup` 等 200 毫秒的根组件，第一块在 203 毫秒到达。把请求放在下层组件里。
4. **服务器上的 Suspense 不改变顺序。** `ssrRenderSuspense` 只渲染 `default` 插槽，不输出 `fallback`。里面的异步依赖照样被等待，流照样卡在那里。fallback 只在客户端有意义。Vue 3.5.43 的服务器渲染器没有“先发 fallback，慢组件好了再补”的乱序流式。

用流把页面发给浏览器时，页面的头和尾要自己拼。`pipeToNodeWritable` 结束时会关闭 `res`，所以要在尾部追加状态脚本，就用 `renderToNodeStream`：

```js
createServer((req, res) => {
  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.write('<!doctype html><div id="app">')
  const stream = renderToNodeStream(createSSRApp(App))
  stream.on('data', chunk => res.write(chunk))
  stream.on('end', () => {
    res.end(`</div><script>window.__STATE__ = ${uneval(state)}</script>`)   // 流结束后状态才完整（uneval 见 29.4）
  })
  stream.on('error', err => res.destroy(err))   // 已经发出的内容收不回，只能中断连接
})
```

最后一行有一个限制：流一开始，响应头（状态码 200）已经发出。渲染中途出错，不能再改成错误页，只能中断连接。需要错误页的路由，不要用流式渲染。

### 29.9 延迟水合的触发条件，和 useId 为什么两端一致

#### 延迟水合怎样接进水合流程

29.7 说过，组件的渲染 effect 在水合时调用 `hydrateSubTree`。如果组件是 `defineAsyncComponent` 创建的，effect 会先检查它有没有 `__asyncHydrate` 钩子。有就把 `hydrateSubTree` 交给钩子，由钩子决定什么时候调用。这是整个机制：

```js
// runtime-core/apiAsyncComponent.ts（简化）
__asyncHydrate(el, instance, hydrate) {
  const performHydrate = () => {
    if (!el.parentNode) return                  // 节点已经不在页面上
    hydrate()                                   // 真正的水合：运行 render、接管子树、绑定事件
  }
  const doHydrate = hydrateStrategy
    ? () => {
        const teardown = hydrateStrategy(performHydrate, cb => forEachElement(el, cb))
        if (teardown) instance.bum.push(teardown)   // 组件卸载前取消监听
      }
    : performHydrate
  load().then(() => doHydrate())                // 代码加载完，再按策略等
}
```

策略是一个函数：`(hydrate, forEach) => teardown`。`hydrate` 是要调用的水合函数，`forEach` 遍历组件在 DOM 里的根元素，`teardown` 用来清理。四个内置策略：

| 策略 | 触发条件 | 适合 |
|---|---|---|
| `hydrateOnIdle(timeout)` | `requestIdleCallback`，浏览器空闲时。`timeout` 是最长等待时间，默认 10000 毫秒 | 重要但不紧急的区域：侧栏、页脚 |
| `hydrateOnVisible(options)` | `IntersectionObserver` 发现根元素进入视口。已经在视口内就立即水合。`options` 传给 observer（例如 `rootMargin`） | 首屏以下的内容：评论区、推荐列表 |
| `hydrateOnMediaQuery(query)` | `matchMedia(query)` 已经匹配就立即水合；否则等 `change` 事件，触发一次就水合 | 只在某些屏幕上有交互的区域：桌面端侧栏 |
| `hydrateOnInteraction(events)` | 根元素上第一次触发指定事件（字符串或数组，例如 `'click'`、`['mouseover', 'focus']`） | 弹窗、菜单、展开面板 |

实测每种策略的行为（Vue 3.5.43，浏览器）：

- **`hydrateOnInteraction` 不会丢掉第一次点击。** 点击触发水合后，Vue 把同一个事件重新派发一次，所以刚接上的处理函数收到了这次点击。点一次，计数加 1。
- **`hydrateOnVisible` 对视口外的组件不水合。** 页面加载后，组件在视口外，未水合；滚动到它，才水合。
- **`hydrateOnMediaQuery('(min-width: 800px)')`** 在 500 像素宽的视口里不水合；把视口拉到 900 像素，水合。
- **所有策略都立即调用了 loader。** 延迟的是水合（运行 setup 和 render、绑定事件），不是下载代码。

几点边界：

- **只对异步组件有效。** 钩子挂在异步包装组件上，同步组件没有这个钩子。
- **水合前页面是静态的。** 按钮点了没反应（`hydrateOnInteraction` 除外）。所以不要对首屏上用户马上要操作的区域使用。
- **`display: none` 的组件用 `hydrateOnVisible` 永远不会水合**（实测）：它不会进入视口。
- **取消**由 `teardown` 负责，组件卸载时自动调用。
- 自己写策略时，返回 teardown，并只在条件满足时调用一次 `hydrate()`。

#### useId 为什么两端一致

`useId()` 的实现很短：

```js
// runtime-core/helpers/useId.ts（简化）
function useId() {
  const i = getCurrentInstance()
  return (i.appContext.config.idPrefix || 'v') + '-' + i.ids[0] + i.ids[1]++
}
```

关键是 `instance.ids`，一个三元组：`[前缀, 计数器, 异步边界计数器]`。

- **普通子组件共用父组件的 `ids` 数组**，也就是同一个计数器。组件按渲染顺序调用 `useId()`，得到 `v-0`、`v-1`、`v-2`。服务器和客户端按同样的顺序渲染同一棵树，编号相同。
- **异步边界有自己的 `ids`。** `async setup` 的组件和 `defineAsyncComponent` 的组件调用 `markAsyncBoundary`，得到新数组：前缀是“父组件的前缀 + 它是父组件的第几个异步子组件 + `-`”，计数器从 0 开始。

只靠计数器不够，因为异步组件完成的先后不固定：服务器上 B 可能先加载完，客户端也可能先水合 B（延迟水合）。如果它们抢同一个计数器，编号就会跟着顺序变。所以异步边界用自己的前缀隔离出一块编号空间。

实测同一棵树：普通组件、异步的 A、异步的 B、普通组件。A 先完成和 B 先完成，服务器输出相同：

```html
<main id="v-0">
  <i id="v-1">F0</i>
  <div id="v-0-0"><i id="v-0-1">A1</i><i id="v-0-2">A2</i></div>   <!-- A 的边界：前缀 0- -->
  <div id="v-1-0"><i id="v-1-1">B1</i></div>                       <!-- B 的边界：前缀 1- -->
  <i id="v-2">F1</i>
</main>
```

再在浏览器里先水合 B（`hydrateOnIdle`），点击后才水合 A（`hydrateOnInteraction`），水合后的 DOM 与服务器 HTML 完全相同，没有不匹配警告。

结论：id 只取决于组件在树里的位置，不取决于谁先完成、谁先水合。这就是 29.3 说“不要用模块级计数器”的原因：它依赖运行顺序。

::: pitfalls
1. 不要在 setup 中直接读取 window 或 document。在 onMounted 中读取。原因：setup 也在服务器上运行。服务器上没有这些对象。
2. 不要在模块顶层创建共享的响应式数据。为每个请求创建新的应用和 Pinia 实例。原因：服务器上的模块只加载一次。所有请求共享这个数据，用户会看到别人的数据。
3. 不要用 Math.random() 生成 id。使用 useId()。原因：服务器和浏览器的结果不同，水合时不匹配。
4. 不要用 data-allow-mismatch 隐藏真正的错误。原因：它只关闭警告。class 和 style 不匹配时，Vue 仍不修正 DOM，页面保留服务器的值。
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

解析：水合时，Vue 不修正 class 和 style，页面保留服务器的值。用 `v-bind` 绑定的其他属性（例如 `:title`）是例外：它们会被改成客户端的值。所以要消除不匹配的原因，不要指望 Vue 帮你改 class。

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

<Sc :a="2">

服务器 HTML 是 `<div title="a">hi</div>`。客户端模板是 `<div :title="t">hi</div>`，`t` 是 `'b'`。水合后，这个 div 是什么？

<Opt>`title="a"`。Vue 不修正属性，只在开发版警告</Opt>
<Opt>整个 div 被删除，再创建一个 `title="b"` 的</Opt>
<Opt>`title="b"`，原来的 div 被复用</Opt>

<template #explain>

解析：`:title` 是 v-bind 绑定的属性，编译器把它放进 `dynamicProps`。`hydrateElement` 对 `dynamicProps` 里的属性调用 `patchProp`，所以复用 div，并把 title 改成 b。第一项把“class 和 style 不修正”推广到了所有属性，这是最迷惑的错项。第二项把属性不同当成标签不同：只有标签对不上，Vue 才重建节点。

</template>
</Sc>

<Sc :a="1">

组件 A 的 `async setup` 等 100 毫秒，B 的等 300 毫秒。模板如下，用 `renderToNodeStream` 渲染。浏览器大约在什么时候收到 `<p>mid</p>`？

```html
<main><h1>head</h1><A /><p>mid</p><B /><footer>end</footer></main>
```

<Opt>几乎立刻，因为 `<p>` 是静态的</Opt>
<Opt>约 100 毫秒，A 完成之后</Opt>
<Opt>约 400 毫秒，A 和 B 一个接一个</Opt>

<template #explain>

解析：流按文档顺序发送。`<p>` 排在 A 后面，A 没有完成就轮不到它，所以要等约 100 毫秒。A 和 B 在父组件渲染时同时开始，不是串行，所以不是 400 毫秒。第一项忽略了顺序：静态内容不能越过前面的 Promise 先发出。

</template>
</Sc>

<Sc :a="0">

组件用 `hydrate: hydrateOnInteraction('click')`。页面的 JavaScript 加载完成后，用户第一次点击这个组件里的按钮，按钮的处理函数会执行吗？

<Opt>会执行一次。Vue 先水合，再把这次点击重新派发给按钮</Opt>
<Opt>不会。这次点击只触发水合，用户要再点一次</Opt>
<Opt>会执行两次：水合前一次，水合后一次</Opt>

<template #explain>

解析：策略在根元素上监听 `click`。触发后它先移除自己的监听，调用 `hydrate()`，再用同样的参数创建一个新事件，派发给点击的目标。这时处理函数已经接上，所以执行一次。第二项是常见的担心：策略正是为了避免丢掉第一次点击。第三项不可能：水合前按钮上没有处理函数。

</template>
</Sc>

<Sc :a="2">

父组件有两个 `defineAsyncComponent` 子组件 A 和 B，两者内部都调用 `useId()`。服务器上 B 先加载完。客户端先水合了 B，A 之后才水合。A 里的 id 和服务器的一致吗？

<Opt>不一致，因为水合顺序变了，计数器的顺序也变了</Opt>
<Opt>一致，因为 useId 直接读取服务器 HTML 里已有的 id</Opt>
<Opt>一致，因为异步组件有自己的 id 前缀，它由位置决定，不由完成顺序决定</Opt>

<template #explain>

解析：异步边界调用 `markAsyncBoundary`，得到自己的 `ids`：前缀是“父组件前缀 + 它是第几个异步子组件”，计数器从 0 开始。A 永远是第 0 个，B 永远是第 1 个，和谁先完成无关。第一项假设两个组件共用一个计数器，只有普通子组件才是这样。第二项想象了一个不存在的机制：useId 不读 HTML，两端靠同样的规则各自算出同样的值。

</template>
</Sc>

:::

::: summary
- 服务器用 renderToString 生成 HTML。浏览器用 createSSRApp 挂载并水合。
- SSR 先显示 HTML，水合之后页面才可以交互。
- 水合复用 DOM 节点。不匹配时，Vue 修改文字、补上或删掉子节点、替换标签不同的节点。class 和 style 保留服务器的值，用 v-bind 绑定的其他属性改成客户端的值。
- 浏览器专有的代码放在 onMounted 中。id 用 useId()。无法避免的差异用 data-allow-mismatch。
- onServerPrefetch 在服务器上获取数据。状态安全地序列化后传给浏览器。
- 流式渲染和延迟水合让页面更早显示和交互。实际项目使用 Nuxt。
- hydrateNode 按 vnode 类型逐个配对 DOM 节点并返回下一个节点。组件走自己的 setup 和 render，再让子树配对。Fragment 靠 `<!--[-->` 和 `<!--]-->` 圈出范围。
- 流式渲染按文档顺序发送，遇到慢的异步组件就等。服务器上的 Suspense 不输出 fallback，也不改变顺序。
- 延迟水合只推迟水合，不推迟下载。useId 的值只取决于组件在树里的位置，所以两端一致。
:::
