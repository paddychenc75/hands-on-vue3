---
title: 选项式 API 与 Vue 2 迁移
id: migrate
stage: 5
chapter: 24
desc: 选项式 ↔ 组合式对照、破坏性变化、@vue/compat
---

<script setup>
import OptionsVsCompositionLayout from '../figures/24-migrate/OptionsVsCompositionLayout.vue'
import MigCounterLab from '../labs/24-migrate/MigCounterLab.vue'
</script>

# 选项式 API 与 Vue 2 迁移

::: goals
<Goal checks="sc:1">读懂选项式 API 写的组件，并改写为组合式 API。</Goal>
<Goal checks="sc:0,sc:2,ex:migrateVModel,ex:fbMigrate">说出 Vue 2 到 Vue 3 的主要破坏性变化。</Goal>
<Goal checks="sc:3">为一个 Vue 2 项目选择迁移路径。</Goal>

:::

::: rt
阅读主线约 14 分钟，深入内容约 1 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
选项式 API 像**按物品种类收纳**：衣服一个柜子，书一个柜子。组合式 API 像**按用途收纳**：出差用品放在一个箱子里。东西相同，只是放法不同。
:::

::: terms
选项式 API
: 用 data、methods 等选项组织组件代码。

组合式 API
: 在 setup 中用函数组织组件代码。

破坏性变化
: 让旧代码不能正常运行的版本改动。

@vue/compat
: 提供 Vue 2 兼容行为的 Vue 3 构建，用于迁移。
:::

::: why
你接手一个 Vue 2 项目。代码用 data、methods 和 this 写成。升级到 Vue 3 后，一些组件报错，例如 `this.$set` 不存在。

原因：两种 API 的写法不同，Vue 3 还有破坏性变化。Vue 2 已经停止维护，所以项目必须迁移。

本章给出两种 API 的对应关系和迁移步骤。
:::

### 24.1 把选项式 API 改写为组合式 API

选项式 API 按选项类型组织代码：数据、方法和侦听器分开写。组合式 API 按功能组织代码：一个功能的数据和函数写在一起。下图用底色标出同一个功能。

<Figure caption="选项式 API 把同一个功能的代码分到多个选项中。组合式 API 把它们放在一起。同一种底色表示同一个功能。">
<OptionsVsCompositionLayout />
</Figure>

Vue 3 仍然支持选项式 API。两种 API 使用同一个响应式系统，可以在一个项目中混用。所以你可以逐个组件改写。按下表找到每个选项的对应写法：

| 选项式 API | 组合式 API |
|---|---|
| `data() { return { n: 0 } }` | `const n = ref(0)` |
| `methods: { inc() { this.n++ } }` | `function inc() { n.value++ }` |
| `computed: { double() { ... } }` | `const double = computed(() => ...)` |
| `watch: { n(v, old) { ... } }` | `watch(n, (v, old) => ...)` |
| `props: ['title']` | `const props = defineProps(['title'])` |
| `emits` + `this.$emit('x')` | `const emit = defineEmits(['x'])` |
| `created` | setup 中的代码 |
| `mounted / unmounted` | `onMounted / onUnmounted` |
| `this.$refs.input` | `useTemplateRef('input')`（3.5+） |
| `provide / inject` 选项 | `provide() / inject()` 函数 |
| `this.$attrs / this.$slots` | `useAttrs() / useSlots()` |
| `mixins` | 组合式函数 |
| 过滤器 `{{ n \| money }}` | 已删除。使用函数或 computed |

同一个组件的两种写法如下：

```js
// 选项式 API
export default {
  props: { start: { type: Number, default: 0 } },
  emits: ['change'],
  data() {
    return { count: this.start }
  },
  computed: {
    double() { return this.count * 2 }
  },
  watch: {
    count(v) { this.$emit('change', v) }
  },
  methods: {
    inc() { this.count++ }
  },
  mounted() {
    this.$refs.btn.focus()
  }
}
```

