---
title: 收尾项目：看板 Pro 的架构升级
id: capstone
stage: 6
chapter: 42
desc: 回到第 23 章的看板 Pro，用错误处理、性能诊断、组件分层等做架构升级，并用原理解释自己的决定
---

# 收尾项目：看板 Pro 的架构升级

::: goals
<Goal checks="sc:0,ex:capRequest">写出规范化失败、只重试安全请求的请求层，并说明懒加载失败由哪个钩子接住。</Goal>
<Goal checks="sc:1,ex:capBoardUpdates">按诊断流程找出并修掉重渲染问题，并解释更新次数为什么变化。</Goal>
<Goal checks="sc:2">说明水合不匹配的成因，并让一个只读页面在服务端渲染后没有警告。</Goal>

:::

::: rt
阅读主线约 16 分钟，深入内容约 4 分钟（可选，是每条线的示范答案）。另外留时间做练习和自测。项目在你的电脑上完成：必做的三条线大约需要 10 到 14 小时，每条选做线 2 到 4 小时。
:::

::: terms
升级线
: 围绕一章内容在项目上做的一组相关改动。每条线有要解决的问题、任务、验收标准，和需要写下来的原理解释。
:::

::: why
第 23 章你做出了一个能跑的看板。能跑，不等于经得起放大。任务多到 1000 个时它会卡，请求失败时用户看到什么没有人设计过，键盘用户只能靠 Tab 一路按过去。

学完原理和架构阶段以后，你知道的比做第 23 章时多得多。本章不让你从零开始，而是回到同一个项目上做升级。每条升级线都要求你写下“为什么”：这是区别于“照着教程改”的地方。
:::

### 42.1 起点和方法

**起点状态。**你需要第 23 章做完的项目。没做完也可以开始，只要下面这些命令都通过，并且文件齐全：

```bash
npm run type-check     # 没有错误
npx vitest run         # store、TaskCard、性能测试都通过
npm run build          # 构建成功，详情页是单独的文件
```

需要有这些文件：`fake-api.ts`（假后端，支持 `/api/_debug?delay=&failRate=&seed=`）、`src/api/client.ts` 和 `tasks.ts`、`src/stores/tasks.ts`（`byId`、`ids`、`loadState`、`notice`、`columns`、`move` 等）、`TaskCard.vue`、`TaskForm.vue`、`BoardView.vue`、`TaskDetailView.vue`、`router/index.ts`。如果有缺的，回到第 23 章的 23.4 和 23.5。

**升级线。**每条线按同样的格式：问题、任务、验收、用原理解释。必做和选做分开：

| 线 | 对应的章 | 必做 | 要解决的问题 |
|---|---|---|---|
| A 错误处理 | 第 38 章 | 必做 | 组件出错整页空白；请求失败没有人知道；懒加载失败没有提示 |
| B 性能诊断 | 第 40 章 | 必做 | 1000 个任务时首屏、返回看板、移动卡片都很慢 |
| C 组件分层与键盘 | 第 34、35 章 | 必做 | 只能靠 Tab 一张一张按；键盘规则没有地方放 |
| D 表单层 | 第 39 章（选读） | 选做 | 新建表单没有异步校验和子任务 |
| E 服务端渲染 | 第 36、37 章 | 选做 | 只读页面首屏为空，搜索引擎看不到内容 |
| F 组件库 | 第 41 章（选读） | 选做 | 分层后的组件想在别的项目里复用 |

**“用原理解释”。**每条线末尾有一两个问题，要求你写下自己的回答，再对照示范答案。回答里要出现原理里的名字（例如“`hasChanged` 比较引用”），不能只写现象。原理来自第 24 到 33 章。

**验证用的小工具。**升级线需要假后端多两个能力。在 `fake-api.ts` 的 `handle` 里，`await new Promise(...)` 延迟之前加上错误收集：

```ts
const reports: unknown[] = []   // 放在 fakeApi() 里，和 tasks 并列
// handle 里，在延迟之前：
if (url.pathname === '/_report') {
  if (req.method === 'POST') reports.push(await readBody(req))
  return send(res, 200, reports)   // 浏览器里打开 /api/_report 就能看到所有上报
}
```

