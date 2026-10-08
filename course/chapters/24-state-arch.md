---
title: 状态归属与规模化
id: state-arch
stage: 5
chapter: 24
desc: 一份状态放在哪里：组件、store、URL、请求缓存，以及应用变大后怎样组织
---

<script setup>
import PlaceThreeWays from '../labs/24-state-arch/PlaceThreeWays.vue'
</script>

# 状态归属与规模化

::: goals
<Goal checks="sc:0">按“谁读写、能否算出、真相在哪、是否要还原”这几个问题，判断一份状态放在哪里。</Goal>
<Goal checks="sc:1,sc:5,ex:singleSource">说明重复存储为什么导致不一致，并改成单一数据源加派生。</Goal>
<Goal checks="ex:urlFilter">把筛选条件放进 URL 查询串，并让前进、后退和分享链接都可用。</Goal>
<Goal checks="sc:4">区分服务端状态和客户端状态，判断什么时候交给请求缓存库。</Goal>
<Goal checks="sc:2,sc:3">说明模块级共享状态在 SSR 下的风险，以及 store 互相引用时的规则。</Goal>

:::

::: rt
阅读主线约 14 分钟，深入内容约 3 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
状态的归属像**整理物品**。常用的笔放在手边（组件），全家都用的剪刀放在客厅（store），要告诉别人的地址写在门牌上（URL）。快递站取来的包裹（服务端状态）不算你的东西：它会过期，要定期去换。
:::

::: terms
状态归属
: 一份状态存放的位置，它决定谁能读写它，以及它活多久。

单一数据源
: 每个事实只在一个地方写入，其他地方都从它读取或算出。

派生状态
: 能由别的状态算出来的值。用 `computed` 或 getter 表示，不单独存储。

服务端状态
: 真相在服务器上的数据。客户端只持有一份会过期的缓存。

规范化
: 把实体按 id 存一份，实体之间和列表里只存 id。
:::

::: why
你做了一个任务看板。同事发来一个链接：“看看这个筛选结果”。你点开，看到的是全部任务。你刷新页面，自己的筛选也丢了。侧边栏写“已完成 3 项”，列表里却有 4 项打勾。切到别的页面再回来，任务列表又请求了一次。

原因只有两种：同一份状态放错了地方，或者同一个事实存了两份。

本章不教新的 API。它教一套判断：拿到一份状态，按几个问题决定放在哪里。应用变大后，再用派生、规范化和 store 拆分让它保持清楚。
:::

### 24.1 状态有七个归宿

前面几章各讲了一种放状态的办法。下表把它们放在一起，再加上第七种：服务端状态。

| 归宿 | 例子 | 活多久 | 代价 |
|---|---|---|---|
| 组件的 `ref` | 输入框草稿、弹窗开关 | 随组件 | 最小。默认选它 |
| 提升到共同父组件 | 两个兄弟共用的选中项 | 随父组件 | props 向下、emit 向上，层数多了要逐层转交（第 5 章） |
| `provide / inject` | 主题、表单上下文 | 随提供者的子树 | 只在子树内共享，来源不直观（第 5 章） |
| 组合式函数里的共享状态 | 写在函数外的 `ref` | 随进程 | 隐式单例，SSR 下有风险（24.6） |
| Pinia store | 登录用户、购物车 | 随应用 | 所有页面耦合到它，不随组件卸载（第 22 章） |
| URL | 筛选、排序、页码、选中的 id | 随地址 | 只能放小而可序列化的值（第 23 章） |
| 服务端状态 | 任务列表、用户资料 | 在服务器上 | 会过期，要缓存、去重、失效（24.5） |

表里的顺序也是“范围”的顺序。默认放在离使用方最近的地方。出现具体需求才向外移一格：兄弟要共享、刷新要保留、跨页面使用。每向外移一格，就多一份耦合，也多一份要管理的生命周期。

### 24.2 用六个问题决定归属

按顺序问下面的问题。第一个回答“是”的，就是答案。

