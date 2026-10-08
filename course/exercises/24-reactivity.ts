// 第 24 章的练习：全部用共享的迷你 Vue 零件 1（course/mini/src/01-reactivity.ts）。
// 正文里写过的零件整体折叠、只读；每道题只露出要写的那一小段。
import type { Exercise } from './types'
import { sub } from './types'
import { answer, fold, PARTS } from '../mini'

// 把零件 1 按区域切成几段，方便折叠不用改的部分、挖空要写的部分
const R = PARTS.reactivity
const at = (s: string) => {
  const i = R.indexOf(s)
  if (i < 0) throw new Error('零件 1 里找不到：' + s)
  return i
}
const HEAD = R.slice(0, at('//#region track'))
const TRACK = R.slice(at('//#region track'), at('//#region trigger'))
const MID = R.slice(at('//#region trigger'), at('//#region effect'))              // trigger + reactive
const EFFECT = R.slice(at('//#region effect'), at('//#region cleanup'))
const CLEANUP = R.slice(at('//#region cleanup'), at('// 运行 fn 的这一刻'))
const TAIL = R.slice(at('// 运行 fn 的这一刻'), at('//#region computed'))        // untracked + ref
const COMPUTED = R.slice(at('//#region computed'))

// ===== 练习：computedFill、miniComputed =====
const CP_EARLIER = fold('正文里写过的响应式零件（reactive、effect 等，不用改）', answer(HEAD + TRACK + MID + EFFECT + CLEANUP + TAIL))
const CP_SOL = answer(COMPUTED)

const CP_DEMO = `
// ===== 已给出：使用 computed =====
// 迷你版的 ref 不会驱动页面，所以页面上的数据用 Vue.ref
const state = reactive({ price: 10, qty: 2 })
let runs = 0
let outer = 0
const total = computed(() => {
  runs++
  return state.price * state.qty
})

const view = Vue.ref({ total: '未读取', runs, outer })
const sync = t => { view.value = { total: t === undefined ? view.value.total : t, runs, outer } }
function readTwice() {
  total.value
  sync(total.value)
}
function changePrice() {
  state.price += 10
  sync()
}
function watchTotal() {
  effect(() => { outer++; sync(total.value) })   // 外层 effect：读取 total.value
}

return { view, readTwice, changePrice, watchTotal }`

const CP_TPL = '<p>total：{{ view.total }}</p>\n<p>getter 运行次数：{{ view.runs }}</p>\n<p>外层 effect 运行次数：{{ view.outer }}</p>\n<button @click="readTwice">读取两次 total.value</button>\n<button @click="changePrice">price 加 10</button>\n<button @click="watchTotal">挂上读取 total 的外层 effect</button>'

async function computedCheck(T: any) {
  const num = (re: RegExp) => { const m = T.text().match(re); return m ? +m[1] : -1 }
  const runs = () => num(/getter 运行次数：\s*(\d+)/)
  const outer = () => num(/外层 effect 运行次数：\s*(\d+)/)
  const total = () => { const p = T.$$('p').find((x: Element) => /total：/.test(x.textContent || '')); return p ? (p.textContent || '').replace(/^\s*total：\s*/, '').trim() : '' }
  T.ok(runs() === 0, '创建后 getter 运行 0 次（当前 ' + runs() + ' 次）')
  const read = T.btn('读取两次'), change = T.btn('price 加 10'), watch = T.btn('挂上')
  if (!read || !change || !watch) { T.ok(false, '找到“读取两次”“price 加 10”“挂上”三个按钮'); return }
  await T.click(read)
  T.ok(total() === '20', '第一次读取：total = 20（当前 ' + total() + '）')
  T.ok(runs() === 1, '读取两次，getter 只运行 1 次（当前 ' + runs() + ' 次）')
  await T.click(T.btn('price 加 10'))
  T.ok(runs() === 1, '修改 price 后，getter 不立即运行（当前 ' + runs() + ' 次）')
  await T.click(T.btn('读取两次'))
  T.ok(total() === '40', '修改后读取：total = 40（当前 ' + total() + '）')
  T.ok(runs() === 2, '修改后读取，getter 共运行 2 次（当前 ' + runs() + ' 次）')
  await T.click(T.btn('挂上'))
  T.ok(outer() === 1 && runs() === 2, '挂上外层 effect：它运行 1 次，读到缓存，getter 仍是 2 次（外层 ' + outer() + '，getter ' + runs() + '）')
  await T.click(T.btn('price 加 10'))
  T.ok(outer() === 2, '依赖变了，外层 effect 重新运行（外层 effect 当前 ' + outer() + ' 次）')
  T.ok(total() === '60' && runs() === 3, '外层 effect 读到新值 60，getter 共 3 次（当前 ' + total() + '，' + runs() + ' 次）')
}

