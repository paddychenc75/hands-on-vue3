---
title: 自定义指令
id: directives
stage: 2
chapter: 10
desc: 钩子、binding、v-click-outside、v-lazy
---

<script setup>
import DirectiveHooks from '../figures/10-directives/DirectiveHooks.vue'
import ClickOutsideVIfRace from '../figures/10-directives/ClickOutsideVIfRace.vue'
import DirPlay from '../labs/10-directives/DirPlay.vue'
import DirOutside from '../labs/10-directives/DirOutside.vue'
</script>

# 自定义指令

::: goals
<Goal checks="sc:3">判断一个功能应该写成指令、组件还是组合式函数。</Goal>
<Goal checks="sc:4,ex:dirBinding">写一个指令，并读取 binding 的 value、arg 和 modifiers。</Goal>
<Goal checks="sc:0,sc:2">说明 7 个钩子的运行时间。</Goal>
<Goal checks="sc:1,ex:clickOutside,ex:outsideFill">写一个没有内存泄漏的 v-click-outside。</Goal>

:::

::: rt
阅读主线约 18 分钟，深入内容约 3 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
组件是**一件完整的家具**，有自己的结构和外观。指令是**贴在家具上的功能贴**：它不改变家具的结构，只给某个元素加一种行为，例如“自动获得焦点”或“点外面就关闭”。
:::

::: terms
自定义指令
: 复用对单个元素的 DOM 操作的对象。

指令钩子
: Vue 在元素的特定时刻调用的指令函数。

binding
: 钩子收到的对象。包含值、参数和修饰符。

参数（arg）
: 指令名冒号后面的部分，例如 v-pin:top 中的 top。
:::

::: why
三个组件都要在点击外部时关闭菜单。你在每个组件的 onMounted 中复制了监听代码。一个组件卸载后，点击页面仍然运行它的回调。

原因：这段 DOM 逻辑分散在每个组件中。每个组件都要自己删除监听，你漏掉了一个。

本章把它写成自定义指令。指令在一处添加监听，并在 unmounted 钩子中删除它。
:::

### 10.1 什么时候使用指令

自定义指令复用**直接操作 DOM 的逻辑**。它作用于一个元素。下表比较三种复用方式。

| 要复用的内容 | 使用 | 例子 |
|---|---|---|
| 模板、样式和逻辑 | 组件 | 按钮、对话框、表格 |
| 有状态的逻辑，没有模板 | 组合式函数（第 8 章） | useMouse、useFetch |
| 对一个元素的底层 DOM 操作 | 自定义指令 | 自动聚焦、点击外部、懒加载图片 |

先考虑组件和组合式函数。只有在必须接触 DOM 元素时，才写指令。

### 10.2 创建并注册一个指令

指令是一个对象。对象中的函数是钩子。Vue 在元素的特定时刻调用这些钩子。

下面的指令在元素插入页面后，让元素获得焦点：

```vue
<script setup>
// 在 <script setup> 中，以 v 开头的驼峰变量自动成为指令
const vFocus = {
  mounted(el) {          // el 是真实的 DOM 元素
    el.focus()
  }
}
</script>

<template>
  <input v-focus>        <!-- vFocus 在模板中写作 v-focus -->
</template>
```

很多指令只需要 mounted 和 updated 两个钩子，并且两个钩子做同样的事情。这时可以只写一个函数：

```js
// 函数简写：Vue 在 mounted 和 updated 时调用这个函数
const vColor = (el, binding) => {
  el.style.color = binding.value
}
// 模板：<p v-color="theme.primary">文字</p>
```

从其他文件导入的指令，也按 v 开头的驼峰名称自动注册。

```js
import { vTooltip } from '@/directives/tooltip'   // 模板中写 v-tooltip
```

**场景：项目中很多表单都要用 v-focus。**在创建应用时全局注册。所有组件的模板都能使用它。

