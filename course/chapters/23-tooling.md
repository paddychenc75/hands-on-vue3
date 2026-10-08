---
title: 工程化与测试
id: tooling
stage: 5
chapter: 23
desc: Vite、环境变量、scoped CSS、ESLint、部署、Vitest
---

<script setup>
import DevVsBuild from '../figures/23-tooling/DevVsBuild.vue'
import ScopedStyleAttribute from '../figures/23-tooling/ScopedStyleAttribute.vue'
import ScopedRewrite from '../labs/23-tooling/ScopedRewrite.vue'
import CssVars from '../labs/23-tooling/CssVars.vue'
</script>

# 工程化与测试

::: goals
<Goal checks="sc:3">说出 Vite 项目中每个文件的作用。</Goal>
<Goal checks="sc:0,sc:4">使用环境变量和开发代理。</Goal>
<Goal checks="sc:1">使用 scoped 样式、:deep() 和 CSS 中的 v-bind()。</Goal>
<Goal checks="sc:2,ex:testAwait,ex:fbTooling">为组件写测试：等待 DOM 更新后再断言，并写出能发现错误的断言。</Goal>

:::

::: rt
阅读主线约 18 分钟，深入内容约 3 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
工程化工具像**厨房的设备**：Vite 是灶台，ESLint 是食品安全检查员，测试是出菜前的试吃。菜谱（组件）写得再好，没有这些设备也开不了餐馆。
:::

::: terms
Vite
: 开发服务器和构建工具。

环境变量
: 按开发或生产环境改变的配置值。

scoped 样式
: 只作用于本组件元素的 CSS。

构建
: 把源代码打包为浏览器能直接运行的文件。

Vitest
: 运行单元测试和组件测试的工具。
:::

::: why
你修改了一个组件，然后手动刷新页面检查。另一个页面的功能被破坏了，但你没有检查那个页面。用户先发现了这个错误。

原因：编译、检查、测试和部署都靠手动完成。手动完成很慢，也容易遗漏。

本章的工具自动完成这些工作。Vite 编译和打包，ESLint 检查代码，Vitest 运行测试。
:::

### 23.1 创建项目

按下面的步骤创建项目：

1. 运行 `npm create vue@latest`。
2. 选择需要的功能：TypeScript、JSX、Router、Pinia、Vitest、端到端测试、ESLint 和 Prettier。
3. 进入项目目录，运行 `npm install`。
4. 运行 `npm run dev`，启动开发服务器。

Vite 有两种工作方式。开发时不打包。`npm run build` 时打包到 dist/。见下图。

<Figure caption="开发时，Vite 不打包，只编译浏览器请求的文件。构建时，Vite 把全部代码打包到 dist/。">
<DevVsBuild />
</Figure>

Vite 8 用 Rolldown 打包。Vite 7 及以前用 Rollup 打包。所以旧项目和旧文章中的配置写 `build.rollupOptions`，Vite 8 中对应的是 `build.rolldownOptions`。`npm create vue@latest` 新建的项目使用 Vite 8。

项目中的主要文件如下：

| 文件 | 作用 |
|---|---|
| `index.html` | 入口文件。它在项目根目录，不在 public 中。它用 `<script type="module" src="/src/main.ts">` 加载代码。 |
| `src/main.ts` | 创建应用，安装 Router 和 Pinia，然后挂载。 |
| `src/App.vue` | 根组件。 |
| `public/` | 原样复制的静态文件，例如 favicon.ico。 |
| `src/assets/` | 由 Vite 处理的资源。文件名中带有哈希值。 |
| `vite.config.ts` | Vite 配置：插件、路径别名、开发服务器。 |
| `.env` 文件 | 环境变量。 |

在 vite.config 中配置路径别名。之后用 `@/` 代替很长的相对路径：

```js
// vite.config.ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }   // import X from '@/components/X.vue'
  }
})
```

::: deep Vite 开发服务器为什么快
开发时，浏览器用原生 ES 模块请求每个文件。Vite 只编译被请求的文件。

1. 启动时，Vite 预构建 node_modules 中的依赖，把它们合并为少量文件。
2. 浏览器请求 `/src/App.vue` 时，Vite 用 @vitejs/plugin-vue 把它编译为 JavaScript。
3. 文件修改后，Vite 只重新编译这个文件，并通过 WebSocket 通知浏览器热更新。

只修改 .vue 文件的模板时，热更新只替换渲染函数。组件的状态保留。
:::

