<script setup lang="ts">
// props 稳定性实验台里的子组件：每次被更新就给所在一侧的计数加一
import { onUpdated } from 'vue'
import { stableCounts } from './perfState'

const props = defineProps<{ item: { id: number; name: string }; side: 'stable' | 'unstable' }>()
onUpdated(() => {
  stableCounts[props.side]++
})
</script>

<template>
  <span class="pill">{{ item.name }}</span>
</template>
