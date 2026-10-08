<script setup lang="ts">
// 实验台：Suspense 的时间线。
// 用真实的 Suspense 和两三个 async setup 的子组件，只读可观察的东西：onPending / onFallback / onResolve 事件、
// 子组件的 setup 和 onMounted、页面上此刻显示的是 fallback 还是内容。不读 Suspense 的内部字段。
// 日志写进普通数组，下一个微任务才同步到界面：钩子在渲染中运行，里面直接改响应式数据可能触发递归更新。
import { computed, defineComponent, h, onMounted, ref, Suspense } from 'vue'

type Structure = 'component' | 'div'
type Kind = 'action' | 'event' | 'child'
interface Row { t: number; kind: Kind; text: string; page: string }

const dA = ref(300)
const dB = ref(800)
const dC = ref(400)
const timeoutChoice = ref<'none' | '0' | '100'>('none')
const structure = ref<Structure>('component')
const run = ref(0)
const view = ref<'1' | '2'>('1')

const rows = ref<Row[]>([])
const depsTotal = ref(0)
const depsDone = ref(0)
const pageNow = ref('—')
const stageEl = ref<HTMLElement | null>(null)

let buf: Row[] = []
let t0 = 0
const stats = { total: 0, done: 0 }

function sample(): string {
  const el = stageEl.value
  if (!el) return '—'
  if (el.querySelector('.sp-fb')) return 'fallback'
  const c = el.querySelector<HTMLElement>('.sp-ct')
  if (!c) return '空白'
  const leaves = [...c.querySelectorAll<HTMLElement>('.sp-leaf')].map(x => x.textContent).join('、')
  return '内容（' + (leaves || '子组件还是占位') + '）'
}