export const computedFill: Exercise = {
  title: '补全：迷你 computed 的缓存标记', ch: 24,
  task: '<p>脚本里的 <code>computed</code>（零件 1）只差两处。它用 <code>stale</code> 标记决定要不要重新计算，用 <code>effect</code> 的 <code>lazy</code> 和调度函数 <code>scheduler</code> 实现惰性。补全 2 处 TODO：</p><ol><li>TODO 1：依赖改变时，<code>scheduler</code> 作废缓存。如果缓存原来是有效的，再通知读过 <code>.value</code> 的副作用函数（<code>trigger(c, \'value\')</code>）。它不计算。</li><li>TODO 2：重新计算后，标记缓存已是最新。原因：否则每次读取都运行 getter，没有缓存。</li></ol><p>页面上的按钮会检查：创建时不计算、读取两次只算一次、改数据后不立即计算、外层 effect 能收到通知。</p>',
  tpl: CP_TPL,
  js: CP_EARLIER + sub(CP_SOL, '    scheduler() { if (!stale) { stale = true; trigger(c, \'value\') } }   // 依赖变了：作废缓存，通知读过它的副作用函数',
    '    scheduler() {\n      // TODO 1：作废缓存；原来有效的话，通知读过 .value 的副作用函数\n    }') .replace('      if (stale) { value = runner.run(); stale = false }', '      if (stale) {\n        value = runner.run()\n        // TODO 2：标记缓存已是最新\n      }') + CP_DEMO,
  solJs: CP_EARLIER + CP_SOL + CP_DEMO,
  faded: {
    js: CP_EARLIER + sub(CP_SOL, '    scheduler() { if (!stale) { stale = true; trigger(c, \'value\') } }',
      '    scheduler() { if (!stale) { stale = /* ✏️ 依赖改变了：缓存作废，该把标记设成什么 */ false; trigger(c, \'value\') } }').replace('      if (stale) { value = runner.run(); stale = false }',
      '      if (stale) { value = runner.run(); stale = /* ✏️ 刚计算完：缓存已是最新，该把标记设成什么 */ true }') + CP_DEMO
  },
  hints: [
    'computed 用一个 stale 标记实现缓存：依赖改变时设为 true，计算后设为 false。effect 的 lazy 选项让 getter 创建时不运行，scheduler 选项让“依赖变了”时调用它，而不是直接重新运行。',
    'TODO 1 在 scheduler() 里：先判断 !stale，再把 stale 设为 true，并调用 trigger(c, \'value\')。TODO 2 在 value = runner.run() 的下一行，给 stale 赋另一个值。',
    'scheduler() { if (!stale) { stale = true; trigger(c, \'value\') } }\n…\nif (stale) { value = runner.run(); stale = false }'
  ],
  check: computedCheck,
  wrong: [
    {
      js: CP_EARLIER + sub(CP_SOL, 'scheduler() { if (!stale) { stale = true; trigger(c, \'value\') } }', 'scheduler() { value = runner.run(); trigger(c, \'value\') }') + CP_DEMO,
      why: '在调度函数里立即重新计算。依赖一改变 getter 就运行，而不是等到下次读取，没有“惰性”，也浪费计算。调度函数只应该做标记和通知。',
      expectFail: /不立即运行/
    },
    {
      js: CP_EARLIER + sub(CP_SOL, 'stale = false }', '}') + CP_DEMO,
      why: '计算后没有清除 stale。标记一直是 true，每次读取都重新运行 getter，缓存没有生效。',
      expectFail: /读取两次/
    }
  ]
}

