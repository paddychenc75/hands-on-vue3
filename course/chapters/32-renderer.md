---
title: 自定义渲染器
id: renderer
stage: 5
optional: true
chapter: 32
desc: createRenderer、RendererOptions、runtime-dom 的 patchProp
---

<script setup>
import RuntimeCoreAndNodeOps from '../figures/32-renderer/RuntimeCoreAndNodeOps.vue'
import CanvasRenderer from '../labs/32-renderer/CanvasRenderer.vue'
import RendererCalls from '../labs/32-renderer/RendererCalls.vue'
import PatchPropLab from '../labs/32-renderer/PatchPropLab.vue'
</script>

# 自定义渲染器

::: goals
<Goal checks="sc:0">说明 runtime-core 和 runtime-dom 的分工，以及迷你 Vue 的渲染器怎样变成 createRenderer。</Goal>
<Goal checks="sc:1,sc:4,sc:5,sc:6">说明 RendererOptions 里各函数在渲染的哪一步被调用。</Goal>
<Goal checks="sc:2,sc:3,ex:rendererInsert,ex:fbRenderer,ex:stringRenderer">用 createRenderer 让 Vue 渲染到非 DOM 的目标，并写出一个字符串渲染器。</Goal>
<Goal checks="sc:7,sc:8">说明 runtime-dom 的 patchProp 怎样选择 DOM 属性或 attribute，以及换事件处理函数为什么不用重新绑定。</Goal>
<Goal checks="sc:9,sc:10">判断哪些内置功能在自定义渲染器里不能用，以及原因。</Goal>

:::

::: rt
阅读主线约 12 分钟，深入内容约 4 分钟（可选）。另外留时间做实验台、练习和自测。
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

invoker
: runtime-dom 为每个元素的每个事件创建的包装函数。真正的处理函数存在它的 `value` 上。

anchor
: `insert` 的第三个参数。新节点要插在它前面；为 `null` 时放到最后。
:::

::: why
你想用 Vue 的组件和响应式写一个 Canvas 图表。默认的 Vue 调用 `document.createElement` 创建元素。Canvas 里没有 DOM 元素，所以这些代码不能直接用。

原因：默认的渲染器只会操作 DOM。为 Canvas 重写组件系统的成本很高。

本章用 createRenderer 提供自己的节点操作。Vue 的组件、响应式和 diff 都可以复用。写完之后，你会明白 Vue 自己的 DOM 渲染器（runtime-dom）其实也是这样一组节点操作，它的 `patchProp` 里有一些日常会遇到的规则。
:::

### 32.1 同一套 patch，换一组平台操作

第 31 章讲了 `patch` 怎样分发、组件怎样挂载。整个过程只做比较和调度，真正碰到平台的只有几个动作：创建节点、改文字、设属性、插入、移除。Vue 把这几个动作单独拿出来，放在运行时的两层结构里。

<Figure caption="runtime-core 只通过 nodeOps 和 patchProp 操作节点。换一组函数，就换了渲染目标。">
<RuntimeCoreAndNodeOps />
</Figure>

- **runtime-core**：组件、虚拟节点、diff。响应式在 `@vue/reactivity` 包中，runtime-core 使用它。这一层不知道 DOM 的存在。
- **runtime-dom**：一组调用 `document.createElement` 等 DOM API 的函数，加上设置属性的 `patchProp`。

你在第 30、31 章写的迷你 Vue 已经是这个结构。迷你版的渲染器只通过 `hostInsert`、`hostCreateElement`、`hostPatchProp` 这样的函数碰宿主，真实的 `renderer.ts` 里也是这些名字。把这些函数收进一个对象，再把整个渲染器放进一个函数，就是 `createRenderer`：

