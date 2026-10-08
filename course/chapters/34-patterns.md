---
title: 组件设计模式
id: patterns
stage: 6
chapter: 34
desc: 应用内部怎样拆分和组合组件：分支拆分，容器与展示，草稿表单，作用域插槽，复合组件，递归与泛型组件，以及怎样选型
---

<script setup>
import ContainerVsPresentational from '../figures/34-patterns/ContainerVsPresentational.vue'
import CompoundTabsProvide from '../figures/34-patterns/CompoundTabsProvide.vue'
import PatTabs from '../labs/34-patterns/PatTabs.vue'
import PatTree from '../labs/34-patterns/PatTree.vue'
</script>

# 组件设计模式

::: goals
<Goal checks="sc:3,sc:5">判断一个大组件该怎样拆（分支组件、容器与展示），并说出每种拆法的代价。</Goal>
<Goal checks="sc:6,ex:draftForm">写出先改草稿、再提交的表单组件。</Goal>
<Goal checks="sc:1,sc:2,ex:slotForward,ex:tabsRegister">用插槽 props 和 provide/inject 设计灵活的组件接口，写出复合组件的注册机制，并在包装组件中转发全部插槽。</Goal>
<Goal checks="sc:4,ex:treeItem">写一个递归组件和一个泛型组件。</Goal>
<Goal checks="sc:0">对照选型表，判断一段逻辑该放进组合式函数、无渲染组件、复合组件还是插槽。</Goal>

:::

::: rt
阅读主线约 13 分钟，深入内容约 2 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
好的组件像**乐高积木**：每块只有一个形状，接口（凸点）统一，可以拼成任何东西。坏的组件像**一整块雕塑**：想改一个角，就要重新雕。
:::

::: terms
展示组件
: 只通过 props 和事件交换数据、不调用 API 的组件。

容器组件
: 获取数据并传给展示组件的组件。

复合组件
: 必须一起使用的一组组件，例如 Tabs 和 Tab。

递归组件
: 在自己的模板中使用自己的组件。

无渲染组件
: 只提供状态和行为、不渲染自己的元素的组件。

泛型组件
: props 的类型由使用者决定的组件。
:::

::: why
一个页面组件有几百行：请求数据、筛选、分页、表单都在里面。你修改筛选功能，分页坏了。组件的 props 也越传越多。

原因：所有功能共用同一份数据和同一个模板，边界没有划出来。

本章讲**应用内部**怎样拆分和组合组件。你已经学过 props、事件、插槽和 provide/inject（[第 6 章](/chapters/06-comm)）和组合式函数（[第 8 章](/chapters/08-composables)）。这里不再讲它们怎么写，讲怎样用它们组成模式。每个模式回答三个问题：遇到什么问题时用它，代价是什么，什么时候不该用。最后一节（34.8）把这些模式和组合式函数放在一张选型表里。

本章的组件只在你自己的项目里使用，你能随时同时修改使用者和被使用者。如果组件或组合式函数要给别人用，改一次接口就可能弄坏别人的代码，要考虑的事不同，见[第 35 章](/chapters/35-api-design)。
:::

### 34.1 把大的 v-if 分支拆分为组件

一个组件有多个很大的 `v-if` 分支。每个分支有自己的数据和逻辑。组件变得很难阅读。

把每个分支拆分为一个组件。父组件只选择显示哪个组件：

```vue
<!-- 拆分前：一个组件处理三种状态 -->
<template>
  <div v-if="order.status === 'pending'"> …50 行：付款按钮、倒计时… </div>
  <div v-else-if="order.status === 'shipped'"> …40 行：物流信息… </div>
  <div v-else> …30 行：评价表单… </div>
</template>

<!-- 拆分后：每个状态一个组件 -->
<script setup>
import OrderPending from './OrderPending.vue'
import OrderShipped from './OrderShipped.vue'
import OrderDone from './OrderDone.vue'
const views = { pending: OrderPending, shipped: OrderShipped, done: OrderDone }
</script>
<template>
  <component :is="views[order.status]" :order="order" />
</template>
```

