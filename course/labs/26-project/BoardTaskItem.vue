<script setup lang="ts">
// 看板里“拆出来的 TaskItem 组件”（第 4 步起使用）。虚线框表示组件的边界。
defineProps<{ task: { id: number; text: string; done: boolean } }>()
defineEmits<{ toggle: [id: number]; remove: [id: number] }>()
</script>

<template>
  <div class="task" :class="{ done: task.done }" style="outline:1px dashed var(--accent);outline-offset:2px">
    <label class="ctl"><input type="checkbox" :checked="task.done" @change="$emit('toggle', task.id)"><span>{{ task.text }}</span></label>
    <span class="row" style="gap:6px"><span class="cap" style="font-family:var(--f-mono)">&lt;TaskItem&gt;</span><button class="b" @click="$emit('remove', task.id)">删除</button></span>
  </div>
</template>
