// 同步状态的界面封装（顶栏标记、课程地图页的面板共用）。只用主包里的小文件 syncState / logic/syncView，不加载同步引擎。
// 服务端渲染和首次水合时 enabled 为 false；挂载后读本机配置，并随状态变化和每 30 秒更新一次（为了“几分钟前”）。
import { onBeforeUnmount, onMounted, reactive } from 'vue'
import { readConfig, readStatus, subscribeStatus, type SyncState, type SyncStatus } from '../../../engine/syncState'
import { lastFour } from '../../../engine/logic/syncView'

export interface SyncView {
  enabled: boolean
  /** 账号名、Gist 编号、令牌末四位（令牌本身不会出现在界面状态里） */
  login: string
  gist: string
  tail: string
  status: SyncStatus
  now: number
}
export const STATE_LABEL: Record<SyncState, string> = { synced: '已同步', syncing: '同步中', pending: '有未同步的更改', error: '同步出错' }
/** 这几类错误要换令牌：界面在旁边放“重新创建令牌”的链接 */
export const TOKEN_CODES = ['auth', 'scope', 'forbidden']

export function useSyncStatus(): SyncView {
  const v = reactive<SyncView>({ enabled: false, login: '', gist: '', tail: '', status: { state: 'synced' }, now: 0 })
  const refresh = () => {
    const c = readConfig()
    v.enabled = !!c
    v.login = c?.login || ''
    v.gist = c?.gist || ''
    v.tail = c ? lastFour(c.token) : ''
    v.status = readStatus()
    v.now = Date.now()
  }
  let off = () => {}
  let timer = 0
  onMounted(() => {
    refresh()
    timer = window.setInterval(refresh, 30e3)
    off = subscribeStatus(refresh)
  })
  onBeforeUnmount(() => {
    clearInterval(timer)
    off()
  })
  return v
}
