---
title: 计算属性与侦听器
id: computed
stage: 1
chapter: 4
desc: computed 缓存、watch 竞态
---

<script setup>
import ComputedCache from '../figures/04-computed/ComputedCache.vue'
import OnCleanupDiscardsStaleRequest from '../figures/04-computed/OnCleanupDiscardsStaleRequest.vue'
import ComputedVsMethod from '../labs/04-computed/ComputedVsMethod.vue'
import FlushTiming from '../labs/04-computed/FlushTiming.vue'
import WatchRace from '../labs/04-computed/WatchRace.vue'
</script>

# 计算属性与侦听器

::: goals
<Goal checks="sc:3,ex:phenoFilter">选择 computed 或 watch。</Goal>
<Goal checks="sc:1,sc:2,sc:6,sc:7">写可写的 computed，并正确设置 watch 的数据源和选项。</Goal>
<Goal checks="sc:0,ex:cart,ex:fullNameFill">说明 computed 比方法调用快的原因。</Goal>
<Goal checks="sc:4,ex:phenoRace">用 onCleanup 防止异步请求的竞态问题。</Goal>

:::

::: rt
阅读主线约 14 分钟，深入内容约 3 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
**computed 是带记忆的公式**：只要原料没变，问它多少次都直接报上次的答案，不重新算。

**watch 是门铃**：某个数据一变就响，你在铃声里去做事（发请求、存本地、写日志）。
:::

::: terms
计算属性（computed）
: 从其他数据计算得到、带缓存的值。

派生数据
: 可以从其他数据算出来的数据。

侦听器
: 数据改变后运行回调的函数，例如 watch。

竞态问题
: 先发的请求后返回，旧结果覆盖新结果。
:::

::: why
购物车要显示总价。把计算写在方法中时，每次渲染都重新计算。你在页面上的搜索框中输入一个字，一千件商品的总价也要再算一遍。

另一个问题：关键词改变后，要发送搜索请求。模板只能显示数据，不能执行这种操作。

原因：方法没有缓存。模板中也不能写执行操作的代码。

本章的 computed 缓存计算结果。watch 在数据改变后执行操作。
:::

### 4.1 computed：从数据算出值

按下面的规则选择：

- 需要从其他数据得到一个值时，使用 computed。
- 数据改变后需要执行操作时，使用 watch（4.3 节）。例如发送请求或保存数据。

computed 接收一个 getter 函数，返回一个只读的 ref。在 JavaScript 中用 `.value` 读取它。

```js
const items = ref([{ price: 10, qty: 2 }, { price: 20, qty: 1 }])
const total = computed(() =>
  items.value.reduce((sum, it) => sum + it.price * it.qty, 0)
)
console.log(total.value)   // 40
// 模板：<p>总价：{{ total }}</p>
```

computed 有两个特点：

1. 惰性：依赖改变时，computed 不立即计算。computed 只做一个标记。下次读取时，computed 才计算。所以没有人读取时，computed 不做计算。
2. 缓存：依赖不变时，computed 返回上次的结果。所以模板多次读取它，也只计算一次。

下图比较方法和 computed 的运行次数。

<Figure caption="方法在每次渲染时都运行。computed 只在依赖改变后重新运行，其他时候返回缓存。">
<ComputedCache />
</Figure>

**场景：任务列表只显示未完成的任务。**v-for 不能和 v-if 写在同一个元素上（第 2 章）。用 computed 过滤，再用 v-for 显示结果。

```js
const visible = computed(() => tasks.value.filter(t => !t.done))
const left = computed(() => visible.value.length)   // computed 可以读取 computed
// 模板：<li v-for="t in visible" :key="t.id">{{ t.title }}</li>
```

注意：getter 只计算并返回值。不要在 getter 中发送请求或修改其他数据。

<Lab id="demo-computed" title="实验台：computed 和方法调用" note="运行真实的 Vue">
<template #predict>
<Sc predict :a="2">

