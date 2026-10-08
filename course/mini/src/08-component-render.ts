// 迷你 Vue 零件 6b：组件的挂载与更新、入口（第 31 章）。属于渲染器本体，和零件 5b 一起在第 32 章被放进 createRenderer。
export default String.raw`// ===== 零件 6b：组件的挂载与更新、render、createApp（第 31 章） =====
// 对应真实源码（vuejs/core v3.5.43）：
//   packages/runtime-core/src/renderer.ts              processComponent、mountComponent、setupRenderEffect（里面的 componentUpdateFn）、
//                                                       updateComponent、updateComponentPreRender、unmountComponent、render
//   packages/runtime-core/src/componentRenderUtils.ts  shouldUpdateComponent
//   packages/runtime-core/src/apiCreateApp.ts          createApp（真实版的 mount 还会处理选择器、SSR 标记、appContext）
// 和真实实现的差别：
//   没有 slots 更新、异步组件、Suspense、KeepAlive、HMR；props 全部放进 reactive（真实版是 shallowReactive）；
//   更新时子组件的根 vnode 变了，不会同步父组件 vnode.el（真实版有 updateHOCHostEl）；
//   卸载时没有处理「还没运行的 mounted 钩子」；没有 app.use / app.component / app.config。

function processComponent(n1, n2, container, anchor, parentComponent) {
  if (n1 == null) mountComponent(n2, container, anchor, parentComponent)
  else updateComponent(n1, n2)
}

//#region mountComponent
function mountComponent(vnode, container, anchor, parentComponent) {
  const instance = (vnode.component = createComponentInstance(vnode, parentComponent))
  setupComponent(instance)
  setupRenderEffect(instance, container, anchor)
}
//#endregion

//#region setupRenderEffect
function setupRenderEffect(instance, container, anchor) {
  const componentUpdateFn = () => {
    if (!instance.isMounted) {
      instance.bm.forEach(fn => fn())
      const subTree = (instance.subTree = instance.render())
      patch(null, subTree, container, anchor, instance)
      instance.vnode.el = subTree.el
      instance.m.forEach(queuePostFlushCb)               // mounted 要等整棵树都插入页面以后才运行：放进后置队列
      instance.isMounted = true
    } else {
      if (instance.next) updateComponentPreRender(instance, instance.next)   // 父组件传来了新 props
      instance.bu.forEach(fn => fn())
      const prevTree = instance.subTree
      const nextTree = (instance.subTree = instance.render())
      patch(prevTree, nextTree, hostParentNode(prevTree.el), getNextHostNode(prevTree), instance)
      instance.vnode.el = nextTree.el
      instance.u.forEach(queuePostFlushCb)
    }
  }
  const e = (instance.effect = instance.scope.run(() =>
    effect(componentUpdateFn, { lazy: true, scheduler: () => queueJob(job) })))
  instance.update = e.run                                // 直接更新：父组件更新时用
  const job = (instance.job = e.runIfDirty)              // 放进更新队列的任务：已经被直接更新过就不再重复运行
  job.id = instance.uid                                  // 父组件先创建，id 更小，所以先更新
  job.allowRecurse = true
  instance.update()
}
//#endregion

function updateComponentPreRender(instance, next) {
  const prevProps = instance.vnode.props || {}
  const nextProps = next.props || {}
  next.component = instance
  instance.vnode = next
  instance.next = null
  untracked(() => {
    for (const key in nextProps) if (key !== 'key') instance.props[key] = nextProps[key]
    for (const key in prevProps) if (key !== 'key' && !(key in nextProps)) delete instance.props[key]
    flushPreFlushCbs(instance)                           // 刚改 props 触发的前置侦听器，要赶在这次渲染之前运行
  })
}

function updateComponent(n1, n2) {
  const instance = (n2.component = n1.component)
  if (shouldUpdateComponent(n1, n2)) {
    instance.next = n2
    instance.update()
  } else {
    n2.el = n1.el
    instance.vnode = n2
  }
}

//#region shouldUpdateComponent
function shouldUpdateComponent(prev, next) {
  const prevProps = prev.props || {}
  const nextProps = next.props || {}
  const emits = prev.type.emits || []
  const keys = Object.keys(nextProps)
  if (keys.length !== Object.keys(prevProps).length) return true
  return keys.some(key => nextProps[key] !== prevProps[key] && !isEmitListener(emits, key))
}
//#endregion

// onFoo 是不是 emits 里声明过的事件 foo 的监听器：声明过的事件不影响渲染
function isEmitListener(emits, key) {
  return /^on[A-Z]/.test(key) && emits.includes(key[2].toLowerCase() + key.slice(3))
}

function unmountComponent(instance, doRemove) {
  instance.bum.forEach(fn => fn())
  instance.scope.stop()                                  // 停掉 setup 里创建的侦听器和渲染副作用函数
  instance.job.disposed = true                           // 已经排进队列的更新任务不再运行
  unmount(instance.subTree, doRemove)
  instance.um.forEach(queuePostFlushCb)
  queuePostFlushCb(() => { instance.isUnmounted = true })
}

function render(vnode, container) {
  if (vnode == null) {
    if (container._vnode) unmount(container._vnode, true)
  } else patch(container._vnode || null, vnode, container)
  container._vnode = vnode
  flushPreFlushCbs()
  flushPostFlushCbs()
}

function createApp(rootComponent, rootProps = null) {
  let rootContainer = null
  return {
    mount(container) { rootContainer = container; render(createVNode(rootComponent, rootProps), container) },
    unmount() { render(null, rootContainer) }
  }
}
`
