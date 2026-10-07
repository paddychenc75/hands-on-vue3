// 用法：
//   node tests/site/exercises.test.js                      测全部章。用 course/.vitepress/dist，要先 npm run build（npm run test:site 会自动先构建）
//   node tests/site/exercises.test.js 03-refs 04-computed   只测指定章。自己构建：只构建这些章，输出到独立的临时目录，端口自动选空闲的。
//                                                           多个 agent 同时跑互不影响，别人写到一半的章不会让构建失败
// 起 vitepress preview，对每章页面：
//   1. 每道练习：初始代码不通过，答案通过，每个 wrong 都不通过
//   2. 页面没有控制台报错
//   3. 自测题点选后刷新页面，选择仍在
//   4. 实验台：先猜之前实验台不显示，答完后出现，做一次有代表性的操作，断言结果。
//      每章的实验台数据在 tests/site/labs/<章文件名>.js（见下面的 loadLabs），章里每个 <Lab id> 都必须有一项
//   5. 练习 id 全局不重复
const { chromium } = require('playwright')
const { spawn, spawnSync } = require('child_process')
const os = require('os')
const fs = require('fs')
const net = require('net')
const path = require('path')
const esbuild = require('esbuild')

const ROOT = path.resolve(__dirname, '../..')
// 教学内容故意触发的控制台报错：第 23 章的“水合不一致”练习会让 Vue 打印 Hydration mismatch，不算页面报错
const IGNORED_CONSOLE = [/Hydration (completed but contains mismatches|node mismatch|children mismatch|text content mismatch|class attribute mismatch|style mismatch|attribute mismatch)/i]
let bad = 0
const log = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + msg) }

// 用 esbuild 把每个 TS 练习文件打成 CJS，在 Node 里读（check 函数用不到，只取数据）。
// 不走 exercises/index.ts：它用 import.meta.glob，esbuild 不认。这里自己扫目录，同时检查 id 是否重复。
function loadExercises(only) {
  const dir = path.join(ROOT, 'course/exercises')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'types.ts')
    .filter(f => !only || only.includes(f.replace(/\.ts$/, '')))
  const all = {}, owner = {}
  for (const f of files) {
    const r = esbuild.buildSync({ entryPoints: [path.join(dir, f)], bundle: true, platform: 'node', format: 'cjs', write: false, external: ['vue'] })
    const m = { exports: {} }
    new Function('module', 'exports', 'require', r.outputFiles[0].text)(m, m.exports, require)
    for (const [id, ex] of Object.entries(m.exports)) {
      if (id in all) log(false, `练习 id 重复：${id}（${owner[id]} 和 ${f}）`)
      all[id] = ex; owner[id] = f
    }
  }
  return all
}

