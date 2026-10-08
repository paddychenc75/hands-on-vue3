// 第 16 章的实验台测试数据。格式见 tests/site/exercises.test.js 的 loadLabs。
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
  },
  {
    id: 'demo-pinia-trace', name: '真实 Pinia：同一个 tick 内的直接赋值只通知一次，$patch 通知一次，失败的 action 触发 onError', pick: 1,
    async run(p, body, ok) {
      await body.getByRole('button', { name: '连续直接赋值 3 次' }).waitFor()
      await body.getByRole('button', { name: '连续直接赋值 3 次' }).click()
      await p.waitForTimeout(100)
      const subLines = async () => (await body.locator('.log div').allTextContents()).filter(t => t.includes('$subscribe'))
      let lines = await subLines()
      ok(lines.length === 1 && /type = direct/.test(lines[0]) && /count = 2/.test(lines[0]), '3 次直接赋值只通知 1 次，type 是 direct，state 已是最终值（' + lines.join('|') + '）')
      await body.getByRole('button', { name: '$patch(对象)' }).click()
      await p.waitForTimeout(100)
      lines = await subLines()
      ok(lines.length === 2 && /patch object/.test(lines[0]), '$patch(对象) 通知 1 次，类型是 patch object')
      await body.getByRole('button', { name: '$patch(函数)' }).click()
      await p.waitForTimeout(100)
      ok(/patch function/.test((await subLines())[0]), '$patch(函数) 的类型是 patch function')
      await body.getByRole('button', { name: 'save(失败)' }).click()
      await p.waitForTimeout(200)
      const text = await body.locator('.log').textContent()
      ok(/onError：save 失败，服务器拒绝了/.test(text) && /调用方的 try\/catch 也收到了这个错误/.test(text), 'action 失败时 onError 触发，调用方也收到错误')
      await body.getByRole('button', { name: 'save(成功)' }).click()
      await p.waitForTimeout(200)
      ok(/after：save 成功，返回 /.test(await body.locator('.log').textContent()), 'action 成功时 after 收到返回值')
    }
  }
]
