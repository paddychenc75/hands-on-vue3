---
title: 数据请求与服务端状态
id: data-fetching
stage: 3
chapter: 18
desc: 请求的状态、时机、竞态与取消、加载与错误体验、缓存与查询库
---

<script setup>
import RequestTimeline from '../labs/18-data-fetching/RequestTimeline.vue'
</script>

# 数据请求与服务端状态

::: goals
<Goal checks="sc:0">用单个 status 表示一次请求的状态，并区分“成功但没有数据”和“失败”。</Goal>
<Goal checks="sc:1">按数据的用途选择发请求的位置：watch 加 immediate、onMounted、事件处理函数、路由守卫。</Goal>
<Goal checks="sc:2,ex:raceUseAsync">写出处理竞态的 useAsync：参数变化时取消旧请求，并丢弃过期结果。</Goal>
<Goal checks="ex:optimisticAdd">写出带回滚的乐观更新，并避免回滚抹掉别的修改。</Goal>
<Goal checks="sc:3,sc:4">区分网络错误和业务错误，选择哪些失败值得自动重试。</Goal>
<Goal checks="sc:5,sc:6,ex:queryCacheDedup">说明请求去重、新鲜期和失效，并写出一个迷你查询缓存。</Goal>
<Goal checks="sc:7">判断什么时候自己写请求逻辑，什么时候用 TanStack Query 或 Pinia Colada。</Goal>

:::

::: rt
阅读主线约 17 分钟，深入内容约 1 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
请求像**点外卖**。点单后你要看到“已接单”“配送中”（加载状态），也可能被告知“商家打烊了”（失败）。你连点两次改了地址，先下的那单晚到，就不能让它把后下的结果顶掉（竞态）。同一个小区的邻居拼单，只下一单（去重）。外卖盒里的饭菜会凉：超过一段时间，就该重新点（过期）。
:::

::: terms
服务端状态
: 真相在服务器上的数据。客户端只持有一份会过期的缓存。

取消（AbortController）
: 用 `AbortController` 的 `signal` 告诉 `fetch` 放弃一个还在路上的请求。

去重
: 同一份数据同时被多处读取时，只发出一个请求，大家共用它的结果。

新鲜期（staleTime）
: 数据取回后，在这段时间内认为是新的，不会重新请求。

失效
: 把缓存里的数据标记为过期，下次使用时重新取。

乐观更新
: 先改界面，再等服务器确认；失败时撤销这次修改。
:::

::: why
你做了一个商品详情页，数据来自接口。第一版很顺利。然后问题接连出现：

- 用户快速点了商品 1、商品 2，页面却显示商品 1，因为商品 1 的请求更慢，后返回。
- 网络慢时，页面一片空白，没有任何提示。接口 500 时，页面一直转圈。
- 列表页和详情页都要“当前用户”，各自发了一次请求。从详情返回列表，又请求一次，列表闪了一下。
- 点“收藏”要等半秒才变色。

这些不是四个独立的问题，它们都是同一件事：**接口数据不是普通的本地数据。** 它有加载和失败两种额外的状态，到达的时间不确定，在服务器上随时可能变化。本章先把一次请求写对，再处理竞态、加载体验和错误，最后讲缓存，以及什么时候该换成专门的库。
:::

第 4 章讲过用 `onCleanup` 防竞态，第 8 章写过一个基础版的 `useFetch`。本章在它们的基础上，把数据请求从头到尾讲完整。本章的练习都用可控的假接口，不发真实请求。

### 18.1 一次请求有哪些状态

一次请求在界面上有四种状态：还没开始（idle）、进行中（loading）、成功（success）、失败（error）。

初学者常用三个布尔值表示：`loading`、`error`、`loaded`。三个布尔值有 8 种组合，其中大部分不可能出现：加载中同时又失败，没有加载却也没有成功。代码里要处处防着这些组合。更好的做法是**一个 `status` 字段加两个数据字段**：

```js
const { data, error, status, reload } = useAsync(() => id.value, fetchUser)
// status: 'idle' | 'loading' | 'success' | 'error'
```

```vue
<p v-if="status === 'loading' && !data">加载中…</p>
<div v-else-if="status === 'error'">加载失败：{{ error.message }} <button @click="reload">重试</button></div>
<p v-else-if="data?.length === 0">没有数据</p>
<ul v-else-if="data"> … </ul>
```

两点要记住：

1. **“空数据”是成功的一种。**接口返回 `[]` 时请求是成功的，界面显示“没有数据”，不是错误。把它和失败混在一起，用户会误以为系统出了问题。
2. **`data` 和 `status` 是两件事。**重新请求时，`status` 变成 `loading`，旧的 `data` 还在。第一个分支写 `status === 'loading' && !data`，意思是只有首次加载才显示“加载中”。刷新时继续显示旧数据（18.4）。

第 8 章的 `useFetch` 返回 `data`、`error`、`loading`。本章的 `useAsync` 把 `loading` 换成 `status`，并多一个 `reload`。它的实现放在 18.3，因为竞态处理是它的一部分。

