---
title: 错误处理与监控
id: errors
stage: 6
chapter: 38
desc: 错误在 Vue 里怎样流动，哪些错误接不住，怎样设计错误边界，以及线上怎样上报
---

<script setup>
import ErrorTrace from '../labs/38-errors/ErrorTrace.vue'
</script>

# 错误处理与监控

::: goals
<Goal checks="sc:0,sc:1">说明 Vue 把哪些调用包进了错误处理，以及一个错误怎样沿父组件链走到 `errorHandler`。</Goal>
<Goal checks="sc:2">判断一个错误会被 Vue 接住，还是只到达 `window`。</Goal>
<Goal checks="sc:3,ex:retryBoundary">说明渲染出错后组件留下什么，并写出带重试和自动复位的错误边界。</Goal>
<Goal checks="sc:4,sc:5">区分预期失败和异常，说明路由与 store 的错误各走哪条路。</Goal>
<Goal checks="sc:6,ex:errorReporter">写一个带去重和限流的上报函数，并从组件实例取出组件名链。</Goal>

:::

::: rt
阅读主线约 22 分钟，深入内容约 3 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
错误处理像一栋楼的**消防系统**。每层有喷淋头（错误边界），总控室收所有报警（`errorHandler`）。但有些房间没接报警线：里面起火，总控室不知道。监控把报警送到消防队，还附上楼层平面图（组件链）。
:::

::: terms
错误边界
: 捕获后代组件的错误、显示备用内容的组件。

errorHandler
: 处理未被捕获的错误的全局函数。

预期失败
: 正常业务里会发生、用状态表示的失败，例如 404 和校验不通过。

上报
: 把线上的错误和上下文发给监控服务。

指纹
: 用来判断两个错误是不是同一个问题的字符串。

source map
: 记录压缩后代码位置和源码位置对应关系的文件。
:::

::: why
用户说“点了保存没反应”。你打开控制台，什么也没有。另一次，页面里一块区域变成空白，监控里没有任何记录。

原因：Vue 只接住它自己调用你的代码时抛出的错误。其他错误直接到浏览器，Vue 不知道。组件渲染出错后，留下的是一个空洞。没有上报，你也不会知道。

本章按三步走：**接住**（38.1 到 38.3），**恢复**（38.4 到 38.6），**上报**（38.7 和 38.8）。第 11 章讲了用法，本章讲机制和工程做法。
:::

### 38.1 Vue 怎样接住错误

Vue 不会给每行代码加 `try/catch`。它只包住“Vue 自己调用你的代码”的位置。包装函数有两个：

```js
// runtime-core/errorHandling.ts（简化）
function callWithErrorHandling(fn, instance, type, args) {
  try { return fn(...args) } catch (err) { handleError(err, instance, type) }
}
function callWithAsyncErrorHandling(fn, instance, type, args) {
  const res = callWithErrorHandling(fn, instance, type, args)
  if (res && isPromise(res)) res.catch(err => handleError(err, instance, type))   // 多了这一句
  return res
}
```

`type` 是错误码。它也是传给 `errorCaptured` 和 `errorHandler` 的第三个参数 `info`。下表的码都实测过：

| 码 | 位置 | 处理返回的 Promise |
|---|---|---|
| `0` | setup 函数 | 否（异步 setup 见 38.5） |
| `1` | 渲染函数，含模板表达式和渲染中读到的计算属性 | 否 |
| `2` `3` `4` | 侦听器的 getter、回调、清理函数 | 是 |
| `5` | 模板里 `@click` 绑定的原生事件处理函数 | 是 |
| `6` | 组件 `emit` 触发的处理函数 | 是 |
| `m` `um` 等 | 生命周期钩子（`bm` `u` `bum` 同理） | 是 |
| `8` `9` | 指令钩子、Transition 钩子 | 是 |
| `12` | 函数 ref | 否 |
| `13` | 异步组件加载器（它本身返回 Promise） | 是 |
| `10` | `errorHandler` 自己 | 否 |

完整码表在 Vue 文档的“错误码参考”页。

`handleError` 怎样沿父组件链调用 `errorCaptured`，第 11 章 11.6 节已经给过简化源码。这里补三个细节，都用 Vue 3.5.43 实测过：

