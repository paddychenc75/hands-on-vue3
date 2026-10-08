import type { Exercise } from './types'
import { sub } from './types'
import { nextTick } from 'vue'

export const flagBitFill: Exercise = {
  title: '补全：用按位与检查 PatchFlag', ch: 25,
  task: '<p>这是第 25 章深入部分 patchElement 的迷你版。CLASS 的检查已经写好：<code>flag &amp; PatchFlags.CLASS</code>。只补全两个 TODO 条件。</p><ol><li>TODO 1：检查 STYLE 这一位。</li><li>TODO 2：检查 TEXT 这一位。</li><li>确认 PatchFlag 1 只更新文字，4 只更新 style，7 = TEXT | CLASS | STYLE 三者都更新。</li></ol>',
  tpl: '<p class="out">{{ html }}</p>\n<button @click="update(1)">PatchFlag 1</button>\n<button @click="update(4)">PatchFlag 4</button>\n<button @click="update(7)">PatchFlag 7</button>',
  js: `const PatchFlags = { TEXT: 1, CLASS: 2, STYLE: 4 }

// 一个真实的 DOM 元素：<p class="old" style="width: 0px;">旧文字</p>
const el = document.createElement('p')
el.className = 'old'
el.style.width = '0px'
el.textContent = '旧文字'

// 迷你 patchElement：只更新 patchFlag 标记的部分
function patchElement(el, vnode) {
  const flag = vnode.patchFlag
  if (flag & PatchFlags.CLASS) {      // 已给出：检查 CLASS 这一位
    el.className = vnode.props.class
  }
  if (false) {                        // TODO 1：检查 STYLE 这一位
    el.style.width = vnode.props.width
  }
  if (false) {                        // TODO 2：检查 TEXT 这一位
    el.textContent = vnode.children
  }
}

// ===== 已给出：用新的虚拟节点更新 el =====
const html = ref(el.outerHTML)
let n = 0
function update(flag) {
  n++
  patchElement(el, { patchFlag: flag, props: { class: 'c' + n, width: n + 'px' }, children: '文字' + n })
  html.value = el.outerHTML
}

return { html, update }`,
  solJs: `const PatchFlags = { TEXT: 1, CLASS: 2, STYLE: 4 }

// 一个真实的 DOM 元素：<p class="old" style="width: 0px;">旧文字</p>
const el = document.createElement('p')
el.className = 'old'
el.style.width = '0px'
el.textContent = '旧文字'

// 迷你 patchElement：只更新 patchFlag 标记的部分
function patchElement(el, vnode) {
  const flag = vnode.patchFlag
  if (flag & PatchFlags.CLASS) {      // 已给出：检查 CLASS 这一位
    el.className = vnode.props.class
  }
  if (flag & PatchFlags.STYLE) {      // 检查 STYLE 这一位
    el.style.width = vnode.props.width
  }
  if (flag & PatchFlags.TEXT) {       // 检查 TEXT 这一位
    el.textContent = vnode.children
  }
}

// ===== 已给出：用新的虚拟节点更新 el =====
const html = ref(el.outerHTML)
let n = 0
function update(flag) {
  n++
  patchElement(el, { patchFlag: flag, props: { class: 'c' + n, width: n + 'px' }, children: '文字' + n })
  html.value = el.outerHTML
}

return { html, update }`,
  hints: [
    '多个 PatchFlag 用按位或组合，例如 7 = 1 | 2 | 4。运行时用按位与检查某一位。结果不是 0，说明这一位存在。第 25 章 PatchFlag 表格下面的说明讲了它。',
    '只改两个 if (false) 的条件。仿照 CLASS 那一行：flag 和 PatchFlags 中对应的值按位与。TODO 1 用 STYLE，TODO 2 用 TEXT。',
    'if (flag & PatchFlags.STYLE) {\n  el.style.width = vnode.props.width\n}\nif (flag & PatchFlags.TEXT) {\n  el.textContent = vnode.children\n}'
  ],
  async check(T) {
    const read = () => {
      const s = (T.$('.out') || {}).textContent || '';
      const c = /class="([^"]*)"/.exec(s), w = /width:\s*([^;"]*)/.exec(s), t = />([^<]*)</.exec(s);
      return { cls: c ? c[1] : '', w: w ? w[1].trim() : '', text: t ? t[1] : '' };
    };
    const show = r => '（当前 class="' + r.cls + '"，width ' + r.w + '，文字“' + r.text + '”）';
    const b = n => T.btn('PatchFlag ' + n);
    if (!b(1) || !b(4) || !b(7)) { T.ok(false, '找到三个 PatchFlag 按钮'); return; }
    let r = read();
    T.ok(r.cls === 'old' && r.w === '0px' && r.text === '旧文字', '初始是 class="old"、width 0px、文字“旧文字”');
    await T.click(b(1));
    r = read();
    T.ok(r.text === '文字1' && r.cls === 'old' && r.w === '0px', 'PatchFlag 1：只更新文字' + show(r));
    await T.click(b(4));
    r = read();
    T.ok(r.w === '2px' && r.text === '文字1' && r.cls === 'old', 'PatchFlag 4：只更新 style' + show(r));
    await T.click(b(7));
    r = read();
    T.ok(r.cls === 'c3' && r.w === '3px' && r.text === '文字3', 'PatchFlag 7：class、style 和文字都更新' + show(r));
    // 再喂一个按钮上没有的组合：STYLE | TEXT 再带一个本题没有定义的位 8。按位与仍然成立，列举 4、7 这类具体数的写法会失败
    const S = (T.$(':scope > div') as any)?._vnode?.component?.setupState;
    if (S && typeof S.update === 'function') {
      S.update(5 | 8);
      await nextTick();
      r = read();
      T.ok(r.w === '4px' && r.text === '文字4' && r.cls === 'c3', '标记 13 = TEXT | STYLE | 8：只更新文字和 style，class 不变（要用按位与检查某一位，不要把整个数和具体的值比较）' + show(r));
    }
  }
}

