---
title: 应用、插件与错误处理
id: app
stage: 2
chapter: 10
desc: createApp、app.use、插件、onErrorCaptured
---

<script setup>
import PluginInstallFlow from '../figures/10-app/PluginInstallFlow.vue'
import ErrorPropagation from '../figures/10-app/ErrorPropagation.vue'
import AppPluginLab from '../labs/10-app/AppPluginLab.vue'
</script>

# 应用、插件与错误处理

::: goals
<Goal checks="sc:0">使用应用实例的 API 注册全局资源和配置。</Goal>
<Goal checks="sc:2,sc:3,ex:pluginOptions">编写一个带选项的插件，并在应用卸载时清理它的资源。</Goal>
<Goal checks="ex:errorFill,ex:errorBoundary">用 onErrorCaptured 写一个错误边界组件。</Goal>
<Goal checks="sc:1">说出错误的传递顺序。</Goal>

:::

::: rt
阅读主线约 15 分钟，深入内容约 4 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
应用实例像一家**门店的总台**：营业前在总台登记员工（全局组件）、规章（配置）和公共物品（provide）。插件像**加盟套餐**，一次性把一整套员工和规章交给总台。

错误边界像**楼层的保险丝**：一个房间短路时，只断这一层，整栋楼仍然有电。
:::

::: terms
应用实例
: createApp 返回的对象。保存全局组件和配置。

插件
: 有 install 方法的对象。一次注册一组全局功能。

全局注册
: 注册后，所有组件都可以直接使用。

错误边界
: 捕获后代组件的错误、显示备用内容的组件。

errorHandler
: 处理未被捕获的错误的全局函数。
:::

::: why
每个组件都要用按钮组件和翻译函数。你在每个文件中导入它们。漏掉一个导入，这个组件就报错。

子组件出错时，它的区域变成空白。错误没有上报时，你不知道用户遇到了问题。

原因：这些功能属于整个应用，不属于某个组件。

本章用应用实例和插件注册全局资源，用错误边界和 errorHandler 处理错误。
:::

### 10.1 创建应用并注册全局资源

`createApp(根组件, 根 props)` 创建一个应用实例。应用实例保存这个应用的全局配置。主要 API 如下：

| API | 作用 |
|---|---|
| `app.mount(el)` | 挂载根组件。返回根组件实例，不返回 app。 |
| `app.unmount()` | 卸载整个应用。所有组件的卸载钩子都运行。 |
| `app.component(name, comp)` | 注册全局组件。所有模板都可以直接使用它。 |
| `app.directive(name, dir)` | 注册全局自定义指令。 |
| `app.provide(key, value)` | 在应用层提供数据。所有组件都可以 inject。 |
| `app.use(plugin, options)` | 安装插件。返回 app，所以可以链式调用。 |
| `app.config.globalProperties` | 添加全局属性。模板和 `this` 可以访问它。 |
| `app.config.errorHandler` | 处理没有被组件捕获的错误。 |
| `app.config.warnHandler` | 处理 Vue 的警告。只在开发构建中生效。 |
| `app.onUnmount(fn)` | 应用卸载时运行 fn（3.5+）。 |
| `app.runWithContext(fn)` | 在组件之外调用 inject（3.3+）。Router 和 Pinia 使用它。 |

按下面的顺序写 main.js：

1. 调用 createApp。
2. 注册全局组件、指令、provide 和配置。
3. 最后调用 `app.mount()`。

```js
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import BaseButton from './components/BaseButton.vue'

const app = createApp(App)

app.component('BaseButton', BaseButton)          // 全局组件
app.directive('focus', {                          // 全局指令：v-focus
  mounted(el) { el.focus() }
})
app.provide('apiBase', '/api/v2')                 // 所有组件可以 inject('apiBase')
app.config.globalProperties.$fmt = n => '¥' + n.toFixed(2)   // 模板中写 {{ $fmt(price) }}

app.mount('#app')                                 // 最后调用。mount 返回组件实例，不能继续链式调用
```

