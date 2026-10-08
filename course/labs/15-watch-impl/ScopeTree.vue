<script setup lang="ts">
// 实验台：组件卸载时，哪些侦听器被停止（读真实的 instance.scope）
import { onBeforeUnmount, reactive, ref } from 'vue'
import ScopeChild from './ScopeChild.vue'

interface Row { name: string; where: string; fires: number; atUnmount: number | null }

const show = ref(false)
const info = reactive({ known: false, active: true, effects: 0 })
const rows = reactive<Row[]>([])
const store = reactive({ src: 0, stopDetached: false, scopeRef: null as any })
// 子组件通过它把一行放进列表（延后一个微任务，避免在渲染期间改动正在渲染的数据）
function addRow(row: Row): Row {
  const r = reactive(row) as Row
  Promise.resolve().then(() => { rows.push(r) })
  return r
}

let timer: ReturnType<typeof setTimeout> | undefined
function snapshot() {
  const s = store.scopeRef
  if (!s) return
  info.known = true
  info.active = s.active
  info.effects = s.effects.length
}
function mount() {
  rows.length = 0
  info.known = false
  store.scopeRef = null
  show.value = true
  clearTimeout(timer)
  timer = setTimeout(snapshot, 500)
}
function unmount() {
  snapshot()
  rows.forEach(r => { r.atUnmount = r.fires })
  show.value = false
  setTimeout(snapshot, 0)
}
function bump() { store.src++ }
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="row">
    <button class="b pri" id="st-mount" :disabled="show" @click="mount">挂载子组件</button>
    <button class="b" id="st-unmount" :disabled="!show" @click="unmount">卸载子组件</button>
    <button class="b" id="st-bump" @click="bump">改 src（现在是 {{ store.src }}）</button>
    <label class="ctl"><input type="checkbox" id="st-detach" v-model="store.stopDetached" :disabled="show"> E 的作用域用 onScopeDispose 手动停止（下次挂载生效）</label>
  </div>
  <div class="st-box"><ScopeChild v-if="show" :store="store" :add-row="addRow" /><span v-else class="cap">（子组件未挂载）</span></div>
  <table class="st-tbl" id="st-rows">
    <thead><tr><th>侦听器</th><th>创建时的活动作用域</th><th>回调运行次数</th><th>卸载后新增</th></tr></thead>
    <tbody>
      <tr v-for="r in rows" :key="r.name" :class="{ leak: r.atUnmount !== null && r.fires > r.atUnmount }">
        <td>{{ r.name }}</td>
        <td>{{ r.where }}</td>
        <td>{{ r.fires }}</td>
        <td>{{ r.atUnmount === null ? '-' : r.fires - r.atUnmount }}<span v-if="r.atUnmount !== null && r.fires > r.atUnmount"> 仍在运行（泄漏）</span></td>
      </tr>
      <tr v-if="!rows.length"><td colspan="4" class="cap">点“挂载子组件”。C 在 300 毫秒后才创建。</td></tr>
    </tbody>
  </table>
  <div class="cap" id="st-info">
    <template v-if="info.known">组件的 <code>instance.scope</code>：<code>active = {{ info.active }}</code>，<code>effects.length = {{ info.effects }}</code>（含组件自己的渲染副作用函数，以及 A 和 B）。</template>
    <template v-else>挂载后显示组件 scope 的状态。</template>
  </div>
</template>

<style scoped>
.st-box { margin: 8px 0; min-height: 22px; }
.st-tbl { width: 100%; border-collapse: collapse; font-size: 14px; display: block; overflow-x: auto; }
.st-tbl th, .st-tbl td { border: 1px solid var(--line); padding: 5px 8px; text-align: left; white-space: nowrap; }
.st-tbl tr.leak td { background: var(--accent-soft); }
</style>
