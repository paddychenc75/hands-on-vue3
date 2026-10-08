// 章号变了（在中间插入一章、移动一章）时，要改的引用和章号。这里放“改写文字”的纯函数，
// renumber-plan.mjs（new-chapter / move-chapter 共用）调用，单元测试覆盖。remap* 是通用的（旧号 -> 新号），shift* 是“章号 >= from 就 +1”的特例。
//
// 章号出现在这些地方：
//   文件名 NN-id.md / exercises/NN-id.ts / labs/NN-id/ / figures/NN-id/ / tests/site/labs/NN-id.js（以及所有写到这些名字的地方）
//   frontmatter 的 chapter；练习里的 ch；小节标题 ### N.M；正文、练习提示、题库里的“第 N 章”“N.M 节”“N.M 标题”
// 章 id（frontmatter 的 id）是存储键，不变；复习卡片键快照按 id 记，所以不受影响。
import { maskFences } from '../../course/content-parse.mjs';
import { remapSectionRefs } from './section-refs.mjs';

/** 章号映射：对象 { 旧号: 新号 }（没列出的章号不变）或函数 旧号 -> 新号 */
export const toNoFn = map => (typeof map === 'function' ? map : n => (map[n] ?? n));

/** 第 N 章 / 第 N、M 章 / 第 N–M 章 / 第 N 到 M 章：括号里每个数字都映射。区间两端分别映射（区间跨过被移动的章时含义会变，调用方要人工核对） */
const CH_REF = /(第\s*)(\d+(?:\s*(?:[、,，和与]|[–—\-~到至])\s*\d+)*)(\s*章)/g;

/**
 * 把一行里指向章 X 的引用改成指向 map(X)：第 N 章、N.M 节、“N.M 标题”。
 * 规则与 validate.mjs 的引用检查一致。map 见 toNoFn。章内 id 不变，所以只改数字。
 */
export function remapRefsInLine(line, map, known = null) {
  return remapRefs(line, map, { known });
}

/** 一组行：先改小节引用（section-refs.mjs：N.M 节、见 N.M、区间和并列、表格引用列，位置按原文算），再改“第 N 章”和“N.M 标题” */
function remapLines(lines, map, fenced = [], known = null) {
  const f = toNoFn(map);
  const up = n => String(f(Number(n)));
  return remapSectionRefs(lines, f, fenced, known).map((line, i) =>
    fenced[i]
      ? line
      : line
          .replace(CH_REF, (_m, a, nums, b) => a + nums.replace(/\d+/g, up) + b)
          .replace(/([“"])(\d{1,2})(\.\d{1,2}\s+[^”"]+[”"])/g, (_m, q, n, rest) => q + up(n) + rest),
  );
}

/** 对整段文字做 remapRefsInLine。markdown 为真时跳过围栏代码块。known：现有小节编号集合 Set('15.2', …)，传了就连没有“节”字的裸 N.M（见 section-refs.mjs 开头）也改 */
export function remapRefs(text, map, { markdown = false, known = null } = {}) {
  const fenced = markdown ? maskFences(text).fenced : [];
  return remapLines(text.split('\n'), map, fenced, known).join('\n');
}

/** 章号 >= from 的引用 +1（在中间插入一章时用） */
export const shiftRefsInLine = (line, from) => remapRefsInLine(line, n => (n >= from ? n + 1 : n));
export const shiftRefs = (text, from, opts) => remapRefs(text, n => (n >= from ? n + 1 : n), opts);

/** 小节标题 ### N.M → ### newNo.M，只改章号 === oldNo 的 */
export function remapHeadings(text, oldNo, newNo) {
  const { fenced } = maskFences(text);
  return text
    .split('\n')
    .map((l, i) => (fenced[i] ? l : l.replace(/^(###\s+)(\d+)(\.\d+\s)/, (m, a, n, b) => (Number(n) === oldNo ? a + newNo + b : m))))
    .join('\n');
}
export const shiftHeadings = (text, oldNo) => remapHeadings(text, oldNo, oldNo + 1);

/** frontmatter 的 chapter: oldNo → newNo */
export function remapFrontmatterChapter(text, oldNo, newNo) {
  return text.replace(/^(chapter:\s*)(\d+)\s*$/m, (m, a, n) => (Number(n) === oldNo ? a + newNo : m));
}
export const shiftFrontmatterChapter = (text, oldNo) => remapFrontmatterChapter(text, oldNo, oldNo + 1);

/** frontmatter 的 stage: N → stage（只改文件开头 --- 之间的那一行，正文里的同名文字不动） */
export function setFrontmatterStage(text, stage) {
  const m = /^---\n([\s\S]*?)\n---(?=\n|$)/.exec(text);
  if (!m) return text;
  const fm = m[1].replace(/^(stage:\s*)\d+\s*$/m, (_x, a) => a + stage);
  return text.slice(0, 4) + fm + text.slice(4 + m[1].length);
}

/** 练习里的 ch: oldNo → newNo（只改等于 oldNo 的） */
export function remapExerciseCh(text, oldNo, newNo) {
  return text.replace(/\bch:\s*(\d+)\b/g, (m, n) => (Number(n) === oldNo ? m.replace(n, String(newNo)) : m));
}
export const shiftExerciseCh = (text, oldNo) => remapExerciseCh(text, oldNo, oldNo + 1);

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
