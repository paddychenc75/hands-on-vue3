---
title: 第一个 Vue 应用
id: first
stage: 1
chapter: 1
desc: 声明式渲染、createApp、单文件组件
---

<script setup>
import ImperativeVsDeclarative from '../figures/01-first/ImperativeVsDeclarative.vue'
</script>

# 第一个 Vue 应用

::: goals
<Goal checks="sc:2">说明命令式和声明式的区别。</Goal>
<Goal checks="sc:0,sc:1,ex:counter,ex:firstFill">用 `createApp` 和 `ref` 写一个计数器。</Goal>
<Goal checks="sc:3">说明 `.vue` 文件的三个部分。</Goal>

:::

::: rt
阅读主线约 7 分钟，深入内容约 2 分钟（可选）。另外留时间做练习和自测。
:::

::: analogy
原生 JS 写界面像**亲手搬家具**：每次状态变了，你都要找到 DOM 节点，自己改文字、改样式。

Vue 像**给装修队一张图纸**：你只描述“数据是这样时，页面长这样”，数据变了，Vue 负责把页面改成图纸上的样子。
:::

::: terms
声明式
: 描述“数据是这样时页面是什么样”，由 Vue 修改 DOM。

响应式数据
: Vue 跟踪读写的数据。数据改变时，Vue 更新页面。

组件
: 有自己的模板、数据和逻辑的可复用单元。

挂载
: 把组件加入页面。

单文件组件
: .vue 文件，有 template、script、style 三部分。
:::

::: why
你用原生 JS 写了一个计数器。页面上有两处显示次数。点击后，一处变成 1，另一处还是 0。

原因：数据每次改变，你都要手写代码修改每个相关节点。漏改一处，页面就显示旧数据。

本章用 Vue 的声明式渲染。你只写数据和模板，Vue 修改 DOM。
:::

### 1.1 命令式和声明式

下面是同一个计数器的两种写法。

:::: pair
::: col 原生 JS（命令式）：代码说明每一步操作。
```js
let count = 0
const btn = document.querySelector('#btn')
const label = document.querySelector('#label')
btn.addEventListener('click', () => {
  count++
  label.textContent = `点了 ${count} 次`  // 手动更新文字
  if (count > 5) label.style.color = 'red'
})
```
:::
::: col Vue（声明式）：代码只说明结果。
```vue
// 模板：说明页面的结构
<button @click="count++">+1</button>
<p :style="{ color: count > 5 ? 'red' : '' }">
  点了 {{ count }} 次
</p>

// 脚本：只管理数据
const count = ref(0)
```
:::
::::

下图比较两种写法怎样更新页面。

<Figure caption="命令式代码自己修改每个节点。声明式代码只修改数据，Vue 按模板更新 DOM。">
<ImperativeVsDeclarative />
</Figure>

Vue 代码不查找节点，也不修改文字。你只修改 `count`。模板读取了 count，所以 Vue 自动更新页面。这个功能叫作响应式。

### 1.2 createApp 和 mount：写一个最小的 Vue 应用

`createApp` 创建一个应用。`mount` 把应用放到页面上的一个元素中。之后，这个元素中的内容由 Vue 管理。

```html
<div id="app">
  <button @click="count++">点了 {{ count }} 次</button>
</div>

<script type="importmap">
  { "imports": { "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js" } }
</script>
<script type="module">
import { createApp, ref } from 'vue'

createApp({
  setup() {
    const count = ref(0)   // 创建响应式数据，初始值为 0
    return { count }       // 把 count 给模板使用
  }
}).mount('#app')           // 把应用挂载到 #app 元素
</script>
```

这段代码有三个部分：

1. `createApp` 创建应用。
2. `setup()` 创建数据，并用 `return` 把数据给模板。
3. `mount('#app')` 把应用挂载到页面上的一个元素。

这个页面不经过构建工具，所以用 import map 告诉浏览器 `'vue'` 在哪里。它指向的 `vue.esm-browser.js` 带有编译器，能在浏览器中编译 `#app` 里的模板。用 Vite 创建的项目（1.4 节）不需要这两步。

<b>场景：旧页面中只有一块区域用 Vue。</b>后台页面由服务器生成。你只想让购物车小部件变为响应式。给这块区域一个 id，只挂载到这里。页面的其他部分不变。一个页面可以有多个应用。

```js
createApp(CartWidget).mount('#cart')       // 只管理 #cart 中的内容
createApp(SearchBox).mount('#search')      // 另一个独立的应用
```

::: note
直接写在 HTML 文件里的模板由浏览器先解析，有三个限制：

