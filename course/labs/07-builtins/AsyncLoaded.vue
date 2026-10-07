<script setup lang="ts">
// 异步加载完成后真正挂载的组件
import { onMounted } from 'vue'
import { L } from './asyncLog'

onMounted(() => L('rn', '真正的组件挂载'))
</script>

<template>
  <div class="box"><b>我是异步加载的组件</b></div>
</template>
