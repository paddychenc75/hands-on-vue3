---
title: 模板编译
id: compiler
stage: 4
chapter: 17
desc: 编译三步、PatchFlags、Block Tree、SFC 编译
---

<script setup>
import PatchFlagsPipeline from '../figures/17-compiler/PatchFlagsPipeline.vue'
import BlockDynamicChildren from '../figures/17-compiler/BlockDynamicChildren.vue'
import OnlineCompile from '../labs/17-compiler/OnlineCompile.vue'
import BlockTree from '../labs/17-compiler/BlockTree.vue'
import CompileSteps from '../labs/17-compiler/CompileSteps.vue'
import SfcSplit from '../labs/17-compiler/SfcSplit.vue'
</script>

# 模板编译

::: goals
<Goal checks="sc:3">说明模板变成 DOM 的步骤。</Goal>
<Goal checks="sc:0,ex:patchFlagFix,ex:flagBitFill">读懂编译结果中的 PatchFlag。</Goal>
<Goal checks="sc:1,sc:2">说明 Vue3 更新比 Vue2 快的编译原因。</Goal>
<Goal checks="sc:5,sc:6,ex:miniTransform,ex:miniGenerate">说明 parse、transform、generate 各做什么，并写出一个节点转换和一个迷你代码生成。</Goal>
<Goal checks="sc:7,sc:8">说明一个 .vue 文件被拆成哪几块，各由 compiler-sfc 的哪个函数编译。</Goal>

:::

::: rt
阅读主线约 18 分钟，深入内容约 4 分钟（可选）。另外留时间做实验台、练习和自测。
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

模板 AST
: 编译器把模板字符串解析成的树。每个标签、属性、指令、文字是一个节点对象。

节点转换
: 编译器遍历模板 AST 时，对每个节点运行的函数。它给节点添加优化信息，例如 PatchFlag。
:::

::: why
你用 h() 手写了一个大表单。修改一个文字后，Vue 比较了所有节点。同样的模板版本，更新快得多。

原因：编译器分析模板，知道哪些部分会变。它把这些信息写进生成的渲染函数。手写的 h() 没有这些信息。

本章查看编译结果，学习 PatchFlags、Block 和静态缓存。
:::

### 17.1 模板变成 DOM 的五个步骤

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

transform 这一步加入三类优化信息：PatchFlags、Block Tree 和缓存。下面三节分别说明。17.5 节打开 parse、transform 和 generate 三步，17.6 节说明 `.vue` 文件怎样被拆开编译。

### 17.2 PatchFlags：标记节点的动态部分

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

### 17.3 Block Tree：只比较动态节点

`openBlock()` 把一个新数组压入栈顶。之后每创建一个 vnode，如果它的 patchFlag 大于 0，或者它是组件，就把自己推进这个数组。`createElementBlock` 创建 Block 节点时，把这个数组取下来，作为它的 `dynamicChildren`。

所以 `dynamicChildren` 里有三类节点：

- 带 PatchFlag 的元素。
- 所有组件。组件 vnode 可以带 PatchFlag：有动态 props 时是 PROPS（8），例如 `<Comp :a="x" />` 编译出 `8 /* PROPS */` 和 dynamicProps `["a"]`。props 全是静态时没有 PatchFlag。不管有没有，组件都被收集。原因：父组件更新时，Vue 要把旧组件实例交给新的组件 vnode，以后才能正确卸载它。Vue 也要比较新旧 props，再决定要不要更新子组件（第 26 章）。
- 嵌套的子 Block，例如 `v-if` 的分支和 `v-for` 的 Fragment。子 Block 内部的节点在它自己的 `dynamicChildren` 里，不平铺到外层。

有一个例外：PatchFlag 恰好是 32（NEED_HYDRATION）的元素不收集。例如带事件监听的 `<input @input="f">`。这个标记只在服务端渲染的水合阶段（第 29 章）有用，更新时没有东西要比较。`@click` 不加这个标记。

更新时，Vue 只比较 `dynamicChildren`，不遍历整棵树。下图显示一个 Block 怎样收集动态节点。

<Figure caption="Block 把自己范围内的动态节点平铺到 dynamicChildren。更新时，Vue 只比较 p 的文字和 li 的 class，跳过静态节点和中间层级。">
<BlockDynamicChildren />
</Figure>

