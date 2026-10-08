import type { Exercise } from './types'
import { sub } from './types'

// ===== 路由表：动态参数、props、嵌套路由、404（真实的 Vue Router）=====
const routeTableSolJs = `const Home = { template: '<p class="view">首页</p>' }
const TaskDetail = { props: ['id'], template: '<p class="view">任务 {{ id }} 的详情</p>' }
const UserLayout = { template: '<div><h3>用户</h3><RouterView /></div>' }
const UserHome = { template: '<p class="view">用户首页</p>' }
const UserPosts = { template: '<p class="view">用户的文章</p>' }
const NotFound = { template: '<p class="view">404：页面不存在</p>' }

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/task/:id', component: TaskDetail, props: true },    // :id 是动态参数，props: true 把它传给组件
    {
      path: '/user',
      component: UserLayout,                                      // UserLayout 里有 <RouterView />
      children: [
        { path: '', component: UserHome },                        // /user
        { path: 'posts', component: UserPosts }                   // /user/posts：子路由的 path 不以 / 开头
      ]
    },
    { path: '/:pathMatch(.*)*', component: NotFound }             // 404：匹配所有其他地址
  ]
})

return { router }`

export const routeTable: Exercise = {
  title: '配置路由表：动态参数、props、嵌套路由和 404', ch: 17,
  libs: ['vue-router'],
  task: '<p>这道题运行在真实的 Vue Router 上。路由必须用 <code>createMemoryHistory()</code>（用 <code>createWebHistory</code> 会改动页面真实的地址栏），并在脚本最后 <code>return { router }</code>，运行器替你安装。组件已经写好，补全路由表。</p><ol><li>TODO 1：<code>/task/:id</code> 显示 TaskDetail，并把参数 id 作为 props 传入。</li><li>TODO 2：<code>/user</code> 显示 UserLayout，里面嵌套两个子路由：<code>/user</code> 显示 UserHome，<code>/user/posts</code> 显示 UserPosts。</li><li>TODO 3：其他所有地址显示 NotFound。</li><li>点击链接，确认首页、任务详情、嵌套页面和 404 都正确；用户页的外框“用户”标题在两个子页面里都保留。</li></ol>',
  tpl: `<nav>
  <RouterLink to="/">首页</RouterLink> |
  <RouterLink to="/task/2">任务 2</RouterLink> |
  <RouterLink to="/user">用户</RouterLink> |
  <RouterLink to="/user/posts">用户的文章</RouterLink> |
  <RouterLink to="/abc">错误的地址</RouterLink>
</nav>
<RouterView />`,
  js: `const Home = { template: '<p class="view">首页</p>' }
const TaskDetail = { props: ['id'], template: '<p class="view">任务 {{ id }} 的详情</p>' }
const UserLayout = { template: '<div><h3>用户</h3><RouterView /></div>' }
const UserHome = { template: '<p class="view">用户首页</p>' }
const UserPosts = { template: '<p class="view">用户的文章</p>' }
const NotFound = { template: '<p class="view">404：页面不存在</p>' }

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: Home }
    // TODO 1：/task/:id 显示 TaskDetail，参数作为 props 传入
    // TODO 2：/user 显示 UserLayout，children 里放 UserHome（path 是空字符串）和 UserPosts（path 是 'posts'）
    // TODO 3：其他所有地址显示 NotFound
  ]
})

return { router }`,
  solJs: routeTableSolJs,
  hints: [
    '路由表是一个数组。动态参数写成 /task/:id，props: true 把参数作为 props 传给组件。嵌套路由用 children，父组件里要有 <RouterView />。404 路由用 /:pathMatch(.*)* 匹配所有地址。17.1 和 17.2 讲了它们。',
    '子路由的 path 不以 / 开头：空字符串 \'\' 匹配 /user 本身，\'posts\' 匹配 /user/posts。404 路由可以写在数组的任何位置，Vue Router 按分数匹配，不按书写顺序。',
    routeTableSolJs
  ],
  async check(T) {
    const r = T.router;
    if (!r) { T.ok(false, '脚本里要 createRouter(…) 并 return { router }，运行器才会安装路由'); return; }
    const view = () => ((T.$('.view') || {}).textContent || '').trim();
    const link = t => T.$$('a').find(a => (a.textContent || '').includes(t));
    const go = async (t, expect, msg) => {
      const a = link(t);
      if (!a) { T.ok(false, '模板里有“' + t + '”链接'); return; }
      await T.click(a);
      await T.waitFor(() => view() === expect);
      T.ok(view() === expect, msg + '（当前：' + (view() || '空') + '）');
    };
    T.ok(view() === '首页', '地址 / 显示首页（当前：' + (view() || '空') + '）');
    await go('任务 2', '任务 2 的详情', 'TODO 1：/task/2 显示“任务 2 的详情”：路由要写 props: true');
    await T.push('/task/3');
    T.ok(view() === '任务 3 的详情', 'TODO 1：/task/3 显示“任务 3 的详情”（当前：' + (view() || '空') + '）');
    await go('用户', '用户首页', 'TODO 2：/user 显示 UserHome：子路由里 path 为空字符串的那一条');
    T.ok(/用户\s*用户首页/.test(T.text()), 'TODO 2：UserLayout 的外框“用户”标题和 UserHome 同时显示');
    await go('用户的文章', '用户的文章', 'TODO 2：/user/posts 显示 UserPosts：子路由的 path 写 \'posts\'，不要以 / 开头');
    T.ok(/用户\s*用户的文章/.test(T.text()), 'TODO 2：切换到 /user/posts 后，外框“用户”标题仍在');
    await go('错误的地址', '404：页面不存在', 'TODO 3：/abc 显示 404');
    await T.push('/user/zzz');
    T.ok(view() === '404：页面不存在', 'TODO 3：/user/zzz 没有对应的子路由，也显示 404（当前：' + (view() || '空') + '）');
    await go('首页', '首页', '回到 /，仍显示首页。404 路由没有覆盖首页');
  },
  wrong: [
    { js: sub(routeTableSolJs, "{ path: '/task/:id', component: TaskDetail, props: true },    // :id 是动态参数，props: true 把它传给组件", "{ path: '/task/:id', component: TaskDetail },"),
      why: '没有 props: true 时，参数只在 route.params 里，TaskDetail 的 prop id 是 undefined。页面显示“任务  的详情”。', expectFail: /props: true/ },
    { js: sub(routeTableSolJs, "{ path: '/:pathMatch(.*)*', component: NotFound }             // 404：匹配所有其他地址", "{ path: '*', component: NotFound }"),
      why: 'path: \'*\' 是 Vue Router 3 的写法。Vue Router 4 和 5 不接受它（会在创建 router 时报错），要写 /:pathMatch(.*)*。' },
    { js: sub(routeTableSolJs, "{ path: 'posts', component: UserPosts }                   // /user/posts：子路由的 path 不以 / 开头", "{ path: '/posts', component: UserPosts }"),
      why: '子路由的 path 以 / 开头时，它是根路径 /posts，不是 /user/posts。访问 /user/posts 找不到对应的路由，显示 404。', expectFail: /\/user\/posts/ },
    { js: sub(routeTableSolJs, "        { path: '', component: UserHome },                        // /user\n", ""),
      why: '没有 path 为空字符串的子路由，访问 /user 时只显示外框，里面的 RouterView 是空的。', expectFail: /UserHome/ }
  ],
  faded: {
    js: sub(sub(sub(routeTableSolJs,
      "{ path: '/task/:id', component: TaskDetail, props: true },    // :id 是动态参数，props: true 把它传给组件", "{ path: /* ✏️ 带动态参数 id 的路径 */ '', component: TaskDetail /* ✏️ 让参数作为 props 传给组件 */ },"),
      "        { path: '', component: UserHome },                        // /user\n        { path: 'posts', component: UserPosts }                   // /user/posts：子路由的 path 不以 / 开头", "        /* ✏️ 两个子路由：/user 显示 UserHome，/user/posts 显示 UserPosts */"),
      "{ path: '/:pathMatch(.*)*', component: NotFound }             // 404：匹配所有其他地址", "{ path: /* ✏️ 能匹配所有其他地址的路径 */ '', component: NotFound }")
  }
}

