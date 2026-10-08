/* 一章的完成判定（纯函数）。
   完成标准 = 章内自测全部答对 + 本章练习全部通过。
   "借助答案"：看过答案后改写通过的练习照常算通过，但会留下标记（help），界面据此提示"过几天不看答案再写一遍"。
   看过答案后直接交答案原文的，根本过不了检查（见 ladder.ts 的 isPastedSolution），所以不算通过。
   没有自测题也没有练习的页面（速查表）不参与。移植自 hands-on-react 的 completion.ts，并改成"一章多道练习"。 */
import type { ChapterProgress, ChapterSpec } from '../types.ts'

/** 这一页参与完成判定吗：有自测题或有练习才参与 */
export const takesPart = (spec: ChapterSpec): boolean => spec.scAnswers.length > 0 || spec.exercises.length > 0

/** 还没答对的自测题号 */
export const scMissing = (cp: ChapterProgress | undefined, spec: ChapterSpec): number[] =>
  spec.scAnswers.map((a, i) => i).filter(i => (cp?.sc || {})[i] !== spec.scAnswers[i])

/** 自测是否全部答对（没有自测题算通过） */
export const scPassed = (cp: ChapterProgress | undefined, spec: ChapterSpec): boolean => scMissing(cp, spec).length === 0

/** 还没通过的练习 id */
export const exMissing = (cp: ChapterProgress | undefined, spec: ChapterSpec): string[] => spec.exercises.filter(id => !cp?.ex?.[id]?.passed)

/** 练习是否全部通过（没有练习算通过） */
export const exPassed = (cp: ChapterProgress | undefined, spec: ChapterSpec): boolean => exMissing(cp, spec).length === 0

/** 达到完成标准了吗（不看 done 标记）。不参与的页面永远是 false */
export const meetsCompletion = (cp: ChapterProgress | undefined, spec: ChapterSpec): boolean => takesPart(spec) && scPassed(cp, spec) && exPassed(cp, spec)

/** 现在要不要自动标记完成：达到标准，且还没标记过（手动取消完成后，不会马上被重新标记，所以只在答题/通过的那一刻调用） */
export const shouldAutoComplete = (cp: ChapterProgress | undefined, spec: ChapterSpec): boolean => !cp?.done && meetsCompletion(cp, spec)

/** 借助答案完成的练习 id（通过了，但看过参考答案；'rewrite' 是自己重写的，也列出，由界面决定怎么提示） */
export const helpedExercises = (cp: ChapterProgress | undefined, spec: ChapterSpec): string[] =>
  spec.exercises.filter(id => {
    const e = cp?.ex?.[id]
    return !!(e?.passed && e.help)
  })

/** "掌握标准"条要显示的还差什么 */
export function completionNeeds(cp: ChapterProgress | undefined, spec: ChapterSpec): { sc: number; ex: number } {
  return { sc: scMissing(cp, spec).length, ex: exMissing(cp, spec).length }
}