**场景：挂载前安装插件和错误处理。**真实项目要使用路由、状态管理，还要上报错误。在调用 mount 之前完成这些设置。

```js
const app = createApp(App)
app.use(router)                               // 安装插件：路由见第 22 章，插件的写法见 10.2 节
app.config.errorHandler = (err) => report(err) // 组件中未处理的错误都到这里（10.6 节）
app.mount('#app')                             // 最后一步：挂载
```

注意：`mount` 返回根组件的实例，不返回应用。所以 `use` 和 `config` 要写在 mount 之前。不能写 `createApp(App).mount('#app').use(router)`。

**场景：服务端渲染的旧页面中，只有两个区域需要交互。**一个页面可以有多个应用。每个应用有自己的全局组件、配置和 provide，互不影响。

```js
// 服务端渲染的旧页面中，只有两个区域需要交互
createApp(SearchBox).mount('#search')
createApp(CartWidget).use(pinia).mount('#cart')   // 两个应用可以使用同一个 pinia 实例
```

mount 立即渲染。在 mount 之后注册的组件，对首次渲染无效。

::: think globalProperties 和 app.provide 应该选哪一个？
globalProperties 只能在模板和选项式 API 的 `this` 中使用。在 setup 中不能直接访问它。组合式 API 中，使用 app.provide 和 inject。很多插件同时提供两种方式。
:::

### 10.2 编写插件

插件把一组全局注册放在一起。插件是一个对象，它有一个 `install(app, options)` 方法。插件也可以是一个函数。`app.use(plugin, options)` 调用这个方法。下图说明 app.use 的过程。

<Figure caption="app.use 调用插件的 install。install 把资源注册到 app 上下文中。mount 之后，所有组件都可以读取它们。">
<PluginInstallFlow />
</Figure>

插件通常做下面这些事情：

- 注册全局组件和指令。
- 用 `app.provide` 提供数据和方法。
- 在 `globalProperties` 上添加属性，例如 `$t`。

**场景：国际化插件。**插件同时提供 `$t` 和 useI18n。模板用 $t，setup 用 useI18n。

```js
// plugins/i18n.js
import { ref, inject } from 'vue'

export const i18nKey = Symbol('i18n')

export default {
  install(app, options) {
    const locale = ref(options.locale)            // 响应式：切换语言时模板更新
    const t = key => options.messages[locale.value]?.[key] ?? key
    app.config.globalProperties.$t = t            // 模板中写 {{ $t('hello') }}
    app.provide(i18nKey, { locale, t })           // setup 中用 useI18n()
  }
}
export const useI18n = () => inject(i18nKey)

// main.js
app.use(i18n, {
  locale: 'zh',
  messages: { zh: { hello: '你好' }, en: { hello: 'Hello' } }
})
```

同一个插件安装两次时，Vue 忽略第二次。没有传选项时，options 是 undefined。写 `install(app, options = {})`，再合并默认值。

使用 TypeScript 时，为全局属性声明类型：

```ts
// i18n.d.ts
export {}
declare module 'vue' {
  interface ComponentCustomProperties {
    $t: (key: string) => string
  }
}
```

::: deep 组件库插件的写法和发布
一个组件库插件通常在一个 install 中注册组件、指令和 provide。插件接收选项，并和默认值合并：

