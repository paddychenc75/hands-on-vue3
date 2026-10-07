<script setup lang="ts">
// 实验台：逐步运行 diff（旧版 #lab-diff）。算法在 simulate.ts，这里只管界面。
import { ref, computed, watch, nextTick } from 'vue'
import { simulate, type Sim } from './simulate'

const presets: [string, string, string][] = [
  ['中间乱序（经典例子）', 'a b c d e f g', 'a b e c d h f g'],
  ['列表反转', 'a b c d e', 'e d c b a'],
  ['头部插入', 'b c d', 'a b c d'],
  ['尾部删除', 'a b c d e', 'a b c'],
  ['一个元素移到最前', 'a b c d e f', 'f a b c d e'],
  ['混合：增删移', 'a b c d e f g h', 'a c x e b g y h']
]
const preset = ref(0)
const oldText = ref(presets[0][1])
const newText = ref(presets[0][2])
const cur = ref(0)
const opsEl = ref<HTMLElement | null>(null)

const parse = (s: string) => s.trim().split(/\s+/).filter(Boolean)
const c1 = computed(() => parse(oldText.value))
const c2 = computed(() => parse(newText.value))
const dup = (a: string[]) => a.length !== new Set(a).size
const err = computed(() => {
  if (dup(c1.value) || dup(c2.value)) return '同一列表中的 key 必须唯一。'
  if (c1.value.length > 16 || c2.value.length > 16) return '每个列表最多 16 个 key。'
  return ''
})
const sim = computed<Sim>(() => err.value ? { steps: [], info: {} } : simulate(c1.value, c2.value))
// 输入变了就回到第 0 步（旧版每次 load 都重置）
watch([oldText, newText], () => { cur.value = 0 })

const states = computed(() => {
  const oldState: Record<string, string> = {}, newState: Record<string, string> = {}
  sim.value.steps.slice(0, cur.value).forEach(s => {
    if (s.op === 'unmount') oldState[s.key] = 'unmount'
    else if (s.op === 'patch') { oldState[s.key] = oldState[s.key] || 'patch'; newState[s.key] = newState[s.key] || 'patch' }
    else if (s.op === 'stay') { oldState[s.key] = 'patch'; newState[s.key] = 'patch' }
    else if (s.op === 'move') { oldState[s.key] = 'move'; newState[s.key] = 'move' }
    else if (s.op === 'mount') newState[s.key] = 'mount'
  })
  return { oldState, newState }
})
const curKey = computed(() => cur.value > 0 ? sim.value.steps[cur.value - 1].key : null)
const cnt = (op: string) => sim.value.steps.filter(s => s.op === op).length

function onPreset() {
  const p = presets[preset.value]
  oldText.value = p[1]
  newText.value = p[2]
}
const next = () => { if (cur.value < sim.value.steps.length) cur.value++ }
const prev = () => { if (cur.value > 0) cur.value-- }
const all = () => { cur.value = sim.value.steps.length }

watch(cur, async () => {
  await nextTick()
  const el = opsEl.value
  const curEl = el && el.querySelector<HTMLElement>('.cur')
  if (el && curEl) el.scrollTop = curEl.offsetTop - el.offsetTop - 60
})
</script>

<template>
  <div class="row">
    <label class="ctl">示例 <select class="t" v-model.number="preset" @change="onPreset">
      <option v-for="(p, i) in presets" :key="i" :value="i">{{ p[0] }}</option>
    </select></label>
  </div>
  <div class="cols">
    <label class="ctl" style="flex-direction:column;align-items:stretch">旧列表（key 用空格分开）<input class="t" v-model="oldText" id="dfOld"></label>
    <label class="ctl" style="flex-direction:column;align-items:stretch">新列表<input class="t" v-model="newText" id="dfNew"></label>
  </div>
  <div class="cap">{{ err }}</div>
  <div><span class="cap">旧子节点</span>
    <div class="keys"><div v-for="(k, idx) in c1" :key="idx" class="kbox" :class="[states.oldState[k], { cur: k === curKey }]">{{ k }}<sub>{{ idx }}</sub></div></div>
  </div>
  <div><span class="cap">新子节点</span>
    <div class="keys"><div v-for="(k, idx) in c2" :key="idx" class="kbox" :class="[states.newState[k], { cur: k === curKey }]">{{ k }}<sub>{{ idx }}</sub></div></div>
  </div>
  <div class="legend">
    <span><i style="border-color:var(--accent);background:var(--accent-soft)"></i>patch，不移动</span>
    <span><i style="border-color:var(--warn);background:var(--warn-soft)"></i>移动</span>
    <span><i style="border-color:var(--info);background:var(--info-soft)"></i>挂载</span>
    <span><i style="border-color:var(--bad);background:var(--bad-soft)"></i>卸载</span>
  </div>
  <dl class="kv">
    <template v-if="sim.info.range">
      <dt>乱序区间</dt><dd>{{ sim.info.range }}</dd>
      <dt>newIndexToOldIndex</dt><dd>{{ sim.info.n2o }}</dd>
      <dt>最长递增子序列</dt><dd>{{ sim.info.lis }}</dd>
    </template>
    <template v-else><dt>乱序区间</dt><dd>无（头尾同步后已处理完）</dd></template>
    <dt>DOM 操作总计</dt><dd>移动 {{ cnt('move') }} · 新建 {{ cnt('mount') }} · 删除 {{ cnt('unmount') }}</dd>
  </dl>
  <div class="row">
    <button class="b" :disabled="cur === 0" @click="prev">上一步</button>
    <button class="b pri" :disabled="cur >= sim.steps.length" @click="next">下一步</button>
    <button class="b" @click="all">运行全部</button>
    <span class="cap">第 {{ cur }} / {{ sim.steps.length }} 步</span>
  </div>
  <div class="ops" ref="opsEl">
    <div v-for="(s, idx) in sim.steps" :key="idx" :class="{ cur: idx === cur - 1 }" :style="idx >= cur ? 'opacity:.45' : undefined">{{ idx + 1 }}. [{{ s.phase }}] {{ s.text }}</div>
  </div>
</template>
