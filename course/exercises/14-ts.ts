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
    '编译器把类型改写为 type 和 required。? 表示可选。3.5 中，解构时写的默认值变为 default。14.2 节的实验台“解构默认值 (3.5)”页讲了它。',
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

// ===== 错误解法（基于参考答案做小改动）=====
fbTs.wrong = [
  { js: sub(fbTs.solJs, 'step: { type: Number, required: false, default: 1 }', 'step: Number'), why: '只写了类型，丢了默认值。没有传 step 时，step 是 undefined，n += undefined 得到 NaN。解构里的默认值要变成 default。' },
  { js: sub(fbTs.solJs, 'step: { type: Number, required: false, default: 1 }', 'step: { type: String, required: false, default: 1 }'), why: 'number 应该生成 Number，不是 String。' }
]

// ===== 半成品示例（参考答案挖掉关键处，占位说明做什么）=====
fbTs.faded = {
  js: sub(fbTs.solJs, 'step: { type: Number, required: false, default: 1 }',
    'step: { type: null /* ✏️ number 对应的运行时类型 */, required: false, default: undefined /* ✏️ 解构里写的默认值 */ }')
}

// ===== 注入：useTheme 封装（对应 TypeScript 里 inject 返回 T | undefined 的处理）=====
export const injectStrict: Exercise = {
  title: '写一个 useTheme：没有 provide 时抛出清楚的错误', ch: 14,
  task: '<p>说明：练习台不能运行 TypeScript。本题练习类型检查要求你做的那一步：<code>inject</code> 的结果可能是 <code>undefined</code>，封装函数要在返回前排除它。排除之后，TypeScript 才会把 <code>useTheme()</code> 的返回类型推导成不含 <code>undefined</code> 的 <code>Ref</code>。</p><ol><li>补全 <code>useTheme()</code>：用 <code>ThemeKey</code> 注入主题。</li><li>注入不到时，抛出 Error，消息要说明缺了什么。</li><li>注入到时，返回那个 ref 本身（不要返回 <code>.value</code>），这样点“切换主题”后 Panel 会更新。</li></ol><p>页面里有两个 Panel：一个在 ThemeProvider 里面，一个在外面。Panel 已经写好，会显示 <code>useTheme()</code> 的结果或错误消息。</p>',
  tpl: '<ThemeProvider><Panel where="里面" /></ThemeProvider>\n<Panel where="外面" />',
  js: `const ThemeKey = Symbol('theme')   // TypeScript 里写成 InjectionKey<Ref<'light' | 'dark'>>

// TODO：现在没有 provide 时返回 undefined，调用方会在用到它时才崩溃
function useTheme() {
  return inject(ThemeKey)
}

const ThemeProvider = {
  setup() {
    const theme = ref('dark')
    provide(ThemeKey, theme)
    return { theme }
  },
  template: '<div><button class="tg" @click="theme = theme === \\'dark\\' ? \\'light\\' : \\'dark\\'">切换主题</button><slot /></div>'
}

const Panel = {
  props: ['where'],
  setup() {
    try { return { theme: useTheme(), err: '' } }
    catch (e) { return { theme: null, err: e.message } }
  },
  template: '<p class="panel">{{ where }}：主题 {{ theme }}｜错误 {{ err }}</p>'
}

return { components: { ThemeProvider, Panel } }`,
  solJs: `const ThemeKey = Symbol('theme')   // TypeScript 里写成 InjectionKey<Ref<'light' | 'dark'>>

function useTheme() {
  const theme = inject(ThemeKey)
  if (!theme) throw new Error('useTheme() 必须在 ThemeProvider 里面使用：没有 provide ThemeKey')
  return theme   // 返回 ref 本身，不是 theme.value
}

const ThemeProvider = {
  setup() {
    const theme = ref('dark')
    provide(ThemeKey, theme)
    return { theme }
  },
  template: '<div><button class="tg" @click="theme = theme === \\'dark\\' ? \\'light\\' : \\'dark\\'">切换主题</button><slot /></div>'
}

const Panel = {
  props: ['where'],
  setup() {
    try { return { theme: useTheme(), err: '' } }
    catch (e) { return { theme: null, err: e.message } }
  },
  template: '<p class="panel">{{ where }}：主题 {{ theme }}｜错误 {{ err }}</p>'
}

return { components: { ThemeProvider, Panel } }`,
  hints: [
    '先看外面那个 Panel：没有 provide，inject 返回 undefined。TypeScript 会要求你处理这个 undefined。处理方式有三种：给默认值、抛错、用 ! 断言。本题要抛错。',
    '在 useTheme 里先把 inject 的结果放进变量，然后判断它是不是假值。是就 throw new Error(消息)。不是就返回这个变量。',
    'const theme = inject(ThemeKey)\nif (!theme) throw new Error(\'useTheme() 必须在 ThemeProvider 里面使用\')\nreturn theme'
  ],
  faded: {
    js: `const ThemeKey = Symbol('theme')   // TypeScript 里写成 InjectionKey<Ref<'light' | 'dark'>>

function useTheme() {
  const theme = inject(ThemeKey)
  if (/* ✏️ 注入不到时 */ false) throw new Error(/* ✏️ 消息：说明缺了什么 */ '')
  return theme   // ✏️ 返回 ref 本身，不是 .value
}

const ThemeProvider = {
  setup() {
    const theme = ref('dark')
    provide(ThemeKey, theme)
    return { theme }
  },
  template: '<div><button class="tg" @click="theme = theme === \\'dark\\' ? \\'light\\' : \\'dark\\'">切换主题</button><slot /></div>'
}

const Panel = {
  props: ['where'],
  setup() {
    try { return { theme: useTheme(), err: '' } }
    catch (e) { return { theme: null, err: e.message } }
  },
  template: '<p class="panel">{{ where }}：主题 {{ theme }}｜错误 {{ err }}</p>'
}

return { components: { ThemeProvider, Panel } }`
  },
  async check(T) {
    const read = w => { const p = T.$$('p.panel').find(e => e.textContent.startsWith(w)); const m = p && p.textContent.match(/主题\s*(.*?)｜错误\s*(.*)$/); return m ? { theme: m[1].trim(), err: m[2].trim() } : null; };
    const inn = read('里面'), out = read('外面');
    T.ok(!!inn && !!out, '渲染出“里面”和“外面”两个 Panel');
    if (!inn || !out) return;
    T.ok(inn.theme === 'dark' && inn.err === '', '里面的 Panel 拿到 dark，没有错误（当前：主题 ' + inn.theme + '，错误 ' + inn.err + '）');
    T.ok(out.theme === '' && out.err.length > 0, '外面的 Panel 没有拿到主题，并且收到一条错误消息（当前：主题 “' + out.theme + '”，错误 “' + out.err + '”）');
    await T.click(T.$('button.tg'));
    const after = read('里面');
    T.ok(!!after && after.theme === 'light', '点“切换主题”后，里面的 Panel 变成 light（返回的必须是 ref 本身；当前：' + (after && after.theme) + '）');
  }
}

