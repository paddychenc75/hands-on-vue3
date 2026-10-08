import type { Exercise } from './types'
import { sub } from './types'

// 两道练习共用同一套迷你响应式（第 24 章的 track / trigger，加了 scheduler、lazy 和 stop）。
// 脚本里的函数用 function 声明：练习环境把 ref、effectScope、onScopeDispose 等名字当作参数提供，
// function 声明可以覆盖同名参数，const 不行。需要真实的 Vue API 时写 Vue.onMounted。

const MINI_REACTIVE = `// ===== 12 章：迷你响应式（加了 scheduler、lazy 和 stop） =====
let activeEffect = null
const targetMap = new WeakMap()

function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))
  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}

function trigger(target, key) {
  const dep = targetMap.get(target)?.get(key)
  dep && [...dep].forEach(e => e !== activeEffect && (e.scheduler ? e.scheduler() : e.run()))
}

function miniReactive(obj) {
  return new Proxy(obj, {
    get(t, k, r) { track(t, k); return Reflect.get(t, k, r) },
    set(t, k, v, r) {
      const old = t[k]
      const ok = Reflect.set(t, k, v, r)
      if (!Object.is(old, v)) trigger(t, k)
      return ok
    }
  })
}

function miniRef(value) {
  const r = {
    __isRef: true,
    get value() { track(r, 'value'); return value },
    set value(v) { if (!Object.is(v, value)) { value = v; trigger(r, 'value') } }
  }
  return r
}

function miniEffect(fn, { scheduler, lazy } = {}) {
  const e = {
    deps: [], scheduler,
    run() {
      e.deps.forEach(dep => dep.delete(e))
      e.deps.length = 0
      const prev = activeEffect
      activeEffect = e
      try { return fn() } finally { activeEffect = prev }
    },
    stop() {                                  // 取消订阅：之后数据变化不会再触发它
      e.deps.forEach(dep => dep.delete(e))
      e.deps.length = 0
    }
  }
  if (!lazy) e.run()
  return e
}
`

// ---------------------------------------------------------------------------
// 练习 1：miniWatch
// ---------------------------------------------------------------------------

const QUEUE = `
// ===== 13 章：更新队列（同一个任务在一个 tick 里只运行一次） =====
const queue = new Set()
let pending = false
function queueJob(job) {
  queue.add(job)
  if (pending) return
  pending = true
  Promise.resolve().then(() => {
    pending = false
    const jobs = [...queue]
    queue.clear()
    jobs.forEach(j => j())
  })
}
`

const WATCH_SOL = `function miniWatch(source, cb, { immediate } = {}) {
  const getter = source && source.__isRef ? () => source.value : source
  let oldValue
  let cleanup
  let active = true
  const onCleanup = fn => { cleanup = fn }
  const runCleanup = () => {
    if (cleanup) { const fn = cleanup; cleanup = undefined; fn() }
  }
  const job = () => {
    if (!active) return
    const newValue = runner.run()
    if (!Object.is(newValue, oldValue)) {
      runCleanup()
      const prev = oldValue
      oldValue = newValue
      cb(newValue, prev, onCleanup)
    }
  }
  const runner = miniEffect(getter, { lazy: true, scheduler: () => queueJob(job) })
  if (immediate) job()
  else oldValue = runner.run()
  return function stop() {
    active = false
    runner.stop()
    runCleanup()
  }
}
`

const WATCH_START = `// ===== 你要写的：miniWatch =====
// source：miniRef（有 __isRef 标记），或者一个 getter 函数
// cb(newValue, oldValue, onCleanup)
// options.immediate：创建时立即调用一次回调
// 返回 stop 函数
function miniWatch(source, cb, { immediate } = {}) {
  // TODO：1. 把 source 变成 getter  2. 创建 lazy 的 miniEffect，scheduler 把 job 放进 queueJob
  //       3. job：运行 getter，值变了才清理上一次并调用回调  4. 支持 immediate 和 onCleanup  5. 返回 stop
  return function stop() {}
}
`

