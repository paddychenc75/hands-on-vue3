# 迷你 Vue：全课程唯一的一套手写零件

这个目录是第 24–33、36 章里所有「手写迷你实现」的**唯一来源**。以前各章各写各的（3 套响应式、5 个 `queueJob`、4 种 vnode），学习者每到一章都要重新读懂一套新的简化代码。现在只有一套代码，按课程顺序一段一段长出来：第 24 章的 `effect` 到第 31 章还是同一个 `effect`，第 28 章写的 `h` 和第 30 章写的 diff，到第 31 章是同一份代码里的「已有零件」。

写章节和练习的人只需要读本文件，不用读别的就能接入。动手前先读第 1 节（5 分钟），写某一章时读第 4 节里对应那一章。

## 1. 先看这个：一道练习是怎么从共享零件造出来的

### 1.1 目录

```
course/mini/
  README.md            本文件
  index.ts             入口：零件的源码字符串、拼接函数、挖空工具（纯字符串处理）
  load.ts              在「和练习环境一样」的条件下运行零件（单元测试、实验台用；练习文件不需要）
  src/01-reactivity.ts   零件 1  响应式核心            第 24 章
  src/02-scheduler.ts    零件 2  调度器                第 25 章
  src/03-watch.ts        零件 3  watch、effectScope    第 26 章
  src/04-vnode.ts        零件 4  vnode 与 h            第 28 章
  src/05-host.ts         零件 5a 宿主操作（DOM）       第 30 章（第 32 章收成 options）
  src/06-element.ts      零件 5b 元素、子节点 diff     第 30 章
  src/07-component.ts    零件 6a 实例、钩子、provide   第 31 章
  src/08-component-render.ts 零件 6b 组件挂载与更新、createApp  第 31 章
  src/09-string-host.ts  零件 7b 字符串渲染器的 options 第 32 章
  src/10-hydrate.ts      零件 8  迷你水合（可选）      第 36 章
tests/unit/mini-*.test.ts  单元测试（含与真实 Vue 的对照），见第 9 节
```

### 1.2 一个能运行的完整例子

下面是第 31 章 `miniMount` 的新写法。已经在真实的练习运行环境里验证过（临时加进第 31 章，跑单章浏览器测试：起始代码不通过、答案通过、错误解法因为预期的原因被拒绝、半成品不通过；验证完已撤掉）。验证时用的是不折叠的整份 `domSource()`；下面例子多出来的 `fold(...)` 只是在前面加了两行注释，运行行为相同。

```ts
// course/exercises/31-runtime.ts
import type { Exercise } from './types'
import { sub } from './types'
import { answer, build, domSource, fold, PARTS } from '../mini'

// 1. 前面各章写好的零件：整体折叠（拼到第 30 章为止，不含组件）
const EARLIER = fold('第 24–30 章你写过的零件', domSource('element'))
// 2. 本章的零件：6a（实例与钩子）+ 6b（组件挂载与更新）。区域名见 README 第 3 节
const THIS = PARTS.component + '\n' + PARTS.componentRender

export const miniMount: Exercise = {
  title: '补全迷你 Vue 的 mountComponent 和 setupRenderEffect',
  ch: 31,
  task: '……',
  tpl: TPL_MOUNT,                              // 练习自己的模板，和以前一样
  // 起始代码 = 折叠的前置零件 + 本章零件（挖空两个区域）+ 演示代码
  js: EARLIER + build(THIS, {
    mountComponent: 'function mountComponent(vnode, container, anchor, parentComponent) {\n  // TODO 1：创建实例、setupComponent、setupRenderEffect\n}',
    setupRenderEffect: 'function setupRenderEffect(instance, container, anchor) {\n  // TODO 2：……\n}'
  }) + DEMO_MOUNT,
  // 答案 = 完整零件（answer 去掉所有区域标记）
  solJs: EARLIER + answer(THIS) + DEMO_MOUNT,
  faded: {                                     // 半成品：只挖掉一部分，留 ✏️ 占位
    js: EARLIER + build(THIS, {
      setupRenderEffect: 'function setupRenderEffect(instance, container, anchor) {\n  const componentUpdateFn = () => { /* ✏️ 首次渲染和更新 */ }\n  /* ✏️ 创建副作用函数：lazy，scheduler 把任务放进更新队列 */\n}'
    }) + DEMO_MOUNT
  },
  hints: ['……'],
  check: miniMountCheck,                       // 判题照旧：读演示代码写进页面的日志
  wrong: [
    { js: sub(EARLIER + answer(THIS) + DEMO_MOUNT, 'scheduler: () => queueJob(job)', ''), why: '……', expectFail: /更新队列|各只多渲染一次/ }
  ]
}
```

演示代码 `DEMO_MOUNT` 就是现在文件里的那一段（`const state = reactive(…)`、`Counter`、`App`、`Vue.onMounted(() => createApp(App).mount(…))`），不用改：它只用 `reactive`、`h`、`onMounted`、`createApp` 这些迷你版的公开名字。

几点说明：

- **`../mini` 在三个地方都能 import**：浏览器（Vite）、`scripts/` 里的 esbuild、`tests/site/` 里的 esbuild。因为零件是普通的 `.ts` 模块（里面是一个 `String.raw` 字符串），不需要 `?raw` 或 `import.meta.glob`。（`?raw` 在 `scripts/lib/load-ts.mjs`、`tests/site/exercises.test.js`、`tests/site/helpers.js` 的 esbuild 里解析不了。）
- 字符串里是**纯 JavaScript**：没有 `import` / `export`，顶层没有模板字符串（反引号和 `${` 在零件源码里禁用），所以能被 `new Function(...)` 直接运行，学习者在编辑器里看到的也是纯 JS。`tests/unit/mini-source.test.ts` 会检查这些约束。
- `answer(code)` 去掉区域标记行；`build(code, { 区域名: 替换文字 })` 先挖空再去标记；`blank` / `note` / `region` / `fold` 见 2.3。区域名拼错会直接抛错，不会悄悄生成一道没有挖空的题。
- 练习里**不写**迷你版的任何一行实现代码；要改实现，改 `src/*.ts`，所有章同时生效，单元测试负责拦住回归。

### 1.3 为什么零件是 `.ts` 里的字符串，而不是 `.js` 文件加 `?raw`

任务书提过 `?raw` 方案。试过之后放弃的原因：本仓库有三处 Node 脚本用 esbuild 读 `course/exercises/*.ts`（`npm run check:content`、`tests/site/exercises.test.js`、`tests/site/helpers.js`），它们不认 `?raw`，也不认 `import.meta.glob`；而 `scripts/`、`tests/site/` 不在本次改动范围。字符串模块在所有环境里都是普通的 ES 导入。代价是源码文件里没有 JS 语法高亮；换来的是 Vitest、浏览器、esbuild 读到的是同一份字节。
如果以后想改成 `.js` + `?raw`，需要给那三处 esbuild 加一个解析 `?raw` 的小插件，然后把 `index.ts` 里的 `import x from './src/…'` 换成 `import x from './src/….js?raw'`，对外接口（`PARTS`、`domSource` 等）不变。

## 2. 怎样引用零件

### 2.1 零件的两种「形态」

| 形态 | 用在 | 怎么拿 | 渲染器本体在哪 |
|---|---|---|---|
| **DOM 形态** | 第 24–31 章（先直接用 DOM，后面才抽象） | `domSource(upTo)`，`upTo` 取 `'reactivity'` `'scheduler'` `'watch'` `'vnode'` `'host'` `'element'` `'component'` `'componentRender'` | 脚本顶层：`patch`、`mountComponent` 等就是顶层函数，直接调用 `document` |
| **createRenderer 形态** | 第 32 章 | `rendererSource()` | 零件 5b、6b 原样放进 `function createRenderer(options) { … }`，宿主操作从 `options` 取 |

