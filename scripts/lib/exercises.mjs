// 从旧脚本里抽出一章用到的练习定义，生成 exercises/NN-id.ts 初稿。
// 旧脚本里练习有两种写法：`const EX = { id: {...}, ... }` 里的属性，和 `EX.id = {...}`。
// 提示分散在 hint / hints / HINTS[id]，这里合并成一个 hints 数组（优先级 hints > HINTS[id] > [hint]）。
import { loadSection, oldLines, scriptText } from './old.mjs'
import { elements, walk } from './html.mjs'

// ---- 一个够用的 JS 扫描器：跳过字符串、模板、注释、正则，匹配括号 ----
function skipNonCode(src, i) {
  const c = src[i], d = src[i + 1]
  if (c === "'" || c === '"') {
    let j = i + 1
    while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1
    return j + 1
  }
  if (c === '`') return skipTemplate(src, i)
  if (c === '/' && d === '/') { const e = src.indexOf('\n', i); return e < 0 ? src.length : e }
  if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); return e < 0 ? src.length : e + 2 }
  if (c === '/') {
    // 正则还是除号：看前一个有意义的字符
    let k = i - 1
    while (k >= 0 && /\s/.test(src[k])) k--
    const prev = k >= 0 ? src[k] : ''
    const word = /[A-Za-z_$][\w$]*$/.exec(src.slice(Math.max(0, k - 10), k + 1))
    const isRegex = !prev || /[(,=:\[!&|?{};+\-*%<>~^]/.test(prev) || (word && /^(return|typeof|case|in|of)$/.test(word[0]))
    if (!isRegex) return i
    let j = i + 1, inClass = false
    while (j < src.length) {
      if (src[j] === '\\') { j += 2; continue }
      if (src[j] === '[') inClass = true
      else if (src[j] === ']') inClass = false
      else if (src[j] === '/' && !inClass) break
      else if (src[j] === '\n') return i
      j++
    }
    j++
    while (/[a-z]/.test(src[j] || '')) j++
    return j
  }
  return i
}
function skipTemplate(src, i) {
  let j = i + 1
  while (j < src.length) {
    if (src[j] === '\\') { j += 2; continue }
    if (src[j] === '`') return j + 1
    if (src[j] === '$' && src[j + 1] === '{') { j = matchClose(src, j + 1) + 1; continue }
    j++
  }
  return j
}
const PAIR = { '{': '}', '(': ')', '[': ']' }
/** i 指向开括号，返回匹配的闭括号下标 */
function matchClose(src, i) {
  const stack = [PAIR[src[i]]]
  let j = i + 1
  while (j < src.length && stack.length) {
    const k = skipNonCode(src, j)
    if (k !== j) { j = k; continue }
    const c = src[j]
    if (PAIR[c]) stack.push(PAIR[c])
    else if (c === stack[stack.length - 1]) stack.pop()
    j++
  }
  return j - 1
}
/** 从 i 起扫描一个值，到顶层的逗号或外层闭括号之前停下，返回结束下标（不含逗号） */
function valueEnd(src, i) {
  let j = i
  while (j < src.length) {
    const k = skipNonCode(src, j)
    if (k !== j) { j = k; continue }
    const c = src[j]
    if (PAIR[c]) { j = matchClose(src, j) + 1; continue }
    if (c === ',' || c === '}' || c === ')' || c === ']') return j
    j++
  }
  return j
}
/** 语句的结束：顶层的分号之后 */
function stmtEnd(src, i) {
  let j = i
  while (j < src.length) {
    const k = skipNonCode(src, j)
    if (k !== j) { j = k; continue }
    const c = src[j]
    if (PAIR[c]) { j = matchClose(src, j) + 1; continue }
    if (c === ';') return j + 1
    j++
  }
  return j
}
/** 对象字面量 src[open] === '{'：返回顶层字段 [{key, start, end(含值), valStart}] */
function topFields(src, open) {
  const close = matchClose(src, open)
  const out = []
  let j = open + 1
  for (;;) {
    while (j < close && /[\s,]/.test(src[j])) j++
    // 跳过字段之间的注释
    const k = skipNonCode(src, j)
    if (k !== j && (src[j] === '/' )) { j = k; continue }
    if (j >= close) break
    const m = /^(?:async\s+)?(?:\*\s*)?(?:([A-Za-z_$][\w$]*)|'([^']+)'|"([^"]+)")\s*(?=[:(])/.exec(src.slice(j, j + 120))
    if (!m) throw new Error('读不懂的对象字段：' + src.slice(j, j + 40))
    const key = m[1] || m[2] || m[3]
    const start = j
    let valStart = j + m[0].length
    const method = src[valStart] === '('
    if (!method) valStart++ // 跳过冒号
    while (/\s/.test(src[valStart])) valStart++
    const end = valueEnd(src, method ? start : valStart)
    out.push({ key, start, end, valStart: method ? start : valStart, method })
    j = end
  }
  return { fields: out, close }
}