::: deep 自动导入
两个 Vite 插件可以省略 import 语句：

- **unplugin-auto-import**：自动导入 ref、watch 等 API。
- **unplugin-vue-components**：自动导入 `src/components` 中的组件和组件库的组件。

```js
// vite.config.ts
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],     // 这些包的 API 不用写 import
      dts: 'src/auto-imports.d.ts',               // 生成类型声明，编辑器才知道这些全局名
    }),
    Components({
      dts: 'src/components.d.ts',
      resolvers: [ElementPlusResolver()],         // <el-button> 自动导入组件和样式
    }),
  ],
})
```

| 优点 | 缺点 |
|---|---|
| 代码更短 | 阅读代码时，看不到名字从哪里来 |
| 组件库只打包使用的组件 | 两个组件同名时，可能导入错误的组件 |
| Nuxt 默认使用相同的方式 | 依赖生成的 .d.ts 文件。要把它们提交到 Git，或在类型检查前生成 |

团队成员多的项目，可以只自动导入组件库，自己的代码仍然写 import。
:::

### 23.2 配置编辑器和代码检查

编辑器扩展在你写代码时提示错误。ESLint 和 vue-tsc 在提交和构建前检查全部代码。按下面的步骤配置：

1. 在 VS Code 中安装 **Vue - Official** 扩展（以前叫 Volar）。它为 .vue 文件提供类型检查、自动补全和重构。WebStorm 内置了 Vue 支持，不需要安装。
2. 禁用 Vetur。Vetur 只支持 Vue 2，它和 Vue - Official 冲突。
3. 配置 ESLint。`eslint-plugin-vue` 检查 .vue 文件中的模板和脚本。Prettier 只负责格式。
4. 在编辑器中启用“保存时修复”。在提交前运行 `npm run lint`。
5. 在构建脚本和 CI 中运行 `vue-tsc --noEmit`。Vite 只删除类型，不检查类型。

```js
// eslint.config.js（flat config）
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default [
  ...pluginVue.configs['flat/recommended'],   // 例如：v-for 必须有 key，不要同时用 v-if 和 v-for
  skipFormatting                              // 关闭和 Prettier 冲突的格式规则
]
```

::: deep Vue DevTools
Vue DevTools 有浏览器扩展和 Vite 插件（`vite-plugin-vue-devtools`）两种形式。它有下面这些功能：

- **组件**：查看组件树。查看和修改 props、state 和计算属性。
- **时间线**：记录组件事件、性能数据和路由导航。
- **Pinia**：查看和修改每个 store 的 state。时间线中显示每个 action 和修改。
- **路由**：查看路由表和当前路由。

生产构建默认关闭 DevTools。
:::

### 23.3 配置开发代理和环境变量

前端和后端在不同的端口上运行时，浏览器会阻止跨域请求。开发时，用 `server.proxy` 把请求转发到后端：

```js
// vite.config.ts 中
server: {
  proxy: {
    '/api': {                                  // 开发时把 /api 请求转发到后端，避免跨域
      target: 'http://localhost:3000',
      changeOrigin: true,
      rewrite: p => p.replace(/^\/api/, '')
    }
  }
}
```

proxy 只在开发服务器中生效。生产环境由 nginx 等服务器转发请求。

开发和生产的接口地址常常不同。把这些值写到 `.env` 文件中。Vite 按模式加载它们。`npm run dev` 的模式是 development。`npm run build` 的模式是 production。

| 文件 | 加载时机 |
|---|---|
| `.env` | 所有模式 |
| `.env.local` | 所有模式。不提交到 git |
| `.env.production` | 只在 production 模式 |
| `.env.production.local` | 只在 production 模式。不提交到 git |

```js
# .env.production
VITE_API_BASE=https://api.example.com
DB_PASSWORD=secret              # 没有 VITE_ 前缀：客户端代码读不到

// 在代码中
import.meta.env.VITE_API_BASE   // 'https://api.example.com'（字符串）
import.meta.env.DB_PASSWORD     // undefined
import.meta.env.MODE            // 'production'
import.meta.env.DEV             // false
import.meta.env.BASE_URL        // vite.config 中的 base
```

只有 `VITE_` 开头的变量进入客户端代码。构建时，Vite 把它们直接替换为字符串。所以打包后的文件包含这些值。不要把密钥写入 VITE\_ 变量。

### 23.4 写组件的样式

