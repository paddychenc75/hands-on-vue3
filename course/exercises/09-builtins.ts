import type { Exercise } from './types'
import { nextTick } from 'vue'

export const keepTab: Exercise = {
  title: '用 KeepAlive 保留标签页的状态', ch: 9,
  task: '<ol><li>在 Counter 标签页中点击几次 +1。</li><li>切换到 About，再切换回来。计数归零了。</li><li>修改模板，让 Counter 切换回来后保留计数。</li></ol>',
  tpl: '<button @click="cur = \'Counter\'">计数页</button>\n<button @click="cur = \'About\'">关于页</button>\n\n<component :is="tabs[cur]" />',
  js: 'const Counter = {\n  setup() { return { n: ref(0) } },\n  template: \'<p>计数：{{ n }} <button @click="n++">+1</button></p>\'\n}\nconst About = { template: \'<p>这是关于页</p>\' }\n\nconst tabs = { Counter, About }\nconst cur = ref(\'Counter\')\n\nreturn { tabs, cur }',
  solTpl: '<button @click="cur = \'Counter\'">计数页</button>\n<button @click="cur = \'About\'">关于页</button>\n\n<KeepAlive>\n  <component :is="tabs[cur]" />\n</KeepAlive>',
  faded: {
    tpl: `<button @click="cur = 'Counter'">计数页</button>
<button @click="cur = 'About'">关于页</button>

<!-- ✏️ 开始标签：用内置组件包住下面的动态组件，缓存切走的实例 -->
<component :is="tabs[cur]" />
<!-- ✏️ 与上面成对的结束标签 -->`
  },
  hints: [
    '切换动态组件时，旧组件被卸载，所以状态丢失。KeepAlive 缓存组件实例。第 9 章“9.4 动态组件和 KeepAlive”讲了它。',
    '只改模板的最后一行。用 <KeepAlive> … </KeepAlive> 包住 <component :is="…" />。KeepAlive 是内置组件，不需要注册。',
    '<KeepAlive>\n  <component :is="tabs[cur]" />\n</KeepAlive>'
  ],
  async check(T) {
    const p = () => (T.$('p') || {}).textContent || '';
    const plus = () => T.btn('+1');
    T.ok(/计数：\s*0/.test(p()), '初始显示计数 0');
    if (!plus()) { T.ok(false, '找到 +1 按钮'); return; }
    await T.click(plus()); await T.click(plus()); await T.click(plus());
    T.ok(/计数：\s*3/.test(p()), '点击 3 次后显示计数 3');
    await T.click(T.btn('关于页'));
    T.ok(/关于页/.test(p()), '切换后显示关于页');
    await T.click(T.btn('计数页'));
    T.ok(/计数：\s*3/.test(p()), '切换回来后计数仍是 3（当前：' + p().replace(/\+1/, '').trim() + '）');
  },
  wrong: [
    { tpl: '<button @click="cur = \'Counter\'">计数页</button>\n<button @click="cur = \'About\'">关于页</button>\n\n<KeepAlive :max="1">\n  <component :is="tabs[cur]" />\n</KeepAlive>', why: ':max="1" 最多缓存 1 个实例。切到 About 时，Counter 被淘汰，切回来计数归零。' },
    { tpl: '<button @click="cur = \'Counter\'">计数页</button>\n<button @click="cur = \'About\'">关于页</button>\n\n<KeepAlive include="About">\n  <component :is="tabs[cur]" />\n</KeepAlive>', why: 'include 只缓存名字匹配的组件。把它当成“额外缓存 About”，Counter 反而没有被缓存。' }
  ]
}

