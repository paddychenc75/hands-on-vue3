import type { Exercise } from './types'
import { sub } from './types'

export const fbPinia: Exercise = {
  title: '原理：补全迷你 defineStore，让它只创建一次 store', ch: 16,
  task: '<p>这道题讲 Pinia 的内部原理，所以不用真实的 Pinia：脚本里的 defineStore 是一个简化版，和 16.1 节“深入”块里的思路相同。其余练习都用真实的 Pinia。</p><p>现在点击“加入”后，购物车的数量不变。原因：每次调用 useCart，都创建一个新 store。</p><ol><li>只补全 useStore 中的一行 TODO：把新建的 store 存入 stores，键是 id。</li><li>确认点击后，CartBadge 显示新的数量和总价。</li></ol>',
  tpl: '<AddButton />\n<CartBadge />',
  js: `// ===== 迷你 defineStore：模仿 Pinia 的核心 =====
const stores = new Map()   // id → store

function defineStore(id, setup) {
  return function useStore() {
    let store = stores.get(id)
    if (!store) {
      store = reactive(setup())   // reactive 自动解包内部的 ref
      // TODO：把 store 存入 stores，键是 id
    }
    return store
  }
}

// ===== 已给出：一个 setup store 和两个组件 =====
const useCart = defineStore('cart', () => {
  const count = ref(0)                  // state
  const total = ref(0)
  function add(price) {                 // action
    count.value++
    total.value += price
  }
  return { count, total, add }
})

const AddButton = {
  setup() { return { cart: useCart() } },
  template: '<button @click="cart.add(12)">加入 Pinia 贴纸</button>'
}

const CartBadge = {
  setup() { return { cart: useCart() } },
  template: '<p class="cart">购物车：{{ cart.count }} 件 · ¥{{ cart.total }}</p>'
}

return { components: { AddButton, CartBadge } }`,
  solJs: `// ===== 迷你 defineStore：模仿 Pinia 的核心 =====
const stores = new Map()   // id → store

function defineStore(id, setup) {
  return function useStore() {
    let store = stores.get(id)
    if (!store) {
      store = reactive(setup())   // reactive 自动解包内部的 ref
      stores.set(id, store)       // 保存。下一次调用时直接返回它
    }
    return store
  }
}

// ===== 已给出：一个 setup store 和两个组件 =====
const useCart = defineStore('cart', () => {
  const count = ref(0)                  // state
  const total = ref(0)
  function add(price) {                 // action
    count.value++
    total.value += price
  }
  return { count, total, add }
})

const AddButton = {
  setup() { return { cart: useCart() } },
  template: '<button @click="cart.add(12)">加入 Pinia 贴纸</button>'
}

const CartBadge = {
  setup() { return { cart: useCart() } },
  template: '<p class="cart">购物车：{{ cart.count }} 件 · ¥{{ cart.total }}</p>'
}

return { components: { AddButton, CartBadge } }`,
  hints: [
    'store 只有一个实例。第一次调用 useXxxStore() 时创建 store。之后，所有组件得到同一个 store。16.1 节的图和“深入：defineStore 的实现”讲了它。',
    '只改 TODO 这一行。stores 是一个 Map。用 Map 的 set 方法保存 store。下一次调用时，stores.get(id) 就能找到它。',
    'stores.set(id, store)'
  ],
  async check(T) {
    const p = () => ((T.$('.cart') || {}).textContent || '').trim();
    T.ok(/0\s*件\s*·\s*¥0$/.test(p()), '初始显示“购物车：0 件 · ¥0”（当前：' + p() + '）');
    const b = T.btn('加入');
    if (!b) { T.ok(false, '找到“加入 Pinia 贴纸”按钮'); return; }
    await T.click(b);
    T.ok(/1\s*件\s*·\s*¥12$/.test(p()), '点击一次后，CartBadge 显示“1 件 · ¥12”（当前：' + p() + '）');
    await T.click(T.btn('加入'));
    T.ok(/2\s*件\s*·\s*¥24$/.test(p()), '再点一次，CartBadge 显示“2 件 · ¥24”（当前：' + p() + '）');
  }
}