| 顺序 | 问题 | 回答“是”时 |
|---|---|---|
| 1 | 它能由别的状态算出来吗？ | 不存储。写成 `computed` 或 getter（24.3） |
| 2 | 它的真相在服务器上吗？ | 服务端状态，交给请求缓存（24.5） |
| 3 | 刷新页面或发出链接后，要还原吗？ | 能放进 URL 就放 URL（24.4）；放不进的存 localStorage |
| 4 | 只有一个组件读写它吗？ | 组件的 `ref` |
| 5 | 使用方都在同一棵子树里吗？ | 父子或兄弟：提升到父组件。隔了很多层：`provide / inject` |
| 6 | 多个页面读写，或要比组件活得久吗？ | Pinia store |

用 4 个场景走一遍：

**场景：列表的排序方式。**不是算出来的，真相不在服务器。刷新和分享都要还原：放 URL。

**场景：任务列表。**真相在服务器，别人也能改它：服务端状态。不要在 store 里放一份 `tasks` 当作真相。

**场景：“新建任务”弹窗里的草稿。**前三问都回答“否”，只有一个组件使用：组件的 `ref`。放进 store 的话，关掉弹窗后草稿还在（第 22 章“注意”第 3 条）。

**场景：购物车角标上的数量。**它能由 `items` 算出来：写成 getter，不另存一个 `count`。

### 24.3 派生而不存储

同一个事实存两份，迟早不一致。

```js
const tasks = ref([])
const doneCount = ref(0)                         // 这个数能从 tasks 算出来
function toggle(t) { t.done = !t.done; doneCount.value += t.done ? 1 : -1 }
function load(list) { tasks.value = list }       // 忘了更新 doneCount
```

`load` 一个有 3 项已完成的新列表后，`doneCount` 仍是 0。每多一个修改 `tasks` 的地方，就多一个要记得同步的地方。

解决办法是**单一数据源**：事实只写在 `tasks` 里，计数用 `computed` 算出来。

```js
const doneCount = computed(() => tasks.value.filter(t => t.done).length)
```

setup store 里的 getter 就是 `computed`（第 22 章）。

**场景：选中的任务。**很多代码在选中时存一个对象副本：`selected.value = { ...task }`。任务改名后，副本还是旧名字。只存 `selectedId`，再写 `selected = computed(() => byId[selectedId])`，就永远是最新的。

注意：不要用 `watch` 把一个状态同步到另一个状态。`watch` 适合副作用，例如保存和请求（第 22 章“注意”第 4 条）。同步数据要用 `computed`。

### 24.4 URL 是状态

筛选条件放在组件的 `ref` 里，会有三个问题：刷新就丢，链接分享不了，后退按钮没有用。把它放进 URL 查询串，三个问题一起解决。

第 23 章“23.4 编程式导航和 query”已经写过读写 `route.query` 的代码。这里补上设计规则：

- **地址是唯一的数据源。**不要把 `route.query` 复制进 `ref` 再同步，否则又有两份。直接用可写的 `computed` 读写。
- **只放小而可序列化的值：**筛选、排序、页码、选中的 id、当前标签页。草稿、大对象和敏感信息不放。URL 会进入历史记录和日志。
- **值是字符串。**数字要转换。同名参数出现多次时，值是数组。写成 `?a=1&a=2` 读到的是 `['1', '2']`，没有值的 `?b` 读到 `null`。
- **连续输入用 `replace`，有意义的切换用 `push`。**这样后退按钮能回到上一个筛选，不是上一个字母。
- **用 `undefined` 删除参数。**空字符串会留下 `kw=`。

下面的实验台把同一个筛选条件放在三个地方，并排比较。

<Lab id="demo-place" title="实验台：同一个筛选条件放在三个地方" note="三个做法用同一套输入框、徽标和列表；更新次数是各组件 onUpdated 的计数">
<template #predict>
<Sc predict :a="1">

先猜：在三个输入框里各输入“vue”，再点“模拟刷新页面”。刷新后，三个筛选条件各是什么？

