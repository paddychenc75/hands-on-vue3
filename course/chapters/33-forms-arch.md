---
title: 表单架构
id: forms-arch
stage: 6
chapter: 33
desc: 从零设计一个小表单库：状态模型、路径读写、字段注册、分层校验、异步竞态、字段数组、提交与类型
---

<script setup>
import FormInspector from '../labs/33-forms-arch/FormInspector.vue'
</script>

# 表单架构

::: goals
<Goal checks="sc:0,ex:formCore">说明表单状态里哪些要存、哪些要算，并写出按路径读写、dirty 和 reset。</Goal>
<Goal checks="sc:1,sc:2">说明为什么集中持有值不会让整个表单重新渲染，并设计字段的注册与卸载。</Goal>
<Goal checks="sc:3,sc:4,ex:formRace">区分字段级和表单级校验，写出只认最新结果的异步校验。</Goal>
<Goal checks="sc:5,ex:formArray">实现字段数组的增删移动，并让 touched 和错误跟着项走。</Goal>
<Goal checks="sc:6,sc:7">设计提交流程，并为字段路径写类型。</Goal>
<Goal checks="sc:8">判断什么时候用配置驱动的表单、什么时候第 11 章的写法就够。</Goal>

:::

::: rt
阅读主线约 32 分钟，深入内容约 3 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
表单库像**活动的签到处**。字段到场时登记，离场时注销。签到处手里有名册，所以能点名（校验）、找人（聚焦第一个出错的字段）、清场（重置）。名册由签到处统一保管，不放在每个人自己口袋里。
:::

::: terms
dirty
: 字段的当前值和初始值不同。

字段路径
: 用字符串指出嵌套值的位置，例如 `user.address.city`、`items[2].price`。

字段注册
: 字段挂载时告诉所属表单“我在这里”，卸载时撤销。

字段数组
: 数量可变、可以增删和排序的一组同类字段。

表单级规则
: 需要同时看多个字段的规则，例如“确认密码必须等于密码”。

schema
: 用一份数据描述值的结构和规则，校验和类型都从它得到。
:::

::: why
你的应用有 40 个表单。每个表单都手写 `touched`、错误、提交中状态。订单页的商品行可以增删，用户删掉第一行后，第二行的错误跑到了第一行。注册页的用户名检查，旧请求的结果覆盖了新结果。

原因：[第 11 章](/chapters/11-forms)的写法适合一个表单。表单一多，字段一动态，每个问题都要在每个表单里再解决一遍，而且解决得不一样。

本章带你从零写一个小表单库 `useForm` + `useField`。每一节解决一个设计问题。最后拿它和 VeeValidate、FormKit、TanStack Form 对照，看它们在同样的问题上怎样选择。
:::

### 33.1 表单状态：存什么，算什么

一个字段不只有值。表单也不只有字段。先列出所有状态，再决定哪些存、哪些算。判断依据是[第 24 章](/chapters/24-state-arch)的“派生而不存储”（24.3 节）：能由别的状态算出来的，就不单独存。

| 状态 | 存还是算 | 理由 |
|---|---|---|
| `values` 当前值 | 存 | 用户输入，唯一来源 |
| `initial` 初始值 | 存 | 比较和重置都要用，必须和 `values` 分开存 |
| `touched[路径]` | 存 | 是历史（用户碰过），算不出来 |
| `dirty` | 算 | 比较 `values` 和 `initial` |
| 同步错误 | 算 | 由规则和 `values` 决定 |
| 异步错误、服务端错误 | 存 | 是一次请求的结果，不由值直接决定 |
| `validating[路径]` | 存 | 请求进行中 |
| `isValid` | 算 | 所有字段没有错误，也没有检查中 |
| `submitCount`、`isSubmitting` | 存 | 事件的计数和状态 |

同步错误为什么不存？存下来就要决定谁在什么时候更新它。例如“确认密码”的错误依赖密码字段。用户改了密码，确认密码字段的值没变，存下来的错误就是过期的。算出来的错误没有这个问题（自测第 4 题）。

核心状态这样写（`useForm` 的前半部分）：

```js
export function useForm({ initialValues, schema, onSubmit }) {
  const initial = shallowRef(structuredClone(initialValues))   // 存：比较和重置用
  const values = reactive(structuredClone(initialValues))      // 存：用户输入
  const touched = reactive({})                                 // 存：历史
  const asyncErrors = reactive({})                             // 存：请求的结果
  const serverErrors = reactive({})
  const validating = reactive({})
  const submitCount = ref(0)
  const isSubmitting = ref(false)
  const fields = shallowReactive(new Map())                    // 已注册的字段（33.3 节）

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  const isDirty = p => !same(p ? getPath(values, p) : values, p ? getPath(initial.value, p) : initial.value)
  const dirty = computed(() => isDirty())                      // 算

  function reset(next) {
    if (next) initial.value = structuredClone(next)            // 保存成功后，把新值当作初始值
    Object.keys(values).forEach(k => delete values[k])
    Object.assign(values, structuredClone(initial.value))
    for (const s of [touched, asyncErrors, serverErrors]) Object.keys(s).forEach(k => delete s[k])
    submitCount.value = 0
  }
  // …
}
```

`initial` 和 `values` 必须是两份复制。共用一个对象，用户一改，初始值也变了，`dirty` 永远是 false。`reset` 不能把 `values` 换成新对象，输入框绑定的是原来那个。

