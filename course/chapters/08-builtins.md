---
title: 内置组件
id: builtins
stage: 2
chapter: 8
desc: Transition、KeepAlive、Teleport、Suspense、异步组件
---

<script setup>
import TransitionClasses from '../figures/08-builtins/TransitionClasses.vue'
import KeepAliveCachesInstance from '../figures/08-builtins/KeepAliveCachesInstance.vue'
import BuiltinsPlayground from '../labs/08-builtins/BuiltinsPlayground.vue'
import KeepAliveModes from '../labs/08-builtins/KeepAliveModes.vue'
import SuspenseAsync from '../labs/08-builtins/SuspenseAsync.vue'
</script>

# 内置组件

::: goals
<Goal checks="sc:2">用 Transition 和 TransitionGroup 为元素添加动画。</Goal>
<Goal checks="sc:0,ex:keepTab,ex:keepAliveFill">用 KeepAlive 保留组件的状态。</Goal>
<Goal checks="sc:1,ex:teleportFill">用 Teleport 把弹窗渲染到 body 中。</Goal>
<Goal checks="sc:3">用动态组件、异步组件和 Suspense 按需加载组件。</Goal>

:::

::: rt
阅读主线约 18 分钟，深入内容约 2 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
内置组件像舞台上的**后台工作人员**：Transition 负责灯光渐变，KeepAlive 把暂时下场的演员留在后台，Teleport 把一个演员送到另一个舞台，Suspense 在演员化妆时先放一段暖场音乐。
:::

::: terms
Transition
: 为一个元素的进入和离开添加动画。

TransitionGroup
: 为列表中每个元素的进入、离开和移动添加动画。

Teleport
: 把内容渲染到页面中的另一个位置。

异步组件
: 需要时才下载代码的组件。

Suspense
: 等待异步组件加载时，先显示另一段内容。
:::

::: why
你用 v-if 关闭弹窗。弹窗立即消失，没有离开动画。切换标签页后再切回，输入框中的文字丢失了。父元素有 `overflow: hidden` 时，弹窗被裁切。

原因：v-if 立即删除元素。切走的组件被卸载，它的状态也被删除。弹窗的位置受父元素的样式限制。

本章用 Transition 添加动画，用 KeepAlive 保留组件。用 Teleport 把弹窗移到 body 中。
:::

本章介绍 Transition、TransitionGroup、Teleport、KeepAlive 和 Suspense 这 5 个内置组件，以及动态组件和异步组件。使用内置组件时，不需要导入或注册。

### 8.1 用 Transition 添加进入和离开动画

v-if 立即删除元素，没有动画。`<Transition>` 包住一个元素或组件。元素插入或删除时，Vue 在元素上添加和删除类名。你在这些类名中写 CSS 过渡。

```vue
<Transition name="fade">
  <p v-if="show">你好</p>
</Transition>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

Vue 一共使用 6 个类名。设置 `name="fade"` 后，前缀 `v-` 变为 `fade-`。

| 类名 | 存在的时间 |
|---|---|
| `v-enter-from` | 插入前添加。插入后的下一帧删除。 |
| `v-enter-active` | 整个进入过程。在这里写 `transition` 属性。 |
| `v-enter-to` | 插入后的下一帧添加。动画结束时删除。 |
| `v-leave-from` | 删除开始时添加。下一帧删除。 |
| `v-leave-active` | 整个离开过程。 |
| `v-leave-to` | 离开的下一帧添加。动画结束后，元素被删除。 |

下图按时间顺序显示这 6 个类名。

<Figure caption="进入和离开各用 3 个类名。active 覆盖整个过程，from 只存在 1 帧，to 一直保留到动画结束。">
<TransitionClasses />
</Figure>

**场景：“编辑”按钮和“保存”按钮在同一位置切换。**默认模式下，新元素进入和旧元素离开同时进行，两个按钮会短暂重叠。`mode="out-in"` 让旧元素先离开。两个元素的标签相同时，给它们不同的 key。

```html
<Transition name="fade" mode="out-in">
  <button v-if="editing" key="save">保存</button>
  <button v-else key="edit">编辑</button>
