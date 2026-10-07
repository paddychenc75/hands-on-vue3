<script setup lang="ts">
// 目标里的一条。checks="sc:0,sc:1,ex:counter"：
//   sc:N  本章第 N 道自测（从 0 起）答对
//   ex:id 练习通过（不含“看过答案后通过”）
// 题数标签（自测 N 题 · 练习 M 道）由 checks 自动算出。
import { computed, onMounted } from 'vue'
import { useData } from 'vitepress'
import { store, storeReady, markStoreReady } from '../composables/store'
import { scRegistry } from '../composables/registry'

const props = defineProps<{ checks?: string }>()
const { frontmatter } = useData()

const parts = computed(() =>
  (props.checks || '').split(',').map(s => s.trim()).filter(Boolean).map(c => {
    const i = c.indexOf(':')
    return [c.slice(0, i), c.slice(i + 1)] as [string, string]
  })
)
const nSc = computed(() => parts.value.filter(([t]) => t === 'sc').length)
const nEx = computed(() => parts.value.filter(([t]) => t === 'ex').length)
const tag = computed(() => {
  const a: string[] = []
  if (nSc.value) a.push(`自测 ${nSc.value} 题`)
  if (nEx.value) a.push(`练习 ${nEx.value} 道`)
  return a.join(' · ')
})

const met = computed(() => {
  if (!storeReady.value || !parts.value.length) return false
  const ans = store.get<Record<string, number>>('sc', {})
  const ex = store.get<Record<string, unknown>>('ex', {})
  return parts.value.every(([t, v]) => {
    if (t === 'ex') return ex[v] === true
    const k = frontmatter.value.id + ':' + v
    return k in scRegistry && ans[k] === scRegistry[k]
  })
})

onMounted(markStoreReady)
</script>

<template>
  <span class="goal-item" :class="{ met }"><slot /> <span v-if="tag" class="gtag">{{ tag }}</span></span>
</template>
