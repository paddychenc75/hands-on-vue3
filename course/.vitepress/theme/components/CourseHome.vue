<script setup lang="ts">
// 首页：学习路线说明、继续学习、总进度、6 个阶段的章节和状态。阶段的名称和说明来自 course/stages.ts。
// 进度只在浏览器里读（ready 之后），服务端渲染出来的是“全部未开始”的样子，所以不会水合不一致。
// 复习入口：显示今天到期的题数和进入复习页的按钮；“N 道题在复习中”统计是进了复习队列的题数。
import { computed, onMounted } from 'vue'
import { withBase } from 'vitepress'
import { chapters } from 'virtual:course-meta'
import { tallyProgress } from '../../../engine/logic/completion'
import { WRITING_TERMS } from '../../../writing-terms.mjs'
import { LEARNING_PATHS } from '../../../learning-paths.mjs'
import { chapterRanges } from '../../../engine/logic/text'
import { agoText, chapterById, chapterByPath, chapterState, chaptersOfStage, CHECK_LABEL, checkLink, dueCount, ensureReady, getLast, learnedCount, progressChapters, ready, stageCheckStatus, STAGES, STATE_LABEL } from '../composables/learn'
import { stageTitle } from '../../../stages'

const cheat = chapters.find(c => c.id === 'cheat')

onMounted(ensureReady)

const cards = computed(() =>
  STAGES.map((info, i) => {
    const stage = i + 1
    const list = chaptersOfStage(stage).map(c => ({
      ...c,
      state: ready.value ? chapterState(c.id) : ('todo' as const)
    }))
    // 选读章不计入分母和完成数：done / total 只数必读章，选读章另外统计
    const tl = tallyProgress(list, id => list.find(c => c.id === id)?.state === 'done')
    const check = ready.value ? stageCheckStatus(stage) : ('none' as const)
    return { stage, ...info, list, done: tl.done, total: tl.total, optionalDone: tl.optionalDone, optionalTotal: tl.optionalTotal, check, pct: tl.total ? (tl.done / tl.total) * 100 : 0 }
  })
)
const total = computed(() => cards.value.reduce((a, c) => a + c.total, 0))
const doneN = computed(() => cards.value.reduce((a, c) => a + c.done, 0))
const optionalTotal = computed(() => cards.value.reduce((a, c) => a + c.optionalTotal, 0))
const optionalDone = computed(() => cards.value.reduce((a, c) => a + c.optionalDone, 0))
const doingN = computed(() => cards.value.reduce((a, c) => a + c.list.filter(x => x.state === 'doing').length, 0))

// 学习路线：路线数据（course/learning-paths.mjs）只写章 id，章号和标题在这里从章元数据取，改章号不会过期
const routes = LEARNING_PATHS.map(path => {
  const parts = path.parts.map(part => {
    const all = part.ids === 'all'
    const list = all ? chaptersOfStage(part.stage).filter(c => !c.optional) : (part.ids || []).map(id => chapterById(id)).filter((c): c is NonNullable<typeof c> => !!c)
    return {
      text: part.text,
      label: part.stage ? stageTitle(part.stage) : '',
      all,
      list,
      range: chapterRanges(list.map(c => c.chapter as number)),
      checks: (part.checkStages || []).map((s: number) => ({ stage: s, title: stageTitle(s), href: checkLink(s) }))
    }
  })
  // “从这里开始”：这条路线第一步要学的第一章；第一步是阶段测验（第 3 条路线）时指向那个阶段测验。章号和标题都来自元数据
  const p0 = parts[0]
  const start = p0?.list[0]
    ? { href: p0.list[0].link, text: `第 ${p0.list[0].chapter} 章 ${p0.list[0].title}` }
    : p0?.checks[0]
      ? { href: p0.checks[0].href, text: `先做 ${p0.checks[0].title} 阶段测验` }
      : null
  const sk = path.skip
  const skipStages = (sk?.stages || []).map((s: number) => stageTitle(s))
  const skipOptional = sk?.optional ? chapterRanges(progressChapters.filter(c => c.optional).map(c => c.chapter as number)) : ''
  return { id: path.id, title: path.title, who: path.who, test: path.test as string | undefined, parts, start, skip: sk ? { text: sk.text as string, stages: skipStages.join('、'), optional: skipOptional } : null }
})

const due = computed(() => (ready.value ? dueCount() : 0))
const learned = computed(() => (ready.value ? learnedCount() : 0))
const scTotal = progressChapters.reduce((a, c) => a + c.scCount, 0)
const exTotal = progressChapters.reduce((a, c) => a + c.ex.length, 0)

// 继续学习：回到上次阅读的章（有小节锚点时定位到小节）。阅读位置存在引擎进度的 __last
const resume = computed(() => {
  const first = progressChapters[0]
  const last = ready.value ? getLast() : null
  const c = last && chapterByPath(last.path)
  if (!last || !c) return { href: withBase(first.link), text: '还没有学习记录，从第 1 章开始。', has: false }
  const label = `第 ${c.chapter} 章 ${c.title}` + (last.h ? ' · ' + last.h : '') + `（${agoText(last.t)}）`
  return { href: withBase(c.link) + (last.anchor ? '#' + encodeURIComponent(last.anchor) : ''), text: '上次停在：' + label, has: true }
})
</script>

