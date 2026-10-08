import type { Exercise } from './types'
import { sub } from './types'
import { h } from 'vue'

// 判题辅助：沿输出区挂载根的 vnode 树，收集满足条件的 vnode（生产构建里也可用 _vnode）
function collectVNodes(T: any, pred: (v: any) => boolean): any[] {
  let el: any = T.$('ul') || T.$('div')
  while (el && !el._vnode) el = el.parentElement
  const out: any[] = []
  const walk = (v: any) => {
    if (!v || typeof v !== 'object') return
    if (Array.isArray(v)) { v.forEach(walk); return }
    if (pred(v)) out.push(v)
    if (v.component) walk(v.component.subTree)
    else walk(v.children)
  }
  walk(el && el._vnode)
  return out
}
export const hListFill: Exercise = {
  title: '补全：用 h() 渲染列表项', ch: 24,
  task: '<p>TagList 用渲染函数显示标签。外层的 div、ul 和“选中”段落已经写好。只补全一行 TODO。</p><ol><li>TODO：为每个 t 返回一个 &lt;li&gt;。写 key。点击时，把 picked 设为 t。li 的文字是 t。</li><li>点击“添加”，列表多一项。点击一个标签，显示“选中：标签名”。</li></ol><p>运行器的参数中没有 h。脚本第一行从全局 Vue 中取出它。</p>',
  tpl: '<TagList :items="tags" />\n<button @click="tags.push(\'标签\' + (tags.length + 1))">添加</button>',
  js: `const { h } = Vue   // 从全局 Vue 中取出

const TagList = {
  props: ['items'],
  setup(props) {
    const picked = ref('')
    // 在渲染函数内部读取 props.items，列表改变时重新渲染
    return () => h('div', [
      h('ul', props.items.map(t =>
        null   // TODO：返回 h('li', …)。写 key 和 onClick
      )),
      h('p', { class: 'picked' }, '选中：' + picked.value)
    ])
  }
}

const tags = ref(['vue', 'h()'])
return { tags, components: { TagList } }`,
  solJs: `const { h } = Vue   // 从全局 Vue 中取出

const TagList = {
  props: ['items'],
  setup(props) {
    const picked = ref('')
    // 在渲染函数内部读取 props.items，列表改变时重新渲染
    return () => h('div', [
      h('ul', props.items.map(t =>
        h('li', { key: t, onClick: () => { picked.value = t } }, t)
      )),
      h('p', { class: 'picked' }, '选中：' + picked.value)
    ])
  }
}

const tags = ref(['vue', 'h()'])
return { tags, components: { TagList } }`,
  hints: [
    'h(type, props, children) 创建虚拟节点。v-for 写为 map，每一项要有 key。事件写为 on 加首字母大写，例如 onClick。第 24 章开头的 h() 参数说明和 24.2 节的对照表讲了它。',
    '只改 null 这一行。返回 h(\'li\', props对象, t)。props 对象中写 key: t，以及 onClick。onClick 是一个函数，它给 picked.value 赋值 t。',
    "h('li', { key: t, onClick: () => { picked.value = t } }, t)"
  ],
  async check(T) {
    const lis = () => T.$$('ul > li');
    const picked = () => ((T.$('p.picked') || {}).textContent || '').trim();
    T.ok(lis().length === 2, 'ul 中有 2 个 li（当前 ' + lis().length + ' 个）');
    if (lis().length !== 2) return;
    const lv = collectVNodes(T, v => v.type === 'li');
    T.ok(lv.length === 2 && lv.every(v => v.key != null), '每个 li 都有 key（当前：' + (lv.map(v => v.key == null ? '无' : v.key).join('、') || '找不到') + '）');
    T.ok(lis()[0].textContent.trim() === 'vue' && lis()[1].textContent.trim() === 'h()', 'li 的文字是标签名：vue、h()');
    await T.click(lis()[1]);
    T.ok(picked() === '选中：h()', '点击“h()”后，显示“选中：h()”（当前：' + picked() + '）');
    const add = T.btn('添加');
    if (!add) { T.ok(false, '找到“添加”按钮'); return; }
    await T.click(add);
    T.ok(lis().length === 3 && lis()[2].textContent.trim() === '标签3', '点击“添加”后有 3 个 li，最后一项是“标签3”');
  }
}

