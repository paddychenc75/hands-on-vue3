import type { Exercise } from './types'
import { sub } from './types'
import { nextTick } from 'vue'

export const routeTable: Exercise = {
  title: '补全：路由表的动态参数和 404 页面', ch: 23,
  task: '<p>说明：练习台不能运行真实的 Vue Router。脚本中有一个迷你路由。它按 Vue Router 的规则匹配地址：静态路径优先，然后是动态参数，最后是 <code>/:pathMatch(.*)*</code>。路由写 <code>props: true</code> 时，它把参数作为 props 传给组件。</p><ol><li>TODO 1：路径 /task/:id 显示 TaskDetail，并把参数 id 作为 props 传入。</li><li>TODO 2：其他所有地址显示 NotFound。</li><li>依次点击按钮。确认首页、任务详情和 404 页面都正确。</li></ol>',
  tpl: '<button @click="push(\'/\')">首页</button>\n<button @click="push(\'/task/2\')">任务 2</button>\n<button @click="push(\'/task/3\')">任务 3</button>\n<button @click="push(\'/abc\')">错误的地址</button>\n<p class="url">地址：{{ current }}</p>\n<component :is="view.component" v-bind="view.props" />',
  js: `const Home = { template: '<p class="view">首页</p>' }
const TaskDetail = { props: ['id'], template: '<p class="view">任务 {{ id }} 的详情</p>' }
const NotFound = { template: '<p class="view">404：页面不存在</p>' }

const routes = [
  { path: '/', component: Home },
  // TODO 1：路径 /task/:id 显示 TaskDetail。把参数作为 props 传入
  // TODO 2：其他所有地址显示 NotFound
]

// ===== 已给出：迷你路由（不用修改） =====
const current = ref('/')
function push(path) { current.value = path }
function compile(r) {
  if (r.path === '*') throw new Error('Vue Router 4 不支持 path: \\'*\\'')
  const keys = []
  const src = r.path
    .replace(/\\/:(\\w+)\\(\\.\\*\\)\\*/g, (_, k) => { keys.push(k); return '/(.*)' })
    .replace(/:(\\w+)/g, (_, k) => { keys.push(k); return '([^/]+)' })
  const score = r.path.includes('(.*)') ? 0 : r.path.includes(':') ? 1 : 2
  return { ...r, keys, re: new RegExp('^' + src + '$'), score }
}
const view = computed(() => {
  const table = routes.map(compile).sort((a, b) => b.score - a.score)   // 分数高的先匹配
  for (const r of table) {
    const m = r.re.exec(current.value)
    if (!m) continue
    const params = {}
    r.keys.forEach((k, i) => { params[k] = m[i + 1] })
    return { component: r.component, props: r.props === true ? params : {} }
  }
  return { component: null, props: {} }
})

return { current, push, view }`,
  solJs: `const Home = { template: '<p class="view">首页</p>' }
const TaskDetail = { props: ['id'], template: '<p class="view">任务 {{ id }} 的详情</p>' }
const NotFound = { template: '<p class="view">404：页面不存在</p>' }

const routes = [
  { path: '/', component: Home },
  { path: '/task/:id', component: TaskDetail, props: true },   // :id 是动态参数
  { path: '/:pathMatch(.*)*', component: NotFound }            // 404 页面
]

// ===== 已给出：迷你路由（不用修改） =====
const current = ref('/')
function push(path) { current.value = path }
function compile(r) {
  if (r.path === '*') throw new Error('Vue Router 4 不支持 path: \\'*\\'')
  const keys = []
  const src = r.path
    .replace(/\\/:(\\w+)\\(\\.\\*\\)\\*/g, (_, k) => { keys.push(k); return '/(.*)' })
    .replace(/:(\\w+)/g, (_, k) => { keys.push(k); return '([^/]+)' })
  const score = r.path.includes('(.*)') ? 0 : r.path.includes(':') ? 1 : 2
  return { ...r, keys, re: new RegExp('^' + src + '$'), score }
}
const view = computed(() => {
  const table = routes.map(compile).sort((a, b) => b.score - a.score)   // 分数高的先匹配
  for (const r of table) {
    const m = r.re.exec(current.value)
    if (!m) continue
    const params = {}
    r.keys.forEach((k, i) => { params[k] = m[i + 1] })
    return { component: r.component, props: r.props === true ? params : {} }
  }
  return { component: null, props: {} }
})

return { current, push, view }`,
  hints: [
    '路由表是一个数组。每个路由把 path 映射到 component。路径中的 :id 是动态参数。props: true 把参数作为 props 传给组件。404 路由用 /:pathMatch(.*)* 匹配所有地址。第 23 章“23.1 定义路由表并显示页面”的代码讲了它。',
    '在 routes 数组中加两个对象。TODO 1：path 是 \'/task/:id\'，component 是 TaskDetail，再加 props: true。TODO 2：path 是 \'/:pathMatch(.*)*\'，component 是 NotFound。',
    "{ path: '/task/:id', component: TaskDetail, props: true },\n{ path: '/:pathMatch(.*)*', component: NotFound }"
  ],
  wrong: [
    { js: `const Home = { template: '<p class="view">首页</p>' }
const TaskDetail = { props: ['id'], template: '<p class="view">任务 {{ id }} 的详情</p>' }
const NotFound = { template: '<p class="view">404：页面不存在</p>' }

const routes = [
  { path: '/', component: Home },
  { path: '/task/:id', component: TaskDetail },
  { path: '/:pathMatch(.*)*', component: NotFound }
]

const current = ref('/')
function push(path) { current.value = path }
function compile(r) {
  if (r.path === '*') throw new Error('Vue Router 4 不支持 path: \\'*\\'')
  const keys = []
  const src = r.path
    .replace(/\\/:(\\w+)\\(\\.\\*\\)\\*/g, (_, k) => { keys.push(k); return '/(.*)' })
    .replace(/:(\\w+)/g, (_, k) => { keys.push(k); return '([^/]+)' })
  const score = r.path.includes('(.*)') ? 0 : r.path.includes(':') ? 1 : 2
  return { ...r, keys, re: new RegExp('^' + src + '$'), score }
}
const view = computed(() => {
  const table = routes.map(compile).sort((a, b) => b.score - a.score)
  for (const r of table) {
    const m = r.re.exec(current.value)
    if (!m) continue
    const params = {}
    r.keys.forEach((k, i) => { params[k] = m[i + 1] })
    return { component: r.component, props: r.props === true ? params : {} }
  }
  return { component: null, props: {} }
})

return { current, push, view }`, why: '没有 props: true 时，参数只在 route.params 中，TaskDetail 的 prop id 是 undefined。' },
    { js: `const Home = { template: '<p class="view">首页</p>' }
const TaskDetail = { props: ['id'], template: '<p class="view">任务 {{ id }} 的详情</p>' }
const NotFound = { template: '<p class="view">404：页面不存在</p>' }

const routes = [
  { path: '/', component: Home },
  { path: '/task/:id', component: TaskDetail, props: true },
  { path: '*', component: NotFound }
]

const current = ref('/')
function push(path) { current.value = path }
function compile(r) {
  if (r.path === '*') throw new Error('Vue Router 4 不支持 path: \\'*\\'')
  const keys = []
  const src = r.path
    .replace(/\\/:(\\w+)\\(\\.\\*\\)\\*/g, (_, k) => { keys.push(k); return '/(.*)' })
    .replace(/:(\\w+)/g, (_, k) => { keys.push(k); return '([^/]+)' })
  const score = r.path.includes('(.*)') ? 0 : r.path.includes(':') ? 1 : 2
  return { ...r, keys, re: new RegExp('^' + src + '$'), score }
}
const view = computed(() => {
  const table = routes.map(compile).sort((a, b) => b.score - a.score)
  for (const r of table) {
    const m = r.re.exec(current.value)
    if (!m) continue
    const params = {}
    r.keys.forEach((k, i) => { params[k] = m[i + 1] })
    return { component: r.component, props: r.props === true ? params : {} }
  }
  return { component: null, props: {} }
})

return { current, push, view }`, why: 'path: \'*\' 是 Vue Router 3 的写法。Vue Router 4 不接受它，要写 /:pathMatch(.*)*。' }
  ],
  async check(T) {
    const view = () => ((T.$('.view') || {}).textContent || '').trim();
    const go = async t => { const b = T.btn(t); if (b) await T.click(b); return !!b; };
    T.ok(view() === '首页', '地址 / 显示首页');
    if (!(await go('任务 2'))) { T.ok(false, '找到“任务 2”按钮'); return; }
    T.ok(view() === '任务 2 的详情', 'TODO 1：地址 /task/2 显示“任务 2 的详情”（当前：' + (view() || '空') + '）');
    await go('任务 3');
    T.ok(view() === '任务 3 的详情', 'TODO 1：地址 /task/3 显示“任务 3 的详情”（当前：' + (view() || '空') + '）');
    await go('错误的地址');
    T.ok(view() === '404：页面不存在', 'TODO 2：地址 /abc 显示“404：页面不存在”（当前：' + (view() || '空') + '）');
    await go('首页');
    T.ok(view() === '首页', '回到 /，仍显示首页。404 路由没有覆盖首页');
  }
}

