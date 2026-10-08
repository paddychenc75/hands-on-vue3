import type { Exercise } from './types'
import { nextTick } from 'vue'

export const fullNameFill: Exercise = {
  title: '补全：用 computed 包住 getter', ch: 4,
  task: '<p>这是实验台“computed 和方法调用”的全名例子。getter 函数 getFull 已经写好，它记录运行次数。只修改一行 TODO。</p><ol><li>TODO：把 full 改为计算属性。</li><li>修改名字时，全名更新。</li><li>点击“无关状态 tick++”时，getter 不再运行。</li></ol>',
  tpl: '<input class="first" v-model="first">\n<input class="last" v-model="last">\n<p class="full">{{ full }} · {{ full }} · {{ full }}</p>\n<button @click="tick++">无关状态 tick++（{{ tick }}）</button>',
  js: `const first = ref('Evan')
const last = ref('You')
const tick = ref(0)      // 和全名无关的数据
let runs = 0             // getter 的运行次数

// 已给出：getter。从 first 和 last 计算全名
function getFull() {
  runs++
  return first.value + ' ' + last.value
}

const full = getFull()   // TODO：改为计算属性。依赖改变时，全名更新

return { first, last, tick, full, getRuns: () => runs }`,
  solJs: `const first = ref('Evan')
const last = ref('You')
const tick = ref(0)      // 和全名无关的数据
let runs = 0             // getter 的运行次数

// 已给出：getter。从 first 和 last 计算全名
function getFull() {
  runs++
  return first.value + ' ' + last.value
}

const full = computed(getFull)   // 传入函数本身，不调用它

return { first, last, tick, full, getRuns: () => runs }`,
  faded: {
    js: `const first = ref('Evan')
const last = ref('You')
const tick = ref(0)      // 和全名无关的数据
let runs = 0             // getter 的运行次数

// 已给出：getter。从 first 和 last 计算全名
function getFull() {
  runs++
  return first.value + ' ' + last.value
}

const full = /* ✏️ 把 getFull 变成带缓存的计算属性（传函数本身，不调用） */ null

return { first, last, tick, full, getRuns: () => runs }`
  },
  hints: [
    'computed(getter) 返回一个带缓存的 ref。依赖改变时，它重新计算。其他数据改变时，它返回缓存。第 4 章 4.1 节讲了它。现在的代码只调用 getFull() 一次，full 是一个普通字符串。',
    '只改 TODO 这一行。把 getFull 传给 computed。传入函数本身，不要写括号。',
    'const full = computed(getFull)'
  ],
  async check(T) {
    const root = T.$(':scope > div');
    const inst = root && root._vnode && root._vnode.component;
    const runs = () => inst && inst.setupState.getRuns ? inst.setupState.getRuns() : NaN;
    const full = () => ((T.$('p.full') || {}).textContent || '').split('·')[0].trim();
    T.ok(full() === 'Evan You', '初始全名是“Evan You”（当前：' + full() + '）');
    T.ok(runs() === 1, '模板读取 3 次，getter 只运行 1 次（当前 ' + runs() + ' 次）');
    const inp = T.$('input.first');
    if (!inp) { T.ok(false, '找到 first 输入框'); return; }
    inp.value = 'Vue'; inp.dispatchEvent(new Event('input')); await nextTick();
    T.ok(full() === 'Vue You', '把 first 改为 Vue 后，全名变为“Vue You”（当前：' + full() + '）');
    const r1 = runs();
    const b = T.btn('tick++');
    if (!b) { T.ok(false, '找到 tick++ 按钮'); return; }
    await T.click(b); await T.click(T.btn('tick++'));
    T.ok(runs() === r1, '点击 tick++ 两次，getter 不运行，使用缓存（' + r1 + ' → ' + runs() + ' 次）');
  },
  wrong: [
    { js: 'const first = ref(\'Evan\')\nconst last = ref(\'You\')\nconst tick = ref(0)      // 和全名无关的数据\nlet runs = 0             // getter 的运行次数\n\n// 已给出：getter。从 first 和 last 计算全名\nfunction getFull() {\n  runs++\n  return first.value + \' \' + last.value\n}\n\nconst full = getFull()   // 传入函数本身，不调用它\n\nreturn { first, last, tick, full, getRuns: () => runs }', why: '只调用了一次 getFull。full 是普通字符串，改名字后不会更新。要把函数本身传给 computed。' },
    { tpl: '<input class="first" v-model="first">\n<input class="last" v-model="last">\n<p class="full">{{ full() }} · {{ full() }} · {{ full() }}</p>\n<button @click="tick++">无关状态 tick++（{{ tick }}）</button>', js: 'const first = ref(\'Evan\')\nconst last = ref(\'You\')\nconst tick = ref(0)      // 和全名无关的数据\nlet runs = 0             // getter 的运行次数\n\n// 已给出：getter。从 first 和 last 计算全名\nfunction getFull() {\n  runs++\n  return first.value + \' \' + last.value\n}\n\nconst full = getFull   // 传入函数本身，不调用它\n\nreturn { first, last, tick, full, getRuns: () => runs }', why: '把 getter 当方法用，模板调用 full()。结果正确，但每次渲染、每次读取都重新运行，没有缓存：模板读 3 次就运行 3 次。' }
  ]
}