`<style scoped>` 让样式只作用于当前组件。编译器给每个选择器加上组件的属性，例如 `[data-v-7ba5bd90]`。渲染时，Vue 给组件的元素加上这个属性。下图说明属性加在哪些元素上。

<Figure caption="编译器给选择器加上属性。父组件的属性只加到自己的元素和子组件的根元素上。">
<ScopedStyleAttribute />
</Figure>

scoped 样式不匹配子组件内部的元素，也不匹配插槽内容。用下面的写法改变作用范围：

| 写法 | 编译结果 | 用途 |
|---|---|---|
| `.a .b` | `.a .b[data-v-x]` | 普通的 scoped 样式 |
| `.a :deep(.b)` | `.a[data-v-x] .b` | 修改子组件内部的元素 |
| `:slotted(.b)` | `.b[data-v-x-s]` | 修改父组件传入的插槽内容 |
| `:global(.b)` | `.b` | 在 scoped 中写一条全局规则 |

<Lab id="demo-tool-scoped" title="实验台：scoped 样式的改写" note="选择器改写是简化版；data-v 属性由真实的 Vue 添加">
<template #predict>
<Sc predict :a="0">

先猜：Card 的 scoped 样式中有 .inner 规则。p.inner 写在子组件 Inner 的模板中。看“实际效果”中的 p.inner。它会变粗吗？

```vue
<!-- Inner.vue 的模板 -->
<div class="inner-root"><p class="inner">…</p></div>

<!-- Card.vue -->
<style scoped>
.inner { font-weight: bold; }
:deep(.inner) { text-decoration: underline; }
</style>
```

<Opt>不会。p.inner 没有 Card 的属性</Opt>
<Opt>会。scoped 样式作用于整个子组件</Opt>
<Opt>会。子组件继承父组件的 data-v</Opt>

<template #explain>

解析：scoped 把 .inner 改写为 .inner[data-v-7ba5bd90]。Card 的属性只加到子组件的根元素上，不加到内部的 p 上。所以 .inner 不匹配，p.inner 不变粗。:deep() 把属性选择器移到外层，所以下划线生效。第二项以为 scoped 样式作用于子组件的全部元素。第三项以为属性会传给根元素的所有后代。打开实验台，看“实际效果”中的 p.inner 和下方的 DOM。

</template>
</Sc>
</template>

<ScopedRewrite />
</Lab>

**场景：卡片组件统一插槽内容的样式。**TaskCard 用插槽接收父组件传入的标题。插槽内容属于父组件，普通的 scoped 规则不匹配它。在 TaskCard 中用 :slotted() 设置样式。

```vue
<!-- TaskCard.vue -->
<template>
  <div class="card"><slot /></div>
</template>

<style scoped>
.card { padding: 12px; }
:slotted(.task-title) { font-weight: 600; }   /* 父组件传入的 .task-title */
</style>
```

**场景：弹窗打开时禁止页面滚动。**弹窗打开时，给 body 加上 modal-open 类。body 不在组件中，scoped 规则匹配不到它。用 :global() 写这一条全局规则。

```vue
<script setup>
watch(() => props.open, v => document.body.classList.toggle('modal-open', v))
</script>

<style scoped>
.dialog { position: fixed; inset: 0; }
:global(body.modal-open) { overflow: hidden; }
</style>
```

不要用 :global() 写大量全局样式。把全局样式放到 main.ts 引入的 CSS 文件中。:slotted() 只在含有 \<slot> 的组件中生效。

在 CSS 中，`v-bind()` 读取组件中的数据。编译器把它改为 CSS 变量。运行时，Vue 用 `useCssVars` 把变量的值写到组件的根元素上。

```vue
<script setup>
const color = ref('red')
</script>

<style scoped>
.title { color: v-bind(color); }
/* 编译结果：.title[data-v-7ba5bd90] { color: var(--7ba5bd90-color); } */
/* 根元素上：style="--7ba5bd90-color: red;"  color 改变时，Vue 更新这个变量 */
</style>
```

<Lab id="demo-tool-cssvars" title="实验台：CSS 中的 v-bind()" note="真实的 useCssVars，观察根元素的 style 属性">
<template #predict>
<Sc predict :a="1">

先猜：样式中写 font-size: v-bind(size + 'px')。拖动 size 滑块。Vue 修改了什么？

```vue
<style scoped>
.title {
  color: v-bind(color);
  font-size: v-bind(size + 'px');
}
</style>
```

