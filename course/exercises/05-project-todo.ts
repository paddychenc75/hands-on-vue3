import type { Exercise } from './types'
import { sub } from './types'
import { nextTick } from 'vue'

// 第 5 章：项目「待办清单」。五道练习是同一个应用的五步：后一步的起始代码 = 前一步的参考答案 + 这一步要写的空位。
// localStorage 的键只在第 5 步用，判题开始和结束时都清掉，不留数据给别的练习。

const KEY = 'hov3-demo:todo-ch5'

// ---------- 判题用的小工具 ----------
const setInput = async (el: any, v: string) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); await nextTick() }
// 真实按键先 keydown 后 keyup：学习者用 @keydown.enter 或 @keyup.enter 都算对
const press = async (el: any, key: string) => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  el.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }))
  await nextTick()
}
const dbl = async (el: any) => { el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await nextTick() }
const textOf = (el: any) => ((el && el.textContent) || '').trim()
/** 根组件的 setupState（第 1 到 4 步的应用直接写在根上） */
const rootState = (T: any): any => {
  const c: any = T.$(':scope > div')
  const inst = c && c._vnode && c._vnode.component
  return inst && inst.setupState
}
const rows = (T: any) => T.$$('li')
const names = (T: any) => rows(T).map((li: any) => textOf(li.querySelector('.text')))
const rowOf = (T: any, name: string) => rows(T).find((li: any) => textOf(li.querySelector('.text')) === name) as any
const leftText = (T: any) => textOf(T.$('.left'))
const isDone = (li: any) => !!li && (!!li.querySelector('.done') || li.classList.contains('done'))

// ---------- 参考答案的各段代码（脚本） ----------
const J_DATA = `const todos = ref([
  { id: 1, text: '读完第 4 章', done: false },
  { id: 2, text: '做一个待办清单', done: false }
])
let nextId = 3   // 下一个可用的 id，只增不减
`
const J_ADD = `
const draft = ref('')
function add() {
  const text = draft.value.trim()
  if (!text) return
  todos.value.push({ id: nextId++, text, done: false })
  draft.value = ''
}
`
const J_RL = `
function remove(id) {
  todos.value = todos.value.filter(t => t.id !== id)
}
const left = computed(() => todos.value.filter(t => !t.done).length)
`
const J_FILTER = `
const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '未完成' },
  { key: 'done', label: '已完成' }
]
const filter = ref('all')
const visible = computed(() => {
  if (filter.value === 'active') return todos.value.filter(t => !t.done)
  if (filter.value === 'done') return todos.value.filter(t => t.done)
  return todos.value
})
`
const J_EDIT = `
const editingId = ref(null)   // 正在编辑的事项的 id，没有时是 null
const editText = ref('')      // 输入框里的草稿，保存之前不动 todo.text
function startEdit(todo) {
  editingId.value = todo.id
  editText.value = todo.text
}
function saveEdit(todo) {
  const text = editText.value.trim()
  if (text) todo.text = text
  editingId.value = null
}
function cancelEdit() {
  editingId.value = null
}
`

// ---------- 参考答案的各段模板 ----------
const T_HEAD = `<h1>待办清单</h1>
<input class="new" v-model="draft" @keyup.enter="add" placeholder="要做什么？">
<button class="add" @click="add">添加</button>
`
const T_ITEM_2 = `  <li v-for="todo in todos" :key="todo.id">
    <input type="checkbox" v-model="todo.done">
    <span class="text" :class="{ done: todo.done }">{{ todo.text }}</span>
    <button class="del" @click="remove(todo.id)">删除</button>
  </li>`
const T_FILTERS = `<div class="filters">
  <button v-for="f in FILTERS" :key="f.key" :class="{ on: filter === f.key }" @click="filter = f.key">{{ f.label }}</button>
</div>
`
const T_ITEM_4 = `  <li v-for="todo in visible" :key="todo.id">
    <template v-if="editingId === todo.id">
      <input class="edit" v-model="editText" @keyup.enter="saveEdit(todo)" @keyup.esc="cancelEdit">
    </template>
    <template v-else>
      <input type="checkbox" v-model="todo.done">
      <span class="text" :class="{ done: todo.done }" @dblclick="startEdit(todo)">{{ todo.text }}</span>
      <button class="del" @click="remove(todo.id)">删除</button>
    </template>
  </li>`
const T_LEFT = `<p class="left">还剩 {{ left }} 项</p>`
const ul = (item: string) => `<ul>\n${item}\n</ul>\n`

// ======================= 第 1 步：添加 =======================
const sol1Tpl = T_HEAD + ul(`  <li v-for="todo in todos" :key="todo.id">\n    <span class="text">{{ todo.text }}</span>\n  </li>`).trimEnd()
const sol1Js = J_DATA + J_ADD + '\nreturn { todos, draft, add }'

