---
title: Pinia 状态管理
id: pinia
stage: 3
chapter: 16
desc: setup store、异步 action、插件与持久化
---

<script setup>
import SharedStoreInstance from '../figures/16-pinia/SharedStoreInstance.vue'
import StoreToRefsVsDestructure from '../figures/16-pinia/StoreToRefsVsDestructure.vue'
import PiniaShared from '../labs/16-pinia/PiniaShared.vue'
import PiniaTrace from '../labs/16-pinia/PiniaTrace.vue'
</script>

# Pinia 状态管理

::: goals
<Goal checks="sc:0,sc:1,sc:3,ex:realPiniaStore">用 setup 写法定义 store，在组件中用 storeToRefs 解构，并认出适合放进 store 的数据。</Goal>
<Goal checks="sc:4,ex:cartCheckout">写带 loading 和 error 的异步 action，并让一个 store 使用另一个 store。</Goal>
<Goal checks="sc:5,sc:6,ex:filterPersist">用 $patch 修改 state，用 $subscribe 保存，并为 setup store 写 reset。</Goal>
<Goal checks="sc:7">配置持久化，并判断哪些 state 不该持久化。</Goal>
<Goal checks="sc:2,ex:fbPinia">说明 defineStore 怎样让所有组件得到同一个 store。</Goal>

:::

::: rt
阅读主线约 15 分钟，深入内容约 3 分钟（可选）。另外留时间做实验台、练习、自测和本地任务。
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

Pinia 插件
: 一个函数。Pinia 创建每个 store 时调用它一次，它可以给 store 加属性，或订阅 store 的变化。
:::

::: why
购物车数据放在 App 中。Header 要显示数量，你经过三层组件用 props 传递它。中间两层组件并不使用这份数据。兄弟组件之间也不能直接传递。

原因：props 只能从父组件传给子组件。使用数据的组件离得越远，要转发的层数越多。

本章用 Pinia 把共享的数据放入 store。任何组件都可以直接读写它。你会写一个完整的登录 store，并让它在刷新后保持登录。第 17 章再用路由守卫把它接起来。
:::

### 16.1 用 setup 写法定义 store

本章的示例适用于 Pinia 3 和 Pinia 4。截至 2026 年 10 月，npm 上的最新版本是 4.0.3。Pinia 4 要求 Vue 3.5.11 或更高版本。安装：`npm install pinia`。

先说一个前提。一份数据该不该放进 store，是状态归属的判断，[第 19 章](/chapters/19-state-arch)用六个问题回答。本章假设你已经决定放进去（登录用户、购物车、全局设置是典型的例子），只讲怎样用好 Pinia。

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
Pinia 把所有 store 的 state 保存在一个 ref 中：`pinia.state.value[id]`。这让 DevTools 和服务端渲染可以读取全部数据。每个 store 在自己的 effectScope 中运行。下面的代码也包括 16.2 至 16.6 节的 storeToRefs、$patch 和 $subscribe。

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


下面的练习讲原理，所以不用真实的 Pinia：它补全一个迷你 defineStore，让你亲手写出“只创建一次”。本章其余的练习都用真实的 Pinia。

<Exercise id="fbPinia" />

### 16.2 在组件中解构 store：storeToRefs

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

注意：storeToRefs 只处理 state 和 getter，不处理 action。所以 action 要从 store 直接解构。模板里直接写 `store.left` 不会丢失响应性，只有解构才会。

### 16.3 修改 state：action 和 $patch

一般在 action 中修改 state。组件也可以直接赋值，例如 `store.keyword = ''`。要一次修改多个字段，用 `$patch`。

**场景：一次切换多个筛选条件。**用户选择“我的待办”。负责人、状态和关键字要同时改变。用对象调用 `$patch`。Pinia 把对象合并进 state：嵌套的对象逐层合并，数组则整个替换。

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

### 16.4 选项式 store、两种写法的取舍和重置

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
| `$reset()` | 有。重新调用 `state()` 生成初始值 | 没有。开发环境调用会直接抛错 |
| 使用 watch 和组合式函数 | 不方便 | 可以直接使用 |
| 写法 | 结构固定，适合新手 | 灵活，和组件 setup 相同 |

怎样选？新项目默认用 setup store：它和组件的写法一致，能直接用 `watch` 和第 8 章的组合式函数。团队更习惯固定结构，或者想要内置的 `$reset()`，选项式 store 也完全可用。两种写法可以在同一个项目里混用，使用方的代码一样。

