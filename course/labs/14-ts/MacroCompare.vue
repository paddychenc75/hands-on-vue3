<script setup lang="ts">
// 实验台：编译前和编译后（旧版 #demo-macro，宏编译对照）
// 五个标签页：左边是你写的 <script setup>，右边是编译后的选项式写法（简化）。
import { ref } from 'vue'

// 旧版为了不让 HTML 解析器误判，把标签拆开写。这里放在 JS 字符串里，没有这个问题。
const S = '<' + 'script setup lang="ts">'
const E = '</' + 'script>'
const pairs: [string, string, string, string][] = [
  ['defineProps', '编译器把类型声明转换为 props 选项。可选属性（?）转换为 required: false。',
    S + '\nconst props = defineProps<{\n  title: string\n  count?: number\n}>()\n' + E,
    'export default {\n  props: {\n    title: { type: String, required: true },\n    count: { type: Number, required: false }\n  },\n  setup(__props) {\n    const props = __props\n    return { props }\n  }\n}'],
  ['props 解构默认值 (3.5)', '编译器把解构的变量改写为 __props.xxx。所以这些变量仍是响应式的。',
    S + '\nconst { size = \'md\', tags = () => [] } = defineProps<{\n  size?: string\n  tags?: string[]\n}>()\n\nwatchEffect(() => console.log(size))\n' + E,
    'export default {\n  props: {\n    size: { type: String, required: false, default: \'md\' },\n    tags: { type: Array, required: false, default: () => [] }\n  },\n  setup(__props) {\n    watchEffect(() => console.log(__props.size))\n  }\n}'],
  ['defineEmits', '用具名元组声明事件参数。编译结果只保留事件名。',
    S + '\nconst emit = defineEmits<{\n  change: [id: number]\n  update: [value: string]\n}>()\n\nemit(\'change\', 1)\n' + E,
    'export default {\n  emits: [\'change\', \'update\'],\n  setup(__props, { emit: __emit }) {\n    const emit = __emit\n    emit(\'change\', 1)\n  }\n}'],
  ['defineModel', 'defineModel 声明 modelValue props 和 update:modelValue 事件。写入返回的 ref 时，组件发送事件。',
    S + '\nconst model = defineModel<string>({ default: \'\' })\n\n// 直接 model.value = \'x\' 即可通知父组件\n' + E,
    'export default {\n  props: {\n    modelValue: { type: String, default: \'\' },\n    modelModifiers: {}\n  },\n  emits: [\'update:modelValue\'],\n  setup(__props) {\n    const model = _useModel(__props, \'modelValue\')\n  }\n}'],
  ['defineExpose', '默认情况下，父组件不能通过 ref 读取 <script setup> 组件的内部数据。用 defineExpose 声明可以读取的内容。',
    S + '\nconst inputEl = ref()\nfunction focus() { inputEl.value.focus() }\n\ndefineExpose({ focus })\n' + E,
    'export default {\n  setup(__props, { expose: __expose }) {\n    const inputEl = ref()\n    function focus() { inputEl.value.focus() }\n    __expose({ focus })\n    return { inputEl, focus }\n  }\n}']
]
const cur = ref(0)
</script>

<template>
  <div class="tabs">
    <button v-for="(p, i) in pairs" :key="i" type="button" :class="{ on: cur === i }" @click="cur = i">{{ p[0] }}</button>
  </div>
  <div class="cap">{{ pairs[cur][1] }}</div>
  <div class="cols" style="margin-top: 8px">
    <div><span class="cap">你写的</span><LabCode :code="pairs[cur][2]" /></div>
    <div><span class="cap">编译后（简化）</span><LabCode :code="pairs[cur][3]" /></div>
  </div>
</template>
