---
title: 模板语法与指令
id: template
stage: 1
chapter: 2
desc: 插值、v-bind、v-on、v-if、v-for、v-model
---

<script setup>
import DirectiveFlow from '../figures/02-template/DirectiveFlow.vue'
import IfVsShow from '../figures/02-template/IfVsShow.vue'
import ClassStyleDemo from '../labs/02-template/ClassStyleDemo.vue'
import DirectivePlayground from '../labs/02-template/DirectivePlayground.vue'
import DirectiveHooks from '../labs/02-template/DirectiveHooks.vue'
</script>

# 模板语法与指令

::: goals
<Goal checks="sc:2,ex:list,ex:classBind">用插值、v-bind 和 v-on 连接数据和页面。</Goal>
<Goal checks="sc:0">说明 v-if 和 v-show 的区别。</Goal>
<Goal checks="ex:list">用 v-for 显示列表。</Goal>
<Goal checks="sc:1,ex:modelFill">用 v-model 连接表单和数据。</Goal>

:::

::: rt
阅读主线约 14 分钟，深入内容约 4 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
指令是写在 HTML 标签上的<b>“小纸条”</b>，告诉 Vue 这个元素该怎么跟数据联动：“这段文字显示 name”“这个按钮点了调用 add”“这块只在登录后出现”。
:::

::: terms
指令
: 以 v- 开头的特殊属性。它把数据连接到 DOM 元素。

插值
: 用 {{ }} 把数据显示为文字。

修饰符
: 写在指令后、以点开头的部分。它改变指令的行为。

key
: v-for 中标识每一项的唯一值。
:::

::: why
用原生 JS 显示一个列表时，你要手动创建每个 li。数据改变后，你还要找到对应的 li 并修改它。漏改一个，页面就和数据不一致。

原因：数据和 DOM 之间的同步代码由你手写。

本章的指令把这些规则写在 HTML 标签上。你写规则，Vue 执行操作。
:::

### 2.1 插值和 v-bind：显示数据

指令是以 `v-` 开头的特殊属性。指令把数据连接到 DOM 元素。下图说明各种指令传递数据的方向。

<Figure>
<DirectiveFlow />
<template #caption>

大部分指令把数据送到 DOM。`@` 把 DOM 事件送回代码。`v-model` 两个方向都做。

</template>
</Figure>

下表列出最常用的指令。后面每一节讲一组。

| 写法 | 全称 | 作用 | 示例 |
|---|---|---|---|
| `{{ }}` | 文本插值 | 把数据显示为文字 | `{{ user.name }}` |
| `:` | `v-bind` | 把数据连接到 HTML 属性 | `:src="avatar"` |
| `@` | `v-on` | 监听事件 | `@click="add"` |
| `v-if` | 条件渲染 | 条件为假时，删除元素 | `v-if="loggedIn"` |
| `v-show` | 条件显示 | 条件为假时，隐藏元素 | `v-show="open"` |
| `v-for` | 列表渲染 | 为数组的每一项显示一个元素 | `v-for="t in todos" :key="t.id"` |
| `v-model` | 双向绑定 | 同步表单的值和数据 | `v-model="keyword"` |

`{{ }}` 把数据显示为文字。`:属性` 把数据写入 HTML 属性。两者都只接受一个表达式。

属性名和变量名相同时，可以省略值（Vue 3.4 及以上）。`:id` 等于 `:id="id"`。

```html
<img :src="avatar" :alt="user.name">
<label :for="id">邮箱</label>
<input :id="id">          <!-- 同名简写：等于 :id="id" -->
```

::: think 可以在 {{ }} 中写 if 语句吗？
不可以。插值只接受一个表达式。`{{ ok ? '是' : '否' }}` 和 `{{ list.length }}` 是正确的。`{{ if (ok) {} }}` 是错误的。把复杂逻辑写在计算属性或方法中。
:::

`class` 和 `style` 是最常绑定的属性。`:class` 和 `:style` 接受字符串、对象和数组。

```html
<!-- 对象语法：值为真时，添加这个类名 -->
<li class="item" :class="{ active: isActive, 'text-danger': hasError }">…</li>
<!-- isActive 为 true 时，结果是 class="item active" -->

<!-- 数组语法：数组的每一项是一个类名 -->
<div :class="[activeClass, errorClass]"></div>
<div :class="[{ active: isActive }, errorClass]"></div>   <!-- 数组中可以写对象 -->

<!-- style 对象：属性名用 camelCase，或用带引号的 kebab-case -->
<div :style="{ color: textColor, fontSize: size + 'px', 'line-height': 1.5 }"></div>
<div :style="[baseStyles, overrideStyles]"></div>        <!-- 后面的对象覆盖前面的 -->
```

