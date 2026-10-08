import type { Exercise } from './types'
import { sub } from './types'
import { nextTick } from 'vue'

export const flagBitFill: Exercise = {
  title: '补全：用按位与检查 PatchFlag', ch: 15,
  task: '<p>这是第 15 章深入部分 patchElement 的迷你版。CLASS 的检查已经写好：<code>flag &amp; PatchFlags.CLASS</code>。只补全两个 TODO 条件。</p><ol><li>TODO 1：检查 STYLE 这一位。</li><li>TODO 2：检查 TEXT 这一位。</li><li>确认 PatchFlag 1 只更新文字，4 只更新 style，7 = TEXT | CLASS | STYLE 三者都更新。</li></ol>',
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
    '多个 PatchFlag 用按位或组合，例如 7 = 1 | 2 | 4。运行时用按位与检查某一位。结果不是 0，说明这一位存在。第 15 章 PatchFlag 表格下面的说明讲了它。',
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
  title: '修复：标记为 3 时，文字和 class 都不更新', ch: 15,
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
    '原因：标记 3 是 1 和 2 两个标记组合在一起的结果。代码用 === 比较，3 既不等于 1，也不等于 2，所以两个 if 都不成立。要检查“3 中是否包含某一位”，而不是比较整个数。第 15 章 PatchFlag 表格下面的说明讲了它。',
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
