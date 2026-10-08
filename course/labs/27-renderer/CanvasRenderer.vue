<script setup lang="ts">
// 实验台：Vue 组件渲染到 Canvas（旧版 #demo-renderer）
// 用 createRenderer 自定义 nodeOps：渲染目标是一棵普通对象树，再用 Canvas 画出来。
import { createRenderer, h, onBeforeUnmount, onMounted, ref, type App } from 'vue'
import { domLog } from '../_shared'

const canvas = ref<HTMLCanvasElement | null>(null)
const logEl = ref<HTMLElement | null>(null)
const treeEl = ref<HTMLElement | null>(null)
const L = (c: string, m: string) => domLog(logEl.value, c, m)

interface N { type: string; props: Record<string, any>; children: N[]; parent: N | null; text?: string }
let pending = false
const container: N = { type: 'root', props: {}, children: [], parent: null }
function scheduleDraw() {
  if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; draw() }) }
}
const tok = (n: string) => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim() || '#888'
function draw() {
  const cv = canvas.value
  if (!cv) return
  const dpr = window.devicePixelRatio || 1
  const w = cv.clientWidth
  const hh = cv.clientHeight
  cv.width = w * dpr
  cv.height = hh * dpr
  const ctx = cv.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, hh)
  const sx = w / 400
  ;(function walk(n: N) {
    if (n.type === 'rect') { ctx.fillStyle = tok(n.props.fill); ctx.fillRect(n.props.x * sx, n.props.y, n.props.w * sx, n.props.h) }
    if (n.type === 'label') { ctx.fillStyle = tok('ink'); ctx.font = '12px ' + getComputedStyle(document.body).fontFamily; ctx.textAlign = 'center'; ctx.fillText(n.props.text, n.props.x * sx, n.props.y) }
    n.children.forEach(walk)
  })(container)
  const lines: string[] = []
  ;(function dump(n: N, d: number) {
    if (n.type !== '#comment') lines.push('  '.repeat(d) + n.type + (n.props && Object.keys(n.props).length ? ' ' + JSON.stringify(n.props) : ''))
    n.children.forEach(c => dump(c, d + 1))
  })(container, 0)
  if (treeEl.value) treeEl.value.textContent = lines.join('\n')
}

const { createApp: createCanvasApp } = createRenderer<N, N>({
  createElement(type) { L('rn', 'createElement(' + type + ')'); return { type, props: {}, children: [], parent: null } },
  createText(text) { return { type: '#text', text, props: {}, children: [], parent: null } },
  createComment(text) { return { type: '#comment', text, props: {}, children: [], parent: null } },
  setText(n, t) { n.text = t },
  setElementText(el) { el.children = [] },
  insert(child, parent, anchor) {
    if (child.parent) { const old = child.parent.children; old.splice(old.indexOf(child), 1) }
    child.parent = parent
    const i = anchor ? parent.children.indexOf(anchor) : -1
    i > -1 ? parent.children.splice(i, 0, child) : parent.children.push(child)
    if (child.type !== '#comment' && child.type !== '#text') L('tr', 'insert(' + child.type + ')')
    scheduleDraw()
  },
  remove(child) {
    const p = child.parent
    if (p) p.children.splice(p.children.indexOf(child), 1)
    if (child.type !== '#comment' && child.type !== '#text') L('x', 'remove(' + child.type + ')')
    scheduleDraw()
  },
  patchProp(el, key, prev, next) {
    el.props[key] = next
    if (prev !== undefined) L('tg', 'patchProp(' + el.type + ', ' + key + ': ' + prev + ' → ' + next + ')')
    scheduleDraw()
  },
  parentNode(n) { return n.parent },
  nextSibling(n) {
    if (!n.parent) return null
    const s = n.parent.children
    return s[s.indexOf(n) + 1] || null
  }
})

const values = ref([30, 60, 45, 80])
const Chart = {
  setup() {
    return () => {
      const n = values.value.length
      const gap = 400 / n
      return h('group' as any, null, values.value.flatMap((v, i) => {
        const x = gap * i + gap * 0.2
        const bw = gap * 0.6
        const bh = v * 1.6
        return [
          h('rect' as any, { key: 'r' + i, x, y: 190 - bh, w: bw, h: bh, fill: i === 1 ? 'accent' : 'navy' }),
          h('label' as any, { key: 'l' + i, x: x + bw / 2, y: 210, text: String(v) })
        ]
      }))
    }
  }
}

const err = ref('')
let app: App<N> | null = null
let mo: MutationObserver | null = null
onMounted(() => {
  try {
    app = createCanvasApp(Chart)
    app.mount(container)
  } catch (e: any) { err.value = e.message }
  window.addEventListener('resize', scheduleDraw)
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', scheduleDraw)
  // 站点用 html 上的 class / data-theme 切换深浅色，也要重画
  mo = new MutationObserver(scheduleDraw)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
  scheduleDraw()
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', scheduleDraw)
  if (mo) mo.disconnect()
  if (app) app.unmount()
})
function setV(e: Event) { const a = values.value.slice(); a[1] = +(e.target as HTMLInputElement).value; values.value = a }
function add() { if (values.value.length < 8) values.value = [...values.value, 10 + Math.floor(Math.random() * 90)] }
function del() { if (values.value.length > 2) values.value = values.value.slice(0, -1) }
</script>

<template>
  <div class="row"><label class="ctl">第 2 根柱子的值 <input type="range" min="5" max="100" value="60" @input="setV"></label><button class="b" @click="add">添加一根柱子</button><button class="b" @click="del">删除最后一根</button></div>
  <canvas ref="canvas" style="width:100%;height:220px;border:1px solid var(--line);border-radius:6px;background:var(--bg)"></canvas>
  <div class="cols"><div><span class="cap">nodeOps 调用日志</span><div class="log" ref="logEl" style="height:150px"></div></div><div><span class="cap">渲染目标：一棵普通对象树</span><div class="domview" ref="treeEl" style="max-height:150px;overflow:auto"></div></div></div>
  <div v-if="err" class="ex-err">{{ err }}</div>
</template>
