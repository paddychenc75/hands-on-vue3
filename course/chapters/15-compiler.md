---
title: 模板编译
id: compiler
stage: 3
chapter: 15
desc: 渲染函数、PatchFlags、Block Tree
---

<script setup>
import PatchFlagsPipeline from '../figures/15-compiler/PatchFlagsPipeline.vue'
import BlockDynamicChildren from '../figures/15-compiler/BlockDynamicChildren.vue'
import OnlineCompile from '../labs/15-compiler/OnlineCompile.vue'
import BlockTree from '../labs/15-compiler/BlockTree.vue'
</script>

# 模板编译

::: goals
<Goal checks="sc:3">说明模板变成 DOM 的步骤。</Goal>
<Goal checks="sc:0,ex:patchFlagFix,ex:flagBitFill">读懂编译结果中的 PatchFlag。</Goal>
<Goal checks="sc:1,sc:2">说明 Vue3 更新比 Vue2 快的编译原因。</Goal>

:::

::: rt
阅读主线约 11 分钟，深入内容约 2 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
编译器像一个**提前做笔记的考官**：考试前先把答案会变的空圈出来，批改时只看圈出来的地方。
:::

::: terms
模板编译
: 把模板转换为渲染函数。

PatchFlags
: 编译器写在节点上的数字。它说明节点哪些部分会变。

Block
: 一个节点。它记住自己下面哪些节点会变。

静态缓存
: 不会变的节点只创建一次，以后每次更新都复用。
:::

::: why
你用 h() 手写了一个大表单。修改一个文字后，Vue 比较了所有节点。同样的模板版本，更新快得多。

原因：编译器分析模板，知道哪些部分会变。它把这些信息写进生成的渲染函数。手写的 h() 没有这些信息。

本章查看编译结果，学习 PatchFlags、Block 和静态缓存。
:::

### 15.1 模板变成 DOM 的五个步骤

模板按下面的步骤变成 DOM：

1. parse：编译器把模板字符串转换为模板 AST。
2. transform：编译器分析 AST，并添加优化信息。
3. generate：编译器生成渲染函数。
4. 运行时调用渲染函数，得到虚拟节点树。
5. patch：运行时比较新旧虚拟节点，并更新 DOM。

下图说明编译时和运行时的分工。

<Figure caption="transform 在编译时添加 PatchFlags。运行时的 patch 读取这些标记，跳过不会改变的部分。">
<PatchFlagsPipeline />
</Figure>

用 Vite 构建时，前三步在构建时完成。浏览器只运行后两步。所以默认的 `vue` 包是运行时版本，不包含编译器。

**场景：组件的模板是一个字符串，例如 `template: '<div>{{ msg }}</div>'`。**运行时版本不能编译它。开发环境发出警告，组件不显示。在 vite.config 中把 vue 指向完整版本：

```js
// vite.config.js
export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { vue: 'vue/dist/vue.esm-bundler.js' } }   // 包含编译器，体积更大
})
```

只在确实需要在浏览器中编译模板时这样做。SFC 中的 `<template>` 不需要它。

transform 这一步加入三类优化信息：PatchFlags、Block Tree 和缓存。下面三节分别说明。

### 15.2 PatchFlags：标记节点的动态部分

编译器给动态节点加一个数字标记。例如 `1` 表示只有文字会改变。更新时，Vue 只比较文字，不比较其他属性。

按下面的步骤找到 PatchFlag：

1. 找到 `_createElementVNode(...)` 调用。
2. 读取 createElementVNode 的第 4 个参数。这个数字是 PatchFlag。第 5 个参数是 dynamicProps。
3. 在下表中查找这个数字。

