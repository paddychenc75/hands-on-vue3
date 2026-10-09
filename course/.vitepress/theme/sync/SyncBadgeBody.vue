<script setup lang="ts">
// 顶栏同步标记的内容（开启同步后才加载的异步 chunk，放在 components/ 之外，不会被全局注册打进主包）。点击显示“上次同步”和“立即同步”。
import { onBeforeUnmount, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import { ago, TOKEN_URL } from '../../../engine/logic/syncView'
import { loadSyncEngine } from '../../../engine/syncState'
import { STATE_LABEL, TOKEN_CODES, useSyncStatus } from '../composables/sync'

const v = useSyncStatus()
const open = ref(false)
const btn = ref<HTMLButtonElement | null>(null)
const pop = ref<HTMLElement | null>(null)

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    open.value = false
    btn.value?.focus()
  }
}
const onDown = (e: MouseEvent) => {
  const t = e.target as Node
  if (!pop.value?.contains(t) && !btn.value?.contains(t)) open.value = false
}
watch(open, o => {
  if (o) {
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
  } else {
    document.removeEventListener('keydown', onKey)
    document.removeEventListener('mousedown', onDown)
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('mousedown', onDown)
})
const reload = () => window.location.reload()
const syncNow = () => {
  loadSyncEngine().then(m => m.syncNow())
}
</script>

<template>
  <div class="sync-badge" :data-state="v.status.state">
    <button ref="btn" type="button" class="sync-btn" :aria-expanded="open" aria-controls="sync-pop" :aria-label="`跨设备同步：${STATE_LABEL[v.status.state]}`" @click="open = !open">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path d="M7 18a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 18 9.5a4.25 4.25 0 0 1-.25 8.5H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
      </svg>
      <i class="sync-dot" aria-hidden="true"></i>
    </button>
    <span class="sync-sr" role="status" aria-live="polite">同步状态：{{ STATE_LABEL[v.status.state] }}</span>
    <div v-if="open" id="sync-pop" ref="pop" class="sync-pop" role="dialog" aria-label="跨设备同步">
      <p class="sync-pop-state"><b>{{ STATE_LABEL[v.status.state] }}</b></p>
      <p class="dim">上次同步：{{ ago(v.status.at, v.now) }}</p>
      <p v-if="v.status.msg" class="sync-pop-msg">{{ v.status.msg }}</p>
      <p v-if="v.status.code && TOKEN_CODES.includes(v.status.code)" class="sync-pop-msg"><a :href="TOKEN_URL" target="_blank" rel="noopener noreferrer">重新创建令牌</a></p>
      <p v-if="v.status.remoteChanged" class="sync-pop-msg">进度已从另一台设备更新。已经打开的页面刷新后才会显示。<button type="button" class="sync-mini" @click="reload">刷新页面</button></p>
      <div class="sync-pop-row">
        <button type="button" class="sync-mini" :disabled="v.status.state === 'syncing'" @click="syncNow">立即同步</button>
        <a :href="withBase('/roadmap') + '#sync'" @click="open = false">同步设置</a>
      </div>
    </div>
  </div>
</template>
