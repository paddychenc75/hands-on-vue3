<script setup lang="ts">
// 实验台：两个组件共享任务 store（旧 demo-pinia）
import PiniaTaskForm from './PiniaTaskForm.vue'
import PiniaLeftCount from './PiniaLeftCount.vue'
</script>

<template>
  <div class="cols"><PiniaTaskForm /><PiniaLeftCount /></div>
  <div class="cap">两个组件之间没有 props 和事件。两个组件都调用 useTaskStore()，并得到同一个 store。</div>
</template>