export const fbRouter: Exercise = {
  title: '补全：用 meta 和守卫保护后台', ch: 23,
  task: '<p>说明：练习台不能运行真实的 Vue Router。脚本中有一个迷你路由。它按 beforeEach 的规则处理守卫的返回值：返回字符串时重定向，不返回值时放行。</p><ol><li>TODO 1：给 /admin 路由加上 meta: { requiresAuth: true }。</li><li>TODO 2：在守卫中返回 \'/login\'。</li><li>确认未登录时进入登录页，登录后可以进入后台。</li></ol>',
  tpl: '<p>当前页面：{{ routes[current].title }}</p>\n<p>登录状态：{{ loggedIn ? \'已登录\' : \'未登录\' }}</p>\n<button @click="push(\'/\')">去首页</button>\n<button @click="push(\'/admin\')">去后台</button>\n<button @click="loggedIn = true">登录</button>\n<ul>\n  <li v-for="(line, i) in log" :key="i">{{ line }}</li>\n</ul>',
  js: `const routes = {
  '/': { title: '首页' },
  '/login': { title: '登录页' },
  '/admin': { title: '管理后台' }   // TODO 1：加上 meta，标记这个路由需要登录
}

// ===== 已给出：迷你路由（不用修改） =====
const current = ref('/')
const loggedIn = ref(false)
const log = ref([])
const guards = []
function beforeEach(guard) { guards.push(guard) }

function push(path) {
  let target = path
  for (let hops = 0; hops < 10; hops++) {
    const to = { path: target, meta: routes[target].meta || {} }
    const from = { path: current.value }
    let redirect = null
    for (const guard of guards) {
      const result = guard(to, from)
      if (result === false) { log.value.push('取消导航：' + target); return }
      if (typeof result === 'string') { redirect = result; break }
    }
    if (redirect === null) {
      current.value = target
      log.value.push('到达 ' + target)
      return
    }
    log.value.push(target + ' → 重定向到 ' + redirect)
    target = redirect
  }
  log.value.push('重定向超过 10 次，导航停止。')
}

// ===== 导航守卫 =====
beforeEach((to, from) => {
  if (to.meta.requiresAuth && !loggedIn.value) {
    // TODO 2：返回 '/login'，重定向到登录页
  }
})

return { routes, current, loggedIn, log, push }`,
  solJs: `const routes = {
  '/': { title: '首页' },
  '/login': { title: '登录页' },
  '/admin': { title: '管理后台', meta: { requiresAuth: true } }   // 需要登录
}

// ===== 已给出：迷你路由（不用修改） =====
const current = ref('/')
const loggedIn = ref(false)
const log = ref([])
const guards = []
function beforeEach(guard) { guards.push(guard) }

function push(path) {
  let target = path
  for (let hops = 0; hops < 10; hops++) {
    const to = { path: target, meta: routes[target].meta || {} }
    const from = { path: current.value }
    let redirect = null
    for (const guard of guards) {
      const result = guard(to, from)
      if (result === false) { log.value.push('取消导航：' + target); return }
      if (typeof result === 'string') { redirect = result; break }
    }
    if (redirect === null) {
      current.value = target
      log.value.push('到达 ' + target)
      return
    }
    log.value.push(target + ' → 重定向到 ' + redirect)
    target = redirect
  }
  log.value.push('重定向超过 10 次，导航停止。')
}

// ===== 导航守卫 =====
beforeEach((to, from) => {
  if (to.meta.requiresAuth && !loggedIn.value) {
    return '/login'   // 返回新地址：重定向
  }
})

return { routes, current, loggedIn, log, push }`,
  hints: [
    '路由用 meta 保存自定义信息。导航守卫读取 to.meta。守卫返回一个地址时，Router 重定向到这个地址。第 23 章开头的路由表和 router.beforeEach 示例讲了它。',
    'TODO 1：在 \'/admin\' 的对象中加一个键 meta，值是 { requiresAuth: true }。TODO 2：在 if 中写一个 return 语句。',
    "'/admin': { title: '管理后台', meta: { requiresAuth: true } }\n\nif (to.meta.requiresAuth && !loggedIn.value) {\n  return '/login'\n}"
  ],
  async check(T) {
    const page = () => { const m = T.text().match(/当前页面：\s*(\S+?)\s*登录状态/); return m ? m[1] : ''; };
    const go = async t => { const b = T.btn(t); if (b) await T.click(b); return !!b; };
    const root = T.$(':scope > div');
    const inst = root && root._vnode && root._vnode.component;
    const r = inst && inst.setupState.routes;
    T.ok(!!(r && r['/admin'] && r['/admin'].meta && r['/admin'].meta.requiresAuth === true), '/admin 路由有 meta: { requiresAuth: true }');
    if (!(await go('去后台'))) { T.ok(false, '找到“去后台”按钮'); return; }
    T.ok(page() === '登录页', '未登录访问 /admin，重定向到登录页（当前：' + page() + '）');
    // 临时加一个新的受保护路由再导航：守卫要读 to.meta，不能把 /admin 写死
    const S = inst && inst.setupState;
    if (S && S.routes && typeof S.push === 'function') {
      S.routes['/report'] = { title: '报表', meta: { requiresAuth: true } };
      S.push('/report');
      await nextTick();
      T.ok(page() === '登录页', '未登录访问另一个带 requiresAuth 的路由 /report，也重定向到登录页（守卫要看 to.meta，不能写死 /admin；当前：' + page() + '）');
    }
    await go('去首页');
    T.ok(page() === '首页', '未登录也可以访问首页（当前：' + page() + '）');
    if (!(await go('登录'))) { T.ok(false, '找到“登录”按钮'); return; }
    await go('去后台');
    T.ok(page() === '管理后台', '登录后访问 /admin，到达管理后台（当前：' + page() + '）');
  }
}

