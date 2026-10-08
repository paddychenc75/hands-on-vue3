---
title: 工程化
id: tooling
stage: 3
chapter: 15
desc: Vite、类型检查与代码检查、环境变量、样式、部署、组件库、前端安全、CI
---

<script setup>
import DevVsBuild from '../figures/15-tooling/DevVsBuild.vue'
import ScopedStyleAttribute from '../figures/15-tooling/ScopedStyleAttribute.vue'
import ScopedRewrite from '../labs/15-tooling/ScopedRewrite.vue'
import CssVars from '../labs/15-tooling/CssVars.vue'
</script>

# 工程化

::: goals
<Goal checks="sc:3">说出 Vite 项目中每个文件的作用。</Goal>
<Goal checks="sc:0,sc:4">使用环境变量和开发代理。</Goal>
<Goal checks="sc:1">使用 scoped 样式、:deep() 和 CSS 中的 v-bind()。</Goal>
<Goal checks="sc:2,sc:6">在脚手架项目里选对类型检查的命令，并把检查放进 CI。</Goal>
<Goal checks="sc:7,sc:8">判断部署时 base 和回退路由怎么配，选择并接入现成的组件库。</Goal>
<Goal checks="sc:9">列出前端安全的几条底线：v-html、依赖、环境变量。</Goal>

:::

::: rt
阅读主线约 20 分钟，深入内容约 6 分钟（可选）。另外留时间做实验台、自测和本地任务。
:::

::: analogy
工程化工具像**厨房的设备**：Vite 是灶台，ESLint 是食品安全检查员，部署是把菜送到餐桌。菜谱（组件）写得再好，没有这些设备也开不了餐馆。
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
:::

::: why
你修改了一个组件，然后手动刷新页面检查。另一个页面的功能被破坏了，但你没有检查那个页面。用户先发现了这个错误。

原因：编译、检查和部署都靠手动完成。手动完成很慢，也容易遗漏。

本章的工具自动完成这些工作。Vite 编译和打包，`vue-tsc` 和 ESLint 检查代码，CI 在合并前把它们全部跑一遍。测试是另一个大话题，放在第 20 章。
:::

### 15.1 创建项目

按下面的步骤创建项目：

1. 运行 `npm create vue@latest`。
2. 选择需要的功能：TypeScript、JSX、Router、Pinia、Vitest、端到端测试、ESLint 和 Prettier。Router、Pinia 和测试分别在第 17、16、20 章讲。
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
| `src/main.ts` | 创建应用，安装 Router 和 Pinia（选了它们时），然后挂载。 |
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

### 15.2 配置编辑器和代码检查

编辑器扩展在你写代码时提示错误。ESLint 和 `vue-tsc` 在提交和构建前检查全部代码。按下面的步骤配置：

1. 在 VS Code 中安装 **Vue - Official** 扩展（以前叫 Volar）。它为 .vue 文件提供类型检查、自动补全和重构。WebStorm 内置了 Vue 支持，不需要安装。
2. 禁用 Vetur。Vetur 只支持 Vue 2，它和 Vue - Official 冲突。
3. 配置 ESLint。`eslint-plugin-vue` 检查 .vue 文件中的模板和脚本。Prettier 只负责格式。
4. 在编辑器中启用“保存时修复”。在提交前运行 `npm run lint`。
5. 在构建脚本和 CI 中运行 `npm run type-check`。Vite 只删除类型，不检查类型。

```js
// eslint.config.js（flat config）
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default [
  ...pluginVue.configs['flat/recommended'],   // 例如：v-for 必须有 key，不要同时用 v-if 和 v-for
  skipFormatting                              // 关闭和 Prettier 冲突的格式规则
]
```

**类型检查用哪条命令。**`npm create vue@latest` 选了 TypeScript 后，`package.json` 里有 `"type-check": "vue-tsc --build"`，`build` 脚本会并行运行它。在这个项目根目录运行 `npx vue-tsc --noEmit`，**不检查任何文件，也不报错，退出码是 0**：根 `tsconfig.json` 是 `"files": []` 加 `references`，没有文件可检查。在新建的项目里故意写一行 `export const bad: number = 'x'`：`vue-tsc --noEmit` 退出码 0，`vue-tsc --build` 报 `TS2322` 并退出码 2。

