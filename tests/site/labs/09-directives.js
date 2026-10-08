// 第 9 章的实验台测试数据。
module.exports = [
  {
    id: 'demo-dir-play', name: '勾选 .bold 后日志出现 beforeUpdate 和 updated，binding 含 bold: true', pick: 0,
    async run(p, body, ok) {
      await body.locator('.log').waitFor()
      await p.waitForTimeout(100)
      const logs = async () => (await body.locator('.log > div').allTextContents()).join('\n')
      ok(/mounted/.test(await logs()), '初始日志有 mounted')
      await body.locator('label.ctl', { hasText: '.bold' }).locator('input').check()
      await p.waitForTimeout(150)
      ok(/beforeUpdate/.test(await logs()) && /updated/.test(await logs()), '勾选后日志有 beforeUpdate 和 updated')
      ok(/"bold":true/.test(await body.locator('.domview').textContent()), 'binding.modifiers 含 bold: true')
      await body.getByRole('button', { name: '卸载元素' }).click()
      await p.waitForTimeout(100)
      ok(/unmounted/.test(await logs()), '卸载后日志有 unmounted')
    }
  },
  {
    id: 'demo-dir-outside', name: '关闭“卸载时删除监听”后卸载组件，泄漏数为 1', pick: 0,
    async run(p, body, ok) {
      await body.locator('.log').waitFor()
      await p.waitForTimeout(100)
      await body.locator('label.ctl', { hasText: '卸载时删除监听' }).locator('input').uncheck()
      await body.getByRole('button', { name: /卸载组件/ }).click()
      await p.waitForTimeout(150)
      ok(/泄漏 1/.test(await body.locator('.pill').textContent()), '泄漏 1 个')
      await body.getByRole('button', { name: '删除泄漏的监听' }).click()
      await p.waitForTimeout(100)
      ok(/泄漏 0/.test(await body.locator('.pill').textContent()), '清理后泄漏 0 个')
    }
  }
]
