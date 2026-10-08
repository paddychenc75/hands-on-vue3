// 章节 Markdown 的纯文本解析：不读文件、不碰 DOM、不依赖 Vite，只处理字符串。
// 站点构建（course/.vitepress/course-data.mts、sidebar.mts）和 Node 脚本（scripts/ 里的 check-content、new-chapter，
// 以及单元测试）共用这一份实现，不再有第二份副本。要在两边都能 import，所以写成 .mjs。

/** 读 frontmatter 里“键: 值”行。值可以是引号字符串或普通文字。没有 frontmatter 返回 null */
export function readFrontmatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^".*"$/.test(v)) {
      try {
        v = JSON.parse(v);
      } catch {
        v = v.slice(1, -1);
      }
    } else if (/^'.*'$/.test(v)) v = v.slice(1, -1).replace(/''/g, "'");
    out[kv[1]] = v;
  }
  return out;
}

/** frontmatter 占几行（含两条 --- 线），没有返回 0 */
export function frontmatterLines(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
  return m ? m[0].split('\n').length : 0;
}

/** 一个容器块（`::: 名` 到下一行单独的 `:::`）里的 Markdown 原文。没有这个块返回空串 */
function containerBody(md, name) {
  const m = new RegExp(`^::: ${name}[^\\n]*\\n([\\s\\S]*?)\\n:::[ \\t]*$`, 'm').exec(md);
  return m ? m[1].trim() : '';
}

/** 一章的小结块（::: summary）里的 Markdown 原文 */
export const parseSummary = md => containerBody(md, 'summary');

/** 一章“本章术语”块（::: terms）里的 Markdown 原文 */
export const parseTermsBlock = md => containerBody(md, 'terms');

/** 一章“阅读时间”块（::: rt）里的文字，例如“阅读主线约 7 分钟，深入内容约 2 分钟（可选）。……”。章头显示它，正文里不再单独渲染 */
export const parseReadingTime = md => containerBody(md, 'rt').replace(/\s*\n\s*/g, ' ');

/** 把术语块拆成 [{ term, def }]。格式是定义列表：第一行术语，下一行以 `: ` 开头写解释，术语之间空一行 */
export function parseTerms(block) {
  const out = [];
  for (const part of block.split(/\n[ \t]*\n/)) {
    const lines = part.trim().split('\n');
    const term = lines[0]?.trim();
    const def = lines.slice(1).map(l => l.replace(/^:\s+/, '').trim()).join(' ').trim();
    if (!term || !def || !/^:\s/.test(lines[1] ?? '')) throw new Error('本章术语块格式不对（术语一行，下一行以 `: ` 开头写解释）：' + part.slice(0, 50));
    out.push({ term, def });
  }
  return out;
}

/** 脚手架（new-chapter）写进骨架的占位标记。术语里带它的条目不进术语表 */
const PLACEHOLDER = '【待写】';

/**
 * 汇总全站术语。chapters 是 [{ meta: { id, file, link, chapter, title, stage }, src }]，按章的先后（阶段、章号）排好。
 * 同名术语合并：保留首次出现的定义，记录出现过的所有章；定义文字不同的同名术语记进 conflicts。只看有阶段的章（速查表没有术语块）。术语文字里含“【待写】”的占位条目跳过。
 * 返回 { entries: [{ term, defSrc, chapters: [{ id, link, chapter, title }] }], conflicts: [{ term, defs: [{ file, def }] }] }
 */
export function collectGlossary(chapters) {
  const byTerm = new Map();
  for (const { meta, src } of chapters) {
    if (meta.stage == null) continue;
    const block = parseTermsBlock(src);
    if (!block) continue;
    const ref = { id: meta.id, link: meta.link, chapter: meta.chapter, title: meta.title };
    for (const { term, def } of parseTerms(block)) {
      if (term.includes(PLACEHOLDER)) continue; // 脚手架骨架里的占位术语（“【待写】术语”）不进术语表
      const e = byTerm.get(term);
      if (!e) byTerm.set(term, { term, defSrc: def, chapters: [ref], defs: [{ file: meta.file, def }] });
      else {
        if (!e.chapters.some(c => c.id === meta.id)) e.chapters.push(ref);
        e.defs.push({ file: meta.file, def });
      }
    }
  }
  const entries = [...byTerm.values()];
  const norm = s => s.replace(/\s+/g, '');
  const conflicts = entries.filter(e => new Set(e.defs.map(d => norm(d.def))).size > 1).map(e => ({ term: e.term, defs: e.defs }));
  return { entries: entries.map(({ term, defSrc, chapters }) => ({ term, defSrc, chapters })), conflicts };
}

