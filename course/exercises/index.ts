// 汇总所有章的练习，按 id 查找。新增一章的练习文件后，在这里加一行 import 和一行展开。
import type { Exercise } from './types'
import * as ch01 from './01-first'

export const exercises: Record<string, Exercise> = {
  ...ch01
}

export type { Exercise } from './types'