const WATCH_FADED = `function miniWatch(source, cb, { immediate } = {}) {
  const getter = source && source.__isRef ? () => source.value : source
  let oldValue
  let cleanup
  let active = true
  const onCleanup = fn => { cleanup = fn }
  const runCleanup = () => {
    if (cleanup) { const fn = cleanup; cleanup = undefined; fn() }
  }
  const job = () => {
    if (/* ✏️ 已经停止时直接返回 */) return
    const newValue = runner.run()
    if (/* ✏️ 新值和旧值不同 */) {
      // ✏️ 先清理上一次，再记下新值，最后调用回调 cb(新值, 旧值, onCleanup)
    }
  }
  const runner = /* ✏️ 创建 lazy 的 miniEffect：scheduler 把 job 放进 queueJob */
  if (immediate) job()
  else oldValue = runner.run()
  return function stop() {
    active = false
    runner.stop()
    runCleanup()
  }
}
`

const WATCH_DEMO = `
// ===== 使用 miniWatch（不用修改） =====
function log(msg) {
  document.getElementById('mw-log').textContent += msg + '\\n'
}

const count = miniRef(0)
const state = miniReactive({ n: 1 })
let stopA

Vue.onMounted(() => {
  stopA = miniWatch(count, (n, o, onCleanup) => {
    log('count ' + o + ' -> ' + n)
    onCleanup(() => log('cleanup ' + n))
  })
  miniWatch(() => state.n % 2, (n, o) => log('parity ' + o + ' -> ' + n), { immediate: true })
})

function addThree() { count.value++; count.value++; count.value++ }
function addOne() { count.value++ }
function nAddTwo() { state.n += 2 }
function nAddOne() { state.n += 1 }
function bumpThenStop() { count.value++; stopA() }

return { addThree, addOne, nAddTwo, nAddOne, bumpThenStop }`

const WATCH_TPL = `<button @click="addThree">count 同步加 3</button>
<button @click="addOne">count 加 1</button>
<button @click="nAddTwo">n 加 2（奇偶不变）</button>
<button @click="nAddOne">n 加 1</button>
<button @click="bumpThenStop">count 加 1 后立刻停止</button>
<pre id="mw-log"></pre>`

const GIVEN = '// 下面是已经写好的迷你响应式和更新队列，不用修改。\n// 要写的部分在后面，用 TODO 标出。\n\n'

const WATCH_FULL = GIVEN + MINI_REACTIVE + QUEUE + '\n' + WATCH_SOL + WATCH_DEMO

