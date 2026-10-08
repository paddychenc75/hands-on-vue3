import type { Exercise } from './types'

export const pluginOptions: Exercise = {
  title: '补全：i18n 插件读取选项', ch: 11,
  task: '<p>这是第 11.2 节的 i18n 插件。脚本用它创建两个小应用：第一个传入 <code>{ locale: \'en\', messages }</code>，第二个只传入 <code>{ messages }</code>。插件已经写好 t 和 app.provide。只补全两行 TODO。</p><ol><li>TODO 1：用 options.locale 创建响应式的 locale。没有传 locale 时，用 \'zh\'。</li><li>TODO 2：把 t 添加为全局属性 $t。Greeting 的模板写 <code>{{ $t(\'hello\') }}</code>。</li><li>确认第一个应用显示 Hello，第二个显示“你好”。点击第一个应用的“切换语言”，它显示“你好”。</li></ol><p>运行器的参数中没有 createApp。脚本第一行从全局 Vue 中取出它。</p>',
  tpl: '<div class="app-en" ref="hostEn"></div>\n<div class="app-zh" ref="hostZh"></div>',
  js: `const { createApp } = Vue   // 从全局 Vue 中取出

const messages = { zh: { hello: '你好' }, en: { hello: 'Hello' } }

const I18n = {
  install(app, options = {}) {
    // TODO 1：用 options.locale 创建响应式的 locale。没有传 locale 时，用 'zh'
    const locale = ref('zh')
    const t = key => (options.messages[locale.value] || {})[key] || key
    // TODO 2：把 t 添加为全局属性 $t
    app.provide('i18n', { locale, t })
  }
}

// ===== 已给出：用插件创建两个小应用（不用修改） =====
const Greeting = {
  setup() {
    const { locale } = inject('i18n')
    const flip = () => { locale.value = locale.value === 'zh' ? 'en' : 'zh' }
    return { flip }
  },
  template: '<p class="msg">{{ $t(\\'hello\\') }}</p><button @click="flip">切换语言</button>'
}
const hostEn = ref(null)
const hostZh = ref(null)
const apps = []
onMounted(() => {
  apps.push(createApp(Greeting).use(I18n, { locale: 'en', messages }))   // 传入 locale
  apps.push(createApp(Greeting).use(I18n, { messages }))                 // 没有传 locale
  // 小应用出错时，把错误显示在它的位置上
  apps.forEach((a, i) => { a.config.errorHandler = e => { [hostEn, hostZh][i].value.textContent = '出错：' + e.message } })
  apps[0].mount(hostEn.value)
  apps[1].mount(hostZh.value)
})
onUnmounted(() => apps.forEach(a => a.unmount()))

return { hostEn, hostZh }`,
  solJs: `const { createApp } = Vue   // 从全局 Vue 中取出

const messages = { zh: { hello: '你好' }, en: { hello: 'Hello' } }

const I18n = {
  install(app, options = {}) {
    const locale = ref(options.locale || 'zh')        // 读取选项，并给出默认值
    const t = key => (options.messages[locale.value] || {})[key] || key
    app.config.globalProperties.$t = t                // 模板中可以写 $t('hello')
    app.provide('i18n', { locale, t })
  }
}

// ===== 已给出：用插件创建两个小应用（不用修改） =====
const Greeting = {
  setup() {
    const { locale } = inject('i18n')
    const flip = () => { locale.value = locale.value === 'zh' ? 'en' : 'zh' }
    return { flip }
  },
  template: '<p class="msg">{{ $t(\\'hello\\') }}</p><button @click="flip">切换语言</button>'
}
const hostEn = ref(null)
const hostZh = ref(null)
const apps = []
onMounted(() => {
  apps.push(createApp(Greeting).use(I18n, { locale: 'en', messages }))   // 传入 locale
  apps.push(createApp(Greeting).use(I18n, { messages }))                 // 没有传 locale
  // 小应用出错时，把错误显示在它的位置上
  apps.forEach((a, i) => { a.config.errorHandler = e => { [hostEn, hostZh][i].value.textContent = '出错：' + e.message } })
  apps[0].mount(hostEn.value)
  apps[1].mount(hostZh.value)
})
onUnmounted(() => apps.forEach(a => a.unmount()))

return { hostEn, hostZh }`,
  faded: {
    js: `const { createApp } = Vue   // 从全局 Vue 中取出

const messages = { zh: { hello: '你好' }, en: { hello: 'Hello' } }

const I18n = {
  install(app, options = {}) {
    const locale = ref(/* ✏️ 读取 options.locale；没有传时用默认值 'zh' */)
    const t = key => (options.messages[locale.value] || {})[key] || key
    /* ✏️ 把 t 添加为模板里可用的全局属性 $t */
    app.provide('i18n', { locale, t })
  }
}

// ===== 已给出：用插件创建两个小应用（不用修改） =====
const Greeting = {
  setup() {
    const { locale } = inject('i18n')
    const flip = () => { locale.value = locale.value === 'zh' ? 'en' : 'zh' }
    return { flip }
  },
  template: '<p class="msg">{{ $t(\\'hello\\') }}</p><button @click="flip">切换语言</button>'
}
const hostEn = ref(null)
const hostZh = ref(null)
const apps = []
onMounted(() => {
  apps.push(createApp(Greeting).use(I18n, { locale: 'en', messages }))   // 传入 locale
  apps.push(createApp(Greeting).use(I18n, { messages }))                 // 没有传 locale
  // 小应用出错时，把错误显示在它的位置上
  apps.forEach((a, i) => { a.config.errorHandler = e => { [hostEn, hostZh][i].value.textContent = '出错：' + e.message } })
  apps[0].mount(hostEn.value)
  apps[1].mount(hostZh.value)
})
onUnmounted(() => apps.forEach(a => a.unmount()))

return { hostEn, hostZh }`
  },
  hints: [
    'app.use(插件, 选项) 调用 install(app, 选项)。插件从第二个参数读取选项，没有传的选项用默认值。模板中的 $t 来自 app.config.globalProperties。第 11 章“11.2 编写插件”的 i18n 场景讲了它。',
    'TODO 1：把 ref(\'zh\') 中的参数改为 options.locale，没有时用 \'zh\'。TODO 2：给 app.config.globalProperties 添加属性 $t，值是 t。',
    "const locale = ref(options.locale || 'zh')\napp.config.globalProperties.$t = t"
  ],
  wrong: [
    { js: `const { createApp } = Vue

const messages = { zh: { hello: '你好' }, en: { hello: 'Hello' } }

const I18n = {
  install(app, options = {}) {
    const locale = { value: options.locale || 'zh' }
    const t = key => (options.messages[locale.value] || {})[key] || key
    app.config.globalProperties.$t = t
    app.provide('i18n', { locale, t })
  }
}

const Greeting = {
  setup() {
    const { locale } = inject('i18n')
    const flip = () => { locale.value = locale.value === 'zh' ? 'en' : 'zh' }
    return { flip }
  },
  template: '<p class="msg">{{ $t(\\'hello\\') }}</p><button @click="flip">切换语言</button>'
}
const hostEn = ref(null)
const hostZh = ref(null)
const apps = []
onMounted(() => {
  apps.push(createApp(Greeting).use(I18n, { locale: 'en', messages }))
  apps.push(createApp(Greeting).use(I18n, { messages }))
  // 小应用出错时，把错误显示在它的位置上
  apps.forEach((a, i) => { a.config.errorHandler = e => { [hostEn, hostZh][i].value.textContent = '出错：' + e.message } })
  apps[0].mount(hostEn.value)
  apps[1].mount(hostZh.value)
})
onUnmounted(() => apps.forEach(a => a.unmount()))

return { hostEn, hostZh }`, why: 'locale 是普通对象，不是响应式数据。切换语言后，使用 $t 的模板不重新渲染。' },
    { js: `const { createApp } = Vue

const messages = { zh: { hello: '你好' }, en: { hello: 'Hello' } }

const I18n = {
  install(app, options = {}) {
    const locale = ref(options.locale || 'zh')
    const t = key => (options.messages[locale.value] || {})[key] || key
    app.$t = t
    app.provide('i18n', { locale, t })
  }
}

const Greeting = {
  setup() {
    const { locale } = inject('i18n')
    const flip = () => { locale.value = locale.value === 'zh' ? 'en' : 'zh' }
    return { flip }
  },
  template: '<p class="msg">{{ $t(\\'hello\\') }}</p><button @click="flip">切换语言</button>'
}
const hostEn = ref(null)
const hostZh = ref(null)
const apps = []
onMounted(() => {
  apps.push(createApp(Greeting).use(I18n, { locale: 'en', messages }))
  apps.push(createApp(Greeting).use(I18n, { messages }))
  // 小应用出错时，把错误显示在它的位置上
  apps.forEach((a, i) => { a.config.errorHandler = e => { [hostEn, hostZh][i].value.textContent = '出错：' + e.message } })
  apps[0].mount(hostEn.value)
  apps[1].mount(hostZh.value)
})
onUnmounted(() => apps.forEach(a => a.unmount()))

return { hostEn, hostZh }`, why: '加在 app 对象上的属性，模板读不到。全局属性要加在 app.config.globalProperties 上。' }
  ],
  async check(T) {
    const wait = n => new Promise(r => setTimeout(r, n));
    const msg = c => ((T.$('.' + c + ' .msg') || {}).textContent || '').trim();
    await wait(0);
    T.ok(msg('app-en') === 'Hello', '传入 locale: \'en\' 的应用显示 Hello（当前：' + (msg('app-en') || '空') + '）');
    T.ok(msg('app-zh') === '你好', '没有传 locale 的应用使用默认值，显示“你好”（当前：' + (msg('app-zh') || '空') + '）');
    const b = T.$('.app-en button');
    if (!b) { T.ok(false, '找到第一个应用的“切换语言”按钮'); return; }
    await T.click(b);
    await wait(0);
    T.ok(msg('app-en') === '你好', '点击“切换语言”后，第一个应用显示“你好”（当前：' + (msg('app-en') || '空') + '）');
    T.ok(msg('app-zh') === '你好', '第二个应用不受影响。每个应用有自己的 locale');
  }
}

