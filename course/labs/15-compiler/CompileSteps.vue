<script setup lang="ts">
// 实验台：编译的三步。分别调用 parse、transform、generate，展示每一步之后的样子。
// 编译器是 @vue/compiler-dom 的浏览器构建，挂载后才动态加载。
import { ref, shallowRef, computed, onMounted } from 'vue'
import { runSteps } from './steps'

const presets: [string, string][] = [
  ['动态文本与 class', '<div>\n  <h1>标题</h1>\n  <p :class="c" id="x">{{ msg }}</p>\n</div>'],
  ['v-if / v-else', '<div>\n  <p v-if="ok" :title="t">是</p>\n  <p v-else>否</p>\n</div>'],
  ['v-for', '<ul>\n  <li v-for="i in list" :key="i.id">{{ i.n }}</li>\n</ul>'],
  ['组件与事件', '<div>\n  <button @click="n++">+1</button>\n  <MyComp :value="n" />\n</div>'],
  ['多个根节点', '<h1>标题</h1>\n<p>{{ msg }}</p>']
]
const TABS = ['① parse：模板 AST', '② transform：优化信息', '③ generate：渲染函数']

const preset = ref(0)
const src = ref(presets[0][1])
const tab = ref(0)
const compiler = shallowRef<any>(null)

const res = computed(() => {
  if (!compiler.value) return null
  try { return { ok: true as const, ...runSteps(compiler.value, src.value) } } catch (e: any) { return { ok: false as const, err: e.message } }
})
const text = computed(() => {
  const r = res.value
  if (!r) return '正在加载编译器…'
  if (!r.ok) return '编译错误：' + r.err
  return [r.ast, r.transformed, r.code][tab.value]
})

function onPreset() { src.value = presets[preset.value][1] }
onMounted(async () => {
  compiler.value = await import('@vue/compiler-dom/dist/compiler-dom.esm-browser.js')
})
</script>

<template>
  <div class="row">
    <label class="ctl">示例 <select class="t" v-model.number="preset" @change="onPreset">
      <option v-for="(p, i) in presets" :key="i" :value="i">{{ p[0] }}</option>
    </select></label>
  </div>
  <textarea class="t" v-model="src" spellcheck="false" aria-label="模板源码"></textarea>
  <div class="tabs" role="tablist">
    <button v-for="(t, i) in TABS" :key="i" role="tab" :class="{ on: tab === i }" :aria-selected="tab === i" @click="tab = i">{{ t }}</button>
  </div>
  <div class="cap" v-if="tab === 0">parse 只看模板的写法：标签、属性、指令、文字。此时还不知道哪些部分是动态的，指令只是带名字和表达式的节点。</div>
  <div class="cap" v-else-if="tab === 1">transform 之后，每个元素有了 codegenNode：PatchFlag、动态属性名、是不是 Block、静态节点是否放进 _cache。v-if、v-for 变成 IF、FOR 节点。</div>
  <div class="cap" v-else>generate 把 codegenNode 逐个打印成字符串。{{ res && res.ok ? (res.same ? '这段结果和一次 compile() 的结果相同。' : '') : '' }}</div>
  <pre class="code" style="max-height:420px">{{ text }}</pre>
</template>
