import type { Exercise } from './types'
import { sub } from './types'
import { answer, build, domSource, fold, PARTS, region } from '../mini'

// 三道练习共用同一套迷你 Vue（course/mini，见 course/mini/README.md）：
// 第 24、25、26、28、30 章写过的零件（响应式、更新队列、watch、h、元素与 diff）整体折叠，
// 本章零件（6a 组件实例与钩子，6b 组件挂载与更新）里除了要写的那一段，其余也折叠。
// 脚本里的函数用 function 声明，所以迷你版的 reactive、onMounted 覆盖了练习环境里同名的真实函数；需要真实的 Vue API 时写 Vue.xxx。

const EARLIER = fold('第 24、25、26、28、30 章你写过的零件：响应式、更新队列、watch、h、元素与 diff', domSource('element'))
const COMP = PARTS.component + '\n' + PARTS.componentRender
const REST = '本章其余已经写好的部分：组件实例、钩子、provide、更新、卸载、createApp'

/** 只露出 names 里的区域，其余的代码折叠成只读块 */
function focus(code: string, names: string[]): string {
  const lines = code.split('\n')
  const ranges: [number, number][] = names.map(name => {
    const s = lines.findIndex(l => new RegExp('^\\s*//#region ' + name + '\\s*$').test(l))
    if (s < 0) throw new Error('找不到区域 ' + name)
    let depth = 0
    for (let i = s; i < lines.length; i++) {
      if (/^\s*\/\/#region\b/.test(lines[i])) depth++
      else if (/^\s*\/\/#endregion\b/.test(lines[i]) && --depth === 0) return [s, i] as [number, number]
    }
    throw new Error('区域 ' + name + ' 没有结束标记')
  }).sort((a, b) => a[0] - b[0])
  const out: string[] = []
  let at = 0
  const gap = (from: number, to: number) => {
    const chunk = lines.slice(from, to)
    if (chunk.some(l => l.trim() && !/^\s*\/\/#(end)?region\b/.test(l))) out.push(fold(REST, chunk.join('\n')))
  }
  for (const [s, e] of ranges) {
    gap(at, s)
    out.push(lines.slice(s, e + 1).join('\n'))
    at = e + 1
  }
  gap(at, lines.length)
  return out.join('\n')
}

/** 把 text 里从 from 开始到 to 结束（含 to）的一段换成 rep；找不到就抛错，免得悄悄生成一道没有挖空的题 */
function cut(text: string, from: string, to: string, rep: string, last = false): string {
  const s = text.indexOf(from)
  const e = last ? text.lastIndexOf(to) : text.indexOf(to, s)
  if (s < 0 || e < 0) throw new Error('cut：找不到 ' + from + ' … ' + to)
  return text.slice(0, s) + rep + text.slice(e + to.length)
}

const SRE = region(PARTS.componentRender, 'setupRenderEffect')
const MC = region(PARTS.componentRender, 'mountComponent')

// ---------------------------------------------------------------------------
// 演示代码：用迷你 Vue 的公开名字（reactive、h、onMounted、createApp）
// ---------------------------------------------------------------------------

const demo = (p: string) => `
// ===== 使用迷你 Vue（不用修改） =====
const state = reactive({ count: 0, label: 'a' })

function log(msg) {
  document.getElementById('${p}-log').textContent += msg + '\\n'
}

const Counter = {
  setup(props) {
    log('Counter setup')
    onMounted(() => {
      const inPage = document.getElementById('${p}-host').contains(document.getElementById('${p}-counter'))
      log('Counter mounted，DOM 已在页面上：' + inPage)
    })
    return () => {
      log('Counter render')
      return h('i', { id: '${p}-counter' }, 'count = ' + props.count)
    }
  }
}

const App = {
  setup() {
    log('App setup')
    onMounted(() => log('App mounted'))
    return () => {
      log('App render')
      return h('div', null, [h(Counter, { count: state.count }), h('p', null, 'label = ' + state.label)])
    }
  }
}

Vue.onMounted(() => createApp(App).mount(document.getElementById('${p}-host')))

function addThree() { state.count++; state.count++; state.count++ }
function changeLabel() { state.label += 'b' }

return { addThree, changeLabel }`

const tpl = (p: string) => `<button @click="addThree">count 同步加 3</button>
<button @click="changeLabel">改 label</button>
<div id="${p}-host"></div>
<pre id="${p}-log"></pre>`

// ---------------------------------------------------------------------------
// 练习 1：mountComponent 和首次渲染（能看到页面）
// ---------------------------------------------------------------------------

const MOUNT_FROM = 'instance.bm.forEach(fn => fn())'
const MOUNT_TO = 'instance.isMounted = true\n'

const MC_START = `function mountComponent(vnode, container, anchor, parentComponent) {
  // TODO 1：三步。创建实例（记在 vnode.component 上）、setupComponent、setupRenderEffect
}`
const SRE_START_1 = cut(SRE, MOUNT_FROM, MOUNT_TO, `// TODO 2：首次渲染。先调用 instance.bm 里的钩子，再运行渲染函数得到 subTree（记在 instance.subTree 上），
      // patch(null, subTree, …) 挂载它，把 subTree.el 记到 instance.vnode.el，
      // 把 instance.m 里的钩子放进后置队列，最后标记 instance.isMounted
`)
const MC_FADED = `function mountComponent(vnode, container, anchor, parentComponent) {
  const instance = (vnode.component = /* ✏️ 创建组件实例，传入 vnode 和父组件实例 */)
  /* ✏️ 处理 props 并运行 setup */
  setupRenderEffect(instance, container, anchor)
}`
const SRE_FADED_1 = cut(SRE, MOUNT_FROM, MOUNT_TO, `instance.bm.forEach(fn => fn())
      const subTree = (instance.subTree = /* ✏️ 运行渲染函数 */)
      /* ✏️ 把 subTree 挂载进容器：patch 的第一个参数是 null */
      instance.vnode.el = subTree.el
      /* ✏️ mounted 钩子要等整棵树插入页面以后才运行：放进后置队列 */
      instance.isMounted = true
`)

const BLANK_1 = { mountComponent: MC_START, setupRenderEffect: SRE_START_1 }
const SOL_1 = EARLIER + answer(focus(COMP, ['mountComponent', 'setupRenderEffect'])) + demo('mm')

export const miniMount: Exercise = {
  title: '补全迷你 Vue 的 mountComponent 和首次渲染',
  ch: 31,
  task: '<p>下面是迷你 Vue（第 24 到 30 章你写过的零件已折叠，点开可以看）。本章的组件挂载只留下两处空白：</p><ol><li><b>TODO 1</b>：<code>mountComponent</code> 做三步：创建实例（记在 <code>vnode.component</code> 上）、<code>setupComponent</code>、<code>setupRenderEffect</code>。</li><li><b>TODO 2</b>：<code>setupRenderEffect</code> 里的首次渲染分支（<code>!instance.isMounted</code>）：调用 beforeMount 钩子，渲染并挂载子树，记下 el，把 mounted 钩子放进后置队列。</li></ol><p>更新分支和更新队列已经写好，下一道练习再写。补全后，页面下方的日志应显示：App 先 setup 再 render，Counter 的 mounted 先于 App 的 mounted，而且 Counter mounted 时它的 DOM 已经在页面上。</p>',
  tpl: tpl('mm'),
  js: EARLIER + build(focus(COMP, ['mountComponent', 'setupRenderEffect']), BLANK_1) + demo('mm'),
  solJs: SOL_1,
  faded: { js: EARLIER + build(focus(COMP, ['mountComponent', 'setupRenderEffect']), { mountComponent: MC_FADED, setupRenderEffect: SRE_FADED_1 }) + demo('mm') },
  hints: [
    '先看第 31.3、31.4 节。mountComponent 只有三步：createComponentInstance、setupComponent、setupRenderEffect。首次渲染在 componentUpdateFn 的第一条路径里。',
    '首次渲染的顺序：bm 钩子同步调用；instance.render() 得到子树；patch(null, subTree, container, anchor, instance)；instance.vnode.el = subTree.el；mounted 钩子放进后置队列；isMounted 置 true。',
    'mounted 钩子不能在 patch 之后直接调用：这时整棵树还没有插入页面。用 queuePostFlushCb 放进后置队列，等整棵树 patch 完再运行：instance.m.forEach(queuePostFlushCb)。',
    MC + '\n\n' + region(PARTS.componentRender, 'setupRenderEffect').split('\n').slice(0, 14).join('\n') + '\n  …（后面是更新分支和副作用函数，已经写好）'
  ],
  async check(T) {
    const wait = () => new Promise(r => setTimeout(r, 40))
    const host = T.$('#mm-host')
    const logEl = T.$('#mm-log')
    if (!host || !logEl) { T.ok(false, '页面上有 #mm-host 和 #mm-log'); return }
    const lines = () => (logEl.textContent || '').split('\n').filter(Boolean)
    const count = (name: string) => lines().filter(l => l === name).length
    const index = (prefix: string) => lines().findIndex(l => l.startsWith(prefix))
    T.ok(/count = 0/.test(host.textContent || '') && /label = a/.test(host.textContent || ''), '首次挂载后页面显示 “count = 0” 和 “label = a”（当前：“' + (host.textContent || '') + '”）')
    T.ok(host.querySelectorAll('#mm-counter').length === 1, '页面上只有一个 Counter')
    T.ok(index('App setup') >= 0 && index('App setup') < index('App render') && index('App render') < index('Counter setup') && index('Counter setup') < index('Counter render'),
      '顺序是 App setup、App render、Counter setup、Counter render（渲染 App 时才遇到 Counter，才创建它）')
    T.ok(count('App render') === 1 && count('Counter render') === 1, '首次挂载：App 和 Counter 的渲染函数各只运行一次（现在 App ' + count('App render') + ' 次、Counter ' + count('Counter render') + ' 次）')
    T.ok(index('Counter mounted') >= 0 && index('App mounted') > index('Counter mounted'), 'Counter 的 mounted 先于 App 的 mounted（子先父后）')
    T.ok(lines().some(l => l.startsWith('Counter mounted') && l.endsWith('true')), 'Counter mounted 运行时，它的 DOM 已经在页面上（mounted 要等整棵树插入页面后才运行）')
    const add = T.btn('同步加 3')
    if (!add) { T.ok(false, '页面上有按钮'); return }
    await T.click(add); await wait()
    T.ok(count('Counter setup') === 1, 'Counter 的 setup 只运行一次（现在 ' + count('Counter setup') + ' 次）')
  },
  wrong: [
    {
      js: sub(SOL_1, 'instance.m.forEach(queuePostFlushCb)', 'instance.m.forEach(fn => fn())'),
      why: '子组件 patch 完就直接调用 mounted。这时父组件的 DOM 还没有插入页面，所以子组件在 mounted 里读到的 DOM 不在页面上。mounted 要放进后置队列，整棵树 patch 完才运行。',
      expectFail: /已经在页面上/
    },
    {
      js: sub(SOL_1, 'const subTree = (instance.subTree = instance.render())', 'instance.render()\n      const subTree = (instance.subTree = instance.render())'),
      why: '渲染函数运行了两次：一次结果被丢掉。渲染函数要读响应式数据、有副作用（本例的日志），一次渲染只能运行一次。',
      expectFail: /各只运行一次/
    },
    {
      js: sub(SOL_1, 'patch(null, subTree, container, anchor, instance)', 'patch(null, subTree, document.body, anchor, instance)'),
      why: '子树被挂载到了 document.body，而不是传进来的容器。patch 的第三个参数是 setupRenderEffect 收到的 container。',
      expectFail: /页面显示|只有一个 Counter/
    }
  ]
}

// ---------------------------------------------------------------------------
// 练习 2：更新分支和更新队列
// ---------------------------------------------------------------------------

const UPD_FROM = 'if (instance.next) updateComponentPreRender(instance, instance.next)'
const UPD_TO = 'instance.u.forEach(queuePostFlushCb)\n'
const TAIL_FROM = 'const e = (instance.effect'
const TAIL_TO = 'instance.update()\n'

const SRE_START_2 = cut(cut(SRE, UPD_FROM, UPD_TO, `// TODO 1：更新分支。有 instance.next 时先 updateComponentPreRender；调用 bu 钩子；
      // 渲染出新子树，和旧子树 patch（容器是旧 DOM 的父节点，anchor 是旧子树之后的节点）；
      // 把 subTree.el 记到 instance.vnode.el；u 钩子放进后置队列
`), TAIL_FROM, TAIL_TO, `// TODO 2：把 componentUpdateFn 装进渲染副作用函数，记在 instance.effect 上（放在 instance.scope.run 里）。
  // lazy：创建时不运行；调度函数把更新任务放进更新队列。
  // instance.update 是直接运行；instance.job 是放进队列的更新任务（runIfDirty），id 用 instance.uid，allowRecurse 为 true。
  // 最后调用 instance.update() 完成首次渲染。
`, true)
const SRE_FADED_2 = cut(cut(SRE, UPD_FROM, UPD_TO, `if (instance.next) updateComponentPreRender(instance, instance.next)
      instance.bu.forEach(fn => fn())
      const prevTree = instance.subTree
      const nextTree = (instance.subTree = /* ✏️ 渲染出新子树 */)
      /* ✏️ 新旧子树 patch：容器是旧 DOM 的父节点，anchor 是旧子树之后的节点 */
      instance.vnode.el = nextTree.el
      instance.u.forEach(queuePostFlushCb)
`), TAIL_FROM, TAIL_TO, `const e = (instance.effect = instance.scope.run(() =>
    effect(componentUpdateFn, { lazy: true, scheduler: /* ✏️ 调度函数：把更新任务放进更新队列 */ })))
  instance.update = e.run
  const job = (instance.job = /* ✏️ 更新任务：已经被直接更新过就不再重复运行 */)
  job.id = instance.uid
  job.allowRecurse = true
  instance.update()
`, true)

const SOL_2 = EARLIER + answer(focus(COMP, ['setupRenderEffect'])) + demo('mu')

export const miniUpdateEffect: Exercise = {
  title: '补全 setupRenderEffect 的更新分支和更新队列',
  ch: 31,
  task: '<p>上一道练习写了首次渲染。这一道补完 <code>setupRenderEffect</code> 的另一半（<code>mountComponent</code> 和首次渲染分支已经写好）：</p><ol><li><b>TODO 1</b>：<code>componentUpdateFn</code> 的更新分支。父组件触发的更新带着 <code>instance.next</code>，要先更新 props；然后渲染新子树，和旧子树 patch。</li><li><b>TODO 2</b>：创建渲染副作用函数。用迷你版的 <code>lazy</code> 选项（创建时不运行；真实的 3.5 没有这个选项），数据改变时不直接运行，由调度函数把更新任务放进更新队列；任务的 <code>id</code> 用 <code>instance.uid</code>。最后手动运行第一次。</li></ol><p>补全后，点“count 同步加 3”：App 和 Counter 各只多渲染一次。点“改 label”：只有 App 渲染，Counter 的 props 没变，不渲染。</p>',
  tpl: tpl('mu'),
  js: EARLIER + build(focus(COMP, ['setupRenderEffect']), { setupRenderEffect: SRE_START_2 }) + demo('mu'),
  solJs: SOL_2,
  faded: { js: EARLIER + build(focus(COMP, ['setupRenderEffect']), { setupRenderEffect: SRE_FADED_2 }) + demo('mu') },
  hints: [
    '先看第 31.4 节的两条路径对照表。更新分支比首次渲染多两件事：先用 instance.next 更新 props，再拿新旧子树 patch。',
    '副作用函数用 effect(componentUpdateFn, { lazy: true, scheduler: … }) 创建。lazy 是迷你版的选项，表示创建时不运行（真实的 3.5 没有它）。调度函数只做一件事：queueJob(job)。update 是 e.run（直接运行），job 是 e.runIfDirty（放进队列的任务），job.id = instance.uid，创建完以后手动调用一次 update()。',
    '更新分支里 patch 的参数：patch(prevTree, nextTree, hostParentNode(prevTree.el), getNextHostNode(prevTree), instance)。instance.next 不为空时，要先调用 updateComponentPreRender(instance, instance.next)，子组件才能拿到新的 props。',
    SRE
  ],
  async check(T) {
    const wait = () => new Promise(r => setTimeout(r, 40))
    const host = T.$('#mu-host')
    const logEl = T.$('#mu-log')
    if (!host || !logEl) { T.ok(false, '页面上有 #mu-host 和 #mu-log'); return }
    const lines = () => (logEl.textContent || '').split('\n').filter(Boolean)
    const count = (name: string) => lines().filter(l => l === name).length
    T.ok(/count = 0/.test(host.textContent || '') && host.querySelectorAll('#mu-counter').length === 1, '首次挂载后页面显示 “count = 0”，只有一个 Counter')
    const add = T.btn('同步加 3')
    const lab = T.btn('改 label')
    if (!add || !lab) { T.ok(false, '页面上有两个按钮'); return }
    await T.click(add); await wait()
    T.ok(/count = 3/.test(host.textContent || ''), '点击后 Counter 显示 “count = 3”（当前：“' + (host.textContent || '') + '”）。父组件更新时，要把新的 props 交给子组件')
    T.ok(count('App render') === 2 && count('Counter render') === 2,
      'count 同步加 3：App 和 Counter 各只多渲染一次（现在 App ' + count('App render') + ' 次、Counter ' + count('Counter render') + ' 次，应当都是 2）。数据改变时要放进更新队列，不能立刻渲染')
    await T.click(lab); await wait()
    T.ok(/label = ab/.test(host.textContent || ''), '改 label 后页面显示 “label = ab”')
    T.ok(count('App render') === 3 && count('Counter render') === 2, '只改 label：App 又渲染一次，Counter 的 props 没变，不渲染（App ' + count('App render') + ' 次、Counter ' + count('Counter render') + ' 次）')
    T.ok(count('Counter setup') === 1, 'Counter 的 setup 只运行一次（现在 ' + count('Counter setup') + ' 次）。setup 在创建实例时运行，更新时只运行渲染函数')
    T.ok(host.querySelectorAll('#mu-counter').length === 1, '更新以后，页面上仍然只有一个 Counter')
  },
  wrong: [
    {
      js: sub(SOL_2, ', scheduler: () => queueJob(job)', ''),
      why: '没有调度函数时，数据一改变，副作用函数就立刻运行。同步改 3 次就渲染 3 次。真实的 Vue 用调度函数把更新任务放进更新队列（第 25 章），同一个任务只排一次。',
      expectFail: /更新队列|各只多渲染一次/
    },
    {
      js: sub(SOL_2, 'patch(prevTree, nextTree, hostParentNode(prevTree.el), getNextHostNode(prevTree), instance)', 'patch(null, nextTree, hostParentNode(prevTree.el), getNextHostNode(prevTree), instance)'),
      why: '更新时仍然 patch(null, …)，把它当成挂载：新的 DOM 被插进去，旧的 DOM 没有被比较，也没有被删除，页面上会出现重复的内容。更新要拿旧子树和新子树比较。',
      expectFail: /只有一个 Counter/
    },
    {
      js: sub(SOL_2, 'const nextTree = (instance.subTree = instance.render())', 'setupComponent(instance)\n      const nextTree = (instance.subTree = instance.render())'),
      why: '每次更新都重新运行 setup。setup 只在创建实例时运行一次，里面创建的状态会被重置，钩子也会被重复注册。更新时只运行渲染函数。',
      expectFail: /setup 只运行一次/
    },
    {
      js: sub(SOL_2, 'if (instance.next) updateComponentPreRender(instance, instance.next)', ''),
      why: '父组件让子组件更新时，新的 vnode 放在 instance.next 上。渲染子组件之前必须先用它更新 props，否则子组件用旧 props 渲染，页面不变。',
      expectFail: /count = 3/
    }
  ]
}

// ---------------------------------------------------------------------------
// 练习 3：shouldUpdateComponent
// ---------------------------------------------------------------------------

const SHOULD_START = `function shouldUpdateComponent(prev, next) {
  // prev、next 是新旧两个组件 vnode，它们的 props 是 vnode.props（可能是 null）。
  // 返回 true：子组件要更新。返回 false：跳过。
  return true     // 现在的写法：只要父组件重新渲染，子组件就更新
}`
const SHOULD_FADED = `function shouldUpdateComponent(prev, next) {
  const prevProps = prev.props || {}
  const nextProps = next.props || {}
  const emits = prev.type.emits || []
  const keys = Object.keys(nextProps)
  if (/* ✏️ 新旧属性的个数不同（多了或少了属性） */) return true
  return keys.some(key => /* ✏️ 这个属性的值变了，并且它不是已声明的事件监听 */)
}`
const SHOULD_ANS = region(PARTS.componentRender, 'shouldUpdateComponent')
const SHOULD_BODY = SHOULD_ANS.slice(SHOULD_ANS.indexOf('  if (keys.length'), SHOULD_ANS.lastIndexOf('}'))

const DEMO_SHOULD = `
// ===== 使用迷你 Vue（不用修改） =====
const state = reactive({ other: 0, id: 1, showExtra: true })
const renders = {}

function makeChild(name, options) {
  return {
    ...options,
    setup(props) {
      return () => {
        renders[name] = (renders[name] || 0) + 1
        return h('li', null, name + ' 渲染了 ' + renders[name] + ' 次')
      }
    }
  }
}
const ChildA = makeChild('A', {})                       // 只收到 id
const ChildB = makeChild('B', {})                       // 每次收到一个新对象
const ChildC = makeChild('C', { emits: ['save'] })      // 声明了 save 事件
const ChildD = makeChild('D', {})                       // 没有声明 ping 事件
const ChildE = makeChild('E', {})                       // 有时多一个属性

const App = {
  setup() {
    return () => h('div', null, [
      h('p', null, 'other = ' + state.other),
      h('ul', null, [
        h(ChildA, { id: state.id }),
        h(ChildB, { user: { name: 'Ann' } }),
        h(ChildC, { onSave: () => {} }),
        h(ChildD, { onPing: () => {} }),
        h(ChildE, state.showExtra ? { tag: 'x', extra: 1 } : { tag: 'x' })
      ])
    ])
  }
}

Vue.onMounted(() => createApp(App).mount(document.getElementById('ms-host')))

function bumpOther() { state.other++ }
function bumpId() { state.id++ }
function removeExtra() { state.showExtra = false }

return { bumpOther, bumpId, removeExtra }`

const TPL_SHOULD = `<button @click="bumpOther">改 other（和子组件无关）</button>
<button @click="bumpId">改 id（A 的 prop）</button>
<button @click="removeExtra">去掉 E 的 extra 属性</button>
<div id="ms-host"></div>`

const SOL_3 = EARLIER + answer(focus(COMP, ['shouldUpdateComponent'])) + DEMO_SHOULD

export const miniShouldUpdate: Exercise = {
  title: '实现 shouldUpdateComponent',
  ch: 31,
  task: '<p>父组件重新渲染时，会给每个子组件一个新的 vnode。<code>shouldUpdateComponent(prev, next)</code> 比较新旧 vnode 的 props，决定子组件要不要更新。现在它永远返回 <code>true</code>，所以子组件总是更新。其余的迷你 Vue（已折叠）都已写好。</p><p>按 Vue 的规则实现它：</p><ol><li>属性的个数不同，要更新。</li><li>逐个属性用 <code>!==</code> 比较（浅比较，不比较对象的内容）。有一个值变了，要更新。</li><li>已经在 <code>emits</code> 里声明的事件监听（例如声明了 <code>save</code> 的 <code>onSave</code>）不参与比较。<code>isEmitListener(emits, key)</code> 已经写好。</li></ol><p>五个子组件的页面上都显示渲染次数。先点“改 other”，再点“改 id”，最后点“去掉 E 的 extra 属性”，核对哪些子组件应该更新。</p>',
  tpl: TPL_SHOULD,
  js: EARLIER + build(focus(COMP, ['shouldUpdateComponent']), { shouldUpdateComponent: SHOULD_START }) + DEMO_SHOULD,
  solJs: SOL_3,
  faded: { js: EARLIER + build(focus(COMP, ['shouldUpdateComponent']), { shouldUpdateComponent: SHOULD_FADED }) + DEMO_SHOULD },
  hints: [
    '先看第 31.5 节的 shouldUpdateComponent。它只做 props 的浅比较：先看属性个数，再逐个看值。',
    '属性个数不同时，直接返回 true。个数相同时，遍历 nextProps 的每个 key：值不相同（!==），并且 !isEmitListener(emits, key)，就返回 true。遍历完都没有变化，返回 false。',
    '不要比较 prev.props !== next.props：父组件每次渲染都会创建新的 props 对象，它们永远不相同。也不要用 JSON.stringify 比较内容：Vue 只做浅比较，每次传新对象的子组件就是会更新。',
    SHOULD_ANS
  ],
  async check(T) {
    const wait = () => new Promise(r => setTimeout(r, 40))
    const host = T.$('#ms-host')
    if (!host) { T.ok(false, '页面上有 #ms-host'); return }
    const counts = () => {
      const r: Record<string, number> = {}
      ;(host.textContent || '').replace(/([A-E]) 渲染了 (\d+) 次/g, (_, n, c) => { r[n] = +c; return '' })
      return r
    }
    const show = (c: Record<string, number>) => ['A', 'B', 'C', 'D', 'E'].map(n => n + '=' + c[n]).join('，')
    const b1 = T.btn('改 other'), b2 = T.btn('改 id'), b3 = T.btn('去掉 E')
    if (!b1 || !b2 || !b3) { T.ok(false, '页面上有三个按钮'); return }
    let c = counts()
    T.ok(['A', 'B', 'C', 'D', 'E'].every(n => c[n] === 1), '首次挂载：五个子组件各渲染 1 次（' + show(c) + '）')
    await T.click(b1); await wait()
    c = counts()
    T.ok(c.A === 1, '改 other：A 的 props 没变，不更新（A 现在渲染了 ' + c.A + ' 次，应当还是 1 次）')
    T.ok(c.B === 2, '改 other：B 每次收到新对象，浅比较 !== 为 true，要更新（B 现在 ' + c.B + ' 次，应当是 2 次）')
    T.ok(c.C === 1, '改 other：C 声明了 save 事件，新的 onSave 函数不算变化，不更新（C 现在 ' + c.C + ' 次，应当还是 1 次）')
    T.ok(c.D === 2, '改 other：D 没有声明 ping，新的 onPing 函数算变化，要更新（D 现在 ' + c.D + ' 次，应当是 2 次）')
    T.ok(c.E === 1, '改 other：E 的 props 没变，不更新（E 现在 ' + c.E + ' 次，应当还是 1 次）')
    await T.click(b2); await wait()
    c = counts()
    T.ok(c.A === 2, '改 id：A 的 id 变了，要更新（A 现在 ' + c.A + ' 次，应当是 2 次）')
    T.ok(c.E === 1 && c.C === 1, '改 id：E 和 C 仍不更新（' + show(c) + '）')
    await T.click(b3); await wait()
    c = counts()
    T.ok(c.E === 2, '去掉 extra：E 的属性个数变了，要更新（E 现在 ' + c.E + ' 次，应当是 2 次）。注意只遍历新的 props 会漏掉被删除的属性')
    T.ok(c.A === 2 && c.C === 1, '去掉 extra：A 和 C 不更新（' + show(c) + '）')
  },
  wrong: [
    {
      js: sub(SOL_3, SHOULD_BODY, '  return prev.props !== next.props\n'),
      why: '比较的是 props 对象本身。父组件每次渲染都会创建新的 props 对象，它们永远不相同，所以子组件总是更新。要逐个属性比较。',
      expectFail: /A 的 props 没变/
    },
    {
      js: sub(SOL_3, SHOULD_BODY, '  return JSON.stringify(prev.props) !== JSON.stringify(next.props)\n'),
      why: '比较了内容（深比较）。Vue 只做浅比较：B 每次传新对象，对象内容相同，Vue 仍然会更新它。深比较在大对象上也有成本。而且函数在 JSON.stringify 里会被忽略，事件监听的差别看不出来。',
      expectFail: /B 每次收到新对象|D 没有声明/
    },
    {
      js: sub(SOL_3, ' && !isEmitListener(emits, key)', ''),
      why: '没有排除已声明的事件监听。父组件每次渲染都会创建新的回调函数，onSave !== onSave 恒为 true，声明了事件的子组件也总是更新。',
      expectFail: /C 声明了 save/
    },
    {
      js: sub(SOL_3, '  if (keys.length !== Object.keys(prevProps).length) return true\n', ''),
      why: '只遍历了新 props 的属性，没有比较属性的个数。新 props 里没有的旧属性（被删除的 extra）被漏掉了，子组件应该更新却没有更新。',
      expectFail: /属性个数变了/
    },
    {
      js: sub(SOL_3, SHOULD_BODY, '  return false\n'),
      why: '永远不更新。props 真的变了的子组件（A 的 id）也不会更新，页面就是旧的。',
      expectFail: /A 的 id 变了|B 每次收到新对象/
    }
  ]
}