export const errorFill: Exercise = {
  title: '补全：错误边界的两行代码', ch: 11,
  task: '<p>SafeBox 是一个错误边界。它已经保存了 error，模板也已写好。只补全 onErrorCaptured 中的两行 TODO。</p><ol><li>TODO 1：把 err 保存到 error 中。</li><li>TODO 2：返回 false。原因：否则错误继续向上传递到应用，页面报错。</li></ol>',
  tpl: '<button @click="broken = true">让天气组件出错</button>\n<button @click="count++">count = {{ count }}</button>\n<SafeBox>\n  <Weather :broken="broken" />\n</SafeBox>',
  js: `const { onErrorCaptured } = Vue   // 从全局 Vue 中取出

const Weather = {
  props: ['broken'],
  setup(props) {
    function text() {
      if (props.broken) throw new Error('接口数据错误')
      return '晴，25 度'
    }
    return { text }
  },
  template: '<p>天气：{{ text() }}</p>'
}

// 错误边界：子组件出错时，只在这里显示错误
const SafeBox = {
  setup() {
    const error = ref(null)
    onErrorCaptured(err => {
      // TODO 1：把 err 保存到 error 中
      // TODO 2：返回 false，让错误不再向上传递
    })
    return { error }
  },
  template: '<p v-if="error">出错了：{{ error.message }}</p><slot v-else></slot>'
}

const broken = ref(false)
const count = ref(0)
return { broken, count, components: { Weather, SafeBox } }`,
  solJs: `const { onErrorCaptured } = Vue   // 从全局 Vue 中取出

const Weather = {
  props: ['broken'],
  setup(props) {
    function text() {
      if (props.broken) throw new Error('接口数据错误')
      return '晴，25 度'
    }
    return { text }
  },
  template: '<p>天气：{{ text() }}</p>'
}

// 错误边界：子组件出错时，只在这里显示错误
const SafeBox = {
  setup() {
    const error = ref(null)
    onErrorCaptured(err => {
      error.value = err   // 模板显示错误信息
      return false        // 停止传递
    })
    return { error }
  },
  template: '<p v-if="error">出错了：{{ error.message }}</p><slot v-else></slot>'
}

const broken = ref(false)
const count = ref(0)
return { broken, count, components: { Weather, SafeBox } }`,
  faded: {
    js: `const { onErrorCaptured } = Vue   // 从全局 Vue 中取出

const Weather = {
  props: ['broken'],
  setup(props) {
    function text() {
      if (props.broken) throw new Error('接口数据错误')
      return '晴，25 度'
    }
    return { text }
  },
  template: '<p>天气：{{ text() }}</p>'
}

// 错误边界：子组件出错时，只在这里显示错误
const SafeBox = {
  setup() {
    const error = ref(null)
    onErrorCaptured(err => {
      /* ✏️ 把 err 保存到 error 中 */
      /* ✏️ 返回什么值，错误才不再向上传递 */
    })
    return { error }
  },
  template: '<p v-if="error">出错了：{{ error.message }}</p><slot v-else></slot>'
}

const broken = ref(false)
const count = ref(0)
return { broken, count, components: { Weather, SafeBox } }`
  },
  hints: [
    'onErrorCaptured 捕获子组件的错误。返回 false 时，错误不再向上传递。第 11 章“11.5 用 onErrorCaptured 写错误边界”讲了它。',
    '在 onErrorCaptured 的回调中写两行：第一行给 error.value 赋值，第二行 return 一个布尔值。',
    'onErrorCaptured(err => {\n  error.value = err\n  return false\n})'
  ],
  async check(T) {
    T.ok(/天气：\s*晴/.test(T.text()), '初始显示“天气：晴，25 度”');
    const b = T.btn('出错');
    if (!b) { T.ok(false, '找到“让天气组件出错”按钮'); return; }
    // 监听应用级 errorHandler：onErrorCaptured 没有返回 false 时，错误会继续传到这里
    const cfg = ((T.$(':scope > div') as any)?._vnode?.component?.appContext?.config) || {};
    const oldHandler = cfg.errorHandler;
    let propagated = 0;
    cfg.errorHandler = () => { propagated++; };
    try { await T.click(b); } finally { cfg.errorHandler = oldHandler; }
    T.ok(/出错了：\s*接口数据错误/.test(T.text()), '出错后，SafeBox 显示“出错了：接口数据错误”');
    T.ok(propagated === 0, '错误被 SafeBox 拦住，没有继续向上传递（onErrorCaptured 要返回 false；传到应用的次数：' + propagated + '）');
    const c = T.btn('count');
    if (!c) { T.ok(false, '找到 count 按钮'); return; }
    await T.click(c);
    T.ok(/count\s*=\s*1/.test(T.text()), '页面的其他部分仍然正常：count = 1');
  },
  wrong: [
    { js: 'const { onErrorCaptured } = Vue   // 从全局 Vue 中取出\n\nconst Weather = {\n  props: [\'broken\'],\n  setup(props) {\n    function text() {\n      if (props.broken) throw new Error(\'接口数据错误\')\n      return \'晴，25 度\'\n    }\n    return { text }\n  },\n  template: \'<p>天气：{{ text() }}</p>\'\n}\n\n// 错误边界：子组件出错时，只在这里显示错误\nconst SafeBox = {\n  setup() {\n    const error = ref(null)\n    onErrorCaptured(err => {\n      error.value = err   // 模板显示错误信息\n    })\n    return { error }\n  },\n  template: \'<p v-if="error">出错了：{{ error.message }}</p><slot v-else></slot>\'\n}\n\nconst broken = ref(false)\nconst count = ref(0)\nreturn { broken, count, components: { Weather, SafeBox } }', why: '没有返回 false。错误被 SafeBox 显示后，仍继续向上传递到应用的 errorHandler，页面外层会报错。' },
    { js: 'const { onErrorCaptured } = Vue   // 从全局 Vue 中取出\n\nconst Weather = {\n  props: [\'broken\'],\n  setup(props) {\n    function text() {\n      if (props.broken) throw new Error(\'接口数据错误\')\n      return \'晴，25 度\'\n    }\n    return { text }\n  },\n  template: \'<p>天气：{{ text() }}</p>\'\n}\n\n// 错误边界：子组件出错时，只在这里显示错误\nconst SafeBox = {\n  setup() {\n    const error = ref(null)\n    onErrorCaptured(err => {\n      error.value = err.message\n      return false        // 停止传递\n    })\n    return { error }\n  },\n  template: \'<p v-if="error">出错了：{{ error.message }}</p><slot v-else></slot>\'\n}\n\nconst broken = ref(false)\nconst count = ref(0)\nreturn { broken, count, components: { Weather, SafeBox } }', why: '保存的是错误信息字符串，但模板读取的是 error.message。字符串没有 message 属性，显示“出错了：”后面是空的。' }
  ]
}