拆分后，每个组件只在显示时创建自己的数据和侦听器。

**代价。**分支之间共享的数据（这里是 `order`）要通过 props 传下去，分支要修改它，只能发事件。状态改变时，Vue 卸载旧组件，旧组件的状态丢失。要保留状态，用 `<KeepAlive>` 包住 `<component>`（[第 9 章](/chapters/09-builtins)）。

**什么时候不拆。**分支只有十几行，又大量共享父组件的数据。这时拆分只会多出几个文件和一堆 props。

::: deep 懒加载拆出的组件
不在首屏显示的大组件，例如图表和富文本编辑器，用 `defineAsyncComponent` 加载（第 9 章）：

```js
const ChartPanel = defineAsyncComponent(() => import('./ChartPanel.vue'))   // 单独打包，第一次渲染时才下载
// 模板：<ChartPanel v-if="showChart" />
```

加载中和加载失败时显示什么，用 `loadingComponent`、`errorComponent` 配置。服务端渲染的页面中，3.5+ 可以延迟组件的水合，例如 `hydrate: hydrateOnVisible()`。组件进入可视区域时才水合。
:::

### 34.2 拆分容器组件和展示组件

一个组件既请求数据，又负责显示。这样它只能在一个页面中使用，也很难测试。把它拆分为两类组件：

|  | 容器组件 | 展示组件 |
|---|---|---|
| 职责 | 获取数据、调用 store、处理路由 | 显示 props，发送事件 |
| 依赖 | API、Pinia、Router | 只依赖 props |
| 样式 | 很少 | 大部分样式 |
| 例子 | `UserPage.vue` | `UserCard.vue` |

下图说明两类组件分别连接什么。

<Figure caption="容器组件连接路由、store 和 API。展示组件只接收 props，并发送事件。所以展示组件容易测试和复用。">
<ContainerVsPresentational />
</Figure>

```vue
<!-- UserPage.vue：容器组件 -->
<script setup>
const route = useRoute()
const store = useUserStore()
const user = computed(() => store.byId(route.params.id))
</script>
<template>
  <UserCard :user="user" @follow="store.follow(user.id)" />
</template>
```

**场景：拆分任务列表。**列表组件负责循环、空状态和加载状态。列表项组件只负责一项。

```vue
<!-- TodoList.vue -->
<template>
  <p v-if="!items.length">没有任务</p>
  <ul v-else>
    <TodoItem
      v-for="item in items" :key="item.id"
      :item="item"
      @toggle="emit('toggle', item.id)"
      @remove="emit('remove', item.id)"
    />
  </ul>
</template>
```

TodoItem 只接收一项数据，并发送事件。它不修改 props，也不知道整个列表。所以它可以单独测试和复用。

拆开还有一个附带的好处。父组件因为别的数据重新渲染时，Vue 会逐个比较子组件的 props（浅比较，[第 31 章](/chapters/31-runtime) 31.5 节）。展示组件的 props 没变，它就不会重新渲染。实测：页面组件因为一个计数器重新渲染，传给 `UserCard` 的 `user` 对象没变，`UserCard` 的渲染函数没有再运行。这个结论有适用条件：模板里写的普通插槽内容和 `@事件` 内联处理函数，编译器都做了缓存，不影响比较；但传给它的插槽如果是动态的（插槽模板上写了 `v-if`、`v-for` 或动态插槽名），父组件每次重渲染都会带动它重新渲染（Vue 3.5.43 实测）。但这只是附带的好处，不是拆分的理由。拆分的理由是职责清楚。

**代价。**多一层 props 和事件的传递。容器组件很薄时，它只是转发数据，价值不大。

**什么时候不拆。**不要强求所有组件都分成两类，组件变复杂时再拆。容器也不一定是组件：把“获取数据”写成组合式函数（`useUser(id)`），页面组件调用它再传给展示组件，同样做到了分层，还不多一个组件实例。

