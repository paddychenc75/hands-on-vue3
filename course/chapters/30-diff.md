---
title: 子节点的更新与 diff
id: diff
stage: 5
chapter: 30
desc: patchChildren、key 与最长递增子序列
---

<script setup>
import HeadTailSync from '../figures/30-diff/HeadTailSync.vue'
import LongestIncreasingSubsequence from '../figures/30-diff/LongestIncreasingSubsequence.vue'
import IndexKeyVsIdKey from '../figures/30-diff/IndexKeyVsIdKey.vue'
import DiffSimulator from '../labs/30-diff/DiffSimulator.vue'
</script>

# 子节点的更新与 diff：key 和最长递增子序列

::: goals
<Goal checks="sc:4,sc:6">说明更新一个元素时 `patch` 做什么：怎样判断“同一个节点”，子节点按新旧的类型怎样分流。</Goal>
<Goal checks="sc:3,ex:patchUnkeyed">说明没有 key 时按下标比较的做法，并实现 `patchUnkeyedChildren`。</Goal>
<Goal checks="sc:0,ex:syncEnds">说出有 key 的列表 diff 的五个步骤、每一步为什么这样做，并实现前四步。</Goal>
<Goal checks="sc:1,sc:5,ex:lisPlan">说明最长递增子序列（LIS）的作用和为什么倒序处理，并用它算出要移动的节点。</Goal>
<Goal checks="sc:2,ex:diffKey">说明不能用 index 作为 key 的原因，并用 key 重建组件。</Goal>

:::

::: rt
阅读主线约 22 分钟，深入内容约 4 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
一排学生按新名单重新站队。聪明办法是：**找出相对顺序已经正确的人，让他们不动**，只让其他人插到正确的位置。这批不动的人就是最长递增子序列。

**key 就是学号**。用学号才知道“这是同一个人”。
:::

::: terms
diff
: 比较新旧虚拟节点，找出要修改的 DOM。

patch
: 比较一个新旧节点，并更新它的 DOM。

key
: v-for 中标识每一项的唯一值。

锚点（anchor）
: 插入节点时的参照节点。新节点插在它前面。

最长递增子序列（LIS）
: 按原顺序挑出的、逐个变大的最长一组数。
:::

::: why
你用 index 作为 key，然后在列表开头插入一项。每一行输入框中的文字都错位了。

原因：Vue 用 key 判断新旧节点是不是同一个。key 错了，Vue 就复用了错误的节点。

本章说明渲染器怎样更新一个元素和它的子节点，以及有 key 的列表 diff 为什么这样设计。
:::

### 30.1 更新一个元素：先问“是不是同一个节点”

第 28 章说过，数据变化后渲染函数生成一棵新的 vnode 树，渲染器把它和上一棵比较。比较从根开始，一个节点一个节点地往下走。入口是 `patch(n1, n2, container, anchor)`：`n1` 是旧 vnode，`n2` 是新 vnode，`container` 是它们所在的真实父元素，`anchor` 是插入时的参照节点（见 30.4）。`n1` 是 `null` 就是第一次挂载。

<!-- mini:element#patch -->
```js
function patch(n1, n2, container, anchor = null, parentComponent = null) {
  if (n1 === n2) return
  if (n1 && !isSameVNodeType(n1, n2)) {      // 类型或 key 不同：旧的整个卸载，新的重新挂载
    anchor = getNextHostNode(n1)
    unmount(n1, true)
    n1 = null
  }
  if (n2.type === Text) processText(n1, n2, container, anchor)
  else if (n2.shapeFlag & ShapeFlags.ELEMENT) processElement(n1, n2, container, anchor, parentComponent)
  else processComponent(n1, n2, container, anchor, parentComponent)   // 第 31 章补上；此前没有组件 vnode
}
```

本章的代码来自课程的迷你 Vue（`course/mini`）。它和真实的 `renderer.ts` 结构一致，只去掉了与本章无关的分支。组件 vnode 的处理（`processComponent`）在第 31 章补上。

`patch` 做的第一个决定是：新旧两个节点是不是同一个。

```js
function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key
}
```

**不是同一个节点（type 或 key 不同）：卸载旧的，挂载新的。** 例如 `div` 换成 `p`，或者 `CompA` 换成 `CompB`。两个节点的内部结构没有关系，逐项比较没有意义。`key` 不同也一样：key 是你明确告诉 Vue“这是另一个”。新节点要插在旧节点原来的位置，所以先用 `getNextHostNode(n1)` 记下旧节点后面的节点，再卸载。

