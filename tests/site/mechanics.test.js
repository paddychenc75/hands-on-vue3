// 学习机制的浏览器测试（参考 hands-on-react 的 tests/e2e/mechanics.mjs，每一项都对应 AGENTS 的“学习机制”）：
//   提示阶梯、课前热身、自我解释、复习页、阶段测验、手机宽度无横向滚动。
// 用法：node tests/site/mechanics.test.js     （用 course/.vitepress/dist，要先 npm run build）
// 时间用 Playwright 的 page.clock.setFixedTime 控制，不真的等几分钟；进度先用 seed 写进单个 localStorage 键。
const { makeReporter, startSite, loadChapters, loadExercises, loadQuestions, seed, read, STORE_KEY } = require('./helpers')

const R = makeReporter()
const CH = loadChapters()
const EX = loadExercises()
const MIN = 60e3, HOUR = 36e5, DAY = 864e5
const T0 = new Date('2026-06-01T10:00:00Z').getTime() // 固定的“现在”

/** 等练习编辑器挂载好 */
async function openExercise(p, base, chapterFile, id) {
  await p.goto(base + '/chapters/' + chapterFile + '.html')
  await p.waitForSelector('.ex[data-ex="' + id + '"] .cm-content', { timeout: 15000 })
  await p.waitForTimeout(300)
  return p.locator('.ex[data-ex="' + id + '"]')
}
const setCode = (box, tpl, js) => box.evaluate((r, [t, j]) => r.__setCode(t, j), [tpl, js])
/** 点“运行并检查”，等结果出来 */
async function check(box) {
  await box.locator('[data-a="check"]').click()
  await box.page().waitForTimeout(700)
}
const exRec = async (p, ch, id) => (await read(p))?.[ch]?.ex?.[id]

