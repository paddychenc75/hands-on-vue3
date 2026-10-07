import type { Exercise } from './types'
import { isReactive, nextTick } from 'vue'

export const shallowBig: Exercise = {
  title: '用 shallowRef 保存大数组', ch: 21,
  task: '<p>items 有 20000 条数据。页面只整体替换这些数据。ref 会为读取到的每个元素创建响应式代理。</p><ol><li>把 <code>ref</code> 改为 <code>shallowRef</code>。</li><li>修改 refresh：不修改数组元素，而是创建新数组，然后赋值给 <code>items.value</code>。</li><li>点击“刷新”，确认第一条更新。</li></ol>',
  tpl: '<p>共 {{ items.length }} 条</p>\n<p>第一条：{{ items[0].name }}</p>\n<button @click="refresh">刷新</button>',
  js: `const list = Array.from({ length: 20000 }, (_, i) => ({ id: i, name: '商品 ' + i }))
const items = ref(list)
let version = 0

function refresh() {
  version++
  items.value[0].name = '商品 0（第 ' + version + ' 次刷新）'
}

return { items, refresh }`,
  solJs: `const list = Array.from({ length: 20000 }, (_, i) => ({ id: i, name: '商品 ' + i }))
const items = shallowRef(list)   // 只跟踪 .value，不代理元素
let version = 0

function refresh() {
  version++
  const next = items.value.slice()                 // 新数组
  next[0] = { ...next[0], name: '商品 0（第 ' + version + ' 次刷新）' }
  items.value = next                               // 替换 .value，触发更新
}

return { items, refresh }`,
  hints: [
    'shallowRef 只跟踪 .value 的替换，不代理元素。所以要替换整个数组才能触发更新。第 21 章“21.4 减少响应式的开销”的表格讲了它。',
    '1. 把 ref(list) 改为 shallowRef(list)。2. 在 refresh 中：复制数组，替换第 0 项为新对象，然后把新数组赋给 items.value。',
    'const items = shallowRef(list)\n\nfunction refresh() {\n  version++\n  const next = items.value.slice()\n  next[0] = { ...next[0], name: \'商品 0（第 \' + version + \' 次刷新）\' }\n  items.value = next\n}'
  ]
,
  async check(T) {
    const root = T.$(':scope > div');
    const inst = root && root._vnode && root._vnode.component;   // 根组件实例
    const arr = inst && inst.setupState.items;
    T.ok(Array.isArray(arr) && arr.length === 20000, 'setup 返回 items，包含 20000 条数据');
    if (!Array.isArray(arr)) return;
    T.ok(!isReactive(arr[0]), 'items 的元素不是响应式代理（使用 shallowRef）');
    const first = () => { const p = T.$$('p').find(x => /第一条/.test(x.textContent)); return p ? p.textContent.replace(/^\s*第一条：\s*/, '').trim() : ''; };
    T.ok(first() === '商品 0', '初始第一条是“商品 0”');
    const b = T.btn('刷新');
    if (!b) { T.ok(false, '找到“刷新”按钮'); return; }
    await T.click(b);
    T.ok(/第 1 次刷新/.test(first()), '点击刷新后，第一条更新（当前：' + first() + '）');
    await T.click(T.btn('刷新'));
    T.ok(/第 2 次刷新/.test(first()), '再点一次，显示“第 2 次刷新”');
  }
}

export const fbPerf: Exercise = {
  title: '补全：shallowRef 数组的追加', ch: 21,
  task: '<p>items 有 20000 条数据。页面只整体替换这个数组。所以 items 应该用 shallowRef：它只跟踪 .value，不为每个元素创建代理。</p><ol><li>TODO 1：把 ref 改为 shallowRef。</li><li>TODO 2：在 add 中，把已经建好的新数组 next 赋值给 items.value。原因：shallowRef 只在 .value 被替换时触发更新。</li><li>点击“添加一条”，确认数量和最后一条更新。</li></ol>',
  tpl: '<p>共 {{ items.length }} 条</p>\n<p>最后一条：{{ items[items.length - 1].name }}</p>\n<button @click="add">添加一条</button>',
  js: `const list = Array.from({ length: 20000 }, (_, i) => ({ id: i, name: '商品 ' + i }))
const items = ref(list)   // TODO 1：改用 shallowRef

function add() {
  // 已给出：创建新数组，不修改旧数组
  const next = [...items.value, { id: items.value.length, name: '新商品 ' + items.value.length }]
  // TODO 2：把 next 赋值给 items.value
}

return { items, add }`,
  solJs: `const list = Array.from({ length: 20000 }, (_, i) => ({ id: i, name: '商品 ' + i }))
const items = shallowRef(list)   // 只跟踪 .value，不代理元素

function add() {
  // 已给出：创建新数组，不修改旧数组
  const next = [...items.value, { id: items.value.length, name: '新商品 ' + items.value.length }]
  items.value = next             // 替换 .value，触发更新
}

return { items, add }`,
  hints: [
    'shallowRef 只跟踪 .value 本身。替换 .value 时触发更新。修改数组内部时不触发。第 21 章“21.4 减少响应式的开销”讲了它。',
    'TODO 1：把 ref(list) 改为 shallowRef(list)。TODO 2：在 add 的最后写一个赋值语句，左边是 items.value。',
    'const items = shallowRef(list)\n\nitems.value = next'
  ],
  async check(T) {
    const root = T.$(':scope > div');
    const inst = root && root._vnode && root._vnode.component;
    const arr = inst && inst.setupState.items;
    T.ok(Array.isArray(arr) && arr.length === 20000, 'setup 返回 items，包含 20000 条数据');
    if (!Array.isArray(arr)) return;
    T.ok(!isReactive(arr[0]), 'items 的元素不是响应式代理（使用 shallowRef）');
    const total = () => { const m = T.text().match(/共\s*(\d+)\s*条/); return m ? +m[1] : NaN; };
    const last = () => { const p = T.$$('p').find(x => /最后一条/.test(x.textContent)); return p ? p.textContent.replace(/^\s*最后一条：\s*/, '').trim() : ''; };
    const b = T.btn('添加一条');
    if (!b) { T.ok(false, '找到“添加一条”按钮'); return; }
    await T.click(b);
    T.ok(total() === 20001, '点击后显示“共 20001 条”（当前：' + total() + '）');
    T.ok(last() === '新商品 20000', '最后一条是“新商品 20000”（当前：' + last() + '）');
    await T.click(T.btn('添加一条'));
    T.ok(total() === 20002, '再点一次，显示“共 20002 条”');
  }
}

