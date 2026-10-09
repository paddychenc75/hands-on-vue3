<script setup lang="ts">
// 自我解释：每章末尾、掌握标准条之前。用自己的话写本章要点，至少 30 个有效字（logic/selfExplain.ts）才能点“对照本章要点”。
//   写的内容存在这一章进度的 note，点过对照记 sx。它不是章完成的必要条件。
//   参考要点 = 本章“小结”块（::: summary）的内容。构建时抽出来（virtual:course-loaders 按章载入，只取本章那一块），章里的小结块本身默认隐藏
//   （config.mts 给它加了 sx-hidden 类），写够字点了对照之后才在这里显示。没有“跳过”出口（hands-on-react 也没有）。
//   由主题布局的 doc-footer-before 插槽自动放置，章的 Markdown 里不用写。
import { computed, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'
import { selfExplainState } from '../../../engine/logic/selfExplain'
import { summaryLoaders } from 'virtual:course-loaders'
import { chapterById, chapterOf, cpOf, ensureReady, mutate, ready } from '../composables/learn'

const { frontmatter } = useData()
const id = computed(() => frontmatter.value.id as string)
const show = computed(() => !!chapterById(id.value) && chapterById(id.value)!.stage != null)

const note = ref('')
const revealed = ref(false)
const summary = ref('')
const state = computed(() => selfExplainState(note.value, false))

function load() {
  note.value = cpOf(id.value)?.note || ''
  const s = selfExplainState(note.value, cpOf(id.value)?.sx)
  revealed.value = s.unlocked // 以前写够过或点过对照：刷新后直接展开
}
async function loadSummary() {
  summary.value = ''
  if (!show.value) return
  const want = id.value
  const load = summaryLoaders[want]
  if (!load) return
  try {
    const html = (await load()).summary
    if (want === id.value) summary.value = html // 载入期间换了章就丢掉
  } catch {
    // 载入失败只影响“对照要点”里的参考要点：自我解释的输入和字数门槛照常工作
    if (want === id.value) summary.value = ''
  }
}

function onInput() {
  mutate(() => { chapterOf(id.value).note = note.value }, { silent: true })
}
function reveal() {
  if (state.value.remain > 0) return
  revealed.value = true
  mutate(() => { chapterOf(id.value).sx = true })
}

onMounted(() => {
  ensureReady()
  load()
  loadSummary()
})
// 换章（站内跳转）时重新读
watch(id, () => { if (ready.value) { load(); loadSummary() } })
</script>

<template>
  <section v-if="show" class="selfx" :data-revealed="revealed || undefined">
    <div class="sx-title">用自己的话讲一遍<span>自我解释</span></div>
    <p>想象你要把这一章讲给一个刚学 Vue 的朋友听。不看上面的内容，用两三句话写下来：它解决什么问题，怎么用，最容易踩的坑是什么。写完再对照要点，看看漏了什么。</p>
    <textarea
      :id="'sx-' + id"
      v-model="note"
      rows="4"
      placeholder="例如：ref 用来……，在模板里……，要注意……"
      aria-label="用自己的话总结本章"
      @input="onInput"
    ></textarea>
    <div class="sx-row">
      <button v-if="!revealed" type="button" class="b" data-a="sx-reveal" :disabled="state.remain > 0" @click="reveal">写好了，对照本章要点</button>
      <small v-if="!revealed && state.remain > 0" class="sx-count">再写 {{ state.remain }} 个字就能对照要点。</small>
    </div>
    <div v-if="revealed" class="sx-keys">
      <b>参考要点（本章小结）</b>
      <div v-if="summary" class="sx-summary" v-html="summary"></div>
      <p class="sx-ask">你的总结里有没有讲到上面每一点？漏掉的，回到正文再看一遍，然后补进你的总结。</p>
    </div>
  </section>
</template>
