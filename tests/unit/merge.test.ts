import { describe, expect, it } from 'vitest'
import { EX_KEYS, canon, changedChapters, mergeProgress, sameProgress } from '../../course/engine/logic/merge.ts'
import { STAMP_EX, fingerprints, stamp } from '../../course/engine/logic/stamp.ts'

const m = mergeProgress

/* ---------- 随机进度生成器（固定种子，可重复） ---------- */
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function genProgress(r: () => number): any {
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)]
  const chance = (p: number) => r() < p
  const T = () => pick([undefined, 0, 1000, 2000, 3000])
  const p: any = {}
  for (const id of ['a', 'b', 'c']) {
    if (!chance(0.7)) continue
    const c: any = { sc: {}, ex: {}, done: chance(0.3) }
    for (const q of [0, 1, 2]) if (chance(0.5)) c.sc[q] = pick([0, 1, 2])
    if (chance(0.5)) c.tried = { 0: true, ...(chance(0.5) ? { 1: true } : {}) }
    if (chance(0.5)) c.first = { 0: chance(0.5), ...(chance(0.5) ? { 1: chance(0.5) } : {}) }
    if (chance(0.4)) c.doneAt = pick([100, 200, 300])
    for (const e of ['x1', 'x2'])
      if (chance(0.5)) {
        const x: any = { passed: chance(0.5) }
        if (chance(0.5)) {
          x.code = pick([{ tpl: 'a', js: 'b' }, { tpl: 'a2', js: 'b' }, { tpl: '', js: 'zz' }])
          x.fails = pick([0, 1, 2, 3])
          if (chance(0.5)) x.firstFail = pick([5, 6])
          if (chance(0.5)) x.lastFail = pick([{ tpl: 'p', js: 'q' }, { tpl: 'p', js: 'r' }])
          if (chance(0.5)) x.sawSol = chance(0.5)
          if (chance(0.3)) x.rewrite = chance(0.5)
          if (chance(0.3)) x.stash = pick([{ tpl: 's', js: 't' }, { tpl: 's2', js: 't' }])
        }
        if (chance(0.4)) x.help = pick([false, 'rewrite', 'solution'])
        if (chance(0.4)) x.t = T()
        if (chance(0.1)) x.extra = pick([1, { k: pick([1, 2]) }])
        c.ex[e] = x
      }
    if (chance(0.5)) c.note = pick(['', '好', '好的笔记', '另一个想法', '好的笔记。续写'])
    if (chance(0.3)) c.noteAlts = [pick(['老版本', '旧稿'])]
    if (chance(0.3)) c.sx = chance(0.5)
    if (chance(0.4)) c.ts = { note: T() }
    if (chance(0.15)) c.future = pick([1, 'x', { k: pick([1, 2]) }])
    p[id] = c
  }
  if (chance(0.7)) {
    p.__srs = {}
    for (const k of ['a#0', 'a#1', 'b#c0']) if (chance(0.5)) p.__srs[k] = { box: pick([0, 1, 2, 3]), n: pick([1, 2, 3]), due: pick([5, 9, 12]), last: pick([1, 2, 3, 4]) }
  }
  if (chance(0.6)) {
    p.__stage = {}
    for (const k of ['1', '2'])
      if (chance(0.5))
        p.__stage[k] = {
          best: pick([50, 80, 100]),
          last: pick([50, 90]),
          passed: chance(0.5),
          ...(chance(0.5) ? { passedAt: pick([100, 200, 300]) } : {}),
          ...(chance(0.5) ? { failedAt: pick([100, 200, 300]) } : {}),
          ...(chance(0.3) ? { t: T() } : {}),
          ...(chance(0.3) ? { weak: [pick(['a', 'b'])] } : {}),
          ...(chance(0.2) ? { pending: { n: 12, answered: 3, right: 2, at: pick([150, 250]), weak: [] } } : {})
        }
  }
  if (chance(0.5)) p.__pred = { lab1: { pick: pick([0, 1, 2]), ...(chance(0.5) ? { checked: chance(0.7) } : {}) }, ...(chance(0.5) ? { lab2: { pick: pick([0, 1]) } } : {}) }
  if (chance(0.6)) p.__last = { path: pick(['/chapters/01-first', '/chapters/02-template']), anchor: pick(['', 'a']), h: pick(['', '标题']), t: pick([10, 20, 30]) }
  if (chance(0.1)) p.__future = { n: pick([1, 2]) }
  return p
}

