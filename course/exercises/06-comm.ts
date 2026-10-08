import type { Exercise } from './types'
import { nextTick } from 'vue'

export const emit: Exercise = {
  title: '子组件通知父组件', ch: 6,
  task: '<ol><li>在子组件 StepButton 的 template 中，点击时调用 $emit(\'add\', step)。</li><li>在父组件模板的 StepButton 上，监听 add 事件，调用 onAdd。</li></ol><p class="cap">说明：返回值中的 components 是本练习台的约定。真实项目在 &lt;script setup&gt; 中 import 组件，或使用 components 选项。</p>',
  tpl: '<p>total = {{ total }}</p>\n<StepButton :step="1" />\n<StepButton :step="5" />',
  js: 'const StepButton = {\n  props: [\'step\'],\n  emits: [\'add\'],\n  // TODO 1：点击按钮时 $emit(\'add\', step)\n  template: \'<button>+{{ step }}</button>\'\n}\n\nconst total = ref(0)\nfunction onAdd(n) {\n  total.value += n\n}\n\n// TODO 2：在模板的 StepButton 上监听 add 事件\nreturn { total, onAdd, components: { StepButton } }',
  solTpl: '<p>total = {{ total }}</p>\n<StepButton :step="1" @add="onAdd" />\n<StepButton :step="5" @add="onAdd" />',
  solJs: 'const StepButton = {\n  props: [\'step\'],\n  emits: [\'add\'],\n  template: \'<button @click="$emit(\\\'add\\\', step)">+{{ step }}</button>\'\n}\n\nconst total = ref(0)\nfunction onAdd(n) {\n  total.value += n\n}\n\nreturn { total, onAdd, components: { StepButton } }',
  faded: {
    tpl: `<p>total = {{ total }}</p>
<StepButton :step="1" @add="/* ✏️ 监听 add 事件，交给 onAdd 处理 */" />
<StepButton :step="5" @add="onAdd" />`,
    js: `const StepButton = {
  props: ['step'],
  emits: ['add'],
  template: \`<button @click="/* ✏️ 点击时发出 add 事件，并把 step 作为参数带上 */">+{{ step }}</button>\`
}

const total = ref(0)
function onAdd(n) {
  total.value += n
}

return { total, onAdd, components: { StepButton } }`
  },
  hints: [
'子组件用 $emit 发出事件，父组件用 @事件名 监听。第 6 章“6.2 用 emit 通知父组件”讲了它。子组件不直接修改父组件的数据。',
'1. 在子组件的 template 字符串中，给 <button> 加 @click="$emit(…)"，参数是 \'add\' 和 step。字符串中的单引号写为 \\\'。2. 在父组件模板的两个 StepButton 上加 @add="…"。',
'子组件模板：<button @click="$emit(\\\'add\\\', step)">+{{ step }}</button>。父组件：<StepButton :step="1" @add="onAdd" /> 和 <StepButton :step="5" @add="onAdd" />。'
],
  async check(T) {
    const p = () => (T.$('p') || {}).textContent || '';
    T.ok(/total\s*=\s*0/.test(p()), '初始 total = 0');
    const b1 = T.btn('+1'), b5 = T.btn('+5');
    T.ok(!!b1 && !!b5, '渲染出 +1 和 +5 两个按钮');
    if (!b1 || !b5) return;
    await T.click(b1);
    T.ok(/total\s*=\s*1\b/.test(p()), '点 +1 后 total = 1');
    await T.click(T.btn('+5'));
    T.ok(/total\s*=\s*6\b/.test(p()), '再点 +5 后 total = 6');
  },
  wrong: [
    { js: 'const StepButton = {\n  props: [\'step\'],\n  emits: [\'add\'],\n  template: \'<button @click="$emit(\\\'add\\\')">+{{ step }}</button>\'\n}\n\nconst total = ref(0)\nfunction onAdd(n) {\n  total.value += n\n}\n\nreturn { total, onAdd, components: { StepButton } }', why: '发出事件时没有带参数 step。父组件的 onAdd 收到 undefined，total 变成 NaN。' },
    { tpl: '<p>total = {{ total }}</p>\n<StepButton :step="1" @add="total++" />\n<StepButton :step="5" @add="total++" />', why: '父组件的监听写成 total++，忽略了子组件传来的 step。每个按钮都只加 1，+5 按钮不对。' }
  ]
}

