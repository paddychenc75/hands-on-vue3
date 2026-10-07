// 行内 HTML → Markdown。只处理旧课程用到的行内标记；不认识的标签原样保留并记到 ctx.unknown。
import { decodeEntities, unknownEntities, outerHTML, cls } from './html.mjs'

const PUNCT = /[!-\/:-@\[-`{-~\p{P}\p{S}]/u
const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uf900-\ufaff]/
const CJK_PUNCT = /[\u3000-\u303f\uff00-\uffef\u2018\u2019\u201c\u201d\u2014\u2026]/
const WS = /\s/

// 站点的 markdown-it（markdown-cjk.mts）认为这对 ** 能生效吗？不能就改用 <b>。
// 复制了 scanDelims 的判断：prev / next 是紧邻 ** 外侧的字符（没有时按空白处理）
export function delimWorks(prev, next, side) {
  const isP = (c) => c && !CJK_PUNCT.test(c) && PUNCT.test(c)
  const lastWS = !prev || WS.test(prev), nextWS = !next || WS.test(next)
  const lastP = isP(prev), nextP = isP(next)
  const left = !nextWS && (!nextP || lastWS || lastP || (prev && CJK.test(prev)))
  const right = !lastWS && (!lastP || nextWS || nextP || (next && CJK.test(next)))
  return side === 'open' ? left : right
}

export function escText(s, { cell = false } = {}) {
  let o = s
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/`/g, '\\`')
    .replace(/</g, '\\<')
    .replace(/(?<![A-Za-z0-9])_|_(?![A-Za-z0-9])/g, '\\_')
    .replace(/\]\(/g, ']\\(')
    .replace(/!\[/g, '!\\[')
    .replace(/~~/g, '\\~\\~')
    .replace(/&(?=#?[A-Za-z0-9]+;)/g, '\\&')
  if (cell) o = o.replace(/\|/g, '\\|')
  return o
}

export function codeSpan(text, { cell = false } = {}) {
  let t = text.replace(/\s+/g, ' ')
  if (cell) t = t.replace(/\|/g, '\\|')
  const runs = t.match(/`+/g) || []
  let n = 1
  while (runs.some(r => r.length === n)) n++
  const f = '`'.repeat(n)
  const pad = /^`|`$/.test(t) || /^ .* $/.test(t) ? ' ' : ''
  return f + pad + t + pad + f
}

const INLINE_TAGS = new Set(['b', 'strong', 'i', 'em', 'code', 'a', 'br', 'span', 'kbd', 'sub', 'sup', 'small', 'mark', 'u', 's', 'abbr', 'img', 'input', 'label', 'button'])
export const isInlineNode = n => n.type === 'text' || n.type === 'comment' || (n.type === 'el' && INLINE_TAGS.has(n.tag) && !(n.tag === 'span' && 0))

/**
 * 行内节点 → Markdown 字符串
 * ctx: { href(link) → 新链接 | null, unknown(el, why), cell?: boolean }
 */
export function inlineMd(nodes, ctx) {
  // 先变成片段，再统一处理粗体/斜体前后的字符
  const parts = []
  for (const n of nodes) {
    if (n.type === 'comment') continue
    if (n.type === 'text') {
      const t = decodeEntities(n.value).replace(/\s+/g, ' ')
      for (const u of unknownEntities(n.value)) ctx.unknown?.(n, '未知的 HTML 实体 ' + u)
      parts.push({ k: 'text', s: escText(t, ctx) })
      continue
    }
    const tag = n.tag
    if (tag === 'code') { parts.push({ k: 'raw', s: codeSpan(plain(n), ctx) }); continue }
    if (tag === 'b' || tag === 'strong') { parts.push({ k: 'em', mark: '**', html: 'b', inner: inlineMd(n.children, ctx) }); continue }
    if (tag === 'i' || tag === 'em') { parts.push({ k: 'em', mark: '*', html: 'i', inner: inlineMd(n.children, ctx) }); continue }
    if (tag === 'br') { parts.push({ k: 'raw', s: '<br>' }); continue }
    if (tag === 'a') {
      const href = n.attrs.href || ''
      const to = ctx.href ? ctx.href(href, n) : href
      const inner = inlineMd(n.children, ctx)
      if (to == null) { parts.push({ k: 'raw', s: inner }); continue }
      parts.push({ k: 'raw', s: `[${inner.replace(/\]/g, '\\]')}](${to.replace(/ /g, '%20').replace(/\)/g, '%29')})` })
      continue
    }
    if (tag === 'span' && !Object.keys(n.attrs).length) { parts.push({ k: 'raw', s: inlineMd(n.children, ctx) }); ctx.unknown?.(n, '无属性的 <span>，已去掉标签保留文字'); continue }
    // 不认识：原样保留
    ctx.unknown?.(n, '行内标签 <' + tag + (n.attrs.class ? '.' + cls(n).join('.') : '') + '>')
    parts.push({ k: 'raw', s: outerHTML(n).replace(/\s*\n\s*/g, ' ') })
  }
  // 拼接，处理强调
  let out = ''
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    if (p.k !== 'em') { out += p.s; continue }
    let inner = p.inner
    const lead = /^\s*/.exec(inner)[0], trail = /\s*$/.exec(inner)[0]
    const core = inner.trim()
    if (!core) { out += inner; continue }
    const prev = lead ? ' ' : lastChar(out)
    const nextS = trail ? ' ' : firstChar(parts.slice(i + 1))
    const ok = delimWorks(prev, core[0], 'open') && delimWorks(core[core.length - 1], nextS, 'close') && !core.includes(p.mark === '**' ? '**' : '\u0000')
    out += lead + (ok ? p.mark + core + p.mark : `<${p.html}>${core}</${p.html}>`) + trail
  }
  return out
}
function lastChar(s) { return s.slice(-1) }
function firstChar(rest) {
  for (const p of rest) {
    const s = p.k === 'em' ? p.inner : p.s
    if (s) return s[0]
  }
  return ''
}
export function plain(n) {
  if (n.type === 'text') return decodeEntities(n.value)
  return (n.children || []).map(plain).join('')
}