export const miniWatch: Exercise = {
  title: '用迷你 effect 实现 watch',
  ch: 26,
  task: '<p>脚本里是迷你响应式（<code>miniRef</code>、<code>miniReactive</code>、<code>miniEffect</code>）和一个更新队列 <code>queueJob</code>。你要写 <code>miniWatch(source, cb, options)</code>，满足这些要求：</p><ol><li><code>source</code> 是 <code>miniRef</code>（有 <code>__isRef</code> 标记）或者 getter 函数。</li><li>数据变化时不直接调用回调，而是把 job 放进 <code>queueJob</code>。同步改三次，回调只运行一次。</li><li>回调收到 <code>(新值, 旧值, onCleanup)</code>。新值和旧值相同（<code>Object.is</code>）时，不调用回调。</li><li><code>immediate: true</code> 时，创建时立即调用一次，旧值是 <code>undefined</code>。</li><li><code>onCleanup(fn)</code> 登记的 <code>fn</code>，在下一次调用回调之前和停止时运行。</li><li>返回 <code>stop</code>。停止后回调不再运行，包括已经排进队列、还没运行的那一次。</li></ol><p>页面上的按钮会操作两个侦听器，下面的日志显示它们的回调。</p>',
  tpl: WATCH_TPL,
  js: GIVEN + MINI_REACTIVE + QUEUE + '\n' + WATCH_START + WATCH_DEMO,
  solJs: WATCH_FULL,
  faded: { js: GIVEN + MINI_REACTIVE + QUEUE + '\n' + WATCH_FADED + WATCH_DEMO },
  hints: [
    '先看第 26.1 到 26.3 节。骨架是：getter 放进 lazy 的 miniEffect，scheduler 调用 queueJob(job)，job 里用 runner.run() 重新运行 getter 拿新值。创建 effect 时用 lazy，因为你要自己决定什么时候第一次运行。',
    'job 里用 Object.is(newValue, oldValue) 比较，不同才调用回调。没有 immediate 时，创建 effect 之后手动 oldValue = runner.run()，记下初始值并收集依赖。有 immediate 时，直接调用 job()，旧值还是 undefined。',
    '清理函数：onCleanup(fn) 把 fn 存起来。job 里在调用回调之前运行它（运行后清空），stop 里也要运行它。停止还要做两件事：runner.stop() 取消订阅，用一个 active 标记让已经排进队列的 job 一进来就返回。',
    WATCH_SOL
  ],
  async check(T) {
    const wait = () => new Promise(r => setTimeout(r, 40))
    const logEl = T.$('#mw-log')
    if (!logEl) { T.ok(false, '页面上有 #mw-log'); return }
    const lines = () => (logEl.textContent || '').split('\n').filter(Boolean)
    const countLines = () => lines().filter(l => l.startsWith('count '))
    const parityLines = () => lines().filter(l => l.startsWith('parity '))
    const cleanupLines = () => lines().filter(l => l.startsWith('cleanup '))
    const btn = (t: string) => T.btn(t)
    const need = ['同步加 3', 'count 加 1', '奇偶不变', 'n 加 1', '立刻停止']
    if (need.some(t => !btn(t))) { T.ok(false, '页面上有五个按钮'); return }

    T.ok(parityLines().length === 1 && parityLines()[0] === 'parity undefined -> 1',
      'immediate: true：创建时立即调用一次，旧值是 undefined（日志现在是：' + (parityLines().join(' / ') || '空') + '）')
    T.ok(countLines().length === 0, '没有 immediate 的侦听器，创建时不调用回调')

    await T.click(btn('同步加 3')!); await wait()
    T.ok(countLines().length === 1 && countLines()[0] === 'count 0 -> 3',
      'count 同步加 3 次：回调只运行一次，收到新值 3 和旧值 0（日志现在是：' + (countLines().join(' / ') || '空') + '）。数据变化时要把 job 放进 queueJob')
    T.ok(cleanupLines().length === 0, '第一次调用回调之前，还没有登记过清理函数，不该运行任何清理')

    await T.click(btn('count 加 1')!); await wait()
    const ls = lines()
    const iClean = ls.indexOf('cleanup 3')
    const iCb = ls.indexOf('count 3 -> 4')
    T.ok(iCb >= 0, '再改一次 count，回调收到新值 4 和旧值 3（旧值要在每次调用回调前更新）')
    T.ok(iClean >= 0 && iCb >= 0 && iClean < iCb, '上一次登记的清理函数 cleanup 3，在这次回调之前运行')

    const parityBefore = parityLines().length
    await T.click(btn('奇偶不变')!); await wait()
    T.ok(parityLines().length === parityBefore, 'n 从 1 变成 3，getter 的结果 n % 2 仍是 1：值没变，不调用回调')
    await T.click(btn('n 加 1')!); await wait()
    T.ok(parityLines().includes('parity 1 -> 0'), 'n 变成 4，getter 的结果从 1 变成 0：调用回调 parity 1 -> 0（日志现在是：' + (parityLines().join(' / ') || '空') + '）')

    await T.click(btn('立刻停止')!); await wait()
    T.ok(lines().includes('cleanup 4'), '停止时，最后一次登记的清理函数 cleanup 4 要运行')
    T.ok(!lines().includes('count 4 -> 5'), '停止之前刚改过 count，但 job 还在队列里：停止后它不能再调用回调')
    await T.click(btn('count 加 1')!); await wait()
    T.ok(countLines().every(l => !l.startsWith('count 5')) && !lines().some(l => /^count \d+ -> 6$/.test(l)), '停止之后再改 count，回调不再运行')
  },
  wrong: [
    {
      js: sub(WATCH_FULL, 'scheduler: () => queueJob(job)', 'scheduler: job'),
      why: '数据一变就直接运行 job，没有经过更新队列，同步改三次就调用三次回调。真实的 watch 默认把 job 放进更新队列（flush: pre），同一个任务一个 tick 只运行一次。',
      expectFail: /只运行一次/
    },
    {
      js: sub(WATCH_FULL, 'if (!Object.is(newValue, oldValue)) {', 'if (true) {'),
      why: '没有比较新旧值。依赖变了但 getter 的结果没变时（这里 n % 2 仍是 1），回调也被调用。回调只应在值真的变了时运行。',
      expectFail: /值没变/
    },
    {
      js: sub(WATCH_FULL, '      runCleanup()\n      const prev = oldValue\n      oldValue = newValue\n      cb(newValue, prev, onCleanup)', '      const prev = oldValue\n      oldValue = newValue\n      cb(newValue, prev, onCleanup)\n      runCleanup()'),
      why: '清理函数放在回调之后运行，会把这次回调刚登记的清理函数立刻清掉。清理的对象是“上一次”，必须在这次回调之前运行。',
      expectFail: /还没有登记过清理函数|cleanup 3/
    },
    {
      js: sub(WATCH_FULL, '      oldValue = newValue\n', ''),
      why: '没有更新旧值。第二次触发时，传给回调的旧值仍是最初的值，比较也一直拿最初的值对比。',
      expectFail: /旧值/
    },
    {
      js: sub(WATCH_FULL, '    if (!active) return\n', ''),
      why: 'job 没有检查是否已经停止。停止前刚改过数据，job 已经在队列里，停止后它仍会运行并调用回调，还会重新收集依赖，让后面的修改继续触发。',
      expectFail: /停止/
    },
    {
      js: sub(WATCH_FULL, '    runner.stop()\n    runCleanup()', '    runner.stop()'),
      why: '停止时没有运行清理函数。最后一次回调登记的清理（比如取消请求）永远不会运行。',
      expectFail: /cleanup 4/
    }
  ]
}

