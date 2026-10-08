import type { Exercise } from './types'
import { sub } from './types'

// 本章三道练习都不发真实的网络请求：脚本里有可控的假接口（指定延迟、可以失败、可以取消），判题通过控制先后顺序制造竞态。

// ---------------------------------------------------------------------------
// 练习 1：写一个处理竞态的 useAsync（18.3）
// ---------------------------------------------------------------------------

const raceApi = `// ===== 已给出：假接口（不用修改） =====
// 用户 1 要 150 毫秒，用户 2 要 30 毫秒。支持用 signal 取消，并把过程记在 log 里。
const log = ref([])
function fetchUser(id, signal) {
  log.value.push('发出 ' + id)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { log.value.push('返回 ' + id); resolve('用户 ' + id) }, id === 1 ? 150 : 30)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      log.value.push('取消 ' + id)
      reject(new DOMException('aborted', 'AbortError'))
    })
  })
}
`

const raceBody = `watch(source, async (arg, _old, onCleanup) => {
    const controller = new AbortController()
    onCleanup(() => controller.abort())          // 参数变了、组件卸载了：取消这一次
    status.value = 'loading'
    error.value = null
    try {
      const result = await fetcher(arg, controller.signal)
      if (controller.signal.aborted) return      // 兜底：不遵守 signal 的 fetcher 也不会写入过期结果
      data.value = result
      status.value = 'success'
    } catch (e) {
      if (controller.signal.aborted) return      // 被取代的请求失败了，不是错误，别碰状态
      error.value = e
      status.value = 'error'
    }
  }, { immediate: true })`

const raceUse = (body: string) => `function useAsync(source, fetcher) {
  const data = ref(null)
  const status = ref('idle')          // idle | loading | success | error
  const error = ref(null)
  ${body}
  return { data, status, error }
}
`

const raceStartBody = `watch(source, async arg => {
    status.value = 'loading'
    error.value = null
    try {
      data.value = await fetcher(arg)
      status.value = 'success'
    } catch (e) {
      error.value = e
      status.value = 'error'
    }
  }, { immediate: true })`

const raceTail = `
const id = ref(2)
const { data, status, error } = useAsync(id, fetchUser)

return { id, data, status, error, log }`

const raceStartJs = `${raceApi}
// TODO：useAsync 没有处理竞态。参数很快变化时，旧请求晚回来会覆盖新结果，旧请求也一直在占用连接。
// 改 useAsync：参数变了或组件卸载时取消旧请求；被取消的请求不能改动 data、status、error。
${raceUse(raceStartBody)}${raceTail}`

const raceSolJs = `${raceApi}
${raceUse(raceBody)}${raceTail}`

const raceFadedJs = `${raceApi}
${raceUse(`watch(source, async (arg, _old, onCleanup) => {
    const controller = new AbortController()
    /* ✏️ 注册清理函数：下一次运行前（或停止时）取消这一次的请求 */
    status.value = 'loading'
    error.value = null
    try {
      const result = await fetcher(/* ✏️ 把 arg 和能取消请求的 signal 都交给 fetcher */)
      /* ✏️ 已经被取消了就直接返回：不写 data，也不改 status */
      data.value = result
      status.value = 'success'
    } catch (e) {
      /* ✏️ 被取消的请求会走到这里：它不是错误，直接返回 */
      error.value = e
      status.value = 'error'
    }
  }, { immediate: true })`)}${raceTail}`

const raceTpl = `<button @click="id = 1">用户 1（慢）</button>
<button @click="id = 2">用户 2（快）</button>
<p>状态：<b id="status">{{ status }}</b></p>
<p>数据：<b id="data">{{ data ?? '无' }}</b></p>
<p>错误：<b id="err">{{ error ? error.message : '' }}</b></p>
<pre id="log">{{ log.join('\\n') }}</pre>`

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

