import type { Exercise } from './types'
import { sub } from './types'

export const fbTs: Exercise = {
  title: '补全：带默认值的 prop 的编译结果', ch: 14,
  task: '<p>说明：练习台不能运行 TypeScript。本题练习编译器做的那一步：把类型和默认值改写为运行时的 props 声明。</p><p>Stepper 在 .vue 文件中的写法是：</p><pre class="sc-code">const { label, step = 1 } = defineProps&lt;{ label: string; step?: number }&gt;()</pre><ol><li>label 的声明已经写好。</li><li>只补全一行 TODO：写出 step 的声明，包括 type、required 和 default。</li><li>确认“加一”每次加 1，“加五”每次加 5。</li></ol>',
  tpl: '<Stepper label="加一" />\n<Stepper label="加五" :step="5" />',
  js: `// 源代码：const { label, step = 1 } = defineProps<{ label: string; step?: number }>()
// 下面是编译器生成的运行时声明
const Stepper = {
  props: {
    label: { type: String, required: true },   // label: string
    // TODO：写出 step 的声明。它是可选的 number，默认值是 1
  },
  setup() {
    return { n: ref(0) }
  },
  template: '<button class="step" @click="n += step">{{ label }}：{{ n }}</button>'
}

return { components: { Stepper } }`,
  solJs: `// 源代码：const { label, step = 1 } = defineProps<{ label: string; step?: number }>()
// 下面是编译器生成的运行时声明
const Stepper = {
  props: {
    label: { type: String, required: true },                // label: string
    step: { type: Number, required: false, default: 1 }     // step?: number，解构默认值 1
  },
  setup() {
    return { n: ref(0) }
  },
  template: '<button class="step" @click="n += step">{{ label }}：{{ n }}</button>'
}

return { components: { Stepper } }`,
  hints: [
    '编译器把类型改写为 type 和 required。? 表示可选。3.5 中，解构时写的默认值变为 default。第 14 章实验台的“props 解构默认值 (3.5)”页讲了它。',
    '只改 TODO 这一行。写一个键 step。它的值和 label 一样是对象，有三个键：type、required、default。number 生成 Number。',
    'step: { type: Number, required: false, default: 1 }'
  ],
  async check(T) {
    const btn = t => T.$$('button.step').find(b => b.textContent.includes(t));
    const num = t => { const b = btn(t); const m = b && b.textContent.match(/：\s*(\S+)/); return m ? m[1] : '无'; };
    T.ok(T.$$('button.step').length === 2, '渲染出 2 个 Stepper（当前 ' + T.$$('button.step').length + ' 个）');
    if (!btn('加一') || !btn('加五')) return;
    await T.click(btn('加一'));
    T.ok(num('加一') === '1', '点击“加一”后显示 1（当前：' + num('加一') + '）');
    await T.click(btn('加五'));
    T.ok(num('加五') === '5', '点击“加五”后显示 5（当前：' + num('加五') + '）');
    T.ok(!btn('加五').hasAttribute('step'), 'step 是 prop，没有作为属性透传到 button 上');
    const root = T.$(':scope > div');
    const inst = root && root._vnode && root._vnode.component;
    const S = inst && inst.appContext.components.Stepper;
    const P = S && S.props, s = P && P.step;
    T.ok(!!s && s.type === Number && !s.required && s.default === 1, 'step 声明为 { type: Number, required: false, default: 1 }');
  }
}

