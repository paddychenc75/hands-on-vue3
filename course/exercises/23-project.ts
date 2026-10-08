import type { Exercise } from './types'
import { sub } from './types'

// 第 23 章的练习。页面版看板的练习（拆 TaskItem、持久化、截止日期排序）在第 13 章；
// 这里只放 Pro 版特有的片段：store 的测试、乐观更新、路由、无障碍。

// ===================== 项目检验 1：为 store 写测试，并用“故意改坏的实现”确认测试能抓到 =====================
// 被测试的是真实的 Pinia store。create(bug) 相当于测试里的 beforeEach(() => setActivePinia(createPinia()))，再取 store。
const testJs = (bodies: [string, string, string, string]) => `// ===== 已给出：迷你的 expect（模仿 Vitest，不用修改） =====
function expect(actual) {
  const show = v => JSON.stringify(v)
  const fail = m => { throw new Error(m) }
  return {
    toBe(e) { if (actual !== e) fail('期望 ' + show(e) + '，实际 ' + show(actual)) },
    toEqual(e) { if (show(actual) !== show(e)) fail('期望 ' + show(e) + '，实际 ' + show(actual)) },
    toHaveLength(n) { if (actual.length !== n) fail('期望长度 ' + n + '，实际 ' + actual.length) },
    toBeUndefined() { if (actual !== undefined) fail('期望 undefined，实际 ' + show(actual)) }
  }
}

// ===== 已给出：被测试的 store（真实的 Pinia，不用修改） =====
// bug 不传：正确的实现。传了 bug：故意改坏的版本，你的测试必须能发现它。
let serial = 0
function makeStore(bug) {
  return defineStore('tasks-' + (bug || 'ok') + '-' + serial++, () => {
    const byId = ref({})
    const ids = ref([])
    let nextId = 1
    function add(title, due) {
      const text = bug === 'blank' ? title : title.trim()
      if (bug !== 'blank' && !text) return null
      const task = { id: nextId++, title: text, status: 'todo', due }
      byId.value[task.id] = task
      ids.value.push(task.id)
      return task
    }
    function move(id, status) {
      if (bug === 'moveAll') Object.values(byId.value).forEach(t => { t.status = status })
      else if (byId.value[id]) byId.value[id].status = status
    }
    function remove(id) {
      delete byId.value[id]
      if (bug !== 'removeKeepsId') ids.value = ids.value.filter(x => x !== id)
    }
    const idsOf = status => {
      const list = ids.value.filter(id => byId.value[id].status === status)
      return bug === 'noSort' ? list : list.sort((a, b) => (byId.value[a].due || '9999').localeCompare(byId.value[b].due || '9999'))
    }
    const columns = computed(() => ({ todo: idsOf('todo'), doing: idsOf('doing'), done: idsOf('done') }))
    return { byId, ids, columns, add, move, remove }
  })
}
// 每个测试开头调用 create()：一个全新的 store，状态互不影响。
// 项目里用 beforeEach(() => setActivePinia(createPinia())) 达到同样的效果；练习台的 pinia 由运行器安装，所以这里给每个 store 一个新 id。
function makeCreate(bug) {
  return () => makeStore(bug)()
}

// ===== TODO：写四个测试。每个测试拿到 create，用 create() 得到全新的 store =====
const tests = [
  ['add：去掉首尾空格，空标题不添加', create => {
${bodies[0]}
  }],
  ['move：只改变目标任务', create => {
${bodies[1]}
  }],
  ['remove：byId 和 ids 都删掉', create => {
${bodies[2]}
  }],
  ['columns：每列按截止日期升序，没有日期的排最后', create => {
${bodies[3]}
  }]
]

// ===== 已给出：把四个测试分别用在正确的实现和四个改坏的实现上 =====
const bugs = [['ok', '正确的实现'], ['blank', '缺陷 blank'], ['moveAll', '缺陷 moveAll'], ['removeKeepsId', '缺陷 removeKeepsId'], ['noSort', '缺陷 noSort']]
const rows = bugs.map(([bug, label]) => ({
  bug, label,
  results: tests.map(([, run]) => {
    try { run(makeCreate(bug === 'ok' ? undefined : bug)); return '通过' } catch (e) { return '失败：' + e.message }
  })
}))
const names = tests.map(t => t[0])
return { rows, names }`

