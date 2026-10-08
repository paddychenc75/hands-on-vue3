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
</script>

# 渲染函数与 JSX

::: goals
<Goal checks="sc:1,sc:2,ex:renderFn,ex:hListFill">用 `h()` 写渲染函数。包括 props、事件和插槽。</Goal>
<Goal checks="sc:0,sc:3">用渲染函数实现 v-if、v-for 和 v-model。</Goal>
<Goal checks="sc:6,ex:fnComp">写一个函数式组件。</Goal>
<Goal checks="sc:4">说明 JSX 和模板在性能上的区别。</Goal>

:::

::: rt
阅读主线约 13 分钟，深入内容约 2 分钟（可选）。另外留时间做实验台、练习和自测。
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
  patchFlag: 0,            // 手写 h() 没有标记（第 15 章）
  dynamicChildren: null,   // 只有编译器生成的 Block 才有（第 15 章）
  component: null          // 组件 vnode 挂载后指向组件实例
}
```

后面的章节会用到这些字段。第 15 章读 `patchFlag` 和 `dynamicChildren`。第 16 章读 `type`、`key` 和 `el`，用它们判断两个节点能否复用。第 24、25 章读 `el`，它就是 vnode 对应的 DOM 节点。

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
编译器编译模板时，知道哪些部分是静态的。它生成三种优化信息（[第 15 章](/chapters/15-compiler)详细讲）：

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

::: pitfalls
1. 不要在多个位置复用同一个 VNode 对象。每次都调用 h() 创建新的 VNode。原因：一个 VNode 只对应一个 DOM 元素。
2. 给组件传递插槽时，写函数，不要写 VNode 数组。否则 Vue 发出警告，并失去插槽的独立更新。
3. 在渲染函数内部读取 props 和 ref。不要在 setup 顶层读取并保存。否则界面不更新。
4. 不要因为“渲染函数更快”而选择它。原因：手写 h() 没有编译器优化，更新通常更慢。
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

:::

::: summary
- h(type, props, children) 创建 VNode。事件写为 onXxx。
- setup 返回渲染函数。在渲染函数内部读取 props 和 ref。
- v-if 写为三元表达式，v-for 写为 map，v-model 写为值加事件。
- 组件的插槽传为函数对象，例如 { default: () => ... }。
- 函数式组件是普通函数。它收到 props 和 { slots, emit, attrs }。列配置中的 render 函数常用它显示。
- JSX 是渲染函数的另一种写法。模板有 PatchFlags 和 Block Tree，h() 和 JSX 没有。业务组件优先用模板。
:::
