<script setup lang="ts">
// 课程地图页的“跨设备同步”面板（折叠，默认收起）。面板内容（sync/SyncPanelBody.vue）是单独的异步 chunk，展开时才加载；
// 这里只用主包里的小状态文件，不加载同步引擎。服务端渲染和首次水合时显示“未开启”，挂载后才读本机配置，所以不会水合不一致。
import { defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import { STATE_LABEL, useSyncStatus } from '../composables/sync'

const Body = defineAsyncComponent(() => import('../sync/SyncPanelBody.vue'))
const open = ref(false)
const v = useSyncStatus()
const el = ref<HTMLDetailsElement | null>(null)
const route = useRoute()

// 地址带 #sync（侧栏入口、顶栏标记的“同步设置”）：展开面板，并把焦点放到面板标题上（读屏软件和键盘用户知道到了哪里）
const fromHash = () => {
  if (location.hash !== '#sync') return
  open.value = true
  nextTick(() => {
    if (el.value) el.value.open = true
    el.value?.querySelector('summary')?.focus({ preventScroll: false })
  })
}
onMounted(() => {
  fromHash()
  window.addEventListener('hashchange', fromHash)
})
onBeforeUnmount(() => window.removeEventListener('hashchange', fromHash))
// 在课程地图页上点顶栏标记里的“同步设置”：地址只是多了 #sync，不会触发 hashchange，所以也看路由的 hash
watch(() => route.hash, fromHash)
watch(open, o => {
  if (el.value && el.value.open !== o) el.value.open = o
})
</script>

<template>
  <details id="sync" ref="el" class="sync-panel" @toggle="open = ($event.currentTarget as HTMLDetailsElement).open">
    <summary>
      <span>跨设备同步</span>
      <small v-if="v.enabled" class="sync-sum">已开启 · {{ STATE_LABEL[v.status.state] }}</small>
      <small v-else class="sync-sum">未开启 · 可选</small>
    </summary>
    <Body v-if="open" />
  </details>
</template>