```js
// 组合式 API（<script setup>）
const props = defineProps({ start: { type: Number, default: 0 } })
const emit = defineEmits(['change'])

const count = ref(props.start)
const double = computed(() => count.value * 2)
watch(count, v => emit('change', v))
function inc() { count.value++ }

const btn = useTemplateRef('btn')
onMounted(() => btn.value.focus())
```

<Lab id="demo-mig-counter" title="实验台：两种 API 写的同一个计数器" note="两个组件都在真实的 Vue 3 中运行">
<template #predict>
<Sc predict :a="1">

先猜：两个计数器都用 start 初始化 count。把 props.start 从 5 改为 10，不点击“重新挂载”。两个 count 是多少？

```js
data() { return { count: this.start } }   // 选项式
const count = ref(props.start)            // 组合式
```

<Opt>都变为 10</Opt>
<Opt>都仍是 5</Opt>
<Opt>只有选项式变为 10</Opt>

<template #explain>

解析：两种写法都只在创建组件时读取一次 start，把值复制给 count。之后 count 和 start 没有联系，所以都仍是 5。要跟随 prop，需要 computed 或 watch。两种 API 的行为相同。打开实验台，把 start 改为 10，看两个 count，然后点击“重新挂载”。

</template>
</Sc>
</template>

<MigCounterLab />
</Lab>

mixin 有两个问题。第一，多个 mixin 的属性名可能冲突。第二，在组件中看不出一个属性来自哪个 mixin。组合式函数返回明确的变量，调用方可以重命名它们。所以迁移时，把 mixin 改为组合式函数。

```js
// Vue 2：mixin。组件中的 this.x 来自哪里，看不出来
export const mouseMixin = {
  data() { return { x: 0 } },
  mounted() { window.addEventListener('mousemove', this.onMove) },
  beforeDestroy() { window.removeEventListener('mousemove', this.onMove) },
  methods: { onMove(e) { this.x = e.clientX } }
}

// Vue 3：组合式函数。来源明确，可以重命名
const { x: mouseX } = useMouse()
```

::: deep 选项式 API 怎样运行
Vue 3 用 `applyOptions` 处理选项式 API。它在 setup 之后运行：

1. data() 的返回值传给 `reactive()`。
2. computed 中的每个函数传给 `computed()`。
3. watch 中的每一项传给 `watch()`。
4. mounted 等选项注册为生命周期钩子。

`this` 是组件的代理对象。读取 `this.count` 时，代理按下面的顺序查找：

1. setup 返回的数据（setupState）。
2. data。
3. props。
4. methods 和 computed。
5. `$el`、`$emit` 等公共属性。
6. globalProperties。

不使用选项式 API 时，把构建标志 `__VUE_OPTIONS_API__` 设为 false。打包结果因此变小。
:::

### 24.2 迁移路径

Vue 2 在 2023 年 12 月 31 日停止维护。按下面的步骤迁移：

1. 升级到 Vue 2.7。2.7 支持组合式 API 和 `<script setup>`。
2. 在 2.7 中，把新代码写为组合式 API。把 mixin 改为组合式函数。
3. 把 Vuex 换为 Pinia。Pinia 2.x 同时支持 Vue 2 和 Vue 3。
4. 换为 Vue 3 和 `@vue/compat`。按 24.3 节修复控制台中的兼容性警告。
5. 同时升级 Vue Router 4 和 UI 库，例如 Element UI 换为 Element Plus。
6. 修复所有警告后，删除 @vue/compat。

`@vue/compat` 是 Vue 3 的迁移构建版本。它在 Vue 3 中模拟大部分 Vue 2 的行为。每使用一个已删除的功能，它就发出一条警告。

```js
// vite.config.js
resolve: { alias: { vue: '@vue/compat' } }

// 逐个关闭兼容功能。所有组件都改好后，关闭一个功能
import { configureCompat } from 'vue'
configureCompat({ MODE: 3, COMPONENT_V_MODEL: false })
```

也可以按组件设置兼容模式。组件的 `compatConfig` 覆盖全局设置。

**场景：已经改好的组件使用 Vue 3 行为。**全局仍是兼容模式。任务列表组件已经迁移完成。在这个组件中设置 MODE: 3。它不再使用兼容行为，也不再发出警告。

