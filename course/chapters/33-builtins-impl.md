---
title: 内置组件的实现
id: builtins-impl
stage: 5
optional: true
chapter: 33
desc: KeepAlive、Teleport、Transition、Suspense 和异步组件在运行时里怎样实现
---

<script setup>
import KeepAliveHidden from '../labs/33-builtins-impl/KeepAliveHidden.vue'
</script>

# 内置组件的实现

::: goals
<Goal checks="sc:0">区分普通组件形式的内置组件和 patch 里有专门分支的内置组件，并说明渲染器怎样认出它们。</Goal>
<Goal checks="sc:2,sc:3,ex:miniKeepAlive">写出带 LRU 的迷你 KeepAlive，说明失活和激活为什么只是搬家，include 怎样匹配。</Goal>
<Goal checks="sc:1">说明 Teleport 的锚点、disabled 和 defer，以及逻辑关系和 DOM 事件冒泡为什么走不同的路。</Goal>
<Goal checks="sc:4,sc:5,sc:6,ex:miniEnter">写出进入序列的 class 变化，说明离开时 DOM 移除被推迟的原因，以及 FLIP 的做法。</Goal>
<Goal checks="sc:7,sc:8,sc:9,sc:10">说明 Suspense 怎样登记异步依赖并在计数归零时 resolve，以及异步组件的两条路径。</Goal>

:::

::: rt
阅读主线约 20 分钟，深入内容约 4 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
想象一个**剧场后台**。普通组件是演员，只管在台上演，上哪个台由舞台经理（渲染器）决定。

KeepAlive 是**侧幕**：演员下场不卸妆回家，站在侧幕里等，服装和道具原样保留。Teleport 是**转播车**：节目的人员编制不变，画面却出现在另一块屏幕上。Suspense 是**彩排厅**：节目先在后台排好，全部就绪才推上舞台，没好之前观众看串场。
:::

::: terms
隐藏容器
: 创建出来但从不插进页面的 DOM 元素。KeepAlive 和 Suspense 用它暂存暂时不该显示的 DOM。

锚点
: 渲染器用来标记一段内容位置的空节点，开发版是注释节点，生产版是空文本节点。

过渡钩子
: 挂在 vnode 的 `transition` 属性上的一组函数，渲染器插入和移除元素时调用它们。

异步依赖
: 组件 `async setup` 返回的 Promise。Suspense 等它完成才显示内容。
:::

::: why
你给 KeepAlive 里的组件写了 `onMounted` 去请求数据。切走再切回来，数据没有刷新。

你把弹窗 `Teleport` 到 `body`。弹窗的 DOM 在页面另一端，却仍然读得到祖先的 `provide`，而页面上的点击事件却不再冒泡到原来的父元素。

你给 `Suspense` 写了 `fallback`。第一次加载显示了它，之后切换内容再也不显示。

这些现象的原因都在实现里。内置组件不是魔法，是运行时里几十行到几百行具体的代码。第 9 章讲怎样用，本章对着 Vue 3.5.43 的源码讲它们怎样工作。
:::

### 33.1 两类内置组件：普通组件，和 patch 里的专门分支

第 9 章的五个内置组件，实现分成两类。

| 内置组件 | 实现方式 | 渲染器怎样认出它 |
|---|---|---|
| `KeepAlive` | 普通有状态组件，返回渲染函数 | 类型上的 `__isKeepAlive`，加 vnode 的两个 shapeFlag 位 |
| `BaseTransition`、`Transition`、`TransitionGroup` | 普通组件 | 子 vnode 上的 `transition` 属性 |
| `Teleport`、`Suspense` | 特殊的 vnode 类型，类型对象带 `process` 方法 | `shapeFlag` 的 `TELEPORT`（64）和 `SUSPENSE`（128） |
| `defineAsyncComponent` | 返回一个包装组件 | 包装组件上的 `__asyncLoader` |

**普通组件只能返回一棵子树，放在哪里由渲染器决定。**Teleport 要把子节点挂到别的容器。Suspense 要先把子树挂进隐藏容器。它们必须自己调用 `mountChildren`、`move`、`unmount` 这些内部函数，所以 31.2 节的 `patch` 分发代码最后两个分支直接调用 `type.process(n1, n2, container, anchor, …, internals)`，把渲染器的内部函数作为 `internals` 传进去。

渲染器不直接 `import` Teleport，而是检查类型上的 `__isTeleport` 标记。源码注释写明了原因：直接导入会让 Teleport 没法被 tree-shaking 摇掉。

KeepAlive 虽然是普通组件，也要用渲染器的内部接口。`mountComponent` 看到它时，把 `internals` 存到 `instance.ctx.renderer`。KeepAlive 的 `setup` 从那里取出 `move`、`unmount` 和 `createElement`，再把 `activate`、`deactivate` 两个函数挂回 `instance.ctx`，供渲染器回调。

vnode 上的四个位就是这些约定的暗号：

| 位 | 值 | 谁设置 | 渲染器看到后 |
|---|---|---|---|
| `TELEPORT` / `SUSPENSE` | 64 / 128 | `createVNode` 按类型标记设置 | 调 `type.process`，移动和卸载也交给类型对象 |
| `COMPONENT_SHOULD_KEEP_ALIVE` | 256 | KeepAlive 的渲染函数 | 卸载时调 `ctx.deactivate`，不真的卸载 |
| `COMPONENT_KEPT_ALIVE` | 512 | KeepAlive 的渲染函数 | 挂载时调 `ctx.activate`，不调 `mountComponent` |

