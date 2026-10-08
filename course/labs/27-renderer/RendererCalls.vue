<script setup lang="ts">
// 实验台：记录调用的渲染器。
// 用真实的 createRenderer，nodeOps 把每次调用记进日志。选一个场景，看 runtime-core 按什么顺序调用了哪些函数。
import { computed, nextTick, ref } from 'vue'
import { Comment, createRenderer, createStaticVNode, defineComponent, Fragment, h, Teleport } from 'vue'

interface N { id: number; type: string; text?: string; props: Record<string, any>; children: N[]; parent: N | null }

let log: string[] = []
let seq = 0
const mk = (type: string, text?: string): N => ({ id: ++seq, type, text, props: {}, children: [], parent: null })
const label = (n: N | null | undefined) => (!n ? 'null' : n.type === '#text' ? 'text(' + JSON.stringify(n.text) + ')' : n.type === '#comment' ? 'comment' : '<' + n.type + '>')
const target = mk('target')

const renderer = createRenderer<N, N>({
  createElement(type) { log.push('createElement(' + type + ')'); return mk(type) },
  createText(text) { log.push('createText(' + JSON.stringify(text) + ')'); return mk('#text', text) },
  createComment(text) { log.push('createComment(' + JSON.stringify(text) + ')'); return mk('#comment', text) },
  setText(n, t) { log.push('setText(' + label(n) + ', ' + JSON.stringify(t) + ')'); n.text = t },
  setElementText(el, t) { log.push('setElementText(' + label(el) + ', ' + JSON.stringify(t) + ')'); el.children = t ? [mk('#text', t)] : [] },
  insert(c, p, a) {
    log.push('insert(' + label(c) + ', ' + label(p) + ', ' + (a ? label(a) : 'null') + ')')
    if (c.parent) c.parent.children.splice(c.parent.children.indexOf(c), 1)
    c.parent = p
    const i = a ? p.children.indexOf(a) : -1
    i > -1 ? p.children.splice(i, 0, c) : p.children.push(c)
  },
  remove(c) { log.push('remove(' + label(c) + ')'); if (c.parent) { c.parent.children.splice(c.parent.children.indexOf(c), 1); c.parent = null } },
  parentNode(n) { log.push('parentNode(' + label(n) + ')'); return n.parent },
  nextSibling(n) { log.push('nextSibling(' + label(n) + ')'); const s = n.parent ? n.parent.children : []; return s[s.indexOf(n) + 1] || null },
  patchProp(el, k, prev, next) { log.push('patchProp(' + label(el) + ', ' + k + ', ' + JSON.stringify(prev) + ', ' + JSON.stringify(next) + ')'); if (next == null) delete el.props[k]; else el.props[k] = next },
  setScopeId(el, id) { log.push('setScopeId(' + label(el) + ', ' + id + ')') },
  insertStaticContent(content, parent, anchor) {
    log.push('insertStaticContent(' + JSON.stringify(content) + ', ' + label(parent) + ', ' + (anchor ? label(anchor) : 'null') + ')')
    const s = mk('static-start'), e = mk('static-end')
    for (const n of [s, e]) { n.parent = parent; const i = anchor ? parent.children.indexOf(anchor) : -1; i > -1 ? parent.children.splice(i, 0, n) : parent.children.push(n) }
    return [s, e]
  },
  querySelector(sel) { log.push('querySelector(' + sel + ')'); return target }
})

const list = (keys: string[]) => h('ul', keys.map(k => h('li', { key: k }, k)))

