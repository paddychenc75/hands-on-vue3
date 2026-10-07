#!/usr/bin/env node
// 比较旧 <section> 和构建后的新页面：数量、文字、残留标记。
//
//   node scripts/compare.mjs <section id> [--build] [--dist 构建目录] [--course course 目录]
//
// --build：自己只构建这一章到临时目录再比较，用完删除（迁移时用这个，多个 agent 同时跑互不影响）。
// 不加 --build：读 --dist、COURSE_OUT_DIR 或 course/.vitepress/dist 里的 chapters/NN-id.html（要先构建好）。
// 没有输出差异、退出码 0，就表示“正文没有丢失”。退出码 1 表示有差异，2 表示用法或环境问题。
//
// 对照时排除的“界面性差异”（两边的这些都不比）：
//   旧：章头的“第 N 章”、下一章链接、实验台正文 .lab-body（旧版里由脚本生成）、练习（.ex）、自测解析 .sc-x
//   新：标题锚点的零宽字符、代码块的语言标签和复制按钮、“跳过，直接打开实验台”、自测解析 .sc-x（答题前不渲染）、实验台正文、练习
//   旧的 <script type="text/x-code"> 还原转义后和新的代码块比；
//   自测解析另外拿旧文字和 .md 源文件里 #explain 插槽的文字比（去掉 Markdown 记号后）。
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, loadSection, sectionMeta, chapterFile } from './lib/old.mjs'
import { buildChapters } from './lib/build.mjs'
import { parse, elements, cls, hasClass, textOf, walk, decodeEntities } from './lib/html.mjs'

const argv = process.argv.slice(2)
const opt = k => { const i = argv.indexOf(k); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v }
const flag = k => { const i = argv.indexOf(k); if (i < 0) return false; argv.splice(i, 1); return true }
const BUILD = flag('--build')
const COURSE = path.resolve(opt('--course') || path.join(ROOT, 'course'))
let DIST = path.resolve(opt('--dist') || process.env.COURSE_OUT_DIR || path.join(COURSE, '.vitepress/dist'))
if (argv.length !== 1) { console.error('用法：node scripts/compare.mjs <section id> [--build] [--dist 构建目录] [--course course 目录]'); process.exit(2) }
const id = argv[0]

const meta = sectionMeta().find(m => m.id === id)
if (!meta) { console.error('旧 HTML 里没有这个 section id：' + id); process.exit(2) }
const base = chapterFile(meta)
let built = null
if (BUILD) {
  try { built = buildChapters([base]) } catch (e) { console.error(e.message); process.exit(2) }
  DIST = built.dist
  process.on('exit', () => built.cleanup())
}
const pageFile = path.join(DIST, 'chapters', base + '.html')
const mdFile = path.join(COURSE, 'chapters', base + '.md')
if (!fs.existsSync(pageFile)) { console.error(`没有构建结果：${pageFile}\n先构建（npm run build，或只构建这一章，见本文件开头的说明）`); process.exit(2) }

const old = loadSection(id)
const root = parse(fs.readFileSync(pageFile, 'utf8'))
let doc = null
walk(root, n => { if (!doc && n.type === 'el' && hasClass(n, 'vp-doc')) doc = n })
if (!doc) { console.error('新页面里找不到 .vp-doc：' + pageFile); process.exit(2) }

// ---------------------------------------------------------------- 取文字单元
const BLOCK = new Set(['p', 'li', 'ul', 'ol', 'div', 'h1', 'h2', 'h3', 'h4', 'td', 'th', 'tr', 'table', 'dt', 'dd', 'dl', 'summary', 'details', 'pre', 'button', 'figcaption', 'figure', 'section', 'text', 'br', 'blockquote', 'thead', 'tbody', 'svg'])
const ZW = /[​‌‍﻿]/g
const norm = s => s.replace(ZW, '').replace(/\s+/g, '')

function xcodeText(n) {
  return n.children.map(c => c.value || '').join('').replace(/<\\\/script>/g, '</script>').replace(/<\\!--/g, '<!--').replace(/^\n/, '')
}