先猜：页面加载后，getter 执行 1 次，方法执行 3 次。点击“无关状态 tick++”一次。两个数字变成多少？

```html
<div>{{ full }} · {{ full }} · {{ full }}</div>
<div>{{ fullFn() }} · {{ fullFn() }} · {{ fullFn() }}</div>
```

<Opt>getter 2 次，方法 6 次</Opt>
<Opt>getter 1 次，方法 3 次</Opt>
<Opt>getter 1 次，方法 6 次</Opt>

<template #explain>

解析：组件重新渲染时，模板中的方法调用都重新运行，所以方法再运行 3 次。computed 的依赖 first 和 last 没有改变，所以返回缓存的值，getter 不运行。第一项以为 computed 随组件更新重新计算。第二项以为方法也有缓存。打开实验台，点击 tick++，看两个执行次数。

</template>
</Sc>
</template>

<ComputedVsMethod />
</Lab>

<Exercise id="fullNameFill" />

<Exercise id="cart" />

::: deep computed 的实现：标记和版本号
下面是简化的 computed。依赖改变时，scheduler 只设置 dirty。读取 value 时，dirty 为真才重新计算。

```js
function computed(getter) {
  let value, dirty = true
  const runner = effect(getter, {
    lazy: true,
    scheduler() {               // 依赖改变：只做标记，不计算
      if (!dirty) { dirty = true; trigger(obj, 'value') }
    }
  })
  const obj = {
    get value() {
      if (dirty) { value = runner(); dirty = false }
      track(obj, 'value')
      return value
    }
  }
  return obj
}
```

Vue 3.5 重写了 computed。有订阅者的 computed 在依赖改变时仍然被标记为脏，并通知订阅者。读取时，Vue 用版本号确认是否真的需要重新计算。没有订阅者的 computed 不接收通知，只靠版本号判断：

1. 每个依赖（Dep）有一个 `version`。数据改变时，version 加 1。
2. 全局有一个 `globalVersion`。任何响应式数据改变时，globalVersion 加 1。
3. 读取 computed 时，Vue 先比较 globalVersion。globalVersion 没有改变时，直接返回缓存。
4. globalVersion 改变时，Vue 检查 computed 的每个依赖的 version。
5. 所有依赖的 version 都没有改变时，返回缓存。否则重新计算。
6. 重新计算的结果和旧值相同时，computed 自己的 version 不变。所以依赖这个 computed 的组件不更新。

第 6 步很重要。下面的示例中，`count` 从 1 改为 2，`isPositive` 仍为 true。读取 isPositive 的组件不会更新。

```js
const count = ref(1)
const isPositive = computed(() => count.value > 0)

// 3.4+：getter 的第一个参数是上一次的值
const maxSoFar = computed((prev = 0) => Math.max(prev, count.value))
```
:::

### 4.2 可写的 computed：给 v-model 一个转换后的值

默认的 computed 只读。v-model 要写入它时，传一个有 `get` 和 `set` 的对象。get 从数据源算出值。set 把新值转换后写回数据源。

```js
const first = ref('Evan')
const last = ref('You')
const fullName = computed({
  get: () => `${first.value} ${last.value}`,
  set: (v) => { [first.value, last.value] = v.split(' ') }
})
fullName.value = 'John Doe'   // first: 'John'，last: 'Doe'
// 模板：<input v-model="fullName">
```

**场景：任务预算以元显示、以分存储。**后端字段是整数“分”。输入框显示“元”。get 把分转为元，set 把元转为分。

```js
const budgetCents = ref(1999)            // 后端字段：分
const budgetYuan = computed({
  get: () => (budgetCents.value / 100).toFixed(2),          // "19.99"
  set: (v) => { budgetCents.value = Math.round(Number(v) * 100) }
})
budgetYuan.value = '12.3'                 // budgetCents.value 变为 1230
// 模板：<input v-model.lazy="budgetYuan">
// 用 .lazy：失去焦点后才写入。否则输入时 toFixed 会改写输入框
```

