// 在中间插入一章时，后面的章号都要 +1。这里放“改引用”的纯函数，new-chapter.mjs 用，单元测试覆盖。
//
// 章号出现在这些地方：
//   文件名 NN-id.md / exercises/NN-id.ts / labs/NN-id/ / figures/NN-id/ / tests/site/labs/NN-id.js（以及所有写到这些名字的地方）
//   frontmatter 的 chapter；练习里的 ch；小节标题 ### N.M；正文、练习提示、题库里的“第 N 章”“N.M 节”“N.M 标题”
// 章 id（frontmatter 的 id）是存储键，不变；复习卡片键快照按 id 记，所以不受影响。
import { maskFences } from '../../course/content-parse.mjs';

/** 把一行里指向章号 >= from 的引用 +1（第 N 章、N.M 节、“N.M 标题”）。规则与 validate.mjs 的引用检查一致 */
export function shiftRefsInLine(line, from) {
  const up = n => (Number(n) >= from ? String(Number(n) + 1) : n);
  return line
    .replace(/(第\s*)(\d+)(\s*章)/g, (_m, a, n, b) => a + up(n) + b)
    .replace(/(?<![\d.])(\d{1,2})(\.\d{1,2}\s*节(?![点流省约奏日制]))/g, (_m, n, rest) => up(n) + rest)
    .replace(/([“"])(\d{1,2})(\.\d{1,2}\s+[^”"]+[”"])/g, (_m, q, n, rest) => q + up(n) + rest);
}

/** 对整段文字做 shiftRefsInLine。markdown 为真时跳过围栏代码块 */
export function shiftRefs(text, from, { markdown = false } = {}) {
  const lines = text.split('\n');
  const fenced = markdown ? maskFences(text).fenced : [];
  return lines.map((l, i) => (fenced[i] ? l : shiftRefsInLine(l, from))).join('\n');
}

/** 小节标题 ### N.M → ### (N+1).M，只改章号 === oldNo 的 */
export function shiftHeadings(text, oldNo) {
  const { fenced } = maskFences(text);
  return text
    .split('\n')
    .map((l, i) => (fenced[i] ? l : l.replace(/^(###\s+)(\d+)(\.\d+\s)/, (m, a, n, b) => (Number(n) === oldNo ? a + (oldNo + 1) + b : m))))
    .join('\n');
}

/** frontmatter 的 chapter: N → N+1 */
export function shiftFrontmatterChapter(text, oldNo) {
  return text.replace(/^(chapter:\s*)(\d+)\s*$/m, (m, a, n) => (Number(n) === oldNo ? a + (oldNo + 1) : m));
}

/** 练习里的 ch: N → N+1（只改等于 oldNo 的） */
export function shiftExerciseCh(text, oldNo) {
  return text.replace(/\bch:\s*(\d+)\b/g, (m, n) => (Number(n) === oldNo ? m.replace(n, String(oldNo + 1)) : m));
}

/** 两位章号 */
export const pad2 = n => String(n).padStart(2, '0');

/** 把文字里的旧文件名 NN-id 换成新的（map: { '12-reactivity': '13-reactivity' }），一次扫描，不会连环替换 */
export function renameTokens(text, map) {
  const keys = Object.keys(map);
  if (!keys.length) return text;
  const re = new RegExp(`(?<![\\w-])(${keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\w-])`, 'g');
  return text.replace(re, m => map[m]);
}

/** 路径里的 NN-id 段（或 NN-id.ext）换成新名字。path 用 / 分隔 */
export function mapPath(p, map) {
  return p
    .split('/')
    .map(seg => {
      const dot = seg.indexOf('.');
      const base = dot < 0 ? seg : seg.slice(0, dot);
      return map[base] ? map[base] + (dot < 0 ? '' : seg.slice(dot)) : seg;
    })
    .join('/');
}
