// 第 12 章的实验台测试数据。
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
  }
]
