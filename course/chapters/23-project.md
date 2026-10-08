---
title: 项目：任务看板 Pro
id: project
stage: 3
chapter: 23
desc: 在本地完成一个带 Pinia、Router、类型、测试和性能预算的任务看板
---

<script setup>
import TaskAppDataFlow from '../figures/23-project/TaskAppDataFlow.vue'
import TaskBoard from '../labs/23-project/TaskBoard.vue'
</script>

# 项目：任务看板 Pro

::: goals
<Goal checks="sc:1,sc:2,ex:kanbanSave">为一个小应用设计数据、组件和逻辑，并把数据保存到 localStorage。</Goal>
<Goal checks="sc:0,sc:1,sc:2,ex:kanbanItem,ex:kanbanDue">在一个项目中使用第 2–12 章的知识。</Goal>
<Goal checks="sc:3,ex:kanbanStore,ex:kanbanRoute">完成项目后的练习使用阶段三的知识。</Goal>
<Goal checks="sc:5,ex:projStoreTest">为 store 的行为写测试，并用故意改坏的实现确认测试能抓到错误。</Goal>
<Goal checks="ex:projA11y">按“无障碍的最低要求”改写一个只能用鼠标操作的列表。</Goal>
<Goal checks="sc:6">说明 `onBeforeRouteLeave` 和 `onBeforeRouteUpdate` 各在什么时候运行。</Goal>
<Goal checks="sc:7">说明一个收尾项目的性能预算，并判断预算被打破时先查什么。</Goal>

:::

::: rt
阅读主线约 22 分钟，深入内容约 1 分钟（可选）。另外留时间做实验台、练习和自测。收尾项目在你的电脑上完成，第一次独立做大约需要 12 到 20 小时。
:::

::: terms
数据模型
: 应用中数据的结构，例如 Task 有哪些字段。

拥有数据的组件
: 保存并修改某份数据的唯一组件。

派生数据
: 可以从其他数据算出来的数据。

持久化
: 把数据保存到 localStorage，刷新后仍在。

里程碑
: 项目中有明确完成标准的一个阶段。

验收清单
: 逐条操作并核对结果的清单。每条写明怎样操作，以及应该看到什么。

设计决策记录
: 写下一个决策、备选方案和选择理由的短文。
:::

::: why
你已经学完了前面的二十二章。每一章的练习，一次只用一个知识点。

真实项目不一样。同一个功能要同时决定数据放在哪里、路由怎样设计、类型怎样写、怎样测试、慢了怎样查。这些决定互相影响。

原因：课程里的练习替你做了架构决定，项目不会。你要自己做决定，并且说得出理由。

本章分两部分。第一部分（23.1 和 23.2）在页面上热身，用一个任务看板复习前面的零件。第二部分（23.3 起）是一个在你电脑上完成的项目，综合第 14 到 21 章的知识；性能诊断的方法（第 40 章）留到后面的阶段，做完项目再回头用。页面只检验其中两个最关键的片段，其余按验收清单自查。
:::

### 23.1 热身：在页面上做任务看板的前五步

任务看板把你写过的零件装在一起：用 props 和事件拆出 TaskItem（[第 6 章](/chapters/06-comm)），用 computed 算出派生数据（[第 4 章](/chapters/04-computed)），用 watch 保存数据（[第 4 章](/chapters/04-computed)），用 Pinia 共享状态（[第 16 章](/chapters/16-pinia)），用路由打开详情页（[第 17 章](/chapters/17-router)）。

装在一起时有三个问题：任务数据放在哪个组件里？一个组件太大怎样拆？刷新后任务怎样保留？实验台按五个步骤回答它们。

<Figure caption="数据和方法在 useTasks 中。App 用 props 把任务传给 TaskItem。TaskItem 用事件通知 App 修改数据。">
<TaskAppDataFlow />
</Figure>

点击步骤按钮，读代码区（只显示这一步新增的代码），在应用区操作，再点“下一步”。

<Lab id="demo-project" title="项目：任务看板" note="运行真实的 Vue。每一步都可以操作。">
<template #predict>
<Sc predict :a="2">