```js
// 第 30、31 章：宿主操作是脚本顶层的函数，直接调用 document
function hostInsert(child, parent, anchor) { parent.insertBefore(child, anchor) }
function patch(n1, n2, container, anchor) { /* …… */ hostInsert(el, container, anchor) }

// 本章：渲染器整体放进一个函数，宿主操作从 options 里取
function createRenderer(options) {
  const { insert: hostInsert, createElement: hostCreateElement /* …… */ } = options
  function patch(n1, n2, container, anchor) { /* …… */ hostInsert(el, container, anchor) }   // 一行没变
  return { render, createApp }
}
```

渲染器的代码一行没改，只是 `document` 换成了 `options`。DOM 版的 options 由 runtime-dom 提供；换一组 options，同一份 `patch` 就渲染到别的地方。`createRenderer(options)` 返回的 `render` 和 `createApp`，用法和 `vue` 里的相同。

### 32.2 平台要实现什么：RendererOptions

`createRenderer` 的参数类型叫 `RendererOptions`，里面有 10 个必需的函数和 4 个可选的函数。先按动作分组记住必需的 10 个：

| 动作 | 函数 | 做什么 |
|---|---|---|
| 创建 | `createElement(type)`、`createText(text)`、`createComment(text)` | 造出平台节点，还不放进树里 |
| 修改 | `setElementText(el, text)`、`setText(node, text)`、`patchProp(el, key, prev, next)` | 改元素的文字、文本节点的内容、元素的一个属性 |
| 摆放 | `insert(child, parent, anchor)`、`remove(el)`、`parentNode(node)`、`nextSibling(node)` | 放进父节点（挂载和移动都用它）、摘下、查位置 |

每个函数在什么时候被调用，最可靠的办法是看日志。下面的实验台用真实的 `createRenderer` 跑 12 个场景，每个 nodeOps 函数先写日志再做事。

<Lab id="demo-renderer-calls" title="实验台：nodeOps 的调用顺序" note="真实的 createRenderer。每个函数先写日志再做事">
<template #predict>
<Sc predict :a="1">

先猜：挂载 `h('div', null, [h('p', 'x')])`。日志里先出现 `insert(<p>, <div>)`，还是先出现 `insert(<div>, root)`？

<Opt>先 insert(div, root)，p 之后再放进已经在容器里的 div</Opt>
<Opt>先 insert(p, div)，div 最后才放进容器</Opt>
<Opt>两个 insert 同时发生，顺序不固定</Opt>

<template #explain>

解析：`mountElement` 的顺序是：创建元素、处理子节点（子节点先被放进这个还没进入容器的元素）、设置自己的 props、最后才把元素 insert 到容器。这样在真实的 DOM 里，一棵树只发生一次插入。第一项把顺序弄反了：那会让浏览器对每个子节点各做一次布局。打开实验台，选“挂载一棵小树”，看 insert 的顺序。

</template>
</Sc>
</template>

<RendererCalls />
</Lab>

从日志可以读出五条规则：

1. **先子后父，最后插入容器。** 元素挂载的顺序是 `createElement`、子节点（`setElementText` 或逐个 `insert`）、`patchProp`、最后 `insert(el, 容器)`。
2. **只有文字的子节点走 `setElementText`，不走 `createText`。** `h('span', 'hello')` 不会创建文本节点。混排（`[h('b'), 'tail']`）才会 `createText`。你的 nodeOps 必须两种都处理。
3. **更新时先删旧属性，再设新值。** 例子：`class` 被删，然后 `id` 从 `a` 变成 `b`。`next` 为 `null` 的调用就是删除。
4. **卸载只对根调用一次 `remove`。** 一个 `div` 带两个 `span`，卸载时只有 `remove(div)`。子节点跟着根一起消失，不单独 remove。
5. **组件重新渲染时，Vue 先问 `parentNode` 和 `nextSibling`。** 旧子树的根在哪个父节点里、后面跟着谁，决定了新子树 patch 的容器和 anchor。`nextSibling` 在节点是最后一个时要返回 `null`，这个 `null` 会成为 `insert` 的 anchor，意思是“放到最后”。

