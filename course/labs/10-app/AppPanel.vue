<script setup lang="ts">
// Panel：ErrorBoundary 的父组件，也有自己的 onErrorCaptured
import { inject, onErrorCaptured } from 'vue'
import AppErrorBoundary from './AppErrorBoundary.vue'
import AppBomb from './AppBomb.vue'

const { L, cfg } = inject('lab') as any
onErrorCaptured((err: any) => {
  L('tg', '② Panel 的 errorCaptured：' + err.message)
  if (cfg.stopOuter) { L('rn', '   返回 false：停止传递'); return false }
  L('m', '   没有返回 false：继续向上传递')
})
</script>

<template>
  <div class="box"><span class="cap">Panel（ErrorBoundary 的父组件）</span><AppErrorBoundary><AppBomb /></AppErrorBoundary></div>
</template>