export const todoAdd: Exercise = {
  title: '第 1 步：显示事项，添加新事项', ch: 5,
  task: '<p>待办清单的第一步。页面上已经有两条事项（数据在 <code>todos</code> 里）。让用户能添加新事项。</p><ol><li>输入框绑定一个 <code>draft</code> 数据。点击“添加”或在输入框里按回车，都把 draft 加到 <code>todos</code> 末尾。</li><li>加入前去掉首尾空格。空文字（含只有空格）不添加。</li><li>添加成功后清空输入框。</li><li>新事项的 id 用 <code>nextId++</code>，<code>done</code> 是 <code>false</code>。</li></ol><p>这一步的重点是决定数据的形状：事项是对象，不是字符串。后面的每一步都建立在它上面。</p>',
  tpl: `<h1>待办清单</h1>
<input class="new" placeholder="要做什么？">
<button class="add">添加</button>
<ul>
  <li v-for="todo in todos" :key="todo.id">
    <span class="text">{{ todo.text }}</span>
  </li>
</ul>`,
  js: J_DATA + '\n// TODO：draft 保存输入框里的文字；add 把它加到 todos 末尾\n\nreturn { todos }',
  solTpl: sol1Tpl,
  solJs: sol1Js,
  faded: {
    tpl: sub(sub(sol1Tpl, '<input class="new" v-model="draft" @keyup.enter="add"', '<input class="new" v-model="/* ✏️ 绑定哪个数据 */" @keyup.enter="/* ✏️ 回车时做什么 */"'), '<button class="add" @click="add">', '<button class="add" @click="/* ✏️ 点击时做什么 */">'),
    js: sub(sub(sub(sub(sol1Js,
      "const draft = ref('')", "const draft = ref(/* ✏️ 输入框的初始内容 */)"),
      'const text = draft.value.trim()', 'const text = /* ✏️ 去掉首尾空格 */'),
      'if (!text) return', 'if (/* ✏️ 空文字不添加 */) return'),
      "todos.value.push({ id: nextId++, text, done: false })", "todos.value.push(/* ✏️ 新事项：id 用 nextId++，done 为 false */)")
  },
  hints: [
    '两件事：输入框用 v-model 绑定 draft（第 2 章 2.5 节）；add 函数改 todos。todos 是 ref，数组方法 push 要通过 todos.value 调用（第 1 章 1.3 节）。回车用 @keyup.enter（第 2 章 2.4 节）。',
    '脚本：const draft = ref(\'\')。add 里先 const text = draft.value.trim()，text 为空就 return；否则 todos.value.push({ id: nextId++, text, done: false })，最后 draft.value = \'\'。模板：输入框加 v-model="draft" 和 @keyup.enter="add"，按钮加 @click="add"。最后别忘了 return { todos, draft, add }。',
    sol1Js + '\n\n// 模板里：<input class="new" v-model="draft" @keyup.enter="add"> 和 <button class="add" @click="add">'
  ],
  async check(T) {
    const inp: any = T.$('.new'), btn: any = T.$('.add')
    T.ok(rows(T).length === 2, '一开始显示 2 条事项（当前 ' + rows(T).length + ' 条）')
    if (!inp || !btn) { T.ok(false, '页面上要有 class 为 new 的输入框和 class 为 add 的按钮。不要改它们的 class'); return }
    await setInput(inp, '  买牛奶  ')
    await T.click(btn)
    T.ok(rows(T).length === 3, '输入“  买牛奶  ”点“添加”后有 3 条（当前 ' + rows(T).length + ' 条）')
    T.ok(names(T)[2] === '买牛奶', '新事项排在最后，文字是去掉空格的“买牛奶”（当前最后一条：“' + names(T)[2] + '”）')
    T.ok(inp.value === '', '添加后输入框已清空（当前：“' + inp.value + '”）')
    await setInput(inp, '   ')
    await T.click(btn)
    T.ok(rows(T).length === 3, '只有空格时不添加（当前 ' + rows(T).length + ' 条）')
    await setInput(inp, '写作业')
    await press(inp, 'Enter')
    T.ok(rows(T).length === 4 && names(T)[3] === '写作业', '在输入框里按回车也能添加（当前 ' + rows(T).length + ' 条）')
    const st = rootState(T)
    const list: any[] = st && st.todos
    T.ok(Array.isArray(list) && list.every(t => t && typeof t === 'object' && typeof t.id === 'number' && t.done === false), '每条事项是 { id, text, done: false } 形状的对象')
    T.ok(Array.isArray(list) && new Set(list.map(t => t.id)).size === list.length, '每条事项的 id 都不相同')
  },
  wrong: [
    { js: sub(sol1Js, 'const text = draft.value.trim()', 'const text = draft.value'), why: '没有去掉空格。只有空格的输入也被当成有内容，页面上多了一条看不见文字的事项。判断是否为空之前先 trim。', expectFail: /只有空格/ },
    { tpl: sub(sol1Tpl, ' @keyup.enter="add"', ''), why: '只做了点击按钮。用户习惯输入后直接按回车，这时什么也不会发生。', expectFail: /回车/ },
    { js: sub(sol1Js, "  draft.value = ''\n", ''), why: '添加后没有清空 draft。输入框里还留着刚才的文字，用户要先手动删掉才能输入下一条。', expectFail: /清空/ }
  ]
}

