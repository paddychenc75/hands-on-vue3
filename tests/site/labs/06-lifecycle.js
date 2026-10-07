// 第 6 章的实验台测试数据。格式见 02-template.js。
module.exports = [
  {
    id: 'demo-tref', name: '日志记录 setup 时 inp 为 null、onMounted 时是 input；父组件读不到未暴露的 showInput', pick: 0,
    async run(p, body, ok) {
      await body.locator('.log > div').first().waitFor()
      let log = await body.locator('.log').textContent()
      ok(/setup：inp\.value = null/.test(log), 'setup 时 inp.value = null')
      ok(/onMounted：inp\.value = <input>/.test(log), 'onMounted 时 inp.value = <input>')
      await body.getByRole('button', { name: '读取 child.value' }).click()
      log = await body.locator('.log').textContent()
      ok(/typeof child\.value\.focus = function，child\.value\.showInput = undefined/.test(log), '只暴露了 focus')
      await body.getByRole('button', { name: '卸载 Child' }).click()
      log = await body.locator('.log').textContent()
      ok(/onUnmounted：inp\.value = null，局部变量 node = <input>/.test(log), '卸载后 inp 为 null，局部变量 node 仍指向 input')
    }
  },
  {
    id: 'demo-life', name: '卸载再挂载：日志出现 onBeforeUnmount、onUnmounted、setup、onMounted；KeepAlive 下切换出现 onDeactivated', pick: 0,
    async run(p, body, ok) {
      await body.locator('.hook-grid .hook').first().waitFor()
      ok((await body.locator('.hook-grid .hook').count()) === 9, '有 9 个钩子格')
      await body.getByRole('button', { name: /卸载 Child/ }).click()
      let log = await body.locator('.log').textContent()
      ok(/Child onBeforeUnmount/.test(log) && /Child onUnmounted/.test(log), '卸载时触发 onBeforeUnmount 和 onUnmounted')
      await body.getByRole('button', { name: '挂载 Child' }).click()
      log = await body.locator('.log').textContent()
      ok(/Child setup/.test(log) && /Child onMounted/.test(log), '再挂载时触发 setup 和 onMounted')
      await body.getByRole('button', { name: '清空日志' }).click()
      await body.getByRole('button', { name: '更新 prop n++' }).click()
      log = await body.locator('.log').textContent()
      ok(/onBeforeUpdate/.test(log) && /onUpdated/.test(log), 'prop 更新触发 onBeforeUpdate 和 onUpdated')
      await body.locator('label.ctl', { hasText: 'KeepAlive' }).locator('input').check()
      await body.getByRole('button', { name: /卸载 Child/ }).click()
      log = await body.locator('.log').textContent()
      ok(/onDeactivated/.test(log), 'KeepAlive 下切换触发 onDeactivated')
    }
  }
]
