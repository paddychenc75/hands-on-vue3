#!/usr/bin/env node
// 把旧课程 vue3-course.html 里的一章 <section> 机械转换成 course/chapters/NN-id.md 初稿。
//
//   node scripts/html2md.mjs <section id> [--force] [--out 目录]    生成章节初稿（含示意图 SFC）
//   node scripts/html2md.mjs --exercises <section id> [--force] [--out 目录]   生成 course/exercises/NN-id.ts 初稿
//   node scripts/html2md.mjs --list                                 列出所有 section id
//
// 已存在的文件不覆盖（除非 --force）。--out 把 chapters/ figures/ exercises/ 生成到另一个目录（试跑用）。
// 不认识的结构不会被悄悄丢掉：原样保留成 HTML，并在标准输出里报告旧文件的行号。
// 实验台只生成 <Lab> 外壳和“先猜”题，正文是 <LabTodo> 占位，要人工改写成 SFC。
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, loadSection, sectionMeta, chapterFile, oldLines, scriptText, BIG } from './lib/old.mjs'
import { elements, hasClass, cls, textOf, walk, outerHTML, decodeEntities } from './lib/html.mjs'
import { inlineMd, plain, escText, codeSpan, isInlineNode } from './lib/inline.mjs'
import { extractExercises } from './lib/exercises.mjs'

// ---------------------------------------------------------------- 命令行
const argv = process.argv.slice(2)
const flag = k => { const i = argv.indexOf(k); if (i >= 0) { argv.splice(i, 1); return true } return false }
const opt = k => { const i = argv.indexOf(k); if (i >= 0) { const v = argv[i + 1]; argv.splice(i, 2); return v } return null }
const FORCE = flag('--force')
const EXERCISES = flag('--exercises')
const LIST = flag('--list')
const STATS = flag('--stats')
const outArg = argv.includes('--out') ? opt('--out') : null
if (argv.includes('--out') || (outArg === undefined)) { console.error('--out 需要一个目录'); process.exit(2) }
const OUT = outArg ? path.resolve(outArg) : null
const COURSE = OUT || path.join(ROOT, 'course')

if (STATS) {
  const { collectStats, batches } = await import('./lib/stats.mjs')
  const rows = collectStats()
  console.log(['章', 'id', '标题', 'HTML行', '实验台', '练习', '图', '自测', '深入', '表', '实验台代码行', '练习代码行', '大型交互', '点数'].join('\t'))
  for (const r of rows) console.log([r.file, r.id, r.title, r.htmlLines, r.lab, r.ex, r.fig, r.sc, r.deep, r.tbl, r.labCode, r.exLines, r.big, r.weight].join('\t'))
  const k = Number(process.env.BATCHES || 6)
  console.log('\n建议分 ' + k + ' 批（贪心均衡点数；第 1、2 章已迁，不计）：')
  batches(rows, k).forEach((b, i) => console.log(`批 ${i + 1}（${b.weight} 点）：` + b.items.map(r => r.file).join('、')))
  process.exit(0)
}
if (LIST) { for (const m of sectionMeta()) console.log(String(m.chapter ?? '附').padStart(2), m.id.padEnd(12), m.title, `(旧 HTML 第 ${m.start}-${m.end} 行)`); process.exit(0) }
if (argv.length !== 1) {
  console.error('用法：node scripts/html2md.mjs [--exercises] <section id> [--force] [--out 目录]\n      node scripts/html2md.mjs --list')
  process.exit(2)
}

