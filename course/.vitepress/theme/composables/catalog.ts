// 复习卡片的目录（卡片键 → 题目）。题目数据很大（全部章内自测的 HTML 加阶段测验题库），
// 所以只在需要时动态载入：课前热身、复习页、阶段测验页。章页面平时不载入它。
// 构建目录的规则在 course/engine/cards.ts 的 buildCatalog，卡片键规则见那里的开头注释。
import { selfcheckLoaders } from 'virtual:course-loaders'
import { buildCatalog, scKey, type Catalog } from '../../../engine/cards'
import type { CardItem } from '../../../engine/types'
import { chapterById } from './learn'

let pending: Promise<Catalog> | null = null

/** 载入题目数据并建好卡片目录。只载入一次，之后返回同一个结果 */
export function loadCatalog(): Promise<Catalog> {
  pending ||= Promise.all([import('virtual:course-selfchecks'), import('../../../checks/questions')]).then(([sc, bank]) =>
    buildCatalog(sc.selfchecks, bank.Q, id => chapterById(id)?.stage)
  )
  return pending
}

/** 课前热身只需要要出的那几道题：先用卡片键（`章id#N`，章内自测的数量来自元数据）挑题，再只载入这几道题所在的章（每章一个很小的分块），
    不必载入全部章的自测题和阶段测验题库。传入的键不存在时返回的数组里没有它。载入失败会抛错，由调用方决定怎么提示 */
export async function loadScCards(keys: readonly string[]): Promise<CardItem[]> {
  const chapterIds = [...new Set(keys.map(k => k.slice(0, k.lastIndexOf('#'))))]
  const parts = await Promise.all(chapterIds.map(async id => {
    const load = selfcheckLoaders[id]
    return load ? (await load()).selfchecks : []
  }))
  const cat = buildCatalog(parts.flat(), [])
  return keys.map(k => cat.cardOf(k)).filter((c): c is CardItem => !!c)
}

/** 一章章内自测的卡片键（不含内容）：热身挑题用 */
export const scKeysOf = (chapterId: string): string[] => Array.from({ length: chapterById(chapterId)?.scCount ?? 0 }, (_, i) => scKey(chapterId, i))