export const errorBoundary: Exercise = {
  title: '写一个错误边界组件', ch: 11,
  task: '<ol><li>在 ErrorBoundary 中，用 ref 保存错误。</li><li>用 onErrorCaptured 记录错误，并返回 false。</li><li>有错误时，显示“出错了：错误信息”。没有错误时，显示插槽。</li></ol><p>运行器的参数中没有 onErrorCaptured。脚本第一行从全局 Vue 中取出它。</p>',
  tpl: '<button @click="boom = true">引爆</button>\n<button @click="count++">count = {{ count }}</button>\n<ErrorBoundary>\n  <Bomb :boom="boom" />\n</ErrorBoundary>',
  js: 'const { onErrorCaptured } = Vue   // 从全局 Vue 中取出\n\nconst Bomb = {\n  props: [\'boom\'],\n  setup(props) {\n    function status() {\n      if (props.boom) throw new Error(\'炸弹爆炸了\')\n      return \'正常\'\n    }\n    return { status }\n  },\n  template: \'<p>炸弹：{{ status() }}</p>\'\n}\n\n// TODO：\n// 1. 用 ref 保存错误\n// 2. 用 onErrorCaptured 记录错误，并返回 false\n// 3. 有错误时显示“出错了：错误信息”，否则显示插槽\nconst ErrorBoundary = {\n  setup() {\n    return {}\n  },\n  template: \'<slot></slot>\'\n}\n\nconst boom = ref(false)\nconst count = ref(0)\nreturn { boom, count, components: { Bomb, ErrorBoundary } }',
  solJs: 'const { onErrorCaptured } = Vue   // 从全局 Vue 中取出\n\nconst Bomb = {\n  props: [\'boom\'],\n  setup(props) {\n    function status() {\n      if (props.boom) throw new Error(\'炸弹爆炸了\')\n      return \'正常\'\n    }\n    return { status }\n  },\n  template: \'<p>炸弹：{{ status() }}</p>\'\n}\n\nconst ErrorBoundary = {\n  setup() {\n    const error = ref(null)\n    onErrorCaptured(err => {\n      error.value = err\n      return false            // 停止传递\n    })\n    return { error }\n  },\n  template: \'<p v-if="error">出错了：{{ error.message }}</p><slot v-else></slot>\'\n}\n\nconst boom = ref(false)\nconst count = ref(0)\nreturn { boom, count, components: { Bomb, ErrorBoundary } }',
  faded: {
    js: `const { onErrorCaptured } = Vue   // 从全局 Vue 中取出

const Bomb = {
  props: ['boom'],
  setup(props) {
    function status() {
      if (props.boom) throw new Error('炸弹爆炸了')
      return '正常'
    }
    return { status }
  },
  template: '<p>炸弹：{{ status() }}</p>'
}

const ErrorBoundary = {
  setup() {
    const error = /* ✏️ 用 ref 保存错误，一开始没有错误 */ null
    onErrorCaptured(err => {
      /* ✏️ 记录错误 */
      /* ✏️ 阻止错误继续向上传递 */
    })
    return { error }
  },
  template: '<p v-if="/* ✏️ 有错误时才显示这一行 */ false">出错了：{{ error.message }}</p><slot v-else></slot>'
}

const boom = ref(false)
const count = ref(0)
return { boom, count, components: { Bomb, ErrorBoundary } }`
  },
  hints: [
    'onErrorCaptured 捕获子组件的错误。返回 false 时，错误不再向上传递。第 11 章“11.5 用 onErrorCaptured 写错误边界”讲了它。',
    '在 ErrorBoundary 的 setup 中：1. 创建 error = ref(null)。2. 调用 onErrorCaptured(err => { … })，保存 err，返回 false。3. 返回 { error }。模板：v-if="error" 时显示错误，<slot v-else>。',
    'setup() {\n  const error = ref(null)\n  onErrorCaptured(err => {\n    error.value = err\n    return false\n  })\n  return { error }\n},\ntemplate: \'<p v-if="error">出错了：{{ error.message }}</p><slot v-else></slot>\''
  ],
  async check(T) {
    T.ok(/炸弹：\s*正常/.test(T.text()), '初始显示“炸弹：正常”');
    T.ok(!/出错了/.test(T.text()), '初始不显示“出错了”');
    const b = T.btn('引爆');
    if (!b) { T.ok(false, '找到“引爆”按钮'); return; }
    // 监听应用级 errorHandler：onErrorCaptured 没有返回 false 时，错误会继续传到这里
    const cfg = ((T.$(':scope > div') as any)?._vnode?.component?.appContext?.config) || {};
    const oldHandler = cfg.errorHandler;
    let propagated = 0;
    cfg.errorHandler = () => { propagated++; };
    try { await T.click(b); } finally { cfg.errorHandler = oldHandler; }
    T.ok(/出错了：\s*炸弹爆炸了/.test(T.text()), '引爆后显示“出错了：炸弹爆炸了”');
    T.ok(propagated === 0, '错误被 ErrorBoundary 拦住，没有继续向上传递（onErrorCaptured 要返回 false；传到应用的次数：' + propagated + '）');
    const c = T.btn('count');
    if (!c) { T.ok(false, '找到 count 按钮'); return; }
    await T.click(c);
    T.ok(/count\s*=\s*1/.test(T.text()), '页面的其他部分仍然正常：count = 1');
  },
  wrong: [
    { js: 'const { onErrorCaptured } = Vue   // 从全局 Vue 中取出\n\nconst Bomb = {\n  props: [\'boom\'],\n  setup(props) {\n    function status() {\n      if (props.boom) throw new Error(\'炸弹爆炸了\')\n      return \'正常\'\n    }\n    return { status }\n  },\n  template: \'<p>炸弹：{{ status() }}</p>\'\n}\n\nconst ErrorBoundary = {\n  setup() {\n    const error = ref(null)\n    onErrorCaptured(err => {\n      error.value = err\n    })\n    return { error }\n  },\n  template: \'<p v-if="error">出错了：{{ error.message }}</p><slot v-else></slot>\'\n}\n\nconst boom = ref(false)\nconst count = ref(0)\nreturn { boom, count, components: { Bomb, ErrorBoundary } }', why: '没有返回 false。错误显示在边界里，但仍会继续向上传递到应用级的 errorHandler。' },
    { js: 'const { onErrorCaptured } = Vue   // 从全局 Vue 中取出\n\nconst Bomb = {\n  props: [\'boom\'],\n  setup(props) {\n    function status() {\n      if (props.boom) throw new Error(\'炸弹爆炸了\')\n      return \'正常\'\n    }\n    return { status }\n  },\n  template: \'<p>炸弹：{{ status() }}</p>\'\n}\n\nconst ErrorBoundary = {\n  setup() {\n    const error = ref(null)\n    onErrorCaptured(err => {\n      error.value = err\n      return false            // 停止传递\n    })\n    return { error }\n  },\n  template: \'<p v-if="error">出错了：{{ error }}</p><slot v-else></slot>\'\n}\n\nconst boom = ref(false)\nconst count = ref(0)\nreturn { boom, count, components: { Bomb, ErrorBoundary } }', why: '直接显示 error 对象，会输出 “Error: 炸弹爆炸了”。要显示 error.message，才是“出错了：炸弹爆炸了”。' }
  ]
}
