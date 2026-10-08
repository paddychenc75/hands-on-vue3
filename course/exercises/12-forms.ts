import type { Exercise } from './types'
import { nextTick } from 'vue'

export const formRuleFill: Exercise = {
  title: '补全：一条校验规则和 valid', ch: 12,
  task: '<p>这是第 12.4 节的校验。errors 是计算属性，姓名的规则已经写好。只补全两行 TODO。</p><ol><li>TODO 1：email 不包含 @ 时，e.email 是“邮箱格式不正确”。</li><li>TODO 2：把 valid 改为计算属性。errors 没有任何键时，valid 为 true。</li></ol><p>本题直接显示错误，不使用 touched。</p>',
  tpl: '<label>姓名 <input class="name" v-model.trim="form.name"></label>\n<p class="err-name">{{ errors.name }}</p>\n<label>邮箱 <input class="email" v-model.trim="form.email"></label>\n<p class="err-email">{{ errors.email }}</p>\n<p class="state">{{ valid ? \'可以提交\' : \'还有错误\' }}</p>',
  js: `const form = reactive({ name: '', email: '' })

const errors = computed(() => {
  const e = {}
  if (!form.name) e.name = '请输入姓名'
  // TODO 1：email 不包含 @ 时，e.email 是“邮箱格式不正确”
  return e
})

// TODO 2：用 computed 计算 valid。errors 没有任何键时为 true
const valid = false

return { form, errors, valid }`,
  solJs: `const form = reactive({ name: '', email: '' })

const errors = computed(() => {
  const e = {}
  if (!form.name) e.name = '请输入姓名'
  if (!form.email.includes('@')) e.email = '邮箱格式不正确'
  return e
})

const valid = computed(() => Object.keys(errors.value).length === 0)

return { form, errors, valid }`,
  faded: {
    js: `const form = reactive({ name: '', email: '' })

const errors = computed(() => {
  const e = {}
  if (!form.name) e.name = '请输入姓名'
  if (/* ✏️ 邮箱不包含 @ */ false) e.email = '邮箱格式不正确'
  return e
})

const valid = /* ✏️ 用 computed：errors 里没有任何键时为 true */ false

return { form, errors, valid }`
  },
  hints: [
    '错误信息从表单数据计算得到，所以用计算属性实现校验。valid 也从 errors 计算得到。第 12 章 12.4 节讲了它。',
    'TODO 1：仿照姓名那一行，写一个 if。条件是 form.email 不包含 \'@\'。TODO 2：把 false 改为 computed(…)。getter 中检查 Object.keys(errors.value) 的长度。在脚本中，computed 要写 .value。',
    'if (!form.email.includes(\'@\')) e.email = \'邮箱格式不正确\'\nconst valid = computed(() => Object.keys(errors.value).length === 0)'
  ],
  async check(T) {
    const t = c => ((T.$('.' + c) || {}).textContent || '').trim();
    const type = async (c, v) => { const el = T.$('input.' + c); el.value = v; el.dispatchEvent(new Event('input')); await nextTick(); };
    if (!T.$('input.name') || !T.$('input.email')) { T.ok(false, '找到姓名和邮箱两个输入框'); return; }
    T.ok(t('err-name') === '请输入姓名', '姓名为空时，显示“请输入姓名”');
    T.ok(t('err-email') === '邮箱格式不正确', 'TODO 1：邮箱为空时，显示“邮箱格式不正确”（当前：' + (t('err-email') || '空') + '）');
    T.ok(t('state') === '还有错误', '有错误时，显示“还有错误”');
    await type('name', 'Tom');
    await type('email', 'tom');
    T.ok(t('err-name') === '' && t('err-email') === '邮箱格式不正确', '姓名 Tom、邮箱 tom：只有邮箱有错误');
    await type('email', 'tom@example.com');
    T.ok(t('err-email') === '', '邮箱改为 tom@example.com 后，邮箱的错误消失');
    T.ok(t('state') === '可以提交', 'TODO 2：没有错误时，显示“可以提交”（当前：' + t('state') + '）');
    await type('name', '');
    T.ok(t('state') === '还有错误', '只有姓名有错误时，也显示“还有错误”（valid 要看 errors 的所有键）');
    await type('name', 'Tom');
    await type('email', 'tom');
    T.ok(t('state') === '还有错误', '只有邮箱有错误时，也显示“还有错误”（valid 要看 errors 的所有键）');
  },
  wrong: [
    { js: 'const form = reactive({ name: \'\', email: \'\' })\n\nconst errors = computed(() => {\n  const e = {}\n  if (!form.name) e.name = \'请输入姓名\'\n  if (!form.email.includes(\'@\')) e.email = \'邮箱格式不正确\'\n  return e\n})\n\nconst valid = computed(() => !errors.value.email)\n\nreturn { form, errors, valid }', why: 'valid 只检查了 email 一个键。姓名为空时仍显示“可以提交”。要检查 errors 里是否有任何键。' },
    { js: 'const form = reactive({ name: \'\', email: \'\' })\n\nconst errors = computed(() => {\n  const e = {}\n  if (!form.name) e.name = \'请输入姓名\'\n  if (!form.email) e.email = \'邮箱格式不正确\'\n  return e\n})\n\nconst valid = computed(() => Object.keys(errors.value).length === 0)\n\nreturn { form, errors, valid }', why: '只检查邮箱是否为空。“tom” 这样没有 @ 的邮箱会通过，格式校验没有做。' },
    { js: 'const form = reactive({ name: \'\', email: \'\' })\n\nconst errors = computed(() => {\n  const e = {}\n  if (!form.name) e.name = \'请输入姓名\'\n  if (!form.email.includes(\'@\')) e.email = \'邮箱格式不正确\'\n  return e\n})\n\nconst valid = Object.keys(errors.value).length === 0\n\nreturn { form, errors, valid }', why: '没有用 computed。valid 只在 setup 时算一次（此时有错误，是 false），之后输入再正确它也不变。' }
  ]
}