1. **起点是父组件。**组件自己的 `errorCaptured` 收不到自己的错误。
2. **`errorCaptured` 自己抛错**，新错误从这个组件的父组件重新走一遍流程。原来的错误继续往上，两个都会到 `errorHandler`。
3. **`errorHandler` 自己抛错**，不再进入这条链（它被当作没有组件实例的错误），直接走下面的默认处理。

没有配置 `errorHandler`，或者链上没有人返回 `false` 时，默认处理分开发版和生产版：

| | 开发版 | 生产版 |
|---|---|---|
| 提示 | `[Vue warn]: Unhandled error during execution of …` | 无 |
| 错误 | **重新抛出**。挂载中的错误从 `app.mount()` 抛出，事件处理函数里的错误变成未捕获异常 | `console.error(err)`，应用继续运行 |
| `info` | 文字，如 `setup function` | 链接，如 `https://vuejs.org/error-reference/#runtime-0` |

生产版把 `info` 换成码，是为了省掉整张文字表。你的上报代码要自己把码翻译成文字，或者只存码，到监控平台再查。

生产版默认“打印后继续”，对浏览器合适，对服务端不合适：配置 `app.config.throwUnhandledErrorInProduction = true`，生产版也会重新抛出（38.8 的 SSR 用到它）。

### 38.2 Vue 接不住什么

规则只有一条：**错误发生时，Vue 在调用栈上，或者 Vue 拿到了你返回的 Promise，错误才会被接住。**

`setup` 和渲染函数是 Vue 调用的，错误在 Vue 的 `try/catch` 里。事件处理函数也是 Vue 的包装函数调用的。但 `setTimeout` 的回调是浏览器调用的，Vue 早就返回了。下表是在一棵真实的组件树里逐个实测的结果（开发版和生产版一致）：

| 错误抛出的位置 | 谁收到 |
|---|---|
| setup、渲染函数、生命周期钩子、侦听器、指令钩子、Transition 钩子、函数 ref | `errorCaptured` 链，再到 `errorHandler` |
| 模板里 `@click` 绑定的函数同步抛错 | 同上 |
| 绑定的函数是 `async` 的，或者 `return` 了 Promise，Promise 被拒绝 | 同上 |
| 绑定的函数里启动了 Promise，但没有返回 | 只有 `unhandledrejection` |
| `setTimeout` 回调 | 只有 `window` 的 `error` |
| 原生 `addEventListener` 的监听函数 | 只有 `window` 的 `error` |
| `nextTick(cb)` 的回调 | 只有 `unhandledrejection` |
| 第三方库自己调用的回调 | 取决于库怎么调用：在你的 `setup` 或事件处理函数的调用栈上同步调用，Vue 接得住；库在 `setTimeout`、自己的事件、自己的 Promise 里调用，只到 `window` |

下面的实验台把这些情况放进同一棵树。先猜，再运行。

<Lab id="demo-errors-trace" title="实验台：错误传播追踪器" note="真实的 Vue 应用，站点使用生产构建">
<template #predict>
<Sc predict :a="1">

先猜：点击按钮时，处理函数是 `async` 函数，里面 `await` 之后 `throw`。哪些地方会收到这个错误？

```js
// Widget 里
const onClick = async () => { await 0; throw new Error('出错') }
```

<Opt>只有 window 的 unhandledrejection，因为错误发生在 await 之后</Opt>
<Opt>Boundary 的 errorCaptured 先收到，再到 errorHandler（Boundary 不返回 false 时）</Opt>
<Opt>只有 errorHandler，errorCaptured 不处理事件处理函数</Opt>

<template #explain>

解析：`async` 函数返回 Promise。Vue 的事件包装函数拿到这个 Promise，给它接了 `.catch`，再调用 `handleError`。所以和同步抛错走同一条链。打开实验台，对比“Promise 没有返回给 Vue”那一项：处理函数里的 Promise 没有返回，Vue 拿不到它，错误只到 `unhandledrejection`。

</template>
</Sc>
</template>

<ErrorTrace />
</Lab>

接不住的错误，兜底靠 `window` 上的两个事件：

```js
window.addEventListener('error', e => report(e.error ?? e.message, null, 'window.error'))
window.addEventListener('unhandledrejection', e => report(e.reason, null, 'unhandledrejection'))
```

