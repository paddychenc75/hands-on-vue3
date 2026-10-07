---
title: Pinia 状态管理
id: pinia
stage: 4
chapter: 18
desc: setup store、跨组件共享
---

<script setup>
import SharedStoreInstance from '../figures/18-pinia/SharedStoreInstance.vue'
import StoreToRefsVsDestructure from '../figures/18-pinia/StoreToRefsVsDestructure.vue'
import PiniaShared from '../labs/18-pinia/PiniaShared.vue'
</script>

# Pinia 状态管理

::: goals
<Goal checks="sc:2,ex:sharedStore,ex:fbPinia">用 setup 写法定义 store。</Goal>
<Goal checks="sc:0">在组件中用 storeToRefs 解构 store。</Goal>
<Goal checks="sc:1">决定哪些数据放入 Pinia。</Goal>

:::

::: rt
阅读主线约 10 分钟，深入内容约 2 分钟（可选）。另外留时间做实验台、练习和自测。
:::

::: analogy
Pinia store 是公司的**公共仓库**：任何部门都能来取货、按流程出入库。仓库只有一个，大家看到的库存永远一致。
:::

::: terms
store
: 保存共享数据和方法的对象。所有组件使用同一个。

state
: store 中的数据。

getter
: 从 state 计算得到的值，相当于 computed。

action
: 修改 state 的方法。

storeToRefs
: 把 store 的数据转为 ref，用于解构。
:::

::: why
购物车数据放在 App 中。Header 要显示数量，你经过三层组件用 props 传递它。中间两层组件并不使用这份数据。兄弟组件之间也不能直接传递。

原因：props 只能从父组件传给子组件。使用数据的组件离得越远，要转发的层数越多。

本章用 Pinia 把共享的数据放入 store。任何组件都可以直接读写它。
:::

### 18.1 用 setup 写法定义 store

本章的示例适用于 Pinia 3 和 Pinia 4。截至 2026 年 10 月，npm 上的最新版本是 4.0.3。Pinia 4 要求 Vue 3.5.11 或更高版本。安装：`npm install pinia`。

先判断数据是否共享。只把多个组件读写的数据放入 store：

| 放入 Pinia | 放在组件中 |
|---|---|
| 登录用户、权限、购物车、全局设置。多个页面读写的数据。 | 表单草稿、弹窗状态。只有一个组件使用的数据。 |

setup store 的写法和组件的 setup 相同：

- `ref` 定义 state。
- `computed` 定义 getter。
- 函数定义 action。

```js
// stores/tasks.js
export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref([])                                     // state
  const left = computed(() => tasks.value.filter(t => !t.done).length)  // getter
  let nextId = 1
  function add(text) {                                      // action
    tasks.value.push({ id: nextId++, text, done: false })
  }
  function toggle(id) {
    const t = tasks.value.find(t => t.id === id)
    if (t) t.done = !t.done
  }
  return { tasks, left, add, toggle }    // 必须返回所有 state，否则 DevTools 和 SSR 看不到它们
})

// main.js
app.use(createPinia())

// 在组件中
const store = useTaskStore()
store.add('写测试')          // 调用 action
store.left                   // 读取 getter，不写 .value
```

store 只有一个实例。第一次调用 `useTaskStore()` 时，Pinia 创建 store。之后，所有组件得到同一个 store。下图说明多个组件怎样共享它。

<Figure caption="三个组件调用 useTaskStore()，得到同一个 store。一个组件调用 add()，其他组件自动更新。">
<SharedStoreInstance />
</Figure>

<Lab id="demo-pinia" title="实验台：两个组件共享任务 store" note="一个 15 行的简化 defineStore">
<template #predict>
<Sc predict :a="0">

先猜：TaskForm 和 LeftCount 各自调用 useTaskStore()。两个组件之间没有 props 和事件。现在显示“还剩 2 项”。在 TaskForm 中输入“写测试”，点击“添加”。LeftCount 显示什么？

```js
// TaskForm
const store = useTaskStore()
store.add(draft.value)     // 点击“添加”时

// LeftCount
const store = useTaskStore()
// 模板：还剩 {{ store.left }} 项
```