1. 标签名和属性名都变成小写。所以组件和 prop 要写成 `<task-item post-title="...">`，写 `:postTitle` 会丢失。
2. 组件标签不能自闭合。写 `<task-item></task-item>`。
3. `<table>`、`<ul>`、`<select>` 里放组件时，写成 `<tr is="vue:task-row">`。直接写 `<task-row>` 会被浏览器移到表格外面。

写在 `.vue` 文件里的模板没有这些限制（1.4 节）。
:::

::: deep mount 之后发生了什么
`app.mount('#app')` 按下面的顺序运行：

1. `createVNode(根组件)` 创建根虚拟节点。
2. `render(vnode, 容器)` 调用 `patch(null, vnode)`。
3. patch 发现节点是组件，调用 `mountComponent`。
4. `createComponentInstance` 创建组件实例。
5. `setupComponent` 初始化 props 和 slots，然后运行 `setup()`。
6. 没有渲染函数时，Vue 在浏览器中编译 template。
7. `setupRenderEffect` 创建一个副作用函数。这个副作用函数运行渲染函数，然后 patch 子树。

第 7 步是响应式和渲染的连接点。渲染函数读取的所有响应式数据，都成为这个副作用函数的依赖。

数据改变时，调度器把 `job` 放入队列（第 13 章），不直接重新渲染。`job` 先检查依赖是否真的改变（版本号检查，第 12 章讲）。依赖没有改变时，组件不重新渲染。

下面的源码涉及第 12、13 章的内容。学完这两章后再回来读，会更容易。

```js
// runtime-core/renderer.ts（简化）
function setupRenderEffect(instance, initialVNode, container) {
  const componentUpdateFn = () => {
    if (!instance.isMounted) {
      const subTree = (instance.subTree = renderComponentRoot(instance)) // 运行 render
      patch(null, subTree, container)            // 第一次：挂载
      queuePostRenderEffect(instance.m)          // mounted 钩子放入后置队列
      instance.isMounted = true
    } else {
      const next = renderComponentRoot(instance)
      const prev = instance.subTree
      instance.subTree = next
      patch(prev, next, container)               // 之后：比较新旧子树
      queuePostRenderEffect(instance.u)          // updated 钩子
    }
  }
  const effect = (instance.effect = new ReactiveEffect(componentUpdateFn))
  const update = (instance.update = effect.run.bind(effect))   // 强制更新（$forceUpdate）
  const job = (instance.job = effect.runIfDirty.bind(effect))  // 调度器运行的任务
  job.i = instance
  job.id = instance.uid                          // id 决定更新顺序：父组件小于子组件
  effect.scheduler = () => queueJob(job)         // 数据改变：放入更新队列（第 25 章）
  update()                                       // 第一次渲染
}
```
:::

### 1.3 ref：在脚本和模板中读写数据

`ref` 创建响应式数据。数据改变时，读取它的模板自动更新。

1. 在 JavaScript 中，用 `count.value` 读写。
2. 在模板中，直接写 `count`。模板自动读取顶层 ref 的 `.value`。

`@click="表达式"`：点击元素时运行这个表达式。例如 `@click="count++"` 把 count 加 1。第 2.4 节讲完整用法。

<b>场景：点击按钮后，先检查上限再加 1。</b>逻辑变多时，把它写进函数。函数在 JavaScript 中运行，所以要写 `.value`。

```js
const count = ref(0)

function add() {
  if (count.value >= 10) return   // 读：count.value
  count.value++                   // 写：count.value
}
return { count, add }

// 模板：<button @click="add">点了 {{ count }} 次</button>
```

注意：普通变量（例如 `let count = 0`）改变时，页面不更新。第 3 章说明 ref 的细节。

<Exercise id="firstFill" />

<Exercise id="counter" />

### 1.4 创建项目并写一个单文件组件

按下面的步骤创建项目：

1. 运行 `npm create vue@latest`。
2. 进入项目目录。
3. 运行 `npm install`。
4. 运行 `npm run dev`。

每个组件写在一个 `.vue` 文件中。这个文件有三个部分。

```vue
<!-- Counter.vue -->
<script setup>
// ① 逻辑：这里的变量可以在模板中直接使用，不需要 return
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <!-- ② 结构：HTML 模板 -->
  <button class="btn" @click="count++">点了 {{ count }} 次</button>
</template>

<style scoped>
/* ③ 样式：scoped 表示样式只用于本组件 */
.btn { color: #42b883; }
</style>
```

`<script setup>` 中的顶层变量和导入的组件，都可以在模板中直接使用。`scoped` 样式只作用于本组件的元素，所以不同组件可以使用同一个类名。

::: deep SFC 的编译结果
Vite 用 `@vitejs/plugin-vue` 和 `@vue/compiler-sfc` 编译 `.vue` 文件。下面是第 1.4 节 Counter.vue 的编译结果（简化）：

