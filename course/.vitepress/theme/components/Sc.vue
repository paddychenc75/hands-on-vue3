<script setup lang="ts">
// 自测题（章内），或实验台里的“先猜”题（加 predict）。
// 答案保存键：普通题 "<章id>:<序号>"（序号 = 本章第几道非先猜题，从 0 起，按页面顺序）；
// 先猜题 "p:<实验台id>"。已有题只能在末尾追加，否则旧答案会错位。
import { computed, inject, onMounted, provide, ref } from 'vue'
import { useData } from 'vitepress'
import { store, markStoreReady } from '../composables/store'
import { scRegistry } from '../composables/registry'
import { LabKey, ScKey } from '../composables/keys'

const props = defineProps<{ a: number; predict?: boolean }>()
const { frontmatter } = useData()
const lab = inject(LabKey, null)

const el = ref<HTMLElement>()
const picked = ref(-1)
const answered = ref(false)
const guessed = ref(false)
let key = ''
let optCount = 0

function computeKey(): string {
  if (props.predict) return 'p:' + (lab ? lab.id : '?')
  const all = [...document.querySelectorAll('.vp-doc .sc:not(.predict)')]
  return frontmatter.value.id + ':' + all.indexOf(el.value!)
}

function optText(i: number) {
  const os = el.value ? el.value.querySelectorAll('.sc-o') : []
  return os[i] ? (os[i].textContent || '').trim() : ''
}

function reveal(i: number) {
  picked.value = i
  answered.value = true
  guessed.value = false
  lab?.setPending(null)
}

function pick(i: number) {
  if (answered.value) return
  if (props.predict) {
    // 先猜：选择只记录猜测并打开实验台。点“核对我的猜测”才显示答案。
    const g = store.get<Record<string, number>>('guess', {})
    g[key] = i
    store.set('guess', g)
    startGuess(i)
    return
  }
  reveal(i)
  const ans = store.get<Record<string, number>>('sc', {})
  ans[key] = i
  store.set('sc', ans)
}

function startGuess(i: number) {
  picked.value = i
  guessed.value = true
  lab?.open()
  lab?.setPending({
    text: optText(i),
    check() {
      const g = store.get<Record<string, number>>('guess', {})
      const gi = g[key] ?? i
      reveal(gi)
      const ans = store.get<Record<string, number>>('sc', {})
      ans[key] = gi
      store.set('sc', ans)
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
  correct: props.a,
  pick
})

onMounted(() => {
  key = computeKey()
  if (!props.predict) scRegistry[key] = props.a
  const ans = store.get<Record<string, number>>('sc', {})
  const g = store.get<Record<string, number>>('guess', {})
  if (key in ans) {
    reveal(ans[key])
    if (props.predict) lab?.open()
  } else if (props.predict && key in g) startGuess(g[key])
  markStoreReady()
})

const verdict = computed(() => {
  const i = picked.value
  if (i === props.a) return props.predict ? '你猜对了。' : '正确。'
  if (i < 0) return ''
  return props.predict ? '你猜的不对。' : '不对。'
})
</script>

<template>
  <div ref="el" class="sc" :class="{ predict, answered, guessed }">
    <slot />
    <button
      v-if="predict && !answered && !guessed"
      type="button"
      class="pr-skip"
      @click="skip"
    >跳过，直接打开实验台</button>
    <div v-if="answered" class="sc-x" role="status" tabindex="-1">
      <b>{{ verdict }}</b><slot name="explain" />
    </div>
  </div>
</template>
