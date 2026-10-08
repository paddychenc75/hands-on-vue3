import type { Exercise } from './types'
import { nextTick } from 'vue'
import { sub } from './types'

// 判题辅助：沿输出区挂载根的 vnode 树，收集满足条件的 vnode（生产构建里也可用 _vnode）
function collectVNodes(T: any, pred: (v: any) => boolean): any[] {
  let el: any = T.$('ul')
  while (el && !el._vnode) el = el.parentElement
  const out: any[] = []
  const walk = (v: any) => {
    if (!v || typeof v !== 'object') return
    if (Array.isArray(v)) { v.forEach(walk); return }
    if (pred(v)) out.push(v)
    if (v.component) walk(v.component.subTree)
    else walk(v.children)
  }
  walk(el && el._vnode)
  return out
}
// 按注册的组件对象匹配 vnode（不依赖组件选项里的 name 字段，学习者删掉 name 也能照样判）
function byComp(T: any, name: string): (v: any) => boolean {
  const inst = (T.$(':scope > div') as any)?._vnode?.component
  const C = inst && inst.appContext.components[name]
  return v => !!v.type && (C ? v.type === C : v.type.name === name)
}

export const treeItem: Exercise = {
  title: '递归的 TreeItem', ch: 34,
  task: '<ol><li>修改 TreeItem 的模板：节点有 children 并且 open 为 true 时，渲染一个 &lt;ul&gt;。</li><li>在 &lt;ul&gt; 中，用 TreeItem 渲染每个子节点。</li><li>点击名字时，折叠或展开子节点。这一步已经写好。</li></ol>',
  tpl: '<ul>\n  <TreeItem :node="tree" />\n</ul>',
  js: "const tree = reactive({\n  name: 'src',\n  children: [\n    { name: 'components', children: [\n      { name: 'Button.vue' },\n      { name: 'forms', children: [{ name: 'Input.vue' }] }\n    ] },\n    { name: 'main.js' }\n  ]\n})\n\nconst TreeItem = {\n  name: 'TreeItem',\n  props: ['node'],\n  setup(props) {\n    const open = ref(true)\n    const isFolder = computed(() => !!(props.node.children && props.node.children.length))\n    return { open, isFolder }\n  },\n  // TODO：在 </span> 后面加一个 <ul>，用 TreeItem 渲染 node.children\n  template: `<li>\n    <span class=\"name\" @click=\"open = !open\">{{ node.name }}</span>\n  </li>`\n}\n\nreturn { tree, components: { TreeItem } }",
  solJs: "const tree = reactive({\n  name: 'src',\n  children: [\n    { name: 'components', children: [\n      { name: 'Button.vue' },\n      { name: 'forms', children: [{ name: 'Input.vue' }] }\n    ] },\n    { name: 'main.js' }\n  ]\n})\n\nconst TreeItem = {\n  name: 'TreeItem',\n  props: ['node'],\n  setup(props) {\n    const open = ref(true)\n    const isFolder = computed(() => !!(props.node.children && props.node.children.length))\n    return { open, isFolder }\n  },\n  template: `<li>\n    <span class=\"name\" @click=\"open = !open\">{{ isFolder ? (open ? '▾ ' : '▸ ') : '' }}{{ node.name }}</span>\n    <ul v-if=\"isFolder && open\">\n      <TreeItem v-for=\"child in node.children\" :key=\"child.name\" :node=\"child\" />\n    </ul>\n  </li>`\n}\n\nreturn { tree, components: { TreeItem } }",
  hints: [
    '递归组件在自己的模板中使用自己。必须有停止条件，否则无限渲染。第 34 章“34.6 递归组件”讲了它。',
    '在 TreeItem 模板的 </span> 后面加一个 <ul>。用 v-if 写停止条件：isFolder 并且 open。在 <ul> 中用 v-for 渲染 <TreeItem>，传入 :node 和 :key。',
    '<ul v-if="isFolder && open">\n  <TreeItem v-for="child in node.children" :key="child.name" :node="child" />\n</ul>'
  ],
  async check(T) {
    const n = () => T.$$('li').length;
    T.ok(n() === 6, '渲染出全部 6 个节点（当前 ' + n() + ' 个）');
    T.ok(/Input\.vue/.test(T.text()), '最深的节点 Input.vue 已显示');
    T.ok(T.$$('ul').length === 4, '只有文件夹才渲染 <ul>（共 4 个 ul，当前 ' + T.$$('ul').length + ' 个）');
    const tv = collectVNodes(T, byComp(T, 'TreeItem')).filter(v => v.key != null);
    T.ok(tv.length === 5, 'v-for 渲染的 5 个 TreeItem 都有 :key（当前 ' + tv.length + ' 个有 key）');
    T.ok(T.$$('ul ul ul ul li').length === 1, 'Input.vue 在第 4 层 ul 中（嵌套结构正确）');
    const comp = T.$$('.name').find(s => /components/.test(s.textContent));
    if (!comp) { T.ok(false, '找到 components 节点'); return; }
    await T.click(comp);
    T.ok(n() === 3, '点击 components 后，它的子节点隐藏（剩下 ' + n() + ' 个节点）');
    T.ok(T.$$('ul').length === 2, '折叠后，components 的 <ul> 也不渲染（当前 ' + T.$$('ul').length + ' 个 ul）');
    await T.click(T.$$('.name').find(s => /components/.test(s.textContent)));
    T.ok(n() === 6, '再次点击后，子节点重新显示');
  }
}

