---
title: 表单与验证
id: forms
stage: 2
chapter: 11
desc: v-model 修饰符、defineModel、校验、无障碍
---

<script setup>
import FormErrorVisibility from '../figures/11-forms/FormErrorVisibility.vue'
import DebounceTimeline from '../figures/11-forms/DebounceTimeline.vue'
import TaskForm from '../labs/11-forms/TaskForm.vue'
</script>

# 表单与验证

::: goals
<Goal checks="sc:0,sc:1">用 reactive 管理表单数据，并使用 v-model 的修饰符。</Goal>
<Goal checks="sc:3">用 defineModel 写一个可以复用的输入组件，并用 get 和 set 转换值。</Goal>
<Goal checks="sc:2,ex:formValid,ex:formRuleFill">用计算属性实现校验，并在失去焦点和提交时显示错误。</Goal>
<Goal checks="sc:4">写一个带异步校验的 useForm。</Goal>
<Goal checks="sc:5">让表单可以用屏幕阅读器和键盘操作。</Goal>

:::

::: rt
阅读主线约 14 分钟，深入内容约 2 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
表单校验像**机场安检**：每个人（字段）有自己的检查规则；没有走到安检口的人（没有碰过的字段）不需要提示；所有人都通过，才能登机（提交）。
:::

::: terms
v-model 修饰符
: .trim、.number、.lazy 等。它们处理输入的值。

校验
: 检查字段的值是否符合规则。

touched
: 记录用户是否离开过这个字段。

防抖
: 停止输入一段时间后才运行函数。

无障碍
: 让使用屏幕阅读器和键盘的用户也能操作。
:::

::: why
用户打开注册页，还没有输入就看到一排错误。用户输入年龄 18，提交的值是字符串 "18"。提交失败时，用户找不到哪个字段错了。

原因：输入框的值总是字符串。错误显示的时机没有规则。提交时也没有指出错误的字段。

本章用 v-model 修饰符转换输入值。用计算属性校验，在离开字段或提交时才显示错误。
:::

### 11.1 用 reactive 保存表单数据

表单的字段通常放在一个 reactive 对象中。这样可以一次提交、重置或复制所有字段。

```js
import { reactive } from 'vue'

const initial = () => ({ name: '', email: '', age: null, agree: false })
const form = reactive(initial())

function reset() {
  Object.assign(form, initial())       // 不能写 form = initial()。那样会丢失响应式
}

async function submit() {
  await api.register({ ...form })      // 复制一份普通对象再发送
}
```

### 11.2 用修饰符转换输入

输入框的值总是字符串，两端也可能有空格。v-model 的修饰符在写入数据之前转换它：

| 修饰符 | 作用 | 用途 |
|---|---|---|
| `.lazy` | 监听 change 事件，不监听 input 事件。失去焦点或按回车时才更新数据。 | 减少更新次数 |
| `.number` | 用 parseFloat 转换为数字。转换失败时，保留原来的字符串。 | 数字输入 |
| `.trim` | 删除两端的空格 | 用户名、邮箱 |

```html
<input v-model.trim="form.email">
<input v-model.number="form.age">                 <!-- 输入框为空时，值是 '' -->
<input v-model.lazy.trim="form.nickname">          <!-- 修饰符可以组合 -->
<input type="number" v-model="form.age">           <!-- type="number" 自动按 .number 处理 -->
```

输入中文时，v-model 在拼音阶段不更新数据。用户选择汉字后，数据才更新。需要在拼音阶段也搜索时，用 `:value` 和 `@input` 代替 v-model。

::: deep v-model 怎样处理修饰符和中文输入法
原生元素上的 v-model 编译为一个内置指令，例如 `vModelText`。它的核心代码如下：

```js
// runtime-dom/src/directives/vModel.ts（简化）
const vModelText = {
  created(el, { modifiers: { lazy, trim, number } }, vnode) {
    el[assignKey] = getModelAssigner(vnode)            // 写回数据的函数
    const castToNumber = number || vnode.props?.type === 'number'
    addEventListener(el, lazy ? 'change' : 'input', e => {
      if (e.target.composing) return                   // 输入法组合中：不更新
      let v = el.value
      if (trim) v = v.trim()
      if (castToNumber) v = looseToNumber(v)
      el[assignKey](v)
    })
    if (!lazy) {
      addEventListener(el, 'compositionstart', e => { e.target.composing = true })
      addEventListener(el, 'compositionend', e => {
        e.target.composing = false
        e.target.dispatchEvent(new Event('input'))     // 组合结束：手动触发一次 input
      })
    }
  },
  beforeUpdate(el, { value }) {
    if (el.value !== String(value ?? '')) el.value = value ?? ''   // 数据改变时更新 DOM
  }
}
```