第 32 章说过自定义渲染器里哪些内置功能可用：KeepAlive、Teleport、Suspense、`defineAsyncComponent` 只依赖 `RendererOptions`，而 `Transition` 要读 `classList` 和 `getComputedStyle`，属于 runtime-dom。

### 33.2 KeepAlive：失活不是卸载，是搬家

问题：切走一个组件时，不销毁它，状态和 DOM 都保留。下面是 `runtime-core/components/KeepAlive.ts` 的简化版：

```js
// runtime-core/components/KeepAlive.ts（简化）
setup(props, { slots }) {
  const cache = new Map()   // key -> 组件 vnode（带着 el 和 component）
  const keys = new Set()    // 使用顺序：最前面最久没用
  let pendingCacheKey = null
  const { p: patch, m: move, um: unmount, o: { createElement } } = instance.ctx.renderer
  const storageContainer = createElement('div')          // 隐藏容器

  instance.ctx.activate = (vnode, container, anchor) => {
    const child = vnode.component
    move(vnode, container, anchor, MoveType.ENTER)        // DOM 搬回页面
    patch(child.vnode, vnode, container, anchor /* … */)  // props 可能变了，补一次 patch
    queuePostRenderEffect(() => { child.isDeactivated = false; invokeArrayFns(child.a) })
  }
  instance.ctx.deactivate = (vnode) => {
    const child = vnode.component
    move(vnode, storageContainer, null, MoveType.LEAVE)   // DOM 搬进隐藏容器
    queuePostRenderEffect(() => { invokeArrayFns(child.da); child.isDeactivated = true })
  }

  const cacheSubtree = () => cache.set(pendingCacheKey, getInnerChild(instance.subTree))
  onMounted(cacheSubtree)   // 渲染完才有 vnode.component，所以这时才写进缓存
  onUpdated(cacheSubtree)

  return () => {
    const vnode = slots.default()[0]
    // include / exclude 不匹配：原样返回，当普通组件
    const key = vnode.key == null ? vnode.type : vnode.key
    pendingCacheKey = key
    const cached = cache.get(key)
    if (cached) {
      vnode.el = cached.el
      vnode.component = cached.component                  // 复用实例，不再创建
      vnode.shapeFlag |= COMPONENT_KEPT_ALIVE             // 让渲染器调 activate
      keys.delete(key); keys.add(key)                     // 刷新使用顺序
    } else {
      keys.add(key)
      if (max && keys.size > max) pruneCacheEntry(keys.values().next().value)   // LRU 淘汰
    }
    vnode.shapeFlag |= COMPONENT_SHOULD_KEEP_ALIVE        // 让渲染器卸载时调 deactivate
    return vnode
  }
}
```

渲染器这一侧各有一行。`processComponent` 里：`n2.shapeFlag & 512` 为真就调 `parentComponent.ctx.activate`，否则才 `mountComponent`。`unmount` 里：`shapeFlag & 256` 为真就调 `ctx.deactivate(vnode)` 并直接返回。

所以：

- 失活只做两件事：`move` 把 DOM 搬进隐藏容器，把 `da` 数组里的钩子放进后置队列。组件实例、它的 `setup` 状态、它的侦听器都没有动。
- 激活是 `move` 搬回来，再补一次 `patch`（父组件传的 props 可能已经变了），把 `a` 数组放进后置队列。
- `max` 是上限，**包括当前正在显示的那个**。`keys` 是 `Set`，遍历顺序等于插入顺序，所以 `keys.values().next().value` 永远是最久没用的。命中时先 `delete` 再 `add`，就把它移到了最后。
- `move` 带着 `MoveType`（进入或离开），所以 KeepAlive 外面包 `Transition` 时，激活和失活也会触发进入和离开动画。

<Lab id="demo-ka-hidden" title="实验台：KeepAlive 的隐藏容器和淘汰顺序" note="真实的 KeepAlive 加自定义渲染器：能直接看到 KeepAlive 造的隐藏容器里有什么">
<template #predict>
<Sc predict :a="1">

先猜：max 是 2。依次切到 TabA、TabB、TabC。这时隐藏容器里有几个组件的 DOM？

<Opt>2 个：A 和 B</Opt>
<Opt>1 个：只有 B</Opt>
<Opt>0 个：失活的组件都被销毁了</Opt>

<template #explain>

解析：`max` 把正在显示的也算上。放进 C 时，缓存是 A、B、C 三个，超过 2，最久没用的 A 被淘汰（卸载并移除）。留下 B、C：C 在页面上，B 在隐藏容器里。第一项忘了当前显示的 C 也占一个名额。

</template>
</Sc>
</template>

<KeepAliveHidden />
</Lab>

**onActivated 注册到哪里。**`activate` 只认识 KeepAlive 的直接子组件，它调用的是这个组件的 `a` 数组。但你可能在更深的后代里写 `onActivated`。`registerKeepAliveHook` 把钩子注册到后代自己身上之外，还沿着 `parent` 往上走，一遇到 `current.parent` 是 KeepAlive，就把同一个函数**前插**到那个直接子组件的 `a` 里。后代卸载时再摘掉。所以嵌套的后代也会在激活时运行，顺序是后代先、祖先后。注册进去的是一个包装函数：只要祖先链上有任何一个组件处于失活状态，就不执行。

