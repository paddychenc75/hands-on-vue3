<script setup lang="ts">
// Transition 标签页：日志显示每个钩子运行时元素上的类名
import { ref } from 'vue'
import { domLog } from '../_shared'

const show = ref(true)
const which = ref('A')
const outIn = ref(true)
const logRef = ref<HTMLElement | null>(null)

const L = (name: string, el: Element) => domLog(logRef.value, /leave/i.test(name) ? 'x' : 'rn', name + '  class="' + el.className + '"')
const beforeEnter = (el: Element) => L('before-enter', el)
const enter = (el: Element) => {
  L('enter', el)
  setTimeout(() => { if (el.isConnected) L('enter 后 50ms', el) }, 50)
}
const afterEnter = (el: Element) => L('after-enter', el)
const beforeLeave = (el: Element) => L('before-leave', el)
const leave = (el: Element) => {
  L('leave', el)
  setTimeout(() => { if (el.isConnected) L('leave 后 50ms', el) }, 50)
}
const afterLeave = (el: Element) => L('after-leave（元素已删除）', el)
const clear = () => { if (logRef.value) logRef.value.innerHTML = '' }
</script>

<template>
  <div class="row">
    <button class="b pri" @click="show = !show">切换 v-if（{{ show }}）</button>
    <button class="b" @click="which = which === 'A' ? 'B' : 'A'">切换 A / B</button>
    <label class="ctl"><input type="checkbox" v-model="outIn" /> mode="out-in"</label>
    <button class="b" @click="clear">清空日志</button>
  </div>
  <div class="cols" style="margin-top: 8px">
    <div>
      <div style="min-height: 44px">
        <Transition
          name="bi-fade"
          @before-enter="beforeEnter" @enter="enter" @after-enter="afterEnter"
          @before-leave="beforeLeave" @leave="leave" @after-leave="afterLeave"
        ><p v-if="show" class="box" style="margin: 0">我是 v-if 段落</p></Transition>
      </div>
      <div style="min-height: 88px; margin-top: 8px">
        <Transition name="bi-fade" :mode="outIn ? 'out-in' : undefined">
          <div :key="which" class="box">我是 {{ which }}（:key="{{ which }}"）</div>
        </Transition>
      </div>
      <div class="cap">取消 out-in 后切换 A / B。新旧元素同时出现，布局跳动。</div>
    </div>
    <div class="log" ref="logRef" style="height: 200px"></div>
  </div>
</template>
