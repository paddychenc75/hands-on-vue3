<script setup lang="ts">
// 实验台：模板 ref 的值什么时候改变（旧版 #demo-tref）
import { onMounted, ref, useTemplateRef } from 'vue'
import { dLogBuf } from '../_shared'
import TemplateRefChild from './TemplateRefChild.vue'

const show = ref(true)
const logRef = ref<HTMLElement | null>(null)
const child = useTemplateRef<any>('childRef')
const { L, attach } = dLogBuf()

onMounted(() => {
  attach(logRef.value)
  L('m', '上面几行是页面加载时的日志。点击按钮，观察 ref 的值。')
})

function callFocus() {
  if (child.value) child.value.focus()
  else L('x', '父组件：child.value = null')
}
function peek() {
  if (!child.value) {
    L('x', '父组件：child.value = null')
    return
  }
  L('i', '父组件：typeof child.value.focus = ' + typeof child.value.focus + '，child.value.showInput = ' + String(child.value.showInput) + '（没有暴露）')
}
</script>

<template>
  <div class="row">
    <button class="b pri" @click="show = !show">{{ show ? '卸载 Child' : '挂载 Child' }}</button>
    <button class="b" @click="callFocus">父组件调用 child.focus()</button>
    <button class="b" @click="peek">读取 child.value</button>
  </div>
  <div class="cols" style="margin-top: 8px">
    <div>
      <TemplateRefChild v-if="show" ref="childRef" :log="L" />
      <div v-else class="box cap">Child 已卸载</div>
    </div>
    <div class="log" ref="logRef"></div>
  </div>
  <div class="cap">说明：Child 用 expose 只暴露了 focus。所以父组件读不到 showInput。</div>
</template>
