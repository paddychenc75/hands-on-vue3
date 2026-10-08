---
title: Vue Router
id: router
stage: 3
chapter: 17
desc: 路由匹配、动态参数、导航守卫
---

<script setup>
import RouterViewDepth from '../figures/17-router/RouterViewDepth.vue'
import NavigationFlow from '../figures/17-router/NavigationFlow.vue'
import MiniRouter from '../labs/17-router/MiniRouter.vue'
</script>

# Vue Router

::: goals
<Goal checks="sc:1,sc:2,sc:4,ex:routeTable">配置路由表。包括动态参数和 404 页面。</Goal>
<Goal checks="sc:0,ex:authGuard,ex:fbRouter">用导航守卫检查登录。</Goal>
<Goal checks="sc:3">说出导航守卫的运行顺序。</Goal>

:::

::: rt
阅读主线约 13 分钟，深入内容约 3 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
Router 是**大楼的前台**：访客报出门牌号（URL），前台查表找到房间（组件）。导航守卫就是**门禁**：没有工牌就先去登记处。
:::

::: terms
路由
: URL 和组件的对应关系。

动态参数
: 路径中以冒号开头的部分，例如 /user/:id。

导航守卫
: 切换页面前运行的检查函数。

RouterView
: 显示当前路由对应组件的位置。

history 模式
: 使用正常路径、不带 # 的 URL 模式。
:::

::: why
你用 v-if 在列表页和详情页之间切换。用户刷新详情页后回到了列表页。后退按钮直接离开了网站。分享的链接总是打开首页。

原因：当前显示哪个页面只保存在变量中，没有写进 URL。

本章用 Vue Router 把 URL 对应到组件。导航守卫在切换页面前运行检查，例如检查登录。
:::

### 17.1 定义路由表并显示页面

本章的代码适用于 Vue Router 4/5。安装：`npm install vue-router`。从 4 升到 5，没有用 unplugin-vue-router 时没有破坏性变化。用过它的项目改用 Vue Router 5 自带的文件路由（见 17.7 节的深入）。

routes 数组把每个路径映射到一个组件。URL 改变时，Router 在 routes 中查找匹配的路由。`<RouterView>` 显示匹配的组件。

```js
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/task/:id', component: TaskDetail, props: true },   // :id 是动态参数
    { path: '/admin', component: () => import('./Admin.vue'), // 路由懒加载
      meta: { requiresAuth: true } },
    { path: '/login', component: Login },
    { path: '/:pathMatch(.*)*', component: NotFound },     // 404 页面
  ],
})
app.use(router)

// App.vue 的模板：<RouterView />

// 在组件中
const route = useRoute()     // 当前路由：route.params.id、route.query
const router = useRouter()   // 路由实例：router.push('/task/1')
```

懒加载的路由生成一个单独的文件。首页只下载首页需要的代码。

注意：history 模式使用正常的路径。所以要配置服务器，把所有路径返回 index.html。否则刷新页面时显示 404。

::: deep 路由匹配的排序
Router 给每个路径计算一个分数。分数高的路由先匹配。所以分数不同时，路由的书写顺序不影响结果。分数相同时，先定义的路由先匹配。

| 路径片段 | 分数 |
|---|---|
| 静态片段，例如 `/users` | 最高 |
| 动态参数，例如 `/:id` | 较低 |
| 有正则的参数，例如 `/:id(\\d+)` | 高于普通参数 |
| 可选或重复参数，例如 `/:id?`、`/:p*` | 更低 |
| 通配，例如 `/:pathMatch(.*)*` | 最低 |
:::

::: deep History 的实现
`createWebHistory` 使用浏览器的 History API：

1. `router.push(to)` 调用 `history.pushState()`。页面不刷新。
2. 用户点击浏览器的后退按钮时，浏览器触发 `popstate` 事件。
3. Router 监听 popstate，读取新地址，然后运行导航。

`createWebHashHistory` 把路径放在 `#` 之后。服务器只收到 `/`，所以不需要服务器配置。

Router 有一个响应式数据 `currentRoute`。RouterView 读取它，并显示匹配的组件。RouterLink 调用 `router.push()`。
:::

<Exercise id="routeTable" />

### 17.2 嵌套路由

几个页面共用一个外框，例如用户页的标签栏。在路由的 `children` 中定义子路由。父组件中要有一个 `<RouterView>`，子路由的组件显示在这里。