</Transition>
```

- v-if、v-show 和动态组件的切换都会触发动画。
- `appear` 属性让元素在第一次渲染时也运行进入动画。
- Transition 也发出 JavaScript 钩子事件，例如 `@before-enter`、`@enter`、`@after-leave`。`@enter` 和 `@leave` 的处理函数接收第二个参数 `done`。声明了 done 时，Vue 等待你调用 done，不再根据 CSS 判断动画结束。

注意：Transition 只接受一个子元素。子组件也只能有一个根元素。

### 8.2 用 TransitionGroup 为列表添加动画

`<TransitionGroup>` 为 v-for 列表中每个元素的进入、离开和移动添加动画。它和 Transition 有三个区别：

1. 每个子元素必须有唯一的 key。
2. 默认不渲染外层元素。用 `tag="ul"` 指定外层元素。
3. 元素位置改变时，Vue 添加 `v-move` 类。在这个类中写 transform 的过渡。

**场景：任务列表中添加、删除和排序任务。**新任务从右边滑入。删除一项时，其他项平滑移到新位置。

```vue
<TransitionGroup name="list" tag="ul">
  <li v-for="item in items" :key="item.id">{{ item.text }}</li>
</TransitionGroup>

<style>
.list-move, .list-enter-active, .list-leave-active { transition: all 0.5s; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateX(30px); }
.list-leave-active { position: absolute; }   /* 离开的元素不占位置，其他元素才能平滑移动 */
</style>
```

注意：TransitionGroup 不支持 `mode` 属性。

### 8.3 用 Teleport 把弹窗渲染到 body 中

父元素的 `overflow: hidden`、`transform` 或 `z-index` 会影响组件内的弹窗。`<Teleport>` 把内容渲染到其他 DOM 位置，例如 body。

```html
<button @click="open = true">打开弹窗</button>

<Teleport to="body">
  <div v-if="open" class="modal">
    <p>弹窗内容</p>
    <button @click="open = false">关闭</button>   <!-- 仍然可以访问组件的数据 -->
  </div>
</Teleport>
```

- `to` 接受 CSS 选择器或 DOM 元素。Teleport 挂载时，目标元素必须已经存在。
- Teleport 只改变 DOM 位置。组件关系不变：props、事件、provide 和 inject 照常工作。

**场景：宽屏用弹窗，窄屏在原位置显示任务详情。**`disabled` 为 true 时，内容留在组件中。为 false 时，内容移到 body。切换时 Vue 移动已有的 DOM，表单内容不丢失。

```vue
const narrow = ref(window.innerWidth < 640)

// 模板
<Teleport to="body" :disabled="narrow">
  <TaskDetail v-if="selected" :task="selected" :class="{ modal: !narrow }" />
</Teleport>
```

**场景：各组件的提示都显示在同一个容器中。**多个 Teleport 可以使用同一个目标。Vue 按挂载顺序把内容追加到目标中。目标写在同一模板的后面时，加 `defer`（Vue 3.5 及以上）。defer 让 Teleport 在当前渲染完成后才查找目标。

```html
// App.vue 模板
<RouterView />
<div id="toasts"></div>               <!-- 在 Teleport 后面渲染。使用 defer 时可以找到 -->

// TaskEditor.vue 模板
<Teleport defer to="#toasts">
  <div v-if="saved" class="toast">任务已保存</div>
</Teleport>
```

注意：不要用 v-if 包住 Teleport 来切换位置。这样会删除并重新创建内容，状态丢失。用 `disabled` 切换位置。

<Exercise id="teleportFill" />

下面的实验台有三个标签页，分别演示 Transition、TransitionGroup 和 Teleport。

<Lab id="demo-builtins" title="实验台：Transition、TransitionGroup 和 Teleport" note="每个标签页运行真实的 Vue">
<template #predict>
<Sc predict :a="1">

先猜：弹窗写在一个带 overflow: hidden 的框中，并用 Teleport 包裹。打开弹窗后，遮罩层的父元素是什么？

```html
<div class="trap">  <!-- overflow: hidden -->
  <Teleport to="body">
    <div v-if="open" class="mask">…</div>
  </Teleport>