### 42.2 线 A：错误处理（必做，第 38 章）

**问题。**在 `TaskCard` 里加一行 `throw new Error('boom')`，整个看板会变成空白。请求连续失败，没有人收到通知。点了懒加载的页面，文件下载失败，什么也没有发生。

**任务。**

1. `src/report.ts`：一个 `report(error, { source, info })`。同一个错误 5 秒内只报一次，用 `navigator.sendBeacon` 发到 `/api/_report`，不可用时退回 `fetch` 加 `keepalive`。
2. `ErrorBoundary.vue`：`onErrorCaptured` 里记下错误、调用 `report`，返回 `false`；有错误时显示后备界面和“重试”，重试时改变 `key` 让子树整个重建；对外暴露 `reset()`，换页时调用。把它包在 `App.vue` 的 `RouterView` 外面。
3. `main.ts`：`app.config.errorHandler` 兜底；`window` 的 `error` 和 `unhandledrejection` 也调用 `report`。
4. 请求层：把第 23 章的 `request` 改成“失败规范成 `ApiError`，只对 GET 且 status 为 0 或 5xx 的失败重试两次，最终仍失败的意料之外的错误才上报”。先做下面的页面练习。
5. `router.onError`：上报，并在一个全局的提示（模块里的一个 `globalNotice` ref）里写“页面没能加载”。

<Exercise id="capRequest" />

边界组件的核心只有这些：

```vue
<script setup lang="ts">
const error = ref<Error | null>(null)
const attempt = ref(0)   // 改变 key，让子树整个重建

onErrorCaptured((err, _instance, info) => {
  error.value = err instanceof Error ? err : new Error(String(err))
  report(err, { source: 'vue', info })
  return false          // 已经处理，不再向上传给 app.config.errorHandler
})
function reset() {
  if (!error.value) return   // 没有错误时不要重建子树
  error.value = null
  attempt.value++
}
defineExpose({ reset })
</script>
<template>
  <div v-if="error" role="alert">
    <p>这一部分出错了：{{ error.message }}</p>
    <button type="button" @click="reset">重试</button>
  </div>
  <slot v-else :key="attempt" />
</template>
```

**验收标准。**

| 操作 | 应该看到 |
|---|---|
| 在 `TaskCard` 的 setup 里 `throw new Error('boom')`（只对 id 为 3 的任务），刷新 | 页面显示“这一部分出错了：boom”和“重试”；`/api/_report` 里恰好 1 条，`source` 是 `vue` |
| 去掉这行，点“重试” | 看板恢复，不用刷新页面 |
| 设 `failRate=1`，刷新 | 约 2 秒后显示“加载失败”和重试按钮（默认每次请求服务端先等 300 毫秒，共请求三次，中间重试前又等了 300 和 600 毫秒，合计约 1.8 秒）；`/api/_report` 里只增加 1 条，`source` 是 `request` |
| 控制台运行 `Promise.reject(new Error('x'))` | `/api/_report` 里出现 `source` 为 `promise` 的记录 |
| 在 Network 面板屏蔽 `TaskDetailView` 的文件，点一张卡片的标题 | 留在看板，顶部出现“页面没能加载”；上报里有 `source` 为 `router` 的记录 |

**用原理解释。**写下你的回答：

1. 为什么懒加载的文件下载失败时，包在外面的 `ErrorBoundary` 的 `onErrorCaptured` 没有收到它，要靠 `router.onError`？
2. 为什么 `ErrorBoundary` 要在换页时 `reset()`，而且只在有错误时才重建子树？

::: deep 示范答案（线 A）
1. `onErrorCaptured` 只接住组件实例上的错误：渲染、生命周期、侦听器、事件处理函数等（第 38 章）。懒加载失败发生在导航过程中，目标组件还没有创建，没有组件实例，错误沿着路由的导航流程走，由 `router.onError` 接住。错误边界管不到“组件还没存在”的失败。
2. 后备界面显示时，边界只渲染后备内容，旧的子树已经销毁。换页后路由会渲染新页面，但边界的 `error` 还在，用户会一直看到后备界面。所以换页要复位。没有错误时不重建，是因为改变 `key` 会销毁并重建整个子树：每次换页都重建，`KeepAlive` 缓存的看板和各页的状态都会丢掉。
:::