export const patchFlagFix: Exercise = {
  title: '修复：标记为 3 时，文字和 class 都不更新', ch: 25,
  task: '<p>脚本中有一个迷你的 patchElement。它读取新虚拟节点的 patchFlag，只更新标记的部分。没有标记的部分，它不看。</p><p>模板 <code>&lt;p :class="c"&gt;{{ msg }}&lt;/p&gt;</code> 的 PatchFlag 是 3 = TEXT | CLASS。现在 patchFlag 为 3 时，文字和 class 都不更新。</p><ol><li>只修改 patchElement 中的两个条件。</li><li>确认 PatchFlag 1 只更新文字，2 只更新 class，3 两者都更新。</li></ol>',
  tpl: '<p class="out">{{ html }}</p>\n<button @click="update(1)">PatchFlag 1</button>\n<button @click="update(2)">PatchFlag 2</button>\n<button @click="update(3)">PatchFlag 3</button>',
  js: `const PatchFlags = { TEXT: 1, CLASS: 2 }

// 一个真实的 DOM 元素：<p class="old">旧文字</p>
const el = document.createElement('p')
el.className = 'old'
el.textContent = '旧文字'

// 迷你 patchElement：只更新 patchFlag 标记的部分
function patchElement(el, vnode) {
  const flag = vnode.patchFlag
  if (flag === PatchFlags.CLASS) {
    el.className = vnode.props.class
  }
  if (flag === PatchFlags.TEXT) {
    el.textContent = vnode.children
  }
}

// ===== 已给出：用新的虚拟节点更新 el =====
const html = ref(el.outerHTML)
let n = 0
function update(flag) {
  n++
  patchElement(el, { patchFlag: flag, props: { class: 'c' + n }, children: '文字' + n })
  html.value = el.outerHTML
}

return { html, update }`,
  solJs: `const PatchFlags = { TEXT: 1, CLASS: 2 }

// 一个真实的 DOM 元素：<p class="old">旧文字</p>
const el = document.createElement('p')
el.className = 'old'
el.textContent = '旧文字'

// 迷你 patchElement：只更新 patchFlag 标记的部分
function patchElement(el, vnode) {
  const flag = vnode.patchFlag
  if (flag & PatchFlags.CLASS) {     // 按位与：检查 CLASS 这一位
    el.className = vnode.props.class
  }
  if (flag & PatchFlags.TEXT) {      // 按位与：检查 TEXT 这一位
    el.textContent = vnode.children
  }
}

// ===== 已给出：用新的虚拟节点更新 el =====
const html = ref(el.outerHTML)
let n = 0
function update(flag) {
  n++
  patchElement(el, { patchFlag: flag, props: { class: 'c' + n }, children: '文字' + n })
  html.value = el.outerHTML
}

return { html, update }`,
  hints: [
    '原因：标记 3 是 1 和 2 两个标记组合在一起的结果。代码用 === 比较，3 既不等于 1，也不等于 2，所以两个 if 都不成立。要检查“3 中是否包含某一位”，而不是比较整个数。第 25 章 PatchFlag 表格下面的说明讲了它。',
    '只改两个 if 的条件。把 flag === PatchFlags.CLASS 改为“flag 和 CLASS 按位与”。TEXT 的条件同样修改。',
    'if (flag & PatchFlags.CLASS) {\n  el.className = vnode.props.class\n}\nif (flag & PatchFlags.TEXT) {\n  el.textContent = vnode.children\n}'
  ],
  async check(T) {
    const read = () => { const s = (T.$('.out') || {}).textContent || ''; const c = /class="([^"]*)"/.exec(s), t = />([^<]*)</.exec(s); return { cls: c ? c[1] : '', text: t ? t[1] : '' }; };
    const b = n => T.btn('PatchFlag ' + n);
    if (!b(1) || !b(2) || !b(3)) { T.ok(false, '找到三个 PatchFlag 按钮'); return; }
    T.ok(read().cls === 'old' && read().text === '旧文字', '初始是 <p class="old">旧文字</p>');
    await T.click(b(1));
    let r = read();
    T.ok(r.text === '文字1' && r.cls === 'old', 'PatchFlag 1：只更新文字，class 不变（当前 class="' + r.cls + '"，文字“' + r.text + '”）');
    await T.click(b(2));
    r = read();
    T.ok(r.cls === 'c2' && r.text === '文字1', 'PatchFlag 2：只更新 class，文字不变（当前 class="' + r.cls + '"，文字“' + r.text + '”）');
    await T.click(b(3));
    r = read();
    T.ok(r.cls === 'c3' && r.text === '文字3', 'PatchFlag 3：文字和 class 都更新（当前 class="' + r.cls + '"，文字“' + r.text + '”）');
    // 再喂一个按钮上没有的组合：TEXT | CLASS 再带一个本题没有定义的位 8。按位与仍然成立，列举 1、2、3 的写法会失败
    const S = (T.$(':scope > div') as any)?._vnode?.component?.setupState;
    if (S && typeof S.update === 'function') {
      S.update(3 | 8);
      await nextTick();
      r = read();
      T.ok(r.cls === 'c4' && r.text === '文字4', '标记 11 = TEXT | CLASS | 8：文字和 class 都更新（要用按位与检查某一位，不要把整个数和具体的值比较）（当前 class="' + r.cls + '"，文字“' + r.text + '”）');
    }
  }
}