function units(rootEl, side) {
  const out = []
  let buf = ''
  const flush = () => { const t = buf.replace(ZW, '').replace(/\s+/g, ' ').trim(); if (norm(t)) out.push(t); buf = '' }
  const skip = el => {
    if (['script', 'style', 'template'].includes(el.tag) && !(side === 'old' && el.attrs.type === 'text/x-code')) return true
    if (hasClass(el, 'lab-body') || hasClass(el, 'ex') || hasClass(el, 'sc-x')) return true
    if (side === 'old') return hasClass(el, 'kicker') || hasClass(el, 'nextch')
    return hasClass(el, 'header-anchor') || hasClass(el, 'copy') || hasClass(el, 'lang') || hasClass(el, 'pr-skip') || hasClass(el, 'visually-hidden')
  }
  const visit = n => {
    if (n.type === 'comment') return
    if (n.type === 'text') { buf += n.raw ? n.value : decodeEntities(n.value); return }
    if (skip(n)) return
    if (side === 'old' && n.tag === 'script') { flush(); out.push(xcodeText(n).replace(/\s+$/, '')); return }
    if (n.tag === 'pre' || (side === 'new' && hasClass(n, 'shiki'))) { flush(); out.push(textOf(n)); return }
    const blk = BLOCK.has(n.tag) || hasClass(n, 'goal-item')
    if (blk) flush()
    for (const c of n.children) visit(c)
    if (blk) flush()
  }
  visit(rootEl)
  flush()
  return out.map(t => t.replace(ZW, '')).filter(t => norm(t))
}

// ---------------------------------------------------------------- 数量
function find(rootEl, pred) { const r = []; walk(rootEl, n => { if (n !== rootEl && n.type === 'el' && pred(n)) r.push(n) }); return r }
const tagCls = (n, t, c) => n.tag === t && (c ? hasClass(n, c) : true)
const counts = [
  ['小节（h3）', el => tagCls(el, 'h3'), el => tagCls(el, 'h3')],
  ['代码块', el => (el.tag === 'script' && el.attrs.type === 'text/x-code') || hasClass(el, 'sc-code'), el => cls(el).some(c => /^language-/.test(c))],
  ['深入块', el => tagCls(el, 'details', 'deep'), el => tagCls(el, 'details', 'deep')],
  ['想一想', el => tagCls(el, 'details', 'think'), el => tagCls(el, 'details', 'think')],
  ['自测题', el => hasClass(el, 'sc') && !hasClass(el, 'predict'), el => hasClass(el, 'sc') && !hasClass(el, 'predict')],
  ['先猜题', el => hasClass(el, 'sc') && hasClass(el, 'predict'), el => hasClass(el, 'sc') && hasClass(el, 'predict')],
  ['练习', el => el.tag === 'div' && hasClass(el, 'ex'), el => el.tag === 'div' && hasClass(el, 'ex')],
  ['实验台', el => el.tag === 'div' && hasClass(el, 'lab'), el => el.tag === 'div' && hasClass(el, 'lab')],
  ['示意图', el => tagCls(el, 'figure', 'fig'), el => tagCls(el, 'figure', 'fig')],
  ['表格', el => el.tag === 'table', el => el.tag === 'table'],
  ['目标条目', el => el.tag === 'li' && el.parent && hasClass(el.parent.parent || {}, 'goal'), el => hasClass(el, 'goal-item')],
  ['术语', el => el.tag === 'dt', el => el.tag === 'dt'],
  ['注意/小结条目', el => el.tag === 'li' && el.parent && (hasClass(el.parent.parent || {}, 'pitfalls') || hasClass(el.parent.parent || {}, 'summary')), el => el.tag === 'li' && el.parent && (hasClass(el.parent.parent || {}, 'pitfalls') || hasClass(el.parent.parent || {}, 'summary'))]
]
let bad = 0
const line = []
console.log(`[compare] ${id}：旧 HTML 第 ${meta.start}-${meta.end} 行  ↔  ${path.relative(ROOT, pageFile)}`)
console.log('数量对照（旧 / 新）：')
for (const [name, fo, fn] of counts) {
  const a = find(old.el, fo).length, b = find(doc, fn).length
  const ok = a === b
  if (!ok) bad++
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(10, '　')} ${String(a).padStart(3)} / ${String(b).padEnd(3)}${ok ? '' : '   ← 数量不一致'}`)
}

// ---------------------------------------------------------------- 文字
const ou = units(old.el, 'old'), nu = units(doc, 'new')
const ok_ = ou.map(norm), nk = nu.map(norm)
// LCS
const n = ok_.length, m = nk.length
const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = ok_[i] === nk[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
const diffs = []
{
  let i = 0, j = 0, rm = [], ad = []
  const emit = () => { if (rm.length || ad.length) diffs.push({ rm, ad }); rm = []; ad = [] }
  while (i < n || j < m) {
    if (i < n && j < m && ok_[i] === nk[j]) { emit(); i++; j++ }
    else if (j >= m || (i < n && dp[i + 1][j] >= dp[i][j + 1])) rm.push(ou[i++])
    else ad.push(nu[j++])
  }
  emit()
}
const clip = (s, k = 110) => (s.length > k ? s.slice(0, k) + '…' : s).replace(/\n/g, '⏎')
console.log(`文字对照：旧 ${ou.length} 段 / 新 ${nu.length} 段，` + (diffs.length ? `${diffs.length} 处不一致：` : '没有不一致'))
for (const d of diffs) {
  bad++
  for (const s of d.rm) console.log('  - 旧有新无：' + clip(s))
  for (const s of d.ad) console.log('  + 新有旧无：' + clip(s))
  console.log('')
}

// ---------------------------------------------------------------- 自测解析（对照 .md 源文件）
if (fs.existsSync(mdFile)) {
  const mdText = fs.readFileSync(mdFile, 'utf8')
  const mdEx = [...mdText.matchAll(/<template #explain>([\s\S]*?)<\/template>/g)].map(x => x[1])
  const clean = s => s.replace(/<\/?b>|<\/?i>/g, '').replace(/[\\`*]/g, '').replace(/\s+/g, '')
  const oldEx = find(old.el, el => hasClass(el, 'sc-x')).map(e => textOf(e))
  const exBad = []
  if (oldEx.length !== mdEx.length) exBad.push(`解析数量：旧 ${oldEx.length} / .md 里 ${mdEx.length}`)
  oldEx.forEach((t, i) => { if (mdEx[i] != null && clean(t) !== clean(mdEx[i])) exBad.push(`第 ${i + 1} 条解析不同：\n      旧：${clip(t.replace(/\s+/g, ' ').trim(), 90)}\n      新：${clip(mdEx[i].replace(/\s+/g, ' ').trim(), 90)}`) })
  console.log(`自测解析（对照 .md）：旧 ${oldEx.length} 条 / 新 ${mdEx.length} 条，` + (exBad.length ? '有差异：' : '一致'))
  for (const e of exBad) { bad++; console.log('  ✗ ' + e) }
} else console.log(`（找不到 ${path.relative(ROOT, mdFile)}，跳过解析对照）`)

