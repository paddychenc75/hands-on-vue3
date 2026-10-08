// 从仓库里读出内容校验要用的全部输入（见 validate.mjs 顶部的 inp 说明）。
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
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

  const labTests = {};
  const labsDir = rd('tests/site/labs');
  if (fs.existsSync(labsDir))
    for (const f of fs.readdirSync(labsDir).filter(f => f.endsWith('.js')).sort()) {
      const data = require(path.join(labsDir, f));
      labTests[f.replace(/\.js$/, '')] = (Array.isArray(data) ? data : []).map(x => x?.id);
    }

  const files = new Set();
  for (const d of ['course', 'tests']) walk(root, d, files);
  const snapshot = fs.existsSync(rd('course/card-keys.snapshot.json')) ? JSON.parse(fs.readFileSync(rd('course/card-keys.snapshot.json'), 'utf8')) : null;
  return { chapterFiles, exercises, questions, stageCount, stageQuestions, labTests, files, snapshot };
}
