<script setup lang="ts">
// 首页：一段可以自动放映、也可以手动滚动的短片，讲“数据变了，屏幕怎样跟着变”：Vue 每一代怎样找到要改的那块 DOM。
// 同一个三层空间贯穿始终（响应式数据 / 虚拟 DOM 树 / DOM 与屏幕），变的是 Vue 找到并更新那块 DOM 的方式。
// 这里只有静态结构和全部文案（服务端渲染进 HTML，没有 JS 时就是一篇分节的长文加一张“结论帧”）；
// 动画在 course/engine/film.ts + logic/filmTracks.ts（首页自己的异步 chunk，挂载后才加载）。继续学习的入口依赖本地进度，挂载后才变化。
//
// 史实依据（2026-10-09 逐条核实，全文见验收报告）：
//   第 1 幕 手动改 DOM：泛指 Vue 之前的写法，不涉及具体年份。
//   第 2 幕 2015 · Vue 1.0（2015-10-27）：每个指令/数据绑定对应一个 watcher，没有虚拟 DOM。
//        https://v1.vuejs.org/guide/reactivity.html  https://github.com/vuejs/vue/releases/tag/1.0.0
//   第 3 幕 2016 · Vue 2.0（2016-09-30）：虚拟 DOM；每个组件实例一个 watcher，数据变了组件重新渲染。
//        https://v2.vuejs.org/v2/guide/render-function.html  https://v2.vuejs.org/v2/guide/reactivity.html
//        注意：单文件组件不是 2.0 才有（vue-loader 与 vueify 2014-10 就发布了），所以文案里不写“2.0 引入单文件组件”。
//   第 4 幕 2020 · Vue 3.0（2020-09-18，One Piece）：Proxy 响应式 https://vuejs.org/guide/extras/reactivity-in-depth.html ；
//        编译期优化（提升静态内容、补丁标记、区块扁平化）https://blog.vuejs.org/posts/vue-3-one-piece  https://vuejs.org/guide/extras/rendering-mechanism.html
//   第 5 幕 2020–21：组合式 API 随 3.0 发布；<script setup> 在 3.2（2021-08）脱离实验状态 https://blog.vuejs.org/posts/vue-3-2
//   第 6 幕 2023–24：3.4（2023-12）“computed 的值没变，watchEffect 回调不再触发” https://blog.vuejs.org/posts/vue-3-4 ；
//        3.5（2024-09）响应式系统重构，内存占用降低 56% https://blog.vuejs.org/posts/vue-3-5
//   第 7 幕 2026 · 3.6 候选版：Vapor 模式不经过虚拟 DOM，完全可选；npm 上 latest 是 3.5.43、rc 是 3.6.0-rc.10
//        https://github.com/vuejs/core/releases/tag/v3.6.0-rc.1  课程第 29 章「Vapor 模式」深入块。3.6 正式发布后要改这一幕的说明。
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { withBase } from 'vitepress'
import '../film.css'
import {
  BLOCK_HUE, BLOCK_SIZE, DATA, DURATIONS, ERA_COLORS, H, MOVERS, MOVER_COLUMNS, NODES, RAIL_LABELS, SECONDS_PER_SCREEN, STATIONS, TAGS, TOTAL, W, DYNAMIC, STATIC_LEAVES,
} from '../../../engine/logic/filmData'
import { STAGE_COUNT, chapterByPath, chapterById, ensureReady, getLast, progressChapters, ready } from '../composables/learn'

