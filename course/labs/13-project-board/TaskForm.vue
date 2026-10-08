<script setup lang="ts">
// 新建和编辑共用的表单。task 为 null 时是新建。表单改的是草稿，保存时才交给父组件。
import { computed, reactive, ref } from 'vue'
import type { Task } from './useTasks'

const props = defineProps<{ task: Task | null }>()
const emit = defineEmits<{ save: [data: { title: string; due: string }]; cancel: [] }>()

const vFocus = { mounted: (el: HTMLElement) => el.focus() }
const form = reactive({ title: props.task ? props.task.title : '', due: props.task ? props.task.due : '' })
const submitted = ref(false)
const error = computed(() => {
  const t = form.title.trim()
  if (!t) return '请输入标题'
  if (t.length > 20) return '标题最多 20 个字'
  return ''
})
function submit() {
  submitted.value = true
  if (error.value) return
  emit('save', { title: form.title.trim(), due: form.due })
}
</script>

<template>
  <form class="task-form" @submit.prevent="submit" @keydown.esc="emit('cancel')">
    <label class="ctl">标题 <input class="t f-title" v-focus v-model="form.title"></label>
    <p class="error" v-if="submitted && error" role="alert">{{ error }}</p>
    <label class="ctl">截止日期 <input type="date" class="t f-due" v-model="form.due"></label>
    <div class="row">
      <button type="submit" class="b pri save">保存</button>
      <button type="button" class="b cancel" @click="emit('cancel')">取消</button>
    </div>
  </form>
</template>

<style scoped>
.task-form { display: flex; flex-direction: column; gap: 8px; }
.error { color: #c0392b; margin: 0; font-size: 13px; }
</style>