// ===== 错误解法（基于参考答案做小改动）=====
fbPinia.wrong = [
  { js: sub(fbPinia.solJs, "    let store = stores.get(id)\n    if (!store) {\n      store = reactive(setup())   // reactive 自动解包内部的 ref\n      stores.set(id, store)       // 保存。下一次调用时直接返回它\n    }\n    return store", "    const store = reactive(setup())   // reactive 自动解包内部的 ref\n    stores.set(id, store)             // 保存了，但从不读取\n    return store"), why: '保存了 store，但每次调用都直接创建新的，没有先从 stores 里找。stores 里只有最后一个，各组件拿到的不是同一个 store。' },
  { js: sub(fbPinia.solJs, "const stores = new Map()   // id → store\n\nfunction defineStore(id, setup) {\n  return function useStore() {", "function defineStore(id, setup) {\n  return function useStore() {\n    const stores = new Map()   // 每次调用都重新创建"), why: '把 Map 放进了 useStore 里面。每次调用 useStore 都得到一个空的 Map，永远找不到上一次的 store。缓存要放在函数外面。' }
]

// ===== 半成品示例（参考答案挖掉关键处，占位说明做什么）=====
fbPinia.faded = {
  js: sub(sub(fbPinia.solJs, 'let store = stores.get(id)', 'let store   /* ✏️ 先从 stores 里取这个 id 已有的 store */'),
    'stores.set(id, store)       // 保存。下一次调用时直接返回它', '/* ✏️ 把新建的 store 存起来，下次调用时才找得到它 */')
}

// ===== 真实的 Pinia：声明 libs: ['pinia']，脚本里直接用 defineStore / storeToRefs（见 AUTHORING.md 4.10）=====
const realPiniaSolJs = `// 假接口：50 毫秒后返回书名
const fetchBooks = () => new Promise(resolve => setTimeout(() => resolve(['Vue 3 设计', '深入 Pinia', '路由之道']), 50))

// setup 写法的 store：ref 是 state，computed 是 getter，函数是 action。所有要共享的东西都要 return
const useBooks = defineStore('books', () => {
  const titles = ref([])                                // state
  const loading = ref(false)                            // state
  const count = computed(() => titles.value.length)     // getter
  async function load() {                               // 异步 action
    loading.value = true
    titles.value = await fetchBooks()
    loading.value = false
  }
  return { titles, loading, count, load }
})

const store = useBooks()
const { titles, count, loading } = storeToRefs(store)   // state 和 getter 用 storeToRefs 解构，保持响应式
const { load } = store                                  // action 直接解构

return { titles, count, loading, load }`

