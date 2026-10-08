import { nextTick } from 'vue'
import type { Exercise } from './types'

export const list: Exercise = {
  title: '列表、条件与事件',
  ch: 2,
  task: '<ol><li>用 v-for 把 fruits 显示为 &lt;li&gt;。写 :key。</li><li>列表为空时，显示“没有水果了”。</li><li>点击“清空”时，清空列表。</li></ol>',
  tpl: '<ul>\n  <li>在这里用 v-for 渲染 fruits</li>\n</ul>\n<button>清空</button>',
  js: 'const fruits = ref([\n  { id: 1, name: \'苹果\' },\n  { id: 2, name: \'香蕉\' },\n  { id: 3, name: \'橙子\' }\n])\n\nreturn { fruits }',
  solTpl: '<ul v-if="fruits.length">\n  <li v-for="f in fruits" :key="f.id">{{ f.name }}</li>\n</ul>\n<p v-else>没有水果了</p>\n<button @click="fruits = []">清空</button>',
  faded: {
    tpl: `<ul v-if="/* ✏️ 列表不为空时才显示 */">
  <li v-for="/* ✏️ 用 f 遍历 fruits */" :key="/* ✏️ 每一项的唯一标识 */">{{ f.name }}</li>
</ul>
<p v-else>没有水果了</p>
<button @click="/* ✏️ 把 fruits 清空 */">清空</button>`
  },
  hints: [
    '用到三个指令：v-for 显示列表，v-if / v-else 按条件显示，@click 处理点击。第 2 章开头的指令表列出了它们。v-for 要写 :key，因为 Vue 用 key 判断哪一行是同一行。',
    '1. 把 <li> 改为 <li v-for="f in fruits" :key="…">{{ … }}</li>。2. 在 <ul> 上加 v-if="fruits.length"，在后面加一个 <p v-else>（用 v-show 也可以）。3. 在按钮上写 @click，把 fruits 设为空数组。',
    '<ul v-if="fruits.length">\n  <li v-for="f in fruits" :key="f.id">{{ f.name }}</li>\n</ul>\n<p v-else>没有水果了</p>\n<button @click="fruits = []">清空</button>'
  ],
  async check(T) {
    const lis = T.$$('li')
    T.ok(lis.length === 3, '渲染出 3 个 li（当前 ' + lis.length + ' 个）')
    T.ok(/苹果/.test(T.text()) && /橙子/.test(T.text()), 'li 中显示水果名称')
    // 沿 vnode 树收集 li 的 key
    const root = T.$(':scope > div')
    const keys: unknown[] = []
    const walk = (v: any) => {
      if (!v) return
      if (v.type === 'li') keys.push(v.key)
      const c = v.component ? v.component.subTree : v.children
      if (Array.isArray(c)) c.forEach(walk)
      else if (c && typeof c === 'object' && c.type) walk(c)
    }
    walk(root && (root as any)._vnode)
    T.ok(keys.length === 3 && keys.every(k => k != null), '每个 li 都有 :key（当前：' + (keys.map(k => k ?? '无').join('、') || '找不到 li') + '）')
    // “没有水果了”用可见性判断，v-if 和 v-show 都算对
    const shown = () => {
      const m = T.$$('*').find(el => el.children.length === 0 && /没有水果了/.test(el.textContent || ''))
      return !!m && m.checkVisibility()
    }
    T.ok(!shown(), '有水果时不显示“没有水果了”')
    const b = T.btn('清空')
    T.ok(!!b, '有一个“清空”按钮')
    if (!b) return
    await T.click(b)
    T.ok(T.$$('li').length === 0, '点击清空后没有 li')
    T.ok(shown(), '清空后显示“没有水果了”')
  },
  wrong: [
    { tpl: '<ul v-if="fruits.length">\n  <li v-for="f in fruits">{{ f.name }}</li>\n</ul>\n<p v-else>没有水果了</p>\n<button @click="fruits = []">清空</button>', why: '没有写 :key。Vue 只能按位置复用 li。' },
    { tpl: '<ul>\n  <li v-for="f in fruits" :key="f.id">{{ f.name }}</li>\n</ul>\n<p>没有水果了</p>\n<button @click="fruits = []">清空</button>', why: '“没有水果了”一直显示，没有按条件显示。' }
  ]
}

