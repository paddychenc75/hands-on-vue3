<script setup lang="ts">
// 只读取 store 的 state 和 getter
import { useTaskStore } from './miniPinia'

const store = useTaskStore()
</script>

<template>
  <div class="box">
    <span class="cap">&lt;LeftCount&gt; 只读取 state / getter</span>
    <div style="font-size: 22px; font-family: var(--f-display); font-weight: 900">还剩 {{ store.left }} 项</div>
    <div v-for="t in store.tasks" :key="t.id" class="cap" :style="{ textDecoration: t.done ? 'line-through' : 'none' }">{{ t.text }}</div>
    <button class="b" style="margin-top: 6px" @click="store.clearDone()" :disabled="store.left === store.tasks.length">清除已完成</button>
  </div>
</template>