// ===== 错误解法（基于参考答案做小改动）=====
treeItem.wrong = [
  { js: sub(treeItem.solJs, '<ul v-if=\"isFolder && open\">', '<ul v-if=\"open\">'), why: '停止条件漏了 isFolder。文件也渲染一个空的 <ul>。页面上看不出来，但结构不对：只有有 children 的节点才应该有 <ul>。' },
  { js: sub(treeItem.solJs, '<ul v-if=\"isFolder && open\">', '<ul v-if=\"isFolder\" v-show=\"open\">'), why: '用 v-show 折叠。子节点只是被隐藏，仍在 DOM 中。题目要求 open 为 false 时不渲染 <ul>。' },
  { js: sub(treeItem.solJs, ' :key=\"child.name\"', ''), why: '没有写 :key。页面看起来正常，但 Vue 只能按位置复用。' }
]

// ===== 半成品示例（参考答案挖掉关键处，占位说明做什么）=====
treeItem.faded = {
  js: sub(sub(treeItem.solJs, `<ul v-if="isFolder && open">`,
    '<!-- ✏️ 给下面的 ul 加停止条件：什么时候才需要渲染子节点？ -->\n    <ul>'),
    `<TreeItem v-for="child in node.children" :key="child.name" :node="child" />`,
    '<!-- ✏️ 给递归渲染的 TreeItem 加 key -->\n      <TreeItem v-for="child in node.children" :node="child" />')
}

// ===================== 34.5 复合组件：Tabs 的注册机制 =====================
const TABS_TPL = `<label><input type="checkbox" v-model="showSec"> 显示“安全”</label>
<Tabs>
  <Tab name="info" title="资料">资料内容</Tab>
  <Tab v-if="showSec" name="security" title="安全">安全内容</Tab>
  <Tab name="notice" title="通知">通知内容</Tab>
</Tabs>`

