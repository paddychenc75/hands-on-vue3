// 综合测验页（chapters/27-quiz）的测试：60 题、按 6 个阶段筛选、点选出解析、只看错题、重新作答。
// 这一页现在是最小版本：答题记录只在内存里（刷新后清空，不写进存储）；没有“待复习”和“随机 10 题”。
// 下一步这一页会整体换成按阶段的阶段测验页。
// 用法：node tests/site/quiz.test.js     （用 course/.vitepress/dist，要先 npm run build）
const { makeReporter, startSite, loadChapters, loadQuestions, seed, read } = require('./helpers')

const R = makeReporter()
const Q = loadQuestions()
const CH = loadChapters()
const URL_PATH = '/chapters/27-quiz.html'
const stageOfQ = qi => CH.find(c => c.id === Q[qi][3]).stage

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
      const g = R.group('全部：60 题，每题 4 个选项，初始没有解析，得分 0 / 60，标签是 全部 + 6 个阶段 + 只看错题')
      g.ok(Q.length === 60, '题库有 60 题')
      g.ok(Q.every(q => typeof q[4] !== 'number'), '题库里不再存阶段号（第 5 项只可能是代码）')
      g.ok(await p.locator('#qzList .q').count() === 60, '页面显示 60 题')
      g.ok(await p.locator('#qzList .q').first().locator('.opt').count() === 4, '第一题 4 个选项')
      g.ok(await p.locator('#qzList .explain').count() === 0, '没有解析')
      g.ok(/0 \/ 60/.test(await p.locator('#qzScore').innerText()) && /还没有作答/.test(await p.locator('#qzMsg').innerText()), '得分 0 / 60')
      const tabs = await p.locator('#qzTabs button').allTextContents()
      g.ok(tabs.join('|') === '全部|01 入门|02 进阶|03 高级|04 原理与架构|05 生态与实战|06 深入|只看错题', '八个标签：' + tabs.join(','))
      g.ok(await p.locator('#qzTabs button.on').innerText() === '全部', '默认“全部”')
      g.ok(!tabs.some(t => /待复习|随机/.test(t)), '没有“待复习”和“随机 10 题”')
      g.end()
    }

    {
      const g = R.group('按阶段筛选：每个阶段的题数和“所属章的阶段”一致')
      let sum = 0
      for (let s = 1; s <= 6; s++) {
        await p.locator('#qzTabs button').nth(s).click()
        const want = Q.filter((_, qi) => stageOfQ(qi) === s).length
        const n = await p.locator('#qzList .q').count()
        const lvls = new Set(await p.locator('#qzList .q .lvl').allInnerTexts())
        sum += n
        g.ok(n === want && n > 0, `阶段 ${s}：${n} 题（按章推出 ${want}）`)
        g.ok(lvls.size === 1, `阶段 ${s}：题目的阶段标记一致 ${[...lvls]}`)
        g.ok(await p.locator('#qzTabs button.on').count() === 1, '只有一个标签高亮')
      }
      g.ok(sum === 60, '六个阶段的题数加起来是 60：' + sum)
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
      g.end()
    }

    {
      const g = R.group('答题记录只在内存里：不写进存储，刷新后清空')
      g.ok(await read(p) === null, '没有写进度存储')
      g.ok((await p.evaluate(() => Object.keys(localStorage))).filter(k => k !== 'vitepress-theme-appearance').length === 0, 'localStorage 里没有进度相关的键（VitePress 自己的深浅色偏好除外）')
      await p.reload(); await p.waitForSelector('#qzList .q'); await p.waitForTimeout(300)
      g.ok(await p.locator('#qzList .explain').count() === 0 && /0 \/ 60/.test(await p.locator('#qzScore').innerText()), '刷新后得分回到 0 / 60')
      g.end()
    }

    {
      const g = R.group('只看错题：只出答错的；全对时给出说明；重新作答清空')
      const b0 = p.locator('#qzList .q').nth(0), b1 = p.locator('#qzList .q').nth(1)
      await b0.locator('.opt').nth(await rightIdx(b0, 0)).click()
      const ri1 = await rightIdx(b1, 1)
      await b1.locator('.opt').nth(ri1 === 0 ? 1 : 0).click()
      await p.locator('#qzTabs button', { hasText: '只看错题' }).click()
      g.ok(await p.locator('#qzList .q').count() === 1, '只有 1 道错题')
      g.ok((await qno(p.locator('#qzList .q').first())) === 'Q2', '是第 2 题')
      await p.locator('#qzReset').click()
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
      await p.locator('#qzTabs button', { hasText: '全部' }).click()
      const boxes = p.locator('#qzList .q')
      for (let i = 0; i < 60; i++) {
        const b = boxes.nth(i)
        await b.locator('.opt').nth(await rightIdx(b, i)).click()
      }
      g.ok(/60 \/ 60/.test(await p.locator('#qzScore').innerText()) && /全部正确/.test(await p.locator('#qzMsg').innerText()), '60 / 60：' + await p.locator('#qzMsg').innerText())
      g.ok(await p.locator('#qzList .explain').count() === 60, '60 个解析')
      g.end()
    }

    R.log(p.errs.length === 0, '综合测验页没有控制台报错 ' + p.errs.slice(0, 2).join(' | '))
  } finally {
    await site.stop()
  }
  console.log(R.bad ? '有 ' + R.bad + ' 项失败' : '全部通过')
  process.exit(R.bad ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