// ===== 错误解法（基于参考答案做小改动）=====
flagBitFill.wrong = [
  { js: sub(sub(flagBitFill.solJs, 'flag & PatchFlags.STYLE', 'flag === PatchFlags.STYLE'), 'flag & PatchFlags.TEXT', 'flag === PatchFlags.TEXT'), why: '用 === 比较整个数。flag 是 7 时，7 既不等于 4，也不等于 1，STYLE 和 TEXT 都不更新。要用按位与检查某一位。', expectFail: /PatchFlag 7/ },
  { js: sub(sub(flagBitFill.solJs, 'flag & PatchFlags.STYLE', 'flag === 4 || flag === 7'), 'flag & PatchFlags.TEXT', 'flag === 1 || flag === 7'), why: '把用到的组合一个个列出来。按钮上的 1、4、7 都能过，但标记还可以是 5、13 等其他组合。按位与检查的是“有没有这一位”，不用列举。', expectFail: /标记 13/ },
  { js: sub(sub(flagBitFill.solJs, 'flag & PatchFlags.STYLE', 'flag | PatchFlags.STYLE'), 'flag & PatchFlags.TEXT', 'flag | PatchFlags.TEXT'), why: '把按位与写成了按位或。结果恒不为 0，条件总是成立，PatchFlag 1 也会更新 style。', expectFail: /PatchFlag 1/ }
]

