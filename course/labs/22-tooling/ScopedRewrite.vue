<script setup lang="ts">
// scoped 样式的改写（旧 demo-tool-scoped）。选择器改写是简化版；data-v 属性由真实的 Vue 渲染器添加。
import { ref, watch, nextTick, markRaw, onMounted, onUnmounted } from 'vue'

const ID = 'data-v-7ba5bd90'
const IN_ID = 'data-v-1d2c3b4a'

/* 简化的改写：只处理常见写法 */
function lastCompound(sel: string) {
  let depth = 0, cut = -1
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i]
    if (c === '(' || c === '[') depth++
    else if (c === ')' || c === ']') depth--
    else if (depth === 0 && /[\s>+~]/.test(c)) cut = i
  }
  return cut + 1
}
function addAttr(sel: string, attr: string) {
  const start = lastCompound(sel)
  const last = sel.slice(start)
  let depth = 0, pos = last.length
  for (let i = 0; i < last.length; i++) {
    const c = last[i]
    if (c === '(' || c === '[') depth++
    else if (c === ')' || c === ']') depth--
    else if (c === ':' && depth === 0) { pos = i; break }
  }
  return sel.slice(0, start) + last.slice(0, pos) + '[' + attr + ']' + last.slice(pos)
}
function rewriteOne(sel: string) {
  sel = sel.trim()
  let m
  if ((m = sel.match(/^:global\((.*)\)$/))) return m[1].trim()
  if ((m = sel.match(/^(.*?):deep\((.*)\)$/))) {
    const pre = m[1].trim()
    return (pre ? addAttr(pre, ID) : '[' + ID + ']') + ' ' + m[2].trim()
  }
  if ((m = sel.match(/^(.*?):slotted\((.*)\)$/))) return (m[1].trim() ? m[1].trim() + ' ' : '') + addAttr(m[2].trim(), ID + '-s')
  return addAttr(sel, ID)
}
function rewrite(css: string) {
  let out = ''
  let depth = 0
  const re = /([^{}]*)\{([^{}]*)\}|([^{}]*)\{|\}/g
  let m
  css = css.replace(/\/\*[\s\S]*?\*\//g, '')
  while ((m = re.exec(css))) {
    if (m[3] !== undefined) { out += m[3].trim() + ' {\n'; depth++; continue } // @media 等：原样保留
    if (m[0] === '}') { out += '}\n'; depth--; continue }
    const sels = m[1].trim()
    if (!sels) continue
    const body = m[2].trim().replace(/v-bind\(\s*['"]?([\w.]+)['"]?\s*\)/g, (_, k) => 'var(--7ba5bd90-' + k.replace(/\./g, '\\.') + ')')
    out += (depth ? '  ' : '') + (sels.startsWith('@') ? sels : sels.split(',').map(rewriteOne).join(', ')) + ' { ' + body + ' }\n'
  }
  return out.trim()
}
const scopeSel = (sel: string) => sel.split(',').map(s => '#demo-tool-scoped .pv ' + s.trim()).join(', ')

const Inner = { __scopeId: IN_ID, template: '<div class="inner-root"><p class="inner" style="margin:0">Inner 内部的 p.inner</p></div>' }
const DEF_TPL = '<div class="card">\n  <h4 class="title">Card 的标题 .title</h4>\n  <Inner />\n  <slot></slot>\n</div>'
const DEF_CSS = '.title { color: #2f7de1; }\n.inner { font-weight: bold; }\n:deep(.inner) { text-decoration: underline; }\n:slotted(.x) { color: #c0392b; }\n.card > h4:hover { color: orange; }'

const styleEl = document.createElement('style')
document.head.appendChild(styleEl)

const tpl = ref(DEF_TPL)
const css = ref(DEF_CSS)
const out = ref('')
const dom = ref('')
const err = ref('')
const ver = ref(0)
const pv = ref<HTMLElement | null>(null)
const Card = ref<any>(null)
let vm: any = null // 带编译器的 Vue 构建，运行时编译模板要用

function build() {
  err.value = ''
  try {
    if (!vm.compile(tpl.value)) throw new Error('模板无效')
    Card.value = markRaw({ __scopeId: ID, components: { Inner }, template: tpl.value })
    ver.value++
  } catch (e: any) { err.value = e.message }
}
function applyCss() {
  const r = rewrite(css.value)
  out.value = r
  styleEl.textContent = r.replace(/(^|\n)\s*([^@{}\n][^{}\n]*)\{/g, (all, nl, sel) => nl + scopeSel(sel) + ' {')
}
const readDom = () => {
  if (pv.value) dom.value = pv.value.innerHTML.replace(new RegExp('<' + '!--[\\s\\S]*?--' + '>', 'g'), '').replace(/></g, '>\n<')
}
let t1: ReturnType<typeof setTimeout>
watch(tpl, () => { clearTimeout(t1); t1 = setTimeout(build, 300) })
watch(css, applyCss)
watch(ver, () => nextTick(readDom))
applyCss()
onMounted(async () => {
  vm = await import('vue/dist/vue.esm-bundler.js')
  build()
  await nextTick()
  readDom()
})
onUnmounted(() => styleEl.remove())
function reset() { tpl.value = DEF_TPL; css.value = DEF_CSS }
</script>

<template>
  <div class="cols">
    <label class="cap">Card.vue 的模板<textarea class="t" v-model="tpl" rows="6" spellcheck="false" aria-label="模板"></textarea></label>
    <label class="cap">&lt;style scoped&gt;<textarea class="t" v-model="css" rows="6" spellcheck="false" aria-label="样式"></textarea></label>
  </div>
  <div v-if="err" class="ex-err">{{ err }}</div>
  <div class="cols" style="margin-top:8px">
    <div>
      <div class="cap">改写后的 CSS（简化版，常见写法和 compiler-sfc 一致）</div>
      <div class="domview">{{ out }}</div>
    </div>
    <div class="box">
      <span class="cap">实际效果。Card 的 id：{{ ID }}，Inner 的 id：{{ IN_ID }}</span>
      <div class="pv" ref="pv">
        <component :is="Card" :key="ver"><p class="x" style="margin:0">父组件传入的插槽内容 p.x</p></component>
        <p class="title" style="margin:6px 0 0;font-size:13px">Card 之外的 p.title（没有 data-v 属性，不受影响）</p>
      </div>
    </div>
  </div>
  <div class="cap" style="margin-top:6px">Vue 渲染出的 DOM：</div>
  <div class="domview" style="max-height:200px;overflow:auto">{{ dom }}</div>
  <div class="row"><button class="b" @click="reset">恢复默认</button></div>
  <div class="cap">观察三点：1. 只有 Inner 的根元素有 Card 的属性。2. 所以 .inner 不生效，:deep(.inner) 生效。3. 插槽内容有 {{ ID }}-s 属性。</div>
</template>
