<script setup lang="ts">
// 实验台：两种 API 写的同一个计数器（旧 demo-mig-counter）
import { onMounted, ref } from 'vue'
import { dLogBuf } from '../_shared'
import MigOptionsCounter from './MigOptionsCounter.vue'
import MigCompositionCounter from './MigCompositionCounter.vue'

const OPT = "export default {\n  props: { start: Number },\n  emits: ['change'],\n  data() { return { count: this.start } },\n  computed: {\n    double() { return this.count * 2 }\n  },\n  watch: {\n    count(v) { this.$emit('change', v) }\n  },\n  methods: {\n    inc() { this.count++ }\n  },\n  mounted() { this.$refs.btn.tagName }\n}"
const COMP = "const props = defineProps({ start: Number })\nconst emit = defineEmits(['change'])\n\nconst count = ref(props.start)\nconst double = computed(() => count.value * 2)\nwatch(count, v => emit('change', v))\nfunction inc() { count.value++ }\n\nconst btn = useTemplateRef('btn')\nonMounted(() => btn.value.tagName)"

const logRef = ref<HTMLElement | null>(null)
const start = ref(5)
const key = ref(0)
const { L, attach } = dLogBuf()
onMounted(() => attach(logRef.value))

function onChange(kind: string, v: number) {
  L('tg', kind + '：watch 发出 change(' + v + ')')
}
function remount() {
  key.value++
  L('m', '用 start = ' + start.value + ' 重新挂载两个组件')
}
</script>

<template>
  <div class="row"><label class="ctl">props.start <input class="t" type="number" v-model.number="start" /></label><button class="b" @click="remount">重新挂载</button></div>
  <div class="cols" style="margin-top: 8px">
    <div><MigOptionsCounter :key="'o' + key" :start="start" @change="onChange" @mounted="L('rn', $event)" /><LabCode :code="OPT" /></div>
    <div><MigCompositionCounter :key="'c' + key" :start="start" @change="onChange" @mounted="L('rn', $event)" /><LabCode :code="COMP" /></div>
  </div>
  <div class="log" ref="logRef" style="height: 130px"></div>
  <div class="cap">两个组件的行为完全相同。选项式 API 用 this 访问数据。组合式 API 用变量访问数据。</div>
</template>
