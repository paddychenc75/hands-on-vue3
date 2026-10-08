import type { Exercise } from './types'
import { sub } from './types'

// 两道练习共用同一个迷你 Vue（第 17.8 节的完整清单）。
// 脚本里的函数用 function 声明：练习环境把 reactive、provide、inject、onMounted 等名字当作参数提供，
// function 声明可以覆盖同名参数，const 不行。所以迷你版的 reactive、onMounted 在这里覆盖了真实的同名函数；
// 需要真实的 Vue API 时写 Vue.onMounted。

const MINI_REACTIVE = `// ===== 12 章：响应式（加了 scheduler 和 lazy 两个选项） =====
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

function reactive(obj) {
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

function effect(fn, { scheduler, lazy } = {}) {
  const e = {
    deps: [], scheduler,
    run() {
      e.deps.forEach(dep => dep.delete(e))
      e.deps.length = 0
      const prev = activeEffect
      activeEffect = e
      try { return fn() } finally { activeEffect = prev }
    }
  }
  if (!lazy) e.run()
  return e
}

// ===== 13 章：更新队列 =====
const queue = []
const postCbs = []
let pending = false

function queueJob(job) {
  if (queue.includes(job)) return
  let i = queue.length
  while (i > 0 && queue[i - 1].id > job.id) i--   // 按 id 排：父组件先更新
  queue.splice(i, 0, job)
  if (!pending) { pending = true; Promise.resolve().then(flushJobs) }
}
function invalidateJob(job) {
  const i = queue.indexOf(job)
  if (i > -1) queue.splice(i, 1)
}
function queuePostCb(cb) { postCbs.push(cb) }
function flushJobs() {
  while (queue.length) queue.shift()()
  pending = false
  flushPostCbs()
}
function flushPostCbs() {
  postCbs.splice(0).forEach(cb => cb())
}

// ===== 14 章：虚拟节点 =====
const Text = Symbol('Text')

function h(type, props = null, children = null) {
  if (typeof children === 'number') children = String(children)
  if (Array.isArray(children)) {
    children = children.map(c => (c !== null && typeof c === 'object' ? c : h(Text, null, String(c))))
  }
  return { type, props, children, key: props && props.key != null ? props.key : null, el: null, component: null }
}
const isSameVNodeType = (a, b) => a.type === b.type && a.key === b.key

// ===== 17.2：patch 的分发、元素的挂载和更新、卸载 =====
function patch(n1, n2, container, anchor = null, parent = null) {
  if (n1 === n2) return
  if (n1 && !isSameVNodeType(n1, n2)) {
    anchor = getNextHostNode(n1)
    unmount(n1)
    n1 = null
  }
  const { type } = n2
  if (type === Text) processText(n1, n2, container, anchor)
  else if (typeof type === 'string') processElement(n1, n2, container, anchor, parent)
  else processComponent(n1, n2, container, anchor, parent)
}

function getNextHostNode(vnode) {
  return vnode.component ? getNextHostNode(vnode.component.subTree) : vnode.el.nextSibling
}

function processText(n1, n2, container, anchor) {
  if (n1 == null) {
    n2.el = document.createTextNode(n2.children)
    container.insertBefore(n2.el, anchor)
  } else {
    n2.el = n1.el
    if (n1.children !== n2.children) n2.el.textContent = n2.children
  }
}

function processElement(n1, n2, container, anchor, parent) {
  if (n1 == null) mountElement(n2, container, anchor, parent)
  else patchElement(n1, n2, parent)
}

function mountElement(vnode, container, anchor, parent) {
  const el = (vnode.el = document.createElement(vnode.type))
  if (typeof vnode.children === 'string') el.textContent = vnode.children
  else if (vnode.children) vnode.children.forEach(c => patch(null, c, el, null, parent))
  for (const key in vnode.props) patchProp(el, key, null, vnode.props[key])
  container.insertBefore(el, anchor)       // 子树建好以后才插入页面
}

function patchProp(el, key, prev, next) {
  if (key === 'key') return
  if (/^on[A-Z]/.test(key)) {
    const name = key.slice(2).toLowerCase()
    prev && el.removeEventListener(name, prev)
    next && el.addEventListener(name, next)
  } else if (next == null) el.removeAttribute(key)
  else el.setAttribute(key, next)
}

function patchElement(n1, n2, parent) {
  const el = (n2.el = n1.el)
  const oldProps = n1.props || {}
  const newProps = n2.props || {}
  for (const key in newProps) if (newProps[key] !== oldProps[key]) patchProp(el, key, oldProps[key], newProps[key])
  for (const key in oldProps) if (!(key in newProps)) patchProp(el, key, oldProps[key], null)
  const c1 = n1.children
  const c2 = n2.children
  if (typeof c2 === 'string') {
    if (Array.isArray(c1)) c1.forEach(c => unmount(c, false))
    if (c1 !== c2) el.textContent = c2
  } else if (Array.isArray(c2)) {
    if (Array.isArray(c1)) {               // 16.4：没有 key 的 diff，按下标比较
      const len = Math.min(c1.length, c2.length)
      for (let i = 0; i < len; i++) patch(c1[i], c2[i], el, null, parent)
      c1.slice(len).forEach(c => unmount(c))
      c2.slice(len).forEach(c => patch(null, c, el, null, parent))
    } else {
      el.textContent = ''
      c2.forEach(c => patch(null, c, el, null, parent))
    }
  } else if (Array.isArray(c1)) c1.forEach(c => unmount(c))
  else el.textContent = ''
}

function unmount(vnode, doRemove = true) {
  const instance = vnode.component
  if (instance) {
    instance.isUnmounted = true
    instance.um.forEach(queuePostCb)
    unmount(instance.subTree, doRemove)
    return
  }
  if (Array.isArray(vnode.children)) vnode.children.forEach(c => unmount(c, false))
  if (doRemove) vnode.el.remove()
}

// ===== 17.3：组件实例和 setupComponent =====
let uid = 0
let currentInstance = null

function createComponentInstance(vnode, parent) {
  return {
    uid: uid++, vnode, type: vnode.type, parent,
    props: null, render: null, subTree: null, update: null, next: null,
    provides: parent ? parent.provides : Object.create(null),
    isMounted: false, isUnmounted: false,
    m: [], u: [], um: []
  }
}

function setupComponent(instance) {
  instance.props = reactive({ ...instance.vnode.props })
  currentInstance = instance
  instance.render = instance.type.setup(instance.props)
  currentInstance = null
}

function processComponent(n1, n2, container, anchor, parent) {
  if (n1 == null) mountComponent(n2, container, anchor, parent)
  else updateComponent(n1, n2)
}
`

