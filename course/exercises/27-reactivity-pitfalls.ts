import type { Exercise } from './types'
import { sub } from './types'

const tick = (ms = 30) => new Promise<void>(r => setTimeout(r, ms))

// ===================== 病例 1：数据变了，界面不动（解构丢响应） =====================
const lostJs = `// 症状：点“涨价”“数量 + 1”或“外部更新”，单价、数量和合计都不变。
const state = reactive({ price: 10, qty: 2 })
const { price, qty } = state
const total = computed(() => price * qty)

function raise() { state.price += 5 }
function more() { state.qty++ }
function external() { state.price = 99 }   // 模拟别处（例如服务器推送）直接修改了 state

return { price, qty, total, raise, more, external }`

const lostTpl = `<p>单价 <b id="price">{{ price }}</b>，数量 <b id="qty">{{ qty }}</b>，合计 <b id="total">{{ total }}</b></p>
<button id="raise" @click="raise">涨价 5 元</button>
<button id="more" @click="more">数量 + 1</button>
<button id="ext" @click="external">外部更新为 99</button>`

const lostSolJs = sub(sub(lostJs, 'const { price, qty } = state', 'const { price, qty } = toRefs(state)'), 'computed(() => price * qty)', 'computed(() => price.value * qty.value)')

export const pitfallLost: Exercise = {
  title: '诊所病例 1：数据变了，界面一动不动',
  ch: 27,
  task: '<p>症状：点“涨价 5 元”，数据变了（<code>state.price</code> 是 15），可是页面上的单价、合计都不变。</p><ol><li>用诊断四问定位：数据变了吗？副作用函数（渲染函数和 <code>computed</code>）重新运行了吗？</li><li>找出读取数据的那一行，说明它为什么没有被收集为依赖。</li><li>只修改代码，让三个按钮都生效：涨价后单价 15、合计 30；数量加 1 后数量 3、合计 45；外部更新后单价 99、合计 297。</li></ol><p>不能改变行为：<code>raise</code>、<code>more</code>、<code>external</code> 仍然只修改 <code>state</code>。不要在这些函数里再写一份同步代码。</p>',
  tpl: lostTpl,
  js: lostJs,
  solTpl: lostTpl,
  solJs: lostSolJs,
  faded: {
    js: sub(sub(lostJs, 'const { price, qty } = state', 'const { price, qty } = /* ✏️ 包一层，让解构出的是连接到 state 的 ref */ state'), 'computed(() => price * qty)', 'computed(() => price /* ✏️ 读取 ref 的值 */ * qty /* ✏️ 读取 ref 的值 */)')
  },
  hints: [
    '先问第一个问题：数据变了吗？变了（state.price 是 15）。第二个问题：副作用函数重新运行了吗？没有。再看 setup 里读取数据的位置：`const { price, qty } = state` 发生在 setup 里，那时没有任何副作用函数在运行，读取不会被收集。（第 3 章 3.2 节、第 24 章）',
    '解构得到的 price 是数字 10，是一份快照，和 state 已经没有关系。让解构出来的变量仍然连接到 state：用 `toRefs(state)`（或 `toRef(state, "price")`）。',
    '`const { price, qty } = toRefs(state)`。price 和 qty 变成了 ref，computed 里要写 `price.value * qty.value`。模板里的 ref 自动解包，模板不用改。'
  ],
  async check(T) {
    const txt = (id: string) => ((T.$(id) || { textContent: '' }).textContent || '').trim()
    T.ok(!!T.$('#price') && !!T.$('#total') && !!T.$('#raise') && !!T.$('#ext'), '页面上有单价、合计和三个按钮')
    T.ok(txt('#price') === '10' && txt('#total') === '20', '起始：单价 10，合计 20，现在是 ' + txt('#price') + ' 和 ' + txt('#total'))
    await T.click(T.$('#raise'))
    await tick()
    T.ok(txt('#price') === '15', '点“涨价 5 元”后，单价应为 15，现在是 ' + txt('#price'))
    T.ok(txt('#total') === '30', '点“涨价 5 元”后，合计应为 30，现在是 ' + txt('#total'))
    await T.click(T.$('#more'))
    await tick()
    T.ok(txt('#qty') === '3' && txt('#total') === '45', '数量 + 1 后，数量 3，合计 45，现在是 ' + txt('#qty') + ' 和 ' + txt('#total'))
    await T.click(T.$('#ext'))
    await tick()
    T.ok(txt('#price') === '99' && txt('#total') === '297', '外部更新后（只改了 state），单价 99，合计 297，现在是 ' + txt('#price') + ' 和 ' + txt('#total') + '。不要靠在按钮函数里手动同步来修')
  },
  wrong: [
    {
      js: `const state = reactive({ price: 10, qty: 2 })
const price = ref(state.price)
const qty = ref(state.qty)
const total = computed(() => price.value * qty.value)

function raise() { state.price += 5; price.value = state.price }
function more() { state.qty++; qty.value = state.qty }
function external() { state.price = 99 }

return { price, qty, total, raise, more, external }`,
      why: '在每个按钮函数里手动同步，前两个按钮看起来对了。可是 price 只是 state.price 的一份拷贝，别处直接修改 state（第三个按钮）时它不会知道。这是把症状盖住，根因（读取没有连接到 state）还在。',
      expectFail: /外部更新/
    },
    {
      js: sub(lostSolJs, 'computed(() => price.value * qty.value)', 'computed(() => price * qty)'),
      why: '解构用了 toRefs，price 和 qty 已经是 ref，但 computed 里忘了 .value。ref 乘 ref 得到 NaN。ref 只在模板里自动解包，脚本里要写 .value。',
      expectFail: /合计应为 30/
    },
    {
      js: sub(lostJs, 'computed(() => price * qty)', 'computed(() => state.price * state.qty)'),
      why: '合计改成直接读 state，合计是对了，可是单价和数量仍然是解构出来的快照，页面上的单价不更新。一处读取修好了，另一处还连着快照。',
      expectFail: /单价应为 15/
    }
  ]
}

