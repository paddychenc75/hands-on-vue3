// 在中间插入一章时改引用的纯函数（scripts/lib/renumber.mjs）。完整流程在 new-chapter 里，用临时仓库副本实测过。
import { describe, expect, it } from 'vitest'
import { mapPath, renameTokens, shiftExerciseCh, shiftFrontmatterChapter, shiftHeadings, shiftRefs } from '../../scripts/lib/renumber.mjs'

describe('shiftRefs：章号 >= from 的引用 +1', () => {
  it('第 N 章', () => {
    expect(shiftRefs('见第 9 章和第 10 章、第12章。', 10)).toBe('见第 9 章和第 11 章、第13章。')
  })
  it('N.M 节', () => {
    expect(shiftRefs('9.2 节和 10.5 节，还有 3.5 节点、10.1 节省', 10)).toBe('9.2 节和 11.5 节，还有 3.5 节点、10.1 节省')
  })
  it('“N.M 标题”', () => {
    expect(shiftRefs('第 10 章“10.5 用 onError”', 10)).toBe('第 11 章“11.5 用 onError”')
  })
  it('markdown 模式跳过围栏代码块', () => {
    const md = '第 10 章\n```\n第 10 章\n```\n第 10 章'
    expect(shiftRefs(md, 10, { markdown: true })).toBe('第 11 章\n```\n第 10 章\n```\n第 11 章')
  })
})

describe('章号相关的其他改写', () => {
  it('小节标题只改被移动的那一章', () => {
    expect(shiftHeadings('### 12.1 甲\n### 12.2 乙\n文字 12.3 节', 12)).toBe('### 13.1 甲\n### 13.2 乙\n文字 12.3 节')
    expect(shiftHeadings('### 11.1 甲', 12)).toBe('### 11.1 甲')
  })
  it('frontmatter 的 chapter', () => {
    expect(shiftFrontmatterChapter('---\nid: x\nchapter: 12\n---', 12)).toBe('---\nid: x\nchapter: 13\n---')
  })
  it('练习的 ch', () => {
    expect(shiftExerciseCh("title: 'a', ch: 12,\n", 12)).toBe("title: 'a', ch: 13,\n")
    expect(shiftExerciseCh("ch: 3,", 12)).toBe('ch: 3,')
  })
  it('文件名换名：一次扫描，不连环替换', () => {
    const map = { '12-reactivity': '13-reactivity', '13-scheduler': '14-scheduler' }
    expect(renameTokens('/chapters/12-reactivity 和 ../labs/13-scheduler/A.vue 和 112-reactivity', map)).toBe('/chapters/13-reactivity 和 ../labs/14-scheduler/A.vue 和 112-reactivity')
  })
  it('路径映射：目录段和文件名都换', () => {
    const map = { '12-reactivity': '13-reactivity' }
    expect(mapPath('course/labs/12-reactivity/A.vue', map)).toBe('course/labs/13-reactivity/A.vue')
    expect(mapPath('course/exercises/12-reactivity.ts', map)).toBe('course/exercises/13-reactivity.ts')
    expect(mapPath('course/exercises/03-refs.ts', map)).toBe('course/exercises/03-refs.ts')
  })
})
