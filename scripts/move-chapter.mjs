// 移动一章的位置（可同时改它的阶段）：夹在中间的章顺延或前移，改名、改章号、改引用，和 new-chapter 插入时做的事一样。
// 章 id 不变，所以复习卡片键不变；题干里写着“第 N 章”的自测题指纹会随章号改写，脚本会列出来。
//
//   npm run move-chapter -- <章id> --after <已有章id> [--stage <1-6>] [--dry-run] [--allow-dirty]
//   例：npm run move-chapter -- migrate --after tooling --stage 5
//   --after   移到哪一章后面（不能是它自己）
//   --stage   同时把这一章归到另一个阶段（新位置前后的阶段必须连续）；不写则保持原阶段
//   --dry-run 只列出要做的事，不改文件
//   --allow-dirty 工作区有未提交的改动也照做
//
// 做完之后：核对 tests/expected.cjs 的阶段表、course/stages.ts 的阶段说明、文档里提到章顺序的文字（脚本会提示），再跑 npm run check。
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT } from './lib/collect.mjs';
import { readFrontmatter } from '../course/content-parse.mjs';
import { loadTs } from './lib/load-ts.mjs';
import { pad2 } from './lib/renumber.mjs';
import { applyWrites, planRenumber } from './lib/renumber-plan.mjs';

const usage = '用法：npm run move-chapter -- <章id> --after <已有章id> [--stage <1-6>] [--dry-run] [--allow-dirty]';
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { stage: { type: 'string' }, after: { type: 'string' }, 'dry-run': { type: 'boolean' }, 'allow-dirty': { type: 'boolean' } },
});
const die = msg => {
  console.error(`✗ ${msg}\n${usage}`);
  process.exit(1);
};
const DRY = !!values['dry-run'];
const abs = (...p) => path.join(ROOT, ...p);

const [id] = positionals;
if (!id || positionals.length > 1) die('要给且只给一个章 id');
if (!values.after) die('缺少 --after');
const { STAGE_COUNT } = await loadTs(abs('course/stages.ts'));
if (values.stage != null && (!/^[1-9]$/.test(values.stage) || +values.stage > STAGE_COUNT)) die(`--stage 必须是 1 到 ${STAGE_COUNT}`);

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
const me = chapters.find(c => c.id === id || c.base === id);
if (!me) die(`没有章 "${id}"。已有的章 id：${chapters.map(c => c.id).join('、')}`);
const anchor = chapters.find(c => c.id === values.after || c.base === values.after);
if (!anchor) die(`--after "${values.after}" 不是已有的章`);
if (anchor === me) die('--after 不能是章自己');
if (chapters.some((c, i) => c.base !== `${pad2(c.no)}-${c.id}` || c.no !== i + 1)) die('有章的文件名和章号对不上，或章号不连续，先修好（npm run check:content）');

// 新顺序：把 me 拿出来，插到 anchor 后面
const rest = chapters.filter(c => c !== me);
const order = [...rest.slice(0, rest.indexOf(anchor) + 1), me, ...rest.slice(rest.indexOf(anchor) + 1)];
const newStage = values.stage != null ? +values.stage : me.stage;
order.forEach((c, i) => {
  c.newNo = i + 1;
  c.newStage = c === me ? newStage : c.stage;
});
for (let i = 1; i < order.length; i++)
  if (order[i].newStage < order[i - 1].newStage) die(`--stage ${newStage} 放不进这个位置：${order[i - 1].id}（阶段 ${order[i - 1].newStage}）后面不能接阶段 ${order[i].newStage} 的 ${order[i].id}。同一阶段的章要连续排列`);
if (order.every(c => c.newNo === c.no) && newStage === me.stage) die('位置和阶段都没有变化');

if (!DRY && !values['allow-dirty'] && fs.existsSync(abs('.git'))) {
  const st = spawnSync('git', ['status', '--porcelain', '--', 'course', 'tests'], { cwd: ROOT, encoding: 'utf8' });
  if (st.stdout.trim()) die('工作区有未提交的改动。移动会改动很多文件，先提交或暂存，或加 --allow-dirty 强制继续（加 --dry-run 可以先看会改什么）');
}
if (!DRY) {
  const pre = spawnSync(process.execPath, [abs('scripts/check-content.mjs')], { cwd: ROOT, encoding: 'utf8' });
  if (pre.status !== 0) die('npm run check:content 现在就不通过，先修好再移动：\n' + pre.stderr);
}

const renumber = Object.fromEntries(order.map(c => [c.base, c.newNo]));
const { writes, noMap, textChanged } = planRenumber(chapters, renumber, newStage !== me.stage ? { [me.base]: newStage } : {});
const renames = writes.filter(w => w.from !== w.to);
console.log(`${DRY ? '[dry-run] ' : ''}把 ${me.id} 从第 ${me.no} 章（阶段 ${me.stage}）移到第 ${me.newNo} 章（阶段 ${newStage}），章号变化：`);
for (const c of order.filter(c => c.newNo !== c.no)) console.log(`  第 ${c.no} 章 ${c.id} -> 第 ${c.newNo} 章`);
console.log(`重命名 ${renames.length} 个文件（含 labs/、figures/ 目录里的），改写 ${textChanged} 个文件的内容。`);
if (DRY) {
  for (const w of renames.filter(w => !/\/(labs|figures)\//.test(w.from))) console.log(`  ${w.from} -> ${w.to}`);
  process.exit(0);
}

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
console.log('\n还要人工核对：');
console.log('  tests/expected.cjs 的 STAGE_POOLS（章数随阶段变化）；course/stages.ts 的阶段说明；README.md、AGENTS.md、course/AUTHORING.md 里提到章号或章顺序的文字');
console.log(`  被改过章号的引用在 ${Object.keys(noMap).length} 个章号上；区间写法（如“第 2–9 章”）两端分别改，区间跨过被移动的章时含义可能变，请搜一下`);
