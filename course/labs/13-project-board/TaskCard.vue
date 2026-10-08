<script setup lang="ts">
import { inject } from 'vue'
import CardActions from './CardActions.vue'
import type { BoardActions, Task } from './useTasks'

defineProps<{ task: Task }>()
const board = inject<BoardActions>('board')!
</script>

<template>
  <li class="card">
    <button class="title" @click="board.edit(task)">{{ task.title }}</button>
    <CardActions :task="task" />
  </li>
</template>

<style scoped>
.card { border: 1px solid var(--line); background: var(--bg); border-radius: 6px; padding: 6px; margin: 4px 0; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.title { border: 0; background: none; padding: 0; font: inherit; font-weight: 600; cursor: pointer; color: inherit; text-align: left; }
</style>
