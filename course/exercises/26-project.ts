import type { Exercise } from './types'
import { sub } from './types'
import { nextTick } from 'vue'

export const kanbanItem: Exercise = {
  title: '拆出 TaskItem 组件：props 向下，事件向上', ch: 26,
  task: '<p>下面的看板已经拆成父组件和 TaskItem。父组件有数据和 toggle、remove 两个方法。TaskItem 还没写完。</p><ol><li>TODO 1：声明 props。<code>task</code> 是对象，必填。</li><li>TODO 2：声明两个事件：<code>toggle</code> 和 <code>remove</code>。</li><li>TODO 3：点击复选框时，发出 <code>toggle</code>，参数是任务的 id。点击“删除”时，发出 <code>remove</code>，参数是任务的 id。</li></ol><p>TaskItem 不修改 <code>task</code>。修改数据是父组件的事。页面下方的计数显示父组件收到了几次事件。</p>',
  tpl: '<ul>\n  <TaskItem v-for="t in tasks" :key="t.id" :task="t" @toggle="toggle" @remove="remove" />\n</ul>\n<p class="log">父组件收到：toggle {{ log.toggle }} 次，remove {{ log.remove }} 次</p>',
  js: `// ---------- 父组件的数据和方法。不要修改。 ----------
const tasks = ref([
  { id: 1, text: '读完响应式原理', done: true },
  { id: 2, text: '完成练习', done: false },
  { id: 3, text: '写一个 useFetch', done: false }
])
const log = reactive({ toggle: 0, remove: 0 })
function toggle(id) {
  log.toggle++
  const task = tasks.value.find(t => t.id === id)
  if (task) task.done = !task.done
}
function remove(id) {
  log.remove++
  tasks.value = tasks.value.filter(t => t.id !== id)
}

// ---------- 子组件。补全三处 TODO。 ----------
const TaskItem = {
  // TODO 1：声明 props：task，对象，必填
  props: {},
  // TODO 2：声明事件 toggle 和 remove
  emits: [],
  template: \`
    <li>
      <input type="checkbox" :checked="task.done">
      <span class="text">{{ task.text }}</span>
      <span class="state">{{ task.done ? '已完成' : '未完成' }}</span>
      <button>删除</button>
    </li>\`
  // TODO 3：在复选框上监听 change，在按钮上监听 click，用 $emit 通知父组件
}

return { tasks, log, toggle, remove, components: { TaskItem } }`,
  solJs: `const tasks = ref([
  { id: 1, text: '读完响应式原理', done: true },
  { id: 2, text: '完成练习', done: false },
  { id: 3, text: '写一个 useFetch', done: false }
])
const log = reactive({ toggle: 0, remove: 0 })
function toggle(id) {
  log.toggle++
  const task = tasks.value.find(t => t.id === id)
  if (task) task.done = !task.done
}
function remove(id) {
  log.remove++
  tasks.value = tasks.value.filter(t => t.id !== id)
}

const TaskItem = {
  props: { task: { type: Object, required: true } },
  emits: ['toggle', 'remove'],
  template: \`
    <li>
      <input type="checkbox" :checked="task.done" @change="$emit('toggle', task.id)">
      <span class="text">{{ task.text }}</span>
      <span class="state">{{ task.done ? '已完成' : '未完成' }}</span>
      <button @click="$emit('remove', task.id)">删除</button>
    </li>\`
}

return { tasks, log, toggle, remove, components: { TaskItem } }`,
  hints: [
    '数据归父组件。子组件只做两件事：用 props 接收任务，用事件把用户的操作告诉父组件。父组件收到事件后修改数据，新数据再通过 props 流回子组件。第 5 章讲了这个单向数据流。',
    'props 写成对象：{ task: { type: Object, required: true } }。emits 写成数组：[\'toggle\', \'remove\']。模板里，复选框写 @change="$emit(\'toggle\', task.id)"，删除按钮写 @click="$emit(\'remove\', task.id)"。',
    "props: { task: { type: Object, required: true } },\nemits: ['toggle', 'remove'],\n// 复选框\n@change=\"$emit('toggle', task.id)\"\n// 删除按钮\n@click=\"$emit('remove', task.id)\""
  ],
  async check(T) {
    const rows = () => T.$$('li');
    const row = n => rows().find(li => ((li.querySelector('.text') || {}).textContent || '').trim() === n);
    const state = n => ((row(n) && row(n).querySelector('.state')) || {}).textContent;
    const logText = () => ((T.$('.log') || {}).textContent || '');
    T.ok(rows().length === 3, '显示 3 个任务（当前 ' + rows().length + ' 个）');
    if (rows().length !== 3 || !row('完成练习')) return;
    const inst = (T.$(':scope > div') as any)?._vnode?.component;
    const C = inst && inst.appContext.components.TaskItem;
    const P = C && C.props, E = C && C.emits;
    T.ok(!!P && !Array.isArray(P) && !!P.task && P.task.type === Object && P.task.required === true, 'TODO 1：props 声明 task 为 { type: Object, required: true }');
    const has = (e: string) => Array.isArray(E) ? E.includes(e) : !!E && e in E;
    T.ok(has('toggle') && has('remove'), 'TODO 2：emits 里声明了 toggle 和 remove');
    const cb = row('完成练习').querySelector('input[type=checkbox]');
    await T.click(cb);
    T.ok(/toggle 1 次/.test(logText()), '点击复选框后，父组件收到 1 次 toggle 事件（当前：' + logText().trim() + '）');
    T.ok(state('完成练习') === '已完成', '父组件修改数据后，“完成练习”显示“已完成”（当前：' + state('完成练习') + '）');
    const del = row('写一个 useFetch') && row('写一个 useFetch').querySelector('button');
    await T.click(del);
    T.ok(/remove 1 次/.test(logText()), '点击“删除”后，父组件收到 1 次 remove 事件（当前：' + logText().trim() + '）');
    T.ok(!row('写一个 useFetch') && rows().length === 2, '“写一个 useFetch”从列表中消失');
    T.ok(/toggle 1 次/.test(logText()), 'toggle 仍然只有 1 次。子组件不直接修改 task');
  },
  wrong: [
    {
      js: `const tasks = ref([
  { id: 1, text: '读完响应式原理', done: true },
  { id: 2, text: '完成练习', done: false },
  { id: 3, text: '写一个 useFetch', done: false }
])
const log = reactive({ toggle: 0, remove: 0 })
function toggle(id) { log.toggle++ }
function remove(id) { log.remove++; tasks.value = tasks.value.filter(t => t.id !== id) }
const TaskItem = {
  props: { task: { type: Object, required: true } },
  emits: ['toggle', 'remove'],
  template: \`
    <li>
      <input type="checkbox" :checked="task.done" @change="task.done = !task.done">
      <span class="text">{{ task.text }}</span>
      <span class="state">{{ task.done ? '已完成' : '未完成' }}</span>
      <button @click="$emit('remove', task.id)">删除</button>
    </li>\`
}
return { tasks, log, toggle, remove, components: { TaskItem } }`,
      why: '子组件直接修改 props 里的对象。页面看起来能用，但父组件没有收到 toggle 事件。数据的修改散落在子组件里，很难追踪。要通过事件让父组件修改。'
    },
    {
      js: `const tasks = ref([
  { id: 1, text: '读完响应式原理', done: true },
  { id: 2, text: '完成练习', done: false },
  { id: 3, text: '写一个 useFetch', done: false }
])
const log = reactive({ toggle: 0, remove: 0 })
function toggle(id) {
  log.toggle++
  const task = tasks.value.find(t => t.id === id)
  if (task) task.done = !task.done
}
function remove(id) { log.remove++; tasks.value = tasks.value.filter(t => t.id !== id) }
const TaskItem = {
  props: { task: { type: Object, required: true } },
  emits: ['toggle', 'remove'],
  template: \`
    <li>
      <input type="checkbox" :checked="task.done" @change="$emit('toggle')">
      <span class="text">{{ task.text }}</span>
      <span class="state">{{ task.done ? '已完成' : '未完成' }}</span>
      <button @click="$emit('remove')">删除</button>
    </li>\`
}
return { tasks, log, toggle, remove, components: { TaskItem } }`,
      why: '事件没有带参数。父组件收到了 toggle，但不知道是哪个任务，找不到要修改的数据。事件要带上 task.id。'
    },
    {
      js: `const tasks = ref([
  { id: 1, text: '读完响应式原理', done: true },
  { id: 2, text: '完成练习', done: false },
  { id: 3, text: '写一个 useFetch', done: false }
])
const log = reactive({ toggle: 0, remove: 0 })
function toggle(id) {
  log.toggle++
  const task = tasks.value.find(t => t.id === id)
  if (task) task.done = !task.done
}
function remove(id) { log.remove++; tasks.value = tasks.value.filter(t => t.id !== id) }
const TaskItem = {
  props: { task: { type: Object, required: true } },
  emits: ['toggle', 'remove'],
  template: \`
    <li>
      <input type="checkbox" :checked="task.done" @change="$emit('change', task.id)">
      <span class="text">{{ task.text }}</span>
      <span class="state">{{ task.done ? '已完成' : '未完成' }}</span>
      <button @click="$emit('delete', task.id)">删除</button>
    </li>\`
}
return { tasks, log, toggle, remove, components: { TaskItem } }`,
      why: '事件名和父组件监听的名字不一致。父组件监听 @toggle 和 @remove，子组件发出了 change 和 delete，父组件收不到。'
    }
  ]
}