// ===== 参数变化时组件被复用（真实的 Vue Router）=====
const paramSolJs = `// 假接口：20 毫秒后返回任务内容
const fetchTask = id => new Promise(resolve => setTimeout(() => resolve('任务 ' + id + ' 的内容'), 20))

const Home = { template: '<p class="content">首页</p>' }

const TaskDetail = {
  setup() {
    const route = useRoute()
    const content = ref('加载中…')
    const loads = ref(0)
    // 参数变化时，Router 复用同一个组件，setup 和 onMounted 不再运行。侦听参数（getter 写法）
    watch(() => route.params.id, async (id) => {
      loads.value++
      content.value = await fetchTask(id)
    }, { immediate: true })
    return { content, loads }
  },
  template: '<div><p class="content">{{ content }}</p><p class="loads">请求次数：{{ loads }}</p></div>'
}

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/task/:id', component: TaskDetail }
  ]
})

return { router }`

export const paramReuse: Exercise = {
  title: '修复：从任务 1 切到任务 2，详情没有更新', ch: 17,
  libs: ['vue-router'],
  task: '<p>任务详情页在 <code>onMounted</code> 里请求数据。从“任务 1”点到“任务 2”，页面还显示任务 1 的内容，“请求次数”也停在 1。原因：两个地址匹配同一条路由，Router 复用同一个 TaskDetail，<code>setup</code> 和 <code>onMounted</code> 不再运行。</p><ol><li>先点“任务 1”，再点“任务 2”，观察现象。</li><li>修改 TaskDetail，让它在 id 每次变化时都重新请求。进入页面的第一次也要请求。</li><li>确认依次访问任务 1、2、3，内容分别正确。</li></ol>',
  tpl: `<nav>
  <RouterLink to="/">首页</RouterLink> |
  <RouterLink to="/task/1">任务 1</RouterLink> |
  <RouterLink to="/task/2">任务 2</RouterLink> |
  <RouterLink to="/task/3">任务 3</RouterLink>
</nav>
<RouterView />`,
  js: `// 假接口：20 毫秒后返回任务内容
const fetchTask = id => new Promise(resolve => setTimeout(() => resolve('任务 ' + id + ' 的内容'), 20))

const Home = { template: '<p class="content">首页</p>' }

const TaskDetail = {
  setup() {
    const route = useRoute()
    const content = ref('加载中…')
    const loads = ref(0)
    // 问题：onMounted 只在组件创建时运行一次
    onMounted(async () => {
      loads.value++
      content.value = await fetchTask(route.params.id)
    })
    return { content, loads }
  },
  template: '<div><p class="content">{{ content }}</p><p class="loads">请求次数：{{ loads }}</p></div>'
}

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/task/:id', component: TaskDetail }
  ]
})

return { router }`,
  solJs: paramSolJs,
  hints: [
    '组件被复用时，setup 和 onMounted 不会再运行，但 useRoute() 返回的 route 是响应式的，route.params.id 会变。所以要侦听它。17.5 的场景讲了两种办法：watch 和 onBeforeRouteUpdate。',
    'watch 的数据源要写 getter：watch(() => route.params.id, 回调, { immediate: true })。直接写 route.params.id 只传入一个字符串，watch 不会触发。immediate: true 让第一次进入页面时也运行回调。',
    paramSolJs
  ],
  async check(T) {
    const r = T.router;
    if (!r) { T.ok(false, '脚本里要 createRouter(…) 并 return { router }'); return; }
    const content = () => ((T.$('.content') || {}).textContent || '').trim();
    await T.push('/task/1');
    await T.waitFor(() => content() === '任务 1 的内容');
    T.ok(content() === '任务 1 的内容', '进入 /task/1 时请求数据，显示“任务 1 的内容”（当前：' + content() + '）');
    const link2 = T.$$('a').find(a => (a.textContent || '').includes('任务 2'));
    await T.click(link2);
    await T.waitFor(() => content() === '任务 2 的内容');
    T.ok(r.currentRoute.value.path === '/task/2', '点“任务 2”后，路由是 /task/2');
    T.ok(content() === '任务 2 的内容', '从任务 1 切到任务 2，内容更新为“任务 2 的内容”（当前：' + content() + '）：组件被复用，要在 id 变化时重新请求');
    await T.push('/task/3');
    await T.waitFor(() => content() === '任务 3 的内容');
    T.ok(content() === '任务 3 的内容', '再切到任务 3，内容更新为“任务 3 的内容”（当前：' + content() + '）');
    await T.push('/');
    T.ok(content() === '首页', '回到首页后不再显示任务内容');
  },
  wrong: [
    { js: sub(paramSolJs, "    watch(() => route.params.id, async (id) => {\n      loads.value++\n      content.value = await fetchTask(id)\n    }, { immediate: true })", "    watch(route.params.id, async (id) => {\n      loads.value++\n      content.value = await fetchTask(id)\n    }, { immediate: true })"),
      why: 'watch 的数据源写成了 route.params.id，它只是一个字符串，不是响应式数据源。watch 立即用它运行一次，之后永远不会再触发。要写 getter：() => route.params.id。', expectFail: /任务 2/ },
    { js: sub(paramSolJs, "    }, { immediate: true })", "    })"),
      why: '用了 getter，但没有 immediate: true。第一次进入页面时，id 没有变化，回调不运行，页面停在“加载中…”。', expectFail: /任务 1/ },
    { js: sub(paramSolJs, "    watch(() => route.params.id, async (id) => {\n      loads.value++\n      content.value = await fetchTask(id)\n    }, { immediate: true })", "    const id = route.params.id          // 只取了一次\n    watch(() => id, async (id) => {\n      loads.value++\n      content.value = await fetchTask(id)\n    }, { immediate: true })"),
      why: '在 setup 里把 route.params.id 取出来存成普通变量，它不会再变。组件被复用时，id 变量还是第一次的值。要在 getter 里读 route.params.id。', expectFail: /任务 2/ },
    { js: sub(paramSolJs, "    // 参数变化时，Router 复用同一个组件，setup 和 onMounted 不再运行。侦听参数（getter 写法）\n    watch(() => route.params.id, async (id) => {\n      loads.value++\n      content.value = await fetchTask(id)\n    }, { immediate: true })", "    onBeforeRouteUpdate(async (to) => {\n      loads.value++\n      content.value = await fetchTask(to.params.id)\n    })"),
      why: 'onBeforeRouteUpdate 只在“复用组件、参数变化”时运行，第一次进入页面时不运行，所以第一次没有请求数据。要在第一次进入时也请求一次（例如再加一个 onMounted，或者改用 watch 的 immediate）。', expectFail: /任务 1/ }
  ],
  faded: {
    js: sub(paramSolJs, "    watch(() => route.params.id, async (id) => {\n      loads.value++\n      content.value = await fetchTask(id)\n    }, { immediate: true })", "    watch(/* ✏️ 侦听哪个值？要写成 getter */ () => '', async (id) => {\n      loads.value++\n      content.value = await fetchTask(id)\n    }, /* ✏️ 第一次进入页面时也要运行回调 */ {})")
  }
}

