<script setup lang="ts">
// 状态面板的一行：只读自己这个路径的状态。
import { computed } from 'vue'
import { getPath, useFormContext } from './formKit'

const props = defineProps<{ path: string }>()
const form = useFormContext()!
const val = computed(() => {
  const v = getPath(form.values, props.path)
  return v === undefined ? '（空）' : JSON.stringify(v)
})
const touched = computed(() => !!form.touched[props.path])
const dirty = computed(() => form.isDirty(props.path))
const err = computed(() => form.errorOf(props.path))
const busy = computed(() => !!form.validating[props.path])
</script>

<template>
  <tr :data-row="path">
    <td class="p">{{ path }}</td>
    <td class="v">{{ val }}</td>
    <td data-k="touched">{{ touched ? '是' : '' }}</td>
    <td data-k="dirty">{{ dirty ? '是' : '' }}</td>
    <td data-k="error" class="e">{{ err }}</td>
    <td data-k="validating">{{ busy ? '是' : '' }}</td>
  </tr>
</template>
