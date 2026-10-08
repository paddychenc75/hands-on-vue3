<script setup lang="ts">
// 顶栏右侧的总进度条和“已完成 N/M”。M 只数必读章，选读章不计入（学了照常记录，选读完成数放在提示文字里）。
// 进度只在浏览器里有：服务端渲染和挂载前不渲染任何内容，挂载后才出现，避免水合不一致。
import { computed, onMounted } from 'vue'
import { ensureReady, ready, totalCount, track } from '../composables/learn'

const sum = computed(() => (track(), ready.value ? totalCount() : { done: 0, total: 0, optionalDone: 0, optionalTotal: 0 }))
onMounted(ensureReady)
</script>

<template>
  <div v-if="ready" class="nav-progress" role="img" :aria-label="`已完成 ${sum.done}/${sum.total} 章` + (sum.optionalTotal ? `，选读 ${sum.optionalDone}/${sum.optionalTotal} 章` : '')" :title="sum.optionalTotal ? `必读章 ${sum.done}/${sum.total}；选读章 ${sum.optionalDone}/${sum.optionalTotal}（选读章不计入总进度）` : undefined">
    <div class="np-bar"><i :style="{ width: (sum.total ? (sum.done / sum.total) * 100 : 0) + '%' }"></i></div>
    <span class="np-txt">已完成 {{ sum.done }}/{{ sum.total }}</span>
  </div>
</template>