### 34.3 表单组件：先改草稿，再提交

编辑表单不直接修改父组件的数据。用户还没点保存，页面其他地方就显示了新名字，取消时也没法还原。解决办法：表单复制一份数据作为草稿。用户点击保存时，表单发送 submit 事件：

```vue
<!-- UserForm.vue -->
<script setup>
import { reactive, watch } from 'vue'
const props = defineProps({ user: Object })
const emit = defineEmits(['submit', 'cancel'])

const draft = reactive({ ...props.user })                        // 草稿：修改它不影响父组件
watch(() => props.user, u => Object.assign(draft, u))           // 父组件换了数据：重置草稿
</script>
<template>
  <form @submit.prevent="emit('submit', { ...draft })">
    <input v-model.trim="draft.name">
    <button>保存</button>
    <button type="button" @click="emit('cancel')">取消</button>
  </form>
</template>
```

用户点击取消时，父组件的数据没有改变。同一个表单组件可以用于“新建”和“编辑”。

草稿放在表单里，还有一个好处。用户每敲一个字，只有表单组件重新渲染，页面组件不渲染（实测：敲一个字之后，页面的渲染函数一共运行了 1 次，就是挂载那一次；草稿放在页面里，则运行 2 次）。

注意三点：

1. **`watch` 不能省。**`reactive({ ...props.user })` 只在 setup 里复制一次。父组件换成另一个用户，没有 `watch`，输入框里还是上一个用户的数据。
2. **`{ ...props.user }` 只复制第一层。**草稿中有嵌套对象时，复制嵌套的部分，例如用 `structuredClone(toRaw(props.user))`。
3. **父组件每次渲染都传一个新对象，草稿会被反复重置。**`watch` 比较的是对象的引用。父组件写 `:user="{ ...u }"`，每次渲染都是新对象，用户正在输入时，只要父组件因别的数据重新渲染，输入就被冲掉（实测）。传稳定的对象，或者只侦听 `props.user.id`。

<Exercise id="draftForm" />

### 34.4 作用域插槽：无渲染组件和动态插槽名

组件提供数据，父组件决定怎样显示数据。这时使用作用域插槽（[第 6 章](/chapters/06-comm)）。

只提供数据、不渲染自己的元素的组件，叫作无渲染组件：

```vue
<!-- FetchData.vue：只管理请求状态，界面全部交给插槽 -->
<script setup>
import { useFetch } from '@/composables/useFetch'
const props = defineProps({ url: String })
const { data, error, loading } = useFetch(() => props.url)
</script>
<template>
  <slot :data="data" :error="error" :loading="loading" />
</template>

<!-- 使用 -->
<FetchData url="/api/users" v-slot="{ data, loading }">
  <p v-if="loading">加载中…</p>
  <UserList v-else :users="data" />
</FetchData>
```

只复用逻辑时，组合式函数更简单（34.8）。无渲染组件适合在模板中组合，例如表格的列和虚拟列表的行。

**场景：任务表格的每一列都可以定制。**列来自配置。子组件用 `:name` 为每列生成一个插槽，名字是“cell-列名”。父组件只写需要定制的列。其他列显示原值。

```vue
<!-- TaskTable.vue：columns 是 [{ key: 'title' }, { key: 'owner' }] -->
<template>
  <tr v-for="row in rows" :key="row.id">
    <td v-for="col in columns" :key="col.key">
      <slot :name="`cell-${col.key}`" :row="row">{{ row[col.key] }}</slot>
    </td>
  </tr>
</template>
<!-- 使用：只定制“负责人”列 -->
<TaskTable :columns="cols" :rows="tasks">
  <template #cell-owner="{ row }">@{{ row.owner }}</template>
</TaskTable>
```