第一次显示一个被缓存的组件时，渲染器看到 `shapeFlag & 256`，会在挂载完成后追加运行 `a`。所以首次显示是 `onMounted` 再 `onActivated`。

**include 和 exclude**按组件名匹配，名字取 `component.name`，没有就取 `__name`。`<script setup>` 的单文件组件由编译器按文件名生成 `__name`，所以 `Foo.vue` 能被 `include="Foo"` 匹配到。设置了 `include` 而组件没有任何名字时，它不会被缓存。改变 `include` 或 `exclude` 时，一个 `flush: 'post'` 的侦听器会清理缓存里不再匹配的条目。

::: note
知道了实现，下面这些现象就不再奇怪：`onMounted` 只在第一次运行，每次显示都要做的事放进 `onActivated`；失活组件里的 `watch` 仍然会响应数据变化（实例没有停）；没有名字的组件在设置了 `include` 之后永远不会缓存。
:::

下面的练习让你自己写一遍搬家加 LRU。它直接操作 DOM，所以不需要渲染器的内部接口。

<Exercise id="miniKeepAlive" />

迷你版和真实实现的关键差别：真实的缓存里放的是 vnode，搬家由渲染器的 `move` 完成（处理 Fragment、组件和过渡）；钩子进后置队列，不是同步调用；`activate` 还要补一次 `patch`；缓存是在 `onMounted` 和 `onUpdated` 里写入的。

### 33.3 Teleport：两个锚点，加一个目标容器

问题：子节点要出现在页面另一个位置，组件关系却不能变。`TeleportImpl.process` 在挂载时做三件事：

```js
// runtime-core/components/Teleport.ts（简化）
process(n1, n2, container, anchor, parentComponent, parentSuspense /* … */) {
  const disabled = isTeleportDisabled(n2.props)
  if (n1 == null) {
    // 1. 原位置留两个锚点
    const placeholder = (n2.el = createComment('teleport start'))   // 生产版是空文本节点
    const mainAnchor = (n2.anchor = createComment('teleport end'))
    insert(placeholder, container, anchor)
    insert(mainAnchor, container, anchor)

    // 3.5 的 defer：把后面的步骤推迟到整棵树挂完之后
    if (isTeleportDeferred(n2.props) || parentSuspense?.pendingBranch) {
      queuePostRenderEffect(mountJob, parentSuspense)
      return
    }
    if (disabled) mountChildren(n2.children, container, mainAnchor, parentComponent /* … */)   // 就地渲染
    mountToTarget()
  } else {
    // 更新：子节点照常 patch，到它们此刻所在的容器里（wasDisabled 是上一次的 disabled）
    patchChildren(n1, n2, wasDisabled ? container : n1.target, wasDisabled ? mainAnchor : n1.targetAnchor /* … */)
    // disabled 切换，或者 to 变了：把已有的 DOM 移过去，不重新创建
    if (disabled 变了 || to 变了) moveTeleport(n2, 新容器, /* … */)
  }
}

function mountToTarget() {
  const target = (n2.target = resolveTarget(n2.props, querySelector))   // to：选择器或节点
  const targetAnchor = prepareAnchor(target, n2, createText, insert)    // 目标里再放两个空文本节点
  if (target && !disabled) mountChildren(n2.children, target, targetAnchor, parentComponent /* … */)
}
```

在浏览器里实测（挂载后的 HTML，`to="#modal"`）：

```html
<!-- #app 里（开发版） -->
<div><p>before</p><!--teleport start--><!--teleport end--><p>after</p></div>
<!-- #modal 里：一个空文本节点，<button>…</button>，一个空文本节点 -->
```

`disabled` 变为 `true` 时，同一批 DOM 被移回两个注释之间。`to` 变化时，DOM 被移到新目标，旧目标被清空。

**为什么逻辑关系不变，而 DOM 事件按真实 DOM 走。**注意传给 `mountChildren` 的 `parentComponent` 没有变，它仍是渲染 Teleport 的那个组件。组件实例的 `parent`、`provides` 原型链、`emit` 要找的 `onXxx` 监听函数，全部由这条父子链决定，跟 DOM 无关。而 DOM 事件是浏览器的：Vue 用 `addEventListener` 给元素绑定监听，事件按元素在文档里的真实祖先冒泡。实测：弹窗里的按钮 `emit('close')` 能触发父组件的监听，但点击不会冒泡到原来父元素上的 `onClick`，因为按钮在 `#modal` 里。

**defer 解决什么。**没有 `defer` 时，`process` 同步查找目标。目标如果是同一个模板里排在后面的元素，此时还没有创建，Vue 警告 `Failed to locate Teleport target`，内容不渲染。`defer` 把挂载排进后置队列，等整棵树 patch 完再找目标，同一次渲染里稍后才出现的目标就找到了。

::: note
知道了实现：Teleport 出去的弹窗仍能 `inject` 祖先提供的值，也仍受祖先的 `emit` 监听；但在它外面的祖先元素上写 `@click` 收不到它里面的点击，要靠 `emit` 或直接在弹窗上监听。
:::

### 33.4 Transition：钩子挂在 vnode 上，渲染器负责调用

问题：进入和离开动画需要在“插入前后”和“移除前”插手。`BaseTransition` 是平台无关的状态机。它不碰 DOM，只做两件事：把一组**过渡钩子**挂到子 vnode 的 `transition` 属性上，管理 `out-in`、`in-out` 的先后。真正在合适的时机调用这些钩子的是渲染器：