静态的 `class` 和绑定的 `:class` 合并为一个属性。`style` 也一样。

<b>场景：按钮有两种尺寸，还可以禁用。</b>用数组语法组合三种类名：固定的类名、按尺寸拼出的类名、按条件添加的类名。

```js
const size = ref('small')      // 'small' 或 'large'
const disabled = ref(true)

// 模板：<button :class="['btn', 'btn-' + size, { 'btn-disabled': disabled }]">保存</button>
// 结果：class="btn btn-small btn-disabled"
```

类名的规则更复杂时，第 4 章用 computed 返回对象。这样模板保持简单。

<Lab id="demo-classes" title="实验台：class 和 style 的结果" note="运行真实的 Vue">
<template #predict>
<Sc predict :a="2">

先猜：isActive 为 true。勾选 hasError。段落渲染出的 class 属性是什么？

```html
<p class="item"
   :class="{ active: isActive, error: hasError }">
```

<Opt>class="active error"</Opt>
<Opt>class="item error"</Opt>
<Opt>class="item active error"</Opt>

<template #explain>

解析：静态 class 和绑定的 class 合并，所以保留 item。对象中值为真的键都成为类名，所以 active 和 error 都在。第一项以为绑定的 class 覆盖静态 class。第二项以为只保留最后改变的键。打开实验台，勾选 hasError，看“渲染出的属性”。

</template>
</Sc>
</template>

<ClassStyleDemo />
</Lab>

<Exercise id="classBind" />

### 2.2 v-if 和 v-show：按条件显示

两者都按条件显示元素。条件为假时，它们隐藏元素的方式不同，见下图。

<Figure>
<IfVsShow />
<template #caption>

条件变为假时，v-if 删除元素，只留一个注释占位。v-show 保留元素，只设置 `display: none`。

</template>
</Figure>

多个分支用 `v-else-if` 和 `v-else`。它们必须紧跟在 v-if 元素后面。中间有其他元素时，编译器报错。

```html
<p v-if="score >= 90">优秀</p>
<p v-else-if="score >= 60">及格</p>
<p v-else>不及格</p>
```

<b>场景：列表页有加载中、出错和有数据三种状态。</b>三种状态只显示一种，用 v-if 链。

```html
<p v-if="loading">加载中…</p>
<p v-else-if="error">加载失败：{{ error.message }}</p>
<ul v-else>…</ul>
```

<b>场景：频繁展开和收起的筛选面板。</b>用 v-show。元素只创建一次，之后只改 display，代价更小。

```html
<button @click="open = !open">筛选</button>
<div v-show="open" class="filter-panel">…</div>
```

### 2.3 v-for：显示列表

v-for 为数组的每一项渲染一个元素。每个 v-for 都要写 `:key`，值用数据的 id。Vue 用 key 判断哪个节点可以复用。

```html
<li v-for="t in todos" :key="t.id">{{ t.text }}</li>

<!-- 第二个参数是索引 -->
<li v-for="(t, index) in todos" :key="t.id">{{ index + 1 }}. {{ t.text }}</li>

<!-- 遍历对象：参数依次是值、键、索引 -->
<li v-for="(value, key, index) in user" :key="key">{{ index }}. {{ key }}: {{ value }}</li>

<!-- 遍历范围：n 从 1 开始，不从 0 开始 -->
<span v-for="n in 5" :key="n">{{ n }}</span>        <!-- 1 2 3 4 5 -->

<!-- 用 template 包住多个元素。template 本身不渲染 -->
<template v-for="item in list" :key="item.id">
  <dt>{{ item.term }}</dt>
  <dd>{{ item.desc }}</dd>
</template>
```

- 遍历对象的顺序和 `Object.keys()` 的顺序相同。
- 在 Vue3 中，`<template v-for>` 的 key 写在 template 标签上。

::: think 可以在同一个元素上同时使用 v-if 和 v-for 吗？
不要这样做。在 Vue3 中，v-if 先运行。v-if 不能读取 v-for 的循环变量。要过滤列表，使用计算属性（第 4 章）。也可以用 `<template v-for>` 包住元素，然后在元素上写 v-if。
:::

<Exercise id="list" />

### 2.4 v-on：处理事件

`@事件名` 监听事件。`@` 后面的值有两种写法。编译器根据写法决定怎样调用。

