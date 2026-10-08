// 第 16 章的实验台测试数据。章里每个 <Lab id> 都要有一项。格式见 course/AUTHORING.md 第 8 节。
module.exports = [
  {
    id: 'demo-reactivity-clinic', name: '六个病例：症状版和已修复的读数不同，日志、次数和身份比较都按预期', pick: 1,
    async run(p, body, ok) {
      const count = async k => Number((await body.locator(`[data-count="${k}"]`).textContent()).trim())
      const fact = async k => (await body.locator(`[data-fact="${k}"]`).textContent()).trim()
      const act = async (a, wait = 120) => { await body.locator(`[data-act="${a}"]`).click(); await p.waitForTimeout(wait) }
      const fix = async on => { await body.locator(`[data-fix="${on ? 'on' : 'off'}"]`).click(); await p.waitForTimeout(250) }
      const tab = async c => { await body.locator(`[data-case="${c}"]`).click(); await p.waitForTimeout(250) }
      const host = async () => (await body.locator('.clinic-host').textContent()).trim()
      const log = async () => (await body.locator('[data-log]').textContent()).trim()
      await body.locator('[data-case="destructure"]').waitFor({ timeout: 15000 })
      await p.waitForTimeout(300)

      // 解构丢响应
      await act('count'); await act('count'); await act('count')
      ok((await fact('data')) === '3', '症状版：数据里的 state.count 是 3')
      ok(/count = 0/.test(await host()), '症状版：界面仍显示 count = 0')
      ok(!/收集依赖/.test(await log()), '症状版：渲染没有收集到任何依赖（日志里没有“收集依赖”）')
      await fix(true)
      ok(/收集依赖：get count/.test(await log()), '已修复：日志里有 get count')
      await act('count')
      ok(/count = 1/.test(await host()), '已修复：点一次后界面显示 count = 1')
      ok(/被触发：set count/.test(await log()), '已修复：日志里有被 set count 触发')

      // setup 里的快照
      await tab('snapshot'); await fix(false)
      await act('parent')
      ok(/n = 2/.test(await host()) && /第 1 项/.test(await host()), '症状版：父组件 n 变成 2，子组件仍显示“第 1 项”')
      await fix(true)
      await act('parent')
      ok(/第 2 项/.test(await host()), '已修复：子组件显示“第 2 项”')

      // await 之后的读取
      await tab('await'); await fix(false)
      ok((await count('runs')) === 1 && (await fact('tracked')) === 'a', '症状版：只运行 1 次，onTrack 只记下了 a，实际 ' + (await count('runs')) + '/' + (await fact('tracked')))
      await act('b')
      ok((await count('runs')) === 1, '症状版：改 b 不会让它重新运行')
      await act('a')
      ok((await count('runs')) === 2, '症状版：改 a 会重新运行（2 次）')
      await fix(true)
      ok((await fact('tracked')) === 'a、b', '已修复：onTrack 记下了 a 和 b，实际 ' + (await fact('tracked')))
      await act('b')
      ok((await count('runs')) === 2, '已修复：改 b 会重新运行（共 2 次）')

      // 写自己依赖的数据
      await tab('loop'); await fix(false)
      await act('add', 400)
      ok((await count('callback')) > 100 && (await count('callback')) < 110, '症状版：回调运行了 100 多次后被 Vue 停下，实际 ' + (await count('callback')))
      ok(/Maximum recursive updates/.test(await fact('error')), '症状版：错误信息里有 Maximum recursive updates，实际 ' + (await fact('error')))
      await fix(true)
      await act('add', 300)
      ok((await count('callback')) === 0 && /3 项/.test(await host()), '已修复：没有回调运行，整理后显示 3 项')

      // 异步里创建的 watch
      await tab('leak'); await fix(false)
      await p.waitForTimeout(100)
      await act('src')
      ok((await count('hits')) === 1, '症状版：挂载期间改 src，回调运行 1 次')
      await act('toggle'); await act('src')
      ok((await count('afterUnmount')) === 1, '症状版：卸载后改 src，回调仍运行（卸载后 1 次），实际 ' + (await count('afterUnmount')))
      await fix(true)
      await p.waitForTimeout(100)
      await act('src')
      ok((await count('hits')) === 1, '已修复：挂载期间改 src，回调运行 1 次')
      await act('toggle'); await act('src')
      ok((await count('afterUnmount')) === 0 && (await count('hits')) === 1, '已修复：卸载后改 src，回调不再运行')

      // 身份不相等
      await tab('identity'); await fix(false)
      const row = async i => (await body.locator(`[data-id-row="${i}"]`).textContent()).trim()
      ok((await row(0)) === 'false' && (await row(1)) === 'false' && (await row(2)) === 'false', '症状版：代理和原始对象的三个比较都是 false')
      ok((await row(3)) === 'true', '症状版：响应式数组的 includes(raw) 是 true')
      ok(/TypeError/.test(await row(4)), '症状版：私有字段的类放进 reactive 报 TypeError，实际 ' + (await row(4)))
      await fix(true)
      ok((await row(0)) === 'true' && (await row(1)) === 'true' && (await row(2)) === 'true' && (await row(3)) === 'true' && (await row(4)) === '1', '已修复：toRaw 之后比较都成立，markRaw 之后读到 1')
    }
  }
]
