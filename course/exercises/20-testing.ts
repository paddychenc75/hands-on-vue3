import type { Exercise } from './types'
import { sub } from './types'

// ===================== 页面上的迷你测试工具 =====================
// 练习台不能运行 Vitest。下面这几段脚本模仿 Vitest 和 @vue/test-utils 的最小子集，
// 每道题把它们原样放在脚本最前面（标明“不用修改”）。

const MINI_EXPECT = `// ===== 已给出：迷你的 expect（模仿 Vitest，不用修改） =====
function expect(actual) {
  const show = v => v === undefined ? 'undefined' : JSON.stringify(v)
  const fail = m => { throw new Error(m) }
  return {
    toBe(e) { if (actual !== e) fail('期望 ' + show(e) + '，实际 ' + show(actual)) },
    toEqual(e) { if (show(actual) !== show(e)) fail('期望 ' + show(e) + '，实际 ' + show(actual)) },
    toBeUndefined() { if (actual !== undefined) fail('期望 undefined，实际 ' + show(actual)) },
    toContain(s) { if (!String(actual).includes(s)) fail('期望包含“' + s + '”，实际是“' + actual + '”') },
    toHaveLength(n) { if (!actual || actual.length !== n) fail('期望长度 ' + n + '，实际 ' + (actual ? actual.length : show(actual))) }
  }
}
`

// 迷你的 mount：返回的 wrapper 有 text、find、emitted（和 @vue/test-utils 同名）。
// find().setValue / trigger 和真实的一样：返回 Promise，等一次 DOM 更新。
const MINI_MOUNT = `// ===== 已给出：迷你的 mount（模仿 @vue/test-utils，不用修改） =====
function mount(Comp, options = {}) {
  const host = document.createElement('div')
  const events = {}
  const props = { ...(options.props || {}) }
  for (const name of (Comp.emits || [])) {
    props['on' + name[0].toUpperCase() + name.slice(1)] = (...args) => { (events[name] = events[name] || []).push(args) }
  }
  const app = Vue.createApp({ render: () => Vue.h(Comp, props) })
  if (options.pinia) app.use(options.pinia)
  app.mount(host)
  const wrap = el => ({
    element: el,
    text: () => el.textContent.trim(),
    setValue(v) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); return nextTick() },
    trigger(type) { el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true })); return nextTick() }
  })
  return {
    text: () => host.textContent.trim(),
    find(selector) {
      const el = host.querySelector(selector)
      if (!el) throw new Error('找不到元素 ' + selector)
      return wrap(el)
    },
    emitted: name => events[name],
    unmount: () => app.unmount()
  }
}
`

const RESULT_TPL = `<table>
  <thead><tr><th>实现</th><th v-for="(n, i) in names" :key="i">{{ n }}</th></tr></thead>
  <tbody>
    <tr v-for="r in rows" :key="r.bug" :data-bug="r.bug">
      <td>{{ r.label }}</td>
      <td v-for="(res, i) in r.results" :key="i" :data-t="i" :data-res="res === '通过' ? 'pass' : 'fail'" :title="res">{{ res === '通过' ? '通过' : '失败' }}</td>
    </tr>
  </tbody>
</table>
<p class="cap">正确的实现应全部通过；每个改坏的实现应让对应的那个测试失败。把鼠标放在“失败”上，可以看到失败信息。</p>`

// 把每个测试分别用在正确的实现和改坏的实现上，结果写进 rows（测试是异步的，所以 rows 先是空的）
const RUNNER = (bugs: [string, string][], wrap = '') => `// ===== 已给出：把每个测试分别用在正确的实现和改坏的实现上 =====
const bugs = ${JSON.stringify(bugs)}
const rows = ref([])
const names = tests.map(t => t[0])
;(async () => {
  await new Promise(r => setTimeout(r, 0))   // 让出一轮，避免假计时器影响运行器自己的等待
  const out = []
  for (const [bug, label] of bugs) {
    const results = []
    for (const [, run] of tests) {
      try { ${wrap ? wrap : 'await run(make(bug === \'ok\' ? undefined : bug))'}; results.push('通过') } catch (e) { results.push('失败：' + e.message) }
    }
    out.push({ bug, label, results })
  }
  rows.value = out
})()
return { rows, names }`

