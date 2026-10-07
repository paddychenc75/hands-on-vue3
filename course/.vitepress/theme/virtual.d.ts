// 虚拟模块的类型。数据由 .vitepress/course-data.mts 在构建时生成。
declare module 'virtual:course-meta' {
  import type { ChapterMeta } from '../course-data.mts'
  export const chapters: ChapterMeta[]
}
declare module 'virtual:course-selfchecks' {
  import type { SelfCheckItem } from '../course-data.mts'
  export const selfchecks: SelfCheckItem[]
}