```js
const routes = [
  {
    path: '/user/:id',
    component: UserLayout,                     // UserLayout 的模板中有 <RouterView />
    children: [
      { path: '', name: 'user', component: UserHome },              // /user/1
      { path: 'posts', name: 'user-posts', component: UserPosts },  // /user/1/posts
    ]
  }
]
```

注意：子路由的 path 不以 `/` 开头。以 / 开头时，它是根路径。

下图说明嵌套的 RouterView 怎样选择组件。

<Figure caption="每个 RouterView 有一个深度。深度为 n 的 RouterView 显示 to.matched[n] 的组件。">
<RouterViewDepth />
</Figure>

**场景：登录页不显示侧边栏。**在路由的 meta 中写布局名称。App.vue 根据它选择布局组件：

```js
// router.ts
const routes = [
  { path: '/', component: Home, meta: { title: '首页' } },
  { path: '/login', component: Login, meta: { title: '登录', layout: 'blank' } },
]

// App.vue
const layouts = { default: DefaultLayout, blank: BlankLayout }
const route = useRoute()
const layout = computed(() => layouts[route.meta.layout ?? 'default'])
// 模板：<component :is="layout"><RouterView /></component>
```

也可以用嵌套路由实现布局。父路由的组件是布局。子路由显示在布局的 RouterView 中。

::: deep 嵌套路由和 RouterView 的深度
`to.matched` 是一个数组，包含从父路由到子路由的所有记录。每个 RouterView 用 provide/inject 得到自己的深度。深度为 0 的 RouterView 渲染 `matched[0]` 的组件，深度为 1 的渲染 `matched[1]`。

```js
// RouterView（简化）
setup() {
  const depth = inject(viewDepthKey, 0)
  provide(viewDepthKey, depth + 1)                    // 子组件中的 RouterView 深度加 1
  const route = inject(routerViewLocationKey)
  return () => {
    const record = route.value.matched[depth]
    const props = record?.props.default ? route.value.params : null  // 只有路由配置了 props 才传入
    return record ? h(record.components.default, props) : null
  }
}
```
:::

### 17.3 RouterLink 和激活类名

RouterLink 渲染为 `<a>`。点击时，它跳转而不刷新页面。当前路由匹配这个链接时，RouterLink 添加类名：

- `router-link-active`：链接的路由包含在当前路由中。例如当前是 /user/1/posts，链接 /user/1 也激活。
- `router-link-exact-active`：链接的路由正好是当前路由。

```html
<RouterLink :to="{ name: 'user-posts', params: { id: 1 } }">文章</RouterLink>
<RouterLink to="/about" replace>关于</RouterLink>           <!-- replace：不添加历史记录 -->

<!-- 自定义渲染：custom + v-slot -->
<RouterLink to="/cart" custom v-slot="{ navigate, isActive }">
  <button :class="{ on: isActive }" @click="navigate">购物车</button>
</RouterLink>
```

### 17.4 编程式导航和 query

在代码中跳转，例如保存成功后打开详情页，用下面的方法：

| 方法 | 作用 |
|---|---|
| `router.push(to)` | 跳转。添加一条历史记录。 |
| `router.replace(to)` | 跳转。替换当前历史记录。 |
| `router.go(n)` | 在历史记录中前进或后退 n 步。`router.back()` 等于 go(-1)。 |

```js
router.push('/user/1')
router.push({ name: 'user', params: { id: 1 }, query: { tab: 'info' } })   // 命名路由：路径改变时代码不用改
router.push({ path: '/user/1', params: { id: 2 } })   // 错误：有 path 时，params 被忽略

// push 返回 Promise。导航完成后才 resolve
const failure = await router.push('/admin')
if (isNavigationFailure(failure, NavigationFailureType.aborted)) {
  console.log('守卫取消了导航')
}
```

**场景：看板的筛选条件写进 URL。**用户刷新或分享链接后，筛选条件保留。用可写的 computed（[第 4 章](/chapters/04-computed)）读写 `route.query`。用 `replace`，因为每次选择不需要一条历史记录。值为 undefined 时，Router 删除这个参数。

```js
const owner = computed({
  get: () => route.query.owner ?? '',
  set: v => router.replace({ query: { ...route.query, owner: v || undefined } })
})
// 模板：<select v-model="owner">…</select>
```

**场景：打开任务详情弹窗。**打开弹窗时，用 `push` 写入 `?task=12`。用户点击浏览器的后退按钮，弹窗关闭。query 的值是字符串，读取时转换为数字。

