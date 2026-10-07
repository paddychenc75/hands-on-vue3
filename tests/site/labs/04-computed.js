// 第 4 章的实验台测试数据。格式见 tests/site/labs/02-template.js
module.exports = [
  {
    id: 'demo-computed', name: '点 tick++ 后方法执行 6 次，getter 仍是 1 次', pick: 1,
    async run(p, body, ok) {
      await body.getByRole('button', { name: /tick\+\+/ }).waitFor()
      const counts = async () => (await body.locator('.cap b').allTextContents()).map(Number)
      let c = await counts()
      ok(c[0] === 1 && c[1] === 3, '初始 getter 1 次、方法 3 次（' + c + '）')
      await body.getByRole('button', { name: /tick\+\+/ }).click()
      await p.waitForTimeout(150)
      c = await counts()
      ok(c[0] === 1 && c[1] === 6, '点击后 getter 1 次、方法 6 次（' + c + '）')
    }
  },
  {
    id: 'demo-flush', name: '点 count++ 后 pre 看到旧 DOM，post 看到新 DOM', pick: 0,
    async run(p, body, ok) {
      await body.getByRole('button', { name: 'count++' }).click()
      await p.waitForTimeout(150)
      const txt = await body.locator('.log').textContent()
      ok(/flush: 'sync'\s+count=1\s+DOM=0/.test(txt), 'sync 时 DOM 还是 0')
      ok(/flush: 'pre'\s+count=1\s+DOM=0/.test(txt), 'pre 时 DOM 还是 0')
      ok(/flush: 'post'\s+count=1\s+DOM=1/.test(txt), 'post 时 DOM 已是 1')
    }
  },
  {
    id: 'demo-watch', name: '不用 onCleanup 快速输入，出现旧请求覆盖新结果的警告', pick: 0,
    async run(p, body, ok) {
      await body.locator('label.ctl', { hasText: 'onCleanup' }).locator('input').uncheck()
      const input = body.locator('input.t')
      await input.pressSequentially('abc', { delay: 20 })
      ok(/abc/.test(await body.locator('dl.kv').textContent()), '当前关键词是 abc')
      await p.waitForTimeout(2000)
      const txt = await body.locator('.log').textContent()
      ok(/请求 "a"/.test(txt) && /请求 "abc"/.test(txt), '日志里有多次请求')
      ok(/已作废/.test(txt) === false, '没用 onCleanup 时没有作废记录')
      ok(/最终|结果/.test(txt), '请求都返回了')
    }
  }
]