const MOUNT_SOL = `function mountComponent(vnode, container, anchor, parent) {
  const instance = (vnode.component = createComponentInstance(vnode, parent))
  setupComponent(instance)
  setupRenderEffect(instance, container, anchor)
}

function setupRenderEffect(instance, container, anchor) {
  const componentUpdateFn = () => {
    if (instance.isUnmounted) return
    if (!instance.isMounted) {
      const subTree = (instance.subTree = instance.render())
      patch(null, subTree, container, anchor, instance)
      instance.vnode.el = subTree.el
      instance.isMounted = true
      instance.m.forEach(queuePostCb)
    } else {
      if (instance.next) updateComponentPreRender(instance, instance.next)
      const prevTree = instance.subTree
      const nextTree = (instance.subTree = instance.render())
      patch(prevTree, nextTree, prevTree.el.parentNode, getNextHostNode(prevTree), instance)
      instance.vnode.el = nextTree.el
      instance.u.forEach(queuePostCb)
    }
  }
  const runner = effect(componentUpdateFn, { lazy: true, scheduler: () => queueJob(update) })
  const update = (instance.update = runner.run)
  update.id = instance.uid
  update()
}
`

const MOUNT_START = `// ===== 你要写的：mountComponent 和 setupRenderEffect =====
function mountComponent(vnode, container, anchor, parent) {
  // TODO 1：三步。创建实例（记在 vnode.component 上）、setupComponent、setupRenderEffect
}

function setupRenderEffect(instance, container, anchor) {
  // TODO 2：把渲染函数装进一个副作用函数里。
  // 第一次（!instance.isMounted）：运行 instance.render() 得到 subTree，记在 instance.subTree 上，
  //   patch(null, subTree, …)，把 subTree.el 记到 vnode.el，标记 isMounted，把 instance.m 里的钩子放进后置队列。
  // 之后：有 instance.next 时先 updateComponentPreRender，再渲染出新 subTree，和旧的 patch，
  //   最后把 instance.u 里的钩子放进后置队列。
  // 数据改变时不能直接运行，要放进更新队列；任务的 id 用 instance.uid。
}
`

