// 内容校验：不需要浏览器和网络，1 到 2 秒跑完。失败时给出“文件:行 + 哪里不对 + 怎么修”。
//
//   npm run check:content                        检查全部
//   npm run check:content -- --update            自测题 / 专用题 / 先猜题末尾追加了新题后，把新卡片键写进快照（只追加）
//   npm run check:content -- --update --force    确认改的是错别字（题干换了个说法）时，允许改已有键的指纹
//   npm run check:content -- --strict            把【待写】占位也当成错误（发布前用）
//
// 检查项（规则在 scripts/lib/validate.mjs，每条都有单元测试）：
//   1. 章节文件与 frontmatter：id、chapter、stage、title 齐全且唯一；章号连续；文件名与章号、id 一致；一级标题以 title 开头；
//      恰好一个 ::: summary；小节 N.M 连续；容器 ::: 成对；没有 TODO。
//   2. 自测题：每道 <Sc> 至少 2 个 <Opt>、:a 在范围内、有解析；<Sc> 的书写格式能被构建时的抽取逻辑抽出来（个数对得上）。
//   3. 目标：<Goal checks="sc:N,ex:id"> 引用的自测序号和练习 id 都存在。
//   4. 练习：<Exercise id> 都能在 course/exercises/ 找到，且每道练习都被某一章使用；id 全局唯一；字段齐全；hints 非空；
//      至少 1 个 wrong 且没有 WRONG_SUB_FAILED；有 faded 时格式正确。
//   5. 实验台：<Lab id> 全局唯一；import 的实验台和示意图存在；每个 <Lab id> 在 tests/site/labs/ 里有测试数据。
//   6. 阶段测验专用题（checks/questions.ts）：格式、章 id 存在；阶段：stage 范围、阶段测验页存在、每个阶段题量够抽 12 题。
//   7. 复习卡片键快照 course/card-keys.snapshot.json：已有的键不能消失、不能换位置，只能在末尾追加。
//   8. 站内引用：“第 N 章”在范围内；“N.M 节”“N.M 标题”对应真实小节；站内链接目标存在。
//   9. 残留：【待写】占位只提示（--strict 时算错误）。
import fs from 'node:fs';
import path from 'node:path';
import { collect, ROOT } from './lib/collect.mjs';
import { nextSnapshot } from './lib/cards.mjs';
import { KNOWN_ISSUES } from './lib/known-issues.mjs';
import { applyExemptions, validate } from './lib/validate.mjs';

const args = process.argv.slice(2);
const UPDATE = args.includes('--update');
const FORCE = args.includes('--force');
const STRICT = args.includes('--strict');
const SNAPSHOT = path.join(ROOT, 'course/card-keys.snapshot.json');
const t0 = performance.now();

const inp = await collect();
const res = validate(inp, { strict: STRICT, skipSnapshot: UPDATE });
const { errors, exempted, stale } = applyExemptions(res.errors, KNOWN_ISSUES);
const lines = errors.map(e => e.text);
for (const s of stale) lines.push(`scripts/lib/known-issues.mjs  豁免 "${s.key}" 已经失效（对应的问题不存在了）\n    → 把它从 KNOWN_ISSUES 里删掉`);

let updateMsg = '';
if (UPDATE) {
  // 先看已有键有没有被动过：只追加新键，动了已有键必须 --force
  const { compareSnapshot } = await import('./lib/cards.mjs');
  const snap = inp.snapshot;
  const diff = snap ? compareSnapshot(snap, res.current) : { problems: [], added: Object.keys(res.current.cards), addedPred: res.current.predictions };
  if (!lines.length && diff.problems.length && !FORCE) {
    for (const p of diff.problems) lines.push(`course/card-keys.snapshot.json  ${p}`);
    lines.push('course/card-keys.snapshot.json  --update 只追加新键；上面是对已有键的改动，没有写入\n    → 确认是错别字修改后，加 --force');
  } else if (!lines.length) {
    const body = nextSnapshot(snap, res.current, { force: FORCE });
    fs.writeFileSync(SNAPSHOT, JSON.stringify(body, null, 2) + '\n');
    updateMsg = `快照已更新：新增 ${diff.added.length} 个卡片键、${diff.addedPred.length} 个先猜键${FORCE ? '（--force：已有键的改动也已写入）' : ''}`;
  }
}

if (lines.length) {
  console.error(`check:content 发现 ${lines.length} 个问题：\n`);
  for (const l of lines) console.error('✗ ' + l + '\n');
  process.exit(1);
}
for (const n of res.notes) console.log('提示：' + n);
if (exempted.length) console.log(`提示：${exempted.length} 处已知问题被临时豁免（scripts/lib/known-issues.mjs），见该文件里的说明`);
if (updateMsg) console.log(updateMsg);
else {
  const s = res.stats;
  console.log(
    `check:content 通过：${s.chapters} 章、${s.sc} 道章内自测、${s.checks} 道专用题、${s.exercises} 道练习、${s.labs} 个实验台、${s.cards} 个复习卡片键、${s.refs} 处章节引用（${Math.round(performance.now() - t0)} ms）`,
  );
}
