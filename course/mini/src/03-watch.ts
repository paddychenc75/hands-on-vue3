// 迷你 Vue 零件 3：watch 与 effectScope（第 26 章）。建立在零件 1、2 之上。
export default String.raw`// ===== 零件 3：watch 和 effectScope（第 26 章） =====
// 对应真实源码（vuejs/core v3.5.43）：
//   packages/runtime-core/src/apiWatch.ts   watch、watchEffect、doWatch（选择 flush 对应的调度方式）
//   packages/reactivity/src/watch.ts        baseWatch（getter、job、cleanup、oldValue 的处理）、traverse
//   packages/reactivity/src/effectScope.ts  effectScope、onScopeDispose、getCurrentScope
// 和真实实现的差别：
//   source 只支持 ref、reactive 对象、getter 函数（不支持数组、once、onWatcherCleanup、pause / resume）；
//   deep 只有 true / false，没有层数；回调出错不处理；返回的 stop 没有 pause / resume。
let currentInstance = null    // 当前正在 setup 的组件。第 31 章才会设置它；在此之前一直是 null

//#region effectScope
function effectScope(detached = false) {
  const scope = {
    active: true, effects: [], cleanups: [], scopes: [],
    parent: detached ? null : activeScope,
    run(fn) {
      if (!scope.active) return
      const prev = activeScope
      activeScope = scope
      try { return fn() } finally { activeScope = prev }
    },
    stop(fromParent) {
      if (!scope.active) return
      scope.active = false
      scope.effects.forEach(e => e.stop())
      scope.cleanups.forEach(fn => fn())
      scope.scopes.forEach(s => s.stop(true))
      if (scope.parent && !fromParent) scope.parent.scopes.splice(scope.parent.scopes.indexOf(scope), 1)
      scope.parent = null
    }
  }
  if (scope.parent) scope.parent.scopes.push(scope)
  return scope
}

function onScopeDispose(fn) { activeScope && activeScope.cleanups.push(fn) }
function getCurrentScope() { return activeScope }
//#endregion

// 递归读取一个对象的每个属性，让当前的副作用函数订阅它们（deep 侦听用）
function traverse(value, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) return value
  seen.add(value)
  for (const key in value) traverse(value[key], seen)
  return value
}

//#region watch
function watch(source, cb, options = {}) { return doWatch(source, cb, options) }
function watchEffect(fn, options = {}) { return doWatch(fn, null, options) }

function doWatch(source, cb, { immediate = false, deep = false, flush = 'pre' } = {}) {
  let cleanupFn
  const onCleanup = fn => { cleanupFn = fn }
  const runCleanup = () => { if (cleanupFn) { const f = cleanupFn; cleanupFn = undefined; f() } }

  let getter
  if (!cb) getter = () => { runCleanup(); source(onCleanup) }      // watchEffect：重新运行前先清理上一次
  else if (source.__v_isRef) getter = () => source.value
  else if (typeof source === 'function') getter = source
  else { getter = () => source; deep = true }                      // reactive 对象：默认深度侦听
  if (cb && deep) { const g = getter; getter = () => traverse(g()) }

  const INITIAL = {}
  let oldValue = INITIAL
  function job() {
    if (!runner.active) return                                     // stop 之后，已经排进队列的任务也不再运行
    if (!cb) { runner.run(); return }
    const newValue = runner.run()
    if (deep || oldValue === INITIAL || !Object.is(newValue, oldValue)) {
      runCleanup()
      cb(newValue, oldValue === INITIAL ? undefined : oldValue, onCleanup)
      oldValue = newValue
    }
  }
  job.allowRecurse = !!cb                                          // 回调里改自己的来源：允许再触发一次
  if (flush === 'pre') {
    job.pre = true
    if (currentInstance) job.id = currentInstance.uid              // 和所属组件的更新任务同一个 id，排在它前面
  }
  const scheduler = flush === 'sync' ? job : flush === 'post' ? () => queuePostFlushCb(job) : () => queueJob(job)

  const runner = effect(getter, { lazy: true, scheduler })
  runner.onStop = runCleanup
  if (cb) {
    if (immediate) job()
    else oldValue = runner.run()
  } else if (flush === 'post') queuePostFlushCb(job)
  else runner.run()
  return () => runner.stop()
}
//#endregion
`