```js
// runtime-core/renderer.ts（简化）
function mountElement(vnode, container, anchor) {
  const el = (vnode.el = hostCreateElement(vnode.type))
  // …子节点和 props
  const { transition } = vnode
  if (transition && !transition.persisted) transition.beforeEnter(el)    // 插入之前
  hostInsert(el, container, anchor)
  if (transition && !transition.persisted) {
    queuePostRenderEffect(() => transition.enter(el))                    // 整棵树挂完之后
  }
}

const remove = (vnode) => {
  const { el, transition } = vnode
  const performRemove = () => { hostRemove(el); transition?.afterLeave?.() }
  if (vnode.shapeFlag & ShapeFlags.ELEMENT && transition && !transition.persisted) {
    const performLeave = () => transition.leave(el, performRemove)       // 移除被推迟
    transition.delayLeave ? transition.delayLeave(el, performRemove, performLeave) : performLeave()
  } else performRemove()
}
```

离开时，真正的 `hostRemove` 被包进回调 `performRemove`，交给 `leave(el, done)`。**钩子调用 `done` 之前，元素一直在页面上。**这就是为什么 `onLeave(el, done)` 里忘了调 `done`，元素永远不会消失。

runtime-dom 的 `Transition` 只是一个函数式组件：`h(BaseTransition, resolveTransitionProps(props), slots)`。`resolveTransitionProps` 把 `name`、`duration` 这些 props 翻译成加减 class 的钩子：

```js
// runtime-dom/components/Transition.ts（简化）
onBeforeEnter(el) { add(el, 'v-enter-from'); add(el, 'v-enter-active') },
onEnter(el, done) {
  nextFrame(() => {                                    // 两层 requestAnimationFrame
    remove(el, 'v-enter-from'); add(el, 'v-enter-to')
    if (用户钩子没有声明 done 参数) whenTransitionEnds(el, type, duration, () => { finishEnter(el); done() })
  })
},                                                     // finishEnter：去掉 -enter-to 和 -enter-active
onLeave(el, done) {
  add(el, 'v-leave-from'); forceReflow(el); add(el, 'v-leave-active')
  nextFrame(() => { remove(el, 'v-leave-from'); add(el, 'v-leave-to'); whenTransitionEnds(/* … */) })
}
```

在浏览器里记录一个元素的 `class`（`name="f"`，CSS 里 `.f-enter-active` 写了 `transition: opacity .2s`）：

| 时间 | 进入时的 class | 离开时的 class |
|---|---|---|
| 0 ms（插入的那一刻） | `f-enter-from f-enter-active` | `f-leave-from f-leave-active` |
| 约 15 ms（下一帧） | `f-enter-active f-enter-to` | `f-leave-active f-leave-to` |
| 约 220 ms（过渡结束） | 全部清掉 | 元素被移除 |

两层 `requestAnimationFrame` 保证浏览器先应用了 `from` 的样式，再切到 `to`，起点和终点之间才有变化可过渡。同步地先去 `from` 再加 `to`，浏览器只看到最终状态，不会产生动画。

**结束靠什么。**`whenTransitionEnds` 有显式 `duration` 就用 `setTimeout`。没有就用 `getComputedStyle` 读 `transition` 和 `animation` 的时长，监听 `transitionend` 或 `animationend`，用 `setTimeout(timeout + 1)` 兜底。每个元素有 `_endId`，防止旧的过渡误结束新的过渡。用户钩子的参数多于一个（声明了 `done`），Vue 就不自动结束，等你调用。

**第一次渲染没有动画。**`beforeEnter` 和 `enter` 开头都有判断：`state.isMounted` 还是假、又没有 `appear`，就直接返回。`state.isMounted` 在 `BaseTransition` 自己的 `onMounted` 里才变真。加 `appear` 才让初始渲染也走进入序列。

**模式。**`out-in` 时，新旧子节点不同，`BaseTransition` 的渲染函数先返回一个空占位，并设 `state.isLeaving = true`；旧元素的 `afterLeave` 里把 `isLeaving` 清掉，再调用 `instance.update()` 重新渲染，新元素这时才挂载并进入。`in-out` 则给旧元素设 `delayLeave`：新元素的进入结束（`enter` 的 `done`）之后，才执行被推迟的离开。在浏览器里实测：`out-in` 的离开期间页面上只有旧元素；`in-out` 的进入期间两个元素同时在页面上，旧元素没有任何过渡 class，等新元素进入结束才开始离开。

::: note
知道了实现，“Transition 里必须是单个元素根节点”就有了解释：`BaseTransition` 只给一个子 vnode 设钩子（多于一个非注释子节点会警告）；离开要求 `shapeFlag & ELEMENT`，所以组件的根节点必须是元素，否则 Vue 警告 `Component inside <Transition> renders non-element root node that cannot be animated`。元素的 `key` 变了也会触发过渡，因为 key 不同就是不同的 vnode，旧的走离开，新的走进入。
:::

下面的练习让你写进入序列：按帧加减 class，结束后清理，还要支持中途取消。

<Exercise id="miniEnter" />

迷你版和真实实现的差别：真实的结束可以由 `transitionend` 触发；钩子是挂在 vnode 上由渲染器调用的，不是自己去插入元素；取消时真实代码会按 `_enterCancelled` 区分离开从哪个状态开始。

