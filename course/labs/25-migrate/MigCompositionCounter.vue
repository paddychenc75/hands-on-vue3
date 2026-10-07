<script setup lang="ts">
// 组合式 API 写的计数器
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'

const props = defineProps({ start: { type: Number, default: 0 } })
const emit = defineEmits<{ (e: 'change', kind: string, v: number): void; (e: 'mounted', msg: string): void }>()

const count = ref(props.start)
const double = computed(() => count.value * 2)
watch(count, v => emit('change', '组合式', v))
function inc() {
  count.value++
}
const btn = useTemplateRef<HTMLElement>('btn')
onMounted(() => emit('mounted', '组合式：onMounted 运行。btn.value 是 <' + btn.value!.tagName.toLowerCase() + '>'))
</script>

<template>
  <div class="box"><span class="cap">组合式 API</span><p style="margin: 0">count = <b>{{ count }}</b>，double = {{ double }}</p><button class="b" ref="btn" @click="inc">+1</button></div>
</template>
