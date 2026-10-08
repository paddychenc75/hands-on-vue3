---
title: 可复用 API 的设计
id: api-design
stage: 6
chapter: 35
desc: 组合式函数的契约，受控与非受控，无渲染的三层，键盘与无障碍，API 的演进
---

<script setup>
import HeadlessLayers from '../figures/35-api-design/HeadlessLayers.vue'
import PatListbox from '../labs/35-api-design/PatListbox.vue'
</script>

# 可复用 API 的设计

::: goals
<Goal checks="sc:0,sc:1">说明组合式函数在输入、输出、清理和服务端渲染上的约定。</Goal>
<Goal checks="sc:2,ex:useControllable">区分受控与非受控，并写出同时支持两种用法的状态。</Goal>
<Goal checks="sc:3,ex:useListbox">把一个控件拆成三层，并实现键盘导航和 ARIA 属性。</Goal>
<Goal checks="sc:4,sc:5">判断一次 API 改动是不是破坏性变化，并选择平滑过渡的做法。</Goal>

:::

::: rt
阅读主线约 15 分钟，深入内容约 2 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
好的 API 像**墙上的插座**：形状和电压一旦公布，任何电器都能插上用。你不能今天悄悄把插孔改成另一种形状，因为已经插在上面的电器会一起坏。
:::

::: terms
契约
: 调用方可以依赖的参数、返回值和副作用规则。

受控组件
: 状态由父组件持有的组件。组件只显示它，并通过事件请求修改。

非受控组件
: 状态由组件自己持有的组件。

`aria-activedescendant`
: 真实焦点留在容器上，用这个属性指向当前高亮的子项。

roving tabindex
: 同一时刻只有一个子项的 tabindex 是 0，方向键移动这个位置，并把真实焦点移过去。

破坏性变化
: 让旧代码不能正常运行的版本改动。
:::

::: why
你写了一个组合式函数或组件，同事开始用它，后来别的项目也用了它。参数怎么接、状态归谁、键盘怎么响应、改动会不会弄坏别人的代码，这些决定的是 API 的质量。

原因：发布之后，使用者会依赖你的每一个细节，包括你没打算承诺的那些。

本章讲写给别人用的 API：组合式函数的契约、受控与非受控、无渲染组件的三层、键盘与焦点，以及 API 怎样演进而不弄坏使用者。应用内部怎样拆分和组合组件，见[第 34 章](/chapters/34-patterns)。
:::

### 35.1 组合式函数的契约

组合式函数的参数、返回值和副作用规则，是调用方可以依赖的**契约**。契约发布之后，改动它就是破坏性变化（35.5 节）。[第 8 章](/chapters/08-composables)给出了写法。这里讲每条规则为什么这样定。

下面是一个守约的组合式函数：给目标元素添加事件监听。

```ts
import { toValue, watch, type MaybeRefOrGetter } from 'vue'

export function useEventListener(
  target: MaybeRefOrGetter<EventTarget | null | undefined>,   // 输入：ref、getter 或元素都行
  type: string,
  handler: (e: Event) => void                                  // 回调本身是函数，不标成 MaybeRefOrGetter
): () => void {                                                // 输出：只有一个动作，直接返回 stop 函数
  return watch(
    () => toValue(target),                                      // 在 getter 里读，目标变了才会重新运行
    (el, _old, onCleanup) => {
      if (!el) return                                           // 元素还没挂载，或者已经卸载
      el.addEventListener(type, handler)
      onCleanup(() => el.removeEventListener(type, handler))   // 换目标、调用 stop、组件卸载时都清理
    },
    { immediate: true, flush: 'post' }                          // 模板引用要等 DOM 更新之后才有值
  )
}

// 组件里：<div ref="box">
const box = useTemplateRef('box')
useEventListener(box, 'click', onClick)
```

在 Vue 3.5.43 中实测：点击 `box` 时 `onClick` 运行一次。调用 stop 之后不再运行。传入 getter `() => (flag.value ? a.value : b.value)` 切换目标后，旧元素的监听被移除。组件卸载后，监听也被移除。