patchFlagFix.wrong = [
  { js: sub(sub(patchFlagFix.solJs, 'flag & PatchFlags.CLASS', 'flag | PatchFlags.CLASS'), 'flag & PatchFlags.TEXT', 'flag | PatchFlags.TEXT'), why: '把按位与写成了按位或。结果恒不为 0，所以每个标记都更新 class 和文字，没有“只更新标记的部分”。', expectFail: /PatchFlag 1/ },
  { js: sub(sub(patchFlagFix.solJs, 'flag & PatchFlags.CLASS', 'flag >= PatchFlags.CLASS'), 'flag & PatchFlags.TEXT', 'flag >= PatchFlags.TEXT'), why: '把“包含某一位”当成了“数值够大”。PatchFlag 2 也大于等于 1，所以只改 class 时文字也被更新。', expectFail: /PatchFlag 2/ },
  { js: sub(sub(patchFlagFix.solJs, 'flag & PatchFlags.CLASS', 'flag === 2 || flag === 3'), 'flag & PatchFlags.TEXT', 'flag === 1 || flag === 3'), why: '把用到的组合一个个列出来。按钮上的 1、2、3 都能过，但标记还可以是 11 等其他组合。按位与检查的是“有没有这一位”，不用列举。', expectFail: /标记 11/ }
]

// ===== 半成品示例（参考答案挖掉关键处，占位说明做什么）=====
flagBitFill.faded = {
  js: sub(sub(flagBitFill.solJs, 'flag & PatchFlags.STYLE', 'false /* ✏️ 用 flag 检查 STYLE 这一位 */'),
    'flag & PatchFlags.TEXT', 'false /* ✏️ 用 flag 检查 TEXT 这一位 */')
}

patchFlagFix.faded = {
  js: sub(sub(sub(sub(patchFlagFix.solJs, 'flag & PatchFlags.CLASS', 'false /* ✏️ flag 里是否含有 CLASS 这一位？ */'),
    'flag & PatchFlags.TEXT', 'false /* ✏️ flag 里是否含有 TEXT 这一位？ */'),
    '// 按位与：检查 CLASS 这一位', '// 只在标记含 CLASS 时更新'),
    '// 按位与：检查 TEXT 这一位', '// 只在标记含 TEXT 时更新')
}

// =====================================================================
// 迷你编译器：parse 和 traverse 已给出，学习者写节点转换和代码生成
// =====================================================================

// 迷你 parse 和 traverse 的源码（两道练习共用；这里不能出现反引号和 ${，因为它被拼进练习脚本）。
const MINI_FRONT = String.raw`// ===== 已给出：迷你 parse（不用修改） =====
// 元素   { type: 'element', tag, props: [{ name, value, dynamic }], children, patchFlag: 0, dynamicProps: [] }
// 文字   { type: 'text', content }       插值   { type: 'interp', content }
// :class="c" 解析成 { name: 'class', value: 'c', dynamic: true }，class="k" 的 dynamic 是 false
function parse(src) {
  const root = { type: 'root', children: [] }
  const stack = [root]
  const re = /<\/(\w+)>|<(\w+)((?:\s+[:\w-]+="[^"]*")*)\s*>|\{\{\s*(.+?)\s*\}\}|([^<{]+)/g
  let m
  while ((m = re.exec(src))) {
    const top = stack[stack.length - 1]
    if (m[1]) stack.pop()
    else if (m[2]) {
      const props = [...m[3].matchAll(/([:\w-]+)="([^"]*)"/g)].map(a => ({
        name: a[1].replace(':', ''), value: a[2], dynamic: a[1][0] === ':'
      }))
      const el = { type: 'element', tag: m[2], props, children: [], patchFlag: 0, dynamicProps: [] }
      top.children.push(el)
      stack.push(el)
    } else if (m[4]) top.children.push({ type: 'interp', content: m[4] })
    else top.children.push({ type: 'text', content: m[5] })
  }
  return root
}

// ===== 已给出：迷你 traverse（不用修改） =====
// 对每个节点运行所有 nodeTransforms，再处理它的子节点。Vue 的 traverseNode 也是这个顺序
function traverse(node, nodeTransforms) {
  for (const t of nodeTransforms) t(node)
  for (const child of node.children || []) traverse(child, nodeTransforms)
}

const PatchFlags = { TEXT: 1, CLASS: 2, STYLE: 4, PROPS: 8 }
`

/** 参考实现的转换（给第二道练习当已给出的部分，也给判题用） */
const MINI_TRANSFORM_SOL = String.raw`function transformElement(node) {
  if (node.type !== 'element') return
  let flag = 0
  const dynamicProps = []
  if (node.children.some(c => c.type === 'interp')) flag |= PatchFlags.TEXT
  for (const p of node.props) {
    if (!p.dynamic) continue
    if (p.name === 'class') flag |= PatchFlags.CLASS
    else if (p.name === 'style') flag |= PatchFlags.STYLE
    else { flag |= PatchFlags.PROPS; dynamicProps.push(p.name) }
  }
  node.patchFlag = flag
  node.dynamicProps = dynamicProps
}
`

