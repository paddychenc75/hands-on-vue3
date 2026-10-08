/* 自我解释的有效字数（纯函数）。移植自 hands-on-react，逻辑不变。 */

/** 至少这么多个有效字，才展示参考要点 */
export const SELF_EXPLAIN_MIN = 30

/** 有效字数：去掉空白和标点，连续重复的字只算一个，防止用"啊啊啊"凑数；不同字少于 10 个会被压低到最多 9 */
export function effectiveLength(text: string): number {
  const t = text.replace(/[\s\p{P}\p{S}]/gu, '').replace(/(.)\1+/gu, '$1')
  return new Set(t).size < 10 ? Math.min(t.length, 9) : t.length
}

/** 自我解释区域的状态：已写的有效字数、还差几个字、要点是否展开。
    sx 是"点过对照"的标记；以前写够过、note 还在的，也算展开（和 hands-on-react 一致） */
export function selfExplainState(note: string | undefined, sx: boolean | undefined): { len: number; remain: number; unlocked: boolean } {
  const len = effectiveLength(note || '')
  return { len, remain: Math.max(0, SELF_EXPLAIN_MIN - len), unlocked: !!sx || (len >= SELF_EXPLAIN_MIN && !!note) }
}
