// 界面和学习机制引擎（course/engine/）之间的薄封装。界面读写进度只经过这里，不直接碰 localStorage。
//   - 进度存在单个 localStorage 键 hands-on-vue3-v1（引擎的 store.ts）。旧版零散的进度键由引擎在第一次读取时迁移。
//   - 引擎的进度对象是普通对象，不会触发 Vue 更新。这里用 rev 做“版本号”：读取函数先读 rev，
//     写进度（mutate）和其他标签页改了进度时 rev 加 1，依赖它的 computed 就会重新计算。
//   - 为了让服务端渲染和客户端首次渲染一致，不在模块加载时读进度：组件挂载后调用 ensureReady()，
//     在那之前（含服务端）ready 为 false，所有读取函数返回“空进度”。
import { ref } from 'vue'
import { chapters } from 'virtual:course-meta'
import type { ChapterMeta } from '../../course-data.mts'
import { STAGES, STAGE_COUNT } from '../../../stages'
import { commit, cp, initProgress, progress, save, subscribeProgress } from '../../../engine/store'
import { parseKey } from '../../../engine/cards'
import { shouldAutoComplete } from '../../../engine/logic/completion'
import { dueKeys } from '../../../engine/logic/srs'
import type { ChapterProgress, ChapterSpec, LastPos, PredictRecord, Progress } from '../../../engine/types'

export { STAGES, STAGE_COUNT }
export type { LastPos }

/** 计入进度的章：属于某个阶段的页面（速查表、综合测验不计入）。已按阶段、章号排好 */
export const progressChapters: ChapterMeta[] = chapters.filter(c => c.stage != null)
export const chapterById = (id: string) => chapters.find(c => c.id === id)
export const chapterByFile = (file: string) => chapters.find(c => c.file === file)
export const chapterByPath = (p: string) => {
  const m = /\/chapters\/([\w-]+?)(?:\.html)?\/?$/.exec(p)
  return m ? chapterByFile(m[1]) : undefined
}
/** 一章所属阶段的章列表 */
export const chaptersOfStage = (stage: number) => progressChapters.filter(c => c.stage === stage)

/** 引擎判断完成用的静态信息：自测正确答案和练习 id */
export const specOf = (c: ChapterMeta): ChapterSpec => ({ id: c.id, scAnswers: c.scAnswers, exercises: c.ex })
export const specs: ChapterSpec[] = progressChapters.map(specOf)
const specById = (id: string): ChapterSpec | undefined => specs.find(s => s.id === id)

// ---------------- 就绪和版本号 ----------------

/** 页面挂载后才读进度，避免服务端渲染和客户端首次渲染不一致 */
export const ready = ref(false)
/** 进度版本号。读进度的函数先读它，这样进度一变，用到它的 computed 就会重新计算 */
export const rev = ref(0)

let started = false
/** 在组件的 onMounted 里调用（可以重复调用）：读取进度（必要时迁移旧键），并订阅变化 */
export function ensureReady(): void {
  if (started || typeof window === 'undefined') return
  started = true
  initProgress({ chapters: specs })
  subscribeProgress(() => { rev.value++ })
  ready.value = true
}

/** 在 computed 里先调用它，登记“依赖进度” */
export function track(): void {
  void rev.value
  void ready.value
}

/** 读一章的进度，没有返回 undefined。不会创建空记录。未就绪时返回 undefined */
export function cpOf(id: string): ChapterProgress | undefined {
  track()
  return ready.value ? progress[id] : undefined
}

/** 整个进度对象（只读用）。未就绪时是空对象 */
export function allProgress(): Progress {
  track()
  return ready.value ? progress : {}
}

/**
 * 改进度：fn 里直接改 Progress（用引擎的函数），之后保存并通知界面。
 * silent 为真时只保存、不通知（输入草稿每个按键都要存，不需要刷新界面）。
 */
