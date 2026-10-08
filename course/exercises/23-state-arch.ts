import type { Exercise } from './types'
import { sub } from './types'
import { nextTick } from 'vue'

// ---------------------------------------------------------------------------
// 练习 1：把筛选条件从组件状态迁到地址栏（23.4）
// 练习台不能运行真实的 Vue Router，所以脚本里有一个迷你地址栏：
// 它保存一个历史栈，提供 route.query、push、replace、back，行为和 Vue Router 对应的部分一致。
// ---------------------------------------------------------------------------

const miniBar = `// ===== 已给出：迷你地址栏（不用修改） =====
// 历史栈和当前位置。route.query 总是从当前地址解析出来，值都是字符串。
const entries = ref(['/tasks'])
const at = ref(0)
const url = computed(() => entries.value[at.value])
const route = {
  get query() {
    const q = {}
    new URLSearchParams(url.value.split('?')[1] || '').forEach((v, k) => { q[k] = v })
    return q
  }
}
function toUrl(query) {
  // 和 Vue Router 一样：值为 undefined 的参数被删除，空字符串会保留成 kw=
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null) p.set(k, String(v))
  const s = p.toString()
  return '/tasks' + (s ? '?' + s : '')
}
function push(query) {            // 添加一条历史记录，同时丢掉"前进"方向的记录
  entries.value = [...entries.value.slice(0, at.value + 1), toUrl(query)]
  at.value++
}
function replace(query) {         // 替换当前历史记录
  entries.value = entries.value.map((e, i) => (i === at.value ? toUrl(query) : e))
}
function back() { if (at.value > 0) at.value-- }
function openShared() { push({ status: 'done', kw: '测试' }) }   // 模拟：用户点开了同事发来的链接
`

const taskData = `const tasks = [
  { id: 1, title: '学 Vue 路由', done: true },
  { id: 2, title: '写 Pinia store', done: false },
  { id: 3, title: '读 Vue 源码', done: false },
  { id: 4, title: '写 Vue 测试', done: true },
  { id: 5, title: '整理 Router 笔记', done: false },
  { id: 6, title: '部署 Vue 项目', done: false }
]
`

const shown = `const shown = computed(() =>
  tasks.filter(t =>
    (status.value === 'all' || (status.value === 'done') === t.done) &&
    t.title.toLowerCase().includes(kw.value.toLowerCase())
  )
)
`

const urlStart = `${taskData}
// TODO：status 和 kw 现在是组件自己的 ref：刷新会丢，链接也分享不了，后退按钮不起作用
// 把它们改成从地址栏读取，修改时写回地址栏
const status = ref('all')                  // 'all' | 'todo' | 'done'
const kw = ref('')
function setStatus(s) { status.value = s }

${shown}
${miniBar}
return { tasks, status, kw, setStatus, shown, url, entries, back, openShared }`

const urlSolCore = `// status 和 kw 都是从地址栏算出来的，组件里没有另一份副本
const status = computed(() => route.query.status ?? 'all')
const kw = computed({
  get: () => route.query.kw ?? '',
  set: v => replace({ ...route.query, kw: v || undefined })   // 连续输入用 replace，清空时删除参数
})
function setStatus(s) { push({ ...route.query, status: s }) }   // 每次切换是一次导航，用 push
`

const urlSolJs = `${taskData}
${urlSolCore}
${shown}
${miniBar}
return { tasks, status, kw, setStatus, shown, url, entries, back, openShared }`

const urlFadedJs = `${taskData}
// status 和 kw 都是从地址栏算出来的，组件里没有另一份副本
const status = computed(() => /* ✏️ 从 route.query 读 status，没有时是 'all' */)
const kw = computed({
  get: () => /* ✏️ 从 route.query 读 kw，没有时是空字符串 */,
  set: v => /* ✏️ 连续输入用哪种导航？清空时 kw 参数要被删除 */
})
function setStatus(s) { /* ✏️ 切换筛选是一次有意义的导航：要能用后退回到上一个筛选 */ }

${shown}
${miniBar}
return { tasks, status, kw, setStatus, shown, url, entries, back, openShared }`

