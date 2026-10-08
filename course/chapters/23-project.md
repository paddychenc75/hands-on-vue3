---
title: 项目：任务看板 Pro
id: project
stage: 3
chapter: 23
desc: 把页面版看板搬进 Vite 项目：类型、假后端、Pinia、Router、测试和性能预算
---

<script setup>
import ProDataFlow from '../figures/23-project/ProDataFlow.vue'
</script>

# 项目：任务看板 Pro

::: goals
<Goal checks="sc:0,ex:kanbanStore">写出带加载、失败状态的 store，并实现“先改界面，失败再回滚”的移动。</Goal>
<Goal checks="sc:1,sc:4">说明请求竞态和“加载中误报未保存”是怎样发生的，并用取消上一次请求、只在加载完成后比较来修复。</Goal>
<Goal checks="sc:2,sc:3,ex:kanbanRoute">写出带数字参数、不存在提示和 404 的路由，并说明两个离开守卫各在什么时候运行。</Goal>
<Goal checks="sc:5,ex:projStoreTest">为真实的 Pinia store 写测试，并用故意改坏的实现确认测试能抓到错误。</Goal>
<Goal checks="ex:projA11y">按“无障碍的最低要求”改写一个只能用鼠标操作的列表。</Goal>
<Goal checks="sc:6">说明性能预算，并判断预算被打破时先查什么。</Goal>

:::

::: rt
阅读主线约 20 分钟，深入内容约 2 分钟（可选）。另外留时间做练习和自测。项目在你的电脑上完成，第一次独立做大约需要 16 到 24 小时。
:::

::: terms
假后端
: 只在开发和测试里运行的接口替身。数据放在内存里，接口的形状和真实后端一致。

里程碑
: 项目中有明确完成标准的一个阶段。

验收清单
: 逐条操作并核对结果的清单。每条写明怎样操作，以及应该看到什么。

设计决策记录
: 写下一个决策、备选方案和选择理由的短文。
:::

::: why
前面的每一章，一次只用一个知识点。练习替你做了架构决定。

真实项目不会。同一个功能要同时决定数据放在哪里、请求失败怎么办、路由怎样设计、类型怎样写、怎样测试、慢了怎样查。这些决定互相影响。

原因：只有自己做过一遍，才知道哪些决定会互相牵连。本章把第 14 到 22 章的内容装进一个真实的 Vite 项目，页面只检验最关键的四个片段，其余按验收清单自查。
:::

### 23.1 起点：把页面版搬进真实的项目

[第 13 章](/chapters/13-project-board)的看板是一个页面版：任务在 `useTasks` 里，保存在 localStorage，用 props 和事件拆成卡片。本章把它搬进你电脑上的 Vite 项目，并升级成五个不同：

| | 页面版（第 13 章） | Pro 版（本章） |
|---|---|---|
| 工程 | 页面里的练习 | Vite 项目，`vue-tsc` 检查类型，Vitest 测试 |
| 数据 | `useTasks` 里的数组 | Pinia store，按 `byId` 和 `ids` 存放 |
| 来源 | localStorage | 一个接口（假后端），有加载、失败、重试 |
| 页面 | 一页 | 看板、详情页、404，详情页可编辑 |
| 交付 | 看效果 | 需求、验收清单、性能预算、设计决策记录 |

数据结构沿用第 13 章：任务有 `id`、`title`、`status`（`todo`、`doing`、`done` 三选一）和可选的 `due`（`YYYY-MM-DD`）。页面版里的 `done` 布尔值在这里变成三列。

<Figure caption="组件只读 store 的状态，通过 action 改变它。action 调用 api 层，api 层把所有失败规范成 ApiError。失败存成 store 的状态，界面据此显示。">
<ProDataFlow />
</Figure>

### 23.2 十二条需求

每条需求都写成可以操作和观察的标准。

| 编号 | 需求 | 可验收的标准 |
|---|---|---|
| R1 | 添加任务 | 输入标题后提交，任务出现在“待办”列。标题为空或只有空格时不添加，输入框下方显示错误；还没有输入或提交时不显示错误。提交期间按钮禁用；服务端拒绝时显示它的错误 |
| R2 | 三列看板 | 三列：待办、进行中、已完成。每个任务有“移到下一列”和“删除”按钮，已完成列没有“移到”。每列按截止日期从早到晚排列，没有日期的排最后 |
| R3 | 截止日期和统计 | 添加时和详情页里可以填截止日期。页面顶部显示“还剩 N 项”（待办和进行中的总数），移动、删除、添加后立即变化 |
| R4 | 数据来自接口 | 任务从接口读取。加载中显示“加载中”；失败显示原因和“重试”，点重试后恢复；一列没有任务时显示“没有任务”。刷新后任务仍在 |
| R5 | 乐观更新 | 点“移到下一列”后卡片立刻出现在新的一列。请求失败时卡片回到原来的列，并显示“已恢复”的提示 |
| R6 | 状态放在 Pinia | 任务以 `byId` 和 `ids` 存放，每一列由 computed 选择器得到。组件里没有任务数组的副本 |
| R7 | 路由 | `/` 是看板。`/task/:id` 是详情页，可以编辑标题和截止日期，有“上一个”“下一个”链接。不存在的 id 显示“任务不存在”，其他地址显示 404 页。详情页有未保存的修改时，离开前询问。快速切换任务时，页面显示最后打开的那个 |
| R8 | 类型 | `Task` 和 `Status` 有类型。store、接口层、组件的 props 和 emits 都有类型。`npm run type-check` 没有错误 |
| R9 | 测试 | store 的 load、add、move（含回滚）、remove、列顺序各有单元测试。TaskCard 有组件测试。故意改坏实现时，对应的测试变红 |
| R10 | 性能 | 1000 个任务下，移动一个任务，其他卡片更新 0 次。详情页按路由懒加载。入口 JS（gzip）不超过 60 kB |
| R11 | 无障碍 | 只用键盘能完成添加、移动、删除。图标按钮有名称。“还剩 N 项”和错误提示会被读屏软件读出 |
| R12 | 交付 | `npm run build` 通过。`npm run preview` 里直接打开并刷新 `/task/1` 不是 404 |

