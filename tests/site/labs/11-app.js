// 第 11 章的实验台测试数据。格式见 tests/site/labs/02-template.js
module.exports = [
  {
    id: 'demo-app-plugin', name: '插件安装日志、$t 切换语言、事件中抛错被 ErrorBoundary 捕获', pick: 2,
    async run(p, body, ok) {
      await body.getByRole('button', { name: /切换语言/ }).waitFor()
      const log = () => body.locator('.log').textContent()
      ok(/app\.use\(I18n/.test(await log()) && /app\.use\(Toast/.test(await log()), '日志里有两个插件的 install')
      ok(/你好/.test(await body.textContent()), '$t 显示中文“你好”')
      await body.getByRole('button', { name: /切换语言/ }).click()
      await p.waitForTimeout(100)
      ok(/Hello/.test(await body.textContent()), '切换语言后 $t 显示 Hello')
      await body.getByRole('button', { name: '保存', exact: true }).click()
      await p.waitForTimeout(100)
      ok(/Saved/.test(await body.locator('.pill.g').first().textContent()), 'toast 显示 Saved')
      await body.getByRole('button', { name: '事件中抛错' }).click()
      await p.waitForTimeout(150)
      const t = await log()
      ok(/ErrorBoundary 的 errorCaptured：点击处理失败/.test(t), 'ErrorBoundary 捕获了事件中的错误')
      ok(/备用内容/.test(await body.textContent()), '显示备用内容')
      await body.getByRole('button', { name: '重试' }).click()
      await p.waitForTimeout(100)
      ok(/Bomb 组件/.test(await body.textContent()), '重试后 Bomb 重新挂载')
    }
  }
]
