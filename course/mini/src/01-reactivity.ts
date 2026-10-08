// 迷你 Vue 零件 1：响应式核心（第 24 章）。
// 文件里是一段纯 JavaScript 源码（String.raw 字符串）：没有 import / export，顶层不用模板字符串。
// 约定见 course/mini/README.md。规则：顶层与练习环境注入的 API 同名的（ref、reactive、computed ……）必须用 function 声明。
export default String.raw`// ===== 零件 1：响应式核心（第 24 章） =====
// 对应真实源码（vuejs/core v3.5.43）：
//   packages/reactivity/src/effect.ts       ReactiveEffect（run、runIfDirty、stop、scheduler）、effect
//   packages/reactivity/src/dep.ts          Dep、Link、track、trigger（真实版用 Dep 和 Link 的双向链表存依赖）
//   packages/reactivity/src/reactive.ts     reactive、proxyMap
//   packages/reactivity/src/baseHandlers.ts get / set / deleteProperty
//   packages/reactivity/src/ref.ts          ref
//   packages/reactivity/src/computed.ts     computed
// 和真实实现的差别：见 course/mini/README.md 第 2 节；要点是
//   依赖用 Set 存、每次运行前全部清掉再重收；没有 readonly / shallow / 数组和集合的专门处理 / has、ownKeys 的追踪；
//   computed 一变就通知依赖它的副作用函数，不像真实版那样先比较计算结果。
let activeEffect = null
let activeScope = null          // 第 26 章的 effectScope 用到它；第 24 章里一直是 null
const targetMap = new WeakMap() // 原始对象 → Map(属性名 → Set(副作用函数))
const proxyMap = new WeakMap()  // 原始对象 → 它的代理，保证同一个对象只有一个代理

//#region track
function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))
  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}
//#endregion

//#region trigger
function trigger(target, key) {
  const dep = targetMap.get(target)?.get(key)
  if (!dep) return
  for (const e of [...dep]) {
    if (e === activeEffect) continue       // 副作用函数改自己读的数据：不再触发自己
    e.dirty = true
    e.scheduler ? e.scheduler() : e.run()
  }
}
//#endregion

//#region reactive
function reactive(target) {
  if (typeof target !== 'object' || target === null) return target
  if (target.__v_raw) return target        // 已经是代理
  if (proxyMap.has(target)) return proxyMap.get(target)
  const proxy = new Proxy(target, {
    get(t, key, receiver) {
      if (key === '__v_raw') return t
      track(t, key)
      const res = Reflect.get(t, key, receiver)
      return typeof res === 'object' && res !== null ? reactive(res) : res
    },
    set(t, key, value, receiver) {
      const old = t[key]
      const ok = Reflect.set(t, key, value, receiver)
      if (!Object.is(old, value)) trigger(t, key)
      return ok
    },
    deleteProperty(t, key) {
      const had = key in t
      const ok = Reflect.deleteProperty(t, key)
      if (had && ok) trigger(t, key)
      return ok
    }
  })
  proxyMap.set(target, proxy)
  return proxy
}
//#endregion

//#region effect
function effect(fn, options = {}) {
  const e = {
    deps: [], active: true, dirty: true, scheduler: options.scheduler,
    run() {
      if (!e.active) return fn()           // 已经 stop：只运行，不再收集依赖
      cleanup(e)
      const prev = activeEffect
      activeEffect = e
      e.dirty = false
      try { return fn() } finally { activeEffect = prev }
    },
    runIfDirty() { if (e.dirty) return e.run() },   // 数据没变过就不运行（第 25、31 章用）
    stop() {
      cleanup(e)
      e.active = false
      e.onStop && e.onStop()
    }
  }
  activeScope && activeScope.effects.push(e)
  if (!options.lazy) e.run()
  return e
}
//#endregion

//#region cleanup
function cleanup(e) {
  e.deps.forEach(dep => dep.delete(e))     // 先退出所有旧的订阅，运行时再重新收集
  e.deps.length = 0
}
//#endregion

// 运行 fn 的这一刻不收集依赖（真实版叫 pauseTracking / resetTracking）
function untracked(fn) {
  const prev = activeEffect
  activeEffect = null
  try { return fn() } finally { activeEffect = prev }
}

//#region ref
function ref(value) {
  const r = {
    __v_isRef: true,
    get value() { track(r, 'value'); return reactive(value) },
    set value(v) { if (!Object.is(v, value)) { value = v; trigger(r, 'value') } }
  }
  return r
}
//#endregion

//#region computed
function computed(getter) {
  let value
  let stale = true
  const runner = effect(getter, {
    lazy: true,
    scheduler() { if (!stale) { stale = true; trigger(c, 'value') } }   // 依赖变了：作废缓存，通知读过它的副作用函数
  })
  const c = {
    __v_isRef: true,
    get value() {
      track(c, 'value')
      if (stale) { value = runner.run(); stale = false }
      return value
    }
  }
  return c
}
//#endregion
`