// 检查：正确的实现全部通过；第 N 个改坏的实现让第 N 个测试失败
const checkTable = (pairs: [string, number, string][], total: number) =>
  async (T: any) => {
    await T.waitFor(() => T.$$('tr[data-bug]').length === pairs.length + 1 && T.$$('td[data-res]').length === (pairs.length + 1) * total, 3000)
    const res = (bug: string, i: number) => (T.$(`tr[data-bug="${bug}"] td[data-t="${i}"]`)?.getAttribute('data-res') || 'missing')
    T.ok(T.$$('tr[data-bug]').length === pairs.length + 1, '表格里有正确的实现和 ' + pairs.length + ' 个缺陷，共 ' + (pairs.length + 1) + ' 行（脚本报错或还没跑完时看不到；表格代码不要改）')
    const bad: string[] = []
    for (let i = 0; i < total; i++) if (res('ok', i) !== 'pass') bad.push(String(i + 1))
    T.ok(bad.length === 0, '正确的实现应通过全部测试' + (bad.length ? '，现在测试 ' + bad.join('、') + ' 失败了：期望值写错、少了 await，或者还没有补全（把鼠标放在“失败”上看原因）' : ''))
    for (const [bug, i, name] of pairs) {
      T.ok(res(bug, i) === 'fail', '测试 ' + (i + 1) + '（' + name + '）应该抓住缺陷 ' + bug + '：用这个缺陷实现时它应当失败（如果它仍然通过，说明没有断言，或者断言太弱）')
    }
  }

// ===================== 练习 1：testAwait（从第 15 章移来）=====================

export const testAwait: Exercise = {
  title: '修复：组件没有错误，测试却失败', ch: 20,
  task: '<p>说明：练习台不能运行 Vitest。脚本中有一个迷你的 mount 和 expect，它们模仿 @vue/test-utils 和 Vitest。trigger 和真实的版本一样，返回一个 Promise。</p><ol><li>阅读测试 testCounter。Counter 组件没有错误，但是测试失败。</li><li>只修改 testCounter，让测试通过。不要修改 expect 的期望值。</li><li>脚本用同一个测试检查两个组件：Counter 正确，BrokenCounter 点击后不变。修好后 Counter 应通过，BrokenCounter 应失败。</li></ol>',
  tpl: '<p class="result">测试 Counter：{{ result }}</p>\n<p class="broken">测试 BrokenCounter：{{ broken }}</p>',
  js: `// ===== 已给出：迷你的 mount 和 expect（不用修改） =====
function mount(Comp) {
  const host = document.createElement('div')
  Vue.createApp(Comp).mount(host)
  return {
    text: () => host.textContent,
    find(selector) {
      const el = host.querySelector(selector)
      return {
        // 和 @vue/test-utils 一样：触发事件，返回 Promise
        trigger(type) {
          el.dispatchEvent(new Event(type))
          return nextTick()
        }
      }
    }
  }
}
function expect(actual) {
  return {
    toContain(s) {
      if (!String(actual).includes(s)) throw new Error('期望包含“' + s + '”，实际是“' + actual + '”')
    }
  }
}

// ===== 被测试的组件（不用修改） =====
const Counter = {
  setup() { return { n: ref(0) } },
  template: '<button @click="n++">点了 {{ n }} 次</button>'
}
const BrokenCounter = {           // 有错误：点击后不变。用来确认测试真的能发现问题
  setup() { return { n: ref(0) } },
  template: '<button>点了 {{ n }} 次</button>'
}

// ===== TODO：修复这个测试 =====
async function testCounter(Comp) {
  const wrapper = mount(Comp)
  wrapper.find('button').trigger('click')
  expect(wrapper.text()).toContain('点了 1 次')
}

// ===== 已给出：运行测试，显示结果 =====
const result = ref('运行中…'), broken = ref('运行中…')
function run(Comp, out) {
  testCounter(Comp).then(
    () => { out.value = '通过' },
    e => { out.value = '失败：' + e.message }
  )
}
run(Counter, result)
run(BrokenCounter, broken)
return { result, broken }`,
  solJs: `// ===== 已给出：迷你的 mount 和 expect（不用修改） =====
function mount(Comp) {
  const host = document.createElement('div')
  Vue.createApp(Comp).mount(host)
  return {
    text: () => host.textContent,
    find(selector) {
      const el = host.querySelector(selector)
      return {
        // 和 @vue/test-utils 一样：触发事件，返回 Promise
        trigger(type) {
          el.dispatchEvent(new Event(type))
          return nextTick()
        }
      }
    }
  }
}
function expect(actual) {
  return {
    toContain(s) {
      if (!String(actual).includes(s)) throw new Error('期望包含“' + s + '”，实际是“' + actual + '”')
    }
  }
}

// ===== 被测试的组件（不用修改） =====
const Counter = {
  setup() { return { n: ref(0) } },
  template: '<button @click="n++">点了 {{ n }} 次</button>'
}
const BrokenCounter = {           // 有错误：点击后不变。用来确认测试真的能发现问题
  setup() { return { n: ref(0) } },
  template: '<button>点了 {{ n }} 次</button>'
}

async function testCounter(Comp) {
  const wrapper = mount(Comp)
  await wrapper.find('button').trigger('click')   // 等待 DOM 更新
  expect(wrapper.text()).toContain('点了 1 次')
}

// ===== 已给出：运行测试，显示结果 =====
const result = ref('运行中…'), broken = ref('运行中…')
function run(Comp, out) {
  testCounter(Comp).then(
    () => { out.value = '通过' },
    e => { out.value = '失败：' + e.message }
  )
}
run(Counter, result)
run(BrokenCounter, broken)
return { result, broken }`,
  hints: [
    '原因：点击后，Vue 没有立即更新 DOM。测试在下一行就读取文字，读到的是点击之前的结果。组件没有错误，是测试检查得太早。测试要等 DOM 更新完成，再检查结果。20.5 节讲了“等什么”。',
    '只改 trigger 这一行。在这一行前面加一个关键字，等待 trigger 返回的 Promise。testCounter 已经是 async 函数。',
    'await wrapper.find(\'button\').trigger(\'click\')'
  ],
  async check(T) {
    await new Promise(r => setTimeout(r, 50))
    const t = ((T.$('.result') || {}).textContent || '').replace(/^\s*测试 Counter：\s*/, '').trim()
    T.ok(t === '通过', 'Counter 的测试通过（当前：' + t + '）')
    const bt = ((T.$('.broken') || {}).textContent || '').replace(/^\s*测试 BrokenCounter：\s*/, '').trim()
    T.ok(/^失败/.test(bt), '同一个测试能发现 BrokenCounter 的错误（当前：' + bt + '）。删掉断言或放宽期望，测试就发现不了问题')
    T.ok(/点了 1 次/.test(bt), 'BrokenCounter 的失败信息说明期望包含“点了 1 次”（当前：' + bt + '）')
  }
}