```js
// main.js
const app = createApp(App)
app.directive('focus', { mounted: el => el.focus() })                       // 名称不写 v 前缀
app.directive('color', (el, binding) => { el.style.color = binding.value })   // 函数简写
```

注意：只在少数组件中使用的指令，局部注册。项目中到处使用的指令，全局注册，或者放在插件中注册（第 11 章）。不使用 `<script setup>` 时，用 `directives` 选项注册，键名不写 v 前缀，例如 `directives: { focus: vFocus }`。

### 10.3 读取 binding 的 value、arg 和 modifiers

钩子的第二个参数是 `binding`。下表列出它的属性。

```html
<!-- 指令名 pin，参数 top，修饰符 animate，值 200 -->
<div v-pin:top.animate="200">固定在顶部</div>

<!-- 动态参数：方括号中是一个表达式 -->
<div v-pin:[direction]="200">位置由 direction 决定</div>

<!-- 值可以是对象字面量 -->
<div v-tip="{ text: '保存', placement: 'top' }">…</div>
```

| 属性 | 内容 | 上例中的值 |
|---|---|---|
| `value` | 表达式的结果 | `200` |
| `oldValue` | 上一次的值。只在 beforeUpdate 和 updated 中有用。 | `undefined` |
| `arg` | 冒号后面的参数 | `'top'` |
| `modifiers` | 修饰符对象 | `{ animate: true }` |
| `instance` | 使用这个指令的组件实例 | 组件的公开实例 |
| `dir` | 指令对象本身 | `{ mounted, updated }` |

下面的 v-pin 读取这三个属性。冒号后的参数决定固定在顶部还是底部，修饰符决定是否有过渡。

```js
const vPin = {
  mounted: apply,
  updated: apply          // apply 的代价很小，每次更新都运行
}
function apply(el, { value, arg = 'top', modifiers }) {
  el.style.position = 'fixed'
  el.style.top = el.style.bottom = ''
  el.style[arg] = value + 'px'
  el.style.transition = modifiers.animate ? 'all .3s' : ''
}
```

在下面的实验台中修改参数、修饰符和值。观察 binding 和钩子日志。

<Lab id="demo-dir-play" title="实验台：binding 和钩子" note="运行真实的 Vue">
<template #predict>
<Sc predict :a="1">

先猜：指令 v-tag 已经挂载。勾选 .bold 修饰符。指令运行哪些钩子？

```html
<div v-tag:[align].bold="text">
```

<Opt>unmounted，然后 mounted</Opt>
<Opt>beforeUpdate 和 updated</Opt>
<Opt>不运行。修饰符只在挂载时读取</Opt>

<template #explain>

解析：修饰符改变时，元素仍是同一个元素，所以 Vue 运行更新钩子。新的 binding.modifiers 包含 bold: true。指令不会重新创建。修饰符也不是只读一次：每次更新，钩子都收到新的 binding。打开实验台，勾选 .bold，看日志和右边的 binding。

</template>
</Sc>
</template>

<DirPlay />
</Lab>

模板中的修饰符是固定的。实验台用渲染函数改变修饰符。

<Exercise id="dirBinding" />

### 10.4 选择钩子，用 oldValue 跳过无变化的更新

<Flow :steps='["created","beforeMount","mounted","beforeUpdate ⇄ updated","beforeUnmount","unmounted"]' />

| 钩子 | 运行时间 | 常见用途 |
|---|---|---|
| `created` | 元素的属性和事件监听应用之前 | 在 Vue 的监听之前添加自己的监听 |
| `beforeMount` | 元素插入页面之前 | 很少使用 |
| `mounted` | 元素和子元素插入页面之后 | 聚焦、测量尺寸、添加监听、创建第三方实例 |
| `beforeUpdate` | 所在组件更新之前 | 读取更新前的 DOM 状态 |
| `updated` | 所在组件和它的子组件更新之后 | 值改变时更新 DOM |
| `beforeUnmount` | 元素移除之前 | 很少使用 |
| `unmounted` | 元素移除之后 | 删除监听、销毁第三方实例 |

