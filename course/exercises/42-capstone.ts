import type { Exercise } from './types'
import { sub } from './types'

// ===================== 请求错误的规范化与重试 =====================
const reqJs = (body: string) => `// ===== 已给出：错误类型、假 fetch、场景（不要修改） =====
class ApiError extends Error {
  constructor(message, status, field) { super(message); this.name = 'ApiError'; this.status = status; this.field = field }
}
// script 里每一项是一次调用的结果：'offline' 没连上，'abort' 被取消，{ status, body } 是响应
function makeFetch(script) {
  let i = 0
  const f = async (path, init) => {
    f.calls.push((init && init.method) || 'GET')
    const step = script[Math.min(i++, script.length - 1)]
    if (step === 'offline') throw new TypeError('Failed to fetch')
    if (step === 'abort') throw new DOMException('aborted', 'AbortError')
    return { ok: step.status < 400, status: step.status, json: async () => step.body || {} }
  }
  f.calls = []
  return f
}
const noSleep = () => Promise.resolve()   // 测试里不真的等

// ===== TODO：写 request =====
// 1. 失败都变成 ApiError：没连上 status 是 0、消息“网络不通”；有响应但不是 2xx，用响应体的 message 和 field
// 2. 取消（AbortError）原样抛出，不是失败
// 3. 只重试 GET，只重试 status 为 0 或 5xx，最多再试 2 次，间隔用 sleep(300 * 2 ** 已试次数)
${body}

const scenarios = [
  ['GET 成功', makeFetch([{ status: 200, body: { v: 1 } }]), 'GET'],
  ['GET 断网一次后成功', makeFetch(['offline', { status: 200, body: { v: 2 } }]), 'GET'],
  ['GET 一直 500', makeFetch([{ status: 500 }]), 'GET'],
  ['GET 一直断网', makeFetch(['offline']), 'GET'],
  ['GET 404', makeFetch([{ status: 404, body: { message: '任务不存在' } }]), 'GET'],
  ['POST 500', makeFetch([{ status: 500 }]), 'POST'],
  ['POST 400 带字段', makeFetch([{ status: 400, body: { message: '标题不能为空', field: 'title' } }]), 'POST'],
  ['GET 被取消', makeFetch(['abort']), 'GET']
]
const rows = ref([])
;(async () => {
  const out = []
  for (const [label, f, method] of scenarios) {
    let outcome
    try { outcome = 'ok:' + JSON.stringify(await request(f, '/x', { method }, noSleep)) }
    catch (e) { outcome = e instanceof ApiError ? 'ApiError:' + e.status + ':' + (e.field || '') + ':' + e.message : (e && e.name) + '' }
    out.push({ label, outcome, calls: f.calls.length })
  }
  rows.value = out
})()
return { rows }`

const reqTpl = `<table>
  <thead><tr><th>场景</th><th>结果</th><th>调用 fetch 次数</th></tr></thead>
  <tbody>
    <tr v-for="r in rows" :key="r.label" :data-label="r.label" :data-outcome="r.outcome" :data-calls="r.calls">
      <td>{{ r.label }}</td><td>{{ r.outcome }}</td><td>{{ r.calls }}</td>
    </tr>
  </tbody>
</table>`

const reqSol = `async function once(fetchImpl, path, init) {
  let res
  try { res = await fetchImpl(path, init) }
  catch (e) {
    if (e && e.name === 'AbortError') throw e          // 取消不是失败，原样抛出
    throw new ApiError('网络不通', 0)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.message || '请求失败（' + res.status + '）', res.status, body.field)
  }
  return res.json()
}

async function request(fetchImpl, path, init = {}, sleep = ms => new Promise(r => setTimeout(r, ms))) {
  const canRetry = (init.method || 'GET') === 'GET'    // 只重试幂等的请求
  for (let attempt = 0; ; attempt++) {
    try { return await once(fetchImpl, path, init) }
    catch (e) {
      const transient = e instanceof ApiError && (e.status === 0 || e.status >= 500)
      if (transient && canRetry && attempt < 2) { await sleep(300 * 2 ** attempt); continue }
      throw e
    }
  }
}`

