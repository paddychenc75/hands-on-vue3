// 用法：node tests/site/exercises.test.js [章文件名 ...]   （先运行 npm run build；npm run test:site 会自动先构建）
// 起 vitepress preview，对每章页面：
//   1. 每道练习：初始代码不通过，答案通过，每个 wrong 都不通过
//   2. 页面没有控制台报错
//   3. 自测题点选后刷新页面，选择仍在
//   4. 实验台（见下面的 LABS）：先猜之前实验台不显示，答完后出现，做一次有代表性的操作，断言结果
const { chromium } = require('playwright')
const { spawn } = require('child_process')
const fs = require('fs')
const net = require('net')
const path = require('path')
const esbuild = require('esbuild')

const ROOT = path.resolve(__dirname, '../..')
let bad = 0
const log = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + msg) }

// 用 esbuild 把 TS 练习数据打成 CJS，在 Node 里读（check 函数用不到，只取数据）
function loadExercises() {
  const r = esbuild.buildSync({
    entryPoints: [path.join(ROOT, 'course/exercises/index.ts')],
    bundle: true, platform: 'node', format: 'cjs', write: false, external: ['vue']
  })
  const m = { exports: {} }
  new Function('module', 'exports', 'require', r.outputFiles[0].text)(m, m.exports, require)
  return m.exports.exercises
}

function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => res(p)) })
    s.on('error', rej)
  })
}

async function waitUp(url) {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url)).ok) return } catch (e) { /* 还没起来 */ }
    await new Promise(r => setTimeout(r, 250))
  }
  throw new Error('preview 没有启动')
}

// ---- 实验台测试 ----
// 每章的实验台：id 是 <Lab id>，pick 是“先猜”里点哪一项（任意一项都会打开实验台），run 里做操作并断言。
// 新增实验台时，在这里给本章加一项。run 的参数：p 是页面，body 是实验台正文的 locator，ok(c, msg) 记一条结果。
const LABS = {
  '02-template': [
    {
      id: 'demo-classes', name: '勾选 hasError 后渲染出 class="item active error"', pick: 2,
      async run(p, body, ok) {
        await p.locator('#demo-classes .domview').waitFor()
        ok(/class="item active"/.test(await body.locator('.domview').textContent()), '初始 class 是 item active')
        await body.locator('label.ctl', { hasText: 'hasError' }).locator('input').check()
        await p.waitForTimeout(100)
        const txt = await body.locator('.domview').textContent()
        ok(/class="item active error"/.test(txt), '勾选 hasError 后 class 是 item active error（当前：' + txt.split('\n')[0] + '）')
        await body.locator('label.ctl', { hasText: '数组语法' }).locator('input').check()
        await p.waitForTimeout(100)
        ok(/class="item active error"/.test(await body.locator('.domview').textContent()), '切到数组语法后结果不变')
      }
    },
    {
      id: 'demo-directives', name: 'v-on 标签页：.once 点三次再普通 +1，count = 11', pick: 1,
      async run(p, body, ok) {
        await body.locator('.tabs button').first().waitFor()
        const tabs = await body.locator('.tabs button').allTextContents()
        ok(tabs.length === 6, '有 6 个标签页（' + tabs.join('、') + '）')
        for (let i = 0; i < tabs.length; i++) {
          await body.locator('.tabs button').nth(i).click()
          const n = await body.locator('.box').evaluate(e => e.children.length)
          ok(n >= 2, '标签页「' + tabs[i] + '」渲染出小组件')
        }
        await body.locator('.tabs button', { hasText: 'v-on' }).click()
        for (let i = 0; i < 3; i++) await body.getByRole('button', { name: '.once +10' }).click()
        await body.getByRole('button', { name: '普通 +1' }).click()
        ok(/count = 11\b/.test(await body.locator('.box').textContent()), 'count = 11')
        await body.locator('.tabs button', { hasText: 'v-model' }).click()
        await body.locator('.box input.t').first().fill('  张三  ')
        ok(/"name": "张三"/.test(await body.locator('.domview').textContent()), 'v-model.trim 去掉首尾空格')
      }
    },
    {
      id: 'demo-directive', name: '点“无关数据 n++”后日志新增两条 beforeUpdate 和两条 updated', pick: 0,
      async run(p, body, ok) {
        await body.locator('.log').waitFor()
        const lines = async () => (await body.locator('.log > div').allTextContents()).map(t => t.replace(/^\S+\s+/, ''))
        const count = (ls, hook) => ls.filter(t => t.startsWith(hook + ' ')).length
        const before = await lines()
        await body.getByRole('button', { name: /无关数据 n\+\+/ }).click()
        await p.waitForTimeout(100)
        const after = await lines()
        ok(count(after, 'beforeUpdate') - count(before, 'beforeUpdate') === 2, '新增 2 条 beforeUpdate')
        ok(count(after, 'updated') - count(before, 'updated') === 2, '新增 2 条 updated')
        ok(count(after, 'unmounted') === count(before, 'unmounted'), '没有 unmounted')
      }
    }
  ]
}