// ===== 组合式函数：MaybeRefOrGetter 与 toValue =====
export const maybeRefGetter: Exercise = {
  title: '写一个 useUpper：参数可以是值、ref 或 getter', ch: 14,
  task: '<p>说明：练习台不能运行 TypeScript。本题练习类型 <code>MaybeRefOrGetter&lt;string&gt;</code> 在运行时的意思：参数可能是普通值、ref 或 getter 函数，三种都要能用，并且后两种变化时结果要跟着变。</p><ol><li>补全 <code>useUpper(source)</code>：返回一个 computed，值是 source 的大写形式。</li><li>确认三个调用都显示大写，点“改名”后，ref 和 getter 的两个跟着变，普通值的不变。</li></ol>',
  tpl: '<p class="a">{{ a }}</p>\n<p class="b">{{ b }}</p>\n<p class="c">{{ c }}</p>\n<button @click="rename">改名</button>',
  js: `// TypeScript：function useUpper(source: MaybeRefOrGetter<string>): ComputedRef<string>
function useUpper(source) {
  // TODO：返回 computed，值是 source 的大写
  return source
}

const name = ref('ann')
const first = ref('x')
const a = useUpper('plain')                  // 普通值
const b = useUpper(name)                     // ref
const c = useUpper(() => first.value + '!')  // getter

function rename() { name.value = 'bob'; first.value = 'y' }

return { a, b, c, rename }`,
  solJs: `// TypeScript：function useUpper(source: MaybeRefOrGetter<string>): ComputedRef<string>
function useUpper(source) {
  return computed(() => toValue(source).toUpperCase())
}

const name = ref('ann')
const first = ref('x')
const a = useUpper('plain')                  // 普通值
const b = useUpper(name)                     // ref
const c = useUpper(() => first.value + '!')  // getter

function rename() { name.value = 'bob'; first.value = 'y' }

return { a, b, c, rename }`,
  hints: [
    '三种参数的读取方式不同：普通值直接用，ref 要 .value，getter 要调用。有一个函数一次处理三种。',
    '用 toValue(source) 读取参数，放在 computed 的 getter 里面。这样 ref 和 getter 里的依赖才会被跟踪。',
    'return computed(() => toValue(source).toUpperCase())'
  ],
  faded: {
    js: `// TypeScript：function useUpper(source: MaybeRefOrGetter<string>): ComputedRef<string>
function useUpper(source) {
  return /* ✏️ 包成 computed，让依赖被跟踪 */ (() => /* ✏️ 一次读取普通值、ref、getter 的函数 */ (source).toUpperCase())
}

const name = ref('ann')
const first = ref('x')
const a = useUpper('plain')                  // 普通值
const b = useUpper(name)                     // ref
const c = useUpper(() => first.value + '!')  // getter

function rename() { name.value = 'bob'; first.value = 'y' }

return { a, b, c, rename }`
  },
  async check(T) {
    const g = c => { const e = T.$('p.' + c); return e ? e.textContent.trim() : '无'; };
    T.ok(g('a') === 'PLAIN', '普通值：显示 PLAIN（当前：' + g('a') + '）');
    T.ok(g('b') === 'ANN', 'ref：显示 ANN（当前：' + g('b') + '）');
    T.ok(g('c') === 'X!', 'getter：显示 X!（当前：' + g('c') + '）');
    if (!T.btn('改名')) return;
    await T.click(T.btn('改名'));
    T.ok(g('b') === 'BOB', '改名后 ref 的结果变成 BOB（当前：' + g('b') + '）');
    T.ok(g('c') === 'Y!', '改名后 getter 的结果变成 Y!（当前：' + g('c') + '）');
    T.ok(g('a') === 'PLAIN', '普通值的结果不变（当前：' + g('a') + '）');
  }
}