**是同一个节点：复用真实节点，只改有差别的部分。** 元素节点交给 `patchElement`：

<!-- mini:element#patchElement -->
```js
function patchElement(n1, n2, parentComponent) {
  const el = (n2.el = n1.el)
  patchChildren(n1, n2, el, null, parentComponent)      // 先子节点，再属性（和真实版的顺序一致）
  const oldProps = n1.props || {}
  const newProps = n2.props || {}
  for (const key in oldProps) if (key !== 'key' && !(key in newProps)) hostPatchProp(el, key, oldProps[key], null)
  for (const key in newProps) if (key !== 'key' && newProps[key] !== oldProps[key]) hostPatchProp(el, key, oldProps[key], newProps[key])
}
```

它做三件事。`n2.el = n1.el`，新 vnode 接管旧的真实节点。然后更新子节点（30.2 起的主题）。最后对比 props：旧的有新的没有就删除，新旧不同就修改，相同的不碰。真实版里，模板编译出的节点带 PatchFlag，只对比标记过的 props；手写 `h()` 的节点没有标记，要对比全部（第 29 章讲过编译期标记）。

### 30.2 子节点的总流程：patchChildren

`patchElement` 把子节点交给 `patchChildren`。新旧子节点各有三种可能：一段文字、一个数组，或者没有。排列起来是九种组合：

| 旧 \ 新 | 文字 | 数组 | 没有 |
|---|---|---|---|
| **文字** | 文字不同就更新文字 | 清空文字，挂载新数组 | 清空文字 |
| **数组** | 卸载旧数组，设置文字 | **两个数组：比较（30.3、30.4）** | 卸载旧数组 |
| **没有** | 设置文字 | 挂载新数组 | 什么也不做 |

只有“数组对数组”需要真正的 diff。其他八种都是整体操作：设置文字、清空、整体挂载或卸载。下面是代码，判断用的正是第 28 章的 `shapeFlag`：

<!-- mini:element#patchChildren -->
```js
function patchChildren(n1, n2, container, anchor, parentComponent) {
  const c1 = n1.children
  const c2 = n2.children
  const prev = n1.shapeFlag
  const next = n2.shapeFlag
  if (next & ShapeFlags.TEXT_CHILDREN) {
    if (prev & ShapeFlags.ARRAY_CHILDREN) unmountChildren(c1)
    if (c2 !== c1) hostSetElementText(container, c2)
  } else if (prev & ShapeFlags.ARRAY_CHILDREN) {
    if (next & ShapeFlags.ARRAY_CHILDREN) {
      if (c2.some(c => c.key != null)) patchKeyedChildren(c1, c2, container, anchor, parentComponent)
      else patchUnkeyedChildren(c1, c2, container, anchor, parentComponent)
    } else unmountChildren(c1, true)
  } else {
    if (prev & ShapeFlags.TEXT_CHILDREN) hostSetElementText(container, '')
    if (next & ShapeFlags.ARRAY_CHILDREN) mountChildren(c2, container, anchor, parentComponent)
  }
}
```

两个数组时再分两条路：

- **有 key：** `patchKeyedChildren`，按 key 找对应关系，必要时移动节点。30.4 讲。
- **没有 key：** `patchUnkeyedChildren`，只按下标一一对应。30.3 讲。

真实版里选哪条路，由编译器打的标记决定：模板里的 `v-for` 带 `key`，片段得到 `KEYED_FRAGMENT` 标记，没有 key 得到 `UNKEYED_FRAGMENT` 标记。手写 `h()` 没有标记，真实版一律走 `patchKeyedChildren`（所有 key 都是 `null`，头部同步时按位置逐个比较，结果和按下标比较一样）。迷你版简化为：只要有一个子节点带 key，就走有 key 的路。

编译优化还有更重要的一层：模板编译出的 Block 只收集动态节点，静态节点和不变的子树根本不进入 `patchChildren`（第 29 章讲过）。本章讲的是进入之后的流程。

### 30.3 没有 key：按下标比较

没有 key 时，Vue 不去找“哪个旧节点对应哪个新节点”，只按位置配对：

<!-- mini:element#patchUnkeyedChildren -->
```js
function patchUnkeyedChildren(c1, c2, container, anchor, parentComponent) {
  const common = Math.min(c1.length, c2.length)
  for (let i = 0; i < common; i++) patch(c1[i], c2[i], container, null, parentComponent)   // 按下标一一对比
  if (c1.length > c2.length) unmountChildren(c1, true, common)
  else mountChildren(c2.slice(common), container, anchor, parentComponent)
}
```

