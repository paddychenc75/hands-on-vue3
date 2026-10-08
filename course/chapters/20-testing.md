---
title: 测试
id: testing
stage: 3
chapter: 20
desc: 测什么、Vitest 与 Vue Test Utils、异步与假定时器、mock、带 Pinia 和 Router 的组件、端到端
---

<script setup>
import TestStyles from '../labs/20-testing/TestStyles.vue'
</script>

# 测试

::: goals
<Goal checks="sc:0,sc:7">判断一段代码该用单元测试、组件测试还是端到端测试，并说明为什么不测实现细节。</Goal>
<Goal checks="sc:1,ex:testMutants">用 Vue Test Utils 为组件写测试：挂载、触发操作、断言渲染结果和发出的事件，并让测试抓住故意改坏的实现。</Goal>
<Goal checks="sc:2,sc:3,ex:testAwait,ex:testDebounce">按等待的对象选择 `await`、`flushPromises` 或假定时器，修复偶发失败的测试。</Goal>
<Goal checks="sc:4,sc:5,ex:testCart">用 `vi.mock` 隔离请求，并为带 Pinia 和 Router 的组件搭建测试环境。</Goal>
<Goal checks="sc:6">识别断言实现细节、滥用快照、共享状态这几种坏测试。</Goal>

:::

::: rt
阅读主线约 25 分钟，深入内容约 2 分钟（可选）。另外留时间做练习、实验台、自测和三个本地任务。
:::

::: analogy
测试像**出厂前的质检员**。好的质检员按用户的使用方式检查：按下按钮，看灯亮不亮。坏的质检员拆开外壳，检查里面的螺丝是不是原来那一颗。换了一种更好的螺丝，第二种质检员就拒收，产品其实没有任何问题。
:::

::: terms
Vitest
: 运行单元测试和组件测试的工具。

单元测试
: 直接调用一个函数或组合式函数，检查它的返回值和副作用。

组件测试
: 在模拟的浏览器环境中挂载组件，操作它，检查渲染结果和发出的事件。

端到端测试
: 在真实浏览器中运行完整的应用，像用户一样走完一条流程。

替身（mock）
: 在测试中代替真实依赖的函数或模块，可以设定返回值，也能记录被调用的情况。

假定时器
: 把 `setTimeout` 等计时函数换成可以手动拨动时间的版本，测试不用真的等待。
:::

::: why
你写了 200 个测试。一次重构后，80 个变红，但应用没有任何问题。你花一下午把它们改绿。从此没有人再相信红色的测试。

原因：这些测试检查的是组件内部的写法，不是组件的行为。内部写法一变，测试就红。

反过来也有问题：另一些测试永远绿，组件坏了也绿，因为它们没有断言，或者没有等到页面更新。

本章先回答“测什么”，再讲怎样配置和写测试，最后讲怎样验证测试真的能发现错误。
:::

### 20.1 测什么，不测什么

测试分三层。越往下，越接近用户，也越慢、越贵。

| 层 | 例子 | 速度 | 信心 | 常见的脆弱来源 |
|---|---|---|---|---|
| 单元测试 | 价格格式化函数、`useCounter`、store 的 action | 毫秒 | 这一小段逻辑对 | 很少 |
| 组件测试 | 点击“添加”后发出 `add` 事件 | 几十毫秒 | 这个组件的行为对 | 选择元素的方式、没有等待更新 |
| 端到端测试 | 登录、新建任务、刷新后任务还在 | 秒 | 整个系统连起来对 | 环境、网络、数据、时序 |

官方文档的建议是：尽早开始测试，三层都要有。数量上，逻辑多的地方多写单元测试，关键流程少写几条端到端测试，组件测试放在中间。

**测什么：公开的输入和输出。** 把组件看成一个黑盒：

| | 内容 |
|---|---|
| 输入 | props、插槽、用户操作（点击、输入）、store 的初始状态、当前路由 |
| 输出 | 渲染出的文字和元素、发出的事件、对外部函数的调用（例如调用了请求函数） |

测试只通过输入驱动组件，只检查输出。组件里叫 `count` 还是 `clicks`，用 `ref` 还是 `reactive`，是内部细节。

**不测什么：**

- 框架本身。`v-for` 能不能渲染列表，Vue 自己的测试已经保证了。
- 内部状态、私有方法、类名、DOM 的层级结构。这些改了，行为不一定变。
- 第三方库的行为。你只需要确认自己正确地调用了它。
- 没有逻辑的纯展示组件。它们的错误更适合用肉眼或端到端测试发现。

**判断一个测试好不好，问两个问题：**

1. 我重写内部实现、行为不变时，这个测试应该红吗？不该红。红了就是脆弱的测试。
2. 我故意改坏行为时，这个测试应该红吗？应该红。不红就是没用的测试。

第二个问题就是**突变检验**：故意改坏实现，看测试是否变红。后面的练习和本章实验台都用它。

### 20.2 搭好环境，运行第一个测试

测试环境的核心是 Vitest。它和 Vite 共用配置，所以 `.vue` 文件、路径别名 `@/` 不用再配一遍。

按下面的步骤开始：

1. 运行 `npm create vue@latest`，选择 Vitest（第 15 章讲过这个脚手架）。它会装好 `vitest`、`@vue/test-utils` 和 `jsdom`。
2. 看 `vitest.config.ts`。它把 `vite.config.ts` 合并进来，再加一个 `test` 字段：