结构可能改变的地方必须创建新的 Block：

- `v-if` 的每个分支是一个 Block。编译器给每个分支不同的 key。分支切换时，isSameVNodeType 返回 false。Vue 卸载旧分支，并挂载新分支。
- `v-for` 的 Fragment 是一个 Block。列表项的数量会改变，所以 Vue 用 diff 比较列表项（第 18 章）。

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

### 17.4 静态缓存和事件缓存

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

只有 SFC 编译（Vite）启用事件缓存。17.2 实验台中的 `Vue.compile` 不缓存事件。

::: think 手写渲染函数或 JSX 为什么没有这些优化？
PatchFlags 和 Block Tree 由编译器分析模板后生成。手写渲染函数时，Vue 不知道哪些部分是静态的。所以 Vue 比较所有节点。因此 Vue 推荐使用模板。
:::

### 17.5 编译器的三步：parse、transform、generate

17.1 把编译分成三步。这一节打开每一步，看它的输入和输出。三步的代码在 `@vue/compiler-dom`（核心逻辑在 `@vue/compiler-core`）。`compile()` 只是把它们依次调用一遍。

| 步骤 | 输入 | 输出 | 做什么 |
|---|---|---|---|
| parse | 模板字符串 | 模板 AST | 把标签、属性、指令、文字变成节点。不判断动态还是静态 |
| transform | 模板 AST | 带 `codegenNode` 的 AST | 遍历每个节点，运行节点转换。打 PatchFlag，处理 `v-if` 和 `v-for`，标出静态节点 |
| generate | 转换后的 AST | 渲染函数的代码字符串 | 把 `codegenNode` 打印成 JavaScript |

**第一步：parse。**下面的脚本在 Node 中分开调用三步（`@vue/compiler-dom` 3.5.43）。先看 parse：

```js
import { parse, NodeTypes } from '@vue/compiler-dom'

const ast = parse('<div><h1>标题</h1><p :class="c" id="x">{{ msg }}</p></div>')
const p = ast.children[0].children[1]   // 根节点 → div → 第二个子节点 p

p.type === NodeTypes.ELEMENT            // true。NodeTypes.ELEMENT 的值是 1
p.props[0]    // 指令节点：type 7（DIRECTIVE），name 'bind'，arg.content 'class'，exp.content 'c'
p.props[1]    // 属性节点：type 6（ATTRIBUTE），name 'id'，value.content 'x'
p.children[0] // 插值节点：type 5（INTERPOLATION），content.content 'msg'
p.codegenNode // undefined：parse 之后还没有任何优化信息
```

AST 节点是普通对象，用 `type` 区分种类。`:class="c"` 在这里只是一个名叫 `bind` 的指令节点。parse 不知道 class 有专门的 PatchFlag，也不知道 `c` 会变。它只记录模板怎么写。

**第二步：transform。**接着对同一棵树调用 transform：

```js
import { transform, getBaseTransformPreset, DOMNodeTransforms, DOMDirectiveTransforms } from '@vue/compiler-dom'

const [nodeTransforms, directiveTransforms] = getBaseTransformPreset(true)  // true：给变量加 _ctx. 前缀
transform(ast, {
  prefixIdentifiers: true,
  hoistStatic: true,                   // 开启静态缓存
  nodeTransforms: [...nodeTransforms, ...DOMNodeTransforms],
  directiveTransforms: { ...directiveTransforms, ...DOMDirectiveTransforms }
})

const [h1, p2] = ast.children[0].children
p2.codegenNode.patchFlag      // 3，即 TEXT | CLASS
h1.codegenNode.value.patchFlag // -1。h1 是静态的，被包进一个缓存表达式（JS_CACHE_EXPRESSION）
ast.codegenNode.isBlock       // true：单个根元素变成 Block
[...ast.helpers].map(s => s.description)
// ['createElementVNode', 'toDisplayString', 'normalizeClass', 'openBlock', 'createElementBlock']
```

transform 之后，每个元素多了 `codegenNode`：它描述"怎样创建这个节点的 vnode"，包含 tag、props、children、patchFlag 和 dynamicProps。`ast.helpers` 登记了生成的代码要从 `vue` 导入哪些函数。