**最少要写几个？** 只挂载元素和纯文字时，`createElement`、`setElementText`、`patchProp`、`insert` 四个就够（实测）。其余的在遇到对应场景时才被调用：混排子节点要 `createText`，`v-if` 为假要 `createComment`，卸载要 `remove`，组件更新要 `setText`、`parentNode`、`nextSibling`。缺哪个，到那个场景就抛 `hostRemove is not a function` 这样的 TypeError，所以十个都要写。

::: deep RendererOptions 的完整调用时机
必需的函数，补充几个特殊场景：

| 函数 | 补充 |
|---|---|
| `createText` | Fragment 用两个空文本（`createText('')`）当起止锚点 |
| `createComment` | `v-if` 为假的占位；Teleport 用 `teleport start` 和 `teleport end` 两个注释 |
| `setElementText` | 子节点类型变化时，用空字符串清空 |
| `patchProp` | 挂载时每个 prop 一次（`prev` 是 `null`）；更新时每个变化的 prop 一次 |

四个可选的函数：

| 函数 | 什么时候被调用 |
|---|---|
| `setScopeId(el, id)` | 挂载带 scoped 样式的组件的元素。默认是空函数 |
| `insertStaticContent(content, parent, anchor, ...)` | 挂载编译器生成的大块静态内容（第 29 章）。返回 `[第一个节点, 最后一个节点]`。没有默认实现，缺失时抛 `TypeError`（实测） |
| `querySelector(selector)` | 只有 Teleport 的字符串目标（`to="#modal"`）用。缺失时警告 `Current renderer does not support string target for Teleports`；`to` 传节点对象则不需要（实测） |
| `cloneNode(node)` | 类型里声明了，但 3.5.43 里没有任何调用，runtime-dom 的 nodeOps 也没有它 |

最后一行的验证方法：用 `Proxy` 包住传给 `createRenderer` 的对象，记录被读取的成员名。跑完挂载、更新、列表、Fragment、scoped、静态内容和 Teleport 这些场景后，被读取的成员里没有 `cloneNode`。读源码时，类型声明不等于运行行为。
:::

### 32.3 写一个自定义渲染器