兜底只能“知道有错”，不能恢复界面，也拿不到组件信息。能让 Vue 接住的，就让 Vue 接住：事件处理函数里的异步操作，`return` 或 `await` 它。

### 38.3 渲染出错后，组件留下什么

渲染函数抛错时，Vue 在 `renderComponentRoot` 里接住它，用一个空的注释节点当作这次渲染的结果：

```js
// runtime-core/componentRenderUtils.ts（简化）
try {
  result = normalizeVNode(render.call(proxy, proxy, ...))
} catch (err) {
  handleError(err, instance, 1)
  result = createVNode(Comment)     // 渲染出一个 <!---->
}
```

实测的结果：

| 出错的位置 | 页面上留下什么 |
|---|---|
| 渲染函数，首次挂载 | 这个组件的位置是 `<!---->`。兄弟组件正常渲染 |
| 渲染函数，**更新**时 | **旧界面也被清掉**，换成 `<!---->`。Vue 不会保留上一次的正常界面 |
| setup 抛错 | 组件**继续渲染**。模板读到的 setup 状态是 `undefined`，得到一个半空的界面 |
| 开发版，没有任何处理 | 错误从 `app.mount()` 抛出，整个应用没有挂上 |

两点要记住。第一，出错的组件没有被销毁，仍然响应数据。下一次渲染成功，界面就恢复。第二，用户看到的是空洞或半空的界面，没有任何说明，也没有办法重试。**错误边界的职责，就是用后备界面替换整棵出错的子树。**

### 38.4 设计一个完整的错误边界

第 11 章的边界只做了“记录错误、返回 `false`、显示一行字”。真实项目还要回答四个问题：怎样重试，怎样在换页时复位，后备界面出错怎么办，边界放在哪里。

```js
import { defineComponent, h, ref, watch, onErrorCaptured } from 'vue'

const FallbackZone = defineComponent({     // 只用来标记“这里是后备界面”
  name: 'FallbackZone',
  setup(_, { slots }) { return () => slots.default() }
})
const inFallback = inst => {
  for (let c = inst; c; c = c.$parent) if (c.$options.name === 'FallbackZone') return true
  return false
}

export const ErrorBoundary = defineComponent({
  name: 'ErrorBoundary',
  props: { resetKey: null },               // 例如 route.fullPath
  emits: ['caught'],
  setup(props, { slots, emit }) {
    const error = ref(null)
    const reset = () => { error.value = null }
    onErrorCaptured((err, inst, info) => {
      if (inFallback(inst)) return         // 后备界面自己出错：放行，不要吞掉
      if (!error.value) { error.value = err; emit('caught', err, inst, info) }
      return false                         // 停止传递，应用级不再重复处理
    })
    watch(() => props.resetKey, () => { if (error.value) reset() })
    return () => error.value
      ? h(FallbackZone, null, { default: () => slots.fallback?.({ error: error.value, reset }) })
      : slots.default?.()
  }
})
```

```vue
<ErrorBoundary :reset-key="route.fullPath" @caught="onCaught">
  <RouterView />
  <template #fallback="{ error, reset }">
    <p>这一页出了问题。</p>
    <button @click="reset">重试</button>
  </template>
</ErrorBoundary>
```

逐点说明：

1. **重试就是重新挂载。**出错时，`v-if` 式的切换把整棵子树卸载了。`reset` 清除错误后，子树从头创建，`setup` 重新运行，旧状态不会残留。不需要 `key`。`key` 用于“不卸载也要重建”的场景，例如后备界面和内容同时显示。
2. **换页自动复位，但只在出错时。**`watch` 里的 `if (error.value)` 不能省。没有它，每次换页都会重建整棵子树，用户的滚动位置和输入全部丢失。
3. **后备界面出错不能被边界吞掉。**后备界面是边界自己的子树，它出错时，边界的 `errorCaptured` 会再次收到。没有 `inFallback` 判断，错误被 `return false` 吞掉，该区域静默变成空白，没有任何上报。有了判断，错误继续往上，由外层边界或 `errorHandler` 处理。实测过。
4. **边界接不住自己的错误。**边界的 `setup` 抛错，要靠外层。所以在应用最外层、路由层、有风险的小部件各放一个：粒度决定“出错时失去多少界面”。
5. **边界接不住异步错误**（38.2 的表）。请求失败用状态建模，见 38.5。

