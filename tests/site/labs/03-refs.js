// 第 3 章的实验台测试数据。格式见 02-template.js。
module.exports = [
  {
    id: 'demo-identity', name: '表格里数组元素的 ref 不解包（isRef 为 true），对象属性的 ref 解包为 5', pick: 2,
    async run(p, body, ok) {
      await body.locator('table.t tbody tr').first().waitFor()
      const rows = await body.locator('table.t tbody tr').allTextContents()
      ok(rows.length === 11, '表格有 11 行（实际 ' + rows.length + '）')
      const row = k => rows.find(t => t.startsWith(k)) || ''
      ok(/true/.test(row('isRef(p.list[0])')), 'isRef(p.list[0]) 为 true')
      ok(/^p2\.r5/.test(row('p2.r')), 'p2.r 自动解包为 5（' + row('p2.r') + '）')
      ok(/false/.test(row('readonly(p) === p')), 'readonly(p) === p 为 false')
    }
  },
  {
    id: 'demo-refs', name: '点 state.count++ 三次：解构的 count 停在 0，toRefs 的跟随；shallowRef 点 n++ 不变，triggerRef 后更新', pick: 1,
    async run(p, body, ok) {
      const btn = body.getByRole('button', { name: 'state.count++' })
      await btn.waitFor()
      for (let i = 0; i < 3; i++) await btn.click()
      const kv = await body.locator('dl.kv').textContent()
      ok(/state\.count3/.test(kv), 'state.count 为 3')
      ok(/解构出的 count0/.test(kv), '解构出的 count 停在 0')
      ok(/toRefs 得到的 count3/.test(kv), 'toRefs 得到的 count 为 3')
      const shallowBox = body.locator('.box', { hasText: 'shallowRef({ n })' })
      await shallowBox.getByRole('button', { name: 'shallow.value.n++' }).click()
      await shallowBox.getByRole('button', { name: 'shallow.value.n++' }).click()
      ok((await shallowBox.locator('b').textContent()).trim() === '0', 'shallow n++ 后页面仍是 0')
      await shallowBox.getByRole('button', { name: 'triggerRef' }).click()
      ok((await shallowBox.locator('b').textContent()).trim() === '2', 'triggerRef 后页面更新为 2')
      const deepBox = body.locator('.box', { hasText: 'ref({ n })' }).first()
      await deepBox.getByRole('button', { name: 'deep.value.n++' }).click()
      ok((await deepBox.locator('b').textContent()).trim() === '1', 'deep n++ 页面立即变 1')
    }
  }
]
