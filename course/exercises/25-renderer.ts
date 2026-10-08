import type { Exercise } from './types'
import { sub } from './types'

export const rendererInsert: Exercise = {
  title: '修复：插入 B 后，顺序是 A C B', ch: 25,
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
    '原因：B 应该在 C 前面。diff 挂载 B 时，用第三个参数 anchor 告诉 insert：“插在 C 前面”。现在的 insert 忽略了这个参数，总是把节点放到最后。第 25 章“实验台的工作过程”和第 16 章的 diff 步骤讲了它。',
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
  title: '补全：自定义渲染器的 patchProp 和 remove', ch: 25,
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
    'runtime-core 不直接操作 DOM。它调用 nodeOps：挂载和修改属性时调用 patchProp，卸载节点时调用 remove。第 25 章开头的分层图和 createRenderer 示例讲了它。',
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