testAwait.wrong = [
  { js: sub(testAwait.solJs, "  await wrapper.find('button').trigger('click')   // 等待 DOM 更新\n  expect(wrapper.text()).toContain('点了 1 次')", "  const text = wrapper.text()                     // 先读文字\n  await wrapper.find('button').trigger('click')\n  expect(text).toContain('点了 1 次')"), why: '在点击之前就读了文字，等待更新之后断言的还是旧文字。要在 await 之后再读 wrapper.text()。', expectFail: /Counter 的测试通过/ },
  { js: sub(testAwait.solJs, "  await wrapper.find('button').trigger('click')   // 等待 DOM 更新", "  const btn = await wrapper.find('button')        // await 加错了位置\n  btn.trigger('click')"), why: 'await 加在了 find 上。find 返回的不是 Promise，没有等待任何东西。要等的是 trigger 返回的 Promise。', expectFail: /Counter 的测试通过/ },
  { js: sub(testAwait.solJs, "  expect(wrapper.text()).toContain('点了 1 次')\n", ""), why: '删掉断言，Counter 的测试当然“通过”。但没有断言的测试什么都发现不了，BrokenCounter 也“通过”了。', expectFail: /BrokenCounter/ },
  { js: sub(testAwait.solJs, "toContain('点了 1 次')", "toContain('点了')"), why: '把期望放宽到“点了”，点击前后的文字都满足，BrokenCounter 也“通过”。断言要能区分对和错。', expectFail: /BrokenCounter/ }
]

testAwait.faded = {
  js: sub(sub(testAwait.solJs, "await wrapper.find('button').trigger('click')   // 等待 DOM 更新",
    "/* ✏️ 点击后 DOM 不会立即更新：断言之前要先等什么？ */ wrapper.find('button').trigger('click')"),
    "toContain('点了 1 次')", "toContain('' /* ✏️ 点击一次后，按钮上应该显示的文字 */)")
}

// ===================== 练习 2：testMutants（写测试，抓住三个缺陷）=====================

const formComp = `// ===== 已给出：被测试的组件（不用修改） =====
// make(bug) 返回 TaskForm 组件。传入 bug 得到一个故意改坏的版本：你的测试必须能发现它。
const make = bug => ({
  emits: ['add'],
  setup(props, { emit }) {
    const title = ref('')
    function submit() {
      const text = bug === 'noTrim' ? title.value : title.value.trim()
      if (bug === 'allowBlank' ? false : !text) return
      emit('add', text)
      if (bug !== 'noClear') title.value = ''
    }
    return { title, submit }
  },
  template: '<form @submit.prevent="submit"><input v-model="title"><button type="submit">添加</button></form>'
})
`

