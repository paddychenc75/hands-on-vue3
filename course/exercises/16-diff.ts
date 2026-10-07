import type { Exercise } from './types'
import { sub } from './types'
import { nextTick } from 'vue'

export const fbDiff: Exercise = {
  title: '补全：给列表加上 key', ch: 16,
  task: '<p>点击“在开头插入 X”，列表头部多出一行。现在 &lt;li&gt; 没有 key。Vue 因此按下标比较，只修改每一行的文字。输入框的内容留在原来的位置。</p><ol><li>只补全模板中的 TODO：在 &lt;li&gt; 上加 :key，值是 it.id。</li><li>在 A 行的输入框中输入文字。</li><li>点击“在开头插入 X”。确认文字仍在 A 行。</li></ol>',
  tpl: '<button @click="insertX">在开头插入 X</button>\n<ul>\n  <!-- TODO：在下面的 li 上加 :key，值是 it.id -->\n  <li v-for="it in items">\n    <span>{{ it.name }}</span>\n    <input placeholder="备注">\n  </li>\n</ul>',
  solTpl: '<button @click="insertX">在开头插入 X</button>\n<ul>\n  <li v-for="it in items" :key="it.id">\n    <span>{{ it.name }}</span>\n    <input placeholder="备注">\n  </li>\n</ul>',
  js: `const items = ref([
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' }
])

// 已给出：在列表开头插入一项
let nextId = 4
function insertX() {
  items.value = [{ id: nextId++, name: 'X' }, ...items.value]
}

return { items, insertX }`,
  hints: [
    'Vue 用 key 判断新旧节点是不是同一个节点。key 相同时，Vue 复用旧节点的 DOM。没有 key 时，Vue 按下标比较。第 16 章 16.4 节的对比图（key = index 和 key = id）讲了它。',
    '只改 <li> 这一行。在 v-for 后面加 :key="…"。值是每一项数据自己的、不会改变的字段。',
    '<li v-for="it in items" :key="it.id">'
  ],
  async check(T) {
    const row = name => T.$$('li').find(li => ((li.querySelector('span') || {}).textContent || '').trim() === name);
    const val = name => { const r = row(name); const i = r && r.querySelector('input'); return i ? i.value : null; };
    T.ok(T.$$('li').length === 3, '初始渲染出 3 行（当前 ' + T.$$('li').length + ' 行）');
    const a = row('A'), b = T.btn('插入 X');
    if (!a || !a.querySelector('input') || !b) { T.ok(false, '找到 A 行的输入框和“在开头插入 X”按钮'); return; }
    a.querySelector('input').value = 'aaa';
    await T.click(b);
    const first = ((T.$('li span') || {}).textContent || '').trim();
    T.ok(T.$$('li').length === 4 && first === 'X', '插入后有 4 行，第一行是 X（当前第一行：' + first + '）');
    T.ok(val('A') === 'aaa', 'A 行的输入框仍是“aaa”（当前：“' + (val('A') || '') + '”）');
    T.ok(val('X') === '', '新的 X 行的输入框是空的（当前：“' + (val('X') || '') + '”）');
  }
}

export const diffKey: Exercise = {
  title: '修复：删除一行后，输入框的内容错位', ch: 16,
  task: '<ol><li>在 B 行的输入框中输入一些文字。</li><li>点击 A 行的“删除”。你的文字现在显示在 C 行。</li><li>只修改模板，让文字留在 B 行。</li></ol><p>输入框的值保存在 DOM 中，不在数据中。</p>',
  tpl: '<ul>\n  <li v-for="(it, index) in items" :key="index">\n    <span>{{ it.name }}</span>\n    <input placeholder="备注">\n    <button @click="remove(it.id)">删除</button>\n  </li>\n</ul>',
  js: `const items = ref([
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' }
])

function remove(id) {
  items.value = items.value.filter(it => it.id !== id)
}

return { items, remove }`,
  solTpl: '<ul>\n  <li v-for="it in items" :key="it.id">\n    <span>{{ it.name }}</span>\n    <input placeholder="备注">\n    <button @click="remove(it.id)">删除</button>\n  </li>\n</ul>',
  hints: [
    '原因：Vue 用每一行的标识判断新旧列表中哪一行是同一行。现在的标识是行的位置。删除 A 后，B 的位置变为 0，所以 Vue 把原来 A 的那一行（和它的输入框）给了 B。标识要跟着数据走，而不是跟着位置。第 16 章最后的“注意”讲了它。',
    '只改 <li> 上的 :key。把 index 换为每一项数据自己的、不会改变的字段。',
    '<li v-for="it in items" :key="it.id">'
  ],
  async check(T) {
    const row = name => T.$$('li').find(li => ((li.querySelector('span') || {}).textContent || '').trim() === name);
    T.ok(T.$$('li').length === 3, '渲染出 3 行（当前 ' + T.$$('li').length + ' 行）');
    const b = row('B'), a = row('A');
    if (!a || !b || !b.querySelector('input') || !a.querySelector('button')) { T.ok(false, '找到 A 行的“删除”按钮和 B 行的输入框'); return; }
    b.querySelector('input').value = 'bbb';
    await T.click(a.querySelector('button'));
    T.ok(T.$$('li').length === 2 && !row('A'), '删除 A 后剩下 2 行：B 和 C');
    const bi = row('B') && row('B').querySelector('input'), ci = row('C') && row('C').querySelector('input');
    T.ok(!!bi && bi.value === 'bbb', 'B 行的输入框仍是“bbb”（当前：“' + (bi ? bi.value : '') + '”）');
    T.ok(!!ci && ci.value === '', 'C 行的输入框是空的（当前：“' + (ci ? ci.value : '') + '”）');
  }
}

