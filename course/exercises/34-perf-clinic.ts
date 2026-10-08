import type { Exercise } from './types'
import { sub } from './types'

// ===================== 病例 1：打字时，每个子组件都在更新 =====================
const rerenderJs = `// ===== 计数器（不用修改）：每次 Row 更新，页面上的计数加 1 =====
const counts = { rows: 0 }
function paint() {
  const el = document.getElementById('rowUpdates')
  if (el) el.textContent = counts.rows
}

// ===== 病例：Row 的 props 里有一个内联对象 =====
const Row = {
  props: ['item', 'opts'],
  setup() {
    onUpdated(() => { counts.rows++; paint() })
  },
  template: '<li :class="{ hot: opts.hot }">{{ item.name }}</li>'
}

const kw = ref('')
const items = reactive([
  { id: 1, name: '买菜' }, { id: 2, name: '写周报' }, { id: 3, name: '健身' },
  { id: 4, name: '读书' }, { id: 5, name: '打扫' }, { id: 6, name: '缴费' }
])
function rename() { items[2].name += '！' }

return { kw, items, rename, components: { Row } }`

const rerenderTpl = `<input id="kw" v-model="kw" placeholder="搜索词">
<p id="shown">搜索词：{{ kw }}</p>
<button id="rename" @click="rename">改第 3 行的名字</button>
<ul>
  <Row v-for="it in items" :key="it.id" :item="it" :opts="{ hot: it.id === 3 }" />
</ul>
<p>Row 更新了 <b id="rowUpdates">0</b> 次</p>`

const rerenderSolTpl = rerenderTpl.replace(':opts="{ hot: it.id === 3 }"', ':hot="it.id === 3"')
const rerenderSolJs = sub(sub(rerenderJs, "props: ['item', 'opts']", "props: ['item', 'hot']"), '{ hot: opts.hot }', '{ hot }')

export const clinicRerender: Exercise = {
  title: '诊所病例 1：打字时，Row 的内容没变却一直更新',
  ch: 34,
  task: '<p>症状：在搜索框里打字，页面下方的计数显示 Row 一直在更新，可是 Row 显示的内容没有变。</p><ol><li>在搜索框里打 3 个字，读出计数。这是基线。</li><li>根据本章的诊断流程，找出 Row 更新的原因。</li><li>只修改代码，让<b>打 3 个字后计数仍为 0</b>。</li></ol><p>不能改变行为：第 3 行仍然高亮；点“改第 3 行的名字”后，只有这一行更新（计数加 1），页面显示新名字。计数器代码不要改。</p>',
  tpl: rerenderTpl,
  js: rerenderJs,
  solTpl: rerenderSolTpl,
  solJs: rerenderSolJs,
  faded: {
    tpl: rerenderTpl.replace(':opts="{ hot: it.id === 3 }"', ':hot="/* ✏️ 传一个原始值：这一行是否高亮 */"'),
    js: sub(sub(rerenderJs, "props: ['item', 'opts']", "props: ['item', /* ✏️ 第二个 prop 的名字 */]"), '{ hot: opts.hot }', '{ hot: /* ✏️ 读取这个 prop */ }')
  },
  hints: [
    '先用数字确认症状：打 3 个字，计数是 18（6 行乘 3 次）。Row 的 props 在这 3 次里“看起来没变”，但 Vue 比较的是引用，不是内容。看模板里传给 Row 的每个 prop，哪一个在每次渲染时都是新值？第 26 章“26.2 传递稳定的 props”讲了原因。',
    '`:opts="{ hot: it.id === 3 }"` 在每次渲染时都创建一个新对象。让传给 Row 的 prop 在内容不变时引用也不变。最简单的办法：只传 Row 真正需要的原始值（布尔值）。',
    "把 Row 的 props 改成 ['item', 'hot']，模板里 `:class=\"{ hot }\"`，父模板里传 `:hot=\"it.id === 3\"`。"
  ],
  async check(T) {
    const tick = () => new Promise<void>(r => setTimeout(r, 30))
    const num = () => Number((T.$('#rowUpdates') || { textContent: 'NaN' }).textContent)
    const kw = T.$('#kw') as HTMLInputElement | null
    T.ok(!!kw && !!T.$('#rowUpdates') && !!T.$('#rename'), '页面上有搜索框、改名按钮和计数。计数器的代码不要删')
    if (!kw) return
    for (const v of ['a', 'ab', 'abc']) {
      kw.value = v
      kw.dispatchEvent(new Event('input'))
      await tick()
    }
    const n1 = num()
    T.ok(n1 === 0, '打 3 个字后，Row 应更新 0 次，现在是 ' + n1 + ' 次。Row 的 props 内容没变，不该更新')
    T.ok(/abc/.test((T.$('#shown') || { textContent: '' }).textContent || ''), '搜索词仍然显示在页面上')
    const hot = T.$$('li').map(li => li.classList.contains('hot'))
    T.ok(hot.length === 6 && hot.filter(Boolean).length === 1 && hot[2] === true, '只有第 3 行高亮（现在高亮的行：' + hot.map((h, i) => (h ? i + 1 : '')).join('') + '）')
    await T.click(T.$('#rename'))
    await tick()
    const li3 = T.$$('li')[2]
    T.ok(!!li3 && (li3.textContent || '').trim() === '健身！', '改名后第 3 行显示“健身！”（行为不能变）')
    const n2 = num()
    T.ok(n2 === 1, '改名后只有第 3 行更新，计数应为 1，现在是 ' + n2)
  },
  wrong: [
    {
      tpl: rerenderTpl.replace(':opts="{ hot: it.id === 3 }"', ':opts="Object.freeze({ hot: it.id === 3 })"'),
      js: rerenderJs,
      why: '冻结对象不会让引用稳定。每次渲染仍然创建一个新对象，Row 照样更新。Vue 比较的是引用。',
      expectFail: /打 3 个字后/
    },
    {
      tpl: rerenderSolTpl.replace(':hot="it.id === 3"', ':hot="false"'),
      js: rerenderSolJs,
      why: '把高亮条件写死为 false，prop 变成稳定的原始值，计数确实是 0。可是第 3 行不再高亮，行为变了。优化不能以丢掉功能为代价。',
      expectFail: /高亮/
    },
    {
      tpl: rerenderTpl.replace('v-model="kw"', 'v-model.lazy="kw"'),
      js: rerenderJs,
      why: 'v-model.lazy 让输入框在失去焦点时才更新 kw。打字时 Root 不更新，计数是 0，可是页面上的搜索词也不再随输入变化。这是在掩盖症状：Row 的 props 仍然不稳定，别的原因触发 Root 更新时，Row 还是会更新。',
      expectFail: /搜索词仍然显示/
    }
  ]
}

