<script setup lang="ts">
// 任务看板里的徽章：用 inject 读取父组件 provide 的主题
import { inject, type Ref } from 'vue'

const theme = inject<Ref<string>>('theme')!
</script>

<template>
  <span class="pill" :style="{ borderColor: theme === 'green' ? 'var(--accent)' : 'var(--info)', color: theme === 'green' ? 'var(--accent)' : 'var(--info)' }">inject: {{ theme }}</span>
</template>
