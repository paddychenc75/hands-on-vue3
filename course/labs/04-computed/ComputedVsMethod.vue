<script setup lang="ts">
// 实验台：computed 和方法调用（旧版 #demo-computed）
import { computed, onMounted, onUpdated, ref } from 'vue'

const first = ref('Evan')
const last = ref('You')
const tick = ref(0)
let cCount = 0
let mCount = 0
const cEl = ref<HTMLElement | null>(null)
const mEl = ref<HTMLElement | null>(null)
const full = computed(() => { cCount++; return first.value + ' ' + last.value })
function fullFn() { mCount++; return first.value + ' ' + last.value }
// 执行次数是普通变量，不是响应式数据（否则读它本身会触发更新）。渲染后直接写进 DOM。
const paint = () => {
  if (cEl.value && mEl.value) {
    cEl.value.textContent = String(cCount)
    mEl.value.textContent = String(mCount)
  }
}
onMounted(paint)
onUpdated(paint)
</script>

<template>
  <div class="row">
    <label class="ctl">firstName <input class="t" v-model="first" style="width:110px"></label>
    <label class="ctl">lastName <input class="t" v-model="last" style="width:110px"></label>
    <button class="b" @click="tick++">无关状态 tick++（{{ tick }}）</button>
  </div>
  <div class="cols">
    <div class="box"><span class="cap">模板中读取 3 次 computed</span>
      <div>{{ full }} · {{ full }} · {{ full }}</div>
      <div class="cap">getter 执行次数 <b ref="cEl">0</b></div></div>
    <div class="box"><span class="cap">模板中调用 3 次方法</span>
      <div>{{ fullFn() }} · {{ fullFn() }} · {{ fullFn() }}</div>
      <div class="cap">方法执行次数 <b ref="mEl">0</b></div></div>
  </div>
  <div class="cap">点击 tick++。组件更新。方法运行 3 次。computed 不运行。修改名字时，computed 只运行 1 次。</div>
</template>