export const renderFn: Exercise = {
  title: '用 h() 写渲染函数', ch: 24,
  task: '<ol><li>Heading：渲染 &lt;h{level} class="title"&gt;，内容是默认插槽。</li><li>TagList：渲染 &lt;ul&gt;。items 的每一项是一个 &lt;li&gt;，写 key。</li></ol><p>运行器的参数中没有 h。脚本第一行从全局 Vue 中取出它。</p>',
  tpl: '<Heading :level="level">第 {{ level }} 级标题</Heading>\n<TagList :items="tags" />\n<button @click="level = level % 6 + 1">下一级</button>\n<button @click="tags.push(\'标签\' + (tags.length + 1))">添加</button>',
  js: 'const { h } = Vue   // 从全局 Vue 中取出\n\n// TODO 1：返回 h(\'h\' + props.level, ...)，内容是 slots.default()\nconst Heading = {\n  props: [\'level\'],\n  setup(props, { slots }) {\n    return () => h(\'div\', \'请改写我\')\n  }\n}\n\n// TODO 2：返回 h(\'ul\', ...)，每一项是 h(\'li\', { key }, 文字)\nconst TagList = {\n  props: [\'items\'],\n  setup(props) {\n    return () => h(\'ul\')\n  }\n}\n\nconst level = ref(2)\nconst tags = ref([\'vue\', \'h()\'])\nreturn { level, tags, components: { Heading, TagList } }',
  solJs: 'const { h } = Vue   // 从全局 Vue 中取出\n\nconst Heading = {\n  props: [\'level\'],\n  setup(props, { slots }) {\n    // 在渲染函数内部读取 props.level，level 改变时重新渲染\n    return () => h(\'h\' + props.level, { class: \'title\' }, slots.default?.())\n  }\n}\n\nconst TagList = {\n  props: [\'items\'],\n  setup(props) {\n    return () => h(\'ul\', props.items.map(t => h(\'li\', { key: t }, t)))\n  }\n}\n\nconst level = ref(2)\nconst tags = ref([\'vue\', \'h()\'])\nreturn { level, tags, components: { Heading, TagList } }',
  hints: [
    '渲染函数调用 h(标签, 属性, 子节点)。第 24 章“24.1 在 setup 中返回渲染函数”和“24.2 模板语法的对应写法”讲了它。在返回的函数内部读取 props，否则 props 改变时不重新渲染。',
    '1. Heading：标签是 \'h\' + props.level，属性是 { class: \'title\' }，子节点是 slots.default()。2. TagList：h(\'ul\', …)，子节点用 props.items.map(…) 生成，每个 li 带 key。',
    'Heading：return () => h(\'h\' + props.level, { class: \'title\' }, slots.default?.())\nTagList：return () => h(\'ul\', props.items.map(t => h(\'li\', { key: t }, t)))'
  ],
  async check(T) {
    const h2 = T.$('h2.title');
    T.ok(!!h2, '渲染出 <h2 class="title">');
    T.ok(!!h2 && /第\s*2\s*级标题/.test(h2.textContent), 'h2 的内容是插槽：第 2 级标题');
    T.ok(T.$$('ul > li').length === 2, 'ul 中有 2 个 li（当前 ' + T.$$('ul > li').length + ' 个）');
    const lv = collectVNodes(T, v => v.type === 'li');
    T.ok(lv.length === 2 && lv.every(v => v.key != null), '每个 li 都有 key（当前：' + (lv.map(v => v.key == null ? '无' : v.key).join('、') || '找不到') + '）');
    const next = T.btn('下一级');
    if (!next) { T.ok(false, '找到“下一级”按钮'); return; }
    await T.click(next);
    T.ok(!!T.$('h3.title') && !T.$('h2.title'), '点击“下一级”后变为 <h3 class="title">');
    await T.click(T.btn('添加'));
    const lis = T.$$('ul > li');
    T.ok(lis.length === 3 && /标签3/.test(lis[2].textContent), '点击“添加”后有 3 个 li，最后一项是“标签3”');
  }
}