export const phenoReuse: Exercise = {
  title: '看现象：切换任务后，详情仍是上一个任务', ch: 21,
  task: '<p>TaskDetail 根据 prop id 加载并显示任务。地址从 /task/2 变为 /task/3 时，情况和这里相同。</p><ol><li>页面显示任务 2 的详情。</li><li>点击“任务 3”。“当前 id”变为 3，详情仍是任务 2。</li></ol><p>期望：id 改变后，详情加载并显示新的任务。只修改 TaskDetail 的 setup。</p>',
  tpl: '<button @click="cur = 2">任务 2</button>\n<button @click="cur = 3">任务 3</button>\n<p class="cur">当前 id：{{ cur }}</p>\n<TaskDetail :id="cur" />',
  js: `// ===== 已给出：模拟请求 =====
function fetchTask(id) {
  return new Promise(resolve => setTimeout(() => resolve('任务 ' + id + ' 的详情'), 20))
}

const TaskDetail = {
  props: ['id'],
  setup(props) {
    const text = ref('加载中…')
    fetchTask(props.id).then(t => { text.value = t })
    return { text }
  },
  template: '<p class="detail">{{ text }}</p>'
}

const cur = ref(2)
return { cur, components: { TaskDetail } }`,
  solJs: `// ===== 已给出：模拟请求 =====
function fetchTask(id) {
  return new Promise(resolve => setTimeout(() => resolve('任务 ' + id + ' 的详情'), 20))
}

const TaskDetail = {
  props: ['id'],
  setup(props) {
    const text = ref('加载中…')
    // 组件被复用，setup 只运行一次。跟踪 props.id，每次改变都重新加载
    watch(() => props.id, id => {
      fetchTask(id).then(t => { text.value = t })
    }, { immediate: true })
    return { text }
  },
  template: '<p class="detail">{{ text }}</p>'
}

const cur = ref(2)
return { cur, components: { TaskDetail } }`,
  hints: [
    '原因：id 改变时，Vue 只更新 TaskDetail 的 props，不重新创建组件。setup 只在创建组件时运行一次，所以加载代码只运行了一次。要在 id 每次改变时重新加载。第 19 章 19.5 节的场景讲了这个现象。',
    '在 setup 中跟踪 props.id。数据源写成函数 () => props.id，不写 props.id。第一次也要加载，所以设置立即运行的选项。',
    'watch(() => props.id, id => {\n  fetchTask(id).then(t => { text.value = t })\n}, { immediate: true })'
  ],
  wrong: [
    { js: `function fetchTask(id) {
  return new Promise(resolve => setTimeout(() => resolve('任务 ' + id + ' 的详情'), 20))
}

const TaskDetail = {
  props: ['id'],
  setup(props) {
    const text = ref('加载中…')
    watch(props.id, id => {
      fetchTask(id).then(t => { text.value = t })
    }, { immediate: true })
    return { text }
  },
  template: '<p class="detail">{{ text }}</p>'
}

const cur = ref(2)
return { cur, components: { TaskDetail } }`, why: 'props.id 在调用时就被读取，侦听器收到的是数字 2，不是响应式数据。' },
    { js: `function fetchTask(id) {
  return new Promise(resolve => setTimeout(() => resolve('任务 ' + id + ' 的详情'), 20))
}

const TaskDetail = {
  props: ['id'],
  setup(props) {
    const text = ref('加载中…')
    onMounted(() => {
      fetchTask(props.id).then(t => { text.value = t })
    })
    return { text }
  },
  template: '<p class="detail">{{ text }}</p>'
}

const cur = ref(2)
return { cur, components: { TaskDetail } }`, why: '组件被复用，没有重新挂载，所以 onMounted 也只运行一次。' }
  ],
  async check(T) {
    const wait = n => new Promise(r => setTimeout(r, n));
    const d = () => ((T.$('p.detail') || {}).textContent || '').trim();
    await wait(60);
    T.ok(d() === '任务 2 的详情', '初始显示“任务 2 的详情”（当前：' + d() + '）');
    const b3 = T.btn('任务 3');
    if (!b3) { T.ok(false, '找到“任务 3”按钮'); return; }
    await T.click(b3);
    await wait(60);
    T.ok(d() === '任务 3 的详情', '点击“任务 3”后，显示“任务 3 的详情”（当前：' + d() + '）');
    await T.click(T.btn('任务 2'));
    await wait(60);
    T.ok(d() === '任务 2 的详情', '再点击“任务 2”，显示“任务 2 的详情”（当前：' + d() + '）');
  }
}

