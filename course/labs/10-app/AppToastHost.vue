<script setup lang="ts">
// 全局组件 ToastHost（由 Toast 插件用 app.component 注册）
import { inject } from 'vue'

const list = inject<{ id: number; msg: string }[]>('toast-list', [])
</script>

<template>
  <div style="min-height:28px;display:flex;flex-direction:column;gap:4px"><span v-for="t in list" :key="t.id" class="pill g">{{ t.msg }}</span></div>
</template>