先猜：第 3 步中，shown 和 left 都是 computed。选择“进行中”，然后勾选“完成练习”。会发生什么？

```js
const shown = computed(() => tasks.value.filter(t => !t.done))  // 进行中
const left = computed(() => tasks.value.filter(t => !t.done).length)
```

<Opt>仍显示，加删除线，筛选要刷新</Opt>
<Opt>从列表中消失，“还剩”仍是 2 项</Opt>
<Opt>从列表中消失，“还剩”变为 1 项</Opt>

<template #explain>

解析：done 改变后，依赖 tasks 的两个 computed 都重新计算。shown 不再包含这一项，left 减 1。不需要手动刷新筛选，也不需要另存一份数据。打开实验台，切换到第 3 步，选择“进行中”，勾选“完成练习”。

</template>
</Sc>
</template>

<TaskBoard />
</Lab>

下面两道练习让你亲手写第 4 步的 TaskItem 和第 5 步的持久化：

<Exercise id="kanbanItem" />

<Exercise id="kanbanSave" />

### 23.2 页面延伸练习：排序、store 和路由

下面三个练习在页面上完成，每个都带验收标准。

1. 为任务添加截止日期。按日期排序。（第 4 章）<br>验收标准：

   - 每个任务显示截止日期。没有日期的任务显示“无”。
   - 列表按日期从早到晚排列。没有日期的任务排在最后。
   - 排序用 computed 实现。修改一个日期后，列表立即重新排序。

   <Exercise id="kanbanDue" />
2. 把任务数据放入 Pinia。（第 16 章）<br>验收标准：

   - tasks 和 add、toggle、remove 都在 store 中。App 不再保存任务数组。
   - 另一个组件显示剩余任务数。添加任务后，这个数字立即改变。
   - 组件用 `storeToRefs` 解构 state。刷新页面后，任务仍在。

   <Exercise id="kanbanStore" />
3. 添加 `/task/:id` 详情页。（第 17 章）<br>验收标准：

   - 点击任务标题后，地址变为 `/task/` 加任务的 id，页面显示这个任务。
   - 在地址栏直接打开 `/task/1` 并刷新，页面仍显示任务 1。
   - 打开不存在的 id 时，页面显示“任务不存在”，控制台没有错误。

   <Exercise id="kanbanRoute" />

原来放在这里的三个本地练习（TypeScript 类型、组件测试、带验证的表单）现在是下面项目的里程碑。

### 23.3 收尾项目：任务看板 Pro

从这里开始，你在自己的电脑上，从一个空文件夹开始，做出一个能用、有测试、能部署的应用。页面不能判你的项目，所以检验分三种：

| 检验方式 | 检验什么 |
|---|---|
| 页面练习（自动判题） | 两个最关键的片段：为 store 写能抓住缺陷的测试（`projStoreTest`），让列表满足无障碍的最低要求（`projA11y`） |
| 验收清单（你自己操作） | 23.7 的每一条：怎样操作，应该看到什么。看到了才算通过，不凭感觉打勾 |
| 设计决策记录（你自己写） | 23.8 的 3 到 5 个决策和理由 |

项目沿用任务看板的主题，向上扩展成下面十条需求。每条都写成了可以操作和观察的标准。

