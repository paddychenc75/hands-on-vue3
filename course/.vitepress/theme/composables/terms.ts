// 术语标注：正文里的术语带虚线下划线，悬停、聚焦或点按显示定义（定义来自各章“本章术语”块，见 course-data.mts）。
//
// 规则（改规则时同步改 course/AUTHORING.md 和 tests/site/glossary.test.js）：
//   1. 只在章正文的文字里标。代码块、行内代码、标题、链接、术语块自身、目标、类比、自测、实验台、练习、热身、自我解释、图都不标
//   2. 每个术语在每个小节（h2/h3 之间）只标第一次出现
//   3. 只标“已经学过”的术语：这一章或更早的章里有术语块定义它的
//   4. 匹配规则（最长优先、复合词里的子串不标、纯英文术语要词边界）在 term-match.ts，有单元测试
// 做法：在浏览器里遍历文本节点，把匹配的文字换成 <abbr class="term">。Vue 的静态内容不会被再次修补，所以不会和 Vue 冲突；
// 每次换页前先把上一次的标注还原，所以重复执行是安全的。
import { glossary as GLOSSARY } from 'virtual:course-glossary'
import type { GlossaryEntry } from '../../course-data.mts'
import { WRITING_TERMS } from '../../../writing-terms.mjs'
import { buildMatcher, findTerms } from './term-match'

const SKIP = [
  'code', 'pre', 'a', 'abbr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'summary', 'button', 'textarea', 'input', 'figure', 'svg', 'script', 'style',
  '.terms', '.goal', '.analogy', '.selfcheck', '.sc', '.q', '.lab', '.ex', '.warmup', '.selfx', '.chapter-foot', '.ch-meta', '.sx-hidden', '.ed'
].join(',')

const glossary: GlossaryEntry[] = GLOSSARY
// 全部已知术语：所有章的术语加写作规则表里的术语。用来判断“子组件”这类复合词，见 term-match.ts
const KNOWN = [...new Set([...glossary.map(g => g.term), ...WRITING_TERMS.flatMap(w => w.terms)])]

/** 还原上一次的标注 */
export function clearTerms(root: ParentNode) {
  root.querySelectorAll('abbr.term').forEach(a => a.replaceWith(document.createTextNode(a.textContent || '')))
}

/** 在 root 里标注术语。chapterNo 是当前章号：只标这一章及更早的章定义的术语。返回标注数 */
export function markTerms(root: HTMLElement, chapterNo: number): number {
  const all = glossary
  clearTerms(root)
  const known = all.filter(g => g.chapters[0].chapter != null && g.chapters[0].chapter <= chapterNo)
  if (!known.length) return 0
  const byTerm = new Map(known.map(g => [g.term, g]))
  const matcher = buildMatcher([...byTerm.keys()], KNOWN)

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text)

  let seen = new Set<string>()
  let section: Element | null = null
  let count = 0
  for (const node of nodes) {
    const el = node.parentElement
    if (!el) continue
    // 遇到新的小节标题，“已标过”清零
    const h = el.closest('h2, h3')
    if (h) { if (h !== section) { section = h; seen = new Set() } continue }
    if (el.closest(SKIP)) continue
    const text = node.nodeValue || ''
    const hits: { i: number; term: string }[] = []
    for (const h of findTerms(text, matcher)) {
      if (seen.has(h.term)) continue
      seen.add(h.term)
      hits.push(h)
    }
    if (!hits.length) continue
    const frag = document.createDocumentFragment()
    let at = 0
    for (const { i, term } of hits) {
      if (i > at) frag.append(text.slice(at, i))
      const g = byTerm.get(term)!
      const ab = document.createElement('abbr')
      ab.className = 'term'
      ab.tabIndex = 0
      ab.dataset.term = term
      ab.setAttribute('aria-label', `${term}：${g.text}`)
      ab.textContent = term
      frag.append(ab)
      at = i + term.length
      count++
    }
    if (at < text.length) frag.append(text.slice(at))
    node.replaceWith(frag)
  }
  return count
}

// ---- 悬浮提示：整个站点一个气泡，悬停/聚焦/点按时显示，移开/失焦/点别处/Esc 隐藏 ----
let tip: HTMLElement | null = null
let current: HTMLElement | null = null
let shownAt = 0 // 气泡显示的时间。触屏一次点按会依次触发聚焦和点击，点击发生在刚显示后不能把它关掉

function hide() {
  if (tip) tip.hidden = true
  current = null
}
function show(ab: HTMLElement) {
  const g = glossary.find(x => x.term === ab.dataset.term)
  if (!g) return
  if (!tip) {
    tip = document.createElement('div')
    tip.className = 'term-tip'
    tip.setAttribute('role', 'tooltip')
    document.body.append(tip)
  }
  const first = g.chapters[0]
  tip.replaceChildren()
  const b = document.createElement('b'); b.textContent = g.term
  const p = document.createElement('span'); p.textContent = g.text
  const src = document.createElement('small'); src.textContent = first.chapter != null ? `第 ${first.chapter} 章《${first.title}》` : first.title
  tip.append(b, p, src)
  tip.hidden = false
  current = ab
  shownAt = Date.now()
  const r = ab.getBoundingClientRect()
  const w = Math.min(320, window.innerWidth - 16)
  tip.style.width = w + 'px'
  const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8))
  tip.style.left = left + 'px'
  const h = tip.offsetHeight
  // 下方放不下就放到上方
  const top = r.bottom + 6 + h > window.innerHeight ? Math.max(8, r.top - 6 - h) : r.bottom + 6
  tip.style.top = top + 'px'
}

let bound = false
/** 全站只绑一次的事件委托。有鼠标的设备：悬停显示、移开隐藏；触屏：点一下显示（再点同一处或点别处隐藏）；键盘：聚焦显示，Esc 隐藏 */
export function bindTermTips() {
  if (bound) return
  bound = true
  const canHover = () => window.matchMedia('(hover: hover)').matches
  const target = (e: Event) => (e.target as HTMLElement | null)?.closest?.('abbr.term') as HTMLElement | null
  document.addEventListener('mouseover', e => { const a = target(e); if (a && canHover()) show(a) })
  document.addEventListener('mouseout', e => { const a = target(e); if (a && a === current && canHover() && !a.contains((e as MouseEvent).relatedTarget as Node | null)) hide() })
  document.addEventListener('focusin', e => { const a = target(e); if (a) show(a) })
  document.addEventListener('focusout', e => { if (target(e)) hide() })
  document.addEventListener('click', e => {
    const a = target(e)
    if (!a) hide()
    else if (!canHover() && current === a && tip && !tip.hidden && Date.now() - shownAt > 500) hide()
    else show(a)
  })
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide() })
  window.addEventListener('scroll', hide, { passive: true })
}