<Exercise id="retryBoundary" />

### 38.5 请求错误是状态，不是异常

先分清两类失败：

| 类别 | 例子 | 怎样表示 |
|---|---|---|
| 预期失败 | 404、网络断开、校验不通过、没有权限 | 状态：`error` ref，在原地显示 |
| 异常 | 代码 bug、接口返回了违反约定的数据 | 抛出，交给错误边界和上报 |

预期失败是业务的一部分。用抛出表示，就把“这个用户不存在”和“代码写错了”混在一起，边界会把整个区域换成“出错了”。第 19 章 19.5 节讲的服务端状态，天然就带 `loading`、`error`、`data` 三个状态。

组合式函数的约定：**内部 catch，返回 `error`，不向外抛。**

```js
export function useUser(id) {
  const data = ref(null), error = ref(null), loading = ref(false)
  async function load() {
    loading.value = true; error.value = null
    try {
      const res = await fetch(`/api/users/${id.value}`)
      if (!res.ok) throw new HttpError(res.status)
      data.value = await res.json()
    } catch (e) {
      error.value = e                     // 预期失败：变成状态；保留旧的 data
    } finally { loading.value = false }
  }
  watch(id, load, { immediate: true })
  return { data, error, loading, retry: load }
}
```

如果 `load` 把错误抛出来，侦听器回调返回的 Promise 会被 Vue 接住（38.1 的表），错误到达 `errorCaptured`，于是“用户不存在”去找错误边界。这不是你想要的。只有真正的异常才重新抛出，例如在 `catch` 里写 `if (!(e instanceof HttpError)) throw e`。

**`async setup` 与 Suspense。**`<script setup>` 顶层写 `await`，组件就变成异步 setup。实测的行为：

| 情况 | 结果 |
|---|---|
| 有 `<Suspense>`，异步 setup 抛错 | `errorCaptured` 链和 `errorHandler` 都收到（码 `0`） |
| 有 Suspense，**没有**边界 | `errorHandler` 收到错误，然后 Suspense **照常 resolve**，组件用缺失的 setup 状态渲染模板 |
| 有 Suspense，边界放在 Suspense 外面 | 边界显示后备界面，替换掉加载中的内容 |
| 没有 Suspense | 开发版警告“返回了 promise 但没有 Suspense”，错误**静默丢失**，没有任何处理函数收到 |

所以顶层 `await` 要配套：Suspense 加外层边界。

### 38.6 路由与 store 的错误

这两处的错误不经过 Vue 的 `errorHandler`，因为调用它们的不是 Vue 组件。

**路由。**对照 vue-router 5 实测（5.3.1 和 5.4.0 的行为相同）：

| 情况 | `router.onError` | `router.push()` 的 Promise |
|---|---|---|
| 守卫抛错，同步或 `async`（`beforeEach`、`beforeResolve`、`beforeEnter`） | 收到 | 被拒绝，路由不变 |
| 懒加载的路由组件加载失败 | 收到 | 被拒绝，路由不变 |
| 守卫返回 `false` | 不收到 | 成功，返回 `NavigationFailure`（`aborted`） |
| 导航到当前地址 | 不收到 | 成功，返回 `NavigationFailure`（`duplicated`） |

导航失败（`NavigationFailure`）是值，不是错误。用 `isNavigationFailure` 判断。因为 `push` 会被拒绝，代码里的 `await router.push(...)` 要 `try/catch`，否则这个拒绝成为 `unhandledrejection`。

**懒加载 chunk 404。**新版本发布后，服务器上旧的 chunk 文件被删了。用户页面还是旧的，点到一个没加载过的路由，动态 `import()` 请求旧文件名，404。`router.onError` 收到这个错误。常见处理是整页刷新一次，拿到新的 `index.html`：

```js
const isChunkError = e => /dynamically imported module|Importing a module script failed|Loading chunk/i.test(e?.message)
router.onError((error, to) => {
  if (isChunkError(error) && !sessionStorage.getItem('chunk-reloaded')) {
    sessionStorage.setItem('chunk-reloaded', '1')   // 只刷新一次，避免死循环
    location.assign(to.fullPath)
    return
  }
  report(error, null, 'router', { to: to.fullPath })
})
router.afterEach((to, from, failure) => {
  if (!failure) sessionStorage.removeItem('chunk-reloaded')   // 导航成功后清除标记，下次部署还能再刷新一次
})
```