**场景：清空表单 store。**setup store 的 `$reset()` 会抛错（`Store "form" is built using the setup syntax and does not implement $reset()`）。用一个函数生成初始值，reset 时再调用它：

```js
export const useForm = defineStore('form', () => {
  const initial = () => ({ name: '', email: '' })
  const form = ref(initial())
  function reset() { form.value = initial() }
  return { form, reset }
})
```

### 16.5 异步 action：登录的 loading 和 error

**问题。**登录要等服务器。等的时候，按钮显示“登录中…”。失败时，页面显示原因。这些状态放在哪里？

登录用户和 token 本来就在 store 里，多个页面都要读。这次登录的 loading 和 error 也放在同一个 store。组件只负责收集输入、调用 action、显示状态。下面是本章和第 17 章共用的 `auth` store（用 TypeScript 写，类型见 16.9 节）：

```ts
// stores/auth.ts
export const useAuthStore = defineStore('auth', () => {
  const token = ref('')
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref('')
  const loggedIn = computed(() => user.value !== null)

  async function login(name: string, password: string) {
    loading.value = true
    error.value = ''
    try {
      const res = await api.login(name, password)    // 调用服务器
      token.value = res.token
      user.value = res.user
    } catch (e) {
      error.value = (e as Error).message             // 页面显示原因
      throw e                                        // 调用方也要知道失败了
    } finally {
      loading.value = false                          // 成功和失败都要复位
    }
  }

  function logout() {
    token.value = ''
    user.value = null
  }

  let restoring: Promise<void> | undefined
  function restore() {            // 刷新后，用保存的 token 换回用户。整个页面生命周期只请求一次
    restoring ??= (async () => {
      if (!token.value || user.value) return
      try {
        user.value = await api.fetchMe(token.value)
      } catch {
        logout()                  // token 过期了，当作没登录
      }
    })()
    return restoring
  }

  return { token, user, loading, error, loggedIn, login, logout, restore }
})
```

`restore` 解决刷新问题：`user` 在内存里，刷新后就没了，但保存下来的 `token` 还在（16.7 讲保存）。`restore` 用 token 换回用户。第 17 章的路由守卫会先等它完成，再判断是否登录。

组件里：

```js
const auth = useAuthStore()
const { loading, error } = storeToRefs(auth)
async function submit() {
  try {
    await auth.login(name.value, password.value)
    router.replace('/')           // 登录成功才跳转（第 17 章）
  } catch {
    // 错误已经在 auth.error 里，模板里显示它
  }
}
```

两件事要想清楚。第一，失败怎么传出去：存进 `error` 是给页面显示的，再 `throw` 是给调用方判断的（要不要跳转）。只做其中一件，另一边就拿不到。第二，loading 用 `finally` 复位。写在 `try` 的末尾，失败时按钮会永远停在“登录中…”。

注意：这里放的是**会话**（谁登录了）。接口返回的列表和详情数据怎么放，见[第 19 章](/chapters/19-state-arch)的 19.5。

<Exercise id="realPiniaStore" />

### 16.6 侦听 store：$subscribe 和 $onAction

`$subscribe` 在 state 改变后运行。`$onAction` 在每个 action 运行前运行。它们用于副作用，例如保存和上报。

**场景：筛选条件改变时保存到本地。**用户刷新页面后，看板保留上次的筛选。

```js
const board = useBoardStore()
board.$subscribe((mutation, state) => {
  // mutation.type：'direct'、'patch object' 或 'patch function'
  localStorage.setItem('board-filter',
    JSON.stringify({ owner: state.owner, status: state.status }))
})
```

注意订阅的生命周期。在组件的 setup 里调用 `$subscribe`，组件卸载后订阅自动取消。要让它一直有效，传入 `{ detached: true }`。

**场景：记录 action 的耗时和错误。**回调收到 action 的名字和参数。用 `after` 在成功后运行代码，用 `onError` 处理失败。`$onAction` 返回一个函数，调用它会取消订阅。

```js
const unsubscribe = board.$onAction(({ name, args, after, onError }) => {
  const start = Date.now()
  after(result => console.log(`${name} 完成，用时 ${Date.now() - start}ms`))
  onError(err => reportError(name, args, err))
})
// 不再需要时：unsubscribe()
```

