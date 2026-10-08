---
title: 渲染函数与 JSX
id: render
stage: 3
chapter: 14
desc: h()、函数式组件、JSX 的代价
---

<script setup>
import TemplateAndHToVNode from '../figures/14-render/TemplateAndHToVNode.vue'
import RenderTree from '../labs/14-render/RenderTree.vue'
import VNodeInspector from '../labs/14-render/VNodeInspector.vue'
</script>

# 渲染函数与 JSX

::: goals
<Goal checks="sc:1,sc:2,ex:renderFn,ex:hListFill">用 `h()` 写渲染函数。包括 props、事件和插槽。</Goal>
<Goal checks="sc:0,sc:3">用渲染函数实现 v-if、v-for 和 v-model。</Goal>
<Goal checks="sc:6,ex:fnComp">写一个函数式组件。</Goal>
<Goal checks="sc:4">说明 JSX 和模板在性能上的区别。</Goal>
<Goal checks="sc:7,ex:miniH">说明 `type` 和 `shapeFlag` 的含义，并手写一个会处理参数重载、算出 `shapeFlag` 的简化 `h()`。</Goal>
<Goal checks="sc:8,ex:scopedSlotForward">说明插槽为什么是函数，并用渲染函数接收和转发作用域插槽。</Goal>
<Goal checks="sc:9">说明模板里的指令、修饰符和 `v-bind` 在编译产物和 JSX 里对应什么函数。</Goal>

:::

::: rt
阅读主线约 24 分钟，深入内容约 2 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
模板像**填空表格**：格式固定，Vue 提前知道哪些格子会变。渲染函数像**手写信**：想写什么都可以，但 Vue 只能逐字检查哪里变了。
:::

::: terms
渲染函数（render）
: 返回虚拟节点的函数。

虚拟节点（VNode）
: 描述一个 DOM 元素的 JavaScript 对象。

h()
: 创建虚拟节点的函数。

函数式组件
: 没有实例和状态的组件。它是一个普通函数。

JSX
: 类似 HTML 的 JS 语法，编译为 h() 调用。

shapeFlag
: vnode 上的一个整数，每一位表示 vnode 的一个形态，例如元素、文本子节点。

Fragment
: 没有自己的元素、只包含一组子节点的 vnode 类型。

插槽对象
: 组件 vnode 的子节点：键是插槽名，值是返回 vnode 数组的函数。
:::

::: why
你写一个组件库的 List 组件。它要在默认插槽的每一项之间插入分隔线。用模板写时，你只能把整个 `<slot>` 放在一处，不能逐项处理。

原因：模板描述固定的结构。它不能把插槽内容当作数据来读取和修改。

本章用渲染函数 h() 和 JSX。你用 JavaScript 读取、组合和创建节点。
:::

模板最终编译为渲染函数。渲染函数返回虚拟节点（VNode）。你也可以直接写渲染函数。

下图显示两种写法得到同一种 VNode 树。

<Figure caption="模板和 h() 都得到同一种 VNode 树。写渲染函数时，你跳过 ①，直接写 ②。">
<TemplateAndHToVNode />
</Figure>

`h()` 创建虚拟节点。它的参数如下：

```js
h(type, props?, children?)

// type：标签名、组件对象或异步组件
h('div')
h('div', { id: 'app', class: ['card', { active: isActive }] })
h('div', 'hello')                                   // 没有 props 时，可以省略第二个参数
h('ul', [h('li', 'a'), h('li', 'b')])               // children 是数组
h('input', { value: text, onInput: e => text = e.target.value })   // 事件：on + 首字母大写
h(MyButton, { size: 'small', onClick: save }, () => '保存')        // 组件：children 用函数
```

props 中的属性规则如下：

- `class` 和 `style` 接受字符串、数组和对象。
- 事件写为 `onXxx`。例如 `onClick`、`onUpdate:modelValue`。
- DOM 属性和组件 props 写在同一个对象中。