**输入：用 `MaybeRefOrGetter<T>`，并且在响应式环境里读取。**

- 会随时间变化的参数，类型写成 `MaybeRefOrGetter<T>`（3.3+）。调用方可以传普通值、ref 或 getter。
- 用 `toValue()` 读取，并且要读在 `watch` 的 getter 或 `watchEffect` 里。上例如果改成在函数开头写 `const el = toValue(target)`，setup 时 `box.value` 还是 null，监听器永远不会添加。
- 不要把 `toValue` 用在本身就是函数的参数上，例如回调。`toValue(fn)` 会调用 `fn`，得到的是它的返回值。
- 不要把普通值直接交给 `watch`。`watch(5, …)` 会得到 “Invalid watch source” 警告。写成 `watch(() => toValue(x), …)`。

**输出：返回由 ref 组成的普通对象。**

- 不要返回 `reactive` 对象。调用方解构它，得到的是普通数字，和源对象的连接断开了：`let { n } = reactive({ n: ref(0) })` 之后 `n` 是 `0`，不是 ref。返回 ref 对象时，调用方可以解构，也可以用 `reactive(useX())` 得到属性访问。
- 只有一个动作，就直接返回这个动作，例如上面的 stop 函数。
- 命名：函数以 `use` 开头。状态用名词（`items`、`position`），布尔值用 `isXxx`，动作用动词（`start`、`reset`）。
- 需要校验的状态返回可写 computed，只读的状态返回 `readonly`。写法见第 8 章。

**副作用：清理放进 `onScopeDispose`。**

- `onScopeDispose` 在组件卸载时运行，也在 `effectScope().stop()` 时运行。`onUnmounted` 只在组件里有效。
- `watch` 和 `watchEffect` 随所在的作用域一起停止，不用手写清理。`computed` 不登记在作用域里，也不需要停止：没有订阅者时它不挂在依赖上。上面的函数只靠 `watch` 的 `onCleanup`，没有写 `onScopeDispose`。
- 子作用域跟着父作用域停止。组件里创建的 `effectScope()`，在组件卸载时一起停止。

**环境：把能在哪里调用写进文档。**

- 只能在 setup 或 `effectScope().run()` 里同步调用。在别处调用，`onScopeDispose` 和 `onMounted` 都会得到警告，回调不会注册（实测）。
- 在服务端渲染（第 36 章）中，`onMounted` 和 `onUnmounted` 不运行，`onScopeDispose` 注册的回调在渲染结束后也没有被调用。所以在 setup 顶层启动的定时器、事件监听永远不会被清理。把启动副作用放进 `onMounted`，或者像上例那样放进 `watch`：服务端的模板引用是 null，回调什么也不做。
- 不要在函数顶层访问 `window` 和 `document`。服务端没有它们。

::: deep 契约清单
发布一个组合式函数之前，对着下面五问各回答一遍：

1. 每个参数能不能是 ref 或 getter？不能的，写进文档。
2. 返回值解构之后还有响应性吗？
3. 创建了什么副作用？谁在什么时候清理它？
4. 在组件之外调用会怎样？
5. 在服务端渲染时会怎样？

五问答不出来的组合式函数，使用者要靠试才知道怎么用。
:::

### 35.2 受控与非受控

一个组件的状态可以由两个角色持有：

- **非受控组件**：状态在组件自己里面。父组件不关心，或者只在需要时通过事件得知。
- **受控组件**：状态在父组件里。组件只显示它，并通过事件请求修改。父组件决定接不接受。

原生的 `<input>` 两种用法都支持：只写 `value` 加 `onInput` 就是受控，不写 `value` 就是非受控。设计一个组件时，要先决定它支持哪一种。