各浏览器的错误信息措辞不同，所以用正则匹配多个。Chrome 是 `Failed to fetch dynamically imported module`，Safari 是 `Importing a module script failed`，这两条我们在真实浏览器里实测过。Firefox 的措辞来自社区报告，含有 `dynamically imported module`，也能匹配，但我们没有在 Firefox 里实测。`Loading chunk` 是 webpack 的措辞，Vite 项目不会出现。Vite 还提供了更直接的事件：构建产物里的动态导入失败时，会先派发可取消的 `vite:preloadError`（`event.payload` 是错误），没人 `preventDefault()` 才继续抛出。

**Pinia。**action 抛错（同步或 `async`）时，`$onAction` 的 `onError` 会收到，**同时错误仍然抛给调用者**。`onError` 只是旁观，不吞掉错误。所以在插件里统一上报很方便：

```js
pinia.use(({ store }) => {
  store.$onAction(({ name, onError }) => {
    onError(err => report(err, null, 'pinia', { store: store.$id, action: name }))
  })
})
```

### 38.7 上报与监控

**上报什么。**一条错误上报的价值，取决于它带的上下文：

| 内容 | 来源 |
|---|---|
| 错误本身 | `message`、`stack`、`name` |
| 出错的组件和父链 | `errorHandler` 的第二个参数 |
| 来源 | `info`（生产版是码），或你自己标的入口名 |
| 路由 | `location`、`router.currentRoute` |
| 版本号 | 用来定位是哪次部署出的错。构建时注入：在 `vite.config` 的 `define` 里配置，例如 `define: { __APP_VERSION__: JSON.stringify(版本号) }`，代码里就能读到 `__APP_VERSION__`。它不是 Vite 内置的 |
| 用户操作面包屑 | 最近几次点击、导航、请求 |

**组件名链。**`errorHandler` 收到的 `instance` 是组件的公开实例。沿 `$parent` 往上走：

```js
const nameOf = c => c.$options.name || c.$options.__name || '(匿名)'
const chainOf = inst => { const a = []; for (let c = inst; c; c = c.$parent) a.push(nameOf(c)); return a }
// 例：['UserCard', 'Panel', 'App']
```

两个事实，在生产构建里实测过：组件名在压缩后仍然可用，因为 `name` 和 SFC 编译器写入的 `__name` 是字符串属性，不会被压缩改名。函数式组件没有实例，`$parent` 链会跳过它们。开发版有更完整的“组件追踪”：警告里的 `at <Child> at <App>`，可以通过 `app.config.warnHandler(msg, instance, trace)` 拿到。**`warnHandler` 只在开发版调用**，生产版的警告函数是空的，不能依赖它。

**去重、采样、限流。**一个渲染错误出现在 1000 行的列表里，会产生 1000 次上报。一个出错的侦听器在循环里触发，一秒钟几千次。没有保护，监控服务的配额被一个 bug 用光，用户的网络也被占满。

```js
const seen = new Map(), reported = new WeakSet(), MAX = 20
export function report(err, inst, info, extra) {
  if (reported.has(err)) return                     // 同一个错误对象只报一次
  if (err && typeof err === 'object') reported.add(err)
  const chain = inst ? chainOf(inst) : []
  const fp = String(err?.message ?? err) + '@' + chain[0]   // 指纹
  const hit = seen.get(fp)
  if (hit) { hit.count++; return }                  // 重复的只累加次数，随批量一起发送
  if (seen.size >= MAX) return                      // 限流：一个会话最多 MAX 种
  const item = { message: err?.message, stack: err?.stack, chain, info, count: 1,
    route: location.pathname, release: __APP_VERSION__, ...extra }
  seen.set(fp, item)
  navigator.sendBeacon('/api/errors', JSON.stringify(item))
}
```

`WeakSet` 解决一个具体问题：同一个错误可能被两个入口各收一次。例如 action 抛出的错误，先被 `$onAction` 看到，再沿着事件处理函数返回的 Promise 到达 `errorHandler`。采样是另一种保护：服务端按比例只收一部分，适合高流量的非关键错误。

