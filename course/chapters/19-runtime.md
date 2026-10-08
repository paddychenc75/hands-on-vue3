---
title: 组件运行时：从 vnode 到组件实例
id: runtime
stage: 4
chapter: 19
desc: patch 的分发、mountComponent 三步、渲染副作用、shouldUpdateComponent，最后拼出迷你 Vue
---

<script setup>
import MountComponentFlow from '../figures/19-runtime/MountComponentFlow.vue'
import UpdateComponentFlow from '../figures/19-runtime/UpdateComponentFlow.vue'
import MountUpdateStepper from '../labs/19-runtime/MountUpdateStepper.vue'
</script>

# 组件运行时：从 vnode 到组件实例

::: goals
<Goal checks="sc:0,sc:1">说明挂载组件的顺序：patch 怎样分发到 mountComponent，它的三步各做什么，setup 为什么只运行一次。</Goal>
<Goal checks="sc:2,sc:3,ex:miniMount">写出 setupRenderEffect 的挂载和更新两条路径，说明渲染副作用怎样把响应式和更新队列接起来。</Goal>
<Goal checks="sc:4,sc:5,ex:miniShouldUpdate">写出 shouldUpdateComponent，判断父组件重新渲染时哪些子组件会更新。</Goal>
<Goal checks="sc:6,sc:7,sc:8">说明 provides 怎样用原型链继承，以及钩子的调用位置和顺序。</Goal>

:::

::: rt
阅读主线约 18 分钟，深入内容约 4 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
想象一家**连锁店**。总部把一张开店清单（vnode）交给区域经理（patch）。清单上有摊位（元素），也有分店（组件）。

开分店要先办营业执照（组件实例），再培训店长（setup，只培训一次），最后给分店装一个**营业闹钟**（渲染副作用函数）。数据一变，闹钟不立刻响，而是登记进统一的时间表（更新队列）。

总部每天发新清单。分店先把新清单和昨天的对一遍（shouldUpdateComponent）。没有变化，就不开门营业。
:::

::: terms
组件实例
: Vue 为每个挂载的组件创建的对象，保存它的 props、状态、子树和钩子。

子树（subTree）
: 组件的渲染函数返回的虚拟节点树。

渲染副作用函数
: 运行组件的渲染函数，再 patch 子树的副作用函数。每个组件实例有一个。

shouldUpdateComponent
: 父组件重新渲染时，判断子组件要不要更新的函数。
:::

::: why
你在子组件里打日志。父组件改了一个和子组件无关的数据，子组件的渲染函数没有运行。你把传给它的对象改成每次新建，它就运行了。

原因：父组件每次渲染，都会给子组件创建一个新的 vnode。Vue 用 `shouldUpdateComponent` 比较新旧 vnode 的 props，用 `!==` 逐个比较。新建的对象和旧对象不是同一个，比较结果是“变了”。

前面几章各讲了一块：响应式（第 12 章）、更新队列（第 13 章）、vnode（第 14 章）、编译标记（第 17 章）、列表 diff（第 18 章）。本章讲它们怎样接起来：一个组件 vnode 怎样变成组件实例和 DOM，数据变化时又怎样更新。最后你会拼出一个能运行的迷你 Vue。
:::

### 19.1 全景：render、patch、mountComponent

先看全貌。`app.mount(container)` 做这几件事：

1. 用根组件创建一个 vnode。
2. 调用 `render(vnode, container)`。它调用 `patch(container._vnode || null, vnode, container)`。第一次没有旧 vnode，所以是挂载。
3. patch 发现 vnode 是组件，调用 `mountComponent`。
4. `render` 最后运行后置队列（`mounted` 钩子在这里运行），并把 `vnode` 记在 `container._vnode` 上。

<Figure caption="挂载一个组件。mountComponent 做三步。最后一步里的渲染函数返回子树，子树里如果有子组件，patch 会再进入 mountComponent。">
<MountComponentFlow />
</Figure>

之后的更新不再经过 `render`。每个组件有自己的渲染副作用函数，数据变化时它直接重新运行。本章后面的代码来自 `runtime-core/renderer.ts`，都是简化版，函数名和真实代码一致。

### 19.2 patch 怎样分发

`patch(n1, n2, container, anchor)` 比较两个 vnode。`n1` 是旧的，`n2` 是新的。`n1` 是 `null` 时是挂载。

```js
// runtime-core/renderer.ts（简化）
function patch(n1, n2, container, anchor = null, parentComponent = null) {
  if (n1 === n2) return
  if (n1 && !isSameVNodeType(n1, n2)) {   // type 或 key 不同（18.3 节）
    anchor = getNextHostNode(n1)          // 新节点要插在旧节点原来的位置
    unmount(n1)
    n1 = null
  }
  const { type, shapeFlag } = n2
  switch (type) {
    case Text:     processText(n1, n2, container, anchor); break
    case Comment:  processCommentNode(n1, n2, container, anchor); break
    case Static:   /* 编译器提升的整段静态 HTML */ break
    case Fragment: processFragment(n1, n2, container, anchor, parentComponent); break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) processElement(n1, n2, container, anchor, parentComponent)
      else if (shapeFlag & ShapeFlags.COMPONENT) processComponent(n1, n2, container, anchor, parentComponent)
      else if (shapeFlag & ShapeFlags.TELEPORT) type.process(/* … */)   // Teleport 和 Suspense
      else if (shapeFlag & ShapeFlags.SUSPENSE) type.process(/* … */)   // 自带 process
  }
}
```

分发分两层。先看 `type` 是不是 `Text`、`Comment`、`Static`、`Fragment` 这几个特殊值。都不是时，再用 `shapeFlag`（第 14 章的字段）判断：`ELEMENT` 是 1，`COMPONENT` 是 6（有状态组件 4 加函数式组件 2）。用位与一次就能判断。