```ts
// vitest.config.ts（脚手架生成的）
import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',                                  // 在 Node 里模拟浏览器
      exclude: [...configDefaults.exclude, 'e2e/**'],        // 端到端测试不归 Vitest 管
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
```

3. 运行 `npm run test:unit`（脚手架里它是 `vitest`）。

常用配置：

| 字段 | 作用 | 建议 |
|---|---|---|
| `environment` | 测试运行的环境。`jsdom` 和 `happy-dom` 都在 Node 里模拟 DOM | 先用脚手架给的 `jsdom`。换成 `happy-dom` 通常更快，两者都不做排版，没有真实的元素尺寸 |
| `globals` | `true` 时 `describe`、`it`、`expect`、`vi` 不用 import | 保持默认的 `false`，显式 import，来源清楚。要用 `globals` 时，还要在 tsconfig 的 `types` 里加 `vitest/globals` |
| `setupFiles` | 每个测试文件运行前先执行的文件 | 放全局的测试配置，例如 `@vue/test-utils` 的 `config.global` |
| `coverage` | 覆盖率 | 见下 |

测试文件的位置：脚手架放在 `src/**/__tests__/*.spec.ts`。放在组件旁边的 `X.spec.ts` 也行。默认只运行文件名含 `.test.` 或 `.spec.` 的文件。

**运行方式：**

- `npx vitest`：监听模式。改文件后只重跑相关的测试。写代码时用。
- `npx vitest run`：运行一次就退出。CI 里用。
- `npx vitest run --coverage`：统计覆盖率。需要先装和 `vitest` 版本一致的 `@vitest/coverage-v8`。

覆盖率只说明“哪些行被执行过”，不说明“断言对不对”。一个没有断言的测试也能让覆盖率变高。所以不要把 100% 当目标，把它当作找出“完全没测到的文件”的工具。

测试文件也要过类型检查。脚手架的 `tsconfig.vitest.json` 包含测试文件，所以 `npm run type-check`（即 `vue-tsc --build`，第 15 章讲过它与 `--noEmit` 的区别）会检查测试里的类型错误。

::: note
脚手架当前安装 Vitest 4。本章的代码在 Vitest 4.1 和 5.0 上都实测通过，两者的写法没有区别。
:::

### 20.3 测纯逻辑和组合式函数

不依赖 Vue 生命周期的函数，直接调用，直接断言：

```ts
// src/composables/useCounter.ts
import { ref } from 'vue'
export function useCounter(start = 0) {
  const count = ref(start)
  const increment = () => count.value++
  return { count, increment }
}

// src/__tests__/useCounter.spec.ts
import { it, expect } from 'vitest'
import { useCounter } from '@/composables/useCounter'

it('increment 让 count 加 1', () => {
  const { count, increment } = useCounter(5)
  increment()
  expect(count.value).toBe(6)
})
```

用了 `onMounted` 或 `inject` 的组合式函数，不能直接调用：它们需要一个“当前组件”（第 8 章讲过，钩子注册在调用它的组件上）。办法是给它造一个临时的组件。下面的 `withSetup` 来自官方文档，加了 `provides` 参数：

```ts
import { createApp } from 'vue'

function withSetup<T>(composable: () => T, provides: Record<string, unknown> = {}) {
  let result!: T
  const app = createApp({
    setup() {
      result = composable()
      return () => null
    },
  })
  for (const [key, value] of Object.entries(provides)) app.provide(key, value)
  app.mount(document.createElement('div'))
  return [result, app] as const
}
```

第 8 章的 `useMouse(target)` 在 `onMounted` 里监听元素，在 `onUnmounted` 里移除监听。测试它，要同时检查挂载后会跟踪、卸载后不再跟踪：

```ts
it('卸载后不再跟踪指针', () => {
  const el = document.createElement('div')
  document.body.append(el)
  const [{ x }, app] = withSetup(() => useMouse(ref(el)))
  el.dispatchEvent(new MouseEvent('pointermove', { clientX: 10 }))
  expect(x.value).toBe(10)
  app.unmount()                                    // 触发 onUnmounted
  el.dispatchEvent(new MouseEvent('pointermove', { clientX: 30 }))
  expect(x.value).toBe(10)                         // 不再变化
})
```

用了 `inject` 的组合式函数，把值放进 `provides`：`withSetup(useTheme, { theme: 'dark' })`。组合式函数很复杂时，不要硬凑 `withSetup`，直接通过一个使用它的测试组件来测，这时就是组件测试。

### 20.4 组件测试：像用户一样使用它

Vue Test Utils（VTU）是官方的组件测试库。基本流程是：挂载、操作、断言。被测的表单组件如下：

```vue
<!-- src/components/TaskForm.vue -->
<script setup lang="ts">
import { ref } from 'vue'
const emit = defineEmits<{ add: [title: string] }>()
const title = ref('')

function submit() {
  const text = title.value.trim()
  if (!text) return
  emit('add', text)
  title.value = ''
}
</script>

<template>
  <form @submit.prevent="submit">
    <label>任务标题 <input v-model="title" /></label>
    <button type="submit">添加</button>
  </form>
</template>
```

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskForm from '@/components/TaskForm.vue'

