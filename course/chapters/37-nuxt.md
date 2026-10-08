---
title: Nuxt：把 SSR 交给框架
id: nuxt
stage: 6
optional: true
chapter: 37
desc: 对照第 36 章手写的 SSR，看 Nuxt 替你做了什么，以及什么时候该用、什么时候不该用
---

<script setup>
import RenderModePicker from '../labs/37-nuxt/RenderModePicker.vue'
</script>

# Nuxt：把 SSR 交给框架

::: goals
<Goal checks="sc:0,sc:2,sc:8">说明 Nuxt 怎样避免服务端取过的数据在浏览器再取一次（payload），并读懂一段取数据的代码在两端各运行几次。</Goal>
<Goal checks="sc:1,sc:3,ex:nuxtAsyncData,ex:nuxtUseState">说明 useFetch、useAsyncData 和 $fetch 的区别，以及 useState 为什么存在。</Goal>
<Goal checks="sc:4,sc:5,sc:6">判断中间件、客户端专用代码和按路由渲染规则在服务器和浏览器上的行为。</Goal>
<Goal checks="sc:7">为一个页面选择渲染模式（SSR、预渲染、SWR、纯客户端），并判断一个项目该不该用 Nuxt。</Goal>

:::

::: rt
阅读主线约 13 分钟，深入内容约 1 分钟（可选）。另外留时间做练习、自测和本地任务。
:::

::: analogy
第 36 章像**自己砌墙、接水电**：每一步都懂，但每个房间都要重做一遍。Nuxt 像**精装修的毛坯房**：水电和格局按标准做好了，你只管摆家具。代价是承重墙不能随便拆：你要按它的约定放东西。
:::

::: terms
载荷（payload）
: 服务器把渲染时取到的数据序列化后放进 HTML，浏览器水合时从这里读取，不再请求。

预渲染
: 在构建时把页面渲染成 HTML 文件，之后请求直接返回这个文件。

路由规则（route rules）
: 在 nuxt.config 里按路径设置这条路由的渲染方式和缓存方式。

Nitro
: Nuxt 的服务端引擎：处理服务器路由，并把应用打包成可以部署到不同平台的产物。

自动导入
: 不写 import 就能使用 ref、useFetch、组件等，由 Nuxt 在构建时补上。
:::

::: why
你照着第 36 章搭了 SSR，发现要自己处理的事很多：服务器入口、路由、取数据并传给浏览器、每个请求隔离状态、构建两份产物、部署。每个项目都要重做一遍，而且每一步都有坑。

这些事在不同项目里几乎一样，所以有了框架。Vue 生态里最常用的是 Nuxt。本章不是教你学完 Nuxt，而是让你看懂：第 36 章里的每个问题，Nuxt 怎样回答；以及你的项目该不该用它。
:::

### 37.1 Nuxt 替你做了什么

本章以 Nuxt 4.6 为准（2026 年 10 月的稳定版）。它基于 Vue 3.5、Vite 8 和 Nitro（Nuxt 的服务端引擎），要求较新的 Node（22 或 24 的较新版本）。本章的命令和代码都在 Nuxt 4.6 的新项目里实际运行过。

用官方脚手架建项目：

```bash
npm create nuxt@latest -- shop --packageManager=npm --no-gitInit --template=minimal
cd shop
npm run dev      # 开发服务器，端口以终端输出为准
```

目录约定（Nuxt 4）：

| 位置 | 放什么 |
|---|---|
| `app/` | 浏览器和服务器共用的应用代码：`app.vue`、`pages/`、`layouts/`、`components/`、`composables/`、`middleware/`、`plugins/`、`stores/` |
| `server/` | 只在服务器运行的代码：`api/` 下的接口 |
| `public/` | 原样提供的静态文件 |
| `nuxt.config.ts` | 配置：模块、路由规则、构建选项 |

Nuxt 3 没有 `app/` 这一层，这些目录直接放在项目根目录。读旧教程时要注意。

下表把第 36 章自己搭要处理的事，对应到 Nuxt 里的东西：