| 编号 | 需求 | 可验收的标准 |
|---|---|---|
| R1 | 添加任务 | 输入标题后提交，任务出现在“待办”列。标题为空或只有空格时不添加，输入框下方显示错误。用户还没有输入或提交时，不显示错误 |
| R2 | 三列看板 | 三列：待办、进行中、已完成。每个任务有“移到下一列”按钮，已完成列没有。每列按截止日期从早到晚排列，没有日期的排最后 |
| R3 | 截止日期和统计 | 添加和编辑时可以填截止日期。页面顶部显示“还剩 N 项”（待办和进行中的总数），勾选或移动后立即变化 |
| R4 | 状态放在 Pinia | 任务以 `byId`（按 id 存放）和 `ids`（顺序）存放。每一列由 computed 选择器得到。组件里没有任务数组的副本 |
| R5 | 持久化 | 刷新后任务仍在。localStorage 里的内容不是合法 JSON 时，应用回到空看板，控制台没有未捕获的错误 |
| R6 | 路由 | `/` 是看板。`/task/:id` 是详情页，可以编辑标题。不存在的 id 显示“任务不存在”。其他地址显示 404 页。详情页有未保存的修改时，离开前询问 |
| R7 | 类型 | `Task` 和 `Status` 有类型。store、组件的 props 和 emits 都有类型。`npm run type-check` 没有错误 |
| R8 | 测试 | store 的 add、move、排序各有单元测试。TaskCard 有组件测试。故意改坏实现时，对应的测试变红 |
| R9 | 性能 | 1000 个任务下，移动一个任务，其他卡片更新 0 次。详情页按路由懒加载。入口 JS（gzip）不超过 60 kB |
| R10 | 无障碍和交付 | 只用键盘能完成添加、移动、删除。图标按钮有名称。`npm run build` 通过。部署后刷新 `/task/1` 不是 404 |

### 23.4 需求到知识点的映射

每条需求用到哪一章的什么。卡住时，回到那一章的对应小节。排在本章之后的章（第 30、31、40 章）现在读不到，学到它们时再回来对照。

| 需求 | 用到的知识 | 在哪里学 |
|---|---|---|
| R1 带校验的表单 | 离开字段时才显示错误；`aria-invalid` 和 `aria-describedby` | 第 12 章 12.4、12.7 |
| R2 看板分列和排序 | 用 computed 从数据派生；props 向下，事件向上 | 第 4 章 4.1，第 6 章 6.1、6.2 |
| R3 剩余数量 | 派生数据不另存一份 | 第 4 章 4.1 |
| R4 状态放在 Pinia | setup 写法的 store；`storeToRefs`；action 修改 state；状态应该放在哪一层 | 第 16 章 16.1 到 16.3，第 19 章 |
| R5 持久化 | `$subscribe` 保存；插件；读取失败时的回退 | 第 16 章 16.4 |
| R6 路由 | 路由表；`props` 传参；动态参数；导航守卫；404 | 第 17 章 17.1、17.5、17.6 |
| R7 类型 | 为 props 和 emits 声明类型；`vue-tsc` | 第 14 章 14.2、14.5 |
| R8 测试 | `mount` 和 `trigger`；每个测试一个新 pinia；测试能发现错误 | 第 15 章 15.6、15.7 |
| R9 性能 | 稳定的 props；路由懒加载；用 `onUpdated` 计数；性能预算 | 第 21 章 21.2、21.5，第 40 章 40.1、40.8 |
| R9 为什么这样做 | key 和 diff；组件更新的条件 | 第 30 章，第 31 章 |
| R10 无障碍和交付 | 原生元素；构建和部署 | 第 12 章 12.7，第 15 章 15.5 |

### 23.5 在本地搭建项目

先确认 Node.js 的版本。`create-vue` 要求 `^22.18.0 || >=24.12.0`。然后按下面的步骤操作：

1. 创建项目。下面的命令选择了 TypeScript、Router、Pinia、Vitest、Playwright、ESLint 和 Prettier，和第 15 章 15.1 的交互式选项一致：

```bash
npm create vue@latest kanban -- \
  --ts --router --pinia --vitest --playwright --eslint --prettier
cd kanban
npm install
npm run dev
```

2. 删掉示例文件：`HelloWorld.vue`、`TheWelcome.vue`、`WelcomeItem.vue`、`HomeView.vue`、`AboutView.vue`、`counter.ts` 和 `HelloWorld.spec.ts`。
3. 按下面的结构放你的文件：

```text
src/
  types.ts                     Task、Status
  stores/tasks.ts              Pinia store
  stores/__tests__/tasks.spec.ts
  components/TaskCard.vue
  components/TaskForm.vue
  components/__tests__/TaskCard.spec.ts
  views/BoardView.vue          路由 /
  views/TaskDetailView.vue     路由 /task/:id（懒加载）
  views/NotFoundView.vue       其他地址（懒加载）
  router/index.ts
```