export const kanbanSave: Exercise = {
  title: '补上 remove，并把任务保存到 localStorage', ch: 26,
  task: '<p>下面是第 5 步的 useTasks 和看板组件。“删除”按钮没有作用。刷新后，任务恢复为示例数据。</p><ol><li>补上 remove。点击“删除”后，任务从列表中消失。</li><li>useTasks 创建 tasks 时，先从 localStorage 读取。没有数据时，用 seed()。</li><li>tasks 改变时，写入 localStorage。勾选复选框也要保存。</li></ol><p>只修改 useTasks 函数。不要修改 key。点击“模拟刷新”检查结果。原因：模拟刷新会重新创建看板，useTasks 重新运行，和刷新页面相同。</p>',
  tpl: '<TaskBoard :key="reloads" />\n<button @click="reloads++">模拟刷新</button>',
  js: `const seed = () => [
  { id: 1, text: '读完响应式原理', done: true },
  { id: 2, text: '完成练习', done: false },
  { id: 3, text: '写一个 useFetch', done: false }
]

// 第 5 步的 useTasks。只修改这个函数。
function useTasks(key = 'hov3-demo:ex26-tasks') {
  // TODO 2：先从 localStorage 读取。没有数据时，用 seed()。
  const tasks = ref(seed())
  // TODO 3：tasks 改变时，写入 localStorage。

  let nextId = Math.max(0, ...tasks.value.map(t => t.id)) + 1
  function add(text) {
    text = text.trim()
    if (text) tasks.value.push({ id: nextId++, text, done: false })
  }
  function toggle(id) {
    const task = tasks.value.find(t => t.id === id)
    if (task) task.done = !task.done
  }
  function remove(id) {
    // TODO 1：删除 id 对应的任务
  }
  return { tasks, add, toggle, remove }
}

// 看板组件。不要修改。
const TaskBoard = {
  setup() {
    const draft = ref('')
    const { tasks, add, toggle, remove } = useTasks()
    function submit() { add(draft.value); draft.value = '' }
    return { draft, tasks, submit, toggle, remove }
  },
  template: \`
    <input v-model="draft" @keyup.enter="submit" placeholder="新任务">
    <button @click="submit">添加</button>
    <ul>
      <li v-for="t in tasks" :key="t.id">
        <input type="checkbox" :checked="t.done" @change="toggle(t.id)">
        <span>{{ t.text }}</span>
        <button @click="remove(t.id)">删除</button>
      </li>
    </ul>\`
}

// reloads 改变时，TaskBoard 重新创建，useTasks 重新运行。
const reloads = ref(0)
return { reloads, components: { TaskBoard } }`,
  solJs: `const seed = () => [
  { id: 1, text: '读完响应式原理', done: true },
  { id: 2, text: '完成练习', done: false },
  { id: 3, text: '写一个 useFetch', done: false }
]

function useTasks(key = 'hov3-demo:ex26-tasks') {
  const saved = localStorage.getItem(key)          // 没有数据时得到 null
  const tasks = ref(saved ? JSON.parse(saved) : seed())
  // deep：push 和修改 done 也触发保存
  watch(tasks, v => localStorage.setItem(key, JSON.stringify(v)), { deep: true })

  let nextId = Math.max(0, ...tasks.value.map(t => t.id)) + 1
  function add(text) {
    text = text.trim()
    if (text) tasks.value.push({ id: nextId++, text, done: false })
  }
  function toggle(id) {
    const task = tasks.value.find(t => t.id === id)
    if (task) task.done = !task.done
  }
  function remove(id) {
    tasks.value = tasks.value.filter(t => t.id !== id)
  }
  return { tasks, add, toggle, remove }
}

// 看板组件。不要修改。
const TaskBoard = {
  setup() {
    const draft = ref('')
    const { tasks, add, toggle, remove } = useTasks()
    function submit() { add(draft.value); draft.value = '' }
    return { draft, tasks, submit, toggle, remove }
  },
  template: \`
    <input v-model="draft" @keyup.enter="submit" placeholder="新任务">
    <button @click="submit">添加</button>
    <ul>
      <li v-for="t in tasks" :key="t.id">
        <input type="checkbox" :checked="t.done" @change="toggle(t.id)">
        <span>{{ t.text }}</span>
        <button @click="remove(t.id)">删除</button>
      </li>
    </ul>\`
}

// reloads 改变时，TaskBoard 重新创建，useTasks 重新运行。
const reloads = ref(0)
return { reloads, components: { TaskBoard } }`,
  hints: [
    '删除：生成一个不含这一项的新数组，赋给 tasks.value。持久化分两半：创建 tasks 时读取，tasks 改变时写入。第 26 章第 5 步和第一道自测讲了它。勾选只修改 done 属性，所以 watch 要加 { deep: true }。否则勾选不会保存。',
    '在 useTasks 中改三处：1. remove 中，把 tasks.value.filter(…) 的结果赋给 tasks.value。2. ref 的初值：先读 localStorage.getItem(key)。结果是 null 时用 seed()，否则用 JSON.parse。3. 在 ref 下面写 watch(tasks, 回调, { deep: true })。回调中调用 localStorage.setItem 和 JSON.stringify。',
    'function remove(id) { tasks.value = tasks.value.filter(t => t.id !== id) }\n\nconst saved = localStorage.getItem(key)\nconst tasks = ref(saved ? JSON.parse(saved) : seed())\nwatch(tasks, v => localStorage.setItem(key, JSON.stringify(v)), { deep: true })'
  ],
  async check(T) {
    try { localStorage.removeItem('hov3-demo:ex26-tasks'); } catch (e) {}
    const reload = async () => { const b = T.btn('模拟刷新'); if (b) await T.click(b); };
    const name = li => ((li.querySelector('span') || {}).textContent || '').trim();
    const row = n => T.$$('li').find(li => name(li) === n);
    await reload();
    T.ok(T.$$('li').length === 3, '清空保存的数据并刷新后，显示 3 个示例任务（当前 ' + T.$$('li').length + ' 个）');
    const inp = T.$('input[placeholder="新任务"]'), addBtn = T.btn('添加');
    if (!inp || !addBtn || !row('完成练习') || !row('写一个 useFetch')) { T.ok(false, '找到输入框、“添加”按钮和示例任务。不要修改看板组件'); return; }
    inp.value = '检查持久化'; inp.dispatchEvent(new Event('input')); await nextTick();
    await T.click(addBtn);
    T.ok(!!row('检查持久化'), '添加“检查持久化”后，它显示在列表中');
    await T.click(row('完成练习').querySelector('button'));
    T.ok(!row('完成练习'), '点击“完成练习”的“删除”后，它从列表中消失');
    const cb = row('写一个 useFetch') && row('写一个 useFetch').querySelector('input[type=checkbox]');
    if (cb) await T.click(cb);
    await reload();
    T.ok(!!row('检查持久化'), '模拟刷新后，新添加的任务仍在');
    T.ok(T.$$('li').length > 0 && !row('完成练习'), '模拟刷新后，删除的任务没有回来');
    const cb2 = row('写一个 useFetch') && row('写一个 useFetch').querySelector('input[type=checkbox]');
    T.ok(!!cb2 && cb2.checked, '模拟刷新后，“写一个 useFetch”仍是已勾选。勾选只修改属性，需要 deep 侦听');
  }
}

