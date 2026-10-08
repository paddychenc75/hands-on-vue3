<script setup lang="ts">
// errorComponent
import { onMounted } from 'vue'
import { L } from './asyncLog'

const props = defineProps<{ error?: Error }>()
onMounted(() => L('x', 'errorComponent 挂载：' + (props.error && props.error.message)))
</script>

<template>
  <div class="box" style="color: var(--bad)">加载失败：{{ error && error.message }}</div>
</template>
