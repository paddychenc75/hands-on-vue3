---
title: 组件与通信
id: comm
stage: 2
chapter: 5
desc: props、emit、v-model、slot、provide
---

<script setup>
import PropsDownEmitsUp from '../figures/05-comm/PropsDownEmitsUp.vue'
import PropDrillingVsProvideInject from '../figures/05-comm/PropDrillingVsProvideInject.vue'
import SlotsLab from '../labs/05-comm/SlotsLab.vue'
import CommBoard from '../labs/05-comm/CommBoard.vue'
</script>

# 组件与通信

::: goals
<Goal checks="sc:0,ex:emit">写一个接收 props 并发送事件的组件。</Goal>
<Goal checks="sc:1,ex:modelInput">为组件添加 v-model。</Goal>
<Goal checks="sc:2,ex:scopedSlot">为每种场景选择正确的通信方式。</Goal>
<Goal checks="sc:4">说明 class、style 和事件怎样透传到子组件的根元素。</Goal>

:::

::: rt
阅读主线约 12 分钟，深入内容约 5 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
组件就是**函数**：props 是参数，模板是返回值。

子组件想让父组件做事，不能直接改父组件的数据，而是**打电话汇报**（emit 一个事件），由父组件决定怎么处理。

provide / inject 像**家族群公告**：祖先发一次，所有后代都能收到。
:::

::: terms
props
: 父组件传给子组件的数据。

事件（emit）
: 子组件发给父组件的消息。

单向数据流
: 数据从父组件流向子组件。子组件用事件通知父组件。

插槽
: 父组件传给子组件、由子组件决定位置的模板内容。

provide / inject
: 祖先组件提供数据，后代组件直接读取。
:::

::: why
页面拆成组件后，组件之间要传递数据。任何组件都能修改同一份数据时，页面显示错误，你要检查每个组件才能找到原因。

原因：数据的修改位置不固定。

本章的单向数据流解决这个问题：父组件用 props 传数据，子组件用事件通知父组件。
:::

Vue 使用单向数据流。规则如下：

1. 父组件用 props 把数据传给子组件。
2. 子组件不修改 props。原因：数据只在拥有它的组件中修改，出错时容易找到修改位置。
3. 子组件用事件通知父组件。
4. 父组件修改自己的数据。

下图说明数据和事件的方向。本章先用这个规则写一个 TaskItem 组件，然后介绍其他通信方式。

<Figure caption="数据只从父组件流向子组件。子组件用事件通知父组件。父组件修改数据后，新的 props 再流向子组件。">
<PropsDownEmitsUp />
</Figure>

### 5.1 用 props 接收数据

子组件用 `defineProps` 声明它接收的数据。父组件在标签上用属性传值。

```vue
// TaskItem.vue
<script setup>
const props = defineProps({
  task: { type: Object, required: true },   // 必须传入
  editable: { type: Boolean, default: true }
})
</script>

<template>
  <li>{{ task.text }}</li>                    <!-- 模板中直接使用 prop 名 -->
</template>

// 父组件 TaskBoard.vue
import TaskItem from './TaskItem.vue'           // 导入后，模板中直接使用
// 模板：<TaskItem v-for="t in tasks" :key="t.id" :task="t" />
```

**场景：同一个组件用于看板和只读的归档页。**用 Boolean prop 控制是否显示编辑按钮。只写属性名时，值是 true。不传时，值是默认值。

```html
<TaskItem :task="t" />                      <!-- editable 为默认值 true -->
<TaskItem :task="t" :editable="false" />    <!-- 归档页：只读 -->
<TaskItem :task="t" editable />             <!-- 只写属性名：true -->
```

注意：`:task="t"` 传入的是表达式的值。`task="t"` 传入的是字符串 "t"。props 是只读的。子组件要改数据时，使用下一节的事件。

::: deep props 校验
用对象形式声明 props 时，可以检查类型、必填和取值范围。

```js
const props = defineProps({
  title: String,                                    // 只检查类型
  size: { type: [Number, String], default: 16 },    // 允许多种类型
  user: { type: Object, required: true },           // 必填
  tags: { type: Array, default: () => [] },         // 对象和数组的默认值用函数返回
  status: {
    type: String,
    default: 'draft',
    validator: (v) => ['draft', 'published'].includes(v)   // 返回 false 时警告
  }
})
```