export const kanbanDue: Exercise = {
  title: '延伸练习 1：按截止日期排序', ch: 26,
  task: '<p>每个任务有截止日期 due。due 是“2026-06-01”格式的字符串。没有日期时，due 是空字符串。</p><ol><li>在模板中，没有日期的任务显示“无”。</li><li>用 computed 定义 sorted：按日期从早到晚排列。没有日期的任务排在最后。</li><li>在输入框中修改日期。列表立即重新排序。</li></ol>',
  tpl: '<ul>\n  <li v-for="t in sorted" :key="t.id">\n    <span class="text">{{ t.text }}</span>\n    截止：<span class="due">{{ t.due }}</span>\n    <input type="date" v-model="t.due">\n  </li>\n</ul>',
  js: `const tasks = ref([
  { id: 1, text: '写一个 useFetch', due: '2026-06-10' },
  { id: 2, text: '读完响应式原理', due: '' },
  { id: 3, text: '完成练习', due: '2026-06-01' }
])

// TODO：按 due 从早到晚排序。due 为空的任务排在最后。
const sorted = computed(() => tasks.value)

return { tasks, sorted }`,
  solTpl: '<ul>\n  <li v-for="t in sorted" :key="t.id">\n    <span class="text">{{ t.text }}</span>\n    截止：<span class="due">{{ t.due || \'无\' }}</span>\n    <input type="date" v-model="t.due">\n  </li>\n</ul>',
  solJs: `const tasks = ref([
  { id: 1, text: '写一个 useFetch', due: '2026-06-10' },
  { id: 2, text: '读完响应式原理', due: '' },
  { id: 3, text: '完成练习', due: '2026-06-01' }
])

const LAST = '9999-12-31'   // 没有日期时，当作最晚的日期
// [...] 先复制。原因：sort 会修改原数组，computed 中不要修改数据。
const sorted = computed(() =>
  [...tasks.value].sort((a, b) => (a.due || LAST).localeCompare(b.due || LAST))
)

return { tasks, sorted }`,
  hints: [
    '排好序的列表是派生数据，所以用 computed（第 4 章）。修改 t.due 后，computed 重新计算，列表重新排序。“2026-06-01”格式的字符串按字符比较，结果和按日期比较相同。',
    '模板：把 {{ t.due }} 改为 {{ t.due || \'无\' }}。脚本：在 computed 中，先用 [...tasks.value] 复制数组，再调用 sort。比较时，把空的 due 换为一个很晚的日期。原因：sort 会修改原数组，computed 中不要修改数据。',
    "模板：<span class=\"due\">{{ t.due || '无' }}</span>\n\nconst LAST = '9999-12-31'\nconst sorted = computed(() =>\n  [...tasks.value].sort((a, b) => (a.due || LAST).localeCompare(b.due || LAST))\n)"
  ],
  async check(T) {
    const order = () => T.$$('li').map(li => ((li.querySelector('.text') || {}).textContent || '').trim()).join(' → ');
    const row = n => T.$$('li').find(li => ((li.querySelector('.text') || {}).textContent || '').trim() === n);
    const setDue = async (n, v) => { const i = row(n) && row(n).querySelector('input'); if (!i) return false; i.value = v; i.dispatchEvent(new Event('input')); await nextTick(); return true; };
    // computed 里不能修改源数据：tasks 的原始顺序必须保持 1、2、3
    const rootEl: any = T.$(':scope > div');
    const inst = rootEl && rootEl._vnode && rootEl._vnode.component;
    const src = inst && inst.setupState.tasks;
    T.ok(Array.isArray(src) && src.map((t: any) => t.id).join() === '1,2,3', '没有修改源数据 tasks 的顺序（当前：' + (Array.isArray(src) ? src.map((t: any) => t.id).join() : '找不到 tasks') + '）');
    T.ok(order() === '完成练习 → 写一个 useFetch → 读完响应式原理', '初始顺序：完成练习 → 写一个 useFetch → 读完响应式原理（当前：' + order() + '）');
    const d = row('读完响应式原理') && row('读完响应式原理').querySelector('.due');
    T.ok(!!d && d.textContent.trim() === '无', '没有日期的“读完响应式原理”显示“无”');
    if (!(await setDue('读完响应式原理', '2026-05-01'))) { T.ok(false, '找到每一行的日期输入框'); return; }
    T.ok(order().startsWith('读完响应式原理'), '把“读完响应式原理”改为 2026-05-01 后，它排在第一（当前：' + order() + '）');
    await setDue('完成练习', '');
    T.ok(order().endsWith('完成练习'), '清空“完成练习”的日期后，它排在最后（当前：' + order() + '）');
    const d2 = row('完成练习') && row('完成练习').querySelector('.due');
    T.ok(!!d2 && d2.textContent.trim() === '无', '清空日期后，“完成练习”显示“无”');
  }
}