export const cart: Exercise = {
  title: '用 computed 算总价', ch: 4,
  task: '用 computed 定义 total。total 是每项 price × qty 的和。点击 + 或 - 时，总价更新。',
  tpl: '<div v-for="it in items" :key="it.name">\n  {{ it.name }} ¥{{ it.price }} × {{ it.qty }}\n  <button @click="it.qty++">+</button>\n  <button @click="it.qty > 0 && it.qty--">-</button>\n</div>\n<p>总价：{{ total }}</p>',
  js: 'const items = ref([\n  { name: \'键盘\', price: 10, qty: 1 },\n  { name: \'鼠标\', price: 20, qty: 1 }\n])\n\n// TODO：用 computed 计算 total\nconst total = 0\n\nreturn { items, total }',
  solJs: 'const items = ref([\n  { name: \'键盘\', price: 10, qty: 1 },\n  { name: \'鼠标\', price: 20, qty: 1 }\n])\n\nconst total = computed(() =>\n  items.value.reduce((sum, it) => sum + it.price * it.qty, 0)\n)\n\nreturn { items, total }',
  faded: {
    js: `const items = ref([
  { name: '键盘', price: 10, qty: 1 },
  { name: '鼠标', price: 20, qty: 1 }
])

const total = /* ✏️ 总价由 items 算出来：用哪个 API 包住下面的 getter？ */(() =>
  items.value.reduce((sum, it) => sum + /* ✏️ 这一项的小计 */ 0, 0)
)

return { items, total }`
  },
  hints: [
'总价由 items 计算得到，所以用 computed。第 4 章“4.1 computed：从数据算出值”讲了它。依赖改变时，computed 自动重新计算。',
'只改 const total = 0 这一行。写 const total = computed(() => …)。在函数中用 items.value.reduce(…) 求和，每项是 it.price * it.qty。',
'const total = computed(() =>\n  items.value.reduce((sum, it) => sum + it.price * it.qty, 0)\n)'
],
  async check(T) {
    const p = () => { const ps = T.$$('p'); return ps.length ? ps[ps.length - 1].textContent : ''; };
    T.ok(/总价：\s*30\b/.test(p()), '初始总价为 30（当前：' + p().replace('总价：', '') + '）');
    const plus = T.$$('button').filter(b => b.textContent.trim() === '+');
    if (plus.length < 2) { T.ok(false, '找到两个 + 按钮'); return; }
    await T.click(plus[0]);
    T.ok(/总价：\s*40\b/.test(p()), '键盘 +1 后总价为 40');
    await T.click(T.$$('button').filter(b => b.textContent.trim() === '+')[1]);
    T.ok(/总价：\s*60\b/.test(p()), '鼠标 +1 后总价为 60');
    // 改完数据后立刻（不等 DOM 更新、不等侦听器）读取 total：computed 总是最新的，ref 加 watchEffect 手动同步要等到下一轮才更新
    const S = (T.$(':scope > div') as any)?._vnode?.component?.setupState;
    if (S && S.items) {
      S.items[0].qty++;
      T.ok(S.total === 70, 'total 是 computed：数据一改，立刻读到最新值 70（用 ref 再手动同步不行；当前：' + String(S.total) + '）');
    }
  },
  wrong: [
    { js: 'const items = ref([\n  { name: \'键盘\', price: 10, qty: 1 },\n  { name: \'鼠标\', price: 20, qty: 1 }\n])\n\nconst total = items.value.reduce((sum, it) => sum + it.price * it.qty, 0)\n\nreturn { items, total }', why: '没有用 computed，只算了一次。total 是普通数字，点击 + 后不会更新。' },
    { js: 'const items = ref([\n  { name: \'键盘\', price: 10, qty: 1 },\n  { name: \'鼠标\', price: 20, qty: 1 }\n])\n\nconst total = computed(() =>\n  items.value.reduce((sum, it) => sum + it.price, 0)\n)\n\nreturn { items, total }', why: '求和时忘了乘数量 qty。初始每项数量都是 1，总价看起来对，点击 + 后总价不变。' },
    { js: 'const items = ref([\n  { name: \'键盘\', price: 10, qty: 1 },\n  { name: \'鼠标\', price: 20, qty: 1 }\n])\n\nconst total = ref(0)\nwatchEffect(() => {\n  total.value = items.value.reduce((sum, it) => sum + it.price * it.qty, 0)\n})\n\nreturn { items, total }', why: '用 ref 加 watchEffect 手动同步 total。页面上看起来一样，但这是“数据一变就手动算一遍再存起来”，要自己保证同步。侦听器在下一轮才运行，数据刚改完读到的是旧值。派生出来的值用 computed。', expectFail: /total 是 computed/ }
  ]
}

