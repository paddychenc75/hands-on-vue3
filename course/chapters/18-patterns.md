---
title: 组件设计模式
id: patterns
stage: 4
chapter: 18
desc: 分支组件、复合组件、递归组件、泛型组件
---

<script setup>
import ContainerVsPresentational from '../figures/18-patterns/ContainerVsPresentational.vue'
import CompoundTabsProvide from '../figures/18-patterns/CompoundTabsProvide.vue'
import PatTabs from '../labs/18-patterns/PatTabs.vue'
import PatTree from '../labs/18-patterns/PatTree.vue'
</script>

# 组件设计模式

::: goals
<Goal checks="sc:3">把一个大组件拆分为职责单一的小组件。</Goal>
<Goal checks="sc:1,sc:2">用插槽 props 和 provide/inject 设计灵活的组件接口。</Goal>
<Goal checks="sc:4,ex:treeItem,ex:fbPatterns">写一个递归组件和一个泛型组件。</Goal>
<Goal checks="sc:0">判断逻辑应该放在组合式函数中还是组件中。</Goal>

:::

::: rt
阅读主线约 15 分钟，深入内容约 2 分钟（可选）。另外留时间做实验台、练习和自测。
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

泛型组件
: props 的类型由使用者决定的组件。
:::

::: why
一个组件有几百行。你修改筛选功能，结果分页坏了。组件之间传递的 props 也越来越多。

原因：所有功能共用同一份数据和同一个模板。

本章介绍拆分和组合组件的常用方法。每个组件只负责一件事，只通过 props、事件和插槽交换数据。所以修改一个组件，不影响其他组件。
:::

### 18.1 把大的 v-if 分支拆分为组件

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

注意：状态改变时，Vue 卸载旧组件，旧组件的状态丢失。要保留状态，用 `<KeepAlive>` 包住 `<component>`（见[第 7 章](/chapters/07-builtins)）。

::: deep 懒加载拆出的组件
不在首屏显示的大组件，例如图表和富文本编辑器，用 `defineAsyncComponent` 加载（第 7 章）：

```js
const ChartPanel = defineAsyncComponent({
  loader: () => import('./ChartPanel.vue'),   // 单独打包，第一次渲染时才下载
  loadingComponent: Spinner,
  delay: 200,                                 // 200ms 内加载完成时，不显示 Spinner
  errorComponent: LoadError,
})
// 模板：<ChartPanel v-if="showChart" />
```

服务端渲染的页面中，3.5+ 可以延迟组件的水合，例如 `hydrate: hydrateOnVisible()`。组件进入可视区域时才水合。
:::

### 18.2 拆分容器组件和展示组件

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

不要强求所有组件都分成两类。组件变复杂时，再这样拆分。

### 18.3 表单组件：先改草稿，再提交

编辑表单不直接修改父组件的数据。表单复制一份数据作为草稿。用户点击保存时，表单发送 submit 事件：

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

注意：`{ ...props.user }` 只复制第一层。草稿中有嵌套对象时，复制嵌套的部分，例如用 `structuredClone(toRaw(props.user))`。

### 18.4 作用域插槽：无渲染组件和动态插槽名

组件提供数据，父组件决定怎样显示数据。这时使用作用域插槽（[第 5 章](/chapters/05-comm)）。

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

只复用逻辑时，组合式函数更简单（见 17.8）。无渲染组件适合在模板中组合，例如表格的列和虚拟列表的行。

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
      <slot :name="name" v-bind="scope || {}" />
    </template>
  </TaskTable>
  <Pager />
</template>
```

注意：不要在 `#[...]` 中写含空格或引号的表达式。HTML 属性名不能包含这些字符。先在脚本中算出插槽名，再写 `#[slotName]`。

### 18.5 复合组件：Tabs 和 Tab

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

隐藏“安全”，然后再显示它。“安全”的按钮移到了最后。下面的深入部分说明原因。

::: deep 复合组件中子组件的顺序
Tab 在 setup 中注册。重新挂载的 Tab 最后运行 setup，所以它在数组的最后。

有两种解决方法：

1. 挂载后，按 DOM 顺序排序。用 compareDocumentPosition 比较。
2. 在 Tabs 中读取默认插槽的 vnode。按 vnode 的顺序生成按钮。

方法 1 要比较元素，所以 Tab 注册时要带上自己的根元素。上面的 register 只保存了 `{ name, title }`，按下面的步骤修改：

1. 在 Tab 的模板中给根元素加 `ref="root"`。
2. 把注册从 setup 移到 onMounted。setup 运行时，元素还不存在。
3. 注册时传入 `el: rootEl.value`。TabsContext 中 register 的参数类型也加上 `el: HTMLElement`。
4. Tabs 在 register 中加入新项后排序。

