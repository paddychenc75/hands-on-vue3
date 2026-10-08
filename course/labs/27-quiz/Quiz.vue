<script setup lang="ts">
// 综合测验（旧 #quiz 章的 60 题交互）的最小版本：按阶段筛选、点选出解析、有得分。
// 这一步只保证站点能构建、页面不报错：答题记录只放在内存里，刷新后清空，不写进进度存储。
// 下一步会把这一页整体换成按阶段的阶段测验页，所以这里不再做复习相关的功能。
// 答案存 { 题号: 选项在题库里的序号 }，序号 0 是正确答案；选项显示顺序按题号固定打乱。
import { ref, reactive, computed, onMounted } from 'vue'
import { withBase } from 'vitepress'
import { chapters } from 'virtual:course-meta'
import { Q } from '../../checks/questions'
import { STAGES } from '../../stages'

// 回看链接：章 id → 页面和章名
const sec = (sid: string) => {
  const c = chapters.find(x => x.id === sid)
  return c ? { href: withBase(c.link), title: c.title } : null
}
/** 题所属的阶段：看它所属章的 stage */
const stageOfQ = (qi: number) => chapters.find(c => c.id === Q[qi][3])?.stage ?? 0

// 每题的选项顺序固定（按题号生成），刷新页面后不变
const order = Q.map((q, qi) => {
  const idx = q[1].map((_, i) => i)
  let s = qi * 7919 + 17
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]] }
  return idx
})

// 标签序号：0 全部，1..N 各阶段，N+1 只看错题
const N = STAGES.length
const TABS = ['全部', ...STAGES.map(s => s.no + ' ' + s.name), '只看错题']
const filter = ref(0)
const pick = ref<Set<number> | null>(null)
const mounted = ref(false)
onMounted(() => { mounted.value = true })

// 答案只在内存里
const ans = reactive<Record<number, number>>({})

function setMode(i: number) {
  filter.value = i
  pick.value = i === N + 1 ? new Set(Object.keys(ans).filter(k => ans[+k] !== 0).map(Number)) : null
}
function reset() {
  if (pick.value) pick.value.forEach(k => delete ans[k])
  else for (const k of Object.keys(ans)) delete ans[+k]
}

interface Box { id: string; qi: number; n: string; chosen: number | null; sid: string }
const boxes = computed<Box[]>(() => {
  if (!mounted.value) return []
  const out: Box[] = []
  Q.forEach((q, qi) => {
    if (pick.value ? !pick.value.has(qi) : filter.value && stageOfQ(qi) !== filter.value) return
    out.push({ id: 'q' + qi, qi, sid: q[3], n: 'Q' + (qi + 1), chosen: qi in ans ? ans[qi] : null })
  })
  return out
})
function choose(b: Box, oi: number) {
  ans[b.qi] = oi
}
const isRight = (_b: Box, oi: number) => oi === 0
const letters = (b: Box) => order[b.qi].map((oi, pos) => ({ oi, letter: String.fromCharCode(65 + pos) }))
const rightLetter = (b: Box) => letters(b).find(x => isRight(b, x.oi))!.letter

const empty = computed(() => (mounted.value && !boxes.value.length && pick.value ? '没有答错的题目。' : ''))

const stat = computed(() => {
  const keys = Object.keys(ans).map(Number).filter(k => Q[k])
  const right = keys.filter(k => ans[k] === 0).length
  const total = Q.length
  const msg = keys.length === 0 ? '还没有作答' : keys.length < total ? '已答 ' + keys.length + ' 题，答对 ' + right + ' 题'
    : right === total ? '全部正确。' : right >= total * 0.8 ? '复习答错题目的章节。' : '复习答错题目的章节。然后再做一次实验台和练习。'
  return { score: right + ' / ' + total, msg }
})
</script>

<template>
  <div>
    <div class="score">
      <strong id="qzScore">{{ stat.score }}</strong>
      <span class="cap" id="qzMsg">{{ stat.msg }}</span>
      <button class="b" id="qzReset" @click="reset">重新作答</button>
    </div>
    <div v-if="mounted" class="tabs" id="qzTabs" role="tablist">
      <button v-for="(t, i) in TABS" :key="i" type="button" :class="{ on: filter === i }" @click="setMode(i)">{{ t }}</button>
    </div>
    <div id="qzList">
      <div v-for="b in boxes" :key="b.id" class="q" data-kind="q" :data-key="b.id">
        <h4><span class="qn">{{ b.n }}</span>{{ Q[b.qi][0] }}<span class="lvl">{{ TABS[stageOfQ(b.qi)] }}</span></h4>
        <LabCode v-if="Q[b.qi][4]" :code="Q[b.qi][4] as string" />
        <div class="opts">
          <button
            v-for="o in letters(b)" :key="o.oi" type="button" class="opt"
            :disabled="b.chosen != null"
            :class="{ right: b.chosen != null && isRight(b, o.oi), wrong: b.chosen != null && !isRight(b, o.oi) && o.oi === b.chosen }"
            @click="choose(b, o.oi)"
          >{{ o.letter }}. {{ Q[b.qi][1][o.oi] }}</button>
        </div>
        <div v-if="b.chosen != null" class="explain">
          <b>{{ isRight(b, b.chosen) ? '正确。' : '正确答案是 ' + rightLetter(b) + '。' }}</b>
          {{ Q[b.qi][2] }}
          <template v-if="sec(b.sid)"> <a :href="sec(b.sid)!.href">回看「{{ sec(b.sid)!.title }}」</a></template>
        </div>
      </div>
      <p v-if="empty" class="cap">{{ empty }}</p>
    </div>
  </div>
</template>