Vue 的 `defineModel` 已经替你做了大部分工作。它判断“受控”的依据不是值，而是**父组件有没有同时传入这个 prop 和对应的更新监听**（`v-model` 会两个都传）。`defineModel` 编译后调用的是 `useModel`。在 3.5.43 中用它实测了五种情况：

| 父组件的写法 | 子组件写入 `model.value = 'x'` 之后 | 说明 |
|---|---|---|
| 什么也不传 | 子组件显示 `x` | 非受控，状态在子组件里 |
| `v-model="a"` | 子组件显示 `x`，`a` 变成 `x` | 受控，父组件接受了 |
| `:model-value="a"`，没有监听 | 子组件显示 `x`，`a` 不变；`a` 下次改变时被覆盖 | 没有监听，按非受控处理 |
| `:model-value="a"` 加 `@update:model-value`，监听里什么也不做 | 子组件仍显示 `a` | 受控，父组件拒绝了 |
| `v-model` 绑定的值是 `undefined`，子组件有 `default` | 子组件显示 `default`，父组件的值仍是 `undefined` | 父子不一致 |

最后一行是陷阱：`default` 只补子组件看到的值，不会写回父组件。受控时，让父组件自己给初值。`null` 是一个真正的值：父组件传 `null`，子组件得到 `null`，不套用 `default`。

组合式函数里没有 vnode 可看，不能用“有没有传监听”判断。常见的约定是看值：`toValue(modelValue) !== undefined` 就是受控，和 React 的 `value` 一样。这个约定有一个坑：`undefined` 既可能是“没选”，也可能是“非受控”。解决办法是约定 **`null` 表示“受控，但没有选中”**。35.3 的 `useListbox` 就这样约定。

要同时支持两种用法，要付出这些代价：

1. **测试矩阵翻倍。**每个行为要在两种模式下各测一次。
2. **模式切换。**父组件把受控的值改成 `undefined`，组件会悄悄变成非受控，显示 `default`，状态丢失。（实测：`v-model` 的值从 `'p'` 改成 `undefined`，子组件显示 `default`。）
3. **两个状态来源。**组件内部必须小心，永远从同一个地方读当前值。

所以先问：使用者需要在组件外读取或修改这个值吗？需要，只做受控。完全不需要，只做非受控。表单控件通常只做受控，用 `v-model`。折叠面板的展开状态这类“多数使用者不关心”的状态，才值得两种都支持。

<Exercise id="useControllable" />

### 35.3 无渲染组件的三层

把一个 Listbox（选项列表，用键盘选一项）做成可复用的零件。使用者各不相同：有人要竖排的列表，有人要横排的按钮，有人要完整的下拉框。只做一个组件，标记要么写死，要么靠无数个插槽。更好的做法是分三层，每一层只依赖下一层：

<Figure caption="第 1 层只有状态和行为。第 2 层把它包成不渲染元素的组件，通过作用域插槽交出状态和绑定对象。第 3 层加上标记和样式。越往下，使用者的自由度越大。">
<HeadlessLayers />
</Figure>

**第 1 层：`useListbox`，状态与行为的组合式函数。**它管选中项、高亮项和键盘，不输出任何标记。它返回两样东西：状态，和给标记用的**绑定对象**。

```ts
const { selected, active, listboxProps, optionProps } = useListbox({
  options,                        // MaybeRefOrGetter：选项数组，每项有 value、label、disabled
  modelValue: () => props.value,  // 传了就是受控，undefined 表示非受控（35.2）
  defaultValue: 'banana',         // 非受控的初值
  onChange: v => emit('change', v)
})
```

```vue
<!-- 使用者自己写标记，把绑定对象 v-bind 上去 -->
<ul v-bind="listboxProps">
  <li v-for="(o, i) in options" :key="o.value" v-bind="optionProps(i)">{{ o.label }}</li>
</ul>
```