`h('p', { class: 'x' }, 'hi')` 返回一个普通对象。下面只列常用字段：

```js
{
  type: 'p',               // 标签名或组件对象
  props: { class: 'x' },
  children: 'hi',          // 文字、数组或插槽对象
  key: null,
  el: null,                // 挂载后指向真实 DOM
  shapeFlag: 9,            // ELEMENT | TEXT_CHILDREN：这个节点和它的子节点是什么形态
  patchFlag: 0,            // 手写 h() 没有标记（第 29 章）
  dynamicChildren: null,   // 只有编译器生成的 Block 才有（第 29 章）
  component: null          // 组件 vnode 挂载后指向组件实例
}
```

后面的章节会用到这些字段。第 17 章读 `patchFlag` 和 `dynamicChildren`。第 18 章读 `type`、`key` 和 `el`，用它们判断两个节点能否复用。第 29、30 章读 `el`，它就是 vnode 对应的 DOM 节点。

### 14.1 在 setup 中返回渲染函数

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

不要在 setup 的顶层读取 `props.level` 并保存。在渲染函数内部读取它，Vue 才能跟踪它。

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

### 14.2 模板语法的对应写法

| 模板 | 渲染函数 |
|---|---|
| `v-if / v-else` | `ok ? h(A) : h(B)` |
| `v-for` | `list.map(it => h('li', { key: it.id }, it.name))` |
| `v-show` | `h('div', { style: { display: ok ? '' : 'none' } })` |
| `@click.stop` | `onClick: withModifiers(fn, ['stop'])` |
| `v-model`（组件） | `{ modelValue: v.value, 'onUpdate:modelValue': x => v.value = x }` |
| `v-model`（input） | `{ value: v.value, onInput: e => v.value = e.target.value }` |
| `<slot name="x" :item="it">` | `slots.x?.({ item: it })` |
| 自定义指令 | `withDirectives(h('input'), [[vFocus]])` |
| `<component :is="c">` | `h(c)` |

下面两道练习用 h() 渲染列表和动态标题。对照上表写 v-for 和事件。

<Exercise id="hListFill" />

<Exercise id="renderFn" />

### 14.3 向组件传递插槽

给组件传递插槽时，第三个参数写为一个对象。对象的每个属性是一个返回 VNode 的函数。

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

插槽必须写为函数。子组件调用这个函数时，才创建插槽内容。这样子组件可以单独更新插槽。

### 14.4 函数式组件

函数式组件是一个普通函数。它没有实例、没有状态，也没有生命周期。它收到 props 和一个上下文对象。

```js
function Heading(props, { slots, emit, attrs }) {
  return h('h' + props.level, { onClick: () => emit('pick', props.level) }, slots.default?.())
}
Heading.props = ['level']        // 声明 props。不声明时，所有属性都在 attrs 中
Heading.emits = ['pick']

// 使用：<Heading :level="2" @pick="onPick">标题</Heading>
```

Vue 3 中，函数式组件和普通组件的性能差别很小。只在组件确实没有状态时使用它。

**props 和 emits 的声明。**声明写在函数上：`Heading.props = ['level']`，`Heading.emits = ['pick']`。实测的规则：

- 不声明 `props` 时，`props` 和 `attrs` 是同一批数据（传入的全部属性）。只有 `class`、`style` 和 `onXxx` 会落到根元素上。
- 声明 `props` 后，`props` 只含声明的键。其余属性（例如 `title`）在 `attrs` 里，并落到根元素上。
- 声明 `emits` 后，`onPick` 不再出现在 `attrs` 里，不会当作普通监听器落到根元素。不声明，`emit('pick')` 仍然能调用到父组件的 `onPick`。

**什么时候值得用。**组件只是把 props 和插槽变成 vnode：没有 `ref`，没有 `watch`，没有生命周期钩子，也不需要 `expose`。表格单元格、图标和简单的包装组件是典型场景。需要其中任何一项，就用普通组件。

