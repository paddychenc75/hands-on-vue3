<script setup lang="ts">
// 实验台：错误传播追踪器
// 在一棵真实的组件树里，用十种方式抛错，记录它经过了哪些 errorCaptured、有没有到 app.config.errorHandler，
// 以及哪些错误完全没被 Vue 接住（只到了 window 的 error / unhandledrejection）。
// 树：Root > Layout(errorCaptured) > Boundary(errorCaptured) > Suspense > Widget。
// 站点用的是生产构建：没有 errorHandler 时只 console.error。实验台把带 __lab 标记的错误拦下来，不打到控制台。
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onErrorCaptured, onMounted, reactive, ref, Suspense, watch, createApp, type App } from 'vue'

type Kind = 'cap' | 'app' | 'win' | 'rej' | 'con'
const host = ref<HTMLElement | null>(null)
const lines = reactive<{ k: Kind; text: string }[]>([])
const cfg = reactive({ stop: true, handler: true })
const current = ref('')
const running = ref(false)
const done = ref(false)

const INFO: Record<string, string> = {
  '0': 'setup 函数', '1': '渲染函数', '2': '侦听器的 getter', '3': '侦听器回调', '4': '侦听器清理函数',
  '5': '原生事件处理函数', '6': '组件事件处理函数', '8': '指令钩子', '9': 'Transition 钩子', '12': '函数 ref',
  '13': '异步组件加载器', m: 'mounted 钩子'
}
const infoText = (info: unknown) => {
  const code = String(info).split('#runtime-')[1]
  return code && INFO[code] ? INFO[code] + '（码 ' + code + '）' : String(info)
}
const boom = (msg: string) => Object.assign(new Error(msg), { __lab: true })
const add = (k: Kind, text: string) => { lines.push({ k, text }) }

interface Scenario { id: string; label: string; vue: string }
const SCENARIOS: Scenario[] = [
  { id: 'setup', label: 'setup 里 throw', vue: '' },
  { id: 'render', label: '渲染函数里 throw', vue: '' },
  { id: 'mounted', label: 'onMounted 里 throw', vue: '' },
  { id: 'watch', label: 'watch 回调里 throw', vue: '' },
  { id: 'click-sync', label: '点击：处理函数同步 throw', vue: '' },
  { id: 'click-async', label: '点击：async 处理函数 throw', vue: '' },
  { id: 'click-floating', label: '点击：Promise 没有返回给 Vue', vue: '' },
  { id: 'emit', label: '子组件事件的处理函数 throw', vue: '' },
  { id: 'async-setup', label: 'async setup 里 throw（有 Suspense）', vue: '' },
  { id: 'timeout', label: 'setTimeout 回调里 throw', vue: '' },
  { id: 'native', label: '原生 addEventListener 里 throw', vue: '' }
]

let app: App | null = null
let origConsoleError: typeof console.error | null = null

function makeTree(mode: string) {
  const Widget = defineComponent({
    name: 'Widget',
    props: { mode: String },
    emits: ['boom'],
    setup(props, { emit }) {
      if (props.mode === 'setup') throw boom('setup 出错')
      const n = ref(0)
      const btn = ref<HTMLElement | null>(null)
      onMounted(() => {
        if (props.mode === 'mounted') throw boom('mounted 出错')
        if (props.mode === 'watch') n.value++
        if (props.mode === 'emit') emit('boom')
        if (props.mode === 'timeout') setTimeout(() => { throw boom('setTimeout 出错') }, 0)
        if (props.mode === 'native') btn.value!.addEventListener('click', () => { throw boom('原生监听函数出错') })
      })
      watch(n, () => { throw boom('watch 回调出错') })
      const onClick = async () => {
        if (props.mode === 'click-sync') throw boom('同步处理函数出错')
        if (props.mode === 'click-async') { await 0; throw boom('async 处理函数出错') }
        if (props.mode === 'click-floating') { Promise.resolve().then(() => { throw boom('悬空的 Promise 出错') }) }
      }
      return () => {
        if (props.mode === 'render') throw boom('渲染函数出错')
        return h('button', { class: 'b', ref: btn, 'data-w': '', onClick: props.mode.startsWith('click') ? onClick : undefined }, 'Widget')
      }
    }
  })
  const AsyncWidget = defineComponent({
    name: 'AsyncWidget',
    async setup() { await 0; throw boom('async setup 出错') },
    render: () => h('i', 'loaded')
  })
  const Boundary = defineComponent({
    name: 'Boundary',
    setup(_, { slots }) {
      onErrorCaptured((_e, _i, info) => {
        add('cap', 'Boundary.errorCaptured：' + infoText(info) + (cfg.stop ? '，返回 false' : '，不返回 false'))
        if (cfg.stop) return false
      })
      return () => h('div', { class: 'boundary' }, slots.default?.())
    }
  })
  const Layout = defineComponent({
    name: 'Layout',
    setup(_, { slots }) {
      onErrorCaptured((_e, _i, info) => { add('cap', 'Layout.errorCaptured：' + infoText(info)) })
      return () => h('div', slots.default?.())
    }
  })
  const Root = defineComponent({
    name: 'Root',
    render() {
      const child = mode === 'async-setup' ? h(AsyncWidget) : h(Widget, { mode, onBoom: () => { throw boom('emit 的处理函数出错') } })
      return h(Layout, null, { default: () => h(Boundary, null, { default: () => h(Suspense, null, { default: () => child, fallback: () => '加载中…' }) }) })
    }
  })
  return Root
}

