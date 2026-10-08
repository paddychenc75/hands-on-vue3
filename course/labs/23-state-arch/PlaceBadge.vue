<script setup lang="ts">
// 页眉里的徽标：显示当前筛选
import { computed, inject, onUpdated } from 'vue'
import { count, type Side, type Source } from './placeState'

const props = defineProps<{ side: Side; kw?: string }>()
const src = inject<Source | null>('placeSrc', null)
const value = computed(() => (props.kw !== undefined ? props.kw : src!.kw.value))
onUpdated(() => count(props.side, 'Badge'))
</script>

<template>
  <span class="pill">筛选：{{ value || '无' }}</span>
</template>