<Exercise id="errorReporter" />

**生产环境的压缩代码。**线上的栈是 `at a (app.3f2c.js:1:20483)`，没法读。需要 source map：

1. 构建时设置 `build.sourcemap: 'hidden'`。Vite 照常生成 `.map` 文件，但产物里不写 `//# sourceMappingURL` 注释，浏览器和用户不会下载它。
2. 构建流水线把 `.map` 文件上传给监控服务，然后从发布目录里删除它们。Sentry 推荐用它的 Vite 插件（或 Sentry Wizard、`sentry-cli`），插件会给压缩后的 JS 和对应的 map 注入同一个 Debug ID，上传后还能自动删除 map。
3. 上报时，Sentry SDK 把压缩文件里的 Debug ID 随错误一起发出，监控服务用它找到对应的 map，把压缩栈还原成源码位置。较老的做法是按版本号（`release`）加文件名匹配，但文件路径一变就会失效，新项目不用它。其他监控服务的机制不同，以各自文档为准。

`.map` 文件会暴露源码，所以不对外公开。

**监控 SDK 做了什么。**以 `@sentry/vue` 12.5 为例，读它的源码，`Sentry.init({ app, dsn })` 做的事，正是本章前面讲的这些入口：

1. **包装 `app.config.errorHandler`。**它保存你原来的处理函数，换成自己的：取组件名和组件链、`$props`、`info`，放进错误的上下文，异步上报，再调用你原来的函数。如果你原来没有配置，它在最后重新抛出（Vue 会当作 `errorHandler` 自己出错处理）。
2. **默认集成里有 `window` 的 `error` 和 `unhandledrejection`**（38.2 的兜底），还有去重和面包屑（记录出错之前的用户操作）。
3. **需要追踪时，用 `app.mixin` 注入钩子**，给组件的生命周期计时。

两个使用上的注意：`init` 要在 `app.mount()` 之前调用（SDK 源码里专门检查并警告）；在 `init` 之后再给 `app.config.errorHandler` 赋值，会覆盖 SDK 的包装，组件错误不再上报。

::: deep 商业 SDK 比这个最小版多做了什么
上面的 `report` 是单个文件能写完的最小版本。和商业 SDK 比，缺少的是：失败重试和离线缓存、会话级的采样与配额、敏感字段脱敏（`$props` 里可能有密码和令牌）、批量合并发送。其中脱敏最容易被忘记：把整个 `$props` 发出去之前，先白名单过滤。
:::

### 38.8 给用户看什么，以及 SSR 里的错误

**给用户看什么。**不同的错误，显示的地方和内容不同：

| 错误 | 显示在哪里 | 内容 |
|---|---|---|
| 表单校验失败 | 字段旁边（第 12 章，第 39 章） | 哪个字段，怎样改 |
| 请求失败，可重试 | 数据所在的区域（`error` 状态） | 发生了什么，加一个重试按钮，保留已有数据 |
| 没有权限、不存在 | 页面或路由级 | 专门的提示页 |
| 异常（bug） | 错误边界 | 通用提示，重试按钮，一个错误编号 |

提示语写两件事：**发生了什么，用户能做什么。**“保存失败，网络连接中断。检查网络后重试”，比“出错了”和“Error: Failed to fetch”都好。不要显示栈和内部信息，不要责备用户。

一个错误只提示一次。边界已经显示了后备界面，就 `return false`，不要再让 `errorHandler` 弹一个 toast。表单错误留在表单里，全局错误才进全局通道。

**SSR 里的错误。**对照第 36 章的 `renderToString`，用 Vue 3.5.43 实测：

| 情况 | 开发环境 | 生产环境 |
|---|---|---|
| 组件 setup 或渲染抛错，没有任何处理 | `renderToString` 被拒绝 | 打印错误后**继续**，返回带空洞的 HTML |
| `onErrorCaptured` 返回 `false` | 生效，渲染继续 | 同上 |
| 配置了 `errorHandler` | 生效，渲染继续 | 同上 |
| `throwUnhandledErrorInProduction: true` | 没有区别，开发环境本来就抛出 | `renderToString` 被拒绝 |

