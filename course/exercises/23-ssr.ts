import type { Exercise } from './types'
import { sub } from './types'

export const fbSsr: Exercise = {
  title: '补全：水合后再读取浏览器数据', ch: 23,
  lazy: true,
  task: '<p>说明：练习台没有服务器。脚本直接给出服务器用 renderToString 生成的 HTML。然后浏览器用真实的 createSSRApp 水合它。</p><p>服务器没有窗口，读不到屏幕宽度。所以服务器按桌面渲染菜单。Nav 的 setup 已经用和服务器相同的初始值创建 mobile。</p><ol><li>只补全 onMounted 中的一行 TODO：browser.width 小于 768 时，把 mobile 设为 true。</li><li>确认水合后，class 和文字都变为手机菜单。</li></ol>',
  tpl: '<p>服务器发来的 HTML，在下面的框中水合：</p>\n<div ref="host" class="host"></div>',
  js: `const { createSSRApp } = Vue   // 从全局 Vue 中取出

// 浏览器的窗口宽度。服务器上没有窗口，读不到它
const browser = { width: 390 }

// 服务器用 renderToString 生成的 HTML（服务器按桌面渲染）
const SERVER_HTML = '<nav class="nav desktop">桌面菜单</nav>'

const Nav = {
  setup() {
    const mobile = ref(false)   // 和服务器相同的初始值，所以水合时没有不匹配
    onMounted(() => {
      // TODO：水合完成后，根据 browser.width 设置 mobile。宽度小于 768 时是手机
    })
    return { mobile }
  },
  template: \`<nav :class="['nav', mobile ? 'mobile' : 'desktop']">{{ mobile ? '手机菜单' : '桌面菜单' }}</nav>\`
}

// ===== 已给出：放入服务器的 HTML，然后水合 =====
const host = ref(null)
let ssrApp = null
onMounted(() => {
  host.value.innerHTML = SERVER_HTML
  ssrApp = createSSRApp(Nav)
  ssrApp.mount(host.value)
})
onUnmounted(() => { if (ssrApp) ssrApp.unmount() })

return { host }`,
  solJs: `const { createSSRApp } = Vue   // 从全局 Vue 中取出

// 浏览器的窗口宽度。服务器上没有窗口，读不到它
const browser = { width: 390 }

// 服务器用 renderToString 生成的 HTML（服务器按桌面渲染）
const SERVER_HTML = '<nav class="nav desktop">桌面菜单</nav>'

const Nav = {
  setup() {
    const mobile = ref(false)   // 和服务器相同的初始值，所以水合时没有不匹配
    onMounted(() => {
      mobile.value = browser.width < 768   // 水合完成后，在浏览器中读取
    })
    return { mobile }
  },
  template: \`<nav :class="['nav', mobile ? 'mobile' : 'desktop']">{{ mobile ? '手机菜单' : '桌面菜单' }}</nav>\`
}

// ===== 已给出：放入服务器的 HTML，然后水合 =====
const host = ref(null)
let ssrApp = null
onMounted(() => {
  host.value.innerHTML = SERVER_HTML
  ssrApp = createSSRApp(Nav)
  ssrApp.mount(host.value)
})
onUnmounted(() => { if (ssrApp) ssrApp.unmount() })

return { host }`,
  hints: [
    '第一次渲染必须和服务器的 HTML 一致，否则产生水合不匹配。onMounted 只在浏览器中运行，并且在水合完成后运行。所以浏览器专有的数据在 onMounted 中读取。第 23 章最后的注意事项讲了它。',
    '只改 TODO 这一行。给 mobile.value 赋值。值是一个比较表达式：browser.width 和 768 比较。',
    'mobile.value = browser.width < 768'
  ],
  async check(T) {
    await new Promise(r => setTimeout(r, 50));
    const nav = T.$('.host .nav');
    T.ok(!!nav, '水合后，框中有 .nav 元素');
    if (!nav) return;
    T.ok(/手机菜单/.test(nav.textContent), '文字显示“手机菜单”（当前：' + nav.textContent.trim() + '）');
    T.ok(nav.classList.contains('mobile') && !nav.classList.contains('desktop'), 'class 是 nav mobile（当前：' + nav.className + '）');
  }
}