- 校验只在开发模式中运行。校验失败时，Vue 只在控制台警告，不阻止渲染。所以校验只帮助开发者发现错误，不能保护生产环境。
- Boolean 类型的 prop 没有传入时，值是 false，不是 undefined。
- `<Comp disabled />` 把 Boolean prop disabled 设为 true。

使用 TypeScript 类型声明时，有两种方法设置默认值：

```ts
// 写法 1：withDefaults
const props = withDefaults(defineProps<{ msg?: string; labels?: string[] }>(), {
  msg: 'hello',
  labels: () => ['one', 'two']       // 引用类型用函数返回
})

// 写法 2（Vue 3.5 及以上）：解构时写默认值。解构出的变量保持响应式
const { msg = 'hello', labels = ['one', 'two'] } = defineProps<{ msg?: string; labels?: string[] }>()

watch(() => msg, (v) => console.log(v))   // 侦听解构出的 prop 时，传入 getter
```

写法 2 中，编译器把 `msg` 转换为 `props.msg`。所以它仍然是响应式的。
:::

::: deep 局部注册和全局注册
```js
// 局部注册：在 <script setup> 中导入后，模板中直接使用
import MyButton from './MyButton.vue'

// 全局注册：所有组件的模板都能使用
const app = createApp(App)
app.component('MyButton', MyButton)
```

优先使用局部注册。原因如下：

- 构建工具可以删除没有使用的局部组件。全局组件总是打包。
- 局部注册时，导入语句显示依赖关系。

只为整个应用都使用的基础组件选择全局注册，例如图标组件。
:::

### 5.2 用 emit 通知父组件

子组件不修改父组件的数据。它用 `defineEmits` 声明事件，用 `emit` 发送事件。父组件用 `@事件名` 监听，并修改自己的数据。

```vue
// TaskItem.vue
const emit = defineEmits(['remove', 'toggle'])   // 声明组件发送的事件
// 模板
<li>
  <input type="checkbox" :checked="task.done" @change="emit('toggle', task.id)">
  {{ task.text }}
  <button v-if="editable" @click="emit('remove', task.id)">删除</button>
</li>

// 父组件 TaskBoard.vue
function removeTask(id) { tasks.value = tasks.value.filter(t => t.id !== id) }
// 模板：<TaskItem v-for="t in tasks" :key="t.id" :task="t"
//                 @remove="removeTask" @toggle="toggleTask" />
```

emit 的第二个及以后的参数传给父组件的处理函数。`@remove="removeTask"` 只写函数名，所以 removeTask 收到 id。

注意：组件事件不冒泡。孙组件的事件不会到达祖父组件。跨多层通信使用 5.6 节的 provide 和 inject。

<Exercise id="emit" />

::: deep emit 的实现
事件不经过任何事件总线。`emit('change')` 在 vnode.props 中查找 `onChange` 函数，然后调用它：

```js
// runtime-core/componentEmits.ts（简化）
function emit(instance, event, ...args) {
  const props = instance.vnode.props || {}
  let handler =
    props[toHandlerKey(event)] ||                 // 'change'      -> 'onChange'
    props[toHandlerKey(camelize(event))]          // 'update-item' -> 'onUpdateItem'
  if (handler) callWithAsyncErrorHandling(handler, instance, args)

  const onceHandler = props[toHandlerKey(event) + 'Once']   // @change.once
  if (onceHandler && !instance.emitted?.[event]) {
    (instance.emitted ||= {})[event] = true
    callWithAsyncErrorHandling(onceHandler, instance, args)
  }
}
// 结论：@change="fn" 编译为 props.onChange = fn。emit 就是同步调用这个函数。
```
:::

### 5.3 透传属性：class、style 和事件落在根元素上

父组件有时传入子组件没有声明为 props 或 emits 的属性，例如 `class`、`style`、`placeholder` 和 `@click`。这些属性叫做透传属性（attrs）。

组件只有一个根元素时，Vue 把 attrs 加到根元素上：

```html
<!-- MyButton.vue 的模板 -->
<button class="btn" type="button" @click="onInner">提交</button>

<!-- 父组件 -->
<MyButton class="large" style="color: red" type="submit" @click="onOuter" />

<!-- 渲染结果：<button class="btn large" type="submit" style="color: red"> -->
<!-- 点击时，onInner 和 onOuter 都运行 -->
```

| 属性类型 | 合并规则 |
|---|---|
| `class`、`style` | 和根元素上的值合并 |
| 事件监听 `@click` | 两个处理函数都运行 |
| 其他属性 | 父组件传入的值覆盖根元素上的值 |

