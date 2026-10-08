/* 练习代码里的折叠块（纯函数）：解析 //#fold 标题 … //#endfold 标记，算出只读保护区，裁剪触及保护区的改动，按行号找块。
   编辑器（editor/folds.js）用这里的结果装饰和拦截；Exercise.vue 保存、比较、运行的始终是含标记的完整代码，不经过这里。
   写法（脚本用 //，模板用 HTML 注释，两种写法在两个编辑器里都认）：
     //#fold 第 24–30 章你写过的零件        <!--#fold 标题-->
     ……                                    ……
     //#endfold                              <!--#endfold-->
   不支持嵌套：外层折叠块里再出现的 #fold 行当作普通内容；没有配对的 #fold / #endfold 当作普通注释。 */

export interface FoldBlock {
  /** 标题；标记行里没写时是默认标题 */
  title: string
  /** 标记行（含）的起止行号，从 1 起 */
  startLine: number
  endLine: number
  /** 块的字符范围：从 #fold 那一行的行首，到 #endfold 那一行的行尾（不含换行） */
  from: number
  to: number
  /** 标记行之间的代码行数（折叠摘要里显示的数字） */
  bodyLines: number
}

export const DEFAULT_FOLD_TITLE = '已写好的代码'

const START = /^\s*(?:\/\/|<!--)\s*#fold(?![A-Za-z0-9_-])\s*(.*?)\s*(?:-->)?\s*$/
const END = /^\s*(?:\/\/|<!--)\s*#endfold\s*(?:-->)?\s*$/

/** 找出代码里所有成对的折叠块（按出现顺序，互不嵌套） */
export function parseFolds(text: string): FoldBlock[] {
  const out: FoldBlock[] = []
  const lines = text.split('\n')
  let pos = 0
  let open: { title: string; line: number; from: number } | null = null
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]
    const len = ln.endsWith('\r') ? ln.length - 1 : ln.length
    const s = ln.slice(0, len)
    if (!open) {
      const m = START.exec(s)
      if (m) open = { title: m[1] || DEFAULT_FOLD_TITLE, line: i + 1, from: pos }
    } else if (END.test(s)) {
      out.push({ title: open.title, startLine: open.line, endLine: i + 1, from: open.from, to: pos + len, bodyLines: i + 1 - open.line - 1 })
      open = null
    }
    pos += ln.length + 1
  }
  return out
}

/** 折叠摘要上的文字，例如「第 24–30 章你写过的零件（412 行）」 */
export const foldLabel = (b: { title: string; bodyLines: number }): string => `${b.title}（${b.bodyLines} 行）`

/** 某一行（从 1 起）落在哪个折叠块里（含标记行），不在任何块里返回 -1 */
export function blockIndexOfLine(blocks: readonly { startLine: number; endLine: number }[], line: number): number {
  return blocks.findIndex(b => line >= b.startLine && line <= b.endLine)
}

/** 保护区：不允许改动的字符区间 [lo, hi]。比块本身多保护两端的换行：删掉它们会让标记行和相邻行粘在一起。
    strictLo / strictHi：块贴着文档开头 / 结尾（没有相邻的换行可以保护），这时在 lo / hi 处插入的文字必须带换行才算在块外 */
export interface Zone {
  lo: number
  hi: number
  strictLo: boolean
  strictHi: boolean
}

/** 由折叠块算出保护区；相邻或重叠的块合并成一个 */
export function protectedZones(blocks: readonly { from: number; to: number }[], docLength: number): Zone[] {
  const zs: Zone[] = [...blocks]
    .sort((a, b) => a.from - b.from)
    .map(b => ({ lo: Math.max(0, b.from - 1), hi: Math.min(docLength, b.to + 1), strictLo: b.from === 0, strictHi: b.to >= docLength }))
  const out: Zone[] = []
  for (const z of zs) {
    const last = out[out.length - 1]
    if (last && z.lo < last.hi) {
      last.hi = Math.max(last.hi, z.hi)
      last.strictHi = last.strictHi || z.strictHi
    } else out.push({ ...z })
  }
  return out
}

export interface Change {
  from: number
  to: number
  insert: string
}

/** 一处改动按保护区裁剪后的结果。blocked 为真表示有内容被拦下（要给学习者提示）；
    parts 是仍可以执行的部分：纯插入要么原样保留要么整个拦下，替换或删除则去掉落在保护区里的那一段（插入的文字随之丢弃，避免插到意外的位置） */
export function clipChange(c: Change, zones: readonly Zone[]): { parts: Change[]; blocked: boolean } {
  if (c.from === c.to) {
    for (const z of zones) {
      const inside = c.from > z.lo && c.from < z.hi
      const badLo = c.from === z.lo && z.strictLo && !c.insert.endsWith('\n')
      const badHi = c.from === z.hi && z.strictHi && !c.insert.startsWith('\n')
      if (inside || badLo || badHi) return { parts: [], blocked: true }
    }
    return { parts: [c], blocked: false }
  }
  // 从 [from, to] 里减去每个保护区的内部 (lo, hi)
  let segs: [number, number][] = [[c.from, c.to]]
  let hit = false
  for (const z of zones) {
    const next: [number, number][] = []
    for (const [a, b] of segs) {
      if (b <= z.lo || a >= z.hi) { next.push([a, b]); continue }
      hit = true
      if (a < z.lo) next.push([a, z.lo])
      if (b > z.hi) next.push([z.hi, b])
    }
    segs = next
  }
  if (!hit) return { parts: [c], blocked: false }
  return { parts: segs.filter(([a, b]) => b > a).map(([a, b]) => ({ from: a, to: b, insert: '' })), blocked: true }
}