const urlTpl = `<div class="bar">
  <button v-for="s in ['all', 'todo', 'done']" :key="s" :class="{ on: status === s }" @click="setStatus(s)">{{ { all: '全部', todo: '未完成', done: '已完成' }[s] }}</button>
  <input id="kw" v-model="kw" placeholder="搜索标题">
</div>
<ul><li v-for="t in shown" :key="t.id" class="task">{{ t.title }}{{ t.done ? ' ✓' : '' }}</li></ul>
<p>地址：<code id="url">{{ url }}</code>（历史记录 <span id="len">{{ entries.length }}</span> 条）</p>
<button @click="back()">后退</button>
<button @click="openShared()">打开同事发来的链接</button>`

function titles(T: any): string {
  return T.$$('li.task').map((li: Element) => (li.textContent || '').trim()).join('|')
}
async function typeInto(T: any, el: HTMLInputElement, v: string) {
  el.value = v
  el.dispatchEvent(new Event('input'))
  await nextTick()
  await nextTick()
}

export const urlFilter: Exercise = {
  title: '把筛选条件迁到 URL：刷新、分享和后退都可用',
  ch: 23,
  task: `<p>任务列表有两个筛选条件：状态（全部、未完成、已完成）和关键字。现在它们是组件自己的 <code>ref</code>。刷新会丢，链接分享不了，后退按钮也不起作用。</p>
<p>说明：练习台不能运行真实的 Vue Router。脚本下半部分有一个迷你地址栏，和第 22 章的练习用同一类办法。它的 <code>route.query</code>、<code>push</code>、<code>replace</code>、<code>back</code> 的行为和 Vue Router 对应的部分一致。只改标有 TODO 的部分。</p>
<ol>
<li>让 <code>status</code> 和 <code>kw</code> 都从 <code>route.query</code> 读取。没有参数时，<code>status</code> 是 <code>'all'</code>，<code>kw</code> 是空字符串。组件里不能再有保存它们的 <code>ref</code>。</li>
<li>点状态按钮时用 <code>push</code> 写入 <code>status</code>，同时保留已有的 <code>kw</code>。这样后退能回到上一个状态。</li>
<li>在输入框里打字时用 <code>replace</code> 写入 <code>kw</code>，不增加历史记录。清空输入框后，地址里不能留下 <code>kw=</code>。</li>
</ol>`,
  tpl: urlTpl,
  js: urlStart,
  solJs: urlSolJs,
  faded: { js: urlFadedJs },
  hints: [
    '先想这份状态的唯一数据源是什么。地址栏就是数据源，所以 status 和 kw 应该是 computed，从 route.query 算出来。',
    'route.query 里的值是字符串，没有这个参数时是 undefined。用 ?? 给默认值。',
    'kw 要能被 v-model 写入，所以用可写的 computed。set 里调用 replace，把已有的 query 展开，再覆盖 kw。',
    '空字符串写进地址会留下 kw=。写成 v || undefined，undefined 会让参数被删除。第 22 章“22.4 编程式导航和 query”的看板筛选就是这个写法。',
    urlSolCore
  ],
  async check(T) {
    const url = () => (T.$('#url')?.textContent || '').trim()
    const len = () => Number(T.$('#len')?.textContent)
    const inp = T.$('#kw') as HTMLInputElement | null
    T.ok(!!inp, '页面上有 id 为 kw 的输入框')
    if (!inp) return
    T.ok(T.$$('li.task').length === 6, '初始显示 6 个任务（现在 ' + T.$$('li.task').length + ' 个）')
    // 1. 状态按钮写入地址
    await T.click(T.btn('未完成'))
    T.ok(url().includes('status=todo'), '点“未完成”后，地址里有 status=todo（现在是 ' + url() + '）')
    T.ok(T.$$('li.task').length === 4, '未完成的任务有 4 个（现在 ' + T.$$('li.task').length + ' 个）')
    const lenAfterStatus = len()
    T.ok(lenAfterStatus === 2, '切换状态用 push，历史记录是 2 条（现在 ' + lenAfterStatus + ' 条）')
    // 2. 打字用 replace
    await typeInto(T, inp, 'p')
    await typeInto(T, inp, 'pinia')
    T.ok(url().includes('kw=pinia') && url().includes('status=todo'), '输入后，地址同时保留 status 并带上 kw=pinia（现在是 ' + url() + '）')
    T.ok(titles(T) === '写 Pinia store', '只剩“写 Pinia store”（现在是 ' + titles(T) + '）')
    T.ok(len() === lenAfterStatus, '输入时用 replace，历史记录条数不应增加（从 ' + lenAfterStatus + ' 变成 ' + len() + '）')
    // 3. 带着关键字切换状态：已有的 kw 要保留，后退能回来
    await T.click(T.btn('全部'))
    T.ok(url().includes('kw=pinia'), '带着关键字切换状态时，已有的 kw 应保留（现在是 ' + url() + '）')
    T.ok(len() === lenAfterStatus + 1, '再次切换状态用 push，历史记录是 ' + (lenAfterStatus + 1) + ' 条（现在 ' + len() + ' 条）')
    await T.click(T.btn('后退'))
    T.ok(url().includes('status=todo') && url().includes('kw=pinia'), '后退回到“未完成 + pinia”（现在是 ' + url() + '）')
    // 4. 清空
    await typeInto(T, inp, '')
    T.ok(!url().includes('kw'), '清空输入框后，地址里不应有 kw 参数（现在是 ' + url() + '）')
    T.ok(url().includes('status=todo'), '清空关键字后，status 仍保留')
    // 5. 再后退一步，回到最初的状态
    await T.click(T.btn('后退'))
    T.ok(!url().includes('status'), '后退后，地址回到没有 status 的状态（现在是 ' + url() + '）')
    T.ok(T.$$('li.task').length === 6, '后退后，列表回到 6 个任务（现在 ' + T.$$('li.task').length + ' 个）')
    const on = T.$('.bar button.on')
    T.ok(!!on && (on.textContent || '').includes('全部'), '后退后，“全部”按钮是激活状态')
    // 6. 地址从外部变化：界面必须跟着变
    await T.click(T.btn('打开同事发来的链接'))
    T.ok(titles(T) === '写 Vue 测试 ✓', '打开分享链接后，列表只剩“写 Vue 测试”（现在是 ' + titles(T) + '）')
    T.ok((inp.value || '') === '测试', '打开分享链接后，输入框显示“测试”（现在是“' + inp.value + '”）')
    const on2 = T.$('.bar button.on')
    T.ok(!!on2 && (on2.textContent || '').includes('已完成'), '打开分享链接后，“已完成”按钮是激活状态')
  },
  wrong: [
    {
      js: sub(urlSolJs, urlSolCore, `const status = ref('all')\nconst kw = computed({\n  get: () => route.query.kw ?? '',\n  set: v => replace({ ...route.query, kw: v || undefined })\n})\nfunction setStatus(s) { status.value = s; push({ ...route.query, status: s }) }\n`),
      why: '把 status 留在 ref 里，同时再写一份到地址栏。地址只被写入，没有被读取，所以地址从外部变化（后退、分享链接）时界面不会跟着变。两份数据迟早不一致。',
      expectFail: /后退后|打开分享链接/
    },
    {
      js: sub(urlSolJs, 'set: v => replace({ ...route.query, kw: v || undefined })', 'set: v => push({ ...route.query, kw: v || undefined })'),
      why: '每输入一个字就 push 一条历史记录。用户要按很多次后退才能离开搜索。连续输入用 replace。',
      expectFail: /replace/
    },
    {
      js: sub(urlSolJs, 'kw: v || undefined', 'kw: v'),
      why: '空字符串不会让参数被删除，地址里会留下 kw=。要写成 v || undefined。',
      expectFail: /不应有 kw/
    },
    {
      js: sub(urlSolJs, 'push({ ...route.query, status: s })', 'push({ status: s })'),
      why: '切换状态时丢掉了已有的 kw。写入 query 时先展开已有的参数，再覆盖要改的那一个。',
      expectFail: /已有的 kw 应保留/
    }
  ]
}