export const kanbanStore: Exercise = {
  title: '延伸练习 2：把任务放入 store', ch: 26,
  task: '<p>练习台没有 Pinia。脚本开头的 defineStore 和 storeToRefs 是简化版，行为和 Pinia 相同：</p><ul><li>第一次调用 useTaskStore() 时，运行 setup 函数。以后每次调用，都返回同一个 store。</li><li>store 是 reactive 对象。直接解构 state，只得到当前值。</li></ul><ol><li>把 App 中的 tasks、add、toggle、remove 移到 store 中。App 不再保存任务数组。</li><li>App 用 storeToRefs 取出 tasks，从 store 取出 add、toggle、remove。</li><li>LeftCount 用 storeToRefs 解构 left。添加或勾选任务后，“还剩”立即改变。</li></ol><p>不需要修改模板。持久化已在上一道练习中完成，本题不检查。</p>',
  tpl: '<input v-model="draft" @keyup.enter="submit" placeholder="新任务">\n<button @click="submit">添加</button>\n<ul>\n  <li v-for="t in tasks" :key="t.id">\n    <input type="checkbox" :checked="t.done" @change="toggle(t.id)">\n    <span>{{ t.text }}</span>\n    <button @click="remove(t.id)">删除</button>\n  </li>\n</ul>\n<LeftCount />',
  js: `// 简化版 defineStore 和 storeToRefs。不要修改。
function defineStore(id, setup) {
  let store = null
  return () => store || (store = reactive(setup()))
}
const storeToRefs = store => toRefs(store)

const useTaskStore = defineStore('tasks', () => {
  // TODO 1：把下面 App 中的 tasks、add、toggle、remove 移到这里，并返回它们
  const tasks = ref([])
  const left = computed(() => tasks.value.filter(t => !t.done).length)
  return { tasks, left }
})

// 另一个组件：显示剩余任务数
const LeftCount = {
  setup() {
    const store = useTaskStore()
    // TODO 3：用 storeToRefs 解构
    const { left } = store
    return { left }
  },
  template: '<p class="left">还剩 {{ left }} 项</p>'
}

// ---------- App ----------
const store = useTaskStore()
// TODO 2：App 不再保存任务。从 store 取出 tasks 和方法。
const tasks = ref([
  { id: 1, text: '读完响应式原理', done: true },
  { id: 2, text: '完成练习', done: false },
  { id: 3, text: '写一个 useFetch', done: false }
])
let nextId = 4
function add(text) {
  text = text.trim()
  if (text) tasks.value.push({ id: nextId++, text, done: false })
}
function toggle(id) {
  const task = tasks.value.find(t => t.id === id)
  if (task) task.done = !task.done
}
function remove(id) {
  tasks.value = tasks.value.filter(t => t.id !== id)
}

const draft = ref('')
function submit() { add(draft.value); draft.value = '' }

return { draft, submit, tasks, toggle, remove, components: { LeftCount } }`,
  solJs: `// 简化版 defineStore 和 storeToRefs。不要修改。
function defineStore(id, setup) {
  let store = null
  return () => store || (store = reactive(setup()))
}
const storeToRefs = store => toRefs(store)

const useTaskStore = defineStore('tasks', () => {
  const tasks = ref([
    { id: 1, text: '读完响应式原理', done: true },
    { id: 2, text: '完成练习', done: false },
    { id: 3, text: '写一个 useFetch', done: false }
  ])
  let nextId = 4
  const left = computed(() => tasks.value.filter(t => !t.done).length)
  function add(text) {
    text = text.trim()
    if (text) tasks.value.push({ id: nextId++, text, done: false })
  }
  function toggle(id) {
    const task = tasks.value.find(t => t.id === id)
    if (task) task.done = !task.done
  }
  function remove(id) {
    tasks.value = tasks.value.filter(t => t.id !== id)
  }
  return { tasks, left, add, toggle, remove }
})

// 另一个组件：显示剩余任务数
const LeftCount = {
  setup() {
    const store = useTaskStore()
    const { left } = storeToRefs(store)   // left 仍是 ref，保持响应
    return { left }
  },
  template: '<p class="left">还剩 {{ left }} 项</p>'
}

// ---------- App ----------
const store = useTaskStore()
const { tasks } = storeToRefs(store)      // state：用 storeToRefs
const { add, toggle, remove } = store     // action：直接解构

const draft = ref('')
function submit() { add(draft.value); draft.value = '' }

return { draft, submit, tasks, toggle, remove, components: { LeftCount } }`,
  hints: [
    '两个组件要显示同一份数据，所以数据只能有一个拥有者：store（第 18 章）。App 自己保存一份时，LeftCount 看不到 App 的修改。store 是 reactive 对象。直接解构 store.left 只得到一个数字，以后不再更新。',
    '1. 把 tasks 的初值、nextId、add、toggle、remove 剪切到 defineStore 的 setup 函数中，并加入 return。2. App 中写 const { tasks } = storeToRefs(store) 和 const { add, toggle, remove } = store。3. LeftCount 中把 store 换为 storeToRefs(store)。',
    "// setup 函数的最后：\nreturn { tasks, left, add, toggle, remove }\n\n// LeftCount：\nconst { left } = storeToRefs(store)\n\n// App：\nconst store = useTaskStore()\nconst { tasks } = storeToRefs(store)\nconst { add, toggle, remove } = store"
  ],
  async check(T) {
    const left = () => ((T.$('.left') || {}).textContent || '').trim();
    const row = n => T.$$('li').find(li => ((li.querySelector('span') || {}).textContent || '').trim() === n);
    T.ok(T.$$('li').length === 3, '列表显示 3 个任务（当前 ' + T.$$('li').length + ' 个）');
    T.ok(/还剩\s*2\s*项/.test(left()), 'LeftCount 显示“还剩 2 项”（当前：' + (left() || '没有找到') + '）');
    const inp = T.$('input[placeholder="新任务"]'), addBtn = T.btn('添加');
    if (!inp || !addBtn) { T.ok(false, '找到输入框和“添加”按钮'); return; }
    inp.value = '检查 store'; inp.dispatchEvent(new Event('input')); await nextTick();
    await T.click(addBtn);
    T.ok(!!row('检查 store'), '添加后，列表中有“检查 store”');
    T.ok(/还剩\s*3\s*项/.test(left()), '添加后，LeftCount 立即显示“还剩 3 项”（当前：' + left() + '）');
    const cb = row('完成练习') && row('完成练习').querySelector('input[type=checkbox]');
    if (cb) await T.click(cb);
    T.ok(/还剩\s*2\s*项/.test(left()), '勾选“完成练习”后，显示“还剩 2 项”（当前：' + left() + '）');
    const r = row('检查 store');
    if (r) await T.click(r.querySelector('button'));
    T.ok(!row('检查 store') && /还剩\s*1\s*项/.test(left()), '删除“检查 store”后，它消失，显示“还剩 1 项”（当前：' + left() + '）');
  }
}

