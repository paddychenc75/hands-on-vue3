import type { Exercise } from './types'
import { sub } from './types'
import { nextTick } from 'vue'

// 第 13 章：项目「任务看板」（页面版）。六道练习是同一个应用的六步：后一步的起始代码 = 前一步的参考答案 + 这一步要写的空位。
// 任务的字段名与第 23 章一致：{ id, title, status: 'todo' | 'doing' | 'done', due: 'YYYY-MM-DD' 或 '' }（第 23 章把没有日期改成可选字段 due?）。
// localStorage 的键只在第 6 步用，判题开始和结束时都清掉。弹窗用 Teleport 渲染到 body，所以判题用 document 查弹窗。

const KEY = 'hov3-demo:board-ch13'

// ---------- 判题用的小工具 ----------
const setInput = async (el: any, v: string) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); await nextTick() }
const textOf = (el: any) => ((el && el.textContent) || '').trim()
const modal = (): any => document.querySelector('.modal')
const cardOf = (T: any, title: string): any => T.$$('.card').find((c: any) => textOf(c.querySelector('.title')) === title)
const titlesIn = (T: any, status: string): string[] => {
  const col: any = T.$('.col-' + status)
  return col ? [...col.querySelectorAll('.card')].map((c: any) => textOf(c.querySelector('.title'))) : []
}
const heading = (T: any, status: string) => textOf(T.$('.col-' + status + ' h3'))
const leftText = (T: any) => textOf(T.$('.left'))
/** 等离开过渡结束（过渡中的卡片带 *-leave-* 类） */
const calm = (T: any) => T.waitFor(() => !document.querySelector('[class*="-leave-"]'), 800)
const moveTo = async (T: any, title: string, label: string) => {
  await calm(T)
  const c = cardOf(T, title)
  const b = c && [...c.querySelectorAll('button')].find((x: any) => textOf(x) === '→' + label)
  if (b) await T.click(b)
  await calm(T)
  return !!b
}
const setDue = async (T: any, title: string, v: string) => { await calm(T); const c = cardOf(T, title); const i = c && c.querySelector('.due'); if (i) await setInput(i, v); return !!i }
/** 找带 setupState[key] 的组件实例的 setupState（沿 vnode 树向下找） */
function findState(T: any, key: string): any {
  const c: any = T.$(':scope > div')
  const walk = (vn: any): any => {
    if (!vn) return null
    if (vn.component) {
      const st = vn.component.setupState
      if (st && key in st) return st
      return walk(vn.component.subTree)
    }
    if (Array.isArray(vn.children)) for (const ch of vn.children) { const r = walk(ch); if (r) return r }
    return null
  }
  return walk(c && c._vnode)
}
const MODAL_STYLE = 'position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:rgba(0,0,0,.45)'
const BOX_STYLE = 'background:var(--vp-c-bg,#fff);color:var(--vp-c-text-1,#222);padding:16px;border-radius:8px;min-width:260px'

// ---------- 数据 ----------
const J_DATA = `const COLUMNS = [
  { status: 'todo', label: '待办' },
  { status: 'doing', label: '进行中' },
  { status: 'done', label: '已完成' }
]
const seed = () => [
  { id: 1, title: '读第 12 章', status: 'done', due: '2026-06-01' },
  { id: 2, title: '写 useTasks', status: 'doing', due: '2026-06-10' },
  { id: 3, title: '做任务表单', status: 'todo', due: '' },
  { id: 4, title: '加列表过渡', status: 'todo', due: '2026-06-05' }
]
`
const J_LOAD = `
const KEY = '${KEY}'   // 不要修改 key
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))   // 没有数据时得到 null
    return Array.isArray(saved) ? saved : seed()
  } catch {
    return seed()   // 内容损坏（不是合法 JSON）时，回到示例数据
  }
}
`

// ---------- useTasks ----------
const USE_HEAD = (tasksInit: string, save: string) => `
function useTasks() {
  const tasks = ref(${tasksInit})
${save}  let nextId = Math.max(0, ...tasks.value.map(t => t.id)) + 1
  const lastAction = ref('')   // 最近一次操作，页面上显示它

  function add(title, due = '') {
    title = title.trim()
    if (!title) return null
    const task = { id: nextId++, title, status: 'todo', due }
    tasks.value.push(task)
    lastAction.value = '添加：' + title
    return task
  }
  function remove(id) {
    tasks.value = tasks.value.filter(t => t.id !== id)
    lastAction.value = '删除 #' + id
  }
`
const USE_MOVE_UPDATE = `  function move(id, status) {
    const task = tasks.value.find(t => t.id === id)
    if (task) { task.status = status; lastAction.value = '移动 #' + id + ' → ' + status }
  }
  function update(id, patch) {
    const task = tasks.value.find(t => t.id === id)
    if (task) { Object.assign(task, patch); lastAction.value = '修改 #' + id }
  }
`
const USE_BYSTATUS = `
  // 派生：每一列的任务，按截止日期从早到晚，没有日期的排最后
  const byStatus = computed(() => {
    const LAST = '9999-12-31'
    const out = { todo: [], doing: [], done: [] }
    for (const t of tasks.value) out[t.status].push(t)
    for (const s in out) out[s].sort((a, b) => (a.due || LAST).localeCompare(b.due || LAST))
    return out
  })
  const left = computed(() => tasks.value.filter(t => t.status !== 'done').length)
  return { tasks, byStatus, left, lastAction, add, move, update, remove }
}
`
const USE_START_BLANKS = `  function move(id, status) {
    // TODO 1：找到这条任务，改它的 status，并把 lastAction 设为 '移动 #' + id + ' → ' + status
  }
  function update(id, patch) {
    // TODO 2：找到这条任务，把 patch 里的字段合并进去，并把 lastAction 设为 '修改 #' + id
  }

  // 派生：每一列的任务
  const byStatus = computed(() => {
    // TODO 3：按 status 分成 { todo: [], doing: [], done: [] }。每组按 due 从早到晚排，没有日期的排最后。不要改 tasks 本身
    return { todo: [], doing: [], done: [] }
  })
  const left = computed(() => tasks.value.filter(t => t.status !== 'done').length)
  return { tasks, byStatus, left, lastAction, add, move, update, remove }
}
`
const SAVE6 = `  watch(tasks, v => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })   // deep：增删、移动、改字段都保存
`
const useTasksSol1 = J_DATA + USE_HEAD('seed()', '') + USE_MOVE_UPDATE + USE_BYSTATUS
const useTasksStart1 = J_DATA + USE_HEAD('seed()', '') + USE_START_BLANKS
const useTasksSol6 = J_DATA + J_LOAD + USE_HEAD('load()', SAVE6) + USE_MOVE_UPDATE + USE_BYSTATUS

// ---------- 模板片段 ----------
const BOARD_STYLE = 'display:grid;grid-template-columns:repeat(3,1fr);gap:12px'
const T_STATUS = `<p class="left">还剩 {{ left }} 项</p>
<p class="last-action">最近操作：{{ lastAction || '无' }}</p>
`
const CARD_BODY_EMIT = `      <input type="date" class="due" :value="task.due" @input="$emit('update', task.id, { due: $event.target.value })">
      <button v-for="c in COLUMNS" :key="c.status" v-show="c.status !== task.status" class="move" @click="$emit('move', task.id, c.status)">→{{ c.label }}</button>
      <button class="del" @click="$emit('remove', task.id)">删除</button>`