export const realPiniaStore: Exercise = {
  title: '用真实的 Pinia：setup store、storeToRefs 和异步 action', ch: 16,
  libs: ['pinia'],
  task: '<p>这道题运行在真实的 Pinia 上：<code>defineStore</code>、<code>storeToRefs</code> 都可以直接用，运行器已经替你 <code>app.use(createPinia())</code>，每次运行都是全新的 pinia。</p><p>脚本里已经给了假接口 <code>fetchBooks</code>。书架页面要做到：点“加载书单”后先显示“加载中…”，加载完成后列出书名，并显示“共 3 本”。</p><ol><li>TODO 1：用 setup 写法定义 store，id 是 <code>books</code>。state：<code>titles</code>（书名数组，初始为空）、<code>loading</code>；getter：<code>count</code>（书的数量）；异步 action：<code>load</code>（先把 loading 设为 true，等 fetchBooks，再写入 titles，最后把 loading 设回 false）。</li><li>TODO 2：调用 <code>useBooks()</code>，用 <code>storeToRefs</code> 解构出 titles、count、loading，action 直接解构。</li><li>点击按钮，确认页面随 store 更新。</li></ol>',
  tpl: `<button @click="load" :disabled="loading">加载书单</button>
<p class="state">{{ loading ? '加载中…' : '共 ' + count + ' 本' }}</p>
<ul>
  <li v-for="t in titles" :key="t">{{ t }}</li>
</ul>`,
  js: `// 假接口：50 毫秒后返回书名
const fetchBooks = () => new Promise(resolve => setTimeout(() => resolve(['Vue 3 设计', '深入 Pinia', '路由之道']), 50))

// TODO 1：用 defineStore 定义 useBooks（id 是 'books'，用 setup 写法）
//   state：titles、loading；getter：count；异步 action：load

// TODO 2：调用 useBooks()，用 storeToRefs 解构 titles、count、loading，再取出 load

return {}`,
  solJs: realPiniaSolJs,
  hints: [
    '定义 store 用 defineStore(id, setup 函数)。setup 函数里：ref 是 state，computed 是 getter，普通函数是 action，最后把它们都 return。16.1 讲了 setup 写法，16.2 讲了 storeToRefs，16.5 讲了异步 action。',
    'action 是 async 函数：loading.value = true；titles.value = await fetchBooks()；loading.value = false。getter 是 computed(() => titles.value.length)。组件里：const store = useBooks()；const { titles, count, loading } = storeToRefs(store)；const { load } = store。',
    realPiniaSolJs
  ],
  async check(T) {
    const btn = T.btn('加载');
    if (!btn) { T.ok(false, '找到“加载书单”按钮'); return; }
    const s = T.store('books');
    if (!s) { T.ok(false, '用 defineStore("books", …) 定义了 store，并在脚本里调用 useBooks()（真实 pinia 里还没有 id 是 books 的 store）'); return; }
    if (!Array.isArray(s.titles) || typeof s.load !== 'function') { T.ok(false, 'setup store 必须把 state 和 action 都 return：store 里要有 titles（数组）和 load（函数）'); return; }
    T.ok(s.titles.length === 0 && s.loading === false, '初始 titles 为空、loading 为 false');
    T.ok(!T.text().includes('深入 Pinia'), '点击前页面上没有书名');
    await T.click(btn);
    T.ok(s.loading === true && T.text().includes('加载中'), '点击后 action 先把 loading 设为 true，页面显示“加载中…”（storeToRefs 解构的 ref 才随 store 更新）');
    const done = await T.waitFor(() => T.text().includes('深入 Pinia'));
    T.ok(done, '异步 action 完成后页面列出书名（用 storeToRefs 解构，页面才会随 store 的 state 更新）');
    if (!done) return;
    T.ok(s.titles.length === 3, 'action 把 3 本书写进了 store 的 titles（当前 ' + s.titles.length + ' 本）');
    T.ok(s.loading === false && !T.text().includes('加载中'), '完成后 loading 设回 false，页面不再显示“加载中…”');
    T.ok(s.count === 3, 'getter count 随 titles 变化，应是 3（当前 ' + s.count + '：getter 要用 computed，不能只算一次）');
    T.ok(/共\s*3\s*本/.test(T.text()), '页面显示“共 3 本”');
    T.ok(T.pinia.state.value.books && T.pinia.state.value.books.titles.length === 3, '状态保存在这次运行的真实 pinia 里（pinia.state.value.books）');
  },
  wrong: [
    { js: sub(realPiniaSolJs, 'const { titles, count, loading } = storeToRefs(store)   // state 和 getter 用 storeToRefs 解构，保持响应式', 'const { titles, count, loading } = store   // 直接解构'),
      why: '直接解构 store 只复制了当时的值（空数组、0、false）。之后 action 修改 store，页面拿着的还是旧值，不会更新。state 和 getter 要用 storeToRefs 解构。', expectFail: /storeToRefs/ },
    { js: sub(realPiniaSolJs, 'const count = computed(() => titles.value.length)     // getter', 'const count = titles.value.length                    // 只算一次'),
      why: '把 getter 写成了一个普通数字：创建 store 时 titles 是空的，count 永远是 0。getter 要用 computed，才会随 titles 重新计算。', expectFail: /computed/ },
    { js: sub(realPiniaSolJs, '    loading.value = false\n', ''),
      why: 'action 结束后没有把 loading 设回 false，页面一直显示“加载中…”，按钮也一直禁用。异步 action 不管成功失败，都要让 loading 复位。', expectFail: /loading/ },
    { js: sub(realPiniaSolJs, 'return { titles, loading, count, load }', 'return { loading, count, load }'),
      why: 'setup store 里只有 return 出去的东西才是 state / getter / action。titles 没有 return，它就不是 store 的一部分：组件拿不到它，也不会进入 pinia 的 state。', expectFail: /return/ }
  ],
  faded: {
    js: sub(sub(sub(sub(realPiniaSolJs,
      'const count = computed(() => titles.value.length)     // getter', 'const count = /* ✏️ getter：titles 的长度，要随 titles 变化 */ null'),
      '    loading.value = true\n', '    /* ✏️ 开始加载：让 loading 变成 true */\n'),
      '    loading.value = false\n', '    /* ✏️ 加载结束：让 loading 复位 */\n'),
      'storeToRefs(store)   // state 和 getter 用 storeToRefs 解构，保持响应式', '/* ✏️ 解构 state 和 getter，同时保持响应式 */ store')
  }
}

