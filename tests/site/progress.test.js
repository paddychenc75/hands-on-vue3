// 跨章学习功能的测试：章节完成、总进度、继续学习、间隔复习、类比/深入开关、图片放大。
// 用法：node tests/site/progress.test.js     （用 course/.vitepress/dist，要先 npm run build）
// 进度都是写 localStorage（键前缀 vue3deep:），所以大部分用例先 seed 写好进度，再打开页面看结果。
const { makeReporter, startSite, loadChapters, loadExercises, loadQuestions, seed, read } = require('./helpers')

const DAY = 864e5
const R = makeReporter()
const CH = loadChapters()
const EX = loadExercises()
const Q = loadQuestions()
const byId = id => CH.find(c => c.id === id)

/** 综合测验页上，一个题目框里哪个选项是对的（返回按钮序号）。q 题的正确答案是题库里第一个选项，sc 题是 :a */
async function rightIndex(box) {
  const key = await box.getAttribute('data-key')
  if (key.startsWith('s:')) {
    const [cid, i] = key.slice(2).split(':')
    return byId(cid).selfchecks[+i].a
  }
  const right = Q[+key.slice(1)][1][0]
  const texts = await box.locator('.opt').allTextContents()
  return texts.findIndex(t => t.replace(/^[A-Z]\.\s*/, '').trim() === right.trim())
}

async function chapterState(p) { return p.locator('.chapter-foot').getAttribute('data-state') }
async function waitState(p, st) {
  await p.waitForFunction(s => document.querySelector('.chapter-foot')?.getAttribute('data-state') === s, st, { timeout: 8000 }).catch(() => {})
  return chapterState(p)
}

