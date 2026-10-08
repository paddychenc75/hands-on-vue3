import type { Exercise } from './types'
import { sub } from './types'

// 第 37 章的两道练习：用纯 Vue 模拟 Nuxt 两个 API 的核心机制。Nuxt 本身无法在页面练习环境里运行。

// =====================================================================
// 练习一：迷你 useAsyncData（服务端取到的数据进 payload，客户端水合时直接用）
// =====================================================================
const AD_HEAD = `// ===== 已给出：假的 Nuxt 运行环境 =====
// phase 是当前运行在哪一端；payload 是服务器写进 HTML 的数据；requests 记录每次发出的请求
const nuxtApp = { phase: 'server', payload: {}, requests: [] }
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function fakeFetch(url) {
  nuxtApp.requests.push(nuxtApp.phase + ' ' + url)
  await sleep(5)
  return { url, from: nuxtApp.phase }       // from 记录这份数据是在哪一端取到的
}

// ===== 你来写：useAsyncData(key, handler) =====
// 返回 Promise<{ data }>，data 是 ref。
`
const AD_START = `async function useAsyncData(key, handler) {
  // TODO：
  // 浏览器端、payload 里已经有 key 的数据 → 直接用它，不调用 handler
  // 否则调用 handler 取数据；在服务器端，还要把结果存进 nuxtApp.payload[key]
}
`
const AD_SOL = `async function useAsyncData(key, handler) {
  const data = ref(null)
  if (nuxtApp.phase === 'client' && key in nuxtApp.payload) {
    data.value = nuxtApp.payload[key]            // 水合：直接用服务器取到的数据
  } else {
    data.value = await handler()                 // 没有现成的数据才请求
    if (nuxtApp.phase === 'server') nuxtApp.payload[key] = data.value   // 服务器：存进 payload
  }
  return { data }
}
`
const AD_TAIL = `
// ===== 已给出：两个页面，和“服务器渲染、浏览器水合、浏览器里跳转”三个阶段 =====
async function productsPage() {
  const { data } = await useAsyncData('products', () => fakeFetch('/api/products'))
  return data.value
}
async function detailPage(id) {
  const { data } = await useAsyncData('detail-' + id, () => fakeFetch('/api/detail/' + id))
  return data.value
}

const out = ref('运行中…')
onMounted(async () => {
  // 1. 服务器渲染商品页，payload 序列化成字符串写进 HTML
  nuxtApp.phase = 'server'
  nuxtApp.payload = {}
  await productsPage()
  const html = JSON.stringify(nuxtApp.payload)
  // 2. 浏览器收到 HTML，取回 payload，水合同一个页面
  nuxtApp.phase = 'client'
  nuxtApp.payload = JSON.parse(html)
  const hydrated = await productsPage()
  // 3. 用户在浏览器里点链接，跳到详情页（payload 里没有它的数据）
  const detail = await detailPage(2)
  out.value = '请求：' + (nuxtApp.requests.join(' | ') || '无') +
    '\\n水合后的商品数据来自：' + (hydrated || {}).from +
    '\\n跳转后的详情数据来自：' + (detail || {}).from +
    '\\npayload 的键：' + Object.keys(JSON.parse(html)).join(',')
})

return { out, useAsyncData }`