export const raceUseAsync: Exercise = {
  title: '写一个处理竞态的 useAsync：只显示最后一次，并取消旧请求',
  ch: 18,
  task: `<p>下面的 <code>useAsync(source, fetcher)</code> 包装了“参数变化就重新请求”：返回 <code>data</code>、<code>status</code>（idle、loading、success、error）和 <code>error</code>。假接口 <code>fetchUser</code> 已经给出：用户 1 要 150 毫秒，用户 2 要 30 毫秒，支持用 <code>signal</code> 取消，过程记在页面的日志里。</p>
<p>现在的写法有竞态。先复现：页面加载后，点“用户 1（慢）”，马上点“用户 2（快）”。看数据和日志：</p>
<ol>
<li>参数从 1 变成 2 时，还在路上的请求 1 要被取消（日志里有“取消 1”，没有“返回 1”）。</li>
<li>数据最后是“用户 2”，状态是 <code>success</code>，错误为空。请求 2 还在路上时，状态必须是 <code>loading</code>。</li>
<li>被取消的请求不能改动 <code>data</code>、<code>status</code>、<code>error</code>。</li>
</ol>
<p>只改 <code>useAsync</code>。</p>`,
  tpl: raceTpl,
  js: raceStartJs,
  solJs: raceSolJs,
  faded: { js: raceFadedJs },
  hints: [
    '先想清楚三件事：谁来发现“这一次过期了”？怎样让旧请求真的停下？停下以后它会怎样结束？watch 回调的第三个参数是一个注册函数，它注册的清理函数会在下一次运行前、以及侦听器停止时被调用。',
    '每次运行创建一个 AbortController，把 controller.signal 作为第二个参数交给 fetcher，在清理函数里调用 controller.abort()。',
    '被取消的请求会让 fetcher 抛出 AbortError，落进 catch。它不是错误：在 catch 里判断 controller.signal.aborted，已取消就直接 return。成功分支同样要判断：有的 fetcher 不遵守 signal，取消后仍会返回结果。',
    raceBody
  ],
  async check(T) {
    const txt = (s: string) => (T.$(s)?.textContent || '').trim()
    const log = () => txt('#log')
    T.ok(await T.waitFor(() => txt('#status') === 'success', 1000), '初始的用户 2 加载成功（状态 ' + txt('#status') + '）')
    T.ok(txt('#data') === '用户 2', '初始显示“用户 2”（现在是“' + txt('#data') + '”）')
    // 竞态：先慢后快
    await T.click(T.btn('用户 1（慢）'))
    await T.click(T.btn('用户 2（快）'))
    await wait(10)
    T.ok(txt('#status') === 'loading', '请求 2 还在路上时，状态应是 loading（现在是 ' + txt('#status') + '）。被取消的请求 1 不能改 status')
    T.ok(txt('#err') === '', '被取消的请求不是错误，error 应为空（现在是“' + txt('#err') + '”）')
    T.ok(await T.waitFor(() => txt('#status') === 'success', 600), '请求 2 返回后，状态是 success（现在是 ' + txt('#status') + '）')
    T.ok(txt('#data') === '用户 2', '数据是最后一次选择的“用户 2”（现在是“' + txt('#data') + '”）')
    await wait(250)
    T.ok(txt('#data') === '用户 2', '请求 1 本来会在 150 毫秒时返回，数据仍应是“用户 2”（现在是“' + txt('#data') + '”）')
    T.ok(log().includes('取消 1'), '请求 1 要被真正取消：日志里应有“取消 1”（日志：' + log().replace(/\n/g, ' / ') + '）')
    T.ok(!log().includes('返回 1'), '请求 1 被取消后不应该返回')
    T.ok(txt('#status') === 'success' && txt('#err') === '', '最终状态是 success，错误为空')
    // 没有竞态时仍然正常
    await T.click(T.btn('用户 1（慢）'))
    T.ok(await T.waitFor(() => txt('#data') === '用户 1', 600), '没有被打断的请求 1 照常显示“用户 1”（现在是“' + txt('#data') + '”）')
  },
  wrong: [
    {
      js: sub(raceSolJs, `    onCleanup(() => controller.abort())          // 参数变了、组件卸载了：取消这一次\n`, `    let cancelled = false\n    onCleanup(() => { cancelled = true })\n`),
      why: '只用一个 cancelled 标记丢弃了过期结果，页面显示是对的，但请求 1 还在路上，连接和服务器资源白白占用，日志里也没有“取消 1”。有 AbortController 就用它真正取消请求。',
      expectFail: /取消 1/
    },
    {
      js: sub(raceSolJs, `      if (controller.signal.aborted) return      // 被取代的请求失败了，不是错误，别碰状态\n`, ''),
      why: '取消请求会让 fetcher 抛出 AbortError。没有判断就把它当成错误写进 error 和 status，请求 2 还在路上，页面却显示“error”。被取消的请求不能碰状态。',
      expectFail: /loading|错误应为空/
    },
    {
      js: sub(raceSolJs, `      const result = await fetcher(arg, controller.signal)\n      if (controller.signal.aborted) return      // 兜底：不遵守 signal 的 fetcher 也不会写入过期结果\n      data.value = result`, `      data.value = await fetcher(arg)`),
      why: '没有把 signal 交给 fetcher，请求根本取消不了；又没有判断过期，旧结果会覆盖新结果。取消要靠 signal，兜底要靠 signal.aborted。',
      expectFail: /取消 1|用户 2/
    }
  ]
}

