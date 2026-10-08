import type { Exercise } from './types'
import { sub } from './types'
import { getSequence } from '../labs/16-diff/simulate'

// 判题辅助：从练习脚本的 setupState 里取函数（脚本要把函数放进 return 的对象）
function diffState(T: any): any {
  const host: any = T.$(':scope > div')
  return host && host._vnode && host._vnode.component && host._vnode.component.setupState
}
const words = (s: string) => s.split(' ').filter(Boolean)

// =====================================================================
// 练习一：无 key 的子节点更新（16.4）
// =====================================================================
const UNKEYED_SOL = `function patchUnkeyedChildren(c1, c2, h) {
  const commonLength = Math.min(c1.length, c2.length)
  for (let i = 0; i < commonLength; i++) {
    h.patch(c1[i], c2[i], i)              // 按下标比较，不看内容
  }
  if (c1.length > c2.length) {
    for (let i = commonLength; i < c1.length; i++) h.unmount(c1[i], i)
  } else {
    for (let i = commonLength; i < c2.length; i++) h.mount(c2[i], i)
  }
}`

export const patchUnkeyed: Exercise = {
  title: '实现：没有 key 时的子节点更新（patchUnkeyedChildren）', ch: 16,
  task: '<p>没有 key 的 <code>v-for</code> 用 <code>patchUnkeyedChildren</code> 更新。旧列表 <code>c1</code> 和新列表 <code>c2</code> 的元素是节点的文字。回调 <code>h.patch(旧, 新, 下标)</code>、<code>h.mount(新, 下标)</code>、<code>h.unmount(旧, 下标)</code> 代表对 DOM 的三种操作。你来写它的算法：</p><ol><li>取两个列表长度的较小值。按下标从小到大，对前面这些位置逐个调用 <code>h.patch</code>。不要看内容是否相同，不要移动节点。</li><li>旧列表更长：从较小长度那个下标开始，按从前到后的顺序卸载多出的旧节点。</li><li>新列表更长：从较小长度那个下标开始，按从前到后的顺序挂载多出的新节点。</li></ol><p>只改 <code>patchUnkeyedChildren</code>。页面下方显示操作记录。试一试在头部插入一项会发生什么。</p>',
  tpl: '<label>旧列表 <input v-model="oldText" aria-label="旧列表"></label>\n<label>新列表 <input v-model="newText" aria-label="新列表"></label>\n<pre class="out">{{ log }}</pre>',
  js: `// 节点用它的文字表示。h 是三个回调，已经接好记录
function patchUnkeyedChildren(c1, c2, h) {
  // TODO：按下标 patch 公共部分，再处理多出的旧节点或新节点
}

// ===== 已给出：运行并记录操作 =====
function run(c1, c2) {
  const ops = []
  patchUnkeyedChildren(c1, c2, {
    patch: (a, b, i) => ops.push('patch #' + i + '：' + a + ' → ' + b),
    mount: (b, i) => ops.push('mount #' + i + '：' + b),
    unmount: (a, i) => ops.push('unmount #' + i + '：' + a)
  })
  return ops
}
const oldText = ref('a b c')
const newText = ref('x a b c')
const words = s => s.split(' ').filter(Boolean)
const log = computed(() => run(words(oldText.value), words(newText.value)).join('\\n') || '（没有操作）')

return { oldText, newText, log, patchUnkeyedChildren }`,
  hints: [
    '没有 key 时 Vue 不去找“哪个旧节点对应哪个新节点”，它只按位置配对：第 i 个旧节点配第 i 个新节点。配不上的只有两种：旧的多出来（卸载），新的多出来（挂载）。第 16 章 16.4 节讲了它。',
    '先 const commonLength = Math.min(c1.length, c2.length)。第一个 for 循环从 0 到 commonLength，每一轮调用 h.patch(c1[i], c2[i], i)。然后比较两个长度：旧的更长就循环卸载 c1[commonLength..]，否则循环挂载 c2[commonLength..]。两种情况的循环都从 commonLength 开始，而不是从 0 开始。',
    UNKEYED_SOL
  ],
  async check(T) {
    const S = diffState(T)
    if (!S || typeof S.patchUnkeyedChildren !== 'function') { T.ok(false, '脚本需要 return 的对象里有 patchUnkeyedChildren 函数'); return }
    const refOps = (c1: string[], c2: string[]) => {
      const ops: string[] = []
      const n = Math.min(c1.length, c2.length)
      for (let i = 0; i < n; i++) ops.push('patch #' + i + ' ' + c1[i] + '→' + c2[i])
      if (c1.length > c2.length) for (let i = n; i < c1.length; i++) ops.push('unmount #' + i + ' ' + c1[i])
      else for (let i = n; i < c2.length; i++) ops.push('mount #' + i + ' ' + c2[i])
      return ops
    }
    const cases: [string, string, string][] = [
      ['a b c', 'x a b c', '在头部插入一项：每个位置都 patch，最后挂载一个'],
      ['a b c d', 'a b', '新列表更短：卸载多出的旧节点'],
      ['', 'a b', '旧列表是空的：全部挂载'],
      ['a b', '', '新列表是空的：全部卸载'],
      ['a b c', 'c b a', '长度相同：每个位置 patch 一次，不移动'],
      ['a b c d e', 'b c d e', '删除头部一项：前 4 个 patch，最后卸载一个']
    ]
    for (const [o, n, label] of cases) {
      const c1 = words(o), c2 = words(n), a1 = [...c1], a2 = [...c2]
      const got: string[] = []
      try {
        S.patchUnkeyedChildren(a1, a2, {
          patch: (a: string, b: string, i: number) => got.push('patch #' + i + ' ' + a + '→' + b),
          mount: (b: string, i: number) => got.push('mount #' + i + ' ' + b),
          unmount: (a: string, i: number) => got.push('unmount #' + i + ' ' + a)
        })
      } catch (e: any) { T.ok(false, label + '（' + o + ' → ' + n + '）运行出错：' + e.message); continue }
      const want = refOps(c1, c2)
      T.ok(JSON.stringify(got) === JSON.stringify(want), label + '：' + (o || '空') + ' → ' + (n || '空') + '，期望 [' + want.join('；') + ']，实际 [' + got.join('；') + ']')
      T.ok(JSON.stringify(a1) === JSON.stringify(c1) && JSON.stringify(a2) === JSON.stringify(c2), '不要修改传入的列表')
    }
  },
  wrong: []
}
patchUnkeyed.solJs = sub(patchUnkeyed.js, `function patchUnkeyedChildren(c1, c2, h) {
  // TODO：按下标 patch 公共部分，再处理多出的旧节点或新节点
}`, UNKEYED_SOL)
patchUnkeyed.wrong = [
  { js: sub(patchUnkeyed.solJs, `    h.patch(c1[i], c2[i], i)              // 按下标比较，不看内容`, `    if (c1[i] === c2[i]) continue\n    h.unmount(c1[i], i)\n    h.mount(c2[i], i)`),
    why: '内容不同就卸载再挂载。没有 key 时 Vue 不比较内容，只按位置 patch：同一个位置上的节点被复用，然后改成新的内容。卸载再挂载是 type 或 key 不同时才发生的事。', expectFail: /在头部插入一项/ },
  { js: sub(patchUnkeyed.solJs, `  if (c1.length > c2.length) {
    for (let i = commonLength; i < c1.length; i++) h.unmount(c1[i], i)
  } else {`, `  if (c1.length > c2.length) {
    // 忘了卸载多出的旧节点
  } else {`),
    why: '新列表更短时，多出的旧节点没有卸载。它们的 DOM 会一直留在页面上。', expectFail: /新列表更短/ },
  { js: sub(patchUnkeyed.solJs, `    for (let i = commonLength; i < c2.length; i++) h.mount(c2[i], i)`, `    for (let i = 0; i < c2.length; i++) h.mount(c2[i], i)`),
    why: '挂载从 0 开始。前面 commonLength 个位置已经 patch 过了，不该再挂载一次，否则这些节点在页面上出现两份。', expectFail: /头部插入|旧列表是空/ },
  { js: sub(patchUnkeyed.solJs, `    for (let i = commonLength; i < c1.length; i++) h.unmount(c1[i], i)`, `    for (let i = c1.length - 1; i >= commonLength; i--) h.unmount(c1[i], i)`),
    why: '卸载的顺序反了。Vue 从较小长度那个下标起，按从前到后的顺序卸载（unmountChildren 的 start 参数）。', expectFail: /新列表更短|新列表是空/ }
]
patchUnkeyed.faded = {
  js: sub(sub(sub(patchUnkeyed.solJs, `  const commonLength = Math.min(c1.length, c2.length)`, `  const commonLength = /* ✏️ 两个列表长度的较小值 */ 0`),
    `    h.patch(c1[i], c2[i], i)              // 按下标比较，不看内容`, `    /* ✏️ 按下标 patch，把旧节点、新节点和下标交给 h.patch */`),
    `    for (let i = commonLength; i < c2.length; i++) h.mount(c2[i], i)`, `    /* ✏️ 新列表更长：挂载多出的新节点，从 commonLength 开始 */`)
}

