/* 一道练习的进度状态转换（纯函数）：失败计数、看答案、重置、通过。
   React 把这些写在 DOM 模块里直接改对象；这里抽成纯函数，返回新对象，按练习 id 存取，方便单测。
   规则照 hands-on-react 的 exercise.ts。 */
import type { CodePair, ExerciseProgress } from '../types.ts'
import { isAttempt, normPair, samePair } from './ladder.ts'

export const newExercise = (): ExerciseProgress => ({ passed: false })

/** 一次检查没通过。只有真的改了代码的失败才计数；已通过的练习不再计数。
    counted 为 false 时记录原样返回（界面可以提示"代码和起始代码或上次检查时一样，不计入解锁次数"） */
export function recordFailure(ep: ExerciseProgress | undefined, code: CodePair, starter: CodePair, now: number): { ep: ExerciseProgress; counted: boolean } {
  const cur = ep || newExercise()
  const counted = !cur.passed && isAttempt(code, starter, cur.lastFail)
  if (!counted) return { ep: cur, counted: false }
  return { ep: { ...cur, fails: (cur.fails || 0) + 1, lastFail: normPair(code), firstFail: cur.firstFail || now }, counted: true }
}

/** 检查通过。第一次通过时：看过答案就记"借助答案"（点过重置自己重写的记 'rewrite'，否则 'solution'）；之后再通过不改标记 */
export function recordPass(ep: ExerciseProgress | undefined): ExerciseProgress {
  const cur = ep || newExercise()
  if (cur.passed) return cur
  return { ...cur, passed: true, help: cur.sawSol ? (cur.rewrite ? 'rewrite' : 'solution') : false }
}

/** 看了参考答案：记 sawSol，把"重写"标记清掉 */
export const viewSolution = (ep: ExerciseProgress | undefined): ExerciseProgress => ({ ...(ep || newExercise()), sawSol: true, rewrite: false })

/** 点"重置"：看过答案的话，标记为自己重写；没看过答案则不变。重置后不再需要找回"填入前的代码"，一并清掉 */
export const resetExercise = (ep: ExerciseProgress | undefined): ExerciseProgress => {
  const cur = ep || newExercise()
  const { stash: _stash, ...rest } = cur
  return rest.sawSol ? { ...rest, rewrite: true } : rest
}

/** 编辑器要被半成品或参考答案替换之前，先把学习者当前的代码存起来，之后能找回。
    assisted 是半成品和参考答案这类"帮助内容"：当前编辑器里正好是它们、并且之前存过，就不覆盖
    （再次替换时编辑器里是上一次填入的帮助内容，不是学习者自己的代码）；学习者改过之后再填，就存新的 */
export const stashCode = (ep: ExerciseProgress | undefined, current: CodePair, assisted: readonly CodePair[] = []): ExerciseProgress => {
  const cur = ep || newExercise()
  const isAssist = assisted.some(a => samePair(normPair(a), normPair(current)))
  return isAssist && cur.stash ? cur : { ...cur, stash: { tpl: current.tpl, js: current.js } }
}

/** 找回存起来的代码：返回清掉 stash 的记录和要放回编辑器的代码。没有存过时 code 是 undefined */
export function restoreStash(ep: ExerciseProgress | undefined): { ep: ExerciseProgress; code?: CodePair } {
  const cur = ep || newExercise()
  if (!cur.stash) return { ep: cur }
  const { stash, ...rest } = cur
  return { ep: rest, code: stash }
}

/** 保存编辑器里的草稿 */
export const saveDraft = (ep: ExerciseProgress | undefined, code: CodePair): ExerciseProgress => ({ ...(ep || newExercise()), code: { tpl: code.tpl, js: code.js } })
