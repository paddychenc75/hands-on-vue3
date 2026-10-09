// 侧边栏：从 chapters/*.md 的 frontmatter 自动生成。新增章节不用改任何共享文件。
//   chapter  章号（数字，可省略）。有章号的页面按章号排在阶段内最前
//   stage    阶段 1 到 6（定义见 course/stages.ts）。不写 stage 的页面（速查表）是固定入口，排在侧边栏最上面，不属于任何阶段
//   title    侧边栏、上一章/下一章用的短名（旧版 data-title）
//   optional true 表示选读章：章名后面加一个小的“选读”标签（侧边栏和上一章/下一章的文字都是 v-html，所以直接写标签）
//   order    没有章号的页面（速查表等）在阶段内的先后，小的在前，默认 1000
import fs from 'node:fs'
import path from 'node:path'
import { STAGES, stageTitle } from '../stages.ts'
import { readFrontmatter } from '../content-parse.mjs'

/** 读一个文件的 frontmatter（只读“键: 值”行）。解析规则在 course/content-parse.mjs，站点和 Node 脚本共用同一份。文件不存在返回 null */
export function readFrontmatterFile(file: string): Record<string, string> | null {
  let src: string
  try { src = fs.readFileSync(file, 'utf8') } catch { return null }
  return readFrontmatter(src)
}

/** 选读章在侧边栏里的标签（样式 .opt-tag 在 style.css） */
export const OPTIONAL_TAG = '<span class="opt-tag">选读</span>'

export interface SidebarOptions {
  /** 只包含这些章（文件名，不带 .md）。省略时包含全部 */
  only?: string[]
}

export function buildSidebar(chaptersDir: string, opts: SidebarOptions = {}) {
  type Item = { text: string; link: string; chapter: number | null; order: number; file: string }
  const pinned: Item[] = []
  const byStage: Item[][] = STAGES.map(() => [])
  const files = fs.existsSync(chaptersDir) ? fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md')).sort() : []
  for (const f of files) {
    const name = f.replace(/\.md$/, '')
    if (opts.only && !opts.only.includes(name)) continue
    const fm = readFrontmatterFile(path.join(chaptersDir, f))
    if (!fm || !fm.title) continue // 写到一半的文件不让它拖垮整个站点
    const stage = fm.stage ? Number(fm.stage) : null
    const chapter = fm.chapter ? Number(fm.chapter) : null
    const order = fm.order ? Number(fm.order) : 1000
    if (stage == null) {
      // 固定入口：只显示标题，不带章号
      pinned.push({ text: fm.title, link: '/chapters/' + name, chapter, order, file: name })
      continue
    }
    if (!byStage[stage - 1]) throw new Error(`${f}：stage 必须是 1 到 ${STAGES.length}（实际是 ${fm.stage}）`)
    // 章号和“项目：”前缀各包一个 span（只给样式用：章号等宽，项目带强调色；文字内容不变）
    const title = fm.title.replace(/^项目[：:]/, m => `<span class="proj-tag">${m}</span>`)
    const label = chapter ? `<span class="ch-no">${chapter}.</span> ${title}` : title
    byStage[stage - 1].push({ text: fm.optional === 'true' ? `${label} ${OPTIONAL_TAG}` : label, link: '/chapters/' + name, chapter, order, file: name })
  }
  const sort = (a: Item, b: Item) => {
    if (a.chapter != null && b.chapter != null) return a.chapter - b.chapter
    if (a.chapter != null) return -1
    if (b.chapter != null) return 1
    return a.order - b.order || a.file.localeCompare(b.file)
  }
  const strip = ({ text, link }: Item) => ({ text, link })
  // 固定入口：最上面是“首页”和“课程地图”（原首页的内容），然后是“今日复习”（页面 review.md，带到期题数的徽标，由 AppEffects 写）和“术语表”（glossary.md，从各章术语块汇总），然后是没写 stage 的章页面（速查表），按 order 排
  const top = [{ text: '首页', link: '/' }, { text: '课程地图', link: '/roadmap' }, { text: '今日复习', link: '/review' }, { text: '术语表', link: '/glossary' }, ...pinned.sort((a, b) => a.order - b.order || a.file.localeCompare(b.file)).map(strip)]
  // 每个阶段的章列表末尾加一条“阶段测验”（/check/N，页面是 course/check/N.md），AppEffects 在它右边显示通过状态
  const groups = byStage
    .map((items, i) => ({ text: stageTitle(i + 1).replace(/^(\d+)\s/, '<span class="stage-no">$1</span> '), items: [...items.sort(sort).map(strip), { text: '阶段测验', link: `/check/${i + 1}` }], count: items.length }))
    .filter(g => g.count)
    .map(({ text, items }) => ({ text, items }))
  // 只构建部分章时，空的阶段不显示
  return [{ items: top }, ...groups]
}
