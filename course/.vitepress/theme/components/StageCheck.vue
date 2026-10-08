<script setup lang="ts">
// 阶段测验页（/check/1 到 /check/6）。规则照 hands-on-react 的 stageCheck.ts，纯逻辑在 course/engine/logic/stageCheck.ts：
//   - 每次 12 题：8 道阶段专用题（章内没出现过，优先抽还没见过的）加 4 道章内自测里的常规题，不足时互相补位。
//   - 交卷模式：每题只选一次；全部答完才统一显示对错和解析（Question 的 defer 方式）。
//   - 80% 通过（12 题答对 10 题）。以最近一次为准；通过后清掉上次未通过留下的“需要加强的章”（weak）。
//   - 中途离开算未通过：每答一题就把进度记成 pending，下次进入页面时按已答的题计分、没答的算错，结算成未通过。
//   - 未通过要等 30 分钟才能重测（显示还要等多久）；通过 35 天后提示复测。
//   - 答错的题进入复习队列（srsRecordGated：答错照样回盒子 0，明天再出；答对只有到期的卡才升级），并列出需要加强的章。
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { stagePools, srsAll, srsRecordGated } from '../../../engine/cards'
import type { CardItem, StageRecord } from '../../../engine/types'
import { cooldownLeft, daysSincePass, isPass, needsRetest, pendingRecord, percent, pickStageQuestions, settlePending, settleResult, uniqueInOrder } from '../../../engine/logic/stageCheck'
import { loadCatalog } from '../composables/catalog'
import { allProgress, chapterById, chaptersOfStage, checkLink, ensureReady, mutate, stageRecord, STAGES } from '../composables/learn'

const props = defineProps<{ stage: number }>()
const info = STAGES[props.stage - 1]
const chapterIds = chaptersOfStage(props.stage).map(c => c.id)
const isLast = props.stage === STAGES.length

type Phase = 'loading' | 'cooldown' | 'quiz' | 'finished'
const phase = ref<Phase>('loading')
const notice = ref('') // 上次中途离开的说明
const retestNote = ref('')
const cooldown = ref({ minutes: 0, last: 0, weak: [] as string[] })
const picks = ref<CardItem[]>([])
const round = ref(0) // 每开一轮加 1，让题目组件重新创建（重新打乱选项）
const answered = ref(0)
const right = ref(0)
const wrongIdx = ref<number[]>([])
const wrongChapters = ref<string[]>([])
const revealed = ref(false)
const result = ref({ pct: 0, pass: false })
const record = computed<StageRecord | undefined>(() => stageRecord(props.stage))

const chapterLinks = (ids: string[]) => ids.map(id => chapterById(id)).filter((c): c is NonNullable<typeof c> => !!c)

async function start() {
  ensureReady()
  const catalog = await loadCatalog()
  const now = Date.now()
  let rec: StageRecord = stageRecord(props.stage) ?? {}
  notice.value = ''
  if (rec.pending) {
    // 上次答到一半就离开：按已答的题计分，没答的算错
    const pd = rec.pending
    mutate(p => { (p.__stage = p.__stage || {})[props.stage] = settlePending(p.__stage[props.stage]) })
    rec = stageRecord(props.stage) ?? {}
    notice.value = `上次测验答了 ${pd.answered}/${pd.n} 题就离开了，按“未通过”记录（没答的题算错）。`
  }
  const wait = cooldownLeft(rec, now)
  if (wait > 0) {
    // 没通过后马上重测，测到的是短期记忆。先复习，隔一段时间再测
    cooldown.value = { minutes: Math.ceil(wait / 60e3), last: rec.last || 0, weak: rec.weak || [] }
    phase.value = 'cooldown'
    return
  }
  retestNote.value = needsRetest(rec, now) ? `你在 ${daysSincePass(rec, now)} 天前通过了这个阶段。隔了这么久还能答对，才说明真的记住了。建议再测一次。` : ''
  const { pool, fresh } = stagePools(catalog, chapterIds)
  picks.value = pickStageQuestions(pool, fresh, srsAll(allProgress()))
  round.value++
  answered.value = 0
  right.value = 0
  wrongIdx.value = []
  wrongChapters.value = []
  revealed.value = false
  phase.value = 'quiz'
}

