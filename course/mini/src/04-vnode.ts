// 迷你 Vue 零件 4：vnode 与 h（第 28 章）。全课程只用这一种 vnode 形状。
export default String.raw`// ===== 零件 4：vnode 和 h（第 28 章） =====
// 对应真实源码（vuejs/core v3.5.43）：
//   packages/runtime-core/src/vnode.ts   createVNode（_createVNode）、normalizeChildren、isSameVNodeType、Text
//   packages/runtime-core/src/h.ts       h
//   packages/shared/src/shapeFlags.ts    ShapeFlags
// vnode 的字段：{ type, props, children, key, shapeFlag, el, component }，外加 __v_isVNode 标记。
//   el 是挂载后对应的真实节点；component 是组件 vnode 对应的实例（第 31 章）。
// 和真实实现的差别：
//   没有 patchFlag、dynamicChildren、ref、Fragment、Comment、Teleport、Suspense、KeepAlive 的标记位；
//   数组 children 里的字符串、数字、null、false 在 h 里就转成文本 vnode（真实版在 patch 时才规范化，null 和 false 变成注释节点）；
//   对象 children（插槽）只记录成 SLOTS_CHILDREN，渲染器不会渲染它。
const Text = Symbol('Text')
const ShapeFlags = {
  ELEMENT: 1,               // type 是字符串：'div'
  FUNCTIONAL_COMPONENT: 2,  // type 是函数
  STATEFUL_COMPONENT: 4,    // type 是对象：{ setup() {} }
  TEXT_CHILDREN: 8,         // children 是字符串
  ARRAY_CHILDREN: 16,       // children 是数组
  SLOTS_CHILDREN: 32        // children 是对象（插槽）
}

function isVNode(value) { return !!value && value.__v_isVNode === true }
function isSameVNodeType(n1, n2) { return n1.type === n2.type && n1.key === n2.key }

//#region createVNode
function createVNode(type, props = null, children = null) {
  const shapeFlag =
    typeof type === 'string' ? ShapeFlags.ELEMENT
    : typeof type === 'function' ? ShapeFlags.FUNCTIONAL_COMPONENT
    : typeof type === 'object' ? ShapeFlags.STATEFUL_COMPONENT
    : 0
  const vnode = {
    __v_isVNode: true, type, props, children: null,
    key: props && props.key != null ? props.key : null,
    shapeFlag, el: null, component: null
  }
  normalizeChildren(vnode, children)
  return vnode
}
//#endregion

//#region normalizeChildren
function normalizeChildren(vnode, children) {
  let childFlag = 0
  if (children == null) children = null
  else if (Array.isArray(children)) {
    children = children.map(c => (isVNode(c) ? c : createVNode(Text, null, c == null || typeof c === 'boolean' ? '' : String(c))))
    childFlag = ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === 'function') {
    children = { default: children }                  // 函数当作默认插槽
    childFlag = ShapeFlags.SLOTS_CHILDREN
  } else if (typeof children === 'object') {
    childFlag = ShapeFlags.SLOTS_CHILDREN
  } else {
    children = String(children)
    childFlag = ShapeFlags.TEXT_CHILDREN
  }
  vnode.children = children
  vnode.shapeFlag |= childFlag
}
//#endregion

//#region h
function h(type, propsOrChildren, children) {
  const l = arguments.length
  if (l === 2) {
    if (propsOrChildren !== null && typeof propsOrChildren === 'object' && !Array.isArray(propsOrChildren)) {
      if (isVNode(propsOrChildren)) return createVNode(type, null, [propsOrChildren])   // 唯一的子节点
      return createVNode(type, propsOrChildren)                                         // props
    }
    return createVNode(type, null, propsOrChildren)                                     // children
  }
  if (l > 3) children = Array.prototype.slice.call(arguments, 2)
  else if (l === 3 && isVNode(children)) children = [children]
  return createVNode(type, propsOrChildren, children)
}
//#endregion
`