export const phenoFilter: Exercise = {
  title: '看现象：新任务没有出现在列表中', ch: 4,
  task: '<p>看板有“全部”和“未完成”两个筛选按钮。</p><ol><li>点击“添加任务”。新任务没有出现在列表中。</li><li>点击“未完成”，再点击“添加任务”。新任务也没有出现。</li><li>切换一次筛选按钮后，新任务才出现。</li></ol><p>期望：无论选了哪个筛选按钮，新任务都立即出现在列表中。只修改脚本。</p>',
  tpl: '<button @click="filter = \'all\'">全部</button>\n<button @click="filter = \'active\'">未完成</button>\n<button @click="add">添加任务</button>\n<ul>\n  <li v-for="t in shown" :key="t.id">{{ t.text }}</li>\n</ul>',
  js: `const tasks = ref([
  { id: 1, text: '写周报', done: true },
  { id: 2, text: '修复登录', done: false }
])
const filter = ref('all')
let nextId = 3
function add() {
  tasks.value.push({ id: nextId, text: '新任务 ' + nextId, done: false })
  nextId++
}

const shown = ref([])
watch(filter, f => {
  shown.value = tasks.value.filter(t => f === 'all' || !t.done)
}, { immediate: true })

return { filter, shown, add }`,
  solJs: `const tasks = ref([
  { id: 1, text: '写周报', done: true },
  { id: 2, text: '修复登录', done: false }
])
const filter = ref('all')
let nextId = 3
function add() {
  tasks.value.push({ id: nextId, text: '新任务 ' + nextId, done: false })
  nextId++
}

// 列表从 tasks 和 filter 算出来。任何一个改变，都重新计算
const shown = computed(() =>
  tasks.value.filter(t => filter.value === 'all' || !t.done)
)

return { filter, shown, add }`,
  faded: {
    js: `const tasks = ref([
  { id: 1, text: '写周报', done: true },
  { id: 2, text: '修复登录', done: false }
])
const filter = ref('all')
let nextId = 3
function add() {
  tasks.value.push({ id: nextId, text: '新任务 ' + nextId, done: false })
  nextId++
}

// 不再另存一份：显示的列表直接从 tasks 和 filter 算出来
const shown = /* ✏️ 读取 tasks 和 filter，得到筛选后的数组；依赖变了它要自动更新 */ []

return { filter, shown, add }`
  },
  hints: [
    '原因：shown 是一份复制出来的数据。只有筛选条件改变时，代码才重新复制。tasks 改变时，没有代码更新这份复制。显示的列表可以从 tasks 和 filter 直接算出来，不需要保存第二份数据。本章最后“注意”的第 3 条讲了这个问题。',
    '删除 const shown = ref([]) 和整个侦听器。把 shown 改为一个“从其他数据算出来”的值：它读取 tasks 和 filter，返回筛选后的数组。在脚本中读取 ref 要写 .value。',
    "const shown = computed(() =>\n  tasks.value.filter(t => filter.value === 'all' || !t.done)\n)"
  ],
  wrong: [
    { js: `const tasks = ref([
  { id: 1, text: '写周报', done: true },
  { id: 2, text: '修复登录', done: false }
])
const filter = ref('all')
let nextId = 3
function add() {
  tasks.value.push({ id: nextId, text: '新任务 ' + nextId, done: false })
  nextId++
}

const shown = ref([])
watch(filter, f => {
  shown.value = tasks.value.filter(t => f === 'all' || !t.done)
}, { immediate: true, deep: true })

return { filter, shown, add }`, why: 'deep 只让侦听器跟踪 filter 的内部。侦听器仍然不跟踪 tasks，所以添加任务不触发它。' },
    { js: `const tasks = ref([
  { id: 1, text: '写周报', done: true },
  { id: 2, text: '修复登录', done: false }
])
const filter = ref('all')
let nextId = 3
function add() {
  tasks.value.push({ id: nextId, text: '新任务 ' + nextId, done: false })
  nextId++
}

const shown = ref([])
watch([filter, tasks], ([f, list]) => {
  shown.value = list.filter(t => f === 'all' || !t.done)
}, { immediate: true })

return { filter, shown, add }`, why: '侦听 ref 时，只有替换 .value 才触发。push 只修改数组，不替换它。即使改对了，仍要维护两份数据。' }
  ],
  async check(T) {
    const items = () => T.$$('li').map(li => li.textContent.trim());
    T.ok(items().length === 2, '初始“全部”显示 2 个任务（当前 ' + items().length + ' 个）');
    const add = T.btn('添加任务');
    if (!add || !T.btn('未完成')) { T.ok(false, '找到“添加任务”和“未完成”按钮'); return; }
    await T.click(add);
    T.ok(items().includes('新任务 3'), '在“全部”中添加后，立即显示“新任务 3”（当前：' + items().join('、') + '）');
    await T.click(T.btn('未完成'));
    T.ok(items().length === 2 && !items().includes('写周报'), '“未完成”只显示 2 个没有完成的任务（当前：' + items().join('、') + '）');
    await T.click(T.btn('添加任务'));
    T.ok(items().includes('新任务 4'), '在“未完成”中添加后，立即显示“新任务 4”（当前：' + items().join('、') + '）');
  }
}