const TABS_JS_HEAD = `const showSec = ref(true)
const TabsKey = Symbol('Tabs')

const Tabs = {
  setup() {
    const tabs = ref([])     // 已注册的标签：{ name, title }
    const active = ref('')   // 当前选中的标签的 name
    const select = name => { active.value = name }
`
const TABS_JS_MID = `
    return { tabs, active, select }
  },
  template: \`<div class="tabs">
    <div class="bar">
      <button v-for="t in tabs" :key="t.name" class="tab-btn" :class="{ on: t.name === active }" @click="select(t.name)">{{ t.title }}</button>
    </div>
    <slot />
  </div>\`
}

const Tab = {
  props: ['name', 'title'],
  setup(props) {
    const ctx = inject(TabsKey)
    if (!ctx) throw new Error('<Tab> 必须放在 <Tabs> 中')
`
const TABS_JS_TAIL = `  },
  template: \`<div v-if="isActive" class="panel"><slot /></div>\`
}

return { showSec, components: { Tabs, Tab } }`

const TABS_PROVIDE = `
    provide(TabsKey, {
      active: readonly(active),          // 子组件只读
      register(tab) {
        tabs.value.push(tab)
        if (!active.value) active.value = tab.name
        return () => {                   // 注销函数
          tabs.value = tabs.value.filter(t => t.name !== tab.name)
          if (active.value === tab.name) active.value = tabs.value.length ? tabs.value[0].name : ''
        }
      },
      select
    })
`
const TABS_TAB_SOL = `    onUnmounted(ctx.register({ name: props.name, title: props.title }))
    const isActive = computed(() => ctx.active.value === props.name)
    return { isActive }
`

