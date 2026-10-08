import type { Exercise } from './types'
import { sub } from './types'

// ---------- 练习 1：带重试和自动复位的错误边界 ----------
const bombJs = `const { onErrorCaptured } = Vue           // 运行器的参数里没有 onErrorCaptured，从全局 Vue 取出
let mounts = 0                            // Bomb 的 setup 每运行一次加 1

const Bomb = {
  props: ['boom'],
  setup() { return { n: ++mounts } },
  template: '<p>炸弹：{{ status() }}（第 {{ n }} 次挂载）</p>',
  methods: {
    status() {
      if (this.boom) throw new Error('炸弹爆炸了')
      return '正常'
    }
  }
}
`
const boundaryTail = `
const boom = ref(false)
const page = ref(1)
return { boom, page, components: { Bomb, ErrorBoundary } }`

const boundaryTpl = `<button @click="boom = !boom">炸弹：{{ boom ? '已点燃' : '已拆除' }}</button>
<button @click="page++">切换页面（第 {{ page }} 页）</button>
<ErrorBoundary :reset-key="page">
  <Bomb :boom="boom" />
</ErrorBoundary>`

const solBoundaryJs = bombJs + `
const ErrorBoundary = {
  props: ['resetKey'],
  setup(props) {
    const error = ref(null)
    onErrorCaptured(err => {
      error.value = err
      return false                          // 停止传递：应用级不再收到
    })
    const retry = () => { error.value = null }   // 子树已被卸载，清除错误后会重新挂载
    watch(() => props.resetKey, () => {
      if (error.value) retry()              // 只在出错时复位
    })
    return { error, retry }
  },
  template: '<div v-if="error"><p>出错了：{{ error.message }}</p><button @click="retry">重试</button></div><slot v-else></slot>'
}
` + boundaryTail

const keyedJs = solBoundaryJs
  .replace('const error = ref(null)', 'const error = ref(null)\n    const k = ref(0)')
  .replace('if (error.value) retry()', 'k.value++')
  .replace('return { error, retry }', 'return { error, retry, k }')
  .replace('<slot v-else></slot>', '<div v-else :key="k"><slot></slot></div>')

