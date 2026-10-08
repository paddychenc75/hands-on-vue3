/* 纯文本工具：不碰 DOM。移植自 hands-on-react。 */
export const esc = (s: unknown): string => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** 行内文字：纯文本题库（专用题）的题干、选项、解析。转义后，`反引号` 里的内容和 <Tag> 形式的标签名包成 code。
 *  题库里的文字是纯文本，不经过 Markdown，所以反引号要在这里处理，否则会原样显示出来。 */
export const fmtInline = (o: unknown): string =>
  String(o)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .split(/(`[^`\n]+`)/)
    .map(part =>
      /^`[^`\n]+`$/.test(part)
        ? '<code>' + esc(part.slice(1, -1)) + '</code>'
        : esc(part).replace(/&lt;(\/?[A-Za-z][^&]*?)&gt;/g, '<code>&lt;$1&gt;</code>')
    )
    .join('')

/** 选项文字（同 fmtInline） */
export const fmtOpt = fmtInline

/** 把章号列表写成“第 1–5、7、9、10 章”：三个及以上连续的合并成区间，两个相邻的用顿号；先排序去重。空列表返回空串 */
export function chapterRanges(nos: number[]): string {
  const xs = [...new Set(nos)].sort((a, b) => a - b)
  if (!xs.length) return ''
  const parts: string[] = []
  for (let i = 0; i < xs.length; ) {
    let j = i
    while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++
    if (j - i >= 2) parts.push(`${xs[i]}–${xs[j]}`)
    else for (let k = i; k <= j; k++) parts.push(String(xs[k]))
    i = j + 1
  }
  return `第 ${parts.join('、')} 章`
}
