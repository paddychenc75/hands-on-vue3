<script setup lang="ts">
// 实验台：KeepAlive 的缓存表和隐藏容器。
// 用真实的 KeepAlive 和 createRenderer。nodeOps 用普通对象，所以能看到 KeepAlive 用 createElement('div') 造的存放容器
// 里有哪些节点。每个标签页是一个组件，钩子都记进日志。
import { createRenderer, defineComponent, h, KeepAlive, nextTick, onActivated, onDeactivated, onMounted, onUnmounted, reactive, ref } from 'vue'

interface N { id: number; type: string; text?: string; parent: N | null; children: N[]; removed?: boolean }

let seq = 0
let all: N[] = []
const mk = (type: string, text?: string): N => { const n: N = { id: ++seq, type, text, parent: null, children: [] }; all.push(n); return n }
const detach = (c: N) => { if (c.parent) { c.parent.children.splice(c.parent.children.indexOf(c), 1); c.parent = null } }

const renderer = createRenderer<N, N>({
  createElement: t => mk(t),
  createText: t => mk('#text', t),
  createComment: t => mk('#comment', t),
  setText: (n, t) => { n.text = t },
  setElementText: (el, t) => {
    el.children.forEach(c => { c.parent = null })
    el.children = []
    if (t) { const c = mk('#text', t); c.parent = el; el.children.push(c) }
  },
  insert: (c, p, a) => {
    detach(c)
    c.parent = p
    const i = a ? p.children.indexOf(a) : -1
    if (i > -1) p.children.splice(i, 0, c)
    else p.children.push(c)
  },
  remove: c => { detach(c); c.removed = true },
  parentNode: n => n.parent,
  nextSibling: n => { const s = n.parent ? n.parent.children : []; return s[s.indexOf(n) + 1] || null },
  patchProp: () => {}
})

const NAMES = ['TabA', 'TabB', 'TabC', 'TabD']
let rawLog: string[] = []
let order: string[] = []            // 最近使用顺序：最前面最久没用
const counters = new Map<string, { value: number }>()
const state = reactive({ cur: 'TabA' })
let root: N = mk('root')
let step = 0

const touch = (n: string) => { order = order.filter(x => x !== n); order.push(n) }
const ev = (s: string) => rawLog.push(s)

const comps: Record<string, any> = {}
for (const name of NAMES) {
  comps[name] = defineComponent({
    name,
    setup() {
      const n = ref(0)
      counters.set(name, n)
      ev(name + ' setup（创建新实例）')
      onMounted(() => { touch(name); ev(name + ' onMounted') })
      onActivated(() => { touch(name); ev(name + ' onActivated') })
      onDeactivated(() => ev(name + ' onDeactivated（DOM 搬进隐藏容器）'))
      onUnmounted(() => { order = order.filter(x => x !== name); counters.delete(name); ev(name + ' onUnmounted（实例销毁）') })
      return () => h('p', null, name + ' 计数 ' + n.value)
    }
  })
}

const maxChoice = ref<'none' | '2' | '3'>('2')
const includeChoice = ref<'all' | 'ab'>('all')

const App = defineComponent({
  render() {
    const props: Record<string, unknown> = {}
    if (maxChoice.value !== 'none') props.max = Number(maxChoice.value)
    if (includeChoice.value === 'ab') props.include = 'TabA,TabB'
    return h(KeepAlive, props, [h(comps[state.cur])])
  }
})

const dump = (n: N, depth = 0): string[] => {
  const pad = '  '.repeat(depth)
  if (n.type === '#text') return [pad + JSON.stringify(n.text)]
  if (n.type === '#comment') return [pad + '<!---->']
  return [pad + '<' + n.type + '>', ...n.children.flatMap(c => dump(c, depth + 1))]
}

const pageLines = ref<string[]>([])
const hiddenLines = ref<string[]>([])
const hiddenCount = ref(0)
const logLines = ref<string[]>([])
const orderView = ref<string[]>([])
const aliveNames = ref<string[]>([])

function sync() {
  pageLines.value = root.children.flatMap(c => dump(c))
  const hidden = all.filter(n => n.type === 'div' && !n.parent && n !== root && !n.removed)
  hiddenLines.value = hidden.flatMap(c => c.children.flatMap(k => dump(k)))
  hiddenCount.value = hidden.reduce((s, c) => s + c.children.length, 0)
  logLines.value = rawLog.slice()
  orderView.value = order.slice()
  aliveNames.value = [...counters.keys()]
}

async function settle() {
  await nextTick()
  await nextTick()
  sync()
}

function reset() {
  renderer.render(null, root)
  all = []
  seq = 0
  rawLog = []
  order = []
  counters.clear()
  step = 0
  root = mk('root')
  state.cur = 'TabA'
  renderer.render(h(App), root)
  settle()
}

async function show(name: string) {
  if (state.cur === name) return
  rawLog.push('—— 第 ' + ++step + ' 步：切到 ' + name)
  state.cur = name
  await settle()
}

async function bump(name: string) {
  const c = counters.get(name)
  if (!c) return
  c.value++
  await settle()
}

reset()
</script>

<template>
  <div class="row">
    <span class="cap">切换到：</span>
    <button v-for="n in ['TabA', 'TabB', 'TabC', 'TabD']" :key="n" class="b" :class="{ on: aliveNames.length && pageLines.some(l => l.includes(n)) }" @click="show(n)">{{ n }}</button>
  </div>
  <div class="row">
    <label class="ctl">max
      <select v-model="maxChoice" @change="reset">
        <option value="none">不限</option>
        <option value="2">2</option>
        <option value="3">3</option>
      </select>
    </label>
    <label class="ctl">include
      <select v-model="includeChoice" @change="reset">
        <option value="all">不设置</option>
        <option value="ab">TabA,TabB</option>
      </select>
    </label>
    <button v-for="n in ['TabA', 'TabB', 'TabC', 'TabD']" :key="'c' + n" class="b" :disabled="!aliveNames.includes(n)" @click="bump(n)">{{ n }} 计数 +1</button>
    <button class="b" @click="reset">重置</button>
  </div>
  <div class="cols">
    <div class="box">
      <div class="t">页面（根容器）</div>
      <pre class="code" id="kaPage">{{ pageLines.join('\n') || '（空）' }}</pre>
    </div>
    <div class="box">
      <div class="t">隐藏容器（不在页面里）</div>
      <pre class="code" id="kaHidden">{{ hiddenLines.join('\n') || '（空）' }}</pre>
    </div>
  </div>
  <div class="kv">
    <span class="cap">隐藏容器里的节点数：<b id="kaHiddenCount">{{ hiddenCount }}</b></span>
    <span class="cap">存活的实例：<b id="kaAlive">{{ aliveNames.join('、') || '无' }}</b></span>
    <span class="cap">最近使用顺序（最左最久没用，下一个被淘汰）：<b id="kaOrder">{{ orderView.join(' → ') || '无' }}</b></span>
  </div>
  <div class="log" id="kaLog" role="log" aria-label="钩子日志">
    <div v-for="(l, i) in logLines" :key="i">{{ l }}</div>
  </div>
</template>
