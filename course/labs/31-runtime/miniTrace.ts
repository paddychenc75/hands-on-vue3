// 实验台用的追踪：运行的就是课程里的迷你 Vue（course/mini 的 domSource，和第 31 章的练习、正文是同一份代码），
// 用 runMini 的追踪钩子在每个内部函数的入口记一条日志，并把「微任务」换成手动调用，这样可以一步一步回放。
// 这里没有第二份实现：学习者在实验台看到的步骤，就是自己写的那段代码的步骤。
import { domSource } from '../../mini'
import { runMini, type TraceEvent } from '../../mini/load'

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

// 被追踪的函数。名字都是迷你 Vue 里的 function 声明，和真实的 runtime-core 同名
const TRACED = [
  'trigger', 'queueJob', 'queuePostFlushCb', 'flushJobs', 'flushPostFlushCbs',
  'patch', 'mountElement', 'mountComponent', 'createComponentInstance', 'setupComponent', 'setupRenderEffect',
  'updateComponent', 'shouldUpdateComponent', 'updateComponentPreRender', 'onMounted',
  'hostCreateElement', 'hostCreateText', 'hostSetText', 'hostSetElementText', 'hostInsert', 'hostRemove'
]

export function runScenario(id: ScenarioId): { steps: Step[]; finalHtml: string } {
  const steps: Step[] = []
  const container = document.createElement('div')
  let tracing = false
  let off = 0                            // 追踪器看不到的嵌套（在更新任务里运行），手动加的缩进
  const stack: number[] = []             // 正在运行的被追踪函数

  // 把微任务换成手动：queueFlush 里的 resolvedPromise.then(flushJobs) 只是把 flushJobs 存起来
  const callbacks: Array<() => void> = []
  const FakePromise = { resolve: () => ({ then: (fn: () => void) => { callbacks.push(fn); return {} } }) }

  const instances: any[] = []
  const renders = new Map<any, number>()
  const labels = new WeakMap<object, string>()    // 钩子函数 → 名字
  let vue: any

  const jobName = (job: any) => {
    const inst = instances.find(i => i.uid === job.id)
    return inst ? inst.type.name + '.update' : '任务'
  }
  const typeName = (t: any) => (t === vue.Text ? 'Text' : typeof t === 'string' ? '<' + t + '>' : t.name)
  const nodeName = (n: any) => (n === container ? '容器' : n.nodeName.toLowerCase())

  function snapshot(): InstanceView[] {
    return instances.map(i => ({
      name: i.type.name, uid: i.uid, mounted: i.isMounted, renders: renders.get(i) || 0, next: !!i.next,
      props: i.props ? vue.untracked(() => JSON.stringify(i.props)) : '（还没有）'
    }))
  }
  function rec(depth: number, fn: string, note: string, kind: StepKind) {
    if (!tracing) return
    steps.push({
      depth: depth + off, fn, note, kind, instances: snapshot(),
      queue: vue.queue.map(jobName), post: vue.pendingPostFlushCbs.map((c: any) => labels.get(c) || '钩子'),
      html: container.innerHTML
    })
  }
  const here = () => stack.length

  // 追踪事件 → 一条步骤。note 里写这一步在做什么
  function onTrace(e: TraceEvent) {
    const a = e.args as any[]
    const d = e.depth
    stack.push(d)
    switch (e.fn) {
      case 'trigger': {
        const dep = vue.targetMap.get(a[0])?.get(a[1])
        const subs = dep ? [...dep].filter((x: any) => x !== vue.activeEffect) : []
        if (subs.length) rec(d, 'trigger', '属性 ' + String(a[1]) + ' 变了，通知依赖它的副作用函数。渲染副作用函数有调度函数，所以不直接运行，由调度函数调用 queueJob', 'queue')
        break
      }
      case 'queueJob':
        rec(d, 'queueJob', a[0].queued ? jobName(a[0]) + ' 已经在队列里，不重复加入' : '把 ' + jobName(a[0]) + '（id = ' + a[0].id + '）按 id 插进队列。父组件 id 小，排在前面', 'queue')
        break
      case 'queuePostFlushCb':
        rec(d, 'queuePostFlushCb', '把 ' + (labels.get(a[0]) || '钩子') + ' 放进后置队列，等整棵树 patch 完再运行', 'queue')
        break
      case 'flushJobs': {
        rec(d, 'flushJobs', '同步代码结束，微任务开始：按顺序运行队列里的更新任务', 'flush')
        // 把队列里的任务包一层，好看到「运行」和「没变脏，跳过」。包装函数带着原任务的字段，运行后把原任务的 queued 复位
        const q: any[] = vue.queue
        q.forEach((job, i) => {
          if (job.__orig) return
          const w: any = () => {
            if (job.allowRecurse) job.queued = false
            const inst = instances.find(x => x.uid === job.id)
            const before = renders.get(inst) || 0
            const saved = off
            rec(here(), 'job', '运行 ' + jobName(job) + '（它是渲染副作用函数的 runIfDirty）', 'call')
            off = saved + 1
            job()
            off = saved
            if ((renders.get(inst) || 0) === before) rec(here() + 1, 'runIfDirty', jobName(job) + ' 已经被父组件的 patch 同步更新过，不再是脏的：什么也不做，不渲染', 'call')
            job.queued = false
          }
          w.id = job.id; w.allowRecurse = job.allowRecurse; w.disposed = job.disposed; w.__orig = true
          q[i] = w
        })
        break
      }
      case 'flushPostFlushCbs':
        if (vue.pendingPostFlushCbs.length) rec(d, 'flushPostFlushCbs', '运行后置队列：' + vue.pendingPostFlushCbs.map((c: any) => labels.get(c) || '钩子').join('、'), 'call')
        break
      case 'patch':
        rec(d, 'patch', (a[0] ? '比较' : '挂载') + ' ' + typeName(a[1].type) + '。按 type 和 shapeFlag 分发：' +
          (a[1].type === vue.Text ? '文本' : typeof a[1].type === 'string' ? '元素' : '组件'), 'call')
        break
      case 'mountElement':
        rec(d, 'mountElement', '先建元素，再挂子节点，最后一次性插入页面', 'call')
        break
      case 'mountComponent':
        rec(d, 'mountComponent', '挂载 ' + a[0].type.name + '：创建实例、setupComponent、setupRenderEffect', 'call')
        break
      case 'setupComponent':
        rec(d, 'setupComponent', '初始化 props，运行 ' + a[0].type.name + ' 的 setup()。它只运行这一次', 'call')
        break
      case 'setupRenderEffect':
        rec(d, 'setupRenderEffect', '为 ' + a[0].type.name + ' 创建渲染副作用函数（lazy），调度函数把更新任务放进队列，然后运行第一次', 'call')
        break
      case 'updateComponent':
        rec(d, 'updateComponent', '同一个组件，问一问子组件要不要更新', 'call')
        break
      case 'updateComponentPreRender':
        rec(d, 'updateComponentPreRender', '用 instance.next 更新 ' + a[0].type.name + ' 的 props，然后清空 next', 'call')
        break
      case 'onMounted':
        rec(d, 'onMounted', '在 setup 里注册钩子：存进 ' + vue.currentInstance.type.name + '.m 数组，现在不运行', 'hook')
        break
      case 'hostCreateElement':
        rec(d, 'hostCreateElement', '创建 <' + a[0] + '>', 'dom')
        break
      case 'hostCreateText':
        rec(d, 'hostCreateText', '创建文本节点“' + a[0] + '”', 'dom')
        break
      case 'hostSetText':
      case 'hostSetElementText':
        rec(d, e.fn, '把文字改成“' + a[1] + '”', 'dom')
        break
      case 'hostInsert':
        rec(d, 'hostInsert', '把 ' + nodeName(a[0]) + ' 插入 ' + nodeName(a[1]), 'dom')
        break
      case 'hostRemove':
        rec(d, 'hostRemove', '删除 ' + nodeName(a[0]), 'dom')
        break
    }
  }

  function onReturn(e: TraceEvent, result: unknown) {
    stack.pop()
    const a = e.args as any[]
    if (e.fn === 'createComponentInstance') {
      const inst = result as any
      instances.push(inst)
      rec(e.depth, 'createComponentInstance', '创建 ' + a[0].type.name + ' 的实例（uid = ' + inst.uid + '），记下 vnode 和 parent', 'call')
    } else if (e.fn === 'setupComponent') {
      // setup 之后，把渲染函数包一层，数渲染次数并记一步
      const inst = a[0]
      const orig = inst.render
      inst.render = () => {
        renders.set(inst, (renders.get(inst) || 0) + 1)
        rec(here(), 'render', '运行 ' + inst.type.name + ' 的渲染函数。读到的响应式数据成为这个副作用函数的依赖', 'call')
        return orig()
      }
    } else if (e.fn === 'shouldUpdateComponent') {
      const [prev, next] = a
      const p = prev.props || {}
      const n = next.props || {}
      const keys = Object.keys(n)
      let why = '属性个数相同，每个属性用 !== 比较，没有一个变化，返回 false'
      if (keys.length !== Object.keys(p).length) why = '属性个数不同，返回 true'
      else {
        const changed = keys.find(k => n[k] !== p[k])
        if (changed) why = '属性 ' + changed + ' 从 ' + JSON.stringify(p[changed]) + ' 变成 ' + JSON.stringify(n[changed]) + '，返回 true'
      }
      rec(e.depth, 'shouldUpdateComponent', '比较新旧 props：' + why, 'call')
      if (result) rec(e.depth, 'instance.next = n2', '要更新：把新 vnode 放到 instance.next，再同步调用 instance.update()', 'call')
      else rec(e.depth, 'skip', '不更新：只把 n2.el 指向旧的 DOM，把 instance.vnode 换成新的 vnode', 'call')
    }
  }

  // 钩子：运行时记一步（kind = hook）。label 同时用于队列面板
  const hook = (label: string) => {
    const fn = () => rec(here(), label, '后置队列里的钩子运行。这时 DOM 已经更新', 'hook')
    labels.set(fn, label)
    return fn
  }

  vue = runMini<any>(domSource(), {
    globals: { document, Promise: FakePromise },
    lets: ['activeEffect', 'currentInstance'],
    traced: TRACED,
    trace: onTrace,
    traceReturn: onReturn
  })

  // ---------- 场景里的组件和数据（用迷你 Vue 的 reactive、h、onMounted、createApp） ----------
  const state = vue.reactive({ count: 0, label: 'a' })
  const local = vue.reactive({ n: 0 })
  const Counter = {
    name: 'Counter',
    setup(props: any) {
      vue.onMounted(hook('Counter 的 onMounted'))
      return () => vue.h('i', null, 'count = ' + props.count + '，n = ' + local.n)
    }
  }
  const App = {
    name: 'App',
    setup() {
      vue.onMounted(hook('App 的 onMounted'))
      return () => vue.h('div', null, [vue.h(Counter, { count: state.count }), vue.h('p', null, 'label = ' + state.label)])
    }
  }

  const doFlush = () => { while (callbacks.length) callbacks.shift()!() }

  if (id === 'mount') {
    tracing = true
    rec(0, 'createApp(App).mount(容器)', '入口：createVNode(App)，调用 render(vnode, 容器)', 'call')
    off = 1
    vue.createApp(App).mount(container)
    off = 0
  } else {
    vue.createApp(App).mount(container)    // 先挂载好，不记录
    doFlush()
    tracing = true
    rec(0, '（页面已经挂载）', '开始记录。下面是一次数据变化', 'call')
    if (id === 'child-self') {
      rec(0, 'local.n++', 'Counter 内部的数据改变：触发 trigger', 'call')
      local.n++
    } else if (id === 'parent-props') {
      rec(0, 'state.count++', 'App 的数据改变：触发 trigger', 'call')
      state.count++
    } else if (id === 'parent-other') {
      rec(0, "state.label = 'b'", 'App 的数据改变：触发 trigger', 'call')
      state.label = 'b'
    } else {
      rec(0, 'state.count++ ×3，local.n++', '同步连续修改。每次修改都触发 trigger', 'call')
      state.count++
      state.count++
      state.count++
      local.n++
    }
    doFlush()
  }
  return { steps, finalHtml: container.innerHTML }
}