// ---------------------------------------------------------------------------
// 练习 2：把重复存储改成单一数据源，并按 id 规范化（23.3、23.8）
// ---------------------------------------------------------------------------

const normTpl = `<ul><li v-for="t in list" :key="t.id" class="task">{{ t.title }}{{ t.done ? ' ✓' : '' }}</li></ul>
<p id="left">还剩 {{ left }} 项</p>
<p id="done">已完成：{{ doneList.map(t => t.title).join('、') || '无' }}</p>
<p id="selected">选中：{{ selected ? selected.title : '无' }}</p>
<button @click="toggle(1)">切换任务 1</button>
<button @click="select(2)">选中任务 2</button>
<button @click="rename(2, '新名字')">给任务 2 改名</button>
<button @click="remove(2)">删除任务 2</button>
<button @click="load(fresh)">用服务器数据刷新</button>
<pre id="dump">{{ JSON.stringify(store) }}</pre>`

const normFresh = `// 服务器返回的新列表：任务 2 被别人改了名，任务 3 被删除，多了任务 4
const fresh = [
  { id: 1, title: '写测试', done: true },
  { id: 2, title: '别人改的名字', done: false },
  { id: 4, title: '新任务', done: false }
]
`

const normStart = `// 这个 store 把同一批任务存了三份：tasks、doneTasks、selected。
// 改名、删除、刷新时，要手动同步另外两份。下面的 toggle 同步了，别的操作漏了。
// TODO：改成只存 byId、ids、selectedId 三个字段。doneList、left、selected 等都用 computed 算出来
const store = reactive({
  tasks: [
    { id: 1, title: '写测试', done: false },
    { id: 2, title: '读源码', done: false },
    { id: 3, title: '整理笔记', done: false }
  ],
  doneTasks: [],
  selected: null
})
const list = computed(() => store.tasks)
const left = computed(() => store.tasks.length - store.doneTasks.length)
const doneList = computed(() => store.doneTasks)
const selected = computed(() => store.selected)

function toggle(id) {
  const t = store.tasks.find(t => t.id === id)
  if (t) t.done = !t.done
  store.doneTasks = store.tasks.filter(t => t.done)
}
function select(id) { store.selected = { ...store.tasks.find(t => t.id === id) } }
function rename(id, title) { store.tasks.find(t => t.id === id).title = title }
function remove(id) { store.tasks = store.tasks.filter(t => t.id !== id) }
function load(items) { store.tasks = items }

${normFresh}
return { store, list, left, doneList, selected, toggle, select, rename, remove, load, fresh }`