| vnode | 处理函数 | 挂载时做什么 |
|---|---|---|
| 文本 | `processText` | 创建文本节点，插入 |
| Fragment | `processFragment` | 插入两个空文本节点，作为首尾的锚点，再挂载子节点 |
| 元素 | `processElement` → `mountElement` | 见下面 |
| 组件 | `processComponent` → `mountComponent` | 19.3 节 |

**anchor 从哪来。**anchor 是 `insertBefore` 的参照节点。`null` 表示追加到末尾。列表里的 anchor 来自 18.2 节的“后面那个新节点”。组件更新时，anchor 是旧子树最后一个 DOM 节点的下一个兄弟（`getNextHostNode`）。Fragment 没有单个 DOM 节点，所以它用首尾两个空文本节点标出范围：`getNextHostNode` 取的是 `vnode.anchor || vnode.el`。

anchor 解决的问题是：子树的根换了类型，例如 `v-if` 让根从 `div` 变成 `p`。旧节点卸载后，新节点必须插在原来的位置，不能追加到父元素末尾。

`mountElement` 的顺序是固定的。第 8 章的指令钩子就在这些位置被调用：

1. 创建元素（`createElement`）。
2. 挂载子节点。数组形式的子节点逐个调用 `patch(null, child, el)`，所以整棵子树先在内存里建好。
3. 指令的 `created`。这时子节点已经存在，属性还没有设置。
4. 设置属性。`value` 最后设置，因为 `<select>` 要先有 `<option>`。
5. 指令的 `beforeMount`。
6. 把元素插入页面（`hostInsert`）。**整棵子树只插入一次。**
7. 指令的 `mounted` 放进后置队列。

下面的代码是同样的顺序，只保留了主干：

```js
function mountElement(vnode, container, anchor, parentComponent) {
  const el = (vnode.el = hostCreateElement(vnode.type))
  if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) hostSetElementText(el, vnode.children)
  else if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) mountChildren(vnode.children, el, null, parentComponent)
  dirs && invokeDirectiveHook(vnode, null, parentComponent, 'created')
  for (const key in props) hostPatchProp(el, key, null, props[key])
  dirs && invokeDirectiveHook(vnode, null, parentComponent, 'beforeMount')
  hostInsert(el, container, anchor)
  dirs && queuePostRenderEffect(() => invokeDirectiveHook(vnode, null, parentComponent, 'mounted'))
}
```

`hostPatchProp` 来自 `runtime-dom`（第 30 章讲）。它决定一个属性怎样写到元素上：`class`、`style` 和事件各有专门的处理。其余的属性，普通 HTML 元素上 `key in el` 为真就写 DOM 属性，否则用 `setAttribute`；SVG 元素上几乎都写成 attribute。少数属性例外，例如 `<input list>` 和 `form` 总是写成 attribute。

**卸载**的顺序也值得记住。这是 `unmount` 对一个元素 vnode 的处理：

1. 把模板 ref 置空。
2. 指令的 `beforeUnmount`。这时 ref 已经是 `null`，DOM 还在页面上。
3. 卸载子节点。
4. 把元素从页面移除。
5. 指令的 `unmounted` 放进后置队列。

### 19.3 mountComponent 的三步和组件实例

`processComponent` 看 `n1`：是 `null` 就调用 `mountComponent`，否则调用 `updateComponent`（19.5 节）。`mountComponent` 只有三步：

```js
// runtime-core/renderer.ts（简化）
const mountComponent = (initialVNode, container, anchor, parentComponent) => {
  // ① 创建组件实例，记在 vnode 上
  const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent))
  // ② 处理 props 和插槽，运行 setup
  setupComponent(instance)
  // ③ 创建渲染副作用函数，并运行第一次
  setupRenderEffect(instance, initialVNode, container, anchor)
}
```

第 ① 步创建的组件实例是一个普通对象。下表列出常用的字段。你可以在 `getCurrentInstance()` 的返回值上看到它们。

| 字段 | 内容 |
|---|---|
| `uid` | 创建顺序的编号。父组件比子组件小。更新队列用它排序（13.1 节） |
| `vnode`、`type` | 当前对应的组件 vnode，和组件的定义对象。更新时 `vnode` 会换成新的 |
| `parent`、`root` | 父实例和根实例 |
| `props`、`attrs`、`slots` | 解析后的 props（浅响应式），没有声明的 attrs，插槽函数 |
| `setupState` | `setup()` 返回对象，用 `proxyRefs` 包过。模板里读 ref 不写 `.value` 就是因为它 |
| `render` | 渲染函数。可能来自 `setup()` 的返回值，也可能是编译好的模板 |
| `subTree` | 最近一次渲染得到的 vnode 树 |
| `effect`、`update`、`job` | 渲染副作用函数、手动更新它的函数、调度器放进队列的任务 |
| `next` | 父组件要更新它时，临时放新 vnode 的地方（19.5 节） |
| `provides` | 19.6 节 |
| `isMounted`、`isUnmounted` | 状态标记 |
| `bm`、`m`、`bu`、`u`、`bum`、`um` | 六种钩子的函数数组（19.7 节） |
| `scope` | 一个 effectScope。`setup()` 里创建的 watch 和 watchEffect 都收集在这里，卸载时一起停止（computed 不登记在作用域里） |

第 ② 步 `setupComponent` 做三件事：

1. `initProps`：把 vnode 的 props 按组件声明的 `props` 分成两份。声明过的放进 `instance.props`，其余放进 `instance.attrs`（第 5 章的透传属性）。
2. `initSlots`：把子节点整理成 `instance.slots`。
3. 运行 `setup(shallowReadonly(props), context)`。返回函数时，它成为 `instance.render`。返回对象时，它成为 `setupState`。没有 `setup` 时，用编译出的模板渲染函数。