1. 取新旧数组长度的较小值 `common`。
2. 按下标 patch 前 `common` 个节点：第 i 个旧节点配第 i 个新节点。
3. 旧数组更长：卸载多出的旧节点。
4. 新数组更长：挂载多出的新节点。

这个算法从不移动节点。列表只在尾部增删时，它很快：前面的节点没有变化，`patch` 什么也不用改。

**它在什么情况下出错？** 在头部插入一项。旧列表是 `a b c`，新列表是 `x a b c`。每个下标上的数据都变了：

```
更新 a → x      第 0 个节点：内容从 a 改成 x
更新 b → a      第 1 个节点：内容从 b 改成 a
更新 c → b      第 2 个节点：内容从 c 改成 b
挂载 c 到末尾   多出一个，新建
```

三次更新加一次挂载，而不是一次挂载。如果这些行里只有文字，结果也对，只是多做了无用功。但如果每一行里有 DOM 自己保存的状态，例如输入框里用户打的字，状态就留在原来的节点上，显示在错误的行里。如果每一行是有内部数据的子组件，被复用的是旧的组件实例，实例里的数据不会跟着新数据走。

所以没有 key 的更新，等价于“按位置复用”。位置不变的列表可以这样用。会插入、删除、排序的列表要写 key（30.6）。

下面的练习让你实现这个函数。你写的代码跑在迷你 Vue 的渲染器里：页面下方记录渲染器碰到的每一次 DOM 操作。试一试在头部插入一项，亲眼看这四步。

<Exercise id="patchUnkeyed" />

### 30.4 有 key：五个步骤

有 key 时，Vue 能认出“这是同一个节点，只是位置变了”。算法要解决的问题是：用最少的 DOM 操作，把旧列表变成新列表。

先看常见的变化：末尾追加，头部插入，删除其中一项，拖动一项换位置。它们有一个共同点：大部分节点没有变，变化集中在列表的一端或者中间一小段。所以算法先把两端不变的部分处理掉，只对剩下的“中间”做复杂的处理。

<!-- mini:element#patchKeyedChildren -->
```js
function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
  let i = 0
  const l2 = c2.length
  let e1 = c1.length - 1
  let e2 = l2 - 1

  while (i <= e1 && i <= e2 && isSameVNodeType(c1[i], c2[i])) {      // 1. 从头同步
    patch(c1[i], c2[i], container, null, parentComponent)
    i++
  }
  while (i <= e1 && i <= e2 && isSameVNodeType(c1[e1], c2[e2])) {    // 2. 从尾同步
    patch(c1[e1], c2[e2], container, null, parentComponent)
    e1--
    e2--
  }

  if (i > e1) {                                                      // 3. 旧的比完了：挂载新的剩余部分
    const anchor = e2 + 1 < l2 ? c2[e2 + 1].el : parentAnchor
    while (i <= e2) patch(null, c2[i++], container, anchor, parentComponent)
  } else if (i > e2) {                                               // 4. 新的比完了：卸载旧的剩余部分
    while (i <= e1) unmount(c1[i++], true)
  }

  if (i <= e1 && i <= e2) patchUnknownSequence(c1, c2, i, e1, e2, container, parentAnchor, parentComponent)
}
```

变量 `i` 是头部指针，`e1`、`e2` 是旧、新数组的尾部指针。前四步处理两端：

1. **从头同步。** 从头开始，`isSameVNodeType` 为真就 patch，`i` 加 1，遇到不同就停。为什么：末尾追加、尾部删除时，前面的节点完全没变，不需要任何 DOM 移动。patch 只更新节点自己的内容。
2. **从尾同步。** 从尾开始，规则相同，`e1`、`e2` 一起减 1。为什么：头部插入、头部删除时，后面的节点没变。只做头部同步的话，头部一插入，后面所有节点都对不上。
3. **旧的比完了，新的还有：挂载。** 剩下的新节点是新增的。它们要插在 `c2[e2 + 1]` 的真实节点前面：这个节点属于同步过的尾部，位置已经正确，正好当锚点。后面没有节点时，用父级传下来的 `parentAnchor`。
4. **新的比完了，旧的还有：卸载。** 剩下的旧节点是被删除的。