export const tabsRegister: Exercise = {
  title: '实现 Tabs 的注册机制', ch: 34,
  task: '<p>Tabs 和 Tab 是一组复合组件。Tabs 用 provide 给后代一个 <code>register</code>。Tab 挂载时注册自己，卸载时注销自己。</p><ol><li>在 Tabs 的 setup 里写 <code>provide(TabsKey, { active, register, select })</code>。<code>active</code> 用 <code>readonly</code> 包装。<code>select</code> 已经写好。</li><li><code>register(tab)</code> 把 tab 加入 <code>tabs</code>。当前还没有选中的标签时，选中它。它返回一个注销函数。</li><li>注销函数把这个标签从 <code>tabs</code> 中删除。如果它正是当前选中的标签，改选第一个剩下的标签（没有剩下的，就设为空串）。</li><li>在 Tab 的 setup 里调用 <code>ctx.register(…)</code>，让它在卸载时自动注销。再用 <code>computed</code> 算出 <code>isActive</code>。</li></ol><p>隐藏再显示“安全”，不能出现重复的按钮。</p>',
  tpl: TABS_TPL,
  js: TABS_JS_HEAD + '\n    // TODO 1：provide(TabsKey, { active, register, select })\n' + TABS_JS_MID + '    // TODO 2：注册自己（卸载时注销），再算出 isActive\n    return { isActive: computed(() => false) }\n' + TABS_JS_TAIL,
  solJs: TABS_JS_HEAD + TABS_PROVIDE + TABS_JS_MID + TABS_TAB_SOL + TABS_JS_TAIL,
  hints: [
    '本章“34.5 复合组件”讲了这套写法。Tabs 提供上下文，Tab 注入上下文。所有对状态的修改都经过 Tabs。',
    'register 返回一个函数，Tab 把这个函数交给 onUnmounted。这个函数里要做两件事：从 tabs 中删除，以及在它是当前标签时改选别的。',
    '删除时按 name 比较：tabs.value.filter(t => t.name !== tab.name)。tabs.value 里存的是代理对象，不能用 === 和原来的 tab 比较。',
    'Tabs：provide(TabsKey, { active: readonly(active), register(tab) { tabs.value.push(tab); if (!active.value) active.value = tab.name; return () => { tabs.value = tabs.value.filter(t => t.name !== tab.name); if (active.value === tab.name) active.value = tabs.value.length ? tabs.value[0].name : \'\' } }, select })\nTab：onUnmounted(ctx.register({ name: props.name, title: props.title })); const isActive = computed(() => ctx.active.value === props.name)'
  ],
  async check(T) {
    await nextTick() // 注册发生在子组件渲染时，标签栏要等下一次更新才有按钮
    const titles = () => T.$$('.tab-btn').map(b => (b.textContent || '').trim())
    const panels = () => T.$$('.panel').map(p => (p.textContent || '').trim())
    T.ok(titles().join() === '资料,安全,通知', '三个标签按钮按模板顺序出现：资料、安全、通知（当前：' + titles().join('、') + '）')
    T.ok(panels().join() === '资料内容', '没有选中任何标签时，第一个注册的标签自动选中，只显示它的面板（当前：' + panels().join('、') + '）')
    await T.click(T.btn('通知'))
    T.ok(panels().join() === '通知内容', '点“通知”后，只显示通知面板（当前：' + panels().join('、') + '）')
    T.ok(T.$$('.tab-btn.on').length === 1 && /通知/.test((T.$('.tab-btn.on') as any)?.textContent || ''), '只有“通知”按钮高亮')
    await T.click(T.btn('安全'))
    const box = T.$('input[type=checkbox]')
    await T.click(box)
    await nextTick()
    T.ok(titles().join() === '资料,通知', '隐藏“安全”后，它的按钮消失（Tab 卸载时要注销）。当前：' + titles().join('、'))
    T.ok(panels().join() === '资料内容', '被删的正是选中的标签，改选第一个剩下的标签“资料”（当前面板：' + (panels().join('、') || '无') + '）')
    await T.click(box)
    await nextTick()
    T.ok(titles().length === 3 && titles().filter(t => t === '安全').length === 1, '再显示“安全”后，它的按钮只出现一次（当前：' + titles().join('、') + '）')
    await T.click(box); await T.click(box); await nextTick()
    T.ok(titles().length === 3, '反复隐藏和显示后，按钮数量不增加（当前 ' + titles().length + ' 个）')
  }
}
tabsRegister.wrong = [
  { js: sub(tabsRegister.solJs, "          tabs.value = tabs.value.filter(t => t.name !== tab.name)\n", ''), why: '注销函数没有把标签从 tabs 中删除。Tab 卸载后，按钮还留在标签栏里。', expectFail: /按钮消失/ },
  { js: sub(tabsRegister.solJs, "          if (active.value === tab.name) active.value = tabs.value.length ? tabs.value[0].name : ''\n", ''), why: '删除的正是选中的标签时，没有改选别的。active 指向一个不存在的标签，页面上没有任何面板。', expectFail: /改选/ },
  { js: sub(tabsRegister.solJs, 'onUnmounted(ctx.register({ name: props.name, title: props.title }))', 'ctx.register({ name: props.name, title: props.title })'), why: 'Tab 调用了 register，却没有把返回的注销函数交给 onUnmounted。卸载时没人注销。', expectFail: /按钮消失/ },
  { js: sub(tabsRegister.solJs, 't => t.name !== tab.name)\n          if', 't => t !== tab)\n          if'), why: '用 !== 比较代理对象和原始对象。tabs.value 里的元素是代理，永远不等于原来的 tab，所以什么也没删掉。按 name 比较。', expectFail: /按钮消失/ }
]
tabsRegister.faded = {
  js: sub(sub(tabsRegister.solJs,
    "          tabs.value = tabs.value.filter(t => t.name !== tab.name)\n          if (active.value === tab.name) active.value = tabs.value.length ? tabs.value[0].name : ''\n",
    "          /* ✏️ 把这个标签从 tabs 中删除；若它是当前标签，改选第一个剩下的（没有就设空串） */\n"),
    TABS_TAB_SOL,
    "    /* ✏️ 注册自己，让它在卸载时自动注销 */\n    const isActive = computed(() => ctx.active.value === props.name)\n    return { isActive }\n")
}