export const formValid: Exercise = {
  title: '用计算属性校验表单', ch: 12,
  task: '<ol><li>把 errors 改为计算属性。name 为空时，errors.name 是“请输入姓名”。</li><li>email 不包含 @ 时，errors.email 是“邮箱格式不正确”。</li><li>添加计算属性 valid：errors 没有任何键时为 true。</li><li>修改 submit：valid 为 false 时，msg 是“请修改错误”。</li></ol><p>模板已经写好。只修改脚本。</p>',
  tpl: '<form @submit.prevent="submit" novalidate>\n  <label>姓名 <input class="name" v-model.trim="form.name"></label>\n  <p class="err-name">{{ submitted ? errors.name : \'\' }}</p>\n  <label>邮箱 <input class="email" v-model.trim="form.email"></label>\n  <p class="err-email">{{ submitted ? errors.email : \'\' }}</p>\n  <button>提交</button>\n</form>\n<p class="msg">{{ msg }}</p>',
  js: "const form = reactive({ name: '', email: '' })\nconst submitted = ref(false)\nconst msg = ref('')\n\n// TODO 1：用 computed 计算 errors\nconst errors = {}\n\n// TODO 2：计算 valid\n\nfunction submit() {\n  submitted.value = true\n  // TODO 3：valid 为 false 时，显示“请修改错误”并返回\n  msg.value = '已提交：' + form.name\n}\n\nreturn { form, submitted, msg, errors, submit }",
  solJs: "const form = reactive({ name: '', email: '' })\nconst submitted = ref(false)\nconst msg = ref('')\n\nconst errors = computed(() => {\n  const e = {}\n  if (!form.name) e.name = '请输入姓名'\n  if (!form.email.includes('@')) e.email = '邮箱格式不正确'\n  return e\n})\n\nconst valid = computed(() => Object.keys(errors.value).length === 0)\n\nfunction submit() {\n  submitted.value = true\n  if (!valid.value) {\n    msg.value = '请修改错误'\n    return\n  }\n  msg.value = '已提交：' + form.name\n}\n\nreturn { form, submitted, msg, errors, submit }",
  faded: {
    js: `const form = reactive({ name: '', email: '' })
const submitted = ref(false)
const msg = ref('')

const errors = /* ✏️ errors 由表单数据算出来：用什么 API 包住下面的 getter？ */(() => {
  const e = {}
  if (!form.name) e.name = '请输入姓名'
  /* ✏️ email 不包含 @ 时，设置 e.email */
  return e
})

const valid = /* ✏️ 计算属性：errors 没有任何键时为 true */ null

function submit() {
  submitted.value = true
  /* ✏️ valid 为 false 时，msg 设为“请修改错误”并结束函数 */
  msg.value = '已提交：' + form.name
}

return { form, submitted, msg, errors, submit }`
  },
  hints: [
    '错误信息由表单数据计算得到，所以用 computed。第 12 章“12.4 用计算属性校验”讲了它。用 computed 时，输入改变后错误立即更新。',
    '1. 把 const errors = {} 改为 computed，在函数中创建空对象 e，按条件添加 e.name 和 e.email，返回 e。2. 添加 valid = computed(…)，判断 errors.value 有没有键。3. 在 submit 中，valid.value 为 false 时设置 msg 并 return。',
    'const errors = computed(() => {\n  const e = {}\n  if (!form.name) e.name = \'请输入姓名\'\n  if (!form.email.includes(\'@\')) e.email = \'邮箱格式不正确\'\n  return e\n})\nconst valid = computed(() => Object.keys(errors.value).length === 0)\n// submit 中：\nif (!valid.value) { msg.value = \'请修改错误\'; return }'
  ],
  async check(T) {
    const wait = n => new Promise(r => setTimeout(r, n));
    const txt = s => ((T.$(s) || {}).textContent || '').trim();
    const fill = async (s, v) => { const el = T.$(s); el.value = v; el.dispatchEvent(new Event('input')); await wait(0); };
    if (!T.$('.name') || !T.$('.email') || !T.btn('提交')) { T.ok(false, '模板中有两个输入框和“提交”按钮'); return; }
    T.ok(txt('.err-name') === '' && txt('.err-email') === '', '提交前不显示错误');
    await T.click(T.btn('提交'));
    T.ok(txt('.err-name') === '请输入姓名', '空表单提交后，显示“请输入姓名”（当前：' + (txt('.err-name') || '空') + '）');
    T.ok(txt('.err-email') === '邮箱格式不正确', '显示“邮箱格式不正确”（当前：' + (txt('.err-email') || '空') + '）');
    T.ok(txt('.msg') === '请修改错误', '无效时不提交，显示“请修改错误”（当前：' + (txt('.msg') || '空') + '）');
    await fill('.name', 'Ann');
    T.ok(txt('.err-name') === '', '输入姓名后，姓名的错误立即消失');
    await fill('.email', 'ann@example.com');
    T.ok(txt('.err-email') === '', '输入有效邮箱后，邮箱的错误消失');
    await T.click(T.btn('提交'));
    T.ok(txt('.msg') === '已提交：Ann', '有效时提交成功，显示“已提交：Ann”');
    await fill('.email', 'bad');
    await T.click(T.btn('提交'));
    T.ok(txt('.msg') === '请修改错误', '只有邮箱无效时，也不提交（当前：' + (txt('.msg') || '空') + '）');
    await fill('.email', 'ann@example.com');
    await T.click(T.btn('提交'));
    T.ok(txt('.msg') === '已提交：Ann', '改正后再次提交成功（valid 是计算属性，随输入更新）');
    await fill('.name', '');
    await T.click(T.btn('提交'));
    T.ok(txt('.msg') === '请修改错误', '只有姓名为空时，也不提交（当前：' + (txt('.msg') || '空') + '）');
  },
  wrong: [
    { js: 'const form = reactive({ name: \'\', email: \'\' })\nconst submitted = ref(false)\nconst msg = ref(\'\')\n\nconst errors = computed(() => {\n  const e = {}\n  if (!form.name) e.name = \'请输入姓名\'\n  if (!form.email.includes(\'@\')) e.email = \'邮箱格式不正确\'\n  return e\n})\n\nconst valid = Object.keys(errors.value).length === 0\n\nfunction submit() {\n  submitted.value = true\n  if (!valid.value) {\n    msg.value = \'请修改错误\'\n    return\n  }\n  msg.value = \'已提交：\' + form.name\n}\n\nreturn { form, submitted, msg, errors, submit }', why: 'valid 不是计算属性，是一个普通的布尔值。submit 里读 valid.value 得到 undefined，!undefined 永远为 true，所以总是“请修改错误”，改正后也无法提交。', expectFail: /有效时提交成功/ },
    { js: 'const form = reactive({ name: \'\', email: \'\' })\nconst submitted = ref(false)\nconst msg = ref(\'\')\n\nconst errors = computed(() => {\n  const e = {}\n  if (!form.name) e.name = \'请输入姓名\'\n  if (!form.email.includes(\'@\')) e.email = \'邮箱格式不正确\'\n  return e\n})\n\nconst valid = computed(() => !errors.value.name)\n\nfunction submit() {\n  submitted.value = true\n  if (!valid.value) {\n    msg.value = \'请修改错误\'\n    return\n  }\n  msg.value = \'已提交：\' + form.name\n}\n\nreturn { form, submitted, msg, errors, submit }', why: 'valid 只检查了 name。邮箱无效时也会提交成功。要检查 errors 里是否有任何键。' },
    { js: 'const form = reactive({ name: \'\', email: \'\' })\nconst submitted = ref(false)\nconst msg = ref(\'\')\n\nconst errors = computed(() => {\n  const e = {}\n  if (!form.name) e.name = \'请输入姓名\'\n  if (!form.email.includes(\'@\')) e.email = \'邮箱格式不正确\'\n  return e\n})\n\nconst valid = computed(() => Object.keys(errors.value).length === 0)\n\nfunction submit() {\n  submitted.value = true\n  if (!valid.value) {\n    msg.value = \'请修改错误\'\n  }\n  msg.value = \'已提交：\' + form.name\n}\n\nreturn { form, submitted, msg, errors, submit }', why: '提示后没有 return。无效时先显示“请修改错误”，下一行又被覆盖成“已提交”。' }
  ]
}

