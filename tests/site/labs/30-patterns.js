// 第 30 章的实验台测试数据。
module.exports = [
  {
    id: 'demo-pat-tabs', name: '取消“安全”后日志出现 unregister；Tabs 外的 Tab 报错', pick: 0,
    async run(p, body, ok) {
      await body.locator('.tabs button').first().waitFor()
      ok((await body.locator('.tabs button').allTextContents()).join() === '资料,安全,通知', '三个标签页按顺序注册')
      await body.locator('.tabs button', { hasText: '通知' }).click()
      ok(/小明，你有 3 条新消息/.test(await body.locator('[role=tabpanel]').textContent()), '通知页显示昵称')
      await body.locator('label.ctl', { hasText: '显示“安全”' }).locator('input').uncheck()
      await p.waitForTimeout(100)
      ok(/unregister\("security"\)/.test(await body.locator('.log').textContent()), '日志有 unregister("security")')
      ok((await body.locator('.tabs button').count()) === 2, '标签页剩 2 个')
      await body.locator('label.ctl', { hasText: '在 Tabs 外' }).locator('input').check()
      await p.waitForTimeout(100)
      ok(/Tab 必须放在 Tabs 中/.test(await body.textContent()), 'Tabs 外的 Tab 显示错误')
    }
  },
  {
    id: 'demo-pat-tree', name: '给 src 添加文件后节点数 +1，深度显示正确', pick: 0,
    async run(p, body, ok) {
      await body.locator('.cap').first().waitFor()
      const t0 = await body.locator('.cap').first().textContent()
      ok(/共 8 个节点，最大深度 3/.test(t0), '初始 8 个节点、最大深度 3（' + t0.slice(0, 16) + '）')
      await body.getByRole('button', { name: '添加文件' }).first().click()
      await p.waitForTimeout(100)
      ok(/共 9 个节点/.test(await body.locator('.cap').first().textContent()), '添加后 9 个节点')
      ok((await body.locator('.pill', { hasText: 'depth 2' }).count()) >= 1, '有 depth 2 的节点')
    }
  }
]