注意：set 只把值写回数据源。不要在 set 中发送请求或修改无关数据。

组件也可以用可写的 computed 实现 v-model。[第 6.4 节](/chapters/06-comm)讲这种写法和更简单的 `defineModel()`。

### 4.3 watch 和 watchEffect：数据改变后执行操作

<div class="tbl-wrap">
<table v-pre class="t">
    <tr><th></th><th><code>watch(source, cb)</code></th><th><code>watchEffect(fn)</code></th></tr>
    <tr><td>依赖</td><td>你指定 source</td><td>Vue 收集 fn 读取的数据</td></tr>
    <tr><td>第一次运行</td><td>默认不运行。设置 <code>immediate: true</code> 后运行。</td><td>立即运行</td></tr>
    <tr><td>新值和旧值</td><td>可以得到</td><td>不能得到</td></tr>
    <tr><td>深度</td><td>侦听 reactive 对象时默认为深层。侦听 ref 对象时设置 <code>deep: true</code>。</td><td>只跟踪读取的属性</td></tr>
    <tr><td>运行时间 flush</td><td colspan="2"><code>'pre'</code>：组件更新前（默认）。<code>'post'</code>：DOM 更新后。<code>'sync'</code>：同步运行。</td></tr>
  </table>
</div>

```js
// 侦听 ref
watch(keyword, (newVal, oldVal) => { ... })
// 侦听 reactive 对象的一个属性：使用 getter 函数
watch(() => form.age, (age) => { ... })
// 侦听多个数据
watch([a, b], ([newA, newB]) => { ... })
// 收集依赖，并立即运行一次
watchEffect(() => console.log(`当前第 ${page.value} 页`))
```

按下面的规则选择：

1. 回调只用它自己读取的数据，并且第一次就要运行：用 `watchEffect`。例如把状态写到 `document.title`，或按 url 请求数据。你不用列出数据源。
2. 需要旧值、需要在数据改变后才运行，或者要精确指定哪个数据改变才触发：用 `watch`。例如只在 `id` 改变时请求，忽略回调里读到的其他数据。

注意：`watchEffect` 只在同步执行期间收集依赖。回调是 async 函数时，`await` 之后读取的响应式数据不会成为依赖。所以第 8 章的 useFetch 把 `toValue(url)` 写在 `await` 之前。

**场景：筛选条件改变时重新请求任务。**进入页面时也要请求一次，所以设置 `immediate: true`。filters 是 ref 对象，修改内部字段时要触发，所以设置 `deep: true`。

```js
const filters = ref({ owner: '', status: 'all' })

watch(filters, (f) => loadTasks(f), {
  immediate: true,   // 创建侦听器时立即运行一次
  deep: true         // filters.value.status = 'done' 也触发
})
```

**场景：任务第一次加载完成后，定位到链接中的任务。**只需要运行一次。设置 `once: true`（Vue 3.4 及以上）。回调运行一次后，侦听器自动停止。

```js
const tasks = ref([])

watch(tasks, () => {
  scrollToTask(route.query.taskId)   // route 是路由信息（第 17 章）。以后列表刷新时不再运行
}, { once: true })
```

**场景：任务增删或替换时保存顺序。**修改任务的标题不需要保存顺序。设置 `deep: 1`（Vue 3.5 及以上）。Vue 只遍历数组这一层，不遍历任务对象的字段。

```js
watch(tasks, saveOrder, { deep: 1 })

tasks.value.push(newTask)        // 触发
tasks.value[0] = editedTask      // 触发
tasks.value[0].title = '新标题'   // 不触发
```

注意：不要对很大的列表写 `deep: true`。每次触发，Vue 都遍历所有字段。只关心一个值时，侦听 getter，例如 `watch(() => tasks.value.length, cb)`。