```vue
<script setup>
defineOptions({
  compatConfig: { MODE: 3 }   // 只有这个组件使用 Vue 3 行为
})
</script>
```

**场景：全局切换到 Vue 3 行为，暂时保留一个旧组件。**全局设置 MODE: 3。旧的任务表格还使用 `$listeners`。为它单独设置 MODE: 2，以后再改。

```js
// main.js
configureCompat({ MODE: 3 })

// LegacyTaskTable.vue（选项式）
export default {
  compatConfig: { MODE: 2 },   // 这个组件仍使用 Vue 2 行为
  // ……
}
```

删除 @vue/compat 之前，先修复所有设置了 MODE: 2 的组件，再删除 compatConfig。

### 24.3 修复 Vue 2 到 Vue 3 的破坏性变化

兼容模式的警告对应下表中的变化。逐项修复：

| Vue 2 | Vue 3 |
|---|---|
| `new Vue({ render: h => h(App) }).$mount('#app')` | `createApp(App).mount('#app')` |
| `Vue.use / Vue.component / Vue.prototype.$x` | `app.use / app.component / app.config.globalProperties.$x` |
| 组件 v-model：prop `value`，事件 `input` | prop `modelValue`，事件 `update:modelValue` |
| `:title.sync="t"` | 已删除。使用 `v-model:title="t"` |
| 同一元素上，v-for 优先于 v-if | v-if 优先于 v-for |
| `$listeners` | 已删除。事件监听合并到 `$attrs` |
| `$attrs` 不包含 class 和 style | `$attrs` 包含 class 和 style |
| 过滤器 | 已删除 |
| 事件 API：`$on / $off / $once` | 已删除。使用 mitt 等库，或使用 Pinia |
| 函数式组件：`functional: true` | 普通函数 |
| `Vue.set / Vue.delete` | 不需要。Proxy 可以检测新增和删除的属性 |
| `<template v-for>` 的 key 写在子元素上 | key 写在 `<template>` 上 |
| `beforeDestroy / destroyed` | `beforeUnmount / unmounted` |
| 组件只能有一个根元素 | 可以有多个根元素 |
| `@click.native` | 已删除。没有在 emits 中声明的事件绑定到根元素 |
| 过渡类名 `v-enter` | `v-enter-from` |

```html
<!-- Vue 2 -->
<MyInput v-model="text" />            <!-- value + @input -->
<Dialog :visible.sync="show" />
<li v-for="u in users" v-if="u.active">   <!-- Vue 3 中，v-if 先运行，读不到 u -->

<!-- Vue 3 -->
<MyInput v-model="text" />            <!-- modelValue + @update:modelValue -->
<Dialog v-model:visible="show" />
<template v-for="u in users" :key="u.id">
  <li v-if="u.active">{{ u.name }}</li>
</template>
```

<Exercise id="migrateVModel" />

<Exercise id="fbMigrate" />

Vue 2 的 `Vue.prototype.$x` 改为 `app.config.globalProperties.$x`。选项式组件中的 `this.$x` 不用修改。

**场景：替换 Vue.prototype 上的请求对象。**选项式组件中有很多 `this.$http`。把 `Vue.prototype.$http = http` 改为下面的写法。

```js
// main.js
app.config.globalProperties.$http = http

// 选项式组件中，代码不变
export default {
  async created() {
    this.tasks = await this.$http.get('/tasks')
  }
}
```

**场景：替换 Vue 2 的全局过滤器。**旧项目在模板中写 `{{ task.budget | money }}`。Vue 3 删除了过滤器。把这些函数放到 `$filters` 中，再批量替换模板。

```js
// main.js
app.config.globalProperties.$filters = {
  money: cents => '¥' + (cents / 100).toFixed(2),
  date: ts => new Date(ts).toLocaleDateString()
}

// 模板：{{ $filters.money(task.budget) }}
```

`<script setup>` 中没有 this，不能读取全局属性。新代码直接 import 函数，或使用 provide / inject。

