// 第 8 章的实验台测试数据。格式见 02-template.js。
module.exports = [
  {
    id: 'demo-builtins', name: '三个标签页都渲染；Transition 点切换后日志出现 before-leave；Teleport 弹窗挂到 body', pick: 0,
    async run(p, body, ok) {
      await body.locator('.tabs button').first().waitFor()
      const tabs = await body.locator('.tabs button').allTextContents()
      ok(tabs.join(',') === 'Transition,TransitionGroup,Teleport', '有三个标签页（' + tabs.join('、') + '）')
      await body.getByRole('button', { name: /切换 v-if/ }).click()
      await p.waitForTimeout(100)
      ok(/before-leave/.test(await body.locator('.log').textContent()), 'Transition 日志出现 before-leave')
      await body.locator('.tabs button', { hasText: 'TransitionGroup' }).click()
      ok((await body.locator('ul.bi-list li').count()) === 6, 'TransitionGroup 有 6 个元素')
      await body.locator('ul.bi-list li').first().click()
      await p.waitForTimeout(900)
      ok((await body.locator('ul.bi-list li').count()) === 5, '点击删除后剩 5 个')
      await body.locator('.tabs button', { hasText: 'Teleport' }).click()
      await body.getByRole('button', { name: '打开弹窗' }).click()
      await p.waitForTimeout(100)
      ok(/遮罩层的父元素：<body/.test(await body.locator('.domview').textContent()), '弹窗的父元素是 body')
      await p.locator('.bi-modal').getByRole('button', { name: '关闭' }).click()
      await p.waitForTimeout(100)
      ok((await p.locator('.bi-mask').count()) === 0, '关闭后遮罩消失')
    }
  },
  {
    id: 'demo-bi-keep', name: '选 KeepAlive 后在 A 输入文字，切到 B 再回 A，文字还在；不用 KeepAlive 时文字丢失', pick: 1,
    async run(p, body, ok) {
      await body.locator('.tabs button').first().waitFor()
      const tab = k => body.locator('.tabs button', { hasText: 'Tab' + k })
      await body.locator('input.t').first().fill('你好')
      await tab('B').click()
      await tab('A').click()
      ok((await body.locator('input.t').first().inputValue()) === '你好', '默认 KeepAlive：回到 A 后文字还在')
      ok(/onDeactivated/.test(await body.locator('.log').textContent()), '日志里有 onDeactivated')
      await body.locator('select.t').selectOption('none')
      await body.locator('input.t').first().fill('丢失')
      await tab('B').click()
      await tab('A').click()
      ok((await body.locator('input.t').first().inputValue()) === '', '不用 KeepAlive：回到 A 后文字丢失')
      ok(/TabA onUnmounted/.test(await body.locator('.log').textContent()), '日志里有 TabA onUnmounted')
      await body.locator('select.t').selectOption('max')
      await tab('A').click(); await tab('B').click(); await tab('C').click()
      await p.waitForTimeout(100)
      const pills = (await body.locator('.pill').allTextContents()).join(',')
      ok(!/TabA/.test(pills) && /TabB/.test(pills) && /TabC/.test(pills), 'max=2：TabA 被淘汰，存活 ' + pills)
    }
  },
  {
    id: 'demo-bi-async', name: 'Suspense：挂载后先 fallback，再 resolve；defineAsyncComponent：失败时显示错误组件', pick: 1,
    async run(p, body, ok) {
      await body.getByRole('button', { name: '挂载 Suspense' }).waitFor()
      body.locator('input[type=range]').evaluate(e => { e.value = '300'; e.dispatchEvent(new Event('input')) })
      await p.waitForTimeout(100)
      await body.getByRole('button', { name: '挂载 Suspense' }).click()
      await p.waitForTimeout(1200)
      const log = await body.locator('.log').textContent()
      ok(/Suspense fallback 事件/.test(log) && /Suspense resolve 事件/.test(log), 'Suspense 先 fallback 后 resolve')
      ok(/用户：Alice/.test(await body.textContent()), '显示 Profile 的内容')
      await body.locator('label.ctl', { hasText: '让 loader 失败' }).locator('input').check()
      await body.getByRole('button', { name: '创建并加载' }).click()
      await p.waitForTimeout(800)
      ok(/加载失败：网络错误/.test(await body.textContent()), 'loader 失败时显示错误组件')
    }
  }
]
