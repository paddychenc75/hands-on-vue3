<script setup lang="ts">
// 实验台：手写响应式。
// 跑的是全课程共用的迷你 Vue 零件 1（course/mini），和正文、练习里的是同一份代码。
// 实验台只在 track、trigger、cleanup 的入口记日志（runMini 的 traced 选项），不改零件。
import { onMounted, ref } from 'vue'
import { PARTS } from '../../mini'
import { runMini } from '../../mini/load'

const logs = ref<{ cls: string; msg: string }[]>([])
function log(cls: string, msg: string) {
  logs.value.unshift({ cls, msg })
  if (logs.value.length > 60) logs.value.length = 60
}

const names = new Map<unknown, string>()   // 副作用函数 e → 名字
const runCounts = new Map<unknown, number>()
const nameOf = (e: unknown) => names.get(e) || '?'

const mini: any = runMini(PARTS.reactivity, {
  lets: ['activeEffect'],
  traced: ['track', 'trigger', 'cleanup'],
  trace: ({ fn, args }) => {
    const [a, b] = args as [any, any]
    if (fn === 'track') {
      const dep = mini.targetMap.get(a)?.get(b)
      const e = mini.activeEffect
      if (e && !(dep && dep.has(e))) log('tg', 'track   ' + String(b) + ' ← ' + nameOf(e))
    } else if (fn === 'trigger') {
      const dep = mini.targetMap.get(a)?.get(b)
      const list = dep ? [...dep].filter(e => e !== mini.activeEffect) : []
      log('tr', 'trigger ' + String(b) + (list.length ? ' → ' + list.map(nameOf).join('、') : ' → 无人依赖'))
    } else if (fn === 'cleanup') {
      const n = (runCounts.get(a) || 0) + 1
      runCounts.set(a, n)
      log('rn', 'run     ' + nameOf(a) + '（第 ' + n + ' 次，已清理旧依赖）')
    }
  }
})

function effect(name: string, fn: () => void, onRun: (runs: number) => void) {
  // lazy：先登记名字，再第一次运行，日志里才有名字
  const e = mini.effect(() => { fn(); onRun(runCounts.get(e) || 0) }, { lazy: true })
  names.set(e, name)
  e.run()
  return e
}

const raw = { price: 10, qty: 2, discount: 0.1, showDiscount: true }
const state = mini.reactive(raw)

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
  const dm = mini.targetMap.get(raw) || new Map()
  bucket.value = ['price', 'qty', 'discount', 'showDiscount'].map(k => {
    const dep = dm.get(k)
    return { k, effs: dep ? [...dep].map((e: unknown) => nameOf(e)) : [] }
  })
}

onMounted(() => {
  log('m', '— 初始化：两个 effect 各执行一次 —')
  effect('总价', () => { outA.value = state.price * state.qty }, n => { runsA.value = n; flash(boxA.value) })
  effect('优惠提示', () => {
    outB.value = state.showDiscount ? '省 ' + +(state.price * state.qty * state.discount).toFixed(2) : '无优惠'
  }, n => { runsB.value = n; flash(boxB.value) })
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
