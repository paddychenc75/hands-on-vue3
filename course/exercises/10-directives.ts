import type { Exercise } from './types'

// 沿 vnode 树找到 setup 返回了 open 的组件实例（Dropdown）
function findDropdown(v: any): any {
  if (!v) return null
  if (v.component) {
    const st = v.component.setupState
    if (st && st.open !== undefined) return v.component
    return findDropdown(v.component.subTree)
  }
  if (Array.isArray(v.children)) {
    for (const c of v.children) { const r = findDropdown(c); if (r) return r }
  }
  return null
}

// 卸载后，把 open 重新设为 true，再点击外部。监听没有被真正删除时，旧的监听会把它改回 false
async function leakedAfterUnmount(T: any, dd: any): Promise<boolean> {
  if (!dd) return false
  dd.setupState.open = true
  await T.click(T.$('.outside'))
  return dd.setupState.open !== true
}

export const dirBinding: Exercise = {
  title: '补全：v-tag 读取 arg 和 modifiers', ch: 10,
  task: '<p>这是实验台“binding 和钩子”中的 v-tag。apply 在 mounted 和 updated 中运行，它已经用 binding.value 设置了文字。只补全两行 TODO。</p><ol><li>TODO 1：用冒号后面的参数设置 <code>el.style.textAlign</code>。没有参数时，用 \'left\'。</li><li>TODO 2：有修饰符 .bold 时，<code>el.style.fontWeight</code> 是 \'700\'，否则是 \'400\'。</li><li>在输入框中输入文字。确认三行文字都更新，对齐和粗细不变。</li></ol>',
  tpl: '<TagDemo />',
  js: `function apply(el, binding) {
  el.textContent = binding.value
  // TODO 1：用参数 arg 设置 el.style.textAlign。没有参数时，用 'left'
  // TODO 2：有修饰符 bold 时，el.style.fontWeight 是 '700'，否则是 '400'
}

const vTag = {
  mounted: apply,
  updated: apply
}

const TagDemo = {
  directives: { tag: vTag },   // 注册为 v-tag
  setup() {
    return { text: ref('你好') }
  },
  template: '<p class="a" v-tag:center.bold="text"></p>' +
    '<p class="b" v-tag:right="text"></p>' +
    '<p class="c" v-tag="text"></p>' +
    '<input v-model="text">'
}

return { components: { TagDemo } }`,
  solJs: `function apply(el, binding) {
  el.textContent = binding.value
  el.style.textAlign = binding.arg || 'left'                      // 冒号后面的参数
  el.style.fontWeight = binding.modifiers.bold ? '700' : '400'    // 修饰符对象，例如 { bold: true }
}

const vTag = {
  mounted: apply,
  updated: apply
}

const TagDemo = {
  directives: { tag: vTag },   // 注册为 v-tag
  setup() {
    return { text: ref('你好') }
  },
  template: '<p class="a" v-tag:center.bold="text"></p>' +
    '<p class="b" v-tag:right="text"></p>' +
    '<p class="c" v-tag="text"></p>' +
    '<input v-model="text">'
}

return { components: { TagDemo } }`,
  faded: {
    js: `function apply(el, binding) {
  el.textContent = binding.value
  el.style.textAlign = /* ✏️ 冒号后面的参数；没有参数时用 'left' */ ''
  el.style.fontWeight = /* ✏️ 有修饰符 bold 时是 '700'，否则是 '400' */ ''
}

const vTag = {
  mounted: apply,
  updated: apply
}

const TagDemo = {
  directives: { tag: vTag },   // 注册为 v-tag
  setup() {
    return { text: ref('你好') }
  },
  template: '<p class="a" v-tag:center.bold="text"></p>' +
    '<p class="b" v-tag:right="text"></p>' +
    '<p class="c" v-tag="text"></p>' +
    '<input v-model="text">'
}

return { components: { TagDemo } }`
  },
  hints: [
    '钩子的第二个参数 binding 有三个常用属性：value 是等号后面表达式的结果，arg 是冒号后面的参数，modifiers 是点后面的修饰符。第 10 章“10.3 读取 binding 的 value、arg 和 modifiers”的表格讲了它。',
    'TODO 1：给 el.style.textAlign 赋值 binding.arg。arg 是 undefined 时，用 \'left\'。TODO 2：modifiers 是一个对象，不是数组。读取它的 bold 属性，用条件运算符得到 \'700\' 或 \'400\'。',
    "el.style.textAlign = binding.arg || 'left'\nel.style.fontWeight = binding.modifiers.bold ? '700' : '400'"
  ],
  wrong: [
    { js: `function apply(el, binding) {
  el.textContent = binding.value
  el.style.textAlign = binding.value || 'left'
  el.style.fontWeight = binding.modifiers.bold ? '700' : '400'
}

const vTag = {
  mounted: apply,
  updated: apply
}

const TagDemo = {
  directives: { tag: vTag },
  setup() {
    return { text: ref('你好') }
  },
  template: '<p class="a" v-tag:center.bold="text"></p>' +
    '<p class="b" v-tag:right="text"></p>' +
    '<p class="c" v-tag="text"></p>' +
    '<input v-model="text">'
}

return { components: { TagDemo } }`, why: 'value 是等号后面表达式的结果（文字）。冒号后面的 center 和 right 在 arg 中。' },
    { js: `function apply(el, binding) {
  el.textContent = binding.value
  el.style.textAlign = binding.arg || 'left'
  el.style.fontWeight = binding.modifiers.includes('bold') ? '700' : '400'
}

const vTag = {
  mounted: apply,
  updated: apply
}

const TagDemo = {
  directives: { tag: vTag },
  setup() {
    return { text: ref('你好') }
  },
  template: '<p class="a" v-tag:center.bold="text"></p>' +
    '<p class="b" v-tag:right="text"></p>' +
    '<p class="c" v-tag="text"></p>' +
    '<input v-model="text">'
}

return { components: { TagDemo } }`, why: 'modifiers 是对象 { bold: true }，不是数组，没有 includes 方法。' }
  ],
  async check(T) {
    const wait = n => new Promise(r => setTimeout(r, n));
    const p = c => T.$('p.' + c);
    if (!p('a') || !p('b') || !p('c')) { T.ok(false, '渲染出三行文字'); return; }
    const st = c => p(c).style.textAlign + ' / ' + p(c).style.fontWeight;
    T.ok(p('a').textContent === '你好', '文字来自 binding.value：“你好”');
    T.ok(p('a').style.textAlign === 'center' && p('b').style.textAlign === 'right' && p('c').style.textAlign === 'left', 'TODO 1：三行分别居中、靠右、靠左（当前：' + [p('a'), p('b'), p('c')].map(e => e.style.textAlign || '空').join('、') + '）');
    T.ok(p('a').style.fontWeight === '700' && p('b').style.fontWeight === '400' && p('c').style.fontWeight === '400', 'TODO 2：只有 .bold 的第一行是 700，其他两行是 400（当前：' + [p('a'), p('b'), p('c')].map(e => e.style.fontWeight || '空').join('、') + '）');
    const input = T.$('input');
    input.value = '再见';
    input.dispatchEvent(new Event('input'));
    await wait(0);
    T.ok(p('a').textContent === '再见' && p('c').textContent === '再见', '输入“再见”后，文字更新');
    T.ok(st('a') === 'center / 700' && st('b') === 'right / 400', '更新后，对齐和粗细不变');
  }
}