const ACTIONS_BODY = `<input type="date" class="due" :value="task.due" @input="board.update(task.id, { due: $event.target.value })">
    <button v-for="c in COLUMNS" :key="c.status" v-show="c.status !== task.status" class="move" @click="board.move(task.id, c.status)">→{{ c.label }}</button>
    <button class="del" @click="board.remove(task.id)">删除</button>`
const CARD_STYLE = 'border:1px solid #8886;border-radius:6px;padding:6px;margin:4px 0;display:flex;flex-wrap:wrap;gap:4px;align-items:center'
const UL_STYLE = 'list-style:none;padding:0'

// 第 1 步：看板直接在一个组件里
const B1_TPL = `${T_STATUS}<div class="board" style="${BOARD_STYLE}">
      <section v-for="col in COLUMNS" :key="col.status" class="column" :class="'col-' + col.status">
        <h3>{{ col.label }}（{{ byStatus[col.status].length }}）</h3>
        <ul class="cards" style="${UL_STYLE}">
          <li v-for="task in byStatus[col.status]" :key="task.id" class="card" style="${CARD_STYLE}">
            <span class="title">{{ task.title }}</span>
            <input type="date" class="due" :value="task.due" @input="update(task.id, { due: $event.target.value })">
            <button v-for="c in COLUMNS" :key="c.status" v-show="c.status !== task.status" class="move" @click="move(task.id, c.status)">→{{ c.label }}</button>
            <button class="del" @click="remove(task.id)">删除</button>
          </li>
        </ul>
      </section>
    </div>`
const BOARD1 = `
const Board = {
  setup() {
    const { tasks, byStatus, left, lastAction, move, update, remove } = useTasks()
    return { COLUMNS, tasks, byStatus, left, lastAction, move, update, remove }
  },
  template: \`
    ${B1_TPL}\`
}
`
const TPL_ROOT_1 = '<Board />'
const RETURN_BOARD = `
return { components: { Board } }`

// 第 2 步：Column 和 TaskCard
const COLUMN_SOL = `
const Column = {
  props: { title: String, count: Number },
  template: \`
    <section class="column">
      <h3>{{ title }}（{{ count }}）</h3>
      <slot />
    </section>\`
}
`
const COLUMN_START = COLUMN_SOL.replace('      <slot />\n', '      <!-- TODO 3：放一个插槽，让看板把这一列的任务卡片放进来 -->\n')
const TASKCARD2_SOL = `
const TaskCard = {
  props: { task: { type: Object, required: true } },
  emits: ['move', 'remove', 'update'],
  setup() { return { COLUMNS } },
  template: \`
    <li class="card" style="${CARD_STYLE}">
      <span class="title">{{ task.title }}</span>
${CARD_BODY_EMIT}
    </li>\`
}
`
const TASKCARD2_START = `
// TODO 1：声明 props：task，对象，必填
// TODO 2：声明事件 move、remove、update；再在三处控件上用 $emit 发出它们（参数见下面的 Board 模板）
const TaskCard = {
  props: {},
  emits: [],
  setup() { return { COLUMNS } },
  template: \`
    <li class="card" style="${CARD_STYLE}">
      <span class="title">{{ task.title }}</span>
      <input type="date" class="due" :value="task.due">
      <button v-for="c in COLUMNS" :key="c.status" v-show="c.status !== task.status" class="move">→{{ c.label }}</button>
      <button class="del">删除</button>
    </li>\`
}
`
const B2_TPL = `${T_STATUS}<div class="board" style="${BOARD_STYLE}">
      <Column v-for="col in COLUMNS" :key="col.status" :title="col.label" :count="byStatus[col.status].length" :class="'col-' + col.status">
        <ul class="cards" style="${UL_STYLE}">
          <TaskCard v-for="t in byStatus[col.status]" :key="t.id" :task="t" @move="move" @remove="remove" @update="update" />
        </ul>
      </Column>
    </div>`
const board2 = (tpl: string) => `
const Board = {
  components: { Column, TaskCard },
  setup() {
    const { tasks, byStatus, left, lastAction, move, update, remove } = useTasks()
    return { COLUMNS, tasks, byStatus, left, lastAction, move, update, remove }
  },
  template: \`
    ${tpl}\`
}
`

// 第 3 步：CardActions + provide / inject
const ACTIONS_SOL = `
// 卡片里的操作区。它在 Board → Column → TaskCard → CardActions 的深处
const CardActions = {
  props: { task: { type: Object, required: true } },
  setup() {
    const board = inject('board')
    return { COLUMNS, board }
  },
  template: \`
    ${ACTIONS_BODY}\`
}
`
const ACTIONS_START = `
// 卡片里的操作区。它在 Board → Column → TaskCard → CardActions 的深处
const CardActions = {
  props: { task: { type: Object, required: true } },
  setup() {
    // TODO 2：从祖先注入 'board'，模板里用它调用 move、update、remove
    return { COLUMNS }
  },
  template: \`
    ${ACTIONS_BODY}\`
}
`
const TASKCARD3 = `
const TaskCard = {
  props: { task: { type: Object, required: true } },
  components: { CardActions },
  template: \`
    <li class="card" style="${CARD_STYLE}">
      <span class="title">{{ task.title }}</span>
      <CardActions :task="task" />
    </li>\`
}
`
const B3_TPL = `${T_STATUS}<div class="board" style="${BOARD_STYLE}">
      <Column v-for="col in COLUMNS" :key="col.status" :title="col.label" :count="byStatus[col.status].length" :class="'col-' + col.status">
        <ul class="cards" style="${UL_STYLE}">
          <TaskCard v-for="t in byStatus[col.status]" :key="t.id" :task="t" />
        </ul>
      </Column>
    </div>`
const board3 = (provideLine: string) => `
const Board = {
  components: { Column, TaskCard },
  setup() {
    const { tasks, byStatus, left, lastAction, move, update, remove } = useTasks()
    ${provideLine}
    return { COLUMNS, tasks, byStatus, left, lastAction }
  },
  template: \`
    ${B3_TPL}\`
}
`

// 第 4 步：表单和弹窗
const TASKCARD4 = `
const TaskCard = {
  props: { task: { type: Object, required: true } },
  components: { CardActions },
  setup() {
    const board = inject('board')
    return { board }
  },
  template: \`
    <li class="card" style="${CARD_STYLE}">
      <button class="title" @click="board.edit(task)">{{ task.title }}</button>
      <CardActions :task="task" />
    </li>\`
}
`
const FORM_SOL = (focusDir: string, focusAttr: string) => `
// 新建和编辑共用的表单。task 为 null 时是新建
const TaskForm = {
  props: { task: { type: Object, default: null } },
  emits: ['save', 'cancel'],${focusDir}
  setup(props, { emit }) {
    // 复制一份草稿：输入时改草稿，保存时才交给父组件
    const form = reactive({ title: props.task ? props.task.title : '', due: props.task ? props.task.due : '' })
    const submitted = ref(false)
    const error = computed(() => {
      const t = form.title.trim()
      if (!t) return '请输入标题'
      if (t.length > 20) return '标题最多 20 个字'
      return ''
    })
    function submit() {
      submitted.value = true
      if (error.value) return
      emit('save', { title: form.title.trim(), due: form.due })
    }
    return { form, submitted, error, submit }
  },
  template: \`
    <form class="task-form" @submit.prevent="submit">
      <label>标题 <input class="f-title"${focusAttr} v-model="form.title"></label>
      <p class="error" v-if="submitted && error">{{ error }}</p>
      <label>截止日期 <input type="date" class="f-due" v-model="form.due"></label>
      <button type="submit" class="save">保存</button>
      <button type="button" class="cancel" @click="$emit('cancel')">取消</button>
    </form>\`
}
`
const FORM_START = `
// 新建和编辑共用的表单。task 为 null 时是新建
const TaskForm = {
  props: { task: { type: Object, default: null } },
  emits: ['save', 'cancel'],
  setup(props, { emit }) {
    // 复制一份草稿：输入时改草稿，保存时才交给父组件
    const form = reactive({ title: props.task ? props.task.title : '', due: props.task ? props.task.due : '' })
    const submitted = ref(false)
    // TODO 2：error：标题去掉空格后为空，返回 '请输入标题'；超过 20 个字，返回 '标题最多 20 个字'；否则返回 ''
    const error = computed(() => '')
    function submit() {
      submitted.value = true
      if (error.value) return
      // TODO 3：用 emit 发出 'save'，数据是 { title: 去掉空格的标题, due: 截止日期 }
    }
    return { form, submitted, error, submit }
  },
  // TODO 1：两个输入框用 v-model 绑定到 form.title 和 form.due
  template: \`
    <form class="task-form" @submit.prevent="submit">
      <label>标题 <input class="f-title"></label>
      <p class="error" v-if="submitted && error">{{ error }}</p>
      <label>截止日期 <input type="date" class="f-due"></label>
      <button type="submit" class="save">保存</button>
      <button type="button" class="cancel" @click="$emit('cancel')">取消</button>
    </form>\`
}
`
const MODAL = `<div v-if="editing" class="modal" style="${MODAL_STYLE}">
        <div class="modal-box" style="${BOX_STYLE}">
          <h3>{{ editing === 'new' ? '新建任务' : '编辑任务' }}</h3>
          <TaskForm :task="editing === 'new' ? null : editing" @save="onSave" @cancel="editing = null" />
        </div>
      </div>`