export const phenoHeight: Exercise = {
  title: '看现象：添加一项后，显示的高度是旧的', ch: 16,
  task: '<p>点击“添加一项”。代码向列表添加一项，然后读取列表的高度并显示它。</p><ol><li>点击几次“添加一项”。显示的高度总是少一行：它是添加之前的高度。</li></ol><p>期望：显示的高度等于列表当前的实际高度。只修改脚本。</p>',
  tpl: '<ul ref="listEl" style="margin: 0">\n  <li v-for="it in items" :key="it" style="height: 24px">{{ it }}</li>\n</ul>\n<button @click="addItem">添加一项</button>\n<p class="h">列表高度：{{ height }}px</p>',
  js: `const items = ref(['第 1 项'])
const listEl = ref(null)     // 模板中 ref="listEl" 的元素
const height = ref(0)

onMounted(() => { height.value = listEl.value.offsetHeight })

function addItem() {
  items.value.push('第 ' + (items.value.length + 1) + ' 项')
  height.value = listEl.value.offsetHeight
}

return { items, listEl, height, addItem }`,
  solJs: `const items = ref(['第 1 项'])
const listEl = ref(null)     // 模板中 ref="listEl" 的元素
const height = ref(0)

onMounted(() => { height.value = listEl.value.offsetHeight })

async function addItem() {
  items.value.push('第 ' + (items.value.length + 1) + ' 项')
  await nextTick()                              // 等待这次 DOM 更新完成
  height.value = listEl.value.offsetHeight
}

return { items, listEl, height, addItem }`,
  hints: [
    '原因：修改数据后，Vue 不立即更新 DOM。它把更新放入队列，当前的同步代码结束后才一起更新。所以紧接着读取，得到的是旧 DOM。要等这次更新完成后再读取。第 13 章 13.2 节讲了它。',
    '只改 addItem。把它改为 async 函数。在 push 和读取高度之间，等待 Vue 完成这次 DOM 更新。',
    'async function addItem() {\n  items.value.push(\'第 \' + (items.value.length + 1) + \' 项\')\n  await nextTick()\n  height.value = listEl.value.offsetHeight\n}'
  ],
  wrong: [
    { js: `const items = ref(['第 1 项'])
const listEl = ref(null)
const height = ref(0)

onMounted(() => { height.value = listEl.value.offsetHeight })

function addItem() {
  items.value.push('第 ' + (items.value.length + 1) + ' 项')
}
watch(items, () => {
  height.value = listEl.value.offsetHeight
}, { deep: true })

return { items, listEl, height, addItem }`, why: '侦听器默认在组件更新之前运行，这时 DOM 还是旧的。' }
  ],
  async check(T) {
    const shown = () => { const m = /(\d+)px/.exec((T.$('p.h') || {}).textContent || ''); return m ? +m[1] : NaN; };
    const real = () => (T.$('ul') || {}).offsetHeight;
    const settle = async () => { await new Promise(r => setTimeout(r, 0)); await nextTick(); };
    await settle();
    T.ok(real() > 0 && shown() === real(), '初始显示的高度等于实际高度（显示 ' + shown() + '，实际 ' + real() + '）');
    const b = T.btn('添加一项');
    if (!b) { T.ok(false, '找到“添加一项”按钮'); return; }
    await T.click(b); await settle();
    T.ok(shown() === real(), '添加一项后，显示的高度等于实际高度（显示 ' + shown() + '，实际 ' + real() + '）');
    await T.click(T.btn('添加一项')); await settle();
    T.ok(T.$$('li').length === 3 && shown() === real(), '再添加一项，仍然相等（显示 ' + shown() + '，实际 ' + real() + '）');
  }
}