describe('TaskForm', () => {
  it('提交时发出 add 事件，标题去掉首尾空格', async () => {
    const wrapper = mount(TaskForm)
    await wrapper.find('input').setValue('  写周报  ')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('add')).toEqual([['写周报']])
  })

  it('提交后清空输入框', async () => {
    const wrapper = mount(TaskForm)
    const input = wrapper.find('input')
    await input.setValue('写周报')
    await wrapper.find('form').trigger('submit')
    expect(input.element.value).toBe('')
  })
})
```

几点说明：

- `setValue` 和 `trigger` 返回 Promise，要 `await`。它们等待的是 Vue 的下一次 DOM 更新（20.5 节讲等什么）。
- `emitted('add')` 返回一个数组：每发出一次事件加一项，每一项是这次事件的参数数组。所以发出一次 `add('写周报')` 是 `[['写周报']]`。从没发出过时是 `undefined`。

**`mount` 还是 `shallowMount`。** `mount` 渲染整棵组件树。`shallowMount` 把所有子组件换成空的占位（如 `<task-form-stub>`）。官方文档的建议是组件测试不要 mock 子组件，因为用户看到的是整棵树。默认用 `mount`。只有子组件很重、需要自己的环境，或你就是要把父组件隔离出来测时，才用 `shallowMount` 或 `global.stubs`。

**怎样找元素。** 按优先级：

1. 用户看得见的东西：文字、标签、角色（“名叫‘添加’的按钮”）。
2. 专门留给测试的 `data-testid`（官方文档的示例就这样做）。
3. 标签名这类稳定的结构（`input`、`form`）。

不要用 `.btn-primary` 这类样式类名，也不要用 `div > div:nth-child(2)`。它们和行为无关，改样式就会让测试失败。

**props、插槽和 `v-model`：**

```ts
const wrapper = mount(AlertBox, {
  props: { title: '提示', type: 'info' },
  slots: { default: '<em>详情</em>' },
})
expect(wrapper.find('em').text()).toBe('详情')

await wrapper.setProps({ title: '出错了', type: 'error' })   // 更新 props，await 等重新渲染
expect(wrapper.find('h3').text()).toBe('出错了')
```

`v-model` 组件（用 `defineModel`）这样测：传入 `modelValue` 和 `'onUpdate:modelValue'`，再检查 `emitted('update:modelValue')`。

**Vue Test Utils 和 Testing Library。** Testing Library（`@testing-library/vue`）建在 VTU 之上，思路更激进：它不给你组件实例，只给你按用户方式查找元素的方法。

| | Vue Test Utils | Testing Library |
|---|---|---|
| 思路 | 组件的工具箱：挂载、`props`、`emitted`、`findComponent`、stub | 只从用户的角度操作和查询页面 |
| 查找 | `find('css 选择器')`、`findComponent` | `getByRole`、`getByLabelText`、`getByText` |
| 操作 | `trigger`、`setValue` | `userEvent`：模拟完整的输入过程（逐字输入、焦点变化） |
| 断言事件 | `wrapper.emitted()` | 自己传入 `onAdd` 的 `vi.fn()` |
| 风险 | 容易顺手去读 `wrapper.vm` 的内部状态 | 不容易写出依赖实现的测试；官方文档提醒，对用了 `Suspense` 的异步组件要小心 |

同一个测试用 Testing Library 写：

```ts
import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