const testTpl = `<table>
  <thead><tr><th>实现</th><th v-for="(n, i) in names" :key="i">{{ n }}</th></tr></thead>
  <tbody>
    <tr v-for="r in rows" :key="r.bug" :data-bug="r.bug">
      <td>{{ r.label }}</td>
      <td v-for="(res, i) in r.results" :key="i" :data-t="i" :data-res="res === '通过' ? 'pass' : 'fail'">{{ res === '通过' ? '通过' : '失败' }}</td>
    </tr>
  </tbody>
</table>
<p class="cap">正确的实现应全部通过；每个改坏的实现应让对应的那个测试失败。</p>`

const SOL_BODIES: [string, string, string, string] = [
  "      const s = create()\n      s.add('  写周报  ')\n      s.add('   ')\n      expect(s.ids).toHaveLength(1)\n      expect(s.byId[1].title).toBe('写周报')",
  "      const s = create()\n      s.add('a')\n      s.add('b')\n      s.move(1, 'done')\n      expect(s.byId[1].status).toBe('done')\n      expect(s.byId[2].status).toBe('todo')",
  "      const s = create()\n      s.add('a')\n      s.add('b')\n      s.remove(1)\n      expect(s.byId[1]).toBeUndefined()\n      expect(s.ids).toEqual([2])",
  "      const s = create()\n      s.add('无日期')\n      s.add('晚', '2026-12-01')\n      s.add('早', '2026-01-01')\n      expect(s.columns.todo.map(id => s.byId[id].title)).toEqual(['早', '晚', '无日期'])"
]
const START_BODIES: [string, string, string, string] = [
  '      // TODO：添加 "  写周报  "，再添加 "   "。断言只有 1 个任务，标题是 "写周报"',
  '      // TODO：添加两个任务，把第 1 个移到 done。断言第 1 个是 done，第 2 个仍是 todo',
  '      // TODO：添加两个任务，删掉 id 为 1 的。断言 byId 里没有它，ids 是 [2]',
  '      // TODO：添加三个任务：无日期的、2026-12-01 的、2026-01-01 的。断言 todo 列的标题顺序是早、晚、无日期'
]
const FADED_BODIES: [string, string, string, string] = [
  "      const s = create()\n      s.add('  写周报  ')\n      s.add('   ')\n      expect(s.ids)./* ✏️ 断言只有 1 个任务 */\n      expect(s.byId[1].title)./* ✏️ 断言标题去掉了空格 */",
  "      const s = create()\n      s.add('a')\n      s.add('b')\n      s.move(1, 'done')\n      expect(s.byId[1].status).toBe('done')\n      expect(/* ✏️ 第 2 个任务的状态 */).toBe('todo')",
  "      const s = create()\n      s.add('a')\n      s.add('b')\n      s.remove(1)\n      expect(s.byId[1]).toBeUndefined()\n      expect(/* ✏️ 顺序数组里应该只剩哪个 id */).toEqual([2])",
  "      const s = create()\n      s.add('无日期')\n      s.add('晚', '2026-12-01')\n      s.add('早', '2026-01-01')\n      expect(s.columns.todo.map(id => s.byId[id].title))./* ✏️ 期望的顺序 */"
]
const NOASSERT: [string, string, string, string] = [
  "      const s = create()\n      s.add('  写周报  ')\n      s.add('   ')",
  "      const s = create()\n      s.add('a')\n      s.add('b')\n      s.move(1, 'done')",
  "      const s = create()\n      s.add('a')\n      s.add('b')\n      s.remove(1)",
  "      const s = create()\n      s.add('无日期')\n      s.add('晚', '2026-12-01')\n      s.add('早', '2026-01-01')"
]