用 `JSON.stringify` 比较是为了简单：键的顺序不同会被当成不同，`Date` 会变成字符串。真实的库会写专门的深比较。

“放弃修改”的确认就建立在 `dirty` 上。路由守卫（第 23 章）里写 `onBeforeRouteLeave(() => !form.dirty.value || confirm('放弃未保存的修改？'))`。

### 33.2 值放在哪里：集中持有，按路径读写

有两种方案：

| | 集中持有 | 字段各自持有再上报 |
|---|---|---|
| 值在哪里 | 表单里的一个 reactive 对象 | 每个字段组件里的 ref |
| 字段卸载 | 值还在（条件字段、多步表单） | 值随组件消失 |
| 提交、重置、dirty | 遍历一个对象 | 要逐个字段收集 |
| 初始值 | 表单统一给 | 每个字段各自给 |

本章选集中持有，理由和[第 24 章](/chapters/24-state-arch)一致：每个事实只在一个地方写入。字段各自持有适合互相独立、不需要汇总的小控件。

字段按**路径**读写这个对象。路径是 `user.address.city` 或 `items[2].price` 这样的字符串：

```js
const parse = p => p.split(/[.\[\]]/).filter(Boolean)          // 'items[2].price' → ['items', '2', 'price']

export const getPath = (obj, path) => parse(path).reduce((o, k) => o?.[k], obj)

export function setPath(obj, path, value) {
  const keys = parse(path)
  const last = keys.pop()
  let cur = obj
  keys.forEach((k, i) => {
    if (cur[k] == null) cur[k] = /^\d+$/.test(keys[i + 1] ?? last) ? [] : {}   // 缺的中间层：下一个键是数字就建数组
    cur = cur[k]
  })
  cur[last] = value
}
```

**重新渲染的范围。**React 生态里常说：值集中在一个 state 里，输入一个字，整个表单都重新渲染。Vue 不是这样。reactive 对象按属性追踪依赖，一个字段只读自己的路径，别的路径变了它不更新。在 Vue 3.5.43 里实测（实验台里能看到）：在一个字段里输入，只有这个字段的组件更新，表单根组件和其他字段都是 0 次。

有三种写法会破坏这一点：

1. **读了整个对象。**调试面板里的 `JSON.stringify(form.values)` 或 `{ ...form.values }` 读了每个属性，每次输入都会更新。
2. **传内联数组或对象。**`<Field :rules="[required]" />` 在父组件每次渲染时创建新数组，子组件的 props 变了，就跟着更新。实测：父组件更新一次，内联数组的子组件更新一次，常量数组的子组件 0 次。把规则写在组件外面。
3. **根组件读了每次输入都会变的值。**例如在根模板里显示某个字段的当前长度。根模板里的 `form.isValid.value` 只在真假翻转时才引起更新，没有问题。把每次都变的读取放进小组件，让变化只波及它自己（第 34 章讲过这个思路）。

<Exercise id="formCore" />

::: pitfalls
1. 不要对 reactive 对象直接调用 `structuredClone`。它会抛出 `DataCloneError`（实测）。先 `toRaw(values)` 再复制。
2. `touched` 这类按路径存的状态，键是字符串，例如 `'items[1].price'`。数组的项一搬家，这些键就要跟着改（33.6 节）。
:::

### 33.3 字段注册：useField 与组件解耦

表单需要知道有哪些字段在场：`isValid` 要遍历它们，提交失败要聚焦第一个出错的，提交时要等它们进行中的检查。所以字段挂载时向所属表单**注册**，卸载时注销。

字段怎样找到所属表单？`useForm` 用 `provide` 交出去，`useField` 用 `inject` 取（[第 5 章](/chapters/05-comm)）：

```js
const FORM = Symbol('form')
// useForm 末尾：provide(FORM, form)

export function useField(name, { rules = [], asyncRules = [], delay = 300, clearOnUnmount = false } = {}) {
  const form = inject(FORM)
  if (!form) throw new Error('useField 必须在 useForm 的后代组件里调用')
  const path = () => toValue(name)                        // name 可以是 getter：数组的下标会变

  const value = computed({
    get: () => getPath(form.values, path()),
    set: v => setPath(form.values, path(), v)
  })
  const meta = { el: null, flush /* 33.5 节 */, syncError /* 33.4 节 */ }

  watch(path, (p, _old, onCleanup) => {
    form.register(p, meta)
    onCleanup(() => form.unregister(p, meta))             // 换路径或卸载时撤销
  }, { immediate: true, flush: 'sync' })

  onScopeDispose(() => {
    if (clearOnUnmount) { /* 清掉 values、touched、错误里这个路径的内容 */ }
  })
  // …
}
```

`name` 用 `watch` 监视，是因为字段数组删掉前面的项以后，后面的项下标变了，路径跟着变，要重新注册。

**条件字段消失时，值和错误怎么办？**这是产品决定，所以做成选项 `clearOnUnmount`，默认保留。默认保留的理由：用户在“个人/公司”之间来回切换，不应该丢掉刚填的公司名。需要时设为 `true`，卸载时清掉值、touched 和错误。无论哪种，字段注销后它的规则不再参与 `isValid`：隐藏的必填字段不会挡住提交（实测）。