| 项目 | 命令 |
|---|---|
| 脚手架项目（根配置只有 `references`） | `npm run type-check`，即 `vue-tsc --build` |
| 只想检查浏览器代码 | `vue-tsc --noEmit -p tsconfig.app.json` |
| 只有一个 `tsconfig.json` 的小项目 | `vue-tsc --noEmit` |

这些配置各自检查什么，14.1 节有详细说明。

::: deep Vue DevTools
Vue DevTools 有浏览器扩展和 Vite 插件（`vite-plugin-vue-devtools`）两种形式。它有下面这些功能：

- **组件**：查看组件树。查看和修改 props、state 和计算属性。
- **时间线**：记录组件事件、性能数据和路由导航。
- **Pinia**：查看和修改每个 store 的 state。时间线中显示每个 action 和修改。
- **路由**：查看路由表和当前路由。

生产构建默认关闭 DevTools。
:::

### 15.3 配置开发代理和环境变量

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

只有 `VITE_` 开头的变量进入客户端代码。构建时，Vite 把它们直接替换为字符串。所以打包后的文件包含这些值。不要把密钥写入 VITE\_ 变量（15.7 节）。

**给环境变量加类型。**默认的 `import.meta.env.VITE_API_BASE` 是 `any`。在 `env.d.ts` 里声明后，它的类型是 `string`，编辑器会补全，把它赋给 `number` 变量会报 `TS2322`：

