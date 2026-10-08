<script setup lang="ts">
// 目标里的一条。checks="sc:0,sc:1,ex:counter"：
//   sc:N  本章第 N 道自测（从 0 起）答对（答错或没答都不算）
//   ex:id 练习通过（借助答案通过的也算通过，章末的“掌握标准”条会另外标注）
// 题数标签（自测 N 题 · 练习 M 道）由 checks 自动算出。
import { computed, onMounted } from 'vue'
import { useData } from 'vitepress'
import { chapterById, cpOf, ensureReady, ready } from '../composables/learn'

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
  if (!ready.value || !parts.value.length) return false
  const id = frontmatter.value.id as string
  const cp = cpOf(id)
  const answers = chapterById(id)?.scAnswers ?? []
  return parts.value.every(([t, v]) => {
    if (t === 'ex') return !!cp?.ex[v]?.passed
    const n = Number(v)
    return answers[n] != null && cp?.sc[n] === answers[n]
  })
})

onMounted(ensureReady)
</script>

<template>
  <span class="goal-item" :class="{ met }"><slot /> <span v-if="tag" class="gtag">{{ tag }}</span></span>
</template>
