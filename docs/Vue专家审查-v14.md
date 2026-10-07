# Vue 3 课程第 14 版：Vue 专家技术审查

审查对象：`review-v14.html`（28 个章节区块，60 道综合测验，54 道练习）。只读审查，课程文件没有修改。
核实方法：用 vue 3.5.13（cjs 版本加 jsdom）、@vue/compiler-sfc 3.5.13、vue/server-renderer 实际运行代码。查 runtime-core 3.5.13 源码。用 npm registry 查各包的当前版本（2026-10）。

## 结论

**一句话结论：** 第 4 版审查报告列出的 6 处错误和 8 处误导已经全部修正。内容缺漏基本补齐，包括内置组件、插槽、插件、表单、渲染函数、工程化与测试、迁移。原理章节和 3.5 源码基本一致。剩下的问题有三类：几处行为描述与 3.5 实际运行结果不符；"深入"部分的调度器代码与 3.5 源码有一处关键差异；2026 年生态的新版本（Vue Router 5、Vite 8）还没有跟进。

**技术准确性评分：4.5 / 5**

### 旧问题复查（第 4 版报告）

| 旧问题 | v14 状态 |
|---|---|
| useMouse 在 onUnmounted 中读到 null | 已修复（9.1 在 onMounted 中保存 el） |
| createRenderer 的 insert 不处理移动 | 已修复（24.2，另有练习 rendererInsert） |
| "await 之后不能注册钩子"说得太绝对 | 已修复（6.1 说明了 withAsyncContext 例外） |
| 队列用 id 去重 / 刷新时排序 / 100 次限制 | 已修复（13.1 讲 QUEUED 和二分插入；13.4 说明检查只在开发环境运行） |
| useFetch 取消请求后 loading 提前变为 false | 已修复（9.4 中 AbortError 直接 return） |
| 事件缓存、index 作 key、v-if 分支的 key、computed 3.5 机制、守卫顺序、`$reset`、`includes` 查找顺序 | 全部已修正 |
| 测验答案全是 B、有重复题 | 已修复（选项按题号打乱，60 题无重复） |
| 内容缺漏（内置组件、插槽、插件、h()、工程化、测试、迁移） | 基本补齐 |

本次核实正确的部分说法（不再列入问题清单）：
- computed 值相同时组件不重新渲染（实测 0 次）。
- `watch` 的 `deep: 1`：push 触发，下标赋值触发，修改字段不触发（实测 1/1/0）。
- 卸载时模板 ref 的值：onBeforeUnmount 中是元素，onUnmounted 中是 null（实测）。
- `useId()` 的格式是 `v-0`，设置 `idPrefix` 后是 `board-0`（实测）。
- 水合时 class 不匹配不修正，列表多出的节点被删除（测验 #57，实测）。
- 解构的 prop 直接传给 `watch` 时报编译错误；类型参数和运行时参数同时传给 defineProps 时也报编译错误（实测）。

---

## 问题清单

### 一、错误（5 条）

**E1. 15.4 节：事件缓存的效果说错了**
- 原文："父组件写 `<Counter @inc="count++" />`。没有缓存时，每次渲染都创建新的箭头函数。Counter 收到的 props 因此改变，它跟着更新。缓存后，每次都是同一个函数，Counter 不更新。"
- 问题：Counter 用 `emits` 或 `defineEmits` 声明了 `inc` 时，这个结论不成立。`shouldUpdateComponent` 比较 dynamicProps 时会跳过已声明的事件监听，所以即使没有事件缓存，Counter 也不更新。只有 Counter 没有声明这个事件时，`onInc` 才作为普通属性比较，Counter 才更新。`<script setup>` 组件通常都写 defineEmits，所以照原文理解会误判缓存的作用。
- 正确说法：没有缓存时，新函数让 `onInc` 进入 dynamicProps，父组件每次渲染都要比较它。子组件声明了 `emits` 时，Vue 跳过已声明事件的比较，子组件不更新。没有声明时，子组件跟着更新。事件缓存去掉的是这次比较和函数的创建。这也是"在 emits 中声明所有事件"的另一个理由。
- 核实：jsdom 中用运行时编译（不缓存事件），父组件更新 2 次。Counter 声明 emits 时 onUpdated 运行 0 次，不声明时运行 2 次。源码：runtime-core.cjs.js:6641 `if (nextProps[key] !== prevProps[key] && !isEmitListener(emits, key))`。