前四步已经覆盖了追加、头部插入、尾部删除和任意位置的单段增删。只有两个循环、两个判断，复杂度是 O(n)。下面的练习让你自己写一遍：

<Exercise id="syncEnds" />

如果前四步之后 `i` 既不大于 `e1` 也不大于 `e2`，说明两端同步完了，中间两边都还有节点，并且顺序不同。这就是第 5 步处理的“乱序区”。

下面用一个例子走一遍。旧列表 `a b c d e f g`，新列表 `a b e c d h f g`。

<Figure caption="头部同步：第 1 步从头比较，a、b 的 key 相同，Vue 直接 patch。第 2 步从尾比较，g、f 也直接 patch。剩下中间部分：旧 c d e，新 e c d h。">
<HeadTailSync />
</Figure>

前四步之后，`i = 2`，`e1 = 4`，`e2 = 5`。中间的旧节点是 `c d e`，新节点是 `e c d h`，进入第 5 步：

<!-- mini:element#patchUnknownSequence -->
```js
// 5. 头尾都同步完以后，中间 c1[s..e1] 和 c2[s..e2] 乱序的部分
function patchUnknownSequence(c1, c2, s, e1, e2, container, parentAnchor, parentComponent) {
  const l2 = c2.length
  const keyToNewIndex = new Map()                                  // 5.1 新节点的 key → 新下标
  for (let k = s; k <= e2; k++) if (c2[k].key != null) keyToNewIndex.set(c2[k].key, k)

  const toBePatched = e2 - s + 1
  const newIndexToOldIndex = new Array(toBePatched).fill(0)        // 0 表示这个新节点在旧列表里没有
  let moved = false
  let maxNewIndexSoFar = 0
  let patched = 0
  for (let k = s; k <= e1; k++) {                                  // 5.2 遍历旧节点：复用、更新或卸载
    const prevChild = c1[k]
    if (patched >= toBePatched) { unmount(prevChild, true); continue }
    let newIndex
    if (prevChild.key != null) newIndex = keyToNewIndex.get(prevChild.key)
    else {
      for (let j = s; j <= e2; j++) {
        if (newIndexToOldIndex[j - s] === 0 && isSameVNodeType(prevChild, c2[j])) { newIndex = j; break }
      }
    }
    if (newIndex === undefined) unmount(prevChild, true)
    else {
      newIndexToOldIndex[newIndex - s] = k + 1                     // +1：避开 0
      if (newIndex >= maxNewIndexSoFar) maxNewIndexSoFar = newIndex
      else moved = true                                            // 出现了「倒退」：有节点要移动
      patch(prevChild, c2[newIndex], container, null, parentComponent)
      patched++
    }
  }

  const stable = moved ? getSequence(newIndexToOldIndex) : []      // 5.3 最长递增子序列里的节点不用动
  let j = stable.length - 1
  for (let k = toBePatched - 1; k >= 0; k--) {                     // 从后往前，后一个节点已经就位，可以当锚点
    const nextIndex = s + k
    const nextChild = c2[nextIndex]
    const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor
    if (newIndexToOldIndex[k] === 0) patch(null, nextChild, container, anchor, parentComponent)
    else if (moved) {
      if (j < 0 || k !== stable[j]) move(nextChild, container, anchor)
      else j--
    }
  }
}
```

**5.1 建立 key 到新下标的映射。** 为了遍历旧节点时，能在常数时间里查到每个旧节点在新列表里的位置。例子里：`e → 2`，`c → 3`，`d → 4`，`h → 5`。

**5.2 遍历旧节点：复用、更新或卸载。** 对每个旧节点查映射。查不到，说明新列表里没有它，卸载。查到了，就 patch 它，并记下“新下标位置的节点对应旧列表的第几个”，放进 `newIndexToOldIndex` 数组。存的是旧下标加 1，因为 0 要留给“这个新节点在旧列表里没有”。例子里依次处理 `c`、`d`、`e`：

| 遍历到 | 新下标 | `newIndexToOldIndex` | 最大新下标 | 乱序？ |
|---|---|---|---|---|
| 开始 | | `[0, 0, 0, 0]` | 0 | 否 |
| `c`（旧下标 2） | 3 | `[0, 3, 0, 0]` | 3 | 否 |
| `d`（旧下标 3） | 4 | `[0, 3, 4, 0]` | 4 | 否 |
| `e`（旧下标 4） | 2 | `[5, 3, 4, 0]` | 4 | **是**：2 比 4 小 |

