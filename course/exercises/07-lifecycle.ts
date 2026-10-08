import type { Exercise } from './types'
import { nextTick } from 'vue'

export const clockFill: Exercise = {
  title: '补全：卸载时清理定时器和监听', ch: 7,
  task: '<p>Clock 在 onMounted 中启动定时器，并在 window 上添加 resize 监听。这是第 7 章 7.2 节的代码。onUnmounted 已经写好，只补全其中两行 TODO。</p><ol><li>TODO 1：清除定时器 timer。</li><li>TODO 2：删除 window 上的 resize 监听。</li><li>点击“隐藏 Clock”。ticks 和 resize 次数都不再增加。</li></ol>',
  tpl: '<p class="ticks">ticks = {{ ticks }}</p>\n<p class="resizes">resize 次数 = {{ resizes }}</p>\n<button @click="show = !show">{{ show ? \'隐藏\' : \'显示\' }} Clock</button>\n<Clock v-if="show" />',
  js: `const ticks = ref(0)
const resizes = ref(0)
const show = ref(true)

const Clock = {
  setup() {
    let timer = null
    function onResize() { resizes.value++ }
    onMounted(() => {
      timer = setInterval(() => { ticks.value++ }, 30)
      window.addEventListener('resize', onResize)
    })
    onUnmounted(() => {
      // TODO 1：清除定时器 timer
      // TODO 2：删除 window 上的 resize 监听
    })
    return {}
  },
  template: '<div>Clock 正在运行</div>'
}

return { ticks, resizes, show, components: { Clock } }`,
  solJs: `const ticks = ref(0)
const resizes = ref(0)
const show = ref(true)

const Clock = {
  setup() {
    let timer = null
    function onResize() { resizes.value++ }
    onMounted(() => {
      timer = setInterval(() => { ticks.value++ }, 30)
      window.addEventListener('resize', onResize)
    })
    onUnmounted(() => {
      clearInterval(timer)                              // 和 setInterval 成对
      window.removeEventListener('resize', onResize)   // 和 addEventListener 成对，使用同一个函数
    })
    return {}
  },
  template: '<div>Clock 正在运行</div>'
}

return { ticks, resizes, show, components: { Clock } }`,
  faded: {
    js: `const ticks = ref(0)
const resizes = ref(0)
const show = ref(true)

const Clock = {
  setup() {
    let timer = null
    function onResize() { resizes.value++ }
    onMounted(() => {
      timer = setInterval(() => { ticks.value++ }, 30)
      window.addEventListener('resize', onResize)
    })
    onUnmounted(() => {
      /* ✏️ 清除定时器：用 setInterval 返回的 id */
      window.removeEventListener('resize', /* ✏️ 传入哪个函数，才能删掉当初添加的那个监听 */)
    })
    return {}
  },
  template: '<div>Clock 正在运行</div>'
}

return { ticks, resizes, show, components: { Clock } }`
  },
  hints: [
    '组件卸载时，Vue 不知道你创建过定时器和监听。所以在 onUnmounted 中清除它们。注册和清理要成对写。第 7 章 7.2 节的代码讲了它。',
    '两行都写在 onUnmounted 中。TODO 1：调用 clearInterval，参数是 timer。TODO 2：调用 window.removeEventListener，参数和 addEventListener 的相同。',
    'clearInterval(timer)\nwindow.removeEventListener(\'resize\', onResize)'
  ],
  async check(T) {
    const wait = n => new Promise(r => setTimeout(r, n));
    const num = c => { const m = /=\s*(\d+)/.exec((T.$('p.' + c) || {}).textContent || ''); return m ? +m[1] : NaN; };
    await wait(150);
    T.ok(num('ticks') > 0, 'Clock 显示时，ticks 在增加（当前 ' + num('ticks') + '）');
    window.dispatchEvent(new Event('resize')); await nextTick();
    T.ok(num('resizes') === 1, 'Clock 显示时，resize 被记录（当前 ' + num('resizes') + ' 次）');
    const b = T.btn('隐藏');
    if (!b) { T.ok(false, '找到“隐藏 Clock”按钮'); return; }
    await T.click(b);
    T.ok(!/Clock 正在运行/.test(T.text()), 'Clock 已卸载');
    await wait(40);
    const v1 = num('ticks');
    await wait(200);
    const v2 = num('ticks');
    T.ok(v1 === v2, 'TODO 1：卸载后，ticks 不再增加（' + v1 + ' → ' + v2 + '）');
    window.dispatchEvent(new Event('resize')); await nextTick();
    T.ok(num('resizes') === 1, 'TODO 2：卸载后，resize 不再被记录（当前 ' + num('resizes') + ' 次）');
  },
  wrong: [
    { js: 'const ticks = ref(0)\nconst resizes = ref(0)\nconst show = ref(true)\n\nconst Clock = {\n  setup() {\n    let timer = null\n    function onResize() { resizes.value++ }\n    onMounted(() => {\n      timer = setInterval(() => { ticks.value++ }, 30)\n      window.addEventListener(\'resize\', onResize)\n    })\n    onUnmounted(() => {\n      clearInterval(timer)                              // 和 setInterval 成对\n    })\n    return {}\n  },\n  template: \'<div>Clock 正在运行</div>\'\n}\n\nreturn { ticks, resizes, show, components: { Clock } }', why: '只清除了定时器，没有删除 window 上的 resize 监听。卸载后，resize 仍然会增加次数，监听器泄漏。' },
    { js: 'const ticks = ref(0)\nconst resizes = ref(0)\nconst show = ref(true)\n\nconst Clock = {\n  setup() {\n    let timer = null\n    function onResize() { resizes.value++ }\n    onMounted(() => {\n      timer = setInterval(() => { ticks.value++ }, 30)\n      window.addEventListener(\'resize\', onResize)\n    })\n    onUnmounted(() => {\n      clearInterval(timer)                              // 和 setInterval 成对\n      window.removeEventListener(\'resize\', () => { resizes.value++ })   // 和 addEventListener 成对，使用同一个函数\n    })\n    return {}\n  },\n  template: \'<div>Clock 正在运行</div>\'\n}\n\nreturn { ticks, resizes, show, components: { Clock } }', why: '删除监听时传入了一个新写的函数。addEventListener 和 removeEventListener 必须用同一个函数引用，新函数删不掉原来的监听。' }
  ]
}