下图把这些钩子放在元素的生命周期上。

<Figure caption="指令钩子跟随元素的生命周期。在 mounted 中添加监听，在 unmounted 中删除监听。组件每次更新都调用 beforeUpdate 和 updated。">
<DirectiveHooks />
</Figure>

每个钩子接收 4 个参数：`el`、`binding`、`vnode` 和 `prevVnode`。prevVnode 只在 beforeUpdate 和 updated 中有值。

组件每次重新渲染，Vue 都调用指令的 `updated` 钩子。指令的值没有改变时也调用。操作的代价很小时（例如 10.3 节的 apply），每次都运行没有问题。操作的代价很大时，先比较 `binding.value` 和 `binding.oldValue`。

**场景：截止时间倒计时只在截止时间改变时重启。**v-countdown 在 mounted 中启动定时器。在 updated 中比较 value 和 oldValue。值相同时，保留原来的定时器。模板中写 `<span v-countdown="task.dueAt"></span>`。

```js
const vCountdown = {
  mounted: (el, { value }) => start(el, value),
  updated(el, { value, oldValue }) {
    if (value !== oldValue) start(el, value)   // 截止时间没变：不重启
  },
  unmounted: el => clearInterval(el._timer)
}
function start(el, due) {
  clearInterval(el._timer)
  const tick = () => { el.textContent = Math.ceil((due - Date.now()) / 60000) + ' 分钟' }
  tick(); el._timer = setInterval(tick, 60000)
}
```

**场景：值是对象字面量时，比较对象中的字段。**模板中的对象字面量在每次渲染时都是新对象。所以 `value !== oldValue` 总是成立。逐个比较需要的字段。字段相同时，不重建提示框实例。

```js
// 模板：<span v-tip="{ text: task.owner, placement: 'top' }">负责人</span>
const vTip = {
  mounted(el, { value }) { el._tip = createTip(el, value) },  // createTip 来自你的提示框库
  updated(el, { value, oldValue }) {
    if (value.text === oldValue.text && value.placement === oldValue.placement) return
    el._tip.destroy()
    el._tip = createTip(el, value)
  },
  unmounted(el) { el._tip.destroy() }
}
```

注意：不要在 updated 中无条件重建定时器或第三方实例。也不要用 JSON.stringify 比较大对象。只比较你需要的字段。

::: deep binding 每次更新都是新对象
模板中的指令编译为 `withDirectives(vnode, [[dir, value, arg, modifiers]])`。

每次渲染都调用 withDirectives。所以每次更新时，binding 都是一个新对象。下面的写法有错误：

```js
mounted(el, binding) {
  document.addEventListener('click', () => binding.value())   // 错误：binding 一直是挂载时的对象
}
```

组件更新后，闭包中的 binding.value 仍是旧的回调。如果旧回调引用了旧数据，结果就不正确。所以，v-click-outside 在 updated 中保存新回调。

Vue 用 `vnode.dirs` 保存这些 binding。更新时，新 binding 的 oldValue 是旧 binding 的 value。

除了 el 以外，把钩子的参数作为只读数据。要在钩子之间共享数据，把数据保存在 el 上，或者用 WeakMap 保存。
:::

### 10.5 实用指令：v-click-outside

下拉菜单和弹出层通常要在用户点击外部时关闭。这个逻辑要访问 document，适合写成指令。

```js
// directives/clickOutside.js
export const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = {
      fn: binding.value,                       // 用户传入的回调
      handler(e) {
        // composedPath() 是事件经过的元素列表。事件开始时就确定
        if (!e.composedPath().includes(el)) el._clickOutside.fn(e)
      }
    }
    document.addEventListener('click', el._clickOutside.handler)
  },
  updated(el, binding) {
    el._clickOutside.fn = binding.value        // 回调可能改变，保存最新的回调
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside.handler)   // 必须删除
    delete el._clickOutside
  }
}
```