const normSolCore = `const store = reactive({
  byId: {
    1: { id: 1, title: '写测试', done: false },
    2: { id: 2, title: '读源码', done: false },
    3: { id: 3, title: '整理笔记', done: false }
  },
  ids: [1, 2, 3],          // 列表只存 id，同时记录顺序
  selectedId: null         // 选中项只存 id，不存对象副本
})
// 其余都是派生：不存储，每次从 byId 和 ids 算出来
const list = computed(() => store.ids.map(id => store.byId[id]))
const doneList = computed(() => list.value.filter(t => t.done))
const left = computed(() => list.value.length - doneList.value.length)
const selected = computed(() => store.byId[store.selectedId] ?? null)

function toggle(id) { const t = store.byId[id]; if (t) t.done = !t.done }
function select(id) { store.selectedId = id }
function rename(id, title) { const t = store.byId[id]; if (t) t.title = title }
function remove(id) {
  delete store.byId[id]
  store.ids = store.ids.filter(i => i !== id)
}
function load(items) {
  store.byId = Object.fromEntries(items.map(t => [t.id, t]))
  store.ids = items.map(t => t.id)
}
`

const normSolJs = `${normSolCore}
${normFresh}
return { store, list, left, doneList, selected, toggle, select, rename, remove, load, fresh }`