export const timerLeak: Exercise = {
  title: '修复：隐藏后数字还在增加', ch: 7,
  task: '<ol><li>点击“隐藏 Ticker”。Ticker 已卸载，ticks 仍在增加。</li><li>只修改脚本，在 Ticker 卸载时清除定时器。</li></ol>',
  tpl: '<p>ticks = {{ ticks }}</p>\n<button @click="show = !show">{{ show ? \'隐藏\' : \'显示\' }} Ticker</button>\n<Ticker v-if="show" />',
  js: 'const ticks = ref(0)\nconst show = ref(true)\n\nconst Ticker = {\n  setup() {\n    onMounted(() => {\n      setInterval(() => { ticks.value++ }, 30)\n    })\n    // TODO：组件卸载时清除定时器\n    return {}\n  },\n  template: \'<div>Ticker 正在运行</div>\'\n}\n\nreturn { ticks, show, components: { Ticker } }',
  solJs: 'const ticks = ref(0)\nconst show = ref(true)\n\nconst Ticker = {\n  setup() {\n    let timer = null\n    onMounted(() => {\n      timer = setInterval(() => { ticks.value++ }, 30)\n    })\n    onUnmounted(() => {\n      clearInterval(timer)        // 卸载时清除\n    })\n    return {}\n  },\n  template: \'<div>Ticker 正在运行</div>\'\n}\n\nreturn { ticks, show, components: { Ticker } }',
  faded: {
    js: `const ticks = ref(0)
const show = ref(true)

const Ticker = {
  setup() {
    let timer = null
    onMounted(() => {
      /* ✏️ 保存定时器的 id */ setInterval(() => { ticks.value++ }, 30)
    })
    /* ✏️ 组件卸载时，清除定时器 */
    return {}
  },
  template: '<div>Ticker 正在运行</div>'
}

return { ticks, show, components: { Ticker } }`
  },
  hints: [
    '原因：Ticker 隐藏时，组件被卸载。但是它启动的定时器不属于 Vue，不会自动停止，所以 ticks 继续增加。组件离开页面时，要自己停止它启动的定时器。第 7 章的钩子表格列出了每个钩子的用途。',
    '在 Ticker 的 setup 中：1. 声明 let timer。2. 把 setInterval 的返回值赋给 timer。3. 添加 onUnmounted(() => …)，在其中清除 timer。',
    'let timer = null\nonMounted(() => {\n  timer = setInterval(() => { ticks.value++ }, 30)\n})\nonUnmounted(() => {\n  clearInterval(timer)\n})'
  ],
  async check(T) {
    const wait = n => new Promise(r => setTimeout(r, n));
    const val = () => { const m = /ticks\s*=\s*(\d+)/.exec((T.$('p') || {}).textContent || ''); return m ? +m[1] : NaN; };
    await wait(150);
    const v0 = val();
    T.ok(v0 > 0, 'Ticker 显示时，ticks 在增加（当前 ' + v0 + '）');
    const b = T.btn('隐藏');
    if (!b) { T.ok(false, '找到“隐藏 Ticker”按钮'); return; }
    await T.click(b);
    await wait(40);
    const v1 = val();
    await wait(200);
    const v2 = val();
    T.ok(!/Ticker 正在运行/.test(T.text()), 'Ticker 已卸载');
    T.ok(v1 === v2, 'Ticker 卸载后，ticks 不再增加（' + v1 + ' → ' + v2 + '）');
  },
  wrong: [
    { js: 'const ticks = ref(0)\nconst show = ref(true)\n\nconst Ticker = {\n  setup() {\n    let timer = null\n    onMounted(() => {\n      setInterval(() => { ticks.value++ }, 30)\n    })\n    onUnmounted(() => {\n      clearInterval(timer)        // 卸载时清除\n    })\n    return {}\n  },\n  template: \'<div>Ticker 正在运行</div>\'\n}\n\nreturn { ticks, show, components: { Ticker } }', why: '没有保存 setInterval 返回的 id。clearInterval(timer) 清除的是 null，定时器仍在运行。' },
    { js: 'const ticks = ref(0)\nconst show = ref(true)\n\nconst Ticker = {\n  setup() {\n    let timer = null\n    onMounted(() => {\n      timer = setInterval(() => { ticks.value++ }, 30)\n    })\n    onUnmounted(clearInterval(timer))\n    return {}\n  },\n  template: \'<div>Ticker 正在运行</div>\'\n}\n\nreturn { ticks, show, components: { Ticker } }', why: '把 clearInterval(timer) 直接写成了 onUnmounted 的参数，它在 setup 里立即执行，那时 timer 还是 null。而且 onUnmounted 收到的是 clearInterval 的返回值 undefined，不是函数，setup 直接报错。要传入一个函数 () => clearInterval(timer)。', expectFail: /Ticker 卸载后/ }
  ]
}

