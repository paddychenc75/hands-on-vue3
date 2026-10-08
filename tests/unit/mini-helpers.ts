// 迷你 Vue 测试的公用工具（不是测试文件）：装配迷你版和真实版的同一套 API、可记录操作的宿主、一个很小的假 DOM。
import { expect } from 'vitest'
import * as RealCore from '@vue/runtime-core'
import * as RealReactivity from '@vue/reactivity'
import { domSource, rendererSource, EXERCISE_API_NAMES } from '../../course/mini'
import { runMini } from '../../course/mini/load'

/** 测试里用到的 API 的并集：迷你版和真实版都要提供同名的 */
export interface Api {
  h: any; ref: any; reactive: any; computed: any; watch: any; watchEffect: any; effect: any; nextTick: any
  onBeforeMount: any; onMounted: any; onBeforeUpdate: any; onUpdated: any; onBeforeUnmount: any; onUnmounted: any
  provide: any; inject: any; effectScope: any; onScopeDispose: any
  createRenderer: (options: any) => { render: (v: any, c: any) => void; createApp: (root: any, props?: any) => any }
}

const injected = Object.fromEntries(EXERCISE_API_NAMES.map(n => [n, (RealCore as any)[n] ?? (RealReactivity as any)[n]]))
injected.Vue = { ...RealCore }

/** 迷你版的 createRenderer 形态（第 32 章）。injected 模拟练习环境：同名的真实 API 被脚本里的 function 声明覆盖 */
export function loadMiniRenderer(document?: any): Api & Record<string, any> {
  return runMini(rendererSource(), { injected, globals: document ? { document } : {} })
}

/** 迷你版的 DOM 形态（第 31 章的脚本顶层写法），需要一个 document（假 DOM） */
export function loadMiniDom(document: any, upTo?: Parameters<typeof domSource>[0], extra = ''): Record<string, any> {
  return runMini(domSource(upTo) + '\n' + extra, { injected, globals: { document } })
}

export const realApi: Api = {
  ...(RealCore as any),
  effect: (RealReactivity as any).effect,
  effectScope: (RealReactivity as any).effectScope
}

// ---------------------------------------------------------------------------
// 记录操作的宿主：节点是普通对象，每次 nodeOps 调用都记一行。迷你版和真实版用同一个，比较两份 ops。
// ---------------------------------------------------------------------------
export interface LogNode { id: number; tag: string; text?: string; children: LogNode[]; parent: LogNode | null; props: Record<string, any> }

export function makeLogHost() {
  let id = 0
  const ops: string[] = []
  const mk = (tag: string, text?: string): LogNode => ({ id: ++id, tag, text, children: [], parent: null, props: {} })
  const L = (n: LogNode | null) => (n ? '#' + n.id : 'null')
  const show = (v: any) => (typeof v === 'function' ? 'fn' : JSON.stringify(v))
  const detach = (n: LogNode) => {
    if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1)
    n.parent = null
  }
  const options = {
    createElement(tag: string) { const n = mk(tag); ops.push('createElement ' + tag + ' ' + L(n)); return n },
    createText(text: string) { const n = mk('#text', text); ops.push('createText ' + show(text) + ' ' + L(n)); return n },
    setText(n: LogNode, text: string) { n.text = text; ops.push('setText ' + L(n) + ' ' + show(text)) },
    setElementText(el: LogNode, text: string) {
      el.children.forEach(c => (c.parent = null))
      el.children = []
      if (text) { const t = { id: -1, tag: '#text', text, children: [], parent: el, props: {} }; el.children.push(t) }
      ops.push('setElementText ' + L(el) + ' ' + show(text))
    },
    insert(child: LogNode, parent: LogNode, anchor: LogNode | null = null) {
      detach(child)
      const i = anchor ? parent.children.indexOf(anchor) : -1
      if (i < 0) parent.children.push(child)
      else parent.children.splice(i, 0, child)
      child.parent = parent
      ops.push('insert ' + L(child) + ' into ' + L(parent) + ' before ' + L(anchor))
    },
    remove(child: LogNode) { ops.push('remove ' + L(child)); detach(child) },
    parentNode: (n: LogNode) => n.parent,
    nextSibling(n: LogNode) { const s = n.parent!.children; return s[s.indexOf(n) + 1] || null },
    patchProp(el: LogNode, key: string, prev: any, next: any) {
      ops.push('patchProp ' + L(el) + ' ' + key + ' ' + show(prev) + ' -> ' + show(next))
      if (next == null) delete el.props[key]
      else el.props[key] = next
    }
  }
  const root = mk('root')
  const html = (n: LogNode = root): string =>
    n.tag === '#text' ? String(n.text) : '<' + n.tag + '>' + n.children.map(c => html(c)).join('') + '</' + n.tag + '>'
  return { ops, options, root, html }
}

