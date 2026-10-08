// 练习编辑器的折叠只读块（//#fold 标题 … //#endfold）的浏览器测试。写法和行为见 course/AUTHORING.md 的“折叠块”一节，实现见 editor/folds.js。
// 借 01-first 的 counter 练习，用根元素上的 __setStarter 换成带折叠块的起始代码（和 mechanics 里的 __setFaded 同一手法）。
// 用法：node tests/site/folds.test.js     （用 course/.vitepress/dist，要先 npm run build；或 COURSE_OUT_DIR=<已构建目录>）
const { makeReporter, startSite, seed, read } = require('./helpers')

const R = makeReporter()
const MIN = 60e3
const T0 = new Date('2026-06-01T10:00:00Z').getTime()
const CH = 'first', ID = 'counter'

// ---- 测试用的代码：折叠块里有 40 行填充、一个会用到的函数和一个会抛错的函数 ----
const PAD = Array.from({ length: 40 }, (_, i) => 'const pad' + (i + 1) + ' = ' + (i + 1))
const BLOCK_BODY = [...PAD, 'function twice(n) { return n * 2 }', 'function boom() { throw new Error("块里出错") }']
const BODY_LINES = BLOCK_BODY.length                       // 42
const fold = (title, body) => '//#fold ' + title + '\n' + body.join('\n') + '\n//#endfold\n'
const TITLE = '第 24–30 章你写过的零件'
const FOLD = fold(TITLE, BLOCK_BODY)
const TPL = '<button>值是 {{ count }}</button>'
const START_JS = FOLD + 'const count = ref(twice(21))\n\nreturn { count }'
const SOL_JS = FOLD + 'const count = ref(twice(21))\nconst inc = () => count.value++\n\nreturn { count, inc }'
const LINE_COUNT_LINE = 1 + BODY_LINES + 1 + 1             // “const count” 所在的真实行号：开始标记 + 正文 + 结束标记 + 它自己 = 45
const BOOM_REAL = 1 + 40 + 1 + 1                           // function boom：开始标记 + 40 行填充 + twice，再下一行 = 43