运行 `setup` 时，Vue 先调用 `pauseTracking()`，并把 `currentInstance` 设为这个实例（第 6.1 节的深入块）。这有一个后果：**setup 里读取的响应式数据不会成为任何东西的依赖。**

原因在于子组件的 `setup` 运行在父组件的渲染副作用函数里。不暂停的话，子组件 `setup` 里读到的数据会被收集到父组件头上。第 14 章说“不要在 setup 顶层保存 `props.level`”，原因也在这里：`setup` 只运行一次，里面读到的值只是当时的快照。

这也回答了一个常见问题：**`setup` 为什么只运行一次，渲染函数却运行很多次？**`setup` 在第 ② 步被调用，它不在任何副作用函数里。第 ③ 步创建的副作用函数只包着“渲染函数加 patch”。数据变化时，重新运行的只是这个副作用函数。

### 19.4 setupRenderEffect：把响应式和更新队列接起来

第 ③ 步创建渲染副作用函数。第 1 章的深入块给过骨架。下面是完整的两条路径。

```js
// runtime-core/renderer.ts（简化）
const setupRenderEffect = (instance, initialVNode, container, anchor) => {
  const componentUpdateFn = () => {
    if (!instance.isMounted) {
      // ---- 第一次：挂载 ----
      bm && invokeArrayFns(bm)                       // onBeforeMount
      const subTree = (instance.subTree = renderComponentRoot(instance))
      patch(null, subTree, container, anchor, instance)
      initialVNode.el = subTree.el
      m && queuePostRenderEffect(m)                  // onMounted：放进后置队列
      instance.isMounted = true
    } else {
      // ---- 之后：更新 ----
      let { next, bu, u, vnode } = instance
      if (next) {                                    // 是父组件触发的更新（19.5 节）
        next.el = vnode.el
        updateComponentPreRender(instance, next)     // 更新 props 和插槽
      } else {
        next = vnode
      }
      bu && invokeArrayFns(bu)                       // onBeforeUpdate
      const nextTree = renderComponentRoot(instance)
      const prevTree = instance.subTree
      instance.subTree = nextTree
      patch(prevTree, nextTree, hostParentNode(prevTree.el), getNextHostNode(prevTree), instance)
      next.el = nextTree.el
      u && queuePostRenderEffect(u)                  // onUpdated：放进后置队列
    }
  }

  const effect = (instance.effect = new ReactiveEffect(componentUpdateFn))   // 第 12 章
  const update = (instance.update = effect.run.bind(effect))
  const job = (instance.job = effect.runIfDirty.bind(effect))
  job.i = instance
  job.id = instance.uid                              // 第 13 章：父组件的 id 小，先更新
  effect.scheduler = () => queueJob(job)             // 数据变化时不直接运行，放进更新队列
  update()                                           // 第一次渲染
}
```

四个名字要分清：

- `effect`：渲染副作用函数，是第 12 章的 `ReactiveEffect`。`renderComponentRoot` 运行渲染函数，读到的所有响应式数据都成为它的依赖。
- `scheduler`：数据变化时，`trigger` 找到这个 effect，发现它有 scheduler，就调用 scheduler，不直接运行。scheduler 只做一件事：`queueJob(job)`（13.1 节）。
- `job`：放进队列的任务。3.5 里它是 `effect.runIfDirty`：先检查依赖的版本号，没有真的变化就不运行（第 12.5 节）。`job.id` 是 `uid`，父组件先于子组件。
- `update`：直接运行 effect，不检查依赖有没有变。`$forceUpdate` 把它放进队列，19.5 节的子组件更新则同步调用它。

两条路径的差别：

| | 第一次 | 更新 |
|---|---|---|
| 钩子 | `bm` 同步调用，`m` 放进后置队列 | `bu` 同步调用，`u` 放进后置队列 |
| 旧子树 | 没有 | `instance.subTree` |
| patch | `patch(null, subTree, container, anchor)` | `patch(prevTree, nextTree, 旧 DOM 的父节点, 旧子树之后的节点)` |
| props | 已经由 `setupComponent` 处理 | 父组件触发时，先用 `instance.next` 更新 |

渲染函数里读取的数据变了，页面怎样更新，现在可以走完全程：

1. 渲染函数读取 `state.count`，`track` 把渲染副作用函数记进 `state.count` 的依赖（12.1 节）。
2. `state.count++`，`trigger` 找到这个副作用函数，调用它的 `scheduler`。
3. `queueJob(job)` 按 id 把任务放进队列。同一个任务不会重复入队（13.1 节）。
4. 同步代码结束，微任务里运行 `flushJobs`，调用 `job`。
5. `job` 运行 `componentUpdateFn` 的更新分支：渲染新子树，和旧子树 patch，DOM 才改变。
6. 队列清空后，运行后置队列里的 `onUpdated`（13.4 节）。

在开发版里，用 `onRenderTracked` 和 `onRenderTriggered` 可以看到第 1、2 步：前者在渲染函数读取数据、收集依赖时调用，后者在数据变化、触发渲染时调用。参数里有 `type`（`get`、`set`）和 `key`。

::: deep 更新 props 为什么不会让组件再排一次队
更新分支里，`updateComponentPreRender` 会修改 `instance.props`。`props` 是浅响应式对象，渲染函数读过它，所以这次修改会触发这个组件自己的渲染副作用函数，似乎要再排一次队。

Vue 在这一段前后关闭了“允许递归”：`toggleRecurse(instance, false)`，处理完 props 和 `onBeforeUpdate` 之后再 `toggleRecurse(instance, true)`。副作用函数正在运行，又被自己触发时，只要不允许递归，触发就被忽略。你可以验证：父组件改一次 prop，子组件的渲染函数只运行一次。
:::

### 19.5 父组件更新时，子组件要不要更新

