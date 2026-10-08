<script setup lang="ts">
// 首页：学习路线说明（旧首页 header.hero 的文字）、继续学习、复习提醒、总进度、四个阶段的章节和状态。
// 进度只在浏览器里读（storeReady 之后），服务端渲染出来的是“全部未开始”的样子，所以不会水合不一致。
import { computed, onMounted } from 'vue'
import { withBase } from 'vitepress'
import { markStoreReady, store, storeReady } from '../composables/store'
import {
  agoText, chapterByPath, chapterState, dueChapters, nextDue, progressChapters, STATE_LABEL, chapterById, type LastPos
} from '../composables/progress'
import { chapters } from 'virtual:course-meta'

const STAGES: Record<number, { lv: string; title: string; aim: string }> = {
  1: { lv: '阶段一 · 入门', title: '使用 Vue', aim: '模板、指令、响应式基础' },
  2: { lv: '阶段二 · 基础', title: '编写组件', aim: '组件、内置组件、指令、组合式函数、插件、表单' },
  3: { lv: '阶段三 · 原理', title: '内部原理', aim: '响应式、更新队列、渲染函数、编译、diff' },
  4: { lv: '阶段四 · 进阶', title: '生态和工程', aim: '设计模式、Pinia、Router、TS、性能、工程化、SSR' }
}
const cheat = chapters.find(c => c.chapter == null)

onMounted(markStoreReady)

const cards = computed(() =>
  Object.entries(STAGES).map(([s, info]) => {
    const list = progressChapters.filter(c => c.stage === Number(s)).map(c => ({
      ...c,
      state: storeReady.value ? chapterState(c.id) : ('todo' as const)
    }))
    const done = list.filter(c => c.state === 'done').length
    return { stage: Number(s), ...info, list, done, pct: list.length ? (done / list.length) * 100 : 0 }
  })
)
const total = computed(() => cards.value.reduce((a, c) => a + c.list.length, 0))
const doneN = computed(() => cards.value.reduce((a, c) => a + c.done, 0))
const doingN = computed(() => cards.value.reduce((a, c) => a + c.list.filter(x => x.state === 'doing').length, 0))

// 继续学习：回到上次阅读的章（有小节锚点时定位到小节）
const resume = computed(() => {
  const first = progressChapters[0]
  const last = storeReady.value ? store.get<LastPos | null>('last', null) : null
  const c = last && chapterByPath(last.path)
  if (!last || !c) return { href: withBase(first.link), text: '还没有学习记录，从第 1 章开始。', has: false }
  const label = `第 ${c.chapter} 章 ${c.title}` + (last.h ? ' · ' + last.h : '') + `（${agoText(last.t)}）`
  return { href: withBase(c.link) + (last.anchor ? '#' + encodeURIComponent(last.anchor) : ''), text: '上次停在：' + label, has: true }
})

// 间隔复习提醒
const review = computed(() => {
  if (!storeReady.value) return null
  const due = dueChapters()
  if (due.length) {
    const names = due.slice(0, 3).map(id => chapterById(id)!.title).join('、') + (due.length > 3 ? ' 等' : '')
    return { later: false, text: `复习时间到了：${due.length} 章（${names}）。每章抽 3 道题回忆一次，记得更牢。` }
  }
  const ts = progressChapters.map(c => nextDue(c.id)).filter((t): t is number => !!t)
  if (!ts.length) return null
  const t = new Date(Math.min(...ts))
  return { later: true, text: `下次复习：${t.getMonth() + 1} 月 ${t.getDate()} 日。到时这里会提醒你。` }
})
</script>

