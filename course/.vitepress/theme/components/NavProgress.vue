<script setup lang="ts">
// 顶栏右侧的总进度条和“已完成 N/26”。
// 进度只在浏览器里有：服务端渲染和挂载前不渲染任何内容，挂载后才出现，避免水合不一致。
import { computed, onMounted } from 'vue'
import { ensureReady, ready, totalCount, track } from '../composables/learn'

const sum = computed(() => (track(), ready.value ? totalCount() : { done: 0, total: 0 }))
onMounted(ensureReady)
</script>

<template>
  <div v-if="ready" class="nav-progress" role="img" :aria-label="`已完成 ${sum.done}/${sum.total} 章`">
    <div class="np-bar"><i :style="{ width: (sum.total ? (sum.done / sum.total) * 100 : 0) + '%' }"></i></div>
    <span class="np-txt">已完成 {{ sum.done }}/{{ sum.total }}</span>
  </div>
</template>