```js
const openId = computed(() => Number(route.query.task) || null)
function open(id) {
  router.push({ query: { ...route.query, task: id } })
}
function close() {
  router.push({ query: { ...route.query, task: undefined } })
}
// 模板：<TaskDialog v-if="openId" :id="openId" @close="close" />
```

注意：不要把 query 复制到一个 ref 中再修改 ref。两份数据会不同步。直接从 `route.query` 计算，修改时调用 push 或 replace。

### 17.5 读取路由参数

组件直接读取 useRoute() 时，只能在路由中使用。把参数传为 props，组件可以在任何地方复用。

```js
{ path: '/user/:id', component: User, props: true }                     // 布尔：params 作为 props，id 是字符串
{ path: '/promo', component: Banner, props: { theme: 'dark' } }           // 对象：固定的 props
{ path: '/search', component: Search,
  props: route => ({ q: route.query.q, page: Number(route.query.page) || 1 }) }   // 函数：自己转换
```

**场景：从 /user/1 跳到 /user/2。**两个地址匹配同一条路由，所以 Router 复用组件。setup 和 onMounted 不再运行。用下面两种方法之一重新加载数据：

```js
// 方法 1：侦听参数
const route = useRoute()
watch(() => route.params.id, id => loadUser(id), { immediate: true })

// 方法 2：组件内守卫。导航确认前运行，可以取消导航
onBeforeRouteUpdate(async (to, from) => {
  if (to.params.id !== from.params.id) user.value = await fetchUser(to.params.id)
})
```

注意：watch 的数据源写 getter `() => route.params.id`。直接传入 `route.params.id` 只传入一个字符串，watch 不会触发。

### 17.6 导航守卫

导航守卫在切换页面前运行检查。守卫返回 `false` 时，导航取消。守卫返回一个新地址时，Router 跳转到新地址。下图说明一次导航的过程。

<Figure caption="一次导航先匹配路由，再运行守卫。守卫返回 false 时取消，返回新地址时重新导航。">
<NavigationFlow />
</Figure>

**场景：未登录时访问后台。**在 beforeEach 中检查路由的 meta。把目标地址存入 query，登录后再跳回：

```js
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !auth.loggedIn)
    return { path: '/login', query: { redirect: to.fullPath } }
})

// 登录页：登录成功后
router.push(route.query.redirect || '/')
```

注意：只检查需要登录的路由。否则重定向到 /login 时，守卫再次重定向，形成无限重定向。

<Lab id="demo-router" title="实验台：简化的路由和导航守卫" note="动态参数、重定向、404">
<template #predict>
<Sc predict :a="1">

先猜：/admin 需要登录，当前未登录。点击 /admin，然后在登录页点击“一键登录”。最后显示哪个页面？

<Opt>首页。登录后总是回到 /</Opt>
<Opt>管理后台。Router 跳回 /admin</Opt>
<Opt>登录页。要再点击一次 /admin</Opt>

<template #explain>

解析：守卫把目标地址存入查询参数 redirect=/admin，然后跳转到 /login。登录后，代码读取 redirect，并调用 push("/admin")。这时已经登录，守卫放行。打开实验台，点击 /admin，再点击“一键登录”，看地址栏和日志。

</template>
</Sc>
</template>

<MiniRouter />
</Lab>

**场景：编辑任务时有未保存的修改。**用户编辑任务后点击其他链接。在 setup 中调用 `onBeforeRouteLeave`。有未保存的修改时询问用户。守卫返回 false，导航取消。

```vue
<script setup>
import { ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
const dirty = ref(false)   // 输入时设为 true，保存后设为 false
onBeforeRouteLeave(() => {
  if (dirty.value && !window.confirm('修改没有保存。确定离开吗？')) return false
})
</script>
```

守卫可以是 async 函数。Router 等待 Promise 完成。例如离开前自动保存草稿：`onBeforeRouteLeave(async () => { if (dirty.value) await saveDraft() })`。

注意：刷新和关闭标签页时，这个守卫不运行。同时监听 window 的 `beforeunload` 事件。

**场景：按路由设置页面标题。**afterEach 在导航确认后运行。它不能取消导航，适合做记录和修改标题：

```ts
router.afterEach(to => {
  document.title = to.meta.title ? `${to.meta.title} - 我的商店` : '我的商店'
})

// 为 meta 声明类型
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    layout?: 'default' | 'blank'
    requiresAuth?: boolean
  }
}
```