**场景：包装组件转发所有插槽。**PagedTaskTable 在 TaskTable 下面加分页。父组件传入的插槽要原样交给 TaskTable。遍历 `$slots`，用 `#[name]` 写动态插槽名。

```vue
<!-- PagedTaskTable.vue -->
<script setup>
defineProps(['columns', 'rows'])
</script>
<template>
  <TaskTable :columns="columns" :rows="rows">
    <template v-for="(_, name) in $slots" #[name]="scope">
      <slot :name="name" v-bind="scope" />
    </template>
  </TaskTable>
  <Pager />
</template>
```

注意：不要在 `#[...]` 中写含空格或引号的表达式。HTML 属性名不能包含这些字符。先在脚本中算出插槽名，再写 `#[slotName]`。

为什么遍历 `$slots`，而不是把插槽名一个个写死？因为包装组件事先不知道使用者会传哪些插槽，TaskTable 以后新增的列也一样。使用者没写的插槽不在 `$slots` 里，所以 TaskTable 对应位置的默认内容照常显示。没有作用域参数的插槽，`scope` 是 `undefined`，`v-bind="scope"` 也能正常工作。但是作用域参数一定要转发：漏掉 `="scope"`，使用者的插槽读 `row.owner` 时会得到 undefined 而出错。

**代价。**插槽名和插槽 props 是组件对外的接口。每多开一个插槽，就多一个要保持稳定的约定。只有一个位置需要变化时开一个插槽就够，不要给每个角落都开。

<Exercise id="slotForward" />

### 34.5 复合组件：Tabs 和 Tab

一组组件必须一起使用，并共享状态。Tabs 用 provide 提供共享状态。每个 Tab 用 inject 读取它。用户只写结构，不传递状态：

```html
<Tabs>
  <Tab name="info" title="资料">…</Tab>
  <Tab name="security" title="安全">…</Tab>
</Tabs>
```

下图说明它们怎样交换数据。

<Figure caption="Tabs 用 provide 提供一个上下文。每个 Tab 用 inject 读取 active，并调用 register 和 select。Tab 不直接修改状态，所有修改都经过 Tabs。">
<CompoundTabsProvide />
</Figure>

```ts
// tabs.ts
import type { InjectionKey, Ref } from 'vue'

export interface TabsContext {
  active: Readonly<Ref<string>>
  register(tab: { name: string; title: string }): () => void   // 返回注销函数
  select(name: string): void
}
export const TabsKey: InjectionKey<TabsContext> = Symbol('Tabs')   // 带类型的 key

// Tabs.vue
const tabs = ref([])
const active = ref('')
provide(TabsKey, {
  active: readonly(active),                    // 子组件只能读取，不能直接修改
  register(tab) {
    tabs.value.push(tab)
    if (!active.value) active.value = tab.name
    // tabs.value 中的元素是代理对象，不能用 === 和原始的 tab 比较
    return () => { tabs.value = tabs.value.filter(t => t.name !== tab.name) }
  },
  select: name => { active.value = name }
})

// Tab.vue
const ctx = inject(TabsKey)
if (!ctx) throw new Error('<Tab> 必须放在 <Tabs> 中')
onUnmounted(ctx.register({ name: props.name, title: props.title }))
const isActive = computed(() => ctx.active.value === props.name)
```

注意两点：

1. provide 的状态用 `readonly` 包装，并提供 select 等方法。所有修改都经过 Tabs，所以状态的变化容易追踪。
2. Tab 检查 inject 的结果。Tab 放在 Tabs 外面时，错误立即暴露。

<Lab id="demo-pat-tabs" title="实验台：用 provide/inject 实现 Tabs" note="运行真实的 Vue">
<template #predict>
<Sc predict :a="1">

先猜：取消选择“显示安全”，再重新选择。标签栏中三个标签的顺序是什么？

```html
<Tabs>
  <Tab name="info" title="资料" />
  <Tab v-if="showSec" name="security" title="安全" />
  <Tab name="notice" title="通知" />
</Tabs>

// Tab 的 setup
onUnmounted(ctx.register({ name, title }))
```

