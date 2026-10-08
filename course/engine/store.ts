/* ---------- 进度存储（仅保存在本浏览器） ----------
   数据结构见 course/engine/types.ts 的 Progress。进度存进单个 localStorage 键 hands-on-vue3-v1。
   这里只是读、写、订阅变化的薄封装，业务规则都在 logic/。
   - SSR 安全：没有 window / localStorage（服务端渲染、Node）时进度保持为空对象，不报错。
   - 一次性迁移：首次读取时新键不存在、而旧的零散键（前缀 vue3deep:）存在，就迁过来（规则见 logic/migrate.ts）。
     迁移后不删旧键。迁移需要课程结构（每章的自测答案和练习 id），由 init 的参数传入，
     所以本文件不依赖 vite 虚拟模块。
   - 为了让服务端渲染和客户端首次渲染一致，不在模块加载时读 localStorage：页面挂载后调用一次 init()。 */
import { hasLegacy, LEGACY_PREFIX, migrateLegacy, type LegacyValues, type MigrationContext } from './logic/migrate.ts'
import type { ChapterProgress, Progress } from './types.ts'

export const STORE_KEY = 'hands-on-vue3-v1'
/** 进度变化事件的名字（同一页面里写进度后发出；另一个标签页改了进度时也会发出） */
export const PROGRESS_EVENT = 'hov-progress'

/** localStorage 的最小形状，测试里用假的 */
export interface StorageLike {
  readonly length: number
  key(i: number): string | null
  getItem(k: string): string | null
  setItem(k: string, v: string): void
}

export interface ProgressStore {
  /** 进度对象。原地修改，init 之前是空对象 */
  readonly progress: Progress
  /** 读取进度（必要时从旧键迁移）。可以重复调用，只有第一次读取。服务端什么也不做。返回 progress */
  init(ctx?: MigrationContext): Progress
  /** 把进度写进存储。写不进去（隐私模式等）时忽略 */
  save(): void
  /** 发进度变化事件 */
  emit(): void
  /** save + emit：改完进度后调用这个 */
  commit(): void
  /** 取一章的进度，没有就建一份空的 */
  cp(chapterId: string): ChapterProgress
  /** 订阅进度变化（本页的 emit 和其他标签页的改动），返回取消订阅函数 */
  subscribe(fn: () => void): () => void
}

/** 读出全部旧键：键名去掉前缀，值按 JSON 解析（解析失败的跳过） */
export function readLegacyValues(storage: StorageLike): LegacyValues {
  const out: LegacyValues = {}
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i)
    if (!k || !k.startsWith(LEGACY_PREFIX)) continue
    try {
      out[k.slice(LEGACY_PREFIX.length)] = JSON.parse(storage.getItem(k) as string)
    } catch {
      /* 坏数据跳过 */
    }
  }
  return out
}

export function createProgressStore(opts: { storage?: StorageLike | null; target?: EventTarget | null } = {}): ProgressStore {
  const { storage = null, target = null } = opts
  const progress: Progress = {}
  let loaded = false

  const replaceWith = (data: Progress) => {
    for (const k of Object.keys(progress)) delete progress[k]
    Object.assign(progress, data)
  }
  const readNew = (): Progress | null => {
    try {
      const raw = storage?.getItem(STORE_KEY)
      if (raw == null) return null
      const v = JSON.parse(raw)
      return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
    } catch {
      return {} // 读不到就当空
    }
  }

  const save = () => {
    try {
      storage?.setItem(STORE_KEY, JSON.stringify(progress))
    } catch {
      /* 写不进去就算了 */
    }
  }
  const emit = () => {
    target?.dispatchEvent(new Event(PROGRESS_EVENT))
  }

  return {
    progress,
    init(ctx) {
      if (loaded || !storage) return progress
      const cur = readNew()
      if (cur) {
        replaceWith(cur)
        loaded = true
      } else if (ctx) {
        loaded = true
        const old = readLegacyValues(storage)
        if (hasLegacy(old)) {
          replaceWith(migrateLegacy(old, ctx))
          save() // 写出新键，下次不再迁；旧键不动
        }
      }
      return progress
    },
    save,
    emit,
    commit() {
      save()
      emit()
    },
    cp: id => (progress[id] = progress[id] || { sc: {}, ex: {}, done: false }),
    subscribe(fn) {
      if (!target) return () => {}
      const onStorage = (e: Event) => {
        if ((e as { key?: string | null }).key !== STORE_KEY) return
        replaceWith(readNew() || {}) // 另一个标签页改了进度
        fn()
      }
      target.addEventListener(PROGRESS_EVENT, fn)
      target.addEventListener('storage', onStorage)
      return () => {
        target.removeEventListener(PROGRESS_EVENT, fn)
        target.removeEventListener('storage', onStorage)
      }
    }
  }
}

/** 浏览器里的 localStorage；没有（服务端）或被禁用返回 null */
function browserStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
  } catch {
    return null
  }
}

/** 默认的全局实例：浏览器里读写 localStorage，服务端是空壳 */
export const store: ProgressStore = createProgressStore({ storage: browserStorage(), target: typeof window !== 'undefined' ? window : null })
export const { progress, init: initProgress, save, emit: emitProgress, commit, cp, subscribe: subscribeProgress } = store
