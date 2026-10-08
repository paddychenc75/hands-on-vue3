// 章号变化时改引用的纯函数（scripts/lib/renumber.mjs）。完整流程在 new-chapter / move-chapter 里（共用 lib/renumber-plan.mjs），用临时仓库副本实测过。
import { describe, expect, it } from 'vitest'
import { mapPath, remapExerciseCh, remapFrontmatterChapter, remapHeadings, remapRefs, remapSections, renameTokens, setFrontmatterStage, shiftExerciseCh, shiftFrontmatterChapter, shiftHeadings, shiftRefs } from '../../scripts/lib/renumber.mjs'
import { planReorder } from '../../scripts/lib/reorder.mjs'

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

describe('shiftRefs：N.M 的各种写法都跟着改（旧版只改“N.M 节”，漏掉其余写法）', () => {
  it('并列和区间：每个数字分别改', () => {
    expect(shiftRefs('见 10.1、10.3 节；9.2 至 9.4 节；10.1 至 10.3 节', 10)).toBe('见 11.1、11.3 节；9.2 至 9.4 节；11.1 至 11.3 节')
  })
  it('不带“节”字的“见 N.M”和第 X 章 N.M', () => {
    expect(shiftRefs('总表见 10.7。第 10 章 10.4、10.7；[第 10 章](/chapters/10-x)的 10.1 和 10.3', 10)).toBe('总表见 11.7。第 11 章 11.4、11.7；[第 11 章](/chapters/10-x)的 11.1 和 11.3')
  })
  it('表格引用列里的裸 N.M；其他列的小数不动', () => {
    const md = '| 问题 | 本章位置 | 耗时 |\n|---|---|---|\n| a | 10.1–10.3 | 10.5 |'
    expect(shiftRefs(md, 10, { markdown: true })).toBe('| 问题 | 本章位置 | 耗时 |\n|---|---|---|\n| a | 11.1–11.3 | 10.5 |')
  })
  it('版本号和小数不动', () => {
    expect(shiftRefs('Vue 3.5.43 比 10.5 倍快，见 Vue 10.5.1', 10)).toBe('Vue 3.5.43 比 10.5 倍快，见 Vue 10.5.1')
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

describe('remapRefs 的 known 选项：没有“节”字的裸 N.M 只要真是小节编号也跟着改', () => {
  const known = new Set(['15.2', '15.4', '15.6', '16.4', '29.1', '29.2', '29.3', '3.3', '8.3'])
  const up = (n: number) => (n >= 15 ? n + 2 : n)
  it('括号、并列、区间、“N.M 的/说过”等裸写法', () => {
    expect(remapRefs('绑定改成 $setup.c（15.6）。15.2 的 PatchFlag；15.2 到 15.4 的优化；（29.1 和 29.2）；（29.3 起）', up, { known })).toBe(
      '绑定改成 $setup.c（17.6）。17.2 的 PatchFlag；17.2 到 17.4 的优化；（31.1 和 31.2）；（31.3 起）',
    )
  })
  it('不是小节编号的小数、版本号、数值不动', () => {
    // 15.9 不是小节；Vue 3.3 前面是英文字母；font-size="15.2" 是属性值；15.2 秒 / 15.4+ 是数值
    expect(remapRefs('15.9 不改，Vue 3.3 不改，Vite 8.3 不改，等 15.2 秒，15.4+ 版本', up, { known })).toBe('15.9 不改，Vue 3.3 不改，Vite 8.3 不改，等 15.2 秒，15.4+ 版本')
    expect(remapRefs('<text font-size="15.2">', up, { known })).toBe('<text font-size="15.2">')
    expect(remapRefs('// ===== 15.2：patch 的分发 =====', up, { known })).toBe('// ===== 17.2：patch 的分发 =====')
  })
  it('小节标题行不当成引用；围栏里的不改；不传 known 时和以前一样', () => {
    expect(remapRefs('### 15.2 标题\n正文（15.2）', up, { known, markdown: true })).toBe('### 15.2 标题\n正文（17.2）')
    expect(remapRefs('```\n// 15.2\n```', up, { known, markdown: true })).toBe('```\n// 15.2\n```')
    expect(remapRefs('正文（15.2）', up)).toBe('正文（15.2）')
  })
  it('“N.M 标题”只改一次（引号写法由原有规则处理，裸引用规则不重复改）', () => {
    expect(remapRefs('第 15 章“15.2 标题”和 15.4', up, { known })).toBe('第 17 章“17.2 标题”和 17.4')
  })
})

describe('remapSections：小节级别的改号（拆章）', () => {
  // 20.9 到 20.13 拆到第 21 章，成为 21.1 到 21.5；20.1 到 20.8 不动
  const g = (n: number, m: number): [number, number] => (n === 20 && m >= 9 ? [21, m - 8] : [n, m])
  it('N.M 节、并列、区间、见 N.M、第 X 章 N.M', () => {
    expect(remapSections('见 20.5 节和 20.13 节；20.9、20.10 节；20.9 至 20.12 节', g)).toBe('见 20.5 节和 21.5 节；21.1、21.2 节；21.1 至 21.4 节')
    expect(remapSections('第 20 章 20.8、20.11', g)).toBe('第 20 章 20.8、21.3')
  })
  it('“N.M 标题”写法', () => {
    expect(remapSections('“20.10 受控与非受控”讲了判断规则，“20.6 递归组件”不动', g)).toBe('“21.2 受控与非受控”讲了判断规则，“20.6 递归组件”不动')
  })
  it('不改“第 N 章”，不改围栏代码块和别的章', () => {
    expect(remapSections('第 20 章 20.9 节\n```\n// 20.9 节\n```\n19.9 节', g, { markdown: true })).toBe('第 20 章 21.1 节\n```\n// 20.9 节\n```\n19.9 节')
  })
  it('known：没有“节”字的裸 N.M 只要真是小节编号也改', () => {
    const known = new Set(['20.9', '20.11'])
    expect(remapSections('（20.11）说过；Vue 20.9 版', g, { known })).toBe('（21.3）说过；Vue 20.9 版')
  })
})

describe('planReorder：一次重排所有章', () => {
  const chs = [
    { base: '01-a', id: 'a', no: 1, stage: 1 },
    { base: '02-b', id: 'b', no: 2, stage: 2 },
    { base: '03-c', id: 'c', no: 3, stage: 2 },
    { base: '04-d', id: 'd', no: 4, stage: 3 },
  ]
  it('算出新章号和阶段变化', () => {
    const r = planReorder(chs, { order: ['a', 'c', 'b', 'd'], stages: { d: 2 } })
    expect(r.errors).toEqual([])
    expect(r.renumber).toEqual({ '01-a': 1, '02-b': 3, '03-c': 2, '04-d': 4 })
    expect(r.stages).toEqual({ '04-d': 2 })
  })
  it('漏章、重复、未知 id、阶段倒退都报错', () => {
    expect(planReorder(chs, { order: ['a', 'b', 'c'] }).errors.join()).toMatch(/漏了章 "d"/)
    expect(planReorder(chs, { order: ['a', 'b', 'b', 'c', 'd'] }).errors.join()).toMatch(/出现了两次/)
    expect(planReorder(chs, { order: ['a', 'b', 'c', 'd', 'x'] }).errors.join()).toMatch(/"x" 不是已有的章/)
    expect(planReorder(chs, { order: ['d', 'a', 'b', 'c'] }).errors.join()).toMatch(/同一阶段的章要连续/)
    expect(planReorder(chs, { order: ['a', 'b', 'c', 'd'], stages: { a: 99 } }).errors.join()).toMatch(/阶段号必须是 1 到/)
  })
})
