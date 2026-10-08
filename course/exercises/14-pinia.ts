import type { Exercise } from './types'
import { sub } from './types'

export const fbPinia: Exercise = {
  title: '补全：迷你 defineStore 只创建一次 store', ch: 14,
  task: '<p>说明：练习台不能运行真实的 Pinia。脚本中的 defineStore 是一个简化版，和第 14 章实验台中的相同。</p><p>现在点击“加入”后，购物车的数量不变。原因：每次调用 useCart，都创建一个新 store。</p><ol><li>只补全 useStore 中的一行 TODO：把新建的 store 存入 stores，键是 id。</li><li>确认点击后，CartBadge 显示新的数量和总价。</li></ol>',
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
    'store 只有一个实例。第一次调用 useXxxStore() 时创建 store。之后，所有组件得到同一个 store。第 14 章开头的图和“深入：defineStore 的实现”讲了它。',
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
  title: '让两个组件共享购物车', ch: 14,
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
    '状态要在函数外部只创建一次，所有组件才能共享。第 14 章的实验台“两个组件共享任务 store”讲了这个思路。Pinia 的 defineStore 也这样做。',
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