// ======================= 第 2 步：切换完成、删除、剩余数量 =======================
const sol2Tpl = T_HEAD + ul(T_ITEM_2) + T_LEFT
const sol2Js = J_DATA + J_ADD + J_RL + '\nreturn { todos, draft, add, remove, left }'

export const todoToggle: Exercise = {
  title: '第 2 步：切换完成、删除、剩余数量', ch: 5,
  task: '<p>在第 1 步的基础上继续。每条事项现在有复选框和“删除”按钮，页面底部有“还剩 N 项”，它们还没有接上数据。</p><ol><li>复选框和事项的 <code>done</code> 双向绑定。已完成的事项，文字（<code>.text</code>）带上 CSS 类 <code>done</code>。</li><li>点击“删除”，按 id 删除这一条。</li><li>“还剩 N 项”显示 <code>done</code> 为 <code>false</code> 的事项数量。勾选或删除后立即变化。</li></ol><p>想一想：“还剩几项”要不要另存一个数字？</p>',
  tpl: T_HEAD + ul(`  <li v-for="todo in todos" :key="todo.id">
    <input type="checkbox">
    <span class="text">{{ todo.text }}</span>
    <button class="del">删除</button>
  </li>`) + '<p class="left">还剩 0 项</p>',
  js: J_DATA + J_ADD + '\n// TODO 1：remove(id)，按 id 删除一条\n// TODO 2：left，还没完成的事项数量\n\nreturn { todos, draft, add }',
  solTpl: sol2Tpl,
  solJs: sol2Js,
  faded: {
    tpl: sub(sub(sub(sol2Tpl, '<input type="checkbox" v-model="todo.done">', '<input type="checkbox" v-model="/* ✏️ 绑定到事项的哪个属性 */">'), ':class="{ done: todo.done }"', ':class="{ done: /* ✏️ 什么时候加 done */ }"'), '@click="remove(todo.id)"', '@click="/* ✏️ 删除这一条 */"'),
    js: sub(sub(sol2Js, 'todos.value = todos.value.filter(t => t.id !== id)', 'todos.value = /* ✏️ 留下 id 不等于它的事项 */'), 'const left = computed(() => todos.value.filter(t => !t.done).length)', 'const left = /* ✏️ 用 computed 算出没完成的数量 */')
  },
  hints: [
    '复选框用 v-model 绑定 todo.done（v-for 的循环变量是对象，可以直接绑定它的属性）。“还剩几项”可以从 todos 算出来，是派生数据，不要另存（第 4 章 4.1 节）。',
    '删除：生成一个不含这一条的新数组赋给 todos.value，用 filter。剩余数量：const left = computed(() => todos.value.filter(t => !t.done).length)。模板：复选框加 v-model="todo.done"，文字加 :class="{ done: todo.done }"，按钮加 @click="remove(todo.id)"，底部写 {{ left }}。别忘了在 return 里加上 remove 和 left。',
    sol2Js
  ],
  async check(T) {
    const boxes = () => T.$$('li input[type=checkbox]') as any[]
    T.ok(/还剩\s*2\s*项/.test(leftText(T)), '一开始显示“还剩 2 项”（当前：“' + leftText(T) + '”）')
    if (!boxes()[0]) { T.ok(false, '每一行要有复选框。不要改模板的结构'); return }
    await T.click(boxes()[0])
    T.ok(isDone(rows(T)[0]), '勾选后，第一条的文字带上 done 类')
    T.ok(/还剩\s*1\s*项/.test(leftText(T)), '勾选一条后显示“还剩 1 项”（当前：“' + leftText(T) + '”）')
    await T.click(boxes()[0])
    T.ok(!isDone(rows(T)[0]) && /还剩\s*2\s*项/.test(leftText(T)), '再点一次取消勾选，done 类去掉，剩余数量回到 2')
    const del = (li: any) => li && li.querySelector('.del')
    await T.click(del(rows(T)[0]))
    T.ok(rows(T).length === 1 && /还剩\s*1\s*项/.test(leftText(T)), '删除第一条后只剩 1 条，“还剩 1 项”（当前 ' + rows(T).length + ' 条，“' + leftText(T) + '”）')
    // 两条文字相同的事项，只删其中一条
    const inp: any = T.$('.new'), add: any = T.$('.add')
    if (!inp || !add) { T.ok(false, '要保留输入框 .new 和按钮 .add'); return }
    for (let i = 0; i < 2; i++) { await setInput(inp, '重复'); await T.click(add) }
    T.ok(names(T).filter(n => n === '重复').length === 2, '添加了两条文字相同的“重复”')
    // 删除后再添加，id 不能重复
    const st = rootState(T)
    const list: any[] = st && st.todos
    T.ok(Array.isArray(list) && new Set(list.map(t => t.id)).size === list.length, '删除后再添加，所有事项的 id 仍然互不相同')
    await T.click(del(rowOf(T, '重复')))
    T.ok(names(T).filter(n => n === '重复').length === 1, '删除其中一条后，另一条还在（按 id 删除，不是按文字）')
  },
  wrong: [
    { js: sub(sol2Js, 'const left = computed(() => todos.value.filter(t => !t.done).length)', 'const left = todos.value.filter(t => !t.done).length'), why: 'left 只在 setup 运行时算了一次，是个普通数字，不是 computed。之后勾选、删除，页面上的数字不变。', expectFail: /还剩 1 项/ },
    { tpl: sub(sol2Tpl, 'remove(todo.id)', 'remove(todo.text)'), js: sub(sol2Js, 't.id !== id', 't.text !== id'), why: '按文字删除。两条文字相同的事项会被一起删掉。id 才是一条事项的身份，所以删除、查找都按 id。', expectFail: /另一条还在/ },
    { js: sub(sol2Js, 'nextId++', 'todos.value.length + 1'), why: '用数组长度当 id。删除一条后长度变短，新的 id 可能和已有的相同（例如 [id=2] 加一条得到 id=2）。key 重复，按 id 操作也会误伤。id 要用只增不减的计数器。', expectFail: /id 仍然互不相同/ }
  ]
}