```ts
// my-ui/src/index.ts
import type { App, Plugin, InjectionKey } from 'vue'
import { inject } from 'vue'
import MyButton from './MyButton.vue'
import { vClickOutside } from './clickOutside'
import { showToast } from './toast'

export interface MyUIOptions {
  prefix?: string                        // 组件名前缀
  size?: 'small' | 'medium' | 'large'
  toastDuration?: number
}
const defaults: Required<MyUIOptions> = { prefix: 'My', size: 'medium', toastDuration: 3000 }

export const MyUIKey: InjectionKey<Required<MyUIOptions>> = Symbol('MyUI')

// Plugin<[MyUIOptions?]>：app.use(MyUI) 和 app.use(MyUI, {...}) 都有类型检查
export const MyUI: Plugin<[MyUIOptions?]> = {
  install(app: App, options: MyUIOptions = {}) {
    const config = { ...defaults, ...options }                 // 用户的选项覆盖默认值
    app.component(`${config.prefix}Button`, MyButton)          // <MyButton>
    app.directive('click-outside', vClickOutside)              // v-click-outside
    app.provide(MyUIKey, config)                               // 组件中用 useMyUI() 读取
    app.config.globalProperties.$toast =
      (msg: string) => showToast(msg, config.toastDuration)   // 模板中用 $toast()
  }
}
export const useMyUI = () => inject(MyUIKey)!
export { MyButton, vClickOutside }        // 也支持按需导入

// 为 $toast、全局组件和全局指令声明类型
declare module 'vue' {
  interface ComponentCustomProperties { $toast: (msg: string) => void }
  interface GlobalComponents { MyButton: typeof MyButton }
  interface GlobalDirectives { vClickOutside: typeof vClickOutside }
}
```

对象展开只合并第一层。选项中有嵌套对象时，要逐层合并，或者使用 defu 等合并工具。

用 Vite 的库模式打包插件。把 vue 设置为外部依赖，否则 Vue 会被打包进插件：

```js
// vite.config.ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [vue(), dts()],                       // dts：生成 .d.ts 类型文件
  build: {
    lib: {
      entry: fileURLToPath(new URL('src/index.ts', import.meta.url)),
      name: 'MyUI',                              // UMD 格式中的全局变量名
      fileName: 'my-ui',                         // 输出 my-ui.js（ES）和 my-ui.umd.cjs（UMD）
    },
    rolldownOptions: {                           // Vite 7 及以前写 rollupOptions
      external: ['vue'],                         // 不打包 vue
      output: { globals: { vue: 'Vue' } },       // UMD 中，vue 对应全局变量 Vue
    },
  },
})
```

Vite 8 用 Rolldown 打包，所以选项名是 `build.rolldownOptions`。Vite 7 及以前用 Rollup，选项名是 `build.rollupOptions`，内容相同。Vite 8 暂时还接受旧名字。

不使用 vite-plugin-dts 时，用 vue-tsc 生成类型文件：`vue-tsc --declaration --emitDeclarationOnly --outDir dist`。

package.json 声明入口文件。vue 写在 peerDependencies 中：

```json
{
  "name": "my-ui",
  "version": "1.0.0",
  "type": "module",
  "files": ["dist"],
  "main": "./dist/my-ui.umd.cjs",
  "module": "./dist/my-ui.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/my-ui.js",
      "require": "./dist/my-ui.umd.cjs"
    },
    "./style.css": "./dist/style.css"
  },
  "peerDependencies": { "vue": "^3.3.0" }
}
```

CSS 文件的名字由 Vite 的版本决定。以 dist 目录中实际的文件名为准。

按下面的步骤在本地测试并发布：

1. 在插件目录运行 `npm run build` 和 `npm link`。
2. 在应用目录运行 `npm link my-ui`。pnpm 用 `pnpm link ../my-ui`。
3. 在应用的 vite.config 中设置 `resolve.dedupe: ['vue']`。
4. 运行 `npm pack`，检查压缩包中的文件。
5. 运行 `npm version patch` 修改版本号。
6. 运行 `npm publish`。带作用域的包加 `--access public`。

第 3 步的原因：链接的包使用自己目录中的 vue。页面中有两份 Vue 时，响应式会断开，而且没有任何报错。`inject` 和生命周期钩子反而仍然能用（第 34 章讲了原因）。
:::

<Exercise id="pluginOptions" />

### 10.3 用 app.onUnmount 清理插件的资源

插件不是组件，不能使用 onUnmounted。在 install 中调用 `app.onUnmount(fn)`（3.5+）。`app.unmount()` 运行时，Vue 调用 fn。

```js
export const realtime = {
  install(app, { url }) {
    const ws = new WebSocket(url)
    app.provide(realtimeKey, ws)
    app.onUnmount(() => ws.close())          // app.unmount() 时运行
  }
}
```