const ctx = { scAnswers: (id: string) => (id === 'a' ? [1, 1, 1] : undefined) }

describe('mergeProgress：性质（随机进度）', () => {
  const r = rng(20261009)
  const samples = Array.from({ length: 600 }, () => [genProgress(r), genProgress(r), genProgress(r)])

  it('幂等 merge(a, a) = a', () => {
    for (const [a] of samples) expect(canon(m(a, a, ctx))).toBe(canon(a))
  })
  it('可交换 merge(a, b) = merge(b, a)', () => {
    for (const [a, b] of samples) expect(canon(m(a, b, ctx))).toBe(canon(m(b, a, ctx)))
  })
  it('可结合 merge(merge(a, b), c) = merge(a, merge(b, c))', () => {
    for (const [a, b, c] of samples) expect(canon(m(m(a, b, ctx), c, ctx))).toBe(canon(m(a, m(b, c, ctx), ctx)))
  })
  it('合并后再和任何一边合并，结果不变（合并结果包含两边）', () => {
    for (const [a, b] of samples) {
      const x = m(a, b, ctx)
      expect(canon(m(x, a, ctx))).toBe(canon(x))
      expect(canon(m(x, b, ctx))).toBe(canon(x))
    }
  })
  it('不改参数', () => {
    for (const [a, b] of samples.slice(0, 100)) {
      const ca = canon(a)
      const cb = canon(b)
      m(a, b, ctx)
      expect(canon(a)).toBe(ca)
      expect(canon(b)).toBe(cb)
    }
  })
  it('任何一边已完成的章、已通过的练习、自测答案、复习卡片、预测、阶段、阅读位置，合并后都还在', () => {
    for (const [a, b] of samples) {
      const x: any = m(a, b, ctx)
      for (const side of [a, b]) {
        for (const id of ['a', 'b', 'c']) {
          const c = side[id]
          if (!c) continue
          if (c.done) expect(x[id].done).toBe(true)
          if (c.sx) expect(x[id].sx).toBe(true)
          for (const [e, ex] of Object.entries<any>(c.ex || {})) if (ex.passed) expect(x[id].ex[e].passed).toBe(true)
          for (const k of Object.keys(c.sc || {})) expect(x[id].sc[k]).not.toBeUndefined()
          for (const k of Object.keys(c.tried || {})) expect(x[id].tried[k]).toBe(true)
          if (c.note) expect([x[id].note, ...(x[id].noteAlts || [])]).toContain(c.note)
        }
        for (const k of Object.keys(side.__srs || {})) expect(x.__srs[k]).toBeTruthy()
        for (const k of Object.keys(side.__pred || {})) expect(x.__pred[k]).toBeTruthy()
        for (const k of Object.keys(side.__stage || {})) expect(x.__stage[k]).toBeTruthy()
        if (side.__last) expect(x.__last).toBeTruthy()
      }
    }
  })
})

