// 跨章学习功能的测试：自测答错的行为、章完成（掌握标准条）、侧边栏和顶栏进度、首页、继续学习、
// 存储键和旧键迁移、类比/深入块、图片放大。
// 用法：node tests/site/progress.test.js     （用 course/.vitepress/dist，要先 npm run build；或 COURSE_OUT_DIR=<已构建目录>）
// 进度都存在单个 localStorage 键 hands-on-vue3-v1（结构见 course/engine/types.ts），
// 所以大部分用例先 seed 写好进度，再打开页面看结果。
const { ROOT, makeReporter, startSite, loadChapters, loadExercises, loadStages, seed, seedLegacy, read, fullChapter, STORE_KEY } = require('./helpers')

const fs = require('fs')
const path = require('path')
const { BASE_PATH } = require('../../course/site.mjs')
const EXPECTED = require('../expected.cjs')
const R = makeReporter()
const CH = loadChapters()
const EX = loadExercises()
const byId = id => CH.find(c => c.id === id)
const PROGRESS_CH = CH.filter(c => c.stage != null) // 计入进度的章（不含速查表）
const N = PROGRESS_CH.length // 总章数：从元数据算，不写死。要锁定的数字在 tests/expected.cjs
const { STAGE_COUNT } = loadStages()

async function chapterState(p) { return p.locator('.chapter-foot').getAttribute('data-state') }
async function waitState(p, st) {
  await p.waitForFunction(s => document.querySelector('.chapter-foot')?.getAttribute('data-state') === s, st, { timeout: 8000 }).catch(() => {})
  return chapterState(p)
}
/** 打开章节页，等进度读出来（章末条出现） */
async function openChapter(p, base, c) {
  await p.goto(base + c.link + '.html')
  await p.waitForSelector('.chapter-foot')
  await p.waitForTimeout(300)
}
const scBox = (p, i) => p.locator('.vp-doc .sc:not(.predict)').nth(i)
/** 选一个错误选项的序号 */
const wrongOf = (c, i) => (c.scAnswers[i] === 0 ? 1 : 0)