| PatchFlag | 值 | 意思 |
|---|---|---|
| `TEXT` | 1 | 文字是动态的 |
| `CLASS` | 2 | class 是动态的 |
| `STYLE` | 4 | style 是动态的 |
| `PROPS` | 8 | 其他属性是动态的。属性名在 dynamicProps 中。 |
| `FULL_PROPS` | 16 | 属性名是动态的。需要比较所有属性。 |
| `NEED_HYDRATION` | 32 | 服务端渲染时需要添加事件监听 |
| `STABLE_FRAGMENT` | 64 | 子节点的顺序不改变 |
| `KEYED_FRAGMENT` | 128 | 有 key 的 v-for |
| `UNKEYED_FRAGMENT` | 256 | 没有 key 的 v-for |
| `NEED_PATCH` | 512 | 有 ref 或指令。需要 patch。 |
| `DYNAMIC_SLOTS` | 1024 | 插槽是动态的 |
| `CACHED / BAIL` | -1 / -2 | 已缓存的静态节点 / 不使用优化 |

多个标记用按位或组合。例如 `3` = TEXT | CLASS。运行时用 `patchFlag & PatchFlags.CLASS` 检查 class。

<Lab id="demo-compile" title="实验台：在线编译" note="调用真实的 Vue.compile()。你可以修改模板。浏览器中的编译结果使用 with 模式，不缓存事件，和 SFC 的结果有差别。">
<template #predict>
<Sc predict :a="1">

先猜：编译这个模板。div 的 patchFlag 是多少？

```html
<div :class="{ active: on }" :title="tip" id="box">
  <span>hello</span>
</div>
```

<Opt>16（FULL_PROPS），完整比较全部属性</Opt>
<Opt>10（CLASS | PROPS）</Opt>
<Opt>8（PROPS），class 也算普通属性</Opt>

<template #explain>

解析：编译器为每类动态绑定设置一个标记。:class 对应 CLASS（2），:title 对应 PROPS（8），合计 10。编译器还把动态属性名 ["title"] 单独保存，所以更新时不比较静态的 id。FULL_PROPS 只用于键名不确定的绑定，例如 v-bind="obj"。class 有专门的标记，因为它最常变化。打开实验台，在“示例”中选择“动态 class + 属性”，看 patchFlag 一行。

</template>
</Sc>
</template>

<OnlineCompile />
</Lab>

::: deep patchElement 怎样使用 PatchFlag
```js
// runtime-core/renderer.ts（简化）
function patchElement(n1, n2) {
  const el = (n2.el = n1.el)
  const { patchFlag, dynamicChildren } = n2

  if (dynamicChildren) patchBlockChildren(n1.dynamicChildren, dynamicChildren)  // 只比较动态后代
  else fullDiffChildren(n1, n2)                                                    // 没有优化信息（手写 h()）：全量比较子节点

  if (patchFlag > 0) {
    if (patchFlag & PatchFlags.FULL_PROPS) patchProps(el, n1.props, n2.props)   // 比较所有属性
    else {
      if (patchFlag & PatchFlags.CLASS && n1.props.class !== n2.props.class) setClass(el, n2.props.class)
      if (patchFlag & PatchFlags.STYLE) patchStyle(el, n1.props.style, n2.props.style)
      if (patchFlag & PatchFlags.PROPS)
        for (const key of n2.dynamicProps) patchProp(el, key, n1.props[key], n2.props[key])  // 只比较列出的属性
    }
    if (patchFlag & PatchFlags.TEXT && n1.children !== n2.children) setElementText(el, n2.children)
  } else if (!dynamicChildren) {
    patchProps(el, n1.props, n2.props)                                               // 没有编译信息（手写 h()）：比较所有属性
  }
}
```

真实代码的条件还多检查一个 `optimized` 参数。它在 Block 更新时为 true，这里省略。
:::

下面两道练习在迷你版 patchElement 中用按位与检查标记。

<Exercise id="flagBitFill" />

<Exercise id="patchFlagFix" />

### 15.3 Block Tree：只比较动态节点

`openBlock()` 把一个新数组压入栈顶。之后每创建一个 vnode，如果它的 patchFlag 大于 0，或者它是组件，就把自己推进这个数组。`createElementBlock` 创建 Block 节点时，把这个数组取下来，作为它的 `dynamicChildren`。

所以 `dynamicChildren` 里有三类节点：