<template>
  <div class="home">
    <header class="hero">
      <div class="eyebrow">VUE 3.5 · 中文互动课程</div>
      <h1>动手学 <em>Vue 3</em></h1>
      <p>本课程有 4 个阶段：25 章正文、1 个综合实战和一套综合测验。阶段一和阶段二教你使用 Vue：组件、内置组件、自定义指令、插件和表单。阶段三说明 Vue 的内部原理。阶段四介绍组件设计模式、Pinia、Router、TypeScript、性能、工程化、SSR 和迁移，并包含一个完整的小项目。</p>

      <div class="resume show" id="resume">
        <span id="resumeTxt">{{ resume.text }}</span>
        <a class="b pri" id="resumeLink" :href="resume.href">继续学习</a>
      </div>
      <div v-if="review" class="resume review show" :class="{ later: review.later }" id="review">
        <span id="reviewTxt">{{ review.text }}</span>
        <a v-if="!review.later" class="b" id="reviewLink" :href="withBase('/chapters/27-quiz') + '#review'">开始复习</a>
      </div>

      <div class="progress-sum" id="progress">
        <div class="progress-txt" id="progTxt">已完成 {{ doneN }} / {{ total }} 章<template v-if="doingN"> · 进行中 {{ doingN }} 章</template></div>
        <div class="meter"><i id="progBar" :style="{ width: (total ? (doneN / total) * 100 : 0) + '%' }"></i></div>
      </div>

      <div class="path" id="path">
        <div v-for="c in cards" :key="c.stage" class="stage" :data-stage="c.stage">
          <div class="lv">{{ c.lv }}</div>
          <h3>{{ c.title }}</h3>
          <div class="aim">{{ c.aim }}</div>
          <ul>
            <li v-for="x in c.list" :key="x.id" :data-id="x.id" :data-state="x.state">
              <a :href="withBase(x.link)"><span class="num">{{ x.chapter }}.</span> {{ x.title }}</a>
              <span class="st">{{ STATE_LABEL[x.state] }}</span>
            </li>
            <li v-if="c.stage === 4 && cheat" class="aside"><a :href="withBase(cheat.link)">附：{{ cheat.title }}</a></li>
          </ul>
          <div class="cap stage-sum">已完成 {{ c.done }} / {{ c.list.length }} 章</div>
          <div class="meter"><i :style="{ width: c.pct + '%' }"></i></div>
        </div>
      </div>

      <details class="ste">
        <summary>本课程的写作规则</summary>
        <div>
          <p>本课程的正文按下面的规则编写：</p>
          <ol>
            <li>一个句子只说一件事。</li>
            <li>说明句不超过 40 个字。操作句不超过 30 个字。代码不计入字数。</li>
            <li>操作步骤使用编号列表。每一步用动词开头。</li>
            <li>使用主动语态。</li>
            <li>一个术语只表示一个意思。术语见下面的术语表。</li>
            <li>“注意”紧跟在它说明的代码之后，在实验台和练习之前。</li>
            <li>正文不使用比喻和口语。</li>
          </ol>
          <p>正文之外有“类比”框。类比框不使用这些规则。类比框帮助初学者理解概念。</p>
          <div class="tbl-wrap"><table class="t" id="glossary">
            <tbody>
              <tr><th>术语</th><th>意思</th><th>不使用的同义词</th></tr>
              <tr><td>响应式数据</td><td>Vue 跟踪读写的数据。数据改变时，Vue 更新页面。</td><td>响应式状态、可观察数据</td></tr>
              <tr><td>副作用函数（effect）</td><td>读取响应式数据并且在数据改变时再次运行的函数</td><td>观察者（源码中的 Subscriber 译为“订阅者”，只在深入部分使用）</td></tr>
              <tr><td>收集依赖（track）</td><td>记录“哪个副作用函数读取了哪个属性”</td><td>订阅、登记</td></tr>
              <tr><td>触发更新（trigger）</td><td>再次运行读取了被修改属性的副作用函数</td><td>通知、派发</td></tr>
              <tr><td>组件</td><td>有自己的模板、数据和逻辑的可复用单元</td><td>控件、模块</td></tr>
              <tr><td>父组件 / 子组件</td><td>在模板中使用另一个组件的组件 / 被使用的组件</td><td>上层组件、下层组件</td></tr>
              <tr><td>props</td><td>父组件传给子组件的数据</td><td>参数、入参、属性</td></tr>
              <tr><td>事件（emit）</td><td>子组件发给父组件的消息</td><td>回调、通知</td></tr>
              <tr><td>渲染函数（render）</td><td>返回虚拟节点的函数</td><td>模板函数</td></tr>
              <tr><td>虚拟节点（VNode）</td><td>描述一个 DOM 元素的 JavaScript 对象</td><td>虚拟 DOM 节点</td></tr>
              <tr><td>挂载 / 卸载</td><td>把组件加入页面 / 从页面移除组件。“渲染”是另一个术语：运行渲染函数，得到虚拟节点</td><td>销毁</td></tr>
              <tr><td>更新队列</td><td>等待执行的组件更新任务列表</td><td>调度队列、任务池</td></tr>
              <tr><td>组合式函数（composable）</td><td>以 use 开头、使用响应式 API 的函数</td><td>Hook、mixin</td></tr>
              <tr><td>编译宏</td><td>编译器在构建时替换的函数，例如 defineProps</td><td>宏函数、全局函数</td></tr>
            </tbody>
          </table></div>
        </div>
      </details>
      <div class="howto">每一章：<b>目标</b><span>→</span><b>类比</b><span>→</span><b>术语</b><span>→</span><b>为什么需要它</b><span>→</span><b>各小节</b><span>→</span><b>常见错误</b><span>→</span><b>自测</b><span>→</span><b>小结</b></div>
      <div class="howto">每个小节：<b>问题</b><span>→</span><b>最小代码</b><span>→</span><b>场景</b><span>→</span><b>注意</b><span>→</span><b>实验台 / 练习</b><span>→</span><b>深入（可选）</b></div>
      <details class="think"><summary>怎样学效果最好（按学习研究的结论）</summary><div>
        <ol>
          <li><b>先看图，再读文字。</b>图解给出整体结构。文字补充细节。</li>
          <li><b>第一遍跳过“深入”。</b>“深入”默认折叠。学完主线后，再打开它。</li>
          <li><b>先预测，再运行。</b>操作实验台前，先猜结果。然后运行，比较结果和你的猜测。</li>
          <li><b>不看书做自测。</b>回忆比重读更能记住内容。答错时，回到对应的图和文字。</li>
          <li><b>间隔复习。</b>学完一个阶段后，隔一两天做一次综合测验中这个阶段的题目。</li>
        </ol>
      </div></details>
    </header>
  </div>
</template>