export const nuxtAsyncData: Exercise = {
  title: '实现：迷你 useAsyncData，服务端取过的数据不再请求', ch: 37,
  lazy: true,
  task: '<p>说明：Nuxt 不能在练习台运行。脚本用一个假的环境模拟它：<code>nuxtApp.phase</code> 表示当前在服务器还是浏览器，<code>nuxtApp.payload</code> 是服务器写进 HTML 的数据。</p><p>页面在三个阶段调用 <code>useAsyncData</code>：服务器渲染商品页，浏览器水合同一页，用户在浏览器里跳到详情页。实现 <code>useAsyncData(key, handler)</code>，让请求只发出必要的次数。</p><ol><li>服务器端：调用 <code>handler</code> 取数据，把结果存进 <code>nuxtApp.payload[key]</code>。</li><li>浏览器端，payload 里有这个 key：直接用，不调用 <code>handler</code>。</li><li>浏览器端，payload 里没有这个 key：调用 <code>handler</code>。</li></ol><p>确认：只有两次请求，一次在服务器，一次在浏览器跳转之后。</p>',
  tpl: '<pre class="out">{{ out }}</pre>',
  js: AD_HEAD + AD_START + AD_TAIL,
  solJs: AD_HEAD + AD_SOL + AD_TAIL,
  hints: [
    '要回答的问题是：这个 key 的数据，现在有没有现成的？浏览器水合时，服务器已经取过商品数据，放在 payload 里；浏览器跳转到详情页时，payload 里没有详情的数据，只能请求。第 37 章 37.3 节讲了 useFetch 和 useAsyncData 怎样用 payload。',
    '用 nuxtApp.phase 区分两端。浏览器端并且 key in nuxtApp.payload：把 payload[key] 放进 data。其余情况：data.value = await handler()；如果在服务器端，再把 data.value 存进 nuxtApp.payload[key]。别忘了返回 { data }。',
    AD_SOL
  ],
  async check(T) {
    await T.waitFor(() => /payload 的键/.test((T.$('.out') || {}).textContent || ''), 1500)
    const text = (T.$('.out') || {}).textContent || ''
    T.ok(/请求：server \/api\/products \| client \/api\/detail\/2\n/.test(text + '\n'), '只发出两次请求：服务器取商品，浏览器跳转后取详情，水合时不再请求（当前：' + (text.split('\n')[0] || '空') + '）')
    T.ok(/水合后的商品数据来自：server/.test(text), '水合时直接用 payload 里服务器取到的商品数据')
    T.ok(/跳转后的详情数据来自：client/.test(text), '跳转后详情数据由浏览器自己取，而且不是商品数据')
    T.ok(/payload 的键：products\s*$/.test(text), '服务器只把商品数据按 key 存进 payload（当前：' + (text.split('\n').pop() || '') + '）')
  },
  wrong: [
    {
      js: sub(AD_HEAD + AD_SOL + AD_TAIL, "if (nuxtApp.phase === 'client' && key in nuxtApp.payload) {", "if (false) {"),
      why: '浏览器水合时没有用 payload，又请求了一遍。服务器已经取过的数据，浏览器重复请求既浪费，又可能得到和服务器不同的结果，造成水合不匹配。payload 存在的意义就是避免这次重复。',
      expectFail: /只发出两次请求/
    },
    {
      js: sub(AD_HEAD + AD_SOL + AD_TAIL, "if (nuxtApp.phase === 'server') nuxtApp.payload[key] = data.value", ""),
      why: '服务器取了数据，却没有存进 payload。HTML 里没有这份数据，浏览器水合时只能重新请求。',
      expectFail: /只发出两次请求|payload 里服务器取到的/
    },
    {
      js: sub(AD_HEAD + AD_SOL + AD_TAIL, "key in nuxtApp.payload", "Object.keys(nuxtApp.payload).length > 0"),
      why: '只看 payload 里有没有数据，不看 key。浏览器跳转到详情页时，payload 里有商品数据，于是详情页拿到了商品数据。每份数据必须按 key 存取，key 一样才算同一份数据。',
      expectFail: /跳转后详情数据由浏览器自己取/
    },
    {
      js: sub(AD_HEAD + AD_SOL + AD_TAIL, "  } else {\n    data.value = await handler()                 // 没有现成的数据才请求\n    if (nuxtApp.phase === 'server') nuxtApp.payload[key] = data.value   // 服务器：存进 payload\n  }", "  } else if (nuxtApp.phase === 'server') {\n    data.value = await handler()\n    nuxtApp.payload[key] = data.value\n  }"),
      why: '浏览器端不再请求。水合时没问题，但用户在浏览器里跳转到 payload 里没有数据的页面时，页面拿不到任何数据。浏览器端仍要在没有现成数据时自己请求。',
      expectFail: /请求：|跳转后/
    }
  ],
  faded: {
    js: AD_HEAD + `async function useAsyncData(key, handler) {
  const data = ref(null)
  if (/* ✏️ 浏览器端，并且 payload 里已经有这个 key */) {
    data.value = nuxtApp.payload[key]
  } else {
    data.value = await handler()
    /* ✏️ 在服务器端，把结果存进 payload，浏览器才拿得到 */
  }
  return { data }
}
` + AD_TAIL
  }
}

// =====================================================================
// 练习二：迷你 useState（按请求隔离的共享状态）
// =====================================================================
const US_HEAD = `// ===== 已给出：一个服务器进程处理很多请求 =====
// currentApp 是当前正在处理的那个请求自己的“应用”（真实的 Nuxt 在 composable 里自动找到它）
let currentApp = null
let initCalls = 0

// ===== 你来写：useState(key, init) =====
// 同一个请求里，同一个 key 返回同一个 ref；不同请求之间互不影响。
`
const US_START = `function useState(key, init) {
  // TODO：状态放在 currentApp.state 上。这个 key 还没有 ref 时，用 init() 的结果创建一个
}
`
const US_SOL = `function useState(key, init) {
  const state = currentApp.state
  if (!(key in state)) state[key] = ref(init ? init() : undefined)
  return state[key]
}
`
const US_TAIL = `
// ===== 已给出：两个组件，两个用户的请求 =====
function useUser() {
  return useState('user', () => { initCalls++; return null })
}
function Page(name) {
  const user = useUser()                    // 组件 A 取用户
  if (user.value === null) user.value = name   // 请求里第一个看到“没有用户”的组件，写入当前用户
  const count = useState('count', () => 0)
  count.value++
  const same = useUser() === user           // 组件 B 取用户，应该和 A 是同一个 ref
  return { greeting: '你好，' + user.value, count: count.value, same }
}
function handleRequest(name) {
  currentApp = { state: {} }                // 每个请求一个新的应用
  return Page(name)
}

const a = handleRequest('小明')
const b = handleRequest('小红')
const line = (r) => r.greeting + '，count=' + r.count + '，同一个 ref=' + r.same
const out = ref('A：' + line(a) + '\\nB：' + line(b) + '\\ninit 调用 ' + initCalls + ' 次')

return { out, useState }`