<Opt>三个都清空，页面重新开始</Opt>
<Opt>只有 URL 做法保留“vue”</Opt>
<Opt>URL 做法和 Pinia store 做法保留“vue”</Opt>

<template #explain>

解析：刷新会丢掉浏览器内存里的一切。组件的 `ref` 和 Pinia 的 state 都在内存里，所以随页面一起丢。只有地址栏里的查询串还在。想让 store 的数据在刷新后保留，要另外写持久化（第 22 章的持久化插件）。第三项把 store 当成了持久存储。

</template>
</Sc>
</template>

<PlaceThreeWays />
</Lab>

观察三件事。第一，只有 URL 做法在刷新后保留，并且能用“后退”回到点预设按钮之前。第二，“提升到父组件”做法里，不使用筛选条件的中间层也会更新，因为它要转交 `kw`。另外两个做法里它的更新次数是 0。第三，三个做法里输入框、徽标和列表的更新次数一样。Vue 按依赖追踪更新，哪些组件重新渲染取决于谁读取了这份状态，不取决于状态存放在哪里。归属的选择，主要影响生命周期、共享范围和耦合程度。

练习用迷你地址栏模拟路由，和第 23 章的练习是同一类办法。

<Exercise id="urlFilter" />

### 24.5 服务端状态不是客户端状态

先看一段很常见的代码：

```js
onMounted(async () => { store.tasks = await api.getTasks() })
```

它在小页面里能用。应用变大后，会遇到这些问题：三个组件各调一次，发出三个请求；切到别的页面再回来，要么重新请求，要么显示不知道多旧的数据；加载中和失败的状态要每处手写；提交修改后，要手动想办法刷新列表。

根本原因是：任务列表**不属于客户端**。真相在服务器上，别人也能改它。客户端持有的只是一份会过期的缓存。管理缓存需要这些能力：

| 能力 | 要解决的问题 |
|---|---|
| 缓存 | 回到页面时先显示已有数据 |
| 去重 | 多个组件读同一份数据，只发一次请求 |
| 失效 | 数据被修改后，标记过期并重新取 |
| 重试与后台刷新 | 失败后重试；窗口重新获得焦点时更新 |
| 乐观更新 | 先改界面，请求失败再回滚 |

这类能力通常交给专门的库，不手写，也不塞进 Pinia。截至 2026 年 10 月，Vue 生态里常用的是两个：TanStack Query 的 Vue 版（`@tanstack/vue-query`，当前 5.104.1）和 Pinia Colada（`@pinia/colada`，当前 1.4.7，建立在 Pinia 之上，要求 Vue 3.5.41 或更高）。两者的基本用法相近：

```js
// @tanstack/vue-query
const { data, isPending } = useQuery({ queryKey: ['tasks'], queryFn: api.getTasks })

// @pinia/colada
const { data, isPending } = useQuery({ key: ['tasks'], query: api.getTasks })
```

同一个 key 在多个组件里使用，缓存里只有一份，同时挂载只发一次请求。用 Vue 3.5.43 实测，两个库都是这样。

**场景：添加任务，并立即显示。**用 `useMutation`。`onMutate` 里先取消进行中的请求，保存旧数据（快照），再把新任务写进缓存。失败时用快照回滚。无论成败，最后都让这个 key 失效，重新取一次真实数据：

```js
// @tanstack/vue-query
const qc = useQueryClient()
const add = useMutation({
  mutationFn: api.addTask,
  onMutate: async task => {
    await qc.cancelQueries({ queryKey: ['tasks'] })          // 避免进行中的请求覆盖乐观数据
    const prev = qc.getQueryData(['tasks'])                  // 快照
    qc.setQueryData(['tasks'], old => [...old, task])        // 先改界面
    return { prev }
  },
  onError: (_e, _task, ctx) => qc.setQueryData(['tasks'], ctx.prev),   // 回滚
  onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] })       // 重新取真实数据
})
```