| 自己搭 SSR 要处理的事 | Nuxt 里对应的是什么 | 本章 |
|---|---|---|
| 服务器入口和渲染 | Nitro 服务器，内置渲染器 | 37.8 |
| 路由 | `app/pages/` 里的文件就是路由 | 37.2 |
| 取数据、传给浏览器、避免重复请求 | `useFetch`、`useAsyncData` 和 payload | 37.3 |
| 水合 | 自动。入口由 Nuxt 生成 | |
| 每个请求隔离状态 | 每个请求一个独立的 Nuxt 应用，`useState`，Pinia 模块 | 37.4 |
| 只在浏览器运行的代码 | `<ClientOnly>`、`import.meta.client`、`onMounted` | 37.5 |
| 构建服务器和浏览器两份产物 | `nuxt build` 一次产出两份 | 37.6 |
| 选择 SSR、静态生成或纯客户端 | 路由规则 `routeRules`，可以按路径混合 | 37.6 |
| 部署 | Nitro 预设，默认 Node 服务器，也可以生成纯静态 | 37.6、37.8 |

### 37.2 页面、布局和路由

第 17 章你手写路由表：路径对应组件。Nuxt 把它变成文件结构：`app/pages/` 下的文件就是路由，不用写路由表。

| 文件 | 路径 |
|---|---|
| `app/pages/index.vue` | `/` |
| `app/pages/about.vue` | `/about` |
| `app/pages/products/index.vue` | `/products` |
| `app/pages/products/[id].vue` | `/products/1`，参数在 `useRoute().params.id` |

`app/app.vue` 是整个应用的根，里面放 `<NuxtPage />`（相当于第 17 章的 `<RouterView>`）。链接用 `<NuxtLink>`（相当于 `<RouterLink>`），路径写在 `to` 属性里。底层仍然是 Vue Router，只是路由表由文件生成。

布局放在 `app/layouts/`，在 `app.vue` 里用 `<NuxtLayout>` 包住 `<NuxtPage />`。`default.vue` 是默认布局，页面内容放进它的 `<slot />`。页面的元信息用 `definePageMeta` 声明，在页面里通过 `route.meta` 读取（实测）；改页面标题用 `useHead({ title: '首页' })`，服务器渲染出的 HTML 里就带着这个 `<title>`。

```vue
<script setup lang="ts">
definePageMeta({ title: '关于我们' })
const route = useRoute()
</script>

<template>
  <h1>{{ route.meta.title }}</h1>
</template>
```

### 37.3 取数据：useFetch、useAsyncData 和 $fetch

第 36 章里，服务器取数据、序列化、写进 HTML、浏览器取回、避免再请求，要自己拼。Nuxt 用 `useFetch` 一行完成：

```vue
<script setup lang="ts">
const { data: products, status } = await useFetch('/api/products')
</script>

<template>
  <ul>
    <li v-for="p in products" :key="p.id">{{ p.name }}</li>
  </ul>
</template>
```

三个函数的分工：

| 函数 | 用途 | 注意 |
|---|---|---|
| `$fetch` | 底层的请求函数 | 不管 SSR。适合事件处理函数里的请求（提交表单、点击按钮），不适合直接放在 setup 里取页面数据 |
| `useFetch(url, options)` | 页面数据：请求一个地址 | 自动生成 key。等于 `useAsyncData` 加 `$fetch` |
| `useAsyncData(key, handler)` | 页面数据：`handler` 可以是任何异步函数 | 要自己给 key。适合不是 HTTP 请求的数据源，例如调用某个 SDK |

它们返回 `{ data, status, error, refresh }`。`status` 是 `idle`、`pending`、`success` 或 `error`。

**它们怎样避免重复请求？** 直接打开 `/products`，服务器执行 setup，调用接口一次，并把结果放进页面里的 payload：HTML 末尾一个 `<script id="__NUXT_DATA__">`，数据按 key 存放。浏览器水合时执行同一个 setup，`useFetch` 发现 payload 里已经有这个 key 的数据，直接使用，不发请求（实测：浏览器的 Network 里没有 `/api/products`）。

