// 第 15 章的实验台测试数据。
module.exports = [
  {
    id: 'demo-scope-tree', name: '挂载后 A、B、D 登记在组件 scope 里；卸载后改 src，只有 C 和 E 还在运行；勾选手动停止后 E 也不再运行', pick: 1,
    async run(p, body, ok) {
      const rows = async () => (await body.locator('#st-rows tbody tr').evaluateAll(trs => trs.map(tr => [...tr.children].map(td => td.textContent.trim()))))
      const byLetter = list => Object.fromEntries(list.filter(r => r.length === 4).map(r => [r[0][0], r]))
      await body.locator('#st-mount').click()
      await p.waitForTimeout(800)
      let r = byLetter(await rows())
      ok(Object.keys(r).sort().join('') === 'ABCDE', '挂载后列出五个侦听器（' + Object.keys(r).join('') + '）')
      ok(r.A[1] === '组件的 scope' && r.B[1] === '组件的 scope', 'A 和 B 创建时的活动作用域是组件的 scope')
      ok(/子作用域/.test(r.D[1]) && /游离/.test(r.E[1]) && /没有活动作用域/.test(r.C[1]), 'D 是子作用域，E 是游离的，C 没有活动作用域（' + r.C[1] + '）')
      ok(/active = true/.test(await body.locator('#st-info').textContent()), '挂载后组件 scope.active 是 true')
      await body.locator('#st-bump').click()
      await p.waitForTimeout(100)
      r = byLetter(await rows())
      ok(['A', 'B', 'C', 'D', 'E'].every(k => r[k][2] === '1'), '子组件存在时，改 src 让五个侦听器各运行一次')
      await body.locator('#st-unmount').click()
      await p.waitForTimeout(100)
      ok(/active = false/.test(await body.locator('#st-info').textContent()), '卸载后组件 scope.active 是 false')
      await body.locator('#st-bump').click()
      await p.waitForTimeout(100)
      r = byLetter(await rows())
      ok(['A', 'B', 'D'].every(k => r[k][3].startsWith('0')), '卸载后改 src：A、B、D 不再运行（' + ['A', 'B', 'D'].map(k => r[k][3]).join(' / ') + '）')
      ok(['C', 'E'].every(k => r[k][3].startsWith('1') && /泄漏/.test(r[k][3])), '卸载后改 src：C 和 E 仍然运行，被标为泄漏（' + r.C[3] + ' / ' + r.E[3] + '）')
      // 勾选手动停止 E
      await body.locator('#st-detach').check()
      await body.locator('#st-mount').click()
      await p.waitForTimeout(800)
      await body.locator('#st-unmount').click()
      await body.locator('#st-bump').click()
      await p.waitForTimeout(100)
      r = byLetter(await rows())
      ok(r.E[3].startsWith('0') && r.C[3].startsWith('1'), '用 onScopeDispose 手动停止后，E 不再运行，C 仍然泄漏（' + r.E[3] + ' / ' + r.C[3] + '）')
    }
  }
]