两种形态的渲染器代码是**同一份**（`wrapCreateRenderer` 只是把 `element` 和 `componentRender` 两段缩进后放进函数，并在头部加一行从 `options` 取出 `hostInsert` 等的解构）。零件 5b、6b 里调用宿主一律写 `hostInsert`、`hostCreateElement`、`hostPatchProp` 这样的名字（和真实 `renderer.ts` 同名），所以第 32 章不需要改渲染器的一行代码。

`domSource(upTo)` 只拼到 `upTo` 为止，用来做「学到第 N 章」的版本：第 24 章的练习用 `domSource('reactivity')`，第 30 章的用 `domSource('element')`，依此类推。

### 2.2 `index.ts` 的导出

| 导出 | 作用 |
|---|---|
| `PARTS` | 全部零件的源码字符串：`reactivity` `scheduler` `watch` `vnode` `host` `element` `component` `componentRender` `stringHost` `hydrate` |
| `DOM_ORDER` | DOM 形态的拼接顺序（上面前 8 个） |
| `domSource(upTo?)` | 按 `DOM_ORDER` 拼到 `upTo`（含） |
| `rendererSource({ stringHost? })` | createRenderer 形态：零件 1–4、6a、5a，加包好的渲染器，默认再加零件 7b（字符串 options） |
| `wrapCreateRenderer(body)` | 把渲染器本体包进 `createRenderer(options)` |
| `answer(code)` | 去掉全部区域标记（完整答案） |
| `blank(code, 区域, 替换)` | 把一个区域整段换掉（缩进自动对齐），其他标记保留；通常用 `build` |
| `build(code, { 区域: 替换 })` | 挖空若干区域再去标记：生成起始代码和半成品 |
| `note(code, 区域, 文字)` | 在区域前面加一行 `// 文字`，例如「这是你在第 28 章写的」 |
| `region(code, 区域)` | 取出一个区域里的代码（不含标记），用来写提示的最后一级或核对正文 |
| `fold(标题, code)` | 用 `//#fold 标题` … `//#endfold` 包住一段代码，标记「已经写好、折叠、只读」（第 6 节） |
| `countLines(code)` | 统计行数 |
| `EXERCISE_API_NAMES` | 练习环境注入的名字（第 8 节） |

### 2.3 区域标记

零件源码里用 `//#region 名字` … `//#endregion` 圈出「学习者可能要写的一段」，可以嵌套。每个零件有哪些区域见第 3 节的表。区域名在整个仓库里的含义是固定的，**新增区域可以，改名要同时改练习**（单元测试不会替你检查练习里的名字，但拼错会抛错，练习的浏览器测试会失败）。

### 2.4 拼一个「前面折叠、本章露出」的起始代码

```ts
import { answer, build, domSource, fold, note, PARTS } from '../mini'

// 第 30 章 syncEnds：前面各章的零件折叠，本章只露出 element 这一段，并挖空 syncEnds
const earlier = fold('第 24–28 章和 30.1 写好的零件', domSource('host'))       // 零件 1–5a
const thisChapter = build(PARTS.element, { syncEnds: '// TODO：头部同步、尾部同步' })
const START = earlier + '\n' + thisChapter + DEMO

// 带「这是你在第 28 章写的」标注的写法（第 31 章里出现的 h 和 diff）
const g28 = note(PARTS.vnode, 'h', '这是你在第 28 章写的 h')
```

`earlier` 是普通字符串，没有区域标记要处理的话直接拼就行；要从里面再挖空，用 `build`。

### 2.5 练习脚本里的命名规则

- **迷你版的函数不加 `mini` 前缀**，名字就是真实 Vue 的名字：`reactive`、`ref`、`computed`、`watch`、`nextTick`、`h`、`createApp`、`onMounted`……。这样学习者学到的名字可以直接迁移到真实 Vue。
- 练习环境（`Exercise.vue` 的 `API`）会把真实的 `reactive`、`ref`、`computed`、`watch`、`nextTick`、`onMounted`、`provide`、`inject`、`effectScope`、`onScopeDispose` 等作为 `new Function` 的**参数**注入。脚本里再用 `const reactive = …` 声明同名变量是语法错误。解决办法有两条，已经写成规则：
  1. 零件里**所有与注入名字同名的顶层声明都用 `function` 声明**（`function reactive(…)`）。`function` 声明会覆盖同名参数，所以脚本里的 `reactive` 就是迷你版的。已验证：在真实的练习运行环境里运行，同名的真实 API 被盖住。
  2. 需要真实 API 时写 `Vue.xxx`（例如演示代码里的 `Vue.onMounted(() => createApp(App).mount(…))`，因为演示代码要等练习自己的模板挂上才能找到 `#mm-host`）。
- 注入的名字不含 `h`、`createApp`、`createRenderer`、`createSSRApp`、`onErrorCaptured`、`useModel`（`Exercise.vue` 注释写明：练习脚本里已有 `const { h } = Vue` 这样的写法）。所以这几个名字可以用任何方式声明，但同一份脚本里不能既用迷你版又写 `const { h } = Vue`。
- `tests/unit/mini-source.test.ts` 会拦住：零件里用 `const/let/class` 声明了注入的名字；`Exercise.vue` 的 `API` 里新增了名字而 `EXERCISE_API_NAMES` 没跟上。

## 3. 零件清单

行数是代码行数（不含注释和空行），括号里是含注释的行数。**DOM 形态拼到第 31 章，全套 638 行代码（723 行）**；任务书希望 300–400 行，没有做到，原因和折中见第 10 节。