;(async () => {
  const site = await startSite()
  const base = site.base
  try {
    // ---------- 元数据和页面一致 ----------
    {
      const g = R.group('章元数据（自测题数、正确答案、练习 id）和页面一致：' + CH.length + ' 页')
      const p = await site.newPage()
      for (const c of CH) {
        await p.goto(base + c.link + '.html')
        await p.waitForSelector('.vp-doc h1', { timeout: 10000 })
        await p.waitForTimeout(250)
        const n = await p.$$eval('.vp-doc .sc:not(.predict)', es => es.length)
        const ex = await p.$$eval('.vp-doc .ex[data-ex]', es => es.map(e => e.dataset.ex))
        g.ok(n === c.scCount && c.scAnswers.length === n, `${c.file} 自测 ${n} ≠ ${c.scCount}`)
        g.ok(JSON.stringify(ex) === JSON.stringify(c.ex), `${c.file} 练习 ${ex} ≠ ${c.ex}`)
      }
      g.ok(PROGRESS_CH.length === EXPECTED.CHAPTERS, `计入进度的有 ${EXPECTED.CHAPTERS} 章（不含速查表；新增章节时改 tests/expected.cjs）：` + PROGRESS_CH.length)
      g.ok(PROGRESS_CH.length === new Set(PROGRESS_CH.map(c => c.id)).size && PROGRESS_CH.length === fs.readdirSync(path.join(ROOT, 'course/chapters')).filter(f => /^\d\d-.*\.md$/.test(f) && f !== '27-quiz.md').length, '章数 = 章节文件数（独立数一遍）')
      g.end()
    }

    // ---------- 首页 ----------
    {
      const g = R.group('首页：全部阶段和章、全部未开始，没有复习入口')
      const p = await site.newPage()
      await seed(p, base, {})
      await p.goto(base + '/')
      await p.waitForSelector('.stage li')
      const txt = await p.locator('.home').innerText()
      g.ok(txt.includes(`本课程有 ${STAGE_COUNT} 个阶段，共 ${N} 章，每个阶段末尾有一次阶段测验。`), '路线说明（阶段数和章数是算出来的）')
      g.ok(!/四个阶段|4 个阶段/.test(txt), '没有旧的“4 个阶段”说法')
      g.ok(await p.locator('details.ste').count() === 1 && await p.locator('#glossary tr').count() === 15, '写作规则和术语表')
      g.ok(await p.locator('.stage').count() === STAGE_COUNT, `${STAGE_COUNT} 个阶段`)
      const lvs = await p.locator('.stage .lv').allInnerTexts()
      g.ok(lvs.map(x => x.slice(0, 2)).join() === '01,02,03,04,05,06', '阶段编号 01 到 06：' + lvs)
      g.ok(await p.locator('.stage li[data-id]').count() === N, N + ' 章')
      g.ok(await p.locator('.stage li[data-state="todo"]').count() === N, '全部未开始')
      g.ok(new RegExp(`已完成 0 / ${N} 章`).test(await p.locator('#progTxt').innerText()), `总进度 0 / ${N}`)
      g.ok(await p.locator('#resumeLink').getAttribute('href').then(h => /01-first/.test(h)), '没有记录时继续学习指向第 1 章')
      g.ok(await p.locator('.stage li.aside:not(.check) a').count() === 1, '首页有速查表的附加链接')
      const checks = await p.locator('.stage li.aside.check a').evaluateAll(es => es.map(e => e.getAttribute('href')))
      g.ok(checks.length === STAGE_COUNT && checks.every((h, i) => h.endsWith('/check/' + (i + 1) + '.html') || h.endsWith('/check/' + (i + 1))), '每个阶段卡片上有阶段测验入口：' + checks)
      g.ok((await p.locator('.stage li.aside.check .st').allInnerTexts()).every(t => t === '未测'), '没测过：状态是未测')
      const methods = await p.locator('#methods > div b').allInnerTexts()
      g.ok(methods.join('|') === '先预测，再运行|课前热身|间隔复习|混合出题|先尝试，再求助|讲给别人听', '“怎样用这套课程”：六个环节 ' + methods)
      g.ok(/掌握学习：一章的自测全部答对、练习全部通过才算完成；一个阶段测验达到 80% 才算掌握/.test(await p.locator('.section-sub').last().innerText()), '有“掌握学习”一句')
      g.ok(await p.locator('#statReview').count() === 1 && await p.locator('#reviewEntry').count() === 0, '没有复习卡片时：有“道题在复习中”统计，没有复习入口')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.join('|'))
      g.end()
    }

    // ---------- 侧边栏和顶栏 ----------
    {
      const g = R.group('侧边栏按阶段分组并显示完成数、已完成的章带 ✓；顶栏显示总进度；今日复习、术语表和速查表是顶部固定入口；每个阶段末尾有阶段测验')
      const p = await site.newPage()
      await seed(p, base, {
        first: fullChapter(byId('first'), { done: true }),
        template: fullChapter(byId('template'), { done: true }),
        comm: fullChapter(byId('comm'), { done: true }),
        refs: { sc: { 0: byId('refs').scAnswers[0] }, ex: {}, done: false }
      })
      await p.goto(base + '/chapters/03-refs.html')
      await p.waitForSelector('.nav-progress')
      await p.waitForTimeout(400)
      const titles = await p.locator('.VPSidebar .VPSidebarItem.level-0 > .item').allInnerTexts()
      g.ok(titles.map(t => t.trim()).join('|') === '01 入门|02 进阶|03 高级|04 原理与架构|05 生态与实战|06 深入', '阶段标题：' + titles.map(t => t.trim()).join('|'))
      const counts = await p.$$eval('.VPSidebar .VPSidebarItem.level-0 > .item', es => es.map(e => e.dataset.count))
      g.ok(counts.join() === '2/4,1/7,0/3,0/4,0/7,0/4', '各阶段完成数：' + counts)
      const count1 = await p.locator('.VPSidebar .VPSidebarItem.level-0 > .item').first().evaluate(e => getComputedStyle(e, '::after').content)
      g.ok(count1.includes('2/4'), '完成数显示在标题右侧（::after）：' + count1)
      g.ok(await p.locator('.VPSidebar a[href*="01-first"]').getAttribute('data-state') === 'done', '第 1 章有完成标记')
      g.ok(await p.locator('.VPSidebar a[href*="01-first"] .text').evaluate(e => getComputedStyle(e, '::after').content).then(c => c.includes('✓')), '完成标记是 ✓')
      g.ok(await p.locator('.VPSidebar a[href*="05-comm"]').getAttribute('data-state') === 'done', '第 5 章（阶段 2）有完成标记')
      g.ok(await p.locator('.VPSidebar a[href*="03-refs"]').getAttribute('data-state') === 'doing', '答过自测的章是进行中')
      g.ok(await p.locator('.VPSidebar a[href*="04-computed"]').getAttribute('data-state') === 'todo', '别的章没有标记')
      const top = await p.locator('.VPSidebar .VPSidebarItem.level-0').first().locator('a').allInnerTexts()
      g.ok(top.join('|') === '今日复习|术语表|速查表', '顶部固定入口：' + top)
      const lastItems = await p.$$eval('.VPSidebar .VPSidebarItem.level-0', gs => gs.slice(1).map(g => { const a = [...g.querySelectorAll('a')]; return a[a.length - 1].textContent.trim() }))
      g.ok(lastItems.length === STAGE_COUNT && lastItems.every(t => t === '阶段测验'), '每个阶段的章节列表末尾是“阶段测验”：' + lastItems)
      g.ok(new RegExp(`已完成 3/${N}`).test(await p.locator('.nav-progress').innerText()), `顶栏：已完成 3/${N}：` + await p.locator('.nav-progress').innerText())
      const w = await p.locator('.nav-progress .np-bar i').evaluate(e => e.style.width)
      g.ok(Math.abs(parseFloat(w) - (3 / N) * 100) < 0.5, '顶栏进度条宽度 ' + w)
      // 速查表页没有章末条，侧边栏也没有标记
      await p.goto(base + '/chapters/cheat.html'); await p.waitForSelector('.vp-doc h1'); await p.waitForTimeout(300)
      g.ok(await p.locator('.chapter-foot').count() === 0, '速查表页没有章末状态')
      await p.goto(base + '/check/2.html'); await p.waitForSelector('.vp-doc h1'); await p.waitForTimeout(300)
      g.ok(await p.locator('.chapter-foot').count() === 0, '阶段测验页没有章末状态')
      g.ok(new RegExp(`已完成 3/${N}`).test(await p.locator('.nav-progress').innerText()), '阶段测验页顶栏也有总进度')
      // 旧地址 /chapters/27-quiz：跳转到第一个阶段测验，不是死链
      await p.goto(base + '/chapters/27-quiz.html'); await p.waitForURL(/\/check\/1/, { timeout: 8000 }).catch(() => {})
      g.ok(/\/check\/1/.test(p.url()), '旧地址 /chapters/27-quiz 跳转到 /check/1：' + p.url())
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.join('|'))
      g.end()
    }
    {
      const g = R.group('服务端渲染的 HTML 里没有进度数字（挂载后才显示，避免水合不一致）')
      const html = await (await fetch(site.base + '/chapters/03-refs.html')).text()
      g.ok(!new RegExp(`已完成 \\d+/${N}`).test(html) && !html.includes('data-count='), '静态 HTML 里没有“已完成 N/总章数”和阶段完成数')
      g.end()
    }

    // ---------- 自测答错：不亮答案，不显示解析，重试隐藏上次选项，答对才显示解析 ----------
    {
      const first = byId('first')
      const g = R.group('自测答错：只标出选错的项，不亮正确答案、不显示解析，提示再试；重试时隐藏上次选错的项；答对才显示解析')
      const p = await site.newPage()
      await seed(p, base, {})
      await openChapter(p, base, first)
      const sc = scBox(p, 0)
      await sc.scrollIntoViewIfNeeded()
      const a = first.scAnswers[0], bad = wrongOf(first, 0)
      const nOpt = await sc.locator('.sc-o').count()
      await sc.locator('.sc-o').nth(bad).click()
      g.ok(await sc.locator('.sc-o.wrong').count() === 1 && await sc.locator('.sc-o').nth(bad).evaluate(e => e.classList.contains('wrong')), '选错的项标红')
      g.ok(await sc.locator('.sc-o.right').count() === 0, '没有亮出正确答案')
      g.ok(await sc.locator('.sc-x:not(.no)').count() === 0 && !(await sc.evaluate(e => e.classList.contains('answered'))), '没有解析，也不是“已答对”状态')
      g.ok(/不对/.test(await sc.locator('.sc-x.no').innerText()) && await sc.locator('.sc-retry').count() === 1, '提示再试，有“再答一次”按钮')
      let st = await read(p)
      g.ok(st.first.sc[0] === bad && st.first.tried[0] === true && st.first.first[0] === false, '记了作答：sc、tried、first=false ' + JSON.stringify([st.first.sc, st.first.tried, st.first.first]))
      g.ok(st.__srs['first#0'] && st.__srs['first#0'].box === 0 && st.__srs['first#0'].n === 1, '首答错：复习卡片在盒子 0 ' + JSON.stringify(st.__srs['first#0']))
      // 刷新后仍是答错等待重试的样子
      await p.reload(); await p.waitForSelector('.chapter-foot'); await p.waitForTimeout(400)
      const sc1 = scBox(p, 0)
      g.ok(await sc1.locator('.sc-x.no').count() === 1 && await sc1.locator('.sc-o.right').count() === 0 && await sc1.locator('.sc-x:not(.no)').count() === 0, '刷新后：仍是答错状态，没有解析')
      // 重试：上次选错的项隐藏
      await sc1.locator('.sc-retry').click()
      const vis = await sc1.locator('.sc-o').evaluateAll(es => es.map(e => getComputedStyle(e).display !== 'none'))
      g.ok(vis.length === nOpt && vis.filter(Boolean).length === nOpt - 1 && vis[bad] === false, `重试时隐藏上次选错的项（可见 ${vis}）`)
      g.ok(await sc1.locator('.sc-x').count() === 0, '重试时提示和解析都收起')
      // 再选错另一项：仍然不显示解析；上一项重新出现，新的错项被标红
      const bad2 = [0, 1, 2, 3].filter(i => i < nOpt).find(i => i !== a && i !== bad)
      if (bad2 != null) {
        await sc1.locator('.sc-o').nth(bad2).click()
        g.ok(await sc1.locator('.sc-x:not(.no)').count() === 0 && await sc1.locator('.sc-o.right').count() === 0, '第二次也选错：仍不显示解析和正确项')
        await sc1.locator('.sc-retry').click()
      }
      // 答对
      await sc1.locator('.sc-o').nth(a).click()
      g.ok(await sc1.locator('.sc-o.right').count() === 1 && await sc1.locator('.sc-x').count() === 1 && /^正确/.test(await sc1.locator('.sc-x').innerText()), '答对：标出正确项并显示解析')
      g.ok(await sc1.locator('.sc-o:visible').count() === nOpt, '答对后四个选项都显示')
      st = await read(p)
      g.ok(st.first.sc[0] === a && st.first.first[0] === false, '后来答对只更新选项，首答记录仍是答错 ' + JSON.stringify(st.first.first))
      g.ok(st.__srs['first#0'].n === 1 && st.__srs['first#0'].box === 0, '只有第一次作答计入复习卡片（n 仍是 1）：' + JSON.stringify(st.__srs['first#0']))
      await p.reload(); await p.waitForSelector('.chapter-foot'); await p.waitForTimeout(400)
      g.ok(await scBox(p, 0).locator('.sc-o.right').count() === 1 && await scBox(p, 0).locator('.sc-x').count() === 1, '刷新后答对状态还在')
      // 第一次就答对的题：首答正确
      const sc2 = scBox(p, 1)
      await sc2.scrollIntoViewIfNeeded()
      await sc2.locator('.sc-o').nth(first.scAnswers[1]).click()
      st = await read(p)
      g.ok(st.first.first[1] === true && st.__srs['first#1'].box === 1, '第一次就答对：首答正确，进盒子 1 ' + JSON.stringify(st.__srs['first#1']))
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.join('|'))
      g.end()
    }

    // ---------- 章完成：掌握标准条、自动完成 ----------
    const first = byId('first')
    {
      const g = R.group('掌握标准条：列出还差什么；自测只差最后一道时进行中，答对后章末、侧边栏、顶栏、首页都变成已完成')
      const p = await site.newPage()
      const full = fullChapter(first)
      delete full.sc[first.scCount - 1]
      await seed(p, base, { first: full })
      await openChapter(p, base, first)
      g.ok(await chapterState(p) === 'doing', '差一道时是进行中')
      const txt = await p.locator('.chapter-foot').innerText()
      g.ok(txt.includes('掌握标准') && txt.includes(`自测还有 1 道没答对：第 ${first.scCount} 题`), '掌握标准条写出还差哪一道自测：' + txt.replace(/\n/g, ' '))
      g.ok(!/练习还有/.test(txt), '练习都过了，不再列练习')
      g.ok(await p.locator('.chapter-foot .done-btn, .chapter-foot button').count() === 0, '没有手动标记按钮')
      g.ok(!(await read(p)).first.done, '还没有 done 标记')
      const last = scBox(p, first.scCount - 1)
      await last.scrollIntoViewIfNeeded()
      // 先答错：不完成
      await last.locator('.sc-o').nth(wrongOf(first, first.scCount - 1)).click()
      await p.waitForTimeout(200)
      g.ok(await chapterState(p) === 'doing', '答错不算完成')
      await last.locator('.sc-retry').click()
      await last.locator('.sc-o').nth(first.scAnswers[first.scCount - 1]).click()
      g.ok(await waitState(p, 'done') === 'done', '答对后章末变成已完成')
      const st = await read(p)
      g.ok(st.first.done === true && Math.abs(Date.now() - st.first.doneAt) < 60000, 'done、doneAt 已记录')
      g.ok(/本章已完成/.test(await p.locator('.chapter-foot').innerText()) && !/自测还有/.test(await p.locator('.chapter-foot').innerText()), '章末文字：本章已完成')
      await p.waitForTimeout(300)
      g.ok(await p.locator('.VPSidebar a[href*="01-first"]').getAttribute('data-state') === 'done', '侧边栏这一章有完成标记')
      g.ok(new RegExp(`已完成 1/${N}`).test(await p.locator('.nav-progress').innerText()), `顶栏 1/${N}`)
      await p.goto(base + '/')
      await p.waitForSelector('.stage li')
      g.ok(await p.locator('.stage li[data-id="first"]').getAttribute('data-state') === 'done', '首页这一章已完成')
      g.ok(new RegExp(`已完成 1 / ${N} 章`).test(await p.locator('#progTxt').innerText()), `首页总进度 1 / ${N}`)
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.join('|'))
      g.end()
    }
    {
      const g = R.group('章完成：自测全部答对，通过最后一道练习后自动完成；掌握标准条列出没通过的练习')
      const p = await site.newPage()
      const prog = fullChapter(first)
      delete prog.ex[first.ex[1]]
      // 提示阶梯：失败 3 次且距第一次失败超过 5 分钟，参考答案才解锁（阶梯本身的测试在 mechanics.test.js）
      prog.ex[first.ex[1]] = { passed: false, fails: 3, firstFail: Date.now() - 10 * 60e3, lastFail: { tpl: 'x', js: 'y' } }
      await seed(p, base, { first: prog })
      await p.goto(base + first.link + '.html')
      await p.waitForSelector('.ex[data-ex] .cm-content', { timeout: 15000 })
      await p.waitForTimeout(500)
      g.ok(await chapterState(p) === 'doing', '差一道练习时是进行中')
      const txt = await p.locator('.chapter-foot').innerText()
      g.ok(txt.includes('练习还有 1 道没通过') && txt.includes(EX[first.ex[1]].title), '写出没通过的练习名：' + txt.replace(/\n/g, ' '))
      const id = first.ex[1], e = EX[id]
      await p.evaluate(async ([id, tpl, js]) => {
        const r = document.querySelector('.ex[data-ex="' + id + '"]')
        r.scrollIntoView(); r.__setCode(tpl, js); r.querySelector('[data-a="check"]').click()
      }, [id, e.solTpl || e.tpl, e.solJs || e.js])
      g.ok(await waitState(p, 'done') === 'done', '练习通过后变成已完成')
      const st = await read(p)
      g.ok(st.first.ex[id].passed === true && !st.first.ex[id].help, '练习记录：passed，没有借助答案 ' + JSON.stringify(st.first.ex[id]).slice(0, 80))
      g.end()
    }
    {
      const g = R.group('借助答案：看过答案后通过的练习算通过，章照常完成，掌握标准条单独标注')
      const p = await site.newPage()
      const prog = fullChapter(first)
      delete prog.ex[first.ex[1]]
      // 提示阶梯：失败 3 次且距第一次失败超过 5 分钟，参考答案才解锁（阶梯本身的测试在 mechanics.test.js）
      prog.ex[first.ex[1]] = { passed: false, fails: 3, firstFail: Date.now() - 10 * 60e3, lastFail: { tpl: 'x', js: 'y' } }
      await seed(p, base, { first: prog })
      await p.goto(base + first.link + '.html')
      await p.waitForSelector('.ex[data-ex] .cm-content', { timeout: 15000 })
      await p.waitForTimeout(500)
      const id = first.ex[1], e = EX[id]
      const box = p.locator('.ex[data-ex="' + id + '"]')
      await box.scrollIntoViewIfNeeded()
      await box.locator('[data-a="sol"]').click()
      await p.waitForTimeout(300)
      let st = await read(p)
      g.ok(st.first.ex[id].sawSol === true && !st.first.ex[id].passed, '看答案：记 sawSol，还没通过 ' + JSON.stringify(st.first.ex[id]).slice(0, 120))
      // 看过答案后直接交原文不能通过；改动一处（多一个无关变量）才算自己改写
      await box.evaluate((r, [t, j]) => r.__setCode(t, j), [e.solTpl || e.tpl, 'const unused = 1\n' + (e.solJs || e.js)])
      await box.locator('[data-a="check"]').click()
      g.ok(await waitState(p, 'done') === 'done', '看过答案后改写通过：章完成')
      st = await read(p)
      g.ok(st.first.ex[id].passed === true && ['solution', 'rewrite'].includes(st.first.ex[id].help), '练习记录：借助答案 help=' + st.first.ex[id].help)
      g.ok(/借助了参考答案/.test(await p.locator('.chapter-foot').innerText()) && (await p.locator('.chapter-foot').innerText()).includes(e.title), '掌握标准条单独标注借助答案的练习')
      g.ok(/借助答案完成/.test(await box.locator('.badge').innerText()), '练习徽章：借助答案完成')
      g.end()
    }

    // ---------- 目标勾选 ----------
    {
      const g = R.group('目标勾选：自测要答对才算，练习要通过才算')
      const c = byId('directives') // 目标里有 sc:3 和 ex:dirBinding
      const p = await site.newPage()
      await seed(p, base, { directives: { sc: { 3: wrongOf(c, 3) }, ex: {}, done: false } })
      await p.goto(base + c.link + '.html')
      await p.waitForSelector('.goal-item'); await p.waitForTimeout(500)
      g.ok(await p.locator('.goal-item.met').count() === 0, '答错的自测不算达成')
      await seed(p, base, { directives: { sc: { 3: c.scAnswers[3] }, ex: { dirBinding: { passed: false, fails: 2 } }, done: false } })
      await p.goto(base + c.link + '.html')
      await p.waitForSelector('.goal-item'); await p.waitForTimeout(500)
      const goals = await p.locator('.goal-item').evaluateAll(es => es.map(e => [e.querySelector('.gtag')?.textContent, e.classList.contains('met')]))
      const g3 = (await p.locator('.goal-item').allInnerTexts()).findIndex(t => /判断一个功能/.test(t))
      g.ok(goals[g3] && goals[g3][1], '答对的自测达成（sc:3）')
      const gEx = (await p.locator('.goal-item').allInnerTexts()).findIndex(t => /读取 binding/.test(t))
      g.ok(goals[gEx] && !goals[gEx][1], '练习没通过时目标（sc:4,ex:dirBinding）不达成')
      await seed(p, base, { directives: { sc: { 4: c.scAnswers[4] }, ex: { dirBinding: { passed: true, help: 'solution', sawSol: true } }, done: false } })
      await p.goto(base + c.link + '.html')
      await p.waitForSelector('.goal-item'); await p.waitForTimeout(500)
      const goals2 = await p.locator('.goal-item').evaluateAll(es => es.map(e => e.classList.contains('met')))
      g.ok(goals2[gEx], '自测答对且练习通过（含借助答案）后达成')
      g.end()
    }

    // ---------- 继续学习 ----------
    {
      const g = R.group('继续学习：记住上次的章和小节（引擎的 __last），首页按钮回到那里')
      const p = await site.newPage()
      await seed(p, base, {})
      const c = byId('comm')
      await p.goto(base + c.link + '.html')
      await p.waitForSelector('.vp-doc h3[id]')
      await p.waitForTimeout(400)
      let last = (await read(p)).__last
      g.ok(last && last.path === c.link && last.anchor === '', '进入这一章就记下章路径')
      const hid = await p.evaluate(() => { const h = document.querySelectorAll('.vp-doc h3[id]')[3]; h.scrollIntoView({ behavior: 'instant' }); return h.id })
      await p.waitForTimeout(1500) // 实验台和编辑器晚挂载会撑高上方内容，等版面稳定后再对一次
      await p.evaluate(id => document.getElementById(id).scrollIntoView({ behavior: 'instant' }), hid)
      await p.mouse.wheel(0, 2) // 用户操作后才记录小节
      await p.waitForFunction(([k, id]) => { try { return JSON.parse(localStorage.getItem(k)).__last.anchor === id } catch (e) { return false } }, [STORE_KEY, hid], { timeout: 6000 }).catch(() => {})
      last = (await read(p)).__last
      g.ok(last && last.anchor === hid, `记下小节锚点 ${hid}（实际 ${last && last.anchor}）`)
      g.ok(last && /\d+\.\d+/.test(last.h), '记下小节标题：' + (last && last.h))
      await p.goto(base + '/'); await p.waitForSelector('#resumeLink')
      await p.waitForFunction(() => /上次停在/.test(document.querySelector('#resumeTxt')?.textContent || ''))
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

    // ---------- 站点 base（course/site.mjs）----------
    {
      const g = R.group('站点 base：页面里的站内链接都带 base；“继续学习”在有 base 时能跳转，旧数据不会跳到 404')
      const p = await site.newPage()
      const bad = []
      p.on('response', r => { if (r.status() >= 400 && r.url().startsWith(site.origin)) bad.push(r.status() + ' ' + r.url()) })
      // 1. 首页、一章、今日复习、术语表、阶段测验、速查表：页面上所有站内链接（以 / 开头的 href）都以 base 开头
      await seed(p, base, {})
      for (const u of ['/', '/chapters/03-refs.html', '/review.html', '/glossary.html', '/check/2.html', '/chapters/cheat.html']) {
        await p.goto(base + u); await p.waitForSelector('.vp-doc h1, .home h1'); await p.waitForTimeout(600)
        const hrefs = await p.$$eval('a[href^="/"]', es => es.map(e => e.getAttribute('href')))
        const outside = hrefs.filter(h => !h.startsWith(BASE_PATH))
        g.ok(hrefs.length > 5 && outside.length === 0, `${u} 的站内链接都以 ${BASE_PATH} 开头（${hrefs.length} 条）` + (outside.length ? '：' + outside.slice(0, 3) : ''))
      }
      // 2. 继续学习：阅读位置存的是不带 base 的路径（c.link）；各种形态的旧数据都能跳到这一章，不是 404
      const target = byId('comm')
      const variants = {
        '不带 base 的路径（现行格式）': target.link,
        '带 .html 的路径': target.link + '.html',
        '带 base 的路径（假如以前存过）': BASE_PATH.replace(/\/$/, '') + target.link,
      }
      for (const [name, path] of Object.entries(variants)) {
        await seed(p, base, { __last: { path, anchor: '', h: '', t: Date.now() } })
        await p.goto(base + '/'); await p.waitForSelector('#resumeLink')
        await p.waitForFunction(() => /上次停在/.test(document.querySelector('#resumeTxt')?.textContent || ''))
        const href = await p.locator('#resumeLink').getAttribute('href')
        g.ok(href === BASE_PATH.replace(/\/$/, '') + target.link, `继续学习的链接（${name}）：${href}`)
        await p.locator('#resumeLink').click()
        await p.waitForURL(u => u.pathname.includes('05-comm'), { timeout: 8000 })
        await p.waitForSelector('.vp-doc h1')
        g.ok(p.url().startsWith(base + '/chapters/05-comm') && (await p.locator('.vp-doc h1').innerText()).includes('组件'), `继续学习（${name}）打开了第 5 章：${p.url()}`)
      }
      // 3. 记的章已经不存在（比如删过章）：回到第 1 章，不是 404
      await seed(p, base, { __last: { path: '/chapters/99-gone', anchor: '', h: '', t: Date.now() } })
      await p.goto(base + '/'); await p.waitForSelector('#resumeLink')
      await p.waitForTimeout(500)
      g.ok(await p.locator('#resumeLink').getAttribute('href') === BASE_PATH.replace(/\/$/, '') + PROGRESS_CH[0].link, '记的章不存在：继续学习指向第 1 章')
      // 4. 阅读时会把当前章写成不带 base 的路径（换了部署路径，旧数据照样能用）
      await seed(p, base, {})
      await p.goto(base + byId('refs').link + '.html'); await p.waitForSelector('.vp-doc h1'); await p.waitForTimeout(500)
      g.ok((await read(p)).__last.path === byId('refs').link, '进入一章记下的 __last.path 不带 base：' + (await read(p)).__last.path)
      // 5. 旧地址 27-quiz 在 base 下也能跳到 /check/1
      await p.goto(base + '/chapters/27-quiz.html'); await p.waitForURL(/\/check\/1/, { timeout: 8000 }).catch(() => {})
      g.ok(p.url().startsWith(base + '/check/1'), '旧地址 27-quiz 跳到带 base 的 /check/1：' + p.url())
      g.ok(bad.length === 0, '整个过程没有 4xx/5xx 响应：' + bad.slice(0, 3).join('；'))
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.join('|'))
      g.end()
    }

    // ---------- 存储键和旧键迁移 ----------
    {
      const g = R.group('存储键：只写单键 hands-on-vue3-v1，不再写旧的零散键')
      const p = await site.newPage()
      await seed(p, base, {})
      await openChapter(p, base, first)
      await scBox(p, 0).locator('.sc-o').nth(first.scAnswers[0]).click()
      const keys = (await p.evaluate(() => Object.keys(localStorage))).filter(k => k !== 'vitepress-theme-appearance') // 后者是 VitePress 自己存的深浅色偏好
      g.ok(keys.includes(STORE_KEY), '有单键 ' + STORE_KEY + '：' + keys)
      g.ok(!keys.some(k => k.startsWith('vue3deep:')), '没有旧前缀的键：' + keys)
      g.ok(keys.length === 1, '只有一个键：' + keys)
      g.end()
    }
    {
      const g = R.group('旧键迁移：预置旧的零散进度后打开页面，已完成的章、通过的练习、答对的自测、先猜、阅读位置都还在')
      const p = await site.newPage()
      const tpl = byId('template'), refs = byId('refs')
      const legacySc = { ['refs:0']: refs.scAnswers[0], ['refs:1']: wrongOf(refs, 1), 'p:somelab': 2 }
      await seedLegacy(p, base, {
        done: { first: true, template: true },
        doneAt: { first: Date.now() - 5 * 864e5, template: Date.now() - 864e5 },
        ex: { [refs.ex[0]]: true, [refs.ex[1]]: 'sol' },
        exSol: { [refs.ex[1]]: true },
        sc: legacySc,
        guess: { 'p:other': 1 },
        revAt: { first: { t: 1, n: 2 } },
        quiz3: { 0: 0 },
        last: { path: refs.link, anchor: '', h: '', t: Date.now() - 3600e3 },
        ['ex:' + refs.ex[0]]: { tpl: '<p>草稿</p>', js: 'return {}' }
      })
      await p.goto(base + refs.link + '.html')
      await p.waitForSelector('.nav-progress'); await p.waitForTimeout(600)
      const st = await read(p)
      g.ok(st && st.first && st.first.done === true && st.template.done === true, '已完成的章迁过来了')
      g.ok(new RegExp(`已完成 2/${N}`).test(await p.locator('.nav-progress').innerText()), `顶栏：已完成 2/${N}`)
      g.ok(await p.locator('.VPSidebar a[href*="01-first"]').getAttribute('data-state') === 'done' && await p.locator('.VPSidebar a[href*="02-template"]').getAttribute('data-state') === 'done', '侧边栏两章有 ✓')
      g.ok(st.refs.ex[refs.ex[0]].passed === true && !st.refs.ex[refs.ex[0]].help, '通过的练习迁过来了')
      g.ok(st.refs.ex[refs.ex[1]].passed === true && st.refs.ex[refs.ex[1]].help === 'solution' && st.refs.ex[refs.ex[1]].sawSol, '看过答案后通过的练习：借助答案标记保留')
      g.ok(st.refs.sc[0] === refs.scAnswers[0] && !(1 in st.refs.sc), '自测只迁答对的')
      g.ok(st.__pred && st.__pred.somelab && st.__pred.somelab.checked === true && st.__pred.other && !st.__pred.other.checked, '先猜：已核对和未核对的都迁了')
      g.ok(st.__last && st.__last.path === refs.link, '阅读位置迁了')
      g.ok(!('__srs' in st) && !('__stage' in st), '旧的复习和综合测验记录不迁')
      g.ok(await p.locator('.chapter-foot').getAttribute('data-state') === 'doing', '这一章进行中')
      g.ok(await p.locator('.ex[data-ex="' + refs.ex[0] + '"] .badge').innerText().then(t => /已通过/.test(t)), '页面上练习显示已通过')
      const keys = await p.evaluate(() => Object.keys(localStorage))
      g.ok(keys.includes('vue3deep:done'), '旧键没有被删除')
      // 新键已存在后不再迁移：改掉旧键，刷新，进度以新键为准
      await p.evaluate(() => localStorage.setItem('vue3deep:done', JSON.stringify({})))
      await p.reload(); await p.waitForSelector('.nav-progress'); await p.waitForTimeout(400)
      g.ok(new RegExp(`已完成 2/${N}`).test(await p.locator('.nav-progress').innerText()), '新键存在后不再迁移，进度不变')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.join('|'))
      g.end()
    }

    // ---------- 类比与深入块的固定行为 ----------
    {
      const g = R.group('类比块始终可见，深入块默认展开，侧边栏没有显示开关')
      const p = await site.newPage()
      await seed(p, base, {})
      await p.goto(base + first.link + '.html')
      await p.waitForTimeout(300)
      g.ok(await p.locator('.vp-doc .analogy').first().isVisible(), '章节页上类比块可见')
      const n = await p.locator('details.deep').count()
      g.ok(n > 0 && await p.locator('details.deep[open]').count() === n, `${n} 个深入块默认都带 open`)
      g.ok(await p.locator('.view-toggles').count() === 0, '页面上不存在 .view-toggles')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.join('|'))
      g.end()
    }

    // ---------- 手机宽度 ----------
    {
      const g = R.group('390px 宽度：首页和章节页没有横向滚动，顶栏进度可见')
      const p = await site.newPage({ viewport: { width: 390, height: 800 } })
      await seed(p, base, { first: fullChapter(first, { done: true }) })
      for (const u of ['/', first.link + '.html']) {
        await p.goto(base + u); await p.waitForSelector('.nav-progress'); await p.waitForTimeout(400)
        const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
        g.ok(o.sw <= o.cw, `${u} 没有横向滚动（${o.sw} ≤ ${o.cw}）`)
        g.ok(await p.locator('.nav-progress').isVisible(), `${u} 顶栏进度可见`)
      }
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