// ===== 刷新后停在动态添加的路由上：addRoute（真实的 Vue Router）=====
const addRouteSolJs = `const Home = { template: '<p class="page">首页</p>' }
const Reports = { template: '<p class="page">报表</p>' }
const NotFound = { template: '<p class="page">404：页面不存在</p>' }

const history = createMemoryHistory()
history.replace('/reports')            // 模拟用户刷新页面：浏览器直接打开 /reports

const router = createRouter({
  history,
  routes: [
    { path: '/', component: Home },
    { path: '/:pathMatch(.*)*', component: NotFound }
  ]
})

// 假接口：50 毫秒后返回这个用户能访问的页面
const fetchPermissions = () => new Promise(resolve => setTimeout(() => resolve(['reports']), 50))

let loaded = false
router.beforeEach(async (to) => {
  if (loaded) return
  loaded = true
  const pages = await fetchPermissions()
  if (pages.includes('reports')) {
    router.addRoute({ path: '/reports', name: 'reports', component: Reports })
  }
  return to.fullPath           // 导航开始时 /reports 还不存在，已经匹配到了 404。返回原地址，让 Router 重新匹配
})

return { router }`

export const addRouteRefresh: Exercise = {
  title: '修复：刷新后停在动态添加的路由，页面却是 404', ch: 17,
  libs: ['vue-router'],
  task: '<p>“报表”页面只对有权限的用户开放，所以路由在守卫里、拿到权限之后才用 <code>router.addRoute</code> 加入。现在用户在 /reports 刷新页面（脚本用 <code>history.replace(\'/reports\')</code> 模拟），页面却显示 404。原因：第一次导航开始时，/reports 还不存在，Router 已经把它匹配到了 404 路由；守卫里后加的路由，这次导航不会再看。</p><ol><li>在守卫里添加路由之后，让这次导航重新匹配。</li><li>确认刷新后直接显示“报表”，之后在首页、报表和未知地址之间切换都正确。</li></ol>',
  tpl: `<nav>
  <RouterLink to="/">首页</RouterLink> |
  <RouterLink to="/reports">报表</RouterLink>
</nav>
<RouterView />`,
  js: `const Home = { template: '<p class="page">首页</p>' }
const Reports = { template: '<p class="page">报表</p>' }
const NotFound = { template: '<p class="page">404：页面不存在</p>' }

const history = createMemoryHistory()
history.replace('/reports')            // 模拟用户刷新页面：浏览器直接打开 /reports

const router = createRouter({
  history,
  routes: [
    { path: '/', component: Home },
    { path: '/:pathMatch(.*)*', component: NotFound }
  ]
})

// 假接口：50 毫秒后返回这个用户能访问的页面
const fetchPermissions = () => new Promise(resolve => setTimeout(() => resolve(['reports']), 50))

let loaded = false
router.beforeEach(async (to) => {
  if (loaded) return
  loaded = true
  const pages = await fetchPermissions()
  if (pages.includes('reports')) {
    router.addRoute({ path: '/reports', name: 'reports', component: Reports })
  }
  // TODO：这次导航已经匹配到了 404。怎样让它重新匹配？
})

return { router }`,
  solJs: addRouteSolJs,
  hints: [
    'addRoute 只影响以后的导航。正在进行的这次导航，在守卫运行之前已经匹配过路由了。要让它重新匹配，守卫可以返回一个地址，Router 会用这个地址重新导航。',
    '守卫返回 to.fullPath（原来要去的完整地址）。因为 loaded 已经设为 true，第二次进入守卫时直接放行，不会循环。',
    addRouteSolJs
  ],
  async check(T) {
    const r = T.router;
    if (!r) { T.ok(false, '脚本里要 createRouter(…) 并 return { router }'); return; }
    const page = () => ((T.$('.page') || {}).textContent || '').trim();
    const path = () => r.currentRoute.value.path;
    T.ok(r.hasRoute('reports'), '守卫里用 addRoute 添加了 reports 路由');
    T.ok(path() === '/reports' && page() === '报表', '刷新后停在 /reports，页面显示“报表”（当前 ' + path() + '，页面：' + (page() || '空') + '）：addRoute 之后要让这次导航重新匹配');
    await T.push('/');
    T.ok(path() === '/' && page() === '首页', '切换到首页');
    await T.push('/reports');
    T.ok(path() === '/reports' && page() === '报表', '再次访问 /reports 显示“报表”（当前 ' + page() + '）');
    await T.push('/nope');
    T.ok(page() === '404：页面不存在', '未知地址仍然显示 404（当前 ' + page() + '）');
    T.ok(r.getRoutes().filter(x => x.name === 'reports').length === 1, '报表路由只添加了一次');
  },
  wrong: [
    { js: sub(addRouteSolJs, "  return to.fullPath           // 导航开始时 /reports 还不存在，已经匹配到了 404。返回原地址，让 Router 重新匹配\n", ""),
      why: '添加了路由，但这次导航仍然使用守卫运行之前的匹配结果，也就是 404 路由。addRoute 只影响以后的导航。', expectFail: /刷新后/ },
    { js: sub(addRouteSolJs, "  return to.fullPath           // 导航开始时 /reports 还不存在，已经匹配到了 404。返回原地址，让 Router 重新匹配\n", "  return true\n"),
      why: '返回 true 表示“放行”，Router 继续用已经匹配好的 404 路由，不会重新匹配。要重新匹配，必须返回一个地址。', expectFail: /刷新后/ },
    { js: sub(addRouteSolJs, "  loaded = true\n", ""),
      why: '没有记录“已经加载过”。每次进入守卫都会重新请求权限、重新添加路由、再重定向一次，形成无限重定向。用一个标记（或检查 router.hasRoute）保证只添加一次。' }
  ],
  faded: {
    js: sub(addRouteSolJs, "  return to.fullPath           // 导航开始时 /reports 还不存在，已经匹配到了 404。返回原地址，让 Router 重新匹配\n", "  /* ✏️ 路由是在导航进行中才加的。返回什么，才能让这次导航重新匹配？ */\n")
  }
}

