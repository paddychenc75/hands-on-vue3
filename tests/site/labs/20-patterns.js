// 第 20 章的实验台测试数据。
module.exports = [
  {
    id: 'demo-pat-tabs', name: '取消“安全”后日志出现 unregister；Tabs 外的 Tab 报错', pick: 0,
    async run(p, body, ok) {
      await body.locator('.tabs button').first().waitFor()
      ok((await body.locator('.tabs button').allTextContents()).join() === '资料,安全,通知', '三个标签页按顺序注册')
      await body.locator('.tabs button', { hasText: '通知' }).click()
      ok(/小明，你有 3 条新消息/.test(await body.locator('[role=tabpanel]').textContent()), '通知页显示昵称')
      await body.locator('label.ctl', { hasText: '显示“安全”' }).locator('input').uncheck()
      await p.waitForTimeout(100)
      ok(/unregister\("security"\)/.test(await body.locator('.log').textContent()), '日志有 unregister("security")')
      ok((await body.locator('.tabs button').count()) === 2, '标签页剩 2 个')
      await body.locator('label.ctl', { hasText: '在 Tabs 外' }).locator('input').check()
      await p.waitForTimeout(100)
      ok(/Tab 必须放在 Tabs 中/.test(await body.textContent()), 'Tabs 外的 Tab 显示错误')
    }
  },
  {
    id: 'demo-pat-tree', name: '给 src 添加文件后节点数 +1，深度显示正确', pick: 0,
    async run(p, body, ok) {
      await body.locator('.cap').first().waitFor()
      const t0 = await body.locator('.cap').first().textContent()
      ok(/共 8 个节点，最大深度 3/.test(t0), '初始 8 个节点、最大深度 3（' + t0.slice(0, 16) + '）')
      await body.getByRole('button', { name: '添加文件' }).first().click()
      await p.waitForTimeout(100)
      ok(/共 9 个节点/.test(await body.locator('.cap').first().textContent()), '添加后 9 个节点')
      ok((await body.locator('.pill', { hasText: 'depth 2' }).count()) >= 1, '有 depth 2 的节点')
    }
  },
  {
    id: 'demo-pat-listbox', name: '三层的键盘行为一致；受控拒绝樱桃时列表不变；非受控自己保存；焦点留在容器上', pick: 1,
    async run(p, body, ok) {
      const lb = L => body.locator(`[data-layer=${L}] [role=listbox]`)
      const selText = async L => (await body.locator(`[data-layer=${L}] [aria-selected=true]`).allTextContents()).join().replace(/[✓\s\d.]/g, '')
      await lb('L3').waitFor()
      // 非受控：第 1 层横向（左右键），第 2、3 层纵向
      await lb('L1').focus(); await lb('L1').press('ArrowRight'); await lb('L1').press('Enter')
      ok((await selText('L1')) === '香蕉', '非受控第 1 层：焦点后高亮苹果，→ 到香蕉，Enter 选中香蕉（' + (await selText('L1')) + '）')
      await lb('L2').focus(); await lb('L2').press('ArrowDown'); await lb('L2').press('Enter')
      ok((await selText('L2')) === '香蕉', '非受控第 2 层同样选中香蕉（' + (await selText('L2')) + '）')
      await lb('L3').focus(); await lb('L3').press('ArrowDown'); await lb('L3').press('Enter')
      ok((await selText('L3')) === '香蕉', '非受控第 3 层同样选中香蕉（' + (await selText('L3')) + '）')
      ok(/父组件的 parent = （非受控/.test(await body.locator('.cap').first().textContent()), '非受控时父组件的值未使用')
      const log0 = await body.locator('.log').textContent()
      ok(/L3 按 Enter  焦点在 <ul role=listbox>  activedescendant → 香蕉/.test(log0), '日志记录：焦点仍在 ul 上，activedescendant 指向香蕉')
      // 跳过 disabled：从香蕉 ↓ 樱桃 ↓ 葡萄（榴莲是 disabled），End 到葡萄，Home 回苹果
      await lb('L2').press('ArrowDown'); await lb('L2').press('ArrowDown')
      const ad = await lb('L2').getAttribute('aria-activedescendant')
      ok(/葡萄/.test(await body.locator('[id="' + ad + '"]').textContent()), '第 2 层：樱桃之后 ↓ 跳过 disabled 的榴莲，到葡萄')
      await lb('L2').press('Home')
      ok(/苹果/.test(await body.locator('[id="' + (await lb('L2').getAttribute('aria-activedescendant')) + '"]').textContent()), 'Home 回到第一项')
      // 受控且父组件拒绝樱桃
      await body.getByRole('radio', { name: '受控，父组件拒绝樱桃' }).check()
      await lb('L3').focus(); await lb('L3').press('ArrowDown'); await lb('L3').press('ArrowDown'); await lb('L3').press('Enter')
      ok((await selText('L3')) === '', '拒绝模式：第 3 层按 Enter 选樱桃，父组件拒绝，列表没有选中项（' + (await selText('L3')) + '）')
      ok(/父组件拒绝/.test(await body.locator('.log').textContent()), '日志有“父组件拒绝”')
      // 受控：三层共用父组件的值
      await body.getByRole('radio', { name: '受控', exact: true }).check()
      await lb('L3').focus(); await lb('L3').press('ArrowDown'); await lb('L3').press('Enter')
      ok(/banana/.test(await body.locator('[class~=pill]').first().textContent()), '受控：父组件的 parent 变成 banana')
      ok((await selText('L1')) === '香蕉' && (await selText('L2')) === '香蕉' && (await selText('L3')) === '香蕉', '受控：三层都显示父组件的值香蕉')
      await body.getByRole('button', { name: '父组件选苹果' }).click()
      await p.waitForTimeout(50)
      ok((await selText('L1')) === '苹果' && (await selText('L3')) === '苹果', '父组件自己改值，三层跟着变')
    }
  }
]