| 写法 | 示例 | 事件对象 |
|---|---|---|
| 方法处理函数 | `@click="save"` | Vue 把事件对象作为第一个参数传给 save。 |
| 内联处理函数 | `@click="add(1)"` | Vue 不传事件对象。用 `$event` 读取它。 |
| 箭头函数 | `@click="e => add(1, e)"` | e 就是事件对象。 |

```vue
<button @click="greet">方法处理函数</button>            <!-- 调用 greet(event) -->
<button @click="say('hi', $event)">内联处理函数</button>
<button @click="greet()">注意</button>                   <!-- 调用 greet()，没有事件对象 -->

function greet(event) { console.log(event.target.tagName) }  // BUTTON
function say(msg, event) { event.preventDefault() }
```

在组件上，`$event` 是子组件 emit（第 5 章）的第一个参数，不是 DOM 事件。原因：组件事件由 emit 发出，不由浏览器发出。

修饰符写在事件名后面，以点开头。它代替处理函数中的常用代码。

| 修饰符 | 作用 |
|---|---|
| `.prevent` | 调用 `event.preventDefault()`。表单提交时页面不刷新。 |
| `.stop` | 调用 `event.stopPropagation()`。事件不传给父元素。 |
| `.self` | 只在点击元素本身时运行，点击子元素时不运行。 |
| `.once` | 只运行一次。 |
| `.enter`、`.esc` | 只在按下这个键时运行。 |
| `.exact` | 只在没有按下其他系统键（Ctrl、Shift 等）时运行。 |

<b>场景：任务卡片上的删除按钮。</b>点击卡片打开任务详情。点击删除按钮只删除任务，不打开详情。在按钮上写 `.stop`，阻止事件传给卡片。

```html
<li class="card" @click="openDetail(task)">
  {{ task.title }}
  <button @click.stop="removeTask(task.id)">删除</button>
</li>
```

<b>场景：点击遮罩关闭弹窗。</b>点击弹窗内容时，事件也会冒泡到遮罩。在遮罩上写 `.self`。只有点击遮罩本身时才关闭。表单写 `.prevent`，提交时页面不刷新。

```html
<div class="mask" @click.self="closeDialog">
  <form class="dialog" @submit.prevent="saveTask">
    <input v-model="title">
    <button>保存</button>
  </form>
</div>
```

<b>场景：评论框按回车发送，按 Shift+回车换行。</b>`.exact` 要求只按下列出的键。所以 Shift+回车不触发发送，浏览器正常换行。按 Esc 清空草稿。

```html
<textarea v-model="draft"
  @keydown.enter.exact.prevent="sendComment"
  @keydown.esc="draft = ''"></textarea>
```

注意：不要在很多元素上加 `.stop`。外层的“点击外部关闭菜单”等逻辑会收不到事件。只想忽略子元素的点击时，用 `.self`。

2.5 节末尾的实验台有“v-on”标签页。在那里试验这些修饰符。

### 2.5 v-model：连接表单和数据

v-model 让输入框的值和数据同步。它根据元素类型选择属性和事件。本节末尾实验台的“v-model”标签页运行这些写法。

| 元素 | 使用的属性和事件 | 数据的值 |
|---|---|---|
| `input` 文本、`textarea` | `value` + `input` 事件 | 字符串 |
| 一个 `checkbox` | `checked` + `change` 事件 | true 或 false |
| 多个 `checkbox` 绑定同一个数组 | `checked` + `change` 事件 | 选中项的 value 组成的数组 |
| `radio` | `checked` + `change` 事件 | 选中项的 value |
| `select` | `value` + `change` 事件 | 选中的 option 的 value |
| `select multiple` | `change` 事件 | 数组 |

```html
<input type="checkbox" value="vue" v-model="skills">   <!-- skills 是数组：['vue', ...] -->
<input type="checkbox" v-model="agree" true-value="yes" false-value="no">
<input type="radio" :value="1" v-model="level">          <!-- :value 绑定数字，不是字符串 -->
<select v-model="city">
  <option disabled value="">请选择</option>
  <option v-for="c in cities" :key="c.id" :value="c.id">{{ c.name }}</option>
</select>
```

v-model 忽略元素上的 `value`、`checked` 和 `selected` 初始属性。初始值只来自响应式数据。所以在 ref 中设置初始值。

v-model 有三个修饰符：

| 修饰符 | 作用 |
|---|---|
| `v-model.trim` | 删除值前后的空格。 |
| `v-model.number` | 把值转换为数字。 |
| `v-model.lazy` | 在 change 事件时同步，不在每次输入时同步。 |

<b>场景：注册表单。</b>用户名去掉首尾空格。年龄要参与计算，所以转为数字。

```html
<input v-model.trim="form.name">
<input type="number" v-model.number="form.age">   <!-- form.age 是数字，不是 "18" -->
```