export const outsideFill: Exercise = {
  title: '补全：v-click-outside 的两行代码', ch: 10,
  task: '<p>这是第 10.5 节的 v-click-outside。监听函数已经保存到 el._handler，也已经添加到 document。只补全两行 TODO。</p><ol><li>TODO 1：点击在 el 外部时，调用 binding.value()。</li><li>TODO 2：卸载时，用同一个 el._handler 删除监听。</li></ol>',
  tpl: '<Dropdown v-if="show" />\n<p class="outside">页面的其他区域</p>\n<button @click="show = !show">卸载 Dropdown</button>',
  js: `const show = ref(true)

const Dropdown = {
  directives: {
    clickOutside: {
      mounted(el, binding) {
        el._handler = e => {
          // TODO 1：点击在 el 外部时，调用 binding.value()
        }
        document.addEventListener('click', el._handler)
      },
      unmounted(el) {
        // TODO 2：用同一个 el._handler 删除监听
      }
    }
  },
  setup() {
    const open = ref(false)
    const close = () => { open.value = false }
    return { open, close }
  },
  template: '<div class="dropdown" v-click-outside="close">' +
    '<button @click="open = !open">菜单</button>' +
    '<ul v-if="open"><li>编辑</li><li>删除</li></ul></div>'
}

return { show, components: { Dropdown } }`,
  solJs: `const show = ref(true)

const Dropdown = {
  directives: {
    clickOutside: {
      mounted(el, binding) {
        el._handler = e => {
          if (!e.composedPath().includes(el)) binding.value()   // 事件路径中没有 el：点击在外部
        }
        document.addEventListener('click', el._handler)
      },
      unmounted(el) {
        document.removeEventListener('click', el._handler)      // 同一个函数，才能删除
      }
    }
  },
  setup() {
    const open = ref(false)
    const close = () => { open.value = false }
    return { open, close }
  },
  template: '<div class="dropdown" v-click-outside="close">' +
    '<button @click="open = !open">菜单</button>' +
    '<ul v-if="open"><li>编辑</li><li>删除</li></ul></div>'
}

return { show, components: { Dropdown } }`,
  faded: {
    js: `const show = ref(true)

const Dropdown = {
  directives: {
    clickOutside: {
      mounted(el, binding) {
        el._handler = e => {
          if (/* ✏️ 事件路径 e.composedPath() 里没有 el，就是点击在外部 */ false) binding.value()
        }
        document.addEventListener('click', el._handler)
      },
      unmounted(el) {
        document.removeEventListener('click', /* ✏️ 传入哪个函数，才能删掉监听 */)
      }
    }
  },
  setup() {
    const open = ref(false)
    const close = () => { open.value = false }
    return { open, close }
  },
  template: '<div class="dropdown" v-click-outside="close">' +
    '<button @click="open = !open">菜单</button>' +
    '<ul v-if="open"><li>编辑</li><li>删除</li></ul></div>'
}

return { show, components: { Dropdown } }`
  },
  hints: [
    '指令在 mounted 中添加监听，在 unmounted 中删除监听。e.composedPath() 是事件经过的元素列表。列表中没有 el 时，点击在外部。第 10 章 10.5 节讲了它。',
    'TODO 1：写一个 if。条件是 e.composedPath() 不包含 el。条件成立时，调用 binding.value()。TODO 2：调用 document.removeEventListener，参数是 \'click\' 和 el._handler。',
    'TODO 1：if (!e.composedPath().includes(el)) binding.value()\nTODO 2：document.removeEventListener(\'click\', el._handler)'
  ],
  async check(T) {
    const menu = () => T.$('.dropdown button');
    if (!menu()) { T.ok(false, '页面上有“菜单”按钮'); return; }
    await T.click(menu());
    T.ok(T.$$('.dropdown li').length === 2, '点击“菜单”后，菜单打开');
    await T.click(T.$('.dropdown li'));
    T.ok(T.$$('.dropdown li').length === 2, '点击菜单内部时，菜单不关闭');
    await T.click(T.$('.outside'));
    T.ok(T.$$('.dropdown li').length === 0, 'TODO 1：点击外部区域后，菜单关闭');
    const dd = findDropdown((T.$(':scope > div') as any)?._vnode)
    await T.click(T.btn('卸载'));
    T.ok(!T.$('.dropdown'), 'Dropdown 已卸载');
    T.ok(!(await leakedAfterUnmount(T, dd)), 'TODO 2：卸载后，点击外部不再触发旧的监听（要真正删除监听：removeEventListener 必须传入添加时的同一个函数）');
  },
  wrong: [
    { js: 'const show = ref(true)\n\nconst Dropdown = {\n  directives: {\n    clickOutside: {\n      mounted(el, binding) {\n        el._handler = e => {\n          if (e.target !== el) binding.value()   // 事件路径中没有 el：点击在外部\n        }\n        document.addEventListener(\'click\', el._handler)\n      },\n      unmounted(el) {\n        document.removeEventListener(\'click\', el._handler)      // 同一个函数，才能删除\n      }\n    }\n  },\n  setup() {\n    const open = ref(false)\n    const close = () => { open.value = false }\n    return { open, close }\n  },\n  template: \'<div class="dropdown" v-click-outside="close">\' +\n    \'<button @click="open = !open">菜单</button>\' +\n    \'<ul v-if="open"><li>编辑</li><li>删除</li></ul></div>\'\n}\n\nreturn { show, components: { Dropdown } }', why: '只比较 e.target 和 el。点击 el 里面的子元素（按钮、li）时，target 不是 el，菜单也被关闭。要判断 el 是否包含事件的目标或路径。' },
    { js: 'const show = ref(true)\n\nconst Dropdown = {\n  directives: {\n    clickOutside: {\n      mounted(el, binding) {\n        el._handler = e => {\n          if (!e.composedPath().includes(el)) binding.value()   // 事件路径中没有 el：点击在外部\n        }\n        document.addEventListener(\'click\', el._handler)\n      },\n      unmounted(el) {\n        document.removeEventListener(\'click\', e => binding.value())      // 同一个函数，才能删除\n      }\n    }\n  },\n  setup() {\n    const open = ref(false)\n    const close = () => { open.value = false }\n    return { open, close }\n  },\n  template: \'<div class="dropdown" v-click-outside="close">\' +\n    \'<button @click="open = !open">菜单</button>\' +\n    \'<ul v-if="open"><li>编辑</li><li>删除</li></ul></div>\'\n}\n\nreturn { show, components: { Dropdown } }', why: '删除监听时传入了新写的箭头函数。removeEventListener 按函数引用匹配，新函数删不掉 el._handler，卸载后监听仍留在 document 上。' }
  ]
}