export const modelInput: Exercise = {
  title: '补全：TaskTitleInput 的 model', ch: 6,
  task: '<p>TaskTitleInput 是一个输入组件。父组件写 <code>v-model="task.title"</code>。子组件的模板 <code>&lt;input v-model="model"&gt;</code> 已经写好。只补全一行 TODO。</p><p>在 .vue 文件中，这一行是 <code>const model = defineModel()</code>。defineModel 是编译宏。练习台没有编译器，在这里调用它只得到 undefined。编译器把 defineModel() 改写为两部分：</p><ol><li>声明 prop modelValue 和事件 update:modelValue。本题已经写好。</li><li>调用 <code>useModel(props, \'modelValue\')</code>。它返回的 ref 和 defineModel() 返回的 ref 相同。</li></ol><p>所以本题用 useModel 写这一行。脚本第一行从全局 Vue 中取出它。</p><ol><li>TODO：创建 model。</li><li>在输入框中输入文字。确认父组件的 task.title 跟着改变。</li><li>点击“从父组件修改”。确认输入框也跟着改变。</li></ol>',
  tpl: '<TaskTitleInput v-model="task.title" />\n<p class="title">父组件的 task.title：{{ task.title }}</p>\n<button @click="task.title = \'新任务\'">从父组件修改</button>',
  js: `const { useModel } = Vue   // 从全局 Vue 中取出

const TaskTitleInput = {
  // .vue 文件中由 defineModel() 生成的两行
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props) {
    // TODO：创建 model。.vue 文件中写 const model = defineModel()
    const model = null
    return { model }
  },
  template: '<input v-model="model">'
}

const task = reactive({ title: '写周报' })
return { task, components: { TaskTitleInput } }`,
  solJs: `const { useModel } = Vue   // 从全局 Vue 中取出

const TaskTitleInput = {
  // .vue 文件中由 defineModel() 生成的两行
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props) {
    const model = useModel(props, 'modelValue')   // 读取 prop，写入时发送 update:modelValue
    return { model }
  },
  template: '<input v-model="model">'
}

const task = reactive({ title: '写周报' })
return { task, components: { TaskTitleInput } }`,
  faded: {
    js: `const { useModel } = Vue   // 从全局 Vue 中取出

const TaskTitleInput = {
  // .vue 文件中由 defineModel() 生成的两行
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props) {
    // 读取时是 prop，写入时发送 update:modelValue
    const model = /* ✏️ 用 useModel 绑定 props 里的 modelValue */ null
    return { model }
  },
  template: '<input v-model="model">'
}

const task = reactive({ title: '写周报' })
return { task, components: { TaskTitleInput } }`
  },
  hints: [
    'defineModel() 返回一个 ref。读取它，得到父组件传入的值。写入它，Vue 发送 update:modelValue 事件，父组件的数据跟着改变。第 6 章“6.4 为组件添加 v-model”讲了它。练习台中，用编译结果中的 useModel 代替它。',
    '只改 const model = null 这一行。调用 useModel。第一个参数是 setup 收到的 props，第二个参数是 prop 的名称 \'modelValue\'。',
    "const model = useModel(props, 'modelValue')"
  ],
  wrong: [
    { js: `const { useModel } = Vue

const TaskTitleInput = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props) {
    const model = ref(props.modelValue)
    return { model }
  },
  template: '<input v-model="model">'
}

const task = reactive({ title: '写周报' })
return { task, components: { TaskTitleInput } }`, why: 'ref(props.modelValue) 只复制 prop 的初始值。输入时只修改子组件自己的 ref，不发送事件，父组件的 task.title 不变。' },
    { js: `const TaskTitleInput = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props) {
    const model = Vue.defineModel()
    return { model }
  },
  template: '<input v-model="model">'
}

const task = reactive({ title: '写周报' })
return { task, components: { TaskTitleInput } }`, why: 'defineModel 是编译宏。没有编译器时，它只返回 undefined。' }
  ],
  async check(T) {
    const wait = n => new Promise(r => setTimeout(r, n));
    const input = () => T.$('input');
    const title = () => ((T.$('p.title') || {}).textContent || '').replace(/^[^：]*：/, '').trim();
    if (!input()) { T.ok(false, '渲染出输入框'); return; }
    T.ok(input().value === '写周报', '输入框显示父组件的 task.title：“写周报”（当前：“' + input().value + '”）');
    input().value = '写月报';
    input().dispatchEvent(new Event('input'));
    await wait(0);
    T.ok(title() === '写月报', '输入“写月报”后，父组件的 task.title 也是“写月报”（当前：' + title() + '）');
    const b = T.btn('从父组件修改');
    if (!b) { T.ok(false, '找到“从父组件修改”按钮'); return; }
    await T.click(b);
    await wait(0);
    T.ok(input().value === '新任务', '父组件修改 task.title 后，输入框显示“新任务”（当前：“' + input().value + '”）');
  }
}

