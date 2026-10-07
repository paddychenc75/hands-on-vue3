// 综合测验页（chapters/27-quiz）的测试：60 题、按阶段筛选、点选出解析、记录刷新后仍在、
// 只看错题、重新作答、随机 10 题（含各章自测题）、待复习。
// 用法：node tests/site/quiz.test.js     （用 course/.vitepress/dist，要先 npm run build）
// “待复习”的完整流程（到期章出题、记复习时间）在 progress.test.js 里。
const { makeReporter, startSite, loadQuestions, seed, read } = require('./helpers')

const R = makeReporter()
const Q = loadQuestions()
const URL_PATH = '/chapters/27-quiz.html'

const qno = async box => (await box.locator('.qn').innerText()).trim()
/** 一个题目框里正确选项的按钮序号（综合测验题：题库里第一个选项是对的，显示顺序被打乱） */
async function rightIdx(box, qi) {
  const texts = await box.locator('.opt').allTextContents()
  return texts.findIndex(t => t.replace(/^[A-Z]\.\s*/, '').trim() === Q[qi][1][0].trim())
}

;(async () => {
  const site = await startSite()
  const base = site.base
  try {
    const p = await site.newPage()
    await seed(p, base, {})
    await p.goto(base + URL_PATH)
    await p.waitForSelector('#qzList .q')

    {
      const g = R.group('全部：60 题，每题 4 个选项，初始没有解析，得分 0 / 60')
      g.ok(Q.length === 60, '题库有 60 题')
      g.ok(await p.locator('#qzList .q').count() === 60, '页面显示 60 题')
      g.ok(await p.locator('#qzList .q').first().locator('.opt').count() === 4, '第一题 4 个选项')
      g.ok(await p.locator('#qzList .explain').count() === 0, '没有解析')
      g.ok(/0 \/ 60/.test(await p.locator('#qzScore').innerText()) && /还没有作答/.test(await p.locator('#qzMsg').innerText()), '得分 0 / 60')
      g.ok(await p.locator('#qzTabs button').count() === 8, '八个标签：' + (await p.locator('#qzTabs button').allTextContents()).join(','))
      g.ok(await p.locator('#qzTabs button.on').innerText() === '全部', '默认“全部”')
      g.end()
    }

    {
      const g = R.group('按阶段筛选：每个阶段的题数和题库一致')
      for (let s = 1; s <= 4; s++) {
        await p.locator('#qzTabs button').nth(s).click()
        const want = Q.filter(q => q[4] === s).length
        const n = await p.locator('#qzList .q').count()
        const lvls = new Set(await p.locator('#qzList .q .lvl').allInnerTexts())
        g.ok(n === want && n > 0, `阶段 ${s}：${n} 题（题库 ${want}）`)
        g.ok(lvls.size === 1, `阶段 ${s}：题目的阶段标记一致 ${[...lvls]}`)
        g.ok(await p.locator('#qzTabs button.on').count() === 1, '只有一个标签高亮')
      }
      await p.locator('#qzTabs button').nth(0).click()
      g.ok(await p.locator('#qzList .q').count() === 60, '回到“全部”')
      g.end()
    }

    {
      const g = R.group('点选出解析：答对（绿）、答错（红并标出正确项）、选项锁定、有回看链接、得分更新')
      const box0 = p.locator('#qzList .q').nth(0)
      const ri = await rightIdx(box0, 0)
      g.ok(ri >= 0, '找到第 1 题的正确选项')
      await box0.locator('.opt').nth(ri).click()
      g.ok(await box0.locator('.opt.right').count() === 1 && await box0.locator('.opt.wrong').count() === 0, '答对：正确项变绿，没有红色')
      g.ok(/^正确。/.test(await box0.locator('.explain').innerText()), '解析以“正确。”开头')
      g.ok(await box0.locator('.opt[disabled]').count() === 4, '选项锁定')
      g.ok(await box0.locator('.explain a').count() === 1, '解析里有“回看”链接')
      const href = await box0.locator('.explain a').getAttribute('href')
      g.ok(/\/chapters\/\d\d-/.test(href), '链接指向章节页：' + href)
      g.ok(/1 \/ 60/.test(await p.locator('#qzScore').innerText()) && /已答 1 题，答对 1 题/.test(await p.locator('#qzMsg').innerText()), '得分 1 / 60')
      const box1 = p.locator('#qzList .q').nth(1)
      const ri1 = await rightIdx(box1, 1)
      const wrong = ri1 === 0 ? 1 : 0
      await box1.locator('.opt').nth(wrong).click()
      g.ok(await box1.locator('.opt.right').count() === 1 && await box1.locator('.opt.wrong').count() === 1, '答错：正确项变绿，所选项变红')
      g.ok(await box1.locator('.opt').nth(ri1).evaluate(e => e.classList.contains('right')), '绿的是正确项')
      g.ok(/^正确答案是 [A-D]。/.test(await box1.locator('.explain').innerText()), '解析以“正确答案是 X。”开头')
      g.ok(/已答 2 题，答对 1 题/.test(await p.locator('#qzMsg').innerText()), '已答 2 题答对 1 题')
      const saved = await read(p, 'quiz3')
      g.ok(saved && saved['0'] === 0 && saved['1'] !== 0 && saved['1'] !== undefined, '存了答案：{0: 0, 1: 非 0} ' + JSON.stringify(saved))
      g.end()
    }

    {
      const g = R.group('刷新后：答案、解析、得分、选项顺序都还在')
      const before = await p.locator('#qzList .q').nth(1).locator('.opt').allTextContents()
      await p.reload(); await p.waitForSelector('#qzList .q')
      await p.waitForTimeout(300)
      g.ok(await p.locator('#qzList .explain').count() === 2, '两个解析还在')
      g.ok(/已答 2 题，答对 1 题/.test(await p.locator('#qzMsg').innerText()), '得分还在')
      g.ok(await p.locator('#qzList .q').nth(1).locator('.opt.wrong').count() === 1, '答错的标记还在')
      const after = await p.locator('#qzList .q').nth(1).locator('.opt').allTextContents()
      g.ok(JSON.stringify(before) === JSON.stringify(after), '选项顺序不变')
      g.end()
    }

    {
      const g = R.group('只看错题：只出答错的；全对时给出说明；重新作答清空')
      await p.locator('#qzTabs button', { hasText: '只看错题' }).click()
      g.ok(await p.locator('#qzList .q').count() === 1, '只有 1 道错题')
      g.ok((await qno(p.locator('#qzList .q').first())) === 'Q2', '是第 2 题')
      await p.locator('#qzReset').click()
      g.ok(JSON.stringify(Object.keys(await read(p, 'quiz3'))) === '["0"]', '“只看错题”下重新作答只清掉错题的记录')
      await p.locator('#qzTabs button', { hasText: '全部' }).click()
      g.ok(await p.locator('#qzList .explain').count() === 1, '“只看错题”下重置只清掉错题，第 1 题的答案还在')
      await p.locator('#qzReset').click()
      g.ok(await p.locator('#qzList .explain').count() === 0 && /0 \/ 60/.test(await p.locator('#qzScore').innerText()), '“全部”下重置：全部清空')
      await p.locator('#qzTabs button', { hasText: '只看错题' }).click()
      g.ok(/没有答错的题目/.test(await p.locator('#qzList').innerText()), '没有错题时的说明')
      g.end()
    }

    {
      const g = R.group('全部答对：得分 60 / 60 和“全部正确”')
      await seed(p, base, Object.fromEntries([['quiz3', Object.fromEntries(Q.map((_, i) => [i, 0]))]]))
      await p.goto(base + URL_PATH); await p.waitForSelector('#qzList .q'); await p.waitForTimeout(300)
      g.ok(/60 \/ 60/.test(await p.locator('#qzScore').innerText()) && /全部正确/.test(await p.locator('#qzMsg').innerText()), '60 / 60：' + await p.locator('#qzMsg').innerText())
      g.ok(await p.locator('#qzList .explain').count() === 60, '60 个解析')
      g.end()
    }

    {
      const g = R.group('随机 10 题：10 道，题库和各章自测混合；答案只在本次，不写进成绩；点选出解析')
      await seed(p, base, {})
      await p.goto(base + URL_PATH); await p.waitForSelector('#qzList .q'); await p.waitForTimeout(300)
      const kinds = new Set()
      const keys = new Set()
      for (let t = 0; t < 6; t++) {
        await p.locator('#qzTabs button', { hasText: '随机 10 题' }).click()
        const n = await p.locator('#qzList .q').count()
        g.ok(n === 10, `第 ${t + 1} 次抽到 ${n} 题`)
        for (const k of await p.$$eval('#qzList .q', es => es.map(e => e.dataset.kind + ':' + e.dataset.key))) { kinds.add(k.split(':')[0]); keys.add(k) }
      }
      g.ok(kinds.has('sc') && kinds.has('q'), '两类题都抽到过：' + [...kinds])
      g.ok(keys.size > 10, '每次抽的不一样（共 ' + keys.size + ' 个不同的题）')
      // 答一道各章自测题和一道综合测验题
      await p.locator('#qzTabs button', { hasText: '随机 10 题' }).click()
      const boxes = p.locator('#qzList .q')
      const kindList = await p.$$eval('#qzList .q', es => es.map(e => e.dataset.kind))
      const scI = kindList.indexOf('sc'), qI = kindList.indexOf('q')
      if (scI >= 0) {
        const b = boxes.nth(scI)
        await b.locator('.opt').first().click()
        g.ok(await b.locator('.explain').count() === 1 && await b.locator('.opt[disabled]').count() > 0, '各章自测题：点选后出解析并锁定')
        g.ok(await b.locator('h4', { hasText: '章内自测' }).count() === 1, '标题标明是章内自测')
      }
      if (qI >= 0) {
        const b = boxes.nth(qI)
        await b.locator('.opt').first().click()
        g.ok(await b.locator('.explain').count() === 1, '综合测验题：点选后出解析')
      }
      g.ok(/本次复习：已答 \d 题/.test(await p.locator('#qzMsg').innerText()), '随机 10 题的提示：' + await p.locator('#qzMsg').innerText())
      g.ok(await read(p, 'quiz3') === null, '没有写进综合测验成绩')
      g.ok(await read(p, 'revAt') === null, '随机 10 题不改复习时间')
      await p.locator('#qzReset').click()
      g.ok(await p.locator('#qzList .q').count() === 10 && await p.locator('#qzList .explain').count() === 0, '“重新作答”换一组新题')
      g.end()
    }

    {
      const g = R.group('各章自测题的题干、选项、解析来自各章 .md：带代码块的题也能渲染')
      await p.locator('#qzTabs button', { hasText: '随机 10 题' }).click()
      let found = false
      for (let t = 0; t < 15 && !found; t++) {
        if (await p.locator('#qzList .q[data-kind="sc"] .sc-stem pre').count()) found = true
        else await p.locator('#qzReset').click()
      }
      g.ok(found, '抽到了带代码块的章内自测题，代码块有高亮容器')
      g.ok(await p.locator('#qzList .q[data-kind="sc"] .sc-stem').first().innerText().then(t => t.trim().length > 5), '题干有文字')
      g.end()
    }

    {
      const g = R.group('待复习：没有到期的章时，标签页给出说明')
      await p.locator('#qzTabs button', { hasText: '待复习' }).click()
      g.ok(await p.locator('#qzList .q').count() === 0 && /现在没有需要复习的章节/.test(await p.locator('#qzList').innerText()), '空状态说明')
      g.end()
    }

    R.log(p.errs.length === 0, '综合测验页没有控制台报错 ' + p.errs.slice(0, 2).join(' | '))
  } finally {
    await site.stop()
  }
  console.log(R.bad ? '有 ' + R.bad + ' 项失败' : '全部通过')
  process.exit(R.bad ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