// ===================== 病例 2：await 之后读取的数据没有被追踪 =====================
const awaitJs = `// 症状：点“英文”或“日语”，标题还是旧语言。只有换用户，标题才更新。
const NAMES = {
  1: { zh: '小明', en: 'Ming', ja: 'ミン' },
  2: { zh: '小红', en: 'Hong', ja: 'ホン' }
}
const fetchUser = id => new Promise(resolve => setTimeout(() => resolve(id), 5))   // 模拟请求

const stats = { fetches: 0 }
function paint() {
  const el = document.getElementById('fetches')
  if (el) el.textContent = stats.fetches
}

const userId = ref(1)
const lang = ref('zh')
const title = ref('')

watchEffect(async () => {
  stats.fetches++
  paint()
  const id = await fetchUser(userId.value)
  title.value = NAMES[id][lang.value]
})

function setLang(l) { lang.value = l }
function fromOutside() { lang.value = 'ja' }   // 模拟别处（例如设置面板）修改了语言

return { title, setLang, fromOutside, userId }`

const awaitTpl = `<h3 id="title">{{ title }}</h3>
<button id="en" @click="setLang('en')">英文</button>
<button id="ja" @click="fromOutside">日语（别处修改）</button>
<button id="user" @click="userId = 2">换成用户 2</button>
<p>请求了 <b id="fetches">0</b> 次</p>`

const AWAIT_LINE = 'title.value = NAMES[id][lang.value]'
const awaitSolJs = sub(sub(awaitJs, '  const id = await fetchUser(userId.value)', '  const l = lang.value   // 在 await 之前读取，这一行会被收集为依赖\n  const id = await fetchUser(userId.value)'), AWAIT_LINE, 'title.value = NAMES[id][l]')