</div>
```

<Opt>带 overflow: hidden 的框</Opt>
<Opt>\<body> 元素</Opt>
<Opt>一个 \<teleport> 元素</Opt>

<template #explain>

解析：Teleport 把内容渲染到 to 指定的元素中，所以遮罩层的父元素是 body。框的 overflow 不再限制弹窗。Teleport 本身不生成元素，只在原位置留下注释。勾选 disabled 时，弹窗才留在框中。打开实验台，切换到“Teleport”标签页，点击“打开弹窗”。看弹窗后面灰色框中的文字。

</template>
</Sc>
</template>

<BuiltinsPlayground />
</Lab>

::: deep Teleport 怎样移动内容
Teleport 不是普通组件。渲染器遇到它时，调用 `TeleportImpl.process`：

```js
// runtime-core/components/Teleport.ts（简化）
process(n1, n2, container, anchor) {
  const disabled = n2.props && n2.props.disabled
  if (n1 == null) {                                   // 第一次挂载。生产模式用空文本节点代替注释
    insert(n2.el = createComment('teleport start'), container, anchor)
    insert(n2.anchor = createComment('teleport end'), container, anchor)
    const mountToTarget = () => {
      const target = n2.target = querySelector(n2.props.to)
      if (!disabled) mountChildren(n2.children, target)   // 子节点挂载到目标元素中
    }
    if (disabled) mountChildren(n2.children, container, n2.anchor)   // 留在原位置
    if (n2.props.defer) queuePostRenderEffect(mountToTarget)   // 3.5：渲染完成后再查找目标
    else mountToTarget()
  } else {
    patchChildren(n1, n2)                             // 正常 patch 子节点
    if (disabled 改变 || to 改变) moveTeleport(n2, 新位置)  // 把子节点的 DOM 移过去
  }
}
```

- 原位置只留下两个占位节点。开发模式下，它们是 teleport start 和 teleport end 注释。生产模式下，它们是空文本节点。
- 子节点的 vnode 仍然是 Teleport 的子节点。所以组件关系不变。
- to 或 disabled 改变时，Vue 移动已有的 DOM，不重新创建。
:::

### 8.4 动态组件和 KeepAlive

`<component :is="...">` 渲染 is 指定的组件。is 的值可以是组件对象，也可以是已注册组件的名称。它适合标签页这类“同一位置显示不同组件”的界面。

```vue
import Home from './Home.vue'
import Settings from './Settings.vue'
const tabs = { Home, Settings }
const current = ref('Home')

// 模板
<button v-for="(_, name) in tabs" :key="name" @click="current = name">{{ name }}</button>
<KeepAlive>
  <component :is="tabs[current]" />
</KeepAlive>
```

切换组件时，Vue 卸载旧组件。旧组件的状态丢失，例如输入框中的文字。`<KeepAlive>` 不卸载旧组件。它把旧组件的实例和 DOM 保存在缓存中。组件再次显示时，Vue 直接使用缓存。下图比较两种结果。

<Figure caption="没有 KeepAlive 时，切回 A 会创建新实例。有 KeepAlive 时，A 进入缓存，切回时恢复原来的实例。">
<KeepAliveCachesInstance />
</Figure>

<Exercise id="keepTab" />

KeepAlive 有三个属性：

| 属性 | 作用 |
|---|---|
| `include` | 只缓存名称匹配的组件。接受逗号分隔的字符串、正则表达式或数组。 |
| `exclude` | 不缓存名称匹配的组件。 |
| `max` | 最多缓存的实例数。超出时，删除最久没有使用的实例。 |

**场景：只缓存任务列表，不缓存编辑页。**返回列表时保留筛选和滚动状态。编辑页每次打开都要显示新数据。用 `include` 列出要缓存的组件名称。

```html
<RouterView v-slot="{ Component }">
  <KeepAlive include="TaskList,TaskBoard">
    <component :is="Component" />
  </KeepAlive>
</RouterView>
// TaskList.vue 的名称默认是文件名 TaskList
```

**场景：多个任务详情标签页，各自保留状态。**同一个组件默认只有一份缓存。用任务 id 作为 key，每个任务一份缓存。用 `max` 限制数量，超出时 Vue 卸载最久没有使用的实例。

```html
<KeepAlive :max="5">
  <TaskDetail :key="taskId" :id="taskId" />
