import type { Exercise } from './types'

export const counterFill: Exercise = {
  title: '补全：一个计数器组合式函数', ch: 7,
  task: '<p>useCounter 已经基本写好。只补全两行 TODO。</p><ol><li>TODO 1：用 ref 创建 count，初始值是 initial。</li><li>TODO 2：在 inc 中让 count 加 1。</li><li>确认“赞”和“收藏”互不影响。</li></ol>',
  tpl: '<button @click="like">赞 {{ likes }}</button>\n<button @click="star">收藏 {{ stars }}</button>',
  js: `function useCounter(initial = 0) {
  const count = null   // TODO 1：用 ref 创建，初始值是 initial
  function inc() {
    // TODO 2：让 count 加 1
  }
  return { count, inc }
}

// 已给出：调用两次，得到两个计数器
const { count: likes, inc: like } = useCounter(0)
const { count: stars, inc: star } = useCounter(10)

return { likes, like, stars, star }`,
  solJs: `function useCounter(initial = 0) {
  const count = ref(initial)   // 每次调用都创建新的 ref
  function inc() {
    count.value++
  }
  return { count, inc }
}

// 已给出：调用两次，得到两个计数器
const { count: likes, inc: like } = useCounter(0)
const { count: stars, inc: star } = useCounter(10)

return { likes, like, stars, star }`,
  faded: {
    js: `function useCounter(initial = 0) {
  const count = /* ✏️ 每次调用都新建一份响应式数据，初始值是 initial */ null
  function inc() {
    /* ✏️ 让 count 加 1（脚本里读写 ref 要用 .value） */
  }
  return { count, inc }
}

// 已给出：调用两次，得到两个计数器
const { count: likes, inc: like } = useCounter(0)
const { count: stars, inc: star } = useCounter(10)

return { likes, like, stars, star }`
  },
  hints: [
    '组合式函数每次被调用，都用 ref 创建新的数据。所以两个计数器互不影响。第 7 章开头的图讲了这一点。',
    'TODO 1：把 null 改为 ref(…)，参数是 initial。TODO 2：在 inc 中修改 count.value。在脚本中，ref 要写 .value。',
    'const count = ref(initial)\nfunction inc() {\n  count.value++\n}'
  ],
  async check(T) {
    const num = t => { const b = T.btn(t); const m = b && b.textContent.match(/(\d+)/); return m ? +m[1] : NaN; };
    T.ok(!!T.btn('赞') && !!T.btn('收藏'), '渲染出“赞”和“收藏”两个按钮');
    if (!T.btn('赞') || !T.btn('收藏')) return;
    T.ok(num('赞') === 0 && num('收藏') === 10, '初始：赞 0，收藏 10（当前：赞 ' + num('赞') + '，收藏 ' + num('收藏') + '）');
    await T.click(T.btn('赞'));
    T.ok(num('赞') === 1, '点击“赞”后显示 1');
    T.ok(num('收藏') === 10, '“收藏”不受影响，仍是 10');
    await T.click(T.btn('收藏'));
    T.ok(num('收藏') === 11 && num('赞') === 1, '点击“收藏”后显示 11，“赞”仍是 1');
  },
  wrong: [
    { js: 'const count = ref(0)   // 放在函数外，所有调用共享\nfunction useCounter(initial = 0) {\n  function inc() {\n    count.value++\n  }\n  return { count, inc }\n}\n\n// 已给出：调用两次，得到两个计数器\nconst { count: likes, inc: like } = useCounter(0)\nconst { count: stars, inc: star } = useCounter(10)\n\nreturn { likes, like, stars, star }', why: '把 ref 写在函数外面。两次调用共用同一个 count：点“赞”会同时改变“收藏”，初始值 initial 也没有用上。' },
    { js: 'function useCounter(initial = 0) {\n  const count = ref(initial)   // 每次调用都创建新的 ref\n  function inc() {\n    count++\n  }\n  return { count, inc }\n}\n\n// 已给出：调用两次，得到两个计数器\nconst { count: likes, inc: like } = useCounter(0)\nconst { count: stars, inc: star } = useCounter(10)\n\nreturn { likes, like, stars, star }', why: '在脚本里对 ref 直接 count++，没有写 .value。count 是 const，重新赋值会报 Assignment to constant variable。即使改成 let，count++ 也只是把 ref 对象换成 NaN，不会改变它的值。', expectFail: /点击“赞”/ }
  ]
}