父组件的渲染函数每次运行，都会重新创建所有子组件的 vnode。创建 vnode 很便宜。如果每个子组件都跟着重新渲染，整棵树都会重新渲染。所以 patch 到子组件 vnode 时，要先问一句：这个子组件需要更新吗？

`processComponent` 在 `n1` 不是 `null` 时调用 `updateComponent`：

```js
// runtime-core/renderer.ts（简化）
const updateComponent = (n1, n2) => {
  const instance = (n2.component = n1.component)   // 实例复用，只换 vnode
  if (shouldUpdateComponent(n1, n2)) {
    instance.next = n2                             // 新 vnode 先放在 next 上
    instance.update()                              // 同步运行子组件的渲染副作用函数
  } else {
    n2.el = n1.el
    instance.vnode = n2                            // 不更新，但要记住最新的 vnode
  }
}
```

<Figure caption="父组件的 patch 遇到子组件 vnode 时，shouldUpdateComponent 决定走哪条路。更新时，子组件在父组件的 patch 里同步完成，不再单独排队。">
<UpdateComponentFlow />
</Figure>

`shouldUpdateComponent` 的规则如下（手写渲染函数，没有编译信息的情况）：

```js
// runtime-core/componentRenderUtils.ts（简化）
function shouldUpdateComponent(prevVNode, nextVNode) {
  const { props: prevProps, children: prevChildren, component } = prevVNode
  const { props: nextProps, children: nextChildren } = nextVNode
  const emits = component.emitsOptions

  if (nextVNode.dirs || nextVNode.transition) return true        // 有指令或过渡：总是更新
  if ((prevChildren || nextChildren) && !nextChildren?.$stable) return true   // 有插槽，并且不是稳定插槽
  if (prevProps === nextProps) return false
  if (!prevProps) return !!nextProps
  if (!nextProps) return true
  return hasPropsChanged(prevProps, nextProps, emits)
}

function hasPropsChanged(prevProps, nextProps, emitsOptions) {
  const nextKeys = Object.keys(nextProps)
  if (nextKeys.length !== Object.keys(prevProps).length) return true   // 属性个数不同
  for (const key of nextKeys) {
    if (nextProps[key] !== prevProps[key] && !isEmitListener(emitsOptions, key)) return true
  }
  return false
}
```

要点只有两个。一是**浅比较**：逐个属性用 `!==`，不比较对象的内容。二是**已声明的事件监听不参与比较**：父组件每次渲染都会创建新的回调函数，如果这也算变化，所有带事件的子组件都会总是更新（第 17.4 节讲的 emits 声明，背后就是这个 `isEmitListener`）。

编译后的模板有更多信息可用（第 17 章）。子组件 vnode 的 `patchFlag` 说明动态的部分：有 `PROPS` 时，只检查 `dynamicProps` 列出的属性。有 `FULL_PROPS` 时，调用 `hasPropsChanged`。有 `DYNAMIC_SLOTS` 时，总是更新。完全没有动态绑定的子组件，根本不在父 Block 的 `dynamicChildren` 里，patch 不会走到它。

下表是用 Vue 3.5.43 实测的结果。父组件因为别的数据变化而重新渲染，子组件会更新吗：

| 父组件传给子组件的内容 | 子组件更新？ |
|---|---|
| 值没变的原始值，例如 `:n="n"` | 否 |
| 每次新建的对象，例如 `:obj="{ id: n }"` | **是**，即使内容一样 |
| 每次新建的回调，子组件没有声明这个事件 | **是** |
| 每次新建的回调，子组件声明了这个事件 | 否 |
| 手写 `h()` 传插槽函数，没有 `$stable: true` | **是** |
| 模板里的静态插槽内容 | 否 |

最后一行的反面值得注意。模板里的插槽内容，如果读了响应式数据，例如 `<Child><p>{{ other }}</p></Child>`，那个数据变化时，更新的是子组件，而不是父组件。原因是插槽函数在**子组件的渲染函数里**运行，`other` 被收集到子组件的渲染副作用函数上。实测：`other` 变化后，父组件的渲染函数运行 0 次，子组件运行 1 次。这也是第 14.3 节说“插槽必须写为函数，子组件才能单独更新插槽”的实现原因。

**为什么不更新时也要 `instance.vnode = n2`。**子组件调用 `emit('save')` 时，Vue 从 `instance.vnode.props` 里找 `onSave`。声明过的事件监听虽然不触发更新，但回调函数在每次父组件渲染时都是新的。把 `vnode` 换成最新的，`emit` 才会调用最新的回调。

**`instance.next` 做什么。**更新子组件前，新的 vnode 先放在 `instance.next` 上。子组件的更新分支看到 `next`，就先调用 `updateComponentPreRender`：把 `instance.vnode` 换成 `next`，清空 `next`，再用新 vnode 的 props 更新 `instance.props` 和插槽。所以在 `onBeforeUpdate` 里，props 已经是新的。子组件自己的数据变化触发的更新，`next` 是 `null`。

这也解释了 13.4 节的两条观察：

- 子组件在父组件的 patch 里**同步**更新（`instance.update()`），所以它先于父组件完成，`onUpdated` 先入队。
- 父组件和子组件的任务可能同时在队列里。父组件先运行，把子组件同步更新了。子组件的任务随后运行时，3.5 的 `runIfDirty` 发现它已经不是“脏”的，就跳过。子组件只渲染一次。

<Lab id="demo-runtime-step" title="实验台：单步看组件的挂载和更新" note="迷你 Vue 的逐步回放，函数名对应真实的 runtime-core">
<template #predict>
<Sc predict :a="1">

先猜：App 渲染两个节点，Counter 组件和一段显示 label 的文字。只改 `state.label`，Counter 收到的 props 没有变化。Counter 的渲染函数会运行吗？

