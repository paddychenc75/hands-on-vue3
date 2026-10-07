// 侧边栏：从 chapters/*.md 的 frontmatter 自动生成。新增章节不用改任何共享文件。
//   chapter  章号（数字，可省略）。有章号的页面按章号排在阶段内最前
//   stage    阶段 1 到 4
//   title    侧边栏、上一章/下一章用的短名（旧版 data-title）
//   order    没有章号的页面（速查表等）在阶段内的先后，小的在前，默认 1000
import fs from 'node:fs'
import path from 'node:path'

export const STAGES: Record<number, string> = {
  1: '阶段一 · 入门：使用 Vue',
  2: '阶段二 · 基础：编写组件',
  3: '阶段三 · 原理：内部原理',
  4: '阶段四 · 专家：生态和工程'
}

/** 只读 frontmatter 里的“键: 值”行。值可以是 JSON 风格的引号字符串或普通文字 */
export function readFrontmatter(file: string): Record<string, string> | null {
  let src: string
  try { src = fs.readFileSync(file, 'utf8') } catch { return null }
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src)
  if (!m) return null
  const out: Record<string, string> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line)
    if (!kv) continue
    let v = kv[2].trim()
    if (/^".*"$/.test(v)) { try { v = JSON.parse(v) } catch { v = v.slice(1, -1) } }
    else if (/^'.*'$/.test(v)) v = v.slice(1, -1).replace(/''/g, "'")
    out[kv[1]] = v
  }
  return out
}

export interface SidebarOptions {
  /** 只包含这些章（文件名，不带 .md）。省略时包含全部 */
  only?: string[]
}

export function buildSidebar(chaptersDir: string, opts: SidebarOptions = {}) {
  type Item = { text: string; link: string; chapter: number | null; order: number; file: string }
  const byStage: Record<number, Item[]> = { 1: [], 2: [], 3: [], 4: [] }
  const files = fs.existsSync(chaptersDir) ? fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md')).sort() : []
  for (const f of files) {
    const name = f.replace(/\.md$/, '')
    if (opts.only && !opts.only.includes(name)) continue
    const fm = readFrontmatter(path.join(chaptersDir, f))
    if (!fm || !fm.title) continue // 写到一半的文件不让它拖垮整个站点
    const stage = Number(fm.stage) || 4
    const chapter = fm.chapter ? Number(fm.chapter) : null
    byStage[stage] ||= []
    byStage[stage].push({
      text: chapter ? `${chapter} ${fm.title}` : fm.title,
      link: '/chapters/' + name,
      chapter,
      order: fm.order ? Number(fm.order) : 1000,
      file: name
    })
  }
  return Object.entries(STAGES).map(([s, text]) => ({
    text,
    items: byStage[Number(s)]
      .sort((a, b) => {
        if (a.chapter != null && b.chapter != null) return a.chapter - b.chapter
        if (a.chapter != null) return -1
        if (b.chapter != null) return 1
        return a.order - b.order || a.file.localeCompare(b.file)
      })
      .map(({ text, link }) => ({ text, link }))
  }))
}