function rec(kind: Kind, text: string) {
  const row: Row = { t: Math.round(performance.now() - t0), kind, text, page: '…' }
  buf.push(row)
  queueMicrotask(() => {
    row.page = sample()
    pageNow.value = row.page
    rows.value = buf.slice()
    depsTotal.value = stats.total
    depsDone.value = stats.done
  })
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

const Leaf = defineComponent({
  props: { name: { type: String, required: true }, delay: { type: Number, required: true } },
  async setup(props) {
    rec('child', props.name + ' 的 setup 开始（要 ' + props.delay + ' ms）')
    onMounted(() => rec('child', props.name + ' onMounted（DOM 已在页面上：' + (stageEl.value?.contains(document.getElementById('leaf-' + props.name)) ?? false) + '）'))
    await sleep(props.delay)
    stats.done++
    rec('child', props.name + ' 的 setup 完成，异步依赖剩 ' + (stats.total - stats.done) + ' 个')
    return () => h('b', { class: 'sp-leaf', id: 'leaf-' + props.name }, props.name)
  }
})

const Stage = defineComponent({
  props: {
    structure: { type: String, required: true },
    view: { type: String, required: true },
    timeout: { type: String, required: true },
    a: { type: Number, required: true },
    b: { type: Number, required: true },
    c: { type: Number, required: true }
  },
  setup(props) {
    const leaves = (v: string) => v === '1'
      ? [h(Leaf, { key: 'A', name: 'A', delay: props.a }), h(Leaf, { key: 'B', name: 'B', delay: props.b })]
      : [h(Leaf, { key: 'C', name: 'C', delay: props.c })]
    const Page1 = defineComponent({ render: () => h('div', { class: 'sp-ct' }, leaves('1')) })
    const Page2 = defineComponent({ render: () => h('div', { class: 'sp-ct' }, leaves('2')) })
    return () => h(
      Suspense,
      {
        ...(props.timeout !== 'none' ? { timeout: Number(props.timeout) } : {}),
        onPending: () => rec('event', 'onPending'),
        onFallback: () => rec('event', 'onFallback'),
        onResolve: () => rec('event', 'onResolve')
      },
      {
        default: () => props.structure === 'component'
          ? h(props.view === '1' ? Page1 : Page2)
          : h('div', { class: 'sp-ct' }, leaves(props.view)),
        fallback: () => h('p', { class: 'sp-fb' }, 'fallback：加载中……')
      }
    )
  }
})

function begin(label: string, total: number) {
  buf = []
  rows.value = []
  stats.total = total
  stats.done = 0
  t0 = performance.now()
  depsTotal.value = total
  depsDone.value = 0
  rec('action', label)
}

function load() {
  view.value = '1'
  begin('点击「首次加载」：新建一个 Suspense，默认内容有 A、B 两个异步子组件', 2)
  run.value++
}

function toggle() {
  const next = view.value === '1' ? '2' : '1'
  const total = next === '1' ? 2 : 1
  begin('点击「切换内容」：' + (structure.value === 'component' ? '默认内容的根组件换成另一个组件' : '根 div 不变，里面的子组件换了') + '，新内容有 ' + total + ' 个异步依赖', total)
  view.value = next
}

function changeStructure() {
  load()
}

const leftDeps = computed(() => depsTotal.value - depsDone.value)
load()
</script>

<template>
  <div class="row">
    <label class="ctl">A 的 setup 耗时 {{ dA }} ms <input v-model.number="dA" type="range" min="100" max="1500" step="100" aria-label="A 的耗时" /></label>
    <label class="ctl">B 耗时 {{ dB }} ms <input v-model.number="dB" type="range" min="100" max="1500" step="100" aria-label="B 的耗时" /></label>
    <label class="ctl">C 耗时 {{ dC }} ms <input v-model.number="dC" type="range" min="100" max="1500" step="100" aria-label="C 的耗时" /></label>
  </div>
  <div class="row">
    <label class="ctl">默认内容的根
      <select v-model="structure" aria-label="默认内容的根" @change="changeStructure">
        <option value="component">一个组件（整页替换）</option>
        <option value="div">一个 div（原地替换）</option>
      </select>
    </label>
    <label class="ctl">timeout
      <select v-model="timeoutChoice" aria-label="timeout" @change="load">
        <option value="none">不设置</option>
        <option value="100">100 ms</option>
        <option value="0">0</option>
      </select>
    </label>
    <button class="b pri" @click="load">首次加载</button>
    <button class="b" @click="toggle">切换内容</button>
  </div>
  <div class="kv">
    <span class="cap">页面现在显示：<b class="sp-now">{{ pageNow }}</b></span>
    <span class="cap">异步依赖（对应内部的 <code>deps</code>）：<b class="sp-deps">{{ leftDeps }}</b> / {{ depsTotal }} 个没完成</span>
  </div>
  <div ref="stageEl" class="box sp-stage">
    <div class="t">页面（真实的 Suspense）</div>
    <Stage :key="run" :structure="structure" :view="view" :timeout="timeoutChoice" :a="dA" :b="dB" :c="dC" />
  </div>
  <div class="log sp-log" role="log" aria-label="时间线">
    <div v-for="(r, i) in rows" :key="i" class="sp-row" :class="'k-' + r.kind">
      <span class="sp-t">{{ r.t }} ms</span>
      <span class="sp-tx">{{ r.text }}</span>
      <span class="sp-pg">页面：{{ r.page }}</span>
    </div>
  </div>
</template>

<style scoped>
.sp-stage { margin: 8px 0; }
.sp-row { display: grid; grid-template-columns: 70px 1fr; gap: 0 8px; padding: 2px 0; border-bottom: 1px dashed var(--line); }
.sp-t { color: var(--muted); font-variant-numeric: tabular-nums; text-align: right; }
.sp-pg { grid-column: 2; color: var(--muted); font-size: 12.5px; }
.k-event .sp-tx { color: var(--accent); font-weight: 600; }
.k-action .sp-tx { font-weight: 600; }
.sp-fb { margin: 0; color: var(--warn); }
.sp-ct { padding: 4px 6px; border: 1px dashed var(--accent); border-radius: 6px; }
.sp-leaf { display: inline-block; margin-right: 8px; padding: 0 8px; background: var(--accent-soft); border-radius: 4px; }
</style>
