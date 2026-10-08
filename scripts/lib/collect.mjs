// 从仓库里读出内容校验要用的全部输入（见 validate.mjs 顶部的 inp 说明）。
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadTs } from './load-ts.mjs';

export const ROOT = path.resolve(import.meta.dirname, '../..');
const require = createRequire(import.meta.url);

/** 递归列出目录下的文件（相对 ROOT，用 / 分隔），跳过构建产物和依赖 */
function walk(root, dir, out) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'cache' || e.name === '.git') continue;
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(root, rel, out);
    else out.add(rel);
  }
}

export async function collect(root = ROOT) {
  const rd = (...p) => path.join(root, ...p);
  const chapterFiles = {};
  for (const f of fs.readdirSync(rd('course/chapters')).filter(f => f.endsWith('.md')).sort())
    chapterFiles[f.replace(/\.md$/, '')] = fs.readFileSync(rd('course/chapters', f), 'utf8');

  const exercises = {};
  for (const f of fs.readdirSync(rd('course/exercises')).filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'types.ts').sort())
    exercises[f.replace(/\.ts$/, '')] = await loadTs(rd('course/exercises', f));

  const questions = (await loadTs(rd('course/checks/questions.ts'))).Q;
  const stageCount = (await loadTs(rd('course/stages.ts'))).STAGE_COUNT;
  const stageQuestions = (await loadTs(rd('course/engine/logic/stageCheck.ts'))).STAGE_QUESTIONS;

  // 不在 chapters/ 里、但也会写章引用和站内链接的页面：首页、术语表、今日复习、阶段测验页
  const extraPages = {};
  for (const rel of ['course/index.md', 'course/glossary.md', 'course/review.md'])
    if (fs.existsSync(rd(rel))) extraPages[rel] = fs.readFileSync(rd(rel), 'utf8');
  if (fs.existsSync(rd('course/check')))
    for (const f of fs.readdirSync(rd('course/check')).filter(f => f.endsWith('.md')).sort()) extraPages[`course/check/${f}`] = fs.readFileSync(rd('course/check', f), 'utf8');

  // 首页“写作规则”里的固定用词表（也是术语表页“不这样说”一栏的数据）
  const writingTerms = (await import(pathToFileURL(rd('course/writing-terms.mjs')).href)).WRITING_TERMS;

  // 首页「学习路线」的三条路线（用章 id 引用章，章号由首页组件从元数据取）
  const learningPaths = (await import(pathToFileURL(rd('course/learning-paths.mjs')).href)).LEARNING_PATHS;

  const labTests = {};
  const labsDir = rd('tests/site/labs');
  if (fs.existsSync(labsDir))
    for (const f of fs.readdirSync(labsDir).filter(f => f.endsWith('.js')).sort()) {
      const data = require(path.join(labsDir, f));
      labTests[f.replace(/\.js$/, '')] = (Array.isArray(data) ? data : []).map(x => x?.id);
    }

  const files = new Set();
  for (const d of ['course', 'tests']) walk(root, d, files);
  // 实验台和示意图的 .vue 源文件：只扫其中的章引用和小节引用
  const vueFiles = {};
  for (const rel of files) if (/^course\/(?:labs|figures)\/.+\.vue$/.test(rel)) vueFiles[rel] = fs.readFileSync(rd(rel), 'utf8');
  const snapshot = fs.existsSync(rd('course/card-keys.snapshot.json')) ? JSON.parse(fs.readFileSync(rd('course/card-keys.snapshot.json'), 'utf8')) : null;
  return { chapterFiles, extraPages, writingTerms, learningPaths, exercises, questions, stageCount, stageQuestions, labTests, files, vueFiles, snapshot };
}