const mutantsJs = (b: [string, string, string]) => `${MINI_EXPECT}
${MINI_MOUNT}
${formComp}
// ===== TODO：写三个测试。每个测试拿到 TaskForm 组件，自己 mount =====
const tests = [
  ['提交时发出 add，标题去掉首尾空格', async Form => {
${b[0]}
  }],
  ['提交后输入框被清空', async Form => {
${b[1]}
  }],
  ['标题只有空格时不发出事件', async Form => {
${b[2]}
  }]
]

${RUNNER([['ok', '正确的实现'], ['noTrim', '缺陷 noTrim'], ['noClear', '缺陷 noClear'], ['allowBlank', '缺陷 allowBlank']])}`

const MUT_SOL: [string, string, string] = [
  "    const wrapper = mount(Form)\n    await wrapper.find('input').setValue('  写周报  ')\n    await wrapper.find('form').trigger('submit')\n    expect(wrapper.emitted('add')).toEqual([['写周报']])",
  "    const wrapper = mount(Form)\n    const input = wrapper.find('input')\n    await input.setValue('写周报')\n    await wrapper.find('form').trigger('submit')\n    expect(input.element.value).toBe('')",
  "    const wrapper = mount(Form)\n    await wrapper.find('input').setValue('   ')\n    await wrapper.find('form').trigger('submit')\n    expect(wrapper.emitted('add')).toBeUndefined()"
]
const MUT_START: [string, string, string] = [
  "    // TODO：mount，在输入框填 '  写周报  '，提交表单。断言发出了 add，载荷是 '写周报'",
  "    // TODO：mount，填 '写周报'，提交。断言输入框的 value 是空字符串（input.element.value）",
  "    // TODO：mount，填 '   '（只有空格），提交。断言没有发出 add"
]
const MUT_FADED: [string, string, string] = [
  "    const wrapper = mount(Form)\n    await wrapper.find('input').setValue('  写周报  ')\n    await wrapper.find('form').trigger('submit')\n    expect(wrapper.emitted('add'))./* ✏️ 载荷应该是去掉空格后的标题 */",
  "    const wrapper = mount(Form)\n    const input = wrapper.find('input')\n    await input.setValue('写周报')\n    /* ✏️ 提交表单（别忘了 await） */\n    expect(input.element.value).toBe('')",
  "    const wrapper = mount(Form)\n    await wrapper.find('input').setValue('   ')\n    await wrapper.find('form').trigger('submit')\n    expect(wrapper.emitted('add'))./* ✏️ 没有发出事件时，emitted('add') 是什么？ */"
]