**场景：任务表格的状态列显示徽章，操作列显示按钮。**很多表格组件让你在列配置中写 render 函数。列配置是 JavaScript 数据，不能写模板。render 函数用 h() 返回 VNode。

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

自己写 TaskTable 时，用一个函数式组件 Cell 显示这些 VNode。没有 render 的列显示原始字段。在 `<script setup>` 顶层定义 Cell，模板就可以使用它。

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

### 14.5 JSX

JSX 是渲染函数的另一种写法。在 Vite 项目中，按下面的步骤启用它：

1. 安装 `@vitejs/plugin-vue-jsx`。
2. 在 vite.config 的 plugins 中加入 `vueJsx()`。
3. 把文件命名为 `.jsx` 或 `.tsx`。

```vue
// Heading.tsx
export default defineComponent({
  props: { level: { type: Number, default: 2 } },
  setup(props, { slots }) {
    const items = ref(['a', 'b'])
    const text = ref('')
    return () => {
      const Tag = `h${props.level}`                  // 在渲染函数内部计算。level 改变时更新
      return (
        <div>
          <Tag class="title">{slots.default?.()}</Tag>
          <ul>{items.value.map(it => <li key={it}>{it}</li>)}</ul>
          <input v-model={text.value} />               {/* 插件支持 v-model */}
          <MyList v-slots={{ empty: () => '没有数据' }} />
        </div>
      )
    }
  }
})
```

JSX 中的变量 Tag 以大写字母开头。插件因此把它当作组件或动态标签，而不是字符串 "Tag"。

### 14.6 选择模板、渲染函数或 JSX

编译器分析模板，提前标记会改变的部分。手写的 h() 和 JSX 没有这些标记。所以 Vue 要比较所有节点和属性，更新通常更慢。按下表选择：

| 场景 | 推荐 |
|---|---|
| 业务页面和大部分组件 | 模板。编译器自动优化。 |
| 标签或结构由数据决定，例如 h1 到 h6 | 渲染函数 |
| 组件库的底层组件，需要大量操作插槽 | 渲染函数或 JSX |
| 团队习惯 React，并使用 TSX 的类型检查 | JSX |

模板也可以处理大部分动态结构。例如 `<component :is="'h' + level">`。先尝试模板，模板写不出来时再用渲染函数。

::: deep JSX 和手写 h() 的代价
编译器编译模板时，知道哪些部分是静态的。它生成三种优化信息（[第 17 章](/chapters/17-compiler)详细讲）：

- **PatchFlags**：标记节点的哪些部分是动态的。例如只有文字或只有 class。
- **Block Tree**：根节点收集所有动态后代。diff 时只比较这些节点。
- **静态缓存**：静态节点只创建一次。

Vue 的 JSX 插件默认不生成 PatchFlags。开启 `optimize` 选项后，它为部分节点生成 PatchFlags。它从不生成 Block 和静态缓存。

```js
// 模板：<div><p>{{ msg }}</p><span>static</span></div>
return (_openBlock(), _createElementBlock("div", null, [
  _createElementVNode("p", null, _toDisplayString(msg), 1 /* TEXT */),   // 只比较文字
  _cache[0] || (_cache[0] = _createElementVNode("span", null, "static", -1 /* CACHED */))
]))

// 同样的结构写成 h()：没有标记。每次都创建并比较所有节点
return h('div', [h('p', msg), h('span', 'static')])
```

在 14.1 的实验台中点击“查看模板的编译结果”，可以看到真实的编译输出。
:::

### 14.7 VNode 的 type 和 shapeFlag

本章开头列过 vnode 的字段。这一节讲其中最重要的两个：`type` 说明它是什么，`shapeFlag` 把它的形态压成一个整数。

`type` 有这几种取值：