<Opt>重新生成 \<style> 中的 .title 规则</Opt>
<Opt>根元素 style 中的 CSS 变量</Opt>
<Opt>\<p> 元素的 style.fontSize</Opt>

<template #explain>

解析：编译器把 v-bind() 改写为 var(--7ba5bd90-size)。运行时，useCssVars 只把变量的值写到组件根元素的 style 上。样式规则不变，\<p> 也没有 style 属性。所以修改的开销很小。打开实验台，拖动 size 滑块，看根元素的 style 属性。

</template>
</Sc>
</template>

<CssVars />
</Lab>

`<style module>` 是另一种隔离方式。编译器把类名改为唯一的名字，并通过 `$style` 提供：

```vue
<template>
  <p :class="$style.red">红色文字</p>      <!-- 渲染为 class="_red_1x2y3" -->
</template>

<style module>
.red { color: red; }
</style>

// 在 setup 中读取：const style = useCssModule()
```

::: deep scoped 的属性怎样加到元素上
1. 编译器为每个组件生成一个 id，例如 `data-v-7ba5bd90`，保存到组件的 `__scopeId` 选项中。
2. 编译器在每个选择器的最后一部分加上 `[data-v-7ba5bd90]`。模板编译结果中没有这个属性。
3. 渲染器创建元素时，读取当前组件的 \_\_scopeId，并调用 `setAttribute`。
4. 子组件的根元素也得到父组件的属性。子组件内部的元素没有。所以父组件的 scoped 样式只能影响子组件的根元素。

23.4 节表格中的编译结果来自 `@vue/compiler-sfc` 3.5 的真实输出。
:::

### 23.5 构建和部署

运行 `npm run build`。Vite 把结果输出到 `dist/`。按下面的步骤部署：

1. 应用不在域名根路径时，设置 vite.config 的 `base`，例如 `'/admin/'`。
2. 创建路由时，把 `import.meta.env.BASE_URL` 传给 `createWebHistory()`。
3. 把 dist 中的文件上传到服务器。
4. 配置服务器：找不到文件时返回 index.html。

```js
# nginx
location /admin/ {
  try_files $uri $uri/ /admin/index.html;   # 刷新 /admin/user/1 时返回 index.html，由 Router 处理路径
}
location /admin/assets/ {
  expires 1y;                               # 文件名带哈希值，可以长期缓存
}
```

### 23.6 测试组件

测试分为三层：

| 层 | 工具 | 测试对象 |
|---|---|---|
| 单元测试 | Vitest | 组合式函数、store、工具函数 |
| 组件测试 | Vitest + `@vue/test-utils` | 组件的渲染结果、事件和 props |
| 端到端测试 | Playwright | 在真实浏览器中运行的完整流程 |

组件测试用 `mount` 渲染组件，用 `trigger` 触发事件，然后检查文字和发出的事件：

```js
// Counter.spec.js
import { mount } from '@vue/test-utils'
import Counter from './Counter.vue'

test('点击后数字加 1，并发出 change 事件', async () => {
  const wrapper = mount(Counter, { props: { start: 5 } })
  expect(wrapper.text()).toContain('5')
  await wrapper.find('button').trigger('click')     // await：等待 DOM 更新
  expect(wrapper.text()).toContain('6')
  expect(wrapper.emitted('change')[0]).toEqual([6])
})
```

trigger 返回 Promise。先 await，再检查 DOM。原因：Vue 在下一次更新时才修改 DOM。

**场景：测试新建任务的表单。**用 setValue 填写输入框。它触发 input 事件并等待 DOM 更新。然后提交表单，检查发出的事件。

```js
test('提交后发出 add 事件', async () => {
  const wrapper = mount(TaskForm)
  await wrapper.find('input').setValue('写周报')
  await wrapper.find('form').trigger('submit')
  expect(wrapper.emitted('add')[0]).toEqual(['写周报'])
})
```

**场景：组件挂载后请求任务列表。**await trigger 只等待 DOM 更新，不等待请求。先用 flushPromises 等待所有已完成的 Promise，再检查列表。不要用 setTimeout 等待，它让测试变慢，还会随机失败。

```js
import { mount, flushPromises } from '@vue/test-utils'
vi.spyOn(api, 'getTasks').mockResolvedValue([{ id: 1, title: 'A' }, { id: 2, title: 'B' }])

test('显示两条任务', async () => {
  const wrapper = mount(TaskList)
  await flushPromises()
  expect(wrapper.findAll('li')).toHaveLength(2)
})
```

