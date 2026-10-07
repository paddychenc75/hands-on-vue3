// 第 25 章的实验台测试数据。格式见 tests/site/exercises.test.js 的 loadLabs。
module.exports = [
  {
    id: 'demo-mig-counter', name: '两个计数器初始 count = 5；点 +1 变 6；重新挂载后回到新的 start', pick: 0,
    async run(p, body, ok) {
      await body.locator('.log').waitFor()
      const boxes = body.locator('.box')
      ok(/count = 5/.test(await boxes.nth(0).textContent()) && /count = 5/.test(await boxes.nth(1).textContent()), '初始两个 count 都是 5')
      await boxes.nth(0).getByRole('button', { name: '+1' }).click()
      await boxes.nth(1).getByRole('button', { name: '+1' }).click()
      await p.waitForTimeout(100)
      ok(/count = 6.*double = 12/.test(await boxes.nth(0).textContent()), '选项式 +1 后 count = 6，double = 12')
      ok(/count = 6.*double = 12/.test(await boxes.nth(1).textContent()), '组合式 +1 后 count = 6，double = 12')
      const log = await body.locator('.log').textContent()
      ok(/选项式：watch 发出 change\(6\)/.test(log) && /组合式：watch 发出 change\(6\)/.test(log), '日志有两条 change(6)')
      ok(/选项式：mounted\(\)/.test(log) && /组合式：onMounted/.test(log), '日志有两个 mounted 记录')
      await body.locator('input[type=number]').fill('10')
      await body.getByRole('button', { name: '重新挂载' }).click()
      await p.waitForTimeout(100)
      ok(/count = 10/.test(await boxes.nth(0).textContent()) && /count = 10/.test(await boxes.nth(1).textContent()), '重新挂载后两个 count 都是 10')
    }
  }
]