`listboxProps` 里是容器需要的 `role`、`tabindex`、`aria-activedescendant` 和 `onKeydown`。`optionProps(i)` 里是第 i 个选项需要的 `id`、`role`、`aria-selected` 和 `onClick`。这个做法叫**属性 getter**：组合式函数不知道标记长什么样，只负责交出“这个元素该有哪些属性”。`v-bind` 的对象能合并：使用者自己写的 `class` 和 `@click` 会和绑定对象里的一起生效（实测：两个点击处理都运行，class 合并）。

**第 2 层：`ListboxRoot`，无渲染组件。**它自己不渲染任何元素。状态由 `defineModel` 持有，通过作用域插槽交给使用者。

```vue
<!-- ListboxRoot.vue -->
<script setup lang="ts">
const props = defineProps<{ options: ListboxOption[] }>()
const model = defineModel<string | null>()

const lb = useListbox({
  options: () => props.options,
  modelValue: () => model.value ?? null,   // 状态归 defineModel；null 表示“受控，没选”
  onChange: v => { model.value = v }
})
</script>
<template>
  <slot :selected="lb.selected.value" :active="lb.active.value"
        :listboxProps="lb.listboxProps.value" :optionProps="lb.optionProps" />
</template>

<!-- 使用 -->
<ListboxRoot v-model="fruit" :options="options" v-slot="{ listboxProps, optionProps }">
  <ol v-bind="listboxProps">
    <li v-for="(o, i) in options" :key="o.value" v-bind="optionProps(i)">{{ o.label }}</li>
  </ol>
</ListboxRoot>
```

注意 `model.value ?? null`。`defineModel` 决定谁持有状态，所以传给第 1 层时总是写成“受控”，第 1 层里就不会再有第二份状态。

**第 3 层：`StyledSelect`，带样式的组件。**它用第 2 层，加上标记、样式，和一两个插槽。

```vue
<!-- StyledSelect.vue -->
<template>
  <ListboxRoot v-model="model" :options="options" v-slot="{ listboxProps, optionProps, selected }">
    <ul class="sel" v-bind="listboxProps">
      <li v-for="(o, i) in options" :key="o.value" class="sel-opt" v-bind="optionProps(i)">
        <slot name="option" :option="o" :selected="o.value === selected">{{ o.label }}</slot>
      </li>
    </ul>
  </ListboxRoot>
</template>
```

每一层给使用者留下的自由度不同：

| 层 | 使用者拿到的 | 使用者能决定 | 使用者不能决定 |
|---|---|---|---|
| 1 `useListbox` | 状态和绑定对象 | 标记、元素类型、样式；可以在组件之外使用 | 键盘规则和 ARIA 属性（只能额外覆盖） |
| 2 `ListboxRoot` | 同样的内容，经作用域插槽 | 标记、样式 | 必须写在模板里；多一个组件实例 |
| 3 `StyledSelect` | props 和 `#option` 插槽 | 每个选项里放什么 | 容器的标记和结构 |

两条规则让这套结构不会变乱。第一，**上层只通过公开 API 用下层**，不读下层的内部变量。第二，**键盘和 ARIA 只在第 1 层写一遍**，上层不重复。这样第 2、3 层的错误不会影响行为，第 1 层的修复自动传给所有使用者。

代价也要承认：三层意味着三份公开 API 要维护。只有一个使用场景时，不要拆。

<Lab id="demo-pat-listbox" title="实验台：同一个 useListbox 的三层实现" note="运行真实的 Vue；同时展示受控与非受控、键盘与焦点">
<template #predict>
<Sc predict :a="1">

先猜：选择“受控，父组件拒绝樱桃”。让第 3 层的列表获得焦点，按两次 ↓，高亮移到“樱桃”，再按 Enter。第 3 层的列表会怎样？

```js
// 父组件
function onUpdate(v) { if (v !== 'cherry') parent.value = v }
// <StyledSelect :model-value="parent" @update:model-value="onUpdate" />
```

<Opt>“樱桃”被选中，因为组件收到了 Enter</Opt>
<Opt>列表不变：显示的是父组件的值，父组件没有改</Opt>
<Opt>“樱桃”先被选中，随后恢复原值</Opt>

