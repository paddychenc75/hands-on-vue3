---
title: 虚拟 DOM 与渲染函数
id: render
stage: 5
chapter: 28
desc: 虚拟节点、h()、插槽、函数式组件和 JSX
---

<script setup>
import TemplateAndHToVNode from '../figures/28-render/TemplateAndHToVNode.vue'
import RenderTree from '../labs/28-render/RenderTree.vue'
import VNodeInspector from '../labs/28-render/VNodeInspector.vue'
</script>

# 虚拟 DOM 与渲染函数：vnode、h() 和 JSX

::: goals
<Goal checks="sc:10">说明虚拟节点是什么，渲染函数和渲染器各做什么，数据变化后 Vue 怎样更新页面。</Goal>
<Goal checks="sc:7,sc:12,ex:miniH">说明 `type` 和 `shapeFlag` 的含义，并手写迷你 Vue 的 `h()`：处理参数重载，算出 `shapeFlag`。</Goal>
<Goal checks="sc:0,sc:1,sc:2,ex:hListFill">用 `h()` 写渲染函数，包括 props 和事件，并在渲染函数内部读取响应式数据。</Goal>
<Goal checks="sc:3,ex:renderFn">用渲染函数实现 v-if、v-for 和 v-model，说出每种模板写法的渲染函数对应。</Goal>
<Goal checks="sc:5,sc:8,sc:11,ex:scopedSlotForward">说明插槽为什么是函数，并用渲染函数接收和转发作用域插槽。</Goal>
<Goal checks="sc:6,ex:fnComp">写一个函数式组件。</Goal>
<Goal checks="sc:4,sc:9">说明 JSX 编译成什么，以及它和模板在性能上的区别。</Goal>

:::

::: rt
阅读主线约 28 分钟，深入内容约 8 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
vnode 像**施工图纸**。图纸是一个普通对象，画出这间房应该有什么。施工队（渲染器）照图纸盖房。数据变了，你画一张新图纸，施工队只拆改两张图纸不同的地方。模板是印好格子的图纸，Vue 提前知道哪些格子会变。渲染函数是手画的图纸，想画什么都可以，但 Vue 只能逐处检查哪里变了。
:::

::: terms
虚拟节点（VNode）
: 描述一个 DOM 元素的 JavaScript 对象。

虚拟 DOM
: 由虚拟节点组成的树，加上把它变成真实 DOM、并在数据变化时只修改差别的机制。

渲染函数（render）
: 返回虚拟节点的函数。

渲染器
: 把虚拟节点变为目标平台节点的程序。

h()
: 创建虚拟节点的函数。

shapeFlag
: vnode 上的一个整数，每一位表示 vnode 的一个形态，例如元素、文本子节点。

Fragment
: 没有自己的元素、只包含一组子节点的 vnode 类型。

插槽对象
: 组件 vnode 的子节点：键是插槽名，值是返回 vnode 数组的函数。

函数式组件
: 没有实例和状态的组件。它是一个普通函数。

JSX
: 类似 HTML 的 JS 语法，编译为 h() 调用。
:::

::: why
你写一个组件库的 List 组件。它要在默认插槽的每一项之间插入分隔线。用模板写时，你只能把整个 `<slot>` 放在一处，不能逐项处理。

原因：模板描述固定的结构。它不能把插槽内容当作数据来读取和修改。

这一章先讲清虚拟节点是什么。再用渲染函数 h() 和 JSX，用 JavaScript 读取、组合和创建节点。
:::

### 28.1 虚拟节点：用普通对象描述界面

前面的章节讲了“数据变了，哪个渲染副作用函数要重新运行”（第 24、25 章）。这一阶段回答下一个问题：渲染副作用函数里运行的是什么，它的结果怎样变成页面。起点是**虚拟节点**（vnode）：一个普通 JavaScript 对象，描述“这里应该有一个什么节点”。

```js
// 下面是简化的写法，真实对象的字段见 28.2
{ type: 'div', props: { class: 'card' }, children: [
  { type: 'h2', props: null, children: 'Hello' }
] }
```

它不是 DOM 节点，创建它不碰浏览器。一棵 vnode 树描述整个界面。**虚拟 DOM** 指这样一棵树，加上处理它的机制。机制只有三步：

<Flow :steps="['渲染函数返回 vnode 树', '渲染器按树创建真实 DOM', '数据变了，生成新树', '比较新旧两棵树，只改有差别的 DOM']" />

1. **渲染函数**返回一棵 vnode 树。这是本章的内容。
2. **渲染器**第一次拿到树，按它创建真实 DOM 并插入页面。这叫挂载。组件怎样挂载，见第 31 章。
3. 数据变化后，渲染函数再运行一次，得到一棵新树。渲染器比较新旧两棵树，只修改有差别的 DOM。这个比较叫 diff，详见第 30 章。

为什么要多这一层，而不是让渲染函数直接操作 DOM？

- **描述和操作分开。** vnode 不依赖浏览器。同一棵树可以交给不同的渲染器：DOM 渲染器、生成 HTML 字符串的渲染器（第 36 章）、画 Canvas 的渲染器（第 32 章会讲）。
- **有“上一次的样子”。** 比较需要两份描述。没有上一棵树，更新只能清空重建，或者手写每一处 DOM 操作。
- **渲染函数里是 JavaScript。** 循环、条件、函数组合都能生成树（28.3）。

::: note
虚拟 DOM 不是“比直接操作 DOM 更快”的技术。创建 vnode 和比较两棵树都有成本。它换来的是声明式写法：你描述结果，Vue 算出怎么改。成本靠编译优化压低：模板编译时提前标出会变的部分（第 29 章）。手写的渲染函数没有这些标记（28.7）。
:::