之后在浏览器里点链接进入别的页面，payload 里没有那个页面的数据，请求就由浏览器发出。你在练习 `nuxtAsyncData` 里亲手实现这个判断。

对比一下直接在 setup 里写 `$fetch`（实测）：

```vue
<script setup lang="ts">
const data = await $fetch('/api/count')      // 接口每次返回递增的数字
</script>
```

直接打开这个页面，接口被调用 2 次：服务器一次，浏览器水合时又一次。两次的结果不同，页面还会出现水合不匹配。换成 `useFetch('/api/count')`，只调用 1 次。

两个常用选项：`server: false` 让服务器不取，`status` 在 HTML 里是 `idle`，浏览器水合后才请求（实测），适合不需要收录的数据。`watch` 等选项见官方文档。

::: deep payload 里长什么样
`__NUXT_DATA__` 的内容是用 devalue（36.5 提到的库）序列化的数组，不是普通 JSON，所以 Map、Set、Date 等也能传。商品列表页的 payload 里，`data` 下面有一个自动生成的 key，指向商品数组：

```json
[["ShallowReactive",1],{"data":2,"state":13,...},["ShallowReactive",3],{"$f2qceemchf3on6":4},[5,9],{"id":6,"name":7,"price":8},1,"键盘",199,...]
```

`state` 存 `useState` 的数据（37.4），Pinia 的数据在 `pinia` 键下。
:::

`useFetch` 解决的是“SSR 下别重复取”。请求的缓存、失效、重试、乐观更新这些问题（第 18 章）它不负责，需要时按第 18 章的方式处理。

<Exercise id="nuxtAsyncData" />

### 37.4 状态：useState 和 Pinia

第 36 章讲过：服务器上模块只加载一次，模块顶层的 `ref` 被所有请求共享，会把一个用户的数据泄漏给另一个用户。Nuxt 的回答是 `useState`：

```js
const user = useState('user', () => null)       // key 是 'user'，初始值由函数给出
```

`useState` 把状态放在当前请求自己的 Nuxt 应用上，不放在模块里。同一个请求里，同一个 key 返回同一个 ref，不同请求互不影响。服务器上改过的值会进 payload 的 `state`，浏览器取回后继续用（实测）。

对比（实测）。composable 里写 `export const shared = ref(0)`，页面里 `shared.value++`：两个请求依次访问，第二个得到 2。换成 `useState('counter', () => 0)`，两个请求都得到 1。

要写一个所有组件共享的状态时：放进 `useState`，或者用 Pinia。Nuxt 里用一条命令接入 Pinia：

```bash
npx nuxt module add pinia
```

它安装 `@pinia/nuxt` 并写进 `nuxt.config.ts` 的 `modules`。之后 `app/stores/` 里的 store 可以不写 import 直接使用，每个请求自动用独立的 pinia，状态自动进 payload（实测）。第 36 章手写的“每请求创建 pinia、序列化、浏览器取回”全部被模块做掉了。

<Exercise id="nuxtUseState" />

### 37.5 只在客户端运行的代码

第 36 章的规则没变：setup 在两端都运行，浏览器专有的东西要放到只在浏览器运行的地方。Nuxt 给了几个入口：

| 做法 | 用途 |
|---|---|
| `onMounted` | 和第 36 章一样，在水合之后读取 `window` |
| `<ClientOnly>` | 包住只能在浏览器渲染的组件。服务器输出 `#fallback` 插槽的内容 |
| `import.meta.client`、`import.meta.server` | 在代码里区分当前在哪一端 |
| 路由规则 `ssr: false` | 整个页面只在浏览器渲染（37.6） |

```vue
<script setup lang="ts">
const width = ref(0)
onMounted(() => { width.value = window.innerWidth })
</script>

<template>
  <p>宽度：{{ width }}</p>
  <ClientOnly>
    <MyChart />                       <!-- 只在浏览器里创建 -->
    <template #fallback><p>图表加载中</p></template>
  </ClientOnly>
</template>
```