interface Scenario { name: string; code: string; run: (root: N) => Promise<void> | void }
const scenarios: Scenario[] = [
  { name: '挂载一棵小树', code: "render(\n  h('div', { id: 'a', class: 'box' }, [\n    h('span', { title: 't' }, 'hello'),\n    h('p', null, [h('b', null, 'x'), 'tail'])\n  ]),\n  root\n)",
    run: root => { renderer.render(h('div', { id: 'a', class: 'box' }, [h('span', { title: 't' }, 'hello'), h('p', null, [h('b', null, 'x'), 'tail'])]), root) } },
  { name: '更新文字和属性', code: "// 先挂载 div#a.box > span 'hello'，再渲染：\nrender(h('div', { id: 'b' }, [h('span', null, 'world')]), root)\n// id 改了，class 被删，span 的文字改了",
    run: root => { renderer.render(h('div', { id: 'a', class: 'box' }, [h('span', null, 'hello')]), root); log = []; renderer.render(h('div', { id: 'b' }, [h('span', null, 'world')]), root) } },
  { name: '列表：在中间插入 b', code: "// a c  →  a b c（带 key）\nrender(list(['a', 'b', 'c']), root)",
    run: root => { renderer.render(list(['a', 'c']), root); log = []; renderer.render(list(['a', 'b', 'c']), root) } },
  { name: '列表：把 c 移到最前', code: "// a b c  →  c a b（带 key）\nrender(list(['c', 'a', 'b']), root)",
    run: root => { renderer.render(list(['a', 'b', 'c']), root); log = []; renderer.render(list(['c', 'a', 'b']), root) } },
  { name: '列表：删除 b', code: "// a b c  →  a c（带 key）\nrender(list(['a', 'c']), root)",
    run: root => { renderer.render(list(['a', 'b', 'c']), root); log = []; renderer.render(list(['a', 'c']), root) } },
  { name: '同一位置换了标签', code: "render(h('p', 'x'), root)\nrender(h('h1', 'x'), root)   // p 换成 h1",
    run: root => { renderer.render(h('p', 'x'), root); log = []; renderer.render(h('h1', 'x'), root) } },
  { name: 'Fragment 和注释', code: "render(\n  h('div', [h(Fragment, [h('i', 'a')]), h(Comment, 'note')]),\n  root\n)",
    run: root => { renderer.render(h('div', [h(Fragment, [h('i', 'a')]), h(Comment, 'note')]), root) } },
  { name: '组件重新渲染', code: "// 组件渲染 h('div', [text, h('b', 'k')])，text 从 't1' 改成 't2'",
    run: async root => {
      const text = ref('t1')
      const C = defineComponent({ render: () => h('div', [text.value, h('b', 'k')]) })
      renderer.render(h(C), root)
      log = []
      text.value = 't2'
      await nextTick()
    } },
  { name: 'scoped 样式的组件', code: "const C = defineComponent({\n  __scopeId: 'data-v-abc',\n  render: () => h('div', 'hi')\n})\nrender(h(C), root)",
    run: root => { renderer.render(h(defineComponent({ __scopeId: 'data-v-abc', render: () => h('div', 'hi') })), root) } },
  { name: '静态内容', code: "render(\n  h('div', [createStaticVNode('<b>1</b><b>2</b>', 2)]),\n  root\n)",
    run: root => { renderer.render(h('div', [createStaticVNode('<b>1</b><b>2</b>', 2)]), root) } },
  { name: 'Teleport 到选择器', code: "render(\n  h('div', [h(Teleport, { to: '#modal' }, [h('p', 'in')])]),\n  root\n)",
    run: root => { target.children = []; renderer.render(h('div', [h(Teleport, { to: '#modal' }, [h('p', 'in')])]), root) } },
  { name: '卸载', code: "render(h('div', [h('span', 'a'), h('span', 'b')]), root)\nrender(null, root)",
    run: root => { renderer.render(h('div', [h('span', 'a'), h('span', 'b')]), root); log = []; renderer.render(null, root) } }
]

const current = ref(0)
const lines = ref<string[]>([])
const running = ref(false)
const scen = computed(() => scenarios[current.value])

async function run() {
  if (running.value) return
  running.value = true
  const root = mk('root')
  log = []
  seq = 0
  try {
    await scen.value.run(root)
    await nextTick()
  } finally {
    lines.value = log.slice()
    log = []
    renderer.render(null, root)   // 清理，不计入日志
    log = []
    running.value = false
  }
}

const counts = computed(() => {
  const m = new Map<string, number>()
  for (const l of lines.value) { const k = l.slice(0, l.indexOf('(')); m.set(k, (m.get(k) || 0) + 1) }
  return [...m].map(([k, v]) => k + ' ×' + v).join('，')
})
const fn = (l: string) => l.slice(0, l.indexOf('('))
const rest = (l: string) => l.slice(l.indexOf('('))
function pick(i: number) { current.value = i; run() }
run()
</script>

<template>
  <div class="row calls-tabs">
    <button v-for="(s, i) in scenarios" :key="s.name" class="b" :class="{ on: current === i }" @click="pick(i)">{{ s.name }}</button>
  </div>
  <LabCode :code="scen.code" style="margin: 0" />
  <div class="calls-log" role="log" aria-label="nodeOps 调用日志">
    <div v-for="(l, i) in lines" :key="i" class="calls-line"><b class="calls-fn" :class="'fn-' + fn(l)">{{ fn(l) }}</b><span>{{ rest(l) }}</span></div>
    <div v-if="!lines.length" class="calls-line">没有任何 nodeOps 调用</div>
  </div>
  <div class="cap">共 {{ lines.length }} 次调用：{{ counts }}</div>
</template>

<style scoped>
.calls-tabs { flex-wrap: wrap; }
.calls-log { background: var(--sunken); border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; font-family: var(--vp-font-family-mono, monospace); font-size: 13px; max-height: 280px; overflow: auto; }
.calls-line { white-space: pre-wrap; word-break: break-all; }
.calls-fn { color: var(--accent); margin-right: 1px; }
.fn-parentNode, .fn-nextSibling { color: var(--warn); }
.fn-remove { color: var(--bad); }
</style>