模板也是写渲染函数的一种方式：编译器把模板编译成渲染函数（第 29 章）。下图中，写模板从 ① 开始，写渲染函数跳过 ①，直接写 ②。

<Figure caption="模板和 h() 都得到同一种 VNode 树。渲染器再用这棵树创建或更新真实 DOM。">
<TemplateAndHToVNode />
</Figure>

### 28.2 h() 和 vnode 对象

`h(type, props?, children?)` 创建一个 vnode。`h` 是 hyperscript 的缩写。

```js
h('div')
h('div', { id: 'app', class: ['card', { active: isActive }] })
h('div', 'hello')                                   // 没有 props 时，可以省略第二个参数
h('ul', [h('li', 'a'), h('li', 'b')])               // children 是数组
h('input', { value: text, onInput: e => text = e.target.value })   // 事件：on + 首字母大写
h(MyButton, { size: 'small', onClick: save }, () => '保存')        // 组件：children 用函数
```

props 里，`class` 和 `style` 接受字符串、数组和对象，事件写为 `onXxx`（例如 `onClick`、`onUpdate:modelValue`），DOM 属性和组件 props 写在同一个对象中。

`h('p', { class: 'x' }, 'hi')` 返回一个普通对象。真实的 vnode 字段很多，下面是本课程的迷你 Vue 用的七个，也是读后面几章最需要的：

```js
{ type: 'p', props: { class: 'x' }, children: 'hi', key: null, shapeFlag: 9, el: null, component: null }
```

| 字段 | 含义 |
|---|---|
| `type` | 这个节点是什么。字符串是元素（`h('div')`），对象是有状态组件（`h(MyComp)`），函数是函数式组件（28.6）。`Text`、`Comment`、`Fragment` 等符号表示文本节点、注释节点和没有自己元素的一组子节点 |
| `props` | 属性、事件、组件的 props |
| `children` | 子节点：文字、vnode 数组，或者插槽对象 |
| `key` | 取自 `props.key`。第 30 章的 diff 用 `type` 和 `key` 判断两个节点是不是同一个 |
| `shapeFlag` | 一个整数，把“节点类型加子节点类型”压缩在一起，见下文 |
| `el` | 挂载后指向真实 DOM 节点，更新、移动和卸载 DOM 都靠它 |
| `component` | 组件 vnode 挂载后指向组件实例（第 31 章） |

真实的 vnode 还有 `patchFlag` 和 `dynamicChildren`，只有模板编译出来的 vnode 才有值（第 29 章）。`Teleport`、`Suspense` 是特殊的 `type`，第 33 章讲。

**shapeFlag 把“这是什么节点，子节点是什么”存成一个整数。** 渲染器要反复问这两个问题：它是元素还是组件？子节点是一段文字、一个数组，还是插槽？每次都去比较 `type` 和检查 `children` 的类型太慢。所以 vnode 创建时就算好，每一位表示一个事实：

| 位 | 值 | 含义 |
|---|---|---|
| `ELEMENT` | 1 | 元素 |
| `FUNCTIONAL_COMPONENT` | 2 | 函数式组件 |
| `STATEFUL_COMPONENT` | 4 | 有状态组件 |
| `TEXT_CHILDREN` | 8 | 子节点是一段文字 |
| `ARRAY_CHILDREN` | 16 | 子节点是数组 |
| `SLOTS_CHILDREN` | 32 | 子节点是插槽对象 |

还有 64 以上的位，给 `Teleport`、`Suspense` 和 `KeepAlive` 用。

计算分两步：先由 `type` 得到类型位，再由 `children` 的种类用位或（`|`）加上子节点位。所以 `h('div')` 是 1，`h('div', 'hi')` 是 1 加 8，等于 9，`h('div', [h('p')])` 是 1 加 16，等于 17。`h(Comp, null, () => 'x')` 是 4 加 32，等于 36：`Comp` 是对象，类型位是 4；函数子节点会被包成插槽对象，子节点位是 32。

渲染器用一次位与判断：`vnode.shapeFlag & 8` 不是 0，就说明子节点是文字，直接设置元素的文字。`& 16` 不是 0，才逐个挂载子节点。第 30、31 章的渲染器都这样分发。

下面的检查器运行真实的 `h()`，显示 vnode 的每一部分。

<Lab id="demo-vnode-inspector" title="实验台：VNode 检查器" note="运行真实的 h()">
<template #predict>
<Sc predict :a="2">

先猜：`h(Comp, null, () => 'x')` 的 `shapeFlag` 是多少？`Comp` 是一个有状态组件。

<Opt>4</Opt>
<Opt>32</Opt>
<Opt>36</Opt>

<template #explain>

解析：`Comp` 是对象，类型位是 `STATEFUL_COMPONENT`（4）。第三个参数是函数，`normalizeChildren` 把它包成插槽对象 `{ default: fn }`，再加上 `SLOTS_CHILDREN`（32）。4 加 32 是 36。第一项只记了类型位，第二项只记了子节点位。打开实验台，点“h(Comp, null, [h('b')])”，看数组子节点得到的是 20。

</template>
</Sc>
</template>

<VNodeInspector />
</Lab>

下面的练习写迷你 Vue 的第一块零件：`h()`。你写的 `createVNode`、`normalizeChildren` 和 `h` 是全课程唯一的一份。第 30 章用它造 vnode 去 diff，第 31 章的 `createApp` 用它造根 vnode。

<Exercise id="miniH" />

::: deep h() 的参数重载，和子节点的规范化
**h() 的参数重载。** `h` 的第二个参数可能是 props，也可能是子节点。规则在 `runtime-core/h.ts` 里：

