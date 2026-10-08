// 第 30 章的实验台测试数据。格式见 course/AUTHORING.md 第 8 节。
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
  }
]
