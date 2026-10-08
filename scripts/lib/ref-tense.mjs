// 章节引用的“时态”检查（纯函数）：重排章的顺序以后，“（第 N 章）”原来是“后面会讲”，现在可能变成“前面讲过”，反过来也一样。
// 句子里的措辞要和对象章的位置一致：
//   说“讲过 / 已经讲 / 回顾”的，对象章必须在本章前面；
//   说“会讲 / 稍后讲 / 后面的第 N 章”的，对象章必须在本章后面。
// 能可靠判断的写法算错误（tenseProblems）：措辞紧贴着引用，例如“第 20 章讲过”“24.1 节已经讲过”“第 36 章（36.8 节）会讲”“回顾（第 25 章）”。
// 判断不了的（同一句里有“前面 / 之后 / 已经 / 将”之类的词，但不能确定指的是这个引用）列成人工清单（tenseCandidates），
// 用 `npm run check:content -- --tense` 看，不算错误。
// 本章自己（N 等于本章章号）的引用不管。

/** 引用：第 N 章，或 N.M 节（“第 N.M 节”也算） */
const REF = /第\s*(\d{1,2})\s*章|(\d{1,2})\.\d{1,2}\s*节/g;

/** 紧跟在引用后面的措辞：同一分句内（不跨 ，。！？；：、），最多隔 16 个字，隔着的可以是“（36.8 节）”“的递归组件”“和第 9 章”之类 */
const GAP = '[^，。！？；：、]{0,16}?';
const PAST_AFTER = new RegExp(`^${GAP}(?:已经)?(?:讲过|讲了|说过|已讲|提到过|提过|学过|写过|练过)`);
const FUTURE_AFTER = new RegExp(`^${GAP}(?:会(?:系统|详细|专门|再)?地?(?:讲|介绍|说明|展开)|将(?:会)?(?:系统|详细)?地?(?:讲|介绍)|再讲|才讲|稍后讲|后面讲)`);
/** 紧挨在引用前面的措辞 */
const PAST_BEFORE = /(?:回顾|复习|前面的?|前面讲过的|之前的?|前文)[（(：:]?\s*$/;
const FUTURE_BEFORE = /(?:后面的|稍后的|之后的|留到|下一部分的?)\s*$/;

/** 人工清单用的宽松词表：同一句里出现了这些词，但不能确定指的是哪个引用 */
const PAST_WORDS = ['讲过', '讲了', '说过', '已经', '前面', '之前', '学过', '回顾', '上一章', '刚才', '前文', '已讲', '提到过', '前几章', '先前', '读过', '写过'];
const FUTURE_WORDS = ['后面', '之后', '将在', '会在', '会讲', '稍后', '下一章', '以后', '后文', '后续', '留到', '再讲', '将讲', '将会', '往后'];

const refsIn = line => [...line.matchAll(REF)].map(m => ({ n: Number(m[1] ?? m[2]), start: m.index, end: m.index + m[0].length, text: m[0] }));

/**
 * 可靠的冲突：返回 [{ kind: 'past-after' | 'future-before', n, text, why }]。
 * past-after：措辞说“讲过 / 回顾”，但对象章（n）排在本章（own）后面。
 * future-before：措辞说“会讲 / 后面的”，但对象章排在本章前面。
 */
export function tenseProblems(line, own) {
  const out = [];
  if (!Number.isInteger(own)) return out;
  for (const r of refsIn(line)) {
    if (r.n === own) continue;
    const after = line.slice(r.end, r.end + 24);
    const before = line.slice(Math.max(0, r.start - 12), r.start);
    if (r.n > own && (PAST_AFTER.test(after) || PAST_BEFORE.test(before)))
      out.push({ kind: 'past-after', n: r.n, text: r.text, why: `这里说“已经讲过 / 回顾”，但 ${r.text} 排在本章（第 ${own} 章）后面，学习者还没学到` });
    if (r.n < own && (FUTURE_AFTER.test(after) || FUTURE_BEFORE.test(before)))
      out.push({ kind: 'future-before', n: r.n, text: r.text, why: `这里说“会讲 / 后面的”，但 ${r.text} 排在本章（第 ${own} 章）前面，学习者已经学过` });
  }
  return out;
}

/** 句子（以 。！？； 或换行为界）里包含引用位置的那一句 */
function sentenceOf(line, idx) {
  let s = 0;
  let e = line.length;
  for (const m of line.matchAll(/[。！？；\n]/g)) {
    if (m.index < idx) s = m.index + 1;
    else {
      e = m.index + 1;
      break;
    }
  }
  return line.slice(s, e).trim();
}

/** 人工清单：对象章在后面、句子里有“讲过 / 前面 / 已经”之类的词；或对象章在前面、句子里有“后面 / 之后 / 会讲”之类的词。已经被 tenseProblems 报错的不再列 */
export function tenseCandidates(line, own) {
  const out = [];
  if (!Number.isInteger(own)) return out;
  const hard = new Set(tenseProblems(line, own).map(p => p.text + p.n));
  for (const r of refsIn(line)) {
    if (r.n === own || hard.has(r.text + r.n)) continue;
    const sent = sentenceOf(line, r.start);
    const words = r.n > own ? PAST_WORDS.filter(w => sent.includes(w)) : FUTURE_WORDS.filter(w => sent.includes(w));
    if (words.length) out.push({ n: r.n, text: r.text, dir: r.n > own ? '对象章在后面' : '对象章在前面', words, sentence: sent.slice(0, 120) });
  }
  return out;
}