服务器的 HTML 里是“宽度：0”和“图表加载中”（实测）。水合之后才变成真实宽度和图表。用 `import.meta.server ? 'a' : 'b'` 在模板里渲染不同的值，会造成水合不匹配（实测：生产版控制台打印 `Hydration completed but contains mismatches.`）。区分环境只用来决定做不做某件事，不要用来决定渲染什么。

### 37.6 渲染模式：SSR、预渲染、SWR 和纯客户端

第 36 章最后问“用不用 SSR”。Nuxt 让你不用整个项目选一个答案，而是**按路径选**。默认是 SSR。在 `nuxt.config.ts` 的 `routeRules` 里为路径指定别的方式：

```ts
export default defineNuxtConfig({
  routeRules: {
    '/about': { prerender: true },     // 构建时生成 HTML
    '/products/**': { swr: 3600 },     // 服务器缓存一小时，过期后后台重新生成
    '/app/**': { ssr: false }          // 只在浏览器渲染
  }
})
```

| 模式 | 规则 | 行为（实测） | 需要服务器 |
|---|---|---|---|
| SSR | 默认 | 每次请求在服务器渲染 | 需要 |
| 预渲染（SSG） | `prerender: true` | `nuxt build` 时生成 `about/index.html` 和 `_payload.json`，请求时不再渲染 | 不需要 |
| SWR / ISR | `swr: 秒数`、`isr` | 缓存渲染结果；两次请求返回同一份。ISR 另外把结果放在 CDN 上，官方文档说目前支持 Netlify 和 Vercel | SWR 需要 |
| 纯客户端 | `ssr: false` | HTML 里是空的 `<div id="__nuxt"></div>`，setup 只在浏览器运行 | 不需要 |

如果整个站点都不需要服务器，运行 `npx nuxt generate`：它从首页出发，沿着链接把能找到的页面都预渲染，输出到 `.output/public`，没有服务端目录（实测）。这些页面里的数据在构建时就取好了，之后不会更新。

下面的实验台回答四个问题，给出建议的模式。

<Lab id="demo-render-mode" title="实验台：渲染模式选择器" note="根据内容特点推荐路由规则。这是决策的参考，不是真的 Nuxt">
<template #predict>
<Sc predict :a="1">

先猜：一个商品页，所有人看到同样的内容，价格每小时更新一次，要被搜索引擎收录，部署在能运行 Node 的服务器上。最合适的渲染方式是什么？

<Opt>预渲染：构建时生成，价格变了就重新部署</Opt>
<Opt>SWR：服务器缓存渲染结果，过期后在后台重新生成</Opt>
<Opt>纯客户端渲染：页面加载后再取价格</Opt>

<template #explain>

解析：内容所有人相同，所以可以缓存；每小时变，所以不能在构建时一次定死；要收录，所以不能是空壳页面；有服务器，所以可以在请求时再生成。四个条件合起来就是 SWR。第一项在价格变化时需要重新构建，适合几乎不变的内容。第三项会让搜索引擎看到空页面。打开实验台，改变条件看建议怎样变化。

</template>
</Sc>
</template>

<RenderModePicker />
</Lab>

### 37.7 自动导入和约定

在前面的代码里，`ref`、`useFetch`、`useState`、`NuxtLink` 都没有 import。这是自动导入：Nuxt 在构建时扫描并补上。除了 Vue 的 API 和 Nuxt 自带的函数，你自己的文件也按位置自动导入：

- `app/components/Hello.vue` 可以直接写 `<Hello />`。子目录会变成名字前缀：`app/components/base/Button.vue` 是 `<BaseButton>`（实测）。
- `app/composables/useShared.ts` 里导出的函数可以直接调用（实测）。
- `app/stores/` 里的 Pinia store 也一样（37.4）。

好处是少写很多 import，目录结构就是约定，新人上手看目录就知道东西在哪。

代价有三个：读代码时看不出一个名字来自哪里，要靠编辑器和 `.nuxt/` 里生成的类型声明；两个文件导出同名的东西会冲突；这样写的代码离开 Nuxt 就不能直接用（做库的话看第 41 章）。需要明确来源时，仍然可以手写 import。

