// 第 24 章的实验台测试数据。
module.exports = [
  {
    id: 'demo-tool-scoped', name: '默认情况：Inner 根元素有 Card 的 data-v 属性；.inner 不生效，:deep 生效；改模板后重新渲染', pick: 0,
    async run(p, body, ok) {
      await body.locator('.pv .card').waitFor()
      const dom = await body.locator('.domview').last().textContent()
      ok(/data-v-7ba5bd90/.test(dom) && /data-v-1d2c3b4a/.test(dom), '渲染出的 DOM 带 Card 和 Inner 的 data-v 属性')
      ok(/data-v-7ba5bd90-s/.test(dom), '插槽内容有 -s 属性')
      const css = await body.locator('.domview').first().textContent()
      ok(/\.title\[data-v-7ba5bd90\]/.test(css), '.title 被改写成 .title[data-v-7ba5bd90]')
      ok(/\[data-v-7ba5bd90\] \.inner/.test(css), ':deep(.inner) 被改写成 [data-v-7ba5bd90] .inner')
      const w = await body.locator('.pv .inner').evaluate(e => getComputedStyle(e).textDecorationLine)
      const fw = await body.locator('.pv .inner').evaluate(e => getComputedStyle(e).fontWeight)
      ok(w === 'underline', ':deep(.inner) 生效（下划线）')
      ok(+fw < 600, '.inner 不生效（不加粗，fontWeight=' + fw + '）')
      await body.locator('textarea').first().fill('<div class="card"><h4 class="title">NEW</h4><slot></slot></div>')
      await p.waitForTimeout(800)
      ok(/NEW/.test(await body.locator('.pv').textContent()), '改模板后重新渲染')
      await body.getByRole('button', { name: '恢复默认' }).click()
      await p.waitForTimeout(800)
      ok(/Card 的标题/.test(await body.locator('.pv').textContent()), '恢复默认后复原')
    }
  },
  {
    id: 'demo-tool-cssvars', name: '拖动 size 滑块后根元素 style 里的变量跟着变', pick: 0,
    async run(p, body, ok) {
      await body.locator('input[type=range]').waitFor()
      ok(/--7ba5bd90-size:\s*18px/.test(await body.locator('.domview').textContent()), '初始 size 变量为 18px')
      await body.locator('input[type=range]').fill('30')
      await p.waitForTimeout(200)
      ok(/--7ba5bd90-size:\s*30px/.test(await body.locator('.domview').textContent()), '拖到 30 后变量为 30px')
      const fs = await body.locator('.demo-tool-cv-title').evaluate(e => getComputedStyle(e).fontSize)
      ok(fs === '30px', '文字大小跟着变为 30px（' + fs + '）')
    }
  }
]
