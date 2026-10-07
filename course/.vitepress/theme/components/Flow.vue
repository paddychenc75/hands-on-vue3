<script setup lang="ts">
// 一行流程：<Flow :steps="['setup', 'onMounted', 'onUnmounted']" />（旧版 .steps-flow）
defineProps<{ steps: string[] }>()
</script>

<template>
  <div class="steps-flow">
    <template v-for="(s, i) in steps" :key="i"><i v-if="i">→</i><span>{{ s }}</span></template>
  </div>
</template>
