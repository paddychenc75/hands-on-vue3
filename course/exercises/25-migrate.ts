import type { Exercise } from './types'
import { sub } from './types'

export const migrateVModel: Exercise = {
  title: '迁移：输入框是空的，输入后问候语不变', ch: 25,
  task: '<p>NameInput 是一个 Vue 2 写法的组件。它用 prop value 和事件 input 支持 v-model。在 Vue 3 中，输入框是空的，输入文字后问候语也不变。</p><ol><li>只修改 NameInput。</li><li>按 Vue 3 的约定，改用 prop modelValue 和事件 update:modelValue。</li><li>在 emits 中声明这个事件。</li></ol>',
  tpl: '<NameInput v-model="name" />\n<p>你好，{{ name }}</p>',
  js: `// Vue 2 写法：prop value，事件 input
const NameInput = {
  props: ['value'],
  template: '<input :value="value" @input="$emit(\\'input\\', $event.target.value)">'
}

const name = ref('Vue')
return { name, components: { NameInput } }`,
  solJs: `// Vue 3 写法：prop modelValue，事件 update:modelValue
const NameInput = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<input :value="modelValue" @input="$emit(\\'update:modelValue\\', $event.target.value)">'
}

const name = ref('Vue')
return { name, components: { NameInput } }`,
  hints: [
    '原因：Vue 3 改了组件上 v-model 使用的 prop 名和事件名。父组件按 Vue 3 的名字传值和监听。NameInput 仍然读取 Vue 2 的 prop，发送 Vue 2 的事件，所以两边接不上。第 25 章“25.3 修复 Vue 2 到 Vue 3 的破坏性变化”的表格列出了新旧名字。',
    '修改 NameInput 的三处：1. props 中的 value 改为 modelValue。2. 添加 emits: [\'update:modelValue\']。3. 模板中 :value 读取 modelValue，$emit 的事件名改为 update:modelValue。',
    "props: ['modelValue'],\nemits: ['update:modelValue'],\ntemplate: '<input :value=\"modelValue\" @input=\"$emit(\\'update:modelValue\\', $event.target.value)\">'"
  ],
  async check(T) {
    const wait = n => new Promise(r => setTimeout(r, n));
    const input = T.$('input');
    const p = () => ((T.$('p') || {}).textContent || '').trim();
    T.ok(!!input, '渲染出输入框');
    if (!input) return;
    // 题目要求在 emits 中声明事件（数组或对象写法都可以）
    const root = T.$(':scope > div');
    const inst = root && (root as any)._vnode && (root as any)._vnode.component;
    const C = inst && inst.appContext.components.NameInput;
    const em = C && C.emits;
    const declared = Array.isArray(em) ? em.includes('update:modelValue') : !!em && 'update:modelValue' in em;
    T.ok(declared, '在 emits 中声明了 update:modelValue');
    T.ok(input.value === 'Vue', '输入框显示 name 的初始值 Vue（当前：“' + input.value + '”）');
    input.value = 'Ann';
    input.dispatchEvent(new Event('input'));
    await wait(0);
    T.ok(p() === '你好，Ann', '输入 Ann 后，显示“你好，Ann”（当前：' + p() + '）');
  }
}

export const fbMigrate: Exercise = {
  title: '补全：把 .sync 改为 v-model:title', ch: 25,
  task: '<p>父组件的模板来自 Vue 2。它用 :title.sync 双向绑定标题。Vue 3 删除了 .sync，所以输入文字后标题不变。子组件 TitleInput 已经是 Vue 3 的写法：prop title，事件 update:title。</p><ol><li>只补全模板中的 TODO：把 :title.sync="title" 改为 Vue 3 的写法。</li><li>在输入框中输入文字，确认标题跟着改变。</li></ol>',
  tpl: '<!-- TODO：Vue 3 删除了 .sync。把下一行改为 v-model:title 的写法 -->\n<TitleInput :title.sync="title" />\n<p>标题：{{ title }}</p>',
  solTpl: '<TitleInput v-model:title="title" />\n<p>标题：{{ title }}</p>',
  js: `// 子组件已经是 Vue 3 写法：prop title，事件 update:title
const TitleInput = {
  props: ['title'],
  emits: ['update:title'],
  template: '<input :value="title" @input="$emit(\\'update:title\\', $event.target.value)">'
}

const title = ref('草稿')
return { title, components: { TitleInput } }`,
  hints: [
    'Vue 3 中，v-model:xxx 代替了 .sync。它传入 prop xxx，并监听事件 update:xxx。第 25 章“25.3 修复 Vue 2 到 Vue 3 的破坏性变化”的表格讲了它。',
    '只改 <TitleInput> 这一行。删除 :title.sync，改用 v-model 加参数 title。',
    '<TitleInput v-model:title="title" />'
  ],
  async check(T) {
    const wait = n => new Promise(r => setTimeout(r, n));
    const input = T.$('input');
    const p = () => ((T.$('p') || {}).textContent || '').trim();
    T.ok(!!input, '渲染出输入框');
    if (!input) return;
    T.ok(input.value === '草稿', '输入框显示 title 的初始值“草稿”（当前：“' + input.value + '”）');
    input.value = 'Vue 3 迁移';
    input.dispatchEvent(new Event('input'));
    await wait(0);
    T.ok(p() === '标题：Vue 3 迁移', '输入后，显示“标题：Vue 3 迁移”（当前：' + p() + '）');
  }
}

// ===== 错误解法（基于参考答案做小改动）=====
migrateVModel.wrong = [
  { js: sub(migrateVModel.solJs, "  emits: ['update:modelValue'],\n", ""), why: '没有在 emits 中声明 update:modelValue。本题页面照样能用（Vue 会把 v-model 的监听从透传属性里排除），但组件发出哪些事件没有写在接口上：事件名拼错时没有任何提示。Vue 3 的迁移要求是声明所有发出的事件。', expectFail: /emits 中声明了 update:modelValue/ },
  { js: sub(migrateVModel.solJs, "$emit(\\'update:modelValue\\'", "$emit(\\'input\\'"), why: '只改了 prop，事件名还是 Vue 2 的 input。父组件监听的是 update:modelValue，输入后问候语不变。' },
  { js: sub(sub(migrateVModel.solJs, "props: ['modelValue']", "props: ['value']"), ":value=\"modelValue\"", ":value=\"value\""), why: '只改了事件名，prop 还是 Vue 2 的 value。父组件传的是 modelValue，输入框一开始是空的。' }
]

fbMigrate.wrong = [
  { tpl: sub(fbMigrate.solTpl, 'v-model:title="title"', 'v-model="title"'), why: '去掉了参数。v-model 默认绑定 modelValue 和 update:modelValue，子组件用的是 title 和 update:title，两边对不上。' },
  { tpl: sub(fbMigrate.solTpl, 'v-model:title="title"', ':title="title"'), why: '只传了 prop，没有监听 update:title 事件。这是单向绑定，输入后标题不变。' }
]
