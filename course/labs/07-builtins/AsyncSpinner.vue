<script setup lang="ts">
// loadingComponent
import { onMounted } from 'vue'
import { L } from './asyncLog'

onMounted(() => L('tg', 'loadingComponent 挂载（delay 200ms 已过）'))
</script>

<template>
  <div class="box cap">加载中…（loadingComponent）</div>
</template>
