import type { Exercise } from './types'
import { sub } from './types'

// ===================== 39.2 useForm 的核心：按路径读写、dirty、touched、reset =====================
const CORE_TPL = `<form @submit.prevent>
  <p><input class="name" v-model="name" @blur="form.touched['user.name'] = true">
     <input class="city" v-model="city" @blur="form.touched['user.address.city'] = true">
     <input class="tag" v-model="tag">
     <input class="lang" v-model="lang"></p>
  <p>dirty：<b class="d-name">{{ form.isDirty('user.name') }}</b>
     <b class="d-city">{{ form.isDirty('user.address.city') }}</b>
     <b class="d-form">{{ form.isDirty() }}</b></p>
  <p>touched：<span class="touched">{{ Object.keys(form.touched).join() }}</span></p>
  <pre class="vals">{{ JSON.stringify(form.values) }}</pre>
  <button type="button" @click="form.reset()">重置</button>
</form>`
const CORE_HEAD = `// 'user.address.city' 或 'tags[1]' 拆成键的数组
const parse = p => p.split(/[.\\[\\]]/).filter(Boolean)
function getPath(obj, path) {
  return parse(path).reduce((o, k) => o?.[k], obj)
}
`
const CORE_SOL = `// 沿路径写入。中间缺的层要创建：下一个键是数字就建数组，否则建对象
function setPath(obj, path, value) {
  const keys = parse(path)
  const last = keys.pop()
  let cur = obj
  keys.forEach((k, i) => {
    if (cur[k] == null) cur[k] = /^\\d+$/.test(keys[i + 1] ?? last) ? [] : {}
    cur = cur[k]
  })
  cur[last] = value
}

function useForm(initialValues) {
  const initial = structuredClone(initialValues)    // 初始值单独存一份
  const values = reactive(structuredClone(initialValues))
  const touched = reactive({})
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  const isDirty = path => (path ? !same(getPath(values, path), getPath(initial, path)) : !same(values, initial))
  function reset() {
    Object.keys(values).forEach(k => delete values[k])   // 先清掉后来多出来的键
    Object.assign(values, structuredClone(initial))
    Object.keys(touched).forEach(k => delete touched[k])
  }
  const model = path => computed({
    get: () => getPath(values, path),
    set: v => setPath(values, path, v)
  })
  return { values, touched, model, isDirty, reset }
}
`
const CORE_TAIL = `
const form = useForm({ user: { name: 'Ann' }, tags: ['a', 'b'] })
return {
  form,
  name: form.model('user.name'),
  city: form.model('user.address.city'),
  tag: form.model('tags[1]'),
  lang: form.model('prefs[0].lang')
}`
const CORE_START = `// TODO 1：setPath(obj, path, value)。沿路径写入。中间缺的层要创建：下一个键是数字就建数组，否则建对象
function setPath(obj, path, value) {
}

function useForm(initialValues) {
  // TODO 2：初始值要单独存一份，不能和 values 共用同一个对象
  const initial = initialValues
  const values = reactive(initialValues)
  const touched = reactive({})
  // TODO 3：isDirty(path)：当前值和初始值不同。不传 path 时比较整个表单
  const isDirty = path => false
  // TODO 4：reset()：把 values 恢复成初始值，并清空 touched。values 本身不能换成新对象（输入框绑定的是它）
  function reset() {
  }
  const model = path => computed({
    get: () => getPath(values, path),
    set: v => setPath(values, path, v)
  })
  return { values, touched, model, isDirty, reset }
}
`
export const formCore: Exercise = {
  title: '实现 useForm 的核心：路径读写、dirty、reset', ch: 39,
  task: '<p>下面的 <code>useForm</code> 把值放在一个 reactive 对象里，字段按路径读写。<code>getPath</code> 已经写好，补全四处：</p><ol><li><code>setPath</code>：沿路径写入，缺的中间层要创建。下一个键是数字就建数组，否则建对象。</li><li>初始值要和当前值分开存。</li><li><code>isDirty(path)</code>：当前值和初始值不同。不传 <code>path</code> 时比较整个表单。</li><li><code>reset()</code>：恢复初始值，并清空 <code>touched</code>。输入框绑定的是 <code>values</code> 这个对象，不能换成新对象。</li></ol><p>初始值里没有 <code>user.address</code> 和 <code>prefs</code>：用户输入城市和语言时，它们要被创建出来。重置之后它们要消失。</p>',
  tpl: CORE_TPL,
  js: CORE_HEAD + CORE_START + CORE_TAIL,
  solJs: CORE_HEAD + CORE_SOL + CORE_TAIL,
  hints: [
    'setPath 的思路：先把路径拆成键，最后一个键留着写值，前面的键逐层往下走。走到一层是 null 或 undefined 就先建出来。是建数组还是对象，看“下一个键”是不是数字。',
    '初始值用 structuredClone 复制一份。values 用另一份复制，这样改 values 不会改到 initial。isDirty 比较 JSON.stringify 的结果就够了。',
    'reset 不能写 values = …（它是 const，模板里绑定的也是原来的对象）。先把 values 里所有键删掉，再 Object.assign 一份 initial 的复制。只 assign 不删键，后来创建的 prefs 会留下。',
    CORE_SOL
  ],
  async check(T) {
    const { nextTick } = await import('vue')
    const type = async (sel: string, v: string) => { const i = T.$(sel) as HTMLInputElement; i.value = v; i.dispatchEvent(new Event('input')); await nextTick() }
    const vals = () => (T.$('.vals')?.textContent || '').trim()
    const txt = (s: string) => (T.$(s)?.textContent || '').trim()
    const init = '{"user":{"name":"Ann"},"tags":["a","b"]}'
    T.ok(vals() === init, '初始值显示为 ' + init + '（当前：' + vals() + '）')
    T.ok(txt('.d-name') === 'false' && txt('.d-form') === 'false', '还没改任何东西时，dirty 都是 false')
    await type('.name', 'Bob')
    T.ok(txt('.d-name') === 'true' && txt('.d-city') === 'false' && txt('.d-form') === 'true', '改了名字：user.name 是 dirty，城市不是，整个表单是 dirty（现在 ' + txt('.d-name') + '/' + txt('.d-city') + '/' + txt('.d-form') + '）')
    await type('.city', 'SH')
    T.ok(vals().includes('"address":{"city":"SH"}'), 'setPath 创建了缺的中间层 user.address（当前：' + vals() + '）')
    T.ok(txt('.d-city') === 'true', '初始值里没有的路径，写入后也算 dirty')
    await type('.lang', 'zh')
    T.ok(vals().includes('"prefs":[{"lang":"zh"}]'), '路径 prefs[0].lang 创建了数组里的对象（当前：' + vals() + '）')
    await type('.tag', 'z')
    T.ok(vals().includes('"tags":["a","z"]'), 'tags[1] 写入了已有的数组（当前：' + vals() + '）')
    ;(T.$('.name') as HTMLElement).dispatchEvent(new Event('blur')); await nextTick()
    T.ok(txt('.touched') === 'user.name', 'touched 记下了碰过的字段（当前：' + txt('.touched') + '）')
    await T.click(T.btn('重置'))
    T.ok(vals() === init, '重置后值回到初始值，后来多出来的 address 和 prefs 都消失了（当前：' + vals() + '）')
    T.ok(txt('.touched') === '' && txt('.d-form') === 'false', '重置后 touched 清空，dirty 回到 false')
    T.ok((T.$('.name') as HTMLInputElement).value === 'Ann' && (T.$('.city') as HTMLInputElement).value === '', '输入框显示的也是重置后的值')
    await type('.name', 'Cat')
    T.ok(vals().includes('"name":"Cat"'), '重置之后输入框仍然绑定着 values')
    await T.click(T.btn('重置'))
    T.ok(vals() === init, '第二次重置仍回到最初的初始值（初始值没有被改动过）')
  }
}
formCore.wrong = [
  { js: sub(formCore.solJs, "const initial = structuredClone(initialValues)    // 初始值单独存一份\n  const values = reactive(structuredClone(initialValues))", "const initial = initialValues\n  const values = reactive(initialValues)"), why: '初始值和当前值是同一个对象，用户一改，初始值也跟着变。dirty 永远是 false，reset 也恢复不了。', expectFail: /dirty|初始值/ },
  { js: sub(formCore.solJs, "    Object.keys(values).forEach(k => delete values[k])   // 先清掉后来多出来的键\n", ""), why: '只用 Object.assign 覆盖，覆盖不到后来新增的键。prefs 是用户输入后才创建的顶层键，重置后还留在 values 里。', expectFail: /重置后值回到初始值/ },
  { js: sub(formCore.solJs, "    if (cur[k] == null) cur[k] = /^\\d+$/.test(keys[i + 1] ?? last) ? [] : {}\n", "    if (cur[k] == null) cur[k] = {}\n"), why: '缺的中间层一律建成对象。prefs[0] 变成了 { \"0\": … } 这样的对象，不是数组。要看下一个键是不是数字。', expectFail: /prefs/ },
  { js: sub(formCore.solJs, "    Object.keys(touched).forEach(k => delete touched[k])\n", ""), why: '重置时忘了清空 touched。重置后的表单应该和刚打开时一样：没有碰过的字段。', expectFail: /touched 清空/ }
]
formCore.faded = {
  js: sub(sub(sub(sub(formCore.solJs,
    "    if (cur[k] == null) cur[k] = /^\\d+$/.test(keys[i + 1] ?? last) ? [] : {}\n", "    if (cur[k] == null) cur[k] = /* ✏️ 下一个键是数字就建数组，否则建对象 */ {}\n"),
    "const initial = structuredClone(initialValues)    // 初始值单独存一份\n  const values = reactive(structuredClone(initialValues))", "const initial = /* ✏️ 初始值单独存一份 */ initialValues\n  const values = reactive(/* ✏️ 当前值是另一份复制 */ initialValues)"),
    "    Object.keys(values).forEach(k => delete values[k])   // 先清掉后来多出来的键\n    Object.assign(values, structuredClone(initial))\n", "    /* ✏️ 先清掉 values 里所有的键 */\n    /* ✏️ 再放回初始值的复制 */\n"),
    "  const isDirty = path => (path ? !same(getPath(values, path), getPath(initial, path)) : !same(values, initial))", "  const isDirty = path => /* ✏️ 当前值和初始值不同？不传 path 比较整个表单 */ false")
}