<Lab id="demo-pinia-trace" title="实验台：真实的 Pinia 怎样通知订阅者" note="真实的 pinia，不是迷你实现">
<template #predict>
<Sc predict :a="1">

先猜：store 已经用 `$subscribe` 订阅。点击“连续直接赋值 3 次”：先后执行 `store.count++`、`store.count++`、`store.label = 'b'`。`$subscribe` 的回调运行几次？

<Opt>3 次，每次赋值一次</Opt>
<Opt>1 次，同一个 tick 里的修改合并通知</Opt>
<Opt>0 次，只有 $patch 才通知</Opt>

<template #explain>

解析：Pinia 用 watch 监听 state，默认在组件更新之前统一运行回调，所以同一个 tick 里的多次直接赋值只通知一次，`mutation.type` 是 `direct`。`$patch` 也只通知一次，类型是 `patch object` 或 `patch function`。打开实验台，依次点击每个按钮，看日志里的类型。再点“save(失败)”，看 `$onAction` 的 `onError`。

</template>
</Sc>
</template>

<PiniaTrace />
</Lab>

注意：不要用 `$subscribe` 计算派生数据，例如“剩余任务数”。用 getter（computed）。

### 16.7 插件和持久化

**问题。**刷新页面，内存里的 state 就没了。登录 token、主题、筛选条件要在刷新后保留。每个 store 都写一遍保存和恢复，很重复。

Pinia 插件就是解决重复的地方。插件是一个函数，Pinia 创建每个 store 时调用它一次，参数里有 store 和 `defineStore` 的选项。用 `pinia.use(插件)` 注册，要在第一次调用 `useXxxStore()` 之前。下面的插件只持久化标了 `persist: true` 的 store：

```js
function persistPlugin({ store, options }) {
  if (!options.persist) return
  const key = `pinia:${store.$id}`
  const saved = localStorage.getItem(key)
  if (saved) store.$patch(JSON.parse(saved))            // 1. 启动时恢复
  store.$subscribe((_mutation, state) => {              // 2. 改变时保存
    localStorage.setItem(key, JSON.stringify(state))
  }, { detached: true })
}

const pinia = createPinia()
pinia.use(persistPlugin)

// setup store 的第三个参数是选项
defineStore('settings', () => { /* … */ }, { persist: true })
```

真实项目通常直接用现成的库 `pinia-plugin-persistedstate`（本章写作时是 4.7.1）。它多了 `key`、`storage`、`pick`、`omit` 这些选项：

```ts
// main.ts
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
pinia.use(piniaPluginPersistedstate)

// stores/auth.ts：setup store 的第三个参数
defineStore('auth', () => { /* … */ }, { persist: { pick: ['token'] } })
```

**什么该存，什么不该存。**存之前逐个字段问自己：

- `loading`、`error` 这类瞬时状态不存。存了，刷新后页面会停在“登录中…”。
- 能由别的数据换回来的不存。上面的 `user` 可以用 `token` 向服务器换回，所以只存 `token`。
- 接口数据不存（[第 19 章](/chapters/19-state-arch)）。它会过期。
- 密码绝不存。token 放进 localStorage，页面里的任何脚本都能读到它。更稳妥的做法是后端设置 `httpOnly` cookie，前端不接触 token。本章把 token 放进 localStorage，只是为了演示“刷新后恢复登录”。
- 改了 state 的结构后，老用户保存的是旧结构。给 key 加版本号（例如 `key: 'tasks-v2'`），或者读取失败时回退到默认值。

<Exercise id="filterPersist" />

### 16.8 在组件之外和其他 store 中使用 store

`useXxxStore()` 需要一个激活的 pinia 实例。`app.use(pinia)` 激活它。所以在组件之外，在 app.use(pinia) 之后才调用 useXxxStore()。

**场景：路由守卫检查登录。**在守卫函数中调用 useAuthStore()，不要在模块顶层调用。`auth` 就是 16.5 节定义的 store：

```js
// router.js
const auth = useAuthStore()            // 错误：模块加载时 pinia 还没有安装

router.beforeEach(to => {
  const auth = useAuthStore()          // 正确：守卫运行时，app.use(pinia) 已经完成
  if (to.meta.requiresAuth && !auth.loggedIn) return '/login'
})
```

服务端渲染（SSR）时，每个请求有自己的 pinia，要把它传进去：`useAuthStore(pinia)`。详见[第 36 章](/chapters/36-ssr)。

**场景：购物车读取用户。**在一个 store 中调用另一个 store 的 useXxxStore()：

