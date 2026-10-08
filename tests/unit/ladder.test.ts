import { describe, expect, it } from 'vitest'
import {
  LADDER,
  fadedExample,
  hasFaded,
  isAttempt,
  isPastedSolution,
  ladderButton,
  ladderLevels,
  minutesSinceFirstFail,
  normPair,
  normScript,
  normTemplate
} from '../../course/engine/logic/ladder.ts'
import type { CodePair } from '../../course/engine/types.ts'
import { MIN, NOW } from './fixtures.ts'

const [hint, faded, solution] = LADDER
const open = (level: (typeof LADDER)[number], fails: number, minutes: number | null, passed = false) =>
  ladderButton(level, { fails, firstFail: minutes === null ? undefined : NOW - minutes * MIN, passed }, NOW).open

// 一道练习的起始代码：模板 + 脚本两段
const starter: CodePair = { tpl: '<p>{{ n }}</p>\n<button @click="n++">+1</button>', js: 'const n = 0\nreturn { n }' }

describe('提示阶梯：三级的次数和时间条件', () => {
  it('三级是 提示(1 次, 0 分钟)、半成品示例(2 次, 2 分钟)、参考答案(3 次, 5 分钟)', () => {
    expect(LADDER.map(({ name, need, wait }) => ({ name, need, wait }))).toEqual([
      { name: '提示', need: 1, wait: 0 },
      { name: '半成品示例', need: 2, wait: 2 },
      { name: '查看参考答案', need: 3, wait: 5 }
    ])
  })

  it('提示：失败 1 次就解锁，没有时间要求', () => {
    expect(open(hint, 0, null)).toBe(false)
    expect(open(hint, 1, 0)).toBe(true)
  })

  it('半成品示例：要失败 2 次，并且从第一次失败起过了 2 分钟', () => {
    expect(open(faded, 1, 10)).toBe(false)
    expect(open(faded, 2, 1.99)).toBe(false)
    expect(open(faded, 2, 2)).toBe(true)
  })

  it('参考答案：要失败 3 次，并且从第一次失败起过了 5 分钟', () => {
    expect(open(solution, 2, 60)).toBe(false)
    expect(open(solution, 3, 4.99)).toBe(false)
    expect(open(solution, 3, 5)).toBe(true)
    expect(open(solution, 9, 600)).toBe(true)
  })

  it('练习通过后三级都开放', () => {
    expect(open(solution, 0, null, true)).toBe(true)
  })

  it('按钮文字：次数不够时写还要检查几次；次数够了、时间不够时写还要想几分钟（至少 1 分钟）', () => {
    const text = (level: (typeof LADDER)[number], fails: number, minutes: number) => ladderButton(level, { fails, firstFail: NOW - minutes * MIN }, NOW).text
    expect(ladderButton(hint, {}, NOW).text).toBe('🔒 提示（再改代码检查 1 次解锁）')
    expect(text(solution, 1, 0)).toBe('🔒 查看参考答案（再改代码检查 2 次解锁）')
    expect(text(solution, 3, 1)).toBe('🔒 查看参考答案（再想 4 分钟解锁）')
    expect(text(solution, 3, 4.9)).toBe('🔒 查看参考答案（再想 1 分钟解锁）')
    expect(text(solution, 3, 5)).toBe('查看参考答案')
  })

  it('minutesSinceFirstFail：没失败过是 0', () => {
    expect(minutesSinceFirstFail(undefined, NOW)).toBe(0)
    expect(minutesSinceFirstFail(NOW - 90e3, NOW)).toBe(1.5)
  })
})

describe('半成品是可选的：没有半成品时阶梯跳过这一级，其余门槛不变', () => {
  it('有半成品：三级都在；没有半成品：只剩 提示 和 参考答案', () => {
    expect(ladderLevels(true).map(l => l.key)).toEqual(['hint', 'faded', 'solution'])
    expect(ladderLevels(false).map(l => l.key)).toEqual(['hint', 'solution'])
  })

  it('跳级后参考答案的门槛没变：仍是失败 3 次且 5 分钟', () => {
    const sol = ladderLevels(false)[1]
    expect(sol).toEqual(solution)
    expect(open(sol, 2, 60)).toBe(false)
    expect(open(sol, 3, 4.99)).toBe(false)
    expect(open(sol, 3, 5)).toBe(true)
  })

  it('hasFaded：任意一段有内容就算有；空字符串、没写都算没有', () => {
    expect(hasFaded({})).toBe(false)
    expect(hasFaded({ faded: {} })).toBe(false)
    expect(hasFaded({ faded: { tpl: '', js: '' } })).toBe(false)
    expect(hasFaded({ faded: { js: 'const n = /* ✏️ */' } })).toBe(true)
    expect(hasFaded({ faded: { tpl: '<p>{{ /* ✏️ */ }}</p>' } })).toBe(true)
  })

  it('fadedExample：只写了一段时，另一段用起始代码补上；没有半成品时不自动生成', () => {
    expect(fadedExample({ faded: { js: 'const n = /* ✏️ */' } }, starter)).toEqual({ tpl: starter.tpl, js: 'const n = /* ✏️ */' })
    expect(fadedExample({ faded: { tpl: 'T', js: 'J' } }, starter)).toEqual({ tpl: 'T', js: 'J' })
    expect(fadedExample({}, starter)).toBeUndefined()
  })
})