const px = (n: number) => n + 'px'
const at = (x: number, y: number, w?: number, h?: number) => ({ left: px(x), top: px(y), ...(w ? { width: px(w), height: px(h) } : {}) })
/** 文案按逗号拆成可以单独上滑的片段（短片模式里标题逐段升起） */
const parts = (t: string) => t.split(/(?<=，)/)
const edgePath = (id: string) => {
  const n = NODES.find(x => x.id === id)!
  const p = NODES.find(x => x.id === n.parent)!
  const my = (p.y + n.y) / 2
  return `M${p.x} ${p.y + 17} C${p.x} ${my} ${n.x} ${my} ${n.x} ${n.y - 17}`
}
/** 数据药丸到它绑定的节点的连线（在数据层上） */
const linkPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
  const my = (from.y + to.y) / 2
  return `M${from.x} ${from.y + 14} C${from.x} ${my} ${to.x} ${my} ${to.x} ${to.y}`
}
const node = (id: string) => NODES.find(n => n.id === id)!
const pill = (id: string) => DATA.find(d => d.id === id)!
/** 数据层连线：数据药丸 → 目标节点的位置（手动改 DOM / Vue 1.0 / Vapor 直连 DOM，Vue 2.0 连到组件节点） */
const LINKS: { id: string; from: string; to: string }[] = [
  { id: 'Item1', from: 'todos', to: 'Item1' },
  { id: 'Item2', from: 'todos', to: 'Item2' },
  { id: 'Counter', from: 'remaining', to: 'Counter' },
  { id: 'List', from: 'todos', to: 'List' },
  { id: 'Footer', from: 'remaining', to: 'Footer' },
]
const flatPath = (id: string) => {
  const n = node(id)
  return `M500 80 C500 150 ${n.x} ${n.y - 120} ${n.x} ${n.y - 17}`
}
const COMPONENTS = ['App', 'Header', 'List', 'Footer']
const BINDINGS = ['Title', 'Item1', 'Item2', 'Counter']

/** 每一幕的文案：eyebrow 是 [年份, 版本]，hook 是幕尾引出下一幕的一句话 */
const SCENES: { id: string; eyebrow: [string, string]; title: string; text: string; hook?: string }[] = [
  {
    id: 'scene-1',
    eyebrow: ['Vue 之前', '手动改 DOM'],
    title: '数据变了，界面靠人去同步',
    text: '数据只有一份，界面上却有好几块要跟着变。你得逐块去改；漏掉一块，界面就和数据对不上。',
    hook: '能不能让数据自己找到要改的那块界面？',
  },
  {
    id: 'scene-2',
    eyebrow: ['2015', 'Vue 1.0'],
    title: '每个绑定一个 watcher',
    text: 'Vue 1.0 给模板里的每一处绑定建一个 watcher（观察者）。数据变了，通知依赖它的 watcher，由它直接改对应的那块 DOM。这一代没有虚拟 DOM。',
    hook: '直连很快，但每个绑定都要一个 watcher。',
  },
  {
    id: 'scene-3',
    eyebrow: ['2016', 'Vue 2.0'],
    title: '虚拟 DOM：先重新生成，再比对',
    text: 'Vue 2.0 引入虚拟 DOM。数据变了，通知依赖它的组件。组件重新生成自己的 vnode 子树，和旧的比对，只改有差别的那几处 DOM。',
    hook: '每次都重新生成整棵子树，能少做一点吗？',
  },
  {
    id: 'scene-4',
    eyebrow: ['2020', 'Vue 3.0'],
    title: 'Proxy 响应式，编译器标出动态部分',
    text: 'Vue 3.0 用 Proxy 追踪数据的读写。模板编译时，编译器分析出哪些节点是动态的，并打上标记。更新时只比对这些动态节点，静态的直接跳过。',
    hook: '状态和逻辑，还散在不同的选项里。',
  },
  {
    id: 'scene-5',
    eyebrow: ['2020–21', '组合式 API 与 script setup'],
    title: '状态和逻辑按功能聚到一起',
    text: '3.0 带来组合式 API，3.2 起 <script setup> 正式可用。相关的状态和逻辑写在一起，还能抽成组合式函数复用。',
    hook: '响应式系统本身，还能更省。',
  },
  {
    id: 'scene-6',
    eyebrow: ['2023–24', 'Vue 3.4 与 3.5'],
    title: '值没变，就不再通知',
    text: '3.4 起，computed 的值没有变化时，依赖它的 watchEffect 回调不会再被触发。3.5 重构了响应式系统，内存占用降低 56%。',
    hook: '还有一步：干脆去掉虚拟 DOM。',
  },
  {
    id: 'scene-7',
    eyebrow: ['2026', 'Vue 3.6 候选版'],
    title: 'Vapor：不经过虚拟 DOM',
    text: 'Vapor 模式由编译器生成直接更新 DOM 的代码：每个动态绑定自己订阅数据，没有 vnode，也不做比对。它完全可选。3.6 目前是候选版，稳定版仍是 3.5。',
  },
]
const CALLOUTS: [string, string, string?][] = [
  ['cl-1', '漏掉一处：界面和数据对不上'],
  ['cl-2', '每个绑定一个 watcher：只通知依赖这份数据的'],
  ['cl-3', '组件重新生成 vnode 子树，比对后只改有差别的 DOM'],
  ['cl-4a', 'Proxy：读写数据时自动追踪依赖'],
  ['cl-4b', '编译器标出动态节点：只比对它们，静态的跳过', 'skip'],
  ['cl-5', '相关的状态和逻辑，按功能聚到一起'],
  ['cl-6a', 'computed 的值没变：不再通知下游（3.4）', 'skip'],
  ['cl-6b', '响应式系统重构：内存占用降低 56%（3.5）'],
  ['cl-7', '候选版：不经过虚拟 DOM，直接更新 DOM'],
]

