// 第 28 章的实验台测试数据。格式见 tests/site/labs/02-template.js
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
  },
  {
    id: 'demo-renderer-calls', name: '挂载时先 insert 子节点再 insert 父节点；列表移动只有一次 insert；卸载只 remove 根；Teleport 调用 querySelector', pick: 1,
    async run(p, body, ok) {
      await body.locator('.calls-log .calls-line').first().waitFor()
      const lines = async () => (await body.locator('.calls-log').textContent())
      let t = await lines()
      ok(/insert\(<span>, <div>, null\)/.test(t) && t.indexOf('insert(<span>, <div>') < t.indexOf('insert(<div>, <root>'), '挂载：span 先放进 div，div 最后放进 root')
      await body.getByRole('button', { name: '列表：把 c 移到最前' }).click()
      await p.waitForTimeout(200)
      t = await lines()
      ok((t.match(/insert\(/g) || []).length === 1 && !/createElement/.test(t), '移动 c：只有一次 insert，没有 createElement')
      await body.getByRole('button', { name: '卸载' }).click()
      await p.waitForTimeout(200)
      t = await lines()
      ok((t.match(/remove\(/g) || []).length === 1 && /remove\(<div>\)/.test(t), '卸载：只对根 div 调用一次 remove')
      await body.getByRole('button', { name: 'Teleport 到选择器' }).click()
      await p.waitForTimeout(200)
      ok(/querySelector\(#modal\)/.test(await lines()), 'Teleport 到字符串目标时调用 querySelector')
      await body.getByRole('button', { name: '组件重新渲染' }).click()
      await p.waitForTimeout(200)
      t = await lines()
      ok(/parentNode\(/.test(t) && /nextSibling\(/.test(t) && /setText\(/.test(t), '组件重新渲染：先 parentNode、nextSibling，再 setText')
    }
  },
  {
    id: 'demo-patchprop', name: 'img width 走 attribute；div tabindex 走 attribute 而 tabIndex 走 DOM 属性；.foo 只设属性', pick: 2,
    async run(p, body, ok) {
      const out = () => body.locator('.pp-out').textContent()
      await body.getByRole('button', { name: 'img width' }).click()
      let t = await out()
      ok(/走的路：attribute/.test(t) && /width="50%"/.test(t), 'img width：走 attribute，输出里是 width="50%"')
      await body.getByRole('button', { name: 'div tabindex', exact: true }).click()
      ok(/走的路：attribute/.test(await out()), 'tabindex（小写）走 attribute')
      await body.getByRole('button', { name: 'div tabIndex', exact: true }).click()
      ok(/走的路：DOM 属性/.test(await out()), 'tabIndex 走 DOM 属性')
      await body.getByRole('button', { name: 'div .foo（.prop）' }).click()
      t = await out()
      ok(/走的路：DOM 属性/.test(t) && !/foo=/.test(t.split('\n')[1]), '.foo：只设 DOM 属性，元素上没有 foo attribute')
      await body.getByRole('button', { name: 'input value' }).click()
      ok(/DOM 属性 \+ attribute/.test(await out()), 'input value：DOM 属性并同步到 attribute')
    }
  }
]
