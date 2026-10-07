// 第 15 章的实验台测试数据。
module.exports = [
  {
    id: 'demo-compile', name: '选“动态 class + 属性”后 patchFlag 含 10（CLASS | PROPS）；改成错误模板时报编译错误', pick: 1,
    async run(p, body, ok) {
      await body.locator('textarea.t').waitFor()
      await body.locator('pre.code').filter({ hasText: 'render' }).waitFor({ timeout: 10000 })
      ok(/patchFlag：/.test(await body.locator('.cap').first().textContent()) || /没有 patchFlag/.test(await body.textContent()), '默认示例有 patchFlag 汇总一行')
      await body.locator('select.t').selectOption({ label: '动态 class + 属性' })
      await p.waitForTimeout(200)
      ok(/10（CLASS \| PROPS）/.test(await body.textContent()), '动态 class + 属性：出现 10（CLASS | PROPS）')
      await body.locator('textarea.t').fill('<div><p>')
      await p.waitForTimeout(200)
      ok(/编译错误/.test(await body.textContent()), '残缺模板显示编译错误')
    }
  },
  {
    id: 'demo-block', name: '默认示例：根是 Block，dynamicChildren 含 2 个节点；v-if 示例出现子 Block', pick: 2,
    async run(p, body, ok) {
      await body.locator('.domview').first().waitFor()
      await p.waitForFunction(() => /★/.test(document.querySelector('#demo-block .domview')?.textContent || ''), null, { timeout: 10000 })
      const dyn = () => body.locator('.domview').nth(1).textContent()
      let t = await dyn()
      ok(/★ Block 1/.test(t) && (t.match(/→/g) || []).length === 2, '默认示例：根 Block 有 2 个动态后代（' + t.replace(/\n/g, ' / ') + '）')
      await body.locator('select.t').selectOption({ label: 'v-if 创建新 Block' })
      await p.waitForTimeout(300)
      t = await dyn()
      ok(/Block 2/.test(t), 'v-if 示例有多个 Block')
    }
  }
]
