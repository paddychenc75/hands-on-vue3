// 第 11 章的实验台测试数据。格式见 tests/site/labs/02-template.js。
module.exports = [
  {
    id: 'demo-form-reg', name: '空表单提交报错并聚焦；输入 build 后提示已有同名任务', pick: 1,
    async run(p, body, ok) {
      await body.locator('form').waitFor()
      await body.getByRole('button', { name: '保存' }).click()
      await p.waitForTimeout(200)
      ok(/请输入任务/.test(await body.locator('form').textContent()), '空提交显示“请输入任务”')
      ok(await p.evaluate(() => document.activeElement && document.activeElement.id) === 'dfr-text', '焦点落在“任务”输入框')
      await body.locator('#dfr-text').fill('build')
      await p.waitForTimeout(1300)
      ok(/已有同名任务/.test(await body.locator('form').textContent()), 'build 提示已有同名任务')
      ok(/请求服务器/.test(await body.locator('.log').textContent()), '日志里有“请求服务器”')
    }
  }
]
