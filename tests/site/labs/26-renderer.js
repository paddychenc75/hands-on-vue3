// 第 26 章的实验台测试数据。格式见 tests/site/labs/02-template.js
module.exports = [
  {
    id: 'demo-renderer', name: '添加、删除柱子后 nodeOps 日志和对象树随之变化，画布有内容', pick: 0,
    async run(p, body, ok) {
      await body.locator('.domview').waitFor()
      await p.waitForTimeout(300)
      const tree = () => body.locator('.domview').textContent()
      let t = await tree()
      ok(/rect/.test(t) && (t.match(/^\s*rect/gm) || []).length === 4, '初始有 4 根柱子（4 个 rect）')
      ok(/insert\(rect\)/.test(await body.locator('.log').textContent()), '日志里有 insert(rect)')
      const painted = await body.locator('canvas').evaluate(c => {
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
        for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true
        return false
      })
      ok(painted, 'Canvas 上画出了内容')
      await body.getByRole('button', { name: '添加一根柱子' }).click()
      await p.waitForTimeout(200)
      ok(((await tree()).match(/^\s*rect/gm) || []).length === 5, '添加后 5 个 rect')
      await body.getByRole('button', { name: '删除最后一根' }).click()
      await p.waitForTimeout(200)
      ok(((await tree()).match(/^\s*rect/gm) || []).length === 4, '删除后 4 个 rect')
      ok(/remove\(rect\)/.test(await body.locator('.log').textContent()), '日志里有 remove(rect)')
      await body.locator('input[type=range]').fill('100')
      await p.waitForTimeout(200)
      ok(/patchProp\(rect, h: /.test(await body.locator('.log').textContent()), '拖动滑块后有 patchProp 日志')
    }
  }
]