// ===== 真实的 Vue Router：声明 libs: ['vue-router']，脚本里直接用 createRouter / useRoute（见 AUTHORING.md 4.10）=====
const realRouterSolJs = `const auth = reactive({ loggedIn: false })

const Home = { template: '<p class="page">首页</p>' }

// 登录页：登录后回到 redirect 记下的地方（已给出，不用修改）
const Login = {
  setup() {
    const router = useRouter()
    const route = useRoute()
    function login() {
      auth.loggedIn = true
      router.push(route.query.redirect || '/')
    }
    return { login }
  },
  template: '<div><p class="page">请先登录</p><button @click="login">登录</button></div>'
}

const User = {
  setup() {
    const route = useRoute()   // 响应式的当前路由：参数变了，页面跟着变
    return { route }
  },
  template: '<p class="page">用户 {{ route.params.id }} 的资料</p>'
}

const router = createRouter({
  history: createMemoryHistory(),   // 练习里只能用 memory history，不能改页面真实的地址栏
  routes: [
    { path: '/', component: Home },
    { path: '/login', component: Login },
    { path: '/user/:id', component: User, meta: { requiresAuth: true } }   // 需要登录
  ]
})

router.beforeEach(to => {
  if (to.meta.requiresAuth && !auth.loggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }   // 重定向，并记下原来要去的地方
  }
})

return { router, auth }`