**什么时候该用库？**同一份数据在多处读取，或需要失效、重试、乐观更新，就该用。只在一个组件里读一次，写一个 `useFetch` 组合式函数就够。用了库之后，规则是：这份数据只住在库的缓存里，不要再复制进 Pinia（24.3 的单一数据源）。Pinia 留给真正属于客户端的状态：登录会话、界面偏好、没提交的草稿。

::: deep 一个 25 行的请求缓存
下面的迷你实现展示去重和失效的原理。真实的库还有过期时间、重试、垃圾回收和 SSR 支持。

```js
const entries = new Map()                               // key → { data, loading, promise, fn }
function load(e) {                                      // 同一个 key 同时只有一个请求
  if (e.promise) return e.promise                       // 去重：已有请求在路上，直接共用
  e.loading.value = true
  e.promise = e.fn()
    .then(d => { e.data.value = d })
    .finally(() => { e.promise = null; e.loading.value = false })
  return e.promise
}
function useQuery(key, fn) {
  const k = JSON.stringify(key)
  const e = entries.get(k) ?? entries.set(k, { data: ref(), loading: ref(false), promise: null, fn }).get(k)
  if (e.data.value === undefined) load(e)              // 缓存里没有才请求
  return { data: e.data, loading: e.loading }
}
function invalidate(key) {                              // 失效：保留旧数据，同时重新取
  const e = entries.get(JSON.stringify(key))
  if (e) load(e)
}
```

两个组件用同一个 key 调用 `useQuery`，拿到的是同一个 `data`，`fn` 只执行一次。调用 `invalidate` 的瞬间，`data` 仍是旧值，`loading` 变为 `true`。请求完成后，所有使用这个 key 的组件一起更新。
:::

### 24.6 模块级共享状态的陷阱

第 9 章的组合式函数每次调用都创建新的 `ref`，所以每个组件有自己的一份。有人为了“共享”，把 `ref` 写到函数外面：

```js
const cart = ref([])                                 // 在模块顶层：整个进程只有一份
export function useCart() {
  return { cart, add: item => cart.value.push(item) }
}
```

在浏览器里，一个页面只服务一个用户，它能工作。但它是**隐式单例**，有两个风险：测试之间互相污染；SSR 下，服务器进程要处理很多用户的请求，模块只加载一次，所有请求共用这个 `cart`。

用 `renderToString` 连续渲染两个请求。两次都往购物车里加当前用户：

```js
const a = await renderToString(createSSRApp(Page, { user: 'alice' }))   // <p>alice</p>
const b = await renderToString(createSSRApp(Page, { user: 'bob' }))     // <p>alice,bob</p>
```

第二个用户的页面里出现了第一个用户的数据。这是真实的跨请求污染，也是数据泄露。

修复办法是让状态跟着“应用实例”走，不跟着“模块”走。把 `ref` 移进函数里；或者用 Pinia：每个请求创建一个新的 pinia（第 29 章“29.4 在服务器上获取数据，并传给浏览器”的第 1 步）。同样两次渲染，用 Pinia 得到的是 `<p>alice</p>` 和 `<p>bob</p>`。Nuxt 的 `useState` 也是为这个目的设计的。

结论：想在组件之间共享，用 `provide / inject` 或 Pinia。不要用模块级的 `ref`，除非它是不含用户数据的常量或缓存。

### 24.7 store 的拆分与组合

store 变多后，有三条规则。

**按领域拆，不按页面拆。**`auth`、`tasks`、`cart` 是领域；“看板页 store”不是。页面会变，领域不会。

**store 里放领域数据和操作它的 action，不放界面状态。**弹窗开关、悬停项、当前标签页通常只有一个页面使用，放在组件或 URL（24.4）。例外是需要跨页面保留的界面状态，例如侧边栏是否折叠。

**store 之间单向依赖。**`cart` 可以读 `user`，`user` 不应该读 `cart`。在 setup store 里，在顶层调用 `useUserStore()` 取得引用（第 22 章“22.6 在组件之外和其他 store 中使用 store”），读它的 state 要放在 `computed` 或 action 里。