```vue
<!-- 把指令放在包含按钮和菜单的外层元素上 -->
<div class="dropdown" v-click-outside="() => (open = false)">
  <button @click="open = !open">菜单</button>
  <ul v-if="open">…</ul>
</div>
```

这段代码有三个要点：

1. 把监听函数保存在 el 上。unmounted 用它删除监听。
2. 在 updated 中保存新的回调。
3. 把指令放在外层元素上，不放在 v-if 的菜单上。

第 3 点的原因见下图。用户点击按钮后，Vue 在微任务中挂载菜单。菜单的指令马上在 document 上添加监听。这时同一个点击事件还没有冒泡到 document。新的监听收到这个事件，菜单立即关闭。

<Figure caption="指令放在 v-if 的菜单上时，菜单先挂载。同一个点击事件随后到达 document，所以菜单立即关闭。">
<ClickOutsideVIfRace />
</Figure>

<Lab id="demo-dir-outside" title="实验台：v-click-outside 和监听泄漏" note="运行真实的 Vue">
<template #predict>
<Sc predict :a="2">

先猜：取消选择“卸载时删除监听”。点击“卸载组件”，然后点击页面空白处。会发生什么？

```js
mounted(el, b) {
  document.addEventListener('click', handler)
}
```

<Opt>什么都不发生。Vue 卸载时删除 document 上的监听</Opt>
<Opt>页面报错，因为回调中的元素已不存在</Opt>
<Opt>监听仍然运行。日志显示元素已经卸载</Opt>

<template #explain>

解析：指令在 mounted 中把监听加到 document 上。document 不属于组件，所以 Vue 不删除这个监听。必须在 unmounted 中调用 removeEventListener，否则监听一直存在（泄漏）。本实验台的监听检查了 el.isConnected，所以没有报错。打开实验台，按同样的步骤操作，看“泄漏”数字和日志。

</template>
</Sc>
</template>

<DirOutside />
</Lab>

按下面的步骤操作：

1. 打开菜单，然后点击实验台的空白处。
2. 取消“卸载时删除监听”。
3. 卸载并挂载组件 3 次。
4. 点击页面的任何位置，观察日志。
5. 选中“指令放在菜单上”，然后点击“菜单”。

泄漏的监听函数引用了已卸载的元素。所以这些元素不能被垃圾回收。

下面两道练习都写 v-click-outside。第一道只补全两行。第二道从空的钩子开始写。

<Exercise id="outsideFill" />

<Exercise id="clickOutside" />

### 10.6 实用指令：v-lazy 和 v-permission

**场景：任务附件列表中有很多封面图。**`v-lazy` 在图片进入可视区域时才加载图片。它使用 `IntersectionObserver`：

```js
const observers = new WeakMap()

export const vLazy = {
  mounted(el, binding) {
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      el.src = binding.value                   // 进入可视区域：设置真实地址
      io.disconnect()                          // 只加载一次
    }, { rootMargin: '200px' })                // 提前 200px 开始加载
    io.observe(el)
    observers.set(el, io)
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue && el.src) el.src = binding.value
  },
  unmounted(el) {
    observers.get(el)?.disconnect()            // 元素被删除时，停止观察
    observers.delete(el)
  }
}
// 模板：<img v-lazy="item.cover" width="320" height="180" alt="">
```

简单的场景使用浏览器原生的 `<img loading="lazy">`。要控制加载时机或处理背景图时，才用 v-lazy。

**场景：没有删除权限的用户看不到“删除订单”按钮。**`v-permission` 根据权限删除元素：

```js
import { useAuth } from '@/stores/auth'

export const vPermission = {
  mounted(el, binding) {
    const auth = useAuth()
    if (!auth.can(binding.value)) el.remove()   // 没有权限：从 DOM 中删除
  }
}
// 模板：<button v-permission="'order:delete'">删除订单</button>
```

这个指令只在挂载时检查一次。用户的权限改变后，元素不会回来。权限会在运行时改变时，使用 `v-if="auth.can('order:delete')"`。

