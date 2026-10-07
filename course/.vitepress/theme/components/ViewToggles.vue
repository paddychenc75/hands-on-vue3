<script setup lang="ts">
// 侧边栏顶部的两个全局开关：显示类比、展开全部“深入”内容。选择记在 localStorage（键 analogy、deepOpen）。
// 真正起作用的代码在 AppEffects.vue（监听这两个键）。
import { computed, onMounted } from 'vue'
import { markStoreReady, store, storeReady } from '../composables/store'
import { deepOpen, showAnalogy } from '../composables/progress'

onMounted(markStoreReady)
// 服务端渲染和首次渲染用默认值，挂载后才读存储，避免水合不一致
const analogy = computed(() => (storeReady.value ? showAnalogy() : true))
const deep = computed(() => (storeReady.value ? deepOpen() : false))
</script>

<template>
  <div class="view-toggles">
    <label class="ctl"><input type="checkbox" data-toggle="analogy" :checked="analogy" @change="store.set('analogy', ($event.target as HTMLInputElement).checked)"> 显示类比</label>
    <label class="ctl"><input type="checkbox" data-toggle="deep" :checked="deep" @change="store.set('deepOpen', ($event.target as HTMLInputElement).checked)"> 展开全部“深入”内容</label>
  </div>
</template>