4. 确认脚本可用。项目的 `package.json` 里有下面这些脚本，我们用 create-vue 3.24 生成过：

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run type-check` | `vue-tsc --build`，检查类型 |
| `npm run test:unit` | Vitest（监听模式，`npx vitest run` 只运行一次） |
| `npm run test:e2e` | Playwright 端到端测试 |
| `npm run lint` / `npm run format` | ESLint 和 oxlint / Prettier |
| `npm run build` | 同时运行类型检查和 `vite build` |

脚手架的 `tsconfig` 用项目引用，所以类型检查用 `vue-tsc --build`（也就是 `npm run type-check`），不用 `--noEmit`。本章其余地方说“类型检查”，都指这个命令。

### 23.6 五个里程碑

按顺序做。每完成一个，对照它的完成标准，再进入下一个。

**里程碑 1：数据和 store（R3、R4、R5）**

1. 在 `types.ts` 里定义类型：

```ts
export type Status = 'todo' | 'doing' | 'done'
export interface Task {
  id: number
  title: string
  status: Status
  due?: string // 'YYYY-MM-DD'
}
```

2. 写 `stores/tasks.ts`。用 `byId` 和 `ids` 存放，每一列用 computed 选择器得到。下面是我们跑通过的一个参考写法（add、move、列选择器和剩余数量）：

```ts
export const useTaskStore = defineStore('tasks', () => {
  const byId = ref<Record<number, Task>>({})
  const ids = ref<number[]>([])
  let nextId = 1

  function add(title: string, due?: string): Task | null {
    const text = title.trim()
    if (!text) return null
    const task: Task = { id: nextId++, title: text, status: 'todo', due }
    byId.value[task.id] = task
    ids.value.push(task.id)
    return task
  }
  function move(id: number, status: Status) {
    const task = byId.value[id]
    if (task) task.status = status
  }
  // 选择器：一列的任务 id，按截止日期升序，没有日期的排最后
  function idsOf(status: Status): number[] {
    return ids.value
      .filter((id) => byId.value[id]?.status === status)
      .sort((a, b) => (byId.value[a]?.due ?? '9999').localeCompare(byId.value[b]?.due ?? '9999'))
  }
  const columns = computed(() => ({ todo: idsOf('todo'), doing: idsOf('doing'), done: idsOf('done') }))
  const remaining = computed(() => ids.value.length - columns.value.done.length)
  return { byId, ids, columns, remaining, add, move }
})
```

3. 用 `$subscribe` 把 `byId` 和 `ids` 保存到 localStorage。读取时用 `try/catch`：内容不是合法 JSON 时回到空看板。

完成标准：R4 和 R5 的标准满足；浏览器的 Pinia 面板里能看到 `byId` 和 `ids`。

先在页面上练习这一步最重要的习惯：为 store 的行为写测试，并确认测试真的能抓住缺陷。

<Exercise id="projStoreTest" />

**里程碑 2：看板界面（R1、R2）**

1. `TaskCard.vue`：用 `defineProps<{ task: Task }>()` 声明 props，用 `defineEmits<{ toggle: [id: number]; remove: [id: number] }>()` 声明事件。
2. `TaskForm.vue`：标题输入框加校验。还没有输入或提交时不显示错误。提交成功后清空输入框。
3. `BoardView.vue`：用 `storeToRefs(store)` 得到 `columns` 和 `byId`，用 `v-for` 渲染三列。传给卡片的是 `byId[id]`，不要在模板里复制它。

完成标准：R1、R2 的标准满足。

**里程碑 3：路由（R6）**

1. 路由表里用 `props: (route) => ({ id: Number(route.params.id) })`，把路由参数转成数字再传给详情页。路由参数总是字符串，不转换时 `'3' === 3` 为假。
2. 详情页和 404 页用 `() => import(...)` 懒加载。
3. 详情页用 `onBeforeRouteLeave` 保护未保存的修改。从 `/task/1` 去 `/task/2` 时组件被复用，不会触发 leave 守卫，所以还要写 `onBeforeRouteUpdate`（第 17 章 17.5 和 17.6）。

```ts
onBeforeRouteLeave(() => {
  if (dirty.value && !window.confirm('有未保存的修改，确定离开？')) return false
})
```

完成标准：R6 的标准满足；在地址栏直接打开 `/task/999`，显示“任务不存在”。

**里程碑 4：类型、测试和无障碍（R7、R8、R10）**

1. 运行 `npm run type-check`，修到零错误。把 `Task` 传给缺少 `title` 的对象，编辑器应该报错。
2. 写 store 的单元测试（里程碑 1 的页面练习是它的缩小版）和 TaskCard 的组件测试。每个测试一个新 pinia：

```ts
beforeEach(() => setActivePinia(createPinia()))

