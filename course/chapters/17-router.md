---
title: Vue Router
id: router
stage: 3
chapter: 17
desc: 路由表、导航守卫、登录鉴权、数据加载时机
---

<script setup>
import RouterViewDepth from '../figures/17-router/RouterViewDepth.vue'
import NavigationFlow from '../figures/17-router/NavigationFlow.vue'
import AuthFlow from '../figures/17-router/AuthFlow.vue'
import AuthFlowDemo from '../labs/17-router/AuthFlowDemo.vue'
import GuardOrder from '../labs/17-router/GuardOrder.vue'
</script>

# Vue Router

::: goals
<Goal checks="sc:2,sc:4,ex:routeTable">配置路由表，包括动态参数、嵌套路由和 404 页面。</Goal>
<Goal checks="sc:1,sc:5,ex:paramReuse">说明参数变化时组件被复用，并用 watch 重新加载数据。</Goal>
<Goal checks="sc:0,sc:3,sc:8,ex:realRouterGuard">用导航守卫检查登录，说出守卫的运行顺序。</Goal>
<Goal checks="sc:9,ex:authFlow">把 store、守卫、回跳、角色和退出串成完整的登录流程。</Goal>
<Goal checks="sc:6,sc:7,ex:addRouteRefresh">判断是否需要动态添加路由，并避免刷新后 404；理解导航失败。</Goal>

:::

::: rt
阅读主线约 15 分钟，深入内容约 4 分钟（可选）。另外留时间做实验台、练习、自测和本地任务。
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

路由元信息（meta）
: 写在路由上的自定义数据，守卫和组件通过 `route.meta` 读取。

命名路由
: 有 `name` 的路由。跳转时用名字和参数，不写路径。
:::

::: why
你用 v-if 在列表页和详情页之间切换。用户刷新详情页后回到了列表页。后退按钮直接离开了网站。分享的链接总是打开首页。

原因：当前显示哪个页面只保存在变量中，没有写进 URL。

本章用 Vue Router 把 URL 对应到组件。导航守卫在切换页面前运行检查。最后你会把第 16 章的 `auth` store 和守卫接起来，做出完整的登录流程：未登录跳到登录页，登录后跳回，按角色限制访问，退出。
:::

### 17.1 定义路由表并显示页面

本章的代码适用于 Vue Router 4/5。安装：`npm install vue-router`。从 4 升到 5，没有用 unplugin-vue-router 时没有破坏性变化。用过它的项目改用 Vue Router 5 自带的文件路由（见 17.10 节的深入）。

routes 数组把每个路径映射到一个组件。URL 改变时，Router 在 routes 中查找匹配的路由。`<RouterView>` 显示匹配的组件。

```js
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),   // 部署在子路径时，传入这个子路径
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/task/:id', name: 'task', component: TaskDetail, props: true },  // :id 是动态参数
    { path: '/admin', component: () => import('./Admin.vue'),                 // 路由懒加载
      meta: { requiresAuth: true } },
    { path: '/old-tasks', redirect: '/' },                // redirect：访问 /old-tasks 时，地址变成 /
    { path: '/start', component: Home, alias: '/home' },  // alias：访问 /home 也显示 Home，地址不变
    { path: '/login', component: Login },
    { path: '/:pathMatch(.*)*', component: NotFound },    // 404 页面
  ],
})
app.use(router)

// App.vue 的模板：<RouterView />

// 在组件中
const route = useRoute()     // 当前路由：route.params.id、route.query
const router = useRouter()   // 路由实例：router.push('/task/1')
```

懒加载的路由生成一个单独的文件。首页只下载首页需要的代码。

三种 history 模式的取舍：

| 模式 | 地址 | 服务器 |
|---|---|---|
| `createWebHistory` | `/task/1` | 要把所有路径返回 index.html，否则刷新时显示 404 |
| `createWebHashHistory` | `/#/task/1` | 不用配置。`#` 之后的部分不会发给服务器，不利于搜索引擎收录 |
| `createMemoryHistory` | 没有地址栏 | 服务端渲染、测试，以及本课程的练习 |

新项目默认用 `createWebHistory`。

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


下面的练习运行在真实的 Vue Router 上。后面几节的练习也是。

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

::: deep 命名视图：同一个页面里有多个 RouterView
一个页面要同时显示多个组件（例如主区域和侧边栏）时，给路由写 `components`（注意带 s），给 RouterView 写 `name`：