### 23.3 需求、知识点和里程碑

表里的章号都是已经学过的章。卡住时回到那一章。第 30、31、40 章排在本章之后，学到时再回来对照。

| 需求 | 用到的知识 | 在哪里学 | 里程碑 |
|---|---|---|---|
| R1 | 校验的时机、`aria-invalid`、提交中状态 | 第 12 章、第 18 章 | M3 |
| R2 | computed 派生数据，props 向下、事件向上 | 第 4、6 章，第 13 章 | M3 |
| R3 | 派生数据不另存一份 | 第 4 章 | M3、M4 |
| R4 | 加载、错误、重试，服务端状态 | 第 18 章，第 19 章 | M1、M2 |
| R5 | 乐观更新与回滚 | 第 18 章 | M2 |
| R6 | setup store，`storeToRefs`，按 id 规范化 | 第 16 章，第 19 章 | M2 |
| R7 | 路由表、`props`、守卫、懒加载，请求竞态 | 第 17 章，第 18 章 | M4 |
| R8 | props 和 emits 的类型，`vue-tsc` | 第 14 章 | M1、M5 |
| R9 | 组件测试，测试 store，故意改坏 | 第 20 章 | M5 |
| R10 | 稳定的 props，路由懒加载，性能预算 | 第 21 章，详见第 40 章 | M6 |
| R11 | 原生元素，label，状态区域 | 第 12 章 | M3、M6 |
| R12 | 构建和部署 | 第 15 章 | M6 |

“为什么稳定的 props 能让卡片不更新”详见第 30、31 章。第 22 章（迁移）是选读，本项目不用。

### 23.4 在本地搭建项目和假后端

先确认 Node.js 的版本。`create-vue` 要求 `^22.18.0 || >=24.12.0`。

```bash
npm create vue@latest kanban -- --ts --router --pinia --vitest --eslint --prettier
cd kanban
npm install
```

删掉示例文件（`HelloWorld.vue`、`TheWelcome.vue`、`WelcomeItem.vue`、`components/icons`、`HomeView.vue`、`AboutView.vue`、`stores/counter.ts`、`components/__tests__`、`assets/logo.svg`），按下面的结构放你的文件：

```text
fake-api.ts                    假后端（Vite 插件）
src/
  types.ts                     Task、Status
  api/client.ts                fetch 封装，失败变成 ApiError
  api/tasks.ts                 五个接口函数
  stores/tasks.ts              Pinia store
  stores/__tests__/tasks.spec.ts
  components/TaskCard.vue  TaskForm.vue  components/__tests__/TaskCard.spec.ts
  views/BoardView.vue          路由 /
  views/TaskDetailView.vue     路由 /task/:id（懒加载）
  views/NotFoundView.vue       其他地址（懒加载）
  views/__tests__/BoardView.perf.spec.ts
  router/index.ts
```

脚手架的 `package.json` 里有这些脚本：

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run type-check` | `vue-tsc --build`，检查类型 |
| `npm run test:unit` | Vitest（监听模式，`npx vitest run` 只运行一次） |
| `npm run lint` / `npm run format` | ESLint 和 oxlint / Prettier |
| `npm run build` | 同时运行类型检查和 `vite build` |

脚手架的 `tsconfig` 用项目引用，所以类型检查用 `vue-tsc --build`（也就是 `npm run type-check`），不用 `--noEmit`。本章说“类型检查”，都指这个命令。

**假后端。**浏览器只能请求一个接口。我们不装 json-server，也不装 MSW，而是写一个 Vite 插件，在开发服务器和 `vite preview` 里都挂上 `/api`。下面是完整文件，放在项目根目录：

```ts
// fake-api.ts
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, PreviewServer, ViteDevServer } from 'vite'

type Task = { id: number; title: string; status: 'todo' | 'doing' | 'done'; due?: string }