**场景：微前端中多次挂载任务看板。**主应用在切换页面时挂载和卸载看板子应用。插件在 window 上添加的监听必须在卸载时删除。否则每挂载一次，就多一组监听。

```js
export const onlineStatus = {
  install(app) {
    const online = ref(navigator.onLine)
    const update = () => { online.value = navigator.onLine }
    const events = ['online', 'offline']
    events.forEach(ev => window.addEventListener(ev, update))
    app.provide(onlineKey, readonly(online))
    app.onUnmount(() => {
      events.forEach(ev => window.removeEventListener(ev, update))   // 删除全部监听
    })
  }
}
```

不要在根组件的 onUnmounted 中清理插件创建的资源。根组件不知道插件创建了什么。Vue 3.5 以前的版本没有这个 API。

### 10.4 用 app.runWithContext 在组件之外调用 inject

inject 只在 setup 中能读取 provide 的值。在组件之外直接调用，得到 undefined 和一个警告。`app.runWithContext(fn)`（3.3+）让 fn 中的 inject 读取 `app.provide` 提供的值。

```js
const apiBase = app.runWithContext(() => inject('apiBase'))   // '/api/v2'
```

**场景：请求拦截器显示翻译后的错误提示。**拦截器不在组件中运行。用 runWithContext 包装，再调用 useI18n。

```js
// main.js
const app = createApp(App).use(i18n).use(toast)

http.interceptors.response.use(res => res, err => {
  app.runWithContext(() => {
    const { t } = useI18n()                   // 内部调用 inject(i18nKey)
    useToast().error(t('error.network'))
  })
  return Promise.reject(err)
})
```

**场景：WebSocket 推送“任务已指派给你”。**消息处理函数也不在组件中运行。用 runWithContext 读取通知插件提供的函数。

```js
export function connectRealtime(app) {
  const ws = new WebSocket('/ws/board')
  ws.onmessage = e => {
    const msg = JSON.parse(e.data)
    if (msg.type !== 'assigned') return
    app.runWithContext(() => {
      const notify = inject(notifyKey)
      notify(`任务“${msg.title}”已指派给你`)
    })
  }
}
```

不要在组件的 setup 中使用 runWithContext，直接调用 inject。Vue Router 4.2+ 的导航守卫也在应用上下文中运行，可以直接调用 inject。runWithContext 只能读取 app.provide 的值，读不到组件 provide 的值。

### 10.5 用 onErrorCaptured 写错误边界

子组件出错时，只让它的区域显示备用内容。`onErrorCaptured(fn)` 捕获所有后代组件的错误。它不捕获本组件自己的错误。

fn 收到三个参数：错误对象、抛出错误的组件实例、错误来源信息。fn 返回 `false` 时，错误停止向上传递。

```vue
// ErrorBoundary.vue
<script setup>
import { ref, onErrorCaptured } from 'vue'

const error = ref(null)
onErrorCaptured((err, instance, info) => {
  error.value = err
  return false                     // 停止传递：errorHandler 不再收到这个错误
})
function retry() { error.value = null }   // 清除错误。插槽内容重新挂载
</script>

<template>
  <div v-if="error" class="fallback">
    出错了：{{ error.message }} <button @click="retry">重试</button>
  </div>
  <slot v-else />
</template>

<!-- 使用 -->
<ErrorBoundary>
  <UserChart :id="userId" />
</ErrorBoundary>
```

只有 ErrorBoundary 内部的区域显示备用内容。页面的其他部分继续正常工作。提供重试按钮。不清除错误时，备用内容一直显示。

onErrorCaptured 捕获下面这些位置的错误：

- setup 和渲染函数。
- 生命周期钩子和侦听器。
- 模板中绑定的事件处理函数。处理函数返回的 Promise 被拒绝时，也会捕获。

onErrorCaptured 不捕获下面这些错误：

- `setTimeout` 回调中的错误。
- 用 `addEventListener` 添加的监听函数中的错误。
- 没有返回给 Vue 的 Promise 中的错误。

对于这些错误，使用 `try/catch` 或 `window.onerror`。

<Exercise id="errorFill" />