这段代码说明了三件事：

1. v-model 在 created 中添加监听。所以它先于用户的监听运行。
2. 输入法组合期间，数据不改变。组合结束后才改变。
3. .trim 和 .number 在写回数据之前处理值。
:::

### 11.3 用 defineModel 写可以复用的输入组件

每个字段都有标签、输入框和错误信息。把它们放在一个组件中。用 `defineModel()`（3.4+）让组件支持 v-model。defineModel 的基础见 [第 5 章](/chapters/05-comm)。

```vue
<!-- BaseInput.vue -->
<script setup>
import { useId } from 'vue'

const model = defineModel()                 // 3.4+：父组件的 v-model 绑定到这里
const props = defineProps({ label: String, error: String })
const id = useId()                           // 3.5+：生成唯一的 id，服务端和客户端一致
defineOptions({ inheritAttrs: false })       // 透传属性放在 input 上，不放在根元素上（第 5.3 节）
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }}</label>
    <input
      :id="id"
      v-model="model"
      v-bind="$attrs"
      :aria-invalid="!!error"
      :aria-describedby="error ? id + '-err' : undefined"
    >
    <p v-if="error" :id="id + '-err'" class="err">{{ error }}</p>
  </div>
</template>
```

```html
<!-- 使用：type、placeholder 等属性通过 $attrs 传给 input -->
<BaseInput v-model.trim="form.email" label="邮箱" type="email" :error="errors.email" />
```

组件上的 `.trim` 和 `.number` 自动生效。原因：Vue 在 emit `update:modelValue` 时处理它们。自定义修饰符（例如 `.capitalize`）要组件自己处理，写法见 [第 5 章](/chapters/05-comm)。

父组件保存的格式和输入框显示的格式不同时，用 defineModel 的 `get` 和 `set` 选项转换。get 在读取时转换。set 在写给父组件之前转换。这和 [第 4 章](/chapters/04-computed)的可写 computed 是同一个思路。

**场景：标签输入框显示逗号分隔的文字，存储数组。**父组件保存 `['前端', '紧急']`。输入框显示 `前端, 紧急`。

```vue
<!-- TagInput.vue -->
<script setup>
const tags = defineModel({
  default: () => [],
  get: arr => arr.join(', '),
  set: s => s.split(',').map(t => t.trim()).filter(Boolean)
})
</script>
<template><input v-model.lazy="tags" placeholder="用逗号分隔"></template>

<!-- 使用：<TagInput v-model="task.tags" /> -->
```

内部的 input 使用 .lazy，失去焦点时才转换。不用 .lazy 时，get 会马上删除用户刚输入的逗号。

不要用 watch 把 props 复制到本地 ref，再用另一个 watch 写回父组件。两个 watch 容易互相触发。用 get 和 set 在一处完成转换。

### 11.4 用计算属性校验

错误信息是从表单数据计算出来的。所以用计算属性实现校验：

```js
const errors = computed(() => {
  const e = {}
  if (!form.name) e.name = '请输入用户名'
  else if (form.name.length < 3) e.name = '用户名至少 3 个字符'
  if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = '邮箱格式不正确'
  return e
})
const valid = computed(() => Object.keys(errors.value).length === 0)
```

用户还没有输入时，不要显示错误。用 `touched` 记录用户离开过的字段：

```js
const touched = reactive({})
const submitted = ref(false)
const show = field => (touched[field] || submitted.value) && errors.value[field]

// 模板
// <input v-model="form.name" @blur="touched.name = true">
// <p v-if="show('name')">{{ errors.name }}</p>
```

下图说明错误在什么时候显示。

<Figure caption="错误从表单数据计算出来。只有字段有错误，并且用户离开过它或已经提交时，才显示错误。">
<FormErrorVisibility />
</Figure>

常用的显示时机如下：

1. 字段失去焦点后，显示这个字段的错误。
2. 显示错误后，用户每次输入都重新校验。
3. 点击提交时，显示所有字段的错误。

<Exercise id="formRuleFill" />

<Exercise id="formValid" />

### 11.5 写一个 useForm

把规则、touched 和错误放在一个组合式函数中。每条规则是一个函数。它返回错误信息，或者返回 true：