export const authGuard: Exercise = {
  title: '修复：未登录时，所有页面都重定向到登录页', ch: 23,
  task: '<p>脚本中有一个迷你路由。守卫返回字符串时，路由重定向到这个地址。守卫不返回值时，导航继续。现在的守卫有错误：未登录时，访问任何页面都重定向到 /login，包括 /login 本身。</p><ol><li>只在目标路由有 <code>meta.requiresAuth</code> 且未登录时，返回 \'/login\'。</li><li>确认 /login 和首页不重定向。</li><li>确认登录后可以进入后台。</li></ol>',
  tpl: '<p>当前页面：{{ routes[current].title }}</p>\n<p>登录状态：{{ loggedIn ? \'已登录\' : \'未登录\' }}</p>\n<button @click="push(\'/\')">去首页</button>\n<button @click="push(\'/admin\')">去后台</button>\n<button @click="loggedIn = true">登录</button>\n<ul>\n  <li v-for="(line, i) in log" :key="i">{{ line }}</li>\n</ul>',
  js: `// ===== 已给出：迷你路由（不用修改） =====
const routes = {
  '/': { title: '首页' },
  '/login': { title: '登录页' },
  '/admin': { title: '管理后台', meta: { requiresAuth: true } }
}
const current = ref('/')
const loggedIn = ref(false)
const log = ref([])
const guards = []
function beforeEach(guard) { guards.push(guard) }

function push(path) {
  let target = path
  for (let hops = 0; hops < 10; hops++) {
    const to = { path: target, meta: routes[target].meta || {} }
    const from = { path: current.value }
    let redirect = null
    for (const guard of guards) {
      const result = guard(to, from)
      if (result === false) { log.value.push('取消导航：' + target); return }
      if (typeof result === 'string') { redirect = result; break }
    }
    if (redirect === null) {
      current.value = target
      log.value.push('到达 ' + target)
      return
    }
    log.value.push(target + ' → 重定向到 ' + redirect)
    target = redirect
  }
  log.value.push('重定向超过 10 次，导航停止。守卫可能无限重定向。')
}

// ===== TODO：修复这个守卫 =====
beforeEach((to, from) => {
  if (!loggedIn.value) return '/login'
})

return { routes, current, loggedIn, log, push }`,
  hints: [
    '原因：守卫对每一次导航都检查登录状态，包括去 /login 的导航，所以 /login 又被重定向到 /login。守卫只应该拦截需要登录的页面。路由表已经标记了哪些页面需要登录。第 23 章的实验台“简化的路由和导航守卫”讲了守卫和重定向。',
    '只改守卫中的 if 条件。在 !loggedIn.value 前面加一个条件：目标路由 to 的 meta 中有 requiresAuth。',
    'beforeEach((to, from) => {\n  if (to.meta.requiresAuth && !loggedIn.value) return \'/login\'\n})'
  ],
  async check(T) {
    const page = () => { const m = T.text().match(/当前页面：\s*(\S+?)\s*登录状态/); return m ? m[1] : ''; };
    const loop = () => /超过 10 次/.test(T.text());
    const go = async t => { const b = T.btn(t); if (b) await T.click(b); return !!b; };
    if (!(await go('去后台'))) { T.ok(false, '找到“去后台”按钮'); return; }
    T.ok(!loop(), '没有发生无限重定向');
    T.ok(page() === '登录页', '未登录访问 /admin，到达登录页（当前：' + page() + '）');
    // 临时加一个新的受保护路由再导航：守卫要读 to.meta，不能把 /admin 写死
    const S = ((T.$(':scope > div') as any)?._vnode?.component?.setupState);
    if (S && S.routes && typeof S.push === 'function') {
      S.routes['/report'] = { title: '报表', meta: { requiresAuth: true } };
      S.push('/report');
      await nextTick();
      T.ok(page() === '登录页', '未登录访问另一个带 requiresAuth 的路由 /report，也重定向到登录页（守卫要看 to.meta，不能写死 /admin；当前：' + page() + '）');
    }
    await go('去首页');
    const last = () => { const lis = T.$$('li'); return lis.length ? lis[lis.length - 1].textContent.trim() : ''; };
    T.ok(page() === '首页' && last() === '到达 /', '未登录也可以访问首页（当前：' + page() + '）');
    if (!(await go('登录'))) { T.ok(false, '找到“登录”按钮'); return; }
    await go('去后台');
    T.ok(page() === '管理后台', '登录后访问 /admin，到达管理后台（当前：' + page() + '）');
    T.ok(!loop(), '整个过程没有无限重定向');
  }
}