**E2. 5.3 节：defineModel 的本地模式**
- 原文："注意：写入 model.value 只发送事件。父组件没有写 v-model 时，父组件的数据不变。"
- 问题："只发送事件"不对。父组件没有传 `modelValue` 和 `onUpdate:modelValue` 时，`useModel` 进入本地模式：它更新自己的本地值并触发渲染，然后才 emit。所以子组件中的 `model.value` 会变成新值。这正是 defineModel 能写"非受控组件"的原因，也是真实项目中常见的困惑："父组件没绑 v-model，子组件却能输入"。
- 正确说法："写入 model.value 时，Vue 发送 update:modelValue 事件。父组件写了 v-model 时，父组件修改数据，新值通过 prop 传回子组件。父组件没有绑定 v-model 时，defineModel 在子组件内部保存这个值，子组件显示新值，父组件的数据不变。"
- 核实：子组件用 `useModel(props,'modelValue')`，父组件不传 v-model。执行 `m = 'x'` 后，子组件渲染为 `<i>x</i>`。源码：runtime-core.cjs.js:6237 `localValue = value`，6240 行 `i.emit(...)`。

**E3. 22.7 节：withSetup 测试和第 9 章的 useMouse 对不上**
- 原文：`const [{ x }, app] = withSetup(() => useMouse())`，`window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10 }))`，`expect(x.value).toBe(10)`
- 问题：课程自己的 useMouse（9.1 节）签名是 `useMouse(target)`。它在 onMounted 中读取 `target.value`，监听元素上的 `pointermove`，并用 `e.clientX - r.left` 计算坐标。不传参数调用时，挂载阶段就抛出 TypeError。即使传了参数，window 上的 `mousemove` 也不会被监听到。这段示例照抄会失败，读者会以为是 withSetup 写错了。
- 正确代码（二选一）：
  - 测试一个监听 window 的版本（例如 VueUse 风格的 `useMouse()`），并在正文中注明。
  - 按第 9 章的签名写：
    ```js
    const el = document.createElement('div'); document.body.append(el)
    const [{ x }, app] = withSetup(() => useMouse(ref(el)))
    el.dispatchEvent(new PointerEvent('pointermove', { clientX: 10 }))   // jsdom 中 getBoundingClientRect 为 0
    expect(x.value).toBe(10)
    ```
- 核实：对照第 9 章 9.1 节的源码阅读。`target` 为 undefined 时，`target.value` 抛出 TypeError。

**E4. 1.2 节"深入"：setupRenderEffect 与 3.5 源码不一致**
- 原文：`effect.scheduler = () => queueJob(update)`，`const update = (instance.update = () => effect.run())`，`update.id = instance.uid`
- 问题：3.5 放入队列的不是 `effect.run`。它是 `instance.job = effect.runIfDirty.bind(effect)`，id 也写在 job 上。这个差异是 4.1 节"computed 值不变时组件不更新"的关键：组件任务运行时先用版本号检查依赖（isDirty），确实变了才 run。照原文的 `queueJob(update)`，组件每次被通知都会重新渲染，和第 4 章的结论矛盾。
- 正确代码（3.5 简化）：
  ```js
  const effect = (instance.effect = new ReactiveEffect(componentUpdateFn))
  const update = (instance.update = effect.run.bind(effect))      // 强制更新（$forceUpdate）
  const job = (instance.job = effect.runIfDirty.bind(effect))     // 调度器运行的任务
  job.i = instance
  job.id = instance.uid
  effect.scheduler = () => queueJob(job)   // 只有依赖的版本号真的变了，才重新渲染
  update()
  ```
- 核实：runtime-core.cjs.js:5387–5391。实测：computed 从 `1>0` 变为 `2>0`，组件重新渲染 0 次。

**E5. 13.2 节：nextTick 的说法太绝对**
- 原文："nextTick() 返回一个 Promise。更新队列运行完成后，这个 Promise 完成。"（第 13 章小结、测验 #29 的解析也这样说）
- 问题：nextTick 返回的是"当前的刷新 Promise"。还没有安排刷新时，它返回一个已经完成的 Promise。所以先调用 `nextTick(fn)`、后修改数据时，fn 在 DOM 更新之前运行。在组合式函数或第三方库中，"先 nextTick 再改数据"的写法很常见，这个坑值得写出来。
- 正确说法："nextTick 等待当前已经安排的那次刷新完成。先修改数据，再调用 nextTick，才能读到新 DOM。在修改数据之前调用 nextTick，它的回调会在这次更新之前运行。"
- 核实：`nextTick(() => log(el.textContent)); c.value++` 打印 0。源码：runtime-core.cjs.js:284 `const p = currentFlushPromise || resolvedPromise`。

