import type { Exercise } from './types'
import { sub } from './types'
import { nextTick } from 'vue'

export const focusTick: Exercise = {
  title: '修复：输入框没有获得焦点', ch: 25,
  task: '<p>点击“编辑”时，输入框出现，并且应该获得焦点。现在点击后，页面报错，输入框也没有焦点。只修改脚本，修复这个错误。</p>',
  tpl: '<p>名称：{{ name }}</p>\n<button @click="startEdit">编辑</button>\n<input v-if="editing" ref="inputRef" v-model="name">',
  js: `const name = ref('Vue')
const editing = ref(false)
const inputRef = ref(null)   // 模板中 ref="inputRef" 的元素

function startEdit() {
  editing.value = true
  inputRef.value.focus()
}

return { name, editing, inputRef, startEdit }`,
  solJs: `const name = ref('Vue')
const editing = ref(false)
const inputRef = ref(null)   // 模板中 ref="inputRef" 的元素

async function startEdit() {
  editing.value = true
  await nextTick()           // 等待 DOM 更新。这时 input 已在页面上
  inputRef.value.focus()
}

return { name, editing, inputRef, startEdit }`,
  faded: {
    js: `const name = ref('Vue')
const editing = ref(false)
const inputRef = ref(null)   // 模板中 ref="inputRef" 的元素

/* ✏️ 函数里要等待，函数声明前要加什么关键字 */ function startEdit() {
  editing.value = true
  /* ✏️ 等待这次 DOM 更新完成：输入框这时才会出现 */
  inputRef.value.focus()
}

return { name, editing, inputRef, startEdit }`
  },
  hints: [
    '原因：修改 editing 后，Vue 不立即更新 DOM。下一行代码运行时，输入框还没有创建，inputRef.value 是 null，所以报错。要等这次 DOM 更新完成，再调用 focus()。第 7 章 7.4 节讲了怎样等这次更新，25.1 节讲了原因。',
    '只改 startEdit。把它改为 async 函数。在 inputRef.value.focus() 之前，加一行 await …。',
    'async function startEdit() {\n  editing.value = true\n  await nextTick()\n  inputRef.value.focus()\n}'
  ],
  async check(T) {
    T.ok(!T.$('input'), '初始时没有输入框');
    const b = T.btn('编辑');
    if (!b) { T.ok(false, '找到“编辑”按钮'); return; }
    await T.click(b);
    await new Promise(r => setTimeout(r, 0));
    const input = T.$('input');
    T.ok(!!input, '点击“编辑”后显示输入框');
    T.ok(!!input && document.activeElement === input, '输入框获得焦点');
  },
  wrong: [
    { js: 'const name = ref(\'Vue\')\nconst editing = ref(false)\nconst inputRef = ref(null)   // 模板中 ref="inputRef" 的元素\n\nasync function startEdit() {\n  editing.value = true\n  nextTick()         // 等待 DOM 更新。这时 input 已在页面上\n  inputRef.value.focus()\n}\n\nreturn { name, editing, inputRef, startEdit }', why: '调用了 nextTick() 但没有 await。下一行立即执行，输入框还没创建，inputRef.value 是 null，报错。' },
    { js: 'const name = ref(\'Vue\')\nconst editing = ref(false)\nconst inputRef = ref(null)   // 模板中 ref="inputRef" 的元素\n\nasync function startEdit() {\n  await nextTick()\n  editing.value = true\n  inputRef.value.focus()\n}\n\nreturn { name, editing, inputRef, startEdit }', why: 'await nextTick() 放在了修改 editing 之前。它等的是上一轮更新，修改之后的这一轮 DOM 更新没有等，inputRef 仍是 null。' }
  ]
}