const MOUNT_FADED = `function mountComponent(vnode, container, anchor, parent) {
  const instance = (vnode.component = /* ✏️ 创建组件实例，传入 vnode 和 parent */)
  /* ✏️ 处理 props 并运行 setup */
  setupRenderEffect(instance, container, anchor)
}

function setupRenderEffect(instance, container, anchor) {
  const componentUpdateFn = () => {
    if (instance.isUnmounted) return
    if (!instance.isMounted) {
      const subTree = (instance.subTree = instance.render())
      patch(null, subTree, container, anchor, instance)
      instance.vnode.el = subTree.el
      instance.isMounted = true
      instance.m.forEach(queuePostCb)
    } else {
      if (instance.next) updateComponentPreRender(instance, instance.next)
      const prevTree = instance.subTree
      const nextTree = (instance.subTree = instance.render())
      patch(prevTree, nextTree, prevTree.el.parentNode, getNextHostNode(prevTree), instance)
      instance.vnode.el = nextTree.el
      instance.u.forEach(queuePostCb)
    }
  }
  // ✏️ 创建副作用函数：lazy，数据改变时 scheduler 把 update 放进更新队列
  const update = (instance.update = runner.run)
  update.id = instance.uid
  update()
}
`

const UPDATE_PART = `
function updateComponentPreRender(instance, next) {
  const prevProps = instance.vnode.props || {}
  const nextProps = next.props || {}
  instance.vnode = next
  instance.next = null
  for (const key in nextProps) instance.props[key] = nextProps[key]
  for (const key in prevProps) if (!(key in nextProps)) delete instance.props[key]
}

function updateComponent(n1, n2) {
  const instance = (n2.component = n1.component)
  if (shouldUpdateComponent(n1, n2)) {
    instance.next = n2
    invalidateJob(instance.update)
    instance.update()
  } else {
    n2.el = n1.el
    instance.vnode = n2
  }
}

const isEmitListener = (emits, key) => /^on[A-Z]/.test(key) && emits.includes(key[2].toLowerCase() + key.slice(3))

`

const SHOULD_SOL = `function shouldUpdateComponent(prev, next) {
  const prevProps = prev.props || {}
  const nextProps = next.props || {}
  const emits = prev.component.type.emits || []
  const keys = Object.keys(nextProps)
  if (keys.length !== Object.keys(prevProps).length) return true
  return keys.some(key => nextProps[key] !== prevProps[key] && !isEmitListener(emits, key))
}
`

const SHOULD_START = `// ===== 你要写的：shouldUpdateComponent =====
// prev、next 是新旧两个组件 vnode，它们的 props 是 vnode.props（可能是 null）。
// 返回 true：子组件要更新。返回 false：跳过。
function shouldUpdateComponent(prev, next) {
  return true     // 现在的写法：只要父组件重新渲染，子组件就更新
}
`

