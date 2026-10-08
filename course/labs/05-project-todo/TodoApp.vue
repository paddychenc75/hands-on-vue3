<script setup lang="ts">
// 实验台：第 5 章的成品待办清单。真实的 Vue 单文件组件，功能和五步练习做出来的一样。
import { computed, ref, watch } from 'vue'

interface Todo { id: number; text: string; done: boolean }
type Filter = 'all' | 'active' | 'done'

const KEY = 'hov3-demo:todo-lab'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '未完成' },
  { key: 'done', label: '已完成' }
]
const seed = (): Todo[] => [
  { id: 1, text: '读完第 4 章', done: true },
  { id: 2, text: '做一个待办清单', done: false },
  { id: 3, text: '把它存进 localStorage', done: false }
]
function load(): Todo[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) as string)
    return Array.isArray(saved) ? saved : seed()
  } catch {
    return seed()
  }
}

// 存下来的状态（只有这四份）
const todos = ref<Todo[]>(load())
const filter = ref<Filter>('all')
const draft = ref('')
const editingId = ref<number | null>(null)
const editText = ref('')
let nextId = Math.max(0, ...todos.value.map(t => t.id)) + 1

// 算出来的数据（派生）
const visible = computed(() => {
  if (filter.value === 'active') return todos.value.filter(t => !t.done)
  if (filter.value === 'done') return todos.value.filter(t => t.done)
  return todos.value
})
const left = computed(() => todos.value.filter(t => !t.done).length)

watch(todos, v => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* 存储不可用时忽略 */ } }, { deep: true })

function add() {
  const text = draft.value.trim()
  if (!text) return
  todos.value.push({ id: nextId++, text, done: false })
  draft.value = ''
}
function remove(id: number) { todos.value = todos.value.filter(t => t.id !== id) }
function startEdit(t: Todo) { editingId.value = t.id; editText.value = t.text }
function saveEdit(t: Todo) {
  const text = editText.value.trim()
  if (text) t.text = text
  editingId.value = null
}
function cancelEdit() { editingId.value = null }
function reset() { todos.value = seed(); nextId = 4; filter.value = 'all'; editingId.value = null }
</script>

<template>
  <div class="todo-lab">
    <div class="row">
      <input class="t new" v-model="draft" @keyup.enter="add" placeholder="要做什么？" aria-label="新事项">
      <button class="b add" @click="add">添加</button>
    </div>
    <div class="row filters" role="group" aria-label="筛选">
      <button v-for="f in FILTERS" :key="f.key" class="b" :class="{ on: filter === f.key }" @click="filter = f.key">{{ f.label }}</button>
    </div>
    <ul class="list">
      <li v-for="todo in visible" :key="todo.id">
        <template v-if="editingId === todo.id">
          <input class="t edit" v-model="editText" @keyup.enter="saveEdit(todo)" @keyup.esc="cancelEdit" aria-label="编辑事项">
        </template>
        <template v-else>
          <input type="checkbox" v-model="todo.done" :aria-label="'完成：' + todo.text">
          <span class="text" :class="{ done: todo.done }" @dblclick="startEdit(todo)">{{ todo.text }}</span>
          <button class="b del" @click="remove(todo.id)">删除</button>
        </template>
      </li>
      <li v-if="!visible.length" class="empty">这里没有事项</li>
    </ul>
    <p class="left">还剩 {{ left }} 项</p>
    <div class="cols">
      <div class="box"><span class="cap">存下来的状态</span>
        <div class="state">todos：{{ todos.length }} 条　filter：{{ filter }}　editingId：{{ editingId }}</div></div>
      <div class="box"><span class="cap">算出来的（派生）</span>
        <div class="state">visible：{{ visible.length }} 条　left：{{ left }}</div></div>
    </div>
    <div class="row"><button class="b reset" @click="reset">恢复示例数据</button><span class="cap">双击文字编辑，回车保存，Esc 取消。刷新页面后事项还在。</span></div>
  </div>
</template>

<style scoped>
.list { list-style: none; padding: 0; margin: 8px 0; }
.list li { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--line); }
.text { flex: 1; cursor: text; }
.text.done { text-decoration: line-through; color: var(--muted); }
.empty { color: var(--muted); }
.filters { margin-top: 8px; }
.state { font-size: 13px; }
.edit { flex: 1; }
</style>
