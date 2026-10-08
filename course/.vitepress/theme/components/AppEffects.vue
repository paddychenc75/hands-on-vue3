<script setup lang="ts">
// 不显示任何东西，只做几件全站的事（挂在布局的 layout-bottom 插槽里，整个站点只有一个实例）：
//   1. 侧边栏里已完成/进行中章的标记（侧边栏是 VitePress 默认主题渲染的，这里按链接地址补上 data-state）
//   2. 阅读位置：进入一章时记下这章；滚动停下后记下读到的小节（键 last）
//   3. 带 #锚点 进入一章时，实验台和编辑器晚一点才挂载，会把版面撑高，所以持续补对齐（用户没动过才补）
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vitepress'
import { markStoreReady, store, storeRev } from '../composables/store'
import { chapterByPath, chapterState, type LastPos } from '../composables/progress'

const route = useRoute()
let acted = false // 用户在这个页面上动过（滚轮、触摸、按键、点击）
let cleanups: (() => void)[] = []

// ---- 1：侧边栏标记 ----
let paintRaf = 0
function paintSidebar() {
  paintRaf = 0
  document.querySelectorAll<HTMLAnchorElement>('.VPSidebar a[href*="/chapters/"]').forEach(a => {
    const c = chapterByPath(new URL(a.href, location.href).pathname)
    if (!c || c.stage == null) return
    const st = chapterState(c.id)
    if (a.dataset.state !== st) a.dataset.state = st
  })
}
const schedulePaint = () => { if (!paintRaf) paintRaf = requestAnimationFrame(paintSidebar) }

// 侧边栏的内容会变（展开分组等），观察它的子节点增删后重新标记。改属性不触发，所以不会循环。
// 每次换页重新找一次 .VPSidebar（有的页面没有侧边栏）。
let mo: MutationObserver | null = null
function watchSidebar() {
  mo?.disconnect()
  const sb = document.querySelector('.VPSidebar')
  if (!sb) return
  mo = new MutationObserver(schedulePaint)
  mo.observe(sb, { childList: true, subtree: true })
}

// ---- 4：阅读位置 ----
function headingText(h: Element) {
  return (h.textContent || '').replace(/[​#]/g, '').trim().slice(0, 40)
}
function savePos() {
  const c = chapterByPath(route.path)
  if (!c || c.stage == null || !acted) return
  const line = window.innerHeight * 0.25
  const heads = [...document.querySelectorAll('.vp-doc h2[id], .vp-doc h3[id]')]
  let cur: Element | null = null
  for (const h of heads) if (h.getBoundingClientRect().top <= line) cur = h
  store.set('last', { path: c.link, anchor: cur?.id || '', h: cur ? headingText(cur) : '', t: Date.now() } satisfies LastPos)
}
function enterChapter() {
  const c = chapterByPath(route.path)
  if (!c || c.stage == null) return
  const hash = decodeURIComponent(location.hash.slice(1))
  const last = store.get<LastPos | null>('last', null)
  // 同一章保留已有的小节位置，除非地址里带了锚点
  if (last && last.path === c.link && !hash) return
  const el = hash ? document.getElementById(hash) : null
  store.set('last', { path: c.link, anchor: hash, h: el ? headingText(el) : '', t: Date.now() } satisfies LastPos)
}

// ---- 5：带锚点进入时补对齐 ----
// VitePress 进入页面时滚到锚点一次。之后编辑器和实验台陆续挂载，上方内容变高，目标会被挤下去。
// 所以每 0.2 秒把目标拉回到固定位置（顶栏下方），持续 5 秒；用户一动（滚轮、触摸、按键、点击）就停。
function realign() {
  const hash = decodeURIComponent(location.hash.slice(1))
  const el = hash ? document.getElementById(hash) : null
  if (!el) return
  acted = false
  const cs = getComputedStyle(document.documentElement)
  const nav = parseFloat(cs.getPropertyValue('--vp-nav-height')) || 64
  const want = nav + (window.matchMedia('(max-width: 959px)').matches ? 48 : 0) + 24 // 顶栏（手机上还有目录条）加一点空隙
  let n = 0
  const iv = setInterval(() => {
    if (acted || ++n > 25) { clearInterval(iv); return }
    const d = el.getBoundingClientRect().top - want
    if (Math.abs(d) > 4) window.scrollBy({ top: d, behavior: 'instant' as ScrollBehavior })
  }, 200)
  cleanups.push(() => clearInterval(iv))
}

async function onPage() {
  acted = false
  await nextTick()
  setTimeout(() => {
    enterChapter()
    realign()
    watchSidebar()
    schedulePaint()
  }, 60)
}

onMounted(() => {
  markStoreReady()
  const mark = () => { acted = true }
  const evs = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
  evs.forEach(e => window.addEventListener(e, mark, { passive: true, capture: true }))
  let tm = 0
  const onScroll = () => { clearTimeout(tm); tm = window.setTimeout(savePos, 800) }
  const onHide = () => { if (document.visibilityState === 'hidden') savePos() }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('pagehide', savePos)
  document.addEventListener('visibilitychange', onHide)
  cleanups.push(() => {
    evs.forEach(e => window.removeEventListener(e, mark, { capture: true } as any))
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('pagehide', savePos)
    document.removeEventListener('visibilitychange', onHide)
    mo?.disconnect()
    clearTimeout(tm)
  })
  onPage()
})
onBeforeUnmount(() => { cleanups.forEach(f => f()); cleanups = [] })

watch(() => route.path, onPage)
// 进度变化（包括别的标签页改的）：重新应用
watch(storeRev, () => { schedulePaint() })
</script>

<template><span hidden /></template>