// ---------------------------------------------------------------------------
// 练习 2：miniEffectScope
// ---------------------------------------------------------------------------

const SCOPE_GIVEN = `// 下面是已经写好的迷你响应式，不用修改。
// miniEffect 创建时会登记到 activeScope（如果有）。要写的部分在后面，用 TODO 标出。

let activeScope = null

function miniEffect(fn) {
  const e = {
    deps: [],
    run() {
      e.deps.forEach(dep => dep.delete(e))
      e.deps.length = 0
      const prev = activeEffect
      activeEffect = e
      try { return fn() } finally { activeEffect = prev }
    },
    stop() {
      e.deps.forEach(dep => dep.delete(e))
      e.deps.length = 0
    }
  }
  if (activeScope) activeScope.effects.push(e)    // 当前有活动的作用域：登记进去
  e.run()
  return e
}
`

const SCOPE_SOL = `function createScope(detached = false) {
  const scope = {
    active: true,
    effects: [],
    cleanups: [],
    scopes: [],
    run(fn) {
      if (!scope.active) return undefined
      const prev = activeScope
      activeScope = scope
      try { return fn() } finally { activeScope = prev }
    },
    stop() {
      if (!scope.active) return
      scope.active = false
      scope.effects.forEach(e => e.stop())
      scope.cleanups.forEach(fn => fn())
      scope.scopes.forEach(s => s.stop())
    }
  }
  if (!detached && activeScope) activeScope.scopes.push(scope)
  return scope
}

function onScopeDispose(fn) {
  if (activeScope) activeScope.cleanups.push(fn)
}
`

const SCOPE_START = `// ===== 你要写的：createScope 和 onScopeDispose =====
// createScope(detached) 返回一个作用域对象：{ active, effects, cleanups, scopes, run(fn), stop() }
function createScope(detached = false) {
  // TODO 1：run(fn) 把 activeScope 设成自己再运行 fn，结束后恢复成原来的值；已停止的作用域不运行 fn，返回 undefined
  // TODO 2：创建时，如果不是 detached 并且当前有活动的作用域，登记成它的子作用域
  // TODO 3：stop() 停止自己的 effect，运行 cleanups，再停止子作用域；重复调用无害
  return { active: true, effects: [], cleanups: [], scopes: [], run(fn) { return fn() }, stop() {} }
}

function onScopeDispose(fn) {
  // TODO 4：把 fn 登记到当前活动作用域的 cleanups 里
}
`