transform 由一组**节点转换**组成。每个节点转换是一个函数，`traverseNode` 对每个节点按数组顺序调用它们。常用的有：

- `transformExpression`：给表达式里的变量加前缀。`c` 变成 `_ctx.c`。在 SFC 中它按变量的来源改成 `$setup.c` 或 `$props.c`（17.6）。
- `transformElement`：为元素和组件生成 `codegenNode`。它读取属性和子节点，算出 17.2 的 PatchFlag 和 dynamicProps。
- `transformText`：把相邻的文字和插值合并成一个表达式，例如 `"a" + _toDisplayString(_ctx.b)`。
- `vIf` 和 `vFor`：处理结构化指令。节点被换成 IF 或 FOR 节点，每个分支、每次循环生成一个 Block。`v-if` 的分支得到不同的 key（17.3）。

所有节点转换运行完后，transform 还做两件事。如果 `hoistStatic` 为 true，`cacheStatic` 再遍历一次：静态子树的 PatchFlag 设为 -1，并放进 `_cache`（17.4）。然后 `createRootCodegen` 生成根节点：单个根元素变成 Block，多个根节点变成 Fragment（标记 64，STABLE_FRAGMENT）。

静态的判断在 `getConstantType` 里。一个元素是静态的，需要同时满足三条：没有动态绑定，没有 `ref` 和运行时指令（`v-show`、自定义指令），所有子节点也是静态的。写了 `ref` 的元素得到 512（NEED_PATCH），不会被缓存。

**第三步：generate。**

```js
import { generate } from '@vue/compiler-dom'

generate(ast, { mode: 'module', prefixIdentifiers: true }).code
```

输出：

```js
import { createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

export function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", null, [
    _cache[0] || (_cache[0] = _createElementVNode("h1", null, "标题", -1 /* CACHED */)),
    _createElementVNode("p", {
      class: _normalizeClass(_ctx.c),
      id: "x"
    }, _toDisplayString(_ctx.msg), 3 /* TEXT, CLASS */))
  ]))
}
```

generate 不做任何判断。它先根据 `ast.helpers` 写 import 行，再写 `render` 函数，然后递归地把每个 `codegenNode` 打印成一个函数调用。`3` 和 `-1` 就是 transform 写在 `codegenNode` 上的数字。

所以 17.2 到 17.4 的优化信息都在 transform 里产生。parse 和 generate 只是在它前后搬运。

<Lab id="demo-steps" title="实验台：编译的三步" note="分别调用 parse、transform、generate。浏览器构建没有 Babel，不能加 _ctx. 前缀，所以用 with 模式；步骤和 SFC 编译用的是同一套代码。">
<template #predict>
<Sc predict :a="1">

先猜：编译这个模板。transform 之后，两个 p 分支各是什么？

```html
<div>
  <p v-if="ok" :title="t">是</p>
  <p v-else>否</p>
</div>
```

<Opt>只有 v-if 的分支是 Block，v-else 的分支是普通节点</Opt>
<Opt>两个分支都是 Block，key 不同</Opt>
<Opt>两个分支都不是 Block，直接放进 div 的 dynamicChildren</Opt>

<template #explain>

解析：每个 v-if 分支都是一个 Block。分支结构可能改变，所以编译器给它们不同的 key（0 和 1）。切换时，isSameVNodeType 返回 false，Vue 卸载旧分支，挂载新分支。v-else 分支没有动态内容，也仍然是 Block，因为它的结构可能被换掉。第一项只看到了 v-if 有表达式。第三项忘了 17.3 的规则：v-if 的分支是 Block，Block 才有自己的 dynamicChildren。打开实验台，选择“v-if / v-else”，在第二页看两个 BRANCH，在第三页看 `key: 0` 和 `key: 1`。

</template>
</Sc>
</template>

<CompileSteps />
</Lab>

::: deep 节点转换的执行顺序
`traverseNode` 对一个节点先依次运行所有节点转换，再处理子节点。节点转换可以返回一个**退出函数**。退出函数在子节点处理完之后运行，顺序和进入相反：后注册的先退出。

