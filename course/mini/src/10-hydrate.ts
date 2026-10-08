// 迷你 Vue 零件 8（可选）：迷你水合（第 36 章）。只支持元素和文本，用 DOM 版的 nodeOps / patchProp。
export default String.raw`// ===== 零件 8：迷你水合（第 36 章，可选） =====
// 对应真实源码（vuejs/core v3.5.43）：packages/runtime-core/src/hydration.ts
//   createHydrationFunctions 里的 hydrateNode、hydrateElement、hydrateChildren
// 和真实实现的差别：
//   不支持组件（真实版在 mountComponent 里把 hydrateNode 接进 setupRenderEffect 的首次渲染）、Fragment、Teleport、Suspense；
//   不比较 attribute 和 class，只比较「标签」和「文字」，数量不一致时按「多的删、少的补」处理；没有 hydration 策略（lazy 等）。
// hydrate(vnode, container) 返回一个数组，记录发现的每一处不匹配：'标签'、'文字'、'缺子节点'、'多子节点'。
//#region hydrate
function hydrate(vnode, container) {
  const mismatches = []
  hydrateNode(container.firstChild, vnode, container, mismatches)
  return mismatches
}

// 让 vnode 接管 node；返回 node 的下一个兄弟，也就是接下来要水合的位置
function hydrateNode(node, vnode, container, mismatches) {
  if (vnode.type === Text) {
    if (!node || node.nodeType !== 3) {                      // 服务器那边没有这个文本
      mismatches.push('缺子节点')
      patch(null, vnode, container, node)
      return node
    }
    if (node.nodeValue !== vnode.children) { mismatches.push('文字'); hostSetText(node, vnode.children) }
    vnode.el = node
    return hostNextSibling(node)
  }
  if (!node) {
    mismatches.push('缺子节点')
    patch(null, vnode, container, null)
    return null
  }
  if (node.nodeType !== 1 || node.nodeName.toLowerCase() !== vnode.type) {   // 标签对不上：整个换成客户端新建的
    mismatches.push('标签')
    const next = hostNextSibling(node)
    hostRemove(node)
    patch(null, vnode, container, next)
    return next
  }
  vnode.el = node                                            // 复用这个元素
  for (const key in vnode.props) if (/^on[A-Z]/.test(key)) hostPatchProp(node, key, null, vnode.props[key])   // 水合只补事件
  if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (node.textContent !== vnode.children) { mismatches.push('文字'); hostSetElementText(node, vnode.children) }
  } else if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    let child = node.firstChild
    for (const c of vnode.children) child = hydrateNode(child, c, node, mismatches)
    while (child) { mismatches.push('多子节点'); const next = hostNextSibling(child); hostRemove(child); child = next }
  }
  return hostNextSibling(node)
}
//#endregion
`