<b>场景：包装 input 的组件。</b>你写了一个带标签的输入组件。父组件传入的 `placeholder`、`maxlength` 要加到里面的 `input` 上，不加到最外层的 `label` 上。按下面的步骤操作：

1. 调用 `defineOptions({ inheritAttrs: false })` 关闭自动透传（Vue 3.3 及以上）。
2. 在目标元素上写 `v-bind="$attrs"`。
3. 在脚本中需要 attrs 时，调用 `useAttrs()`。

```vue
<script setup>
defineOptions({ inheritAttrs: false })
defineProps(['label'])
const attrs = useAttrs()              // 总是最新的值，但不是响应式的，不能侦听
</script>

<template>
  <label class="field">
    {{ label }}
    <input v-bind="$attrs">           <!-- placeholder、maxlength 等属性加到 input 上 -->
  </label>
</template>
```

组件有多个根元素时，Vue 不自动透传，因为它不知道把 attrs 加到哪个根元素上。这时没有写 `v-bind="$attrs"`，开发模式会警告。

::: deep props 和 attrs 怎样分开
子组件初始化时，`initProps` 按下面的规则分开所有传入的属性：

1. 名称在 `defineProps` 中声明：放入 `props`。
2. 名称以 on 开头，并且在 `defineEmits` 中声明：作为事件处理函数保存，不放入 attrs。
3. 其他属性：放入 `attrs`。

props 对象是 `shallowReactive`。父组件传入新值时，Vue 替换 props 的属性。子组件读取 props 的副作用函数因此更新。
:::

### 5.4 为组件添加 v-model

输入类组件要读父组件的值，也要把新值告诉父组件。v-model 把这两件事合成一个写法。Vue 把组件上的 v-model 编译为一个 prop 和一个事件。所以子组件仍然不直接修改父组件的数据。

```js
// <MyInput v-model="text" /> 编译为：
// <MyInput :modelValue="text" @update:modelValue="v => text = v" />

// MyInput.vue（Vue 3.4 及以上）
const model = defineModel()          // 返回一个 ref。写入时发送事件
// 模板: <input v-model="model">

// 旧写法，结果相同
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
// 模板: <input :value="modelValue" @input="emit('update:modelValue', $event.target.value)">
```

**场景：一个表单组件编辑文章的多个字段。**给 defineModel 传一个名称。父组件用 `v-model:名称` 绑定。一个组件可以有多个 v-model。第二个参数是选项，和 props 的选项相同。

```js
// PostForm.vue
const title = defineModel('title', { required: true })     // 对应 v-model:title
const count = defineModel('count', { type: Number, default: 0 })

// 父组件
// <PostForm v-model:title="post.title" v-model:count="post.count" />
```

注意：写入 `model.value` 时，Vue 发送 `update:modelValue` 事件。父组件写了 v-model 时，父组件修改数据，新值通过 prop 传回子组件。父组件没有写 v-model 时，defineModel 在子组件内部保存这个值。子组件显示新值，父组件的数据不变。所以父组件不绑定 v-model，子组件的输入框也能输入。可写的 computed 用类似的思路，见[第 4 章](/chapters/04-computed)。

下面的练习为任务标题写一个输入组件。

<Exercise id="modelInput" />

::: deep v-model 的自定义修饰符
父组件在 v-model 上写自定义修饰符时，子组件用解构读取修饰符：

```js
// 父组件：<MyInput v-model.capitalize="text" />
const [model, modifiers] = defineModel({
  set(value) {                       // set 的返回值发给父组件
    if (modifiers.capitalize) return value.charAt(0).toUpperCase() + value.slice(1)
    return value
  }
})
// modifiers 的值是 { capitalize: true }
// v-model:title.trim 的修饰符用 const [title, titleMods] = defineModel('title') 读取
```
:::

### 5.5 插槽

插槽让父组件决定子组件中一部分的内容。子组件用 `<slot>` 标记位置。

```html
<!-- Card.vue -->
<div class="card">
  <header v-if="$slots.header">        <!-- 父组件没有提供 header 时，不渲染 header 元素 -->
    <slot name="header" />
  </header>
  <main>
    <slot>没有内容</slot>                <!-- 默认插槽。标签中的文字是后备内容 -->
  </main>
  <footer><slot name="footer" /></footer>
</div>

<!-- 父组件 -->
<Card>
  <template #header>标题</template>     <!-- #header 是 v-slot:header 的缩写 -->
  正文。不在 template 中的内容进入默认插槽。
  <template #footer>页脚</template>
</Card>
```