服务端的原则相反：出错的页面不应该返回 200 和一个残缺的 HTML。在服务端应用上设置 `throwUnhandledErrorInProduction = true`，让渲染失败，再由服务器返回错误页或降级到客户端渲染。如果用 `errorHandler`，记得自己记下“这次渲染失败了”。

::: pitfalls
1. 不要让事件处理函数里的 Promise 悬空。`return` 或 `await` 它，Vue 才接得住。
2. 不要在边界里无条件 `return false`。后备界面自己的错误会被吞掉，该区域静默空白。
3. 不要在换页时无条件重建边界的子树。只在出错时复位。
4. 不要把 404 这样的预期失败当异常抛出。用 `error` 状态。
5. 不要在 `Sentry.init` 之后再覆盖 `app.config.errorHandler`。
6. 不要依赖 `warnHandler` 做线上监控。它只在开发版调用。
7. 上报必须去重和限流，否则一个 bug 能打满监控配额。
:::

::: selfcheck
<Sc :a="2">

下面的组件树里，`Child` 的 `setup` 抛出错误。`Mid` 的 `errorCaptured` 返回 `false`。哪些函数会被调用？

```js
// Root:  onErrorCaptured(() => log('root'))
// Mid:   onErrorCaptured(() => { log('mid'); return false })
// Child: onErrorCaptured(() => log('child')); setup() { throw new Error('x') }
// app.config.errorHandler = () => log('app')
// 树：Root > Mid > Child
```

<Opt>child，然后 mid</Opt>
<Opt>mid，然后 root，然后 app</Opt>
<Opt>只有 mid</Opt>
<Opt>mid，然后 app</Opt>

<template #explain>

解析：`handleError` 从**父组件**开始，所以 `Child` 自己的 `errorCaptured` 不会被调用。第一个是 `Mid`，它返回 `false`，传递停止，`Root` 和 `errorHandler` 都收不到。最迷惑的是第一项：以为组件会先处理自己的错误。
</template>
</Sc>

<Sc :a="0">

生产构建，没有配置 `errorHandler`，也没有 `errorCaptured`。一个按钮的 `@click` 处理函数同步抛出错误。结果是什么？

<Opt>用 `console.error` 打印错误，应用继续运行</Opt>
<Opt>错误变成未捕获异常，`window` 的 `error` 事件收到它</Opt>
<Opt>组件被卸载，页面该区域变空</Opt>
<Opt>什么也不打印，错误被静默吞掉</Opt>

<template #explain>

解析：生产版的默认处理是 `console.error(err)`，不重新抛出。第二项是**开发版**的行为（重新抛出）。要在生产版也重新抛出，设置 `app.config.throwUnhandledErrorInProduction = true`。事件处理函数抛错不会卸载组件。
</template>
</Sc>

<Sc :a="2">

三个按钮绑定了不同的处理函数。`api.save()` 返回一个会被拒绝的 Promise。哪一项正确？

```js
function onA() { api.save() }
function onB() { return api.save() }
async function onC() { await api.save() }
```

<Opt>三个都会到 `errorHandler`</Opt>
<Opt>只有 C 到 `errorHandler`，因为只有 `async` 函数被 Vue 识别</Opt>
<Opt>B 和 C 到 `errorHandler`，A 的错误只触发 `unhandledrejection`</Opt>
<Opt>三个都只触发 `unhandledrejection`，Vue 不处理 Promise</Opt>

<template #explain>

解析：Vue 的事件包装函数看的是处理函数的**返回值**：是 Promise 就接 `.catch`。B 返回了 Promise，C 是 `async` 函数，一定返回 Promise。A 没有返回，Vue 拿不到那个 Promise，它的拒绝没有任何人处理。最迷惑的是第二项：不一定要 `async`，`return` 一个 Promise 就够了。
</template>
</Sc>

<Sc :a="1">

一个子组件在**更新**时，渲染函数抛出错误，没有错误边界。用户看到什么？

<Opt>保留上一次的正常界面，只是不再更新</Opt>
<Opt>这个组件的位置变成空的注释节点，应用其余部分正常，之后某次渲染成功时会恢复</Opt>
<Opt>整个应用变成空白页</Opt>
<Opt>组件被卸载，数据被清空</Opt>