`transformElement` 返回的是退出函数，因为它要等子节点转换完才能生成 `codegenNode`。这个顺序有一个后果：给 `compile()` 传入自己的 `nodeTransforms` 时，它们排在内置转换之后，所以你的退出函数比 `transformElement` 的先运行，这时元素还没有 `codegenNode`。

```js
const spy = node => {
  if (node.type !== NodeTypes.ELEMENT) return
  return () => console.log('退出', node.tag, node.codegenNode ? '有' : '没有', 'codegenNode')
}

// 排在内置转换后面（compile 的 nodeTransforms 选项就是这样）：
compile(tpl, { nodeTransforms: [spy] })
// 退出 p 没有 codegenNode
// 退出 div 没有 codegenNode

// 自己调用 transform，把 spy 放在最前面：它最后一个退出
transform(ast, { nodeTransforms: [spy, ...nodeTransforms, ...DOMNodeTransforms], /* 其余选项同上 */ })
// 退出 p 有 codegenNode
// 退出 div 有 codegenNode
```

写自己的转换插件时，要读取 PatchFlag，就把它放在数组前面。
:::

下面两道练习实现一个迷你编译器。`parse` 和 `traverse`（对应 `traverseNode`）已经写好。第一道写节点转换，第二道写代码生成。

<Exercise id="miniTransform" />

写节点转换时，你做的事和 `transformElement` 里算 PatchFlag 的部分相同。真实版本多处理了很多情况：组件、`v-bind="obj"`、`ref`、指令、动态 key。

<Exercise id="miniGenerate" />

把两道练习连起来，你就得到了一个只支持元素和插值的编译器。对这些简单的模板，它生成的 vnode 参数和真实编译器一致（真实版本的 `class` 要多经过一次 `normalizeClass`，字符串值不变）。真实编译器多出来的部分是 Block 和静态缓存、`v-if` 和 `v-for`、插槽，以及用 Babel 解析表达式来加前缀。

### 17.6 单文件组件怎样编译

`.vue` 文件不是模板。它有 template、script、style 三块，每块的语言不同。编译它的是 `@vue/compiler-sfc`。Vite 通过 `@vitejs/plugin-vue` 调用它。调用顺序如下：

1. `parse(源码)`：把文件拆成块，返回 descriptor。它只拆块，不编译。
2. `compileScript(descriptor, { id })`：编译 script 块，处理 `<script setup>`。返回组件的 JavaScript 代码和 `bindings`，也就是每个顶层变量属于哪一类（ref、常量、props……）。
3. `compileTemplate({ source, id, scoped, compilerOptions: { bindingMetadata: bindings } })`：调用 17.5 的三步，返回 render 函数。
4. `compileStyle({ source, id, scoped })`：处理样式。`scoped` 为 true 时改写选择器。
5. 插件把前几步的结果拼成一个模块。

下面是一个最小的单文件组件，用开发模式的做法编译：

```vue
<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <button class="b" @click="count++">{{ count }}</button>
</template>

<style scoped>
.b { color: red }
</style>
```

`compileScript` 把 `<script setup>` 变成一个 `setup()`（省略 `__name` 和 `__expose`）：

```js
export default {
  setup(__props) {
    const count = ref(0)

    const __returned__ = { count, ref }   // 所有顶层声明和导入
    return __returned__
  }
}
```

**`<script setup>` 的顶层变量全部放进 `__returned__`。**所以模板能读到它们，包括导入的组件。你不需要在 `components` 里注册。`defineProps` 和 `defineEmits` 这些宏在这一步被替换成 `props` 和 `emits` 选项，25.1 节已经讲过。

`compileTemplate` 拿到 `bindings`，知道 `count` 是 `setup-ref`，就把它编译成 `$setup.count`：

```js
export function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("button", {
    class: "b",
    onClick: _cache[0] || (_cache[0] = $event => ($setup.count++))
  }, _toDisplayString($setup.count), 1 /* TEXT */))
}
```

注意 `onClick` 被缓存在 `_cache[0]`。这是 17.4 的事件缓存，SFC 编译默认开启。导入的组件 `Child` 被编译成 `$setup["Child"]`，直接引用变量，不走 `resolveComponent`。

最后插件把它们拼成一个模块（简化）：