const COMPUTED_STUB = `// ===== 你来写：computed =====
function computed(getter) {
  // 现在：每次读取 .value 都运行 getter，没有缓存，也没有依赖。
  // TODO：用 effect 的 lazy 和 scheduler 选项，加一个标记，写出有缓存、能被外层 effect 订阅的 computed
  return {
    __v_isRef: true,
    get value() { return getter() }
  }
}
`

export const miniComputed: Exercise = {
  title: '手写迷你 computed：惰性、缓存和依赖', ch: 24,
  task: '<p>脚本里的 <code>computed</code> 现在每次读取都运行 getter。用零件 1 里的 <code>effect</code>、<code>track</code>、<code>trigger</code> 把它写完整，让它同时做到：</p><ol><li>惰性：创建时不运行 getter。</li><li>缓存：依赖没变时，再读取不运行 getter。</li><li>依赖：外层 effect 读取 <code>.value</code> 后，依赖改变时外层 effect 会重新运行。</li></ol><p>页面上的 3 个按钮会检查这三点。</p>',
  tpl: CP_TPL,
  js: CP_EARLIER + COMPUTED_STUB + CP_DEMO,
  solJs: CP_EARLIER + CP_SOL + CP_DEMO,
  faded: {
    js: CP_EARLIER + `// ===== 你来写：computed =====
function computed(getter) {
  let value
  let stale = true
  const runner = effect(getter, {
    /* ✏️ 创建时不运行 getter */
    scheduler() {
      /* ✏️ 作废缓存；原来有效的话，通知读过 .value 的副作用函数 */
    }
  })
  const c = {
    __v_isRef: true,
    get value() {
      /* ✏️ 让外层副作用函数订阅 c */
      if (stale) {
        value = runner.run()
        stale = false
      }
      return value
    }
  }
  return c
}
` + CP_DEMO
  },
  hints: [
    'computed 要同时做三件事。惰性和缓存靠 effect(getter, { lazy: true, scheduler }) 加一个 stale 标记。依赖靠第 24.5 节讲的两个角色：读取 .value 时 track(c, \'value\')，依赖改变时 trigger(c, \'value\')。',
    '1. 声明 let value、let stale = true。2. 用 effect(getter, { lazy: true, scheduler() { … } }) 得到 runner。3. 返回对象 c：get value() 里先 track(c, \'value\')，stale 为 true 时运行 runner.run() 并把 stale 设为 false。4. scheduler 里，stale 原来是 false 时，把它设为 true 并 trigger(c, \'value\')。',
    'function computed(getter) {\n  let value\n  let stale = true\n  const runner = effect(getter, {\n    lazy: true,\n    scheduler() { if (!stale) { stale = true; trigger(c, \'value\') } }\n  })\n  const c = {\n    __v_isRef: true,\n    get value() {\n      track(c, \'value\')\n      if (stale) { value = runner.run(); stale = false }\n      return value\n    }\n  }\n  return c\n}'
  ],
  check: computedCheck,
  wrong: [
    {
      js: CP_EARLIER + `function computed(getter) {
  let value
  let done = false
  return {
    __v_isRef: true,
    get value() {
      if (!done) { value = getter(); done = true }
      return value
    }
  }
}
` + CP_DEMO,
      why: '只缓存，不失效：第一次读取后永远返回缓存。依赖改变时没有任何机制让它重新计算，结果变旧。',
      expectFail: /total = 40/
    },
    {
      js: CP_EARLIER + sub(CP_SOL, 'scheduler() { if (!stale) { stale = true; trigger(c, \'value\') } }', 'scheduler() { stale = true }') + CP_DEMO,
      why: '调度函数只作废缓存，没有通知读过 .value 的外层 effect。缓存对了，但它还不是一个依赖：外层 effect 不会重新运行，页面不会更新。',
      expectFail: /外层 effect/
    },
    {
      js: CP_EARLIER + sub(CP_SOL, '      track(c, \'value\')\n', '') + CP_DEMO,
      why: '读取 .value 时没有 track(c, \'value\')。没有人记录外层 effect 读过 computed，trigger 找不到要通知的对象。',
      expectFail: /外层 effect/
    },
    {
      js: CP_EARLIER + sub(CP_SOL, '    lazy: true,\n', '') + CP_DEMO,
      why: '没有用 lazy。创建时 effect 就运行了 getter，还没有人读取就计算了一次。',
      expectFail: /创建后/
    }
  ]
}

