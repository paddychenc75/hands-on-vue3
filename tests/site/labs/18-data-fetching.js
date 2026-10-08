// 第 18 章的实验台测试数据。格式见 course/AUTHORING.md 第 8 节。
module.exports = [
  {
    id: 'demo-timeline', name: '同样先点 A 再点 B：不处理时界面停在 A；取消旧请求时停在 B；缓存策略只发 2 个请求', pick: 1,
    async run(p, body, ok) {
      await body.locator('.tl').waitFor()
      const verdict = () => body.locator('[data-verdict]').textContent()
      const sent = async () => Number(/(\d+)/.exec(await body.locator('[data-sent]').textContent())[1])
      const strat = name => body.getByLabel(name).check()
      const clickPair = async () => {
        await body.locator('[data-pick="A"]').click()
        await body.locator('[data-pick="B"]').click()
      }
      // 不处理：A 慢（900）B 快（150）。最后界面是 A 的结果
      await clickPair()
      await p.waitForTimeout(1300)
      ok(/结果 A/.test(await verdict()) && /错了/.test(await verdict()), '不处理：界面停在慢的 A，和当前选中的 B 不一致（' + await verdict() + '）')
      ok(await sent() === 2, '不处理：发出 2 个请求')
      // 序号：过期结果被丢弃
      await strat('请求序号：丢弃过期结果')
      await clickPair()
      await p.waitForTimeout(1300)
      ok(/结果 B/.test(await verdict()) && /一致/.test(await verdict()), '请求序号：界面是 B（' + await verdict() + '）')
      ok(await body.locator('.tl-row[data-state="discarded"]').count() === 1, '请求序号：A 的结果被标记为“丢弃”')
      ok(await sent() === 2, '请求序号：仍然发出 2 个请求（只是丢弃了结果）')
      // 取消
      await strat('取消旧请求')
      await clickPair()
      await p.waitForTimeout(400)
      ok(await body.locator('.tl-row[data-state="aborted"]').count() === 1, '取消旧请求：A 被取消')
      ok(/结果 B/.test(await verdict()), '取消旧请求：界面是 B')
      // 缓存
      await strat('按 key 缓存并去重')
      await clickPair()
      await p.waitForTimeout(1300)
      ok(/结果 B/.test(await verdict()) && /一致/.test(await verdict()), '缓存：界面读当前 key 的条目，是 B')
      await body.locator('[data-pick="A"]').click()
      ok(/结果 A/.test(await verdict()), '缓存：再点 A 立刻显示缓存的 A（A 的请求已经完成）')
      ok(await sent() === 2, '缓存：再点 A 没有发新请求，总共 2 个')
      ok(await body.locator('.tl-row[data-state="hit"]').count() === 1, '缓存：时间线里有一行“命中缓存”')
    }
  }
]