**TransitionGroup 的 FLIP。**列表里的元素移动没有进入或离开，所以没有钩子可以挂。`TransitionGroup` 用 FLIP（First, Last, Invert, Play）：先记旧位置，更新后算新位置，用 `transform` 把元素反向推回旧位置，再放手让它过渡到 0。

```js
// runtime-dom/components/TransitionGroup.ts（简化）
render() {                 // 渲染函数里，DOM 还没有更新
  prevChildren.forEach(c => positionMap.set(c, c.el.getBoundingClientRect()))   // First
  // …取新的 children，给每个带 key 的子节点设进入和离开钩子
}
onUpdated(() => {          // DOM 已经更新
  if (!hasCSSTransform(prevChildren[0].el, root, moveClass)) return   // 克隆一个元素，看 moveClass 里有没有 transform 过渡
  prevChildren.forEach(c => newPositionMap.set(c, c.el.getBoundingClientRect()))   // Last
  const moved = prevChildren.filter(c => {
    const dx = old.left - new.left, dy = old.top - new.top
    if (!dx && !dy) return false
    c.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'   // Invert：推回旧位置
    c.el.style.transitionDuration = '0s'
    return true
  })
  forceReflow()                                                      // 让浏览器先画出“推回去”的状态
  moved.forEach(c => {                                               // Play
    c.el.classList.add(moveClass)                                    // 这个 class 里写了 transition: transform
    c.el.style.transform = c.el.style.transitionDuration = ''        // 去掉内联样式：过渡到 0
  })
})
```

实测：四个高 20px 的 `li` 从 `1 2 3 4` 变成 `4 1 2 3`。`4` 向上移了三格，设置的是 `translate(0px, 60px)`（旧位置减新位置）；`1 2 3` 各向下移一格，设置的是 `translate(0px, -20px)`。随后 `v-move` 加上，内联样式清掉，浏览器里出现四个 `transform` 过渡。

### 33.5 Suspense：先在隐藏容器里渲染，计数归零再换上

::: note warn
Suspense 仍是**实验性功能**。官方文档写的是：`<Suspense>` is an experimental feature. It is not guaranteed to reach stable status and the API may change before it does。开发版第一次创建边界时，控制台会打印 `<Suspense> is an experimental feature and its API will likely change.`。下面讲的是 3.5.43 的实现，细节可能改变。
:::

问题：等多个异步组件都好了再一起显示，期间显示 fallback。`SuspenseImpl.process` 的挂载路径（`mountSuspense`）：

```js
// runtime-core/components/Suspense.ts（简化）
function mountSuspense(vnode, container, anchor, parentComponent /* … */) {
  const hiddenContainer = createElement('div')                      // 1. 隐藏容器
  const suspense = (vnode.suspense = createSuspenseBoundary(/* … */))
  patch(null, (suspense.pendingBranch = vnode.ssContent), hiddenContainer, null, parentComponent, suspense)
  //   默认内容挂进隐藏容器；parentSuspense 传的是这个边界
  if (suspense.deps > 0) {                                           // 2. 有异步依赖：显示 fallback
    triggerEvent(vnode, 'onPending'); triggerEvent(vnode, 'onFallback')
    patch(null, vnode.ssFallback, container, anchor, parentComponent, null)   // fallback 没有 suspense 上下文
    setActiveBranch(suspense, vnode.ssFallback)
  } else suspense.resolve()                                          // 3. 没有依赖：直接换上
}
```

**异步依赖怎样登记。**默认内容挂载时，`mountComponent` 发现某个组件的 `setup` 返回了 Promise（`instance.asyncDep`），就调 `parentSuspense.registerDep`。这时组件先渲染一个注释占位。`registerDep` 让 `suspense.deps++`，并在 Promise 完成后补上真正的渲染：

```js
registerDep(instance, setupRenderEffect) {
  suspense.deps++
  instance.asyncDep.then((setupResult) => {
    handleSetupResult(instance, setupResult)
    setupRenderEffect(instance, /* 替换占位的位置 */)         // 在隐藏容器里渲染出真正的内容
    if (--suspense.deps === 0) suspense.resolve()              // 计数归零
  })
}
```

**resolve 做什么。**`resolve()` 里：卸载当前的 `activeBranch`（首次是 fallback），把 `pendingBranch` 用 `move(…, ENTER)` 从隐藏容器搬进真实容器，`activeBranch = pendingBranch`、`pendingBranch = null`，再把 `suspense.effects` 放进后置队列，最后触发 `onResolve`。

`effects` 是关键细节。内容在隐藏容器里挂载期间，它们的 `onMounted` 等后置任务，经 `queuePostRenderEffect(fn, suspense)` 被**拦截**：边界有 `pendingBranch` 时，任务进 `suspense.effects` 而不是全局后置队列。所以子组件的 `onMounted` 要等到 resolve、DOM 真的在页面上之后才运行。在浏览器里实测，`onResolve` 先于子组件的 `onMounted`，且 `onMounted` 里 `document.contains(el)` 为 `true`。

用两个异步子组件（`setup` 分别要 50 ms 和 120 ms）看计数：第 50 ms A 的 `setup` 完成，`deps` 从 2 降到 1，页面仍是 fallback；第 120 ms B 完成，`deps` 归零，`resolve`，内容一起出现（页面状态是实测，`deps` 的数值来自源码）。

**内容切换。**`process` 在更新时走 `patchSuspense`：

