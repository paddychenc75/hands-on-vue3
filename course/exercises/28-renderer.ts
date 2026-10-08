import type { Exercise } from './types'
import { sub } from './types'

export const rendererInsert: Exercise = {
  title: '修复：插入 B 后，顺序是 A C B', ch: 28,
  task: '<p>脚本用 createRenderer 把组件渲染到一棵普通的 JavaScript 对象树。页面上的文字是这棵树中 item 的顺序。</p><p>现在点击“插入 B”后，顺序是 A C B。原因：diff 挂载 B 时传入 anchor（C），要求插在 C 前面。insert 忽略了 anchor。</p><ol><li>只修改 nodeOps.insert。</li><li>有 anchor 时，把 child 插到 anchor 前面。没有 anchor 时，放到最后。</li></ol>',
  tpl: '<p class="tree">对象树：{{ dump }}</p>\n<button @click="insertB">插入 B</button>\n<button @click="moveC">把 C 移到最前</button>',
  js: `const { createRenderer, h } = Vue   // 从全局 Vue 中取出

// ===== 渲染目标：普通的 JavaScript 对象 =====
function detach(node) {
  if (!node.parent) return
  const list = node.parent.children
  list.splice(list.indexOf(node), 1)
  node.parent = null
}

const nodeOps = {
  createElement: tag => ({ tag, props: {}, children: [], parent: null }),
  createText: text => ({ text, children: [], parent: null }),
  createComment: text => ({ comment: text, children: [], parent: null }),
  setText(node, text) { node.text = text },
  setElementText(el, text) { el.children = [] },
  parentNode: node => node.parent,
  nextSibling(node) {
    const list = node.parent.children
    return list[list.indexOf(node) + 1] || null
  },
  remove: detach,
  patchProp(el, key, prev, next) { el.props[key] = next },
  // TODO：有 anchor 时，把 child 插到 anchor 前面
  insert(child, parent, anchor) {
    detach(child)
    parent.children.push(child)
    child.parent = parent
  }
}

// ===== 已给出：组件和挂载 =====
const items = ref(['A', 'C'])
const List = {
  render: () => h('list', items.value.map(x => h('item', { key: x, name: x })))
}
const root = { tag: 'root', props: {}, children: [], parent: null }
const app = createRenderer(nodeOps).createApp(List)
app.mount(root)
onUnmounted(() => app.unmount())

// 把对象树中 item 的顺序显示为文字
const show = node => node.tag === 'item' ? node.props.name : node.children.map(show).filter(Boolean).join(' ')
const dump = ref(show(root))
async function insertB() {
  items.value = ['A', 'B', 'C']
  await nextTick()
  dump.value = show(root)
}
async function moveC() {
  items.value = ['C', ...items.value.filter(x => x !== 'C')]
  await nextTick()
  dump.value = show(root)
}

return { dump, insertB, moveC }`,
  solJs: `const { createRenderer, h } = Vue   // 从全局 Vue 中取出

// ===== 渲染目标：普通的 JavaScript 对象 =====
function detach(node) {
  if (!node.parent) return
  const list = node.parent.children
  list.splice(list.indexOf(node), 1)
  node.parent = null
}

const nodeOps = {
  createElement: tag => ({ tag, props: {}, children: [], parent: null }),
  createText: text => ({ text, children: [], parent: null }),
  createComment: text => ({ comment: text, children: [], parent: null }),
  setText(node, text) { node.text = text },
  setElementText(el, text) { el.children = [] },
  parentNode: node => node.parent,
  nextSibling(node) {
    const list = node.parent.children
    return list[list.indexOf(node) + 1] || null
  },
  remove: detach,
  patchProp(el, key, prev, next) { el.props[key] = next },
  insert(child, parent, anchor) {
    detach(child)
    const list = parent.children
    const i = anchor ? list.indexOf(anchor) : -1
    if (i === -1) list.push(child)      // 没有 anchor：放到最后
    else list.splice(i, 0, child)       // 有 anchor：插到它前面
    child.parent = parent
  }
}

// ===== 已给出：组件和挂载 =====
const items = ref(['A', 'C'])
const List = {
  render: () => h('list', items.value.map(x => h('item', { key: x, name: x })))
}
const root = { tag: 'root', props: {}, children: [], parent: null }
const app = createRenderer(nodeOps).createApp(List)
app.mount(root)
onUnmounted(() => app.unmount())

// 把对象树中 item 的顺序显示为文字
const show = node => node.tag === 'item' ? node.props.name : node.children.map(show).filter(Boolean).join(' ')
const dump = ref(show(root))
async function insertB() {
  items.value = ['A', 'B', 'C']
  await nextTick()
  dump.value = show(root)
}
async function moveC() {
  items.value = ['C', ...items.value.filter(x => x !== 'C')]
  await nextTick()
  dump.value = show(root)
}

return { dump, insertB, moveC }`,
  hints: [
    '原因：B 应该在 C 前面。diff 挂载 B 时，用第三个参数 anchor 告诉 insert：“插在 C 前面”。现在的 insert 忽略了这个参数，总是把节点放到最后。第 28 章“实验台的工作过程”和第 26 章的 diff 步骤讲了它。',
    '只改 insert。detach 之后：在 parent.children 中找到 anchor 的下标。找到时，用 splice 把 child 放在这个下标；找不到时，用 push。',
    'insert(child, parent, anchor) {\n  detach(child)\n  const list = parent.children\n  const i = anchor ? list.indexOf(anchor) : -1\n  if (i === -1) list.push(child)\n  else list.splice(i, 0, child)\n  child.parent = parent\n}'
  ],
  async check(T) {
    const order = () => ((T.$('.tree') || {}).textContent || '').replace(/^\s*对象树：\s*/, '').trim();
    T.ok(order() === 'A C', '初始顺序是 A C（当前：' + order() + '）');
    const b = T.btn('插入 B'), m = T.btn('移到最前');
    if (!b || !m) { T.ok(false, '找到“插入 B”和“把 C 移到最前”按钮'); return; }
    await T.click(b);
    T.ok(order() === 'A B C', '插入 B 后，顺序是 A B C（当前：' + order() + '）');
    await T.click(T.btn('移到最前'));
    T.ok(order() === 'C A B', '把 C 移到最前后，顺序是 C A B（当前：' + order() + '）');
  }
}