it('输入并提交', async () => {
  const onAdd = vi.fn()
  const user = userEvent.setup()
  render(TaskForm, { attrs: { onAdd } })
  await user.type(screen.getByLabelText('任务标题'), '写周报')
  await user.click(screen.getByRole('button', { name: '添加' }))
  expect(onAdd).toHaveBeenCalledWith('写周报')
})
```

选择建议：一个项目选一种，不要混着写。需要频繁断言事件、传 props、stub 子组件时，选 VTU，并且约束自己只用文字、标签和 `data-testid` 找元素。团队重视无障碍、希望测试天然按角色和标签写时，选 Testing Library。本章后面的例子用 VTU。

<Exercise id="testMutants" />

### 20.5 异步和时间：等什么，怎么等

测试偶发失败，最常见的原因是**没有等到该等的东西**。要等的东西有三种，各有各的办法：

| 要等的东西 | 例子 | 办法 |
|---|---|---|
| Vue 的 DOM 更新 | 点击后数字变了 | `await trigger()`、`await setValue()`、`await setProps()`，或 `await nextTick()` |
| 已经开始的 Promise | `onMounted` 里 `await fetchTasks()` | `await flushPromises()` |
| 时间 | 防抖的 300 毫秒、`setTimeout` | 假定时器：`vi.useFakeTimers()` 加 `vi.advanceTimersByTime()` |

`await trigger()` 只等 DOM 更新，不等请求。`flushPromises()` 等所有已经能完成的 Promise 都完成，但不会等真实的计时器。不要用真的 `setTimeout` 去“睡一会儿”：它让测试变慢，而且睡多久都不保证够。（`nextTick` 背后的更新队列，详见第 25 章。）

<Exercise id="testAwait" />

**假定时器。** 第 8 章的防抖要等 300 毫秒。测试里不真的等，而是把时间拨过去：

```ts
// SearchBox：输入停止 300 毫秒后发出一次 search
describe('SearchBox', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })        // 恢复，别影响其他测试

  it('停止输入 300 毫秒后才发出一次 search', async () => {
    const wrapper = mount(SearchBox)
    const input = wrapper.find('input')
    await input.setValue('a')
    vi.advanceTimersByTime(200)
    await input.setValue('ab')
    vi.advanceTimersByTime(200)
    expect(wrapper.emitted('search')).toBeUndefined()   // 才过 200 毫秒，不发
    vi.advanceTimersByTime(100)
    expect(wrapper.emitted('search')).toEqual([['ab']]) // 只发最后一次
  })
})
```

注意三点：

- 假定时器下，`await` 的 DOM 更新照常工作，它不依赖计时器。
- 定时器回调里还有 Promise 要等时，用 `await vi.advanceTimersByTimeAsync(ms)`。
- 一定要在 `afterEach` 里 `vi.useRealTimers()`，否则后面的测试拿到的还是假的计时器。

<Exercise id="testDebounce" />

**`Suspense`。** 用了顶层 `await` 的组件（`async setup`，第 9 章）必须放在 `Suspense` 里才能渲染。测试里包一层，再 `await flushPromises()`：

```ts
const wrapper = mount(defineComponent({
  render: () => h(Suspense, null, {
    default: () => h(AsyncUser),
    fallback: () => h('p', '加载中'),
  }),
}))
expect(wrapper.text()).toBe('加载中')
await flushPromises()
expect(wrapper.text()).toBe('你好，小明')
```

### 20.6 隔离外部依赖：mock 函数、mock 模块、mock 请求

组件调用了请求函数，测试不应该真的发请求：慢、不稳定、结果不可控。办法是用替身。Vitest 有三个工具：

| 工具 | 作用 |
|---|---|
| `vi.fn()` | 造一个空函数，记录它被调用的次数和参数，可以设定返回值 |
| `vi.spyOn(对象, '方法')` | 监视一个已有的方法，可以只记录，也可以替换它的实现 |
| `vi.mock('模块路径')` | 把整个模块换成替身 |

**场景：任务列表在挂载时请求数据。** 请求函数放在 `src/api/tasks.ts`，组件在 `onMounted` 里调用它。测试把这个模块换掉：

```ts
import { mount, flushPromises } from '@vue/test-utils'
import { fetchTasks } from '@/api/tasks'
import TaskList from '@/components/TaskList.vue'

vi.mock('@/api/tasks')            // 模块里每个导出都变成 vi.fn()，默认返回 undefined

it('加载成功后显示任务', async () => {
  vi.mocked(fetchTasks).mockResolvedValue([{ id: 1, title: 'A' }, { id: 2, title: 'B' }])
  const wrapper = mount(TaskList)
  expect(wrapper.text()).toContain('加载中')
  await flushPromises()                              // 等 onMounted 里的 await 完成
  expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['A', 'B'])
})

it('加载失败时显示错误', async () => {
  vi.mocked(fetchTasks).mockRejectedValue(new Error('加载失败'))
  const wrapper = mount(TaskList)
  await flushPromises()
  expect(wrapper.find('[role=alert]').text()).toBe('加载失败')
})
```

要点：

- `vi.mock` 会被 Vitest 提升到文件最前面，所以写在 `import` 后面也对 import 生效。
- 每个测试自己设定返回值（`mockResolvedValue`、`mockRejectedValue`），不要依赖上一个测试留下的设置。
- 需要保留模块里的一部分真实实现时，传一个工厂：`vi.mock('@/api/tasks', () => ({ fetchTasks: vi.fn() }))`。

**mock 请求函数，还是拦截网络？** 另一种做法是用 MSW（Mock Service Worker）。它在网络层拦截 `fetch`，组件和请求函数都是真实的：

```ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const server = setupServer(
  http.get('*/api/tasks', () => HttpResponse.json([{ id: 1, title: 'A' }])),
)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))   // 没写处理器的请求直接报错
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it('服务端 500 时显示错误', async () => {
  server.use(http.get('*/api/tasks', () => new HttpResponse(null, { status: 500 })))   // 只对这个测试生效
  const wrapper = mount(TaskList)
  await vi.waitFor(() => expect(wrapper.find('[role=alert]').exists()).toBe(true))
  expect(wrapper.find('[role=alert]').text()).toBe('加载失败')
})
```

| | mock 请求函数（`vi.mock`） | MSW |
|---|---|---|
| 请求函数本身 | 不被测到 | 被测到：地址、方法、状态码处理 |
| 搭建成本 | 一行 | 要写处理器，要管理生命周期 |
| 与代码结构耦合 | 绑定模块路径和函数名 | 只绑定接口地址，换请求库不用改测试 |
| 适合 | 请求层很薄、只想测组件对“成功、失败”的反应 | 请求层有逻辑（统一错误处理、重试）、很多页面共用同一批接口 |

小项目从 mock 请求函数开始。请求层长出逻辑，或者多个测试在重复写同样的返回数据时，换 MSW。第 18 章讲的数据请求层，决定了你该 mock 哪一层：mock 离组件最近的那个函数就够了，不要 mock `fetch` 本身。

### 20.7 带 Pinia 的组件，以及 store 本身

组件里用了 store（第 16 章），测试要给它一个 pinia。有两种做法：

**做法一：`createTestingPinia`。** 来自 `@pinia/testing`（当前版本 2.0.1，与 Pinia 4 配套）。它造一个测试用的 pinia，默认把所有 action 换成 spy：action 的代码不运行，只记录调用。

```ts
import { createTestingPinia } from '@pinia/testing'
import { useCart } from '@/stores/cart'