::: deep 为什么 unregister 要比对 meta
`unregister(path, meta)` 只在注册表里的那一项正是自己时才删除。字段数组删掉第 1 项后，旧组件卸载时注销 `items[0]`，而原来第 2 项的组件已经用新路径 `items[0]` 注册了。不比对的话，旧组件的注销会删掉新组件的登记。实测：不比对时，删一项后注册表里的数组项字段全部丢失，`isValid` 和聚焦都失效。
:::

**字段逻辑和输入控件解耦。**沿用[第 21 章](/chapters/21-api-design)的三层：

- 第 1 层 `useField`：状态和行为，不输出标记。
- 第 2 层 `FormField`：把 `useField` 接到控件上，负责标签、错误文字和无障碍属性。
- 第 3 层 `TextInput`：输入控件，只认 `v-model` 和透传属性，不知道表单的存在。

```vue
<!-- TextInput.vue：控件，用 defineModel 暴露 v-model（5.4 节），其余属性透传到 input（5.3 节） -->
<script setup>
defineOptions({ inheritAttrs: false })
const model = defineModel()
</script>
<template><input v-model="model" v-bind="$attrs"></template>
```

```vue
<!-- FormField.vue -->
<script setup>
import { useId } from 'vue'
const props = defineProps({ name: String, label: String, rules: Array, asyncRules: Array })
const { value, error, validating, onBlur, setEl } = useField(() => props.name, { rules: props.rules, asyncRules: props.asyncRules })
const id = useId()
</script>
<template>
  <label :for="id">{{ label }}</label>
  <TextInput :id="id" v-model="value" :ref="setEl" :aria-invalid="!!error"
             :aria-describedby="error ? id + '-err' : undefined" @blur="onBlur" />
  <span v-if="validating">检查中…</span>
  <span v-else-if="error" :id="id + '-err'">{{ error }}</span>
</template>
```

`setEl` 登记元素，用于提交失败后聚焦（33.7 节）。它收到的是组件实例时取 `$el`，所以控件的根元素必须是可聚焦的那个元素。换一个控件（`SelectInput`、日期选择器）不用改 `useField` 和 `FormField`。

### 33.4 校验的时机与分层

**时机。**错误是算出来的，所以一直是最新的。时机只剩一个问题：什么时候显示。

```js
const error = computed(() => (form.touched[path()] || form.submitCount.value > 0 ? form.errorOf(path()) : ''))
```

这就是“提交前宽松，报错后积极”：

1. 用户没碰过这个字段，不显示（刚打第一个字就报错，是打扰）。
2. 离开字段后显示。这之后每次输入，错误都会立刻更新或消失（用户需要马上知道改对没有）。因为错误是算出来的，这一条不用额外写代码。
3. 点提交后显示所有错误，并聚焦第一个。

**分层。**规则有两层：

- **字段级规则**挂在字段上：`(value, values) => 错误信息或 ''`。第二个参数让它能读别的字段，例如 `(v, all) => v === all.password ? '' : '两次输入不一致'`。
- **表单级规则**（schema）看整个对象，返回 `{ 路径: 信息 }`。

```js
const schemaErrors = computed(() => (schema ? schema(values) : {}))
const errorOf = p => fields.get(p)?.syncError.value || schemaErrors.value[p] || asyncErrors[p] || serverErrors[p] || ''
const isValid = computed(() =>
  [...fields.keys()].every(p => !errorOf(p) && !validating[p]) && Object.keys(schemaErrors.value).length === 0)
```

字段自己的同步错误放在字段里算：

```js
const syncError = computed(() => {
  for (const rule of rules) {
    const msg = rule(value.value, form.values)
    if (msg) return msg
  }
  return ''
})
const error = computed(() => (form.touched[path()] || form.submitCount.value > 0 ? form.errorOf(path()) : ''))   // 显示用
const onBlur = () => { form.touched[path()] = true }
const setEl = el => { meta.el = el?.$el ?? el }
```

`syncError` 返回字符串，值没变就不通知依赖它的组件。所以输入密码时，只有密码字段和读了密码的确认字段需要重新计算，别的字段的组件不更新。

**用 schema 同时得到校验和类型。**Zod、Valibot 这类库用一份 schema 描述结构和规则，类型从它推出来：

```ts
import * as z from 'zod'

const schema = z.object({
  email: z.email('邮箱格式不正确'),
  items: z.array(z.object({ id: z.number(), price: z.number().min(1, '价格至少 1') }))
})
type Order = z.infer<typeof schema>                    // 类型从 schema 得到，不用手写第二遍
const form = useForm<Order>({ initialValues, schema: fromStandard(schema), onSubmit })
```

Zod 4.6.5 和 Valibot 1.5.0 都实现了 **Standard Schema**：每个 schema 上有一个 `~standard` 属性，`~standard.validate(value)` 返回 `{ issues }`，每个 issue 有 `message` 和 `path`。表单库只要认这一个接口，就不用为每个 schema 库写适配器。适配器很短：

```js
export function fromStandard(schema) {
  return values => {
    const r = schema['~standard'].validate(values)
    if (r instanceof Promise) throw new Error('表单级 schema 必须是同步的')
    const out = {}
    for (const i of r.issues ?? []) {
      const path = (i.path ?? []).map(k => (typeof k === 'object' ? k.key : k))          // 路径元素可以是键，也可以是 { key }
        .reduce((s, k) => (typeof k === 'number' ? `${s}[${k}]` : s ? `${s}.${k}` : String(k)), '')
      out[path] ??= i.message                                                              // 每个路径只留第一条
    }
    return out
  }
}
```

