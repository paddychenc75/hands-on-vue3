// 第 37 章的实验台测试数据。格式见 course/AUTHORING.md 第 8 节。
module.exports = [
  {
    id: 'demo-render-mode', name: '默认建议是 SWR；因人而异且要收录时是 SSR；因人而异不要收录时是纯客户端渲染；几乎不变是预渲染', pick: 1,
    async run(p, body, ok) {
      const mode = () => body.locator('.mode').textContent()
      ok(/SWR/.test(await mode()), '默认（相同、每小时更新、要收录、有服务器）建议 SWR')
      await body.locator('select[aria-label="更新频率"]').selectOption('rare')
      ok(/预渲染/.test(await mode()), '几乎不变时建议预渲染')
      await body.locator('select[aria-label="更新频率"]').selectOption('hourly')
      await body.locator('input[aria-label="有可运行的服务器"]').uncheck()
      ok(/预渲染 \+ 定时/.test(await mode()), '没有服务器、每小时更新：预渲染加定时重新构建')
      await body.locator('input[aria-label="有可运行的服务器"]').check()
      await body.locator('select[aria-label="内容是否因人而异"]').selectOption('user')
      ok((await mode()).trim() === 'SSR', '因人而异且要收录时建议 SSR')
      await body.locator('input[aria-label="需要被搜索引擎收录"]').uncheck()
      ok(/纯客户端/.test(await mode()), '因人而异且不要收录时建议纯客户端渲染')
      ok(/ssr: false/.test(await body.locator('.rule').textContent()), '规则里是 ssr: false')
    }
  }
]