<Opt>还剩 3 项，两边是同一个 store</Opt>
<Opt>还剩 2 项，每次调用创建新 store</Opt>
<Opt>还剩 2 项，没有 props 传入</Opt>

<template #explain>

解析：defineStore 用 id 在 Map 中缓存 store。第一次调用 useTaskStore() 时创建 store，以后返回同一个对象。所以两个组件读写同一个 store，不需要 props。第二项以为每次调用都创建新的 store。第三项以为数据只能通过 props 传递。打开实验台，在 TaskForm 中输入“写测试”，点击“添加”，看右边的数字。

</template>
</Sc>
</template>

<PiniaShared />
</Lab>

::: deep defineStore 的实现
Pinia 把所有 store 的 state 保存在一个 ref 中：`pinia.state.value[id]`。这让 DevTools 和服务端渲染可以读取全部数据。每个 store 在自己的 effectScope 中运行。下面的代码也包括 18.2 至 18.4 节的 storeToRefs、$patch 和 $subscribe。

```js
// pinia（简化）
function createPinia() {
  const scope = effectScope(true)
  const state = scope.run(() => ref({}))     // 所有 store 的 state
  return { _s: new Map(), state, _e: scope, _p: [], use(plugin) { this._p.push(plugin); return this } }
}

function defineStore(id, setup) {
  return function useStore() {
    const pinia = inject(piniaSymbol, null) || activePinia  // 组件外（例如路由守卫中）使用 activePinia
    if (!pinia._s.has(id)) {
      const scope = pinia._e.run(() => effectScope())
      const setupResult = scope.run(() => setup())
      for (const key in setupResult) {         // 把 ref（不是 computed）放入全局 state
        const v = setupResult[key]
        if (isRef(v) && !isComputed(v)) pinia.state.value[id] ??= {}, pinia.state.value[id][key] = v
      }
      const store = reactive({
        $id: id,
        $patch(p) {                            // 真实的 $patch 接受对象或函数
          typeof p === 'function' ? p(pinia.state.value[id]) : Object.assign(pinia.state.value[id], p)
        },
        $subscribe(cb) { return watch(() => pinia.state.value[id], cb, { deep: true }) },
        $dispose() { scope.stop(); pinia._s.delete(id) },
        ...setupResult
      })
      pinia._p.forEach(plugin => Object.assign(store, plugin({ store, pinia })))  // 运行插件
      pinia._s.set(id, store)
    }
    return pinia._s.get(id)
  }
}

// storeToRefs：只转换 ref 和 reactive，跳过函数（action）
function storeToRefs(store) {
  const raw = toRaw(store), refs = {}
  for (const key in raw) {
    const v = raw[key]
    if (isRef(v) || isReactive(v)) refs[key] = toRef(store, key)
  }
  return refs
}
```
:::

下面的练习不使用 Pinia。第一题补全一个迷你 defineStore。第二题用模块级的 reactive 对象实现一个最小的 store。

<Exercise id="fbPinia" />

<Exercise id="sharedStore" />

### 18.2 在组件中解构 store：storeToRefs

store 是一个 reactive 对象。直接解构它，只复制当时的值。之后数据不更新。用 `storeToRefs` 解构 state 和 getter：

```js
const store = useTaskStore()
const { tasks, left } = storeToRefs(store)   // ref，和 store 保持同步
const { add, toggle } = store                // action 可以直接解构
```

下图比较直接解构和 storeToRefs。

<Figure caption="直接解构只复制当时的值，之后不再同步。storeToRefs 返回连接到 store 的 ref。">
<StoreToRefsVsDestructure />
</Figure>

注意：storeToRefs 跳过 action。所以 action 要从 store 直接解构。

### 18.3 修改 state：action 和 $patch

一般在 action 中修改 state。组件也可以直接赋值，例如 `store.keyword = ''`。要一次修改多个字段，用 `$patch`。

