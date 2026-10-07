<script setup lang="ts">
// 可判题的代码练习：<Exercise id="counter" />
// 练习定义在 course/exercises/<章>.ts。整个组件只在浏览器里渲染。
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { exercises } from '../../../exercises'
import type { ExerciseHelper } from '../../../exercises/types'
import { useData } from 'vitepress'
import { store, storeRev, markStoreReady } from '../composables/store'
import { autoDone } from '../composables/progress'

const props = defineProps<{ id: string }>()
const ex = exercises[props.id]

const mounted = ref(false)
const root = ref<HTMLElement>()
const tplHost = ref<HTMLElement>()
const jsHost = ref<HTMLElement>()
const outEl = ref<HTMLElement>()

const tpl = ref('')
const js = ref('')
const hintLv = ref(0)
const solSeen = ref(false)
const err = ref('')
const errLine = ref(0)
const results = ref<[boolean, string][]>([])
const allPassed = ref(false)
const resNote = ref('')

const hints = ex ? ex.hints : []
const { frontmatter } = useData()
const passed = computed(() => (void storeRev.value, store.get<Record<string, unknown>>('ex', {})[props.id]))
const badge = computed(() => (passed.value === true ? '✓ 已通过' : passed.value ? '看过答案后通过' : '未完成'))
const badgeTitle = computed(() => (passed.value && passed.value !== true ? '点“重置”，不看答案再写一次，就算通过' : ''))
const solOpen = computed(() => hintLv.value >= hints.length || solSeen.value || !!passed.value)
const hintBtn = computed(() => (hintLv.value > 0 && hintLv.value < hints.length ? '下一级提示' : '提示'))

// ---- Vue（带编译器）和编辑器：挂载后才动态加载 ----
let V: any = null
let API: Record<string, unknown> = {}
// 运行练习脚本时额外提供全局 Vue（旧版页面里 window.Vue 是全局的，练习代码里有 Vue.createApp 这样的写法）。
// 不放进 API：API 的名字会进编辑器的自动补全，Vue 不需要。
let RUN: Record<string, unknown> = {}
let cmTpl: any = null
let cmJs: any = null
let app: any = null

function save() {
  store.set('ex:' + props.id, { tpl: tpl.value, js: js.value })
}
function setCode(t: string, j: string) {
  tpl.value = t
  js.value = j
  cmTpl?.setValue(t)
  cmJs?.setValue(j)
  save()
}
function markLine(n: number) {
  errLine.value = n
  cmJs?.setBad(n)
}
// 从错误栈里找出脚本行号。new Function 会在代码前多加 2 行
const lineOf = (e: any) => {
  const m = e && e.stack && /<anonymous>:(\d+):\d+/.exec(e.stack)
  return m ? Math.max(1, +m[1] - 2) : 0
}
function showErr(msg: string, e?: unknown) {
  const ln = lineOf(e)
  err.value = '错误：' + msg + (ln ? '（脚本第 ' + ln + ' 行）' : '')
  markLine(ln)
}
function gotoErrLine() {
  if (errLine.value) cmJs?.goLine(errLine.value)
}

function run(): boolean {
  if (app) { try { app.unmount() } catch { /* ignore */ } app = null }
  const out = outEl.value!
  out.innerHTML = ''
  err.value = ''
  markLine(0)
  const mountEl = document.createElement('div')
  out.appendChild(mountEl)
  let fn: (...a: unknown[]) => unknown
  try {
    fn = new Function(...Object.keys(RUN), js.value) as any
  } catch (e: any) {
    showErr('脚本语法错误：' + e.message)
    return false
  }
  const errs: string[] = []
  try {
    app = V.createApp({
      template: tpl.value,
      setup() {
        const r: any = fn(...Object.values(RUN))
        if (!r || typeof r !== 'object') throw new Error('setup 必须返回一个对象，例如 return { count }')
        if (r.components) {
          Object.entries(r.components).forEach(([k, v]) => app.component(k, v))
          const { components, ...rest } = r
          return rest
        }
        return r
      }
    })
    app.config.errorHandler = (e: any) => { errs.push(e.message || String(e)); showErr(e.message || String(e), e) }
    app.config.warnHandler = () => {}
    app.mount(mountEl)
  } catch (e: any) {
    showErr(e.message, e)
    return false
  }
  return errs.length === 0 && !err.value
}