| 零件 | 文件 | 对应章 | 导出的名字和签名 | 区域（可挖空的单位） | 行数 |
|---|---|---|---|---|---|
| 1 响应式核心 | `src/01-reactivity.ts` | 24 | `track(target, key)`、`trigger(target, key)`、`reactive(obj)`、`effect(fn, { scheduler, lazy })` → `e`（`e.run()`、`e.runIfDirty()`、`e.stop()`、`e.deps`、`e.dirty`、`e.active`、`e.scheduler`、`e.onStop`）、`cleanup(e)`、`untracked(fn)`、`ref(v)`、`computed(getter)`；状态：`activeEffect`、`activeScope`、`targetMap`、`proxyMap` | `track` `trigger` `reactive` `effect` `cleanup` `ref` `computed` | 105 |
| 2 调度器 | `src/02-scheduler.ts` | 25 | `queueJob(job)`、`queuePostFlushCb(cb)`、`flushJobs()`、`flushPostFlushCbs()`、`flushPreFlushCbs(instance?)`、`nextTick(fn?)`；任务上的字段：`id`、`pre`、`allowRecurse`、`disposed`、`queued`；状态：`queue`、`pendingPostFlushCbs` | `nextTick` `queueJob` `queuePostFlushCb` `flushJobs` `flushPostFlushCbs` | 66 |
| 3 watch 与 effectScope | `src/03-watch.ts` | 26 | `watch(source, cb, { immediate, deep, flush })`、`watchEffect(fn, { flush })`（都返回 stop 函数）、`effectScope(detached?)` → `{ active, effects, cleanups, scopes, parent, run(fn), stop() }`、`onScopeDispose(fn)`、`getCurrentScope()`、`traverse(value)`；状态：`currentInstance`（第 31 章才设置） | `effectScope` `watch`（含 `doWatch`） | 71 |
| 4 vnode 与 h | `src/04-vnode.ts` | 28 | `Text`、`ShapeFlags`、`createVNode(type, props, children)`、`normalizeChildren(vnode, children)`、`h(type, propsOrChildren?, children?)`、`isVNode(v)`、`isSameVNodeType(a, b)` | `createVNode` `normalizeChildren` `h` | 56 |
| 5a 宿主操作（DOM） | `src/05-host.ts` | 30（32 收成 options） | `hostInsert(child, parent, anchor)`、`hostRemove(child)`、`hostCreateElement(tag)`、`hostCreateText(text)`、`hostSetText(node, text)`、`hostSetElementText(el, text)`、`hostParentNode(node)`、`hostNextSibling(node)`、`hostPatchProp(el, key, prev, next)`；收成对象：`nodeOps`（前 8 个，键是 `insert` `remove` `createElement` `createText` `setText` `setElementText` `parentNode` `nextSibling`）、`patchProp` | — | 21 |
| 5b 元素与子节点 diff | `src/06-element.ts` | 30 | `patch(n1, n2, container, anchor, parentComponent)`、`processText`、`processElement`、`mountElement`、`mountChildren`、`patchElement`、`patchChildren`、`patchUnkeyedChildren`、`patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent)`、`patchUnknownSequence`、`getSequence(arr)`、`move(vnode, container, anchor)`、`unmount(vnode, doRemove)`、`unmountChildren(children, doRemove, start)`、`getNextHostNode(vnode)` | `patch` `mountElement` `patchElement` `patchChildren` `patchUnkeyedChildren` `patchKeyedChildren` `syncEnds` `mountOrUnmountRest` `patchUnknownSequence` `getSequence` | 171 |
| 6a 实例与钩子 | `src/07-component.ts` | 31 | `createComponentInstance(vnode, parent)`、`setupComponent(instance)`、`propsOf(vnodeProps)`、`injectHook`、`onBeforeMount` `onMounted` `onBeforeUpdate` `onUpdated` `onBeforeUnmount` `onUnmounted`、`provide(key, value)`、`inject(key, default)`；实例字段：`uid vnode type parent props render subTree update job effect next scope provides isMounted isUnmounted bm m bu u bum um emit` | `createComponentInstance` `setupComponent` | 56 |
| 6b 组件挂载与更新 | `src/08-component-render.ts` | 31 | `processComponent`、`mountComponent(vnode, container, anchor, parentComponent)`、`setupRenderEffect(instance, container, anchor)`、`updateComponentPreRender`、`updateComponent(n1, n2)`、`shouldUpdateComponent(prev, next)`、`isEmitListener(emits, key)`、`unmountComponent(instance, doRemove)`、`render(vnode, container)`、`createApp(Root, props)` → `{ mount(container), unmount() }` | `mountComponent` `setupRenderEffect` `shouldUpdateComponent` | 92 |
| 7a createRenderer | 由 `wrapCreateRenderer` 生成（5b + 6b 放进函数） | 32 | `createRenderer(options)` → `{ render, createApp }`；`options` 的键：`insert remove createElement createText setText setElementText parentNode nextSibling patchProp` | — | 0（生成） |
| 7b 字符串 options | `src/09-string-host.ts` | 32 | `stringHost`（一套 options）、`serialize(node)`、`escapeHtml`、`VOID_TAGS` | — | 40 |
| 8 迷你水合（可选） | `src/10-hydrate.ts` | 36 | `hydrate(vnode, container)` → 不匹配列表（`'标签'` `'文字'` `'缺子节点'` `'多子节点'`）、`hydrateNode(node, vnode, container, mismatches)` | `hydrate` | 39 |

### 各段累计到哪一章有多少行（代码行数，不含注释空行）

| 拼到 | 累计 |
|---|---|
| `reactivity`（第 24 章） | 105 |
| `scheduler`（第 25 章） | 171 |
| `watch`（第 26 章） | 242 |
| `vnode`（第 28 章） | 298 |
| `host` | 319 |
| `element`（第 30 章） | 490 |
| `component` | 546 |
| `componentRender`（第 31 章） | 638 |

### vnode 的形状（全课程唯一）

```js
{ __v_isVNode: true, type, props, children, key, shapeFlag, el, component }
// type：字符串（元素）、对象 { setup }（有状态组件）、函数（函数式组件）、Text 符号（文本节点）
// children：null、字符串（TEXT_CHILDREN）、vnode 数组（ARRAY_CHILDREN）、对象（SLOTS_CHILDREN，渲染器不渲染）
// key：props.key 或 null；el：挂载后的真实节点；component：组件 vnode 对应的实例
// shapeFlag（和真实 Vue 的数值一样）：ELEMENT 1，FUNCTIONAL_COMPONENT 2，STATEFUL_COMPONENT 4，TEXT_CHILDREN 8，ARRAY_CHILDREN 16，SLOTS_CHILDREN 32
```

数组 children 里的字符串、数字在 `h` 里就变成文本 vnode（`type: Text`，`shapeFlag: 8`），`null` 和布尔值变成空文本。这是和真实 Vue 的差别之一（真实版在 patch 时才规范化，`null` 和 `false` 变成注释节点）。

## 4. 每一章怎样用

每一节的结构：**正文展示什么 / 练习写哪一段 / 前面章节的成果怎样复用 / 现有练习怎么处置**。「处置」只有四种：保留（不动）、改用共享零件、合并、删除。练习 id 是存储键，改写练习内容时 id 不变；删除、合并要在提交信息里写明。

通用约定：

- **起始代码** = 前面各章已经写好的零件（原样，用 `fold` 折叠）+ 本章零件里挖空要写的区域 + 使用迷你版的演示代码。**答案** = 完整零件 + 同一份演示代码。**半成品** = 只挖掉区域里关键的几处，留 `/* ✏️ … */` 占位。
- 「使用迷你版的演示代码」（`DEMO_*`）仍然写在练习文件里，由练习自己决定，它只用迷你版的公开名字（`h`、`reactive`、`createApp`……）。
- 判题 `check(T)` 照旧：读演示代码写进页面的日志或 DOM。
- 正文里引用零件代码，用第 5 节的 `<!-- mini:零件#区域 -->` 标记，让单元测试保证正文和零件一致。

### 第 24 章 响应式原理（零件 1）

- **正文展示**：24.2 手写 `reactive` / `effect` / `track` / `trigger`，就是 `src/01-reactivity.ts` 的 `track`、`trigger`、`reactive`、`effect`、`cleanup` 五个区域，逐段引用。24.5–24.6 讲真实 3.5 的 Dep / Link：不展示零件，只用对比表。24.7 `computed`、24.11 `ref`：引用 `computed`、`ref` 区域。
- **练习写哪一段**：
  - `miniComputed`：挖空 `computed` 区域（起始代码保留 `effect` 等所有前面的零件，学习者写 `computed`）。
  - `depCleanup`：挖空 `cleanup` 区域，另外把 `effect` 的 `run` 里 `cleanup(e)` 那一行也去掉（起始代码里 `run` 不清理，答案补上）。要这样挖，需要给 `effect` 区域里的 `cleanup(e)` 调用单独加一个子区域 `runCleanup`（见第 10 节「没做完」；目前可以用 `sub(…)` 在答案上替换这一行造起始代码）。
  - `computedFill`：`computed` 区域的半成品（`stale` 标记那几行留 ✏️）。
- **起始代码**：`domSource('reactivity')` + 挖空 + 演示代码。零件 1 是第一段，前面没有可折叠的东西。
- **复用**：本章没有「前面章节」。`ref` 的 `__v_isRef` 标记、`effect` 的返回值 `e`（带 `run`/`stop`）、`scheduler`/`lazy` 选项在后面所有章里原样使用。
- **练习处置**：`computedFill` 改用共享零件；`miniComputed` 改用共享零件；`depCleanup` 改用共享零件；`versionComputed`（用 `dep.version` 的另一套 computed）**删除**——它是第三套响应式模型，正是任务要消灭的东西；它想讲的版本号检查放进 24.6 的正文对比（3.5 的 computed 怎样靠版本号判断「依赖真的变了没有」），迷你版用 `dirty` 标记，两者的差别写进差别表。

### 第 25 章 调度器（零件 2）

