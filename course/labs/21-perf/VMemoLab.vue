<script setup lang="ts">
// 实验台：5000 行中切换选中项（旧 demo-memo）
import { nextTick, ref } from 'vue'
import MemoPlain from './MemoPlain.vue'
import MemoMemo from './MemoMemo.vue'
import { memoSel as sel } from './perfState'

const memo = ref(true)
const times = ref<Record<string, number[]>>({ true: [], false: [] })
const busy = ref(false)
async function pick() {
  if (busy.value) return
  busy.value = true
  const t0 = performance.now()
  sel.value = Math.floor(Math.random() * 30)
  await nextTick()
  const ms = performance.now() - t0
  const arr = times.value[String(memo.value)]
  arr.push(ms)
  if (arr.length > 5) arr.shift()
  times.value = { ...times.value }
  busy.value = false
}
const avg = (k: boolean) => {
  const a = times.value[String(k)]
  return a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1) + ' ms（' + a.length + ' 次平均）' : '还没有测量'
}
</script>

<template>
  <div class="row">
    <button class="b" :class="{ on: memo }" @click="memo = true">使用 v-memo</button>
    <button class="b" :class="{ on: !memo }" @click="memo = false">不使用 v-memo</button>
    <button class="b pri" @click="pick" :disabled="busy">随机选中前 30 行中的一行</button>
  </div>
  <dl class="kv"><dt>使用 v-memo</dt><dd>{{ avg(true) }}</dd><dt>不使用 v-memo</dt><dd>{{ avg(false) }}</dd></dl>
  <div class="vl" style="height: 200px"><MemoMemo v-if="memo" /><MemoPlain v-else /></div>
  <div class="cap">每种模式各点击几次，然后比较平均时间。不使用 v-memo 时，Vue 为 5000 行都创建新的虚拟节点并比较。</div>
</template>
