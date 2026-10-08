import type { Exercise } from './types'
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

export const fbPatterns: Exercise = {
  title: '补全：递归渲染评论回复', ch: 17,
  task: '<p>Reply 显示一条评论。每条评论可以有 replies（回复）。回复中还可以有回复。Reply 的其他部分已经写好。</p><ol><li>只补全模板中的一行 TODO：对 node.replies 中的每一条，再渲染一个 Reply。</li><li>传入 :depth="depth + 1"，让下一层多缩进一级。</li><li>确认 4 层、5 条评论全部显示。</li></ol>',
  tpl: '<ul class="thread">\n  <Reply :node="thread" :depth="0" />\n</ul>',
  js: `const thread = reactive({
  id: 1, text: '这个组件怎么写？',
  replies: [
    { id: 2, text: '用递归组件。', replies: [
      { id: 3, text: '停止条件是什么？', replies: [
        { id: 4, text: '没有 replies 时停止。' }
      ] }
    ] },
    { id: 5, text: '也可以用渲染函数。' }
  ]
})

const Reply = {
  name: 'Reply',   // 组件在模板中用这个名字引用自己
  props: ['node', 'depth'],
  // v-if 是停止条件：没有 replies 时，不渲染下一层
  template: \`<li>
    <span class="text" :data-depth="depth">{{ '— '.repeat(depth) }}{{ node.text }}</span>
    <ul v-if="node.replies">
      <!-- TODO：对 node.replies 中的每一条，渲染一个 Reply。depth 加 1 -->
    </ul>
  </li>\`
}

return { thread, components: { Reply } }`,
  solJs: `const thread = reactive({
  id: 1, text: '这个组件怎么写？',
  replies: [
    { id: 2, text: '用递归组件。', replies: [
      { id: 3, text: '停止条件是什么？', replies: [
        { id: 4, text: '没有 replies 时停止。' }
      ] }
    ] },
    { id: 5, text: '也可以用渲染函数。' }
  ]
})

const Reply = {
  name: 'Reply',   // 组件在模板中用这个名字引用自己
  props: ['node', 'depth'],
  // v-if 是停止条件：没有 replies 时，不渲染下一层
  template: \`<li>
    <span class="text" :data-depth="depth">{{ '— '.repeat(depth) }}{{ node.text }}</span>
    <ul v-if="node.replies">
      <Reply v-for="r in node.replies" :key="r.id" :node="r" :depth="depth + 1" />
    </ul>
  </li>\`
}

return { thread, components: { Reply } }`,
  hints: [
    '递归组件在自己的模板中使用自己。v-if 是停止条件：没有 replies 时，不再渲染下一层。第 17 章“17.6 递归组件”和它的实验台讲了它。',
    '只改 TODO 这一行。写一个 <Reply>，用 v-for 遍历 node.replies，写 :key。再传入两个 prop：node 和 depth。',
    '<Reply v-for="r in node.replies" :key="r.id" :node="r" :depth="depth + 1" />'
  ],
  async check(T) {
    const spans = T.$$('.text');
    T.ok(spans.length === 5, '渲染出全部 5 条评论（当前 ' + spans.length + ' 条）');
    const deep = spans.find(s => /没有 replies 时停止/.test(s.textContent));
    T.ok(!!deep, '最深的回复“没有 replies 时停止。”已显示');
    T.ok(!!deep && deep.dataset.depth === '3', '最深的回复的 depth 是 3（当前：' + (deep ? deep.dataset.depth : '无') + '）');
    T.ok(T.$$('ul ul ul ul li').length === 1, '最深的回复在第 4 层 ul 中（嵌套结构正确）');
    // 递归的 Reply 写在 v-for 里：除了根，其余 4 个 Reply 都要有 key
    const rv = collectVNodes(T, byComp(T, 'Reply')).filter(v => v.key != null);
    T.ok(rv.length === 4, 'v-for 渲染的 4 个 Reply 都有 :key（当前 ' + rv.length + ' 个有 key）');
    const last = spans.find(s => /渲染函数/.test(s.textContent));
    T.ok(!!last && last.dataset.depth === '1', '“也可以用渲染函数。”在第 1 层（depth 是 1）');
  }
}