- **正文展示**：25.5–25.8 的 `queueJob`、`findInsertionIndex`、`flushJobs`、`flushPostFlushCbs`、`nextTick` 就是 `src/02-scheduler.ts` 的区域。25.6 逐步讲 `flushJobs` 时引用 `flushJobs` 区域；25.7 递归保护是迷你版没有的，用差别表说明。「两个数组，三类任务」（见第 7 节）。
- **练习写哪一段**：`miniScheduler`：挖空 `queueJob`、`flushJobs`、`nextTick` 三个区域（保留 `findInsertionIndex`、`queueFlush`、`flushPostFlushCbs`、`flushPreFlushCbs`，或者把 `findInsertionIndex` 也挖空作为进阶）。起始代码 = `domSource('reactivity')` 折叠 + 零件 2 挖空 + 演示代码（现有练习里的 `parent`（id 1）、`child`（id 2）两个更新任务）。
- **复用**：本章的 `queueJob` 是全课程唯一的版本：第 26 章 `watch` 用它排 `flush: 'pre'` 的任务，第 31 章的组件更新任务用它排队。第 26、31 章的起始代码里它以「已有零件」出现，注释写 `// 这是你在第 25 章写的`（用 `note`）。
- **练习处置**：`focusTick`、`phenoHeight` 保留（用的是真实 Vue）；`miniScheduler` 改用共享零件。现有练习里的 `invalidateJob` 版本不再需要（第 31 章不再靠 `invalidateJob` 去重，而是靠 `runIfDirty`，见差别表）。

### 第 26 章 watch 与 effectScope（零件 3）

- **正文展示**：26.1–26.6 的 `doWatch`（getter 的生成、`job`、`flush` 选择调度方式、`onCleanup`、`stop`）引用 `watch` 区域；26.7 `effectScope` 引用 `effectScope` 区域。`flush: 'pre'` 的任务带 `job.pre = true` 和 `job.id = 所属组件的 uid`（`currentInstance` 在第 31 章前一直是 `null`，正文讲一句「第 31 章会设置它」）。
- **练习写哪一段**：`miniWatch`：挖空 `watch` 区域里的 `doWatch`（`watch`、`watchEffect` 两个入口留着）；`miniEffectScope`：挖空 `effectScope` 区域。起始代码 = 零件 1、2 折叠 + 挖空。
- **复用**：用到第 24 章的 `effect`（`lazy`、`scheduler`、`onStop`）和第 25 章的 `queueJob` / `queuePostFlushCb`，注释标明「第 24 章」「第 25 章」。
- **练习处置**：`miniWatch`、`miniEffectScope` 改用共享零件。练习说明里的 `miniRef`/`miniEffect` 等带前缀的名字全部改成 `ref`/`effect`；现有练习检查 `source.__isRef`，改成 `__v_isRef`（迷你版 `ref` 的标记和真实 Vue 一致）。

### 第 27 章 响应式的坑（无新零件）

三道诊所病例用真实 Vue，**保留**。正文如果引用 `effect`、`track`，用 `<!-- mini:reactivity#… -->` 标记。

### 第 28 章 渲染函数与 vnode（零件 4）

- **正文展示**：28.7 vnode 的 `type` 和 `shapeFlag`、28.8 子节点规范化和 `h()` 的参数，引用 `createVNode`、`normalizeChildren`、`h` 区域，加上「vnode 的形状」那段字段说明。正文里的位运算演示（`shapeFlag & ShapeFlags.ELEMENT`）直接用 `ShapeFlags`。
- **练习写哪一段**：`miniH`：挖空 `createVNode`、`normalizeChildren`、`h` 三个区域（现有任务书里的 12 个调用表格保留：每一行 `shapeFlag`、`children`、`props` 和真实 Vue 一致；对照的真实 `h` 用 `Vue.h`）。起始代码只含零件 4（本章不需要响应式和调度器，不折叠别的）。
- **复用**：本章写的 `h` 在第 30 章的 diff 里用来造 vnode、第 31 章的 `createApp` 里用来造根 vnode。第 30、31 章的起始代码里用 `note(PARTS.vnode, 'h', '这是你在第 28 章写的 h')` 标注。
- **练习处置**：`miniH` 改用共享零件；`hListFill`、`renderFn`、`fnComp`、`scopedSlotForward` 保留（真实 Vue 的 `h`）。

### 第 29 章 编译器（不接入）

`flagBitFill`、`patchFlagFix`、`miniTransform`、`miniGenerate` **保留独立**：它们的输入输出是模板 AST、PatchFlag、代码字符串，和 vnode 线没有数据结构上的交集。唯一的衔接是文字上的：29 章讲 PatchFlag 优化的是 30 章 `patchElement` 里「对比所有 props」那一步，可以在正文里写一句「迷你版没有这个优化，见 30 章差别表」。

### 第 30 章 diff 与 key（零件 5a、5b）

- **正文展示**：30.2 的五个步骤引用 `patchKeyedChildren`（含 `syncEnds`、`mountOrUnmountRest` 两个子区域）、`patchUnknownSequence`、`getSequence`；30.4 没有 key 的 diff 引用 `patchUnkeyedChildren`；`patch` / `mountElement` / `patchElement` / `patchChildren` 的分发引用对应区域。第 30 章的 diff 不需要组件，`processComponent` 等调用在正文里一句话带过（「第 31 章补上」）。
- **练习写哪一段**（起始代码 = `domSource('host')` 折叠 + 零件 5b 挖空 + 演示代码，演示代码用 `h` 造 vnode、真实 `document` 里的节点做断言）：
  - `patchUnkeyed`：挖空 `patchUnkeyedChildren`。
  - `syncEnds`：挖空 `syncEnds`（头部同步、尾部同步）和 `mountOrUnmountRest`（旧的比完/新的比完）。
  - `lisPlan`：把 `getSequence` 作为已给出，挖空 `patchUnknownSequence`（算映射、判断是否乱序、倒着挂载或移动）。
  - 判题改成断言**真实 DOM 节点**：给每个 `li` 建好后记下节点引用，更新后检查「被移动的节点还是同一个对象」「被卸载的不在页面上」「新增的是新节点」。这比原来的回调记录更接近 diff 的目的，而且不用再有一套 `h.patch/h.mount/h.unmount` 玩具回调。
- **复用**：用第 28 章写的 `h` 造 vnode，用第 29 章之前不涉及的东西。`syncEnds`、`lisPlan` 写好的代码，到第 31 章成为「已有零件」，注释标明「这是你在第 30 章写的」。
- **练习处置**：`patchUnkeyed`、`syncEnds`、`lisPlan` 改用共享零件（去掉以 key 字符串当节点的玩具模型）；`diffKey`（删除一行后输入框内容错位）保留（真实 Vue 的现象）。

### 第 31 章 组件运行时（零件 6a、6b）

- **正文展示**：31.1–31.7 逐段引用零件：`processComponent` 的分发在 `patch`（31.2）；`createComponentInstance`、`setupComponent`（31.3）；`mountComponent`、`setupRenderEffect`（31.4，重点讲 `componentUpdateFn` 的两条路径、`effect(… { lazy, scheduler })`、`job.id = instance.uid`、`runIfDirty`）；`updateComponent`、`shouldUpdateComponent`（31.5）；`provide` / `inject`（31.6）；钩子（31.7）。31.8「拼一个迷你 Vue」不再贴 450 行清单，改为：一张「零件来源表」（哪一段来自第几章）+ 一个完整可运行的演示，并告知学习者「这一整套就是 `course/mini`，你在第 24–30 章写过其中一半」。
- **练习写哪一段**：
  - `miniMount`：挖空 `mountComponent`、`setupRenderEffect`（第 1.2 节的例子）。
  - `miniShouldUpdate`：挖空 `shouldUpdateComponent`。
  - 两道练习的起始代码都是**第 24–30 章写好的全部零件（折叠）+ 零件 6a + 零件 6b（本章部分挖空）+ 演示**。折叠块的标题要写明来源：`fold('第 24–30 章你写过的零件', domSource('element'))`。