export const phenoHeight: Exercise = {
  title: '看现象：添加一项后，显示的高度是旧的', ch: 25,
  task: '<p>点击“添加一项”。代码向列表添加一项，然后读取列表的高度并显示它。</p><ol><li>点击几次“添加一项”。显示的高度总是少一行：它是添加之前的高度。</li></ol><p>期望：显示的高度等于列表当前的实际高度。只修改脚本。</p>',
  tpl: '<ul ref="listEl" style="margin: 0">\n  <li v-for="it in items" :key="it" style="height: 24px">{{ it }}</li>\n</ul>\n<button @click="addItem">添加一项</button>\n<p class="h">列表高度：{{ height }}px</p>',
  js: `const items = ref(['第 1 项'])
const listEl = ref(null)     // 模板中 ref="listEl" 的元素
const height = ref(0)

onMounted(() => { height.value = listEl.value.offsetHeight })

function addItem() {
  items.value.push('第 ' + (items.value.length + 1) + ' 项')
  height.value = listEl.value.offsetHeight
}

return { items, listEl, height, addItem }`,
  solJs: `const items = ref(['第 1 项'])
const listEl = ref(null)     // 模板中 ref="listEl" 的元素
const height = ref(0)

onMounted(() => { height.value = listEl.value.offsetHeight })

async function addItem() {
  items.value.push('第 ' + (items.value.length + 1) + ' 项')
  await nextTick()                              // 等待这次 DOM 更新完成
  height.value = listEl.value.offsetHeight
}

return { items, listEl, height, addItem }`,
  hints: [
    '原因：修改数据后，Vue 不立即更新 DOM。它把更新放入队列，当前的同步代码结束后才一起更新。所以紧接着读取，得到的是旧 DOM。要等这次更新完成后再读取。25.2 节讲了它。',
    '只改 addItem。把它改为 async 函数。在 push 和读取高度之间，等待 Vue 完成这次 DOM 更新。',
    'async function addItem() {\n  items.value.push(\'第 \' + (items.value.length + 1) + \' 项\')\n  await nextTick()\n  height.value = listEl.value.offsetHeight\n}'
  ],
  wrong: [
    { js: `const items = ref(['第 1 项'])
const listEl = ref(null)
const height = ref(0)

onMounted(() => { height.value = listEl.value.offsetHeight })

function addItem() {
  items.value.push('第 ' + (items.value.length + 1) + ' 项')
}
watch(items, () => {
  height.value = listEl.value.offsetHeight
}, { deep: true })

return { items, listEl, height, addItem }`, why: '侦听器默认在组件更新之前运行，这时 DOM 还是旧的。' }
  ],
  async check(T) {
    const shown = () => { const m = /(\d+)px/.exec((T.$('p.h') || {}).textContent || ''); return m ? +m[1] : NaN; };
    const real = () => (T.$('ul') || {}).offsetHeight;
    const settle = async () => { await new Promise(r => setTimeout(r, 0)); await nextTick(); };
    await settle();
    T.ok(real() > 0 && shown() === real(), '初始显示的高度等于实际高度（显示 ' + shown() + '，实际 ' + real() + '）');
    const b = T.btn('添加一项');
    if (!b) { T.ok(false, '找到“添加一项”按钮'); return; }
    await T.click(b); await settle();
    T.ok(shown() === real(), '添加一项后，显示的高度等于实际高度（显示 ' + shown() + '，实际 ' + real() + '）');
    await T.click(T.btn('添加一项')); await settle();
    T.ok(T.$$('li').length === 3 && shown() === real(), '再添加一项，仍然相等（显示 ' + shown() + '，实际 ' + real() + '）');
  }
}

// ===== 半成品示例（参考答案挖掉关键处，占位说明做什么）=====
phenoHeight.faded = {
  js: sub(phenoHeight.solJs, 'await nextTick()                              // 等待这次 DOM 更新完成',
    '/* ✏️ 读高度之前，先等 Vue 把这次数据变化更新到 DOM */')
}

// ===== 实现级:迷你调度器 =====
// 脚本分三段:已给出的任务和界面、要实现的调度器、返回。用 PRE/POST 占位拼出起始代码、参考答案和半成品。
const MS_HEAD = `// ===== 已给出:两个组件的更新任务,和界面 =====
const view = ref({ sync: '(还没点)', after: '(还没点)' })
const out = []                                   // 记录运行过的任务
function makeJob(id, name, onRun) {
  const job = () => { out.push(name); onRun && onRun() }
  job.id = id                                    // 组件 uid:父组件小,子组件大
  return job
}
const parent = makeJob(1, '父')
const child = makeJob(2, '子')
const parentThenChild = makeJob(1, '父', () => queueJob(child))   // 运行时又让子组件入队

`
const MS_TAIL = `

// ===== 已给出:三个按钮 =====
function report(runSync) {
  out.length = 0
  runSync()
  const sync = out.join(',') || '无'                // 同步阶段已经运行的任务
  miniNextTick(() => { view.value = { sync, after: out.join(',') } })
}
function editChildThenParent() { report(() => { queueJob(child); queueJob(parent) }) }
function editParentThrice() { report(() => { queueJob(parent); queueJob(parent); queueJob(parent) }) }
function editParentChain() { report(() => queueJob(parentThenChild)) }

return { view, editChildThenParent, editParentThrice, editParentChain }`
const MS_TPL = `<p>同步阶段已运行:{{ view.sync }}</p>
<p>miniNextTick 之后的运行顺序:{{ view.after }}</p>
<button @click="editChildThenParent">先改子(id 2),再改父(id 1)</button>
<button @click="editParentThrice">同步改父(id 1)三次</button>
<button @click="editParentChain">改父,父运行时又改子</button>`

