// 第 31 章的实验台测试数据。
module.exports = [
  {
    id: 'demo-runtime-step', name: '首次挂载（运行的是练习里的迷你 Vue）：运行到底后 App、Counter 都已挂载，Counter 的 mounted 先于 App；只改 label 时 shouldUpdateComponent 返回 false，Counter 不渲染', pick: 1,
    async run(p, body, ok) {
      await body.locator('#rtList .st').first().waitFor()
      const list = async () => (await body.locator('#rtList .st code').allTextContents())
      const inst = async () => (await body.locator('#rtInst tbody tr').evaluateAll(trs => trs.map(tr => [...tr.children].map(td => td.textContent.trim()))))
      // 行：[组件, uid, isMounted, props, next, render 次数]
      const renders = rows => Object.fromEntries(rows.map(r => [r[0], +r[5]]))
      // 首次挂载
      const first = await list()
      ok(/createApp/.test(first[0]), '第一步是 createApp(App).mount')
      await body.getByRole('button', { name: '运行到底' }).click()
      const all = await list()
      ok(['createComponentInstance', 'setupComponent', 'setupRenderEffect', 'mountElement'].every(n => all.includes(n)), '挂载流程包含 createComponentInstance、setupComponent、setupRenderEffect、mountElement')
      const rows = await inst()
      ok(rows.length === 2 && rows.every(r => r[2] === 'true'), '运行到底后 App 和 Counter 的 isMounted 都是 true（' + JSON.stringify(rows) + '）')
      ok(all.includes('onMounted'), '有 onMounted 注册步骤')
      const hooks = await body.locator('#rtList .st.hook code').allTextContents()
      const order = hooks.filter(n => /onMounted/.test(n))
      ok(order.length >= 2, '后置队列里运行了两个 onMounted（' + hooks.join(',') + '）')
      ok(/Counter 的 onMounted/.test(order[order.length - 2] || '') && /App 的 onMounted/.test(order[order.length - 1] || ''), 'Counter 的 onMounted 先于 App 的 onMounted（' + order.join(' < ') + '）')
      ok(/<div><p>|<div><i>/.test(await body.locator('#rtHtml').textContent()), '容器里已有 HTML')
      // 下一步 / 上一步
      await body.getByRole('button', { name: '重来' }).click()
      ok(/第 1 \//.test(await body.locator('#rtPos').textContent()), '点重来回到第 1 步')
      await body.getByRole('button', { name: '下一步' }).click()
      ok(/第 2 \//.test(await body.locator('#rtPos').textContent()), '下一步到第 2 步')
      await body.getByRole('button', { name: '上一步' }).click()
      ok(/第 1 \//.test(await body.locator('#rtPos').textContent()), '上一步回到第 1 步')

      // 父组件改了无关数据：Counter 被跳过
      await body.locator('#rtScenario').selectOption({ label: '父组件改了与子组件无关的数据' })
      await body.getByRole('button', { name: '运行到底' }).click()
      const other = await list()
      ok(other.includes('shouldUpdateComponent') && other.includes('skip'), '包含 shouldUpdateComponent 和 skip')
      const rOther = renders(await inst())
      ok(rOther.Counter === 1, 'Counter 的 render 次数仍是 1（' + JSON.stringify(rOther) + '）')
      ok(rOther.App === 2, 'App 的 render 次数是 2（' + JSON.stringify(rOther) + '）')

      // props 变了：更新 Counter，并且 next 先有后无
      await body.locator('#rtScenario').selectOption({ label: '父组件改了传给子组件的数据' })
      await body.getByRole('button', { name: '运行到底' }).click()
      const props = await list()
      ok(props.includes('updateComponentPreRender') && props.includes('instance.next = n2'), '包含 instance.next = n2 和 updateComponentPreRender')
      ok(renders(await inst()).Counter === 2, 'Counter 的 render 次数是 2')

      // 批量：App 先运行，子组件的任务被删掉，Counter 只渲染一次
      await body.locator('#rtScenario').selectOption({ label: '同步改三次，父子的数据都改' })
      await body.getByRole('button', { name: '运行到底' }).click()
      const batch = await list()
      ok(batch.includes('runIfDirty'), '父组件已经同步更新了子组件，子组件排队的更新任务运行时发现不脏，什么也不做（runIfDirty）')
      ok(batch.filter(n => n === 'queueJob').length >= 3, 'queueJob 被调用多次（重复的任务不再入队）')
      ok(renders(await inst()).Counter === 2, '批量更新后 Counter 的 render 次数是 2（初始 1 次加更新 1 次）')

      // 更新任务运行到一半，又有数据改变：刷新期间新入队的 App.update 也要有自己的「运行」步骤（它不是在 flushJobs 开始时就在队列里的）
      await body.locator('#rtScenario').selectOption({ label: '更新任务运行到一半，又有数据改变' })
      await body.getByRole('button', { name: '运行到底' }).click()
      const rq = await list()
      const iHook = rq.indexOf('onBeforeUpdate')
      ok(iHook > 0, '有 onBeforeUpdate 这一步（' + rq.join(',') + '）')
      const jobIdx = rq.map((n, i) => (n === 'job' ? i : -1)).filter(i => i >= 0)
      ok(jobIdx.length === 2, '队列里的两个更新任务各有一步「运行」：Counter.update、App.update（实际 ' + jobIdx.length + ' 步）')
      ok(jobIdx.length === 2 && jobIdx[0] < iHook && iHook < jobIdx[1], 'onBeforeUpdate 在第一个任务运行期间，第二个任务（刷新中新入队的）在它之后运行')
      ok(rq.slice(iHook).includes('queueJob'), 'onBeforeUpdate 之后有 queueJob：App.update 在刷新期间入队')
      const rRq = renders(await inst())
      ok(rRq.App === 2 && rRq.Counter === 2, '最后 App 渲染 2 次、Counter 渲染 2 次（' + JSON.stringify(rRq) + '）')
      ok(/label = b/.test(await body.locator('#rtHtml').textContent()), '容器里最后是 label = b')
      ok((await body.locator('#rtQueue .pill').count()) === 0, '运行到底后更新队列是空的')
    }
  }
]
