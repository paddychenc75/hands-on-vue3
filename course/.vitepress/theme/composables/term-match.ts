// 术语标注的匹配规则（纯函数，不碰 DOM，有单元测试 tests/unit/term-match.test.ts）。terms.ts 用它在文本里找该标的术语。
//
// 规则：
//   1. 优先匹配更长的术语（“单文件组件”优先于“组件”）：正则里按长度从长到短排。
//   2. 复合词里的子串不标：一个术语的前后紧邻着别的字，并且“术语 + 相邻字”正好是另一个更长的已知术语时，不标。
//      例：“子组件”是已知术语时，“子组件”里的“组件”不标；“响应式数据”是已知术语时，里面的“响应式”不标。
//      “已知术语”包括所有章的术语（含还没学到的）和写作规则表里的术语，所以前面章节也不会把后面章节术语的一部分标出来。
//   3. 纯英文术语（ref、key、props）要求词边界：前后不能紧挨着字母、数字、下划线、$、连字符（前面还不能是点），
//      所以 refs、keyup、defineProps、toRef、template-ref 里都不标。

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 术语的正则片段：以字母数字开头的加前边界，以字母数字结尾的加后边界；中文直接匹配 */
export const termPattern = (term: string) =>
  (/^[A-Za-z0-9]/.test(term) ? '(?<![A-Za-z0-9_$.\\-])' : '') + esc(term) + (/[A-Za-z0-9]$/.test(term) ? '(?![A-Za-z0-9_$\\-])' : '')

export interface TermMatcher {
  re: RegExp
  /** 对每个可标的术语：包含它的、更长的已知术语，以及它在那个术语里的位置 */
  parents: Map<string, { full: string; at: number }[]>
}

/** learned：这一章能标的术语（已学过）；known：全部已知术语（learned 是它的子集） */
export function buildMatcher(learned: string[], known: string[] = learned): TermMatcher {
  const terms = [...new Set(learned)].sort((a, b) => b.length - a.length)
  const parents = new Map<string, { full: string; at: number }[]>()
  for (const t of terms) {
    const list: { full: string; at: number }[] = []
    for (const k of new Set(known)) {
      if (k.length <= t.length) continue
      for (let at = k.indexOf(t); at >= 0; at = k.indexOf(t, at + 1)) list.push({ full: k, at })
    }
    parents.set(t, list)
  }
  return { re: new RegExp(terms.map(termPattern).join('|') || '(?!)', 'g'), parents }
}

/** 在一段文字里找出该标的术语位置，按出现顺序返回 */
export function findTerms(text: string, m: TermMatcher): { i: number; term: string }[] {
  const out: { i: number; term: string }[] = []
  for (const hit of text.matchAll(m.re)) {
    const i = hit.index!
    const term = hit[0]
    const inCompound = (m.parents.get(term) || []).some(({ full, at }) => i - at >= 0 && text.startsWith(full, i - at))
    if (!inCompound) out.push({ i, term })
  }
  return out
}
