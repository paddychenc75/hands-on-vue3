<script setup lang="ts">
// 实验台：两份 Vue。页面自己的 Vue 是“应用”的 Vue；“库”的组合式函数要么用同一份 Vue（external），
// 要么用动态载入的第二份 Vue（vue.esm-browser.js，相当于库把 Vue 打包进了自己）。
import { createApp, h, onBeforeUnmount, onMounted, provide, reactive, ref, computed, inject, watch, nextTick } from 'vue'

const mode = ref<'shared' | 'bundled'>('shared')
const ready = ref(false)
const failed = ref('')
const host = ref<HTMLElement | null>(null)
let V2: any = null
let app: any = null
const seq = ref(0)

// 库里的三个组合式函数。参数 Vx 是“库用的那份 Vue”。
function makeLib(Vx: any) {
  return {
    useTheme: () => Vx.inject('theme', 'none'),
    useCounter: () => {
      const n = Vx.ref(0)
      return { n, inc: () => { n.value++ } }
    },
    useDoubled: (source: any) => Vx.computed(() => source.value * 2),
    reactive: Vx.reactive
  }
}

function mountApp() {
  if (!host.value || !ready.value) return
  if (app) { try { app.unmount() } catch { /* ignore */ } app = null }
  host.value.innerHTML = ''
  const el = document.createElement('div')
  host.value.appendChild(el)
  const lib = makeLib(mode.value === 'shared' ? { inject, ref, computed, reactive } : V2)
  const row = (k: string, label: string, v: string) =>
    h('div', { class: 'tv-row' }, [h('span', { class: 'tv-k' }, label), h('b', { 'data-out': k }, v)])
  const Child = {
    setup() {
      const theme = lib.useTheme()
      const { n, inc } = lib.useCounter()
      const count = ref(1)
      const doubled = lib.useDoubled(count)
      const obj = {}
      const same = String(reactive(obj) === lib.reactive(obj))
      let realEl: HTMLElement | null = null
      const bump = () => { inc(); if (realEl) realEl.textContent = String(n.value) }
      return () => h('div', [
        row('theme', '库里 inject("theme") 读到', String(theme)),
        h('div', { class: 'tv-row' }, [
          h('span', { class: 'tv-k' }, '库的计数器：页面显示 / n.value 实际'),
          h('b', { 'data-out': 'n' }, String(n.value)), h('span', ' / '),
          h('b', { 'data-out': 'real', ref: (e: any) => { realEl = e } }, '0'),
          h('button', { type: 'button', class: 'b', 'data-act': 'inc', onClick: bump }, '库的计数 +1')
        ]),
        h('div', { class: 'tv-row' }, [
          h('span', { class: 'tv-k' }, '库的 computed 依赖应用的 count（count = ' + count.value + '）：翻倍'),
          h('b', { 'data-out': 'doubled' }, String(doubled.value)),
          h('button', { type: 'button', class: 'b', 'data-act': 'count', onClick: () => { count.value++ } }, '应用的 count +1')
        ]),
        row('same', '同一个对象，应用的 reactive(o) === 库的 reactive(o)', same)
      ])
    }
  }
  const Root = { setup() { provide('theme', 'dark'); return () => h(Child) } }
  app = createApp(Root)
  app.mount(el)
  seq.value++
}

watch(mode, async () => { await nextTick(); mountApp() })

onMounted(async () => {
  try {
    V2 = await import('vue/dist/vue.esm-browser.js')
  } catch (e: any) {
    failed.value = '载入第二份 Vue 失败：' + e.message
    return
  }
  ready.value = true
  await nextTick()
  mountApp()
})
onBeforeUnmount(() => { if (app) { try { app.unmount() } catch { /* ignore */ } } })
</script>

<template>
  <div v-if="failed" class="cap">{{ failed }}</div>
  <div v-else-if="!ready" class="cap">正在载入第二份 Vue……</div>
  <template v-else>
    <div class="row">
      <button type="button" class="b" data-mode="shared" :class="{ pri: mode === 'shared' }" @click="mode = 'shared'">库把 vue 外部化（页面上只有一份 Vue）</button>
      <button type="button" class="b" data-mode="bundled" :class="{ pri: mode === 'bundled' }" @click="mode = 'bundled'">库把 vue 打进了自己（页面上有两份 Vue）</button>
    </div>
    <div class="box tv-host" style="margin-top:8px"><span class="cap">应用（用的是页面自己的 Vue）</span><div ref="host" :data-seq="seq"></div></div>
    <p class="cap" style="margin-top:6px">先点“库的计数 +1”两次，再点“应用的 count +1”。注意：第二个按钮会让应用重新渲染，这时库的计数器才可能显示出新值。</p>
  </template>
</template>

<style scoped>
.tv-host :deep(.tv-row) { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 6px 0; }
.tv-host :deep(.tv-k) { color: var(--muted); font-size: 13px; }
</style>