describe('mergeProgress：逐字段规则', () => {
  it('章完成取“或”，doneAt 取较早的', () => {
    const x: any = m({ a: { sc: {}, ex: {}, done: false } }, { a: { sc: {}, ex: {}, done: true, doneAt: 500 } })
    expect(x.a.done).toBe(true)
    expect(x.a.doneAt).toBe(500)
    const y: any = m({ a: { done: true, doneAt: 900 } }, { a: { done: true, doneAt: 500 } })
    expect(y.a.doneAt).toBe(500)
  })
  it('章只在一边有时原样保留', () => {
    const x: any = m({ a: { sc: { 0: 1 }, ex: {}, done: false } }, { b: { sc: {}, ex: {}, done: true } })
    expect(Object.keys(x).sort()).toEqual(['a', 'b'])
    expect(x.a.sc).toEqual({ 0: 1 })
  })
  it('练习通过取“或”，每道练习独立', () => {
    const x: any = m({ a: { ex: { e1: { passed: true } } } }, { a: { ex: { e2: { passed: true }, e1: { passed: false, code: { tpl: 'c', js: 'd' } } } } })
    expect(x.a.ex.e1.passed).toBe(true)
    expect(x.a.ex.e2.passed).toBe(true)
  })
  it('借助答案的标记（help）跟着通过的那一边：只有一边通过就取它', () => {
    const x: any = m({ a: { ex: { e: { passed: true, help: 'solution' } } } }, { a: { ex: { e: { passed: false, fails: 5, code: { tpl: 'z', js: 'z' } } } } })
    expect(x.a.ex.e.help).toBe('solution')
    expect(x.a.ex.e.passed).toBe(true)
  })
  it('两边各自通过：help 取最轻的（有一边没借助就算没借助）', () => {
    const h = (p: any, q: any) => (m({ a: { ex: { e: p } } }, { a: { ex: { e: q } } }) as any).a.ex.e.help
    expect(h({ passed: true, help: 'solution' }, { passed: true, help: false })).toBe(false)
    expect(h({ passed: true, help: 'solution' }, { passed: true, help: 'rewrite' })).toBe('rewrite')
    expect(h({ passed: true }, { passed: true, help: 'solution' })).toBeUndefined()
  })

  describe('章内自测按题合并', () => {
    it('同一题两边答案不同，给了正确答案就取正确的', () => {
      const x: any = m({ a: { sc: { 0: 0, 1: 2 } } }, { a: { sc: { 0: 1, 2: 0 } } }, ctx)
      expect(x.a.sc).toEqual({ 0: 1, 1: 2, 2: 0 })
    })
    it('没有正确答案信息时取较大下标（确定即可）', () => {
      expect((m({ a: { sc: { 0: 0 } } }, { a: { sc: { 0: 2 } } }) as any).a.sc[0]).toBe(2)
    })
    it('tried 取并，first 取“与”（一边首答错就算错）', () => {
      const x: any = m({ a: { tried: { 0: true }, first: { 0: true, 1: true } } }, { a: { tried: { 1: true }, first: { 0: false } } })
      expect(x.a.tried).toEqual({ 0: true, 1: true })
      expect(x.a.first).toEqual({ 0: false, 1: true })
    })
  })

  describe('练习草稿与提示阶梯：整组取更新的一边', () => {
    const A = { passed: false, code: { tpl: 'A', js: 'A' }, fails: 1, firstFail: 1, lastFail: { tpl: 'a', js: 'a' }, t: 2000 }
    const B = { passed: false, code: { tpl: 'B', js: 'B' }, fails: 3, firstFail: 9, lastFail: { tpl: 'b', js: 'b' }, sawSol: true, stash: { tpl: 's', js: 's' }, t: 1000 }
    it('有时间戳取时间新的，不混拼', () => {
      const x: any = m({ a: { ex: { e: A } } }, { a: { ex: { e: B } } })
      expect(x.a.ex.e.code.tpl).toBe('A')
      expect(x.a.ex.e.fails).toBe(1)
      expect(x.a.ex.e.firstFail).toBe(1)
      expect(x.a.ex.e.sawSol).toBeUndefined()
      expect(x.a.ex.e.stash).toBeUndefined()
      expect(x.a.ex.e.t).toBe(2000)
    })
    it('没有时间戳取进度更靠后的（失败次数多的）', () => {
      const { t: _1, ...a } = A
      const { t: _2, ...b } = B
      const x: any = m({ a: { ex: { e: a } } }, { a: { ex: { e: b } } })
      expect(x.a.ex.e.code.tpl).toBe('B')
      expect(x.a.ex.e.fails).toBe(3)
    })
    it('带时间戳的比没有时间戳的旧数据更新', () => {
      const { t: _2, ...b } = B
      expect((m({ a: { ex: { e: A } } }, { a: { ex: { e: b } } }) as any).a.ex.e.code.tpl).toBe('A')
    })
    it('只改了自测的一边不会把另一边的代码草稿冲掉', () => {
      const x: any = m({ a: { sc: { 0: 1 } } }, { a: { ex: { e: { passed: false, code: { tpl: 'd', js: 'd' }, fails: 1, t: 5 } } } })
      expect(x.a.ex.e.code.tpl).toBe('d')
      expect(x.a.sc[0]).toBe(1)
    })
    it('没有草稿字段的一边（只有 passed）不和另一边的草稿竞争', () => {
      const x: any = m({ a: { ex: { e: { passed: true, t: 9999 } } } }, { a: { ex: { e: { passed: false, code: { tpl: 'd', js: 'd' }, fails: 1, t: 5 } } } })
      expect(x.a.ex.e.code.tpl).toBe('d')
      expect(x.a.ex.e.passed).toBe(true)
    })
    it('练习记录里不认识的字段保留', () => {
      expect((m({ a: { ex: { e: { passed: true, future: 1 } } } }, { a: { ex: { e: { passed: false } } } }) as any).a.ex.e.future).toBe(1)
    })
  })

  describe('自我解释笔记', () => {
    it('取更新的一边，另一份保存在 noteAlts，不丢', () => {
      const x: any = m({ a: { note: '旧', ts: { note: 1 } } }, { a: { note: '新的想法', ts: { note: 2 } } })
      expect(x.a.note).toBe('新的想法')
      expect(x.a.noteAlts).toEqual(['旧'])
      expect(x.a.ts.note).toBe(2)
    })
    it('没有时间戳取更长的', () => {
      const x: any = m({ a: { note: '短' } }, { a: { note: '更长的一份' } })
      expect(x.a.note).toBe('更长的一份')
      expect(x.a.noteAlts).toEqual(['短'])
    })
    it('两边相同不产生 noteAlts；空笔记不进 noteAlts', () => {
      expect((m({ a: { note: '同' } }, { a: { note: '同' } }) as any).a.noteAlts).toBeUndefined()
      expect((m({ a: { note: '' } }, { a: { note: '有' } }) as any).a.noteAlts).toBeUndefined()
    })
    it('再次合并不重复累积', () => {
      const x = m({ a: { note: '旧', ts: { note: 1 } } }, { a: { note: '新的想法', ts: { note: 2 } } })
      expect(canon(m(x, x))).toBe(canon(x))
      expect(canon(m(x, { a: { note: '旧', ts: { note: 1 } } }))).toBe(canon(x))
    })
    it('对照要点（sx）取“或”', () => {
      expect((m({ a: { sx: true } }, { a: { sx: false } }) as any).a.sx).toBe(true)
    })
  })

  describe('间隔复习卡片', () => {
    it('同一张卡整条取最近复习（last）更晚的，不混拼', () => {
      const A = { box: 3, n: 5, due: 900, last: 100 }
      const B = { box: 1, n: 2, due: 50, last: 200 }
      const x: any = m({ __srs: { 'a#0': A } }, { __srs: { 'a#0': B } })
      expect(x.__srs['a#0']).toEqual(B)
    })
    it('只在一边存在的卡片保留，数量是并集（含专用题键 章id#cN）', () => {
      const x: any = m({ __srs: { 'a#0': { box: 1, n: 1, due: 1, last: 1 } } }, { __srs: { 'a#c1': { box: 2, n: 1, due: 1, last: 1 } } })
      expect(Object.keys(x.__srs).sort()).toEqual(['a#0', 'a#c1'])
    })
    it('last 相同按答题次数多的', () => {
      const x: any = m({ __srs: { k: { box: 1, n: 1, due: 1, last: 5 } } }, { __srs: { k: { box: 2, n: 3, due: 2, last: 5 } } })
      expect(x.__srs.k.n).toBe(3)
    })
  })

  describe('阶段测验', () => {
    it('按阶段取最近一次作答的整条记录，best 取最大', () => {
      const A = { best: 100, last: 100, passed: true, passedAt: 100 }
      const B = { best: 60, last: 60, passed: false, failedAt: 500, weak: ['a'] }
      const x: any = m({ __stage: { 1: A } }, { __stage: { 1: B } })
      expect(x.__stage[1]).toEqual({ ...B, best: 100 })
    })
    it('答到一半离开（pending）也按其时间算', () => {
      const A = { passed: true, passedAt: 100, best: 90, last: 90 }
      const B = { pending: { n: 12, answered: 3, right: 2, at: 400, weak: [] } }
      expect((m({ __stage: { 1: A } }, { __stage: { 1: B } }) as any).__stage[1].pending).toBeTruthy()
    })
    it('不同阶段各自保留', () => {
      expect(Object.keys((m({ __stage: { 1: { best: 1 } } }, { __stage: { 2: { best: 2 } } }) as any).__stage)).toEqual(['1', '2'])
    })
  })

  describe('先猜（__pred）', () => {
    it('按实验台取并集', () => {
      expect((m({ __pred: { a: { pick: 1 } } }, { __pred: { b: { pick: 0 } } }) as any).__pred).toEqual({ a: { pick: 1 }, b: { pick: 0 } })
    })
    it('点过“核对”的优先于没核对的', () => {
      const x: any = m({ __pred: { a: { pick: 2 } } }, { __pred: { a: { pick: 0, checked: true } } })
      expect(x.__pred.a).toEqual({ pick: 0, checked: true })
    })
    it('都没核对或都核对过，取选项序号较大的（确定即可）', () => {
      expect((m({ __pred: { a: { pick: 1 } } }, { __pred: { a: { pick: 2 } } }) as any).__pred.a.pick).toBe(2)
    })
  })

  describe('阅读位置（__last）', () => {
    it('取 t 更晚的整条，不混拼', () => {
      const A = { path: '/chapters/01-first', anchor: 'x', h: '甲', t: 10 }
      const B = { path: '/chapters/02-template', anchor: '', h: '', t: 20 }
      expect((m({ __last: A }, { __last: B }) as any).__last).toEqual(B)
      expect((m({ __last: B }, { __last: A }) as any).__last).toEqual(B)
    })
    it('只在一边有就取它', () => {
      const A = { path: '/p', anchor: '', h: '', t: 1 }
      expect((m({ __last: A }, {}) as any).__last).toEqual(A)
    })
  })

  describe('兼容', () => {
    it('旧数据（没有任何同步字段）合并不报错，结果不凭空多出字段', () => {
      const old = { a: { sc: { 0: 1 }, ex: { e: { passed: true } }, done: false } }
      expect(canon(m(old, old))).toBe(canon(old))
      expect(() => m(old, {})).not.toThrow()
      expect(() => m({}, {})).not.toThrow()
    })
    it('未知字段原样保留（章里、顶层都是）', () => {
      const x: any = m({ a: { sc: {}, future: { k: 1 } }, __newThing: { z: 1 } }, { a: { sc: {}, other: 7 }, __newThing: { y: 2 } })
      expect(x.a.future).toEqual({ k: 1 })
      expect(x.a.other).toBe(7)
      expect(x.__newThing).toEqual({ z: 1, y: 2 })
    })
    it('坏数据不崩：非对象的章、null、数组', () => {
      expect(() => m({ a: 5, b: null, __srs: [], __stage: 'x', __pred: 3, __last: 'y' }, { a: { sc: {} }, b: 3, __srs: { k: 1 }, __last: { t: 1 } })).not.toThrow()
      expect(() => m({ a: { sc: null, ex: 3, tried: [] } }, { a: { sc: { 0: 1 }, ex: { e: 1 } } })).not.toThrow()
      expect(() => m(null, undefined)).not.toThrow()
      expect(m(null, { a: { sc: {} } })).toEqual({ a: { sc: {} } })
    })
  })
})