// =====================================================================
// 练习二：keyed diff 的头尾同步（16.2 的第 1 到 4 步）
// =====================================================================
const SYNC_SOL = `function syncEnds(c1, c2, h) {
  let i = 0
  let e1 = c1.length - 1
  let e2 = c2.length - 1

  // 第 1 步：从头开始比较
  while (i <= e1 && i <= e2 && c1[i] === c2[i]) {
    h.patch(c1[i])
    i++
  }
  // 第 2 步：从尾开始比较
  while (i <= e1 && i <= e2 && c1[e1] === c2[e2]) {
    h.patch(c1[e1])
    e1--
    e2--
  }
  // 第 3 步：旧列表比完了，挂载剩下的新节点
  if (i > e1) {
    const anchor = c2[e2 + 1]              // 它后面那个新节点（已经处理完，位置正确）
    for (let k = i; k <= e2; k++) h.mount(c2[k], anchor)
  }
  // 第 4 步：新列表比完了，卸载剩下的旧节点
  else if (i > e2) {
    for (let k = i; k <= e1; k++) h.unmount(c1[k])
  }
  return { i, e1, e2 }                      // 中间还没处理的乱序区间（第 5 步）
}`

export const syncEnds: Exercise = {
  title: '实现：keyed diff 的头尾同步和新增、删除', ch: 16,
  task: '<p>实现 <code>patchKeyedChildren</code> 的前四步。节点用它的 key（字符串）表示，key 相同就是同一个节点。回调：<code>h.patch(key)</code>、<code>h.mount(key, anchor)</code>（挂载到 <code>anchor</code> 这个 key 的节点前面，没有后继时 <code>anchor</code> 是 <code>undefined</code>）、<code>h.unmount(key)</code>。</p><ol><li>头部同步：从头开始，key 相同就 <code>h.patch</code>，遇到不同就停。</li><li>尾部同步：从尾开始，规则相同。</li><li>旧列表已经比完（<code>i &gt; e1</code>）：挂载 <code>c2[i..e2]</code>，锚点是 <code>c2[e2 + 1]</code>。</li><li>新列表已经比完（<code>i &gt; e2</code>）：卸载 <code>c1[i..e1]</code>。</li></ol><p>函数返回 <code>{ i, e1, e2 }</code>：两个循环结束时中间还没处理的区间。中间的乱序部分（第 5 步）不用处理。只改 <code>syncEnds</code>。</p>',
  tpl: '<label>旧列表 <input v-model="oldText" aria-label="旧列表"></label>\n<label>新列表 <input v-model="newText" aria-label="新列表"></label>\n<pre class="out">{{ log }}</pre>',
  js: `// 节点用它的 key 表示。h 是三个回调，已经接好记录
function syncEnds(c1, c2, h) {
  let i = 0
  let e1 = c1.length - 1
  let e2 = c2.length - 1
  // TODO 第 1 步：从头开始比较
  // TODO 第 2 步：从尾开始比较
  // TODO 第 3、4 步：挂载剩下的新节点，或卸载剩下的旧节点
  return { i, e1, e2 }
}

// ===== 已给出：运行并记录操作 =====
function run(c1, c2) {
  const ops = []
  const range = syncEnds(c1, c2, {
    patch: k => ops.push('patch ' + k),
    mount: (k, anchor) => ops.push('mount ' + k + ' 到 ' + (anchor || '末尾') + ' 之前'),
    unmount: k => ops.push('unmount ' + k)
  })
  return { ops, range }
}
const oldText = ref('a b c d e f g')
const newText = ref('a b e c d h f g')
const words = s => s.split(' ').filter(Boolean)
const log = computed(() => {
  const { ops, range } = run(words(oldText.value), words(newText.value))
  return ops.join('\\n') + '\\n剩下的区间：i=' + range.i + '，e1=' + range.e1 + '，e2=' + range.e2
})

return { oldText, newText, log, syncEnds }`,
  hints: [
    '头部和尾部的循环写法相同，只是方向相反。条件里都要有 i <= e1 && i <= e2，防止越界。key 相同就 patch 并移动指针，不同就停止循环。16.2 节的五个步骤和 HeadTailSync 示意图讲了它。',
    '第 1 步：while (i <= e1 && i <= e2 && c1[i] === c2[i]) { h.patch(c1[i]); i++ }。第 2 步：条件换成 c1[e1] === c2[e2]，patch 之后 e1-- 和 e2--。两步之后，如果 i > e1，旧列表比完了，把 c2[i] 到 c2[e2] 挂载；否则如果 i > e2，把 c1[i] 到 c1[e1] 卸载。',
    SYNC_SOL
  ],
  async check(T) {
    const S = diffState(T)
    if (!S || typeof S.syncEnds !== 'function') { T.ok(false, '脚本需要 return 的对象里有 syncEnds 函数'); return }
    const ref = (c1: string[], c2: string[]) => {
      const ops: string[] = []
      let i = 0, e1 = c1.length - 1, e2 = c2.length - 1
      while (i <= e1 && i <= e2 && c1[i] === c2[i]) { ops.push('patch ' + c1[i]); i++ }
      while (i <= e1 && i <= e2 && c1[e1] === c2[e2]) { ops.push('patch ' + c1[e1]); e1--; e2-- }
      const range = { i, e1, e2 }
      let middle = false
      if (i > e1) for (let k = i; k <= e2; k++) ops.push('mount ' + c2[k] + ' 到 ' + (c2[e2 + 1] || '末尾') + ' 之前')
      else if (i > e2) for (let k = i; k <= e1; k++) ops.push('unmount ' + c1[k])
      else middle = true
      return { ops, range, middle }
    }
    const cases: [string, string, string][] = [
      ['a b c', 'a b c d', '尾部追加'],
      ['a b', 'x a b', '头部插入（只有尾部同步能匹配）'],
      ['a b c', 'a c', '删除中间一项'],
      ['a b d', 'a b c d', '在中间插入一项'],
      ['a b c d e f g', 'a b e c d h f g', '中间乱序：只做头尾同步，返回剩下的区间'],
      ['a b', 'c d', '一个都对不上'],
      ['a b c', '', '新列表为空：全部卸载'],
      ['', 'a b', '旧列表为空：全部挂载'],
      ['a b c', 'a b c', '完全相同']
    ]
    for (const [o, n, label] of cases) {
      const c1 = words(o), c2 = words(n)
      const want = ref(c1, c2)
      const got: string[] = []
      let range: any
      try {
        range = S.syncEnds([...c1], [...c2], {
          patch: (k: string) => got.push('patch ' + k),
          mount: (k: string, anchor?: string) => got.push('mount ' + k + ' 到 ' + (anchor || '末尾') + ' 之前'),
          unmount: (k: string) => got.push('unmount ' + k)
        })
      } catch (e: any) { T.ok(false, label + '（' + (o || '空') + ' → ' + (n || '空') + '）运行出错：' + e.message); continue }
      let okRange = true
      if (want.middle) okRange = !!range && range.i === want.range.i && range.e1 === want.range.e1 && range.e2 === want.range.e2
      T.ok(JSON.stringify(got) === JSON.stringify(want.ops) && okRange,
        label + '：' + (o || '空') + ' → ' + (n || '空') + '，期望 [' + want.ops.join('；') + ']' + (want.middle ? '，区间 ' + JSON.stringify(want.range) : '') + '；实际 [' + got.join('；') + ']' + (want.middle ? '，区间 ' + JSON.stringify(range) : ''))
    }
  },
  wrong: []
}
syncEnds.solJs = sub(syncEnds.js, `function syncEnds(c1, c2, h) {
  let i = 0
  let e1 = c1.length - 1
  let e2 = c2.length - 1
  // TODO 第 1 步：从头开始比较
  // TODO 第 2 步：从尾开始比较
  // TODO 第 3、4 步：挂载剩下的新节点，或卸载剩下的旧节点
  return { i, e1, e2 }
}`, SYNC_SOL)
syncEnds.wrong = [
  { js: sub(syncEnds.solJs, `  while (i <= e1 && i <= e2 && c1[e1] === c2[e2]) {
    h.patch(c1[e1])
    e1--
    e2--
  }`, ''),
    why: '只做了头部同步，没有尾部同步。头部插入一项时，头部一个都对不上，剩下的节点全部落入乱序区，无法利用“后面的节点没变”。尾部同步让常见的头部插入、删除也在前四步完成。', expectFail: /头部插入/ },
  { js: sub(syncEnds.solJs, `h.mount(c2[k], anchor)`, `h.mount(c2[k])`),
    why: '挂载时没有传锚点，新节点总是被追加到末尾。在头部或中间插入时，节点会出现在错误的位置。锚点是 c2[e2 + 1]：它后面那个新节点，已经在正确的位置上。', expectFail: /头部插入|在中间插入/ },
  { js: sub(syncEnds.solJs, `for (let k = i; k <= e1; k++) h.unmount(c1[k])`, `for (let k = i; k <= e2; k++) h.unmount(c1[k])`),
    why: '卸载的范围写成了 i 到 e2。第 4 步里 e2 < i，循环一次也不执行，旧节点没有被卸载。要卸载的是旧列表剩下的 c1[i..e1]。', expectFail: /删除中间|新列表为空/ },
  { js: sub(syncEnds.solJs, `    h.patch(c1[e1])
    e1--
    e2--`, `    h.patch(c1[e1])
    e1--`),
    why: '尾部同步时只移动了旧列表的指针。e1 和 e2 要一起向前，否则它们不再对齐，后面的比较、挂载和卸载范围都会错。', expectFail: /期望/ }
]
syncEnds.faded = {
  js: sub(sub(sub(sub(syncEnds.solJs,
    `while (i <= e1 && i <= e2 && c1[i] === c2[i]) {`, `while (/* ✏️ 没有越界，并且头部的 key 相同 */ false) {`),
    `while (i <= e1 && i <= e2 && c1[e1] === c2[e2]) {`, `while (/* ✏️ 没有越界，并且尾部的 key 相同 */ false) {`),
    `    const anchor = c2[e2 + 1]              // 它后面那个新节点（已经处理完，位置正确）`, `    const anchor = /* ✏️ 锚点：新列表里 e2 后面那个节点 */ undefined`),
    `  else if (i > e2) {`, `  else if (/* ✏️ 新列表已经比完 */ false) {`)
}

