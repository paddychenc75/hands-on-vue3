<script setup lang="ts">
// 实验台：依赖图查看器。
// 跑的是真实的 Vue 3.5：ref、computed、effect 都不是手写的。
// 页面上的 version、订阅者链、依赖链，是直接顺着真实对象的 dep.version、dep.subs（prevSub）、sub.deps（nextDep）读出来的。
// 这些是 Vue 的内部字段，只在这里读，不要在业务代码里用。
import { computed, effect, ref } from 'vue'

const n = ref(1)
const m = ref(10)
const tab = ref(true)

// 计数器放在普通对象里：它们不是响应式数据，读写不会产生新的依赖。
const count = { notified: { parity: 0, A: 0, B: 0 }, recomputed: 0, ran: { A: 0, B: 0 } }

const parity = computed(() => {
  count.recomputed++
  return n.value % 2 ? '奇' : '偶'
})
// 在实例上包一层 notify，只为数出「parity 被通知了几次」。真实的 notify 仍然照常执行。
const proto = Object.getPrototypeOf(parity)
;(parity as any).notify = function (this: any) {
  count.notified.parity++
  return proto.notify.call(this)
}

const runA = effect(() => { count.ran.A++; parity.value }, {
  // 有 scheduler 时，被通知后由它决定做什么。这里先计数，再做默认的事：runIfDirty。
  scheduler() { count.notified.A++; runA.effect.runIfDirty() }
})
const runB = effect(() => { count.ran.B++; tab.value ? n.value : m.value }, {
  scheduler() { count.notified.B++; runB.effect.runIfDirty() }
})

const depNames = new Map<any, string>([
  [(n as any).dep, 'n'], [(m as any).dep, 'm'], [(tab as any).dep, 'tab'], [(parity as any).dep, 'parity']
])
const subNames = new Map<any, string>([
  [parity, 'parity'], [runA.effect, '渲染 A'], [runB.effect, '渲染 B']
])

interface Snap {
  deps: { name: string; version: number; subs: string[] }[]
  subs: { name: string; kind: string; chain: string[]; times: number }[]
  notified: { parity: number; A: number; B: number }
  recomputed: number
  ran: { A: number; B: number }
}

function snapshot(): Snap {
  const deps = [...depNames].map(([dep, name]) => {
    const subs: string[] = []
    for (let l = dep.subs; l; l = l.prevSub) subs.unshift(subNames.get(l.sub) || '?')
    return { name, version: dep.version as number, subs }
  })
  const chainOf = (sub: any) => {
    const chain: string[] = []
    for (let l = sub.deps; l; l = l.nextDep) chain.push((depNames.get(l.dep) || '?') + ' v' + l.version)
    return chain
  }
  return {
    deps,
    subs: [
      { name: '渲染 A', kind: 'effect', chain: chainOf(runA.effect), times: count.ran.A },
      { name: '渲染 B', kind: 'effect', chain: chainOf(runB.effect), times: count.ran.B },
      { name: 'parity', kind: 'computed', chain: chainOf(parity), times: count.recomputed }
    ],
    notified: { ...count.notified },
    recomputed: count.recomputed,
    ran: { ...count.ran }
  }
}

const cur = ref<Snap>(snapshot())
const last = ref<{ label: string; ver: string; notified: string; recomputed: string; ran: string } | null>(null)
const changedDeps = ref<string[]>([])

const none = '（没有）'
function act(label: string, fn: () => void) {
  const before = snapshot()
  fn()
  const after = snapshot()
  const ver: string[] = []
  after.deps.forEach((d, i) => {
    if (d.version !== before.deps[i].version) ver.push(d.name + ' ' + before.deps[i].version + ' → ' + d.version)
  })
  const notified: string[] = []
  if (after.notified.parity > before.notified.parity) notified.push('parity')
  if (after.notified.A > before.notified.A) notified.push('渲染 A')
  if (after.notified.B > before.notified.B) notified.push('渲染 B')
  const ran: string[] = []
  if (after.ran.A > before.ran.A) ran.push('渲染 A')
  if (after.ran.B > before.ran.B) ran.push('渲染 B')
  changedDeps.value = after.deps.filter((d, i) => d.version !== before.deps[i].version).map(d => d.name)
  last.value = {
    label,
    ver: ver.join('，') || none,
    notified: notified.join('、') || none,
    recomputed: after.recomputed > before.recomputed ? 'parity' : none,
    ran: ran.join('、') || none
  }
  cur.value = after
}
</script>