// ---------------------------------------------------------------------------
// 练习 2：请求去重、缓存和失效（18.6）
// ---------------------------------------------------------------------------

const cacheHead = `// ===== 已给出：假接口，记录被调用了几次 =====
const calls = ref(0)
let version = 1
function fetchTasks() {
  calls.value++
  const v = version
  return new Promise(resolve => setTimeout(() => resolve(['任务 A', '任务 B', '版本 ' + v]), 40))
}

// ===== 迷你查询缓存：每个 key 对应一个条目，所有使用者共用 =====
const entries = new Map()
function entryOf(key) {
  const k = JSON.stringify(key)
  if (!entries.has(k)) entries.set(k, { data: shallowRef(undefined), fetching: ref(false), promise: null, updatedAt: 0, fn: null })
  return entries.get(k)
}
`

const cacheTail = `
// ===== 三个使用者（不用修改）=====
const a = useQuery(['tasks'], fetchTasks, { staleTime: 60000 })
const b = useQuery(['tasks'], fetchTasks, { staleTime: 60000 })
const late = shallowRef(null)                       // 之后才出现的第三个使用者
function mountLate() { late.value = useQuery(['tasks'], fetchTasks, { staleTime: 60000 }) }
function serverChanged() { version++; invalidate(['tasks']) }   // 服务器上的数据变了，让缓存失效

return { calls, a, b, late, mountLate, serverChanged }`

const cacheStartJs = `${cacheHead}
// TODO 1：同一个 key 同时只能有一个请求在路上（去重）
function fetchEntry(e) {
  e.fetching.value = true
  return e.fn()
    .then(d => { e.data.value = d; e.updatedAt = Date.now() })
    .finally(() => { e.fetching.value = false })
}

function useQuery(key, fn, { staleTime = 0 } = {}) {
  const e = entryOf(key)
  e.fn = fn
  // TODO 2：缓存里的数据还新鲜（距上次成功不到 staleTime）时，不要请求
  fetchEntry(e)
  return { data: e.data, fetching: e.fetching }
}

// TODO 3：让这个 key 的缓存失效并重新取。重新取的时候，旧数据要继续显示
function invalidate(key) {
}
${cacheTail}`

const cacheSolCore = `function fetchEntry(e) {
  if (e.promise) return e.promise                // 去重：已有请求在路上，直接共用
  e.fetching.value = true
  e.promise = e.fn()
    .then(d => { e.data.value = d; e.updatedAt = Date.now() })
    .finally(() => { e.promise = null; e.fetching.value = false })
  return e.promise
}

function useQuery(key, fn, { staleTime = 0 } = {}) {
  const e = entryOf(key)
  e.fn = fn
  if (Date.now() - e.updatedAt >= staleTime) fetchEntry(e)   // 没有数据（updatedAt 是 0）或已过期才请求
  return { data: e.data, fetching: e.fetching }
}

function invalidate(key) {
  const e = entries.get(JSON.stringify(key))
  if (!e) return
  e.updatedAt = 0                                // 标记过期，但不清空 data：重新取期间继续显示旧数据
  fetchEntry(e)
}
`
const cacheSolJs = `${cacheHead}
${cacheSolCore}${cacheTail}`

