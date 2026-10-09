/* 两份学习进度的合并（跨设备同步和导入文件共用）。纯函数：不碰 DOM、存储，不读时间。
   原则：两台设备各学各的，合并后谁的进度都不丢；同一条记录以更新的为准。
   数据结构见 course/engine/types.ts 的 Progress；逐字段规则见 AGENTS.md「进度同步」。

   性质（tests/unit/merge.test.ts 用手写用例和随机进度固定）：
   - 幂等 merge(a, a) = a；可交换 merge(a, b) = merge(b, a)；可结合 merge(merge(a, b), c) = merge(a, merge(b, c))
   - 任何一边已完成的章、已通过的练习、复习卡片、阶段测验，合并后都还在
   - 没有时间戳的旧数据按“更旧”处理；不认识的字段原样保留（向前兼容）
   做到这三条的办法：每个字段都是“取并集 / 取或 / 取最大”，需要二选一的地方只用一个全序（时间、进度、规范化文本）比大小，不看参数顺序。 */

type Obj = Record<string, any>
export const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v)

/** 规范化的 JSON：对象键排序。用来比较两份数据是否相同，也用作平局时的确定性裁决 */
export function canon(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']'
  if (isObj(v))
    return (
      '{' +
      Object.keys(v)
        .filter(k => v[k] !== undefined)
        .sort()
        .map(k => JSON.stringify(k) + ':' + canon(v[k]))
        .join(',') +
      '}'
    )
  return JSON.stringify(v) ?? 'null'
}

/** 一道练习里属于“草稿与提示阶梯”的字段：整组从更新的一边取，不拼接。`help`（借助答案的标记）另有规则 */
export const EX_KEYS = ['code', 'fails', 'firstFail', 'lastFail', 'sawSol', 'rewrite', 'stash', 'help'] as const
const EX_KNOWN = new Set<string>([...EX_KEYS, 'passed', 't'])
const CHAPTER_KNOWN = new Set<string>(['sc', 'tried', 'first', 'ex', 'done', 'doneAt', 'note', 'noteAlts', 'sx', 'ts'])

export interface MergeContext {
  /** 某章自测的正确答案下标；给了就在“同一题两边答案不同”时优先取正确的 */
  scAnswers?: (chapterId: string) => number[] | undefined
}

type Rank = (number | string)[]
const cmp = (a: Rank, b: Rank): number => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === b[i]) continue
    return a[i] < b[i] ? -1 : 1
  }
  return 0
}
/** 两个候选里取排名大的；排名完全相同时它们的规范化文本也相同（或由调用方把文本放进排名末尾） */
const maxBy = <T>(x: T, y: T, rank: (v: T) => Rank): T => (cmp(rank(x), rank(y)) >= 0 ? x : y)
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

/** 通用合并：只在一边有就取它；都是对象就逐键递归；其余按规范化文本取较大者。不认识的字段都走这里 */
export function mergeAny(a: any, b: any): any {
  if (a === undefined) return b
  if (b === undefined) return a
  if (isObj(a) && isObj(b)) {
    const out: Obj = {}
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const v = mergeAny(a[k], b[k])
      if (v !== undefined) out[k] = v
    }
    return out
  }
  return canon(a) >= canon(b) ? a : b
}

/** 两边都有就用 f 合并，只有一边有就取它 */
const both = (a: any, b: any, f: (x: any, y: any) => any) => (a === undefined ? b : b === undefined ? a : f(a, b))
/** 两边都是对象才逐键合并，否则退回通用合并（坏数据不抛异常） */
const bothObj = (a: any, b: any, f: (x: Obj, y: Obj) => any) => both(a, b, (x, y) => (isObj(x) && isObj(y) ? f(x, y) : mergeAny(x, y)))
const or = (a: any, b: any) => both(a, b, (x, y) => x || y)

/** 借助答案的程度：没借助（false）< 看过后自己重写（rewrite）< 直接用答案通过（solution）。两边都通过时取最轻的：有一边没借助就是真的没借助 */
const helpLevel = (v: unknown): number => (v === 'solution' ? 2 : v === 'rewrite' ? 1 : 0)
const lightestHelp = (x: unknown, y: unknown): unknown => maxBy(x, y, v => [-helpLevel(v), v === undefined ? '' : canon(v)])

/** 一道练习的记录：`passed` 取或；草稿与阶梯整组取更新的一边；`help` 跟着“通过发生的那一边”走；`t` 跟着胜出的那一组走。
 *  草稿组的排名：有没有这组字段 > 时间戳 `t` > 失败次数（进度更靠后）> 看过答案 > 规范化文本。没有时间戳（旧数据）时 t 是 0。 */