### 18.2 在哪里发请求

同一个请求可以写在好几个位置。位置决定了什么时候发、参数变了会不会重新发、页面什么时候显示。

| 位置 | 适合 | 注意 |
|---|---|---|
| `watch` 加 `immediate: true`（`useAsync` 就是这样） | 页面和组件显示的数据，参数会变：路由参数、筛选、页码 | 默认选它。参数一变就重新发，需要处理竞态（18.3） |
| `onMounted` | 参数不会变的一次性请求，或者必须在浏览器里做的请求 | 参数变了不会重发；服务端渲染时不运行（第 36 章） |
| 事件处理函数 | 用户动作触发的请求：提交、删除、加载更多 | 没有“参数变了就重发”。要防重复点击，写操作要有失败处理 |
| 路由守卫（第 17 章） | 数据没到就不该显示页面，例如权限检查 | 导航被拖慢，用户看到旧页面不动。要配合全局进度条 |
| `async setup` 加 `Suspense`（第 9 章） | 组件渲染前必须有数据 | `setup` 只运行一次，参数变了不会重新等待；`Suspense` 仍是实验性功能；要配错误边界（第 38 章） |

**场景：商品详情页 `/product/:id`。**用户从商品 1 跳到商品 2，Router 复用同一个组件，`setup` 和 `onMounted` 都不再运行（第 17 章 17.5 讲过）。把请求放在 `onMounted` 里，页面就停在商品 1。所以：

```js
const route = useRoute()
const { data: product, status, error, reload } = useAsync(
  () => route.params.id,                 // getter：id 变了自动重发
  (id, signal) => request(`/products/${id}`, { signal })
)
```

**场景：提交订单。**这是用户动作，写在事件处理函数里，不要写在 `watch` 里。读数据用 `watch`，写数据用事件。

怎样选：先问“这份数据是被页面读取的，还是被动作触发的”。读取的用 `useAsync`。路由守卫只留给“拿不到数据就不能进入”的少数情形，例如先确认当前用户有没有权限。大多数页面数据，更好的体验是导航立刻完成，页面自己显示加载状态。

### 18.3 竞态与取消

第 4 章讲过：先发的请求后返回，旧结果会覆盖新结果。先把四个状态和竞态处理合在一起，写出完整的 `useAsync`：

```js
import { ref, shallowRef, watch, onWatcherCleanup } from 'vue'

export function useAsync(source, fetcher) {
  const data = shallowRef(null)
  const error = shallowRef(null)
  const status = ref('idle')                    // idle | loading | success | error
  const tick = ref(0)                           // reload 靠它重新触发

  watch([source, tick], async ([arg]) => {
    const controller = new AbortController()
    onWatcherCleanup(() => controller.abort())  // 参数变了、组件卸载了：取消这一次
    status.value = 'loading'
    error.value = null
    try {
      const result = await fetcher(arg, controller.signal)
      if (controller.signal.aborted) return     // 兜底：不遵守 signal 的 fetcher 也不能写入过期结果
      data.value = result
      status.value = 'success'
    } catch (e) {
      if (controller.signal.aborted) return     // 被取代的请求失败了，不是错误
      error.value = e
      status.value = 'error'
    }
  }, { immediate: true })

  return { data, error, status, reload: () => tick.value++ }
}
```

三个细节：

1. `onWatcherCleanup` 在下一次回调运行前、以及侦听器停止时调用。组件卸载时侦听器随之停止，所以组件卸载后才返回的请求也被取消，不会再写入状态。它只能在第一个 `await` 之前调用（第 4 章讲过）。
2. 被取消的 `fetch` 会抛出 `AbortError`。它不是错误，是“被取代”。所以 `catch` 里先判断 `signal.aborted`。不判断的话，请求 2 还在路上，页面已经显示“加载失败”。
3. `signal.aborted` 判断出现了两次。取消是对请求的善意请求：自己写的 `fetcher` 可能没有把 `signal` 交给 `fetch`，或者调用的 SDK 不支持取消。第一次判断挡住“旧结果成功返回”，第二次挡住“旧请求失败”。

防竞态有三种做法：

| 做法 | 怎么做 | 取舍 |
|---|---|---|
| 请求序号 | 每次请求前 `const mine = ++seq`，返回后 `if (mine !== seq) return` | 适用于任何 Promise，包括不支持取消的 SDK。旧请求仍然发出、仍然占用连接 |
| 清理标记 | 第 4 章的 `onCleanup`，设一个 `cancelled` 变量 | 和请求序号等价，写法更贴合 Vue 的生命周期 |
| `AbortController` | `signal` 交给 `fetch`，清理时 `abort()` | 请求真的被取消，省流量；需要 `fetcher` 支持 `signal` |

推荐的组合就是上面的 `useAsync`：用 `AbortController` 取消，再用 `signal.aborted` 兜底。取消只适合读请求。**取消写请求不会撤销服务器已经做的事：**点“取消”之前，服务器可能已经创建了订单。