<template>
  <div class="home">
    <header class="hero">
      <div class="eyebrow">VUE 3.5 · 中文互动课程</div>
      <h1>动手学 <em>Vue 3</em></h1>
      <p>本课程有 {{ STAGES.length }} 个阶段，共 {{ progressChapters.length }} 章（其中 {{ optionalTotal }} 章选读），每个阶段末尾有一次阶段测验。{{ STAGES[0].name }}和{{ STAGES[1].name }}教你使用 Vue。{{ STAGES[2].name }}把常用工具接进项目。{{ STAGES[3].name }}和{{ STAGES[4].name }}说明 Vue 的内部原理。{{ STAGES[5].name }}讲组件设计、服务端渲染和工程实践。标题以“项目：”开头的章是动手做项目的章。带“选读”标签的章不计入总进度，学了照常记录。</p>

      <p class="prereq"><b>开始前你需要会：</b>HTML 和 CSS 基础（标签、属性、选择器），JavaScript 基础（变量、函数、箭头函数、数组的 map 和 filter、对象和数组的解构与展开、import 和 export 模块、Promise 与 async/await）。讲工程化的章节还会用到命令行和 npm。还不熟的话，先花一两周补 JavaScript，再回来学会轻松很多。</p>

      <div class="resume show" id="resume">
        <span id="resumeTxt">{{ resume.text }}</span>
        <a class="b pri" id="resumeLink" :href="resume.href">继续学习</a>
      </div>

      <div v-if="learned > 0" class="resume show review-entry" id="reviewEntry">
        <span id="reviewTxt"><template v-if="due > 0">今日复习：<b>{{ due }}</b> 道题到期。</template><template v-else>今天没有到期的题，已学过 {{ learned }} 道。</template></span>
        <a class="b pri" id="reviewLink" :href="withBase('/review')">{{ due > 0 ? '开始复习' : '去做混合练习' }}</a>
      </div>

      <div class="progress-sum" id="progress">
        <div class="progress-txt" id="progTxt">已完成 {{ doneN }} / {{ total }} 章<template v-if="optionalTotal">（必读）· 选读 {{ optionalDone }} / {{ optionalTotal }} 章</template><template v-if="doingN"> · 进行中 {{ doingN }} 章</template></div>
        <div class="meter"><i id="progBar" :style="{ width: (total ? (doneN / total) * 100 : 0) + '%' }"></i></div>
      </div>

      <div class="stats" id="stats">
        <div><b>{{ progressChapters.length }}</b><span>章正文</span></div>
        <div><b>{{ scTotal }}</b><span>道章内自测</span></div>
        <div><b>{{ exTotal }}</b><span>道可判题练习</span></div>
        <div><b>{{ doneN }}/{{ total }}</b><span>必读章已完成</span></div>
        <div id="statReview"><b>{{ learned }}</b><span>道题在复习中</span></div>
      </div>

      <h2 class="section-title" id="methods-title">怎样用这套课程真正学会</h2>
      <p class="section-sub">下面每个环节都对应一条被大量研究验证过的学习规律。看懂了不等于学会了，这些环节的作用是让知识留在你脑子里。</p>
      <div class="methods" id="methods">
        <div>
          <b>先预测，再运行</b>
          <i>生成效应</i>
          <p>实验台开头有一道“先猜”题：先选你认为的结果，再运行核对。主动猜一次，哪怕猜错，比直接看答案记得牢得多。</p>
        </div>
        <div>
          <b>课前热身</b>
          <i>提取练习</i>
          <p>每章开头先凭记忆回答两道旧题。从记忆里“往外拿”知识，比反复阅读更能巩固它。</p>
        </div>
        <div>
          <b>间隔复习</b>
          <i>间隔效应</i>
          <p>章内自测的题按 1、3、7、16、35 天的间隔回来找你，赶在快忘记时复习一次，效率最高。答错的题明天再出。</p>
        </div>
        <div>
          <b>混合出题</b>
          <i>交错练习</i>
          <p>今日复习、混合练习和阶段测验把不同章的题混在一起，你得先判断该用哪个知识点，这正是写真实代码时的情况。</p>
        </div>
        <div>
          <b>先尝试，再求助</b>
          <i>有益困难 · 渐隐示例</i>
          <p>练习的提示、参考答案要检查失败后逐级解锁（有半成品示例的练习，中间还有一级半成品）。只有改过代码才算一次失败。先挣扎一下再看答案，学到的东西更多。</p>
        </div>
        <div>
          <b>讲给别人听</b>
          <i>自我解释</i>
          <p>每章结尾用自己的话总结，写够 30 个字再对照小结要点。讲不清楚的地方，就是还没真懂的地方。</p>
        </div>
      </div>
      <p class="section-sub"><b>掌握学习：</b>一章的自测全部答对、练习全部通过才算完成；一个阶段测验达到 80% 才算掌握。建议每天先清空“今日复习”，再学新章。</p>

      <h2 class="section-title" id="path-title">学习路线</h2>
      <p class="path-sub">{{ STAGES.length }} 个阶段循序渐进。下面先给三条路线，选一条适合你的。不确定时从头按顺序学，也可以先做阶段测验，看看哪些地方已经掌握。</p>
      <div class="routes" id="routes">
        <article v-for="r in routes" :key="r.id" class="route" :data-route="r.id">
          <h3>{{ r.title }}</h3>
          <p class="who">{{ r.who }}</p>
          <a v-if="r.start" class="route-start" :href="withBase(r.start.href)">从这里开始：{{ r.start.text }} →</a>
          <ol class="steps">
            <li v-for="(part, i) in r.parts" :key="i">
              <div class="step-head">
                <!-- 整个阶段的步骤：阶段名链接到该阶段第一个必读章，章数多时章列表默认折叠 -->
                <a v-if="part.all && part.list.length" class="stage-go" :href="withBase(part.list[0].link)"><b>{{ part.label }}</b>：从第 {{ part.list[0].chapter }} 章开始</a>
                <b v-else-if="part.label">{{ part.label }}</b>
                <span v-if="part.range" class="rng">{{ part.all ? '全部必读章：' : '' }}{{ part.range }}</span>
                <span v-if="part.checks.length" class="chk">先做&nbsp;<template v-for="(c, k) in part.checks" :key="c.stage"><template v-if="k">、</template><a :href="withBase(c.href)">{{ c.title }}阶段测验</a></template></span>
              </div>
              <p>{{ part.text }}</p>
              <details v-if="part.all && part.list.length" class="all-chapters">
                <summary>列出这 {{ part.list.length }} 章</summary>
                <div class="chips"><a v-for="c in part.list" :key="c.id" :href="withBase(c.link)"><span class="num">{{ c.chapter }}.</span> {{ c.title }}</a></div>
              </details>
              <div v-else-if="part.list.length" class="chips"><a v-for="c in part.list" :key="c.id" :href="withBase(c.link)"><span class="num">{{ c.chapter }}.</span> {{ c.title }}<span v-if="c.optional" class="opt-tag">选读</span></a></div>
            </li>
          </ol>
          <p v-if="r.skip" class="skip"><b>可以跳过：</b><template v-if="r.skip.stages">{{ r.skip.stages }}。</template><template v-if="r.skip.optional">选读章（{{ r.skip.optional }}）。</template>{{ r.skip.text }}</p>
          <p v-if="r.test" class="test">{{ r.test }}</p>
        </article>
      </div>
      <h3 class="stages-title" id="stages-title">各阶段的章</h3>
      <div class="path" id="path">
        <div v-for="c in cards" :key="c.stage" class="stage" :data-stage="c.stage">
          <div class="lv">{{ c.no }} · {{ c.en }}</div>
          <h3>{{ c.name }}</h3>
          <div class="aim">{{ c.desc }}</div>
          <ul>
            <li v-for="x in c.list" :key="x.id" :data-id="x.id" :data-state="x.state">
              <a :href="withBase(x.link)"><span class="num">{{ x.chapter }}.</span> {{ x.title }}<span v-if="x.optional" class="opt-tag">选读</span></a>
              <span class="st">{{ STATE_LABEL[x.state] }}</span>
            </li>
            <li v-if="c.stage === STAGES.length && cheat" class="aside"><a :href="withBase(cheat.link)">附：{{ cheat.title }}</a></li>
            <li class="aside check" :data-check="c.check"><a :href="withBase(checkLink(c.stage))">阶段测验</a><span class="st">{{ CHECK_LABEL[c.check] }}</span></li>
          </ul>
          <div class="cap stage-sum">已完成 {{ c.done }} / {{ c.total }} 章<template v-if="c.optionalTotal">（必读）· 选读 {{ c.optionalDone }} / {{ c.optionalTotal }} 章</template></div>
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
            <li>一个术语只表示一个意思。术语见下面的表，全部术语见<a :href="withBase('/glossary')">术语表</a>。</li>
            <li>“注意”紧跟在它说明的代码之后，在实验台和练习之前。</li>
            <li>正文不使用比喻和口语。</li>
          </ol>
          <p>正文之外有“类比”框。类比框不使用这些规则。类比框帮助初学者理解概念。</p>
          <div class="tbl-wrap"><table class="t" id="glossary">
            <tbody>
              <tr><th>术语</th><th>意思</th><th>不使用的同义词</th></tr>
              <tr v-for="w in WRITING_TERMS" :key="w.label"><td>{{ w.label }}</td><td>{{ w.meaning }}</td><td>{{ w.avoid }}</td></tr>
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
          <li><b>间隔复习。</b>每天先做“今日复习”，再学新章。学完一个阶段后，隔一两天做这个阶段的阶段测验。</li>
        </ol>
      </div></details>
    </header>
  </div>
</template>