“最大新下标”是判断要不要移动的办法。旧节点从前往后遍历，如果它们在新列表里的下标一直递增，说明相对顺序没变，没有节点需要移动。一旦出现一个比最大值小的，就说明有节点要移动，`moved` 为真。两个小优化：一旦新列表中间部分的节点都找到了旧节点，剩下的旧节点不用再查映射，直接卸载（`patched >= toBePatched`）；没有乱序时，下一步不用算最长递增子序列。

**5.3 决定谁不用动。** `moved` 为真时才计算 `newIndexToOldIndex` 的最长递增子序列。例子里是 `[5, 3, 4, 0]` 中的 `3, 4`，对应下标 1 和 2，也就是 `c` 和 `d`。为什么是它，30.5 讲。

**5.4 从后往前处理新节点。** 每个节点有三种情况：

- `newIndexToOldIndex` 为 0：新节点，挂载到锚点前面。
- 在最长递增子序列里：不动。
- 其他：移动，也就是用 `insertBefore(el, 锚点)` 把它的真实节点插到锚点前面。移动是一次插入，不是先删除再创建。

锚点永远是**后一个新节点**的真实节点。为什么要倒着处理：`insertBefore` 需要一个已经在页面上的参照节点，并且这个节点必须已经在最终的位置。从后往前走，处理到某个节点时，它后面的所有节点都已经处理完，位置一定正确，可以放心地当锚点。如果从前往后走，后一个节点还没处理，它可能还在旧位置，甚至还没创建。

例子里，每一步之后页面上的真实节点：

| 步骤 | 处理的节点 | 做了什么 | 页面上的真实节点 |
|---|---|---|---|
| 开始 | | | `a b c d e f g` |
| 头尾同步、5.2 | a、b、g、f，以及 c、d、e | 只是 patch，没有 DOM 移动 | `a b c d e f g` |
| 5.4 | `h`（`newIndexToOldIndex` 是 0） | 新节点，挂载到后一个节点 `f` 前面 | `a b c d e h f g` |
| 5.4 | `d`（在最长递增子序列里） | 不动 | `a b c d e h f g` |
| 5.4 | `c`（在最长递增子序列里） | 不动 | `a b c d e h f g` |
| 5.4 | `e`（不在） | 移动到后一个节点 `c` 前面 | `a b e c d h f g` |

整个更新只有两次 DOM 操作：挂载 `h`，移动 `e`。如果没有最长递增子序列，就要把 `c`、`d`、`e` 都移动一遍。

<Figure caption="中间部分：每个新节点记下“旧下标 + 1”，得到 [5, 3, 4, 0]。0 表示没有旧节点。最长递增子序列（LIS）是 3、4，所以 c 和 d 不动。Vue 只移动 e，并挂载 h。">
<LongestIncreasingSubsequence />
</Figure>

<Lab id="lab-diff" title="实验台：逐步运行 diff" note="使用 Vue 源码的逻辑。你可以输入自己的列表。">
<template #predict>
<Sc predict :a="0">

先猜：旧列表 a b c d e f g，新列表 a b e c d h f g。Vue 移动几个已有节点？

<Opt>1 个，只移动 e</Opt>
<Opt>2 个，移动 c 和 d</Opt>
<Opt>3 个，移动 e、c、d</Opt>

<template #explain>

解析：头尾同步后，中间的旧顺序是 c d e，新顺序是 e c d h。c 和 d 在最长递增子序列中，所以不移动。只有 e 移到 c 前面。h 是新节点，需要挂载，不算移动。第二项和第三项没有使用最长递增子序列。打开实验台，选择“中间乱序”，点击“运行全部”。数橙色（移动）的节点。

</template>
</Sc>
</template>

<DiffSimulator />
</Lab>

实验台里的步骤和上面的表一一对应。可以输入自己的列表，看每一步之后页面上的节点顺序。

### 30.5 为什么是最长递增子序列

要把旧顺序变成新顺序，每移动一个节点就是一次 `insertBefore`。想少移动，就要让尽量多的节点**不动**。

哪些节点可以同时不动？如果 A、B 两个节点都不动，它们在页面上的相对位置就不会变：旧列表里 A 在 B 前面，新列表里 A 也必须在 B 前面。所以，不动的这组节点，必须在新旧两个列表里**相对顺序一致**。

