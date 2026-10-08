// 新建一章：生成章节 Markdown 骨架、练习数据骨架、实验台测试数据，更新复习卡片键快照。
// 插在中间时，后面的章要改名、改章号、改引用，这里一起做（做完用 check:content 复核）。
//
//   npm run new-chapter -- <章id> --stage <1-6> --after <已有章id> --title "标题"
//   例：npm run new-chapter -- hooks-recap --stage 2 --after composables --title "组合式函数复盘"
//   --dry-run       只列出要做的事，不改文件
//   --allow-dirty   工作区有未提交的改动也照做（默认拒绝：自动改名最好在干净的工作区里做，方便用 git 看改了什么）
//
// 生成的文件里到处是“【待写】”占位：它们能通过 check 和 build，但要换成真内容才能发布
// （check:content 会提示哪些章还有占位；npm run check:content -- --strict 把占位当错误）。
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT } from './lib/collect.mjs';
import { readFrontmatter } from './lib/content.mjs';
import { loadTs } from './lib/load-ts.mjs';
import { mapPath, pad2, renameTokens, shiftExerciseCh, shiftFrontmatterChapter, shiftHeadings, shiftRefs } from './lib/renumber.mjs';

const usage = '用法：npm run new-chapter -- <章id> --stage <1-6> --after <已有章id> --title "标题" [--dry-run] [--allow-dirty]';
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { stage: { type: 'string' }, after: { type: 'string' }, title: { type: 'string' }, 'dry-run': { type: 'boolean' }, 'allow-dirty': { type: 'boolean' } },
});
const die = msg => {
  console.error(`✗ ${msg}\n${usage}`);
  process.exit(1);
};
const DRY = !!values['dry-run'];
const abs = (...p) => path.join(ROOT, ...p);
const TODO = '【待写】';

