import type { Exercise } from './types'
import { sub } from './types'
import { nextTick } from 'vue'

export const focusTick: Exercise = {
  title: '修复：输入框没有获得焦点', ch: 13,
  task: '<p>点击“编辑”时，输入框出现，并且应该获得焦点。现在点击后，页面报错，输入框也没有焦点。只修改脚本，修复这个错误。</p>',
  tpl: '<p>名称：{{ name }}</p>\n<button @click="startEdit">编辑</button>\n<input v-if="editing" ref="inputRef" v-model="name">',
  js: `const name = ref('Vue')
const editing = ref(false)
const inputRef = ref(null)   // 模板中 ref="inputRef" 的元素

function startEdit() {
  editing.value = true
  inputRef.value.focus()
}

return { name, editing, inputRef, startEdit }`,
  solJs: `const name = ref('Vue')
const editing = ref(false)
const inputRef = ref(null)   // 模板中 ref="inputRef" 的元素

async function startEdit() {
  editing.value = true
  await nextTick()           // 等待 DOM 更新。这时 input 已在页面上
  inputRef.value.focus()
}

return { name, editing, inputRef, startEdit }`,
  faded: {
    js: `const name = ref('Vue')
const editing = ref(false)
const inputRef = ref(null)   // 模板中 ref="inputRef" 的元素

/* ✏️ 函数里要等待，函数声明前要加什么关键字 */ function startEdit() {
  editing.value = true
  /* ✏️ 等待这次 DOM 更新完成：输入框这时才会出现 */
  inputRef.value.focus()
}

return { name, editing, inputRef, startEdit }`
  },
  hints: [
    '原因：修改 editing 后，Vue 不立即更新 DOM。下一行代码运行时，输入框还没有创建，inputRef.value 是 null，所以报错。要等这次 DOM 更新完成，再调用 focus()。第 6 章 6.4 节讲了怎样等这次更新，13.1 节讲了原因。',
    '只改 startEdit。把它改为 async 函数。在 inputRef.value.focus() 之前，加一行 await …。',
    'async function startEdit() {\n  editing.value = true\n  await nextTick()\n  inputRef.value.focus()\n}'
  ],
  async check(T) {
    T.ok(!T.$('input'), '初始时没有输入框');
    const b = T.btn('编辑');
    if (!b) { T.ok(false, '找到“编辑”按钮'); return; }
    await T.click(b);
    await new Promise(r => setTimeout(r, 0));
    const input = T.$('input');
    T.ok(!!input, '点击“编辑”后显示输入框');
    T.ok(!!input && document.activeElement === input, '输入框获得焦点');
  },
  wrong: [
    { js: 'const name = ref(\'Vue\')\nconst editing = ref(false)\nconst inputRef = ref(null)   // 模板中 ref="inputRef" 的元素\n\nasync function startEdit() {\n  editing.value = true\n  nextTick()         // 等待 DOM 更新。这时 input 已在页面上\n  inputRef.value.focus()\n}\n\nreturn { name, editing, inputRef, startEdit }', why: '调用了 nextTick() 但没有 await。下一行立即执行，输入框还没创建，inputRef.value 是 null，报错。' },
    { js: 'const name = ref(\'Vue\')\nconst editing = ref(false)\nconst inputRef = ref(null)   // 模板中 ref="inputRef" 的元素\n\nasync function startEdit() {\n  await nextTick()\n  editing.value = true\n  inputRef.value.focus()\n}\n\nreturn { name, editing, inputRef, startEdit }', why: 'await nextTick() 放在了修改 editing 之前。它等的是上一轮更新，修改之后的这一轮 DOM 更新没有等，inputRef 仍是 null。' }
  ]
}

export const phenoHeight: Exercise = {
  title: '看现象：添加一项后，显示的高度是旧的', ch: 13,
  task: '<p>点击“添加一项”。代码向列表添加一项，然后读取列表的高度并显示它。</p><ol><li>点击几次“添加一项”。显示的高度总是少一行：它是添加之前的高度。</li></ol><p>期望：显示的高度等于列表当前的实际高度。只修改脚本。</p>',
  tpl: '<ul ref="listEl" style="margin: 0">\n  <li v-for="it in items" :key="it" style="height: 24px">{{ it }}</li>\n</ul>\n<button @click="addItem">添加一项</button>\n<p class="h">列表高度：{{ height }}px</p>',
  js: `const items = ref(['第 1 项'])
const listEl = ref(null)     // 模板中 ref="listEl" 的元素
const height = ref(0)

onMounted(() => { height.value = listEl.value.offsetHeight })

function addItem() {
  items.value.push('第 ' + (items.value.length + 1) + ' 项')
  height.value = listEl.value.offsetHeight
}

return { items, listEl, height, addItem }`,
  solJs: `const items = ref(['第 1 项'])
const listEl = ref(null)     // 模板中 ref="listEl" 的元素
const height = ref(0)

onMounted(() => { height.value = listEl.value.offsetHeight })

async function addItem() {
  items.value.push('第 ' + (items.value.length + 1) + ' 项')
  await nextTick()                              // 等待这次 DOM 更新完成
  height.value = listEl.value.offsetHeight
}

return { items, listEl, height, addItem }`,
  hints: [
    '原因：修改数据后，Vue 不立即更新 DOM。它把更新放入队列，当前的同步代码结束后才一起更新。所以紧接着读取，得到的是旧 DOM。要等这次更新完成后再读取。13.2 节讲了它。',
    '只改 addItem。把它改为 async 函数。在 push 和读取高度之间，等待 Vue 完成这次 DOM 更新。',
    'async function addItem() {\n  items.value.push(\'第 \' + (items.value.length + 1) + \' 项\')\n  await nextTick()\n  height.value = listEl.value.offsetHeight\n}'
  ],
  wrong: [
    { js: `const items = ref(['第 1 项'])
const listEl = ref(null)
const height = ref(0)

onMounted(() => { height.value = listEl.value.offsetHeight })

function addItem() {
  items.value.push('第 ' + (items.value.length + 1) + ' 项')
}
watch(items, () => {
  height.value = listEl.value.offsetHeight
}, { deep: true })

return { items, listEl, height, addItem }`, why: '侦听器默认在组件更新之前运行，这时 DOM 还是旧的。' }
  ],
  async check(T) {
    const shown = () => { const m = /(\d+)px/.exec((T.$('p.h') || {}).textContent || ''); return m ? +m[1] : NaN; };
    const real = () => (T.$('ul') || {}).offsetHeight;
    const settle = async () => { await new Promise(r => setTimeout(r, 0)); await nextTick(); };
    await settle();
    T.ok(real() > 0 && shown() === real(), '初始显示的高度等于实际高度（显示 ' + shown() + '，实际 ' + real() + '）');
    const b = T.btn('添加一项');
    if (!b) { T.ok(false, '找到“添加一项”按钮'); return; }
    await T.click(b); await settle();
    T.ok(shown() === real(), '添加一项后，显示的高度等于实际高度（显示 ' + shown() + '，实际 ' + real() + '）');
    await T.click(T.btn('添加一项')); await settle();
    T.ok(T.$$('li').length === 3 && shown() === real(), '再添加一项，仍然相等（显示 ' + shown() + '，实际 ' + real() + '）');
  }
}

// ===== 半成品示例（参考答案挖掉关键处，占位说明做什么）=====
phenoHeight.faded = {
  js: sub(phenoHeight.solJs, 'await nextTick()                              // 等待这次 DOM 更新完成',
    '/* ✏️ 读高度之前，先等 Vue 把这次数据变化更新到 DOM */')
}