export const testMutants: Exercise = {
  title: '写测试：让它抓住三个缺陷', ch: 20,
  task: '<p>说明：练习台不能运行 Vitest。脚本里有迷你的 expect 和 mount，模仿 Vitest 和 @vue/test-utils：<code>wrapper.find(选择器)</code>、<code>setValue</code>、<code>trigger</code>（返回 Promise）、<code>emitted(名字)</code>（没有发出过时是 undefined）、<code>element.value</code>。</p><p>脚本里的 <code>make(bug)</code> 返回任务表单组件。表单应该：提交时发出 <code>add</code> 事件，载荷是去掉首尾空格的标题；提交后清空输入框；标题只有空格时不发出事件。它还能返回三个<b>故意改坏</b>的版本（noTrim、noClear、allowBlank）。下面的表格把你的三个测试，分别用在正确的实现和三个改坏的实现上。</p><ol><li>补全三个测试的函数体，每个测试都要有断言。</li><li>让<b>正确的实现</b>通过全部三个测试。</li><li>让第 N 个改坏的实现，使第 N 个测试失败。也就是每个测试都要能“抓住”它对应的缺陷。</li></ol><p>不要修改组件、expect 和 mount。没有断言的测试永远通过。</p>',
  tpl: RESULT_TPL,
  js: mutantsJs(MUT_START),
  solJs: mutantsJs(MUT_SOL),
  faded: { js: mutantsJs(MUT_FADED) },
  hints: [
    '好测试要能抓住缺陷。对每个缺陷问自己：它会让哪个可观察的结果，和正确的实现不一样？noTrim 让载荷带着空格；noClear 让输入框保留文字；allowBlank 在只有空格时也发出事件。',
    '每个测试的步骤都一样：mount、找到 input 填内容、找到 form 提交、断言。填内容和提交都返回 Promise，都要 await。测试 1 断言的是载荷：emitted(\'add\') 是一个数组，每次发出一项，每项又是参数数组。',
    MUT_SOL.join('\n---\n')
  ],
  check: checkTable([['noTrim', 0, '去掉空格'], ['noClear', 1, '清空输入框'], ['allowBlank', 2, '空标题']], 3),
  wrong: [
    {
      js: mutantsJs(["    const wrapper = mount(Form)\n    await wrapper.find('input').setValue('  写周报  ')\n    await wrapper.find('form').trigger('submit')", MUT_SOL[1], MUT_SOL[2]]),
      why: '测试 1 只做了操作，没有断言。没有断言的测试永远通过，抓不住缺陷 noTrim。',
      expectFail: /应该抓住缺陷 noTrim/
    },
    {
      js: mutantsJs(["    const wrapper = mount(Form)\n    await wrapper.find('input').setValue('  写周报  ')\n    await wrapper.find('form').trigger('submit')\n    expect(wrapper.emitted('add')).toHaveLength(1)", MUT_SOL[1], MUT_SOL[2]]),
      why: '断言太弱：只检查“发出过一次”，不检查载荷。带空格的标题也发出了一次，所以抓不住 noTrim。要断言载荷是什么。',
      expectFail: /应该抓住缺陷 noTrim/
    },
    {
      js: mutantsJs([MUT_SOL[0], MUT_SOL[1].replace("    await wrapper.find('form').trigger('submit')", "    wrapper.find('form').trigger('submit')"), MUT_SOL[2]]),
      why: '提交时没有 await。组件清空了 ref，但 DOM 要到下一次更新才改，测试读到的还是旧的 value，连正确的实现也失败。trigger 返回的 Promise 要 await。',
      expectFail: /正确的实现应通过/
    }
  ]
}

// ===================== 练习 3：testDebounce（假定时器测防抖）=====================

const MINI_VI = `// ===== 已给出：迷你的假定时器（模仿 Vitest 的 vi，不用修改） =====
// useFakeTimers 把 setTimeout / clearTimeout 换成假的；advanceTimersByTime 把假的时间向前拨，到点的回调立即执行。
const vi = (() => {
  let now = 0, id = 0, timers = new Map(), real = null
  return {
    useFakeTimers() {
      if (real) return
      real = { st: window.setTimeout, ct: window.clearTimeout }
      now = 0; timers = new Map()
      window.setTimeout = (fn, ms = 0) => { timers.set(++id, { fn, at: now + ms }); return id }
      window.clearTimeout = i => { timers.delete(i) }
    },
    advanceTimersByTime(ms) {
      const end = now + ms
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]
        if (!due) break
        timers.delete(due[0]); now = due[1].at; due[1].fn()
      }
      now = end
    },
    useRealTimers() {
      if (!real) return
      window.setTimeout = real.st; window.clearTimeout = real.ct; real = null
    }
  }
})()
`

const searchComp = `// ===== 已给出：被测试的组件（不用修改） =====
// 输入停止 300 毫秒后，发出一次 search 事件。make(bug) 返回改坏的版本：你的测试必须能发现它。
const make = bug => ({
  emits: ['search'],
  setup(props, { emit }) {
    const text = ref('')
    let timer
    watch(text, q => {
      if (bug === 'immediate') return emit('search', q)
      if (bug !== 'noClear') clearTimeout(timer)
      timer = setTimeout(() => emit('search', q), bug === 'slow' ? 500 : 300)
    })
    return { text }
  },
  template: '<input v-model="text">'
})
`

const debounceJs = (b: [string, string, string]) => `${MINI_EXPECT}
${MINI_MOUNT}
${MINI_VI}
${searchComp}
// ===== TODO：写三个测试。每个测试自己 vi.useFakeTimers()（运行器会在每个测试结束后恢复真实的计时器）=====
const tests = [
  ['停止输入之前不发出', async Search => {
${b[0]}
  }],
  ['连续输入只发出最后一次', async Search => {
${b[1]}
  }],
  ['满 300 毫秒时发出', async Search => {
${b[2]}
  }]
]

${RUNNER([['ok', '正确的实现'], ['immediate', '缺陷 immediate'], ['noClear', '缺陷 noClear'], ['slow', '缺陷 slow']], `vi.useFakeTimers()
      try { await run(make(bug === 'ok' ? undefined : bug)) } finally { vi.useRealTimers() }`)}`