const cacheFadedJs = `${cacheHead}
function fetchEntry(e) {
  /* ✏️ 已经有请求在路上（e.promise）时，直接返回它 */
  e.fetching.value = true
  /* ✏️ 把这次请求保存到 e.promise，结束后清空它 */ e.fn()
    .then(d => { e.data.value = d; e.updatedAt = Date.now() })
    .finally(() => { e.fetching.value = false })
  return e.promise
}

function useQuery(key, fn, { staleTime = 0 } = {}) {
  const e = entryOf(key)
  e.fn = fn
  /* ✏️ 距上次成功已经超过 staleTime（或从没成功过）时才调用 fetchEntry */
  fetchEntry(e)
  return { data: e.data, fetching: e.fetching }
}

function invalidate(key) {
  const e = entries.get(JSON.stringify(key))
  if (!e) return
  /* ✏️ 标记为过期（不要清空 data），然后重新取 */
}
${cacheTail}`

const cacheTpl = `<p>请求次数：<b id="calls">{{ calls }}</b></p>
<p>使用者 A：<span id="a">{{ a.data.value ? a.data.value.join('、') : '加载中' }}</span></p>
<p>使用者 B：<span id="b">{{ b.data.value ? b.data.value.join('、') : '加载中' }}</span></p>
<p>后来的使用者：<span id="late">{{ late ? (late.data.value ? late.data.value.join('、') : '加载中') : '还没出现' }}</span></p>
<p>后台刷新中：<b id="fetching">{{ a.fetching.value }}</b></p>
<button @click="mountLate()">挂载第三个使用者</button>
<button @click="serverChanged()">服务器数据变了，使缓存失效</button>`

