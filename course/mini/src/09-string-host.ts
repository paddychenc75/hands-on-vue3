// 迷你 Vue 零件 7b：第二套 options，把组件渲染成对象树再序列化成 HTML 字符串（第 32 章）。
export default String.raw`// ===== 零件 7b：字符串渲染器的 options（第 32 章） =====
// 对应真实源码（vuejs/core v3.5.43）：没有直接对应。它和 @vue/server-renderer 不同：
//   server-renderer 直接把组件渲染成字符串，不经过 patch；这里走的是 createRenderer 的 options，
//   用来证明「渲染器本体不依赖 DOM」，对应 runtime-test 包（packages/runtime-test/src/nodeOps.ts）的思路。
// 节点是普通对象：元素 { tag, props, children, parent }，文本 { tag: '#text', text, parent }。
// 和真实实现的差别：只用于演示；转义只处理 & < > "，void 元素只认常见的几个，事件和 false 的属性不输出。
const stringHost = {
  createElement: tag => ({ tag, props: {}, children: [], parent: null }),
  createText: text => ({ tag: '#text', text, parent: null }),
  setText: (node, text) => { node.text = text },
  setElementText: (el, text) => { el.children = [{ tag: '#text', text, parent: el }] },
  insert(child, parent, anchor = null) {
    stringHost.remove(child)
    const i = anchor ? parent.children.indexOf(anchor) : -1
    if (i < 0) parent.children.push(child)
    else parent.children.splice(i, 0, child)
    child.parent = parent
  },
  remove(child) {
    const siblings = child.parent && child.parent.children
    if (siblings) siblings.splice(siblings.indexOf(child), 1)
    child.parent = null
  },
  parentNode: node => node.parent,
  nextSibling(node) {
    const siblings = node.parent.children
    return siblings[siblings.indexOf(node) + 1] || null
  },
  patchProp(el, key, prev, next) {
    if (next == null) delete el.props[key]
    else el.props[key] = next
  }
}

const VOID_TAGS = ['br', 'hr', 'img', 'input', 'meta', 'link']
const escapeHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function serialize(node) {
  if (node.tag === '#text') return escapeHtml(node.text)
  let attrs = ''
  for (const key in node.props) {
    const value = node.props[key]
    if (/^on[A-Z]/.test(key) || value === false) continue
    attrs += value === true ? ' ' + key : ' ' + key + '="' + escapeHtml(value) + '"'
  }
  if (VOID_TAGS.includes(node.tag)) return '<' + node.tag + attrs + '>'
  return '<' + node.tag + attrs + '>' + node.children.map(serialize).join('') + '</' + node.tag + '>'
}
`