<Exercise id="modelFill" />

<Lab id="demo-directives" title="实验台：指令" note="每个标签页运行真实的 Vue">
<template #predict>
<Sc predict :a="1">

先猜：打开“v-on”标签页。点击“.once +10”三次，再点击“普通 +1”一次。count 是多少？

```html
<button @click="count++">普通 +1</button>
<button @click.once="count += 10">.once +10</button>
```

<Opt>31</Opt>
<Opt>11</Opt>
<Opt>10</Opt>

<template #explain>

解析：count 是 11。.once 让监听函数只运行一次。所以后两次点击“.once +10”不改变 count。31 把 .once 当成了普通监听。10 忽略了最后一次“普通 +1”。打开实验台，切换到“v-on”标签页，按同样的顺序点击，看 count。

</template>
</Sc>
</template>

<DirectivePlayground />
</Lab>

### 2.6 v-html 和用户内容的安全

`{{ }}` 和 `:属性` 转义 HTML。`v-html` 不转义。它把字符串作为 HTML 插入元素。

```html
<div v-html="articleHtml"></div>      <!-- 可信的 HTML，例如自己的 Markdown 编译结果 -->

<!-- ❌ 危险：评论内容可能是 <img src=x onerror="发送 cookie 的代码"> -->
<div v-html="comment.content"></div>

<!-- ❌ 危险：用户填写的主页地址可能是 javascript:alert(document.cookie) -->
<a :href="user.website">主页</a>
```

Vue 不检查 URL 的协议。用户点击 `javascript:` 链接时，浏览器运行其中的代码。所以绑定用户提供的 URL 也有风险。

按下面的步骤防止 XSS 攻击：

1. 只对可信的内容使用 v-html。
2. 显示用户的 HTML 前，用 DOMPurify 等库清理它。
3. 绑定用户的 URL 前，检查协议。

<b>场景：显示用户填写的主页链接。</b>写一个方法检查协议，只允许 http 和 https。模板调用这个方法。

```js
function safeHref(url) {
  try {
    const u = new URL(url, location.href)
    return ['http:', 'https:'].includes(u.protocol) ? u.href : '#'   // 只允许 http 和 https
  } catch {
    return '#'   // 不是合法的 URL
  }
}

// 模板：<a :href="safeHref(user.website)">主页</a>
```

注意：v-html 中的内容不经过模板编译。所以其中的指令和组件不生效。单文件组件的 scoped 样式也不作用于它。

::: deep 指令的编译结果
指令不在运行时解析。编译器把每个指令转换为普通的 JavaScript 代码。

| 模板 | 编译结果（简化） |
|---|---|
| `v-if="ok"` / `v-else` | `ok ? (openBlock(), createElementBlock('p', …)) : (openBlock(), createElementBlock('p', …))`。没有 v-else 时，第二个分支是 `createCommentVNode('v-if', true)`。 |
| `v-show="ok"` | `withDirectives(createElementVNode('p'), [[vShow, ok]])` |
| `v-for="i in list"` | `(openBlock(true), createElementBlock(Fragment, null, renderList(list, i => …), 128))` |
| `v-model="text"`（input） | `withDirectives(createElementVNode('input', { 'onUpdate:modelValue': $event => (text = $event) }), [[vModelText, text]])` |
| `@click.stop` | `onClick: withModifiers(handler, ['stop'])` |
| `@keyup.enter` | `onKeyup: withKeys(handler, ['enter'])` |

在第 25 章的在线编译实验台中，选择“v-model 与修饰符”示例，可以查看真实的编译结果。
:::

::: deep 自定义指令
需要直接操作 DOM 时，使用自定义指令。[第 9 章](/chapters/09-directives)讲完整用法。指令对象有和组件相似的钩子：

| 钩子 | 运行时间 |
|---|---|
| `created` | 元素的属性和事件监听应用之前 |
| `beforeMount / mounted` | 元素插入页面之前 / 之后 |
| `beforeUpdate / updated` | 所在组件更新之前 / 之后 |
| `beforeUnmount / unmounted` | 元素移除之前 / 之后 |

每个钩子接收 4 个参数：`el`、`binding`、`vnode`、`prevVnode`。`binding` 包含 value、oldValue、arg 和 modifiers。

```js
// v-highlight:color.bold="条件"
const vHighlight = {
  mounted(el, binding) { apply(el, binding) },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) apply(el, binding)  // 值改变时才更新
  }
}
function apply(el, { value, arg = 'yellow', modifiers }) {
  el.style.background = value ? arg : ''
  el.style.fontWeight = value && modifiers.bold ? '700' : ''
}
// 在 <script setup> 中，以 v 开头并且第二个字母大写的驼峰变量（如 vFocus）自动注册为 v-focus 指令
```