### 42.3 线 B：性能诊断（必做，第 40 章）

**问题。**第 23 章的性能测试只证明“移动一张卡片，其他卡片不更新”。1000 个任务时还有别的问题，要用诊断流程找出来：先量，再猜，再改，再量。

**任务。**

1. 把数据换成 1000 个任务：访问 `/api/_debug?seed=1000&delay=0`。
2. `npm run build`，再 `npm run preview`（构建版本才有真实的数字，开发模式的数字没有参考价值）。在 Chrome 开发者工具的 Performance 面板里把 CPU 限速调到 4 倍，记录三个指标：
   - 刷新后，第一张卡片出现的时间，和这期间的长任务（超过 50 毫秒的任务）；
   - 从详情页点“返回看板”，到卡片出现的时间；
   - 移动一张卡片，更新一帧的耗时。
3. 同时记下首屏的 DOM 节点数（控制台运行 `document.getElementsByTagName('*').length`）。
4. 修两到三个问题。我们的参考实现修了下面三个。你的数字会不同，按你自己的修前数字判断。

| 问题 | 症状 | 处方 |
|---|---|---|
| 一次渲染 1000 张卡片 | 首屏有两个超过 100 毫秒的长任务，DOM 节点约 5400 个 | 把列拆成 `BoardColumn`，每列先显示 50 张，加“显示更多” |
| 每次返回看板都重新挂载 | 返回要 290 毫秒，又是两个长任务 | 在 `RouterView` 里用 `KeepAlive`，`include="BoardView"` |
| 没有变化的列也在更新 | 移动一张卡片，三列都重新渲染 | 列的选择器内容没变时返回上一次的数组 |

我们的测量（Chromium，CPU 4 倍限速，构建版本，1000 个任务）：

| 指标 | 修之前 | 修之后 |
|---|---|---|
| 第一张卡片出现 | 约 516 毫秒 | 约 280 毫秒 |
| 首屏长任务 | 116 毫秒和 175 毫秒 | 110 毫秒（一个） |
| 返回看板 | 约 290 毫秒，长任务 112 和 158 毫秒 | 约 43 毫秒，没有长任务 |
| 移动一张卡片的一帧 | 约 35 毫秒 | 约 22 毫秒 |
| 首屏 DOM 节点 | 5446 | 885 |

关键的两处改动：

```ts
// stores/tasks.ts：内容没变时返回上一次的数组
function column(status: Status) {
  return computed<number[]>((prev) => {
    const next = ids.value
      .filter((id) => byId.value[id]?.status === status)
      .sort((a, b) => (byId.value[a]?.due ?? '9999').localeCompare(byId.value[b]?.due ?? '9999'))
    return prev && prev.length === next.length && prev.every((id, i) => id === next[i]) ? prev : next
  })
}
```

```vue
<!-- App.vue -->
<RouterView v-slot="{ Component }">
  <KeepAlive include="BoardView"><component :is="Component" /></KeepAlive>
</RouterView>
```

先在页面上做一个缩小版：同样的两个原因，换成 9 个任务。

<Exercise id="capBoardUpdates" />

回到项目，把第 23 章的性能测试改成“按列计数”，并换一个会被渲染出来的任务（只显示前 50 张，id 500 不在页面上）：

```ts
// 1000 个任务，id 按 todo、doing、done 轮流分配（id 1、4、7……是待办）；id 4 在待办列且已渲染
await useTaskStore().move(4, 'doing')
await flushPromises()
expect(updates.TaskCard).toBe(0)
expect(updates.BoardColumn).toBe(2)   // 待办和进行中更新，已完成不更新
```

**验收标准。**