const reqStart = `async function request(fetchImpl, path, init = {}, sleep) {
  const res = await fetchImpl(path, init)
  return res.json()
}`

const EXPECT: Record<string, [string, number]> = {
  'GET 成功': ['ok:{"v":1}', 1],
  'GET 断网一次后成功': ['ok:{"v":2}', 2],
  'GET 一直 500': ['ApiError:500::请求失败（500）', 3],
  'GET 一直断网': ['ApiError:0::网络不通', 3],
  'GET 404': ['ApiError:404::任务不存在', 1],
  'POST 500': ['ApiError:500::请求失败（500）', 1],
  'POST 400 带字段': ['ApiError:400:title:标题不能为空', 1],
  'GET 被取消': ['AbortError', 1]
}

export const capRequest: Exercise = {
  title: '请求层：失败规范成 ApiError，只重试安全的 GET',
  ch: 42,
  task: '<p>项目的请求层有两个职责：把所有失败变成同一种 <code>ApiError</code>，让上层只处理一种错误；对<b>短暂的失败</b>自动重试，但不能制造副作用。补全 <code>request</code>，让下面表格的八个场景都符合预期：</p><ol><li>没连上：<code>status</code> 为 0，消息“网络不通”。有响应但不是 2xx：用响应体的 <code>message</code> 和 <code>field</code>。</li><li>取消（<code>AbortError</code>）原样抛出，不当作失败，也不重试。</li><li>只重试 GET，只重试 status 为 0 或 5xx 的失败，最多再试 2 次，间隔 <code>sleep(300 * 2 ** 已试次数)</code>。</li></ol><p>“调用 fetch 次数”一列显示每个场景实际调用了几次。</p>',
  tpl: reqTpl,
  js: reqJs(reqStart),
  solJs: reqJs(reqSol),
  hints: [
    '先写不重试的 once：try 里调用 fetchImpl，catch 里分两种：AbortError 原样抛出，其他变成 ApiError(‘网络不通’, 0)。再检查 res.ok，不 ok 时读响应体。',
    '重试写成循环：for (let attempt = 0; ; attempt++) { try { return await once(...) } catch (e) { 判断能不能重试，能就 await sleep(...) 再 continue，不能就 throw e } }。能重试的条件有三个：是 GET；是 ApiError 且 status 为 0 或 ≥ 500；attempt < 2。',
    reqSol
  ],
  async check(T) {
    const ready = await T.waitFor(() => T.$$('tr[data-label]').length === 8, 1500)
    T.ok(ready, '表格里有八个场景。现在 request 还没有跑完或抛出了意料之外的错误')
    if (!ready) return
    for (const [label, [outcome, calls]] of Object.entries(EXPECT)) {
      const tr = T.$(`tr[data-label="${label}"]`)
      const o = tr?.getAttribute('data-outcome'), c = Number(tr?.getAttribute('data-calls'))
      T.ok(o === outcome, label + '：结果应是 ' + outcome + '，现在是 ' + o)
      T.ok(c === calls, label + '：应调用 fetch ' + calls + ' 次，现在是 ' + c + ' 次')
    }
  },
  wrong: [
    {
      js: reqJs(sub(reqSol, "const canRetry = (init.method || 'GET') === 'GET'    // 只重试幂等的请求", 'const canRetry = true')),
      why: '所有方法都重试。POST 添加任务时，请求可能已经到达服务器，只是响应丢了；重试会创建出第二个任务。只有幂等的请求（GET）才能自动重试。',
      expectFail: /POST 500：应调用/
    },
    {
      js: reqJs(sub(reqSol, "if (e && e.name === 'AbortError') throw e          // 取消不是失败，原样抛出\n    throw new ApiError", 'throw new ApiError')),
      why: '把取消也变成了“网络不通”。用户切换页面、取消上一次请求是正常操作，上层要靠 AbortError 把它和真正的失败区分开，否则会显示错误提示甚至上报。',
      expectFail: /被取消/
    },
    {
      js: reqJs(sub(reqSol, 'e.status === 0 || e.status >= 500', 'true')),
      why: '4xx 也重试。404 和 400 是服务器明确的回答，再问一百次结果也一样；重试只会让用户多等。只重试没连上和 5xx 这类短暂的失败。',
      expectFail: /GET 404：应调用/
    },
    {
      js: reqJs(sub(reqSol, "    throw new ApiError('网络不通', 0)\n", "    throw e\n")),
      why: '没连上时直接抛出 fetch 的 TypeError，没有规范成 ApiError。上层要同时处理 TypeError、ApiError 两种错误，重试条件也认不出它。',
      expectFail: /网络不通/
    }
  ],
  faded: {
    js: reqJs(sub(sub(sub(reqSol,
      "if (e && e.name === 'AbortError') throw e          // 取消不是失败，原样抛出\n    throw new ApiError('网络不通', 0)", "/* ✏️ 取消要原样抛出；其他变成 status 为 0、消息“网络不通”的 ApiError */\n    throw e"),
      "const canRetry = (init.method || 'GET') === 'GET'    // 只重试幂等的请求", "const canRetry = /* ✏️ 只有哪种方法可以自动重试？ */ true"),
      "if (transient && canRetry && attempt < 2) { await sleep(300 * 2 ** attempt); continue }", "if (/* ✏️ 短暂失败、可重试、还没试满 2 次 */ false) { await sleep(300 * 2 ** attempt); continue }"))
  }
}

