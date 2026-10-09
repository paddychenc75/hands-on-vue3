// 虚拟模块的类型。数据由 .vitepress/course-data.mts 在构建时生成。
declare module 'virtual:course-meta' {
  import type { ChapterMeta } from '../course-data.mts'
  export const chapters: ChapterMeta[]
}
declare module 'virtual:course-selfchecks' {
  import type { SelfCheckItem } from '../course-data.mts'
  export const selfchecks: SelfCheckItem[]
}
declare module 'virtual:course-glossary' {
  import type { GlossaryEntry } from '../course-data.mts'
  /** 全站术语表：从各章“本章术语”块汇总，同名合并 */
  export const glossary: GlossaryEntry[]
}
declare module 'virtual:course-loaders' {
  import type { SelfCheckItem } from '../course-data.mts'
  /** 章 id → 载入这一章自测题的函数（每章一个分块）。热身只取要出的那几章 */
  export const selfcheckLoaders: Record<string, () => Promise<{ selfchecks: SelfCheckItem[] }>>
  /** 章 id → 载入这一章“小结”HTML 的函数（每章一个分块）。自我解释只取本章的 */
  export const summaryLoaders: Record<string, () => Promise<{ summary: string }>>
}
