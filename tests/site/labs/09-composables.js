// 第 9 章的实验台测试数据。格式见 tests/site/exercises.test.js 的 loadLabs。
module.exports = [
  {
    id: 'demo-compose', name: 'useDebounced：输入后 500ms 才更新；useMouse 跟踪指针', pick: 0,
    async run(p, body, ok) {
      const inp = body.locator('input.t')
      await inp.waitFor()
      await inp.fill('abc')
      await p.waitForTimeout(100)
      let txt = await body.locator('.kv').textContent()
      ok(/text\s*abc/.test(txt) && /debounced\s*—/.test(txt), '刚输入时 debounced 还没变')
      await p.waitForTimeout(700)
      txt = await body.locator('.kv').textContent()
      ok(/debounced\s*abc/.test(txt), '停止输入 0.5 秒后 debounced 变成 abc')
      await body.locator('.pad').scrollIntoViewIfNeeded()
      const box = await body.locator('.pad').boundingBox()
      await p.mouse.move(box.x + 30, box.y + 40)
      await p.mouse.move(box.x + 50, box.y + 60)
      await p.waitForTimeout(100)
      const xy = await body.locator('.xy').textContent()
      const m = /x (\d+) · y (\d+)/.exec(xy)
      ok(m && Math.abs(+m[1] - 50) <= 2 && Math.abs(+m[2] - 60) <= 2, '指针移到 (50,60) 后显示接近的坐标（' + xy + '）')
    }
  },
  {
    id: 'demo-fetch', name: '快速点击 id 1 到 3：旧请求被取消，最终 data 是 id 3', pick: 0,
    async run(p, body, ok) {
      await body.locator('.kv').waitFor()
      for (const n of ['2', '3']) await body.getByRole('button', { name: n, exact: true }).click()
      await p.waitForTimeout(1800)
      const log = await body.locator('.log').textContent()
      ok(/取消/.test(log), '日志里有取消的请求')
      const txt = await body.locator('.kv').textContent()
      ok(/url\/api\/user\/3/.test(txt) && /"id":3/.test(txt) && /loadingfalse/.test(txt.replace(/\s/g, '')), 'data 和当前 id 3 一致（' + txt.replace(/\s+/g, ' ') + '）')
    }
  }
]
