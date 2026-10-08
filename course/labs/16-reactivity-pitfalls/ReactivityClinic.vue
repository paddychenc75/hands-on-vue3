<script setup lang="ts">
// 实验台：响应式诊所。六个有问题的小例子，每个有“症状版”和“已修复”。
// onRenderTracked / onRenderTriggered / watch 的 onTrack 只存在于 Vue 的开发构建，
// 所以这里动态载入 vue.esm-browser.js（开发构建），例子都跑在它自己的响应式系统里（和站点自己的 Vue 响应式互不相通）。
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

type CaseId = 'destructure' | 'snapshot' | 'await' | 'loop' | 'leak' | 'identity'
const caseId = ref<CaseId>('destructure')
const fixed = ref(false)
const ready = ref(false)
const failed = ref('')
const host = ref<HTMLElement | null>(null)
const counts = reactive<Record<string, number>>({})
const facts = reactive<Record<string, string>>({})
const logs = ref<string[]>([])
const mounted = ref(true)
const idRows = ref<{ code: string; out: string }[]>([])

let V: any = null
let app: any = null
let vm: any = null
let stopFns: (() => void)[] = []
let awaitRefs: any = null
let rejectionHandler: ((e: PromiseRejectionEvent) => void) | null = null

const CASES: { id: CaseId; label: string; note: string; code: string }[] = [
  {
    id: 'destructure', label: '解构丢响应',
    note: '界面显示解构出的 count。点“count + 1”修改 state.count，对比“数据里的值”和“界面显示”。下面是渲染收集到的依赖。',
    code: '症状：const { count } = state\n修复：const { count } = toRefs(state)'
  },
  {
    id: 'snapshot', label: 'setup 里的快照',
    note: '子组件的 label 在 setup 里用 props.n 算出来。点“父组件 n + 1”，看子组件显示的是第几项。',
    code: "症状：const label = '第 ' + props.n + ' 项'\n修复：const label = computed(() => '第 ' + props.n + ' 项')"
  },
  {
    id: 'await', label: 'await 之后的读取',
    note: '一个 async 的 watchEffect，a 在 await 之前读，b 在 await 之后读。分别修改 a 和 b，看它运行几次，以及 onTrack 记下了哪些依赖。',
    code: '症状：const x = a.value; await 请求(); const y = b.value\n修复：const x = a.value; const y = b.value; await 请求()'
  },
  {
    id: 'loop', label: '写自己依赖的数据',
    note: 'watch 回调里整理 items 并写回 items。点“加一项”，看回调运行几次、Vue 在第几次停下。',
    code: '症状：watch(items, () => { items.value = items.value.filter(Boolean) })\n修复：const cleaned = computed(() => items.value.filter(Boolean))'
  },
  {
    id: 'leak', label: '异步里创建的 watch',
    note: 'Child 在 setTimeout 里创建了一个 watch。卸载 Child 后修改 src，看回调还会不会运行。',
    code: '症状：setTimeout(() => { watch(src, cb) }, 0)\n修复：const scope = effectScope()；setTimeout(() => scope.run(() => watch(src, cb)))（组件卸载时自动停止）'
  },
  {
    id: 'identity', label: '身份不相等',
    note: '同一个对象，原始版本和代理版本不是同一个。下面每一行都在真实的 Vue 里运行。',
    code: ''
  }
]
const cur = () => CASES.find(c => c.id === caseId.value)!

function bump(name: string) {
  counts[name] = (counts[name] || 0) + 1
}
function setFact(k: string, v: unknown) {
  facts[k] = String(v)
}
function pushLog(line: string) {
  logs.value = [...logs.value.slice(-7), line]
}
function ev(e: any) {
  return `${e.type} ${String(e.key)}`
}

function cleanup() {
  if (app) { try { app.unmount() } catch { /* ignore */ } app = null }
  vm = null
  stopFns.forEach(f => { try { f() } catch { /* ignore */ } })
  stopFns = []
  if (rejectionHandler) { window.removeEventListener('unhandledrejection', rejectionHandler); rejectionHandler = null }
}
function resetState() {
  Object.keys(counts).forEach(k => delete counts[k])
  Object.keys(facts).forEach(k => delete facts[k])
  logs.value = []
  mounted.value = true
}
function mountApp(options: any) {
  const el = document.createElement('div')
  host.value!.innerHTML = ''
  host.value!.appendChild(el)
  app = V.createApp(options)
  app.config.warnHandler = () => {}
  vm = app.mount(el)
}

