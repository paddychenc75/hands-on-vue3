import { describe, expect, it } from 'vitest'
import { MIX_SIZE, REVIEW_MAX, mixedQueue, nextDueLabel, todayQueue } from '../../course/engine/logic/review.ts'
import { seeded } from '../../course/engine/logic/random.ts'
import { DAY, HOUR, MIN, NOW } from './fixtures.ts'

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ key: `c#${i}` }))

describe('今日复习的队列：只是到期的卡，打乱后最多 20 题', () => {
  it('常量', () => {
    expect([REVIEW_MAX, MIX_SIZE]).toEqual([20, 10])
  })
  it('到期的不到 20 道：全部出，只是顺序打乱', () => {
    const q = todayQueue(items(7), seeded('r'))
    expect(q).toHaveLength(7)
    expect(new Set(q.map(x => x.key)).size).toBe(7)
  })
  it('到期的超过 20 道：只出 20 道，没有重复', () => {
    const q = todayQueue(items(35), seeded('r'))
    expect(q).toHaveLength(20)
    expect(new Set(q.map(x => x.key)).size).toBe(20)
  })
  it('不改动传入的数组', () => {
    const src = items(5)
    const copy = [...src]
    todayQueue(src, seeded('r'))
    expect(src).toEqual(copy)
  })
  it('没有到期的：空队列', () => {
    expect(todayQueue([], seeded('r'))).toEqual([])
  })
})

describe('混合练习：从学过的卡片里随机抽 10 道', () => {
  it('学过的多于 10 道：抽 10 道，没有重复', () => {
    const q = mixedQueue(items(40), seeded('m'))
    expect(q).toHaveLength(10)
    expect(new Set(q.map(x => x.key)).size).toBe(10)
  })
  it('学过的不到 10 道：全部出', () => {
    expect(mixedQueue(items(4), seeded('m'))).toHaveLength(4)
  })
  it('同一个种子得到同一个顺序，换种子顺序不同', () => {
    expect(mixedQueue(items(40), seeded('m'))).toEqual(mixedQueue(items(40), seeded('m')))
    expect(mixedQueue(items(40), seeded('m'))).not.toEqual(mixedQueue(items(40), seeded('n')))
  })
})

describe('下一批题目什么时候到期的说法', () => {
  it('没有下一次到期：空串', () => {
    expect(nextDueLabel(undefined, NOW)).toBe('')
  })
  it('不到 1 小时', () => {
    expect(nextDueLabel(NOW + 20 * MIN, NOW)).toBe('不到 1 小时')
  })
  it('1 天以内按小时（向上取整）', () => {
    expect(nextDueLabel(NOW + 5 * HOUR + 10 * MIN, NOW)).toBe('6 小时后')
  })
  it('1 天以上按天（四舍五入，至少 1 天）', () => {
    expect(nextDueLabel(NOW + DAY, NOW)).toBe('1 天后')
    expect(nextDueLabel(NOW + 3 * DAY, NOW)).toBe('3 天后')
    expect(nextDueLabel(NOW + 2.6 * DAY, NOW)).toBe('3 天后')
  })
})
