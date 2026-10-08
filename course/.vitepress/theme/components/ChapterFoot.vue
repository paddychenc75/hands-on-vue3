<script setup lang="ts">
// 章末：本章完成状态和“标记为已完成/取消”按钮。放在上一章/下一章链接的上方。
// 自动完成的规则在 composables/progress.ts 的 autoDone（自测全部答过、练习全部通过）。
import { computed, onMounted } from 'vue'
import { useData } from 'vitepress'
import { markStoreReady, storeReady } from '../composables/store'
import { chapterById, chapterState, exProgress, isDone, nextDue, scProgress, setDone, STATE_LABEL } from '../composables/progress'

const { frontmatter } = useData()
const meta = computed(() => chapterById(frontmatter.value.id))
const show = computed(() => !!meta.value && meta.value.stage != null)
const ready = computed(() => storeReady.value && show.value)
const id = computed(() => frontmatter.value.id as string)
const state = computed(() => (ready.value ? chapterState(id.value) : 'todo'))
const done = computed(() => ready.value && isDone(id.value))
const sc = computed(() => (ready.value ? scProgress(id.value) : { answered: 0, total: 0 }))
const ex = computed(() => (ready.value ? exProgress(id.value) : { passed: 0, total: 0 }))
const due = computed(() => {
  const t = done.value ? nextDue(id.value) : null
  if (!t) return ''
  const d = new Date(t)
  return `下次复习：${d.getMonth() + 1} 月 ${d.getDate()} 日`
})
const detail = computed(() => {
  const a: string[] = []
  if (sc.value.total) a.push(`自测 ${sc.value.answered}/${sc.value.total} 题`)
  if (ex.value.total) a.push(`练习 ${ex.value.passed}/${ex.value.total} 道`)
  if (due.value) a.push(due.value)
  return a.join(' · ')
})

onMounted(markStoreReady)
</script>

<template>
  <div v-if="show" class="chapter-foot" :data-state="state">
    <div class="cf-txt">
      <strong class="cf-state">本章状态：{{ ready ? STATE_LABEL[state] : '…' }}</strong>
      <span v-if="ready && detail" class="cap cf-detail">{{ detail }}</span>
    </div>
    <button
      type="button"
      class="done-btn"
      :aria-pressed="done ? 'true' : 'false'"
      :disabled="!ready"
      @click="setDone(id, !done)"
    >{{ done ? '✓ 已完成（点击取消）' : '标记为已完成' }}</button>
  </div>
</template>