**场景：跳过很重的子组件。**看板页面包含图表组件。测试只关心任务列表。用 global.stubs 把图表换为空的占位组件。

```js
const wrapper = mount(BoardPage, {
  global: {
    stubs: { TaskChart: true },      // 渲染为 <task-chart-stub>
    plugins: [createTestingPinia({ createSpy: vi.fn })]
  }
})
expect(wrapper.findComponent({ name: 'TaskChart' }).exists()).toBe(true)
```

<Exercise id="testAwait" />

<Exercise id="fbTooling" />

### 23.7 测试组合式函数、store 和完整流程

没有使用生命周期钩子或 inject 的组合式函数，可以直接调用并测试。使用了它们时，要在组件中运行。写一个辅助函数：

```js
// test-utils.js
import { createApp } from 'vue'
export function withSetup(composable) {
  let result
  const app = createApp({ setup() { result = composable(); return () => {} } })
  app.mount(document.createElement('div'))
  return [result, app]                     // 测试结束时调用 app.unmount()
}

// 第 9 章的 useMouse(target)：在 onMounted 中读取 target.value，监听元素的 pointermove
test('useMouse', () => {
  const el = document.createElement('div')
  document.body.append(el)
  const [{ x }, app] = withSetup(() => useMouse(ref(el)))   // 传入一个保存元素的 ref
  el.dispatchEvent(new PointerEvent('pointermove', { clientX: 10 }))
  expect(x.value).toBe(10)          // jsdom 中 getBoundingClientRect() 的 left 是 0
  app.unmount()                     // 卸载时删除监听
  el.dispatchEvent(new PointerEvent('pointermove', { clientX: 30 }))
  expect(x.value).toBe(10)          // 不再变化
})
```

注意：测试要按组合式函数的签名调用它。useMouse 需要一个 ref 参数，并且监听的是元素上的 pointermove，不是 window 上的 mousemove。不传参数时，onMounted 中读取 `target.value` 抛出 TypeError。较旧的 jsdom 没有 PointerEvent，这时写 `new MouseEvent('pointermove', …)`。

测试 Pinia 时，有两种方式。测试 store 本身时，每个测试使用新的 pinia。测试使用 store 的组件时，用 createTestingPinia：

```js
// 1. 测试 store 本身：每个测试使用新的 pinia
import { setActivePinia, createPinia } from 'pinia'
beforeEach(() => setActivePinia(createPinia()))
test('add', () => {
  const cart = useCart()
  cart.add({ id: 1, price: 10 })
  expect(cart.total).toBe(10)
})

// 2. 测试使用 store 的组件：createTestingPinia
import { createTestingPinia } from '@pinia/testing'
import { vi } from 'vitest'
const wrapper = mount(CartButton, {
  global: { plugins: [createTestingPinia({
    createSpy: vi.fn,                        // Vitest 中传入。没有全局的 jest 或 vi 时，不传会报错
    initialState: { cart: { items: [] } }
  })] }
})
const cart = useCart()                       // action 默认被替换为 spy，不真正运行
await wrapper.find('button').trigger('click')
expect(cart.add).toHaveBeenCalledTimes(1)
```

端到端测试用 Playwright 在真实浏览器中运行完整的流程：

```js
// e2e/todo.spec.ts（Playwright）
import { test, expect } from '@playwright/test'

test('添加任务', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('输入任务').fill('写测试')
  await page.getByRole('button', { name: '添加' }).click()
  await expect(page.getByText('写测试')).toBeVisible()   // 自动等待，直到元素出现
})
```

::: pitfalls
1. 不要把密钥写入 `VITE_` 开头的变量。原因：它们会出现在打包后的文件中，任何用户都能读到。
2. 不要用 `process.env` 读取客户端变量。使用 `import.meta.env`。原因：浏览器中没有 process。Vite 只在 import.meta.env 中提供变量。
3. 使用 history 模式部署时，配置 try_files。否则刷新页面时显示 404。
4. 不要用 scoped 样式修改子组件的内部元素。使用 :deep()。原因：scoped 选择器只匹配带本组件属性的元素。子组件的内部元素没有这个属性。
5. 在 Vitest 中使用 createTestingPinia 时，传入 `createSpy: vi.fn`。原因：action 要替换为 vi.fn。没有开启 Vitest 的 globals 时，不传它会报错。
6. trigger 和 setValue 返回 Promise。先 await，再检查 DOM。原因：DOM 在下一次更新后才改变。
:::

