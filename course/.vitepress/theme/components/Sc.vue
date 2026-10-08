<script setup lang="ts">
// 自测题（章内），或实验台里的“先猜”题（加 predict）。
// 进度存在引擎里（course/engine/）：
//   普通题：序号 n = 本章第几道非先猜题（从 0 起，按页面顺序），记在这一章的 sc[n]（选中的选项下标）。
//     已有题只能在末尾追加，否则旧答案会错位。
//   先猜题：记在 __pred[实验台 id]（pick 是猜的选项，checked 为真表示已核对）。
// 章内自测的规则：
//   答对：标出正确项，显示解析。
//   答错：不亮正确答案，不显示解析。只标出选错的那一项，提示再试；点“再答一次”后，上次选错的那一项被隐藏。
//   只有第一次作答计入复习卡片和首答记录（engine 的 answerSelfCheck）。
import { computed, inject, onMounted, provide, ref } from 'vue'
import { useData } from 'vitepress'
import { answerSelfCheck } from '../../../engine/cards'
import { completeIfMet, cpOf, ensureReady, getPred, mutate, setPred } from '../composables/learn'
import { LabKey, ScKey } from '../composables/keys'

const props = defineProps<{ a: number; predict?: boolean }>()
const { frontmatter } = useData()
const lab = inject(LabKey, null)

const el = ref<HTMLElement>()
const picked = ref(-1)
const answered = ref(false)
const guessed = ref(false)
const wrong = ref(false)
const hidden = ref(-1)
let n = -1 // 章内序号（普通题）

const labId = () => (lab ? lab.id : '?')

function computeIndex(): number {
  const all = [...document.querySelectorAll('.vp-doc .sc:not(.predict)')]
  return all.indexOf(el.value!)
}

function optText(i: number) {
  const os = el.value ? el.value.querySelectorAll('.sc-o') : []
  return os[i] ? (os[i].textContent || '').trim() : ''
}

function reveal(i: number) {
  picked.value = i
  answered.value = true
  guessed.value = false
  wrong.value = false
  lab?.setPending(null)
}

function pick(i: number) {
  if (answered.value || wrong.value) return
  if (props.predict) {
    // 先猜：选择只记录猜测并打开实验台。点“核对我的猜测”才显示答案。
    setPred(labId(), { pick: i })
    startGuess(i)
    return
  }
  const ok = i === props.a
  picked.value = i
  hidden.value = -1
  if (ok) reveal(i)
  else wrong.value = true
  const id = frontmatter.value.id as string
  mutate(p => {
    answerSelfCheck(p, id, n, i, ok) // 只有第一次作答计入复习卡片和首答记录
    completeIfMet(p, id) // 自测全部答对、练习也通过时，自动标记本章完成
  })
}

/** 答错后点“再答一次”：隐藏上次选错的那一项，回到未作答 */
function retry() {
  hidden.value = picked.value
  picked.value = -1
  wrong.value = false
}

function startGuess(i: number) {
  picked.value = i
  guessed.value = true
  lab?.open()
  lab?.setPending({
    text: optText(i),
    check() {
      const gi = getPred(labId())?.pick ?? i
      reveal(gi)
      setPred(labId(), { pick: gi, checked: true })
      el.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  })
}

function skip() {
  lab?.open()
}

let nextOpt = 0
provide(ScKey, {
  registerOpt: () => nextOpt++,
  picked,
  answered,
  guessed,
  wrong,
  hidden,
  locked: computed(() => answered.value || wrong.value),
  correct: props.a,
  pick
})

onMounted(() => {
  ensureReady()
  if (props.predict) {
    const rec = getPred(labId())
    if (rec?.checked) {
      reveal(rec.pick)
      lab?.open()
    } else if (rec) startGuess(rec.pick)
    return
  }
  n = computeIndex()
  const saved = cpOf(frontmatter.value.id as string)?.sc[n]
  if (saved === props.a) reveal(saved)
  else if (saved != null) {
    // 上次答错了：回来时仍是“答错、等待重试”的样子
    picked.value = saved
    wrong.value = true
  }
})

const verdict = computed(() => {
  const i = picked.value
  if (i === props.a) return props.predict ? '你猜对了。' : '正确。'
  if (i < 0) return ''
  return props.predict ? '你猜的不对。' : '不对。'
})
</script>

<template>
  <div ref="el" class="sc" :class="{ predict, answered, guessed, wrong }">
    <slot />
    <button
      v-if="predict && !answered && !guessed"
      type="button"
      class="pr-skip"
      @click="skip"
    >跳过，直接打开实验台</button>
    <div v-if="wrong" class="sc-x no" role="status" tabindex="-1">
      <b>不对。</b>先别急着换选项。回到正文里和这道题相关的部分，想清楚你选的那一项错在哪，再答一次。
      <button type="button" class="sc-retry" @click="retry">再答一次</button>
    </div>
    <div v-if="answered" class="sc-x" role="status" tabindex="-1">
      <b>{{ verdict }}</b><slot name="explain" />
    </div>
  </div>
</template>
