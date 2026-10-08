<script setup lang="ts">
// 实验台：v-click-outside 和监听泄漏（旧版 #demo-dir-outside）
import { onMounted, onUnmounted, ref } from 'vue'
import { dLogBuf } from '../_shared'
import OutsideDropdown from './OutsideDropdown.vue'
import { ctx, leakedHandlers, state } from './outsideCtx'

const { L, attach } = dLogBuf()
ctx.L = L
const on = ref(true)
const wrong = ref(false)
const logRef = ref<HTMLElement | null>(null)
onMounted(() => attach(logRef.value))
// 本实验台卸载后，不再往已经不存在的日志里写
onUnmounted(() => { ctx.L = () => {} })
function clearLeaks() {
  leakedHandlers.splice(0).forEach(fn => document.removeEventListener('click', fn))
  L('m', '已删除所有泄漏的监听')
  state.leaked = 0
}
</script>

<template>
  <div class="row">
    <label class="ctl"><input type="checkbox" v-model="state.cleanup" /> 卸载时删除监听</label>
    <label class="ctl"><input type="checkbox" v-model="wrong" /> 指令放在菜单上（错误）</label>
  </div>
  <div class="row" style="margin-top: 8px">
    <button class="b" type="button" @click="on = !on">{{ on ? '卸载' : '挂载' }}组件</button>
    <button class="b" type="button" @click="clearLeaks" :disabled="!state.leaked">删除泄漏的监听</button>
    <span>document 监听：<b>{{ state.active + state.leaked }}</b> 个 <span class="pill" :class="{ g: !state.leaked }">泄漏 {{ state.leaked }}</span></span>
  </div>
  <div style="margin-top: 8px; min-height: 70px">
    <OutsideDropdown v-if="on" :wrong="wrong" :key="String(wrong)" />
    <p v-else class="cap">组件已卸载。点击页面任何位置，观察日志。</p>
  </div>
  <div class="log" ref="logRef" style="margin-top: 8px"></div>
</template>