export const tickReadFill: Exercise = {
  title: '补全：等待 DOM 更新再读取', ch: 7,
  task: '<p>这是第 7.4 节的例子。run 同步执行 count++ 三次，然后读取 DOM 两次。只补全一行 TODO。</p><ol><li>TODO：在第二次读取之前，等待 DOM 更新。</li><li>点击按钮。“修改后立即读取”显示 0，“等待之后读取”显示 3。</li></ol>',
  tpl: '<button @click="run">count++ 三次</button>\n<p>DOM 中的 count：<b ref="out">{{ count }}</b></p>\n<p class="before">修改后立即读取：{{ before }}</p>\n<p class="after">等待之后读取：{{ after }}</p>',
  js: `const count = ref(0)
const out = ref(null)      // 模板中 ref="out" 的元素
const before = ref('')
const after = ref('')

async function run() {
  count.value++
  count.value++
  count.value++
  before.value = out.value.textContent   // 这时 DOM 还没有更新
  // TODO：等待 DOM 更新
  after.value = out.value.textContent
}

return { count, out, before, after, run }`,
  solJs: `const count = ref(0)
const out = ref(null)      // 模板中 ref="out" 的元素
const before = ref('')
const after = ref('')

async function run() {
  count.value++
  count.value++
  count.value++
  before.value = out.value.textContent   // 这时 DOM 还没有更新
  await nextTick()                       // 等待更新队列运行完成
  after.value = out.value.textContent
}

return { count, out, before, after, run }`,
  faded: {
    js: `const count = ref(0)
const out = ref(null)      // 模板中 ref="out" 的元素
const before = ref('')
const after = ref('')

async function run() {
  count.value++
  count.value++
  count.value++
  before.value = out.value.textContent   // 这时 DOM 还没有更新
  /* ✏️ 等待这次 DOM 更新完成 */
  after.value = out.value.textContent
}

return { count, out, before, after, run }`
  },
  hints: [
    '修改数据时，Vue 只把更新放入队列。同步代码结束后，DOM 才更新。先修改数据，再 await nextTick()，就能等到这次更新完成。第 7 章 7.4 节讲了它。',
    '只改 TODO 这一行。run 已经是 async 函数。在这一行等待 nextTick() 返回的 Promise。',
    'await nextTick()'
  ],
  async check(T) {
    const val = c => { const m = /：\s*(\d*)/.exec((T.$('p.' + c) || {}).textContent || ''); return m ? m[1] : ''; };
    const settle = async () => { await new Promise(r => setTimeout(r, 0)); await nextTick(); };
    const b = T.btn('count++');
    if (!b) { T.ok(false, '找到“count++ 三次”按钮'); return; }
    await T.click(b); await settle();
    T.ok(val('before') === '0', '第一次点击：修改后立即读取，DOM 仍是 0（当前 ' + (val('before') || '空') + '）');
    T.ok(val('after') === '3', '第一次点击：等待之后读取，DOM 是 3（当前 ' + (val('after') || '空') + '）');
    await T.click(T.btn('count++')); await settle();
    T.ok(val('before') === '3' && val('after') === '6', '第二次点击：先读到 3，等待之后读到 6（当前 ' + val('before') + ' 和 ' + val('after') + '）');
  },
  wrong: [
    { js: 'const count = ref(0)\nconst out = ref(null)      // 模板中 ref="out" 的元素\nconst before = ref(\'\')\nconst after = ref(\'\')\n\nasync function run() {\n  count.value++\n  count.value++\n  count.value++\n  before.value = out.value.textContent   // 这时 DOM 还没有更新\n  nextTick()                        // 等待更新队列运行完成\n  after.value = out.value.textContent\n}\n\nreturn { count, out, before, after, run }', why: 'nextTick() 返回 Promise，但没有 await。下一行立即读取，DOM 还没更新，读到的仍是 0。' }
  ]
}
