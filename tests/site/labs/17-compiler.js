// 第 17 章的实验台测试数据。
module.exports = [
  {
    id: 'demo-compile', name: '选“动态 class + 属性”后 patchFlag 含 10（CLASS | PROPS）；改成错误模板时报编译错误', pick: 1,
    async run(p, body, ok) {
      await body.locator('textarea.t').waitFor()
      await body.locator('pre.code').filter({ hasText: 'render' }).waitFor({ timeout: 10000 })
      ok(/patchFlag：/.test(await body.locator('.cap').first().textContent()) || /没有 patchFlag/.test(await body.textContent()), '默认示例有 patchFlag 汇总一行')
      await body.locator('select.t').selectOption({ label: '动态 class + 属性' })
      await p.waitForTimeout(200)
      ok(/10（CLASS \| PROPS）/.test(await body.textContent()), '动态 class + 属性：出现 10（CLASS | PROPS）')
      await body.locator('textarea.t').fill('<div><p>')
      await p.waitForTimeout(200)
      ok(/编译错误/.test(await body.textContent()), '残缺模板显示编译错误')
    }
  },
  {
    id: 'demo-block', name: '默认示例：根是 Block，dynamicChildren 含 2 个节点；v-if 示例出现子 Block', pick: 2,
    async run(p, body, ok) {
      await body.locator('.domview').first().waitFor()
      await p.waitForFunction(() => /★/.test(document.querySelector('#demo-block .domview')?.textContent || ''), null, { timeout: 10000 })
      const dyn = () => body.locator('.domview').nth(1).textContent()
      let t = await dyn()
      ok(/★ Block 1/.test(t) && (t.match(/→/g) || []).length === 2, '默认示例：根 Block 有 2 个动态后代（' + t.replace(/\n/g, ' / ') + '）')
      await body.locator('select.t').selectOption({ label: 'v-if 创建新 Block' })
      await p.waitForTimeout(300)
      t = await dyn()
      ok(/Block 2/.test(t), 'v-if 示例有多个 Block')
    }
  },
  {
    id: 'demo-steps', name: '三页：AST 里有 DIRECTIVE，transform 页有 patchFlag=3 和 CACHED，generate 页有 _createElementBlock；v-if 示例出现 IF 和 BRANCH', pick: 1,
    async run(p, body, ok) {
      await body.locator('textarea.t').waitFor()
      await body.locator('pre.code').filter({ hasText: 'ROOT' }).waitFor({ timeout: 15000 })
      let t = await body.locator('pre.code').textContent()
      ok(/DIRECTIVE bind  arg=class  exp="c"/.test(t) && /INTERPOLATION/.test(t), '第一页：AST 里有 bind 指令节点和插值节点')
      await body.getByRole('tab', { name: /transform/ }).click()
      t = await body.locator('pre.code').textContent()
      ok(/patchFlag=3 TEXT \| CLASS/.test(t) && /-1 CACHED/.test(t), '第二页：p 的 patchFlag 是 3 TEXT | CLASS，h1 是 -1 CACHED（' + t.replace(/\n/g, ' / ').slice(0, 120) + '）')
      await body.getByRole('tab', { name: /generate/ }).click()
      t = await body.locator('pre.code').textContent()
      ok(/_createElementBlock/.test(t) && /3 \/\* TEXT, CLASS \*\//.test(t), '第三页：渲染函数里有 3 /* TEXT, CLASS */')
      ok(/这段结果和一次 compile\(\) 的结果相同/.test(await body.textContent()), '三步的结果与 compile() 一致')
      await body.locator('select.t').selectOption({ label: 'v-if / v-else' })
      await body.getByRole('tab', { name: /transform/ }).click()
      t = await body.locator('pre.code').textContent()
      ok(/IF/.test(t) && (t.match(/BRANCH/g) || []).length === 2, 'v-if 示例：出现 IF 和两个 BRANCH')
      await body.locator('textarea.t').fill('<div><p>')
      await p.waitForTimeout(200)
      ok(/编译错误|ROOT/.test(await body.locator('pre.code').textContent()), '残缺模板不会让页面崩溃')
    }
  },
  {
    id: 'demo-sfc', name: '拆块页有 3 块；compileScript 页有 __returned__；模板页有 $setup["Child"]；样式页有 data-v-7ba5bd90；内联后没有 __returned__', pick: 0,
    async run(p, body, ok) {
      await body.locator('textarea.t').waitFor()
      await body.locator('pre.code').filter({ hasText: '<template>' }).waitFor({ timeout: 20000 })
      let t = await body.locator('pre.code').textContent()
      ok(/<template>/.test(t) && /<script setup>/.test(t) && /scoped=true/.test(t), '第一页：拆出 template、script setup 和 scoped 的 style')
      await body.getByRole('tab', { name: /compileScript/ }).click()
      t = await body.locator('pre.code').textContent()
      ok(/__returned__/.test(t) && /Child/.test(t), '第二页：setup() 返回 __returned__，里面有 Child')
      await body.getByRole('tab', { name: /compileTemplate/ }).click()
      t = await body.locator('pre.code').textContent()
      ok(/\$setup\["Child"\]/.test(t) && /\$setup\.count/.test(t), '第三页：模板引用 $setup["Child"] 和 $setup.count')
      await body.getByRole('tab', { name: /compileStyle/ }).click()
      t = await body.locator('pre.code').textContent()
      ok(/\.t\[data-v-7ba5bd90\]/.test(t), '第四页：选择器被改写成 .t[data-v-7ba5bd90]')
      await body.locator('input[type=checkbox]').check()
      await body.getByRole('tab', { name: /compileScript/ }).click()
      t = await body.locator('pre.code').textContent()
      ok(!/__returned__/.test(t) && /count\.value/.test(t), '内联模板后：没有 __returned__，模板里读 count.value')
    }
  }
]
