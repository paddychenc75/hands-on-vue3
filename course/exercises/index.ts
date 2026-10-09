// 练习定义按章懒加载：每章一个分块（exercises/NN-id.ts），自动发现，不用手动登记。
// 章页面的 <Exercise> 挂载后才载入本章的那一块；首页、复习页、术语表页不载入任何练习定义。
// 练习标题和每章的练习 id 清单在章元数据里（virtual:course-meta），所以只要显示名字、统计进度时不必载入这里。
// 注意：config.mts 里有个 vite 插件会按文本替换下面这行 glob 的参数（只构建部分章时用），不要改动这一行的写法。
import type { Exercise } from './types'

const loaders = import.meta.glob(['./*.ts', '!./index.ts', '!./types.ts']) as Record<string, () => Promise<Record<string, Exercise>>>

const cache = new Map<string, Promise<Record<string, Exercise>>>()

/** 载入一章的练习定义（章文件名，如 '03-refs'）：{ 练习 id: 定义 }。同一章只载入一次；失败不缓存，可以重试。章不存在时抛错 */
export function loadChapterExercises(file: string): Promise<Record<string, Exercise>> {
  let p = cache.get(file)
  if (!p) {
    const load = loaders[`./${file}.ts`]
    if (!load) return Promise.reject(new Error(`没有这一章的练习文件：${file}`))
    p = load().then(mod => {
      const out: Record<string, Exercise> = {}
      for (const [id, ex] of Object.entries(mod)) if (typeof ex === 'object' && ex !== null && 'check' in ex) out[id] = ex as Exercise
      return out
    })
    p.catch(() => cache.delete(file))
    cache.set(file, p)
  }
  return p
}

export type { Exercise } from './types'
