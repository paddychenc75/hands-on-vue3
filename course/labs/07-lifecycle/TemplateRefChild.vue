<script setup lang="ts">
// 实验台：模板 ref 的值什么时候改变——Child 组件（旧版 #demo-tref 里的 Child）
import { onBeforeUnmount, onMounted, onUnmounted, onUpdated, ref, useTemplateRef, watch } from 'vue'

// 日志函数由父组件传入：父组件的日志元素挂载前，这里的日志先缓存在父组件里
const props = defineProps<{ log: (cls: string, msg: string) => void }>()
const L = props.log

const desc = (v: any) =>
  v == null ? 'null' : Array.isArray(v) ? '数组，长度 ' + v.length : v.tagName ? '<' + v.tagName.toLowerCase() + '>' : String(v)

const inp = useTemplateRef<HTMLInputElement>('inpRef')
const items = useTemplateRef<HTMLElement[]>('itemsRef')
const showInput = ref(true)
const list = ref([1, 2])
let node: HTMLInputElement | null = null

L('m', 'setup：inp.value = ' + desc(inp.value))
onMounted(() => {
  node = inp.value
  L('rn', 'onMounted：inp.value = ' + desc(inp.value) + '，items.value = ' + desc(items.value))
})
watch(inp, v => L('tg', 'watch(inp)：inp.value = ' + desc(v)), { flush: 'post' })
onUpdated(() => L('tg', 'onUpdated：items.value = ' + desc(items.value)))
onBeforeUnmount(() => L('x', 'onBeforeUnmount：inp.value = ' + desc(inp.value)))
onUnmounted(() => L('x', 'onUnmounted：inp.value = ' + desc(inp.value) + '，局部变量 node = ' + desc(node)))

function focus() {
  if (inp.value) {
    inp.value.focus()
    L('rn', 'child.focus() 运行，输入框获得焦点')
  } else L('x', 'child.focus()：输入框不存在')
}
// 只暴露 focus，所以父组件读不到 showInput
defineExpose({ focus })
</script>

<template>
  <div class="box">
    <span class="cap">Child 组件</span>
    <div class="row">
      <input v-if="showInput" ref="inpRef" class="t" placeholder="ref=inp" aria-label="ref=inp" style="width: 120px" />
      <button class="b" @click="showInput = !showInput">{{ showInput ? 'v-if 删除 input' : '恢复 input' }}</button>
      <button class="b" @click="list.push(list.length + 1)">v-for 加一项</button>
    </div>
    <div class="row" style="gap: 6px; margin-top: 6px">
      <span v-for="n in list" :key="n" ref="itemsRef" class="pill">li {{ n }}</span>
    </div>
  </div>
</template>
