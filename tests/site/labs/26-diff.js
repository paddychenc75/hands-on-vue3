// 第 26 章的实验台测试数据。
module.exports = [
  {
    id: 'lab-diff', name: '经典例子：运行全部后只移动 1 个节点（e），新建 h；改输入后回到第 0 步', pick: 0,
    async run(p, body, ok) {
      await body.locator('.kbox').first().waitFor()
      await body.getByRole('button', { name: '运行全部' }).click()
      const info = await body.locator('dl.kv').textContent()
      ok(/移动 1 · 新建 1 · 删除 0/.test(info), '操作总计：移动 1 · 新建 1 · 删除 0（' + info.replace(/\s+/g, ' ').slice(-40) + '）')
      ok(await body.locator('.kbox.move').count() >= 1, '有橙色移动节点')
      ok(/稳定节点 c d/.test(info), 'LIS 稳定节点是 c d')
      await body.locator('select.t').selectOption({ label: '列表反转' })
      ok(/第 0 \//.test(await body.textContent()), '换示例后回到第 0 步')
      await body.getByRole('button', { name: '下一步' }).click()
      ok(/第 1 \//.test(await body.textContent()), '点下一步后到第 1 步')
      await body.locator('#dfOld').fill('a a')
      ok(/key 必须唯一/.test(await body.textContent()), '重复 key 提示错误')
    }
  }
]
