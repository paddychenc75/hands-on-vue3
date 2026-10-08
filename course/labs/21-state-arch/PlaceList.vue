<script setup lang="ts">
// 任务列表：按筛选条件显示
import { computed, inject, onUpdated } from 'vue'
import { count, TASKS, type Side, type Source } from './placeState'

const props = defineProps<{ side: Side; kw?: string }>()
const src = inject<Source | null>('placeSrc', null)
const value = computed(() => (props.kw !== undefined ? props.kw : src!.kw.value))
const shown = computed(() => TASKS.filter(t => t.toLowerCase().includes(value.value.toLowerCase())))
onUpdated(() => count(props.side, 'List'))
</script>

<template>
  <div class="pl-list"><span v-for="t in shown" :key="t" class="pill">{{ t }}</span><span v-if="!shown.length" class="cap">没有匹配的任务</span></div>
</template>

<style scoped>
.pl-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
</style>
