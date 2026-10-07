---
title: 虚拟 DOM 与 diff
id: diff
stage: 3
chapter: 16
desc: 头尾同步 + 最长递增子序列
---

<script setup>
import HeadTailSync from '../figures/16-diff/HeadTailSync.vue'
import LongestIncreasingSubsequence from '../figures/16-diff/LongestIncreasingSubsequence.vue'
import IndexKeyVsIdKey from '../figures/16-diff/IndexKeyVsIdKey.vue'
import DiffSimulator from '../labs/16-diff/DiffSimulator.vue'
</script>

# 虚拟 DOM 与 diff：有 key 的列表

::: goals
<Goal checks="sc:0">说出 Vue3 列表 diff 的五个步骤。</Goal>
<Goal checks="sc:1">说明最长递增子序列（LIS）的作用。</Goal>
<Goal checks="sc:2,ex:diffKey,ex:fbDiff,ex:phenoSort">说明不能用 index 作为 key 的原因。</Goal>

:::

::: rt
阅读主线约 9 分钟，深入内容约 2 分钟（可选）。另外留时间做实验台、练习和自测。
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
: 判断新旧节点是不是同一个节点的标识。

最长递增子序列（LIS）
: 按原顺序挑出的、逐个变大的最长一组数。
:::

::: why
你用 index 作为 key，然后在列表开头插入一项。每一行输入框中的文字都错位了。

原因：Vue 用 key 判断新旧节点是不是同一个。key 错了，Vue 就复用了错误的节点。

本章说明 diff 算法。它用 key 找到可以复用的节点，并尽量少移动 DOM。
:::

### 16.1 给列表项写 key

Vue 用 key 判断新旧节点是不是同一个节点。key 相同时，Vue 复用旧节点的 DOM。所以 key 必须稳定，并且在列表中唯一。使用数据的 id。

```html
<ul>
  <li v-for="t in tasks" :key="t.id">{{ t.text }} <input></li>
</ul>

<!-- <template v-for> 时，key 写在 template 上 -->
<template v-for="t in tasks" :key="t.id">
  <dt>{{ t.text }}</dt><dd>{{ t.note }}</dd>
</template>
```

**场景：新建的任务还没有服务器 id。**在创建数据时生成 id，并保存在数据中。不要在渲染时生成 key。

```js
function addTask(text) {
  tasks.value.unshift({ id: crypto.randomUUID(), text })   // id 只生成一次，以后不变
}
```

key 用错时，行的状态会错位。16.4 说明原因。下面先看 Vue 怎样用 key 更新列表。

### 16.2 列表 diff 的五个步骤

有 key 的列表改变时，`patchKeyedChildren` 按下面的步骤工作：

1. 从头开始比较。key 相同时，patch 节点。key 不同时，停止。
2. 从尾开始比较。规则和第 1 步相同。
3. 如果旧列表已经比较完，挂载剩余的新节点。
4. 如果新列表已经比较完，卸载剩余的旧节点。
5. 对中间的乱序部分：
   1. 建立 `key → 新索引` 映射。
   2. 计算 `newIndexToOldIndex` 数组。
   3. 计算这个数组的最长递增子序列。
   4. 不移动 LIS 中的节点，因为它们的相对顺序已经正确。移动或创建其他节点。

下图用一个例子说明第 5 步。

<Figure caption="头尾同步：第 1 步从头比较，a、b 的 key 相同，Vue 直接 patch。第 2 步从尾比较，g、f 也直接 patch。剩下中间部分：旧 c d e，新 e c d h。">
<HeadTailSync />
</Figure>

<Figure caption="中间部分：每个新节点记下“旧下标 + 1”，得到 [5, 3, 4, 0]。0 表示没有旧节点。最长递增子序列（LIS）是 3、4，所以 c 和 d 不动。Vue 只移动 e，并挂载 h。">
<LongestIncreasingSubsequence />
</Figure>

LIS 中的节点相对顺序没有改变。所以 DOM 移动次数最少。

第 5.4 步从新列表的末尾向前处理。每个节点的参照物（anchor）是它后面那个新节点的 DOM。后面的节点已经处理完，位置一定正确。处理一个节点时有三种情况：

- `newIndexToOldIndex` 为 0：这是新节点。Vue 把它挂载到参照物前面。
- 节点在 LIS 中：不动。
- 其他节点：Vue 用 `insertBefore(el, anchor)` 把它移到参照物前面。移动也是一次插入，不是先删除再创建。

上例的中间部分从 h 开始倒着处理：h 是新节点，挂载到 f 前面。d 和 c 在 LIS 中，跳过。e 不在 LIS 中，移到 c 前面。

有两个细节：