</KeepAlive>
```

注意：include 和 exclude 匹配组件的 `name` 选项。`<script setup>` 组件的 name 默认是文件名（Vue 3.2.34 及以上）。改文件名后，要同时修改 include。不要缓存所有页面又不设置 max，否则内存占用一直增长。

被缓存的组件切走时不卸载，所以 onMounted 和 onUnmounted 不随切换运行。用 onActivated 和 onDeactivated 刷新数据或暂停轮询，见[第 6 章](/chapters/06-lifecycle)。

<Lab id="demo-bi-keep" title="实验台：有和没有 KeepAlive" note="在输入框中输入文字，然后切换标签页">
<template #predict>
<Sc predict :a="2">

先猜：选择模式 \<KeepAlive :max="2">。依次点击 TabA、TabB、TabC。哪个组件实例被销毁？

<Opt>没有。缓存超出时只显示警告</Opt>
<Opt>TabC。缓存已满，新组件不缓存</Opt>
<Opt>TabA。它最久没有使用</Opt>

<template #explain>

解析：max 限制缓存的实例数量。缓存超出时，KeepAlive 销毁最久没有使用的实例，所以 TabA 被销毁。新组件总是进入缓存。Vue 不显示警告，而是直接销毁旧实例。打开实验台，选择 max=2 模式，依次点击 A、B、C，看日志中的 onUnmounted。

</template>
</Sc>
</template>

<KeepAliveModes />
</Lab>

<Exercise id="keepAliveFill" />

::: deep KeepAlive 怎样缓存组件
KeepAlive 是一个普通组件。它的 setup 创建一个 Map 和一个 Set：

```js
// runtime-core/components/KeepAlive.ts（简化）
setup(props, { slots }) {
  const cache = new Map()            // key → 被缓存的组件 vnode（包含实例和 DOM）
  const keys = new Set()             // 记录使用顺序。最前面的 key 最久没有使用
  const storageContainer = document.createElement('div')   // 不在页面中的容器

  ctx.deactivate = (vnode) => {
    move(vnode, storageContainer)    // 把 DOM 移到隐藏容器，不销毁
    queuePostRenderEffect(() => callHooks(vnode.component.da))   // onDeactivated
  }
  ctx.activate = (vnode, container, anchor) => {
    move(vnode, container, anchor)   // 把 DOM 移回页面
    queuePostRenderEffect(() => callHooks(vnode.component.a))    // onActivated
  }

  return () => {
    const vnode = slots.default()[0]
    const name = vnode.type.name
    if ((props.include && !matches(props.include, name)) ||
        (props.exclude && matches(props.exclude, name))) {
      return vnode                   // 不缓存，按普通组件处理
    }
    const key = vnode.key == null ? vnode.type : vnode.key   // 没有 key 时，用组件对象作为 key
    const cached = cache.get(key)
    if (cached) {
      vnode.component = cached.component       // 复用实例
      vnode.shapeFlag |= COMPONENT_KEPT_ALIVE  // 渲染器看到这个标记，调用 activate，不重新挂载
      keys.delete(key); keys.add(key)          // 移到最后：最近使用
    } else {
      keys.add(key)
      if (props.max && keys.size > props.max) {
        pruneCacheEntry(keys.values().next().value)   // 删除最久没有使用的实例，真正卸载它
      }
    }
    vnode.shapeFlag |= COMPONENT_SHOULD_KEEP_ALIVE    // 渲染器卸载时调用 deactivate
    return vnode
  }
}
```

这段代码说明了三件事：

1. 缓存的 key 默认是组件对象。同一个组件只有一份缓存。要为同一个组件保存多份状态，给它不同的 key。
2. 失活的组件没有卸载。它的 DOM 在隐藏容器中，它的侦听器仍然运行。
3. max 使用 LRU 策略。Set 保持插入顺序，所以第一个 key 就是最久没有使用的 key。

KeepAlive 实验台中，选择“max=2”，然后依次打开 A、B、C。日志显示 A 被卸载。
:::

### 8.5 用 defineAsyncComponent 按需加载组件

图表、富文本编辑器等组件的代码很大。`defineAsyncComponent` 创建一个包装组件。第一次渲染时，它才调用加载函数。构建工具把 `import()` 导入的组件打包为单独的文件。

```js
import { defineAsyncComponent } from 'vue'

