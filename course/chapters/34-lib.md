---
title: 组件库工程
id: lib
stage: 6
chapter: 34
desc: 把组件和组合式函数做成别人能安装的库：库模式构建、exports、类型、样式、按需引入、SSR 兼容和发布
---

<script setup>
import TwoVue from '../labs/34-lib/TwoVue.vue'
</script>

# 组件库工程

::: goals
<Goal checks="sc:0,sc:1">说明库为什么要把 `vue` 声明为对等依赖并外部化，以及两份 Vue 会让什么失效。</Goal>
<Goal checks="sc:2,ex:libExports">写出库的 `exports`，并说明工具怎样按条件解析入口和类型。</Goal>
<Goal checks="sc:3">判断模块顶层的哪些写法会破坏 tree-shaking，并说明 `sideEffects` 的作用。</Goal>
<Goal checks="sc:4">写出不会在服务器上出错的库代码。</Goal>
<Goal checks="sc:5,sc:6,ex:libAudit">按语义化版本发布，并在发布前用 tarball 和检查清单发现配置错误。</Goal>

:::

::: rt
阅读主线约 28 分钟，深入内容约 3 分钟（可选）。另外留时间做实验台、练习和自测。本章的命令要在本地项目里运行。
:::

::: analogy
库像一台**家电**：它只管自己的功能，电由使用者家里的插座提供。如果你在家电里再塞一台发电机，这个家就有了两套供电，两边的开关互不相通。
:::

::: terms
库
: 写给别人安装使用的包。它自己不启动应用，由使用者的应用导入它。

对等依赖（peerDependencies）
: `package.json` 的字段，声明“我需要使用者的项目提供这个包，版本在这个范围内”。

外部化（external）
: 构建时不把某个依赖打进产物，保留对它的 `import`。

产物
: 构建输出的文件，也就是使用者实际安装到的文件。

`exports`
: `package.json` 的字段，声明包对外开放哪些入口，以及不同环境各用哪个文件。

模块副作用
: 模块被导入时就会执行、并影响模块之外的代码，例如给 `window` 加监听器。

摇树优化（tree-shaking）
: 打包器删掉没有被使用的导出。

插件
: 有 install 方法的对象。一次注册一组全局功能。

破坏性变化
: 让旧代码不能正常运行的版本改动。
:::

::: why
你写好了三个组件和一个组合式函数，在自己的应用里一切正常。同事说“我也想用”，你把 `src` 目录发给他。

他的项目立刻出了三个问题：他的构建配置读不懂你的 `.vue` 的类型，页面上多出一份 Vue，而且他只用一个按钮，却打进了全部组件。

原因：应用的代码只有你自己的构建会读，库的代码要被别人的构建读。库要同时管好四件事：产物长什么样，怎样声明入口，怎样提供类型，怎样让别人只拿需要的部分。前面的章节教你写应用。本章把它们做成库。

本章用一个最小的库 `mini-ui`（`MiniButton`、`MiniList`、`MiniField` 三个组件，`useToggle` 一个组合式函数）走完整条路，再建一个应用安装它的 tarball。所有版本和输出都在这个组合上实测过：Vite 8.3.3、`@vitejs/plugin-vue` 6.0.9、`vue-tsc` 3.3.12、TypeScript 5.9.3、publint 0.3.25、`@arethetypeswrong/cli` 0.18.5、Vue 3.5.43。
:::

### 34.1 库不带自己的 Vue

库和应用的区别只有一句：**应用拥有运行环境，库借用使用者的运行环境。**所以库的 `package.json` 这样分：

| 字段 | 放什么 | `mini-ui` 里 |
|---|---|---|
| `dependencies` | 库运行时必须自带的小工具，使用者不会自己装 | 没有 |
| `peerDependencies` | 必须和使用者共用同一份的包，框架本身 | `"vue": "^3.5.0"` |
| `devDependencies` | 只在开发和构建时用 | `vite`、`vue`、`vue-tsc` 等 |

`vue` 要同时出现在 `peerDependencies`（告诉包管理器和使用者）和 `devDependencies`（让你自己能开发和测试）里，并且在构建时**外部化**：产物里保留 `import ... from "vue"`，不把 Vue 的代码打进去。

如果不外部化，使用者的页面上就有两份 Vue。本课程的页面就是这种情况：站点有自己的 Vue，第 33 章和本章的实验台又动态载入了第二份 Vue。下面把它变成可控的实验：

<Lab id="demo-two-vue" title="实验台：库自带一份 Vue 会怎样" note="第二份 Vue 是动态载入的 vue.esm-browser.js，相当于库把 Vue 打包进了自己。应用用的是页面自己的 Vue">
<template #predict>
<Sc predict :a="1">

