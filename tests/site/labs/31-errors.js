// 第 31 章的实验台测试数据。
module.exports = [
  {
    id: 'demo-errors-trace', name: '错误传播追踪器：async 处理函数的错误走 errorCaptured 链；悬空 Promise 和 setTimeout 只到 window；async setup 在 Suspense 里被接住', pick: 1,
    async run(p, body, ok) {
      const run = async name => { await body.getByRole('button', { name, exact: true }).click(); await p.waitForTimeout(250) }
      const log = () => body.locator('[data-et-log]').textContent()
      const verdict = () => body.locator('[data-et-verdict]').textContent()
      await run('点击：async 处理函数 throw')
      let t = await log()
      ok(/Boundary\.errorCaptured：原生事件处理函数/.test(t) && !/Layout\.errorCaptured/.test(t), 'async 处理函数：Boundary 收到，且返回 false 后 Layout 收不到（' + t.replace(/\n/g, ' | ') + '）')
      ok(!/app\.config\.errorHandler/.test(t), 'Boundary 返回 false，errorHandler 收不到')
      ok(/Vue 接住了/.test(await verdict()), '结论是 Vue 接住了')
      await body.getByLabel('Boundary 返回 false').uncheck()
      await run('点击：async 处理函数 throw')
      t = await log()
      ok(/Boundary\.errorCaptured[^\n]*不返回 false[\s\S]*Layout\.errorCaptured[\s\S]*app\.config\.errorHandler/.test(t), '不返回 false：依次经过 Boundary、Layout、errorHandler')
      await run('点击：Promise 没有返回给 Vue')
      t = await log()
      ok(/unhandledrejection/.test(t) && !/errorCaptured|errorHandler/.test(t), '悬空的 Promise 只到 unhandledrejection（' + t.replace(/\n/g, ' | ') + '）')
      ok(/没有接住/.test(await verdict()), '结论是 Vue 没有接住')
      await run('setTimeout 回调里 throw')
      t = await log()
      ok(/window 的 error 事件/.test(t) && !/errorCaptured/.test(t), 'setTimeout 里的错误只到 window 的 error')
      await run('原生 addEventListener 里 throw')
      ok(/window 的 error 事件/.test(await log()), '原生监听函数里的错误只到 window 的 error')
      await run('async setup 里 throw（有 Suspense）')
      ok(/Boundary\.errorCaptured：setup 函数/.test(await log()), 'async setup 的错误被 Boundary 收到')
      await run('渲染函数里 throw')
      ok(/渲染函数（码 1）/.test(await log()), '渲染函数的 info 码是 1')
      await body.getByLabel('设置 app.config.errorHandler').uncheck()
      await run('setup 里 throw')
      t = await log()
      ok(/console\.error：没有 errorHandler/.test(t), '没有 errorHandler 时，生产构建只 console.error')
      ok(/Vue 接住了，但没有人处理/.test(await verdict()), '结论说明没有 errorHandler')
    }
  }
]