function startCase() {
  if (!V || !host.value) return
  cleanup()
  resetState()
  host.value.innerHTML = ''
  const id = caseId.value
  const fix = fixed.value
  const { ref: vref, reactive: vreactive, computed, onRenderTracked, onRenderTriggered, toRefs, watch: vwatch, watchEffect, effectScope, markRaw, toRaw } = V

  const track = (name: string) => {
    onRenderTracked((e: any) => pushLog(`[${name}] 收集依赖：${ev(e)}`))
    onRenderTriggered((e: any) => pushLog(`[${name}] 被触发：${ev(e)}`))
  }

  if (id === 'destructure') {
    mountApp({
      setup() {
        const state = vreactive({ count: 0 })
        track('Demo')
        const view = fix ? toRefs(state) : (({ count }: any) => ({ count }))(state)
        return { ...view, state, bump: () => { state.count++ } }
      },
      template: '<p>界面显示 count = {{ count }}</p>'
    })
    setFact('data', 0)
    return
  }

  if (id === 'snapshot') {
    const Child = {
      props: ['n'],
      setup(props: any) {
        track('Child')
        const label = fix ? computed(() => '第 ' + props.n + ' 项') : '第 ' + props.n + ' 项'
        return { label }
      },
      template: '<p>子组件显示：{{ label }}</p>'
    }
    mountApp({
      components: { Child },
      setup() {
        const n = vref(1)
        return { n, bump: () => { n.value++ } }
      },
      template: '<p>父组件的 n = {{ n }}</p><Child :n="n" />'
    })
    return
  }

  if (id === 'await') {
    const a = vref(1)
    const b = vref(1)
    const tracked = new Set<string>()
    const nameOf = (t: any) => (t === a ? 'a' : t === b ? 'b' : '?')
    const stop = watchEffect(async () => {
      bump('runs')
      if (fix) {
        a.value; b.value
        await Promise.resolve()
      } else {
        a.value
        await Promise.resolve()
        b.value
      }
    }, {
      onTrack: (e: any) => {
        tracked.add(nameOf(e.target))
        setFact('tracked', [...tracked].sort().join('、'))
      },
      onTrigger: (e: any) => pushLog(`触发：${nameOf(e.target)} 的 ${ev(e)}`)
    })
    stopFns.push(stop)
    awaitRefs = { a, b }
    return
  }

  if (id === 'loop') {
    rejectionHandler = (e: PromiseRejectionEvent) => {
      if (noteFlushError(e.reason)) e.preventDefault()
    }
    window.addEventListener('unhandledrejection', rejectionHandler)
    mountApp({
      name: 'Cleaner',
      setup() {
        const items = vref(['任务一', '任务二'])
        let cleaned: any = null
        if (fix) {
          cleaned = computed(() => items.value.filter(Boolean))
        } else {
          vwatch(items, () => {
            bump('callback')
            items.value = items.value.filter(Boolean)
          })
        }
        return { items, cleaned, add: () => { items.value = [...items.value, '新任务'] } }
      },
      template: fix
        ? '<p>整理后的任务：{{ cleaned.length }} 项</p>'
        : '<p>任务：{{ items.length }} 项</p>'
    })
    setFact('error', '（没有错误）')
    return
  }

  if (id === 'leak') {
    const src = vref(0)
    const Child = {
      setup() {
        const cb = () => { bump('hits'); if (!vm.show) bump('afterUnmount') }
        if (fix) {
          const scope = effectScope()
          setTimeout(() => { scope.run(() => { vwatch(src, cb) }) }, 0)
        } else {
          setTimeout(() => { vwatch(src, cb) }, 0)
        }
        return {}
      },
      template: '<p>Child 在运行</p>'
    }
    mountApp({
      components: { Child },
      setup() {
        const show = vref(true)
        return { show, src, toggle: () => { show.value = !show.value; mounted.value = show.value }, touch: () => { src.value++ } }
      },
      template: '<Child v-if="show" /><p v-else>Child 已卸载</p>'
    })
    return
  }

  // identity：不挂载应用，直接在开发构建的响应式里求值
  class Chart {
    #x = 1
    get x() { return this.#x }
  }
  const raw = { id: 1 }
  const p = vreactive(raw)
  const list = vref([raw])
  const rawList = [raw]
  const run = (code: string, f: () => unknown) => {
    let out: string
    try { out = String(f()) } catch (e: any) { out = e.constructor.name + '：' + e.message }
    return { code, out }
  }
  idRows.value = fix
    ? [
        run('toRaw(p) === raw', () => toRaw(p) === raw),
        run('rawList.includes(toRaw(list.value[0]))', () => rawList.includes(toRaw(list.value[0]))),
        run('new Set([raw]).has(toRaw(p))', () => new Set([raw]).has(toRaw(p))),
        run('rawList.some(i => i.id === list.value[0].id)', () => rawList.some(i => i.id === list.value[0].id)),
        run('reactive({ chart: markRaw(new Chart()) }).chart.x', () => vreactive({ chart: markRaw(new Chart()) }).chart.x)
      ]
    : [
        run('p === raw', () => p === raw),
        run('rawList.includes(list.value[0])', () => rawList.includes(list.value[0])),
        run('new Set([raw]).has(p)', () => new Set([raw]).has(p)),
        run('list.value.includes(raw)（响应式数组的 includes 被 Vue 改写过）', () => list.value.includes(raw)),
        run('reactive({ chart: new Chart() }).chart.x', () => vreactive({ chart: new Chart() }).chart.x)
      ]
}
watch([caseId, fixed], startCase)

onMounted(async () => {
  try {
    V = await import('vue/dist/vue.esm-browser.js')
  } catch (e: any) {
    failed.value = '载入开发构建失败：' + e.message
    return
  }
  ready.value = true
  await nextTick()
  startCase()
})
onBeforeUnmount(cleanup)

function noteFlushError(reason: any) {
  const msg = String((reason && reason.message) || reason)
  if (/Maximum recursive updates/.test(msg)) {
    setFact('error', msg.slice(0, 60) + '……')
    return true
  }
  return false
}
async function settle() {
  try {
    await V.nextTick()
  } catch (e) {
    // 刷新队列因为递归更新上限而抛错时，nextTick 返回的 Promise 会被拒绝
    if (!noteFlushError(e)) throw e
  }
  await new Promise(r => setTimeout(r, 30))
}
async function act(fn: () => void) {
  fn()
  await settle()
}
const countUp = () => act(() => { vm.bump(); setFact('data', vm.state.count) })
const parentUp = () => act(() => { vm.bump() })
const touchA = () => act(() => { awaitRefs.a.value++ })
const touchB = () => act(() => { awaitRefs.b.value++ })
const addItem = () => act(() => { vm.add() })
const toggleChild = () => act(() => { vm.toggle() })
const touchSrc = () => act(() => { vm.touch() })
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
      <button type="button" class="b" data-fix="off" :class="{ pri: !fixed }" @click="fixed = false">症状版</button>
      <button type="button" class="b" data-fix="on" :class="{ pri: fixed }" @click="fixed = true">已修复</button>
      <template v-if="caseId === 'destructure'">
        <button type="button" class="b" data-act="count" @click="countUp">count + 1</button>
      </template>
      <template v-else-if="caseId === 'snapshot'">
        <button type="button" class="b" data-act="parent" @click="parentUp">父组件 n + 1</button>
      </template>
      <template v-else-if="caseId === 'await'">
        <button type="button" class="b" data-act="a" @click="touchA">改 a（await 之前读）</button>
        <button type="button" class="b" data-act="b" @click="touchB">改 b（await 之后读）</button>
      </template>
      <template v-else-if="caseId === 'loop'">
        <button type="button" class="b" data-act="add" @click="addItem">加一项</button>
      </template>
      <template v-else-if="caseId === 'leak'">
        <button type="button" class="b" data-act="toggle" @click="toggleChild">{{ mounted ? '卸载 Child' : '挂载 Child' }}</button>
        <button type="button" class="b" data-act="src" @click="touchSrc">修改 src</button>
      </template>
      <button v-if="caseId !== 'identity'" type="button" class="b" data-act="reset" @click="reset">计数归零</button>
    </div>
    <pre v-if="cur().code" class="code" style="margin:8px 0">{{ cur().code }}</pre>

    <template v-if="caseId === 'identity'">
      <div class="box" style="margin-top:8px">
        <span class="cap">{{ fixed ? '已修复的写法' : '症状版的写法' }}</span>
        <dl class="kv" data-identity>
          <template v-for="(r, i) in idRows" :key="i">
            <dt>{{ r.code }}</dt><dd :data-id-row="i">{{ r.out }}</dd>
          </template>
        </dl>
      </div>
    </template>
    <div v-show="caseId !== 'identity'" class="cols" style="margin-top:8px">
      <div v-show="caseId !== 'await'" class="box"><span class="cap">应用</span><div ref="host" class="clinic-host"></div></div>
      <div class="box">
        <span class="cap">测量</span>
        <dl class="kv">
          <template v-if="caseId === 'destructure'">
            <dt>数据里的值（state.count）</dt><dd data-fact="data">{{ facts.data || '0' }}</dd>
          </template>
          <template v-else-if="caseId === 'await'">
            <dt>副作用函数运行次数</dt><dd data-count="runs">{{ counts.runs || 0 }}</dd>
            <dt>onTrack 记下的依赖</dt><dd data-fact="tracked">{{ facts.tracked || '（没有）' }}</dd>
          </template>
          <template v-else-if="caseId === 'loop'">
            <dt>watch 回调运行次数</dt><dd data-count="callback">{{ counts.callback || 0 }}</dd>
            <dt>Vue 的反应</dt><dd data-fact="error">{{ facts.error || '' }}</dd>
          </template>
          <template v-else-if="caseId === 'leak'">
            <dt>回调运行次数</dt><dd data-count="hits">{{ counts.hits || 0 }}</dd>
            <dt>其中卸载之后运行的</dt><dd data-count="afterUnmount">{{ counts.afterUnmount || 0 }}</dd>
          </template>
        </dl>
      </div>
    </div>
    <div v-if="caseId === 'destructure' || caseId === 'snapshot' || caseId === 'await'" class="log" data-log style="margin-top:8px">
      <div v-for="(l, i) in logs" :key="i">{{ l }}</div>
      <div v-if="!logs.length" class="m">{{ caseId === 'await' ? 'onTrigger 日志：改 a 或 b 后，这里显示是哪份数据触发了副作用函数。' : 'onRenderTracked / onRenderTriggered 日志。症状版里如果这里一直是空的，说明渲染没有收集到任何依赖。' }}</div>
    </div>
  </template>
</template>

<style scoped>
.clinic-host :deep(p) { margin: 4px 0; }
</style>