<template #explain>

解析：受控时，组件显示的永远是父组件传入的值。按 Enter 只是请求修改，通过 `update:modelValue` 交给父组件。父组件拒绝，传入的值没变，列表就不变。第一项以为组件会自己保存选中项，那是非受控的行为。第三项以为存在一个“先变后恢复”的过程，实际上组件从来没有自己改过。打开实验台，在三种模式下各按一次，看日志里“父组件拒绝”的那一行。

</template>
</Sc>
</template>

<PatListbox />
</Lab>

实验台的日志每次按键写一行：按下的键、当前获得焦点的元素，以及它的 `aria-activedescendant` 指向哪个选项。三层的键盘行为完全一样，因为它们用的是同一个 `useListbox`。

### 35.4 键盘与焦点：无障碍的最低要求

键盘和焦点要写进 API，不能留给使用者自己补。表单的标签、`aria-invalid` 和 `aria-describedby` 见 [12.7 节](/chapters/12-forms)。这里只讲交互控件的键盘、焦点和角色。

**最低要求有五条：**

1. **能用键盘到达。**整个控件在 Tab 键顺序里只占**一个**停靠点。一组 10 个选项，按一次 Tab 进入，再按一次 Tab 离开，选项之间用方向键移动。
2. **方向键移动，Home 和 End 跳到两端。**到头之后怎么办由控件的模式决定：W3C 的 ARIA 实践指南（APG）对列表框（listbox）没有要求循环，本章的 useListbox 到头停住；标签页（tabs）的左右键则要求循环，下面的 Tabs 示例就是这样。disabled 的选项要跳过。
3. **Enter 和空格确认。**处理过的按键调用 `preventDefault()`，否则方向键和空格会让页面滚动。
4. **角色和状态写在 DOM 上。**容器 `role="listbox"`，选项 `role="option"`，选中项 `aria-selected="true"`，不可用项 `aria-disabled="true"`。屏幕阅读器靠这些属性读出“列表，第 2 项，已选中”。
5. **焦点看得见。**不要去掉 `:focus-visible` 的轮廓，换成同样显眼的样式。

“只占一个停靠点”有两种做法，选择取决于**真实焦点要不要离开容器**。

| 做法 | 怎么做 | 适用 |
|---|---|---|
| `aria-activedescendant` | 真实焦点留在容器上，容器的 `aria-activedescendant` 指向“当前高亮”的选项 id | 焦点必须留在原处：combobox 的输入框要一边输入一边选；选项里没有可聚焦的内容 |
| roving tabindex | 当前项 `tabindex="0"`，其他项 `tabindex="-1"`；方向键改变这个分配，并调用该项的 `focus()` | 选项本身是按钮或链接；需要浏览器的原生焦点行为，例如标签页 |

useListbox 用第一种。它的好处是焦点不动，只有一个元素在接收键盘事件。代价有两点：选项必须有页面内唯一的 `id`（用 `useId()` 生成，见 12.3 节），高亮项滚出可视区域时要自己调用 `scrollIntoView({ block: 'nearest' })`，因为浏览器只会替真实焦点滚动。

第二种做法的 Tabs 示例：

```vue
<script setup>
import { ref, nextTick } from 'vue'
const items = ['资料', '安全', '通知']
const active = ref(0)
const btns = []                                       // 按下标收集元素，不依赖 v-for 里 ref 数组的顺序

function onKeydown(e) {
  const n = items.length
  const next = { ArrowRight: (active.value + 1) % n, ArrowLeft: (active.value + n - 1) % n,
                 Home: 0, End: n - 1 }[e.key]
  if (next === undefined) return
  e.preventDefault()
  active.value = next
  nextTick(() => btns[next]?.focus())                  // 等 tabindex 更新后，再移动真实焦点
}
</script>
<template>
  <div role="tablist" @keydown="onKeydown">
    <button v-for="(t, i) in items" :key="t" role="tab"
            :ref="el => (btns[i] = el)"
            :tabindex="i === active ? 0 : -1" :aria-selected="i === active"
            @click="active = i">{{ t }}</button>
  </div>
</template>
```

