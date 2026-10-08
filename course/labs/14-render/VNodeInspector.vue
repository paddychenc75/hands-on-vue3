<script setup lang="ts">
// 实验台:VNode 检查器。输入一个 h() 调用,显示真实 Vue 生成的 vnode:type、shapeFlag 的每一位、children 规范化后的样子。
import { computed, Comment, defineComponent, Fragment, h, ref, Suspense, Teleport, Text } from 'vue'

const Comp = defineComponent({ name: 'Comp', render: () => h('i') })
const Fn = () => h('b')

const PRESETS = [
  `h('div')`,
  `h('div', 'hi')`,
  `h('div', { id: 'a' }, [h('p'), 'text'])`,
  `h('div', h('p'))`,
  `h('div', null, 'a', 'b')`,
  `h(Comp, null, () => 'x')`,
  `h(Comp, null, { default: () => 'x', foot: () => 'y' })`,
  `h(Comp, null, [h('b')])`,
  `h(Fn)`,
  `h(Fragment, [h('a'), h('b')])`,
  `h(Text, 'plain')`,
  `h(Teleport, { to: 'body' }, [h('p')])`,
  `h('input', { key: 1, ref: 'box' })`
]

const FLAGS: [number, string][] = [
  [512, 'COMPONENT_KEPT_ALIVE'], [256, 'COMPONENT_SHOULD_KEEP_ALIVE'], [128, 'SUSPENSE'], [64, 'TELEPORT'],
  [32, 'SLOTS_CHILDREN'], [16, 'ARRAY_CHILDREN'], [8, 'TEXT_CHILDREN'], [4, 'STATEFUL_COMPONENT'],
  [2, 'FUNCTIONAL_COMPONENT'], [1, 'ELEMENT']
]

const code = ref(PRESETS[5])
const SYMBOLS = new Map<unknown, string>([[Fragment, 'Fragment'], [Text, 'Text'], [Comment, 'Comment'], [Teleport, 'Teleport'], [Suspense, 'Suspense']])

const result = computed(() => {
  try {
    const vnode: any = new Function('h', 'Fragment', 'Text', 'Comment', 'Teleport', 'Suspense', 'Comp', 'Fn', 'return (' + code.value + ')')(
      h, Fragment, Text, Comment, Teleport, Suspense, Comp, Fn
    )
    if (!vnode || typeof vnode !== 'object' || !vnode.__v_isVNode) return { error: '表达式没有返回 vnode。写成 h(...) 的形式' }
    const t = vnode.type
    const typeText = typeof t === 'string' ? `字符串 "${t}"(元素)`
      : SYMBOLS.has(t) ? SYMBOLS.get(t)! + '(内置类型)'
      : typeof t === 'function' ? '函数(函数式组件)'
      : '对象(有状态组件)'
    const c = vnode.children
    const childText = c == null ? 'null'
      : typeof c === 'string' ? `文本 "${c}"`
      : Array.isArray(c) ? `数组,${c.length} 项`
      : `插槽对象,键:${Object.keys(c).join('、')}`
    return {
      typeText, childText, flag: vnode.shapeFlag,
      key: vnode.key == null ? 'null' : JSON.stringify(vnode.key),
      ref: vnode.ref ? `{ r: ${JSON.stringify(vnode.ref.r)} }` : 'null',
      props: vnode.props ? JSON.stringify(vnode.props) : 'null',
      error: ''
    }
  } catch (e: any) {
    return { error: e.message }
  }
})
const on = (bit: number) => !!(result.value.flag! & bit)
</script>

<template>
  <div class="row"><button v-for="p in PRESETS" :key="p" class="b" :class="{ on: p === code }" @click="code = p">{{ p }}</button></div>
  <textarea class="t" v-model="code" rows="2" spellcheck="false" data-test="code" style="width: 100%; font-family: var(--f-mono); font-size: 13px"></textarea>
  <div class="cap">可用的名字:h、Fragment、Text、Comment、Teleport、Suspense,组件 Comp,函数式组件 Fn。</div>
  <div v-if="result.error" class="cap" data-test="error">{{ result.error }}</div>
  <div v-else class="kv" data-test="result">
    <div>type</div><div data-test="type">{{ result.typeText }}</div>
    <div>shapeFlag</div><div data-test="flag">{{ result.flag }}(二进制 {{ result.flag!.toString(2).padStart(10, '0') }})</div>
    <div>children</div><div data-test="children">{{ result.childText }}</div>
    <div>key</div><div>{{ result.key }}</div>
    <div>ref</div><div>{{ result.ref }}</div>
    <div>props</div><div>{{ result.props }}</div>
  </div>
  <div v-if="!result.error" class="row" data-test="bits">
    <span v-for="[bit, name] in FLAGS" :key="bit" class="pill" :class="{ g: on(bit) }">{{ bit }} {{ name }}</span>
  </div>
  <div class="cap">高亮的位相加就是 shapeFlag。type 决定类型位,children 的规范化再加上子节点位。</div>
</template>