export const phenoClip: Exercise = {
  title: '看现象：弹窗只显示了一部分', ch: 12,
  task: '<p>任务卡片 .card 设置了 <code>overflow: hidden</code>、固定高度和 transform。这是卡片的设计，不能修改。</p><ol><li>点击“删除任务”。弹窗出现，但是只显示在卡片的范围内，其他部分被裁掉。</li></ol><p>期望：弹窗完整显示在页面上。弹窗中的“取消”按钮仍然可以关闭弹窗。不修改卡片的样式。</p>',
  tpl: '<div class="card" style="overflow: hidden; height: 64px; transform: translateZ(0); border: 1px solid #999; padding: 8px">\n  <span>任务：修复登录</span>\n  <button @click="open = true">删除任务</button>\n  <div v-if="open" class="pheno-modal" style="position: fixed; top: 40px; left: 20px; z-index: 10; background: #fff; color: #222; border: 1px solid #333; padding: 12px">\n    <p>确认删除“修复登录”吗？</p>\n    <button @click="open = false">取消</button>\n  </div>\n</div>',
  solTpl: '<div class="card" style="overflow: hidden; height: 64px; transform: translateZ(0); border: 1px solid #999; padding: 8px">\n  <span>任务：修复登录</span>\n  <button @click="open = true">删除任务</button>\n  <Teleport to="body">\n    <div v-if="open" class="pheno-modal" style="position: fixed; top: 40px; left: 20px; z-index: 10; background: #fff; color: #222; border: 1px solid #333; padding: 12px">\n      <p>确认删除“修复登录”吗？</p>\n      <button @click="open = false">取消</button>\n    </div>\n  </Teleport>\n</div>',
  js: 'const open = ref(false)\n\nreturn { open }',
  faded: {
    tpl: `<div class="card" style="overflow: hidden; height: 64px; transform: translateZ(0); border: 1px solid #999; padding: 8px">
  <span>任务：修复登录</span>
  <button @click="open = true">删除任务</button>
  <!-- ✏️ 开始标签：让弹窗的 DOM 脱离卡片，渲染到 body -->
  <div v-if="open" class="pheno-modal" style="position: fixed; top: 40px; left: 20px; z-index: 10; background: #fff; color: #222; border: 1px solid #333; padding: 12px">
    <p>确认删除“修复登录”吗？</p>
    <button @click="open = false">取消</button>
  </div>
  <!-- ✏️ 与上面成对的结束标签 -->
</div>`
  },
  hints: [
    '原因：弹窗的 DOM 在卡片里面。祖先元素的 overflow: hidden 裁切所有后代。卡片的 transform 还让 position: fixed 相对卡片定位，所以提高 z-index 也没有用。弹窗的 DOM 要放到卡片外面，同时它仍然属于这个组件，可以读写 open。第 9 章 9.3 节讲了它。',
    '只改模板。用一个内置组件包住整个 .pheno-modal，把它渲染到 body 中。卡片的样式不改。',
    '<Teleport to="body">\n  <div v-if="open" class="pheno-modal" …>\n    …\n  </div>\n</Teleport>'
  ],
  wrong: [
    { tpl: '<div class="card" style="overflow: hidden; height: 64px; transform: translateZ(0); border: 1px solid #999; padding: 8px">\n  <span>任务：修复登录</span>\n  <button @click="open = true">删除任务</button>\n  <div v-if="open" class="pheno-modal" style="position: fixed; top: 40px; left: 20px; z-index: 9999; background: #fff; color: #222; border: 1px solid #333; padding: 12px">\n    <p>确认删除“修复登录”吗？</p>\n    <button @click="open = false">取消</button>\n  </div>\n</div>', why: 'z-index 只决定层叠顺序。弹窗仍在卡片中，仍然被 overflow: hidden 裁切。' },
    { tpl: '<div class="card" style="height: 64px; border: 1px solid #999; padding: 8px">\n  <span>任务：修复登录</span>\n  <button @click="open = true">删除任务</button>\n  <div v-if="open" class="pheno-modal" style="position: fixed; top: 40px; left: 20px; z-index: 10; background: #fff; color: #222; border: 1px solid #333; padding: 12px">\n    <p>确认删除“修复登录”吗？</p>\n    <button @click="open = false">取消</button>\n  </div>\n</div>', why: '删除了卡片的样式。卡片的长文字会溢出，而且弹窗写在哪个组件中，就要检查它所有祖先的样式。' }
  ],
  async check(T) {
    const modal = () => document.querySelector('.pheno-modal');
    const card = T.$('.card');
    T.ok(!!card && getComputedStyle(card).overflow === 'hidden' && getComputedStyle(card).transform !== 'none', '卡片仍有 overflow: hidden 和 transform');
    T.ok(!modal(), '初始没有弹窗');
    const b = T.btn('删除任务');
    if (!b) { T.ok(false, '找到“删除任务”按钮'); return; }
    await T.click(b);
    const m = modal();
    T.ok(!!m, '点击“删除任务”后，弹窗出现');
    if (!m) return;
    T.ok(!m.closest('.card'), '弹窗的 DOM 不在 .card 中，所以不被裁切');
    const cancel = [...m.querySelectorAll('button')].find(x => /取消/.test(x.textContent));
    if (!cancel) { T.ok(false, '弹窗中有“取消”按钮'); return; }
    await T.click(cancel);
    T.ok(!modal(), '点击“取消”后，弹窗关闭');
  }
}