```js
export const useCart = defineStore('cart', () => {
  const auth = useAuthStore()                       // 在 setup store 的顶层调用
  const items = ref([])
  const canCheckout = computed(() => auth.loggedIn && items.value.length > 0)
  async function checkout() {
    await api.order(auth.user.id, items.value)
  }
  return { items, canCheckout, checkout }
})
```

注意：读取另一个 store 的 state，要放在 computed 或 action 里。不要在 setup 顶层把它存成普通变量，那样只是当时的一个值。两个 store 互相使用时，不要在两个 store 的顶层都读取对方的 state，循环依赖的细节见[第 19 章](/chapters/19-state-arch)。

<Exercise id="cartCheckout" />

### 16.9 store 的类型和调试

**类型。**setup store 的类型由 return 的内容推断出来。只有两处要自己写：初始值是 `null` 或空数组的 `ref`，要写类型参数；函数的参数要写类型。需要“某个 store 的类型”时，用 `ReturnType`：

```ts
const user = ref<User | null>(null)        // 否则类型是 null
const items = ref<CartItem[]>([])          // 否则类型是 never[]

type AuthStore = ReturnType<typeof useAuthStore>
function describe(auth: AuthStore) { return auth.user?.name }
```

给插件加的选项和属性，要用模块扩充声明类型。TypeScript 的机制见[第 14 章](/chapters/14-ts)：

```ts
declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: boolean                       // defineStore 的第三个参数多了 persist
  }
  export interface PiniaCustomProperties {
    $log: (msg: string) => void             // 每个 store 多了 $log
  }
}
```

**调试。**Vue DevTools 的 Pinia 面板（[第 15 章](/chapters/15-tooling)介绍过）可以查看和修改每个 store 的 state，时间线里能看到每个 action 的调用。它只能看到 `return` 出来的 state，所以 16.1 节说“必须返回所有 state”。改 store 文件时，要让页面保持当前 state 而不刷新，在 store 文件末尾加热更新：

```ts
import { acceptHMRUpdate } from 'pinia'
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
```

### 16.10 本地任务：给项目加上 Pinia 并做持久化

在一个干净的 Vite + Vue + TypeScript 项目里做。第 15 章（15.1 节）用 `npm create vue@latest` 创建过项目，这里不选 Pinia，从零加起。

1. 创建项目（已有项目跳过）：`npm create vue@latest my-board -- --ts`，进入目录运行 `npm install`。
2. 安装：`npm install pinia pinia-plugin-persistedstate`。
3. 在 `src/main.ts` 创建 pinia，注册插件，再安装到应用：`const pinia = createPinia()`，`pinia.use(piniaPluginPersistedstate)`，`createApp(App).use(pinia)`。
4. 写 `src/stores/tasks.ts`：setup store，有 `tasks`、`left`（getter）、`add`、`toggle`，第三个参数是 `{ persist: true }`。
5. 写 `src/stores/auth.ts`：照 16.5 节，有 `login`（异步，带 loading 和 error）、`logout`，只持久化 `token`（`{ persist: { pick: ['token'] } }`）。接口用一个 `setTimeout` 假的 Promise。
6. 在 `App.vue` 里用 `storeToRefs` 解构，做一个任务列表和一个登录表单。

验收标准：

- `npm run type-check` 没有输出错误。`npm run build` 以 `✓ built in` 结束。
- 添加两个任务，勾选一个，刷新页面：列表和勾选状态都还在。浏览器 DevTools 的 Application 面板里，localStorage 有一个键 `tasks`。
- 用错误的密码登录，页面显示错误信息，按钮恢复可点。用正确的密码登录，页面显示用户名。
- 登录后 localStorage 的 `auth` 里只有 `token`，没有 `user`、`loading`、`error`。刷新页面后仍显示已登录（在 `onMounted` 里用 token 换回用户）。

页面练习检验 store 的写法和行为（16.1 到 16.8 节）。持久化库的安装、类型检查和构建只能在本地自查。