| 检查 | 标准 |
|---|---|
| 返回看板 | 没有长任务 |
| 首屏 DOM 节点 | 少于 1500 个 |
| 性能测试 | 通过：移动一张已渲染的卡片，`TaskCard` 更新 0 次、`BoardColumn` 更新 2 次 |
| 故意把 `column()` 改回每次返回新数组 | 性能测试变红（我们实测：`BoardColumn` 更新 3 次） |
| 在设计决策记录里 | 写下修前和修后的数字 |

**用原理解释。**

1. 为什么选择器“内容没变就返回上一次的数组”以后，没有变化的列不再更新？
2. 为什么从详情页回来，用了 `KeepAlive` 就快了，而且快到 43 毫秒？

::: deep 示范答案（线 B）
1. 子组件是否更新，由 `shouldUpdateComponent` 比较 props 决定，比较用 `hasChanged`，也就是 `Object.is`：对象和数组比引用（第 31 章）。三个选择器都读了每个任务的 `status`，一个任务变化，三个 computed 都重新计算；如果每次返回新数组，三列的 `ids` 引用都变，三列都更新。`computed` 的 getter 第一个参数是上一次的值，内容相同时返回它，computed 的值引用没变，下游就不会被通知（第 24 章），列的 props 没变，已完成列不更新。
2. `KeepAlive` 把被切走的组件实例和它的 DOM 缓存起来，不销毁。返回时不再创建 1000 个组件实例和 DOM，只把缓存的 DOM 插回页面并触发激活钩子（第 33 章）。剩下的 43 毫秒是插入 DOM 和排版的时间。代价是缓存的组件一直占着内存。
:::

### 42.4 线 C：组件分层与键盘（必做，第 34、35 章）

**问题。**看板有 1000 张卡片，键盘用户要按几百次 Tab。更根本的问题是：键盘规则写在哪里？写进 `TaskCard`，别的列表用不了；写进 `BoardView`，看板和键盘行为缠在一起。

**任务。**按第 35 章的三层，做一个卡片导航，三层分别是：

1. **第 1 层 `useCardNavigation`（状态与行为，不输出标记）。**只有一张卡片在 Tab 顺序里（roving tabindex）。方向键上下在同列移动，左右在相邻的列移动，Home 和 End 跳到两端；Shift 加左右键把当前卡片移到相邻的列，焦点跟着卡片走。键盘监听用事件委托，整个看板只挂一个。
2. **第 2 层 `CardNav.vue`（无渲染组件）。**它自己不输出元素，只用作用域插槽把 `tabindexOf`、`onKeydown`、`onFocusin` 交给使用者。
3. **第 3 层是 `BoardView` 和 `BoardColumn`。**它们用 `CardNav`，把绑定接到根元素和每张卡片上。键盘规则不在这里写。

```ts
// composables/useCardNavigation.ts（核心部分）
const current = ref<number | null>(null)
// current 指向的卡片被删除或还没选过时，退回到第一张卡片，保证总有一个停靠点
const stop = computed(() => (current.value !== null && locate(current.value) ? current.value : firstId()))
const tabindexOf = (id: number) => (stop.value === id ? 0 : -1)

function onKeydown(e: KeyboardEvent) {
  const card = e.target as HTMLElement
  if (!card.matches?.('[data-card-id]')) return   // 卡片里的按钮自己处理按键
  // … 找到 id、所在列、位置
  if (e.key === 'ArrowDown') focus(list[at.index + 1], root)
  else if (e.key === 'ArrowRight' && e.shiftKey) { opts.move(id, target); focus(id, root) }
  // … 其他按键
  else return
  e.preventDefault()   // 处理过的按键不再让页面滚动
}
```

```vue
<!-- BoardView.vue：第 3 层 -->
<CardNav v-slot="{ tabindexOf, onKeydown, onFocusin }" :columns="columns" :move="move">
  <div class="columns" data-board @keydown="onKeydown" @focusin="onFocusin">
    <BoardColumn v-for="col in COLUMNS" :key="col.key" :ids="columns[col.key]" :tabindex-of="tabindexOf" … />
  </div>
</CardNav>
```

`BoardColumn` 给每张 `TaskCard` 加 `:data-card-id="id"` 和 `:tabindex="tabindexOf(id)"`。这两个属性落在卡片的根元素 `li` 上。

