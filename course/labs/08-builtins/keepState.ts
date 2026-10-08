// KeepAlive 实验台的共享状态（旧版是闭包变量）：日志元素、存活的组件实例名单，
// 以及三个标签页组件共用的生命周期钩子。KeepAlive 的 include 按组件名匹配，
// 所以 TabA / TabB / TabC 必须是三个名字不同的组件（见 KeepTabA.vue 等）。
import { onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import { domLog } from '../_shared'

export const alive = ref<string[]>([])
let logEl: HTMLElement | null = null

export const setLogEl = (el: HTMLElement | null) => { logEl = el }
export const L = (c: string, m: string) => domLog(logEl, c, m)

const touch = (n: string) => { alive.value = alive.value.filter(x => x !== n).concat(n) }
const drop = (n: string) => { alive.value = alive.value.filter(x => x !== n) }

export function useTabHooks(name: string) {
  L('m', name + ' setup（创建新实例）')
  onMounted(() => { touch(name); L('rn', name + ' onMounted') })
  onActivated(() => { touch(name); L('rn', name + ' onActivated') })
  onDeactivated(() => L('tg', name + ' onDeactivated（进入缓存）'))
  onUnmounted(() => { drop(name); L('x', name + ' onUnmounted（实例销毁）') })
}