const MODAL_TELEPORT = `<Teleport to="body">
      ${MODAL}
    </Teleport>`
const board4 = (modalTpl: string, list: string) => `
const Board = {
  components: { Column, TaskCard, TaskForm },
  setup() {
    const { tasks, byStatus, left, lastAction, add, move, update, remove } = useTasks()
    const editing = ref(null)   // null：弹窗关闭；'new'：新建；任务对象：编辑它
    function onSave(data) {
      if (editing.value === 'new') add(data.title, data.due)
      else update(editing.value.id, data)
      editing.value = null
    }
    provide('board', { move, update, remove, edit: task => { editing.value = task } })
    return { COLUMNS, tasks, byStatus, left, lastAction, editing, onSave }
  },
  template: \`
    ${T_STATUS}<button class="new" @click="editing = 'new'">新建任务</button>
    <div class="board" style="${BOARD_STYLE}">
      <Column v-for="col in COLUMNS" :key="col.status" :title="col.label" :count="byStatus[col.status].length" :class="'col-' + col.status">
${list}
      </Column>
    </div>
    ${modalTpl}\`
}
`
const LIST_PLAIN = `        <ul class="cards" style="${UL_STYLE}">
          <TaskCard v-for="t in byStatus[col.status]" :key="t.id" :task="t" />
        </ul>`
const LIST_TRANS = `        <TransitionGroup tag="ul" name="card" class="cards" style="${UL_STYLE}">
          <TaskCard v-for="t in byStatus[col.status]" :key="t.id" :task="t" />
        </TransitionGroup>`

// 第 5 步：指令
const FOCUS_SOL = `
// 自定义指令：元素出现在页面上时获得焦点
const vFocus = {
  mounted(el) { el.focus() }
}
`
const FOCUS_START = `
// TODO 1：自定义指令 vFocus：元素出现在页面上时获得焦点
const vFocus = {}
`
const TAIL = `
return { components: { Board } }`

// ---------- 把各段拼成完整脚本 ----------
const sol1Js = useTasksSol1 + BOARD1 + RETURN_BOARD
const start1Js = useTasksStart1 + BOARD1 + RETURN_BOARD

const sol2Js = useTasksSol1 + COLUMN_SOL + TASKCARD2_SOL + board2(B2_TPL) + RETURN_BOARD
const start2Js = useTasksSol1 + COLUMN_START + TASKCARD2_START + board2(B2_TPL) + RETURN_BOARD

const PROVIDE3 = "provide('board', { move, update, remove })"
const sol3Js = useTasksSol1 + COLUMN_SOL + ACTIONS_SOL + TASKCARD3 + board3(PROVIDE3) + RETURN_BOARD
const start3Js = useTasksSol1 + COLUMN_SOL + ACTIONS_START + TASKCARD3 + board3('// TODO 1：用 provide 把 move、update、remove 提供给后代，key 是 \'board\'') + RETURN_BOARD

const sol4Js = useTasksSol1 + COLUMN_SOL + ACTIONS_SOL + TASKCARD4 + FORM_SOL('', '') + board4(MODAL_TELEPORT, LIST_PLAIN) + RETURN_BOARD
const start4Js = useTasksSol1 + COLUMN_SOL + ACTIONS_SOL + TASKCARD4 + FORM_START + board4('<!-- TODO 4：弹窗现在渲染在看板里面。用内置组件把它渲染到 body 下 -->\n    ' + MODAL, LIST_PLAIN) + RETURN_BOARD

const sol5Js = useTasksSol1 + FOCUS_SOL + COLUMN_SOL + ACTIONS_SOL + TASKCARD4 + FORM_SOL("\n  directives: { focus: vFocus },", ' v-focus') + board4(MODAL_TELEPORT, LIST_TRANS) + RETURN_BOARD
const start5Js = useTasksSol1 + FOCUS_START + COLUMN_SOL + ACTIONS_SOL + TASKCARD4 + FORM_SOL("\n  directives: { focus: vFocus },", '') + board4(MODAL_TELEPORT, LIST_PLAIN + '\n        <!-- TODO 3：上面的 ul 换成能给列表项加进入和离开过渡的内置组件 -->') + RETURN_BOARD

const sol6Js = useTasksSol6 + FOCUS_SOL + COLUMN_SOL + ACTIONS_SOL + TASKCARD4 + FORM_SOL("\n  directives: { focus: vFocus },", ' v-focus') + board4(MODAL_TELEPORT, LIST_TRANS) + RETURN_BOARD
const start6Js = sol6Js
  .replace(SAVE6, '  // TODO 2：tasks 改变时写回 localStorage\n')
  .replace(/function load\(\) \{[\s\S]*?\n\}\n/, 'function load() {\n  // TODO 1：读取 localStorage；没有数据、内容损坏或不是数组时返回 seed()\n  return seed()\n}\n')

const TPL_ROOT = '<Board />'
const TPL_ROOT_RELOAD = '<Board :key="reloads" />\n<button class="reload" @click="reloads++">模拟刷新</button>'
const withReload = (js: string) => js.replace('\nreturn { components: { Board } }', '\n// reloads 一变，Board 被销毁、重新创建，useTasks 重新运行，和刷新页面一样\nconst reloads = ref(0)\nreturn { reloads, components: { Board } }')

