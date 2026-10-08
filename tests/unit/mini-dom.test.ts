// 零件 4（vnode / h）、DOM 形态（第 28–31 章的脚本写法）、字符串渲染器（第 32 章）、迷你水合（第 36 章）
import * as RealCore from '@vue/runtime-core'
import { renderToString } from '@vue/server-renderer'
import { createSSRApp, h as realH } from 'vue'
import { describe, expect, it } from 'vitest'
import { loadMiniDom, loadMiniRenderer, makeFakeDocument, FakeNode } from './mini-helpers'
import { PARTS } from '../../course/mini'
import { runMini } from '../../course/mini/load'

const R = RealCore as any
const mini = loadMiniRenderer() as any

describe('零件 4：vnode 与 h 的形状和真实 Vue 一致', () => {
  const pick = (v: any): any => ({
    type: v.type, props: v.props, key: v.key, shapeFlag: v.shapeFlag,
    children: Array.isArray(v.children) ? v.children.map(pick)
      : v.children && typeof v.children === 'object' ? Object.keys(v.children).filter(k => k !== '_ctx') // 插槽对象：只比较键（_ctx 是真实版加的）
      : v.children
  })
  const Comp = { setup: () => () => null }
  const Fn = () => null
  const cases: [string, (h: any) => any][] = [
    ['h(tag)', h => h('div')],
    ['h(tag, props)', h => h('div', { id: 'a' })],
    ['h(tag, text)', h => h('div', 'text')],
    ['h(tag, number)', h => h('div', 3)],
    ['h(tag, vnode)', h => h('div', h('span'))],
    ['h(tag, props, text)', h => h('div', { id: 'a' }, 'text')],
    ['h(tag, null, [vnodes])', h => h('div', null, [h('a'), h('b')])],
    ['h(tag, props, vnode)', h => h('div', { id: 'a' }, h('span'))],
    ['h(tag, props, c1, c2, c3)', h => h('div', { id: 'a' }, h('a'), h('b'), h('c'))],
    ['key 在 props 里', h => h('li', { key: 'k' }, 'x')],
    ['key 是 0', h => h('li', { key: 0 }, 'x')],
    ['有状态组件', h => h(Comp, { a: 1 })],
    ['函数式组件', h => h(Fn, { a: 1 })],
    ['组件 + 数组 children', h => h(Comp, null, [h('a')])],
    ['函数 children 当作默认插槽', h => h(Comp, null, () => 'x')],
    ['对象 children 是插槽', h => h(Comp, null, { default: () => 'x' })]
  ]
  for (const [name, make] of cases) {
    it(name, () => {
      const a = pick(make(mini.h))
      const b = pick(make(R.h))
      expect(a).toEqual(b)
    })
  }

  it('数组 children 里的字符串、数字在迷你版的 h 里就变成文本 vnode（真实版在 patch 时才转）', () => {
    const v = mini.h('p', null, ['a', 1, 'b'])
    expect(v.children.map((c: any) => [c.type === mini.Text, c.children, c.shapeFlag])).toEqual([[true, 'a', 8], [true, '1', 8], [true, 'b', 8]])
  })

  it('shapeFlag 的数值和真实 Vue 的 ShapeFlags 一致', () => {
    expect(mini.ShapeFlags).toEqual({ ELEMENT: 1, FUNCTIONAL_COMPONENT: 2, STATEFUL_COMPONENT: 4, TEXT_CHILDREN: 8, ARRAY_CHILDREN: 16, SLOTS_CHILDREN: 32 })
    expect(R.h('div', null, 'x').shapeFlag).toBe(1 | 8)
  })
})

describe('DOM 形态：脚本顶层直接使用 document（第 31 章练习的写法）', () => {
  it('createApp(...).mount(container)：计数器，点击后更新，钩子顺序正确', async () => {
    const document = makeFakeDocument()
    const container = document.createElement('div') as FakeNode
    const dom = loadMiniDom(document)
    const log: string[] = []
    const state = dom.reactive({ count: 0 })
    const Counter = {
      setup(props: any) {
        dom.onMounted(() => log.push('Counter mounted'))
        dom.onUpdated(() => log.push('Counter updated'))
        return () => { log.push('Counter render'); return dom.h('button', { onClick: () => state.count++ }, 'count = ' + props.count) }
      }
    }
    const App = {
      setup() {
        dom.onMounted(() => log.push('App mounted'))
        return () => dom.h('div', { id: 'app' }, [dom.h(Counter, { count: state.count }), dom.h('p', null, 'x')])
      }
    }
    dom.createApp(App).mount(container)
    expect(container.outerHTML).toBe('<DIV><DIV id="app"><BUTTON>count = 0</BUTTON><P>x</P></DIV></DIV>')
    expect(log).toEqual(['Counter render', 'Counter mounted', 'App mounted'])
    const button = container.childNodes[0].childNodes[0]
    button.dispatch('click')
    button.dispatch('click')
    await dom.nextTick()
    expect(container.textContent).toBe('count = 2x')
    expect(log.slice(3)).toEqual(['Counter render', 'Counter updated'])
  })

  it('只用到第 30 章的零件（不含组件）也能直接运行：patch 一棵元素树', () => {
    const document = makeFakeDocument()
    const container = document.createElement('div') as FakeNode
    const dom = loadMiniDom(document, 'element')
    const v1 = dom.h('ul', null, [dom.h('li', { key: 'a' }, 'a'), dom.h('li', { key: 'b' }, 'b')])
    const v2 = dom.h('ul', null, [dom.h('li', { key: 'b' }, 'b'), dom.h('li', { key: 'a' }, 'a'), dom.h('li', { key: 'c' }, 'c')])
    dom.patch(null, v1, container)
    const [a, b] = container.childNodes[0].childNodes
    dom.patch(v1, v2, container)
    expect(container.outerHTML).toBe('<DIV><UL><LI>b</LI><LI>a</LI><LI>c</LI></UL></DIV>')
    expect(container.childNodes[0].childNodes.slice(0, 2)).toEqual([b, a]) // 复用了真实节点，只是换了位置
  })
})