export const fbRenderer: Exercise = {
  title: '补全：自定义渲染器的 patchProp 和 remove', ch: 28,
  task: '<p>脚本用 createRenderer 把组件渲染到一棵普通的 JavaScript 对象树。页面上的文字是树中每个 item 的 name 属性。nodeOps 只差两个函数。</p><ol><li>TODO 1：remove 把节点从父节点中移除。用已给出的 detach。</li><li>TODO 2：patchProp 把新值 next 写到 el.props[key]。</li><li>确认初始显示 A B C，改名后是 A B2 C，删除 B 后是 A C。</li></ol>',
  tpl: '<p class="tree">对象树：{{ dump }}</p>\n<button @click="rename">把 B 改为 B2</button>\n<button @click="removeB">删除 B</button>',
  js: `const { createRenderer, h } = Vue   // 从全局 Vue 中取出

// ===== 渲染目标：普通的 JavaScript 对象 =====
function detach(node) {
  if (!node.parent) return
  const list = node.parent.children
  list.splice(list.indexOf(node), 1)
  node.parent = null
}

const nodeOps = {
  createElement: tag => ({ tag, props: {}, children: [], parent: null }),
  createText: text => ({ text, children: [], parent: null }),
  createComment: text => ({ comment: text, children: [], parent: null }),
  setText(node, text) { node.text = text },
  setElementText(el, text) { el.children = [] },
  parentNode: node => node.parent,
  nextSibling(node) {
    const list = node.parent.children
    return list[list.indexOf(node) + 1] || null
  },
  insert(child, parent, anchor) {   // 本题只在末尾添加，不处理 anchor
    detach(child)
    parent.children.push(child)
    child.parent = parent
  },
  remove(node) {
    // TODO 1：把 node 从父节点中移除
  },
  patchProp(el, key, prev, next) {
    // TODO 2：把新值 next 写到 el.props[key]
  }
}

// ===== 已给出：组件和挂载 =====
const items = ref([{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }])
const List = {
  render: () => h('list', items.value.map(x => h('item', { key: x.id, name: x.name })))
}
const root = { tag: 'root', props: {}, children: [], parent: null }
const app = createRenderer(nodeOps).createApp(List)
app.mount(root)
onUnmounted(() => app.unmount())

// 把对象树中 item 的 name 显示为文字
const show = node => node.tag === 'item' ? node.props.name : node.children.map(show).filter(Boolean).join(' ')
const dump = ref(show(root))
async function rename() {
  items.value[1].name = 'B2'
  await nextTick()
  dump.value = show(root)
}
async function removeB() {
  items.value = items.value.filter(x => x.id !== 2)
  await nextTick()
  dump.value = show(root)
}

return { dump, rename, removeB }`,
  solJs: `const { createRenderer, h } = Vue   // 从全局 Vue 中取出

// ===== 渲染目标：普通的 JavaScript 对象 =====
function detach(node) {
  if (!node.parent) return
  const list = node.parent.children
  list.splice(list.indexOf(node), 1)
  node.parent = null
}

const nodeOps = {
  createElement: tag => ({ tag, props: {}, children: [], parent: null }),
  createText: text => ({ text, children: [], parent: null }),
  createComment: text => ({ comment: text, children: [], parent: null }),
  setText(node, text) { node.text = text },
  setElementText(el, text) { el.children = [] },
  parentNode: node => node.parent,
  nextSibling(node) {
    const list = node.parent.children
    return list[list.indexOf(node) + 1] || null
  },
  insert(child, parent, anchor) {   // 本题只在末尾添加，不处理 anchor
    detach(child)
    parent.children.push(child)
    child.parent = parent
  },
  remove(node) {
    detach(node)
  },
  patchProp(el, key, prev, next) {
    el.props[key] = next
  }
}

// ===== 已给出：组件和挂载 =====
const items = ref([{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }])
const List = {
  render: () => h('list', items.value.map(x => h('item', { key: x.id, name: x.name })))
}
const root = { tag: 'root', props: {}, children: [], parent: null }
const app = createRenderer(nodeOps).createApp(List)
app.mount(root)
onUnmounted(() => app.unmount())

// 把对象树中 item 的 name 显示为文字
const show = node => node.tag === 'item' ? node.props.name : node.children.map(show).filter(Boolean).join(' ')
const dump = ref(show(root))
async function rename() {
  items.value[1].name = 'B2'
  await nextTick()
  dump.value = show(root)
}
async function removeB() {
  items.value = items.value.filter(x => x.id !== 2)
  await nextTick()
  dump.value = show(root)
}

return { dump, rename, removeB }`,
  hints: [
    'runtime-core 不直接操作 DOM。它调用 nodeOps：挂载和修改属性时调用 patchProp，卸载节点时调用 remove。第 28 章开头的分层图和 createRenderer 示例讲了它。',
    'TODO 1：在 remove 中调用 detach，参数是 node。TODO 2：在 patchProp 中写一个赋值语句，左边是 el.props[key]。',
    'remove(node) {\n  detach(node)\n},\npatchProp(el, key, prev, next) {\n  el.props[key] = next\n}'
  ],
  async check(T) {
    const order = () => ((T.$('.tree') || {}).textContent || '').replace(/^\s*对象树：\s*/, '').trim();
    T.ok(order() === 'A B C', '初始对象树是 A B C（当前：' + (order() || '空') + '）');
    const r = T.btn('改为 B2'), d = T.btn('删除 B');
    if (!r || !d) { T.ok(false, '找到“把 B 改为 B2”和“删除 B”按钮'); return; }
    await T.click(r);
    T.ok(order() === 'A B2 C', '改名后，对象树是 A B2 C（当前：' + (order() || '空') + '）');
    await T.click(T.btn('删除 B'));
    T.ok(order() === 'A C', '删除 B 后，对象树是 A C（当前：' + (order() || '空') + '）');
  }
}