export const retryBoundary: Exercise = {
  title: '写一个能重试、能随换页复位的错误边界',
  ch: 33,
  task: '<p>补全 ErrorBoundary，满足四条：</p><ol><li>子组件出错时，显示“出错了：错误信息”和一个“重试”按钮，不显示子组件。错误不能传到应用级。</li><li>点“重试”：清除错误，子组件<b>重新挂载</b>（Bomb 的 setup 再运行一次）。炸弹还点燃着时，重试会再次进入后备界面。</li><li><code>resetKey</code> 变化且边界正处于出错状态时，自动复位，不用点重试。</li><li>没有出错时 <code>resetKey</code> 变化，子组件<b>不能</b>重新挂载。</li></ol><p>运行器的参数里没有 onErrorCaptured，脚本第一行已从全局 Vue 取出；watch 可以直接用。</p>',
  tpl: boundaryTpl,
  js: bombJs + `
// TODO：
// 1. 用 ref 保存错误；onErrorCaptured 记录错误并停止传递
// 2. 模板：有错误时显示“出错了”和“重试”按钮，否则显示插槽
// 3. retry 清除错误
// 4. 监听 resetKey：出错时才复位
const ErrorBoundary = {
  props: ['resetKey'],
  setup() {
    return {}
  },
  template: '<slot></slot>'
}
` + boundaryTail,
  solJs: solBoundaryJs,
  faded: {
    js: bombJs + `
const ErrorBoundary = {
  props: ['resetKey'],
  setup(props) {
    const error = ref(null)
    onErrorCaptured(err => {
      error.value = err
      /* ✏️ 阻止错误继续向上传递 */
    })
    const retry = () => { /* ✏️ 清除错误 */ }
    watch(() => props.resetKey, () => {
      if (/* ✏️ 只在出错时才复位 */ false) retry()
    })
    return { error, retry }
  },
  template: '<div v-if="error"><p>出错了：{{ error.message }}</p><button @click="retry">重试</button></div><slot v-else></slot>'
}
` + boundaryTail
  },
  hints: [
    '重试不需要 key：出错时 v-if 把插槽（子树）卸载了。清除错误后，插槽重新渲染，Bomb 从头创建。',
    '换页复位要加条件：watch(() => props.resetKey, …) 里先判断 error.value。没出错时清除错误什么也不会发生，子树不会被重建。',
    'setup(props) {\n  const error = ref(null)\n  onErrorCaptured(err => { error.value = err; return false })\n  const retry = () => { error.value = null }\n  watch(() => props.resetKey, () => { if (error.value) retry() })\n  return { error, retry }\n}\n模板：<div v-if="error"><p>出错了：{{ error.message }}</p><button @click="retry">重试</button></div><slot v-else></slot>'
  ],
  async check(T) {
    const cfg = ((T.$(':scope > div') as any)?._vnode?.component?.appContext?.config) || {}
    const old = cfg.errorHandler
    let propagated = 0
    cfg.errorHandler = () => { propagated++ }
    const mountsNow = () => { const m = /第 (\d+) 次挂载/.exec(T.text()); return m ? +m[1] : 0 }
    try {
      T.ok(/炸弹：\s*正常（第 1 次挂载）/.test(T.text()), '初始显示“炸弹：正常（第 1 次挂载）”')
      const page = T.btn('切换页面')
      const bomb = T.btn('炸弹')
      if (!page || !bomb) { T.ok(false, '找到“炸弹”和“切换页面”按钮'); return }
      await T.click(page)
      T.ok(mountsNow() === 1, '没有出错时换页，Bomb 不能重新挂载（现在是第 ' + mountsNow() + ' 次挂载）')
      await T.click(bomb)
      T.ok(/出错了：\s*炸弹爆炸了/.test(T.text()), '点燃炸弹后显示“出错了：炸弹爆炸了”')
      T.ok(!/炸弹：\s*正常/.test(T.text()), '出错时不再显示 Bomb')
      const retry = T.btn('重试')
      T.ok(!!retry, '后备界面里有“重试”按钮')
      T.ok(propagated === 0, '错误被边界拦住，没有传到应用级（传到的次数：' + propagated + '）')
      if (!retry) return
      await T.click(retry)
      T.ok(/出错了：\s*炸弹爆炸了/.test(T.text()), '炸弹还点燃着时重试，再次进入后备界面')
      await T.click(bomb)                                  // 拆除
      const retry2 = T.btn('重试')
      if (!retry2) { T.ok(false, '再次出错后仍有“重试”按钮'); return }
      await T.click(retry2)
      T.ok(/炸弹：\s*正常/.test(T.text()), '拆除炸弹后重试，显示“炸弹：正常”')
      T.ok(mountsNow() > 1, '重试后 Bomb 重新挂载（现在是第 ' + mountsNow() + ' 次挂载）')
      await T.click(bomb)                                  // 再次点燃
      T.ok(/出错了/.test(T.text()), '再次点燃后进入后备界面')
      await T.click(bomb)                                  // 拆除，但不点重试
      T.ok(/出错了/.test(T.text()), '拆除炸弹本身不会让边界恢复')
      await T.click(page)
      T.ok(/炸弹：\s*正常/.test(T.text()), '出错状态下换页，边界自动复位，不用点重试')
      T.ok(propagated === 0, '整个过程中，没有错误传到应用级（传到的次数：' + propagated + '）')
    } finally { cfg.errorHandler = old }
  },
  wrong: [
    {
      js: sub(solBoundaryJs, '      return false                          // 停止传递：应用级不再收到\n', ''),
      why: 'onErrorCaptured 没有返回 false，错误继续传到 app.config.errorHandler。上线后，同一个错误会被边界显示一次，又被全局处理函数上报或弹窗一次。',
      expectFail: /应用级/
    },
    {
      js: sub(solBoundaryJs, 'const retry = () => { error.value = null }', 'const retry = () => {}'),
      why: '“重试”按钮没有清除错误，后备界面一直显示。',
      expectFail: /重试/
    },
    {
      js: keyedJs,
      why: '换页时无条件重建子树（这里用 key 递增）。没有出错的页面也被重建，用户的输入和滚动位置全部丢失。要先判断 error.value。',
      expectFail: /没有出错时换页/
    },
    {
      js: sub(solBoundaryJs, "    watch(() => props.resetKey, () => {\n      if (error.value) retry()              // 只在出错时复位\n    })\n", ''),
      why: '没有监听 resetKey。用户换了页，边界还停在上一页的后备界面里，只能手动点重试。',
      expectFail: /自动复位/
    }
  ]
}
// ---------- 练习 2：带去重和限流的上报函数 ----------
const reporterHead = `const { getCurrentInstance } = Vue
const sent = []                  // 假装已经发给监控服务的上报
const bump = ref(0)              // 每次错误后加 1，让下面的 <pre> 重新渲染
const nameOf = c => c.$options.name || c.$options.__name || '(匿名)'
const seen = new Map()           // 指纹 → 已上报的那一条
`
const reporterTail = `
getCurrentInstance().appContext.config.errorHandler = (err, inst, info) => {
  report(err, inst, info)
  bump.value++
}

const Card = {
  name: 'Card',
  template: '<button @click="timeout">Card：超时</button> <button @click="badJson">Card：坏数据</button>',
  methods: {
    timeout() { throw new Error('timeout') },
    badJson() { throw new Error('bad-json') }
  }
}
const Chip = {
  name: 'Chip',
  template: '<button @click="timeout">Chip：超时</button>',
  methods: { timeout() { throw new Error('timeout') } }
}
const Footer = {
  name: 'Footer',
  template: '<button @click="down">Footer：挂了</button>',
  methods: { down() { throw new Error('footer-down') } }
}
const Panel = { name: 'Panel', template: '<div><slot></slot></div>' }

return { sent, bump, components: { Card, Chip, Footer, Panel } }`
const solReporter = `function report(err, inst, info) {
  const chain = []
  for (let c = inst; c; c = c.$parent) chain.push(nameOf(c))   // 从出错的组件一直走到根
  const fp = err.message + '@' + chain[0]                      // 指纹
  const hit = seen.get(fp)
  if (hit) { hit.count++; return }                             // 重复：只累加次数
  if (seen.size >= 3) return                                   // 限流：最多 3 种
  const item = { message: err.message, info, chain, count: 1 }
  seen.set(fp, item)
  sent.push(item)
}
`