1. 只有两个参数：第二个是普通对象就当 props；第二个是 vnode，当作唯一的子节点；其余（字符串、数组、函数）当子节点。
2. 三个参数：第三个是单个 vnode 时，包成数组。
3. 超过三个参数：第三个起全是子节点，收成数组。

```js
h('div', { id: 'a' })           // props
h('div', h('p'))                // 子节点 [vnode]，shapeFlag 17
h('div', null, 'a', 'b')        // 子节点 ['a', 'b']，shapeFlag 17
h('div', null, 123)             // 数字转成字符串 '123'，shapeFlag 9
```

**normalizeChildren。** `createVNode` 把子节点规范化成下表的形态之一，并加上子节点位：

| 传入 | children 变成 | 加上的位 |
|---|---|---|
| `null` | `null` | 无 |
| 数组 | 原数组 | `ARRAY_CHILDREN` |
| 字符串、数字 | 字符串 | `TEXT_CHILDREN` |
| 函数（给组件） | `{ default: fn, _ctx }` | `SLOTS_CHILDREN` |
| 对象（给组件） | 原对象，加上 `_ctx` | `SLOTS_CHILDREN` |

给元素传对象或函数时，`normalizeChildren` 取出 `default` 插槽并调用它，当作子节点处理。

**渲染时再规范化。** 数组里的每一项在挂载时还要过一遍 `normalizeVNode`：`null` 和布尔值变成 `Comment` 节点，数组变成 `Fragment`，字符串和数字变成 `Text` 节点，已经挂载过的 vnode 先克隆。所以下面的写法合法：

```js
h('div', [cond && h('p', 'yes'), 'tail', [h('i'), h('b')]])
//         false → 注释节点     文本节点   数组 → Fragment
```

迷你 Vue 的 `h` 简化了这一步：数组里的字符串、数字和 `null` 在 `h` 里就变成文本 vnode，没有注释节点和 `Fragment`。这是迷你版和真实实现的差别之一。

**key 和 ref。** `key` 取自 props，放在 `vnode.key` 上。`ref` 也取自 props，字符串、ref 对象和函数会被包成 `{ i, r, k, f }`：`i` 是创建它的组件实例，`r` 是 ref 本身。所以渲染函数里这两种写法都有效：

```js
h('input', { ref: inputRef })        // ref 对象：挂载后 inputRef.value 是元素
h('input', { ref: 'box' })           // 字符串：配合 useTemplateRef('box')
```

**为什么一个 vnode 不能放在树里两次。** vnode 不只是描述，它还记录运行结果：挂载后 `el` 指向真实 DOM，组件 vnode 的 `component` 指向实例。一个对象存不下两份 DOM。官方文档要求树里的 vnode 必须唯一。Vue 3.5 的渲染器在挂载时发现 vnode 已经有 `el`，会先 `cloneVNode` 复制一份，所以 `h('div', [v, v])` 能渲染出两个元素。这是实现细节，不要依赖。写工厂函数，每次调用 `h()`。

`cloneVNode(vnode, extraProps)` 复制一个 vnode，并把额外的 props 合并进去。给插槽内容统一加 class 就用它：

```js
slots.default().map(vn => cloneVNode(vn, { class: 'item' }))
// <b>x</b> 变成 <b class="item">x</b>；原本有 class 的合并成 "own item"
```
:::

### 28.3 用渲染函数写组件

setup 可以返回一个函数。Vue 把这个函数作为组件的渲染函数。函数中读取的响应式数据成为渲染的依赖。

```js
import { ref, h } from 'vue'

export default {
  props: { level: { type: Number, default: 2 } },
  setup(props, { slots }) {
    const count = ref(0)
    return () => h('h' + props.level, { class: 'title' }, [   // 动态标签名
      slots.default?.(),
      h('button', { onClick: () => count.value++ }, count.value)
    ])
  }
}
```

不要在 setup 的顶层读取 `props.level` 并保存。`setup` 只运行一次，保存下来的只是当时的快照。在返回的渲染函数内部读取它，Vue 才能跟踪它。

**什么时候该用渲染函数。** 先用模板。模板能处理大部分动态结构，例如 `<component :is="'h' + level">`。下面这些情况模板写不出来，或者写出来很别扭：标签或结构由数据决定（递归的大纲，每一级用不同的标题标签）；要读取、加工插槽内容；配置驱动的界面（表格的列配置里写 render 函数，28.6）。

开头的 List 组件要在插槽的每一项之间加分隔线。渲染函数里调用 `slots.default()`，拿到 vnode 数组，再逐项处理：

```js
setup(_, { slots }) {
  return () => {
    const items = slots.default?.() ?? []
    return h('div', items.flatMap((vn, i) => (i === 0 ? [vn] : [h('hr'), vn])))
  }
}
// <SepList><p>a</p><p>b</p><p>c</p></SepList> 渲染成 <p>a</p><hr><p>b</p><hr><p>c</p>
```

注意插槽里用了 `v-for` 时，`slots.default()` 返回的数组只有一项：一个 `Fragment`，所有列表项在它的 `children` 里。上面的写法会把整个列表当成一项，不会在列表项之间插入分隔线。要处理它，先把 `Fragment` 展开。

<Lab id="demo-render-tree" title="实验台：模板和 h() 渲染同一棵树" note="递归组件、动态标题级别、编译结果对比">
<template #predict>
<Sc predict :a="0">

先猜：OutlineT 用模板，OutlineH 用 h() 返回嵌套数组。去掉注释后，两边生成的 HTML 一样吗？

```vue
// OutlineT 的模板
<template v-for="n in nodes" :key="n.id">
  <component :is="'h' + level">{{ n.title }}</component>
  <OutlineT v-if="n.children.length" … />
</template>

// OutlineH 的渲染函数
return () => props.nodes.map(n => [h('h' + level, …), …])
```

