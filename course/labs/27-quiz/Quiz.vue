<script setup lang="ts">
// 综合测验（旧 #quiz 章的 60 题交互）：按阶段筛选、有解析、有得分，答题记录沿用旧的 store 键 quiz3。
// 答案存 { "<题号>": 选项在题库里的序号 }，序号 0 是正确答案；选项显示顺序按题号固定打乱。
// 随机 10 题和待复习是“会话”：答案只存在内存里，不影响综合测验成绩。
import { ref, reactive, computed, onMounted } from 'vue'
import { withBase } from 'vitepress'
import { store, storeReady, markStoreReady } from '../../.vitepress/theme/composables/store'
import { Q, STAGES } from './questions'

const KEY = 'quiz3'

// 回看链接：旧 section id → 新章节页面和章名
const CH: Record<string, [string, string]> = {
  first: ['01-first', '第一个 Vue 应用'], template: ['02-template', '模板语法与指令'], refs: ['03-refs', '响应式基础'],
  computed: ['04-computed', '计算属性与侦听器'], comm: ['05-comm', '组件与通信'], lifecycle: ['06-lifecycle', '生命周期钩子'],
  builtins: ['07-builtins', '内置组件'], directives: ['08-directives', '自定义指令'], composables: ['09-composables', '组合式函数'],
  app: ['10-app', '应用、插件与错误处理'], forms: ['11-forms', '表单与验证'], reactivity: ['12-reactivity', '响应式原理'],
  scheduler: ['13-scheduler', '更新队列与 nextTick'], render: ['14-render', '渲染函数与 JSX'], compiler: ['15-compiler', '模板编译'],
  diff: ['16-diff', '虚拟 DOM 与 diff'], patterns: ['17-patterns', '组件设计模式'], pinia: ['18-pinia', 'Pinia 状态管理'],
  router: ['19-router', 'Vue Router'], ts: ['20-ts', 'TypeScript 与编译宏'], perf: ['21-perf', '性能优化'],
  tooling: ['22-tooling', '工程化与测试'], ssr: ['23-ssr', 'SSR 与水合'], renderer: ['24-renderer', '自定义渲染器'],
  migrate: ['25-migrate', '选项式 API 与 Vue 2 迁移'], project: ['26-project', '综合实战'], quiz: ['27-quiz', '综合测验']
}
const sec = (sid: string) => CH[sid] ? { href: withBase('/chapters/' + CH[sid][0]), title: CH[sid][1] } : null

// 每题的选项顺序固定（按题号生成），刷新页面后不变
const order = Q.map((q, qi) => {
  const idx = q[1].map((_, i) => i)
  let s = qi * 7919 + 17
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]] }
  return idx
})

const TABS = ['全部', '阶段一', '阶段二', '阶段三', '阶段四', '只看错题', '随机 10 题', '待复习']
const shuffle = <T,>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

type Sess = { items: { id: string; sid: string; qi: number }[]; ans: Record<string, any> }
const filter = ref(0)
const pick = ref<Set<number> | null>(null)
const sess = ref<Sess | null>(null)

// 已存的答案（读取时依赖 storeRev，其他标签页改了也会同步）
// 服务端渲染和客户端首次渲染只出得分条，挂载后才读存储、出题目（和 Sc 一样用 storeReady，避免水合不一致）
onMounted(markStoreReady)
const ans = computed<Record<string, number>>(() => (storeReady.value ? store.get(KEY, {}) : {}))

// 复习题库：期末测验题。旧版还混入各章的章内自测和按间隔到期的章节，新站点没有这套复习进度，待复习暂时总是空的。
function buildSession(mode: number) {
  const all = Q.map((q, qi) => ({ id: 'q' + qi, sid: q[3], qi }))
  if (mode === 6) return shuffle(all.slice()).slice(0, 10)
  return []
}
function setMode(i: number) {
  filter.value = i
  sess.value = null
  pick.value = null
  if (i === 6 || i === 7) sess.value = reactive({ items: buildSession(i), ans: {} }) as Sess
  else if (i === 5) pick.value = new Set(Object.keys(ans.value).filter(k => Q[+k] && ans.value[k] !== 0).map(Number))
}
function reset() {
  if (sess.value) { setMode(filter.value); return }
  const next = { ...ans.value }
  if (pick.value) pick.value.forEach(k => delete next[k])
  else for (const k of Object.keys(next)) delete next[k]
  store.set(KEY, next)
}