export const keepAliveFill: Exercise = {
  title: '补全：用 KeepAlive 保留输入的文字', ch: 9,
  task: '<p>这是实验台“有和没有 KeepAlive”的简化版。TabA 有一个输入框。脚本已经写好，只修改模板中的 TODO。</p><ol><li>TODO：用 &lt;KeepAlive&gt; 包住 &lt;component :is&gt; 这一行。</li><li>在 TabA 中输入文字，切换到 TabB，再切换回来。文字仍在。</li></ol>',
  tpl: '<button @click="cur = \'TabA\'">TabA</button>\n<button @click="cur = \'TabB\'">TabB</button>\n\n<!-- TODO：用 <KeepAlive> 和 </KeepAlive> 包住下一行 -->\n<component :is="tabs[cur]" />',
  js: `let created = 0   // TabA 创建实例的次数

const TabA = {
  setup() {
    created++
    return { text: ref('') }
  },
  template: '<p class="a">TabA <input v-model="text" placeholder="输入一些文字"></p>'
}
const TabB = { template: '<p class="b">这是 TabB</p>' }

const tabs = { TabA, TabB }
const cur = ref('TabA')

return { tabs, cur, getCreated: () => created }`,
  solTpl: '<button @click="cur = \'TabA\'">TabA</button>\n<button @click="cur = \'TabB\'">TabB</button>\n\n<KeepAlive>\n  <component :is="tabs[cur]" />\n</KeepAlive>',
  faded: {
    tpl: `<button @click="cur = 'TabA'">TabA</button>
<button @click="cur = 'TabB'">TabB</button>

<!-- ✏️ 开始标签：缓存切走的组件实例 -->
<component :is="tabs[cur]" />
<!-- ✏️ 与上面成对的结束标签 -->`
  },
  hints: [
    '切换动态组件时，Vue 卸载旧组件，它的状态丢失。<KeepAlive> 把旧组件的实例放入缓存，切回时直接使用。第 9 章 9.4 节讲了它。',
    '只改模板。删除 TODO 注释。在 <component :is="tabs[cur]" /> 的上一行写开始标签，下一行写结束标签。KeepAlive 是内置组件，不需要注册。',
    '<KeepAlive>\n  <component :is="tabs[cur]" />\n</KeepAlive>'
  ],
  async check(T) {
    const root = T.$(':scope > div');
    const inst = root && root._vnode && root._vnode.component;
    const created = () => inst && inst.setupState.getCreated ? inst.setupState.getCreated() : NaN;
    const inp = () => T.$('p.a input');
    if (!inp()) { T.ok(false, '初始显示 TabA 和输入框'); return; }
    inp().value = 'hello'; inp().dispatchEvent(new Event('input')); await nextTick();
    await T.click(T.btn('TabB'));
    T.ok(!!T.$('p.b') && !inp(), '点击 TabB 后显示 TabB');
    await T.click(T.btn('TabA'));
    const v = inp() ? inp().value : '';
    T.ok(v === 'hello', '切回 TabA 后，输入框中仍是“hello”（当前：' + (v || '空') + '）');
    T.ok(created() === 1, 'TabA 只创建 1 次实例，切回时使用缓存（当前 ' + created() + ' 次）');
  },
  wrong: [
    { tpl: '<button @click="cur = \'TabA\'">TabA</button>\n<button @click="cur = \'TabB\'">TabB</button>\n\n<KeepAlive include="TabB">\n  <component :is="tabs[cur]" />\n</KeepAlive>', why: 'include 限定了只缓存 TabB。TabA 没有被缓存，切回来输入的文字丢失。' },
    { tpl: '<button @click="cur = \'TabA\'">TabA</button>\n<button @click="cur = \'TabB\'">TabB</button>\n\n<KeepAlive :max="1">\n  <component :is="tabs[cur]" />\n</KeepAlive>', why: ':max="1" 最多缓存 1 个实例。切到 TabB 时 TabA 被淘汰，切回来要重新创建。' }
  ]
}