export const phenoSort: Exercise = {
  title: '看现象：倒序后，备注留在原来的位置', ch: 16,
  task: '<p>每一行有一个任务名和一个备注输入框。备注只保存在输入框中，不在数据中。</p><ol><li>在第一行“A 写周报”的备注中输入文字。</li><li>点击“倒序”。A 移到了最后一行，但是你的备注留在第一行，现在它旁边是 C。</li></ol><p>期望：备注跟着它的任务移动。只修改模板。</p>',
  tpl: '<button @click="items.reverse()">倒序</button>\n<ul>\n  <li v-for="(it, i) in items" :key="i">\n    <span class="name">{{ it.name }}</span>\n    <input placeholder="备注">\n  </li>\n</ul>',
  solTpl: '<button @click="items.reverse()">倒序</button>\n<ul>\n  <li v-for="(it, i) in items" :key="it.id">\n    <span class="name">{{ it.name }}</span>\n    <input placeholder="备注">\n  </li>\n</ul>',
  js: `const items = ref([
  { id: 1, name: 'A 写周报' },
  { id: 2, name: 'B 修复登录' },
  { id: 3, name: 'C 准备分享' }
])

return { items }`,
  hints: [
    '原因：Vue 用每一行的标识判断新旧列表中哪一行是同一行。现在的标识是行的位置。倒序后，第一个位置仍是 0，所以 Vue 认为它还是原来那一行：只更新文字，保留了旧的输入框。标识要跟着数据走，而不是跟着位置。第 16 章 16.4 节讲了它。',
    '只改 <li> 上的 :key。换成每个任务自己的、不会改变的字段。',
    '<li v-for="(it, i) in items" :key="it.id">'
  ],
  wrong: [
    { tpl: '<button @click="items.reverse()">倒序</button>\n<ul>\n  <li v-for="(it, i) in items" :key="Math.random()">\n    <span class="name">{{ it.name }}</span>\n    <input placeholder="备注">\n  </li>\n</ul>', why: '随机数每次渲染都不同。Vue 认为每一行都是新行，删除并重新创建所有输入框，备注全部丢失。' },
    { tpl: '<button @click="items.reverse()">倒序</button>\n<ul>\n  <li v-for="it in items">\n    <span class="name">{{ it.name }}</span>\n    <input placeholder="备注">\n  </li>\n</ul>', why: '没有标识时，Vue 按位置复用元素，结果和用位置作为标识相同。' }
  ],
  async check(T) {
    const rows = () => T.$$('li');
    const name = li => ((li.querySelector('.name') || {}).textContent || '').trim();
    const find = n => rows().find(li => name(li) === n);
    if (rows().length !== 3 || !find('A 写周报')) { T.ok(false, '渲染出 3 行任务'); return; }
    const a = find('A 写周报').querySelector('input');
    a.value = 'A 的备注';
    a.dispatchEvent(new Event('input'));
    const b = T.btn('倒序');
    if (!b) { T.ok(false, '找到“倒序”按钮'); return; }
    await T.click(b);
    T.ok(name(rows()[2]) === 'A 写周报', '倒序后，A 在最后一行');
    const aIn = find('A 写周报').querySelector('input');
    T.ok(aIn.value === 'A 的备注', '备注跟着 A 移动（A 这一行的备注：“' + aIn.value + '”）');
    T.ok(rows()[0].querySelector('input').value === '', '第一行（C）的备注是空的');
    await T.click(T.btn('倒序'));
    T.ok(name(rows()[0]) === 'A 写周报' && rows()[0].querySelector('input').value === 'A 的备注', '再倒序一次，A 回到第一行，备注仍在');
  }
}

// ===== 错误解法（基于参考答案做小改动）=====
fbDiff.wrong = [
  { tpl: sub(fbDiff.solTpl, ':key="it.id"', ':key="index"').replace('v-for="it in items"', 'v-for="(it, index) in items"'), why: '用下标作 key。插入后，每一行的下标都变了，Vue 仍按位置复用，输入框的文字留在原来的位置。key 要跟着数据走。' },
  { tpl: sub(fbDiff.solTpl, '<li v-for="it in items" :key="it.id">', '<li v-for="it in items">').replace('<span>{{ it.name }}</span>', '<span :key="it.id">{{ it.name }}</span>'), why: 'key 写在了 span 上，不在 v-for 的那个 li 上。li 仍然没有 key。' }
]

diffKey.wrong = [
  { tpl: sub(diffKey.solTpl, ':key="it.id"', ':key="Math.random()"'), why: '每次渲染都生成新的 key。Vue 认为每一行都是新节点，全部卸载再挂载，B 行的输入框也被清空。key 要稳定，并且跟着数据走。' },
  { tpl: sub(diffKey.solTpl, '<li v-for="it in items" :key="it.id">', '<li v-for="(it, index) in items" :key="it.id + \'-\' + index">'), why: 'key 里混入了下标。删除 A 后，B 的下标变了，key 也变了，Vue 认为 B 是新节点，输入框被清空。' }
]
