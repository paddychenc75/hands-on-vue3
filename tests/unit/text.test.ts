import { describe, expect, it } from 'vitest'
import { chapterRanges, esc, fmtInline, fmtOpt } from '../../course/engine/logic/text.ts'

describe('esc / fmtOpt', () => {
  it('esc 转义 & < >', () => {
    expect(esc('<a & b>')).toBe('&lt;a &amp; b&gt;')
  })
  it('选项文字是纯文本：转义后，形如 <Tag> 的标签名包成 code', () => {
    expect(fmtOpt('<div>')).toBe('<code>&lt;div&gt;</code>')
    expect(fmtOpt('a < b')).toBe('a &lt; b')
    expect(fmtOpt('&lt;Foo&gt; 和 <b>')).toBe('<code>&lt;Foo&gt;</code> 和 <code>&lt;b&gt;</code>')
  })
})

describe('chapterRanges：把章号列表写成“第 1–5、7、9–10 章”', () => {
  it('连续的合并成区间，不连续的用顿号隔开', () => {
    expect(chapterRanges([1, 2, 3, 4, 5])).toBe('第 1–5 章')
    expect(chapterRanges([14, 15, 16, 17, 18, 20, 23])).toBe('第 14–18、20、23 章')
    expect(chapterRanges([7])).toBe('第 7 章')
  })
  it('两个相邻的章用顿号，不写成区间；乱序和重复先整理', () => {
    expect(chapterRanges([9, 10])).toBe('第 9、10 章')
    expect(chapterRanges([10, 3, 4, 5, 3])).toBe('第 3–5、10 章')
  })
  it('空列表返回空串', () => {
    expect(chapterRanges([])).toBe('')
  })
})

describe('fmtInline：纯文本题库里的反引号', () => {
  it('反引号里的内容变成 code，里面的 < 被转义', () => {
    expect(fmtInline('`count` 是 `<div>`')).toBe('<code>count</code> 是 <code>&lt;div&gt;</code>')
  })
  it('没有闭合的反引号原样保留；标签名照旧包成 code', () => {
    expect(fmtInline('a ` b')).toBe('a ` b')
    expect(fmtInline('用 <Suspense> 包住')).toBe('用 <code>&lt;Suspense&gt;</code> 包住')
  })
  it('不产生可执行的标记', () => {
    expect(fmtInline('`<img onerror=x>` <script>')).not.toContain('<img')
    expect(fmtInline('<script>')).not.toContain('<script>')
  })
})