// ===================== 看板更新次数达标 =====================
const boardJs = (cols: string, taskProp: string) => `// ---------- 度量用的计数器（不要修改） ----------
const counts = { Card: 0, Column: 0 }
const Card = {
  props: ['task'],
  setup() { onUpdated(() => counts.Card++) },
  template: '<li>{{ task.title }}</li>'
}
const Column = {
  props: ['title', 'ids', 'byId'],
  components: { Card },
  setup() { onUpdated(() => counts.Column++) },
  template: '<section :aria-label="title"><h4>{{ title }}</h4><ul><Card v-for="id in ids" :key="id" :task="${taskProp}" /></ul></section>'
}

// ---------- 数据 ----------
const byId = reactive({})
const ids = []
for (let i = 1; i <= 9; i++) {
  byId[i] = { id: i, title: '任务 ' + i, status: ['todo', 'doing', 'done'][i % 3] }
  ids.push(i)
}
function idsOf(status) { return ids.filter(id => byId[id].status === status) }

// ---------- TODO：三列的选择器 ----------
${cols}

function move() { byId[3].status = 'doing' }   // 任务 3 原来在待办（3 % 3 === 0）
const view = ref(null)
function show() { view.value = { ...counts } }
return { todo, doing, done, byId, move, show, view, components: { Column } }`

const boardTpl = `<button @click="move">移动任务 3 到进行中</button>
<button @click="show">显示更新次数</button>
<div class="cols">
  <Column title="待办" :ids="todo" :by-id="byId" />
  <Column title="进行中" :ids="doing" :by-id="byId" />
  <Column title="已完成" :ids="done" :by-id="byId" />
</div>
<p v-if="view" class="cnt">卡片更新 <b class="c-card">{{ view.Card }}</b> 次，列更新 <b class="c-col">{{ view.Column }}</b> 次</p>`

const colsStart = `const todo = computed(() => idsOf('todo'))
const doing = computed(() => idsOf('doing'))
const done = computed(() => idsOf('done'))`
const colsSol = `// 内容没变就返回上一次的数组：props 没变，没有变化的列就不会重新渲染
const stable = status => computed(prev => {
  const next = idsOf(status)
  return prev && prev.length === next.length && prev.every((id, i) => id === next[i]) ? prev : next
})
const todo = stable('todo')
const doing = stable('doing')
const done = stable('done')`