**场景：一次切换多个筛选条件。**用户选择“我的待办”。负责人、状态和关键字要同时改变。用对象调用 `$patch`。Pinia 合并这些字段，`$subscribe` 只收到一次通知。

```js
const board = useBoardStore()   // state：owner、status、keyword

function showMyTodo() {
  board.$patch({ owner: 'ann', status: 'todo', keyword: '' })
}
```

**场景：修改数组和其他字段。**对象形式会用新数组替换整个数组。要向数组添加一项，用函数调用 `$patch`。函数收到 state，可以直接修改它。

```js
const t = { id: 7, title: '写周报' }
board.$patch(state => {
  state.tasks.push(t)
  state.lastAddedId = t.id
})
```

注意：不要在多个组件中用 `$patch` 重复写同一段业务逻辑。把它写成 action，例如 `board.showMyTodo()`。这样修改集中在 store 中，容易追踪。

### 18.4 侦听 store：$subscribe 和 $onAction

`$subscribe` 在 state 改变后运行。`$onAction` 在每个 action 运行前运行。它们用于副作用，例如保存和上报。

**场景：筛选条件改变时保存到本地。**用户刷新页面后，看板保留上次的筛选。在组件中调用 $subscribe 时，组件卸载后订阅自动停止。要一直保存，传入 `{ detached: true }`。

```js
const board = useBoardStore()
board.$subscribe((mutation, state) => {
  // mutation.type：'direct'、'patch object' 或 'patch function'
  localStorage.setItem('board-filter',
    JSON.stringify({ owner: state.owner, status: state.status }))
}, { detached: true })
```

**场景：记录 action 的耗时和错误。**回调收到 action 的名字和参数。用 `after` 在成功后运行代码，用 `onError` 处理失败。$onAction 返回一个函数，调用它会取消订阅。

```js
const unsubscribe = board.$onAction(({ name, args, after, onError }) => {
  const start = Date.now()
  after(() => console.log(`${name} 完成，用时 ${Date.now() - start}ms`))
  onError(err => reportError(name, args, err))
})
// 不再需要时：unsubscribe()
```

注意：不要用 `$subscribe` 计算派生数据，例如“剩余任务数”。用 getter（computed）。

::: deep 写一个持久化插件
插件是一个函数。Pinia 为每个 store 调用一次插件。下面的插件用 $subscribe 把每个 store 的 state 保存到 localStorage：

```js
function persistPlugin({ store }) {
  const key = `pinia:${store.$id}`
  const saved = localStorage.getItem(key)
  if (saved) store.$patch(JSON.parse(saved))          // 1. 启动时恢复数据
  store.$subscribe((_mutation, state) => {            // 2. 数据改变时保存
    localStorage.setItem(key, JSON.stringify(state))
  })
}
createPinia().use(persistPlugin)
```
:::

### 18.5 选项式 store 和重置 state

Pinia 也支持选项式写法。两种写法的对应关系如下：

```js
// 选项式 store
export const useCounter = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: state => state.count * 2
  },
  actions: {
    inc() { this.count++ }            // action 中用 this 访问 store
  }
})

// setup store：同样的功能
export const useCounter = defineStore('counter', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  function inc() { count.value++ }
  return { count, double, inc }
})
```

| 比较项 | 选项式 store | setup store |
|---|---|---|
| `$reset()` | 有。调用 state() 重新生成初始值 | 没有。自己写 reset 函数 |
| 使用 watch 和组合式函数 | 不方便 | 可以直接使用 |
| 写法 | 结构固定，适合新手 | 灵活，和组件 setup 相同 |

**场景：清空表单 store。**setup store 没有 $reset。用一个函数生成初始值，reset 时再调用它：

```js
export const useForm = defineStore('form', () => {
  const initial = () => ({ name: '', email: '' })
  const form = ref(initial())
  function reset() { form.value = initial() }
  return { form, reset }
})
```

### 18.6 在组件之外和其他 store 中使用 store

`useXxxStore()` 需要一个激活的 pinia 实例。`app.use(pinia)` 激活它。所以在组件之外，在 app.use(pinia) 之后才调用 useXxxStore()。

