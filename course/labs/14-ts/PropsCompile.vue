<script setup lang="ts">
// 实验台：类型声明 / 运行时声明 / 出错的写法，各自编译成什么 props 和 emits。
// 用 @vue/compiler-sfc 的浏览器构建（挂载后才动态加载），调用 compileScript，只显示 props 和 emits 那一段。
import { ref, shallowRef, computed, onMounted } from 'vue'

const S = '<' + 'script setup lang="ts">'
const E = '</' + 'script>'
const PRESETS = [
  { name: '类型声明', tip: '把类型写进尖括号。编译器读出类型，生成运行时的 type 和 required。字面量联合类型的成员都是字符串，所以是 String。',
    src: S + `
interface Props {
  title: string
  size?: 'sm' | 'lg'
  id: string | number
  onPick?: () => void
}
defineProps<Props>()
const emit = defineEmits<{ move: [to: 'todo' | 'done']; remove: [] }>()
` + E },
  { name: '运行时声明', tip: '同一个组件的运行时写法：显式写出每个 prop 的 type 和 required。生成的选项和上一页等价。',
    src: S + `
defineProps({
  title: { type: String, required: true },
  size: String,
  id: [String, Number],
  onPick: Function
})
const emit = defineEmits(['move', 'remove'])
` + E },
  { name: '解构默认值 (3.5)', tip: '解构时写的默认值变成 default。数组和对象的默认值，编译器自动包成函数。',
    src: S + `
const { title, size = 'sm', tags = ['a'] } = defineProps<{
  title: string
  size?: 'sm' | 'lg'
  tags?: string[]
}>()
` + E },
  { name: 'withDefaults', tip: '3.5 之前的写法，3.5 仍可用。数组和对象的默认值要自己写成函数。',
    src: S + `
const props = withDefaults(
  defineProps<{ size?: 'sm' | 'lg'; tags?: string[] }>(),
  { size: 'sm', tags: () => ['a'] }
)
` + E },
  { name: '整体条件类型 (报错)', tip: '编译器只做语法分析，不做类型计算。整个 props 对象写成条件类型，它算不出来，直接报错。注意：vue-tsc 对这段代码不报错。',
    src: S + `
type Cond<T> = T extends string ? { a: string } : { b: number }
defineProps<Cond<string>>()
` + E },
  { name: '单个 prop 用条件类型', tip: '条件类型只能用在单个 prop 的类型上。编译器放弃分析这个 prop 的类型，type 变成 null（不检查）。',
    src: S + `
type Wrap<T> = T extends string ? string[] : number
defineProps<{ a: Wrap<string>; b: string }>()
` + E },
]
const cur = ref(0)
const src = ref(PRESETS[0].src)
const compiler = shallowRef<any>(null)

function pick(i: number) { cur.value = i; src.value = PRESETS[i].src }

const out = computed(() => {
  const c = compiler.value
  if (!c) return { text: '正在加载编译器…', err: false }
  try {
    const { descriptor, errors } = c.parse(src.value, { filename: 'Demo.vue' })
    if (errors.length) return { text: errors.map((e: any) => e.message).join('\n'), err: true }
    const r = c.compileScript(descriptor, { id: 'demo' })
    const m = r.content.match(/\n  ((?:props|emits): [\s\S]*?),?\n  setup\(/)
    const parts = m ? [m[1]] : []
    return { text: parts.length ? parts.join('\n') : '（没有生成 props 或 emits 选项）', err: false }
  } catch (e: any) {
    return { text: '编译失败：' + String(e.message || e).replace('[@vue/compiler-sfc] ', ''), err: true }
  }
})
onMounted(async () => {
  compiler.value = await import('@vue/compiler-sfc/dist/compiler-sfc.esm-browser.js')
})
</script>

<template>
  <div class="tabs" role="tablist">
    <button v-for="(p, i) in PRESETS" :key="i" role="tab" :class="{ on: cur === i }" :aria-selected="cur === i" @click="pick(i)">{{ p.name }}</button>
  </div>
  <div class="cap">{{ PRESETS[cur].tip }}</div>
  <div class="cols" style="margin-top: 8px">
    <div>
      <span class="cap">你写的（可以改）</span>
      <textarea class="t" v-model="src" spellcheck="false" aria-label="组件源码" style="min-height: 210px"></textarea>
    </div>
    <div>
      <span class="cap">编译器生成的 props 和 emits</span>
      <pre class="code" :data-err="out.err" style="min-height: 210px; white-space: pre-wrap">{{ out.text }}</pre>
    </div>
  </div>
</template>