### 二、过时（4 条）

**O1. 19.7 节"深入：基于文件的路由"：unplugin-vue-router 已经合并进 Vue Router 5**
- 原文：`import VueRouter from 'unplugin-vue-router/vite'`，"unplugin-vue-router 根据 src/pages 中的文件生成路由"
- 问题：Vue Router 5.0.0 于 2026-01-29 发布，当前版本是 5.3.1。unplugin-vue-router 已经合并进 Vue Router 5，npm 上标记为 deprecated："Merged into vuejs/router"。
- 正确代码：
  ```ts
  import VueRouter from 'vue-router/vite'          // 仍放在 vue() 之前
  import { routes } from 'vue-router/auto-routes'
  ```
  删除 `/// <reference types="unplugin-vue-router/client" />`。
- 另外，第 19 章标题和正文写的是 Router 4。官方迁移指南说明：没有使用 unplugin-vue-router 时，从 4 升到 5 没有破坏性变化。建议正文改为"Vue Router 4/5"，并加一句说明。
- 核实：`npm view unplugin-vue-router deprecated`；router.vuejs.org/guide/migration/v4-to-v5.html。

**O2. 10.2 节库模式配置、22.1 节构建图：Vite 8 改用 Rolldown**
- 原文：`build: { rollupOptions: { external: ['vue'], output: { globals: { vue: 'Vue' } } } }`；22.1 节的构建图写"打包、压缩 Rollup"。
- 问题：Vite 8.0.0 于 2026-03-12 发布，当前版本是 8.3.3。Vite 8 用 Rolldown 和 Oxc 代替 Rollup 和 esbuild，`build.rollupOptions` 已改名为 `build.rolldownOptions`。旧名字目前还能兼容，但新项目（`npm create vue@latest`）已经是 Vite 8。
- 正确写法：`build.rolldownOptions: { external: ['vue'], output: { globals: { vue: 'Vue' } } }`。构建图改为 Rolldown，或写"Vite 7 及以前用 Rollup"。
- 核实：`npm view vite@8.3.3 dependencies` 包含 `rolldown`；vite.dev/guide/migration 写明 "build.rollupOptions: renamed to build.rolldownOptions"。

**O3. 21.3 节"深入：Vapor Mode"**
- 原文："Vue 3.6 的 alpha 版本开始提供它。它仍是实验功能。"
- 问题：当前 npm 的 dist-tag 是 `rc: 3.6.0-rc.10`，3.6 已经进入 RC。"alpha"的说法过时。
- 建议：改为"Vue 3.6 开始提供（截至 2026 年 10 月处于 RC 阶段），使用前查看官方文档中的当前状态"。

**O4. 页脚和速查表：实验台固定使用 vue@3.5.13**
- 原文："实验台从 jsDelivr 加载 vue@3.5.13"
- 问题：3.5.13 发布于 2024-11，当前 3.5 的最新补丁是 3.5.43（2026-09）。3.5.13 之后修复过 useId、Teleport defer、水合相关的若干缺陷。另外，Pinia 当前是 4.0.3（peer 依赖 `vue ^3.5.11`），课程没有写 Pinia 的版本号。
- 建议：实验台升级到 3.5 的最新补丁（课程中的 API 都兼容）。在第 18 章说明"示例适用于 Pinia 3/4"。

### 三、建议（7 条）

**S1. 16.4 节：没有 key 时用哪个算法**
- 原文："没有 key 时，Vue 使用 patchUnkeyedChildren。"
- 说明：只有编译器生成的、没有 key 的 v-for Fragment（UNKEYED_FRAGMENT，256）才走 patchUnkeyedChildren。手写 h() 返回的子节点数组没有 patchFlag，仍然走 patchKeyedChildren，key 都是 null，头部同步按位置 patch。两者的结果相同，但第 16 章的"回顾"题正好考 h() 列表。建议加一句说明。
- 核实：runtime-core.cjs.js:5410 起的 patchChildren：有 patchFlag 时按 KEYED/UNKEYED 分支；数组对数组的默认分支调用 patchKeyedChildren（5454 行）。

