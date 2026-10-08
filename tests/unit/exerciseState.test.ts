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

import { restoreStash, stashCode } from '../../course/engine/logic/exerciseState.ts'
import { ladderStatus, ladderLevels, unlockNote } from '../../course/engine/logic/ladder.ts'

describe('填入半成品或参考答案之前先存下自己的代码，之后能找回', () => {
  const mine: CodePair = { tpl: '<p>我的</p>', js: 'return {}' }
  it('第一次存：记下当前代码', () => {
    expect(stashCode(undefined, mine).stash).toEqual(mine)
  })
  it('已经存过、当前编辑器里正好是半成品或答案：不覆盖（那不是自己的代码）', () => {
    const faded: CodePair = { tpl: '半成品', js: '半成品' }
    const sol: CodePair = { tpl: '答案', js: '答案' }
    const once = stashCode({ passed: false }, mine, [faded, sol])
    expect(stashCode(once, faded, [faded, sol]).stash).toEqual(mine)
    expect(stashCode(once, sol, [faded, sol]).stash).toEqual(mine)
  })
  it('半成品只有注释和空白的差别也算同一份（规范化后比较）', () => {
    const faded: CodePair = { tpl: '<p>半成品</p>', js: 'const a = 1' }
    const once = stashCode({ passed: false }, mine, [faded])
    expect(stashCode(once, { tpl: '<p>半成品</p> <!-- 注释 -->', js: 'const a = 1 // x' }, [faded]).stash).toEqual(mine)
  })
  it('学习者在半成品上改过、再填一次：存的是改过的新代码', () => {
    const faded: CodePair = { tpl: '半成品', js: '半成品' }
    const once = stashCode({ passed: false }, mine, [faded])
    const edited: CodePair = { tpl: '半成品 + 我补的', js: '半成品' }
    expect(stashCode(once, edited, [faded]).stash).toEqual(edited)
  })
  it('找回：返回存下的代码，并清掉 stash', () => {
    const r = restoreStash(stashCode({ passed: false, fails: 2 }, mine))
    expect(r.code).toEqual(mine)
    expect(r.ep).toEqual({ passed: false, fails: 2 })
  })
  it('没存过时找回：什么也不返回', () => {
    expect(restoreStash({ passed: false }).code).toBeUndefined()
  })
  it('点重置：清掉 stash（重置就是放弃之前的代码），看过答案则标记重写', () => {
    expect(resetExercise(stashCode({ passed: false }, mine)).stash).toBeUndefined()
    const ep = resetExercise(stashCode(viewSolution(undefined), mine))
    expect(ep).toMatchObject({ sawSol: true, rewrite: true })
    expect(ep.stash).toBeUndefined()
  })
  it('看答案流程：存下自己的代码、看答案、重置、重写通过：help 是 rewrite，且不留 stash', () => {
    const ep = recordPass(resetExercise(viewSolution(stashCode(undefined, mine))))
    expect(ep).toMatchObject({ passed: true, help: 'rewrite', sawSol: true, rewrite: true })
    expect(ep.stash).toBeUndefined()
  })
})

describe('阶梯状态和失败后的说明', () => {
  const lv2 = ladderLevels(false)
  const lv3 = ladderLevels(true)
  it('没有半成品：只有提示和参考答案两级', () => {
    expect(ladderStatus(lv2, { fails: 0 }, NOW).map(s => s.level.key)).toEqual(['hint', 'solution'])
  })
  it('没失败过：两级都锁着，写明还要再改代码检查几次', () => {
    const [h, s] = ladderStatus(lv2, { fails: 0 }, NOW)
    expect(h).toMatchObject({ open: false, text: '🔒 提示（再改代码检查 1 次解锁）' })
    expect(s).toMatchObject({ open: false, text: '🔒 查看参考答案（再改代码检查 3 次解锁）' })
  })
  it('失败 3 次但距第一次失败只有 3 分钟：参考答案写明还要等 2 分钟', () => {
    const [, s] = ladderStatus(lv2, { fails: 3, firstFail: NOW - 3 * MIN }, NOW)
    expect(s).toMatchObject({ open: false, text: '🔒 查看参考答案（再想 2 分钟解锁）' })
  })
  it('第 1 次计入的失败：说明已解锁提示', () => {
    expect(unlockNote(lv2, { fails: 1, firstFail: NOW }, NOW, true)).toBe('已解锁：提示')
  })
  it('没计数：说明留给界面单独写，这里返回空串', () => {
    expect(unlockNote(lv2, { fails: 1, firstFail: NOW }, NOW, false)).toBe('')
  })
  it('有半成品时第 2 次失败：次数够了但没到 2 分钟，写明还要等多久', () => {
    expect(unlockNote(lv3, { fails: 2, firstFail: NOW - 30e3 }, NOW, true)).toBe('半成品示例：次数够了，还要再想 2 分钟才解锁')
  })
  it('有半成品时第 2 次失败且已过 2 分钟：已解锁半成品示例', () => {
    expect(unlockNote(lv3, { fails: 2, firstFail: NOW - 3 * MIN }, NOW, true)).toBe('已解锁：半成品示例')
  })
  it('第 2 次失败但没有半成品这一级：不说什么', () => {
    expect(unlockNote(lv2, { fails: 2, firstFail: NOW - 3 * MIN }, NOW, true)).toBe('')
  })
})