```js
// rules.js
export const required = (msg = '必填') => v => (v !== '' && v != null) || msg
export const minLength = n => v => String(v).length >= n || `至少 ${n} 个字符`
export const email = () => v => /^\S+@\S+\.\S+$/.test(v) || '邮箱格式不正确'

// useForm.js
import { reactive, computed, ref } from 'vue'

export function useForm(initial, rules) {
  const values = reactive({ ...initial })
  const touched = reactive({})
  const serverErrors = reactive({})           // 服务器返回的错误
  const submitted = ref(false)

  const errors = computed(() => {
    const out = {}
    for (const [field, list] of Object.entries(rules)) {
      for (const rule of list) {
        const r = rule(values[field], values)   // 第二个参数：用于“确认密码”等规则
        if (r !== true) { out[field] = r; break } // 只显示第一个错误
      }
      if (!out[field] && serverErrors[field]) out[field] = serverErrors[field]
    }
    return out
  })
  const valid = computed(() => Object.keys(errors.value).length === 0)
  const errorOf = f => (touched[f] || submitted.value) ? errors.value[f] : ''

  return { values, touched, errors, serverErrors, submitted, valid, errorOf }
}
```

**场景：检查“已有同名任务”。**这要请求服务器。用户每输入一个字就请求，浪费资源。下面的侦听器等待 400ms，并取消过期的请求：

```js
import { watch, onWatcherCleanup } from 'vue'

const checking = ref(false)
watch(() => values.text, text => {
  delete serverErrors.text
  if (text.length < 3) return
  const controller = new AbortController()
  const timer = setTimeout(async () => {          // 防抖：停止输入 400ms 后才请求
    checking.value = true
    try {
      const res = await fetch(`/api/tasks/exists?text=${encodeURIComponent(text)}`, { signal: controller.signal })
      if ((await res.json()).exists) serverErrors.text = '已有同名任务'
    } catch (e) {
      if (e.name !== 'AbortError') throw e
    } finally {
      checking.value = false
    }
  }, 400)
  onWatcherCleanup(() => {                         // 3.5+：下次运行前或侦听器停止时调用
    clearTimeout(timer)                            // 用户继续输入：取消计时
    controller.abort()                             // 请求已发出：取消请求
  })
})
```

下图按时间顺序显示输入和请求。

<Figure caption="每次输入都取消上一次的计时。用户停止输入 400ms 后，才发出一次请求。">
<DebounceTimeline />
</Figure>

onWatcherCleanup 同时实现了防抖和取消请求。旧请求的结果不会覆盖新的结果。

<Lab id="demo-form-reg" title="实验台：任务表单 TaskForm" note="运行真实的 Vue">
<template #predict>
<Sc predict :a="2">

先猜：任务表单在你输入任务时，向服务器检查是否已有同名任务。你在 1 秒内连续输入 b、u、i、l、d。日志中“请求服务器”出现几次？

<Opt>5 次，每个字符一次</Opt>
<Opt>3 次，检查 bui、buil、build</Opt>
<Opt>1 次，只检查 build</Opt>

<template #explain>

解析：代码在输入停止 400ms 后才发请求。新的输入通过 onWatcherCleanup 取消上一次等待。少于 3 个字符时，代码不检查。所以 bui 和 buil 的等待被取消，只有 build 的请求发出。“5 次”忽略了取消和 3 个字符的下限。“3 次”忽略了取消。打开实验台，在“任务”中快速输入 build。数日志中“请求服务器”的行数。

</template>
</Sc>
</template>

<TaskForm />
</Lab>

在实验台中试一试下面的操作：

1. 在“任务”中快速输入 build。观察日志中取消的计时。
2. 不填写任何字段，点击“保存”。第一个错误的字段获得焦点。
3. 任务填写“写测试”，截止日期填写 2020-01-01，然后保存。服务器的错误显示在截止日期下面。

::: deep 校验库
表单多并且复杂时，使用校验库。常用的组合是 VeeValidate 和 schema 库，例如 zod 或 valibot：

```js
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'

const schema = toTypedSchema(z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(8, '至少 8 个字符'),
}))

const { errors, defineField, handleSubmit, isSubmitting } = useForm({ validationSchema: schema })
const [email, emailAttrs] = defineField('email')        // email 是 ref；emailAttrs 包含 onBlur 等
const [password, passwordAttrs] = defineField('password')

const onSubmit = handleSubmit(async values => {          // 校验通过后才调用。values 有类型
  await api.login(values)
})
// 模板：<input v-model="email" v-bind="emailAttrs"> <p>{{ errors.email }}</p>
```