**验收标准。**

| 操作 | 应该看到 |
|---|---|
| 在页面上数 `tabindex="0"` 的卡片 | 恰好 1 张，移动后仍是 1 张 |
| Tab 进入看板，按 ↓ 和 ↑ | 焦点在同一列的卡片间移动 |
| 按 → 和 ← | 焦点移到相邻列的同一位置附近的卡片 |
| 按 Shift + → | 卡片移到右边一列，焦点仍在这张卡片上；Shift + ← 移回来 |
| 焦点在卡片里的按钮上按 Enter | 按钮照常触发，不会被导航吃掉 |
| 运行第 23 章的性能测试（移动一个**不是**待办列第一张的任务） | 仍然通过 |

**用原理解释。**

1. 为什么键盘监听挂在容器上，tabindex 却要写在每张卡片上？
2. 做完以后，如果你移动的正好是待办列的第一张卡片，`TaskCard` 的更新次数是 1，不是 0。为什么？这违反预算吗？

::: deep 示范答案（线 C）
1. 键盘事件从获得焦点的元素向上冒泡，容器上的一个监听能看到所有卡片的按键，不需要给 1000 张卡片各绑一个。tabindex 是元素自己的属性，决定它能不能获得焦点、在不在 Tab 顺序里，只能写在卡片上。第 1 层把这两件事分开交出：一个绑定对象给容器，一个属性 getter 给每张卡片。
2. roving tabindex 让“停靠点”是第一张卡片。它被移走以后，停靠点退回到新的第一张，那张卡片的 `tabindex` 从 -1 变成 0，它是 `TaskCard` 的一个属性，属性变了，卡片就更新一次。这是真实的、必要的更新：不更新，键盘用户就找不到 Tab 的入口。预算说的是“不相关的卡片不更新”，这一次更新是相关的。所以性能测试里要选一张不是停靠点的卡片。
:::

### 42.5 选做线

做选做线之前，三条必做线都应该通过验收。每条选做线我们都在参考项目上走通了关键步骤，下面写明做到了什么程度。

**线 D：表单层（第 39 章）。**

- **问题。**`TaskForm` 没有异步的标题查重，也不能加子任务。
- **任务。**把表单的值、校验和提交抽成 `useTaskForm`：`values` 里有 `title`、`due` 和字段数组 `subtasks`（每项带稳定的 `key`，不用下标）；同步校验用 computed；标题查重是异步校验：防抖 300 毫秒，输入变化时用 `onCleanup` 取消上一次请求，只认最新的一次；提交时如果检查还没发出，立刻发出并等结果；服务端返回的字段错误（`ApiError.field`）映射回对应字段。假后端加 `GET /api/check-title?title=`，重复的标题 `POST` 返回 409 和 `field: 'title'`，接受并保存 `subtasks` 数组。
- **验收。**输入已有的标题，失焦后显示“已经有同名的任务”，提交被拦住；先输入 `a`（慢响应说“重名”），再输入新标题（快响应说“可用”），最终不显示错误；加三个子任务，删掉中间一个，其余输入框的内容跟着各自的项走；绕过客户端检查直接提交重名标题，标题下显示服务端的 409 错误。
- **用原理解释。**为什么提交过早时要“立刻发出检查并等结果”，而不是什么都不做？（提示：用户点了按钮却没有任何反应。）
- **做到的程度。**我们实现了全部并用浏览器脚本验证了四条验收。

**线 E：服务端渲染（第 36、37 章）。**