- **复用（这是整门课「一个东西逐步长大」的兑现处）**：
  - `effect` 的 `lazy`、`scheduler`（第 24 章）用来建渲染副作用函数。
  - `queueJob`、`queuePostFlushCb`（第 25 章）用来排更新任务和 mounted 钩子。
  - `currentInstance`（零件 3 里声明、第 31 章设置）让第 26 章的 `watch` 在组件里自动停止、`flush: 'pre'` 排在所属组件的更新之前。
  - `h`（第 28 章）、`patch` / `patchKeyedChildren` / `getSequence`（第 30 章）直接被 `createApp(...).mount(...)` 使用。
- **练习处置**：`miniMount`、`miniShouldUpdate` 改用共享零件。现有的 `MINI_REACTIVE + UPDATE_PART + …` 字符串常量**全部删除**，改成 `domSource(…)`。

### 第 32 章 渲染器（零件 7a、7b）

- **正文展示**：32.2 `createRenderer(options)`：展示 `wrapCreateRenderer` 的结果（头部那行解构）并强调「里面的代码一行没变，只是 `document` 换成了 `options`」。32.4 `RendererOptions` 每个函数在哪一步被调用：对照零件 5b 里 `hostInsert` 等的调用位置。32.5 `runtime-dom` 的 `patchProp`：引用零件 5a 的 `hostPatchProp`（迷你版分两类）和真实版的差别。32.3 Canvas 渲染器：保留，用真实 `createRenderer`。
- **练习写哪一段**：`stringRenderer`（把组件渲染成 HTML 字符串）：推荐改成「起始代码 = `rendererSource({ stringHost: false })` 折叠 + 学习者写 `stringHost`（`setElementText` / `patchProp` / `serialize`）+ 演示」，答案用零件 7b 的 `stringHost`、`serialize`。判题仍然拿真实的 `renderToString` 对照（`Vue.createSSRApp` + `@vue/server-renderer` 不在练习环境里，判题时用页面里已有的 `Vue.createSSRApp` 或固定的期望字符串）。
- **复用**：渲染器本体就是第 30、31 章写的那一份。
- **练习处置**：`rendererInsert`、`fbRenderer` 保留（真实的 `createRenderer`）；`stringRenderer` 改用共享零件（可选，工作量中等；不改也不影响别的章，保留则它仍然用真实 `createRenderer` 并自己写 `options`）。

### 第 33 章 内置组件（不接入，约定接口）

- `miniKeepAlive`（搬家加 LRU）、`miniEnter`（Transition 按帧加减 class）**保留独立**。它们讲的是「DOM 节点搬到一个不在页面里的容器」和「按帧调度」，都是对真实 DOM 的小操作，与 vnode/diff 没有数据结构关系；接到迷你 Vue 上要先加 `activate / deactivate`、`COMPONENT_SHOULD_KEEP_ALIVE` 标记位、存储容器，代价大于收益，反而把「搬家 + LRU」的重点淹没。
- **如果以后要接**，约定如下（不需要现在实现）：`ShapeFlags` 增加 `COMPONENT_SHOULD_KEEP_ALIVE: 256`、`COMPONENT_KEPT_ALIVE: 512`；`unmount(vnode)` 开头加 `if (vnode.shapeFlag & 256) return keepAliveCtx.deactivate(vnode)`（把 `vnode.component.subTree` 的 `el` 用 `move` 搬进 `storageContainer`，不 `unmountComponent`）；`processComponent` 开头加 `if (n2.shapeFlag & 512) return keepAliveCtx.activate(n2, container, anchor)`（用 `move` 搬回来，必要时 `updateComponent`）；`KeepAlive` 自己是一个组件，`setup` 里用 `Map` 做缓存、`keys` 做 LRU。`move` 已经是零件 5b 的区域，搬家直接用。

### 第 34–35、37–42 章

34 设计模式、35 API 设计、37–42 不接入迷你 Vue。若引用 `reactive` / `effect` 的原理，用 `<!-- mini:reactivity#… -->` 标记引用零件 1 的区域。

### 第 36 章 SSR 与水合（零件 8，可选）

- **正文展示**：36.7 水合怎样把 vnode 和 DOM 对上：引用 `hydrate` 区域（`hydrateNode` 的 4 个分支：文本、缺节点、标签不匹配、复用元素并补事件、子节点逐个水合并处理多余节点）。正文要明说迷你版**不水合组件**：真实版在 `setupRenderEffect` 首次渲染时发现 `vnode.el` 已有值，就调 `hydrateNode` 代替 `patch(null, subTree)`，这一步迷你版没做（见差别表）。
- **练习写哪一段**：`miniHydrate`：挖空 `hydrate` 区域；vnode 用 `h(...)` 造（原来的 `{ tag, props, children }` 对象改成 `h('div', { onClick }, [...])`，文本直接用字符串）。起始代码 = `domSource('host')`（需要 `Text`、`ShapeFlags`、`h`、`patch`、`hostXxx`）+ `PARTS.hydrate` 挖空 + 演示。判题的统计（复用几个元素、不匹配几处）按零件 8 返回的不匹配列表算，「复用」数 = `vnode.el` 等于服务器原节点的元素数。
- **练习处置**：`fbSsr`、`ssrMismatch` 保留（真实 SSR）；`miniHydrate` 改用共享零件。

## 5. 正文里的代码块怎样和零件保持一致

正文里贴出来的迷你代码，如果是零件里的一个区域，在代码块**前一行**写一行 HTML 注释：

```markdown
<!-- mini:element#patchKeyedChildren -->
```js
function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
  …
}
```
```

`tests/unit/mini-chapters.test.ts` 会扫描所有章节，对每个标记比较「去掉注释和空行之后的代码」和 `region(PARTS[零件], 区域)`。所以正文可以删掉长注释或省略 `//#region` 行，但不能改代码。零件改了，引用它的章节的测试会失败，提示作者去同步。这个测试现在没有章节使用标记，是空转的；第一个使用标记的作者请先跑一遍 `npm run check:content` 确认 HTML 注释不会被内容校验拒绝（如果拒绝，把注释写成 `<span data-mini="…"></span>` 并改测试里的 `MARK` 正则）。

## 6. 长代码在练习编辑器里的呈现，和需要的共享改动

### 现状

练习编辑器（`style.css` 里 `.vp-doc .ed .cm-editor`）超过约 24 行就限高 `min(70vh, 24 * 1.55em + 12px)` 并内部滚动。共享零件一到第 31 章是 540–640 行代码，学习者要改的只有几十行；放进现在的编辑器，学习者要在一个 24 行高的窗口里滚动几百行去找 TODO。

### 评估：需要「已有零件折叠、只读；要写的部分展开」

需要。不做的话，第 30、31 章的体验比现在更差（现在第 31 章的清单也有 400+ 行，但至少「已经写好」的部分是学习者自己写过的、位置固定的）。这属于 `Exercise.vue` / `editor/entry.js` 的改动，**本次没有动**，下面是给主控的需求和数据格式。

### 数据格式（零件侧已经支持）

在练习的 `js` 字符串里，用两行注释圈出「已经写好、折叠、只读」的块：

```js
//#fold 第 24–30 章你写过的零件
…… 几百行已有代码 ……
//#endfold
```

`course/mini` 的 `fold(标题, code)` 就是生成这对标记。编辑器还不认识它们时，它们只是两行普通注释，所以**写作者现在就可以用**，不影响运行、判题和「代码是否真的改了」的比较（后者会去掉注释）。

### 需要编辑器做的事（建议）