<Opt>资料、安全、通知</Opt>
<Opt>资料、通知、安全</Opt>
<Opt>安全、资料、通知</Opt>

<template #explain>

解析：register 把 Tab 加到数组的末尾。标签栏按数组的顺序显示。“安全”卸载时被删除，重新挂载时再次注册，所以排在最后：资料、通知、安全。第一项以为标签栏按模板中的位置排序。第三项以为重新注册的标签排到最前面。要保持模板顺序，需要额外排序。打开实验台，取消再选择“显示安全”，看标签栏和日志。

</template>
</Sc>
</template>

<PatTabs />
</Lab>

隐藏“安全”，然后再显示它。“安全”的按钮移到了最后：注册顺序是子组件运行 setup 的顺序，不是它们在模板里的位置。

**代价和边界。**复合组件的部件必须搭配使用，使用者要记住有哪几个部件，放错位置时靠 inject 的检查报错。部件之间只有两三个状态要共享时，直接用 props 和事件更直白。

::: deep 让标签栏保持模板里的顺序
有两种办法：挂载后按 DOM 顺序排序（用 `compareDocumentPosition` 比较元素），或者在 Tabs 里读取默认插槽的 vnode，按 vnode 的顺序生成按钮。办法一要求 Tab 注册时带上自己的根元素，所以注册要从 setup 移到 `onMounted`（setup 运行时元素还不存在）：

```js
// Tab.vue：模板 <div ref="root" v-show="isActive"><slot /></div>
const rootEl = useTemplateRef('root')
let unregister = () => {}
onMounted(() => { unregister = ctx.register({ name: props.name, title: props.title, el: rootEl.value }) })
onUnmounted(() => unregister())

// Tabs.vue：register 里 push 之后调用
function sortByDom() {
  tabs.value.sort((a, b) =>
    a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
}
```

DOM 元素不会被 reactive 包装成代理，所以 `a.el` 就是真实的元素。
:::

<Exercise id="tabsRegister" />

### 34.6 递归组件

树形菜单和评论回复的层数不固定。这时使用递归组件：组件在自己的模板中使用自己。

```vue
<!-- TreeItem.vue：单文件组件可以用文件名引用自己 -->
<script setup>
import { ref, computed } from 'vue'
const props = defineProps({ node: Object })
const open = ref(true)
const isFolder = computed(() => !!props.node.children?.length)
</script>

<template>
  <li>
    <span @click="open = !open">{{ node.name }}</span>
    <ul v-if="isFolder && open">                       <!-- 必须有停止条件 -->
      <TreeItem v-for="child in node.children" :key="child.id" :node="child" />
    </ul>
  </li>
</template>
```

为什么不用 import 就能引用自己？单文件组件编译时，会按文件名给组件记一个名字（`TreeItem.vue` 的名字是 `TreeItem`）。模板里的 `<TreeItem>` 要解析成组件时，Vue 先看它和当前组件的名字是否一致，一致就用当前组件自己（实测）。没有使用单文件组件时，给组件写 `name` 选项，效果相同。

递归必须有停止条件。上例中，没有子节点时，v-if 为假，递归停止。数据本身有环（节点的子孙里又包含自己）时，条件永远不会为假，渲染不会结束，最后以栈溢出报错（实测），所以递归的数据必须是树。

每一层需要知道自己的深度时，每个节点 inject 父节点的深度，再 provide 深度加 1。实验台使用这个方法。这依赖 inject 读取最近祖先提供的值，而不是自己提供的值（[第 31 章](/chapters/31-runtime) 31.6 节）。

<Lab id="demo-pat-tree" title="实验台：递归的文件树" note="运行真实的 Vue">
<template #predict>
<Sc predict :a="2">

先猜：文件树的每个节点都是递归组件 TreeNode。src 显示 depth 0。展开 forms。Input.vue 后面显示的 depth 是几？