| type | 含义 | 从哪里来 |
|---|---|---|
| 字符串，如 `'div'` | 元素 | `h('div')` |
| 对象（有 `render` 或 `setup`） | 有状态组件 | `h(MyComp)` |
| 函数 | 函数式组件 | `h(Heading)` |
| `Fragment` | 没有自己元素的一组子节点 | 渲染函数返回数组时自动生成，也可以 `h(Fragment, [...])` |
| `Text`、`Comment` | 文本节点、注释节点 | 子节点是字符串、`null`、`false` 时自动生成 |
| `Static` | 一大段静态 HTML | 只由编译器生成：连续的静态节点太多时，序列化成 HTML 字符串一次插入（实测 20 个静态 `<p>` 得到 `createStaticVNode`）。手写不用 |
| `Teleport`、`Suspense` | 内置组件 | `h(Teleport, { to: 'body' }, ...)`（第 31 章） |

`shapeFlag` 是一个整数，每一位表示一个事实。`patch` 只用一次位运算就能判断，不用逐个比较（第 19 章讲 `patch` 怎样分发）。

| 位 | 值 | 含义 |
|---|---|---|
| `ELEMENT` | 1 | 元素 |
| `FUNCTIONAL_COMPONENT` | 2 | 函数式组件 |
| `STATEFUL_COMPONENT` | 4 | 有状态组件。`COMPONENT` 是 2 和 4 的合称，值为 6 |
| `TEXT_CHILDREN` | 8 | 子节点是一段文字 |
| `ARRAY_CHILDREN` | 16 | 子节点是数组 |
| `SLOTS_CHILDREN` | 32 | 子节点是插槽对象 |
| `TELEPORT`、`SUSPENSE` | 64、128 | 内置组件 |
| `COMPONENT_SHOULD_KEEP_ALIVE`、`COMPONENT_KEPT_ALIVE` | 256、512 | 被 KeepAlive 缓存的组件用 |

`createVNode` 分两步算出它：先按 `type` 得到类型位，再由 `normalizeChildren` 按子节点的种类用位或（`|=`）加上子节点位。

```js
// runtime-core/vnode.ts（简化）
function createVNode(type, props, children) {
  const shapeFlag = isString(type) ? ELEMENT
    : isSuspense(type) ? SUSPENSE
    : isTeleport(type) ? TELEPORT
    : isObject(type) ? STATEFUL_COMPONENT
    : isFunction(type) ? FUNCTIONAL_COMPONENT : 0     // Fragment、Text、Comment 是符号，类型位是 0
  const vnode = { type, props, children: null, shapeFlag, /* … */ }
  normalizeChildren(vnode, children)                 // 见 28.8
  return vnode
}
```

下面是在 Vue 3.5.43 里实测的结果：

| 调用 | shapeFlag | 拆开 |
|---|---|---|
| `h('div')` | 1 | ELEMENT |
| `h('div', 'hi')` | 9 | ELEMENT + TEXT_CHILDREN |
| `h('div', [h('p')])` | 17 | ELEMENT + ARRAY_CHILDREN |
| `h(Comp, null, () => 'x')` | 36 | STATEFUL_COMPONENT + SLOTS_CHILDREN |
| `h(Heading)`（函数） | 2 | FUNCTIONAL_COMPONENT |
| `h(Fragment, [...])` | 16 | 只有 ARRAY_CHILDREN |
| `h(Teleport, { to }, [...])` | 80 | TELEPORT + ARRAY_CHILDREN |
| `h(Suspense, null, { default })` | 160 | SUSPENSE + SLOTS_CHILDREN |

挂载时 `shapeFlag` 立刻有用：`mountElement` 看 `TEXT_CHILDREN` 就直接设置文字，看 `ARRAY_CHILDREN` 才逐个挂载子节点。下面的检查器运行真实的 `h()`，显示 vnode 的每一部分。

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

### 14.8 子节点的规范化和 h() 的参数

**h() 的参数重载。**`h` 的第二个参数可能是 props，也可能是子节点。规则在 `runtime-core/h.ts` 里：