export const ssrMismatch: Exercise = {
  title: '修复：水合后 class 错误', ch: 23,
  task: '<p>说明：练习台没有服务器。脚本直接给出服务器用 renderToString 生成的 HTML。然后浏览器用真实的 createSSRApp 水合它。</p><p>用户的主题 dark 保存在浏览器中。服务器读不到它，所以服务器用默认值 light 渲染。现在水合后，文字是 dark，class 仍是 light。原因：水合时，Vue 修改不匹配的文字，但是不修改 class。</p><ol><li>只修改 Card 的 setup。</li><li>让第一次渲染和服务器一致。水合完成后，再读取浏览器的设置。</li><li>确认最后 class 和文字都是 dark。</li></ol>',
  tpl: '<p>服务器发来的 HTML，在下面的框中水合：</p>\n<div ref="host" class="host"></div>',
  js: `const { createSSRApp } = Vue   // 从全局 Vue 中取出

// 用户的设置保存在浏览器中。服务器上读不到它
const browserSettings = { theme: 'dark' }

// 服务器用 renderToString 生成的 HTML（服务器使用默认值 light）
const SERVER_HTML = '<div class="card light">主题：light</div>'

const Card = {
  setup() {
    // TODO：setup 在服务器上也运行。这里不能直接读取浏览器的设置
    const theme = ref(browserSettings.theme)
    return { theme }
  },
  template: '<div :class="[\\'card\\', theme]">主题：{{ theme }}</div>'
}

// ===== 已给出：放入服务器的 HTML，然后水合 =====
const host = ref(null)
let ssrApp = null
onMounted(() => {
  host.value.innerHTML = SERVER_HTML
  ssrApp = createSSRApp(Card)
  ssrApp.mount(host.value)
})
onUnmounted(() => { if (ssrApp) ssrApp.unmount() })

return { host }`,
  solJs: `const { createSSRApp } = Vue   // 从全局 Vue 中取出

// 用户的设置保存在浏览器中。服务器上读不到它
const browserSettings = { theme: 'dark' }

// 服务器用 renderToString 生成的 HTML（服务器使用默认值 light）
const SERVER_HTML = '<div class="card light">主题：light</div>'

const Card = {
  setup() {
    const theme = ref('light')            // 和服务器相同的初始值
    onMounted(() => {
      theme.value = browserSettings.theme // 水合完成后，在浏览器中读取
    })
    return { theme }
  },
  template: '<div :class="[\\'card\\', theme]">主题：{{ theme }}</div>'
}

// ===== 已给出：放入服务器的 HTML，然后水合 =====
const host = ref(null)
let ssrApp = null
onMounted(() => {
  host.value.innerHTML = SERVER_HTML
  ssrApp = createSSRApp(Card)
  ssrApp.mount(host.value)
})
onUnmounted(() => { if (ssrApp) ssrApp.unmount() })

return { host }`,
  hints: [
    '原因：服务器读不到浏览器的设置，所以用 light 渲染。浏览器第一次渲染时读取了 dark，两边不一致。水合时，Vue 只修正文字，不修正 class。第一次渲染要和服务器一致，浏览器专有的数据要等水合完成后再读取。第 23 章“23.3 修复水合不匹配”的表格和最后的注意事项讲了它。',
    '在 Card 的 setup 中：1. 用服务器的默认值 \'light\' 创建 theme。2. 添加 onMounted(() => { … })，在其中把 theme.value 设为 browserSettings.theme。',
    'const theme = ref(\'light\')\nonMounted(() => {\n  theme.value = browserSettings.theme\n})\nreturn { theme }'
  ],
  async check(T) {
    await new Promise(r => setTimeout(r, 50));
    const card = T.$('.host .card');
    T.ok(!!card, '水合后，框中有 .card 元素');
    if (!card) return;
    T.ok(/主题：\s*dark/.test(card.textContent), '文字显示“主题：dark”（当前：' + card.textContent.trim() + '）');
    T.ok(card.classList.contains('dark') && !card.classList.contains('light'), 'class 是 card dark（当前：' + card.className + '）');
  }
}

// 旧脚本在对象外面补充的字段（原样保留，需要的话可以整理进上面的对象）
ssrMismatch.lazy = true;

// ===== 错误解法（基于参考答案做小改动）=====
fbSsr.wrong = [
  { js: sub(fbSsr.solJs, "const mobile = ref(false)   // 和服务器相同的初始值，所以水合时没有不匹配\n    onMounted(() => {\n      mobile.value = browser.width < 768   // 水合完成后，在浏览器中读取\n    })", "const mobile = ref(browser.width < 768)   // 直接在 setup 中读取"), why: '在 setup 里直接读浏览器数据。第一次渲染是手机菜单，和服务器发来的桌面菜单不一致。水合时 Vue 不修正 class，页面的 class 仍是 desktop。要在 onMounted 中读取。' },
  { js: sub(fbSsr.solJs, "onMounted(() => {\n      mobile.value = browser.width < 768", "Vue.onBeforeMount(() => {\n      mobile.value = browser.width < 768"), why: 'onBeforeMount 在水合之前运行。第一次渲染已经是手机菜单，和服务器不一致，class 不会被修正。要用 onMounted。' }
]

ssrMismatch.wrong = [
  { js: sub(ssrMismatch.solJs, "const theme = ref('light')            // 和服务器相同的初始值\n    onMounted(() => {\n      theme.value = browserSettings.theme // 水合完成后，在浏览器中读取\n    })", "const theme = ref(typeof window !== 'undefined' ? browserSettings.theme : 'light')"), why: '用 typeof window 判断环境。这只让服务器不报错，但浏览器的第一次渲染读到 dark，和服务器的 light 不一致，水合后 class 仍是 light。' },
  { js: sub(ssrMismatch.solJs, "onMounted(() => {\n      theme.value = browserSettings.theme", "Vue.onBeforeMount(() => {\n      theme.value = browserSettings.theme"), why: 'onBeforeMount 在水合之前运行。第一次渲染已经是 dark，和服务器的 light 不一致，class 不会被修正。要在 onMounted 中读取。' }
]