// ======================= 第 3 步：筛选 =======================
const sol3Tpl = T_HEAD + T_FILTERS + ul(T_ITEM_2.replace('in todos', 'in visible')) + T_LEFT
const sol3Js = J_DATA + J_ADD + J_RL + J_FILTER + '\nreturn { todos, draft, add, remove, left, FILTERS, filter, visible }'

export const todoFilter: Exercise = {
  title: '第 3 步：筛选全部、未完成、已完成', ch: 5,
  task: '<p>在第 2 步的基础上继续。页面上有三个筛选按钮，还没有作用。</p><ol><li>用 <code>filter</code> 记住当前选的是哪个筛选（<code>all</code>、<code>active</code> 或 <code>done</code>）。点击按钮时切换它，当前按钮带 CSS 类 <code>on</code>。</li><li>用 computed <code>visible</code> 算出要显示的事项，列表改为遍历 <code>visible</code>。</li><li>“还剩 N 项”不受筛选影响，永远统计所有事项。</li></ol><p>切换筛选不能删除数据：从“未完成”切回“全部”，所有事项都在。</p>',
  tpl: T_HEAD + `<div class="filters">
  <button v-for="f in FILTERS" :key="f.key">{{ f.label }}</button>
</div>
` + ul(T_ITEM_2) + T_LEFT,
  js: J_DATA + J_ADD + J_RL + `
const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '未完成' },
  { key: 'done', label: '已完成' }
]
// TODO 1：filter，记住当前选的筛选
// TODO 2：visible，按 filter 算出要显示的事项

return { todos, draft, add, remove, left, FILTERS }`,
  solTpl: sol3Tpl,
  solJs: sol3Js,
  faded: {
    tpl: sub(sub(sol3Tpl, ':class="{ on: filter === f.key }" @click="filter = f.key"', ':class="{ on: /* ✏️ 什么时候是当前按钮 */ }" @click="/* ✏️ 点击时记住这个筛选 */"'), 'in visible', 'in /* ✏️ 遍历哪个数据 */'),
    js: sub(sub(sub(sol3Js, "const filter = ref('all')", 'const filter = /* ✏️ 默认选“全部” */'), "if (filter.value === 'active') return todos.value.filter(t => !t.done)", "if (filter.value === 'active') return /* ✏️ 只留没完成的 */"), 'const visible = computed(() => {', 'const visible = /* ✏️ 别忘了 computed */ (() => {')
  },
  hints: [
    '当前选了哪个筛选是一份需要记住的状态，用 ref。要显示哪些事项可以从 todos 和 filter 算出来，是派生数据，用 computed（第 4 章 4.1 节）。不要动 todos 本身。',
    'const filter = ref(\'all\')。const visible = computed(() => { ... })：filter 是 active 时返回 todos.value.filter(t => !t.done)，是 done 时返回 filter(t => t.done)，否则返回 todos.value。模板：按钮加 @click="filter = f.key" 和 :class="{ on: filter === f.key }"，列表 v-for="todo in visible"。',
    sol3Js
  ],
  async check(T) {
    const fbtn = (label: string) => T.$$('.filters button').find((b: any) => textOf(b) === label) as any
    T.ok(rows(T).length === 2, '一开始显示 2 条')
    const boxes = () => T.$$('li input[type=checkbox]') as any[]
    if (!boxes()[0] || !fbtn('未完成') || !fbtn('已完成') || !fbtn('全部')) { T.ok(false, '要保留复选框和三个筛选按钮。不要改模板的结构'); return }
    T.ok(fbtn('全部').classList.contains('on'), '一开始“全部”按钮带 on 类')
    await T.click(boxes()[0])   // 第一条完成
    await T.click(fbtn('未完成'))
    T.ok(names(T).join() === '做一个待办清单', '“未完成”只显示没完成的（当前：' + names(T).join() + '）')
    T.ok(fbtn('未完成').classList.contains('on') && !fbtn('全部').classList.contains('on'), '当前按钮带 on 类，其他的不带')
    T.ok(/还剩\s*1\s*项/.test(leftText(T)), '筛选后“还剩 1 项”不变（当前：“' + leftText(T) + '”）')
    await T.click(fbtn('已完成'))
    T.ok(names(T).join() === '读完第 4 章', '“已完成”只显示完成的（当前：' + names(T).join() + '）')
    T.ok(/还剩\s*1\s*项/.test(leftText(T)), '在“已完成”下，“还剩”仍然统计所有事项（当前：“' + leftText(T) + '”）')
    await T.click(fbtn('全部'))
    T.ok(rows(T).length === 2, '切回“全部”，两条都在：筛选没有删除数据（当前 ' + rows(T).length + ' 条）')
    // 在“未完成”下勾选一条：它立刻从列表消失
    await T.click(fbtn('未完成'))
    await T.click(boxes()[0])
    T.ok(rows(T).length === 0 && /还剩\s*0\s*项/.test(leftText(T)), '在“未完成”下勾选最后一条，列表变空，“还剩 0 项”（当前 ' + rows(T).length + ' 条，“' + leftText(T) + '”）')
    // 在“未完成”下添加：新事项出现
    const inp: any = T.$('.new'), add: any = T.$('.add')
    if (inp && add) { await setInput(inp, '新事项'); await T.click(add) }
    T.ok(names(T).join() === '新事项', '在“未完成”下添加事项，它立刻出现（当前：' + names(T).join() + '）')
  },
  wrong: [
    { js: sub(sol3Js, "const visible = computed(() => {\n  if (filter.value === 'active') return todos.value.filter(t => !t.done)\n  if (filter.value === 'done') return todos.value.filter(t => t.done)\n  return todos.value\n})", "watch(filter, f => {\n  if (f === 'active') todos.value = todos.value.filter(t => !t.done)\n  if (f === 'done') todos.value = todos.value.filter(t => t.done)\n})\nconst visible = computed(() => todos.value)"), why: '筛选时直接改了 todos：把没完成的事项留下，其余的丢掉。再切回“全部”，已完成的事项已经没有了。筛选只是“看哪些”，不能改数据。', expectFail: /只显示完成|切回/ },
    { js: sub(sol3Js, 'const left = computed(() => todos.value.filter(t => !t.done).length)', 'const left = computed(() => visible.value.filter(t => !t.done).length)'), why: '剩余数量从 visible 算，而不是从 todos 算。在“已完成”下 visible 里没有未完成的事项，数字变成 0。剩余数量是所有事项的统计，不受筛选影响。', expectFail: /仍然统计所有事项/ },
    { js: sub(sub(sol3Js, 'const visible = computed(() => {', 'const visible = (() => {'), "  return todos.value\n})", '  return todos.value\n})()'), why: 'visible 只是一个普通数组，在 setup 里算了一次。之后改 filter，列表不会变。派生数据要用 computed，依赖变了才会重新算。', expectFail: /只显示/ }
  ]
}