1. 只有两个参数：第二个是普通对象，就当 props；第二个是 vnode，当作唯一的子节点；其余（字符串、数组、函数）当子节点。
2. 三个参数：第三个是单个 vnode 时，包成数组。
3. 超过三个参数：第三个起全是子节点，收成数组。

```js
h('div', { id: 'a' })           // props
h('div', h('p'))                // 子节点 [vnode]，shapeFlag 17
h('div', null, 'a', 'b')        // 子节点 ['a', 'b']，shapeFlag 17
h('div', null, 123)             // 数字转成字符串 '123'，shapeFlag 9
```

**normalizeChildren。**`createVNode` 把子节点规范化成四种形态之一：

| 传入 | children 变成 | 加上的位 |
|---|---|---|
| `null` | `null` | 无 |
| 数组 | 原数组 | `ARRAY_CHILDREN` |
| 字符串、数字 | 字符串 | `TEXT_CHILDREN` |
| 函数（给组件） | `{ default: fn, _ctx }` | `SLOTS_CHILDREN` |
| 对象（给组件） | 原对象，加上 `_ctx` | `SLOTS_CHILDREN` |

给元素传对象或函数时，`normalizeChildren` 取出 `default` 插槽并调用它，当作子节点处理。

**渲染时再规范化。**数组里的每一项在挂载时还要过一遍 `normalizeVNode`：`null` 和布尔值变成 `Comment` 节点，数组变成 `Fragment`，字符串和数字变成 `Text` 节点，已经挂载过的 vnode 先克隆。所以下面的写法合法：

```js
h('div', [cond && h('p', 'yes'), 'tail', [h('i'), h('b')]])
//         false → 注释节点     文本节点   数组 → Fragment
```

**key 和 ref。**`key` 取自 props，放在 `vnode.key` 上，第 18 章的 diff 用它判断两个节点能否复用。`ref` 也取自 props。字符串、ref 对象和函数会被包成 `{ i, r, k, f }`：`i` 是创建它的组件实例，`r` 是 ref 本身。所以渲染函数里这两种写法都有效：

```js
h('input', { ref: inputRef })        // ref 对象：挂载后 inputRef.value 是元素
h('input', { ref: 'box' })           // 字符串：配合 useTemplateRef('box')
```

**为什么一个 vnode 不能放在树里两次。**vnode 不只是描述，它还记录运行结果：挂载后 `el` 指向真实 DOM，组件 vnode 的 `component` 指向实例。一个对象存不下两份 DOM。官方文档要求树里的 vnode 必须唯一。Vue 3.5 的渲染器在挂载时发现 vnode 已经有 `el`，会先 `cloneVNode` 复制一份，所以实测 `[v, v]` 能渲染出两个元素。这是实现细节，不要依赖。写工厂函数，每次调用 `h()`。

`cloneVNode(vnode, extraProps)` 复制一个 vnode，并把额外的 props 合并进去。给插槽内容统一加 class 就用它：

```js
slots.default().map(vn => cloneVNode(vn, { class: 'item' }))
// <b>x</b> 变成 <b class="item">x</b>；原本有 class 的合并成 "own item"
```

下面的练习把 14.7 和 14.8 合起来：写一个简化的 `h()`。

<Exercise id="miniH" />

### 14.9 插槽为什么是函数

给组件传子节点时，`normalizeChildren` 得到的是插槽对象。对象的每个键是一个插槽名，每个值是返回 vnode 数组的函数。模板里的 `<template #item="{ item }">` 编译后就是这样：

```js
// 编译产物（节选）
_createBlock(_component_Comp, null, {
  item: _withCtx(({ item }) => [ _createTextVNode(_toDisplayString(item), 1) ]),
  empty: _withCtx(() => [ _createTextVNode("none") ]),
  _: 1 /* STABLE */
})
```

**数据流。**

