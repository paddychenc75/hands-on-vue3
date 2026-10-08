// 构建时从 chapters/*.md 抽取跨章功能要用的数据，做成几个虚拟模块（抽取逻辑在 course/content-parse.mjs，站点和 Node 脚本共用）：
//
//   virtual:course-meta         每章的元数据：id、文件名、标题、阶段、章号、自测题数、练习 id 列表。很小，章页面都会载入。
//                               用途：自动标记完成、首页进度、间隔复习、侧边栏的完成标记。
//   virtual:course-selfchecks   每章自测题的题干、选项、解析（已渲染成 HTML）。很大，只有复习页、阶段测验页和课前热身用动态 import 载入。
//                               用途：今日复习、混合练习、阶段测验、课前热身从各章自测题里出题。
//   virtual:course-summaries    每章“小结”块（::: summary）的内容，渲染成 HTML。自我解释写够字后在页面里展示它（章里的小结块本身默认隐藏）。
//   virtual:course-glossary     全站术语表：各章“本章术语”块合并去重，带不使用的同义词（course/writing-terms.mjs）。
//
// 为什么在构建时抽取：自测题的题干、选项、解析都是 Markdown 文字，只存在于各章的 .md 里。
// 构建时一次性读完最简单，也不用在浏览器里去取别的页面。数据和章节正文来自同一份源文件，不会不同步。
//
// 自测题的序号规则和 Sc 组件一致：本章第几道“非先猜”的 <Sc>，从 0 起，按页面顺序。键是 "<章id>:<序号>"。
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import { createMarkdownRenderer } from 'vitepress'
import { readFrontmatterFile } from './sidebar.mts'
import { collectGlossary, parseReadingTime, parseSelfChecks, parseSummary } from '../content-parse.mjs'
import { WRITING_TERMS } from '../writing-terms.mjs'
import { STAGE_COUNT } from '../stages.ts'
import { cjkFriendlyEmphasis } from './markdown-cjk.mts'
import { Q } from '../checks/questions.ts'
import { BASE_PATH } from '../site.mjs'

export interface ChapterMeta {
  id: string // 旧的 section id，进度存储用它做键
  file: string // 文件名（不带 .md），例如 03-refs
  link: string // 页面路径，例如 /chapters/03-refs
  title: string
  desc: string
  stage: number | null // 阶段 1 到 6（见 course/stages.ts）。速查表不属于任何阶段，是 null，不计入进度
  chapter: number | null // 没有章号的页面（速查表）是 null
  optional: boolean // 选读章（frontmatter 写 optional: true）：不计入总进度和阶段完成数的分母，学了照常记录
  scCount: number // 本章自测题数（不含先猜）
  scAnswers: number[] // 本章自测的正确选项序号，按题号排列（长度 = scCount）
  ex: string[] // 本章练习 id
  rt?: string // 本章“阅读时间”块（::: rt）里的文字，没写是 undefined。章头直接显示它，正文里不再单独渲染这个块
  checkCount: number // 本章的阶段测验专用题数（题库 checks/questions.ts 里属于这一章的题）。卡片键 `章id#cN` 的 N 小于它才有效
}

export interface SelfCheckItem {
  key: string // "<章id>:<序号>"
  chapterId: string
  a: number // 正确选项序号
  stem: string // 题干 HTML
  opts: string[] // 选项 HTML（行内）
  explain: string // 解析 HTML
}

const META_ID = 'virtual:course-meta'
const SC_ID = 'virtual:course-selfchecks'
const SUM_ID = 'virtual:course-summaries'
const GLOSS_ID = 'virtual:course-glossary'

/** 术语表里的一个条目：同一个术语在多章出现时合并成一条 */
export interface GlossaryEntry {
  term: string
  def: string // 首次出现的定义，渲染成行内 HTML
  text: string // 同一定义的纯文字（悬浮提示用）
  avoid?: string // 不使用的同义词（来自 course/writing-terms.mjs 的写作规则表，只有同名术语才有）
  chapters: { id: string; link: string; chapter: number | null; title: string }[] // 出现过这个术语的章，第一项是首次出现的章
}
/** 同一术语在不同章里写了不同的定义（只提示作者，不影响页面：页面用首次出现的定义） */
export interface GlossaryConflict {
  term: string
  defs: { file: string; def: string }[]
}

/** 渲染成行内 HTML 和纯文字 */
function renderDef(md: { render(s: string): string }, src: string) {
  const html = md.render(src).trim().replace(/^<p>([\s\S]*)<\/p>$/, '$1')
  const text = html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  return { html, text }
}

