/* 阶段测验的纯逻辑：抽题、及格判定、冷却和复测时间。不读 Date.now()：当前时间由调用方传入。
   移植自 hands-on-react，逻辑不变。 */
import type { SrsCard, StageRecord } from '../types.ts'
import { shuffled } from './random.ts'
import { DAY } from './srs.ts'

export const STAGE_QUESTIONS = 12
/** 12 题里新题（阶段测验专用题 `章id#cN`）最多 8 道，其余是章内自测里见过的常规题 */
export const STAGE_FRESH = 8
export const PASS_PERCENT = 80
/** 未通过后要等 30 分钟才能重测 */
export const COOLDOWN = 30 * 60e3
/** 通过 35 天后提示复测 */
export const RETEST_AFTER = 35 * DAY

export const percent = (right: number, n: number): number => Math.round((right / n) * 100)
export const isPass = (pct: number): boolean => pct >= PASS_PERCENT

/** 还要等多少毫秒才能重测（没有失败记录是 0；已通过的不冷却） */
export const cooldownLeft = (rec: StageRecord, now: number): number => {
  const wait = rec.failedAt ? rec.failedAt + COOLDOWN - now : 0
  return wait > 0 && !rec.passed ? wait : 0
}

/** 通过很久了，该提示复测 */
export const needsRetest = (rec: StageRecord, now: number): boolean => !!(rec.passed && rec.passedAt && now - rec.passedAt > RETEST_AFTER)

/** 一部分是章内见过的题（pool），一部分是只在阶段测验出现的新题（fresh）；新题里优先抽还没见过的 */
export function pickStageQuestions<T extends { key: string }>(pool: T[], fresh: T[], srs: Record<string, SrsCard>, rnd: () => number = Math.random): T[] {
  const N = STAGE_QUESTIONS
  const nFresh = Math.min(STAGE_FRESH, fresh.length)
  const freshOrder = shuffled(fresh.length, rnd)
    .map(i => fresh[i])
    .sort((a, b) => (srs[a.key] ? 1 : 0) - (srs[b.key] ? 1 : 0))
  const mixed = [
    ...freshOrder.slice(0, nFresh),
    ...shuffled(pool.length, rnd)
      .slice(0, N - nFresh)
      .map(i => pool[i])
  ]
  return shuffled(mixed.length, rnd).map(i => mixed[i])
}

/** 上次答到一半就离开：按已答的题计分，未答的算错，记为未通过 */
export function settlePending(rec: StageRecord): StageRecord {
  const pd = rec.pending as NonNullable<StageRecord['pending']>
  const next: StageRecord = { ...rec }
  delete next.pending
  next.last = Math.round((pd.right / pd.n) * 100)
  next.passed = false
  next.failedAt = pd.at
  next.weak = pd.weak || []
  return next
}

/** 交卷后的记录：以最近一次为准，通过过、后来没通过，也要重新复习。通过时清掉之前留下的 weak */
export function settleResult(rec: StageRecord, pct: number, weak: string[], now: number): StageRecord {
  const next: StageRecord = { ...rec }
  delete next.pending
  next.best = Math.max(next.best || 0, pct)
  next.last = pct
  if (isPass(pct)) {
    next.passed = true
    next.passedAt = now
    delete next.failedAt
    delete next.weak
  } else {
    next.passed = false
    next.failedAt = now
    next.weak = weak
  }
  return next
}

/** 答错的题所属的章，去重并保持出现顺序（"需要加强的章"） */
export const uniqueInOrder = (ids: readonly string[]): string[] => [...new Set(ids)]

/** 答到一半离开时留下的记录。每答一题更新一次；交卷后由 settleResult 清掉 */
export const pendingRecord = (n: number, answered: number, right: number, wrongChapterIds: readonly string[], now: number): NonNullable<StageRecord['pending']> => ({
  n,
  answered,
  right,
  at: now,
  weak: uniqueInOrder(wrongChapterIds)
})

/** 通过了多少天（向下取整；没通过过是 0） */
export const daysSincePass = (rec: StageRecord, now: number): number => (rec.passedAt ? Math.floor((now - rec.passedAt) / DAY) : 0)

/** 阶段测验的状态：none 没测过；passed 已通过；retest 通过很久该复测；cooling 没通过、还在 30 分钟冷却里；failed 没通过、可以重测。
    只看已经结算的字段：答到一半的 pending 要等下次进入测验页时才结算成未通过（settlePending），在那之前显示的是上一次的结果，
    所以正在答题时侧边栏不会显示“未通过” */
export function stageStatus(rec: StageRecord | undefined, now: number): 'none' | 'passed' | 'retest' | 'cooling' | 'failed' {
  if (!rec) return 'none'
  if (rec.passed) return needsRetest(rec, now) ? 'retest' : 'passed'
  if (rec.failedAt) return cooldownLeft(rec, now) > 0 ? 'cooling' : 'failed'
  return 'none'
}