export const pitfallAwait: Exercise = {
  title: '诊所病例 2：改了语言，标题却不更新',
  ch: 27,
  task: '<p>症状：标题显示用户名，用语言 <code>lang</code> 选择中文、英文或日语。点“英文”，<code>lang</code> 变了，可是标题还是中文。点“换成用户 2”标题就更新了，并且更新成了新语言。</p><ol><li>用诊断四问定位：副作用函数有没有因为 <code>lang</code> 的改变而重新运行？</li><li>说明 <code>userId</code> 和 <code>lang</code> 为什么一个被追踪、一个没有。</li><li>只修改 <code>watchEffect</code> 里的代码，让改语言（两个按钮）和换用户都能更新标题。</li></ol><p>“日语”按钮模拟别处修改了 <code>lang</code>，所以不能只在 <code>setLang</code> 里手动更新标题。</p>',
  tpl: awaitTpl,
  js: awaitJs,
  solTpl: awaitTpl,
  solJs: awaitSolJs,
  faded: {
    js: sub(sub(awaitJs, '  const id = await fetchUser(userId.value)', '  const l = /* ✏️ 在 await 之前读取 lang */ null\n  const id = await fetchUser(userId.value)'), AWAIT_LINE, 'title.value = NAMES[id][/* ✏️ 用上面读出的值 */ lang.value]')
  },
  hints: [
    '副作用函数只在同步执行期间收集依赖。`await` 把函数拆成两段：await 之前的读取在 watchEffect 运行的栈里，被收集；await 之后的部分是稍后由 Promise 接着运行的，那时 watchEffect 的收集已经结束。看 `lang.value` 在哪一段。（第 4 章 4.3 节）',
    '把读取 `lang.value` 的位置移到 `await` 之前。也可以把请求和显示拆成两步：watchEffect 只负责请求并保存结果，标题用 computed 由结果和 lang 算出来。',
    '在 `const id = await ...` 之前加 `const l = lang.value`，下面写 `title.value = NAMES[id][l]`。'
  ],
  async check(T) {
    const title = () => ((T.$('#title') || { textContent: '' }).textContent || '').trim()
    const fetches = () => Number((T.$('#fetches') || { textContent: 'NaN' }).textContent)
    T.ok(!!T.$('#title') && !!T.$('#en') && !!T.$('#ja') && !!T.$('#user'), '页面上有标题和三个按钮')
    await tick(60)
    T.ok(title() === '小明', '起始：标题是“小明”，现在是“' + title() + '”')
    await T.click(T.$('#en'))
    await tick(60)
    T.ok(title() === 'Ming', '点“英文”后，标题应为“Ming”，现在是“' + title() + '”。lang 改变了，副作用函数应该重新运行')
    await T.click(T.$('#ja'))
    await tick(60)
    T.ok(title() === 'ミン', '别处把语言改成日语后，标题应为“ミン”，现在是“' + title() + '”。不要只在 setLang 里手动更新')
    await T.click(T.$('#user'))
    await tick(60)
    T.ok(title() === 'ホン', '换成用户 2 后，标题应为“ホン”（仍然是日语），现在是“' + title() + '”')
    T.ok(fetches() >= 2 && fetches() <= 4, '请求次数应在 2 到 4 之间（用户变化至少请求一次，不能每次都疯狂重复），现在是 ' + fetches())
  },
  wrong: [
    {
      js: sub(awaitJs, 'function setLang(l) { lang.value = l }', 'function setLang(l) { lang.value = l; title.value = NAMES[userId.value][l] }'),
      why: '在 setLang 里手动更新标题，“英文”按钮看起来对了。但“日语”按钮模拟的是别处直接修改 lang，那条路径没有手动更新，标题还是旧的。副作用函数没有追踪 lang 的根因没有修。',
      expectFail: /别处把语言改成日语/
    },
    {
      js: sub(awaitJs, 'NAMES[id][lang.value]\n})', "NAMES[id][lang.value]\n}, { flush: 'post' })"),
      why: 'flush 只决定副作用函数“什么时候”运行（第 25 章），不决定它“追踪什么”。lang 仍然是在 await 之后才读取的，没有被收集。',
      expectFail: /点“英文”后/
    },
    {
      js: sub(sub(awaitJs, '  const id = await fetchUser(userId.value)\n  title.value = NAMES[id][lang.value]', '  fetchUser(userId.value).then(id => {\n    title.value = NAMES[id][lang.value]\n  })'), 'watchEffect(async () => {', 'watchEffect(() => {'),
      why: '把 await 换成 .then，lang 的读取仍然发生在 Promise 回调里，不在 watchEffect 同步运行的那一段，所以仍然没有被收集。问题不在 async 语法，在“读取发生的时机”。',
      expectFail: /点“英文”后/
    }
  ]
}