// ===== 练习：depCleanup =====
const DC_PUSH = '  activeEffect.deps.push(dep)\n'
const dcTrack = (line: string) => sub(answer(TRACK), DC_PUSH, '  ' + line + '\n')
const dcCleanup = (body: string) => 'function cleanup(e) {\n  ' + body + '\n}\n'
const dcEffect = (line: string) => sub(answer(EFFECT), '      cleanup(e)\n      const prev = activeEffect', (line ? '      ' + line + '\n' : '') + '      const prev = activeEffect')
const dcBuild = (track: string, cleanup: string, effect: string) =>
  fold('已给出：全局状态（不用改）', answer(HEAD)) +
  track +
  fold('已给出：trigger 和 reactive（不用改）', answer(MID)) +
  effect +
  cleanup +
  fold('已给出：untracked、ref、computed（不用改）', answer(TAIL + COMPUTED))

const DC_DEMO = `
// ===== 已给出：使用 =====
const state = reactive({ useA: true, a: 1, b: 1 })
let runs = 0
const view = Vue.ref({ runs: 0, shown: '' })

effect(() => {
  runs++
  const shown = state.useA ? 'a = ' + state.a : 'b = ' + state.b
  view.value = { runs, shown }
})

const toggle = () => { state.useA = !state.useA }
const incA = () => { state.a++ }
const incB = () => { state.b++ }

return { view, toggle, incA, incB }`

const DC_SOL_PUSH = 'activeEffect.deps.push(dep)   // 反向记录：这个 effect 订阅了 dep'
const DC_SOL_CLEAN = 'e.deps.forEach(dep => dep.delete(e))   // 先从每个 dep 里退订\n  e.deps.length = 0                       // 再清空自己的记录'
const DC_SOL_RUN = 'cleanup(e)   // 运行 fn 之前清理，运行时重新收集'

