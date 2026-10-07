<script setup lang="ts">
const props = defineProps<{ id: string }>()
const TASKS: Record<string, string> = { 1: '读完响应式原理', 2: '完成练习', 3: '写一个 useFetch' }
</script>

<template>
  <div><b>任务 {{ props.id }}</b><p>{{ TASKS[props.id] || '任务不存在' }}</p><p class="cap">Router 复用这个组件。只有 props.id 改变。</p></div>
</template>
