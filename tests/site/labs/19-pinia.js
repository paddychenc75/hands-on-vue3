// 第 19 章的实验台测试数据。格式见 tests/site/exercises.test.js 的 loadLabs。
module.exports = [
  {
    id: 'demo-pinia', name: '一个组件添加任务，另一个组件的剩余数同步变化', pick: 0,
    async run(p, body, ok) {
      await body.locator('input.t').waitFor()
      ok(/还剩 2 项/.test(await body.textContent()), '初始还剩 2 项')
      await body.locator('input.t').fill('新任务')
      await body.getByRole('button', { name: '添加' }).click()
      await p.waitForTimeout(100)
      ok(/还剩 3 项/.test(await body.textContent()), '添加后另一个组件显示还剩 3 项')
      ok(/新任务/.test(await body.textContent()), '列表里出现新任务')
      await body.getByRole('button', { name: '清除已完成' }).click()
      await p.waitForTimeout(100)
      ok(/还剩 3 项/.test(await body.textContent()) && !/读完响应式原理/.test(await body.textContent()), '清除已完成后已完成项消失')
    }
  }
]
