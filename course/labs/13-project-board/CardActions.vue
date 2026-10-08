<script setup lang="ts">
// 卡片里的操作区：在 Board → Column → TaskCard → CardActions 的深处，用 inject 拿到看板的操作，不靠逐层转发。
import { inject } from 'vue'
import { COLUMNS, type BoardActions, type Task } from './useTasks'

defineProps<{ task: Task }>()
const board = inject<BoardActions>('board')!
</script>

<template>
  <input type="date" class="due" :value="task.due" :aria-label="'截止日期：' + task.title"
    @input="board.update(task.id, { due: ($event.target as HTMLInputElement).value })">
  <button v-for="c in COLUMNS" :key="c.status" v-show="c.status !== task.status" class="b move"
    @click="board.move(task.id, c.status)">→{{ c.label }}</button>
  <button class="b del" @click="board.remove(task.id)">删除</button>
</template>
