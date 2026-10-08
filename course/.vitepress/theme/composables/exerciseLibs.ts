// 练习运行环境里的真实库：练习声明 libs: ['pinia', 'vue-router'] 时，Exercise.vue 用这里的函数
//   1. 按需动态加载库（import() 各自成独立分块，没声明的练习不加载）；
//   2. 给学习者的脚本造一份"可直接使用的名字"（和真实项目里的 import 同名）；
//   3. 每次运行造一个全新的 pinia、检查 router 的 history，把它们装到这次运行的 app 上；
//   4. 运行结束后清理。
// 用法和限制见 course/AUTHORING.md 的 4.10。
import type { App } from 'vue'
import type { Pinia } from 'pinia'
import type { Router, RouterHistory } from 'vue-router'

export type LibName = 'pinia' | 'vue-router'

/** 每个库注入脚本的名字（真实导出的子集：不含内部用的 Symbol、HMR 辅助和路由匹配器）。tests/unit/exerciseLibs.test.ts 会拿真实导出核对这两张表 */
export const LIB_NAMES: Record<LibName, string[]> = {
  pinia: [
    'createPinia', 'defineStore', 'storeToRefs', 'setActivePinia', 'getActivePinia', 'disposePinia',
    'mapState', 'mapGetters', 'mapActions', 'mapStores', 'mapWritableState', 'setMapStoreSuffix',
    'skipHydrate', 'MutationType'
  ],
  'vue-router': [
    'createRouter', 'createMemoryHistory', 'createWebHistory', 'createWebHashHistory',
    'useRoute', 'useRouter', 'useLink', 'RouterView', 'RouterLink',
    'onBeforeRouteLeave', 'onBeforeRouteUpdate', 'isNavigationFailure', 'NavigationFailureType',
    'START_LOCATION', 'parseQuery', 'stringifyQuery'
  ]
}
/** 真实导出里故意不注入的名字（核对用） */
export const LIB_SKIPPED: Record<LibName, string[]> = {
  pinia: ['acceptHMRUpdate', 'piniaSymbol', 'shouldHydrate'],
  'vue-router': ['createRouterMatcher', 'loadRouteLocation', 'matchedRouteKey', 'routeLocationKey', 'routerKey', 'routerViewLocationKey', 'viewDepthKey']
}
/** 命名空间对象的名字 */
export const LIB_NAMESPACE: Record<LibName, string> = { pinia: 'Pinia', 'vue-router': 'VueRouter' }

/** 编辑器自动补全要加的名字 */
export function libCompletionNames(libs?: readonly LibName[]): string[] {
  return (libs ?? []).flatMap(l => [...LIB_NAMES[l], LIB_NAMESPACE[l]])
}

/** 界面上"可直接使用 …"提示里，每个库挑几个最常用的名字 */
const HINT_NAMES: Record<LibName, string> = {
  pinia: 'defineStore、storeToRefs',
  'vue-router': 'createRouter、createMemoryHistory、useRoute、useRouter、RouterLink、RouterView'
}
export function libHintText(libs?: readonly LibName[]): string {
  return (libs ?? []).map(l => HINT_NAMES[l]).join('、')
}

export interface LibMods {
  pinia?: typeof import('pinia')
  router?: typeof import('vue-router')
}

/** 按需加载。import() 的字面量写法让打包器把两个库各拆成独立分块 */
export async function loadLibs(libs: readonly LibName[] | undefined): Promise<LibMods> {
  const want = new Set(libs ?? [])
  const [pinia, router] = await Promise.all([
    want.has('pinia') ? import('pinia') : undefined,
    want.has('vue-router') ? import('vue-router') : undefined
  ])
  return { pinia, router }
}

/** 一次运行的库状态。每次运行新建一份，不跨次残留 */
export interface LibRun {
  mods: LibMods
  /** 这次运行的 pinia（声明了 pinia 才有）。运行器已经替学习者 app.use 过 */
  pinia?: Pinia
  /** 学习者在脚本里 createRouter 创建的 router */
  createdRouter?: Router
  /** setup 返回值里交给运行器安装的 router（装好之后才有） */
  router?: Router
}

const WEB_HISTORY_MSG = (name: string) =>
  `练习里不能用 ${name}：它会改动页面真实的地址栏，破坏站点本身的导航。请改用 createMemoryHistory()，它把地址存在内存里，其余用法完全相同。`

/** 由 createMemoryHistory 造出的 history。createRouter 只接受这些 */
const memoryHistories = new WeakSet<object>()

/**
 * 守卫无限重定向（例如没排除 /login，未登录时 /login 又被重定向到 /login）是纯 Promise 微任务的循环，会让整个标签页卡死，
 * 练习里学习者很容易写出来。所以在 router 的第一个全局守卫（先于学习者注册的）里计数：
 * 同一个宏任务里守卫运行超过 50 次就抛错，终止这次导航，错误显示在练习的错误区。
 */
