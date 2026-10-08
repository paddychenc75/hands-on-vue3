// 复习卡片的目录（卡片键 → 题目）。题目数据很大（全部章内自测的 HTML 加阶段测验题库），
// 所以只在需要时动态载入：课前热身、复习页、阶段测验页。章页面平时不载入它。
// 构建目录的规则在 course/engine/cards.ts 的 buildCatalog，卡片键规则见那里的开头注释。
import { buildCatalog, type Catalog } from '../../../engine/cards'
import { chapterById } from './learn'

let pending: Promise<Catalog> | null = null

/** 载入题目数据并建好卡片目录。只载入一次，之后返回同一个结果 */
export function loadCatalog(): Promise<Catalog> {
  pending ||= Promise.all([import('virtual:course-selfchecks'), import('../../../checks/questions')]).then(([sc, bank]) =>
    buildCatalog(sc.selfchecks, bank.Q, id => chapterById(id)?.stage)
  )
  return pending
}
