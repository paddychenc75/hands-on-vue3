// 第 14 章的实验台测试数据。
module.exports = [
  {
    id: 'demo-render-tree', name: '两边 HTML 完全相同；添加子节点后仍相同；能看到模板的编译结果', pick: 0,
    async run(p, body, ok) {
      await body.getByText('完全相同').waitFor()
      ok(/完全相同/.test(await body.textContent()), '初始两边生成的 HTML 完全相同')
      const before = await body.locator('.box').first().locator('h2, h3, h4, h5').count()
      for (let i = 0; i < 3; i++) await body.getByRole('button', { name: '随机添加子节点' }).click()
      await p.waitForTimeout(200)
      const after = await body.locator('.box').first().locator('h2, h3, h4, h5, h6').count()
      ok(after === before + 3, '添加 3 个子节点后标题数 +3（' + before + ' → ' + after + '）')
      ok(/完全相同/.test(await body.textContent()), '添加子节点后两边仍然相同')
      await body.getByRole('button', { name: '修改第一个标题' }).click()
      await p.waitForTimeout(100)
      ok(/响应式（已修改）/.test(await body.locator('.box').nth(1).textContent()), 'h() 版本跟着改了标题')
      await body.locator('.tabs button', { hasText: '模板代码' }).click()
      ok(/v-for="n in nodes"/.test(await body.locator('pre.code').textContent()), '模板代码标签页显示 TPL')
      await body.getByRole('button', { name: '查看模板的编译结果' }).click()
      await p.waitForTimeout(500)
      ok(/openBlock/.test(await body.locator('.domview').last().textContent()), '编译结果里有 openBlock')
    }
  }
]