async function runLabs(browser, base, ch) {
  for (const lab of LABS[ch] || []) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const p = await ctx.newPage()
    const errs = []
    p.on('pageerror', e => errs.push(e.message))
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
    const fails = []
    const ok = (c, msg) => { if (!c) fails.push(msg) }
    try {
      await p.goto(base + '/chapters/' + ch + '.html')
      const box = p.locator('.lab', { has: p.locator('#' + lab.id) })
      // 实验台在“深入”折叠块里时，先展开
      const deep = box.locator('xpath=ancestor::details[1]')
      if (await deep.count()) await deep.locator('> summary').click()
      await box.scrollIntoViewIfNeeded()
      await box.locator('.sc.predict .sc-o').first().waitFor({ timeout: 10000 })
      ok(await box.evaluate(e => e.classList.contains('gated')), '答题前实验台是关着的')
      ok(!(await p.locator('#' + lab.id).isVisible()), '答题前实验台正文不显示')
      await box.locator('.sc.predict .sc-o').nth(lab.pick).click()
      ok(!(await box.evaluate(e => e.classList.contains('gated'))), '选完后实验台打开')
      const body = p.locator('#' + lab.id)
      await body.waitFor({ state: 'visible', timeout: 10000 })
      await lab.run(p, body, ok)
      ok(errs.length === 0, '没有控制台报错 ' + errs.slice(0, 2).join(' | '))
    } catch (e) { fails.push('异常：' + e.message.split('\n')[0]) }
    log(fails.length === 0, `${ch}: 实验台 ${lab.id}：${lab.name}` + (fails.length ? ' → ' + fails.join('；') : ''))
    await ctx.close()
  }
}