// ======================= 第 4 步：编辑 =======================
const sol4Tpl = T_HEAD + T_FILTERS + ul(T_ITEM_4) + T_LEFT
const J_RET4 = '\nreturn { todos, draft, add, remove, left, FILTERS, filter, visible, editingId, editText, startEdit, saveEdit, cancelEdit }'
const sol4Js = J_DATA + J_ADD + J_RL + J_FILTER + J_EDIT + J_RET4

export const todoEdit: Exercise = {
  title: '第 4 步：双击编辑，回车保存，Esc 取消', ch: 5,
  task: '<p>在第 3 步的基础上继续。让用户修改一条事项的文字。</p><ol><li>双击事项的文字（<code>.text</code>），这一行变成输入框（<code>.edit</code>），里面是原来的文字。同一时间只有一行在编辑。</li><li>按回车保存：用去掉空格后的文字替换原文字，输入框消失。如果改成空文字，不保存，保留原文字。</li><li>按 Esc 取消：原文字不变，输入框消失。</li></ol><p>关键：输入时先改一个草稿，保存时才写回事项。Esc 才有东西可以“取消”。</p>',
  tpl: T_HEAD + T_FILTERS + ul(T_ITEM_2.replace('in todos', 'in visible')) + T_LEFT,
  js: J_DATA + J_ADD + J_RL + J_FILTER + `
// TODO 1：editingId 记住正在编辑哪一条（没有时是 null），editText 是输入框里的草稿
// TODO 2：startEdit(todo)、saveEdit(todo)、cancelEdit()
// TODO 3：模板里，正在编辑的那一行显示输入框，其他行照旧

return { todos, draft, add, remove, left, FILTERS, filter, visible }`,
  solTpl: sol4Tpl,
  solJs: sol4Js,
  faded: {
    tpl: sub(sub(sub(sol4Tpl, '<template v-if="editingId === todo.id">', '<template v-if="/* ✏️ 什么时候这一行在编辑 */">'), '@keyup.enter="saveEdit(todo)" @keyup.esc="cancelEdit"', '@keyup.enter="/* ✏️ 回车保存 */" @keyup.esc="/* ✏️ Esc 取消 */"'), '@dblclick="startEdit(todo)"', '@dblclick="/* ✏️ 双击进入编辑 */"'),
    js: sub(sub(sub(sol4Js, 'editText.value = todo.text', '/* ✏️ 把原文字放进草稿 */'), 'if (text) todo.text = text', '/* ✏️ 不是空文字才写回事项 */'), 'function cancelEdit() {\n  editingId.value = null\n}', 'function cancelEdit() {\n  /* ✏️ 取消：不改事项，退出编辑 */\n}')
  },
  hints: [
    '需要两份新状态：正在编辑哪一条（editingId），和输入框里的草稿（editText）。模板里用 v-if / v-else 让正在编辑的行显示输入框（第 2 章 2.2 节）。按键用 @keyup.enter 和 @keyup.esc，双击用 @dblclick（第 2 章 2.4 节）。',
    'startEdit(todo)：editingId.value = todo.id; editText.value = todo.text。saveEdit(todo)：先 trim；不是空才 todo.text = text；最后 editingId.value = null。cancelEdit 只把 editingId 设回 null，不碰 todo.text。输入框 v-model="editText"，不要绑定 todo.text。',
    sol4Js + '\n\n// 模板里每一行：<template v-if="editingId === todo.id"><input class="edit" v-model="editText" @keyup.enter="saveEdit(todo)" @keyup.esc="cancelEdit"></template><template v-else> ……原来的内容…… </template>'
  ],
  async check(T) {
    const st = rootState(T)
    const src = () => (st && st.todos ? st.todos.map((t: any) => t.text).join(' | ') : '')
    const edits = () => T.$$('.edit') as any[]
    const text0 = () => T.$$('.text')[0] as any
    if (!text0()) { T.ok(false, '要保留 .text 文字。不要改 class'); return }
    T.ok(edits().length === 0, '一开始没有输入框')
    await dbl(text0())
    T.ok(edits().length === 1 && (edits()[0] as any).value === '读完第 4 章', '双击后出现一个输入框，里面是原文字（当前 ' + edits().length + ' 个输入框）')
    const e: any = edits()[0]
    if (!e) return
    await setInput(e, '读完第 5 章')
    T.ok(src() === '读完第 4 章 | 做一个待办清单', '输入过程中不改事项的数据，保存前原文字还在（当前：' + src() + '）')
    await dbl(T.$$('.text')[0])   // 第二行的文字（第一行现在是输入框）
    T.ok(edits().length === 1, '同一时间只有一行在编辑（当前 ' + edits().length + ' 个输入框）')
    await press(edits()[0], 'Escape')
    T.ok(edits().length === 0 && names(T)[0] === '读完第 4 章', '按 Esc 取消：输入框消失，原文字不变（当前：' + names(T).join(' | ') + '）')
    await dbl(text0())
    await setInput(edits()[0], '  读完第 5 章  ')
    await press(edits()[0], 'Enter')
    T.ok(edits().length === 0 && names(T)[0] === '读完第 5 章', '按回车保存（去掉空格）：输入框消失，文字改为“读完第 5 章”（当前：' + names(T).join(' | ') + '）')
    T.ok(src().startsWith('读完第 5 章'), '数据 todos 里的文字同步改了')
    await dbl(text0())
    await setInput(edits()[0], '   ')
    await press(edits()[0], 'Enter')
    T.ok(edits().length === 0 && names(T)[0] === '读完第 5 章', '改成空文字再回车：不保存，保留原文字（当前：' + names(T).join(' | ') + '）')
    // 编辑不影响筛选和剩余数量
    T.ok(/还剩\s*2\s*项/.test(leftText(T)), '“还剩 2 项”仍然正确')
  },
  wrong: [
    { tpl: sub(sol4Tpl, 'v-model="editText"', 'v-model="todo.text"'), why: '输入框直接绑定 todo.text。每敲一个字就改了数据，保存前原文字就丢了，Esc 也无法取消。编辑要先改草稿，保存时才写回。', expectFail: /保存前原文字还在|取消/ },
    { js: sub(sol4Js, 'if (text) todo.text = text', 'todo.text = text'), why: '没有处理空文字。把文字删光再回车，事项变成一条没有文字的空行，用户很难再点中它。空文字应该保留原文字。', expectFail: /空文字/ },
    { tpl: sub(sol4Tpl, ' @keyup.esc="cancelEdit"', ''), why: '没有监听 Esc。用户按 Esc 之后输入框还在，只能靠回车或再点别处退出。', expectFail: /Esc/ }
  ]
}

