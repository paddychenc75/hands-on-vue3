// 第 9 章组合式函数的示例：跟踪指针在某个元素内的位置（旧版 useMouse）。
//   const pad = ref<HTMLElement | null>(null)
//   const { x, y } = useMouse(pad)
import { onMounted, onUnmounted, ref, type Ref } from 'vue'

export function useMouse(target: Ref<HTMLElement | null>) {
  const x = ref(0)
  const y = ref(0)
  function update(e: PointerEvent) {
    const r = target.value!.getBoundingClientRect()
    x.value = Math.round(e.clientX - r.left)
    y.value = Math.round(e.clientY - r.top)
  }
  let el: HTMLElement | null = null
  onMounted(() => {
    el = target.value
    el!.addEventListener('pointermove', update)
  })
  onUnmounted(() => {
    if (el) el.removeEventListener('pointermove', update)
  })
  return { x, y }
}