export const kanbanRoute: Exercise = {
  title: '延伸练习 3：/task/:id 详情页', ch: 26,
  task: '<p>练习台没有 Vue Router。脚本中的 route 和 push 是简化版。和真实的路由一样，route.params 中的值总是字符串。</p><ol><li>在模板中，点击任务标题时，调用 push(\'/task/\' + t.id)。</li><li>修复 task 的 computed。现在打开 /task/1，页面显示“任务不存在”。</li><li>确认打开 /task/99 时，页面显示“任务不存在”，没有错误。</li></ol><p>“/task/1”和“/task/99”两个按钮模拟在地址栏直接打开地址。</p>',
  tpl: '<p class="addr">地址：{{ route.path }}</p>\n<ul v-if="route.path === \'/\'">\n  <li v-for="t in tasks" :key="t.id">\n    <!-- TODO 1：点击标题时打开详情页 -->\n    <a href="#" class="title" @click.prevent>{{ t.text }}</a>\n  </li>\n</ul>\n<div v-else>\n  <h4 v-if="task">任务 {{ task.id }}：{{ task.text }}</h4>\n  <p v-else class="none">任务不存在</p>\n  <button @click="push(\'/\')">返回列表</button>\n</div>\n<p>直接打开：\n  <button @click="push(\'/task/1\')">/task/1</button>\n  <button @click="push(\'/task/99\')">/task/99</button>\n</p>',
  js: `// 简化版 route 和 push。不要修改。
const route = reactive({ path: '/', params: {} })
function push(path) {
  route.path = path
  route.params = path.startsWith('/task/') ? { id: path.slice(6) } : {}   // id 是字符串
}

const tasks = ref([
  { id: 1, text: '读完响应式原理', done: true },
  { id: 2, text: '完成练习', done: false },
  { id: 3, text: '写一个 useFetch', done: false }
])

// 详情页显示的任务
// TODO 2：这一行找不到任务。修复它。
const task = computed(() => tasks.value.find(t => t.id === route.params.id))

return { route, push, tasks, task }`,
  solTpl: '<p class="addr">地址：{{ route.path }}</p>\n<ul v-if="route.path === \'/\'">\n  <li v-for="t in tasks" :key="t.id">\n    <a href="#" class="title" @click.prevent="push(\'/task/\' + t.id)">{{ t.text }}</a>\n  </li>\n</ul>\n<div v-else>\n  <h4 v-if="task">任务 {{ task.id }}：{{ task.text }}</h4>\n  <p v-else class="none">任务不存在</p>\n  <button @click="push(\'/\')">返回列表</button>\n</div>\n<p>直接打开：\n  <button @click="push(\'/task/1\')">/task/1</button>\n  <button @click="push(\'/task/99\')">/task/99</button>\n</p>',
  solJs: `// 简化版 route 和 push。不要修改。
const route = reactive({ path: '/', params: {} })
function push(path) {
  route.path = path
  route.params = path.startsWith('/task/') ? { id: path.slice(6) } : {}   // id 是字符串
}

const tasks = ref([
  { id: 1, text: '读完响应式原理', done: true },
  { id: 2, text: '完成练习', done: false },
  { id: 3, text: '写一个 useFetch', done: false }
])

// 路由参数是字符串，t.id 是数字。先转为数字，再比较。
const task = computed(() => tasks.value.find(t => t.id === Number(route.params.id)))

return { route, push, tasks, task }`,
  hints: [
    '路由参数总是字符串（第 19 章）。t.id 是数字。\'1\' === 1 为假，所以 find 找不到任务。第 26 章自测第 4 题讲了它。',
    '1. 模板：在 <a> 的 @click.prevent 后写 ="push(…)"，参数是 \'/task/\' 加 t.id。2. 脚本：比较前，用 Number() 把 route.params.id 转为数字。',
    '<a href="#" class="title" @click.prevent="push(\'/task/\' + t.id)">{{ t.text }}</a>\n\nconst task = computed(() => tasks.value.find(t => t.id === Number(route.params.id)))'
  ],
  async check(T) {
    const addr = () => ((T.$('.addr') || {}).textContent || '').replace('地址：', '').trim();
    const h = () => ((T.$('h4') || {}).textContent || '').trim();
    const title = T.$$('a.title').find(a => a.textContent.trim() === '完成练习');
    T.ok(T.$$('a.title').length === 3 && !!title, '列表页显示 3 个任务标题');
    if (!title) return;
    await T.click(title);
    T.ok(addr() === '/task/2', '点击“完成练习”后，地址变为 /task/2（当前：' + addr() + '）');
    T.ok(/完成练习/.test(h()), '详情页显示“完成练习”（当前：' + (h() || T.text().includes('任务不存在') && '任务不存在' || '空') + '）');
    const b1 = T.btn('/task/1'), b99 = T.btn('/task/99');
    if (!b1 || !b99) { T.ok(false, '找到“/task/1”和“/task/99”按钮'); return; }
    await T.click(b1);
    T.ok(/读完响应式原理/.test(h()), '直接打开 /task/1 时，显示“读完响应式原理”');
    await T.click(T.btn('/task/99'));
    T.ok(!T.$('h4') && /任务不存在/.test(T.text()), '打开 /task/99 时，显示“任务不存在”');
  }
}