// ---------------------------------------------------------------- 残留标记
// 在页面文字里（不含代码块和行内代码）找迁移失败的迹象
const stray = []
const RESID = [[/\*\*/, '字面的 **（粗体没生效，见 AUTHORING 踩坑 3）'], [/&(lt|gt|amp|quot);/, '字面的 HTML 实体（见 AUTHORING 踩坑 4.5）'], [/:::/, '字面的 :::（容器没闭合或嵌套冒号不够）'], [/TODO/, 'TODO（有占位没改写）'], [/\]\(\/chapters\//, '字面的 Markdown 链接']]
walk(doc, el => {
  if (el.type !== 'el') return
  if (['script', 'style', 'pre', 'code'].includes(el.tag) || hasClass(el, 'ex') || hasClass(el, 'copy')) return
  for (const c of el.children) {
    if (c.type !== 'text') continue
    const t = decodeEntities(c.value).replace(ZW, '')
    for (const [re, why] of RESID) if (re.test(t)) stray.push([why, clip(t.trim(), 80)])
  }
})
// 实验台正文只在浏览器里渲染，构建出的 HTML 里看不到 <LabTodo>，所以另外扫 .md 源文件
if (fs.existsSync(mdFile)) {
  const todo = (fs.readFileSync(mdFile, 'utf8').match(/<LabTodo\b[^>]*>/g) || [])
  for (const t of todo) stray.push(['TODO（实验台占位 <LabTodo> 还没改写）', clip(t, 80)])
}
console.log('残留检查：' + (stray.length ? `发现 ${stray.length} 处：` : '没有 **、实体、:::、TODO'))
for (const [why, ctx] of stray) { bad++; console.log(`  ✗ ${why}：${ctx}`) }

console.log(bad ? `\n未通过：${bad} 项差异` : '\n通过：数量一致，正文没有丢失')
process.exit(bad ? 1 : 0)
