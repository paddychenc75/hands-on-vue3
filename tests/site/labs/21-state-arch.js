// 第 21 章的实验台测试数据。格式见 course/AUTHORING.md 第 8 节。
module.exports = [
  {
    id: 'demo-place', name: '输入后三个做法的更新次数；刷新后只有 URL 做法保留；URL 做法可后退', pick: 1,
    async run(p, body, ok) {
      await body.locator('[data-side="url"] input.t').waitFor()
      const side = s => body.locator('[data-side="' + s + '"]')
      const num = async (s, part) => Number(await body.locator('[data-c="' + s + '-' + part + '"]').textContent({ timeout: 3000 }).catch(e => { throw new Error('找不到计数 ' + s + '-' + part) }))
      // 在三个输入框里各输入 vue
      for (const s of ['local', 'store', 'url']) await side(s).locator('input.t').fill('vue')
      await p.waitForTimeout(200)
      ok(await num('local', 'Owner') === 1, '提升做法：持有状态的父组件更新 1 次')
      ok(await num('local', 'Layout') === 1, '提升做法：不使用筛选条件的中间层也更新 1 次')
      ok(await num('store', 'Layout') === 0 && await num('url', 'Layout') === 0, 'store 和 URL 做法：中间层更新 0 次')
      for (const part of ['Filter', 'Badge', 'List']) {
        const a = await num('local', part), b = await num('store', part), c = await num('url', part)
        ok(a === 1 && b === 1 && c === 1, part + ' 在三个做法里各更新 1 次（' + [a, b, c].join('/') + '）')
      }
      ok(/筛选：vue/.test(await side('url').textContent()), 'URL 做法的徽标显示 vue')
      ok(/\/tasks\?kw=vue/.test(await side('url').textContent()), 'URL 做法的地址栏是 /tasks?kw=vue')
      ok(await side('url').getByRole('button', { name: '后退' }).isDisabled(), '输入用 replace，还不能后退')
      // 点预设按钮用 push
      await side('url').getByRole('button', { name: 'pinia' }).click()
      ok(/kw=pinia/.test(await side('url').textContent()), '点 pinia 后地址是 kw=pinia')
      await side('url').getByRole('button', { name: '后退' }).click()
      ok(/kw=vue/.test(await side('url').textContent()), '后退后回到 kw=vue')
      // 刷新
      await body.getByRole('button', { name: /模拟刷新页面/ }).click()
      await p.waitForTimeout(200)
      ok(await side('local').locator('input.t').inputValue() === '', '刷新后，提升做法的输入框被清空')
      ok(await side('store').locator('input.t').inputValue() === '', '刷新后，store 做法的输入框被清空')
      ok(await side('url').locator('input.t').inputValue() === 'vue', '刷新后，URL 做法仍是 vue')
      ok(await num('url', 'Filter') === 0, '刷新后计数归零')
    }
  }
]