```ts
// env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

注意：写错的名字（`VITE_API_BAES`）仍然是 `any`，不会报错。类型只固定了你声明过的变量。

**自定义模式。**除了 development 和 production，还可以有 staging 这样的模式：`vite build --mode staging` 会额外加载 `.env.staging`，此时 `import.meta.env.MODE` 是 `'staging'`。模式只决定读哪些 `.env` 文件，代码压缩等构建行为仍按 production 处理。

### 15.4 写组件的样式

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

15.4 节表格中的编译结果来自 `@vue/compiler-sfc` 3.5 的真实输出。
:::

### 15.5 构建和部署

运行 `npm run build`。Vite 把结果输出到 `dist/`（脚手架的 `build` 会同时运行 `type-check`）。`dist/` 里只有静态文件：HTML、JS、CSS 和图片。所以任何能提供静态文件的地方都能部署它：Nginx、对象存储加 CDN、Netlify、Vercel 之类的静态托管。

上传之前，在本机运行 `npm run preview`，用构建结果启动一个预览服务器，确认它和开发时一样工作。

部署时有三件事要对：

**1. 路径前缀（base）。**应用不在域名根路径时，设置 vite.config 的 `base`，例如 `'/admin/'`。构建后所有资源地址都带上这个前缀：`<script src="/admin/assets/index-xxxx.js">`。使用路由时，把 `import.meta.env.BASE_URL` 传给 `createWebHistory()`（第 17 章）。

**2. 回退路由。**用 history 模式的路由（第 17 章）时，地址 `/admin/about` 是前端路由的路径，服务器上没有这个文件。用户刷新或直接打开这个地址，服务器返回 404。要让服务器在“找不到文件”时返回 `index.html`，由路由接手：

```js
# nginx
location /admin/ {
  try_files $uri $uri/ /admin/index.html;   # 先找真实文件，找不到就返回 index.html
}
location /admin/assets/ {
  expires 1y;                               # 文件名带哈希值，可以长期缓存
}
```

托管平台一般有对应的设置项。例如 Netlify 用 `_redirects` 文件写一行 `/*  /index.html  200`。配不了回退规则的环境，改用 hash 模式的路由，它的地址里有 `#`，服务器只看到 `/`。

回退规则有一个副作用：任何不存在的地址都会返回 `index.html`，包括写错的 JS 文件地址。`vite preview` 就是这样：请求 `/admin/nonexist.js` 返回 200，内容类型是 `text/html`。浏览器要的是脚本，拿到的是网页，报错信息容易让人摸不着头脑。部署后页面白屏时，先看网络面板里的 JS 请求返回的是什么。

**3. 缓存。**`assets/` 里的文件名带哈希值，内容变了文件名就变，可以缓存一年。`index.html` 不能这样：它引用着带哈希的文件，缓存了它，用户就拿不到新版本。给 `index.html` 设 `Cache-Control: no-cache`，每次向服务器确认是否有更新。

上线前检查：

1. CI 里 `npm run build` 通过（15.8 节）。
2. 本机 `npm run preview` 打开主要页面，并在子路径页面上刷新一次。
3. `base` 和服务器上的子路径一致。
4. 打包用的是生产环境的变量值（15.3 节）。
5. 浏览器控制台和网络面板没有 404。

### 15.6 使用现成的组件库

做后台项目时，表格、对话框、日期选择这类组件自己写又慢又容易漏掉键盘操作和无障碍。更现实的做法是用现成的组件库。本节只讲怎样选、怎样接入，不讲具体某个库的组件。

**怎样选。**对候选的库逐项问下面的问题：

| 问题 | 为什么重要 |
|---|---|
| 支持 Vue 3 和 TypeScript 吗？最近有发布、问题有人回应吗？ | 库停止维护，你的项目就被它拖住 |
| 能按需引入吗？ | 决定打包体积 |
| 主题怎么改：CSS 变量、Sass 变量，还是配置对象？ | 公司的设计规范总会和默认样式不同 |
| 键盘操作和 ARIA 属性做得怎样？ | 这是自己写最容易漏掉的部分 |
| 组件够用吗？有没有你需要的复杂组件（树、虚拟滚动表格）？ | 缺一个就要自己补，风格还会不一致 |
| 支持 SSR（Nuxt）吗？许可证允许你的用途吗？ | 后期换库代价很高 |

没有“最好”的库，只有“最适合这个项目”的库。后台管理类项目可以选组件齐全的库。设计规范特别强的产品，可以选只提供行为和无障碍、不带样式的“无样式（headless）”库，样式自己写。

**怎样接入。**

1. **按需引入。**只在用到的地方 `import` 组件。完整引入（`app.use(整个库)`）最简单，但包含所有组件，体积最大。用 `unplugin-vue-components` 加库提供的 resolver，模板里直接写组件名，插件自动导入（见 15.1 节的“自动导入”）。有些库的样式要另外引入，看库的文档。
2. **用变量改主题。**优先用库提供的 CSS 变量或主题配置。尽量不用 `:deep()`（15.4 节）去覆盖库内部的类名：库升级时内部结构一变，覆盖就失效。
3. **在边界包一层。**项目里不要到处直接用库的组件，而是在 `components/base/` 下写自己的 `BaseButton`、`BaseDialog`，里面再用库的组件，业务代码只用你自己的这一层。好处：换库或升大版本时只改这一层；公司统一的默认配置（尺寸、文案）也集中在这里。不要给每个组件都包一层，只包常用的、你有定制需求的那几个。
4. **注意和自己的样式共存。**全局样式重置、`z-index` 的层级、库内置的语言文案，是最常见的冲突来源。

做一个自己的组件库是另一件事，见第 41 章。

### 15.7 前端安全的几条底线

前端代码运行在用户的浏览器里，别人能读到它。下面几条是最低要求：

**1. `v-html` 只用于可信内容。**`{{ }}` 和属性绑定会转义 HTML，`v-html` 不会。用户提交的评论、昵称放进 `v-html`，别人就能让你的页面运行他的脚本（XSS）。必须显示用户提供的 HTML 时，先用 DOMPurify 这类库清洗。绑定用户提供的链接前，检查它的协议，防止 `javascript:`。不要把用户输入当作组件模板去编译。详见 2.6 节。

**2. 环境变量里不放密钥。**`VITE_` 开头的变量会被替换进打包后的文件（15.3 节），任何人打开开发者工具都能读到。密钥、数据库密码放在服务端。前端能放的只有本来就公开的值，例如公开的接口地址。

**3. 依赖也是你的代码。**每个依赖都会进入你的项目：

- 提交 lockfile（`package-lock.json`），CI 里用 `npm ci` 按它安装，保证每次装的版本一样。
- 定期运行 `npm audit --omit=dev`，只看会进入线上包的依赖。开发工具的漏洞风险低得多。
- 开启 Dependabot 这类自动更新工具，小步升级比攒几年再升容易得多。
- 加新依赖前看一眼：维护者是谁、最近有没有更新、下载量如何。

**4. 令牌的存放。**放在 `localStorage` 的登录令牌，能被页面上任何一段脚本读到，一旦有 XSS 就泄露。放在 `HttpOnly` 的 cookie 里，脚本读不到。具体选哪种，取决于后端怎样设计登录。

服务端还可以返回 `Content-Security-Policy` 响应头，限制页面能加载哪些脚本，作为 XSS 的第二道防线。

### 15.8 提交前和合并前跑什么

前面各节的检查，在 CI（持续集成：每次提交或合并请求时，服务器自动运行一组命令）里按下面的顺序运行，任何一条失败就不合并：

```bash
npm ci                    # 按 lockfile 安装依赖
npm run lint              # 代码风格和常见错误（15.2 节）
npm run type-check        # vue-tsc --build（15.2 节）
npx vitest run            # 单元测试和组件测试，运行一次就退出（第 20 章）
npm run build             # 构建（15.5 节）
```

把便宜、快的放在前面，出错能更早知道。

测试分三层：单元测试检查函数，组件测试检查组件在模拟浏览器里的行为，端到端测试在真实浏览器里走完整流程。测什么、不测什么，怎样等待异步更新，怎样 mock 请求，怎样测带 Pinia 和 Router 的组件，都在第 20 章。

### 15.9 本地任务：在脚手架项目里验证本章的结论

1. 运行 `npm create vue@latest my-app -- --ts --router --pinia --vitest`，进入目录，`npm install`。
2. **类型检查。**在 `src/stores/counter.ts` 末尾加一行 `export const bad: number = 'x'`。分别运行 `npx vue-tsc --noEmit` 和 `npm run type-check`，各查看退出码（`echo $?`）。验收：前者退出码是 0 且没有输出，后者输出 `error TS2322: Type 'string' is not assignable to type 'number'` 并且退出码非 0。删掉那一行。
3. **环境变量。**新建 `.env`，写入 `VITE_API_BASE=https://api.example.com` 和 `DB_PASSWORD=secret`；新建 `.env.staging`，写入 `VITE_API_BASE=https://staging.example.com`。在 `src/main.ts` 末尾加 `console.log(import.meta.env.VITE_API_BASE, import.meta.env.DB_PASSWORD)`。运行 `npx vite build --mode staging`。验收：`grep -o "staging.example.com" dist/assets/index-*.js` 有输出，`grep -c secret dist/assets/*.js` 每个文件都是 0。
4. **base 和回退。**运行 `npx vite build --base=/admin/`，再 `npx vite preview --base=/admin/`。用 `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4173/admin/about` 请求。验收：`/admin/about` 返回 200（回退到 `index.html`），`/about` 返回 404。打开 `dist/index.html`，脚本地址以 `/admin/assets/` 开头。
5. **依赖。**运行 `npm audit --omit=dev`，说出输出表示什么。

页面上的自测检验判断，本地任务检验命令是否真的按这样的结果输出。

::: pitfalls
1. 不要把密钥写入 `VITE_` 开头的变量。原因：它们会出现在打包后的文件中，任何用户都能读到。
2. 不要用 `process.env` 读取客户端变量。使用 `import.meta.env`。原因：浏览器中没有 process。Vite 只在 import.meta.env 中提供变量。
3. 使用 history 模式部署时，配置回退到 `index.html`。否则刷新页面时显示 404。
4. 不要用 scoped 样式修改子组件的内部元素。使用 :deep()。原因：scoped 选择器只匹配带本组件属性的元素。子组件的内部元素没有这个属性。
5. 在脚手架项目里不要用 `vue-tsc --noEmit` 检查类型。原因：根配置没有文件，命令静默通过。用 `npm run type-check`。
6. 不要把 `index.html` 设成长期缓存。原因：用户会一直拿到引用旧文件的页面。
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

用 `npm create vue@latest` 建了 TypeScript 项目。有人在 CI 里写 `npx vue-tsc --noEmit`，一直是绿色的。组件里明明有类型错误。原因是什么？

<Opt>根 `tsconfig.json` 是 `"files": []` 加 `references`，这条命令没有检查任何文件</Opt>
<Opt>`vue-tsc --noEmit` 只检查 `.ts` 文件，不检查 `.vue` 文件</Opt>
<Opt>CI 里没有安装 TypeScript</Opt>

<template #explain>

解析：脚手架的根配置只引用三个子配置，自己没有文件。`--noEmit` 不跟随引用，所以没有检查任何文件，退出码是 0。要用 `vue-tsc --build`（`npm run type-check`）。`vue-tsc` 能检查 `.vue` 文件，第二项说反了。第三项不对：命令能运行，只是没有文件可检查。

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

回顾（第 14 章）：子组件写 `defineProps<{ size?: 'sm' | 'lg' }>()`。父组件传 `size="xl"`。运行 npm run dev 时，会发生什么？

<Opt>Vite 编译失败，显示类型错误</Opt>
<Opt>页面正常运行，控制台没有警告</Opt>
<Opt>控制台显示 prop 校验失败的警告</Opt>

<template #explain>

解析：第 14 章：编译器把这个类型转换为 `{ type: String, required: false }`。'xl' 是字符串，所以运行时检查通过，没有警告。Vite 只删除类型，不做类型检查，所以编译不会失败。这个错误只有 vue-tsc 或编辑器能发现。所以构建脚本中要运行 vue-tsc。

</template>
</Sc>
<Sc :a="1">

下面哪个顺序最适合 CI？目标是出错尽早发现。

<Opt>`npm run build`，`npx vitest run`，`npm run type-check`，`npm run lint`</Opt>
<Opt>`npm run lint`，`npm run type-check`，`npx vitest run`，`npm run build`</Opt>
<Opt>`npx vitest run`，`npm run build`，`npm run lint`，`npm run type-check`</Opt>

<template #explain>

解析：便宜、快的检查放前面：代码风格和类型问题几秒就知道，测试要几十秒，构建最慢。任何一条失败就停止，后面的不用再跑。其余两项把最慢的放在最前，等很久才发现一个多余的分号。

</template>
</Sc>

<Sc :a="2">

应用部署在 Nginx 上，使用 history 模式的路由。打开首页再点链接都正常，但在 `/about` 页面按刷新，显示 Nginx 的 404。怎样修复？

<Opt>在 vite.config 里设置 `base: '/about/'`</Opt>
<Opt>把路由改成每个页面一个 HTML 文件</Opt>
<Opt>配置 `try_files`，找不到文件时返回 `index.html`</Opt>

<template #explain>

解析：`/about` 是前端路由的路径，服务器上没有这个文件。点链接时由路由在浏览器里切换页面，不请求服务器，所以正常；刷新时浏览器向服务器请求 `/about`，得到 404。让服务器找不到文件时返回 `index.html`，路由就能接手。`base` 是资源的路径前缀，与此无关。

</template>
</Sc>

<Sc :a="0">

项目用了某个组件库的按钮和对话框，散落在 80 个文件里。半年后产品要求换另一个组件库。哪种做法让这次更换最便宜？

<Opt>项目里只用自己写的 `BaseButton`、`BaseDialog`，由它们去使用库的组件</Opt>
<Opt>在全局样式里用 `:deep()` 覆盖库的类名，让新旧库长得一样</Opt>
<Opt>完整引入整个库，需要时直接在模板里写库的组件</Opt>

<template #explain>

解析：在边界包一层后，换库只改这一层，80 个文件不用动。第二项依赖库内部的类名，库一升级就失效。第三项让库的组件散落各处，换库要逐个文件改。

</template>
</Sc>

<Sc :a="1">

评论区把用户提交的评论写成 `<div v-html="comment.content"></div>`。有人提交了 `<img src=x onerror="alert(1)">`。会发生什么？

<Opt>Vue 会转义它，页面上显示这段文字</Opt>
<Opt>图片加载失败，`onerror` 里的脚本在每个看到这条评论的用户的浏览器里运行</Opt>
<Opt>构建时报错，因为模板里不能出现 `onerror`</Opt>

<template #explain>

解析：`v-html` 不转义，把字符串当 HTML 插入。图片地址无效，触发 `onerror`，脚本运行。这就是 XSS。要用 `{{ comment.content }}` 显示纯文本，或者先用 DOMPurify 清洗再放进 `v-html`。第一项说的是 `{{ }}` 的行为。

</template>
</Sc>

:::

::: summary
- index.html 是入口。vite.config 配置插件和路径别名。
- Vue - Official、ESLint 和 `vue-tsc` 在构建前发现错误。脚手架项目用 `npm run type-check`（`vue-tsc --build`），不用 `vue-tsc --noEmit`。
- server.proxy 只在开发时转发请求。只有 VITE\_ 开头的环境变量进入客户端，所以不放密钥。
- scoped 用 data-v 属性隔离样式。:deep()、:slotted() 和 :global() 改变作用范围。v-bind() 把数据写成 CSS 变量。
- 部署要对三件事：base 前缀、history 模式的回退路由、缓存（带哈希的文件长期缓存，index.html 不缓存）。
- 选组件库看维护、类型、按需引入、主题和无障碍；在边界包一层自己的 Base 组件。
- 前端安全：v-html 只用于可信内容，密钥不进前端，依赖要锁定和审计。
- CI 按 lint、type-check、测试、build 的顺序运行。测试的细节在第 20 章。
:::