/** 从下标换算行号（从 1 起） */
export function lineOf(src, index) {
  let n = 1;
  for (let i = 0; i < index; i++) if (src.charCodeAt(i) === 10) n++;
  return n;
}

/** 把围栏代码块里的内容整行清空（保留围栏行本身和行数），返回 { masked, fenced }，fenced[i] 为真表示第 i 行（从 0 起）在代码块里（含围栏行） */
export function maskFences(src) {
  const lines = src.split('\n');
  const fenced = new Array(lines.length).fill(false);
  let fence = null;
  const out = lines.map((line, i) => {
    if (fence) {
      fenced[i] = true;
      const close = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
      if (close && close[1][0] === fence.ch && close[1].length >= fence.len) fence = null;
      return '';
    }
    const open = /^\s*(`{3,}|~{3,})/.exec(line);
    if (open) {
      fence = { ch: open[1][0], len: open[1].length };
      fenced[i] = true;
      return '';
    }
    return line;
  });
  return { masked: out.join('\n'), fenced, unclosed: !!fence };
}

/**
 * 把行内代码（`…`、``…``）的内容换成空格，长度和行数不变。fenced[i] 为真的行（围栏代码块）原样保留。
 * 校验统计 <Sc>、<Lab>、<Exercise> 这类组件标签时先用它，免得正文里讲“`<Lab>` 标签”被误数成真的组件。
 */
export function maskInlineCode(text, fenced = []) {
  return text
    .split('\n')
    .map((line, i) => (fenced[i] ? line : line.replace(/(`+)(?!`)[^\n]+?(?<!`)\1(?!`)/g, m => ' '.repeat(m.length))))
    .join('\n');
}

/**
 * 找出所有 <Sc ...>...</Sc>（含带 predict 的先猜题），逐个拆成题干、选项、解析。
 * 返回项多带 index、line、predict、aRaw（没写 :a 时是 null）几个字段，给校验用。
 */
export function scanSc(md) {
  const out = [];
  // 开头和结尾标签都必须在行首（写法规则：块级组件标签独占一行）。正文里行内代码写的字面 `<Sc>`、`</Sc>` 因此不会被当成题
  const re = /^<Sc\b([^>]*)>([\s\S]*?)^<\/Sc>/gm;
  for (const m of md.matchAll(re)) {
    const a = /:a="(\d+)"/.exec(m[1]);
    let body = m[2];
    let explainSrc = '';
    const ex = /<template #explain>([\s\S]*?)<\/template>/.exec(body);
    if (ex) {
      explainSrc = ex[1].trim();
      body = body.replace(ex[0], '');
    }
    const opts = [];
    body = body.replace(/^<Opt>(.*?)<\/Opt>[ \t]*$/gm, (_s, t) => {
      opts.push(t.trim());
      return '';
    });
    out.push({
      predict: /\bpredict\b/.test(m[1]),
      aRaw: a ? Number(a[1]) : null,
      stemSrc: body.trim(),
      opts,
      explainSrc,
      leftover: /<\/?Opt\b/.test(body),
      index: m.index,
      line: lineOf(md, m.index),
      head: m[0].slice(0, 60),
    });
  }
  return out;
}

/** 只含“非先猜”的自测题（带 predict 的先猜题不算），{ a, stemSrc, opts, explainSrc }。序号规则和 Sc 组件一致：本章第几道非先猜的 <Sc>，从 0 起 */
export function parseSelfChecks(md) {
  return scanSc(md)
    .filter(s => !s.predict)
    .map(s => {
      if (s.aRaw === null) throw new Error('<Sc> 缺少 :a 属性：' + s.head);
      return { a: s.aRaw, stemSrc: s.stemSrc, opts: s.opts, explainSrc: s.explainSrc };
    });
}

/** 容器 ::: 的开合检查（要先 maskFences）。返回 [{ line, msg }] */
export function checkContainers(masked) {
  const problems = [];
  const stack = [];
  masked.split('\n').forEach((line, i) => {
    const m = /^(:{3,})[ \t]*(.*)$/.exec(line);
    if (!m) return;
    if (m[2].trim()) stack.push({ line: i + 1, name: m[2].trim().split(/\s+/)[0], colons: m[1].length });
    else if (stack.length) stack.pop();
    else problems.push({ line: i + 1, msg: '多余的 :::（前面没有打开的容器）' });
  });
  for (const s of stack) problems.push({ line: s.line, msg: `容器 "${s.name}" 没有闭合（缺少结尾的 :::）` });
  return problems;
}

/** 小节标题 `### N.M 标题`（先 maskFences）。返回 [{ n, m, title, line }] */
export function sectionsOf(masked) {
  const out = [];
  masked.split('\n').forEach((line, i) => {
    const h = /^###\s+(\d+)\.(\d+)\s+(.*?)\s*$/.exec(line);
    if (h) out.push({ n: Number(h[1]), m: Number(h[2]), title: h[3], line: i + 1 });
  });
  return out;
}

/** 一级标题（先 maskFences，且跳过 frontmatter） */
export function h1Of(masked) {
  const lines = masked.split('\n');
  let start = 0;
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) start = end + 1;
  }
  for (let i = start; i < lines.length; i++) {
    const m = /^# (.*)$/.exec(lines[i]);
    if (m) return { text: m[1].trim(), line: i + 1 };
  }
  return null;
}

/** 实验台：<Lab id="…"> … </Lab>。返回 [{ id, predict, line }]，另给出开闭标签数 */
export function labsOf(masked) {
  const labs = [];
  const re = /<Lab\b([^>]*)>([\s\S]*?)<\/Lab>/g;
  for (const m of masked.matchAll(re)) {
    const id = /\bid="([^"]*)"/.exec(m[1]);
    labs.push({ id: id ? id[1] : null, predict: /<Sc\b[^>]*\bpredict\b/.test(m[2]), line: lineOf(masked, m.index) });
  }
  const opens = (masked.match(/<Lab\b/g) || []).length;
  const closes = (masked.match(/<\/Lab>/g) || []).length;
  return { labs, opens, closes };
}

