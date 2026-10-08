import type { Exercise } from './types'
import { nextTick } from 'vue'

export const counterFill: Exercise = {
  title: '补全：一个计数器组合式函数', ch: 8,
  task: '<p>useCounter 已经基本写好。只补全两行 TODO。</p><ol><li>TODO 1：用 ref 创建 count，初始值是 initial。</li><li>TODO 2：在 inc 中让 count 加 1。</li><li>确认“赞”和“收藏”互不影响。</li></ol>',
  tpl: '<button @click="like">赞 {{ likes }}</button>\n<button @click="star">收藏 {{ stars }}</button>',
  js: `function useCounter(initial = 0) {
  const count = null   // TODO 1：用 ref 创建，初始值是 initial
  function inc() {
    // TODO 2：让 count 加 1
  }
  return { count, inc }
}

// 已给出：调用两次，得到两个计数器
const { count: likes, inc: like } = useCounter(0)
const { count: stars, inc: star } = useCounter(10)

return { likes, like, stars, star }`,
  solJs: `function useCounter(initial = 0) {
  const count = ref(initial)   // 每次调用都创建新的 ref
  function inc() {
    count.value++
  }
  return { count, inc }
}

// 已给出：调用两次，得到两个计数器
const { count: likes, inc: like } = useCounter(0)
const { count: stars, inc: star } = useCounter(10)

return { likes, like, stars, star }`,
  faded: {
    js: `function useCounter(initial = 0) {
  const count = /* ✏️ 每次调用都新建一份响应式数据，初始值是 initial */ null
  function inc() {
    /* ✏️ 让 count 加 1（脚本里读写 ref 要用 .value） */
  }
  return { count, inc }
}

// 已给出：调用两次，得到两个计数器
const { count: likes, inc: like } = useCounter(0)
const { count: stars, inc: star } = useCounter(10)

return { likes, like, stars, star }`
  },
  hints: [
    '组合式函数每次被调用，都用 ref 创建新的数据。所以两个计数器互不影响。第 8 章开头的图讲了这一点。',
    'TODO 1：把 null 改为 ref(…)，参数是 initial。TODO 2：在 inc 中修改 count.value。在脚本中，ref 要写 .value。',
    'const count = ref(initial)\nfunction inc() {\n  count.value++\n}'
  ],
  async check(T) {
    const num = t => { const b = T.btn(t); const m = b && b.textContent.match(/(\d+)/); return m ? +m[1] : NaN; };
    T.ok(!!T.btn('赞') && !!T.btn('收藏'), '渲染出“赞”和“收藏”两个按钮');
    if (!T.btn('赞') || !T.btn('收藏')) return;
    T.ok(num('赞') === 0 && num('收藏') === 10, '初始：赞 0，收藏 10（当前：赞 ' + num('赞') + '，收藏 ' + num('收藏') + '）');
    await T.click(T.btn('赞'));
    T.ok(num('赞') === 1, '点击“赞”后显示 1');
    T.ok(num('收藏') === 10, '“收藏”不受影响，仍是 10');
    await T.click(T.btn('收藏'));
    T.ok(num('收藏') === 11 && num('赞') === 1, '点击“收藏”后显示 11，“赞”仍是 1');
  },
  wrong: [
    { js: 'const count = ref(0)   // 放在函数外，所有调用共享\nfunction useCounter(initial = 0) {\n  function inc() {\n    count.value++\n  }\n  return { count, inc }\n}\n\n// 已给出：调用两次，得到两个计数器\nconst { count: likes, inc: like } = useCounter(0)\nconst { count: stars, inc: star } = useCounter(10)\n\nreturn { likes, like, stars, star }', why: '把 ref 写在函数外面。两次调用共用同一个 count：点“赞”会同时改变“收藏”，初始值 initial 也没有用上。' },
    { js: 'function useCounter(initial = 0) {\n  const count = ref(initial)   // 每次调用都创建新的 ref\n  function inc() {\n    count++\n  }\n  return { count, inc }\n}\n\n// 已给出：调用两次，得到两个计数器\nconst { count: likes, inc: like } = useCounter(0)\nconst { count: stars, inc: star } = useCounter(10)\n\nreturn { likes, like, stars, star }', why: '在脚本里对 ref 直接 count++，没有写 .value。count 是 const，重新赋值会报 Assignment to constant variable。即使改成 let，count++ 也只是把 ref 对象换成 NaN，不会改变它的值。', expectFail: /点击“赞”/ }
  ]
}