export const queryCacheDedup: Exercise = {
  title: '写迷你查询缓存：请求去重、新鲜期和失效',
  ch: 18,
  task: `<p>三个组件（这里简化成三次 <code>useQuery</code> 调用）读取同一份任务列表。假接口 <code>fetchTasks</code> 要 40 毫秒，每次被调用，页面上的“请求次数”加 1。迷你缓存里，每个 key 对应一个条目，所有使用者共用。补全三处 TODO：</p>
<ol>
<li><b>去重</b>：A 和 B 同时挂载，同一个 key 只发 1 个请求，请求次数是 1，两者显示同样的数据。</li>
<li><b>新鲜期</b>：<code>staleTime</code> 是 60 秒。数据还新鲜时，后来才出现的第三个使用者直接拿到缓存，不再请求，请求次数仍是 1。</li>
<li><b>失效</b>：点“服务器数据变了”后，立刻重新请求（次数变 2）。重新取的期间，三个使用者继续显示旧数据，不能变回“加载中”。返回后三者同时更新为新版本，次数仍是 2。</li>
</ol>`,
  tpl: cacheTpl,
  js: cacheStartJs,
  solJs: cacheSolJs,
  faded: { js: cacheFadedJs },
  hints: [
    '条目上有 promise 字段，专门用来记录“正在进行的请求”。去重就是：有 promise 就直接返回它，没有才发新请求；请求结束后把它清空。',
    '新鲜期：Date.now() - e.updatedAt >= staleTime 才请求。从没成功过时 updatedAt 是 0，所以一定会请求。',
    '失效不是删除。把 updatedAt 设为 0，让条目变成“过期”，再调用 fetchEntry。data 不动，界面就继续显示旧数据，直到新数据到达。',
    cacheSolCore
  ],
  async check(T) {
    const txt = (s: string) => (T.$(s)?.textContent || '').trim()
    T.ok(await T.waitFor(() => txt('#a').includes('版本 1'), 1000), '数据返回后，使用者 A 显示“版本 1”（现在是“' + txt('#a') + '”）')
    T.ok(txt('#b').includes('版本 1'), '使用者 B 也显示“版本 1”')
    T.ok(txt('#calls') === '1', 'A 和 B 读同一个 key，只能请求 1 次（现在是 ' + txt('#calls') + ' 次）')
    await T.click(T.btn('挂载第三个使用者'))
    T.ok(txt('#late').includes('版本 1'), '数据还新鲜时，后来的使用者立刻拿到缓存的数据（现在是“' + txt('#late') + '”）')
    await T.settle()
    T.ok(txt('#calls') === '1', '数据还在新鲜期内，不应该再请求（现在是 ' + txt('#calls') + ' 次）')
    await T.click(T.btn('服务器数据变了'))
    T.ok(txt('#calls') === '2', '失效后应立刻重新请求，次数变成 2（现在是 ' + txt('#calls') + '）')
    T.ok(txt('#a').includes('版本 1') && txt('#b').includes('版本 1') && txt('#late').includes('版本 1'), '重新取的期间，三个使用者继续显示旧数据，不能回到“加载中”（A：“' + txt('#a') + '”）')
    T.ok(txt('#fetching') === 'true', '重新取的期间，fetching 是 true（现在是 ' + txt('#fetching') + '）')
    T.ok(await T.waitFor(() => txt('#a').includes('版本 2'), 1000), '新数据返回后，A 更新为“版本 2”（现在是“' + txt('#a') + '”）')
    T.ok(txt('#b').includes('版本 2') && txt('#late').includes('版本 2'), 'B 和后来的使用者同时更新为“版本 2”')
    T.ok(txt('#calls') === '2' && txt('#fetching') === 'false', '三个使用者共用一次请求：次数仍是 2，fetching 变回 false（次数 ' + txt('#calls') + '，fetching ' + txt('#fetching') + '）')
  },
  wrong: [
    {
      js: sub(cacheSolJs, `  if (e.promise) return e.promise                // 去重：已有请求在路上，直接共用\n`, ''),
      why: '没有去重：A 和 B 各发了一个请求，同一份数据请求了两次。条目要记住“正在进行的请求”，后来者共用它。',
      expectFail: /只能请求 1 次/
    },
    {
      js: sub(cacheSolJs, `  if (Date.now() - e.updatedAt >= staleTime) fetchEntry(e)   // 没有数据（updatedAt 是 0）或已过期才请求`, `  fetchEntry(e)`),
      why: '每个新使用者都发请求，没有利用缓存。数据还在新鲜期内，就应该直接用缓存里的。',
      expectFail: /新鲜期|立刻拿到/
    },
    {
      js: sub(cacheSolJs, `  e.updatedAt = 0                                // 标记过期，但不清空 data：重新取期间继续显示旧数据`, `  e.updatedAt = 0\n  e.data.value = undefined`),
      why: '失效时清空了 data，重新取的 40 毫秒里页面回到“加载中”，用户看到闪烁。失效只标记过期，旧数据继续显示，新数据到达后再替换。',
      expectFail: /继续显示旧数据/
    },
    {
      js: sub(cacheSolJs, `  fetchEntry(e)\n}\n`, `}\n`),
      why: '失效只标记了过期，没有重新取：页面上的数据一直是旧的，直到下一个使用者出现。失效之后，正在使用这份数据的组件要立刻重新取。',
      expectFail: /立刻重新请求|失效后/
    }
  ]
}

// ---------------------------------------------------------------------------
// 练习 3：乐观更新与失败回滚（18.4）
// ---------------------------------------------------------------------------

const optApi = `// ===== 已给出：假接口（不用修改） =====
// 标题里带“失败”的请求 80 毫秒后被拒绝，其余 40 毫秒后成功，并返回服务器分配的 id。
let serverId = 100
function apiAdd(title) {
  const bad = title.includes('失败')
  return new Promise((resolve, reject) => setTimeout(
    () => (bad ? reject(new Error('服务器拒绝了')) : resolve({ id: ++serverId, title })),
    bad ? 80 : 40
  ))
}
`

const optTail = `
return { tasks, error, add }`