async function open(p, base) {
  await p.goto(base + '/chapters/01-first.html')
  await p.waitForSelector('.ex[data-ex="' + ID + '"] .cm-content', { timeout: 15000 })
  await p.waitForTimeout(300)
  return p.locator('.ex[data-ex="' + ID + '"]')
}
const draft = async p => (await read(p))?.[CH]?.ex?.[ID]
const jsEd = box => box.locator('.ed').nth(1)
const setCode = (box, tpl, js) => box.evaluate((r, [t, j]) => r.__setCode(t, j), [tpl, js])
const setStarter = (box, st, sol) => box.evaluate((r, [a, b]) => r.__setStarter(a, b), [st, sol])
async function check(box) { await box.locator('[data-a="check"]').click(); await box.page().waitForTimeout(700) }
const parseFoldCount = t => (t.match(/^\/\/#fold /gm) || []).length
const headBtn = box => jsEd(box).locator('.cm-foldBtn[data-fold-kind="block"]')

;(async () => {
  const site = await startSite()
  const base = site.base
  try {
    // ---------- 折叠、展开、行号 ----------
    {
      const g = R.group('折叠块：初始折叠成一行并显示行数；可以点开、收起；aria-expanded 和名称；行号是真实行号')
      const p = await site.newPage()
      await seed(p, base, {})
      const box = await open(p, base)
      g.ok(await box.locator('.cm-foldBtn').count() === 0, '没有标记的练习：没有折叠按钮（行为不变）')
      await setStarter(box, { tpl: TPL, js: START_JS }, { tpl: TPL, js: SOL_JS })
      await box.locator('[data-a="reset"]').click()
      await p.waitForTimeout(400)
      const btn = headBtn(box)
      g.ok(await btn.count() === 1, '重置为带折叠块的起始代码：出现一个折叠按钮')
      const txt = await btn.innerText()
      g.ok(txt.includes(TITLE) && txt.includes('（' + BODY_LINES + ' 行）') && txt.includes('▸'), '折叠行显示标题和行数：' + txt.replace(/\s+/g, ' '))
      g.ok(await btn.getAttribute('aria-expanded') === 'false', 'aria-expanded=false')
      g.ok(/展开：.*只读/.test(await btn.getAttribute('aria-label')), '可读的名称：' + await btn.getAttribute('aria-label'))
      g.ok(!(await jsEd(box).locator('.cm-content').innerText()).includes('pad1 '), '折叠时块里的代码不显示')
      const nums = await jsEd(box).locator('.cm-lineNumbers .cm-gutterElement').allInnerTexts()
      g.ok(nums.includes(String(LINE_COUNT_LINE)), '折叠后块外的行号是完整代码里的真实行号：有 ' + LINE_COUNT_LINE + '（' + nums.join(',') + '）')
      await btn.click()
      g.ok(await jsEd(box).locator('.cm-foldBtn[aria-expanded="true"]').count() === 2, '点开：开头和结尾各有一个按钮，aria-expanded=true')
      g.ok((await jsEd(box).locator('.cm-content').innerText()).includes('pad1 = 1'), '展开后能看到块里的代码')
      g.ok(await jsEd(box).locator('.cm-foldBody').count() > 3, '块里的行有弱化底色')
      await jsEd(box).locator('.cm-foldBtn[data-fold-kind="head"]').click()
      g.ok(await headBtn(box).count() === 1 && await headBtn(box).getAttribute('aria-expanded') === 'false', '点开头的按钮：折回')
      // 键盘：聚焦按钮，回车展开，焦点留在新按钮上，再按空格折回
      await headBtn(box).focus()
      await p.keyboard.press('Enter')
      await p.waitForTimeout(150)
      g.ok(await jsEd(box).locator('.cm-foldBtn[aria-expanded="true"]').count() === 2, '键盘回车展开')
      g.ok(await p.evaluate(() => document.activeElement?.classList.contains('cm-foldBtn')), '展开后焦点仍在折叠按钮上（没有掉出去）')
      await p.keyboard.press('Space')
      await p.waitForTimeout(150)
      g.ok(await headBtn(box).count() === 1, '键盘空格折回')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g.end()
    }

    // ---------- 只读 ----------
    {
      const g = R.group('只读：块内输入无效并有提示，块外输入有效；全选删除、粘贴覆盖不破坏块；撤销不会破坏')
      const p = await site.newPage()
      await seed(p, base, {})
      const box = await open(p, base)
      await setStarter(box, { tpl: TPL, js: START_JS }, { tpl: TPL, js: SOL_JS })
      await setCode(box, TPL, START_JS)
      await p.waitForTimeout(200)
      const ed = jsEd(box)
      // 展开，在块里的一行末尾输入
      await headBtn(box).click()
      await ed.locator('.cm-line', { hasText: 'const pad3 = 3' }).click()
      await p.keyboard.press('End')
      await p.keyboard.type('ZZ')
      await p.waitForTimeout(200)
      g.ok((await draft(p)).code.js === START_JS, '展开后在块里输入：代码不变（展开也只读）')
      g.ok(await ed.locator('.cm-foldToast.show').count() === 1 && /只读/.test(await ed.locator('.cm-foldToast').innerText()), '有一次性的提示：' + await ed.locator('.cm-foldToast').innerText())
      await p.keyboard.press('Backspace')
      await p.keyboard.press('Delete')
      g.ok((await draft(p)).code.js === START_JS, '块里按退格和删除也无效')
      await p.waitForTimeout(3200)
      g.ok(await ed.locator('.cm-foldToast.show').count() === 0, '提示几秒后自己消失')
      // 块外输入
      await ed.locator('.cm-line', { hasText: 'const count' }).click()
      await p.keyboard.press('End')
      await p.keyboard.type(' // 我写的')
      await p.waitForTimeout(200)
      g.ok((await draft(p)).code.js === START_JS.replace('ref(twice(21))', 'ref(twice(21)) // 我写的'), '块外照常输入')
      // 标记行：光标放在结束标记行末尾输入、退格，都不生效；块前后的换行也删不掉
      await ed.locator('.cm-foldBtn[data-fold-kind="end"]').click()
      await p.keyboard.press('ArrowRight')   // 点按钮不会把光标放进去，方向键从当前选区继续
      const before = (await draft(p)).code.js
      await p.keyboard.type('Q')
      await p.waitForTimeout(150)
      g.ok((await draft(p)).code.js.includes('//#endfold') && !(await draft(p)).code.js.includes('Q//') && !(await draft(p)).code.js.includes('//#endfoldQ'), '标记行不会被改动')
      // 全选删除
      await headBtn(box).count() || await jsEd(box).locator('.cm-foldBtn[data-fold-kind="head"]').click()
      await ed.locator('.cm-line', { hasText: 'const count' }).click()
      await p.keyboard.press('ControlOrMeta+a')
      await p.keyboard.press('Backspace')
      await p.waitForTimeout(250)
      let d = (await draft(p)).code.js
      g.ok(d.includes(FOLD.trimEnd()), '全选后删除：折叠块（含标记和全部 ' + BODY_LINES + ' 行）原样保留')
      g.ok(!d.includes('const count'), '全选后删除：块外的代码被删掉了')
      g.ok(await ed.locator('.cm-foldToast.show').count() === 1, '并提示了只读')
      // 全选后输入文字（覆盖）
      await p.keyboard.press('ControlOrMeta+a')
      await p.keyboard.type('const count = ref(0)')
      await p.waitForTimeout(250)
      d = (await draft(p)).code.js
      g.ok(d.includes(FOLD.trimEnd()) && (d.match(/\/\/#fold/g) || []).length === 1, '全选后输入覆盖：块仍在，且只有一个')
      // 粘贴覆盖：把整份答案（含标记）粘贴到全选上，块不重复、不被破坏
      await p.evaluate(txt => navigator.clipboard.writeText(txt).catch(() => {}), SOL_JS)
      await p.keyboard.press('ControlOrMeta+a')
      await p.evaluate(txt => {
        const el = document.querySelectorAll('.ex[data-ex="counter"] .cm-content')[1]
        const dt = new DataTransfer(); dt.setData('text/plain', txt)
        el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
      }, SOL_JS)
      await p.waitForTimeout(250)
      d = (await draft(p)).code.js
      g.ok(d.includes(FOLD.trimEnd()), '粘贴覆盖后原来的块仍完整（保护区里的删除被拦下，粘贴的文字被丢弃，不会出现被破坏的块）')
      g.ok(parseFoldCount(d) === 1, '粘贴覆盖后仍然只有一个折叠块：' + parseFoldCount(d))
      // 撤销：不能撤出破坏块的状态
      for (let i = 0; i < 6; i++) await p.keyboard.press('ControlOrMeta+z')
      await p.waitForTimeout(250)
      d = (await draft(p)).code.js
      g.ok(d.includes(FOLD.trimEnd()), '多次撤销之后块仍完整')
      // 重置：回到完整的起始代码
      await box.locator('[data-a="reset"]').click()
      await p.waitForTimeout(300)
      g.ok((await draft(p)).code.js === START_JS && await headBtn(box).count() === 1, '重置：恢复完整的起始代码，块重新折叠')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g.end()
    }

    // ---------- 运行用完整代码、报错行号 ----------
    {
      const g = R.group('运行用完整代码：块里定义的函数块外能调用；出错行号是完整代码里的真实行，出错行在块里时自动展开')
      const p = await site.newPage()
      await seed(p, base, {})
      const box = await open(p, base)
      await setStarter(box, { tpl: TPL, js: START_JS }, { tpl: TPL, js: SOL_JS })
      await setCode(box, TPL, START_JS)
      await box.locator('[data-a="run"]').click()
      await p.waitForTimeout(400)
      g.ok(/值是 42/.test(await box.locator('.ex-out').innerText()) && await box.locator('.ex-err').count() === 0, '折叠状态下运行：块里的 twice 被块外调用，显示“值是 42”')
      g.ok(await headBtn(box).count() === 1, '运行没有展开无关的块')
      // 块外出错：行号对应真实行
      const outside = FOLD + 'const count = ref(1)\nnull.x\nreturn { count }'
      await setCode(box, TPL, outside)
      await box.locator('[data-a="run"]').click()
      await p.waitForTimeout(400)
      let errTxt = await box.locator('.ex-err').innerText()
      g.ok(errTxt.includes('脚本第 ' + (LINE_COUNT_LINE + 1) + ' 行') && !errTxt.includes('折叠块'), '块外出错：报真实行号 ' + (LINE_COUNT_LINE + 1) + '：' + errTxt)
      g.ok(await headBtn(box).count() === 1, '出错行在块外：块保持折叠')
      g.ok(await jsEd(box).locator('.cm-badLine').count() === 1, '块外的出错行被标出')
      // 块内出错：boom 在块里被块外调用
      const inside = FOLD + 'const count = ref(1)\nboom()\nreturn { count }'
      await setCode(box, TPL, inside)
      await box.locator('[data-a="run"]').click()
      await p.waitForTimeout(500)
      errTxt = await box.locator('.ex-err').innerText()
      g.ok(errTxt.includes('块里出错') && errTxt.includes('脚本第 ' + BOOM_REAL + ' 行') && errTxt.includes('折叠块「' + TITLE + '」'), '块内出错：真实行号 ' + BOOM_REAL + ' 并注明在哪个折叠块：' + errTxt)
      g.ok(await jsEd(box).locator('.cm-foldBtn[aria-expanded="true"]').count() === 2, '出错行在块里：自动展开那个块')
      g.ok(await jsEd(box).locator('.cm-badLine').count() === 1 && /function boom/.test(await jsEd(box).locator('.cm-badLine').innerText()), '被标出的就是 function boom 那一行')
      g.ok(await jsEd(box).locator('.cm-badLine').evaluate(l => { const a = l.getBoundingClientRect(), b = l.closest('.cm-scroller').getBoundingClientRect(); return a.top >= b.top - 1 && a.bottom <= b.bottom + 1 }), '展开后编辑器滚到了出错行，它在可见范围内')
      // 点错误信息跳转：先折回，再点
      await jsEd(box).locator('.cm-foldBtn[data-fold-kind="head"]').click()
      await box.locator('.ex-err').click()
      await p.waitForTimeout(250)
      g.ok(await jsEd(box).locator('.cm-foldBtn[aria-expanded="true"]').count() === 2, '点错误信息跳到出错行：块折叠着也会自动展开')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g.end()
    }

    // ---------- 提示阶梯、粘贴答案、半成品/答案/找回 ----------
    {
      const g = R.group('有折叠块时：保存草稿含标记；失败计数只看真的改了没（标记是注释）；粘贴答案判定；填入答案/半成品、找回、重置')
      const p = await site.newPage()
      await seed(p, base, {})
      await p.clock.setFixedTime(T0)
      const box = await open(p, base)
      await setStarter(box, { tpl: TPL, js: START_JS }, { tpl: TPL, js: SOL_JS })
      await box.evaluate(r => r.__setFaded({ js: '//#fold 半成品里的块\nfunction twice(n) { return n * 2 }\n//#endfold\nconst count = ref(/* ✏️ 填 */)\nreturn { count }' }))
      await box.locator('[data-a="reset"]').click()
      await p.waitForTimeout(300)
      g.ok((await draft(p)).code.js === START_JS, '草稿里保存的是含标记的完整代码')
      // 没改代码：不计数
      await check(box)
      g.ok(!(await draft(p))?.fails && /不计入解锁次数/.test(await box.locator('.ex-res').innerText()), '起始代码原样检查：不计入失败')
      // 只改折叠标记的标题、加缩进、加注释：仍不算改过
      await setCode(box, TPL, START_JS.replace(TITLE, '改个标题') + ' // 注释')
      await check(box)
      g.ok(!(await draft(p))?.fails, '只改折叠块的标题或加注释：不算改过代码')
      // 去掉标记（旧草稿的形状：没有标记，内容相同）：同样不算改过
      await setCode(box, TPL, START_JS.replace(/\/\/#(end)?fold.*\n/g, ''))
      await check(box)
      g.ok(!(await draft(p))?.fails, '没有标记、内容与起始代码相同（旧草稿）：不出错，也不算改过')
      g.ok(await box.locator('.cm-foldBtn').count() === 0, '没有标记的草稿：编辑器不折叠')
      // 真的改了块外
      await setCode(box, TPL, START_JS.replace('twice(21)', 'twice(22)'))
      await check(box)
      g.ok((await draft(p)).fails === 1, '改了块外的代码：失败计 1 次')
      // 改了块里（走 __setCode，等于旧版本编辑器能做的事）：也算改过
      await setCode(box, TPL, START_JS.replace('n * 2', 'n * 3'))
      await check(box)
      g.ok((await draft(p)).fails === 2, '和起始代码、上次失败都不同：再计 1 次')
      // 半成品：先把阶梯推到够
      await p.clock.setFixedTime(T0 + 3 * MIN)
      await setCode(box, TPL, START_JS.replace('twice(21)', 'twice(23)'))
      await check(box)
      const faded = box.locator('[data-a="faded"]')
      g.ok(!(await faded.isDisabled()), '失败 3 次且过了 2 分钟：半成品可点')
      await setCode(box, TPL, START_JS.replace('twice(21)', 'twice(24)'))
      await faded.click()
      await p.waitForTimeout(300)
      g.ok(await headBtn(box).count() === 1 && (await headBtn(box).innerText()).includes('半成品里的块'), '填入半成品：半成品里的折叠块也折叠')
      g.ok(await box.locator('[data-a="restore"]').count() === 1, '填半成品前自己的代码存下来了')
      await box.locator('[data-a="restore"]').click()
      await p.waitForTimeout(300)
      g.ok((await draft(p)).code.js === START_JS.replace('twice(21)', 'twice(24)') && (await headBtn(box).innerText()).includes(TITLE), '找回我的代码：完整恢复，块重新折叠为原来的标题')
      // 参考答案：再失败够 5 分钟
      await p.clock.setFixedTime(T0 + 6 * MIN)
      await setCode(box, TPL, START_JS.replace('twice(21)', 'twice(25)'))
      await check(box)
      const sol = box.locator('[data-a="sol"]')
      g.ok(!(await sol.isDisabled()), '参考答案已解锁')
      await sol.click()
      await p.waitForTimeout(300)
      g.ok((await draft(p)).code.js === SOL_JS && await headBtn(box).count() === 1, '填入参考答案：完整答案（含标记）在草稿里，块折叠')
      await check(box)
      g.ok(/参考答案的原文/.test(await box.locator('.ex-res').innerText()), '看过答案后直接检查答案原文：判为粘贴答案，不通过')
      // 把标记去掉再交（复制可见内容的情形）：规范化后相同，仍判为粘贴
      await setCode(box, TPL, SOL_JS.replace(/\/\/#(end)?fold.*\n/g, ''))
      await check(box)
      g.ok(/参考答案的原文/.test(await box.locator('.ex-res').innerText()), '去掉标记的答案原文：也判为粘贴')
      // 改写答案通过
      await setCode(box, '<button @click="inc">值是 {{ count }}</button>', SOL_JS + '\n// 改写')
      await box.evaluate(r => r.querySelector('[data-a="check"]'))
      // 本练习的判题是“点了 N 次”，这里不追求通过；只验证重置
      await box.locator('[data-a="reset"]').click()
      await p.waitForTimeout(300)
      g.ok((await draft(p)).code.js === START_JS && await headBtn(box).count() === 1, '看过答案后重置：恢复带折叠块的完整起始代码')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g.end()
    }

    // ---------- 模板编辑器 ----------
    {
      const g = R.group('模板编辑器：<!--#fold 标题--> … <!--#endfold--> 同样折叠只读，运行用完整模板')
      const p = await site.newPage()
      await seed(p, base, {})
      const box = await open(p, base)
      const tpl = '<!--#fold 模板里已写好的部分-->\n<h4>标题</h4>\n<p>说明</p>\n<!--#endfold-->\n<button>{{ n }}</button>'
      await setCode(box, tpl, 'const n = ref(7)\nreturn { n }')
      await p.waitForTimeout(250)
      const tb = box.locator('.ed').nth(0).locator('.cm-foldBtn')
      g.ok(await tb.count() === 1 && (await tb.innerText()).includes('模板里已写好的部分') && (await tb.innerText()).includes('2 行'), '模板编辑器折叠成一行：' + (await tb.innerText()).replace(/\s+/g, ' '))
      await box.locator('[data-a="run"]').click()
      await p.waitForTimeout(300)
      g.ok(/标题/.test(await box.locator('.ex-out').innerText()) && /7/.test(await box.locator('.ex-out').innerText()), '运行用完整模板：折叠块里的 <h4> 也渲染了')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g.end()
    }

    // ---------- 手机宽度 ----------
    {
      const g = R.group('390px 宽：折叠和展开状态都没有横向溢出，折叠按钮可点')
      const p = await site.newPage({ viewport: { width: 390, height: 844 } })
      await seed(p, base, {})
      const box = await open(p, base)
      await setStarter(box, { tpl: TPL, js: START_JS }, { tpl: TPL, js: SOL_JS })
      await setCode(box, TPL, fold('一个很长很长很长很长很长很长很长很长很长的标题，用来检查窄屏下标题会被截断而不是撑宽页面', BLOCK_BODY) + 'const count = ref(1)\nreturn { count }')
      await p.waitForTimeout(300)
      const over = () => p.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      g.ok(await over() <= 0, '折叠时页面没有横向滚动')
      const w = await headBtn(box).evaluate(b => [b.getBoundingClientRect().right, b.closest('.ed').getBoundingClientRect().right])
      g.ok(w[0] <= w[1] + 1, '折叠按钮没有超出编辑器')
      await headBtn(box).click()
      await p.waitForTimeout(200)
      g.ok(await over() <= 0, '展开时页面没有横向滚动')
      const ew = await jsEd(box).evaluate(e => [e.getBoundingClientRect().height, innerHeight])
      g.ok(ew[0] <= ew[1] * 0.71 + 2, '展开后编辑器高度不超过屏幕的 70%（' + Math.round(ew[0]) + '/' + ew[1] + '）')
      await box.scrollIntoViewIfNeeded()
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2).join('|'))
      g.end()
    }
  } finally {
    await site.stop()
  }
  console.log(R.bad ? '有 ' + R.bad + ' 项失败' : '全部通过')
  process.exit(R.bad ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
