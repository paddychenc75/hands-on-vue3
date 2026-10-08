// 学习机制的浏览器测试（参考 hands-on-react 的 tests/e2e/mechanics.mjs，每一项都对应 AGENTS 的“学习机制”）：
//   提示阶梯、课前热身、自我解释、复习页、阶段测验、手机宽度无横向滚动。
// 用法：node tests/site/mechanics.test.js     （用 course/.vitepress/dist，要先 npm run build；或 COURSE_OUT_DIR=<已构建目录>）
// 时间用 Playwright 的 page.clock.setFixedTime 控制，不真的等几分钟；进度先用 seed 写进单个 localStorage 键。
const { makeReporter, startSite, loadChapters, loadExercises, loadQuestions, loadStages, seed, read, STORE_KEY } = require('./helpers')

const R = makeReporter()
const { STAGE_COUNT } = loadStages()
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
      // 现在每道练习都有 faded（validate 强制必填），所以临时去掉它，验证“没有半成品时阶梯只有两级”这条规则
      await box.evaluate(r => r.__setFaded(undefined))
      const hint = box.locator('[data-a="hint"]'), sol = box.locator('[data-a="sol"]')
      g.ok(await box.locator('[data-a="faded"]').count() === 0, '临时去掉 faded：没有半成品这一级')
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
      const g = R.group('半成品示例（临时换一份 faded）：失败 2 次且 2 分钟解锁；填入编辑器，原来的代码可以找回')
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

    // ---------- 今日复习页 ----------
    {
      const g = R.group('复习页：没有学过的题时是空状态；侧边栏有“今日复习”入口，徽标是到期题数')
      const p = await site.newPage()
      await seed(p, base, {})
      await p.clock.setFixedTime(T0)
      await p.goto(base + '/review.html'); await p.waitForSelector('.review .done-card'); await p.waitForTimeout(300)
      g.ok(/还没有需要复习的题目/.test(await p.locator('.review').innerText()), '空状态：还没有需要复习的题目')
      g.ok(await p.locator('.VPSidebar a[href$="/review.html"]').count() === 1, '侧边栏有今日复习入口')
      const sideTop = await p.$$eval('.VPSidebar .VPSidebarItem.level-0:first-child a .text, .VPSidebar .group:first-child a .text', es => es.slice(0, 2).map(e => e.textContent.trim()))
      g.ok(sideTop[0] === '今日复习', '入口在侧边栏最上面 ' + sideTop)
      g.ok(await p.locator('.VPSidebar .text[data-badge]').count() === 0, '没有到期的题时没有徽标')
      g.end()

      const g2 = R.group('今日复习：只出到期的卡；答对到期的升级，答错回盒子 0 明天再出；没到期的卡不出、不改；做完有结果和下次到期时间')
      const old = T0 - 3 * DAY
      // 三张到期（不同章），一张没到期
      await seed(p, base, { __srs: {
        'first#0': card(1, T0 - 2 * DAY, old), 'refs#1': card(2, T0 - DAY, old), 'template#2': card(0, T0 - HOUR, old), 'computed#0': card(1, T0 + 5 * DAY, old)
      } })
      await p.goto(base + '/review.html'); await p.waitForSelector('.review .q'); await p.waitForTimeout(400)
      g2.ok(await p.locator('.VPSidebar .text[data-badge="3"]').count() === 1, '侧边栏徽标：3 道到期')
      g2.ok(/今日复习 · 第 1 \/ 3 题/.test(await p.locator('.rv-progress').innerText()), '进度：第 1 / 3 题')
      const seen = []
      const planned = { 'first#0': true, 'refs#1': false, 'template#2': true }
      for (let n = 0; n < 3; n++) {
        const q = p.locator('.review .q')
        const key = await q.getAttribute('data-key')
        seen.push(key)
        g2.ok(key in planned, '出的是到期的题：' + key)
        g2.ok(await q.locator('.explain').count() === 0, key + '：作答前没有解析')
        await answer(q, key, planned[key])
        g2.ok(await q.locator('.opt.right').count() === 1 && await q.locator('.explain').count() === 1, key + '：选一次就显示对错和解析')
        g2.ok(await q.locator('.src a').count() === 1 && /出自第 \d+ 章/.test(await q.locator('.src').innerText()), key + '：标出来自哪一章并链接回去')
        await p.locator('[data-a="next"]').click()
        await p.waitForTimeout(150)
      }
      g2.ok(new Set(seen).size === 3 && !seen.includes('computed#0'), '三道到期的都出了，没到期的 computed#0 没出')
      const srs = (await read(p)).__srs
      g2.ok(srs['first#0'].box === 2 && Math.abs(srs['first#0'].due - (T0 + 3 * DAY)) < 5000, '到期答对：盒子 1 → 2，3 天后到期（' + JSON.stringify(srs['first#0']) + '）')
      g2.ok(srs['refs#1'].box === 0 && Math.abs(srs['refs#1'].due - (T0 + DAY)) < 5000, '答错：回盒子 0，明天再出（' + JSON.stringify(srs['refs#1']) + '）')
      g2.ok(srs['template#2'].box === 1 && Math.abs(srs['template#2'].due - (T0 + DAY)) < 5000, '盒子 0 的到期卡答对：升到盒子 1，1 天后（' + JSON.stringify(srs['template#2']) + '）')
      g2.ok(JSON.stringify(srs['computed#0']) === JSON.stringify(card(1, T0 + 5 * DAY, old)), '没到期的卡没有被改')
      const doneTxt = await p.locator('.review .done-card').innerText()
      g2.ok(/今日复习完成：答对 2 \/ 3/.test(doneTxt), '完成状态：答对 2 / 3')
      g2.ok(/下一批题目在 1 天后到期/.test(doneTxt) && /答错的题明天会再出现/.test(doneTxt), '完成状态：写明下次到期时间和答错的会再出现 ' + doneTxt.replace(/\n/g, ' '))
      g2.ok(await p.locator('.VPSidebar .text[data-badge]').count() === 0, '做完后徽标消失')
      g2.end()

      const g3 = R.group('没有到期的：显示“都复习完了”和下次到期时间；混合练习从学过的卡里抽，没到期答对不改记录，答错回盒子 0')
      await seed(p, base, { __srs: {
        'first#0': card(2, T0 + 3 * DAY, old), 'first#1': card(3, T0 + 7 * DAY, old), 'refs#0': card(1, T0 + 2 * DAY, old)
      } })
      await p.goto(base + '/review.html'); await p.waitForSelector('.review .done-card'); await p.waitForTimeout(300)
      const t = await p.locator('.review .done-card').innerText()
      g3.ok(/今天该复习的都复习完了/.test(t) && /已学过 3 道题/.test(t) && /下一批题目在 2 天后到期/.test(t), '空闲状态：已学过 3 道，2 天后到期 ' + t.replace(/\n/g, ' '))
      await p.locator('[data-a="mixed"]').click()
      await p.waitForSelector('.review .q')
      g3.ok(/混合练习 · 第 1 \/ 3 题/.test(await p.locator('.rv-progress').innerText()), '混合练习：学过的 3 道都抽出来')
      const before = (await read(p)).__srs
      const plan = {}
      let wrongKey = null
      for (let n = 0; n < 3; n++) {
        const q = p.locator('.review .q')
        const key = await q.getAttribute('data-key')
        const right = n < 2
        if (!right) wrongKey = key
        await answer(q, key, right)
        await p.locator('[data-a="next"]').click()
        await p.waitForTimeout(150)
      }
      const after = (await read(p)).__srs
      const keys = Object.keys(before)
      const rightKeys = keys.filter(k => k !== wrongKey)
      g3.ok(rightKeys.every(k => JSON.stringify(after[k]) === JSON.stringify(before[k])), '没到期的卡答对：盒子、到期时间、次数都不变')
      g3.ok(after[wrongKey].box === 0 && after[wrongKey].n === before[wrongKey].n + 1 && Math.abs(after[wrongKey].due - (T0 + DAY)) < 5000, '没到期的卡答错：照样回盒子 0，明天再出（' + JSON.stringify(after[wrongKey]) + '）')
      g3.ok(/混合练习完成：答对 2 \/ 3/.test(await p.locator('.review .done-card').innerText()), '混合练习的结果')
      g3.end()

      const g4 = R.group('章内自测题的题干里带代码块：在复习页正常渲染（高亮的代码块，不是源码文字）')
      const withCode = CH.flatMap(c => c.selfchecks.map((s, i) => ({ c, i, s }))).find(x => /```/.test(x.s.stemSrc))
      const key = withCode.c.id + '#' + withCode.i
      await seed(p, base, { __srs: { [key]: card(1, T0 - DAY, old) } })
      await p.goto(base + '/review.html'); await p.waitForSelector('.review .q'); await p.waitForTimeout(300)
      g4.ok(await p.locator('.review .q .q-stem div[class*="language-"] pre').count() >= 1, '题干里有渲染好的代码块（' + key + '）')
      g4.ok(!/```/.test(await p.locator('.review .q-stem').innerText()), '页面上没有出现 ``` 源码标记')
      g4.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g4.end()
    }

    {
      const g = R.group('首页的复习入口：显示今日到期数和进入按钮；“N 道题在复习中”统计；没有到期时换成混合练习入口')
      const p = await site.newPage()
      const old = T0 - 3 * DAY
      await seed(p, base, { __srs: { 'first#0': card(1, T0 - DAY, old), 'refs#1': card(2, T0 - HOUR, old), 'computed#0': card(1, T0 + 5 * DAY, old) } })
      await p.clock.setFixedTime(T0)
      await p.goto(base + '/'); await p.waitForSelector('#reviewEntry'); await p.waitForTimeout(300)
      g.ok(/今日复习：2 道题到期/.test(await p.locator('#reviewEntry').innerText()), '今日复习：2 道题到期 ' + await p.locator('#reviewEntry').innerText())
      g.ok(/开始复习/.test(await p.locator('#reviewLink').innerText()) && /\/review/.test(await p.locator('#reviewLink').getAttribute('href')), '有“开始复习”按钮，指向复习页')
      g.ok((await p.locator('#statReview b').innerText()) === '3', '“3 道题在复习中”统计')
      await seed(p, base, { __srs: { 'first#0': card(1, T0 + DAY, old) } })
      await p.goto(base + '/'); await p.waitForSelector('#reviewEntry'); await p.waitForTimeout(300)
      g.ok(/今天没有到期的题，已学过 1 道/.test(await p.locator('#reviewEntry').innerText()) && /混合练习/.test(await p.locator('#reviewLink').innerText()), '没有到期的：说明已学过几道，入口换成混合练习')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g.end()
    }

    // ---------- 阶段测验 ----------
    const STAGE1 = CH.filter(c => c.stage === 1).map(c => c.id)
    const Q = loadQuestions()
    const freshCount = Q.filter(row => STAGE1.includes(row[3])).length
    /** 在阶段测验页上依次作答所有题：rightN 道答对，其余答错（前面的答错）。返回每题的 key 和是否答对 */
    async function answerAll(p, rightN) {
      const keys = await p.$$eval('.quiz .q', es => es.map(e => e.dataset.key))
      const plan = keys.map((k, i) => ({ key: k, right: i >= keys.length - rightN }))
      for (let i = 0; i < plan.length; i++) await answer(p.locator('.quiz .q').nth(i), plan[i].key, plan[i].right)
      await p.waitForTimeout(300)
      return plan
    }
    {
      const g = R.group('阶段测验：12 题（8 道专用题 + 4 道常规题）；交卷前不显示对错和解析；每题只选一次')
      const p = await site.newPage()
      await seed(p, base, {})
      await p.clock.setFixedTime(T0)
      await p.goto(base + '/check/1.html'); await p.waitForSelector('.quiz .q'); await p.waitForTimeout(400)
      g.ok(await p.locator('.vp-doc h1').innerText().then(t => t.includes('入门阶段测验')), '标题：入门阶段测验')
      const keys = await p.$$eval('.quiz .q', es => es.map(e => e.dataset.key))
      g.ok(keys.length === 12, '12 题：' + keys.length)
      const nFresh = keys.filter(k => /#c\d+$/.test(k)).length
      g.ok(nFresh === Math.min(8, freshCount) && keys.every(k => STAGE1.includes(k.split('#')[0])), '8 道专用题（#cN）+ 4 道常规题，都来自本阶段的章：专用 ' + nFresh)
      g.ok(/交卷模式：每题选一次，全部答完后统一显示对错和解析。中途离开按未通过记录。/.test(await p.locator('.check-rule').innerText()), '有交卷模式说明')
      for (let i = 0; i < 5; i++) await answer(p.locator('.quiz .q').nth(i), keys[i], true)
      g.ok(await p.locator('.quiz .opt.right').count() === 0 && await p.locator('.quiz .opt.wrong').count() === 0 && await p.locator('.quiz .explain').count() === 0, '答了 5 题：交卷前不显示对错和解析')
      g.ok(await p.locator('.quiz .q').nth(0).locator('.opt:not([disabled])').count() === 0, '每题只选一次：选过的题不能再改')
      g.ok(await p.locator('.quiz .done-card').count() === 0, '没答完不出结果')
      g.ok(await p.locator('.VPSidebar a[href*="/check/1"]').getAttribute('data-check') === 'none', '正在答题时侧边栏不显示未通过')
      g.end()

      const g2 = R.group('中途离开算未通过：按已答的题计分，没答的算错；进入冷却，写明还要等多久；30 分钟后可以重测')
      const rec0 = (await read(p)).__stage?.[1]
      g2.ok(rec0?.pending?.answered === 5 && rec0.pending.n === 12 && rec0.pending.right === 5, '每答一题记下进度（pending）：' + JSON.stringify(rec0?.pending))
      await p.reload(); await p.waitForSelector('.quiz .done-card'); await p.waitForTimeout(400)
      const txt = await p.locator('.quiz').innerText()
      g2.ok(/上次测验答了 5\/12 题就离开了，按“未通过”记录/.test(txt), '进入页面时结算：说明答了 5/12 题就离开')
      g2.ok(/先复习，30 分钟后可以重测/.test(txt), '冷却：写明还要等 30 分钟 ' + txt.replace(/\n/g, ' ').slice(0, 160))
      g2.ok(await p.locator('.quiz .q').count() === 0, '冷却中不出题')
      const rec = (await read(p)).__stage[1]
      g2.ok(rec.passed === false && rec.last === 42 && !rec.pending && rec.failedAt > 0, '记为未通过：5/12 = 42%，没有 pending（' + JSON.stringify(rec) + '）')
      g2.ok(await p.locator('.VPSidebar a[href*="/check/1"]').getAttribute('data-check') === 'cooling', '侧边栏的阶段测验显示未通过（冷却中）')
      await p.clock.setFixedTime(T0 + 10 * MIN)
      await p.reload(); await p.waitForSelector('.quiz .done-card'); await p.waitForTimeout(300)
      g2.ok(/先复习，\d+ 分钟后可以重测/.test(await p.locator('.quiz').innerText()) && !/先复习，30 分钟/.test(await p.locator('.quiz').innerText()), '过了 10 分钟：还要等的时间变短 ' + (await p.locator('.quiz .done-card b').innerText()))
      await p.clock.setFixedTime(Date.now() + 25 * MIN)
      await p.reload(); await p.waitForSelector('.quiz .q'); await p.waitForTimeout(300)
      g2.ok(await p.locator('.quiz .q').count() === 12, '过了 30 分钟：可以重测，再出 12 题')
      g2.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g2.end()
    }
    {
      const g = R.group('阶段测验：答对 10 题（83%）通过；全部答完才统一显示对错和解析；通过后清掉 weak；答错的题进入复习队列')
      const p = await site.newPage()
      await seed(p, base, { __stage: { 1: { passed: false, failedAt: T0 - HOUR, last: 50, best: 50, weak: ['refs', 'computed'] } } })
      await p.clock.setFixedTime(T0)
      await p.goto(base + '/check/1.html'); await p.waitForSelector('.quiz .q'); await p.waitForTimeout(400)
      const plan = await answerAll(p, 10) // 10 对 2 错
      g.ok(await p.locator('.quiz .opt.right').count() === 12, '全部答完：统一显示 12 题的正确答案')
      g.ok(await p.locator('.quiz .opt.wrong').count() === 2 && await p.locator('.quiz .explain').count() === 12, '2 道错选标红，12 道题都有解析')
      const done = await p.locator('.quiz .done-card').innerText()
      g.ok(/已掌握入门阶段：答对 10\/12（83%）/.test(done), '通过：10/12 = 83% ' + done.replace(/\n/g, ' ').slice(0, 80))
      g.ok(/答错的题：第 1 题、第 2 题/.test(done), '列出答错的题（链接到那一题）')
      const wrongKeys = plan.filter(x => !x.right).map(x => x.key)
      const weakIds = [...new Set(wrongKeys.map(k => k.split('#')[0]))]
      const weakShown = await p.locator('.quiz .done-card .wrong-list').nth(1).locator('a').allInnerTexts()
      g.ok(weakShown.length === weakIds.length && weakIds.every(id => weakShown.includes(CH.find(c => c.id === id).title)), '“需要加强的章”：' + weakShown + '（应为 ' + weakIds + '）')
      g.ok(await p.locator('.quiz .done-card .wrong-list').nth(1).locator('a').first().getAttribute('href').then(h => /\/chapters\//.test(h)), '需要加强的章链接回那一章')
      const st = await read(p)
      const rec = st.__stage[1]
      g.ok(rec.passed === true && rec.last === 83 && rec.best === 83 && !rec.weak && !rec.failedAt && !rec.pending && rec.passedAt === T0, '以最近一次为准：通过，清掉 weak 和 failedAt（' + JSON.stringify(rec) + '）')
      g.ok(wrongKeys.every(k => st.__srs[k] && st.__srs[k].box === 0 && Math.abs(st.__srs[k].due - (T0 + DAY)) < 5000), '答错的题进入复习队列：回盒子 0，明天再出')
      g.ok(await p.locator('.VPSidebar a[href*="/check/1"]').getAttribute('data-check') === 'passed', '侧边栏的阶段测验显示通过 ✓')
      await p.locator('.quiz [data-a="again"]').click(); await p.waitForTimeout(500)
      g.ok(await p.locator('.quiz .q').count() === 12 && await p.locator('.quiz .opt.right').count() === 0, '“换一组题再测”：重新出 12 题，不显示答案')
      await p.goto(base + '/'); await p.waitForSelector('.stage'); await p.waitForTimeout(400)
      g.ok(/已通过/.test(await p.locator('.stage[data-stage="1"] li.aside.check').innerText()), '首页第 1 个阶段卡片上显示已通过')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g.end()

      const g2 = R.group('阶段测验：答对 9 题（75%）不通过；写明还差一点和冷却；通过 35 天后提示复测；最近一次未通过会覆盖之前的通过')
      await seed(p, base, { __stage: { 1: { passed: true, passedAt: T0 - 5 * DAY, last: 92, best: 92 } } })
      await p.goto(base + '/check/1.html'); await p.waitForSelector('.quiz .q'); await p.waitForTimeout(300)
      g2.ok(await p.locator('.quiz .lesson-sum').count() === 0, '通过没到 35 天：不提示复测')
      await answerAll(p, 9)
      let rec2 = (await read(p)).__stage[1]
      g2.ok(/还差一点：答对 9\/12（75%）/.test(await p.locator('.quiz .done-card').innerText()), '未通过：还差一点 9/12')
      g2.ok(rec2.passed === false && rec2.best === 92 && rec2.last === 75 && rec2.weak.length >= 1 && rec2.failedAt === T0, '以最近一次为准：通过过，后来没通过，记为未通过；最好成绩仍是 92（' + JSON.stringify(rec2) + '）')
      await seed(p, base, { __stage: { 1: { passed: true, passedAt: T0 - 36 * DAY, last: 92, best: 92 } } })
      await p.goto(base + '/check/1.html'); await p.waitForSelector('.quiz .q'); await p.waitForTimeout(300)
      g2.ok(/你在 36 天前通过了这个阶段.*建议再测一次/.test(await p.locator('.quiz .lesson-sum').innerText()), '通过 36 天后：提示复测')
      g2.ok(await p.locator('.VPSidebar a[href*="/check/1"]').getAttribute('data-check') === 'retest', '侧边栏显示该复测')
      g2.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g2.end()
    }
    {
      const g = R.group('各阶段测验页都能抽满 12 题，标题和 stages.ts 一致')
      const p = await site.newPage()
      await seed(p, base, {})
      const names = ['入门', '进阶', '生态与实战', '响应式原理', '渲染原理', '架构与工程']   // 与 course/stages.ts 的 name 一致
      for (let i = 1; i <= STAGE_COUNT; i++) {
        await p.goto(base + '/check/' + i + '.html'); await p.waitForSelector('.quiz .q'); await p.waitForTimeout(250)
        g.ok(await p.locator('.quiz .q').count() === 12, '阶段 ' + i + ' 抽满 12 题')
        g.ok((await p.locator('.vp-doc h1').innerText()).includes(names[i - 1] + '阶段测验'), '阶段 ' + i + ' 标题 ' + names[i - 1])
      }
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g.end()
    }

    // ---------- 长代码的编辑器限高 ----------
    {
      const g = R.group('长代码的编辑器限高：约 24 行（手机上不超过屏高的 70%）后在编辑器内部滚动，短代码不受影响')
      for (const [label, vp, maxH] of [['桌面', { width: 1280, height: 800 }, 520], ['手机', { width: 390, height: 844 }, Math.round(844 * 0.7) + 2]]) {
        const p = await site.newPage({ viewport: vp })
        const box = await openExercise(p, base, '31-runtime', 'miniMount')
        const r = await box.evaluate(el => {
          const eds = [...el.querySelectorAll('.cm-editor')].map(e => ({ h: Math.round(e.getBoundingClientRect().height), sh: e.querySelector('.cm-scroller').scrollHeight, ch: e.querySelector('.cm-scroller').clientHeight }))
          const sc = el.querySelectorAll('.cm-scroller')[1]
          sc.scrollTop = sc.scrollHeight
          return { eds, top: sc.scrollTop }
        })
        const [tpl, js] = r.eds
        g.ok(js.h <= maxH, label + '：333 行的脚本编辑器高度 ' + js.h + 'px，不超过 ' + maxH + 'px')
        g.ok(js.sh > js.ch + 100, label + '：脚本编辑器内容比可见高度高（' + js.sh + ' > ' + js.ch + '），在内部滚动')
        g.ok(r.top > 0, label + '：脚本编辑器可以滚到底（scrollTop ' + Math.round(r.top) + '）')
        g.ok(tpl.h < 200, label + '：4 行的模板编辑器不受影响（' + tpl.h + 'px）')
        // 滚到底之后，页面本身没有被带着横向溢出，编辑器里还能键入
        await box.locator('.cm-content').nth(1).click()
        await p.keyboard.press('ControlOrMeta+End'); await p.keyboard.type('// 末尾')
        g.ok((await box.evaluate(el => el.querySelectorAll('.cm-content')[1].textContent)).includes('// 末尾'), label + '：滚动后仍能在编辑器末尾键入')
        g.ok(p.errs.length === 0, label + '：没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      }
      g.end()
    }

    // ---------- 手机宽度 ----------
    {
      const g = R.group('390px 宽下没有横向滚动：首页、复习页（含出题中）、各阶段测验页（含交卷后）、章页（有热身和自我解释）')
      const p = await site.newPage({ viewport: { width: 390, height: 844 } })
      const wide = []
      const old = T0 - 3 * DAY
      const srs = { 'first#0': card(1, T0 - DAY, old), 'refs#1': card(1, T0 - DAY, old), 'template#0': card(1, T0 + DAY, old), 'refs#0': card(1, T0 + DAY, old) }
      await seed(p, base, { __srs: srs })
      await p.clock.setFixedTime(T0)
      const pages = [['/', '.home'], ['/review.html', '.review .q'], ...Array.from({ length: STAGE_COUNT }, (_, k) => k + 1).map(i => ['/check/' + i + '.html', '.quiz .q']), ['/chapters/04-computed.html', '.warmup .q'], ['/chapters/03-refs.html', '.selfx']]
      for (const [u, sel] of pages) {
        await p.goto(base + u); await p.waitForSelector(sel, { timeout: 15000 }); await p.waitForTimeout(300)
        if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) wide.push(u)
      }
      // 复习页作答后、阶段测验交卷后（解析和代码块都出来了）
      await p.goto(base + '/review.html'); await p.waitForSelector('.review .q')
      const rk = await p.locator('.review .q').getAttribute('data-key')
      await answer(p.locator('.review .q'), rk, false); await p.waitForTimeout(200)
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) wide.push('/review.html（答错后）')
      await seed(p, base, {})
      await p.goto(base + '/check/2.html'); await p.waitForSelector('.quiz .q'); await p.waitForTimeout(300)
      await answerAll(p, 8)
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) wide.push('/check/2.html（交卷后）')
      g.ok(!wide.length, '没有横向滚动' + (wide.length ? '：' + wide.join(', ') : ''))
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g.end()
    }
    {
      // 全部复习卡(章内自测 + 阶段测验专用题)逐题在 390px 下渲染,答前和答后(解析出来)都不能撑宽页面或题目卡片。
      // 阶段测验每次随机抽题,只靠抽样会等到某次抽到过宽的题才发现;复习页和阶段测验用同一个 Question 组件,这里一次查全。
      const g = R.group('390px 宽下全部复习卡逐题渲染:题干、选项、解析里的长行内代码和代码块不撑宽页面')
      const p = await site.newPage({ viewport: { width: 390, height: 844 } })
      const keys = Object.keys(require('../../course/card-keys.snapshot.json').cards)
      const srs = {}
      for (const k of keys) srs[k] = card(1, T0 - DAY, T0 - 3 * DAY)
      await seed(p, base, { __srs: srs })
      await p.clock.setFixedTime(T0)
      const measure = () => p.evaluate(() => {
        const q = document.querySelector('.review .q'); if (!q) return null
        const qr = q.getBoundingClientRect()
        const clipped = el => { for (let a = el.parentElement; a && a !== q; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true } return false }
        const out = []
        q.querySelectorAll('*').forEach(el => { const b = el.getBoundingClientRect(); if (b.width > 0 && b.right > qr.right + 1 && !clipped(el)) out.push(el.tagName.toLowerCase()) })
        // 纯文本题库里的 `反引号` 要渲染成 code，不能原样显示（代码块里的反引号不算）
        const c = q.cloneNode(true); c.querySelectorAll('pre, .code').forEach(e => e.remove())
        return { key: q.dataset.key, page: document.documentElement.scrollWidth - innerWidth, q: q.scrollWidth - q.clientWidth, out: out.length, tick: c.textContent.includes('`') }
      })
      const bad = []; const seen = new Set()
      await p.goto(base + '/review.html')
      for (let guard = 0; guard < keys.length + 50; guard++) {
        await p.waitForSelector('.review .q, .review .done-card', { timeout: 15000 })
        if (!(await p.$('.review .q'))) { const more = await p.$('[data-a=more]'); if (more) { await more.click(); continue } break }
        const a = await measure()
        await p.locator('.review .q .opt').first().click()
        const b = await measure()
        seen.add(a.key)
        for (const [when, m] of [['答前', a], ['答后', b]]) if (m.page > 0 || m.q > 0 || m.out) bad.push(m.key + ' ' + when)
        if (b.tick) bad.push(b.key + ' 显示了字面的反引号')
        const nx = await p.$('[data-a=next]'); if (nx) await nx.click()
      }
      g.ok(seen.size === keys.length, '渲染了全部 ' + keys.length + ' 道卡片(实际 ' + seen.size + ')')
      g.ok(!bad.length, '没有溢出' + (bad.length ? ':' + bad.slice(0, 8).join(', ') : ''))
      g.end()
    }
    for (const [title, chapters] of [
      ['第 19、23、29、30、31、32、34、36、40 章', ['29-compiler', '30-diff', '31-runtime', '34-patterns', '19-state-arch', '36-ssr', '32-renderer', '40-perf-clinic', '23-project']],
      ['第 24–28、33、38、39、41 章', ['24-reactivity', '25-scheduler', '28-render', '26-watch-impl', '27-reactivity-pitfalls', '33-builtins-impl', '38-errors', '39-forms-arch', '41-lib']],
    ]) {
      // 深度补强和新写的章：练习编辑器和实验台都挂载、深入块展开之后，页面不能被撑宽；
      // 也不能有没被任何可滚动容器包住、却伸出窗口右边的元素（页面本身 overflow 被裁掉时 scrollWidth 看不出来）
      const g = R.group('390px 宽下没有横向滚动：' + title + '（编辑器和实验台挂载后，深入块展开）')
      const p = await site.newPage({ viewport: { width: 390, height: 844 } })
      const wide = []
      for (const c of chapters) {
        await p.goto(base + '/chapters/' + c + '.html'); await p.waitForSelector('.vp-doc h1')
        await p.waitForSelector('.ex[data-ex] .cm-content', { timeout: 20000 }).catch(() => {})
        await p.waitForTimeout(1500)
        await p.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true }))
        await p.waitForTimeout(400)
        const r = await p.evaluate(() => {
          const w = innerWidth
          const clipped = el => { for (let q = el.parentElement; q && q !== document.body; q = q.parentElement) { const o = getComputedStyle(q).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true } return false }
          const out = []
          document.querySelectorAll('.vp-doc *').forEach(el => { const b = el.getBoundingClientRect(); if (b.width > 0 && b.right > w + 1 && !clipped(el) && getComputedStyle(el).position !== 'fixed') out.push(el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 30)) })
          return { over: document.documentElement.scrollWidth - w, out: out.slice(0, 3), editors: document.querySelectorAll('.cm-editor').length }
        })
        if (r.over > 0 || r.out.length || !r.editors) wide.push(c + '（页面多出 ' + r.over + 'px，伸出的元素：' + r.out.join(',') + '，编辑器 ' + r.editors + ' 个）')
      }
      g.ok(!wide.length, '没有横向溢出' + (wide.length ? '：' + wide.join('；') : ''))
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g.end()
    }
  } finally {
    await site.stop()
  }
  console.log(R.bad ? '有 ' + R.bad + ' 项失败' : '全部通过')
  process.exit(R.bad ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