interface Box { id: string; qi: number; n: string; chosen: number | null }
const boxes = computed<Box[]>(() => {
  if (!storeReady.value) return []
  if (sess.value) {
    const s = sess.value
    return s.items.map((it, k) => ({ id: it.id, qi: it.qi, n: String(k + 1), chosen: it.id + ':i' in s.ans ? s.ans[it.id + ':i'] : null }))
  }
  const out: Box[] = []
  Q.forEach((q, qi) => {
    if (pick.value ? !pick.value.has(qi) : filter.value && q[4] !== filter.value) return
    out.push({ id: 'q' + qi, qi, n: 'Q' + (qi + 1), chosen: qi in ans.value ? ans.value[qi] : null })
  })
  return out
})
function choose(b: Box, oi: number) {
  if (sess.value) {
    sess.value.ans[b.id] = oi === 0
    sess.value.ans[b.id + ':i'] = oi
  } else {
    store.set(KEY, { ...ans.value, [b.qi]: oi })
  }
}
const letters = (qi: number) => order[qi].map((oi, pos) => ({ oi, letter: String.fromCharCode(65 + pos) }))
const rightLetter = (qi: number) => letters(qi).find(x => x.oi === 0)!.letter

const empty = computed(() => {
  if (!storeReady.value || boxes.value.length) return ''
  if (sess.value) return filter.value === 7 ? '现在没有需要复习的章节。学完一章两天后，它会出现在这里。' : '没有题目。'
  return pick.value ? '没有答错的题目。' : ''
})

const stat = computed(() => {
  if (sess.value) {
    const n = sess.value.items.length
    const real = Object.keys(sess.value.ans).filter(k => !k.endsWith(':i'))
    const right = real.filter(k => sess.value!.ans[k]).length
    const msg = !n ? '' : real.length < n ? '本次复习：已答 ' + real.length + ' 题。这些答案不影响综合测验的成绩。'
      : '本次复习完成，答对 ' + right + ' 题。' + (right < n ? '答错的题目，回到对应章节再看一次。' : '')
    return { score: right + ' / ' + n, msg }
  }
  const keys = Object.keys(ans.value).filter(k => Q[+k])
  const right = keys.filter(k => ans.value[k] === 0).length
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
    <div v-if="storeReady" class="tabs" id="qzTabs" role="tablist">
      <button v-for="(t, i) in TABS" :key="i" type="button" :class="{ on: filter === i }" @click="setMode(i)">{{ t }}</button>
    </div>
    <div id="qzList">
      <div v-for="b in boxes" :key="b.id" class="q">
        <h4><span class="qn">{{ b.n }}</span>{{ Q[b.qi][0] }}<span class="lvl">{{ STAGES[Q[b.qi][4]].lv.split(' · ')[0] }}</span></h4>
        <LabCode v-if="Q[b.qi][5]" :code="Q[b.qi][5] as string" />
        <div class="opts">
          <button
            v-for="o in letters(b.qi)" :key="o.oi" type="button" class="opt"
            :disabled="b.chosen != null"
            :class="{ right: b.chosen != null && o.oi === 0, wrong: b.chosen != null && o.oi !== 0 && o.oi === b.chosen }"
            @click="choose(b, o.oi)"
          >{{ o.letter }}. {{ Q[b.qi][1][o.oi] }}</button>
        </div>
        <div v-if="b.chosen != null" class="explain">
          <b>{{ b.chosen === 0 ? '正确。' : '正确答案是 ' + rightLetter(b.qi) + '。' }}</b>{{ Q[b.qi][2] }}
          <template v-if="sec(Q[b.qi][3])"> <a :href="sec(Q[b.qi][3])!.href">回看「{{ sec(Q[b.qi][3])!.title }}」</a></template>
        </div>
      </div>
      <p v-if="empty" class="cap">{{ empty }}</p>
    </div>
  </div>
</template>
