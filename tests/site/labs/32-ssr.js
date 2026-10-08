// 第 32 章的实验台测试数据。格式见 02-template.js。
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
  },
  {
    id: 'demo-ssr-matrix', name: '9 种差异里，class、style、静态属性保留服务器的值，:title、:data-x、文字、子节点被修正，标签不同时元素被替换', pick: 1,
    async run(p, body, ok) {
      await body.locator('table.matrix tbody tr').first().waitFor()
      const rows = await body.locator('table.matrix tbody tr').allTextContents()
      ok(rows.length === 9, '表里有 9 行（当前 ' + rows.length + '）')
      const row = name => rows.find(r => r.startsWith(name)) || ''
      ok(/保留服务器的值/.test(row('class')), 'class 保留服务器的值')
      ok(/保留服务器的值/.test(row('style')), 'style 保留服务器的值')
      ok(/保留服务器的值/.test(row('静态属性')), '静态属性保留服务器的值')
      ok(/改成了客户端的值/.test(row('绑定属性 :title')), ':title 被改成客户端的值')
      ok(/改成了客户端的值/.test(row('绑定属性 :data-x')), ':data-x 被改成客户端的值')
      ok(/改成了客户端的值/.test(row('文字')), '文字被改成客户端的值')
      ok(/改成了客户端的值/.test(row('多一个子节点')) && /改成了客户端的值/.test(row('少一个子节点')), '多一个或少一个子节点都被修正')
      ok(/元素被替换/.test(row('标签不同')), '标签不同时元素被替换')
      await body.getByRole('button', { name: '重新水合全部 9 种情况' }).click()
      ok((await body.locator('table.matrix tbody tr').count()) === 9, '重新水合后仍是 9 行')
    }
  }
]
