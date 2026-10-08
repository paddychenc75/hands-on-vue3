<script setup lang="ts">
// 实验台：病例诊所。三个有问题的小应用，实时显示每个组件的更新次数和 onRenderTriggered 日志。
// 这些钩子只存在于 Vue 的开发构建，所以这里动态载入 vue.esm-browser.js（开发构建），在它自己的应用里运行病例。
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, toRaw, watch } from 'vue'

type CaseId = 'props' | 'coarse' | 'calc' | 'deep' | 'leak'
const caseId = ref<CaseId>('props')
const fixed = ref(false)
const ready = ref(false)
const failed = ref('')
const host = ref<HTMLElement | null>(null)
const counts = reactive<Record<string, number>>({})
const logs = ref<string[]>([])
const timers = ref(0)
const mounted = ref(true)

let V: any = null
let app: any = null
let vm: any = null
let seq = 0
const live = new Set<number>()

const CASES: { id: CaseId; label: string; names: string[]; note: string }[] = [
  { id: 'props', label: '内联对象 props', names: ['Root', 'Row'], note: 'Root 显示搜索词，下面有 8 个 Row，每个 Row 的 props 里有一个内联对象。点“输入一个字”相当于在搜索框打字。' },
  { id: 'coarse', label: '读了整个对象', names: ['Badge', 'Total', 'Debug'], note: '三个组件读同一个 cart 对象。Debug 面板直接显示整个 cart。' },
  { id: 'calc', label: '多余的计算和保存', names: ['summarize', 'save'], note: '搜索框和待办在同一个 state 里。模板调用 summarize，watch 侦听整个 state。' },
  { id: 'deep', label: '深层响应式', names: [], note: '同样的 5 万项数据，用 ref 和 shallowRef 各读一遍。' },
  { id: 'leak', label: '没有清理的定时器', names: [], note: '每个 Ticker 挂载时启动一个 setInterval。' }
]
const cur = () => CASES.find(c => c.id === caseId.value)!

function bump(name: string) {
  counts[name] = (counts[name] || 0) + 1
}
function describe(e: any) {
  const t = e.target
  const isRef = t && t.constructor && t.constructor.name === 'RefImpl'
  if (isRef) return `${e.type} ${String(e.key)}（一个 ref）`
  const who = t && t.name ? `「${t.name}」` : t && Array.isArray(t.items) ? 'cart' : ''
  return `${e.type} ${String(e.key)}（对象${who}）`
}
const hooks = {
  updated: (name: string) => bump(name),
  trig(name: string, e: any) {
    logs.value = [...logs.value.slice(-7), `[${name}] 被触发：${describe(e)}`]
  },
  setInterval(fn: () => void) {
    const id = window.setInterval(fn, 1000)
    live.add(id)
    timers.value = live.size
    return id
  },
  clearInterval(id: number) {
    window.clearInterval(id)
    live.delete(id)
    timers.value = live.size
  }
}