export const errorReporter: Exercise = {
  title: '写一个带去重和限流的上报函数',
  ch: 33,
  task: '<p>实现 <code>report(err, inst, info)</code>。它已经被设为 <code>app.config.errorHandler</code>。每次错误把上报推进 <code>sent</code> 数组，页面下方会显示 <code>sent</code>。</p><ol><li>一条上报是 <code>{ message, info, chain, count }</code>。<code>chain</code> 是组件名数组，从出错的组件开始，沿 <code>$parent</code> 一直到根。组件名用已有的 <code>nameOf</code>。</li><li>指纹 = <code>message + "@" + chain[0]</code>。同一个指纹再次出现：不新增，把已有那条的 <code>count</code> 加 1。</li><li>限流：最多保存 3 种不同的指纹，之后出现的新指纹直接丢弃。已有指纹仍然累加。</li></ol>',
  tpl: '<Panel><Card /><Chip /></Panel>\n<Footer />\n<pre id="sent" :data-n="bump">{{ JSON.stringify(sent) }}</pre>',
  js: reporterHead + `
// TODO：实现 report
function report(err, inst, info) {
}
` + reporterTail,
  solJs: reporterHead + '\n' + solReporter + reporterTail,
  faded: {
    js: reporterHead + `
function report(err, inst, info) {
  const chain = []
  for (let c = inst; c; c = /* ✏️ 沿哪个属性走到父组件 */ null) chain.push(nameOf(c))
  const fp = /* ✏️ 指纹：消息加上出错的组件名 */ ''
  const hit = seen.get(fp)
  if (hit) { /* ✏️ 重复：只累加次数 */ return }
  if (/* ✏️ 限流：已经有 3 种了 */ false) return
  const item = { message: err.message, info, chain, count: 1 }
  seen.set(fp, item)
  sent.push(item)
}
` + reporterTail
  },
  hints: [
    '组件实例的父组件是 inst.$parent。用 for 循环从 inst 开始，一路 push(nameOf(c))，直到 c 为空。',
    '用 Map（已经建好，叫 seen）按指纹保存已经上报的那一条。查到了就 hit.count++ 然后 return。没查到再看 seen.size，够 3 种就 return，否则 seen.set 并 sent.push。',
    solReporter
  ],
  async check(T) {
    const read = () => { try { return JSON.parse(T.$('#sent')?.textContent || '[]') } catch { return [] } }
    const click = async (t: string) => { const b = T.btn(t); if (b) await T.click(b); else T.ok(false, '找到按钮“' + t + '”') }
    await click('Card：超时')
    await click('Card：超时')
    let s = read()
    T.ok(s.length === 1, '同一个错误出现两次，只有 1 条上报（现在 ' + s.length + ' 条）')
    T.ok(s[0] && s[0].count === 2, '重复出现时累加 count（现在是 ' + (s[0] && s[0].count) + '）')
    T.ok(!!s[0] && s[0].message === 'timeout', 'message 是错误的 message')
    T.ok(!!s[0] && typeof s[0].info === 'string' && s[0].info.length > 0, 'info 是传给 errorHandler 的第三个参数')
    const chain = (s[0] && s[0].chain) || []
    T.ok(chain[0] === 'Card' && chain[1] === 'Panel' && chain.length >= 3, 'chain 从出错的组件开始沿 $parent 到根：期望 Card、Panel、…（现在是 ' + JSON.stringify(chain) + '）')
    await click('Chip：超时')
    s = read()
    T.ok(s.length === 2, '消息相同但组件不同，是不同的错误（现在 ' + s.length + ' 条）')
    await click('Card：坏数据')
    s = read()
    T.ok(s.length === 3, '再来一种新错误，共 3 条（现在 ' + s.length + ' 条）')
    await click('Footer：挂了')
    s = read()
    T.ok(s.length === 3, '限流：最多 3 种，第 4 种被丢弃（现在 ' + s.length + ' 条）')
    await click('Card：超时')
    s = read()
    T.ok(s[0] && s[0].count === 3, '已有的指纹达到上限后仍然累加 count（现在是 ' + (s[0] && s[0].count) + '）')
  },
  wrong: [
    {
      js: sub(reporterHead + '\n' + solReporter + reporterTail, '  if (hit) { hit.count++; return }                             // 重复：只累加次数\n', ''),
      why: '没有去重。同一个错误重复出现 1000 次，就上报 1000 次。',
      expectFail: /只有 1 条/
    },
    {
      js: sub(reporterHead + '\n' + solReporter + reporterTail, '  if (seen.size >= 3) return                                   // 限流：最多 3 种\n', ''),
      why: '没有限流。新错误源源不断时，上报数量没有上限。',
      expectFail: /最多 3 种/
    },
    {
      js: sub(reporterHead + '\n' + solReporter + reporterTail, "const fp = err.message + '@' + chain[0]", 'const fp = err.message'),
      why: '指纹只用消息，不同组件里的同名错误被合并，定位不到是哪个组件。',
      expectFail: /组件不同/
    },
    {
      js: sub(reporterHead + '\n' + solReporter + reporterTail, '  for (let c = inst; c; c = c.$parent) chain.push(nameOf(c))   // 从出错的组件一直走到根', '  chain.push(nameOf(inst))'),
      why: 'chain 里只有出错的那一个组件，没有父链。看不出它在页面的哪个位置。',
      expectFail: /chain/
    },
    {
      js: sub(reporterHead + '\n' + solReporter + reporterTail, 'if (hit) { hit.count++; return }', 'if (hit) return'),
      why: '重复的错误只被丢弃，没有累加次数。看不出这个错误出现了多少次。',
      expectFail: /累加/
    }
  ]
}