<Opt>会运行。父组件重新渲染时，所有子组件都重新渲染</Opt>
<Opt>不会运行。shouldUpdateComponent 返回 false，子组件被跳过</Opt>
<Opt>不会运行，因为 Counter 的 vnode 根本没有创建</Opt>

<template #explain>

解析：App 的渲染函数运行了，所以 Counter 的 vnode 被创建出来（第三项错）。patch 到它时，shouldUpdateComponent 比较新旧 props：属性个数相同，每个值都相等，返回 false。Counter 只更新 vnode 的记录，渲染函数不运行（第一项是常见的误解）。打开实验台，选“父组件改了与子组件无关的数据”，点“运行到底”，看 Counter 一行的“render 次数”。

</template>
</Sc>
</template>

<MountUpdateStepper />
</Lab>

下面的练习实现这个判断函数。它放在一个完整的迷你 Vue 里，页面上的五个子组件各自显示渲染次数。

<Exercise id="miniShouldUpdate" />

::: deep 优化路径下的 shouldUpdateComponent
真实代码有两个分支。`optimized` 为真（父组件是编译出的 Block，正在比较 `dynamicChildren`）并且 `patchFlag >= 0` 时，走编译信息的分支：

```js
if (optimized && patchFlag >= 0) {
  if (patchFlag & PatchFlags.DYNAMIC_SLOTS) return true      // 插槽依赖了父组件的数据
  if (patchFlag & PatchFlags.FULL_PROPS) return hasPropsChanged(prevProps, nextProps, emits)
  if (patchFlag & PatchFlags.PROPS) {                         // 只检查编译器列出的动态属性
    for (const key of nextVNode.dynamicProps) {
      if (nextProps[key] !== prevProps[key] && !isEmitListener(emits, key)) return true
    }
  }
} else {
  // 上面那段通用规则：比较 children 和所有 props
}
return false
```

编译出的插槽对象带有 `_: 1`（稳定）。稳定的插槽不会因为父组件重新渲染而让子组件更新，只有 `DYNAMIC_SLOTS`（例如 `v-if` 控制的插槽、动态插槽名）才会。手写渲染函数没有这个标记，所以要自己写 `$stable: true`。
:::

### 19.6 provide 和 inject：原型链上的 provides

第 5.6 节的深入块给过 `provide` 和 `inject` 的实现。这里补充它的设计，并验证四个细节。

每个实例有一个 `provides` 对象。创建实例时，子组件**直接使用父组件的 `provides`**，不复制。根组件的 `provides` 以应用级的 provides（`app.provide`）为原型。组件第一次调用 `provide` 时，才为自己创建一个以父级 `provides` 为原型的新对象：

```js
// runtime-core/apiInject.ts（简化）
function provide(key, value) {
  let provides = currentInstance.provides
  const parentProvides = currentInstance.parent && currentInstance.parent.provides
  if (provides === parentProvides) {
    provides = currentInstance.provides = Object.create(parentProvides)   // 第一次 provide：写时复制
  }
  provides[key] = value
}

function inject(key, defaultValue) {
  const provides = currentInstance.parent == null
    ? currentInstance.appContext.provides            // 根组件：读应用级的 provides
    : currentInstance.parent.provides                // 其余：从父组件开始读
  if (key in provides) return provides[key]          // in 沿原型链查找
  return defaultValue
}
```

在 3.5.43 里实测这棵树：A 调用 `provide('theme', 'A')`，B 是 A 的子组件，什么也没提供，C 是 B 的子组件，调用 `provide('theme', 'C')`，D 是 C 的子组件，A 还有一个兄弟子组件 Sib。

| 观察 | 结果 |
|---|---|
| `B.provides === A.provides` | `true`，B 没有提供过，共用 A 的对象 |
| `Object.getPrototypeOf(C.provides) === B.provides` | `true`，C 第一次 `provide` 时创建，原型是父级 |
| D 和 Sib 里 `inject('theme')` | D 得到 `'C'`，Sib 得到 `'A'` |
| C 自己在 `setup` 里 `inject('theme')` | 得到 `'A'`，**读不到自己提供的** |

这套设计有三个好处：

1. 大多数组件不提供任何东西，创建实例时不分配对象，`inject` 只需要一次 `in` 查找。
2. 子组件覆盖祖先的值，只影响自己的后代，不影响兄弟（Sib 仍是 `'A'`）。
3. 祖先在 `setup` 里提供的值，之后创建的所有后代都能读到，不需要逐层传递。

“读不到自己提供的”不是缺陷。第 20 章的递归组件正是依赖它：每一层先 `inject` 上一层的深度，再 `provide` 深度加 1 给下一层。如果 `inject` 能读到自己提供的值，这个写法就会读到自己刚写的值。

`provide`、`inject` 和 `onMounted` 都靠 `currentInstance` 工作，所以只能在 `setup` 里同步调用。异步回调里 `currentInstance` 已经是 `null`，Vue 在开发版会警告 `provide() can only be used inside setup()`。

### 19.7 生命周期钩子在流程里的位置

第 6.1 节的深入块说过 `onMounted(fn)` 只是把 `fn` 存进实例的数组。现在可以看到这些数组在哪里被调用：

| 钩子 | 数组 | 调用位置 | 怎样调用 |
|---|---|---|---|
| `onBeforeMount` | `bm` | 挂载分支开头，渲染之前 | 同步 |
| `onMounted` | `m` | 挂载分支末尾，子树 patch 完以后 | 放进后置队列 |
| `onBeforeUpdate` | `bu` | 更新分支，处理完 props 之后、渲染之前 | 同步 |
| `onUpdated` | `u` | 更新分支末尾 | 放进后置队列 |
| `onBeforeUnmount` | `bum` | `unmountComponent` 开头 | 同步 |
| `onUnmounted` | `um` | `unmountComponent` 里，子树卸载之后 | 放进后置队列 |