const MINI_GEN_SOL = String.raw`function genNode(node) {
  if (node.type === 'text') return JSON.stringify(node.content)
  if (node.type === 'interp') return '_toDisplayString(_ctx.' + node.content + ')'
  const props = node.props.length
    ? '{ ' + node.props.map(p => JSON.stringify(p.name) + ': ' + (p.dynamic ? '_ctx.' + p.value : JSON.stringify(p.value))).join(', ') + ' }'
    : 'null'
  const kids = node.children.map(genNode)
  const onlyText = node.children.every(c => c.type !== 'element')
  const children = kids.length === 0 ? 'null' : onlyText ? kids.join(' + ') : '[' + kids.join(', ') + ']'
  const args = [JSON.stringify(node.tag), props, children]
  if (node.patchFlag) {
    args.push(node.patchFlag)
    if (node.dynamicProps.length) args.push(JSON.stringify(node.dynamicProps))
  }
  return '_createElementVNode(' + args.join(', ') + ')'
}
`

/** 判题用：从练习脚本的 setupState 里取函数 */
function miniState(T: any): any {
  const host: any = T.$(':scope > div')
  return host && host._vnode && host._vnode.component && host._vnode.component.setupState
}
function miniRef(extra: string): any {
  // eslint-disable-next-line no-new-func
  return new Function(MINI_FRONT + MINI_TRANSFORM_SOL + extra)()
}

const TRANSFORM_CASES: [string, [string, number, string[]][]][] = [
  ['<div id="a"><p :class="c">{{ msg }}</p></div>', [['div', 0, []], ['p', 3, []]]],
  ['<div :title="t" :id="i" class="k">hi</div>', [['div', 8, ['title', 'id']]]],
  ['<p :style="s" :class="c" :data-x="d">a{{ b }}</p>', [['p', 15, ['data-x']]]],
  ['<ul><li>1</li><li :class="c">2</li></ul>', [['ul', 0, []], ['li', 0, []], ['li', 2, []]]],
  ['<a href="x" class="y">go</a>', [['a', 0, []]]],
  ['<p>a{{ b }}c</p>', [['p', 1, []]]],
  ['<div><section><span :id="x">{{ a }}</span></section></div>', [['div', 0, []], ['section', 0, []], ['span', 9, ['id']]]]
]

