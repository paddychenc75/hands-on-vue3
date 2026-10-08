// 第 39 章的实验台测试数据。章里每个 <Lab id> 都要有一项。格式见 course/AUTHORING.md 第 8 节。
module.exports = [
  {
    id: 'demo-forms-arch', name: '输入只更新自己的字段；快速输入 ann → anna 不显示过期结果；数组删除后状态跟着项走；条件字段的清除选项；提交聚焦第一个错误并映射服务端错误', pick: 1,
    async run(p, body, ok) {
      const count = async k => Number((await body.locator(`[data-count="${k}"]`).textContent()).trim())
      const cell = (path, k) => body.locator(`[data-row="${path}"] [data-k="${k}"]`)
      const field = k => body.locator(`.lf:has([data-count="${k}"])`)
      const raw = async () => (await body.locator('pre.code').textContent()) || ''
      const active = () => p.evaluate(() => document.activeElement && document.activeElement.closest('.lf') && document.activeElement.closest('.lf').querySelector('[data-count]').dataset.count)
      await body.locator('[data-count="username"]').waitFor({ timeout: 15000 })

      // 1. 在一个字段里输入，只有这个字段更新
      await body.locator('[data-act="reset-counts"]').click()
      await field('username').locator('input').fill('ab')
      await p.waitForTimeout(80)
      ok((await count('username')) === 1, '输入后用户名字段更新 1 次，实际 ' + (await count('username')))
      ok((await count('email')) === 0 && (await count('password')) === 0, '邮箱、密码字段更新 0 次')
      ok((await count('Root')) === 0, '表单根组件更新 0 次，实际 ' + (await count('Root')))
      ok((await count('RawJson')) === 1, '读了整个 values 的那块更新 1 次，实际 ' + (await count('RawJson')))

      // 2. 竞态：ann 慢、anna 快
      await body.locator('[data-act="fast"]').click()
      await p.waitForTimeout(1500)
      const log = (await body.locator('.log').textContent()) || ''
      ok(/返回 #\d+：ann 已被占用/.test(log) && /返回 #\d+：anna 可用/.test(log), '日志里 ann 和 anna 的结果都返回了')
      ok((await cell('username', 'error').textContent()).trim() === '', '用户名的错误是空：ann 的结果已过期，被丢弃')
      ok((await cell('username', 'validating').textContent()).trim() === '', '检查结束，不再显示检查中')

      // 3. 数组：第 2 个联系人碰过，删除第 1 个
      await body.locator('[data-contact="2"] input').focus()
      await body.locator('[data-contact="2"] input').blur()
      await p.waitForTimeout(50)
      ok((await cell('contacts[1].name', 'touched').textContent()).trim() === '是' && (await cell('contacts[1].name', 'error').textContent()).trim() === '必填', '第 2 个联系人：碰过，错误是必填')
      await body.locator('[data-contact="1"] [data-act="del"]').click()
      await p.waitForTimeout(100)
      ok((await body.locator('[data-row^="contacts"]').count()) === 1, '删除后只剩 1 个联系人字段注册着')
      ok((await cell('contacts[0].name', 'touched').textContent()).trim() === '是' && (await cell('contacts[0].name', 'error').textContent()).trim() === '必填', '碰过和错误跟着原来的第 2 个联系人搬到了下标 0')

      // 4. 条件字段
      await field('kind').locator('select').selectOption('company')
      await p.waitForTimeout(80)
      ok((await body.locator('[data-row="company"]').count()) === 1, '选公司后，company 注册进来')
      await field('company').locator('input').fill('X')
      await field('kind').locator('select').selectOption('personal')
      await p.waitForTimeout(80)
      ok((await body.locator('[data-row="company"]').count()) === 0, '选回个人后，company 注销')
      ok(/"company":"X"/.test(await raw()), '默认保留值：company 仍是 X')
      await body.locator('[data-opt="clear"]').check()
      await field('kind').locator('select').selectOption('company')
      await field('company').locator('input').fill('Y')
      await field('kind').locator('select').selectOption('personal')
      await p.waitForTimeout(80)
      ok(!/"company"/.test(await raw()), '勾选“隐藏时清除值”后，company 被清掉')

      // 5. 提交：校验失败，聚焦第一个出错的字段
      await body.locator('[data-act="submit"]').click()
      await p.waitForTimeout(200)
      ok((await body.locator('[data-form="submitCount"]').textContent()).trim() === '1', 'submitCount 是 1')
      ok((await active()) === 'email', '焦点移到第一个出错的字段（邮箱），实际 ' + (await active()))

      // 6. 填好，服务器返回字段错误
      await field('email').locator('input').fill('a@b.co')
      await field('password').locator('input').fill('abcdef')
      await field('confirm').locator('input').fill('abcdef')
      await body.locator('[data-contact="2"] input').fill('甲')
      await body.locator('[data-opt="server"]').selectOption('fail')
      await p.waitForTimeout(300)
      await body.locator('[data-act="submit"]').click()
      await p.waitForTimeout(1300)
      ok(/服务器：用户名已被注册/.test((await cell('username', 'error').textContent()) || ''), '服务端的字段错误映射到了用户名')
      ok((await active()) === 'username', '焦点移到用户名，实际 ' + (await active()))
      // 7. 改用户名后服务端错误消失，再提交成功
      await body.locator('[data-opt="server"]').selectOption('ok')
      await field('username').locator('input').fill('zed')
      await p.waitForTimeout(500)
      ok((await cell('username', 'error').textContent()).trim() === '', '修改用户名后，服务端错误清除')
      await body.locator('[data-act="submit"]').click()
      await body.getByText('提交成功').waitFor({ timeout: 4000 })
      ok(true, '校验全部通过后提交成功')
    }
  }
]
