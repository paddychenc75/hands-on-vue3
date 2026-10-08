// 第 24 章的实验台测试数据。
module.exports = [
  {
    id: 'lab-rx', name: '取消 showDiscount 后改 discount，「优惠提示」不再运行；总价 20', pick: 1,
    async run(p, body, ok) {
      await body.locator('.bucket .ln').first().waitFor()
      const pills = async () => (await body.locator('.pill').allTextContents()).map(t => +t.replace(/\D/g, ''))
      ok((await pills()).join() === '1,1', '初始两个 effect 各运行 1 次')
      ok(/→ 20/.test(await body.locator('.box').first().textContent()), '初始总价 20')
      ok(/Set\(0\)/.test(await body.locator('.bucket').textContent()) === false, '初始四个属性都有依赖')
      await body.locator('#rxPrice').fill('20')
      await p.waitForTimeout(100)
      ok((await pills()).join() === '2,2', '改 price 后两个 effect 都运行（2,2）')
      await body.locator('#rxShow').uncheck()
      await p.waitForTimeout(100)
      ok((await pills()).join() === '2,3', '取消 showDiscount 后只有「优惠提示」运行（2,3）')
      ok(/Set\(0\) 无依赖/.test(await body.locator('.bucket').textContent()), 'discount 不再有依赖')
      await body.locator('#rxDisc').fill('0.5')
      await p.waitForTimeout(100)
      ok((await pills()).join() === '2,3', '改 discount 后没有 effect 运行（仍是 2,3）')
      ok(/无人依赖/.test(await body.locator('.log').textContent()), '日志显示“无人依赖”')
    }
  },
  {
    id: 'lab-depgraph', name: 'n+2 时 parity 重新计算但版本不变、渲染 A 被通知不运行；n+1 后 parity 版本加 1（1 到 2）；切换 tab 后渲染 B 的依赖链改读 m；相同的值什么都不触发', pick: 1,
    async run(p, body, ok) {
      await body.locator('#dgDeps tbody tr').first().waitFor()
      const rows = async sel => (await body.locator(sel + ' tbody tr').evaluateAll(trs => trs.map(tr => [...tr.children].map(td => td.textContent.trim()))))
      const deps = async () => Object.fromEntries((await rows('#dgDeps')).map(r => [r[0], { v: +r[1], subs: r[2] }]))
      const subs = async () => Object.fromEntries((await rows('#dgSubs')).map(r => [r[0].replace(/(计算|运行)$/, ''), { chain: r[1], times: +r[2] }]))
      const last = async () => (await body.locator('#dgLast').textContent())
      const click = async name => { await body.getByRole('button', { name, exact: true }).click(); await p.waitForTimeout(50) }
      // 初始
      let d = await deps(), s = await subs()
      ok(d.n.v === 0 && d.n.subs === 'parity、渲染 B', 'n 的订阅者是 parity 和渲染 B（' + JSON.stringify(d.n) + '）')
      ok(d.m.subs === '（无）', 'tab 为 true 时，m 没有订阅者')
      ok(s['渲染 B'].chain === 'tab v0 → n v0', '渲染 B 的依赖链是 tab → n（' + s['渲染 B'].chain + '）')
      ok(s['渲染 A'].times === 1 && s['渲染 B'].times === 1 && s.parity.times === 1, '三个订阅者各运行或计算 1 次')
      // n + 2：奇数变奇数
      await click('n + 2')
      d = await deps(); s = await subs()
      const t1 = await last()
      ok(/n 0 → 1/.test(t1), 'n 的 version 0 → 1（' + t1.replace(/\s+/g, ' ') + '）')
      ok(/被通知\s*parity、渲染 A、渲染 B/.test(t1), 'parity、渲染 A、渲染 B 都被通知')
      ok(/重新计算\s*parity/.test(t1), 'parity 重新计算')
      ok(/重新运行\s*渲染 B/.test(t1) && !/重新运行\s*渲染 A/.test(t1), '只有渲染 B 重新运行，渲染 A 没有')
      ok(d.parity.v === 1 && s['渲染 A'].times === 1, 'parity 的值没变：version 仍是 1（首次计算时加到 1），渲染 A 仍是 1 次')
      // n + 1：奇数变偶数
      await click('n + 1')
      d = await deps(); s = await subs()
      ok(d.parity.v === 2 && s['渲染 A'].times === 2, 'parity 的值变了：version 加到 2，渲染 A 运行第 2 次')
      // 切换 tab
      await click('切换 tab')
      d = await deps(); s = await subs()
      ok(s['渲染 B'].chain.startsWith('tab v1 → m'), '渲染 B 的依赖链改成 tab → m（' + s['渲染 B'].chain + '）')
      ok(d.n.subs === 'parity' && d.m.subs === '渲染 B', 'n 的订阅者里不再有渲染 B；m 的订阅者是渲染 B')
      // 相同的值
      await click('n 设成相同的值')
      const t2 = await last()
      ok(/version 变了\s*（没有）/.test(t2) && /被通知\s*（没有）/.test(t2), '设成相同的值：没有 version 变化，也没有人被通知')
    }
  }
]