export const miniTransform: Exercise = {
  title: '实现：给动态节点打 PatchFlag 的节点转换', ch: 25,
  task: '<p>下面是一个迷你编译器的前两步。<code>parse</code> 把模板变成 AST，<code>traverse</code> 对每个节点运行节点转换，两者已经写好。你来写节点转换 <code>transformElement</code>：给每个元素设置 <code>node.patchFlag</code> 和 <code>node.dynamicProps</code>。规则和第 25 章 25.2 节相同：</p><ol><li>子节点里有插值：TEXT。</li><li>动态的 <code>class</code>：CLASS。动态的 <code>style</code>：STYLE。</li><li>其他动态属性：PROPS，并把属性名按出现的顺序放进 <code>dynamicProps</code>。</li><li>静态属性（没有冒号的）不算。多个标记用按位或组合，没有任何标记时是 0。</li></ol><p>只改 <code>transformElement</code>。页面下方显示每个元素的结果。</p>',
  tpl: '<textarea v-model="src" rows="3" style="width: 100%" aria-label="模板"></textarea>\n<pre class="out">{{ result }}</pre>',
  js: MINI_FRONT + String.raw`
// ===== TODO：节点转换。给元素设置 node.patchFlag 和 node.dynamicProps =====
function transformElement(node) {
  if (node.type !== 'element') return
  // 现在什么都没做：patchFlag 保持 0
}

// ===== 已给出：运行转换，列出每个元素的结果 =====
function analyze(source) {
  const ast = parse(source)
  traverse(ast, [transformElement])
  const list = []
  ;(function walk(n) {
    if (n.type === 'element') list.push({ tag: n.tag, patchFlag: n.patchFlag, dynamicProps: n.dynamicProps })
    ;(n.children || []).forEach(walk)
  })(ast)
  return list
}
const src = ref('<div id="a"><p :class="c">{{ msg }}</p></div>')
const result = computed(() => analyze(src.value)
  .map(x => '<' + x.tag + '>  patchFlag=' + x.patchFlag + '  dynamicProps=' + JSON.stringify(x.dynamicProps)).join('\n'))

return { src, result, analyze }`,
  hints: [
    '这就是真实编译器里 transformElement 做的事（简化版）：看一个元素的属性和子节点，决定它的 PatchFlag。用一个变量 flag 从 0 开始，每发现一种动态内容就用按位或加一位：flag |= PatchFlags.TEXT。第 25 章 25.2 节讲了每个标记的含义。',
    '写三步。1. 子节点里有 interp：加 TEXT。2. 遍历 node.props，跳过 dynamic 为 false 的。3. 动态属性按名字分三类：class 加 CLASS，style 加 STYLE，其余加 PROPS 并且 push 到 dynamicProps。最后把 flag 和 dynamicProps 赋给 node。',
    'function transformElement(node) {\n  if (node.type !== \'element\') return\n  let flag = 0\n  const dynamicProps = []\n  if (node.children.some(c => c.type === \'interp\')) flag |= PatchFlags.TEXT\n  for (const p of node.props) {\n    if (!p.dynamic) continue\n    if (p.name === \'class\') flag |= PatchFlags.CLASS\n    else if (p.name === \'style\') flag |= PatchFlags.STYLE\n    else { flag |= PatchFlags.PROPS; dynamicProps.push(p.name) }\n  }\n  node.patchFlag = flag\n  node.dynamicProps = dynamicProps\n}'
  ],
  async check(T) {
    const S = miniState(T)
    if (!S || typeof S.analyze !== 'function') { T.ok(false, '脚本需要 return 的对象里有 analyze 函数（不要删掉已给出的部分）'); return }
    const fmt = (l: any[]) => l.map(x => '<' + x.tag + '> ' + x.patchFlag + ' ' + JSON.stringify(x.dynamicProps)).join('；')
    for (const [src, expected] of TRANSFORM_CASES) {
      let got: any[] = []
      try { got = S.analyze(src) } catch (e: any) { T.ok(false, src + ' 运行出错：' + e.message); continue }
      const want = expected.map(([tag, patchFlag, dynamicProps]) => ({ tag, patchFlag, dynamicProps }))
      const same = got.length === want.length && got.every((g, i) => g.tag === want[i].tag && g.patchFlag === want[i].patchFlag && JSON.stringify(g.dynamicProps) === JSON.stringify(want[i].dynamicProps))
      T.ok(same, src + '：期望 ' + fmt(want) + '；实际 ' + fmt(got))
    }
  },
  wrong: []
}

miniTransform.solJs = sub(miniTransform.js, `function transformElement(node) {
  if (node.type !== 'element') return
  // 现在什么都没做：patchFlag 保持 0
}`, MINI_TRANSFORM_SOL.trim())

miniTransform.wrong = [
  { js: sub(sub(sub(miniTransform.solJs, 'flag |= PatchFlags.TEXT', 'flag = PatchFlags.TEXT'), 'flag |= PatchFlags.CLASS', 'flag = PatchFlags.CLASS'), 'flag |= PatchFlags.STYLE', 'flag = PatchFlags.STYLE'),
    why: '用赋值代替按位或。一个元素同时有文字和 class 时，后写的标记把前面的覆盖了，PatchFlag 只剩一位。多个标记要用按位或组合。', expectFail: /:class="c"/ },
  { js: sub(miniTransform.solJs, "    if (!p.dynamic) continue\n", ''),
    why: '没有区分静态属性和动态属性。class="k" 这样的静态属性不会变，不需要标记。每多标一个，更新时就多比较一次。', expectFail: /class="k"/ },
  { js: sub(miniTransform.solJs, "if (p.name === 'class') flag |= PatchFlags.CLASS", "if (p.name === 'class') { flag |= PatchFlags.CLASS; dynamicProps.push(p.name) }"),
    why: 'class 有自己的标记 CLASS，不属于 PROPS，也不进 dynamicProps。dynamicProps 只列出 PROPS 要比较的属性。', expectFail: /:class="c"/ },
  { js: sub(miniTransform.solJs, "node.children.some(c => c.type === 'interp')", "node.children[0] && node.children[0].type === 'interp'"),
    why: '只看了第一个子节点。a{{ b }}c 的第一个子节点是文字，但这个元素的文字仍然是动态的。要检查所有子节点。', expectFail: /a\{\{ b \}\}c/ }
]

