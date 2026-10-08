<script setup lang="ts">
// 实验台：请求时间线。同一串点击，在四种策略下界面显示什么、实际发出几个请求。
import { computed, onBeforeUnmount, reactive, ref } from 'vue'

type Strategy = 'none' | 'seq' | 'abort' | 'cache'
type State = 'pending' | 'done' | 'failed' | 'aborted' | 'discarded' | 'hit' | 'shared'
interface Row { n: number; key: string; start: number; end: number | null; state: State }

const KEYS = ['A', 'B', 'C']
const delay = reactive<Record<string, number>>({ A: 900, B: 150, C: 500 })
const fail = reactive<Record<string, boolean>>({ A: false, B: false, C: false })
const strategy = ref<Strategy>('none')
const STRATS: [Strategy, string][] = [['none', '不处理'], ['seq', '请求序号：丢弃过期结果'], ['abort', '取消旧请求'], ['cache', '按 key 缓存并去重']]

const current = ref('')                       // 用户最后点的 key
const raw = ref('')                           // 前三种策略共用的“界面显示”
const rawErr = ref('')
const rows = ref<Row[]>([])
const cacheStore = reactive<Record<string, { result?: string; error?: string; pending?: boolean }>>({})
const sent = ref(0)
const t0 = ref(0)
const now = ref(0)
let seq = 0
let timer: ReturnType<typeof setInterval> | undefined
const controllers = new Map<number, () => void>()   // 请求 n → 取消它的函数
let counter = 0

function clock() { return performance.now() - t0.value }
function tick() {
  now.value = clock()
  if (!rows.value.some(r => r.state === 'pending') && timer) { clearInterval(timer); timer = undefined }
}
function ensureTimer() { if (!timer) timer = setInterval(tick, 50) }
onBeforeUnmount(() => { if (timer) clearInterval(timer) })

function reset() {
  controllers.forEach(abort => abort())
  controllers.clear()
  rows.value = []; sent.value = 0; current.value = ''; raw.value = ''; rawErr.value = ''; seq = 0; counter = 0
  for (const k of Object.keys(cacheStore)) delete cacheStore[k]
  t0.value = performance.now(); now.value = 0
}
reset()

// 假接口：delay 毫秒后返回结果，或者失败；支持取消
function fakeFetch(key: string, onAbort: (cb: () => void) => void) {
  return new Promise<string>((resolve, reject) => {
    const id = setTimeout(() => (fail[key] ? reject(new Error('请求失败')) : resolve('结果 ' + key)), delay[key])
    onAbort(() => { clearTimeout(id); reject(new DOMException('aborted', 'AbortError')) })
  })
}

function pick(key: string) {
  if (!rows.value.length) t0.value = performance.now()
  current.value = key
  const s = strategy.value
  if (s === 'cache') return pickCached(key)
  const row = reactive<Row>({ n: ++counter, key, start: clock(), end: null, state: 'pending' })
  rows.value.push(row)
  sent.value++
  ensureTimer()
  const mine = ++seq
  if (s === 'abort') controllers.forEach(abort => abort())     // 新请求发出前，取消所有还在路上的
  let abortFn = () => {}
  const p = fakeFetch(key, cb => { abortFn = cb })
  controllers.set(row.n, abortFn)
  raw.value = ''; rawErr.value = ''
  p.then(
    res => {
      row.end = clock()
      if (s === 'seq' && mine !== seq) { row.state = 'discarded'; return }
      row.state = 'done'; raw.value = res; rawErr.value = ''
    },
    err => {
      row.end = clock()
      if (err.name === 'AbortError') { row.state = 'aborted'; return }
      if (s === 'seq' && mine !== seq) { row.state = 'discarded'; return }
      row.state = 'failed'; rawErr.value = err.message; raw.value = ''
    }
  ).finally(() => controllers.delete(row.n))
}

function pickCached(key: string) {
  cacheStore[key] ??= {}
  const e = cacheStore[key]                        // 取响应式代理，才能触发更新
  if (e.result !== undefined) {
    rows.value.push({ n: ++counter, key, start: clock(), end: clock(), state: 'hit' })
    return
  }
  if (e.pending) {
    rows.value.push({ n: ++counter, key, start: clock(), end: clock(), state: 'shared' })
    return
  }
  e.pending = true; e.error = undefined
  const row = reactive<Row>({ n: ++counter, key, start: clock(), end: null, state: 'pending' })
  rows.value.push(row); sent.value++; ensureTimer()
  fakeFetch(key, () => {}).then(
    res => { row.end = clock(); row.state = 'done'; e.result = res },
    err => { row.end = clock(); row.state = 'failed'; e.error = err.message }
  ).finally(() => { e.pending = false })
}

