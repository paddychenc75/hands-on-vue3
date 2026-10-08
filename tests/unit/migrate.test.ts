import { describe, expect, it } from 'vitest'
import { hasLegacy, migrateLegacy, type LegacyValues, type MigrationContext } from '../../course/engine/logic/migrate.ts'

const ctx: MigrationContext = {
  chapters: [
    { id: 'refs', scAnswers: [1, 0, 2], exercises: ['refsFill', 'fixReactive'] },
    { id: 'computed', scAnswers: [3], exercises: ['calc'] },
    { id: 'cheat', scAnswers: [], exercises: [] }
  ]
}

// 一份典型的旧进度（键名已去掉 vue3deep: 前缀，值已按 JSON 解析）
const old: LegacyValues = {
  done: { refs: true },
  doneAt: { refs: 1_700_000_000_000 },
  sc: { 'refs:0': 1, 'refs:1': 3, 'refs:2': 2, 'computed:0': 0, 'p:demo-refs': 2 },
  guess: { 'p:demo-refs': 0, 'p:demo-computed': 1 },
  ex: { refsFill: true, fixReactive: 'sol' },
  exSol: { fixReactive: true, calc: true },
  'ex:refsFill': { tpl: '<p>T</p>', js: 'const x = 1' },
  'ex:calc': { tpl: '<p>C</p>', js: 'return {}' },
  last: { path: '/chapters/03-refs', anchor: 'toRefs', h: 'toRefs', t: 1_700_000_001_000 },
  // 下面这些不迁
  revAt: { refs: { t: 1, n: 2 } },
  revLast: ['a', 'b'],
  quiz3: { 0: 0, 1: 2 }
}

describe('旧进度迁移（纯函数）', () => {
  const out = migrateLegacy(old, ctx)

  it('已完成的章：done 和 doneAt', () => {
    expect(out.refs.done).toBe(true)
    expect(out.refs.doneAt).toBe(1_700_000_000_000)
    expect(out.computed?.done ?? false).toBe(false)
  })

  it('章内自测：只把答对的记为已答对，答错的不迁', () => {
    expect(out.refs.sc).toEqual({ 0: 1, 2: 2 }) // refs:1 答的是 3，正确答案是 0，不迁
    expect(out.computed.sc).toEqual({}) // computed:0 答的是 0，正确答案是 3，不迁
  })

  it('已通过的练习：区分是否看过答案', () => {
    expect(out.refs.ex.refsFill).toMatchObject({ passed: true, help: false })
    expect(out.refs.ex.refsFill.sawSol).toBeUndefined()
    expect(out.refs.ex.fixReactive).toMatchObject({ passed: true, sawSol: true, help: 'solution' })
  })

  it('看过答案但没通过的练习：记 sawSol，passed 为 false', () => {
    expect(out.computed.ex.calc).toMatchObject({ passed: false, sawSol: true })
  })

  it('练习草稿：迁成 code（两段）', () => {
    expect(out.refs.ex.refsFill.code).toEqual({ tpl: '<p>T</p>', js: 'const x = 1' })
    expect(out.computed.ex.calc.code).toEqual({ tpl: '<p>C</p>', js: 'return {}' })
  })

  it('没有任何记录的练习不生成条目', () => {
    expect(Object.keys(out.refs.ex).sort()).toEqual(['fixReactive', 'refsFill'])
  })

  it('"先猜"：sc 里的 p: 是已核对的，guess 里还没核对的是待核对；已核对的以 sc 为准', () => {
    expect(out.__pred).toEqual({ 'demo-refs': { pick: 2, checked: true }, 'demo-computed': { pick: 1 } })
  })

  it('"先猜"不进复习卡片', () => {
    expect(out.__srs).toBeUndefined()
  })

  it('上次阅读位置', () => {
    expect(out.__last).toEqual({ path: '/chapters/03-refs', anchor: 'toRefs', h: 'toRefs', t: 1_700_000_001_000 })
  })

  it('旧的复习记录（revAt、revLast）和综合测验记录（quiz3）不迁：新进度里没有复习卡片和阶段测验记录', () => {
    expect(out.__srs).toBeUndefined()
    expect(out.__stage).toBeUndefined()
    expect(JSON.stringify(out)).not.toContain('quiz3')
    expect(JSON.stringify(out)).not.toContain('revAt')
  })

  it('速查表这类没有自测和练习的页面：没有进度条目', () => {
    expect(out.cheat).toBeUndefined()
  })

  it('不改传入的旧值', () => {
    const copy = JSON.parse(JSON.stringify(old))
    migrateLegacy(old, ctx)
    expect(old).toEqual(copy)
  })

  it('输入是空对象或脏数据：返回空进度，不抛错', () => {
    expect(migrateLegacy({}, ctx)).toEqual({})
    expect(migrateLegacy({ done: [], sc: 'x', ex: null, last: 5, guess: { 'p:a': 'x' } }, ctx)).toEqual({})
    expect(migrateLegacy({ 'ex:refsFill': { tpl: 1 } }, ctx)).toEqual({})
  })

  it('旧的 ex 里有 ctx 不认识的练习 id（课程里已经没有）：忽略', () => {
    expect(migrateLegacy({ ex: { ghost: true } }, ctx)).toEqual({})
  })
})

describe('hasLegacy：有没有值得迁的旧进度', () => {
  it('有任何一个相关的旧键（含练习草稿）就算有', () => {
    expect(hasLegacy({ done: {} })).toBe(true)
    expect(hasLegacy({ 'ex:refsFill': {} })).toBe(true)
  })
  it('只有不迁的键（revAt、quiz3 等）或空：没有', () => {
    expect(hasLegacy({})).toBe(false)
    expect(hasLegacy({ revAt: {}, quiz3: {}, revLast: [] })).toBe(false)
  })
})