// 旧脚本在对象外面补充的字段（原样保留，需要的话可以整理进上面的对象）
authGuard.solJs = authGuard.js.replace(`beforeEach((to, from) => {
  if (!loggedIn.value) return '/login'
})`, `beforeEach((to, from) => {
  // 只保护需要登录的路由。/login 没有 requiresAuth，所以不重定向
  if (to.meta.requiresAuth && !loggedIn.value) return '/login'
})`);

// ===== 错误解法（基于参考答案做小改动）=====
fbRouter.wrong = [
  { js: sub(fbRouter.solJs, "return '/login'   // 返回新地址：重定向", "return false   // 取消导航"), why: '守卫返回 false 是“取消导航”，不是重定向。用户停在原地，没有到达登录页。要重定向，返回目标地址。' },
  { js: sub(fbRouter.solJs, "meta: { requiresAuth: true } }", "requiresAuth: true }"), why: '自定义字段没有放在 meta 里。守卫读取的是 to.meta，读到的是空对象，/admin 不会被保护。' },
  { js: sub(fbRouter.solJs, "to.meta.requiresAuth && !loggedIn.value", "to.meta.requiresAuth"), why: '守卫没有检查登录状态。登录后访问 /admin 也被重定向到登录页，用户永远进不去。' },
  { js: sub(fbRouter.solJs, "to.meta.requiresAuth && !loggedIn.value", "to.path === '/admin' && !loggedIn.value"), why: '把 /admin 写死在守卫里，没有读 to.meta。路由表里再加一个受保护的页面，守卫就不认识它了。', expectFail: /requiresAuth 的路由 \/report/ }
]

