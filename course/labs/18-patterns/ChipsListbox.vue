<script setup lang="ts">
// 第 1 层的使用方：直接调用 useListbox，标记全部自己写（横向的一排按钮）
import { useListbox, type ListboxOption } from './useListbox'

const props = defineProps<{ options: ListboxOption[]; modelValue?: string | null }>()
const emit = defineEmits<{ change: [value: string] }>()

const lb = useListbox({
  options: () => props.options,
  modelValue: () => props.modelValue, // undefined：非受控。其他值（含 null）：受控
  onChange: v => emit('change', v),
  orientation: 'horizontal'
})
</script>

<template>
  <div v-bind="lb.listboxProps.value" class="l1">
    <span v-for="(o, i) in options" :key="o.value" v-bind="lb.optionProps(i)" class="l1-opt">{{ o.label }}</span>
  </div>
</template>

<style scoped>
.l1 { display: flex; gap: 4px; flex-wrap: wrap; padding: 4px; border: 1px solid var(--line); border-radius: 8px; }
.l1:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.l1-opt { padding: 2px 10px; border-radius: 999px; border: 1px solid var(--line); font-size: 13px; cursor: pointer; }
.l1-opt[data-active] { border-color: var(--ink); }
.l1-opt[aria-selected='true'] { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
.l1-opt[aria-disabled='true'] { opacity: 0.45; text-decoration: line-through; cursor: not-allowed; }
</style>