schema 可以同时用于前端和 Node.js 后端。两端的规则保持一致。

FormKit 是另一种选择。它提供带标签、校验和错误信息的输入组件：

```html
<FormKit type="form" @submit="register">
  <FormKit type="email" name="email" label="邮箱" validation="required|email" />
  <FormKit type="password" name="password" label="密码" validation="required|length:8" />
</FormKit>
```

只有几个字段时，本章的 useForm 已经足够。先理解原理，再选择库。
:::

### 11.6 提交

提交函数要处理 5 件事：

1. 用 `@submit.prevent` 阻止页面刷新。
2. 校验失败时，聚焦第一个错误字段。
3. 请求期间禁用按钮，防止重复提交。
4. 把服务器返回的字段错误显示在字段下面。
5. 在 finally 中恢复按钮。

```js
const loading = ref(false)
const formEl = useTemplateRef('formEl')

async function onSubmit() {
  submitted.value = true
  if (!valid.value) {
    const first = Object.keys(errors.value)[0]
    formEl.value.elements[first]?.focus()          // 用 name 属性找到第一个错误的字段
    return
  }
  loading.value = true
  try {
    await api.addTask({ ...values })
    router.push('/')
  } catch (e) {
    // 假设服务器返回 422 和 { errors: { due: '截止日期不能早于今天' } }
    if (e.status === 422) Object.assign(serverErrors, e.data.errors)
    else formError.value = '网络错误，请稍后再试'
  } finally {
    loading.value = false
  }
}
// 模板：<form ref="formEl" @submit.prevent="onSubmit" novalidate>
//        <button :disabled="loading">{{ loading ? '保存中…' : '保存' }}</button>
```

不要在表单无效时禁用提交按钮。禁用的按钮不能获得焦点，用户也不知道哪里有错误。让用户点击，然后显示所有错误。

`novalidate` 关闭浏览器自带的提示。这样所有的错误使用同一种样式。

### 11.7 无障碍

| 要求 | 写法 |
|---|---|
| 每个输入框都有标签 | `<label for="id">` 和 `<input id="id">` |
| 告诉屏幕阅读器字段无效 | `:aria-invalid="!!error"` |
| 把错误信息和字段关联 | `aria-describedby` 指向错误信息的 id |
| 读出新出现的错误 | 错误汇总区域使用 `role="alert"` 或 `aria-live="polite"` |
| 键盘用户找到错误 | 提交失败时，聚焦第一个错误的字段 |

用 `useId()`（3.5+）生成 id。同一个组件使用多次时，id 也不重复。11.3 节的 BaseInput 已经按这张表写。

<Exercise id="phenoClip" />

<Exercise id="phenoTheme" />

::: pitfalls
1. 不要给 reactive 表单变量重新赋值。用 `Object.assign` 重置字段。原因：模板仍使用旧对象，页面不更新。
2. 不要在用户输入之前显示错误。使用 touched 和 submitted 控制显示时机。原因：用户还没输入就看到错误，会觉得烦。
3. 不要只依靠前端校验。服务器必须再次校验所有数据。原因：用户可以绕过页面，直接向服务器发送请求。
4. 不要只用 placeholder 作为标签。原因：用户输入后，placeholder 消失。用户不再知道这个字段要填什么。
5. 异步校验要防抖并取消过期请求。用 onWatcherCleanup 同时做这两件事。否则每输入一个字都发送请求，旧结果还可能覆盖新结果。
:::

::: selfcheck
<Sc :a="2">

输入框写作 `<input v-model.number="age">`。用户先输入 12abc，再改为 abc。age 依次是什么？

<Opt>'12abc'，然后 'abc'</Opt>
<Opt>12，然后 NaN</Opt>
<Opt>12，然后 'abc'</Opt>
<Opt>NaN，然后 NaN</Opt>

<template #explain>

解析：.number 用 parseFloat 转换。parseFloat('12abc') 是 12。'abc' 不能转换，所以保留原来的字符串。校验时不要假设 age 一定是数字。

</template>
</Sc>

<Sc :a="1">

调用 `reset()` 后，输入框中的旧文字还在。原因是什么？

```js
setup() {
  let form = reactive({ name: '' })
  function reset() {
    form = reactive({ name: '' })
  }
  return { form, reset }
}
```

