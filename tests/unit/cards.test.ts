import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { Q } from '../../course/checks/questions.ts'
import {
  answerSelfCheck,
  buildCatalog,
  checkKey,
  dueCards,
  learnedCards,
  parseKey,
  scKey,
  srsAll,
  srsRecord,
  srsRecordGated,
  stagePools
} from '../../course/engine/cards.ts'
import { pickStageQuestions } from '../../course/engine/logic/stageCheck.ts'
import type { Progress, SelfCheckData } from '../../course/engine/types.ts'
import { DAY, NOW, srsCard } from './fixtures.ts'

// ---- 从真实的章节 Markdown 读出章 id、阶段和自测题数（规则和 course-data.mts 的 parseSelfChecks 一致：只认非 predict 的 <Sc>）
const chaptersDir = path.resolve(import.meta.dirname, '../../course/chapters')
const chapters = fs
  .readdirSync(chaptersDir)
  .filter(f => f.endsWith('.md'))
  .sort()
  .map(f => {
    const src = fs.readFileSync(path.join(chaptersDir, f), 'utf8')
    const fm = /^---\n([\s\S]*?)\n---/.exec(src)![1]
    const id = /^id:\s*(\S+)/m.exec(fm)?.[1]
    // 速查表没有 stage（固定入口，不属于任何阶段）
    const m = /^stage:\s*(\d)/m.exec(fm)
    const stage = m ? Number(m[1]) : null
    const scCount = [...src.matchAll(/<Sc\b([^>]*)>/g)].filter(m => !/\bpredict\b/.test(m[1])).length
    return { id, stage, scCount }
  })
  // 没有 id 的页面（旧地址 27-quiz 的跳转页）不是章，不参与
  .filter((c): c is { id: string; stage: number | null; scCount: number } => !!c.id)
const selfchecks: SelfCheckData[] = chapters.flatMap(c =>
  Array.from({ length: c.scCount }, (_, i) => ({ key: `${c.id}:${i}`, chapterId: c.id, a: i % 4, stem: `${c.id}-${i}`, opts: ['a', 'b', 'c', 'd'], explain: 'e' }))
)
const stageOfChapter = new Map(chapters.map(c => [c.id, c.stage]))
const catalog = buildCatalog(selfchecks, Q, id => stageOfChapter.get(id))

describe('卡片键规则：章内自测 章id#N，阶段测验专用题 章id#cN', () => {
  it('键的写法', () => {
    expect(scKey('refs', 0)).toBe('refs#0')
    expect(checkKey('refs', 1)).toBe('refs#c1')
  })

  it('parseKey 解析两种键，不合法的返回 null', () => {
    expect(parseKey('refs#3')).toEqual({ chapterId: 'refs', kind: 'sc', index: 3 })
    expect(parseKey('refs#c12')).toEqual({ chapterId: 'refs', kind: 'check', index: 12 })
    expect(parseKey('refs')).toBeNull()
    expect(parseKey('refs#x')).toBeNull()
    expect(parseKey('refs:3')).toBeNull()
  })

  it('章内自测的 N 就是它在自测块里的序号（和 sc 的序号一致），题号 0 起', () => {
    const c = catalog.cardOf('template#0')!
    expect(c).toMatchObject({ key: 'template#0', chapterId: 'template', kind: 'sc', index: 0, format: 'html' })
    expect(catalog.cardOf('template#1')!.index).toBe(1)
  })

  it('N 取自数据里 key 的序号，不看数组位置：打乱数组顺序，键对应的题不变', () => {
    const shuffled = buildCatalog([...selfchecks].reverse(), Q)
    for (const s of selfchecks) expect(shuffled.cardOf(scKey(s.chapterId, Number(s.key.split(':')[1])))!.stem).toBe(s.stem)
  })

  it('找不到的键返回 null', () => {
    expect(catalog.cardOf('nope#0')).toBeNull()
    expect(catalog.cardOf('first#99')).toBeNull()
    expect(catalog.cardOf('first#c99')).toBeNull()
  })

  it('同一个键出现两次会报错', () => {
    expect(() => buildCatalog([selfchecks[0], selfchecks[0]], [])).toThrow(/重复/)
  })
})