// =====================================================================
// 练习三：乱序区用最长递增子序列算出移动（16.2 的第 5 步）
// =====================================================================
const GET_SEQUENCE_SRC = `// 已给出：Vue 源码里的 getSequence，返回最长递增子序列的下标（0 表示新节点，被跳过）
function getSequence(arr) {
  const p = arr.slice(), result = [0]
  let i, j, u, v, c
  const len = arr.length
  for (i = 0; i < len; i++) {
    const cur = arr[i]
    if (cur !== 0) {
      j = result[result.length - 1]
      if (arr[j] < cur) { p[i] = j; result.push(i); continue }
      u = 0; v = result.length - 1
      while (u < v) { c = (u + v) >> 1; if (arr[result[c]] < cur) u = c + 1; else v = c }
      if (cur < arr[result[u]]) { if (u > 0) p[i] = result[u - 1]; result[u] = i }
    }
  }
  u = result.length; v = result[u - 1]
  while (u-- > 0) { result[u] = v; v = p[v] }
  return result
}
`
const PLAN_SOL = `function planMiddle(oldKeys, newKeys) {
  // 1. key → 新下标
  const keyToNewIndex = new Map()
  newKeys.forEach((k, i) => keyToNewIndex.set(k, i))

  // 2. 遍历旧节点，填 newIndexToOldIndex，找出要卸载的，检测是否乱序
  const newIndexToOldIndex = new Array(newKeys.length).fill(0)   // 0 表示新节点
  const unmount = []
  let moved = false
  let maxNewIndexSoFar = 0
  oldKeys.forEach((k, i) => {
    const newIndex = keyToNewIndex.get(k)
    if (newIndex === undefined) {
      unmount.push(k)
    } else {
      newIndexToOldIndex[newIndex] = i + 1                       // +1，让 0 保留给新节点
      if (newIndex >= maxNewIndexSoFar) maxNewIndexSoFar = newIndex
      else moved = true
    }
  })

  // 3. 只有乱序时才计算最长递增子序列
  const seq = moved ? getSequence(newIndexToOldIndex) : []

  // 4. 从后往前处理新节点
  const ops = []
  let j = seq.length - 1
  for (let i = newKeys.length - 1; i >= 0; i--) {
    if (newIndexToOldIndex[i] === 0) {
      ops.push({ op: 'mount', key: newKeys[i] })
    } else if (moved && (j < 0 || i !== seq[j])) {
      ops.push({ op: 'move', key: newKeys[i] })
    } else {
      ops.push({ op: 'stay', key: newKeys[i] })
      j--
    }
  }
  return { unmount, ops }
}`