// ===== 错误解法（基于参考答案做小改动）=====
rendererInsert.wrong = [
  { js: sub(rendererInsert.solJs, "const i = anchor ? list.indexOf(anchor) : -1\n    if (i === -1) list.push(child)      // 没有 anchor：放到最后\n    else list.splice(i, 0, child)       // 有 anchor：插到它前面", "list.splice(list.indexOf(anchor), 0, child)"), why: '没有处理“没有 anchor”的情况。anchor 是 null 时，indexOf 返回 -1，splice(-1, 0, child) 把节点插到倒数第一个前面，而不是最后。挂载 A C 时顺序就错了。' },
  { js: sub(rendererInsert.solJs, "list.splice(i, 0, child)       // 有 anchor：插到它前面", "list.splice(i + 1, 0, child)   // 插到它后面"), why: 'insert 的约定是“插到 anchor 前面”。这里插到了 anchor 后面，B 出现在 C 后面。' },
  { js: sub(rendererInsert.solJs, "  insert(child, parent, anchor) {\n    detach(child)\n", "  insert(child, parent, anchor) {\n"), why: '插入前没有先把节点从原位置摘下来。“把 C 移到最前”时，C 同时出现在旧位置和新位置。移动节点用的也是 insert。' }
]

fbRenderer.wrong = [
  { js: sub(fbRenderer.solJs, "remove(node) {\n    detach(node)\n  }", "remove(node) {\n    node.parent = null\n  }"), why: '只把 node 的 parent 清空，没有把 node 从父节点的 children 里删掉。对象树里 B 还在。要用 detach。', expectFail: /删除 B 后/ },
  { js: sub(fbRenderer.solJs, "remove(node) {\n    detach(node)\n  }", "remove(node) {\n    node.parent.children.pop()\n  }"), why: '总是删掉最后一个子节点，没有删 node 本身。删的恰好是最后一项时看不出来，删中间的 B 就错了：对象树变成 A B2。', expectFail: /删除 B 后/  },
  { js: sub(fbRenderer.solJs, "el.props[key] = next", "el[key] = next"), why: '把属性写到了 el 本身，不是 el.props。显示用的是 node.props.name，读不到，对象树里每个 item 都是空的。' }
]