export const clickOutside: Exercise = {
  title: '写一个 v-click-outside', ch: 10,
  task: '<ol><li>补全 Dropdown 中的 clickOutside 指令。</li><li>mounted：在 document 上添加 click 监听。点击在 el 外部时，调用 binding.value。</li><li>unmounted：删除这个监听。</li></ol>',
  tpl: '<Dropdown v-if="show" />\n<p class="outside">页面的其他区域</p>\n<button @click="show = !show">卸载 Dropdown</button>',
  js: "const show = ref(true)\n\nconst Dropdown = {\n  directives: {\n    clickOutside: {\n      mounted(el, binding) {\n        // TODO 1：创建监听函数，保存到 el._handler\n        //   点击在 el 外部时，调用 binding.value()\n        // TODO 2：在 document 上添加 click 监听\n      },\n      unmounted(el) {\n        // TODO 3：删除监听\n      }\n    }\n  },\n  setup() {\n    const open = ref(false)\n    return { open }\n  },\n  template: `<div class=\"dropdown\" v-click-outside=\"() => { open = false }\">\n    <button @click=\"open = !open\">菜单</button>\n    <ul v-if=\"open\"><li>编辑</li><li>删除</li></ul>\n  </div>`\n}\n\nreturn { show, components: { Dropdown } }",
  solJs: "const show = ref(true)\n\nconst Dropdown = {\n  directives: {\n    clickOutside: {\n      mounted(el, binding) {\n        el._fn = binding.value\n        el._handler = e => {\n          if (!e.composedPath().includes(el)) el._fn(e)   // 点击在外部\n        }\n        document.addEventListener('click', el._handler)\n      },\n      updated(el, binding) {\n        el._fn = binding.value      // 保存最新的回调\n      },\n      unmounted(el) {\n        document.removeEventListener('click', el._handler)\n      }\n    }\n  },\n  setup() {\n    const open = ref(false)\n    return { open }\n  },\n  template: `<div class=\"dropdown\" v-click-outside=\"() => { open = false }\">\n    <button @click=\"open = !open\">菜单</button>\n    <ul v-if=\"open\"><li>编辑</li><li>删除</li></ul>\n  </div>`\n}\n\nreturn { show, components: { Dropdown } }",
  faded: {
    js: `const show = ref(true)

const Dropdown = {
  directives: {
    clickOutside: {
      mounted(el, binding) {
        el._fn = binding.value
        el._handler = e => {
          /* ✏️ 点击在 el 外部时，调用 el._fn(e) */
        }
        /* ✏️ 在 document 上添加 click 监听 */
      },
      updated(el, binding) {
        /* ✏️ 保存最新的回调：模板里的函数每次渲染都是新的 */
      },
      unmounted(el) {
        /* ✏️ 删除监听：要用添加时的同一个函数 */
      }
    }
  },
  setup() {
    const open = ref(false)
    return { open }
  },
  template: \`<div class="dropdown" v-click-outside="() => { open = false }">
    <button @click="open = !open">菜单</button>
    <ul v-if="open"><li>编辑</li><li>删除</li></ul>
  </div>\`
}

return { show, components: { Dropdown } }`
  },
  hints: [
    '自定义指令在 mounted 中添加监听，在 unmounted 中删除同一个监听。第 10 章“10.5 实用指令：v-click-outside”讲了这个指令。不删除监听，组件卸载后监听仍在。',
    '1. mounted：把监听函数保存到 el._handler。函数中判断事件路径是否包含 el，不包含时调用 binding.value()。然后在 document 上添加 click 监听。2. unmounted：用同一个 el._handler 删除监听。',
    'mounted(el, binding) {\n  el._fn = binding.value\n  el._handler = e => { if (!e.composedPath().includes(el)) el._fn(e) }\n  document.addEventListener(\'click\', el._handler)\n},\nupdated(el, binding) { el._fn = binding.value },\nunmounted(el) {\n  document.removeEventListener(\'click\', el._handler)\n}'
  ],
  async check(T) {
    const menu = () => T.$('.dropdown button');
    if (!menu()) { T.ok(false, '页面上有“菜单”按钮'); return; }
    await T.click(menu());
    T.ok(T.$$('.dropdown li').length === 2, '点击“菜单”后，菜单打开');
    await T.click(T.$('.dropdown li'));
    T.ok(T.$$('.dropdown li').length === 2, '点击菜单内部时，菜单不关闭');
    await T.click(T.$('.outside'));
    T.ok(T.$$('.dropdown li').length === 0, '点击外部区域后，菜单关闭');
    await T.click(menu());
    await T.click(menu());
    T.ok(T.$$('.dropdown li').length === 0, '再次点击“菜单”时，菜单关闭');
    const dd = findDropdown((T.$(':scope > div') as any)?._vnode)
    await T.click(T.btn('卸载'));
    T.ok(!T.$('.dropdown'), 'Dropdown 已卸载');
    T.ok(!(await leakedAfterUnmount(T, dd)), '卸载后，点击外部不再触发旧的监听（要真正删除监听：removeEventListener 必须传入添加时的同一个函数）');
  },
  wrong: [
    { js: 'const show = ref(true)\n\nconst Dropdown = {\n  directives: {\n    clickOutside: {\n      mounted(el, binding) {\n        el._fn = binding.value\n        el._handler = e => {\n          if (e.target !== el) el._fn(e)   // 点击在外部\n        }\n        document.addEventListener(\'click\', el._handler)\n      },\n      updated(el, binding) {\n        el._fn = binding.value      // 保存最新的回调\n      },\n      unmounted(el) {\n        document.removeEventListener(\'click\', el._handler)\n      }\n    }\n  },\n  setup() {\n    const open = ref(false)\n    return { open }\n  },\n  template: `<div class="dropdown" v-click-outside="() => { open = false }">\n    <button @click="open = !open">菜单</button>\n    <ul v-if="open"><li>编辑</li><li>删除</li></ul>\n  </div>`\n}\n\nreturn { show, components: { Dropdown } }', why: '只比较 e.target 和 el。点击菜单里的 li 时 target 不是 el，菜单被误关。要判断点击是否发生在 el 内部，例如 el.contains(e.target)。' },
    { js: 'const show = ref(true)\n\nconst Dropdown = {\n  directives: {\n    clickOutside: {\n      mounted(el, binding) {\n        el._fn = binding.value\n        el._handler = e => {\n          if (!e.composedPath().includes(el)) el._fn(e)   // 点击在外部\n        }\n        document.addEventListener(\'click\', el._handler)\n      },\n      updated(el, binding) {\n        el._fn = binding.value      // 保存最新的回调\n      },\n      unmounted(el) {\n      }\n    }\n  },\n  setup() {\n    const open = ref(false)\n    return { open }\n  },\n  template: `<div class="dropdown" v-click-outside="() => { open = false }">\n    <button @click="open = !open">菜单</button>\n    <ul v-if="open"><li>编辑</li><li>删除</li></ul>\n  </div>`\n}\n\nreturn { show, components: { Dropdown } }', why: 'unmounted 里没有删除监听。组件卸载后，document 上的 click 监听还在，造成泄漏。' },
    { js: 'const show = ref(true)\n\nconst Dropdown = {\n  directives: {\n    clickOutside: {\n      mounted(el, binding) {\n        el._fn = binding.value\n        el._handler = e => {\n          if (!e.composedPath().includes(el)) el._fn(e)   // 点击在外部\n        }\n        document.addEventListener(\'click\', el._handler)\n      },\n      updated(el, binding) {\n        el._fn = binding.value      // 保存最新的回调\n      },\n      unmounted(el) {\n        document.removeEventListener(\'click\', e => {})\n      }\n    }\n  },\n  setup() {\n    const open = ref(false)\n    return { open }\n  },\n  template: `<div class="dropdown" v-click-outside="() => { open = false }">\n    <button @click="open = !open">菜单</button>\n    <ul v-if="open"><li>编辑</li><li>删除</li></ul>\n  </div>`\n}\n\nreturn { show, components: { Dropdown } }', why: '删除监听时传入了新写的函数。必须传入添加时的同一个函数 el._handler，否则删不掉。' }
  ]
}