<Opt>完全相同，没有多余元素</Opt>
<Opt>不同。h() 版本多一层 \<div></Opt>
<Opt>不同。模板版本多出 \<template></Opt>

<template #explain>

解析：Vue 3 的渲染函数可以返回数组。Vue 把数组作为 Fragment 渲染，不加外层元素。\<template> 只是分组标记，不生成元素。所以两边的 HTML 相同。差别只在编译信息：模板版本有 PatchFlag 和 Block。打开实验台，看“两边生成的 HTML”后面的结论。点击“随机添加子节点”，再看一次。

</template>
</Sc>
</template>

<RenderTree />
</Lab>

下面的练习用 h() 渲染列表。外层结构已经写好，你补全每个列表项：写 key 和点击事件。

<Exercise id="hListFill" />

### 28.4 模板写法和渲染函数写法的对照

写渲染函数，就是手写编译器会生成的东西。下表把常用的模板写法对应到渲染函数。第二列是手写时的简单写法，第三列是编译器实际生成的。

| 模板 | 渲染函数里手写 | 编译器实际生成 |
|---|---|---|
| `v-if / v-else` | `ok ? h(A) : h(B)` | 同样的三元表达式，两个分支带不同的 key。没有 `v-else` 时，另一侧是注释节点 |
| `v-for` | `list.map(it => h('li', { key: it.id }, it.name))` | `renderList(list, …)`，外面包一层 `Fragment` |
| `v-show` | `h('div', { style: { display: ok ? '' : 'none' } })` | `withDirectives(…, [[vShow, ok]])`。指令会记住元素原来的 `display` |
| `@click.stop` | `onClick: withModifiers(fn, ['stop'])` | 同左 |
| `v-model`（组件） | `{ modelValue: v.value, 'onUpdate:modelValue': x => v.value = x }` | 同左 |
| `v-model`（原生 input） | `{ value: v.value, onInput: e => v.value = e.target.value }` | `withDirectives(…, [[vModelText, v]])`。指令还处理输入法：拼音输入的过程中不更新数据 |
| 自定义指令 | `withDirectives(h('input'), [[vFocus]])` | 同左。模板里的名字用 `resolveDirective('focus')` 查找 |
| `<slot name="x" :item="it">` | `slots.x?.({ item: it })` | `renderSlot($slots, 'x', { item: it })` |
| `<component :is="c">` | `h(c)` | `resolveDynamicComponent(c)` |
| `<Comp>` | `import` 之后直接 `h(Comp)` | `resolveComponent('Comp')`，按名字查找已注册的组件 |
| `v-bind="obj" class="a"` | `mergeProps(obj, { class: 'a' })` | 同左 |

手写的简单写法能用，只是少了编译器处理的细节：原生 `input` 手写 `value` 加 `onInput` 能工作，编译器多生成的 `vModelText` 指令处理了输入法。表里的 `withModifiers`、`withDirectives`、`resolveComponent`、`mergeProps` 等都从 `vue` 导出，读编译产物时会遇到它们，细节见深入块。渲染函数里没有指令语法：`v-model` 写成属性，只会变成元素上一个普通的 HTML 属性。

下面的练习用渲染函数写两个组件：标题标签随 props 变化，列表带 key。

<Exercise id="renderFn" />

::: deep 渲染函数里的内置函数
- `withDirectives(vnode, [[指令, 值, 参数, 修饰符]])` 把指令记在 `vnode.dirs` 上。指令对象的钩子（`mounted`、`updated`……）由渲染器在对应时机调用。例如 `<div v-focus:arg.mod="v">` 得到 `withDirectives(h('div'), [[focus, v, 'arg', { mod: true }]])`。
- `resolveComponent('Name')` 先找当前组件的 `components`，再找全局 `app.component` 注册的。找不到时返回名字字符串，并警告 `Failed to resolve component`。它只能在 `setup` 或渲染函数里调用。直接 `import` 组件时用不到它。
- `mergeProps` 合并多组 props：`class` 拼接，`style` 合并，同名的 `onXxx` 变成数组，两个函数都会调用，其他属性后者覆盖前者。例如 `mergeProps({ class: 'a', onClick: f1 }, { class: ['b'], onClick: f2 })` 得到 `class: 'a b'` 和 `onClick: [f1, f2]`。
- `<MyInput v-model:title.trim="t" />` 编译成 `{ title: t, 'onUpdate:title': …, titleModifiers: { trim: true } }`。修饰符以 `属性名Modifiers` 对象的形式传给组件。
:::

### 28.5 插槽为什么是函数

给组件传插槽时，第三个参数写为一个对象。对象的每个属性是一个返回 vnode 的函数。

```js
// <MyList :items="list">
//   <template #item="{ item }">{{ item.name }}</template>
//   <template #empty>没有数据</template>
// </MyList>
h(MyList, { items: list.value }, {
  item: ({ item }) => h('b', item.name),     // 作用域插槽：参数是子组件传来的数据
  empty: () => '没有数据'
})

// 只有默认插槽时，可以直接传一个函数
h(MyButton, null, () => '保存')
```

这个对象就是**插槽对象**。模板里的 `<template #item="{ item }">` 编译后也是这样的对象。

**数据流。**

1. 父组件的渲染函数创建组件 vnode，`children` 是插槽对象，`shapeFlag` 带 `SLOTS_CHILDREN`。
2. 子组件实例化时，把它存成 `instance.slots`，也就是 `setup` 里的 `slots` 和模板里的 `$slots`。
3. 子组件的渲染函数调用 `slots.default?.()`。模板里的 `<slot>` 编译成 `renderSlot(...)`，也是调用这个函数。
4. 函数返回 vnode 数组，成为子组件 vnode 树的一部分。