// ===== 真实的 Pinia：筛选条件的重置、恢复和保存 =====
const filterSolJs = `const KEY = 'ex-filter'
// 模拟上次访问留下的数据（每次运行都重新写入）
localStorage.setItem(KEY, JSON.stringify({ owner: 'bob', status: 'done', keyword: 'vue' }))

const useFilter = defineStore('filter', () => {
  const owner = ref('')
  const status = ref('all')
  const keyword = ref('')
  function reset() {                    // setup store 没有可用的 $reset()，自己写
    owner.value = ''
    status.value = 'all'
    keyword.value = ''
  }
  return { owner, status, keyword, reset }
})

const filter = useFilter()

// 恢复：用上次保存的数据一次改好三个字段
const saved = localStorage.getItem(KEY)
if (saved) filter.$patch(JSON.parse(saved))

// 筛选面板：筛选条件每次变化都写入 localStorage
const FilterPanel = {
  setup() {
    const f = useFilter()
    f.$subscribe((_mutation, state) => {
      localStorage.setItem(KEY, JSON.stringify(state))
    }, { detached: true })              // 组件卸载后订阅仍然有效
    return {}
  },
  template: '<p class="panel">筛选面板（打开时才会保存）</p>'
}

const open = ref(true)
function showMyTodo() {
  filter.$patch({ owner: 'ann', status: 'todo', keyword: '' })
}
return { filter, open, showMyTodo, components: { FilterPanel } }`