实测：Zod 的 `path` 是 `['items', 1, 'price']`，Valibot 是带 `key` 字段的对象数组（`{ type, origin, input, key, value }`），所以上面要分两种取。转成路径后，两个库对同一份数据给出相同的结果：`{ email, 'items[1].price', pwd2 }`。`validate` 也可以返回 Promise，异步的 schema 不能放进同步的 `computed`，要放在提交时检查。

**同步规则和异步规则用同一个接口**：都是 `(value, values, signal) => 信息或 ''`，异步的返回 Promise。区别在时机。同步规则在 `computed` 里随值重算，便宜。异步规则是请求，不能在 `computed` 里跑。它们分开声明（`rules` 和 `asyncRules`），只有同步规则全部通过才会发请求。

### 33.5 异步校验与竞态

用户名检查是一个请求。请求的返回顺序和发出顺序不一定一样：先发的 `ann` 慢，后发的 `anna` 快，`anna` 的结果先到，`ann` 的结果后到，把正确的结果覆盖了。这就是[第 4 章](/chapters/04-computed)的竞态问题。

4.4 节用 `onCleanup` 让旧的回调失效。这里还有一个调用入口不在 `watch` 里（提交时要立即检查），所以改用**序号**：每次检查领一个号，回来时只有最新的号可以写结果。

```js
let seq = 0, timer, ctrl, checked
const meta = { syncError, el: null, flush }

function cancel() { checked = undefined; seq++; clearTimeout(timer); ctrl?.abort(); delete form.validating[path()] }

async function flush() {                                         // 立即检查，返回 Promise
  clearTimeout(timer)
  if (!asyncRules.length || syncError.value || checked === value.value) return
  const id = ++seq
  const p = path()
  ctrl?.abort(); ctrl = new AbortController()
  form.validating[p] = true
  let msg = ''
  try {
    for (const rule of asyncRules) {
      msg = (await rule(value.value, form.values, ctrl.signal)) || ''
      if (msg) break
    }
  } catch (e) {
    if (e.name === 'AbortError') return
    msg = '校验失败，请稍后再试'                                  // 请求失败不能当作“通过”
  }
  if (id !== seq) return                                         // 已经有更新的一次，丢弃
  delete form.validating[p]
  checked = value.value
  if (msg) form.asyncErrors[p] = msg
}

watch(value, () => {                                             // 值变了：旧结果作废，防抖后检查
  cancel()
  delete form.asyncErrors[path()]
  delete form.serverErrors[path()]
  if (asyncRules.length && !syncError.value) {
    form.validating[path()] = true
    timer = setTimeout(flush, toValue(delay))
  }
})
```

四点：

1. **丢弃过期结果时，连 `validating` 一起丢弃。**过期的结果回来时如果把 `validating` 改回 false，界面会显示“检查完了”，而最新的请求还在路上（练习会检查这一点）。
2. **`AbortController` 能省网络流量，但不能代替序号。**不是所有异步来源都能取消。
3. **防抖不能代替序号。**防抖 300ms 之后，用户停顿 400ms 再继续输入，前一个请求还在路上，两个请求照样会同时存在（自测第 5 题）。
4. **提交时等待进行中的检查。**`flush` 清掉防抖计时器、立即检查。`checked` 记录已经检查过的值，值没变就不重复发请求。

<Exercise id="formRace" />

### 33.6 字段数组

订单的商品行、联系人列表：数量可变，可以增删和排序。三个设计要求：

**每一项要有稳定的 id，用它做 `v-for` 的 key。**下标做 key 时，删掉第一项，原来的第二个输入框 DOM 元素被留在第二个位置，改成显示第三项的数据；用 id 做 key，第二项的元素跟着它移到第一个位置（实测：删掉第 1 项后，用 id 做 key，第 3 项原来的输入框元素被保留；用下标做 key，被保留的是第 1 个位置的元素，它改成显示第 2 项的数据）。光标、输入法组合状态、过渡动画这些只存在于 DOM 元素上的东西，会留在错误的项上（[第 18 章](/chapters/18-diff)的 18.4 节）。注意：移动被聚焦的那一项（上移、拖动排序）时，浏览器会让被移动的输入框失去焦点，哪怕 key 是稳定的 id。移动之后要在 `nextTick` 里自己调用 `focus()`。删除和在它前面插入不受影响。

**不要把状态关联到下标上，除非你负责搬运。**同步错误是算出来的，项一搬家，组件拿到新路径，它自己重新算，自动正确。需要搬运的是按路径存的那几份：`touched`、`asyncErrors`、`serverErrors`。这就是 33.1 节“存与算”的代价。

**数组操作要同时搬运状态。**每个操作回答一个问题：原来第 j 项现在的下标是多少？

| 操作 | 原下标 j 的新下标 |
|---|---|
| `insert(i)` | `j >= i` 时 `j + 1`，否则不变 |
| `remove(i)` | `j === i` 时丢弃，`j > i` 时 `j - 1`，否则不变 |
| `move(from, to)` | `j === from` 时 `to`；夹在 `from` 和 `to` 之间的项往 `from` 的方向挪一位；其他不变 |

有了这张表，三个操作共用一个 `remap(arr, mapIndex)`：对每份按路径存的状态，把以 `items[j]` 开头的键改成 `items[mapIndex(j)]`，`null` 表示这一项被删了。注意先读值、再删旧键、最后统一写回，边遍历边写会覆盖还没处理的键。