export const teleportFill: Exercise = {
  title: '补全：用 Teleport 把弹窗渲染到 body', ch: 9,
  task: '<p>下面的弹窗放在一个 <code>overflow: hidden</code> 的卡片里，会被裁剪。只修改模板中的 TODO。</p><ol><li>TODO：用 <code>&lt;Teleport to="body"&gt;</code> 包住弹窗 <code>&lt;div class="modal"&gt;</code>，只包弹窗，不包按钮。</li><li>点击“打开弹窗”。弹窗是 body 的直接子元素，内容仍然显示组件的数据 msg。</li><li>点击“关闭”。弹窗消失。</li></ol>',
  tpl: '<div class="card" style="overflow: hidden; height: 60px">\n  <button @click="open = true">打开弹窗</button>\n  <!-- TODO：用 <Teleport to="body"> 和 </Teleport> 包住弹窗 -->\n  <div v-if="open" class="modal">\n    <p>弹窗内容：{{ msg }}</p>\n    <button @click="open = false">关闭</button>\n  </div>\n</div>',
  js: 'const open = ref(false)\nconst msg = ref(\'任务已保存\')\n\nreturn { open, msg }',
  solTpl: '<div class="card" style="overflow: hidden; height: 60px">\n  <button @click="open = true">打开弹窗</button>\n  <Teleport to="body">\n    <div v-if="open" class="modal">\n      <p>弹窗内容：{{ msg }}</p>\n      <button @click="open = false">关闭</button>\n    </div>\n  </Teleport>\n</div>',
  faded: {
    tpl: `<div class="card" style="overflow: hidden; height: 60px">
  <button @click="open = true">打开弹窗</button>
  <!-- ✏️ 开始标签：把下面的弹窗传送到 body -->
  <div v-if="open" class="modal">
    <p>弹窗内容：{{ msg }}</p>
    <button @click="open = false">关闭</button>
  </div>
  <!-- ✏️ 与上面成对的结束标签 -->
</div>`
  },
  hints: [
    '<Teleport> 把内容渲染到其他 DOM 位置，数据和事件仍然属于原来的组件。第 9 章“9.3 用 Teleport 把弹窗渲染到 body 中”讲了它。',
    '只改模板。在 <div v-if="open" class="modal"> 的上一行写 <Teleport to="body">，在这个 div 的结束标签后写 </Teleport>。按钮留在 Teleport 外面。',
    '<Teleport to="body">\n  <div v-if="open" class="modal">\n    <p>弹窗内容：{{ msg }}</p>\n    <button @click="open = false">关闭</button>\n  </div>\n</Teleport>'
  ],
  async check(T) {
    const modal = () => document.body.querySelector(':scope > .modal') as HTMLElement | null
    T.ok(!modal() && !T.$('.modal'), '初始没有弹窗')
    const open = T.btn('打开弹窗')
    if (!open) { T.ok(false, '卡片里有“打开弹窗”按钮（按钮不要放进 Teleport）'); return }
    await T.click(open)
    T.ok(!!modal(), '打开后，弹窗是 body 的直接子元素')
    T.ok(!T.$('.modal'), '弹窗不在卡片里面')
    T.ok(!!modal() && /任务已保存/.test(modal()!.textContent || ''), '弹窗仍然显示组件的数据 msg')
    const close = modal() && ([...modal()!.querySelectorAll('button')].find(b => /关闭/.test(b.textContent || '')) as HTMLElement | undefined)
    if (!close) { T.ok(false, '弹窗里有“关闭”按钮'); return }
    close.click()
    await nextTick()
    T.ok(!modal(), '点击“关闭”后，弹窗消失')
  },
  wrong: [
    { tpl: '<div class="card" style="overflow: hidden; height: 60px">\n  <Teleport to="body">\n    <button @click="open = true">打开弹窗</button>\n    <div v-if="open" class="modal">\n      <p>弹窗内容：{{ msg }}</p>\n      <button @click="open = false">关闭</button>\n    </div>\n  </Teleport>\n</div>', why: '这样把“打开弹窗”按钮也移到了 body。只把弹窗放进 Teleport，按钮留在原位置。' },
    { tpl: '<div class="card" style="overflow: hidden; height: 60px">\n  <button @click="open = true">打开弹窗</button>\n  <Teleport to="body" disabled>\n    <div v-if="open" class="modal">\n      <p>弹窗内容：{{ msg }}</p>\n      <button @click="open = false">关闭</button>\n    </div>\n  </Teleport>\n</div>', why: 'disabled 让内容留在原位置，不移到 body。需要移动时不要写 disabled。' },
    { tpl: '<div class="card" style="overflow: hidden; height: 60px">\n  <button @click="open = true">打开弹窗</button>\n  <Teleport to="#modal-root">\n    <div v-if="open" class="modal">\n      <p>弹窗内容：{{ msg }}</p>\n      <button @click="open = false">关闭</button>\n    </div>\n  </Teleport>\n</div>', why: '目标 #modal-root 在页面中不存在，Teleport 找不到目标，内容不显示。目标元素必须已经存在。' }
  ]
}