// ======================= 第 5 步：持久化 =======================
const J_LOAD = `function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))   // 没有数据时得到 null
    return Array.isArray(saved) ? saved : seed()
  } catch {
    return seed()   // 内容损坏（不是合法 JSON）时，回到示例数据
  }
}
`
const J_SEED5 = `const KEY = '${KEY}'   // 不要修改 key
const seed = () => [
  { id: 1, text: '读完第 4 章', done: false },
  { id: 2, text: '做一个待办清单', done: false }
]
`
const ind = (s: string, n: number) => s.split('\n').map(l => (l ? ' '.repeat(n) + l : l)).join('\n')
const wrapApp = (head: string, body: string, tpl: string) => `${head}
const TodoApp = {
  setup() {
${ind(body.trim(), 4)}
  },
  template: \`
${ind(tpl.trim(), 4)}
  \`
}

// reloads 一变，TodoApp 被销毁、重新创建，setup 重新运行，和刷新页面一样
const reloads = ref(0)
return { reloads, components: { TodoApp } }`
const BODY5_REST = J_ADD + J_RL + J_FILTER + J_EDIT + J_RET4
const body5Sol = `const todos = ref(load())
watch(todos, v => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })   // deep：push、勾选、编辑也触发保存
let nextId = Math.max(0, ...todos.value.map(t => t.id)) + 1   // 接着已有的最大 id 往后
` + BODY5_REST
const body5Start = `const todos = ref(load())
// TODO 2：todos 改变时写回 localStorage
let nextId = Math.max(0, ...todos.value.map(t => t.id)) + 1   // 接着已有的最大 id 往后
` + BODY5_REST
const tpl5Start = `<TodoApp :key="reloads" />
<button class="reload" @click="reloads++">模拟刷新</button>`
const sol5Js = wrapApp(J_SEED5 + '\n' + J_LOAD, body5Sol, sol4Tpl)

