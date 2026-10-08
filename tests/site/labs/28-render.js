// 第 28 章的实验台测试数据。
module.exports = [
  {
    id: 'demo-render-tree', name: '两边 HTML 完全相同；添加子节点后仍相同；能看到模板的编译结果', pick: 0,
    async run(p, body, ok) {
      await body.getByText('完全相同').waitFor()
      ok(/完全相同/.test(await body.textContent()), '初始两边生成的 HTML 完全相同')
      const before = await body.locator('.box').first().locator('h2, h3, h4, h5').count()
      for (let i = 0; i < 3; i++) await body.getByRole('button', { name: '随机添加子节点' }).click()
      await p.waitForTimeout(200)
      const after = await body.locator('.box').first().locator('h2, h3, h4, h5, h6').count()
      ok(after === before + 3, '添加 3 个子节点后标题数 +3（' + before + ' → ' + after + '）')
      ok(/完全相同/.test(await body.textContent()), '添加子节点后两边仍然相同')
      await body.getByRole('button', { name: '修改第一个标题' }).click()
      await p.waitForTimeout(100)
      ok(/响应式（已修改）/.test(await body.locator('.box').nth(1).textContent()), 'h() 版本跟着改了标题')
      await body.locator('.tabs button', { hasText: '模板代码' }).click()
      ok(/v-for="n in nodes"/.test(await body.locator('pre.code').textContent()), '模板代码标签页显示 TPL')
      await body.getByRole('button', { name: '查看模板的编译结果' }).click()
      await p.waitForTimeout(500)
      ok(/openBlock/.test(await body.locator('.domview').last().textContent()), '编译结果里有 openBlock')
    }
  },
  {
    id: 'demo-vnode-inspector', name: '预设调用的 shapeFlag:组件加函数子节点是 36,数组子节点是 20,Teleport 是 80;改输入框能重新计算', pick: 2,
    async run(p, body, ok) {
      const flag = async () => (await body.locator('[data-test=flag]').textContent()).trim().split('(')[0]
      ok(await flag() === '36', '初始预设 h(Comp, null, () => \'x\') 的 shapeFlag 是 36(当前 ' + await flag() + ')')
      ok(/default/.test(await body.locator('[data-test=children]').textContent()), '函数子节点被包成插槽对象,键里有 default')
      await body.getByRole('button', { name: "h(Comp, null, [h('b')])", exact: true }).click()
      ok(await flag() === '20', '组件加数组子节点是 20(当前 ' + await flag() + ')')
      await body.getByRole('button', { name: "h(Teleport, { to: 'body' }, [h('p')])", exact: true }).click()
      ok(await flag() === '80', 'Teleport 加数组子节点是 80(当前 ' + await flag() + ')')
      await body.locator('[data-test=code]').fill("h('div', null, 'a', 'b')")
      ok(await flag() === '17', '三个以上参数收成数组:17(当前 ' + await flag() + ')')
      await body.locator('[data-test=code]').fill("h('div', ")
      ok(await body.locator('[data-test=error]').count() === 1, '语法错误时显示错误信息')
    }
  }
]
