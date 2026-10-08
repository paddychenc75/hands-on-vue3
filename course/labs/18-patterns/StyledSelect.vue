<script setup lang="ts">
// 第三层：带样式的组件。行为全部来自下层，这里只加外观，和一个 #option 插槽
import ListboxRoot from './ListboxRoot.vue'
import type { ListboxOption } from './useListbox'

defineProps<{ options: ListboxOption[] }>()
const model = defineModel<string | null>()
</script>

<template>
  <ListboxRoot v-model="model" :options="options" v-slot="{ listboxProps, optionProps, selected }">
    <ul class="sel" v-bind="listboxProps">
      <li v-for="(o, i) in options" :key="o.value" class="sel-opt" v-bind="optionProps(i)">
        <slot name="option" :option="o" :selected="o.value === selected">{{ o.label }}</slot>
      </li>
    </ul>
  </ListboxRoot>
</template>

<style scoped>
.sel { list-style: none; margin: 0; padding: 4px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); }
.sel:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.sel-opt { padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 14px; }
.sel-opt[data-active] { background: var(--sunken); }
.sel-opt[aria-selected='true'] { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
.sel-opt[aria-disabled='true'] { opacity: 0.45; cursor: not-allowed; }
</style>