必须互相引用时，会遇到循环依赖。Pinia 不报错，结果取决于谁先创建：

```js
const useA = defineStore('a', () => { const b = useB(); const x = ref(1); const init = b.x; return { x, init } })
const useB = defineStore('b', () => { const a = useA(); const x = ref(2); const init = a.x; return { x, init } })

const a = useA()
const b = useB()
console.log(a.init, b.init)    // 2 undefined
```

`useA()` 先运行，它在 setup 里调用 `useB()`。`useB()` 再调用 `useA()` 时，`a` 还没有创建完，拿到一个空壳，`a.x` 是 `undefined`。所以 `b.init` 是 `undefined`，而且没有任何报错。

如果两个读取都放进 `computed` 或 action，它们运行时两个 store 都已创建完成，就没有问题。更好的办法是消除环：把共同依赖的部分抽成第三个 store。

解构时仍要用 `storeToRefs`，否则丢失响应性（第 22 章“22.2 在组件中解构 store：storeToRefs”）。

### 24.8 规模化：按 id 规范化

任务只有 10 条时，用数组存很方便。到了几千条，有三个问题：按 id 查找要遍历；同一个实体可能在多个数组里各存一份；服务器返回新列表时，整个数组被替换。

最后一点有直接的代价。用 Vue 3.5.43 实测：100 个行组件，每个接收一个任务对象。服务器返回新列表，其中只有 1 项变化。

| 更新方式 | 行组件更新次数 |
|---|---|
| `tasks.value = freshList`（整个替换） | 100 |
| `Object.assign(byId[t.id], t)`（按 id 合并） | 1 |

整个替换时，每一行拿到的都是新对象，所以全部更新。按 id 合并时，Vue 只在属性值真的变化时触发更新，未变化的行不动。

**规范化**的做法是：每种实体按 id 存一份，列表和关系只存 id。

```js
// 接口返回的嵌套数据：作者在每条评论里各有一份
// [{ id: 'c1', text: '…', author: { id: 'u1', name: '小林' } }, …]

// 规范化之后
{
  users:    { u1: { id: 'u1', name: '小林' } },
  comments: { byId: { c1: { id: 'c1', text: '…', authorId: 'u1' } }, ids: ['c1'] }
}
```

在 store 里用 getter 把它们组合回来：

```js
export const useTaskStore = defineStore('tasks', () => {
  const byId = ref({})                                    // 实体表
  const ids = ref([])                                     // 顺序
  const selectedId = ref(null)                            // 选中项只存 id
  const list = computed(() => ids.value.map(id => byId.value[id]))
  const selected = computed(() => byId.value[selectedId.value] ?? null)
  function load(items) {                                  // 按 id 合并，不整体替换
    for (const t of items) byId.value[t.id] = Object.assign(byId.value[t.id] ?? {}, t)
    ids.value = items.map(t => t.id)
  }
  return { byId, ids, selectedId, list, selected, load }
})
```

规范化的规则：实体只存一份；列表存 id；关系存 id；选中项存 id；删除实体时，同时清理 `ids` 和所有指向它的 id。

大型应用里，规范化只解决“数据只有一份”。组件层面的更新范围怎么控制，见第 26 章“26.2 传递稳定的 props”和“26.4 减少响应式的开销”。store 怎么测试，见第 27 章“27.7 测试组合式函数、store 和完整流程”：每个测试前创建新的 pinia。

::: deep 把嵌套数据拆成实体表
接口返回嵌套数据时，在写入 store 之前先拆开。下面的函数把评论拆成用户表和评论表：

```js
function normalize(comments) {
  const users = {}, byId = {}, ids = []
  for (const c of comments) {
    users[c.author.id] = c.author                                    // 同一个作者只留一份
    byId[c.id] = { id: c.id, text: c.text, authorId: c.author.id }   // 评论里只存 authorId
    ids.push(c.id)
  }
  return { users, comments: { byId, ids } }
}
```