- **问题。**只读的分享页 `/share` 首屏是空的。
- **任务。**浏览器和服务器共用一个“造应用”的函数 `createBoardApp(history, ssr)`，每次调用造新的 app、pinia、router。因此 `router/index.ts` 导出工厂函数，不再导出单例；线 A 里模块级的 `globalNotice` 改成 Pinia store。写 `entry-server.ts`：创建应用、`router.push(url)`、取数据、`renderToString`，返回 HTML 和 `pinia.state.value`；浏览器入口读 `window.__STATE__` 恢复 pinia 状态，用 `createSSRApp`，`router.isReady()` 之后再挂载。请求层在服务端要用完整的接口地址（`setApiOrigin`）。写一个 `ShareView`：只读列表，不含按钮。
- **验收。**`curl http://localhost:端口/share` 的 HTML 里有任务标题；浏览器控制台没有 `Hydration` 警告；故意在页面里写 `{{ new Date().toLocaleTimeString() }}`，控制台出现警告（我们看到：服务端 `生成于 00:36:02`，浏览器期望 `生成于 12:36:02 AM`），改成挂载后再填就消失。
- **用原理解释。**为什么这个时间会水合不匹配？为什么 `router` 不能是模块级的单例？
- **做到的程度。**在开发模式的 SSR 服务器（Vite 的 `middlewareMode`）上走通，并复现和修好了水合警告；`vite build --ssr src/entry-server.ts` 构建成功。我们没有运行生产环境的 SSR 服务器，也没有用 Nuxt 重做一遍。如果你想让整个应用用 SSR，第 37 章的 Nuxt 是更省事的路线。

**线 F：组件库（第 41 章）。**

- **问题。**第 1、2 层的 `useCardNavigation` 和 `CardNav` 和看板业务无关，别的项目也能用。
- **任务。**用 npm 工作区：根 `package.json` 加 `"workspaces": ["packages/*"]`，`packages/ui` 里放这两个文件，`vite.config.ts` 用库模式构建 ESM 并把 `vue` 外部化，`vue-tsc` 生成声明文件，`package.json` 的 `exports` 指向 `dist/index.js` 和 `dist/index.d.ts`，`vue` 写在 `peerDependencies`。看板的 `dependencies` 里加 `"@kanban/ui": "*"`，从包里导入。
- **验收。**`npm run build -w @kanban/ui` 成功；`npx publint packages/ui` 输出 `All good!`；看板的 `type-check`、测试、构建都通过；故意给 `CardNav` 传错类型的 `columns`，`type-check` 报错（说明类型真的被读到了）；在产物里搜索 `currentInstance` 没有结果（Vue 没有被打进包）。
- **用原理解释。**为什么 `vue` 要外部化，并且写进 `peerDependencies`？
- **做到的程度。**上面五条都实测通过。没做：`attw` 检查、`.vue.d.ts` 的修复脚本、样式分发、真正发布。

::: deep 示范答案（线 D、E、F）
- **线 D。**用户点按钮是在表达“我要提交”。如果因为检查还在防抖或进行中就直接返回，用户看不到任何反应，会以为按钮坏了。立刻发出检查并等结果，结果出来后再决定是提交还是显示错误。服务端的 409 是最后一道保证：客户端的检查只是为了更早告诉用户。
- **线 E，水合。**服务端和浏览器各自执行 `new Date().toLocaleTimeString()`：时间不同，语言环境和 12/24 小时制也可能不同，两边算出的字符串不一样。水合时 Vue 把服务端的 HTML 当成正确的，逐个对比 vnode 和 DOM，发现文字不同就警告（第 36 章）。只在浏览器知道的值（时间、`window`、`localStorage`）要挂载后再填。
- **线 E，单例。**服务端是一个长期运行的进程，所有请求共用同一份模块。模块级的 router、pinia 或 `ref` 会被所有用户的请求共享：一个用户的数据、一个请求的登录状态会泄漏到另一个请求。每个请求必须自己造 app、router、pinia。
- **线 F。**如果库把自己的 Vue 打进包，应用里就有两份 Vue：两份响应式系统。库里创建的 `ref` 和应用的渲染互不认识：库里的数据变了，页面不更新，而且没有任何报错。`inject`、`provide` 和生命周期钩子在两份 Vue 之间仍然能用，真正的危害是响应式断开（第 41 章 41.1 节）。外部化让库的代码 `import 'vue'` 时用应用的那一份；`peerDependencies` 把这个要求告诉包管理器和使用者（第 41 章）。
:::

### 42.6 总验收清单和设计决策记录

