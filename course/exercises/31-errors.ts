import type { Exercise } from './types'
import { sub } from './types'

// 【待写】这是脚手架生成的示例练习：能通过检查，但内容是占位。照 course/AUTHORING.md 的 4.10 节改成本章真正的练习。
// 练习 id（导出名）创建后不能改。
const solJs = "const msg = ref('你好')\n\nreturn { msg }"

export const errorsIntro: Exercise = {
  title: '【待写】示例练习：显示问候',
  ch: 31,
  task: '<p>【待写】让标题显示 msg 的内容“你好”。只改模板。</p>',
  tpl: '<h1 id="title"></h1>',
  js: "const msg = ref('')\n\nreturn { msg }",
  solTpl: '<h1 id="title">{{ msg }}</h1>',
  solJs,
  faded: {
    tpl: '<h1 id="title">{{ /* ✏️ 在这里显示 msg */ }}</h1>'
  },
  hints: [
    '【待写】msg 是 ref。在模板里用 {{ }} 显示它，不写 .value。',
    '【待写】把 <h1> 的内容改成 {{ msg }}。',
    '<h1 id="title">{{ msg }}</h1>'
  ],
  async check(T) {
    const h = T.$('#title')
    T.ok(!!h, '页面上有 id 为 title 的标题')
    if (!h) return
    T.ok((h.textContent || '').trim() === '你好', '标题显示“你好”，现在是“' + (h.textContent || '').trim() + '”')
  },
  wrong: [
    { tpl: '<h1 id="title">msg</h1>', why: '【待写】把变量名当成了文字。要用 {{ }} 显示数据。' },
    { js: sub(solJs, '你好', '再见'), why: '【待写】数据本身不对。' }
  ]
}