// 假后端：数据放在内存里，服务重启后回到种子数据。
export function fakeApi(): Plugin {
  const tasks: Task[] = [
    { id: 1, title: '读完第 14 到 22 章', status: 'doing', due: '2026-11-01' },
    { id: 2, title: '搭好 Vite 项目', status: 'todo', due: '2026-10-20' },
    { id: 3, title: '写 store 的测试', status: 'todo' },
    { id: 4, title: '部署到静态托管', status: 'done', due: '2026-10-01' },
  ]
  let nextId = 5
  // 运行中可调：/api/_debug?delay=1500&failRate=0.5&seed=1000
  const debug = { delay: 300, failRate: 0 }

  const send = (res: ServerResponse, status: number, body?: unknown) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(body === undefined ? '' : JSON.stringify(body))
  }
  const readBody = (req: IncomingMessage) =>
    new Promise<Record<string, unknown>>((resolve) => {
      let raw = ''
      req.on('data', (c) => (raw += c))
      req.on('end', () => resolve(raw ? JSON.parse(raw) : {}))
    })

  function seed(n: number) {
    tasks.length = 0
    for (let i = 1; i <= n; i++) {
      const month = String((i % 12) + 1).padStart(2, '0')
      const day = String((i % 27) + 1).padStart(2, '0')
      tasks.push({
        id: i,
        title: `任务 ${i}`,
        status: (['todo', 'doing', 'done'] as const)[i % 3]!,
        due: i % 4 === 0 ? undefined : `2026-${month}-${day}`,
      })
    }
    nextId = n + 1
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://x')
    if (url.pathname === '/_debug') {
      const q = url.searchParams
      if (q.has('delay')) debug.delay = Number(q.get('delay'))
      if (q.has('failRate')) debug.failRate = Number(q.get('failRate'))
      if (q.has('seed')) seed(Number(q.get('seed')))
      return send(res, 200, debug)
    }
    await new Promise((r) => setTimeout(r, debug.delay))
    if (Math.random() < debug.failRate) return send(res, 500, { message: '服务器开小差了' })

    const match = url.pathname.match(/^\/tasks(?:\/(\d+))?$/)
    if (!match) return send(res, 404, { message: '接口不存在' })
    const id = match[1] ? Number(match[1]) : undefined
    const task = id === undefined ? undefined : tasks.find((t) => t.id === id)

    if (req.method === 'GET' && id === undefined) return send(res, 200, tasks)
    if (req.method === 'GET') {
      return task ? send(res, 200, task) : send(res, 404, { message: '任务不存在' })
    }
    if (req.method === 'POST' && id === undefined) {
      const body = await readBody(req)
      const title = String(body.title ?? '').trim()
      if (!title) return send(res, 400, { message: '标题不能为空', field: 'title' })
      const created: Task = {
        id: nextId++,
        title,
        status: 'todo',
        due: body.due ? String(body.due) : undefined,
      }
      tasks.push(created)
      return send(res, 201, created)
    }
    if (req.method === 'PATCH' && task) {
      const body = await readBody(req)
      if ('title' in body && !String(body.title).trim()) {
        return send(res, 400, { message: '标题不能为空', field: 'title' })
      }
      Object.assign(task, body)
      return send(res, 200, task)
    }
    if (req.method === 'DELETE' && task) {
      tasks.splice(tasks.indexOf(task), 1)
      return send(res, 204)
    }
    return send(res, 404, { message: '任务不存在' })
  }

  const install = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/api', (req, res) => void handle(req, res))
  }
  return { name: 'fake-api', configureServer: install, configurePreviewServer: install }
}
```

在 `vite.config.ts` 的 `plugins` 里加上 `fakeApi()`，并在 `tsconfig.node.json` 的 `include` 里加 `"fake-api.*"`。然后启动 `npm run dev`，在另一个终端验证：

```bash
curl http://localhost:5173/api/tasks                      # 4 个任务
curl -X POST -d '{"title":" "}' http://localhost:5173/api/tasks   # 400，标题不能为空
curl "http://localhost:5173/api/_debug?delay=2000&failRate=0.5"    # 调慢、调失败率
```

`/api/_debug` 是你的测试遥控器：`delay` 是延迟毫秒数，`failRate` 是失败概率，`seed=1000` 把数据换成 1000 个任务。验收清单和性能测试都靠它。

::: deep 为什么不用 json-server 或 MSW
json-server 要多开一个进程，还要配代理；MSW 在浏览器里拦截请求，在 Vitest 里又要另一套配置。Vite 插件只有一份文件，开发和预览都能用，故障注入（延迟、失败率）也只要几行。代价是它只在 Vite 的服务里存在：build 出来的静态文件部署到别处，没有 `/api`。所以 R12 的验收停在 `npm run preview`，真正上线需要换成真实后端。
:::

### 23.5 六个里程碑

按顺序做。每完成一个，对照完成标准，再进入下一个。

**M1：类型、接口层和假后端（R4 的接口部分，R8 的类型部分）**

1. `types.ts` 定义类型：

```ts
export type Status = 'todo' | 'doing' | 'done'
export interface Task {
  id: number
  title: string
  status: Status
  due?: string // 'YYYY-MM-DD'
}
// 每个状态的下一列；已完成没有下一列
export const NEXT: Record<Status, Status | null> = { todo: 'doing', doing: 'done', done: null }
```

2. `api/client.ts` 把所有请求失败规范成一种错误。组件和 store 只处理 `ApiError`，不处理 `fetch` 的各种异常：

```ts
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number, // 0 表示没有到达服务器，例如断网
    readonly field?: string,
  ) {
    super(message)
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch('/api' + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e // 取消不是失败，原样抛出
    throw new ApiError('网络不通', 0)
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string; field?: string }
    throw new ApiError(body.message ?? `请求失败（${res.status}）`, res.status, body.field)
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}
```

3. `api/tasks.ts` 写 `listTasks`、`getTask`、`createTask`、`patchTask`、`deleteTask` 五个函数，每个都有明确的返回类型，`listTasks` 和 `getTask` 接受一个可选的 `AbortSignal`。

完成标准：`npm run type-check` 零错误；用 curl 能读写任务。

**M2：store（R4、R5、R6）**

store 用 `byId` 和 `ids` 存放任务，加上加载状态。三个地方要想清楚：

- `load` 用一个递增的 `loadToken` 防竞态：快速点两次“重试”，只接受最后一次的结果。
- `add` 是悲观更新：服务端确认后才进列表。
- `move` 是乐观更新：先改界面，失败再回滚。回滚前要确认任务还停在你设置的状态，否则会覆盖用户后来的操作。

```ts
export const useTaskStore = defineStore('tasks', () => {
  const byId = ref<Record<number, Task>>({})
  const ids = ref<number[]>([])
  const loadState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const loadError = ref('')
  const notice = ref('') // 操作失败的提示，例如移动被回滚
  let loadToken = 0

  async function load() {
    const token = ++loadToken
    loadState.value = 'loading'
    loadError.value = ''
    try {
      const list = await api.listTasks()
      if (token !== loadToken) return // 有更新的 load 在跑，这次的结果作废
      byId.value = Object.fromEntries(list.map((t) => [t.id, t]))
      ids.value = list.map((t) => t.id)
      loadState.value = 'ready'
    } catch (e) {
      if (token !== loadToken) return
      loadError.value = e instanceof Error ? e.message : '加载失败'
      loadState.value = 'error'
    }
  }

  async function move(id: number, to: Status) {
    const task = byId.value[id]
    if (!task) return
    const from = task.status
    task.status = to // 先改界面
    notice.value = ''
    try {
      await api.patchTask(id, { status: to })
    } catch (e) {
      const current = byId.value[id]
      if (current?.status === to) current.status = from // 只有还停在 to 才回滚
      notice.value = `移动“${task.title}”失败，已恢复`
      throw e
    }
  }

  // 选择器：一列的任务 id，按截止日期升序，没有日期的排最后
  function idsOf(status: Status): number[] {
    return ids.value
      .filter((id) => byId.value[id]?.status === status)
      .sort((a, b) => (byId.value[a]?.due ?? '9999').localeCompare(byId.value[b]?.due ?? '9999'))
  }
  const columns = computed(() => ({ todo: idsOf('todo'), doing: idsOf('doing'), done: idsOf('done') }))
  const remaining = computed(() => ids.value.length - columns.value.done.length)

  // add、remove、fetchOne（读一个任务并放进 byId）、save（PATCH 标题和日期）照同样的写法
  return { byId, ids, loadState, loadError, notice, columns, remaining, load, move /* … */ }
})
```

`add` 把新任务放进 `byId` 并把 id 推进 `ids`；`remove` 要同时改两处。`move` 和 `remove` 失败时把错误抛出去，由看板组件决定怎么显示（提示已经写进 `notice`，组件只需要 `.catch(() => {})`）。

完成标准：R4 的数据部分、R5、R6 的标准满足。先在页面上练习这一步最关键的片段：

<Exercise id="kanbanStore" />

**M3：看板界面（R1、R2、R3、R11）**

1. `TaskCard.vue`：`defineProps<{ task: Task }>()`，`defineEmits<{ move: [id: number, to: Status]; remove: [id: number] }>()`。标题是 `RouterLink`，“移到”按钮用 `NEXT` 决定是否显示，删除按钮写 `aria-label="删除 标题"`。
2. `TaskForm.vue`：标题输入框用 `touched` 控制：离开字段或提交之后才显示错误。提交期间 `pending` 为真，按钮禁用。服务端返回的错误（`ApiError.message`）显示在表单里。
3. `BoardView.vue`：用 `storeToRefs(store)` 得到 `columns`、`byId`、`loadState`，挂载时 `loadState === 'idle'` 才 `load()`。根据 `loadState` 显示“加载中”、失败和重试按钮、或三列。传给卡片的是 `byId[id]`，不要在模板里复制它。“还剩 N 项”放在 `role="status"` 的元素里。

完成标准：R1、R2、R3、R4 的界面部分满足。先练习无障碍的最低要求：

<Exercise id="projA11y" />

**M4：路由和详情页（R3 的日期编辑、R7）**

1. 路由表里用 `props: (route) => ({ id: Number(route.params.id) })` 把参数转成数字，路径写成 `/task/:id(\d+)` 让 `/task/abc` 落到 404。详情页和 404 页用 `() => import(...)` 懒加载。
2. 详情页不依赖看板是否加载过：它自己 `fetchOne`。`watch(() => props.id, …, { immediate: true })` 在 id 变化时重新请求，并在回调里用 `onCleanup` 取消上一次的请求：

```ts
watch(
  () => props.id,
  async (id, _old, onCleanup) => {
    const controller = new AbortController()
    onCleanup(() => controller.abort()) // id 又变了，上一次的请求作废
    state.value = 'loading'
    try {
      const t = await store.fetchOne(id, controller.signal)
      title.value = t.title
      due.value = t.due ?? ''
      state.value = 'ready'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      state.value = e instanceof ApiError && e.status === 404 ? 'missing' : 'error'
    }
  },
  { immediate: true },
)
```

3. 未保存的修改：`dirty` 比较草稿和 store 里的任务，**只在 `state === 'ready'` 时才比较**。加载中草稿还是空的，不加这个条件，用户一进页面就会被当成“有修改”。离开守卫要注册两个，因为 `/task/1` 到 `/task/2` 复用同一个组件，只会触发更新守卫：

```ts
const confirmLeave = () => !dirty.value || window.confirm('有未保存的修改，确定离开？')
onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(confirmLeave)
```

4. 详情页顶部放“返回看板”“上一个”“下一个”三个链接。“下一个”让你能手动制造请求竞态。

完成标准：R3、R7 满足；直接打开 `/task/999` 显示“任务不存在”。

<Exercise id="kanbanRoute" />

**M5：测试和类型收口（R8、R9）**

1. 运行 `npm run type-check`，修到零错误。故意给 `Task` 传一个缺 `title` 的对象，应该报错。
2. store 的测试用 `vi.mock('@/api/tasks')` 替换接口层，每个测试一个新 pinia。测试要覆盖：load 成功和失败、慢的旧 `load` 不覆盖新的、move 成功、move 失败回滚、回滚前又被移走时不覆盖、add 成功和被拒绝、remove 同时改 `byId` 和 `ids`、每列的排序。写竞态测试时，用一个手动控制的 Promise：

```ts
function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)))
  return { promise, resolve, reject }
}