const MS_START = `// ===== 要实现:queueJob、flushJobs、miniNextTick =====
const queue = []
let currentFlushPromise = null

function queueJob(job) {
  // TODO 1:已经在队列里的任务不重复加入
  // TODO 2:按 job.id 从小到大插入 queue
  // TODO 3:第一次入队时安排一次微任务,在里面运行 flushJobs
}

function flushJobs() {
  // TODO 4:依次运行 queue 里的任务。运行过程中新加入的任务也要在这一轮运行
  // TODO 5:运行结束后清空 queue,并让下一次入队能再安排一次刷新
}

function miniNextTick(fn) {
  // TODO 6:返回一个 Promise,在当前已安排的刷新结束后完成;没有安排刷新时返回已完成的 Promise。有 fn 时用 then 调用它
}`
const MS_SOL = `// ===== 要实现:queueJob、flushJobs、miniNextTick =====
const queue = []
let currentFlushPromise = null
const resolvedPromise = Promise.resolve()

function queueJob(job) {
  if (job.queued) return                           // 已经在队列里:不重复加入
  job.queued = true
  let i = queue.length                             // 从后向前找位置,保持 id 从小到大
  while (i > 0 && queue[i - 1].id > job.id) i--
  queue.splice(i, 0, job)
  if (!currentFlushPromise) {
    currentFlushPromise = resolvedPromise.then(flushJobs)   // 微任务:同步代码结束后运行
  }
}

function flushJobs() {
  for (let i = 0; i < queue.length; i++) {         // 每一圈重新读 queue.length:运行中新入队的任务也会被运行
    const job = queue[i]
    job.queued = false
    job()
  }
  queue.length = 0
  currentFlushPromise = null                       // 下一次入队才能再安排刷新
}

function miniNextTick(fn) {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(fn) : p
}`
const MS_FADED = `// ===== 要实现:queueJob、flushJobs、miniNextTick =====
const queue = []
let currentFlushPromise = null
const resolvedPromise = Promise.resolve()

function queueJob(job) {
  if (/* ✏️ 什么标记说明它已经在队列里 */ false) return
  job.queued = true
  let i = queue.length                             // 从后向前找位置,保持 id 从小到大
  while (i > 0 && /* ✏️ 前一个任务的 id 比新任务大时,继续往前找 */ false) i--
  queue.splice(i, 0, job)
  if (!currentFlushPromise) {
    currentFlushPromise = /* ✏️ 用已完成的 Promise 安排一个微任务,运行 flushJobs */ null
  }
}

function flushJobs() {
  for (let i = 0; i < /* ✏️ 循环条件:每一圈都重新读队列长度 */ 0; i++) {
    const job = queue[i]
    job.queued = false
    job()
  }
  queue.length = 0
  currentFlushPromise = null                       // 下一次入队才能再安排刷新
}

function miniNextTick(fn) {
  const p = /* ✏️ 已安排刷新时等它,否则用已完成的 Promise */ resolvedPromise
  return fn ? p.then(fn) : p
}`

const msPick = (T: any, label: string) => {
  const p = (T.$$('p') as Element[]).find(x => (x.textContent || '').includes(label))
  return p ? (p.textContent || '').split(/[:：]/).slice(1).join(':').trim() : '(找不到)'
}
const msSettle = async () => { await new Promise(r => setTimeout(r, 0)); await nextTick() }