export const fnComp: Exercise = {
  title: '补全：表格单元格的函数式组件', ch: 24,
  task: '<p>这是第 24.4 节的任务表格。列配置是 JavaScript 数据。有 render 的列用它返回的 VNode 显示，没有 render 的列显示原始字段。只补全两行 TODO。</p><ol><li>TODO 1：写函数式组件 Cell 的返回值。</li><li>TODO 2：操作列的 render 返回一个按钮。文字是“删除”。点击时调用 removeTask(row.id)。</li><li>点击第一行的“删除”。确认其他行的状态徽章没有重新挂载。</li></ol><p>运行器的参数中没有 h。脚本第一行从全局 Vue 中取出它。</p>',
  tpl: '<TaskTable :rows="tasks" :columns="columns" />',
  js: `const { h } = Vue   // 从全局 Vue 中取出

let seq = 0
const StatusBadge = {
  props: ['status'],
  setup() { return { mountId: ++seq } },   // 每次挂载得到一个新编号
  template: '<span class="badge" :data-mount="mountId">{{ status === \\'done\\' ? \\'已完成\\' : \\'进行中\\' }}</span>'
}

// TODO 1：列有 render 时，返回 col.render(row)；没有时，返回 row[col.key]
const Cell = ({ col, row }) => null
Cell.props = ['col', 'row']

const TaskTable = {
  props: ['rows', 'columns'],
  components: { Cell },
  template: '<table><tr v-for="row in rows" :key="row.id">' +
    '<td v-for="col in columns" :key="col.key" :class="col.key"><Cell :col="col" :row="row" /></td>' +
    '</tr></table>'
}

const tasks = ref([
  { id: 1, title: '写周报', status: 'done' },
  { id: 2, title: '修复登录', status: 'todo' },
  { id: 3, title: '准备分享', status: 'todo' }
])
function removeTask(id) {
  tasks.value = tasks.value.filter(t => t.id !== id)
}

const columns = [
  { key: 'title' },
  { key: 'status', render: row => h(StatusBadge, { status: row.status }) },
  // TODO 2：返回一个按钮。文字是“删除”，点击时调用 removeTask(row.id)
  { key: 'actions', render: row => null }
]

return { tasks, columns, components: { TaskTable } }`,
  solJs: `const { h } = Vue   // 从全局 Vue 中取出

let seq = 0
const StatusBadge = {
  props: ['status'],
  setup() { return { mountId: ++seq } },   // 每次挂载得到一个新编号
  template: '<span class="badge" :data-mount="mountId">{{ status === \\'done\\' ? \\'已完成\\' : \\'进行中\\' }}</span>'
}

const Cell = ({ col, row }) => (col.render ? col.render(row) : row[col.key])   // 没有实例，只返回内容
Cell.props = ['col', 'row']

const TaskTable = {
  props: ['rows', 'columns'],
  components: { Cell },
  template: '<table><tr v-for="row in rows" :key="row.id">' +
    '<td v-for="col in columns" :key="col.key" :class="col.key"><Cell :col="col" :row="row" /></td>' +
    '</tr></table>'
}

const tasks = ref([
  { id: 1, title: '写周报', status: 'done' },
  { id: 2, title: '修复登录', status: 'todo' },
  { id: 3, title: '准备分享', status: 'todo' }
])
function removeTask(id) {
  tasks.value = tasks.value.filter(t => t.id !== id)
}

const columns = [
  { key: 'title' },
  { key: 'status', render: row => h(StatusBadge, { status: row.status }) },
  { key: 'actions', render: row => h('button', { onClick: () => removeTask(row.id) }, '删除') }
]

return { tasks, columns, components: { TaskTable } }`,
  hints: [
    '函数式组件是一个普通函数。它收到 props，返回要显示的内容：VNode 或文字。列配置是 JavaScript 数据，不能写模板，所以用 h() 创建按钮。第 24 章“24.4 函数式组件”的任务表格场景讲了它。',
    'TODO 1：只改 => 后面的 null。用条件运算符：col.render 存在时，返回 col.render(row)；否则返回 row[col.key]。TODO 2：把 null 改为 h(\'button\', 属性对象, \'删除\')。属性对象中写 onClick，它调用 removeTask(row.id)。',
    "const Cell = ({ col, row }) => (col.render ? col.render(row) : row[col.key])\n\n{ key: 'actions', render: row => h('button', { onClick: () => removeTask(row.id) }, '删除') }"
  ],
  wrong: [
    { js: `const { h } = Vue

let seq = 0
const StatusBadge = {
  props: ['status'],
  setup() { return { mountId: ++seq } },
  template: '<span class="badge" :data-mount="mountId">{{ status === \\'done\\' ? \\'已完成\\' : \\'进行中\\' }}</span>'
}

const Cell = ({ col, row }) => col.render(row)
Cell.props = ['col', 'row']

const TaskTable = {
  props: ['rows', 'columns'],
  components: { Cell },
  template: '<table><tr v-for="row in rows" :key="row.id">' +
    '<td v-for="col in columns" :key="col.key" :class="col.key"><Cell :col="col" :row="row" /></td>' +
    '</tr></table>'
}

const tasks = ref([
  { id: 1, title: '写周报', status: 'done' },
  { id: 2, title: '修复登录', status: 'todo' },
  { id: 3, title: '准备分享', status: 'todo' }
])
function removeTask(id) {
  tasks.value = tasks.value.filter(t => t.id !== id)
}

const columns = [
  { key: 'title' },
  { key: 'status', render: row => h(StatusBadge, { status: row.status }) },
  { key: 'actions', render: row => h('button', { onClick: () => removeTask(row.id) }, '删除') }
]

return { tasks, columns, components: { TaskTable } }`, why: '标题列没有 render。col.render(row) 抛出 TypeError。' },
    { js: `const { h } = Vue

let seq = 0
const StatusBadge = {
  props: ['status'],
  setup() { return { mountId: ++seq } },
  template: '<span class="badge" :data-mount="mountId">{{ status === \\'done\\' ? \\'已完成\\' : \\'进行中\\' }}</span>'
}

const TaskTable = {
  props: ['rows', 'columns'],
  template: '<table><tr v-for="row in rows" :key="row.id">' +
    '<td v-for="col in columns" :key="col.key" :class="col.key"><component :is="() => col.render ? col.render(row) : row[col.key]" /></td>' +
    '</tr></table>'
}

const tasks = ref([
  { id: 1, title: '写周报', status: 'done' },
  { id: 2, title: '修复登录', status: 'todo' },
  { id: 3, title: '准备分享', status: 'todo' }
])
function removeTask(id) {
  tasks.value = tasks.value.filter(t => t.id !== id)
}

const columns = [
  { key: 'title' },
  { key: 'status', render: row => h(StatusBadge, { status: row.status }) },
  { key: 'actions', render: row => h('button', { onClick: () => removeTask(row.id) }, '删除') }
]

return { tasks, columns, components: { TaskTable } }`, why: '在模板中写 :is="() => …"：每次渲染都创建新函数。Vue 把它当作新组件，所有单元格卸载并重新挂载。' }
  ],
  async check(T) {
    const rows = () => T.$$('tr');
    const cell = (i, k) => rows()[i] && rows()[i].querySelector('td.' + k);
    const txt = (i, k) => ((cell(i, k) || {}).textContent || '').trim();
    T.ok(rows().length === 3, '表格有 3 行（当前 ' + rows().length + ' 行）');
    if (rows().length !== 3) return;
    T.ok(txt(0, 'title') === '写周报', 'TODO 1：没有 render 的列显示原始字段“写周报”（当前：' + (txt(0, 'title') || '空') + '）');
    T.ok(!!cell(0, 'status').querySelector('.badge') && txt(0, 'status') === '已完成', 'TODO 1：状态列显示徽章“已完成”');
    const btn = cell(0, 'actions').querySelector('button');
    T.ok(!!btn && btn.textContent.trim() === '删除', 'TODO 2：操作列显示“删除”按钮');
    if (!btn || !rows()[1].querySelector('.badge')) return;
    const m2 = rows()[1].querySelector('.badge').dataset.mount;
    await T.click(btn);
    T.ok(rows().length === 2 && txt(0, 'title') === '修复登录', '点击第一行的“删除”后，剩下 2 行，第一行是“修复登录”');
    const b2 = rows()[0] && rows()[0].querySelector('.badge');
    T.ok(!!b2 && b2.dataset.mount === m2, '删除后，“修复登录”的徽章没有重新挂载（挂载编号 ' + m2 + ' → ' + (b2 ? b2.dataset.mount : '无') + '）');
  }
}