先猜：库自带一份 Vue。应用在页面上点了两次“库的计数 +1”（库的函数里是 `const n = ref(0)`，点击时 `n.value++`，应用的模板显示 `n`）。页面上显示多少？

<Opt>2，和只有一份 Vue 时相同</Opt>
<Opt>0，`n.value` 变了，但页面没有更新</Opt>
<Opt>报错，两份 Vue 的 ref 不能混用</Opt>

<template #explain>

解析：库的 `ref` 属于库自带的那份响应式系统。应用渲染时读取 `n.value`，通知被记录在应用那份 Vue 里，库那份看不到这次读取，也就不知道有谁需要通知。所以 `n.value` 是 2，页面仍然是 0。第三项以为会报错：不会，`isRef` 靠对象上的标记判断，跨副本也返回 `true`，所以没有任何提示。打开实验台，对照“共用一份 Vue”再试一次。

</template>
</Sc>
</template>

<TwoVue />
</Lab>

我们在 Vue 3.5.43 的生产构建里实测了两份 Vue 的后果：

- **响应式不互通。**库创建的 `ref` 被应用读取时不会被追踪，页面不更新。库的 `computed` 依赖应用的 `ref` 时，永远不会重新计算（实验台里翻倍停在 2）。同一个对象，应用和库各调用一次 `reactive()`，得到两个不同的代理，`===` 不成立。
- **`inject`、`provide` 和生命周期钩子仍然能用。**Vue 3.5 的 `runtime-core` 把“当前实例”登记到 `globalThis.__VUE_INSTANCE_SETTERS__`，每份 Vue 设置当前实例时通知所有副本，所以库里的 `inject` 能读到应用 `provide` 的值。不要把“两份 Vue 的 `provide/inject` 会失效”当作理由；真正的危害是响应式断开，而且**没有任何报错**。

::: pitfalls
1. `vue` 只写在 `dependencies` 里：使用者的版本范围和你的不重合时，包管理器会装两份。写成 `peerDependencies`。
2. 只写了 `peerDependencies`，构建配置里没有外部化：产物里仍然有一份 Vue。检查产物里有没有 Vue 的源码（例如搜索 `currentInstance`）。
3. 库要用 `vue/server-renderer` 这类子路径时，外部化要写成函数或正则，`external: ['vue']` 只匹配 `vue` 本身：`external: [/^vue(\/.*)?$/]`。
:::

### 34.2 用 Vite 库模式构建

`vite.config.ts`（完整文件就这些）：

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], cssFileName: 'style' },
    minify: false,
    rolldownOptions: {
      external: ['vue'],
      output: { preserveModules: true, preserveModulesRoot: 'src', entryFileNames: '[name].js' }
    }
  }
})
```

逐项说明：

- `build.lib` 把 Vite 从“构建应用”切换到“构建库”：入口是 `src/index.ts`，不是 `index.html`。
- Vite 8 的底层是 Rolldown，所以选项叫 `rolldownOptions`。旧名字 `rollupOptions` 还能用，但类型里标记为已弃用。
- `formats: ['es']`：只出 ESM。判断要不要 CJS：使用者都用打包器或现代 Node 时，ESM 就够了。Node 的 `require()` 现在可以加载 ESM（在 Node 25.6 上实测可用，前提是 `exports` 里有 `default` 条件，见 34.3 节）。只有要给 CDN 用 `<script>` 标签时，才加 `umd` 或 `iife`，并配 `output.globals: { vue: 'Vue' }`、`lib.name`。我们实测过 UMD 的产物，开头是 `t(e.MiniUI={},e.Vue)`，`vue` 通过全局变量 `Vue` 取得。
- `minify: false`：库的产物交给使用者的构建去压缩。我们第一次构建时没有关，ES 产物里的变量名被改成了 `e`、`t`、`n`，使用者看到的报错栈无法阅读。
- `preserveModules`：每个源文件对应一个产物文件。单文件打包（去掉 `output` 那一行）更简单，产物只有 `index.js` 加 `style.css`。我们对比过：应用只导入 `MiniButton` 时，两种产物打包后都是 61.78 kB，tree-shaking 效果相同。选择 `preserveModules` 的理由是：`sideEffects` 可以精确到文件，使用者的调试器能对应到源文件，将来也能加深层导入的子路径。

构建后的产物（`npm pack` 实际打包进 tarball 的文件，加上 `package.json` 共 21 个，同类的文件只列一组）：

```text
dist/
  index.js  index.d.ts  plugin.js  plugin.d.ts  global.d.ts  style.css
  theme.js  theme.d.ts
  components/MiniButton.js  MiniButton.d.ts  MiniButton.vue_vue_type_script_setup_true_lang.js
             （MiniList、MiniField 同理）
  composables/useToggle.js  useToggle.d.ts
  _virtual/_plugin-vue_export-helper.js
