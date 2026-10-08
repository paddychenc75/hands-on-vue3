// 第 6 章的实验台测试数据。格式见 tests/site/exercises.test.js 的 loadLabs。
module.exports = [
  {
    id: 'demo-slots', name: '取消“提供默认插槽”后出现后备内容；取消 #header 后 header 元素消失', pick: 1,
    async run(p, body, ok) {
      await body.locator('.domview').waitFor()
      let txt = await body.locator('.domview').textContent()
      ok(/<header/.test(txt) && /正文/.test(txt), '初始有 header 和正文')
      await body.locator('label.ctl', { hasText: '提供默认插槽' }).locator('input').uncheck()
      await p.waitForTimeout(100)
      txt = await body.locator('.domview').textContent()
      ok(/没有内容（后备内容）/.test(txt), '取消默认插槽后显示后备内容')
      await body.locator('label.ctl', { hasText: '提供 #header' }).locator('input').uncheck()
      await p.waitForTimeout(100)
      txt = await body.locator('.domview').textContent()
      ok(!/<header/.test(txt), '取消 #header 后 header 元素消失')
      await body.locator('label.ctl', { hasText: '作用域插槽' }).locator('input').uncheck()
      await p.waitForTimeout(100)
      ok(/Alice/.test(await body.textContent()), '关掉作用域插槽后用后备内容显示用户名')
    }
  },
  {
    id: 'demo-comm', name: '切换 provide 的主题后所有徽章同步；添加任务写日志', pick: 2,
    async run(p, body, ok) {
      await body.locator('.log').waitFor()
      const n = await body.locator('.pill', { hasText: 'inject: green' }).count()
      ok(n === 3, '初始 3 个 green 徽章（' + n + '）')
      await body.getByRole('button', { name: '切换 provide 的主题' }).click()
      await p.waitForTimeout(100)
      ok(await body.locator('.pill', { hasText: 'inject: blue' }).count() === 3, '切换后 3 个徽章都是 blue')
      await body.locator('input.t').fill('新任务')
      await body.getByRole('button', { name: '添加' }).click()
      await p.waitForTimeout(100)
      ok(await body.locator('.pill').count() === 4, '添加后有 4 行')
      ok(/共 4 项/.test(await body.textContent()), '计数显示共 4 项')
      ok(/emit submit/.test(await body.locator('.log').textContent()), '日志有 emit submit')
    }
  }
]