describe('代码是否真的改了：规范化', () => {
  it('normScript 去掉 // 注释、块注释、空白、分号、逗号', () => {
    expect(normScript('const a = 1; // 注释\n/* 块注释 */ b,')).toBe('consta=1b')
    expect(normScript('f(a, b);')).toBe('f(ab)')
  })

  it('normTemplate 去掉 <!-- --> 注释、空白、分号、逗号；不把 // 当注释（网址里常有）', () => {
    expect(normTemplate('<p> a </p> <!-- 注释 -->\n<!--\n多行\n-->')).toBe('<p>a</p>')
    expect(normTemplate('<a href="http://x.com">x</a>')).toBe('<ahref="http://x.com">x</a>')
  })

  it('模板里 JS 风格的 /* */ 和 // 不当作注释，脚本里的 <!-- --> 也不当作注释', () => {
    expect(normTemplate('<p>{{ a /* 不是模板注释 */ }}</p>')).not.toBe(normTemplate('<p>{{ a }}</p>'))
    expect(normScript('const s = "<!-- x -->"')).toContain('<!--')
  })

  it('normPair 两段分别规范化', () => {
    expect(normPair({ tpl: '<p> a </p> <!-- c -->', js: 'x = 1; // c' })).toEqual({ tpl: '<p>a</p>', js: 'x=1' })
  })
})

describe('代码是否真的改了：isAttempt（两段代码）', () => {
  it('两段都没变，不算一次失败', () => {
    expect(isAttempt(starter, starter, undefined)).toBe(false)
  })

  it('只改了注释、空白、分号、逗号（模板的 <!-- --> 和脚本的 // 都算），不算', () => {
    expect(isAttempt({ ...starter, js: starter.js + ';\n// 加个注释\n' }, starter, undefined)).toBe(false)
    expect(isAttempt({ ...starter, tpl: starter.tpl + '\n<!-- 加个注释 -->\n' }, starter, undefined)).toBe(false)
    expect(isAttempt({ tpl: starter.tpl.replace('\n', '  \n  '), js: 'const n=0\nreturn {n}' }, starter, undefined)).toBe(false)
  })

  it('只改了脚本，算；只改了模板，也算（任意一段有实质改动）', () => {
    expect(isAttempt({ ...starter, js: 'const n = 1\nreturn { n }' }, starter, undefined)).toBe(true)
    expect(isAttempt({ ...starter, tpl: '<p>{{ n + 1 }}</p>\n<button @click="n++">+1</button>' }, starter, undefined)).toBe(true)
  })

  it('两段分开看：模板和脚本各改一半、合起来恰好等于起始代码的某种拼接，不会被误判为没改', () => {
    // 把脚本里的内容搬到模板里：连起来的字符一样，但分段后不同
    const a: CodePair = { tpl: 'ab', js: 'cd' }
    const b: CodePair = { tpl: 'abc', js: 'd' }
    expect(isAttempt(b, a, undefined)).toBe(true)
  })

  it('和上一次失败时的代码相同（规范化后，两段都相同）不重复计数', () => {
    const fail: CodePair = { tpl: starter.tpl, js: 'const n = 5\nreturn { n }' }
    const last = normPair(fail)
    expect(isAttempt({ tpl: starter.tpl + ' ', js: 'const  n = 5 ;\nreturn { n }' }, starter, last)).toBe(false)
    // 只有一段和上次不同：算
    expect(isAttempt({ tpl: '<p>x</p>', js: fail.js }, starter, last)).toBe(true)
    expect(isAttempt({ tpl: fail.tpl, js: 'const n = 6\nreturn { n }' }, starter, last)).toBe(true)
  })

  it('只和"上一次"失败比较：在两份失败的代码之间来回改，每次都算（现有行为）', () => {
    const a: CodePair = { tpl: starter.tpl, js: 'const n = 1\nreturn { n }' }
    const b: CodePair = { tpl: starter.tpl, js: 'const n = 3\nreturn { n }' }
    expect(isAttempt(a, starter, normPair(b))).toBe(true)
    expect(isAttempt(b, starter, normPair(a))).toBe(true)
  })
})

describe('粘贴参考答案原文不能通过', () => {
  const sol: CodePair = { tpl: '<p>{{ n }}</p>', js: 'const n = ref(1)\nreturn { n }' }
  it('看过答案、没重置：提交答案原文（忽略空白注释，两段都相同）会被拦下', () => {
    expect(isPastedSolution(sol, sol, { sawSol: true })).toBe(true)
    expect(isPastedSolution({ tpl: '<p>{{n}}</p> <!-- 抄的 -->', js: 'const n=ref(1) // 抄的\nreturn {n}' }, sol, { sawSol: true, rewrite: false })).toBe(true)
  })
  it('只有一段和答案相同，另一段不同：不拦', () => {
    expect(isPastedSolution({ ...sol, tpl: '<p>{{ n + 1 }}</p>' }, sol, { sawSol: true })).toBe(false)
    expect(isPastedSolution({ ...sol, js: 'const n = ref(2)\nreturn { n }' }, sol, { sawSol: true })).toBe(false)
  })
  it('看过答案后按了重置（rewrite）：写出和答案相同的代码可以通过', () => {
    expect(isPastedSolution(sol, sol, { sawSol: true, rewrite: true })).toBe(false)
  })
  it('没看过答案：不拦', () => {
    expect(isPastedSolution(sol, sol, {})).toBe(false)
  })
})