1. 父组件的渲染函数创建组件 vnode，`children` 是插槽对象，`shapeFlag` 带 `SLOTS_CHILDREN`。
2. 子组件实例化时，`initSlots` 把它存成 `instance.slots`。这就是 `setup` 里的 `slots`、选项式里的 `this.$slots`、模板里的 `$slots`。
3. 子组件的渲染函数调用 `slots.default?.()`。模板里的 `<slot>` 编译成 `renderSlot(...)`，也是调用这个函数。
4. 函数返回 vnode 数组，成为子组件 vnode 树的一部分。

**为什么要延迟调用。**插槽函数在子组件的渲染里才运行，带来两个结果。

第一，依赖归子组件。插槽里读的响应式数据，被子组件的渲染副作用函数收集，数据变化时只有子组件重新渲染。实测：

```js
h(Child, null, { default: () => h('b', dep.value) })
// dep.value++ 后的日志： Child render → slot fn runs     没有 Parent render
```

第二，子组件能把数据传给插槽。`slots.item?.({ item, index })` 调用函数时带上参数，父组件那边的函数用参数渲染内容，这就是作用域插槽。如果传的是数组，数组在父组件的渲染里已经创建完，读到的数据归父组件，子组件无法传参，也没有独立更新。（第 19 章讲了手写 `h()` 传插槽函数时，还要加 `$stable: true` 才不会在父组件更新时连带更新子组件。）

**在渲染函数里给组件传插槽。**

| 写法 | 结果 |
|---|---|
| `h(Box, null, { default: () => h('b') })` | 正确。 |
| `h(Box, null, () => 'text')` | 正确。单个函数就是默认插槽。 |
| `h(Box, null, [h('b')])` | 开发环境警告 `Non-function value encountered for default slot. Prefer function slots for better performance.` 内容仍会显示，但失去上面两个好处。 |
| `h(Box, null, { default: [h('b')] })` | 同样的警告，提示里是 `slot "default"`。 |

**读取插槽。**`slots.default` 没传时是 `undefined`，所以写 `slots.default?.()`。`renderSlot(slots, name, props, fallback)` 是模板里 `<slot>` 的实现：插槽没传，或者返回的全是注释节点（例如里面的 `v-if` 为假）时，显示 `fallback`。手写渲染函数多数情况下直接调用 `slots.name?.(props)` 就够了，需要后备内容时再用它。

**转发作用域插槽。**包装组件要把自己收到的插槽交给内层组件，有三种写法，实测结果相同：

```js
h(List, { items }, { item: sp => slots.item?.(sp) })         // 参数原样传下去
h(List, { items }, slots)                                      // 整个插槽对象转发
h(List, { items }, { item: sp => renderSlot(slots, 'item', sp) })
```

常见错误是 `h(List, { items }, slots.item)`：函数被当成默认插槽，List 读不到 `item`。另一个是 `{ item: slots.item?.() }`：提前调用了，而且没有参数。

<Exercise id="scopedSlotForward" />

### 14.10 渲染函数里的指令和内置函数

模板编译器把指令展开成对运行时函数的调用，这些函数都从 `vue` 导出。写渲染函数，或者读编译产物时，会遇到它们。

| 模板 | 编译产物 |
|---|---|
| `@click.stop="go"` | `onClick: withModifiers(go, ['stop'])` |
| `@keyup.enter="ok"` | `onKeyup: withKeys(ok, ['enter'])` |
| `<MyInput v-model="text" />` | `{ modelValue: text, 'onUpdate:modelValue': $event => text = $event }` |
| `<MyInput v-model:title.trim="t" />` | `{ title: t, 'onUpdate:title': …, titleModifiers: { trim: true } }` |
| `<input v-model="text">` | `withDirectives(h('input', { 'onUpdate:modelValue': … }), [[vModelText, text]])` |
| `<div v-focus:arg.mod="v">` | `withDirectives(h('div'), [[focus, v, 'arg', { mod: true }]])` |
| `<Comp>`（没有导入的组件） | `resolveComponent('Comp')` |
| `v-bind="obj" class="a"` | `mergeProps(obj, { class: 'a' })` |