/** 目标：<Goal checks="sc:0,ex:id">。返回 [{ tokens, line }]；没写 checks 的 tokens 是 [] */
export function goalsOf(masked) {
  const out = [];
  for (const m of masked.matchAll(/<Goal\b([^>]*)>/g)) {
    const c = /\bchecks="([^"]*)"/.exec(m[1]);
    out.push({ tokens: c ? c[1].split(',').map(s => s.trim()).filter(Boolean) : [], line: lineOf(masked, m.index) });
  }
  return out;
}

/** 练习：<Exercise id="…" />。返回 { ids: [{ id, line }], tags } */
export function exercisesOf(masked) {
  const ids = [];
  for (const m of masked.matchAll(/<Exercise\s+id="([^"]+)"/g)) ids.push({ id: m[1], line: lineOf(masked, m.index) });
  return { ids, tags: (masked.match(/<Exercise\b/g) || []).length };
}

/** 章开头 <script setup> 里的 import：[{ name, path, line }] */
export function importsOf(src) {
  const m = /<script setup>([\s\S]*?)<\/script>/.exec(src);
  if (!m) return [];
  const out = [];
  const base = lineOf(src, m.index);
  m[1].split('\n').forEach((line, i) => {
    const im = /^\s*import\s+(?:(\w+)|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/.exec(line);
    if (im) out.push({ name: im[1] || null, path: im[2], line: base + i });
  });
  return out;
}

/** 复习卡片键用的题干指纹所需的哈希在 cards.mjs；这里只放文字规范化 */
export const normTitle = s => s.replace(/[\s“”"'‘’「」『』《》：:，,。！!？?（）()·\-—]/g, '').toLowerCase();