```

每个 `.vue` 变成了两个文件，对应第 17 章 17.6 节的 `compileScript` 和 `compileTemplate`：

```js
// components/MiniButton.vue_vue_type_script_setup_true_lang.js（节选）
var MiniButton_default = /*@__PURE__*/ defineComponent({
  __name: "MiniButton",
  props: { variant: { default: "solid" }, disabled: { type: Boolean } },
  emits: ["click"],
  setup(__props) {
    return (_ctx, _cache) => openBlock(), createElementBlock("button", { ... }, ...)
  }
})
// components/MiniButton.js：加上 scopeId
_plugin_vue_export_helper_default(MiniButton_vue_vue_type_script_setup_true_lang_default, [["__scopeId", "data-v-f48befc7"]])
```

模板已经编译成渲染函数（生产构建把它内联在 `setup` 里返回），宏 `defineProps` 变成了 `props` 选项，`<style>` 抽到了 `style.css`。使用者的项目不需要 `@vue/compiler-sfc`，也不需要 `@vitejs/plugin-vue`，才能使用你的组件。这是“发布编译后的产物，不发布 `.vue` 源码”的好处。

### 34.3 `package.json` 的出口

构建只是产生文件。使用者的工具靠 `package.json` 找到它们：

```json
{
  "name": "mini-ui",
  "type": "module",
  "files": ["dist"],
  "sideEffects": ["**/*.css"],
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./global": { "types": "./dist/global.d.ts" },
    "./style.css": "./dist/style.css"
  },
  "peerDependencies": { "vue": "^3.5.0" }
}
```

- **`exports` 是权威。**它支持子路径（`./global`、`./style.css`），并且**封闭**：没写进去的路径使用者不能导入（Node 报 `ERR_PACKAGE_PATH_NOT_EXPORTED`），这让内部文件不会被意外依赖，对应第 20 章 20.13 节“少暴露”。
- **条件按书写顺序匹配，第一个命中的胜出。**`types` 必须写在最前面，`default` 必须写在最后。`types` 写在 `import` 后面时，查找类型的工具先命中 `import`，拿到的是 `.js`。我们实测：这种写法在 TypeScript 里碰巧还能得到类型，因为 TypeScript 会退而去看 `.js` 旁边有没有同名的 `.d.ts`；但 publint 把它报为错误，不要依赖这种回退。
- **为什么写 `default` 而不是 `import`。**只写 `import` 条件时，我们实测 `require('mini-ui')` 直接抛出 `ERR_PACKAGE_PATH_NOT_EXPORTED`。
- `main`、`module`、`types` 是旧工具（Node 10 风格的解析）的兜底。保留它们几乎没有成本。
- **`files`** 决定 tarball 里有什么。只列 `dist`，不要把 `src` 和测试发出去，除非你想让使用者看到源码映射。
- **`sideEffects`** 是给使用者的打包器看的：值为 `false` 表示“这个包里没有任何文件在被导入时做事，没人用的导出可以整个删掉”。包里有必须保留的文件时，用数组列出来。

`sideEffects` 的效果可以直接测。给 `theme.ts` 加一行模块顶层代码 `window.addEventListener('resize', ...)`，应用只导入 `MiniButton`：

| 库的 `sideEffects` | 应用打包后 | 里面有 `resize` 吗 |
|---|---|---|
| 没写 | 61.86 kB | 有 |
| `false` 或 `["**/*.css"]` | 61.78 kB | 没有 |

没有声明时，打包器不敢删这个模块，因为它可能有副作用。声明之后，整个模块被丢掉，监听器也不见了。**所以 `sideEffects` 是库作者对打包器的承诺：声明 `false` 之后，真有副作用的文件会被悄悄删掉，没有任何提示。**CSS 文件要么列进数组，要么确认使用者的打包器会保留它（Vite 实测不会删，webpack 的文档要求列出）。

下面是 `exports` 的解析规则。请你实现它的核心：

<Exercise id="libExports" />

写完以后用两个工具检查，它们读 tarball 而不是你的源码：

```bash
npm pack                                        # 生成 mini-ui-0.1.0.tgz
npx publint                                     # 检查 package.json 的字段
npx attw mini-ui-0.1.0.tgz --profile esm-only --exclude-entrypoints style.css
```

`publint` 检查字段写法：`types` 的顺序、`exports` 指向不存在的文件等。`attw`（Are the types wrong）模拟 TypeScript 的几种解析方式，检查类型是否真的能被找到。`--profile esm-only` 忽略 CommonJS 的解析方式；`style.css` 不是代码，用 `--exclude-entrypoints` 排除。两个工具都不检查 `vue` 应该放哪个字段，也不知道 `sideEffects: false` 会不会误伤 CSS，这两项要靠 34.9 节的清单。

### 34.4 类型声明

`.vue` 文件不是 TypeScript 文件，Vite 的构建不产生 `.d.ts`。类型要另外生成，当前推荐的办法是 `vue-tsc`：

```json
// tsconfig.build.json
{ "extends": "./tsconfig.json",
  "compilerOptions": { "noEmit": false, "declaration": true, "emitDeclarationOnly": true, "outDir": "dist", "rootDir": "src" },
  "include": ["src/**/*.ts", "src/**/*.vue"] }
