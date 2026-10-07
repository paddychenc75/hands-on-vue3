<script setup lang="ts">
// 章标题上方的“第 N 章”小字。只在有 chapter 字段的页面显示。
import { useData } from 'vitepress'
const { frontmatter } = useData()
</script>

<template>
  <div v-if="frontmatter.chapter" class="kicker">第 {{ frontmatter.chapter }} 章</div>
</template>