```js
{ path: '/', components: { default: Home, sidebar: Sidebar } }
// 模板：<RouterView />                   显示 default（Home）
//       <RouterView name="sidebar" />    显示 Sidebar
```

用得不多。读别人的路由表时会遇到。
:::

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

导航没有成功时，`push` 不抛错，而是 resolve 一个 NavigationFailure。有三种：`aborted`（守卫返回了 false）、`cancelled`（导航进行中又发起了新的导航）、`duplicated`（目标和当前地址相同）。守卫返回新地址属于重定向，不算失败。

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

**场景：从 /user/1 跳到 /user/2。**两个地址匹配同一条路由，所以 Router 复用组件。setup 和 onMounted 不再运行。用下面三种方法之一重新加载数据：

```js
// 方法 1：侦听参数（最常用）
const route = useRoute()
watch(() => route.params.id, id => loadUser(id), { immediate: true })

// 方法 2：组件内守卫。导航确认前运行，可以取消导航。第一次进入时不运行，所以还要自己加载一次
onBeforeRouteUpdate(async (to, from) => {
  if (to.params.id !== from.params.id) user.value = await fetchUser(to.params.id)
})

// 方法 3：用 key 让组件在地址变化时重新创建（状态也一起重置）
// 模板：<RouterView :key="$route.fullPath" />
```

方法 3 最省事，代价是每次都销毁并重建组件，输入框里写了一半的内容也会丢。

注意：watch 的数据源写 getter `() => route.params.id`。直接传入 `route.params.id` 只传入一个字符串，watch 不会触发。

<Exercise id="paramReuse" />

### 17.6 导航守卫

导航守卫在切换页面前运行检查。守卫返回 `false` 时，导航取消。守卫返回一个新地址时，Router 跳转到新地址。下图说明一次导航的过程。

<Figure caption="一次导航先匹配路由，再运行守卫。守卫返回 false 时取消，返回新地址时重新导航。">
<NavigationFlow />
</Figure>

**场景：未登录时访问后台。**在 beforeEach 中检查路由的 meta。把目标地址存入 query，登录后再跳回。这里先看最小的写法，完整的登录流程在 17.8 节：

```js
router.beforeEach((to) => {
  const auth = useAuthStore()      // 第 16 章的 store。在守卫里调用，不要在模块顶层调用
  if (to.meta.requiresAuth && !auth.loggedIn)
    return { path: '/login', query: { redirect: to.fullPath } }
})
```

注意：只检查需要登录的路由。否则重定向到 /login 时，守卫再次重定向，形成无限重定向。

`to.meta` 合并了所有匹配的路由记录的 meta。父路由有的字段，子路由没写时继承；子路由写了同名字段，覆盖父路由的值。

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

**场景：只保护一条路由。**`beforeEnter` 写在路由配置里，只在进入这条路由时运行。从 /user/1 换到 /user/2，路由没变，它不运行：

```js
{ path: '/admin', component: Admin, beforeEnter: (to, from) => { /* 返回 false 或新地址 */ } }
```

**场景：按路由设置页面标题。**afterEach 在导航确认后运行。它不能取消导航，适合做记录和修改标题。它还收到第三个参数：导航失败时的 NavigationFailure：

```ts
router.afterEach((to, from, failure) => {
  if (!failure) document.title = to.meta.title ? `${to.meta.title} - 我的商店` : '我的商店'
})
```

一次导航按下面的顺序运行守卫：

1. 离开的组件：`beforeRouteLeave`
2. 全局：`beforeEach`
3. 复用的组件：`beforeRouteUpdate`
4. 路由配置：`beforeEnter`
5. 加载异步组件
6. 进入的组件：`beforeRouteEnter`（只能写在选项式 API 里）
7. 全局：`beforeResolve`
8. 确认导航
9. 全局：`afterEach`
10. 更新 DOM

`<script setup>` 里只能用 `onBeforeRouteLeave` 和 `onBeforeRouteUpdate`。`beforeRouteEnter` 运行时组件还没创建，拿不到 `this`。旧写法靠第三个参数 `next(vm => …)` 拿到组件实例，这个 `next` 回调在 Vue Router 5 里已经废弃（开发环境会警告）。守卫直接 `return` 结果就行，要访问组件就用 `onMounted` 或 watch。

下面的实验台用真实的 Vue Router 打出每个守卫的调用。

<Lab id="demo-guard-order" title="实验台：真实的 Vue Router 里，守卫按什么顺序运行" note="三个页面组件都带组件内守卫；日志从上往下读">
<template #predict>
<Sc predict :a="1">

