<script setup lang="ts">
// 实验台：runtime-dom 的 patchProp 怎样决定“设为 DOM 属性”还是“设为 attribute”。
// 直接调用 vue 导出的真实 patchProp，再用访问器和 setAttribute 的包装记录它走了哪条路。
import { computed, ref } from 'vue'
import { patchProp } from 'vue'

const presets: { name: string; tag: string; key: string; value: string }[] = [
  { name: 'div id', tag: 'div', key: 'id', value: 'box' },
  { name: 'div foo', tag: 'div', key: 'foo', value: 'x' },
  { name: 'div .foo（.prop）', tag: 'div', key: '.foo', value: 'x' },
  { name: 'div ^title（.attr）', tag: 'div', key: '^title', value: 'tip' },
  { name: 'input value', tag: 'input', key: 'value', value: 'abc' },
  { name: 'input list', tag: 'input', key: 'list', value: 'dl' },
  { name: 'img width', tag: 'img', key: 'width', value: '50%' },
  { name: 'div tabindex', tag: 'div', key: 'tabindex', value: '1' },
  { name: 'div tabIndex', tag: 'div', key: 'tabIndex', value: '1' },
  { name: 'button disabled', tag: 'button', key: 'disabled', value: '' },
  { name: 'div class', tag: 'div', key: 'class', value: 'a b' },
  { name: 'div onClick', tag: 'div', key: 'onClick', value: 'fn' }
]
const tags = ['div', 'input', 'img', 'textarea', 'button', 'a', 'video']
const tag = ref('div')
const key = ref('id')
const value = ref('box')
const out = ref({ route: '', html: '', prop: '' })

function run() {
  const el = document.createElement(tag.value) as any
  const events: string[] = []
  const origSet = el.setAttribute.bind(el)
  el.setAttribute = (k: string, v: string) => { events.push('attribute'); origSet(k, v) }
  const k = key.value.replace(/^[.^]/, '')
  if (k in el && !Object.prototype.hasOwnProperty.call(el, k)) {
    let desc: PropertyDescriptor | undefined
    let proto = el
    while (proto && !(desc = Object.getOwnPropertyDescriptor(proto, k))) proto = Object.getPrototypeOf(proto)
    if (desc && desc.set) {
      const d = desc
      Object.defineProperty(el, k, { configurable: true, get() { return d.get!.call(this) }, set(v) { events.push('DOM 属性'); d.set!.call(this, v) } })
    }
  }
  let v: any = value.value
  const isOn = /^on[A-Z]/.test(key.value)
  if (isOn) v = () => {}
  patchProp(el, key.value, null, v)
  // 元素上本来没有的属性（例如 .foo）：赋值之后才出现，访问器记录不到，这里补上
  if (!events.length && !(k in Object.getPrototypeOf(el)) && Object.prototype.hasOwnProperty.call(el, k)) events.push('DOM 属性')
  const route = key.value === 'class' ? '专用函数 patchClass' : key.value === 'style' ? '专用函数 patchStyle' : isOn ? '事件：patchEvent（invoker）' : [...new Set(events)].join(' + ') || '什么也没设置'
  out.value = { route, html: el.outerHTML, prop: k in el ? String(el[k]) : '（元素上没有这个属性）' }
}
function apply(i: number) { const p = presets[i]; tag.value = p.tag; key.value = p.key; value.value = p.value; run() }
const note = computed(() => (key.value[0] === '.' ? '以 . 开头：强制设为 DOM 属性' : key.value[0] === '^' ? '以 ^ 开头：强制设为 attribute' : ''))
run()
</script>

<template>
  <div class="row pp-presets">
    <button v-for="(p, i) in presets" :key="p.name" class="b" @click="apply(i)">{{ p.name }}</button>
  </div>
  <div class="row">
    <label class="ctl">标签
      <select class="t" v-model="tag" aria-label="标签">
        <option v-for="t in tags" :key="t" :value="t">{{ t }}</option>
      </select>
    </label>
    <label class="ctl">key <input class="t" v-model="key" aria-label="key" spellcheck="false" style="width: 8em"></label>
    <label class="ctl">值 <input class="t" v-model="value" aria-label="值" spellcheck="false" style="width: 8em"></label>
    <button class="b pri" @click="run">patchProp(el, key, null, 值)</button>
  </div>
  <div class="domview pp-out">{{ [
    '走的路：' + out.route + (note ? '（' + note + '）' : ''),
    '元素：' + out.html,
    '读回 el.' + key.replace(/^[.^]/, '') + '：' + out.prop
  ].join('\n') }}</div>
</template>

<style scoped>
.pp-presets { flex-wrap: wrap; }
</style>
