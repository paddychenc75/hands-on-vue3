// 实验台里展示代码用的简单高亮：从旧版 vue3-course.html 的 hl() 搬来。
// 只高亮注释、字符串、关键字和数字，输出 <span class="c|s|k|n">。
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const KW = 'const|let|var|function|return|if|else|for|of|in|new|import|from|export|default|async|await|while|class|extends|this|true|false|null|undefined|typeof|continue|try|finally|get|set|constructor|type|interface'
const HL_RE = new RegExp(
  '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|<!--[\\s\\S]*?-->)|(\'(?:[^\'\\\\\\n]|\\\\.)*\'|"(?:[^"\\\\\\n]|\\\\.)*"|`(?:[^`\\\\]|\\\\.)*`)|\\b(' +
    KW +
    ')\\b|\\b(\\d+(?:\\.\\d+)?)\\b',
  'g'
)

export function hl(src: string): string {
  let out = ''
  let last = 0
  let m: RegExpExecArray | null
  HL_RE.lastIndex = 0
  while ((m = HL_RE.exec(src))) {
    out += esc(src.slice(last, m.index))
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : 'n'
    out += '<span class="' + cls + '">' + esc(m[0]) + '</span>'
    last = m.index + m[0].length
  }
  return out + esc(src.slice(last))
}