export const projStoreTest: Exercise = {
  title: '项目检验 1：为 store 写测试，并让它抓住四个缺陷',
  ch: 23,
  libs: ['pinia'],
  task: '<p>说明：第 20 章的 <code>testCart</code> 测的是带 store 的组件；这道题直接测 store 本身，同样用“故意改坏”检验测试有没有力量。练习台不能运行 Vitest，所以脚本里有一个迷你的 <code>expect</code>。被测试的是<b>真实的 Pinia store</b>。<code>create()</code> 每次造一个全新的 store，状态互不影响，相当于项目里 <code>beforeEach(() => setActivePinia(createPinia()))</code> 加 <code>useTaskStore()</code>。</p><p>store 还有四个<b>故意改坏</b>的版本（blank、moveAll、removeKeepsId、noSort）。下面的表格把你的四个测试，分别用在正确的实现和四个改坏的实现上。</p><ol><li>补全四个测试的函数体，每个测试都要有断言。</li><li>让<b>正确的实现</b>通过全部四个测试。</li><li>让第 N 个改坏的实现，使第 N 个测试失败。也就是每个测试都要能“抓住”它对应的缺陷。</li></ol><p>不要修改 store 和 expect。没有断言的测试永远通过，抓不住任何缺陷。</p>',
  tpl: testTpl,
  js: testJs(START_BODIES),
  solJs: testJs(SOL_BODIES),
  faded: { js: testJs(FADED_BODIES) },
  hints: [
    '好测试要能抓住缺陷。对每个缺陷问自己：它会让哪个可观察的结果，和正确的实现不一样？例如 blank 缺陷不去空格，也会接受空标题。',
    '测试 2 需要两个任务：只有一个任务时，“所有任务都改成 done”和“只改目标”看不出区别。测试 3 要同时断言 byId 和 ids：缺陷 removeKeepsId 只删了 byId，只看 byId 发现不了它。测试 4 要有三个任务，而且添加顺序和期望顺序不同。',
    "每个测试先 `const s = create()`，再操作，再用 expect 断言。例如测试 1：add 两次，`expect(s.ids).toHaveLength(1)`，`expect(s.byId[1].title).toBe('写周报')`。"
  ],
  async check(T) {
    const cell = (bug: string, i: number) => T.$(`tr[data-bug="${bug}"] td[data-t="${i}"]`)
    const res = (bug: string, i: number) => (cell(bug, i)?.getAttribute('data-res') || 'missing')
    T.ok(T.$$('tr[data-bug]').length === 5, '表格里有正确的实现和四个缺陷共 5 行。表格代码不要改')
    const bad: string[] = []
    for (let i = 0; i < 4; i++) if (res('ok', i) !== 'pass') bad.push(String(i + 1))
    T.ok(bad.length === 0, '正确的实现应通过全部四个测试' + (bad.length ? '，现在测试 ' + bad.join('、') + ' 失败了：期望值写错，或者还没有补全' : ''))
    const pairs: [string, number, string][] = [['blank', 0, 'add'], ['moveAll', 1, 'move'], ['removeKeepsId', 2, 'remove'], ['noSort', 3, 'columns']]
    for (const [bug, i, name] of pairs) {
      T.ok(res(bug, i) === 'fail', '测试 ' + (i + 1) + '（' + name + '）应该抓住缺陷 ' + bug + '：它让这个测试失败。现在这个测试对缺陷也通过了，说明它没有断言，或者断言太弱')
    }
  },
  wrong: [
    {
      js: testJs(NOASSERT),
      why: '测试只做了操作，没有断言。没有断言的测试永远通过，所以它对正确的实现和四个缺陷的结果完全一样，什么也抓不住。',
      expectFail: /应该抓住缺陷/
    },
    {
      js: testJs([SOL_BODIES[0].replace("toBe('写周报')", "toBe('  写周报  ')"), SOL_BODIES[1], SOL_BODIES[2], SOL_BODIES[3]]),
      why: '期望值写错了：add 应该去掉首尾空格，测试却要求保留。正确的实现反而通不过这个测试。测试要描述正确的行为，不是迎合某个实现。',
      expectFail: /正确的实现应通过/
    },
    {
      js: testJs([SOL_BODIES[0], "      const s = create()\n      s.add('a')\n      s.move(1, 'done')\n      expect(s.byId[1].status).toBe('done')", SOL_BODIES[2], SOL_BODIES[3]]),
      why: '测试 2 只添加了一个任务。“所有任务都改成 done”和“只改目标任务”在只有一个任务时结果相同，所以抓不住缺陷 moveAll。要有第二个任务，并断言它没有变。',
      expectFail: /moveAll/
    },
    {
      js: testJs([SOL_BODIES[0], SOL_BODIES[1], "      const s = create()\n      s.add('a')\n      s.add('b')\n      s.remove(1)\n      expect(s.byId[1]).toBeUndefined()", SOL_BODIES[3]]),
      why: '测试 3 只检查了 byId。缺陷 removeKeepsId 正好把 byId 删对了，只是忘了改 ids，这个测试发现不了。byId 和 ids 是两份要同步的数据，测试要同时断言两处。',
      expectFail: /removeKeepsId/
    }
  ]
}