```js
src
└ components
  └ forms
    └ Input.vue

// TreeNode 的 setup
const depth = inject(DepthKey, 0)
provide(DepthKey, depth + 1)
```

<Opt>1，inject 读取 src 提供的值</Opt>
<Opt>2，Input.vue 是文件，不加 1</Opt>
<Opt>3，inject 读取最近祖先的值</Opt>

<template #explain>

解析：inject 读取最近的祖先组件 provide 的值。每个 TreeNode 都重新 provide depth + 1。所以深度逐层加 1：components 是 1，forms 是 2，Input.vue 是 3。第一项以为 inject 总是读取最外层组件的值。第二项错在：depth 来自父节点，和节点是不是目录无关。打开实验台，点击 forms 前面的 ▸，看 Input.vue 后面的 depth。

</template>
</Sc>
</template>

<PatTree />
</Lab>

**代价和边界。**递归层数很深时，每层都是一个组件实例，比平铺的列表重。需要展开成千上万个节点时，改用平铺加虚拟列表。层数固定的结构（两层菜单），直接写两个组件，比递归好懂。

<Exercise id="treeItem" />

### 34.7 泛型组件：generic

列表、下拉框等组件可以接收任何类型的数据。3.3+ 的 `<script setup>` 支持 `generic` 属性。这样组件保持使用者的类型：

```vue
<!-- SelectList.vue -->
<script setup lang="ts" generic="T extends { id: string | number }">
defineProps<{ items: T[] }>()
const selected = defineModel<T | null>()
defineSlots<{ item(props: { item: T }): any }>()
</script>

<template>
  <ul>
    <li v-for="item in items" :key="item.id" @click="selected = item">
      <slot name="item" :item="item">{{ item.id }}</slot>
    </li>
  </ul>
</template>

<!-- 使用：T 被推导为 User。插槽中的 item 也是 User -->
<SelectList :items="users" v-model="current">
  <template #item="{ item }">{{ item.name }}</template>
</SelectList>
```

`T extends { id: … }` 只是约束：T 至少要有 id。T 的其他字段都保留。props、事件和插槽的类型写法见[第 14 章](/chapters/14-ts)。

**代价。**泛型只在编写时起作用，编译成 JavaScript 后什么也不剩，运行时的行为和不用泛型时完全一样。它的代价是类型声明变复杂，报错也更难读。没有使用 TypeScript 的项目用不到它。组件只处理一种数据（只显示用户）时，直接写具体类型，不要泛型。

### 34.8 选择组合式函数、无渲染组件、复合组件还是插槽

本章的模式和第 8 章的组合式函数，解决的是相似的问题：把一块东西从大组件里分出去。先问三个问题，再看表。

1. **复用的是什么？**只有状态和行为，选组合式函数。还要带一段界面结构，选组件。
2. **标记归谁？**使用者要完全决定标记，甚至要在组件之外用，选组合式函数。使用者只在模板里决定标记，选无渲染组件。标记和样式都由你定，选带样式的组件，再用插槽开几个口子。
3. **几个组件共享同一份状态吗？**共享，就用复合组件：状态放在父组件，用 provide/inject 给子组件（34.5）。

| 情况 | 选择 | 使用者的自由度 | 代价 |
|---|---|---|---|
| 只复用状态和逻辑，例如鼠标位置、请求 | 组合式函数 | 最大：标记自己写，组件之外也能用 | 使用者自己接线：绑定事件，写 ARIA 属性 |
| 复用一段界面结构和样式 | 组件 | 小：只能用 props 和插槽 | 每个新需求都要加一个 prop 或插槽 |
| 复用逻辑，界面由使用者在模板里决定 | 无渲染组件 | 大：标记自由，但只能在模板里 | 多一个组件实例；状态只在插槽里可见 |
| 一组必须一起使用的组件 | 复合组件 + provide/inject | 中：结构自由，部件固定 | 使用者要记住部件的搭配；要检查 inject 的结果 |
| 同一个组件里少量可变的内容 | 插槽 | 只管那一个位置 | 插槽 props 成为公开 API（第 35 章 35.5 节） |
| 对一个元素的 DOM 操作 | 自定义指令（[第 10 章](/chapters/10-directives)） | 只管这一个元素 | 不能渲染内容 |