function guardRedirectLoop(router: Router) {
  let n = 0
  let reset = false
  router.beforeEach(() => {
    if (++n > 50) throw new Error('导航守卫陷入了无限重定向：守卫一直在把用户重定向到一个又会被它拦住的地址。检查守卫的判断条件，目标地址（例如 /login）本身不能再被重定向。')
    if (!reset) { reset = true; setTimeout(() => { n = 0; reset = false }, 0) }
  })
}

/** 给学习者脚本的名字表。名字和真实库的导出同名；Pinia / VueRouter 是命名空间对象 */
export function createLibScope(mods: LibMods, run: LibRun): Record<string, unknown> {
  const scope: Record<string, unknown> = {}
  if (mods.pinia) {
    run.pinia = mods.pinia.createPinia()
    const ns: Record<string, unknown> = { ...mods.pinia }
    for (const n of LIB_NAMES.pinia) scope[n] = ns[n]
    scope[LIB_NAMESPACE.pinia] = ns
  }
  if (mods.router) {
    const R = mods.router
    const createMemoryHistory = (base?: string): RouterHistory => {
      const h = R.createMemoryHistory(base)
      memoryHistories.add(h)
      return h
    }
    const createRouter: typeof R.createRouter = options => {
      if (!options || !memoryHistories.has(options.history as object))
        throw new Error('createRouter 的 history 必须是 createMemoryHistory() 创建的。练习里不能让路由改动页面真实的地址栏，否则会破坏站点本身的导航。')
      if (run.createdRouter) throw new Error('一次运行只能创建一个 router')
      const router = R.createRouter(options)
      guardRedirectLoop(router)
      run.createdRouter = router
      return router
    }
    const ns: Record<string, unknown> = {
      ...R,
      createMemoryHistory,
      createRouter,
      createWebHistory: () => { throw new Error(WEB_HISTORY_MSG('createWebHistory')) },
      createWebHashHistory: () => { throw new Error(WEB_HISTORY_MSG('createWebHashHistory')) }
    }
    for (const n of LIB_NAMES['vue-router']) scope[n] = ns[n]
    scope[LIB_NAMESPACE['vue-router']] = ns
  }
  return scope
}

/** app 创建之后、挂载之前：装 pinia（学习者的脚本可能在 setup 顶层就调用 useXxxStore()，所以要先装） */
export function installPinia(app: App, run: LibRun) {
  if (run.pinia) app.use(run.pinia)
}

/**
 * 脚本跑完之后：装 router。约定：脚本 return { router }。
 * 创建了 router 却没返回、或返回的不是创建的那个 router，都抛错（路由没装上，页面只会是空白，不如直接说清楚）。
 */
export function installRouter(app: App, run: LibRun, returned: unknown, onError: (e: unknown) => void) {
  if (!run.mods.router) return
  const r = (returned as { router?: Router } | undefined)?.router
  if (run.createdRouter && r !== run.createdRouter)
    throw new Error('脚本里用 createRouter 创建了 router，但 setup 的返回值里没有 router，路由没有安装。请写 return { router, … }')
  if (!r) return
  r.onError(onError) // 守卫抛错、懒加载路由组件失败：显示在错误区，不让路由库往控制台打印
  app.use(r)
  run.router = r
}

/** 这次运行结束后清理：停掉 pinia 的 effectScope 和 watcher，并清掉全局的 activePinia */
export function disposeLibs(run: LibRun | null) {
  if (run?.pinia && run.mods.pinia) {
    try { run.mods.pinia.disposePinia(run.pinia) } catch { /* ignore */ }
  }
}

/**
 * 让输出区里的链接不被 VitePress 抢走。
 * VitePress 在 window 上用捕获阶段监听所有点击，把站内 <a href> 当成换页（先于 RouterLink 自己的处理，
 * 所以 RouterLink 的 preventDefault 来不及生效），点一下练习里的 <RouterLink> 整个站点就跳走了。
 * VitePress 对带 target 属性的链接放行，所以给输出区里所有 <a> 补上 target="_self"（含义与默认相同，
 * RouterLink 只拦截 _blank）。另外在冒泡阶段兜底：没人处理的链接点击不让浏览器真的换页。
 * 返回清理函数。
 */
export function isolateLinks(out: HTMLElement): () => void {
  const mark = (root: ParentNode) => root.querySelectorAll('a:not([target])').forEach(a => a.setAttribute('target', '_self'))
  const mo = new MutationObserver(() => mark(out))
  mo.observe(out, { childList: true, subtree: true })
  const onClick = (e: Event) => {
    if (!e.defaultPrevented && (e.target as Element | null)?.closest?.('a')) e.preventDefault()
  }
  out.addEventListener('click', onClick)
  mark(out)
  return () => { mo.disconnect(); out.removeEventListener('click', onClick) }
}