几点说明：

- 14.2 节的表给的原生 `input` 写法（`value` 加 `onInput`）能用。编译器生成的是 `vModelText` 指令。它还处理输入法：拼音输入的过程中不更新数据。`v-show` 同理，编译器用 `vShow` 指令，它会记住元素原来的 `display`。
- `withDirectives(vnode, [[指令, 值, 参数, 修饰符]])` 把指令记在 `vnode.dirs` 上。指令对象的钩子（`mounted`、`updated`……）由渲染器在对应时机调用。
- `resolveComponent('Name')` 先找当前组件的 `components`，再找全局 `app.component` 注册的。找不到时返回名字字符串，并警告 `Failed to resolve component`。它只能在 `setup` 或渲染函数里调用。直接 `import` 组件时用不到它。
- `mergeProps` 合并多组 props：`class` 拼接，`style` 合并，同名的 `onXxx` 变成数组，两个函数都会调用，其他属性后者覆盖前者。实测 `mergeProps({ class: 'a', onClick: f1 }, { class: ['b'], onClick: f2 })` 得到 `class: 'a b'` 和 `onClick: [f1, f2]`。

### 14.11 JSX 编译成什么

14.5 节用 JSX 写了组件。这一节看 `@vue/babel-plugin-jsx` 把它编译成什么（用 3.0.0 版实测）。JSX 编译成的就是上面几节的函数调用，只是没有模板编译器的优化。

| JSX | 编译产物 |
|---|---|
| `<div id="a" class={c}><p>{msg}</p></div>` | `createVNode("div", { id: "a", class: c }, [createVNode("p", null, [msg])])` |
| `<MyList items={list}>text</MyList>` | `createVNode(MyList, { items: list }, { default: () => [createTextVNode("text")] })` |
| `<MyList v-slots={{ empty: () => 'none' }} />` | `createVNode(MyList, null, { empty: () => 'none' })` |
| `<MyList>{{ item: ({ item }) => <b>{item}</b> }}</MyList>` | 子节点对象直接成为插槽对象 |
| `<input v-model={t.value} />` | `withDirectives(createVNode("input", { "onUpdate:modelValue": $event => t.value = $event }), [[vModelText, t.value]])` |
| `<MyInput v-model:title={t.value} />` | `{ title: t.value, "onUpdate:title": … }` |
| `<div v-show={ok} v-focus={v} />` | `withDirectives(…, [[vShow, ok], [resolveDirective("focus"), v]])` |
| `<>…</>` | `createVNode(Fragment, null, [...])` |
| `<div {...obj} class="x" />` | `createVNode("div", mergeProps(obj, { class: "x" }))` |

三点要记住：

- 组件的 JSX 子节点自动包成 `{ default: () => [...] }`，所以不用自己写函数。要传具名或作用域插槽，用 `v-slots` 或子节点对象。
- 标签名如果是作用域里的变量（`import` 的组件、`const Tag = 'h' + level`），直接引用变量。没有这个变量时才用 `resolveComponent("名字")`。
- 事件是普通 prop：`onClick={fn}`。修饰符自己调用 `withModifiers`。

**少了哪些优化。**对照 14.6 节深入块里的模板产物：同样的 `<div><p>{msg}</p><span>static</span></div>`，JSX 的产物没有 `TEXT` 标记，没有 `openBlock`/`createElementBlock`，静态的 `span` 也没有缓存，每次渲染都新建。打开 `optimize: true`，插件会给部分节点加 PatchFlag：`<p class={c}>{msg}</p>` 得到标记 2（`CLASS`），`<div class="x" onClick={f} />` 得到标记 8 和 `["onClick"]`（`PROPS`）。但它仍然没有 Block 和静态缓存，所以 diff 的范围仍是整棵树（第 17 章）。

**和 React JSX 的区别。**语法很像，运行方式不同：