<Lab id="demo-timeline" title="实验台：请求时间线" note="每个请求的延迟和是否失败都可以调；横条是请求在时间轴上的位置">
<template #predict>
<Sc predict :a="1">

先猜：策略选“不处理”。先点“查 A”（要 900 毫秒），马上点“查 B”（要 150 毫秒）。等两个请求都结束，界面显示什么？

<Opt>结果 B：最后点的是 B</Opt>
<Opt>结果 A：A 最后返回，它覆盖了 B</Opt>
<Opt>两个结果同时显示</Opt>

<template #explain>

解析：界面只有一块显示区域。B 先返回，显示“结果 B”。900 毫秒时 A 返回，没有任何东西阻止它写入，所以最终显示“结果 A”，而用户最后选的是 B。请求返回的顺序和发出的顺序无关。打开实验台，依次试四种策略：序号和取消都让界面停在 B，区别是序号策略里 A 的请求仍然发出并跑完（结果被丢弃），取消策略里 A 被中途取消。

</template>
</Sc>
</template>

<RequestTimeline />
</Lab>

观察三件事。第一，“不处理”时界面停在 A，并被标成“错了”。第二，“请求序号”和“取消旧请求”都显示 B，但前者实际发出的请求数里 A 仍然跑完，后者的 A 在时间线上被截断。第三，选“按 key 缓存并去重”：再点一次 A，立刻显示结果，不发新请求；A 的慢请求返回时，结果写进 A 自己的条目，不会改动 B 的显示（原因见 18.6）。

下面的练习让你自己补全这个 `useAsync`。

<Exercise id="raceUseAsync" />

### 18.4 加载体验

处理对了状态和竞态，页面是正确的。下面几个做法让它也好用。

**延迟显示加载态，避免闪烁。**请求只用 80 毫秒，加载动画却一闪而过，比没有更糟。做法：加载超过 200 毫秒才显示它。

```js
export function useDelayedFlag(flag, delay = 200) {
  const shown = ref(false)
  watch(flag, (on, _old, onCleanup) => {
    if (!on) { shown.value = false; return }
    const t = setTimeout(() => { shown.value = true }, delay)
    onCleanup(() => clearTimeout(t))           // 请求提前结束：计时作废，加载态从未出现
  }, { immediate: true })
  return shown
}
// const showSpinner = useDelayedFlag(() => status.value === 'loading')
```

加载态一旦出现，最好至少停留 300 到 500 毫秒，否则它刚出现就消失，同样会闪。

**保留旧数据直到新数据到达。**`useAsync` 重新请求时不清空 `data`，所以翻页、改筛选时，列表保持原样，只在角落显示“刷新中”，比整页变成骨架屏好得多。反过来，如果是从“商品 1”跳到“商品 2”，旧数据属于另一个对象，继续显示会让用户以为商品 2 就是这样。这时要清空旧数据，最简单的做法是把 `id` 当作组件的 `key`，参数一变就重建整个组件。规则是：**同一份数据的新版本保留旧数据，另一个对象的数据不保留。**

**骨架屏和“首次加载”。**骨架屏只用于首次加载（`status === 'loading' && !data`）。再次加载时，旧数据比骨架屏更有用。

**分页和无限滚动。**它们多了三个状态：已经加载了哪些页、还有没有下一页、正在加载下一页。无限滚动要防两件事，滚动事件连发和筛选条件变化：

```js
const items = ref([]), page = ref(0), hasMore = ref(true), status = ref('idle')
let epoch = 0                                    // 筛选条件变一次，加一次

async function loadMore() {
  if (status.value === 'loading' || !hasMore.value) return   // 防止滚动事件连发
  const mine = epoch
  status.value = 'loading'
  try {
    const res = await api.list({ page: page.value + 1, filter: filter.value })
    if (mine !== epoch) return                   // 筛选已经变了：这一页属于旧列表，丢弃
    items.value.push(...res.items)
    page.value++
    hasMore.value = res.hasMore
    status.value = 'success'
  } catch {
    if (mine === epoch) status.value = 'error'   // 保留已有的 items，显示“重试”
  }
}
watch(filter, () => {
  epoch++; items.value = []; page.value = 0; hasMore.value = true; status.value = 'idle'
  loadMore()
})
```

这里的 `epoch` 就是 18.3 的请求序号，用在“列表”这个更大的状态上。页码本身是小而可序列化的值，放进 URL（第 19 章 19.4）。

**乐观更新和失败回滚。**点“收藏”要等半秒才变色，用户会怀疑没点上。乐观更新的做法是：先改界面，再发请求，失败时撤销。

```js
async function toggleLike(post) {
  post.liked = !post.liked                       // 先改界面
  try {
    await api.setLike(post.id, post.liked)
  } catch (e) {
    post.liked = !post.liked                     // 失败：撤销这一次修改
    toast('操作失败，请重试')
  }
}
```

三条规则：只对**很可能成功**的操作使用（点赞、勾选、排序）；失败时一定回滚并告诉用户；回滚只撤销**这一次**修改。最后一条最容易错：请求前保存整个列表的快照，失败时整体还原，会把这期间别的请求成功加入的数据一起抹掉。下面的练习就在检验这一点。