```

```json
"build": "vite build && vue-tsc -p tsconfig.build.json && node scripts/fix-dts.mjs"
```

`vite-plugin-dts`（5.1.2）也能在构建时生成类型，我们试过，它输出的文件布局和 `vue-tsc` 相同，所以下面的问题两者都会遇到。

**`vue-tsc` 3.3.12 和 TypeScript 7.0.2 不兼容。**我们实测：用 7.0.2 时 `vue-tsc` 抛出 `ERR_PACKAGE_PATH_NOT_EXPORTED: './lib/tsc'`（TypeScript 7 的包没有导出 `vue-tsc` 要加载的 `typescript/lib/tsc`）。用 5.9.3 和 6.0.3 都正常。所以库项目的 `typescript` 钉在 5.9 或 6.0，即使你的应用已经用了 7。

**还有一个要修的问题：`.vue` 引用。**`vue-tsc` 把 `Foo.vue` 输出为 `Foo.vue.d.ts`，`index.d.ts` 里写的是 `from './components/MiniButton.vue'`。我们用 `attw` 检查，`node16`（ESM）下报了“内部解析失败”：Node16 以上的 TypeScript 找不到它。（源码里导入同目录的 `.ts` 文件也要写 `.js` 后缀，例如 `./plugin.js`，否则同样解析失败。）更糟的是，使用者开着 `skipLibCheck`（大多数模板默认）时**没有任何错误**，`MiniButton` 却变成了 `any`：写错 props 也不报错。

解决办法是一个十几行的后处理脚本（`scripts/fix-dts.mjs`）：把 `Foo.vue.d.ts` 改名为和 `Foo.js` 配对的 `Foo.d.ts`，把 `.d.ts` 里的 `./Foo.vue` 改成 `./Foo.js`。处理以后 `attw` 的 `node16 (from ESM)` 和 `bundler` 两列都是绿色。

使用者能用到哪些类型，我们在一个应用里实测过：

```ts
import type { ComponentInstance } from 'vue'
import type { ComponentProps, ComponentEmit, ComponentSlots } from 'vue-component-type-helpers'
import { MiniButton, MiniList } from 'mini-ui'

type BtnProps = ComponentProps<typeof MiniButton>                        // { variant?: 'solid' | 'outline', disabled?: boolean }
type ListProps = ComponentProps<typeof MiniList<{ id: number; name: string }>>
type Inst = ComponentInstance<typeof MiniButton>                         // vue 自带
```

`ComponentInstance` 来自 `vue`；`ComponentProps`、`ComponentEmit`、`ComponentSlots`、`ComponentExposed` 来自 `vue-component-type-helpers`（`vue-tsc` 的同一个仓库）。写错的 `variant: 'ghost'` 和 `items` 里的字段名都被类型检查拦住了。

**泛型组件的类型能保留。**`MiniList` 用 `<script setup generic="T">`，使用者的模板里 `#default="{ item }"` 的 `item` 就是传入数组的元素类型，写 `item.nope` 会报错。但库内部有一个坑：`app.component('MiniList', MiniList)` 本身会报类型错误（泛型组件是一个带类型参数的函数，不能赋给 `Component`）。库里的 `install` 要写成 `MiniList as unknown as Component`。

**全局组件的类型。**应用 `app.use(MiniUI)` 之后，模板里直接写 `<MiniButton>`，类型工具不知道它存在。库提供一个单独的入口（第 10 章 10.2 节的 `GlobalComponents` 扩充）：

```ts
// src/global.ts，发布为 mini-ui/global
declare module 'vue' {
  interface GlobalComponents { MiniButton: typeof MiniButton; MiniList: typeof MiniList; MiniField: typeof MiniField }
}
```

使用者在 `tsconfig.json` 的 `compilerOptions.types` 里加上 `"mini-ui/global"`。我们开着 `vueCompilerOptions.strictTemplates` 实测：没有这一项，两个标签都报“Property does not exist”；加上以后，只剩真正的类型错误（`variant="ghost"`）。**不要把它放进主入口：**只想按需导入的使用者不应该被你的全局声明影响。