export function mergeExercise(x: any, y: any): any {
  if (!isObj(x) || !isObj(y)) return mergeAny(x, y)
  const groupOf = (o: Obj): Obj => {
    const g: Obj = {}
    for (const k of EX_KEYS) if (k !== 'help' && o[k] !== undefined) g[k] = o[k]
    return g
  }
  const rank = (o: Obj): Rank => {
    const g = groupOf(o)
    return [Object.keys(g).length ? 1 : 0, num(o.t), num(o.fails), o.sawSol ? 1 : 0, canon(g), canon(o.help)]
  }
  const xWins = cmp(rank(x), rank(y)) >= 0
  const win = xWins ? x : y
  const out: Obj = { ...groupOf(win) }
  const passed = or(x.passed, y.passed)
  if (passed !== undefined) out.passed = passed
  const px = !!x.passed
  const py = !!y.passed
  const help = px && py ? lightestHelp(x.help, y.help) : px ? x.help : py ? y.help : win.help
  if (help !== undefined) out.help = help
  if (x.t !== undefined || y.t !== undefined) out.t = num(win.t)
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)]))
    if (!EX_KNOWN.has(k)) {
      const v = mergeAny(x[k], y[k])
      if (v !== undefined) out[k] = v
    }
  return out
}

/** 章内自测：按题合并；同一题两边答案不同取正确的，都对或都错取较大的下标（只为确定） */
function mergeSc(a: any, b: any, answers?: number[]): any {
  return bothObj(a, b, (x: Obj, y: Obj) => {
    const out: Obj = {}
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      out[k] = both(x[k], y[k], (p, q) => maxBy(p, q, v => [answers && answers[+k] === v ? 1 : 0, num(v), canon(v)]))
    }
    return out
  })
}

function mergeBoolMap(a: any, b: any, f: (x: any, y: any) => any): any {
  return bothObj(a, b, (x: Obj, y: Obj) => {
    const out: Obj = {}
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) out[k] = both(x[k], y[k], f)
    return out
  })
}

/** 自我解释的笔记：更新的一边是正文；两边不同时，另一份保留在 noteAlts（界面显示为“另一台设备的版本”），不丢。
 *  没有时间戳时取更长的。noteAlts 是“所有出现过的文字减去正文”的集合，所以合并顺序不影响结果。 */
function mergeNote(a: Obj, b: Obj, out: Obj): { s: string; t: number } | undefined {
  const mains: { s: string; t: number }[] = []
  if (typeof a.note === 'string') mains.push({ s: a.note, t: num(a.ts?.note) })
  if (typeof b.note === 'string') mains.push({ s: b.note, t: num(b.ts?.note) })
  const alts = new Set<string>()
  for (const o of [a, b]) if (Array.isArray(o.noteAlts)) for (const s of o.noteAlts) if (typeof s === 'string') alts.add(s)
  let win: { s: string; t: number } | undefined
  for (const m of mains) {
    if (!win || cmp([m.t, m.s.length, m.s], [win.t, win.s.length, win.s]) > 0) win = m
  }
  if (win) out.note = win.s
  for (const m of mains) alts.add(m.s)
  if (win) alts.delete(win.s)
  alts.delete('')
  if (alts.size) out.noteAlts = [...alts].sort((p, q) => q.length - p.length || (p < q ? -1 : p > q ? 1 : 0))
  return win
}

/** 第一次完成的时间：两边都有取较早的 */
const earliest = (a: unknown, b: unknown): unknown =>
  typeof a === 'number' && typeof b === 'number' ? Math.min(a, b) : typeof a === 'number' ? a : typeof b === 'number' ? b : mergeAny(a, b)

export function mergeChapter(a: any, b: any, answers?: number[]): any {
  if (!isObj(a) || !isObj(b)) return isObj(a) ? a : isObj(b) ? b : mergeAny(a, b)
  const out: Obj = {}
  const set = (k: string, v: any) => {
    if (v !== undefined) out[k] = v
  }
  set('sc', mergeSc(a.sc, b.sc, answers))
  set('tried', mergeBoolMap(a.tried, b.tried, (x, y) => x || y)) // 答过就是答过
  set('first', mergeBoolMap(a.first, b.first, (x, y) => x && y)) // 首答是否正确：保守，一边答错就算错
  set('ex', mergeBoolMap(a.ex, b.ex, mergeExercise))
  set('done', or(a.done, b.done))
  set('doneAt', both(a.doneAt, b.doneAt, earliest))
  set('sx', or(a.sx, b.sx))
  const noteWin = mergeNote(a, b, out)
  if (isObj(a.ts) || isObj(b.ts)) {
    const ts: Obj = {}
    for (const k of new Set([...Object.keys(a.ts || {}), ...Object.keys(b.ts || {})])) {
      const x = a.ts?.[k]
      const y = b.ts?.[k]
      ts[k] = typeof x === 'number' && typeof y === 'number' ? Math.max(x, y) : mergeAny(x, y)
    }
    // 笔记的时间戳跟着胜出的那份文字走（不是两边的最大值）
    if (noteWin && ts.note !== undefined) ts.note = noteWin.t
    out.ts = ts
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!CHAPTER_KNOWN.has(k)) set(k, mergeAny(a[k], b[k]))
  return out
}

