import { describe, expect, it } from 'vitest'
import {
  completionNeeds,
  exMissing,
  helpedExercises,
  meetsCompletion,
  scMissing,
  shouldAutoComplete,
  takesPart,
  tallyProgress
} from '../../course/engine/logic/completion.ts'
import type { ChapterProgress, ChapterSpec } from '../../course/engine/types.ts'

const spec: ChapterSpec = { id: 'refs', scAnswers: [1, 0, 2], exercises: ['refsFill', 'fixReactive'] }
const cp = (over: Partial<ChapterProgress> = {}): ChapterProgress => ({
  sc: { 0: 1, 1: 0, 2: 2 },
  ex: { refsFill: { passed: true }, fixReactive: { passed: true } },
  done: false,
  ...over
})

describe('一章的完成标准：自测全部答对 + 本章练习全部通过', () => {
  it('都满足：达到标准', () => {
    expect(meetsCompletion(cp(), spec)).toBe(true)
    expect(shouldAutoComplete(cp(), spec)).toBe(true)
  })

  it('自测答错一道：不达标，并指出是哪一道', () => {
    const c = cp({ sc: { 0: 1, 1: 3, 2: 2 } })
    expect(meetsCompletion(c, spec)).toBe(false)
    expect(scMissing(c, spec)).toEqual([1])
  })

  it('自测没答完：不达标（没答的题算没对）', () => {
    expect(scMissing(cp({ sc: { 0: 1 } }), spec)).toEqual([1, 2])
    expect(meetsCompletion(cp({ sc: {} }), spec)).toBe(false)
  })

  it('多道练习：一道没通过就不达标，全部通过才达标', () => {
    const c = cp({ ex: { refsFill: { passed: true }, fixReactive: { passed: false, fails: 2 } } })
    expect(meetsCompletion(c, spec)).toBe(false)
    expect(exMissing(c, spec)).toEqual(['fixReactive'])
    expect(exMissing(cp({ ex: {} }), spec)).toEqual(['refsFill', 'fixReactive'])
  })

  it('没有任何进度记录：不达标，不会抛错', () => {
    expect(meetsCompletion(undefined, spec)).toBe(false)
    expect(completionNeeds(undefined, spec)).toEqual({ sc: 3, ex: 2 })
  })

  it('"掌握标准"条：还差几道自测、几道练习', () => {
    expect(completionNeeds(cp({ sc: { 0: 1, 1: 9 }, ex: { refsFill: { passed: true } } }), spec)).toEqual({ sc: 2, ex: 1 })
    expect(completionNeeds(cp(), spec)).toEqual({ sc: 0, ex: 0 })
  })

  it('只有练习没有自测：练习全过即达标；只有自测没有练习：自测全对即达标', () => {
    expect(meetsCompletion(cp({ sc: {} }), { ...spec, scAnswers: [] })).toBe(true)
    expect(meetsCompletion(cp({ ex: {} }), { ...spec, exercises: [] })).toBe(true)
  })

  it('没有自测题也没有练习的页面（速查表）不参与，永远不会自动完成', () => {
    const cheat: ChapterSpec = { id: 'cheat', scAnswers: [], exercises: [] }
    expect(takesPart(cheat)).toBe(false)
    expect(meetsCompletion(undefined, cheat)).toBe(false)
    expect(shouldAutoComplete({ sc: {}, ex: {}, done: false }, cheat)).toBe(false)
    expect(takesPart(spec)).toBe(true)
  })

  it('已经标记完成的章不再自动标记（手动取消后不会马上被标回，取消时 done 为 false 才会重新触发）', () => {
    expect(shouldAutoComplete(cp({ done: true }), spec)).toBe(false)
  })
})

describe('借助答案', () => {
  it('看过答案后自己改写（solution）或重写（rewrite）通过的练习，照常算通过', () => {
    const c = cp({ ex: { refsFill: { passed: true, sawSol: true, help: 'solution' }, fixReactive: { passed: true, sawSol: true, rewrite: true, help: 'rewrite' } } })
    expect(meetsCompletion(c, spec)).toBe(true)
  })

  it('这些练习会被列为"借助答案完成"，没看过答案的不列', () => {
    const c = cp({ ex: { refsFill: { passed: true, help: false }, fixReactive: { passed: true, sawSol: true, help: 'solution' } } })
    expect(helpedExercises(c, spec)).toEqual(['fixReactive'])
  })

  it('看过答案但还没通过的练习不算通过，也不列为借助答案', () => {
    const c = cp({ ex: { refsFill: { passed: true }, fixReactive: { passed: false, sawSol: true } } })
    expect(meetsCompletion(c, spec)).toBe(false)
    expect(helpedExercises(c, spec)).toEqual([])
  })
})

describe('完成度统计：选读章不计入分母和已完成数，单独统计', () => {
  const list = [
    { id: 'a' },
    { id: 'b', optional: false },
    { id: 'c' },
    { id: 'x', optional: true },
    { id: 'y', optional: true }
  ]
  it('只数必读章：done / total', () => {
    expect(tallyProgress(list, id => id === 'a')).toEqual({ done: 1, total: 3, optionalDone: 0, optionalTotal: 2 })
  })
  it('选读章学完了照常记录，但只进选读的计数，不进 done', () => {
    expect(tallyProgress(list, id => id === 'x' || id === 'a')).toEqual({ done: 1, total: 3, optionalDone: 1, optionalTotal: 2 })
  })
  it('全部必读章学完就是满分，不管选读学了几章', () => {
    const t = tallyProgress(list, id => ['a', 'b', 'c'].includes(id))
    expect(t.done).toBe(t.total)
    expect(t.optionalDone).toBe(0)
  })
  it('没有选读章，或空列表', () => {
    expect(tallyProgress([{ id: 'a' }, { id: 'b' }], id => id === 'b')).toEqual({ done: 1, total: 2, optionalDone: 0, optionalTotal: 0 })
    expect(tallyProgress([], () => true)).toEqual({ done: 0, total: 0, optionalDone: 0, optionalTotal: 0 })
  })
})
