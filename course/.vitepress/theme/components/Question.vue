<script setup lang="ts">
// 一道选择题（课前热身、复习页、阶段测验共用）。题目来自复习卡片（CardItem，见 course/engine/cards.ts）。
// 三种作答方式（mode）：
//   reveal  选一次就显示对错和解析（复习页）
//   retry   和章内自测一致：答错不亮正确答案、不显示解析，提示再试；点“再答一次”后隐藏上次选错的那一项（课前热身）
//   defer   交卷模式：选一次只记下选择，等父组件把 revealed 设为 true，才统一显示对错和解析（阶段测验）
// 选项顺序在题目出现时随机打乱一次。选项字母按显示顺序排。
// answer 事件：oi 是选的选项在 item.options 里的下标，ok 是否答对，first 是不是这道题的第一次作答（热身只记第一次）。
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'
import type { CardItem } from '../../../engine/types'
import { shuffled } from '../../../engine/logic/random'
import { esc, fmtOpt } from '../../../engine/logic/text'
import { chapterById } from '../composables/learn'

const props = withDefaults(defineProps<{ item: CardItem; label: string; mode?: 'reveal' | 'retry' | 'defer'; revealed?: boolean; source?: boolean }>(), { mode: 'reveal', revealed: false, source: true })
const emit = defineEmits<{ answer: [oi: number, ok: boolean, first: boolean] }>()

const order = shuffled(props.item.options.length)
const chosen = ref(-1)
const hidden = ref(-1) // 重试时隐藏的、上次选错的选项
let attempts = 0

const isHtml = computed(() => props.item.format === 'html')
const stem = computed(() => (isHtml.value ? props.item.stem : esc(props.item.stem)))
const optHtml = (i: number) => (isHtml.value ? props.item.options[i] : fmtOpt(props.item.options[i]))
const explain = computed(() => (isHtml.value ? props.item.explain : esc(props.item.explain)))
const chapter = computed(() => chapterById(props.item.chapterId))
const letterOf = (oi: number) => 'ABCD'[order.indexOf(oi)]

const ok = computed(() => chosen.value === props.item.answer)
/** 已经能看到对错：reveal 选了就看到；retry 只有答对才看到；defer 要等交卷 */
const shown = computed(() => {
  if (chosen.value < 0) return false
  if (props.mode === 'defer') return props.revealed
  if (props.mode === 'retry') return ok.value
  return true
})
/** retry 模式答错：不亮答案，等重试 */
const waiting = computed(() => props.mode === 'retry' && chosen.value >= 0 && !ok.value)
const locked = computed(() => chosen.value >= 0 && !waiting.value)

function pick(oi: number) {
  if (chosen.value >= 0) return
  chosen.value = oi
  hidden.value = -1
  attempts++
  emit('answer', oi, oi === props.item.answer, attempts === 1)
}
function retry() {
  hidden.value = chosen.value
  chosen.value = -1
}
</script>

<template>
  <div class="q" :class="{ answered: shown, waiting }" :data-key="item.key">
    <div class="q-text"><span class="qn">{{ label }}</span><span class="q-stem" v-html="stem"></span></div>
    <LabCode v-if="item.code" :code="item.code" />
    <div class="opts">
      <button
        v-for="(oi, pos) in order"
        :key="oi"
        type="button"
        class="opt"
        :class="{
          right: shown && oi === item.answer,
          wrong: (shown || waiting) && oi === chosen && chosen !== item.answer,
          picked: !shown && !waiting && oi === chosen,
          gone: oi === hidden
        }"
        :disabled="locked || waiting || chosen >= 0"
        :data-oi="oi"
        :aria-hidden="oi === hidden ? 'true' : undefined"
        @click="pick(oi)"
      ><span class="ol">{{ 'ABCD'[pos] }}</span><span class="ot" v-html="optHtml(oi)"></span></button>
    </div>
    <div v-if="waiting" class="explain no" role="status">
      <b>不对。</b>先别急着换选项。回到前面的章里找和这道题相关的部分，想清楚你选的那一项错在哪，再答一次。
      <button type="button" class="b retry" @click="retry">想清楚了，再答一次</button>
    </div>
    <div v-if="shown" class="explain" :class="ok ? 'ok' : 'no'" role="status">
      <b>{{ ok ? '回答正确。' : '不太对，正确答案是 ' + letterOf(item.answer) + '。' }}</b>
      <span class="ex-text" v-html="explain"></span>
      <div v-if="source && chapter" class="src">出自第 {{ chapter.chapter }} 章《{{ chapter.title }}》 · <a :href="withBase(chapter.link)">回看这一章</a></div>
    </div>
  </div>
</template>
