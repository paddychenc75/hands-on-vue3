---
title: 自定义渲染器
id: renderer
stage: 6
chapter: 24
desc: createRenderer、渲染到 Canvas
---

<script setup>
import RuntimeCoreAndNodeOps from '../figures/24-renderer/RuntimeCoreAndNodeOps.vue'
import CanvasRenderer from '../labs/24-renderer/CanvasRenderer.vue'
</script>

# 自定义渲染器

::: goals
<Goal checks="sc:0">说明 runtime-core 和 runtime-dom 的分工。</Goal>
<Goal checks="sc:1,sc:2,sc:3,ex:rendererInsert,ex:fbRenderer">用 createRenderer 让 Vue 渲染到非 DOM 的目标。</Goal>

:::

::: rt
阅读主线约 9 分钟。另外留时间做实验台、练习和自测。
:::

::: terms
渲染器
: 把虚拟节点变为目标平台节点的程序。

createRenderer
: 用自己的节点操作创建渲染器的函数。

nodeOps
: 创建、插入和删除节点的一组函数。

runtime-core
: Vue 中与平台无关的部分。
:::

::: why
你想用 Vue 的组件和响应式写一个 Canvas 图表。默认的 Vue 调用 `document.createElement` 创建元素。Canvas 中没有 DOM 元素，所以这些代码不能使用。

原因：默认的渲染器只会操作 DOM。为 Canvas 重写组件系统的成本很高。

本章用 createRenderer 提供自己的节点操作。Vue 的组件、响应式和 diff 都可以复用。
:::

### 24.1 理解 runtime-core 和 runtime-dom

下图显示运行时的两层结构。

<Figure caption="runtime-core 只通过 nodeOps 和 patchProp 操作节点。换一组函数，就换了渲染目标。">
<RuntimeCoreAndNodeOps />
</Figure>

- **runtime-core**：组件、虚拟节点、diff。响应式在 `@vue/reactivity` 包中，runtime-core 使用它。这一层不知道 DOM 的存在。
- **runtime-dom**：提供一组节点操作函数（nodeOps）和属性操作函数（patchProp）。这一层调用 document.createElement 等 DOM API。

runtime-core 只通过 nodeOps 操作节点。所以你可以提供另一组 nodeOps，让 Vue 渲染到 Canvas、终端、PDF 或原生应用。

### 24.2 用 createRenderer 创建渲染器

`createRenderer(options)` 接收 nodeOps 和 patchProp。它返回 render、hydrate 和 createApp。用返回的 createApp 创建应用：

```js
const { createApp } = createRenderer({ createElement, insert, remove, patchProp, /* …… */ })
createApp(Chart).mount(root)   // root 是你的平台上的根节点，例如一个普通对象
```

**场景：把柱状图渲染到一棵对象树，再画到 Canvas。**每个 nodeOps 函数修改这棵树。结构或属性改变后，安排一次重画。

```js
import { createRenderer } from '@vue/runtime-core'

const { createApp } = createRenderer({
  createElement(type) { return { type, props: {}, children: [], parent: null } },
  createText(text)    { return { type: '#text', text, children: [] } },
  createComment(text) { return { type: '#comment', text, children: [] } },
  setText(node, text) { node.text = text },
  setElementText(el, text) { el.children = text ? [{ type: '#text', text, children: [] }] : [] },
  insert(child, parent, anchor) {
    if (child.parent) {                             // 节点已在树中：这是“移动”
      const old = child.parent.children
      old.splice(old.indexOf(child), 1)
    }
    child.parent = parent
    const i = anchor ? parent.children.indexOf(anchor) : -1
    i > -1 ? parent.children.splice(i, 0, child) : parent.children.push(child)
    scheduleDraw()                                  // 结构改变：重新绘制
  },
  remove(child) {
    const p = child.parent
    if (p) p.children.splice(p.children.indexOf(child), 1)
    scheduleDraw()
  },
  patchProp(el, key, prev, next) { el.props[key] = next; scheduleDraw() },
  parentNode(node)  { return node.parent },
  nextSibling(node) { const s = node.parent.children; return s[s.indexOf(node) + 1] || null }
})
// 之后照常写组件：template 中的 <rect>、<label> 由你的 nodeOps 解释
```

实现时注意两点：

1. diff 移动节点时也调用 insert，传入已经在树中的节点。所以 insert 要先把节点从旧位置删除。
2. 属性被删除时，Vue 调用 patchProp，next 为 null。

<Exercise id="rendererInsert" />

<Exercise id="fbRenderer" />

### 24.3 渲染到 Canvas

下面的实验台用上面的方法，把一个 Vue 组件画到 Canvas 上。

<Lab id="demo-renderer" title="实验台：Vue 组件渲染到 Canvas" note="真实的 createRenderer。没有任何 DOM 元素表示这些图形。">
<template #predict>
<Sc predict :a="0">

