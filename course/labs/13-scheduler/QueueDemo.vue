<script setup lang="ts">
// 实验台：一次修改中所有回调的顺序（旧版 #demo-queues）
import { nextTick, onBeforeUpdate, onUpdated, ref, watch } from 'vue'
import { domLog } from '../_shared'
import QueueChild from './QueueChild.vue'

const count = ref(0)
const logRef = ref<HTMLElement | null>(null)
const L = (c: string, m: string) => domLog(logRef.value, c, m)
watch(count, () => L('tr', "watch flush: 'pre'"))
watch(count, () => L('rn', "watch flush: 'post'"), { flush: 'post' })
onBeforeUpdate(() => L('tg', '父组件 onBeforeUpdate'))
onUpdated(() => L('rn', '父组件 onUpdated'))
function run() {
  logRef.value!.innerHTML = ''
  L('m', '1. 同步代码：count.value++')
  count.value++
  L('m', '2. 同步代码结束')
  nextTick(() => L('m', 'nextTick 回调'))
}
</script>

<template>
  <div class="row"><button class="b pri" @click="run">count++</button><span>父组件 count = {{ count }}</span><QueueChild :n="count" :log="L" /></div>
  <div class="log" ref="logRef" style="height: 220px"></div>
  <div class="cap">从下向上读日志：pre 侦听器 → 父组件更新（其中同步更新子组件）→ 后置任务（post 侦听器、子组件 onUpdated、父组件 onUpdated）→ nextTick。post 侦听器在数据改变时就入队，所以排在 onUpdated 之前。子组件的更新在父组件 patch 里完成，所以它的 onUpdated 先运行。</div>
</template>