export const lisPlan: Exercise = {
  title: '实现：用最长递增子序列算出要移动的节点', ch: 16,
  task: '<p>实现 <code>patchKeyedChildren</code> 第 5 步的决策部分。输入是头尾同步之后中间的旧 key 列表 <code>oldKeys</code> 和新 key 列表 <code>newKeys</code>。<code>getSequence</code> 已经给出。你来写 <code>planMiddle</code>，返回 <code>{ unmount, ops }</code>：</p><ol><li>建立 key → 新下标 的映射。</li><li>遍历旧节点。新列表里没有的 key，放进 <code>unmount</code>（按旧列表的顺序）。有的，填 <code>newIndexToOldIndex[新下标] = 旧下标 + 1</code>。同时检测是否乱序：某个节点的新下标比前面已经遇到的最大新下标小，就是乱序（<code>moved = true</code>）。</li><li>只有乱序时才调用 <code>getSequence</code>。</li><li>从新列表的最后一个节点往前处理，每个节点往 <code>ops</code> 里加一项：新节点是 <code>mount</code>；乱序且不在最长递增子序列里的是 <code>move</code>；其余是 <code>stay</code>。</li></ol><p>只改 <code>planMiddle</code>。页面下方显示结果。</p>',
  tpl: '<label>旧列表（中间部分） <input v-model="oldText" aria-label="旧列表"></label>\n<label>新列表（中间部分） <input v-model="newText" aria-label="新列表"></label>\n<pre class="out">{{ log }}</pre>',
  js: GET_SEQUENCE_SRC + `
// TODO：返回 { unmount: [要卸载的 key], ops: [{ op: 'mount' | 'move' | 'stay', key }] }
// ops 按处理顺序排列：从新列表的最后一个节点开始
function planMiddle(oldKeys, newKeys) {
  return { unmount: [], ops: [] }
}

// ===== 已给出：显示结果 =====
const oldText = ref('c d e')
const newText = ref('e c d h')
const words = s => s.split(' ').filter(Boolean)
const log = computed(() => {
  const plan = planMiddle(words(oldText.value), words(newText.value))
  const moves = plan.ops.filter(o => o.op === 'move').length
  return plan.ops.map(o => o.op + ' ' + o.key).join('\\n') + '\\n卸载：' + (plan.unmount.join(' ') || '无') + '\\n移动 ' + moves + ' 个'
})

return { oldText, newText, log, planMiddle }`,
  hints: [
    '这就是实验台“逐步运行 diff”里第 5 步做的事：先把每个新节点对应的旧位置记下来（newIndexToOldIndex），再倒着处理。倒着处理是因为锚点是后面那个新节点，它必须先处理完。16.2 节的 LongestIncreasingSubsequence 示意图用 [5, 3, 4, 0] 讲了这个数组。',
    '分四块写。1. new Map，key 对新下标。2. 新建 newIndexToOldIndex = new Array(newKeys.length).fill(0)，用 oldKeys.forEach 遍历：查不到就 unmount.push(k)，查到就 newIndexToOldIndex[ni] = i + 1，并用 maxNewIndexSoFar 判断 moved。3. const seq = moved ? getSequence(newIndexToOldIndex) : []。4. j = seq.length - 1，for 从 newKeys.length - 1 倒着到 0：值为 0 是 mount；moved 且（j < 0 或 i !== seq[j]）是 move；否则是 stay，并且 j--。',
    PLAN_SOL
  ],
  async check(T) {
    const S = diffState(T)
    if (!S || typeof S.planMiddle !== 'function') { T.ok(false, '脚本需要 return 的对象里有 planMiddle 函数'); return }
    const ref = (oldKeys: string[], newKeys: string[]) => {
      const map = new Map<string, number>()
      newKeys.forEach((k, i) => map.set(k, i))
      const n2o: number[] = new Array(newKeys.length).fill(0)
      const unmount: string[] = []
      let moved = false, max = 0
      oldKeys.forEach((k, i) => {
        const ni = map.get(k)
        if (ni === undefined) unmount.push(k)
        else { n2o[ni] = i + 1; if (ni >= max) max = ni; else moved = true }
      })
      const seq = moved ? getSequence(n2o) : []
      const ops: { op: string; key: string }[] = []
      let j = seq.length - 1
      for (let i = newKeys.length - 1; i >= 0; i--) {
        if (n2o[i] === 0) ops.push({ op: 'mount', key: newKeys[i] })
        else if (moved && (j < 0 || i !== seq[j])) ops.push({ op: 'move', key: newKeys[i] })
        else { ops.push({ op: 'stay', key: newKeys[i] }); j-- }
      }
      return { unmount, ops }
    }
    const cases: [string, string, string][] = [
      ['c d e', 'e c d h', '16.2 节的例子：只移动 e，挂载 h'],
      ['a b c', 'b c a', '把第一个移到最后：只移动 a'],
      ['a b c d', 'd c b a', '反转：移动 3 个'],
      ['a b c', 'a b c', '没有变化：全部不动'],
      ['a b c d', 'c x a', '同时有卸载、挂载和移动'],
      ['a b c', 'x y', '旧节点全部卸载，新节点全部挂载'],
      ['a b c d e', 'b d a e c', '随机顺序']
    ]
    for (const [o, n, label] of cases) {
      const c1 = words(o), c2 = words(n)
      const want = ref(c1, c2)
      let got: any
      try { got = S.planMiddle([...c1], [...c2]) } catch (e: any) { T.ok(false, label + '：运行出错：' + e.message); continue }
      T.ok(JSON.stringify(got) === JSON.stringify(want),
        label + '：' + o + ' → ' + n + '，期望 ' + JSON.stringify(want) + '；实际 ' + JSON.stringify(got))
    }
  },
  wrong: []
}
lisPlan.solJs = sub(lisPlan.js, `function planMiddle(oldKeys, newKeys) {
  return { unmount: [], ops: [] }
}`, PLAN_SOL)
lisPlan.wrong = [
  { js: sub(lisPlan.solJs, `else if (moved && (j < 0 || i !== seq[j])) {`, `else if (moved) {`),
    why: '没有利用最长递增子序列：乱序时把每个已有节点都移动一遍。LIS 里的节点相对顺序已经正确，不需要移动。这正是 LIS 要省下的操作。', expectFail: /16\.2 节的例子|把第一个移到最后/ },
  { js: sub(lisPlan.solJs, `newIndexToOldIndex[newIndex] = i + 1                       // +1，让 0 保留给新节点`, `newIndexToOldIndex[newIndex] = i`),
    why: '忘了 +1。排在旧列表第一位的节点得到 0，被当成新节点，会被重新挂载。0 要留给“没有对应旧节点”。', expectFail: /期望/ },
  { js: sub(sub(lisPlan.solJs, `  for (let i = newKeys.length - 1; i >= 0; i--) {`, `  for (let i = 0; i < newKeys.length; i++) {`), `      j--\n`, `      j++\n`),
    why: '从前往后处理。移动一个节点要插到它后面那个新节点的前面，所以后面的节点必须先处理完。顺序反了，锚点就不存在。', expectFail: /期望/ },
  { js: sub(lisPlan.solJs, `    if (newIndex === undefined) {
      unmount.push(k)
    } else {`, `    if (newIndex === undefined) {
      // 忘了记录要卸载的节点
    } else {`),
    why: '新列表里没有的旧节点要卸载。不记录的话，它们的 DOM 会留在页面上。', expectFail: /同时有卸载/ }
]
lisPlan.faded = {
  js: sub(sub(sub(lisPlan.solJs,
    `      if (newIndex >= maxNewIndexSoFar) maxNewIndexSoFar = newIndex
      else moved = true`, `      /* ✏️ 新下标比前面见过的最大值小，说明乱序：更新 maxNewIndexSoFar 或设置 moved */`),
    `  const seq = moved ? getSequence(newIndexToOldIndex) : []`, `  const seq = /* ✏️ 只有乱序时才计算最长递增子序列 */ []`),
    `    } else if (moved && (j < 0 || i !== seq[j])) {`, `    } else if (/* ✏️ 乱序，并且这个节点不在最长递增子序列里 */ false) {`)
}

// =====================================================================
// 保留的入门练习：改 key（检验 16.1 和 16.4 的基础目标）
// =====================================================================
export const diffKey: Exercise = {
  title: '修复：删除一行后，输入框的内容错位', ch: 16,
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
    '原因：Vue 用每一行的标识判断新旧列表中哪一行是同一行。现在的标识是行的位置。删除 A 后，B 的位置变为 0，所以 Vue 把原来 A 的那一行（和它的输入框）给了 B。标识要跟着数据走，而不是跟着位置。第 16 章最后的“注意”讲了它。',
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