// ===================== 乐观更新：store 的 move =====================
const NEXT_TPL = `<p>让下一次移到这一列的请求失败：
  <select v-model="failTo" aria-label="让哪一列失败">
    <option value="">都不失败</option><option value="doing">进行中</option><option value="done">已完成</option>
  </select>
</p>
<ul>
  <li v-for="t in tasks" :key="t.id" :data-id="t.id">
    <span class="title">{{ t.title }}</span> · <span class="st">{{ LABEL[t.status] }}</span>
    <button v-if="NEXT[t.status]" @click="move(t.id, NEXT[t.status])">移到下一列</button>
  </li>
</ul>
<p class="notice" role="status">{{ notice }}</p>`

const nextJs = (moveBody: string) => `// 假接口：50 毫秒后返回。目标列等于 failTo 时失败。不要修改。
const failTo = ref('')
const patchTask = (id, patch) => new Promise((resolve, reject) =>
  setTimeout(() => (patch.status === failTo.value ? reject(new Error('500')) : resolve({ id, ...patch })), 50))
const LABEL = { todo: '待办', doing: '进行中', done: '已完成' }
const NEXT = { todo: 'doing', doing: 'done', done: null }

const useTasks = defineStore('tasks', () => {
  const byId = ref({
    1: { id: 1, title: '写测试', status: 'todo' },
    2: { id: 2, title: '部署', status: 'todo' }
  })
  const notice = ref('')

  // TODO：把任务移到 to。先改界面，再发请求；请求失败要回滚，并在 notice 里写“已恢复”
  async function move(id, to) {
${moveBody}
  }
  return { byId, notice, move }
})

const store = useTasks()
const { byId, notice } = storeToRefs(store)
const tasks = computed(() => Object.values(byId.value))
return { tasks, notice, failTo, LABEL, NEXT, move: (id, to) => store.move(id, to) }`

const NEXT_SOL = `    const task = byId.value[id]
    if (!task) return
    const from = task.status
    task.status = to                       // 先改界面
    notice.value = ''
    try {
      await patchTask(id, { status: to })  // 再发请求
    } catch (e) {
      // 只有任务还停在我们设置的状态时才回滚：期间又被移走了，就不要覆盖
      if (byId.value[id].status === to) byId.value[id].status = from
      notice.value = '移动“' + task.title + '”失败，已恢复'
    }`