- 有 `pendingBranch` 且新旧分支类型相同：直接 patch 它，`deps` 照常计数。
- 没有 `pendingBranch`，并且 `activeBranch` 和新分支同类型（例如根都是 `div`）：**原地 patch，不进入 pending**，内部新出现的异步依赖不会触发 fallback。官方文档说的就是这个：只有默认插槽的**根节点被替换**，才会回到 pending。
- 否则：`pendingBranch = newBranch`，新内容挂进一个新的隐藏容器。依赖数为 0 就 `resolve`；否则看 `timeout`：默认 `-1`，永远不显示 fallback，旧内容一直留着；大于 0，`setTimeout` 之后调 `suspense.fallback()`；等于 0，立刻显示。

在浏览器里实测：`timeout="60"`，新内容需要 30 ms，旧内容一直在，没有 fallback；新内容需要 120 ms，第 60 ms 后 fallback 出现，120 ms 时换成新内容。`timeout` 在**创建边界时**读取一次（`timeout: toNumber(vnode.props.timeout)`），之后改这个 prop 不再生效。

事件的触发时机：`onPending` 在进入 pending 时（首次是挂载时，切换时是 `patchSuspense` 开头），`onFallback` 在 fallback 真正显示时，`onResolve` 在 `resolve` 末尾。

::: note
知道了实现：fallback 只在首次加载，或切换根节点后超过 `timeout` 才出现，是因为切换时旧内容还在（`activeBranch`），新内容在后台排好，这是 Suspense 避免加载闪烁的设计。`async setup` 里 `await` 之后再调 `onMounted` 不起作用，因为这时 `currentInstance` 已经没有了（31.7 节）。服务器上的 Suspense 只渲染默认内容，第 36 章（36.8 节）会讲。
:::

### 33.6 defineAsyncComponent：一个包装组件，两条路径

问题：组件的代码要晚点下载，下载期间显示加载状态。`defineAsyncComponent` 返回一个名为 `AsyncComponentWrapper` 的普通组件。包装组件的 `setup` 按有没有 Suspense 走两条路径：

```js
// runtime-core/apiAsyncComponent.ts（简化）
function defineAsyncComponent({ loader, loadingComponent, errorComponent, delay = 200, timeout, suspensible = true, onError }) {
  let pendingRequest = null, resolvedComp
  const load = () => pendingRequest || (pendingRequest = loader().then(comp => (resolvedComp = comp)))   // 缓存请求；重试时清掉它
  return defineComponent({
    name: 'AsyncComponentWrapper',
    setup() {
      const instance = currentInstance
      if (resolvedComp) return () => createInnerComp(resolvedComp, instance)       // 加载过：直接渲染
      if (suspensible && instance.suspense) {
        // 路径 A：交给 Suspense。setup 返回 Promise，成为一个异步依赖
        return load().then(comp => () => createInnerComp(comp, instance))
      }
      // 路径 B：自己管状态
      const loaded = ref(false), error = ref(), delayed = ref(!!delay)
      if (delay) setTimeout(() => (delayed.value = false), delay)
      if (timeout != null) setTimeout(() => { if (!loaded.value && !error.value) error.value = new Error('timed out') }, timeout)
      load().then(() => (loaded.value = true)).catch(err => (error.value = err))
      return () =>
        loaded.value && resolvedComp ? createInnerComp(resolvedComp, instance)
        : error.value && errorComponent ? h(errorComponent, { error: error.value })
        : loadingComponent && !delayed.value ? h(loadingComponent)
        : undefined
    }
  })
}
```

在浏览器里实测（加载需要 200 ms，`delay: 100`，`loadingComponent`）：

| 情况 | 0 ms | 150 ms | 300 ms |
|---|---|---|---|
| 没有 Suspense | 注释占位 | 加载组件 | 真正的组件 |
| 在 Suspense 里 | fallback | fallback | 真正的组件 |
| 在 Suspense 里，`suspensible: false` | 注释占位 | 加载组件 | 真正的组件 |

路径 A 里，包装组件的 `loadingComponent`、`errorComponent`、`delay`、`timeout` 全被忽略，加载状态完全由 Suspense 决定。官方文档也写了这一点。路径 B 的状态机是三个 `ref`：`delay` 内不显示加载组件（避免闪一下），`timeout` 到了而没加载完就进入错误状态；超时后如果加载仍然完成，`loaded` 变真，真正的组件仍然会显示（实测）。

`loader` 的结果被 `pendingRequest` 缓存：两个实例同时挂载，`loader` 只调用一次（实测）。`onError(err, retry, fail, attempts)` 里调 `retry()` 会清掉 `pendingRequest` 再 `load()`，所以重试是重新调用 `loader`。

3.5 加的延迟水合（`hydrate` 选项和 `__asyncHydrate`）在第 36 章（36.9 节）会讲。

::: pitfalls
1. 不要期望 `KeepAlive` 里的 `onMounted` 每次显示都运行。原因：失活只是搬家，实例没有销毁。每次显示都要做的事放进 `onActivated`。
2. 不要给没有名字的组件设 `include`。原因：`include` 按 `name` 或 `__name` 匹配，匹配不到名字的组件不会被缓存。
3. 不要指望在祖先元素上的 `@click` 收到 Teleport 内容里的点击。原因：DOM 事件按真实 DOM 冒泡，Teleport 内容的真实祖先在目标容器里。
4. 不要在 `onLeave(el, done)` 里忘记调用 `done`。原因：元素的移除被推迟到 `done` 之后。
5. 不要在 `async setup` 的 `await` 之后注册 `onMounted` 之类的钩子。原因：`await` 之后 `currentInstance` 已经被清掉。
6. 不要把 `Suspense` 的 `timeout` 写成会变化的值。原因：边界只在创建时读取一次。
:::

