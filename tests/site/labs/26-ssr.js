// 第 26 章的实验台测试数据。格式见 02-template.js。
module.exports = [
  {
    id: 'demo-ssr', name: '放入服务器 HTML 后按钮没反应；水合后点按钮计数增加；文字不匹配时 Vue 把文字改成客户端的', pick: 1,
    async run(p, body, ok) {
      await body.getByRole('button', { name: '1. 放入服务器 HTML' }).waitFor()
      await body.getByRole('button', { name: '1. 放入服务器 HTML' }).click()
      const btn = body.locator('.box button')
      await btn.click()
      ok((await btn.textContent()) === '点击 0', '水合前点击没有反应')
      await body.getByRole('button', { name: '2. 水合' }).click()
      ok(/水合完成/.test(await body.locator('.domview').textContent()), '报告显示水合完成')
      await btn.click()
      ok((await btn.textContent()) === '点击 1', '水合后点击计数增加')
      await body.locator('select.t').selectOption({ index: 1 })
      ok(/服务器上的旧标题/.test(await body.locator('.box').textContent()), '选“文字不匹配”后容器里是服务器的旧标题')
      await body.getByRole('button', { name: '2. 水合' }).click()
      ok(/你好，水合/.test(await body.locator('.box h3').textContent()), '水合后标题被改成客户端的“你好，水合”')
      ok(/Vue 报告了不匹配/.test(await body.locator('.domview').textContent()), '报告里有“Vue 报告了不匹配”')
    }
  }
]