const Chart = defineAsyncComponent(() => import('./Chart.vue'))
// 模板：<Chart v-if="showReport" />   showReport 第一次为 true 时才下载 Chart
```

**场景：编辑器加载较慢，网络也可能失败。**使用完整选项，显示加载状态和错误状态。

```js
const Editor = defineAsyncComponent({
  loader: () => import('./Editor.vue'),
  loadingComponent: Spinner,     // 加载时显示
  delay: 200,                    // 200ms 后才显示 Spinner。默认值 200
  errorComponent: LoadFailed,    // 加载失败或超时时显示，接收 error prop
  timeout: 3000                  // 3000ms 后视为超时。默认值 Infinity
})
```

- 加载成功后，包装组件保存结果。以后再渲染时，不再调用加载函数。
- delay 防止加载很快时，加载组件闪一下。

注意：异步组件在外层 Suspense 中时，默认受 Suspense 控制。这时它的 loadingComponent、delay 和 timeout 不生效。设置 `suspensible: false` 让它自己处理加载状态。

<Lab id="demo-bi-async" title="实验台：Suspense 和 defineAsyncComponent" note="日志显示加载过程的每一步">
<template #predict>
<Sc predict :a="1">

先猜：把加载耗时设为 3000ms，点击“创建并加载”。页面依次显示什么？

```css
defineAsyncComponent({
  loader,             // 3000ms 后完成
  loadingComponent, errorComponent,
  delay: 200, timeout: 2000
})
```

<Opt>加载中，然后一直显示错误组件</Opt>
<Opt>加载中，错误组件，最后显示真正的组件</Opt>
<Opt>一直显示加载中，3000ms 后显示组件</Opt>

<template #explain>

解析：200ms 后显示加载组件。2000ms 时超时，显示错误组件。原因：超时只设置错误，不取消 loader。所以 3000ms 时 loader 完成，Vue 换成真正的组件。第一项以为超时取消了加载。第三项忽略了 timeout。打开实验台，把耗时拖到 3000ms，点击“创建并加载”。等 4 秒，看日志。

</template>
</Sc>
</template>

<SuspenseAsync />
</Lab>

### 8.6 用 Suspense 等待 async setup

组件的 setup 是 async 函数时，这个组件是异步组件。`<script setup>` 中有顶层 `await` 时，也是这样。`<Suspense>` 等待默认插槽中所有异步组件完成。等待期间，它显示 `#fallback` 插槽。

```vue
<!-- Profile.vue -->
<script setup>
const res = await fetch('/api/user')       // 顶层 await：setup 变为 async 函数
const user = await res.json()
</script>

<!-- 父组件 -->
<Suspense>
  <Profile />                               <!-- 可以包含多个异步组件 -->
  <template #fallback>加载中…</template>
</Suspense>
```

**场景：任务详情页同时等待任务和评论。**TaskInfo 和 CommentList 都在 setup 中 await 请求。把它们放在同一个 Suspense 中。两个请求都完成前，页面只显示一个“加载中”，不会先后闪出两块内容。

```html
<Suspense>
  <div class="task-detail">
    <TaskInfo :id="id" />        <!-- await api.getTask(id) -->
    <CommentList :id="id" />     <!-- await api.getComments(id) -->
  </div>
  <template #fallback>加载中…</template>
</Suspense>
```

- async setup 的组件必须放在 Suspense 中。否则它不渲染。
- Suspense 发出 `pending`、`resolve` 和 `fallback` 事件。
- Suspense 不处理错误。用 `onErrorCaptured`（[第 10.5 节](/chapters/10-app)）捕获异步 setup 中的错误。

注意：Suspense 目前是实验性功能。它的 API 以后可能改变。

8.5 节的实验台“Suspense 和 defineAsyncComponent”演示了 Suspense 的加载过程。回到那个实验台，比较组件在 Suspense 中和不在 Suspense 中的日志。