describe('零件 7b：字符串渲染器', () => {
  const tree = (h: any) => h('div', { id: 'a', class: 'x&y', hidden: true, disabled: false, onClick: () => 1 }, [
    h('p', null, 'a < b & "c"'),
    h('img', { src: 'x.png' }),
    h('ul', null, [h('li', null, '1'), h('li', null, '2')])
  ])

  it('初始输出和 @vue/server-renderer 的 renderToString 一致', async () => {
    const root = { tag: 'root', props: {}, children: [], parent: null }
    const { render } = mini.createRenderer({ ...mini.stringHost })
    render(tree(mini.h), root)
    const ssr = await renderToString(createSSRApp({ render: () => tree(realH) }))
    expect(root.children.map(mini.serialize).join('')).toBe(ssr)
  })

  it('数据变化后，对象树随之更新（click 事件不输出，false 的属性被移除）', async () => {
    const root = { tag: 'root', props: {}, children: [], parent: null }
    const n = mini.ref(0)
    const app = mini.createRenderer({ ...mini.stringHost }).createApp({
      setup: () => () => mini.h('p', n.value > 0 ? { title: 't' } : null, 'count ' + n.value)
    })
    app.mount(root)
    expect(root.children.map(mini.serialize).join('')).toBe('<p>count 0</p>')
    n.value++
    await mini.nextTick()
    expect(root.children.map(mini.serialize).join('')).toBe('<p title="t">count 1</p>')
    n.value = 0
    await mini.nextTick()
    expect(root.children.map(mini.serialize).join('')).toBe('<p>count 0</p>')
  })
})

describe('零件 8：迷你水合', () => {
  function build(document: any, spec: any[]): FakeNode {
    const root = document.createElement('div') as FakeNode
    const make = (s: any): FakeNode => {
      if (typeof s === 'string') return document.createTextNode(s)
      const el = document.createElement(s.tag) as FakeNode
      ;(s.children || []).forEach((c: any) => el.insertBefore(make(c), null))
      return el
    }
    spec.forEach(s => root.insertBefore(make(s), null))
    return root
  }

  it('复用服务器的节点、补上事件，并报告不匹配', () => {
    const document = makeFakeDocument()
    const dom = loadMiniDom(document, undefined, PARTS.hydrate)
    const root = build(document, [
      { tag: 'div', children: [{ tag: 'p', children: ['old'] }, { tag: 'span', children: ['x'] }, { tag: 'i' }] }
    ])
    const server = root.childNodes[0]
    const p = server.childNodes[0]
    let clicked = 0
    const vnode = dom.h('div', null, [
      dom.h('p', { onClick: () => clicked++ }, [dom.h('b', null, 'new')]), // 服务器是文字，客户端是 b 元素：缺子节点/标签不匹配
      dom.h('b', null, 'x')                                               // 标签不匹配：span ≠ b
    ])
    const mismatches = dom.hydrate(vnode, root)
    expect(root.childNodes[0]).toBe(server)       // 外层 div 复用
    expect(server.childNodes[0]).toBe(p)          // p 复用
    expect(vnode.el).toBe(server)
    p.dispatch('click')
    expect(clicked).toBe(1)
    expect(mismatches).toEqual(expect.arrayContaining(['标签', '多子节点']))
    expect(server.childNodes.length).toBe(2)
  })

  it('一模一样时没有不匹配，也不创建新节点', () => {
    const document = makeFakeDocument()
    const dom = loadMiniDom(document, undefined, PARTS.hydrate)
    const root = build(document, [{ tag: 'ul', children: [{ tag: 'li', children: ['a'] }, { tag: 'li', children: ['b'] }] }])
    const ul = root.childNodes[0]
    const before = [...ul.childNodes]
    const mismatches = dom.hydrate(dom.h('ul', null, [dom.h('li', null, 'a'), dom.h('li', null, 'b')]), root)
    expect(mismatches).toEqual([])
    expect(ul.childNodes).toEqual(before)
  })

  it('文字不一致：报告并改成客户端的文字；缺子节点：补上', () => {
    const document = makeFakeDocument()
    const dom = loadMiniDom(document, undefined, PARTS.hydrate)
    const root = build(document, [{ tag: 'p', children: ['server'] }])
    const mismatches = dom.hydrate(dom.h('p', null, 'client'), root)
    expect(mismatches).toEqual(['文字'])
    expect(root.textContent).toBe('client')
    const root2 = build(document, [{ tag: 'div' }])
    const mm2 = dom.hydrate(dom.h('div', null, [dom.h('p', null, 'a'), 'tail']), root2)
    expect(mm2).toEqual(['缺子节点', '缺子节点'])
    expect(root2.outerHTML).toBe('<DIV><DIV><P>a</P>tail</DIV></DIV>')
  })
})

