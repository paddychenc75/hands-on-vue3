import type { Exercise } from './types'
import { sub } from './types'

export const fbSsr: Exercise = {
  title: '补全：水合后再读取浏览器数据', ch: 36,
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
    '第一次渲染必须和服务器的 HTML 一致，否则产生水合不匹配。onMounted 只在浏览器中运行，并且在水合完成后运行。所以浏览器专有的数据在 onMounted 中读取。第 36 章最后的注意事项讲了它。',
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
  title: '修复：水合后 class 错误', ch: 36,
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
    '原因：服务器读不到浏览器的设置，所以用 light 渲染。浏览器第一次渲染时读取了 dark，两边不一致。水合时，Vue 会改正不匹配的文字，但不改正 class（style 也一样）。这道题里不匹配的是 class。第一次渲染要和服务器一致，浏览器专有的数据要等水合完成后再读取。第 36 章“36.3 修复水合不匹配”的表格和最后的注意事项讲了它。',
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

// ===== 半成品示例（参考答案挖掉关键处，占位说明做什么）=====
fbSsr.faded = {
  js: sub(fbSsr.solJs, 'mobile.value = browser.width < 768   // 水合完成后，在浏览器中读取',
    '/* ✏️ 水合完成后，根据 browser.width 设置 mobile（小于 768 是手机） */')
}

ssrMismatch.faded = {
  js: sub(sub(ssrMismatch.solJs, "ref('light')            // 和服务器相同的初始值",
    'ref(browserSettings.theme)   /* ✏️ 第一次渲染要和服务器发来的 HTML 一致：初始值取什么？ */'),
    'theme.value = browserSettings.theme // 水合完成后，在浏览器中读取',
    '/* ✏️ 水合完成后，再读取浏览器里的设置 */')
}

// ===== 迷你 hydrate：把 vnode 和已有的 DOM 对上 =====
// 下面三段（头、中间、尾）拼成脚本；中间是学习者要写的部分。不导出，所以不会被当成练习
const MH_HEAD = `// ===== 已给出：vnode、报告函数和完整挂载 =====
// 字符串是文本节点；{ tag, props, children } 是元素。props 里以 on 开头的是事件
const vn = (tag, props, children) => ({ tag, props: props || {}, children: children || [] })
const mismatches = []                        // 每发现一处不匹配，记一条
const report = msg => mismatches.push(msg)
const clicks = ref(0)

// 客户端想要的页面
const cardVNode = vn('div', { class: 'card' }, [
  vn('h3', {}, ['新标题']),
  vn('button', { onClick: () => clicks.value++ }, ['点击']),
  vn('p', {}, ['补上的段落']),
  vn('small', {}, ['补上的小字'])
])
const listVNode = vn('ul', {}, [vn('li', {}, ['1']), vn('li', {}, ['2'])])

// 服务器发来的 HTML（和客户端有 4 处不同）
const CARD_HTML = '<div class="card"><h3>旧标题</h3><button>点击</button><span>别的标签</span></div>'
const LIST_HTML = '<ul><li>1</li><li>2</li><li>3</li></ul>'

// 从零创建一棵 DOM。没有现成节点可用时（包括不匹配时）走这里
function mount(v) {
  if (typeof v === 'string') return document.createTextNode(v)
  const el = document.createElement(v.tag)
  for (const k in v.props) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v.props[k])
    else el.setAttribute(k, v.props[k])
  }
  for (const c of v.children) el.appendChild(mount(c))
  return el
}

// ===== 你来写：水合 =====
`
const MH_TAIL = `
// ===== 已给出：放入服务器 HTML，水合，统计 =====
const cardHost = ref(null), listHost = ref(null)
const stat = ref('')
onMounted(() => {
  cardHost.value.innerHTML = CARD_HTML
  listHost.value.innerHTML = LIST_HTML
  const before = [...cardHost.value.querySelectorAll('*'), ...listHost.value.querySelectorAll('*')]
  hydrateNode(cardVNode, cardHost.value.firstChild)
  hydrateNode(listVNode, listHost.value.firstChild)
  const reused = before.filter(n => n.isConnected).length
  stat.value = '服务器的 ' + before.length + ' 个元素中，复用 ' + reused + ' 个；不匹配 ' + mismatches.length + ' 处'
})

return { cardHost, listHost, stat, clicks }`
const MH_START = `// 让 vnode 接管已有的 DOM 节点 node。返回下一个要处理的兄弟节点
function hydrateNode(v, node) {
  if (typeof v === 'string') {
    // TODO 1：文字不同 → report('文字')，并把 node.data 改成 v
    return node.nextSibling
  }
  if (node.nodeType !== 1 || node.tagName.toLowerCase() !== v.tag) {
    // TODO 2：标签对不上 → report('标签')，用 mount(v) 替换 node，返回原来的下一个兄弟
  }
  // TODO 3：标签对上了，复用 node。给 on 开头的 props 加事件监听，再水合子节点
  hydrateChildren(v.children, node)
  return node.nextSibling
}

function hydrateChildren(children, el) {
  let node = el.firstChild
  for (const c of children) {
    // TODO 4：node 还在 → node = hydrateNode(c, node)
    //         node 没了（服务器缺子节点）→ report('缺子节点')，mount(c) 追加到 el
  }
  // TODO 5：node 后面还有（服务器多出子节点）→ 每个都 report('多子节点') 并删掉
}
`
const MH_SOL = `// 让 vnode 接管已有的 DOM 节点 node。返回下一个要处理的兄弟节点
function hydrateNode(v, node) {
  if (typeof v === 'string') {
    if (node.data !== v) {
      report('文字')
      node.data = v
    }
    return node.nextSibling
  }
  if (node.nodeType !== 1 || node.tagName.toLowerCase() !== v.tag) {
    report('标签')
    const next = node.nextSibling
    node.parentNode.replaceChild(mount(v), node)
    return next
  }
  for (const k in v.props) {
    if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v.props[k])
  }
  hydrateChildren(v.children, node)
  return node.nextSibling
}

function hydrateChildren(children, el) {
  let node = el.firstChild
  for (const c of children) {
    if (node) {
      node = hydrateNode(c, node)
    } else {
      report('缺子节点')
      el.appendChild(mount(c))
    }
  }
  while (node) {
    const next = node.nextSibling
    report('多子节点')
    el.removeChild(node)
    node = next
  }
}
`

export const miniHydrate: Exercise = {
  title: '实现：迷你 hydrate', ch: 36,
  lazy: true,
  task: '<p>说明：练习台没有服务器。脚本直接给出服务器发来的两段 HTML，和客户端想要的 vnode。你要写一个迷你的水合：让 vnode 接管已有的 DOM，而不是重新创建。</p><p>vnode 的格式：字符串是文本节点，<code>{ tag, props, children }</code> 是元素。<code>props</code> 里以 <code>on</code> 开头的是事件。已给出 <code>mount(v)</code>，它从零创建一棵 DOM。</p><ol><li>文字节点：内容不同时，调用 <code>report(\'文字\')</code>，并把 <code>node.data</code> 改成 vnode 的文字。</li><li>元素节点：标签对不上时，调用 <code>report(\'标签\')</code>，用 <code>mount</code> 创建新节点替换它，返回原来的下一个兄弟。</li><li>元素节点：标签对上时复用它，给 <code>on</code> 开头的 props 加事件监听，再水合子节点。</li><li>子节点：服务器缺子节点时，调用 <code>report(\'缺子节点\')</code> 并 mount 追加；服务器多出子节点时，调用 <code>report(\'多子节点\')</code> 并删掉它们。</li></ol><p>确认：服务器的 8 个元素里复用 6 个，不匹配 4 处，点按钮能计数。</p>',
  tpl: '<div ref="cardHost" class="card-host"></div>\n<div ref="listHost" class="list-host"></div>\n<p class="stat">{{ stat }}</p>\n<p class="clicks">按钮被点击 {{ clicks }} 次</p>',
  js: MH_HEAD + MH_START + MH_TAIL,
  solJs: MH_HEAD + MH_SOL + MH_TAIL,
  hints: [
    '水合是同时走两棵树：一棵是 vnode，一棵是已有的 DOM。每处理完一个节点，返回它的下一个兄弟，调用方才知道接下来该和哪个 DOM 节点配对。第 36 章“36.7 水合怎样把 vnode 和 DOM 对上”讲了真实的 hydrateNode。',
    '先写 hydrateNode：文本节点比较 node.data 和 v；元素先比标签，对不上就 replaceChild(mount(v), node)，注意要在替换前先记下 node.nextSibling；对上了就给 on 开头的 props 用 addEventListener（事件名是去掉 on 的小写），然后调用 hydrateChildren。再写 hydrateChildren：用 node 当游标，循环 children；游标用完了就 mount 追加；循环结束后游标上剩下的都是多余的，逐个删掉。',
    MH_SOL
  ],
  async check(T) {
    await new Promise(r => setTimeout(r, 60));
    const card = T.$('.card-host'), list = T.$('.list-host');
    if (!card || !list) { T.ok(false, '找到两个容器 .card-host 和 .list-host'); return; }
    const stat = (T.$('.stat') || {}).textContent || '';
    const h3 = card.querySelector('h3');
    T.ok(!!h3 && h3.textContent === '新标题', '文字不同时，h3 的文字被改成“新标题”（当前：' + (h3 ? h3.textContent : '没有 h3') + '）');
    const root = card.firstElementChild;
    const tags = Array.from(root ? root.children : []).map(e => e.tagName.toLowerCase()).join(',');
    T.ok(tags === 'h3,button,p,small', '卡片里的子元素依次是 h3,button,p,small（当前：' + tags + '）：标签不同的替换，缺的补上');
    const p = card.querySelector('p');
    T.ok(!!p && p.textContent === '补上的段落', '替换出来的 p 里有“补上的段落”');
    T.ok(list.querySelectorAll('li').length === 2, '服务器多出的 li 被删掉，列表有 2 个 li（当前：' + list.querySelectorAll('li').length + '）');
    T.ok(/复用 6 个/.test(stat), '8 个服务器元素中复用 6 个，不要整棵重建（当前：' + stat + '）');
    T.ok(/不匹配 4 处/.test(stat), '共报告 4 处不匹配：文字、标签、缺子节点、多子节点各一处（当前：' + stat + '）');
    const btn = card.querySelector('button');
    if (btn) {
      await T.click(btn);
      const c = () => ((T.$('.clicks') || {}).textContent || '').replace(/\D+/g, '');
      T.ok(c() === '1', '点一次按钮，计数增加 1（当前：' + c() + '）：水合要给复用的按钮加上事件，且只加一次');
    } else T.ok(false, '卡片里有按钮');
  }
}

miniHydrate.wrong = [
  { js: sub(miniHydrate.solJs, "    if (node.data !== v) {\n      report('文字')\n      node.data = v\n    }\n", ""), why: '文字不同时没有修正。水合只复用节点，不会自己更新内容：不检查 node.data，页面会留着服务器的旧文字。', expectFail: /h3 的文字被改成/ },
  { js: sub(miniHydrate.solJs, "  hydrateChildren(v.children, node)\n  return node.nextSibling\n}", "  node.parentNode.replaceChild(mount(v), node)\n  return null\n}"), why: '匹配的元素也整个重新创建，等于放弃水合。复用 DOM 才是水合的意义：节点、焦点、滚动位置、图片和视频的加载状态都保留。', expectFail: /复用 6 个/ },
  { js: sub(miniHydrate.solJs, "  while (node) {\n    const next = node.nextSibling\n    report('多子节点')\n    el.removeChild(node)\n    node = next\n  }\n", ""), why: '没有处理服务器多出的子节点。页面上留着客户端 vnode 里没有的 DOM，之后 Vue 的更新不认识它们。', expectFail: /多出的 li 被删掉/ },
  { js: sub(miniHydrate.solJs, "  for (const k in v.props) {\n    if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v.props[k])\n  }\n", ""), why: '复用了节点却没有加事件监听。HTML 里没有事件，水合的核心任务就是把事件接上，否则按钮看得见但点不动。', expectFail: /计数增加 1/ }
]

miniHydrate.faded = {
  js: MH_HEAD + sub(sub(sub(MH_SOL,
    "    if (node.data !== v) {\n      report('文字')\n      node.data = v\n    }\n",
    "    /* ✏️ 文字不同时：report('文字')，并把 node.data 改成 v */\n"),
    "    report('标签')\n    const next = node.nextSibling\n    node.parentNode.replaceChild(mount(v), node)\n    return next\n",
    "    report('标签')\n    /* ✏️ 记下原来的下一个兄弟，用 mount(v) 替换 node，返回那个兄弟 */\n"),
    "  while (node) {\n    const next = node.nextSibling\n    report('多子节点')\n    el.removeChild(node)\n    node = next\n  }\n",
    "  /* ✏️ 游标上剩下的都是服务器多出来的：每个都 report('多子节点') 并删掉 */\n") + MH_TAIL
}