::: deep flush 时机实验
watch 的回调按 flush 选项进入不同的队列。下面的实验台在同一次修改中注册了三个侦听器，并在每个回调中读取 DOM。

<Lab id="demo-flush" title="实验台：pre、post 和 sync" note="运行真实的 Vue">
<template #predict>
<Sc predict :a="0">

先猜：三个侦听器都读取 DOM 中显示的 count。点击 count++（0 变为 1）。哪些侦听器读到 DOM=1？

```js
watch(count, f, { flush: 'sync' })
watch(count, f)          // 默认 'pre'
watch(count, f, { flush: 'post' })
```

<Opt>只有 post</Opt>
<Opt>pre 和 post</Opt>
<Opt>三个都是</Opt>

<template #explain>

解析：sync 在赋值时立即运行，DOM 还没有更新。pre 在组件更新前运行，DOM 也是旧值。post 在 DOM 更新后运行，所以读到 1。第二项以为默认的 pre 在更新后运行。第三项以为赋值立即修改 DOM。打开实验台，点击 count++，从下向上读日志中每行的 DOM 值。

</template>
</Sc>
</template>

<FlushTiming />
</Lab>
:::

::: deep 暂停和恢复侦听器（3.5）
```js
const { stop, pause, resume } = watch(source, cb)
pause()    // 暂停期间的修改不运行回调
resume()   // 恢复后，如果暂停期间有修改，Vue 按 flush 设置安排一次运行
stop()     // 永久停止
```
:::

### 4.4 onCleanup：防止竞态问题

竞态问题的过程如下：

1. 用户输入 a。程序发送请求 1。
2. 用户输入 ab。程序发送请求 2。
3. 请求 2 先返回。页面显示 ab 的结果。
4. 请求 1 后返回。页面显示 a 的结果。这个结果是错误的，因为用户最后输入的是 ab。

按下面的步骤解决：

1. 在 watch 回调中声明变量 `cancelled`。
2. 调用 `onCleanup`，把 `cancelled` 设为 true。
3. 请求返回后，检查 `cancelled`。
4. 如果 `cancelled` 为 true，丢弃结果。

```js
watch(keyword, async (kw, _old, onCleanup) => {
  let cancelled = false
  onCleanup(() => { cancelled = true })
  const data = await search(kw)   // 请求时间不固定
  if (!cancelled) results.value = data
})
```

下图按时间顺序显示两个请求。

<Figure caption="请求 2 先返回，页面显示 ab 的结果。请求 1 后返回。onCleanup 已经把它的 cancelled 设为 true，所以结果被丢弃。">
<OnCleanupDiscardsStaleRequest />
</Figure>

Vue 在两个时刻调用 onCleanup 中的函数：下一次运行回调之前，以及侦听器停止时。所以请求 1 返回时，它的 cancelled 已经是 true。组件卸载时，侦听器也停止。

**场景：切换详情页时取消上一个请求。**Vue 3.5 提供 `onWatcherCleanup()`，作用和 onCleanup 相同。配合 AbortController，旧请求被真正取消，不只是丢弃结果。

```js
import { onWatcherCleanup } from 'vue'
watch(id, async (newId) => {
  const controller = new AbortController()
  onWatcherCleanup(() => controller.abort())   // 下一次运行前取消上一次请求
  data.value = await fetch(`/api/${newId}`, { signal: controller.signal }).then(r => r.json())
})
```

注意：onWatcherCleanup 只能在第一个 await 之前调用。

<Lab id="demo-watch" title="实验台：搜索竞态" note="每个请求需要 200 到 1600 毫秒">
<template #predict>
<Sc predict :a="1">

先猜：取消选择“使用 onCleanup”。快速输入 v、vu、vue。每个请求需要 200 到 1600 毫秒。“显示的结果”一定对应 vue 吗？

<Opt>一定。最后发出的请求最后写入</Opt>
<Opt>不一定。先发出的慢请求可能最后返回</Opt>
<Opt>一定。watch 自动作废旧的回调</Opt>

