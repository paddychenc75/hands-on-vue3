<script setup lang="ts">
// 实验台：一万行数据（旧 demo-vlist）
import { computed, nextTick, onMounted, ref } from 'vue'

const N = 10000
const rowH = 28
const viewH = 280
const items = Object.freeze(
  Array.from({ length: N }, (_, i) => Object.freeze({ id: i, text: '第 ' + (i + 1) + ' 行', v: (i * 7919) % 1000 }))
)
const mode = ref('virtual')
const scrollTop = ref(0)
const ms = ref<number | null>(null)
const nodes = ref(0)
const box = ref<HTMLElement | null>(null)
const busy = ref(false)
const visible = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / rowH) - 5)
  return items.slice(start, start + Math.ceil(viewH / rowH) + 10)
})
const count = () => {
  nodes.value = box.value ? box.value.querySelectorAll('.vrow').length : 0
}
async function setMode(m: string) {
  if (m === mode.value || busy.value) return
  busy.value = true
  await new Promise(r => setTimeout(r, 30))
  const t0 = performance.now()
  mode.value = m
  scrollTop.value = 0
  await nextTick()
  ms.value = Math.round(performance.now() - t0)
  if (box.value) box.value.scrollTop = 0
  count()
  busy.value = false
}
function onScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop
  nextTick(count)
}
onMounted(count)
</script>

<template>
  <div class="row">
    <button class="b" :class="{ on: mode === 'virtual' }" @click="setMode('virtual')" :disabled="busy">虚拟列表</button>
    <button class="b" :class="{ on: mode === 'full' }" @click="setMode('full')" :disabled="busy">全量渲染 10000 行</button>
    <span class="cap" v-if="busy">渲染中…</span>
  </div>
  <dl class="kv"><dt>本次切换耗时</dt><dd>{{ ms === null ? '切换一次模式来测量' : ms + ' ms' }}</dd><dt>当前 DOM 行数</dt><dd>{{ nodes }}</dd></dl>
  <div class="vl" ref="box" @scroll="onScroll">
    <div v-if="mode === 'virtual'" :style="{ height: N * rowH + 'px', position: 'relative' }">
      <div v-for="it in visible" :key="it.id" class="vrow" :style="{ position: 'absolute', left: 0, right: 0, top: it.id * rowH + 'px' }"><span>{{ it.text }}</span><span>{{ it.v }}</span></div>
    </div>
    <div v-else><div v-for="it in items" :key="it.id" class="vrow"><span>{{ it.text }}</span><span>{{ it.v }}</span></div></div>
  </div>
  <div class="cap">滚动虚拟列表。DOM 行数保持在 20 行左右。全量模式有 10000 行。数据使用 Object.freeze，所以 Vue 不代理数据。</div>
</template>