describe('changedChapters / sameProgress', () => {
  it('只列有差别的章，不含 __ 键', () => {
    expect(changedChapters({ a: { x: 1 }, b: { y: 1 }, __srs: {} }, { a: { x: 1 }, b: { y: 2 }, c: {}, __srs: { k: 1 } }).sort()).toEqual(['b', 'c'])
  })
  it('键顺序不影响相同判断', () => {
    expect(sameProgress({ a: 1, b: { c: 1, d: 2 } }, { b: { d: 2, c: 1 }, a: 1 })).toBe(true)
  })
})

describe('stamp：改动时间戳', () => {
  it('变了的组才盖章，没变的不动；旧数据加载时不盖章', () => {
    const p: any = { a: { sc: {}, ex: { e1: { passed: false, code: { tpl: 'x', js: 'y' }, fails: 1 } }, done: false }, __stage: { 1: { best: 80 } } }
    const snap = fingerprints(p)
    expect(stamp(p, snap, 1000)).toBe(false)
    expect(p.a.ts).toBeUndefined()
    expect(p.a.ex.e1.t).toBeUndefined()
    p.a.ex.e1.code.tpl = 'xy'
    p.a.note = '想法'
    p.a.ex.e2 = { passed: false, fails: 1 }
    p.__stage[1].last = 50
    expect(stamp(p, snap, 2000)).toBe(true)
    expect(p.a.ex.e1.t).toBe(2000)
    expect(p.a.ex.e2.t).toBe(2000)
    expect(p.a.ts).toEqual({ note: 2000 })
    expect(p.__stage[1].t).toBe(2000)
    // 再保存一次内容没变：时间戳不动
    expect(stamp(p, snap, 3000)).toBe(false)
    expect(p.a.ex.e1.t).toBe(2000)
    // 只改自测和完成状态不影响练习草稿的时间戳
    p.a.sc[0] = 1
    p.a.done = true
    p.a.ex.e1.passed = true
    expect(stamp(p, snap, 4000)).toBe(false)
    expect(p.a.ex.e1.t).toBe(2000)
  })
  it('盖章不改变学习进度的任何现有字段', () => {
    const p: any = { a: { sc: { 0: 1 }, ex: { e: { passed: true, code: { tpl: 'c', js: 'd' }, fails: 2, firstFail: 5, lastFail: { tpl: 'l', js: 'm' }, sawSol: true, help: 'solution' } }, done: true, note: 'n' } }
    const before = JSON.parse(JSON.stringify(p))
    stamp(p, {}, 99)
    const { t, ...exRest } = p.a.ex.e
    expect(exRest).toEqual(before.a.ex.e)
    expect(t).toBe(99)
    const { ts, ex: _ex, ...rest } = p.a
    const { ex: _bex, ...brest } = before.a
    expect(rest).toEqual(brest)
    expect(ts).toEqual({ note: 99 })
  })
  it('阅读位置、复习卡片、先猜不盖章（它们自带时间或不需要）', () => {
    const p: any = { __last: { path: '/p', anchor: '', h: '', t: 5 }, __srs: { k: { box: 1, n: 1, due: 1, last: 1 } }, __pred: { a: { pick: 1 } } }
    expect(stamp(p, {}, 99)).toBe(false)
    expect(p.__last.t).toBe(5)
  })
})

describe('stamp 和 merge 的字段表', () => {
  it('练习的草稿与阶梯字段一致（stamp.ts 在主包里，不能直接 import merge.ts）', () => {
    expect([...STAMP_EX]).toEqual([...EX_KEYS])
  })
})