<template>
  <div class="row">
    <button class="b" @click="act('n + 1', () => n++)">n + 1</button>
    <button class="b" @click="act('n + 2', () => (n += 2))">n + 2</button>
    <button class="b" @click="act('n 设成相同的值', () => (n = n))">n 设成相同的值</button>
    <button class="b" @click="act('m + 1', () => m++)">m + 1</button>
    <button class="b" @click="act('切换 tab', () => (tab = !tab))">切换 tab</button>
  </div>
  <div class="cols">
    <div class="box">
      <span class="cap">三个订阅者的代码（省略了 .value）</span>
      <LabCode code="parity = computed(() => n % 2 ? '奇' : '偶')
渲染 A: effect(() => parity)
渲染 B: effect(() => tab ? n : m)" />
    </div>
    <div class="box" id="dgLast">
      <span class="cap">最近一次操作：{{ last ? last.label : '还没有操作' }}</span>
      <dl v-if="last" class="kv">
        <dt>version 变了</dt><dd>{{ last.ver }}</dd>
        <dt>被通知</dt><dd>{{ last.notified }}</dd>
        <dt>重新计算</dt><dd>{{ last.recomputed }}</dd>
        <dt>重新运行</dt><dd>{{ last.ran }}</dd>
      </dl>
      <div v-else class="cap">点上面的按钮，看这四行怎样变化。</div>
    </div>
  </div>
  <div class="cols">
    <div class="box">
      <span class="cap">Dep：version 和订阅者链</span>
      <table class="dg" id="dgDeps">
        <thead><tr><th>Dep</th><th>version</th><th>订阅者</th></tr></thead>
        <tbody>
          <tr v-for="d in cur.deps" :key="d.name" :class="{ chg: changedDeps.includes(d.name) }">
            <td>{{ d.name }}</td><td>{{ d.version }}</td><td>{{ d.subs.join('、') || '（无）' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="box">
      <span class="cap">订阅者：依赖链（读取顺序，v 是 Link 记下的 version）</span>
      <table class="dg" id="dgSubs">
        <thead><tr><th>订阅者</th><th>依赖链</th><th>次数</th></tr></thead>
        <tbody>
          <tr v-for="s in cur.subs" :key="s.name">
            <td>{{ s.name }}<span class="k">{{ s.kind === 'computed' ? '计算' : '运行' }}</span></td>
            <td>{{ s.chain.join(' → ') || '（无）' }}</td>
            <td>{{ s.times }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div class="cap">按下面的步骤操作：</div>
  <ol class="cap" style="margin: 0">
    <li>点「n + 2」：n 的 version 变了，parity 重新计算，但奇偶没变。渲染 A 被通知，却没有运行。</li>
    <li>点「n + 1」：parity 的值变了，parity 自己的 version 也加 1，渲染 A 运行。</li>
    <li>点「切换 tab」：看渲染 B 的依赖链从 tab、n 变成 tab、m。n 的订阅者里不再有渲染 B。</li>
  </ol>
</template>

<style scoped>
.dg { border-collapse: collapse; width: 100%; font-size: 13.5px; font-family: var(--f-mono); }
.dg th, .dg td { text-align: left; padding: 3px 8px 3px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
.dg th { color: var(--muted); font-weight: 600; }
.dg tr.chg td { color: var(--accent); font-weight: 700; }
.k { margin-left: 6px; font-size: 11.5px; color: var(--muted); }
</style>
