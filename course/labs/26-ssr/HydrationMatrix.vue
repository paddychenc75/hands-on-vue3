<script setup lang="ts">
// 实验台：水合对照表（旧版没有）。
// 对每一种差异，造一份“只有这一处不同”的服务器 HTML，用真实的 createSSRApp 水合，
// 再读出水合后的 DOM，判断 Vue 有没有把它改成客户端的值。
import { onMounted, ref } from 'vue'
import { createSSRApp } from 'vue'
import MatrixClient from './MatrixClient.vue'

const BASE = '<div class="card" lang="en" title="client" data-x="client" style="color: blue;"><h3>client</h3><ul data-n="client"><li>1</li><li>2</li></ul></div>'

interface Case {
  name: string
  server: string
  mutate: (html: string) => string
  read: (root: HTMLElement) => string
  /** 客户端想要的值（水合后读到它，就说明被修正了） */
  client: string
  /** 被替换还是复用，用来判断的节点 */
  node?: (root: HTMLElement) => Element | null
}

const cases: Case[] = [
  { name: 'class（静态）', server: 'class="card old"', mutate: h => h.replace('class="card"', 'class="card old"'), read: r => r.firstElementChild!.getAttribute('class') || '', client: 'card' },
  { name: 'style', server: 'style="color: red;"', mutate: h => h.replace('color: blue', 'color: red'), read: r => r.firstElementChild!.getAttribute('style') || '', client: 'color: blue;' },
  { name: '静态属性 lang="en"', server: 'lang="fr"', mutate: h => h.replace('lang="en"', 'lang="fr"'), read: r => r.firstElementChild!.getAttribute('lang') || '', client: 'en' },
  { name: '绑定属性 :title', server: 'title="server"', mutate: h => h.replace('title="client"', 'title="server"'), read: r => r.firstElementChild!.getAttribute('title') || '', client: 'client' },
  { name: '绑定属性 :data-x', server: 'data-x="server"', mutate: h => h.replace('data-x="client"', 'data-x="server"'), read: r => r.firstElementChild!.getAttribute('data-x') || '', client: 'client' },
  { name: '文字', server: '<h3>server</h3>', mutate: h => h.replace('<h3>client</h3>', '<h3>server</h3>'), read: r => r.querySelector('h3')!.textContent || '', client: 'client' },
  { name: '多一个子节点', server: '3 个 li', mutate: h => h.replace('<li>2</li>', '<li>2</li><li>3</li>'), read: r => r.querySelectorAll('li').length + ' 个 li', client: '2 个 li' },
  { name: '少一个子节点', server: '1 个 li', mutate: h => h.replace('<li>2</li>', ''), read: r => r.querySelectorAll('li').length + ' 个 li', client: '2 个 li' },
  { name: '标签不同', server: '<h4>client</h4>', mutate: h => h.replace('<h3>client</h3>', '<h4>client</h4>').replace('</h3>', '</h4>'), read: r => r.querySelector('h3,h4')!.tagName.toLowerCase(), client: 'h3', node: r => r.querySelector('h4') }
]

interface Row { name: string; server: string; after: string; client: string; fixed: boolean; replaced: boolean | null }
const rows = ref<Row[]>([])
const host = ref<HTMLElement | null>(null)

function run() {
  const origErr = console.error
  const origWarn = console.warn
  const quiet = (orig: (...a: any[]) => void) => (...a: any[]) => { if (!String(a[0]).includes('ydration')) orig(...a) }
  console.error = quiet(origErr)
  console.warn = quiet(origWarn)
  const out: Row[] = []
  try {
    for (const c of cases) {
      const box = document.createElement('div')
      host.value!.appendChild(box)
      box.innerHTML = c.mutate(BASE)
      const before = c.node ? c.node(box) : null
      const app = createSSRApp(MatrixClient)
      app.mount(box)
      const after = c.read(box)
      out.push({
        name: c.name, server: c.server, after, client: c.client, fixed: after === c.client,
        replaced: c.node ? !box.contains(before) : null
      })
      app.unmount()
      box.remove()
    }
  } finally {
    console.error = origErr
    console.warn = origWarn
  }
  rows.value = out
}

onMounted(run)
</script>

<template>
  <div class="row"><button class="b pri" @click="run">重新水合全部 9 种情况</button></div>
  <div class="table-wrap">
    <table class="matrix">
      <thead><tr><th>差异</th><th>服务器</th><th>客户端想要</th><th>水合后</th><th>结果</th></tr></thead>
      <tbody>
        <tr v-for="r in rows" :key="r.name" :class="r.fixed ? 'fixed' : 'kept'">
          <td>{{ r.name }}</td>
          <td><code>{{ r.server }}</code></td>
          <td><code>{{ r.client }}</code></td>
          <td><code>{{ r.after }}</code></td>
          <td>{{ r.replaced ? '元素被替换成客户端的' : r.fixed ? '改成了客户端的值' : '保留服务器的值' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div ref="host" hidden></div>
</template>

<style scoped>
.table-wrap { overflow-x: auto; }
.matrix { border-collapse: collapse; font-size: 14px; width: 100%; }
.matrix th, .matrix td { border: 1px solid var(--line); padding: 4px 8px; text-align: left; }
.matrix td:last-child { white-space: nowrap; }
.matrix tr.kept td:last-child { color: var(--warn); font-weight: 600; }
.matrix tr.fixed td:last-child { color: var(--accent); font-weight: 600; }
</style>