miniTransform.faded = {
  js: sub(sub(sub(miniTransform.solJs,
    "if (node.children.some(c => c.type === 'interp')) flag |= PatchFlags.TEXT", "if (/* ✏️ 子节点里有没有插值 */ false) flag |= PatchFlags.TEXT"),
    "    if (!p.dynamic) continue\n", "    /* ✏️ 静态属性不会变，跳过它 */\n"),
    "    else { flag |= PatchFlags.PROPS; dynamicProps.push(p.name) }", "    else { /* ✏️ 其他动态属性：加 PROPS 标记，并把属性名放进 dynamicProps */ }")
}

const GEN_CTX = { c: 'on', msg: 'hello', t: 'T', i: 'I', s: 'color:red', d: 'D', n: 42 }
const GEN_CASES = [
  '<div id="a"><p :class="c">{{ msg }}</p></div>',
  '<div :title="t" :id="i" class="k">hi</div>',
  '<p :style="s" :class="c" :data-x="d">a{{ msg }}</p>',
  '<ul><li>1</li><li :class="c">2</li></ul>',
  '<a href="x">say "hi"</a>',
  '<p></p>',
  '<b>{{ n }}</b>'
]

export const miniGenerate: Exercise = {
  title: '实现：只支持元素和插值的迷你代码生成', ch: 25,
  task: '<p>迷你编译器的最后一步。<code>parse</code>、<code>traverse</code> 和上一道练习的 <code>transformElement</code> 都已给出，每个元素已经有 <code>patchFlag</code> 和 <code>dynamicProps</code>。你来写 <code>genNode(node)</code>：返回这个节点的 JavaScript 代码（字符串）。</p><ol><li>文字：字符串字面量。</li><li>插值：<code>_toDisplayString(_ctx.表达式)</code>。</li><li>元素：<code>_createElementVNode(标签, props, children[, patchFlag[, dynamicProps]])</code>。props 没有时写 <code>null</code>，有时写对象；动态属性的值是 <code>_ctx.表达式</code>，静态属性的值是字符串。</li><li>children 没有时写 <code>null</code>；全是文字和插值时用 <code>+</code> 连成一个表达式；有子元素时写数组。</li><li>patchFlag 为 0 时不写第 4 个参数；否则写它，并在 dynamicProps 非空时写第 5 个参数（字符串数组）。</li></ol><p>只改 <code>genNode</code>。页面下方显示生成的代码和运行它得到的虚拟节点。</p>',
  tpl: '<textarea v-model="src" rows="3" style="width: 100%" aria-label="模板"></textarea>\n<pre class="out">{{ code }}</pre>\n<pre class="out">{{ vnodeText }}</pre>',
  js: MINI_FRONT + '\n// ===== 已给出：上一道练习的节点转换 =====\n' + MINI_TRANSFORM_SOL + String.raw`
// ===== TODO：代码生成。返回一个节点的 JavaScript 代码（字符串）=====
function genNode(node) {
  // 文字：JSON.stringify(node.content)
  // 插值：'_toDisplayString(_ctx.' + node.content + ')'
  // 元素：'_createElementVNode(' + 参数列表 + ')'，规则见题目
  return 'null'
}

// ===== 已给出：生成代码，并用假的 createElementVNode 运行它 =====
function generate(source) {
  const ast = parse(source)
  traverse(ast, [transformElement])
  return 'return ' + genNode(ast.children[0])
}
const fakeCreate = (tag, props, children, patchFlag, dynamicProps) => ({ tag, props, children, patchFlag: patchFlag || 0, dynamicProps: dynamicProps || null })
const toStr = v => (v == null ? '' : String(v))
function render(source, ctx) {
  return new Function('_ctx', '_createElementVNode', '_toDisplayString', generate(source))(ctx, fakeCreate, toStr)
}

const ctx = { c: 'on', msg: 'hello', t: 'T', i: 'I', s: 'color:red', d: 'D', n: 42 }
const src = ref('<div id="a"><p :class="c">{{ msg }}</p></div>')
const code = computed(() => generate(src.value))
const vnodeText = computed(() => {
  try { return JSON.stringify(render(src.value, ctx), null, 1) } catch (e) { return '运行出错：' + e.message }
})

return { src, code, vnodeText, render }`,
  hints: [
    '真实的 generate 也是递归地打印节点。每个节点返回一小段字符串，父节点把子节点的字符串拼进自己的参数里。先写文字和插值（各一行），再写元素。',
    '元素分四步拼参数。1. props：没有属性是 null；有属性时把每个属性写成 键: 值，动态的值前面加 _ctx.。2. children：先 node.children.map(genNode)，再按「没有 / 全是文字 / 有子元素」三种情况连接。3. 放进 args 数组：标签、props、children。4. patchFlag 不为 0 再追加它，dynamicProps 非空再追加 JSON.stringify(...)。最后用 join(\', \') 拼成调用。注意用 JSON.stringify 写字符串，文字里的引号才会被转义。',
    MINI_GEN_SOL.trim()
  ],
  async check(T) {
    const S = miniState(T)
    if (!S || typeof S.render !== 'function') { T.ok(false, '脚本需要 return 的对象里有 render 函数（不要删掉已给出的部分）'); return }
    // 参考实现：同样的 parse 和 traverse、参考转换、参考 genNode
    const ref: any = miniRef(MINI_GEN_SOL + String.raw`
const fake = (tag, props, children, patchFlag, dynamicProps) => ({ tag, props, children, patchFlag: patchFlag || 0, dynamicProps: dynamicProps || null })
return function (source, ctx) {
  const ast = parse(source)
  traverse(ast, [transformElement])
  return new Function('_ctx', '_createElementVNode', '_toDisplayString', 'return ' + genNode(ast.children[0]))(ctx, fake, v => (v == null ? '' : String(v)))
}`)
    for (const src of GEN_CASES) {
      const want = ref(src, GEN_CTX)
      let got: any
      try { got = S.render(src, { ...GEN_CTX }) } catch (e: any) { T.ok(false, src + '：运行生成的代码出错：' + e.message); continue }
      T.ok(JSON.stringify(got) === JSON.stringify(want), src + '：期望 ' + JSON.stringify(want) + '；实际 ' + JSON.stringify(got))
    }
  },
  wrong: []
}

