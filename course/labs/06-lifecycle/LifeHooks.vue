<script setup lang="ts">
// 实验台：挂载、更新和卸载一个子组件（旧版 #demo-life）
// 日志和高亮用原生 DOM：钩子在渲染中运行，不能在钩子里改响应式数据。
import { onMounted, provide, ref } from 'vue'
import { dLogBuf } from '../_shared'
import LifeChild from './LifeChild.vue'

const HOOKS = ['setup', 'onBeforeMount', 'onMounted', 'onBeforeUpdate', 'onUpdated', 'onBeforeUnmount', 'onUnmounted', 'onActivated', 'onDeactivated']
const show = ref(true)
const n = ref(0)
const keep = ref(false)
const logRef = ref<HTMLElement | null>(null)
const gridRef = ref<HTMLElement | null>(null)

// 首屏挂载时，子组件的钩子早于父组件的 onMounted，这时还没有日志元素。
// dLogBuf 先缓存日志；高亮格子也先记下来，等父组件挂载后一起处理。
const { L, attach } = dLogBuf()
let gridEl: HTMLElement | null = null
const pending: string[] = []

function light(name: string) {
  const el = gridEl?.querySelector('[data-h="' + name + '"]') as HTMLElement | null | undefined
  if (!el) return
  el.classList.remove('lit')
  void el.offsetWidth
  el.classList.add('lit')
  setTimeout(() => el.classList.remove('lit'), 900)
}
function hit(name: string) {
  L(name.includes('Unmount') || name === 'onDeactivated' ? 'x' : name.includes('Update') ? 'tg' : 'rn', 'Child ' + name)
  if (gridEl) light(name)
  else pending.push(name)
}
provide('lifeHit', hit)

onMounted(() => {
  attach(logRef.value)
  gridEl = gridRef.value
  pending.splice(0).forEach(light)
  L('m', '上面几行是页面加载时父组件和 Child 的挂载日志（Child 先完成）。点击按钮，观察日志。')
})

function clear() {
  if (logRef.value) logRef.value.innerHTML = ''
}
</script>

<template>
  <div class="row">
    <button class="b pri" @click="show = !show">{{ show ? '卸载 Child（v-if=false）' : '挂载 Child' }}</button>
    <button class="b" @click="n++" :disabled="!show">更新 prop n++</button>
    <label class="ctl"><input type="checkbox" v-model="keep" /> 用 KeepAlive 包裹</label>
    <button class="b" @click="clear">清空日志</button>
  </div>
  <div class="hook-grid" ref="gridRef"><div v-for="h in HOOKS" :key="h" class="hook" :data-h="h">{{ h }}</div></div>
  <div class="cols">
    <div>
      <KeepAlive v-if="keep"><LifeChild v-if="show" :n="n" /></KeepAlive>
      <LifeChild v-else-if="show" :n="n" />
      <div v-if="!show" class="box cap">Child 已{{ keep ? '失活（实例被缓存）' : '卸载' }}</div>
    </div>
    <div class="log" ref="logRef"></div>
  </div>
  <div class="cap">选择 KeepAlive，然后切换 Child。日志显示 deactivated 和 activated，不显示 unmount 和 setup。Vue 缓存了组件实例。</div>
</template>
