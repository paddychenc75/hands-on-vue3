import type { Exercise } from './types'
import { sub } from './types'
import { nextTick } from 'vue'
import { answer, build, PARTS, region } from '../mini'

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
    '原因：修改 editing 后，Vue 不立即更新 DOM。下一行代码运行时，输入框还没有创建，inputRef.value 是 null，所以报错。要等这次 DOM 更新完成，再调用 focus()。第 7 章 7.4 节讲了怎样等这次更新，25.1 和 25.5 节讲了原因。',
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
    '原因：修改数据后，Vue 不立即更新 DOM。它把更新放入队列，当前的同步代码结束后才一起更新。所以紧接着读取，得到的是旧 DOM。要等这次更新完成后再读取。25.5 节讲了它。',
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
// 调度器是 course/mini 的零件 2(全课程唯一的一份 queueJob)。学习者写其中三段:queueJob、flushJobs、nextTick。
// findInsertionIndex、queueFlush、queuePostFlushCb、flushPostFlushCbs、flushPreFlushCbs 是给定的。
// 本练习不需要迷你响应式(调度器不依赖它),所以不折叠别的零件;界面的 ref 仍然用练习环境提供的真实 Vue。
const MS_HEAD = `// ===== 已给出:两个组件的更新任务、一个后置回调,和界面 =====
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
const post = () => { out.push('后置') }
const postThenChild = () => { out.push('后置'); queueJob(child) } // 后置回调里又让子组件入队

`
const MS_TAIL = `

// ===== 已给出:按钮 =====
function report(runSync) {
  out.length = 0
  runSync()
  const sync = out.join(',') || '无'                // 同步阶段已经运行的任务
  nextTick(() => { view.value = { sync, after: out.join(',') } })
}
function editChildThenParent() { report(() => { queueJob(child); queueJob(parent) }) }
function editParentThrice() { report(() => { queueJob(parent); queueJob(parent); queueJob(parent) }) }
function editParentChain() { report(() => queueJob(parentThenChild)) }
function editWithPost() { report(() => { queuePostFlushCb(post); queueJob(parent) }) }
function editPostChain() { report(() => { queuePostFlushCb(postThenChild); queueJob(parent) }) }

return { view, editChildThenParent, editParentThrice, editParentChain, editWithPost, editPostChain }`
const MS_TPL = `<p>同步阶段已运行:{{ view.sync }}</p>
<p>nextTick 之后的运行顺序:{{ view.after }}</p>
<button @click="editChildThenParent">先改子(id 2),再改父(id 1)</button>
<button @click="editParentThrice">同步改父(id 1)三次</button>
<button @click="editParentChain">改父,父运行时又改子</button>
<button @click="editWithPost">改父,并加入一个后置回调</button>
<button @click="editPostChain">改父,后置回调里又改子</button>`

// 零件 2 里 queueJob 区域含 findInsertionIndex(二分查找):起始代码只挖掉 queueJob 本身,保留二分查找
const MS_QUEUE = region(PARTS.scheduler, 'queueJob')
const MS_FIND = MS_QUEUE.slice(MS_QUEUE.indexOf('// 二分查找'))
const MS_STARTS = {
  nextTick: 'function nextTick(fn) {\n  // TODO 6:返回一个 Promise,在当前已安排的刷新结束后完成;没有安排刷新时返回已完成的 Promise(resolvedPromise)。有 fn 时用 then 调用它\n}',
  queueJob: 'function queueJob(job) {\n  // TODO 1:已经在队列里(job.queued)的任务不重复加入\n  // TODO 2:按 job.id 从小到大插入 queue。二分查找 findInsertionIndex(job) 已经给你了。队列为空或 id 不小于队尾时直接 push 也可以\n  // TODO 3:标记 job.queued,并调用 queueFlush() 安排刷新\n}\n\n' + MS_FIND,
  flushJobs: 'function flushJobs() {\n  // TODO 4:依次运行 queue 里的任务(取出一个运行一个)。运行过程中新加入的任务也要在这一轮运行;运行完把 job.queued 清掉\n  // TODO 5:队列清空后运行 flushPostFlushCbs(),把 currentFlushPromise 设回 null;如果后置回调里又有新任务,再刷新一次\n}'
}
const MS_START = build(PARTS.scheduler, MS_STARTS)
const MS_SOL = answer(PARTS.scheduler)
// 半成品:在答案上把关键处换成 ✏️ 占位
const MS_FADED = [
  ['if (job.queued) return                  // 去重：同一个任务只排一次', 'if (/* ✏️ 什么标记说明它已经在队列里 */ false) return'],
  ['  job.queued = true\n  queueFlush()', '  /* ✏️ 标记它已经在队列里 */\n  queueFlush()'],
  ['    job.queued = false                    // 不允许递归的任务，运行期间再入队会被忽略\n', '    /* ✏️ 运行结束后，清掉 queued 标记，之后才能再入队 */\n'],
  ['  currentFlushPromise = null\n', '  /* ✏️ 下一次入队才能再安排刷新 */\n'],
  ['  const p = currentFlushPromise || resolvedPromise', '  const p = /* ✏️ 已安排刷新时等它,否则用已完成的 Promise */ resolvedPromise']
].reduce((acc, [a, b]) => sub(acc, a, b), MS_SOL)