const SHOULD_FADED = `function shouldUpdateComponent(prev, next) {
  const prevProps = prev.props || {}
  const nextProps = next.props || {}
  const emits = prev.component.type.emits || []
  const keys = Object.keys(nextProps)
  if (/* ✏️ 新旧属性的个数不同（多了或少了属性） */) return true
  return keys.some(key => /* ✏️ 这个属性的值变了，并且它不是已声明的事件监听 */)
}
`

const TAIL = `
// ===== 17.6、17.7：生命周期钩子、provide / inject、入口 =====
function injectHook(type, fn) {
  if (!currentInstance) throw new Error('生命周期钩子只能在 setup 里同步调用')
  currentInstance[type].push(fn)
}
function onMounted(fn) { injectHook('m', fn) }
function onUpdated(fn) { injectHook('u', fn) }
function onUnmounted(fn) { injectHook('um', fn) }

function provide(key, value) {
  let provides = currentInstance.provides
  const parentProvides = currentInstance.parent && currentInstance.parent.provides
  if (provides === parentProvides) provides = currentInstance.provides = Object.create(parentProvides)
  provides[key] = value
}
function inject(key, defaultValue) {
  const provides = currentInstance.parent && currentInstance.parent.provides
  return provides && key in provides ? provides[key] : defaultValue
}

function render(vnode, container) {
  patch(container._vnode || null, vnode, container)
  container._vnode = vnode
  flushPostCbs()
}
function createApp(Root, rootProps) {
  return { mount(container) { render(h(Root, rootProps), container) } }
}
`

const GIVEN_NOTE = '// 下面是已经写好的迷你 Vue，不用修改。\n// 要写的部分在后面，用 TODO 标出。\n\n'

// ---------------------------------------------------------------------------
// 练习 1：补全 mountComponent 和 setupRenderEffect
// ---------------------------------------------------------------------------

const DEMO_MOUNT = `
// ===== 使用迷你 Vue（不用修改） =====
const state = reactive({ count: 0, label: 'a' })

function log(msg) {
  document.getElementById('mm-log').textContent += msg + '\\n'
}

const Counter = {
  setup(props) {
    log('Counter setup')
    onMounted(() => {
      const inPage = document.getElementById('mm-host').contains(document.getElementById('mm-counter'))
      log('Counter mounted，DOM 已在页面上：' + inPage)
    })
    return () => {
      log('Counter render')
      return h('i', { id: 'mm-counter' }, 'count = ' + props.count)
    }
  }
}

const App = {
  setup() {
    log('App setup')
    onMounted(() => log('App mounted'))
    return () => {
      log('App render')
      return h('div', null, [h(Counter, { count: state.count }), h('p', null, 'label = ' + state.label)])
    }
  }
}

Vue.onMounted(() => createApp(App).mount(document.getElementById('mm-host')))

function addThree() { state.count++; state.count++; state.count++ }
function changeLabel() { state.label += 'b' }

return { addThree, changeLabel }`

const TPL_MOUNT = `<button @click="addThree">count 同步加 3</button>
<button @click="changeLabel">改 label</button>
<div id="mm-host"></div>
<pre id="mm-log"></pre>`

const MOUNT_FULL = GIVEN_NOTE + MINI_REACTIVE + UPDATE_PART + SHOULD_SOL + TAIL + '\n' + MOUNT_SOL + DEMO_MOUNT