先猜：当前在 /user/1。点击 /user/2（同一条路由，只有参数不同）。哪些守卫会运行？

<Opt>beforeEach → beforeEnter → beforeRouteEnter → beforeResolve → afterEach</Opt>
<Opt>beforeEach → beforeRouteUpdate → beforeResolve → afterEach</Opt>
<Opt>beforeRouteLeave → beforeEach → beforeRouteEnter → beforeResolve → afterEach</Opt>

<template #explain>

解析：两个地址匹配同一条路由记录，组件被复用，所以是“更新”不是“离开再进入”：运行 beforeRouteUpdate，不运行 beforeRouteLeave、beforeEnter 和 beforeRouteEnter。beforeEach、beforeResolve 和 afterEach 是全局的，每次导航都运行。打开实验台，依次点击 /user/1、/user/2、/admin、/，对照上面的十步顺序。

</template>
</Sc>
</template>

<GuardOrder />
</Lab>

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


<Exercise id="realRouterGuard" />

### 17.7 在路由的哪个时机取数据

**问题。**详情页需要数据。在导航完成之后请求，还是在导航确认之前请求？

| | 导航后取（组件里） | 导航前取（守卫里） |
|---|---|---|
| 写法 | 组件里 `watch` 路由参数（17.5 节） | `beforeEach` 或 `beforeEnter` 里 `await` |
| 用户看到 | 页面立刻切换，数据区域显示“加载中” | 点击后页面不变，数据到了才切换 |
| 失败时 | 页面里显示错误，可以重试 | 要决定：留在原页、跳错误页，还是放行 |

**默认选导航后取。**页面立刻切换，用户知道点击生效了。加载中和失败是这个页面自己的状态。请求怎样写、怎样缓存和去重、竞态怎么处理，见[第 18 章](/chapters/18-data-fetching)。

**什么时候选导航前取？**数据决定能不能进入页面。例如 id 不存在时，要显示 404，而不是一个空的详情页。这需要先知道数据：

```js
{ path: '/task/:id', component: TaskDetail,
  beforeEnter: async (to) => {
    const task = await fetchTask(to.params.id)
    if (!task) return {
      name: 'not-found',                                   // 带 name 的通配路由：{ path: '/:pathMatch(.*)*', name: 'not-found', … }
      params: { pathMatch: to.path.substring(1).split('/') },
      query: to.query, hash: to.hash,                      // 地址栏保持原样，页面显示 404
    }
  } }
```

代价是：请求慢的时候，点击后页面没有反应。要配合一个全局的加载条（`beforeEach` 开始，`afterEach` 结束）。导航进行中用户又点了别的链接，前一次导航会被取消（`cancelled`），不会出现旧数据覆盖新页面。

官方的 Data Loaders 在 `vue-router/experimental` 下，还在实验阶段，本课程不展开。

### 17.8 把登录流程串起来

**问题。**登录鉴权由四块组成：store 记住谁登录了，守卫挡住没登录的人，登录页把人送回原来要去的地方，退出把人送走。每块都不难，难在接在一起。下图是整条线，用的是 16.5 节的 `auth` store。

<Figure caption="每次导航先等 restore，再检查登录和角色。未登录去登录页并带上 redirect，登录成功后回到 redirect。">
<AuthFlow />
</Figure>

**第 1 步：给路由做标记。**

```ts
{ path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
{ path: '/admin', component: Admin, meta: { requiresAuth: true, roles: ['admin'] } },
{ path: '/403', name: 'forbidden', component: Forbidden },
```

**第 2 步：全局守卫。**注意第一行 `await auth.restore()`：

```ts
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.restore()                       // 刷新后 user 在内存里已经没了，先用 token 换回来
  if (to.meta.requiresAuth && !auth.loggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.roles && !to.meta.roles.includes(auth.user?.role ?? 'member')) {
    return { name: 'forbidden' }
  }
})
```

少了这一行，用户在受保护的页面刷新时，守卫运行得比恢复登录状态更早，会看到 `loggedIn` 是 false，把一个明明登录着的用户踢到登录页。

**第 3 步：登录页回跳。**

```ts
function safeRedirect(value: unknown) {
  // 只接受站内路径：以单个 / 开头
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}
async function submit() {
  try {
    await auth.login(name.value, password.value)      // 失败会抛错，不会往下跳转
    await router.replace(safeRedirect(route.query.redirect))
  } catch { /* 错误已经在 auth.error 里 */ }
}
```

