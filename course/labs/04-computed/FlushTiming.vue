<script setup lang="ts">
// 实验台：pre、post 和 sync（旧版 #demo-flush）
// 日志用原生 DOM 写，不用响应式数据（见 _shared/domLog.ts）。
import { ref, watch } from 'vue'
import { domLog } from '../_shared'

const count = ref(0)
const out = ref<HTMLElement | null>(null)
const logRef = ref<HTMLElement | null>(null)
const L = (c: string, m: string) => domLog(logRef.value, c, m)
const dom = () => (out.value ? out.value.textContent : '?')
watch(count, v => L('tg', "flush: 'sync'  count=" + v + '  DOM=' + dom()), { flush: 'sync' })
watch(count, v => L('tr', "flush: 'pre'   count=" + v + '  DOM=' + dom()))
watch(count, v => L('rn', "flush: 'post'  count=" + v + '  DOM=' + dom()), { flush: 'post' })
function run() {
  L('m', '—— count.value++ ——')
  count.value++
  L('m', '同步代码结束')
}
</script>

<template>
  <div class="row"><button class="b pri" @click="run">count++</button><span>DOM：<b ref="out">{{ count }}</b></span></div>
  <div class="log" ref="logRef"></div>
  <div class="cap">从下向上读日志。sync 在赋值时立即运行。pre 在组件更新前运行，DOM 是旧值。post 在 DOM 更新后运行，DOM 是新值。</div>
</template>