// 每章的实验台测试数据：tests/site/labs/<章文件名>.js，module.exports = [{ id, name, pick, async run(p, body, ok) {} }, ...]
function loadLabs(ch) {
  const f = path.join(__dirname, 'labs', ch + '.js')
  return fs.existsSync(f) ? require(f) : []
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
// run 的参数：p 是页面，body 是实验台正文的 locator，ok(c, msg) 记一条结果。
async function runLabs(browser, base, ch) {
  for (const lab of loadLabs(ch)) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const p = await ctx.newPage()
    const errs = []
    p.on('pageerror', e => errs.push(e.message))
    p.on('console', m => { if (m.type() === 'error' && !IGNORED_CONSOLE.some(re => re.test(m.text()))) errs.push(m.text()) })
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
  const args = process.argv.slice(2).map(a => a.replace(/\.md$/, '').replace(/^.*chapters\//, ''))
  const allChapters = fs.readdirSync(path.join(ROOT, 'course/chapters')).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''))
  for (const a of args) if (!allChapters.includes(a)) { console.error('没有这一章：' + a + '。现有：' + allChapters.join(' ')); process.exit(2) }
  const chapters = args.length ? args : allChapters
  // 只测指定章：自己构建到独立的临时目录（只构建这些章），多个运行互不覆盖
  const env = { ...process.env }
  let tmp = null
  if (args.length) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-site-'))
    env.COURSE_CHAPTERS = args.join(',')
    env.COURSE_OUT_DIR = path.join(tmp, 'dist')
    env.COURSE_CACHE_DIR = path.join(tmp, 'cache')
    const b = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vitepress/bin/vitepress.js'), 'build', 'course'], { cwd: ROOT, env, encoding: 'utf8' })
    if (b.status !== 0) {
      console.error(b.stdout + b.stderr)
      console.error('构建失败（只构建了 ' + args.join('、') + '）')
      fs.rmSync(tmp, { recursive: true, force: true })
      process.exit(1)
    }
  } else if (!fs.existsSync(path.join(ROOT, 'course/.vitepress/dist/index.html'))) {
    console.error('没有构建产物。先运行 npm run build，或者用 npm run test:site'); process.exit(2)
  }
  const EX = loadExercises(args.length ? args : null)
  const port = await freePort()
  const srv = spawn(process.execPath, [path.join(ROOT, 'node_modules/vitepress/bin/vitepress.js'), 'preview', 'course', '--port', String(port), '--strictPort'], { cwd: ROOT, env, stdio: 'ignore' })
  const base = 'http://127.0.0.1:' + port
  const browser = await chromium.launch()
  try {
    await waitUp(base + '/')
    for (const ch of chapters) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
      const p = await ctx.newPage()
      const errs = []
      p.on('pageerror', e => errs.push(e.message))
      p.on('console', m => { if (m.type() === 'error' && !IGNORED_CONSOLE.some(re => re.test(m.text()))) errs.push(m.text()) })
      // 刷新或关闭页面时，浏览器会取消还在飞的预取请求（VitePress 会预取页面里链接到的章），这种取消不算失败
      p.on('requestfailed', r => { if (!/ABORTED/i.test(r.failure()?.errorText || '')) errs.push('请求失败 ' + r.url()) })
      const url = base + '/chapters/' + ch + '.html'
      await p.goto(url)
      await p.waitForSelector('.ex[data-ex] .cm-content', { timeout: 15000 }).catch(() => {})
      await p.waitForTimeout(500)

      // ---- 练习 ----
      const ids = await p.$$eval('.ex[data-ex]', es => es.map(e => e.dataset.ex))
      // 占位（.ex-ph）和“找不到练习”（p.ex-err）算没渲染；练习起始代码自己报错（div.ex-err）是正常的，要用户补全
      const placeholders = await p.$$eval('.ex-ph, p.ex-err', es => es.length)
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
          return { all: rs.some(d => /全部通过/.test(d.textContent)), fails: rs.filter(d => d.classList.contains('no')).map(d => d.textContent) }
        }, [id, tpl, js])
      }
      for (const id of ids) {
        const e = EX[id]
        if (!e) { log(false, `${id}: 练习数据里没有这个 id`); continue }
        const s = await runWith(id, e.tpl, e.js)
        const a = await runWith(id, e.solTpl || e.tpl, e.solJs || e.js)
        const ws = []
        for (const w of e.wrong || []) {
          const wt = w.tpl || e.solTpl || e.tpl, wj = w.js || e.solJs || e.js
          const r = await runWith(id, wt, wj)
          // 构造错解时替换失败（sub 找不到要替换的文字）：报告出来，不让它悄悄变成别的东西
          r.broken = /WRONG_SUB_FAILED/.test(wt + wj)
          // expectFail：错解必须是因为预期的原因被拒，而不是碰巧因为别的原因不通过
          r.reasonBad = !!w.expectFail && !r.fails.some(f => w.expectFail.test(f))
          if (r.broken) log(false, `${id}: wrong 构造失败（${(/WRONG_SUB_FAILED[^\n]*/.exec(wt + wj) || [''])[0].slice(0, 80)}）`)
          if (r.reasonBad) log(false, `${id}: wrong 没有因为预期的原因被拒（期望失败信息匹配 ${w.expectFail}，实际：${r.fails.slice(0, 3).join(' | ') || '无'}）`)
          ws.push(r)
        }
        const ok = !s.all && a.all && ws.every(x => !x.all && !x.broken && !x.reasonBad)
        log(ok, `${id}「${e.title}」初始${s.all ? '通过(错)' : '不通过'} 答案${a.all ? '通过' : '不通过(错) ' + a.fails.slice(0, 2).join(' | ')}` +
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
    for (const ch of chapters) {
      // 章里每个 <Lab id> 都要有测试数据
      const md = fs.readFileSync(path.join(ROOT, 'course/chapters', ch + '.md'), 'utf8')
      const have = new Set(loadLabs(ch).map(l => l.id))
      for (const m of md.matchAll(/<Lab\s+id="([^"]+)"/g)) log(have.has(m[1]), `${ch}: 实验台 ${m[1]} 有测试数据（tests/site/labs/${ch}.js）`)
      await runLabs(browser, base, ch)
    }
  } finally {
    await browser.close()
    srv.kill()
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true })
  }
  console.log(bad ? '有 ' + bad + ' 项失败' : '全部通过')
  process.exit(bad ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
