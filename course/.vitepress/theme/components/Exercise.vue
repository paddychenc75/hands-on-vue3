<script setup lang="ts">
// 可判题的代码练习：<Exercise id="counter" />
// 练习定义在 course/exercises/<章>.ts。整个组件只在浏览器里渲染。
// 进度存在引擎里这一章的 ex[练习 id]（通过、草稿、失败次数、是否看过答案、借助答案的标记），见 course/engine/logic/exerciseState.ts。
// 提示阶梯（规则在 course/engine/logic/ladder.ts）：
//   提示（检查失败 1 次）→ 半成品示例（失败 2 次且距第一次失败 2 分钟，练习有 faded 字段时才有这一级）→ 参考答案（失败 3 次且 5 分钟）。
//   只有代码真的改了的失败才计数。粘贴参考答案原文不能通过，除非看过答案后点了“重置”自己重写。
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { exercises } from '../../../exercises'
import type { ExerciseHelper } from '../../../exercises/types'
import { useData } from 'vitepress'
import { completeIfMet, chapterOf, cpOf, ensureReady, mutate } from '../composables/learn'
import { recordFailure, recordPass, resetExercise, restoreStash, saveDraft, stashCode, viewSolution } from '../../../engine/logic/exerciseState'
import { fadedExample, hasFaded, isPastedSolution, ladderLevels, ladderStatus, unlockNote } from '../../../engine/logic/ladder'
import type { CodePair } from '../../../engine/types'

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
/** 当前时间（毫秒）。阶梯按钮的“还要等几分钟”按它算：每次检查、每 15 秒、切回页面时刷新 */
const now = ref(Date.now())
/** 半成品示例。默认取练习的 faded 字段；测试可以通过根元素的 __setFaded 临时设置 */
const fadedDef = ref(ex ? ex.faded : undefined)
const err = ref('')
const errLine = ref(0)
const results = ref<[boolean, string][]>([])
const allPassed = ref(false)
const resNote = ref('')
/** 检查失败后的说明（已解锁哪一级，或这次没计入解锁次数） */
const failNote = ref('')
/** 检查通过后，借助答案的说明 */
const passNote = ref('')

const hints = ex ? ex.hints : []
const { frontmatter } = useData()
const chapterId = computed(() => frontmatter.value.id as string)
// 注意：引擎的进度对象是原地修改的，不要把 cpOf 的结果缓存在 computed 里。每个 computed 里直接调用 epNow()，它会登记对进度版本号的依赖。
const epNow = () => cpOf(chapterId.value)?.ex[props.id]
const passed = computed(() => !!epNow()?.passed)
/** 借助答案通过的（通过那一刻看过参考答案）：'solution' 是看过答案后改写通过，'rewrite' 是看过答案、点了重置后自己重写通过 */
const help = computed(() => (epNow()?.passed ? epNow()?.help || false : false))
const badge = computed(() => (!passed.value ? '未完成' : help.value === 'rewrite' ? '看过答案后重写通过' : help.value ? '借助答案完成' : '✓ 已通过'))
const badgeTitle = computed(() =>
  help.value === 'rewrite' ? '看过参考答案后，你点了重置，自己重写通过。过几天不看答案再写一次，检验是否记住了' : help.value ? '借助了参考答案。过几天不看答案再写一遍，记得更牢' : ''
)
const starterPair: CodePair = { tpl: ex?.tpl ?? '', js: ex?.js ?? '' }
const solutionPair: CodePair = { tpl: ex?.solTpl || ex?.tpl || '', js: ex?.solJs || ex?.js || '' }
const hasFadedEx = computed(() => hasFaded({ faded: fadedDef.value }))
const fadedPair = computed(() => fadedExample({ faded: fadedDef.value }, starterPair))
const levels = computed(() => ladderLevels(hasFadedEx.value))
/** 每一级的当前状态：能不能点，按钮上写什么 */
const st = computed(() => {
  const list = ladderStatus(levels.value, epNow() ?? {}, now.value)
  return Object.fromEntries(list.map(x => [x.level.key, x])) as Record<'hint' | 'faded' | 'solution', { open: boolean; text: string }>
})
const hintBtn = computed(() => (!st.value.hint.open ? st.value.hint.text : hintLv.value > 0 && hintLv.value < hints.length ? '下一级提示' : '提示'))
/** 学习者自己的代码被半成品或答案换掉之前存了一份，可以找回 */
const stashed = computed(() => !!epNow()?.stash)
const ruleText = computed(() => '先独立尝试。每次改过代码后检查失败，就会多解锁一级帮助：' + levels.value.map(l => (l.key === 'solution' ? '参考答案' : l.name)).join(' → ') + '。')

