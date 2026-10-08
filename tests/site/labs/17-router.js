// 第 17 章的实验台测试数据。格式见 tests/site/labs/02-template.js
module.exports = [
  {
    id: 'demo-guard-order', name: '真实 Vue Router：参数变化只运行 beforeRouteUpdate，进入新路由才运行 beforeEnter 和 beforeRouteEnter', pick: 1,
    async run(p, body, ok) {
      const btn = t => body.getByRole('button', { name: t, exact: true })
      await btn('/user/1').waitFor()
      const log = async () => (await body.locator('.log').textContent()) || ''
      await btn('/user/1').click()
      await p.waitForTimeout(150)
      let t = await log()
      ok(/Home：beforeRouteLeave/.test(t) && /全局：beforeEach → \/user\/1/.test(t) && /路由配置：beforeEnter/.test(t) && /User：beforeRouteEnter/.test(t), '从 / 到 /user/1：离开、beforeEach、beforeEnter、beforeRouteEnter 都运行')
      ok(t.indexOf('Home：beforeRouteLeave') < t.indexOf('全局：beforeEach') && t.indexOf('全局：beforeEach') < t.indexOf('路由配置：beforeEnter') && t.indexOf('路由配置：beforeEnter') < t.indexOf('User：beforeRouteEnter') && t.indexOf('User：beforeRouteEnter') < t.indexOf('全局：beforeResolve') && t.indexOf('全局：beforeResolve') < t.indexOf('全局：afterEach'), '顺序是 Leave → beforeEach → beforeEnter → beforeRouteEnter → beforeResolve → afterEach')
      await body.getByRole('button', { name: '清空日志' }).click()
      await btn('/user/2').click()
      await p.waitForTimeout(150)
      t = await log()
      ok(/User：beforeRouteUpdate/.test(t) && !/beforeEnter/.test(t) && !/beforeRouteEnter/.test(t) && !/beforeRouteLeave/.test(t), '/user/1 到 /user/2：只运行 beforeRouteUpdate，不运行 beforeEnter、beforeRouteEnter、Leave')
      await body.getByRole('button', { name: '清空日志' }).click()
      await btn('/admin').click()
      await p.waitForTimeout(150)
      t = await log()
      ok(t.indexOf('路由配置：beforeEnter') < t.indexOf('加载异步组件') && t.indexOf('加载异步组件') < t.indexOf('Admin：beforeRouteEnter'), '到 /admin：beforeEnter 之后才加载异步组件，再运行 beforeRouteEnter')
      await body.getByRole('button', { name: '清空日志' }).click()
      await btn('/admin').click()
      await p.waitForTimeout(150)
      ok(/duplicated/.test(await log()), '再点一次 /admin：导航失败，类型 duplicated')
    }
  },
  {
    id: 'demo-router', name: '未登录访问 /admin 被重定向到登录页，登录后回到 /admin', pick: 1,
    async run(p, body, ok) {
      await body.getByRole('button', { name: '/admin', exact: true }).waitFor()
      await body.getByRole('button', { name: '/task/2', exact: true }).click()
      await p.waitForTimeout(100)
      ok(/任务 2/.test(await body.locator('.view').textContent()) && /完成练习/.test(await body.locator('.view').textContent()), '/task/2 显示任务 2')
      await body.getByRole('button', { name: '/admin', exact: true }).click()
      await p.waitForTimeout(100)
      ok(/登录页/.test(await body.locator('.view').textContent()), '未登录访问 /admin 显示登录页')
      ok(/重定向到 \/login/.test(await body.locator('.log').textContent()), '日志记录了守卫重定向')
      await body.getByRole('button', { name: '一键登录' }).click()
      await p.waitForTimeout(200)
      ok(/管理后台/.test(await body.locator('.view').textContent()), '登录后回到管理后台')
      await body.getByRole('button', { name: '/not/exist' }).click()
      await p.waitForTimeout(100)
      ok(/404/.test(await body.locator('.view').textContent()), '不存在的地址显示 404')
    }
  }
]
