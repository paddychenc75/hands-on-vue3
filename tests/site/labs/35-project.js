// 第 35 章的实验台测试数据。
module.exports = [
  {
    id: 'demo-project', name: '第 3 步：选“进行中”并勾选“完成练习”，该项消失且还剩 1 项；第 5 步显示保存提示', pick: 2,
    async run(p, body, ok) {
      await body.locator('.stepper button').first().waitFor()
      ok((await body.locator('.stepper button').count()) === 5, '有 5 个步骤按钮')
      await body.locator('.stepper button').nth(2).click()
      const board = body.locator('.box.kanban')
      ok(/还剩 2 项 · 共 3 项/.test(await board.textContent()), '第 3 步：还剩 2 项 · 共 3 项')
      await body.locator('.tabs button', { hasText: '进行中' }).click()
      await board.locator('.task', { hasText: '完成练习' }).locator('input[type=checkbox]').click() // 点完该项就从“进行中”里消失，不能用 check()（它会等勾选状态）
      await p.waitForTimeout(100)
      ok((await board.locator('.task', { hasText: '完成练习' }).count()) === 0, '“完成练习”从列表消失')
      ok(/还剩 1 项/.test(await board.textContent()), '还剩 1 项')
      await body.locator('.stepper button').nth(3).click()
      ok(/<TaskItem>/.test(await board.textContent()), '第 4 步用 TaskItem 组件显示（虚线框标签）')
      await body.locator('.stepper button').nth(4).click()
      await body.locator('input[aria-label="新任务"]').fill('测试项')
      await body.locator('input[aria-label="新任务"]').press('Enter')
      await p.waitForTimeout(100)
      ok(/数据已保存到 localStorage/.test(await board.textContent()), '第 5 步：添加后显示已保存')
      await body.getByRole('button', { name: '恢复示例数据' }).click()
      ok(/共 3 项/.test(await board.textContent()), '恢复示例数据后回到 3 项')
    }
  }
]