// ===================== 34.4 包装组件转发全部插槽 =====================
const SLOT_JS_HEAD = `const rows = ref([
  { id: 1, title: '写文档', owner: 'amy', done: true },
  { id: 2, title: '修 bug', owner: 'bob', done: false }
])

const TaskTable = {
  props: ['rows'],
  template: \`<table>
    <tr v-for="row in rows" :key="row.id">
      <td class="c-title"><slot name="cell-title" :row="row">{{ row.title }}</slot></td>
      <td class="c-owner"><slot name="cell-owner" :row="row">{{ row.owner }}</slot></td>
      <td class="c-status"><slot name="cell-status" :row="row">-</slot></td>
    </tr>
    <tfoot><tr><td colspan="3" class="foot"><slot name="footer"><i>默认页脚</i></slot></td></tr></tfoot>
  </table>\`
}

const PagedTable = {
  props: ['rows'],
  components: { TaskTable },
  template: \`<div class="paged">
    <TaskTable :rows="rows">
`
const SLOT_JS_TAIL = `    </TaskTable>
    <nav class="pager">第 1 页</nav>
  </div>\`
}

return { rows, components: { PagedTable } }`
const SLOT_FWD = `      <template v-for="(_, name) in $slots" #[name]="scope">
        <slot :name="name" v-bind="scope" />
      </template>
`

export const slotForward: Exercise = {
  title: '包装组件转发全部插槽', ch: 34,
  task: '<p>PagedTable 包装了 TaskTable，并在下面加一个分页条。使用者给 PagedTable 传的插槽，要原样交给 TaskTable。</p><ol><li>在 PagedTable 模板里的 TODO 处，遍历 <code>$slots</code>，为每个插槽生成一个同名的 <code>&lt;template #[name]&gt;</code>。</li><li>每个 template 里放一个 <code>&lt;slot :name="name"&gt;</code>，把作用域参数也传下去。</li><li>使用者没有写的插槽，TaskTable 要继续显示自己的默认内容。</li></ol><p>不要把插槽名一个个写死：PagedTable 事先不知道使用者会传哪些插槽。</p>',
  tpl: `<PagedTable :rows="rows">
  <template #cell-owner="{ row }"><b class="who">@{{ row.owner }}</b></template>
  <template #cell-status="{ row }"><span class="st">{{ row.done ? '完成' : '进行中' }}</span></template>
  <template #footer>共 {{ rows.length }} 条</template>
</PagedTable>`,
  js: SLOT_JS_HEAD + '      <!-- TODO：把 PagedTable 收到的所有插槽（含作用域参数）交给 TaskTable -->\n' + SLOT_JS_TAIL,
  solJs: SLOT_JS_HEAD + SLOT_FWD + SLOT_JS_TAIL,
  hints: [
    '“34.4 作用域插槽”讲过：$slots 是一个对象，键是插槽名。在模板里可以用 v-for 遍历它。',
    '动态插槽名写成 #[name]。作用域参数用 #[name]="scope" 接收，再用 v-bind="scope" 传给里面的 <slot>。',
    '<template v-for="(_, name) in $slots" #[name]="scope">\n  <slot :name="name" v-bind="scope" />\n</template>'
  ],
  async check(T) {
    const texts = (s: string) => T.$$(s).map(x => (x.textContent || '').trim()).join()
    T.ok(texts('.c-owner .who') === '@amy,@bob', '使用者写的 cell-owner 插槽到达了 TaskTable，并且拿到了作用域里的 row（当前：' + texts('.c-owner') + '）')
    T.ok(texts('.c-status .st') === '完成,进行中', '使用者写的 cell-status 插槽也到达了 TaskTable（当前：' + texts('.c-status') + '）')
    T.ok(texts('.foot') === '共 2 条', '没有作用域参数的 footer 插槽也到达了（当前：' + texts('.foot') + '）')
    T.ok(texts('.c-title') === '写文档,修 bug', '使用者没写 cell-title，TaskTable 继续显示自己的默认内容（当前：' + texts('.c-title') + '）')
    T.ok(!!T.$('.pager'), '分页条仍然显示')
  }
}
slotForward.wrong = [
  { js: sub(slotForward.solJs, '#[name]="scope">\n        <slot :name="name" v-bind="scope" />', '#[name]>\n        <slot :name="name" />'), why: '转发了插槽，却没有转发作用域参数。TaskTable 传出的 row 到不了使用者的插槽，使用者读 row.owner 时出错。', expectFail: /代码没有运行/ },
  { js: sub(slotForward.solJs, SLOT_FWD, '      <template #cell-owner="scope"><slot name="cell-owner" v-bind="scope" /></template>\n      <template #footer><slot name="footer" /></template>\n'), why: '把插槽名写死了，只转发了 cell-owner 和 footer。使用者新加的 cell-status 到不了 TaskTable。包装组件事先不知道会收到哪些插槽。', expectFail: /cell-status/ },
  { js: sub(slotForward.solJs, SLOT_FWD, '      <slot />\n'), why: '只转发了默认插槽。具名插槽全部丢失。', expectFail: /cell-owner/ }
]
slotForward.faded = {
  js: sub(slotForward.solJs, SLOT_FWD, '      <template v-for="(_, name) in $slots" #[name]="/* ✏️ 接收作用域参数 */">\n        <!-- ✏️ 用同一个插槽名再放一个 slot，并把作用域参数传下去 -->\n      </template>\n')
}