```js
import { ref, openBlock, createElementBlock, toDisplayString } from 'vue'
import './Counter.vue?vue&type=style&index=0&scoped=7a7a37b1&lang.css'

const _sfc_main = {
  __name: 'Counter',
  setup(__props, { expose: __expose }) {
    __expose()                       // <script setup> 默认不暴露任何内容
    const count = ref(0)
    return { count }                 // 开发模式：返回模板使用的变量。生产构建把渲染函数内联到 setup 中
  }
}
function _sfc_render(_ctx, _cache, $props, $setup) {
  return (openBlock(), createElementBlock('button', {
    class: 'btn',
    onClick: _cache[0] || (_cache[0] = $event => ($setup.count++))
  }, '点了 ' + toDisplayString($setup.count) + ' 次', 1 /* TEXT */))
}
_sfc_main.render = _sfc_render
_sfc_main.__scopeId = 'data-v-7a7a37b1'   // scoped 样式的标记
export default _sfc_main

// 编译后的 CSS：.btn[data-v-7a7a37b1] { color: #42b883; }
```

从编译结果可以得到三个结论：

1. `<script setup>` 编译为普通的 `setup()` 函数。
2. template 编译为渲染函数。生产构建不包含模板编译器，所以包更小。
3. scoped 样式给元素加一个 `data-v-hash` 属性，并给选择器加同样的属性选择器。

| 构建版本 | 包含编译器 | 使用场景 |
| --- | --- | --- |
| `vue.runtime.esm-bundler.js` | 否 | Vite 项目的默认版本。模板在构建时编译。 |
| `vue.esm-bundler.js` | 是 | 运行时需要编译字符串模板。 |
| `vue.global.js` | 是 | 用 `<script>` 标签引入，暴露全局变量 `Vue`。本课程的练习台用的是 `vue.esm-bundler.js`（练习脚本里的全局 `Vue` 就来自它）。 |
:::

::: pitfalls
1. 在 JavaScript 中不要写 `count++`。写 `count.value++`。否则值不改变。
2. 在 `setup()` 中，用 `return` 返回模板需要的数据。否则模板找不到数据。`<script setup>` 不需要 return。
3. 调用 `mount('#app')` 之前，确认 `#app` 元素已经存在。否则 Vue 找不到容器，页面不显示任何内容。
:::

::: selfcheck
<Sc :a="0">

点击按钮 3 次后，按钮显示什么？

```js
createApp({
  setup() {
    let count = 0          // 普通变量，不是 ref
    return { count }
  },
  template: '<button @click="count++">{{ count }}</button>'
}).mount('#app')
```

<Opt>一直显示 0</Opt>
<Opt>显示 3</Opt>
<Opt>控制台报错</Opt>

<template #explain>

解析：count 是普通变量，不是响应式数据。值改变时，Vue 收不到通知，所以不重新渲染。要让页面更新，写 `const count = ref(0)`。

</template>
</Sc>

<Sc :a="2">

执行 `const count = ref(0)` 后，在 JavaScript 中怎样把值加 1？

<Opt>`count++`</Opt>
<Opt>`count = count + 1`</Opt>
<Opt>`count.value++`</Opt>

<template #explain>

解析：ref 是一个对象。值保存在 `.value` 中。只有在模板中才可以省略 `.value`。

</template>
</Sc>

<Sc :a="1">

使用 Vue 时，数据改变后谁修改 DOM？

<Opt>你的代码调用 querySelector 后修改</Opt>
<Opt>Vue 按模板修改</Opt>
<Opt>浏览器自动刷新整个页面</Opt>

<template #explain>

解析：声明式写法中，你只修改数据。Vue 按模板计算页面应有的样子，然后只修改变化的 DOM。浏览器不刷新页面。

</template>
</Sc>

<Sc :a="2">

下面三段代码分别属于 .vue 文件的哪一部分？① `const count = ref(0)` ② `<button>{{ count }}</button>` ③ `.btn { color: red }`

<Opt>① template ② script setup ③ style</Opt>
<Opt>① script setup ② style ③ template</Opt>
<Opt>① script setup ② template ③ style</Opt>

<template #explain>

解析：`<script setup>` 写逻辑，这里的变量可以在模板中直接使用。`<template>` 写结构，用 {{ }} 显示数据。`<style>` 写样式，加 scoped 时只影响本组件。模板中不能写 const 声明，所以 ① 不属于 template。样式表中不能写 HTML 元素，所以 ② 不属于 style。

</template>
</Sc>

:::

::: summary
- 你修改数据。Vue 更新页面。
- `createApp(根组件).mount('#app')` 创建并挂载应用。
- `ref(初始值)` 创建响应式数据。在 JavaScript 中使用 `.value`，在模板中不写。
- `.vue` 文件有三个部分：script、template 和 style。
:::