const SCOPE_FADED = `function createScope(detached = false) {
  const scope = {
    active: true,
    effects: [],
    cleanups: [],
    scopes: [],
    run(fn) {
      if (/* ✏️ 作用域已经停止 */) return undefined
      const prev = activeScope
      activeScope = scope
      try { return fn() } finally { /* ✏️ 恢复成原来的活动作用域 */ }
    },
    stop() {
      if (!scope.active) return
      scope.active = false
      scope.effects.forEach(e => e.stop())
      // ✏️ 运行 cleanups，再停止所有子作用域
    }
  }
  if (/* ✏️ 不是 detached 并且当前有活动的作用域 */) activeScope.scopes.push(scope)
  return scope
}

function onScopeDispose(fn) {
  if (activeScope) activeScope.cleanups.push(fn)
}
`

const SCOPE_DEMO = `
// ===== 使用迷你 effectScope（不用修改） =====
const state = miniReactive({ x: 0 })

function log(msg) {
  document.getElementById('sc-log').textContent += msg + '\\n'
}

let outer
Vue.onMounted(() => {
  outer = createScope()
  outer.run(() => {
    miniEffect(() => { state.x; log('E1 ran') })
    const inner = createScope()
    inner.run(() => {
      miniEffect(() => { state.x; log('E2 ran') })
      onScopeDispose(() => log('inner dispose'))
    })
    miniEffect(() => { state.x; log('E1b ran') })
    const free = createScope(true)
    free.run(() => miniEffect(() => { state.x; log('E3 ran') }))
    onScopeDispose(() => log('outer dispose'))
  })
})

function bump() { state.x++ }
function stopOuter() { outer.stop() }
function runAgain() {
  const r = outer.run(() => { miniEffect(() => log('E4 ran')); return 'ran' })
  log('outer.run 返回 ' + r)
}

return { bump, stopOuter, runAgain }`

const SCOPE_TPL = `<button @click="bump">state.x++</button>
<button @click="stopOuter">outer.stop()</button>
<button @click="runAgain">outer.run(…)</button>
<pre id="sc-log"></pre>`

const SCOPE_PRELUDE = MINI_REACTIVE.split('function miniEffect')[0] + '\n' + SCOPE_GIVEN
const SCOPE_FULL = SCOPE_PRELUDE + '\n' + SCOPE_SOL + SCOPE_DEMO