- 遍历旧节点时，如果一个节点在新列表中的位置比前面已处理的某个节点更靠前，Vue 才记 `moved = true`。只有 `moved` 为 true 时才计算 LIS。没有乱序时，已有节点都不动。
- 新列表中间部分的节点都找到旧节点后，剩下的旧节点直接卸载，不再查映射表。

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

::: deep getSequence 源码和复杂度
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

| 步骤 | 时间复杂度 |
|---|---|
| 头部和尾部比较 | O(n) |
| 建立 key 映射，填充 newIndexToOldIndex | O(n) |
| 最长递增子序列 | O(n log n) |
| 移动和挂载 | O(n) |

只有检测到乱序（moved = true）时，Vue 才计算 LIS。常见的追加、删除和头尾操作在前四步完成，复杂度为 O(n)。

中间部分的 DOM 操作次数是：中间节点数 − LIS 长度。每个不在 LIS 中的已有节点移动一次，每个新节点挂载一次。上例是 4 − 2 = 2：移动 e，挂载 h。
:::

### 16.3 修改 key，重建组件

patch 的第一步是判断新旧节点是不是同一个节点：

```js
function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key
}
// type 不同（例如 div 换成 p，或者 CompA 换成 CompB）：卸载旧节点，挂载新节点
// type 相同，key 不同：同样卸载再挂载
```

所以 key 不只用于列表。修改单个组件的 key，Vue 卸载旧组件，并创建新组件。新组件的内部状态全部重置。

**场景：切换任务时重置编辑面板。**TaskEditor 在 setup 中把任务标题复制到草稿。setup 只运行一次，所以切换任务后草稿不变。把任务 id 绑定为 key。id 改变时，Vue 卸载旧面板，并创建新面板。

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

**场景：一键重置筛选面板。**FilterPanel 内部有很多筛选状态。父组件不想逐个清空它们。用一个计数器作为 key。点击按钮时，计数器加 1，面板回到初始状态。

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

### 16.4 没有 key 或用 index 作为 key

模板中的 `v-for` 没有写 key 时，Vue 使用 `patchUnkeyedChildren`。它按下标比较：

1. 取新旧列表长度的较小值 n。
2. 按下标 patch 前 n 个节点。
3. 旧列表更长时，卸载多余的节点。
4. 新列表更长时，挂载多出的节点。

这个算法从不移动节点。列表只在尾部增删时，它很快。在头部插入时，每个下标对应的数据都变了。所以每个节点的内容都要修改。

手写 `h()` 时情况不同。编译器给没有 key 的 v-for 片段加上 `UNKEYED_FRAGMENT`（256）标记，Vue 根据这个标记选择 patchUnkeyedChildren。手写 h() 返回的子节点数组没有这个标记，所以 Vue 仍然使用 patchKeyedChildren（16.2 节）。所有 key 都是 null，第 1 步"从头部同步"按位置逐个 patch。节点类型都相同时，结果和按下标比较相同：节点按位置复用，不跟着数据移动。

用 index 作为 key 时，结果相同。key 跟着位置走，不跟着数据走。所以 Vue 按位置复用节点。下图说明用 index 作为 key 时在头部插入一项的结果。

<Figure caption="在头部插入 X。用 index 作为 key 时，Vue 把旧的第 0 行改为 X，输入框的值留在原处。用 id 时，Vue 新建 X，A 的行保持不变。虚线框是新挂载的行。">
<IndexKeyVsIdKey />
</Figure>

<Exercise id="fbDiff" />

<Exercise id="diffKey" />

<Exercise id="phenoHeight" />

<Exercise id="phenoSort" />

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

回顾（第 14 章）：渲染函数写 `list.map(t => h('li', t))`，没有写 key。list 从 b c 变为 a b c。Vue 怎样更新？

<Opt>在头部新建一个 li，其他不动</Opt>
<Opt>改前两个 li 的文字，再新建一个</Opt>
<Opt>删除所有 li，再新建三个 li</Opt>

<template #explain>

解析：没有 key 时，Vue 按位置比较。第 1 个 li 从 b 改为 a，第 2 个从 c 改为 b，最后新建 c。只有写了 key，Vue 才能识别出 b 和 c 没有变，只在头部插入 a。Vue 也不会删除全部再重建。所以渲染函数中的列表同样要写 key。

</template>
</Sc>

:::

::: summary
- key 必须稳定并且唯一。使用数据的 id，在创建数据时生成。
- 五个步骤：头部比较、尾部比较、挂载、卸载、乱序部分用 LIS。
- LIS 中的节点不移动。DOM 移动次数最少。
- type 或 key 不同时，Vue 卸载再挂载。修改 key 可以重建组件、重置状态。
- 没有 key 或用 index 作为 key 时，Vue 按位置复用节点。插入和排序会让状态错位。
:::
