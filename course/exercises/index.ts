// 汇总所有章的练习，按 id 查找。自动发现 exercises/*.ts（除 index.ts 和 types.ts），不用手动登记。
// 注意：config.mts 里有个 vite 插件会按文本替换下面这行 glob 的参数（只构建部分章时用），不要改动这一行的写法。
import type { Exercise } from './types'

const modules = import.meta.glob(['./*.ts', '!./index.ts', '!./types.ts'], { eager: true }) as Record<string, Record<string, Exercise>>

export const exercises: Record<string, Exercise> = {}
const owner: Record<string, string> = {}
for (const [file, mod] of Object.entries(modules)) {
  for (const [id, ex] of Object.entries(mod)) {
    if (typeof ex !== 'object' || ex === null || !('check' in ex)) continue
    if (id in exercises && import.meta.env?.DEV) {
      throw new Error(`练习 id 重复：${id}（${owner[id]} 和 ${file}）`)
    }
    exercises[id] = ex
    owner[id] = file
  }
}

export type { Exercise } from './types'