// ======================= 第 1 步：useTasks =======================
export const boardTasks: Exercise = {
  title: '第 1 步：把任务逻辑写成 useTasks', ch: 13,
  task: '<p>任务看板的第一步：先写数据和逻辑，界面已经写好。任务是 <code>{ id, title, status, due }</code>，<code>status</code> 是 <code>todo</code>、<code>doing</code>、<code>done</code> 之一。<code>useTasks</code> 是一个组合式函数（第 8 章），它拥有任务数据，并返回操作它的函数。<code>add</code>、<code>remove</code>、<code>left</code> 已经写好。补全三处：</p><ol><li>TODO 1：<code>move(id, status)</code>，改任务的 <code>status</code>，并把 <code>lastAction</code> 设为 <code>\'移动 #\' + id + \' → \' + status</code>。</li><li>TODO 2：<code>update(id, patch)</code>，把 <code>patch</code> 里的字段合并进任务，并把 <code>lastAction</code> 设为 <code>\'修改 #\' + id</code>。</li><li>TODO 3：<code>byStatus</code>，把任务分成三列，每列按 <code>due</code> 从早到晚排，没有日期的排最后。不能改 <code>tasks</code> 本身的顺序。</li></ol><p>卡片上的“→进行中”之类按钮调用 <code>move</code>，日期输入框调用 <code>update</code>。</p>',
  tpl: TPL_ROOT_1,
  js: start1Js,
  solTpl: TPL_ROOT_1,
  solJs: sol1Js,
  faded: {
    js: sub(sub(sub(sub(sol1Js,
      "if (task) { task.status = status; lastAction.value = '移动 #' + id + ' → ' + status }", "if (task) { /* ✏️ 改它的 status，并记录 lastAction */ }"),
      "if (task) { Object.assign(task, patch); lastAction.value = '修改 #' + id }", "if (task) { /* ✏️ 把 patch 合并进任务，并记录 lastAction */ }"),
      'for (const t of tasks.value) out[t.status].push(t)', 'for (const t of tasks.value) /* ✏️ 按 status 放进对应的组 */'),
      'out[s].sort((a, b) => (a.due || LAST).localeCompare(b.due || LAST))', 'out[s].sort(/* ✏️ 按 due 比较，空 due 当作 LAST */)')
  },
  hints: [
    'move 和 update 都要先按 id 找到任务：tasks.value.find(t => t.id === id)。byStatus 是派生数据，用 computed（第 4 章 4.1 节）。排序会改数组，所以先放进新数组再排，不要对 tasks.value 调用 sort。',
    'move：task.status = status。update：Object.assign(task, patch)。byStatus：先建 out = { todo: [], doing: [], done: [] }，遍历 tasks.value 按 t.status 放进去；再对每组 sort。比较时把空的 due 换成一个很晚的日期，例如 \'9999-12-31\'；\'2026-06-01\' 这种格式的字符串按字符比较，结果和按日期比较相同。',
    useTasksSol1.slice(useTasksSol1.indexOf('  function move'))
  ],
  async check(T) {
    const st = findState(T, 'byStatus')
    T.ok(T.$$('.column').length === 3, '页面有三列（当前 ' + T.$$('.column').length + ' 列）')
    T.ok(heading(T, 'todo').includes('待办') && heading(T, 'doing').includes('进行中') && heading(T, 'done').includes('已完成'), '三列的标题是待办、进行中、已完成')
    T.ok(titlesIn(T, 'todo').join() === '加列表过渡,做任务表单', '待办列按日期从早到晚，没有日期的排最后（当前：' + titlesIn(T, 'todo').join() + '）')
    T.ok(titlesIn(T, 'doing').join() === '写 useTasks' && titlesIn(T, 'done').join() === '读第 12 章', '进行中、已完成列各有一个任务')
    T.ok(/还剩\s*3\s*项/.test(leftText(T)), '“还剩 3 项”（当前：“' + leftText(T) + '”）')
    T.ok(!!st && Array.isArray(st.tasks) && st.tasks.map((t: any) => t.id).join() === '1,2,3,4', 'byStatus 没有改 tasks 本身的顺序（当前：' + (st && st.tasks ? st.tasks.map((t: any) => t.id).join() : '找不到 tasks') + '）')
    if (!(await moveTo(T, '做任务表单', '进行中'))) { T.ok(false, '每张卡片有“→进行中”之类的移动按钮。不要改模板'); return }
    T.ok(titlesIn(T, 'doing').join() === '写 useTasks,做任务表单', '“做任务表单”移到进行中，排在有日期的“写 useTasks”后面（当前：' + titlesIn(T, 'doing').join() + '）')
    T.ok(titlesIn(T, 'todo').join() === '加列表过渡', '它不再出现在待办列')
    T.ok(/移动/.test(textOf(T.$('.last-action'))), '移动后 lastAction 记录了“移动”（当前：“' + textOf(T.$('.last-action')) + '”）')
    await setDue(T, '做任务表单', '2026-06-01')
    T.ok(titlesIn(T, 'doing').join() === '做任务表单,写 useTasks', '给“做任务表单”填 2026-06-01 后，它排到最前（当前：' + titlesIn(T, 'doing').join() + '）')
    T.ok(!!cardOf(T, '做任务表单') && textOf(T.$('.last-action')).includes('修改'), '更新日期后任务的标题还在，lastAction 记录了“修改”')
    await moveTo(T, '写 useTasks', '已完成')
    T.ok(/还剩\s*2\s*项/.test(leftText(T)), '把一个任务移到已完成后，“还剩 2 项”（当前：“' + leftText(T) + '”）')
    await T.click(cardOf(T, '加列表过渡').querySelector('.del'))
    T.ok(titlesIn(T, 'todo').length === 0 && /还剩\s*1\s*项/.test(leftText(T)), '删除任务后列表和数量都更新（当前待办列 ' + titlesIn(T, 'todo').length + ' 个，“' + leftText(T) + '”）')
  },
  wrong: [
    { js: sub(sol1Js, 'for (const t of tasks.value) out[t.status].push(t)', "tasks.value.sort((a, b) => (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31'))\n    for (const t of tasks.value) out[t.status].push(t)"), why: '在 computed 里直接对 tasks.value 排序。sort 会修改原数组，页面看起来正常，但源数据的顺序被改了，而且 computed 里改自己依赖的数据可能引起重复计算。要先复制到新数组再排。', expectFail: /没有改 tasks|byStatus/ },
    { js: sub(sol1Js, '(a.due || LAST).localeCompare(b.due || LAST)', 'a.due.localeCompare(b.due)'), why: '没有处理空日期。空字符串比任何日期都小，没有日期的任务排到了最前面。', expectFail: /没有日期的排最后/ },
    { js: sub(sol1Js, "Object.assign(task, patch)", "tasks.value = tasks.value.map(t => (t.id === id ? patch : t))"), why: '用 patch 整个替换了任务。patch 只有被改的字段（例如只有 due），任务的 id、标题、状态都丢了。update 要把 patch 合并进原任务。', expectFail: /标题还在/ }
  ]
}