;(async () => {
  const EX = loadExercises()
  const chapters = process.argv.length > 2
    ? process.argv.slice(2)
    : fs.readdirSync(path.join(ROOT, 'course/chapters')).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''))
  const port = await freePort()
  const srv = spawn(process.execPath, [path.join(ROOT, 'node_modules/vitepress/bin/vitepress.js'), 'preview', 'course', '--port', String(port), '--strictPort'], { cwd: ROOT, stdio: 'ignore' })
  const base = 'http://127.0.0.1:' + port
  const browser = await chromium.launch()
  try {
    await waitUp(base + '/')
    for (const ch of chapters) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
      const p = await ctx.newPage()
      const errs = []
      p.on('pageerror', e => errs.push(e.message))
      p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
      p.on('requestfailed', r => errs.push('请求失败 ' + r.url()))
      const url = base + '/chapters/' + ch + '.html'
      await p.goto(url)
      await p.waitForSelector('.ex[data-ex] .cm-content', { timeout: 15000 }).catch(() => {})
      await p.waitForTimeout(500)

      // ---- 练习 ----
      const ids = await p.$$eval('.ex[data-ex]', es => es.map(e => e.dataset.ex))
      const placeholders = await p.$$eval('.ex-ph, .ex-err', es => es.length)
      log(placeholders === 0, `${ch}: 所有练习都已渲染（${ids.join(', ') || '无'}）`)
      async function runWith(id, tpl, js) {
        return p.evaluate(async ([id, tpl, js]) => {
          const r = document.querySelector('.ex[data-ex="' + id + '"]')
          r.scrollIntoView()
          r.__setCode(tpl, js)
          r.querySelector('[data-a="check"]').click()
          for (let i = 0; i < 40; i++) {
            await new Promise(s => setTimeout(s, 100))
            const t = r.querySelector('.ex-res')
            if (t && t.children.length && !/\bnull\b/.test('')) { /* 有结果就停 */ break }
          }
          await new Promise(s => setTimeout(s, 700))
          const rs = [...r.querySelectorAll('.ex-res > div')]
          return { all: rs.some(d => /全部通过/.test(d.textContent)), fails: rs.filter(d => d.classList.contains('no')).map(d => d.textContent).slice(0, 2) }
        }, [id, tpl, js])
      }
      for (const id of ids) {
        const e = EX[id]
        if (!e) { log(false, `${id}: 练习数据里没有这个 id`); continue }
        const s = await runWith(id, e.tpl, e.js)
        const a = await runWith(id, e.solTpl || e.tpl, e.solJs || e.js)
        const ws = []
        for (const w of e.wrong || []) ws.push(await runWith(id, w.tpl || e.solTpl || e.tpl, w.js || e.solJs || e.js))
        const ok = !s.all && a.all && ws.every(x => !x.all)
        log(ok, `${id}「${e.title}」初始${s.all ? '通过(错)' : '不通过'} 答案${a.all ? '通过' : '不通过(错) ' + a.fails.join(' | ')}` +
          ((e.wrong || []).length ? ' wrong ' + ws.map(x => (x.all ? '通过(错)' : '不通过')).join(',') : ' [无 wrong]'))
      }

      // 编辑器真的可以输入（走真实键盘路径）
      if (ids.length) {
        const first = p.locator('.ex[data-ex="' + ids[0] + '"] .cm-content').first()
        await first.click()
        await p.keyboard.press('Control+End')
        await p.keyboard.type('Z')
        const txt = await first.textContent()
        log(/Z/.test(txt), `${ids[0]}: 在编辑器里键入文字有效`)
      }

      // ---- 自测：点选后刷新仍在 ----
      const scCount = await p.$$eval('.vp-doc .sc:not(.predict)', es => es.length)
      if (scCount) {
        const pick = await p.evaluate(() => {
          const out = []
          document.querySelectorAll('.vp-doc .sc:not(.predict)').forEach((sc, i) => {
            const os = sc.querySelectorAll('.sc-o'); const j = (i + 1) % os.length
            os[j].click(); out.push(j)
          })
          return out
        })
        const shown = await p.$$eval('.vp-doc .sc.answered .sc-x', es => es.length)
        log(shown === scCount, `${ch}: 点选后 ${scCount} 道自测都显示解析`)
        await p.reload()
        await p.waitForSelector('.vp-doc .sc.answered', { timeout: 10000 }).catch(() => {})
        await p.waitForTimeout(300)
        const after = await p.evaluate(() => [...document.querySelectorAll('.vp-doc .sc:not(.predict)')].map(sc => {
          const os = [...sc.querySelectorAll('.sc-o')]
          return { answered: sc.classList.contains('answered'), picked: os.findIndex(o => o.getAttribute('aria-pressed') === 'true') }
        }))
        log(after.every((x, i) => x.answered && x.picked === pick[i]), `${ch}: 刷新后自测选择仍在（${JSON.stringify(pick)}）`)
        // 目标勾选：自测都写成正确答案、练习写成通过，刷新后所有目标都应完成
        const right = await p.evaluate(() => [...document.querySelectorAll('.vp-doc .sc:not(.predict)')].map(sc => [...sc.querySelectorAll('.sc-o')].findIndex(o => o.classList.contains('right'))))
        const chId = /^id:\s*(\S+)/m.exec(fs.readFileSync(path.join(ROOT, 'course/chapters', ch + '.md'), 'utf8'))[1]
        await p.evaluate(([right, ids, chId]) => {
          const sc = {}; right.forEach((a, i) => { sc[chId + ':' + i] = a })
          localStorage.setItem('vue3deep:sc', JSON.stringify(sc))
          const ex = {}; ids.forEach(i => { ex[i] = true }); localStorage.setItem('vue3deep:ex', JSON.stringify(ex))
        }, [right, ids, chId])
        await p.reload()
        await p.waitForSelector('.goal-item.met', { timeout: 10000 }).catch(() => {})
        const total = await p.$$eval('.goal-item', es => es.length)
        const met = await p.$$eval('.goal-item.met', es => es.length)
        log(total > 0 && met === total, `${ch}: 自测答对、练习通过后，目标全部打勾（${met}/${total}）`)
      }
      log(errs.length === 0, `${ch}: 页面没有控制台报错` + (errs.length ? ' ' + errs.slice(0, 3).join(' | ') : ''))
      await ctx.close()
    }
    for (const ch of chapters) await runLabs(browser, base, ch)
  } finally {
    await browser.close()
    srv.kill()
  }
  console.log(bad ? '有 ' + bad + ' 项失败' : '全部通过')
  process.exit(bad ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