export const treeItem: Exercise = {
  title: '递归的 TreeItem', ch: 17,
  task: '<ol><li>修改 TreeItem 的模板：节点有 children 并且 open 为 true 时，渲染一个 &lt;ul&gt;。</li><li>在 &lt;ul&gt; 中，用 TreeItem 渲染每个子节点。</li><li>点击名字时，折叠或展开子节点。这一步已经写好。</li></ol>',
  tpl: '<ul>\n  <TreeItem :node="tree" />\n</ul>',
  js: "const tree = reactive({\n  name: 'src',\n  children: [\n    { name: 'components', children: [\n      { name: 'Button.vue' },\n      { name: 'forms', children: [{ name: 'Input.vue' }] }\n    ] },\n    { name: 'main.js' }\n  ]\n})\n\nconst TreeItem = {\n  name: 'TreeItem',\n  props: ['node'],\n  setup(props) {\n    const open = ref(true)\n    const isFolder = computed(() => !!(props.node.children && props.node.children.length))\n    return { open, isFolder }\n  },\n  // TODO：在 </span> 后面加一个 <ul>，用 TreeItem 渲染 node.children\n  template: `<li>\n    <span class=\"name\" @click=\"open = !open\">{{ node.name }}</span>\n  </li>`\n}\n\nreturn { tree, components: { TreeItem } }",
  solJs: "const tree = reactive({\n  name: 'src',\n  children: [\n    { name: 'components', children: [\n      { name: 'Button.vue' },\n      { name: 'forms', children: [{ name: 'Input.vue' }] }\n    ] },\n    { name: 'main.js' }\n  ]\n})\n\nconst TreeItem = {\n  name: 'TreeItem',\n  props: ['node'],\n  setup(props) {\n    const open = ref(true)\n    const isFolder = computed(() => !!(props.node.children && props.node.children.length))\n    return { open, isFolder }\n  },\n  template: `<li>\n    <span class=\"name\" @click=\"open = !open\">{{ isFolder ? (open ? '▾ ' : '▸ ') : '' }}{{ node.name }}</span>\n    <ul v-if=\"isFolder && open\">\n      <TreeItem v-for=\"child in node.children\" :key=\"child.name\" :node=\"child\" />\n    </ul>\n  </li>`\n}\n\nreturn { tree, components: { TreeItem } }",
  hints: [
    '递归组件在自己的模板中使用自己。必须有停止条件，否则无限渲染。第 17 章“17.6 递归组件”讲了它。',
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
fbPatterns.wrong = [
  { js: sub(fbPatterns.solJs, ' :key="r.id"', ''), why: '没有写 :key。页面看起来正常，但 Vue 只能按位置复用，回复列表变化时会错位。' },
  { js: sub(fbPatterns.solJs, ':depth="depth + 1"', ':depth="depth"'), why: '没有给 depth 加 1。每一层都是同样的缩进，深度信息丢了。' }
]

treeItem.wrong = [
  { js: sub(treeItem.solJs, '<ul v-if=\"isFolder && open\">', '<ul v-if=\"open\">'), why: '停止条件漏了 isFolder。文件也渲染一个空的 <ul>。页面上看不出来，但结构不对：只有有 children 的节点才应该有 <ul>。' },
  { js: sub(treeItem.solJs, '<ul v-if=\"isFolder && open\">', '<ul v-if=\"isFolder\" v-show=\"open\">'), why: '用 v-show 折叠。子节点只是被隐藏，仍在 DOM 中。题目要求 open 为 false 时不渲染 <ul>。' },
  { js: sub(treeItem.solJs, ' :key=\"child.name\"', ''), why: '没有写 :key。页面看起来正常，但 Vue 只能按位置复用。' }
]

// ===== 半成品示例（参考答案挖掉关键处，占位说明做什么）=====
fbPatterns.faded = {
  js: sub(fbPatterns.solJs, '<Reply v-for="r in node.replies" :key="r.id" :node="r" :depth="depth + 1" />',
    '<!-- ✏️ 每个回复要有 key；下一层的 depth 要比当前层多一级 -->\n      <Reply v-for="r in node.replies" :node="r" :depth="depth" />')
}

treeItem.faded = {
  js: sub(sub(treeItem.solJs, `<ul v-if="isFolder && open">`,
    '<!-- ✏️ 给下面的 ul 加停止条件：什么时候才需要渲染子节点？ -->\n    <ul>'),
    `<TreeItem v-for="child in node.children" :key="child.name" :node="child" />`,
    '<!-- ✏️ 给递归渲染的 TreeItem 加 key -->\n      <TreeItem v-for="child in node.children" :node="child" />')
}