export const toggle: Exercise = {
  title: '写一个组合式函数', ch: 7,
  task: '<ol><li>在 useToggle 中，用 ref 保存开关状态。</li><li>返回 { on, toggle }。</li><li>确认两个开关互不影响。</li></ol>',
  tpl: '<button @click="toggleWifi">Wi-Fi：{{ wifiOn ? \'开\' : \'关\' }}</button>\n<button @click="toggleBt">蓝牙：{{ btOn ? \'开\' : \'关\' }}</button>',
  js: 'function useToggle(initial = false) {\n  // TODO：用 ref 保存状态，返回 { on, toggle }\n}\n\nconst { on: wifiOn, toggle: toggleWifi } = useToggle(false)\nconst { on: btOn, toggle: toggleBt } = useToggle(true)\n\nreturn { wifiOn, toggleWifi, btOn, toggleBt }',
  solJs: 'function useToggle(initial = false) {\n  const on = ref(initial)\n  const toggle = () => { on.value = !on.value }\n  return { on, toggle }\n}\n\nconst { on: wifiOn, toggle: toggleWifi } = useToggle(false)\nconst { on: btOn, toggle: toggleBt } = useToggle(true)\n\nreturn { wifiOn, toggleWifi, btOn, toggleBt }',
  faded: {
    js: `function useToggle(initial = false) {
  const on = /* ✏️ 用 ref 保存开关状态，初始值是 initial */ null
  const toggle = () => { /* ✏️ 把 on 取反 */ }
  return { on, toggle }
}

const { on: wifiOn, toggle: toggleWifi } = useToggle(false)
const { on: btOn, toggle: toggleBt } = useToggle(true)

return { wifiOn, toggleWifi, btOn, toggleBt }`
  },
  hints: [
'组合式函数是普通函数。每次调用都用 ref 创建新数据，所以两次调用互不影响。第 7 章开头的图讲了这一点。',
'在 useToggle 中写三行：1. 用 ref(initial) 创建 on。2. 写一个函数 toggle，把 on.value 取反。3. 返回 { on, toggle }。',
'function useToggle(initial = false) {\n  const on = ref(initial)\n  const toggle = () => { on.value = !on.value }\n  return { on, toggle }\n}'
],
  async check(T) {
    const w = () => T.btn('Wi-Fi'), bt = () => T.btn('蓝牙');
    T.ok(!!w() && !!bt(), '渲染出两个开关按钮');
    if (!w() || !bt()) return;
    T.ok(/关/.test(w().textContent) && /开/.test(bt().textContent), '初始：Wi-Fi 关，蓝牙 开');
    await T.click(w());
    T.ok(/开/.test(w().textContent), '点击 Wi-Fi 后变为开');
    T.ok(/开/.test(bt().textContent), '蓝牙不受影响，仍然是开');
    await T.click(bt());
    T.ok(/关/.test(bt().textContent), '点击蓝牙后变为关');
  },
  wrong: [
    { js: 'const on = ref(false)   // 放在函数外，所有调用共享\nfunction useToggle(initial = false) {\n  const toggle = () => { on.value = !on.value }\n  return { on, toggle }\n}\n\nconst { on: wifiOn, toggle: toggleWifi } = useToggle(false)\nconst { on: btOn, toggle: toggleBt } = useToggle(true)\n\nreturn { wifiOn, toggleWifi, btOn, toggleBt }', why: '把 ref 放在函数外面。两个开关共享同一个状态，点一个会改变另一个，initial 参数也不起作用。' },
    { js: 'function useToggle(initial = false) {\n  const on = ref(initial)\n  const toggle = () => { on.value = !on.value }\n  return { on: on.value, toggle }\n}\n\nconst { on: wifiOn, toggle: toggleWifi } = useToggle(false)\nconst { on: btOn, toggle: toggleBt } = useToggle(true)\n\nreturn { wifiOn, toggleWifi, btOn, toggleBt }', why: '返回了 on.value，也就是一个普通布尔值，丢掉了 ref。点击后 toggle 改的是 ref，页面上的值不再更新。' }
  ]
}
