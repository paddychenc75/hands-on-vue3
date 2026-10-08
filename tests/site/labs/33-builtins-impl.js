// 第 33 章的实验台测试数据。格式见 course/AUTHORING.md 第 8 节。
module.exports = [
  {
    id: 'demo-ka-hidden', name: 'max=2：依次打开 A、B、A、C，B 被淘汰，隐藏容器里只有 A；切回 A 时计数还在；include 只缓存 TabA、TabB 时 TabC 离开即卸载', pick: 1,
    async run(p, body, ok) {
      await body.locator('#kaPage').waitFor()
      const wait = () => p.waitForTimeout(80)
      const page = async () => (await body.locator('#kaPage').textContent()).trim()
      const hiddenCount = async () => +(await body.locator('#kaHiddenCount').textContent())
      const logText = async () => await body.locator('#kaLog').textContent()
      const sw = async n => { await body.locator('.row').first().getByRole('button', { name: n, exact: true }).click(); await wait() }
      const bump = async n => { await body.getByRole('button', { name: n + ' 计数 +1' }).click(); await wait() }

      ok(/TabA 计数 0/.test(await page()), '一开始页面上是 TabA')
      ok((await hiddenCount()) === 0, '一开始隐藏容器是空的')
      await bump('TabA'); await bump('TabA')
      ok(/TabA 计数 2/.test(await page()), 'TabA 计数加到 2')
      await sw('TabB')
      ok(/TabB 计数 0/.test(await page()) && !/TabA/.test(await page()), '切到 TabB 后页面上只有 TabB')
      ok((await hiddenCount()) === 1 && /TabA 计数 2/.test(await body.locator('#kaHidden').textContent()), 'TabA 的 DOM 在隐藏容器里，计数 2 还在')
      ok(/TabA onDeactivated/.test(await logText()) && !/TabA onUnmounted/.test(await logText()), 'TabA 触发 onDeactivated，没有 onUnmounted')
      await sw('TabA')
      ok(/TabA 计数 2/.test(await page()), '切回 TabA，计数仍是 2')
      const log1 = await logText()
      ok((log1.match(/TabA onMounted/g) || []).length === 1 && (log1.match(/TabA onActivated/g) || []).length === 2, 'TabA 的 onMounted 只有 1 次，onActivated 有 2 次')
      ok(/TabB → TabA|TabB → TabA/.test(await body.locator('#kaOrder').textContent()), '使用顺序是 TabB → TabA')
      await sw('TabC')
      const log2 = await logText()
      ok(/TabB onUnmounted/.test(log2) && !/TabA onUnmounted/.test(log2), 'max=2：放进 TabC 时淘汰最久没用的 TabB，而不是 TabA')
      ok((await hiddenCount()) === 1 && /TabA/.test(await body.locator('#kaHidden').textContent()), '隐藏容器里只有 TabA')
      ok((await body.locator('#kaAlive').textContent()).includes('TabA') && !(await body.locator('#kaAlive').textContent()).includes('TabB'), '存活的实例是 TabA、TabC')

      // include
      await body.locator('select').nth(1).selectOption('ab')
      await wait()
      ok(/TabA 计数 0/.test(await page()), '改 include 会重置实验台')
      await sw('TabC')
      await sw('TabA')
      const log3 = await logText()
      ok(/TabC onUnmounted/.test(log3) && !/TabC onDeactivated/.test(log3), 'include 只写 TabA,TabB：TabC 不被缓存，离开时直接卸载')
      ok((await hiddenCount()) === 0, '隐藏容器是空的')
    }
  },
  {
    id: 'demo-suspense-timeline', name: '首次加载：onPending、onFallback 先于 onResolve，A 完成时页面仍是 fallback，子组件 onMounted 在 onResolve 之后；根是 div 时切换内容不再 pending；换成组件根时旧内容留着', pick: 1,
    async run(p, body, ok) {
      const wait = ms => p.waitForTimeout(ms)
      const log = () => body.locator('.sp-log').textContent()
      const now = () => body.locator('.sp-now').textContent()
      const fill = async (label, v) => { await body.getByLabel(label).fill(String(v)) }
      // 缩短耗时，让测试快一点
      await fill('A 的耗时', 100); await fill('B 的耗时', 1000); await fill('C 的耗时', 200)
      await body.getByRole('button', { name: '首次加载' }).click()
      await wait(100)
      await body.locator('.sp-log').waitFor()
      ok(/onPending/.test(await log()) && /onFallback/.test(await log()), '首次加载触发 onPending 和 onFallback')
      await wait(300) // 约 400 ms：A 完成，B 没完成
      ok(/A 的 setup 完成，异步依赖剩 1 个/.test(await log()) && /fallback/.test(await now()), 'A 完成后依赖剩 1 个，页面仍是 fallback')
      await wait(900)
      let t = await log()
      ok(/onResolve/.test(t) && t.indexOf('onResolve') < t.indexOf('A onMounted') && /DOM 已在页面上：true/.test(t), 'onResolve 先于子组件的 onMounted，且 onMounted 时 DOM 已在页面上')
      ok(/内容（A、B）/.test(await now()) || /内容/.test(await now()), '结束后页面显示内容')
      // 整页替换：旧内容留着
      await body.getByRole('button', { name: '切换内容' }).click()
      await wait(80)
      t = await log()
      ok(/onPending/.test(t) && !/onFallback/.test(t), '根组件被替换：进入 pending，但没设 timeout，不显示 fallback')
      ok(/A/.test(await body.locator('.sp-stage').textContent()) && /B/.test(await body.locator('.sp-stage').textContent()), '页面上仍是旧的 A、B')
      await wait(400)
      ok(/onResolve/.test(await log()) && /C/.test(await body.locator('.sp-stage').textContent()), '新内容完成后换成 C')
      // 根是 div：原地替换
      await body.getByLabel('默认内容的根').selectOption('div')
      await wait(1300)   // 等 B（1000 ms）完成
      await body.getByRole('button', { name: '切换内容' }).click()
      await wait(80)
      t = await log()
      ok(!/onPending/.test(t) && !/onFallback/.test(t), '根 div 不变：原地 patch，没有 onPending 和 onFallback')
      await wait(400)
      ok(/C/.test(await body.locator('.sp-stage').textContent()), '新的异步子组件完成后显示出来')
    }
  }
]
