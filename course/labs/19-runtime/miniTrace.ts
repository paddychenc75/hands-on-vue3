// 实验台用的迷你 Vue：逻辑和第 19.8 节的清单相同，只是在每个内部函数的入口记一条日志（trace），
// 并且把「微任务」换成手动调用 flushJobs，这样可以一步一步回放。
// 它和 Vue 无关：自己的 reactive、patch、更新队列，运行在一个游离的容器里。

export type StepKind = 'call' | 'dom' | 'hook' | 'queue' | 'flush'

export interface InstanceView {
  name: string
  uid: number
  mounted: boolean
  props: string
  next: boolean
  renders: number
}

export interface Step {
  depth: number
  fn: string
  note: string
  kind: StepKind
  instances: InstanceView[]
  queue: string[]
  post: string[]
  html: string
}

export type ScenarioId = 'mount' | 'child-self' | 'parent-props' | 'parent-other' | 'batch'

export const SCENARIOS: { id: ScenarioId; name: string; desc: string }[] = [
  { id: 'mount', name: '首次挂载', desc: '调用 createApp(App).mount(容器)，App 的模板里有子组件 Counter。' },
  { id: 'child-self', name: '子组件自己的数据变了', desc: 'Counter 内部的 n 加 1。App 不用参与。' },
  { id: 'parent-props', name: '父组件改了传给子组件的数据', desc: 'App 的 state.count 加 1，Counter 收到的 count 变了。' },
  { id: 'parent-other', name: '父组件改了与子组件无关的数据', desc: 'App 的 state.label 变了，Counter 的 props 没变。' },
  { id: 'batch', name: '同步改三次，父子的数据都改', desc: 'state.count 加 3 次，同时 Counter 的 n 加 1。看更新队列怎样去重。' }
]

interface Instance {
  uid: number
  name: string
  vnode: any
  type: any
  parent: Instance | null
  props: any
  render: (() => any) | null
  subTree: any
  update: any
  next: any
  isMounted: boolean
  isUnmounted: boolean
  renders: number
  m: (() => void)[]
}