const wrapper = mount(CartBadge, {
  global: {
    plugins: [createTestingPinia({
      createSpy: vi.fn,                                   // 没开 globals 时必须传
      initialState: { cart: { items: [{ id: 1, price: 30 }, { id: 2, price: 20 }] } },
    })],
  },
})
const cart = useCart()                                    // 取到的就是这个 pinia 里的 store
expect(wrapper.text()).toContain('2 件，共 50 元')
await wrapper.find('button').trigger('click')
expect(cart.clear).toHaveBeenCalledTimes(1)               // action 是 spy，没有真的清空
```

要点：

- `initialState` 的键是 store 的 id（这里是 `'cart'`）。
- 不传 `createSpy` 又没开 `globals` 时，会抛出 `PINIA_TESTING_C0001: You must configure the "createSpy" option.`。
- `stubActions: false` 让 action 真的运行，同时仍然是 spy。想看到点击后的界面变化时用它。

**做法二：真实的 pinia。** 不用 `@pinia/testing`，自己 `createPinia()` 并用 `app.use` 装上。store 里的逻辑都是真的，更接近真实使用。第 16 章讲过，直接测 store 本身（不经过组件）时，每个测试前新建一个 pinia：

```ts
import { createPinia, setActivePinia } from 'pinia'

beforeEach(() => { setActivePinia(createPinia()) })       // 每个测试一个新 pinia，状态不串

it('add 累计总价，clear 清空', () => {
  const cart = useCart()
  cart.add({ id: 1, price: 10 })
  cart.add({ id: 2, price: 5 })
  expect(cart.total).toBe(15)
  cart.clear()
  expect(cart.items).toEqual([])
})
```

怎么选：

| 要测的 | 用什么 |
|---|---|
| store 自己的逻辑（action、getter） | 真实 pinia，直接测，不挂载组件 |
| 组件怎样把 store 的状态显示出来 | `createTestingPinia`（给 `initialState`）或真实 pinia |
| 组件点击后是否调用了某个 action | `createTestingPinia`，断言 spy |
| 组件加 store 的整条链路 | `createTestingPinia({ stubActions: false })` |

不管哪种，都要保证**测试之间不共享 store**：每个测试新建 pinia，不要在文件顶层建一个共用的。

<Exercise id="testCart" />

### 20.8 带 Router 的组件

组件里的 `RouterLink`、`useRoute()` 需要 router。做法同样有几种，按“你关心什么”选：

**关心导航的结果：用真实的 router 和内存 history。** 第 17 章讲过 `createMemoryHistory`，它不碰浏览器地址栏，正适合测试。

```ts
import { createRouter, createMemoryHistory } from 'vue-router'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<p>首页</p>' } },
    { path: '/cart', component: { template: '<p>购物车页</p>' } },
  ],
})
await router.push('/')
await router.isReady()                                    // 等初始导航完成

const wrapper = mount(CartBadge, { global: { plugins: [createTestingPinia({ createSpy: vi.fn }), router] } })
await wrapper.find('a').trigger('click')
await flushPromises()                                     // 导航是异步的
expect(router.currentRoute.value.path).toBe('/cart')
```

路由组件可以用只有一行模板的假组件，测试只关心“跳到了哪里”。

**不关心导航：stub 掉 `RouterLink`。** 这样不用建 router：

```ts
mount(CartBadge, {
  global: {
    plugins: [createTestingPinia({ createSpy: vi.fn })],
    stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } },
  },
})
```

如果只写 `stubs: { RouterLink: true }`，渲染出来的是不含内容的占位，链接文字会丢。需要断言链接文字或地址时，像上面那样给 stub 一个简单的模板。

**组件只读 `useRoute()`：mock 这个函数。**

```ts
vi.mock('vue-router', () => ({ useRoute: vi.fn() }))
vi.mocked(useRoute).mockReturnValue({ params: { id: '7' } } as any)
```

这样最省事，但整个 `vue-router` 模块都被替换，组件里别的导出（如 `RouterLink`）也没有了。只在组件只读路由参数时用。

::: pitfalls
不要在 `setupFiles` 里全局 stub `RouterLink`。这样需要真实 router 的测试里，链接也被换成了占位，找不到链接，也点不了。stub 放在需要它的测试里。
:::

### 20.9 端到端测试：少而关键

组件测试在模拟的 DOM 里运行，有些事它做不到：真实的排版和 CSS，浏览器的路由和历史记录，多页流程，打包后的应用。这些由端到端测试负责。

官方文档推荐 Playwright（也可以用 Cypress）。脚手架选了 Playwright 后会生成 `e2e/` 和 `playwright.config.ts`。第一次使用要运行 `npx playwright install` 下载浏览器。

```ts
// e2e/vue.spec.ts
import { test, expect } from '@playwright/test'