it('每一列按截止日期升序，没有日期的排最后', () => {
  const s = useTaskStore()
  s.add('无日期')
  s.add('晚', '2026-12-01')
  s.add('早', '2026-01-01')
  expect(s.columns.todo.map((id) => s.byId[id]?.title)).toEqual(['早', '晚', '无日期'])
})
```

3. 故意改坏一处实现（例如去掉排序），确认至少有一个测试变红，再改回来。
4. 用原生元素：复选框和 label，`<button>`。图标按钮写 `aria-label`。“还剩 N 项”放在 `role="status"` 的元素里。

完成标准：R7、R8 满足；拔掉鼠标，只用 Tab、空格和 Enter 完成添加、移动、删除。

先在页面上练习无障碍的最低要求：

<Exercise id="projA11y" />

**里程碑 5：性能和部署（R9、R10）**

1. 写一个性能测试：造 1000 个任务，挂载看板，移动一个，断言卡片更新 0 次。用全局 mixin 在 `updated` 里计数。`__name` 是 `<script setup>` 的组件根据文件名生成的名字：

```ts
let updates = 0
const wrapper = mount(BoardView, {
  global: {
    plugins: [pinia],
    mixins: [{ updated() { if ((this as any).$options.__name === 'TaskCard') updates++ } }],
  },
})
await flushPromises()
updates = 0
store.move(500, 'doing')
await flushPromises()
expect(updates).toBe(0)
```

我们用 1000 个任务验证过：移动一个任务，卡片更新 0 次；改一个任务的标题，卡片更新 1 次。如果你的数字更大，先查传给卡片的 props 是否稳定（第 21 章 21.2 节）。更系统的诊断方法见第 40 章，学到那里再回来用。

2. 运行 `npm run build`，看输出里每个文件的大小。路由页应该是单独的文件。给入口文件定预算（第 40 章 40.6 节会讲怎样定，现在可以先按下面的数字做）。我们用只有 Router 和 Pinia 的空项目构建过，入口 JS 约 97 kB，gzip 后约 38 kB，所以 60 kB 的预算留了余量；你的项目超过它时，先查是哪个依赖变大了。
3. 设置 `base`（需要时），把 `dist/` 部署到静态托管，并配置“找不到文件时返回 `index.html`”（第 15 章 15.5）。

完成标准：R9、R10 满足；线上地址刷新 `/task/1` 不是 404。

### 23.7 验收清单

按下表逐条操作。**看到“应该看到”的结果，才算这一条通过。**

| 类别 | 怎样操作 | 应该看到 |
|---|---|---|
| 功能 | 按 R1 到 R3 逐条操作，同时打开控制台 | 每条需求都能完成；控制台没有红色报错，也没有 `key` 警告 |
| 功能 | 添加几个任务，移动一些，然后刷新页面 | 任务和它们所在的列都还在 |
| 出错 | 在控制台运行 `localStorage.setItem('tasks', '{坏')`（键名换成你用的），刷新 | 看板为空，应用没有崩溃 |
| 空数据 | 清空所有任务 | 每一列显示“没有任务”，不是一片空白 |
| 路由 | 在地址栏打开 `/task/999` 和 `/不存在` | 前者显示“任务不存在”，后者显示 404 页 |
| 路由 | 在详情页改标题但不保存，点击“返回看板” | 出现“有未保存的修改”询问；点取消，留在详情页 |
| 类型 | 运行 `npm run type-check` | 没有错误 |
| 测试 | 运行 `npx vitest run`；再故意改坏排序或事件名 | 全部通过；改坏后至少一个测试变红，改回后全绿 |
| 性能 | 1000 个任务下，运行性能测试 | 移动一个任务，其他卡片更新 0 次 |
| 性能 | 运行 `npm run build` | 路由页是单独的文件；入口 JS（gzip）不超过 60 kB |
| 无障碍 | 拔掉鼠标，只用 Tab、空格、Enter | 添加、移动、删除都能完成，并且能看见焦点在哪里 |
| 无障碍 | 打开浏览器的无障碍检查（例如 Lighthouse 的无障碍项） | 没有“按钮没有名称”“表单没有标签”这类问题 |
| 交付 | 部署后，在地址栏直接打开 `/task/1` 并刷新 | 页面正常显示，不是 404 |

### 23.8 设计决策记录

项目完成后，写 3 到 5 条设计决策。每条包括：**决策、备选方案、选择的理由、代价。**理由要具体到你的项目，不要写“因为这样更好”。

| 要回答的问题 | 参考的章 |
|---|---|
| 任务状态放在哪里？ | 第 16 章，第 19 章 |
| 路由怎样设计？ | 第 17 章 |
| 哪些地方做了性能处理？依据是什么数字？ | 第 21 章，第 40 章 |
| 测试测什么，不测什么？ | 第 15 章 |
| 类型怎样帮你避免了一个具体的错误？ | 第 14 章 |

示范（针对本章参考实现，你的项目会不同）：

> **决策 1：任务放在 Pinia，用 `byId` 加 `ids`。**
> 备选：每个列组件自己保存一个数组；一个 `tasks` 数组放在 Pinia。
> 理由：任务要被看板、详情页和统计三处读取，不能放在某个组件里。用 `byId` 按 id 取任务，详情页不需要遍历数组；`ids` 保存顺序。
> 代价：多写一层选择器；删除时要同时改两处。
>
> **决策 2：详情页用路由参数，不用弹窗加 query。**
> 备选：在看板页弹出详情，用 `?task=3` 记录。
> 理由：详情页需要被直接打开和刷新，路由参数天然支持；未保存修改的守卫也只需要写在这一个页面组件里。
> 代价：看板页的滚动位置在返回时要靠 `scrollBehavior` 恢复。
>
> **决策 3：不用虚拟列表，只保证 props 稳定。**
> 依据：1000 个任务下，移动一个任务时其他卡片更新 0 次（性能测试断言），首屏 DOM 约 1000 张卡片，在目标设备上没有长任务。
> 备选：虚拟列表。
> 理由：数字已经达到预算。虚拟列表会让键盘导航和无障碍更复杂。如果任务数超过一万，再回来用它。
> 代价：任务数增长时要重新测量。
>
> **决策 4：测试行为，不测内部实现。**
> 理由：store 测试检查“列的顺序”和“剩余数量”，组件测试检查“显示标题”和“发出 toggle 和 id”。改内部写法时测试不用改。每个测试都用“故意改坏”确认过它能变红。
> 不测：样式，以及 Pinia 和 Vue Router 自己的行为。

### 23.9 可选的延伸方向

做完验收清单之后，选一两项做，并把取舍写进你的设计决策记录。

| 延伸 | 做什么 | 在哪里学 |
|---|---|---|
| 虚拟列表 | 任务超过一万条时，只渲染可见的卡片，并保证键盘导航仍然可用 | 第 21 章 21.1 |
| 自定义指令 | 写一个 `v-focus`：添加任务后让新卡片获得焦点 | 第 10 章 |
| SSR 或 SSG | 用 `renderToString` 或 Nuxt 生成首屏 HTML，并且没有水合警告 | 第 36 章 |
| 无渲染组件 | 把“列”的排序和选择逻辑抽成无渲染组件或 `useListbox` | 第 35 章 |
| 自定义渲染器 | 把统计数字画到 Canvas 上 | 第 32 章 |
| 迁移 | 给旧的选项式 API 小组件写一份迁移说明 | 第 22 章 |
| 错误监控 | 给看板加全局的 `errorHandler` 和错误边界，路由和 Pinia 的错误也一起上报 | 第 38 章 |
| 表单层 | 把任务表单的校验、提交和字段数组抽成一个小的表单层 | 第 39 章 |
| 组件库 | 把看板的组件抽成别人能安装的库，配好构建、`exports` 和类型 | 第 41 章 |
| 用 KeepAlive 和 Transition | 给详情页加 `KeepAlive`，给卡片移动加 `Transition`，并按它们的实现解释看到的行为 | 第 33 章 |

::: deep 为组件写测试
用 Vitest 和 @vue/test-utils 测试组件。按下面的步骤操作：

1. 安装 `vitest`、`@vue/test-utils` 和 `jsdom`。
2. 在 vite.config 中设置 `test.environment` 为 `'jsdom'`。
3. 用 `mount` 挂载组件。
4. 用 `trigger` 触发事件。等待 DOM 更新。
5. 检查渲染结果和发出的事件。

```js
import { test, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import TaskItem from './TaskItem.vue'

test('点击复选框时发出 toggle 事件', async () => {
  const wrapper = mount(TaskItem, {
    props: { task: { id: 1, text: '写测试', done: false } },
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }  // action 替换为 vi.fn
  })
  expect(wrapper.text()).toContain('写测试')
  await wrapper.find('input[type=checkbox]').trigger('change')   // await：等待 nextTick
  expect(wrapper.emitted('toggle')[0]).toEqual([1])
})

