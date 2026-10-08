// 章号变了（插入一章、移动一章）以后，仓库里要跟着改的地方，统一在这里计算和执行。
// new-chapter.mjs（插入）和 move-chapter.mjs（移动）共用。纯文本改写的函数在 renumber.mjs，有单元测试。
//
// 输入是 renumber 映射 renames：{ 旧文件名前缀: 新章号 }，例如 { '25-migrate': 23, '23-ssr': 24 }。
// 章 id 不变，所以文件名只换 NN 前缀；卡片键（章id#N）不受影响。
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './collect.mjs';
import { mapPath, pad2, remapExerciseCh, remapFrontmatterChapter, remapHeadings, remapRefs, remapRefsInLine, renameTokens, setFrontmatterStage } from './renumber.mjs';
import { maskFences } from '../../course/content-parse.mjs';

const abs = (...p) => path.join(ROOT, ...p);
const TEXT = /\.(md|ts|mts|vue|js|mjs|json|css)$/;
const SKIP = new Set(['node_modules', 'dist', 'cache', '.git']);
const NO_RENAME_TEXT = new Set(['course/AUTHORING.md', 'course/card-keys.snapshot.json']);

/** 要改“第 N 章”“N.M 节”“N.M 标题”引用的文件：章、练习、题库、术语表、首页、阶段测验页、实验台和示意图（注释里会写章号）、浏览器测试。
 * 不含 tests/unit（那里的“第 9 章”是单元测试的样例文字）、AUTHORING.md、AGENTS.md、README.md（人工核对） */
export const REF_FILES = p =>
  p.startsWith('course/chapters/') ||
  p.startsWith('course/exercises/') ||
  p.startsWith('course/labs/') ||
  p.startsWith('course/figures/') ||
  p.startsWith('course/check/') ||
  p.startsWith('tests/site/') ||
  p === 'course/checks/questions.ts' ||
  p === 'course/index.md' ||
  p === 'course/review.md' ||
  /^course\/glossary/.test(p);

function listFiles() {
  const files = [];
  const walk = dir => {
    for (const e of fs.readdirSync(abs(dir), { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else files.push(rel);
    }
  };
  walk('course');
  walk('tests');
  return files;
}

/**
 * 计算改动，不写文件。
 * @param chapters 现有章 [{ base, id, no }]
 * @param renumber { 旧 base: 新章号 }
 * @param stages   { 旧 base: 新阶段号 }，只改 frontmatter 的 stage
 * @returns { writes: [{from,to,text|null}], nameMap, noMap, textChanged, fencedRefs }
 *   fencedRefs：围栏代码块里写着“第 N 章”“N.M 节”、章号会变、但脚本没有改的行（代码注释里的引用，要人工改）
 */
export function planRenumber(chapters, renumber, stages = {}) {
  const byBase = Object.fromEntries(chapters.map(c => [c.base, c]));
  const moved = Object.keys(renumber).filter(b => renumber[b] !== byBase[b]?.no);
  const nameMap = {};
  const noMap = {};
  for (const b of moved) {
    nameMap[b] = `${pad2(renumber[b])}-${byBase[b].id}`;
    noMap[byBase[b].no] = renumber[b];
  }
  // 现有小节编号（### N.M 标题）：让没有“节”字的裸 N.M（如“（15.6）”“15.2 的 PatchFlag”）也跟着改号
  const known = new Set();
  for (const c of chapters) {
    const f = abs('course/chapters', c.base + '.md');
    if (!fs.existsSync(f)) continue;
    for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = /^###\s+(\d+\.\d+)\s/.exec(l);
      if (m) known.add(m[1]);
    }
  }
  const writes = [];
  let textChanged = 0;
  const fencedRefs = [];
  for (const p of listFiles()) {
    const to = moved.length ? mapPath(p, nameMap) : p;
    if (!TEXT.test(p) || NO_RENAME_TEXT.has(p)) {
      if (to !== p) writes.push({ from: p, to, text: null });
      continue;
    }
    const src = fs.readFileSync(abs(p), 'utf8');
    let text = src;
    const base = path.basename(p).replace(/\.[^.]+$/, '');
    if (moved.length) {
      text = renameTokens(text, nameMap);
      if (p.startsWith('course/chapters/') && nameMap[base]) {
        text = remapFrontmatterChapter(text, byBase[base].no, renumber[base]);
        text = remapHeadings(text, byBase[base].no, renumber[base]);
      }
      if (p.startsWith('course/exercises/') && nameMap[base]) text = remapExerciseCh(text, byBase[base].no, renumber[base]);
      if (REF_FILES(p)) {
        text = remapRefs(text, noMap, { markdown: p.endsWith('.md'), known });
        if (p.endsWith('.md')) {
          const fenced = maskFences(src).fenced;
          src.split('\n').forEach((l, i) => {
            if (fenced[i] && remapRefsInLine(l, noMap, known) !== l) fencedRefs.push(`${p}:${i + 1}  ${l.trim().slice(0, 100)}`);
          });
        }
      }
    }
    if (p.startsWith('course/chapters/') && stages[base] != null) text = setFrontmatterStage(text, stages[base]);
    if (text !== src) textChanged++;
    if (to !== p || text !== src) writes.push({ from: p, to, text });
  }
  return { writes, nameMap, noMap, textChanged, fencedRefs };
}

/** 执行 planRenumber 算出的改动：先写新文件，再删掉没有被写成新文件的旧文件，最后清空目录 */
export function applyWrites(writes) {
  for (const w of writes) {
    const target = abs(w.to);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (w.text === null) fs.copyFileSync(abs(w.from), target);
    else fs.writeFileSync(target, w.text);
  }
  const newPaths = new Set(writes.map(w => w.to));
  const renames = writes.filter(w => w.from !== w.to);
  for (const w of renames) if (!newPaths.has(w.from)) fs.rmSync(abs(w.from), { force: true });
  const dirs = [...new Set(renames.filter(w => /\/(labs|figures)\//.test(w.from)).map(w => path.dirname(w.from)))];
  for (const d of dirs) if (fs.existsSync(abs(d)) && !fs.readdirSync(abs(d)).length) fs.rmdirSync(abs(d));
}
