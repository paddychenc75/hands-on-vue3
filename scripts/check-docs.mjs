// 文档里的数字核对：AGENTS.md、README.md、course/AUTHORING.md、首页组件里写到的章数、练习数、自测数、实验台数、术语数等，
// 必须和仓库的实际数量一致。加章、加练习、加术语之后，文档里的数字会过期；这个脚本把它们找出来。
//
//   npm run check:docs
//
// 只认带单位的数字（“26 章”“70 道练习”“42 个实验台”……）。“第 N 章”这种章号引用不管。
// 某一行里的数字确实是别的意思（比如“每个阶段 5 章”），在行尾加 <!-- check-docs: skip -->。
import fs from 'node:fs';
import path from 'node:path';
import { collect, ROOT } from './lib/collect.mjs';
import { validate } from './lib/validate.mjs';

const FILES = ['AGENTS.md', 'README.md', 'course/AUTHORING.md', 'course/.vitepress/theme/components/CourseHome.vue', 'course/index.md'];

const inp = await collect();
const { stats } = validate(inp);
// [名字, 正则（第 1 个捕获组是数字）, 实际值]。顺序无关，一行可以匹配多条
const FACTS = [
  ['章数', /(?<!第[\d、, ]*)(?<![\d.])(\d+) ?章(?![节头])/g, stats.chapters],
  ['阶段数', /(?<![\d.])(\d+) ?个阶段(?!测验)/g, inp.stageCount],
  ['阶段测验页数', /(?<![\d.])(\d+) ?个阶段测验页/g, inp.stageCount],
  ['练习数', /(?<![\d.])(\d+) ?道练习/g, stats.exercises],
  ['章内自测数', /(?<![\d.])(\d+) ?道(?:章内)?自测(?!题)/g, stats.sc],
  ['阶段测验专用题数', /(?<![\d.])(\d+) ?道阶段测验专用/g, stats.checks],
  ['实验台数', /(?<![\d.])(\d+) ?个实验台/g, stats.labs],
  ['术语数', /(?<![\d.])(\d+) ?个术语/g, stats.terms],
  ['复习卡片键数', /(?<![\d.])(\d+) ?个(?:复习)?卡片键/g, stats.cards],
];
// 题库那一句：“checks/questions.ts … （60 道题 …）”
const QUESTIONS_LINE = [/questions\.ts[^\n]*?(\d+) 道题/g, stats.checks];

const problems = [];
let checked = 0;
for (const rel of FILES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (line.includes('check-docs: skip')) return;
    for (const [name, re, actual] of [...FACTS, ['阶段测验专用题数', ...QUESTIONS_LINE]]) {
      for (const m of line.matchAll(re)) {
        checked++;
        if (Number(m[1]) !== actual) problems.push(`${rel}:${i + 1}  写的是“${m[0].trim()}”，但${name}实际是 ${actual}`);
      }
    }
  });
}
if (problems.length) {
  console.error(`check:docs 发现 ${problems.length} 处数字过期：\n`);
  for (const p of problems) console.error('✗ ' + p);
  console.error('\n  → 改成实际数字，或在该行末尾加 <!-- check-docs: skip -->（数字是别的意思时）');
  process.exit(1);
}
console.log(`check:docs 通过：核对了 ${checked} 处带单位的数字（章 ${stats.chapters}、练习 ${stats.exercises}、自测 ${stats.sc}、专用题 ${stats.checks}、实验台 ${stats.labs}、术语 ${stats.terms}）`);