export const tsProps: Exercise = {
  title: '把类型声明改写为运行时 props', ch: 14,
  task: '<p>说明：练习台不能运行 TypeScript。本题练习编译器做的那一步：把类型改写为运行时的 props 声明。</p><p>Badge 在 .vue 文件中的写法是：</p><pre class="sc-code">defineProps&lt;{ title: string; size?: \'sm\' | \'md\' }&gt;()</pre><ol><li>把 Badge 的 props 改为编译器生成的对象写法：每个 prop 写 type 和 required。</li><li>确认 size="sm" 成为 prop，不再作为属性透传到 &lt;span&gt; 上。</li></ol><p>注意：生产构建中，Vue 不检查 type 和 required。真正的类型检查由 vue-tsc 在构建前完成。</p>',
  tpl: '<Badge title="新" size="sm" />\n<Badge title="热" />',
  js: `// 源代码：defineProps<{ title: string; size?: 'sm' | 'md' }>()
// TODO：把下面的 props 改为编译器生成的运行时声明
const Badge = {
  props: ['title'],
  template: '<span class="badge" :class="size || \\'md\\'">{{ title }}</span>'
}

return { components: { Badge } }`,
  solJs: `// 源代码：defineProps<{ title: string; size?: 'sm' | 'md' }>()
const Badge = {
  props: {
    title: { type: String, required: true },    // title: string
    size: { type: String, required: false }     // size?: 'sm' | 'md'。字面量联合类型生成 String
  },
  template: '<span class="badge" :class="size || \\'md\\'">{{ title }}</span>'
}

return { components: { Badge } }`,
  hints: [
    '编译器在构建时把 defineProps 的类型改写为运行时的 props 选项。第 14 章开头的图“编译前和编译后”讲了它。? 表示可选。',
    '把 props 数组改为对象。对象有两个键：title 和 size。每个键的值是 { type: …, required: … }。字面量联合类型 \'sm\' | \'md\' 生成 String。',
    'props: {\n  title: { type: String, required: true },\n  size: { type: String, required: false }\n}'
  ],
  async check(T) {
    const spans = T.$$('span.badge');
    T.ok(spans.length === 2, '渲染出 2 个 Badge（当前 ' + spans.length + ' 个）');
    if (spans.length !== 2) return;
    T.ok(spans[0].classList.contains('sm'), '第一个 Badge 读到 size，有 sm 类');
    T.ok(!spans[0].hasAttribute('size'), 'size 是 prop，没有作为属性透传到 span 上');
    T.ok(spans[1].classList.contains('md'), '第二个 Badge 没有 size，使用 md 类');
    const root = T.$(':scope > div');
    const inst = root && root._vnode && root._vnode.component;
    const B = inst && inst.appContext.components.Badge;
    const P = B && B.props;
    const isObj = P && !Array.isArray(P) && typeof P === 'object';
    T.ok(!!isObj && !!P.title && P.title.type === String && P.title.required === true, 'title 声明为 { type: String, required: true }');
    T.ok(!!isObj && !!P.size && P.size.type === String && !P.size.required, 'size 声明为 { type: String, required: false }');
  }
}

// ===== 错误解法（基于参考答案做小改动）=====
fbTs.wrong = [
  { js: sub(fbTs.solJs, 'step: { type: Number, required: false, default: 1 }', 'step: Number'), why: '只写了类型，丢了默认值。没有传 step 时，step 是 undefined，n += undefined 得到 NaN。解构里的默认值要变成 default。' },
  { js: sub(fbTs.solJs, 'step: { type: Number, required: false, default: 1 }', 'step: { type: String, required: false, default: 1 }'), why: 'number 应该生成 Number，不是 String。' }
]

tsProps.wrong = [
  { js: sub(tsProps.solJs, "props: {\n    title: { type: String, required: true },    // title: string\n    size: { type: String, required: false }     // size?: 'sm' | 'md'。字面量联合类型生成 String\n  }", "props: ['title', 'size']"), why: '数组写法能让 size 成为 prop，页面看起来正常，但没有 type 和 required。这不是编译器生成的声明。' },
  { js: sub(tsProps.solJs, 'size: { type: String, required: false }', 'size: { type: String, required: true }'), why: 'size 带 ?，是可选的，required 应该是 false。写成 true 后，第二个 Badge 没有传 size 会警告。' },
  { js: sub(tsProps.solJs, 'title: { type: String, required: true }', 'title: { type: String }'), why: 'title 没有 ?，是必填的。漏写 required: true，编译器生成的声明不是这样。' }
]

// ===== 半成品示例（参考答案挖掉关键处，占位说明做什么）=====
fbTs.faded = {
  js: sub(fbTs.solJs, 'step: { type: Number, required: false, default: 1 }',
    'step: { type: null /* ✏️ number 对应的运行时类型 */, required: false, default: undefined /* ✏️ 解构里写的默认值 */ }')
}

tsProps.faded = {
  js: sub(sub(sub(tsProps.solJs, 'title: { type: String, required: true }',
    'title: { type: null /* ✏️ string 对应的运行时类型 */, required: false /* ✏️ title 没有 ?，它必填吗？ */ }'),
    'size: { type: String, required: false }', 'size: { type: null /* ✏️ 联合类型 \'sm\' | \'md\' 的成员都是什么类型？ */, required: false }'),
    '。字面量联合类型生成 String', '')
}