miniGenerate.solJs = sub(miniGenerate.js, `function genNode(node) {
  // 文字：JSON.stringify(node.content)
  // 插值：'_toDisplayString(_ctx.' + node.content + ')'
  // 元素：'_createElementVNode(' + 参数列表 + ')'，规则见题目
  return 'null'
}`, MINI_GEN_SOL.trim())

miniGenerate.wrong = [
  { js: sub(miniGenerate.solJs, "return JSON.stringify(node.content)", "return '\"' + node.content + '\"'"),
    why: '自己拼引号，没有转义。文字里有引号（say "hi"）时，生成的代码语法错误。用 JSON.stringify 生成字符串字面量。', expectFail: /say/ },
  { js: sub(miniGenerate.solJs, "(p.dynamic ? '_ctx.' + p.value : JSON.stringify(p.value))", "(p.dynamic ? p.value : JSON.stringify(p.value))"),
    why: '动态属性的值少了 _ctx. 前缀。生成的代码里 c 是一个未定义的变量。真实编译器的 transformExpression 做的就是这件事。', expectFail: /运行生成的代码出错/ },
  { js: sub(miniGenerate.solJs, "onlyText ? kids.join(' + ') : '[' + kids.join(', ') + ']'", "'[' + kids.join(', ') + ']'"),
    why: '子节点总是写成数组。只有文字和插值时，children 应该是一个字符串表达式；数组会让 children 变成数组，更新时就按列表比较。', expectFail: /期望/ },
  { js: sub(miniGenerate.solJs, "const kids = node.children.map(genNode)", "const kids = node.children.map(c => JSON.stringify(c.content))"),
    why: '没有递归。子元素没有 content，生成的是 undefined。每个节点都要交给 genNode，它才能处理嵌套。', expectFail: /期望/ },
  { js: sub(miniGenerate.solJs, "args.push(JSON.stringify(node.dynamicProps))", "args.push(node.dynamicProps)"),
    why: '数组直接拼进字符串，得到 title,id 这样的标识符，而不是 ["title","id"]。生成代码时，字符串和数组都要用 JSON.stringify。', expectFail: /运行生成的代码出错/ }
]

miniGenerate.faded = {
  js: sub(sub(sub(miniGenerate.solJs,
    "(p.dynamic ? '_ctx.' + p.value : JSON.stringify(p.value))", "/* ✏️ 动态属性的值取自 _ctx，静态属性的值是字符串字面量 */ JSON.stringify(p.value)"),
    "onlyText ? kids.join(' + ') : '[' + kids.join(', ') + ']'", "/* ✏️ 只有文字和插值时用 + 连接，有子元素时写成数组 */ '[' + kids.join(', ') + ']'"),
    "    if (node.dynamicProps.length) args.push(JSON.stringify(node.dynamicProps))\n", "    /* ✏️ dynamicProps 非空时，把它作为第 5 个参数加进去 */\n")
}
