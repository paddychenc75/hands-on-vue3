<script setup lang="ts">
// 实验台：50 个子组件，两种传参方式（旧 demo-stable）
import { onMounted, onUpdated, ref } from 'vue'
import StableRow from './StableRow.vue'
import { stableCounts } from './perfState'

const list = Array.from({ length: 50 }, (_, i) => ({ id: i, name: '#' + (i + 1) }))
const kw = ref('')
const sEl = ref<HTMLElement | null>(null)
const uEl = ref<HTMLElement | null>(null)
const paint = () => {
  if (sEl.value && uEl.value) {
    sEl.value.textContent = String(stableCounts.stable)
    uEl.value.textContent = String(stableCounts.unstable)
  }
}
function reset() {
  stableCounts.stable = stableCounts.unstable = 0
  paint()
}
onMounted(paint)
onUpdated(paint)
</script>

<template>
  <div class="row"><label class="ctl">在这里打字 <input class="t" v-model="kw" placeholder="触发父组件重渲染" /></label><span class="cap">父组件显示：{{ kw || '—' }}</span><button class="b" @click="reset">计数归零</button></div>
  <div class="cols">
    <div class="box"><span class="cap">:item="item"（引用稳定）· 子组件更新 <b ref="sEl">0</b> 次</span>
      <div class="row" style="gap: 4px"><StableRow v-for="it in list" :key="it.id" :item="it" side="stable" /></div></div>
    <div class="box"><span class="cap">:item="{ id: it.id, name: it.name }"（每次新对象）· 子组件更新 <b ref="uEl">0</b> 次</span>
      <div class="row" style="gap: 4px"><StableRow v-for="it in list" :key="it.id" :item="{ id: it.id, name: it.name }" side="unstable" /></div></div>
  </div>
  <div class="cap">每输入一个字，左边更新 0 次，右边更新 50 次。两边的显示相同。</div>
</template>