// ======================= 第 2 步：TaskCard 和 Column =======================
export const boardCards: Exercise = {
  title: '第 2 步：拆出 TaskCard 和 Column', ch: 13,
  task: '<p>在第 1 步的基础上继续。现在 <code>Board</code> 一个组件太大了，把它拆开：<code>TaskCard</code> 显示一张卡片，<code>Column</code> 是一列的外框。<code>Board</code> 的模板已经改成使用它们，<code>useTasks</code> 不变。</p><ol><li>TODO 1：<code>TaskCard</code> 声明 props：<code>task</code>，对象，必填。</li><li>TODO 2：声明事件 <code>move</code>、<code>remove</code>、<code>update</code>，并在日期输入框的 <code>input</code>、移动按钮和“删除”按钮上发出：<code>update</code>（参数 id 和 <code>{ due }</code>）、<code>move</code>（参数 id 和目标 status）、<code>remove</code>（参数 id）。</li><li>TODO 3：<code>Column</code> 加一个插槽（第 6 章 6.5 节），看板把这一列的卡片放进去。</li></ol><p>卡片不修改 <code>task</code>。修改数据是 <code>useTasks</code> 的事：页面上的“最近操作”能证明请求走到了 <code>useTasks</code>。</p>',
  tpl: TPL_ROOT,
  js: start2Js,
  solTpl: TPL_ROOT,
  solJs: sol2Js,
  faded: {
    js: sub(sub(sub(sub(sub(sol2Js,
      "props: { task: { type: Object, required: true } },\n  emits: ['move', 'remove', 'update'],", "props: {/* ✏️ 声明 task */},\n  emits: [/* ✏️ 声明三个事件 */],"),
      "@click=\"$emit('remove', task.id)\"", "@click=\"/* ✏️ 通知父组件删除 */\""),
      "@click=\"$emit('move', task.id, c.status)\"", "@click=\"/* ✏️ 通知父组件移动到 c.status */\""),
      "@input=\"$emit('update', task.id, { due: $event.target.value })\"", "@input=\"/* ✏️ 通知父组件修改日期 */\""),
      '      <slot />\n', '      <!-- ✏️ 放一个插槽 -->\n')
  },
  hints: [
    'props 用对象写法声明类型和必填（第 6 章 6.1 节）。emits 列出组件会发出的事件名（第 6 章 6.2 节）。模板里用 $emit(\'事件名\', 参数……)。Column 的 <slot /> 放在标题下面，看板在 <Column>…</Column> 之间写的内容会出现在那里。',
    'TaskCard：props: { task: { type: Object, required: true } }；emits: [\'move\', \'remove\', \'update\']。日期输入框：@input="$emit(\'update\', task.id, { due: $event.target.value })"；移动按钮：@click="$emit(\'move\', task.id, c.status)"；删除：@click="$emit(\'remove\', task.id)"。Column 模板里加 <slot />。',
    TASKCARD2_SOL.trim() + '\n\n// Column 模板：<section class="column"><h3>{{ title }}（{{ count }}）</h3><slot /></section>'
  ],
  async check(T) {
    T.ok(T.$$('.column').length === 3, '页面有三列（当前 ' + T.$$('.column').length + ' 列）')
    T.ok(/待办.*2/.test(heading(T, 'todo')), '待办列的标题显示数量 2（当前：“' + heading(T, 'todo') + '”）')
    T.ok(titlesIn(T, 'todo').join() === '加列表过渡,做任务表单', '卡片出现在各自的列里，待办列按日期排（当前：' + titlesIn(T, 'todo').join() + '）')
    T.ok(T.$$('.card').length === 4, '共 4 张卡片（当前 ' + T.$$('.card').length + ' 张）')
    if (!(await moveTo(T, '做任务表单', '进行中'))) { T.ok(false, '每张卡片有“→进行中”之类的按钮'); return }
    T.ok(titlesIn(T, 'doing').includes('做任务表单') && !titlesIn(T, 'todo').includes('做任务表单'), '点移动按钮后，卡片移到进行中')
    T.ok(/移动/.test(textOf(T.$('.last-action'))), '“最近操作”记录了“移动”：卡片是通过事件让 useTasks 改数据的，不是自己改 task（当前：“' + textOf(T.$('.last-action')) + '”）')
    T.ok(/待办.*1/.test(heading(T, 'todo')), '待办列的数量变为 1（当前：“' + heading(T, 'todo') + '”）')
    await setDue(T, '做任务表单', '2026-06-01')
    T.ok(titlesIn(T, 'doing')[0] === '做任务表单' && textOf(T.$('.last-action')).includes('修改'), '改日期后卡片在列内重新排序，“最近操作”记录“修改”')
    await T.click(cardOf(T, '加列表过渡').querySelector('.del'))
    T.ok(!cardOf(T, '加列表过渡') && /删除/.test(textOf(T.$('.last-action'))), '“删除”后卡片消失，“最近操作”记录“删除”')
  },
  wrong: [
    { js: sub(sol2Js, '      <slot />\n', ''), why: 'Column 没有插槽。看板在 <Column> 里面写的卡片没有地方显示，三列都是空的。子组件要用 <slot /> 声明放内容的位置。', expectFail: /卡片|共 4 张/ },
    { js: sub(sol2Js, "@click=\"$emit('move', task.id, c.status)\"", "@click=\"task.status = c.status\""), why: '卡片直接改了 props 里的 task.status。页面上看起来一样（因为对象是共享的），但这破坏了单向数据流：数据的所有者是 useTasks，改数据的逻辑（记录最近操作、将来的保存）绕过了它。卡片只发事件。', expectFail: /最近操作/ },
    { js: sub(sub(sol2Js, "$emit('move',", "$emit('moved',"), "emits: ['move', 'remove', 'update']", "emits: ['moved', 'remove', 'update']"), why: '事件名不一致。Board 监听 @move，卡片发出的是 moved，父组件收不到，点击没有反应。事件名要和监听的名字一致（第 6 章 6.2 节）。', expectFail: /移动/ }
  ]
}

// ======================= 第 3 步：provide / inject =======================
export const boardInject: Exercise = {
  title: '第 3 步：用 provide / inject 把操作传给深处的按钮', ch: 13,
  task: '<p>在第 2 步的基础上继续。卡片里的操作区拆成了 <code>CardActions</code>，层级变成 Board → Column → TaskCard → CardActions。按钮在最深处，却要调用最外层的 <code>move</code>、<code>update</code>、<code>remove</code>。如果继续用事件，<code>CardActions</code> 要通知 <code>TaskCard</code>，<code>TaskCard</code> 再通知 <code>Board</code>，中间那一层只是转发。改用依赖注入（第 6 章 6.6 节）：</p><ol><li>TODO 1：<code>Board</code> 用 <code>provide(\'board\', …)</code> 提供 <code>{ move, update, remove }</code>。</li><li>TODO 2：<code>CardActions</code> 在 <code>setup</code> 里用 <code>inject(\'board\')</code> 取到它，模板里用 <code>board.move(…)</code> 等调用。</li></ol><p>行为和第 2 步完全相同：移动、改日期、删除都能用，“最近操作”照常更新。</p>',
  tpl: TPL_ROOT,
  js: start3Js,
  solTpl: TPL_ROOT,
  solJs: sol3Js,
  faded: {
    js: sub(sub(sol3Js, PROVIDE3, "provide('board', /* ✏️ 要提供的对象：move、update、remove */)"), "const board = inject('board')", 'const board = /* ✏️ 注入 board */ undefined')
  },
  hints: [
    'provide 在祖先的 setup 里调用，两个参数：key 和值。inject 在后代的 setup 里调用，参数是同一个 key，返回祖先提供的值（第 6 章 6.6 节）。inject 只能在 setup 里调用，不要放进点击处理函数。',
    'Board 的 setup 里：provide(\'board\', { move, update, remove })。CardActions 的 setup 里：const board = inject(\'board\')，再 return { COLUMNS, board }。模板里已经写好了 board.move(…) 等。',
    "// Board 的 setup：\nprovide('board', { move, update, remove })\n\n// CardActions 的 setup：\nconst board = inject('board')\nreturn { COLUMNS, board }"
  ],
  async check(T) {
    T.ok(T.$$('.card').length === 4, '共 4 张卡片（当前 ' + T.$$('.card').length + ' 张）')
    if (!(await moveTo(T, '做任务表单', '进行中'))) { T.ok(false, '每张卡片有“→进行中”之类的按钮'); return }
    T.ok(titlesIn(T, 'doing').includes('做任务表单') && !titlesIn(T, 'todo').includes('做任务表单'), '点移动按钮后，卡片移到进行中（注入的 move 起作用）')
    T.ok(/移动/.test(textOf(T.$('.last-action'))), '“最近操作”记录了“移动”')
    await setDue(T, '做任务表单', '2026-06-01')
    T.ok(titlesIn(T, 'doing')[0] === '做任务表单' && textOf(T.$('.last-action')).includes('修改'), '改日期后卡片重新排序（注入的 update 起作用）')
    await T.click(cardOf(T, '加列表过渡').querySelector('.del'))
    T.ok(!cardOf(T, '加列表过渡') && /删除/.test(textOf(T.$('.last-action'))), '“删除”后卡片消失（注入的 remove 起作用）')
    T.ok(/待办.*0/.test(heading(T, 'todo')) && /还剩\s*2\s*项/.test(leftText(T)), '列的数量和“还剩”都更新了（当前：“' + heading(T, 'todo') + '”，“' + leftText(T) + '”）')
  },
  wrong: [
    { js: sub(sol3Js, PROVIDE3, "provide('boardActions', { move, update, remove })"), why: 'provide 的 key 和 inject 的 key 不一致。inject(\'board\') 找不到，返回 undefined，点击按钮时读 undefined.move 报错。provide 和 inject 靠 key 对应，用同一个字符串（或同一个 Symbol）。', expectFail: /移动|起作用/ },
    { js: sub(sol3Js, "    const board = inject('board')\n    return { COLUMNS, board }", "    const board = { move: (...a) => inject('board').move(...a), update: (...a) => inject('board').update(...a), remove: (...a) => inject('board').remove(...a) }\n    return { COLUMNS, board }"), why: '在点击处理函数里才调用 inject。inject 只能在 setup（或生命周期钩子）运行的同步过程中调用，点击发生时已经没有“当前组件”，返回 undefined 并警告。要在 setup 里一次取出。', expectFail: /移动|起作用/ }
  ]
}

