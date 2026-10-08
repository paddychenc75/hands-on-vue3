// 章号变化时改引用的纯函数（scripts/lib/renumber.mjs）。完整流程在 new-chapter / move-chapter 里（共用 lib/renumber-plan.mjs），用临时仓库副本实测过。
import { describe, expect, it } from 'vitest'
import { mapPath, remapExerciseCh, remapFrontmatterChapter, remapHeadings, remapRefs, renameTokens, setFrontmatterStage, shiftExerciseCh, shiftFrontmatterChapter, shiftHeadings, shiftRefs } from '../../scripts/lib/renumber.mjs'

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

describe('remapRefs：任意章号映射（移动章时不是整体 +1）', () => {
  // 例：把第 25 章移到第 23 章，第 23、24 章顺延；第 15 章以前不变
  const map = { 23: 24, 24: 25, 25: 23 }
  it('第 N 章：只改映射里有的，一次扫描不连环', () => {
    expect(remapRefs('第 23 章讲 SSR，第 24 章讲渲染器，第 25 章讲迁移，第 3 章不变。', map)).toBe('第 24 章讲 SSR，第 25 章讲渲染器，第 23 章讲迁移，第 3 章不变。')
  })
  it('N.M 节和“N.M 标题”', () => {
    expect(remapRefs('见 25.2 节和 23.1 节，25.3 节点不改。“24.4 水合”', map)).toBe('见 23.2 节和 24.1 节，25.3 节点不改。“25.4 水合”')
  })
  it('列表和区间：每个数字分别映射', () => {
    expect(remapRefs('第 23、24 章；第 12、13 章；第 2–9 章；第 2 到 7 章；第 24 和 25 章', map)).toBe('第 24、25 章；第 12、13 章；第 2–9 章；第 2 到 7 章；第 25 和 23 章')
  })
  it('也接受函数', () => {
    expect(remapRefs('第 5 章', n => n * 2)).toBe('第 10 章')
  })
  it('shiftRefs 是 remapRefs 的特例，列表里的数字也 +1', () => {
    expect(shiftRefs('第 9、10 章', 10)).toBe('第 9、11 章')
  })
  it('markdown 模式跳过围栏', () => {
    expect(remapRefs('第 25 章\n```\n第 25 章\n```', map, { markdown: true })).toBe('第 23 章\n```\n第 25 章\n```')
  })
})

describe('remap 系列：旧号 -> 任意新号', () => {
  it('小节标题', () => {
    expect(remapHeadings('### 25.1 甲\n### 25.2 乙\n### 24.1 丙', 25, 23)).toBe('### 23.1 甲\n### 23.2 乙\n### 24.1 丙')
  })
  it('frontmatter 的 chapter', () => {
    expect(remapFrontmatterChapter('---\nchapter: 25\n---', 25, 23)).toBe('---\nchapter: 23\n---')
  })
  it('练习的 ch', () => {
    expect(remapExerciseCh('ch: 25,', 25, 23)).toBe('ch: 23,')
  })
  it('frontmatter 的 stage：只改文件开头，正文里同名的行不动', () => {
    const md = '---\nid: x\nstage: 6\nchapter: 25\n---\n\n正文\nstage: 6\n'
    expect(setFrontmatterStage(md, 5)).toBe('---\nid: x\nstage: 5\nchapter: 25\n---\n\n正文\nstage: 6\n')
    expect(setFrontmatterStage('没有 frontmatter\nstage: 6', 5)).toBe('没有 frontmatter\nstage: 6')
  })
})