export const miniMount: Exercise = {
  title: '补全迷你 Vue 的 mountComponent 和 setupRenderEffect',
  ch: 17,
  task: '<p>脚本里是 17.8 节的迷你 Vue：响应式、更新队列、<code>h</code>、<code>patch</code>、元素的挂载和更新都已经写好。你要补全组件的挂载。</p><ol><li><b>TODO 1</b>：<code>mountComponent</code> 做三步：创建实例（记在 <code>vnode.component</code> 上）、<code>setupComponent</code>、<code>setupRenderEffect</code>。</li><li><b>TODO 2</b>：<code>setupRenderEffect</code> 里写一个 <code>componentUpdateFn</code>。第一次运行时 render 并 patch 子树，之后运行时比较新旧子树。再把它装进副作用函数，数据改变时通过更新队列运行。</li></ol><p>补全后，页面下方的日志应显示：App 先 setup 再 render，Counter 的 mounted 先于 App 的 mounted，而且 Counter mounted 时它的 DOM 已经在页面上。点“count 同步加 3”，App 和 Counter 各只渲染一次。点“改 label”，只有 App 渲染。</p>',
  tpl: TPL_MOUNT,
  js: GIVEN_NOTE + MINI_REACTIVE + UPDATE_PART + SHOULD_SOL + TAIL + '\n' + MOUNT_START + DEMO_MOUNT,
  solJs: MOUNT_FULL,
  faded: { js: GIVEN_NOTE + MINI_REACTIVE + UPDATE_PART + SHOULD_SOL + TAIL + '\n' + MOUNT_FADED + DEMO_MOUNT },
  hints: [
    '先看第 17.3、17.4 节。mountComponent 只有三步：createComponentInstance、setupComponent、setupRenderEffect。setupRenderEffect 里的副作用函数有两条路径，用 instance.isMounted 区分。',
    '副作用函数用 effect(componentUpdateFn, { lazy: true, scheduler: … }) 创建。lazy 表示创建时不运行。scheduler 在数据改变时代替直接运行：它把 update 放进更新队列 queueJob。update 就是 runner.run，id 设为 instance.uid，创建完以后手动调用一次 update()，完成第一次渲染。',
    'mounted 钩子不能在 patch 之后直接调用：这时整棵树还没有插入页面。把它们放进后置队列，等整棵树 patch 完再运行：instance.m.forEach(queuePostCb)。更新时，instance.next 不为空，要先调用 updateComponentPreRender(instance, instance.next)，子组件才能拿到新的 props。',
    MOUNT_SOL
  ],
  async check(T) {
    const wait = () => new Promise(r => setTimeout(r, 40))
    const host = T.$('#mm-host')
    const logEl = T.$('#mm-log')
    if (!host || !logEl) { T.ok(false, '页面上有 #mm-host 和 #mm-log'); return }
    const lines = () => (logEl.textContent || '').split('\n').filter(Boolean)
    const count = (name) => lines().filter(l => l === name).length
    const index = (prefix) => lines().findIndex(l => l.startsWith(prefix))
    T.ok(/count = 0/.test(host.textContent || '') && /label = a/.test(host.textContent || ''), '首次挂载后页面显示 “count = 0” 和 “label = a”（当前：“' + (host.textContent || '') + '”）')
    T.ok(host.querySelectorAll('#mm-counter').length === 1, '页面上只有一个 Counter')
    const a = lines()
    T.ok(index('App setup') >= 0 && index('App setup') < index('App render') && index('App render') < index('Counter setup') && index('Counter setup') < index('Counter render'),
      '顺序是 App setup、App render、Counter setup、Counter render（渲染 App 时才遇到 Counter，才创建它）')
    T.ok(index('Counter mounted') >= 0 && index('App mounted') > index('Counter mounted'), 'Counter 的 mounted 先于 App 的 mounted（子先父后）')
    T.ok(a.some(l => l.startsWith('Counter mounted') && l.endsWith('true')), 'Counter mounted 运行时，它的 DOM 已经在页面上（mounted 要等整棵树插入页面后才运行）')
    const add = T.btn('同步加 3')
    const lab = T.btn('改 label')
    if (!add || !lab) { T.ok(false, '页面上有两个按钮'); return }
    await T.click(add); await wait()
    T.ok(/count = 3/.test(host.textContent || ''), '点击后 Counter 显示 “count = 3”（当前：“' + (host.textContent || '') + '”）。父组件更新时，要把新的 props 交给子组件')
    T.ok(count('App render') === 2 && count('Counter render') === 2,
      'count 同步加 3：App 和 Counter 各只多渲染一次（现在 App ' + count('App render') + ' 次、Counter ' + count('Counter render') + ' 次，应当都是 2）。数据改变时要放进更新队列，不能立刻渲染')
    await T.click(lab); await wait()
    T.ok(/label = ab/.test(host.textContent || ''), '改 label 后页面显示 “label = ab”')
    T.ok(count('App render') === 3 && count('Counter render') === 2, '只改 label：App 又渲染一次，Counter 的 props 没变，不渲染（App ' + count('App render') + ' 次、Counter ' + count('Counter render') + ' 次）')
    T.ok(count('Counter setup') === 1, 'Counter 的 setup 只运行一次（现在 ' + count('Counter setup') + ' 次）。setup 在创建实例时运行，更新时只运行渲染函数')
    T.ok(host.querySelectorAll('#mm-counter').length === 1, '更新以后，页面上仍然只有一个 Counter')
  },
  wrong: [
    {
      js: sub(MOUNT_FULL, ', scheduler: () => queueJob(update)', ''),
      why: '没有 scheduler 时，数据一改变，副作用函数就立刻运行。同步改 3 次就渲染 3 次。真实的 Vue 用 scheduler 把任务放进更新队列（第 13 章），同一个任务只排一次。',
      expectFail: /更新队列|各只多渲染一次/
    },
    {
      js: sub(MOUNT_FULL, 'if (!instance.isMounted) {', 'if (true) {'),
      why: '每次都当作第一次，调用 patch(null, …)。旧的 DOM 没有被比较，也没有被删除，页面上会出现重复的内容。要用 isMounted 区分挂载和更新两条路径。',
      expectFail: /只有一个 Counter|一个 Counter/
    },
    {
      js: sub(MOUNT_FULL, 'instance.m.forEach(queuePostCb)', 'instance.m.forEach(fn => fn())'),
      why: '子组件 patch 完就直接调用 mounted。这时父组件的 DOM 还没有插入页面，所以子组件在 mounted 里读到的 DOM 不在页面上。mounted 要放进后置队列，整棵树 patch 完才运行。',
      expectFail: /已经在页面上/
    },
    {
      js: sub(MOUNT_FULL, 'const nextTree = (instance.subTree = instance.render())', 'setupComponent(instance)\n      const nextTree = (instance.subTree = instance.render())'),
      why: '每次更新都重新运行 setup。setup 只在创建实例时运行一次，里面创建的状态会被重置，钩子也会被重复注册。更新时只运行渲染函数。',
      expectFail: /setup 只运行一次/
    },
    {
      js: sub(MOUNT_FULL, 'if (instance.next) updateComponentPreRender(instance, instance.next)\n', ''),
      why: '父组件让子组件更新时，新的 vnode 放在 instance.next 上。渲染子组件之前必须先用它更新 props，否则子组件用旧 props 渲染，页面不变。',
      expectFail: /count = 3/
    }
  ]
}