export const phenoTheme: Exercise = {
  title: '看现象：切换主题后，深层组件不变', ch: 12,
  task: '<p>App 有一个主题 theme。ThemeBadge 在 Layout 里面，它显示当前主题。Layout 不转交任何数据。</p><ol><li>点击“切换主题”。App 显示 dark，ThemeBadge 仍显示 light。</li></ol><p>期望：ThemeBadge 跟着 App 一起变化。只修改脚本，不添加 props。</p>',
  tpl: '<p class="app">App 的主题：{{ theme }}</p>\n<button @click="theme = theme === \'light\' ? \'dark\' : \'light\'">切换主题</button>\n<Layout />',
  js: `const ThemeBadge = {
  setup() {
    const theme = inject('theme')
    return { theme }
  },
  template: '<span class="badge" :class="theme">徽章的主题：{{ theme }}</span>'
}
const Layout = {
  components: { ThemeBadge },
  template: '<div class="layout"><ThemeBadge /></div>'
}

const theme = ref('light')
provide('theme', theme.value)

return { theme, components: { Layout } }`,
  solJs: `const ThemeBadge = {
  setup() {
    const theme = inject('theme')
    return { theme }
  },
  template: '<span class="badge" :class="theme">徽章的主题：{{ theme }}</span>'
}
const Layout = {
  components: { ThemeBadge },
  template: '<div class="layout"><ThemeBadge /></div>'
}

const theme = ref('light')
provide('theme', theme)   // 提供 ref 本身，后代拿到同一个 ref

return { theme, components: { Layout } }`,
  faded: {
    js: `const ThemeBadge = {
  setup() {
    const theme = inject('theme')
    return { theme }
  },
  template: '<span class="badge" :class="theme">徽章的主题：{{ theme }}</span>'
}
const Layout = {
  components: { ThemeBadge },
  template: '<div class="layout"><ThemeBadge /></div>'
}

const theme = ref('light')
provide('theme', /* ✏️ 提供什么，后代才能跟着 theme 变化？ */ theme.value)

return { theme, components: { Layout } }`
  },
  hints: [
    '原因：App 提供给后代的是 theme 当时的值，也就是字符串 \'light\'。字符串不是响应式数据。之后 theme 改变，后代拿到的仍是旧字符串。要把“能被跟踪的数据”本身交给后代。第 6 章 6.6 节最后的注意讲了它。',
    '只改 App 中向后代提供数据的那一行。去掉 .value，提供 ref 本身。ThemeBadge 不用改：模板自动解包 ref。',
    "provide('theme', theme)"
  ],
  wrong: [
    { js: `const ThemeBadge = {
  setup() {
    const theme = ref(inject('theme'))
    return { theme }
  },
  template: '<span class="badge" :class="theme">徽章的主题：{{ theme }}</span>'
}
const Layout = {
  components: { ThemeBadge },
  template: '<div class="layout"><ThemeBadge /></div>'
}

const theme = ref('light')
provide('theme', theme.value)

return { theme, components: { Layout } }`, why: '后代用 ref 包住收到的字符串，只得到一个新的、自己的 ref。它和 App 的 theme 没有联系。' },
    { js: `const ThemeBadge = {
  setup() {
    const theme = inject('theme')
    return { theme }
  },
  template: '<span class="badge" :class="theme">徽章的主题：{{ theme }}</span>'
}
const Layout = {
  components: { ThemeBadge },
  template: '<div class="layout"><ThemeBadge /></div>'
}

const theme = ref('light')
provide('theme', theme.value)
watch(theme, v => provide('theme', v))

return { theme, components: { Layout } }`, why: 'provide 只能在 setup 中同步调用。在侦听器中再调用一次没有作用，后代也不会重新读取。' }
  ],
  async check(T) {
    const app = () => ((T.$('p.app') || {}).textContent || '').replace(/^[^：]*：/, '').trim();
    const badge = () => T.$('.badge');
    const bt = () => ((badge() || {}).textContent || '').replace(/^[^：]*：/, '').trim();
    if (!badge()) { T.ok(false, '渲染出 ThemeBadge'); return; }
    T.ok(app() === 'light' && bt() === 'light', '初始 App 和 ThemeBadge 都是 light');
    const b = T.btn('切换主题');
    if (!b) { T.ok(false, '找到“切换主题”按钮'); return; }
    await T.click(b);
    T.ok(app() === 'dark', '点击后，App 显示 dark');
    T.ok(bt() === 'dark' && badge().classList.contains('dark'), '点击后，ThemeBadge 也显示 dark（当前：' + bt() + '）');
    await T.click(T.btn('切换主题'));
    T.ok(bt() === 'light', '再点击一次，ThemeBadge 回到 light');
  }
}
