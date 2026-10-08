// 内容校验的全部规则（纯函数）：输入是已经读好的内容（见 collect.mjs），输出错误列表。
// 不读文件、不碰网络，所以单元测试可以构造坏输入断言它报错。
//
// 每条错误是 { key, text }：text 是给人看的“位置  问题 → 怎么修”，key 是稳定的标识（规则:对象），临时豁免（known-issues.mjs）按 key 匹配。
import { checkContainers, collectGlossary, exercisesOf, frontmatterLines, goalsOf, h1Of, importsOf, labsOf, maskFences, normTitle, readFrontmatter, scanSc, sectionsOf } from '../../course/content-parse.mjs';
import { compareSnapshot, computeCards } from './cards.mjs';

/** 不是章的页面：旧地址的跳转页，没有 id */
export const REDIRECT_PAGES = ['27-quiz'];
/** 章里可以直接使用、不用 import 的页面级 / 全局组件之外的“已知全局”由 inp.files 里的 theme/components/*.vue 推出 */
const PLACEHOLDER = '【待写】';
const EXERCISE_KEYS = ['title', 'ch', 'task', 'tpl', 'js', 'solTpl', 'solJs', 'hints', 'check', 'wrong', 'lazy', 'faded'];
/** 半成品里每个挖空处的标记 */
export const FADED_MARK = '✏️';
const nonEmpty = v => typeof v === 'string' && v.trim() !== '';

/**
 * inp:
 *   chapterFiles   { 文件名(不带 .md): 源文件文字 }
 *   extraPages     { 'course/glossary.md': 源文件文字 }：首页、术语表、今日复习、阶段测验页。只扫章引用和站内链接（没有这个字段则不扫）
 *   writingTerms   首页“写作规则”表的数据（course/writing-terms.mjs 的 WRITING_TERMS）；没有则不检查
 *   exercises      { 练习文件名(不带 .ts): 导出对象 }
 *   questions      checks/questions.ts 的 Q
 *   stageCount     阶段数
 *   stageQuestions 阶段测验每次抽的题数（12）
 *   labTests       { 章文件名: [实验台测试数据里的 id…] }（没有这个文件的章不出现）
 *   files          仓库里存在的文件（相对仓库根，用 / 分隔）的 Set
 *   snapshot       快照 JSON；null 表示文件不存在；undefined 表示不检查
 * opts: { strict }（strict 时【待写】占位算错误）
 * 返回 { errors: [{key,text}], notes: [字符串], stats, current: { cards, predictions }, snapshotDiff }
 */
