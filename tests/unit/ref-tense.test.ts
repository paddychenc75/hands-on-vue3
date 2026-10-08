// 章节引用的时态检查（scripts/lib/ref-tense.mjs）：措辞要和对象章的位置一致。
import { describe, expect, it } from 'vitest'
import { tenseCandidates, tenseProblems } from '../../scripts/lib/ref-tense.mjs'

const kinds = (line: string, own: number) => tenseProblems(line, own).map((p: any) => `${p.kind}:${p.n}`)

describe('说“讲过 / 回顾”，对象章却在后面 -> past-after', () => {
  // 下面几句是审察报告 deep-stages.md 点名的交叉引用错误（旧章号），规则必须能抓住
  it('第 N 章讲过 / 讲了 / 说过', () => {
    expect(kinds('所以组合式函数用它清理（第 20 章讲过这个选择）。', 15)).toEqual(['past-after:20'])
    expect(kinds('（第 19 章讲了手写 `h()` 传插槽函数时，还要加 `$stable: true`……）', 14)).toEqual(['past-after:19'])
    expect(kinds('让变化只波及它自己（第 33 章讲过这个思路）。', 32)).toEqual(['past-after:33'])
  })
  it('N.M 节已经讲过；第 N 章（N.M 节）讲过', () => {
    expect(kinds('替换成 `props` 和 `emits` 选项，24.1 节已经讲过。', 17)).toEqual(['past-after:24'])
    expect(kinds('服务器上的 Suspense 只渲染默认内容，第 36 章（36.8 节）讲过。', 33)).toContain('past-after:36')
  })
  it('回顾（第 N 章）、前面的第 N 章', () => {
    expect(kinds('回顾（第 25 章）：添加任务后，要把列表滚动到新任务。', 23)).toEqual(['past-after:25'])
    expect(kinds('前面的第 30 章已经说明了原因。', 23)).toContain('past-after:30')
  })
  it('对象章在前面时是对的，不报', () => {
    expect(kinds('第 8 章讲过这个选择。', 26)).toEqual([])
    expect(kinds('回顾（第 3 章）：ref 的 .value。', 23)).toEqual([])
  })
})

describe('说“会讲 / 后面的”，对象章却在前面 -> future-before', () => {
  it('第 N 章会讲 / 再讲', () => {
    expect(kinds('这个机制第 3 章会讲。', 23)).toEqual(['future-before:3'])
    expect(kinds('详细的做法后面的第 8 章再说，留到第 2 章也行。', 23)).toContain('future-before:8')
  })
  it('对象章在后面时是对的，不报', () => {
    expect(kinds('这个机制第 31 章会讲。', 25)).toEqual([])
  })
})

describe('不误报', () => {
  it('本章自己的引用、没有时态措辞的引用、跨分句的词', () => {
    expect(kinds('第 23 章讲过自己。', 23)).toEqual([])
    expect(kinds('用法见第 40 章。', 23)).toEqual([])
    expect(kinds('先看第 40 章，我们讲过这个思路。', 23)).toEqual([]) // 逗号隔开：“讲过”不属于第 40 章
    expect(kinds('第 40 章讲过这个思路。', Number.NaN)).toEqual([]) // 不知道本章章号（首页等）不检查
  })
})

describe('人工清单：能确定是哪个引用的归 problems，其余有时态词的列出来', () => {
  it('同一句里有“之前 / 前面”等词，但不紧贴引用 -> candidates，不是错误', () => {
    const line = '所以第 8 章的 useFetch 把 `toValue(url)` 写在 `await` 之前。'
    expect(tenseProblems(line, 4)).toEqual([])
    expect(tenseCandidates(line, 4).map((c: any) => `${c.n}:${c.dir}`)).toEqual(['8:对象章在后面'])
  })
  it('已经算错误的不再进清单', () => {
    expect(tenseCandidates('第 20 章讲过这个选择。', 15)).toEqual([])
  })
  it('对象章在前面、句子里有“后面”', () => {
    expect(tenseCandidates('第 2 章：@ 后面只写函数名时，Vue 调用它。', 6).map((c: any) => c.dir)).toEqual(['对象章在前面'])
  })
})