::: pitfalls
1. Transition 中只放一个元素。要为列表添加动画，使用 TransitionGroup。原因：Transition 一次只控制一个元素的进入和离开。
2. TransitionGroup 中的每个元素都要写 key。不要用 index 作为 key。否则移动动画不正确。
3. 在 onDeactivated 中停止轮询，不要只在 onUnmounted 中停止。原因：被缓存的组件失活时，Vue 只运行 onDeactivated。onUnmounted 不运行。
4. 使用 include 时，确认组件的 name 正确。否则名称不匹配，组件不被缓存。
5. 不要在 Teleport 挂载前删除目标元素。否则 Teleport 找不到目标，内容不渲染。
6. 不要在生产环境依赖 Suspense 的细节行为。原因：它仍是实验性功能，细节行为可能改变。
:::

::: selfcheck
<Sc :a="1">

组件 A 放在 `<KeepAlive>` 中。从 A 切换到 B，再切回 A。A 的哪些钩子依次运行？

<Opt>onMounted → onUnmounted → onMounted</Opt>
<Opt>onMounted → onActivated → onDeactivated → onActivated</Opt>
<Opt>onMounted → onDeactivated → onMounted</Opt>

<template #explain>

解析：第一次挂载时，onMounted 和 onActivated 都运行。切走时，A 失活，onDeactivated 运行。A 没有卸载，所以 onUnmounted 不运行。切回时，只运行 onActivated。

</template>
</Sc>

<Sc :a="0">

父组件调用 `provide('k', 'ok')`。子组件放在 `<Teleport to="body">` 中，并调用 `inject('k')`。inject 返回什么？

<Opt>'ok'</Opt>
<Opt>undefined。子组件的 DOM 不在父组件中</Opt>
<Opt>报错。Teleport 中不能调用 inject</Opt>

<template #explain>

解析：Teleport 只改变 DOM 位置。组件关系不变，所以 provide 和 inject 照常工作。

</template>
</Sc>

<Sc :a="2">

设置了 `name="fade"`。离开动画的终点样式（例如 `opacity: 0`）写在哪个类中？

<Opt>.fade-leave-from</Opt>
<Opt>.v-leave-to</Opt>
<Opt>.fade-leave-to</Opt>

<template #explain>

解析：-to 类在离开开始后的下一帧添加，它保存终点样式。设置 name 后，前缀 v- 变为 fade-。所以 .v-leave-to 不生效。

</template>
</Sc>

<Sc :a="0">

`Chart = defineAsyncComponent(() => import('./Chart.vue'))`。模板写 `<Chart v-if="show" />`。show 初始为 false，之后切换多次。加载函数什么时候运行？

<Opt>show 第一次为 true 时，只运行一次</Opt>
<Opt>调用 defineAsyncComponent 时立即运行</Opt>
<Opt>每次 show 变为 true 时都运行一次</Opt>

<template #explain>

解析：defineAsyncComponent 只创建一个包装组件。包装组件第一次渲染时，才调用加载函数。所以调用 defineAsyncComponent 时不加载。加载成功后，包装组件保存结果。以后再渲染时，不再调用加载函数。所以只运行一次。

</template>
</Sc>

<Sc :a="1">

回顾（第 4 章）：标签页用 KeepAlive 缓存。tab 从 A 切换到 B。下面的侦听器打印什么？

```vue
<div ref="box">
  <KeepAlive><component :is="tab === 'A' ? A : B" /></KeepAlive>
</div>

watch(tab, () => console.log(box.value.textContent))
```

<Opt>B 的内容，KeepAlive 已切换</Opt>
<Opt>A 的内容，DOM 还没有更新</Opt>
<Opt>空字符串，B 还没有挂载</Opt>

<template #explain>

解析：第 4 章：watch 默认 `flush: 'pre'`，回调在组件更新之前运行。这时 DOM 中仍是 A。要读到 B，设置 `flush: 'post'`，或在回调中 `await nextTick()`（第 6 章）。KeepAlive 只决定是否缓存，不改变侦听器运行的时间。回调运行时，A 还在 DOM 中，所以不是空字符串。

</template>
</Sc>

:::

::: summary
- Transition 在插入和删除时添加 6 个类名。mode="out-in" 让旧元素先离开。TransitionGroup 还添加 move 类。
- Teleport 改变 DOM 位置，不改变组件关系。disabled 切换位置，defer 等待后面的目标。
- KeepAlive 缓存动态组件的实例。include 选择要缓存的组件，max 限制数量。
- defineAsyncComponent 按需加载组件。Suspense 等待 async setup。
:::