const msPick = (T: any, label: string) => {
  const p = (T.$$('p') as Element[]).find(x => (x.textContent || '').includes(label))
  return p ? (p.textContent || '').split(/[:：]/).slice(1).join(':').trim() : '(找不到)'
}
const msSettle = async () => { await new Promise(r => setTimeout(r, 0)); await nextTick() }

export const miniScheduler: Exercise = {
  title: '手写一个迷你调度器', ch: 25,
  task: '<p>脚本里的调度器(迷你 Vue 的零件 2)缺三段:<code>queueJob</code>、<code>flushJobs</code> 和 <code>nextTick</code>。脚本里已经有两个组件的更新任务 <code>parent</code>(id 1)和 <code>child</code>(id 2),和一个后置回调。把三段补全,满足下面的要求:</p><ol><li>同一个任务多次入队,只运行一次。</li><li>不管入队顺序,任务按 id 从小到大运行。</li><li>入队时不立即运行。在当前同步代码结束后的<strong>微任务</strong>里运行,所以一次刷新里的所有入队都被合并。</li><li>任务运行时又让别的任务入队,新任务在同一次刷新里运行。</li><li>更新任务都运行完之后,运行后置回调。后置回调里又让任务入队,再刷新一次。</li><li><code>nextTick(fn)</code> 在已安排的刷新结束后调用 fn。</li></ol><p>只改带 TODO 的三段。其余部分已经写好,可以展开读一读,它们和第 25 章正文里的代码相同。</p>',
  tpl: MS_TPL,
  js: MS_HEAD + MS_START + MS_TAIL,
  solJs: MS_HEAD + MS_SOL + MS_TAIL,
  faded: { js: MS_HEAD + MS_FADED + MS_TAIL },
  hints: [
    '对照 25.2、25.3 和 25.5 节的代码。调度器有三个状态:queue 数组、每个任务上的 queued 标记、一个“已经安排了刷新”的 Promise(currentFlushPromise)。三个函数都围绕它们。',
    'queueJob:先检查 job.queued;再按 id 放进 queue(可以直接 queue.splice(findInsertionIndex(job), 0, job));设 job.queued = true;最后调用 queueFlush()。flushJobs:while (queue.length) 取出队首运行,运行后清除 job.queued;结束后运行 flushPostFlushCbs(),把 currentFlushPromise 设回 null,后置回调里又有新任务就再 flushJobs() 一次。nextTick:p = currentFlushPromise || resolvedPromise,有 fn 就 p.then(fn)。',
    region(PARTS.scheduler, 'queueJob') + '\n\n' + region(PARTS.scheduler, 'flushJobs') + '\n\n' + region(PARTS.scheduler, 'nextTick')
  ],
  async check(T) {
    const bs = (t: string) => T.btn(t)
    const b1 = bs('先改子'), b2 = bs('三次'), b3 = bs('父运行时'), b4 = bs('加入一个后置'), b5 = bs('后置回调里又改子')
    if (!b1 || !b2 || !b3 || !b4 || !b5) { T.ok(false, '找到五个按钮'); return }
    await T.click(b1); await msSettle()
    T.ok(msPick(T, '同步阶段') === '无', '入队时不立即运行:同步阶段没有任务运行(当前:' + msPick(T, '同步阶段') + ')')
    T.ok(msPick(T, 'nextTick') === '父,子', '先入队子、再入队父,运行顺序仍是 父,子(当前:' + msPick(T, 'nextTick') + ')')
    await T.click(b2); await msSettle()
    T.ok(msPick(T, 'nextTick') === '父', '同步入队三次只运行一次(当前:' + msPick(T, 'nextTick') + ')')
    await T.click(b3); await msSettle()
    T.ok(msPick(T, 'nextTick') === '父,子', '运行中新入队的任务在同一次刷新里运行(当前:' + msPick(T, 'nextTick') + ')')
    await T.click(b4); await msSettle()
    T.ok(msPick(T, 'nextTick') === '父,后置', '更新任务都运行完之后才运行后置回调(当前:' + msPick(T, 'nextTick') + ')')
    await T.click(b5); await msSettle()
    T.ok(msPick(T, 'nextTick') === '父,后置,子', '后置回调里又入队的任务,再刷新一次(当前:' + msPick(T, 'nextTick') + ')')
    await T.click(b2); await msSettle()
    T.ok(msPick(T, 'nextTick') === '父', '刷新结束后可以再次入队、再次刷新(当前:' + msPick(T, 'nextTick') + ')')
    // 必须是微任务:点击后只让出微任务队列,不等任何宏任务,结果就该出现
    b1.click()
    for (let k = 0; k < 12; k++) await Promise.resolve()
    T.ok(msPick(T, 'nextTick') === '父,子', '刷新用微任务安排,不是 setTimeout(当前:' + msPick(T, 'nextTick') + ')')
    await msSettle()
  },
  wrong: [
    { js: MS_HEAD + sub(MS_SOL, '  if (job.queued) return                  // 去重：同一个任务只排一次\n', '') + MS_TAIL, why: '没有用 queued 标记去重。同步入队三次,父任务会运行三次。', expectFail: /只运行一次/ },
    { js: MS_HEAD + sub(MS_SOL, '  if (!job.pre && (!queue.length || getId(job) >= getId(queue[queue.length - 1]))) {', '  if (true) {') + MS_TAIL, why: '直接追加到队尾,没有按 id 排序。先入队子、再入队父时,子先运行,和“父先于子”相反。', expectFail: /父,子/ },
    { js: MS_HEAD + sub(MS_SOL, 'resolvedPromise.then(flushJobs)', 'new Promise(r => setTimeout(r)).then(flushJobs)') + MS_TAIL, why: '用 setTimeout 安排刷新,它是宏任务。浏览器可能在它运行之前先渲染一次,而且 await 之后的微任务读不到更新结果。调度器必须用微任务。', expectFail: /微任务/ },
    { js: MS_HEAD + sub(MS_SOL, '  currentFlushPromise = null\n', '') + MS_TAIL, why: '刷新结束后没有清掉 currentFlushPromise。它一直不为 null,queueFlush 以为已经安排过刷新,之后再入队的任务永远不会运行。', expectFail: /再次入队/ },
    { js: MS_HEAD + sub(MS_SOL, '  if (queue.length || pendingPostFlushCbs.length) flushJobs()   // 后置任务里又改了数据：接着刷新\n', '') + MS_TAIL, why: '后置回调运行之后没有再检查队列。后置回调里新入队的任务排进了 queue,这次刷新已经结束,没有人再去运行它。', expectFail: /又入队的任务/ },
    { js: MS_HEAD + sub(sub(MS_SOL, '  flushPostFlushCbs()\n', ''), 'if (queue.length || pendingPostFlushCbs.length) flushJobs()', 'if (queue.length) flushJobs()') + MS_TAIL, why: '更新任务运行完之后没有运行后置回调。onMounted、onUpdated 和 flush: \'post\' 的侦听器都靠它,它们永远不会运行。', expectFail: /后置回调/ }
  ]
}