export const filterPersist: Exercise = {
  title: '用真实的 Pinia：setup store 的重置、$patch 和 $subscribe 保存', ch: 16,
  libs: ['pinia'],
  task: '<p>看板的筛选条件放在 <code>filter</code> store 里：owner、status、keyword。要求：刷新后恢复上次的条件，任何改动都保存，“重置”能回到默认值。现在有三处问题。</p><ol><li>TODO 1：setup store 没有可用的 <code>$reset()</code>，在 store 里自己写 <code>reset()</code>，把三个字段改回 <code>\'\'</code>、<code>\'all\'</code>、<code>\'\'</code>。</li><li>TODO 2：启动时，把 localStorage 里保存的数据一次恢复到 store（用 <code>$patch</code>）。</li><li>TODO 3：保存的订阅写在 FilterPanel 里。点“关闭面板”后，筛选条件的改动不再保存了。让它在面板关闭后继续保存。</li></ol>',
  tpl: `<p class="state">owner：{{ filter.owner || '(空)' }}，status：{{ filter.status }}，keyword：{{ filter.keyword || '(空)' }}</p>
<button @click="showMyTodo">我的待办</button>
<button @click="filter.reset()">重置</button>
<button @click="open = !open">{{ open ? '关闭面板' : '打开面板' }}</button>
<FilterPanel v-if="open" />`,
  js: `const KEY = 'ex-filter'
// 模拟上次访问留下的数据（每次运行都重新写入）
localStorage.setItem(KEY, JSON.stringify({ owner: 'bob', status: 'done', keyword: 'vue' }))

const useFilter = defineStore('filter', () => {
  const owner = ref('')
  const status = ref('all')
  const keyword = ref('')
  // TODO 1：写 reset()，把三个字段改回默认值，并 return 出去
  function reset() {}
  return { owner, status, keyword, reset }
})

const filter = useFilter()

// TODO 2：恢复。读出 localStorage 里保存的 JSON，用 $patch 一次改好三个字段

// 筛选面板：筛选条件每次变化都写入 localStorage
const FilterPanel = {
  setup() {
    const f = useFilter()
    // TODO 3：现在组件卸载时订阅会被取消。让面板关闭后仍然保存
    f.$subscribe((_mutation, state) => {
      localStorage.setItem(KEY, JSON.stringify(state))
    })
    return {}
  },
  template: '<p class="panel">筛选面板（打开时才会保存）</p>'
}

const open = ref(true)
function showMyTodo() {
  filter.$patch({ owner: 'ann', status: 'todo', keyword: '' })
}
return { filter, open, showMyTodo, components: { FilterPanel } }`,
  solJs: filterSolJs,
  hints: [
    'reset 就是把三个 ref 改回初始值。恢复要在 store 创建之后做：const saved = localStorage.getItem(KEY)，有值就 filter.$patch(JSON.parse(saved))。16.3 讲了 $patch，16.4 讲了 setup store 的重置，16.6 讲了订阅的生命周期，16.7 讲了持久化。',
    '组件里调用 $subscribe，订阅会随组件卸载自动取消。要让订阅一直有效，给 $subscribe 传第二个参数 { detached: true }；也可以把订阅放到根脚本里。',
    filterSolJs
  ],
  async check(T) {
    const s = T.store('filter');
    if (!s) { T.ok(false, '用 defineStore("filter", …) 定义 store，并调用 useFilter()'); return; }
    const saved = () => { try { return JSON.parse(localStorage.getItem('ex-filter') || '{}'); } catch { return {}; } };
    T.ok(s.owner === 'bob' && s.status === 'done' && s.keyword === 'vue', 'TODO 2：启动时恢复了上次保存的条件 bob / done / vue（当前 ' + s.owner + ' / ' + s.status + ' / ' + s.keyword + '）');
    const todo = T.btn('我的待办');
    if (!todo) { T.ok(false, '找到“我的待办”按钮'); return; }
    await T.click(todo);
    await T.settle();
    T.ok(s.owner === 'ann' && s.status === 'todo' && s.keyword === '', '点“我的待办”后，条件变成 ann / todo / 空');
    T.ok(saved().owner === 'ann' && saved().status === 'todo', '面板打开时，改动保存进了 localStorage（当前保存的 owner：' + saved().owner + '）');
    await T.click(T.btn('关闭面板'));
    T.ok(!T.$('.panel'), '面板已关闭');
    s.keyword = 'zzz';
    await T.settle();
    T.ok(saved().keyword === 'zzz', 'TODO 3：面板关闭后，条件的改动仍然保存（localStorage 里的 keyword 是 ' + JSON.stringify(saved().keyword) + '）：订阅不能随面板卸载而取消');
    const reset = T.btn('重置');
    await T.click(reset);
    await T.settle();
    T.ok(typeof s.reset === 'function', 'TODO 1：store 里有 reset 函数，并且 return 了出来');
    T.ok(s.owner === '' && s.status === 'all' && s.keyword === '', 'TODO 1：点“重置”后，条件回到默认值 空 / all / 空（当前 ' + s.owner + ' / ' + s.status + ' / ' + s.keyword + '）');
    T.ok(saved().status === 'all' && saved().owner === '' && saved().keyword === '', '重置的结果也被保存');
  },
  wrong: [
    { js: sub(filterSolJs, "    }, { detached: true })              // 组件卸载后订阅仍然有效", "    })"),
      why: '$subscribe 在组件里调用，默认随组件卸载而取消。关闭面板后，筛选条件再变也不会保存。传 { detached: true }，或把订阅放到不会卸载的地方。', expectFail: /面板关闭后/ },
    { js: sub(filterSolJs, "    owner.value = ''\n    status.value = 'all'\n    keyword.value = ''\n  }\n  return { owner, status, keyword, reset }", "    owner.value = ''\n  }\n  return { owner, status, keyword, reset }"),
      why: 'reset 只重置了 owner，status 和 keyword 还留着旧值。重置要把所有字段都改回默认值。', expectFail: /重置/ },
    { js: sub(filterSolJs, "if (saved) filter.$patch(JSON.parse(saved))", "// 忘了恢复"),
      why: '启动时没有恢复保存的条件。刷新页面后，筛选条件丢失，store 里是默认值。', expectFail: /恢复/ },
    { js: sub(filterSolJs, "  function reset() {                    // setup store 没有可用的 $reset()，自己写\n    owner.value = ''\n    status.value = 'all'\n    keyword.value = ''\n  }\n  return { owner, status, keyword, reset }", "  return { owner, status, keyword }"),
      why: '没有写 reset，页面上的 filter.reset() 不存在。setup store 的 $reset() 在开发环境会直接抛错，所以要自己写 reset 并 return。', expectFail: /reset/ }
  ],
  faded: {
    js: sub(sub(sub(filterSolJs,
      "    owner.value = ''\n    status.value = 'all'\n    keyword.value = ''\n  }\n  return", "    /* ✏️ 把三个字段改回默认值 */\n  }\n  return"),
      "if (saved) filter.$patch(JSON.parse(saved))", "/* ✏️ 有保存的数据时，一次恢复三个字段 */"),
      "    }, { detached: true })              // 组件卸载后订阅仍然有效", "    } /* ✏️ 让订阅在组件卸载后仍然有效 */)")
  }
}

