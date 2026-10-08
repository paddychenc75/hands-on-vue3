// 第 13 章成品看板的任务逻辑。字段与第 23 章一致：{ id, title, status, due }。
import { computed, ref, watch } from 'vue'

export type Status = 'todo' | 'doing' | 'done'
export interface Task { id: number; title: string; status: Status; due: string }

export const COLUMNS: { status: Status; label: string }[] = [
  { status: 'todo', label: '待办' },
  { status: 'doing', label: '进行中' },
  { status: 'done', label: '已完成' }
]

const KEY = 'hov3-demo:board-lab'
const seed = (): Task[] => [
  { id: 1, title: '读第 12 章', status: 'done', due: '2026-06-01' },
  { id: 2, title: '写 useTasks', status: 'doing', due: '2026-06-10' },
  { id: 3, title: '做任务表单', status: 'todo', due: '' },
  { id: 4, title: '加列表过渡', status: 'todo', due: '2026-06-05' }
]
function load(): Task[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) as string)
    return Array.isArray(saved) ? saved : seed()
  } catch {
    return seed()
  }
}

export function useTasks() {
  const tasks = ref<Task[]>(load())
  watch(tasks, v => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* 存储不可用时忽略 */ } }, { deep: true })
  let nextId = Math.max(0, ...tasks.value.map(t => t.id)) + 1

  function add(title: string, due = '') {
    title = title.trim()
    if (!title) return null
    const task: Task = { id: nextId++, title, status: 'todo', due }
    tasks.value.push(task)
    return task
  }
  function move(id: number, status: Status) {
    const task = tasks.value.find(t => t.id === id)
    if (task) task.status = status
  }
  function update(id: number, patch: Partial<Omit<Task, 'id'>>) {
    const task = tasks.value.find(t => t.id === id)
    if (task) Object.assign(task, patch)
  }
  function remove(id: number) { tasks.value = tasks.value.filter(t => t.id !== id) }
  function reset() { tasks.value = seed(); nextId = 5 }

  // 派生：每一列的任务，按截止日期从早到晚，没有日期的排最后
  const byStatus = computed(() => {
    const LAST = '9999-12-31'
    const out: Record<Status, Task[]> = { todo: [], doing: [], done: [] }
    for (const t of tasks.value) out[t.status].push(t)
    for (const s of Object.keys(out) as Status[]) out[s].sort((a, b) => (a.due || LAST).localeCompare(b.due || LAST))
    return out
  })
  const left = computed(() => tasks.value.filter(t => t.status !== 'done').length)
  return { tasks, byStatus, left, add, move, update, remove, reset }
}

export interface BoardActions {
  move: (id: number, status: Status) => void
  update: (id: number, patch: Partial<Omit<Task, 'id'>>) => void
  remove: (id: number) => void
  edit: (task: Task) => void
}