// ===== 错误解法（基于参考答案做小改动）=====
kanbanSave.wrong = [
  { js: sub(kanbanSave.solJs, ', { deep: true })', ')'), why: 'watch 没有加 deep。push 和 remove 会保存，但勾选只修改某一项的 done，不触发保存。刷新后勾选状态丢了。' },
  { js: sub(kanbanSave.solJs, ', { deep: true })', ', { deep: 1 })'), why: 'deep: 1 只往下看一层，能发现数组元素的增减，发现不了元素里 done 的变化。勾选的状态没有保存。' },
  { js: sub(kanbanSave.solJs, 'watch(tasks, v =>', 'watch(tasks.value, v =>'), why: '侦听 tasks.value，侦听的是创建时的那个数组。remove 把 tasks.value 换成了新数组，之后的修改不再被侦听，删除和勾选都没有保存。' },
  { js: sub(kanbanSave.solJs, 'tasks.value = tasks.value.filter(t => t.id !== id)', 'tasks.value.splice(id, 1)'), why: '把 id 当成了数组下标。id 从 1 开始，删除“完成练习”（id 2）时，实际删掉了下标 2 的任务。' }
]

kanbanDue.wrong = [
  { js: sub(kanbanDue.solJs, "(a.due || LAST).localeCompare(b.due || LAST)", "a.due.localeCompare(b.due)"), why: '没有处理空日期。空字符串小于任何日期，没有日期的任务排在了最前面。' },
  { js: sub(sub(kanbanDue.solJs, "const sorted = computed(() =>\n  [...tasks.value].sort(", "const sorted = [...tasks.value].sort("), "LAST))\n)", "LAST))"), why: 'sorted 不是 computed，只在 setup 里排了一次。修改日期后，列表不会重新排序。' },
  { js: sub(kanbanDue.solJs, "[...tasks.value].sort(", "tasks.value.sort("), why: '在 computed 里直接对 tasks.value 排序。sort 会修改原数组，computed 不应该修改数据。页面看起来正常，但源数据的顺序被改了。' }
]