export const toggle: Exercise = {
  title: '写一个组合式函数', ch: 8,
  task: '<ol><li>在 useToggle 中，用 ref 保存开关状态。</li><li>返回 { on, toggle }。</li><li>确认两个开关互不影响。</li></ol>',
  tpl: '<button @click="toggleWifi">Wi-Fi：{{ wifiOn ? \'开\' : \'关\' }}</button>\n<button @click="toggleBt">蓝牙：{{ btOn ? \'开\' : \'关\' }}</button>',
  js: 'function useToggle(initial = false) {\n  // TODO：用 ref 保存状态，返回 { on, toggle }\n}\n\nconst { on: wifiOn, toggle: toggleWifi } = useToggle(false)\nconst { on: btOn, toggle: toggleBt } = useToggle(true)\n\nreturn { wifiOn, toggleWifi, btOn, toggleBt }',
  solJs: 'function useToggle(initial = false) {\n  const on = ref(initial)\n  const toggle = () => { on.value = !on.value }\n  return { on, toggle }\n}\n\nconst { on: wifiOn, toggle: toggleWifi } = useToggle(false)\nconst { on: btOn, toggle: toggleBt } = useToggle(true)\n\nreturn { wifiOn, toggleWifi, btOn, toggleBt }',
  faded: {
    js: `function useToggle(initial = false) {
  const on = /* ✏️ 用 ref 保存开关状态，初始值是 initial */ null
  const toggle = () => { /* ✏️ 把 on 取反 */ }
  return { on, toggle }
}

const { on: wifiOn, toggle: toggleWifi } = useToggle(false)
const { on: btOn, toggle: toggleBt } = useToggle(true)

return { wifiOn, toggleWifi, btOn, toggleBt }`
  },
  hints: [
'组合式函数是普通函数。每次调用都用 ref 创建新数据，所以两次调用互不影响。第 8 章开头的图讲了这一点。',
'在 useToggle 中写三行：1. 用 ref(initial) 创建 on。2. 写一个函数 toggle，把 on.value 取反。3. 返回 { on, toggle }。',
'function useToggle(initial = false) {\n  const on = ref(initial)\n  const toggle = () => { on.value = !on.value }\n  return { on, toggle }\n}'
],
  async check(T) {
    const w = () => T.btn('Wi-Fi'), bt = () => T.btn('蓝牙');
    T.ok(!!w() && !!bt(), '渲染出两个开关按钮');
    if (!w() || !bt()) return;
    T.ok(/关/.test(w().textContent) && /开/.test(bt().textContent), '初始：Wi-Fi 关，蓝牙 开');
    await T.click(w());
    T.ok(/开/.test(w().textContent), '点击 Wi-Fi 后变为开');
    T.ok(/开/.test(bt().textContent), '蓝牙不受影响，仍然是开');
    await T.click(bt());
    T.ok(/关/.test(bt().textContent), '点击蓝牙后变为关');
  },
  wrong: [
    { js: 'const on = ref(false)   // 放在函数外，所有调用共享\nfunction useToggle(initial = false) {\n  const toggle = () => { on.value = !on.value }\n  return { on, toggle }\n}\n\nconst { on: wifiOn, toggle: toggleWifi } = useToggle(false)\nconst { on: btOn, toggle: toggleBt } = useToggle(true)\n\nreturn { wifiOn, toggleWifi, btOn, toggleBt }', why: '把 ref 放在函数外面。两个开关共享同一个状态，点一个会改变另一个，initial 参数也不起作用。' },
    { js: 'function useToggle(initial = false) {\n  const on = ref(initial)\n  const toggle = () => { on.value = !on.value }\n  return { on: on.value, toggle }\n}\n\nconst { on: wifiOn, toggle: toggleWifi } = useToggle(false)\nconst { on: btOn, toggle: toggleBt } = useToggle(true)\n\nreturn { wifiOn, toggleWifi, btOn, toggleBt }', why: '返回了 on.value，也就是一个普通布尔值，丢掉了 ref。点击后 toggle 改的是 ref，页面上的值不再更新。' }
  ]
}

