// 第 2 章的实验台测试数据。格式见 tests/site/exercises.test.js 的 loadLabs。
//   id    <Lab id>
//   pick  “先猜”里点哪一项（任意一项都会打开实验台）
//   run   做一次有代表性的操作并断言。p 是页面，body 是实验台正文的 locator，ok(c, msg) 记一条结果
module.exports = [
  {
    id: 'demo-classes', name: '勾选 hasError 后渲染出 class="item active error"', pick: 2,
    async run(p, body, ok) {
      await p.locator('#demo-classes .domview').waitFor()
      ok(/class="item active"/.test(await body.locator('.domview').textContent()), '初始 class 是 item active')
      await body.locator('label.ctl', { hasText: 'hasError' }).locator('input').check()
      await p.waitForTimeout(100)
      const txt = await body.locator('.domview').textContent()
      ok(/class="item active error"/.test(txt), '勾选 hasError 后 class 是 item active error（当前：' + txt.split('\n')[0] + '）')
      await body.locator('label.ctl', { hasText: '数组语法' }).locator('input').check()
      await p.waitForTimeout(100)
      ok(/class="item active error"/.test(await body.locator('.domview').textContent()), '切到数组语法后结果不变')
    }
  },
  {
    id: 'demo-directives', name: 'v-on 标签页：.once 点三次再普通 +1，count = 11', pick: 1,
    async run(p, body, ok) {
      await body.locator('.tabs button').first().waitFor()
      const tabs = await body.locator('.tabs button').allTextContents()
      ok(tabs.length === 6, '有 6 个标签页（' + tabs.join('、') + '）')
      for (let i = 0; i < tabs.length; i++) {
        await body.locator('.tabs button').nth(i).click()
        const n = await body.locator('.box').evaluate(e => e.children.length)
        ok(n >= 2, '标签页「' + tabs[i] + '」渲染出小组件')
      }
      await body.locator('.tabs button', { hasText: 'v-on' }).click()
      for (let i = 0; i < 3; i++) await body.getByRole('button', { name: '.once +10' }).click()
      await body.getByRole('button', { name: '普通 +1' }).click()
      ok(/count = 11\b/.test(await body.locator('.box').textContent()), 'count = 11')
      await body.locator('.tabs button', { hasText: 'v-model' }).click()
      await body.locator('.box input.t').first().fill('  张三  ')
      ok(/"name": "张三"/.test(await body.locator('.domview').textContent()), 'v-model.trim 去掉首尾空格')
    }
  },
  {
    id: 'demo-directive', name: '点“无关数据 n++”后日志新增两条 beforeUpdate 和两条 updated', pick: 0,
    async run(p, body, ok) {
      await body.locator('.log').waitFor()
      const lines = async () => (await body.locator('.log > div').allTextContents()).map(t => t.replace(/^\S+\s+/, ''))
      const count = (ls, hook) => ls.filter(t => t.startsWith(hook + ' ')).length
      const before = await lines()
      await body.getByRole('button', { name: /无关数据 n\+\+/ }).click()
      await p.waitForTimeout(100)
      const after = await lines()
      ok(count(after, 'beforeUpdate') - count(before, 'beforeUpdate') === 2, '新增 2 条 beforeUpdate')
      ok(count(after, 'updated') - count(before, 'updated') === 2, '新增 2 条 updated')
      ok(count(after, 'unmounted') === count(before, 'unmounted'), '没有 unmounted')
    }
  }
]