**从一个例子看。**三个页面都有“点击空白处关闭弹层”。逻辑只有一段，标记各页不同：写成组合式函数。商品页有三处完全相同的价格展示，带同样的样式：写成组件，再用一个插槽放促销标签。设置页有“资料、安全、通知”三个互相切换的面板，共享当前标签：写成复合组件。

选择的顺序是**先写最简单的，重复出现了再往上加**。逻辑重复了，先提取组合式函数。界面结构也重复了，再提取组件。拆分的信号：组件超过约 200 行，或者有多个互不相关的功能。不要为了层数而分层。

这张表讲的是自己项目里的取舍。如果这个函数或组件要给别的项目用，还要考虑使用者怎样接线、接口怎样演进，那是[第 35 章](/chapters/35-api-design)的内容。

::: pitfalls
1. 不要在一个组件中写多个大的 v-if 分支。把每个分支拆分为组件。原因：所有分支的数据和逻辑混在一个文件中，修改一个分支要读懂全部。
2. 不要在展示组件中调用 API 或 store。通过 props 和事件交换数据。原因：这样展示组件可以在其他页面复用，也容易测试。
3. 不要让表单直接修改 props 里的对象。复制成草稿，保存时再提交。原因：取消时无法还原，页面其他地方会提前显示未保存的内容。
4. 不要直接修改 inject 得到的状态。用 readonly 保护它，并提供修改方法。否则任何后代都能修改它，出错时很难找到修改位置。
5. 不要用 === 比较响应式数组中的元素和原始对象。用 id 或 name 比较。原因：响应式数组返回的是代理，不是原始对象。
6. 递归组件必须有停止条件。否则渲染不会结束。
7. 不要为了复用逻辑而写无渲染组件。先使用组合式函数。原因：无渲染组件多创建一个组件实例，逻辑也只能在模板中使用。
:::

::: selfcheck
<Sc :a="1">

多个页面都要跟踪鼠标位置，每个页面显示的方式不同。应该写什么？

<Opt>一个 MouseTracker 展示组件</Opt>
<Opt>一个 useMouse 组合式函数</Opt>
<Opt>一个自定义指令</Opt>

<template #explain>

解析：只复用状态和逻辑，界面由使用者决定。这时使用组合式函数。它没有额外的组件实例。自定义指令只适合操作一个元素的 DOM。

</template>
</Sc>

<Sc :a="2">

Tab 中执行下面的代码。`ctx.active` 是 `readonly(active)`。结果是什么？

```js
const ctx = inject(TabsKey)
ctx.active.value = 'security'
```

<Opt>active 变为 'security'，所有 Tab 更新</Opt>
<Opt>只有这个 Tab 的 active 改变</Opt>
<Opt>值不改变，开发环境显示警告</Opt>

<template #explain>

解析：readonly 拦截写入，值保持不变。开发环境显示警告。Tab 应该调用 ctx.select('security')。这样所有修改都经过 Tabs。

</template>
</Sc>

<Sc :a="0">

把 `<Tab>` 放在 `<Tabs>` 外面使用，会发生什么？

<Opt>inject 返回 undefined，Tab 抛出错误</Opt>
<Opt>Tab 自动创建一个新的 Tabs</Opt>
<Opt>Tab 正常显示，只是不能切换</Opt>

<template #explain>

解析：祖先组件中没有 provide(TabsKey)，inject 返回 undefined。本章的 Tab 检查 ctx，并抛出“必须放在 Tabs 中”的错误。这个检查让错误用法立即暴露。