<Exercise id="optimisticAdd" />

### 18.5 错误与请求层

先看一个常被忽略的事实：**`fetch` 遇到 404 或 500 不会抛错。**只有网络中断、域名解析失败这类“根本没拿到响应”的情况，它才会抛出 `TypeError`。HTTP 错误要自己检查 `res.ok`。

```js
const res = await fetch('/api/users/9')   // 服务器返回 404：这一行不抛错
res.ok                                    // false
res.status                                // 404
```

所以失败至少分三类，它们的处理方式不同：

| 类别 | 例子 | 怎么处理 |
|---|---|---|
| 网络错误 | 断网、超时、服务器没响应 | 可以自动重试；提示“网络不可用” |
| HTTP 错误 | 401 未登录、403 无权限、404 不存在、500 服务器出错 | 按状态码分别处理；5xx 可以重试，4xx 通常不重试 |
| 业务错误 | HTTP 200，但返回体里写着“库存不足” | 不重试；把原因显示给用户（多数在表单旁或提示条里） |

如果每个调用点都自己检查 `res.ok`、解析 JSON、区分这三类，代码会重复几十遍。所以项目里会有一个**请求层**：一个小函数，统一做基础地址、鉴权头和错误规范化。

```js
export class ApiError extends Error {
  constructor(kind, message, extra = {}) { super(message); this.kind = kind; Object.assign(this, extra) }
}                                                // kind: 'network' | 'http' | 'business' | 'auth'

export async function request(path, { method = 'GET', body, signal } = {}) {
  let res
  try {
    res = await fetch('/api' + path, {           // 基础地址
      method, signal,
      headers: { 'Content-Type': 'application/json', ...authHeader() },   // 鉴权头
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e         // 取消不是错误，原样抛出
    throw new ApiError('network', '网络不可用')
  }
  const payload = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status === 401 ? 'auth' : 'http', payload?.message ?? '请求失败', { status: res.status })
  if (payload?.code) throw new ApiError('business', payload.message, { code: payload.code })   // 后端用 200 加错误码时
  return payload
}
```

有了它，`useAsync` 的 `fetcher` 写成 `(id, signal) => request('/users/' + id, { signal })`，调用方拿到的 `error` 永远是 `ApiError`，只需判断 `error.kind`。

axios 和 ofetch 做的是同一件事，只是别人写好了：`axios.create({ baseURL })` 加拦截器（interceptors），`ofetch.create({ baseURL, onRequest, onResponseError })`。两者遇到非 2xx 都会抛错（axios 是 `AxiosError`，ofetch 是 `FetchError`），所以不用自己检查 `res.ok`。注意 ofetch 对 GET 默认还会重试 1 次，对 POST 不重试。项目里已经在用其中一个时，沿用它；没有的话，几十行的 `request` 加上浏览器自带的 `fetch` 通常就够用。

**重试和退避。**网络错误和 5xx 值得重试，4xx 和业务错误不值得：用户重复提交同样的数据，得到的还是同样的错误。重试之间要等待，而且越等越久（指数退避），再加一点随机（抖动），避免所有客户端同时重试把服务器压垮：

```js
export async function withRetry(fn, { retries = 3, base = 300, signal } = {}) {
  for (let i = 0; ; i++) {
    try { return await fn() }
    catch (e) {
      const retryable = e.kind === 'network' || e.status >= 500
      if (!retryable || i >= retries) throw e
      await sleep(base * 2 ** i + Math.random() * base, signal)   // 300ms、600ms、1200ms……再加抖动
    }
  }
}
// fetcher: (id, signal) => withRetry(() => request('/users/' + id, { signal }), { signal })
```

`sleep` 要接受 `signal`，等待期间被取消时立刻结束。只对读请求自动重试。写请求重试前，要确认服务器能识别重复提交。

**鉴权。**请求层负责带上令牌。收到 401 时有两种选择：令牌能刷新就刷新后重试一次，否则回到登录页。登录和守卫的整体流程见第 17 章。请求层只做“刷新一次再重试”这一步，并保证多个请求同时 401 时只刷新一次：

::: deep 401 时刷新令牌并重试一次
在 `request` 里，检查 `res.status === 401 && !retried`，调用 `refresh()`，然后用新令牌重发一次。`refresh` 把进行中的刷新请求存在模块变量里：

```js
let refreshing = null
function refresh() {
  refreshing ??= fetch('/api/refresh', { method: 'POST' })
    .then(r => r.json())
    .then(j => { setToken(j.token) })
    .finally(() => { refreshing = null })
  return refreshing                              // 三个请求同时 401，只刷新一次
}
```

刷新本身失败时抛出 `ApiError('auth')`。调用方（路由守卫或全局错误处理）看到 `kind === 'auth'` 就跳转到登录页，并记下当前地址，登录后回来（第 17 章）。
:::

**错误显示在哪里？**不同的失败，用户需要不同的反馈。整体策略见第 38 章，这里只记住请求这一侧：

