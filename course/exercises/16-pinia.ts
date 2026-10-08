import type { Exercise } from './types'
import { sub } from './types'

export const fbPinia: Exercise = {
  title: '补全：迷你 defineStore 只创建一次 store', ch: 16,
  task: '<p>说明：练习台不能运行真实的 Pinia。脚本中的 defineStore 是一个简化版，和第 16 章实验台中的相同。</p><p>现在点击“加入”后，购物车的数量不变。原因：每次调用 useCart，都创建一个新 store。</p><ol><li>只补全 useStore 中的一行 TODO：把新建的 store 存入 stores，键是 id。</li><li>确认点击后，CartBadge 显示新的数量和总价。</li></ol>',
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
    'store 只有一个实例。第一次调用 useXxxStore() 时创建 store。之后，所有组件得到同一个 store。第 16 章开头的图和“深入：defineStore 的实现”讲了它。',
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

export const sharedStore: Exercise = {
  title: '让两个组件共享购物车', ch: 16,
  task: '<p>AddButton 和 CartBadge 都调用 <code>useCart()</code>。点击“加入购物车”后，CartBadge 的数量不变。原因：每次调用 useCart，都创建一份新状态。</p><ol><li>把 <code>reactive</code> 移到 useCart 外面。</li><li>让 useCart 返回这一份状态。</li><li>确认点击后 CartBadge 更新。</li></ol><p>Pinia 的 defineStore 使用同样的思路。Pinia 还支持 DevTools，并在 SSR 中为每个请求创建独立的状态。</p>',
  tpl: '<AddButton />\n<CartBadge />',
  js: `// 一个最小的 store：返回购物车状态
function useCart() {
  const cart = reactive({ count: 0 })
  return cart
}

const AddButton = {
  setup() {
    const cart = useCart()
    return { add: () => cart.count++ }
  },
  template: '<button @click="add">加入购物车</button>'
}

const CartBadge = {
  setup() {
    return { cart: useCart() }
  },
  template: '<p>购物车：{{ cart.count }} 件</p>'
}

return { components: { AddButton, CartBadge } }`,
  solJs: `// 状态只创建一次。所有组件得到同一个对象
const cart = reactive({ count: 0 })

function useCart() {
  return cart
}

const AddButton = {
  setup() {
    const cart = useCart()
    return { add: () => cart.count++ }
  },
  template: '<button @click="add">加入购物车</button>'
}

const CartBadge = {
  setup() {
    return { cart: useCart() }
  },
  template: '<p>购物车：{{ cart.count }} 件</p>'
}

return { components: { AddButton, CartBadge } }`,
  hints: [
    '状态要在函数外部只创建一次，所有组件才能共享。第 16 章的实验台“两个组件共享任务 store”讲了这个思路。Pinia 的 defineStore 也这样做。',
    '把 const cart = reactive({ count: 0 }) 这一行移到 function useCart 的外面。useCart 中只剩一行 return。',
    'const cart = reactive({ count: 0 })\n\nfunction useCart() {\n  return cart\n}'
  ],
  async check(T) {
    const p = () => (T.$('p') || {}).textContent || '';
    T.ok(/购物车：\s*0\s*件/.test(p()), '初始显示“购物车：0 件”');
    const b = T.btn('加入购物车');
    if (!b) { T.ok(false, '找到“加入购物车”按钮'); return; }
    await T.click(b);
    T.ok(/购物车：\s*1\s*件/.test(p()), '点击一次后，CartBadge 显示 1 件（当前：' + p() + '）');
    await T.click(T.btn('加入购物车'));
    T.ok(/购物车：\s*2\s*件/.test(p()), '再点一次，CartBadge 显示 2 件');
  }
}

// ===== 错误解法（基于参考答案做小改动）=====
fbPinia.wrong = [
  { js: sub(fbPinia.solJs, "    let store = stores.get(id)\n    if (!store) {\n      store = reactive(setup())   // reactive 自动解包内部的 ref\n      stores.set(id, store)       // 保存。下一次调用时直接返回它\n    }\n    return store", "    const store = reactive(setup())   // reactive 自动解包内部的 ref\n    stores.set(id, store)             // 保存了，但从不读取\n    return store"), why: '保存了 store，但每次调用都直接创建新的，没有先从 stores 里找。stores 里只有最后一个，各组件拿到的不是同一个 store。' },
  { js: sub(fbPinia.solJs, "const stores = new Map()   // id → store\n\nfunction defineStore(id, setup) {\n  return function useStore() {", "function defineStore(id, setup) {\n  return function useStore() {\n    const stores = new Map()   // 每次调用都重新创建"), why: '把 Map 放进了 useStore 里面。每次调用 useStore 都得到一个空的 Map，永远找不到上一次的 store。缓存要放在函数外面。' }
]

sharedStore.wrong = [
  { js: sub(sharedStore.solJs, 'const cart = reactive({ count: 0 })', 'const cart = { count: 0 }   // 普通对象'), why: '状态只创建一次了，但用的是普通对象，不是 reactive。点击后数据变了，页面不更新。' },
  { js: sub(sharedStore.solJs, 'function useCart() {\n  return cart\n}', 'function useCart() {\n  return reactive({ ...cart })   // 每次返回一份拷贝\n}'), why: '每次返回一份拷贝。AddButton 改的是自己的拷贝，CartBadge 读的是另一份，两个组件没有共享同一个对象。' }
]

// ===== 半成品示例（参考答案挖掉关键处，占位说明做什么）=====
fbPinia.faded = {
  js: sub(sub(fbPinia.solJs, 'let store = stores.get(id)', 'let store   /* ✏️ 先从 stores 里取这个 id 已有的 store */'),
    'stores.set(id, store)       // 保存。下一次调用时直接返回它', '/* ✏️ 把新建的 store 存起来，下次调用时才找得到它 */')
}

sharedStore.faded = {
  js: sub(sharedStore.solJs, '// 状态只创建一次。所有组件得到同一个对象\nconst cart = reactive({ count: 0 })\n\nfunction useCart() {\n  return cart\n}',
    '/* ✏️ 状态放在哪里，才只创建一次？ */\n\nfunction useCart() {\n  return /* ✏️ 返回所有组件共享的那份状态 */ undefined\n}')
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
    '定义 store 用 defineStore(id, setup 函数)。setup 函数里：ref 是 state，computed 是 getter，普通函数是 action，最后把它们都 return。第 16 章 16.1 讲了 setup 写法，16.2 讲了 storeToRefs。',
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