- 父组件不提供内容时，子组件显示后备内容。
- 插槽内容只能访问父组件的数据，不能访问子组件的数据。原因：插槽内容写在父组件的模板中，由父组件编译。
- 模板中用 `$slots` 判断插槽是否存在。脚本中用 `useSlots()`。

**场景：TaskItem 拥有任务数据，看板页决定任务文字的显示方式。**使用作用域插槽。子组件在 `<slot>` 上写属性，把数据传给插槽内容。

```html
<!-- TaskItem.vue -->
<li>
  <slot :task="task">{{ task.text }}</slot>   <!-- 父组件不提供时，显示 task.text -->
</li>

<!-- 父组件：解构插槽 props -->
<TaskItem :task="t">
  <template #default="{ task }"><b>{{ task.text }}</b>（{{ task.owner }}）</template>
</TaskItem>

<!-- 只有默认插槽时，可以把 v-slot 写在组件上 -->
<TaskItem :task="t" v-slot="{ task }">{{ task.text }}</TaskItem>
```

注意：插槽 props 由子组件决定。父组件只能读取子组件传出的属性。

<Lab id="demo-slots" title="实验台：具名插槽、作用域插槽和后备内容" note="右边显示子组件渲染的 HTML">
<template #predict>
<Sc predict :a="1">

先猜：Card 的默认插槽有后备内容。取消选择“提供默认插槽”。\<main> 中显示什么？

```html
<main><slot>没有内容（后备内容）</slot></main>
```

<Opt>空的 \<main>\</main></Opt>
<Opt>没有内容（后备内容）</Opt>
<Opt>\<main> 被删除，只留下注释</Opt>

<template #explain>

解析：父组件不提供插槽内容时，\<slot> 渲染它自己的子节点，即后备内容。\<main> 是子组件模板中的普通元素，没有 v-if，所以不会被删除。header 有 v-if="$slots.header"，所以只有取消 #header 时，header 才被删除。打开实验台，取消“提供默认插槽”，看下方的 HTML。

</template>
</Sc>
</template>

<SlotsLab />
</Lab>

<Exercise id="scopedSlot" />

::: deep 插槽是函数
编译器把父组件中的插槽内容编译为函数。子组件渲染时调用这个函数。所以：

- 插槽内容在子组件的渲染副作用函数中运行。插槽读取的数据成为子组件的依赖。
- 作用域插槽就是带参数的函数。`<slot :task="task">` 把 task 作为参数传给函数。
- 插槽是惰性的。子组件不渲染插槽时，插槽函数不运行。

```js
// 父组件：<TaskItem :task="t"><template #default="{ task }">{{ task.text }}</template></TaskItem>
// 编译结果：
createVNode(TaskItem, { task: t }, {
  default: withCtx(({ task }) => [createTextVNode(toDisplayString(task.text), 1)]),
  _: 1 /* STABLE：插槽结构不改变，父组件更新时不需要强制更新子组件 */
})
```
:::

### 5.6 用 provide 和 inject 跨层传递

数据要经过多层组件时，每层都要转交 props。provide 和 inject 让后代组件直接取到祖先提供的数据。

<Figure caption="用 props 时，中间组件必须逐层转交数据。用 provide 和 inject 时，后代组件直接取到祖先提供的数据。">
<PropDrillingVsProvideInject />
</Figure>

```js
// 祖先组件
const theme = ref('green')
provide('theme', theme)            // 提供 ref 本身

// 任意层级的后代组件
const theme = inject('theme')      // 和祖先拿到同一个 ref
```

**场景：看板页提供当前用户。**任意层级的任务卡片都要判断“是不是我的任务”。用 `readonly` 包装，后代不能修改。

```js
// BoardPage.vue
const currentUser = ref({ id: 1, name: '王芳' })
provide('currentUser', readonly(currentUser))

// TaskCard.vue（任意层级）
const user = inject('currentUser')
// 模板：<span v-if="task.ownerId === user.id">我的</span>
```

**场景：后代修改筛选条件。**把只读的值和一个修改函数一起提供。后代调用函数，数据仍在看板页中修改。

