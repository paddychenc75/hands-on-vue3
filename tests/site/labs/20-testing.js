// 第 20 章的实验台测试数据。格式见 course/AUTHORING.md 第 8 节。
module.exports = [
  {
    id: 'demo-test-styles', name: '运行后：实现细节测试在重构版上误报；用户行为测试全对；不等待的测试处处失败；有缺陷版本被测试 2 抓住', pick: 1,
    async run(p, body, ok) {
      await body.getByRole('button', { name: /运行三个测试/ }).click()
      await body.locator('tr[data-impl="refactor"]').waitFor()
      const v = async (impl, t) => (await body.locator(`tr[data-impl="${impl}"] td[data-t="${t}"]`).getAttribute('data-v'))
      ok((await v('orig', 0)) === '通过（对）', '原版：实现细节测试通过')
      ok((await v('orig', 1)) === '通过（对）', '原版：用户行为测试通过')
      ok((await v('orig', 2)) === '失败（误报）', '原版：不等待的测试失败，是误报')
      ok((await v('refactor', 0)) === '失败（误报）', '重构后：实现细节测试误报')
      ok((await v('refactor', 1)) === '通过（对）', '重构后：用户行为测试仍然通过')
      ok((await v('broken', 0)) === '失败（对）', '缺陷版本：实现细节测试失败')
      ok((await v('broken', 1)) === '失败（对）', '缺陷版本：用户行为测试抓住了缺陷')
    }
  }
]