export const scopedSlot: Exercise = {
  title: '用作用域插槽定制列表', ch: 6,
  task: '<ol><li>在 UserList 的 slot 上，用 :user="u" 把每个用户传出去。</li><li>在第一个 UserList 中，用 #default="{ user }" 显示“姓名（年龄 岁）”。</li><li>第二个 UserList 不提供插槽，显示后备内容（只有姓名）。</li></ol>',
  tpl: '<UserList :users="users" class="custom" />\n<UserList :users="users" class="plain" />',
  js: 'const UserList = {\n  props: [\'users\'],\n  // TODO 1：把 u 作为插槽 props 传给 slot\n  template: \'<ul><li v-for="u in users" :key="u.id"><slot>{{ u.name }}</slot></li></ul>\'\n}\n\nconst users = ref([\n  { id: 1, name: \'Alice\', age: 30 },\n  { id: 2, name: \'Bob\', age: 25 }\n])\n\n// TODO 2：在模板的第一个 UserList 中使用作用域插槽\nreturn { users, components: { UserList } }',
  solTpl: '<UserList :users="users" class="custom">\n  <template #default="{ user }">{{ user.name }}（{{ user.age }} 岁）</template>\n</UserList>\n<UserList :users="users" class="plain" />',
  solJs: 'const UserList = {\n  props: [\'users\'],\n  template: \'<ul><li v-for="u in users" :key="u.id"><slot :user="u">{{ u.name }}</slot></li></ul>\'\n}\n\nconst users = ref([\n  { id: 1, name: \'Alice\', age: 30 },\n  { id: 2, name: \'Bob\', age: 25 }\n])\n\nreturn { users, components: { UserList } }',
  faded: {
    tpl: `<UserList :users="users" class="custom">
  <template #default="/* ✏️ 从插槽 props 中解构出 user */"><!-- ✏️ 显示“姓名（年龄 岁）” --></template>
</UserList>
<UserList :users="users" class="plain" />`,
    js: `const UserList = {
  props: ['users'],
  template: '<ul><li v-for="u in users" :key="u.id"><slot :user="/* ✏️ 传给插槽的数据：当前这个用户 */">{{ u.name }}</slot></li></ul>'
}

const users = ref([
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 }
])

return { users, components: { UserList } }`
  },
  hints: [
    '用作用域插槽：子组件把数据传给 <slot>，父组件用 #default 接收。第 6 章“6.5 插槽”讲了它。<slot> 中原有的内容是后备内容。',
    '1. 在 UserList 的 template 中，给 <slot> 加 :user="u"。2. 在第一个 <UserList> 中放一个 <template #default="{ user }">，在里面写姓名和年龄。第二个 UserList 不改。',
    '子组件：<slot :user="u">{{ u.name }}</slot>。父组件：<UserList :users="users" class="custom"><template #default="{ user }">{{ user.name }}（{{ user.age }} 岁）</template></UserList>。'
  ],
  async check(T) {
    const txt = sel => T.$$(sel + ' li').map(li => li.textContent.trim());
    const a = txt('ul.custom'), b = txt('ul.plain');
    T.ok(a.length === 2 && b.length === 2, '两个列表各有 2 项（class 透传到 ul 上）');
    T.ok(a[0] === 'Alice（30 岁）' && a[1] === 'Bob（25 岁）', '第一个列表显示“姓名（年龄 岁）”（当前：' + a.join(' / ') + '）');
    T.ok(b[0] === 'Alice' && b[1] === 'Bob', '第二个列表显示后备内容：只有姓名（当前：' + b.join(' / ') + '）');
  },
  wrong: [
    { js: 'const UserList = {\n  props: [\'users\'],\n  template: \'<ul><li v-for="u in users" :key="u.id"><slot :user="u"></slot></li></ul>\'\n}\n\nconst users = ref([\n  { id: 1, name: \'Alice\', age: 30 },\n  { id: 2, name: \'Bob\', age: 25 }\n])\n\nreturn { users, components: { UserList } }', why: '去掉了 slot 里的后备内容。没有提供插槽内容的第二个列表什么也不显示。' },
    { tpl: '<UserList :users="users" class="custom">\n  <template #default="user">{{ user.name }}（{{ user.age }} 岁）</template>\n</UserList>\n<UserList :users="users" class="plain" />', why: '#default="user" 得到的是整个插槽 props 对象 { user: u }。user.name 是 undefined，要解构 { user }，或写 user.user.name。' }
  ]
}