`newIndexToOldIndex` 正好表达这件事：数组的下标是节点在新列表里的顺序，值是它在旧列表里的顺序。一组节点相对顺序一致，就是它们的值随着下标变大而变大，也就是这些位置构成一个**递增子序列**。不动的节点越多越好，所以要找**最长**的。其余节点各移动一次，这个次数已经是最少的。

- `[5, 3, 4, 0]`：最长递增子序列是 `3, 4`（0 是新节点，被跳过）。`c`、`d` 不动，`e` 移动。
- 旧 `a b c`，新 `b c a`：`[2, 3, 1]` 的最长递增子序列是 `2, 3`。`b`、`c` 不动，只把 `a` 移到最后，一次移动。
- 旧 `a b c d`，新 `d c b a`：`[4, 3, 2, 1]` 的最长递增子序列长度是 1。只有一个节点不动，其余三个都移动。

**怎样算。** 暴力做法是 O(n²)。Vue 的 `getSequence` 用贪心加二分查找，O(n log n)。思路一句话：从左到右读数，始终记住“每种长度的递增序列里，末尾最小的那个”。新读到的数比所有末尾都大，就接在最长的后面，序列变长。否则用二分查找第一个不小于它的末尾，把它换掉，让末尾尽量小，以后更容易接上去。每个数同时记下“它前面接的是谁”，最后从末尾往回找，就得到完整的序列。代码在下面的深入块。

**次数。** 中间部分的挂载和移动次数，等于中间部分的新节点数减去最长递增子序列的长度：不在序列里的已有节点各移动一次，每个新节点挂载一次。例子里中间部分的新节点是 `e c d h` 四个，序列长度是 2，所以是 4 − 2 = 2：移动 `e`，挂载 `h`。被卸载的旧节点另算，各卸载一次。

下面的练习实现第 5 步的决策。`getSequence` 已经给出，你来写 `patchUnknownSequence`：算映射、检测乱序、倒着挂载和移动。

<Exercise id="lisPlan" />

::: deep getSequence 源码，和与 Vue 2 双端比较的区别
```js
// Vue 源码中的 getSequence：贪心加二分查找，O(n log n)。返回 LIS 的下标
function getSequence(arr) {
  const p = arr.slice(), result = [0]
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    if (v === 0) continue                    // 0 表示新节点，跳过
    let j = result[result.length - 1]
    if (arr[j] < v) { p[i] = j; result.push(i); continue }
    let lo = 0, hi = result.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      arr[result[mid]] < v ? (lo = mid + 1) : (hi = mid)
    }
    if (v < arr[result[lo]]) {
      if (lo > 0) p[i] = result[lo - 1]
      result[lo] = i
    }
  }
  let u = result.length, v = result[u - 1]
  while (u-- > 0) { result[u] = v; v = p[v] }  // 回溯，得到正确的序列
  return result
}
```

`result` 存的是“每种长度的递增序列的末尾下标”，`p[i]` 是第 i 个数前面接的那个数的下标。读完后，`result` 里的值不一定是真正的序列（后来的数会替换前面的末尾），所以要用 `p` 从最后一个末尾回溯，把序列还原出来。

| 步骤 | 时间复杂度 |
|---|---|
| 头部和尾部比较 | O(n) |
| 建立 key 映射，填充 newIndexToOldIndex | O(n) |
| 最长递增子序列 | O(n log n) |
| 移动和挂载 | O(n) |

只有检测到乱序（`moved = true`）时才计算最长递增子序列。常见的追加、删除和头尾操作在前四步完成，整体是 O(n)。

**和 Vue 2 的区别。** 很多讲 diff 的资料针对 Vue 2。Vue 2 用四个指针做双端比较：旧头对新头、旧尾对新尾、旧头对新尾、旧尾对新头，四种都对不上时再按 key 查找。Vue 3 去掉了“交叉”的两种比较，改为头尾同步加最长递增子序列。

| | Vue 2 双端比较 | Vue 3 |
|---|---|---|
| 两端 | 头头、尾尾、头尾、尾头四种比较 | 只比较头头、尾尾 |
| 中间乱序 | 对不上时按 key 查找，逐个移动 | 最长递增子序列，不动的节点最多 |
| 移动次数 | 不保证最少 | 保证最少 |
:::

### 30.6 怎样写 key，和用 key 重建组件

**怎样写 key。** key 必须稳定，并且在同一层列表中唯一。使用数据的 id。