| 失败 | 显示在哪 |
|---|---|
| 列表或详情加载失败 | 原地显示错误和“重试”按钮（`status === 'error'`） |
| 提交失败、校验不通过（业务错误） | 表单字段旁，或提示条 |
| 乐观更新失败 | 回滚，并弹出一条提示 |
| 登录过期（`auth`） | 跳转登录页 |
| 代码 bug、接口返回了违反约定的数据 | 抛出，交给错误边界和上报（第 38 章 38.5） |

### 18.6 服务端状态与缓存

到目前为止，每个组件各自请求、各自保存。应用变大后，会遇到这些现象：

- 列表页和详情页都读“当前用户”，请求了两次。
- 从详情返回列表，列表重新请求，闪一下。
- 保存修改后，列表还是旧的，要手写代码刷新它。

原因是：这些数据**不属于客户端**。真相在服务器上，别人也能改它。客户端持有的只是一份会过期的缓存，叫**服务端状态**（第 19 章会把它放进状态归属的整体判断）。管理一份缓存需要这几个能力：

| 能力 | 解决的问题 |
|---|---|
| 缓存 | 回到页面时先显示已有数据 |
| 去重 | 多个组件读同一份数据，只发一次请求 |
| 新鲜期 | 数据在一段时间内算新的，不重复请求 |
| 失效 | 数据被修改后，标记过期并重新取 |
| 后台刷新 | 先显示旧数据，同时悄悄取新的 |

这些能力不需要从很大的库里才能看懂。下面是一个约 35 行的迷你查询缓存，核心想法是：**每个 key 对应一个条目，所有使用者共用它。**

```js
import { ref, shallowRef, computed, watch } from 'vue'

const entries = new Map()                        // key → 条目
function entryOf(key) {
  const k = JSON.stringify(key)
  if (!entries.has(k)) entries.set(k, { key, data: shallowRef(), error: shallowRef(null), fetching: ref(false), promise: null, updatedAt: 0, fn: null })
  return entries.get(k)
}

function fetchEntry(e) {
  if (e.promise) return e.promise                // 去重：已有请求在路上，直接共用
  e.fetching.value = true
  e.promise = e.fn(e.key)
    .then(d => { e.data.value = d; e.error.value = null; e.updatedAt = Date.now() },
          err => { e.error.value = err })        // 失败时保留旧数据
    .finally(() => { e.promise = null; e.fetching.value = false })
  return e.promise
}

export function useQuery(key, fn, { staleTime = 0 } = {}) {   // key 是 getter，返回数组
  const entry = computed(() => entryOf(key()))
  watch(entry, e => {
    e.fn = fn
    if (Date.now() - e.updatedAt >= staleTime) fetchEntry(e)  // 没有数据或已过期才请求
  }, { immediate: true })
  return {
    data: computed(() => entry.value.data.value),
    error: computed(() => entry.value.error.value),
    fetching: computed(() => entry.value.fetching.value)
  }
}

export function invalidate(key) {
  const e = entries.get(JSON.stringify(key))
  if (!e) return
  e.updatedAt = 0                                // 标记过期，data 不动
  if (e.promise) e.promise.then(() => fetchEntry(e))   // 路上的请求可能带着旧数据：等它结束再取一次
  else if (e.fn) fetchEntry(e)
}
```

用法：

```js
const { data, fetching } = useQuery(() => ['user', id.value], ([, id]) => request('/users/' + id), { staleTime: 30_000 })
// 保存修改之后
await request('/users/1', { method: 'PUT', body })
invalidate(['user', 1])
```

读这段代码，注意三个现象：

1. **去重来自共用的 `promise`。**两个组件同时用同一个 key，第二个调用 `fetchEntry` 时看到 `e.promise` 已存在，直接返回它。
2. **失效不是删除。**`invalidate` 只把 `updatedAt` 设为 0，`data` 不动。重新取期间所有使用者继续显示旧数据，新数据到达时一起更新。这就是“后台刷新”。
3. **key 顺手消除了竞态。**`id` 从 1 变成 2 时，`entry` 换成另一个条目。商品 1 的慢请求晚回来，写进的是商品 1 的条目，界面读的是商品 2 的条目，互不影响。18.3 实验台里的“按 key 缓存”策略就是这样。

它还缺很多东西：不再使用的条目要回收、失败后自动重试、窗口重新获得焦点时刷新、取消、分页缓存、服务端渲染的状态传递。这些都是真实的库要处理的事。

<Exercise id="queryCacheDedup" />

### 18.7 什么时候自己写，什么时候用库

Vue 生态里有两个常用的查询库。版本和状态以 2026 年 10 月为准：

