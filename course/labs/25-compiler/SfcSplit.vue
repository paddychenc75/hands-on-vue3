<script setup lang="ts">
// 实验台：一个 .vue 文件怎样被拆开编译。按 plugin-vue 的顺序调用 @vue/compiler-sfc 的 parse、compileScript、compileTemplate、compileStyle。
// 编译器是 compiler-sfc 的浏览器构建（约 1.7MB），挂载后才动态加载。
import { ref, shallowRef, computed, onMounted } from 'vue'
import { runSfc } from './sfc'

const SAMPLE = `<script setup>
import { ref, computed } from 'vue'
import Child from './Child.vue'
const props = defineProps({ title: String })
const count = ref(0)
const double = computed(() => count.value * 2)
function inc() { count.value++ }
<\/script>

<template>
  <h1 class="t">{{ title }}</h1>
  <button @click="inc">{{ count }} x2={{ double }}</button>
  <Child :n="count" />
</template>

<style scoped>
.t { color: red }
.t :deep(.x) { color: blue }
</style>
`
const TABS = ['① parse：拆块', '② compileScript', '③ compileTemplate', '④ compileStyle']

const src = ref(SAMPLE)
const tab = ref(0)
const inline = ref(false)
const compiler = shallowRef<any>(null)

const out = computed(() => {
  if (!compiler.value) return null
  try { return runSfc(compiler.value, src.value, { inline: inline.value }) } catch (e: any) { return { errors: [e.message], blocks: '', script: '', template: '', styles: '', scopeId: '' } }
})
const text = computed(() => {
  const o = out.value
  if (!o) return '正在加载编译器…'
  if (o.errors.length) return '错误：\n' + o.errors.join('\n')
  return [o.blocks, o.script, o.template, o.styles][tab.value] || '（这个文件没有这一部分）'
})
onMounted(async () => {
  compiler.value = await import('@vue/compiler-sfc/dist/compiler-sfc.esm-browser.js')
})
</script>

<template>
  <textarea class="t" v-model="src" spellcheck="false" aria-label="单文件组件源码" style="min-height:260px"></textarea>
  <div class="row">
    <label class="ctl"><input type="checkbox" v-model="inline"> 内联模板（生产构建的做法）</label>
    <span class="cap">scope id 固定为 data-v-7ba5bd90</span>
  </div>
  <div class="tabs" role="tablist">
    <button v-for="(t, i) in TABS" :key="i" role="tab" :class="{ on: tab === i }" :aria-selected="tab === i" @click="tab = i">{{ t }}</button>
  </div>
  <pre class="code" style="max-height:420px">{{ text }}</pre>
</template>