// ---- Vue（带编译器）和编辑器：挂载后才动态加载 ----
let V: any = null
let API: Record<string, unknown> = {}
// 运行练习脚本时额外提供全局 Vue（旧版页面里 window.Vue 是全局的，练习代码里有 Vue.createApp 这样的写法）。
// 不放进 API：API 的名字会进编辑器的自动补全，Vue 不需要。
let RUN: Record<string, unknown> = {}
let cmTpl: any = null
let cmJs: any = null
let app: any = null

/** 保存草稿。每个按键都会调用，只写存储，不通知界面 */
function save() {
  mutate(() => {
    const c = chapterOf(chapterId.value)
    c.ex[props.id] = saveDraft(c.ex[props.id], { tpl: tpl.value, js: js.value })
  }, { silent: true })
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

const PASTE_MSG = '这还是参考答案的原文。点“重置”，不看答案，自己从头写一遍再检查。写出来的过程才是练习本身。'
const NOT_COUNTED_MSG = '代码和起始代码或上次检查时一样，这次不计入解锁次数。先动手改一改。'

async function check() {
  res0()
  now.value = Date.now()
  const code: CodePair = { tpl: tpl.value, js: js.value }
  // 看过答案、没点重置，直接交答案原文：不运行，不算通过，也不计失败
  if (isPastedSolution(code, solutionPair, epNow() ?? {})) {
    resNote.value = PASTE_MSG
    return
  }
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
  now.value = Date.now()
  if (all) {
    mutate(p => {
      const c = chapterOf(chapterId.value)
      c.ex[props.id] = recordPass(c.ex[props.id])
      completeIfMet(p, chapterId.value) // 自测全部答对、练习也通过时，自动标记本章完成
    })
    const h = epNow()?.help
    passNote.value = h === 'rewrite'
      ? '你看过答案后自己重写了一遍，这一步很有价值。过几天再不看答案写一次，检验是否真的记住了。'
      : h ? '你看过参考答案，所以这道题会记为“借助答案完成”。过几天不看答案再写一遍，才算真正会了。' : ''
    return
  }
  // 没通过：只有代码真的改了才计一次失败（规则见 logic/ladder.ts 的 isAttempt）
  let counted = false
  mutate(() => {
    const c = chapterOf(chapterId.value)
    const r = recordFailure(c.ex[props.id], code, starterPair, Date.now())
    c.ex[props.id] = r.ep
    counted = r.counted
  })
  if (!passed.value) failNote.value = counted ? unlockNote(levels.value, epNow() ?? {}, now.value, true) : NOT_COUNTED_MSG
}

function onRun() { res0(); run() }
function res0() { results.value = []; allPassed.value = false; resNote.value = ''; failNote.value = ''; passNote.value = '' }
function onCheck() { setTimeout(check, 0) } // 等这次点击传播结束，避免被 document 上的监听收到

function onHint() {
  if (!st.value.hint.open) return
  hintLv.value = Math.min(hintLv.value + 1, hints.length)
}
/** 把编辑器换成半成品或参考答案之前，先把学习者自己的代码存起来（可以点“找回我的代码”） */
function stashCurrent() {
  const known = [solutionPair, fadedPair.value].filter((x): x is CodePair => !!x)
  mutate(() => {
    const c = chapterOf(chapterId.value)
    c.ex[props.id] = stashCode(c.ex[props.id], { tpl: tpl.value, js: js.value }, known)
  })
}
function onFaded() {
  const f = fadedPair.value
  if (!st.value.faded?.open || !f) return
  stashCurrent()
  setCode(f.tpl, f.js)
  res0()
  resNote.value = '编辑器中是参考答案的“半成品”：一部分关键代码已经给出，要你自己补全。照着思路写出来，而不是复制。你原来的代码可以点“找回我的代码”恢复。'
  run()
}
function onSol() {
  if (!st.value.solution.open) return
  stashCurrent()
  mutate(() => {
    const c = chapterOf(chapterId.value)
    c.ex[props.id] = viewSolution(c.ex[props.id])
  })
  setCode(solutionPair.tpl, solutionPair.js)
  res0()
  resNote.value = '编辑器中是参考答案。读懂它之后，点“重置”，不看答案再从头写一遍，再检查。直接提交答案原文不算通过。你原来的代码可以点“找回我的代码”恢复。'
  run()
}
function onRestore() {
  let code: CodePair | undefined
  mutate(() => {
    const c = chapterOf(chapterId.value)
    const r = restoreStash(c.ex[props.id])
    c.ex[props.id] = r.ep
    code = r.code
  })
  if (!code) return
  setCode(code.tpl, code.js)
  res0()
  resNote.value = '已找回你原来的代码。'
  run()
}
function onReset() {
  setCode(starterPair.tpl, starterPair.js)
  res0()
  hintLv.value = 0
  // 看过答案后点重置：标记为自己重写，之后写出和答案相同的代码也可以通过（resetExercise 内部判断有没有看过答案）
  mutate(() => {
    const c = chapterOf(chapterId.value)
    c.ex[props.id] = resetExercise(c.ex[props.id])
  })
  run()
}

let timer = 0
const tick = () => { now.value = Date.now() }

onMounted(async () => {
  if (!ex) return
  ensureReady()
  const saved = epNow()?.code
  tpl.value = saved ? saved.tpl : ex.tpl
  js.value = saved ? saved.js : ex.js
  mounted.value = true
  timer = window.setInterval(tick, 15000)
  document.addEventListener('visibilitychange', tick)
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
    onMounted: V.onMounted, onUnmounted: V.onUnmounted, provide: V.provide, inject: V.inject,
    // 正文教过、练习里会用到的名字。不含 h、createApp、createRenderer、createSSRApp、onErrorCaptured、useModel：
    // 练习脚本里已有 const { h } = Vue 这样的声明，和参数同名会是语法错误
    onBeforeMount: V.onBeforeMount, onBeforeUnmount: V.onBeforeUnmount,
    onBeforeUpdate: V.onBeforeUpdate, onUpdated: V.onUpdated,
    onActivated: V.onActivated, onDeactivated: V.onDeactivated,
    useTemplateRef: V.useTemplateRef, onWatcherCleanup: V.onWatcherCleanup, watchPostEffect: V.watchPostEffect,
    readonly: V.readonly, shallowReactive: V.shallowReactive, toRaw: V.toRaw, markRaw: V.markRaw,
    triggerRef: V.triggerRef, unref: V.unref, isRef: V.isRef, toValue: V.toValue, customRef: V.customRef,
    useId: V.useId, effectScope: V.effectScope, onScopeDispose: V.onScopeDispose
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
  // 给自动化测试用：临时替换这道练习的半成品；传 undefined 表示没有半成品（验证阶梯只有两级）
  ;(root.value as any).__setFaded = (f: { tpl?: string; js?: string } | undefined) => { fadedDef.value = f }
  if (!ex.lazy) run()
  else if (outEl.value) outEl.value.innerHTML = '<p class="cap">点击“只运行”或“运行并检查”，查看运行结果。</p>'
})

onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', tick)
  if (app) { try { app.unmount() } catch { /* ignore */ } }
  cmTpl?.view.destroy()
  cmJs?.view.destroy()
})
</script>