::: selfcheck
<Sc :a="2">

下面哪一项**不是**普通组件形式的内置组件？

<Opt>`KeepAlive`</Opt>
<Opt>`BaseTransition`</Opt>
<Opt>`Teleport`</Opt>

<template #explain>

解析：`Teleport` 的类型对象带 `process` 方法，`patch` 看到 `shapeFlag & 64` 就直接调用它，挂载位置和时机由它自己决定。`KeepAlive` 和 `BaseTransition` 是用 `setup` 加渲染函数写的普通组件，需要渲染器能力时通过 `instance.ctx.renderer` 或 vnode 上的属性与渲染器配合。最迷惑的是 `KeepAlive`：它的行为很特殊，但实现形式是普通组件。

</template>
</Sc>

<Sc :a="1">

按钮在 `<Teleport to="#modal">` 里，`#modal` 在 `#app` 外面。点击按钮时，哪些监听会触发？

```js
h('div', { onClick: () => log('root') }, [
  h(Teleport, { to: '#modal' }, [h(Modal, { onClose: () => log('close') })])
])
// Modal 里：h('button', { onClick: () => emit('close') })
```

<Opt>`close` 和 `root` 都触发，因为 Modal 在逻辑上是 root 的后代</Opt>
<Opt>只有 `close` 触发</Opt>
<Opt>两个都不触发，因为 Teleport 隔断了事件</Opt>

<template #explain>

解析：`emit('close')` 找的是 Modal 的 vnode props 上的监听，跟组件父子关系有关，不跟 DOM 位置有关，所以 `close` 触发。`root` 的监听是原生 `addEventListener`，按真实 DOM 冒泡，按钮在 `#modal` 里，它的祖先不包括 root 的 `div`，所以收不到。第一项把组件关系和 DOM 关系混在了一起。

</template>
</Sc>

<Sc :a="0">

`max` 为 2 的 KeepAlive 里，依次显示 A、B、A、C。哪个组件会被卸载？

<Opt>B</Opt>
<Opt>A</Opt>
<Opt>没有，C 在页面上不算缓存</Opt>

<template #explain>

解析：`keys` 的顺序变化：A，A B，B A（命中 A 时先删再加，移到最后），B A C。长度 3 超过 2，淘汰第一个，是 B。第二项是把它当成了先进先出（FIFO）：A 最先加入，但第二次访问已经刷新了它的位置。

</template>
</Sc>

<Sc :a="2">

组件在文件 `Panel.vue` 里，用 `<script setup>` 写，没有 `defineOptions({ name })`。父组件写了 `<KeepAlive include="Panel">`。它会被缓存吗？

<Opt>不会，`<script setup>` 的组件没有名字</Opt>
<Opt>不会，`include` 只匹配 `name` 选项</Opt>
<Opt>会，编译器按文件名生成了 `__name`，KeepAlive 取名字时包括它</Opt>

<template #explain>

解析：`getComponentName` 先取 `name`，没有再取 `__name`。单文件组件的编译器会根据文件名给 `<script setup>` 组件设置 `__name: 'Panel'`。第二项漏掉了 `__name`。手写的、没有任何名字的对象组件，设置 `include` 后才不会被缓存。

</template>
</Sc>

<Sc :a="1">

一个 `<Transition name="fade">` 里的元素刚刚被插入页面。插入的那一刻，它的 class 是什么？

<Opt>`fade-enter-active fade-enter-to`</Opt>
<Opt>`fade-enter-from fade-enter-active`</Opt>
<Opt>没有任何过渡 class，下一帧才加</Opt>

<template #explain>

解析：`beforeEnter` 在元素插入**之前**就加了 `from` 和 `active`，所以插入时已经在起点。下一帧再去掉 `from`、加上 `to`。第一项是下一帧之后的状态。第三项会让浏览器先画出一帧没有起点样式的元素，出现闪烁，这正是要在插入前加 class 的原因。

</template>
</Sc>

<Sc :a="0">

```js
onLeave(el, done) {
  console.log('leave')
}
```

这是 `<Transition @leave="onLeave">` 的钩子，没有调用 `done`。`v-if` 变为假之后，这个元素怎么样？

<Opt>一直留在页面上，`afterLeave` 不触发</Opt>
<Opt>CSS 过渡结束后自动移除</Opt>
<Opt>立刻被移除，钩子只是通知</Opt>

<template #explain>

解析：钩子声明了两个参数，Vue 认为你要自己结束（`hasExplicitCallback`），不再自动用 `transitionend` 收尾。真正的 `hostRemove` 被包在 `performRemove` 里，只有 `done` 调用它。所以元素一直留着。第二项是只写了一个参数（`onLeave(el)`）时的行为。

</template>
</Sc>

<Sc :a="2">

四个高 20px 的列表项从 `1 2 3 4` 变成 `4 1 2 3`，使用 `TransitionGroup`。元素 `4` 被设置的反向 transform 是什么？

<Opt>`translate(0, -60px)`</Opt>
<Opt>`translate(0, 20px)`</Opt>
<Opt>`translate(0, 60px)`</Opt>

<template #explain>

