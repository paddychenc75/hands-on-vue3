<script setup lang="ts">
// 项目：任务看板（旧版 #demo-project）。五步 stepper，每一步都能操作。
import { ref, computed, watch } from 'vue'
import BoardTaskItem from './BoardTaskItem.vue'

const STEPS: { title: string; ch: string; what: string; code: string }[] = [
  { title: '渲染任务列表', ch: '第 2、3 章', what: '先设计数据。数据是一个 ref 数组。每个任务有 id、text 和 done。然后用 v-for 显示任务。',
    code: 'const tasks = ref([\n  { id: 1, text: \'读完响应式原理\', done: true },\n  { id: 2, text: \'完成练习\', done: false },\n  { id: 3, text: \'写一个 useFetch\', done: false }\n])\n\n// 模板\n<ul>\n  <li v-for="t in tasks" :key="t.id">{{ t.text }}</li>\n</ul>' },
  { title: '添加、完成、删除', ch: '第 2 章', what: '用 v-model 连接输入框。用 @keyup.enter 和 @click 添加任务。用复选框切换 done。用按钮删除任务。',
    code: 'const draft = ref(\'\')\nlet nextId = 4\nfunction add() {\n  const text = draft.value.trim()\n  if (!text) return\n  tasks.value.push({ id: nextId++, text, done: false })\n  draft.value = \'\'\n}\nfunction remove(id) {\n  tasks.value = tasks.value.filter(t => t.id !== id)\n}\n\n// 模板\n<input v-model="draft" @keyup.enter="add">\n<button @click="add">添加</button>\n<li v-for="t in tasks" :key="t.id">\n  <input type="checkbox" v-model="t.done"> {{ t.text }}\n  <button @click="remove(t.id)">删除</button>\n</li>' },
  { title: '筛选与统计', ch: '第 4 章', what: '显示的任务和剩余数量都从 tasks 计算得到。使用 computed。不要保存第二份数据。',
    code: 'const filter = ref(\'all\')   // all | active | done\nconst shown = computed(() =>\n  filter.value === \'all\' ? tasks.value\n  : tasks.value.filter(t => filter.value === \'done\' ? t.done : !t.done)\n)\nconst left = computed(() => tasks.value.filter(t => !t.done).length)\n\n// 模板：v-for 改为遍历 shown\n<li v-for="t in shown" :key="t.id">…</li>\n<p>还剩 {{ left }} 项</p>' },
  { title: '拆出 TaskItem 组件', ch: '第 5 章', what: '把一个任务的显示和操作移到子组件。子组件不修改数据。子组件发送事件给父组件。虚线框是组件的边界。',
    code: '// TaskItem.vue\nconst props = defineProps({ task: Object })\nconst emit = defineEmits([\'toggle\', \'remove\'])\n// <li>\n//   <input type="checkbox" :checked="task.done" @change="emit(\'toggle\', task.id)">\n//   {{ task.text }}\n//   <button @click="emit(\'remove\', task.id)">删除</button>\n// </li>\n\n// 父组件\n<TaskItem v-for="t in shown" :key="t.id" :task="t"\n          @toggle="toggle" @remove="remove" />' },
  { title: '抽 useTasks + 持久化', ch: '第 4、9 章', what: '把任务的数据和方法移到 useTasks()。组件只显示数据。用 watch 深度侦听 tasks。tasks 改变时，写入 localStorage。刷新页面后，数据仍在。',
    code: '// useTasks.js\nexport function useTasks(key = \'tasks\') {\n  const tasks = ref(JSON.parse(localStorage.getItem(key) || \'[]\'))\n  watch(tasks, v => localStorage.setItem(key, JSON.stringify(v)), { deep: true })\n\n  const filter = ref(\'all\')\n  const shown = computed(() => /* 同第 3 步 */)\n  const left = computed(() => tasks.value.filter(t => !t.done).length)\n  function add(text) { /* … */ }\n  function toggle(id) { /* … */ }\n  function remove(id) { /* … */ }\n  return { tasks, filter, shown, left, add, toggle, remove }\n}\n\n// 组件里只剩一行逻辑\nconst { filter, shown, left, add, toggle, remove } = useTasks()' }
];