export const transitionKey: Exercise = {
  title: '用 Transition 给计数徽标加动画', ch: 9,
  task: '<p>点击“+1”，徽标里的数字直接变化，没有动画。用 <code>&lt;Transition&gt;</code> 修改模板，让旧数字先淡出，新数字再淡入。样式已经写在页面里，类名前缀是 <code>fade</code>。</p><ol><li>用 <code>name="fade"</code> 设置类名前缀。</li><li>让旧元素先离开，新元素再进入。</li><li>数字变化时，让 Vue 把它当作新元素。</li></ol><p>判题会在点击后观察元素上的类名，检查类名出现的顺序，不依赖动画有多长。</p>',
  tpl: '<button @click="count++">+1</button>\n<div class="stage">\n  <span class="num">{{ count }}</span>\n</div>',
  js: `// 样式：fade-enter-active、fade-leave-active 设置过渡，fade-enter-from、fade-leave-to 设置透明度
if (!document.getElementById('ex-fade-css')) {
  const css = document.createElement('style')
  css.id = 'ex-fade-css'
  css.textContent = '.fade-enter-active, .fade-leave-active { transition: opacity 60ms; } .fade-enter-from, .fade-leave-to { opacity: 0; }'
  document.head.append(css)
}

const count = ref(0)
return { count }`,
  solTpl: '<button @click="count++">+1</button>\n<div class="stage">\n  <Transition name="fade" mode="out-in">\n    <span :key="count" class="num">{{ count }}</span>\n  </Transition>\n</div>',
  faded: {
    tpl: `<button @click="count++">+1</button>
<div class="stage">
  <!-- ✏️ 开始标签：<Transition>，用 name 设置前缀，用 mode 让旧元素先离开 -->
  <span :key="/* ✏️ 用哪个值作 key，数字变化时才会被当作新元素 */ 0" class="num">{{ count }}</span>
  <!-- ✏️ 与上面成对的结束标签 -->
</div>`
  },
  hints: [
    '<Transition> 在元素插入和删除时添加类名。数字变化时，页面上始终是同一个 <span>，Vue 只改它的文字，所以要用 key 告诉 Vue 这是新元素。第 9 章“9.1 用 Transition 添加进入和离开动画”讲了它。',
    '1. 用 <Transition name="fade" mode="out-in"> 包住 <span>。2. 给 <span> 加 :key="count"。',
    '<Transition name="fade" mode="out-in">\n  <span :key="count" class="num">{{ count }}</span>\n</Transition>'
  ],
  async check(T) {
    const stage = T.$('.stage') as HTMLElement | null
    if (!stage) { T.ok(false, '页面上有 .stage 容器'); return }
    const snaps: string[][] = []
    const mo = new MutationObserver(() => {
      snaps.push(Array.from(stage.children).map(c => (c.textContent || '').trim() + '|' + c.className))
    })
    mo.observe(stage, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    const plus = T.btn('+1')
    if (!plus) { mo.disconnect(); T.ok(false, '找到 +1 按钮'); return }
    await T.click(plus)
    const settled = await T.waitFor(() => {
      const kids = Array.from(stage.children)
      return kids.length === 1 && (kids[0].textContent || '').trim() === '1' && !/enter|leave/.test(kids[0].className)
    }, 2000)
    mo.disconnect()
    const has = (txt: string, re: RegExp) => snaps.some(s => s.some(x => x.startsWith(txt + '|') && re.test(x)))
    const first = (txt: string, re: RegExp) => snaps.findIndex(s => s.some(x => x.startsWith(txt + '|') && re.test(x)))
    T.ok(settled, '动画结束后，只剩一个显示 1 的元素，没有残留的 enter、leave 类')
    T.ok(has('0', /fade-leave-active/) && has('0', /fade-leave-to/), '旧数字 0 离开时带有 fade-leave-active 和 fade-leave-to（Transition、name="fade" 和 :key 都要有）')
    T.ok(has('1', /fade-enter-from/) && has('1', /fade-enter-active/), '新数字 1 进入时带有 fade-enter-from 和 fade-enter-active')
    const iFrom = first('1', /fade-enter-from/), iTo = first('1', /fade-enter-to/)
    T.ok(iFrom >= 0 && iTo > iFrom, '新数字先有 fade-enter-from，之后才有 fade-enter-to（类名出现的顺序）')
    const overlap = snaps.some(s => s.some(x => x.startsWith('0|')) && s.some(x => x.startsWith('1|')))
    T.ok(!overlap, '旧数字先离开，新数字才进入：任何时刻页面上不能同时有 0 和 1（需要 mode="out-in"）')
  },
  wrong: [
    { tpl: '<button @click="count++">+1</button>\n<div class="stage">\n  <Transition name="fade" mode="out-in">\n    <span class="num">{{ count }}</span>\n  </Transition>\n</div>', why: '没有 :key。数字变化时页面上还是同一个 <span>，Vue 只改了文字，没有元素进入或离开，所以没有任何过渡类名。', expectFail: /fade-leave/ },
    { tpl: '<button @click="count++">+1</button>\n<div class="stage">\n  <Transition name="fade">\n    <span :key="count" class="num">{{ count }}</span>\n  </Transition>\n</div>', why: '没有 mode="out-in"。默认模式下新旧元素同时存在，页面上会短暂地同时有 0 和 1。', expectFail: /不能同时/ },
    { tpl: '<button @click="count++">+1</button>\n<div class="stage">\n  <Transition mode="out-in">\n    <span :key="count" class="num">{{ count }}</span>\n  </Transition>\n</div>', why: '没有设置 name，类名前缀是 v-（v-enter-from 等），样式里写的是 fade-，所以不匹配。', expectFail: /fade-/ }
  ]
}
