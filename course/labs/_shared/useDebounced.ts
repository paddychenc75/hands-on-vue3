// 第 7 章组合式函数的示例：防抖（旧版 useDebounced）。source 停止变化 delay 毫秒后，out 才跟上。
import { ref, watch, type Ref } from 'vue'

export function useDebounced<T>(source: Ref<T>, delay: number): Ref<T> {
  const out = ref(source.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout>
  watch(source, v => {
    clearTimeout(timer)
    timer = setTimeout(() => { out.value = v }, delay)
  })
  return out
}
