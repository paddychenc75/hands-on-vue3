// 迷你 Pinia（旧 demo-pinia）：defineStore 返回 useStore，同一个 id 只创建一个 store
import { computed, reactive, ref } from 'vue'

const stores = new Map<string, any>()
function defineStore<T extends object>(id: string, setup: () => T) {
  return function useStore() {
    if (!stores.has(id)) stores.set(id, reactive(setup())) // reactive 自动解包内部的 ref
    return stores.get(id) as any
  }
}

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref([
    { id: 1, text: '读完响应式原理', done: true },
    { id: 2, text: '完成练习', done: false },
    { id: 3, text: '写一个 useFetch', done: false }
  ])
  const left = computed(() => tasks.value.filter(t => !t.done).length)
  let nextId = 4
  function add(text: string) {
    text = text.trim()
    if (text) tasks.value.push({ id: nextId++, text, done: false })
  }
  function clearDone() {
    tasks.value = tasks.value.filter(t => !t.done)
  }
  return { tasks, left, add, clearDone }
})