| | Vue JSX | React JSX |
|---|---|---|
| 组件函数运行几次 | `setup` 一次，返回的渲染函数每次更新运行 | 每次渲染都运行整个函数 |
| 响应式 | 渲染函数里读到的 ref 自动成为依赖 | 状态变化后重新执行 |
| v-model | 内置 `v-model={x.value}` | 没有，手写 value 和 onChange |
| 插槽 | `v-slots` 或子节点对象，作用域插槽是函数 | `children` 和 render props |
| class | 写 `class` | 写 `className` |

把 React 的习惯带进来最常见的错误，是在 `setup` 顶层解构 `props` 或读取 ref 的值：`setup` 只运行一次，保存下来的只是当时的快照（14.1 节）。

::: pitfalls
1. 不要在多个位置复用同一个 VNode 对象。每次都调用 h() 创建新的 VNode。原因：一个 VNode 只对应一个 DOM 元素。
2. 给组件传递插槽时，写函数，不要写 VNode 数组。否则 Vue 发出警告，并失去插槽的独立更新。
3. 在渲染函数内部读取 props 和 ref。不要在 setup 顶层读取并保存。否则界面不更新。
4. 不要因为“渲染函数更快”而选择它。原因：手写 h() 没有编译器优化，更新通常更慢。
5. 转发插槽时，不要写 `h(List, props, slots.item)`。函数会被当成默认插槽，List 读不到 `item`。写 `{ item: sp => slots.item?.(sp) }`，或者直接传 `slots`。
6. 不要把插槽函数提前调用再传下去（`{ item: slots.item?.() }`）。插槽要保持为函数，等子组件带着参数调用。
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

回顾（第 5 章）：List 的模板中有 `<slot name="item" :item="it" />`。用 h() 使用 List 时，item 插槽怎样写？

<Opt>{ item: h('b', item.name) }</Opt>
<Opt>props 中写 item: (it) => h('b', it.name)</Opt>
<Opt>{ item: ({ item }) => h('b', item.name) }</Opt>

<template #explain>

解析：第 5 章：作用域插槽的数据由子组件传出。在 h() 中，插槽是第三个参数中的函数。List 调用这个函数，并把 slot 的属性作为参数传入，所以要解构 `{ item }`。直接传 VNode 时，没有参数可以接收数据，item 未定义。放在 props 中时，List 收到的是一个 prop，不是插槽。

</template>
</Sc>

<Sc :a="2">

下面是 14.4 节的函数式组件 Heading。父组件把 level 从 2 改为 3。结果是什么？

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

:::

::: summary
- h(type, props, children) 创建 VNode。事件写为 onXxx。
- setup 返回渲染函数。在渲染函数内部读取 props 和 ref。
- v-if 写为三元表达式，v-for 写为 map，v-model 写为值加事件。
- 组件的插槽传为函数对象，例如 { default: () => ... }。
- 函数式组件是普通函数。它收到 props 和 { slots, emit, attrs }。列配置中的 render 函数常用它显示。
- JSX 是渲染函数的另一种写法。模板有 PatchFlags 和 Block Tree，h() 和 JSX 没有。业务组件优先用模板。
- vnode 的 `type` 可以是字符串、对象、函数，或 `Fragment`、`Text`、`Comment`、`Static`、`Teleport`、`Suspense`。`shapeFlag` 是类型位加子节点位，`createVNode` 时算出，`patch` 用位运算分发。
- `h()` 的第二个参数是普通对象就当 props，是 vnode 或数组、字符串、函数就当子节点。子节点规范化成 null、文本、数组或插槽对象。
- 插槽是返回 vnode 数组的函数，在子组件的渲染里才调用。所以依赖归子组件，子组件还能传参数。在渲染函数里传插槽写函数或函数对象，转发时保持为函数。
- 指令和修饰符在渲染函数里是 `withDirectives`、`withModifiers`、`withKeys`、`resolveComponent` 和 `mergeProps`。JSX 编译成的就是这些调用，没有 Block 和静态缓存。
:::