export const eventListener: Exercise = {
  title: '写一个 useEventListener：卸载后不再响应', ch: 8,
  task: '<p>Panel 组件在 setup 中调用 <code>useEventListener(window, \'task-ping\', 处理函数)</code>，每收到一次事件就加 1。补全 useEventListener：</p><ol><li>组件挂载后，给 target 添加监听。</li><li>组件卸载时，删除这个监听。</li></ol><p>判题会先触发几次事件，再卸载 Panel，卸载后继续触发事件，最后重新挂载 Panel。卸载后处理函数不能再运行，重新挂载后每次事件只能运行一次。</p>',
  tpl: '<button @click="show = !show">{{ show ? \'卸载\' : \'挂载\' }} Panel</button>\n<Panel v-if="show" />',
  js: `function useEventListener(target, event, handler) {
  // TODO：挂载后添加监听，卸载时删除监听
}

const hits = { n: 0 }   // 记录处理函数一共运行了几次

const Panel = {
  setup() {
    const count = ref(0)
    useEventListener(window, 'task-ping', () => { count.value++; hits.n++ })
    return { count }
  },
  template: '<p class="count">收到 {{ count }} 次</p>'
}

const show = ref(true)
return { show, getHits: () => hits.n, components: { Panel } }`,
  solJs: `function useEventListener(target, event, handler) {
  onMounted(() => target.addEventListener(event, handler))
  onUnmounted(() => target.removeEventListener(event, handler))   // 传入添加时的同一个函数
}

const hits = { n: 0 }   // 记录处理函数一共运行了几次

const Panel = {
  setup() {
    const count = ref(0)
    useEventListener(window, 'task-ping', () => { count.value++; hits.n++ })
    return { count }
  },
  template: '<p class="count">收到 {{ count }} 次</p>'
}

const show = ref(true)
return { show, getHits: () => hits.n, components: { Panel } }`,
  faded: {
    js: `function useEventListener(target, event, handler) {
  onMounted(() => { /* ✏️ 给 target 添加 event 监听 */ })
  onUnmounted(() => { /* ✏️ 删除同一个监听 */ })
}

const hits = { n: 0 }   // 记录处理函数一共运行了几次

const Panel = {
  setup() {
    const count = ref(0)
    useEventListener(window, 'task-ping', () => { count.value++; hits.n++ })
    return { count }
  },
  template: '<p class="count">收到 {{ count }} 次</p>'
}

const show = ref(true)
return { show, getHits: () => hits.n, components: { Panel } }`
  },
  hints: [
    '监听加在 window 上，不属于组件，Vue 不会替你删除。组合式函数要自己清理。第 8 章“8.1 把逻辑提取为 useMouse”里的 useMouse 就是这样写的。',
    '用 onMounted 调用 target.addEventListener(event, handler)，用 onUnmounted 调用 target.removeEventListener(event, handler)。删除时要传入添加时的同一个 handler。',
    'onMounted(() => target.addEventListener(event, handler))\nonUnmounted(() => target.removeEventListener(event, handler))'
  ],
  async check(T) {
    const root = T.$(':scope > div') as any
    const inst = root && root._vnode && root._vnode.component
    const hits = () => (inst && inst.setupState.getHits ? inst.setupState.getHits() : NaN)
    const ping = async () => { window.dispatchEvent(new Event('task-ping')); await nextTick() }
    const countText = () => (T.$('.count') || {}).textContent || ''
    T.ok(/收到 0 次/.test(countText()), '初始显示“收到 0 次”')
    await ping(); await ping()
    T.ok(/收到 2 次/.test(countText()), '触发 2 次事件后，Panel 显示“收到 2 次”（当前：' + countText().trim() + '）')
    await T.click(T.btn('卸载'))
    T.ok(!T.$('.count'), '点击“卸载”后，Panel 消失')
    const before = hits()
    await ping(); await ping()
    T.ok(hits() === before, '卸载后再触发 2 次事件，处理函数不能再运行（多运行了 ' + (hits() - before) + ' 次）')
    await T.click(T.btn('挂载'))
    const mid = hits()
    await ping()
    T.ok(hits() - mid === 1, '重新挂载后触发 1 次事件，处理函数只运行 1 次（实际 ' + (hits() - mid) + ' 次）')
    T.ok(/收到 1 次/.test(countText()), '新的 Panel 显示“收到 1 次”')
  },
  wrong: [
    { js: `function useEventListener(target, event, handler) {
  onMounted(() => target.addEventListener(event, handler))
}

const hits = { n: 0 }   // 记录处理函数一共运行了几次

const Panel = {
  setup() {
    const count = ref(0)
    useEventListener(window, 'task-ping', () => { count.value++; hits.n++ })
    return { count }
  },
  template: '<p class="count">收到 {{ count }} 次</p>'
}

const show = ref(true)
return { show, getHits: () => hits.n, components: { Panel } }`, why: '只添加了监听，没有清理。Panel 卸载后，window 上的监听还在，处理函数继续运行（内存泄漏）。', expectFail: /卸载后再触发/ },
    { js: `function useEventListener(target, event, handler) {
  onMounted(() => target.addEventListener(event, handler))
  onUnmounted(() => target.removeEventListener(event, () => handler()))
}

const hits = { n: 0 }   // 记录处理函数一共运行了几次

const Panel = {
  setup() {
    const count = ref(0)
    useEventListener(window, 'task-ping', () => { count.value++; hits.n++ })
    return { count }
  },
  template: '<p class="count">收到 {{ count }} 次</p>'
}

const show = ref(true)
return { show, getHits: () => hits.n, components: { Panel } }`, why: 'removeEventListener 收到的是一个新创建的箭头函数，和添加时的函数不是同一个，所以监听没有被删除。必须传入添加时的同一个 handler。', expectFail: /卸载后再触发/ }
  ]
}