// ---------------------------------------------------------------------------
// 很小的假 DOM：只实现迷你 Vue 的 DOM 形态（零件 5a、水合）用到的部分
// ---------------------------------------------------------------------------
export class FakeNode {
  parentNode: FakeNode | null = null
  childNodes: FakeNode[] = []
  attrs: Record<string, string> = {}
  listeners: Record<string, Function[]> = {}
  constructor(public nodeType: number, public nodeName: string, public nodeValue: string | null = null) {}
  get firstChild() { return this.childNodes[0] || null }
  get nextSibling() { const s = this.parentNode?.childNodes; return s ? s[s.indexOf(this) + 1] || null : null }
  get textContent(): string { return this.nodeType === 3 ? this.nodeValue! : this.childNodes.map(c => c.textContent).join('') }
  set textContent(t: string) {
    this.childNodes.forEach(c => (c.parentNode = null))
    this.childNodes = []
    if (t) this.insertBefore(new FakeNode(3, '#text', t), null)
  }
  insertBefore(child: FakeNode, anchor: FakeNode | null) {
    child.parentNode?.removeChild(child)
    const i = anchor ? this.childNodes.indexOf(anchor) : -1
    if (i < 0) this.childNodes.push(child)
    else this.childNodes.splice(i, 0, child)
    child.parentNode = this
    return child
  }
  removeChild(child: FakeNode) { this.childNodes.splice(this.childNodes.indexOf(child), 1); child.parentNode = null; return child }
  setAttribute(k: string, v: any) { this.attrs[k] = String(v) }
  removeAttribute(k: string) { delete this.attrs[k] }
  addEventListener(name: string, fn: Function) { (this.listeners[name] ||= []).push(fn) }
  removeEventListener(name: string, fn: Function) { this.listeners[name] = (this.listeners[name] || []).filter(f => f !== fn) }
  dispatch(name: string) { (this.listeners[name] || []).forEach(f => f()) }
  get outerHTML(): string {
    if (this.nodeType === 3) return this.nodeValue!
    const a = Object.entries(this.attrs).map(([k, v]) => ' ' + k + '="' + v + '"').join('')
    return '<' + this.nodeName + a + '>' + this.childNodes.map(c => c.outerHTML).join('') + '</' + this.nodeName + '>'
  }
}

export function makeFakeDocument() {
  return {
    createElement: (tag: string) => new FakeNode(1, tag.toUpperCase()),
    createTextNode: (t: string) => new FakeNode(3, '#text', t)
  }
}

/** 等一轮微任务（够用来等调度器刷新） */
export const tick = () => new Promise<void>(r => setTimeout(r, 0))

// ---------------------------------------------------------------------------
// 对照运行：同一个场景分别在迷你版和真实 Vue 上跑，宿主用同一个会记录操作的 options
// ---------------------------------------------------------------------------
const mini = () => (miniCache ||= loadMiniRenderer() as unknown as Api)
let miniCache: Api | null = null

/** 在一份实现上运行场景：ctx 里有 api、host、render、createApp、log（记一条事件） */
export async function run(api: Api, scenario: (ctx: any) => Promise<any> | any) {
  const host = makeLogHost()
  const { render, createApp } = api.createRenderer(host.options)
  const events: string[] = []
  await scenario({ api, host, render, createApp, log: (s: string) => events.push(s) })
  return { ops: host.ops, html: host.html(), events }
}

/** 两份实现跑同一个场景，断言最终结构、事件序列、宿主操作序列完全一致；返回迷你版的结果供进一步断言 */
export async function same(scenario: (ctx: any) => Promise<any> | any) {
  const a = await run(mini(), scenario)
  const b = await run(realApi, scenario)
  expect(a.html).toBe(b.html)
  expect(a.events).toEqual(b.events)
  expect(a.ops).toEqual(b.ops)
  return a
}

/** 迷你版的响应式 + 调度器 + watch（零件 1–3），不需要渲染器和 DOM */
export function loadMiniCore(upTo: 'reactivity' | 'scheduler' | 'watch' = 'watch'): Record<string, any> {
  return runMini(domSource(upTo), { injected })
}

/**
 * 把「迷你版 effect 返回 { run, stop }」和「真实版 effect 返回 runner 函数」统一成同一个形状，
 * 这样同一段测试代码能跑在两边。
 */
export function effectAdapters() {
  const m = loadMiniCore('watch')
  const real = RealReactivity as any
  // 真实的 3.5 里 effect() 已经没有 lazy 选项：不想立刻运行就用 new ReactiveEffect(fn)，再手动 run
  const wrapReal = (fn: () => any, options: any = {}) => {
    if (options.lazy) {
      const e = new real.ReactiveEffect(fn)
      if (options.scheduler) e.scheduler = options.scheduler
      return { run: () => e.run(), stop: () => e.stop() }
    }
    const runner = real.effect(fn, options)
    return { run: runner, stop: () => runner.effect.stop() }
  }
  return {
    mini: {
      effect: (fn: () => any, o?: any) => m.effect(fn, o), reactive: m.reactive, ref: m.ref, computed: m.computed,
      effectScope: m.effectScope, onScopeDispose: m.onScopeDispose, getCurrentScope: m.getCurrentScope
    },
    real: {
      effect: wrapReal, reactive: real.reactive, ref: real.ref, computed: real.computed,
      effectScope: real.effectScope, onScopeDispose: real.onScopeDispose, getCurrentScope: real.getCurrentScope
    }
  }
}
