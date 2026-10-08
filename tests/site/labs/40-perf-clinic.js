// 第 40 章的实验台测试数据。章里每个 <Lab id> 都要有一项。格式见 course/AUTHORING.md 第 8 节。
module.exports = [
  {
    id: 'demo-clinic', name: '五个病例：症状版的次数和已修复的次数不同，读数字而不是毫秒', pick: 2,
    async run(p, body, ok) {
      const count = async k => Number((await body.locator(`[data-count="${k}"]`).textContent()).trim())
      const act = async a => { await body.locator(`[data-act="${a}"]`).click(); await p.waitForTimeout(80) }
      const fix = async on => { await body.locator(`[data-fix="${on ? 'on' : 'off'}"]`).click(); await p.waitForTimeout(150) }
      const tab = async c => { await body.locator(`[data-case="${c}"]`).click(); await p.waitForTimeout(250) }
      await body.locator('[data-case="props"]').waitFor({ timeout: 15000 })
      await p.waitForTimeout(300)

      // 内联对象 props
      await act('type')
      ok((await count('Row')) === 8, '症状版：输入一个字后 Row 共更新 8 次，实际 ' + (await count('Row')))
      ok((await count('Root')) === 1, '症状版：Root 更新 1 次')
      ok(/set value/.test(await body.locator('[data-log]').textContent()), '日志里有 Root 被 set value 触发')
      await fix(true)
      await act('type')
      ok((await count('Row')) === 0, '已修复：输入一个字后 Row 更新 0 次，实际 ' + (await count('Row')))
      await act('rename')
      ok((await count('Row')) === 1, '已修复：改名后只有 1 个 Row 更新，实际 ' + (await count('Row')))

      // 读了整个对象
      await tab('coarse')
      await fix(false)
      await act('qty')
      ok((await count('Badge')) === 0 && (await count('Total')) === 1 && (await count('Debug')) === 1, '症状版：数量加 1 后 Badge 0、Total 1、Debug 1')
      await act('coupon')
      ok((await count('Debug')) === 2 && (await count('Total')) === 1, '症状版：修改优惠码只让 Debug 再更新一次')
      await fix(true)
      await act('coupon')
      await act('qty')
      ok((await count('Debug')) === 0 && (await count('Total')) === 1, '已修复：Debug 不再随字段变化更新')

      // 多余的计算和保存
      await tab('calc')
      await fix(false)
      await act('query')
      ok((await count('summarize')) === 2 && (await count('save')) === 1, '症状版：输入一个字后 summarize 共 2 次、保存 1 次，实际 ' + (await count('summarize')) + '/' + (await count('save')))
      await fix(true)
      await act('query')
      ok((await count('summarize')) === 1 && (await count('save')) === 0, '已修复：输入一个字后 summarize 仍是 1 次、保存 0 次')
      await act('todo')
      ok((await count('summarize')) === 2 && (await count('save')) === 1, '已修复：勾选后 summarize 2 次、保存 1 次')

      // 深层响应式
      await tab('deep')
      await act('read-ref')
      await act('read-shallow')
      ok(/代理：是/.test(await body.locator('[data-deep="ref"]').textContent()), 'ref：第 1 项是代理')
      ok(/代理：否/.test(await body.locator('[data-deep="shallowRef"]').textContent()), 'shallowRef：第 1 项不是代理')

      // 定时器泄漏
      await tab('leak')
      await fix(false)
      ok((await count('timers')) === 1, '挂载后有 1 个定时器')
      await act('toggle')
      await act('toggle')
      await act('toggle')
      await act('toggle')
      await act('toggle')
      ok((await count('timers')) === 3, '症状版：挂载 3 次、卸载 2 次后仍有 3 个定时器，实际 ' + (await count('timers')))
      await fix(true)
      await act('toggle')
      ok((await count('timers')) === 0, '已修复：卸载后没有定时器，实际 ' + (await count('timers')))
    }
  }
]
