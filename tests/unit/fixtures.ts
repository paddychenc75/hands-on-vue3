import type { Card } from '../../course/engine/logic/srs.ts'
import type { SrsCard } from '../../course/engine/types.ts'

export const MIN = 60e3
export const HOUR = 36e5
export const DAY = 864e5
/** 测试里固定的"现在" */
export const NOW = 1_700_000_000_000

/** 一张卡片：键是 `章id#N`，阶段测验专用题的 prefix 是 'c' */
export const card = (chapterId: string, qi: number, prefix = ''): Card => ({ key: `${chapterId}#${prefix}${qi}`, chapterId })
export const srsCard = (over: Partial<SrsCard> = {}): SrsCard => ({ box: 1, n: 1, due: NOW + DAY, last: NOW - DAY, ...over })
/** 固定的随机数序列，循环使用 */
export const seq = (...v: number[]) => {
  let i = 0
  return () => v[i++ % v.length]
}
