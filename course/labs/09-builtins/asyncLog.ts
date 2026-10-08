// Suspense 实验台的日志：每行前面带距离 t0 的毫秒数（旧版是闭包变量）
import { domLog } from '../_shared'

export const t0 = { v: 0 }
let logEl: HTMLElement | null = null
export const setLogEl = (el: HTMLElement | null) => { logEl = el }
export const clearLog = () => { if (logEl) logEl.innerHTML = '' }
export const L = (c: string, m: string) =>
  domLog(logEl, c, '+' + String(Math.round(performance.now() - t0.v)).padStart(4, ' ') + 'ms  ' + m)