在 3.5.43 中实测这段代码：从前一个按钮按 Tab，焦点进入“资料”。按右方向键依次到“安全”“通知”，Home 回到“资料”，End 到“通知”。再按 Tab，焦点离开标签组，到后面的按钮。按 Shift+Tab 回来时，焦点落在 `tabindex="0"` 的那一项，也就是“通知”。

标签页的方向键是左右，列表是上下。这是由控件的角色决定的，不是自由选择。W3C 的 [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/) 对每种控件都列出了角色、键盘和属性，设计 API 之前先查一遍。

最低要求没有覆盖的部分，例如“输入字母跳到以该字母开头的选项”和 Esc 关闭弹层，属于进阶。先让最低要求在第 1 层成立，再按需求加。

<Exercise id="useListbox" />

### 35.5 API 的演进：什么算破坏性变化

组件和组合式函数发布之后，会有人依赖它的每一个细节。**破坏性变化**是让旧代码不能正常运行的版本改动。下面是按改动类型的判断：

| 改动 | 破坏性吗 | 平滑过渡 |
|---|---|---|
| 新增有默认值的可选 prop | 否 | 默认值保持旧行为 |
| prop 改名 | 是 | 同时接受新旧两个名字，旧名开发环境警告 |
| 改变 prop 的默认值 | **是，而且没有任何报错** | 新增选项，旧默认值保留到下一个大版本 |
| 事件改名 | 是 | 同时触发两个事件 |
| 事件载荷追加参数 | 否 | |
| 事件载荷改类型或换位置 | 是 | 新增一个事件，旧事件保留 |
| 插槽 props 增加字段 | 否 | |
| 插槽 props 删字段或改含义 | 是 | |
| 插槽改名 | 是 | 同时支持两个插槽名 |
| 组合式函数的返回值增加字段 | 否 | |
| 组合式函数的返回值删字段或改名 | 是 | 同时返回新旧两个名字 |
| 根元素标签、DOM 结构、类名 | 看你有没有声明它们是公开的 | 只把 `data-` 属性或文档里列出的类名当公开 API |

改默认值最危险：使用者什么都不用改就能编译通过，行为却变了。把它当成破坏性变化处理，哪怕“只是修正”。

平滑过渡的三个例子，放在同一个组件里，在 3.5.43 中实测过：

```vue
<script setup>
// Select.vue：items 改名为 options，select 事件改名为 pick，#item 插槽改名为 #option
const props = defineProps({ options: Array, items: Array })     // items 是旧名
const emit = defineEmits(['pick', 'select'])

const list = computed(() => props.options ?? props.items ?? [])
let warned = false                                              // 模块外也可以，只警告一次
watchEffect(() => {
  if (props.items && import.meta.env.DEV && !warned) {
    warned = true
    console.warn('[Select] items 已改名为 options，items 将在 2.0 删除')
  }
})
const choose = v => { emit('pick', v); emit('select', v) }       // 新旧事件都触发
</script>
<template>
  <ul>
    <li v-for="o in list" :key="o" @click="choose(o)">
      <!-- 新插槽没有内容时，退回旧插槽，再退回默认内容 -->
      <slot name="option" :option="o"><slot name="item" :option="o">{{ o }}</slot></slot>
    </li>
  </ul>
</template>
```

实测结果：传 `:items` 的旧用法照常显示；使用者写的旧插槽 `#item` 仍然生效；监听旧事件 `@select` 仍然收到值；警告在整个页面里只出现一次。

过渡期要做三件事：在文档和更新日志里写明旧名字何时删除，开发环境警告，并按语义化版本（semver）在大版本里真正删除。

TypeScript 的类型也是 API。把 prop 的类型从 `string` 收窄成联合类型，调用方的类型检查会失败，这也是破坏性变化。