function onAnswer(idx: number, c: CardItem, ok: boolean) {
  answered.value++
  if (ok) right.value++
  else {
    wrongIdx.value.push(idx)
    wrongChapters.value.push(c.chapterId)
  }
  const n = picks.value.length
  const last = answered.value === n
  const pct = percent(right.value, n)
  mutate(p => {
    srsRecordGated(p, c.key, ok) // 答错的题进入复习队列
    const st = (p.__stage = p.__stage || {})
    if (last) st[props.stage] = settleResult(st[props.stage] || {}, pct, uniqueInOrder(wrongChapters.value), Date.now())
    else st[props.stage] = { ...(st[props.stage] || {}), pending: pendingRecord(n, answered.value, right.value, wrongChapters.value, Date.now()) }
  })
  if (last) {
    revealed.value = true
    result.value = { pct, pass: isPass(pct) }
    phase.value = 'finished'
  }
}

const weakChapters = computed(() => chapterLinks(uniqueInOrder(wrongChapters.value)))
const cooldownWeak = computed(() => chapterLinks(cooldown.value.weak))
const status = computed(() => {
  const r = record.value
  if (!r || (!r.last && r.last !== 0)) return ''
  return `最近一次 ${r.last}%（${r.passed ? '通过' : '未通过'}）` + (r.best != null ? ` · 最好成绩 ${r.best}%` : '')
})

function again() {
  start()
  window.scrollTo({ top: 0 })
}

onMounted(start)
</script>

<template>
  <div class="quiz" :data-phase="phase" :data-stage="stage">
    <div class="check-meta">
      <span class="tag">{{ info.no }} · {{ info.name }}</span>
      <span class="kind">阶段测验</span>
    </div>
    <p class="check-intro">每次 12 题，从本阶段所有章中抽取。其中 8 道是章内没出现过的读代码题，优先抽你还没见过的，检验你能否举一反三。答对 10 题（80% 以上）视为掌握本阶段。不翻笔记作答，答错的题会自动加入复习队列。</p>
    <p v-if="status" class="cap check-status">{{ status }}</p>

    <p v-if="phase === 'loading'" class="cap">正在载入题目……</p>

    <template v-else-if="phase === 'cooldown'">
      <p v-if="notice" class="lesson-sum">{{ notice }}</p>
      <div class="done-card" data-phase="cooldown">
        <b>先复习，{{ cooldown.minutes }} 分钟后可以重测</b>
        <span>上次答对 {{ cooldown.last }}%。马上重测，测到的多半是刚看过的答案。先回看这些章，做一做<a :href="withBase('/review')">今日复习</a>，再来测。</span>
        <div v-if="cooldownWeak.length" class="wrong-list">需要加强：<template v-for="(c, i) in cooldownWeak" :key="c.id"><template v-if="i">、</template><a :href="withBase(c.link)">{{ c.title }}</a></template></div>
      </div>
    </template>

    <template v-else>
      <p v-if="retestNote" class="lesson-sum">{{ retestNote }}</p>
      <p class="check-rule">交卷模式：每题选一次，全部答完后统一显示对错和解析。中途离开按未通过记录。</p>
      <Question
        v-for="(c, i) in picks"
        :id="'cq-' + i"
        :key="round + ':' + c.key"
        :item="c"
        :label="String(i + 1)"
        mode="defer"
        :revealed="revealed"
        @answer="(_oi, ok) => onAnswer(i, c, ok)"
      />
      <div v-if="phase === 'finished'" class="done-card" :class="{ pass: result.pass }" data-phase="finished" role="status">
        <b>{{ result.pass ? '✓ 已掌握' + info.name + '阶段' : '还差一点' }}：答对 {{ right }}/{{ picks.length }}（{{ result.pct }}%）</b>
        <span>{{ result.pass ? (isLast ? '你已完成最后一个阶段的测验。' : '可以放心进入下一阶段了。') : '先读懂下面每道错题的解析，再回看对应的章。30 分钟后才能重测，隔一段时间再测，比马上重测更能检验是否真的掌握。' }}</span>
        <div v-if="wrongIdx.length" class="wrong-list">答错的题：<template v-for="(n, k) in wrongIdx" :key="n"><template v-if="k">、</template><a :href="'#cq-' + n">第 {{ n + 1 }} 题</a></template></div>
        <div v-if="weakChapters.length" class="wrong-list">需要加强：<template v-for="(c, i) in weakChapters" :key="c.id"><template v-if="i">、</template><a :href="withBase(c.link)">{{ c.title }}</a></template></div>
        <button v-if="result.pass" type="button" class="b" data-a="again" @click="again">换一组题再测</button>
      </div>
    </template>
  </div>
</template>
