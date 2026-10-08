// 迷你 Vue 零件 6a：组件实例、setup、生命周期钩子、provide / inject（第 31 章）。不依赖渲染器。
export default String.raw`// ===== 零件 6a：组件实例、setup、钩子、provide / inject（第 31 章） =====
// 对应真实源码（vuejs/core v3.5.43）：
//   packages/runtime-core/src/component.ts       createComponentInstance、setupComponent、setupStatefulComponent、currentInstance
//   packages/runtime-core/src/componentEmits.ts  emit
//   packages/runtime-core/src/apiLifecycle.ts    injectHook、onMounted 等
//   packages/runtime-core/src/apiInject.ts       provide、inject
// 组件是 { setup(props, { emit }) { …; return 渲染函数 } }；函数式组件是 (props) => vnode。
// 和真实实现的差别：
//   setup 只能返回渲染函数（没有 template、render 选项、data、computed 等选项式 API）；没有 slots、attrs、expose；
//   props 不声明、不校验，全部 vnode.props 都进 props（真实版区分 props 和 attrs）；钩子函数不包一层来恢复 currentInstance；
//   没有 onErrorCaptured / 错误处理；没有 app.provide / app.use；没有 onActivated 等 KeepAlive 钩子。
let uid = 0

//#region createComponentInstance
function createComponentInstance(vnode, parent) {
  const instance = {
    uid: uid++, vnode, type: vnode.type, parent,
    props: null, render: null, subTree: null,
    update: null, job: null, effect: null, next: null,    // update：直接运行；job：放进更新队列的任务
    scope: effectScope(true),                             // setup 里创建的侦听器、副作用函数都登记在这里，卸载时一起停
    provides: parent ? parent.provides : Object.create(null),
    isMounted: false, isUnmounted: false,
    bm: [], m: [], bu: [], u: [], bum: [], um: []         // 钩子：beforeMount、mounted、beforeUpdate、updated、beforeUnmount、unmounted
  }
  instance.emit = (event, ...args) => {
    const handler = instance.vnode.props && instance.vnode.props['on' + event[0].toUpperCase() + event.slice(1)]
    handler && handler(...args)
  }
  return instance
}
//#endregion

//#region setupComponent
function setupComponent(instance) {
  const { type } = instance
  instance.props = reactive(propsOf(instance.vnode.props))
  if (typeof type === 'function') {                       // 函数式组件：它自己就是渲染函数
    instance.render = () => type(instance.props)
    return
  }
  currentInstance = instance
  try {
    instance.render = instance.scope.run(() => untracked(() => type.setup(instance.props, { emit: instance.emit })))
  } finally {
    currentInstance = null
  }
}

function propsOf(vnodeProps) {
  const props = { ...vnodeProps }
  delete props.key
  return props
}
//#endregion

function injectHook(type, hook) {
  if (!currentInstance) throw new Error('生命周期钩子只能在 setup 里同步调用')
  currentInstance[type].push(hook)
}
function onBeforeMount(fn) { injectHook('bm', fn) }
function onMounted(fn) { injectHook('m', fn) }
function onBeforeUpdate(fn) { injectHook('bu', fn) }
function onUpdated(fn) { injectHook('u', fn) }
function onBeforeUnmount(fn) { injectHook('bum', fn) }
function onUnmounted(fn) { injectHook('um', fn) }

function provide(key, value) {
  let provides = currentInstance.provides
  const parentProvides = currentInstance.parent && currentInstance.parent.provides
  if (provides === parentProvides) provides = currentInstance.provides = Object.create(parentProvides)   // 第一次 provide：和父级断开，免得改到父级的
  provides[key] = value
}
function inject(key, defaultValue) {
  const provides = currentInstance.parent && currentInstance.parent.provides
  return provides && key in provides ? provides[key] : defaultValue
}
`
