// 统计每个待迁章节的规模，给分批用：node scripts/html2md.mjs --stats
import { sectionMeta, loadSection, scriptText, chapterFile } from './old.mjs'
import { hasClass, walk } from './html.mjs'
import { extractExercises } from './exercises.mjs'

import { BIG } from './old.mjs'

export function collectStats() {
  const S = scriptText()
  const lines = S.text.split('\n')
  const L0 = S.startLine
  const metas = sectionMeta()
  // 所有实验台 id → 旧脚本里的挂载行
  const sections = metas.map(m => ({ m, s: loadSection(m.id) }))
  const mounts = []
  for (const { m, s } of sections) {
    walk(s.el, n => {
      if (n.type === 'el' && hasClass(n, 'lab-body') && n.attrs.id) {
        const id = n.attrs.id
        const hit = []
        lines.forEach((l, i) => { if (l.includes(`'#${id}'`) || l.includes(`"#${id}"`)) hit.push(L0 + i) })
        const ln = hit[0]
        const endStyle = ln != null && /\},\s*'#/.test(lines[ln - L0])
        mounts.push({ sec: m.id, id, line: ln, endStyle })
      }
    })
  }
  const bigRanges = Object.values(BIG)
  const inBig = ln => bigRanges.some(b => ln >= b.from && ln <= b.to)
  const ms = mounts.filter(x => x.line != null && !inBig(x.line)).sort((a, b) => a.line - b.line)
  const labLines = {}
  ms.forEach((x, i) => {
    const prev = i ? ms[i - 1].line : x.line - 40
    const next = i < ms.length - 1 ? ms[i + 1].line : x.line + 40
    // 结尾式：代码在挂载行之前；开头式：代码在挂载行之后
    const size = x.endStyle ? x.line - prev : next - x.line
    x.size = Math.max(10, Math.min(size, 160))
    labLines[x.sec] = (labLines[x.sec] || 0) + x.size
  })
  const rows = []
  for (const { m, s } of sections) {
    const cnt = { lab: 0, ex: 0, fig: 0, sc: 0, h3: 0, deep: 0, tbl: 0 }
    walk(s.el, n => {
      if (n.type !== 'el') return
      if (hasClass(n, 'lab')) cnt.lab++
      if (hasClass(n, 'ex')) cnt.ex++
      if (n.tag === 'figure') cnt.fig++
      if (hasClass(n, 'sc') && !hasClass(n, 'predict')) cnt.sc++
      if (n.tag === 'h3') cnt.h3++
      if (n.tag === 'details' && hasClass(n, 'deep')) cnt.deep++
      if (n.tag === 'table') cnt.tbl++
    })
    let exLines = 0
    try {
      const ex = extractExercises(m)
      exLines = ex.ts.split('\n').length
    } catch { /* 没有练习 */ }
    const big = BIG[m.id]
    const htmlLines = m.end - m.start + 1
    const labCode = (labLines[m.id] || 0) + (big ? big.to - big.from + 1 : 0)
    // 工作量点数：正文行 /10 + 实验台改写行 /5（手写大件再 ×1.5）+ 练习复核每道 3 + 示意图每张 1
    const weight = Math.round(htmlLines / 10 + (labCode - (big ? big.to - big.from + 1 : 0)) / 5 + (big ? ((big.to - big.from + 1) / 5) * 1.5 : 0) + cnt.ex * 3 + cnt.fig)
    rows.push({ id: m.id, file: chapterFile(m), title: m.title, htmlLines, ...cnt, labCode, exLines, big: big ? big.name : '', weight })
  }
  return rows
}

/** 贪心分批（最重的先放进当前最轻的一批），保持每批内按章序 */
export function batches(rows, k) {
  const todo = rows.filter(r => !['first', 'template'].includes(r.id)).sort((a, b) => b.weight - a.weight)
  const bs = Array.from({ length: k }, () => ({ items: [], weight: 0 }))
  for (const r of todo) { const b = bs.reduce((a, c) => (c.weight < a.weight ? c : a)); b.items.push(r); b.weight += r.weight }
  for (const b of bs) b.items.sort((a, c) => a.file.localeCompare(c.file))
  return bs
}