<Exercise id="errorBoundary" />

### 10.6 用 errorHandler 上报未捕获的错误

没有错误边界停止的错误，最后交给 `app.config.errorHandler`。在生产环境设置它，把错误上报到监控平台。

```js
app.config.errorHandler = (err, instance, info) => {
  reportToServer(err, info)                       // 上报到监控平台
}
```

下图说明错误怎样向上传递。

<Figure caption="错误从出错组件的父组件开始向上传递。任何钩子返回 false，传递停止。都没有返回 false 时，才调用 errorHandler。">
<ErrorPropagation />
</Figure>

<Lab id="demo-app-plugin" title="实验台：插件和错误边界" note="真实的 createApp、app.use 和 onErrorCaptured">
<template #predict>
<Sc predict :a="2">

先猜：ErrorBoundary 的 onErrorCaptured 返回 false（默认设置）。点击“事件中抛错”。哪些处理函数收到这个错误？

```html
<Panel>              <!-- onErrorCaptured -->
  <ErrorBoundary>    <!-- onErrorCaptured，返回 false -->
    <Bomb/>          <!-- 点击时 throw -->
  </ErrorBoundary>
</Panel>
// 另有 app.config.errorHandler
```

<Opt>只有 errorHandler。事件中的错误不经过组件</Opt>
<Opt>ErrorBoundary、Panel、errorHandler 依次收到</Opt>
<Opt>只有 ErrorBoundary，错误停止传递</Opt>

<template #explain>

解析：事件处理函数中的错误也沿组件树向上传递。最近的 ErrorBoundary 先收到。它返回 false，所以错误停止传递，Panel 和 errorHandler 都收不到。取消“ErrorBoundary 返回 false”后，才是第二项的顺序。打开实验台，点击“事件中抛错”，看日志。

</template>
</Sc>
</template>

<AppPluginLab />
</Lab>

::: deep 错误怎样传递：handleError
Vue 用 `callWithErrorHandling` 调用用户代码。用户代码抛出错误时，Vue 调用 `handleError`：

```js
// runtime-core/src/errorHandling.ts（3.5，简化）
function handleError(err, instance, type) {
  const { errorHandler, throwUnhandledErrorInProduction } = instance.appContext.config
  let cur = instance.parent                       // 从父组件开始，不包括出错的组件
  const info = errorInfo(type)                    // 生产构建中是一个错误文档链接
  while (cur) {
    const hooks = cur.ec                          // ec：这个组件的 errorCaptured 钩子
    if (hooks) {
      for (const hook of hooks) {
        if (hook(err, instance.proxy, info) === false) return   // 返回 false：停止
      }
    }
    cur = cur.parent                              // 继续向上
  }
  if (errorHandler) {
    errorHandler(err, instance.proxy, info)       // 应用级处理函数
    return
  }
  logError(err, throwUnhandledErrorInProduction)  // 开发构建抛出错误。生产构建 console.error
}
```

传递顺序如下：

1. 出错组件的父组件运行 errorCaptured 钩子。
2. 再向上，每个祖先组件依次运行钩子。
3. 任何钩子返回 false，传递立即停止。
4. 没有钩子返回 false，调用 `app.config.errorHandler`。
5. 没有 errorHandler，开发构建抛出错误，生产构建打印错误。

3.5 新增 `app.config.throwUnhandledErrorInProduction`。设为 true 时，生产构建也抛出未处理的错误。

渲染函数抛出错误时，Vue 用一个注释节点代替这个组件的内容。所以页面的其他部分仍然正常显示。
:::

::: pitfalls
1. 在调用 `app.mount()` 之前，完成所有 `app.use` 和 `app.component`。原因：mount 立即渲染。之后注册的组件对首次渲染无效。
2. 不要把 `app.mount()` 的返回值当作 app。原因：它返回根组件实例。实例上没有 use 和 component 方法。
3. 不要只依赖 globalProperties 提供功能。同时提供 provide 和组合式函数。原因：setup 中没有 this，不能直接访问 globalProperties。
4. 在错误边界中提供重试操作。原因：不清除错误时，备用内容一直显示。清除错误后，插槽内容重新挂载。
5. 在生产环境设置 `app.config.errorHandler`。否则错误只出现在用户的控制台中。
:::

