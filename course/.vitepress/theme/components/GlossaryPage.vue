<script setup lang="ts">
// 术语表页：全站术语，从各章“本章术语”块在构建时汇总（virtual:course-glossary，规则见 AUTHORING.md 第 7 节）。
// “不这样说”一栏来自 course/writing-terms.mjs（首页写作规则表的数据）：术语表里有同名术语的才有内容。
// 按首次出现的先后排（阶段、章号），可以按术语或解释里的文字过滤。服务端也渲染全部条目。
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'
import { glossary } from 'virtual:course-glossary'

const q = ref('')
const shown = computed(() => {
  const s = q.value.trim().toLowerCase()
  return s ? glossary.filter(g => g.term.toLowerCase().includes(s) || g.text.toLowerCase().includes(s)) : glossary
})
</script>

<template>
  <div class="glossary">
    <div class="crumb"><span class="tag">参考</span><span>共 {{ glossary.length }} 个术语</span></div>
    <p class="lesson-sum">本课程中，一个概念只用一个说法。每章的“本章术语”会自动汇总到这里。章里的术语第一次出现时带虚线下划线，把鼠标放上去或点一下就能看到释义。标题、代码、目标、类比、自测和练习里不加标注。</p>
    <div class="gl-tools">
      <input v-model="q" class="gl-search" type="search" placeholder="搜索术语或解释" aria-label="搜索术语" autocomplete="off" />
      <span class="gl-count" role="status">{{ q.trim() ? `${shown.length} / ${glossary.length} 条` : `${glossary.length} 条` }}</span>
    </div>
    <div class="tbl">
      <table class="gl-table">
        <thead>
          <tr><th>术语</th><th>含义</th><th>不这样说</th><th>出自</th></tr>
        </thead>
        <tbody>
          <tr v-for="g in shown" :key="g.term" class="gl-row" :data-term="g.term">
            <td class="gl-term"><b>{{ g.term }}</b></td>
            <td class="gl-def" v-html="g.def"></td>
            <td class="gl-avoid">{{ g.avoid }}</td>
            <td class="gl-src">
              <template v-for="(c, i) in g.chapters" :key="c.id"><a :href="withBase(c.link)" :title="c.title">第 {{ c.chapter }} 章</a><span v-if="i < g.chapters.length - 1">、</span></template>
            </td>
          </tr>
          <tr v-if="!shown.length" class="gl-empty"><td colspan="4">没有匹配“{{ q }}”的术语。</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
