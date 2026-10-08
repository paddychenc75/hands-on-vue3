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
/** 一张卡片键对应的题，正确选项在题目数据里的原始下标（页面上 .opt 的 data-oi） */
function correctOi(key) {
  const [ch, n] = key.split('#')
  return n[0] === 'c' ? 0 : CH.find(c => c.id === ch).scAnswers[Number(n)]
}
/** 在一道题（locator）上选一个选项：right 为真选对的，否则选一个错的（取原始下标最小的错项） */
async function answer(q, key, right) {
  const ok = correctOi(key)
  const oi = right ? ok : (ok === 0 ? 1 : 0)
  await q.locator('.opt[data-oi="' + oi + '"]').click()
  return oi
}
const card = (box, due, last, n = 1) => ({ box, n, due, last })
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

    // ---------- 课前热身 ----------
    {
      const g = R.group('课前热身：第 1 章没有；有旧题时在标题和目标之间，出 2 道（先到期的，再上一章的）；12 小时内答过的不出')
      const p = await site.newPage()
      await seed(p, base, {})
      await p.clock.setFixedTime(T0)
      await p.goto(base + '/chapters/01-first.html'); await p.waitForSelector('.chapter-foot'); await p.waitForTimeout(500)
      g.ok(await p.locator('.warmup').count() === 0, '第 1 章没有热身')
      // 第 4 章 computed 的上一章是 refs；first#0 到期，template#0 和 refs 的两道没到期；全都是 1 天前答的
      const old = T0 - 2 * DAY
      await seed(p, base, { __srs: {
        'first#0': card(1, T0 - DAY, old), 'template#0': card(1, T0 + DAY, old), 'refs#0': card(1, T0 + DAY, old), 'refs#1': card(1, T0 + DAY, old)
      } })
      await p.goto(base + '/chapters/04-computed.html'); await p.waitForSelector('.warmup .q'); await p.waitForTimeout(300)
      const keys = await p.$$eval('.warmup .q', es => es.map(e => e.dataset.key))
      g.ok(keys.length === 2, '出 2 道题 ' + keys)
      g.ok(keys.includes('first#0'), '先出到期的 first#0')
      g.ok(keys.some(k => k.startsWith('refs#')), '再出上一章（refs）的题')
      const order = await p.evaluate(() => {
        const w = document.querySelector('.warmup'), h1 = document.querySelector('.vp-doc h1'), goal = document.querySelector('.vp-doc .goal')
        return { afterH1: !!(h1.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING), beforeGoal: !!(w.compareDocumentPosition(goal) & Node.DOCUMENT_POSITION_FOLLOWING) }
      })
      g.ok(order.afterH1 && order.beforeGoal, '位置：一级标题 → 热身 → 目标')
      g.ok(/课前热身/.test(await p.locator('.warmup .wu-head').innerText()), '有热身标题和说明')
      g.ok(await p.locator('.warmup a[href*="/chapters/"]').count() === 0, '作答前不显示出处（解析和出处答对后才出现）')
      g.end()

      const g2 = R.group('热身作答：答错不亮答案、隐藏上次选项，只记第一次；答错回盒子 0 明天再出；到期的答对升级；没到期的答对不改记录')
      const dueQ = p.locator('.warmup .q[data-key="first#0"]')
      const wrong = await answer(dueQ, 'first#0', false)
      g2.ok(await dueQ.locator('.opt.right').count() === 0 && await dueQ.locator('.explain.ok').count() === 0, '答错：不亮正确答案，不显示解析')
      g2.ok(/不对/.test(await dueQ.locator('.explain.no').innerText()) && await dueQ.locator('button.retry').count() === 1, '答错：提示再试')
      let srs = (await read(p)).__srs
      g2.ok(srs['first#0'].box === 0 && srs['first#0'].n === 2 && Math.abs(srs['first#0'].due - (T0 + DAY)) < 5000, '答错：回盒子 0，明天再出（' + JSON.stringify(srs['first#0']) + '）')
      await dueQ.locator('button.retry').click()
      g2.ok(await dueQ.locator('.opt.gone').count() === 1 && (await dueQ.locator('.opt.gone').getAttribute('data-oi')) === String(wrong), '重试：隐藏了上次选错的那一项')
      await answer(dueQ, 'first#0', true)
      g2.ok(await dueQ.locator('.opt.right').count() === 1 && await dueQ.locator('.explain.ok').count() === 1, '答对：显示正确项和解析')
      g2.ok(await dueQ.locator('.src a').count() === 1, '解析后给出出处，链回那一章')
      srs = (await read(p)).__srs
      g2.ok(srs['first#0'].n === 2 && srs['first#0'].box === 0, '重试答对不再记录（只记第一次）')
      const prevKey = keys.find(k => k.startsWith('refs#'))
      const prevQ = p.locator('.warmup .q[data-key="' + prevKey + '"]')
      const before = JSON.stringify((await read(p)).__srs[prevKey])
      await answer(prevQ, prevKey, true)
      g2.ok(JSON.stringify((await read(p)).__srs[prevKey]) === before, '没到期的卡答对：盒子、到期时间、次数都不变')
      g2.end()

      const g3 = R.group('热身：到期的卡答对升级；12 小时内答过的卡不出')
      await seed(p, base, { __srs: { 'first#1': card(1, T0 - DAY, T0 - 2 * DAY) } })
      await p.goto(base + '/chapters/04-computed.html'); await p.waitForSelector('.warmup .q'); await p.waitForTimeout(300)
      await answer(p.locator('.warmup .q[data-key="first#1"]'), 'first#1', true)
      const c = (await read(p)).__srs['first#1']
      g3.ok(c.box === 2 && c.n === 2 && Math.abs(c.due - (T0 + 3 * DAY)) < 5000, '到期的卡答对：升到盒子 2，3 天后到期（' + JSON.stringify(c) + '）')
      await seed(p, base, { __srs: { 'first#0': card(1, T0 - DAY, T0 - 2 * HOUR), 'refs#0': card(1, T0 + DAY, T0 - 11 * HOUR) } })
      await p.goto(base + '/chapters/04-computed.html'); await p.waitForSelector('.chapter-foot'); await p.waitForTimeout(500)
      g3.ok(await p.locator('.warmup').count() === 0, '题都是 12 小时内答过的：不出，整块不显示')
      g3.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g3.end()
    }

    // ---------- 自我解释 ----------
    {
      const g = R.group('自我解释：小结块默认隐藏；不足 30 个有效字不能对照（凑字不算）；写够后展示小结要点；内容存进 note，标记 sx；刷新后保持；不影响章完成')
      const p = await site.newPage()
      await seed(p, base, {})
      await p.goto(base + '/chapters/03-refs.html'); await p.waitForSelector('.selfx'); await p.waitForTimeout(500)
      const hiddenSummary = await p.evaluate(() => { const s = document.querySelector('.vp-doc .summary'); return !!s && getComputedStyle(s).display === 'none' })
      g.ok(hiddenSummary, '章里的小结块默认隐藏')
      g.ok(await p.evaluate(() => { const a = document.querySelector('.selfx'), b = document.querySelector('.chapter-foot'); return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) }), '自我解释在掌握标准条之前')
      const ta = p.locator('.selfx textarea'), btn = p.locator('.selfx [data-a="sx-reveal"]')
      g.ok(await btn.isDisabled() && /再写 30 个字/.test(await p.locator('.selfx .sx-count').innerText()), '什么也没写：按钮禁用，写明还差 30 个字')
      await ta.fill('啊'.repeat(40))
      g.ok(await btn.isDisabled(), '凑字（重复同一个字）不能展开')
      await ta.fill('ref 是一个带 value 属性的响应式容器，脚本里要读写 .value，模板里会自动解包，所以不用写 .value；reactive 返回的代理不能整个替换，也不能解构。')
      g.ok(await btn.isEnabled() && await p.locator('.selfx .sx-keys').count() === 0, '写够 30 个有效字：按钮可用，点之前还没有要点')
      await btn.click()
      const keysTxt = await p.locator('.selfx .sx-keys').innerText()
      const nLi = await p.locator('.selfx .sx-summary li').count()
      g.ok(nLi >= 2 && /参考要点/.test(keysTxt), '点了对照：显示参考要点（本章小结，' + nLi + ' 条）')
      const rec = (await read(p)).refs
      g.ok(rec.sx === true && /ref 是一个带 value/.test(rec.note) && !rec.done, '进度：note 已存、sx 为真，章没有因此完成 ' + JSON.stringify({ sx: rec.sx, done: rec.done }))
      g.ok(!/已完成/.test(await p.locator('.chapter-foot .cf-state').innerText()), '自我解释不是章完成的条件：章末条仍未完成')
      await p.reload(); await p.waitForSelector('.selfx'); await p.waitForTimeout(600)
      g.ok((await p.locator('.selfx textarea').inputValue()).startsWith('ref 是一个带 value') && await p.locator('.selfx .sx-summary li').count() === nLi, '刷新后：文字还在，要点保持展开')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g.end()
    }
  } finally {
    await site.stop()
  }
  console.log(R.bad ? '有 ' + R.bad + ' 项失败' : '全部通过')
  process.exit(R.bad ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
