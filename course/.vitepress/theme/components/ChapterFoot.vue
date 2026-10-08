<script setup lang="ts">
// 章末的“掌握标准”条，放在上一章/下一章链接的上方。
// 完成标准：章内自测全部答对 + 本章练习全部通过（规则在 course/engine/logic/completion.ts）。
// 达到标准后自动标记完成，没有手动按钮。条里列出还差什么；借助答案完成的练习单独标注。
import { computed, onMounted } from 'vue'
import { useData } from 'vitepress'
import { exercises } from '../../../exercises'
import { completionNeeds, exMissing, helpedExercises, scMissing } from '../../../engine/logic/completion'
import { chapterById, chapterState, cpOf, ensureReady, ready, specOf, STATE_LABEL } from '../composables/learn'

const { frontmatter } = useData()
const id = computed(() => frontmatter.value.id as string)
const meta = computed(() => chapterById(id.value))
const show = computed(() => !!meta.value && meta.value.stage != null)
const live = computed(() => ready.value && show.value)
const spec = computed(() => (meta.value ? specOf(meta.value) : { id: '', scAnswers: [], exercises: [] }))
// 注意：引擎的进度对象是原地修改的，所以不要把 cpOf 的结果缓存在 computed 里（引用不变，下游不会重算）。
// 每个 computed 里都直接调用 cp()，它会登记对进度版本号的依赖。
const cp = () => (live.value ? cpOf(id.value) : undefined)
const state = computed(() => (live.value ? chapterState(id.value) : 'todo'))
const done = computed(() => state.value === 'done')

const exTitle = (x: string) => exercises[x]?.title ?? x
const needs = computed(() => (live.value ? completionNeeds(cp(), spec.value) : { sc: 0, ex: 0 }))
/** 还差什么：每条一行 */
const todo = computed(() => {
  if (!live.value || done.value) return []
  const a: string[] = []
  const sc = scMissing(cp(), spec.value)
  if (sc.length) a.push(`自测还有 ${needs.value.sc} 道没答对：第 ${sc.map(i => i + 1).join('、')} 题`)
  const ex = exMissing(cp(), spec.value)
  if (ex.length) a.push(`练习还有 ${needs.value.ex} 道没通过：${ex.map(x => '「' + exTitle(x) + '」').join('、')}`)
  return a
})
/** 借助答案完成的练习 */
const helped = computed(() => (live.value ? helpedExercises(cp(), spec.value) : []))
/** 自测首答答对数，只在每道题都答过时显示 */
const firstOk = computed(() => {
  const total = spec.value.scAnswers.length
  const first = cp()?.first ?? {}
  const tried = Object.keys(cp()?.tried ?? {}).length
  return live.value && total && tried === total ? { ok: Object.values(first).filter(Boolean).length, total } : null
})

onMounted(ensureReady)
</script>

<template>
  <div v-if="show" class="chapter-foot" :data-state="state">
    <strong class="cf-state">{{ !live ? '掌握标准' : done ? '✓ 本章已完成' : '掌握标准' }}</strong>
    <span class="cap cf-detail">章内自测全部答对，本章练习全部通过，就算完成。达到后自动标记。<template v-if="live && !done">当前：{{ STATE_LABEL[state] }}。</template></span>
    <ul v-if="todo.length" class="cf-need">
      <li v-for="t in todo" :key="t">{{ t }}</li>
    </ul>
    <p v-if="done && firstOk" class="cap cf-note">自测首次作答答对 {{ firstOk.ok }}/{{ firstOk.total }}。</p>
    <p v-if="helped.length" class="cap cf-note cf-help">
      借助了参考答案：{{ helped.map(x => '「' + exTitle(x) + '」').join('、') }}。过几天不看答案再写一遍，记得更牢。
    </p>
  </div>
</template>
