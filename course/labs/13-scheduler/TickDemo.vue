<script setup lang="ts">
// 实验台：同步修改三次数据（旧版 #demo-tick）
import { nextTick, onUpdated, ref } from 'vue'
import { domLog } from '../_shared'

const count = ref(0)
const out = ref<HTMLElement | null>(null)
const logRef = ref<HTMLElement | null>(null)
let renders = 0
onUpdated(() => { renders++; domLog(logRef.value, 'rn', '组件重新渲染（累计 ' + renders + ' 次）') })
async function run() {
  const L = (c: string, m: string) => domLog(logRef.value, c, m)
  L('m', '—— 点击 ——')
  count.value++; count.value++; count.value++
  L('tg', '同步执行 count++ ×3，count.value = ' + count.value)
  L('tr', '此刻 DOM 文本 = ' + out.value!.textContent + '（还没更新）')
  await nextTick()
  L('rn', 'await nextTick() 后 DOM 文本 = ' + out.value!.textContent)
}
</script>

<template>
  <div class="row"><button class="b pri" @click="run">count++ 三次</button><span>DOM 中的 count：<b ref="out">{{ count }}</b></span></div>
  <div class="log" ref="logRef"></div>
  <div class="cap">从下向上读日志。数据立即改变。DOM 仍是旧值。组件只渲染一次。nextTick 之后，DOM 是新值。</div>
</template>