const shown = computed(() => {
  if (strategy.value === 'cache') {
    const e = cacheStore[current.value]
    if (!e) return { text: '', err: '' }
    return { text: e.result ?? '', err: e.error ?? '' }
  }
  return { text: raw.value, err: rawErr.value }
})
const verdict = computed(() => {
  if (!current.value) return ''
  const pendingNow = rows.value.some(r => r.state === 'pending')
  if (shown.value.err) return '界面显示：' + shown.value.err
  if (!shown.value.text) return pendingNow ? '加载中…' : '界面空白'
  const ok = shown.value.text === '结果 ' + current.value
  return '界面显示：' + shown.value.text + (ok ? '，和当前选中的 ' + current.value + ' 一致' : '，但当前选中的是 ' + current.value + '（错了）')
})
const verdictOk = computed(() => !!shown.value.text && shown.value.text === '结果 ' + current.value || !current.value)
const span = computed(() => Math.max(3000, ...rows.value.map(r => (r.end ?? now.value)), now.value))
const bar = (r: Row) => ({
  left: (r.start / span.value) * 100 + '%',
  width: r.state === 'hit' || r.state === 'shared' ? '0.8%' : Math.max(0.8, (((r.end ?? now.value) - r.start) / span.value) * 100) + '%'
})
const STATE_TEXT: Record<State, string> = { pending: '进行中', done: '完成', failed: '失败', aborted: '已取消', discarded: '结果被丢弃', hit: '命中缓存，没发请求', shared: '共用进行中的请求，没发请求' }
</script>

<template>
  <div class="tl">
    <div class="row">
      <span class="cap">策略：</span>
      <label v-for="s in STRATS" :key="s[0]" class="ctl"><input type="radio" name="tl-strategy" :value="s[0]" v-model="strategy" @change="reset" /> {{ s[1] }}</label>
    </div>
    <div class="tl-keys">
      <div v-for="k in KEYS" :key="k" class="tl-key">
        <button class="b" :class="{ on: current === k }" :data-pick="k" @click="pick(k)">查 {{ k }}</button>
        <label class="ctl">延迟 <input type="range" min="50" max="1500" step="50" v-model.number="delay[k]" :aria-label="'查 ' + k + ' 的延迟'" /> <b>{{ delay[k] }}ms</b></label>
        <label class="ctl"><input type="checkbox" v-model="fail[k]" /> 失败</label>
      </div>
    </div>
    <div class="row">
      <button class="b" data-reset @click="reset">重置</button>
      <span class="pill" data-sent>实际发出的请求：{{ sent }}</span>
      <span class="pill" :class="verdictOk ? 'g' : 'bad'" data-verdict>{{ verdict || '点“查 A / B / C”开始' }}</span>
    </div>
    <div class="tl-rows">
      <div v-for="r in rows" :key="r.n" class="tl-row" :data-state="r.state">
        <span class="tl-label">#{{ r.n }} 查 {{ r.key }}</span>
        <div class="tl-track"><div class="tl-bar" :class="'s-' + r.state" :style="bar(r)"></div></div>
        <span class="tl-state">{{ STATE_TEXT[r.state] }}</span>
      </div>
      <div v-if="!rows.length" class="cap">时间轴：横轴是时间（至少 3 秒）。每个请求画成一条横条。</div>
    </div>
    <div class="cap">试一试：先点“查 A”（慢），马上点“查 B”（快）。再换策略，重复同样的操作。</div>
  </div>
</template>

<style scoped>
.tl-keys { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 8px 0; }
.tl-key { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tl-rows { display: grid; gap: 4px; margin-top: 10px; }
.tl-row { display: grid; grid-template-columns: 78px 1fr auto; gap: 8px; align-items: center; font-size: 13px; }
.tl-track { position: relative; height: 14px; background: var(--sunken); border-radius: 4px; }
.tl-bar { position: absolute; top: 0; bottom: 0; border-radius: 4px; background: var(--accent); min-width: 3px; }
.tl-bar.s-pending { opacity: 0.55; }
.tl-bar.s-aborted { background: var(--muted); }
.tl-bar.s-discarded { background: transparent; border: 1.5px dashed var(--muted); }
.tl-bar.s-failed { background: #d9534f; }
.tl-bar.s-hit, .tl-bar.s-shared { background: #2e9e6a; }

.pill.bad { border-color: #d9534f; color: #d9534f; }
.tl-state { color: var(--muted); min-width: 7em; text-align: right; }
@media (max-width: 560px) {
  .tl-row { grid-template-columns: 60px 1fr; }
  .tl-state { grid-column: 1 / -1; text-align: left; }
}
</style>