```js
// BoardPage.vue
const filter = ref('all')
function setFilter(v) { filter.value = v }
provide('filter', { filter: readonly(filter), setFilter })

// FilterBar.vue
const { filter, setFilter } = inject('filter')
// 模板：<button @click="setFilter('mine')">只看我的</button>
```

**场景：组件不在看板页中也能使用。**给 inject 第二个参数作为默认值。默认值是对象时，传工厂函数，并把第三个参数设为 true。

```js
const size = inject('cardSize', 'normal')     // 没有祖先提供时为 'normal'
const config = inject('boardConfig', () => ({ columns: 3 }), true)
```

注意：在 setup 中同步调用 provide 和 inject。provide 普通值（例如 `theme.value`）时，后代收不到更新。下面的实验台显示这个区别。

<Lab id="demo-comm" title="实验台：任务看板中的四种通信方式" note="日志显示每一个 props、事件和 inject">
<template #predict>
<Sc predict :a="2">

先猜：父组件 provide 一个 ref("green")。每个 ThemeBadge 用 inject 读取它。点击“切换 provide 的主题”。徽章显示什么？

```js
const theme = ref('green')
provide('theme', theme)
// ThemeBadge 中
const theme = inject('theme')
```

<Opt>仍是 green，inject 只读一次</Opt>
<Opt>只有新添加的项显示 blue</Opt>
<Opt>所有徽章都变为 blue</Opt>

<template #explain>

解析：provide 传入的是 ref 本身，不是它的值。后代组件拿到同一个 ref，所以 ref 改变时，所有 inject 处都更新。provide 一个普通字符串时，后代才收不到新值。新旧项读取的是同一个 ref，所以没有区别。打开实验台，点击“切换 provide 的主题”，看每一行的徽章。

</template>
</Sc>
</template>

<CommBoard />
</Lab>

::: deep provide 和 inject 的实现
每个组件实例有一个 `provides` 对象。子组件默认直接使用父组件的 provides 对象。组件第一次调用 provide 时，Vue 用父组件的 provides 作为原型，创建一个新对象。inject 沿原型链查找值。

```js
function provide(key, value) {
  const instance = currentInstance
  const parentProvides = instance.parent?.provides
  if (instance.provides === parentProvides) {
    instance.provides = Object.create(parentProvides)   // 第一次 provide：创建自己的对象
  }
  instance.provides[key] = value
}
function inject(key, defaultValue) {
  const provides = currentInstance.parent?.provides     // 从父组件开始查找
  if (provides && key in provides) return provides[key] // in 运算符沿原型链查找
  return defaultValue
}
```
:::

### 5.7 选择通信方式

下表总结本章的通信方式。

| 方式 | 方向 | 使用场景 |
|---|---|---|
| `props` | 父组件 → 子组件 | 传递配置和显示的数据 |
| `emit` | 子组件 → 父组件 | 通知父组件发生了什么 |
| `v-model` | 双向 | 表单类组件。等于 `modelValue` props 加 `update:modelValue` 事件。 |
| `slot` | 父组件 → 子组件 | 父组件决定子组件中一部分的内容 |
| `provide / inject` | 祖先组件 → 所有后代组件 | 主题、语言、表单上下文。provide 一个 ref。 |
| `attrs`（透传） | 父组件 → 子组件的根元素 | `class`、`style`、原生事件、`placeholder` 等没有声明为 props 的属性 |
| `defineExpose + ref` | 父组件调用子组件 | 聚焦输入框。调用子组件的方法。 |
| Pinia | 任意组件 | 多个页面共享的数据（第 18 章） |

按下面的规则选择：

- 父组件和子组件之间：使用 props 和 emit。
- 跨多层组件：使用 provide 和 inject。
- 多个页面读写同一数据：使用 Pinia。

**场景：父组件让子组件的输入框获得焦点。**这是表中的“defineExpose + ref”。把模板 ref 写在子组件上时，它的值是子组件的实例。`<script setup>` 组件默认不暴露任何内容，所以父组件不能调用它的函数。用 `defineExpose` 选择要暴露的内容：

```js
// SearchBox.vue
const inp = useTemplateRef('inp')   // 模板中 ref="inp" 的元素（模板 ref 见第 6.3 节）
function focus() { inp.value.focus() }
defineExpose({ focus })            // 父组件只能访问 focus

// 父组件
const box = useTemplateRef('box')  // 值是 SearchBox 的实例
function openSearch() { box.value.focus() }
// 模板：<button @click="openSearch">搜索</button>
//       <SearchBox ref="box" />
```