`redirect` 来自地址栏，谁都能改。`router.replace` 不会把用户带出站点，`//evil.com` 这样的值只会变成一个错误的地址，页面显示 404。但如果你的代码改用 `location.href = redirect` 整页跳转，它就是真正的开放重定向。所以只接受以单个 `/` 开头的路径。

**第 4 步：退出。**

```ts
async function logout() {
  auth.logout()
  await router.push({ name: 'login' })       // 只清空 store 不够：守卫只在导航时运行，页面不会自己离开
}
```

下面的实验台走一遍 /admin → 登录页 → 回到 /admin 的过程。

<Lab id="demo-router" title="实验台：未登录访问 /admin 的完整流程" note="真实的 Vue Router，memory history">
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

<AuthFlowDemo />
</Lab>

三点要记住：

- **前端的守卫只管体验。**它决定用户看到什么，不能保护数据。真正的权限检查在服务器。服务器返回 401（登录过期）时，请求层要统一清空登录状态并回到登录页，见[第 18 章](/chapters/18-data-fetching)。
- 菜单里隐藏链接不是权限控制，守卫和服务器才是。
- 守卫里读 store 要在守卫函数里调用 `useAuthStore()`（16.8 节）。

最后这道练习把 Pinia 和 Router 连起来。

<Exercise id="authFlow" />

### 17.9 按角色显示菜单，和动态添加路由

**问题。**不同角色看到不同的菜单，进入不同的页面。

**默认做法：路由表是静态的，只在 meta 里写 roles。**17.8 节的守卫已经能限制访问。菜单直接从路由记录算出来，不用再写第二份清单：

```ts
const menu = computed(() =>
  router.getRoutes().filter(r => r.meta.title && (!r.meta.roles || r.meta.roles.includes(auth.user?.role ?? 'member')))
)
// 模板：<RouterLink v-for="r in menu" :key="r.path" :to="r.path">{{ r.meta.title }}</RouterLink>
```

**什么时候才需要动态添加路由？**路由表本身要由服务器决定，例如权限管理后台为每个用户返回不同的页面列表。这时在拿到数据之后用 `addRoute` 添加：

```js
const remove = router.addRoute({ path: '/reports', name: 'reports', component: () => import('./Reports.vue') })
router.addRoute('admin-layout', childRoute)   // 第一个参数是父路由的 name：加到它的 children 里
router.hasRoute('reports')                    // true
remove()                                      // 删除这条路由；也可以 router.removeRoute('reports')
```

**常见的坑：刷新后 404。**用户在动态添加的页面（/reports）刷新。第一次导航开始时，/reports 还不存在，Router 已经把它匹配到了 404 路由。守卫里后来才添加的路由，这次导航不会再看。修法：添加之后，让守卫返回原地址，Router 会重新匹配：

```js
let loaded = false
router.beforeEach(async (to) => {
  if (loaded) return
  loaded = true
  await loadRoutesFromServer()               // 里面调用 router.addRoute(...)
  return to.fullPath                         // 重新匹配这次导航
})
```

还有一个坑：用户退出时要把动态添加的路由删掉（保存 `addRoute` 返回的函数，退出时调用），否则下一个用户登录时，上一个用户的路由还在。

<Exercise id="addRouteRefresh" />

### 17.10 类型：RouteMeta 和类型化路由

[第 14 章](/chapters/14-ts)讲了模块扩充的机制。路由的写法是这样的。

**给 meta 声明类型。**不声明时，`to.meta.requiresAuth` 的类型是 `unknown`。声明后，字段有类型，拼错会报错：

```ts
// src/router/index.ts（或单独的 router.d.ts）
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    roles?: Array<'admin' | 'member'>
    layout?: 'default' | 'blank'
  }
}
```

**类型化路由。**默认情况下，`router.push({ name: 'taks' })` 里的名字拼错，TypeScript 不会报错，名字是普通字符串。Vue Router 5 自带的 Vite 插件 `vue-router/vite` 按 `src/pages` 目录的文件生成路由，同时生成 `typed-router.d.ts`，里面有所有路由名和参数的类型：