下面把一棵普通的对象树当作渲染目标。每个函数修改这棵树；结构或属性改变后，安排一次重画。

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
createApp(Chart).mount(root)   // root 是你的平台上的根节点，这里是一个普通对象
// 之后照常写组件：template 里的 <rect>、<label> 由你的 nodeOps 解释
```

实现时注意两点：

1. diff 移动节点时也调用 `insert`，传入已经在树中的节点。所以 `insert` 要先把节点从旧位置删除。
2. 属性被删除时，Vue 调用 `patchProp`，`next` 为 `null`。

<Exercise id="rendererInsert" />

<Exercise id="fbRenderer" />

下面的实验台用同样的方法，把一个 Vue 组件画到 Canvas 上。组件模板里的 `<rect>`、`<label>` 不是 DOM 元素，只是对象树里的节点，每次修改后，绘制函数遍历这棵树画出图形。

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

最后写一个“字符串渲染器”：options 操作普通对象树，最后序列化成 HTML。它走的路径和 `renderToString`（第 36 章）完全不同，输出却可以一致。这道题的渲染器本体就是你在第 30、31 章写的那一份，已经折叠在脚本最上面，放进了 `createRenderer`。你只写字符串版的 options 和序列化。

<Exercise id="stringRenderer" />

::: deep 字符串渲染器和 renderToString 的差别
两条路径的结果有一处不同：Fragment。渲染器用两个空文本节点当锚点，序列化出来是空字符串。`renderToString` 为了让浏览器水合时能配对，输出 `<!--[-->` 和 `<!--]-->`：

```js
const F = { render: () => h('ul', [h(Fragment, [h('li', 1), h('li', 2)])]) }
// 字符串渲染器：<ul><li>1</li><li>2</li></ul>
// renderToString：<ul><!--[--><li>1</li><li>2</li><!--]--></ul>
```
:::

### 32.4 runtime-dom：Vue 自带的那组平台操作

`vue` 里的 `createApp` 用的就是 `createRenderer({ patchProp, ...nodeOps })`，其中 `nodeOps` 是调用 DOM API 的 10 多个函数。它们大多一两行。真正有规则的是 `patchProp`：runtime-core 把“这个 key 怎么设”整个交给它。它是一棵决策树：

```js
// runtime-dom/patchProp.ts（简化）
function patchProp(el, key, prev, next, namespace) {
  if (key === 'class') patchClass(el, next)                     // 1. class 专用
  else if (key === 'style') patchStyle(el, prev, next)          // 2. style 专用
  else if (isOn(key)) patchEvent(el, key, prev, next)           // 3. onXxx：事件
  else if (
    key[0] === '.' ? (key = key.slice(1), true) :               // 4. .prop 修饰符：强制设 DOM 属性
    key[0] === '^' ? (key = key.slice(1), false) :              //    .attr 修饰符：强制设 attribute
    shouldSetAsProp(el, key, next, namespace === 'svg')         // 5. 其余由规则判断
  ) patchDOMProp(el, key, next)                                 // 设为 DOM 属性：el[key] = next
  else patchAttr(el, key, next)                                 // 设为 attribute：setAttribute
}
```

`vue` 把 `patchProp` 导出了，所以后面的实验台能直接调用真实的函数。

**class 和 style。** 普通元素的 class 直接赋值 `el.className`；SVG 元素的 `className` 是只读对象，所以 SVG 用 `setAttribute('class', …)`。style 是对象时，先把 `prev` 里有、`next` 里没有的键清空，再逐个设置；是字符串时，整段赋给 `style.cssText`。

**事件和 invoker。** runtime-dom 为每个 `(元素, 事件)` 创建一个包装函数，叫 invoker，真正的处理函数存在它的 `value` 上。浏览器那一侧的监听函数永远是同一个，换处理函数只改 `value`：

```js
// runtime-dom/modules/events.ts（简化）
function patchEvent(el, rawName, prev, next) {
  const invokers = el._vei || (el._vei = {})          // vei：Vue event invokers
  const existing = invokers[rawName]
  if (next && existing) {
    existing.value = next                             // 换处理函数：只改 value
  } else if (next) {
    const invoker = invokers[rawName] = createInvoker(next)
    el.addEventListener(name, invoker, options)       // 第一次：才真的绑定
  } else if (existing) {
    el.removeEventListener(name, existing, options)   // 处理函数没了：解绑
    invokers[rawName] = undefined
  }
}
```

为什么这样设计？组件每次渲染都会创建新的内联箭头函数（`@click="() => n++"`），每次都解绑再绑定成本很高。实测：同一个按钮的 `onClick` 在三次渲染里换了三个不同的函数，`addEventListener` 只被调用一次，三次点击依次执行 A、B、A。迷你版的 `hostPatchProp` 没有 invoker，换处理函数要先移除再添加。

**设为 DOM 属性，还是 attribute？** 第 5 步的默认规则是 `key in el`：元素上有这个属性，就设为 DOM 属性，否则设为 attribute。少数 key 例外，即使 `in el` 也强制设为 attribute，比如 `<input>` 的 `list` 和 `form`（只读），以及 `<img>` 的 `width` 和 `height`。为什么 `<img>` 的 `width` 要走 attribute？DOM 属性 `img.width` 是整数，`img.width = '50%'` 读回来是 `0`（实测）。attribute 才能写百分比。

下面是用真实 `patchProp` 实测的结果（Vue 3.5.43，浏览器），挑的是日常最容易碰到的：

| 元素 | key | 走的路 | 原因 |
|---|---|---|---|
| `div` | `id`、`title`、`hidden` | DOM 属性 | `key in el` |
| `div` | `aria-label`、`data-id` | attribute | 元素上没有这个属性 |
| `div` | `tabindex` | attribute | DOM 属性叫 `tabIndex`，`in` 区分大小写 |
| `div` | `tabIndex` | DOM 属性 | `key in el` |
| `input` | `value`、`checked` | DOM 属性，再同步到 attribute | 见深入块 |
| `input` | `list`、`form` | attribute | 例外：只读属性 |
| `img` | `width`、`height` | attribute | 例外：要写百分比 |

`tabindex` 这一行值得记住：模板里写 `:tabindex="1"`（小写）是 attribute，写 `:tabIndex="1"` 才是 DOM 属性。两者效果通常相同，但读回来的方式不同。

默认规则判断错了，或者你想强制时，用 `v-bind` 的修饰符：编译器把 `:foo.prop="x"` 的 key 改成 `.foo`，把 `:title.attr="x"` 改成 `^title`，决策树的第 4 步据此直接选路。典型用法：给自定义元素的 DOM 属性传对象，用 `.prop`。

<Lab id="demo-patchprop" title="实验台：patchProp 怎样选路" note="直接调用 vue 导出的真实 patchProp">
<template #predict>
<Sc predict :a="2">

先猜：对一个 `<img>` 调用 `patchProp(img, 'width', null, '50%')`。会发生什么？

<Opt>设为 DOM 属性 `img.width = '50%'`，读回来是 50</Opt>
<Opt>设为 DOM 属性，读回来是 0，百分比被丢掉了</Opt>
<Opt>设为 attribute：`<img width="50%">`</Opt>

<template #explain>

解析：`shouldSetAsProp` 对 `<img>`、`<video>`、`<canvas>`、`<source>` 的 `width` 和 `height` 返回 `false`，所以走 `patchAttr`，得到 `<img width="50%">`。如果设为 DOM 属性，`img.width` 是整数，`'50%'` 会变成 0，这是第二项描述的结果，Vue 就是为了避免它。第一项假设了一种不存在的转换。打开实验台，点“img width”，再对照“div tabindex”和“div tabIndex”。

</template>
</Sc>
</template>

<PatchPropLab />
</Lab>

::: deep patchProp 的更多细节
**事件 invoker 的时间戳。** invoker 还做一件事：不让一个刚绑定的监听响应更早发生的事件。子元素的点击处理函数改了状态，Vue 在这次点击还没冒泡完时就更新了 DOM，给祖先新绑定了一个点击监听。浏览器的规则是：冒泡过程中新加到后面目标上的监听，会被这次事件触发。Vue 不想这样，所以事件第一次被某个 invoker 看到时，会在事件上打一个时间戳；之后轮到的 invoker 如果是在这个时间点之后才绑定的，就跳过。实测：子元素的处理函数在微任务里给祖先绑定点击监听，然后点击一次。

| 做法 | 祖先的监听在同一次点击里被触发 |
|---|---|
| 原生 `addEventListener` | 1 次 |
| Vue 的 `onClick`（invoker） | 0 次（第二次点击才触发） |

**例外名单的其余部分。** 强制设为 attribute 的还有 `spellcheck`、`draggable`、`translate`、`autocorrect`，`<textarea>` 的 `type`，`<iframe>` 的 `sandbox`，`<video>`、`<canvas>`、`<source>` 的 `width` 和 `height`。key 是 `onclick` 这样的小写原生事件名而值是字符串时，也设为 attribute。SVG 元素只有 `innerHTML`、`textContent`，以及值为函数的小写原生事件名（如 `onclick`）设为属性，其他都是 attribute。

**`value`、`checked`、`selected`。** 它们设为 DOM 属性，之后 Vue 再把值同步到 attribute（实测：`value="abc"`，`checked=""`）。`value` 设置前先转成字符串，`null` 变成空字符串（复选框是 `'on'`），并把原值存在 `el._value` 里，`v-model` 用它读回对象。

**布尔属性和空值。** `patchDOMProp` 对 `''` 和 `null` 做类型修正：目标属性是布尔时，`''` 变成 `true`（`<button :disabled="''">` 等于 `<button disabled>`）；目标是字符串，`null` 变成 `''` 并移除 attribute；目标是数字，`null` 变成 `0` 并移除 attribute。
:::

### 32.5 哪些内置功能在自定义渲染器里不能用

把 Vue 渲染到自己的目标之前，要先知道哪些功能依赖 DOM。判断方法：看它在 runtime-core 里，还是在 runtime-dom 里。

| 功能 | 在自定义渲染器里 | 原因 |
|---|---|---|
| 组件、`v-if`、`v-for`、插槽、`provide`/`inject`、响应式 | 能用 | 都不直接调用 DOM |
| `KeepAlive` | 能用 | 用 `createElement('div')` 造存放容器，用 `insert` 移动（实测能挂载） |
| `Suspense`、`defineAsyncComponent` | 能用 | 在 runtime-core 里，只经过 `RendererOptions` |
| `Teleport` | 要提供 `querySelector`，或直接传节点对象 | 字符串目标需要把选择器变成节点 |
| `v-show` | 挂载时抛错 | 它改 `el.style.display`，对象树节点没有 `style`（实测 `TypeError`） |
| `v-model`（表单元素上的版本） | 挂载时抛错 | 它读 `el.value`、监听 `input` 事件（实测 `TypeError`） |
| `Transition`、`TransitionGroup` | 挂载不报错，真正过渡时才抛错 | 过渡要用 `classList`、`getComputedStyle`、`transitionend`（实测进入和离开时抛 `TypeError`） |

最后一行容易漏：只挂载一个 `Transition` 不会出错，等条件切换、触发进入或离开时才抛错。runtime-core 里的 `BaseTransition` 是 `Transition` 中与平台无关的部分，给自定义渲染器做动画，从它开始（第 33 章）。

另外，`createRenderer` 返回的对象里有 `hydrate` 键，但值是 `undefined`。需要水合时用 `createHydrationRenderer`（第 36 章），这样只做客户端渲染的应用不带水合的代码。

::: deep runtime-dom 的 createApp 比 runtime-core 多做了什么
`createRenderer(options).createApp` 创建的应用很“裸”：`app.mount(root)` 直接把你给的对象当容器。`vue` 里的 `createApp` 是 runtime-dom 包的一层：

```js
// runtime-dom/index.ts（简化）
const createApp = (...args) => {
  const app = ensureRenderer().createApp(...args)       // 1. 惰性创建 DOM 渲染器
  const { mount } = app
  app.mount = containerOrSelector => {
    const container = normalizeContainer(containerOrSelector)   // 2. 接受选择器字符串
    if (!container) return
    const component = app._component
    if (!isFunction(component) && !component.render && !component.template) {
      component.template = container.innerHTML          // 3. 没有模板，就用容器里的 HTML
    }
    if (container.nodeType === 1) container.textContent = ''    // 4. 挂载前清空容器
    const proxy = mount(container, false, resolveRootNamespace(container))  // 5. 推断 svg / MathML
    container.removeAttribute('v-cloak')                // 6. 去掉 v-cloak，加上 data-v-app
    container.setAttribute('data-v-app', '')
    return proxy
  }
  return app
}
```

1. **惰性创建渲染器。** 第一次调用时才执行 `createRenderer({ patchProp, ...nodeOps })`，所以只引入响应式 API 的代码不会带上整个渲染器。
2. **选择器字符串。** 对字符串调用 `document.querySelector`，找不到就警告 `Failed to mount app: mount target selector "…" returned null`。
3. **从 `innerHTML` 取模板。** 实测：容器里是 `<p>{{ msg }}</p>`，根组件只有 `data`，挂载后页面显示 `msg` 的值。这是用 CDN 直接写页面时的用法（需要带编译器的构建）。
4. **挂载前清空容器。** 实测：容器里有 `<i>old</i>`，根组件用渲染函数，挂载后只剩渲染出的内容。
5. **推断命名空间。** 容器是 SVG 或 MathML 元素时，整棵树按这个命名空间创建。
6. **去掉 `v-cloak`，加上 `data-v-app`。** 挂载完成后，`v-cloak` 用来隐藏未编译模板的样式就该失效。

`createSSRApp` 在同一个文件里，区别是用水合渲染器，并且 `mount(container, true)`：**不清空容器**，因为要复用里面的 DOM。

**createRenderer 和 createHydrationRenderer。**

```js
const a = createRenderer(options)
Object.keys(a)                 // ['render', 'hydrate', 'createApp']
a.hydrate                      // undefined