另一种设计是把状态按项的 id 存，不用搬运，代价是路径不再是所有状态统一的键。

<Exercise id="formArray" />

### 33.7 提交

提交是一个小状态机：

<Flow :steps='["点击提交","等待进行中的检查","校验通过？","onSubmit","成功 / 失败"]' />

```js
async function submit() {
  if (isSubmitting.value) return                          // 防重复：同步检查
  isSubmitting.value = true
  submitCount.value++                                     // 此后所有错误都可见
  try {
    await Promise.all([...fields.values()].map(f => f.flush()))
    if (!isValid.value) return focusFirstError()
    await onSubmit(structuredClone(toRaw(values)))
  } catch (e) {
    if (!e.fieldErrors) throw e                           // 不是字段错误：交给调用方
    setErrors(e.fieldErrors)                              // 服务端的字段错误：映射回字段
    focusFirstError()
  } finally {
    isSubmitting.value = false
  }
}
```

**防重复提交。**按钮写 `:disabled="isSubmitting"` 还不够：`disabled` 要等下一次渲染才生效，同一个同步段内的第二次调用已经进来了。函数开头的检查立即生效（自测第 7 题）。前端的防重复只是减少问题，要真正避免重复下单，服务端要认得重复请求（例如幂等键）。

**服务端的字段错误。**约定服务端返回的错误用和前端相同的路径，例如 `{ "contacts[1].name": "联系人重复" }`。`setErrors` 把它们存进 `serverErrors`，字段按路径取。用户修改这个字段后，`useField` 里的 `watch(value)` 会清掉它。服务端用的是别的路径格式（例如 Zod 风格的数组）时，在入口转换一次，不要让转换散落在字段里。

**聚焦第一个出错的字段。**第 11 章（11.6、11.7 节）讲了为什么要聚焦。架构上的做法是字段注册时登记元素（33.3 节的 `setEl`）。第一个出错的字段按 DOM 顺序排，不能按注册顺序：条件字段和数组项会在中间插入。

```js
function focusFirstError() {
  const bad = [...fields.entries()].filter(([p, f]) => errorOf(p) && f.el)
  bad.sort((a, b) => (a[1].el.compareDocumentPosition(b[1].el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
  bad[0]?.[1].el.focus()
}
```

提交的数据用 `structuredClone(toRaw(values))` 复制成普通对象，不把 reactive 代理交给调用方。

<Lab id="demo-forms-arch" title="实验台：表单状态检查器" note="左边是用本章的迷你表单库写的表单，右边是每个字段的状态和各组件更新的次数">
<template #predict>
<Sc predict :a="1">

先猜：用户名检查对 ann 很慢（约 0.9 秒，已被占用），对 anna 很快（约 0.2 秒，可用）。点“快速输入 ann → anna”，0.1 秒后值从 ann 变成 anna。等两个请求都返回之后，用户名字段显示什么？

<Opt>已被占用，因为 ann 的请求最后返回，它是最后写入的</Opt>
<Opt>没有错误，ann 的结果返回时已经过期，被丢弃</Opt>
<Opt>先显示没有错误，ann 的结果返回后改成已被占用</Opt>

<template #explain>

解析：每次检查领一个序号，只有最新的序号可以写结果。anna 的请求是第 2 号，ann 的请求回来时序号已经不是最新的，被丢弃。日志里仍能看到 `返回 #1：ann 已被占用`，但字段不显示它。第一项把“最后返回”当成了“最新”。第三项以为过期的结果会先写入再被覆盖，实际上它根本不写。打开实验台，点按钮，看日志和右边的 error 列。勾上“用户名防抖”再试一次，日志里只会有一个请求，因为 0.1 秒内的输入合并成了一次。

</template>
</Sc>
</template>

<FormInspector />
</Lab>

在实验台里试这几件事：

1. 在“用户名”里输入一个字，看右边的“更新次数”：只有这个字段和“读了整个 values”的那一块增加。
2. 给第 2 个联系人的名字点一下再离开，然后点第 1 个联系人的“删除”。touched 和错误跟着那个联系人走。
3. 把“类型”选成公司，填公司名，再选回个人。勾上“条件字段隐藏时清除值”再试一次，看右边的值。
4. 服务器选“返回字段错误”，点提交。错误出现在对应的字段上，焦点移到第一个出错的字段。

### 33.8 类型：字段名与泛型

字段名是字符串，拼错了不会有任何提示。给 `useForm<T>` 加上路径类型，拼错就是编译错误。下面是思路，不展开成类型体操：

```ts
type Path<T> = T extends object
  ? { [K in keyof T & string]: T[K] extends (infer U)[]
        ? K | `${K}[${number}]` | (U extends object ? `${K}[${number}].${Path<U>}` : never)
        : T[K] extends object ? K | `${K}.${Path<T[K]>}` : K
    }[keyof T & string]
  : never

type PathValue<T, P extends string> =
  P extends `${infer K}[${number}].${infer R}` ? (K extends keyof T ? (T[K] extends (infer U)[] ? PathValue<U, R> : never) : never)
  : P extends `${infer K}[${number}]` ? (K extends keyof T ? (T[K] extends (infer U)[] ? U : never) : never)
  : P extends `${infer K}.${infer R}` ? (K extends keyof T ? PathValue<T[K], R> : never)
  : P extends keyof T ? T[P] : never

interface Order { name: string; user: { address: { city: string } }; items: { id: number; price: number }[] }

declare function field<T, P extends Path<T>>(form: T, name: P): { value: PathValue<T, P> }
declare const order: Order
field(order, 'items[0].price').value     // number
field(order, 'user.address.city').value  // string
// field(order, 'items[0].name')         // 编译错误：Order 的项里没有 name
// field(order, 'items.price')           // 编译错误：数组要写下标
```