const KEY = 'vue3deep:kanban'
type Task = { id: number; text: string; done: boolean }
const seed = (): Task[] => [{ id: 1, text: '读完响应式原理', done: true }, { id: 2, text: '完成练习', done: false }, { id: 3, text: '写一个 useFetch', done: false }]

const step = ref(0)
const draft = ref('')
const filter = ref('all')
let init = seed()
try { const s = localStorage.getItem(KEY); if (s) init = JSON.parse(s) } catch (e) { /* 忽略 */ }
const tasks = ref<Task[]>(init)
let nextId = Math.max(0, ...tasks.value.map(t => t.id)) + 1
const saved = ref(false)
watch(tasks, v => {
  if (step.value >= 4) { try { localStorage.setItem(KEY, JSON.stringify(v)); saved.value = true } catch (e) { /* 忽略 */ } }
}, { deep: true })
const shown = computed(() => step.value < 2 || filter.value === 'all' ? tasks.value : tasks.value.filter(t => filter.value === 'done' ? t.done : !t.done))
const left = computed(() => tasks.value.filter(t => !t.done).length)

function add() {
  const t = draft.value.trim()
  if (!t) return
  tasks.value.push({ id: nextId++, text: t, done: false })
  draft.value = ''
}
function toggle(id: number) {
  const t = tasks.value.find(x => x.id === id)
  if (t) t.done = !t.done
}
function remove(id: number) { tasks.value = tasks.value.filter(t => t.id !== id) }
function resetData() {
  tasks.value = seed()
  nextId = 4
  try { localStorage.removeItem(KEY) } catch (e) { /* 忽略 */ }
  saved.value = false
}
const FILTERS = [['all', '全部'], ['active', '进行中'], ['done', '已完成']]
</script>

<template>
  <div class="stepper"><button v-for="(s, i) in STEPS" :key="i" type="button" :class="{ on: step === i, past: i < step }" @click="step = i">{{ i + 1 }}. {{ s.title }}</button></div>
  <div><b>第 {{ step + 1 }} 步：{{ STEPS[step].title }}</b> <span class="pill">{{ STEPS[step].ch }}</span></div>
  <div style="font-size:14.5px">{{ STEPS[step].what }}</div>
  <div class="cols">
    <LabCode :code="STEPS[step].code" style="margin:0;max-height:420px" />
    <div class="box kanban"><span class="cap">应用的当前状态</span>
      <div v-if="step >= 1" class="row" style="flex-wrap:nowrap"><input class="t" v-model="draft" @keyup.enter="add" placeholder="新任务，回车添加" style="flex:1;min-width:0" aria-label="新任务"><button class="b pri" @click="add">添加</button></div>
      <div v-if="step >= 2" class="tabs"><button type="button" v-for="f in FILTERS" :key="f[0]" :class="{ on: filter === f[0] }" @click="filter = f[0]">{{ f[1] }}</button></div>
      <template v-if="step >= 3">
        <BoardTaskItem v-for="t in shown" :key="t.id" :task="t" @toggle="toggle" @remove="remove" />
      </template>
      <template v-else-if="step >= 1">
        <div v-for="t in shown" :key="t.id" class="task" :class="{ done: t.done }"><label class="ctl"><input type="checkbox" v-model="t.done"><span>{{ t.text }}</span></label><button class="b" @click="remove(t.id)">删除</button></div>
      </template>
      <ul v-else style="margin:0"><li v-for="t in tasks" :key="t.id">{{ t.text }}</li></ul>
      <div v-if="!shown.length && step >= 1" class="cap">没有任务</div>
      <div v-if="step >= 2" class="cap">还剩 {{ left }} 项 · 共 {{ tasks.length }} 项</div>
      <div v-if="step >= 4" class="row cap"><span>{{ saved ? '数据已保存到 localStorage。刷新页面后，任务仍在。' : '修改任务后，应用自动保存。' }}</span><button class="b" @click="resetData">恢复示例数据</button></div>
    </div>
  </div>
  <div class="row"><button class="b" :disabled="step === 0" @click="step--">上一步</button><button class="b pri" :disabled="step === STEPS.length - 1" @click="step++">下一步</button></div>
</template>