### 34.5 样式的分发

构建后所有组件的 CSS 合并成一个 `style.css`，使用者写 `import 'mini-ui/style.css'`。三种分发方式的取舍：

| 方式 | 做法 | 代价 |
|---|---|---|
| 单个 CSS 文件（默认） | `exports` 里导出 `./style.css` | 使用者要多写一行导入；不用的组件的样式也会带上 |
| 按组件拆分 CSS | `build.cssCodeSplit: true` | 我们实测：每个组件一个 `.css`，但 JS 里**不会自动导入**它们（只留一行注释 `/* empty css */`），使用者要手动导入每个文件 |
| 随组件注入 JS | `vite-plugin-css-injected-by-js` | 我们实测：它把所有 CSS 放进入口 `index.js` 顶层，用 `typeof document` 保护，对 SSR 安全，但这是**模块顶层副作用**，只用一个按钮也会注入全部样式 |

默认的单个文件最简单，也最容易让 `sideEffects` 保持正确。

**scoped 样式在库里的表现**（第 26 章 26.4 节）：每个选择器被加上 `[data-v-f48befc7]`，特异性变成 (0,2,0)。我们在浏览器里测了使用者覆盖样式的几种办法：

- 用 CSS 变量：使用者写 `.theme-green { --mini-color: #16a34a }`，按钮的背景变成了 `rgb(22, 163, 74)`。**这是首选的主题接口。**组件的样式写 `var(--mini-color, #3b82f6)`，变量的名字和默认值写进文档。
- 写 `.mini-button { border-radius: 20px }`（特异性 0,1,0）：**没有效果**，被库的 (0,2,0) 压过，按钮仍是 4px。
- 写 `.mini-button.wide { padding: 20px 40px }`（0,2,0）：生效，但这靠特异性相同时后出现的规则胜出，取决于 CSS 的加载顺序。
- 需要覆盖库内部的元素，用 `:deep()`；需要完全控制外观的使用者，提供无样式的版本（第 20 章的无渲染组件）。

::: pitfalls
1. 不要把全局 reset（`* { box-sizing: ... }`、`body { margin: 0 }`）打进库的 CSS。它会改掉使用者整个页面的样式。
2. 类名加上库的前缀（`mini-button`），公开的类名写进文档，其余的当作内部实现。
:::

### 34.6 按需引入与 tree-shaking

使用者只用一个按钮，就应该只拿到按钮。我们在应用里量过（Vite 8.3.3 生产构建，`minify` 默认，括号里是 gzip）：

| 应用的写法 | 打包后的 JS |
|---|---|
| 不用 `mini-ui` | 60.40 kB（23.83） |
| `import { MiniButton } from 'mini-ui'` | 61.78 kB（24.43） |
| `import { MiniUI } from 'mini-ui'`，`app.use(MiniUI)` | 66.13 kB（26.16） |
| 具名导入三个组件 | 66.07 kB（26.14） |

具名导出加 `sideEffects` 声明，就能按需。下面几种写法会破坏它：

- **模块顶层的副作用**（上一节量过）：给 `window` 加监听器、改全局对象、调用打包器无法证明纯净的函数。
- **`app.use` 全量注册：**`install` 里引用了所有组件，所以 `app.use(MiniUI)` 等于导入全部。这不是错误，是提供“全量安装”这个选择的代价。
- **默认导出一个大对象：**`export default { MiniButton, MiniList }` 让使用者拿到的是一个整体，打包器通常不能拆开其中的属性。用具名导出。

所以库要同时提供两个入口：具名导出的组件给按需用，一个单独的 `plugin.ts` 给全量用，并且**组件文件不能导入 `plugin.ts`**：

```ts
// src/plugin.ts：只被 index.ts 当作一个具名导出重新导出
export default {
  install(app: App) {
    app.component('MiniButton', MiniButton)
    app.component('MiniList', MiniList as unknown as Component)
    app.component('MiniField', MiniField)
  }
}
```

使用者不想每个页面都写 `import { MiniButton }` 时，用 `unplugin-vue-components`（32.1.0）：它在构建时扫描模板，只为用到的标签生成导入。库要告诉它标签对应哪个包，写一个解析函数：

```ts
Components({
  dts: 'src/components.d.ts',
  resolvers: [name => (name.startsWith('Mini') ? { name, from: 'mini-ui' } : undefined)]
})
```

我们实测：模板里只写 `<MiniButton>`，产物里只有 `mini-button`，没有 `mini-list` 和 `mini-field`；它还生成了 `components.d.ts`，里面是 `GlobalComponents` 的声明，所以这种用法不需要 `mini-ui/global`。库作者可以把这个解析函数写进文档，或者发布为 `mini-ui/resolver`。