### 37.8 服务端路由、中间件、插件和模块

**服务端路由和 Nitro。** `server/api/` 下的文件就是接口。`server/api/products.get.ts` 对应 `GET /api/products`；`[id].get.ts` 里用 `getRouterParam(event, 'id')` 取参数；出错时 `throw createError({ statusCode: 404, ... })`（都实测）。

```ts
// server/api/products.get.ts
export default defineEventHandler(() => {
  return [{ id: 1, name: '键盘', price: 199 }, { id: 2, name: '鼠标', price: 99 }]
})
```

Nitro 是跑这些接口、也是渲染页面的服务端引擎。`nuxt build` 时它把整个应用打包成 `.output/`。默认输出 Node 服务器：`node .output/server/index.mjs`。要部署到别的平台（Vercel、Netlify、Cloudflare 等），换一个 Nitro 预设，用 `nitro.preset` 或环境变量 `NITRO_PRESET` 指定；预设列表见官方文档。

**中间件。** 对应第 17 章的导航守卫（17.6）。`app/middleware/` 下的文件是路由中间件：名字带 `.global` 的每次导航都运行，其余的用 `definePageMeta({ middleware: 'auth' })` 挂到页面上。返回 `navigateTo('/')` 就重定向。

```ts
// app/middleware/auth.ts
export default defineNuxtRouteMiddleware(() => {
  const token = useCookie('token')
  if (!token.value) return navigateTo('/')
})
```

中间件在两端都会运行：直接打开页面时在服务器上运行，之后在浏览器里切换页面时在浏览器上运行（实测）。所以它读 cookie 要用 `useCookie`，不能用 `localStorage`。没有 cookie 时直接打开 `/admin`，服务器返回 302 重定向到 `/`（实测），浏览器根本看不到后台页面。

**插件。** 对应第 11 章的 `app.use`。`app/plugins/` 下的文件在应用启动时运行一次（每个请求一次，浏览器里一次），可以用 `provide` 添加全局的东西，通过 `useNuxtApp().$名字` 使用（实测）。

**模块。** 模块扩展 Nuxt 本身：加组件、目录、配置、构建步骤。写在 `nuxt.config.ts` 的 `modules` 里，常用 `npx nuxt module add 名字` 安装。不罗列模块。选模块看三点：官方或社区维护是否活跃，是否声明兼容你用的 Nuxt 大版本，是否做的事你自己用十行代码就能做。

### 37.9 该不该用 Nuxt

三种常见的工具，适合不同的项目：

| | 纯 Vite 的单页应用 | VitePress | Nuxt |
|---|---|---|---|
| 渲染 | 浏览器 | 构建时生成静态 HTML | SSR、静态生成、纯客户端，按路径混合 |
| 内容来源 | 接口 | Markdown 文件 | 接口、数据库、文件，都可以 |
| 服务器 | 不需要 | 不需要 | 看渲染模式，有服务端路由 |
| 适合 | 登录后的后台、内部工具 | 文档、博客、课程站 | 需要收录又有动态内容的站点、全栈应用 |

这门课的站点用的是 VitePress：内容全是 Markdown，每章是固定的静态页面，构建时生成 HTML 就够了，不需要服务器。进度存在浏览器里，所以也不需要 SSR 取数据。

下面这些情况，Nuxt 不是好选择：

- **登录后才能看的后台或内部工具**，不需要收录。纯 Vite 单页应用更简单，没有服务器要维护。
- **只有内容页**，不需要服务端接口。VitePress 或静态生成更轻。
- **后端已经有成熟的框架**，页面也只是它的一部分。给 Vue 加 SSR 的价值有限，先看接口能不能直接用。
- **团队没法运行 Node 服务器，也不要静态页面。** 先解决部署，再选框架。

使用 Nuxt 要接受它的约定、它的大版本升级（从 Nuxt 3 到 4，目录结构就有变化），以及排查问题时多一层框架。换来的是第 36 章那些事不用你重做。

### 37.10 动手：本地小应用和预渲染