::: pitfalls
1. 不要在 Vue 3 中写 `this.$set`。直接赋值即可。原因：Vue 3 删除了 $set。Proxy 能检测新增的属性。
2. 不要在同一个元素上同时写 v-if 和 v-for。用 `<template>` 或 computed 先过滤。原因：Vue 3 中 v-if 先运行，它读不到 v-for 的变量。
3. 迁移组件的 v-model 时，把 value 改为 modelValue，把 input 改为 update:modelValue。原因：Vue 3 的组件 v-model 使用这两个新名称。
4. 在 emits 中声明组件发出的所有事件。否则同名的原生事件也会触发监听函数。
5. 不要用箭头函数写 methods 和 computed。原因：箭头函数中的 this 不是组件实例。
:::

::: selfcheck
<Sc :a="2">

在 Vue 3 中运行下面的模板。结果是什么？

```html
<li v-for="u in users" v-if="u.active">{{ u.name }}</li>
```

<Opt>只显示 active 的用户</Opt>
<Opt>显示所有用户</Opt>
<Opt>报错：u 是 undefined</Opt>

<template #explain>

解析：Vue 3 中，v-if 先于 v-for 运行。这时 u 还不存在。把 v-for 移到 `<template>` 上，或用 computed 先过滤。

</template>
</Sc>

<Sc :a="1">

下面的 `this` 指向什么？

```js
methods: {
  inc: () => { this.count++ }
}
```

<Opt>组件实例</Opt>
<Opt>不是组件。箭头函数没有自己的 this</Opt>
<Opt>props 对象</Opt>

<template #explain>

解析：箭头函数使用外层的 this。Vue 不能把它绑定到组件。methods 中使用普通函数：`inc() { this.count++ }`。

</template>
</Sc>

<Sc :a="1">

Vue 2 的 `<Dialog :visible.sync="show" />` 在 Vue 3 中怎样写？

<Opt>\<Dialog :visible="show" /></Opt>
<Opt>\<Dialog v-model:visible="show" /></Opt>
<Opt>\<Dialog v-bind.sync="show" /></Opt>

<template #explain>

解析：Vue 3 删除了 .sync。带参数的 v-model 代替它。子组件发出 `update:visible` 事件。

</template>
</Sc>

<Sc :a="1">

一个 Vue 2.6 项目使用了 mixin、Vuex 和 Element UI。按 24.2 节的迁移路径，第一步做什么？

<Opt>直接换为 Vue 3，一次改完所有组件</Opt>
<Opt>升级到 Vue 2.7，新代码用组合式 API</Opt>
<Opt>先把 Element UI 换为 Element Plus</Opt>

<template #explain>

解析：Vue 2.7 支持组合式 API 和 `<script setup>`。项目可以继续运行，同时逐步把 mixin 改为组合式函数。一次改完所有组件的风险太大，出错时很难定位。Element Plus 只支持 Vue 3。所以它要和 Vue 3 一起升级，不能放在第一步。

</template>
</Sc>

<Sc :a="2">

回顾（第 5 章）：Vue 2 组件用 `props: ['value']` 和 `$emit('input', v)` 支持 v-model。在 Vue 3 中，父组件写 `<MyInput v-model="text" />`。结果是什么？

<Opt>正常工作，Vue 3 兼容旧写法</Opt>
<Opt>编译报错，要求改用 modelValue</Opt>
<Opt>value 为空，输入不改变 text</Opt>

<template #explain>

解析：第 5 章：Vue 3 中，组件的 v-model 传入 `modelValue`，并监听 `update:modelValue`。所以子组件的 value 收不到值，input 事件也没有人监听。Vue 3 不兼容这个旧约定，但也不报编译错误，所以问题容易被忽略。修复：改为 `modelValue` 和 `update:modelValue`，或使用 `defineModel()`。

</template>
</Sc>

:::

::: summary
- data、methods、computed、watch 分别对应 ref、函数、computed、watch。两种 API 可以混用。
- mixin 改为组合式函数。过滤器改为函数。
- 迁移路径：Vue 2.7 → Pinia → @vue/compat → Vue 3。compatConfig 按组件切换行为。
- 主要变化：createApp、v-model、v-if 优先、$listeners 和 $on 删除。Vue.prototype 改为 globalProperties。
:::
