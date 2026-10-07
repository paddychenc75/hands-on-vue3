<script setup lang="ts">
// html2md 生成的占位：这个实验台还没改写成 SFC。改写完删掉这个标签。页面上有它，compare.mjs 会报错。
defineProps<{ id?: string; hint?: string }>()
</script>

<template>
  <div class="lab-todo">TODO：待改写的实验台 {{ id }}<span v-if="hint">（{{ hint }}）</span></div>
</template>
