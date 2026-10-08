// 第 22 章的实验台测试数据。格式见 tests/site/labs/02-template.js
module.exports = [
  {
    id: 'demo-router', name: '未登录访问 /admin 被重定向到登录页，登录后回到 /admin', pick: 0,
    async run(p, body, ok) {
      await body.getByRole('button', { name: '/admin', exact: true }).waitFor()
      await body.getByRole('button', { name: '/task/2', exact: true }).click()
      ok(/任务 2/.test(await body.locator('.view').textContent()) && /完成练习/.test(await body.locator('.view').textContent()), '/task/2 显示任务 2')
      await body.getByRole('button', { name: '/admin', exact: true }).click()
      ok(/登录页/.test(await body.locator('.view').textContent()), '未登录访问 /admin 显示登录页')
      ok(/重定向到 \/login/.test(await body.locator('.log').textContent()), '日志记录了守卫重定向')
      await body.getByRole('button', { name: '一键登录' }).click()
      await p.waitForTimeout(100)
      ok(/管理后台/.test(await body.locator('.view').textContent()), '登录后回到管理后台')
      await body.getByRole('button', { name: '/not/exist' }).click()
      ok(/404/.test(await body.locator('.view').textContent()), '不存在的地址显示 404')
    }
  }
]
