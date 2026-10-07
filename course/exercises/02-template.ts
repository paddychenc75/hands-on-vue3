import type { Exercise } from './types'

export const list: Exercise = {
  title: '列表、条件与事件',
  ch: 2,
  task: '<ol><li>用 v-for 把 fruits 显示为 &lt;li&gt;。写 :key。</li><li>列表为空时，显示“没有水果了”。</li><li>点击“清空”时，清空列表。</li></ol>',
  tpl: '<ul>\n  <li>在这里用 v-for 渲染 fruits</li>\n</ul>\n<button>清空</button>',
  js: 'const fruits = ref([\n  { id: 1, name: \'苹果\' },\n  { id: 2, name: \'香蕉\' },\n  { id: 3, name: \'橙子\' }\n])\n\nreturn { fruits }',
  solTpl: '<ul v-if="fruits.length">\n  <li v-for="f in fruits" :key="f.id">{{ f.name }}</li>\n</ul>\n<p v-else>没有水果了</p>\n<button @click="fruits = []">清空</button>',
  hints: [
    '用到三个指令：v-for 显示列表，v-if / v-else 按条件显示，@click 处理点击。第 2 章开头的指令表列出了它们。v-for 要写 :key，因为 Vue 用 key 判断哪一行是同一行。',
    '1. 把 <li> 改为 <li v-for="f in fruits" :key="…">{{ … }}</li>。2. 在 <ul> 上加 v-if="fruits.length"，在后面加一个 <p v-else>。3. 在按钮上写 @click，把 fruits 设为空数组。',
    '<ul v-if="fruits.length">\n  <li v-for="f in fruits" :key="f.id">{{ f.name }}</li>\n</ul>\n<p v-else>没有水果了</p>\n<button @click="fruits = []">清空</button>'
  ],
  async check(T) {
    const lis = T.$$('li')
    T.ok(lis.length === 3, '渲染出 3 个 li（当前 ' + lis.length + ' 个）')
    T.ok(/苹果/.test(T.text()) && /橙子/.test(T.text()), 'li 中显示水果名称')
    T.ok(!/没有水果了/.test(T.text()), '有水果时不显示“没有水果了”')
    const b = T.btn('清空')
    T.ok(!!b, '有一个“清空”按钮')
    if (!b) return
    await T.click(b)
    T.ok(T.$$('li').length === 0, '点击清空后没有 li')
    T.ok(/没有水果了/.test(T.text()), '清空后显示“没有水果了”')
  }
}

export const classBind: Exercise = {
  title: '用 :class 高亮当前项',
  ch: 2,
  task: '<ol><li>点击一个 li 时，把 current 设为这一项（已写好）。</li><li>用 :class 给当前项添加 active 类。</li><li>保留每个 li 的静态类名 item。</li></ol>',
  tpl: '<ul>\n  <li v-for="t in tabs" :key="t" class="item"\n      @click="current = t">\n    {{ t }}\n  </li>\n</ul>\n<p>当前：{{ current }}</p>',
  js: 'const tabs = [\'首页\', \'文章\', \'关于\']\nconst current = ref(\'首页\')\n\nreturn { tabs, current }',
  solTpl: '<ul>\n  <li v-for="t in tabs" :key="t" class="item"\n      :class="{ active: current === t }"\n      @click="current = t">\n    {{ t }}\n  </li>\n</ul>\n<p>当前：{{ current }}</p>',
  hints: [
    '用 :class 的对象写法按条件添加类名。第 2 章“2.1 插值和 v-bind：显示数据”讲了它。静态 class 和 :class 可以同时写，Vue 把两者合并。',
    '只改 <li> 的开始标签。在 class="item" 旁边加 :class="{ active: … }"。条件是：current 等于这一项 t。',
    '在 li 上加 :class="{ active: current === t }"。不要删除 class="item"。Vue 把两者合并。'
  ],
  async check(T) {
    const lis = () => T.$$('li')
    const act = () => lis().filter(li => li.classList.contains('active')).map(li => (li.textContent || '').trim())
    T.ok(lis().length === 3, '渲染出 3 个 li（当前 ' + lis().length + ' 个）')
    if (lis().length !== 3) return
    T.ok(act().length === 1 && act()[0] === '首页', '初始只有“首页”有 active 类（当前：' + (act().join('、') || '无') + '）')
    await T.click(lis()[2])
    T.ok(act().length === 1 && act()[0] === '关于', '点击“关于”后，只有“关于”有 active 类')
    T.ok(lis().every(li => li.classList.contains('item')), '每个 li 仍有 item 类')
  }
}