// ======================= 第 4 步：表单、v-model、校验、Teleport =======================
export const boardForm: Exercise = {
  title: '第 4 步：新建和编辑任务的表单，弹窗用 Teleport', ch: 13,
  task: '<p>在第 3 步的基础上继续。看板顶部有“新建任务”按钮，点击任务标题可以编辑。两者共用 <code>TaskForm</code>，显示在弹窗里。<code>Board</code> 已经写好：<code>editing</code> 是 <code>null</code>（弹窗关闭）、<code>\'new\'</code>（新建）或要编辑的任务对象。补全四处：</p><ol><li>TODO 1：<code>TaskForm</code> 的两个输入框用 <code>v-model</code> 绑定到草稿 <code>form.title</code> 和 <code>form.due</code>（第 12 章 12.1 节）。</li><li>TODO 2：<code>error</code>（computed）：标题去掉空格后为空，返回“请输入标题”；超过 20 个字，返回“标题最多 20 个字”；否则返回空字符串。错误只在点过“保存”之后才显示（模板已写好）。</li><li>TODO 3：校验通过时，<code>emit(\'save\', { title, due })</code>，标题去掉空格。</li><li>TODO 4：弹窗现在渲染在看板里面。用 <code>Teleport</code> 把它渲染到 <code>body</code>（第 9 章 9.3 节）。</li></ol><p>草稿已经写好：表单复制了任务的值，输入时改草稿，保存时才交给 <code>Board</code>。所以点“取消”，任务不会被改。</p>',
  tpl: TPL_ROOT,
  js: start4Js,
  solTpl: TPL_ROOT,
  solJs: sol4Js,
  faded: {
    js: sub(sub(sub(sub(sub(sol4Js,
      'v-model="form.title"', 'v-model="/* ✏️ 绑定到草稿的标题 */"'),
      'v-model="form.due"', 'v-model="/* ✏️ 绑定到草稿的日期 */"'),
      "if (!t) return '请输入标题'", "if (/* ✏️ 标题为空 */) return '请输入标题'"),
      "emit('save', { title: form.title.trim(), due: form.due })", '/* ✏️ 通过 emit 发出 save，数据是 { title, due } */'),
      '<Teleport to="body">', '<Teleport to="/* ✏️ 渲染到哪个位置 */">')
  },
  hints: [
    'v-model 绑定表单草稿（第 2 章 2.5 节、第 12 章 12.1 节）。error 是派生数据，用 computed（第 12 章 12.4 节）。Teleport 的 to 属性写目标位置，弹窗要出现在 body 下（第 9 章 9.3 节）。',
    '模板：<input class="f-title" v-model="form.title"> 和 <input type="date" class="f-due" v-model="form.due">。error：const t = form.title.trim()；!t 返回 \'请输入标题\'；t.length > 20 返回 \'标题最多 20 个字\'；否则返回 \'\'。submit 里 emit(\'save\', { title: form.title.trim(), due: form.due })。用 <Teleport to="body"> 把 <div v-if="editing" class="modal">…</div> 包起来。',
    FORM_SOL('', '').trim() + '\n\n// Board 模板里：<Teleport to="body"> <div v-if="editing" class="modal">…</div> </Teleport>'
  ],
  async check(T) {
    const clickNew = async () => { await T.click(T.$('.new')) }
    T.ok(!modal(), '一开始没有弹窗')
    if (!T.$('.new')) { T.ok(false, '要保留“新建任务”按钮（class 为 new）'); return }
    await clickNew()
    T.ok(!!modal(), '点“新建任务”出现弹窗')
    if (!modal()) return
    T.ok(modal().parentElement === document.body, '弹窗被 Teleport 到 body 下（它的父元素是 ' + (modal().parentElement ? modal().parentElement.tagName.toLowerCase() : '无') + '）')
    T.ok(!T.$('.modal'), '看板自己的 DOM 里没有弹窗')
    const q = (s: string): any => modal() && modal().querySelector(s)
    T.ok(!q('.error'), '还没有提交时不显示错误')
    await T.click(q('.save'))
    T.ok(!!q('.error') && /标题/.test(textOf(q('.error'))) && T.$$('.card').length === 4, '标题为空点“保存”：显示错误，不添加任务，弹窗还在（当前 ' + T.$$('.card').length + ' 张卡片）')
    await setInput(q('.f-title'), '   ')
    await T.click(q('.save'))
    T.ok(!!q('.error') && T.$$('.card').length === 4, '只有空格同样算空')
    await setInput(q('.f-title'), '一二三四五六七八九十一二三四五六七八九十一')
    await T.click(q('.save'))
    T.ok(!!q('.error') && /20/.test(textOf(q('.error'))) && T.$$('.card').length === 4, '超过 20 个字显示“标题最多 20 个字”')
    await setInput(q('.f-title'), '  写测试  ')
    T.ok(!q('.error'), '改成合法的标题后错误消失（error 是 computed，随输入更新）')
    await setInput(q('.f-due'), '2026-06-03')
    await T.click(q('.save'))
    T.ok(!modal(), '保存成功后弹窗关闭')
    T.ok(titlesIn(T, 'todo').join() === '写测试,加列表过渡,做任务表单', '新任务出现在待办列，标题去掉空格，按日期排在最前（当前：' + titlesIn(T, 'todo').join() + '）')
    // 取消
    await clickNew()
    await setInput(q('.f-title'), '取消的任务')
    await T.click(q('.cancel'))
    T.ok(!modal() && !cardOf(T, '取消的任务'), '点“取消”关闭弹窗，不添加任务')
    // 编辑
    const titleBtn = cardOf(T, '写测试') && cardOf(T, '写测试').querySelector('.title')
    if (!titleBtn) { T.ok(false, '卡片标题是 class 为 title 的按钮'); return }
    await T.click(titleBtn)
    T.ok(!!modal() && q('.f-title').value === '写测试' && q('.f-due').value === '2026-06-03', '点标题打开编辑弹窗，表单里是这个任务现在的值')
    await setInput(q('.f-title'), '写更多测试')
    T.ok(!!cardOf(T, '写测试'), '输入过程中，看板上的任务还没有变（表单改的是草稿）')
    await T.click(q('.cancel'))
    T.ok(!modal() && !!cardOf(T, '写测试') && !cardOf(T, '写更多测试'), '编辑后点“取消”，任务保持原样')
    await T.click(cardOf(T, '写测试').querySelector('.title'))
    await setInput(q('.f-title'), '写更多测试')
    await T.click(q('.save'))
    T.ok(!modal() && !!cardOf(T, '写更多测试') && !cardOf(T, '写测试'), '编辑后点“保存”，任务的标题改了')
    T.ok(titlesIn(T, 'todo').includes('写更多测试') && T.$$('.card').length === 5, '任务还在待办列，总共 5 张卡片，没有多出一张')
  },
  wrong: [
    { js: sub(sol4Js, "const form = reactive({ title: props.task ? props.task.title : '', due: props.task ? props.task.due : '' })", "const form = props.task || reactive({ title: '', due: '' })"), why: '编辑时表单直接绑定了任务对象本身。每敲一个字，看板上的任务就跟着变；点“取消”也无法恢复。表单要复制一份草稿，保存时才交出去。', expectFail: /还没有变|取消/ },
    { js: sub(sol4Js, "if (!t) return '请输入标题'\n", ''), why: '没有校验空标题。空的或全是空格的标题被保存，看板上多出一张没有文字的卡片。', expectFail: /标题为空|只有空格/ },
    { js: sub(sol4Js, '<Teleport to="body">', '<div>').replace('</Teleport>', '</div>'), why: '弹窗渲染在看板里面。如果看板的某个祖先有 overflow: hidden、transform 或较低的 z-index，弹窗会被裁掉或盖不住别的内容。弹窗、提示这类盖在整个页面上的东西，用 Teleport 渲染到 body。', expectFail: /Teleport/ },
    { js: sub(sol4Js, '<p class="error" v-if="submitted && error">', '<p class="error" v-if="error">'), why: '错误立刻显示。用户刚打开表单，还没输入就看到“请输入标题”，像是在责怪他。校验的错误应该在用户提交过之后才显示。', expectFail: /还没有提交/ }
  ]
}