```js
const _sfc_main = { /* compileScript 的结果 */ }
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) { /* compileTemplate 的结果 */ }
import 'Demo.vue?vue&type=style&index=0&scoped=282e7235&lang.css'   // 样式是单独的模块
export default _export_sfc(_sfc_main, [['render', _sfc_render], ['__scopeId', 'data-v-282e7235']])
```

`_export_sfc` 把这些键值对复制到组件对象上，所以组件对象有了 `render` 和 `__scopeId`。开发模式下插件还会加上 `__file` 和热更新代码。`282e7235` 是插件根据文件路径算出的 8 位哈希（生产构建还加上源码）。

**scoped 样式分两处完成。**构建时，`compileStyle` 把选择器改写成 `.b[data-v-282e7235]`。运行时，渲染器读取组件的 `__scopeId`，给元素加上这个属性。`compileTemplate` 的结果里没有这个属性。选择器改写的规则见 27.4 节。

**生产构建用内联模板。**开发时模板单独编译成 `_sfc_render`，方便热更新。生产构建时（默认没有开发服务器，且组件使用 `<script setup>`），插件给 `compileScript` 传 `inlineTemplate: true`。渲染函数直接写在 `setup()` 里返回，变量按来源直接读取：已知的 ref 读 `count.value`，props 读 `__props.title`。这样省掉通过 `$setup` 代理查找的一层，也不需要返回 `__returned__`。

<Lab id="demo-sfc" title="实验台：拆开编译一个 .vue 文件" note="调用 compiler-sfc 的 parse、compileScript、compileTemplate 和 compileStyle。你可以修改源码，也可以切换内联模板。">
<template #predict>
<Sc predict :a="0">

先猜：示例里 `<script setup>` 导入了 `Child`，模板里写了 `<Child :n="count" />`，没有在 components 中注册。③ compileTemplate 的输出里，`Child` 变成什么？

<Opt>$setup["Child"]，直接引用 setup 返回的变量</Opt>
<Opt>_resolveComponent("Child")，运行时按名字查找</Opt>
<Opt>_ctx.Child，从组件实例上读取</Opt>

<template #explain>

解析：compileScript 返回的 bindings 记录了 `Child` 是导入的常量。compileTemplate 看到 `Child` 在 bindings 中，就直接引用 `$setup["Child"]`，不生成 `resolveComponent` 调用。没有在 bindings 中的组件名才走 `resolveComponent`，在 `components` 选项和全局注册里按名字查找。第二项是选项式 API 的做法。第三项忘了 `Child` 被放进了 `__returned__`。打开实验台，点击“③ compileTemplate”，找 `_createVNode` 那一行。

</template>
</Sc>
</template>

<SfcSplit />
</Lab>

::: pitfalls
1. 不要用浏览器中 `Vue.compile` 的结果判断 SFC 的输出。原因：它使用 with 模式，也不缓存事件。
2. `v-bind="obj"` 和逐个绑定的更新代价不同。原因：键名不确定，节点得到 FULL_PROPS，Vue 比较所有属性。属性固定时，逐个绑定。
3. 自己写编译转换插件时，不要以为在你的转换里能读到 `codegenNode`。原因：内置的 `transformElement` 在退出函数里才生成它，而你的退出函数排在它前面运行（17.5 节的深入块）。
4. 不要把 `compileScript` 的输出当成运行时的样子。原因：生产构建会内联模板，开发时才有 `__returned__` 和 `$setup.xxx`（17.6 节）。
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

<Sc :a="1">

模板 `<p :class="c">{{ msg }}</p>` 的 `p` 元素得到 PatchFlag 3。这个数字是哪一步算出来的？

<Opt>parse：解析模板时，看到 `:class` 就知道 class 是动态的</Opt>
<Opt>transform：`transformElement` 读取属性和子节点，把结果写进 `codegenNode`</Opt>
<Opt>generate：打印代码时才检查每个属性是否动态</Opt>

<template #explain>

解析：parse 只把 `:class="c"` 记成一个 `bind` 指令节点，节点上没有 `codegenNode`，也没有任何优化信息。`transformElement` 在 transform 这一步读取属性和子节点，算出 TEXT | CLASS，写进 `codegenNode.patchFlag`。generate 不做判断，只把这个数字打印在 `createElementVNode` 的第 4 个参数的位置。第一项最迷惑：`:class` 的写法确实在 parse 里就能看到，但“看到写法”和“算出 PatchFlag”是两件事，后者需要 transform 里的规则。