| | TanStack Query（Vue 版） | Pinia Colada |
|---|---|---|
| 包 | `@tanstack/vue-query`，5.104.1 | `@pinia/colada`，1.4.8 |
| 依赖 | 跨框架的 `query-core` | 建立在 Pinia 之上，要求 Vue 3.5.41 或更高 |
| 安装 | `app.use(VueQueryPlugin)` | `app.use(pinia)`，再 `app.use(PiniaColada)` |
| 查询 | `useQuery({ queryKey, queryFn })` | `useQuery({ key, query })` |
| 修改 | `useMutation`，`useQueryClient()` | `useMutation`，`useQueryCache()` |
| 默认新鲜期（staleTime） | 0，数据取回即视为过期 | 5 秒 |
| 默认缓存保留（gcTime） | 5 分钟 | 5 分钟 |
| 自动重试 | 浏览器里默认 3 次，带退避 | 不内置，用官方插件 `@pinia/colada-plugin-retry` |

两者的基本用法几乎一样：

```js
// @tanstack/vue-query
const { data, isPending, error, refetch } = useQuery({
  queryKey: ['user', id],                        // id 是 ref：变化时自动换 key 并重新请求
  queryFn: ({ signal }) => request('/users/' + id.value, { signal })
})

// @pinia/colada
const { data, isPending, error, refetch } = useQuery({
  key: () => ['user', id.value],
  query: ({ signal }) => request('/users/' + id.value, { signal })
})
```

对照前面几节，它们做的事你都认识：`queryKey` 就是迷你缓存里的 key；两个组件用同一个 key，只发一个请求；key 变化时换成新 key 的条目，旧请求的结果不会写到当前显示上；`signal` 交给 `fetch`，库在需要取消时才有办法真正取消请求。

**乐观更新**用 `useMutation`。下面是 TanStack 的写法，Colada 的 `onMutate`、`onError`、`onSettled` 同名同义，缓存对象换成 `useQueryCache()`：

```js
const qc = useQueryClient()
const add = useMutation({
  mutationFn: task => request('/tasks', { method: 'POST', body: task }),
  onMutate: async task => {
    await qc.cancelQueries({ queryKey: ['tasks'] })         // 避免进行中的请求覆盖乐观数据
    const prev = qc.getQueryData(['tasks'])                 // 快照，用于回滚
    qc.setQueryData(['tasks'], old => [...old, task])       // 先改界面
    return { prev }
  },
  onError: (_e, _task, ctx) => qc.setQueryData(['tasks'], ctx.prev),   // 回滚
  onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] })      // 无论成败，重新取真实数据
})
```

这里整体快照还原看起来和 18.4 的警告矛盾，区别在最后一行：`onSettled` 无论成败都会 `invalidate`，用服务器的真实数据覆盖，别的请求的结果最终会回来。手写时没有这一步，所以要只撤销自己那一条。

**怎么选？**

| 情形 | 建议 |
|---|---|
| 一个组件里读一次，不会被别处修改 | 手写 `useAsync` 就够了 |
| 同一份数据在多个组件读取 | 用库（去重和共享） |
| 要缓存、过期时间、后台刷新、窗口聚焦刷新 | 用库 |
| 有大量“修改之后刷新列表”的联动 | 用库（失效） |
| 要乐观更新、分页缓存、无限滚动 | 用库 |
| 项目已经用 Pinia，且希望贴合它的风格 | Pinia Colada 值得一试 |
| 需要同一套代码在 Vue 之外也用，或者要成熟的生态和调试工具 | TanStack Query |
| 数据只在应用启动时读一次，之后很少变化 | 放进 Pinia 的 action 里取一次就行 |

用了库之后，有一条规则：**这份数据只住在库的缓存里，不要再复制进 Pinia。**两处保存同一份服务器数据，失效和去重只对库自己的缓存有效，另一份会过期而你不知道（第 19 章讲状态归属时会回到这一点）。Pinia 留给真正属于客户端的状态，例如登录会话、界面偏好、没提交的草稿。

服务端渲染时，在服务器取到的数据要传给浏览器，避免客户端重复请求，详见第 36 章 36.5。两个库都有各自的做法，这里不展开。

::: note
**本地任务（可选）：用查询库改写一个请求。**在你自己的 Vue 项目里，找一处手写的“`onMounted` 里 `fetch` 再赋值”的代码，用 TanStack Query 或 Pinia Colada 改写。

1. 安装：`npm i @tanstack/vue-query`（或 `npm i @pinia/colada`，它要求项目已经装了 Pinia）。
2. 在 `main.ts` 里安装插件（TanStack：`app.use(VueQueryPlugin)`；Colada：`app.use(pinia)` 之后 `app.use(PiniaColada)`）。
3. 用 `useQuery` 替换手写的请求逻辑，删除手写的 `loading`、`error` 变量。

验收标准，都用浏览器的开发者工具自查：

- 在“网络”面板里，同一个页面里两个组件读同一份数据，只出现 1 个请求。
- 从页面 A 切到页面 B 再切回，A 立刻显示旧数据（不出现“加载中”），随后后台出现 1 个新请求。TanStack 默认新鲜期为 0，切回就会重新请求；Pinia Colada 的新鲜期是 5 秒，要在 B 页停留超过 5 秒再切回才会有新请求，5 秒内切回则没有请求。
- 让接口请求失败（停掉接口服务，或在开发者工具里屏蔽这个请求；不要用“离线”选项，见下面的说明），页面显示错误和“重试”；恢复接口后点“重试”，数据回来。TanStack 默认失败后自动重试 3 次，间隔约 1、2、4 秒，所以大约 7 秒后才显示错误；想立刻看到错误，给 `useQuery` 加 `retry: false`。Pinia Colada 不内置重试，请求失败后马上显示错误。
- 快速切换路由参数，页面最终显示最后一次的数据，不会被先发出的慢请求覆盖。