// ---------------------------------------------------------------- 公共
const METAS = sectionMeta()
const byId = Object.fromEntries(METAS.map(m => [m.id, m]))
const A = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const fm = v => (/^[\s'"\[\]{}>|*&!%@`#,-]|: | #|:$|\s$/.test(v) || v === '' ? JSON.stringify(v) : v)

/** 容器：外层冒号数要比内层多 */
function container(name, info, body) {
  let n = 3
  for (const m of body.matchAll(/^(:{3,})/gm)) n = Math.max(n, m[1].length + 1)
  const c = ':'.repeat(n)
  return `${c} ${name}${info ? ' ' + info : ''}\n${body}\n${c}`
}
function fence(lang, code) {
  let n = 3
  for (const m of code.matchAll(/^\s*(`{3,})/gm)) n = Math.max(n, m[1].length + 1)
  const f = '`'.repeat(n)
  return `${f}${lang}\n${code}\n${f}`
}

/** 猜代码块语言：html / vue / js / ts / css / bash / json */
function guessLang(code) {
  const c = code.trim()
  const first = c.split('\n').find(l => l.trim() && !/^\s*(\/\/|\/\*|#)/.test(l)) || ''
  if (/^(\$ )?(npm|npx|pnpm|yarn|node|git|cd|mkdir|vite|vitepress|corepack) /.test(first) && !/[{};]/.test(first)) return 'bash'
  const hasTag = /^\s*<[A-Za-z!\/]/m.test(c)
  const hasJs = /(^|\n)\s*(const|let|var|function|import|export|return|if|for|watch|onMounted|class)\b|=>|\bref\(|\breactive\(|\bcomputed\(|\bcreateApp\(|\.value\b/.test(c)
  if (/<!doctype|<script (type="module"|src=)/i.test(c)) return 'html' // 整页 HTML
  if (/^<(template>|script (setup|lang)|style( scoped| lang|>))/m.test(c)) return 'vue' // 单文件组件
  if (hasTag && hasJs) return 'vue'
  if (hasTag) return 'html'
  if (/^\s*[{\[]/.test(c) && /"\s*:/.test(c)) { try { JSON.parse(c); return 'json' } catch { /* 不是 JSON */ } }
  if (/(^|\n)\s*(interface|type)\s+\w+/.test(c) || /(:\s*(string|number|boolean|void|unknown)\b|<\w+>\()|\bas const\b|defineProps<|defineEmits<|\bsatisfies\b/.test(c)) return 'ts'
  if (/^\s*[@.#:a-zA-Z][^{};=]*\{[^}]*:[^}]*;?[^}]*\}/m.test(c) && !hasJs) return 'css'
  return 'js'
}

function xcode(node) {
  const raw = node.children.map(c => c.value || '').join('')
  return raw.replace(/<\\\/script>/g, '</script>').replace(/<\\!--/g, '<!--').replace(/^\n/, '').replace(/\s+$/, '')
}
const isXcode = n => n.type === 'el' && n.tag === 'script' && (n.attrs.type || '') === 'text/x-code'

// ---------------------------------------------------------------- 转换器
function convertSection(id) {
  const { meta, el, warns } = loadSection(id)
  const NN = meta.chapter ? String(meta.chapter).padStart(2, '0') : ''
  const fileBase = chapterFile(meta)
  const script = scriptText()
  const rep = { unknown: [], labs: [], figures: [], warn: [], counts: {} }
  const count = k => { rep.counts[k] = (rep.counts[k] || 0) + 1 }
  for (const w of warns) rep.warn.push('旧 HTML 解析：' + w)
  const imports = []

  const unknown = (n, why) => rep.unknown.push({ line: n.line || n.parent?.line || '?', why })
  const ictx = {
    unknown,
    href(href, n) {
      if (/^https?:/.test(href)) return href
      const m = /^#(.+)$/.exec(href)
      if (m && byId[m[1]]) return '/chapters/' + chapterFile(byId[m[1]])
      unknown(n, `链接 ${href} 不是章内 section，原样保留`)
      return href
    }
  }
  const inl = nodes => inlineMd(nodes, ictx)

  /** 一个元素的行内内容 → 一段 Markdown（含段首转义） */
  function para(nodes) {
    const t = inl(nodes).trim()
    return escapeLead(t)
  }
  function escapeLead(t) {
    if (/^(#{1,6}\s|[-+>]|\d+[.)]\s|:::|=+$|[:~]\s)/.test(t)) return '\\' + t
    return t
  }

  /** 子节点 → 块数组。连续的行内节点合成一段 */
  function blocks(children, where) {
    const out = []
    let run = []
    const flush = () => {
      if (run.some(n => n.type === 'el' || (n.type === 'text' && n.value.trim()))) out.push(para(run))
      run = []
    }
    for (const n of children) {
      if (n.type === 'comment') continue
      if (n.type === 'text') { run.push(n); continue }
      if (n.type === 'el' && n.tag === 'a' && hasClass(n, 'nextch')) continue // 下一章链接由 VitePress 生成
      if (isInlineNode(n) && !isXcode(n)) { run.push(n); continue }
      flush()
      rep.prevDynamic = rep.lastDynamic; rep.lastDynamic = false // 连续的“脚本驱动区域”只列一个占位
      const b = block(n, where)
      if (b != null) out.push(...[].concat(b))
    }
    flush()
    return out.filter(s => s !== '')
  }

  function list(n) {
    const ordered = n.tag === 'ol'
    let k = Number(n.attrs.start || 1)
    const lines = []
    for (const li of elements(n)) {
      if (li.tag !== 'li') { unknown(li, `<${n.tag}> 里有 <${li.tag}>`); continue }
      count('li')
      const marker = ordered ? `${k++}. ` : '- '
      const pad = ' '.repeat(marker.length)
      const bs = blocks(li.children, 'li')
      const tight = bs.every((b, i) => i === 0 || /^(\s*)([-+]|\d+\.) /.test(b) && !/\n\n/.test(b))
      let text = ''
      bs.forEach((b, i) => {
        const body = b.split('\n').map((l, j) => (j === 0 && i === 0 ? l : l ? pad + l : l)).join('\n')
        text += (i === 0 ? '' : tight ? '\n' : '\n\n') + body
      })
      lines.push(marker + text)
    }
    return lines.join(n.tag === 'ol' || lines.some(l => /\n\n/.test(l)) ? '\n' : '\n')
  }

  function cellMd(td) { return inlineMd(td.children, { ...ictx, cell: true }).trim() }
  function table(t) {
    count('table')
    const rows = []
    walk(t, n => { if (n.type === 'el' && n.tag === 'tr') rows.push(n) })
    const cells = rows.map(r => elements(r))
    const complex = rows.some(r => elements(r).some(c => c.attrs.rowspan || c.attrs.colspan || elements({ children: c.children }).some(x => !isInlineNode(x))))
    const headerOk = cells[0] && cells[0].every(c => c.tag === 'th') && cells.slice(1).every(r => r.every(c => c.tag === 'td'))
    if (complex || !headerOk) {
      rep.warn.push(`第 ${t.line} 行的表格有 rowspan/colspan 或无表头，保留为 HTML 表格（${complex ? '复杂单元格' : '无表头'}）`)
      let h = outerHTML(t).replace(/\n\s*\n/g, '\n')
      h = h.replace(/^<table\b/, '<table v-pre')
      return `<div class="tbl-wrap">\n${h}\n</div>`
    }
    const w = cells[0].length
    const line = r => '| ' + r.map(cellMd).concat(Array(Math.max(0, w - r.length)).fill('')).join(' | ') + ' |'
    return [line(cells[0]), '|' + '---|'.repeat(w), ...cells.slice(1).map(line)].join('\n')
  }

  function figure(f) {
    count('figure')
    const svg = elements(f).find(e => e.tag === 'svg')
    const cap = elements(f).find(e => e.tag === 'figcaption')
    if (!svg) { unknown(f, '<figure> 里没有 <svg>'); return outerHTML(f) }
    const n = rep.figures.length + 1
    const capText = cap ? plain(cap) : ''
    const aria = svg.attrs['aria-label'] || ''
    const stop = new Set(['the', 'and', 'DOM', 'is', 'to'])
    const toks = [...new Set((capText + ' ' + aria).match(/[A-Za-z][A-Za-z0-9]*/g) || [])].filter(w => !stop.has(w)).slice(0, 3)
    const name = 'Fig' + n + toks.map(w => w[0].toUpperCase() + w.slice(1)).join('').replace(/[^A-Za-z0-9]/g, '')
    let src = outerHTML(svg)
    // SVG 里的 {{ 会被 Vue 当插值：给含 {{ 的 <text>/<tspan> 加 v-pre
    const ins = []
    walk(svg, e => {
      if (e.type === 'el' && e.tag !== 'svg' && e.children.some(c => c.type === 'text' && /\{\{/.test(c.value)) && !('v-pre' in e.attrs)) ins.push(e.start - svg.start + 1 + e.tag.length)
    })
    ins.sort((a, b) => b - a).forEach(p => { src = src.slice(0, p) + ' v-pre' + src.slice(p) })
    const vue = `<template>\n  ${src.replace(/\n/g, '\n  ')}\n</template>\n`
    rep.figures.push({ name, file: `figures/${fileBase}/${name}.vue`, vue, line: f.line, vpre: ins.length })
    imports.push(`import ${name} from '../figures/${fileBase}/${name}.vue'`)
    const richCap = cap && cap.children.some(c => c.type === 'el')
    if (!cap) return `<Figure>\n<${name} />\n</Figure>`
    if (richCap) return `<Figure>\n<${name} />\n<template #caption>\n\n${para(cap.children)}\n\n</template>\n</Figure>`
    return `<Figure caption="${A(capText.replace(/\s+/g, ' ').trim())}">\n<${name} />\n</Figure>`
  }

  /** 自测题。predict=true 是实验台里的“先猜”题 */
  function sc(d, predict) {
    count(predict ? 'predict' : 'sc')
    const a = d.attrs['data-a'] ?? '0'
    const q = [], opts = []
    let explain = []
    for (const c of d.children) {
      if (c.type !== 'el') continue
      if (hasClass(c, 'sc-q')) q.push(para(c.children))
      else if (hasClass(c, 'sc-code')) q.push(fence(guessLang(plain(c)), plain(c).replace(/^\n/, '').replace(/\s+$/, '')))
      else if (isXcode(c)) q.push(fence(guessLang(xcode(c)), xcode(c)))
      else if (hasClass(c, 'sc-o')) opts.push(`<Opt>${inl(c.children).trim()}</Opt>`)
      else if (hasClass(c, 'sc-x')) explain = blocks(c.children, 'sc-x')
      else { unknown(c, `自测题里的 <${c.tag}${c.attrs.class ? '.' + cls(c).join('.') : ''}>`); q.push(outerHTML(c)) }
    }
    return `<Sc ${predict ? 'predict ' : ''}:a="${a}">\n\n${q.join('\n\n')}\n\n${opts.join('\n')}\n\n<template #explain>\n\n${explain.join('\n\n')}\n\n</template>\n</Sc>`
  }

  /** 实验台 */
  function lab(d) {
    count('lab')
    const title = elements(d).find(e => hasClass(e, 'lab-title'))
    const small = title && elements(title).find(e => e.tag === 'small')
    const titleText = title ? plain({ children: title.children.filter(c => c !== small), type: 'x' }).replace(/\s+/g, ' ').trim() : ''
    const note = small ? plain(small).replace(/\s+/g, ' ').trim() : ''
    const predict = elements(d).find(e => hasClass(e, 'sc') && hasClass(e, 'predict'))
    const body = elements(d).find(e => hasClass(e, 'lab-body'))
    const id = body?.attrs.id || predict?.attrs['data-lab'] || 'lab' + (rep.labs.length + 1)
    const mount = []
    script.text.split('\n').forEach((l, i) => { if (l.includes(`'#${id}'`) || l.includes(`"#${id}"`)) mount.push(script.startLine + i) })
    const big = BIG[meta.id]
    const staticKids = body ? body.children.filter(c => c.type === 'el') : []
    rep.labs.push({ id, title: titleText, mount, big: big && (!mount.length || mount.some(m => m >= big.from && m <= big.to)) ? big : null, staticLines: staticKids.length ? [body.line, (body.line + (outerHTML(body).match(/\n/g) || []).length)] : null, line: d.line })
    for (const c of elements(d)) if (!['lab-title', 'sc', 'lab-body'].some(k => hasClass(c, k))) unknown(c, `实验台里的 <${c.tag}${c.attrs.class ? '.' + cls(c).join('.') : ''}>`)
    const bigHint = big ? `手写大型交互：旧脚本第 ${big.from}-${big.to} 行（${big.name}）` : ''
    const hint = [mount.length ? `旧脚本第 ${mount.join('、')} 行` : bigHint || '旧脚本里没找到挂载点', mount.length && bigHint ? bigHint : '', staticKids.length ? `旧静态 HTML 第 ${body.line} 行起` : ''].filter(Boolean).join('；')
    let s = `<Lab id="${A(id)}" title="${A(titleText)}"${note ? ` note="${A(note)}"` : ''}>\n`
    if (predict) s += `<template #predict>\n${sc(predict, true).replace(/^<Sc predict :a="(\d+)">\n\n/, '<Sc predict :a="$1">\n\n')}\n</template>\n\n`
    s += `<LabTodo id="${A(id)}" hint="${A(hint)}" />\n</Lab>`
    return s
  }

  function pair(d) {
    count('pair')
    const cols = elements(d).filter(e => e.tag === 'div')
    const parts = cols.map(c => {
      const cap = elements(c).find(e => hasClass(e, 'cap'))
      const code = c.children.find(isXcode)
      if (!code) unknown(c, 'code-pair 的一栏里没有 x-code')
      count('code')
      const body = code ? fence(guessLang(xcode(code)), xcode(code)) : outerHTML(c)
      return container('col', cap ? inl(cap.children).trim() : '', body)
    })
    return container('pair', '', parts.join('\n'))
  }

  function details(d) {
    const sum = elements(d).find(e => e.tag === 'summary')
    const rest = d.children.filter(c => c !== sum)
    const text = nodes => inl(nodes).trim()
    if (hasClass(d, 'deep')) {
      count('deep')
      const title = text(sum.children.filter(c => !(c.type === 'el' && (hasClass(c, 'step') || hasClass(c, 'opt')))))
      return container('deep', title, blocks(rest, 'deep').join('\n\n'))
    }
    if (hasClass(d, 'think')) {
      count('think')
      const div = elements(d).find(e => e.tag === 'div')
      return container('think', text(sum.children), blocks(div ? div.children : rest, 'think').join('\n\n'))
    }
    if (hasClass(d, 'cheatwrap')) {
      count('cheat')
      return container('cheat', text(sum.children), blocks(rest, 'cheat').join('\n\n'))
    }
    unknown(d, `<details class="${d.attrs.class || ''}">`)
    return outerHTML(d)
  }

  /** 标题 div.t 的文字和默认标题不同时，写在容器名后面 */
  function customTitle(d, dflt) {
    const t = elements(d).find(e => hasClass(e, 't'))
    const txt = t ? inl(t.children).trim() : dflt
    return txt === dflt ? '' : txt
  }

  function terms(d, title = '') {
    const dl = elements(d).find(e => e.tag === 'dl')
    const items = []
    let term = null
    for (const c of elements(dl)) {
      if (c.tag === 'dt') term = inl(c.children).trim()
      else if (c.tag === 'dd') items.push(`${term}\n: ${inl(c.children).trim()}`)
    }
    return container('terms', title, items.join('\n\n'))
  }

  /** 主分派 */
  function block(n, where) {
    const t = n.tag
    if (n.type === 'comment') return null
    if (n.type === 'text') return n.value.trim() ? para([n]) : null
    if (t === 'p') { count('p'); return para(n.children) }
    if (t === 'ul' || t === 'ol') return list(n)
    if (isXcode(n)) { count('code'); const c = xcode(n); return fence(guessLang(c), c) }
    if (t === 'pre') {
      if (hasClass(n, 'sc-code')) { count('code'); const c = plain(n).replace(/^\n/, '').replace(/\s+$/, ''); return fence(guessLang(c), c) }
      unknown(n, '<pre>'); return outerHTML(n)
    }
    if (t === 'table') return table(n)
    if (t === 'figure' && hasClass(n, 'fig')) return figure(n)
    if (t === 'details') return details(n)
    if (t === 'h3') {
      const step = elements(n).find(e => hasClass(e, 'step'))
      if (!step) { unknown(n, '没有编号的 <h3>'); return '### ' + inl(n.children).trim() }
      count('h3')
      return `### ${plain(step).trim()} ${inl(n.children.filter(c => c !== step)).trim()}`
    }
    if (t === 'h4' || t === 'h2' || t === 'h5') { unknown(n, `<${t}>`); return `${'#'.repeat(+t[1])} ${inl(n.children).trim()}` }
    if (t === 'dl') { unknown(n, '正文里的 <dl>'); return outerHTML(n) }
    if (t === 'div' || t === 'section') return divBlock(n, where)
    if (t === 'a' && hasClass(n, 'nextch')) return null
    unknown(n, `<${t}${n.attrs.class ? '.' + cls(n).join('.') : ''}>`)
    return outerHTML(n)
  }

  function divBlock(d, where) {
    const has = c => hasClass(d, c)
    const body = () => blocks(d.children.filter(c => !(c.type === 'el' && hasClass(c, 't'))), where).join('\n\n')
    if (has('ch-head')) return null
    if (has('goal')) {
      const items = elements(d).filter(e => e.tag === 'ul').flatMap(u => elements(u))
      const lines = items.map(li => `<Goal checks="${A(li.attrs['data-checks'] || '')}">${inl(li.children.filter(c => !(c.type === 'el' && hasClass(c, 'gtag')))).trim()}</Goal>`)
      for (const c of elements(d)) if (!hasClass(c, 't') && c.tag !== 'ul') unknown(c, '目标里的 <' + c.tag + '>')
      count('goal')
      return container('goals', customTitle(d, '目标'), lines.join('\n') + '\n')
    }
    if (has('rt')) return container('rt', '', blocks(d.children, where).join('\n\n'))
    if (has('analogy')) { const inner = elements(d).find(e => e.tag === 'div' && !hasClass(e, 'ic')); return container('analogy', '', blocks(inner ? inner.children : [], where).join('\n\n')) }
    if (has('terms')) return terms(d, customTitle(d, '本章术语'))
    if (has('why')) return container('why', customTitle(d, '为什么需要它'), body())
    if (has('pitfalls')) return container('pitfalls', customTitle(d, '注意'), body())
    if (has('summary')) return container('summary', customTitle(d, '小结'), body())
    if (has('note')) { count('note'); return container('note', has('warn') ? 'warn' : '', blocks(d.children, where).join('\n\n')) }
    if (has('steps-flow')) {
      count('flow')
      const steps = elements(d).filter(e => e.tag === 'span').map(s => plain(s).trim())
      return `<Flow :steps='${JSON.stringify(steps).replace(/'/g, '&#39;')}' />`
    }
    if (has('selfcheck')) {
      const scs = elements(d).filter(e => hasClass(e, 'sc')).map(e => sc(e, false))
      for (const c of elements(d)) if (!hasClass(c, 't') && !hasClass(c, 'sc')) unknown(c, '自测里的 <' + c.tag + '>')
      return container('selfcheck', customTitle(d, '自测'), scs.join('\n\n') + '\n')
    }
    if (has('code-pair')) return pair(d)
    if (has('ex')) { count('ex'); return `<Exercise id="${A(d.attrs['data-ex'])}" />` }
    if (has('lab')) return lab(d)
    if (has('tbl-wrap')) { const t = elements(d).find(e => e.tag === 'table'); if (t) return table(t) }
    if (has('sc')) { unknown(d, '章里直接出现的 .sc'); return sc(d, false) }
    // 脚本驱动的区域（综合测验的得分、标签、题目列表等）：占位
    if (d.attrs.id || has('score') || has('tabs')) {
      if (!rep.prevDynamic) rep.labs.push({ id: d.attrs.id || cls(d)[0], title: '', mount: [], big: BIG[meta.id] || null, staticLines: [d.line, d.line], line: d.line, dynamic: true })
      rep.lastDynamic = true
      return `<LabTodo id="${A(d.attrs.id || cls(d)[0])}" hint="旧静态 HTML 第 ${d.line} 行，内容由旧脚本生成" />`
    }
    unknown(d, `<div${d.attrs.class ? ' class="' + d.attrs.class + '"' : ''}>`)
    return outerHTML(d)
  }

  // ---- 组装
  const children = el.children.filter(c => !(c.type === 'text' && !c.value.trim()))
  const head = elements(el).find(e => hasClass(e, 'ch-head'))
  const h2 = head && walkFind(head, 'h2')
  const h1 = h2 ? inl(h2.children).trim() : meta.title
  const body = blocks(el.children, 'section')
  // 去掉成对出现的相邻 LabTodo（综合测验）
  const merged = []
  for (const b of body) {
    if (/^<LabTodo /.test(b) && /^<LabTodo /.test(merged[merged.length - 1] || '')) continue
    merged.push(b)
  }
  const lines = ['---', `title: ${fm(meta.title)}`, `id: ${meta.id}`, `stage: ${meta.stage}`]
  if (meta.chapter) lines.push(`chapter: ${meta.chapter}`)
  else lines.push('order: 100')
  lines.push(`desc: ${fm(meta.desc)}`, '---', '')
  if (imports.length) lines.push('<script setup>', ...imports, '</script>', '')
  lines.push(`# ${h1}`, '', ...merged.map(b => b + '\n'))
  const md = lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') + '\n'
  return { meta, md, rep, fileBase, h1 }
}
function walkFind(n, tag) { let r = null; walk(n, x => { if (!r && x.type === 'el' && x.tag === tag) r = x }); return r }

// ---------------------------------------------------------------- 输出
function writeFile(file, content) {
  if (fs.existsSync(file) && !FORCE) { console.log(`  已存在，跳过（加 --force 覆盖）：${path.relative(ROOT, file)}`); return false }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
  return true
}
const rel = f => path.relative(ROOT, f)

function runChapter(id) {
  const r = convertSection(id)
  const { meta, md, rep, fileBase } = r
  const mdFile = path.join(COURSE, 'chapters', fileBase + '.md')
  console.log(`[html2md] ${id}（旧 HTML 第 ${meta.start}-${meta.end} 行）→ ${rel(mdFile)}`)
  const wrote = writeFile(mdFile, md)
  if (wrote) for (const f of rep.figures) writeFile(path.join(COURSE, f.file), f.vue)
  const c = rep.counts
  console.log(`  小节 ${c.h3 || 0} · 代码块 ${c.code || 0} · 深入 ${c.deep || 0} · 想一想 ${c.think || 0} · 自测 ${c.sc || 0} · 先猜 ${c.predict || 0} · 练习 ${c.ex || 0} · 实验台 ${c.lab || 0} · 示意图 ${c.figure || 0} · 表格 ${c.table || 0}`)
  if (rep.figures.length) console.log('  示意图：' + rep.figures.map(f => `${f.name}${f.vpre ? '（' + f.vpre + ' 处加了 v-pre）' : ''}`).join('、'))
  if (rep.labs.length) {
    console.log(`  待人工改写的实验台（${rep.labs.length}）：`)
    for (const l of rep.labs) {
      const parts = [`旧 HTML 第 ${l.line} 行`]
      if (l.mount.length) parts.push('旧脚本第 ' + l.mount.join('、') + ' 行')
      else if (!l.big) parts.push('旧脚本无 #' + l.id + ' 挂载点')
      if (l.big) parts.push(`手写大型交互：旧脚本第 ${l.big.from}-${l.big.to} 行（${l.big.name}）`)
      if (l.staticLines) parts.push(`有静态结构（第 ${l.staticLines[0]} 行起）`)
      console.log(`    - ${l.id}${l.title ? '「' + l.title + '」' : ''}  ${parts.join('；')}`)
    }
  }
  for (const w of rep.warn) console.log('  注意：' + w)
  if (rep.unknown.length) {
    console.log(`  未识别结构（${rep.unknown.length}，已原样保留）：`)
    for (const u of rep.unknown) console.log(`    - 旧 HTML 第 ${u.line} 行：${u.why}`)
  }
  if (!rep.unknown.length) console.log('  未识别结构：0')
  return rep
}

function runExercises(id) {
  const { meta } = loadSection(id)
  const out = extractExercises(meta)
  const fileBase = chapterFile(meta)
  const file = path.join(COURSE, 'exercises', fileBase + '.ts')
  console.log(`[html2md --exercises] ${id} → ${rel(file)}（本章练习 ${out.found.length} 道）`)
  if (out.found.length) writeFile(file, out.ts)
  for (const w of out.warn) console.log('  注意：' + w)
  return out
}

if (EXERCISES) runExercises(argv[0])
else runChapter(argv[0])