| 线 | 命令或操作 | 应该看到 |
|---|---|---|
| 起点 | `npm run type-check`、`npx vitest run`、`npm run build` | 都通过；入口 JS（gzip）仍不超过 60 kB |
| A | 42.2 的验收表 | 五行全部符合；`/api/_report` 里没有重复的记录 |
| B | 1000 个任务、构建版本、CPU 4 倍限速 | 返回看板无长任务；DOM 节点少于 1500；性能测试通过；记录了修前修后的数字 |
| C | 42.4 的验收表 | 只有一个 `tabindex="0"`；方向键和 Shift + 左右键可用；第 23 章的无障碍清单仍然通过 |
| D（选做） | 42.5 线 D 的验收 | 重名被拦住；慢响应不覆盖新结果；删除中间的子任务内容不错位 |
| E（选做） | `curl /share`；浏览器控制台 | HTML 里有任务标题；没有 `Hydration` 警告 |
| F（选做） | 42.5 线 F 的验收 | `publint` 通过；看板用包构建、测试通过 |
| 解释 | 每条已做的线 | 写下了“用原理解释”的回答，并且和示范答案对照过 |

在第 23 章的设计决策记录后面，续写至少三条。示范（针对本章参考实现）：

> **决策 5：列只显示前 50 张，而不是虚拟列表。**
> 依据：1000 个任务时首屏 DOM 节点从 5446 降到 885，第一张卡片出现从约 516 毫秒降到约 280 毫秒（CPU 4 倍限速）。
> 备选：虚拟列表；`content-visibility: auto`（我们试过：首屏稍快，返回看板仍有长任务）。
> 理由：数字已达标，“显示更多”不影响键盘导航。代价：用户看不到被折叠的卡片，键盘导航只覆盖已显示的卡片。
>
> **决策 6：请求只重试 GET，其他方法不重试。**
> 理由：POST 重试可能创建重复任务。意料之外的失败（断网、5xx）才上报，400 和 404 是服务器的明确回答，当作状态显示。
> 代价：添加任务失败后需要用户手动再点一次。
>
> **决策 7：键盘规则放在第 1 层的组合式函数里。**
> 理由：规则写一遍，别的列表（例如搜索结果）可以复用同一个函数；看板的模板里只剩接绑定。
> 代价：多两个文件，三层各有一份公开接口要维护。

### 42.7 结束语：往哪走

你做完了一个从空文件夹到有类型、有测试、有错误处理、有性能预算的前端应用，也能解释每个决定背后的原理。接下来的路有三条：

- **读源码。**从 `packages/reactivity` 开始：第 24 章你已经走过 `ref` 和依赖收集，源码里的名字都能对上。再读 `runtime-core` 的 `renderer.ts`（第 28 到 32 章）和 `scheduler.ts`（第 25 章）。每次读之前写下你预测它怎么做，读完核对。
- **读官方资源。**Vue 官方文档的“深入组件”和“规模化”两部分；Vue Router 和 Pinia 的文档；Vue 的 RFC 仓库，里面写着每个特性为什么这样设计。
- **做自己的项目。**换一个领域，重做这次的流程：先写需求和验收标准，再拆里程碑，最后写设计决策记录。

::: pitfalls
1. 升级时同时改好几条线。原因：出问题时分不清是哪一条引起的。每条线单独验收、单独提交。
2. 不量就优化。原因：我们猜过每张卡片一个 `RouterLink` 很贵，换成普通 `<a>` 实测只快了约一成（首屏从约 516 毫秒到 450 至 470 毫秒），真正的大头是 DOM 节点的数量。凭直觉改的地方可能不是瓶颈。
3. 用开发模式的数字做性能结论。原因：开发模式带有大量检查，数字和线上不同。用 `build` 加 `preview`。
4. 用来重试的请求不是幂等的。原因：重试 POST 会创建重复数据。
5. 只写“结果”不写“原理”。原因：同一个修改，没有原理就无法判断它在别的项目里还成不成立。
:::

::: selfcheck
<Sc :a="1">

