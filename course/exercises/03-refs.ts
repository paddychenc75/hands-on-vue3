import type { Exercise } from './types'

export const refsFill: Exercise = {
  title: '补全：用 toRefs 保持连接', ch: 3,
  task: '<p>这是实验台“解构和浅层响应”的代码。count 是直接解构的副本，已经写好。只补全一行 TODO。</p><ol><li>TODO：用 toRefs 从 state 取出 count，命名为 countRef。</li><li>点击 state.count++ 三次。countRef 跟随 state.count，count 停在 0。</li></ol>',
  tpl: '<p class="s">state.count = {{ state.count }}</p>\n<p class="c">count = {{ count }}</p>\n<p class="r">countRef = {{ countRef }}</p>\n<button @click="state.count++">state.count++</button>',
  js: `const state = reactive({ count: 0 })

// 已给出：直接解构。count 是数字 0 的副本
let { count } = state

// TODO：用 toRefs 取出 count，命名为 countRef
const countRef = 0

return { state, count, countRef }`,
  solJs: `const state = reactive({ count: 0 })

// 已给出：直接解构。count 是数字 0 的副本
let { count } = state

// toRefs 为每个属性创建 ref。这个 ref 读写 state.count
const { count: countRef } = toRefs(state)

return { state, count, countRef }`,
  hints: [
    '解构 reactive 对象，只复制当时的值。toRefs 为每个属性创建一个 ref。这个 ref 读写原对象的属性，所以保持连接。第 3 章 3.2 节和 3.3 节末尾的实验台“解构和浅层响应”讲了它。',
    '只改 TODO 下面的一行。右边写 toRefs(state)。左边从结果中解构 count，并重命名为 countRef。重命名的写法是 { count: countRef }。',
    'const { count: countRef } = toRefs(state)'
  ],
  async check(T) {
    const num = c => { const m = /=\s*(-?\d+)/.exec((T.$('p.' + c) || {}).textContent || ''); return m ? +m[1] : NaN; };
    T.ok(num('s') === 0 && num('r') === 0, '初始 state.count 和 countRef 都是 0');
    const b = T.btn('state.count++');
    if (!b) { T.ok(false, '找到 state.count++ 按钮'); return; }
    for (let i = 0; i < 3; i++) await T.click(T.btn('state.count++'));
    T.ok(num('s') === 3, '点击 3 次后，state.count = 3');
    T.ok(num('r') === 3, '点击 3 次后，countRef = 3，跟随 state.count（当前 ' + num('r') + '）');
    T.ok(num('c') === 0, '直接解构的 count 仍是 0（当前 ' + num('c') + '）');
  }
}

export const fixReactive: Exercise = {
  title: '修复：数字不更新', ch: 3,
  task: '这段代码有一个错误：点击按钮后，数字仍是 0。只修改脚本，修复这个错误。',
  tpl: '<p>count = {{ count }}</p>\n<button @click="add">+1</button>',
  js: 'const state = reactive({ count: 0 })\nconst { count } = state\n\nfunction add() {\n  state.count++\n}\n\nreturn { count, add }',
  solJs: 'const state = reactive({ count: 0 })\nconst { count } = toRefs(state)   // 用 toRefs 保持响应\n\nfunction add() {\n  state.count++\n}\n\nreturn { count, add }',
  hints: [
'原因：解构 reactive 对象只复制当时的值。count 成为一个普通数字，和 state 断开，所以 state.count 改变时它不变。解构时，要得到仍然连着 state 的东西。第 3 章 3.2 节讲了这个问题。',
'只改第 2 行 const { count } = state。用一个函数包住 state，让解构得到 ref，而不是数字。add 函数不用改。',
'把 const { count } = state 改为 const { count } = toRefs(state)。'
],
  async check(T) {
    const p = () => (T.$('p') || {}).textContent || '';
    T.ok(/count\s*=\s*0/.test(p()), '初始显示 count = 0');
    const b = T.btn('+1');
    if (!b) { T.ok(false, '找到 +1 按钮'); return; }
    await T.click(b);
    T.ok(/count\s*=\s*1/.test(p()), '点击一次后显示 count = 1');
    await T.click(T.btn('+1'));
    T.ok(/count\s*=\s*2/.test(p()), '再点一次显示 count = 2');
  }
}