export const miniScheduler: Exercise = {
  title: '手写一个迷你调度器', ch: 25,
  task: '<p>脚本里有两个组件的更新任务 <code>parent</code>(id 1)和 <code>child</code>(id 2)。实现 <code>queueJob</code>、<code>flushJobs</code> 和 <code>miniNextTick</code>,满足下面的要求:</p><ol><li>同一个任务多次入队,只运行一次。</li><li>不管入队顺序,任务按 id 从小到大运行。</li><li>入队时不立即运行。在当前同步代码结束后的<strong>微任务</strong>里运行,所以一次刷新里的所有入队都被合并。</li><li>任务运行时又让别的任务入队,新任务在同一次刷新里运行。</li><li><code>miniNextTick(fn)</code> 在已安排的刷新结束后调用 fn。</li></ol><p>只改“要实现”那一段。</p>',
  tpl: MS_TPL,
  js: MS_HEAD + MS_START + MS_TAIL,
  solJs: MS_HEAD + MS_SOL + MS_TAIL,
  faded: { js: MS_HEAD + MS_FADED + MS_TAIL },
  hints: [
    '对照 25.5 和 25.6 节的简化代码。调度器有三个状态:queue 数组、每个 job 上的 queued 标记、一个“已经安排了刷新”的 Promise(currentFlushPromise)。三个函数都围绕它们。',
    'queueJob:先检查 job.queued;再用 while 从队尾向前,跳过 id 比新任务大的任务,然后 splice 插入;最后如果 currentFlushPromise 为 null,用 resolvedPromise.then(flushJobs) 安排刷新。flushJobs:用下标循环,条件写成 i < queue.length;运行前清除 job.queued;结束后清空 queue 并把 currentFlushPromise 设回 null。',
    MS_SOL
  ],
  async check(T) {
    const bs = (t: string) => T.btn(t)
    const b1 = bs('先改子'), b2 = bs('改父(id 1)三次') || bs('三次'), b3 = bs('父运行时')
    if (!b1 || !b2 || !b3) { T.ok(false, '找到三个按钮'); return }
    await T.click(b1); await msSettle()
    T.ok(msPick(T, '同步阶段') === '无', '入队时不立即运行:同步阶段没有任务运行(当前:' + msPick(T, '同步阶段') + ')')
    T.ok(msPick(T, 'miniNextTick') === '父,子', '先入队子、再入队父,运行顺序仍是 父,子(当前:' + msPick(T, 'miniNextTick') + ')')
    await T.click(b2); await msSettle()
    T.ok(msPick(T, 'miniNextTick') === '父', '同步入队三次只运行一次(当前:' + msPick(T, 'miniNextTick') + ')')
    await T.click(b3); await msSettle()
    T.ok(msPick(T, 'miniNextTick') === '父,子', '运行中新入队的任务在同一次刷新里运行(当前:' + msPick(T, 'miniNextTick') + ')')
    await T.click(b2); await msSettle()
    T.ok(msPick(T, 'miniNextTick') === '父', '刷新结束后可以再次入队、再次刷新(当前:' + msPick(T, 'miniNextTick') + ')')
    // 必须是微任务:点击后只让出微任务队列,不等任何宏任务,结果就该出现
    b1.click()
    for (let k = 0; k < 12; k++) await Promise.resolve()
    T.ok(msPick(T, 'miniNextTick') === '父,子', '刷新用微任务安排,不是 setTimeout(当前:' + msPick(T, 'miniNextTick') + ')')
    await msSettle()
  },
  wrong: [
    { js: MS_HEAD + sub(MS_SOL, '  if (job.queued) return                           // 已经在队列里:不重复加入\n', '') + MS_TAIL, why: '没有用 queued 标记去重。同步入队三次,父任务会运行三次。', expectFail: /只运行一次/ },
    { js: MS_HEAD + sub(MS_SOL, '  while (i > 0 && queue[i - 1].id > job.id) i--\n', '') + MS_TAIL, why: '直接追加到队尾,没有按 id 排序。先入队子、再入队父时,子先运行,和“父先于子”相反。', expectFail: /父,子/ },
    { js: MS_HEAD + sub(MS_SOL, 'resolvedPromise.then(flushJobs)', 'new Promise(r => setTimeout(r)).then(flushJobs)') + MS_TAIL, why: '用 setTimeout 安排刷新,它是宏任务。浏览器可能在它运行之前先渲染一次,而且 await 之后的微任务读不到更新结果。调度器必须用微任务。', expectFail: /微任务/ },
    { js: MS_HEAD + sub(MS_SOL, 'for (let i = 0; i < queue.length; i++) {         // 每一圈重新读 queue.length:运行中新入队的任务也会被运行\n    const job = queue[i]\n    job.queued = false\n    job()\n  }\n  queue.length = 0', 'const jobs = queue.splice(0)                     // 先取走再运行\n  jobs.forEach(job => { job.queued = false; job() })') + MS_TAIL, why: '先把队列取走再运行。运行中新入队的任务进了新的 queue,但这次刷新已经结束,而且 currentFlushPromise 还没清空,不会再安排刷新。子任务永远不运行。', expectFail: /同一次刷新/ }
  ]
}