两条评论有同一个作者时，`users` 里只有一份。作者改名只改这一处，所有评论自然显示新名字。
:::

最后一个练习把本章的几条规则放在一起：消除重复存储，选中项只存 id，其余都派生。

<Exercise id="singleSource" />

::: pitfalls
1. 不要把能算出来的值存成状态。写成 `computed` 或 getter。原因：存两份，迟早有一份不更新。
2. 不要把 `route.query` 复制进 `ref`。直接从地址算出来，修改时 `push` 或 `replace`。原因：两份数据不会自动同步。
3. 不要把接口数据复制进 Pinia 当作真相。让请求缓存持有它。原因：缓存库的失效和去重只对它自己的缓存有效。
4. 不要在模块顶层放含用户数据的 `ref`。原因：SSR 下，所有请求共用同一个模块，数据会泄露给别的用户。
5. 不要让两个 store 在 setup 顶层互相读取 state。读取放进 `computed` 或 action。原因：先创建的 store 会读到 `undefined`，而且没有报错。
:::

::: selfcheck
<Sc :a="2">

商品列表页有一个排序方式“价格升序”。产品要求：刷新页面后保留，并且能把链接发给同事看到相同的排序。它应该放在哪里？

<Opt>列表组件的 `ref`，用户选择后保存在组件里</Opt>
<Opt>Pinia store 的 state，所有页面都能读</Opt>
<Opt>URL 查询串，例如 `?sort=price`</Opt>

<template #explain>

解析：刷新会丢掉内存，同事打开链接时也拿不到你内存里的任何东西。只有地址里的内容能同时做到“刷新后保留”和“分享后相同”。Pinia 的 state 也在内存里；就算再加持久化，把数据存进 localStorage，也只对你自己的浏览器有效，分享不了。

</template>
</Sc>

<Sc :a="1">

下面的代码运行后，`doneCount.value` 是多少？

```js
const tasks = ref([])
const doneCount = ref(0)
function toggle(t) { t.done = !t.done; doneCount.value += t.done ? 1 : -1 }
function load(list) { tasks.value = list }

load([{ id: 1, done: true }, { id: 2, done: true }, { id: 3, done: false }])
```

<Opt>2，Vue 自动重新计算</Opt>
<Opt>0，`load` 没有更新它</Opt>
<Opt>3，等于 `tasks` 的长度</Opt>

<template #explain>

解析：`doneCount` 是一个独立的 `ref`，只在 `toggle` 里被修改。`load` 替换了 `tasks`，却没人更新计数，所以仍是 0。这就是重复存储。改成 `computed(() => tasks.value.filter(t => t.done).length)` 后永远一致。第一项把 `ref` 当成了会自动派生的值，只有 `computed` 才会。

</template>
</Sc>

<Sc :a="0">

服务器进程用下面的模块渲染两个请求，先 `alice` 后 `bob`。第二个请求渲染出的 HTML 是什么？

```js
const cart = ref([])
export function useCart() {
  return { cart, add: x => cart.value.push(x) }
}
// 页面组件：setup 里调用 useCart().add(props.user)，渲染 cart.value.join(',')
```

<Opt>`<p>alice,bob</p>`，两个请求共用同一个 `cart`</Opt>
<Opt>`<p>bob</p>`，每个请求有自己的应用实例</Opt>
<Opt>`<p>alice</p>`，后来的请求不能修改它</Opt>

<template #explain>

解析：`cart` 写在模块顶层，模块只加载一次，所有请求共用它。第二个请求能看到第一个用户的数据。每个请求有自己的应用实例，但这个 `ref` 不属于应用实例。把 `ref` 移进 `useCart` 函数，或者为每个请求创建新的 pinia，才能隔离。第三项以为响应式数据在渲染后会被冻结，实际没有这种机制。

</template>
</Sc>

<Sc :a="1">