1. **初始折叠**：载入文档时，把每个 `//#fold 标题` … `//#endfold` 之间的行折叠成一行摘要（「▸ 第 24–30 章你写过的零件（438 行）」），用 CodeMirror 的 `foldService` + 初始 `foldEffect` 即可；点击摘要展开、再点折叠。
2. **只读**：折叠块（含标记行）内的任何改动都拒绝，可以用 `EditorState.changeFilter` 返回「允许的区间」。理由：学习者改坏已有零件会让后面的 bug 变得莫名其妙；想自己改的人可以点「重置」或复制出去。若觉得过严，也可以只在折叠状态下只读，展开后可编辑。
3. **错误行号**：运行出错时 `lineOf` 给出的「脚本第 N 行」仍然按整个字符串算，行号会很大（折叠块在前面）。建议错误提示改成「（脚本第 N 行，在 `<标题>` 里）」当行号落在折叠块内；落在折叠块之后时，同时显示折叠块之外的相对行号，或自动展开并跳到那一行（`gotoErrLine` 已有）。
4. **限高**：折叠之后可见行数就在 24 行内，现有限高不用改。展开折叠块时可以放宽到 `70vh`。
5. **参考答案/半成品按钮**：「看参考答案」「半成品」显示的内容同样含 `//#fold` 块，同样折叠。

### 另外两处需要（都很小）

- **`check:content` / 练习测试**：目前不需要改。如果以后某一道练习的 `js` 超过某个长度被校验规则嫌弃，再说。
- **`EXERCISE_API_NAMES` 与 `Exercise.vue` 的 `API` 同步**：`course/mini/index.ts` 里的 `EXERCISE_API_NAMES` 要和 `Exercise.vue` 里 `API = { … }` 的名字保持一致；`tests/unit/mini-source.test.ts` 会在 `Exercise.vue` 新增名字而这边没跟上时失败。另一个 agent 正在给 `Exercise.vue` 加 `libs`（Pinia / Router）注入的名字，注入这些名字的练习如果要和迷你版一起用，`libs` 名字也要避开零件里的顶层声明（目前零件里没有 `createPinia`、`useRouter` 等同名声明）。

## 7. 术语和命名

### 四个词（全课程统一）

| 词 | 指什么 | 代码里 |
|---|---|---|
| **渲染副作用函数**（简称 effect） | 组件的 `ReactiveEffect`：把渲染函数和响应式连起来的那一个 | `instance.effect` |
| **更新任务**（简称 job，代码里才写 `job`） | 放进更新队列的函数。组件的更新任务是它的渲染副作用函数的 `runIfDirty` | `instance.job`、`queueJob(job)` |
| **调度函数** | `effect.scheduler`：副作用函数被通知时调用它代替直接运行 | `e.scheduler` |
| **更新队列** | `scheduler.ts` 的 `queue` 和后置队列 `pendingPostFlushCbs`：**两个数组，三类任务**（前置任务 pre 侦听器、组件更新任务、后置任务） | `queue`、`pendingPostFlushCbs` |

「**调度器**」只指 `scheduler.ts` 这个模块（第 25 章）。需要指 `effect.scheduler` 的地方一律写「调度函数」，不写「调度器」，也不单独写英文 `scheduler`（写 `effect.scheduler` 或 `scheduler` 选项时带上 `effect.` 或明确是「选项」）。

### 各章现在不一致的叫法（只列清单，不改章节）

行号是 2026-10 的 `grep` 结果，章节重写后会变，作者按词搜。

| 现在的写法 | 位置 | 应改成 |
|---|---|---|
| 渲染 effect | `24-reactivity.md:441`、`36-ssr.md:363`、`36-ssr.md:581` | 渲染副作用函数 |
| 术语定义「放进更新队列的函数，例如组件的更新函数」 | `25-scheduler.md:45`（job 的术语块） | 「放进更新队列的函数。组件的更新任务是它的渲染副作用函数的 `runIfDirty`」（顺手修正：「更新函数」和「更新任务」是两件事） |
| 更新 job | `25-scheduler.md:278`、`:615`、`:652` | 更新任务 |
| 「调度器有三种任务」/「调度器管理两个数组」 | `25-scheduler.md:217`、`:274` | 统一成「两个数组，三类任务」；「调度器」后面接模块动作，不接数据 |
| 「3.5 没有单独的前置队列」 | `25-scheduler.md:219` | 保留意思，措辞改成「3.5 没有单独的前置队列：前置任务和组件更新任务在同一个数组里」，避免和「两个数组」读起来矛盾 |
| 正文里裸写 `job`（不在代码里） | `25-scheduler.md` 约 40 处、`26-watch-impl.md` 约 35 处、`31-runtime.md` 约 17 处 | 正文写「更新任务」；`job` 只出现在代码和第一次引入时的括号里 |
| 「scheduler」指调度函数时写英文 | `24-reactivity.md` 6 处、`26-watch-impl.md` 14 处、`31-runtime.md` 12 处 | 逐处判断：指 `effect.scheduler` → 「调度函数」；指选项名 → `scheduler` 选项；指模块 → 「调度器」 |
| 「调度器」指调度函数 | `24-reactivity.md:694`（选项「被调度器丢弃」）、`26-watch-impl.md:28`、`:41`（「侦听器交给调度器的函数」，其实是更新任务） | 24:694 → 「被调度函数丢弃」（先确认原意）；26:41 → 「侦听器交给更新队列的更新任务」 |
| 「任务队列」 | `25-scheduler.md`（1 处） | 更新队列（和浏览器的微任务队列区分时写「微任务队列」） |
| 「组件的更新函数」/「更新函数」 | `25-scheduler.md`（各 1 处，术语块附近） | 更新任务（说函数本体时写「渲染副作用函数」） |
| `miniRef` / `miniReactive` / `miniEffect` / `miniWatch` / `miniNextTick` / `queuePostCb` | 现有练习、练习说明、`MINI_*` 常量 | `ref` / `reactive` / `effect` / `watch` / `nextTick` / `queuePostFlushCb`（和真实同名） |
| `source.__isRef` | `26-watch-impl` 练习说明 | `source.__v_isRef` |
| 术语表里 `scheduler` 一类词条 | `course/glossary.md`、`course/writing-terms.mjs`（「更新队列」词条：`avoid` 里有「调度队列、任务池」，可加上「任务队列」「更新函数」「渲染 effect」） | 加入「不使用的同义词」 |

规模：明确需要改的约 20 处；裸写 `job`、英文 `scheduler` 要逐处判断，约 100 处。

### 命名约定小结

- 迷你版函数**不加 `mini` 前缀**，同名覆盖，靠 `function` 声明（2.5）。
- 正文说「迷你版的 `h`」，不说「`miniH`」；`course/exercises` 里的练习 id（`miniH`、`miniMount`）是存储键，保留。
- 练习脚本里需要真实 API 时写 `Vue.xxx`。
- 和真实源码同名的内部函数一律用真实的名字（`queuePostFlushCb`、`flushPostFlushCbs`、`pendingPostFlushCbs`、`hostInsert`、`getNextHostNode`、`updateComponentPreRender`……），正文和真实源码互相对得上。

## 8. 实验台怎样用共享零件

### 现状

`course/labs/31-runtime/miniTrace.ts`（464 行）是一份**第二份实现**：自己的 `reactive`、`patch`、更新队列，在每个内部函数入口记一条日志，把微任务换成手动 `flushJobs` 以便单步回放。它和共享零件之间没有关系，是第二个分叉点。

### 做法：不复制实现，运行共享零件并包一层追踪

`course/mini/load.ts` 的 `runMini` 提供三个能力，让实验台不需要自己的实现：

| 需求 | 用法 |
|---|---|
| 在函数入口记日志 | `traced: ['patch', 'mountComponent', …]`，`trace: ({ fn, args, depth }) => …`。原理：运行后把同名的 `function` 声明重新赋值成一层包装，脚本内部的相互调用也会经过它（已测试） |
| 拿到函数的返回值（如创建的组件实例） | `traceReturn: ({ fn, args, depth }, result) => …` |
| 微任务换成手动 | `globals: { Promise: FakePromise }`，`FakePromise.resolve().then(fn)` 把 `fn` 存起来；实验台点「下一步」时手动调用（已测试：同一个 `queueJob` 只安排一次刷新） |
| 读队列、实例 | `runMini` 返回的对象里 `queue`、`pendingPostFlushCbs` 是活的（getter）；`createComponentInstance` 用 `traceReturn` 拿；`currentInstance` 通过 `lets: ['currentInstance']` 导出 |
| 记录 DOM 操作 | 宿主函数 `hostInsert`、`hostRemove`、`hostCreateElement`、`hostSetElementText`、`hostPatchProp` 等是 `function` 声明（零件 5a），直接放进 `traced` 即可（已测试） |

