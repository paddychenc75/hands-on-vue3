// 修复中文里 **粗体** 失效：CommonMark 规定，`**` 紧邻标点时，另一侧必须是空白或标点。
// 中文没有空格，所以 `**场景：…。**后台` 和 `的**“小纸条”**` 都不会变粗。
// 这里做两处放宽（思路和 markdown-it-cjk-friendly 相同）：
//   1. 中文标点和弯引号不算“标点”，当普通文字处理
//   2. `**` 另一侧紧邻汉字/假名/谚文时，也允许它紧邻 ASCII 标点
const CJK = /[぀-ヿ㐀-䶿一-鿿가-힯豈-﫿]/
// 中文标点和弯引号：判断“紧邻标点”时，把它们当成普通文字
const CJK_PUNCT = /[\u3000-\u303f\uff00-\uffef\u2018\u2019\u201c\u201d\u2014\u2026]/

export function cjkFriendlyEmphasis(md: any) {
  const { isWhiteSpace, isPunctChar, isMdAsciiPunct } = md.utils
  md.inline.State.prototype.scanDelims = function (start: number, canSplitWord: boolean) {
    const max = this.posMax
    const marker = this.src.charCodeAt(start)
    const lastChar = start > 0 ? this.src.charCodeAt(start - 1) : 0x20
    let pos = start
    while (pos < max && this.src.charCodeAt(pos) === marker) pos++
    const count = pos - start
    const nextChar = pos < max ? this.src.charCodeAt(pos) : 0x20
    const lastStr = String.fromCharCode(lastChar)
    const nextStr = String.fromCharCode(nextChar)
    const isLastPunct = !CJK_PUNCT.test(lastStr) && (isMdAsciiPunct(lastChar) || isPunctChar(lastStr))
    const isNextPunct = !CJK_PUNCT.test(nextStr) && (isMdAsciiPunct(nextChar) || isPunctChar(nextStr))
    const isLastWS = isWhiteSpace(lastChar)
    const isNextWS = isWhiteSpace(nextChar)
    const left = !isNextWS && (!isNextPunct || isLastWS || isLastPunct || CJK.test(lastStr))
    const right = !isLastWS && (!isLastPunct || isNextWS || isNextPunct || CJK.test(nextStr))
    const can_open = left && (canSplitWord || !right || isLastPunct)
    const can_close = right && (canSplitWord || !left || isNextPunct)
    return { can_open, can_close, length: count }
  }
}
