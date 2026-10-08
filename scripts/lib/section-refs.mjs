// 小节引用（“N.M”）的统一扫描：内容校验（validate.mjs）和章号改写（renumber.mjs）共用这一份，
// 这样“校验认得的写法”和“插入、移动章时会跟着改的写法”永远是同一批，不会有一边漏掉。
//
// 认得的写法（一个“链”是用分隔符连起来的一串 N.M）：
//   N.M 节　　　　　　　　　　　　“节”字结尾（链上每个 N.M 都算）：17.3、17.4 节；18.2 至 18.4 节
//   见 N.M　　　　　　　　　　　　不带“节”字：见 17.8；参见 3.2
//   第 X 章 N.M　　　　　　　　　前面写明了章：第 11 章 11.4、11.7；[第 23 章](/chapters/23-perf)的 23.1 和 23.3
//   表格单元格　　　　　　　　　　表头是“位置 / 小节 / 章节 / 出处 / 对应 / 节”的那一列，格子里的 N.M（21.1–21.6）
// 分隔符：、 ， , 和 与 及 至 到 – — - ~ ～
// 没有上面任何记号的 N.M（例如“3.5”“1.5 倍”）不当成小节引用，避免把版本号和小数当成引用。

const REF = '(\\d{1,2})\\.(\\d{1,2})(?!\\d|\\.\\d)';
const SEP = '\\s*(?:、|，|,|和|与|及|至|到|[–—~～-])\\s*';
const CHAIN = new RegExp(`(?<![\\d.\\w])${REF}(?:${SEP}${REF})*`, 'g');
const TOKEN = new RegExp(`(?<![\\d.\\w])${REF}`, 'g');
const TAIL_JIE = /^\s*节(?![点流省约奏日制])/;
const HEAD_JIAN = /(?:见|参见|详见|参阅|参考)\s*$/;
const HEAD_CHAPTER = /第\s*(\d+)\s*章(?:\]\([^)]*\))?\s*(?:的)?\s*$/;
/** 表头里出现这些词，说明这一列放的是小节引用 */
const REF_COLUMN = /位置|小节|章节|出处|对应|节/;
/** 区间分隔符（其余分隔符是并列） */
export const RANGE_SEP = /^\s*(?:至|到|[–—~～-])\s*$/;

/** 把一行表格拆成格子：{ text, start }（start 是格子文字在整行里的起点） */
function splitCells(line) {
  const t = /^(\s*)\|/.exec(line);
  if (!t) return null;
  const cells = [];
  let from = t[0].length;
  for (let i = from; i <= line.length; i++) {
    if (i === line.length || (line[i] === '|' && line[i - 1] !== '\\')) {
      if (i < line.length || line.slice(from).trim() !== '') cells.push({ text: line.slice(from, i), start: from });
      from = i + 1;
    }
  }
  return cells;
}

/** 在一段文字里找出小节引用的链。forced 为真时（引用列的格子）不要求前后有记号 */
function chainsIn(text, offset, forced) {
  const out = [];
  for (const m of text.matchAll(CHAIN)) {
    const before = text.slice(0, m.index);
    const after = text.slice(m.index + m[0].length);
    const pre = HEAD_CHAPTER.exec(before);
    const kind = pre ? 'chapter' : TAIL_JIE.test(after) ? 'jie' : HEAD_JIAN.test(before) ? 'jian' : forced ? 'cell' : null;
    if (!kind) continue;
    const tokens = [];
    for (const t of m[0].matchAll(TOKEN)) tokens.push({ n: Number(t[1]), m: Number(t[2]), start: offset + m.index + t.index, end: offset + m.index + t.index + t[0].length });
    const seps = [];
    for (let i = 0; i + 1 < tokens.length; i++) seps.push(text.slice(tokens[i].end - offset, tokens[i + 1].start - offset));
    out.push({ kind, explicit: pre ? Number(pre[1]) : null, tokens, seps });
  }
  return out;
}

/**
 * 扫描一组行（一份文件或一段文字），返回所有小节引用的链：[{ line（下标）, kind, explicit（前面写明的章号或 null）, tokens: [{ n, m, start, end }], seps }]。
 * lines 是行文字数组；fenced[i] 为真的行（围栏代码块）跳过。认得表格：表头含“位置 / 小节 / …”的列，格子里的 N.M 都算引用。
 */
export function scanSectionRefs(lines, fenced = []) {
  const out = [];
  let refCols = null; // 当前表格里哪些列是引用列
  let prevTable = false;
  lines.forEach((line, i) => {
    if (fenced[i]) { prevTable = false; refCols = null; return; }
    const cells = splitCells(line);
    if (!cells) {
      prevTable = false;
      refCols = null;
      for (const c of chainsIn(line, 0, false)) out.push({ line: i, ...c });
      return;
    }
    if (!prevTable) {
      // 表头行
      refCols = cells.map(c => REF_COLUMN.test(c.text));
      prevTable = true;
      for (const c of chainsIn(line, 0, false)) out.push({ line: i, ...c });
      return;
    }
    if (cells.every(c => /^\s*:?-{2,}:?\s*$/.test(c.text))) return; // 分隔行
    cells.forEach((c, j) => {
      for (const ch of chainsIn(c.text, c.start, !!refCols?.[j])) out.push({ line: i, ...ch });
    });
  });
  return out;
}

/** 把一份文字里的小节引用的章号用 f（旧号 -> 新号）改写。markdown 模式由调用方传 fenced。只改链里的数字，位置由 scanSectionRefs 给出 */
export function remapSectionRefs(lines, f, fenced = []) {
  const edits = new Map(); // 行下标 -> [{start,end,text}]
  for (const ch of scanSectionRefs(lines, fenced)) {
    for (const t of ch.tokens) {
      const nn = f(t.n);
      if (nn === t.n) continue;
      const s = lines[ch.line].slice(t.start, t.end);
      if (!edits.has(ch.line)) edits.set(ch.line, []);
      edits.get(ch.line).push({ start: t.start, end: t.end, text: s.replace(/^\d{1,2}/, String(nn)) });
    }
  }
  return lines.map((l, i) => {
    const es = edits.get(i);
    if (!es) return l;
    let r = l;
    for (const e of es.sort((a, b) => b.start - a.start)) r = r.slice(0, e.start) + e.text + r.slice(e.end);
    return r;
  });
}