::: pitfalls
1. 不要直接解构 store 的 state。使用 `storeToRefs`。否则数据不更新。
2. 不要在组件外的模块顶层调用 `useTaskStore()`。在 setup 或函数中调用。原因：模块加载时，Pinia 可能还没有安装。
3. 只把共享的数据放入 store。原因：store 不随组件卸载。只有一个组件使用的数据放入 store 后，再次打开组件时数据不会重置。
4. 不要用 `$subscribe` 计算派生数据。用 getter。原因：getter 自动跟踪依赖并缓存结果。用 $subscribe 时，你要手动同步另一份数据。
5. 异步 action 里，catch 之后要决定是否 `throw`，复位 loading 写在 `finally`。原因：吞掉错误后，调用方以为成功了。
6. 不要在 setup store 上调用 `$reset()`。自己写 reset 函数。
7. 不要持久化 loading 和 error，也不要把密码存进 localStorage。
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

<Sc :a="0">

登录 action 如下。`api.login` 抛出错误时，调用方的 `try { await auth.login(n, p); router.push('/') } catch {}` 会怎样？

```js
async function login(name, pw) {
  loading.value = true
  try {
    user.value = await api.login(name, pw)
  } catch (e) {
    error.value = e.message
  }
  loading.value = false
}
```

<Opt>仍然执行 router.push('/')，因为错误在 action 里被吞掉了</Opt>
<Opt>跳过 router.push，停在登录页</Opt>
<Opt>loading 一直是 true，页面卡在“登录中…”</Opt>

<template #explain>

解析：catch 里只记录了错误，没有再 `throw`，所以 `login` 返回的 Promise 正常完成，调用方的 `await` 不会抛错，接着执行了 `router.push('/')`：用户没有登录却被跳走。要在 catch 里 `throw e`。第三项不对：`loading.value = false` 在 catch 之后，会运行。不过把它放进 `finally` 更稳妥。

</template>
</Sc>

<Sc :a="2">

下面的 setup store 没有写 reset 函数。开发环境里运行 `useCounter().$reset()`，会怎样？

```js
const useCounter = defineStore('counter', () => {
  const n = ref(0)
  return { n }
})
```

<Opt>n 回到初始值 0</Opt>
<Opt>什么也不发生</Opt>
<Opt>抛出错误：setup store 没有实现 $reset()</Opt>

<template #explain>

解析：只有选项式 store 的 `$reset()` 能用，它重新调用 `state()` 取得初始值。setup store 没有 `state()`，Pinia 不知道初始值是什么，所以在开发环境抛错。自己写一个 `reset` 函数并 return。

</template>
</Sc>

<Sc :a="1">

`store` 已经用 `store.$subscribe(() => console.log('changed'))` 订阅。下面的代码一共输出几次 `changed`？

```js
store.a = 1
store.b = 2
await nextTick()
store.$patch({ a: 3, b: 4 })
await nextTick()
```

<Opt>4 次，每次修改一次</Opt>
<Opt>2 次，每个 tick 内的修改合并成一次通知</Opt>
<Opt>3 次，直接赋值各一次，$patch 一次</Opt>

<template #explain>

解析：`$subscribe` 默认在 tick 结束时统一通知。前两次直接赋值在同一个 tick 里，合并成一次（`mutation.type` 是 `direct`）。`$patch` 又是一次。所以是 2 次。

</template>
</Sc>

<Sc :a="0">

`auth` store 有 `token`、`user`、`loading`、`error`。刷新后要恢复登录：先读保存的 token，再向服务器换回用户。`persist` 的 `pick` 应该写什么？

<Opt>['token']</Opt>
<Opt>['token', 'user', 'loading', 'error']</Opt>
<Opt>['loading', 'error']</Opt>

<template #explain>

解析：`user` 能由 token 换回，不存。`loading` 和 `error` 是瞬时状态，存了以后刷新页面会停在“登录中…”或显示过期的错误。第三项存的恰好是不该存的。

</template>
</Sc>

:::

::: summary
- ref 是 state。computed 是 getter。函数是 action。只把共享的数据放入 store。
- 所有组件使用同一个 store。
- 用 storeToRefs 解构 state。action 可以直接解构。
- 一次修改多个字段用 $patch。修改数组用函数形式。
- setup store 没有可用的 $reset，自己写 reset 函数。
- 异步 action：loading 用 finally 复位，失败既存进 error 也 throw 给调用方。
- $subscribe 和 $onAction 用于保存、上报等副作用。组件里的订阅随组件卸载取消，要一直有效就传 `{ detached: true }`。
- 插件在每个 store 创建时运行一次，持久化用现成的库。不存 loading、error、能换回来的数据和密码。
- 组件外在 app.use(pinia) 之后调用 useXxxStore()。store 之间互相使用，在 computed 或 action 里读对方的 state。
:::
