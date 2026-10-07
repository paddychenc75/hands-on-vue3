<script setup lang="ts">
// 模板版本的递归大纲组件（旧 OutlineT）。递归引用自己靠文件名 OutlineT。
defineProps<{ nodes: any[]; level: number }>()
</script>

<template>
  <template v-for="n in nodes" :key="n.id">
    <component :is="'h' + Math.min(level, 6)">{{ n.title }}</component>
    <OutlineT v-if="n.children.length" :nodes="n.children" :level="level + 1" />
  </template>
</template>