注册时 Vue 把你的函数包了一层（`injectHook`）。包装函数调用前后做三件事：`pauseTracking()`，把 `currentInstance` 设成这个组件，用 `callWithAsyncErrorHandling` 调用。所以钩子里的错误会交给 `onErrorCaptured`（第 10 章），钩子里可以调用 `inject`，钩子里读到的响应式数据不会被收集到外层的副作用函数上。

**`onMounted` 为什么是子先父后。**看挂载分支的顺序：

1. 父组件的副作用函数开始运行，`bm` 同步调用（所以 `onBeforeMount` 是父先子后）。
2. 父组件渲染，`patch(null, subTree)` 遇到子组件，进入子组件的 `mountComponent`。
3. 子组件的副作用函数**整个运行完**，它的 `m` 先放进后置队列。
4. 回到父组件，patch 完成，父组件的 `m` 才放进后置队列。

后置队列里的函数按入队顺序运行。后置队列会按 `id` 排序，但钩子数组没有 `id`，排序是稳定的，所以保持入队顺序。结果是子先父后。

用 `m` 而不用同步调用有一个理由：子组件的 `m` 运行时，它的 DOM 必须已经在页面上。同步调用的话，子组件 patch 完就会运行，这时父组件的元素还在内存里，没有插入页面。练习 `miniMount` 里的一个错误解法就是这样。

**卸载的顺序**是 `bum` 先于子树，`um` 后于子树：

1. 父组件的 `bum` 同步调用，然后 `scope.stop()` 停止 `setup` 里创建的 watch 和 watchEffect。
2. 卸载子树。子组件重复同样的步骤：子的 `bum`，子的 `um` 入队。
3. 父组件的 `um` 入队。

结果是 `父 bum → 子 bum → 子 um → 父 um`。

### 19.8 拼一个迷你 Vue

现在所有零件都有了。下表说明每一块来自哪里：

| 零件 | 来自 | 在清单里 |
|---|---|---|
| `reactive`、`effect`、`track`、`trigger` | 12.2 节，`effect` 加 `scheduler` 和 `lazy` 两个选项 | 开头一段 |
| `queueJob`、`flushJobs` | 13.1 节的深入块，加了后置队列 | 第二段 |
| `h`、vnode | 第 14 章 | 第三段 |
| 没有 key 的子节点比较 | 18.4 节 | `patchElement` |
| `patch`、`mountElement`、`patchElement`、`unmount` | 19.2 节 | 第四段 |
| 组件实例、`setupComponent`、`mountComponent`、`setupRenderEffect` | 19.3、19.4 节 | 第五段 |
| `updateComponent`、`shouldUpdateComponent` | 19.5 节 | 第六段 |
| `onMounted`、`provide`、`inject`、`render`、`createApp` | 19.6、19.7 节 | 最后一段 |

12.2 节的 `effect` 只改两处。一处是 `trigger` 看到 `scheduler` 就调用它。另一处是 `effect` 接受 `{ scheduler, lazy }`：

```js
function trigger(target, key) {
  const dep = targetMap.get(target)?.get(key)
  dep && [...dep].forEach(e => e !== activeEffect && (e.scheduler ? e.scheduler() : e.run()))
}

function effect(fn, { scheduler, lazy } = {}) {
  const e = { deps: [], scheduler, run() { /* 和 12.2 节相同：清理依赖，设置 activeEffect，运行 fn */ } }
  if (!lazy) e.run()
  return e
}
```

队列只需要“按 id 插入”和“出队再运行”：

```js
function queueJob(job) {
  if (queue.includes(job)) return
  let i = queue.length
  while (i > 0 && queue[i - 1].id > job.id) i--       // 按 id 排：父组件先更新
  queue.splice(i, 0, job)
  if (!pending) { pending = true; Promise.resolve().then(flushJobs) }
}
function flushJobs() {
  while (queue.length) queue.shift()()
  pending = false
  flushPostCbs()                                      // 队列清空后运行 mounted、updated
}
```

用法和真实 Vue 一样。App 提供 `theme`，Counter 读它，也读 App 传来的 `count`：

```js
const state = reactive({ count: 0 })

const Counter = {
  setup(props) {
    const theme = inject('theme', 'light')
    onMounted(() => console.log('Counter mounted'))
    return () => h('i', null, 'Counter ' + props.count + ' ' + theme)
  }
}
const App = {
  setup() {
    provide('theme', 'dark')
    onMounted(() => console.log('App mounted'))
    return () => h('div', null, [h(Counter, { count: state.count }), h('p', null, 'label')])
  }
}

createApp(App).mount(document.body)
// 页面：<div><i>Counter 0 dark</i><p>label</p></div>
// 控制台：Counter mounted，App mounted（子先父后）
state.count++; state.count++; state.count++
// 微任务之后：<i>Counter 3 dark</i>，App 和 Counter 的渲染函数各只多运行一次
```

下面的练习提供其余的全部代码，只留下最核心的两个函数。把它们补全，迷你 Vue 就能运行。

<Exercise id="miniMount" />

迷你版和真实 Vue 的关键差别如下。每一项都是你读真实源码时会遇到的：

