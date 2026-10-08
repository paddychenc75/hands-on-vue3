<script setup lang="ts">
// 输入框和三个预设按钮。有 kw 属性时（提升到父组件的做法）走 props 和事件，否则用注入的数据源
import { computed, inject, onUpdated } from 'vue'
import { count, type Side, type Source } from './placeState'

const props = defineProps<{ side: Side; kw?: string }>()
const emit = defineEmits<{ set: [v: string, how: 'type' | 'pick'] }>()
const src = inject<Source | null>('placeSrc', null)
const value = computed(() => (props.kw !== undefined ? props.kw : src!.kw.value))
function set(v: string, how: 'type' | 'pick') {
  if (props.kw !== undefined) emit('set', v, how)
  else src!.set(v, how)
}
onUpdated(() => count(props.side, 'Filter'))
</script>

<template>
  <div class="row" style="gap: 4px">
    <input class="t" :value="value" placeholder="搜索标题" @input="set(($event.target as HTMLInputElement).value, 'type')" />
    <button v-for="w in ['vue', 'pinia', 'router']" :key="w" class="b" @click="set(w, 'pick')">{{ w }}</button>
  </div>
</template>
