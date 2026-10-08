// course/content-parse.mjs 是章节 Markdown 解析的唯一实现：站点构建（course-data.mts、sidebar.mts）和 Node 脚本共用它。
// 这里测这一份实现（样例 + 全部真实章节），并守住“不再出现第二份副本”。
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectGlossary, parseReadingTime, parseSelfChecks, parseSummary, parseTerms, parseTermsBlock, readFrontmatter } from '../../course/content-parse.mjs'
import { readChapters } from '../../course/.vitepress/course-data.mts'
import { readFrontmatterFile } from '../../course/.vitepress/sidebar.mts'

const root = path.resolve(__dirname, '../..')
const dir = path.join(root, 'course/chapters')
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))

const SAMPLE = `---
title: "示例：带引号"
id: demo
stage: 2
chapter: 7
desc: 一句话
---

# 示例

::: rt
阅读主线约 7 分钟，深入内容约 2 分钟（可选）。
另外留时间做练习和自测。
:::

::: terms
ref
: 保存一个值的响应式容器。

nextTick
: 等 DOM 更新完再执行的函数。
:::

<Sc predict :a="0">
先猜
<Opt>甲</Opt>
<Opt>乙</Opt>
</Sc>

<Sc :a="1">

下面哪个对？

<Opt>错的</Opt>
<Opt>对的</Opt>

<template #explain>

解析：因为……

</template>
</Sc>

::: summary
本章要点。
:::
`

describe('样例', () => {
  it('readFrontmatter：引号字符串、数字、没有 frontmatter', () => {
    expect(readFrontmatter(SAMPLE)).toEqual({ title: '示例：带引号', id: 'demo', stage: '2', chapter: '7', desc: '一句话' })
    expect(readFrontmatter('# 没有')).toBeNull()
    expect(readFrontmatter("---\ntitle: 'it''s'\n---\n")).toEqual({ title: "it's" })
  })
  it('parseSelfChecks 跳过先猜题，抽出题干、选项、解析', () => {
    const sc = parseSelfChecks(SAMPLE)
    expect(sc).toHaveLength(1)
    expect(sc[0]).toMatchObject({ a: 1, stemSrc: '下面哪个对？', opts: ['错的', '对的'] })
    expect(sc[0].explainSrc).toBe('解析：因为……')
  })
  it('parseSelfChecks 缺 :a 抛错', () => {
    expect(() => parseSelfChecks('<Sc>\n题\n<Opt>x</Opt>\n</Sc>')).toThrow(/缺少 :a/)
  })
  it('parseSummary / parseTermsBlock / parseReadingTime', () => {
    expect(parseSummary(SAMPLE)).toBe('本章要点。')
    expect(parseTermsBlock(SAMPLE)).toContain('nextTick')
    expect(parseReadingTime(SAMPLE)).toBe('阅读主线约 7 分钟，深入内容约 2 分钟（可选）。 另外留时间做练习和自测。')
    expect(parseSummary('没有')).toBe('')
    expect(parseReadingTime('没有')).toBe('')
  })
  it('parseTerms：术语一行，下一行 `: ` 开头；格式不对抛错', () => {
    expect(parseTerms(parseTermsBlock(SAMPLE))).toEqual([{ term: 'ref', def: '保存一个值的响应式容器。' }, { term: 'nextTick', def: '等 DOM 更新完再执行的函数。' }])
    expect(() => parseTerms('只有术语没有解释')).toThrow(/本章术语块格式不对/)
  })
  it('collectGlossary：同名术语合并、记录出现的章、定义不同的记冲突；没有阶段的页面不看', () => {
    const mk = (id: string, chapter: number, stage: number | null, terms: string) => ({
      meta: { id, file: `0${chapter}-${id}`, link: `/chapters/0${chapter}-${id}`, chapter, title: id, stage },
      src: `::: terms\n${terms}\n:::\n`,
    })
    const { entries, conflicts } = collectGlossary([
      mk('a', 1, 1, 'ref\n: 甲\n\nkey\n: 键'),
      mk('b', 2, 1, 'ref\n: 乙'),
      mk('cheat', 3, null, 'hidden\n: 不算'),
    ])
    expect(entries.map((e: any) => e.term)).toEqual(['ref', 'key'])
    expect(entries[0]).toMatchObject({ term: 'ref', defSrc: '甲' })
    expect(entries[0].chapters.map((c: any) => c.id)).toEqual(['a', 'b'])
    expect(conflicts.map((c: any) => c.term)).toEqual(['ref'])
  })
  it('collectGlossary：脚手架骨架里的占位术语（含“【待写】”）不进术语表', () => {
    const mk = (id: string, chapter: number, terms: string) => ({
      meta: { id, file: `0${chapter}-${id}`, link: `/chapters/0${chapter}-${id}`, chapter, title: id, stage: 1 },
      src: `::: terms\n${terms}\n:::\n`,
    })
    const { entries, conflicts } = collectGlossary([
      mk('a', 1, '【待写】术语\n: 【待写】术语的一句话定义。\n\nref\n: 甲'),
      mk('b', 2, '【待写】术语\n: 【待写】术语的一句话定义。'),
    ])
    expect(entries.map((e: any) => e.term)).toEqual(['ref'])
    expect(conflicts).toEqual([])
  })
})

describe('全部真实章节', () => {
  it('有章节文件', () => expect(files.length).toBeGreaterThan(20))
  it('站点用的 readFrontmatterFile 和脚本用的 readFrontmatter 读出同样的东西', () => {
    for (const f of files) expect(readFrontmatterFile(path.join(dir, f)), f).toEqual(readFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8')))
  })
  it('站点的章元数据（readChapters）和直接解析一致：自测题数与答案、小结', () => {
    for (const { meta, src } of readChapters(dir)) {
      const sc = parseSelfChecks(src)
      expect(meta.scCount, meta.file).toBe(sc.length)
      expect(meta.scAnswers, meta.file).toEqual(sc.map((s: any) => s.a))
      expect(meta.rt, meta.file).toBe(parseReadingTime(src) || undefined)
    }
  })
  it('每个带阶段的章都有阅读时间块和恰好一个小结块', () => {
    for (const { meta, src } of readChapters(dir).filter(c => c.meta.stage != null)) {
      expect(parseReadingTime(src), meta.file).not.toBe('')
      expect(parseSummary(src), meta.file).not.toBe('')
    }
  })
})

describe('不再有第二份副本', () => {
  it('这些解析函数只在 course/content-parse.mjs 里定义', () => {
    const names = ['parseSelfChecks', 'parseSummary', 'parseTermsBlock', 'parseTerms', 'collectGlossary', 'readFrontmatter']
    const places = ['course/.vitepress/course-data.mts', 'course/.vitepress/sidebar.mts', 'scripts/lib/validate.mjs', 'scripts/lib/collect.mjs', 'scripts/new-chapter.mjs', 'scripts/check-content.mjs']
    for (const rel of places) {
      const src = fs.readFileSync(path.join(root, rel), 'utf8')
      for (const n of names) expect(new RegExp(`(function\\s+${n}\\b|const\\s+${n}\\s*=)`).test(src), `${rel} 里又定义了 ${n}`).toBe(false)
    }
  })
})