Nuxt 不能在页面里运行，下面两个任务要在你自己的电脑上做。需要 Node 22 或 24 的较新版本。练习 `nuxtAsyncData` 和 `nuxtUseState` 检验机制，本地任务检验你能在真实项目里用起来。

**任务一：做一个有两个页面、一个取数据的列表页、一个服务端接口的小应用。**

1. 运行 `npm create nuxt@latest -- shop --packageManager=npm --no-gitInit --template=minimal`，进入 `shop`。
2. 把 `app/app.vue` 改成导航加 `<NuxtPage />`（导航里用 `<NuxtLink>` 链接 `/` 和 `/products`）。
3. 新建 `app/pages/index.vue`，内容是一个标题。
4. 新建 `server/api/products.get.ts`，返回两个商品，并在函数里 `console.log('[api] /api/products 被调用')`。
5. 新建 `app/pages/products.vue`，用 `await useFetch('/api/products')` 取数据并渲染列表。
6. 运行 `npm run dev`。

验收：

- `curl http://localhost:3000/products`（端口以终端输出为准）返回的 HTML 里直接包含两个商品的名字。
- `curl http://localhost:3000/api/products` 返回 JSON。
- 在浏览器直接打开 `/products`：终端里 `[api]` 那行只出现一次；浏览器开发者工具的 Network 里没有 `/api/products` 请求。
- 从首页点击链接进入商品页：Network 里出现一次 `/api/products` 请求。

**任务二：把一个页面改成预渲染，观察产物。**

1. 在 `nuxt.config.ts` 里加 `routeRules: { '/': { prerender: true } }`。
2. 运行 `npm run build`，看输出里的 `Prerendered 2 routes`。
3. 运行 `ls .output/public`，再运行 `node .output/server/index.mjs`，用 `curl localhost:3000/products` 访问。
4. 运行 `npx nuxt generate`，再看一次 `.output/public`。

验收：

- 第 2 步之后，`.output/public/index.html` 存在并包含首页标题，同时有 `_payload.json`；`.output/public/products/` 不存在。
- 第 3 步中，访问 `/products` 仍然返回商品列表，终端里每访问一次，`[api]` 出现一次。
- 第 4 步之后，`.output/public/products/index.html` 也存在并包含商品名，`.output/` 下没有 `server` 目录：这是纯静态产物，不再有接口。

页面练习检验“为什么这样设计”（payload、按请求隔离），本地任务检验“怎样用”（项目结构、取数据、渲染模式、产物）。

::: pitfalls
1. 不要在 setup 里直接 `await $fetch(...)` 取页面数据。原因：两端各执行一次，请求发两次，结果还可能不同，造成水合不匹配。用 `useFetch` 或 `useAsyncData`。
2. 不要在 composable 或模块顶层放含用户数据的 `ref`。原因：服务器上所有请求共用它。用 `useState` 或 Pinia。
3. 不要用 `import.meta.server` 决定模板渲染什么。原因：两端第一次渲染不同，水合不匹配。用它决定做不做某件事，渲染不同内容放到 `onMounted` 或 `<ClientOnly>`。
4. 不要给因人而异的页面设置 `prerender` 或 `swr`。原因：缓存和静态文件对所有人相同。
:::

::: selfcheck
<Sc :a="0">

`app/pages/products.vue` 的 setup 里有 `console.log('setup')` 和 `await useFetch('/api/products')`。用户直接在地址栏打开 `/products`。这次加载中，setup 和 `/api/products` 请求各发生在哪里？

<Opt>setup 在服务器和浏览器各运行 1 次；`/api/products` 只由服务器请求，浏览器 Network 里没有</Opt>
<Opt>setup 只在服务器运行；浏览器只显示 HTML</Opt>
<Opt>setup 在两端各运行 1 次；`/api/products` 在服务器和浏览器各请求 1 次</Opt>

<template #explain>

解析：水合要在浏览器里再运行一遍 setup，所以两端各 1 次。`useFetch` 在浏览器发现 payload 里已有这个 key 的数据，直接使用，不发请求。第二项忘了水合要运行 setup。第三项是裸 `$fetch` 的行为，不是 `useFetch`。

</template>
</Sc>