const onWinError = (e: ErrorEvent) => {
  if (!(e.error && e.error.__lab)) return
  e.preventDefault()
  add('win', 'window 的 error 事件：' + e.error.message)
}
const onRejection = (e: PromiseRejectionEvent) => {
  if (!(e.reason && e.reason.__lab)) return
  e.preventDefault()
  add('rej', 'window 的 unhandledrejection 事件：' + e.reason.message)
}

async function run(id: string) {
  if (running.value) return
  running.value = true
  done.value = false
  current.value = id
  lines.length = 0
  if (app) { app.unmount(); app = null }
  host.value!.innerHTML = ''
  const a = createApp(makeTree(id))
  if (cfg.handler) a.config.errorHandler = (e: any, _i, info) => { add('app', 'app.config.errorHandler：' + e.message + '（' + infoText(info) + '）') }
  app = a
  a.mount(host.value!)
  await nextTick()
  const el = host.value!.querySelector('[data-w]') as HTMLElement | null
  if (el && (id.startsWith('click') || id === 'native')) el.click()
  await new Promise(r => setTimeout(r, 80))
  running.value = false
  done.value = true
}

const verdict = computed(() => {
  if (!done.value) return ''
  const has = (...ks: Kind[]) => lines.some(l => ks.includes(l.k))
  if (has('con')) return '结论：Vue 接住了，但没有人处理（没有 errorHandler，也没有 errorCaptured 返回 false）。生产构建只在控制台打印。'
  if (has('cap', 'app')) return '结论：Vue 接住了这个错误。'
  if (has('win', 'rej')) return '结论：Vue 没有接住它。只有 window 收到了。errorCaptured 和 errorHandler 都不知道这个错误。'
  return '结论：没有任何一层收到错误。'
})

onMounted(() => {
  window.addEventListener('error', onWinError, true)
  window.addEventListener('unhandledrejection', onRejection)
  origConsoleError = console.error
  console.error = function (this: unknown, ...args: any[]) {
    if (args[0] && args[0].__lab) { add('con', 'console.error：没有 errorHandler，生产构建只打印（' + args[0].message + '）'); return }
    return origConsoleError!.apply(this, args as any)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('error', onWinError, true)
  window.removeEventListener('unhandledrejection', onRejection)
  if (origConsoleError) console.error = origConsoleError
  if (app) app.unmount()
})
</script>

<template>
  <div>
    <div class="row">
      <label class="ctl"><input type="checkbox" v-model="cfg.stop"> Boundary 返回 false</label>
      <label class="ctl"><input type="checkbox" v-model="cfg.handler"> 设置 app.config.errorHandler</label>
    </div>
    <div class="cap">树：Root &gt; Layout（errorCaptured）&gt; Boundary（errorCaptured）&gt; Suspense &gt; Widget。点一种抛错方式。</div>
    <div class="et-btns">
      <button v-for="s in SCENARIOS" :key="s.id" class="b" :class="{ on: current === s.id }" :disabled="running" @click="run(s.id)">{{ s.label }}</button>
    </div>
    <div class="cols" style="margin-top:8px">
      <div class="box"><span class="cap">Widget 所在的区域</span><div ref="host" class="et-host"></div></div>
      <div>
        <div class="log et-log" data-et-log>
          <div v-if="!lines.length" class="m">{{ current ? '没有任何一层收到这个错误' : '还没有运行' }}</div>
          <div v-for="(l, i) in lines" :key="i" :class="l.k === 'cap' ? 'tr' : l.k === 'app' ? 'rn' : l.k === 'con' ? 'm' : 'x'">{{ l.text }}</div>
        </div>
        <div class="et-verdict" data-et-verdict>{{ verdict }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.et-btns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.et-host { min-height: 40px; }
.et-log { height: 170px; }
.et-verdict { margin-top: 6px; font-size: 13.5px; min-height: 22px; }
</style>