export const realRouterGuard: Exercise = {
  title: '用真实的 Vue Router：动态路由、登录守卫和响应式参数', ch: 17,
  libs: ['vue-router'],
  task: '<p>这道题运行在真实的 Vue Router 上：<code>createRouter</code>、<code>createMemoryHistory</code>、<code>useRoute</code>、<code>RouterLink</code>、<code>RouterView</code> 都可以直接用。练习里的路由必须用 <code>createMemoryHistory()</code>（用 <code>createWebHistory</code> 会改动页面真实的地址栏），并在脚本最后 <code>return { router }</code>，运行器替你安装。</p><p>要做的是一个“用户资料”页：未登录访问它会被送到登录页，登录后回到原来要去的页面。</p><ol><li>TODO 1：在路由表里加 <code>/user/:id</code>，显示 User，用 <code>meta</code> 标记它需要登录。</li><li>TODO 2：写 <code>router.beforeEach</code>：目标路由需要登录、而用户还没登录时，重定向到 <code>/login</code>，并在 query 的 <code>redirect</code> 里记下原来的 <code>fullPath</code>。首页和登录页不能被拦。</li><li>TODO 3：补全 User 组件，用 <code>useRoute()</code> 显示 <code>params.id</code>。从用户 1 切换到用户 2 时，页面内容要更新。</li></ol>',
  tpl: `<nav>
  <RouterLink to="/">首页</RouterLink> |
  <RouterLink to="/user/1">用户 1</RouterLink> |
  <RouterLink to="/user/2">用户 2</RouterLink>
</nav>
<p class="who">{{ auth.loggedIn ? '已登录' : '未登录' }}</p>
<RouterView />`,
  js: `const auth = reactive({ loggedIn: false })

const Home = { template: '<p class="page">首页</p>' }

// 登录页：登录后回到 redirect 记下的地方（已给出，不用修改）
const Login = {
  setup() {
    const router = useRouter()
    const route = useRoute()
    function login() {
      auth.loggedIn = true
      router.push(route.query.redirect || '/')
    }
    return { login }
  },
  template: '<div><p class="page">请先登录</p><button @click="login">登录</button></div>'
}

// TODO 3：用 useRoute() 显示 params.id，格式是“用户 1 的资料”
const User = {
  template: '<p class="page">用户（TODO）</p>'
}

const router = createRouter({
  history: createMemoryHistory(),   // 练习里只能用 memory history，不能改页面真实的地址栏
  routes: [
    { path: '/', component: Home },
    { path: '/login', component: Login }
    // TODO 1：加上 /user/:id，显示 User，并标记需要登录
  ]
})

// TODO 2：router.beforeEach 登录守卫

return { router, auth }`,
  solJs: realRouterSolJs,
  hints: [
    '路由表里，动态参数写成 /user/:id；自定义字段放在 meta 里，守卫通过 to.meta 读到它。守卫收到目标路由 to，返回一个地址就是重定向。17.1 讲了路由表，17.6 讲了守卫。',
    '守卫：router.beforeEach(to => { if (to.meta.requiresAuth && !auth.loggedIn) return { path: \'/login\', query: { redirect: to.fullPath } } })。User 组件：const route = useRoute()，模板里读 route.params.id。',
    realRouterSolJs
  ],
  async check(T) {
    const r = T.router;
    if (!r) { T.ok(false, '脚本里要 createRouter(…) 并 return { router }，运行器才会安装路由'); return; }
    const path = () => r.currentRoute.value.path;
    const page = () => ((T.$('.page') || {}).textContent || '');
    const link = t => T.$$('a').find(a => (a.textContent || '').includes(t));
    T.ok(path() === '/' && page() === '首页', '未登录也能访问首页（守卫只拦需要登录的路由；当前 ' + path() + '）');
    const l1 = link('用户 1');
    if (!l1) { T.ok(false, '模板里有“用户 1”的 RouterLink'); return; }
    await T.click(l1);
    await T.waitFor(() => path() !== '/');
    await T.settle();
    T.ok(path() === '/login' && page().includes('请先登录'), '未登录时点“用户 1”，被重定向到 /login（当前 ' + path() + '）');
    T.ok(r.currentRoute.value.query.redirect === '/user/1', '重定向时用 query.redirect 记下原来要去的 /user/1（当前 redirect：' + r.currentRoute.value.query.redirect + '）');
    T.ok(!page().includes('的资料'), '未登录时看不到用户资料');
    const lb = T.btn('登录');
    if (!lb) { T.ok(false, '登录页上有“登录”按钮'); return; }
    await T.click(lb);
    await T.waitFor(() => path() === '/user/1');
    await T.settle();
    T.ok(path() === '/user/1' && page() === '用户 1 的资料', '登录后回到 /user/1，显示“用户 1 的资料”（当前 ' + path() + '）');
    await T.push('/user/2');
    T.ok(path() === '/user/2' && page() === '用户 2 的资料', '参数从 1 变成 2，页面更新为“用户 2 的资料”（useRoute() 是响应式的：不要把 params.id 取一次就存起来）');
    await T.push('/user/3');
    T.ok(page() === '用户 3 的资料', '参数变成 3，页面更新为“用户 3 的资料”');
    await T.push('/');
    T.ok(path() === '/' && page() === '首页', '登录后回到首页');
  },
  wrong: [
    { js: sub(sub(realRouterSolJs, 'return { route }', 'return { id: route.params.id }   // 只取了一次'), '{{ route.params.id }} 的资料', '{{ id }} 的资料'),
      why: '在 setup 里把 route.params.id 取出来存成普通值，只取了一次。从用户 1 切到用户 2，路由复用同一个 User 组件，setup 不会重新运行，页面还是“用户 1”。要在模板里读 route.params.id，或者用 computed / watch 追踪它。', expectFail: /响应式/ },
    { js: sub(realRouterSolJs, "return { path: '/login', query: { redirect: to.fullPath } }   // 重定向，并记下原来要去的地方", "return '/login'   // 没有记下原目标"),
      why: '重定向到了登录页，但没有用 query.redirect 记下原来要去的地方。登录后只能回首页，用户要重新找一遍。', expectFail: /redirect/ },
    { js: sub(realRouterSolJs, "return { path: '/login', query: { redirect: to.fullPath } }   // 重定向，并记下原来要去的地方", "return false   // 取消导航"),
      why: '守卫返回 false 是“取消导航”，不是重定向。未登录点链接，用户停在原地，没有到达登录页。', expectFail: /重定向/ },
    { js: sub(realRouterSolJs, 'to.meta.requiresAuth && !auth.loggedIn', '!auth.loggedIn'),
      why: '没有看 to.meta.requiresAuth，未登录时所有页面都被拦，包括首页和登录页本身：/login 又被重定向到 /login，陷入无限重定向。守卫只该拦标记了需要登录的路由。', expectFail: /首页/ }
  ],
  faded: {
    js: sub(sub(sub(realRouterSolJs,
      "    { path: '/user/:id', component: User, meta: { requiresAuth: true } }   // 需要登录", "    { path: /* ✏️ 带动态参数 id 的路径 */ '', component: User /* ✏️ 用 meta 标记需要登录 */ }"),
      "return { path: '/login', query: { redirect: to.fullPath } }   // 重定向，并记下原来要去的地方", "/* ✏️ 返回什么地址，才会重定向到 /login 并记下原目标？ */"),
      "    const route = useRoute()   // 响应式的当前路由：参数变了，页面跟着变\n    return { route }", "    /* ✏️ 拿到响应式的当前路由，并交给模板 */\n    return {}")
  }
}