**为什么要延迟调用。** 插槽函数在子组件的渲染里才运行，带来两个结果。

第一，依赖归子组件。插槽里读的响应式数据，被子组件的渲染副作用函数收集，数据变化时只有子组件重新渲染。

```js
h(Child, null, { default: () => h('b', dep.value) })
// dep.value++ 后的日志： Child render → slot fn runs     没有 Parent render
```

第二，子组件能把数据传给插槽。`slots.item?.({ item, index })` 调用函数时带上参数，父组件那边的函数用参数渲染内容，这就是作用域插槽。如果传的是数组，数组在父组件的渲染里已经创建完，读到的数据归父组件，子组件无法传参，也没有独立更新。（手写 `h()` 传插槽函数时，还要加 `$stable: true` 才不会在父组件更新时连带更新子组件，详见第 31 章。）

**在渲染函数里传插槽，四种写法：**

- `h(Box, null, { default: () => h('b') })` 和 `h(Box, null, () => 'text')`（单个函数就是默认插槽）都正确。
- `h(Box, null, [h('b')])` 和 `h(Box, null, { default: [h('b')] })` 会在开发环境警告 `Non-function value encountered for default slot. Prefer function slots for better performance.` 内容仍会显示，但失去上面两个好处。

**读取插槽。** `slots.default` 没传时是 `undefined`，所以写 `slots.default?.()`。需要后备内容时，用 `renderSlot(slots, name, props, fallback)`：插槽没传，或者返回的全是注释节点（例如里面的 `v-if` 为假）时，显示 `fallback`。

**转发作用域插槽。** 包装组件要把自己收到的插槽交给内层组件，有三种写法，结果相同：

```js
h(List, { items }, { item: sp => slots.item?.(sp) })         // 参数原样传下去
h(List, { items }, slots)                                      // 整个插槽对象转发
h(List, { items }, { item: sp => renderSlot(slots, 'item', sp) })
```

常见错误是 `h(List, { items }, slots.item)`：函数被当成默认插槽，List 读不到 `item`。另一个是 `{ item: slots.item?.() }`：提前调用了，而且没有参数。

<Exercise id="scopedSlotForward" />

### 28.6 函数式组件

函数式组件是一个普通函数。它没有实例、没有状态，也没有生命周期。它收到 props 和一个上下文对象。

```js
function Heading(props, { slots, emit, attrs }) {
  return h('h' + props.level, { onClick: () => emit('pick', props.level) }, slots.default?.())
}
Heading.props = ['level']        // 声明 props。不声明时，所有属性都在 attrs 中
Heading.emits = ['pick']

// 使用：<Heading :level="2" @pick="onPick">标题</Heading>
```

Vue 3 中，函数式组件和普通组件的性能差别很小。只在组件确实没有状态时使用它：只是把 props 和插槽变成 vnode，没有 `ref`、`watch`、生命周期钩子，也不需要 `expose`。需要其中任何一项，就用普通组件。

**场景：任务表格的状态列显示徽章，操作列显示按钮。** 表格组件常让你在列配置中写 render 函数。列配置是 JavaScript 数据，不能写模板，所以 render 函数用 h() 返回 vnode。

```js
import { h } from 'vue'
import StatusBadge from './StatusBadge.vue'

const columns = [
  { key: 'title', title: '任务' },
  { key: 'status', title: '状态', render: row => h(StatusBadge, { status: row.status }) },
  { key: 'actions', title: '操作',
    render: row => h('button', { onClick: () => removeTask(row.id) }, '删除') }
]
// 模板：<TaskTable :rows="tasks" :columns="columns" />
```

自己写 TaskTable 时，用一个函数式组件 Cell 显示这些 vnode。没有 render 的列显示原始字段。在 `<script setup>` 顶层定义 Cell，模板就可以使用它。

```js
// TaskTable.vue
defineProps(['rows', 'columns'])
const Cell = ({ col, row }) => (col.render ? col.render(row) : row[col.key])
Cell.props = ['col', 'row']

// 模板：
// <tr v-for="row in rows" :key="row.id">
//   <td v-for="col in columns" :key="col.key"><Cell :col="col" :row="row" /></td>
// </tr>
```

不要在模板中写 `<component :is="() => col.render(row)">`。父组件每次渲染都创建新函数。Vue 把它当作新组件，单元格卸载并重新挂载。把函数式组件定义在顶层。

<Exercise id="fnComp" />

::: deep 函数式组件的 props 和 emits 声明
声明写在函数上：`Heading.props = ['level']`，`Heading.emits = ['pick']`。规则如下：

- 不声明 `props` 时，`props` 和 `attrs` 是同一批数据（传入的全部属性）。只有 `class`、`style` 和 `onXxx` 会落到根元素上。
- 声明 `props` 后，`props` 只含声明的键。其余属性（例如 `title`）在 `attrs` 里，并落到根元素上。
- 声明 `emits` 后，`onPick` 不再出现在 `attrs` 里，不会当作普通监听器落到根元素。不声明，`emit('pick')` 仍然能调用到父组件的 `onPick`。
:::

### 28.7 JSX：编译成什么，少了什么优化

JSX 是渲染函数的另一种写法。在 Vite 项目中，按下面的步骤启用它：

1. 安装 `@vitejs/plugin-vue-jsx`。
2. 在 vite.config 的 plugins 中加入 `vueJsx()`。
3. 把文件命名为 `.jsx` 或 `.tsx`。