async function check() {
  results.value = []
  allPassed.value = false
  resNote.value = ''
  const okRun = run()
  const rs: [boolean, string][] = []
  if (okRun) {
    const out = outEl.value!
    const T: ExerciseHelper = {
      $: s => out.querySelector(s),
      $$: s => [...out.querySelectorAll(s)],
      text: () => out.textContent || '',
      btn: t => [...out.querySelectorAll('button')].find(b => (b.textContent || '').includes(t)),
      async click(el) { (el as HTMLElement).click(); await V.nextTick() },
      ok(c, msg) { rs.push([!!c, msg]) }
    }
    try { await ex.check(T) } catch (e: any) { rs.push([false, '检查时出错：' + e.message]) }
    if (err.value) rs.push([false, '运行时发生错误。阅读上方的红色文字。'])
    run() // 检查会改变状态，重新运行一次还原
  } else rs.push([false, '代码没有运行。阅读上方的错误信息。'])
  const all = rs.length > 0 && rs.every(r => r[0])
  results.value = rs
  allPassed.value = all
  if (all) {
    const p = store.get<Record<string, unknown>>('ex', {})
    if (p[props.id] !== true) p[props.id] = solSeen.value ? 'sol' : true
    store.set('ex', p)
    autoDone(frontmatter.value.id) // 自测答完、练习也通过时，自动标记本章完成
  }
}

function onRun() { res0(); run() }
function res0() { results.value = []; allPassed.value = false; resNote.value = '' }
function onCheck() { setTimeout(check, 0) } // 等这次点击传播结束，避免被 document 上的监听收到

function onHint() {
  hintLv.value = Math.min(hintLv.value + 1, hints.length)
}
function onSol() {
  if (!solOpen.value) return
  solSeen.value = true
  const ss = store.get<Record<string, boolean>>('exSol', {})
  ss[props.id] = true
  store.set('exSol', ss)
  setCode(ex.solTpl || ex.tpl, ex.solJs || ex.js)
  res0()
  resNote.value = '编辑器中是参考答案。阅读答案，然后点击“运行并检查”。'
  run()
}
function onReset() {
  setCode(ex.tpl, ex.js)
  res0()
  hintLv.value = 0
  if (solSeen.value) {
    solSeen.value = false
    const ss = store.get<Record<string, boolean>>('exSol', {})
    delete ss[props.id]
    store.set('exSol', ss)
  }
  run()
}

onMounted(async () => {
  if (!ex) return
  markStoreReady()
  const saved = store.get<{ tpl: string; js: string } | null>('ex:' + props.id, null)
  tpl.value = saved ? saved.tpl : ex.tpl
  js.value = saved ? saved.js : ex.js
  solSeen.value = !!store.get<Record<string, boolean>>('exSol', {})[props.id]
  mounted.value = true
  await nextTick()
  // 带编译器的 Vue 构建。它和站点用的运行时构建共用 @vue/runtime-dom，
  // 同时注册了模板编译器，所以 createApp({ template }) 能工作。
  // @ts-ignore 这个构建没有类型声明
  const [vm, cm] = await Promise.all([import('vue/dist/vue.esm-bundler.js'), import('../../../../editor/entry.js')])
  // 编辑器还在加载时用户已经换了页：组件已卸载，不再往下做（否则会报“Cannot set properties of null”）
  if (!root.value || !tplHost.value || !jsHost.value) return
  V = vm
  API = {
    ref: V.ref, reactive: V.reactive, computed: V.computed, watch: V.watch, watchEffect: V.watchEffect,
    toRefs: V.toRefs, toRef: V.toRef, shallowRef: V.shallowRef, nextTick: V.nextTick,
    onMounted: V.onMounted, onUnmounted: V.onUnmounted, provide: V.provide, inject: V.inject
  }
  RUN = { ...API, Vue: V }
  const mk = (host: HTMLElement, doc: string, lang: 'tpl' | 'js', onChange: (v: string) => void) =>
    cm.create({
      parent: host, doc, lang, api: Object.keys(API), onRun: () => onCheck(),
      label: lang === 'tpl' ? '模板代码' : '脚本代码', onChange
    })
  cmTpl = mk(tplHost.value!, tpl.value, 'tpl', v => { tpl.value = v; save() })
  cmJs = mk(jsHost.value!, js.value, 'js', v => { js.value = v; save() })
  // 给自动化测试用：直接设置两段代码
  ;(root.value as any).__setCode = setCode
  if (!ex.lazy) run()
  else if (outEl.value) outEl.value.innerHTML = '<p class="cap">点击“只运行”或“运行并检查”，查看运行结果。</p>'
})

