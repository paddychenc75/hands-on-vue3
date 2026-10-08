// 第 13 章的实验台测试数据。格式见 course/AUTHORING.md 第 8 节。
module.exports = [
  {
    id: 'demo-board-app', name: '改日期后卡片在列内立即重排；新建弹窗在 body 下且自动聚焦；空标题报错；保存后出现新卡片；删除有过渡', pick: 1,
    async run(p, body, ok) {
      await body.locator('.board-lab').waitFor()
      const titles = async col => (await body.locator('.col-' + col + ' .card .title').allTextContents()).map(s => s.trim())
      ok((await titles('todo')).join() === '加列表过渡,做任务表单', '待办列：有日期的在前，没有日期的在后')
      await body.locator('.card', { hasText: '做任务表单' }).locator('.due').fill('2026-06-01')
      ok((await titles('todo')).join() === '做任务表单,加列表过渡', '给“做任务表单”填更早的日期后，它立刻排到最前')
      await body.locator('.card', { hasText: '做任务表单' }).locator('button.move', { hasText: '进行中' }).click()
      await p.waitForTimeout(400)
      ok((await titles('doing')).join() === '做任务表单,写 useTasks', '移到进行中后按日期排在“写 useTasks”前面')
      ok(/还剩 3 项/.test(await body.locator('.left').textContent()), '还剩 3 项')
      await body.locator('button.new').click()
      const mask = p.locator('.modal-mask')
      await mask.waitFor()
      ok(await mask.evaluate(e => e.parentElement === document.body), '弹窗被 Teleport 到 body 下')
      ok(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('f-title')), '弹窗打开后焦点在标题输入框')
      await mask.locator('.save').click()
      ok(/请输入标题/.test(await mask.textContent()), '空标题提交显示“请输入标题”')
      await mask.locator('.f-title').fill('新增的卡片')
      await mask.locator('.save').click()
      await p.waitForTimeout(400)
      ok(await mask.count() === 0, '保存后弹窗关闭')
      ok((await titles('todo')).includes('新增的卡片'), '新卡片出现在待办列')
      await body.locator('.card', { hasText: '新增的卡片' }).locator('.del').click()
      await p.waitForTimeout(600)
      ok(!(await titles('todo')).includes('新增的卡片'), '删除后卡片消失')
    }
  }
]