```vue
// Heading.tsx
export default defineComponent({
  props: { level: { type: Number, default: 2 } },
  setup(props, { slots }) {
    const text = ref('')
    return () => {
      const Tag = `h${props.level}`                  // 在渲染函数内部计算。level 改变时更新
      return (
        <div>
          <Tag class="title">{slots.default?.()}</Tag>
          <input v-model={text.value} />               {/* 插件支持 v-model */}
          <MyList v-slots={{ empty: () => '没有数据' }} />
        </div>
      )
    }
  }
})
```

JSX 中的变量 Tag 以大写字母开头。插件因此把它当作组件或动态标签，而不是字符串 "Tag"。

**编译成什么。** `@vue/babel-plugin-jsx` 把 JSX 编译成上面几节的函数调用（用 3.0.0 版得到的输出）：

| JSX | 编译产物 |
|---|---|
| `<div id="a" class={c}><p>{msg}</p></div>` | `createVNode("div", { id: "a", class: c }, [createVNode("p", null, [msg])])` |
| `<MyList items={list}>text</MyList>` | `createVNode(MyList, { items: list }, { default: () => [createTextVNode("text")] })` |
| `<input v-model={t.value} />` | `withDirectives(createVNode("input", { "onUpdate:modelValue": $event => t.value = $event }), [[vModelText, t.value]])` |
| `<div {...obj} class="x" />` | `createVNode("div", mergeProps(obj, { class: "x" }))` |

要记住：组件的 JSX 子节点自动包成 `{ default: () => [...] }`，具名或作用域插槽用 `v-slots` 或子节点对象。标签名是作用域里的变量（`import` 的组件）时直接引用变量，作用域里没有它才用 `resolveComponent("名字")` 查找。事件是普通 prop：`onClick={fn}`，修饰符自己调用 `withModifiers`。

**少了什么优化。** 对比同一个结构 `<div><p>{msg}</p><span>static</span></div>` 的两种产物：

```js
// 模板编译的产物
return (_openBlock(), _createElementBlock("div", null, [
  _createElementVNode("p", null, _toDisplayString(msg), 1 /* TEXT */),   // 只比较文字
  _cache[0] || (_cache[0] = _createElementVNode("span", null, "static", -1 /* CACHED */))
]))

// JSX 或手写 h() 的产物：没有标记，每次都创建并比较所有节点
return h('div', [h('p', msg), h('span', 'static')])
```

模板编译器提前知道哪些部分是静态的，所以生成三种优化信息：PatchFlags 标记节点的哪些部分是动态的；Block Tree 让根节点收集所有动态后代，diff 时只比较它们；静态缓存让静态节点只创建一次。详见第 29 章。

JSX 插件默认不生成 PatchFlags。开启 `optimize: true` 后，它给部分节点加 PatchFlag，例如 `<p class={c}>{msg}</p>` 得到标记 2（`CLASS`）。但它从不生成 Block 和静态缓存，所以 diff 的范围仍是整棵树。点击 28.3 实验台里的“查看模板的编译结果”，可以看到真实的编译输出。

**什么时候用哪种写法。** 按下表选择：

| 场景 | 推荐 |
|---|---|
| 业务页面和大部分组件 | 模板。编译器自动优化。 |
| 标签或结构由数据决定，例如 h1 到 h6 | 渲染函数 |
| 组件库的底层组件，需要大量操作插槽 | 渲染函数或 JSX |
| 团队习惯 React，并使用 TSX 的类型检查 | JSX |

不要因为“渲染函数更快”而选它。它没有编译优化，更新通常更慢。先尝试模板，模板写不出来时再用渲染函数。

::: deep Vue JSX 和 React JSX 的区别
语法很像，运行方式不同：

| | Vue JSX | React JSX |
|---|---|---|
| 组件函数运行几次 | `setup` 一次，返回的渲染函数每次更新运行 | 每次渲染都运行整个函数 |
| 响应式 | 渲染函数里读到的 ref 自动成为依赖 | 状态变化后重新执行 |
| v-model | 内置 `v-model={x.value}` | 没有，手写 value 和 onChange |
| 插槽 | `v-slots` 或子节点对象，作用域插槽是函数 | `children` 和 render props |
| class | 写 `class` | 写 `className` |

把 React 的习惯带进来最常见的错误，是在 `setup` 顶层解构 `props` 或读取 ref 的值：`setup` 只运行一次，保存下来的只是当时的快照（28.3）。
:::

::: pitfalls
1. 不要在多个位置复用同一个 VNode 对象。每次都调用 h() 创建新的 VNode。原因：一个 VNode 只对应一个 DOM 元素。
2. 给组件传递插槽时，写函数，不要写 VNode 数组。否则 Vue 发出警告，并失去插槽的独立更新。
3. 在渲染函数内部读取 props 和 ref。不要在 setup 顶层读取并保存。否则界面不更新。
4. 不要因为“渲染函数更快”而选择它。原因：手写 h() 没有编译器优化，更新通常更慢。
5. 转发插槽时，不要写 `h(List, props, slots.item)`。函数会被当成默认插槽，List 读不到 `item`。写 `{ item: sp => slots.item?.(sp) }`，或者直接传 `slots`。
6. 不要把插槽函数提前调用再传下去（`{ item: slots.item?.() }`）。插槽要保持为函数，等子组件带着参数调用。
7. 逐项处理 `slots.default()` 时，别忘了 `v-for` 会产生一个 `Fragment`，所有列表项在它的 `children` 里。
:::

::: selfcheck
<Sc :a="2">

父组件把 `level` 从 2 改为 3。下面的组件显示什么？

```js
setup(props) {
  const level = props.level
  return () => h('h' + level, '标题')
}
```