export const kanbanStore: Exercise = {
  title: '延伸练习：store 的 move 先改界面，失败再回滚',
  ch: 23,
  libs: ['pinia'],
  task: '<p>这道题运行在真实的 Pinia 上。这是第 18 章“乐观更新”的模式用在 store 的 action 里；新增的难点是回滚之前，同一个任务可能已经被别的操作改过。<code>patchTask</code> 是假接口，页面上的下拉框可以让“移到某一列”的请求失败。</p><p>补全 store 的 <code>move</code>：</p><ol><li><b>先改界面</b>：点击后，任务马上出现在新的一列，不等请求返回。</li><li><b>失败回滚</b>：请求失败后，任务回到原来的列，<code>notice</code> 里写“已恢复”。</li><li><b>不覆盖后来的移动</b>：回滚之前如果任务又被移走了，不要把它改回去。</li></ol><p>action 自己处理失败，不要把错误抛出去。</p>',
  tpl: NEXT_TPL,
  js: nextJs('    // TODO：先 await patchTask(id, { status: to })，再改 status（这是悲观更新，界面要等请求）\n    await patchTask(id, { status: to })\n    byId.value[id].status = to'),
  solJs: nextJs(NEXT_SOL),
  hints: [
    '乐观更新分三步：记下旧状态，立刻改成新状态，再发请求。只有请求失败才需要用到旧状态。',
    '失败时不要无条件写回旧状态。想想：回滚之前，用户可能已经把同一个任务又移了一次。回滚前先看任务的当前状态是不是你刚才设置的那个。',
    NEXT_SOL
  ],
  async check(T) {
    const s = T.store('tasks')
    if (!s || typeof s.move !== 'function') { T.ok(false, '要有 id 为 tasks 的 store，并带 move action'); return }
    const st = (id: number) => (T.$(`li[data-id="${id}"] .st`)?.textContent || '').trim()
    const moveBtn = (id: number) => T.$(`li[data-id="${id}"] button`) as HTMLButtonElement | null
    const sel = T.$('select') as HTMLSelectElement
    // 1 乐观：点击后立刻变化
    const b1 = moveBtn(1)
    if (!b1) { T.ok(false, '任务 1 有“移到下一列”按钮'); return }
    await T.click(b1)
    T.ok(st(1) === '进行中', '点击后任务立刻出现在“进行中”，不等请求返回（现在是“' + st(1) + '”）')
    await T.settle(); await new Promise(r => setTimeout(r, 90)); await T.settle()
    T.ok(st(1) === '进行中' && !/已恢复/.test(T.text()), '请求成功后保持在“进行中”，没有提示')
    // 2 失败回滚
    sel.value = 'doing'; sel.dispatchEvent(new Event('change'))
    await T.settle()
    await T.click(moveBtn(2))
    T.ok(st(2) === '进行中', '失败的请求也先让界面变化（现在是“' + st(2) + '”）')
    const back = await T.waitFor(() => st(2) === '待办', 800)
    T.ok(back, '请求失败后，任务回到“待办”（现在是“' + st(2) + '”）')
    T.ok(/已恢复/.test(T.$('.notice')?.textContent || ''), 'notice 里写了“已恢复”')
    // 3 不覆盖后来的移动：第一次移动会失败，失败之前又把它移到“已完成”
    const p1 = s.move(2, 'doing')
    const p2 = s.move(2, 'done')
    await Promise.all([p1, p2])
    await T.settle()
    T.ok(st(2) === '已完成', '回滚之前任务又被移到“已完成”：不能被旧的回滚改回“待办”（现在是“' + st(2) + '”）')
  },
  wrong: [
    {
      js: nextJs('    await patchTask(id, { status: to })\n    byId.value[id].status = to'),
      why: '这是悲观更新：先等请求返回才改界面。请求要 50 毫秒，用户点击后这段时间里什么也没有发生。乐观更新是先改界面，请求失败再回滚。',
      expectFail: /立刻/
    },
    {
      js: nextJs("    const task = byId.value[id]\n    task.status = to\n    try { await patchTask(id, { status: to }) } catch (e) { notice.value = '移动失败，已恢复' }"),
      why: '请求失败后只写了提示，没有把状态改回去。界面上的任务停在服务器并不认可的列里，提示说“已恢复”，实际没有。',
      expectFail: /回到/
    },
    {
      js: nextJs("    const task = byId.value[id]\n    const from = task.status\n    task.status = to\n    try { await patchTask(id, { status: to }) } catch (e) { task.status = from; notice.value = '移动失败，已恢复' }"),
      why: '失败时无条件写回旧状态。回滚之前任务如果又被移到别的列，这次回滚会把用户后来的操作覆盖掉。回滚前要先确认任务还停在你设置的状态。',
      expectFail: /不能被旧的回滚/
    }
  ],
  faded: {
    js: nextJs(sub(sub(sub(NEXT_SOL,
      "    task.status = to                       // 先改界面\n", "    /* ✏️ 先把任务改成新状态 */\n"),
      "if (byId.value[id].status === to) byId.value[id].status = from", "/* ✏️ 任务还停在新状态时，才改回 from */ byId.value[id].status = from"),
      "notice.value = '移动“' + task.title + '”失败，已恢复'", "/* ✏️ 写提示，要包含“已恢复” */"))
  }
}