// ===== 半成品示例（参考答案挖掉关键处，占位说明做什么）=====
rendererInsert.faded = {
  js: sub(sub(rendererInsert.solJs, 'const i = anchor ? list.indexOf(anchor) : -1',
    'const i = -1   /* ✏️ 有 anchor 时，在 list 里找到它的下标；没有时是 -1 */'),
    'else list.splice(i, 0, child)       // 有 anchor：插到它前面',
    'else list.push(child)   /* ✏️ 有 anchor：在下标 i 处插入 child，不删除任何节点 */')
}

fbRenderer.faded = {
  js: sub(sub(fbRenderer.solJs, 'remove(node) {\n    detach(node)',
    'remove(node) {\n    /* ✏️ 用已给出的 detach，把 node 从父节点摘下来 */'),
    'el.props[key] = next', 'el.props[key] = prev   /* ✏️ 该写入哪个值：旧的还是新的？ */')
}

// ===== 字符串渲染器：nodeOps 操作对象树，最后序列化成 HTML =====
// 头、中间、尾三段拼成脚本；中间是学习者要写的部分。不导出，所以不会被当成练习
const SR_HEAD = `const { createRenderer, h } = Vue   // 从全局 Vue 中取出

// ===== 已给出：节点结构和其余 nodeOps =====
// 元素：{ tag, props, children, parent }；文本：{ text, children, parent }；注释：{ comment, ... }
const VOID = ['img', 'br', 'hr', 'input']   // 空元素：没有子节点，也没有结束标签
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function detach(node) {
  if (!node.parent) return
  const list = node.parent.children
  list.splice(list.indexOf(node), 1)
  node.parent = null
}

const baseOps = {
  createElement: tag => ({ tag, props: {}, children: [], parent: null }),
  createText: text => ({ text, children: [], parent: null }),
  createComment: text => ({ comment: text, children: [], parent: null }),
  setText(node, text) { node.text = text },
  parentNode: node => node.parent,
  nextSibling(node) {
    const list = node.parent.children
    return list[list.indexOf(node) + 1] || null
  },
  insert(child, parent, anchor) {
    detach(child)
    const list = parent.children
    const i = anchor ? list.indexOf(anchor) : -1
    if (i === -1) list.push(child)
    else list.splice(i, 0, child)
    child.parent = parent
  },
  remove: detach
}

// ===== 你来写：两个 nodeOps 和序列化 =====
`
const SR_START = `function setElementText(el, text) {
  // TODO 1：把 text 当作 el 唯一的子节点（文本节点：{ text, children: [], parent: el }）。text 为空字符串表示清空
}

function patchProp(el, key, prev, next) {
  // TODO 2：next 是 null 时删除 el.props[key]，否则把 next 记下来
}

function serialize(node) {
  if (node.comment != null) return '<!--' + node.comment + '-->'
  // TODO 3：文本节点（没有 tag）→ 返回转义后的文字 esc(node.text)
  let attrs = ''
  for (const key in node.props) {
    const v = node.props[key]
    // TODO 4：on 开头的事件不输出；值是 false 不输出；值是 true 只写属性名；其他写成 key="转义后的值"
  }
  // TODO 5：VOID 里的标签只输出开始标签；其他标签输出开始标签 + 子节点 + 结束标签
  return ''
}
`
const SR_SOL = `function setElementText(el, text) {
  el.children = text ? [{ text, children: [], parent: el }] : []
}

function patchProp(el, key, prev, next) {
  if (next == null) delete el.props[key]
  else el.props[key] = next
}

function serialize(node) {
  if (node.comment != null) return '<!--' + node.comment + '-->'
  if (node.tag == null) return esc(node.text)
  let attrs = ''
  for (const key in node.props) {
    const v = node.props[key]
    if (key.startsWith('on') || v === false) continue
    attrs += v === true ? ' ' + key : ' ' + key + '="' + esc(v) + '"'
  }
  if (VOID.includes(node.tag)) return '<' + node.tag + attrs + '>'
  return '<' + node.tag + attrs + '>' + node.children.map(serialize).join('') + '</' + node.tag + '>'
}
`
const SR_TAIL = `
// ===== 已给出：组件、挂载和显示 =====
const nodeOps = { ...baseOps, setElementText, patchProp }
const count = ref(0)
const Card = {
  render: () => h('div', { class: 'card', id: 'c1' }, [
    h('h3', 'Hi'),
    h('p', { title: count.value % 2 ? 'odd' : null }, 'count ' + count.value),
    h('code', '1 < 2'),
    h('button', { disabled: true, hidden: false, onClick: () => count.value++ }, 'go'),
    h('img', { src: 'a.png' })
  ])
}
const root = { tag: 'root', props: {}, children: [], parent: null }
const app = createRenderer(nodeOps).createApp(Card)
app.mount(root)
onUnmounted(() => app.unmount())

const dump = () => root.children.map(serialize).join('')
const html = ref(dump())
async function bump() {
  count.value++
  await nextTick()
  html.value = dump()
}

return { html, bump }`

