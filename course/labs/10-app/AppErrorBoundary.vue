<script setup lang="ts">
// ErrorBoundary：用 onErrorCaptured 捕获子树的错误，显示备用内容
import { inject, onErrorCaptured, ref } from 'vue'

const { L, cfg, infoText } = inject('lab') as any
const error = ref<Error | null>(null)
onErrorCaptured((err: any, _inst, info) => {
  L('tg', '① ErrorBoundary 的 errorCaptured：' + err.message + '（来源：' + infoText(info) + '）')
  if (cfg.stopInner) { error.value = err; L('rn', '   返回 false：停止传递，显示备用内容'); return false }
  L('m', '   没有返回 false：继续向上传递')
})
function retry() { error.value = null; L('m', '重试：清除错误，插槽内容重新挂载') }
</script>

<template>
  <div v-if="error" class="box"><span class="cap">ErrorBoundary 的备用内容</span><div>出错了：{{ error.message }} </div>
    <button class="b" @click="retry">重试</button></div>
  <slot v-else />
</template>
