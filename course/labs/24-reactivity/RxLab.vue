<script setup lang="ts">
// 实验台：手写响应式（旧版 #lab-rx，旧脚本“第 10 章：手写响应式实验台”）
// 这里的 track / trigger / effect / reactive 是手写的迷你版本，和 Vue 自己的响应式互不相干，
// 所以逻辑照搬旧版；只是把旧版“往 DOM 里直接写文字”的部分换成了模板。
import { onMounted, ref } from 'vue'

type Dep = Set<Eff>
interface Eff { name: string; deps: Dep[]; runs: number; run: () => void }

let activeEffect: Eff | null = null
const targetMap = new WeakMap<object, Map<string | symbol, Dep>>()

const logs = ref<{ cls: string; msg: string }[]>([])
function log(cls: string, msg: string) {
  logs.value.unshift({ cls, msg })
  if (logs.value.length > 60) logs.value.length = 60
}
function track(t: object, k: string | symbol) {
  if (!activeEffect) return
  let dm = targetMap.get(t)
  if (!dm) targetMap.set(t, (dm = new Map()))
  let dep = dm.get(k)
  if (!dep) dm.set(k, (dep = new Set()))
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
    log('tg', 'track   ' + String(k) + ' ← ' + activeEffect.name)
  }
}
function trigger(t: object, k: string | symbol) {
  const dep = targetMap.get(t) && targetMap.get(t)!.get(k)
  const list = dep ? [...dep].filter(e => e !== activeEffect) : []
  log('tr', 'trigger ' + String(k) + (list.length ? ' → ' + list.map(e => e.name).join('、') : ' → 无人依赖'))
  list.forEach(e => e.run())
}
function reactive<T extends object>(obj: T): T {
  return new Proxy(obj, {
    get(t, k, r) { track(t, k); return Reflect.get(t, k, r) },
    set(t, k, v, r) {
      const old = (t as any)[k]
      const ok = Reflect.set(t, k, v, r)
      if (!Object.is(old, v)) trigger(t, k)
      return ok
    }
  })
}
function effect(name: string, fn: () => void, onRun: (e: Eff) => void) {
  const e: Eff = {
    name, deps: [], runs: 0,
    run() {
      e.deps.forEach(d => d.delete(e)); e.deps.length = 0
      const prev = activeEffect; activeEffect = e; e.runs++
      log('rn', 'run     ' + name + '（第 ' + e.runs + ' 次，已清理旧依赖）')
      try { fn() } finally { activeEffect = prev }
      onRun(e)
    }
  }
  e.run()
  return e
}

const raw = { price: 10, qty: 2, discount: 0.1, showDiscount: true }
const state = reactive(raw)

const outA = ref<string | number>('-')
const outB = ref('-')
const runsA = ref(0)
const runsB = ref(0)
const boxA = ref<HTMLElement | null>(null)
const boxB = ref<HTMLElement | null>(null)
const bucket = ref<{ k: string; effs: string[] }[]>([])

function flash(el: HTMLElement | null) {
  if (!el) return
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash')
}
function renderBucket() {
  const dm = targetMap.get(raw) || new Map()
  bucket.value = ['price', 'qty', 'discount', 'showDiscount'].map(k => {
    const dep = dm.get(k)
    return { k, effs: dep ? [...dep].map((e: Eff) => e.name) : [] }
  })
}

onMounted(() => {
  log('m', '— 初始化：两个 effect 各执行一次 —')
  effect('总价', () => { outA.value = state.price * state.qty }, e => { runsA.value = e.runs; flash(boxA.value) })
  effect('优惠提示', () => {
    outB.value = state.showDiscount ? '省 ' + +(state.price * state.qty * state.discount).toFixed(2) : '无优惠'
  }, e => { runsB.value = e.runs; flash(boxB.value) })
  renderBucket()
})

const num = (t: HTMLInputElement) => (t.value === '' || isNaN(+t.value) ? null : +t.value)
function set(key: 'price' | 'qty' | 'discount' | 'showDiscount', v: number | boolean | null) {
  if (v === null) return
  log('m', '— 设置 state.' + key + ' = ' + v + ' —')
  ;(state as any)[key] = v
  renderBucket()
}
</script>

<template>
  <div class="row">
    <label class="ctl">price <input class="t" type="number" id="rxPrice" value="10" @input="set('price', num($event.target as HTMLInputElement))" /></label>
    <label class="ctl">qty <input class="t" type="number" id="rxQty" value="2" @input="set('qty', num($event.target as HTMLInputElement))" /></label>
    <label class="ctl">discount <input class="t" type="number" id="rxDisc" value="0.1" step="0.05" @input="set('discount', num($event.target as HTMLInputElement))" /></label>
    <label class="ctl"><input type="checkbox" id="rxShow" checked @change="set('showDiscount', ($event.target as HTMLInputElement).checked)" /> showDiscount</label>
  </div>
  <div class="cols">
    <div class="box" ref="boxA">
      <span class="cap">副作用函数「总价」 <span class="pill">运行 {{ runsA }} 次</span></span>
      <LabCode code="total = state.price * state.qty" />
      <div style="margin-top: 6px">→ <b>{{ outA }}</b></div>
    </div>
    <div class="box" ref="boxB">
      <span class="cap">副作用函数「优惠提示」 <span class="pill">运行 {{ runsB }} 次</span></span>
      <LabCode :code="'tip = state.showDiscount\n  ? `省 ${price*qty*discount}`\n  : \'无优惠\''" />
      <div style="margin-top: 6px">→ <b>{{ outB }}</b></div>
    </div>
  </div>
  <div class="cols">
    <div class="box">
      <span class="cap">依赖表 targetMap.get(state)</span>
      <div class="bucket">
        <div v-for="b in bucket" :key="b.k" class="ln">
          <span class="key">{{ b.k }}</span>
          <template v-if="b.effs.length"><span v-for="n in b.effs" :key="n" class="ef">{{ n }}</span></template>
          <span v-else class="none">Set(0) 无依赖</span>
        </div>
      </div>
    </div>
    <div class="box">
      <span class="cap">日志（最新的在上面）</span>
      <div class="log"><div v-for="(l, i) in logs" :key="logs.length - i" :class="l.cls">{{ l.msg }}</div></div>
    </div>
  </div>
  <div class="cap">按下面的步骤操作：</div>
  <ol class="cap" style="margin: 0">
    <li>修改 price。两个副作用函数都运行。</li>
    <li>取消选择 showDiscount。</li>
    <li>修改 discount。「优惠提示」不运行。</li>
  </ol>
  <div class="cap">原因：showDiscount 为 false 时，「优惠提示」不读取 discount。重新运行时，Vue 清理了旧依赖。</div>
</template>