// 课程的三个真实数字（构建时从章节数据算出）
const exTotal = progressChapters.reduce((a, c) => a + c.ex.length, 0)
const scTotal = progressChapters.reduce((a, c) => a + c.scCount, 0)
const first = progressChapters[0]
/** 收束幕的三个数字（构建时从章节数据算出，进入收束幕后从 0 滚动到这个值） */
const STATS: [number, string, string?][] = [[progressChapters.length, `章（含 ${progressChapters.filter(c => c.optional).length} 章选读）`, ` · ${STAGE_COUNT} 个阶段`], [exTotal, '道自动判题练习'], [scTotal, '道自测题进入间隔复习']]
const chapterLabel = (id: string) => chapterById(id)?.title || id
const chapterHref = (id: string) => withBase(chapterById(id)?.link || first.link)

// 继续学习：挂载后才读进度（服务端渲染的是“从第 1 章开始”）
const resume = computed(() => {
  const last = ready.value ? getLast() : null
  const c = last && chapterByPath(last.path)
  return c ? { href: withBase(c.link) + (last.anchor ? '#' + encodeURIComponent(last.anchor) : ''), label: `第 ${c.chapter} 章 ${c.title}` } : null
})
const startHref = computed(() => resume.value?.href || withBase(first.link))
/** 收束幕的时间轴：各站在一条平缓上升的曲线上（x、y 是 1000×200 视窗里的坐标），曲线用 Catmull-Rom 过这些点 */
const XS = STATIONS.map((_s, i) => ((i + 0.5) * 1000) / STATIONS.length)
const YS = [118, 91, 109, 80, 98, 74, 66]
const CURVE = (() => {
  const pts = [{ x: 0, y: 128 }, ...XS.map((x, i) => ({ x, y: YS[i] })), { x: 1000, y: 60 }]
  let d = `M${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x} ${p2.y}`
  }
  return d
})()
const rail = [{ id: 'scene-0', name: '开场' }, ...SCENES.map(s => ({ id: s.id, name: s.eyebrow.join(' ') })), { id: 'scene-8', name: '收束' }]
const mapHref = withBase('/roadmap')

const root = ref<HTMLElement | null>(null)
let detach: (() => void) | undefined
let gone = false
onMounted(() => {
  ensureReady()
  // 短片的动画代码是首页自己的异步 chunk：不进站点主包
  import('../../../engine/film').then(m => {
    if (gone || !root.value) return
    detach = m.attach(root.value)
  })
})
onBeforeUnmount(() => {
  gone = true
  detach?.()
})
</script>

