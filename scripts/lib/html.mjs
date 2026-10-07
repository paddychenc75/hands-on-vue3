// 一个够用的、容错的 HTML 解析器，只服务于旧课程 vue3-course.html（手写、结构规整）。
// 不依赖第三方包。节点：{type:'el',tag,attrs,children,parent,line} / {type:'text',value(原文，未解码)} / {type:'comment'}
const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'col', 'wbr', 'area', 'base', 'source'])
const RAW = new Set(['script', 'style'])
// 开始标签 key 时，自动关闭当前开着的 key 元素（仅在最近的“边界”之内）
const AUTO_CLOSE = {
  li: { closes: ['li'], stop: ['ul', 'ol'] },
  dt: { closes: ['dt', 'dd'], stop: ['dl'] },
  dd: { closes: ['dt', 'dd'], stop: ['dl'] },
  tr: { closes: ['tr', 'td', 'th'], stop: ['table', 'thead', 'tbody'] },
  td: { closes: ['td', 'th'], stop: ['tr', 'table'] },
  th: { closes: ['td', 'th'], stop: ['tr', 'table'] },
  option: { closes: ['option'], stop: ['select'] }
}
const P_CLOSERS = new Set(['div', 'ul', 'ol', 'dl', 'table', 'pre', 'h1', 'h2', 'h3', 'h4', 'p', 'figure', 'details', 'blockquote', 'section', 'hr'])

const NAMED = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', times: '×', middot: '·', rarr: '→', larr: '←', uarr: '↑', darr: '↓', harr: '↔', check: '✓', copy: '©', laquo: '«', raquo: '»', bull: '•', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', ne: '≠', le: '≤', ge: '≥', hearts: '♥', zwj: '‍', rArr: '⇒', lArr: '⇐', thinsp: ' ', ensp: ' ', emsp: ' ' }
export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return String.fromCodePoint(n)
    }
    return e in NAMED ? NAMED[e] : m
  })
}
export function unknownEntities(s) {
  const out = new Set()
  s.replace(/&([a-z][a-z0-9]*);/gi, (m, e) => { if (!(e in NAMED)) out.add(m) })
  return [...out]
}

export function parse(src, baseLine = 1) {
  const root = { type: 'root', tag: '#root', attrs: {}, children: [], parent: null, line: baseLine }
  let cur = root
  let i = 0
  let line = baseLine
  const warns = []
  const lineAt = pos => baseLine + (src.slice(0, pos).match(/\n/g) || []).length
  const push = n => { n.parent = cur; cur.children.push(n); return n }
  const closeUntil = (tag, endPos) => {
    let n = cur
    while (n && n.type === 'el' && n.tag !== tag) n = n.parent
    if (n && n.type === 'el') {
      for (let k = cur; k !== n.parent; k = k.parent) if (k.end == null) k.end = endPos
      cur = n.parent
      return true
    }
    return false
  }
  while (i < src.length) {
    const lt = src.indexOf('<', i)
    if (lt < 0) { push({ type: 'text', value: src.slice(i) }); break }
    if (lt > i) push({ type: 'text', value: src.slice(i, lt) })
    i = lt
    if (src.startsWith('<!--', i)) {
      const e = src.indexOf('-->', i + 4)
      const end = e < 0 ? src.length : e + 3
      push({ type: 'comment', value: src.slice(i + 4, e < 0 ? end : e) })
      i = end; continue
    }
    const close = /^<\/([a-zA-Z][\w:-]*)\s*>/.exec(src.slice(i, i + 80))
    if (close) {
      const tag = close[1].toLowerCase()
      if (!closeUntil(tag, i + close[0].length)) warns.push(`第 ${lineAt(i)} 行：多余的 </${tag}>`)
      i += close[0].length; continue
    }
    const open = /^<([a-zA-Z][\w:-]*)/.exec(src.slice(i, i + 80))
    if (!open) { push({ type: 'text', value: '<' }); i++; continue }
    const tag = open[1].toLowerCase()
    let j = i + open[0].length
    const attrs = {}
    let selfClose = false
    for (;;) {
      while (/\s/.test(src[j] || '')) j++
      if (j >= src.length) break
      if (src[j] === '>') { j++; break }
      if (src[j] === '/' && src[j + 1] === '>') { selfClose = true; j += 2; break }
      if (src[j] === '/') { j++; continue }
      const m = /^([^\s=>/]+)/.exec(src.slice(j, j + 200))
      if (!m) { j++; continue }
      const name = m[1]; j += name.length
      while (/\s/.test(src[j] || '')) j++
      let val = ''
      if (src[j] === '=') {
        j++
        while (/\s/.test(src[j] || '')) j++
        if (src[j] === '"' || src[j] === "'") {
          const q = src[j]; const e = src.indexOf(q, j + 1)
          val = src.slice(j + 1, e); j = e + 1
        } else { const m2 = /^[^\s>]+/.exec(src.slice(j, j + 500)); val = m2 ? m2[0] : ''; j += val.length }
      }
      attrs[name.toLowerCase()] = decodeEntities(val)
    }
    // 隐式结束
    const ac = AUTO_CLOSE[tag]
    if (ac) {
      let n = cur
      while (n.type === 'el' && !ac.stop.includes(n.tag)) {
        if (ac.closes.includes(n.tag)) { cur = n.parent; break }
        n = n.parent
      }
    }
    if (P_CLOSERS.has(tag) && cur.tag === 'p') cur = cur.parent
    const el = push({ type: 'el', tag, attrs, children: [], parent: null, line: lineAt(i), start: i, openEnd: j })
    el.parent = cur
    i = j
    if (VOID.has(tag) || selfClose) { el.end = j; continue }
    if (RAW.has(tag)) {
      const e = src.toLowerCase().indexOf('</' + tag, i)
      const end = e < 0 ? src.length : e
      if (end > i) { el.children.push({ type: 'text', value: src.slice(i, end), parent: el, raw: true }) }
      const gt = src.indexOf('>', end)
      i = gt < 0 ? src.length : gt + 1
      el.end = i
      continue
    }
    cur = el
  }
  for (let k = cur; k && k.type === 'el'; k = k.parent) if (k.end == null) k.end = src.length
  root.src = src
  root.warns = warns
  return root
}

export function cls(el) { return (el.attrs.class || '').split(/\s+/).filter(Boolean) }
export function hasClass(el, c) { return el.type === 'el' && cls(el).includes(c) }
export function elements(node) { return node.children.filter(c => c.type === 'el') }
export function walk(node, fn) {
  fn(node)
  for (const c of node.children || []) walk(c, fn)
}
export function textOf(node, decode = true) {
  if (node.type === 'text') return node.raw ? node.value : decode ? decodeEntities(node.value) : node.value
  if (node.type === 'comment') return ''
  return (node.children || []).map(c => textOf(c, decode)).join('')
}
export function find(node, pred) {
  const out = []
  walk(node, n => { if (n !== node && n.type === 'el' && pred(n)) out.push(n) })
  return out
}

/** 取元素在原文里的源码（需要 root.src；parse 的结果挂在根上） */
export function rootOf(n) { while (n.parent) n = n.parent; return n }
export function outerHTML(el) { return rootOf(el).src.slice(el.start, el.end) }
export function innerHTML(el) { return rootOf(el).src.slice(el.openEnd, el.end - ('</' + el.tag + '>').length) }