;(async () => {
  const site = await startSite()
  const base = site.base
  try {
    // ---------- 元数据和页面一致 ----------
    {
      const g = R.group('章元数据（自测题数、练习 id）和页面一致：' + CH.length + ' 页')
      const p = await site.newPage()
      for (const c of CH) {
        await p.goto(base + c.link + '.html')
        await p.waitForSelector('.vp-doc h1', { timeout: 10000 })
        await p.waitForTimeout(250)
        const n = await p.$$eval('.vp-doc .sc:not(.predict)', es => es.length)
        const ex = await p.$$eval('.vp-doc .ex[data-ex]', es => es.map(e => e.dataset.ex))
        g.ok(n === c.scCount, `${c.file} 自测 ${n} ≠ ${c.scCount}`)
        g.ok(JSON.stringify(ex) === JSON.stringify(c.ex), `${c.file} 练习 ${ex} ≠ ${c.ex}`)
      }
      g.end()
    }

    // ---------- 首页 ----------
    {
      const g = R.group('首页：学习路线说明、四个阶段、27 章、全部未开始')
      const p = await site.newPage()
      await seed(p, base, {})
      await p.goto(base + '/')
      await p.waitForSelector('.stage li')
      const txt = await p.locator('.home').innerText()
      g.ok(txt.includes('本课程有 4 个阶段：25 章正文、1 个综合实战和一套综合测验。'), '路线说明')
      g.ok(txt.includes('阶段四介绍组件设计模式、Pinia、Router、TypeScript、性能、工程化、SSR 和迁移，并包含一个完整的小项目。'), '路线说明第二句')
      g.ok(await p.locator('details.ste').count() === 1 && await p.locator('#glossary tr').count() === 15, '写作规则和术语表')
      g.ok(await p.locator('.stage').count() === 4, '四个阶段')
      g.ok(await p.locator('.stage li[data-id]').count() === 27, '27 章')
      g.ok(await p.locator('.stage li[data-state="todo"]').count() === 27, '全部未开始')
      g.ok(/已完成 0 \/ 27 章/.test(await p.locator('#progTxt').innerText()), '总进度 0 / 27')
      g.ok(await p.locator('#resumeLink').getAttribute('href').then(h => /01-first/.test(h)), '没有记录时继续学习指向第 1 章')
      g.ok(await p.locator('#review').count() === 0, '没有完成的章时不显示复习提醒')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.join('|'))
      g.end()
    }

    // ---------- 自动完成：答完最后一道自测 ----------
    const first = byId('first')
    const scAll = {}
    first.selfchecks.forEach((s, i) => { scAll['first:' + i] = s.a })
    const exAll = Object.fromEntries(first.ex.map(x => [x, true]))
    {
      const g = R.group('自动完成：练习都过、自测只差最后一道（进行中）；答完后章末、侧边栏、首页都变成已完成')
      const p = await site.newPage()
      const part = { ...scAll }; delete part['first:3']
      await seed(p, base, { sc: part, ex: exAll })
      await p.goto(base + first.link + '.html')
      await p.waitForSelector('.chapter-foot')
      await p.waitForTimeout(300)
      g.ok(await chapterState(p) === 'doing', '差一道时是进行中')
      g.ok(/自测 3\/4 题/.test(await p.locator('.chapter-foot').innerText()), '章末显示自测 3/4')
      g.ok(await read(p, 'done') === null, '还没有 done 记录')
      const last = p.locator('.vp-doc .sc:not(.predict)').nth(3)
      await last.scrollIntoViewIfNeeded()
      await last.locator('.sc-o').nth(first.selfchecks[3].a).click()
      g.ok(await waitState(p, 'done') === 'done', '答完后章末变成已完成')
      g.ok((await read(p, 'done')).first === true, 'done.first = true')
      const at = (await read(p, 'doneAt')).first
      g.ok(Math.abs(Date.now() - at) < 60000, 'doneAt 记了时间')
      g.ok(/已完成/.test(await p.locator('.chapter-foot').innerText()), '章末文字')
      await p.waitForTimeout(300)
      g.ok(await p.locator('.VPSidebar a[href*="01-first"]').getAttribute('data-state') === 'done', '侧边栏这一章有完成标记')
      g.ok(await p.locator('.VPSidebar a[href*="02-template"]').getAttribute('data-state') === 'todo', '侧边栏别的章没有标记')
      await p.goto(base + '/')
      await p.waitForSelector('.stage li')
      g.ok(await p.locator('.stage li[data-id="first"]').getAttribute('data-state') === 'done', '首页这一章已完成')
      g.ok(/已完成 1 \/ 27 章/.test(await p.locator('#progTxt').innerText()), '首页总进度 1 / 27')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.join('|'))
      g.end()
    }

    // ---------- 自动完成：通过最后一道练习 ----------
    {
      const g = R.group('自动完成：自测都答了，通过最后一道练习后标记完成')
      const p = await site.newPage()
      await seed(p, base, { sc: scAll, ex: { [first.ex[0]]: true } })
      await p.goto(base + first.link + '.html')
      await p.waitForSelector('.ex[data-ex] .cm-content', { timeout: 15000 })
      await p.waitForTimeout(500)
      g.ok(await chapterState(p) === 'doing', '差一道练习时是进行中')
      const id = first.ex[1], e = EX[id]
      await p.evaluate(async ([id, tpl, js]) => {
        const r = document.querySelector('.ex[data-ex="' + id + '"]')
        r.scrollIntoView(); r.__setCode(tpl, js); r.querySelector('[data-a="check"]').click()
      }, [id, e.solTpl || e.tpl, e.solJs || e.js])
      g.ok(await waitState(p, 'done') === 'done', '练习通过后变成已完成')
      g.end()
    }
    {
      const g = R.group('练习只是“看过答案后通过”（值 sol）时，不自动完成')
      const p = await site.newPage()
      await seed(p, base, { sc: scAll, ex: { [first.ex[0]]: true, [first.ex[1]]: 'sol' } })
      await p.goto(base + first.link + '.html')
      await p.waitForSelector('.chapter-foot')
      await p.waitForTimeout(400)
      g.ok(await chapterState(p) === 'doing', '仍是进行中')
      g.end()
    }

    // ---------- 手动标记 ----------
    {
      const g = R.group('手动标记完成、取消；取消后不会马上被自动标回；刷新后保持')
      const p = await site.newPage()
      await seed(p, base, { sc: scAll, ex: exAll, done: { first: true }, doneAt: { first: Date.now() } })
      await p.goto(base + first.link + '.html')
      await p.waitForSelector('.chapter-foot')
      await p.waitForTimeout(300)
      g.ok(await chapterState(p) === 'done', '已完成的章打开是已完成')
      await p.locator('.done-btn').click()
      g.ok(await chapterState(p) === 'doing', '取消后回到进行中（自测答过）')
      g.ok(!((await read(p, 'done')) || {}).first, 'done 记录被清掉')
      await p.waitForTimeout(500)
      g.ok(await chapterState(p) === 'doing', '没有被自动标回去')
      await p.reload(); await p.waitForSelector('.chapter-foot'); await p.waitForTimeout(300)
      g.ok(await chapterState(p) === 'doing', '刷新后仍是取消状态')
      await p.locator('.done-btn').click()
      g.ok(await chapterState(p) === 'done', '再点一次：已完成')
      await p.reload(); await p.waitForSelector('.chapter-foot'); await p.waitForTimeout(300)
      g.ok(await chapterState(p) === 'done' && await p.locator('.done-btn').getAttribute('aria-pressed') === 'true', '刷新后保持已完成')
      // 一章什么都没做时手动标记
      await p.goto(base + byId('refs').link + '.html')
      await p.waitForSelector('.chapter-foot'); await p.waitForTimeout(300)
      g.ok(await chapterState(p) === 'todo' || await chapterState(p) === 'doing', '没动过的章不是已完成：' + await chapterState(p))
      await p.locator('.done-btn').click()
      g.ok(await chapterState(p) === 'done', '直接手动标记')
      g.ok(!!(await read(p, 'doneAt')).refs, '手动标记也记 doneAt（复习从它算起）')
      g.end()
    }
    {
      const g = R.group('速查表不计入进度：没有章末状态，首页只给一个链接')
      const p = await site.newPage()
      await seed(p, base, {})
      await p.goto(base + '/chapters/cheat.html')
      await p.waitForSelector('.vp-doc h1')
      g.ok(await p.locator('.chapter-foot').count() === 0, '速查表页没有章末状态')
      await p.goto(base + '/'); await p.waitForSelector('.stage li')
      g.ok(await p.locator('.stage li.aside a').count() === 1, '首页有速查表链接')
      g.end()
    }

    // ---------- 继续学习 ----------
    {
      const g = R.group('继续学习：记住上次的章和小节，首页按钮回到那里')
      const p = await site.newPage()
      await seed(p, base, {})
      const c = byId('comm')
      await p.goto(base + c.link + '.html')
      await p.waitForSelector('.vp-doc h3[id]')
      await p.waitForTimeout(400)
      let last = await read(p, 'last')
      g.ok(last && last.path === c.link && last.anchor === '', '进入这一章就记下章路径')
      const hid = await p.evaluate(() => { const h = document.querySelectorAll('.vp-doc h3[id]')[3]; h.scrollIntoView({ behavior: 'instant' }); return h.id })
      await p.waitForTimeout(1500) // 实验台和编辑器晚挂载会撑高上方内容，等版面稳定后再对一次
      await p.evaluate(id => document.getElementById(id).scrollIntoView({ behavior: 'instant' }), hid)
      await p.mouse.wheel(0, 2) // 用户操作后才记录小节
      await p.waitForFunction(id => { try { return JSON.parse(localStorage.getItem('vue3deep:last')).anchor === id } catch (e) { return false } }, hid, { timeout: 6000 }).catch(() => {})
      last = await read(p, 'last')
      g.ok(last && last.anchor === hid, `记下小节锚点 ${hid}（实际 ${last && last.anchor}）`)
      g.ok(last && /\d+\.\d+/.test(last.h), '记下小节标题：' + (last && last.h))
      await p.goto(base + '/'); await p.waitForSelector('#resumeLink')
      const resumeTxt = await p.locator('#resumeTxt').innerText()
      g.ok(/第 5 章/.test(resumeTxt) && resumeTxt.includes(last.h), '首页写出上次位置：' + resumeTxt)
      g.ok(await p.locator('.stage li[data-id="comm"]').getAttribute('data-state') === 'doing', '读到过的章是进行中')
      await p.locator('#resumeLink').click()
      await p.waitForURL(u => u.pathname.includes('05-comm'), { timeout: 8000 })
      await p.waitForTimeout(3000)
      const info = await p.evaluate(id => ({ hash: decodeURIComponent(location.hash), top: document.getElementById(id)?.getBoundingClientRect().top }), hid)
      g.ok(info.hash === '#' + hid, 'URL 带上小节锚点 ' + info.hash)
      g.ok(info.top != null && info.top > 0 && info.top < 400, '小节标题在屏幕上方 ' + info.top)
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.join('|'))
      g.end()
    }

    // ---------- 间隔复习 ----------
    {
      const g = R.group('间隔复习：到期提示、未到期提示、规则 2/7/30 天')
      const p = await site.newPage()
      const now = Date.now()
      // first、template 完成 3 天（到期）；refs 刚完成；computed 完成 20 天，3 天前复习过一次 n=1（隔 7 天，不到期）；
      // comm 完成 80 天，29 天前复习过 n=2（隔 30 天，不到期）
      await seed(p, base, {
        done: { first: true, template: true, refs: true, computed: true, comm: true },
        doneAt: { first: now - 3 * DAY, template: now - 3 * DAY, refs: now - 3600e3, computed: now - 20 * DAY, comm: now - 80 * DAY },
        revAt: { computed: { t: now - 3 * DAY, n: 1 }, comm: { t: now - 29 * DAY, n: 2 } }
      })
      await p.goto(base + '/'); await p.waitForSelector('#review')
      const t = await p.locator('#reviewTxt').innerText()
      g.ok(/复习时间到了：2 章/.test(t) && t.includes('第一个 Vue 应用') && t.includes('模板语法与指令'), '首页提示 2 章到期：' + t)
      g.ok(await p.locator('#reviewLink').count() === 1, '有“开始复习”链接')
      // n=2 的章间隔 30 天：29 天前复习还没到期；改成 31 天前就到期
      await p.evaluate(now => { const r = JSON.parse(localStorage.getItem('vue3deep:revAt')); r.comm.t = now - 31 * 864e5; localStorage.setItem('vue3deep:revAt', JSON.stringify(r)) }, now)
      await p.reload(); await p.waitForSelector('#review')
      g.ok(/复习时间到了：3 章/.test(await p.locator('#reviewTxt').innerText()), 'n=2 的章隔 30 天，31 天后到期')
      await seed(p, base, { done: { first: true }, doneAt: { first: now - 1 * DAY } })
      await p.goto(base + '/'); await p.waitForSelector('#review')
      g.ok(/下次复习：\d+ 月 \d+ 日/.test(await p.locator('#reviewTxt').innerText()) && await p.locator('#reviewLink').count() === 0, '未到期：只提示下次日期')
      g.end()
    }
    {
      const g = R.group('待复习标签页：只出到期章的题（每章 3 题，含各章自测题）；全对 n+1，有错 n=0；回到首页不再到期')
      const p = await site.newPage()
      const now = Date.now()
      await seed(p, base, { done: { first: true, template: true }, doneAt: { first: now - 3 * DAY, template: now - 3 * DAY } })
      await p.goto(base + '/'); await p.waitForSelector('#reviewLink')
      await p.locator('#reviewLink').click()
      await p.waitForURL(u => u.pathname.includes('27-quiz'))
      await p.waitForSelector('#qzList .q')
      g.ok(await p.locator('#qzTabs button.on').innerText() === '待复习', '直接打开“待复习”标签')
      const boxes = p.locator('#qzList .q')
      g.ok(await boxes.count() === 6, '2 章 × 3 题 = 6 题（实际 ' + await boxes.count() + '）')
      const sids = []
      for (let i = 0; i < 6; i++) {
        const key = await boxes.nth(i).getAttribute('data-key')
        sids.push(key.startsWith('s:') ? key.slice(2).split(':')[0] : Q[+key.slice(1)][3])
      }
      g.ok(sids.every(s => s === 'first' || s === 'template') && sids.filter(s => s === 'first').length === 3, '题目都属于到期的两章：' + sids)
      // first 全答对，template 故意答错一题
      let wrongDone = false
      for (let i = 0; i < 6; i++) {
        const b = boxes.nth(i)
        const ri = await rightIndex(b)
        let pick = ri
        if (sids[i] === 'template' && !wrongDone) { pick = ri === 0 ? 1 : 0; wrongDone = true }
        await b.locator('.opt').nth(pick).click()
        g.ok(await b.locator('.explain').count() === 1, `第 ${i + 1} 题显示解析`)
      }
      const msg = await p.locator('#qzMsg').innerText()
      g.ok(/本次复习完成，答对 5 题/.test(msg), '得分 5 / 6：' + msg)
      g.ok(/模板语法与指令.*2 天后再复习/.test(msg), '提示答错的章 2 天后再复习')
      const rev = await read(p, 'revAt')
      g.ok(rev.first && rev.first.n === 1 && Math.abs(rev.first.t - Date.now()) < 60000, '全对的章：n=1 ' + JSON.stringify(rev.first))
      g.ok(rev.template && rev.template.n === 0, '有错的章：n=0 ' + JSON.stringify(rev.template))
      g.ok(await read(p, 'quiz3') === null, '复习的答案不写进综合测验成绩')
      await p.goto(base + '/'); await p.waitForSelector('#review')
      g.ok(/下次复习/.test(await p.locator('#reviewTxt').innerText()), '回到首页：这两章都不再到期')
      // 再次打开“待复习”：没有题
      await p.goto(base + '/chapters/27-quiz.html')
      await p.waitForSelector('#qzTabs')
      await p.locator('#qzTabs button', { hasText: '待复习' }).click()
      g.ok(/现在没有需要复习的章节/.test(await p.locator('#qzList').innerText()), '没有到期章时给出说明')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.join('|'))
      g.end()
    }

    // ---------- 类比、深入开关 ----------
    {
      const g = R.group('类比开关：取消勾选后类比块隐藏，刷新和换页后仍隐藏；再勾选恢复')
      const p = await site.newPage()
      await seed(p, base, {})
      await p.goto(base + first.link + '.html')
      await p.waitForSelector('.view-toggles')
      await p.waitForTimeout(300)
      const box = p.locator('.view-toggles input[data-toggle="analogy"]')
      g.ok(await box.isChecked(), '默认勾选')
      g.ok(await p.locator('.vp-doc .analogy').first().isVisible(), '默认显示类比')
      await box.uncheck()
      g.ok(!(await p.locator('.vp-doc .analogy').first().isVisible()), '取消后类比隐藏')
      g.ok(await read(p, 'analogy') === false, '存了 analogy=false')
      await p.reload(); await p.waitForSelector('.view-toggles'); await p.waitForTimeout(300)
      g.ok(!(await p.locator('.vp-doc .analogy').first().isVisible()) && !(await p.locator('.view-toggles input[data-toggle="analogy"]').isChecked()), '刷新后仍隐藏，开关保持取消')
      await p.locator('.VPSidebar a[href*="03-refs"]').click()
      await p.waitForURL(u => u.pathname.includes('03-refs'))
      await p.waitForTimeout(300)
      g.ok(!(await p.locator('.vp-doc .analogy').first().isVisible()), '换到别的章仍隐藏')
      await p.locator('.view-toggles input[data-toggle="analogy"]').check()
      g.ok(await p.locator('.vp-doc .analogy').first().isVisible(), '重新勾选后显示')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.join('|'))
      g.end()
    }
    {
      const g = R.group('深入开关：勾选后展开本页全部深入块，换页后新页也展开；取消后全部折叠；刷新后保持')
      const p = await site.newPage()
      await seed(p, base, {})
      await p.goto(base + first.link + '.html')
      await p.waitForSelector('.view-toggles'); await p.waitForTimeout(300)
      const n = await p.locator('details.deep').count()
      g.ok(n > 0 && await p.locator('details.deep[open]').count() === 0, `默认 ${n} 个深入块都折叠`)
      await p.locator('.view-toggles input[data-toggle="deep"]').check()
      g.ok(await p.locator('details.deep[open]').count() === n, '勾选后全部展开')
      g.ok(await read(p, 'deepOpen') === true, '存了 deepOpen=true')
      await p.locator('.VPSidebar a[href*="03-refs"]').click()
      await p.waitForURL(u => u.pathname.includes('03-refs'))
      await p.waitForTimeout(500)
      const n2 = await p.locator('details.deep').count()
      g.ok(n2 > 0 && await p.locator('details.deep[open]').count() === n2, `换页后新页的 ${n2} 个深入块也展开`)
      await p.reload(); await p.waitForSelector('.view-toggles'); await p.waitForTimeout(600)
      g.ok(await p.locator('details.deep[open]').count() === n2 && await p.locator('.view-toggles input[data-toggle="deep"]').isChecked(), '刷新后仍展开')
      await p.locator('.view-toggles input[data-toggle="deep"]').uncheck()
      g.ok(await p.locator('details.deep[open]').count() === 0, '取消后全部折叠')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.join('|'))
      g.end()
    }

    // ---------- 图片放大 ----------
    {
      const g = R.group('示意图点击放大：点击放大、再点还原、Esc 还原、键盘 Enter 放大')
      const p = await site.newPage({ viewport: { width: 390, height: 800 } })
      await seed(p, base, {})
      await p.goto(base + first.link + '.html')
      await p.waitForSelector('figure.fig')
      const fig = p.locator('figure.fig').first()
      await fig.scrollIntoViewIfNeeded()
      const w0 = (await fig.locator('svg').boundingBox()).width
      await fig.click()
      g.ok(await fig.evaluate(e => e.classList.contains('zoom')) && await p.evaluate(() => document.documentElement.classList.contains('fig-open')), '点击后放大')
      const w1 = (await fig.locator('svg').boundingBox()).width
      g.ok(w1 > w0, `放大后图更宽（${Math.round(w0)} → ${Math.round(w1)}）`)
      await fig.click()
      g.ok(!(await fig.evaluate(e => e.classList.contains('zoom'))) && !(await p.evaluate(() => document.documentElement.classList.contains('fig-open'))), '再点还原')
      g.ok(Math.abs((await fig.locator('svg').boundingBox()).width - w0) < 2, '还原后宽度回到原来的')
      await fig.click(); await p.keyboard.press('Escape')
      g.ok(!(await fig.evaluate(e => e.classList.contains('zoom'))), 'Esc 还原')
      await fig.focus(); await p.keyboard.press('Enter')
      g.ok(await fig.evaluate(e => e.classList.contains('zoom')), 'Enter 放大')
      await p.keyboard.press('Escape')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.join('|'))
      g.end()
    }
  } finally {
    await site.stop()
  }
  console.log(R.bad ? '有 ' + R.bad + ' 项失败' : '全部通过')
  process.exit(R.bad ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