先猜：柱状图用 createRenderer 渲染到 Canvas。拖动“第 2 根柱子的值”滑块。nodeOps 日志出现哪些调用？

<Opt>只有 patchProp，修改已有节点</Opt>
<Opt>remove，然后 createElement 和 insert</Opt>
<Opt>没有调用，Canvas 直接重画</Opt>

<template #explain>

解析：自定义渲染器和 DOM 版本使用同一个 diff。新旧虚拟节点的类型和 key 相同，所以 Vue 只调用 patchProp，修改 y、h 和 text。添加或删除柱子时，才调用 createElement、insert 或 remove。Canvas 重画由 insert 和 patchProp 触发。打开实验台，拖动滑块，看日志。

</template>
</Sc>
</template>

<CanvasRenderer />
</Lab>

实验台的工作过程如下：

1. 组件模板使用 `<rect>` 和 `<label>` 元素。
2. runtime-core 运行组件，并调用自定义的 nodeOps。
3. nodeOps 修改一棵普通的 JavaScript 对象树。
4. 每次修改后，绘制函数遍历这棵树，在 Canvas 上画出图形。
5. 拖动滑块时，响应式数据改变。组件更新。diff 只调用 patchProp 修改改变的属性。

::: pitfalls
1. 在 insert 中处理“节点已在树中”的情况。原因：Vue 移动节点时只调用 insert，不调用 remove。不处理时，节点在树中出现两次。
2. 在 patchProp 中处理 next 为 null 的情况。原因：属性被删除时，Vue 传入 null。
:::

::: selfcheck
<Sc :a="1">

哪一层调用 `document.createElement`？

<Opt>runtime-core</Opt>
<Opt>runtime-dom</Opt>
<Opt>@vue/reactivity</Opt>

<template #explain>

解析：runtime-core 不知道 DOM。runtime-dom 的 nodeOps 调用 DOM API。

</template>
</Sc>

<Sc :a="0">

组件渲染 `h('rect', { w: w.value })`。`w.value` 从 10 改为 20。更新时，Vue 调用哪个函数？

<Opt>只调用 patchProp</Opt>
<Opt>先调用 remove，再调用 createElement 和 insert</Opt>
<Opt>调用全部 nodeOps 函数</Opt>

<template #explain>

解析：元素类型没有改变。diff 只发现 w 改变，所以只调用一次 `patchProp(el, 'w', 10, 20)`。

</template>
</Sc>

<Sc :a="2">

`createRenderer(options)` 返回什么？

<Opt>一个 DOM 元素</Opt>
<Opt>传入的 nodeOps 对象</Opt>
<Opt>一个包含 render 和 createApp 的对象</Opt>

<template #explain>

解析：它返回 render、hydrate 和 createApp。用返回的 createApp 创建应用。

</template>
</Sc>

<Sc :a="1">

自定义渲染器的 insert 写成下面这样，没有处理“节点已在树中”的情况。带 key 的列表从 a b 变为 b a。之后父节点的 children 是什么？

```js
insert(child, parent, anchor) {
  child.parent = parent
  const i = anchor ? parent.children.indexOf(anchor) : -1
  i > -1 ? parent.children.splice(i, 0, child) : parent.children.push(child)
}
```

<Opt>b a，结果正确</Opt>
<Opt>b a b，b 出现两次</Opt>
<Opt>a b，顺序没有变</Opt>

<template #explain>

解析：移动节点时，Vue 也调用 insert，传入的是已经在树中的节点 b。这段代码没有先从旧位置删除 b。所以 b 在数组中出现两次，Canvas 上也画出两个 b。Vue 移动节点时不调用 remove，所以结果不会自动正确。insert 确实运行了，所以顺序也不是没变。修复：如果 `child.parent` 存在，先从它的 children 中删除 child。

</template>
</Sc>

<Sc :a="2">

回顾（第 16 章）：Canvas 渲染器中有一个带 key 的列表。它从 a b c d 变为 d a b c。更新时，Vue 调用几次 insert？

<Opt>3 次，移动 a、b、c</Opt>
<Opt>4 次，每个节点重新插入</Opt>
<Opt>1 次，只移动 d</Opt>

<template #explain>

解析：第 16 章：Vue 用最长递增子序列找出不需要移动的节点。a b c 的相对顺序不变，所以它们不动。只有 d 移到最前面，insert 只调用 1 次。这次 insert 收到的是已经在树中的节点。所以自定义的 insert 要处理“移动”。

</template>
</Sc>

:::

::: summary
- runtime-core 和平台无关。runtime-dom 是其中一个平台实现。
- createRenderer 接收 nodeOps 和 patchProp，返回 createApp。
- insert 也负责移动节点。patchProp 要处理属性被删除的情况。
- 响应式、组件和 diff 在任何平台上都相同。
:::