| 方面 | 迷你版 | 真实 Vue 3.5 |
|---|---|---|
| 判断 vnode 类型 | `typeof type` | `shapeFlag` 位运算，一次位与 |
| 节点类型 | 元素、文本、组件 | 另有 Fragment、Comment、Static、Teleport、Suspense |
| 子节点比较 | 按下标比较 | 有 key 的五步加 LIS（第 18 章），加上 `patchFlag` 和 Block（第 17 章） |
| 组件定义 | `setup` 返回渲染函数 | 选项式、`<script setup>`、模板编译、`setupState` 和 `ctx` 代理 |
| props | 所有属性都是 props | `initProps` 分出 attrs，类型校验，默认值，attrs 透传到根元素（第 5 章） |
| 插槽 | 没有 | `slots` 函数，`$stable` 判断 |
| 更新队列 | 数组加 `includes`，出队再运行 | 带 flags 的队列，二分插入，pre、组件、post 三类任务，递归上限（第 13 章） |
| 子组件已经更新过 | `updateComponent` 把它的任务从队列里删掉 | 任务是 `runIfDirty`，已更新的组件不再“脏”，自然跳过 |
| `setup` 期间的依赖收集 | 不暂停，子组件 `setup` 读到的数据会被父组件的 effect 收集 | `pauseTracking()` |
| 卸载 | 只处理 `um` 和 DOM | `bum`，`scope.stop()`，指令和过渡钩子，ref 置空 |
| 错误处理 | 没有 | `callWithErrorHandling`，`onErrorCaptured`（第 10 章） |

::: pitfalls
1. 不要每次渲染都给子组件传新建的对象，例如 `:style-config="{ a: 1, b: x }"`。原因：`shouldUpdateComponent` 用 `!==` 比较，新对象总是“变了”，子组件每次都更新。把对象放进 `ref`、`computed` 或模块常量里，让引用保持稳定。
2. 不要在渲染函数里写副作用，也不要依赖“子组件一定会重新渲染”。原因：父组件更新时，props 没变的子组件会被跳过。
3. 不要在 `await` 之后或定时器回调里调用 `provide`、`inject`、`onMounted`。原因：`currentInstance` 只在 `setup` 同步运行期间有值。
4. 不要在父组件的 `setup` 或渲染函数里读取子组件的 DOM。原因：这时子组件还没有创建。到 `onMounted` 里读，那时整棵树已经插入页面。
:::

::: selfcheck
<Sc :a="1">

下面的代码运行后，控制台依次打印什么？

```js
const Child = {
  setup() { console.log('Child setup'); return () => { console.log('Child render'); return h('i') } }
}
const App = {
  setup() { console.log('App setup'); return () => { console.log('App render'); return h(Child) } }
}
createApp(App).mount('#app')
```

<Opt>App setup，Child setup，App render，Child render</Opt>
<Opt>App setup，App render，Child setup，Child render</Opt>
<Opt>App setup，App render，Child render，Child setup</Opt>

<template #explain>

解析：Child 的 vnode 是 App 的渲染函数创建的。App 渲染完，patch 子树时遇到这个 vnode，才进入 `mountComponent`，创建 Child 的实例并运行它的 `setup`。所以顺序是 App setup、App render、Child setup、Child render。第一项以为所有 `setup` 先于所有渲染，但 Child 在 App 渲染之前还不存在。第三项颠倒了 Child 内部的顺序：`setup` 在第 ② 步，渲染函数在第 ③ 步。

</template>
</Sc>

<Sc :a="2">

`x` 是 `ref(0)`。点击按钮让 `x.value++` 之后，页面显示什么？

```js
const Child = {
  setup() {
    const v = x.value
    return () => h('i', v)
  }
}
```

<Opt>显示 1，Child 的渲染函数重新运行</Opt>
<Opt>显示 1，Child 的 setup 重新运行</Opt>
<Opt>仍然显示 0，Child 不重新渲染</Opt>

<template #explain>

解析：`setup` 在 `mountComponent` 的第 ② 步运行，这时 Vue 调用了 `pauseTracking()`，里面读取 `x.value` 不会成为依赖。渲染函数读取的是变量 `v`，一个普通的数字。所以 `x` 变化不会触发任何副作用函数，页面不变。第二项错在：`setup` 只在创建实例时运行一次，数据变化只重新运行渲染副作用函数。要让它更新，在渲染函数里写 `x.value`。

</template>
</Sc>

<Sc :a="2">

一个组件的渲染副作用函数没有设置 `scheduler`（数据变化时直接运行 effect）。它的渲染函数读取 `count`。初始渲染一次后，同步执行 `count.value++` 三次。渲染函数一共运行几次？

<Opt>2 次：初始一次，三次修改合并成一次</Opt>
<Opt>3 次</Opt>
<Opt>4 次</Opt>

<template #explain>

解析：没有 scheduler 时，`trigger` 直接运行 effect，每次修改都立刻重新渲染。初始 1 次加 3 次修改，共 4 次。第一项描述的是有 scheduler 的情况：scheduler 把 `job` 放进更新队列，同一个任务只入队一次，三次修改合并成一次渲染。第二项漏掉了初始渲染。

</template>
</Sc>

<Sc :a="1">

子组件自己的数据变化，触发了子组件的更新。更新分支里，`instance.next` 是什么？

<Opt>父组件新创建的子组件 vnode</Opt>
<Opt>`null`</Opt>
<Opt>子组件上一次的 vnode</Opt>

<template #explain>

解析：`instance.next` 只在父组件触发更新时有值：`updateComponent` 把新 vnode 放到 `next` 上，再调用 `instance.update()`。更新分支看到 `next`，才调用 `updateComponentPreRender` 更新 props。子组件自己的数据变化经过 scheduler 和 `job`，没有新的 vnode，`next` 是 `null`，直接用 `instance.vnode` 继续。第三项是 `instance.vnode`，不是 `next`。

</template>
</Sc>

<Sc :a="1">

父组件模板是 `<Child :user="{ id: userId }" :n="n" @save="onSave" />`，Child 声明了 `emits: ['save']`。父组件因为另一个数据 `other` 变化而重新渲染，`userId`、`n` 的值都没变。Child 会更新吗？

<Opt>不会，`userId` 和 `n` 的值都没变</Opt>
<Opt>会，`user` 每次都是新对象，`!==` 比较的结果是“变了”</Opt>
<Opt>会，因为 `onSave` 是新的函数</Opt>

<template #explain>