export const miniEffectScope: Exercise = {
  title: '实现一个迷你 effectScope',
  ch: 26,
  task: '<p>脚本里的 <code>miniEffect</code> 创建时会把自己登记到 <code>activeScope.effects</code>（如果当前有活动的作用域）。你要写 <code>createScope(detached)</code> 和 <code>onScopeDispose(fn)</code>：</p><ol><li><code>scope.run(fn)</code>：运行 <code>fn</code>，运行期间 <code>fn</code> 里创建的 effect 和子作用域登记到这个作用域。运行结束后，活动作用域要恢复成原来的。已停止的作用域不运行 <code>fn</code>，返回 <code>undefined</code>。</li><li>不是 <code>detached</code> 的作用域，创建时登记成当前活动作用域的子作用域；<code>detached</code> 的不登记。</li><li><code>scope.stop()</code>：停止自己的 effect，运行 <code>onScopeDispose</code> 登记的函数，再停止子作用域。</li></ol><p>页面上的按钮操作一棵作用域树，日志显示哪些 effect 运行了、哪些清理函数被调用。</p>',
  tpl: SCOPE_TPL,
  js: SCOPE_PRELUDE + '\n' + SCOPE_START + SCOPE_DEMO,
  solJs: SCOPE_FULL,
  faded: { js: SCOPE_PRELUDE + '\n' + SCOPE_FADED + SCOPE_DEMO },
  hints: [
    '先看第 26.7 节。作用域对象就是几个数组加一个全局变量 activeScope：run 临时改变 activeScope，创建 effect 和子作用域时读取它。',
    'run 要用 try / finally：先保存 prev = activeScope，把 activeScope 设成自己，finally 里恢复成 prev。恢复成 prev 而不是 null，嵌套的 run 才能回到外层。',
    'stop：先把 active 置为 false，再依次停止 effects、运行 cleanups、停止 scopes。创建时判断 !detached && activeScope，才把自己 push 进 activeScope.scopes。',
    SCOPE_SOL
  ],
  async check(T) {
    const logEl = T.$('#sc-log')
    if (!logEl) { T.ok(false, '页面上有 #sc-log'); return }
    const lines = () => (logEl.textContent || '').split('\n').filter(Boolean)
    const n = (name: string) => lines().filter(l => l === name).length
    const bump = T.btn('state.x++')
    const stop = T.btn('outer.stop()')
    const again = T.btn('outer.run')
    if (!bump || !stop || !again) { T.ok(false, '页面上有三个按钮'); return }

    T.ok(['E1 ran', 'E2 ran', 'E1b ran', 'E3 ran'].every(k => n(k) === 1), '创建时每个 effect 各运行一次（现在：' + lines().join(' / ') + '）')
    await T.click(bump)
    T.ok(['E1 ran', 'E2 ran', 'E1b ran', 'E3 ran'].every(k => n(k) === 2), '作用域没有停止时，改 state.x 让四个 effect 都再运行一次')

    await T.click(stop)
    T.ok(n('outer dispose') === 1, 'outer.stop() 运行 outer 里 onScopeDispose 登记的函数，且只运行一次')
    T.ok(n('inner dispose') === 1, 'outer.stop() 也要停止子作用域 inner：inner 里登记的函数运行了')

    await T.click(bump)
    T.ok(n('E1 ran') === 2, 'outer 停止后，直接登记在 outer 里的 E1 不再运行')
    T.ok(n('E2 ran') === 2, 'outer 停止后，子作用域 inner 里的 E2 不再运行')
    T.ok(n('E1b ran') === 2, 'E1b 是在 inner.run 结束之后创建的，属于 outer：outer 停止后它不再运行（inner.run 结束时要恢复成外层作用域，不是清空）')
    T.ok(n('E3 ran') === 3, 'E3 在 createScope(true) 里创建，是游离的：outer 停止后它仍然运行')

    await T.click(again)
    T.ok(n('E4 ran') === 0 && lines().includes('outer.run 返回 undefined'), '已停止的作用域上调用 run：不运行 fn，返回 undefined')
  },
  wrong: [
    {
      js: sub(SCOPE_FULL, '      scope.scopes.forEach(s => s.stop())\n', ''),
      why: '父作用域停止时没有停止子作用域。子作用域里的 effect 继续运行，清理函数也不会被调用。组件里创建的 effectScope() 因此不会随组件卸载。',
      expectFail: /inner/
    },
    {
      js: sub(SCOPE_FULL, 'if (!detached && activeScope) activeScope.scopes.push(scope)', 'if (activeScope) activeScope.scopes.push(scope)'),
      why: '忽略了 detached。游离的作用域不属于任何父作用域，父作用域停止时它不该被带走。组件的 instance.scope 和共享组合式函数的作用域都靠这一点。',
      expectFail: /游离/
    },
    {
      js: sub(SCOPE_FULL, 'finally { activeScope = prev }', 'finally { activeScope = null }'),
      why: 'run 结束后把活动作用域清空，而不是恢复成进入前的值。嵌套的 run 结束后，外层作用域丢失，后面创建的 effect 不再登记到外层。',
      expectFail: /E1b/
    },
    {
      js: sub(SCOPE_FULL, '      scope.cleanups.forEach(fn => fn())\n', ''),
      why: 'stop 没有运行 onScopeDispose 登记的函数。清理定时器、取消订阅的代码永远不会运行。',
      expectFail: /onScopeDispose/
    },
    {
      js: sub(SCOPE_FULL, '      if (!scope.active) return undefined\n', ''),
      why: '已停止的作用域仍然运行 fn，并把新的 effect 登记进去。这些 effect 没人再停止。真实的 Vue 在开发环境警告 cannot run an inactive effect scope，并且不运行 fn。',
      expectFail: /已停止/
    }
  ]
}