前端的权限检查只改善界面。服务器必须再次检查每个请求。

::: deep 在组件上使用指令
指令也可以写在组件上。Vue 把指令应用到组件的根元素上。这和透传属性（第 6 章）的规则相同。

```html
<MyInput v-focus />   <!-- v-focus 作用于 MyInput 的根元素 -->
```

组件有多个根节点时，Vue 忽略这个指令，并在开发模式中显示警告。指令不能通过 `v-bind="$attrs"` 传给其他元素。

所以，不要在组件上使用指令。组件的根元素可能不是你需要的元素，例如 MyInput 的根元素可能是一个 div。让组件自己提供这个功能，例如提供一个 `autofocus` prop。
:::

::: deep 指令的 TypeScript 类型
用 `Directive` 类型标注指令。第一个类型参数是元素类型，第二个是值的类型：

```ts
import type { Directive } from 'vue'

export const vClickOutside: Directive<HTMLElement, (e: MouseEvent) => void> = {
  mounted(el, binding) {
    binding.value          // 类型是 (e: MouseEvent) => void
  }
}

// 3.5+：第三和第四个类型参数是修饰符和参数的类型
export const vPin: Directive<HTMLElement, number, 'animate', 'top' | 'bottom'> = {
  mounted(el, { value, arg, modifiers }) {
    modifiers.animate      // boolean
    arg                    // 'top' | 'bottom' | undefined
  }
}

// 全局注册的指令：声明类型后，模板中有类型检查和自动补全
declare module 'vue' {
  interface GlobalDirectives {
    vClickOutside: typeof vClickOutside
  }
}
```
:::

::: deep 服务端渲染中的指令
服务端渲染时没有 DOM。Vue 不调用 mounted 等钩子。如果指令要在 HTML 中输出属性，定义 `getSSRProps`：

```js
const vTip = {
  mounted(el, binding) { el.setAttribute('title', binding.value) },
  updated(el, binding) { el.setAttribute('title', binding.value) },
  getSSRProps(binding) {
    return { title: binding.value }    // 服务端渲染时，这些属性加到元素上
  }
}
```

没有 getSSRProps 时，服务端的 HTML 中没有这个属性。客户端水合后，mounted 运行，属性才出现。
:::

::: pitfalls
1. 卸载时删除 mounted 中添加的监听和定时器。否则会发生内存泄漏。
2. 不要在闭包中保存 binding 对象。在 updated 中读取新的 binding。原因：每次更新，Vue 都创建新的 binding。闭包中的 binding 一直是挂载时的旧对象。
3. 不要把 v-click-outside 放在 v-if 控制的元素上。把它放在包含触发按钮的外层元素上。原因：菜单挂载时添加的监听会收到同一个点击，菜单立即关闭。
4. 不要在组件上使用指令。原因：指令只作用于组件的根元素。多根组件会忽略指令。
5. 不要用指令代替 v-if 做权限控制。原因：指令只在挂载时检查一次。权限改变后，删除的元素不会回来。
:::

::: selfcheck
<Sc :a="1">

下面的代码先运行 `n.value = 1` 并等待更新，再运行 `other.value = 1` 并等待更新。控制台依次输出什么？

```js
const vLog = (el, binding) => console.log(binding.value)
// 模板：<p v-log="n">{{ other }}</p>
// n 和 other 的初始值都是 0
```

<Opt>0、1</Opt>
<Opt>0、1、1</Opt>
<Opt>1、1</Opt>
<Opt>0</Opt>

<template #explain>

解析：函数简写在 mounted 和 updated 时运行。组件每次更新都调用 updated，指令的值没有改变时也调用。所以 other 改变时，又输出一次 1。代价大的操作要先比较 value 和 oldValue。

</template>
</Sc>

<Sc :a="0">

组件更新后，传给指令的回调换成了新函数。点击页面时，下面的指令运行哪个回调？

```js
const vX = {
  mounted(el, binding) {
    document.addEventListener('click', () => binding.value())
  }
}
```

