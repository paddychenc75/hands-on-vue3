// 章节 Markdown 的纯文本解析：不读文件，只处理字符串。check-content、new-chapter 和单元测试共用。
//
// 注意：parseSelfChecks 和 parseSummary 是 course/.vitepress/course-data.mts 里同名函数的独立副本。
// 构建时站点用 course-data.mts 的版本，这里的版本给 Node 脚本用。两份必须保持一致，
// tests/unit/content-parity.test.ts 会对全部章节断言两份输出相同。（应当合并成一份，见 AGENTS.md 的说明。）

/** 读 frontmatter 里“键: 值”行（和 course/.vitepress/sidebar.mts 的 readFrontmatter 同一规则）。没有 frontmatter 返回 null */
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

/** 一章的小结块（::: summary 到结尾 :::）里的 Markdown 原文 */
export function parseSummary(md) {
  const m = /^::: summary[^\n]*\n([\s\S]*?)\n:::[ \t]*$/m.exec(md);
  return m ? m[1].trim() : '';
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
 * 找出所有 <Sc ...>...</Sc>（含带 predict 的先猜题），逐个拆成题干、选项、解析。
 * 返回项多带 index、line、predict、aRaw（没写 :a 时是 null）几个字段，给校验用。
 */
export function scanSc(md) {
  const out = [];
  const re = /<Sc\b([^>]*)>([\s\S]*?)<\/Sc>/g;
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

/** 和 course-data.mts 的 parseSelfChecks 同一输出：只含“非先猜”的自测题，{ a, stemSrc, opts, explainSrc } */
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
