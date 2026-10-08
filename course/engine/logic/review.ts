/* 复习页的队列和"下次到期"的说法（纯函数）。不读 Date.now()：当前时间由调用方传入，随机数 rnd 也由调用方传入。
   规则照 hands-on-react 的 review.ts：今日复习只出到期的卡，最多 20 道；没有到期时可以做 10 道混合练习。 */
import { shuffled } from './random.ts'
import { DAY } from './srs.ts'

/** 今日复习一次最多出多少题 */
export const REVIEW_MAX = 20
/** 混合练习一次出多少题 */
export const MIX_SIZE = 10

/** 把一组题打乱后取前 n 个。不改传入的数组 */
const sample = <T>(items: readonly T[], n: number, rnd: () => number): T[] =>
  shuffled(items.length, rnd)
    .slice(0, n)
    .map(i => items[i])

/** 今日复习的队列：到期的卡打乱，最多 REVIEW_MAX 道 */
export const todayQueue = <T>(due: readonly T[], rnd: () => number = Math.random): T[] => sample(due, REVIEW_MAX, rnd)

/** 混合练习的队列：从学过的卡里随机抽 MIX_SIZE 道（不看是否到期，也不过滤刚答过的） */
export const mixedQueue = <T>(learned: readonly T[], rnd: () => number = Math.random): T[] => sample(learned, MIX_SIZE, rnd)

/** 下一批题目什么时候到期，例如"3 天后"、"6 小时后"、"不到 1 小时"。没有下一次到期返回空串 */
export function nextDueLabel(next: number | undefined, now: number): string {
  if (next == null) return ''
  const ms = Math.max(0, next - now)
  if (ms < 36e5) return '不到 1 小时'
  if (ms < DAY) return `${Math.ceil(ms / 36e5)} 小时后`
  return `${Math.max(1, Math.round(ms / DAY))} 天后`
}
