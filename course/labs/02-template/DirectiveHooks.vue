<script setup lang="ts">
// 实验台：自定义指令的钩子（旧版 #demo-directive）
// 日志直接写进 DOM，不用响应式数据。原因：钩子在渲染过程中运行，
// 如果钩子里修改响应式数据，会触发新的渲染，新的渲染又运行钩子，形成死循环。
import { onMounted, ref } from 'vue'

let logEl: HTMLElement | null = null
function domLog(el: HTMLElement | null, cls: string, msg: string) {
  if (!el) return
  const d = document.createElement('div')
  d.className = cls
  const t = new Date()
  d.textContent = String(t.getSeconds()).padStart(2, '0') + '.' + String(t.getMilliseconds()).padStart(3, '0') + '  ' + msg
  el.prepend(d)
  while (el.children.length > 80) el.lastChild!.remove()
}

const COLORS: Record<string, string> = { yellow: 'var(--warn-soft)', blue: 'var(--info-soft)' }
const L = (hook: string, binding: any) =>
  domLog(
    logEl,
    hook.includes('nmount') ? 'x' : hook.includes('pdate') ? 'tg' : 'rn',
    hook + '  arg=' + binding.arg + '  value=' + binding.value + '  oldValue=' + binding.oldValue + '  modifiers=' + JSON.stringify(binding.modifiers)
  )
function apply(el: HTMLElement, b: any) {
  el.style.background = b.value ? COLORS[b.arg] || '' : ''
  el.style.fontWeight = b.value && b.modifiers.bold ? '700' : ''
}
// <script setup> 中以 v 开头的驼峰变量自动注册为指令：vHighlight 就是 v-highlight
const vHighlight = {
  created(el: HTMLElement, b: any) { L('created', b) },
  mounted(el: HTMLElement, b: any) { L('mounted', b); apply(el, b) },
  beforeUpdate(el: HTMLElement, b: any) { L('beforeUpdate', b) },
  updated(el: HTMLElement, b: any) { L('updated', b); if (b.value !== b.oldValue) apply(el, b) },
  beforeUnmount(el: HTMLElement, b: any) { L('beforeUnmount', b) },
  unmounted(el: HTMLElement, b: any) { L('unmounted', b) }
}

const on = ref(false)
const show = ref(true)
const n = ref(0)
const logRef = ref<HTMLElement | null>(null)
onMounted(() => { logEl = logRef.value })
</script>

<template>
  <div class="row">
    <label class="ctl"><input type="checkbox" v-model="on" /> value = {{ on }}</label>
    <button class="b" @click="n++">无关数据 n++（{{ n }}）</button>
    <button class="b" @click="show = !show">{{ show ? '移除元素' : '添加元素' }}</button>
  </div>
  <div class="cols">
    <div style="display: flex; flex-direction: column; gap: 6px">
      <p v-if="show" v-highlight:yellow="on" style="margin: 0; padding: 4px 8px; border-radius: 4px">v-highlight:yellow="on"</p>
      <p v-if="show" v-highlight:blue.bold="on" style="margin: 0; padding: 4px 8px; border-radius: 4px">v-highlight:blue.bold="on"</p>
      <div class="cap">点击“无关数据 n++”。组件更新，所以指令的 updated 也运行，但 value 和 oldValue 相同。</div>
    </div>
    <div class="log" ref="logRef"></div>
  </div>
</template>