解析：元素 `4` 的新位置比旧位置高 60px。位移是旧位置减新位置，`oldTop - newTop = 60 - 0 = 60`，所以先把它往下推 60px，让它看起来还在旧位置，再过渡到 0。第一项把方向弄反了：它是元素要走的方向，不是反向 transform。

</template>
</Sc>

<Sc :a="1">

`<Suspense>` 的默认内容是 `<div><A /><B /></div>`，A 的 `setup` 要 50 ms，B 要 120 ms。两个都有 `onMounted`。它们分别什么时候运行？

<Opt>A 在 50 ms，B 在 120 ms</Opt>
<Opt>都在约 120 ms，`onResolve` 之后，这时 DOM 已在页面上</Opt>
<Opt>都在开始渲染时，因为 `onMounted` 不等 `setup`</Opt>

<template #explain>

解析：内容在隐藏容器里渲染，边界处于 pending 时，`queuePostRenderEffect(fn, suspense)` 把后置任务存进 `suspense.effects`。`deps` 在 120 ms 归零，`resolve` 才把它们放进后置队列，这时内容已经搬进真实容器。第一项以为每个组件独立挂载；A 的内容 50 ms 时已经渲染好，但仍在隐藏容器里。

</template>
</Sc>

<Sc :a="2">

在 `<Suspense>` 里放 `defineAsyncComponent({ loader, loadingComponent: Spinner, delay: 100 })`，加载需要 200 ms。150 ms 时页面上显示什么？

<Opt>`Spinner`，因为已经超过 `delay`</Opt>
<Opt>什么也没有，因为 `delay` 不适用于 Suspense</Opt>
<Opt>Suspense 的 `fallback`，`Spinner` 不会出现</Opt>

<template #explain>

解析：`suspensible` 默认为 `true`，且父链上有 Suspense，包装组件走路径 A：`setup` 返回 Promise，成为 Suspense 的异步依赖，加载状态由 `fallback` 控制，`loadingComponent`、`delay`、`timeout` 都被忽略。第一项是没有 Suspense 时的行为。要让 Spinner 出现，写 `suspensible: false`。

</template>
</Sc>

<Sc :a="0">

一个 Suspense 已经显示了 A 的内容（根是组件 A）。切换成组件 B（`setup` 要 80 ms），没有设置 `timeout`。这 80 ms 里页面显示什么？

<Opt>仍然是 A 的内容</Opt>
<Opt>`fallback`</Opt>
<Opt>空白</Opt>

<template #explain>

解析：`timeout` 默认是 `-1`，切换时旧的 `activeBranch` 一直留着，新分支在隐藏容器里等 `deps` 归零后才替换它。想要切换时也出现 fallback，要给 Suspense 设置 `timeout`（0 表示立刻）。第二项是首次加载时的行为。

</template>
</Sc>

<Sc :a="1">

下面的 `Suspense` 默认插槽根是 `<div>`。切换时 A 换成一个新的 `async setup` 组件 C，而外层 `div` 不变。会显示 fallback 吗？

```js
h(Suspense, null, {
  default: () => h('div', [h(cur.value)]),   // cur 从 A 换成 C
  fallback: () => h('span', 'loading')
})
```

<Opt>会，因为出现了新的异步依赖</Opt>
<Opt>不会，`div` 被原地 patch，没有进入 pending</Opt>
<Opt>会，但要等 `timeout`</Opt>

<template #explain>

解析：`patchSuspense` 发现没有 `pendingBranch`，`activeBranch` 和新分支类型相同（都是 `div`），就原地 patch，C 在 `div` 里只渲染一个注释占位，等 `setup` 完成后补上，整个过程不回到 pending。官方文档也写了：只有默认插槽的根节点被替换才会回到 pending。第三项也错：根本没进入 pending，`timeout` 没有机会生效。

</template>
</Sc>

:::

::: summary
- 内置组件分两类：KeepAlive、Transition 是普通组件，借助 `instance.ctx.renderer`、vnode 的 `transition` 属性和 shapeFlag 的 256、512 位与渲染器配合；Teleport、Suspense 是类型对象带 `process` 的专门分支，`patch` 看到 64、128 位就交给它。
- KeepAlive 用 `Map` 缓存 vnode，用 `Set` 记使用顺序做 LRU；失活是把 DOM 搬进隐藏容器，激活是搬回来，所以状态保留，`onMounted` 只运行一次，`onActivated` 注册到直接子组件上。
- Teleport 在原位置留两个锚点，子节点挂到目标容器，`parentComponent` 不变，所以 provide、inject、emit 不受影响，而 DOM 事件按真实 DOM 冒泡；`defer` 把挂载推迟到后置队列。
- Transition 的 `BaseTransition` 把过渡钩子挂到 vnode 上，渲染器在插入前后和移除时调用；runtime-dom 把 props 翻译成按帧加减 class；离开时 DOM 移除被推迟到 `done`；TransitionGroup 用 FLIP 做移动动画。
- Suspense（实验性）在隐藏容器里先渲染默认内容，异步组件用 `registerDep` 登记依赖，计数归零时 `resolve`：搬进真实容器、卸载 fallback、冲刷拦截的 effects；切换时旧内容保留，只有设置了 `timeout` 才会再显示 fallback。
- `defineAsyncComponent` 返回包装组件：有 Suspense 时作为异步依赖，加载状态归 Suspense；没有时用 `loaded`、`error`、`delayed` 三个 ref 管理加载、错误、延迟和超时。
:::