示例（实验台的 `runScenario` 的骨架）：

```ts
import { domSource } from '../../mini'
import { runMini } from '../../mini/load'

const callbacks: Array<() => void> = []
const FakePromise = { resolve: () => ({ then: (fn: () => void) => { callbacks.push(fn); return {} } }) }
const instances: any[] = []

const vue = runMini<any>(domSource(), {
  globals: { document, Promise: FakePromise },
  traced: ['queueJob', 'queuePostFlushCb', 'patch', 'mountComponent', 'updateComponent', 'shouldUpdateComponent', 'hostInsert', 'hostSetElementText'],
  trace: e => steps.push({ depth: e.depth, fn: e.fn, args: e.args }),
  traceReturn: (e, r) => { if (e.fn === 'createComponentInstance') instances.push(r) }
})
// 场景：vue.createApp(App).mount(container)；点「下一步」时：callbacks.shift()?.() 运行刷新
```

实验台组件（`MountUpdateStepper.vue`）不用改；改的是 `miniTrace.ts`：删掉它自己的实现，换成上面的 `runMini` 调用，把 `Step`、`InstanceView` 的组装留在 `miniTrace.ts`。**是否现在重写 `miniTrace.ts` 由主控决定**（不在本次范围）：重写后第 31 章的实验台与练习、正文跑的是同一份代码，学习者在实验台看到的步骤就是自己写的那段代码的步骤。

不够用时的扩展点：需要记录**函数内部**的细节（例如 `componentUpdateFn` 里「第一次/更新」的分支）时，不要在零件里加 `trace(...)` 调用（会污染学习者读的代码）；要么把那一步拆成独立函数（例如 `renderComponentRoot`），要么在实验台里用 `traceReturn` 观察结果。

## 9. 测试

`tests/unit/mini-*.test.ts`，随 `npm run test:unit` 运行，152 条：

| 文件 | 测什么 | 与真实 Vue 的对照 |
|---|---|---|
| `mini-source.test.ts` | 每个零件是纯脚本、有「对应真实源码」和「差别」注释、区域标记成对；顶层声明不撞注入名；`EXERCISE_API_NAMES` 覆盖 `Exercise.vue`；每个前缀都能在注入同名参数的环境里 `new Function` 运行；每个区域都能单独挖空且仍是合法 JS；区域工具；代码行数预算 | — |
| `mini-reactivity.test.ts` | effect 的运行次数和顺序：依赖收集、相同值不触发、分支切换清理、嵌套、自触发不循环、多订阅者顺序、`scheduler`、`lazy`、`stop`；`ref`；`computed` 的惰性和缓存、链、多读；`effectScope`（停止、dispose、嵌套、detached） | 同一段代码跑在迷你版和 `@vue/reactivity` 上，断言日志一致 |
| `mini-scheduler.test.ts` | `queueJob` 去重、按 id、pre 排位、运行中再入队、`allowRecurse`、`disposed`、`nextTick` 与后置任务的先后、后置队列去重和排序；`watch` 的 (新值, 旧值)、合并、`immediate`、getter、deep、`onCleanup`、`stop`（含已排队的）、三种 flush、回调里改来源；`watchEffect` | 同一段代码跑在迷你版和 `@vue/runtime-core` 上（真实的 `queueJob` 不导出，用 `watch` 和 `queuePostFlushCb` 对照） |
| `mini-render.test.ts` | 元素挂载/更新/卸载的**宿主操作序列**；keyed diff 的 12 个典型案例和 **200 组随机列表**（`insert/remove/create` 序列逐条一致，即移动、挂载、卸载的集合和顺序都相同）；无 key 列表；混合 key | 同一棵 vnode 树渲染到同一个会记录操作的宿主，比较两份操作记录 |
| `mini-component.test.ts` | 父子组件的 setup/render/钩子顺序；更新次数（同步改三次、只改父的无关数据、子自己的数据、父改 props 同时子改自己的数据、emits 声明的监听器不触发更新、去掉 prop）；根节点类型变化；卸载（`beforeUnmount` 同步、`unmounted` 在后置队列、卸载后任务被丢弃）；`provide/inject`；侦听器 flush 与渲染的先后（含父改 props 触发子的 pre 侦听器）；组件列表重排 | 同一段使用代码跑在迷你版和真实 `createRenderer` 上，比较宿主操作序列、事件序列、最终结构 |
| `mini-dom.test.ts` | `h` 的 16 种调用与真实 `h` 的 `type/props/children/key/shapeFlag` 一致；DOM 形态跑通计数器；只拼到第 30 章的前缀可用；字符串渲染器与 `@vue/server-renderer` 的 `renderToString` 输出一致；水合；`createRenderer` 换 options；追踪钩子 | 字符串渲染器对照 `renderToString`；`h` 对照真实 `h` |
| `mini-chapters.test.ts` | 章节里的 `<!-- mini:… -->` 代码块和零件一致 | — |
| `mini-helpers.ts` | 公用工具（不是测试）：记录操作的宿主、假 DOM、对照运行 | — |

迷你版**刻意不支持**的行为不测，它们列在每个零件文件头部的「和真实实现的差别」里，也列在下面的差别表里。

## 10. 与真实实现的差别（统一格式的表，章末直接用）

每章末尾的「迷你版和真实实现的差别」表统一成三列：**方面 | 真实实现（3.5.43） | 迷你版**，放在 `::: deep 迷你版和真实实现的差别` 容器里（第 25、26、31、33 章现有的那张表按这个格式重写）。下面是已经核对过的内容，可以直接取用相关行。

### 零件 1 响应式（第 24 章）

| 方面 | 真实实现 | 迷你版 |
|---|---|---|
| 依赖存储 | `Dep` 和 `Link` 双向链表，每个 Dep 带版本号 `version`，副作用函数运行后只清理没用到的 Link | `Set`；每次运行前清掉全部依赖再重新收集 |
| 判断「要不要重新运行」 | `runIfDirty` 比较 Dep 的版本号 | `e.dirty` 布尔值：被通知时置 true，运行时置 false |
| `effect` 的返回值 | 返回 runner 函数（带 `.effect`） | 返回 `e` 对象（`e.run()`、`e.stop()`） |
| `lazy` 选项 | 3.5 已移除（用 `new ReactiveEffect(fn)` 手动运行） | 保留，用来建渲染副作用函数 |
| 批处理 | `startBatch / endBatch`，一次写入通知的多个副作用函数在批末尾按订阅顺序运行 | 无；`trigger` 里逐个运行 |
| `computed` | 同时是订阅者和 Dep，依赖变了先检查结果是否真的变了，没变不通知下游；链式 computed 先检查依赖再重算（`a` 先于 `b`） | 一变就通知下游；链式 computed 由下游读取时拉动（`b` 先开始，读 `a` 时 `a` 才算） |
| 代理的覆盖范围 | `get / set / has / deleteProperty / ownKeys`，数组方法（`push` 等）、`Map / Set`、`readonly`、`shallow` | 只有 `get / set / deleteProperty`；没有 `has` 和 `ownKeys` 的追踪（`in`、`for…in`、`Object.keys` 不收集），没有数组和集合的专门处理 |
| `ref` | 类 `RefImpl`，包装对象时用 `toReactive` | 对象字面量加 getter / setter，值读出时用 `reactive` 包 |

