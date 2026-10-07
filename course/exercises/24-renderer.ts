import type { Exercise } from './types'

export const rendererInsert: Exercise = {
  title: '修复：插入 B 后，顺序是 A C B', ch: 24,
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
    '原因：B 应该在 C 前面。diff 挂载 B 时，用第三个参数 anchor 告诉 insert：“插在 C 前面”。现在的 insert 忽略了这个参数，总是把节点放到最后。第 24 章“实验台的工作过程”和第 16 章的 diff 步骤讲了它。',
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
  title: '补全：自定义渲染器的 patchProp 和 remove', ch: 24,
  task: '<p>脚本用 createRenderer 把组件渲染到一棵普通的 JavaScript 对象树。页面上的文字是树中每个 item 的 name 属性。nodeOps 只差两个函数。</p><ol><li>TODO 1：remove 把节点从父节点中移除。用已给出的 detach。</li><li>TODO 2：patchProp 把新值 next 写到 el.props[key]。</li><li>确认初始显示 A B C，改名和删除后对象树也改变。</li></ol>',
  tpl: '<p class="tree">对象树：{{ dump }}</p>\n<button @click="rename">把 B 改为 B2</button>\n<button @click="removeC">删除 C</button>',
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
async function removeC() {
  items.value = items.value.filter(x => x.id !== 3)
  await nextTick()
  dump.value = show(root)
}

return { dump, rename, removeC }`,
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
async function removeC() {
  items.value = items.value.filter(x => x.id !== 3)
  await nextTick()
  dump.value = show(root)
}

return { dump, rename, removeC }`,
  hints: [
    'runtime-core 不直接操作 DOM。它调用 nodeOps：挂载和修改属性时调用 patchProp，卸载节点时调用 remove。第 24 章开头的分层图和 createRenderer 示例讲了它。',
    'TODO 1：在 remove 中调用 detach，参数是 node。TODO 2：在 patchProp 中写一个赋值语句，左边是 el.props[key]。',
    'remove(node) {\n  detach(node)\n},\npatchProp(el, key, prev, next) {\n  el.props[key] = next\n}'
  ],
  async check(T) {
    const order = () => ((T.$('.tree') || {}).textContent || '').replace(/^\s*对象树：\s*/, '').trim();
    T.ok(order() === 'A B C', '初始对象树是 A B C（当前：' + (order() || '空') + '）');
    const r = T.btn('改为 B2'), d = T.btn('删除 C');
    if (!r || !d) { T.ok(false, '找到“把 B 改为 B2”和“删除 C”按钮'); return; }
    await T.click(r);
    T.ok(order() === 'A B2 C', '改名后，对象树是 A B2 C（当前：' + (order() || '空') + '）');
    await T.click(T.btn('删除 C'));
    T.ok(order() === 'A B2', '删除 C 后，对象树是 A B2（当前：' + (order() || '空') + '）');
  }
}