为什么第三条不用“离线”：开发者工具的“离线”会让浏览器的在线状态变成 false。TanStack 在这种状态下不会发出请求，查询停在“加载中”，不显示错误，恢复网络后自动请求。Pinia Colada 则照常发出请求，请求失败后显示错误。
:::

::: pitfalls
1. 不要用三个布尔值表示请求状态。用一个 `status`。原因：布尔值的组合里有大量不可能的状态，每处都要防着。
2. 不要把 `AbortError` 当成错误显示。原因：取消是“被取代”，请求 2 还在路上，页面不应该显示失败。
3. 不要假设 `fetch` 会对 404 和 500 抛错。检查 `res.ok`。原因：只有没拿到响应时它才抛错。
4. 不要对 4xx 和业务错误自动重试。原因：重发同样的请求，得到同样的错误，还会增加服务器负担。
5. 乐观更新失败时，不要整体还原请求前的快照。只撤销这一次修改。原因：整体还原会抹掉这期间别的请求成功的结果。
6. 不要把接口数据复制进 Pinia 再手工同步。原因：多了一份会过期的副本，失效和去重管不到它。
:::

::: selfcheck
<Sc :a="1">

接口 `GET /api/tasks` 返回 `[]`（用户还没有任何任务）。下面的 `useAsync` 里，`status` 是什么？页面应该显示什么？

```js
const { data, error, status } = useAsync(() => 'mine', scope => request('/tasks?scope=' + scope))
```

<Opt>`error`：没有数据就是失败，显示“加载失败”</Opt>
<Opt>`success`：请求成功了，显示“还没有任务”</Opt>
<Opt>`idle`：没有数据就是还没开始，显示“加载中”</Opt>

<template #explain>

解析：请求成功拿到了响应，`status` 是 `success`，只是数据为空。“没有数据”是成功的一种，界面显示空状态提示。第一项把空数据当成失败，用户会以为系统坏了。第三项把“还没有数据”和“还没有开始请求”混为一谈：`idle` 只表示没发过请求。

</template>
</Sc>

<Sc :a="2">

商品详情页路由是 `/product/:id`。组件在 `onMounted` 里用 `route.params.id` 发请求。用户从 `/product/1` 点链接到 `/product/2`，页面显示什么？

<Opt>商品 2：路由变了，组件重新创建</Opt>
<Opt>商品 2：`onMounted` 会在参数变化时再次运行</Opt>
<Opt>商品 1：Router 复用组件，`onMounted` 不再运行</Opt>

<template #explain>

解析：两个地址匹配同一条路由，Router 复用同一个组件实例，`setup` 和 `onMounted` 都不再运行，页面停在商品 1。解决办法是用 `watch(() => route.params.id, …, { immediate: true })`，或者直接用 `useAsync(() => route.params.id, …)`。前两项都以为组件会重新创建。

</template>
</Sc>

<Sc :a="0">

下面的 `useAsync` 去掉了成功分支里的 `if (controller.signal.aborted) return`。`fetcher` 是第三方 SDK 的函数，不支持 `signal`。参数从 1 快速变成 2，请求 1 慢、请求 2 快。最终 `data` 是什么？

```js
const result = await fetcher(arg, controller.signal)
data.value = result
status.value = 'success'
```

<Opt>请求 1 的结果：它晚返回，覆盖了请求 2</Opt>
<Opt>请求 2 的结果：`abort()` 已经取消了请求 1</Opt>
<Opt>`null`：被取消的请求不会写入任何东西</Opt>

<template #explain>

解析：`abort()` 只是改变 `signal` 的状态并通知 `fetch`。不支持 `signal` 的 `fetcher` 不会停下，请求 1 照常返回，然后一路执行到 `data.value = result`，覆盖请求 2 的结果。所以要在 `await` 之后再判断一次 `signal.aborted`。第二项高估了 `abort()`：取消需要被请求的一方配合。

</template>
</Sc>

<Sc :a="1">

下面的代码向服务器请求一个不存在的用户，服务器返回 HTTP 404。`console.log` 会输出什么？

```js
try {
  const res = await fetch('/api/users/9999')
  console.log('收到响应', res.ok, res.status)
} catch (e) {
  console.log('抛出错误')
}
```

<Opt>抛出错误：404 是错误状态码</Opt>
<Opt>收到响应 false 404</Opt>
<Opt>收到响应 true 404：能拿到响应就说明成功</Opt>

<template #explain>