// ======================= 第 5 步：自定义指令和过渡 =======================
export const boardPolish: Exercise = {
  title: '第 5 步：自动聚焦指令，列表增删的过渡', ch: 13,
  task: '<p>在第 4 步的基础上继续。两处打磨：</p><ol><li>TODO 1、2：写自定义指令 <code>vFocus</code>（第 10 章 10.2 节）：元素出现在页面上时调用 <code>el.focus()</code>，并把 <code>v-focus</code> 用在弹窗里的标题输入框上。打开“新建任务”，光标应该已经在标题框里。（<code>TaskForm</code> 已经注册了 <code>directives: { focus: vFocus }</code>。）</li><li>TODO 3：卡片的增删要有过渡。把卡片列表的 <code>ul</code> 换成 <code>TransitionGroup</code>（第 9 章 9.2 节），渲染成 <code>ul</code>，<code>name</code> 随意。删除一张卡片时，它应该先带上“离开”类，过渡结束后才从页面移除。</li></ol><p>这一步不要求写 CSS。Vue 加上类名就足够了，样式是你以后补的。</p>',
  tpl: TPL_ROOT,
  js: start5Js,
  solTpl: TPL_ROOT,
  solJs: sol5Js,
  faded: {
    js: sub(sub(sub(sol5Js,
      'mounted(el) { el.focus() }', 'mounted(el) { /* ✏️ 让元素获得焦点 */ }'),
      '<input class="f-title" v-focus v-model="form.title">', '<input class="f-title" v-model="form.title"><!-- ✏️ 在这个输入框上用自定义指令，让它一出现就获得焦点 -->'),
      `<TransitionGroup tag="ul" name="card" class="cards" style="${UL_STYLE}">`, `<!-- ✏️ 换成能给列表项加过渡的内置组件 --><ul class="cards" style="${UL_STYLE}">`).replace('</TransitionGroup>', '</ul>')
  },
  hints: [
    '自定义指令是一个带钩子的对象（第 10 章 10.2 节）。元素要在页面里才能获得焦点，所以用 mounted 钩子，不是 created。TransitionGroup 用 tag 属性指定渲染成什么元素，它的子元素必须有 key（卡片已经有 :key）。',
    'const vFocus = { mounted(el) { el.focus() } }。TaskForm 模板里：<input class="f-title" v-focus v-model="form.title">。看板模板里：<TransitionGroup tag="ul" name="card" class="cards">……</TransitionGroup>。',
    FOCUS_SOL.trim() + '\n\n// <input class="f-title" v-focus v-model="form.title">\n// <TransitionGroup tag="ul" name="card" class="cards">……</TransitionGroup>'
  ],
  async check(T) {
    if (!T.$('.new')) { T.ok(false, '要保留“新建任务”按钮'); return }
    await T.click(T.$('.new'))
    const q = (s: string): any => modal() && modal().querySelector(s)
    await T.waitFor(() => modal() && document.activeElement === q('.f-title'), 500)
    T.ok(!!modal() && document.activeElement === q('.f-title'), '打开“新建任务”后，焦点已经在标题输入框里（当前焦点：' + (document.activeElement ? document.activeElement.tagName.toLowerCase() + (document.activeElement.className ? '.' + document.activeElement.className : '') : '无') + '）')
    await T.click(q('.cancel'))
    // 添加：新卡片带“进入”类
    await T.click(T.$('.new'))
    await setInput(q('.f-title'), '新卡片')
    await T.click(q('.save'))
    const added = cardOf(T, '新卡片')
    T.ok(!!added && /enter/.test(added.className), '新卡片刚出现时带“进入”类（TransitionGroup 在添加时加的类，当前类名：' + (added ? added.className : '找不到卡片') + '）')
    await calm(T)
    // 删除：先带“离开”类，过一会儿才移除
    const victim = cardOf(T, '新卡片')
    if (!victim) { T.ok(false, '找不到“新卡片”'); return }
    await T.click(victim.querySelector('.del'))
    T.ok(document.contains(victim) && /leave/.test(victim.className), '删除时卡片先带“离开”类，还留在页面上（当前类名：“' + victim.className + '”）')
    T.ok(await T.waitFor(() => !document.contains(victim), 1500), '过渡结束后卡片从页面移除')
    T.ok(!cardOf(T, '新卡片') && T.$$('.card').length === 4, '最终只剩原来的 4 张卡片')
    // 其余功能不受影响
    await moveTo(T, '做任务表单', '进行中')
    T.ok(titlesIn(T, 'doing').includes('做任务表单') && !titlesIn(T, 'todo').includes('做任务表单'), '移动功能仍然正常')
    T.ok(T.$$('ul.cards').length === 3, '每列的卡片列表仍然是 ul')
  },
  wrong: [
    { js: sub(sol5Js, 'mounted(el) { el.focus() }', 'created(el) { el.focus() }'), why: '用了 created 钩子。这时元素刚创建，还没有插入页面，focus() 没有效果。要用 mounted：元素已经在页面里。', expectFail: /焦点/ },
    { js: sub(sol5Js, 'mounted(el) { el.focus() }', 'mounted(el) { el.focus }'), why: '写成了 el.focus，没有括号：只是读取了函数，没有调用它。', expectFail: /焦点/ },
    { js: sub(sub(sol5Js, `<TransitionGroup tag="ul" name="card" class="cards" style="${UL_STYLE}">`, `<ul class="cards" style="${UL_STYLE}">`), '</TransitionGroup>', '</ul>'), why: '列表还是普通的 ul。卡片增删时立刻出现、立刻消失，没有进入和离开的类，也就没有过渡的机会。列表里的增删用 TransitionGroup，单个元素的显示隐藏才用 Transition。', expectFail: /进入|离开/ }
  ]
}