const b = createHydrationRenderer(options)
typeof b.hydrate               // 'function'
```

自定义渲染器想支持水合时，还要注意：水合的代码直接读 `node.nodeType`、`node.data`、`node.tagName` 和 `nextSibling`，它假设宿主节点长得像 DOM 节点。所以水合只对类 DOM 的目标有意义。
:::

::: pitfalls
1. 在 insert 中处理“节点已在树中”的情况。原因：Vue 移动节点时只调用 insert，不调用 remove。不处理时，节点在树中出现两次。
2. 在 patchProp 中处理 next 为 null 的情况。原因：属性被删除时，Vue 传入 null。
3. 不要把 `v-show`、表单上的 `v-model`、`Transition` 带进自定义渲染器。原因：它们属于 runtime-dom，直接操作 DOM。
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

解析：它返回 render 和 createApp。用返回的 createApp 创建应用。返回对象里的 hydrate 键是 undefined，只有 createHydrationRenderer 才提供真正的 hydrate 函数。

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

回顾（第 30 章）：Canvas 渲染器中有一个带 key 的列表。它从 a b c d 变为 d a b c。更新时，Vue 调用几次 insert？

<Opt>3 次，移动 a、b、c</Opt>
<Opt>4 次，每个节点重新插入</Opt>
<Opt>1 次，只移动 d</Opt>

<template #explain>

解析：第 30 章：Vue 用最长递增子序列找出不需要移动的节点。a b c 的相对顺序不变，所以它们不动。只有 d 移到最前面，insert 只调用 1 次。这次 insert 收到的是已经在树中的节点。所以自定义的 insert 要处理“移动”。

</template>
</Sc>

<Sc :a="0">

用自定义渲染器挂载一个 `div`，里面有 3 个 `span`，然后调用 `render(null, root)` 卸载。nodeOps 的 `remove` 被调用几次？

<Opt>1 次，只对 div</Opt>
<Opt>3 次，对每个 span</Opt>
<Opt>4 次，每个元素各一次</Opt>

<template #explain>

解析：卸载只对被卸载子树的根调用 `remove`。子节点跟着根一起离开，不单独 remove。第二项和第三项假设了 DOM 里“先删子节点再删父节点”的习惯，但渲染器把这件事留给了宿主：你的 `remove(div)` 把整棵子树从树里摘下来就够了。

</template>
</Sc>

<Sc :a="2">

自定义渲染器的 options 没有 `querySelector`。下面哪段渲染会产生警告？

<Opt>`h(Teleport, { to: targetNode }, children)`，`targetNode` 是自己创建的节点对象</Opt>
<Opt>`h(KeepAlive, null, { default: () => h(Comp) })`</Opt>
<Opt>`h(Teleport, { to: '#modal' }, children)`</Opt>

<template #explain>

解析：字符串目标需要 `querySelector` 把选择器变成节点，没有它就警告 `Current renderer does not support string target for Teleports`。直接传节点对象不需要它。KeepAlive 用 `createElement('div')` 造存放失活组件的容器，只依赖必需的函数。最迷惑的是第一项：它也是 Teleport，但目标已经是节点，不需要解析。

</template>
</Sc>

<Sc :a="1">

一个按钮的 `onClick` 在三次渲染里分别是三个新建的箭头函数。runtime-dom 一共调用几次 `addEventListener('click', …)`？

<Opt>3 次，每次渲染都重新绑定</Opt>
<Opt>1 次，之后只更新 invoker 的 value</Opt>
<Opt>3 次 add 加 2 次 remove，旧的先解绑</Opt>

<template #explain>

解析：`patchEvent` 第一次为 `(元素, 事件)` 创建 invoker 并绑定。以后遇到新的处理函数，只执行 `invoker.value = 新函数`，浏览器那一侧的监听函数不变。第三项描述的是手写 DOM 代码常见的做法：先 remove 再 add，这正是 invoker 要避免的成本。

</template>
</Sc>

<Sc :a="1">

模板里写 `<div :tabindex="1">`。runtime-dom 的 `patchProp` 怎样处理它？

<Opt>设为 DOM 属性：`div.tabindex = 1`</Opt>
<Opt>设为 attribute：`setAttribute('tabindex', 1)`</Opt>
<Opt>Vue 先把 key 转成 `tabIndex`，再设为 DOM 属性</Opt>

<template #explain>

解析：默认规则是 `key in el`。DOM 属性叫 `tabIndex`，`'tabindex' in div` 为 `false`（`in` 区分大小写），所以走 `patchAttr`，得到 `tabindex="1"` attribute。写成 `:tabIndex="1"` 才会设为 DOM 属性。第三项是最迷惑的：Vue 不会替你转换大小写。

</template>
</Sc>

<Sc :a="0">

在 `createRenderer` 渲染器（options 里的节点是普通对象）里，一个组件渲染了 `withDirectives(h('div'), [[vShow, true]])`，其中 `vShow` 是 `vue` 导出的。挂载时会怎样？

<Opt>抛 TypeError，因为 `v-show` 要读写 `el.style.display`，对象节点没有 `style`</Opt>
<Opt>正常挂载，`v-show` 只是被当作普通属性忽略</Opt>
<Opt>正常挂载，Vue 自动调用 `patchProp(el, 'display', …)`</Opt>

<template #explain>

解析：`v-show` 是 runtime-dom 里的指令，挂载钩子直接改 `el.style.display`。自定义渲染器的节点没有 `style`，读 `display` 时抛 `TypeError`。Vue 不会把指令翻译成 `patchProp` 调用。表单元素上的 `v-model` 同理。

</template>
</Sc>

<Sc :a="2">

第 30、31 章的迷你 Vue 要变成 `createRenderer(options)`，渲染器本体（`patch`、`mountElement`、`mountComponent` 等）需要怎样改？

<Opt>把每个 `document.createElement` 换成对 options 的调用，逐处重写</Opt>
<Opt>补上一套新的 diff，因为 DOM 版的 diff 依赖 DOM 的顺序</Opt>
<Opt>基本不用改：渲染器本来只调用 `hostInsert` 这样的函数，把它们改成从 options 取出就行</Opt>

<template #explain>

解析：迷你版的渲染器从一开始就只通过 `hostInsert`、`hostCreateElement`、`hostPatchProp` 这样的函数碰宿主，没有直接写 `document`。所以 `createRenderer` 只是把渲染器整体放进函数，头部从 `options` 解构出这些名字，里面的代码一行没改。第一项是没有预先抽象宿主操作的代码才需要做的事。

</template>
</Sc>

:::

::: summary
- runtime-core 和平台无关，只通过 RendererOptions 里的函数碰平台。runtime-dom 是其中一个平台实现。
- 迷你 Vue 的渲染器只调用 `hostInsert` 这样的函数，整体放进 `createRenderer(options)` 就成了通用渲染器，代码一行不用改。
- RendererOptions 有 10 个必需的函数和 4 个可选的函数。元素挂载的顺序是先子后父，最后 insert 到容器。卸载只对根调用一次 remove。
- insert 也负责移动节点。patchProp 要处理属性被删除的情况。响应式、组件和 diff 在任何平台上都相同。
- runtime-dom 的 patchProp 先看 class、style、事件，再看 `.prop` 和 `.attr`，最后用 `key in el` 和一张例外名单决定设为 DOM 属性还是 attribute。
- 事件靠 invoker 缓存：换处理函数只改 value，不重新绑定。
- 依赖 DOM 的功能（`v-show`、表单上的 `v-model`、`Transition`）在自定义渲染器里不能用；`createRenderer` 返回的 hydrate 是 undefined，水合要用 `createHydrationRenderer`。
:::