<Sc :a="1">

页面 setup 里写了 `const n = await $fetch('/api/count')`，接口每次调用返回比上次大 1 的数字。用户直接打开这个页面，会怎样？

<Opt>接口调用 1 次，浏览器使用 payload 里的结果</Opt>
<Opt>接口调用 2 次：服务器 1 次，浏览器水合时 1 次；两次结果不同，出现水合不匹配</Opt>
<Opt>接口只在浏览器调用 1 次，服务器跳过它</Opt>

<template #explain>

解析：`$fetch` 只是请求函数，不知道 payload。setup 在两端各运行一次，所以请求两次，两次的数字不同，服务器渲染的文字和浏览器的不一致。第一项是 `useFetch` 的行为。第三项错在：服务器会执行 setup，也就会发出请求。

</template>
</Sc>

<Sc :a="2">

用户在首页，点击一个指向 `/products` 的 `<NuxtLink>` 进入商品页（页面没有刷新）。商品页用 `useFetch('/api/products')`。`/api/products` 由谁请求？

<Opt>服务器，渲染后把 HTML 发给浏览器</Opt>
<Opt>不请求，数据早已在首页的 payload 里</Opt>
<Opt>浏览器，因为这次是浏览器里的导航，payload 里没有这页的数据</Opt>

<template #explain>

解析：页面没有刷新，不会再有服务器渲染。商品页的 setup 在浏览器里运行，payload 里没有它的数据，`useFetch` 就在浏览器发请求（实测 Network 里出现 `GET /api/products`）。第二项以为首页的 payload 包含所有页面的数据，payload 只带当次服务器渲染的那一页。

</template>
</Sc>

<Sc :a="1">

页面 setup 里执行下面两行。服务器依次处理两个用户对这个页面的请求。第二个用户收到的 HTML 里，counter 显示什么？

```js
const counter = useState('counter', () => 0)
counter.value++
```

<Opt>2，状态在两个请求之间共享</Opt>
<Opt>1，每个请求有自己的 counter</Opt>
<Opt>0，服务器不执行 setup 里的自增</Opt>

<template #explain>

解析：`useState` 把状态放在当前请求自己的 Nuxt 应用上，请求结束就没有了，下一个请求从初始值 0 开始，自增后是 1。第一项是模块级 `ref` 的行为（把 `useState` 换成模块顶层的 `ref(0)` 会得到 2）。第三项错在：服务器会执行 setup。

</template>
</Sc>

<Sc :a="2">

`pages/admin.vue` 里写了 `definePageMeta({ middleware: 'auth' })`，`auth` 中间件在没有 token cookie 时 `return navigateTo('/')`。没有 cookie 的用户在地址栏直接输入 `/admin` 回车。服务器返回什么？

<Opt>200 和后台页面的 HTML，浏览器里的中间件随后再重定向</Opt>
<Opt>403，因为没有权限</Opt>
<Opt>302，重定向到 `/`，后台页面的 HTML 根本不会发出</Opt>

<template #explain>

解析：直接打开页面时，路由中间件在服务器上先运行，`navigateTo` 在服务器上变成 HTTP 重定向（实测 302，`location: /`）。第一项把中间件当成只在浏览器运行的守卫。第二项的状态码要自己抛，`navigateTo` 不会产生 403。

</template>
</Sc>

<Sc :a="0">

路由规则 `'/lab/spa': { ssr: false }`。用 `curl` 请求这个页面，响应 HTML 的 `<body>` 里是什么？页面 setup 里的 `console.log` 会出现在服务器终端吗？

<Opt>空的 `<div id="__nuxt"></div>`；不会，setup 只在浏览器运行</Opt>
<Opt>完整的页面内容；会，服务器仍然运行 setup</Opt>
<Opt>空的 `<div id="__nuxt"></div>`；会，服务器运行 setup 但丢弃结果</Opt>

<template #explain>

解析：`ssr: false` 的路由不在服务器渲染，HTML 里只有空容器（实测），服务器终端没有这个页面的 setup 日志。第三项想象服务器会白跑一遍，实际上根本不运行。

