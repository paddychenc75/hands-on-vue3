import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'
import container from 'markdown-it-container'
import deflist from 'markdown-it-deflist'
import { buildSidebar } from './sidebar.mts'
import { cjkFriendlyEmphasis } from './markdown-cjk.mts'
import { courseDataPlugin } from './course-data.mts'

// ---- 并行测试用的环境变量（日常开发和正式构建不设）----
//   COURSE_CHAPTERS=03-refs,04-computed  只构建这些章，其他章 srcExclude 掉
//   COURSE_OUT_DIR / COURSE_CACHE_DIR    输出目录和缓存目录，每次运行用独立目录，互不覆盖
const COURSE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CHAPTERS_DIR = path.join(COURSE_DIR, 'chapters')
const only = (process.env.COURSE_CHAPTERS || '').split(/[,\s]+/).map(s => s.replace(/\.md$/, '')).filter(Boolean)
const allChapters = fs.existsSync(CHAPTERS_DIR) ? fs.readdirSync(CHAPTERS_DIR).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')) : []
for (const c of only) if (!allChapters.includes(c)) throw new Error(`COURSE_CHAPTERS 里的章不存在：${c}（现有：${allChapters.join(' ')}）`)
const excluded = only.length ? allChapters.filter(c => !only.includes(c)).map(c => `chapters/${c}.md`) : []

// 只构建指定章时，exercises/index.ts 的 glob 也只放这些章的练习文件，别人写到一半的练习不会让构建失败
const EX_GLOB = "['./*.ts', '!./index.ts', '!./types.ts']"
const exerciseFilter = {
  name: 'course-exercise-filter',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!only.length || !/exercises[\\/]index\.ts$/.test(id) || !code.includes(EX_GLOB)) return null
    return code.replace(EX_GLOB, JSON.stringify(only.map(c => `./${c}.ts`)))
  }
}

// 简单容器：<div class="类名"><div class="t">标题</div> … </div>
const SIMPLE: Record<string, [string, string]> = {
  goals: ['goal', '目标'],
  terms: ['terms', '本章术语'],
  why: ['why', '为什么需要它'],
  pitfalls: ['pitfalls', '注意'],
  summary: ['summary', '小结'],
  selfcheck: ['selfcheck', '自测']
}