// ===== 错误解法（基于参考答案做小改动）=====
hListFill.wrong = [
  { js: sub(hListFill.solJs, "{ key: t, onClick:", "{ onClick:"), why: '没有写 key。页面看起来正常，但 Vue 只能按位置复用 li，没法识别列表项。' },
  { js: sub(hListFill.solJs, "picked.value = t", "picked = t"), why: '在函数里给 ref 赋值时漏了 .value。picked 是 const，赋值会报错，也不会改变显示的文字。' }
]

renderFn.wrong = [
  { js: sub(renderFn.solJs, "h('li', { key: t }, t)", "h('li', t)"), why: 'li 没有 key。界面和答案一样，但 Vue 只能按位置复用 li。' },
  { js: sub(renderFn.solJs, "    // 在渲染函数内部读取 props.level，level 改变时重新渲染\n    return () => h('h' + props.level,", "    const tag = 'h' + props.level   // 在 setup 里读一次\n    return () => h(tag,"), why: '在 setup 中读取 props.level，只读了一次。点击“下一级”后标题级别不变。要在返回的渲染函数内部读取 props。' }
]

// ===== 半成品示例（参考答案挖掉关键处，占位说明做什么）=====
hListFill.faded = {
  js: sub(hListFill.solJs, "h('li', { key: t, onClick: () => { picked.value = t } }, t)",
    "h('li', { /* ✏️ 给每项加 key */ /* ✏️ 点击时把 picked 设为 t */ }, /* ✏️ li 的文字 */)")
}

renderFn.faded = {
  js: sub(sub(renderFn.solJs, "return () => h('h' + props.level, { class: 'title' }, slots.default?.())",
    "return () => h(null /* ✏️ 标签名随 props.level 变化，要在这个函数内部读 */, { class: 'title' }, /* ✏️ 内容是默认插槽 */)"),
    "h('ul', props.items.map(t => h('li', { key: t }, t)))",
    "h('ul', props.items.map(t => /* ✏️ 每项返回一个带 key 的 li */ null))")
}

fnComp.faded = {
  js: sub(sub(fnComp.solJs, "const Cell = ({ col, row }) => (col.render ? col.render(row) : row[col.key])",
    "const Cell = ({ col, row }) => /* ✏️ 列有 render 就用它的返回值，否则显示原始字段 */ null"),
    "render: row => h('button', { onClick: () => removeTask(row.id) }, '删除')",
    "render: row => h('button', { /* ✏️ 点击时删除这一行 */ }, /* ✏️ 按钮文字 */)")
}

