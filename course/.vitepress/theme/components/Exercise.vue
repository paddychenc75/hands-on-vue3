<script setup lang="ts">
// 可判题的代码练习：<Exercise id="counter" />
// 这个组件只管“载入练习定义”：定义在 course/exercises/<章>.ts，按章懒加载（每章一个分块），挂载后才取本章的那一块，
// 载入好之后交给 ExerciseRunner 渲染编辑器、判题和提示阶梯。服务端渲染和水合前的占位只用章元数据里的练习标题，
// 所以两边输出一样；练习定义本身只在浏览器里载入。
// 载入失败（离线、分块 404 或 500）时显示可见的提示和“刷新页面”按钮，不留空白。
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useData } from 'vitepress'
import { loadChapterExercises } from '../../../exercises'
import type { Exercise as ExerciseDef } from '../../../exercises/types'
import { chapterById } from '../composables/learn'

const props = defineProps<{ id: string }>()
const { frontmatter } = useData()
const chapter = computed(() => chapterById(frontmatter.value.id as string))
const title = computed(() => chapter.value?.exTitles?.[props.id] ?? props.id)

const ex = shallowRef<ExerciseDef | null>(null)
/** 'loading'：正在取；'error'：取失败；'missing'：这章的练习文件里没有这个 id；'ready'：已载入 */
const phase = ref<'loading' | 'error' | 'missing' | 'ready'>('loading')
const errMsg = ref('')

async function load() {
  const file = chapter.value?.file
  phase.value = 'loading'
  if (!file) { phase.value = 'missing'; return }
  try {
    const defs = await loadChapterExercises(file)
    const def = defs[props.id]
    if (!def) { phase.value = 'missing'; return }
    ex.value = def
    phase.value = 'ready'
  } catch (e: any) {
    errMsg.value = e?.message || String(e)
    phase.value = 'error'
  }
}

// 失败的动态 import 会被浏览器记在模块表里，同一页内再 import 一次还是同样的失败，所以重试靠刷新页面
const reload = () => location.reload()

onMounted(load)
</script>

<template>
  <ExerciseRunner v-if="phase === 'ready' && ex" :id="id" :ex="ex" />
  <div v-else-if="phase === 'missing'" class="ex"><div class="ex-body"><p class="ex-err">找不到练习：{{ id }}</p></div></div>
  <div v-else-if="phase === 'error'" class="ex ex-load-fail" :data-ex-fail="id" role="alert">
    <div class="ex-head"><span class="pg-badge">EXERCISE</span><b>{{ title }}</b><span class="badge">没能载入</span></div>
    <div class="ex-body">
      <p class="ex-err">练习没能载入（可能网络断了，或者站点刚更新过）。检查网络后点“刷新页面”重试。</p>
      <p class="cap">{{ errMsg }}</p>
      <div class="row"><button type="button" class="b pri" data-a="reload" @click="reload">刷新页面</button></div>
    </div>
  </div>
  <div v-else class="ex ex-ph" :data-ex-ph="id">
    <div class="ex-head"><span class="pg-badge">EXERCISE</span><b>{{ title }}</b><span class="badge">载入中</span></div>
  </div>
</template>
