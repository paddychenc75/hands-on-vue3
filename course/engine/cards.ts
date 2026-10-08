/* 间隔复习卡片：卡片键 -> 题目的查找，以及读写进度里的 __srs。纯逻辑在 logic/srs.ts。
   卡片键规则（和 hands-on-react 一致，"课"换成"章"）：
     章内自测第 N 题（N 从 0 起，即它在本章自测块里的序号，和 sc 的序号一致）：`章id#N`
     阶段测验专用题第 N 题：`章id#cN`。来源是综合测验题库（labs/27-quiz/questions.ts 的 Q）：
       按每题所属的章分组，组内按它在题库里的出现顺序编号 N
   键一旦发布就不能变：题库和自测题都只能在末尾追加。
   "先猜"题不进复习卡片（单独记在进度的 __pred）。
   题目数据由调用方传入（自测题来自虚拟模块 virtual:course-selfchecks，题库来自 questions.ts），
   所以本文件不依赖 vite 虚拟模块，可以直接单元测试。 */
import type { CardItem, ChapterProgress, Progress, QuizBankRow, SelfCheckData, SrsCard } from './types.ts'
import { dueKeys, gatedNextCard, nextCard } from './logic/srs.ts'

/** 卡片键：章内自测 */
export const scKey = (chapterId: string, n: number): string => `${chapterId}#${n}`
/** 卡片键：阶段测验专用题 */
export const checkKey = (chapterId: string, n: number): string => `${chapterId}#c${n}`

/** 解析卡片键。不合法返回 null */
export function parseKey(key: string): { chapterId: string; kind: 'sc' | 'check'; index: number } | null {
  const m = /^([^#]+)#(c?)(\d+)$/.exec(key)
  return m ? { chapterId: m[1], kind: m[2] ? 'check' : 'sc', index: Number(m[3]) } : null
}

export interface Catalog {
  /** 全部卡片：先章内自测，后阶段测验专用题，各自按出现顺序 */
  all: CardItem[]
  /** 键 -> 题目。键不存在返回 null */
  cardOf(key: string): CardItem | null
  /** 一章的全部卡片键：先自测（#0、#1…），后专用题（#c0、#c1…） */
  keysOfChapter(chapterId: string): string[]
  /** 一章的章内自测卡片 / 阶段测验专用题卡片 */
  scCards(chapterId: string): CardItem[]
  checkCards(chapterId: string): CardItem[]
}

/** 用自测题数据和综合测验题库建卡片目录。
    selfchecks 的 key 是 `章id:序号`；序号用 key 里的，不看数组位置，所以数组顺序打乱也不会错位。 */
export function buildCatalog(selfchecks: readonly SelfCheckData[], quiz: readonly QuizBankRow[]): Catalog {
  const byKey = new Map<string, CardItem>()
  const sc: CardItem[] = []
  for (const s of selfchecks) {
    const index = Number(s.key.slice(s.key.lastIndexOf(':') + 1))
    const key = scKey(s.chapterId, index)
    if (byKey.has(key)) throw new Error(`重复的卡片键：${key}`)
    const item: CardItem = { key, chapterId: s.chapterId, kind: 'sc', index, stem: s.stem, options: [...s.opts], answer: s.a, explain: s.explain, format: 'html' }
    byKey.set(key, item)
    sc.push(item)
  }
  const check: CardItem[] = []
  const counter = new Map<string, number>()
  for (const row of quiz) {
    const chapterId = row[3]
    const index = counter.get(chapterId) ?? 0
    counter.set(chapterId, index + 1)
    const key = checkKey(chapterId, index)
    const item: CardItem = {
      key,
      chapterId,
      kind: 'check',
      index,
      stem: row[0],
      options: [...row[1]],
      answer: 0, // 题库里第一个选项总是正确答案
      explain: row[2],
      format: 'text',
      stage: row[4]
    }
    if (row.length > 5) item.code = row[5]
    byKey.set(key, item)
    check.push(item)
  }
  const bySc = (id: string) => sc.filter(c => c.chapterId === id).sort((a, b) => a.index - b.index)
  const byCheck = (id: string) => check.filter(c => c.chapterId === id)
  return {
    all: [...sc, ...check],
    cardOf: key => byKey.get(key) ?? null,
    scCards: bySc,
    checkCards: byCheck,
    keysOfChapter: id => [...bySc(id), ...byCheck(id)].map(c => c.key)
  }
}

/** 一个阶段的题池：pool 是这些章的章内自测，fresh 是这些章的阶段测验专用题。给 logic/stageCheck.ts 的 pickStageQuestions 用 */
export function stagePools(catalog: Catalog, chapterIds: readonly string[]): { pool: CardItem[]; fresh: CardItem[] } {
  return { pool: chapterIds.flatMap(id => catalog.scCards(id)), fresh: chapterIds.flatMap(id => catalog.checkCards(id)) }
}

/* ---------- 读写进度里的 __srs ---------- */

export const srsAll = (p: Progress): Record<string, SrsCard> => (p.__srs = p.__srs || {})

/** 无门槛记录（章内自测第一次作答）。调用方随后要保存并发进度变化事件 */
export function srsRecord(p: Progress, key: string, ok: boolean, now: number = Date.now()): void {
  const s = srsAll(p)
  s[key] = nextCard(s[key], ok, now)
}

/** 带门槛的记录：答对没到期的卡片不改复习间隔（热身、混合练习、阶段测验用）；答错照样重置。返回有没有改动 */
export function srsRecordGated(p: Progress, key: string, ok: boolean, now: number = Date.now()): boolean {
  const s = srsAll(p)
  const next = gatedNextCard(s[key], ok, now)
  if (next === s[key]) return false
  s[key] = next
  return true
}

/** 到期的卡片，最早到期的在前。目录里找不到的键（题被删或改了键）跳过 */
export const dueCards = (p: Progress, catalog: Catalog, now: number = Date.now()): CardItem[] =>
  dueKeys(srsAll(p), now)
    .map(catalog.cardOf)
    .filter((c): c is CardItem => !!c)

/** 已经学过（有复习记录）的卡片 */
export const learnedCards = (p: Progress, catalog: Catalog): CardItem[] =>
  Object.keys(srsAll(p))
    .map(catalog.cardOf)
    .filter((c): c is CardItem => !!c)

/* ---------- 章内自测的作答 ---------- */

const chapterOf = (p: Progress, id: string): ChapterProgress => (p[id] = p[id] || { sc: {}, ex: {}, done: false })

/** 记录一次章内自测作答。只有第一次作答计入复习安排和"首答正确率"；以后重答只更新选中的选项。
    返回这是不是第一次作答。调用方随后要保存、发进度变化事件，并判断是否自动完成 */
export function answerSelfCheck(p: Progress, chapterId: string, n: number, choice: number, ok: boolean, now: number = Date.now()): boolean {
  const cp = chapterOf(p, chapterId)
  cp.tried = cp.tried || {}
  cp.first = cp.first || {}
  const first = !cp.tried[n]
  if (first) {
    cp.tried[n] = true
    cp.first[n] = ok
    srsRecord(p, scKey(chapterId, n), ok, now)
  }
  cp.sc[n] = choice
  return first
}