/** 复习卡片：按卡片键合并，同一张卡整条取最近一次复习（last）更晚的，不混拼字段；只在一边有的保留 */
export function mergeCards(a: any, b: any): any {
  return bothObj(a, b, (x: Obj, y: Obj) => {
    const out: Obj = {}
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      out[k] = both(x[k], y[k], (p, q) => maxBy(p, q, v => [num(v?.last), num(v?.n), canon(v)]))
    }
    return out
  })
}

/** 阶段测验记录最近一次作答的时间：可能是交卷失败、通过，或答到一半离开 */
export const stageTime = (r: any): number => Math.max(num(r?.t), num(r?.failedAt), num(r?.passedAt), num(r?.pending?.at))

/** 阶段测验：按阶段取最近一次作答的整条记录（现有语义“以最近一次为准”）；best 是历史最高分，取最大 */
export function mergeStages(a: any, b: any): any {
  return bothObj(a, b, (x: Obj, y: Obj) => {
    const out: Obj = {}
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      out[k] = both(x[k], y[k], (p, q) => {
        if (!isObj(p) || !isObj(q)) return mergeAny(p, q)
        const core = (r: Obj): Rank => {
          const { best: _b, t: _t, ...rest } = r
          return [stageTime(r), canon(rest)]
        }
        const win = { ...maxBy(p, q, core) }
        if (p.best !== undefined || q.best !== undefined) win.best = Math.max(num(p.best), num(q.best))
        if (p.t !== undefined || q.t !== undefined) win.t = Math.max(num(p.t), num(q.t))
        return win
      })
    }
    return out
  })
}

/** 先猜（实验台预测）：按实验台合并；点过“核对”的记录优先于没核对的，再比选项序号 */
export function mergePred(a: any, b: any): any {
  return bothObj(a, b, (x: Obj, y: Obj) => {
    const out: Obj = {}
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      out[k] = both(x[k], y[k], (p, q) => (isObj(p) && isObj(q) ? maxBy(p, q, v => [v.checked ? 1 : 0, num(v.pick), canon(v)]) : mergeAny(p, q)))
    }
    return out
  })
}

/** 上次阅读位置：取 t 更晚的那条整体；t 相同取规范化文本较大者 */
export function mergeLast(a: any, b: any): any {
  return both(a, b, (x, y) => (isObj(x) && isObj(y) ? maxBy(x, y, v => [num(v.t), canon(v)]) : mergeAny(x, y)))
}

/** 合并两份进度。不改参数，返回新对象（可能和参数共用子对象，调用方不要原地修改结果后再拿去合并） */
export function mergeProgress(a: unknown, b: unknown, ctx: MergeContext = {}): Obj {
  const x: Obj = isObj(a) ? a : {}
  const y: Obj = isObj(b) ? b : {}
  const out: Obj = {}
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
    let v: any
    if (k === '__srs') v = mergeCards(x[k], y[k])
    else if (k === '__stage') v = mergeStages(x[k], y[k])
    else if (k === '__pred') v = mergePred(x[k], y[k])
    else if (k === '__last') v = mergeLast(x[k], y[k])
    else if (k.startsWith('__')) v = mergeAny(x[k], y[k]) // 未知的 __ 键
    else v = mergeChapter(x[k], y[k], ctx.scAnswers?.(k))
    if (v !== undefined) out[k] = v
  }
  return out
}

/** 两份进度内容是否相同（忽略键的顺序） */
export const sameProgress = (a: unknown, b: unknown): boolean => canon(a) === canon(b)

/** 两份进度之间有差别的章 id（不含 __ 开头的键）。用来告诉用户“从云端合并了 N 章” */
export function changedChapters(before: unknown, after: unknown): string[] {
  const x: Obj = isObj(before) ? before : {}
  const y: Obj = isObj(after) ? after : {}
  return [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(k => !k.startsWith('__') && canon(x[k]) !== canon(y[k]))
}
