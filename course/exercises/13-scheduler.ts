import type { Exercise } from './types'

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
  }
}