export const getterParam: Exercise = {
  title: '修复：id 变了，请求的还是旧地址', ch: 8,
  task: '<p>User 组件把 <code>props.id</code> 拼成地址，传给组合式函数 useUser。父组件把 id 从 1 换成 2，页面仍显示用户 1 的名字。修复它：</p><ol><li>调用方传一个 getter，而不是拼好的字符串。</li><li>useUser 用 <code>toValue</code> 读取地址，让 id 变化时自动重新请求。</li></ol><p>不要用 <code>:key</code> 重建 User 组件：判题会检查 User 只创建了一次。</p>',
  tpl: '<button @click="id = 1">用户 1</button>\n<button @click="id = 2">用户 2</button>\n<User :id="id" />',
  js: `const db = { 1: 'Alice', 2: 'Bob' }
const fetchName = (url) => Promise.resolve(db[url.split('/').pop()])   // 模拟请求

function useUser(url) {
  const name = ref('加载中…')
  watchEffect(async () => {
    name.value = await fetchName(url)
  })
  return { name }
}

let created = 0
const User = {
  props: ['id'],
  setup(props) {
    created++
    const { name } = useUser('/api/user/' + props.id)   // 调用时就读了 props.id
    return { name }
  },
  template: '<p class="name">{{ name }}</p>'
}

const id = ref(1)
return { id, getCreated: () => created, components: { User } }`,
  solJs: `const db = { 1: 'Alice', 2: 'Bob' }
const fetchName = (url) => Promise.resolve(db[url.split('/').pop()])   // 模拟请求

function useUser(url) {
  const name = ref('加载中…')
  watchEffect(async () => {
    name.value = await fetchName(toValue(url))   // 在 watchEffect 中读取，id 变化时重新运行
  })
  return { name }
}

let created = 0
const User = {
  props: ['id'],
  setup(props) {
    created++
    const { name } = useUser(() => '/api/user/' + props.id)   // 传 getter
    return { name }
  },
  template: '<p class="name">{{ name }}</p>'
}

const id = ref(1)
return { id, getCreated: () => created, components: { User } }`,
  faded: {
    js: `const db = { 1: 'Alice', 2: 'Bob' }
const fetchName = (url) => Promise.resolve(db[url.split('/').pop()])   // 模拟请求

function useUser(url) {
  const name = ref('加载中…')
  watchEffect(async () => {
    const u = /* ✏️ 用 toValue 把 url 读成字符串（url 可能是字符串、ref 或 getter） */ url
    name.value = await fetchName(u)
  })
  return { name }
}

let created = 0
const User = {
  props: ['id'],
  setup(props) {
    created++
    const { name } = useUser(/* ✏️ 传一个 getter：() => …… */ () => 0)
    return { name }
  },
  template: '<p class="name">{{ name }}</p>'
}

const id = ref(1)
return { id, getCreated: () => created, components: { User } }`
  },
  hints: [
    '`useUser(\'/api/user/\' + props.id)` 在调用时就读了 props.id，传进去的只是一个字符串，id 变化时函数收不到。第 8 章“8.4 用 toValue 接收 ref、getter 或普通值”讲了这个问题。',
    '两处都要改：1. 调用方：`useUser(() => \'/api/user/\' + props.id)`。2. useUser 里，在 watchEffect 中用 `toValue(url)` 读取地址。toValue 要在 await 之前调用，这样地址才会成为依赖。',
    '调用方传 getter：useUser(() => \'/api/user/\' + props.id)。useUser 里：name.value = await fetchName(toValue(url))。'
  ],
  async check(T) {
    const root = T.$(':scope > div') as any
    const inst = root && root._vnode && root._vnode.component
    const created = () => (inst && inst.setupState.getCreated ? inst.setupState.getCreated() : NaN)
    const nameText = () => ((T.$('.name') || {}).textContent || '').trim()
    await T.settle()
    T.ok(nameText() === 'Alice', '初始显示 Alice（当前：' + nameText() + '）')
    await T.click(T.btn('用户 2'))
    await T.settle()
    T.ok(nameText() === 'Bob', '把 id 换成 2 后显示 Bob（当前：' + nameText() + '）')
    await T.click(T.btn('用户 1'))
    await T.settle()
    T.ok(nameText() === 'Alice', '换回 1 后显示 Alice（当前：' + nameText() + '）')
    T.ok(created() === 1, 'User 组件只创建了 1 次（用重建组件绕过问题不算；当前 ' + created() + ' 次）')
  },
  wrong: [
    { js: `const db = { 1: 'Alice', 2: 'Bob' }
const fetchName = (url) => Promise.resolve(db[url.split('/').pop()])   // 模拟请求

function useUser(url) {
  const name = ref('加载中…')
  watchEffect(async () => {
    name.value = await fetchName(toValue(url))
  })
  return { name }
}

let created = 0
const User = {
  props: ['id'],
  setup(props) {
    created++
    const { name } = useUser('/api/user/' + props.id)
    return { name }
  },
  template: '<p class="name">{{ name }}</p>'
}

const id = ref(1)
return { id, getCreated: () => created, components: { User } }`, why: '只改了 useUser。调用方传的仍是拼好的字符串，toValue 读到的永远是第一次的地址，id 变化时 watchEffect 没有依赖，不会重新运行。', expectFail: /显示 Bob/ },
    { tpl: '<button @click="id = 1">用户 1</button>\n<button @click="id = 2">用户 2</button>\n<User :key="id" :id="id" />', why: '给 User 加 :key 能让页面显示对，但每次换 id 都销毁并重新创建组件，状态全部丢失。题目要求的是让组合式函数接收 getter。', expectFail: /只创建了 1 次/ },
    { js: `const db = { 1: 'Alice', 2: 'Bob' }
const fetchName = (url) => Promise.resolve(db[url.split('/').pop()])   // 模拟请求

function useUser(url) {
  const name = ref('加载中…')
  watchEffect(async () => {
    name.value = await fetchName(url)
  })
  return { name }
}

let created = 0
const User = {
  props: ['id'],
  setup(props) {
    created++
    const { name } = useUser(() => '/api/user/' + props.id)
    return { name }
  },
  template: '<p class="name">{{ name }}</p>'
}

const id = ref(1)
return { id, getCreated: () => created, components: { User } }`, why: '只改了调用方。useUser 没有用 toValue 读取，把 getter 函数直接当成地址传给 fetchName，请求出错，页面不显示名字。', expectFail: /Alice/ }
  ]
}