describe('runMini 的追踪钩子（实验台单步回放用）', () => {
  it('traced 里的函数被包装：脚本内部互相调用也会被记录，带嵌套深度；内部结果不变', () => {
    const events: string[] = []
    const document = makeFakeDocument()
    const dom = runMini<any>(
      PARTS.reactivity + PARTS.scheduler + PARTS.watch + PARTS.vnode + PARTS.host + PARTS.element + PARTS.component + PARTS.componentRender,
      {
        globals: { document },
        traced: ['patch', 'mountElement', 'processText', 'queueJob', 'mountComponent'],
        trace: e => events.push('  '.repeat(e.depth) + e.fn)
      }
    )
    const container = document.createElement('div')
    dom.createApp({ setup: () => () => dom.h('p', null, ['hi']) }).mount(container)
    expect(container.outerHTML).toBe('<DIV><P>hi</P></DIV>')
    expect(events).toEqual([
      'patch', '  mountComponent', '    patch', '      mountElement', '        patch', '          processText'
    ].map(s => s))
  })

  it('用自己的 Promise 换掉微任务：队列只在手动 flush 时运行（单步回放）', () => {
    const callbacks: Array<() => void> = []
    const FakePromise = { resolve: () => ({ then: (fn: () => void) => { callbacks.push(fn); return {} } }) }
    const s = runMini<any>(PARTS.reactivity + PARTS.scheduler, { globals: { Promise: FakePromise } })
    const log: string[] = []
    const job: any = () => log.push('job'); job.id = 1
    s.queueJob(job)
    s.queueJob(job)
    expect(log).toEqual([])
    expect(callbacks.length).toBe(1)
    callbacks[0]()                // 手动 flush
    expect(log).toEqual(['job'])
  })
})

describe('第 32 章：同一份渲染器本体，两套 options', () => {
  it('DOM options（{ ...nodeOps, patchProp }）和 DOM 形态的结果一样', async () => {
    const document = makeFakeDocument()
    const m = loadMiniRenderer(document) as any
    const container = document.createElement('div') as FakeNode
    const n = m.ref(0)
    const { createApp } = m.createRenderer({ ...m.nodeOps, patchProp: m.patchProp })
    createApp({ setup: () => () => m.h('p', { id: 'x', onClick: () => n.value++ }, 'n = ' + n.value) }).mount(container)
    expect(container.outerHTML).toBe('<DIV><P id="x">n = 0</P></DIV>')
    container.childNodes[0].dispatch('click')
    await m.nextTick()
    expect(container.outerHTML).toBe('<DIV><P id="x">n = 1</P></DIV>')
  })

  it('字符串 options：同一棵组件树渲染到对象树，不碰 document', async () => {
    const m = loadMiniRenderer() as any // 没有 document：任何 DOM 调用都会抛错
    const root = { tag: 'root', props: {}, children: [], parent: null }
    m.createRenderer(m.stringHost).createApp({ setup: () => () => m.h('ul', null, [m.h('li', { key: 1 }, 'a'), m.h('li', { key: 2 }, 'b')]) }).mount(root)
    expect(root.children.map(m.serialize).join('')).toBe('<ul><li>a</li><li>b</li></ul>')
  })
})

describe('追踪：宿主函数和实例', () => {
  it('hostInsert 等宿主函数是 function 声明，可以被 traced 追踪；traceReturn 能拿到 createComponentInstance 的返回值', () => {
    const document = makeFakeDocument()
    const ops: string[] = []
    const instances: any[] = []
    const dom = runMini<any>(
      PARTS.reactivity + PARTS.scheduler + PARTS.watch + PARTS.vnode + PARTS.host + PARTS.element + PARTS.component + PARTS.componentRender,
      {
        globals: { document },
        traced: ['hostInsert', 'hostCreateElement', 'createComponentInstance'],
        trace: e => ops.push(e.fn),
        traceReturn: (e, r) => e.fn === 'createComponentInstance' && instances.push(r)
      }
    )
    dom.createApp({ setup: () => () => dom.h('p', null, 'x') }).mount(document.createElement('div'))
    expect(ops).toEqual(['createComponentInstance', 'hostCreateElement', 'hostInsert'])
    expect(instances.length).toBe(1)
    expect(instances[0].uid).toBeGreaterThanOrEqual(0)
  })
})