const normFadedJs = `const store = reactive({
  byId: {
    1: { id: 1, title: '写测试', done: false },
    2: { id: 2, title: '读源码', done: false },
    3: { id: 3, title: '整理笔记', done: false }
  },
  ids: [1, 2, 3],
  selectedId: null
})
const list = computed(() => /* ✏️ 按 ids 的顺序，从 byId 取出每个任务 */)
const doneList = computed(() => list.value.filter(t => t.done))
const left = computed(() => /* ✏️ 总数减去已完成数 */)
const selected = computed(() => /* ✏️ 用 selectedId 从 byId 查，查不到时是 null */)

function toggle(id) { const t = store.byId[id]; if (t) t.done = !t.done }
function select(id) { store.selectedId = id }
function rename(id, title) { /* ✏️ 只改 byId 里唯一的那一份 */ }
function remove(id) {
  /* ✏️ 从 byId 里删除，并且从 ids 里去掉 */
}
function load(items) {
  store.byId = Object.fromEntries(items.map(t => [t.id, t]))
  store.ids = items.map(t => t.id)
}

${normFresh}
return { store, list, left, doneList, selected, toggle, select, rename, remove, load, fresh }`

export const singleSource: Exercise = {
  title: '重复存储导致不一致：改成单一数据源加派生',
  ch: 23,
  task: `<p>下面的 store 把同一批任务存了三份：<code>tasks</code>、<code>doneTasks</code>、<code>selected</code>。<code>toggle</code> 记得同步，改名、删除、刷新数据时漏了。先点按钮复现不一致：选中任务 2，再给它改名，看“选中”那一行。</p>
<p>说明：练习台没有 Pinia，所以用 <code>reactive</code> 对象模拟 store。getter 写成 <code>computed</code>，和 setup store 里的写法一样。模板和 <code>fresh</code> 数据已经给好，只改 store 部分。</p>
<ol>
<li>store 的 state 只能有三个字段：<code>byId</code>（按 id 存任务）、<code>ids</code>（任务 id 的顺序）、<code>selectedId</code>（选中项只存 id）。</li>
<li><code>list</code>、<code>doneList</code>、<code>left</code>、<code>selected</code> 都用 <code>computed</code> 从 state 算出来，不单独存储。</li>
<li>改写 <code>rename</code>、<code>remove</code>、<code>load</code>，让每个任务只有一份数据。删除选中的任务后，“选中”显示“无”。</li>
</ol>`,
  tpl: normTpl,
  js: normStart,
  solJs: normSolJs,
  faded: { js: normFadedJs },
  hints: [
    '单一数据源的做法：每个事实只在一个地方写入，其他值都用 computed 算出来。任务本身存在 byId 里，列表顺序存在 ids 里，选中项只记 id。',
    'list 是 store.ids.map(id => store.byId[id])。doneList、left 都从 list 算。selected 用 selectedId 去 byId 里查，查不到是 undefined，用 ?? null 转成 null。',
    'rename 只改 byId[id].title 这一处。因为 list 和 selected 都读同一个对象，它们自动更新。',
    'remove 要同时处理 byId 和 ids。只删其中一个，另一个会留下悬空的引用。',
    normSolCore
  ],
  async check(T) {
    const dump = () => {
      try { return JSON.parse(T.$('#dump')?.textContent || '') } catch { return null }
    }
    const rows = () => T.$$('li.task').map(li => (li.textContent || '').trim())
    const sel = () => (T.$('#selected')?.textContent || '').trim()
    const d0 = dump()
    T.ok(!!d0, '页面上有 id 为 dump 的 store 内容')
    if (!d0) return
    const keys = Object.keys(d0).sort().join(',')
    T.ok(keys === 'byId,ids,selectedId', 'store 的 state 只能有 byId、ids、selectedId 三个字段（现在是 ' + keys + '）')
    T.ok(!!d0.byId && typeof d0.byId === 'object' && !Array.isArray(d0.byId), 'byId 是按 id 索引的对象')
    T.ok(Array.isArray(d0.ids) && d0.ids.join() === '1,2,3', 'ids 是 [1, 2, 3]')
    T.ok(rows().join('|') === '写测试|读源码|整理笔记', '列表按 ids 的顺序显示（现在是 ' + rows().join('|') + '）')
    T.ok((T.$('#left')?.textContent || '').includes('还剩 3 项'), '初始还剩 3 项')
    await T.click(T.btn('切换任务 1'))
    T.ok((T.$('#done')?.textContent || '').includes('写测试'), '切换任务 1 后，已完成里有“写测试”')
    T.ok((T.$('#left')?.textContent || '').includes('还剩 2 项'), '切换后还剩 2 项（getter 自动更新）')
    await T.click(T.btn('选中任务 2'))
    T.ok(sel().includes('读源码'), '选中任务 2 后，显示“读源码”')
    await T.click(T.btn('给任务 2 改名'))
    T.ok(rows().includes('新名字'), '改名后，列表里是“新名字”')
    T.ok(sel().includes('新名字'), '改名后，“选中”也应是“新名字”，不能是旧副本（现在是 ' + sel() + '）')
    await T.click(T.btn('删除任务 2'))
    T.ok(rows().join('|') === '写测试 ✓|整理笔记', '删除任务 2 后，列表只剩任务 1 和 3（现在是 ' + rows().join('|') + '）')
    T.ok(sel().includes('无'), '删除选中的任务后，“选中”应显示“无”（现在是 ' + sel() + '）')
    await T.click(T.btn('选中任务 2'))
    await T.click(T.btn('用服务器数据刷新'))
    T.ok(rows().join('|') === '写测试 ✓|别人改的名字|新任务', '刷新后，列表按服务器数据显示（现在是 ' + rows().join('|') + '）')
    T.ok(sel().includes('别人改的名字'), '刷新后，选中的任务 2 显示服务器上的新名字（现在是 ' + sel() + '）')
    const d1 = dump()
    T.ok(!!d1 && !('3' in d1.byId) && d1.ids.join() === '1,2,4', '刷新后，byId 里没有已被服务器删除的任务 3，ids 是 [1, 2, 4]')
    T.ok((T.$('#done')?.textContent || '').includes('写测试') && !(T.$('#done')?.textContent || '').includes('新任务'), '刷新后，已完成只有“写测试”')
  },
  wrong: [
    {
      js: sub(sub(sub(normSolJs, `  selectedId: null         // 选中项只存 id，不存对象副本\n})`, `  selectedId: null\n})\nconst selCopy = ref(null)`), `const selected = computed(() => store.byId[store.selectedId] ?? null)`, `const selected = computed(() => selCopy.value)`), `function select(id) { store.selectedId = id }`, `function select(id) { store.selectedId = id; selCopy.value = { ...store.byId[id] } }`),
      why: 'state 的字段是对的，但 selected 在选中那一刻存了任务的副本。副本不会跟着原任务变化，改名和服务器刷新后显示旧数据。选中项应该只存 id，selected 每次从 byId 查。',
      expectFail: /选中.*新名字|应显示|刷新后/
    },
    {
      js: sub(normSolJs, '  delete store.byId[id]\n  store.ids = store.ids.filter(i => i !== id)', '  store.ids = store.ids.filter(i => i !== id)'),
      why: 'remove 只改了 ids，byId 里的任务还在，selectedId 仍然指向它，所以删除后“选中”还显示旧任务。删除要把实体和所有指向它的 id 一起清理。',
      expectFail: /应显示“无”|删除/
    },
    {
      js: sub(sub(normSolJs, 'selectedId: null         // 选中项只存 id，不存对象副本', 'selectedId: null,\n  doneIds: []'), 'function toggle(id) { const t = store.byId[id]; if (t) t.done = !t.done }', 'function toggle(id) { const t = store.byId[id]; if (t) t.done = !t.done; store.doneIds = list.value.filter(t => t.done).map(t => t.id) }'),
      why: '多存了一个 doneIds：它又是一份可以从 byId 算出来的数据，只在 toggle 里手动同步。rename、remove、load 还要各自记得同步。已完成的任务应该用 computed 算，不要存。',
      expectFail: /只能有 byId/
    }
  ]
}
