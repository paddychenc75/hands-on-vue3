// 第 5 章的实验台测试数据。格式见 course/AUTHORING.md 第 8 节。
module.exports = [
  {
    id: 'demo-todo-app', name: '在“未完成”下勾选一条，它立刻消失，还剩数量减 1；双击编辑，Esc 取消', pick: 2,
    async run(p, body, ok) {
      await body.locator('.todo-lab').waitFor()
      const items = () => body.locator('.list li:not(.empty)')
      ok(await items().count() === 3, '一开始 3 条事项')
      ok(/还剩 2 项/.test(await body.locator('.left').textContent()), '还剩 2 项')
      await body.locator('.filters button', { hasText: '未完成' }).click()
      ok(await items().count() === 2, '“未完成”下 2 条')
      await items().first().locator('input[type=checkbox]').click()
      ok(await items().count() === 1, '勾选一条后，它从“未完成”列表消失')
      ok(/还剩 1 项/.test(await body.locator('.left').textContent()), '还剩 1 项')
      ok(/visible：1 条/.test(await body.textContent()), '派生的 visible 同步变化')
      await body.locator('.filters button', { hasText: '全部' }).click()
      ok(await items().count() === 3, '切回“全部”，三条都在')
      await body.locator('.text').first().dblclick()
      await body.locator('.edit').fill('改一改')
      await body.locator('.edit').press('Escape')
      ok(await body.locator('.edit').count() === 0 && /读完第 4 章/.test(await items().first().textContent()), 'Esc 取消编辑，原文字不变')
    }
  }
]