const DEB_SOL: [string, string, string] = [
  "    vi.useFakeTimers()\n    const wrapper = mount(Search)\n    await wrapper.find('input').setValue('a')\n    vi.advanceTimersByTime(299)\n    expect(wrapper.emitted('search')).toBeUndefined()",
  "    vi.useFakeTimers()\n    const wrapper = mount(Search)\n    const input = wrapper.find('input')\n    await input.setValue('a')\n    vi.advanceTimersByTime(200)\n    await input.setValue('ab')\n    vi.advanceTimersByTime(300)\n    expect(wrapper.emitted('search')).toEqual([['ab']])",
  "    vi.useFakeTimers()\n    const wrapper = mount(Search)\n    await wrapper.find('input').setValue('a')\n    vi.advanceTimersByTime(300)\n    expect(wrapper.emitted('search')).toEqual([['a']])"
]
const DEB_START: [string, string, string] = [
  "    // TODO：用假定时器。填 'a'，把时间拨到 299 毫秒。断言还没有发出 search",
  "    // TODO：填 'a'，拨 200 毫秒，再填 'ab'，再拨 300 毫秒。断言只发出一次，载荷是 'ab'",
  "    // TODO：填 'a'，拨 300 毫秒。断言发出了一次 search，载荷是 'a'"
]
const DEB_FADED: [string, string, string] = [
  "    vi.useFakeTimers()\n    const wrapper = mount(Search)\n    await wrapper.find('input').setValue('a')\n    /* ✏️ 把假的时间拨到 299 毫秒 */\n    expect(wrapper.emitted('search')).toBeUndefined()",
  "    vi.useFakeTimers()\n    const wrapper = mount(Search)\n    const input = wrapper.find('input')\n    await input.setValue('a')\n    vi.advanceTimersByTime(200)\n    await input.setValue('ab')\n    vi.advanceTimersByTime(300)\n    expect(wrapper.emitted('search'))./* ✏️ 只应发出一次，载荷是 'ab' */",
  "    vi.useFakeTimers()\n    const wrapper = mount(Search)\n    /* ✏️ 填入 'a'（别忘了 await） */\n    vi.advanceTimersByTime(300)\n    expect(wrapper.emitted('search')).toEqual([['a']])"
]

export const testDebounce: Exercise = {
  title: '用假定时器测防抖：不真的等 300 毫秒', ch: 20,
  task: '<p>说明：练习台不能运行 Vitest。脚本里有迷你的 expect、mount 和 <code>vi</code>（<code>useFakeTimers</code>、<code>advanceTimersByTime</code>、<code>useRealTimers</code>，用法和 Vitest 一样）。</p><p>脚本里的 <code>make(bug)</code> 返回搜索框组件：输入停止 300 毫秒后，发出一次 <code>search</code> 事件。它还能返回三个<b>故意改坏</b>的版本（immediate：不防抖，立即发出；noClear：不清除上一个定时器；slow：等 500 毫秒）。</p><ol><li>补全三个测试的函数体：先 <code>vi.useFakeTimers()</code>，再操作，用 <code>advanceTimersByTime</code> 拨动时间，最后断言。</li><li>让<b>正确的实现</b>通过全部三个测试。</li><li>让第 N 个改坏的实现，使第 N 个测试失败。</li></ol><p>不要修改组件、expect、mount 和 vi。</p>',
  tpl: RESULT_TPL,
  js: debounceJs(DEB_START),
  solJs: debounceJs(DEB_SOL),
  faded: { js: debounceJs(DEB_FADED) },
  hints: [
    '防抖有三个可观察的行为：时间没到就不发（immediate 会立即发）；时间内再输入会重新计时，只发最后一次（noClear 会多发一次）；刚好 300 毫秒就发（slow 要等 500）。每个测试对准其中一个。',
    '每个测试的开头都是 vi.useFakeTimers()。填内容用 await input.setValue(…)：监听输入的 watch 要等一次更新才会运行，不 await 的话，定时器还没有创建，时间就拨过去了。',
    DEB_SOL.join('\n---\n')
  ],
  check: checkTable([['immediate', 0, '时间没到不发'], ['noClear', 1, '连续输入只发最后一次'], ['slow', 2, '满 300 毫秒发出']], 3),
  wrong: [
    {
      js: debounceJs([DEB_SOL[0], DEB_SOL[1], DEB_SOL[2].replace("    vi.advanceTimersByTime(300)\n", "")]),
      why: '测试 3 没有拨动时间。假的时间不走，回调永远不会执行，正确的实现也发不出事件。使用假定时器时，要主动用 advanceTimersByTime 拨时间。',
      expectFail: /正确的实现应通过/
    },
    {
      js: debounceJs([DEB_SOL[0], DEB_SOL[1], DEB_SOL[2].replace("    vi.advanceTimersByTime(300)", "    vi.advanceTimersByTime(1000)")]),
      why: '拨了 1000 毫秒，比 300 多得多。等 500 毫秒的缺陷 slow 在 1000 毫秒时也发出事件，测试抓不住。拨动的时间要正好落在边界上：满 300 毫秒发出。',
      expectFail: /应该抓住缺陷 slow/
    },
    {
      js: debounceJs([DEB_SOL[0], "    vi.useFakeTimers()\n    const wrapper = mount(Search)\n    const input = wrapper.find('input')\n    await input.setValue('a')\n    vi.advanceTimersByTime(300)\n    await input.setValue('ab')\n    vi.advanceTimersByTime(300)\n    expect(wrapper.emitted('search')).toEqual([['a'], ['ab']])", DEB_SOL[2]]),
      why: '第一次输入后拨满了 300 毫秒，第一个定时器已经到点发出了事件，第二次输入时没有任何定时器可清除。这样测不到“时间内再次输入要取消上一个定时器”，noClear 抓不住。第二次输入要发生在第一个定时器到点之前。',
      expectFail: /应该抓住缺陷 noClear/
    }
  ]
}