::: deep 把什么当成公开 API
一个组件的公开面比 props 大。下面这些，一旦文档写过或者使用者很可能依赖，就按公开 API 对待：

- props、事件、插槽的名字和载荷；
- `defineExpose` 暴露的方法；
- `InjectionKey`（复合组件的子组件依赖它）；
- 文档里列出的 CSS 类名、`data-` 属性和 CSS 变量；
- 根元素是什么标签。

反过来，**没有写进文档的东西不要让使用者依赖**。办法是少暴露：内部类名加前缀，不导出内部的 `InjectionKey`，`defineExpose` 只给确实需要的方法。
:::

::: pitfalls
1. 不要在组合式函数的开头把 `toValue(x)` 读一次就用。在 `watch` 的 getter 或 `watchEffect` 里读。原因：开头读到的是调用那一刻的值，模板引用还是 null，之后的变化也跟不上。
2. 不要在 setup 顶层启动定时器或监听，并指望 `onScopeDispose` 清理它们。原因：服务端渲染不会调用清理回调，每次请求都会漏掉一个。把启动放进 `onMounted`。
3. 不要把 `defineModel` 的 `default` 当作父组件的初值。原因：`default` 只影响子组件看到的值，父组件的变量仍是 `undefined`，两边不一致。
4. 不要在上层组件里重写键盘和 ARIA 属性。把它们只写在最底层的组合式函数里。原因：写两遍就会有两套行为，改一处漏一处。
5. 不要悄悄改默认值，也不要因为“接口没变”就发补丁版本。原因：使用者的代码不报错，行为却变了，这是最难排查的破坏性变化。
:::

::: selfcheck
<Sc :a="0">

组件里这样使用 `useEventListener`。`box` 是模板引用。点击 `<div ref="box">` 时会发生什么？

```js
function useEventListener(target, type, handler) {
  const el = toValue(target)
  if (el) {
    el.addEventListener(type, handler)
    onScopeDispose(() => el.removeEventListener(type, handler))
  }
}

// setup
const box = useTemplateRef('box')
useEventListener(box, 'click', onClick)
```

<Opt>onClick 不运行：setup 时 box.value 是 null，监听器没有添加</Opt>
<Opt>onClick 运行，组件卸载时监听被移除</Opt>
<Opt>onClick 运行两次：挂载时和更新时各添加一次</Opt>

<template #explain>

解析：`toValue(target)` 在 setup 里只运行一次。这时组件还没有挂载，`box.value` 是 null，`if (el)` 不成立，监听器没有添加，清理也没有注册。正确的写法把读取放进 `watch(() => toValue(target), …, { flush: 'post' })`，模板引用有值之后回调再运行（35.1 节）。第二项是函数想要的效果，不是这段代码的结果。第三项没有任何代码会重复添加。

</template>
</Sc>

<Sc :a="2">

下面的组合式函数在服务端渲染（`renderToString`）中被调用。渲染完成之后，定时器的状态是什么？

```js
export function useTicker() {
  const n = ref(0)
  const id = setInterval(() => n.value++, 1000)
  onScopeDispose(() => clearInterval(id))
  return n
}
```

<Opt>渲染结束时 Vue 调用 onScopeDispose，定时器被清除</Opt>
<Opt>服务端不运行 setInterval，所以没有定时器</Opt>
<Opt>定时器已经创建，清理回调没有被调用，定时器继续运行</Opt>

<template #explain>

解析：`setInterval` 是普通的 JavaScript，服务端照样执行。服务端渲染没有卸载阶段，`onScopeDispose` 注册的回调在渲染结束后没有被调用（用 Vue 3.5.43 实测）。每处理一个请求就多一个永远不停的定时器。把启动放进 `onMounted`，服务端不运行它。第一项以为渲染结束等于组件卸载，那是浏览器里的行为。

</template>
</Sc>

<Sc :a="1">

