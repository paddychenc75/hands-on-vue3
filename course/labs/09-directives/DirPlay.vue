<script setup lang="ts">
// 实验台：binding 和钩子（旧版 #demo-dir-play）
// 指令用 withDirectives 在渲染函数里挂到元素上，因为修饰符要随复选框动态变化。
// 日志用原生 DOM 写入（dLogBuf），原因见 _shared/domLog.ts。
import { computed, defineComponent, h, onMounted, reactive, ref, withDirectives } from 'vue'
import { dLogBuf } from '../_shared'

const { L, attach } = dLogBuf()
const J = (v: any) => (v === undefined ? 'undefined' : JSON.stringify(v))
const viewRef = ref<HTMLElement | null>(null)
const logRef = ref<HTMLElement | null>(null)
let lastB: any = null
const show = (b: any) => {
  lastB = b
  const el = viewRef.value
  if (!el) return
  el.textContent =
    '{\n  value: ' + J(b.value) + ',\n  oldValue: ' + J(b.oldValue) + ',\n  arg: ' + J(b.arg) +
    ',\n  modifiers: ' + J(b.modifiers) + ',\n  instance: ' + (b.instance ? '组件实例' : 'null') +
    ',\n  dir: { ' + Object.keys(b.dir).join(', ') + ' }\n}'
}
function apply(el: HTMLElement, b: any) {
  el.textContent = b.value || '（空）'
  el.style.textAlign = b.arg || 'left'
  el.style.fontWeight = b.modifiers.bold ? '700' : '400'
  el.style.borderRadius = b.modifiers.round ? '999px' : '4px'
}
const vTag = {
  created(el: HTMLElement, b: any) { L('m', 'created      value=' + J(b.value)) },
  beforeMount() { L('m', 'beforeMount') },
  mounted(el: HTMLElement, b: any) { L('rn', 'mounted      value=' + J(b.value) + '  元素已在页面中'); apply(el, b); show(b) },
  beforeUpdate(el: HTMLElement, b: any) { L('tg', 'beforeUpdate value=' + J(b.value) + ' oldValue=' + J(b.oldValue)) },
  updated(el: HTMLElement, b: any) {
    L('tg', 'updated      ' + (b.value === b.oldValue ? 'value 没有改变' : J(b.oldValue) + ' → ' + J(b.value)))
    apply(el, b); show(b)
  },
  beforeUnmount() { L('x', 'beforeUnmount') },
  unmounted() { L('x', 'unmounted    元素已删除') }
}
const Target = defineComponent({
  props: ['val', 'arg', 'mods', 'tick'],
  setup(props: any) {
    return () =>
      withDirectives(
        h('div', { class: 'dir-tag', 'data-tick': props.tick, style: 'border:1px solid var(--accent);background:var(--accent-soft);padding:6px 12px;min-width:0;overflow-wrap:anywhere' }),
        [[vTag, props.val, props.arg, { ...props.mods }]]
      )
  }
})

const val = ref('你好')
const arg = ref('left')
const mods = reactive({ bold: false, round: false })
const tick = ref(0)
const on = ref(true)
onMounted(() => { attach(logRef.value); if (lastB) show(lastB) })
const tpl = computed(() => {
  const m = Object.keys(mods).filter(k => (mods as any)[k]).map(k => '.' + k).join('')
  return '<div v-tag:[align]' + m + '="text">\n<' + '!-- align = ' + J(arg.value) + '，text = ' + J(val.value) + ' -->'
})
</script>

<template>
  <div class="row">
    <label class="ctl">value <input class="t" v-model="val" style="width: 110px" /></label>
    <label class="ctl">arg <select class="t" v-model="arg"><option>left</option><option>center</option><option>right</option></select></label>
    <label class="ctl"><input type="checkbox" v-model="mods.bold" /> .bold</label>
    <label class="ctl"><input type="checkbox" v-model="mods.round" /> .round</label>
  </div>
  <div class="row" style="margin-top: 8px">
    <button class="b" type="button" @click="tick++">无关的更新（tick={{ tick }}）</button>
    <button class="b" type="button" @click="on = !on">{{ on ? '卸载元素' : '挂载元素' }}</button>
  </div>
  <div class="cols" style="margin-top: 8px">
    <div class="box">
      <span class="cap">等价的模板</span>
      <LabCode :code="tpl" />
      <div style="margin-top: 8px">
        <Target v-if="on" :val="val" :arg="arg" :mods="mods" :tick="tick" />
        <span v-else class="cap">（元素已卸载）</span>
      </div>
    </div>
    <div class="box"><span class="cap">最近一次钩子收到的 binding</span><div class="domview" ref="viewRef">—</div></div>
  </div>
  <div class="log" ref="logRef" style="margin-top: 8px"></div>
  <div class="cap">点击“无关的更新”。updated 也运行，但 value 和 oldValue 相等。</div>
</template>