### 34.7 SSR 兼容

库的代码在服务器上也会被执行（第 28 章）。有两个时机最容易出错：

- **模块被导入时。**我们把带 `window.addEventListener` 的 `theme.ts` 打成包，在 Node 里 `import('mini-ui')`：直接抛出 `ReferenceError: window is not defined`。服务端渲染的整个服务都起不来。
- **`setup` 运行时。**组件的 `setup` 在服务器上运行，所以 `setup` 顶层同样不能碰 `window` 和 `document`。

```ts
export function useWidth() {
  const w = ref(0)                                         // 服务器上的初始值
  onMounted(() => { w.value = window.innerWidth })         // 钩子只在浏览器里运行
  return w
}
```

浏览器专属的代码放进 `onMounted` 或事件处理函数里。生成 id 用 `useId()`（第 28 章 28.9 节）：我们用 `renderToString` 渲染 `MiniField` 两次，两个输入框的 id 都是 `v-0`、`v-1`，而且两次渲染一致，所以和浏览器水合时 `for` 和 `id` 能对上。不要用 `Math.random()` 或模块里的计数器生成 id，模块级计数器还会在服务器上跨请求累加。

库如果用了 `Teleport`，要告诉使用者：服务器渲染时，被传送的内容不在 `renderToString` 返回的 HTML 里，而在渲染上下文的 `ctx.teleports` 里（我们实测：`to: '#modal'` 的内容出现在 `ctx.teleports['#modal']`），使用者要把它放进页面的目标容器，水合时才对得上。用到 `Teleport` 的库组件，在文档里写明这一点。

### 34.8 版本与发布

语义化版本（`主版本.次版本.修订号`）与第 20 章 20.13 节的表对应：

| 改动 | 版本 |
|---|---|
| 修复不改变公开行为的 bug | 修订号（0.1.1） |
| 新增可选 prop、事件、插槽，组合式函数返回值加字段 | 次版本（0.2.0） |
| prop 改名、事件载荷变类型、**默认值变了**、类型收窄、删除旧名字 | 主版本（1.0.0） |

改默认值最容易低估：使用者什么都不用改就能编译，行为却变了。每个版本在 `CHANGELOG.md` 里写明“变了什么，使用者要做什么”，删除旧名字的版本要在更早的版本里用开发环境警告预告。

发布前用 tarball 验证，而不是在库项目里运行：

1. `npm pack`，得到 `mini-ui-0.1.0.tgz`。
2. 新建一个应用，`npm i ../mini-ui/mini-ui-0.1.0.tgz`。
3. 在应用里导入、类型检查（`vue-tsc --noEmit`）、构建。

库项目里的 `npm run dev` 读的是 `src`，不经过 `exports`，也不经过 `files`，所以验证不了任何出口问题。

预发布版本用 `npm version 0.2.0-beta.0` 和 `npm publish --tag beta`：只有明确 `npm i mini-ui@beta` 的人才会拿到它，`latest` 不受影响。先用 `npm publish --dry-run` 看一遍，我们实测它会列出文件并提示需要登录，不会真的发布。

供应链措施简单提一下：npm 支持在发布时附带**来源证明**（provenance），证明这个包是从哪个仓库的哪次构建发布出来的。官方文档要求 npm 9.5.0 或更高，在 GitHub Actions 或 GitLab CI 的云端运行器上执行 `npm publish --provenance`（或在 `publishConfig` 里设置 `provenance: true`）；使用 npm 的 trusted publishing（OIDC）时会自动生成。我们没有真的发布，这一条按官方文档陈述。

组件库和文档站通常放进同一个仓库：一个 workspace 里 `packages/ui` 是库，`docs` 是文档站，文档站用 `workspace:*` 依赖本地的库。本课程就是用 VitePress 写的，Markdown 里可以直接使用 Vue 组件（本页的自测题和实验台都是组件），所以文档里的示例是真的运行，不是截图。

### 34.9 测试和发布前清单

组件库的测试对准**公开面**：props 的取值、触发的事件和载荷、插槽的内容、键盘操作和 ARIA 属性（第 20 章），用第 26 章 26.6 节的方式 `mount` 之后断言。不断言内部类名和 DOM 层级，否则一次内部重构就改掉一大片测试。

下面是发布前的检查清单：

