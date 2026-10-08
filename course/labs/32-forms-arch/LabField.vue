<script setup lang="ts">
// 字段组件：把 useField 的结果接到输入控件上。标签、错误提示、无障碍属性都在这里，控件本身不用管。
import { computed, useId } from 'vue'
import { useField } from './formKit'
import { useRenderCount } from './renderCount'
import TextInput from './TextInput.vue'
import SelectInput from './SelectInput.vue'

const props = defineProps<{
  name: string
  label: string
  as?: 'text' | 'select'
  options?: { value: string; label: string }[]
  rules?: ((v: any, all: any) => string)[]
  asyncRules?: ((v: any, all: any, signal: AbortSignal) => Promise<string>)[]
  delay?: number
  clearOnUnmount?: boolean
}>()

const { value, error, validating, onBlur, setEl } = useField(() => props.name, {
  rules: props.rules,
  asyncRules: props.asyncRules,
  delay: () => props.delay ?? 0,
  clearOnUnmount: props.clearOnUnmount
})
const id = useId()
const control = computed(() => (props.as === 'select' ? SelectInput : TextInput))
const badge = useRenderCount()
</script>

<template>
  <div class="lf">
    <label :for="id">{{ label }} <small class="cnt" :title="'这个字段组件更新的次数'">更新 <b ref="badge" :data-count="name">0</b> 次</small></label>
    <component
      :is="control" :id="id" :ref="setEl" v-model="value" :options="options" autocomplete="off"
      :aria-invalid="!!error" :aria-describedby="error ? id + '-err' : undefined" @blur="onBlur"
    />
    <span v-if="validating" class="st">检查中…</span>
    <span v-else-if="error" :id="id + '-err'" class="er">{{ error }}</span>
  </div>
</template>

<style scoped>
.lf { display: flex; flex-direction: column; gap: 2px; min-width: 0; margin-bottom: 6px; }
.lf label { font-size: 13.5px; }
.cnt { color: var(--muted); font-size: 12px; margin-left: 6px; }
.cnt b { color: var(--accent); font-family: var(--f-mono); }
.lf :deep(input), .lf :deep(select) { font: inherit; font-size: 14px; padding: 4px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); color: var(--ink); min-width: 0; width: 100%; box-sizing: border-box; }
.lf :deep([aria-invalid='true']) { border-color: var(--bad); }
.er { color: var(--bad); font-size: 12.5px; }
.st { color: var(--muted); font-size: 12.5px; }
</style>
