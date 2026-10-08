// 跨章的学习进度：完成状态、间隔复习、阅读位置。全部存在 localStorage（经 store），键名沿用旧版：
//   done     { <章id>: true }        已完成的章（自动或手动标记）
//   doneAt   { <章id>: 毫秒时间 }    第一次标记完成的时间，复习间隔从它算起
//   revAt    { <章id>: { t, n } }    最近一次复习的时间 t，已连续复习成功的次数 n
//   revLast  [题目 id, …]            上一次复习出过的题，下次优先换别的题
//   last     { path, anchor, h, t }  上次阅读：章路径、小节锚点（标题的 id）、小节标题、时间。旧版结构更复杂，这里简化了
// sc（自测答案）、ex（练习通过状态）、quiz3（综合测验）由各自的组件写，这里只读。
import { chapters } from 'virtual:course-meta'
import { store } from './store'

export const DAY = 864e5
/** 完成后第 1 次复习隔 2 天，第 2 次再隔 7 天，之后每次隔 30 天 */
export const GAPS = [2, 7, 30]

/** 计入进度的章：属于某个阶段的页面（速查表、综合测验不计入）。已按阶段、章号排好 */
export const progressChapters = chapters.filter(c => c.stage != null)
export const chapterById = (id: string) => chapters.find(c => c.id === id)
export const chapterByFile = (file: string) => chapters.find(c => c.file === file)
export const chapterByPath = (p: string) => {
  const m = /\/chapters\/([\w-]+?)(?:\.html)?\/?$/.exec(p)
  return m ? chapterByFile(m[1]) : undefined
}

type Dict<T> = Record<string, T>

// ---------------- 完成状态 ----------------

export const isDone = (id: string) => !!store.get<Dict<boolean>>('done', {})[id]

export function setDone(id: string, v: boolean) {
  const done = { ...store.get<Dict<boolean>>('done', {}) }
  if (v) done[id] = true
  else delete done[id]
  store.set('done', done)
  if (v) {
    const at = store.get<Dict<number>>('doneAt', {})
    if (!at[id]) store.set('doneAt', { ...at, [id]: Date.now() })
  }
}

/** 本章答过的自测题数，和自测题总数 */
export function scProgress(id: string) {
  const c = chapterById(id)
  const ans = store.get<Dict<number>>('sc', {})
  let n = 0
  for (let i = 0; i < (c?.scCount ?? 0); i++) if (id + ':' + i in ans) n++
  return { answered: n, total: c?.scCount ?? 0 }
}

/** 本章通过的练习数（不含看过答案后通过的），和练习总数 */
export function exProgress(id: string) {
  const c = chapterById(id)
  const ex = store.get<Dict<unknown>>('ex', {})
  const list = c?.ex ?? []
  return { passed: list.filter(x => ex[x] === true).length, total: list.length }
}

/**
 * 自测全部答过、练习全部通过，就自动标记完成。没有自测题的章不会自动完成。
 * 在答题、练习通过之后调用。已经完成的章不会再动（所以手动取消后，不会马上被重新标记）。
 */
export function autoDone(id: string) {
  const c = chapterById(id)
  if (!c || c.stage == null || c.scCount === 0 || isDone(id)) return false
  const s = scProgress(id), e = exProgress(id)
  if (s.answered < s.total || e.passed < e.total) return false
  setDone(id, true)
  return true
}

export type ChapterState = 'todo' | 'doing' | 'done'
/** 未开始 / 进行中 / 已完成。进行中：答过自测、通过或做过练习、综合测验答过题，或上次读到这章 */
export function chapterState(id: string): ChapterState {
  if (isDone(id)) return 'done'
  const c = chapterById(id)
  if (!c) return 'todo'
  if (scProgress(id).answered > 0) return 'doing'
  const ex = store.get<Dict<unknown>>('ex', {})
  if (c.ex.some(x => ex[x])) return 'doing'
  if (c.id === 'quiz' && Object.keys(store.get<Dict<number>>('quiz3', {})).length) return 'doing'
  const last = store.get<LastPos | null>('last', null)
  if (last && last.path === c.link) return 'doing'
  return 'todo'
}
export const STATE_LABEL: Record<ChapterState, string> = { todo: '未开始', doing: '进行中', done: '已完成' }

// ---------------- 间隔复习 ----------------

interface Rev { t: number; n: number }
function revInfo(id: string): Rev | null {
  const r = store.get<Dict<number | Rev>>('revAt', {})[id]
  return r == null ? null : typeof r === 'number' ? { t: r, n: 1 } : r
}

/** 下次该复习的时间（毫秒）。没完成的章没有 */
export function nextDue(id: string): number | null {
  const d = store.get<Dict<number>>('doneAt', {})[id]
  if (!isDone(id) || !d) return null
  const r = revInfo(id)
  return r ? r.t + GAPS[Math.min(r.n, GAPS.length - 1)] * DAY : d + GAPS[0] * DAY
}

/** 现在到期的章（旧 section id） */
export function dueChapters(now = Date.now()): string[] {
  return progressChapters.filter(c => { const t = nextDue(c.id); return t != null && t <= now }).map(c => c.id)
}

/** 复习完一章：ok 表示这章的复习题全部答对。答错的章 n 归零，2 天后再复习 */
export function markReviewed(id: string, ok: boolean) {
  if (!isDone(id)) return
  const all = { ...store.get<Dict<Rev | number>>('revAt', {}) }
  const r = revInfo(id), now = Date.now()
  if (ok && r && now - r.t < DAY) return // 一天内重复复习不再加次数
  all[id] = { t: now, n: ok ? (r ? r.n + 1 : 1) : 0 }
  store.set('revAt', all)
}

// ---------------- 阅读位置 ----------------

export interface LastPos { path: string; anchor: string; h: string; t: number }

export function agoText(t: number, now = Date.now()) {
  const m = Math.round((now - t) / 60000)
  return m < 1 ? '刚才' : m < 60 ? m + ' 分钟前' : m < 1440 ? Math.round(m / 60) + ' 小时前' : Math.round(m / 1440) + ' 天前'
}
