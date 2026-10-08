import type { Exercise } from './types'
import { sub } from './types'
import { answer, build, domSource, fold, PARTS } from '../mini'

// 判题辅助：从练习脚本的 setupState 里取函数（脚本要把函数放进 return 的对象）
function diffState(T: any): any {
  const host: any = T.$(':scope > div')
  return host && host._vnode && host._vnode.component && host._vnode.component.setupState
}
const words = (s: string) => s.split(' ').filter(Boolean)

// =====================================================================
// 三道实现题共用的拼装。迷你 Vue 的零件 5b（元素与子节点 diff）放在前面各章的零件后面，
// 学习者只写其中一个区域；记录宿主操作的 run 是已给出的演示代码（零件见 course/mini/README.md）。
// =====================================================================

// 第 24–28 章你写过的零件加上宿主操作（零件 1–4、5a），整体折叠
const EARLIER = fold('第 24–28 章你写过的零件，和本章给出的宿主操作', domSource('host'))

// 把零件 5b 按一个区域切成三段：区域之前、区域本身（带标记）、区域之后
function around(code: string, name: string): [string, string, string] {
  const lines = code.split('\n')
  const s = lines.findIndex(l => l.trim() === '//#region ' + name)
  let depth = 0
  let e = -1
  for (let i = s; i < lines.length; i++) {
    if (/^\s*\/\/#region\b/.test(lines[i])) depth++
    else if (/^\s*\/\/#endregion\b/.test(lines[i]) && --depth === 0) { e = i; break }
  }
  return [lines.slice(0, s).join('\n'), lines.slice(s, e + 1).join('\n'), lines.slice(e + 1).join('\n')]
}

// 已给出的演示代码，上半：记录渲染器对页面做了什么，并提供 run(旧列表, 新列表, 有没有 key)
const RUN_CORE = `

// ===== 已给出：记录渲染器对页面做了什么 =====
const ops = []
const label = node => (node && node.getAttribute ? node.getAttribute('data-k') : '末尾')
const rawPatch = patch, rawInsert = hostInsert, rawRemove = hostRemove, rawUnknown = patchUnknownSequence
patch = function (n1, n2, ...rest) {
  if (n1 && n2 && n2.type === 'li') {
    const was = label(n1.el), now = n2.props['data-k']
    ops.push('更新 ' + (was === now ? was : was + ' → ' + now))
  }
  return rawPatch(n1, n2, ...rest)
}
hostInsert = function (child, parent, anchor) {
  ops.push((child.parentNode ? '移动 ' : '挂载 ') + label(child) + (anchor ? ' 到 ' + label(anchor) + ' 之前' : ' 到末尾'))
  rawInsert(child, parent, anchor)
}
hostRemove = function (child) { ops.push('卸载 ' + label(child)); rawRemove(child) }
patchUnknownSequence = function (c1, c2, s, e1, e2, ...rest) {
  const keys = list => list.map(v => v.props['data-k']).join(' ')
  ops.push('进入乱序区：旧 ' + keys(c1.slice(s, e1 + 1)) + '，新 ' + keys(c2.slice(s, e2 + 1)))
  return rawUnknown(c1, c2, s, e1, e2, ...rest)
}

// 每项是一个 li，文字和 data-k 都是 key；keyed 为 false 时不写 key
function listOf(keys, keyed) {
  return h('ul', null, keys.map(k => h('li', keyed ? { key: k, 'data-k': k } : { 'data-k': k }, k)))
}
// 先挂上旧列表（不记录），再更新成新列表（记录），返回操作记录和结果
function run(oldKeys, newKeys, keyed = true) {
  const box = document.createElement('div')
  const v1 = listOf(oldKeys, keyed)
  patch(null, v1, box)
  const before = [...box.firstChild.children]
  ops.length = 0
  patch(v1, listOf(newKeys, keyed), box)
  const after = [...box.firstChild.children]
  return {
    ops: ops.slice(),
    order: after.map(li => li.getAttribute('data-k')).join(' '),
    text: after.map(li => li.textContent).join(' '),
    kept: after.filter(li => before.includes(li)).map(li => li.getAttribute('data-k')).join(' ')
  }
}
`
// 下半：页面。用 Vue.ref、Vue.computed：迷你版的 ref 不会驱动页面
const demoUi = (oldText: string, newText: string, keyed: boolean) => `
// ===== 已给出：页面 =====
const oldText = Vue.ref('${oldText}')
const newText = Vue.ref('${newText}')
const split = s => s.split(' ').filter(Boolean)
const log = Vue.computed(() => {
  const r = run(split(oldText.value), split(newText.value), ${keyed})
  return (r.ops.join('\\n') || '（没有操作）') + '\\n结果：' + (r.order || '空') + '\\n沿用了原来的 DOM 节点：' + (r.kept || '无')
})

return { oldText, newText, log, run }`
const TPL_LISTS = '<label>旧列表 <input v-model="oldText" aria-label="旧列表"></label>\n<label>新列表 <input v-model="newText" aria-label="新列表"></label>\n<pre class="out">{{ log }}</pre>'

// 起始代码、答案都是：折叠的前面各章零件 + 折叠的本章其余代码 + 要写的区域 + 演示代码
function assemble(region: string, blanks: Record<string, string> | null, ui: string): string {
  const [before, mid, after] = around(PARTS.element, region)
  const middle = blanks ? build(mid, blanks) : answer(mid)
  return EARLIER + '\n' + fold('本章已给出的代码（' + region + ' 之前）', answer(before)) + '\n' + middle + '\n' +
    fold('本章已给出的代码（' + region + ' 之后）', answer(after)) + RUN_CORE + ui
}

// 判题用的参考实现：把参考答案的完整脚本放进一个函数里运行，拿它的 run 当标准
let refRun: ((a: string[], b: string[], keyed: boolean) => any) | null = null
function reference() {
  if (!refRun) {
    const src = domSource('host') + '\n' + answer(PARTS.element) + RUN_CORE + '\nreturn { run }'
    refRun = new Function('document', src)(document).run
  }
  return refRun!
}
const show = (r: any) => '[' + r.ops.join('；') + ']，结果 ' + (r.order || '空')
// loose 为真时：不要求操作的先后顺序，只要求「挂载、移动、卸载」的集合和结果一致，「更新」的集合也一致
function judge(T: any, S: any, keyed: boolean, cases: [string, string, string][], loose = false) {
  if (!S || typeof S.run !== 'function') { T.ok(false, '脚本里 return 的对象要有 run 函数（已给出，不要删）'); return }
  const ref = reference()
  const pick = (r: any, f: (x: string) => boolean) => r.ops.filter(f).sort()
  const isUpdate = (x: string) => x.startsWith('更新')
  for (const [o, n, label] of cases) {
    const c1 = words(o), c2 = words(n)
    const want = ref(c1, c2, keyed)
    let got: any
    try { got = S.run([...c1], [...c2], keyed) } catch (e: any) { T.ok(false, label + '（' + (o || '空') + ' → ' + (n || '空') + '）运行出错：' + e.message); continue }
    const same = loose
      ? JSON.stringify(pick(got, x => !isUpdate(x) && !x.startsWith('进入'))) === JSON.stringify(pick(want, x => !isUpdate(x) && !x.startsWith('进入'))) &&
        JSON.stringify(pick(got, isUpdate)) === JSON.stringify(pick(want, isUpdate))
      : JSON.stringify(got.ops) === JSON.stringify(want.ops)
    T.ok(same && got.order === want.order && got.text === want.text && got.kept === want.kept,
      label + '：' + (o || '空') + ' → ' + (n || '空') + '，期望 ' + show(want) + '；实际 ' + show(got))
  }
}

// =====================================================================
// 练习一：无 key 的子节点更新（30.3）
// =====================================================================
const UNKEYED_BLANK = {
  patchUnkeyedChildren: `function patchUnkeyedChildren(c1, c2, container, anchor, parentComponent) {
  // TODO：按下标 patch 公共部分，再卸载多出的旧节点，或挂载多出的新节点
}`
}
const UNKEYED_UI = demoUi('a b c', 'x a b c', false)
const UNKEYED_SOL = assemble('patchUnkeyedChildren', null, UNKEYED_UI)

export const patchUnkeyed: Exercise = {
  title: '实现：没有 key 时的子节点更新（patchUnkeyedChildren）', ch: 30,
  task: '<p>这是迷你 Vue 的渲染器（前面各章写好的零件已折叠）。子节点都没有 key 时，<code>patchChildren</code> 调用 <code>patchUnkeyedChildren(c1, c2, container, anchor, parentComponent)</code>。<code>c1</code>、<code>c2</code> 是新旧子节点的 vnode 数组。你来写它。可以用的函数：<code>patch(n1, n2, container, anchor, parentComponent)</code>（<code>n1</code> 是 <code>null</code> 就是挂载）、<code>mountChildren(children, container, anchor, parentComponent)</code>、<code>unmountChildren(children, doRemove, start)</code>（从下标 <code>start</code> 起卸载，<code>doRemove</code> 传 <code>true</code>）。</p><ol><li>取两个数组长度的较小值。按下标逐个 <code>patch(c1[i], c2[i], container, null, parentComponent)</code>。不看内容，不移动。</li><li>旧数组更长：卸载多出的旧节点。</li><li>新数组更长：挂载多出的新节点。</li></ol><p>页面下方是渲染器做的每一步操作。试一试在头部插入一项：为什么每一行都在「更新」？</p>',
  tpl: TPL_LISTS,
  js: assemble('patchUnkeyedChildren', UNKEYED_BLANK, UNKEYED_UI),
  solJs: UNKEYED_SOL,
  hints: [
    '没有 key 时 Vue 不去找「哪个旧节点对应哪个新节点」，只按位置配对：第 i 个旧节点配第 i 个新节点。配不上的只有两种：旧的多出来（卸载），新的多出来（挂载）。第 30 章 30.3 节讲了它。',
    '先 const common = Math.min(c1.length, c2.length)。一个 for 循环从 0 到 common，每一轮调用 patch(c1[i], c2[i], container, null, parentComponent)。然后比较两个长度：旧的更长就 unmountChildren(c1, true, common)，否则 mountChildren(c2.slice(common), container, anchor, parentComponent)。注意多出的部分从 common 开始，不是从 0 开始。',
    answer(around(PARTS.element, 'patchUnkeyedChildren')[1])
  ],
  async check(T) {
    judge(T, diffState(T), false, [
      ['a b c', 'x a b c', '在头部插入一项：每个位置都更新，最后挂载一个'],
      ['a b c d', 'a b', '新列表更短：卸载多出的旧节点'],
      ['', 'a b', '旧列表是空的：全部挂载'],
      ['a b', '', '新列表是空的：全部卸载'],
      ['a b c', 'c b a', '长度相同：每个位置更新一次，不移动'],
      ['a b c d e', 'b c d e', '删除头部一项：前面都更新，最后卸载一个']
    ])
  },
  wrong: [
    { js: sub(UNKEYED_SOL, 'patch(c1[i], c2[i], container, null, parentComponent)', '{ unmount(c1[i], true); patch(null, c2[i], container, null, parentComponent) }'),
      why: '每个位置都卸载再挂载。没有 key 时 Vue 不卸载：同一个位置上的节点被复用，只把内容改成新的。卸载再挂载是 type 或 key 不同时才发生的事。', expectFail: /在头部插入一项/ },
    { js: sub(UNKEYED_SOL, 'if (c1.length > c2.length) unmountChildren(c1, true, common)', 'if (c1.length > c2.length) { /* 忘了卸载 */ }'),
      why: '新列表更短时，多出的旧节点没有卸载。它们的 DOM 会一直留在页面上。', expectFail: /新列表更短/ },
    { js: sub(UNKEYED_SOL, 'mountChildren(c2.slice(common)', 'mountChildren(c2'),
      why: '挂载从 0 开始。前面 common 个位置已经更新过了，不该再挂载一次，否则这些节点在页面上出现两份。', expectFail: /头部插入|旧列表是空/ },
    { js: sub(UNKEYED_SOL, 'unmountChildren(c1, true, common)', 'unmountChildren(c1, true, 0)'),
      why: '卸载从 0 开始，把刚更新过的节点也卸载了。只该卸载多出来的那部分，从 common 开始。', expectFail: /新列表更短|新列表是空/ }
  ],
  faded: {
    js: sub(sub(sub(UNKEYED_SOL,
      'const common = Math.min(c1.length, c2.length)', 'const common = /* ✏️ 两个数组长度的较小值 */ 0'),
      'for (let i = 0; i < common; i++) patch(c1[i], c2[i], container, null, parentComponent)', '/* ✏️ 按下标逐个 patch 公共部分的节点 */'),
      'else mountChildren(c2.slice(common), container, anchor, parentComponent)', 'else /* ✏️ 新数组更长：从 common 起挂载多出的部分 */ null')
  }
}

// =====================================================================
// 练习二：keyed diff 的头尾同步和新增、删除（30.4 的第 1 到 4 步）
// =====================================================================
const SYNC_BLANK = {
  syncEnds: `// TODO 1：从头同步。i 从 0 开始，两个节点是同一个节点（isSameVNodeType）就 patch，并让 i 加 1，遇到不同就停
// TODO 2：从尾同步。e1、e2 从末尾开始，规则相同，patch 之后 e1、e2 一起减 1`,
  mountOrUnmountRest: `// TODO 3：旧的比完了（i > e1）：挂载 c2[i..e2]，锚点是 c2[e2 + 1] 的 el，没有后继时用 parentAnchor
// TODO 4：新的比完了（i > e2）：卸载 c1[i..e1]`
}
const SYNC_UI = demoUi('a b c d e f g', 'a b e c d h f g', true)
const SYNC_SOL = assemble('patchKeyedChildren', null, SYNC_UI)

export const syncEnds: Exercise = {
  title: '实现：keyed diff 的头尾同步和新增、删除', ch: 30,
  task: '<p>在迷你 Vue 的 <code>patchKeyedChildren</code> 里补上前四步。变量 <code>i</code>、<code>e1</code>、<code>e2</code> 已经声明好：<code>i</code> 是头部指针，<code>e1</code>、<code>e2</code> 是旧、新数组的尾部指针。可以用 <code>isSameVNodeType(a, b)</code>、<code>patch(n1, n2, container, anchor, parentComponent)</code>、<code>unmount(vnode, true)</code>。</p><ol><li>头部同步：从头开始，是同一个节点就 <code>patch(c1[i], c2[i], container, null, parentComponent)</code> 并让 <code>i</code> 加 1，遇到不同就停。</li><li>尾部同步：从尾开始，规则相同，<code>e1</code> 和 <code>e2</code> 一起减 1。</li><li>旧的比完了（<code>i &gt; e1</code>）：挂载 <code>c2[i..e2]</code>，用 <code>patch(null, 新节点, container, anchor, parentComponent)</code>。锚点是 <code>c2[e2 + 1].el</code>，没有后继时用 <code>parentAnchor</code>。</li><li>新的比完了（<code>i &gt; e2</code>）：卸载 <code>c1[i..e1]</code>。</li></ol><p>中间乱序的部分不用你处理，后面已经有 <code>patchUnknownSequence</code>。页面下方会写出「进入乱序区」：头尾同步做对了，常见的追加、插入、删除不会进入乱序区。</p>',
  tpl: TPL_LISTS,
  js: assemble('patchKeyedChildren', SYNC_BLANK, SYNC_UI),
  solJs: SYNC_SOL,
  hints: [
    '头部和尾部的循环写法相同，只是方向相反。条件里都要有 i <= e1 && i <= e2，防止越界；再加上 isSameVNodeType。是同一个节点就 patch 并移动指针，不同就停止循环。30.4 节的五个步骤和 HeadTailSync 示意图讲了它。',
    '第 1 步：while (i <= e1 && i <= e2 && isSameVNodeType(c1[i], c2[i])) { patch(c1[i], c2[i], container, null, parentComponent); i++ }。第 2 步：条件换成 c1[e1] 和 c2[e2]，patch 之后 e1-- 和 e2--。两步之后，如果 i > e1，旧的比完了，把 c2[i] 到 c2[e2] 挂载；否则如果 i > e2，把 c1[i] 到 c1[e1] 卸载。',
    ['syncEnds', 'mountOrUnmountRest'].map(n => answer(around(PARTS.element, n)[1])).join('\n')
  ],
  async check(T) {
    judge(T, diffState(T), true, [
      ['a b c', 'a b c d', '尾部追加'],
      ['a b', 'x a b', '头部插入（只有尾部同步能匹配）'],
      ['a b c', 'a c', '删除中间一项'],
      ['a b d', 'a b c d', '在中间插入一项'],
      ['a b c d', 'a d', '删除中间两项'],
      ['b c d', 'a b c d e', '头尾都有新增'],
      ['a b c d e f g', 'a b e c d h f g', '中间乱序：头尾同步后进入乱序区'],
      ['a b', 'c d', '一个都对不上'],
      ['a b c', 'a b c', '完全相同']
    ])
  },
  wrong: [
    { js: sub(SYNC_SOL, 'i <= e2 && isSameVNodeType(c1[e1], c2[e2])', 'i <= e2 && false'),
      why: '只做了头部同步，没有尾部同步。头部插入一项时，头部一个都对不上，剩下的节点全部落入乱序区。尾部同步让常见的头部插入、删除也在前四步完成。', expectFail: /头部插入/ },
    { js: sub(SYNC_SOL, 'const anchor = e2 + 1 < l2 ? c2[e2 + 1].el : parentAnchor', 'const anchor = parentAnchor'),
      why: '挂载时没有用后一个新节点当锚点，新节点总是被追加到末尾。在中间插入时，节点会出现在错误的位置。锚点是 c2[e2 + 1].el：它后面那个新节点，已经在正确的位置上。', expectFail: /在中间插入一项|头尾都有新增/ },
    { js: sub(SYNC_SOL, 'while (i <= e1) unmount(c1[i++], true)', 'while (i <= e2) unmount(c1[i++], true)'),
      why: '卸载的范围写成了 i 到 e2。第 4 步里 e2 < i，循环一次也不执行，旧节点没有被卸载。要卸载的是旧数组剩下的 c1[i..e1]。', expectFail: /删除中间/ },
    { js: sub(SYNC_SOL, 'e1--\n    e2--', 'e1--'),
      why: '尾部同步时只移动了旧数组的指针。e1 和 e2 要一起向前，否则它们不再对齐，后面的挂载和卸载范围都会错。', expectFail: /期望/ }
  ],
  faded: {
    js: sub(sub(sub(sub(SYNC_SOL,
      'while (i <= e1 && i <= e2 && isSameVNodeType(c1[i], c2[i])) {', 'while (/* ✏️ 没有越界，并且头部的两个节点是同一个节点 */ false) {'),
      'while (i <= e1 && i <= e2 && isSameVNodeType(c1[e1], c2[e2])) {', 'while (/* ✏️ 没有越界，并且尾部的两个节点是同一个节点 */ false) {'),
      'const anchor = e2 + 1 < l2 ? c2[e2 + 1].el : parentAnchor', 'const anchor = /* ✏️ 锚点：新数组里 e2 后面那个节点的 el，没有时用 parentAnchor */ null'),
      '} else if (i > e2) {', '} else if (/* ✏️ 新的比完了 */ false) {')
  }
}

// =====================================================================
// 练习三：乱序区用最长递增子序列算出移动（30.4 的第 5 步）
// =====================================================================
const PLAN_BLANK = {
  patchUnknownSequence: `// 头尾同步完以后，中间 c1[s..e1] 和 c2[s..e2] 乱序的部分。所有节点都有 key；getSequence 已经给出
function patchUnknownSequence(c1, c2, s, e1, e2, container, parentAnchor, parentComponent) {
  const l2 = c2.length
  // TODO 1：建立 key → 新下标 的映射，范围是 c2[s..e2]
  // TODO 2：遍历旧节点 c1[s..e1]。新列表里没有的卸载；有的 patch，并记下 newIndexToOldIndex[新下标 - s] = 旧下标 + 1；
  //         同时检测是否乱序（新下标比前面见过的最大值小）
  // TODO 3：只有乱序时才调用 getSequence(newIndexToOldIndex)，得到不用移动的位置
  // TODO 4：从后往前处理 c2[s..e2]。新节点挂载；乱序且不在最长递增子序列里的移动（move(vnode, container, anchor)）。
  //         锚点是后一个新节点的 el，最后一个用 parentAnchor
}`
}
const PLAN_UI = demoUi('c d e', 'e c d h', true)
const PLAN_SOL = assemble('patchUnknownSequence', null, PLAN_UI)

export const lisPlan: Exercise = {
  title: '实现：用最长递增子序列算出要移动的节点', ch: 30,
  task: '<p>在迷你 Vue 的 <code>patchUnknownSequence</code> 里实现第 5 步：头尾同步之后，中间乱序的部分怎样用最少的移动更新。所有节点都有 key。<code>getSequence(arr)</code> 已经给出（返回最长递增子序列的下标，<code>0</code> 表示新节点，被跳过）。可以用 <code>patch</code>、<code>unmount(vnode, true)</code>、<code>move(vnode, container, anchor)</code>。</p><ol><li>建立新节点 <code>c2[s..e2]</code> 的 key → 新下标 映射。</li><li>遍历旧节点 <code>c1[s..e1]</code>。新列表里没有的卸载。有的 patch，并填 <code>newIndexToOldIndex[新下标 - s] = 旧下标 + 1</code>（加 1，让 0 留给新节点）。同时检测乱序：新下标比前面见过的最大新下标小，就是乱序。</li><li>只有乱序时才调用 <code>getSequence</code>。</li><li>从后往前处理新节点：新节点（值为 0）用 <code>patch(null, 新节点, container, anchor, parentComponent)</code> 挂载；乱序且不在最长递增子序列里的用 <code>move</code>；其余不动。锚点是后一个新节点的 <code>el</code>，最后一个用 <code>parentAnchor</code>。</li></ol><p>页面下方记录了每一步操作。</p>',
  tpl: TPL_LISTS,
  js: assemble('patchUnknownSequence', PLAN_BLANK, PLAN_UI),
  solJs: PLAN_SOL,
  hints: [
    '这就是实验台「逐步运行 diff」里第 5 步做的事：先把每个新节点对应的旧位置记下来（newIndexToOldIndex），再倒着处理。倒着处理是因为锚点是后面那个新节点，它必须先处理完。30.4 节的 LongestIncreasingSubsequence 示意图用 [5, 3, 4, 0] 讲了这个数组。',
    '分四块写。1. new Map，key 对新下标。2. newIndexToOldIndex = new Array(toBePatched).fill(0)，toBePatched 是 e2 - s + 1；遍历 c1[s..e1]：查不到新下标就 unmount(prevChild, true)，查到就 newIndexToOldIndex[newIndex - s] = k + 1，patch，并用 maxNewIndexSoFar 判断 moved。3. const stable = moved ? getSequence(newIndexToOldIndex) : []。4. j = stable.length - 1，k 从 toBePatched - 1 倒着到 0：值为 0 的挂载；moved 时，如果 j < 0 或 k 不等于 stable[j]，就 move，否则 j--。',
    answer(around(PARTS.element, 'patchUnknownSequence')[1])
  ],
  async check(T) {
    judge(T, diffState(T), true, [
      ['c d e', 'e c d h', '30.4 节的例子：只移动 e，挂载 h'],
      ['a b c d e f g', 'a b e c d h f g', '带头尾同步的完整例子'],
      ['a b c', 'b c a', '把第一个移到最后：只移动 a'],
      ['a b c d', 'd c b a', '反转：移动 3 个'],
      ['a b c d', 'c x a', '同时有卸载、挂载和移动'],
      ['a b c', 'x y', '旧节点全部卸载，新节点全部挂载'],
      ['a b c d e', 'b d a e c', '随机顺序']
    ], true)
  },
  wrong: [
    { js: sub(PLAN_SOL, 'if (j < 0 || k !== stable[j]) move(nextChild, container, anchor)', 'if (true) move(nextChild, container, anchor)'),
      why: '没有利用最长递增子序列：乱序时把每个已有节点都移动一遍。LIS 里的节点相对顺序已经正确，不需要移动。这正是 LIS 要省下的操作。', expectFail: /把第一个移到最后|例子/ },
    { js: sub(PLAN_SOL, 'newIndexToOldIndex[newIndex - s] = k + 1', 'newIndexToOldIndex[newIndex - s] = k'),
      why: '忘了 +1。排在旧列表第一位的节点得到 0，被当成新节点，会被重新挂载。0 要留给「没有对应旧节点」。', expectFail: /期望/ },
    { js: sub(PLAN_SOL, 'for (let k = toBePatched - 1; k >= 0; k--) {', 'for (let k = 0; k < toBePatched; k++) {'),
      why: '从前往后处理。移动一个节点要插到它后面那个新节点的前面，所以后面的节点必须先处理完。顺序反了，后面的新节点还没挂载，它的 el 是空的，当锚点就等于追加到末尾。', expectFail: /期望/ },
    { js: sub(PLAN_SOL, 'if (newIndex === undefined) unmount(prevChild, true)', 'if (newIndex === undefined) { /* 忘了卸载 */ }'),
      why: '新列表里没有的旧节点要卸载。不卸载的话，它们的 DOM 会留在页面上。', expectFail: /同时有卸载|全部卸载/ }
  ],
  faded: {
    js: sub(sub(sub(sub(PLAN_SOL,
      'if (newIndex >= maxNewIndexSoFar) maxNewIndexSoFar = newIndex', 'if (/* ✏️ 新下标没有比前面见过的最大值小 */ false) maxNewIndexSoFar = newIndex'),
      'const stable = moved ? getSequence(newIndexToOldIndex) : []', 'const stable = /* ✏️ 只有乱序时才计算最长递增子序列 */ []'),
      'if (j < 0 || k !== stable[j]) move(nextChild, container, anchor)', 'if (/* ✏️ 不在最长递增子序列里 */ false) move(nextChild, container, anchor)'),
      'const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor', 'const anchor = /* ✏️ 锚点：后一个新节点的 el，最后一个用 parentAnchor */ null')
  }
}

// =====================================================================
// 保留的入门练习：改 key（检验 30.1 和 30.4 的基础目标）
// =====================================================================
export const diffKey: Exercise = {
  title: '修复：删除一行后，输入框的内容错位', ch: 30,
  task: '<ol><li>在 B 行的输入框中输入一些文字。</li><li>点击 A 行的“删除”。你的文字现在显示在 C 行。</li><li>只修改模板，让文字留在 B 行。</li></ol><p>输入框的值保存在 DOM 中，不在数据中。</p>',
  tpl: '<ul>\n  <li v-for="(it, index) in items" :key="index">\n    <span>{{ it.name }}</span>\n    <input placeholder="备注">\n    <button @click="remove(it.id)">删除</button>\n  </li>\n</ul>',
  js: `const items = ref([
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' }
])

function remove(id) {
  items.value = items.value.filter(it => it.id !== id)
}

return { items, remove }`,
  solTpl: '<ul>\n  <li v-for="it in items" :key="it.id">\n    <span>{{ it.name }}</span>\n    <input placeholder="备注">\n    <button @click="remove(it.id)">删除</button>\n  </li>\n</ul>',
  hints: [
    '原因：Vue 用每一行的标识判断新旧列表中哪一行是同一行。现在的标识是行的位置。删除 A 后，B 的位置变为 0，所以 Vue 把原来 A 的那一行（和它的输入框）给了 B。标识要跟着数据走，而不是跟着位置。第 30 章最后的“注意”讲了它。',
    '只改 <li> 上的 :key。把 index 换为每一项数据自己的、不会改变的字段。',
    '<li v-for="it in items" :key="it.id">'
  ],
  async check(T) {
    const row = name => T.$$('li').find(li => ((li.querySelector('span') || {}).textContent || '').trim() === name);
    T.ok(T.$$('li').length === 3, '渲染出 3 行（当前 ' + T.$$('li').length + ' 行）');
    const b = row('B'), a = row('A');
    if (!a || !b || !b.querySelector('input') || !a.querySelector('button')) { T.ok(false, '找到 A 行的“删除”按钮和 B 行的输入框'); return; }
    b.querySelector('input').value = 'bbb';
    await T.click(a.querySelector('button'));
    T.ok(T.$$('li').length === 2 && !row('A'), '删除 A 后剩下 2 行：B 和 C');
    const bi = row('B') && row('B').querySelector('input'), ci = row('C') && row('C').querySelector('input');
    T.ok(!!bi && bi.value === 'bbb', 'B 行的输入框仍是“bbb”（当前：“' + (bi ? bi.value : '') + '”）');
    T.ok(!!ci && ci.value === '', 'C 行的输入框是空的（当前：“' + (ci ? ci.value : '') + '”）');
  }
}


diffKey.wrong = [
  { tpl: sub(diffKey.solTpl, ':key="it.id"', ':key="Math.random()"'), why: '每次渲染都生成新的 key。Vue 认为每一行都是新节点，全部卸载再挂载，B 行的输入框也被清空。key 要稳定，并且跟着数据走。' },
  { tpl: sub(diffKey.solTpl, '<li v-for="it in items" :key="it.id">', '<li v-for="(it, index) in items" :key="it.id + \'-\' + index">'), why: 'key 里混入了下标。删除 A 后，B 的下标变了，key 也变了，Vue 认为 B 是新节点，输入框被清空。' }
]


diffKey.faded = {
  tpl: sub(diffKey.solTpl, '  <li v-for="it in items" :key="it.id">',
    '  <!-- ✏️ 这个 li 的 key 要跟着数据走，而不是跟着位置 -->\n  <li v-for="it in items">')
}