// ===================== 病例 3：异步里创建的 watch 在组件卸载后还活着 =====================
const leakJs = `// 症状：面板卸载以后，修改 src，面板创建的 watch 回调仍在运行。
const counts = { hits: 0, late: 0 }
function paint() {
  const a = document.getElementById('hits')
  const b = document.getElementById('late')
  if (a) a.textContent = counts.hits
  if (b) b.textContent = counts.late
}

const src = ref(0)
const show = ref(true)

const Panel = {
  setup() {
    // 面板挂载 10 毫秒后，开始监听 src
    setTimeout(() => {
      watch(src, () => {
        counts.hits++
        if (!show.value) counts.late++
        paint()
      })
    }, 10)
    return {}
  },
  template: '<p id="panel">面板在运行</p>'
}

function bumpSrc() { src.value++ }

return { show, bumpSrc, components: { Panel } }`

const leakTpl = `<button id="bump" @click="bumpSrc">修改 src</button>
<button id="toggle" @click="show = !show">{{ show ? '卸载' : '挂载' }}面板</button>
<Panel v-if="show" />
<p>回调共运行 <b id="hits">0</b> 次，其中面板卸载后运行 <b id="late">0</b> 次</p>`

const LEAK_BODY = `    setTimeout(() => {
      watch(src, () => {
        counts.hits++
        if (!show.value) counts.late++
        paint()
      })
    }, 10)`
const LEAK_FIXED = `    const scope = effectScope()
    setTimeout(() => {
      scope.run(() => {
        watch(src, () => {
          counts.hits++
          if (!show.value) counts.late++
          paint()
        })
      })
    }, 10)`
const leakSolJs = sub(leakJs, LEAK_BODY, LEAK_FIXED)