// ======================= 第 6 步：持久化 =======================
export const boardSave: Exercise = {
  title: '第 6 步：把任务存进 localStorage', ch: 13,
  task: '<p>在第 5 步的基础上继续。现在刷新页面，任务会回到示例数据。为了在页面里测试“刷新”，根模板里加了“模拟刷新”按钮：它销毁并重新创建 <code>Board</code>，<code>useTasks</code> 重新运行，和刷新页面相同。这一步只改 <code>useTasks</code> 和 <code>load</code>。</p><ol><li>TODO 1：<code>load()</code> 从 <code>localStorage</code> 读取。没有数据、内容不是合法 JSON、或解析出来不是数组时，返回 <code>seed()</code>，页面不能报错。</li><li>TODO 2：<code>tasks</code> 改变时写回 <code>localStorage</code>。增删、移动、改标题和日期、勾选都要保存。</li></ol><p>不要修改 <code>KEY</code>。判题开始和结束时会清掉这个键。这就是第 5 章待办清单里做过的同一件事：现在它在 <code>useTasks</code> 里，用到它的组件完全不知道。</p>',
  tpl: TPL_ROOT_RELOAD,
  js: withReload(start6Js),
  solTpl: TPL_ROOT_RELOAD,
  solJs: withReload(sol6Js),
  faded: {
    js: sub(sub(sub(sub(withReload(sol6Js),
      'const saved = JSON.parse(localStorage.getItem(KEY))   // 没有数据时得到 null', 'const saved = /* ✏️ 读出 KEY 里的内容并解析 */'),
      'return Array.isArray(saved) ? saved : seed()', 'return /* ✏️ 是数组就用它，否则用 seed() */'),
      'return seed()   // 内容损坏（不是合法 JSON）时，回到示例数据', 'return /* ✏️ 解析失败时回到示例数据 */'),
      'watch(tasks, v => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })', 'watch(tasks, v => localStorage.setItem(KEY, JSON.stringify(v)), { /* ✏️ push、改字段只改内部，怎样也能触发 */ })')
  },
  hints: [
    '读和写成对：创建 tasks 时读（getItem + JSON.parse），tasks 改变后写（watch + setItem + JSON.stringify）。add 用 push，移动和改字段只改任务对象里的属性，都不是替换整个数组，所以 watch 要加 { deep: true }（第 5 章 5.6 节）。',
    'load：try { const saved = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(saved) ? saved : seed() } catch { return seed() }。watch(tasks, v => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })，放在 const tasks = ref(load()) 的下面。',
    J_LOAD.trim() + '\n\n// useTasks 里：\nconst tasks = ref(load())\nwatch(tasks, v => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })'
  ],
  async check(T) {
    const reset = () => { try { localStorage.removeItem(KEY) } catch (e) { /* ignore */ } }
    reset()
    try {
      const reload = async () => { await calm(T); await T.click(T.$('.reload')); await T.settle(); await calm(T) }
      const addTask = async (title: string, due: string) => {
        await T.click(T.$('.new'))
        const q = (s: string): any => modal() && modal().querySelector(s)
        await setInput(q('.f-title'), title)
        if (due) await setInput(q('.f-due'), due)
        await T.click(q('.save'))
        await calm(T)
      }
      if (!T.$('.reload') || !T.$('.new')) { T.ok(false, '要保留“模拟刷新”和“新建任务”按钮'); return }
      await reload()
      T.ok(T.$$('.card').length === 4, '没有保存的数据时显示 4 个示例任务（当前 ' + T.$$('.card').length + ' 个）')
      await addTask('存一下', '2026-06-02')
      await reload()
      T.ok(titlesIn(T, 'todo').join() === '存一下,加列表过渡,做任务表单', '新建任务并“刷新”后，任务还在（当前待办列：' + titlesIn(T, 'todo').join() + '）')
      await moveTo(T, '存一下', '进行中')
      await reload()
      T.ok(titlesIn(T, 'doing').includes('存一下') && !titlesIn(T, 'todo').includes('存一下'), '移动任务并“刷新”后，它在进行中（移动只改 status，也要保存）')
      await setDue(T, '做任务表单', '2026-05-01')
      await reload()
      T.ok(titlesIn(T, 'todo')[0] === '做任务表单', '改日期并“刷新”后，排序结果还在（当前待办列：' + titlesIn(T, 'todo').join() + '）')
      await T.click(cardOf(T, '做任务表单').querySelector('.title'))
      await setInput(modal().querySelector('.f-title'), '改名了')
      await T.click(modal().querySelector('.save'))
      await calm(T)
      await reload()
      T.ok(!!cardOf(T, '改名了') && !cardOf(T, '做任务表单'), '编辑标题并“刷新”后，新标题还在')
      await addTask('N', '')
      await T.click(cardOf(T, '存一下').querySelector('.del'))
      await calm(T)
      T.ok(!!cardOf(T, 'N') && !cardOf(T, '存一下'), '“刷新”后新建的任务 id 要接着已有的最大 id：删除“存一下”时不能误删“N”')
      await reload()
      T.ok(!!cardOf(T, 'N') && !cardOf(T, '存一下') && T.$$('.card').length === 5, '删除后“刷新”，结果也保存了（当前 ' + T.$$('.card').length + ' 张卡片）')
      localStorage.setItem(KEY, '{坏')
      await reload()
      T.ok(T.$$('.card').length === 4, '内容损坏时回到 4 个示例任务，页面不报错（当前 ' + T.$$('.card').length + ' 个）')
      localStorage.setItem(KEY, '{"a":1}')
      await reload()
      T.ok(T.$$('.card').length === 4, '内容是合法 JSON 但不是数组时，也回到示例任务（当前 ' + T.$$('.card').length + ' 个）')
    } finally {
      reset()
    }
  },
  wrong: [
    { js: sub(withReload(sol6Js), '{ deep: true }', '{}'), why: 'watch 没有 deep。侦听一个 ref 时，只有 .value 被替换才触发。删除用 filter 替换了数组，会保存；新建用 push、移动和改日期只改内部，都不触发，刷新后这些修改丢了。', expectFail: /还在/ },
    { js: sub(withReload(sol6Js), 'const tasks = ref(load())', 'const tasks = ref(seed())'), why: '只写不读。数据存进了 localStorage，但创建 tasks 时没有读出来，刷新后仍然是示例数据。', expectFail: /还在/ },
    { js: sub(withReload(sol6Js), 'Math.max(0, ...tasks.value.map(t => t.id)) + 1', '5'), why: 'nextId 固定从 5 开始。读回数据后，已有任务里可能已经有 id 5，新任务得到重复的 id，删除其中一个会把两个都删掉。读回数据后，nextId 要接着已有的最大 id。', expectFail: /id 要接着/ },
    { js: sub(sub(withReload(sol6Js), '  try {\n    const saved', '  {\n    const saved'), '  } catch {\n    return seed()   // 内容损坏（不是合法 JSON）时，回到示例数据\n  }', '  }'), why: '没有 try / catch。localStorage 里的内容可能被别的程序或旧版本写坏，JSON.parse 抛错，整个看板在 setup 里崩掉。读取外部数据要准备好失败的情况。', expectFail: /内容损坏|示例/ }
  ]
}