<Opt>\<h3>标题\</h3></Opt>
<Opt>报错</Opt>
<Opt>仍然是 \<h2>标题\</h2></Opt>

<template #explain>

解析：level 在 setup 顶层读取一次，保存的是数字 2。渲染函数没有读取 props.level，所以它不是渲染的依赖。修复方法：在渲染函数内部写 'h' + props.level。

</template>
</Sc>

<Sc :a="0">

给组件 `MyButton` 传入默认插槽“保存”。哪种写法正确？

<Opt>h(MyButton, null, () => '保存')</Opt>
<Opt>h(MyButton, null, [h('span', '保存')])</Opt>
<Opt>h(MyButton, { slot: '保存' })</Opt>

<template #explain>

解析：组件的插槽写为函数。子组件调用这个函数时才创建内容，所以子组件可以单独更新插槽。传入 VNode 数组时，开发环境发出警告。slot 属性不是插槽。

</template>
</Sc>

<Sc :a="1">

用 `h('button', ...)` 给按钮绑定点击事件。props 中怎样写？

<Opt>{ click: fn }</Opt>
<Opt>{ onClick: fn }</Opt>
<Opt>{ '@click': fn }</Opt>

<template #explain>

解析：渲染函数中的事件写为 on 加首字母大写的事件名。@click 是模板语法，编译器把它转换为 onClick。

</template>
</Sc>

<Sc :a="1">

用 h() 给原生 input 实现 v-model。`text` 是 ref。哪种写法正确？

<Opt>{ 'v-model': text }</Opt>
<Opt>{ value: text.value, onInput: e => text.value = e.target.value }</Opt>
<Opt>{ modelValue: text.value, 'onUpdate:modelValue': v => text.value = v }</Opt>

<template #explain>

解析：渲染函数中没有指令语法，所以要自己写 value 和 onInput。v-model 由模板编译器处理。写成属性时，它只变成元素上一个普通的 HTML 属性。`modelValue` 和 `update:modelValue` 是组件的 v-model。原生 input 不发出 `update:modelValue` 事件，所以输入后 text 不变。

</template>
</Sc>

<Sc :a="1">

同一个组件分别用模板和 JSX 写。数据改变后，为什么模板版本通常更新得更快？

<Opt>JSX 每次更新都重建真实 DOM</Opt>
<Opt>编译器生成了 PatchFlag 等信息</Opt>
<Opt>只有模板中的数据是响应式的</Opt>

<template #explain>

解析：编译器知道模板中哪些部分是动态的。所以它生成 PatchFlags、Block Tree 和静态缓存。JSX 编译为普通的 h() 调用，没有这些信息。所以 diff 要比较所有节点和属性。JSX 也经过虚拟 DOM 和 diff，不重建全部真实 DOM。JSX 中读取的数据同样是响应式的。

</template>
</Sc>

<Sc :a="2">

回顾（第 6 章）：List 的模板中有 `<slot name="item" :item="it" />`。用 h() 使用 List 时，item 插槽怎样写？

<Opt>{ item: h('b', item.name) }</Opt>
<Opt>props 中写 item: (it) => h('b', it.name)</Opt>
<Opt>{ item: ({ item }) => h('b', item.name) }</Opt>

<template #explain>

解析：第 6 章：作用域插槽的数据由子组件传出。在 h() 中，插槽是第三个参数中的函数。List 调用这个函数，并把 slot 的属性作为参数传入，所以要解构 `{ item }`。直接传 VNode 时，没有参数可以接收数据，item 未定义。放在 props 中时，List 收到的是一个 prop，不是插槽。

</template>
</Sc>

<Sc :a="2">

下面是 28.6 节的函数式组件 Heading。父组件把 level 从 2 改为 3。结果是什么？

```js
function Heading(props, { slots }) {
  return h('h' + props.level, slots.default?.())
}
Heading.props = ['level']
// 父组件：<Heading :level="lv">标题</Heading>
```

<Opt>仍是 h2，函数式组件只渲染一次</Opt>
<Opt>报错，函数式组件不能接收新 props</Opt>
<Opt>Vue 再次调用 Heading，显示 h3</Opt>

<template #explain>

解析：函数式组件就是渲染函数。父组件更新时，Vue 用新的 props 再次调用 Heading。所以得到 h3。它没有实例和状态，但 props 改变时照常更新。“没有状态”的意思是：它不能用 ref 保存自己的数据，也没有生命周期钩子。函数式组件可以接收 props，props 改变时也不报错。

</template>
</Sc>

<Sc :a="0">

下面哪个 `h()` 调用得到的 `shapeFlag` 是 17？

<Opt>`h('div', [h('p')])`</Opt>
<Opt>`h('div', 'text')`</Opt>
<Opt>`h(MyComp, null, [h('p')])`</Opt>

<template #explain>

解析：`shapeFlag` 是类型位加子节点位。元素是 1，数组子节点是 16，加起来 17。第二项的文本子节点是 8，得到 9。第三项最迷惑：数组子节点也是 16，但 `MyComp` 是对象，类型位是 4，得到 20。同样是数组子节点，类型位不同，结果不同。

</template>
</Sc>

<Sc :a="1">

`Wrap` 是一个函数式组件，使用者给它传了 `item` 作用域插槽。`List` 的渲染函数读取 `slots.item`。`Wrap` 这样转发，结果是什么？

```js
const Wrap = (props, { slots }) => h(List, { items: props.items }, slots.item)
```

<Opt>正确转发，`List` 用传入的参数渲染 `item`</Opt>
<Opt>`slots.item` 被当成默认插槽，`List` 读不到 `item`</Opt>
<Opt>`h` 报错，第三个参数不能是函数</Opt>

<template #explain>