解析：`fetch` 只在没拿到响应时才抛错（断网、DNS 失败、被取消）。服务器返回 404 或 500，它照常返回 `Response`，`ok` 是 `false`。所以请求层要自己检查 `res.ok`，把 HTTP 错误转成统一的错误。axios 和 ofetch 会替你抛错，`fetch` 不会。第三项记错了 `ok` 的含义：`ok` 只在状态码 200 到 299 时为 `true`。

</template>
</Sc>

<Sc :a="2">

请求层的 `withRetry` 会自动重试。下面哪种失败**适合**自动重试？

<Opt>提交订单时服务器返回 422：“收货地址不能为空”</Opt>
<Opt>请求 `/api/me` 时服务器返回 403：没有权限</Opt>
<Opt>请求商品列表时服务器返回 503：暂时不可用</Opt>

<template #explain>

解析：503 是服务器暂时的问题，等一会儿再试可能就好了。422 和 403 是请求本身有问题，重发同样的请求只会得到同样的错误，应该直接把原因告诉用户。另外，提交订单属于写请求，自动重试前还要确认服务器能识别重复提交。

</template>
</Sc>

<Sc :a="0">

迷你查询缓存里，`staleTime` 是 60 秒。组件 A 在 0 秒时用 `['tasks']` 取到了数据。第 30 秒，组件 B 挂载，也用 `['tasks']`。B 挂载时发生什么？

<Opt>不发请求，B 立刻显示缓存里的数据</Opt>
<Opt>发一个请求，B 在请求返回前显示“加载中”</Opt>
<Opt>发一个请求，B 先显示缓存里的数据，返回后更新</Opt>

<template #explain>

解析：数据是在 30 秒前取回的，还在 60 秒的新鲜期内，所以不请求，B 直接拿到缓存。如果 `staleTime` 是 0（TanStack Query 的默认值），第 30 秒数据已经过期，才是第三项的行为：先显示旧数据，同时后台重新取。第二项忽略了缓存里已经有数据。

</template>
</Sc>

<Sc :a="1">

迷你查询缓存里，商品 1 的请求要 900 毫秒，商品 2 的请求要 150 毫秒。用户先点商品 1，马上点商品 2。900 毫秒后，界面显示什么？

```js
const { data } = useQuery(() => ['product', id.value], ([, id]) => fetchProduct(id))
```

<Opt>商品 1：它最后返回，覆盖了商品 2</Opt>
<Opt>商品 2：商品 1 的结果写进了商品 1 自己的条目</Opt>
<Opt>空白：两个请求互相取消了</Opt>

<template #explain>

解析：`data` 读的是当前 key 对应的条目。`id` 变成 2 以后，它读的是商品 2 的条目。商品 1 的请求晚返回，把结果写进商品 1 的条目，不影响商品 2 的显示。这就是以 key 为单位的缓存天然避免竞态的原因。第三项里并没有取消：迷你缓存没有实现取消，商品 1 的请求会跑完。

</template>
</Sc>

<Sc :a="2">

一个后台管理页只在应用启动时读取一次站点配置，之后几乎不变，只有一个组件读它，不会被别处修改。最合理的做法是什么？

<Opt>引入 TanStack Query，以后好扩展</Opt>
<Opt>用迷你查询缓存，写一个带失效的 `useQuery`</Opt>
<Opt>用 `useAsync` 或 Pinia 的一个 action 取一次，不额外引入库</Opt>

<template #explain>

解析：库的价值在于去重、缓存、失效、乐观更新和后台刷新。一份只读一次、不会被修改、只有一处使用的数据，一个几十行的 `useAsync` 或一个 action 就够了，引入库是不必要的复杂度。判断依据是需求，不是“以后可能用到”。等到出现多处读取、需要失效或乐观更新，再迁移到库，改动并不大。

</template>
</Sc>

:::

::: summary
- 一次请求有 idle、loading、success、error 四种状态，用一个 `status` 加 `data`、`error` 表示。空数据是成功，不是失败。
- 读数据用 `watch` 加 `immediate`（`useAsync`），参数变化自动重发；动作触发的请求写在事件处理函数里；路由守卫只留给拿不到数据就不能进入的情形。
- 竞态靠取消加兜底：每次请求一个 `AbortController`，清理时 `abort()`，`await` 之后再判断 `signal.aborted`。被取消的请求不能改动状态，`AbortError` 不是错误。
- 加载体验：加载态延迟显示避免闪烁；同一份数据保留旧数据，另一个对象的数据不保留；骨架屏只用于首次加载；乐观更新必须有回滚，回滚只撤销这一次修改。
- `fetch` 对 404 和 500 不抛错。请求层统一基础地址、鉴权头和错误分类（网络、HTTP、业务）。网络错误和 5xx 可以带退避重试，4xx 和业务错误不重试。
- 服务端状态是一份会过期的缓存，需要缓存、去重、新鲜期、失效和后台刷新。迷你缓存的核心：每个 key 一个条目，共用进行中的 `promise`，失效只标记过期。
- 同一份数据多处读取，或需要失效、乐观更新、后台刷新时，用 TanStack Query 或 Pinia Colada；只读一次的数据手写就够。用了库，数据只住在库的缓存里，不再复制进 Pinia。
:::