export const stringRenderer: Exercise = {
  title: '实现：把组件渲染成 HTML 字符串', ch: 28,
  task: '<p>脚本用 <code>createRenderer</code> 把一个组件渲染到一棵普通的对象树，页面上显示的是这棵树序列化出的 HTML。这和 <code>renderToString</code> 做的事一样，只是路径不同：这里走的是 nodeOps 和 patchProp。</p><p>其余 nodeOps 已经给出。你要补三个函数：</p><ol><li><code>setElementText</code>：<code>h(\'p\', \'count 0\')</code> 这样只有文字的子节点，Vue 不创建文本节点，而是调用它。</li><li><code>patchProp</code>：记录属性。<code>next</code> 为 <code>null</code> 时删除。</li><li><code>serialize</code>：把节点树写成字符串。文字要转义；事件和 <code>false</code> 的属性不输出；<code>true</code> 的属性只写名字；空元素没有结束标签。</li></ol><p>确认：初始输出和 <code>renderToString</code> 对同一个组件的输出一致；点“count + 1”后，<code>title</code> 出现，再点一次又消失。</p>',
  tpl: '<pre class="html">{{ html }}</pre>\n<button @click="bump">count + 1</button>',
  js: SR_HEAD + SR_START + SR_TAIL,
  solJs: SR_HEAD + SR_SOL + SR_TAIL,
  hints: [
    '渲染器只负责“把对节点的操作交给你”。所有状态都在你的对象树里：createElement 造对象，insert 放进 children，patchProp 写 props。序列化只是遍历这棵树。第 28 章“28.4 RendererOptions 的每个函数在哪一步被调用”列出了每个函数的调用时机。',
    '三处容易漏：只有文字的子节点走 setElementText，不走 createText；属性被删除时 next 是 null；h(\'img\') 这样的空元素不能写 </img>。先让初始输出对，再点按钮看 title 的出现和消失。',
    SR_SOL
  ],
  async check(T) {
    const E0 = '<div class="card" id="c1"><h3>Hi</h3><p>count 0</p><code>1 &lt; 2</code><button disabled>go</button><img src="a.png"></div>';
    const E1 = E0.replace('<p>count 0</p>', '<p title="odd">count 1</p>');
    const E2 = E0.replace('count 0', 'count 2');
    const get = () => ((T.$('.html') || {}).textContent || '').trim();
    let h0 = get();
    T.ok(h0.indexOf('<h3>Hi</h3>') > -1, '有 <h3>Hi</h3>（当前：' + (h0 || '空') + '）');
    T.ok(h0.indexOf('<p>count 0</p>') > -1, '只有文字的子节点要走 setElementText：有 <p>count 0</p>');
    T.ok(h0.indexOf('title') === -1, 'title 的值是 null，不应该输出 title');
    T.ok(h0.indexOf('&lt;') > -1 && h0.indexOf('1 < 2') === -1, '文字要转义：1 < 2 输出成 1 &lt; 2');
    T.ok(h0.indexOf('onClick') === -1 && h0.indexOf('onclick') === -1, '事件不输出');
    T.ok(h0.indexOf('<button disabled>') > -1, 'true 的属性只写名字：<button disabled>，false 的 hidden 不输出');
    T.ok(h0.indexOf('<img src="a.png">') > -1 && h0.indexOf('</img>') === -1, '空元素 img 只有开始标签');
    T.ok(h0 === E0, '初始输出与 renderToString 一致（当前：' + h0 + '）');
    const b = T.btn('count + 1');
    if (!b) { T.ok(false, '找到“count + 1”按钮'); return; }
    await T.click(b);
    T.ok(get() === E1, '点一次后，p 带 title="odd"，文字是 count 1（当前：' + get() + '）');
    await T.click(T.btn('count + 1'));
    T.ok(get() === E2, '再点一次，title 被删除，文字是 count 2（当前：' + get() + '）');
  }
}