// ---------------------------------------------------------------------------
// 练习 2：shouldUpdateComponent
// ---------------------------------------------------------------------------

const DEMO_SHOULD = `
// ===== 使用迷你 Vue（不用修改） =====
const state = reactive({ other: 0, id: 1, showExtra: true })
const renders = {}

function makeChild(name, options) {
  return {
    ...options,
    setup(props) {
      return () => {
        renders[name] = (renders[name] || 0) + 1
        return h('li', null, name + ' 渲染了 ' + renders[name] + ' 次')
      }
    }
  }
}
const ChildA = makeChild('A', {})                       // 只收到 id
const ChildB = makeChild('B', {})                       // 每次收到一个新对象
const ChildC = makeChild('C', { emits: ['save'] })      // 声明了 save 事件
const ChildD = makeChild('D', {})                       // 没有声明 ping 事件
const ChildE = makeChild('E', {})                       // 有时多一个属性

const App = {
  setup() {
    return () => h('div', null, [
      h('p', null, 'other = ' + state.other),
      h('ul', null, [
        h(ChildA, { id: state.id }),
        h(ChildB, { user: { name: 'Ann' } }),
        h(ChildC, { onSave: () => {} }),
        h(ChildD, { onPing: () => {} }),
        h(ChildE, state.showExtra ? { tag: 'x', extra: 1 } : { tag: 'x' })
      ])
    ])
  }
}

Vue.onMounted(() => createApp(App).mount(document.getElementById('ms-host')))

function bumpOther() { state.other++ }
function bumpId() { state.id++ }
function removeExtra() { state.showExtra = false }

return { bumpOther, bumpId, removeExtra }`

