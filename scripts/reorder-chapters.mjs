// 一次重排所有章的顺序，可同时改阶段：按计划文件里的新顺序给所有章改名、改章号、改引用。
// 做的事和连续多次 move-chapter 相同（共用 lib/renumber-plan.mjs），但只扫一遍，所有章号同时映射。
//
//   npm run reorder-chapters -- <计划文件.json> [--dry-run] [--allow-dirty]
//
// 计划文件：{ "order": ["first", "template", …], "stages": { "章id": 阶段号 } }
//   order   新顺序，必须恰好包含现有的每一章一次（章 id，不是文件名）
//   stages  只写阶段有变化的章；没写的章保持原阶段。排好以后阶段必须随章号不减
//
// 做完之后要人工核对的地方和 move-chapter 一样：tests/expected.cjs、course/stages.ts、文档里的章顺序，
// 区间写法（“第 2–9 章”）两端分别改号，围栏代码块里的章号脚本只列不改。
// 卡片键不变（章 id 不变）；题干里写着“第 N 章”的自测题指纹会随章号改写，脚本用 --update --force 写入快照并列出。
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT } from './lib/collect.mjs';
import { readFrontmatter } from '../course/content-parse.mjs';
import { loadTs } from './lib/load-ts.mjs';
import { pad2 } from './lib/renumber.mjs';
import { applyWrites, planRenumber } from './lib/renumber-plan.mjs';
import { planReorder } from './lib/reorder.mjs';

const usage = '用法：npm run reorder-chapters -- <计划文件.json> [--dry-run] [--allow-dirty]';
const { values, positionals } = parseArgs({ allowPositionals: true, options: { 'dry-run': { type: 'boolean' }, 'allow-dirty': { type: 'boolean' } } });
const die = msg => {
  console.error(`✗ ${msg}\n${usage}`);
  process.exit(1);
};
const DRY = !!values['dry-run'];
const abs = (...p) => path.join(ROOT, ...p);
if (positionals.length !== 1) die('要给且只给一个计划文件');
const plan = JSON.parse(fs.readFileSync(path.resolve(positionals[0]), 'utf8'));
const { STAGE_COUNT } = await loadTs(abs('course/stages.ts'));

const chDir = abs('course/chapters');
const chapters = fs
  .readdirSync(chDir)
  .filter(f => f.endsWith('.md'))
  .map(f => {
    const fm = readFrontmatter(fs.readFileSync(path.join(chDir, f), 'utf8'));
    return fm?.chapter ? { base: f.replace(/\.md$/, ''), id: fm.id, no: Number(fm.chapter), stage: Number(fm.stage) } : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.no - b.no);
if (chapters.some((c, i) => c.base !== `${pad2(c.no)}-${c.id}` || c.no !== i + 1)) die('有章的文件名和章号对不上，或章号不连续，先修好（npm run check:content）');

const { errors, renumber, stages, table } = planReorder(chapters, plan, STAGE_COUNT);
if (errors.length) die(errors.join('\n'));
if (!DRY && !values['allow-dirty'] && fs.existsSync(abs('.git'))) {
  const st = spawnSync('git', ['status', '--porcelain', '--', 'course', 'tests'], { cwd: ROOT, encoding: 'utf8' });
  if (st.stdout.trim()) die('工作区有未提交的改动。重排会改动很多文件，先提交或暂存，或加 --allow-dirty 强制继续（加 --dry-run 可以先看会改什么）');
}
if (!DRY) {
  const pre = spawnSync(process.execPath, [abs('scripts/check-content.mjs')], { cwd: ROOT, encoding: 'utf8' });
  if (pre.status !== 0) die('npm run check:content 现在就不通过，先修好再重排：\n' + pre.stderr);
}

const { writes, noMap, textChanged, fencedRefs } = planRenumber(chapters, renumber, stages);
const renames = writes.filter(w => w.from !== w.to);
console.log(`${DRY ? '[dry-run] ' : ''}重排 ${chapters.length} 章，章号变化：`);
for (const t of table.filter(t => t.newNo !== t.oldNo || t.newStage !== t.oldStage))
  console.log(`  第 ${t.oldNo} 章 ${t.id}（阶段 ${t.oldStage}） -> 第 ${t.newNo} 章（阶段 ${t.newStage}）`);
console.log(`重命名 ${renames.length} 个文件（含 labs/、figures/ 目录里的），改写 ${textChanged} 个文件的内容。`);
if (fencedRefs.length) console.log('\n⚠ 围栏代码块（注释）里写着会变的章号，脚本不改，请人工改：\n' + fencedRefs.map(x => '  ' + x).join('\n'));
if (DRY) process.exit(0);

applyWrites(writes);
const snapFile = abs('course/card-keys.snapshot.json');
const before = JSON.parse(fs.readFileSync(snapFile, 'utf8')).cards;
const upd = spawnSync(process.execPath, [abs('scripts/check-content.mjs'), '--update', '--force'], { cwd: ROOT, encoding: 'utf8' });
if (upd.status !== 0) console.log('\n⚠ 更新快照时 check:content 报告了问题：\n' + upd.stderr + upd.stdout);
else {
  const after = JSON.parse(fs.readFileSync(snapFile, 'utf8')).cards;
  const lost = Object.keys(before).filter(k => !(k in after));
  const changed = Object.keys(before).filter(k => after[k] && after[k] !== before[k]);
  if (lost.length) console.log(`⚠ 这些卡片键消失了：${lost.join('、')}`);
  console.log(changed.length ? `这 ${changed.length} 道题的题干里写着“第 N 章”，章号随之更新，快照里的指纹已改写（卡片键没变）：${changed.join('、')}` : '快照里已有的卡片键和指纹都没有变化。');
}
console.log('\n还要人工核对：tests/expected.cjs、course/stages.ts、文档里写着章号或章顺序的文字；区间写法（“第 2–9 章”）两端分别改号，跨过被移动的章时含义会变');
console.log(`被改过章号的引用涉及 ${Object.keys(noMap).length} 个旧章号`);