解析：第三个参数是函数时，`normalizeChildren` 把它包成 `{ default: fn }`。所以 `List` 收到的是默认插槽，`slots.item` 是 `undefined`。转发具名插槽要写成对象 `{ item: sp => slots.item?.(sp) }`。第一项以为插槽名会跟着函数走，函数本身没有名字。第三项错在 `h` 允许函数作为子节点，只是它的含义是默认插槽。

</template>
</Sc>

<Sc :a="2">

`mergeProps({ class: 'a', onClick: f1 }, { class: ['b'], onClick: f2, id: 'x' })` 返回什么？

<Opt>`{ class: ['b'], onClick: f2, id: 'x' }`，后一个整体覆盖前一个</Opt>
<Opt>`{ class: 'a b', onClick: f2, id: 'x' }`，只有 class 合并</Opt>
<Opt>`{ class: 'a b', onClick: [f1, f2], id: 'x' }`</Opt>

<template #explain>

解析：`mergeProps` 对三类属性有特殊处理。`class` 拼接成 `'a b'`，`style` 合并，同名的 `onXxx` 变成数组，两个函数都会被调用。其他属性（这里的 `id`）后者覆盖前者。第二项最迷惑：class 的合并是对的，但事件监听器不是覆盖，而是都保留。模板里的 `v-bind="obj" class="a"` 编译后就用了它。

</template>
</Sc>

<Sc :a="3">

组件 `Box` 的渲染函数返回 `h('div', slots.default?.())`。数据 `n` 变化后，Vue 对页面做了什么？

<Opt>销毁整个 Box 的真实 DOM，再按新的渲染结果重新创建</Opt>
<Opt>直接修改上一次的 vnode 对象，再把修改同步到 DOM</Opt>
<Opt>只重新计算 `n` 所在的那一个表达式，不运行渲染函数</Opt>
<Opt>再次运行渲染函数，得到新的 vnode 树，和上一棵比较，只修改有差别的 DOM</Opt>

<template #explain>

解析：数据变化后，渲染函数再运行一次，生成一棵新的 vnode 树。渲染器比较新旧两棵树，只修改有差别的真实 DOM。第一项描述的是“清空重建”，虚拟 DOM 正是为了避免它。第二项把 vnode 当成可变的状态，实际上每次更新都生成新对象。第三项是细粒度响应式（如 Vapor 模式）的做法，虚拟 DOM 模式下更新的单位是组件的渲染函数。

</template>
</Sc>

<Sc :a="1">

`SepList` 在渲染函数里对 `slots.default()` 返回的数组逐项插入分隔线。使用者这样写，渲染结果是什么？

```vue
<SepList>
  <p v-for="k in ['a', 'b', 'c']" :key="k">{{ k }}</p>
</SepList>
```

<Opt>`a`、`b`、`c` 三项之间各有一条分隔线</Opt>
<Opt>没有分隔线：数组只有一项，是包着三个 p 的 Fragment</Opt>
<Opt>报错：插槽里不能用 v-for</Opt>

<template #explain>

解析：插槽里的 `v-for` 编译成一个 `Fragment` vnode，三个 `p` 是它的子节点。所以 `slots.default()` 返回的数组只有一项，逐项插入分隔线时只有一项，不会插入。要先把 `Fragment` 展开成它的 `children`。第一项把 `v-for` 当成三个并列的顶层节点。第三项错在 `v-for` 在插槽里完全合法。

</template>
</Sc>

<Sc :a="0">

渲染器收到一个元素 vnode，它的 `shapeFlag` 是 9。`vnode.shapeFlag & 8` 的结果不是 0，说明什么？

<Opt>它的子节点是一段文字，可以直接设置元素的文字</Opt>
<Opt>它是函数式组件</Opt>
<Opt>它的子节点是数组，要逐个挂载</Opt>

<template #explain>

解析：8 是 `TEXT_CHILDREN`。`shapeFlag` 是 1（元素）加 8（文字子节点）。位与得到非 0，说明第 4 位（值 8）是 1：子节点是文字。判断数组子节点要用 16，函数式组件是 2。三个选项分别对应三个不同的位。

</template>
</Sc>

:::

::: summary
- vnode 是描述界面的普通对象。渲染函数返回 vnode 树，渲染器第一次按它创建 DOM；数据变化后，渲染函数再运行，渲染器比较新旧两棵树，只修改有差别的 DOM。模板是渲染函数的另一种写法。
- h(type, props, children) 创建 VNode。事件写为 onXxx。vnode 的主要字段是 `type`、`props`、`children`、`key`、`shapeFlag`、`el`、`component`。
- `type` 可以是字符串（元素）、对象（有状态组件）、函数（函数式组件），或 `Text`、`Comment`、`Fragment` 等符号。`shapeFlag` 是类型位加子节点位，创建时算出，渲染器用位运算分发。
- `h()` 的第二个参数是普通对象就当 props，是 vnode 或数组、字符串、函数就当子节点。
- setup 返回渲染函数。在渲染函数内部读取 props 和 ref。模板写不出来的动态结构，才用渲染函数。
- v-if 写为三元表达式，v-for 写为 map，v-model 写为值加事件。指令和修饰符对应 `withDirectives`、`withModifiers`、`withKeys`、`resolveComponent` 和 `mergeProps`。
- 插槽是返回 vnode 数组的函数，在子组件的渲染里才调用。所以依赖归子组件，子组件还能传参数。转发时保持为函数。
- 函数式组件是普通函数。它收到 props 和 { slots, emit, attrs }。列配置中的 render 函数常用它显示。
- JSX 编译成 createVNode 调用，没有 PatchFlags、Block 和静态缓存。业务组件优先用模板。
:::