;(async () => {
  const site = await startSite()
  const base = site.base
  try {
    // ---------- 提示阶梯 ----------
    {
      const g = R.group('提示阶梯：未解锁时锁定并写明条件；只有改过代码的失败才计数；失败 1 次解锁提示；3 次且 5 分钟解锁参考答案')
      const p = await site.newPage()
      await seed(p, base, {})
      await p.clock.setFixedTime(T0)
      const e = EX.counter
      const box = await openExercise(p, base, '01-first', 'counter')
      const hint = box.locator('[data-a="hint"]'), sol = box.locator('[data-a="sol"]')
      g.ok(await box.locator('[data-a="faded"]').count() === 0, '没有 faded 的练习没有半成品这一级')
      g.ok(/先独立尝试。每次改过代码后检查失败，就会多解锁一级帮助：提示 → 参考答案。/.test(await box.locator('.ex-rule').innerText()), '练习说明下有阶梯说明（两级）')
      g.ok(await hint.isDisabled() && /提示（再改代码检查 1 次解锁）/.test(await hint.innerText()), '提示：锁定并写明还差 1 次 ' + await hint.innerText())
      g.ok(await sol.isDisabled() && /参考答案（再改代码检查 3 次解锁）/.test(await sol.innerText()), '参考答案：锁定并写明还差 3 次 ' + await sol.innerText())
      // 起始代码不改就检查：不计数，并说明
      await check(box)
      g.ok(/不计入解锁次数/.test(await box.locator('.ex-res').innerText()), '没改代码就检查：说明这次不计入解锁次数')
      g.ok(!(await exRec(p, 'first', 'counter'))?.fails, '没改代码：失败次数仍是 0')
      // 只改空白、分号、注释：不算改过
      await setCode(box, e.tpl + ';\n  ', e.js + ' // 随便写点注释')
      await check(box)
      g.ok(!(await exRec(p, 'first', 'counter'))?.fails && await hint.isDisabled(), '只加分号、空白、注释：不计数，提示仍锁着')
      // 真的改了：第 1 次
      await setCode(box, '<button>一</button>', e.js)
      await check(box)
      g.ok((await exRec(p, 'first', 'counter')).fails === 1, '真的改了代码：失败 1 次')
      g.ok(!(await hint.isDisabled()) && /已解锁：提示/.test(await box.locator('.ex-res').innerText()), '提示解锁，并说明已解锁')
      g.ok(await sol.isDisabled() && /再改代码检查 2 次解锁/.test(await sol.innerText()), '参考答案仍锁着：再改 2 次 ' + await sol.innerText())
      // 同一份代码再检查：和上一次失败相同，不计数
      await check(box)
      g.ok((await exRec(p, 'first', 'counter')).fails === 1, '和上一次失败相同：不再计数')
      // 提示保留逐条展开
      await hint.click()
      g.ok(/提示 1\/3/.test(await box.locator('.ex-hint').innerText()) && /下一级提示/.test(await hint.innerText()), '提示可以逐条展开：先显示第 1 条，按钮变成“下一级提示”')
      await hint.click(); await hint.click()
      g.ok(/提示 3\/3/.test(await box.locator('.ex-hint').innerText()), '再点两次展开全部 3 条')
      // 来回切换两份不同的失败代码：每次都计数
      await setCode(box, '<button>二</button>', e.js); await check(box)
      await setCode(box, '<button>一</button>', e.js); await check(box)
      g.ok((await exRec(p, 'first', 'counter')).fails === 3, '来回切换两份不同的失败代码，每次都计一次：共 3 次')
      // 次数够了，时间没到
      g.ok(await sol.isDisabled() && /再想 5 分钟解锁/.test(await sol.innerText()), '失败 3 次但还没过 5 分钟：写明还要再想 5 分钟 ' + await sol.innerText())
      await p.clock.setFixedTime(T0 + 3 * MIN + 10e3)
      await check(box)
      g.ok(await sol.isDisabled() && /再想 2 分钟解锁/.test(await sol.innerText()), '过了 3 分钟：还要再想 2 分钟 ' + await sol.innerText())
      await p.clock.setFixedTime(T0 + 5 * MIN + 10e3)
      await check(box)
      g.ok(!(await sol.isDisabled()) && /查看参考答案/.test(await sol.innerText()), '过了 5 分钟：参考答案解锁')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g.end()
    }

    // ---------- 半成品一级 ----------
    {
      const g = R.group('半成品示例（临时给练习加 faded）：失败 2 次且 2 分钟解锁；填入编辑器，原来的代码可以找回')
      const p = await site.newPage()
      await seed(p, base, {})
      await p.clock.setFixedTime(T0)
      const e = EX.counter
      const box = await openExercise(p, base, '01-first', 'counter')
      await box.evaluate(r => r.__setFaded({ tpl: '<button @click="___">点了 {{ ___ }} 次</button>' }))
      const hint = box.locator('[data-a="hint"]'), fd = box.locator('[data-a="faded"]'), sol = box.locator('[data-a="sol"]')
      g.ok(await fd.count() === 1, '有 faded：出现半成品这一级')
      g.ok(/提示 → 半成品示例 → 参考答案/.test(await box.locator('.ex-rule').innerText()), '阶梯说明变成三级')
      g.ok(await fd.isDisabled() && /半成品示例（再改代码检查 2 次解锁）/.test(await fd.innerText()), '半成品：锁定并写明条件 ' + await fd.innerText())
      const mine = '<button>我的第一版</button>'
      await setCode(box, mine, e.js); await check(box)
      g.ok(await fd.isDisabled() && /再改代码检查 1 次解锁/.test(await fd.innerText()), '失败 1 次：半成品还差 1 次')
      await setCode(box, '<button>我的第二版</button>', e.js); await check(box)
      g.ok((await exRec(p, 'first', 'counter')).fails === 2 && await fd.isDisabled() && /再想 2 分钟解锁/.test(await fd.innerText()), '失败 2 次但还没过 2 分钟：写明再想 2 分钟 ' + await fd.innerText())
      g.ok(/半成品示例：次数够了，还要再想 2 分钟才解锁/.test(await box.locator('.ex-res').innerText()), '失败后的说明写明还要等多久')
      await p.clock.setFixedTime(T0 + 2 * MIN + 5e3)
      await check(box)
      g.ok(!(await fd.isDisabled()) && await sol.isDisabled(), '过了 2 分钟：半成品解锁，参考答案仍锁着（需要 3 次和 5 分钟）')
      await fd.click()
      await p.waitForTimeout(300)
      const tplNow = await box.locator('.cm-content').first().innerText()
      g.ok(/___/.test(tplNow) && /点了/.test(tplNow), '半成品代码已填进编辑器')
      g.ok(await box.locator('[data-a="restore"]').count() === 1, '出现“找回我的代码”')
      g.ok(!(await exRec(p, 'first', 'counter')).sawSol, '看半成品不算看过答案')
      await box.locator('[data-a="restore"]').click()
      await p.waitForTimeout(300)
      g.ok((await box.locator('.cm-content').first().innerText()).includes('我的第二版'), '点“找回我的代码”：回到填入之前的代码')
      g.ok(await box.locator('[data-a="restore"]').count() === 0, '找回后按钮消失')
      // 在半成品上改过之后再填：存的是改过的
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g.end()
    }

    // ---------- 参考答案：粘贴原文不通过，重置重写才通过 ----------
    {
      const g = R.group('参考答案：看过答案后粘贴原文不通过且不计失败；点重置自己重写后通过，标记是 rewrite；借助答案单独标记')
      const p = await site.newPage()
      const e = EX.counter
      await seed(p, base, { first: { sc: {}, ex: { counter: { passed: false, fails: 3, firstFail: T0 - 10 * MIN, lastFail: { tpl: 'x', js: 'y' } } }, done: false } })
      await p.clock.setFixedTime(T0)
      let box = await openExercise(p, base, '01-first', 'counter')
      const sol = box.locator('[data-a="sol"]')
      g.ok(!(await sol.isDisabled()), '失败 3 次且过了 5 分钟：参考答案可点')
      await setCode(box, '<button>我写的</button>', e.js)
      await sol.click()
      await p.waitForTimeout(400)
      g.ok((await exRec(p, 'first', 'counter')).sawSol === true, '点开参考答案：记 sawSol')
      g.ok((await box.locator('.cm-content').first().innerText()).includes('@click'), '答案已填进编辑器')
      g.ok(await box.locator('[data-a="restore"]').count() === 1, '填答案之前的代码可以找回')
      const fails0 = (await exRec(p, 'first', 'counter')).fails
      await check(box)
      let rec = await exRec(p, 'first', 'counter')
      g.ok(!rec.passed && /参考答案的原文/.test(await box.locator('.ex-res').innerText()), '粘贴答案原文：不通过，并说明原因')
      g.ok(rec.fails === fails0, '粘贴答案原文不计失败')
      g.ok(/未完成/.test(await box.locator('.badge').innerText()), '徽章仍是未完成')
      // 先借助答案改写：稍微改动答案（多一个无关变量）也能通过，标记 solution
      await setCode(box, e.solTpl, 'const unused = 1\n' + e.js)
      await check(box)
      rec = await exRec(p, 'first', 'counter')
      g.ok(rec.passed && rec.help === 'solution', '看过答案后改写通过：help = solution（' + rec.help + '）')
      g.ok(/借助答案完成/.test(await box.locator('.badge').innerText()) && /借助答案/.test(await box.locator('.ex-res').innerText()), '徽章和结果写明借助答案')
      g.end()

      const g2 = R.group('看答案后点重置、自己重写（写出和答案相同的代码）通过：标记反映是重写通过的')
      await seed(p, base, { first: { sc: {}, ex: { counter: { passed: false, fails: 3, firstFail: T0 - 10 * MIN, lastFail: { tpl: 'x', js: 'y' } } }, done: false } })
      box = await openExercise(p, base, '01-first', 'counter')
      await box.locator('[data-a="sol"]').click()
      await p.waitForTimeout(300)
      await box.locator('[data-a="reset"]').click()
      await p.waitForTimeout(300)
      rec = await exRec(p, 'first', 'counter')
      g2.ok(rec.sawSol === true && rec.rewrite === true, '重置后：sawSol 和 rewrite 都是 true')
      g2.ok(!rec.stash, '重置后没有残留的找回记录')
      await setCode(box, e.solTpl, e.solJs || e.js)
      await check(box)
      rec = await exRec(p, 'first', 'counter')
      g2.ok(rec.passed && rec.help === 'rewrite', '重写（内容和答案相同）后通过：help = rewrite（' + rec.help + '）')
      g2.ok(/看过答案后重写通过/.test(await box.locator('.badge').innerText()), '徽章：看过答案后重写通过')
      g2.ok(/自己重写了一遍/.test(await box.locator('.ex-res').innerText()), '结果说明：自己重写了一遍')
      await p.reload()
      await p.waitForSelector('.chapter-foot')
      await p.waitForTimeout(500)
      g2.ok(/看过参考答案后自己重写通过/.test(await p.locator('.chapter-foot').innerText()) && !/借助了参考答案/.test(await p.locator('.chapter-foot').innerText()), '掌握标准条：写明是重写通过，不写成借助答案 ' + (await p.locator('.chapter-foot').innerText()).replace(/\n/g, ' ').slice(0, 120))
      g2.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g2.end()
    }
  } finally {
    await site.stop()
  }
  console.log(R.bad ? '有 ' + R.bad + ' 项失败' : '全部通过')
  process.exit(R.bad ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