```js
// Tab.vue：模板 <div ref="root" v-show="isActive"><slot /></div>
const rootEl = useTemplateRef('root')
let unregister = () => {}
onMounted(() => {
  unregister = ctx.register({ name: props.name, title: props.title, el: rootEl.value })
})
onUnmounted(() => unregister())

// Tabs.vue：方法 1，按元素在文档中的位置排序
function sortByDom() {
  tabs.value.sort((a, b) =>
    a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
}
// register(tab) { tabs.value.push(tab); sortByDom(); … }
```

DOM 元素不会被 reactive 包装成代理，所以 `a.el` 就是真实的元素。
:::

### 18.6 递归组件

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

没有使用单文件组件时，给组件写 `name` 选项。组件在模板中用这个名字引用自己。

递归必须有停止条件。上例中，没有子节点时，v-if 为假，递归停止。

每一层需要知道自己的深度时，每个节点 inject 父节点的深度，再 provide 深度加 1。实验台使用这个方法。

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

<Exercise id="fbPatterns" />

<Exercise id="treeItem" />

### 18.7 泛型组件：generic

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

`T extends { id: … }` 只是约束：T 至少要有 id。T 的其他字段都保留。props、事件和插槽的类型写法见[第 21 章](/chapters/21-ts)。

### 18.8 选择组合式函数还是组件

| 情况 | 选择 |
|---|---|
| 只复用状态和逻辑，例如鼠标位置、请求 | 组合式函数 |
| 复用一段界面结构和样式 | 组件 |
| 复用逻辑，界面由使用者决定 | 组合式函数。在模板中组合时，用无渲染组件。 |
| 一组必须一起使用的组件 | 复合组件 + provide/inject |
| 对一个元素的 DOM 操作 | 自定义指令（[第 8 章](/chapters/08-directives)） |

组件超过约 200 行，或者有多个不相关的功能时，考虑拆分。按下面的顺序做：

1. 先提取组合式函数。
2. 界面结构重复时，再提取组件。

::: pitfalls
1. 不要在一个组件中写多个大的 v-if 分支。把每个分支拆分为组件。原因：所有分支的数据和逻辑混在一个文件中，修改一个分支要读懂全部。
2. 不要在展示组件中调用 API 或 store。通过 props 和事件交换数据。原因：这样展示组件可以在其他页面复用，也容易测试。
3. 不要直接修改 inject 得到的状态。用 readonly 保护它，并提供修改方法。否则任何后代都能修改它，出错时很难找到修改位置。
4. 不要用 === 比较响应式数组中的元素和原始对象。用 id 或 name 比较。原因：响应式数组返回的是代理，不是原始对象。
5. 递归组件必须有停止条件。否则渲染不会结束。
6. 不要为了复用逻辑而写无渲染组件。先使用组合式函数。原因：无渲染组件多创建一个组件实例，逻辑也只能在模板中使用。
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

解析：18.1 节：每个分支有自己的数据和逻辑时，拆为分支组件。拆分后，每个组件只在显示时创建自己的数据和侦听器。只移到一个 useOrder() 中时，模板仍然有三个大分支。三套逻辑也挤在一个函数中。v-show 会同时创建三个分支的数据和侦听器，问题更严重。

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

回顾（第 7 章）：订单页用 `<component :is="views[status]">` 显示分支组件。status 从 pending 变为 shipped。OrderPending 中倒计时的状态会怎样？

<Opt>组件被卸载，状态丢失</Opt>
<Opt>组件被隐藏，状态保留</Opt>
<Opt>和新组件共用一个实例</Opt>

<template #explain>

解析：第 7 章：动态组件切换时，Vue 卸载旧组件。所以倒计时的状态丢失，onUnmounted 运行。要保留状态，用 `<KeepAlive>` 包住 `<component>`。不同的组件不会共用实例。

</template>
</Sc>

:::

::: summary
- 大的分支拆分为组件，用 `<component :is>` 选择。
- 容器组件获取数据，展示组件只依赖 props。列表和列表项分开。
- 表单先改草稿，保存时发送 submit 事件。
- 作用域插槽把显示交给父组件。动态插槽名用于定制列和转发插槽。
- 复合组件用 provide/inject 和 InjectionKey 共享状态，用 readonly 保护状态。
- 递归组件用文件名或 name 引用自己，并需要停止条件。
- 泛型组件用 generic 属性保持类型。
- 先提取组合式函数，界面重复时再提取组件。
:::