test('添加任务', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('任务标题').fill('写测试')
  await page.getByRole('button', { name: '添加' }).click()
  await expect(page.getByRole('listitem')).toHaveText('写测试')   // 自动重试，直到出现或超时
  await expect(page.getByLabel('任务标题')).toHaveValue('')
})
```

Playwright 的 `expect` 会自动重试，不需要手写等待。它的定位方式（`getByRole`、`getByLabel`）和 Testing Library 是同一个思路。

组件测试和端到端测试这样分工：

| | 组件测试 | 端到端测试 |
|---|---|---|
| 测什么 | 一个组件的各种分支：空输入、错误提示、边界值 | 一条关键流程的主路径：登录、下单、新建任务后刷新还在 |
| 数量 | 多 | 少，几条到十几条 |
| 后端 | 用替身 | 真实的，或一个固定数据的测试后端 |
| 失败时 | 定位到某个组件 | 要看录像和 trace 才知道 |

本课程自己的测试就是这样：`tests/site/` 里用 Playwright 打开构建好的站点，点击页面上的练习和实验台，确认整页在真实浏览器里工作。组件内部的纯逻辑则由 Vitest 单元测试负责。

### 20.10 常见的坏测试

| 坏测试 | 症状 | 改法 |
|---|---|---|
| 断言实现细节：读 `wrapper.vm.count`、按类名找元素 | 重构后大面积变红，而应用没有问题 | 只断言用户能看到的文字、发出的事件、对外部的调用 |
| 滥用快照：给整个组件的 HTML 存快照 | 任何改动都让快照变红，人们习惯性地更新快照，最后没人看 | 用具体的断言；快照只留给很小的、稳定的输出 |
| 测试之间共享状态：文件顶层创建 wrapper、store，或不恢复 mock 和计时器 | 单独跑通过，一起跑失败；换顺序结果不同 | 每个测试自己 `mount`，自己建 pinia；`afterEach` 里恢复 |
| 不等待更新 | 偶尔失败，或总是读到旧值 | 按 20.5 节的表选择要等的东西 |
| 没有断言，或断言太弱（只检查“发出过事件”，不检查载荷） | 永远绿，组件坏了也绿 | 做突变检验：改坏实现，看测试变不变红 |
| mock 太多：连被测组件的逻辑都 mock 了 | 测的是 mock 本身 | 只替换边界（请求、时间、路由），不替换被测对象 |

下面的实验台把同一个计数器的三种写法放在一起：一个断言实现细节，一个按用户行为，一个忘了等待。对三个版本各跑一遍：原版、行为不变的重构、有缺陷的版本。

<Lab id="demo-test-styles" title="实验台：三种测试写法，谁会误报，谁会漏报" note="三个版本和三个测试都在真实的 Vue 里运行">
<template #predict>
<Sc predict :a="1">

先猜：重构把组件的内部状态从 `count` 改成 `clicks`，类名也改了，页面上的文字和按钮完全不变。运行后，“断言实现细节”的测试 1 在重构后的版本上是什么结果？

<Opt>通过：组件行为没变</Opt>
<Opt>失败：这是误报，组件其实没有错</Opt>
<Opt>失败：这是正确的，重构应该让测试失败</Opt>

<template #explain>

解析：测试 1 读的是 `vm.count` 和 `.btn-add`，这两样重构后都不存在，所以失败。但组件的行为没有变，这是误报。第三项把“重构需要同步改测试”当成了正常现象。测试 2 按按钮文字和页面文字写，重构后仍然通过。测试 3 没有等待更新，所以在三个版本上都失败，包括完全正确的原版。打开实验台，点“运行”，对照表格里标“误报”和“漏报”的格子。

</template>
</Sc>
</template>

<TestStyles />
</Lab>

### 20.11 本地任务：在真实的 Vitest 里完成

页面练习用的是迷你工具。下面三个任务在真实的 Vitest 和 Vue Test Utils 里完成。先搭一个项目：

```bash
npm create vue@latest testing-lab -- --ts --router --pinia --vitest
cd testing-lab
npm install
npm i -D @pinia/testing @vitest/coverage-v8@$(node -p "require('vitest/package.json').version")
```

删掉脚手架自带的 `src/components/__tests__/HelloWorld.spec.ts`，再做任务。每个任务的验收都是 `npx vitest run` 的输出。

**任务 1：给 `TaskForm` 写测试，并用突变检验。**

1. 把 20.4 节的 `TaskForm.vue` 放到 `src/components/`。
2. 新建 `src/__tests__/TaskForm.spec.ts`，写三个测试：提交时发出 `add` 且标题去掉首尾空格；提交后输入框被清空；标题只有空格时不发出事件。
3. 运行 `npx vitest run`。验收：输出里有 `Tests  3 passed (3)`。
4. 依次做三次改坏，每次改完运行测试，再改回去：
   - 把 `title.value.trim()` 改成 `title.value`。验收：至少有一个测试失败。
   - 删掉 `title.value = ''` 那一行。验收：输出里有 `Tests  1 failed | 2 passed (3)`，失败的是清空输入框那个测试。
   - 删掉 `if (!text) return` 那一行。验收：失败的是空标题那个测试。
5. 运行 `npx vitest run --coverage`。验收：输出末尾有 `Coverage summary`，能在表里找到 `TaskForm.vue`。

**任务 2：用假定时器和 `vi.mock` 隔离时间与请求。**

1. 放入 20.5 节的 `SearchBox.vue`（`watch` 加 `setTimeout` 300 毫秒，发出 `search`），以及 20.6 节的 `src/api/tasks.ts` 和 `TaskList.vue`。
2. 为 `SearchBox` 写 20.5 节那样的测试。验收：`Tests  1 passed (1)`，而且用时远小于 300 毫秒。
3. 为 `TaskList` 写两个测试，用 `vi.mock('@/api/tasks')`：成功时显示两条任务，失败时显示 `role="alert"` 的错误。验收：全部通过。
4. 改坏检验：删掉 `SearchBox` 里的 `clearTimeout(timer)`。验收：防抖测试失败。再把 `300` 改成 `100`。验收：同一个测试失败。
5. 把 `TaskList` 测试里的 `await flushPromises()` 删掉。验收：成功的那个测试失败，信息里能看到页面上还是“加载中”。

**任务 3：带 Pinia 和 Router 的组件。**

1. 放入 20.7 节的 `src/stores/cart.ts` 和 20.8 节用到的 `CartBadge.vue`（显示 `{{ items.length }} 件，共 {{ total }} 元`，一个指向 `/cart` 的 `RouterLink`，一个调用 `cart.clear()` 的“清空”按钮）。
2. 直接测 store：`setActivePinia(createPinia())`，测 `add`、`total`、`clear`。验收：通过。
3. 用 `createTestingPinia` 加 `initialState` 测 `CartBadge`：显示 `2 件，共 50 元`；点“清空”后 `cart.clear` 被调用一次。验收：通过。
4. 用真实 router 加 `createMemoryHistory` 测：点链接后 `router.currentRoute.value.path` 是 `/cart`。验收：通过。
5. 把 `createTestingPinia` 换成 `createTestingPinia({ createSpy: vi.fn, stubActions: false })`，再测“点清空后页面显示 `0 件，共 0 元`”。验收：通过。然后把 `CartBadge` 里的 `storeToRefs(cart)` 改成直接解构 `const { items, total } = cart`，这个测试应当失败。

页面练习检验“能不能写出会失败的测试”和“会不会选对等待方式”；本地任务检验“真实的配置、mock 和路由是否搭得起来”。两者要分别做。

::: deep Vitest 的快照测试：什么时候可以用
快照测试把输出存进文件，下次对比。适合小而稳定、人能读懂的输出，例如一段格式化后的错误信息。不适合整个组件的 HTML：改一个样式类就全红，审查的人只会点“更新”。官方文档也说，只靠快照不能说明行为正确。

内联快照（`toMatchInlineSnapshot`）把期望值写在测试文件里，评审时看得见，比单独的快照文件更不容易被忽略。
:::

::: deep 为什么 `await trigger()` 够用，有时却不够
`trigger` 返回的是 Vue 的 `nextTick()`。它等的是更新队列的这一轮结束，所以 DOM 已经按当前的响应式数据更新过。

但一个组件在 `onMounted` 里 `await` 了一个请求，请求的结果在这一轮结束之后才写进 `ref`，它又会触发新的一轮更新。这时 `nextTick` 对应的那一轮早就过去了。`flushPromises` 等的是所有已经就绪的 Promise，包括这条链上的每一步，所以能等到。

结论：你等的是“DOM 更新”还是“某个异步结果”，决定用哪个。拿不准时，问自己“这次变化是同步触发的，还是要等一个 Promise”。
:::

::: pitfalls
1. 不要读 `wrapper.vm` 的内部状态来断言。原因：重构后行为没变，测试却红了。
2. 不要忘记 `await trigger()`、`await setValue()` 和 `await flushPromises()`。原因：不等待就读到旧的页面，测试时对时错。
3. 用了假定时器，要在 `afterEach` 里 `vi.useRealTimers()`。原因：假的计时器会留给后面的测试。
4. 不要在文件顶层创建共用的 wrapper 或 pinia。原因：测试之间会互相影响，换个运行顺序就失败。
5. 不要用覆盖率当质量指标。原因：没有断言的测试也能提高覆盖率。用突变检验确认测试能抓住错误。
6. 不要为了让测试通过，去改期望值迎合当前的输出。原因：这样的测试描述的是代码现在做了什么，不是它应该做什么。
:::

::: selfcheck
<Sc :a="1">

`TaskCard` 组件内部把状态 `done` 改名为 `finished`，页面上的文字、按钮和发出的事件都没变。哪种测试会因此无故变红？

<Opt>点击“完成”按钮，断言页面出现“已完成”字样</Opt>
<Opt>读取 `wrapper.vm.done`，断言它为 `true`</Opt>
<Opt>点击“完成”按钮，断言发出了 `change` 事件，载荷为 `true`</Opt>

<template #explain>

解析：第二项读取内部状态，内部改名就失败，这是误报。第一项和第三项只依赖用户看得到的输出和发出的事件，行为没变，它们就不会红。

</template>
</Sc>

<Sc :a="2">

组件在 `onMounted` 里 `await fetchTasks()`（已 mock 为立即返回）。测试写成下面这样，会读到什么？

```ts
const wrapper = mount(TaskList)
expect(wrapper.findAll('li')).toHaveLength(2)
```

<Opt>两个 `li`，因为 mock 立即返回</Opt>
<Opt>报错：`mount` 必须使用 `await`</Opt>
<Opt>零个 `li`，页面还在“加载中”，需要先 `await flushPromises()`</Opt>

<template #explain>

解析：`mount` 同步返回，这时 `onMounted` 里的 `await` 还没有完成，列表是空的。即使 mock 立即返回，结果也要等 Promise 完成后才写进页面。第一项忽略了 `await` 需要时间。第二项不对，`mount` 不返回 Promise。

</template>
</Sc>

<Sc :a="0">

用假定时器测防抖：输入 `a`，然后下面哪一步让测试看到 `search` 事件？

```ts
vi.useFakeTimers()
const wrapper = mount(SearchBox)           // 防抖 300 毫秒
await wrapper.find('input').setValue('a')
// ← 这里
expect(wrapper.emitted('search')).toEqual([['a']])
```

<Opt>`vi.advanceTimersByTime(300)`</Opt>
<Opt>`await nextTick()`</Opt>
<Opt>`await flushPromises()`</Opt>

<template #explain>

解析：假的计时器不会自己走，要用 `advanceTimersByTime` 拨过 300 毫秒，回调才执行。`nextTick` 等的是 DOM 更新，`flushPromises` 等的是 Promise，都不会让计时器前进。

</template>
</Sc>

<Sc :a="1">

下面的 `vi.mock` 写在 `import` 之后。它对前面的 `import { fetchTasks }` 有效吗？

```ts
import { fetchTasks } from '@/api/tasks'
import TaskList from '@/components/TaskList.vue'