注意：只在父组件需要命令子组件时使用 defineExpose，例如聚焦、滚动和播放。传递数据仍然用 props 和事件。

::: pitfalls
1. 不要在子组件中修改 props，例如 `props.task.done = true`。发送事件给父组件。否则很难找到修改数据的代码。
2. provide ref、reactive 对象或 computed。不要 provide 普通值。否则后代组件收不到更新。需要防止后代修改时，provide `readonly(x)` 和一个修改函数。
3. 在一个项目中，事件名只使用一种格式：kebab-case 或 camelCase。原因：两种格式混用时，搜索事件名会漏掉一部分代码。
:::

::: selfcheck
<Sc :a="1">

子组件 TaskItem 要删除自己显示的任务。哪种写法符合单向数据流？

<Opt>在子组件中执行 `props.tasks.splice(i, 1)`</Opt>
<Opt>子组件 `emit('remove', id)`，父组件删除</Opt>
<Opt>子组件把 `props.task` 设为 null</Opt>

<template #explain>

解析：数据属于父组件。子组件只发送事件。父组件修改自己的数据，新的 props 再传给子组件。

</template>
</Sc>

<Sc :a="0">

`<MyInput v-model="text" />` 等于哪种写法？

<Opt>`:modelValue="text"` 加 `@update:modelValue`</Opt>
<Opt>`:value="text"` 加 `@input`</Opt>
<Opt>`:model="text"` 加 `@change`</Opt>

<template #explain>

解析：在组件上，v-model 使用 `modelValue` prop 和 `update:modelValue` 事件。`value` 加 `input` 是原生 input 元素上的规则。

</template>
</Sc>

<Sc :a="2">

父组件执行 `theme.value = 'dark'` 后，子组件显示什么？

```js
// 父组件
const theme = ref('light')
provide('theme', theme.value)

// 子组件
const t = inject('theme')    // 模板：{{ t }}
```

<Opt>dark</Opt>
<Opt>空白</Opt>
<Opt>light</Opt>

<template #explain>

解析：`theme.value` 是字符串 'light'。provide 收到的是普通值，不是响应式数据。写 `provide('theme', theme)`，提供 ref 本身。

</template>
</Sc>

<Sc :a="2">

回顾（第 2 章）：子组件执行 `emit('select', item)`。父组件写 `<List @select="onSelect()" />`。`onSelect(x)` 中的 x 是什么？

<Opt>item，emit 的第二个参数</Opt>
<Opt>一个原生的 Event 对象</Opt>
<Opt>undefined，调用时没有传参数</Opt>

<template #explain>

解析：第 2 章：@ 后面只写函数名时，Vue 调用它，并传入事件的参数。写成 `onSelect()` 时，这是一条语句。Vue 运行这条语句，括号中没有参数，所以 x 是 undefined。要收到 item，写 `@select="onSelect"` 或 `@select="onSelect($event)"`。组件事件不是原生 DOM 事件，所以也不会收到 Event 对象。

</template>
</Sc>

<Sc :a="1">

父组件写 `<MyButton class="large" @click="f" />`。MyButton 的根元素是 `<button class="btn" @click="g">`。点击按钮后，会发生什么？

<Opt>class 是 `large`，只有 f 运行</Opt>
<Opt>class 是 `btn large`，f 和 g 都运行</Opt>
<Opt>class 是 `btn large`，只有 g 运行</Opt>

<template #explain>

解析：透传属性加到根元素上。`class` 和根元素上的值合并，所以是 `btn large`。事件监听不互相覆盖，两个处理函数都运行。只写 `large` 的选项忘了合并。只有一个处理函数运行的选项，把事件当成了覆盖。

</template>
</Sc>

:::

::: summary
- defineProps 接收数据。defineEmits 和 emit 通知父组件。
- v-model 等于 modelValue 加 update:modelValue。使用 defineModel，用名称支持多个 v-model。
- 没有声明为 props 的属性透传到根元素：class 和 style 合并，事件都运行。用 `inheritAttrs: false` 加 `v-bind="$attrs"` 改变落点。
- 插槽传递内容。作用域插槽把子组件的数据交给父组件显示。
- provide 一个 ref，可以加 readonly 和修改函数。Pinia 跨页面共享。
- 父组件用模板 ref 和 defineExpose 调用子组件的函数。
:::