// ===== 真实的 Pinia：一个 store 使用另一个 store，加上会失败的异步 action =====
const cartSolJs = `// 假接口：30 毫秒后返回订单号。总价超过 100 时失败
const submitOrder = prices => new Promise((resolve, reject) => setTimeout(() => {
  const total = prices.reduce((s, p) => s + p, 0)
  total > 100 ? reject(new Error('超过单笔额度 ¥100')) : resolve(7)
}, 30))

// 已给出：登录用户 store（假登录，不用修改）
const useAuthStore = defineStore('auth', () => {
  const user = ref('')
  const loggedIn = computed(() => user.value !== '')
  function login(name) { user.value = name }
  return { user, loggedIn, login }
})

const useCartStore = defineStore('cart', () => {
  const auth = useAuthStore()                              // 在 setup store 的顶层取得另一个 store
  const items = ref([])                                    // 商品价格
  const total = computed(() => items.value.reduce((s, p) => s + p, 0))
  const submitting = ref(false)
  const error = ref('')
  const orderId = ref(0)
  const canCheckout = computed(() => auth.loggedIn && items.value.length > 0)
  function add(price) { items.value.push(price) }
  async function checkout() {
    if (!canCheckout.value) return
    submitting.value = true
    error.value = ''
    try {
      orderId.value = await submitOrder(items.value)
      items.value = []
    } catch (e) {
      error.value = e.message
    } finally {
      submitting.value = false
    }
  }
  return { items, total, submitting, error, orderId, canCheckout, add, checkout }
})

const auth = useAuthStore()
const cart = useCartStore()
return { auth, cart, pay: () => cart.checkout() }`