onBeforeUnmount(() => {
  if (app) { try { app.unmount() } catch { /* ignore */ } }
  cmTpl?.view.destroy()
  cmJs?.view.destroy()
})
</script>

<template>
  <div v-if="!ex" class="ex"><div class="ex-body"><p class="ex-err">找不到练习：{{ id }}</p></div></div>
  <div v-else-if="!mounted" class="ex ex-ph" :data-ex-ph="id">
    <div class="ex-head"><b>练习：{{ ex.title }}</b><span class="badge">载入中</span></div>
  </div>
  <div v-else ref="root" class="ex" :data-ex="id">
    <div class="ex-head">
      <b>练习：{{ ex.title }}</b>
      <span class="badge" :class="{ pass: passed === true }" :title="badgeTitle">{{ badge }}</span>
    </div>
    <div class="ex-body">
      <div class="ex-task" v-html="ex.task"></div>
      <div class="ex-edit">
        <div>
          <span class="ed-label">模板 template</span>
          <div class="ed cm-on"><div ref="tplHost"></div></div>
        </div>
        <div>
          <span class="ed-label">脚本 setup 函数体 <span class="cap2">（可直接使用 ref、reactive、computed、watch、toRefs 等）</span></span>
          <div class="ed cm-on"><div ref="jsHost"></div></div>
        </div>
      </div>
      <div class="ed-keys cap">Tab 缩进 · Shift+Tab 减少缩进 · Ctrl/⌘ + / 注释 · Ctrl/⌘ + Enter 运行并检查 · Ctrl + 空格 补全 · Ctrl/⌘ + F 查找 · 按 Esc 后再按 Tab 离开编辑器</div>
      <div class="row">
        <button class="b pri" data-a="check" @click="onCheck">运行并检查</button>
        <button class="b" data-a="run" @click="onRun">只运行</button>
        <button class="b" data-a="hint" @click="onHint">{{ hintBtn }}</button>
        <button
          class="b"
          data-a="sol"
          :disabled="!solOpen"
          :title="solOpen ? '' : '先用完 ' + hints.length + ' 级提示，再看答案'"
          @click="onSol"
        >看答案</button>
        <button class="b" data-a="reset" @click="onReset">重置</button>
      </div>
      <div v-if="hintLv > 0" class="ex-hint">
        <div v-for="(t, i) in hints.slice(0, hintLv)" :key="i"><b>提示 {{ i + 1 }}/{{ hints.length }}：</b>{{ t }}</div>
      </div>
      <div class="cap">运行结果。你可以操作它。</div>
      <div ref="outEl" class="ex-out"></div>
      <div
        v-if="err"
        class="ex-err"
        role="alert"
        :style="errLine ? 'cursor:pointer' : ''"
        :title="errLine ? '点击跳到第 ' + errLine + ' 行' : ''"
        @click="gotoErrLine"
      >{{ err }}</div>
      <div class="ex-res" role="status" aria-live="polite">
        <div v-if="resNote" class="cap">{{ resNote }}</div>
        <div v-for="(r, i) in results" :key="i" :class="r[0] ? 'ok' : 'no'">{{ r[0] ? '✓ ' : '✗ ' }}{{ r[1] }}</div>
        <div v-if="allPassed" class="ok"><b>全部通过。</b></div>
      </div>
    </div>
  </div>
</template>