export const nuxtUseState: Exercise = {
  title: '实现：迷你 useState，按请求隔离的共享状态', ch: 37,
  task: '<p>说明：Nuxt 不能在练习台运行。脚本模拟一个服务器进程依次处理两个用户的请求。每个请求开始时，<code>currentApp</code> 换成一个新的应用对象。</p><p>实现 <code>useState(key, init)</code>：</p><ol><li>状态放在当前请求的 <code>currentApp.state</code> 上，不要放在函数外面的变量里。</li><li>同一个请求里，同一个 key 返回同一个 ref，<code>init</code> 只在第一次创建时调用。</li><li>不同的 key 是不同的 ref。</li></ol><p>确认：两个用户各自看到自己的名字，两个组件拿到同一个 ref，<code>init</code> 一共调用 2 次（每个请求一次）。</p>',
  tpl: '<pre class="out">{{ out }}</pre>',
  js: US_HEAD + US_START + US_TAIL,
  solJs: US_HEAD + US_SOL + US_TAIL,
  hints: [
    '状态要“跟着请求走”。每个请求开始时，handleRequest 把 currentApp 换成新对象，所以放在 currentApp.state 上的东西，下一个请求自然看不到。第 37 章 37.4 节讲了为什么 useState 这样设计。',
    '用 key 在 currentApp.state 上查找：没有就创建 ref(init ? init() : undefined) 并存进去；最后返回 state[key]。查找要按 key，两个不同的 key 要得到两个不同的 ref。',
    US_SOL
  ],
  async check(T) {
    const text = (T.$('.out') || {}).textContent || ''
    T.ok(/A：你好，小明/.test(text), '第一个请求的用户看到自己的名字“小明”（当前：' + (text.split('\n')[0] || '空') + '）')
    T.ok(/B：你好，小红/.test(text), '第二个请求的用户看到自己的名字“小红”，不是上一个用户的（当前：' + (text.split('\n')[1] || '空') + '）')
    T.ok(/A：.*count=1，.*B：.*count=1，/s.test(text), '两个请求的 count 都从 0 开始，各自加 1，不同的 key 互不干扰')
    T.ok(/同一个 ref=true[\s\S]*同一个 ref=true/.test(text), '同一个请求里，同一个 key 返回同一个 ref')
    T.ok(/init 调用 2 次/.test(text), 'init 每个请求只调用一次，一共 2 次（当前：' + (text.split('\n')[2] || '空') + '）')
  },
  wrong: [
    {
      js: sub(US_HEAD + US_SOL + US_TAIL, "function useState(key, init) {\n  const state = currentApp.state\n  if (!(key in state)) state[key] = ref(init ? init() : undefined)\n  return state[key]\n}", "const shared = {}\nfunction useState(key, init) {\n  if (!(key in shared)) shared[key] = ref(init ? init() : undefined)\n  return shared[key]\n}"),
      why: '状态放在函数外面，整个进程只有一份。第一个用户写入的名字留在里面，第二个用户的请求读到的是“小明”。这就是模块级状态在服务器上的问题，也是 useState 存在的原因。',
      expectFail: /第二个请求的用户看到自己的名字/
    },
    {
      js: sub(US_HEAD + US_SOL + US_TAIL, "  if (!(key in state)) state[key] = ref(init ? init() : undefined)\n  return state[key]", "  return ref(init ? init() : undefined)"),
      why: '每次调用都创建新的 ref。同一个请求里，两个组件拿到的是两个不同的 ref，改了一个另一个看不到。useState 的意义是同一个 key 在同一个请求里共享。',
      expectFail: /同一个请求里，同一个 key 返回同一个 ref/
    },
    {
      js: sub(US_HEAD + US_SOL + US_TAIL, "if (!(key in state)) state[key] = ref(init ? init() : undefined)\n  return state[key]", "if (!state.value) state.value = ref(init ? init() : undefined)\n  return state.value"),
      why: '没有按 key 区分，一个请求里所有的 useState 共用一个 ref。user 和 count 变成同一个值，count 加 1 把名字变成了 NaN。',
      expectFail: /名字|count 都从 0 开始/
    }
  ],
  faded: {
    js: US_HEAD + `function useState(key, init) {
  const state = /* ✏️ 当前请求自己的状态对象 */
  if (/* ✏️ 这个 key 还没有 ref */) state[key] = ref(init ? init() : undefined)
  return /* ✏️ 这个 key 对应的 ref */
}
` + US_TAIL
  }
}