<template>
  <div ref="root" class="film" :style="{ '--total': TOTAL, '--sps': SECONDS_PER_SCREEN }">
    <nav class="rail" aria-label="首页分幕">
      <ol>
        <li v-for="(e, i) in rail" :key="e.id">
          <a :href="'#' + e.id" :data-scene="i" :aria-label="`第 ${i} 幕：${e.name}`">
            <span class="dot" />
            <span class="lbl" aria-hidden="true">{{ RAIL_LABELS[i] }}</span>
          </a>
        </li>
      </ol>
    </nav>
    <div class="player-slot" />

    <!-- 三层空间：响应式数据 / 虚拟 DOM 树 / DOM 与屏幕。没有 JS 时它是一张静态的结论帧 -->
    <div class="world" aria-hidden="true">
      <div class="eraglow">
        <i v-for="(c, i) in ERA_COLORS" :key="i" :data-w="'eg-' + i" :style="{ '--c': c }" />
      </div>
      <div class="w3d">
        <div class="cam" data-w="cam">
          <div class="u" :style="{ width: px(W), height: px(H) }">
            <!-- 第 3 层：DOM 与屏幕（最下面，再往下是像素栅格） -->
            <div class="plane p4" data-w="pl4"><div class="px" /></div>
            <div class="plane p3" data-w="pl3">
              <i class="plbl" :style="at(14, 8)">DOM · 屏幕</i>
              <div v-for="n in NODES" :key="n.id" class="bk" :class="'h-' + BLOCK_HUE[n.id]" :data-w="'b-' + n.id" :style="at(n.x - BLOCK_SIZE[n.id][0] / 2, n.id === 'App' ? 15 : n.y - BLOCK_SIZE[n.id][1] / 2, BLOCK_SIZE[n.id][0], BLOCK_SIZE[n.id][1])">
                <i class="bs" :data-w="'bs-' + n.id" />
                <i class="bo" :data-w="'bo-' + n.id" />
                <i class="bl" :data-w="'bl-' + n.id" />
                <i class="bx" :data-w="'bx-' + n.id" />
              </div>
              <!-- 绑定了数据的块上的 watcher 标记，和数据层垂直连到它们的光束 -->
              <template v-for="id in BINDINGS" :key="id">
                <i class="wire wr" :data-w="'wr-' + id" :style="{ left: px(node(id).x - 2.5), top: px(node(id).y) }" />
                <i class="wire wv" :data-w="'wv-' + id" :style="{ left: px(node(id).x - 2.5), top: px(node(id).y) }" />
                <i class="wt" :data-w="'wt-' + id" :style="at(node(id).x - 11, node(id).y - BLOCK_SIZE[id][1] / 2 - 11, 22, 22)"><b class="wl" :data-w="'wl-' + id" /></i>
              </template>
            </div>
            <!-- 第 2 层：虚拟 DOM 树（正在构建的新一份在上面的 p2b） -->
            <div class="plane p2" data-w="pl2">
              <i class="plbl" :style="at(14, 8)">虚拟 DOM 树</i>
              <svg class="edges" :viewBox="`0 0 ${W} ${H}`" aria-hidden="true">
                <g v-for="n in NODES.filter(x => x.parent)" :key="n.id">
                  <path class="e" :data-w="'e-' + n.id" :d="edgePath(n.id)" pathLength="1" />
                  <path class="gw" :data-w="'gw-' + n.id" :d="edgePath(n.id)" pathLength="1" />
                  <path class="g" :data-w="'g-' + n.id" :d="edgePath(n.id)" pathLength="1" />
                </g>
                <path v-for="id in DYNAMIC" :key="'fx' + id" class="fx" :data-w="'fx-' + id" :d="flatPath(id)" pathLength="1" />
              </svg>
              <div v-for="n in NODES" :key="n.id" class="nd" :class="{ dyn: !!n.dyn, stat: STATIC_LEAVES.includes(n.id) }" :data-w="'n-' + n.id" :style="at(n.x - 46, n.y - 17, 92, 34)">
                <span>{{ n.label }}</span>
                <i class="nl" :data-w="'nl-' + n.id" />
                <i class="cm" :data-w="'cm-' + n.id" />
                <i class="fl" :data-w="'fl-' + n.id">≠</i>
                <i class="sh" :data-w="'sh-' + n.id" />
                <template v-if="['App', 'Header', 'List', 'Footer'].includes(n.id)">
                  <i class="pw" :data-w="'pw-' + n.id"><b class="pwl" :data-w="'pl-' + n.id" /></i>
                </template>
              </div>
              <i v-for="id in DYNAMIC" :key="'bm' + id" class="beam" :data-w="'bm-' + id" :style="{ left: px(node(id).x), top: px(node(id).y) }" />
              <i class="chip blk" data-w="blk" :style="at(14, 118)">区块 Block：动态节点放进一个扁平的列表</i>
            </div>
            <div class="plane p2b" data-w="p2b">
              <i class="plbl" :style="at(14, 36)">新的一份</i>
              <svg class="edges" :viewBox="`0 0 ${W} ${H}`" aria-hidden="true">
                <path v-for="n in NODES.filter(x => x.parent)" :key="n.id" class="ge" :data-w="'ge-' + n.id" :d="edgePath(n.id)" pathLength="1" />
              </svg>
              <div v-for="n in NODES" :key="n.id" class="gn" :data-w="'gn-' + n.id" :style="at(n.x - 46, n.y - 17, 92, 34)">
                <span>{{ n.label }}</span>
              </div>
            </div>
            <!-- 第 1 层：响应式数据 -->
            <div class="plane p1" data-w="pl1">
              <i class="plbl" :style="at(14, 8)">响应式数据</i>
              <i class="chip ss" data-w="chip" :style="at(14, 34)">&lt;script setup&gt;</i>
              <svg class="lines" :viewBox="`0 0 ${W} ${H}`" aria-hidden="true">
                <path class="dep" data-w="dep" :d="`M${pill('todos').x + 56} ${pill('todos').y} L${pill('remaining').x - 56} ${pill('remaining').y}`" pathLength="1" />
                <path v-for="l in LINKS" :key="l.id" class="dl" :data-w="'dl-' + l.id" :d="linkPath(pill(l.from), node(l.to))" pathLength="1" />
              </svg>
              <div class="gf gf-todos" data-w="gf-todos" :style="at(466, 214, 526, 76)"><b>useTodos()</b></div>
              <div class="gf gf-title" data-w="gf-title" :style="at(176, 214, 148, 120)"><b>useTitle()</b></div>
              <i v-for="c in MOVER_COLUMNS" :key="c.id" class="col" :data-w="'col-' + c.id" :style="at(c.x - 52, 64, 104, 22)">{{ c.label }}</i>
              <div v-for="m in MOVERS" :key="m.id" class="card pill mv" :class="[m.kind, 'g-' + m.group]" :data-w="'mv-' + m.id" :style="at(m.fx - 58, m.fy - 14, 116, 28)">
                <code>{{ m.label }}</code>
                <em class="kd">{{ m.kind === 'fn' ? 'fn' : m.kind }}</em>
              </div>
              <div v-for="d in DATA" :key="d.id" class="card pill" :class="d.kind" :data-w="'d-' + d.id" :style="at(d.x - 58, d.y - 14, 116, 28)">
                <code>{{ d.label }}</code>
                <em class="kd">{{ d.kind }}</em>
                <i class="cf" :data-w="'dp-' + d.id" />
                <i class="pxr" :data-w="'px-' + d.id" />
              </div>
              <i class="eq" data-w="eq" :style="at(pill('remaining').x - 64, pill('remaining').y - 48)">2 → 2 没变</i>
              <i class="hold" data-w="hold" :style="at(pill('remaining').x - 30, pill('remaining').y + 20, 60, 8)" />
              <i class="spark" data-w="spark" :style="{ left: px(pill('todos').x - 22), top: px(pill('todos').y - 60) }">set</i>
            </div>
          </div>
        </div>
      </div>
      <!-- 画面角落：年份、图例、一句话说明 -->
      <div class="finbg" data-w="finbg" aria-hidden="true" />
      <div class="hud">
        <!-- 幕间的过渡元素：起点终点由 film.ts 在布局稳定后量出来 -->
        <i class="fly fa" data-w="fly-a-0" />
        <i class="fly fa" data-w="fly-a-1" />
        <i class="fly fa" data-w="fly-a-2" />
        <i class="fly fb" data-w="fly-b">≠</i>
        <i class="fly fb-ring" data-w="fly-b-ring" />
        <svg class="fly fc" data-w="fly-c" viewBox="-30 -30 60 60" aria-hidden="true">
          <rect x="-22" y="6" width="44" height="14" rx="3" class="l3" />
          <rect x="-22" y="-7" width="44" height="14" rx="3" class="l2" />
          <rect x="-22" y="-20" width="44" height="14" rx="3" class="l1" />
        </svg>
        <div class="mem" data-w="mem">
          <p>内存占用</p>
          <div class="mem-row"><b>3.4</b><span class="mem-bar"><i class="a" data-w="mem-a" /></span></div>
          <div class="mem-row"><b>3.5</b><span class="mem-bar"><i class="b" data-w="mem-b" /></span><u class="mem-n" data-w="mem-n">−56%</u></div>
        </div>
        <div class="year" data-w="year">
          <div class="digits">
            <span v-for="d in [0, 1, 2, 3]" :key="d" class="dg">
              <span class="strip" :data-w="'yd-' + d"><i v-for="i in 10" :key="i">{{ i - 1 }}</i></span>
            </span>
          </div>
          <div class="ybars" aria-hidden="true">
            <i v-for="i in [2, 3, 4, 5, 6, 7]" :key="i" :data-w="'yb-' + i" :style="{ background: ERA_COLORS[i] }" />
          </div>
          <div class="ytags">
            <span v-for="t in TAGS" :key="t.key" :data-w="'yt-' + t.key">{{ t.text }}</span>
          </div>
        </div>
        <div class="callouts">
          <p v-for="c in CALLOUTS" :key="c[0]" class="cl" :class="c[2]" :data-w="c[0]">{{ c[1] }}</p>
        </div>
        <ul class="legend" aria-hidden="true">
          <li class="c-data">数据变化</li>
          <li class="c-render">watcher 与渲染</li>
          <li class="c-commit">更新 DOM</li>
          <li class="c-skip">跳过</li>
        </ul>
      </div>
    </div>

    <!-- 0 开场 -->
    <section class="sc s0" :style="{ '--d': DURATIONS[0] }" aria-labelledby="h-0">
      <span id="scene-0" class="anchor" />
      <div class="sc-copy" data-w="cp-0">
        <p class="eyebrow">Vue 3.5 · 中文互动课程 · 免费</p>
        <h1 id="h-0" aria-label="动手学 Vue 3">
          <span v-for="(c, i) in Array.from('动手学 Vue 3')" :key="i" class="ch" :style="{ '--i': i }" aria-hidden="true">{{ c === ' ' ? '\u00a0' : c }}</span>
        </h1>
        <p class="lead">从第一个组件学到读懂响应式和渲染器的实现。每个知识点都能在页面里运行、修改，练习自动判题。</p>
        <div class="st-actions">
          <a class="btn primary" :href="startHref"><span class="only-new">从第 1 章开始 →</span><span class="only-ret">继续学习<template v-if="resume">：{{ resume.label }}</template> →</span></a>
        </div>
        <p class="st-links">
          <a :href="mapHref">查看课程地图</a>
          <button type="button" class="film-play" hidden>▶ 播放 {{ Math.floor(TOTAL) }} 秒短片</button>
        </p>
        <p class="scroll-hint" aria-hidden="true">向下滚动</p>
      </div>
    </section>

    <section v-for="(s, i) in SCENES" :key="s.id" class="sc" :class="'s' + (i + 1)" :style="{ '--d': DURATIONS[i + 1] }" :aria-labelledby="'h-' + (i + 1)">
      <span :id="s.id" class="anchor" />
      <div class="sc-copy" :data-w="'cp-' + (i + 1)">
        <p class="eyebrow"><b>{{ s.eyebrow[0] }}</b> · {{ s.eyebrow[1] }}</p>
        <h2 :id="'h-' + (i + 1)"><span class="mk"><span class="mk-in"><span v-for="p in parts(s.title)" :key="p" class="ph">{{ p }}</span></span></span></h2>
        <p class="desc">{{ s.text }}</p>
        <p v-if="s.hook" class="hook">{{ s.hook }}</p>
      </div>
    </section>

    <!-- 8 收束：发光的时间轴是视觉主体，上标题、下行动。没有 JS 时它是一张完整可读的列表 -->
    <section class="sc s9" :style="{ '--d': DURATIONS[8] }" aria-labelledby="h-8">
      <span id="scene-8" class="anchor" />
      <div class="sc-copy" data-w="cp-8">
        <div class="fin">
          <header class="fin-head">
            <p class="fin-eyebrow">2015 → 2026</p>
            <h2 id="h-8">
              <span class="mk"><span class="mk-in"><span class="ph">每一代，</span><span class="ph">都在解决<em>上一代留下的问题</em></span></span></span>
            </h2>
            <p class="desc">这门课让你先预测，再运行，最后自己写练习。</p>
          </header>
          <div class="tl">
            <svg class="tl-curve" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
              <path class="tl-base" :d="CURVE" />
              <path class="tl-draw" data-w="tl-draw" :d="CURVE" pathLength="1" />
              <path class="tl-flow" :d="CURVE" pathLength="1" />
            </svg>
            <i class="tl-line" data-w="tl-line" aria-hidden="true" />
            <ol class="eras">
              <li v-for="(st, i) in STATIONS" :key="st.name + st.year" class="era" :class="i % 2 ? 'up' : 'down'" :style="{ '--c': ERA_COLORS[i + 1], '--x': XS[i] / 10 + '%', '--y': (YS[i] / 200) * 100 + '%' }">
                <span class="dt" aria-hidden="true" />
                <div class="era-box">
                  <a class="era-main" :href="chapterHref(st.chapters[0])" :aria-label="`${st.year} ${st.name}：${chapterLabel(st.chapters[0])}`">
                    <span class="yr">{{ st.year }}</span>
                    <b>{{ st.name }}</b>
                    <span class="ln">{{ chapterLabel(st.chapters[0]) }}</span>
                    <span class="tip" aria-hidden="true">{{ SCENES[i].title }}</span>
                  </a>
                  <a v-for="id in st.chapters.slice(1)" :key="id" class="era-more" :href="chapterHref(id)">{{ chapterLabel(id) }}</a>
                </div>
              </li>
            </ol>
          </div>
          <div class="fin-act">
            <dl class="stats3">
              <div v-for="[n, label, extra] in STATS" :key="label">
                <dt :data-count="n">{{ n }}</dt>
                <dd>{{ label }}<span v-if="extra" class="sep">{{ extra }}</span></dd>
              </div>
            </dl>
            <div class="fin-actions">
              <a class="btn primary big" :href="startHref"><span class="only-new">从第 1 章开始 →</span><span class="only-ret">继续学习<template v-if="resume">：{{ resume.label }}</template> →</span></a>
              <a class="btn ghost" :href="mapHref">查看课程地图</a>
            </div>
          </div>
          <p class="foot">个人学习用的开源课程，与 Vue 官方无关。</p>
        </div>
      </div>
    </section>
  </div>
</template>
