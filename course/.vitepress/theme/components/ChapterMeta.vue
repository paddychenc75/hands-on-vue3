<script setup lang="ts">
// 章头：一级标题下面的一行信息和一句话说明，结构和 hands-on-react 的 LessonHeader 一致。
//   [01 · 入门]  第 3 / N 章
//   一句话说明（frontmatter 的 desc）
//   阅读时间（章里 ::: rt 块的原文；正文里那个块不再单独渲染，config.mts 把它从正文去掉）
// 由 config.mts 在一级标题后面自动插入，章的 Markdown 里不用写。速查表没有阶段和章号，显示“参考”标签。
import { computed } from 'vue'
import { useData } from 'vitepress'
import { chapterById, progressChapters, STAGES } from '../composables/learn'

const { frontmatter } = useData()
const meta = computed(() => chapterById(frontmatter.value.id as string))
const stage = computed(() => (meta.value?.stage != null ? STAGES[meta.value.stage - 1] : null))
</script>

<template>
  <div v-if="meta" class="ch-meta">
    <div class="crumb">
      <span class="tag">{{ stage ? `${stage.no} · ${stage.name}` : '参考' }}</span>
      <span v-if="meta.chapter">第 {{ meta.chapter }} / {{ progressChapters.length }} 章</span>
    </div>
    <p v-if="meta.desc" class="lesson-sum">{{ meta.desc }}</p>
    <p v-if="meta.rt" class="rt">{{ meta.rt }}</p>
  </div>
</template>