用 TypeScript 实测：`Path<Order>` 接受 `'items'`、`'items[2].price'`、`'user.address.city'`，拒绝拼错的路径；`PathValue` 给出对应的类型。

还有一个难处：`useField` 在子组件里，通过 `inject` 拿表单，类型信息丢了。常见的两种出路：

- **工厂函数。**`createFormKit<T>()` 返回绑定了 `T` 的 `useForm` 和 `useField`，在表单旁边调用一次。
- **把类型绑在表单对象上。**TanStack Form 的做法是 `form.Field`：字段组件是从表单对象上取出来的，自然带着 `T`。

`useForm<T>` 的 `initialValues: T`、`onSubmit(values: T)` 用泛型即可。有 schema 时，`T` 从 `z.infer` 得到（33.4 节）。

### 33.9 配置驱动的动态表单

有时字段本身来自数据：后端按租户下发设置页的字段，低代码平台让运营拖出表单。这时用一份 JSON 配置渲染：字段类型映射到控件，规则名映射到规则函数，条件显示用数据描述。

```js
const config = { fields: [
  { name: 'type',    label: '类型',   control: 'select', options: [{ value: 'p', label: '个人' }, { value: 'c', label: '公司' }] },
  { name: 'email',   label: '邮箱',   control: 'text', rules: ['required', 'email'] },
  { name: 'company', label: '公司名', control: 'text', rules: ['required', 'min:2'], showIf: { field: 'type', equals: 'c' } }
] }

const ruleLib = {
  required: () => v => (v ? '' : '必填'),
  email: () => v => (/^\S+@\S+\.\S+$/.test(v) ? '' : '邮箱格式不正确'),
  min: n => v => (String(v ?? '').length >= +n ? '' : `至少 ${n} 个字符`)
}
const parseRules = (list = []) => list.map(s => { const [name, arg] = s.split(':'); return ruleLib[name](arg) })
const compiled = config.fields.map(f => ({ ...f, parsed: parseRules(f.rules) }))   // 只解析一次
const visible = (f, values) => !f.showIf || values[f.showIf.field] === f.showIf.equals
```

```vue
<!-- FormRenderer：每个字段仍然是 33.3 节的 FormField，只是由配置生成 -->
<template v-for="f in compiled" :key="f.name">
  <FormField v-if="visible(f, form.values)" :name="f.name" :label="f.label" :rules="f.parsed" :control="controls[f.control]" />
</template>
```

实测：初始只注册 `type` 和 `email`；选成公司后，`company` 才注册。`compiled` 只解析一次，原因同 33.2 节：在模板里写 `:rules="parseRules(f.rules)"` 每次渲染都会生成新数组。

**值得用的情况：**字段来自数据，种类有限（几种控件、十几条规则），结构相似的表单很多。

**过度设计的情况：**表单是开发者自己写的，只是想少写模板。联动复杂时，条件、计算、校验越来越多地塞进配置，最后在 JSON 里发明了一门语言，既没有类型，也不能调试。这时直接写组件，复杂的部分用 `v-if` 和函数，比写配置清楚。

### 33.10 对照现成的库，以及什么时候不需要这些

本章的每个设计问题，现成的库都要回答。下面只对照思路，用法以各自的文档为准。

| 问题 | 本章 | VeeValidate | FormKit | TanStack Form（`@tanstack/vue-form`） |
|---|---|---|---|---|
| 字段怎样接入 | `useField` 或 `FormField` | `useField`、`<Field>`、`defineField` | 一个 `<FormKit>` 组件，自动汇入所属表单的节点树 | `useForm({ defaultValues, onSubmit })`，字段用 `form.Field`（作用域插槽） |
| 校验怎样声明 | 字段规则 + 表单级 schema | 字段规则，或用 `toTypedSchema` 包一层 Zod、Yup、Valibot 的 schema（当前稳定版 4.x 需要它；v5 测试版起直接接受 Standard Schema，不再需要） | 规则字符串，如 `validation="required\|email"` | 字段上的 validators；直接接受实现了 Standard Schema 的库（文档列出 Zod、Valibot、ArkType） |

对照文档能看到几个差别：TanStack Form 的 validators 区分触发时机（`onChange`、`onBlur`、`onSubmit` 和对应的异步版本），并有内置的防抖选项，本章把“何时校验”和“何时显示”拆开，思路不同但回答的是同一个问题。FormKit 提供 JSON 可序列化的 schema，用来生成表单（33.9 节）。VeeValidate 的文档列出了数组字段、异步校验和后端错误的支持。

这些差别来自同一个选择：库把哪一层做成“约定”，哪一层留给你。FormKit 把控件、标签、校验和配置渲染放进一个体系，代价是接受它的节点树。TanStack Form 的核心管状态和校验，渲染交给你：文档的快速开始里，字段只给出 `value`、`handleChange` 和 `handleBlur`。VeeValidate 同时提供组合式函数和组件两种接入方式。

**什么时候不需要这一切。**用这三条判断：

