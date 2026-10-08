// 第 35 章的实验台测试数据。章里每个 <Lab id> 都要有一项。格式见 course/AUTHORING.md 第 8 节。
module.exports = [
  {
    id: 'demo-two-vue', name: '两份 Vue：inject 照常工作，但库的响应式数据不再驱动应用的页面', pick: 1,
    async run(p, body, ok) {
      const out = async k => (await body.locator(`[data-out="${k}"]`).textContent()).trim()
      await body.locator('[data-mode="shared"]').waitFor({ timeout: 15000 })
      await p.waitForTimeout(300)

      // 共用一份 Vue
      ok((await out('theme')) === 'dark', '共用一份 Vue：库里 inject 读到 dark，实际 ' + (await out('theme')))
      ok((await out('same')) === 'true', '共用一份 Vue：两个 reactive(o) 是同一个代理')
      await body.locator('[data-act="inc"]').click()
      await body.locator('[data-act="inc"]').click()
      await p.waitForTimeout(100)
      ok((await out('n')) === '2' && (await out('real')) === '2', '共用一份 Vue：点两次后页面显示 2，n.value 是 2，实际 ' + (await out('n')) + '/' + (await out('real')))
      await body.locator('[data-act="count"]').click()
      await p.waitForTimeout(100)
      ok((await out('doubled')) === '4', '共用一份 Vue：count 变成 2 后翻倍是 4，实际 ' + (await out('doubled')))

      // 库自带一份 Vue
      await body.locator('[data-mode="bundled"]').click()
      await p.waitForTimeout(300)
      ok((await out('theme')) === 'dark', '两份 Vue：inject 仍然读到 dark（currentInstance 在副本间同步），实际 ' + (await out('theme')))
      ok((await out('same')) === 'false', '两份 Vue：两个 reactive(o) 不是同一个代理')
      await body.locator('[data-act="inc"]').click()
      await body.locator('[data-act="inc"]').click()
      await p.waitForTimeout(100)
      ok((await out('n')) === '0' && (await out('real')) === '2', '两份 Vue：n.value 是 2，页面仍显示 0，实际 ' + (await out('n')) + '/' + (await out('real')))
      await body.locator('[data-act="count"]').click()
      await p.waitForTimeout(100)
      ok((await out('doubled')) === '2', '两份 Vue：count 变成 2 后翻倍仍是 2（库的 computed 没有收集到应用的 ref），实际 ' + (await out('doubled')))
      ok((await out('n')) === '2', '两份 Vue：应用重新渲染后，页面才显示出 n 的新值 2，实际 ' + (await out('n')))
    }
  }
]