it('回滚前任务又被移走：不覆盖后来的移动', async () => {
  const first = deferred<Task>()
  mocked.patchTask.mockReturnValueOnce(first.promise)           // 第一次移动：先挂起
  mocked.patchTask.mockResolvedValueOnce({ ...seed[1]!, status: 'done' })
  const s = useTaskStore()
  await s.load()
  const a = s.move(2, 'doing').catch(() => {})
  await s.move(2, 'done')
  first.reject(new Error('500'))                                 // 现在才让第一次失败
  await a
  expect(s.byId[2]?.status).toBe('done')
})
```

3. TaskCard 的组件测试：用 `RouterLinkStub` 替换 `RouterLink`，检查显示标题、点击发出 `move` 和正确的参数、已完成的卡片没有“移到”按钮、删除按钮有名称。
4. 故意改坏一处实现（去掉排序、去掉 `loadToken` 判断、把 `emit('move', …)` 改成别的名字），确认至少有一个测试变红，再改回来。

完成标准：R8、R9 满足。先在页面上练习“测试要能抓住缺陷”：

<Exercise id="projStoreTest" />

**M6：性能、无障碍复查和交付（R10、R11、R12）**

1. 写一个性能测试：用 `vi.mock` 让 `listTasks` 返回 1000 个任务，挂载 `BoardView`，移动一个，断言卡片更新 0 次。用全局 mixin 在 `updated` 里计数，并按组件名过滤。`__name` 是 `<script setup>` 的组件根据文件名生成的名字：

```ts
let updates = 0
mount(BoardView, {
  global: {
    plugins: [pinia],
    stubs: { RouterLink: RouterLinkStub },
    mixins: [{ updated() { if ((this.$options as { __name?: string }).__name === 'TaskCard') updates++ } }],
  },
})
await flushPromises()
updates = 0
await useTaskStore().move(500, 'doing')
await flushPromises()
expect(updates).toBe(0)
```

我们用 1000 个任务验证过：移动一个任务，卡片更新 0 次；把模板里的 `:task="byId[id]!"` 改成 `:task="{ ...byId[id]! }"`，更新次数变成 999。数字更大时，先查传给卡片的 props 是否稳定（第 21 章）。更系统的诊断详见第 40 章，收尾项目（第 42 章）会让你在这个项目上做一次。

2. 运行 `npm run build`，看每个文件的大小。详情页和 404 页应该是单独的文件。我们的参考实现入口 JS 约 102 kB，gzip 后约 40 kB，所以 60 kB 的预算留了余量；超过时先查是哪个依赖变大了。
3. 拔掉鼠标，只用 Tab、空格和 Enter 完成添加、移动、删除，并确认能看见焦点。
4. 运行 `npm run build` 后 `npm run preview`，在地址栏直接打开 `/task/1` 并刷新。`vite preview` 对找不到的路径返回 `index.html`，所以不是 404。要部署到别的静态托管，同样要配置“找不到文件时返回 `index.html`”（第 15 章），而且要有真实的 `/api`。

完成标准：R10、R11、R12 满足。

### 23.6 验收清单

按下表逐条操作。**看到“应该看到”的结果，才算这一条通过。**每一行的“需求”列指向它验收的需求，十二条需求每条至少出现一次。

| 需求 | 怎样操作 | 应该看到 |
|---|---|---|
| R4 | 先访问 `/api/_debug?delay=2000`，再刷新看板 | 先显示“加载中”，两秒后出现三列；刷新后任务仍在 |
| R4 | 访问 `/api/_debug?failRate=1`，刷新；再访问 `?failRate=0`，点“重试” | 显示失败原因和“重试”；点后恢复。控制台没有未捕获的错误 |
| R4 | 删光所有任务 | 每一列显示“没有任务”，不是一片空白 |
| R1 | 直接点“添加”；再输入标题添加 | 前者标题下出现错误；后者任务出现在待办，输入框清空；还没操作时没有错误 |
| R2、R3 | 添加几个带不同日期的任务，移动、删除一些 | 每列按日期升序，无日期的在最后；“还剩 N 项”立刻变化 |
| R5 | 设 `delay=1500`，点“移到下一列” | 卡片立刻出现在新的一列 |
| R5 | 设 `failRate=1`，再点“移到下一列” | 卡片先移过去，随后回到原列，出现“已恢复”的提示 |
| R6 | 在组件里搜索任务数组的副本 | 没有 `ref([])` 一类的副本；Vue 开发者工具的 Pinia 面板里能看到 `byId` 和 `ids` |
| R7 | 打开 `/task/999` 和 `/不存在` | 前者显示“任务不存在”，后者显示 404 页 |
| R7 | 在详情页改标题但不保存，点“返回看板”或“下一个” | 出现“有未保存的修改”询问；点取消，留在原页 |
| R7 | 设 `delay=3000`，打开 `/task/1`，马上点两次“下一个” | 最后页面显示任务 3，不会因为任务 1 的响应晚到而变回任务 1 |
| R8 | 运行 `npm run type-check` | 没有错误 |
| R9 | 运行 `npx vitest run`；再故意改坏排序、`loadToken` 判断或事件名 | 全部通过；改坏后至少一个测试变红，改回后全绿 |
| R10 | 运行性能测试 | 移动一个任务，其他卡片更新 0 次 |
| R10 | 运行 `npm run build` | 详情页是单独的文件；入口 JS（gzip）不超过 60 kB |
| R11 | 拔掉鼠标，只用 Tab、空格、Enter | 添加、移动、删除都能完成，并且能看见焦点在哪里 |
| R11 | 打开浏览器的无障碍检查（例如 Lighthouse 的无障碍项） | 没有“按钮没有名称”“表单没有标签”这类问题 |
| R12 | `npm run build` 后 `npm run preview`，直接打开 `/task/1` 并刷新 | 页面正常显示，不是 404 |

### 23.7 设计决策记录

项目完成后，写 3 到 5 条设计决策。每条包括：**决策、备选方案、选择的理由、代价。**理由要具体到你的项目，不要写“因为这样更好”。

| 要回答的问题 | 参考的章 |
|---|---|
| 任务状态放在哪里？加载中、失败这些状态放在哪里？ | 第 16 章，第 19 章 |
| 哪些请求用乐观更新，哪些不用？ | 第 18 章 |
| 路由怎样设计？详情页的数据从哪里来？ | 第 17 章 |
| 测试测什么，不测什么？ | 第 20 章 |
| 类型怎样帮你避免了一个具体的错误？ | 第 14 章 |

示范（针对本章参考实现，你的项目会不同）：

> **决策 1：移动用乐观更新，添加用悲观更新。**
> 备选：两者都等服务端确认；两者都先改界面。
> 理由：移动的结果可以预知，失败概率低，等待 300 毫秒会让拖动感觉卡；添加要拿服务端生成的 id，没有 id 就无法渲染稳定的 key。
> 代价：移动要多写回滚，还要处理“回滚前又被移走”。每个这样的分支都要有测试。
>
> **决策 2：详情页自己请求，不依赖看板的数据。**
> 备选：只从 store 里读；进详情页前先确保 store 已加载。
> 理由：详情页要能被直接打开和刷新，此时 store 是空的。自己请求还让“任务不存在”由服务端的 404 决定。
> 代价：从看板进入详情页会多一次请求；要处理 id 变化时的竞态，用取消上一次请求解决。
>
> **决策 3：不用虚拟列表，只保证 props 稳定。**
> 依据：1000 个任务下，移动一个任务时其他卡片更新 0 次（性能测试断言）。
> 备选：虚拟列表。
> 理由：数字已经达到预算。虚拟列表会让键盘导航和无障碍更复杂。如果任务数超过一万，再回来用它。
> 代价：任务数增长时要重新测量；首屏要渲染全部卡片，这一点在收尾项目（第 42 章）里会被量化。
>
> **决策 4：测试行为，不测内部实现。**
> 理由：store 测试检查“列的顺序”“回滚后的状态”，组件测试检查“显示标题”和“发出 move 和参数”。改内部写法时测试不用改。每个测试都用“故意改坏”确认过它能变红。
> 不测：样式，以及 Pinia 和 Vue Router 自己的行为。

### 23.8 可选的延伸方向

做完验收清单之后，选一两项做，并把取舍写进你的设计决策记录。

| 延伸 | 做什么 | 在哪里学 |
|---|---|---|
| 虚拟列表 | 任务超过一万条时，只渲染可见的卡片，并保证键盘导航仍然可用 | 第 21 章 |
| 自定义指令 | 写一个 `v-focus`：添加任务后让新卡片获得焦点 | 第 10 章 |
| 自定义渲染器 | 把统计数字画到 Canvas 上 | 详见第 32 章 |
| KeepAlive 和 Transition | 给看板加 `KeepAlive`，给卡片移动加 `Transition`，并按它们的实现解释看到的行为 | 详见第 33 章 |
| 迁移 | 给旧的选项式 API 小组件写一份迁移说明 | 第 22 章 |

下面这些放在**第 42 章的收尾项目**里做。学完原理和架构阶段后，回到这个项目上做升级：

| 延伸 | 在哪里学 |
|---|---|
| 错误边界、统一的请求错误处理、上报 | 详见第 38 章 |
| 1000 条任务的性能诊断和预算 | 详见第 40 章 |
| 把卡片和列表按“组合式函数、无渲染组件、带样式组件”分层，键盘操作 | 详见第 34、35 章 |
| 用表单层改写新建任务的表单（异步校验、子任务） | 详见第 39 章 |
| 让只读页面服务端渲染 | 详见第 36、37 章 |
| 把分层后的组件抽成可安装的包 | 详见第 41 章 |

::: pitfalls
1. 路由参数是字符串。比较 id 之前先转成数字。原因：`'3' === 3` 为假，找不到任务。
2. 不要把任务数组复制到组件里。原因：两份数据会不一致。从 store 的 computed 读取。
3. 回滚时无条件写回旧状态。原因：回滚之前用户可能又移动过这个任务，你会覆盖他的操作。
4. 响应到达时不检查它是不是最新的。原因：慢的旧响应晚到，会盖住新页面。取消上一次请求，或者比较请求编号。
5. 自动重试非幂等的请求，例如添加任务。原因：请求可能已经到达服务器，重试会创建两个任务。只重试 GET。
6. 测试写完后，不故意改坏实现看测试会不会变红。原因：没有断言或断言太弱的测试永远通过。
7. 在模板里复制对象再传给子组件，例如 `:task="{ ...t }"`。原因：每次渲染都是新对象，所有卡片都会更新（第 21 章）。
8. 在 CI 里用毫秒做性能断言。原因：测试环境的耗时不稳定。断言更新次数。
:::

::: selfcheck
<Sc :a="1">

任务 2 在“待办”。用户把它移到“进行中”（请求 A，一秒后失败），0.3 秒后又把它移到“已完成”（请求 B，成功）。`move` 是下面这样写的。所有请求结束后，界面上的任务 2 在哪一列？

```js
async function move(id, to) {
  const task = byId.value[id]
  const from = task.status
  task.status = to
  try { await api.patchTask(id, { status: to }) }
  catch { task.status = from }
}
```

<Opt>已完成，因为最后一次操作是移到已完成</Opt>
<Opt>待办，A 失败时把任务写回了 A 之前的状态</Opt>
<Opt>进行中，因为 A 先发出</Opt>

<template #explain>

解析：A 在发出时记下了 `from = 'todo'`。它失败时不看任务现在在哪里，直接写回 `'todo'`，把用户后来的移动覆盖了。此时服务器上任务在“已完成”，界面却在“待办”，两边不一致。修复：回滚前先检查 `task.status === to`，只有任务还停在 A 设置的状态才回滚。第一项忽略了 A 的失败回调会晚到，第三项把请求发出的先后当成了结果的先后。

</template>
</Sc>

<Sc :a="0">

详情页这样读取任务。任务 1 的请求要 2 秒，任务 2 的请求要 0.2 秒。用户打开 `/task/1`，0.5 秒后点“下一个”进入 `/task/2`。再过 3 秒，页面显示哪个任务的标题？

```js
watch(() => props.id, async (id) => {
  const t = await api.getTask(id)
  title.value = t.title
}, { immediate: true })
```

<Opt>任务 1 的标题，它的响应后到，覆盖了任务 2 的</Opt>
<Opt>任务 2 的标题，Vue 会自动丢弃过期的 watch 回调</Opt>
<Opt>先显示任务 2，再报错</Opt>

<template #explain>

解析：`/task/1` 到 `/task/2` 复用同一个组件，`watch` 回调运行了两次。任务 2 的响应先到，写入标题；任务 1 的响应后到，把标题改回了任务 1，而地址栏已经是 `/task/2`。Vue 不会取消已经开始的异步函数。修复：用 `onCleanup` 取消上一次请求（`AbortController`），被取消的请求抛出 `AbortError`，在 catch 里忽略它。

</template>
</Sc>

<Sc :a="0">

你从看板页点击任务 3 进入详情页，store 里已经有任务 3。页面却显示“任务不存在”。下面的代码错在哪里？

```js
const route = useRoute()
const store = useTaskStore()
const task = computed(() => store.ids.find(id => id === route.params.id))
```

<Opt>route.params.id 是字符串，ids 里是数字</Opt>
<Opt>从看板进入时 Pinia 的数据被清空</Opt>
<Opt>computed 不跟踪 route 的变化</Opt>

<template #explain>

解析：路由参数总是字符串。`'3' === 3` 为假，所以 find 找不到。修复：写 `Number(route.params.id)`，或者在路由表的 `props` 函数里转换。store 在组件之间共享，从看板进入不会清空。route 是响应式的，computed 能跟踪 `route.params.id`。

</template>
</Sc>

<Sc :a="2">

`TaskDetailView` 里写了 `onBeforeRouteLeave`，有未保存的修改时询问用户。用户在详情页 `/task/1` 点击链接去 `/task/2`。询问框出现吗？

```js
onBeforeRouteLeave(() => {
  if (dirty.value && !window.confirm('有未保存的修改，确定离开？')) return false
})
```

<Opt>出现，因为用户离开了 `/task/1`</Opt>
<Opt>不出现，因为守卫只在离开整个应用时运行</Opt>
<Opt>不出现，同一个组件被复用，要用 `onBeforeRouteUpdate`</Opt>

<template #explain>

解析：两个地址匹配同一条路由记录，Vue Router 复用同一个组件实例，只更新参数。这时触发的是 `onBeforeRouteUpdate`，不是 `onBeforeRouteLeave`（我们用 Vue Router 实测过：`/task/1` 到 `/task/2` 时 update 守卫运行一次，leave 守卫为 0 次；离开到 `/` 时 leave 守卫才运行）。所以详情页要同时注册两个守卫。第一项以为换了 id 就是离开了这个组件。

</template>
</Sc>

<Sc :a="1">

看板已经加载，store 里有任务 1。用户打开 `/task/1`，详情页的请求还没返回，草稿 `title` 还是空字符串。这时用户点“下一个”。下面的 `dirty` 会怎样？

```js
const title = ref('')   // 草稿，请求返回后才赋值
const task = computed(() => store.byId[props.id])
const dirty = computed(() => !!task.value && title.value !== task.value.title)
onBeforeRouteUpdate(() => !dirty.value || window.confirm('有未保存的修改，确定离开？'))
```

<Opt>不询问，因为用户还没有输入</Opt>
<Opt>询问：草稿是空字符串，和 store 里任务 1 的标题不同</Opt>
<Opt>抛出错误，因为 task 还没有加载</Opt>

<template #explain>

解析：store 里已经有任务 1（来自看板），草稿却还是空的，两者不相等，`dirty` 为真，用户什么都没改就被询问。修复：只在详情页加载完成（`state === 'ready'`、草稿已经赋值）时才比较。第一项把“用户有没有输入”当成了 `dirty` 的定义，代码里的定义是“草稿不等于 store”。第三项不对：`!!task.value` 为真，`task` 并没有缺失。

</template>
</Sc>

<Sc :a="1">

你为 TaskCard 写了组件测试。故意把组件里 `emit('move', …)` 改成 `emit('moved', …)`，运行测试，它仍然通过。最可能的原因是什么？

```js
test('点击按钮发出 move', async () => {
  const wrapper = mount(TaskCard, { props: { task } })
  await wrapper.find('button').trigger('click')
  expect(wrapper.emitted()).toBeDefined()
})
```

<Opt>emit 的事件名不影响组件测试</Opt>
<Opt>断言太弱：`emitted()` 总是返回一个对象，和事件名无关</Opt>
<Opt>trigger 没有 await，测试在事件发出之前就结束了</Opt>

<template #explain>

解析：`wrapper.emitted()` 不带参数时返回所有已发出事件组成的对象，没有任何事件时是空对象，也是“已定义”的。所以这条断言永远通过。要写成 `expect(wrapper.emitted('move')?.[0]).toEqual([task.id, 'doing'])`，事件名或参数一错就失败。第三项不对：代码里写了 `await`。故意改坏再看测试变红，正是验收清单里“测试能抓住缺陷”那一条的做法。

</template>
</Sc>

<Sc :a="0">

性能预算是“移动一个任务时，其他卡片更新 0 次”。你的看板有 1000 张卡片，移动一个任务后，所有卡片都更新了。最先应该检查什么？

```vue
<TaskCard v-for="id in list" :key="id" :task="{ ...byId[id] }" />
```

<Opt>`:task` 每次渲染都创建新对象，卡片的 props 不稳定</Opt>
<Opt>`:key` 应该用下标，这样 Vue 才能复用卡片</Opt>
<Opt>`byId` 应该改成数组，数组才能让 Vue 跟踪变化</Opt>

<template #explain>

解析：`{ ...byId[id] }` 每次渲染都生成一个新对象，Vue 比较 props 时发现引用不同，所以所有卡片都更新（第 40 章会讲这个诊断方法：在卡片里用 `onUpdated` 计数，看计数是不是 1000）。直接传 `byId[id]`，传的是同一个响应式对象，卡片只在自己依赖的字段变化时更新。第二项错在：用下标做 key 会让节点复用错位（第 30 章会讲）。第三项错在：对象的属性同样被跟踪。

</template>
</Sc>

:::

::: summary
- 项目把第 14 到 22 章装进一个真实的 Vite 项目：类型、接口层、Pinia、Router、测试、性能预算。
- 需求、知识点、里程碑和验收清单一一对应：每条验收能追溯到一条需求，每条需求都落在某个里程碑里。
- 请求失败是状态，不是异常：接口层把失败规范成 `ApiError`，store 存成状态，界面显示加载、失败、重试和空。
- 乐观更新先改界面，失败再回滚；回滚前要确认任务还停在乐观设置的状态。
- 请求竞态用取消上一次请求（或请求编号）解决；草稿只在加载完成后才参与“未保存”的判断。
- 测试要能抓住缺陷：故意改坏实现，测试应该变红。性能用更新次数做预算。
- 写下 3 到 5 条设计决策，并说明理由和代价。
:::