// ===== 实现级:简化的 h() =====
const MH_HEAD = `// ===== 已给出:shapeFlag 的位、判断函数、要展示的调用 =====
const ShapeFlags = { ELEMENT: 1, FUNCTIONAL_COMPONENT: 2, STATEFUL_COMPONENT: 4, TEXT_CHILDREN: 8, ARRAY_CHILDREN: 16, SLOTS_CHILDREN: 32 }
const isVNode = v => !!(v && v.__v_isVNode)
const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v)

`
const MH_TAIL = `

// ===== 已给出:用 miniH 创建 vnode,把结果列在表格里 =====
const C = { render() {} }            // 有状态组件(对象)
const F = () => null                 // 函数式组件(函数)
const cases = [
  ["miniH('div')", () => miniH('div')],
  ["miniH('div', 'hi')", () => miniH('div', 'hi')],
  ["miniH('div', { id: 1 })", () => miniH('div', { id: 1 })],
  ["miniH('div', [miniH('p')])", () => miniH('div', [miniH('p')])],
  ["miniH('div', miniH('p'))", () => miniH('div', miniH('p'))],
  ["miniH('div', null, 'a', 'b')", () => miniH('div', null, 'a', 'b')],
  ["miniH('div', null, miniH('p'))", () => miniH('div', null, miniH('p'))],
  ["miniH('div', null, 5)", () => miniH('div', null, 5)],
  ["miniH(C, null, () => 'x')", () => miniH(C, null, () => 'x')],
  ["miniH(C, { a: 1 }, { default: f, foot: g })", () => miniH(C, { a: 1 }, { default: () => 'x', foot: () => 'y' })],
  ["miniH(F, { a: 1 })", () => miniH(F, { a: 1 })],
  ["miniH(C, null, 'text')", () => miniH(C, null, 'text')]
]
const rows = cases.map(([label, make]) => {
  const v = make()
  const c = v.children
  return {
    label, flag: v.shapeFlag, props: v.props == null ? 'null' : JSON.stringify(v.props),
    kids: c == null ? 'none' : typeof c === 'string' ? 'text:' + c : Array.isArray(c) ? 'array:' + c.length : 'slots:' + Object.keys(c).join('+')
  }
})

return { rows }`
const MH_TPL = `<table>
  <tr v-for="r in rows" :key="r.label" class="case">
    <td class="label">{{ r.label }}</td><td class="flag">{{ r.flag }}</td><td class="kids">{{ r.kids }}</td><td class="props">{{ r.props }}</td>
  </tr>
</table>`
const MH_START = `// ===== 要实现:createMiniVNode 和 miniH =====
function createMiniVNode(type, props, children) {
  // TODO 1:按 type 算出类型位:字符串是元素,函数是函数式组件,对象是有状态组件
  let shapeFlag = 0
  const vnode = { __v_isVNode: true, type, props, children: null, shapeFlag }
  // TODO 2:规范化 children,并把子节点位加到 vnode.shapeFlag 上
  //   null:没有子节点;数组:ARRAY_CHILDREN;函数:包成 { default: fn },SLOTS_CHILDREN;
  //   普通对象:当作插槽对象,SLOTS_CHILDREN;其余:转成字符串,TEXT_CHILDREN
  return vnode
}

function miniH(type, propsOrChildren, children) {
  // TODO 3:两个参数时,第二个是普通对象就当 props(但 vnode 要当成只有一个子节点),否则当 children
  //        三个以上参数时,第三个起都是 children;第三个参数是单个 vnode 时包成数组
  return createMiniVNode(type, null, null)
}`
const MH_SOL = `// ===== 要实现:createMiniVNode 和 miniH =====
function createMiniVNode(type, props, children) {
  const shapeFlag = typeof type === 'string' ? ShapeFlags.ELEMENT
    : typeof type === 'function' ? ShapeFlags.FUNCTIONAL_COMPONENT
    : typeof type === 'object' ? ShapeFlags.STATEFUL_COMPONENT : 0
  const vnode = { __v_isVNode: true, type, props, children: null, shapeFlag }
  if (children == null) {
    // 没有子节点
  } else if (Array.isArray(children)) {
    vnode.children = children
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === 'function') {
    vnode.children = { default: children }
    vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
  } else if (typeof children === 'object') {
    vnode.children = children
    vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
  } else {
    vnode.children = String(children)
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  }
  return vnode
}

function miniH(type, propsOrChildren, children) {
  const argc = arguments.length
  if (argc === 2) {
    if (isPlainObject(propsOrChildren)) {
      return isVNode(propsOrChildren)
        ? createMiniVNode(type, null, [propsOrChildren])
        : createMiniVNode(type, propsOrChildren, null)
    }
    return createMiniVNode(type, null, propsOrChildren)
  }
  if (argc > 3) {
    children = Array.prototype.slice.call(arguments, 2)
  } else if (argc === 3 && isVNode(children)) {
    children = [children]
  }
  return createMiniVNode(type, propsOrChildren, children)
}`
const MH_FADED = `// ===== 要实现:createMiniVNode 和 miniH =====
function createMiniVNode(type, props, children) {
  const shapeFlag = typeof type === 'string' ? ShapeFlags.ELEMENT
    : typeof type === 'function' ? /* ✏️ 函数是哪一种组件 */ 0
    : typeof type === 'object' ? ShapeFlags.STATEFUL_COMPONENT : 0
  const vnode = { __v_isVNode: true, type, props, children: null, shapeFlag }
  if (children == null) {
    // 没有子节点
  } else if (Array.isArray(children)) {
    vnode.children = children
    vnode.shapeFlag /* ✏️ 把子节点位加到已有的类型位上,不能覆盖它 */ = ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === 'function') {
    vnode.children = { default: children }
    vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
  } else if (typeof children === 'object') {
    vnode.children = children
    vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
  } else {
    vnode.children = String(children)
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  }
  return vnode
}

function miniH(type, propsOrChildren, children) {
  const argc = arguments.length
  if (argc === 2) {
    if (isPlainObject(propsOrChildren)) {
      return /* ✏️ 第二个参数本身是 vnode 时,它是唯一的子节点 */ false
        ? createMiniVNode(type, null, [propsOrChildren])
        : createMiniVNode(type, propsOrChildren, null)
    }
    return createMiniVNode(type, null, propsOrChildren)
  }
  if (/* ✏️ 什么时候第三个起的所有参数都是 children */ false) {
    children = Array.prototype.slice.call(arguments, 2)
  } else if (argc === 3 && isVNode(children)) {
    children = [children]
  }
  return createMiniVNode(type, propsOrChildren, children)
}`
const MH_EXPECT: Record<string, [string, string, string]> = {
  "miniH('div')": ['1', 'none', 'null'],
  "miniH('div', 'hi')": ['9', 'text:hi', 'null'],
  "miniH('div', { id: 1 })": ['1', 'none', '{"id":1}'],
  "miniH('div', [miniH('p')])": ['17', 'array:1', 'null'],
  "miniH('div', miniH('p'))": ['17', 'array:1', 'null'],
  "miniH('div', null, 'a', 'b')": ['17', 'array:2', 'null'],
  "miniH('div', null, miniH('p'))": ['17', 'array:1', 'null'],
  "miniH('div', null, 5)": ['9', 'text:5', 'null'],
  "miniH(C, null, () => 'x')": ['36', 'slots:default', 'null'],
  "miniH(C, { a: 1 }, { default: f, foot: g })": ['36', 'slots:default+foot', '{"a":1}'],
  "miniH(F, { a: 1 })": ['2', 'none', '{"a":1}'],
  "miniH(C, null, 'text')": ['12', 'text:text', 'null']
}