- 带 PatchFlag 的元素。
- 所有组件。组件 vnode 没有 PatchFlag，也一定被收集。父组件更新时，Vue 对每个子组件都会比较一次新旧 props，再决定要不要更新它（第 21 章）。
- 嵌套的子 Block，例如 `v-if` 的分支和 `v-for` 的 Fragment。子 Block 内部的节点在它自己的 `dynamicChildren` 里，不平铺到外层。

更新时，Vue 只比较 `dynamicChildren`，不遍历整棵树。下图显示一个 Block 怎样收集动态节点。

<Figure caption="Block 把自己范围内的动态节点平铺到 dynamicChildren。更新时，Vue 只比较 p 的文字和 li 的 class，跳过静态节点和中间层级。">
<BlockDynamicChildren />
</Figure>

结构可能改变的地方必须创建新的 Block：

- `v-if` 的每个分支是一个 Block。编译器给每个分支不同的 key。分支切换时，isSameVNodeType 返回 false。Vue 卸载旧分支，并挂载新分支。
- `v-for` 的 Fragment 是一个 Block。列表项的数量会改变，所以 Vue 用 diff 比较列表项（第 16 章）。

下面的实验台挂载一个真实的组件，然后读取 `vm.$.subTree`，显示 Block 树。

<Lab id="demo-block" title="实验台：Block 树查看器" note="读取真实组件实例的 subTree">
<template #predict>
<Sc predict :a="2">

先猜：根 div 是一个 Block。它的 dynamicChildren 保存几个节点？

```html
<div>
  <h1>静态标题</h1>
  <p>{{ msg }}</p>
  <section>
    <span>静态</span>
    <em :class="cls">动态 class</em>
  </section>
</div>
```

<Opt>5 个，所有后代元素</Opt>
<Opt>1 个，\<section></Opt>
<Opt>2 个，\<p> 和 \<em></Opt>

<template #explain>

解析：Block 收集所有带 patchFlag 的后代，不管层级多深。所以 \<em> 直接进入根 Block 的 dynamicChildren，静态的 \<section> 不进入。这叫树结构打平。更新时，Vue 只比较这 2 个节点。第一项把静态节点也算进去了。第二项以为只收集直接子节点。打开实验台，看右边“dynamicChildren”一栏。

</template>
</Sc>
</template>

<BlockTree />
</Lab>

### 15.4 静态缓存和事件缓存

静态节点不会改变。编译器把它保存在 `_cache` 中。第一次渲染时创建，以后每次渲染都复用。下面是 Vue 3.5 的真实编译结果（@vue/compiler-sfc 3.5.43）：

```js
// 模板：<div><h1>标题</h1><p>{{ msg }}</p></div>
return (_openBlock(), _createElementBlock("div", null, [
  _cache[0] || (_cache[0] = _createElementVNode("h1", null, "标题", -1 /* CACHED */)),
  _createElementVNode("p", null, _toDisplayString(msg), 1 /* TEXT */)
]))
```

注释中的名字随补丁版本变化。较早的 3.5 版本（例如 3.5.13）写 `-1 /* HOISTED */`，新版本写 `-1 /* CACHED */`。两者的数值都是 -1，含义相同：这个节点已经缓存，比较时跳过。实验台中看到哪一个名字，取决于它加载的 Vue 版本。

事件缓存的方法相同。SFC 编译时，内联的事件处理函数也保存在 `_cache` 中。

**场景：父组件写 `<Counter @inc="count++" />`。**没有缓存时，每次渲染都创建新的箭头函数。`onInc` 因此成为动态 prop，父组件每次更新都要比较它。比较的结果取决于 Counter 有没有声明这个事件：

- Counter 用 `emits` 或 `defineEmits` 声明了 `inc`：Vue 跳过已声明事件的比较，Counter 不更新。
- Counter 没有声明 `inc`：`onInc` 按普通属性比较。新函数和旧函数不同，Counter 跟着更新。

缓存后，每次都是同一个函数，`onInc` 不再是动态 prop。编译器省掉了函数的创建和这次比较。这也是"在 emits 中声明所有事件"的另一个理由：没有事件缓存时（例如手写渲染函数），声明了的事件也不会让子组件多更新。

只有 SFC 编译（Vite）启用事件缓存。15.2 实验台中的 `Vue.compile` 不缓存事件。