1. `vue` 在 `peerDependencies` 和 `devDependencies`，不在 `dependencies`；构建配置外部化了它；产物里搜不到 Vue 的源码。
2. `exports` 的每个入口 `types` 在最前、`default` 在最后；`main`、`module`、`types` 有兜底。
3. `files` 只含需要发布的文件；`npm pack` 的清单里没有 `src`、测试、`.env`。
4. `sideEffects` 已声明；列表里包含 CSS；模块顶层没有副作用。
5. `.d.ts` 里没有 `.vue` 引用；`attw` 通过；泛型组件和 props 的类型在示例应用里被检查过。
6. 样式：没有全局 reset；主题变量写进文档；`import 'mini-ui/style.css'` 写进文档。
7. SSR：用 `renderToString` 渲染所有组件，没有报错；没有模块顶层的 `window` 和 `document`。
8. 版本号和 `CHANGELOG.md` 对得上；破坏性变化在主版本里。
9. 在示例应用里安装 tarball，类型检查、构建、运行都通过。

最后把清单里能自动化的部分写成函数。请你实现一个体检函数，它读 `package.json` 和文件清单：

<Exercise id="libAudit" />

::: deep 为什么没有“全局组件的自动注册”
有的库在导入时自动调用 `app.component`（需要一个全局的 app）。这违反两个原则：模块顶层有副作用，会破坏 tree-shaking；全局 app 在服务器上被多个请求共享。注册永远是使用者调用 `app.use` 的结果，不是导入的结果。
:::

::: selfcheck
<Sc :a="1">

`mini-ui` 在 `package.json` 里写了下面的字段。这个字段的作用是什么？

```json
"peerDependencies": { "vue": "^3.5.0" }
```

<Opt>构建时自动把 `vue` 从产物里排除，不用再写 `external`</Opt>
<Opt>声明库需要使用者的项目提供 `vue`，并且版本在这个范围内；范围不满足时包管理器会警告或报错</Opt>
<Opt>只在开发 `mini-ui` 时安装 `vue`，使用者不需要装</Opt>

<template #explain>

解析：`peerDependencies` 只是声明，包管理器据此决定安装和警告。它不会改变构建：产物里有没有 Vue，由构建配置的 `external` 决定，所以第一项错。最迷惑的是第三项，那是 `devDependencies` 的作用；对等依赖正是要使用者的项目里有一份 `vue`（npm 7 及以上在缺少时会自动安装它）。

</template>
</Sc>

<Sc :a="2">

库没有外部化 `vue`，产物里自带一份。应用的根组件 `provide('theme', 'dark')`，库的组合式函数里 `inject('theme', 'none')`。在 Vue 3.5.43 里，它读到什么？同一个库函数里的 `const n = ref(0)` 被应用的模板读取，`n.value++` 以后页面会怎样？

<Opt>读到 `'none'`；页面更新</Opt>
<Opt>读到 `'none'`；页面不更新</Opt>
<Opt>读到 `'dark'`；页面不更新，也没有任何报错</Opt>
<Opt>读到 `'dark'`；页面更新</Opt>

<template #explain>

解析：Vue 3.5 把“当前实例”的设置函数登记在 `globalThis.__VUE_INSTANCE_SETTERS__` 里，每份 Vue 设置当前实例时通知所有副本，所以 `inject` 能读到 `'dark'`。响应式系统的“当前正在运行的副作用函数”却是每份 Vue 各自的，应用渲染时读取的 `n.value` 不会被库那份记录，所以页面不更新。最迷惑的是第二项：以为两份 Vue 的 `provide/inject` 会失效。我们在浏览器里实测过，它仍然有效；真正的危险是响应式断开，而且没有任何报错。

</template>
</Sc>

<Sc :a="0">

库的 `exports` 写成下面这样，哪一句是对的？

```json
"exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } }
```

<Opt>条件按书写顺序命中，`import` 先命中，`types` 轮不到；是否还能得到类型取决于 `.js` 旁边有没有同名的 `.d.ts`，publint 把它报为错误</Opt>
<Opt>TypeScript 在任何情况下都找不到类型</Opt>
<Opt>条件的顺序无关紧要，工具会选最合适的那个</Opt>
<Opt>只写了 `import`，所以 `require('mini-ui')` 会得到 ESM 的转换结果</Opt>

<template #explain>

解析：`exports` 的条件按对象里键的书写顺序匹配，第一个命中的胜出。查找类型的工具带着 `types` 和 `import` 两个条件，先遇到 `import`，拿到的是 `.js`。我们实测 TypeScript 随后会尝试同名的 `.d.ts`，所以这个包的类型碰巧可用，所以第二项的“任何情况下都找不到”太绝对。第三项是常见误解，工具不会重排条件。第四项错在：只写 `import` 时 `require()` 直接抛出 `ERR_PACKAGE_PATH_NOT_EXPORTED`。

</template>
</Sc>

<Sc :a="2">