export const miniH: Exercise = {
  title: '手写一个简化的 h()', ch: 24,
  task: '<p>脚本里的 <code>miniH(type, propsOrChildren, children)</code> 要像真实的 <code>h()</code> 那样创建 vnode。完成 <code>createMiniVNode</code> 和 <code>miniH</code>:</p><ol><li><code>createMiniVNode</code>:按 <code>type</code> 算出类型位(字符串是元素 1,函数是函数式组件 2,对象是有状态组件 4)。再规范化 <code>children</code> 并加上子节点位:文本 8,数组 16,插槽对象 32。函数当作默认插槽,包成 <code>{ default: fn }</code>。</li><li><code>miniH</code>:两个参数时,第二个参数是普通对象就当 props,是 vnode 就当唯一的子节点,否则当 children。三个以上参数时,第三个起都是 children。</li></ol><p>表格列出了 12 个调用的结果。让每一行的 shapeFlag、children 和 props 都和真实 Vue 一致。</p>',
  tpl: MH_TPL,
  js: MH_HEAD + MH_START + MH_TAIL,
  solJs: MH_HEAD + MH_SOL + MH_TAIL,
  faded: { js: MH_HEAD + MH_FADED + MH_TAIL },
  hints: [
    '对照 24.7 和 24.8 节。shapeFlag 是一个整数,每一位表示一个事实:类型位来自 type,子节点位来自 children。两部分用位或(|)合并。',
    'createMiniVNode:先用 typeof type 选出类型位,存进 vnode.shapeFlag;再按 children 的种类设置 vnode.children,并用 vnode.shapeFlag |= … 加上子节点位。miniH:用 arguments.length 区分参数个数。两个参数时,先判断第二个参数是不是普通对象,再判断它是不是 vnode。',
    MH_SOL
  ],
  async check(T) {
    const rows = T.$$('tr.case')
    T.ok(rows.length === 12, '表格有 12 行(当前 ' + rows.length + ' 行)')
    for (const r of rows) {
      const q = (s: string) => (r.querySelector(s)?.textContent || '').trim()
      const label = q('.label')
      const exp = MH_EXPECT[label]
      if (!exp) continue
      T.ok(q('.flag') === exp[0], label + ' 的 shapeFlag 应为 ' + exp[0] + '(当前 ' + q('.flag') + ')')
      T.ok(q('.kids') === exp[1], label + ' 的 children 应为 ' + exp[1] + '(当前 ' + q('.kids') + ')')
      T.ok(q('.props') === exp[2], label + ' 的 props 应为 ' + exp[2] + '(当前 ' + q('.props') + ')')
    }
  },
  wrong: [
    { js: MH_HEAD + MH_SOL.replaceAll('vnode.shapeFlag |= ', 'vnode.shapeFlag = ') + MH_TAIL, why: '用赋值(=)而不是位或(|=)加子节点位,类型位被覆盖。元素带文本子节点得到 8,而不是 1 | 8 = 9。patch 就不知道它是元素了。', expectFail: /shapeFlag/ },
    { js: MH_HEAD + sub(MH_SOL, `      return isVNode(propsOrChildren)
        ? createMiniVNode(type, null, [propsOrChildren])
        : createMiniVNode(type, propsOrChildren, null)`, `      return createMiniVNode(type, propsOrChildren, null)`) + MH_TAIL, why: '第二个参数是对象就当 props,没有排除 vnode。h(\'div\', h(\'p\')) 会把子 vnode 当成 props,children 丢失。', expectFail: /children|shapeFlag/ },
    { js: MH_HEAD + sub(MH_SOL, 'if (argc > 3) {', 'if (false) {') + MH_TAIL, why: '没有处理三个以上参数。h(\'div\', null, \'a\', \'b\') 只取到第一个 children,得到文本 a,而不是两项的数组。', expectFail: /shapeFlag|children/ },
    { js: MH_HEAD + sub(MH_SOL, 'vnode.children = { default: children }', 'vnode.children = children') + MH_TAIL, why: '函数 children 没有包成插槽对象。组件收到的 children 是函数本身,子组件没法按名字取插槽。', expectFail: /children/ }
  ]
}