`to.meta` 合并了所有匹配的路由记录的 meta。子路由的值覆盖父路由的值。

一次导航按下面的顺序运行守卫：

1. 离开的组件：`beforeRouteLeave`
2. 全局：`beforeEach`
3. 复用的组件：`beforeRouteUpdate`
4. 路由配置：`beforeEnter`
5. 加载异步组件
6. 进入的组件：`beforeRouteEnter`
7. 全局：`beforeResolve`
8. 确认导航
9. 全局：`afterEach`
10. 更新 DOM

::: deep 导航守卫是一个 Promise 队列
```js
// vue-router（简化）
async function navigate(to, from) {
  const queues = [
    extractGuards(leavingRecords, 'beforeRouteLeave'),
    beforeGuards.list(),                               // router.beforeEach
    extractGuards(updatingRecords, 'beforeRouteUpdate'),
    to.matched.map(r => r.beforeEnter).flat(),
    () => extractGuards(enteringRecords, 'beforeRouteEnter'),  // 提取时加载懒加载组件 () => import(...)
    beforeResolveGuards.list()
  ]
  for (let guards of queues) {
    if (typeof guards === 'function') guards = await guards()   // beforeEnter 之后才加载组件
    for (const guard of guards) {
      const result = await guard(to, from)
      if (result === false) throw new NavigationAborted()            // 取消
      if (typeof result === 'string' || isRouteLocation(result))
        return navigate(resolve(result), from)                        // 重定向：重新开始
    }
  }
  currentRoute.value = to                              // shallowRef：RouterView 因此更新
  afterGuards.list().forEach(g => g(to, from))
}
```
:::

下面的练习使用一个迷你路由。它按 beforeEach 的规则处理守卫的返回值。

<Exercise id="fbRouter" />

<Exercise id="authGuard" />

### 17.7 滚动行为和页面过渡

切换页面后，浏览器不会自动回到顶部。用 `scrollBehavior` 控制滚动位置：

```js
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition                  // 浏览器后退时，回到原来的位置
    if (to.hash) return { el: to.hash, behavior: 'smooth' }  // 有锚点时，滚动到锚点
    return { top: 0 }                                        // 其他情况：回到顶部
  }
})
```

**场景：页面切换有过渡，列表页保留状态。**RouterView 的插槽提供当前路由的组件。用它组合 Transition、KeepAlive 和 Suspense（[第 9 章](/chapters/09-builtins)）。嵌套顺序是 Transition → KeepAlive → Suspense：

```html
<RouterView v-slot="{ Component, route }">
  <template v-if="Component">
    <Transition :name="route.meta.transition || 'fade'" mode="out-in">
      <KeepAlive :include="['ProductList']">
        <Suspense>
          <component :is="Component" :key="route.path" />
          <template #fallback>加载中…</template>
        </Suspense>
      </KeepAlive>
    </Transition>
  </template>
</RouterView>
```

`:key="route.path"` 让同一个组件在参数改变时重新创建。不需要重新创建时，删除 key。

::: deep 基于文件的路由
Vue Router 5 自带基于文件的路由。它的 Vite 插件根据 `src/pages` 中的文件生成路由。例如 `pages/users/[id].vue` 对应 `/users/:id`。它还生成路由名和参数的类型。

```js
// vite.config.ts：VueRouter() 必须放在 vue() 之前
import VueRouter from 'vue-router/vite'
export default defineConfig({ plugins: [VueRouter(), vue()] })

// router.ts
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
export const router = createRouter({ history: createWebHistory(), routes })
```

Vue Router 4 的项目用单独的包 unplugin-vue-router 实现这个功能。它已经合并进 Vue Router 5，npm 上标记为废弃。从它迁移时，按下面的步骤修改：

1. 把 `unplugin-vue-router/vite` 改为 `vue-router/vite`。
2. 保留 `vue-router/auto-routes` 的导入。
3. 删除 `/// <reference types="unplugin-vue-router/client" />`，然后卸载 unplugin-vue-router。

Nuxt 默认使用基于文件的路由。
:::

::: pitfalls
1. 从 `/user/1` 到 `/user/2` 时，用 `watch(() => route.params.id, ...)` 加载数据。原因：Router 复用同一个组件，`onMounted` 不再运行。
2. 使用 history 模式时，配置服务器把所有路径返回 index.html。否则刷新页面时显示 404。
3. 在守卫中，检查目标是否已经是 /login。否则会无限重定向。
4. 有 path 时不要传 params。用命名路由传 params。原因：有 path 时，Router 忽略 params。
:::