<template #explain>

解析：请求返回的顺序和发出的顺序无关。没有清理时，每个返回都写入结果。所以慢的旧请求可能覆盖新结果。watch 不会自动作废旧请求，要用 onCleanup 标记旧请求。打开实验台，取消 onCleanup，快速输入几次。在日志中找“⚠ 旧请求的结果替换了新结果”。延迟是随机的，所以可能要试几次。

</template>
</Sc>
</template>

<WatchRace />
</Lab>

<Exercise id="phenoFilter" />

<Exercise id="phenoRace" />

::: pitfalls
1. 不要在 computed 中发送请求或修改其他数据。把这些操作写在 watch 中。原因：computed 只在被读取时才运行。请求可能不发送，也可能在意外的时间发送。
2. 不要写 `watch(form.age, ...)`。写 `() => form.age`。原因：`form.age` 在调用 watch 时就被读取。watch 收到的是一个数字，不是响应式数据。
3. 值可以从其他数据计算得到时，使用 computed，不使用 watch。原因：用 watch 时，你要再写一个 ref 保存结果。两份数据容易不一致。
:::

::: selfcheck
<Sc :a="2">

下面的模板渲染一次。total 的 getter 运行几次？calc 运行几次？

```vue
const total = computed(() => n.value * 2)
function calc() { return n.value * 2 }

<p>{{ total }} {{ total }} {{ calc() }} {{ calc() }}</p>
```

<Opt>2 次和 2 次</Opt>
<Opt>1 次和 1 次</Opt>
<Opt>1 次和 2 次</Opt>

<template #explain>

解析：computed 第一次读取时计算，然后缓存。第二次读取直接返回缓存。方法每次调用都运行。

</template>
</Sc>

<Sc :a="1">

修改 `form.age` 后，回调运行吗？

```js
const form = reactive({ age: 18 })
watch(form.age, (v) => console.log(v))
form.age++
```

<Opt>运行，打印 19</Opt>
<Opt>不运行</Opt>
<Opt>运行两次</Opt>

<template #explain>

解析：`form.age` 在调用 watch 时就被读取，传入的是数字 18。数字不是响应式数据。Vue 在开发模式警告，回调从不运行。写 `() => form.age`。

</template>
</Sc>

<Sc :a="0">

创建侦听器后，count 一直没有改变。回调运行几次？

```js
const count = ref(0)
watch(count, () => console.log('run'))
```

<Opt>0 次</Opt>
<Opt>1 次</Opt>
<Opt>每次渲染都运行</Opt>

<template #explain>

解析：watch 默认不立即运行。count 改变后，回调才运行。要立即运行一次，设置 `immediate: true`，或使用 watchEffect。

</template>
</Sc>

<Sc :a="1">

下面三个需求，分别用 computed 还是 watch？① 购物车的总价。② 关键字改变后，请求搜索结果。③ 主题改变后，保存到 localStorage。

<Opt>① computed ② computed ③ watch</Opt>
<Opt>① computed ② watch ③ watch</Opt>
<Opt>① watch ② watch ③ computed</Opt>

<template #explain>

解析：从其他数据得到一个值，用 computed，所以 ① 用 computed。数据改变后执行操作，用 watch。发请求和保存数据都是操作，所以 ② 和 ③ 用 watch。computed 中不要发请求：它没有被读取时不运行，而且应该没有副作用。

</template>
</Sc>

<Sc :a="1">

用户先输入 a，再输入 ab。请求 a 用 800ms，请求 ab 用 200ms。最后 results 是什么？

```js
watch(keyword, async (kw, _old, onCleanup) => {
  let cancelled = false
  onCleanup(() => { cancelled = true })
  const data = await search(kw)
  if (!cancelled) results.value = data
})
```

<Opt>a 的结果，它最后返回</Opt>
<Opt>请求 ab 的结果</Opt>
<Opt>空，两个结果都被丢弃</Opt>

