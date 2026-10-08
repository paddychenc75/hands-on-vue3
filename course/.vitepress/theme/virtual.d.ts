// 虚拟模块的类型。数据由 .vitepress/course-data.mts 在构建时生成。
declare module 'virtual:course-meta' {
  import type { ChapterMeta } from '../course-data.mts'
  export const chapters: ChapterMeta[]
}
declare module 'virtual:course-selfchecks' {
  import type { SelfCheckItem } from '../course-data.mts'
  export const selfchecks: SelfCheckItem[]
}
declare module 'virtual:course-summaries' {
  /** 章 id → 小结块渲染成的 HTML */
  export const summaries: Record<string, string>
}
declare module 'virtual:course-glossary' {
  import type { GlossaryEntry } from '../course-data.mts'
  /** 全站术语表：从各章“本章术语”块汇总，同名合并 */
  export const glossary: GlossaryEntry[]
}