export function mutate(fn: (p: Progress) => void, opts: { silent?: boolean } = {}): void {
  ensureReady()
  fn(progress)
  if (opts.silent) save()
  else commit()
}

/**
 * 章内自测答完或练习通过后调用：达到完成标准（自测全部答对 + 练习全部通过）就标记完成。
 * 在 mutate 的回调里调用，这样完成标记和这次作答一起保存。返回这次是否新标记完成。
 */
export function completeIfMet(p: Progress, chapterId: string): boolean {
  const spec = specById(chapterId)
  if (!spec) return false
  const c = (p[chapterId] = p[chapterId] || { sc: {}, ex: {}, done: false }) as ChapterProgress
  if (!shouldAutoComplete(c, spec)) return false
  c.done = true
  c.doneAt = Date.now()
  return true
}

/** 取（必要时创建）一章的进度，只在 mutate 的回调里用 */
export const chapterOf = (chapterId: string): ChapterProgress => cp(chapterId)

// ---------------- 完成状态 ----------------

export const isDone = (id: string): boolean => !!cpOf(id)?.done

export type ChapterState = 'todo' | 'doing' | 'done'
export const STATE_LABEL: Record<ChapterState, string> = { todo: '未开始', doing: '进行中', done: '已完成' }

/** 未开始 / 进行中 / 已完成。进行中：答过自测、做过练习（通过、看过答案或失败过），或上次读到这章 */
export function chapterState(id: string): ChapterState {
  const p = cpOf(id)
  if (p?.done) return 'done'
  const c = chapterById(id)
  if (!c) return 'todo'
  if (p) {
    if (Object.keys(p.sc || {}).length) return 'doing'
    if (Object.values(p.ex || {}).some(e => e.passed || e.sawSol || e.fails)) return 'doing'
  }
  const last = ready.value ? progress.__last : undefined
  if (last && last.path === c.link) return 'doing'
  return 'todo'
}

/** 一个阶段已完成的章数和总章数 */
export function stageCount(stage: number): { done: number; total: number } {
  const list = chaptersOfStage(stage)
  return { done: list.filter(c => isDone(c.id)).length, total: list.length }
}

/** 全部完成数和总章数（不含速查表、综合测验） */
export function totalCount(): { done: number; total: number } {
  return { done: progressChapters.filter(c => isDone(c.id)).length, total: progressChapters.length }
}

// ---------------- 复习卡片的数量 ----------------

/** 卡片键对应的题目还存在吗：章存在，且序号没超出这一章的自测题数或专用题数。不用载入题库就能判断 */
export function isKnownKey(key: string): boolean {
  const k = parseKey(key)
  const c = k && chapterById(k.chapterId)
  return !!(k && c && k.index < (k.kind === 'sc' ? c.scCount : c.checkCount))
}

/** 今天到期的复习题数（侧边栏、顶栏、首页的徽标）。和复习页出的题一致：题目已经不存在的键不算 */
export function dueCount(now = Date.now()): number {
  return dueKeys(allProgress().__srs ?? {}, now).filter(isKnownKey).length
}

/** 已经学过（进了复习队列）的题数 */
export function learnedCount(): number {
  return Object.keys(allProgress().__srs ?? {}).filter(isKnownKey).length
}

// ---------------- 阅读位置、先猜 ----------------

export const getLast = (): LastPos | null => (allProgress().__last as LastPos | undefined) ?? null
export function setLast(pos: LastPos): void {
  mutate(p => { p.__last = pos })
}

export const getPred = (labId: string): PredictRecord | undefined => allProgress().__pred?.[labId]
export function setPred(labId: string, rec: PredictRecord): void {
  mutate(p => { (p.__pred = p.__pred || {})[labId] = rec })
}

export function agoText(t: number, now = Date.now()) {
  const m = Math.round((now - t) / 60000)
  return m < 1 ? '刚才' : m < 60 ? m + ' 分钟前' : m < 1440 ? Math.round(m / 60) + ' 小时前' : Math.round(m / 1440) + ' 天前'
}
