<script setup lang="ts">
// 顶栏进度条旁的同步状态小标记。没开启同步时什么也不显示（也不加载标记的代码）；开启后才加载 sync/SyncBadgeBody.vue。
// 服务端渲染和首次水合时 enabled 为 false，挂载后才读本机配置，所以不会水合不一致。
import { defineAsyncComponent } from 'vue'
import { useSyncStatus } from '../composables/sync'

const Body = defineAsyncComponent(() => import('../sync/SyncBadgeBody.vue'))
const v = useSyncStatus()
</script>

<template>
  <Body v-if="v.enabled" />
</template>