authGuard.wrong = [
  { js: sub(authGuard.solJs, "to.meta.requiresAuth && !loggedIn.value", "to.path !== '/login' && !loggedIn.value"), why: '只排除了 /login。首页没有标记 requiresAuth，却也被重定向到登录页。要看 to.meta.requiresAuth，不要把页面一个个写死。' },
  { js: sub(authGuard.solJs, "to.meta.requiresAuth && !loggedIn.value", "to.meta.requiresAuth"), why: '漏了登录状态的判断。登录后访问 /admin 也被重定向到登录页。' },
  { js: sub(authGuard.solJs, "return '/login'", "return false"), why: '返回 false 是取消导航，不是重定向。未登录时用户停在原来的页面，没有到达登录页。' },
  { js: sub(authGuard.solJs, "to.meta.requiresAuth && !loggedIn.value", "to.path === '/admin' && !loggedIn.value"), why: '把 /admin 写死在守卫里，没有读 to.meta。路由表里再加一个受保护的页面，守卫就不认识它了。', expectFail: /requiresAuth 的路由 \/report/ }
]

// ===== 半成品示例（参考答案挖掉关键处，占位说明做什么）=====
routeTable.faded = {
  js: sub(sub(routeTable.solJs, "{ path: '/task/:id', component: TaskDetail, props: true },   // :id 是动态参数",
    "{ path: /* ✏️ 带动态参数 id 的路径 */ '', component: TaskDetail, /* ✏️ 让参数作为 props 传给组件 */ },"),
    "{ path: '/:pathMatch(.*)*', component: NotFound }            // 404 页面",
    "{ path: /* ✏️ 能匹配所有其他地址的路径 */ '', component: NotFound }")
}

fbRouter.faded = {
  js: sub(sub(fbRouter.solJs, ", meta: { requiresAuth: true } }   // 需要登录", " /* ✏️ 加上 meta，标记这个路由需要登录 */ }"),
    "return '/login'   // 返回新地址：重定向", "/* ✏️ 返回什么，路由才会重定向到登录页？ */")
}

authGuard.faded = {
  js: sub(sub(authGuard.solJs, "  // 只保护需要登录的路由。/login 没有 requiresAuth，所以不重定向\n", ''),
    'to.meta.requiresAuth && !loggedIn.value', 'false /* ✏️ 只在目标路由要求登录、且当前未登录时才重定向 */')
}