::: selfcheck
<Sc :a="2">

运行下面的代码，结果是什么？

```js
createApp(App)
  .use(router)
  .mount('#app')
  .use(pinia)
```

<Opt>pinia 正常安装</Opt>
<Opt>pinia 在下次渲染时生效</Opt>
<Opt>报错。mount 返回根组件实例，它没有 use 方法</Opt>

<template #explain>

解析：use 返回 app，所以可以链式调用。mount 返回根组件实例，不返回 app。把所有 use 放在 mount 之前。

</template>
</Sc>

<Sc :a="1">

Child 在 setup 中抛出错误。组件关系是 Grand → Parent → Child。日志输出什么？

```js
// Grand
onErrorCaptured(() => { log('G') })
// Parent
onErrorCaptured(() => { log('P'); return false })
// Child
onErrorCaptured(() => { log('C') })
throw new Error('x')

app.config.errorHandler = () => log('H')
```

<Opt>C P G H</Opt>
<Opt>P</Opt>
<Opt>P G H</Opt>
<Opt>C P</Opt>

<template #explain>

解析：传递从父组件开始，所以 Child 自己的钩子不运行。Parent 返回 false，传递停止。Grand 的钩子和 errorHandler 都不运行。

</template>
</Sc>

<Sc :a="0">

同一个插件调用了两次 `app.use(plugin)`。install 运行几次？

<Opt>1 次</Opt>
<Opt>2 次</Opt>
<Opt>0 次，并且报错</Opt>

<template #explain>

解析：app 记录已经安装的插件。同一个插件再次安装时，Vue 忽略它。

</template>
</Sc>

<Sc :a="0">

用 `app.use(UI)` 安装下面的插件，没有传选项。结果是什么？

```js
const UI = {
  install(app, options) {
    app.provide('prefix', options.prefix || 'My')
  }
}
```

<Opt>抛出 TypeError：options 是 undefined</Opt>
<Opt>prefix 为 My：Vue 传入了空对象</Opt>
<Opt>prefix 为 undefined，没有报错</Opt>

<template #explain>

解析：`app.use(plugin, options)` 把选项原样传给 install。没有传选项时，options 是 undefined，读取 `options.prefix` 抛出错误。Vue 不提供默认的空对象，所以后两项都不会发生。修复：写 `install(app, options = {})`，再用 `{ ...defaults, ...options }` 合并默认值。

</template>
</Sc>

<Sc :a="1">

回顾（第 7 章）：异步组件的加载函数失败了。父组件有 onErrorCaptured，应用也设置了 errorHandler。会发生什么？

```js
const Chart = defineAsyncComponent({
  loader: () => import('./Chart.vue'),   // 网络错误
  errorComponent: ErrorBox
})
```

<Opt>只显示 ErrorBox，错误不再传递</Opt>
<Opt>显示 ErrorBox，两个处理函数也收到错误</Opt>
<Opt>页面空白，只有 errorHandler 收到错误</Opt>

<template #explain>

解析：第 7 章：加载失败时，异步组件显示 errorComponent。同时，Vue 把错误交给错误处理流程。所以父组件的 onErrorCaptured 先收到，然后是 `app.config.errorHandler`。errorComponent 只决定显示什么，不停止传递。要停止传递，在 onErrorCaptured 中返回 false。没有 errorComponent 时，组件的位置才是空的。

</template>
</Sc>

:::

::: summary
- createApp 创建应用实例。全局组件、指令、provide 和配置都属于这个实例。最后调用 mount。
- 插件是有 install(app, options) 方法的对象。app.use 调用它。
- 插件用 app.onUnmount 清理自己的资源。组件之外用 app.runWithContext 调用 inject。
- onErrorCaptured 返回 false 时，错误停止传递。
- 错误顺序：父组件到根组件的钩子，然后是 errorHandler，最后是控制台。
:::