**场景：路由守卫检查登录。**在守卫函数中调用 useAuthStore()，不要在模块顶层调用：

```js
// router.js
const auth = useAuthStore()            // 错误：模块加载时 pinia 还没有安装

router.beforeEach(to => {
  const auth = useAuthStore()          // 正确：守卫运行时，app.use(pinia) 已经完成
  if (to.meta.requiresAuth && !auth.loggedIn) return '/login'
})

// SSR 中，把当前请求的 pinia 传进去：useAuthStore(pinia)
```

**场景：购物车读取用户。**在一个 store 中调用另一个 store 的 useXxxStore()：

```js
export const useCart = defineStore('cart', () => {
  const user = useUserStore()                       // 在 setup store 的顶层调用
  const items = ref([])
  const canCheckout = computed(() => user.loggedIn && items.value.length > 0)
  async function checkout() {
    await api.order(user.id, items.value)
  }
  return { items, canCheckout, checkout }
})
```

注意：两个 store 互相使用时，不要在两个 store 的顶层都读取对方的 state。在 computed 或 action 中读取。

::: pitfalls
1. 不要直接解构 store 的 state。使用 `storeToRefs`。否则数据不更新。
2. 不要在组件外的模块顶层调用 `useTaskStore()`。在 setup 或函数中调用。原因：模块加载时，Pinia 可能还没有安装。
3. 只把共享的数据放入 store。原因：store 不随组件卸载。只有一个组件使用的数据放入 store 后，再次打开组件时数据不会重置。
4. 不要用 `$subscribe` 计算派生数据。用 getter。原因：getter 自动跟踪依赖并缓存结果。用 $subscribe 时，你要手动同步另一份数据。
:::

::: selfcheck
<Sc :a="1">

下面的代码运行后，控制台输出什么？

```js
const store = useTaskStore()   // left 开始是 0
const { left } = store
store.add('写测试')
console.log(left)
```

<Opt>1</Opt>
<Opt>0</Opt>
<Opt>undefined</Opt>

<template #explain>

解析：直接解构只复制当时的值。之后 left 和 store 没有连接。用 `storeToRefs(store)` 解构，`left.value` 是 1。

</template>
</Sc>

<Sc :a="2">

下面哪个数据适合放入 Pinia？

<Opt>一个弹窗的打开状态</Opt>
<Opt>一个表单的草稿</Opt>
<Opt>当前登录的用户</Opt>

<template #explain>

解析：多个页面都读写登录用户。弹窗状态和表单草稿只属于一个组件，放在组件中。

</template>
</Sc>

<Sc :a="0">

组件 A 和组件 B 都调用 `useTaskStore()`。A 调用 `add()`。B 显示的剩余数量会怎样？

<Opt>立即更新。两个组件使用同一个 store</Opt>
<Opt>不变。每个组件有自己的 store</Opt>
<Opt>刷新页面后才更新</Opt>

<template #explain>

解析：第一次调用 useTaskStore() 时，Pinia 创建 store。之后的调用返回同一个 store。

</template>
</Sc>

<Sc :a="0">

回顾（第 3 章）：setup store 中写 `const count = ref(0)`，并返回 count。在组件中读取它，哪种写法正确？

<Opt>store.count</Opt>
<Opt>store.count.value</Opt>
<Opt>store.count()</Opt>

<template #explain>

解析：store 是一个 reactive 对象。第 3 章：读取 reactive 对象中的 ref 时，Vue 自动解包。所以 `store.count` 就是数字。写 `.value` 得到 undefined。count 是 state，不是函数，所以不能调用。

</template>
</Sc>

:::

::: summary
- ref 是 state。computed 是 getter。函数是 action。只把共享的数据放入 store。
- 所有组件使用同一个 store。
- 用 storeToRefs 解构 state。action 可以直接解构。
- 一次修改多个字段用 $patch。修改数组用函数形式。
- $subscribe 和 $onAction 用于保存、上报等副作用。
- setup store 没有 $reset，自己写 reset 函数。
- 组件外在 app.use(pinia) 之后调用 useXxxStore()。
:::
