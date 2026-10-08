// scripts/lib/content.mjs 里的抽取逻辑是 course/.vitepress/course-data.mts 的独立副本。
// 这个测试对全部章节断言两份输出一致；以后两份应当合并成一份（见 AGENTS.md「卡片键快照」一节）。
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseSelfChecks as viteSelfChecks, parseSummary as viteSummary } from '../../course/.vitepress/course-data.mts'
import { readFrontmatter as viteFrontmatter } from '../../course/.vitepress/sidebar.mts'
import { parseSelfChecks, parseSummary, readFrontmatter } from '../../scripts/lib/content.mjs'

const dir = path.resolve(__dirname, '../../course/chapters')
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))

describe('scripts/lib/content.mjs 和 course-data.mts 的抽取结果一致', () => {
  it('有章节文件', () => expect(files.length).toBeGreaterThan(20))
  for (const f of files) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8')
    it(`${f}：自测题、小结、frontmatter`, () => {
      expect(parseSelfChecks(src)).toEqual(viteSelfChecks(src))
      expect(parseSummary(src)).toBe(viteSummary(src))
      expect(readFrontmatter(src)).toEqual(viteFrontmatter(path.join(dir, f)))
    })
  }
})