// ===================== 路由：详情页的参数、不存在和 404 =====================
const routeSolJs = `const tasks = [
  { id: 1, title: '写测试' },
  { id: 2, title: '部署' }
]

const Board = { template: '<p class="page">看板</p>' }

// 详情页：id 是数字。不要修改。
const Detail = {
  props: ['id'],
  setup(props) {
    const task = computed(() => tasks.find(t => t.id === props.id))
    return { task }
  },
  template: '<p class="page"><template v-if="task">任务 {{ task.id }}：{{ task.title }}</template><template v-else>任务不存在</template></p>'
}
const NotFound = { template: '<p class="page">找不到这个页面</p>' }

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: Board },
    {
      path: '/task/:id(\\\\d+)',
      component: Detail,
      props: route => ({ id: Number(route.params.id) })   // 路由参数是字符串，转成数字再给详情页
    },
    { path: '/:pathMatch(.*)*', component: NotFound }
  ]
})

return { router }`

const routeStartJs = routeSolJs
  .replace("      path: '/task/:id(\\\\d+)',\n      component: Detail,\n      props: route => ({ id: Number(route.params.id) })   // 路由参数是字符串，转成数字再给详情页\n    },\n    { path: '/:pathMatch(.*)*', component: NotFound }\n", "      path: '/task/:id',\n      component: Detail\n      // TODO 1：详情页要收到数字 id\n    }\n    // TODO 2：其他地址显示 NotFound\n")

export const kanbanRoute: Exercise = {
  title: '延伸练习：/task/:id 详情页、不存在和 404',
  ch: 23,
  libs: ['vue-router'],
  task: '<p>这道题运行在真实的 Vue Router 上（只能用 <code>createMemoryHistory</code>）。详情页组件 <code>Detail</code> 用 <code>props.id</code>（数字）去找任务，已经写好，不要修改。只改路由表：</p><ol><li><code>/task/1</code> 显示“任务 1：写测试”。路由参数总是字符串，要转成数字再交给 <code>Detail</code>。</li><li><code>/task/99</code> 显示“任务不存在”，没有错误。</li><li>其他地址（例如 <code>/nope</code>、<code>/task/abc</code>）显示“找不到这个页面”，而不是空白。</li></ol>',
  tpl: `<nav>
  <RouterLink to="/">看板</RouterLink> |
  <RouterLink to="/task/1">任务 1</RouterLink> |
  <RouterLink to="/task/99">任务 99</RouterLink> |
  <RouterLink to="/nope">不存在的地址</RouterLink>
</nav>
<RouterView />`,
  js: routeStartJs,
  solJs: routeSolJs,
  hints: [
    '路由参数 route.params.id 总是字符串。路由配置的 props 可以写成函数，在里面做类型转换：props: route => ({ id: Number(route.params.id) })。17.5 节讲了读取路由参数。',
    '兜底路由写在最后：path: \'/:pathMatch(.*)*\'，它匹配所有没有被前面规则接住的地址。给 id 参数加正则 (\\\\d+)，/task/abc 就不会进入详情页。',
    routeSolJs
  ],
  async check(T) {
    const r = T.router
    if (!r) { T.ok(false, '脚本里要 createRouter(…) 并 return { router }'); return }
    const page = () => ((T.$('.page') || {}).textContent || '').trim()
    await T.push('/task/1')
    T.ok(page() === '任务 1：写测试', '/task/1 显示“任务 1：写测试”（现在是“' + page() + '”）。路由参数是字符串 "1"，详情页里 t.id === props.id 比较的是数字')
    await T.push('/task/99')
    T.ok(page() === '任务不存在', '/task/99 显示“任务不存在”（现在是“' + page() + '”）')
    await T.push('/nope')
    T.ok(page() === '找不到这个页面', '/nope 显示“找不到这个页面”（现在是“' + page() + '”）')
    await T.push('/task/abc')
    T.ok(/找不到这个页面|任务不存在/.test(page()), '/task/abc 不能是空白或报错（现在是“' + page() + '”）')
    await T.push('/')
    T.ok(page() === '看板', '/ 显示看板')
  },
  wrong: [
    {
      js: routeSolJs.replace("props: route => ({ id: Number(route.params.id) })   // 路由参数是字符串，转成数字再给详情页", 'props: true'),
      why: '`props: true` 把 route.params 原样传给组件，id 是字符串 "1"。详情页用 t.id === props.id 比较，数字和字符串永远不相等，所以找不到任务。要在 props 函数里用 Number() 转换。',
      expectFail: /任务 1/
    },
    {
      js: routeSolJs.replace("    { path: '/:pathMatch(.*)*', component: NotFound }\n", ''),
      why: '没有兜底路由：/nope 没有匹配任何规则，router 只会在控制台警告，页面是空白。用户看不到任何说明。最后加一条 /:pathMatch(.*)*。',
      expectFail: /找不到这个页面/
    },
    {
      js: routeSolJs.replace('props: route => ({ id: Number(route.params.id) })', 'props: route => ({ id: route.params.id })'),
      why: '漏了 Number()：props 函数返回了字符串 id，详情页里数字和字符串比较永远是假。写了 props 函数不等于做了类型转换。',
      expectFail: /任务 1/
    }
  ],
  faded: {
    js: sub(sub(routeSolJs,
      "props: route => ({ id: Number(route.params.id) })   // 路由参数是字符串，转成数字再给详情页", "props: route => ({ id: /* ✏️ 把字符串参数转成数字 */ route.params.id })"),
      "{ path: '/:pathMatch(.*)*', component: NotFound }", "/* ✏️ 兜底路由：匹配所有其他地址，显示 NotFound */")
  }
}