<template>
  <div v-if="!ex" class="ex"><div class="ex-body"><p class="ex-err">找不到练习：{{ id }}</p></div></div>
  <div v-else-if="!mounted" class="ex ex-ph" :data-ex-ph="id">
    <div class="ex-head"><span class="pg-badge">EXERCISE</span><b>{{ ex.title }}</b><span class="badge">载入中</span></div>
  </div>
  <div v-else ref="root" class="ex" :data-ex="id">
    <div class="ex-head">
      <span class="pg-badge">EXERCISE</span>
      <b>{{ ex.title }}</b>
      <span class="badge" :class="{ pass: passed && !help }" :title="badgeTitle">{{ badge }}</span>
    </div>
    <div class="ex-body">
      <div class="ex-task" v-html="ex.task"></div>
      <div class="ex-rule cap">{{ ruleText }}</div>
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
        <button
          class="b ladder"
          :class="{ locked: !st.hint.open }"
          data-a="hint"
          :disabled="!st.hint.open"
          @click="onHint"
        >{{ hintBtn }}</button>
        <button
          v-if="hasFadedEx"
          class="b ladder"
          :class="{ locked: !st.faded.open }"
          data-a="faded"
          :disabled="!st.faded.open"
          @click="onFaded"
        >{{ st.faded.text }}</button>
        <button
          class="b ladder"
          :class="{ locked: !st.solution.open }"
          data-a="sol"
          :disabled="!st.solution.open"
          @click="onSol"
        >{{ st.solution.text }}</button>
        <button v-if="stashed" class="b" data-a="restore" @click="onRestore">找回我的代码</button>
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
        <div v-if="allPassed" class="ok"><b>全部通过。</b>{{ passNote }}</div>
        <div v-if="failNote" class="cap">{{ failNote }}</div>
      </div>
    </div>
  </div>
</template>