// ===== 实现级:转发作用域插槽的两个渲染函数组件 =====
const SF_TPL = `<FancyList :items="tasks">
  <template #item="{ item, index }"><b>{{ index + 1 }}. {{ item }} ({{ suffix }})</b></template>
</FancyList>
<TaskList :items="tasks" />
<button @click="tasks.push('任务' + (tasks.length + 1))">添加</button>
<button @click="suffix = suffix === 'A' ? 'B' : 'A'">换后缀</button>`
const SF_START = `const { h } = Vue   // 从全局 Vue 中取出

// TODO 1:TaskList 渲染 <ul>,每一项一个 <li>(写 key)。
//   有 item 插槽时,调用它并传入 { item, index },结果放进 li。
//   没有 item 插槽时,li 里直接显示这一项的文字。
const TaskList = {
  props: ['items'],
  setup(props, { slots }) {
    return () => h('ul')
  }
}

// TODO 2:FancyList 渲染 <div class="fancy">,里面是 TaskList。
//   把 FancyList 自己收到的 item 插槽转发给 TaskList,参数也要原样传下去。
const FancyList = {
  props: ['items'],
  setup(props, { slots }) {
    return () => h('div', { class: 'fancy' })
  }
}

const tasks = ref(['写周报', '修复登录'])
const suffix = ref('A')
return { tasks, suffix, components: { TaskList, FancyList } }`
const SF_SOL = `const { h } = Vue   // 从全局 Vue 中取出

const TaskList = {
  props: ['items'],
  setup(props, { slots }) {
    return () => h('ul', props.items.map((item, index) =>
      h('li', { key: item }, slots.item ? slots.item({ item, index }) : item)
    ))
  }
}

const FancyList = {
  props: ['items'],
  setup(props, { slots }) {
    return () => h('div', { class: 'fancy' }, [
      h(TaskList, { items: props.items }, {
        item: slotProps => slots.item?.(slotProps)   // 参数原样传下去
      })
    ])
  }
}

const tasks = ref(['写周报', '修复登录'])
const suffix = ref('A')
return { tasks, suffix, components: { TaskList, FancyList } }`
const SF_FADED = `const { h } = Vue   // 从全局 Vue 中取出

const TaskList = {
  props: ['items'],
  setup(props, { slots }) {
    return () => h('ul', props.items.map((item, index) =>
      h('li', { key: item }, slots.item ? /* ✏️ 调用 item 插槽,参数是什么 */ item : item)
    ))
  }
}

const FancyList = {
  props: ['items'],
  setup(props, { slots }) {
    return () => h('div', { class: 'fancy' }, [
      h(TaskList, { items: props.items }, {
        item: slotProps => /* ✏️ 调用自己的 item 插槽,把 slotProps 传给它 */ null
      })
    ])
  }
}

const tasks = ref(['写周报', '修复登录'])
const suffix = ref('A')
return { tasks, suffix, components: { TaskList, FancyList } }`