// ===================== 34.3 表单组件：先改草稿，再提交 =====================
const DRAFT_JS_HEAD = `const user = ref({ name: '小明', city: '北京' })
const submits = ref(0)
const cancels = ref(0)

const UserForm = {
  props: ['user'],
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {
`
const DRAFT_JS_TAIL = `    return { draft, emit }
  },
  template: \`<form class="uf" @submit.prevent="emit('submit', SUBMIT)">
    <input class="f-name" v-model="draft.name">
    <input class="f-city" v-model="draft.city">
    <button class="save">保存</button>
    <button class="cancel" type="button" @click="emit('cancel')">取消</button>
  </form>\`
}

function onSubmit(u) { user.value = u; submits.value++ }

return { user, submits, cancels, onSubmit, components: { UserForm } }`
const DRAFT_SOL_BODY = `    const draft = reactive({ ...props.user })                // 草稿：改它不影响父组件
    watch(() => props.user, u => Object.assign(draft, u))   // 父组件换了数据：重置草稿
`
const draftTail = (payload: string) => DRAFT_JS_TAIL.replace('SUBMIT', payload)

export const draftForm: Exercise = {
  title: '写一个先改草稿再提交的表单', ch: 34,
  task: '<p>第 13 章的 <code>TaskForm</code> 已经用过“先改草稿”；这道题多一个要求：父组件换了数据，草稿要跟着重置。UserForm 编辑父组件传来的 <code>user</code>。用户没点“保存”之前，父组件的数据不能变。</p><ol><li>在 UserForm 的 setup 里，用 <code>props.user</code> 复制出一份响应式的草稿 <code>draft</code>。输入框已经绑定了 <code>draft</code>。</li><li>点“保存”时，表单把草稿的<b>副本</b>发给父组件。模板里的 submit 事件已经写好，请把载荷改成副本。</li><li>父组件把 <code>user</code> 换成另一个用户时，草稿要重置成新用户的数据。</li></ol><p>“取消”只发出 cancel 事件，不用改父组件的数据。</p>',
  tpl: `<UserForm :user="user" @submit="onSubmit" @cancel="cancels++" />
<p class="now">当前用户：{{ user.name }}，{{ user.city }}</p>
<p class="cnt">已保存 {{ submits }} 次，取消 {{ cancels }} 次</p>
<button class="swap" @click="user = { name: '小红', city: '上海' }">切换用户</button>`,
  js: DRAFT_JS_HEAD + '    // TODO 1：复制出草稿 draft\n    // TODO 2：父组件换了 user，重置草稿\n    const draft = reactive({})\n' + draftTail('draft'),
  solJs: DRAFT_JS_HEAD + DRAFT_SOL_BODY + draftTail('{ ...draft }'),
  hints: [
    '“34.3 表单组件”讲了这个写法：草稿是 props.user 的一份复制，输入框改的是草稿。',
    '草稿用 reactive({ ...props.user })。注意它只在 setup 里复制一次，父组件换数据时不会自动更新，需要 watch。',
    'watch(() => props.user, u => Object.assign(draft, u))。保存时发出 { ...draft }：如果直接发 draft，父组件拿到的就是草稿本身，之后再改输入框，父组件的数据会跟着变。',
    'const draft = reactive({ ...props.user })\nwatch(() => props.user, u => Object.assign(draft, u))\n模板里：emit(\'submit\', { ...draft })'
  ],
  async check(T) {
    const val = (s: string) => ((T.$(s) as HTMLInputElement | null)?.value ?? '')
    const now = () => ((T.$('.now') as any)?.textContent || '').trim()
    const cnt = () => ((T.$('.cnt') as any)?.textContent || '').trim()
    const type = async (s: string, v: string) => { const el = T.$(s) as HTMLInputElement; el.value = v; el.dispatchEvent(new Event('input')); await nextTick() }
    T.ok(val('.f-name') === '小明' && val('.f-city') === '北京', '输入框里先显示父组件传来的数据：小明、北京（当前：' + val('.f-name') + '、' + val('.f-city') + '）')
    await type('.f-name', '小明明')
    T.ok(now() === '当前用户：小明，北京', '还没点保存，父组件的数据不变（当前：' + now() + '）。输入框改的是草稿，不是 props')
    await T.click(T.btn('取消'))
    T.ok(/取消 1 次/.test(cnt()) && now() === '当前用户：小明，北京', '点“取消”：父组件收到 cancel，数据没变')
    await T.click(T.btn('保存'))
    T.ok(now() === '当前用户：小明明，北京' && /已保存 1 次/.test(cnt()), '点“保存”：父组件收到新数据（当前：' + now() + '；' + cnt() + '）')
    await type('.f-name', '小明明明')
    T.ok(now() === '当前用户：小明明，北京', '保存之后继续改输入框，父组件的数据不变：发给父组件的是草稿的副本，不是草稿本身（当前：' + now() + '）')
    await T.click(T.btn('切换用户'))
    T.ok(val('.f-name') === '小红' && val('.f-city') === '上海', '父组件切换用户后，输入框重置成新用户的数据，没保存的输入被丢弃（当前：' + val('.f-name') + '、' + val('.f-city') + '）')
    await type('.f-city', '深圳')
    await T.click(T.btn('保存'))
    T.ok(now() === '当前用户：小红，深圳', '对新用户编辑并保存，同样有效（当前：' + now() + '）')
  }
}
draftForm.wrong = [
  { js: sub(draftForm.solJs, DRAFT_SOL_BODY, "    const draft = props.user\n"), why: '输入框直接绑定了 props.user 里的字段。敲一个字，父组件的数据就变了：不用点保存，页面其他地方已经显示新值，取消也无法还原。', expectFail: /还没点保存/ },
  { js: sub(draftForm.solJs, "    watch(() => props.user, u => Object.assign(draft, u))   // 父组件换了数据：重置草稿\n", ''), why: '草稿只在 setup 里复制了一次。父组件换成另一个用户，输入框里还是上一个用户的数据。', expectFail: /切换用户/ },
  { js: sub(draftForm.solJs, "emit('submit', { ...draft })", "emit('submit', draft)"), why: '把草稿本身发给了父组件。父组件的 user 和草稿成了同一个对象，保存之后再改输入框，父组件的数据又跟着变。', expectFail: /保存之后继续改/ }
]
draftForm.faded = {
  js: sub(draftForm.solJs, DRAFT_SOL_BODY, "    const draft = /* ✏️ 用 props.user 复制出一份响应式的草稿 */ reactive({})\n    /* ✏️ 父组件换了 user：怎样重置草稿？ */\n")
}