export const capBoardUpdates: Exercise = {
  title: '把看板的更新次数降到预算：卡片 0 次，没变的列 0 次',
  ch: 42,
  task: '<p>这个看板有 9 个任务、三列。点“移动任务 3 到进行中”，再点“显示更新次数”。预算是：<b>其他卡片更新 0 次，列更新 2 次</b>（待办和进行中会变，已完成列不该变）。现在两个数字都超了。</p><ol><li>找到让所有卡片更新的原因并修复（只改 <code>Column</code> 的模板里传给 <code>Card</code> 的 props，不要改计数器）。</li><li>找到让没有变化的列也更新的原因并修复（改三列的选择器）。</li></ol><p>移动后任务 3 必须出现在“进行中”列里。</p>',
  tpl: boardTpl,
  js: boardJs(colsStart, '{ ...byId[id] }'),
  solJs: boardJs(colsSol, 'byId[id]'),
  hints: [
    '先看卡片：Vue 比较 props 用的是引用。模板里 `{ ...byId[id] }` 每次渲染都造一个新对象，所有卡片都会认为 props 变了。',
    '再看列：任务 3 的 status 一变，三个 computed 都重新计算，每个都返回一个新数组。即使内容一样，新数组的引用也不同，列的 ids 就变了。computed 的 getter 第一个参数是上一次的值（Vue 3.4 起），内容相同时返回它，下游就不会更新。',
    colsSol
  ],
  async check(T) {
    const show = T.btn('显示更新次数'), mv = T.btn('移动任务 3')
    if (!show || !mv) { T.ok(false, '页面上有“移动任务 3”和“显示更新次数”两个按钮'); return }
    await T.click(mv)
    await T.settle()
    await T.click(show)
    const card = Number((T.$('.c-card') || {}).textContent), col = Number((T.$('.c-col') || {}).textContent)
    const inDoing = Array.from(T.$$('section')).find(s => s.getAttribute('aria-label') === '进行中')
    T.ok(!!inDoing && /任务 3/.test(inDoing.textContent || ''), '移动后任务 3 出现在“进行中”列里')
    T.ok(card === 0, '其他卡片应更新 0 次，现在是 ' + card + ' 次：检查传给 Card 的 props 是不是每次都是新对象')
    T.ok(col === 2, '列应更新 2 次（待办和进行中），现在是 ' + col + ' 次：检查没有变化的列为什么还在更新')
  },
  wrong: [
    {
      js: boardJs(colsSol, '{ ...byId[id] }'),
      why: '只修了列的选择器，卡片的 props 还是每次渲染都新建的对象，待办和进行中两列里的其他卡片仍然全部更新。',
      expectFail: /其他卡片应更新 0 次/
    },
    {
      js: boardJs(colsStart, 'byId[id]'),
      why: '只修了 props。三个选择器每次都返回新数组，已完成列的 ids 虽然内容没变，引用变了，这一列也跟着更新。',
      expectFail: /列应更新 2 次/
    },
    {
      js: boardJs(`const cached = { todo: idsOf('todo'), doing: idsOf('doing'), done: idsOf('done') }
const todo = computed(() => cached.todo)
const doing = computed(() => cached.doing)
const done = computed(() => cached.done)`, 'byId[id]'),
      why: '把选择器缓存成永远不变的数组，更新次数是 0，但任务 3 再也不会出现在“进行中”。预算要在行为正确的前提下达到。',
      expectFail: /任务 3 出现在/
    }
  ],
  faded: {
    js: boardJs(sub(colsSol,
      'return prev && prev.length === next.length && prev.every((id, i) => id === next[i]) ? prev : next',
      'return /* ✏️ 内容和 prev 相同就返回 prev，否则返回 next */ next'), '/* ✏️ 传同一个响应式对象，不要新建 */ { ...byId[id] }')
  }
}