const optStartJs = `${optApi}
const tasks = ref([{ id: 1, title: '已有任务' }])
const error = ref('')

// TODO：现在要等服务器返回才显示新任务，用户会觉得卡。改成乐观更新：
//  1. 点击后立刻在列表里加一个临时项（带 pending: true）
//  2. 成功：用服务器返回的任务替换临时项
//  3. 失败：只撤销这一条临时项，并把失败原因写进 error
async function add(title) {
  const saved = await apiAdd(title)
  tasks.value.push(saved)
}
${optTail}`

const optSolCore = `let tmp = 0
async function add(title) {
  const temp = { id: 'tmp-' + ++tmp, title, pending: true }
  tasks.value.push(temp)                                    // 先改界面
  error.value = ''
  try {
    const saved = await apiAdd(title)
    const i = tasks.value.findIndex(t => t.id === temp.id)
    tasks.value[i] = saved                                  // 成功：换成服务器返回的真实任务
  } catch (e) {
    tasks.value = tasks.value.filter(t => t.id !== temp.id) // 失败：只撤销这一条
    error.value = '添加“' + title + '”失败：' + e.message
  }
}
`
const optSolJs = `${optApi}
const tasks = ref([{ id: 1, title: '已有任务' }])
const error = ref('')

${optSolCore}${optTail}`

const optFadedJs = `${optApi}
const tasks = ref([{ id: 1, title: '已有任务' }])
const error = ref('')

let tmp = 0
async function add(title) {
  const temp = { id: 'tmp-' + ++tmp, title, pending: true }
  /* ✏️ 先把临时项加进列表 */
  error.value = ''
  try {
    const saved = await apiAdd(title)
    /* ✏️ 成功：在列表里找到临时项，换成 saved */
  } catch (e) {
    /* ✏️ 失败：只撤销这一条临时项（别的请求加的项要保留） */
    error.value = '添加“' + title + '”失败：' + e.message
  }
}
${optTail}`

const optTpl = `<ul>
  <li v-for="t in tasks" :key="t.id" class="task" :class="{ pending: t.pending }">{{ t.title }}</li>
</ul>
<p id="err">{{ error }}</p>
<button @click="add('买牛奶')">添加“买牛奶”</button>
<button @click="add('买咖啡')">添加“买咖啡”</button>
<button @click="add('失败的任务')">添加“失败的任务”（会被拒绝）</button>`