// ===================== 项目检验 2：无障碍的最低要求 =====================
const a11yJs = `// ---------- 数据和方法。不要修改。 ----------
const tasks = ref([
  { id: 1, title: '买菜', done: false },
  { id: 2, title: '写周报', done: true },
  { id: 3, title: '健身', done: false }
])
const left = computed(() => tasks.value.filter(t => !t.done).length)
function toggle(t) { t.done = !t.done }
function remove(id) { tasks.value = tasks.value.filter(t => t.id !== id) }

return { tasks, left, toggle, remove }`

const a11yTpl = `<ul>
  <li v-for="t in tasks" :key="t.id">
    <span class="box" @click="toggle(t)">{{ t.done ? '☑' : '☐' }}</span>
    <span :class="{ done: t.done }">{{ t.title }}</span>
    <span class="x" @click="remove(t.id)">✕</span>
  </li>
</ul>
<div class="count">还剩 {{ left }} 项</div>`

const a11ySolTpl = `<ul>
  <li v-for="t in tasks" :key="t.id">
    <label><input type="checkbox" :checked="t.done" @change="toggle(t)"> {{ t.title }}</label>
    <button type="button" :aria-label="'删除 ' + t.title" @click="remove(t.id)">✕</button>
  </li>
</ul>
<p role="status">还剩 {{ left }} 项</p>`

