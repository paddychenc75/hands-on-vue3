import type { Exercise } from './types'
import { sub } from './types'
import { nextTick } from 'vue'

export const routeTable: Exercise = {
  title: '补全：路由表的动态参数和 404 页面', ch: 17,
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
    '路由表是一个数组。每个路由把 path 映射到 component。路径中的 :id 是动态参数。props: true 把参数作为 props 传给组件。404 路由用 /:pathMatch(.*)* 匹配所有地址。第 17 章“17.1 定义路由表并显示页面”的代码讲了它。',
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
  title: '补全：用 meta 和守卫保护后台', ch: 17,
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
    '路由用 meta 保存自定义信息。导航守卫读取 to.meta。守卫返回一个地址时，Router 重定向到这个地址。第 17 章开头的路由表和 router.beforeEach 示例讲了它。',
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
  title: '修复：未登录时，所有页面都重定向到登录页', ch: 17,
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
    '原因：守卫对每一次导航都检查登录状态，包括去 /login 的导航，所以 /login 又被重定向到 /login。守卫只应该拦截需要登录的页面。路由表已经标记了哪些页面需要登录。第 17 章的实验台“简化的路由和导航守卫”讲了守卫和重定向。',
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
    '路由表里，动态参数写成 /user/:id；自定义字段放在 meta 里，守卫通过 to.meta 读到它。守卫收到目标路由 to，返回一个地址就是重定向。第 17 章 17.1 讲了路由表，17.6 讲了守卫。',
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
