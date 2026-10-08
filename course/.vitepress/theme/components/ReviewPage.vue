<script setup lang="ts">
// 今日复习页（/review）。行为照 hands-on-react 的 review.ts：
//   - 还没有学过的题（进度里没有复习卡片）：空状态，引导去第 1 章。
//   - 有到期的卡片：直接开始“今日复习”，只出到期的卡（最早到期的优先抽，打乱，最多 20 道），逐题作答。
//   - 没有到期的：显示“都复习完了”和下一批到期的时间，可以做 10 道“混合练习”（从学过的卡片里随机抽，不看是否到期）。
//   结果都用 srsRecordGated 记录：答对只有到期的卡才升级，没到期的答对不改任何记录；答错不管到没到期都回盒子 0，明天再出。
//   选一次就显示对错和解析（Question 的 reveal 方式）。每题下面标出它来自哪一章并链回去。
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { dueCards, learnedCards, srsAll, srsRecordGated, type Catalog } from '../../../engine/cards'
import type { CardItem } from '../../../engine/types'
import { mixedQueue, nextDueLabel, todayQueue } from '../../../engine/logic/review'
import { nextDueAfter } from '../../../engine/logic/srs'
import { loadCatalog } from '../composables/catalog'
import { allProgress, ensureReady, mutate, progressChapters } from '../composables/learn'

type Phase = 'loading' | 'empty' | 'running' | 'finished' | 'caught-up'
const phase = ref<Phase>('loading')
const catalog = ref<Catalog | null>(null)
const queue = ref<CardItem[]>([])
const label = ref('今日复习')
const i = ref(0)
const right = ref(0)
const answered = ref(false)
/** 结束页和“都复习完了”页要显示的数字，进入那个状态时算一次 */
const info = ref({ learned: 0, due: 0, next: '' })

const firstChapter = progressChapters[0]

function summarize() {
  const cat = catalog.value!
  const p = allProgress()
  const now = Date.now()
  const learned = learnedCards(p, cat)
  const srs = srsAll(p)
  const known = Object.fromEntries(learned.map(c => [c.key, srs[c.key]]))
  info.value = { learned: learned.length, due: dueCards(p, cat, now).length, next: nextDueLabel(nextDueAfter(known, now), now) }
}

function start(cards: CardItem[], name: string) {
  queue.value = cards
  label.value = name
  i.value = 0
  right.value = 0
  answered.value = false
  phase.value = 'running'
}
function startToday() {
  start(todayQueue(dueCards(allProgress(), catalog.value!, Date.now())), '今日复习')
}
function startMixed() {
  start(mixedQueue(learnedCards(allProgress(), catalog.value!)), '混合练习')
}
/** 进入页面、或做完一轮之后：看现在是什么状态 */
function route() {
  summarize()
  if (!info.value.learned) phase.value = 'empty'
  else if (info.value.due) startToday()
  else phase.value = 'caught-up'
}

function onAnswer(c: CardItem, ok: boolean) {
  if (ok) right.value++
  mutate(p => { srsRecordGated(p, c.key, ok) })
  answered.value = true
}
function next() {
  answered.value = false
  if (i.value + 1 < queue.value.length) { i.value++; return }
  summarize()
  phase.value = 'finished'
}

const current = computed(() => queue.value[i.value])
const barWidth = computed(() => (queue.value.length ? (i.value / queue.value.length) * 100 : 0) + '%')

onMounted(async () => {
  ensureReady()
  catalog.value = await loadCatalog()
  route()
})
</script>

<template>
  <div class="review">
    <div class="rv-intro">
      <span class="tag">间隔复习</span>
      <p>每道题第一次答完后都会进入复习队列：答对了，间隔会从 1 天拉长到 3、7、16、35 天；答错了，它明天会再出现。不同章的题混在一起出，逼你先判断“这是哪个知识点”。</p>
    </div>

    <p v-if="phase === 'loading'" class="cap">正在载入题目……</p>

    <div v-else-if="phase === 'empty'" class="done-card" data-phase="empty">
      <b>还没有需要复习的题目</b>
      <span>完成任意一章的章内自测后，题目会自动进入这里。</span>
      <a class="b pri" :href="withBase(firstChapter.link)">开始第 1 章</a>
    </div>

    <div v-else-if="phase === 'caught-up'" class="done-card" data-phase="caught-up">
      <b>今天该复习的都复习完了</b>
      <span>你已学过 {{ info.learned }} 道题。<template v-if="info.next">下一批题目在 {{ info.next }}到期。</template>想多练一会儿，可以做一组从所有学过的题里随机抽取的混合练习：答错的题会重新安排；还没到期的题答对，不改变复习间隔。</span>
      <button type="button" class="b pri" data-a="mixed" @click="startMixed">来 {{ Math.min(10, info.learned) }} 道混合练习</button>
    </div>

    <template v-else-if="phase === 'running' && current">
      <div class="rv-progress" data-phase="running">
        <span>{{ label }} · 第 {{ i + 1 }} / {{ queue.length }} 题</span>
        <div class="bar"><i :style="{ width: barWidth }"></i></div>
      </div>
      <Question :key="current.key + ':' + i" :item="current" label="复习" mode="reveal" @answer="(_oi, ok) => onAnswer(current, ok)" />
      <button v-if="answered" type="button" class="b pri" data-a="next" @click="next">{{ i + 1 < queue.length ? '下一题 →' : '查看结果' }}</button>
    </template>

    <div v-else-if="phase === 'finished'" class="done-card" data-phase="finished">
      <b>{{ label }}完成：答对 {{ right }} / {{ queue.length }}</b>
      <span><template v-if="info.next">下一批题目在 {{ info.next }}到期。</template>答错的题明天会再出现。<template v-if="info.due">现在还有 {{ info.due }} 道题已经到期。</template></span>
      <div class="rv-actions">
        <button v-if="info.due" type="button" class="b pri" data-a="more" @click="startToday">继续今日复习</button>
        <button v-else type="button" class="b" data-a="mixed" @click="startMixed">再来 {{ Math.min(10, info.learned) }} 道混合练习</button>
        <a class="b" :href="withBase('/')">回到课程首页</a>
      </div>
    </div>
  </div>
</template>