export const optimisticAdd: Exercise = {
  title: '乐观更新：先改界面，失败时只撤销自己那一条',
  ch: 18,
  task: `<p>点“添加”后，现在要等服务器返回才出现新任务，用户会觉得卡。改成乐观更新。假接口 <code>apiAdd</code> 已给出：标题带“失败”的请求 80 毫秒后被拒绝，其余 40 毫秒后成功并返回带真实 id 的任务。只改 <code>add</code>。</p>
<ol>
<li>点击后<b>立刻</b>在列表里出现新任务，临时项带 <code>pending: true</code>（页面上显示为浅色）。</li>
<li>成功后，临时项换成服务器返回的任务，不再 pending，列表里没有重复项。</li>
<li>失败后，这一条消失，<code>error</code> 里写上失败原因。</li>
<li>两个请求同时在路上时互不影响：先点“失败的任务”再点“买咖啡”，“买咖啡”成功了，随后失败的那条被撤销，“买咖啡”要留在列表里。</li>
</ol>`,
  tpl: optTpl,
  js: optStartJs,
  solJs: optSolJs,
  faded: { js: optFadedJs },
  hints: [
    '先 push 一个临时项：{ id: "tmp-1", title, pending: true }，再 await 接口。临时项的 id 要唯一，不能和真实 id 冲突，模板用 id 做 key。',
    '成功后用 findIndex 按临时项的 id 找到它的位置，再整体替换成服务器返回的对象，pending 字段随之消失。',
    '失败后只撤销自己：tasks.value = tasks.value.filter(t => t.id !== temp.id)。不要在请求前保存整个列表的快照、失败时整体还原：那会把别的请求在这期间成功加入的项一起抹掉。',
    optSolCore
  ],
  async check(T) {
    const rows = () => T.$$('li.task').map(li => (li.textContent || '').trim())
    const pend = () => T.$$('li.task.pending').map(li => (li.textContent || '').trim())
    const err = () => (T.$('#err')?.textContent || '').trim()
    // 成功路径
    await T.click(T.btn('添加“买牛奶”'))
    T.ok(rows().includes('买牛奶'), '点击后立刻出现“买牛奶”，不等服务器（现在：' + rows().join('、') + '）')
    T.ok(pend().includes('买牛奶'), '服务器还没返回时，“买牛奶”是 pending 状态')
    T.ok(await T.waitFor(() => pend().length === 0, 600), '服务器返回后，临时项不再是 pending')
    T.ok(rows().join('|') === '已有任务|买牛奶', '成功后列表是“已有任务、买牛奶”，没有重复（现在：' + rows().join('、') + '）')
    T.ok(err() === '', '成功时没有错误')
    // 失败路径
    await T.click(T.btn('添加“失败的任务”'))
    T.ok(rows().includes('失败的任务') && pend().includes('失败的任务'), '失败的请求也先显示出来（pending）')
    T.ok(await T.waitFor(() => !rows().includes('失败的任务'), 600), '被服务器拒绝后，这一条消失（现在：' + rows().join('、') + '）')
    T.ok(err().includes('服务器拒绝了'), 'error 里写上失败原因（现在是“' + err() + '”）')
    T.ok(rows().join('|') === '已有任务|买牛奶', '回滚后，其他任务原样保留')
    // 并发：失败的还在路上时，另一个请求成功
    await T.click(T.btn('添加“失败的任务”'))
    await T.click(T.btn('添加“买咖啡”'))
    T.ok(await T.waitFor(() => !rows().includes('失败的任务'), 600), '失败的那条最终被撤销')
    T.ok(rows().includes('买咖啡') && pend().length === 0, '失败的请求回滚时，不能抹掉“买咖啡”（现在：' + rows().join('、') + '）。只撤销自己那一条，不要整体还原快照')
    T.ok(rows().join('|') === '已有任务|买牛奶|买咖啡', '最终列表是“已有任务、买牛奶、买咖啡”（现在：' + rows().join('、') + '）')
  },
  wrong: [
    {
      js: sub(sub(optSolJs, `  const temp = { id: 'tmp-' + ++tmp, title, pending: true }\n`, `  const prev = [...tasks.value]\n  const temp = { id: 'tmp-' + ++tmp, title, pending: true }\n`), `    tasks.value = tasks.value.filter(t => t.id !== temp.id) // 失败：只撤销这一条`, `    tasks.value = prev`),
      why: '失败时把整个列表还原成请求前的快照。“失败的任务”要 80 毫秒才失败，期间“买咖啡”已经成功加入，整体还原把它一起抹掉了。回滚只撤销这一次修改，别的修改保留。',
      expectFail: /买咖啡/
    },
    {
      js: sub(optSolJs, `    tasks.value = tasks.value.filter(t => t.id !== temp.id) // 失败：只撤销这一条\n`, ''),
      why: '失败后没有回滚：界面显示添加成功，服务器其实拒绝了。用户刷新后任务就不见了，这是最糟的结果。乐观更新必须有失败回滚。',
      expectFail: /消失/
    },
    {
      js: sub(optSolJs, `    error.value = '添加“' + title + '”失败：' + e.message\n`, ''),
      why: '回滚了，但没有告诉用户。任务无声无息地消失，用户不知道发生了什么。回滚之后要显示失败原因（第 38 章讲给用户看什么）。',
      expectFail: /失败原因/
    },
    {
      js: sub(optSolJs, `    tasks.value[i] = saved                                  // 成功：换成服务器返回的真实任务`, `    tasks.value.push(saved)`),
      why: '成功后又 push 了一次服务器返回的任务，临时项还留在列表里，于是出现重复项并且一直是 pending。成功后要把临时项替换成真实任务。',
      expectFail: /pending|重复/
    }
  ]
}