stringRenderer.wrong = [
  { js: sub(stringRenderer.solJs, "  el.children = text ? [{ text, children: [], parent: el }] : []", "  el.text = text"), why: '把文字存到了 el.text，没有放进 children。序列化只遍历 children，文字就丢了。要记住：只有文字的子节点走 setElementText，不会有 createText。', expectFail: /setElementText/ },
  { js: sub(stringRenderer.solJs, "  if (next == null) delete el.props[key]\n  else el.props[key] = next", "  el.props[key] = next"), why: 'next 是 null 时没有删除，只是把值设成 null。第一次挂载 title 就是 null，序列化出 title="null"。属性被移除时 Vue 传的就是 null。', expectFail: /title 的值是 null/ },
  { js: sub(stringRenderer.solJs, "  if (node.tag == null) return esc(node.text)", "  if (node.tag == null) return node.text"), why: '文字没有转义。1 < 2 会原样写进 HTML，浏览器会把 < 当成标签的开头。renderToString 一定会转义文字。', expectFail: /文字要转义/ },
  { js: sub(stringRenderer.solJs, "    if (key.startsWith('on') || v === false) continue\n    attrs += v === true ? ' ' + key : ' ' + key + '=\"' + esc(v) + '\"'", "    if (v === false) continue\n    attrs += ' ' + key + '=\"' + esc(v) + '\"'"), why: '事件处理函数被当成属性输出，true 的属性写成了 disabled="true"。事件只存在于 JavaScript 里，不属于 HTML；布尔属性只写名字。', expectFail: /事件不输出|只写名字/ },
  { js: sub(stringRenderer.solJs, "  if (VOID.includes(node.tag)) return '<' + node.tag + attrs + '>'\n", ""), why: '空元素也写了结束标签，输出 <img src="a.png"></img>。img、br、input 这类元素没有子节点，也不能有结束标签。', expectFail: /空元素 img/ }
]

stringRenderer.faded = {
  js: SR_HEAD + sub(sub(sub(SR_SOL,
    "  el.children = text ? [{ text, children: [], parent: el }] : []",
    "  /* ✏️ 把 text 变成 el 唯一的文本子节点；空字符串表示清空 */"),
    "  if (next == null) delete el.props[key]\n  else el.props[key] = next",
    "  /* ✏️ next 是 null 时删除这个属性，否则记下 next */"),
    "    attrs += v === true ? ' ' + key : ' ' + key + '=\"' + esc(v) + '\"'",
    "    /* ✏️ true 只写名字，其他写成 key=\"转义后的值\" */") + SR_TAIL
}