injectStrict.wrong = [
    { js: sub(injectStrict.solJs ?? '', "  if (!theme) throw new Error('useTheme() 必须在 ThemeProvider 里面使用：没有 provide ThemeKey')\n", ''), why: '没有排除 undefined。外面的 Panel 拿不到主题，也没有收到任何错误消息：问题被藏起来了。类型检查要求你处理 undefined，处理方式是让它在出错的地方就说清楚。', expectFail: /外面的 Panel/ },
    { js: sub(injectStrict.solJs ?? '', "  return theme   // 返回 ref 本身，不是 theme.value", "  return theme.value"), why: '返回 theme.value 得到的是一个普通字符串，丢掉了响应式。点“切换主题”后 Panel 不会更新。', expectFail: /切换主题/ },
    { js: sub(injectStrict.solJs ?? '', "const theme = inject(ThemeKey)\n  if (!theme) throw new Error('useTheme() 必须在 ThemeProvider 里面使用：没有 provide ThemeKey')", "const theme = inject(ThemeKey, ref('light'))"), why: '给了默认值：外面的 Panel 悄悄显示 light，不再报错。默认值是另一种合法的处理，但本题要求没有 provide 时抛错，让使用错误立刻暴露。', expectFail: /外面的 Panel/ }
  ]

maybeRefGetter.wrong = [
    { js: sub(maybeRefGetter.solJs ?? '', 'computed(() => toValue(source).toUpperCase())', 'computed(() => source.value.toUpperCase())'), why: '只认 ref。普通值和 getter 没有 .value，读到 undefined 后调用 toUpperCase 报错。MaybeRefOrGetter 要求三种都能用。', expectFail: /代码没有运行/ },
    { js: sub(maybeRefGetter.solJs ?? '', 'computed(() => toValue(source).toUpperCase())', 'computed(() => unref(source).toUpperCase())'), why: 'unref 只展开 ref，不会调用 getter：getter 参数得到的是函数本身，函数没有 toUpperCase。unref 对应 MaybeRef，不是 MaybeRefOrGetter。', expectFail: /代码没有运行/ },
    { js: sub(maybeRefGetter.solJs ?? '', 'computed(() => toValue(source).toUpperCase())', 'ref(toValue(source).toUpperCase())'), why: '在函数里只读取了一次参数，得到的是快照。改名之后结果不会更新。读取参数必须放在 computed（或 watch）里面，依赖才会被跟踪。', expectFail: /改名后/ }
  ]