<Lab id="demo-directive" title="实验台：自定义指令的钩子" note="运行真实的 Vue">
<template #predict>
<Sc predict :a="0">

先猜：两个 `<p>` 使用指令 v-highlight。点击“无关数据 n++”一次。指令日志新增什么？

```html
<p v-if="show" v-highlight:yellow="on">…</p>
<p v-if="show" v-highlight:blue.bold="on">…</p>
```

<Opt>每个 `<p>` 运行 beforeUpdate 和 updated</Opt>
<Opt>没有新日志，因为 value 没有改变</Opt>
<Opt>每个 `<p>` 运行 unmounted 和 mounted</Opt>

<template #explain>

解析：组件重新渲染时，组件中所有指令的更新钩子都运行。原因：Vue 不先比较 value。所以钩子中要自己比较 value 和 oldValue。元素没有被删除，所以不运行 unmounted 和 mounted。打开实验台，点击“无关数据 n++”，看日志最上面的 4 行。

</template>
</Sc>
</template>

<DirectiveHooks />
</Lab>

:::

::: pitfalls
1. 每个 `v-for` 都要写 `:key`，值用数据的 id。原因：Vue 用 key 判断哪个节点可以复用。用 index 时，插入一项后输入框的值会留在错误的行（第 26 章）。
2. 要传数据，写 `:value="x"`。原因：没有冒号时，`value="x"` 传的是字符串 "x"。
3. 元素需要频繁显示和隐藏时，使用 `v-show`。原因：`v-if` 每次都删除并重新创建元素，代价更大。
:::

::: selfcheck
<Sc :a="1">

`ok` 为 false。渲染后 DOM 中有什么？

```html
<p v-if="ok">A</p>
<p v-show="ok">B</p>
```

<Opt>两个 p 都在 DOM 中，都被隐藏</Opt>
<Opt>只有 B 的 p，它有 display: none</Opt>
<Opt>两个 p 都不在 DOM 中</Opt>

<template #explain>

解析：v-if 为假时，Vue 不创建元素，只留一个注释节点。v-show 总是创建元素，只修改 display。

</template>
</Sc>

<Sc :a="2">

选中这个单选框后，`level` 的值是什么？

```html
<input type="radio" value="1" v-model="level">
```

<Opt>数字 1</Opt>
<Opt>true</Opt>
<Opt>字符串 "1"</Opt>

<template #explain>

解析：`value="1"` 是普通属性，值总是字符串。要得到数字，写 `:value="1"`。

</template>
</Sc>

<Sc :a="0">

点击按钮后，控制台打印什么？

```vue
<button @click="greet()">hi</button>

function greet(event) { console.log(typeof event) }
```

<Opt>undefined</Opt>
<Opt>object</Opt>
<Opt>function</Opt>

<template #explain>

解析：`greet()` 是内联处理函数。Vue 不传事件对象。写 `@click="greet"` 或 `greet($event)` 才能得到事件对象。

</template>
</Sc>

<Sc :a="1">

回顾（第 1 章）：第 1 章的计数器中，`count` 是 ref。点击下面的按钮后，会发生什么？

```html
<button @click="count++">{{ count }}</button>
```

<Opt>报错，模板中必须写 count.value++</Opt>
<Opt>按钮显示 1，模板自动读写 .value</Opt>
<Opt>按钮仍显示 0，count 只是数字副本</Opt>

<template #explain>

解析：模板自动解包顶层 ref。所以 `count++` 修改的是 `count.value`，页面显示 1。“必须写 .value”是 JavaScript 中的规则，模板中不需要。“数字副本”的说法也错。模板拿到的是 ref 本身。读写时，Vue 自动加上 `.value`。模板从 setup 返回的对象上读 `count` 时，Vue 用一层代理（`proxyRefs`）替你读 `count.value`，所以只有顶层的 ref 可以省略 `.value`。

</template>
</Sc>

:::

::: summary
- `{{ }}` 显示文字。`:` 连接属性，`:class` 和 `:style` 接受对象和数组。
- v-if 删除和创建元素。v-show 只改变 display。
- v-for 需要唯一的 key。
- `@` 监听事件。`.stop`、`.self`、`.prevent` 等修饰符代替常用的事件代码。
- v-model 同步表单和数据。`.trim`、`.number`、`.lazy` 处理输入值。
- 只对可信内容使用 v-html。绑定用户的 URL 前检查协议。
:::