::: selfcheck
<Sc :a="1">

`.env` 文件如下。客户端代码中 `import.meta.env.API_KEY` 是什么？

```js
VITE_API=/api
API_KEY=abc
```

<Opt>'abc'</Opt>
<Opt>undefined</Opt>
<Opt>构建报错</Opt>

<template #explain>

解析：只有 VITE\_ 开头的变量进入客户端代码。API_KEY 没有这个前缀，所以是 undefined。

</template>
</Sc>

<Sc :a="2">

父组件有下面的 scoped 样式。子组件内部（不是根元素）的 `<p>` 会变红吗？

```vue
<style scoped>
.card p { color: red; }
</style>
```

<Opt>会</Opt>
<Opt>只在开发模式中会</Opt>
<Opt>不会。它没有父组件的 data-v 属性</Opt>

<template #explain>

解析：编译结果是 `.card p[data-v-p]`。子组件内部的元素只有子组件的属性。改为 `.card :deep(p)`。

</template>
</Sc>

<Sc :a="0">

下面的测试失败。原因是什么？

```js
const wrapper = mount(Counter)
wrapper.find('button').trigger('click')
expect(wrapper.text()).toContain('1')
```

<Opt>没有 await trigger()。DOM 还没有更新</Opt>
<Opt>find 找不到 button</Opt>
<Opt>mount 必须使用 await</Opt>

<template #explain>

解析：Vue 异步更新 DOM。trigger 返回 Promise。先 `await`，再检查文字。

</template>
</Sc>

<Sc :a="2">

logo.png 要在构建后使用带哈希的文件名，这样浏览器可以长期缓存它。文件应该放在哪里？

<Opt>public/，用 /logo.png 引用</Opt>
<Opt>dist/，在构建前手动放入</Opt>
<Opt>src/assets/，在代码中 import</Opt>

<template #explain>

解析：src/assets/ 中的文件由 Vite 处理，文件名中加入哈希值。内容改变时文件名也改变，所以可以长期缓存。public/ 中的文件原样复制，文件名不变。dist/ 是构建输出目录，每次构建都被清空。

</template>
</Sc>

<Sc :a="2">

`vite.config.ts` 中配置了 `server.proxy`，把 /api 转发到后端。开发时正常。把 dist/ 部署到 nginx 后，/api 请求返回 404。原因是什么？

<Opt>构建时没有设置 changeOrigin</Opt>
<Opt>环境变量缺少 VITE\_ 前缀</Opt>
<Opt>proxy 只在开发服务器中生效</Opt>

<template #explain>

解析：proxy 是 Vite 开发服务器的功能。构建结果是静态文件，不包含开发服务器。所以生产环境要在 nginx 中配置转发。changeOrigin 只修改开发时转发请求的 Host 头。VITE\_ 前缀决定环境变量是否暴露给客户端代码，和请求转发无关。

</template>
</Sc>

<Sc :a="1">

回顾（第 21 章）：子组件写 `defineProps<{ size?: 'sm' | 'lg' }>()`。父组件传 `size="xl"`。运行 npm run dev 时，会发生什么？

<Opt>Vite 编译失败，显示类型错误</Opt>
<Opt>页面正常运行，控制台没有警告</Opt>
<Opt>控制台显示 prop 校验失败的警告</Opt>

<template #explain>

解析：第 21 章：编译器把这个类型转换为 `{ type: String, required: false }`。'xl' 是字符串，所以运行时检查通过，没有警告。Vite 只删除类型，不做类型检查，所以编译不会失败。这个错误只有 vue-tsc 或编辑器能发现。所以构建脚本中要运行 vue-tsc。

</template>
</Sc>

:::

::: summary
- index.html 是入口。vite.config 配置插件和路径别名。
- Vue - Official、ESLint 和 vue-tsc 在构建前发现错误。
- server.proxy 只在开发时转发请求。只有 VITE\_ 开头的环境变量进入客户端。
- scoped 用 data-v 属性隔离样式。:deep()、:slotted() 和 :global() 改变作用范围。v-bind() 把数据写成 CSS 变量。
- history 模式需要服务器返回 index.html。
- 组件测试用 mount、trigger、setValue 和 flushPromises。组合式函数、store 和完整流程各有测试方法。
:::
