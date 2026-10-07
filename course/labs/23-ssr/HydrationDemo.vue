<script setup lang="ts">
// 实验台：真实的水合（旧版 #demo-ssr）
// 先把“服务器 HTML”放进容器，再用 createSSRApp(HydrateClient).mount(容器) 真正水合，
// 最后统计服务器的 DOM 节点有多少被复用、多少被替换。
import { onBeforeUnmount, ref } from 'vue'
import { createSSRApp, type App } from 'vue'
import HydrateClient from './HydrateClient.vue'

const GOOD = '<div><h3>你好，水合</h3><button>点击 0</button></div>'
const presets = [
  ['与服务器输出一致', GOOD],
  ['文字不匹配', '<div><h3>服务器上的旧标题</h3><button>点击 0</button></div>'],
  ['结构不匹配', '<div><h4>你好，水合</h4><button>点击 0</button></div>']
]
const code = "// 客户端组件\ncreateSSRApp({\n  setup: () => ({ title: '你好，水合', n: ref(0) }),\n  template: '<div><h3>{{ title }}</h3><button @click=\"n++\">点击 {{ n }}</button></div>'\n}).mount(container)"

const preset = ref(0)
const src = ref(GOOD)
const box = ref<HTMLElement | null>(null)
const report = ref('先点击“1. 放入服务器 HTML”。然后点击按钮“点击 0”：它没有反应，因为还没有事件监听。')

let app: App | null = null
let before: Node[] = []

const desc = (n: Node) => (n.nodeType === 3 ? '文字 "' + n.textContent + '"' : '<' + n.nodeName.toLowerCase() + '>')

function put() {
  const el = box.value!
  if (app) {
    try { app.unmount() } catch (e) { /* 忽略 */ }
    app = null
  }
  el.innerHTML = src.value
  before = []
  const w = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  while (w.nextNode()) before.push(w.currentNode)
  report.value = '已放入服务器 HTML，共 ' + before.length + ' 个节点。现在点击“点击 0”没有反应。然后点击“2. 水合”。'
}

function hydrate() {
  const el = box.value!
  if (!before.length || app) put()
  const htmlBefore = el.innerHTML
  const origErr = console.error
  const origWarn = console.warn
  let mism = false
  // 开发版的 Vue 用 console.warn 报告不匹配；生产版不报告，所以下面再用 HTML 有没有变化补一道判断
  console.error = (...a: any[]) => { if (String(a[0]).includes('ydration')) mism = true; else origErr(...a) }
  console.warn = (...a: any[]) => { if (String(a[0]).includes('ydration')) mism = true; else origWarn(...a) }
  try {
    app = createSSRApp(HydrateClient)
    app.mount(el)
  } catch (e: any) {
    report.value = '错误：' + e.message
    return
  } finally {
    console.error = origErr
    console.warn = origWarn
  }
  if (el.innerHTML !== htmlBefore) mism = true
  const lines = before.map(n => (el.contains(n) ? '复用  ' : '替换  ') + desc(n))
  const reused = before.filter(n => el.contains(n)).length
  report.value =
    '水合完成。服务器的 ' + before.length + ' 个节点中，复用 ' + reused + ' 个，替换 ' + (before.length - reused) + ' 个。' +
    (mism ? 'Vue 报告了不匹配。' : '') + '\n' + lines.join('\n') + '\n\n现在点击“点击 0”，计数会增加。'
}

function onPreset() {
  src.value = presets[preset.value][1]
  put()
}

onBeforeUnmount(() => {
  if (app) { try { app.unmount() } catch (e) { /* 忽略 */ } }
})
</script>

<template>
  <div class="row">
    <label class="ctl">服务器 HTML
      <select class="t" v-model.number="preset" @change="onPreset">
        <option v-for="(p, i) in presets" :key="i" :value="i">{{ p[0] }}</option>
      </select>
    </label>
  </div>
  <textarea class="t" v-model="src" spellcheck="false" style="min-height: 60px" aria-label="服务器 HTML"></textarea>
  <LabCode :code="code" style="margin: 0" />
  <div class="row">
    <button class="b" @click="put">1. 放入服务器 HTML</button>
    <button class="b pri" @click="hydrate">2. 水合</button>
  </div>
  <div class="box"><span class="cap">容器（页面上的真实 DOM）</span><div ref="box" style="min-height: 60px"></div></div>
  <div class="domview">{{ report }}</div>
</template>