// ===================== 病例 2：不相干的输入，让昂贵的计算和保存反复运行 =====================
const computeJs = `// ===== 计数器（不用修改） =====
const calls = { sum: 0, save: 0 }
function paint() {
  const a = document.getElementById('sumCalls')
  const b = document.getElementById('saveCalls')
  if (a) a.textContent = calls.sum
  if (b) b.textContent = calls.save
}

// 假设这个统计很慢
function summarize(list) {
  calls.sum++
  paint()
  return list.filter(t => t.done).length + '/' + list.length
}

const state = reactive({
  query: '',
  todos: [
    { id: 1, text: '买菜', done: false },
    { id: 2, text: '写周报', done: false },
    { id: 3, text: '健身', done: true }
  ]
})

// 待办变化时保存（这里只计数）
watch(state, () => { calls.save++; paint() }, { deep: true })

const shown = computed(() => state.todos.filter(t => t.text.includes(state.query)))
onMounted(paint)

return { state, shown, summarize }`

const computeTpl = `<input id="q" v-model="state.query" placeholder="搜索">
<ul>
  <li v-for="t in shown" :key="t.id">
    <label><input type="checkbox" :checked="t.done" @change="t.done = !t.done"> {{ t.text }}</label>
  </li>
</ul>
<p id="summary">完成：{{ summarize(state.todos) }}</p>
<p>summarize 运行了 <b id="sumCalls">0</b> 次，保存了 <b id="saveCalls">0</b> 次</p>`

const SAVE_WATCH = "watch(state, () => { calls.save++; paint() }, { deep: true })"
const SAVE_WATCH_OK = "watch(() => state.todos, () => { calls.save++; paint() }, { deep: true })"
const computeSolJs = sub(sub(computeJs, SAVE_WATCH, SAVE_WATCH_OK), 'return { state, shown, summarize }', 'const summary = computed(() => summarize(state.todos))\n\nreturn { state, shown, summary }')
const computeSolTpl = sub(computeTpl, '{{ summarize(state.todos) }}', '{{ summary }}')