const TPL_SHOULD = `<button @click="bumpOther">改 other（和子组件无关）</button>
<button @click="bumpId">改 id（A 的 prop）</button>
<button @click="removeExtra">去掉 E 的 extra 属性</button>
<div id="ms-host"></div>`

const SHOULD_FULL = GIVEN_NOTE + MINI_REACTIVE + UPDATE_PART + MOUNT_SOL + TAIL + '\n' + SHOULD_SOL + DEMO_SHOULD

export const miniShouldUpdate: Exercise = {
  title: '实现 shouldUpdateComponent',
  ch: 17,
  task: '<p>父组件重新渲染时，会给每个子组件一个新的 vnode。<code>shouldUpdateComponent(prev, next)</code> 比较新旧 vnode 的 props，决定子组件要不要更新。现在它永远返回 <code>true</code>，所以子组件总是更新。</p><p>按 Vue 的规则实现它：</p><ol><li>属性的个数不同，要更新。</li><li>逐个属性用 <code>!==</code> 比较（浅比较，不比较对象的内容）。有一个值变了，要更新。</li><li>已经在 <code>emits</code> 里声明的事件监听（例如声明了 <code>save</code> 的 <code>onSave</code>）不参与比较。<code>isEmitListener(emits, key)</code> 已经写好。</li></ol><p>五个子组件的页面上都显示渲染次数。先点“改 other”，再点“改 id”，最后点“去掉 E 的 extra 属性”，核对哪些子组件应该更新。</p>',
  tpl: TPL_SHOULD,
  js: GIVEN_NOTE + MINI_REACTIVE + UPDATE_PART + MOUNT_SOL + TAIL + '\n' + SHOULD_START + DEMO_SHOULD,
  solJs: SHOULD_FULL,
  faded: { js: GIVEN_NOTE + MINI_REACTIVE + UPDATE_PART + MOUNT_SOL + TAIL + '\n' + SHOULD_FADED + DEMO_SHOULD },
  hints: [
    '先看第 17.5 节的 shouldUpdateComponent。它只做 props 的浅比较：先看属性个数，再逐个看值。',
    '属性个数不同时，直接返回 true。个数相同时，遍历 nextProps 的每个 key：值不相同（!==），并且 !isEmitListener(emits, key)，就返回 true。遍历完都没有变化，返回 false。',
    '不要比较 prev.props !== next.props：父组件每次渲染都会创建新的 props 对象，它们永远不相同。也不要用 JSON.stringify 比较内容：Vue 只做浅比较，每次传新对象的子组件就是会更新。',
    SHOULD_SOL
  ],
  async check(T) {
    const wait = () => new Promise(r => setTimeout(r, 40))
    const host = T.$('#ms-host')
    if (!host) { T.ok(false, '页面上有 #ms-host'); return }
    const counts = () => {
      const r = {}
      ;(host.textContent || '').replace(/([A-E]) 渲染了 (\d+) 次/g, (_, n, c) => { r[n] = +c; return '' })
      return r
    }
    const show = (c) => ['A', 'B', 'C', 'D', 'E'].map(n => n + '=' + c[n]).join('，')
    const b1 = T.btn('改 other'), b2 = T.btn('改 id'), b3 = T.btn('去掉 E')
    if (!b1 || !b2 || !b3) { T.ok(false, '页面上有三个按钮'); return }
    let c = counts()
    T.ok(['A', 'B', 'C', 'D', 'E'].every(n => c[n] === 1), '首次挂载：五个子组件各渲染 1 次（' + show(c) + '）')
    await T.click(b1); await wait()
    c = counts()
    T.ok(c.A === 1, '改 other：A 的 props 没变，不更新（A 现在渲染了 ' + c.A + ' 次，应当还是 1 次）')
    T.ok(c.B === 2, '改 other：B 每次收到新对象，浅比较 !== 为 true，要更新（B 现在 ' + c.B + ' 次，应当是 2 次）')
    T.ok(c.C === 1, '改 other：C 声明了 save 事件，新的 onSave 函数不算变化，不更新（C 现在 ' + c.C + ' 次，应当还是 1 次）')
    T.ok(c.D === 2, '改 other：D 没有声明 ping，新的 onPing 函数算变化，要更新（D 现在 ' + c.D + ' 次，应当是 2 次）')
    T.ok(c.E === 1, '改 other：E 的 props 没变，不更新（E 现在 ' + c.E + ' 次，应当还是 1 次）')
    await T.click(b2); await wait()
    c = counts()
    T.ok(c.A === 2, '改 id：A 的 id 变了，要更新（A 现在 ' + c.A + ' 次，应当是 2 次）')
    T.ok(c.E === 1 && c.C === 1, '改 id：E 和 C 仍不更新（' + show(c) + '）')
    await T.click(b3); await wait()
    c = counts()
    T.ok(c.E === 2, '去掉 extra：E 的属性个数变了，要更新（E 现在 ' + c.E + ' 次，应当是 2 次）。注意只遍历新的 props 会漏掉被删除的属性')
    T.ok(c.A === 2 && c.C === 1, '去掉 extra：A 和 C 不更新（' + show(c) + '）')
  },
  wrong: [
    {
      js: sub(SHOULD_FULL, 'if (keys.length !== Object.keys(prevProps).length) return true\n  return keys.some(key => nextProps[key] !== prevProps[key] && !isEmitListener(emits, key))', 'return prev.props !== next.props'),
      why: '比较的是 props 对象本身。父组件每次渲染都会创建新的 props 对象，它们永远不相同，所以子组件总是更新。要逐个属性比较。',
      expectFail: /A 的 props 没变/
    },
    {
      js: sub(SHOULD_FULL, 'if (keys.length !== Object.keys(prevProps).length) return true\n  return keys.some(key => nextProps[key] !== prevProps[key] && !isEmitListener(emits, key))', 'return JSON.stringify(prev.props) !== JSON.stringify(next.props)'),
      why: '比较了内容（深比较）。Vue 只做浅比较：B 每次传新对象，对象内容相同，Vue 仍然会更新它。深比较在大对象上也有成本。而且函数在 JSON.stringify 里会被忽略，事件监听的差别看不出来。',
      expectFail: /B 每次收到新对象|D 没有声明/
    },
    {
      js: sub(SHOULD_FULL, ' && !isEmitListener(emits, key)', ''),
      why: '没有排除已声明的事件监听。父组件每次渲染都会创建新的回调函数，onSave !== onSave 恒为 true，声明了事件的子组件也总是更新。',
      expectFail: /C 声明了 save/
    },
    {
      js: sub(SHOULD_FULL, '  if (keys.length !== Object.keys(prevProps).length) return true\n', ''),
      why: '只遍历了新 props 的属性，没有比较属性的个数。新 props 里没有的旧属性（被删除的 extra）被漏掉了，子组件应该更新却没有更新。',
      expectFail: /属性个数变了/
    },
    {
      js: sub(SHOULD_FULL, 'if (keys.length !== Object.keys(prevProps).length) return true\n  return keys.some(key => nextProps[key] !== prevProps[key] && !isEmitListener(emits, key))', 'return false'),
      why: '永远不更新。props 真的变了的子组件（A 的 id）也不会更新，页面就是旧的。',
      expectFail: /A 的 id 变了|B 每次收到新对象/
    }
  ]
}
