// 日志小工具（旧版 domLog / dLogBuf，第 5、6、8、11、20 章等实验台共用）。
//
// 为什么用原生 DOM 写日志而不用响应式数组：自定义指令的钩子、生命周期钩子在渲染过程中运行，
// 钩子里改响应式数据会触发新的渲染，新的渲染又运行钩子，形成死循环。
// 用法：模板里放 <div class="log" ref="logRef"></div>，然后 domLog(logRef.value, 'rn', '消息')。
// 日志行的颜色类：tg 橙、tr 蓝、rn 绿、x 红、m 灰（样式在 style.css 的 .log 里）。最新的在最上面，最多保留 80 行。
export function domLog(el: HTMLElement | null | undefined, cls: string, msg: string): void {
  if (!el) return
  const d = document.createElement('div')
  d.className = cls
  const t = new Date()
  d.textContent = String(t.getSeconds()).padStart(2, '0') + '.' + String(t.getMilliseconds()).padStart(3, '0') + '  ' + msg
  el.prepend(d)
  while (el.children.length > 80) el.lastChild!.remove()
}

/**
 * 挂载前的日志先缓存，日志元素出现后再写入（第 8、11、20 章实验台共用）。
 *   const { L, attach } = dLogBuf()
 *   L('rn', '消息')            // 随时可以调用
 *   onMounted(() => attach(logRef.value))
 */
export function dLogBuf() {
  let el: HTMLElement | null = null
  const q: [string, string][] = []
  return {
    L(c: string, m: string) {
      if (el) domLog(el, c, m)
      else q.push([c, m])
    },
    attach(x: HTMLElement | null | undefined) {
      el = x || null
      if (el) q.splice(0).forEach(([c, m]) => domLog(el, c, m))
    }
  }
}