子组件用 `defineModel()` 声明了 v-model。父组件这样使用，没有写 `@update:model-value`。用户在子组件里选了 `'x'`。子组件显示什么，`a` 是什么？

```html
<Child :model-value="a" />   <!-- const a = ref('p') -->
```

<Opt>子组件显示 p，a 仍是 p：这是受控，没人更新就不变</Opt>
<Opt>子组件显示 x，a 仍是 p</Opt>
<Opt>子组件显示 x，a 变成 x</Opt>

<template #explain>

解析：`defineModel` 看的是父组件有没有同时传入 prop 和更新监听。这里只传了 prop，没有监听，所以按非受控处理：子组件自己保存 x，父组件的 a 不变。`a` 下一次改变时，子组件会重新显示 a 的值。第一项是“prop 加监听、监听里不更新”的结果，那种写法才是受控并拒绝。第三项需要 `v-model`，也就是同时有 prop 和监听。

</template>
</Sc>

<Sc :a="2">

Combobox 的输入框里，用户一边输入文字，一边用 ↓ 在候选项中移动。屏幕阅读器怎样知道当前高亮的是哪一项？

<Opt>用 roving tabindex，把真实焦点移到那个候选项上</Opt>
<Opt>只给高亮项加 aria-selected="true"</Opt>
<Opt>焦点留在输入框，输入框的 aria-activedescendant 指向高亮项的 id</Opt>

<template #explain>

解析：用户还要继续输入，真实焦点必须留在输入框。这时用 `aria-activedescendant` 告诉辅助技术“当前位置”在哪个选项上，所以选项要有页面内唯一的 id。roving tabindex 会把真实焦点移走，用户就不能继续输入了。`aria-selected` 表示选中状态，不表示当前位置，两件事可以不同。

</template>
</Sc>

<Sc :a="1">

Select 的 `#option` 插槽原来的参数是 `{ option }`。下面哪一种改动是破坏性变化？

<Opt>增加参数：{ option, selected }</Opt>
<Opt>把参数 option 改名为 item</Opt>
<Opt>给 emit('change', value) 追加第二个参数 detail</Opt>

<template #explain>

解析：使用者的插槽写的是 `{ option }`。改名之后，这个解构得到 undefined，页面出错。增加字段不影响已有的解构。给事件追加参数时，只接收第一个参数的监听器照常工作。判断的方法：旧代码不改，还能不能得到同样的结果。

</template>
</Sc>

<Sc :a="0">

v1.4 把 Select 的 `closeOnSelect` 默认值从 false 改成 true。props 的名字和类型都没变。应该怎样发布？

<Opt>当作破坏性变化：放进大版本，或者新增选项并保留旧的默认值</Opt>
<Opt>补丁版本：接口没有变</Opt>
<Opt>次版本：只是新增了行为</Opt>

<template #explain>

解析：使用者的代码不报错，行为却变了：以前选择后列表保持打开，现在会关闭。这是最难排查的一类破坏性变化。接口没变不等于行为没变。后两项都假设“没有报错就没有破坏”，这个假设对默认值不成立。

</template>
</Sc>

:::

::: summary
- 组合式函数的契约：输入用 `MaybeRefOrGetter` 并在响应式环境里 `toValue`；返回 ref 组成的对象；清理放 `onScopeDispose`；写明能否在组件外、服务端渲染中调用。
- 受控由父组件持有状态，非受控由组件持有。`defineModel` 看父组件有没有传 prop 和监听。组合式函数用 `undefined` 表示非受控，`null` 表示受控但没选。
- 无渲染的三层：状态与行为的组合式函数、无渲染组件、带样式的组件。上层只用下层，键盘和 ARIA 只写在最底层。
- 键盘最低要求：一个停靠点、方向键和 Home/End、Enter 和空格、角色与状态属性、可见的焦点。用 `aria-activedescendant` 或 roving tabindex 实现。
- 改默认值、改名、改载荷类型、删插槽 props 都是破坏性变化。先同时支持新旧，开发环境警告，大版本再删除。
:::
