// 迷你 Vue 零件 5a：宿主操作（第 30 章先直接用 DOM，第 32 章把它收成 options）。
export default String.raw`// ===== 零件 5a：宿主操作（DOM 版） =====
// 对应真实源码（vuejs/core v3.5.43）：
//   packages/runtime-dom/src/nodeOps.ts   nodeOps：insert、remove、createElement、createText、setText、setElementText、parentNode、nextSibling
//   packages/runtime-dom/src/patchProp.ts patchProp（真实版分 class、style、事件、DOM 属性、HTML attribute 五类）
// 渲染器只通过下面这些函数碰宿主（浏览器或别的东西），名字和真实 renderer.ts 里的 hostInsert 等相同。
// 第 32 章的 createRenderer(options) 里的 options 就是把它们收成的对象。
// 和真实实现的差别：patchProp 只分「事件」和「普通属性」两类，事件没有 invoker（换处理函数要先移除再添加）；不支持 SVG、class / style 的对象写法。
function hostInsert(child, parent, anchor = null) { parent.insertBefore(child, anchor) }
function hostRemove(child) { const parent = child.parentNode; if (parent) parent.removeChild(child) }
function hostCreateElement(tag) { return document.createElement(tag) }
function hostCreateText(text) { return document.createTextNode(text) }
function hostSetText(node, text) { node.nodeValue = text }
function hostSetElementText(el, text) { el.textContent = text }
function hostParentNode(node) { return node.parentNode }
function hostNextSibling(node) { return node.nextSibling }

function hostPatchProp(el, key, prev, next) {
  if (/^on[A-Z]/.test(key)) {
    const name = key.slice(2).toLowerCase()
    if (prev) el.removeEventListener(name, prev)
    if (next) el.addEventListener(name, next)
  } else if (next == null) el.removeAttribute(key)
  else el.setAttribute(key, next)
}

// 第 32 章：收成对象，就是 createRenderer(options) 里的 options：createRenderer({ ...nodeOps, patchProp })
const nodeOps = {
  insert: hostInsert, remove: hostRemove, createElement: hostCreateElement, createText: hostCreateText,
  setText: hostSetText, setElementText: hostSetElementText, parentNode: hostParentNode, nextSibling: hostNextSibling
}
const patchProp = hostPatchProp
`