export default defineConfig({
  title: '动手学 Vue 3',
  // 只构建部分章节时，指向其他章的链接必然找不到，不算死链。全站构建仍然检查
  ignoreDeadLinks: only.length > 0,
  description: 'Vue3 互动课程：每章有讲解、练习和自测',
  lang: 'zh-CN',
  srcExclude: ['AUTHORING.md', ...excluded],
  outDir: process.env.COURSE_OUT_DIR || undefined,
  cacheDir: process.env.COURSE_CACHE_DIR || undefined,
  lastUpdated: false,
  vite: {
    plugins: [exerciseFilter, courseDataPlugin(COURSE_DIR)],
    build: { chunkSizeWarningLimit: 2000 }, // 带编译器的 Vue 和 CodeMirror 是按需加载的大块
    // 练习编辑器源码在仓库根目录的 editor/，在 course/ 之外
    server: { fs: { allow: ['..'] } }
  },
  markdown: {
    config(md) {
      md.use(deflist)
      cjkFriendlyEmphasis(md)

      for (const [name, [cls, title]] of Object.entries(SIMPLE)) {
        md.use(container, name, {
          render(tokens: any[], idx: number) {
            if (tokens[idx].nesting !== 1) return '</div>\n'
            // 容器名后面写了文字，就用它当标题（例如 ::: pitfalls 注意：不要用 index 作为 key）
            const custom = tokens[idx].info.trim().slice(name.length).trim()
            return `<div class="${cls}"><div class="t">${custom ? md.renderInline(custom) : title}</div>\n`
          }
        })
      }

      // ::: rt  阅读时间提示
      md.use(container, 'rt', {
        render: (tokens: any[], idx: number) => (tokens[idx].nesting === 1 ? '<div class="rt">\n' : '</div>\n')
      })

      // ::: analogy  类比
      md.use(container, 'analogy', {
        render: (tokens: any[], idx: number) =>
          tokens[idx].nesting === 1
            ? '<div class="analogy"><div class="ic">类比</div><div>\n'
            : '</div></div>\n'
      })

      // ::: deep 标题  深入（默认展开，在渲染阶段加 open，学习者仍可手动收起）
      md.use(container, 'deep', {
        render(tokens: any[], idx: number) {
          const t = tokens[idx]
          if (t.nesting !== 1) return '</details>\n'
          const title = t.info.trim().slice('deep'.length).trim()
          return `<details class="deep" open><summary><span class="step">深入</span>${md.renderInline(title)}<span class="opt">可选</span></summary>\n`
        }
      })

      // ::: think 标题  想一想（默认折叠的小问答）
      md.use(container, 'think', {
        render(tokens: any[], idx: number) {
          const t = tokens[idx]
          if (t.nesting !== 1) return '</div></details>\n'
          const title = t.info.trim().slice('think'.length).trim()
          return `<details class="think"><summary>${md.renderInline(title)}</summary><div>\n`
        }
      })

      // ::: note  说明框（左边一条蓝灰线）。::: note warn 是橙色警示版
      md.use(container, 'note', {
        render: (tokens: any[], idx: number) =>
          tokens[idx].nesting === 1
            ? `<div class="note${/\bwarn\b/.test(tokens[idx].info) ? ' warn' : ''}">\n`
            : '</div>\n'
      })

      // ::: cheat 标题  速查表外层的折叠块（旧版 details.cheatwrap）
      md.use(container, 'cheat', {
        render(tokens: any[], idx: number) {
          const t = tokens[idx]
          if (t.nesting !== 1) return '</details>\n'
          const title = t.info.trim().slice('cheat'.length).trim()
          return `<details class="cheatwrap"><summary>${md.renderInline(title)}</summary>\n`
        }
      })

      // :::: pair 里放两个 ::: col 说明文字，左右并排；窄屏上下排
      md.use(container, 'pair', {
        render: (tokens: any[], idx: number) => (tokens[idx].nesting === 1 ? '<div class="pair">\n' : '</div>\n')
      })
      md.use(container, 'col', {
        render(tokens: any[], idx: number) {
          const t = tokens[idx]
          if (t.nesting !== 1) return '</div>\n'
          const cap = t.info.trim().slice('col'.length).trim()
          return `<div class="pair-col"><span class="cap">${md.renderInline(cap)}</span>\n`
        }
      })

      // 小节标题 “### 1.1 标题”：把编号渲染成 <span class="step">。
      // 放在所有插件之后，这样目录和锚点仍用完整文字。
      md.core.ruler.push('course_step_heading', state => {
        const toks = state.tokens
        for (let i = 0; i < toks.length; i++) {
          if (toks[i].type === 'heading_open' && toks[i].tag === 'h3') {
            const first = toks[i + 1]?.children?.[0]
            const m = first && first.type === 'text' && /^(\d+\.\d+)\s+/.exec(first.content)
            if (m) first.meta = { ...(first.meta || {}), step: m[1], rest: first.content.slice(m[0].length) }
          }
        }
      })
      // 文字里的 {{ 一律转成实体，Vue 不会把它当插值。行内代码加 v-pre。
      // 所以正文里可以直接写 {{ count }}，不用特殊处理。
      const escText = (s: string) => md.utils.escapeHtml(s).replace(/\{\{/g, '&#123;&#123;')
      md.renderer.rules.text = (tokens, idx) => {
        const t = tokens[idx]
        if (t.meta && t.meta.step) return `<span class="step">${t.meta.step}</span> ${escText(t.meta.rest)}`
        return escText(t.content)
      }
      md.renderer.rules.code_inline = (tokens, idx, _o, _e, self) =>
        `<code v-pre${self.renderAttrs(tokens[idx])}>${md.utils.escapeHtml(tokens[idx].content)}</code>`

      // VitePress 把“行首的组件标签”当成 HTML 块，块里的 Markdown 不会解析。
      // Goal 和 Opt 的内容是一行文字，要解析行内 Markdown（反引号、**粗体**），
      // 所以让它们按普通段落处理。
      const INLINE_COMPONENTS = /^<\/?(Goal|Opt)(\s|>|\/)/
      const rules = (md.block.ruler as any).__rules__ as { name: string; fn: any; alt: string[] }[]
      const hb = rules.find(r => r.name === 'html_block')!
      const origHtmlBlock = hb.fn
      md.block.ruler.at(
        'html_block',
        (state, startLine, endLine, silent) => {
          const pos = state.bMarks[startLine] + state.tShift[startLine]
          if (INLINE_COMPONENTS.test(state.src.slice(pos, state.eMarks[startLine]))) return false
          return origHtmlBlock(state, startLine, endLine, silent)
        },
        { alt: hb.alt }
      )
    }
  },
  themeConfig: {
    // 顶部导航只放固定入口。章节都在侧边栏，不要按章往这里加
    nav: [{ text: '首页', link: '/' }, { text: '课程', link: '/chapters/01-first', activeMatch: '^/chapters/' }],
    // 侧边栏自动生成：读 chapters/*.md 的 frontmatter（chapter stage title order），见 sidebar.mts
    sidebar: buildSidebar(CHAPTERS_DIR, { only: only.length ? only : undefined }),
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一章', next: '下一章' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '深色模式',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            displayDetails: '显示详情',
            noResultsText: '没有找到相关结果',
            resetButtonTitle: '清除查询',
            backButtonTitle: '关闭搜索',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
          }
        }
      }
    }
  }
})
