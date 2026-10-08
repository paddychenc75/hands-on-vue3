// 第 10 章 v-click-outside 实验台的共享部分：状态、日志和指令本身。
// DirOutside（外壳）和 OutsideDropdown（菜单）都要用到同一个指令和计数，所以放在这里。
import { reactive } from 'vue'

export const state = reactive({ active: 0, leaked: 0, cleanup: true })
export const leakedHandlers: ((e: Event) => void)[] = []
// 日志函数由外壳在挂载时设置
export const ctx: { L: (cls: string, msg: string) => void } = { L: () => {} }
let seq = 0

export const vClickOutside = {
  mounted(el: any, b: any) {
    const id = ++seq
    el._co = {
      id,
      fn: b.value,
      handler(e: Event) {
        if (e.composedPath().includes(el)) return
        if (!el.isConnected) { ctx.L('x', '#' + id + ' 的监听运行了，但元素已经卸载（泄漏）'); return }
        el._co.fn(e)
      }
    }
    document.addEventListener('click', el._co.handler)
    state.active++
    ctx.L('rn', '#' + id + ' mounted：在 document 上添加监听。现在有 ' + state.active + ' 个')
  },
  updated(el: any, b: any) { el._co.fn = b.value },
  unmounted(el: any) {
    const co = el._co
    state.active--
    if (state.cleanup) {
      document.removeEventListener('click', co.handler)
      ctx.L('m', '#' + co.id + ' unmounted：删除监听。现在有 ' + state.active + ' 个')
    } else {
      leakedHandlers.push(co.handler)
      state.leaked++
      ctx.L('x', '#' + co.id + ' unmounted：没有删除监听。泄漏 ' + state.leaked + ' 个')
    }
  }
}
