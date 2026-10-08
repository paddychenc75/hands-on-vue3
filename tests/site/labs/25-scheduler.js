// 第 25 章的实验台测试数据。
module.exports = [
  {
    id: 'demo-tick', name: '点“count++ 三次”后组件只渲染 1 次，nextTick 后 DOM 为 3', pick: 1,
    async run(p, body, ok) {
      await body.getByRole('button', { name: 'count++ 三次' }).click()
      await p.waitForTimeout(150)
      const txt = await body.locator('.log').textContent()
      ok(/累计 1 次/.test(txt) && !/累计 2 次/.test(txt), '只渲染 1 次')
      ok(/nextTick\(\) 后 DOM 文本 = 3/.test(txt), 'nextTick 后 DOM 文本是 3')
      ok(/还没更新/.test(txt), '同步阶段 DOM 还是旧值')
    }
  },
  {
    id: 'demo-queues', name: '点 count++ 后日志顺序：pre watch → 父 → 子 → post watch → nextTick', pick: 0,
    async run(p, body, ok) {
      await body.getByRole('button', { name: 'count++' }).click()
      await p.waitForTimeout(150)
      const lines = (await body.locator('.log > div').allTextContents()).map(t => t.replace(/^\S+\s+/, '')).reverse()
      const idx = k => lines.findIndex(l => l.includes(k))
      const order = ["flush: 'pre'", '父组件 onBeforeUpdate', '子组件 onBeforeUpdate', "flush: 'post'", 'nextTick 回调'].map(idx)
      ok(order.every(i => i >= 0), '五类日志都出现')
      ok(order.every((v, i) => i === 0 || v > order[i - 1]), '顺序正确：' + order.join(','))
      ok(idx("flush: 'post'") < idx('子组件 onUpdated') && idx('子组件 onUpdated') < idx('父组件 onUpdated'), 'post 侦听器先于子组件 onUpdated，子组件 onUpdated 先于父组件')
      ok(idx('子组件 onUpdated') > 0 && idx('父组件 onUpdated') > 0 && idx('父组件 onUpdated') < idx('nextTick 回调'), '更新完成的钩子都在 nextTick 回调之前')
    }
  },
  {
    id: 'demo-scheduler-stepper', name: '入队 3、1、3、2:重复的被忽略,运行顺序 1、2、3;单步回放时运行中入队的任务按 id 插进队列', pick: 1,
    async run(p, body, ok) {
      const btn = n => body.getByRole('button', { name: n, exact: true })
      await btn('修改组件 3(id 3)').click()
      await btn('修改组件 1(id 1)').click()
      await btn('修改组件 3(id 3)').click()
      await btn('修改组件 2(id 2)').click()
      const q = await body.locator('[data-test=queue]').textContent()
      ok(/#1[\s\S]*#2[\s\S]*#3/.test(q) && (q.match(/#3/g) || []).length === 1, 'queue 按 id 排序且组件 3 只出现一次:' + q.replace(/\s+/g, ' '))
      ok(/已有 queued 标记/.test(await body.locator('[data-test=log]').textContent()), '日志里有“已有 queued 标记”')
      await btn('全部运行').click()
      const log = (await body.locator('[data-test=log] > div').allTextContents()).reverse().join('|')
      const idx = k => log.indexOf(k)
      ok(idx('运行 更新 #1') >= 0 && idx('运行 更新 #1') < idx('运行 更新 #2') && idx('运行 更新 #2') < idx('运行 更新 #3'), '运行顺序是 #1、#2、#3')
      ok(/刷新结束/.test(log), '日志里有“刷新结束”')
      await btn('重置').click()
      await body.getByLabel('#1 更新时又修改组件 3').check()
      await btn('修改组件 1(id 1)').click()
      let seen = false
      for (let k = 0; k < 8 && !seen; k++) {
        await btn('单步').click()
        seen = /#3 更新/.test(await body.locator('[data-test=queue]').textContent())
      }
      ok(seen, '回放 #1 的过程中,组件 3 的更新任务按 id 插进了 queue')
      await btn('全部运行').click()
      const log2 = (await body.locator('[data-test=log] > div').allTextContents()).reverse().join('|')
      ok(log2.indexOf('运行 更新 #1') >= 0 && log2.indexOf('运行 更新 #1') < log2.indexOf('运行 更新 #3'), '同一轮里 #3 在 #1 之后运行')
    }
  }
]