看板里点击一张卡片的标题，目标页面 `TaskDetailView` 是懒加载的，但它的文件下载失败了（断网）。用户留在看板，没有出现错误提示。你已经在 `App.vue` 里用 `ErrorBoundary` 包住了 `RouterView`。应该在哪里接住这个错误？

<Opt>在 `ErrorBoundary` 的 `onErrorCaptured` 里，它能接住所有后代的错误</Opt>
<Opt>用 `router.onError`，导航失败发生在目标组件创建之前</Opt>
<Opt>用 `app.config.errorHandler`，它接住所有 Vue 里的错误</Opt>

<template #explain>

解析：`onErrorCaptured` 和 `errorHandler` 接住的是组件实例上的错误（渲染、生命周期、侦听器、事件处理函数）。懒加载失败时，目标组件还没有创建，错误在导航流程里产生，由 `router.onError` 接住。我们在项目里实测过：屏蔽详情页文件后，点击标题，页面停在看板，`router.onError` 回调被调用。第一项和第三项把“Vue 里的所有错误”理解成了“应用里的所有错误”。

</template>
</Sc>

<Sc :a="0">

线 B 把每张卡片的 `TaskCard` 更新次数降到了 0。线 C 加上 roving tabindex 以后，在 1000 个任务的测试里把待办列的**第一张**卡片移到“进行中”，`TaskCard` 的更新次数是 1。最可能的原因是什么？

<Opt>待办列新的第一张卡片的 `tabindex` 从 -1 变成 0，它的属性变了</Opt>
<Opt>列的选择器又每次返回新数组了</Opt>
<Opt>被移动的卡片在进行中列里更新了一次</Opt>

<template #explain>

解析：停靠点是“第一张卡片”。它被移走，新的第一张卡片成为停靠点，`tabindex` 属性变了，所以更新一次，这是必要的更新。如果选择器又返回新数组，更新的是 `BoardColumn`（列），而且已完成列也会更新，更新次数会大得多。被移动的卡片换了列，是在新的列里新建的组件，不算更新。把测试里移动的任务换成一张不是停靠点的卡片，就回到 0。

</template>
</Sc>

<Sc :a="2">

一个只读页面同时在服务端和浏览器渲染。模板里有这一行。浏览器控制台会怎样？

```vue
<p>生成于 {{ new Date().toLocaleTimeString() }}</p>
```

<Opt>没有警告，因为服务端和浏览器渲染出的是同一个组件</Opt>
<Opt>没有警告，因为 Vue 在水合时会自动重新渲染文字</Opt>
<Opt>水合警告：服务端和浏览器算出的时间字符串不同</Opt>

<template #explain>

解析：服务端执行时得到一个字符串，浏览器水合时再执行一次，时间不同，语言环境或 12/24 小时制也可能不同。水合时 Vue 把服务端 HTML 当成正确的，对比发现文字不一致，在开发模式下警告 `Hydration text content mismatch`。我们实测看到：服务端 `00:36:02`，浏览器期望 `12:36:02 AM`。修复：只在浏览器才知道的值，在 `onMounted` 里再填。第一项和第二项都误以为水合会自己纠正，它只会警告并留下不一致。

</template>
</Sc>

:::

::: summary
- 本章回到第 23 章的看板 Pro 做架构升级：必做三条线（错误处理、性能诊断、组件分层与键盘），选做三条线（表单层、服务端渲染、组件库）。
- 每条线有问题、任务、可观察的验收标准，和需要写下来的“用原理解释”。验收看命令的输出、指标的数字和可观察的行为。
- 请求层把失败规范成同一种错误，只重试安全的 GET；组件错误由边界接住，导航错误由 `router.onError` 接住，其余由兜底的处理函数上报。
- 性能先量再改：构建版本、CPU 限速、长任务和 DOM 节点数。内容没变就返回上一次的数组，可以让没有变化的列不更新。
- 键盘规则放在第 1 层的组合式函数里：只有一个停靠点，监听放在容器上，规则写一遍。
- 服务端渲染要求每个请求自己造 app、router、pinia，浏览器才知道的值挂载后再填。
- 设计决策记录续写下去：依据是数字，理由具体到你的项目，写明代价。
:::
