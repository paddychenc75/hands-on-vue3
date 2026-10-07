<script setup lang="ts">
// 任务看板里的输入框：props 传入 modelValue，用 emit 通知父组件
defineProps<{ modelValue: string }>()
defineEmits<{ (e: 'update:modelValue', v: string): void; (e: 'submit'): void }>()
</script>

<template>
  <div class="row">
    <input class="t" :value="modelValue" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" @keyup.enter="$emit('submit')" placeholder="新任务，回车添加" style="flex: 1; min-width: 0" aria-label="新任务" />
    <button class="b pri" @click="$emit('submit')">添加</button>
  </div>
</template>
