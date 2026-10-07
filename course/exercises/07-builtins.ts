import type { Exercise } from './types'
import { nextTick } from 'vue'

export const keepTab: Exercise = {
  title: '用 KeepAlive 保留标签页的状态', ch: 7,
  task: '<ol><li>在 Counter 标签页中点击几次 +1。</li><li>切换到 About，再切换回来。计数归零了。</li><li>修改模板，让 Counter 切换回来后保留计数。</li></ol>',
  tpl: '<button @click="cur = \'Counter\'">计数页</button>\n<button @click="cur = \'About\'">关于页</button>\n\n<component :is="tabs[cur]" />',
  js: 'const Counter = {\n  setup() { return { n: ref(0) } },\n  template: \'<p>计数：{{ n }} <button @click="n++">+1</button></p>\'\n}\nconst About = { template: \'<p>这是关于页</p>\' }\n\nconst tabs = { Counter, About }\nconst cur = ref(\'Counter\')\n\nreturn { tabs, cur }',
  solTpl: '<button @click="cur = \'Counter\'">计数页</button>\n<button @click="cur = \'About\'">关于页</button>\n\n<KeepAlive>\n  <component :is="tabs[cur]" />\n</KeepAlive>',
  hints: [
    '切换动态组件时，旧组件被卸载，所以状态丢失。KeepAlive 缓存组件实例。第 7 章“7.4 动态组件和 KeepAlive”讲了它。',
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
  }
}

export const keepAliveFill: Exercise = {
  title: '补全：用 KeepAlive 保留输入的文字', ch: 7,
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
  hints: [
    '切换动态组件时，Vue 卸载旧组件，它的状态丢失。<KeepAlive> 把旧组件的实例放入缓存，切回时直接使用。第 7 章 7.4 节讲了它。',
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
  }
}