```html
<ul>
  <li v-for="t in tasks" :key="t.id">{{ t.text }} <input></li>
</ul>

<!-- <template v-for> 时，key 写在 template 上 -->
<template v-for="t in tasks" :key="t.id">
  <dt>{{ t.text }}</dt><dd>{{ t.note }}</dd>
</template>
```

**场景：新建的任务还没有服务器 id。** 在创建数据时生成 id，并保存在数据中。不要在渲染时生成 key。

```js
function addTask(text) {
  tasks.value.unshift({ id: crypto.randomUUID(), text })   // id 只生成一次，以后不变
}
```

**为什么不能用 index。** 30.3 看到了：没有 key，Vue 按位置复用节点。用 index 作 key，结果相同：key 跟着位置走，不跟着数据走。在头部插入一项，每一项的 index 都变了，Vue 认为 key 为 0 的节点还是同一个，复用它，只改内容。

<Figure caption="在头部插入 X。用 index 作为 key 时，Vue 把旧的第 0 行改为 X，输入框的值留在原处。用 id 时，Vue 新建 X，A 的行保持不变。虚线框是新挂载的行。">
<IndexKeyVsIdKey />
</Figure>

什么时候用 index 没问题：列表是静态的，不会插入、删除或排序，并且行里没有 DOM 状态和子组件的内部数据。

<Exercise id="diffKey" />

**用 key 强制重建组件。** 30.1 说过，key 不同的两个节点不是同一个节点。所以 key 不只用于列表。修改单个组件的 key，Vue 卸载旧组件，并创建新组件。新组件的内部状态全部重置。

**场景：切换任务时重置编辑面板。** TaskEditor 在 setup 中把任务标题复制到草稿。setup 只运行一次，所以切换任务后草稿不变。把任务 id 绑定为 key。id 改变时，Vue 卸载旧面板，并创建新面板。

```vue
<!-- TaskEditor.vue 中：const draft = ref(props.task.title) -->
<script setup>
const tasks = ref([{ id: 1, title: '写周报' }, { id: 2, title: '修复登录' }])
const selectedId = ref(1)
const selected = computed(() => tasks.value.find(t => t.id === selectedId.value))
</script>
<template>
  <TaskEditor :key="selectedId" :task="selected" />
</template>
```

**场景：一键重置筛选面板。** FilterPanel 内部有很多筛选状态。父组件不想逐个清空它们。用一个计数器作为 key。点击按钮时，计数器加 1，面板回到初始状态。

```vue
<script setup>
const resetKey = ref(0)
</script>
<template>
  <FilterPanel :key="resetKey" />
  <button @click="resetKey++">重置筛选</button>
</template>
```

只有一两个值要随 props 更新时，不要改 key。用 watch 侦听 props，更新这几个值。原因：改 key 会重建整个子树，组件中的请求也重新运行。

::: pitfalls 注意：不要用 index 作为 key
1. 列表会插入、删除或排序时，用数据的 id 作为 key。原因：头部插入一项后，每一项的 index 都改变。Vue 按 index 复用旧节点，只修改内容，并在末尾挂载一个新节点。输入框的状态因此留在错误的行（见上图）。静态的、不重新排序的列表可以使用 index。
2. 子组件有内部数据时，更不要用 index 作为 key。原因：内部数据属于被复用的旧组件实例。它不随新的 props 改变，所以显示在错误的行。
3. 不要用 `Math.random()` 作为 key。原因：每次渲染，key 都不同。Vue 因此删除并重新创建所有节点。
:::

::: selfcheck
<Sc :a="2">

旧列表是 `a b c d`，新列表是 `a b c d e`。Vue 怎样更新？

<Opt>计算 LIS，然后移动节点</Opt>
<Opt>卸载全部旧节点，挂载 5 个新节点</Opt>
<Opt>头部同步 a 到 d，然后挂载 e</Opt>

<template #explain>

解析：头部比较在 a 到 d 都成功。旧列表比较完，新列表剩下 e，Vue 挂载 e。没有乱序部分，所以不计算 LIS。

</template>
</Sc>

<Sc :a="0">

旧列表是 `a b c`，新列表是 `b c a`。Vue 移动几次 DOM 节点？

<Opt>1 次</Opt>
<Opt>2 次</Opt>
<Opt>3 次</Opt>

<template #explain>

解析：头尾比较都失败。映射是 [2, 3, 1]，LIS 是 2、3，对应 b 和 c。b 和 c 不动。Vue 只把 a 移到最后，共 1 次。

</template>
</Sc>

<Sc :a="1">