// ===================== 练习 4：testCart（真实的 Pinia）=====================

const cartStore = `// ===== 已给出：真实的 Pinia store 和被测试的组件（不用修改） =====
const useCart = defineStore('cart', () => {
  const items = ref([])
  const total = computed(() => items.value.reduce((s, i) => s + i.price, 0))
  function clear() { items.value = [] }
  return { items, total, clear }
})

// make(bug) 返回购物车徽标组件。传入 bug 得到改坏的版本：你的测试必须能发现它。
const make = bug => ({
  setup() {
    const cart = useCart()
    // stale：直接解构 store，拿到的是创建时的值，之后不再更新
    const { items, total } = bug === 'stale' ? cart : storeToRefs(cart)
    const clear = bug === 'noClear' ? () => {} : cart.clear
    return { items, total: bug === 'wrongTotal' ? computed(() => items.value.length) : total, clear }
  },
  template: '<p class="sum">{{ items.length }} 件，共 {{ total }} 元</p><button @click="clear">清空</button>'
})
`

// mount 带一个全新的真实 pinia；initialState 是 { cart: { items: [...] } }，和 createTestingPinia 的同名选项一样
const PINIA_MOUNT = `// ===== 已给出：带真实 pinia 的 mount（不用修改） =====
// 每次 mount 都新建一个 pinia，所以测试之间不共享 store。
// initialState 在 store 创建之前写进 pinia.state，store 创建时从它初始化（createTestingPinia 的 initialState 也是这样做的）。
function mount(Comp, { initialState } = {}) {
  const pinia = createPinia()
  if (initialState) pinia.state.value = JSON.parse(JSON.stringify(initialState))
  const host = document.createElement('div')
  const app = Vue.createApp(Comp)
  app.use(pinia)
  app.mount(host)
  return {
    text: () => host.textContent.trim(),
    find(selector) {
      const el = host.querySelector(selector)
      if (!el) throw new Error('找不到元素 ' + selector)
      return {
        text: () => el.textContent.trim(),
        trigger(type) { el.dispatchEvent(new Event(type, { bubbles: true })); return nextTick() }
      }
    },
    store: () => useCart(pinia)
  }
}
`

const cartJs = (b: [string, string, string]) => `${MINI_EXPECT}
${PINIA_MOUNT}
${cartStore}
// ===== TODO：写三个测试。每个测试拿到 Badge 组件，自己 mount =====
const INITIAL = { cart: { items: [{ id: 1, price: 30 }, { id: 2, price: 20 }] } }
const tests = [
  ['按初始状态显示数量和总价', async Badge => {
${b[0]}
  }],
  ['点“清空”后 store 里没有商品', async Badge => {
${b[1]}
  }],
  ['点“清空”后页面显示 0 件', async Badge => {
${b[2]}
  }]
]

${RUNNER([['ok', '正确的实现'], ['wrongTotal', '缺陷 wrongTotal'], ['noClear', '缺陷 noClear'], ['stale', '缺陷 stale']])}`