</template>
</Sc>

<Sc :a="2">

下面的代码用 `createVNode` 手写了 Block 的内容。`vnode.dynamicChildren` 有几个节点？

```js
const vnode = (openBlock(), createElementBlock('div', null, [
  createVNode(Comp, { a: '1' }),
  createVNode(Comp, { a: x }, null, 8, ['a']),
  createElementVNode('b', null, 'static'),
  createElementVNode('p', null, text, 1)
]))
```

<Opt>1 个：只有 p 带 PatchFlag</Opt>
<Opt>2 个：带 PatchFlag 的第二个 Comp 和 p</Opt>
<Opt>3 个：两个 Comp 和 p</Opt>
<Opt>4 个：所有子节点</Opt>

<template #explain>

解析：条件是 PatchFlag 大于 0，或者节点是组件。第一个 Comp 没有 PatchFlag，但它是组件，所以也被收集：父组件更新时，Vue 要把它的实例交给新的 vnode，才能以后卸载它。第二个 Comp 有 PatchFlag 8，p 有 PatchFlag 1，都被收集。b 是静态元素，没有 PatchFlag，不收集。所以一共 3 个。第二项最迷惑：它以为组件只有带 PatchFlag 时才被收集。

</template>
</Sc>

<Sc :a="0">

`<script setup>` 导入了 `Child`，没有注册，模板里写 `<Child />`。开发模式下，模板编译结果怎样引用它？

<Opt>`$setup["Child"]`：compileScript 把 Child 放进 `__returned__`，并告诉 compileTemplate 它是 setup 里的变量</Opt>
<Opt>`_resolveComponent("Child")`：运行时按名字在 `components` 中查找</Opt>
<Opt>`_ctx.Child`：运行时从组件实例上读取</Opt>

<template #explain>

解析：compileScript 返回的 `bindings` 记录了 `Child` 是 setup 里的常量，compileTemplate 据此直接引用 `$setup["Child"]`。只有 bindings 里没有的组件名才走 `resolveComponent`，在 `components` 选项和全局注册里查找。第二项是选项式 API 的做法，也是没有传 bindings 时的做法。

</template>
</Sc>

<Sc :a="1">

scoped 样式里的 `.b { color: red }` 变成了 `.b[data-v-xxx]`，元素上也有 `data-v-xxx` 属性。这两件事分别发生在哪里？

<Opt>都在构建时：compileTemplate 把属性写进模板的编译结果</Opt>
<Opt>选择器由 compileStyle 在构建时改写；属性由渲染器在运行时根据组件的 `__scopeId` 添加</Opt>
<Opt>都在运行时：浏览器在解析样式时处理</Opt>

<template #explain>

解析：`compileStyle` 在构建时把选择器改写成 `.b[data-v-xxx]`。插件把 `data-v-xxx` 保存为组件的 `__scopeId`。渲染器创建元素时读取它并添加属性。`compileTemplate` 的输出里没有 `data-v-xxx`。第一项最迷惑：两头都和“构建”有关，但属性是运行时才加的。浏览器只负责匹配选择器，不改写样式。

</template>
</Sc>

:::

::: summary
- 模板 → AST → 渲染函数 → 虚拟节点 → DOM。Vite 在构建时完成前三步。
- PatchFlags 标记动态部分。多个标记按位或组合，运行时用按位与检查。
- Block Tree 把动态后代收集到 dynamicChildren。v-if 分支和 v-for 各自是新的 Block。
- Vue 缓存静态节点。SFC 还缓存事件处理函数。
- 编译分三步：parse 把模板变成 AST，transform 用节点转换添加 PatchFlag、Block 和缓存，generate 把 `codegenNode` 打印成渲染函数。优化信息都在 transform 里产生。
- 组件 vnode 可以有 PatchFlag（动态 props 时是 PROPS），不管有没有都被收集进 `dynamicChildren`。
- `.vue` 文件由 compiler-sfc 拆开编译：parse 拆块，compileScript 把 `<script setup>` 变成 `setup()` 和 `__returned__`，compileTemplate 按 bindings 引用变量，compileStyle 改写 scoped 选择器。
:::