<Opt>reactive 不能保存字符串</Opt>
<Opt>模板仍然使用旧的对象。应该用 Object.assign 修改字段</Opt>
<Opt>缺少 await nextTick()</Opt>

<template #explain>

解析：setup 返回时，模板得到旧对象的引用。给变量赋新对象，不改变模板使用的对象。用 Object.assign(form, initial()) 修改原对象的字段。

</template>
</Sc>

<Sc :a="0">

用户名为空，errors.name 是 '请输入用户名'。用户还没有离开过这个输入框，也没有提交。`show('name')` 返回什么？

```js
const show = f => (touched[f] || submitted.value) && errors.value[f]
```

<Opt>false</Opt>
<Opt>'请输入用户名'</Opt>
<Opt>true</Opt>

<template #explain>

解析：touched.name 和 submitted 都是假值。括号中的结果是 false。&& 左边是 false，结果就是 false。用户离开输入框后，touched.name 变为 true，错误才显示。

</template>
</Sc>

<Sc :a="2">

子组件中写 `const model = defineModel()`。父组件写 `<TextField v-model="name" />`。子组件执行 `model.value = 'Tom'`。结果是什么？

<Opt>只有子组件的副本变为 Tom</Opt>
<Opt>赋值无效，props 是只读的</Opt>
<Opt>父组件的 name 变为 Tom</Opt>

<template #explain>

解析：defineModel 声明 `modelValue` prop 和 `update:modelValue` 事件。给 `model.value` 赋值时，Vue 发出 update:modelValue。父组件的 v-model 收到事件，修改 name。新值再通过 prop 传回子组件。所以这不是本地副本，也不是直接给 props 赋值。

</template>
</Sc>

<Sc :a="2">

使用 11.5 节的任务侦听器。它在停止输入 400ms 后请求，清理函数清除计时。用户每隔 100ms 输入一个字母，输入 build 后停止。一共发出几次请求？

<Opt>3 次</Opt>
<Opt>5 次</Opt>
<Opt>1 次</Opt>
<Opt>0 次</Opt>

<template #explain>

解析：前两个字母不满 3 个字符，侦听器直接返回。之后每次输入都让侦听器再运行。运行之前，Vue 调用上一次的清理函数，清除还没有到时间的计时。所以 bui 和 buil 的计时都被清除。只有 build 等满 400ms，所以只发 1 次。最后一次运行没有被清理，所以不是 0 次。

</template>
</Sc>

<Sc :a="0">

输入框下面显示了错误信息。但是屏幕阅读器的用户聚焦输入框时，听不到这条错误。最可能缺少什么？

<Opt>aria-describedby 指向错误的 id</Opt>
<Opt>输入框上的 aria-invalid="true"</Opt>
<Opt>用 placeholder 显示错误信息</Opt>

<template #explain>

解析：aria-describedby 把错误信息和字段关联。所以阅读器读出字段时，也读出错误。aria-invalid 只说明字段无效，不读出错误的内容。placeholder 在用户输入后消失，不能代替错误信息。

</template>
</Sc>

<Sc :a="1">

回顾（第 8 章）：表单的第一个输入框写 `<input v-focus>`。v-focus 只有 mounted 钩子，在其中调用 `el.focus()`。用户把焦点移到别的输入框，然后提交失败，表单重新渲染。焦点会回到第一个输入框吗？

<Opt>会，每次重新渲染都运行 mounted</Opt>
<Opt>不会，mounted 只在元素插入时运行</Opt>
<Opt>会，v-focus 跟踪表单的错误</Opt>

<template #explain>

解析：第 8 章：mounted 只在元素插入 DOM 后运行一次。组件重新渲染时，Vue 复用元素。这时只运行 beforeUpdate 和 updated，不运行 mounted。所以焦点不回来。指令也不知道表单的错误。提交失败时，用 11.6 节的做法：找到第一个错误字段，调用它的 `focus()`。

</template>
</Sc>

:::

::: summary
- 表单数据放在 reactive 对象中。修饰符 .trim、.number、.lazy 转换输入。
- defineModel 让自定义输入组件支持 v-model。get 和 set 在显示格式和存储格式之间转换。
- 错误是计算属性。touched 和 submitted 决定何时显示。
- useForm 集中管理规则和错误。异步校验用 onWatcherCleanup 防抖并取消请求。
- 提交时禁用重复提交，映射服务器错误，并聚焦第一个错误字段。
- 每个字段有 label，错误用 aria-describedby 关联。
:::