const CART_SOL: [string, string, string] = [
  "    const w = mount(Badge, { initialState: INITIAL })\n    expect(w.find('.sum').text()).toBe('2 件，共 50 元')",
  "    const w = mount(Badge, { initialState: INITIAL })\n    await w.find('button').trigger('click')\n    expect(w.store().items).toHaveLength(0)",
  "    const w = mount(Badge, { initialState: INITIAL })\n    await w.find('button').trigger('click')\n    expect(w.find('.sum').text()).toBe('0 件，共 0 元')"
]
const CART_START: [string, string, string] = [
  "    // TODO：用 INITIAL 作为初始状态 mount。断言 .sum 的文字是 '2 件，共 50 元'",
  "    // TODO：用 INITIAL mount，点“清空”按钮。断言 w.store().items 的长度是 0",
  "    // TODO：用 INITIAL mount，点“清空”按钮。断言 .sum 的文字是 '0 件，共 0 元'"
]
const CART_FADED: [string, string, string] = [
  "    const w = mount(Badge, { /* ✏️ 传入初始状态 */ })\n    expect(w.find('.sum').text()).toBe('2 件，共 50 元')",
  "    const w = mount(Badge, { initialState: INITIAL })\n    /* ✏️ 点击“清空”按钮（别忘了 await） */\n    expect(w.store().items).toHaveLength(0)",
  "    const w = mount(Badge, { initialState: INITIAL })\n    await w.find('button').trigger('click')\n    expect(w.find('.sum').text())./* ✏️ 清空之后页面上应该是什么 */"
]

export const testCart: Exercise = {
  title: '测试带 Pinia 的组件：初始状态和更新', ch: 20,
  libs: ['pinia'],
  task: '<p>这道题运行在真实的 Pinia 上。脚本里有真实的 <code>useCart</code> store 和一个购物车徽标组件。给出的 <code>mount(组件, { initialState })</code> 每次新建一个全新的 pinia，并在 store 创建前写入初始状态，作用和 <code>createTestingPinia({ initialState })</code> 一样；<code>w.store()</code> 取这个 pinia 里的 store。</p><p>脚本里的 <code>make(bug)</code> 还能返回三个<b>故意改坏</b>的徽标：wrongTotal（总价显示成数量）、noClear（点击不清空）、stale（直接解构 store，不再更新）。</p><ol><li>补全三个测试的函数体。</li><li>让<b>正确的实现</b>通过全部三个测试。</li><li>让第 N 个改坏的实现，使第 N 个测试失败。</li></ol><p>想一想：测试 2 查 store，测试 3 查页面。为什么两个都需要？</p>',
  tpl: RESULT_TPL,
  js: cartJs(CART_START),
  solJs: cartJs(CART_SOL),
  faded: { js: cartJs(CART_FADED) },
  hints: [
    'store 的状态对了，页面不一定对：stale 缺陷里 store 被正确清空了，页面却还显示旧数字（直接解构拿到的是创建时的值）。所以“点清空后”要分别查 store 和页面。',
    '初始状态是 INITIAL，直接传给 mount 的第二个参数：mount(Badge, { initialState: INITIAL })。页面文字用 w.find(\'.sum\').text() 读。点击要 await。',
    CART_SOL.join('\n---\n')
  ],
  check: checkTable([['wrongTotal', 0, '初始显示'], ['noClear', 1, 'store 被清空'], ['stale', 2, '页面随 store 更新']], 3),
  wrong: [
    {
      js: cartJs([CART_SOL[0], CART_SOL[1], "    const w = mount(Badge, { initialState: INITIAL })\n    await w.find('button').trigger('click')\n    expect(w.store().items).toHaveLength(0)"]),
      why: '测试 3 又查了一遍 store。stale 缺陷里 store 是被正确清空的，错在页面没有更新。要断言页面上的文字（用户看到的东西）。',
      expectFail: /应该抓住缺陷 stale/
    },
    {
      js: cartJs([CART_SOL[0], CART_SOL[1], CART_SOL[2].replace("    await w.find('button').trigger('click')\n", "    w.find('button').trigger('click')\n")]),
      why: '点击后没有 await。DOM 要到下一次更新才改，测试读到的还是旧文字，正确的实现也失败。',
      expectFail: /正确的实现应通过/
    },
    {
      js: cartJs([CART_SOL[0].replace("{ initialState: INITIAL }", "{}"), CART_SOL[1], CART_SOL[2]]),
      why: '没有传初始状态，购物车是空的，页面显示“0 件，共 0 元”，断言 “2 件，共 50 元” 在正确的实现上也失败。带初始状态的测试要把它传给 mount。',
      expectFail: /正确的实现应通过/
    }
  ]
}