</template>
</Sc>

<Sc :a="1">

下面的组件，服务器返回的 HTML 里，`<p id="w">` 和图表区域分别是什么？

```vue
<script setup lang="ts">
const width = ref(0)
onMounted(() => { width.value = window.innerWidth })
</script>
<template>
  <p id="w">宽度：{{ width }}</p>
  <ClientOnly>
    <MyChart />
    <template #fallback><p>图表加载中</p></template>
  </ClientOnly>
</template>
```

<Opt>`宽度：1280`，图表区域是空的</Opt>
<Opt>`宽度：0`，图表区域是“图表加载中”</Opt>
<Opt>报错，服务器上没有 `window`</Opt>

<template #explain>

解析：`onMounted` 在服务器不运行，`width` 保持初始值 0；`<ClientOnly>` 在服务器输出 `#fallback` 插槽（实测）。浏览器水合后，`onMounted` 才读到真实宽度，图表才创建。第三项错在：`window` 只在 `onMounted` 里读，服务器不运行它。

</template>
</Sc>

<Sc :a="0">

一个产品介绍页：所有访客内容相同，文案每周修改一次，团队用 Nuxt 部署到只能放静态文件的托管服务，要被收录。哪个路由规则最合适？

<Opt>`prerender: true`，构建时生成 HTML，文案改了重新构建部署</Opt>
<Opt>`swr: 604800`，服务器缓存一周</Opt>
<Opt>`ssr: false`，在浏览器里渲染</Opt>

<template #explain>

解析：内容相同、不常变、要收录、没有服务器，预渲染的产物是静态文件，正好放静态托管。SWR 需要服务器在请求时生成和缓存。`ssr: false` 会让搜索引擎看到空页面。

</template>
</Sc>

<Sc :a="2">

页面用 `useFetch` 取了数据。直接打开页面后查看页面源代码，服务器取到的数据除了渲染成 HTML，还放在哪里，供浏览器水合时取用？

<Opt>`window.__INITIAL_STATE__` 的脚本里，要手动写入</Opt>
<Opt>浏览器的 localStorage 里</Opt>
<Opt>HTML 末尾的 `<script id="__NUXT_DATA__">` 里，按 key 存放</Opt>

<template #explain>

解析：Nuxt 自动把 payload 序列化后放进 `__NUXT_DATA__`（实测），不用手写。第一项是第 36 章手动传输 Pinia 状态的做法，Nuxt 把它自动化了。第二项不对：服务器无法写浏览器的 localStorage。

</template>
</Sc>

:::

::: summary
- Nuxt 把第 36 章手写的 SSR 变成约定：文件即路由，Nitro 负责服务端，`nuxt build` 一次产出服务器和浏览器两份产物，部署换 Nitro 预设。本章以 Nuxt 4.6 为准，应用代码在 `app/`，接口在 `server/`。
- 取页面数据用 `useFetch` 或 `useAsyncData`，不要在 setup 里直接 `$fetch`。服务器取到的数据进 payload（`__NUXT_DATA__`），浏览器水合时按 key 取用，不再请求；浏览器里导航到别的页面时，请求由浏览器发出。
- `useState` 把共享状态放在每个请求自己的应用上，解决模块级状态在请求之间泄漏。Pinia 通过 `@pinia/nuxt` 接入，状态自动进 payload。
- 只在浏览器运行的代码：`onMounted`、`<ClientOnly>`（服务器输出 fallback）、`import.meta.client`、路由规则 `ssr: false`。不要用环境判断来决定渲染什么。
- 渲染模式按路径用 `routeRules` 选：默认 SSR，`prerender` 构建时生成，`swr` 缓存后台更新，`ssr: false` 纯客户端。因人而异的内容不能预渲染或共享缓存。
- 路由中间件对应导航守卫，直接打开页面时在服务器上运行，重定向是 302。自动导入少写 import，代价是来源不显式。
- 用 Nuxt 的场景是需要收录又有动态内容的站点或全栈应用；纯后台用 Vite 单页应用，内容站用 VitePress 或静态生成。
:::
