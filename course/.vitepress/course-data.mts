// 构建时从 chapters/*.md 抽取跨章功能要用的数据，做成两个虚拟模块：
//
//   virtual:course-meta         每章的元数据：id、文件名、标题、阶段、章号、自测题数、练习 id 列表。很小，章页面都会载入。
//                               用途：自动标记完成、首页进度、间隔复习、侧边栏的完成标记。
//   virtual:course-selfchecks   每章自测题的题干、选项、解析（已渲染成 HTML）。很大，只有复习页、阶段测验页和课前热身用动态 import 载入。
//                               用途：今日复习、混合练习、阶段测验、课前热身从各章自测题里出题。
//   virtual:course-summaries    每章“小结”块（::: summary）的内容，渲染成 HTML。自我解释写够字后在页面里展示它（章里的小结块本身默认隐藏）。
//
// 为什么在构建时抽取：自测题的题干、选项、解析都是 Markdown 文字，只存在于各章的 .md 里。
// 构建时一次性读完最简单，也不用在浏览器里去取别的页面。数据和章节正文来自同一份源文件，不会不同步。
//
// 自测题的序号规则和 Sc 组件一致：本章第几道“非先猜”的 <Sc>，从 0 起，按页面顺序。键是 "<章id>:<序号>"。
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import { createMarkdownRenderer } from 'vitepress'
import { readFrontmatter } from './sidebar.mts'
import { STAGE_COUNT } from '../stages.ts'
import { cjkFriendlyEmphasis } from './markdown-cjk.mts'
import { Q } from '../checks/questions.ts'

export interface ChapterMeta {
  id: string // 旧的 section id，进度存储用它做键
  file: string // 文件名（不带 .md），例如 03-refs
  link: string // 页面路径，例如 /chapters/03-refs
  title: string
  desc: string
  stage: number | null // 阶段 1 到 6（见 course/stages.ts）。速查表不属于任何阶段，是 null，不计入进度
  chapter: number | null // 没有章号的页面（速查表）是 null
  scCount: number // 本章自测题数（不含先猜）
  scAnswers: number[] // 本章自测的正确选项序号，按题号排列（长度 = scCount）
  ex: string[] // 本章练习 id
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

/** 一章的小结块（::: summary 到下一个 :::）里的 Markdown 原文。没有小结块返回空串 */
export function parseSummary(md: string): string {
  const m = /^::: summary[^\n]*\n([\s\S]*?)\n:::[ \t]*$/m.exec(md)
  return m ? m[1].trim() : ''
}

/** 把一个 .md 拆成自测题。只认 <Sc ...> ... </Sc>，带 predict 属性的先猜题不算。 */
export function parseSelfChecks(md: string): { a: number; stemSrc: string; opts: string[]; explainSrc: string }[] {
  const out: { a: number; stemSrc: string; opts: string[]; explainSrc: string }[] = []
  const re = /<Sc\b([^>]*)>([\s\S]*?)<\/Sc>/g
  for (const m of md.matchAll(re)) {
    if (/\bpredict\b/.test(m[1])) continue
    const a = /:a="(\d+)"/.exec(m[1])
    if (!a) throw new Error('<Sc> 缺少 :a 属性：' + m[0].slice(0, 60))
    let body = m[2]
    let explainSrc = ''
    const ex = /<template #explain>([\s\S]*?)<\/template>/.exec(body)
    if (ex) { explainSrc = ex[1].trim(); body = body.replace(ex[0], '') }
    const opts: string[] = []
    body = body.replace(/^<Opt>(.*?)<\/Opt>[ \t]*$/gm, (_s, t: string) => { opts.push(t.trim()); return '' })
    out.push({ a: Number(a[1]), stemSrc: body.trim(), opts, explainSrc })
  }
  return out
}

export function readChapters(chaptersDir: string): { meta: ChapterMeta; src: string }[] {
  const files = fs.existsSync(chaptersDir) ? fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md')).sort() : []
  const out: { meta: ChapterMeta; src: string }[] = []
  for (const f of files) {
    const file = f.replace(/\.md$/, '')
    const fm = readFrontmatter(path.join(chaptersDir, f))
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
        scCount: selfChecks.length,
        scAnswers: selfChecks.map(x => x.a),
        ex: [...src.matchAll(/<Exercise\s+id="([^"]+)"/g)].map(m => m[1]),
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
      if (id === META_ID || id === SC_ID || id === SUM_ID) return '\0' + id
    },
    async load(id) {
      if (id !== '\0' + META_ID && id !== '\0' + SC_ID && id !== '\0' + SUM_ID) return
      const chapters = readChapters(chaptersDir)
      for (const c of chapters) this.addWatchFile(path.join(chaptersDir, c.meta.file + '.md'))
      if (id === '\0' + META_ID) {
        return `export const chapters = ${JSON.stringify(chapters.map(c => c.meta))}`
      }
      const md = await createMarkdownRenderer(courseDir, { config: m => cjkFriendlyEmphasis(m) }, '/')
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