// ===== 登录鉴权的完整流程：真实的 Pinia 加真实的 Vue Router =====
const authFlowSolJs = `const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
// 假接口：密码是 123456 才能登录。用户名 admin 是管理员，其他是普通成员
const api = {
  async login(name, password) {
    await sleep(10)
    if (password !== '123456') throw new Error('用户名或密码错误')
    return { token: 'token-' + name, user: { name, role: name === 'admin' ? 'admin' : 'member' } }
  },
  async me(token) {
    await sleep(10)
    const name = token.replace('token-', '')
    return { name, role: name === 'admin' ? 'admin' : 'member' }
  }
}

// ===== 已给出：第 16 章的 auth store（不用修改）=====
const useAuthStore = defineStore('auth', () => {
  const token = ref('token-ann')      // 模拟：用户上次登录过，token 被保存了下来。user 在内存里，刷新后是空的
  const user = ref(null)
  const loading = ref(false)
  const error = ref('')
  const loggedIn = computed(() => user.value !== null)
  const isAdmin = computed(() => user.value?.role === 'admin')
  async function login(name, password) {
    loading.value = true
    error.value = ''
    try {
      const res = await api.login(name, password)
      token.value = res.token
      user.value = res.user
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }
  function logout() { token.value = ''; user.value = null }
  let restoring
  function restore() {                // 用保存的 token 换回用户。整个页面生命周期只请求一次
    restoring ??= (async () => {
      if (!token.value || user.value) return
      try { user.value = await api.me(token.value) } catch { logout() }
    })()
    return restoring
  }
  return { token, user, loading, error, loggedIn, isAdmin, login, logout, restore }
})
const auth = useAuthStore()

// ===== 页面组件 =====
const Home = { template: '<p class="page">首页</p>' }
const Dashboard = { template: '<p class="page">工作台</p>' }
const Admin = { template: '<p class="page">管理后台</p>' }
const Forbidden = { template: '<p class="page">没有权限</p>' }
const NotFound = { template: '<p class="page">404：页面不存在</p>' }
const Login = {
  setup() {
    const route = useRoute()
    const router = useRouter()
    async function submit(name) {
      try {
        await auth.login(name, '123456')
        const back = route.query.redirect       // 登录成功，回到原来要去的地方
        router.replace(typeof back === 'string' && back.startsWith('/') && !back.startsWith('//') ? back : '/')
      } catch { /* 错误已经在 auth.error 里 */ }
    }
    return { submit, auth }
  },
  template: '<div><p class="page">请登录</p><button @click="submit(\\'ann\\')">登录为 ann</button> <button @click="submit(\\'admin\\')">登录为 admin</button> <span class="err">{{ auth.error }}</span></div>'
}

// ===== 路由 =====
const history = createMemoryHistory()
history.replace('/dashboard')         // 模拟用户刷新页面：浏览器直接打开 /dashboard

const router = createRouter({
  history,
  routes: [
    { path: '/', component: Home },
    { path: '/login', component: Login },
    { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/admin', component: Admin, meta: { requiresAuth: true, roles: ['admin'] } },
    { path: '/403', component: Forbidden },
    { path: '/:pathMatch(.*)*', component: NotFound }
  ]
})

router.beforeEach(async (to) => {
  await auth.restore()                 // 刷新后先恢复登录状态，再判断
  if (to.meta.requiresAuth && !auth.loggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.roles && !to.meta.roles.includes(auth.user.role)) {
    return '/403'
  }
})

async function logout() {
  auth.logout()
  await router.push('/login')          // 退出后离开受保护的页面
}

return { router, auth, logout }`

