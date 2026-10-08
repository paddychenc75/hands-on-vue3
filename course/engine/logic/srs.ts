/* 间隔复习（Leitner 盒子）的纯逻辑。不碰 DOM、localStorage，也不读 Date.now()：当前时间由调用方传入（now）。
   存储和卡片键在 course/engine/cards.ts。移植自 hands-on-react，"课"改成"章"。 */
import type { SrsCard } from '../types.ts'

export const DAY = 864e5
/** 盒子 0..5 对应的复习间隔（天）。盒子 0 的 0 只是占位，没有参与计算：答错固定"明天再出"（见 nextCard），否则答错的题当天又会到期 */
export const SRS_DAYS = [0, 1, 3, 7, 16, 35]
/** 刚答过（12 小时内）的题不拿来热身，否则只是在考短期记忆 */
export const WARMUP_COOLDOWN = 12 * 36e5

/** 一张可出的题的最小形状：键是 `章id#N`（章内自测）或 `章id#cN`（阶段测验专用题），chapterId 是它所属的章 */
export interface Card {
  key: string
  chapterId: string
}

/** 答完一题后的新卡片：答对进下一个盒子（到顶不再升），答错回到盒子 0 并安排明天再出 */
export function nextCard(card: SrsCard | undefined, ok: boolean, now: number): SrsCard {
  const c = { ...(card || { box: 0, n: 0 }) } as SrsCard
  c.box = ok ? Math.min(c.box + 1, SRS_DAYS.length - 1) : 0
  c.due = now + (ok ? SRS_DAYS[c.box] : 1) * DAY
  c.n++
  c.last = now
  return c
}

export const isDue = (card: SrsCard, now: number): boolean => card.due <= now

/** 到期的卡片键，最早到期的在前 */
export const dueKeys = (srs: Record<string, SrsCard>, now: number): string[] =>
  Object.entries(srs)
    .filter(([, c]) => c.due <= now)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([k]) => k)

/** 最近的下一次到期时间（没有则 undefined） */
export const nextDueAfter = (srs: Record<string, SrsCard>, now: number): number | undefined =>
  Object.values(srs)
    .map(c => c.due)
    .filter(d => d > now)
    .sort((a, b) => a - b)[0]

/** 答题是否要更新复习安排：答错照样重置；答对只有"到期的题"才拉长间隔；还没有记录的新卡总是记录。热身、混合练习和阶段测验共用 */
export const shouldRecord = (ok: boolean, card: SrsCard | undefined, now: number): boolean => !ok || !card || card.due <= now

/** 带"到期才升级"门槛的 nextCard：不该记录时原样返回旧卡片 */
export const gatedNextCard = (card: SrsCard | undefined, ok: boolean, now: number): SrsCard =>
  shouldRecord(ok, card, now) ? nextCard(card, ok, now) : (card as SrsCard)

/** 热身题库：只考已经学过（答过题）的内容，并去掉刚答过的。只用于热身，混合练习和阶段测验不过滤 */
export function warmupPool<T extends Card>(pool: T[], srs: Record<string, SrsCard>, now: number): T[] {
  return pool.filter(c => {
    const s = srs[c.key]
    return !(!s || (s.last && now - s.last < WARMUP_COOLDOWN))
  })
}

/** 热身选 2 题：先到期的 1 道、上一章的 1 道，不够再从到期、更早的章、上一章里补 */
export function pickWarmup<T extends Card>(pool: T[], srs: Record<string, SrsCard>, prevChapterId: string | undefined, rnd: () => number, now: number): T[] {
  const mix = (arr: T[]) =>
    arr
      .map((c): [number, T] => [rnd(), c])
      .sort((a, b) => a[0] - b[0])
      .map(x => x[1])
  const due = mix(pool.filter(c => srs[c.key] && srs[c.key].due <= now))
  const prev = mix(pool.filter(c => c.chapterId === prevChapterId))
  const older = mix(pool.filter(c => c.chapterId !== prevChapterId))
  const picks: T[] = []
  ;[...due.slice(0, 1), ...prev.slice(0, 1), ...due.slice(1), ...older, ...prev].forEach(c => {
    if (picks.length < 2 && !picks.includes(c)) picks.push(c)
  })
  return picks
}