export function runScenario(id: ScenarioId): { steps: Step[]; finalHtml: string } {
  const steps: Step[] = []
  let depth = 0
  let tracing = false
  const container = document.createElement('div')

  // ---------- 响应式（12 章） ----------
  let activeEffect: any = null
  const targetMap = new WeakMap<object, Map<string | symbol, Set<any>>>()
  function track(target: object, key: string | symbol) {
    if (!activeEffect) return
    let depsMap = targetMap.get(target)
    if (!depsMap) targetMap.set(target, (depsMap = new Map()))
    let dep = depsMap.get(key)
    if (!dep) depsMap.set(key, (dep = new Set()))
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
  function trigger(target: object, key: string | symbol) {
    const dep = targetMap.get(target)?.get(key)
    if (!dep) return
    ;[...dep].forEach(e => {
      if (e === activeEffect) return
      if (e.scheduler) {
        rec('trigger', 'state.' + String(key) + ' 变了，通知 ' + e.owner + ' 的渲染副作用函数。它有 scheduler，所以不直接运行，调用 scheduler', 'queue')
        e.scheduler()
      } else e.run()
    })
  }
  function reactive<T extends object>(obj: T): T {
    return new Proxy(obj, {
      get(t: any, k, r) {
        if (k === '__raw') return t
        track(t, k)
        return Reflect.get(t, k, r)
      },
      set(t: any, k, v, r) {
        const old = t[k]
        const ok = Reflect.set(t, k, v, r)
        if (!Object.is(old, v)) trigger(t, k)
        return ok
      }
    })
  }
  function effect(fn: () => any, owner: string, { scheduler, lazy }: { scheduler?: () => void; lazy?: boolean } = {}) {
    const e: any = {
      deps: [] as Set<any>[], scheduler, owner,
      run() {
        e.deps.forEach((dep: Set<any>) => dep.delete(e))
        e.deps.length = 0
        const prev = activeEffect
        activeEffect = e
        try { return fn() } finally { activeEffect = prev }
      }
    }
    if (!lazy) e.run()
    return e
  }

  // ---------- 更新队列（13 章） ----------
  const queue: any[] = []
  const postCbs: any[] = []
  let pending = false
  function queueJob(job: any) {
    if (queue.includes(job)) {
      rec('queueJob', job.label + ' 已经在队列里，不重复加入', 'queue')
      return
    }
    let i = queue.length
    while (i > 0 && queue[i - 1].id > job.id) i--
    queue.splice(i, 0, job)
    rec('queueJob', '把 ' + job.label + '（id = ' + job.id + '）按 id 插进队列。父组件 id 小，排在前面', 'queue')
    if (!pending) {
      pending = true
      rec('queueFlush', '第一个任务入队：安排一个微任务去运行 flushJobs。当前的同步代码继续往下走', 'queue')
    }
  }
  function invalidateJob(job: any) {
    const i = queue.indexOf(job)
    if (i > -1) {
      queue.splice(i, 1)
      rec('invalidateJob', '把 ' + job.label + ' 从队列里删掉：这次父组件的 patch 会直接更新它，不用再排一次', 'queue')
    }
  }
  function queuePostCb(cb: any) {
    postCbs.push(cb)
    rec('queuePostCb', '把 ' + cb.label + ' 放进后置队列，等整棵树 patch 完再运行', 'queue')
  }
  function flushJobs() {
    rec('flushJobs', '同步代码结束，微任务开始：按顺序运行队列里的任务', 'flush')
    depth++
    while (queue.length) {
      const job = queue.shift()
      rec('job', '运行 ' + job.label, 'call')
      depth++
      job()
      depth--
    }
    pending = false
    flushPostCbs()
    depth--
  }
  function flushPostCbs() {
    if (!postCbs.length) return
    rec('flushPostCbs', '运行后置队列：' + postCbs.map(c => c.label).join('、'), 'call')
    depth++
    postCbs.splice(0).forEach(cb => {
      rec(cb.label, '后置队列里的钩子运行。这时 DOM 已经更新', 'hook')
      cb()
    })
    depth--
  }

  // ---------- 虚拟节点（14 章） ----------
  const Text = Symbol('Text')
  function h(type: any, props: any = null, children: any = null): any {
    if (typeof children === 'number') children = String(children)
    if (Array.isArray(children)) children = children.map(c => (c !== null && typeof c === 'object' ? c : h(Text, null, String(c))))
    return { type, props, children, key: props && props.key != null ? props.key : null, el: null, component: null }
  }
  const isSameVNodeType = (a: any, b: any) => a.type === b.type && a.key === b.key
  const typeName = (t: any) => (t === Text ? 'Text' : typeof t === 'string' ? '<' + t + '>' : t.name)

  // ---------- 宿主操作（所有真实 DOM 操作都从这里走，便于记日志） ----------
  const ops = {
    create(tag: string) { rec('createElement', '创建 <' + tag + '>', 'dom'); return document.createElement(tag) },
    createText(text: string) { rec('createText', '创建文本节点“' + text + '”', 'dom'); return document.createTextNode(text) },
    setText(el: Node, text: string) { rec('setText', '把文字改成“' + text + '”', 'dom'); el.textContent = text },
    insert(el: Node, parent: Node, anchor: Node | null) {
      rec('insert', '把 ' + (el as any).nodeName.toLowerCase() + ' 插入 ' + ((parent as any) === container ? '容器' : (parent as any).nodeName.toLowerCase()), 'dom')
      parent.insertBefore(el, anchor)
    },
    remove(el: ChildNode) { rec('remove', '删除 ' + el.nodeName.toLowerCase(), 'dom'); el.remove() }
  }

  // ---------- patch 的分发、元素 ----------
  function patch(n1: any, n2: any, parentEl: Node, anchor: Node | null = null, parent: Instance | null = null) {
    if (n1 === n2) return
    rec('patch', (n1 ? '比较' : '挂载') + ' ' + typeName(n2.type) + '。按 type 分发：' +
      (n2.type === Text ? '文本' : typeof n2.type === 'string' ? '元素' : '组件'), 'call')
    depth++
    try {
      if (n1 && !isSameVNodeType(n1, n2)) {
        anchor = getNextHostNode(n1)
        unmount(n1)
        n1 = null
      }
      if (n2.type === Text) processText(n1, n2, parentEl, anchor)
      else if (typeof n2.type === 'string') processElement(n1, n2, parentEl, anchor, parent)
      else processComponent(n1, n2, parentEl, anchor, parent)
    } finally { depth-- }
  }
  function getNextHostNode(vnode: any): Node | null {
    return vnode.component ? getNextHostNode(vnode.component.subTree) : vnode.el.nextSibling
  }
  function processText(n1: any, n2: any, parentEl: Node, anchor: Node | null) {
    if (n1 == null) {
      n2.el = ops.createText(n2.children)
      ops.insert(n2.el, parentEl, anchor)
    } else {
      n2.el = n1.el
      if (n1.children !== n2.children) ops.setText(n2.el, n2.children)
    }
  }
  function processElement(n1: any, n2: any, parentEl: Node, anchor: Node | null, parent: Instance | null) {
    if (n1 == null) mountElement(n2, parentEl, anchor, parent)
    else patchElement(n1, n2, parent)
  }
  function mountElement(vnode: any, parentEl: Node, anchor: Node | null, parent: Instance | null) {
    rec('mountElement', '先建元素，再挂子节点，最后一次性插入页面', 'call')
    depth++
    const el = (vnode.el = ops.create(vnode.type))
    if (typeof vnode.children === 'string') el.textContent = vnode.children
    else if (vnode.children) vnode.children.forEach((c: any) => patch(null, c, el, null, parent))
    for (const key in vnode.props) if (key !== 'key') el.setAttribute(key, vnode.props[key])
    ops.insert(el, parentEl, anchor)
    depth--
  }
  function patchElement(n1: any, n2: any, parent: Instance | null) {
    rec('patchElement', '复用旧元素，比较子节点', 'call')
    depth++
    const el = (n2.el = n1.el)
    const c1 = n1.children
    const c2 = n2.children
    if (typeof c2 === 'string') {
      if (c1 !== c2) ops.setText(el, c2)
    } else if (Array.isArray(c2) && Array.isArray(c1)) {
      const len = Math.min(c1.length, c2.length)
      for (let i = 0; i < len; i++) patch(c1[i], c2[i], el, null, parent)
      c1.slice(len).forEach(c => unmount(c))
      c2.slice(len).forEach(c => patch(null, c, el, null, parent))
    }
    depth--
  }
  function unmount(vnode: any, doRemove = true) {
    const instance = vnode.component
    if (instance) {
      instance.isUnmounted = true
      unmount(instance.subTree, doRemove)
      return
    }
    if (Array.isArray(vnode.children)) vnode.children.forEach((c: any) => unmount(c, false))
    if (doRemove) ops.remove(vnode.el)
  }

  // ---------- 组件 ----------
  let uid = 0
  let currentInstance: Instance | null = null
  const instances: Instance[] = []

  function createComponentInstance(vnode: any, parent: Instance | null): Instance {
    const instance: Instance = {
      uid: uid++, name: vnode.type.name, vnode, type: vnode.type, parent,
      props: null, render: null, subTree: null, update: null, next: null,
      isMounted: false, isUnmounted: false, renders: 0, m: []
    }
    instances.push(instance)
    rec('createComponentInstance', '创建 ' + instance.name + ' 的实例（uid = ' + instance.uid + '），记下 vnode 和 parent', 'call')
    return instance
  }
  function setupComponent(instance: Instance) {
    rec('setupComponent', '初始化 props，运行 setup()', 'call')
    depth++
    instance.props = reactive({ ...instance.vnode.props })
    rec('initProps', '把 vnode.props 复制成响应式的 instance.props', 'call')
    currentInstance = instance
    rec('setup', '运行 ' + instance.name + ' 的 setup()。它只运行这一次', 'call')
    instance.render = instance.type.setup(instance.props)
    currentInstance = null
    depth--
  }
  function processComponent(n1: any, n2: any, parentEl: Node, anchor: Node | null, parent: Instance | null) {
    if (n1 == null) mountComponent(n2, parentEl, anchor, parent)
    else updateComponent(n1, n2)
  }
  function mountComponent(vnode: any, parentEl: Node, anchor: Node | null, parent: Instance | null) {
    rec('mountComponent', '挂载 ' + vnode.type.name + '：创建实例、setupComponent、setupRenderEffect', 'call')
    depth++
    const instance = (vnode.component = createComponentInstance(vnode, parent))
    setupComponent(instance)
    setupRenderEffect(instance, parentEl, anchor)
    depth--
  }
  function setupRenderEffect(instance: Instance, parentEl: Node, anchor: Node | null) {
    rec('setupRenderEffect', '为 ' + instance.name + ' 创建渲染副作用函数，然后运行第一次', 'call')
    depth++
    const componentUpdateFn = () => {
      if (instance.isUnmounted) return
      if (!instance.isMounted) {
        rec('componentUpdateFn', instance.name + ' 第一次运行：渲染并挂载子树', 'call')
        depth++
        rec('render', '运行 ' + instance.name + ' 的渲染函数。读到的响应式数据成为这个副作用函数的依赖', 'call')
        instance.renders++
        const subTree = (instance.subTree = instance.render!())
        patch(null, subTree, parentEl, anchor, instance)
        instance.vnode.el = subTree.el
        instance.isMounted = true
        if (instance.m.length) rec('mounted', instance.name + ' 的 onMounted 不立刻运行，放进后置队列', 'hook')
        instance.m.forEach(queuePostCb)
        depth--
      } else {
        rec('componentUpdateFn', instance.name + ' 更新：渲染新子树，和旧子树 patch', 'call')
        depth++
        if (instance.next) updateComponentPreRender(instance, instance.next)
        rec('render', '运行 ' + instance.name + ' 的渲染函数，得到新的子树', 'call')
        instance.renders++
        const prevTree = instance.subTree
        const nextTree = (instance.subTree = instance.render!())
        patch(prevTree, nextTree, (prevTree.el as Node).parentNode as Node, getNextHostNode(prevTree), instance)
        instance.vnode.el = nextTree.el
        depth--
      }
    }
    const runner = effect(componentUpdateFn, instance.name, { lazy: true, scheduler: () => queueJob(update) })
    rec('effect', '创建副作用函数（lazy），scheduler 把 update 放进更新队列', 'call')
    const update: any = (instance.update = runner.run)
    update.id = instance.uid
    update.label = instance.name + '.update'
    update()
    depth--
  }
  function updateComponentPreRender(instance: Instance, next: any) {
    rec('updateComponentPreRender', '用 instance.next 更新 ' + instance.name + ' 的 props，然后清空 next', 'call')
    const prevProps = instance.vnode.props || {}
    const nextProps = next.props || {}
    instance.vnode = next
    instance.next = null
    for (const key in nextProps) instance.props[key] = nextProps[key]
    for (const key in prevProps) if (!(key in nextProps)) delete instance.props[key]
  }
  function updateComponent(n1: any, n2: any) {
    rec('updateComponent', '同一个组件，问一问子组件要不要更新', 'call')
    depth++
    const instance = (n2.component = n1.component)
    const should = shouldUpdateComponent(n1, n2)
    if (should) {
      rec('instance.next = n2', '要更新：把新 vnode 放到 instance.next，再同步调用 instance.update()', 'call')
      instance.next = n2
      invalidateJob(instance.update)
      instance.update()
    } else {
      rec('skip', '不更新：只把 n2.el 指向旧的 DOM，把 instance.vnode 换成新的 vnode', 'call')
      n2.el = n1.el
      instance.vnode = n2
    }
    depth--
  }
  function shouldUpdateComponent(prev: any, next: any) {
    const prevProps = prev.props || {}
    const nextProps = next.props || {}
    const keys = Object.keys(nextProps)
    let res = false
    let why = '属性个数相同，每个属性用 !== 比较，没有一个变化，返回 false'
    if (keys.length !== Object.keys(prevProps).length) {
      res = true
      why = '属性个数不同，返回 true'
    } else {
      const changed = keys.find(k => nextProps[k] !== prevProps[k])
      if (changed) {
        res = true
        why = '属性 ' + changed + ' 从 ' + JSON.stringify(prevProps[changed]) + ' 变成 ' + JSON.stringify(nextProps[changed]) + '，返回 true'
      }
    }
    rec('shouldUpdateComponent', '比较新旧 props：' + why, 'call')
    return res
  }

  // ---------- 钩子、入口 ----------
  function onMounted(fn: () => void) {
    const instance = currentInstance!
    const cb: any = () => fn()
    cb.label = instance.name + ' 的 onMounted'
    instance.m.push(cb)
    rec('onMounted', '在 setup 里注册钩子：存进 ' + instance.name + '.m 数组，现在不运行', 'hook')
  }
  function render(vnode: any, el: Node) {
    rec('render', 'render(vnode, 容器)：patch(null, vnode, 容器)', 'call')
    depth++
    patch((el as any)._vnode || null, vnode, el)
    ;(el as any)._vnode = vnode
    flushPostCbs()
    depth--
  }

  // ---------- 记日志 ----------
  function snapshot(): InstanceView[] {
    return instances.map(i => ({
      name: i.name, uid: i.uid, mounted: i.isMounted, renders: i.renders, next: !!i.next,
      props: i.props ? JSON.stringify(i.props.__raw) : '（还没有）'
    }))
  }
  function rec(fn: string, note: string, kind: StepKind) {
    if (!tracing) return
    steps.push({
      depth, fn, note, kind, instances: snapshot(),
      queue: queue.map(j => j.label), post: postCbs.map(c => c.label),
      html: container.innerHTML
    })
  }

  // ---------- 场景 ----------
  const state = reactive({ count: 0, label: 'a' })
  const local = reactive({ n: 0 })

  const Counter = {
    name: 'Counter',
    setup(props: any) {
      onMounted(() => {})
      return () => h('i', null, 'count = ' + props.count + '，n = ' + local.n)
    }
  }
  const App = {
    name: 'App',
    setup() {
      onMounted(() => {})
      return () => h('div', null, [h(Counter, { count: state.count }), h('p', null, 'label = ' + state.label)])
    }
  }

  function doFlush() {
    if (pending) flushJobs()
  }

  if (id === 'mount') {
    tracing = true
    rec('createApp(App).mount(容器)', '入口：createVNode(App)，调用 render(vnode, 容器)', 'call')
    render(h(App), container)
  } else {
    render(h(App), container)       // 先挂载好，不记录
    tracing = true
    rec('（页面已经挂载）', '开始记录。下面是一次数据变化', 'call')
    if (id === 'child-self') {
      rec('local.n++', 'Counter 内部的数据改变：触发 trigger', 'call')
      local.n++
    } else if (id === 'parent-props') {
      rec('state.count++', 'App 的数据改变：触发 trigger', 'call')
      state.count++
    } else if (id === 'parent-other') {
      rec("state.label = 'b'", 'App 的数据改变：触发 trigger', 'call')
      state.label = 'b'
    } else {
      rec('state.count++ ×3，local.n++', '同步连续修改。每次修改都触发 trigger', 'call')
      state.count++
      state.count++
      state.count++
      local.n++
    }
    doFlush()
  }
  return { steps, finalHtml: container.innerHTML }
}