1. 字段少（五个以内）、规则都是同步的、没有可增删的数组：用第 11 章的 `reactive` + `computed` + `touched`，一个组合式函数就够。
2. 同一类问题出现在三个以上的表单里：把重复的部分提炼出来，或者直接选一个库。
3. 出现了异步校验、字段数组、条件字段、服务端字段错误里的两样以上：本章的这些问题就绕不过去，选库比自己写省力。

自己实现的价值不是替代库，而是读库的文档和源码时，知道每个选项在回答哪个设计问题。

::: pitfalls
1. 不要把同步错误存起来再手动更新。依赖别的字段的规则（确认密码）会过期。
2. 不要用下标做字段数组的 `v-for` key，也不要在数组操作后忘记搬运 `touched` 和异步、服务端错误。
3. 不要让异步校验的过期结果写入，也不要让它改 `validating`。
4. 不要把规则、选项写成模板里的内联数组。把它们放在组件外。
5. 不要在调试面板里留着 `JSON.stringify(form.values)`。它读了每个字段，每次输入都会更新。
6. 不要靠隐藏字段的卸载来清理数组项的状态。数组项由数组操作负责清理，卸载时路径可能已经指向别的项。
:::

::: selfcheck
<Sc :a="2">

下面四个表单状态，哪一个不应该作为单独的 ref 或 reactive 字段存储？

<Opt>`touched`：用户是否碰过这个字段</Opt>
<Opt>`submitCount`：点过几次提交</Opt>
<Opt>`dirty`：字段的当前值是否和初始值不同</Opt>
<Opt>`asyncErrors`：用户名检查请求返回的错误</Opt>

<template #explain>

解析：`dirty` 可以由 `values` 和 `initial` 比较得到，是派生状态，用 `computed` 或函数表示。`touched` 是历史，`submitCount` 是事件的计数，都算不出来。`asyncErrors` 是一次请求的结果，不由值直接决定。最迷惑的是 `asyncErrors`：它看起来也和值有关，但同一个值可能因为服务器状态不同而得到不同结果，所以只能存。

</template>
</Sc>

<Sc :a="2">

一个表单有 20 个字段，所有值在 `form.values` 里。每个 `Field` 只读自己路径的值，规则是组件外的常量数组。`FormPage` 的模板里还有一块调试输出：

```vue
<pre>{{ JSON.stringify(form.values) }}</pre>
<Field v-for="f in fields" :key="f.name" :name="f.name" :rules="rules" />
```

用户在第 3 个字段里输入一个字符，哪些组件会更新？

<Opt>全部 20 个 Field 和 FormPage</Opt>
<Opt>只有第 3 个 Field</Opt>
<Opt>第 3 个 Field 和 FormPage</Opt>
<Opt>只有 FormPage</Opt>

<template #explain>

解析：第 3 个 Field 读了自己的路径，会更新。`JSON.stringify(form.values)` 读了所有属性，FormPage 也依赖第 3 个字段，所以它也更新。另外 19 个 Field 的 props 没有变（规则是同一个常量数组），不更新。第一项是把 React 的“状态在父组件，子组件全部重渲染”套了过来：Vue 按属性追踪依赖，子组件的 props 没变就不更新。第二项漏掉了调试输出读了整个对象。

</template>
</Sc>

<Sc :a="0">

`kind` 选“公司”时显示字段 `<Field v-if="values.kind === 'company'" name="company" :rules="[required]">`，用户填了 `company`。然后 `kind` 改回“个人”，字段被隐藏。`useField` 没有设置 `clearOnUnmount`。此时提交，会发生什么？

<Opt>`values.company` 保留着用户填的值，校验不检查 company</Opt>
<Opt>`values.company` 变成 `undefined`，校验不检查 company</Opt>
<Opt>`values.company` 保留，但 required 规则仍然生效，提交被挡住</Opt>

<template #explain>

解析：卸载只注销字段，默认不动值，所以值保留。注销之后字段不在注册表里，它的规则不再参与 `isValid`，不会挡住提交。要不要把隐藏字段的值一起提交是产品决定，所以做成 `clearOnUnmount` 选项。第二项是设了 `clearOnUnmount` 时的结果。第三项以为规则跟着值走，实际上规则跟着注册走。

</template>
</Sc>

<Sc :a="1">

某个表单库把每个字段的校验结果存进 `errors`，并且只在该字段自己的值变化或失焦时重新校验。用户先填密码 `abc`，再填确认密码 `abd`，确认密码显示“两次输入不一致”。然后用户把密码改成 `abd`。确认密码字段的错误会怎样？

<Opt>立即消失，因为两个值现在一致</Opt>
<Opt>仍然显示，直到确认密码字段再次触发校验</Opt>
<Opt>变成密码字段的错误</Opt>

<template #explain>

解析：存下来的错误只在触发校验时更新。密码字段的值变了，触发的是密码字段的校验，确认密码字段没有被触发，它的旧结果就留在那里。本章的做法是把同步错误算出来：规则读了 `all.password`，密码变了，确认密码的错误自动重算。第一项正是“算出来”的行为，而这个库存了结果，所以没有。

</template>
</Sc>

<Sc :a="3">

给用户名检查加了 300ms 防抖。一个同事说：“有防抖就不用处理竞态了。”下面哪个场景说明他错了？