::: think 手写渲染函数或 JSX 为什么没有这些优化？
PatchFlags 和 Block Tree 由编译器分析模板后生成。手写渲染函数时，Vue 不知道哪些部分是静态的。所以 Vue 比较所有节点。因此 Vue 推荐使用模板。
:::

::: pitfalls
1. 不要用浏览器中 `Vue.compile` 的结果判断 SFC 的输出。原因：它使用 with 模式，也不缓存事件。
2. `v-bind="obj"` 和逐个绑定的更新代价不同。原因：键名不确定，节点得到 FULL_PROPS，Vue 比较所有属性。属性固定时，逐个绑定。
:::

::: selfcheck
<Sc :a="1">

模板 `<p :class="c">{{ msg }}</p>` 的 PatchFlag 是多少？

<Opt>1</Opt>
<Opt>3</Opt>
<Opt>8</Opt>
<Opt>16</Opt>

<template #explain>

解析：文字是动态的，TEXT = 1。class 是动态的，CLASS = 2。两个标记按位或组合，1 | 2 = 3。8 是 PROPS，用于 class 和 style 以外的属性。

</template>
</Sc>

<Sc :a="0">

根元素是一个 Block。它的 `dynamicChildren` 有几个节点？

```html
<div><span>static</span><p>{{ msg }}</p></div>
```

<Opt>1 个：p</Opt>
<Opt>2 个：span 和 p</Opt>
<Opt>0 个</Opt>

<template #explain>

解析：dynamicChildren 只收集带 PatchFlag 的动态节点。span 是静态的，不收集。p 的文字是动态的，标记为 TEXT。

</template>
</Sc>

<Sc :a="2">

同样的结构写成 h()，为什么更新通常更慢？

<Opt>h() 每次都重新创建真实 DOM</Opt>
<Opt>h() 不能使用响应式数据</Opt>
<Opt>h() 没有 PatchFlags 和 Block，Vue 要比较所有节点和属性</Opt>

<template #explain>

解析：PatchFlags 和 Block 由编译器分析模板后生成。手写 h() 时，Vue 不知道哪些部分是静态的。h() 仍然复用 DOM，也可以读取响应式数据。

</template>
</Sc>

<Sc :a="0">

用 Vite 构建的项目在浏览器中运行。模板变成 DOM 的步骤中，浏览器执行哪几步？

<Opt>调用渲染函数和 patch</Opt>
<Opt>全部步骤，从 parse 开始</Opt>
<Opt>只有 generate 和 patch</Opt>

<template #explain>

解析：构建时，Vite 已经完成 parse、transform 和 generate。它输出渲染函数。浏览器只调用渲染函数得到虚拟节点，再 patch 到 DOM。所以浏览器不从 parse 开始，也不运行 generate。所以生产包可以使用不含编译器的运行时版本。只有在浏览器中编译字符串模板时，例如本章实验台的 `Vue.compile()`，浏览器才运行前三步。

</template>
</Sc>

<Sc :a="2">

回顾（第 2 章）：第 2 章用对象语法绑定 class。下面元素的编译结果中，PatchFlag 是多少？

```html
<p :class="{ active: isActive }">固定文字</p>
```

<Opt>1</Opt>
<Opt>8</Opt>
<Opt>2</Opt>
<Opt>-1</Opt>

<template #explain>

解析：只有 class 是动态的，所以是 CLASS，值为 2。文字是固定的，所以不是 TEXT（1）。class 有专门的标记，不使用 PROPS（8）。-1 表示静态节点，Vue 3.5 缓存它。对象中的值依赖 isActive，所以节点不是静态的。

</template>
</Sc>

:::

::: summary
- 模板 → AST → 渲染函数 → 虚拟节点 → DOM。Vite 在构建时完成前三步。
- PatchFlags 标记动态部分。多个标记按位或组合，运行时用按位与检查。
- Block Tree 把动态后代收集到 dynamicChildren。v-if 分支和 v-for 各自是新的 Block。
- Vue 缓存静态节点。SFC 还缓存事件处理函数。
:::