test('组合式函数可以单独测试', () => {
  const { count, inc } = useCounter()
  inc()
  expect(count.value).toBe(1)
})
```
:::

::: pitfalls
1. 路由参数是字符串。比较 id 之前先转成数字。原因：`'3' === 3` 为假，找不到任务。
2. 不要把任务数组复制到组件里。原因：两份数据会不一致。从 store 的 computed 读取。
3. trigger 和 setValue 返回 Promise。先 await，再检查 DOM。原因：DOM 在下一次更新后才改变。
4. 测试行为，不测试实现细节。检查用户看到的内容和组件发出的事件。原因：这样修改内部代码后，测试仍然有效。
5. 测试写完后，故意改坏实现，看测试会不会变红。原因：没有断言或断言太弱的测试永远通过。
6. 在模板里复制对象再传给子组件，例如 `:task="{ ...t }"`。原因：每次渲染都是新对象，所有卡片都会更新（第 21 章）。
7. 在 CI 里用毫秒做性能断言。原因：测试环境的耗时不稳定。断言更新次数。
:::

::: selfcheck
<Sc :a="2">

哪个操作会调用 `save`？

```js
const tasks = ref([{ id: 1, text: 'a', done: false }])
watch(tasks, v => save(v))      // 没有 deep
```

<Opt>tasks.value.push(t)</Opt>
<Opt>tasks.value[0].done = true</Opt>
<Opt>tasks.value = [...tasks.value, t]</Opt>

<template #explain>

解析：侦听一个 ref 时，默认只侦听 .value 的替换。push 和修改属性都不触发。加上 `{ deep: true }`，三种操作都会保存。

</template>
</Sc>

<Sc :a="0">

剩余任务的数量应该怎样得到？

<Opt>用 computed 从 tasks 计算</Opt>
<Opt>用另一个 ref 保存。添加和删除时手动修改</Opt>
<Opt>在模板中写一个循环来数</Opt>

<template #explain>

解析：派生数据用 computed。第二份数据容易和 tasks 不一致。

</template>
</Sc>

<Sc :a="1">

在 TaskItem 中点击复选框。谁修改 `task.done`？

<Opt>TaskItem 直接修改 props.task.done</Opt>
<Opt>TaskItem 发出 toggle 事件，App 调用 toggle 修改数据</Opt>
<Opt>浏览器自动修改</Opt>

<template #explain>

解析：子组件不修改 props。子组件发出事件。拥有数据的一方修改数据。

</template>
</Sc>

<Sc :a="0">

你完成了延伸练习“添加 /task/:id 详情页”。打开 /task/3 时，页面显示“任务不存在”。任务 3 确实存在。下面的代码错在哪里？

```js
const route = useRoute()
const store = useTaskStore()   // 创建时从 localStorage 读取任务
const task = computed(() =>
  store.tasks.find(t => t.id === route.params.id))
