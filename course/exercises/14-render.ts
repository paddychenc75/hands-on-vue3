import type { Exercise } from './types'
import { h } from 'vue'

export const hListFill: Exercise = {
  title: '补全：用 h() 渲染列表项', ch: 14,
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
    'h(type, props, children) 创建虚拟节点。v-for 写为 map，每一项要有 key。事件写为 on 加首字母大写，例如 onClick。第 14 章开头的 h() 参数说明和 14.2 节的对照表讲了它。',
    '只改 null 这一行。返回 h(\'li\', props对象, t)。props 对象中写 key: t，以及 onClick。onClick 是一个函数，它给 picked.value 赋值 t。',
    "h('li', { key: t, onClick: () => { picked.value = t } }, t)"
  ],
  async check(T) {
    const lis = () => T.$$('ul > li');
    const picked = () => ((T.$('p.picked') || {}).textContent || '').trim();
    T.ok(lis().length === 2, 'ul 中有 2 个 li（当前 ' + lis().length + ' 个）');
    if (lis().length !== 2) return;
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
  title: '用 h() 写渲染函数', ch: 14,
  task: '<ol><li>Heading：渲染 &lt;h{level} class="title"&gt;，内容是默认插槽。</li><li>TagList：渲染 &lt;ul&gt;。items 的每一项是一个 &lt;li&gt;，写 key。</li></ol><p>运行器的参数中没有 h。脚本第一行从全局 Vue 中取出它。</p>',
  tpl: '<Heading :level="level">第 {{ level }} 级标题</Heading>\n<TagList :items="tags" />\n<button @click="level = level % 6 + 1">下一级</button>\n<button @click="tags.push(\'标签\' + (tags.length + 1))">添加</button>',
  js: 'const { h } = Vue   // 从全局 Vue 中取出\n\n// TODO 1：返回 h(\'h\' + props.level, ...)，内容是 slots.default()\nconst Heading = {\n  props: [\'level\'],\n  setup(props, { slots }) {\n    return () => h(\'div\', \'请改写我\')\n  }\n}\n\n// TODO 2：返回 h(\'ul\', ...)，每一项是 h(\'li\', { key }, 文字)\nconst TagList = {\n  props: [\'items\'],\n  setup(props) {\n    return () => h(\'ul\')\n  }\n}\n\nconst level = ref(2)\nconst tags = ref([\'vue\', \'h()\'])\nreturn { level, tags, components: { Heading, TagList } }',
  solJs: 'const { h } = Vue   // 从全局 Vue 中取出\n\nconst Heading = {\n  props: [\'level\'],\n  setup(props, { slots }) {\n    // 在渲染函数内部读取 props.level，level 改变时重新渲染\n    return () => h(\'h\' + props.level, { class: \'title\' }, slots.default?.())\n  }\n}\n\nconst TagList = {\n  props: [\'items\'],\n  setup(props) {\n    return () => h(\'ul\', props.items.map(t => h(\'li\', { key: t }, t)))\n  }\n}\n\nconst level = ref(2)\nconst tags = ref([\'vue\', \'h()\'])\nreturn { level, tags, components: { Heading, TagList } }',
  hints: [
    '渲染函数调用 h(标签, 属性, 子节点)。第 14 章“14.1 在 setup 中返回渲染函数”和“14.2 模板语法的对应写法”讲了它。在返回的函数内部读取 props，否则 props 改变时不重新渲染。',
    '1. Heading：标签是 \'h\' + props.level，属性是 { class: \'title\' }，子节点是 slots.default()。2. TagList：h(\'ul\', …)，子节点用 props.items.map(…) 生成，每个 li 带 key。',
    'Heading：return () => h(\'h\' + props.level, { class: \'title\' }, slots.default?.())\nTagList：return () => h(\'ul\', props.items.map(t => h(\'li\', { key: t }, t)))'
  ],
  async check(T) {
    const h2 = T.$('h2.title');
    T.ok(!!h2, '渲染出 <h2 class="title">');
    T.ok(!!h2 && /第\s*2\s*级标题/.test(h2.textContent), 'h2 的内容是插槽：第 2 级标题');
    T.ok(T.$$('ul > li').length === 2, 'ul 中有 2 个 li（当前 ' + T.$$('ul > li').length + ' 个）');
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
  title: '补全：表格单元格的函数式组件', ch: 14,
  task: '<p>这是第 14.4 节的任务表格。列配置是 JavaScript 数据。有 render 的列用它返回的 VNode 显示，没有 render 的列显示原始字段。只补全两行 TODO。</p><ol><li>TODO 1：写函数式组件 Cell 的返回值。</li><li>TODO 2：操作列的 render 返回一个按钮。文字是“删除”。点击时调用 removeTask(row.id)。</li><li>点击第一行的“删除”。确认其他行的状态徽章没有重新挂载。</li></ol><p>运行器的参数中没有 h。脚本第一行从全局 Vue 中取出它。</p>',
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
    '函数式组件是一个普通函数。它收到 props，返回要显示的内容：VNode 或文字。列配置是 JavaScript 数据，不能写模板，所以用 h() 创建按钮。第 14 章“14.4 函数式组件”的任务表格场景讲了它。',
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