export const phenoDebounce: Exercise = {
  title: '看现象：每输入一个字就发一次请求', ch: 21,
  task: '<p>搜索框的内容改变时，代码发送搜索请求。下面的列表记录每个请求。</p><ol><li>在搜索框中快速输入 vue3。列表中有 4 个请求：v、vu、vue、vue3。</li></ol><p>期望：用户停止输入 200 毫秒后，才发送一个请求，内容是最后的关键词。只修改脚本。</p>',
  tpl: '<input class="kw" v-model="keyword" placeholder="搜索">\n<p class="count">请求次数：{{ requests.length }}</p>\n<ul>\n  <li v-for="(q, i) in requests" :key="i">搜索 {{ q }}</li>\n</ul>',
  js: `const keyword = ref('')
const requests = ref([])
function search(q) { requests.value.push(q) }   // 模拟发送请求

watch(keyword, q => {
  search(q)
})

return { keyword, requests }`,
  solJs: `const keyword = ref('')
const requests = ref([])
function search(q) { requests.value.push(q) }   // 模拟发送请求

watch(keyword, (q, _old, onCleanup) => {
  const timer = setTimeout(() => search(q), 200)   // 推迟发送
  onCleanup(() => clearTimeout(timer))              // 下一次输入时，取消上一次推迟
})

return { keyword, requests }`,
  hints: [
    '原因：侦听器在每次输入后立即运行。要等用户停下来：每次输入都把发送推迟一段时间，并且取消上一次还没有发送的那一次。只有最后一次推迟不会被取消。第 21 章 21.6 节讲了这个思路。第 4 章 4.4 节讲了怎样在下一次运行前取消上一次。',
    '在侦听器回调中，用 setTimeout 推迟 200 毫秒调用 search(q)。用回调的第三个参数注册一个清理函数，在其中调用 clearTimeout。',
    'watch(keyword, (q, _old, onCleanup) => {\n  const timer = setTimeout(() => search(q), 200)\n  onCleanup(() => clearTimeout(timer))\n})'
  ],
  wrong: [
    { js: `const keyword = ref('')
const requests = ref([])
function search(q) { requests.value.push(q) }

watch(keyword, q => {
  setTimeout(() => search(q), 200)
})

return { keyword, requests }`, why: '只推迟，没有取消。4 次输入仍然发送 4 个请求，只是晚了 200 毫秒。' },
    { tpl: '<input class="kw" v-model.lazy="keyword" placeholder="搜索">\n<p class="count">请求次数：{{ requests.length }}</p>\n<ul>\n  <li v-for="(q, i) in requests" :key="i">搜索 {{ q }}</li>\n</ul>', js: `const keyword = ref('')
const requests = ref([])
function search(q) { requests.value.push(q) }

watch(keyword, q => {
  search(q)
})

return { keyword, requests }`, why: '.lazy 在 change 事件时才更新，也就是输入框失去焦点或按回车时。用户停止输入后不会自动搜索。' }
  ],
  async check(T) {
    const wait = n => new Promise(r => setTimeout(r, n));
    const input = T.$('input.kw');
    if (!input) { T.ok(false, '找到搜索框'); return; }
    const type = async v => { input.value = v; input.dispatchEvent(new Event('input')); await nextTick(); await wait(20); };
    const list = () => T.$$('li').map(li => li.textContent.trim());
    for (const v of ['v', 'vu', 'vue', 'vue3']) await type(v);
    T.ok(list().length === 0, '快速输入时，还没有发送请求（当前 ' + list().length + ' 个）');
    await wait(260);
    T.ok(list().length === 1 && list()[0] === '搜索 vue3', '停止输入 200 毫秒后，只发送 1 个请求：搜索 vue3（当前：' + (list().join('、') || '无') + '）');
    await type('vue3 教程');
    await wait(260);
    T.ok(list().length === 2 && list()[1] === '搜索 vue3 教程', '再次输入并停止后，发送第 2 个请求（当前：' + (list().join('、') || '无') + '）');
  }
}