两个 setup store 互相调用对方，并在顶层读取对方的 state。先调用 `useA()`，再调用 `useB()`。`useB().init` 是什么？

```js
const useA = defineStore('a', () => { const b = useB(); const x = ref(1); const init = b.x; return { x, init } })
const useB = defineStore('b', () => { const a = useA(); const x = ref(2); const init = a.x; return { x, init } })
```

<Opt>1，B 读到了 A 的 `x`</Opt>
<Opt>`undefined`，B 创建时 A 还没有 `x`</Opt>
<Opt>抛出栈溢出错误，循环调用</Opt>

<template #explain>

解析：`useA()` 运行 A 的 setup，期间调用 `useB()`。B 的 setup 里再调用 `useA()`，拿到的是还没创建完的 A，`a.x` 是 `undefined`。Pinia 不会因为循环而报错，所以最难发现。第三项以为会无限递归：Pinia 在运行 setup 之前就登记了 store，二次调用直接返回登记的对象。避免办法：读取放进 `computed` 或 action，或消除这个环。

</template>
</Sc>

<Sc :a="2">

两个组件同时挂载，都用 `useQuery({ queryKey: ['tasks'], queryFn })`（TanStack Query）。一共发出几个请求？

<Opt>2 个，每个组件各发一个</Opt>
<Opt>0 个，数据来自上一次请求的缓存</Opt>
<Opt>1 个，两个组件共用同一个请求</Opt>

<template #explain>

解析：同一个 key 对应缓存里的一个条目。第二个组件挂载时，这个条目已经有请求在路上，直接共用它，这叫去重。第二项只适用于缓存里已经有数据而且没过期的情况；这里首次挂载，缓存是空的。注意：默认情况下数据一取回就算“过期”，所以以后再有组件挂载时，会在后台重新取一次。

</template>
</Sc>

<Sc :a="0">

服务器返回的新列表里，100 个任务只有 1 个的 `done` 变了。store 把每个任务存在 `byId` 里，每一行组件接收 `byId[id]`。下面的写法会让几个行组件更新？

```js
for (const t of fresh) Object.assign(byId[t.id], t)
```

<Opt>1 个，只有值真的变化的那一行</Opt>
<Opt>100 个，每个对象都被赋值了一遍</Opt>
<Opt>0 个，`Object.assign` 不触发响应式</Opt>

<template #explain>

解析：`Object.assign` 对响应式对象的每个属性赋值，Vue 只在新值和旧值不同时触发更新。99 个任务没有变化，所以不触发，只有变了的那一行更新。如果写成 `tasks.value = fresh`，每一行拿到的都是新对象，100 行全部更新。第三项错在：对响应式代理做属性赋值，会走 `set` 拦截，正常触发。

</template>
</Sc>

:::

::: summary
- 状态有七个归宿：组件 `ref`、提升到父组件、`provide / inject`、组合式函数里的共享状态、Pinia、URL、服务端状态。默认放在离使用方最近的地方，有具体需求再向外移。
- 判断归属的顺序：能算出来就不存储；真相在服务器是服务端状态；刷新或分享后要还原就放 URL；再看读写范围。
- 单一数据源：每个事实只写在一个地方，其余用 `computed` 或 getter 派生。选中项只存 id，不存对象副本。
- URL 是唯一数据源时，不要复制进 `ref`。连续输入用 `replace`，有意义的切换用 `push`，`undefined` 删除参数。
- 服务端状态需要缓存、去重、失效和乐观更新。通常交给 TanStack Query 或 Pinia Colada。数据只住在缓存里，不复制进 Pinia。
- 模块级的 `ref` 是隐式单例。SSR 下所有请求共用它，会泄露数据。让状态跟着应用实例走。
- store 按领域拆，只放领域数据，单向依赖。互相读取 state 要放进 `computed` 或 action，否则先创建的会读到 `undefined`。
- 按 id 规范化：实体一份，列表和关系存 id。按 id 合并更新，只让真正变化的行更新。
:::