```ts
// vite.config.ts：VueRouter() 必须放在 vue() 之前
import VueRouter from 'vue-router/vite'
export default defineConfig({ plugins: [VueRouter(), vue()] })

// router.ts
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
export const router = createRouter({ history: createWebHistory(), routes })

// tsconfig.app.json 的 include 里加上 "typed-router.d.ts"
// pages/task/[id].vue 对应路由名 '/task/[id]'
router.push({ name: '/task/[id]', params: { id: 1 } })   // 正确
router.push({ name: '/taks/[id]', params: { id: 1 } })   // 类型检查报错：名字拼错
// 组件里：useRoute('/task/[id]').params.id 的类型是 string
```

这需要你按文件系统组织路由。不想用文件路由，也可以手写 `RouteNamedMap`，见 Vue Router 官方文档的类型化路由一节。

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


### 17.11 滚动行为和页面过渡

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

### 17.12 本地任务：给项目加上路由、懒加载和守卫

接着 16.10 节的项目（已有 Pinia 和 `auth` store），在同一个项目里做。

1. 安装：`npm install vue-router`。
2. 在 `src/views/` 建六个组件：HomeView、LoginView、TaskView、AdminView、ForbiddenView、NotFoundView。
3. 写 `src/router/index.ts`：`createRouter` 加 `createWebHistory(import.meta.env.BASE_URL)`。六条路由：`/`、`/login`、`/task/:id`（`props: true`）、`/admin`（`meta: { requiresAuth: true, roles: ['admin'] }`）、`/403`、通配 404。除首页外都写成 `() => import('@/views/…')`。用 `declare module 'vue-router'` 声明 `RouteMeta`。
4. 全局守卫照 17.8 节写：`await auth.restore()`，需要登录时重定向到 `login` 并带上 `redirect`，角色不符去 `forbidden`。`afterEach` 里设置页面标题。再写 `scrollBehavior`。
5. `main.ts`：`createApp(App).use(pinia).use(router)`（pinia 先装，守卫里才能用 store）。
6. `LoginView` 登录后用 `safeRedirect` 回跳。`App.vue` 放导航、`<RouterView />`，管理员才显示“后台”链接，已登录显示“退出”按钮。`TaskView` 用 `watch(() => props.id, …, { immediate: true })` 加载数据，并放一个“下一个”链接指向 id 加 1。

验收标准：

- `npm run type-check` 没有错误。`npm run build` 输出里，`dist/assets/` 下除了 `index-….js`，还有 `AdminView-….js`、`LoginView-….js`、`TaskView-….js` 等单独的文件（懒加载拆出的包）。
- 未登录时，在地址栏直接打开 `/admin`：地址变成 `/login?redirect=/admin`。用错误的密码登录，页面显示错误。用 `admin` 和 `123456` 登录，回到 `/admin`。
- 刷新 `/admin`，仍在 `/admin`，没有被踢回登录页。
- 用 `ann` 和 `123456` 登录后访问 `/admin`：地址变成 `/403`，导航栏没有“后台”链接。
- 点“退出”，回到 `/login`。打开 `/nope`，页面显示“页面不存在”，浏览器标签页的标题随路由变化。
- 打开 `/task/1`，点“下一个”：地址变成 `/task/2`，内容更新为任务 2 的内容。
- 打开 `/login?redirect=//evil.com`，登录后回到 `/`。
- 在首页滚动到页面底部，点“登录”链接，页面回到顶部；按浏览器的后退按钮，回到刚才滚动的位置。

页面练习检验守卫、回跳、角色和 `addRoute` 的逻辑（17.1 到 17.9 节）。懒加载拆包、真实地址栏和滚动行为、页面标题，只能在本地自查。

::: pitfalls
1. 从 `/user/1` 到 `/user/2` 时，用 `watch(() => route.params.id, ...)` 加载数据。原因：Router 复用同一个组件，`onMounted` 不再运行。
2. 使用 history 模式时，配置服务器把所有路径返回 index.html。否则刷新页面时显示 404。
3. 在守卫中，检查目标是否需要登录，不要对所有路由重定向。否则 /login 自己也被重定向，无限重定向。
4. 有 path 时不要传 params。用命名路由传 params。原因：有 path 时，Router 忽略 params。
5. 守卫里要等登录状态恢复完成（`await auth.restore()`）再判断。原因：刷新后内存里的用户已经没了。
6. 动态添加路由之后，守卫要返回原地址让这次导航重新匹配。原因：这次导航在守卫运行前已经匹配过了。
7. 隐藏菜单不是权限控制。原因：用户可以直接输入地址，真正的权限在服务器。
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

<Sc :a="0">

