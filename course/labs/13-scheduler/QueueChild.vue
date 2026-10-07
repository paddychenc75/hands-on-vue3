<script setup lang="ts">
import { onBeforeUpdate, onUpdated } from 'vue'

const props = defineProps<{ n: number; log: (cls: string, msg: string) => void }>()
onBeforeUpdate(() => props.log('tg', '子组件 onBeforeUpdate'))
onUpdated(() => props.log('rn', '子组件 onUpdated'))
</script>

<template>
  <span class="pill">子组件 n = {{ n }}</span>
</template>