export const propFollow: Exercise = {
  title: '看现象：父组件换了任务，编辑框里还是旧标题', ch: 6,
  task: '<p>TitleEditor 用 <code>ref(props.title)</code> 把标题 prop 当作编辑框的初始值。父组件切换任务后，编辑框里还是旧标题。修复它，同时保持：</p><ol><li>切换任务后，编辑框显示新任务的标题。</li><li>用户可以在编辑框里修改文字，点击“保存”后，父组件收到修改后的文字。</li></ol><p class="cap">说明：返回值中的 components 是本练习台的约定。可以改脚本，也可以改模板。</p>',
  tpl: '<button @click="current = tasks[0]">任务 1</button>\n<button @click="current = tasks[1]">任务 2</button>\n<TitleEditor :title="current.title" @save="saved = $event" />\n<p class="saved">已保存：{{ saved }}</p>',
  js: `const TitleEditor = {
  props: ['title'],
  emits: ['save'],
  setup(props) {
    // 只在创建时读取一次 props.title
    const draft = ref(props.title)
    return { draft }
  },
  template: '<input v-model="draft"> <button @click="$emit(\\'save\\', draft)">保存</button>'
}

const tasks = [{ id: 1, title: '写周报' }, { id: 2, title: '改论文' }]
const current = ref(tasks[0])
const saved = ref('')

return { tasks, current, saved, components: { TitleEditor } }`,
  solJs: `const TitleEditor = {
  props: ['title'],
  emits: ['save'],
  setup(props) {
    const draft = ref(props.title)
    // prop 变化时，同步到本地副本。watch 的来源要写成 getter
    watch(() => props.title, (t) => { draft.value = t })
    return { draft }
  },
  template: '<input v-model="draft"> <button @click="$emit(\\'save\\', draft)">保存</button>'
}

const tasks = [{ id: 1, title: '写周报' }, { id: 2, title: '改论文' }]
const current = ref(tasks[0])
const saved = ref('')

return { tasks, current, saved, components: { TitleEditor } }`,
  faded: {
    js: `const TitleEditor = {
  props: ['title'],
  emits: ['save'],
  setup(props) {
    const draft = ref(props.title)
    // ✏️ 在 prop 变化时，把新值写进 draft。侦听来源要写成 getter：() => ……
    watch(() => /* ✏️ 读取哪个 prop */ 0, (t) => { draft.value = t })
    return { draft }
  },
  template: '<input v-model="draft"> <button @click="$emit(\\'save\\', draft)">保存</button>'
}

const tasks = [{ id: 1, title: '写周报' }, { id: 2, title: '改论文' }]
const current = ref(tasks[0])
const saved = ref('')

return { tasks, current, saved, components: { TitleEditor } }`
  },
  hints: [
    '`ref(props.title)` 只在组件创建时读取一次。父组件换了任务，子组件不会重新创建，draft 就不会变。第 6 章“6.1 用 props 接收数据”的“子组件想改传进来的值”讲了这个问题。',
    '两种常见做法：1. 在子组件里侦听 prop，变化时更新 draft：`watch(() => props.title, …)`。2. 在父组件的 <TitleEditor> 上加 `:key="current.id"`，任务变化时重新创建子组件。',
    'watch(() => props.title, (t) => { draft.value = t })。也可以改模板：<TitleEditor :key="current.id" :title="current.title" @save="saved = $event" />。'
  ],
  async check(T) {
    const inp = () => T.$('input') as HTMLInputElement | null
    const saved = () => (T.$('.saved') || {}).textContent || ''
    if (!inp()) { T.ok(false, '页面上有编辑框'); return }
    T.ok(inp()!.value === '写周报', '初始显示任务 1 的标题“写周报”')
    await T.click(T.btn('任务 2'))
    await T.settle()
    T.ok(!!inp() && inp()!.value === '改论文', '切换到任务 2 后，编辑框显示“改论文”（当前：' + (inp() ? inp()!.value : '没有编辑框') + '）')
    if (!inp()) return
    inp()!.value = '改论文终稿'
    inp()!.dispatchEvent(new Event('input'))
    await nextTick()
    T.ok(inp()!.value === '改论文终稿', '可以在编辑框里修改文字')
    await T.click(T.btn('保存'))
    T.ok(/改论文终稿/.test(saved()), '点击“保存”后，父组件收到“改论文终稿”（当前：' + saved() + '）')
    await T.click(T.btn('任务 1'))
    await T.settle()
    T.ok(!!inp() && inp()!.value === '写周报', '切回任务 1 后，编辑框显示“写周报”')
  },
  wrong: [
    { js: `const TitleEditor = {
  props: ['title'],
  emits: ['save'],
  setup(props) {
    const draft = ref(props.title)
    // 把 prop 解构成普通变量再侦听
    watch(props.title, (t) => { draft.value = t })
    return { draft }
  },
  template: '<input v-model="draft"> <button @click="$emit(\\'save\\', draft)">保存</button>'
}

const tasks = [{ id: 1, title: '写周报' }, { id: 2, title: '改论文' }]
const current = ref(tasks[0])
const saved = ref('')

return { tasks, current, saved, components: { TitleEditor } }`, why: 'watch(props.title, …) 在调用时就读出了字符串，传给 watch 的不是响应式来源。要写 getter：() => props.title。', expectFail: /改论文/ },
    { js: `const TitleEditor = {
  props: ['title'],
  emits: ['save'],
  setup(props) {
    const draft = computed(() => props.title)
    return { draft }
  },
  template: '<input v-model="draft"> <button @click="$emit(\\'save\\', draft)">保存</button>'
}

const tasks = [{ id: 1, title: '写周报' }, { id: 2, title: '改论文' }]
const current = ref(tasks[0])
const saved = ref('')

return { tasks, current, saved, components: { TitleEditor } }`, why: 'computed 默认只读。它能跟随 prop，但用户修改编辑框时无法写入，输入的文字不会保留。需要“能跟随 prop、又能编辑”的副本时，用 ref 加 watch，或者让子组件在 prop 变化时重新创建。', expectFail: /修改文字|保存/ },
    { js: `const TitleEditor = {
  props: ['title'],
  emits: ['save'],
  setup(props) {
    const draft = ref('')
    onMounted(() => { draft.value = props.title })
    return { draft }
  },
  template: '<input v-model="draft"> <button @click="$emit(\\'save\\', draft)">保存</button>'
}

const tasks = [{ id: 1, title: '写周报' }, { id: 2, title: '改论文' }]
const current = ref(tasks[0])
const saved = ref('')

return { tasks, current, saved, components: { TitleEditor } }`, why: 'onMounted 也只在挂载时运行一次，和 ref(props.title) 一样不会跟随 prop。', expectFail: /改论文/ }
  ]
}