kanbanStore.wrong = [
  { js: sub(kanbanStore.solJs, "const { left } = storeToRefs(store)   // left 仍是 ref，保持响应", "const { left } = store"), why: 'LeftCount 直接解构 store。left 只得到当前的数字，以后不再更新。添加或勾选后，“还剩”不变。要用 storeToRefs。' },
  { js: sub(kanbanStore.solJs, "const { tasks } = storeToRefs(store)      // state：用 storeToRefs\nconst { add, toggle, remove } = store     // action：直接解构", "const { tasks, add, toggle, remove } = store   // 全部直接解构"), why: 'state 也直接解构了。tasks 拿到的是当时的数组。remove 把 store 里的 tasks.value 换成了新数组，App 手里的还是旧数组，页面上的任务删不掉。' }
]

kanbanRoute.wrong = [
  { js: sub(kanbanRoute.solJs, "const task = computed(() => tasks.value.find(t => t.id === Number(route.params.id)))", "const task = tasks.value.find(t => t.id === Number(route.params.id))"), why: 'task 不是 computed，只在 setup 运行时求值一次。那时 route.params 是空的，之后路由变化，task 不再更新。' },
  { js: sub(kanbanRoute.solJs, "tasks.value.find(t => t.id === Number(route.params.id))", "tasks.value[route.params.id]"), why: '把路由参数当成了数组下标。/task/1 取到的是第二个任务。id 是任务自己的标识，要用 find 按 id 查找。' }
]

kanbanItem.wrong!.push(
  { js: sub(kanbanItem.solJs, "props: { task: { type: Object, required: true } },", "props: ['task'],"), why: 'props 写成了数组，没有声明 task 的类型，也没有写 required。传错类型或漏传时，Vue 不会给出提示。' , expectFail: /TODO 1/ },
  { js: sub(kanbanItem.solJs, "emits: ['toggle', 'remove'],", "emits: [],"), why: '没有声明 TaskItem 发出的事件。页面照样能用，但组件的接口里看不出它会发出 toggle 和 remove，拼错事件名也没有人提醒。', expectFail: /TODO 2/ }
)
