import { describe, expect, it } from 'vitest'
import { normPair } from '../../course/engine/logic/ladder.ts'
import { ladderButton, LADDER } from '../../course/engine/logic/ladder.ts'
import { recordFailure, recordPass, resetExercise, saveDraft, viewSolution } from '../../course/engine/logic/exerciseState.ts'
import type { ChapterProgress, CodePair } from '../../course/engine/types.ts'
import { MIN, NOW } from './fixtures.ts'

const starter: CodePair = { tpl: '<p>{{ n }}</p>', js: 'const n = 0\nreturn { n }' }
const tryJs = (js: string): CodePair => ({ tpl: starter.tpl, js })

describe('失败计数按练习 id 存储：同一章的两道练习互不影响', () => {
  it('每道练习有自己的 fails / firstFail / lastFail', () => {
    const ch: ChapterProgress = { sc: {}, ex: {}, done: false }
    let r = recordFailure(ch.ex.a, tryJs('const n = 1\nreturn { n }'), starter, NOW)
    ch.ex.a = r.ep
    r = recordFailure(ch.ex.a, tryJs('const n = 2\nreturn { n }'), starter, NOW + MIN)
    ch.ex.a = r.ep
    r = recordFailure(ch.ex.b, tryJs('const n = 9\nreturn { n }'), starter, NOW + 5 * MIN)
    ch.ex.b = r.ep
    expect(ch.ex.a).toMatchObject({ passed: false, fails: 2, firstFail: NOW })
    expect(ch.ex.b).toMatchObject({ passed: false, fails: 1, firstFail: NOW + 5 * MIN })
    expect(ch.ex.b.lastFail).toEqual(normPair(tryJs('const n = 9\nreturn { n }')))
  })

  it('第一次失败时间不会被后面的失败覆盖，阶梯的分钟数从它算起', () => {
    let ep = recordFailure(undefined, tryJs('const n = 1'), starter, NOW).ep
    ep = recordFailure(ep, tryJs('const n = 2'), starter, NOW + 10 * MIN).ep
    ep = recordFailure(ep, tryJs('const n = 3'), starter, NOW + 11 * MIN).ep
    expect(ep.fails).toBe(3)
    expect(ep.firstFail).toBe(NOW)
    expect(ladderButton(LADDER[2], ep, NOW + 11 * MIN).open).toBe(true)
  })

  it('代码没真的改（等于起始代码，或等于上次失败）：不计数，记录原样', () => {
    const r0 = recordFailure(undefined, starter, starter, NOW)
    expect(r0.counted).toBe(false)
    expect(r0.ep.fails).toBeUndefined()
    const ep = recordFailure(undefined, tryJs('const n = 1'), starter, NOW).ep
    const again = recordFailure(ep, tryJs('const  n = 1 ;'), starter, NOW + MIN)
    expect(again.counted).toBe(false)
    expect(again.ep).toBe(ep)
  })

  it('只改了模板一段也计数', () => {
    const r = recordFailure(undefined, { tpl: '<p>{{ n + 1 }}</p>', js: starter.js }, starter, NOW)
    expect(r.counted).toBe(true)
    expect(r.ep.fails).toBe(1)
  })

  it('已通过的练习不再计失败', () => {
    const r = recordFailure({ passed: true }, tryJs('const n = 1'), starter, NOW)
    expect(r.counted).toBe(false)
    expect(r.ep.fails).toBeUndefined()
  })

  it('不改传入的记录', () => {
    const ep = { passed: false, fails: 1, firstFail: NOW }
    recordFailure(ep, tryJs('const n = 7'), starter, NOW + MIN)
    expect(ep).toEqual({ passed: false, fails: 1, firstFail: NOW })
  })
})

describe('借助答案的标记', () => {
  it('没看过答案就通过：help 是 false', () => {
    expect(recordPass(undefined)).toMatchObject({ passed: true, help: false })
  })
  it('看过答案、没重置，改写后通过：help 是 solution', () => {
    expect(recordPass(viewSolution(undefined))).toMatchObject({ passed: true, help: 'solution', sawSol: true })
  })
  it('看过答案后点重置、自己重写后通过：help 是 rewrite', () => {
    expect(recordPass(resetExercise(viewSolution(undefined))).help).toBe('rewrite')
  })
  it('没看过答案时点重置：不留重写标记', () => {
    expect(resetExercise({ passed: false }).rewrite).toBeUndefined()
  })
  it('再次查看答案会清掉重写标记', () => {
    const ep = viewSolution(resetExercise(viewSolution(undefined)))
    expect(ep.rewrite).toBe(false)
  })
  it('通过之后再看答案、再通过：标记不再改（以第一次通过为准）', () => {
    const first = recordPass(undefined)
    expect(recordPass(viewSolution(first))).toEqual(viewSolution(first))
    expect(recordPass(viewSolution(first)).help).toBe(false)
  })
})

describe('草稿', () => {
  it('按练习保存两段代码，不影响其他字段', () => {
    const ep = saveDraft({ passed: true, fails: 2 }, { tpl: 'T', js: 'J' })
    expect(ep).toEqual({ passed: true, fails: 2, code: { tpl: 'T', js: 'J' } })
  })
})
