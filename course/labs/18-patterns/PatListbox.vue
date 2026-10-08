<script setup lang="ts">
// 实验台：同一个 useListbox 的三层实现并排，切换"谁持有状态"，观察键盘和焦点
import { computed, nextTick, ref } from 'vue'
import ListboxRoot from './ListboxRoot.vue'
import StyledSelect from './StyledSelect.vue'
import ChipsListbox from './ChipsListbox.vue'
import type { ListboxOption } from './useListbox'

const OPTIONS: ListboxOption[] = [
  { value: 'apple', label: '苹果' },
  { value: 'banana', label: '香蕉' },
  { value: 'cherry', label: '樱桃' },
  { value: 'durian', label: '榴莲', disabled: true },
  { value: 'grape', label: '葡萄' }
]
type Mode = 'free' | 'ctrl' | 'reject'
const mode = ref<Mode>('free')
const parent = ref<string | null>(null)
const log = ref<string[]>([])

function L(msg: string) { log.value = [msg, ...log.value].slice(0, 60) }
// 父组件对新值的处理。reject 模式下父组件不接受 cherry
function apply(layer: string, v: string) {
  if (mode.value === 'reject' && v === 'cherry') { L(`${layer} 请求选 ${v}，父组件拒绝，parent 仍是 ${parent.value ?? 'null'}`); return }
  parent.value = v
  L(`${layer} 请求选 ${v}，父组件接受，parent = ${v}`)
}
// 第 2、3 层的 v-model 绑定：free 模式不传，其余模式传值和监听
function bind(layer: string) {
  return mode.value === 'free' ? {} : { modelValue: parent.value, 'onUpdate:modelValue': (v: string) => apply(layer, v) }
}

function onKey(layer: string, e: KeyboardEvent) {
  const key = e.key === ' ' ? 'Space' : e.key
  nextTick(() => {
    const el = document.activeElement as HTMLElement | null
    const ad = el?.getAttribute('aria-activedescendant')
    const label = ad ? document.getElementById(ad)?.textContent?.trim() : null
    L(`${layer} 按 ${key}  焦点在 <${el?.tagName.toLowerCase()} role=${el?.getAttribute('role') ?? '无'}>  activedescendant → ${label ?? '无'}`)
  })
}
const parentText = computed(() => (mode.value === 'free' ? '（非受控，不使用）' : String(parent.value)))
</script>

<template>
  <div class="row">
    <label class="ctl"><input type="radio" v-model="mode" value="free" /> 非受控</label>
    <label class="ctl"><input type="radio" v-model="mode" value="ctrl" /> 受控</label>
    <label class="ctl"><input type="radio" v-model="mode" value="reject" /> 受控，父组件拒绝樱桃</label>
    <button class="b" type="button" @click="parent = 'apple'; L('父组件自己把 parent 改成 apple')">父组件选苹果</button>
  </div>
  <div class="cap" style="margin-top: 6px">父组件的 parent = <span class="pill g" data-t="parent">{{ parentText }}</span>。点列表获得焦点，再按方向键、Home、End、Enter、空格。</div>

  <div :key="mode" class="cols" style="margin-top: 8px">
    <div class="box" data-layer="L1" @keydown.capture="onKey('L1', $event)">
      <span class="cap">第 1 层：useListbox（自己写标记，横向）</span>
      <ChipsListbox :options="OPTIONS" :model-value="mode === 'free' ? undefined : parent"
        @change="v => (mode === 'free' ? L(`L1 非受控：内部选中 ${v}`) : apply('L1', v))" />
    </div>
    <div class="box" data-layer="L2" @keydown.capture="onKey('L2', $event)">
      <span class="cap">第 2 层：ListboxRoot（无渲染，作用域插槽）</span>
      <ListboxRoot v-bind="bind('L2')" :options="OPTIONS" v-slot="{ listboxProps, optionProps }">
        <ol v-bind="listboxProps" class="l2">
          <li v-for="(o, i) in OPTIONS" :key="o.value" v-bind="optionProps(i)" class="l2-opt">{{ i + 1 }}. {{ o.label }}</li>
        </ol>
      </ListboxRoot>
    </div>
    <div class="box" data-layer="L3" @keydown.capture="onKey('L3', $event)">
      <span class="cap">第 3 层：StyledSelect（带样式）</span>
      <StyledSelect v-bind="bind('L3')" :options="OPTIONS">
        <template #option="{ option, selected }">{{ selected ? '✓ ' : '' }}{{ option.label }}</template>
      </StyledSelect>
    </div>
  </div>
  <div class="log" style="margin-top: 8px"><div v-for="(m, i) in log" :key="log.length - i" class="m">{{ m }}</div></div>
</template>

<style scoped>
.l2 { margin: 0; padding: 4px; list-style: none; font-family: var(--f-mono); font-size: 13px; border-left: 3px solid var(--line); }
.l2:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.l2-opt { padding: 1px 8px; cursor: pointer; }
.l2-opt[data-active] { text-decoration: underline; }
.l2-opt[aria-selected='true'] { color: var(--accent); font-weight: 700; }
.l2-opt[aria-disabled='true'] { opacity: 0.45; text-decoration: line-through; cursor: not-allowed; }
</style>