</template>
</Sc>

<Sc :a="0">

OrderDetail.vue 有 400 行。它按订单状态分为三个大的 v-if 分支。每个分支有自己的数据和侦听器。第一步应该怎样拆分？

<Opt>每个分支拆成一个组件，父组件选择</Opt>
<Opt>三个分支的逻辑都移到 useOrder() 中</Opt>
<Opt>把 v-if 改为 v-show，减少重新创建</Opt>

<template #explain>

解析：34.1 节：每个分支有自己的数据和逻辑时，拆为分支组件。拆分后，每个组件只在显示时创建自己的数据和侦听器。只移到一个 useOrder() 中时，模板仍然有三个大分支。三套逻辑也挤在一个函数中。v-show 会同时创建三个分支的数据和侦听器，问题更严重。

</template>
</Sc>

<Sc :a="2">

组件写 `<script setup lang="ts" generic="T extends { id: number }">`，props 是 `{ items: T[] }`，默认插槽的参数是 `{ item: T }`。父组件传入 `User[]`。插槽中的 item 是什么类型？

<Opt>{ id: number }</Opt>
<Opt>any</Opt>
<Opt>User</Opt>

<template #explain>

解析：generic 让 T 从父组件传入的 items 推导出来。所以 T 是 User。插槽中可以访问 User 的所有字段，并且有类型检查。`T extends { id: number }` 只是约束：T 至少要有 id，T 不等于这个约束。类型被保留，所以不是 any。

</template>
</Sc>

<Sc :a="0">

回顾（第 9 章）：订单页用 `<component :is="views[status]">` 显示分支组件。status 从 pending 变为 shipped。OrderPending 中倒计时的状态会怎样？

<Opt>组件被卸载，状态丢失</Opt>
<Opt>组件被隐藏，状态保留</Opt>
<Opt>和新组件共用一个实例</Opt>

<template #explain>

解析：第 9 章：动态组件切换时，Vue 卸载旧组件。所以倒计时的状态丢失，onUnmounted 运行。要保留状态，用 `<KeepAlive>` 包住 `<component>`。不同的组件不会共用实例。

</template>
</Sc>

<Sc :a="1">

UserForm 在 setup 里写了 `const draft = reactive({ ...props.user })`，没有别的代码。用户 A 的资料正在编辑。父组件把 `user` 换成用户 B（一个新对象）。输入框里显示什么？

<Opt>用户 B 的资料，props 变了，draft 自动更新</Opt>
<Opt>仍然是用户 A 的资料</Opt>
<Opt>空白，draft 被清空</Opt>

<template #explain>

解析：`reactive({ ...props.user })` 只在 setup 里运行一次，把当时的值复制进草稿。之后 props 变化，草稿不会跟着变（实测，没有 watch 时 draft 仍是 A 的数据）。要在父组件换数据时重置草稿，需要 `watch(() => props.user, u => Object.assign(draft, u))`。第一项把草稿当成了 props 的视图。第三项没有任何代码会清空草稿。

</template>
</Sc>

:::

::: summary
- 大的分支拆分为组件，用 `<component :is>` 选择。代价是共享数据要通过 props 传，分支很短时不拆。
- 容器组件获取数据，展示组件只依赖 props。列表和列表项分开。容器也可以是组合式函数。
- 表单先改草稿，保存时发送 submit 事件。父组件换数据时用 watch 重置草稿，父组件不要每次渲染都传新对象。
- 作用域插槽把显示交给父组件。动态插槽名用于定制列和转发插槽，转发时作用域参数一起转发。
- 复合组件用 provide/inject 和 InjectionKey 共享状态，用 readonly 保护状态。部件的顺序是注册的顺序。
- 递归组件用文件名或 name 引用自己，并需要停止条件。泛型组件用 generic 属性保持类型。
- 选型：先写组合式函数，界面结构重复时再提取组件，一组部件共享状态时用复合组件。
:::