export const scopedSlotForward: Exercise = {
  title: '用渲染函数写接收并转发作用域插槽的组件', ch: 24,
  task: '<p>页面里有两处使用:<code>FancyList</code>(带 <code>item</code> 作用域插槽)和一个没有插槽的 <code>TaskList</code>。只改脚本里两个组件的渲染函数:</p><ol><li><code>TaskList</code>:渲染 <code>ul</code>。每项一个带 key 的 <code>li</code>。有 <code>item</code> 插槽时,调用它并传入 <code>{ item, index }</code>。没有时,li 里显示这一项的文字。</li><li><code>FancyList</code>:渲染 <code>div.fancy</code>,里面是 <code>TaskList</code>。把自己收到的 <code>item</code> 插槽转发给 <code>TaskList</code>。</li></ol><p>期望:<code>.fancy</code> 里的 li 显示“1. 写周报”这样的加粗文字。独立的 <code>TaskList</code> 显示普通文字。点击“添加”后两边都多一行。</p>',
  tpl: SF_TPL,
  js: SF_START,
  solJs: SF_SOL,
  faded: { js: SF_FADED },
  hints: [
    '24.9 节:插槽是函数。子组件调用 slots.item(参数) 得到 vnode,父组件那边的函数用参数渲染内容。转发就是在中间再包一层函数,把参数原样交给下一层。',
    'TaskList:slots.item ? slots.item({ item, index }) : item。FancyList:给 TaskList 的第三个参数写成对象 { item: slotProps => slots.item?.(slotProps) }。注意插槽名是 item,不是 default。',
    SF_SOL
  ],
  async check(T) {
    const fancyLis = () => T.$$('.fancy ul > li')
    const plainLis = () => T.$$('ul').filter(u => !u.closest('.fancy')).flatMap(u => [...u.children])
    const fancyText = () => fancyLis().map(l => (l.textContent || '').trim())
    T.ok(fancyLis().length === 2, '.fancy 里有 2 个 li(当前 ' + fancyLis().length + ' 个)')
    T.ok(fancyText().join('|') === '1. 写周报 (A)|2. 修复登录 (A)', 'FancyList 的 li 显示插槽内容:1. 写周报 (A)、2. 修复登录 (A)(当前:' + fancyText().join('、') + ')')
    T.ok(fancyLis().every(l => l.querySelector('b')), '插槽内容的加粗标签 b 出现在 li 里')
    T.ok(plainLis().map(l => (l.textContent || '').trim()).join('|') === '写周报|修复登录', '没有插槽的 TaskList 显示普通文字(当前:' + plainLis().map(l => (l.textContent || '').trim()).join('、') + ')')
    const add = T.btn('添加')
    if (!add) { T.ok(false, '找到“添加”按钮'); return }
    await T.click(add)
    T.ok(fancyText().join('|') === '1. 写周报 (A)|2. 修复登录 (A)|3. 任务3 (A)', '添加后 FancyList 多一行:3. 任务3 (A)(当前:' + fancyText().join('、') + ')')
    T.ok(plainLis().length === 3, '添加后独立的 TaskList 也是 3 行(当前 ' + plainLis().length + ' 行)')
    const sw = T.btn('换后缀')
    if (!sw) { T.ok(false, '找到“换后缀”按钮'); return }
    await T.click(sw)
    T.ok(fancyText().every(t => t.endsWith('(B)')), '改变插槽里用到的数据后,插槽内容跟着更新(当前:' + fancyText().join('、') + ')')
  },
  wrong: [
    { js: sub(SF_SOL, 'slots.item({ item, index })', 'slots.item(item)'), why: '调用插槽时直接传了 item,而父组件的插槽函数解构的是 { item, index }。参数必须是一个对象,键要和插槽里解构的名字一致。', expectFail: /1\. 写周报/ },
    { js: sub(SF_SOL, `{
        item: slotProps => slots.item?.(slotProps)   // 参数原样传下去
      }`, 'slots.item'), why: '把插槽函数直接当作第三个参数传下去,它被当成了 TaskList 的默认插槽。TaskList 读的是 item 插槽,读不到,所以显示普通文字。', expectFail: /1\. 写周报|加粗/ },
    { js: sub(SF_SOL, 'slots.item ? slots.item({ item, index }) : item', 'slots.item({ item, index })'), why: '没有判断插槽是否存在。独立使用的 TaskList 没有 item 插槽,slots.item 是 undefined,调用它报错。', expectFail: /./ },
    { js: sub(SF_SOL, 'item: slotProps => slots.item?.(slotProps)   // 参数原样传下去', 'item: slots.item?.()'), why: '转发时立刻调用了插槽,而且没有传参数。插槽应该保持为函数,等 TaskList 调用时再带着 { item, index } 运行。', expectFail: /./ }
  ]
}