// ---------- 参数 ----------
const [id] = positionals;
if (!id) die('缺少章 id');
if (positionals.length > 1) die('只能给一个章 id；标题里有空格要加引号');
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) die(`章 id "${id}" 只能用小写字母、数字和连字符，例如 hooks-recap`);
if (!values.title?.trim()) die('缺少 --title');
const title = values.title.trim();
if (/["\n]/.test(title)) die('标题里不能有双引号或换行');
const { STAGE_COUNT } = await loadTs(abs('course/stages.ts'));
if (!/^[1-9]$/.test(values.stage ?? '') || +values.stage > STAGE_COUNT) die(`--stage 必须是 1 到 ${STAGE_COUNT}`);
const stage = +values.stage;
if (!values.after) die('缺少 --after（新章排在哪一章后面）');

// ---------- 现有章 ----------
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
if (chapters.some(c => c.id === id) || chapters.some(c => c.base.replace(/^\d+-/, '') === id)) die(`章 "${id}" 已经存在`);
const prev = chapters.find(c => c.id === values.after || c.base === values.after);
if (!prev) die(`--after "${values.after}" 不是已有的章。已有的章 id：${chapters.map(c => c.id).join('、')}`);
const next = chapters.find(c => c.no === prev.no + 1);
const newNo = prev.no + 1;
if (stage < prev.stage || (next && stage > next.stage))
  die(`--stage ${stage} 放不进这个位置：前一章（${prev.id}）在阶段 ${prev.stage}，后一章${next ? `（${next.id}）在阶段 ${next.stage}` : '不存在'}。同一阶段的章要连续排列`);
const newBase = `${pad2(newNo)}-${id}`;
if (fs.existsSync(path.join(chDir, newBase + '.md'))) die(`文件 course/chapters/${newBase}.md 已经存在`);

// ---------- 要改名的章 ----------
const moved = chapters.filter(c => c.no >= newNo);
const nameMap = Object.fromEntries(moved.map(c => [c.base, `${pad2(c.no + 1)}-${c.base.replace(/^\d+-/, '')}`]));
if (moved.some(c => c.base.startsWith(pad2(c.no) + '-') === false)) die('有章的文件名和章号对不上，先修好（npm run check:content）');
if (moved.length && !DRY && !values['allow-dirty'] && fs.existsSync(abs('.git'))) {
  const st = spawnSync('git', ['status', '--porcelain', '--', 'course', 'tests'], { cwd: ROOT, encoding: 'utf8' });
  if (st.stdout.trim()) die('工作区有未提交的改动。插在中间会改动很多文件，先提交或暂存，或加 --allow-dirty 强制继续（加 --dry-run 可以先看会改什么）');
}

// 动手之前内容校验要是干净的：否则后面更新快照时分不清哪些是脚本造成的变化
if (!DRY) {
  const pre = spawnSync(process.execPath, [abs('scripts/check-content.mjs')], { cwd: ROOT, encoding: 'utf8' });
  if (pre.status !== 0) die('npm run check:content 现在就不通过，先修好再加章：\n' + pre.stderr);
}

// ---------- 遍历要处理的文件 ----------
const TEXT = /\.(md|ts|mts|vue|js|mjs|json|css)$/;
const SKIP = new Set(['node_modules', 'dist', 'cache', '.git']);
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
const movedBases = new Set(moved.map(c => c.base));
const noOf = Object.fromEntries(moved.map(c => [c.base, c.no]));
const baseOf = p => path.basename(p).replace(/\.[^.]+$/, '');
const SHIFT_FILES = p => p.startsWith('course/chapters/') || p.startsWith('course/exercises/') || p === 'course/checks/questions.ts' || /^course\/glossary/.test(p);
const NO_RENAME_TEXT = new Set(['course/AUTHORING.md', 'course/card-keys.snapshot.json']);

const writes = []; // { from, to, text|null }
let textChanged = 0;
for (const p of files) {
  const to = moved.length ? mapPath(p, nameMap) : p;
  if (!TEXT.test(p) || NO_RENAME_TEXT.has(p)) {
    if (to !== p) writes.push({ from: p, to, text: null });
    continue;
  }
  const src = fs.readFileSync(abs(p), 'utf8');
  let text = src;
  if (moved.length) {
    text = renameTokens(text, nameMap);
    if (p.startsWith('course/chapters/') && movedBases.has(baseOf(p))) {
      text = shiftFrontmatterChapter(text, noOf[baseOf(p)]);
      text = shiftHeadings(text, noOf[baseOf(p)]);
    }
    if (p.startsWith('course/exercises/') && movedBases.has(baseOf(p))) text = shiftExerciseCh(text, noOf[baseOf(p)]);
    if (SHIFT_FILES(p)) text = shiftRefs(text, newNo, { markdown: p.endsWith('.md') });
  }
  if (text !== src) textChanged++;
  if (to !== p || text !== src) writes.push({ from: p, to, text });
}

// ---------- 新文件 ----------
const camel = s => s.replace(/-([a-z0-9])/g, (_m, c) => c.toUpperCase());
const exId = `${camel(id)}Intro`;
const chapterMd = `---
title: ${title}
id: ${id}
stage: ${stage}
chapter: ${newNo}
desc: ${TODO}一句话说明这一章学什么
---

# ${title}

::: goals
<Goal checks="sc:0,ex:${exId}">${TODO}能说明……</Goal>

:::

::: rt
${TODO}阅读主线约 N 分钟。另外留时间做练习和自测。
:::

::: analogy
${TODO}类比：把……比作……
:::

::: terms
${TODO}术语
: ${TODO}术语的一句话定义。
:::

::: why
${TODO}先讲一个读者会遇到的问题，再讲原因，最后说明本章怎么解决它。
:::

### ${newNo}.1 ${TODO}小节标题

${TODO}正文：短句，一句一个意思，主动语态。每个新概念第一次出现时给一句定义。

<Exercise id="${exId}" />

::: selfcheck
<Sc :a="0">

${TODO}自测第 1 题的题干

<Opt>${TODO}选项 A</Opt>
<Opt>${TODO}选项 B</Opt>
<Opt>${TODO}选项 C</Opt>

<template #explain>

解析：${TODO}说明为什么对，并点出最迷惑的错误项错在哪。

</template>
</Sc>

:::

::: summary
- ${TODO}小结第 1 条
- ${TODO}小结第 2 条
:::
`;
const exerciseTs = `import type { Exercise } from './types'
import { sub } from './types'

// ${TODO}这是脚手架生成的示例练习：能通过检查，但内容是占位。照 course/AUTHORING.md 的 4.10 节改成本章真正的练习。
// 练习 id（导出名）创建后不能改。
const solJs = "const msg = ref('你好')\\n\\nreturn { msg }"

export const ${exId}: Exercise = {
  title: '${TODO}示例练习：显示问候',
  ch: ${newNo},
  task: '<p>${TODO}让标题显示 msg 的内容“你好”。只改模板。</p>',
  tpl: '<h1 id="title"></h1>',
  js: "const msg = ref('')\\n\\nreturn { msg }",
  solTpl: '<h1 id="title">{{ msg }}</h1>',
  solJs,
  faded: {
    tpl: '<h1 id="title">{{ /* ✏️ 在这里显示 msg */ }}</h1>'
  },
  hints: [
    '${TODO}msg 是 ref。在模板里用 {{ }} 显示它，不写 .value。',
    '${TODO}把 <h1> 的内容改成 {{ msg }}。',
    '<h1 id="title">{{ msg }}</h1>'
  ],
  async check(T) {
    const h = T.$('#title')
    T.ok(!!h, '页面上有 id 为 title 的标题')
    if (!h) return
    T.ok((h.textContent || '').trim() === '你好', '标题显示“你好”，现在是“' + (h.textContent || '').trim() + '”')
  },
  wrong: [
    { tpl: '<h1 id="title">msg</h1>', why: '${TODO}把变量名当成了文字。要用 {{ }} 显示数据。' },
    { js: sub(solJs, '你好', '再见'), why: '${TODO}数据本身不对。' }
  ]
}
`;
const labsJs = `// 第 ${newNo} 章的实验台测试数据。章里每个 <Lab id> 都要有一项；还没有实验台时保持空数组。格式见 course/AUTHORING.md 第 8 节。
module.exports = []
`;
const created = [
  [`course/chapters/${newBase}.md`, chapterMd],
  [`course/exercises/${newBase}.ts`, exerciseTs],
  [`tests/site/labs/${newBase}.js`, labsJs],
];

// ---------- 计划 / 执行 ----------
const renames = writes.filter(w => w.from !== w.to);
const dirs = [...new Set(renames.filter(w => /\/(labs|figures)\//.test(w.from)).map(w => path.dirname(w.from)))];
console.log(`${DRY ? '[dry-run] ' : ''}新章：第 ${newNo} 章 ${id}（阶段 ${stage}），文件前缀 ${newBase}`);
if (moved.length) {
  console.log(`后面 ${moved.length} 章的章号都 +1（第 ${newNo} 章到第 ${chapters.at(-1).no} 章 -> 第 ${newNo + 1} 章到第 ${chapters.at(-1).no + 1} 章）：重命名 ${renames.length} 个文件（含 labs/、figures/ 目录里的），改写 ${textChanged} 个文件的内容。`);
  if (DRY) for (const w of renames.filter(w => !/\/(labs|figures)\//.test(w.from))) console.log(`  ${w.from} -> ${w.to}`);
}
if (!DRY) {
  for (const w of writes) {
    const target = abs(w.to);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (w.text === null) fs.copyFileSync(abs(w.from), target);
    else fs.writeFileSync(target, w.text);
  }
  const newPaths = new Set(writes.map(w => w.to));
  for (const w of renames) if (!newPaths.has(w.from)) fs.rmSync(abs(w.from), { force: true });
  for (const d of dirs) if (fs.existsSync(abs(d)) && !fs.readdirSync(abs(d)).length) fs.rmdirSync(abs(d));
  for (const [rel, text] of created) {
    fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
    fs.writeFileSync(abs(rel), text);
  }
  // 中间插入时，题干里的“第 N 章”会随之改成新章号，指纹因此变化：这是脚本造成的、可预期的变化，用 --force 写入并列出来
  const snapFile = abs('course/card-keys.snapshot.json');
  const before = fs.existsSync(snapFile) ? JSON.parse(fs.readFileSync(snapFile, 'utf8')).cards : {};
  const upd = spawnSync(process.execPath, [abs('scripts/check-content.mjs'), '--update', ...(moved.length ? ['--force'] : [])], { cwd: ROOT, encoding: 'utf8' });
  if (upd.status !== 0) console.log('\n⚠ 更新快照时 check:content 报告了问题：\n' + upd.stderr);
  else {
    console.log('\n' + upd.stdout.trim());
    const after = JSON.parse(fs.readFileSync(snapFile, 'utf8')).cards;
    const changed = Object.keys(before).filter(k => after[k] && after[k] !== before[k]);
    if (changed.length) console.log(`这 ${changed.length} 道题的题干里写着“第 N 章”，章号随之更新，快照里的指纹已改写（卡片键没变）：${changed.join('、')}`);
  }
}
console.log(`\n${DRY ? '会创建' : '已创建'}：\n${created.map(([r]) => '  ' + r).join('\n')}\n  course/card-keys.snapshot.json ${DRY ? '会更新' : '已更新'}（追加新卡片键）`);

// ---------- 提醒：要人工核对的地方 ----------
const todoList = [];
if (moved.length) {
  todoList.push('章号顺延后，下面这些地方脚本没有改（它们不在章节、练习、题库里），请人工核对写着章数或章号的文字：');
  const hits = [];
  const scan = rel => {
    if (!fs.existsSync(abs(rel))) return;
    fs.readFileSync(abs(rel), 'utf8')
      .split('\n')
      .forEach((line, i) => {
        const nums = [...line.matchAll(/第\s*(\d+)\s*章|(\d+)\s*章|\d\s*\/\s*(\d+)\b/g)].map(m => Number(m[1] ?? m[2] ?? m[3]));
        if (nums.some(n => n >= newNo)) hits.push(`  ${rel}:${i + 1}  ${line.trim().slice(0, 80)}`);
      });
  };
  for (const f of ['README.md', 'AGENTS.md', 'course/index.md', 'course/review.md']) scan(f);
  for (const f of files.filter(p => p.startsWith('course/.vitepress/theme/') && TEXT.test(p))) scan(f);
  todoList.push(...hits.slice(0, 30), hits.length > 30 ? `  …还有 ${hits.length - 30} 处` : '');
}
todoList.push(
  `首页路线说明里的章数：course/.vitepress/theme/components/CourseHome.vue（“N 章正文”）；tests/site/progress.test.js 里写死的总章数（26）、tests/unit/cards.test.ts 里“每个阶段的可用题数”那张表也要同步。`,
  `阶段说明（course/stages.ts）如果提到章的范围，核对一下。`,
  `把所有“${TODO}”换成真内容，估算阅读时间（rt 块），再跑：npm run check → node tests/site/exercises.test.js ${newBase}`,
);
console.log('\n' + todoList.filter(Boolean).join('\n'));