// ===================== 39.6 异步校验的竞态 =====================
const RACE_HEAD = `// 模拟服务器：名字越短，查得越慢。ann 和 bobby 已被占用
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function checkName(name) {
  await sleep(name.length <= 3 ? 150 : 30)
  return ['ann', 'bobby'].includes(name) ? '已被占用' : ''
}

// 值变化时检查。不用防抖，请求立刻发出
function useAsyncCheck(value, check) {
  const error = ref('')
  const validating = ref(false)
`
const RACE_SOL = `  let seq = 0
  watch(value, async v => {
    const id = ++seq            // 每次检查领一个序号
    error.value = ''            // 值变了，旧结果作废
    validating.value = true
    const msg = await check(v)
    if (id !== seq) return      // 后面还有更新的一次：这个结果和它的“检查中”状态都不归我管
    error.value = msg
    validating.value = false
  })
`
const RACE_START = `  // TODO：只让最新的一次检查写结果
  watch(value, async v => {
    error.value = ''
    validating.value = true
    const msg = await check(v)
    error.value = msg
    validating.value = false
  })
`
const RACE_TAIL = `  return { error, validating }
}

const name = ref('')
const { error, validating } = useAsyncCheck(name, checkName)
return { name, error, validating }`
export const formRace: Exercise = {
  title: '让异步校验只认最新的一次', ch: 39,
  task: '<p><code>useAsyncCheck</code> 在值变化时调用 <code>check(v)</code>（返回错误信息，没有错误返回空字符串），把结果写进 <code>error</code>，检查期间 <code>validating</code> 为 true。请求的返回顺序和发出顺序不一定一样：</p><ul><li>先输入 ann（慢），再输入 anna（快）：anna 的结果先回来，ann 的结果后到。</li><li>先输入 bobby（快，已被占用），再输入 bob（慢）：bobby 的结果先回来，bob 还在路上。</li></ul><p>要求：只有最新一次检查的结果可以写入 <code>error</code>，并且只有最新一次检查结束时 <code>validating</code> 才变回 false。值一变，旧的错误立刻清空。</p>',
  tpl: `<input class="n" v-model="name"> <span class="v">{{ validating ? '检查中…' : '' }}</span> <span class="e">{{ error }}</span>`,
  js: RACE_HEAD + RACE_START + RACE_TAIL,
  solJs: RACE_HEAD + RACE_SOL + RACE_TAIL,
  hints: [
    '问题出在 await 之后：回来的结果不知道自己是不是最新的。第 4 章的 onCleanup 解决过同样的问题。',
    '每次检查前领一个序号（let seq = 0，const id = ++seq）。await 回来之后比较 id 和 seq，不相等说明后面还有更新的检查，直接 return。',
    'return 之前什么都不要写：不写 error，也不把 validating 改回 false。validating 只由最新的一次来结束。',
    RACE_SOL
  ],
  async check(T) {
    const { nextTick } = await import('vue')
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
    const input = () => T.$('.n') as HTMLInputElement
    const type = async (v: string) => { input().value = v; input().dispatchEvent(new Event('input')); await nextTick() }
    const err = () => (T.$('.e')?.textContent || '').trim()
    const busy = () => (T.$('.v')?.textContent || '').trim() !== ''
    // 单独输入 ann
    await type('ann')
    T.ok(busy(), '输入后立刻显示“检查中”')
    await sleep(260)
    T.ok(err() === '已被占用' && !busy(), '只输入 ann：检查结束后显示“已被占用”，不再检查中（现在：' + err() + (busy() ? '，仍在检查中' : '') + '）')
    // 后发先至
    await type('anna')
    T.ok(err() === '', '值变了，旧的错误立刻清空（现在：' + err() + '）')
    await sleep(260)
    await type('ann'); await sleep(10); await type('anna')
    await sleep(260)
    T.ok(err() === '' && !busy(), '后发先至：先输入 ann（慢）再输入 anna（快），最后显示 anna 的结果，没有错误（现在：' + (err() || '空') + (busy() ? '，仍在检查中' : '') + '）')
    // 先发先至，但已经过期
    await type('bobby'); await sleep(10); await type('bob')
    await sleep(80)
    T.ok(err() === '', 'bobby 的结果已经回来，但它已过期，不能显示（现在：' + (err() || '空') + '）')
    T.ok(busy(), 'bob 的检查还在路上，此时仍应显示“检查中”：过期的结果不能把 validating 改回 false')
    await sleep(220)
    T.ok(err() === '' && !busy(), 'bob 的检查结束后没有错误，也不再检查中')
  }
}
formRace.wrong = [
  { js: sub(formRace.solJs, "    if (id !== seq) return      // 后面还有更新的一次：这个结果和它的“检查中”状态都不归我管\n", ""), why: '没有任何保护。先发出的 ann 请求后到，把 anna 的正确结果覆盖成了“已被占用”。', expectFail: /后发先至|过期/ },
  { js: sub(formRace.solJs, "    if (id !== seq) return      // 后面还有更新的一次：这个结果和它的“检查中”状态都不归我管\n    error.value = msg\n    validating.value = false", "    if (id === seq) error.value = msg\n    validating.value = false"), why: '只保护了 error，没有保护 validating。过期的结果回来时把“检查中”改回 false，而最新的一次还在路上。界面上显示检查结束了，实际上结果还没到。', expectFail: /检查中/ },
  { js: sub(formRace.solJs, "    error.value = ''            // 值变了，旧结果作废\n", ""), why: '值变了以后，上一个值的错误还留在界面上，直到新结果回来。用户看到的是“anna 已被占用”这种张冠李戴的信息。', expectFail: /立刻清空/ }
]
formRace.faded = {
  js: sub(formRace.solJs, "  let seq = 0\n  watch(value, async v => {\n    const id = ++seq            // 每次检查领一个序号\n", "  /* ✏️ 需要一个在多次检查之间共享的变量 */\n  watch(value, async v => {\n    /* ✏️ 这次检查领一个序号 */\n").replace("    if (id !== seq) return      // 后面还有更新的一次：这个结果和它的“检查中”状态都不归我管\n", "    /* ✏️ 回来之后，怎样判断自己不是最新的？不是就直接返回 */\n")
}

