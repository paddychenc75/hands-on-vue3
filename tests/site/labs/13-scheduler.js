// 第 13 章的实验台测试数据。
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
  }
]