::: selfcheck
<Sc :a="2">

用户没有登录，打开 /login。会发生什么？

```js
router.beforeEach(to => {
  if (!auth.loggedIn) return '/login'
})
```

<Opt>显示登录页</Opt>
<Opt>导航取消，页面空白</Opt>
<Opt>守卫一次次重定向到 /login，形成无限重定向</Opt>

<template #explain>

解析：重定向到 /login 时，守卫再次运行。条件仍然成立，所以又一次重定向。加上条件 `to.path !== '/login'`。

</template>
</Sc>

<Sc :a="0">

从 /user/1 跳到 /user/2。User 组件中的 `onMounted` 会怎样？

<Opt>不运行。Router 复用这个组件</Opt>
<Opt>再运行一次</Opt>
<Opt>运行两次</Opt>

<template #explain>

解析：两个地址匹配同一条路由。Router 复用组件，setup 和 onMounted 不再运行。用 `watch(() => route.params.id, ...)` 重新加载数据。

</template>
</Sc>

<Sc :a="1">

下面的代码跳转到哪个地址？

```css
router.push({ path: '/user/1', params: { id: 2 } })
```

<Opt>/user/2</Opt>
<Opt>/user/1</Opt>
<Opt>报错，不跳转</Opt>

<template #explain>

解析：有 path 时，Router 忽略 params。要使用 params，改用命名路由：`{ name: 'user', params: { id: 2 } }`。

</template>
</Sc>

<Sc :a="1">

从 /home 导航到 /admin。Home 组件有 `beforeRouteLeave`。/admin 的路由配置有 `beforeEnter`。全局有 `beforeEach` 和 `afterEach`。运行顺序是什么？

<Opt>beforeEach → beforeEnter → Leave → afterEach</Opt>
<Opt>Leave → beforeEach → beforeEnter → afterEach</Opt>
<Opt>beforeEach → Leave → afterEach → beforeEnter</Opt>

<template #explain>

解析：Leave 指 beforeRouteLeave。Router 先问离开的组件能否离开。所以 beforeRouteLeave 最先运行。然后运行全局的 beforeEach，再运行路由配置的 beforeEnter。导航确认后才运行 afterEach，所以它不能取消导航。beforeEnter 属于确认前的检查，不会在 afterEach 之后运行。

</template>
</Sc>

<Sc :a="0">

routes 数组的第一项是 `{ path: '/:pathMatch(.*)*', component: NotFound }`，后面有 `{ path: '/login', component: Login }`。用户打开 /login。显示什么？

<Opt>Login</Opt>
<Opt>NotFound</Opt>
<Opt>报错：路由冲突</Opt>

<template #explain>

解析：Vue Router 4/5 按路径的分数匹配，不按书写顺序。静态片段 /login 的分数最高，通配的分数最低，所以显示 Login。因此 404 路由可以写在任何位置。Vue Router 3 按书写顺序匹配，那时才要求把通配写在最后。两条路由都合法，所以不报错。

</template>
</Sc>

<Sc :a="1">

回顾（第 4 章）：详情页要在 id 改变时重新请求数据。`route` 是 `useRoute()` 的返回值。哪种写法有效？

<Opt>watch(route.params.id, load)</Opt>
<Opt>watch(() => route.params.id, load)</Opt>
<Opt>computed(() => load(route.params.id))</Opt>

<template #explain>

解析：第 4 章：watch 的数据源必须是 ref、reactive 或 getter。`route.params.id` 是一个字符串。直接传入时，watch 只得到当时的值，所以永远不触发，开发环境还显示警告。getter 每次运行都读取 `route.params.id`，所以能跟踪变化。computed 用于计算值，没有被读取时不运行，也不应该发请求。

</template>
</Sc>

:::

::: summary
- routes 把路径映射到组件。routes 支持动态参数、懒加载和 404。
- 嵌套路由用 children，父组件中放 RouterView。
- RouterLink 渲染链接，并添加激活类名。
- useRoute 读取路由。useRouter 跳转。页面状态可以写进 query。
- 参数用 props 传入组件。参数改变时用 watch 重新加载。
- beforeEach 返回新地址时，Router 重定向。onBeforeRouteLeave 保护未保存的修改。
- scrollBehavior 控制滚动。RouterView 的插槽组合过渡和缓存。
:::