// ===================== 39.7 字段数组：增删移动，状态跟着走 =====================
const ARR_TPL = `<ul>
  <li v-for="(it, i) in values.items" :key="it.id" class="row" :data-id="it.id">
    <input class="p" v-model.number="it.price" @blur="touched[key(i)] = true">
    <b class="t">{{ touched[key(i)] ? '碰过' : '' }}</b>
    <b class="e">{{ errors[key(i)] || '' }}</b>
    <button class="up" :disabled="i === 0" @click="move(i, i - 1)">上移</button>
    <button class="end" @click="move(i, values.items.length - 1)">移到末尾</button>
    <button class="del" @click="remove(i)">删除</button>
  </li>
</ul>
<button class="add" @click="add()">在第 2 项前插入</button>
<button class="val" @click="validate()">校验</button>`
const ARR_HEAD = `const values = reactive({ items: [{ id: 1, price: 1 }, { id: 2, price: 0 }, { id: 3, price: 3 }] })
const touched = reactive({})   // 'items[1].price' → true
const errors = reactive({})    // 'items[1].price' → '价格至少 1'（校验结果，存起来的）
const key = i => 'items[' + i + '].price'
let nextId = 10
function add() {
  insert(1, { id: nextId++, price: 5 })
}

function validate() {
  values.items.forEach((it, i) => {
    if (it.price > 0) delete errors[key(i)]
    else errors[key(i)] = '价格至少 1'
  })
}

`
const ARR_SOL = `// mapIndex(j) 返回原来第 j 项现在的下标；返回 null 表示这一项被删了
function remap(mapIndex) {
  for (const store of [touched, errors]) {
    const moved = {}
    for (const k of Object.keys(store)) {
      const m = k.match(/^items\\[(\\d+)\\](.*)$/)
      if (!m) continue
      const val = store[k]
      delete store[k]
      const j = mapIndex(+m[1])
      if (j != null) moved['items[' + j + ']' + m[2]] = val
    }
    Object.assign(store, moved)
  }
}
function insert(i, item) {
  values.items.splice(i, 0, item)
  remap(j => (j >= i ? j + 1 : j))
}
function remove(i) {
  values.items.splice(i, 1)
  remap(j => (j === i ? null : j > i ? j - 1 : j))
}
function move(from, to) {
  values.items.splice(to, 0, values.items.splice(from, 1)[0])
  remap(j => {
    if (j === from) return to
    if (from < to) return j > from && j <= to ? j - 1 : j
    return j >= to && j < from ? j + 1 : j
  })
}
`
const ARR_START = `// TODO 1：remap(mapIndex)。把 touched 和 errors 里 items[j]... 开头的键搬到 items[mapIndex(j)]...；mapIndex 返回 null 表示这一项被删了，它的键要丢掉
function remap(mapIndex) {
}
// TODO 2：数组改完以后，按下面的规则调用 remap
function insert(i, item) {
  values.items.splice(i, 0, item)
}
function remove(i) {
  values.items.splice(i, 1)
}
function move(from, to) {
  values.items.splice(to, 0, values.items.splice(from, 1)[0])
}
`
const ARR_TAIL = `
return { values, touched, errors, key, validate, add, remove, move }`
export const formArray: Exercise = {
  title: '字段数组：增删移动之后，状态跟着项走', ch: 39,
  task: '<p>表单用路径保存 <code>touched</code> 和校验结果，例如 <code>items[1].price</code>。数组的项一搬家，路径就变了，这些按路径存的状态要跟着搬。</p><ol><li>写 <code>remap(mapIndex)</code>：对 <code>touched</code> 和 <code>errors</code> 里以 <code>items[j]</code> 开头的键，改成 <code>items[mapIndex(j)]</code>；<code>mapIndex(j)</code> 返回 <code>null</code> 表示这一项被删了，丢掉它的键。</li><li>在 <code>insert</code>、<code>remove</code>、<code>move</code> 里，数组改完之后调用 <code>remap</code>。</li></ol><p>每一行都用 <code>key(i)</code> 读自己的状态，所以界面上能看出状态有没有跟着项走。先点“校验”（第 2 项价格是 0），再在不同的行上点输入框和按钮试试。</p>',
  tpl: ARR_TPL,
  js: ARR_HEAD + ARR_START + ARR_TAIL,
  solJs: ARR_HEAD + ARR_SOL + ARR_TAIL,
  hints: [
    '先想清楚 mapIndex：插入在 i 位，原来下标 ≥ i 的项后移一位。删除第 i 项，它自己没了，后面的前移一位。移动 from → to，夹在中间的项要往 from 的方向挪一位。',
    'remap 的做法：遍历 store 的键，用正则 /^items\\[(\\d+)\\](.*)$/ 取出下标和后缀。先读出值，再删掉旧键，算出新下标，把值存到一个临时对象的新键下。最后一次 Object.assign 放回去。不要边遍历边写回，会覆盖还没处理的键。',
    'move(from, to) 的 mapIndex：j === from 返回 to；from < to 时，j 在 (from, to] 之间的前移一位；from > to 时，j 在 [to, from) 之间的后移一位；其他不动。',
    ARR_SOL
  ],
  async check(T) {
    const { nextTick } = await import('vue')
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
    const rows = () => T.$$('.row') as HTMLElement[]
    const order = () => rows().map(r => r.dataset.id).join()
    const row = (id: string) => rows().find(r => r.dataset.id === id) as HTMLElement
    const st = (id: string) => {
      const r = row(id)
      return r ? (r.querySelector('.t')?.textContent || '').trim() + '/' + (r.querySelector('.e')?.textContent || '').trim() : '（找不到）'
    }
    const push = async (id: string, sel: string) => { await T.click(row(id).querySelector(sel)); await sleep(0) }
    const blur = async (id: string) => { (row(id).querySelector('.p') as HTMLElement).dispatchEvent(new Event('blur')); await nextTick() }
    const EMP = '/', ERR = '/价格至少 1', TCH = '碰过/', BOTH = '碰过/价格至少 1'
    T.ok(order() === '1,2,3', '起始顺序是 1,2,3')
    await T.click(T.btn('校验'))
    T.ok(st('2') === ERR && st('1') === EMP && st('3') === EMP, '点“校验”后只有第 2 项（价格 0）有错误（现在 ' + st('1') + ' | ' + st('2') + ' | ' + st('3') + '）')
    await blur('2'); await blur('3')
    T.ok(st('2') === BOTH && st('3') === TCH, '第 2、3 项被标记为碰过')
    // 上移
    await push('3', '.up')
    T.ok(order() === '1,3,2', '第 3 项上移后顺序是 1,3,2（现在 ' + order() + '）')
    T.ok(st('3') === TCH && st('2') === BOTH && st('1') === EMP, '上移之后，碰过和错误跟着各自的项走（现在 ' + st('1') + ' | ' + st('3') + ' | ' + st('2') + '）')
    // 长距离移动
    await push('1', '.end')
    T.ok(order() === '3,2,1', '第 1 项移到末尾后顺序是 3,2,1（现在 ' + order() + '）')
    T.ok(st('3') === TCH && st('2') === BOTH && st('1') === EMP, '长距离移动之后，夹在中间的项的状态也跟着挪了（现在 ' + st('3') + ' | ' + st('2') + ' | ' + st('1') + '）')
    // 删除
    await push('3', '.del')
    T.ok(order() === '2,1', '删除第 3 项后顺序是 2,1')
    T.ok(st('2') === BOTH && st('1') === EMP, '删除之后，剩下的项状态不变（现在 ' + st('2') + ' | ' + st('1') + '）')
    // 插入
    await T.click(T.btn('在第 2 项前插入'))
    const ids = rows().map(r => r.dataset.id as string)
    const fresh = ids[1]
    T.ok(ids.length === 3 && ids[0] === '2' && ids[2] === '1', '插入后有 3 项，新项在中间（现在 ' + ids.join() + '）')
    T.ok(st(fresh) === EMP, '新插入的项没有碰过，也没有错误（现在 ' + st(fresh) + '）')
    T.ok(st('2') === BOTH && st('1') === EMP, '插入位置之前的项状态不变（现在 ' + st('2') + ' | ' + st('1') + '）')
    // 删掉有状态的项，不能把它的状态留给别人
    await push('2', '.del')
    T.ok(rows().length === 2 && st(fresh) === EMP && st('1') === EMP, '删掉有错误的项后，它的状态没有留给下标相同的新项（现在 ' + st(fresh) + ' | ' + st('1') + '）')
    const r1 = row('1').querySelector('.p') as HTMLInputElement
    r1.value = '9'; r1.dispatchEvent(new Event('input')); await nextTick()
    T.ok(r1.value === '9', '输入框仍然可以编辑')
  }
}
formArray.wrong = [
  { js: sub(sub(sub(formArray.solJs, "  values.items.splice(i, 0, item)\n  remap(j => (j >= i ? j + 1 : j))\n", "  values.items.splice(i, 0, item)\n"), "  values.items.splice(i, 1)\n  remap(j => (j === i ? null : j > i ? j - 1 : j))\n", "  values.items.splice(i, 1)\n"), "  remap(j => {\n    if (j === from) return to\n    if (from < to) return j > from && j <= to ? j - 1 : j\n    return j >= to && j < from ? j + 1 : j\n  })\n", ""), why: '只改了数组，没有搬状态。touched 和 errors 仍然挂在原来的下标上，项一搬家，状态就留在原地，落到了别的项身上。', expectFail: /跟着/ },
  { js: sub(formArray.solJs, "  remap(j => (j === i ? null : j > i ? j - 1 : j))", "  remap(j => (j > i ? j - 1 : j))"), why: '删除时，被删项自己的键没有丢掉，还留在下标 i 上。后面的项前移之后，它们占了这个下标，就继承了已删项的碰过和错误。', expectFail: /删|新项|没有留给/ },
  { js: sub(formArray.solJs, "    if (from < to) return j > from && j <= to ? j - 1 : j\n    return j >= to && j < from ? j + 1 : j", "    return j === to ? from : j"), why: '把移动当成了两项对调。相邻移动碰巧对，但从头移到末尾时，夹在中间的项也要各挪一位，只对调两头会让中间的项丢失状态。', expectFail: /长距离/ }
]
formArray.faded = {
  js: sub(sub(sub(formArray.solJs, "      const val = store[k]\n      delete store[k]\n      const j = mapIndex(+m[1])\n      if (j != null) moved['items[' + j + ']' + m[2]] = val\n", "      const val = store[k]\n      /* ✏️ 先删掉旧键 */\n      const j = mapIndex(+m[1])\n      /* ✏️ j 不是 null 时，把 val 放到新下标的键下（用 moved 暂存） */\n"),
    "  values.items.splice(i, 1)\n  remap(j => (j === i ? null : j > i ? j - 1 : j))\n", "  values.items.splice(i, 1)\n  /* ✏️ 被删的项返回 null，后面的项前移一位 */\n"),
    "  remap(j => {\n    if (j === from) return to\n    if (from < to) return j > from && j <= to ? j - 1 : j\n    return j >= to && j < from ? j + 1 : j\n  })\n", "  remap(j => {\n    if (j === from) return to\n    /* ✏️ 夹在 from 和 to 之间的项往哪个方向挪一位？分 from < to 和 from > to 两种情况 */\n    return j\n  })\n")
}