每行有一个输入框。你在 A 行输入 aaa，然后在头部插入 X。key 是 index。aaa 显示在哪一行？

<Opt>A 行</Opt>
<Opt>X 行</Opt>
<Opt>输入框被清空</Opt>

<template #explain>

解析：插入后，X 的 key 是 0，和旧的 A 行相同。Vue 复用 A 行的 DOM，只修改文字。输入框的值属于 DOM，所以 aaa 留在 X 行。使用数据的 id 作为 key 可以避免这个问题。

</template>
</Sc>

<Sc :a="1">

回顾（第 28 章）：渲染函数写 `list.map(t => h('li', t))`，没有写 key。list 从 b c 变为 a b c。Vue 怎样更新？

<Opt>在头部新建一个 li，其他不动</Opt>
<Opt>改前两个 li 的文字，再新建一个</Opt>
<Opt>删除所有 li，再新建三个 li</Opt>

<template #explain>

解析：没有 key 时，Vue 按位置比较。第 1 个 li 从 b 改为 a，第 2 个从 c 改为 b，最后新建 c。只有写了 key，Vue 才能识别出 b 和 c 没有变，只在头部插入 a。Vue 也不会删除全部再重建。所以渲染函数中的列表同样要写 key。

</template>
</Sc>

<Sc :a="2">

一个 `div` 的旧子节点是文字 `'a'`，新子节点是数组 `[h('p', 'x')]`。`patchChildren` 怎样更新？

<Opt>把文字 a 改成 p 元素，复用同一个文本节点</Opt>
<Opt>对文字和数组做 diff，找出最少的修改</Opt>
<Opt>先清空元素里的文字，再挂载数组里的节点</Opt>

<template #explain>

解析：新旧子节点的类型不同，不需要 diff。只有“数组对数组”才比较。旧的是文字时，先把元素的文字清空，再把新数组里的节点挂载进去。第一项把文字节点当成元素复用，两者类型不同。第二项想对类型不同的子节点做 diff，diff 只发生在两个数组之间。

</template>
</Sc>

<Sc :a="0">

keyed diff 的第 5 步为什么从新列表的末尾向前处理中间部分的节点？

<Opt>移动或挂载一个节点要插到“后一个新节点”前面，从后往前时，后一个节点已经在正确位置，可以当锚点</Opt>
<Opt>从后往前遍历数组比从前往后快</Opt>
<Opt>最长递增子序列只能从后往前计算</Opt>

<template #explain>

解析：`insertBefore` 需要一个参照节点，这个节点要已经在最终位置。倒序处理保证后一个节点已经就位。第二项错在遍历方向不影响速度。第三项错在 `getSequence` 在倒序循环之前就算完了，方向和它无关。

</template>
</Sc>

<Sc :a="1">

把 `<div key="1">` 改成 `<div key="2">`，其他完全不变。`patch` 怎样处理？

<Opt>复用同一个 div，只把 key 改成 2</Opt>
<Opt>卸载旧的 div，创建并挂载新的 div</Opt>
<Opt>复用同一个 div，并重新创建它的子节点</Opt>

<template #explain>

解析：`isSameVNodeType` 同时比较 `type` 和 `key`。key 不同就不是同一个节点，所以旧节点被卸载，新节点被挂载，旧 div 的真实节点和它的状态都丢掉。这正是“用 key 重建组件”的原理。第一项以为 key 只是标签。第三项以为是同一个节点，其实整个节点都不同。

</template>
</Sc>

:::

::: summary
- 更新一个元素：先用 `isSameVNodeType` 判断是不是同一个节点（type 和 key 都相同）。不是，卸载旧的、挂载新的；是，复用真实节点，更新子节点，再对比 props。
- `patchChildren` 按新旧子节点是文字、数组还是没有分流。只有“数组对数组”才 diff：有 key 走 `patchKeyedChildren`，没有 key 按下标比较。
- 没有 key 或用 index 作为 key 时，Vue 按位置复用节点。插入和排序会让输入框、子组件的状态错位。
- 有 key 的五个步骤：头部同步、尾部同步（先处理两端不变的）、旧的比完了挂载新的、新的比完了卸载旧的、乱序区用 key 映射加最长递增子序列。
- LIS 里的节点相对顺序已经正确，不动，DOM 移动次数最少。从后往前处理新节点，后一个节点已就位，可以当锚点。
- key 必须稳定并且唯一，用数据的 id，在创建数据时生成。修改组件的 key 可以重建组件、重置状态。
:::