**S2. 21.1 节：虚拟列表的示例代码**
- 原文：`<div v-for="it in visible" :key="it.id" :style="{ top: it.id * rowH + 'px' }">`
- 问题：这段代码有两处问题。第一，它用 `it.id` 当下标，只在 id 恰好等于下标时正确，数据被过滤或排序后位置就错了。第二，行元素没有 `position: absolute`（外层也没有 `position: relative`），所以 `top` 不起作用。
- 建议：`visible` 返回 `{ item, index: start + i }`，模板中写 `:style="{ position: 'absolute', top: index * rowH + 'px' }"`，内层容器加 `position: relative`。

**S3. 17.5 节"深入"：sortByDom 用到了不存在的字段**
- 原文：`a.el.compareDocumentPosition(b.el)`
- 问题：同一节的 `register` 只保存了 `{ name, title }`，没有 `el`，照抄会报错。
- 建议：Tab 在 onMounted 中注册 `{ name, title, el: rootEl.value }`，或在示例前说明要先保存元素。

**S4. 第 23 章：缺少生产环境的水合排查开关**
- 建议：补一句：3.4 起，生产构建默认不输出水合不匹配的详情。排查线上问题时，在 Vite 的 `define` 中设置 `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true'`。真实项目中，这是 SSR 最常遇到的坑之一。

**S5. 3.1 节"深入"：RefImpl 简化代码漏了"值相同不触发"**
- 原文：`set value(v) { this._value = toReactive(v); trigger(this, 'value') }`
- 问题：3.5 的 setter 先用 `hasChanged`（Object.is）比较新旧值，值相同时不触发。这是 ref 的重要语义，例如 `count.value = count.value` 不会重新渲染。另外 3.5 用 `this.dep.track()` 和 `this.dep.trigger()`，不再用 track(target, key)。
- 建议：`set value(v) { if (hasChanged(toRaw(v), this._rawValue)) { this._rawValue = toRaw(v); this._value = toReactive(v); this.dep.trigger() } }`

**S6. 缺少 3.4 的 v-bind 同名简写**
- 说明：全文没有 `:id`（等于 `:id="id"`）这种 3.4 引入的写法。新项目和官方文档都在大量使用它，学员读别人的代码时会困惑。建议在 2.1 节的 v-bind 表格中加一行。

**S7. 15.4 节：3.5.13 编译结果中 -1 的注释**
- 原文："下面是 Vue 3.5 的真实编译结果：… `-1 /* CACHED */`"
- 说明：@vue/compiler-sfc 3.5.13 实际输出的注释是 `-1 /* HOISTED */`。shared 包的 PatchFlagNames 中 `[-1]` 仍是 'HOISTED'，枚举名已经是 CACHED。数值正确，只是"真实结果"的注释和实际输出不同，学员在 15.2 节的实验台中会看到 HOISTED。建议加一句说明，或把实验台升级后再核对。
- 核实：compileTemplate 输出 `_cache[1] || (_cache[1] = _createElementVNode("h1", null, "标题", -1 /* HOISTED */))`；shared.cjs.js:167。

---

## 练习与测验

- **测验（60 题）**：逐题核对了答案和解析，没有发现错误。#9、#25、#28、#34、#50、#54、#57、#58 用代码或源码核实过，答案正确。#29 和 #28 的解析可以随 E5 一起补一句"先改数据，再调用 nextTick"。
- **练习（54 道）**：逐题阅读了 task、hint 和 solution，答案都能满足题目要求。需要注意两点：
  - kanbanStore 和 fbPinia 的简化 defineStore 用 `reactive(setup())` 模拟 Pinia。这和真实 Pinia 的行为一致：ref 自动解包，action 可以直接解构。
  - 第 26 章"深入"中的测试示例给 TaskItem 加了 `createTestingPinia`，但 TaskItem 是只依赖 props 的展示组件，不需要它，建议删除，避免学员以为每个组件测试都要装 Pinia。

## 实战价值

- **场景真实**：场景大多来自真实业务，例如任务看板、筛选写入 URL、错误边界、组件库发布、微前端卸载插件、SSR 状态序列化（devalue），实战价值高。
- **常见坑覆盖较全**：覆盖了 index 作 key、watch 不加 deep、解构 reactive、async 之后注册钩子、v-click-outside 的同一次点击、history 模式 404、VITE_ 前缀泄露密钥。本次补充了 3 个高频坑：defineModel 本地模式（E2）、nextTick 调用顺序（E5）、生产环境水合详情开关（S4）。
- **"深入"内容**：Link/version 双向链表、批处理、QUEUED、PRE 标记的插入位置、KeepAlive 的 LRU、Teleport 的 defer、handleError、getSequence，都与 3.5 源码一致。唯一要改的是调度器放入队列的任务（E4）。