export function readChapters(chaptersDir: string): { meta: ChapterMeta; src: string }[] {
  const files = fs.existsSync(chaptersDir) ? fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md')).sort() : []
  const out: { meta: ChapterMeta; src: string }[] = []
  for (const f of files) {
    const file = f.replace(/\.md$/, '')
    const fm = readFrontmatterFile(path.join(chaptersDir, f))
    if (!fm || !fm.id || !fm.title) continue
    const src = fs.readFileSync(path.join(chaptersDir, f), 'utf8')
    const stage = fm.stage ? Number(fm.stage) : null
    if (stage != null && !(Number.isInteger(stage) && stage >= 1 && stage <= STAGE_COUNT)) {
      throw new Error(`${f}：stage 必须是 1 到 ${STAGE_COUNT} 的整数（实际是 ${fm.stage}）`)
    }
    // 有章号的正文章必须指定阶段，否则它不会计入进度
    if (stage == null && fm.chapter) throw new Error(`${f}：有 chapter 的章必须写 stage（1 到 ${STAGE_COUNT}）`)
    const selfChecks = parseSelfChecks(src)
    out.push({
      src,
      meta: {
        id: fm.id,
        file,
        link: '/chapters/' + file,
        title: fm.title,
        desc: fm.desc || '',
        stage,
        chapter: fm.chapter ? Number(fm.chapter) : null,
        optional: fm.optional === 'true',
        scCount: selfChecks.length,
        scAnswers: selfChecks.map(x => x.a),
        ex: [...src.matchAll(/<Exercise\s+id="([^"]+)"/g)].map(m => m[1]),
        rt: parseReadingTime(src) || undefined,
        checkCount: Q.filter(row => row[3] === fm.id).length
      }
    })
  }
  // 按阶段、章号排序（不属于任何阶段的页面排在后面，没有章号的排在最后）
  return out.sort((x, y) => (x.meta.stage ?? 1e9) - (y.meta.stage ?? 1e9) || (x.meta.chapter ?? 1e9) - (y.meta.chapter ?? 1e9) || x.meta.file.localeCompare(y.meta.file))
}

export function courseDataPlugin(courseDir: string): Plugin {
  const chaptersDir = path.join(courseDir, 'chapters')
  return {
    name: 'course-data',
    resolveId(id) {
      if (id === META_ID || id === SC_ID || id === SUM_ID || id === GLOSS_ID) return '\0' + id
    },
    async load(id) {
      if (id !== '\0' + META_ID && id !== '\0' + SC_ID && id !== '\0' + SUM_ID && id !== '\0' + GLOSS_ID) return
      const chapters = readChapters(chaptersDir)
      for (const c of chapters) this.addWatchFile(path.join(chaptersDir, c.meta.file + '.md'))
      if (id === '\0' + META_ID) {
        return `export const chapters = ${JSON.stringify(chapters.map(c => c.meta))}`
      }
      const md = await createMarkdownRenderer(courseDir, { config: m => cjkFriendlyEmphasis(m) }, BASE_PATH)
      if (id === '\0' + GLOSS_ID) {
        const { entries, conflicts } = collectGlossary(chapters)
        for (const c of conflicts as GlossaryConflict[]) this.warn(`术语“${c.term}”在多章里的定义不同：${c.defs.map(d => d.file).join('、')}（术语表用首次出现的定义）`)
        const avoidOf = new Map<string, string>(WRITING_TERMS.flatMap((w: { terms: string[]; avoid: string }) => w.terms.map(t => [t, w.avoid] as [string, string])))
        const glossary: GlossaryEntry[] = entries.map((e: { term: string; defSrc: string; chapters: GlossaryEntry['chapters'] }) => {
          const { html, text } = renderDef(md, e.defSrc)
          return { term: e.term, def: html, text, avoid: avoidOf.get(e.term), chapters: e.chapters }
        })
        return `export const glossary = ${JSON.stringify(glossary)}`
      }
      if (id === '\0' + SUM_ID) {
        const sums: Record<string, string> = {}
        for (const c of chapters) {
          const src = parseSummary(c.src)
          if (src) sums[c.meta.id] = md.render(src)
        }
        return `export const summaries = ${JSON.stringify(sums)}`
      }
      const items: SelfCheckItem[] = []
      for (const c of chapters) {
        parseSelfChecks(c.src).forEach((s, i) => {
          items.push({
            key: c.meta.id + ':' + i,
            chapterId: c.meta.id,
            a: s.a,
            stem: md.render(s.stemSrc),
            // renderInline 在 VitePress 的 attrs 插件下会出错，所以整段渲染后去掉外层 <p>
            opts: s.opts.map(o => md.render(o).trim().replace(/^<p>([\s\S]*)<\/p>$/, '$1')),
            explain: md.render(s.explainSrc)
          })
        })
      }
      return `export const selfchecks = ${JSON.stringify(items)}`
    }
  }
}