### 零件 2 调度器（第 25 章）

| 方面 | 真实实现 | 迷你版 |
|---|---|---|
| 去重和标记 | `job.flags` 里的 `QUEUED / PRE / ALLOW_RECURSE / DISPOSED` 位 | 布尔字段 `queued / pre / allowRecurse / disposed` |
| 队列遍历 | `flushIndex` 下标遍历，任务运行时仍在数组里 | `queue.shift()`，当前任务已不在队列里 |
| 递归保护 | 同一个任务超过 100 次报 `Maximum recursive updates exceeded` | 无 |
| 错误处理 | 任务抛错走 `callWithErrorHandling`，队列的标记位在 `finally` 里复位 | 无；任务抛错会让队列停摆 |
| 后置队列 | 嵌套的 `flushPostFlushCbs` 会并入正在运行的列表 | 不处理嵌套；后置任务里再入队的更新任务由 `flushJobs` 末尾的重新刷新处理 |
| 其他 | Suspense 的后置队列、`flushPreFlushCbs` 带递归检查 | 无 |

### 零件 3 watch / effectScope（第 26 章）

| 方面 | 真实实现 | 迷你版 |
|---|---|---|
| 侦听源 | `ref`、`reactive`、getter、以上的数组 | `ref`、`reactive`、getter（没有数组） |
| 选项 | `immediate`、`deep`（可给层数）、`once`、`flush`、`onTrack / onTrigger` | `immediate`、`deep`（布尔）、`flush` |
| 清理 | 第三个参数 `onCleanup` 和全局 `onWatcherCleanup` | 只有第三个参数 `onCleanup` |
| 返回值 | `WatchHandle`：可调用，带 `pause / resume / stop` | 只是一个 `stop` 函数 |
| 组件内的 `flush: 'pre'` | `job.id = instance.uid`，`job.i = instance` | `job.id = currentInstance.uid` |
| `effectScope` | 链表、`paused` 状态、`on / off` | 数组；有 `run / stop`、嵌套、`detached`；没有暂停 |

### 零件 4 vnode（第 28 章）

| 方面 | 真实实现 | 迷你版 |
|---|---|---|
| 字段 | 还有 `patchFlag`、`dynamicChildren`、`ref`、`ctx`、`anchor`、`suspense`、`transition`…… | 只有 `type props children key shapeFlag el component` |
| 子节点规范化 | `patch` 时对每个子节点 `normalizeVNode`；`null / boolean` 变注释节点；重复使用的 vnode 会被克隆 | `h` 里规范化；`null / boolean` 变空文本；vnode 不能重复使用 |
| 类型 | `Fragment / Comment / Static / Teleport / Suspense / KeepAlive` | 只有 `Text`、元素、有状态组件、函数式组件 |

### 零件 5a、5b 元素与 diff（第 30 章）

| 方面 | 真实实现 | 迷你版 |
|---|---|---|
| 编译优化 | `patchFlag` 决定只对比动态 props、`dynamicChildren` 只对比动态节点 | 没有；总是对比全部 props 和全部子节点 |
| 无 key 的数组 | `h()` 手写的 vnode 一律走 `patchKeyedChildren`；`UNKEYED_FRAGMENT` 标记才走 `patchUnkeyedChildren` | 所有子节点都没有 key 时走 `patchUnkeyedChildren`；对同类型节点结果相同（有测试） |
| 属性 | `class / style / 事件 invoker / DOM prop / attribute` 五类，`value` 特殊处理 | `hostPatchProp` 分「事件」「普通 attribute」两类 |
| 其他节点 | `Fragment / Comment / Teleport / Suspense`、`ref`、指令、过渡 | 无 |

### 零件 6a、6b 组件运行时（第 31 章）

| 方面 | 真实实现 | 迷你版 |
|---|---|---|
| 组件形式 | 选项式 API、`setup` 返回对象、`template`、`render` 选项 | `setup` 只能返回渲染函数；函数式组件是 `(props) => vnode` |
| props | 声明、校验、默认值、`attrs` 透传、`shallowReactive` | 不声明，全部 `vnode.props`（去掉 `key`）进 `reactive`；没有 `attrs` 透传 |
| 更新 props | `updateProps` 按声明处理 | 逐个赋值，旧的有新的没有就 `delete` |
| 重复更新 | `runIfDirty`（同上） | `runIfDirty`（同上，用 `dirty` 布尔值） |
| 钩子 | 包一层让钩子里能用 `getCurrentInstance`，加上错误处理；还有 `onErrorCaptured`、`onRenderTracked` 等 | 直接存进数组；六个基本钩子 |
| 卸载时的 mounted | `invalidateMount` 让还没运行的 mounted 失效 | 无（卸载后 mounted 仍会运行） |
| 根 vnode 变了 | `updateHOCHostEl` 同步父组件 vnode 的 el | 无 |
| `app` | `app.use / component / directive / provide / config` | 只有 `mount / unmount` |
| `emit` | 校验 `emits`、`once`、`update:` 等 | 调用 `vnode.props.onXxx` |
| 插槽 | `slots` 对象、`initSlots / updateSlots` | 不渲染 |

### 零件 7b / 8（第 32、36 章）

| 方面 | 真实实现 | 迷你版 |
|---|---|---|
| 字符串渲染器 | `@vue/server-renderer` 直接把组件渲染成字符串，不经过 `patch` | 走 `createRenderer` 的 options（演示用），输出与 `renderToString` 在简单树上一致 |
| 水合 | 组件、Fragment、Teleport、Suspense、延迟水合策略、对 class / style / attribute 的不匹配检查 | 只水合元素和文本；报告标签、文字、缺子节点、多子节点四类不匹配 |

## 11. 没做完或要注意的地方

- **代码量超出任务书的预算**：拼到第 31 章是 638 行代码（723 行含注释），任务书是 300–400 行。拼到第 30 章 490 行，其中 `element` 一段就是 171 行（keyed diff 的五个步骤加最长递增子序列本身就长，真实 Vue 的这一段是同样的结构）。要压到 400 行，得砍掉：`pre` 侦听器的排队与 `flushPreFlushCbs`、`runIfDirty`、`effectScope` 的嵌套、六个钩子里的四个、`emit`/`emits`、函数式组件、插槽标记位，每一项都是真实 Vue 的可观察行为。我选择保留行为的忠实度，靠折叠（第 6 节）解决「一次读很多」的问题：每一章的学习者只需要读自己那一段（最长 171 行），前面各章写过的部分折叠。`tests/unit/mini-source.test.ts` 里有行数预算，防止继续膨胀。如果主控希望更小，建议砍的顺序是：函数式组件 → `emit`/`emits` + `isEmitListener` → 嵌套 `effectScope` → `flushPreFlushCbs`。
- **`depCleanup` 的挖空**：`effect` 里 `cleanup(e)` 的调用没有单独的区域。要做「起始代码里 `run` 不清理」，现在用 `sub(答案, '      cleanup(e)\n', '')` 在答案上替换。如果写作者觉得别扭，给零件 1 的 `effect` 里这一行加一个 `//#region runCleanup` 子区域（不影响别的，要同步测试里的区域数量断言）。
- **`stringRenderer` 的判题**要用 `renderToString`：练习环境里没有 `@vue/server-renderer`。`Vue` 是带编译器的完整构建，没有 `renderToString`。建议判题用固定的期望字符串，或者保持这道题用真实 `createRenderer`（第 4 节已写）。
- **`Exercise.vue` 折叠/只读**：没有做（不在范围）。
- **`miniTrace.ts` 没有重写**（不在范围），见第 8 节的做法。
- 单元测试里与真实 Vue 的对照用的是 `@vue/runtime-core` 的 cjs 开发构建；它的 `[Vue warn]` 会打到 stderr（卸载场景里一条），不影响结果。
- 水合不支持组件；`KeepAlive` 没有接入；这两项都是有意的（第 4 节写了理由）。