<template #explain>

解析：输入 ab 后，回调再次运行。运行之前，Vue 调用上一次注册的清理函数。这个函数把请求 a 的 cancelled 设为 true。请求 ab 先返回，写入结果。请求 a 后返回，cancelled 为 true，所以结果被丢弃。只有被取消的请求 a 被丢弃，所以结果不为空。没有 onCleanup 时，结果才会被 a 覆盖。

</template>
</Sc>

<Sc :a="1">

回顾（第 1 章）：下面的 computed 读取 ref 时没有写 `.value`。`double.value` 是什么？

```js
const count = ref(1)
const double = computed(() => count * 2)
```

<Opt>2，computed 中自动读取 .value</Opt>
<Opt>NaN，count 是 ref 对象，不是数字</Opt>
<Opt>2，但之后不随 count 改变</Opt>

<template #explain>

解析：第 1 章：在 JavaScript 中，用 `count.value` 读写 ref。只有模板自动读取顶层 ref 的 .value。computed 的 getter 是普通的 JavaScript 函数。所以 `count * 2` 是对象乘以 2，结果是 NaN。computed 不解包 ref，所以第一项错。第三项以为第一次能得到 2。另外，getter 没有读取 `count.value`，所以 count 改变后，结果仍是 NaN。修复：写 `count.value * 2`。

</template>
</Sc>

<Sc :a="1">

预算以分存储，输入框以元显示。输入框写 `v-model.lazy="budgetYuan"`。用户输入 24.3 后，budgetCents 要变为 1230。set 应该怎样写？

```js
const budgetCents = ref(1999)
const budgetYuan = computed({
  get: () => (budgetCents.value / 100).toFixed(2),
  set: ???
})
```

<Opt>`(v) => { budgetYuan.value = Math.round(Number(v) * 100) }`</Opt>
<Opt>`(v) => { budgetCents.value = Math.round(Number(v) * 100) }`</Opt>
<Opt>`(v) => { return Math.round(Number(v) * 100) }`</Opt>
<Opt>`(v) => { budgetCents.value = Number(v) / 100 }`</Opt>

<template #explain>

解析：set 把新值转换后写回数据源 budgetCents。输入框给的是字符串，所以先用 Number 转换，再乘 100 并取整。第一项写入 budgetYuan 自己，set 会再次调用自己，数据源不变。第三项只返回结果，set 的返回值被忽略，所以 budgetCents 不变。第四项方向反了：元转分要乘 100，不是除以 100。见 4.2 节的预算场景。

</template>
</Sc>

<Sc :a="3">

执行下面的代码后，saveOrder 运行吗？

```js
const tasks = ref([{ id: 1, title: '旧' }])
watch(tasks, saveOrder, { deep: 1 })
tasks.value[0].title = '新'
```

<Opt>运行。deep: 1 侦听数组和每个任务的字段</Opt>
<Opt>不运行。deep: 1 只在替换 tasks.value 时触发</Opt>
<Opt>运行。修改 ref 内部的任何数据都会触发</Opt>
<Opt>不运行。deep: 1 只遍历数组这一层</Opt>

<template #explain>

解析：`deep: 1` 只遍历一层：数组本身。push、删除和 `tasks.value[0] = 新任务` 都触发。任务对象的字段在第二层，修改 title 不触发。第一项把 deep: 1 当成了 deep: true。第二项错在 push 和下标赋值也触发。第三项是 deep: true 的行为，没有 deep 时连 push 也不触发。见 4.3 节的“保存顺序”场景。

</template>
</Sc>

:::

::: summary
- computed 计算值。computed 是惰性的，并且有缓存。getter 中不写副作用。
- 可写的 computed 用 get 和 set 让 v-model 绑定转换后的值。
- watch 执行操作，可以得到新值和旧值。按需要设置 immediate、deep 和 once。
- 异步操作使用 onCleanup 或 onWatcherCleanup 防止竞态问题。
:::
