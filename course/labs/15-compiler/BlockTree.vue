<script setup lang="ts">
// 实验台：Block 树查看器（旧版 #demo-block）
// 用带编译器的构建挂载真实组件，读取实例的 subTree。
import { ref, shallowRef, computed, onMounted, onBeforeUnmount } from 'vue'

const presets: [string, string][] = [
  ['静态与动态混合', '<div>\n  <h1>静态标题</h1>\n  <p>{{ msg }}</p>\n  <section>\n    <span>静态</span>\n    <em :class="cls">动态 class</em>\n  </section>\n</div>'],
  ['v-if 创建新 Block', '<div>\n  <p>静态</p>\n  <div v-if="ok">\n    <span>{{ msg }}</span>\n    <i>静态</i>\n  </div>\n  <b v-else>否</b>\n</div>'],
  ['v-for 创建新 Block', '<div>\n  <h3>{{ msg }}</h3>\n  <ul>\n    <li v-for="i in list" :key="i">{{ i }}</li>\n  </ul>\n</div>']
]
const FLAG: Record<number, string> = { 1: 'TEXT', 2: 'CLASS', 4: 'STYLE', 8: 'PROPS', 16: 'FULL_PROPS', 64: 'STABLE_FRAGMENT', 128: 'KEYED_FRAGMENT', 256: 'UNKEYED_FRAGMENT', 512: 'NEED_PATCH' }
const flagTxt = (f: number) => f === -1 ? 'CACHED' : f > 0 ? Object.keys(FLAG).map(Number).filter(b => f & b).map(b => FLAG[b]).join('|') : ''

const preset = ref(0)
const src = ref(presets[0][1])
const vue = shallowRef<any>(null)
const hostEl = ref<HTMLElement | null>(null)
const tree = ref('')
const dyn = ref('')
let app: any = null

function name(v: any) {
  const { Fragment, Comment, Text } = vue.value
  return typeof v.type === 'string' ? v.type : v.type === Fragment ? 'Fragment' : v.type === Comment ? 'Comment' : v.type === Text ? 'Text' : 'Component'
}

function run() {
  if (!vue.value || !hostEl.value) return
  if (app) { try { app.unmount() } catch (e) { /* 忽略 */ } app = null }
  const errs: string[] = []
  try { vue.value.compile(src.value, { onError: (e: Error) => errs.push(e.message) }) } catch (e: any) { errs.push(e.message) }
  if (errs.length) { tree.value = '模板错误：' + errs.join('；'); dyn.value = ''; return }
  try {
    app = vue.value.createApp({ template: src.value, setup: () => ({ msg: 'hello', cls: 'active', ok: true, list: [1, 2, 3] }) })
    app.config.warnHandler = () => {}
    const vm = app.mount(hostEl.value)
    const lines: string[] = []
    const blocks: any[] = []
    ;(function walk(v: any, depth: number) {
      if (!v || typeof v !== 'object') return
      const isBlock = Array.isArray(v.dynamicChildren)
      if (isBlock) blocks.push(v)
      const f = flagTxt(v.patchFlag)
      lines.push('  '.repeat(depth) + (isBlock ? '★ ' : '') + name(v) + (f ? '  [' + f + ']' : '') + (typeof v.children === 'string' && v.type !== vue.value.Comment ? '  "' + v.children + '"' : ''))
      if (Array.isArray(v.children)) v.children.forEach((c: any) => walk(c, depth + 1))
    })(vm.$.subTree, 0)
    tree.value = lines.join('\n')
    dyn.value = blocks.map((b, i) => '★ Block ' + (i + 1) + '：' + name(b) + '\n' + (b.dynamicChildren.length
      ? b.dynamicChildren.map((d: any) => '   → ' + name(d) + (flagTxt(d.patchFlag) ? '  [' + flagTxt(d.patchFlag) + ']' : '') + (Array.isArray(d.dynamicChildren) ? '  （子 Block）' : '')).join('\n')
      : '   （没有动态后代）')).join('\n\n')
  } catch (e: any) { tree.value = '错误：' + e.message }
}

function onPreset() { src.value = presets[preset.value][1]; run() }

onMounted(async () => {
  vue.value = await import('vue/dist/vue.esm-bundler.js')
  run()
})
onBeforeUnmount(() => { if (app) { try { app.unmount() } catch (e) { /* 忽略 */ } app = null } })
</script>

<template>
  <div class="row">
    <label class="ctl">示例 <select class="t" v-model.number="preset" @change="onPreset">
      <option v-for="(p, i) in presets" :key="i" :value="i">{{ p[0] }}</option>
    </select></label>
    <span class="cap">数据：msg、cls、ok、list</span>
  </div>
  <textarea class="t" v-model="src" @input="run" spellcheck="false" aria-label="模板"></textarea>
  <div class="cols">
    <div><span class="cap">完整的虚拟节点树（★ 表示 Block）</span><div class="domview">{{ tree }}</div></div>
    <div><span class="cap">每个 Block 的 dynamicChildren（更新时只比较这些节点）</span><div class="domview">{{ dyn }}</div></div>
  </div>
  <div ref="hostEl" hidden></div>
</template>