export const clinicCompute: Exercise = {
  title: '诊所病例 2：在搜索框打字，统计和保存却一直在运行',
  ch: 34,
  task: '<p>症状：在搜索框里打字时，“完成”统计会重新计算，待办列表也被保存，可是待办根本没有改变。</p><ol><li>在搜索框里打 3 个字，读出两个计数。这是基线。</li><li>找出这两个计数增长的原因。它们的原因不同。</li><li>只修改代码，让<b>打字时两个计数都不增长</b>，而勾选一个待办后 summarize 运行 1 次、保存 1 次。</li></ol><p>不能改变行为：搜索仍然过滤列表；勾选后“完成”统计正确显示。计数器代码不要改。</p>',
  tpl: computeTpl,
  js: computeJs,
  solTpl: computeSolTpl,
  solJs: computeSolJs,
  faded: {
    tpl: sub(computeTpl, '{{ summarize(state.todos) }}', '{{ /* ✏️ 显示统计结果 */ }}'),
    js: sub(sub(computeJs, SAVE_WATCH, "watch(/* ✏️ 只侦听待办，不侦听整个 state */, () => { calls.save++; paint() }, { deep: true })"), 'return { state, shown, summarize }', 'const summary = /* ✏️ 让统计带缓存 */\n\nreturn { state, shown, summary }')
  },
  hints: [
    '先看计数：打 3 个字后，summarize 从 1 变成 4，保存从 0 变成 3。两个原因不同。第一个：`{{ summarize(state.todos) }}` 写在模板里，每次渲染都会运行。第二个：`watch(state, …, { deep: true })` 侦听整个 state，包括 query。',
    '第一个用 computed：它带缓存，依赖没变就不重新计算（第 4 章）。第二个：watch 的来源改成一个 getter，只返回需要侦听的那部分。',
    '`const summary = computed(() => summarize(state.todos))`，模板写 `{{ summary }}`。侦听写成 `watch(() => state.todos, 回调, { deep: true })`。'
  ],
  async check(T) {
    const tick = () => new Promise<void>(r => setTimeout(r, 30))
    const num = (id: string) => Number((T.$(id) || { textContent: 'NaN' }).textContent)
    const q = T.$('#q') as HTMLInputElement | null
    T.ok(!!q && !!T.$('#sumCalls') && !!T.$('#saveCalls'), '页面上有搜索框和两个计数。计数器的代码不要删')
    if (!q) return
    const type = async (v: string) => { q.value = v; q.dispatchEvent(new Event('input')); await tick() }
    for (const v of ['a', 'ab', 'abc']) await type(v)
    T.ok(num('#sumCalls') === 1, '打 3 个字后，summarize 应仍然只运行过 1 次（首次渲染），现在是 ' + num('#sumCalls') + ' 次。待办没变，不该重新统计')
    T.ok(num('#saveCalls') === 0, '打 3 个字时不应保存（待办没变），现在保存了 ' + num('#saveCalls') + ' 次')
    await type('买')
    T.ok(T.$$('li').length === 1, '搜索“买”后列表只剩 1 行（过滤的行为不能变）')
    await type('')
    T.ok(T.$$('li').length === 3, '清空搜索词后列表回到 3 行')
    const box = T.$$('li input')[0]
    T.ok(!!box, '列表里有复选框')
    if (!box) return
    await T.click(box)
    await tick()
    T.ok(/2\/3/.test((T.$('#summary') || { textContent: '' }).textContent || ''), '勾选后统计显示“2/3”')
    T.ok(num('#sumCalls') === 2, '勾选一项后，summarize 应运行 1 次（累计 2 次），现在累计 ' + num('#sumCalls') + ' 次')
    T.ok(num('#saveCalls') === 1, '勾选一项后应保存 1 次，现在累计 ' + num('#saveCalls') + ' 次。只修打字的问题时，别把保存删掉')
  },
  wrong: [
    {
      js: sub(computeSolJs, SAVE_WATCH_OK, SAVE_WATCH),
      why: '只把统计改成了 computed，保存的 watch 仍然侦听整个 state。query 一变就保存，保存计数继续增长。',
      expectFail: /不应保存/
    },
    {
      js: sub(computeSolJs, SAVE_WATCH_OK, '// 不再保存'),
      why: '把 watch 删掉后，打字时当然不保存了。但勾选待办也不保存了，数据丢失。修性能不能删掉功能。',
      expectFail: /勾选一项后应保存 1 次/
    },
    {
      js: sub(computeSolJs, 'const summary = computed(() => summarize(state.todos))', 'const summary = summarize(state.todos)'),
      why: '在 setup 里直接调用，summarize 只运行一次，得到的是一个固定的字符串，不再响应数据变化。勾选后统计不更新。要用 computed 才有缓存加依赖跟踪。',
      expectFail: /2\/3/
    }
  ]
}