export const todoSave: Exercise = {
  title: '第 5 步：用 watch 保存，刷新后恢复', ch: 5,
  task: '<p>在第 4 步的基础上继续。现在刷新页面，事项会回到示例数据。为了在页面里测试“刷新”，整个应用被放进了组件 <code>TodoApp</code>：点击“模拟刷新”会销毁并重新创建它，<code>setup</code> 重新运行，和刷新页面相同。</p><ol><li>TODO 1：<code>todos</code> 先从 <code>localStorage</code> 读取（<code>load()</code> 里写）。没有数据，或内容不是合法的事项数组时，用示例数据 <code>seed()</code>，页面不能报错。</li><li>TODO 2：<code>todos</code> 改变时写回 <code>localStorage</code>。勾选、编辑也要保存。</li><li>新事项的 id 要接着已有的最大 id 往后（已经写好）。</li></ol><p>不要修改 <code>KEY</code>。判题开始和结束时会清掉这个键。</p>',
  tpl: tpl5Start,
  js: wrapApp(J_SEED5 + `
function load() {
  // TODO 1：读取 localStorage；没有数据或内容损坏时返回 seed()
  return seed()
}
`, body5Start, sol4Tpl),
  solTpl: tpl5Start,
  solJs: sol5Js,
  faded: {
    js: sub(sub(sub(sub(sol5Js,
      'const saved = JSON.parse(localStorage.getItem(KEY))   // 没有数据时得到 null', 'const saved = /* ✏️ 读出 KEY 里的内容并解析 */'),
      'return Array.isArray(saved) ? saved : seed()', 'return /* ✏️ 是数组就用它，否则用 seed() */'),
      'return seed()   // 内容损坏（不是合法 JSON）时，回到示例数据', 'return /* ✏️ 解析失败时回到示例数据 */'),
      'watch(todos, v => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })', 'watch(todos, v => localStorage.setItem(KEY, JSON.stringify(v)), { /* ✏️ push、勾选、编辑只改内部，怎样也能触发 */ })')
  },
  hints: [
    '读和写是两件事。读：创建 todos 时，从 localStorage.getItem(KEY) 取出字符串，用 JSON.parse 还原。写：用 watch 在 todos 改变后写回（第 4 章 4.3 节）。添加用 push，勾选和编辑只改事项里的属性，都不是替换整个数组，而侦听 ref 默认只看 .value 有没有被替换，所以 watch 要加 { deep: true }。',
    '读取可能失败：没有数据时 getItem 返回 null；内容损坏时 JSON.parse 抛错。把解析放进 try / catch，失败就返回 seed()；解析出来不是数组也返回 seed()（Array.isArray）。写：watch(todos, v => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })。',
    J_LOAD + '\nconst todos = ref(load())\nwatch(todos, v => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })'
  ],
  async check(T) {
    const reset = () => { try { localStorage.removeItem(KEY) } catch (e) { /* ignore */ } }
    reset()
    try {
      const reload = async () => { await T.click(T.$('.reload')); await T.settle() }
      const fbtn = (label: string) => T.$$('.filters button').find((b: any) => textOf(b) === label) as any
      const addItem = async (s: string) => { await setInput(T.$('.new'), s); await T.click(T.$('.add')) }
      if (!T.$('.reload')) { T.ok(false, '要保留“模拟刷新”按钮'); return }
      await reload()
      T.ok(rows(T).length === 2, '没有保存的数据时显示 2 条示例事项（当前 ' + rows(T).length + ' 条）')
      await addItem('存一下')
      await reload()
      T.ok(names(T).join() === '读完第 4 章,做一个待办清单,存一下', '添加事项并“刷新”后，事项还在（当前：' + names(T).join() + '）')
      await T.click(T.$$('li input[type=checkbox]')[0])
      await reload()
      T.ok(isDone(rows(T)[0]) && /还剩\s*2\s*项/.test(leftText(T)), '勾选一条并“刷新”后，它仍是完成状态（勾选只改 done，也要保存）')
      await addItem('N')
      await T.click((rowOf(T, '存一下') as any).querySelector('.del'))
      T.ok(names(T).join() === '读完第 4 章,做一个待办清单,N', '“刷新”后新添加的事项 id 要接着最大 id 往后：删除“存一下”时不能误删“N”（当前：' + names(T).join() + '）')
      await reload()
      T.ok(names(T).join() === '读完第 4 章,做一个待办清单,N', '删除后“刷新”，删除的结果也保存了（当前：' + names(T).join() + '）')
      await dbl(T.$$('.text')[1])
      await setInput(T.$('.edit'), '改过的')
      await press(T.$('.edit'), 'Enter')
      await reload()
      T.ok(names(T)[1] === '改过的', '编辑并“刷新”后，新文字还在（当前：' + names(T)[1] + '）')
      localStorage.setItem(KEY, '{坏')
      await reload()
      T.ok(rows(T).length === 2, '内容损坏时回到 2 条示例事项，页面不报错（当前 ' + rows(T).length + ' 条）')
      localStorage.setItem(KEY, '{"a":1}')
      await reload()
      T.ok(rows(T).length === 2, '内容是合法 JSON 但不是数组时，也回到示例事项（当前 ' + rows(T).length + ' 条）')
      T.ok(!!fbtn('全部'), '第 3 步的筛选按钮还在')
    } finally {
      reset()
    }
  },
  wrong: [
    { js: sub(sol5Js, '{ deep: true }', '{}'), why: 'watch 没有 deep。侦听一个 ref 时，只有 .value 被替换（例如删除时 filter 出新数组）才触发。添加用 push、勾选和编辑只改内部，都不触发，刷新后这些修改丢了。', expectFail: /事项还在/ },
    { js: sub(sol5Js, 'const todos = ref(load())', 'const todos = ref(seed())'), why: '只写不读。数据确实存进了 localStorage，但创建 todos 时没有读出来，刷新后仍然是示例数据。保存要读写成对。', expectFail: /还在/ },
    { js: sub(sol5Js, 'Math.max(0, ...todos.value.map(t => t.id)) + 1', '3'), why: 'nextId 固定从 3 开始。刷新后已有的事项里可能已经有 id 3，新事项得到重复的 id，删除其中一条会把两条都删掉。读回数据后，nextId 要接着已有的最大 id。', expectFail: /id 要接着/ },
    { js: sub(sub(sol5Js, '  try {\n    const saved', '  {\n    const saved'), '  } catch {\n    return seed()   // 内容损坏（不是合法 JSON）时，回到示例数据\n  }', '  }'), why: '没有 try / catch。localStorage 里的内容可能被别的程序或旧版本写坏，JSON.parse 抛错，整个应用在 setup 里崩掉，用户再也打不开页面。读取外部数据要准备好失败的情况。', expectFail: /内容损坏|示例/ }
  ]
}