<template #explain>

解析：`renderComponentRoot` 接住错误，用注释节点作为这次渲染的结果，旧界面被替换掉。组件没有被卸载，仍然响应数据，所以下一次渲染成功就会恢复。第一项最迷惑：Vue 不会保留旧界面。
</template>
</Sc>

<Sc :a="0">

`useUser(id)` 请求 `/api/users/9`，服务器返回 404（用户不存在）。哪种设计最合适？

<Opt>内部 `catch`，把错误放进 `error` ref，页面在原地显示“用户不存在”</Opt>
<Opt>让 `useUser` 抛出，由页面外层的错误边界显示后备界面</Opt>
<Opt>在 `useUser` 里 `setTimeout` 之后抛出，让 `window.onerror` 处理</Opt>
<Opt>调用 `app.config.errorHandler` 手动触发</Opt>

<template #explain>

解析：404 是预期失败，是业务的一部分，用状态表示，在原地显示。边界是给异常（bug）用的，用它显示“用户不存在”，会把整块区域换成“出错了”，用户也无法继续使用页面的其他部分。
</template>
</Sc>

<Sc :a="3">

`beforeEach` 是一个 `async` 守卫，里面抛出错误。下面的代码会怎样？

```js
router.onError(e => log('onError'))
try { await router.push('/b'); log('resolved') } catch { log('rejected') }
```

<Opt>只记录 `onError`，`push` 成功，路由已切换</Opt>
<Opt>只记录 `resolved`，守卫的错误被路由吞掉</Opt>
<Opt>记录 `resolved`，返回一个 `NavigationFailure`</Opt>
<Opt>记录 `onError` 和 `rejected`，路由保持不变</Opt>

<template #explain>

解析：守卫抛出的错误，路由会调用 `onError`，同时让 `push` 的 Promise 被拒绝。`NavigationFailure`（第三项）是守卫返回 `false` 或重复导航时的值，不是抛错。最迷惑的是第一项：抛错的导航不会完成。
</template>
</Sc>

<Sc :a="1">

设置 `build.sourcemap: 'hidden'` 的效果是什么？

<Opt>不生成 `.map` 文件，产物更小</Opt>
<Opt>生成 `.map` 文件，但产物里没有指向它的 `sourceMappingURL` 注释</Opt>
<Opt>把 map 以内联的 data URI 写进产物</Opt>
<Opt>只在开发服务器里生成 map</Opt>

<template #explain>

解析：`hidden` 和 `true` 一样会生成独立的 `.map` 文件，区别是产物里的注释被去掉，浏览器不会去下载它。把 `.map` 上传给监控服务后，再从发布目录删除。内联（`'inline'`）会把源码暴露给每个用户。
</template>
</Sc>

:::

::: summary
- Vue 用 `callWithErrorHandling` 包住它调用的用户代码，用 `callWithAsyncErrorHandling` 额外接住返回的 Promise。错误码也是 `info`。
- `handleError` 从父组件开始，沿链调用 `errorCaptured`，返回 `false` 停止，最后到 `errorHandler`。没有处理时，开发版重新抛出，生产版 `console.error` 后继续。
- Vue 接不住不在它调用栈上的错误：`setTimeout`、原生监听函数、没有返回的 Promise。兜底用 `window` 的 `error` 和 `unhandledrejection`。
- 渲染出错后，组件的位置变成注释节点，更新时旧界面也会被清掉。setup 抛错时组件继续渲染半空的界面。
- 完整的错误边界：捕获并返回 `false`，后备界面带重试，换页只在出错时复位，后备界面自己的错误要放行。
- 预期失败（404、校验）用状态表示，异常才抛出。顶层 `await` 要配 Suspense 和外层边界。
- 路由用 `router.onError`，守卫抛错时 `push` 也被拒绝。Pinia 用 `$onAction` 的 `onError`，错误仍然抛给调用者。
- 上报要带组件链、`info`、路由、版本号，并且去重、限流。线上栈靠隐藏的 source map 还原。`warnHandler` 只在开发版有效。
- 给用户的提示写“发生了什么，能做什么”。SSR 的生产环境默认继续渲染，要用 `throwUnhandledErrorInProduction` 让它失败。
:::