export const projA11y: Exercise = {
  title: '项目检验 2：让任务列表只用键盘和读屏软件也能用',
  ch: 23,
  task: '<p>下面的列表用鼠标能用，但键盘和读屏软件用不了：勾选和删除都是不能获得焦点的 <code>&lt;span&gt;</code>，剩余数量变化时读屏软件不会读出来。按验收清单的“无障碍的最低要求”修复它。</p><ol><li>每个任务的完成状态是一个<b>原生复选框</b>，它的名称（用 label 关联）包含任务标题。</li><li>删除是一个<b>原生 button</b>，名称是“删除”加任务标题，例如“删除 买菜”。</li><li>“还剩 N 项”所在的元素是一个状态区域（<code>role="status"</code> 或 <code>aria-live</code>），数量变化时读屏软件会读出来。</li></ol><p>不能改变行为：勾选后剩余数量减少；删除后任务消失。数据和方法不要改。</p>',
  tpl: a11yTpl,
  js: a11yJs,
  solTpl: a11ySolTpl,
  faded: {
    tpl: `<ul>
  <li v-for="t in tasks" :key="t.id">
    <label><input type="checkbox" :checked="t.done" @change="/* ✏️ 切换这个任务 */ null"> {{ t.title }}</label>
    <button type="button" :aria-label="/* ✏️ “删除 ”加任务标题 */ ''" @click="remove(t.id)">✕</button>
  </li>
</ul>
<!-- ✏️ 给这个段落加上状态区域的 role -->
<p>还剩 {{ left }} 项</p>`
  },
  hints: [
    '先用键盘试：按 Tab，焦点会停在哪里？`<span>` 和 `<div>` 不能获得焦点，也没有角色。原生元素自带这些：`<input type="checkbox">` 是复选框，`<button>` 是按钮。',
    '复选框要有名称：把 `<input>` 和标题放进同一个 `<label>`。只有符号的按钮没有名称：给 `<button>` 加 `aria-label`。数量变化要被读出来：给它所在的元素加 `role="status"`。',
    a11ySolTpl
  ],
  async check(T) {
    const tick = () => new Promise<void>(r => setTimeout(r, 30))
    const nameOf = (el: Element): string => {
      const aria = el.getAttribute('aria-label')
      if (aria) return aria.trim()
      const labels = (el as HTMLInputElement).labels
      if (labels && labels.length) return Array.from(labels).map(l => l.textContent || '').join(' ').trim()
      const by = el.getAttribute('aria-labelledby')
      if (by) return by.split(/\s+/).map(id => (document.getElementById(id) || { textContent: '' }).textContent).join(' ').trim()
      return (el.textContent || '').trim()
    }
    const boxes = T.$$('input[type=checkbox]') as HTMLInputElement[]
    T.ok(boxes.length === 3, '每个任务有一个原生复选框（input type=checkbox），现在有 ' + boxes.length + ' 个')
    const titles = ['买菜', '写周报', '健身']
    boxes.forEach((b, i) => T.ok(nameOf(b).includes(titles[i]), '第 ' + (i + 1) + ' 个复选框的名称应包含“' + titles[i] + '”（用 label 关联），现在名称是“' + nameOf(b) + '”'))
    const btns = T.$$('li button') as HTMLButtonElement[]
    T.ok(btns.length === 3, '每个任务有一个原生 button 作为删除按钮，现在有 ' + btns.length + ' 个')
    btns.forEach((b, i) => T.ok(/删除/.test(nameOf(b)) && nameOf(b).includes(titles[i]), '第 ' + (i + 1) + ' 个按钮的名称应是“删除 ' + titles[i] + '”，现在是“' + nameOf(b) + '”'))
    const live = T.$$('[role=status],[aria-live]').find(e => /还剩/.test(e.textContent || ''))
    T.ok(!!live, '“还剩 N 项”所在的元素应是状态区域（role="status" 或 aria-live），数量变化才会被读出来')
    if (boxes[0]) {
      boxes[0].focus()
      T.ok(document.activeElement === boxes[0], '复选框可以用键盘获得焦点')
      await T.click(boxes[0])
      await tick()
      T.ok(/还剩 1 项/.test(T.text()), '勾选“买菜”后剩余数量变为 1')
    }
    if (btns[1]) {
      await T.click(btns[1])
      await tick()
      T.ok(T.$$('li').length === 2 && !/写周报/.test(T.text()), '删除“写周报”后，它从列表中消失')
    }
  },
  wrong: [
    {
      tpl: a11ySolTpl.replace('<label><input type="checkbox" :checked="t.done" @change="toggle(t)"> {{ t.title }}</label>', '<input type="checkbox" :checked="t.done" @change="toggle(t)"> <span>{{ t.title }}</span>'),
      why: '复选框旁边有文字，但文字和复选框没有关联。读屏软件读到的是“复选框”，不知道它对应哪个任务。要用 label 把它们关联起来（包住它，或 for 指向它的 id）。',
      expectFail: /复选框的名称/
    },
    {
      tpl: a11ySolTpl.replace(`:aria-label="'删除 ' + t.title" `, ''),
      why: '按钮里只有“✕”，读屏软件读出的名称是“✕”或者什么也不读。图标按钮要用 aria-label 给出名称，并且说明删的是哪一项。',
      expectFail: /按钮的名称/
    },
    {
      tpl: a11ySolTpl.replace(/<button type="button" (:aria-label="[^"]*") @click="remove\(t.id\)">✕<\/button>/, '<span role="button" tabindex="0" $1 @click="remove(t.id)">✕</span>'),
      why: 'role 和 tabindex 能让 span 获得焦点和角色，但键盘按 Enter 或空格不会触发 click，你还得自己写按键处理。原生 button 全部自带。优先用原生元素。',
      expectFail: /原生 button/
    },
    {
      tpl: a11ySolTpl.replace('<p role="status">', '<p>'),
      why: '剩余数量变化时，读屏软件不会主动读出普通的段落。要给它 role="status"（或 aria-live="polite"）。',
      expectFail: /状态区域/
    }
  ]
}