export const classBind: Exercise = {
  title: '用 :class 高亮当前项',
  ch: 2,
  task: '<ol><li>点击一个 li 时，把 current 设为这一项（已写好）。</li><li>用 :class 给当前项添加 active 类。</li><li>保留每个 li 的静态类名 item。</li></ol>',
  tpl: '<ul>\n  <li v-for="t in tabs" :key="t" class="item"\n      @click="current = t">\n    {{ t }}\n  </li>\n</ul>\n<p>当前：{{ current }}</p>',
  js: 'const tabs = [\'首页\', \'文章\', \'关于\']\nconst current = ref(\'首页\')\n\nreturn { tabs, current }',
  solTpl: '<ul>\n  <li v-for="t in tabs" :key="t" class="item"\n      :class="{ active: current === t }"\n      @click="current = t">\n    {{ t }}\n  </li>\n</ul>\n<p>当前：{{ current }}</p>',
  faded: {
    tpl: `<ul>
  <li v-for="t in tabs" :key="t" class="item"
      :class="/* ✏️ 对象写法：键是类名 active，值是“这一项是不是当前项” */"
      @click="current = t">
    {{ t }}
  </li>
</ul>
<p>当前：{{ current }}</p>`
  },
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
  },
  wrong: [
    { tpl: '<ul>\n  <li v-for="t in tabs" :key="t" class="item"\n      :class="{ active: current }"\n      @click="current = t">\n    {{ t }}\n  </li>\n</ul>\n<p>当前：{{ current }}</p>', why: '条件只写了 current。它始终有值，所以每个 li 都有 active 类。条件要比较 current 和这一项 t。' },
    { tpl: '<ul>\n  <li v-for="t in tabs" :key="t" \n      :class="current === t ? \'active\' : \'item\'"\n      @click="current = t">\n    {{ t }}\n  </li>\n</ul>\n<p>当前：{{ current }}</p>', why: '用三元表达式代替了静态类：当前项只有 active，丢了 item。静态 class 和 :class 可以同时写，Vue 会合并。' }
  ]
}

