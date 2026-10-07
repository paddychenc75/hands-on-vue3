<script setup lang="ts">
// 实验台：挂载、更新和卸载一个子组件——Child（旧版 #demo-life 里的 Child）
import { inject, onActivated, onBeforeMount, onBeforeUnmount, onBeforeUpdate, onDeactivated, onMounted, onUnmounted, onUpdated } from 'vue'

defineProps<{ n: number }>()
const hit = inject<(name: string) => void>('lifeHit')!

hit('setup')
onBeforeMount(() => hit('onBeforeMount'))
onMounted(() => hit('onMounted'))
onBeforeUpdate(() => hit('onBeforeUpdate'))
onUpdated(() => hit('onUpdated'))
onBeforeUnmount(() => hit('onBeforeUnmount'))
onUnmounted(() => hit('onUnmounted'))
onActivated(() => hit('onActivated'))
onDeactivated(() => hit('onDeactivated'))
</script>

<template>
  <div class="box"><span class="cap">我是 Child</span>props.n = <b>{{ n }}</b></div>
</template>
