<script setup lang="ts">
// 任务看板里的一行任务：props 下发任务，事件上报删除和切换，作用域插槽自定义文字
import CommThemeBadge from './CommThemeBadge.vue'

defineProps<{ task: { id: number; text: string; done: boolean } }>()
defineEmits<{ (e: 'remove', id: number): void; (e: 'toggle', id: number): void }>()
</script>

<template>
  <div class="row" style="justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--line)">
    <label class="ctl"><input type="checkbox" :checked="task.done" @change="$emit('toggle', task.id)" /><slot :task="task"></slot></label>
    <span class="row" style="gap: 6px"><CommThemeBadge /><button class="b" @click="$emit('remove', task.id)">删除</button></span>
  </div>
</template>