export const cartCheckout: Exercise = {
  title: '用真实的 Pinia：store 之间互相使用，和会失败的异步 action', ch: 16,
  libs: ['pinia'],
  task: '<p>购物车 store 要读登录状态，并提交订单。已经给出登录用户的 <code>auth</code> store 和假接口 <code>submitOrder</code>（总价超过 100 会失败）。请补全 <code>cart</code> store 的三处 TODO。</p><ol><li>TODO 1：在 cart 的 setup 函数里取得 auth store。</li><li>TODO 2：getter <code>canCheckout</code>：已登录，并且购物车里至少有一件商品。</li><li>TODO 3：写 <code>checkout()</code>。不满足 canCheckout 就直接返回。否则 submitting 设为 true，清空 error，等待 submitOrder。成功：把订单号存入 orderId，清空购物车。失败：把错误信息存入 error，购物车保留。不管成败，最后都把 submitting 设回 false。</li></ol>',
  tpl: `<p class="who">{{ auth.loggedIn ? '已登录：' + auth.user : '未登录' }}</p>
<button @click="auth.login('ann')">登录</button>
<button @click="cart.add(40)">加 ¥40 的商品</button>
<p class="total">共 {{ cart.items.length }} 件，¥{{ cart.total }}</p>
<button class="pay" :disabled="!cart.canCheckout || cart.submitting" @click="pay">结算</button>
<p class="msg">{{ cart.submitting ? '提交中…' : cart.error ? '失败：' + cart.error : cart.orderId ? '订单号 ' + cart.orderId : '' }}</p>`,
  js: `// 假接口：30 毫秒后返回订单号。总价超过 100 时失败
const submitOrder = prices => new Promise((resolve, reject) => setTimeout(() => {
  const total = prices.reduce((s, p) => s + p, 0)
  total > 100 ? reject(new Error('超过单笔额度 ¥100')) : resolve(7)
}, 30))

// 已给出：登录用户 store（假登录，不用修改）
const useAuthStore = defineStore('auth', () => {
  const user = ref('')
  const loggedIn = computed(() => user.value !== '')
  function login(name) { user.value = name }
  return { user, loggedIn, login }
})

const useCartStore = defineStore('cart', () => {
  // TODO 1：在这里取得 auth store
  const items = ref([])                                    // 商品价格
  const total = computed(() => items.value.reduce((s, p) => s + p, 0))
  const submitting = ref(false)
  const error = ref('')
  const orderId = ref(0)
  // TODO 2：把 canCheckout 改成 getter：已登录，并且购物车不为空
  const canCheckout = computed(() => false)
  function add(price) { items.value.push(price) }
  async function checkout() {
    // TODO 3：见题目说明
  }
  return { items, total, submitting, error, orderId, canCheckout, add, checkout }
})

const auth = useAuthStore()
const cart = useCartStore()
return { auth, cart, pay: () => cart.checkout() }`,
  solJs: cartSolJs,
  hints: [
    '在 setup store 的顶层调用 useAuthStore() 就能得到另一个 store；读它的 state 要放在 computed 或 action 里（16.8）。异步 action 用 try / catch / finally：成功写在 try，失败写在 catch，复位 loading 写在 finally（16.5）。',
    'canCheckout = computed(() => auth.loggedIn && items.value.length > 0)。checkout：submitting.value = true；error.value = \'\'；try 里 orderId.value = await submitOrder(items.value) 再清空 items；catch (e) 里 error.value = e.message；finally 里 submitting.value = false。',
    cartSolJs
  ],
  async check(T) {
    const cart = T.store('cart'), auth = T.store('auth');
    if (!cart || !auth) { T.ok(false, '用 defineStore("cart", …) 和 defineStore("auth", …) 定义 store，并在脚本里调用它们'); return; }
    const add = T.btn('加 ¥40'), pay = T.$('.pay');
    if (!add || !pay) { T.ok(false, '找到“加 ¥40 的商品”和“结算”按钮'); return; }
    await T.click(add);
    T.ok(pay.disabled === true, 'TODO 2：未登录时，结算按钮是禁用的（canCheckout 要看 auth.loggedIn）');
    await T.click(T.btn('登录'));
    T.ok(pay.disabled === false, 'TODO 2：登录后，结算按钮变为可用：canCheckout 是 computed，要随 auth.loggedIn 变化（不能只在创建 store 时读一次）');
    await T.click(pay);
    T.ok(cart.submitting === true && /提交中/.test(T.text()), 'TODO 3：点击后 submitting 立刻变为 true，页面显示“提交中…”');
    await T.waitFor(() => cart.submitting === false);
    T.ok(cart.orderId === 7 && cart.items.length === 0 && /订单号 7/.test(T.text()), 'TODO 3：成功后记下订单号 7，并清空购物车（当前 orderId ' + cart.orderId + '，' + cart.items.length + ' 件）');
    await T.click(add); await T.click(add); await T.click(add);
    await T.click(pay);
    await T.waitFor(() => !cart.submitting);
    T.ok(cart.submitting === false, 'TODO 3：失败后 submitting 也要设回 false（用 finally），否则按钮一直禁用');
    T.ok(/超过单笔额度/.test(cart.error) && /失败：超过单笔额度/.test(T.text()), 'TODO 3：失败后把错误信息存入 error，页面显示“失败：超过单笔额度 ¥100”');
    T.ok(cart.items.length === 3, 'TODO 3：失败后购物车保留 3 件商品（当前 ' + cart.items.length + ' 件）');
    T.ok(cart.orderId === 7, '失败不改变上一次的订单号');
  },
  wrong: [
    { js: sub(cartSolJs, "      items.value = []\n    } catch (e) {\n      error.value = e.message\n    } finally {\n      submitting.value = false\n    }\n", "      items.value = []\n      submitting.value = false\n    } catch (e) {\n      error.value = e.message\n    }\n"),
      why: '只在成功的路径里把 submitting 设回 false。失败时代码跳到 catch，submitting 永远是 true，按钮一直禁用，页面一直显示“提交中…”。复位要写在 finally 里，成败都会运行。', expectFail: /submitting/ },
    { js: sub(cartSolJs, "  const canCheckout = computed(() => auth.loggedIn && items.value.length > 0)", "  const canCheckout = computed(() => items.value.length > 0)"),
      why: 'canCheckout 没有检查登录状态，未登录的用户也能结算。cart 使用 auth，就是为了读它的 loggedIn。', expectFail: /未登录/ },
    { js: sub(sub(cartSolJs, "  const auth = useAuthStore()                              // 在 setup store 的顶层取得另一个 store\n", "  const loggedIn = useAuthStore().loggedIn                 // 只取了一次值\n"), "auth.loggedIn && items.value.length > 0", "loggedIn && items.value.length > 0"),
      why: '创建 cart 时把 loggedIn 的值取出来存成普通变量，它只是当时的 false。之后用户登录，canCheckout 仍然用旧值。要在 computed 里读 auth.loggedIn。', expectFail: /登录后/ },
    { js: sub(cartSolJs, "      orderId.value = await submitOrder(items.value)\n      items.value = []", "      items.value = []\n      orderId.value = await submitOrder(items.value)"),
      why: '先清空购物车再提交：提交的是空数组，总价为 0，永远成功；失败的场景也被掩盖了。要等提交成功之后再清空。', expectFail: /失败/ },
    { js: sub(cartSolJs, "    } catch (e) {\n      error.value = e.message\n    } finally {", "    } catch (e) {\n      items.value = []\n      error.value = e.message\n    } finally {"),
      why: '失败时也清空了购物车。用户只能重新选商品。失败要保留购物车，让用户可以重试。', expectFail: /保留/ }
  ],
  faded: {
    js: sub(sub(sub(cartSolJs,
      "  const auth = useAuthStore()                              // 在 setup store 的顶层取得另一个 store\n", "  /* ✏️ 在 setup store 的顶层取得 auth store */\n"),
      "computed(() => auth.loggedIn && items.value.length > 0)", "computed(() => /* ✏️ 已登录，并且购物车不为空 */ false)"),
      "    if (!canCheckout.value) return\n    submitting.value = true\n    error.value = ''\n    try {\n      orderId.value = await submitOrder(items.value)\n      items.value = []\n    } catch (e) {\n      error.value = e.message\n    } finally {\n      submitting.value = false\n    }\n",
      "    /* ✏️ 不满足 canCheckout 就返回；submitting 变 true、清空 error；try 里等 submitOrder，成功记订单号并清空购物车；catch 里存错误信息；finally 里复位 submitting */\n")
  }
}
