/* 练习的提示阶梯和"代码是否真的改了"的判断（纯函数）。不读 Date.now()：当前时间由调用方传入。
   移植自 hands-on-react，按 Vue 练习的特点做了两处适配：
   1. 练习有两段代码（模板 tpl 和脚本 js），规范化和比较同时覆盖两段；
   2. 半成品示例（faded）是可选的：没有时阶梯跳过这一级，其余门槛不变。 */
import type { CodePair } from '../types.ts'

export type LadderKey = 'hint' | 'faded' | 'solution'

export interface LadderLevel {
  key: LadderKey
  name: string
  /** 需要的有效失败次数 */
  need: number
  /** 从第一次失败起要过的分钟数 */
  wait: number
}
/** 每一级要求：失败次数 + 从第一次失败起已经思考了多久（分钟） */
export const LADDER: LadderLevel[] = [
  { key: 'hint', name: '提示', need: 1, wait: 0 },
  { key: 'faded', name: '半成品示例', need: 2, wait: 2 },
  { key: 'solution', name: '查看参考答案', need: 3, wait: 5 }
]

/** 这道练习实际使用的阶梯：没有半成品示例时跳过"半成品"一级，其余两级的门槛不变 */
export const ladderLevels = (hasFadedExample: boolean): LadderLevel[] => (hasFadedExample ? LADDER : LADDER.filter(l => l.key !== 'faded'))

/** 从第一次失败起过了多少分钟（还没失败过是 0） */
export const minutesSinceFirstFail = (firstFail: number | undefined, now: number): number => (firstFail ? (now - firstFail) / 60e3 : 0)

/** 某一级现在能不能点，以及按钮上的文字。练习已通过（passed 为真）时全部开放 */
export function ladderButton(level: LadderLevel, p: { passed?: boolean; fails?: number; firstFail?: number }, now: number): { open: boolean; text: string } {
  const { name, need, wait } = level
  const f = p.fails || 0
  const mins = minutesSinceFirstFail(p.firstFail, now)
  const open = !!(p.passed || (f >= need && mins >= wait))
  const text = open ? name : f < need ? `🔒 ${name}（再改代码检查 ${need - f} 次解锁）` : `🔒 ${name}（再想 ${Math.max(1, Math.ceil(wait - mins))} 分钟解锁）`
  return { open, text }
}

/** 一级阶梯的当前状态：能不能点，按钮上写什么 */
export interface LadderStatus {
  level: LadderLevel
  open: boolean
  text: string
}

/** 这道练习每一级的当前状态（levels 用 ladderLevels 取，没有半成品时只有两级） */
export const ladderStatus = (levels: LadderLevel[], p: { passed?: boolean; fails?: number; firstFail?: number }, now: number): LadderStatus[] =>
  levels.map(level => ({ level, ...ladderButton(level, p, now) }))

/** 一次计入的失败之后，给学习者的一句说明：
    - 这次失败刚好让某一级的次数够了：已经能点就写"已解锁：X"，次数够了但时间没到就写还要等多久；
    - 其他情况返回空串。
    counted 为 false（这次没计数）时也返回空串，没计数的说明由界面单独写 */
export function unlockNote(levels: LadderLevel[], p: { passed?: boolean; fails?: number; firstFail?: number }, now: number, counted: boolean): string {
  if (!counted) return ''
  const f = p.fails || 0
  const parts: string[] = []
  for (const level of levels) {
    if (level.need !== f) continue
    if (ladderButton(level, p, now).open) parts.push(`已解锁：${level.name}`)
    else parts.push(`${level.name}：次数够了，还要再想 ${Math.max(1, Math.ceil(level.wait - minutesSinceFirstFail(p.firstFail, now)))} 分钟才解锁`)
  }
  return parts.join('；')
}

const squash = (s: string): string => s.replace(/[\s;,]+/g, '')

/** 脚本规范化：去掉 // 和 块注释、空白、分号、逗号。只改这些的修改不算"改过代码" */
export const normScript = (s: unknown): string =>
  squash(
    String(s)
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
  )

/** 模板规范化：去掉 HTML 注释 <!-- -->、空白、分号、逗号。
    不去 // 注释：模板里的 // 常常是网址（http://…），去掉会吃掉后面的内容 */
export const normTemplate = (s: unknown): string => squash(String(s).replace(/<!--[\s\S]*?-->/g, ''))

/** 两段代码分别规范化 */
export const normPair = (c: CodePair): CodePair => ({ tpl: normTemplate(c.tpl), js: normScript(c.js) })

/** 两份已规范化的代码是否完全相同（任意一段不同就算不同） */
export const samePair = (a: CodePair | undefined, b: CodePair | undefined): boolean => !!a && !!b && a.tpl === b.tpl && a.js === b.js

/** 只有真的改过代码的失败才计入解锁次数，连点"检查"不会解锁答案。
    "改过"：规范化后，模板或脚本至少一段和起始代码不同，并且和上一次失败的代码也不同（lastFail 是已规范化的形式） */
export const isAttempt = (code: CodePair, starter: CodePair, lastFail: CodePair | undefined): boolean => {
  const n = normPair(code)
  return !samePair(n, normPair(starter)) && !samePair(n, lastFail)
}

/** 看过答案、没重置，就直接提交答案原文（两段都和参考答案相同）：不算通过 */
export const isPastedSolution = (code: CodePair, solution: CodePair, p: { sawSol?: boolean; rewrite?: boolean }): boolean =>
  !!(p.sawSol && !p.rewrite && samePair(normPair(code), normPair(solution)))

/** 练习数据里可选的半成品示例：人工挖空的参考答案，只写有改动的那一段也行 */
export interface FadedLike {
  faded?: Partial<CodePair>
}

/** 这道练习有没有半成品示例（至少一段有内容） */
export const hasFaded = (ex: FadedLike): boolean => !!(ex.faded && (ex.faded.tpl || ex.faded.js))

/** 半成品示例的完整两段代码：没写的那一段用起始代码补上。没有半成品时返回 undefined（不自动生成） */
export const fadedExample = (ex: FadedLike, starter: CodePair): CodePair | undefined =>
  hasFaded(ex) ? { tpl: ex.faded?.tpl || starter.tpl, js: ex.faded?.js || starter.js } : undefined