describe('60 道阶段测验专用题（题库 course/checks/questions.ts），按所属章分组、组内按题库出现顺序编号', () => {
  it('题库有 60 题，每题都能变成一张卡片', () => {
    expect(Q.length).toBe(60)
    expect(catalog.all.filter(c => c.kind === 'check').length).toBe(60)
  })

  it('每章的专用题数量（锁住：题库只能在末尾追加，已有的键不能变）', () => {
    const counts: Record<string, number> = {}
    for (const c of catalog.all.filter(c => c.kind === 'check')) counts[c.chapterId] = (counts[c.chapterId] || 0) + 1
    expect(counts).toEqual({
      first: 2, template: 5, refs: 2, computed: 2, comm: 4, lifecycle: 2, composables: 2, builtins: 2, directives: 2, forms: 2, app: 2,
      reactivity: 4, scheduler: 3, render: 2, compiler: 2, diff: 2, patterns: 2, pinia: 2, router: 2, ts: 2, perf: 2, tooling: 2,
      ssr: 2, renderer: 2, migrate: 2, project: 2
    })
  })

  it('组内顺序 = 它们在 Q 里的出现顺序：template 的 5 道题依次是 c0..c4', () => {
    const inQ = Q.filter(r => r[3] === 'template').map(r => r[0])
    expect(inQ.length).toBe(5)
    inQ.forEach((stem, n) => expect(catalog.cardOf(checkKey('template', n))!.stem).toBe(stem))
  })

  it('题库里夹在别的章中间的题，编号不受影响（comm 的 4 道在 Q 里不连续也按出现顺序编）', () => {
    const inQ = Q.filter(r => r[3] === 'comm').map(r => r[0])
    inQ.forEach((stem, n) => expect(catalog.cardOf(checkKey('comm', n))!.stem).toBe(stem))
  })

  it('专用题：正确答案是第一个选项（answer 0），格式是纯文本，保留阶段和代码', () => {
    const c = catalog.cardOf('template#c0')!
    expect(c).toMatchObject({ kind: 'check', answer: 0, format: 'text', stage: 1 })
    expect(c.code).toContain('v-if')
    expect(catalog.cardOf('template#c1')!.code).toBeUndefined()
  })

  it('没有归不到章的题：每题的章 id 都是真实存在的章', () => {
    const ids = new Set(chapters.map(c => c.id))
    for (const r of Q) expect(ids.has(r[3]), `题「${r[0].slice(0, 20)}」的章 ${r[3]} 不存在`).toBe(true)
  })

  it('题的阶段由所属章推出，题库里不再单独存阶段号', () => {
    for (const c of catalog.all.filter(c => c.kind === 'check')) expect(c.stage, `章 ${c.chapterId}`).toBe(stageOfChapter.get(c.chapterId))
    for (const r of Q) expect(typeof stageOfChapter.get(r[3]), `章 ${r[3]} 必须属于某个阶段`).toBe('number')
  })

  it('键不重复', () => {
    const keys = catalog.all.map(c => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('章内自测卡片', () => {
  it('每章的自测卡片数 = 该章非先猜自测题数（先猜题不进复习卡片）', () => {
    for (const c of chapters) expect(catalog.scCards(c.id).length).toBe(c.scCount)
    expect(catalog.all.filter(c => c.kind === 'sc').length).toBe(chapters.reduce((n, c) => n + c.scCount, 0))
  })

  it('先猜题（predict）不会被数进自测卡片', () => {
    const withPredict = fs.readdirSync(chaptersDir).some(f => /<Sc\b[^>]*\bpredict\b/.test(fs.readFileSync(path.join(chaptersDir, f), 'utf8')))
    expect(withPredict).toBe(true) // 确认课程里真有先猜题，上面的数量断言才有意义
  })

  it('keysOfChapter：先自测（#0、#1…），后专用题（#c0、#c1…）', () => {
    const keys = catalog.keysOfChapter('template')
    const nSc = chapters.find(c => c.id === 'template')!.scCount
    expect(keys.slice(0, nSc)).toEqual(Array.from({ length: nSc }, (_, i) => `template#${i}`))
    expect(keys.slice(nSc)).toEqual(['template#c0', 'template#c1', 'template#c2', 'template#c3', 'template#c4'])
    expect(catalog.keysOfChapter('nope')).toEqual([])
  })
})

describe('阶段题池', () => {
  it('stagePools：pool 是这些章的自测，fresh 是这些章的专用题', () => {
    const ids = chapters.filter(c => c.stage === 1).map(c => c.id)
    const { pool, fresh } = stagePools(catalog, ids)
    expect(pool.every(c => c.kind === 'sc' && ids.includes(c.chapterId))).toBe(true)
    expect(fresh.every(c => c.kind === 'check' && ids.includes(c.chapterId))).toBe(true)
    expect(fresh.length).toBe(Q.filter(r => stageOfChapter.get(r[3]) === 1).length)
  })

  it('每个阶段的可用题数（锁住：补题时这张表要跟着改）：章数、章内自测数、专用题（#cN）数', () => {
    const table = [1, 2, 3, 4, 5, 6].map(stage => {
      const ids = chapters.filter(c => c.stage === stage).map(c => c.id)
      const { pool, fresh } = stagePools(catalog, ids)
      return [stage, ids.length, pool.length, fresh.length]
    })
    expect(table).toEqual([
      [1, 4, 21, 11],
      [2, 7, 39, 16],
      [3, 3, 15, 9],
      [4, 3, 15, 6],
      [5, 5, 24, 10],
      [6, 4, 20, 8]
    ])
  })

  it('阶段 1 到 6 都能抽满 12 题；专用题最多 8 道，不够 8 道时用章内自测补足（阶段 4 只有 6 道专用题，抽 6 道专用题 + 6 道自测）', () => {
    const fresh8: Record<number, number> = { 1: 8, 2: 8, 3: 8, 4: 6, 5: 8, 6: 8 }
    for (const stage of [1, 2, 3, 4, 5, 6]) {
      const { pool, fresh } = stagePools(catalog, chapters.filter(c => c.stage === stage).map(c => c.id))
      const picks = pickStageQuestions(pool, fresh, {}, () => 0.5)
      expect(picks.length, `阶段 ${stage}`).toBe(12)
      expect(picks.filter(p => p.kind === 'check').length, `阶段 ${stage} 的专用题数`).toBe(fresh8[stage])
      expect(new Set(picks.map(p => p.key)).size, `阶段 ${stage} 不重复`).toBe(12)
    }
  })
})

describe('读写 __srs', () => {
  it('srsRecord：第一次答对进盒子 1，明天后到期；写在 __srs 里', () => {
    const p: Progress = {}
    srsRecord(p, 'refs#0', true, NOW)
    expect(p.__srs!['refs#0']).toEqual({ box: 1, n: 1, due: NOW + DAY, last: NOW })
  })

  it('srsRecordGated：答对没到期的卡片不改记录，返回 false；答错照样重置，返回 true', () => {
    const p: Progress = { __srs: { 'refs#0': srsCard({ box: 2, due: NOW + 2 * DAY }) } }
    const before = { ...p.__srs!['refs#0'] }
    expect(srsRecordGated(p, 'refs#0', true, NOW)).toBe(false)
    expect(p.__srs!['refs#0']).toEqual(before)
    expect(srsRecordGated(p, 'refs#0', false, NOW)).toBe(true)
    expect(p.__srs!['refs#0']).toMatchObject({ box: 0, due: NOW + DAY })
  })

  it('srsRecordGated：到期的卡片答对升一级', () => {
    const p: Progress = { __srs: { 'refs#0': srsCard({ box: 1, due: NOW - 1 }) } }
    expect(srsRecordGated(p, 'refs#0', true, NOW)).toBe(true)
    expect(p.__srs!['refs#0'].box).toBe(2)
  })

  it('dueCards：只返回到期且题目还在的卡片，最早到期的在前；learnedCards：所有有记录且题目还在的', () => {
    const p: Progress = {
      __srs: {
        'refs#0': srsCard({ due: NOW - DAY }),
        'template#c0': srsCard({ due: NOW - 3 * DAY }),
        'refs#1': srsCard({ due: NOW + DAY }),
        'gone#0': srsCard({ due: NOW - 9 * DAY }) // 题已经不存在
      }
    }
    expect(dueCards(p, catalog, NOW).map(c => c.key)).toEqual(['template#c0', 'refs#0'])
    expect(learnedCards(p, catalog).map(c => c.key).sort()).toEqual(['refs#0', 'refs#1', 'template#c0'])
    expect(srsAll({}).constructor).toBe(Object)
  })
})

describe('章内自测作答：只有第一次作答计入复习和首答正确率', () => {
  it('第一次作答：记 tried / first / sc，并写入复习卡片', () => {
    const p: Progress = {}
    expect(answerSelfCheck(p, 'refs', 2, 3, false, NOW)).toBe(true)
    expect(p.refs.sc[2]).toBe(3)
    expect(p.refs.tried[2]).toBe(true)
    expect(p.refs.first[2]).toBe(false)
    expect(p.__srs!['refs#2']).toMatchObject({ box: 0, n: 1 })
  })

  it('再次作答：只更新选中的选项，首答正确率和复习卡片不变', () => {
    const p: Progress = {}
    answerSelfCheck(p, 'refs', 2, 3, false, NOW)
    expect(answerSelfCheck(p, 'refs', 2, 1, true, NOW + DAY)).toBe(false)
    expect(p.refs.sc[2]).toBe(1)
    expect(p.refs.first[2]).toBe(false)
    expect(p.__srs!['refs#2']).toMatchObject({ box: 0, n: 1, last: NOW })
  })

  it('不同的题各自独立', () => {
    const p: Progress = {}
    answerSelfCheck(p, 'refs', 0, 1, true, NOW)
    answerSelfCheck(p, 'refs', 1, 0, true, NOW)
    expect(Object.keys(p.__srs!).sort()).toEqual(['refs#0', 'refs#1'])
  })
})