vi.mock('@/api/tasks')
```

<Opt>无效：`import` 先执行，拿到的是真实模块</Opt>
<Opt>有效：Vitest 把 `vi.mock` 提升到文件最前面</Opt>
<Opt>有效，但必须同时传入工厂函数</Opt>

<template #explain>

解析：`vi.mock` 会被提升，先于 `import` 执行，所以所有 import 拿到的都是替身。不传工厂时，Vitest 自动把模块的每个导出换成 `vi.fn()`。

</template>
</Sc>

<Sc :a="2">

用 `createTestingPinia({ createSpy: vi.fn })` 挂载 `CartBadge`，点击“清空”按钮后，页面上的商品数量是什么？

<Opt>变成 0：`clear` 清空了 store</Opt>
<Opt>报错：`clear` 不能被调用</Opt>
<Opt>不变：action 默认被换成 spy，只记录调用，不运行</Opt>

<template #explain>

解析：`createTestingPinia` 默认 stub 所有 action，所以 `clear` 被记录但没有运行，数据不变。要让它真的运行，传 `stubActions: false`。

</template>
</Sc>

<Sc :a="0">

`setupFiles` 里全局 stub 了 `RouterLink`。一个用真实 router 的测试想点击页面上的链接，会怎样？

<Opt>找不到有内容的链接：`RouterLink` 被换成了不含内容的占位</Opt>
<Opt>正常点击，stub 对真实 router 不起作用</Opt>
<Opt>报错：router 和 stub 不能同时存在</Opt>

<template #explain>

解析：全局 stub 会替换所有测试里的 `RouterLink`，真实 router 的测试也不例外，渲染出的占位没有链接文字和地址。stub 要放在需要它的测试里。

</template>
</Sc>

<Sc :a="2">

一个测试只断言“表单提交后发出过一次 `add` 事件”，没有检查载荷。有人把组件改成不去掉标题的空格。这个测试会怎样？

<Opt>失败：载荷变了</Opt>
<Opt>失败：事件名变了</Opt>
<Opt>仍然通过：它没有检查载荷，抓不住这个缺陷</Opt>

<template #explain>

解析：断言太弱，只检查次数。故意改坏实现时它不变红，说明这个测试对这个缺陷没有保护。要检查载荷：`toEqual([['写周报']])`。

</template>
</Sc>

<Sc :a="1">

某个功能要验证：用户登录后新建任务，刷新页面任务仍在。放在哪一层最合适？

<Opt>组件测试：mount 登录页和任务页，手动切换 store</Opt>
<Opt>端到端测试：需要真实的路由、存储和刷新</Opt>
<Opt>单元测试：直接调用 store 的 action</Opt>

<template #explain>

解析：“刷新后仍在”依赖真实浏览器的页面刷新和存储，jsdom 里的组件测试模拟不了整条链路。这类跨页面的关键流程用端到端测试。登录页每个字段的校验分支，则放在组件测试里。

</template>
</Sc>

:::

::: summary
- 测公开的输入和输出：props、插槽、操作进去；渲染结果、事件、对外部的调用出来。不测内部状态和类名。
- 判断测试好坏：重构不该让它红，故意改坏必须让它红。
- 配置：Vitest 与 Vite 共用配置，`environment` 选 `jsdom` 或 `happy-dom`；开发用 `vitest`，CI 用 `vitest run`；覆盖率不是质量指标。
- 组件测试用 `mount`，按文字、标签、`data-testid` 找元素；`setValue`、`trigger` 要 `await`；用 `emitted` 断言事件。
- 等什么用什么：DOM 更新用 `await`，Promise 用 `flushPromises`，时间用假定时器。
- 隔离依赖：`vi.mock` 换模块，`vi.fn` 设返回值；请求层薄用 mock 函数，有逻辑用 MSW。
- 带 Pinia 用 `createTestingPinia` 或真实 pinia，带 Router 用内存 history，每个测试自己建环境。
- 端到端测试少而关键，用 Playwright 测主路径；分支放在组件测试里。
:::
