/* 旧进度 -> 新进度的一次性迁移（纯函数）。
   旧进度是零散的 localStorage 键，前缀 vue3deep:。调用方把"去掉前缀的键名 -> 解析后的值"收成一个对象传进来，
   这里只做转换，不碰存储，也不读时间。
   能对应上的迁：已完成的章、已通过的练习（区分是否看过答案）、练习草稿、"先猜"的答案、上次阅读位置，
   章内自测只迁答对的。旧的按章复习记录（revAt、revLast）和综合测验记录（quiz3）不迁，旧键也不删（由调用方负责）。 */
import type { ChapterProgress, ChapterSpec, ExerciseProgress, Progress } from '../types.ts'

/** 旧键值：键名是去掉 `vue3deep:` 前缀后的名字（done、doneAt、ex、exSol、sc、guess、last，以及草稿 `ex:<练习id>`） */
export type LegacyValues = Record<string, unknown>

/** 迁移需要知道的课程结构：每章的自测正确答案和练习 id（来自构建时抽取的数据） */
export interface MigrationContext {
  chapters: ChapterSpec[]
}

/** 旧键的前缀 */
export const LEGACY_PREFIX = 'vue3deep:'

/** 会被迁移读取的旧键名（草稿 `ex:<id>` 另算）。用来判断"有没有旧进度可迁" */
export const LEGACY_KEYS = ['done', 'doneAt', 'ex', 'exSol', 'sc', 'guess', 'last'] as const

/** 有没有值得迁的旧进度 */
export const hasLegacy = (old: LegacyValues): boolean => LEGACY_KEYS.some(k => old[k] != null) || Object.keys(old).some(k => k.startsWith('ex:'))

const dict = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {})

export function migrateLegacy(old: LegacyValues, ctx: MigrationContext): Progress {
  const out: Progress = {}
  const done = dict(old.done)
  const doneAt = dict(old.doneAt)
  const sc = dict(old.sc)
  const ex = dict(old.ex)
  const exSol = dict(old.exSol)
  const chapter = (id: string): ChapterProgress => (out[id] = out[id] || { sc: {}, ex: {}, done: false })

  for (const spec of ctx.chapters) {
    const id = spec.id
    // 完成状态
    if (done[id]) {
      const cp = chapter(id)
      cp.done = true
      if (typeof doneAt[id] === 'number') cp.doneAt = doneAt[id]
    }
    // 章内自测：旧键 `章id:序号` 存的是选中的选项下标。只迁答对的
    spec.scAnswers.forEach((answer, i) => {
      if (sc[id + ':' + i] === answer) chapter(id).sc[i] = answer
    })
    // 练习
    for (const exId of spec.exercises) {
      const passed = ex[exId] === true || ex[exId] === 'sol'
      const sawSol = !!exSol[exId] || ex[exId] === 'sol'
      const draft = dict(old['ex:' + exId])
      const hasDraft = typeof draft.tpl === 'string' && typeof draft.js === 'string'
      if (!passed && !sawSol && !hasDraft) continue
      const e: ExerciseProgress = { passed }
      if (sawSol) e.sawSol = true
      if (passed) e.help = ex[exId] === 'sol' ? 'solution' : false
      if (hasDraft) e.code = { tpl: draft.tpl, js: draft.js }
      chapter(id).ex[exId] = e
    }
  }

  // 先猜：sc 里的 `p:<实验台id>` 是已核对的答案，guess 里是还没核对的猜测
  const pred: Record<string, { pick: number; checked?: boolean }> = {}
  for (const [k, v] of Object.entries(dict(old.guess))) {
    if (k.startsWith('p:') && Number.isInteger(v)) pred[k.slice(2)] = { pick: v }
  }
  for (const [k, v] of Object.entries(sc)) {
    if (k.startsWith('p:') && Number.isInteger(v)) pred[k.slice(2)] = { pick: v, checked: true }
  }
  if (Object.keys(pred).length) out.__pred = pred

  // 上次阅读位置
  const last = dict(old.last)
  if (typeof last.path === 'string') {
    out.__last = { path: last.path, anchor: String(last.anchor ?? ''), h: String(last.h ?? ''), t: Number(last.t) || 0 }
  }

  return out
}
