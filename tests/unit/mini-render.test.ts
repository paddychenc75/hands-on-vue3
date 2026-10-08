// 迷你 Vue 的渲染器与真实 Vue 对照：同一段使用代码，分别跑在迷你版和真实的 @vue/runtime-core 上，
// 宿主用同一个会记录操作的 options，比较两边的 DOM 操作序列、最终结构和钩子顺序。
import { describe, expect, it } from 'vitest'
import { loadMiniRenderer, realApi, run, same, type Api } from './mini-helpers'

const mini = loadMiniRenderer() as unknown as Api

describe('元素：挂载、更新、卸载', () => {
  it('挂载嵌套元素：操作序列一致（子树和属性先于插入）', async () => {
    const r = await same(({ api: { h }, render, host }) => {
      render(h('div', { id: 'a', class: 'box' }, [h('p', null, 'hi'), 'text', h('span', { title: 't' }, [h('b', null, '1')])]), host.root)
    })
    expect(r.html).toBe('<root><div><p>hi</p>text<span><b>1</b></span></div></root>')
  })

  it('更新：文字、属性的增删改、子节点形态切换', async () => {
    await same(({ api: { h }, render, host }) => {
      render(h('div', { a: 1, b: 2, c: 3 }, 'one'), host.root)
      render(h('div', { a: 1, b: 20, d: 4 }, 'two'), host.root) // 文字 → 文字，改 b、删 c、增 d
      render(h('div', { a: 1 }, [h('i', null, 'x'), h('i', null, 'y')]), host.root) // 文字 → 数组
      render(h('div', { a: 1 }, [h('i', null, 'x')]), host.root) // 数组缩短
      render(h('div', { a: 1 }, 'back'), host.root) // 数组 → 文字
      render(h('div', { a: 1 }), host.root) // 文字 → 空
      render(null, host.root) // 卸载
    })
  })

  it('类型不同：旧节点卸载，新节点挂在旧节点原来的位置', async () => {
    await same(({ api: { h }, render, host }) => {
      render(h('div', null, [h('a', null, '1'), h('b', null, '2'), h('c', null, '3')]), host.root)
      render(h('div', null, [h('a', null, '1'), h('i', null, '2'), h('c', null, '3')]), host.root)
    })
  })

  it('文本 vnode：更新只改内容', async () => {
    await same(({ api: { h }, render, host }) => {
      render(h('p', null, ['a', 'b']), host.root)
      render(h('p', null, ['a', 'c']), host.root)
    })
  })

  it('事件：换处理函数时 prev、next 都传给 patchProp', async () => {
    await same(({ api: { h }, render, host }) => {
      render(h('button', { onClick: () => 1 }, 'x'), host.root)
      render(h('button', { onClick: () => 2 }, 'x'), host.root)
    })
  })
})

describe('子节点 diff：与真实 Vue 的操作序列逐条一致', () => {
  const li = (h: any, k: string | number) => h('li', { key: k }, String(k))
  const list = (h: any, keys: (string | number)[]) => h('ul', null, keys.map(k => li(h, k)))

  const cases: [string, string[], string[]][] = [
    ['头部插入', ['a', 'b', 'c'], ['x', 'a', 'b', 'c']],
    ['尾部追加', ['a', 'b'], ['a', 'b', 'c', 'd']],
    ['中间插入', ['a', 'b', 'c'], ['a', 'x', 'b', 'c']],
    ['头部删除', ['a', 'b', 'c'], ['b', 'c']],
    ['尾部删除', ['a', 'b', 'c'], ['a', 'b']],
    ['中间删除', ['a', 'b', 'c', 'd'], ['a', 'd']],
    ['全部替换', ['a', 'b'], ['x', 'y']],
    ['反转', ['a', 'b', 'c', 'd', 'e'], ['e', 'd', 'c', 'b', 'a']],
    ['首尾互换', ['a', 'b', 'c', 'd'], ['d', 'b', 'c', 'a']],
    ['第 5 步经典例子（有移动、新增、删除）', ['a', 'b', 'c', 'd', 'e', 'f', 'g'], ['a', 'b', 'e', 'c', 'd', 'h', 'f', 'g']],
    ['清空', ['a', 'b', 'c'], []],
    ['从空开始', [], ['a', 'b', 'c']]
  ]
  for (const [name, from, to] of cases) {
    it(name, async () => {
      const r = await same(({ api: { h }, render, host }) => {
        render(list(h, from), host.root)
        render(list(h, to), host.root)
      })
      expect(r.html).toBe('<root><ul>' + to.map(k => '<li>' + k + '</li>').join('') + '</ul></root>')
    })
  }

  it('随机洗牌、增删：200 组随机列表，操作序列都一致', async () => {
    let seed = 42
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
    const pool = 'abcdefghijkl'.split('')
    const pick = () => pool.filter(() => rnd() < 0.6).sort(() => rnd() - 0.5)
    for (let n = 0; n < 200; n++) {
      const from = pick()
      const to = pick()
      const use = ({ api: { h }, render, host }: any) => { render(list(h, from), host.root); render(list(h, to), host.root) }
      const a = await run(mini, use)
      const b = await run(realApi, use)
      expect(a.ops, from.join('') + ' → ' + to.join('')).toEqual(b.ops)
    }
  })

  it('移动的是节点本身：复用 el，不重新创建', async () => {
    let mark = 0
    const r = await run(mini, ({ api: { h }, render, host }) => {
      render(list(h, ['a', 'b', 'c']), host.root)
      mark = host.ops.length
      render(list(h, ['c', 'a', 'b']), host.root)
    })
    const second = r.ops.slice(mark)
    expect(second.filter(o => o.startsWith('create'))).toEqual([])
    expect(second.filter(o => o.startsWith('insert')).length).toBe(1) // 只有 c 移动了
  })

  it('无 key 的同类型列表：按下标更新，多的卸载、少的挂载（和真实 Vue 一致）', async () => {
    const plain = (h: any, n: number) => h('ul', null, Array.from({ length: n }, (_, i) => h('li', null, 'item' + i + 'n' + n)))
    await same(({ api: { h }, render, host }) => {
      render(plain(h, 3), host.root)
      render(plain(h, 5), host.root)
      render(plain(h, 2), host.root)
    })
  })

  it('一部分有 key、一部分没有（走第 5 步里无 key 节点的配对）', async () => {
    await same(({ api: { h }, render, host }) => {
      render(h('div', null, [h('p', { key: 1 }, 'a'), h('i', null, 'b'), h('p', { key: 2 }, 'c')]), host.root)
      render(h('div', null, [h('p', { key: 2 }, 'c'), h('i', null, 'b'), h('p', { key: 1 }, 'a')]), host.root)
    })
  })
})