export const phenoRace: Exercise = {
  title: '看现象：详情显示的不是最后点击的任务', ch: 4,
  task: '<p>点击任务按钮，详情区加载并显示这个任务。加载任务 1 需要 200 毫秒，加载任务 2 需要 30 毫秒。</p><ol><li>点击“任务 1”，然后立即点击“任务 2”。</li><li>详情先显示任务 2，然后变为任务 1。</li></ol><p>期望：详情总是显示最后点击的任务。只修改脚本中的侦听器。</p>',
  tpl: '<button @click="id = 1">任务 1</button>\n<button @click="id = 2">任务 2</button>\n<p class="detail">详情：{{ detail }}</p>',
  js: `// ===== 已给出：模拟请求。任务 1 慢，任务 2 快 =====
function fetchTask(id) {
  const ms = id === 1 ? 200 : 30
  return new Promise(resolve => setTimeout(() => resolve('任务 ' + id + ' 的内容'), ms))
}

const id = ref(0)
const detail = ref('请选择一个任务')

watch(id, async newId => {
  const text = await fetchTask(newId)
  detail.value = text
})

return { id, detail }`,
  solJs: `// ===== 已给出：模拟请求。任务 1 慢，任务 2 快 =====
function fetchTask(id) {
  const ms = id === 1 ? 200 : 30
  return new Promise(resolve => setTimeout(() => resolve('任务 ' + id + ' 的内容'), ms))
}

const id = ref(0)
const detail = ref('请选择一个任务')

watch(id, async (newId, _old, onCleanup) => {
  let cancelled = false
  onCleanup(() => { cancelled = true })   // 下一次运行前，标记这一次已经过期
  const text = await fetchTask(newId)
  if (!cancelled) detail.value = text     // 过期的结果丢弃
})

return { id, detail }`,
  faded: {
    js: `// ===== 已给出：模拟请求。任务 1 慢，任务 2 快 =====
function fetchTask(id) {
  const ms = id === 1 ? 200 : 30
  return new Promise(resolve => setTimeout(() => resolve('任务 ' + id + ' 的内容'), ms))
}

const id = ref(0)
const detail = ref('请选择一个任务')

watch(id, async (newId, _old, /* ✏️ 第三个参数：用来注册清理函数的函数 */) => {
  let cancelled = false
  /* ✏️ 注册清理函数：下一次运行前，把这一次标记为过期 */
  const text = await fetchTask(newId)
  /* ✏️ 这一次已过期的话，结果不要写进 detail */
  detail.value = text
})

return { id, detail }`
  },
  hints: [
    '原因：两个请求同时进行。任务 1 的请求后返回，它的结果覆盖了任务 2 的结果。新的一次运行开始时，要让上一次运行知道“我已经过期”。过期的结果直接丢弃。第 4 章 4.4 节按时间顺序画出了这个过程。',
    '侦听器回调的第三个参数是一个注册函数。它注册的函数在下一次运行回调之前运行。在回调开头声明 let cancelled = false，并注册“把 cancelled 设为 true”。请求返回后，cancelled 为 true 时不赋值。',
    'watch(id, async (newId, _old, onCleanup) => {\n  let cancelled = false\n  onCleanup(() => { cancelled = true })\n  const text = await fetchTask(newId)\n  if (!cancelled) detail.value = text\n})'
  ],
  wrong: [
    { js: `function fetchTask(id) {
  const ms = id === 1 ? 200 : 30
  return new Promise(resolve => setTimeout(() => resolve('任务 ' + id + ' 的内容'), ms))
}

const id = ref(0)
const detail = ref('请选择一个任务')

let loading = false
watch(id, async newId => {
  if (loading) return
  loading = true
  const text = await fetchTask(newId)
  detail.value = text
  loading = false
})

return { id, detail }`, why: '请求进行中时忽略新的选择。用户最后点击的任务 2 不加载，详情停在任务 1。' }
  ],
  async check(T) {
    const wait = n => new Promise(r => setTimeout(r, n));
    const d = () => ((T.$('p.detail') || {}).textContent || '').replace(/^[^：]*：/, '').trim();
    const b1 = T.btn('任务 1'), b2 = T.btn('任务 2');
    if (!b1 || !b2) { T.ok(false, '找到“任务 1”和“任务 2”按钮'); return; }
    await T.click(b2);
    await wait(80);
    T.ok(d() === '任务 2 的内容', '只点击“任务 2”时，显示任务 2（当前：' + d() + '）');
    await T.click(T.btn('任务 1'));
    await T.click(T.btn('任务 2'));
    await wait(280);
    T.ok(d() === '任务 2 的内容', '点击“任务 1”后立即点击“任务 2”，最后显示任务 2（当前：' + d() + '）');
  }
}