库的 `theme.ts` 顶层有 `window.addEventListener('resize', ...)`，`package.json` 里没有 `sideEffects` 字段。应用只写 `import { MiniButton } from 'mini-ui'`，生产构建后会怎样？

<Opt>监听器被摇掉，因为应用没有使用 `theme`</Opt>
<Opt>构建报错，提示模块有副作用</Opt>
<Opt>监听器保留在产物里，因为打包器不能确定这个模块没有副作用</Opt>

<template #explain>

解析：打包器看到一条它无法证明纯净的顶层语句，又没有 `sideEffects` 声明，就保守地保留整个模块。我们实测产物从 61.78 kB 变成 61.86 kB，里面有 `resize`。声明 `"sideEffects": false` 后监听器被删掉。第一项以为打包器总是能判断；第二项以为会有提示，实际上没有任何提示，包括 `false` 误删真正的副作用时。

</template>
</Sc>

<Sc :a="1">

下面三个组合式函数，哪一个可以安全地在服务端渲染的应用里使用？

```ts
// A
export function useWidth() { const w = ref(window.innerWidth); return w }
// B
export function useWidth() { const w = ref(0); onMounted(() => { w.value = window.innerWidth }); return w }
// C
const width = window.innerWidth
export function useWidth() { return ref(width) }
```

<Opt>A，`ref` 的初始值就是真实宽度</Opt>
<Opt>B</Opt>
<Opt>C，只读取一次，比 A 更省</Opt>

<template #explain>

解析：`setup` 在服务器上也会运行，A 在服务器上读取 `window` 会抛出 `ReferenceError`。C 更糟：模块被导入时就读取了，服务端渲染的服务启动就失败。B 把浏览器专属的读取放进 `onMounted`，这个钩子只在浏览器里运行，服务器上用初始值 0。

</template>
</Sc>

<Sc :a="3">

`mini-ui` 1.4.0 把 `MiniButton` 的 `variant` 默认值从 `'solid'` 改成 `'outline'`。没有类型变化，使用者的代码照常编译。这个改动应该怎样发布？

<Opt>修订号，它只是修正了默认外观</Opt>
<Opt>次版本，因为没有任何编译错误</Opt>
<Opt>不用升级版本，因为 API 没有变</Opt>
<Opt>主版本，或者保留旧默认值并新增选项</Opt>

<template #explain>

解析：第 20 章的表把“改变 prop 的默认值”列为破坏性变化，而且是没有任何报错的那一类，使用者无法靠编译发现。所以按语义化版本要升主版本，或者保留旧默认值、新增一个选项让愿意的人选新外观。最迷惑的是第二项：“没有编译错误”不等于没有破坏。

</template>
</Sc>

<Sc :a="0">

发布前想验证 `exports` 和 `files` 写对了，哪种做法最可靠？

<Opt>`npm pack` 生成 tarball，在另一个新项目里安装它，类型检查并构建</Opt>
<Opt>在库项目里运行开发服务器，页面正常就说明没问题</Opt>
<Opt>检查 `dist` 目录里有没有预期的文件</Opt>

<template #explain>

解析：使用者拿到的是 tarball 里的文件，经过 `files` 筛选，经过 `exports` 解析。只有在另一个项目里安装 tarball，才会走完这条路。第二项走的是 `src` 和 Vite 的开发解析，不经过 `exports`。第三项只检查了产物，没有检查 `files` 是否把它们带进了包，也没有检查 `exports` 是否指向它们。

</template>
</Sc>

:::

::: summary
- 库借用使用者的运行环境：`vue` 放进 `peerDependencies`，构建时外部化。两份 Vue 不会让 `inject` 失效，但会让响应式断开，而且没有报错。
- 用 Vite 库模式输出 ESM 和一个 `style.css`；`.vue` 在产物里已经编译成 `defineComponent` 加渲染函数。
- `exports` 是权威入口：条件按书写顺序匹配，`types` 在前、`default` 在后；用 `npm pack` 加 publint 和 attw 检查。
- 类型用 `vue-tsc` 生成（钉在 TypeScript 5.9 或 6.0，不兼容 7.0.2），并修复 `.vue` 引用；泛型组件的类型能保留；全局组件类型放在单独的入口。
- 样式默认合并成一个 CSS 文件；用 CSS 变量作为主题接口；scoped 选择器的特异性是 (0,2,0)，单类选择器覆盖不了。
- 按需引入靠具名导出加 `sideEffects`；模块顶层副作用、全量注册、默认导出大对象会破坏它。
- SSR：模块顶层和 `setup` 里不碰 `window`；用 `useId` 生成 id。
- 发布：按语义化版本，默认值变了也是主版本；用 tarball 在新项目里验证；按清单检查。
:::