路由表里有通配路由 `{ path: '/:pathMatch(.*)*', component: NotFound }`，“报表”路由 `/reports` 在全局守卫里、请求完权限之后才用 `router.addRoute` 添加，守卫没有返回值。用户在 `/reports` 刷新页面。显示什么？

<Opt>NotFound：第一次导航开始时 /reports 还不存在，已经匹配到了通配路由</Opt>
<Opt>报表：addRoute 之后 Router 自动重新匹配</Opt>
<Opt>报错：找不到 /reports 对应的路由</Opt>

<template #explain>

解析：Router 在运行守卫之前就已经匹配好了路由，通配路由让它匹配成功，所以不报错。addRoute 只影响以后的导航，不会让正在进行的这次导航重新匹配。修法：守卫里添加路由之后 `return to.fullPath`。

</template>
</Sc>

<Sc :a="1">

下面的代码连续执行两次。第二次 `push` 的结果是什么？

```js
await router.push('/task/1')
const result = await router.push('/task/1')
```

<Opt>抛出异常，因为重复导航</Opt>
<Opt>resolve 一个 NavigationFailure，类型是 duplicated，页面不变</Opt>
<Opt>再导航一次，TaskDetail 重新创建</Opt>

<template #explain>

解析：目标和当前地址相同时，Router 不重新导航。`push` 不抛错，而是 resolve 一个 `NavigationFailure`（类型 duplicated）。用 `isNavigationFailure(result, NavigationFailureType.duplicated)` 判断。要强制刷新，用 `<RouterView :key>` 或自己重新加载数据。

</template>
</Sc>

<Sc :a="2">

父路由 `meta: { requiresAuth: true, roles: ['admin'] }`，子路由 `meta: { roles: ['editor'] }`。访问子路由时，`to.meta` 是什么？

<Opt>{ roles: ['editor'] }，子路由的 meta 替换父路由的</Opt>
<Opt>{ requiresAuth: true, roles: ['admin', 'editor'] }，数组合并</Opt>
<Opt>{ requiresAuth: true, roles: ['editor'] }，按字段合并，同名字段子路由覆盖</Opt>

<template #explain>

解析：`to.meta` 把所有匹配的路由记录的 meta 按字段合并。父路由有而子路由没写的字段（`requiresAuth`）保留；同名字段（`roles`）取子路由的值，数组不会合并。所以守卫读 `to.meta.requiresAuth` 就能保护整个父路由下的所有页面。

</template>
</Sc>

<Sc :a="0">

登录页读取 `route.query.redirect`，登录成功后跳转。下面哪个值应该被拒绝，改去首页？

<Opt>//evil.com</Opt>
<Opt>/task/3?tab=info</Opt>
<Opt>/admin</Opt>

<template #explain>

解析：redirect 来自地址栏，不可信。只接受以单个 `/` 开头的站内路径。`//evil.com` 以两个斜杠开头，浏览器把它当成“同协议的另一个主机”；router 虽然不会真的把用户带走，但它会变成一个错误的地址，改用 `location.href` 跳转时更是真正的开放重定向。另外两个都是正常的站内路径，带查询串也没问题。

</template>
</Sc>

:::

::: summary
- routes 把路径映射到组件。routes 支持动态参数、嵌套、懒加载、redirect、alias 和 404。
- 嵌套路由用 children，父组件中放 RouterView。命名视图用 components 和 `<RouterView name>`。
- RouterLink 渲染链接，并添加激活类名。
- useRoute 读取路由。useRouter 跳转。页面状态可以写进 query。push 在导航失败时 resolve 一个 NavigationFailure，不抛错。
- 参数用 props 传入组件。参数改变时组件被复用，用 watch 参数的 getter 重新加载。
- 守卫的顺序：离开 → beforeEach → 更新 → beforeEnter → 异步组件 → beforeRouteEnter → beforeResolve → 确认 → afterEach。返回 false 取消，返回地址重定向。
- 数据默认在组件里（导航后）取。数据决定能否进入页面时才在守卫里取。
- 登录流程：守卫先 `await auth.restore()`，再检查 `requiresAuth` 和 `roles`；重定向到登录页并带上 `redirect`；登录后只接受站内路径回跳；退出后要主动跳走。前端守卫只管体验，权限在服务器。
- 路由表默认静态，用 `meta.roles`。服务器决定路由表时才用 addRoute，添加之后让守卫返回原地址重新匹配。
- 给 RouteMeta 声明类型；类型化路由由 `vue-router/vite` 生成。scrollBehavior 控制滚动，RouterView 的插槽组合过渡和缓存。
:::
