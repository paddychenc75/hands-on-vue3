// 迷你 Vue 零件 5b：元素的挂载与更新、子节点 diff（第 30 章）。
export default String.raw`// ===== 零件 5b：patch、元素、子节点 diff（第 30 章） =====
// 这一段和零件 6b（第 31 章）是「渲染器本体」：只通过 host 开头的函数碰宿主，所以第 32 章可以原样放进 createRenderer(options)。
// 对应真实源码（vuejs/core v3.5.43）：packages/runtime-core/src/renderer.ts
//   patch、processText、processElement、mountElement、mountChildren、patchElement、patchProps、patchChildren、
//   patchUnkeyedChildren、patchKeyedChildren、move、unmount、unmountChildren、remove、getNextHostNode、getSequence
// 和真实实现的差别：
//   没有 patchFlag / dynamicChildren 的快路径（模板编译的优化，第 29 章）；没有 Fragment、Comment、Teleport、Suspense、ref、指令、过渡；
//   patchProp 不处理 value 的特殊情况；没有 key 的数组只在「所有子节点都没有 key」时才走 patchUnkeyedChildren
//   （真实版对 h() 写的 vnode 一律走 patchKeyedChildren，对同类型的无 key 节点结果相同）。

//#region patch
function patch(n1, n2, container, anchor = null, parentComponent = null) {
  if (n1 === n2) return
  if (n1 && !isSameVNodeType(n1, n2)) {      // 类型或 key 不同：旧的整个卸载，新的重新挂载
    anchor = getNextHostNode(n1)
    unmount(n1, true)
    n1 = null
  }
  if (n2.type === Text) processText(n1, n2, container, anchor)
  else if (n2.shapeFlag & ShapeFlags.ELEMENT) processElement(n1, n2, container, anchor, parentComponent)
  else processComponent(n1, n2, container, anchor, parentComponent)   // 第 31 章补上；此前没有组件 vnode
}
//#endregion

function processText(n1, n2, container, anchor) {
  if (n1 == null) {
    hostInsert((n2.el = hostCreateText(n2.children)), container, anchor)
  } else {
    n2.el = n1.el
    if (n2.children !== n1.children) hostSetText(n2.el, n2.children)
  }
}

function processElement(n1, n2, container, anchor, parentComponent) {
  if (n1 == null) mountElement(n2, container, anchor, parentComponent)
  else patchElement(n1, n2, parentComponent)
}

//#region mountElement
function mountElement(vnode, container, anchor, parentComponent) {
  const el = (vnode.el = hostCreateElement(vnode.type))
  if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) hostSetElementText(el, vnode.children)
  else if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) mountChildren(vnode.children, el, null, parentComponent)
  for (const key in vnode.props) if (key !== 'key') hostPatchProp(el, key, null, vnode.props[key])
  hostInsert(el, container, anchor)          // 子树和属性都准备好以后，才插入页面
}
//#endregion

function mountChildren(children, container, anchor, parentComponent) {
  for (let i = 0; i < children.length; i++) patch(null, children[i], container, anchor, parentComponent)
}

//#region patchElement
function patchElement(n1, n2, parentComponent) {
  const el = (n2.el = n1.el)
  patchChildren(n1, n2, el, null, parentComponent)      // 先子节点，再属性（和真实版的顺序一致）
  const oldProps = n1.props || {}
  const newProps = n2.props || {}
  for (const key in oldProps) if (key !== 'key' && !(key in newProps)) hostPatchProp(el, key, oldProps[key], null)
  for (const key in newProps) if (key !== 'key' && newProps[key] !== oldProps[key]) hostPatchProp(el, key, oldProps[key], newProps[key])
}
//#endregion

//#region patchChildren
function patchChildren(n1, n2, container, anchor, parentComponent) {
  const c1 = n1.children
  const c2 = n2.children
  const prev = n1.shapeFlag
  const next = n2.shapeFlag
  if (next & ShapeFlags.TEXT_CHILDREN) {
    if (prev & ShapeFlags.ARRAY_CHILDREN) unmountChildren(c1)
    if (c2 !== c1) hostSetElementText(container, c2)
  } else if (prev & ShapeFlags.ARRAY_CHILDREN) {
    if (next & ShapeFlags.ARRAY_CHILDREN) {
      if (c2.some(c => c.key != null)) patchKeyedChildren(c1, c2, container, anchor, parentComponent)
      else patchUnkeyedChildren(c1, c2, container, anchor, parentComponent)
    } else unmountChildren(c1, true)
  } else {
    if (prev & ShapeFlags.TEXT_CHILDREN) hostSetElementText(container, '')
    if (next & ShapeFlags.ARRAY_CHILDREN) mountChildren(c2, container, anchor, parentComponent)
  }
}
//#endregion

//#region patchUnkeyedChildren
function patchUnkeyedChildren(c1, c2, container, anchor, parentComponent) {
  const common = Math.min(c1.length, c2.length)
  for (let i = 0; i < common; i++) patch(c1[i], c2[i], container, null, parentComponent)   // 按下标一一对比
  if (c1.length > c2.length) unmountChildren(c1, true, common)
  else mountChildren(c2.slice(common), container, anchor, parentComponent)
}
//#endregion

//#region patchKeyedChildren
function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
  let i = 0
  const l2 = c2.length
  let e1 = c1.length - 1
  let e2 = l2 - 1

  //#region syncEnds
  while (i <= e1 && i <= e2 && isSameVNodeType(c1[i], c2[i])) {      // 1. 从头同步
    patch(c1[i], c2[i], container, null, parentComponent)
    i++
  }
  while (i <= e1 && i <= e2 && isSameVNodeType(c1[e1], c2[e2])) {    // 2. 从尾同步
    patch(c1[e1], c2[e2], container, null, parentComponent)
    e1--
    e2--
  }
  //#endregion

  //#region mountOrUnmountRest
  if (i > e1) {                                                      // 3. 旧的比完了：挂载新的剩余部分
    const anchor = e2 + 1 < l2 ? c2[e2 + 1].el : parentAnchor
    while (i <= e2) patch(null, c2[i++], container, anchor, parentComponent)
  } else if (i > e2) {                                               // 4. 新的比完了：卸载旧的剩余部分
    while (i <= e1) unmount(c1[i++], true)
  }
  //#endregion

  if (i <= e1 && i <= e2) patchUnknownSequence(c1, c2, i, e1, e2, container, parentAnchor, parentComponent)
}
//#endregion

//#region patchUnknownSequence
// 5. 头尾都同步完以后，中间 c1[s..e1] 和 c2[s..e2] 乱序的部分
function patchUnknownSequence(c1, c2, s, e1, e2, container, parentAnchor, parentComponent) {
  const l2 = c2.length
  const keyToNewIndex = new Map()                                  // 5.1 新节点的 key → 新下标
  for (let k = s; k <= e2; k++) if (c2[k].key != null) keyToNewIndex.set(c2[k].key, k)

  const toBePatched = e2 - s + 1
  const newIndexToOldIndex = new Array(toBePatched).fill(0)        // 0 表示这个新节点在旧列表里没有
  let moved = false
  let maxNewIndexSoFar = 0
  let patched = 0
  for (let k = s; k <= e1; k++) {                                  // 5.2 遍历旧节点：复用、更新或卸载
    const prevChild = c1[k]
    if (patched >= toBePatched) { unmount(prevChild, true); continue }
    let newIndex
    if (prevChild.key != null) newIndex = keyToNewIndex.get(prevChild.key)
    else {
      for (let j = s; j <= e2; j++) {
        if (newIndexToOldIndex[j - s] === 0 && isSameVNodeType(prevChild, c2[j])) { newIndex = j; break }
      }
    }
    if (newIndex === undefined) unmount(prevChild, true)
    else {
      newIndexToOldIndex[newIndex - s] = k + 1                     // +1：避开 0
      if (newIndex >= maxNewIndexSoFar) maxNewIndexSoFar = newIndex
      else moved = true                                            // 出现了「倒退」：有节点要移动
      patch(prevChild, c2[newIndex], container, null, parentComponent)
      patched++
    }
  }

  const stable = moved ? getSequence(newIndexToOldIndex) : []      // 5.3 最长递增子序列里的节点不用动
  let j = stable.length - 1
  for (let k = toBePatched - 1; k >= 0; k--) {                     // 从后往前，后一个节点已经就位，可以当锚点
    const nextIndex = s + k
    const nextChild = c2[nextIndex]
    const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor
    if (newIndexToOldIndex[k] === 0) patch(null, nextChild, container, anchor, parentComponent)
    else if (moved) {
      if (j < 0 || k !== stable[j]) move(nextChild, container, anchor)
      else j--
    }
  }
}
//#endregion

//#region getSequence
// 最长递增子序列，返回的是下标。arr 里的 0 表示「新增节点」，不参与。
function getSequence(arr) {
  const p = arr.slice()
  const result = [0]
  let i, j, u, v, c
  const len = arr.length
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      if (arr[j] < arrI) { p[i] = j; result.push(i); continue }
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) u = c + 1
        else v = c
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) p[i] = result[u - 1]
        result[u] = i
      }
    }
  }
  u = result.length
  v = result[u - 1]
  while (u-- > 0) { result[u] = v; v = p[v] }
  return result
}
//#endregion

function move(vnode, container, anchor) {
  if (vnode.component) move(vnode.component.subTree, container, anchor)
  else hostInsert(vnode.el, container, anchor)
}

// 卸载一个 vnode。doRemove 为 true 才把它的真实节点从页面拿掉：
// 子节点不用逐个拿，父元素一拿，整棵子树就跟着走了。
function unmount(vnode, doRemove = false) {
  if (vnode.component) return unmountComponent(vnode.component, doRemove)   // 第 31 章补上
  if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) unmountChildren(vnode.children)
  if (doRemove) hostRemove(vnode.el)
}

function unmountChildren(children, doRemove = false, start = 0) {
  for (let i = start; i < children.length; i++) unmount(children[i], doRemove)
}

// 这个 vnode 在页面上最后一个节点的下一个兄弟；用作新节点的插入位置
function getNextHostNode(vnode) {
  return vnode.component ? getNextHostNode(vnode.component.subTree) : hostNextSibling(vnode.el)
}
`