function templateRanges(src) {
  const rs = []
  let i = 0
  while (i < src.length) {
    const k = skipNonCode(src, i)
    if (k !== i) { if (src[i] === '`') rs.push([i, k]); i = k } else i++
  }
  return rs
}

export function extractExercises(meta) {
  const { el } = loadSection(meta.id)
  const ids = []
  walk(el, n => { if (n.type === 'el' && n.attrs['data-ex']) ids.push(n.attrs['data-ex']) })
  const { text: S } = scriptText()
  const warn = []
  const defs = {}
  // 1. const EX = { ... }
  const exStart = S.search(/\bconst EX = \{/)
  if (exStart >= 0) {
    const open = S.indexOf('{', exStart)
    const { fields } = topFields(S, open)
    for (const f of fields) {
      const v = S[f.valStart] === '{' ? f.valStart : -1
      if (v >= 0) defs[f.key] = { open: v, line: S.slice(0, f.start).split('\n').length, form: 'EX 对象' }
    }
  }
  // 2. EX.id = { ... }
  for (const m of S.matchAll(/^EX\.([A-Za-z_$][\w$]*)\s*=\s*\{/gm)) {
    const open = m.index + m[0].length - 1
    if (defs[m[1]]) warn.push(`练习 ${m[1]} 在旧脚本里定义了不止一次，取第一处`)
    else defs[m[1]] = { open, line: S.slice(0, m.index).split('\n').length, form: 'EX.id =' }
  }
  // 3. HINTS
  const hints = {}
  const hs = S.search(/\bconst HINTS = \{/)
  if (hs >= 0) {
    const { fields } = topFields(S, S.indexOf('{', hs))
    for (const f of fields) hints[f.key] = S.slice(f.valStart, f.end)
  }
  const found = []
  const bodies = []
  const vueImports = new Set()
  for (const id of ids) {
    const d = defs[id]
    if (!d) { warn.push(`练习 ${id}：旧脚本里找不到 EX.${id} 的定义`); continue }
    let lit = S.slice(d.open, matchClose(S, d.open) + 1)
    // 合并提示
    const { fields } = topFields(lit, 0)
    const byKey = Object.fromEntries(fields.map(f => [f.key, f]))
    const edits = []
    const cutField = f => {
      let e = f.end
      while (/[ \t]/.test(lit[e] || '')) e++
      if (lit[e] === ',') e++
      while (/[ \t]*\n/.test(lit.slice(e, e + 20)) && /^[ \t]*\n/.test(lit.slice(e))) { e += /^[ \t]*\n/.exec(lit.slice(e))[0].length; break }
      // 起点回退到行首空白
      let s = f.start
      while (s > 0 && /[ \t]/.test(lit[s - 1])) s--
      return [s, e]
    }
    let hintsSrc = null, how = ''
    if (byKey.hints) { how = 'hints 字段'; if (byKey.hint) { const [s, e] = cutField(byKey.hint); edits.push([s, e, '']) } }
    else if (hints[id]) { hintsSrc = hints[id]; how = 'HINTS 表' }
    else if (byKey.hint) { hintsSrc = '[' + lit.slice(byKey.hint.valStart, byKey.hint.end) + ']'; how = 'hint 单条' }
    else warn.push(`练习 ${id}：没有任何提示（hint/hints/HINTS）`)
    if (hintsSrc) {
      if (byKey.hint) {
        const f = byKey.hint
        edits.push([f.start, f.end, 'hints: ' + hintsSrc])
      } else {
        // 插在 check 之前（没有 check 就放最后）
        const at = byKey.check ? byKey.check.start : fields[fields.length - 1].end
        edits.push([at, at, 'hints: ' + hintsSrc + ',\n  '])
      }
    }
    if (!byKey.check) warn.push(`练习 ${id}：没有 check 函数`)
    for (const k of ['title', 'ch', 'task', 'tpl', 'js']) if (!byKey[k]) warn.push(`练习 ${id}：缺少字段 ${k}`)
    edits.sort((a, b) => b[0] - a[0]).forEach(([s, e, r]) => { lit = lit.slice(0, s) + r + lit.slice(e) })
    // 缩进：去掉第一行所在行的缩进（模板字符串里的行不动）
    const lineStart = S.lastIndexOf('\n', d.open) + 1
    const baseIndent = /^[ \t]*/.exec(S.slice(lineStart))[0].length
    const tr = templateRanges(lit)
    let pos = 0
    lit = lit.split('\n').map((l, i) => {
      const lineStartPos = pos; pos += l.length + 1
      if (i === 0) return l
      if (tr.some(([a, b]) => lineStartPos > a && lineStartPos < b)) return l
      let n = 0
      while (n < baseIndent && n < l.length && l[n] === ' ') n++
      return l.slice(n)
    }).join('\n')
    // check 里用了全局 Vue.xxx：改成从 'vue' 导入（只改 check 函数里的代码，不动字符串）
    {
      const chk = topFields(lit, 0).fields.find(f => f.key === 'check')
      if (chk) {
        const body = lit.slice(chk.start, chk.end)
        const names = [...new Set([...body.matchAll(/(?<![\w$.])Vue\.([A-Za-z]+)/g)].map(m => m[1]))]
        if (names.length) {
          lit = lit.slice(0, chk.start) + body.replace(/(?<![\w$.])Vue\.([A-Za-z]+)/g, '$1') + lit.slice(chk.end)
          names.forEach(n => vueImports.add(n))
          warn.push(`练习 ${id}：check 里的 Vue.${names.join('、Vue.')} 已自动改成从 'vue' 导入（请确认这个导入在练习运行环境里可用）`)
        }
      }
      // 旧脚本在闭包里解构了一批 Vue 的名字（nextTick、h、createApp…），check 里可能直接用裸标识符
      if (chk) {
        const OLD_SCOPE = ['createApp', 'ref', 'reactive', 'computed', 'watch', 'watchEffect', 'toRefs', 'toRef', 'shallowRef', 'triggerRef', 'nextTick', 'provide', 'inject', 'onMounted', 'onUnmounted', 'onBeforeMount', 'onBeforeUpdate', 'onUpdated', 'onBeforeUnmount', 'onActivated', 'onDeactivated', 'KeepAlive', 'h']
        const body = topFields(lit, 0).fields.find(f => f.key === 'check')
        const text = lit.slice(body.start, body.end)
        const used = OLD_SCOPE.filter(n => new RegExp('(?<![\\w$.\'"`])' + n + '\\s*\\(').test(text) && !new RegExp('(?:const|let|var|function)\\s+' + n + '\\b').test(text))
        used.forEach(n => vueImports.add(n))
        if (used.length) warn.push(`练习 ${id}：check 里直接用了 ${used.join('、')}（旧脚本里是闭包变量），已加 import { … } from 'vue'`)
      }
      const rest = [...new Set([...lit.matchAll(/(?<![\w$.'"])Vue\.([A-Za-z]+)/g)].map(m => m[1]))]
      if (rest.length) warn.push(`练习 ${id}：check 以外还出现 Vue.${rest.join('、Vue.')}（可能在示例字符串里，请人工确认）`)
    }
    for (const nm of new Set([...lit.matchAll(/(?<![\w$.'"])(EX|HINTS|API)(?![\w$'":])/g)].map(m => m[1]))) warn.push(`练习 ${id}：引用了旧脚本里的变量 ${nm}，要手工处理`)
    // 旧脚本在对象外面补的字段：EX.id.solJs = EX.id.js.replace(...)、EX.id.lazy = true。原样搬来，放在导出之后
    let after = ''
    for (const m of S.matchAll(new RegExp('^EX\\.' + id.replace(/\$/g, '\\$') + '\\.([A-Za-z_$][\\w$]*)\\s*=', 'gm'))) {
      const stmt = S.slice(m.index, stmtEnd(S, m.index + m[0].length)).replace(/\bEX\.([A-Za-z_$][\w$]*)/g, '$1')
      after += (after ? '' : '// 旧脚本在对象外面补充的字段（原样保留，需要的话可以整理进上面的对象）\n') + stmt + '\n'
      warn.push(`练习 ${id}：旧脚本在对象外面设置了 ${m[1]}，已原样放在导出之后`)
    }
    found.push({ id, line: d.line, how })
    bodies.push(`export const ${id}: Exercise = ${lit}\n` + (after ? '\n' + after : ''))
  }
  const head = ["import type { Exercise } from './types'"]
  if (vueImports.size) head.push(`import { ${[...vueImports].sort().join(', ')} } from 'vue'`)
  const ts = head.join('\n') + '\n\n' + bodies.join('\n')
  return { ts, found, warn }
}
