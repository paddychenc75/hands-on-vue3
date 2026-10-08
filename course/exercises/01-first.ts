import type { Exercise } from './types'

export const counter: Exercise = {
  title: '做一个计数器',
  ch: 1,
  task: '按钮显示“点了 N 次”。每次点击，N 加 1。只修改模板。',
  tpl: '<button>点我</button>',
  js: 'const count = ref(0)\n\nreturn { count }',
  solTpl: '<button @click="count++">点了 {{ count }} 次</button>',
  faded: {
    tpl: '<button @click="/* ✏️ 点击时让 count 加 1 */">点了 {{ /* ✏️ 在这里显示当前次数 */ }} 次</button>'
  },
  hints: [
    '用到两个模板语法：{{ }} 插值显示数据，@click 监听点击。第 1 章 1.2 节讲了插值，1.3 节讲了 @click。count 是 ref，模板中直接写 count，不写 .value。',
    '只改 <button> 这一行。在开始标签上加 @click="…"，让 count 加 1。把按钮文字改为“点了 {{ … }} 次”。',
    '<button @click="count++">点了 {{ count }} 次</button>'
  ],
  async check(T) {
    const b = T.$('button')
    T.ok(!!b, '页面上有一个按钮')
    if (!b) return
    T.ok(/点了\s*0\s*次/.test(b.textContent || ''), '初始显示“点了 0 次”')
    await T.click(b)
    T.ok(/点了\s*1\s*次/.test((T.$('button') as Element).textContent || ''), '点一次后显示“点了 1 次”')
    await T.click(T.$('button'))
    T.ok(/点了\s*2\s*次/.test((T.$('button') as Element).textContent || ''), '再点一次显示“点了 2 次”')
  },
  wrong: [
    { tpl: '<button @click="count.value++">点了 {{ count }} 次</button>', why: '在模板里写了 .value。模板会自动解包 ref，count 已经是数字，不需要 .value；写了反而改不到 ref，计数不变。' },
    { tpl: '<button @click="count++">点了 {{ count }} 次</button>', js: 'let count = 0\n\nreturn { count }', why: '用普通变量保存数据。Vue 不知道它改变了，点击后页面不更新。要用 ref 创建响应式数据。' }
  ]
}

export const firstFill: Exercise = {
  title: '补全：让按钮改变数字',
  ch: 1,
  task: '<p>这是第 1.2 节的计数器。数字显示在段落中，按钮在下面。只补全两处 TODO。</p><ol><li>TODO 1（脚本）：用 ref 创建 count，初始值是 0。</li><li>TODO 2（模板）：点击按钮时，count 加 1。</li></ol>',
  tpl: '<p>点了 {{ count }} 次</p>\n<!-- TODO 2：点击时让 count 加 1 -->\n<button>+1</button>',
  js: 'const count = null   // TODO 1：用 ref 创建响应式数据，初始值是 0\n\nreturn { count }',
  solTpl: '<p>点了 {{ count }} 次</p>\n<button @click="count++">+1</button>',
  solJs: 'const count = ref(0)   // 响应式数据，初始值是 0\n\nreturn { count }',
  faded: {
    tpl: `<p>点了 {{ count }} 次</p>
<button @click="/* ✏️ 点击时让 count 加 1 */">+1</button>`,
    js: `const count = /* ✏️ 用 ref 创建响应式数据，初始值是 0 */ null

return { count }`
  },
  hints: [
    'ref 创建响应式数据。模板读取它，所以它改变时 Vue 更新页面。第 1 章 1.3 节讲了它。@click 给按钮绑定点击事件。',
    'TODO 1：把 null 改为 ref(…)，参数是 0。TODO 2：在 <button> 上加 @click，表达式让 count 加 1。在模板中不写 .value。',
    '脚本：const count = ref(0)\n模板：<button @click="count++">+1</button>'
  ],
  async check(T) {
    const p = () => (T.$('p') || { textContent: '' }).textContent || ''
    T.ok(/点了\s*0\s*次/.test(p()), '初始显示“点了 0 次”（当前：' + p().trim() + '）')
    const b = T.btn('+1')
    if (!b) {
      T.ok(false, '找到 +1 按钮')
      return
    }
    await T.click(b)
    T.ok(/点了\s*1\s*次/.test(p()), '点击一次后显示“点了 1 次”（当前：' + p().trim() + '）')
    await T.click(T.btn('+1'))
    T.ok(/点了\s*2\s*次/.test(p()), '再点一次显示“点了 2 次”')
  },
  wrong: [
    { tpl: '<p>点了 {{ count }} 次</p>\n<button @click="count++">+1</button>', js: 'let count = 0   // 普通变量\n\nreturn { count }', why: '用普通变量代替 ref。count++ 会执行，但页面不会更新。' },
    { tpl: '<p>点了 {{ count }} 次</p>\n<button @click="count + 1">+1</button>', why: '@click 里写了 count + 1。它只算出一个新值，没有赋值，count 不会改变。要写 count++ 或 count += 1。' }
  ]
}