export const authFlow: Exercise = {
  title: '登录鉴权的完整流程：store、守卫、回跳、角色和退出', ch: 17,
  libs: ['pinia', 'vue-router'],
  task: '<p>这道题同时用真实的 Pinia 和 Vue Router，把整条登录线串起来。第 16 章的 <code>auth</code> store 已经给出（<code>restore()</code> 用保存的 token 换回用户）。脚本模拟“用户在 /dashboard 刷新了页面”：token 还在，用户信息在内存里已经没有了。</p><ol><li>TODO 1：给路由加 meta。/dashboard 需要登录（<code>requiresAuth</code>）；/admin 需要登录，并且只有 admin 角色能进（<code>roles: [\'admin\']</code>）。</li><li>TODO 2：写全局守卫。先等 <code>auth.restore()</code> 完成再判断；需要登录而没登录，重定向到 /login 并在 query 的 <code>redirect</code> 里记下原来的 <code>fullPath</code>；角色不符，重定向到 /403。</li><li>TODO 3：登录页登录成功后，回到 <code>redirect</code> 记下的地方；只接受站内路径（以单个 <code>/</code> 开头，不是 <code>//</code>），否则去首页。</li><li>TODO 4：退出登录后，跳到 /login。</li></ol>',
  tpl: `<nav>
  <RouterLink to="/">首页</RouterLink> |
  <RouterLink to="/dashboard">工作台</RouterLink>
  <template v-if="auth.isAdmin"> | <RouterLink to="/admin">后台</RouterLink></template>
  <template v-if="auth.loggedIn"> | {{ auth.user.name }} <button @click="logout">退出</button></template>
</nav>
<RouterView />`,
  js: authFlowSolJs.replace(`    { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/admin', component: Admin, meta: { requiresAuth: true, roles: ['admin'] } },`, `    // TODO 1：/dashboard 需要登录；/admin 需要登录，并且只有 admin 角色能进
    { path: '/dashboard', component: Dashboard },
    { path: '/admin', component: Admin },`)
    .replace(`router.beforeEach(async (to) => {
  await auth.restore()                 // 刷新后先恢复登录状态，再判断
  if (to.meta.requiresAuth && !auth.loggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.roles && !to.meta.roles.includes(auth.user.role)) {
    return '/403'
  }
})`, `// TODO 2：全局守卫。先等 auth.restore()；需要登录而没登录 → /login 并带上 redirect；角色不符 → /403
router.beforeEach(async (to) => {
})`)
    .replace(`        const back = route.query.redirect       // 登录成功，回到原来要去的地方
        router.replace(typeof back === 'string' && back.startsWith('/') && !back.startsWith('//') ? back : '/')`, `        // TODO 3：回到 route.query.redirect 记下的地方（只接受站内路径），否则去首页
        router.replace('/')`)
    .replace(`  auth.logout()
  await router.push('/login')          // 退出后离开受保护的页面`, `  auth.logout()
  // TODO 4：退出后跳到 /login`),
  solJs: authFlowSolJs,
  hints: [
    '17.8 讲了整条流程。守卫是 async 函数，Router 会等它。守卫里先 await auth.restore()，再读 auth.loggedIn。to.meta 合并了所有匹配的路由记录的 meta，所以读 to.meta.requiresAuth 和 to.meta.roles 就行。',
    '守卫：需要登录而没登录，return { path: \'/login\', query: { redirect: to.fullPath } }；to.meta.roles 存在而 roles 不包含 auth.user.role，return \'/403\'。登录页：redirect 是字符串、以 / 开头、不以 // 开头才能用。退出：auth.logout() 之后 await router.push(\'/login\')。',
    authFlowSolJs
  ],
  async check(T) {
    const r = T.router, auth = T.store('auth');
    if (!r) { T.ok(false, '脚本里要 createRouter(…) 并 return { router }'); return; }
    if (!auth) { T.ok(false, '用 defineStore("auth", …) 定义了 auth store 并调用了它'); return; }
    const path = () => r.currentRoute.value.path;
    const page = () => ((T.$('.page') || {}).textContent || '').trim();
    const btn = t => T.btn(t);
    // 1. 刷新场景
    T.ok(path() === '/dashboard' && page() === '工作台', 'TODO 2：刷新后停在 /dashboard，显示“工作台”（当前 ' + r.currentRoute.value.fullPath + '，页面：' + (page() || '空') + '）：守卫要先 await auth.restore()，再判断是否登录');
    T.ok(auth.user && auth.user.name === 'ann', 'TODO 2：restore 用 token 换回了用户 ann');
    // 2. 角色
    await T.push('/admin');
    T.ok(path() === '/403' && page() === '没有权限', 'TODO 1、2：普通成员 ann 访问 /admin，被送到 /403（当前 ' + path() + '）：给 /admin 加 roles，守卫检查角色');
    T.ok(!T.$$('a').some(a => (a.textContent || '').includes('后台')), '普通成员看不到“后台”链接');
    // 3. 退出
    const out = btn('退出');
    if (!out) { T.ok(false, '登录后导航栏有“退出”按钮'); return; }
    await T.click(out);
    await T.waitFor(() => path() === '/login');
    T.ok(path() === '/login' && !auth.loggedIn, 'TODO 4：退出后跳到 /login（当前 ' + path() + '）：只清空 store 不会离开受保护的页面');
    // 4. 未登录访问受保护页面
    await T.push('/dashboard');
    T.ok(path() === '/login' && r.currentRoute.value.query.redirect === '/dashboard', 'TODO 1、2：未登录访问 /dashboard，重定向到 /login，query.redirect 是 /dashboard（当前 ' + r.currentRoute.value.fullPath + '）');
    await T.push('/');
    T.ok(path() === '/' && page() === '首页', '未登录也能访问首页（守卫只拦标了 requiresAuth 的路由）');
    // 5. 登录后回跳
    await T.push('/admin');
    T.ok(path() === '/login' && r.currentRoute.value.query.redirect === '/admin', '未登录访问 /admin，也重定向到 /login，redirect 是 /admin');
    await T.click(btn('登录为 admin'));
    await T.waitFor(() => path() === '/admin');
    T.ok(path() === '/admin' && page() === '管理后台', 'TODO 3：以 admin 登录后，回到原来要去的 /admin（当前 ' + path() + '）');
    T.ok(T.$$('a').some(a => (a.textContent || '').includes('后台')), 'admin 能看到“后台”链接');
    // 6. 不安全的 redirect
    await T.click(btn('退出'));
    await T.waitFor(() => path() === '/login');
    await T.push({ path: '/login', query: { redirect: '//evil.com' } });
    await T.click(btn('登录为 ann'));
    await T.waitFor(() => path() !== '/login');
    T.ok(path() === '/', 'TODO 3：redirect 是 //evil.com 这样的非站内地址时，登录后回首页（当前 ' + path() + '）');
  },
  wrong: [
    { js: sub(authFlowSolJs, "  await auth.restore()                 // 刷新后先恢复登录状态，再判断\n", ""),
      why: '守卫没有等 restore() 完成。刷新后 user 还是空的，守卫以为没登录，把用户踢到登录页。守卫可以是 async 函数，先 await 恢复，再判断。', expectFail: /刷新后/ },
    { js: sub(authFlowSolJs, "  if (to.meta.roles && !to.meta.roles.includes(auth.user.role)) {\n    return '/403'\n  }\n", ""),
      why: '只检查了登录，没有检查角色。普通成员也能进入 /admin。', expectFail: /403/ },
    { js: sub(authFlowSolJs, "        router.replace(typeof back === 'string' && back.startsWith('/') && !back.startsWith('//') ? back : '/')", "        router.replace(back || '/')"),
      why: '没有检查 redirect 是不是站内路径。redirect 来自地址栏，谁都能改。//evil.com 这样的值会让 router 跳到一个错误的地址（控制台警告，页面显示 404）；如果登录页改用 location.href 整页跳转，就会真的跳到别的网站。只接受以单个 / 开头的字符串。', expectFail: /evil\.com/ },
    { js: sub(authFlowSolJs, "return { path: '/login', query: { redirect: to.fullPath } }", "return '/login'"),
      why: '重定向到了登录页，但没有在 query.redirect 里记下原来要去的地方，登录后只能回首页。', expectFail: /redirect/ },
    { js: sub(authFlowSolJs, "  auth.logout()\n  await router.push('/login')          // 退出后离开受保护的页面", "  auth.logout()"),
      why: '退出只清空了 store，用户还停在受保护的页面。守卫只在导航时运行，页面不会自己离开。', expectFail: /退出后/ }
  ],
  faded: {
    js: sub(sub(sub(sub(authFlowSolJs,
      "    { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },\n    { path: '/admin', component: Admin, meta: { requiresAuth: true, roles: ['admin'] } },", "    { path: '/dashboard', component: Dashboard /* ✏️ 需要登录 */ },\n    { path: '/admin', component: Admin /* ✏️ 需要登录，并且只有 admin 角色能进 */ },"),
      "  await auth.restore()                 // 刷新后先恢复登录状态，再判断\n  if (to.meta.requiresAuth && !auth.loggedIn) {\n    return { path: '/login', query: { redirect: to.fullPath } }\n  }\n  if (to.meta.roles && !to.meta.roles.includes(auth.user.role)) {\n    return '/403'\n  }\n", "  /* ✏️ 先等 restore() 完成；需要登录而没登录 → /login 并带上 redirect；角色不符 → /403 */\n"),
      "        const back = route.query.redirect       // 登录成功，回到原来要去的地方\n        router.replace(typeof back === 'string' && back.startsWith('/') && !back.startsWith('//') ? back : '/')", "        /* ✏️ 回到 route.query.redirect（只接受站内路径），否则去首页 */\n        router.replace('/')"),
      "  await router.push('/login')          // 退出后离开受保护的页面", "  /* ✏️ 退出后跳到 /login */")
  }
}