function build(V: any, id: CaseId, fix: boolean) {
  const { ref, reactive, computed, onUpdated, onUnmounted, onRenderTriggered } = V
  const watchRender = (name: string) => {
    onUpdated(() => hooks.updated(name))
    onRenderTriggered((e: any) => hooks.trig(name, e))
  }
  if (id === 'props') {
    const Row = fix
      ? { props: ['item', 'hot'], setup() { onUpdated(() => hooks.updated('Row')) }, template: '<li :class="{ hot }">{{ item.name }}</li>' }
      : { props: ['item', 'opts'], setup() { onUpdated(() => hooks.updated('Row')) }, template: '<li :class="{ hot: opts.hot }">{{ item.name }}</li>' }
    const prop = fix ? ':hot="it.id === 3"' : ':opts="{ hot: it.id === 3 }"'
    return {
      components: { Row },
      setup() {
        const kw = ref('')
        const items = reactive(Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: '任务 ' + (i + 1) })))
        watchRender('Root')
        return { kw, items }
      },
      template: `<p>搜索词：{{ kw || '（空）' }}</p><ul class="rows"><Row v-for="it in items" :key="it.id" :item="it" ${prop} /></ul>`
    }
  }
  if (id === 'coarse') {
    const Badge = { props: ['cart'], setup() { watchRender('Badge') }, template: '<span>共 {{ cart.items.length }} 件</span>' }
    const Total = {
      props: ['cart'],
      setup(p: any) {
        watchRender('Total')
        return { sum: computed(() => p.cart.items.reduce((s: number, i: any) => s + i.qty * i.price, 0)) }
      },
      template: '<span>合计 {{ sum }} 元</span>'
    }
    const Debug = fix
      ? { props: ['cart'], setup(p: any) { watchRender('Debug'); const snap = ref('点“刷新”查看'); return { snap, refresh: () => { snap.value = JSON.stringify(p.cart) } } }, template: '<pre>{{ snap }}</pre><button class="b" @click="refresh">刷新</button>' }
      : { props: ['cart'], setup() { watchRender('Debug') }, template: '<pre>{{ cart }}</pre>' }
    return {
      components: { Badge, Total, Debug },
      setup() {
        const cart = reactive({ items: [{ id: 1, name: '书', qty: 1, price: 30 }, { id: 2, name: '笔', qty: 2, price: 5 }], coupon: '' })
        return { cart }
      },
      template: '<div><Badge :cart="cart" /> · <Total :cart="cart" /></div><Debug :cart="cart" />'
    }
  }
  if (id === 'calc') {
    return {
      setup() {
        const state = reactive({ query: '', todos: [{ id: 1, text: '买菜', done: false }, { id: 2, text: '写周报', done: false }, { id: 3, text: '健身', done: true }] })
        const summarize = (list: any[]) => { bump('summarize'); return list.filter(t => t.done).length + '/' + list.length }
        const summary = computed(() => summarize(state.todos))
        if (fix) V.watch(() => state.todos, () => bump('save'), { deep: true })
        else V.watch(state, () => bump('save'), { deep: true })
        watchRender('Root')
        return { state, summarize, summary }
      },
      template: fix
        ? '<input v-model="state.query" placeholder="搜索"> <span>完成：{{ summary }}</span>'
        : '<input v-model="state.query" placeholder="搜索"> <span>完成：{{ summarize(state.todos) }}</span>'
    }
  }
  const Ticker = {
    setup() {
      const n = ref(0)
      const tid = hooks.setInterval(() => { n.value++ })
      if (fix) onUnmounted(() => hooks.clearInterval(tid))
      return { n }
    },
    template: '<p>Ticker 在运行：{{ n }}</p>'
  }
  return {
    components: { Ticker },
    setup() { return { show: ref(true) } },
    template: '<Ticker v-if="show" /><p v-else>Ticker 已卸载</p>'
  }
}

function stopAll() {
  live.forEach(id => window.clearInterval(id))
  live.clear()
  timers.value = 0
}
function mountCase() {
  if (!V || !host.value) return
  if (app) { try { app.unmount() } catch { /* ignore */ } app = null }
  stopAll()
  Object.keys(counts).forEach(k => delete counts[k])
  logs.value = []
  mounted.value = true
  if (caseId.value === 'deep') { host.value.innerHTML = ''; return }
  const el = document.createElement('div')
  host.value.innerHTML = ''
  host.value.appendChild(el)
  app = V.createApp(build(V, caseId.value, fixed.value))
  app.config.warnHandler = () => {}
  vm = app.mount(el)
  seq++
}
watch([caseId, fixed], mountCase)

onMounted(async () => {
  try {
    V = await import('vue/dist/vue.esm-browser.js')
  } catch (e: any) {
    failed.value = '载入开发构建失败：' + e.message
    return
  }
  ready.value = true
  await nextTick()
  mountCase()
})
onBeforeUnmount(() => {
  if (app) { try { app.unmount() } catch { /* ignore */ } }
  stopAll()
})

async function act(fn: () => void) {
  if (!vm) return
  fn()
  await V.nextTick()
  await new Promise(r => setTimeout(r, 0))
}
const typeChar = () => act(() => { vm.kw += 'x' })
const renameRow = () => act(() => { vm.items[2].name += '!' })
const qtyUp = () => act(() => { vm.cart.items[0].qty++ })
const couponEdit = () => act(() => { vm.cart.coupon += 'x' })
const typeQuery = () => act(() => { vm.state.query += 'x' })
const toggleTodo = () => act(() => { vm.state.todos[0].done = !vm.state.todos[0].done })
const toggleTicker = () => act(() => { vm.show = !vm.show; mounted.value = vm.show })
// ---- 病例 4：不需要 Vue 的开发构建，用页面自己的 ref 和 shallowRef ----
const N = 50000
const deepRes = reactive<Record<string, { ms: number; proxied: boolean }>>({})
function readAll(kind: 'ref' | 'shallowRef') {
  const raw = Array.from({ length: N }, (_, i) => ({ id: i, name: 'n' + i, done: false }))
  const list = kind === 'ref' ? ref(raw) : shallowRef(raw)
  const t0 = performance.now()
  let s = 0
  for (const it of list.value) s += it.id
  const ms = performance.now() - t0
  deepRes[kind] = { ms, proxied: toRaw(list.value[0]) !== list.value[0] }
  return s
}
function reset() {
  Object.keys(counts).forEach(k => delete counts[k])
  logs.value = []
}
</script>