export const modelFill: Exercise = {
  title: '补全：用 v-model 连接三种表单元素',
  ch: 2,
  task: '<p>下面的表单已经有数据，但三个控件还没有连接到数据。只补全三处 TODO。</p><ol><li>TODO 1：文本框连接 name。</li><li>TODO 2：两个复选框连接同一个数组 skills。</li><li>TODO 3：下拉框连接 city。进入页面时，下拉框要显示“上海”。</li></ol>',
  tpl: '<!-- TODO 1：连接 name -->\n<input class="name" placeholder="姓名">\n<!-- TODO 2：两个复选框连接 skills -->\n<label><input type="checkbox" value="Vue"> Vue</label>\n<label><input type="checkbox" value="TypeScript"> TypeScript</label>\n<!-- TODO 3：连接 city -->\n<select class="city">\n  <option value="bj">北京</option>\n  <option value="sh">上海</option>\n</select>\n<p class="out">姓名：{{ name }}；技能：{{ skills.join(\'、\') }}；城市：{{ city }}</p>',
  js: 'const name = ref(\'\')\nconst skills = ref([])\nconst city = ref(\'sh\')\n\nreturn { name, skills, city }',
  solTpl: '<input class="name" placeholder="姓名" v-model="name">\n<label><input type="checkbox" value="Vue" v-model="skills"> Vue</label>\n<label><input type="checkbox" value="TypeScript" v-model="skills"> TypeScript</label>\n<select class="city" v-model="city">\n  <option value="bj">北京</option>\n  <option value="sh">上海</option>\n</select>\n<p class="out">姓名：{{ name }}；技能：{{ skills.join(\'、\') }}；城市：{{ city }}</p>',
  faded: {
    tpl: `<input class="name" placeholder="姓名" v-model="/* ✏️ 连接到文本框对应的数据 */">
<label><input type="checkbox" value="Vue" v-model="skills"> Vue</label>
<label><input type="checkbox" value="TypeScript" v-model="/* ✏️ 和上一个复选框连到同一个数据，选中项会放进数组 */"> TypeScript</label>
<select class="city" v-model="/* ✏️ 连接到城市对应的数据；初始选中项来自它的值 */">
  <option value="bj">北京</option>
  <option value="sh">上海</option>
</select>
<p class="out">姓名：{{ name }}；技能：{{ skills.join('、') }}；城市：{{ city }}</p>`
  },
  hints: [
    'v-model 根据元素类型选择属性和事件。第 2 章“2.5 v-model：连接表单和数据”的表格列出了文本框、多个复选框和下拉框的写法。',
    '三处都只在开始标签里加 v-model。文本框写 v-model="name"。两个复选框都写 v-model="skills"，Vue 把选中项的 value 放进数组。下拉框写 v-model="city"，它的初始选中项来自 city 的值。',
    '<input class="name" v-model="name">\n<input type="checkbox" value="Vue" v-model="skills">\n<input type="checkbox" value="TypeScript" v-model="skills">\n<select class="city" v-model="city">'
  ],
  async check(T) {
    const out = () => (T.$('.out') || { textContent: '' }).textContent || ''
    const name = T.$('.name') as HTMLInputElement | null
    const sel = T.$('.city') as HTMLSelectElement | null
    const boxes = T.$$('input[type=checkbox]') as HTMLInputElement[]
    T.ok(!!name && !!sel && boxes.length === 2, '页面有文本框、两个复选框和下拉框')
    if (!name || !sel || boxes.length !== 2) return
    T.ok(sel.value === 'sh', '进入页面时，下拉框显示“上海”（当前值：' + sel.value + '）')
    name.value = '小明'
    name.dispatchEvent(new Event('input', { bubbles: true }))
    name.dispatchEvent(new Event('change', { bubbles: true }))   // v-model.lazy 监听的是 change
    await nextTick()
    T.ok(/姓名：小明/.test(out()), '在文本框输入后，name 跟着改变（当前：' + out() + '）')
    await T.click(boxes[0])
    await T.click(boxes[1])
    T.ok(/技能：Vue、TypeScript/.test(out()), '勾选两个复选框后，skills 是 [Vue, TypeScript]（当前：' + out() + '）')
    await T.click(boxes[0])
    T.ok(/技能：TypeScript(；|$)/.test(out()), '取消勾选 Vue 后，skills 只剩 TypeScript')
    sel.value = 'bj'
    sel.dispatchEvent(new Event('change', { bubbles: true }))
    await nextTick()
    T.ok(/城市：bj/.test(out()), '选择“北京”后，city 是 bj（当前：' + out() + '）')
  },
  wrong: [
    { tpl: '<input class="name" placeholder="姓名" :value="name">\n<label><input type="checkbox" value="Vue" v-model="skills"> Vue</label>\n<label><input type="checkbox" value="TypeScript" v-model="skills"> TypeScript</label>\n<select class="city" v-model="city">\n  <option value="bj">北京</option>\n  <option value="sh">上海</option>\n</select>\n<p class="out">姓名：{{ name }}；技能：{{ skills.join(\'、\') }}；城市：{{ city }}</p>', why: ':value 只是单向绑定：数据改变时输入框跟着改变，输入框改变时数据不变。要双向同步，用 v-model。' },
    { tpl: '<input class="name" placeholder="姓名" v-model="name">\n<label><input type="checkbox" value="Vue" v-model="skills"> Vue</label>\n<label><input type="checkbox" value="TypeScript"> TypeScript</label>\n<select class="city" v-model="city">\n  <option value="bj">北京</option>\n  <option value="sh">上海</option>\n</select>\n<p class="out">姓名：{{ name }}；技能：{{ skills.join(\'、\') }}；城市：{{ city }}</p>', why: '第二个复选框没有 v-model。每个要进入数组的复选框都要写 v-model="skills"。' },
    { tpl: '<input class="name" placeholder="姓名" v-model="name">\n<label><input type="checkbox" value="Vue" v-model="skills"> Vue</label>\n<label><input type="checkbox" value="TypeScript" v-model="skills"> TypeScript</label>\n<select class="city" @change="city = $event.target.value">\n  <option value="bj">北京</option>\n  <option value="sh">上海</option>\n</select>\n<p class="out">姓名：{{ name }}；技能：{{ skills.join(\'、\') }}；城市：{{ city }}</p>', why: '只写 @change 是单向的：选择改变时更新数据，但进入页面时，下拉框不会按 city 的值显示“上海”。v-model 两个方向都处理。' }
  ]
}