<Opt>挂载时的旧回调</Opt>
<Opt>新的回调</Opt>
<Opt>两个回调都运行</Opt>

<template #explain>

解析：每次更新，Vue 都创建新的 binding 对象。闭包中保存的是挂载时的 binding，所以运行旧回调。在 updated 中保存新回调。这段代码还缺少 unmounted，监听会泄漏。

</template>
</Sc>

<Sc :a="2">

按钮使用 `v-permission`。挂载时用户没有权限，指令删除了按钮。之后用户获得了权限。按钮会怎样？

<Opt>立即出现</Opt>
<Opt>组件下次更新时出现</Opt>
<Opt>不出现。指令只在挂载时检查一次</Opt>

<template #explain>

解析：指令用 el.remove() 删除元素。Vue 不会把元素放回页面。权限会在运行时改变时，使用 v-if。

</template>
</Sc>

<Sc :a="0">

下面哪个功能最适合写成自定义指令？

<Opt>元素挂载后自动获得焦点</Opt>
<Opt>多个组件都要跟踪鼠标位置</Opt>
<Opt>一个带标题和按钮的对话框</Opt>

<template #explain>

解析：指令用于对一个元素的底层 DOM 操作，例如 `el.focus()`。鼠标位置是没有模板的有状态逻辑，写成组合式函数 useMouse。原因：它返回数据，由组件决定怎样显示。对话框有模板、样式和逻辑，写成组件。先考虑组件和组合式函数，必须接触 DOM 元素时才写指令。

</template>
</Sc>

<Sc :a="2">

使用 10.3 节的 apply 函数作为 v-pin 的 mounted 钩子。挂载 `<div v-pin:bottom.animate="40">` 后，元素的样式是什么？

```js
function apply(el, { value, arg = 'top', modifiers }) {
  el.style.position = 'fixed'
  el.style.top = el.style.bottom = ''
  el.style[arg] = value + 'px'
  el.style.transition = modifiers.animate ? 'all .3s' : ''
}
```

<Opt>top 为 40px，有 transition</Opt>
<Opt>bottom 为 40px，没有 transition</Opt>
<Opt>bottom 为 40px，有 transition</Opt>

<template #explain>

解析：冒号后面的 bottom 是 arg。它覆盖了默认值 'top'，所以设置的是 bottom。等号后面的 40 是 value。点后面的 animate 是修饰符。`modifiers.animate` 为 true，所以有 transition。只有不写参数时，arg 才是默认的 'top'。

</template>
</Sc>

<Sc :a="0">

回顾（第 6 章）：BaseInput 的模板只有一个根元素。父组件把指令写在组件上。指令的 mounted 收到的 el 是什么？

```html
<!-- BaseInput 的模板 -->
<label>名字 <input></label>

<!-- 父组件 -->
<BaseInput v-focus />
```

<Opt>\<label>，组件的根元素</Opt>
<Opt>\<input>，可以聚焦的元素</Opt>
<Opt>BaseInput 的组件实例</Opt>

<template #explain>

解析：第 6 章：写在组件上的 class 等属性，落到组件的根元素上。指令也一样，所以 el 是根元素 label。`el.focus()` 不会让输入框获得焦点。指令不会自己寻找 input，也收不到组件实例。修复：在指令中写 `el.querySelector('input').focus()`，或把 v-focus 写在 BaseInput 内部的 input 上。组件有多个根元素时，指令不生效，开发环境显示警告。

</template>
</Sc>

:::

::: summary
- 指令复用对单个元素的 DOM 操作。其他复用使用组件或组合式函数。
- 在 `<script setup>` 中，vFocus 自动注册为 v-focus。到处使用的指令用 app.directive 全局注册。
- binding 的主要属性是 value、arg 和 modifiers。
- mounted 初始化。updated 同步新的值，代价大时先比较 oldValue。unmounted 清理。
- v-click-outside 放在外层元素上，并在 unmounted 中删除监听。
:::
