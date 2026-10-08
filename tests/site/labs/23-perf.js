// 第 23 章的实验台测试数据。格式见 tests/site/exercises.test.js 的 loadLabs。
module.exports = [
  {
    id: 'demo-vlist', name: '虚拟列表 DOM 行数很少，切换到全量后有 10000 行', pick: 0,
    async run(p, body, ok) {
      await body.locator('.vl').waitFor()
      const n = await body.locator('.vrow').count()
      ok(n > 0 && n < 60, '虚拟列表只渲染少量行（' + n + '）')
      await body.getByRole('button', { name: /全量渲染/ }).click()
      await p.waitForFunction(() => document.querySelectorAll('#demo-vlist .vrow').length === 10000, null, { timeout: 30000 })
      ok(true, '全量模式渲染了 10000 行')
      ok(/\d+ ms/.test(await body.locator('.kv').textContent()), '显示了切换耗时')
    }
  },
  {
    id: 'demo-stable', name: '输入文字后：稳定引用一侧更新 0 次，每次新对象一侧更新 50 次', pick: 1,
    async run(p, body, ok) {
      await body.locator('input.t').waitFor()
      await body.locator('input.t').pressSequentially('a')
      await p.waitForTimeout(200)
      const bs = await body.locator('.box b').allTextContents()
      ok(bs[0] === '0', '稳定引用一侧更新 0 次（' + bs[0] + '）')
      ok(bs[1] === '50', '每次新对象一侧更新 50 次（' + bs[1] + '）')
      await body.getByRole('button', { name: '计数归零' }).click()
      const b2 = await body.locator('.box b').allTextContents()
      ok(b2[0] === '0' && b2[1] === '0', '计数归零')
    }
  },
  {
    id: 'demo-memo', name: '选中一行后显示“已选中”，并出现耗时记录', pick: 2,
    async run(p, body, ok) {
      await body.locator('.vl').waitFor()
      ok(await body.locator('.vrow').count() === 5000, '共 5000 行')
      await body.getByRole('button', { name: /随机选中/ }).click()
      await p.waitForFunction(() => /ms（1 次平均）/.test(document.querySelector('#demo-memo .kv').textContent), null, { timeout: 15000 })
      ok(await body.locator('.vrow', { hasText: '已选中' }).count() === 1, '恰有一行已选中')
      await body.getByRole('button', { name: '不使用 v-memo' }).click()
      await body.getByRole('button', { name: /随机选中/ }).click()
      await p.waitForFunction(() => /ms（1 次平均）/.test(document.querySelector('#demo-memo .kv dd:nth-of-type(2)').textContent), null, { timeout: 15000 })
      ok(true, '不使用 v-memo 也有耗时记录')
    }
  }
]
