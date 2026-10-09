/* 跨设备同步的本地状态与启动入口（主包里只放这个很小的文件）。
   同步引擎本身（syncEngine.ts）是独立的异步 chunk：只有开启了同步（本机存了配置）的人才会加载，没开启就一个请求也不发。
   存储键（都不是学习进度本身；令牌只存在 SYNC_KEY 里，只发往 api.github.com）：
   - hands-on-vue3-v1:sync         配置 { token, gist, login, device }
   - hands-on-vue3-v1:sync-status  状态（不含令牌）：最近一次结果、是否有未推送的改动、错误说明
   - hands-on-vue3-v1:backup       覆盖本机进度之前的备份，最多 2 份 */
import { STORE_KEY } from './store.ts'
import type { MergeContext } from './logic/merge.ts'

export const SYNC_KEY = STORE_KEY + ':sync'
export const STATUS_KEY = STORE_KEY + ':sync-status'
export const BACKUP_KEY = STORE_KEY + ':backup'
export const STATUS_EVENT = 'hov-sync-status'

export interface SyncConfig {
  token: string
  gist: string
  login: string
  device: string
}
export type SyncState = 'synced' | 'syncing' | 'pending' | 'error'
export interface SyncStatus {
  state: SyncState
  /** 最近一次成功同步的时间 */
  at?: number
  /** 出错或等待的原因（给人看的中文，不含令牌） */
  msg?: string
  /** 错误类别，界面据此给出对应的按钮 */
  code?: string
  /** 有还没推送到云端的本机改动 */
  dirty?: boolean
  /** 被限速时，预计什么时候再试 */
  retryAt?: number
  /** 这个页面加载之后，进度被另一台设备（或另一个标签页）更新的章数 */
  remoteChanged?: number
  /** 上次从云端读到的 ETag，用来做条件请求 */
  etag?: string
  /** 上次从云端拉取的时间 */
  pulledAt?: number
  /** 上次同步完成时，本机进度（不含阅读位置）的短签名：页面重新加载后拿它判断有没有没推送的改动 */
  sig?: string
}

const read = <T>(key: string): T | null => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}
export const readConfig = (): SyncConfig | null => {
  const c = read<SyncConfig>(SYNC_KEY)
  return c && typeof c.token === 'string' && typeof c.gist === 'string' ? c : null
}
export const syncEnabled = (): boolean => typeof window !== 'undefined' && !!readConfig()
export const readStatus = (): SyncStatus => read<SyncStatus>(STATUS_KEY) || { state: 'synced' }

/** 订阅状态变化（本标签页的写入和其他标签页的写入都会通知）。返回取消订阅的函数 */
export function subscribeStatus(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STATUS_KEY || e.key === SYNC_KEY || e.key === null) cb()
  }
  window.addEventListener(STATUS_EVENT, cb)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(STATUS_EVENT, cb)
    window.removeEventListener('storage', onStorage)
  }
}

/** 合并时要用的课程信息（每章自测的正确答案）。由界面层在启动时登记：引擎不依赖 vite 的虚拟模块 */
let mergeCtx: MergeContext = {}
export const setMergeContext = (ctx: MergeContext): void => {
  mergeCtx = ctx
}
export const getMergeContext = (): MergeContext => mergeCtx

/** 加载同步引擎（独立 chunk） */
export const loadSyncEngine = () => import('./syncEngine.ts')

let booted = false
/** 页面启动时调用：本机开启了同步才加载引擎。别的标签页开启同步时（storage 事件）这个页面也会跟着启动 */
export function bootSync(): void {
  if (typeof window === 'undefined' || booted) return
  const go = () => {
    if (booted || !readConfig()) return
    booted = true
    loadSyncEngine().then(m => m.start())
  }
  window.addEventListener('storage', e => {
    if (e.key === SYNC_KEY) go()
  })
  if (readConfig()) setTimeout(go, 600)
}