<template>
  <div v-if="failed" class="cap">{{ failed }}</div>
  <div v-else-if="!ready" class="cap">正在载入 Vue 的开发构建……</div>
  <template v-else>
    <div class="tabs">
      <button v-for="c in CASES" :key="c.id" type="button" :data-case="c.id" :class="{ on: caseId === c.id }" @click="caseId = c.id">{{ c.label }}</button>
    </div>
    <div class="row" style="margin-top:8px">
      <span class="cap">{{ cur().note }}</span>
    </div>
    <div class="row">
      <template v-if="caseId !== 'deep'">
        <button type="button" class="b" data-fix="off" :class="{ pri: !fixed }" @click="fixed = false">症状版</button>
        <button type="button" class="b" data-fix="on" :class="{ pri: fixed }" @click="fixed = true">已修复</button>
      </template>
      <template v-if="caseId === 'props'">
        <button type="button" class="b" data-act="type" @click="typeChar">输入一个字</button>
        <button type="button" class="b" data-act="rename" @click="renameRow">改第 3 行的名字</button>
      </template>
      <template v-else-if="caseId === 'coarse'">
        <button type="button" class="b" data-act="qty" @click="qtyUp">商品 1 数量加 1</button>
        <button type="button" class="b" data-act="coupon" @click="couponEdit">修改优惠码</button>
      </template>
      <template v-else-if="caseId === 'calc'">
        <button type="button" class="b" data-act="query" @click="typeQuery">在搜索框输入一个字</button>
        <button type="button" class="b" data-act="todo" @click="toggleTodo">切换第 1 项的完成状态</button>
      </template>
      <template v-else-if="caseId === 'deep'">
        <button type="button" class="b" data-act="read-ref" @click="readAll('ref')">ref：读 5 万项</button>
        <button type="button" class="b" data-act="read-shallow" @click="readAll('shallowRef')">shallowRef：读 5 万项</button>
      </template>
      <template v-else>
        <button type="button" class="b" data-act="toggle" @click="toggleTicker">{{ mounted ? '卸载 Ticker' : '挂载 Ticker' }}</button>
      </template>
      <button type="button" class="b" data-act="reset" @click="reset">计数归零</button>
    </div>
    <div v-if="caseId === 'deep'" class="box" style="margin-top:8px">
      <span class="cap">测量（毫秒因机器而异，看两个数字的比值，以及第 1 项是不是代理）</span>
      <dl class="kv">
        <template v-for="k in (['ref', 'shallowRef'] as const)" :key="k">
          <dt>{{ k }} 遍历 5 万项</dt>
          <dd :data-deep="k">{{ deepRes[k] ? deepRes[k].ms.toFixed(1) + ' ms · 第 1 项是代理：' + (deepRes[k].proxied ? '是' : '否') : '还没有测量' }}</dd>
        </template>
      </dl>
    </div>
    <div v-show="caseId !== 'deep'" class="cols" style="margin-top:8px">
      <div class="box"><span class="cap">应用</span><div ref="host" class="clinic-host" :data-seq="seq"></div></div>
      <div class="box">
        <span class="cap">测量</span>
        <dl class="kv">
          <template v-for="n in cur().names" :key="n">
            <dt>{{ caseId === 'calc' ? (n === 'summarize' ? 'summarize 运行次数' : '保存次数') : n + ' 更新次数' }}</dt><dd :data-count="n">{{ counts[n] || 0 }}</dd>
          </template>
          <template v-if="caseId === 'leak'">
            <dt>仍在运行的定时器</dt><dd data-count="timers">{{ timers }}</dd>
          </template>
        </dl>
      </div>
    </div>
    <div v-if="caseId !== 'leak' && caseId !== 'deep'" class="log" data-log style="margin-top:8px"><div v-for="(l, i) in logs" :key="i">{{ l }}</div><div v-if="!logs.length" class="m">onRenderTriggered 日志：操作后这里显示是哪份数据触发了哪个组件。</div></div>
    <div v-if="caseId === 'props'" class="cap">Row 更新时没有日志行。它们是被 Root 传来的新 props 带着更新的，自己依赖的数据没有变。原因在 Root 那一行。</div>
  </template>
</template>

<style scoped>
.clinic-host :deep(li.hot) { color: var(--accent); font-weight: 600; }
.clinic-host :deep(pre) { margin: 4px 0; max-height: 120px; overflow: auto; font-size: 12px; }
.clinic-host :deep(ul) { margin: 4px 0; padding-left: 20px; }
</style>