解析：`{ id: userId }` 依赖了变量，每次渲染都创建新对象。`shouldUpdateComponent` 是浅比较，新旧两个对象不是同一个，所以判定为变了，Child 更新。第一项只看了原始值，没注意对象字面量。第三项错在：`save` 已经在 `emits` 里声明，`onSave` 属于事件监听，不参与比较（而且模板里的 `onSave` 是方法引用，本来就是稳定的）。

</template>
</Sc>

<Sc :a="0">

父组件有三个子组件 A、B、C，各传了 props。父组件重新渲染，只有 B 的一个 prop 变了。下面哪句话正确？

<Opt>父组件的渲染函数运行，A、B、C 的 vnode 都被重新创建，但只有 B 的渲染函数运行</Opt>
<Opt>A、B、C 的渲染函数都运行，patch 发现 A、C 没变，不改 DOM</Opt>
<Opt>只创建 B 的 vnode，A 和 C 沿用旧的 vnode</Opt>

<template #explain>

解析：父组件的渲染函数是一个整体，运行一次就会重新创建它返回的所有 vnode。创建 vnode 的成本很低。随后 patch 到 A、C 时，`shouldUpdateComponent` 返回 false，它们的渲染函数不运行。第二项把“比较 vnode”和“运行渲染函数”混在一起：A、C 根本没有运行渲染函数。第三项以为 Vue 能只重新创建一部分 vnode，没有编译信息时做不到。

</template>
</Sc>

<Sc :a="1">

下面的代码里，`Middle` 是 `Parent` 的子组件，`Leaf` 是 `Middle` 的子组件。三处 `inject` 的结果依次是什么？

```js
// Parent
provide('theme', 'light')

// Middle
const a = inject('theme')
provide('theme', 'dark')
const b = inject('theme')

// Leaf
const c = inject('theme')
```

<Opt>a 是 light，b 是 dark，c 是 dark</Opt>
<Opt>a 是 light，b 是 light，c 是 dark</Opt>
<Opt>a 是 light，b 是 light，c 是 light</Opt>

<template #explain>

解析：`inject` 从**父组件**的 `provides` 开始查找。Middle 的 `a` 和 `b` 都读 Parent 的对象，是 `'light'`，Middle 自己提供的 `'dark'` 它读不到。Leaf 的父组件是 Middle，读到 Middle 的 `provides`，沿原型链先找到 `'dark'`。第一项以为组件能读到自己提供的值。第三项忽略了子组件覆盖祖先的值对后代有效。

</template>
</Sc>

<Sc :a="2">

`App` 渲染 `Parent`，`Parent` 渲染 `Child`。三个组件都用 `onMounted` 打印自己的名字。为什么 `Child` 先于 `Parent` 打印？

<Opt>后置队列按组件 uid 从大到小排序</Opt>
<Opt>`onMounted` 钩子先在子组件上注册，所以先运行</Opt>
<Opt>子组件的副作用函数在父组件的 patch 里先运行完，它的 `m` 先放进后置队列</Opt>

<template #explain>

解析：`m` 不在 patch 过程中调用，而是用 `queuePostRenderEffect` 放进后置队列，按入队顺序运行。父组件的渲染副作用函数先开始，但它要 patch 完子树才会把自己的 `m` 入队。子组件的副作用函数在这期间整个运行完，所以子组件的 `m` 先入队。第一项把更新队列里的任务排序当成了钩子顺序：钩子数组没有 id，排序是稳定的。第二项错在：注册发生在各自的 `setup` 里，父组件的 `setup` 更早运行，如果注册顺序决定运行顺序，父组件会先打印。

</template>
</Sc>

<Sc :a="0">

条件变为 false，`Parent`（含子组件 `Child`）被卸载。两个组件都注册了 `onBeforeUnmount` 和 `onUnmounted`，并打印。顺序是什么？

<Opt>Parent bum，Child bum，Child um，Parent um</Opt>
<Opt>Child bum，Parent bum，Child um，Parent um</Opt>
<Opt>Parent bum，Child bum，Parent um，Child um</Opt>

<template #explain>

解析：`unmountComponent` 开头同步调用本组件的 `bum`，然后才卸载子树，所以 `bum` 是父先子后。`um` 是在卸载子树之后才放进后置队列：子组件在卸载子树的过程中先入队，父组件随后入队，所以 `um` 是子先父后。第二项以为 `bum` 从内向外调用，实际是外向内。第三项以为 `um` 和 `bum` 方向一致。

</template>
</Sc>

:::

::: summary
- `patch` 先按 `type` 处理 Text、Comment、Static、Fragment，再用 `shapeFlag` 分发到元素和组件。anchor 是 `insertBefore` 的参照，来自后面的兄弟节点。
- `mountElement` 先建元素和子树，最后一次性插入页面。卸载时，ref 先置空，再卸载子节点，最后移除 DOM。
- `mountComponent` 三步：`createComponentInstance`、`setupComponent`（props、插槽、`setup`）、`setupRenderEffect`。`setup` 只运行一次，运行期间不收集依赖。
- `setupRenderEffect` 把渲染函数装进一个副作用函数：scheduler 把 `job` 放进更新队列（`job.id` 是 `uid`），第一次挂载，之后比较新旧 `subTree`。
- 父组件更新时，`shouldUpdateComponent` 对 props 浅比较，已声明的事件监听不算。要更新就设置 `instance.next` 并同步调用 `update()`，不更新就只换 `instance.vnode`。
- `provides` 用原型链继承：没提供过的组件共用父级对象，第一次 `provide` 才创建新对象。`inject` 从父级开始读，读不到自己提供的值。
- `onMounted` 放进后置队列，子先父后；`onBeforeMount` 同步调用，父先子后。卸载时 `bum` 父先子后，`um` 子先父后。
- 迷你 Vue 把 12 到 16 章的零件加上本章的组件挂载、更新、provide 和钩子拼在一起，不到 300 行。
:::