export const pitfallLeak: Exercise = {
  title: '诊所病例 3：面板卸载了，侦听器还在跑',
  ch: 27,
  task: '<p>症状：面板挂载 10 毫秒后，在 <code>setTimeout</code> 里创建了一个 <code>watch</code>，侦听 <code>src</code>。卸载面板后，修改 <code>src</code>，回调仍然运行（“卸载后运行”不为 0）。反复挂载卸载，活着的侦听器越来越多。</p><ol><li>说明这个 <code>watch</code> 为什么没有随面板一起停止。</li><li>只修改 <code>Panel</code> 的 <code>setup</code>，让侦听器的生命周期和面板一致：面板挂载期间每次修改 <code>src</code> 回调运行 1 次；卸载后不再运行；卸载后再挂载，又只有新面板的一个侦听器在运行。</li></ol><p>注意：面板可能在 10 毫秒的定时器到期之前就被卸载了。</p>',
  tpl: leakTpl,
  js: leakJs,
  solTpl: leakTpl,
  solJs: leakSolJs,
  faded: {
    js: sub(leakJs, LEAK_BODY, `    const scope = /* ✏️ 在 setup 里同步创建一个作用域 */ null
    setTimeout(() => {
      /* ✏️ 让 watch 在这个作用域里创建 */ watch(src, () => {
        counts.hits++
        if (!show.value) counts.late++
        paint()
      })
    }, 10)`)
  },
  hints: [
    'watch 能随组件停止，靠的是创建的那一刻有“当前组件”：Vue 把它登记到组件的作用域里。`setTimeout` 的回调运行时，setup 早已结束，没有当前组件，所以这个 watch 不属于任何组件。（第 8 章 8.5 节）',
    '让异步创建的侦听器属于一个能停止的作用域：在 setup 里同步创建 `effectScope()`，在定时器里用 `scope.run(() => watch(...))`。在 setup 里创建的作用域是组件作用域的子作用域，组件卸载时会一起停止。也可以直接把 watch 挪到 setup 的同步部分。',
    '`const scope = effectScope()`，定时器里写 `scope.run(() => { watch(src, …) })`。不需要手写 onUnmounted：组件卸载时它的子作用域会自动停止，定时器到期前就卸载时，`scope.run` 也不会再创建侦听器。'
  ],
  async check(T) {
    const num = (id: string) => Number((T.$(id) || { textContent: 'NaN' }).textContent)
    T.ok(!!T.$('#bump') && !!T.$('#toggle') && !!T.$('#hits'), '页面上有按钮和两个计数。计数的代码不要删')
    if (!T.$('#bump')) return
    await tick(40)
    await T.click(T.$('#bump'))
    await T.click(T.$('#bump'))
    await tick()
    T.ok(num('#hits') === 2, '面板挂载期间修改 src 两次，回调应运行 2 次，现在是 ' + num('#hits') + '。不能把侦听器直接删掉，也不能只运行一次')
    await T.click(T.$('#toggle'))
    await tick()
    await T.click(T.$('#bump'))
    await tick()
    T.ok(num('#late') === 0 && num('#hits') === 2, '面板卸载后修改 src，回调不应再运行（卸载后运行 ' + num('#late') + ' 次，总共 ' + num('#hits') + ' 次）')
    await T.click(T.$('#toggle'))
    await tick(40)
    await T.click(T.$('#bump'))
    await tick()
    T.ok(num('#hits') === 3, '重新挂载后修改 src，应只有新面板的一个侦听器运行，总共 3 次，现在是 ' + num('#hits'))
    await T.click(T.$('#toggle'))
    await T.click(T.$('#toggle'))
    await T.click(T.$('#toggle'))
    await tick(40)
    await T.click(T.$('#bump'))
    await tick()
    T.ok(num('#late') === 0, '面板在定时器到期之前就被卸载时，也不应留下侦听器（卸载后运行 ' + num('#late') + ' 次）')
  },
  wrong: [
    {
      js: sub(leakJs, LEAK_BODY, `    const t = setTimeout(() => {
      watch(src, () => {
        counts.hits++
        if (!show.value) counts.late++
        paint()
      })
    }, 10)
    onUnmounted(() => clearTimeout(t))`),
      why: '卸载时清除定时器，只能挡住“定时器还没到期就卸载”的情况。定时器到期后，watch 已经创建，清除定时器对它没有影响，卸载后它仍然在运行。',
      expectFail: /卸载后修改 src/
    },
    {
      js: sub(leakJs, 'counts.hits++', 'if (!show.value) return\n        counts.hits++'),
      why: '在回调里判断“面板还在不在”，卸载后的计数确实是 0 了。可是侦听器本身没有停止，每挂载一次就多留下一个，重新挂载后同一次修改会运行多个回调。这是在掩盖症状。',
      expectFail: /总共 3 次/
    },
    {
      js: sub(sub(leakJs, 'watch(src, () => {', 'watch(src, () => {'), LEAK_BODY, `    setTimeout(() => {
      watch(src, () => {
        counts.hits++
        if (!show.value) counts.late++
        paint()
      }, { once: true })
    }, 10)`),
      why: 'once: true 让侦听器运行一次就停止，卸载后看起来没有泄漏。但面板挂载期间第二次修改 src，回调就不再运行了，行为被改坏；而且面板在第一次修改之前被卸载时，侦听器照样留着。',
      expectFail: /运行 2 次/
    }
  ]
}
