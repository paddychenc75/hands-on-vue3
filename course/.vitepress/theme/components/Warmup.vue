<script setup lang="ts">
// 课前热身（提取练习）：每章开头，凭记忆回答 2 道前面学过的题。由 markdown 渲染器自动插在每章标题后面，章的 Markdown 里不用写。
//   选题：先到期的 1 道，再上一章的 1 道，不够再补（logic/srs.ts 的 pickWarmup）；12 小时内答过的题不出（warmupPool）。
//   没有可出的题时（比如第 1 章，或者前面的章都没答过题）不显示。
//   作答：和章内自测一致，答错不亮正确答案、不显示解析，重试时隐藏上次选错的项；结果用 srsRecordGated 记录
//   （答对只有到期的卡才升级，没到期的答对不改任何记录；答错照样回盒子 0）。只记第一次作答。
//   挑题只用卡片键和复习记录，不载入题目内容；挑出 2 道后才载入这 2 道题所在章的自测题（每章一个小分块）。
//   选出的题在页面打开时定一次，答完不会换题；种子是章 id 加当天日期，所以同一天重新打开会出同样的题（答过的题 12 小时内不再出，所以刷新后可能换题）。
import { onMounted, ref } from 'vue'
import { useData } from 'vitepress'
import { srsAll, srsRecordGated } from '../../../engine/cards'
import type { CardItem } from '../../../engine/types'
import { seeded } from '../../../engine/logic/random'
import { pickWarmup, warmupPool } from '../../../engine/logic/srs'
import { loadScCards, scKeysOf } from '../composables/catalog'
import { allProgress, ensureReady, mutate, progressChapters } from '../composables/learn'

const { frontmatter } = useData()
const picks = ref<CardItem[]>([])
/** 题目分块载入失败（离线等）：给一行提示，不让热身悄悄消失 */
const loadFailed = ref(false)

onMounted(async () => {
  ensureReady()
  const id = frontmatter.value.id as string
  const idx = progressChapters.findIndex(c => c.id === id)
  if (idx <= 0) return // 第 1 章前面没有旧题
  const earlier = progressChapters.slice(0, idx).flatMap(c => scKeysOf(c.id).map(key => ({ key, chapterId: c.id })))
  const srs = srsAll(allProgress())
  const now = Date.now()
  const pool = warmupPool(earlier, srs, now)
  if (!pool.length) return
  const chosen = pickWarmup(pool, srs, progressChapters[idx - 1].id, seeded(id + new Date().toDateString()), now)
  try {
    picks.value = await loadScCards(chosen.map(c => c.key))
  } catch {
    loadFailed.value = true
  }
})

function onAnswer(c: CardItem, ok: boolean, first: boolean) {
  if (!first) return // 只记第一次作答
  mutate(p => { srsRecordGated(p, c.key, ok) })
}
</script>

<template>
  <p v-if="loadFailed" class="cap warmup-fail" role="status">课前热身的题目没能载入（可能网络断了）。刷新页面可以重试，不影响下面的内容。</p>
  <section v-else-if="picks.length" class="warmup">
    <div class="wu-head"><b>课前热身</b><span>先别往下读。凭记忆回答这 {{ picks.length }} 道前面学过的题，回忆的过程本身就在加固记忆。</span></div>
    <Question v-for="(c, i) in picks" :key="c.key" :item="c" :label="'回忆 ' + (i + 1)" mode="retry" @answer="(_oi, ok, first) => onAnswer(c, ok, first)" />
  </section>
</template>