export function validate(inp, opts = {}) {
  const errors = [];
  const notes = [];
  const fail = (key, where, msg, fix = '') => errors.push({ key, text: `${where}  ${msg}${fix ? '\n    → ' + fix : ''}` });
  const CH = f => `course/chapters/${f}.md`;
  const files = inp.files || new Set();

  // ---------- 1. 章节文件与 frontmatter ----------
  const chapters = []; // 有章号的正文章
  const pages = []; // 所有有 id 的页面（含速查表）
  const NUM_FILE = /^(\d\d)-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
  for (const [file, src] of Object.entries(inp.chapterFiles)) {
    const fm = readFrontmatter(src);
    const where = CH(file);
    if (REDIRECT_PAGES.includes(file)) continue;
    if (!fm) { fail(`fm:${file}`, where, '没有 frontmatter（文件开头的 --- 块）', '补上 title、id、stage、chapter'); continue; }
    const { masked, fenced, unclosed } = maskFences(src);
    const page = { file, fm, src, masked, fenced, numbered: fm.chapter !== undefined || NUM_FILE.test(file), where };
    pages.push(page);
    if (unclosed) fail(`fence:${file}`, where, '有围栏代码块没有闭合（缺少结尾的 ```）');
    for (const f of ['id', 'title']) if (!nonEmpty(fm[f])) fail(`fm-field:${file}:${f}`, where, `frontmatter 缺少 ${f}`);
    if (!page.numbered) {
      if (fm.stage !== undefined) fail(`fm-stage:${file}`, where, '没有章号的页面不能写 stage（它不计入进度）', '删掉 stage，或给它章号和对应的文件名');
      continue;
    }
    chapters.push(page);
    const fnm = NUM_FILE.exec(file);
    if (!fnm) fail(`fm-file:${file}`, where, '有章号的页面，文件名必须是 NN-id.md（两位章号 + 小写 id）');
    for (const f of ['chapter', 'stage']) if (!nonEmpty(fm[f])) fail(`fm-field:${file}:${f}`, where, `frontmatter 缺少 ${f}`);
    page.no = Number(fm.chapter);
    page.stage = Number(fm.stage);
    if (nonEmpty(fm.chapter) && !(Number.isInteger(page.no) && page.no >= 1)) fail(`fm-chapter:${file}`, where, `chapter 必须是正整数（实际是 ${fm.chapter}）`);
    if (nonEmpty(fm.stage) && !(Number.isInteger(page.stage) && page.stage >= 1 && page.stage <= inp.stageCount))
      fail(`fm-stage:${file}`, where, `stage 必须是 1 到 ${inp.stageCount} 的整数（实际是 ${fm.stage}）`);
    if (fnm) {
      if (Number(fnm[1]) !== page.no) fail(`fm-chapter:${file}`, where, `文件名里的章号是 ${Number(fnm[1])}，frontmatter 的 chapter 是 ${fm.chapter}`, '两处写成一样（改章号要同时重命名文件）');
      if (nonEmpty(fm.id) && fnm[2] !== fm.id) fail(`fm-id:${file}`, where, `文件名里的 id 是 "${fnm[2]}"，frontmatter 的 id 是 "${fm.id}"`, 'id 是存储键，不能改；让文件名和它一致');
    }
  }
  chapters.sort((a, b) => a.no - b.no);
  const seen = { id: new Map(), title: new Map(), no: new Map() };
  for (const c of chapters) {
    for (const [k, v] of [['id', c.fm.id], ['title', c.fm.title], ['no', c.no]]) {
      if (v === undefined || v === '' || Number.isNaN(v)) continue;
      if (seen[k].has(v)) fail(`fm-dup:${k}:${v}`, c.where, `${k === 'no' ? '章号' : k} "${v}" 和 ${seen[k].get(v)} 重复`, `${k === 'no' ? '章号' : k}必须唯一`);
      else seen[k].set(v, c.where);
    }
  }
  chapters.forEach((c, i) => {
    if (Number.isInteger(c.no) && c.no !== i + 1) {
      fail(`fm-seq:${c.file}`, c.where, `章号不连续：按顺序它应该是第 ${i + 1} 章，现在是第 ${c.no} 章`, '章号从 1 起连续；插入一章要把后面的文件都重命名并改 chapter');
    }
  });
  {
    let last = 0;
    for (const c of chapters) {
      if (!Number.isInteger(c.stage)) continue;
      if (c.stage < last) fail(`stage-order:${c.file}`, c.where, `第 ${c.no} 章属于阶段 ${c.stage}，却排在阶段 ${last} 的章后面`, '同一阶段的章要连续，阶段从小到大');
      last = Math.max(last, c.stage);
    }
  }
  const chByNo = new Map(chapters.map(c => [c.no, c]));
  const chById = new Map(chapters.map(c => [c.fm.id, c]));
  const maxNo = chapters.length;

  for (const c of pages) {
    const h1 = h1Of(c.masked);
    if (!h1) fail(`h1:${c.file}`, c.where, '没有一级标题（# …）');
    else if (nonEmpty(c.fm.title) && !h1.text.startsWith(c.fm.title))
      fail(`h1:${c.file}`, `${c.where}:${h1.line}`, `一级标题是 "${h1.text}"，frontmatter 的 title 是 "${c.fm.title}"`, '一级标题必须以 title 开头（可以更长，如 "响应式基础：ref 和 reactive"）');
    for (const p of checkContainers(c.masked)) fail(`container:${c.file}:${p.line}`, `${c.where}:${p.line}`, p.msg);
    for (const m of c.masked.matchAll(/\bTODO\b/g)) fail(`todo:${c.file}`, `${c.where}:${c.masked.slice(0, m.index).split('\n').length}`, '残留 TODO', '写完或删掉');
    c.todos = (c.src.split(PLACEHOLDER).length - 1);
    if (c.todos && opts.strict) fail(`placeholder:${c.file}`, c.where, `还有 ${c.todos} 处${PLACEHOLDER}占位`);
  }

  // 小节、小结
  for (const c of chapters) {
    c.sections = sectionsOf(c.masked);
    c.sections.forEach((s, i) => {
      if (s.n !== c.no) fail(`section-num:${c.file}:${s.n}.${s.m}`, `${c.where}:${s.line}`, `小节 ${s.n}.${s.m} 的章号部分应是 ${c.no}`);
      if (s.m !== i + 1) fail(`section-seq:${c.file}:${s.n}.${s.m}`, `${c.where}:${s.line}`, `小节编号不连续：这是本章第 ${i + 1} 个小节，却写成 ${s.n}.${s.m}`, '小节从 N.1 起连续编号');
    });
    const sums = (c.masked.match(/^::: summary\b/gm) || []).length;
    if (sums !== 1) fail(`summary:${c.file}`, c.where, `需要恰好一个 "::: summary" 小结块（自我解释的参考要点），现在有 ${sums} 个`);
  }

  // ---------- 2. 自测题 ----------
  const checkSc = (c, s, label) => {
    const where = `${c.where}:${s.line}`;
    const k = `sc:${c.file}:${s.line}`;
    if (c.fenced[s.line - 1]) fail(`sc-fence:${c.file}:${s.line}`, where, `${label}在围栏代码块里，却会被构建当成真的题抽出来`, '改成不含 <Sc> 的示例写法');
    if (s.aRaw === null) fail(k, where, `${label}缺少 :a 属性（正确选项序号）`, '写成 <Sc :a="0">');
    if (s.opts.length < 2) fail(k, where, `${label}至少要 2 个 <Opt>，现在抽到 ${s.opts.length} 个`, '<Opt>…</Opt> 必须单独占行首，一行一个');
    else if (s.aRaw !== null && s.aRaw >= s.opts.length) fail(k, where, `${label}的 :a="${s.aRaw}" 超出范围，只有 ${s.opts.length} 个选项（0 到 ${s.opts.length - 1}）`);
    if (s.opts.some(o => !o)) fail(k, where, `${label}有空选项`);
    if (s.leftover) fail(k, where, `${label}里有 <Opt> 没按格式写，抽不出来`, '<Opt>…</Opt> 必须单独占行首，一行一个');
    if (!s.stemSrc) fail(k, where, `${label}的题干是空的`);
    if (!s.explainSrc.trim()) fail(k, where, `${label}没有解析`, '加 <template #explain>，解析要说明为什么对并点出最迷惑的错误项');
    else if (!s.explainSrc.startsWith('解析：')) fail(k, where, `${label}的解析要以“解析：”开头`);
  };
  const stemsOf = {};
  const predictOf = {};
  for (const c of pages) {
    const all = scanSc(c.src);
    const raw = (c.src.match(/<Sc\b/g) || []).length;
    const closes = (c.src.match(/<\/Sc>/g) || []).length;
    if (raw !== all.length || closes !== all.length)
      fail(`sc-count:${c.file}`, c.where, `页面里有 ${raw} 个 <Sc、${closes} 个 </Sc>，但只有 ${all.length} 个能被抽取`, '检查 <Sc …> 是否成对，属性里不要写 >');
    c.sc = all.filter(s => !s.predict);
    c.scPredict = all.filter(s => s.predict);
    c.sc.forEach((s, i) => checkSc(c, s, `第 ${i + 1} 道自测（sc:${i}）`));
    c.scPredict.forEach(s => checkSc(c, s, '先猜题'));
    stemsOf[c.fm.id] = c.sc.map(s => s.stemSrc);
  }

  // ---------- 3/4/5. 目标、练习、实验台 ----------
  const exOwner = new Map(); // 练习 id → { file, ex }
  const exFileOf = {};
  for (const [file, mod] of Object.entries(inp.exercises)) {
    for (const [id, ex] of Object.entries(mod)) {
      if (typeof ex !== 'object' || ex === null || !('check' in ex)) continue;
      if (exOwner.has(id)) fail(`ex-dup:${id}`, `course/exercises/${file}.ts`, `练习 id "${id}" 和 course/exercises/${exOwner.get(id).file}.ts 重复`, '练习 id 全站唯一');
      else exOwner.set(id, { file, ex });
    }
  }
  const usedEx = new Map();
  const labSeen = new Map();
  for (const c of chapters) {
    const ex = exercisesOf(c.masked);
    c.exIds = ex.ids.map(e => e.id);
    if (ex.tags !== ex.ids.length) fail(`ex-tag:${c.file}`, c.where, `有 <Exercise> 没写 id="…"`);
    for (const e of ex.ids) {
      if (!exOwner.has(e.id)) fail(`ex-missing:${e.id}`, `${c.where}:${e.line}`, `<Exercise id="${e.id}"> 在 course/exercises/ 里找不到`, `在 course/exercises/${c.file}.ts 里导出 ${e.id}`);
      if (usedEx.has(e.id)) fail(`ex-twice:${e.id}`, `${c.where}:${e.line}`, `练习 "${e.id}" 被两处使用（${usedEx.get(e.id)}）`);
      else usedEx.set(e.id, c.where);
    }
    for (const g of goalsOf(c.masked)) {
      const where = `${c.where}:${g.line}`;
      for (const t of g.tokens) {
        const sc = /^sc:(\d+)$/.exec(t);
        const ex2 = /^ex:(.+)$/.exec(t);
        if (sc) {
          if (Number(sc[1]) >= c.sc.length) fail(`goal-sc:${c.file}:${t}`, where, `Goal 引用了 ${t}，但本章只有 ${c.sc.length} 道自测（sc:0 到 sc:${c.sc.length - 1}）`);
        } else if (ex2) {
          if (!c.exIds.includes(ex2[1])) fail(`goal-ex:${c.file}:${t}`, where, `Goal 引用了练习 "${ex2[1]}"，但本章没有 <Exercise id="${ex2[1]}">`);
        } else fail(`goal-token:${c.file}:${t}`, where, `Goal 的 checks 里有看不懂的项 "${t}"`, '只能写 sc:N 或 ex:练习id');
      }
    }
    // 实验台
    const { labs, opens, closes } = labsOf(c.masked);
    c.labs = labs;
    if (opens !== labs.length || closes !== labs.length) fail(`lab-tag:${c.file}`, c.where, `有 ${opens} 个 <Lab、${closes} 个 </Lab>，但只有 ${labs.length} 个成对`, '检查 <Lab> 是否成对');
    c.scPredictCount = c.scPredict.length;
    for (const l of labs) {
      if (!l.id) { fail(`lab-id:${c.file}:${l.line}`, `${c.where}:${l.line}`, '<Lab> 没有 id'); continue; }
      if (labSeen.has(l.id)) fail(`lab-dup:${l.id}`, `${c.where}:${l.line}`, `实验台 id "${l.id}" 和 ${labSeen.get(l.id)} 重复`, '实验台 id 全站唯一（它是先猜答案的存储键）');
      else labSeen.set(l.id, c.where);
    }
    c.predictLabs = labs.filter(l => l.predict && l.id).map(l => l.id);
    // import 的文件存在，用到的块级组件已导入
    const imports = importsOf(c.src);
    for (const im of imports) {
      if (!im.path.startsWith('.')) continue;
      const rel = `course/${im.path.replace(/^(\.\.\/)+/, '')}`;
      if (!files.has(rel) && !files.has(rel + '.ts') && !files.has(rel + '/index.ts')) fail(`import:${c.file}:${im.path}`, `${c.where}:${im.line}`, `import 的文件不存在：${im.path}`, `应在 ${rel}`);
    }
    const imported = new Set(imports.map(i => i.name).filter(Boolean));
    const globals = new Set([...files].filter(f => /^course\/\.vitepress\/theme\/components\/[^/]+\.vue$/.test(f)).map(f => f.split('/').pop().replace(/\.vue$/, '')));
    c.masked.split('\n').forEach((line, i) => {
      const t = /^<([A-Z]\w+)/.exec(line);
      if (t && !imported.has(t[1]) && !globals.has(t[1]) && inp.files.size) fail(`component:${c.file}:${t[1]}`, `${c.where}:${i + 1}`, `用了组件 <${t[1]}>，但它既没有在 <script setup> 里 import，也不是全局组件`);
    });
    for (const im of imports) {
      if (im.name && im.path.includes('/figures/') && !new RegExp(`<${im.name}\\b`).test(c.masked)) fail(`fig-unused:${c.file}:${im.name}`, `${c.where}:${im.line}`, `导入了示意图 ${im.name}，正文里没有用到`);
    }
    // 实验台测试数据
    const tests = inp.labTests?.[c.file];
    if (c.labs.length && !tests) fail(`labtest-file:${c.file}`, c.where, `本章有 ${c.labs.length} 个 <Lab>，但缺少 tests/site/labs/${c.file}.js`, '新建它，每个 <Lab id> 一项（见 AUTHORING.md 第 8 节）');
    if (tests) {
      for (const l of c.labs) if (l.id && !tests.includes(l.id)) fail(`labtest:${l.id}`, `tests/site/labs/${c.file}.js`, `缺少实验台 "${l.id}" 的测试数据`, '补一项 { id, name, pick, run }');
      for (const id of tests) if (!c.labs.some(l => l.id === id)) fail(`labtest-stale:${id}`, `tests/site/labs/${c.file}.js`, `测试数据里的 "${id}" 在 ${c.where} 里找不到对应的 <Lab>`, '删掉这一项，或恢复实验台');
    }
  }
  for (const f of Object.keys(inp.labTests || {})) if (!inp.chapterFiles[f]) fail(`labtest-orphan:${f}`, `tests/site/labs/${f}.js`, '没有对应的章');

  // 练习数据
  for (const [id, { file, ex }] of exOwner) {
    const where = `course/exercises/${file}.ts (${id})`;
    const k = s => `ex:${id}:${s}`;
    if (!usedEx.has(id)) fail(k('unused'), where, `练习 "${id}" 没有被任何一章用 <Exercise id="${id}" /> 引用`, '在章里放上它，或删掉');
    const user = [...chapters].find(c => c.exIds?.includes(id));
    if (user) {
      if (user.file !== file) fail(k('file'), where, `练习 "${id}" 在 ${CH(user.file)} 里使用，却放在 exercises/${file}.ts`, `搬到 course/exercises/${user.file}.ts`);
      if (ex.ch !== user.no) fail(k('ch'), where, `ch 是 ${JSON.stringify(ex.ch)}，但它所在的是第 ${user.no} 章`);
    }
    for (const key of Object.keys(ex)) if (!EXERCISE_KEYS.includes(key)) fail(k('key'), where, `未知字段 "${key}"（拼写错了？）`);
    for (const f of ['title', 'task']) if (!nonEmpty(ex[f])) fail(k(f), where, `${f} 缺失或为空`);
    if (!Number.isInteger(ex.ch)) fail(k('ch'), where, 'ch（所在章号）必须是整数');
    for (const f of ['tpl', 'js']) if (typeof ex[f] !== 'string') fail(k(f), where, `${f}（起始代码）必须是字符串`);
    if (typeof ex.check !== 'function') fail(k('check'), where, 'check 必须是函数');
    if (!Array.isArray(ex.hints) || !ex.hints.length) fail(k('hints'), where, 'hints 不能为空（至少写 1 级提示）');
    else ex.hints.forEach((h, i) => nonEmpty(h) || fail(k('hints'), where, `hints[${i}] 是空的`));
    const solTpl = ex.solTpl ?? ex.tpl;
    const solJs = ex.solJs ?? ex.js;
    if (solTpl === ex.tpl && solJs === ex.js) fail(k('solution'), where, '参考答案和起始代码相同（solTpl / solJs 都没写或没变），练习没法既"初始不通过"又"答案通过"');
    if (!Array.isArray(ex.wrong) || !ex.wrong.length) fail(k('wrong'), where, '至少要有 1 个 wrong（来自真实误解的错误解法）', '照其他练习写 wrong: [{ tpl 或 js, why, expectFail? }]');
    else {
      ex.wrong.forEach((w, i) => {
        if (!w || typeof w !== 'object') return fail(k('wrong'), where, `wrong[${i}] 不是对象`);
        const wt = w.tpl ?? solTpl;
        const wj = w.js ?? solJs;
        if (String(w.tpl).startsWith('WRONG_SUB_FAILED') || String(w.js).startsWith('WRONG_SUB_FAILED'))
          fail(k(`wrong-sub:${i}`), where, `wrong[${i}] 构造失败（WRONG_SUB_FAILED）：sub() 在参考答案里没找到要替换的文字`, '参考答案改过之后，更新 sub() 的第二个参数');
        else if (wt === solTpl && wj === solJs) fail(k(`wrong-same:${i}`), where, `wrong[${i}] 和参考答案完全相同，它不是错误解法`);
        if (w.expectFail !== undefined && !(w.expectFail instanceof RegExp)) fail(k('wrong'), where, `wrong[${i}].expectFail 必须是正则`);
      });
    }
    if (ex.lazy !== undefined && typeof ex.lazy !== 'boolean') fail(k('lazy'), where, 'lazy 必须是布尔值');
    // faded（半成品）每道练习都必须有：格式对，且能静态检查的几条也要对。
    // “原样提交不能通过、补全后能通过”要跑代码才知道，由 tests/site/exercises.test.js 检查。
    if (ex.faded === undefined) fail(k('faded'), where, '缺少 faded（半成品）', '加 faded: { tpl?, js? }：只写有改动的那一段，挖 1 到 4 处，每处写 /* ✏️ 说明 */（模板里元素位置写 <!-- ✏️ 说明 -->）');
    else {
      const f = ex.faded;
      if (!f || typeof f !== 'object' || Array.isArray(f)) fail(k('faded'), where, 'faded 必须是 { tpl?, js? } 对象');
      else {
        const keys = Object.keys(f);
        if (!keys.length) fail(k('faded'), where, 'faded 是空对象，至少写 tpl 或 js 之一');
        for (const key of keys) {
          if (key !== 'tpl' && key !== 'js') fail(k('faded'), where, `faded 里有未知字段 "${key}"，只能是 tpl 或 js`);
          else if (!nonEmpty(f[key])) fail(k('faded'), where, `faded.${key} 必须是非空字符串`);
        }
        if (String(f.tpl).startsWith('WRONG_SUB_FAILED') || String(f.js).startsWith('WRONG_SUB_FAILED')) fail(k('faded'), where, 'faded 构造失败（WRONG_SUB_FAILED）');
        else if (keys.every(key => key === 'tpl' || key === 'js') && keys.length) {
          // 取法和 Exercise.vue 一致：没写的那一段用起始代码
          const fTpl = f.tpl || ex.tpl;
          const fJs = f.js || ex.js;
          if (fTpl === solTpl && fJs === solJs) fail(k('faded'), where, 'faded 和参考答案完全相同，它没有留任何空给学习者', '挖掉关键处，换成 /* ✏️ 说明 */');
          const marks = (String(f.tpl ?? '') + String(f.js ?? '')).split(FADED_MARK).length - 1;
          if (marks < 1) fail(k('faded'), where, `faded 里没有 ${FADED_MARK} 占位，学习者看不出该补哪里`, '每个挖空处写 /* ✏️ 说明 */（模板元素位置写 <!-- ✏️ 说明 -->）');
        }
      }
    }
  }

  // ---------- 术语 ----------
  // 汇总各章“本章术语”块（格式错了就报出来），再校验首页写作规则表里的术语都能在术语表里找到
  const glossaryTerms = new Set();
  {
    const metas = chapters.filter(c => nonEmpty(c.fm.id) && Number.isInteger(c.stage)).map(c => ({
      meta: { id: c.fm.id, file: c.file, link: `/chapters/${c.file}`, chapter: c.no, title: c.fm.title, stage: c.stage },
      src: c.src,
    }));
    const safe = [];
    for (const m of metas) {
      try { collectGlossary([m]); safe.push(m); } catch (e) { fail(`terms-format:${m.meta.file}`, CH(m.meta.file), String(e.message), '术语块里每个术语：一行术语，下一行以 `: ` 开头写解释，术语之间空一行'); }
    }
    for (const e of collectGlossary(safe).entries) glossaryTerms.add(e.term);
  }
  if (inp.writingTerms) {
    const seenTerm = new Map();
    inp.writingTerms.forEach((w, i) => {
      const where = `course/writing-terms.mjs 第 ${i + 1} 条（${w?.label}）`;
      if (!w || !nonEmpty(w.label) || !nonEmpty(w.meaning) || !nonEmpty(w.avoid) || !Array.isArray(w.terms) || !w.terms.length || !w.terms.every(nonEmpty))
        return fail(`wterm:${i}`, where, '每条要有 label、terms（非空数组）、meaning、avoid');
      for (const t of w.terms) {
        if (seenTerm.has(t)) fail(`wterm-dup:${t}`, where, `术语“${t}”和第 ${seenTerm.get(t)} 条重复`);
        else seenTerm.set(t, i + 1);
        if (!glossaryTerms.has(t)) fail(`wterm-missing:${t}`, where, `术语“${t}”在术语表里找不到（没有哪一章的“本章术语”块写了它）`, '在合适的章的术语块里补上这个术语，或改这里的 terms 与术语块的写法一致（不要为此改章节内容时，先登记到 scripts/lib/known-issues.mjs）');
      }
    });
  }

  // ---------- 阶段测验专用题 ----------
  const checkCount = {};
  inp.questions.forEach((row, i) => {
    const where = `course/checks/questions.ts 第 ${i + 1} 题`;
    const k = `q:${i}`;
    if (!Array.isArray(row) || row.length < 4 || row.length > 5) return fail(k, where, '每题必须是 [题目, 选项, 解析, 章id] 或再加一个代码字符串');
    const [q, opts, explain, ch, code] = row;
    if (!nonEmpty(q)) fail(k, where, '题干是空的');
    if (!Array.isArray(opts) || opts.length < 2) fail(k, where, `选项至少 2 个（第一个是正确答案），现在是 ${Array.isArray(opts) ? opts.length : '没有'}`);
    else {
      if (opts.some(o => !nonEmpty(o))) fail(k, where, '有空选项');
      if (new Set(opts).size !== opts.length) fail(k, where, '选项有重复');
    }
    if (!nonEmpty(explain)) fail(k, where, '解析是空的');
    if (!chById.has(ch)) fail(k, where, `章 id "${ch}" 不存在`, '第 4 项必须是某一章 frontmatter 里的 id');
    else checkCount[ch] = (checkCount[ch] || 0) + 1;
    if (code !== undefined && !nonEmpty(code)) fail(k, where, '代码（第 5 项）若写了必须是非空字符串');
  });

  // ---------- 阶段 ----------
  for (let s = 1; s <= inp.stageCount; s++) {
    const inStage = chapters.filter(c => c.stage === s);
    if (!inStage.length) fail(`stage-empty:${s}`, 'course/stages.ts', `阶段 ${s} 没有任何章`);
    if (!files.has(`course/check/${s}.md`) && files.size) fail(`stage-page:${s}`, `course/check/${s}.md`, `阶段 ${s} 没有阶段测验页`, '照 course/check/1.md 新建');
    const pool = inStage.reduce((n, c) => n + c.sc.length, 0);
    const fresh = inStage.reduce((n, c) => n + (checkCount[c.fm.id] || 0), 0);
    if (pool + fresh < inp.stageQuestions)
      fail(`stage-pool:${s}`, `阶段 ${s}`, `题目不够抽 ${inp.stageQuestions} 题：章内自测 ${pool} 道 + 专用题 ${fresh} 道 = ${pool + fresh}`, '给这个阶段的章补自测题，或在 checks/questions.ts 末尾追加专用题');
  }

  // ---------- 卡片键快照 ----------
  const current = computeCards(
    chapters.map(c => ({ id: c.fm.id, stems: stemsOf[c.fm.id] || [], predictLabs: c.predictLabs || [] })),
    inp.questions,
  );
  let snapshotDiff = null;
  if (inp.snapshot === null && !opts.skipSnapshot) fail('snapshot:missing', 'course/card-keys.snapshot.json', '快照文件不存在', '运行 npm run check:content -- --update 生成，并提交它');
  else if (inp.snapshot !== undefined && !opts.skipSnapshot) {
    snapshotDiff = compareSnapshot(inp.snapshot, current);
    snapshotDiff.problems.forEach((p, i) => fail(`snapshot:${i}:${p.split(' ')[0]}`, 'course/card-keys.snapshot.json', p));
    const n = snapshotDiff.added.length + snapshotDiff.addedPred.length;
    if (n)
      fail('snapshot:added', 'course/card-keys.snapshot.json', `有 ${n} 个新键还没记进快照：${[...snapshotDiff.added, ...snapshotDiff.addedPred].slice(0, 6).join('、')}${n > 6 ? ' 等' : ''}`, '确认新题都追加在末尾后，运行 npm run check:content -- --update，并提交快照');
  }

  // ---------- 站内引用 ----------
  const textOfChapter = new Map();
  for (const c of chapters) {
    const exs = (c.exIds || []).map(id => exOwner.get(id)?.ex).filter(Boolean);
    const extra = exs.flatMap(e => [e.title, e.task, ...(e.hints || [])]).join('\n');
    textOfChapter.set(c.no, (c.src + '\n' + extra).toLowerCase());
  }
  /** 待扫描的文字来源：{ where, lines: [[行号|null, 文字]] } */
  const sources = pages.map(c => ({ where: c.where, lines: c.masked.split('\n').map((t, i) => [i + 1, t]), rawText: c.src }));
  for (const [rel, src] of Object.entries(inp.extraPages || {})) sources.push({ where: rel, lines: maskFences(src).masked.split('\n').map((t, i) => [i + 1, t]), rawText: src });
  for (const [file, mod] of Object.entries(inp.exercises)) {
    for (const [id, ex] of Object.entries(mod)) {
      if (!ex || typeof ex !== 'object') continue;
      const strs = [['title', ex.title], ['task', ex.task], ...(ex.hints || []).map((h, i) => [`hints[${i}]`, h]), ...(ex.wrong || []).map((w, i) => [`wrong[${i}].why`, w?.why])];
      for (const [f, t] of strs) if (typeof t === 'string') sources.push({ where: `course/exercises/${file}.ts (${id}.${f})`, lines: [[null, t]] });
    }
  }
  inp.questions.forEach((row, i) => {
    [row[0], ...(row[1] || []), row[2]].forEach((t, j) => typeof t === 'string' && sources.push({ where: `course/checks/questions.ts 第 ${i + 1} 题`, lines: [[null, t]] }));
  });
  const secOk = (n, m) => chByNo.get(n)?.sections.find(s => s.m === m);
  let refCount = 0;
  for (const { where, lines } of sources) {
    for (const [ln, line] of lines) {
      const at = ln ? `${where}:${ln}` : where;
      // 第 N 章 的范围，以及后面跟的“N.M 标题”“N.M 节”“词”
      for (const m of line.matchAll(/第\s*(\d+)\s*章/g)) {
        refCount++;
        const no = Number(m[1]);
        if (no < 1 || no > maxNo) { fail(`chref-range:${where}:${no}`, at, `引用了第 ${no} 章，但课程只有 ${maxNo} 章`); continue; }
        const rest = line.slice(m.index + m[0].length);
        const sec = /^\s*(?:的)?[“"](\d+)\.(\d+)\s*([^”"]*)[”"]|^\s*(\d+)\.(\d+)\s*节/.exec(rest);
        if (sec) continue; // 小节引用由下面的统一规则检查
        const word = /^\s*(?:的)?[“"]([^”"]{2,20})[”"]/.exec(rest);
        if (word && !textOfChapter.get(no).includes(word[1].toLowerCase()))
          fail(`chref-word:${where}:${no}:${word[1]}`, at, `写的是"第 ${no} 章“${word[1]}”"，但第 ${no} 章《${chByNo.get(no).fm.title}》里找不到“${word[1]}”`, '核对章号（插入章会让后面的章号顺延）');
      }
      // 链接文字里的章号和链接目标一致：[第 N 章…](/chapters/NN-id)
      for (const m of line.matchAll(/\[([^\]]*?第\s*(\d+)\s*章[^\]]*)\]\(\/chapters\/([^)#\s]+)/g)) {
        const target = pages.find(p => p.file === m[3].replace(/\.html$/, ''));
        if (target?.no && target.no !== Number(m[2])) fail(`chlink:${where}:${m[2]}`, at, `链接文字写的是第 ${m[2]} 章，链接指向的 ${m[3]} 是第 ${target.no} 章`);
      }
      // N.M 节：小节必须存在；前面紧跟“第 X 章”时 X 要等于 N
      for (const m of line.matchAll(/(?<![\d.])(\d{1,2})\.(\d{1,2})\s*节(?![点流省约奏日制])/g)) {
        refCount++;
        const n = Number(m[1]);
        const mm = Number(m[2]);
        if (!secOk(n, mm)) fail(`secref:${where}:${n}.${mm}`, at, `引用了 ${n}.${mm} 节，但第 ${n} 章没有这个小节`, '小节从 N.1 起编号；移动小节后要更新引用');
        const pre = /第\s*(\d+)\s*章\s*(?:的)?\s*$/.exec(line.slice(0, m.index));
        if (pre && Number(pre[1]) !== n) fail(`secref-ch:${where}:${n}.${mm}`, at, `写的是"第 ${pre[1]} 章 ${n}.${mm} 节"，但 ${n}.${mm} 属于第 ${n} 章`);
      }
      // “N.M 标题”：小节存在，标题对得上
      for (const m of line.matchAll(/[“"](\d{1,2})\.(\d{1,2})\s+([^”"]+)[”"]/g)) {
        refCount++;
        const n = Number(m[1]);
        const mm = Number(m[2]);
        const s = secOk(n, mm);
        if (!s) fail(`secref:${where}:${n}.${mm}`, at, `引用了“${n}.${mm} ${m[3]}”，但第 ${n} 章没有 ${n}.${mm} 小节`);
        else {
          const a = normTitle(m[3]);
          const b = normTitle(s.title);
          if (!(b.includes(a) || a.includes(b))) fail(`secref-title:${where}:${n}.${mm}`, at, `引用的是“${n}.${mm} ${m[3]}”，但 ${n}.${mm} 的标题是“${s.title}”`);
        }
      }
      // 站内链接
      for (const m of line.matchAll(/\]\((\/[^)\s]*)|(?:href|to)="(\/[^"]*)"/g)) {
        const raw = m[1] || m[2];
        const p = raw.replace(/[#?].*$/, '').replace(/\.html$/, '').replace(/\/$/, '');
        if (p === '') continue;
        const chap = /^\/chapters\/([^/]+)$/.exec(p);
        const check = /^\/check\/(\d+)$/.exec(p);
        let ok;
        if (chap) ok = !!inp.chapterFiles[chap[1]];
        else if (check) ok = Number(check[1]) >= 1 && Number(check[1]) <= inp.stageCount;
        else ok = !files.size || files.has(`course${p}.md`) || files.has(`course${p}/index.md`);
        if (!ok) fail(`link:${where}:${p}`, at, `站内链接 ${raw} 指向不存在的页面`, '章链接写成 /chapters/NN-id，阶段测验 /check/1 到 /check/6，复习 /review');
      }
    }
  }

  // ---------- 提示 ----------
  const exTodo = {};
  for (const [file, mod] of Object.entries(inp.exercises))
    for (const ex of Object.values(mod)) {
      if (!ex || typeof ex !== 'object') continue;
      const text = [ex.title, ex.task, ...(ex.hints || []), ...(ex.wrong || []).map(w => w?.why)].filter(t => typeof t === 'string').join('\n');
      exTodo[file] = (exTodo[file] || 0) + (text.split(PLACEHOLDER).length - 1);
    }
  for (const [file, n] of Object.entries(exTodo)) {
    const c = chapters.find(x => x.file === file);
    if (n && c) c.todos += n;
    if (n && opts.strict && !c?.todos) fail(`placeholder:ex:${file}`, `course/exercises/${file}.ts`, `还有 ${n} 处${PLACEHOLDER}占位`);
  }
  const todos = chapters.filter(c => c.todos).map(c => `${c.file}（${c.todos} 处）`);
  if (todos.length) notes.push(`这些章还有${PLACEHOLDER}占位，发布前要换成真内容：${todos.join('、')}`);

  const stats = {
    chapters: maxNo,
    sc: chapters.reduce((n, c) => n + c.sc.length, 0),
    predict: chapters.reduce((n, c) => n + c.predictLabs.length, 0),
    checks: inp.questions.length,
    exercises: exOwner.size,
    labs: labSeen.size,
    refs: refCount,
    cards: Object.keys(current.cards).length,
    terms: glossaryTerms.size,
  };
  return { errors, notes, stats, current, snapshotDiff, chapters };
}

/** 去掉临时豁免：exemptions 是 [{ key, why }]。返回 { errors（剩下的）, exempted（被豁免的）, stale（没匹配到任何错误的豁免） } */
export function applyExemptions(errors, exemptions) {
  const keys = new Set(exemptions.map(e => e.key));
  const hit = new Set();
  const rest = [];
  const exempted = [];
  for (const e of errors) {
    if (keys.has(e.key)) { hit.add(e.key); exempted.push(e); } else rest.push(e);
  }
  const stale = exemptions.filter(e => !hit.has(e.key));
  return { errors: rest, exempted, stale };
}
