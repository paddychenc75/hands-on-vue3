<script setup lang="ts">
// 第二层：无渲染组件。不输出任何元素，只把状态和绑定对象通过作用域插槽交给使用者
import { useListbox, type ListboxOption } from './useListbox'

const props = defineProps<{ options: ListboxOption[]; orientation?: 'vertical' | 'horizontal' }>()
const model = defineModel<string | null>()
const emit = defineEmits<{ pick: [value: string] }>()

const lb = useListbox({
  options: () => props.options,
  modelValue: () => model.value ?? null, // 状态由 defineModel 持有，传 null 表示"受控，没选"，composable 不再有自己的一份
  onChange: v => { model.value = v; emit('pick', v) },
  orientation: props.orientation
})
</script>

<template>
  <slot
    :selected="lb.selected.value"
    :active="lb.active.value"
    :listboxProps="lb.listboxProps.value"
    :optionProps="lb.optionProps"
  />
</template>
