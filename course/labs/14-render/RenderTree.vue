<script setup lang="ts">
// 模板和 h() 渲染同一棵树（旧 demo-render-tree）。
import { ref, reactive, computed, watch, nextTick, onMounted, onUpdated } from 'vue'
import OutlineT from './OutlineT.vue'
import OutlineH from './OutlineH'

const TPL = '<template v-for="n in nodes" :key="n.id">\n  <component :is="\'h\' + Math.min(level, 6)">{{ n.title }}</component>\n  <OutlineT v-if="n.children.length" :nodes="n.children" :level="level + 1" />\n</template>'
const HSRC = "const OutlineH = {\n  props: ['nodes', 'level'],\n  setup(props) {\n    return () => props.nodes.map(n => [\n      h('h' + Math.min(props.level, 6), { key: 't' + n.id }, n.title),\n      n.children.length\n        ? h(OutlineH, { key: 'c' + n.id, nodes: n.children, level: props.level + 1 })\n        : null\n    ])\n  }\n}"

const COMMENT = new RegExp('<' + '!--[\\s\\S]*?--' + '>', 'g')
const clean = (s: string) => s.replace(COMMENT, '').replace(/></g, '>\n<')

let id = 10
const tree = reactive<any[]>([
  { id: 1, title: '响应式', children: [{ id: 2, title: 'ref', children: [] }, { id: 3, title: 'reactive', children: [{ id: 4, title: 'Proxy', children: [] }] }] },
  { id: 5, title: '渲染', children: [] }
])
const level = ref(2)
const view = ref('h')
const tBox = ref<HTMLElement | null>(null)
const hBox = ref<HTMLElement | null>(null)
const tHtml = ref('')
const hHtml = ref('')
const compiled = ref('')

const read = () => {
  if (tBox.value) tHtml.value = clean(tBox.value.innerHTML)
  if (hBox.value) hHtml.value = clean(hBox.value.innerHTML)
}
onMounted(read)
onUpdated(read)
watch([tree, level], () => nextTick(read), { deep: true })

const same = computed(() => tHtml.value !== '' && tHtml.value === hHtml.value)
const all = () => {
  const out: any[] = []
  const walk = (ns: any[]) => ns.forEach(n => { out.push(n); walk(n.children) })
  walk(tree)
  return out
}
function addChild() {
  const ns = all()
  const p = ns[Math.floor(Math.random() * ns.length)]
  p.children.push({ id: ++id, title: '新节点 ' + id, children: [] })
}
function rename() {
  tree[0].title = tree[0].title === '响应式' ? '响应式（已修改）' : '响应式'
}
// 运行时编译需要带编译器的构建（和 Exercise 一样动态导入）
async function showCompiled() {
  if (compiled.value) { compiled.value = ''; return }
  try {
    const vm: any = await import('vue/dist/vue.esm-bundler.js')
    compiled.value = vm.compile(TPL).toString()
  } catch (e: any) { compiled.value = '编译失败：' + e.message }
}
</script>

<template>
  <div class="row">
    <label class="ctl">起始级别 level <select class="t" v-model.number="level"><option v-for="n in 4" :key="n" :value="n">h{{ n }}</option></select></label>
    <button class="b pri" @click="addChild">随机添加子节点</button>
    <button class="b" @click="rename">修改第一个标题</button>
  </div>
  <div class="cols" style="margin-top:8px">
    <div class="box"><span class="cap">模板版本 OutlineT（递归组件）</span><div ref="tBox"><OutlineT :nodes="tree" :level="level" /></div></div>
    <div class="box"><span class="cap">h() 版本 OutlineH</span><div ref="hBox"><OutlineH :nodes="tree" :level="level" /></div></div>
  </div>
  <div class="cap" style="margin-top:6px">两边生成的 HTML（去掉注释节点后）：<b :style="{ color: same ? 'var(--accent)' : 'var(--bad)' }">{{ same ? '完全相同' : '不同' }}</b></div>
  <div class="tabs" style="margin-top:8px">
    <button type="button" :class="{ on: view === 'h' }" @click="view = 'h'">h() 代码</button>
    <button type="button" :class="{ on: view === 't' }" @click="view = 't'">模板代码</button>
    <button type="button" :class="{ on: view === 'html' }" @click="view = 'html'">生成的 HTML</button>
  </div>
  <LabCode v-if="view === 'h'" :code="HSRC" />
  <LabCode v-else-if="view === 't'" :code="TPL" />
  <div v-else class="domview" style="margin-top:8px;max-height:220px;overflow:auto">{{ hHtml }}</div>
  <div class="row"><button class="b" @click="showCompiled">{{ compiled ? '隐藏编译结果' : '查看模板的编译结果' }}</button></div>
  <div v-if="compiled" class="domview" style="margin-top:6px;max-height:260px;overflow:auto">{{ compiled }}</div>
  <div v-if="compiled" class="cap">编译结果中有 openBlock、createElementBlock 和数字形式的 PatchFlags。h() 版本没有这些信息。浏览器版的 Vue.compile 不开启事件缓存。</div>
</template>