export const depCleanup: Exercise = {
  title: '给迷你响应式加上依赖清理', ch: 24,
  task: '<p>脚本里的 <code>effect</code> 读取 <code>state.useA ? state.a : state.b</code>。零件 1 的 <code>effect</code> 本来有依赖清理，这里把它去掉了，所以 <code>useA</code> 变成 false 以后，改 <code>a</code> 仍然会让它运行。补全 3 处 TODO：</p><ol><li>TODO 1：<code>track</code> 里让 effect 记住它订阅了哪个 dep（<code>activeEffect.deps</code> 是数组）。</li><li>TODO 2：<code>cleanup(e)</code> 把 e 从它订阅过的每个 dep 里删掉，再清空 <code>e.deps</code>。</li><li>TODO 3：<code>run</code> 在运行 <code>fn</code> 之前调用清理。</li></ol><p>目标：切换分支后，旧分支读过的属性不再触发这个 effect。</p>',
  tpl: '<p>{{ view.shown }}</p>\n<p>effect 运行次数：{{ view.runs }}</p>\n<button @click="toggle">切换 useA</button>\n<button @click="incA">a + 1</button>\n<button @click="incB">b + 1</button>',
  js: dcBuild(
    dcTrack('// TODO 1：让 activeEffect 记住这个 dep'),
    dcCleanup('// TODO 2：把 e 从它订阅过的每个 dep 里删掉，再清空 e.deps'),
    dcEffect('// TODO 3：运行 fn 之前，先清理旧依赖')
  ) + DC_DEMO,
  solJs: dcBuild(dcTrack(DC_SOL_PUSH), dcCleanup(DC_SOL_CLEAN), dcEffect(DC_SOL_RUN)) + DC_DEMO,
  faded: {
    js: dcBuild(
      dcTrack('activeEffect.deps.push(/* ✏️ 要记住的 dep */)'),
      dcCleanup('for (const dep of e.deps) {\n    /* ✏️ 把 e 从这个 dep 里删掉 */\n  }\n  /* ✏️ 清空 e.deps，下一次运行重新收集 */'),
      dcEffect('/* ✏️ 运行 fn 之前，先做什么 */')
    ) + DC_DEMO
  },
  hints: [
    '清理要做两件事：一是把 effect 从它订阅过的每个 dep（Set）里删掉，二是清空 effect 自己记的 deps。要做第一件事，effect 得先知道它订阅过哪些 dep，所以 track 要反向记录。',
    'track 里 dep.add(activeEffect) 之后，再 activeEffect.deps.push(dep)。cleanup 里遍历 e.deps，对每个 dep 调用 dep.delete(e)，最后 e.deps.length = 0。run 里第一件事是 cleanup(e)。',
    'track：activeEffect.deps.push(dep)\ncleanup：e.deps.forEach(dep => dep.delete(e)); e.deps.length = 0\nrun：在 const prev = activeEffect 之前调用 cleanup(e)'
  ],
  async check(T) {
    const runs = () => { const m = T.text().match(/运行次数：\s*(\d+)/); return m ? +m[1] : -1 }
    const shown = () => { const p = T.$$('p')[0]; return p ? (p.textContent || '').trim() : '' }
    const press = async (name: string) => { const b = T.btn(name); if (b) await T.click(b); return !!b }
    for (const n of ['切换 useA', 'a + 1', 'b + 1']) if (!T.btn(n)) { T.ok(false, '找到按钮“' + n + '”'); return }
    T.ok(runs() === 1, '创建时运行 1 次（当前 ' + runs() + ' 次）')
    await press('b + 1')
    T.ok(runs() === 1, 'useA 为 true 时没读过 b，改 b 不运行（当前 ' + runs() + ' 次）')
    await press('切换 useA')
    T.ok(runs() === 2 && /b = 1/.test(shown()) === false && /b = 2/.test(shown()), '切换后运行第 2 次，改读 b（当前 ' + runs() + ' 次，显示 ' + shown() + '）')
    await press('a + 1')
    T.ok(runs() === 2, '切换后旧依赖 a 已清理，改 a 不再运行（当前 ' + runs() + ' 次）')
    await press('b + 1')
    T.ok(runs() === 3, '改 b 运行第 3 次（当前 ' + runs() + ' 次）')
    await press('切换 useA')
    T.ok(runs() === 4 && /a = 2/.test(shown()), '切回 useA 运行第 4 次，改读 a（当前 ' + runs() + ' 次，显示 ' + shown() + '）')
    await press('b + 1')
    T.ok(runs() === 4, '切回后旧依赖 b 已清理，改 b 不再运行（当前 ' + runs() + ' 次）')
    await press('a + 1')
    T.ok(runs() === 5, '改 a 运行第 5 次，一次改动只运行一次（当前 ' + runs() + ' 次）')
  },
  wrong: [
    {
      js: dcBuild(dcTrack(DC_SOL_PUSH), dcCleanup('e.deps.length = 0   // 清空记录'), dcEffect(DC_SOL_RUN)) + DC_DEMO,
      why: '只清空了 effect 自己的数组，没有从 dep 里退订。dep 里仍然有这个 effect，旧依赖照样触发它。',
      expectFail: /旧依赖/
    },
    {
      js: dcBuild(dcTrack('// 忘了反向记录'), dcCleanup(DC_SOL_CLEAN), dcEffect(DC_SOL_RUN)) + DC_DEMO,
      why: 'track 没有把 dep 记进 activeEffect.deps，cleanup 遍历的是空数组，什么也删不掉。',
      expectFail: /旧依赖/
    },
    {
      js: sub(dcBuild(dcTrack(DC_SOL_PUSH), dcCleanup(DC_SOL_CLEAN), dcEffect('')), 'try { return fn() } finally { activeEffect = prev }', 'try { return fn() } finally { activeEffect = prev; cleanup(e) }') + DC_DEMO,
      why: '在 fn 运行之后清理，会把刚收集到的依赖删光。effect 之后不再被任何数据触发。',
      expectFail: /切换后运行第 2 次/
    }
  ]
}