<Opt>用户连续快速输入 5 个字符，只发出 1 个请求</Opt>
<Opt>用户输入后立刻点提交，请求被防抖延迟了</Opt>
<Opt>请求失败了，需要重试</Opt>
<Opt>用户输入 ann，停顿 400ms，请求发出；请求还在路上时继续输入 anna，又发出一个请求</Opt>

<template #explain>

解析：防抖只合并间隔短于 300ms 的输入。停顿超过 300ms 后，第一个请求已经发出，用户继续输入，第二个请求又发出，两个请求同时在路上，返回顺序仍然不确定。所以要用序号或取消来保证只认最新的结果。第一项正是防抖起作用的场景。第二项是另一个问题（提交要等检查，所以 `flush` 会立即检查）。

</template>
</Sc>

<Sc :a="1">

联系人列表 `[甲, 乙, 丙]` 用下标做 `v-for` 的 key。光标在“乙”的输入框里。删除“甲”之后，光标所在的那个 DOM 输入框显示什么？

<Opt>仍然显示“乙”，因为光标在它里面</Opt>
<Opt>显示“丙”：这个 DOM 元素被复用于下标 1，现在下标 1 是丙</Opt>
<Opt>输入框被移除，光标丢失</Opt>

<template #explain>

解析：用下标做 key，key 是 0、1、2 变成 0、1，Vue 复用下标 0、1 的元素，把元素更新成显示乙和丙，最后一个元素被移除。光标所在的元素是下标 1 的元素，现在显示的是丙。如果用 id 做 key，乙的元素保留，只是移到第一个位置，光标跟着乙。第一项以为数据和元素会一起搬家。第三项被移除的是最后一个元素，不是光标所在的。

</template>
</Sc>

<Sc :a="2">

提交按钮已经写了 `:disabled="form.isSubmitting.value"`，为什么 `submit()` 开头还要写 `if (isSubmitting.value) return`？

<Opt>因为 `disabled` 的按钮仍然会触发 `submit` 事件</Opt>
<Opt>因为 `isSubmitting` 是 ref，修改后要等一个 tick 才变</Opt>
<Opt>因为 `disabled` 要等下一次渲染才生效，而函数里的检查在同一个同步段内就生效</Opt>

<template #explain>

解析：DOM 属性在下一次渲染才更新，在这之前同一个同步段内的第二次调用（例如代码连续两次调用提交）会通过按钮这一关。`isSubmitting.value = true` 立即写入，函数开头的检查立即读到。第二项说反了：ref 的值是立即改变的，延迟的是依赖它的 DOM 更新。第一项不对：禁用的提交按钮不会触发提交。

</template>
</Sc>

<Sc :a="0">

`interface Order { user: { address: { city: string } }; items: { id: number; price: number }[] }`，路径类型是 33.8 节的 `Path<Order>`。下面哪个字符串可以赋给它？

<Opt>`'items[2].price'`</Opt>
<Opt>`'items.price'`</Opt>
<Opt>`'user.address.zip'`</Opt>
<Opt>`'items[2].name'`</Opt>

<template #explain>

解析：数组项要写成 `items[下标]`，下标之后才是项的属性，`price` 在项的类型里，所以第一项可以。`items.price` 少了下标。`zip` 和 `name` 不在对应的类型里。最迷惑的是第二项：运行时 `getPath` 对 `items.price` 会得到 `undefined`，不报错，而类型会在编译期拒绝它，这就是路径类型的价值。

</template>
</Sc>

<Sc :a="1">

下面哪种情况最适合用 JSON 配置渲染表单？

<Opt>一个登录页，两个字段</Opt>
<Opt>十几个设置页，字段由后端按租户下发，控件只有文本、选择、开关三种</Opt>
<Opt>一个订单表单，价格、折扣、运费互相联动，有几十条条件</Opt>
<Opt>团队想少写模板，把所有表单都改成配置</Opt>

<template #explain>

解析：字段来自数据、种类有限、表单数量多，配置驱动才划算。登录页两个字段，写组件更直接。联动复杂的订单表单，用配置表达条件会越来越难读，最后在 JSON 里发明一门语言，应该用组件和函数。第四项是把配置当成少写代码的手段，结果把复杂度从模板挪到了更难调试的配置里。

</template>
</Sc>

:::

::: summary
- 表单状态里，历史和请求结果要存（touched、异步错误、提交计数），能由值算出来的要算（dirty、同步错误、isValid）。初始值和当前值分开存。
- 集中持有值，字段按路径读写。Vue 按属性追踪依赖，输入一个字段只更新这个字段。读整个对象、传内联数组会破坏这一点。
- 字段挂载时向表单注册，卸载时注销。条件字段的值保留还是清除，做成选项。用 useField、FormField、控件三层把逻辑和输入控件分开。
- 错误是算出来的，所以时机只剩“何时显示”：碰过或提交过之后显示，之后实时更新。字段级规则看自己，表单级规则（schema）看整个对象。Standard Schema 让表单库认一个接口就能接多种 schema 库。
- 异步校验用序号只认最新的结果，过期的结果也不能改 validating。防抖不能代替它。提交时要等进行中的检查。
- 字段数组用稳定 id 做 key，操作后搬运按路径存的状态，同步错误自动跟着走。
- 提交先防重复（同步检查），再等检查，校验失败聚焦第一个出错的字段，服务端的字段错误按同样的路径映射回字段。
- 字段路径可以写成类型，拼错在编译期就报错。配置驱动适合字段来自数据的场景。字段少、规则同步的表单，用第 11 章的写法就够。
:::