```

<Opt>route.params.id 是字符串，t.id 是数字</Opt>
<Opt>刷新页面后，Pinia 的数据被清空</Opt>
<Opt>computed 不跟踪 route 的变化</Opt>

<template #explain>

解析：路由参数总是字符串。`'3' === 3` 为假，所以 find 找不到任务。修复：写 `Number(route.params.id)`。store 创建时从 localStorage 读取数据，所以刷新不会丢失任务。route 是响应式的，computed 能跟踪 `route.params.id`。

</template>
</Sc>

<Sc :a="1">

预习（第 25 章会详细讲）：添加任务后，要把列表滚动到新任务。下面的代码为什么没有滚动到新任务？

```js
function add(text) {
  tasks.value.push({ id: Date.now(), text })
  listEl.value.lastElementChild.scrollIntoView()
}
```

<Opt>push 不触发更新，要替换整个数组</Opt>
<Opt>DOM 还没有更新，最后一项是旧任务</Opt>
<Opt>滚动只能写在 onUpdated 中</Opt>

<template #explain>

解析：修改数据后，Vue 在微任务中更新 DOM。push 之后立即读取，`lastElementChild` 还是旧的最后一项。修复：在 push 之后 `await nextTick()`。ref 数组的 push 会触发更新，只是不同步。onUpdated 也能读到新 DOM。但是它在每次更新后都运行，不只在添加任务时运行。

</template>
</Sc>

<Sc :a="1">

你为 TaskCard 写了组件测试。故意把组件里 `emit('toggle', …)` 改成 `emit('toggled', …)`，运行测试，它仍然通过。最可能的原因是什么？

```js
test('点击复选框发出 toggle', async () => {
  const wrapper = mount(TaskCard, { props: { task } })
  await wrapper.find('input[type=checkbox]').trigger('change')
  expect(wrapper.emitted()).toBeDefined()
})
```

<Opt>emit 的事件名不影响组件测试</Opt>
<Opt>断言太弱：`emitted()` 总是返回一个对象，和事件名无关</Opt>
<Opt>trigger 没有 await，测试在事件发出之前就结束了</Opt>

<template #explain>

解析：`wrapper.emitted()` 不带参数时返回所有已发出事件组成的对象，没有任何事件时是空对象，也是“已定义”的。所以这条断言永远通过。要写成 `expect(wrapper.emitted('toggle')?.[0]).toEqual([task.id])`，事件名或参数一错就失败。第三项不对：代码里写了 `await`。故意改坏再看测试变红，正是验收清单里“测试能抓住缺陷”那一条的做法。

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

<Sc :a="0">

收尾项目的性能预算是“移动一个任务时，其他卡片更新 0 次”。你的看板有 1000 张卡片，移动一个任务后，所有卡片都更新了。最先应该检查什么？

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
- 先设计数据。然后写模板。然后用 computed 计算派生数据。
- 界面复杂时，拆分组件。逻辑复杂时，提取组合式函数。
- 用 watch 保存数据。
- 收尾项目分五个里程碑：store、界面、路由、类型测试无障碍、性能部署。每个里程碑有完成标准。
- 用验收清单检验：怎样操作，应该看到什么。看到才算通过。
- 测试要能抓住缺陷：故意改坏实现，测试应该变红。性能用更新次数做预算。
- 写下 3 到 5 条设计决策，并说明理由和代价。
:::
