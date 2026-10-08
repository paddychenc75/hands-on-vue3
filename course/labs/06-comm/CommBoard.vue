<script setup lang="ts">
// 实验台：任务看板中的四种通信方式（旧 demo-comm）：props、emit、v-model、provide/inject
import { onMounted, provide, ref, watch } from 'vue'
import { domLog } from '../_shared'
import CommTaskForm from './CommTaskForm.vue'
import CommTaskItem from './CommTaskItem.vue'

const theme = ref('green')
provide('theme', theme)
const draft = ref('')
const tasks = ref([
  { id: 1, text: '读完响应式原理', done: true },
  { id: 2, text: '完成练习', done: false },
  { id: 3, text: '写一个 useFetch', done: false }
])
const logRef = ref<HTMLElement | null>(null)
let id = 4
const L = (c: string, m: string) => domLog(logRef.value, c, m)
onMounted(() => L('m', '父组件 provide("theme", ref("green"))'))
watch(draft, v => L('tg', 'emit update:modelValue → "' + v + '"（v-model）'))

function add() {
  if (!draft.value.trim()) return
  L('rn', 'emit submit → 父组件 push 新任务，props 下发')
  tasks.value.push({ id: id++, text: draft.value.trim(), done: false })
  draft.value = ''
}
function remove(i: number) {
  L('x', 'emit remove(' + i + ') → 父组件删除')
  tasks.value = tasks.value.filter(t => t.id !== i)
}
function toggle(i: number) {
  const t = tasks.value.find(t => t.id === i)!
  t.done = !t.done
  L('tg', 'emit toggle(' + i + ') → 父组件修改 done，新 props 下发')
}
function flip() {
  theme.value = theme.value === 'green' ? 'blue' : 'green'
  L('tr', 'provide 的 ref 改为 "' + theme.value + '"，所有 inject 处同步')
}
</script>

<template>
  <div class="cols">
    <div style="display: flex; flex-direction: column; gap: 8px; min-width: 0">
      <CommTaskForm v-model="draft" @submit="add" />
      <div>
        <CommTaskItem v-for="t in tasks" :key="t.id" :task="t" @remove="remove" @toggle="toggle">
          <template #default="{ task }"><span :style="{ textDecoration: task.done ? 'line-through' : 'none', color: task.done ? 'var(--muted)' : 'inherit' }">{{ task.text }}</span></template>
        </CommTaskItem>
      </div>
      <div class="row"><button class="b" @click="flip">切换 provide 的主题</button><span class="cap">共 {{ tasks.length }} 项，完成 {{ tasks.filter(t => t.done).length }} 项</span></div>
    </div>
    <div class="log" ref="logRef" style="height: 220px"></div>
  </div>
</template>
