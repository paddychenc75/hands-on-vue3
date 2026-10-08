// 给实验台数更新次数：组件每更新一次（onUpdated），就把徽章上的数字加 1。
// 数字直接写进 DOM，不用响应式数据，否则“数更新”这件事本身会引起更新。
import { onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'

const badges = new Set<{ el: HTMLElement | null; n: number }>()

export function useRenderCount() {
  const el = ref<HTMLElement | null>(null)
  const rec = { el: null as HTMLElement | null, n: 0 }
  onMounted(() => { rec.el = el.value; badges.add(rec); show() })
  onUpdated(() => { rec.n++; show() })
  onBeforeUnmount(() => badges.delete(rec))
  function show() { if (rec.el) rec.el.textContent = String(rec.n) }
  return el
}

export function resetCounts() {
  badges.forEach(b => { b.n = 0; if (b.el) b.el.textContent = '0' })
}
