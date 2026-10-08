// 用法：
//   node tests/site/exercises.test.js                      测全部章。用 course/.vitepress/dist，要先 npm run build（npm run test:site 会自动先构建）
//   node tests/site/exercises.test.js 03-refs 04-computed   只测指定章。自己构建：只构建这些章，输出到独立的临时目录，端口自动选空闲的。
//                                                           多个 agent 同时跑互不影响，别人写到一半的章不会让构建失败
// 起 vitepress preview，对每章页面：
//   1. 每道练习：初始代码不通过，答案通过，每个 wrong 都不通过；半成品（faded）原样提交不通过、不等于答案、不含 WRONG_SUB_FAILED、至少 1 个 ✏️ 占位
//   2. 页面没有控制台报错
//   3. 自测题：答错不显示解析、刷新后仍是答错状态、重试隐藏上次选项、答对才显示解析、刷新后答对仍在；目标勾选
//   4. 实验台：先猜之前实验台不显示，答完后出现，做一次有代表性的操作，断言结果。
//      每章的实验台数据在 tests/site/labs/<章文件名>.js（见下面的 loadLabs），章里每个 <Lab id> 都必须有一项
//   5. 练习 id 全局不重复
const { chromium } = require('playwright')
const { spawnSync } = require('child_process')
const os = require('os')
const fs = require('fs')
const path = require('path')
const esbuild = require('esbuild')
const { loadChapters, startPreview, STORE_KEY } = require('./helpers')
const CHAPTERS = loadChapters()

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
      // 实验台在“深入”折叠块里时，没展开才点开（默认已展开）
      const deep = box.locator('xpath=ancestor::details[1]')
      if (await deep.count() && !(await deep.evaluate(d => d.open))) await deep.locator('> summary').click()
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
  } else if (!fs.existsSync(path.join(env.COURSE_OUT_DIR || path.join(ROOT, 'course/.vitepress/dist'), 'index.html'))) {
    console.error('没有构建产物。先运行 npm run build，或者用 npm run test:site；也可以设 COURSE_OUT_DIR 指向已构建的目录'); process.exit(2)
  }
  const EX = loadExercises(args.length ? args : null)
  const pv = await startPreview(env)
  const base = pv.base
  const browser = await chromium.launch()
  try {
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

      // ---- 半成品（faded）：原样提交必须不通过；不能和参考答案相同；不能含 WRONG_SUB_FAILED；至少 1 个 ✏️ 占位 ----
      // 取法与 Exercise.vue 一致：没写的那一段用起始代码。补全后能通过，由上面的“答案通过”覆盖
      for (const id of ids) {
        const e = EX[id]
        if (!e) continue
        if (!e.faded) { log(false, `${id}: 没有 faded（半成品是必填的）`); continue }
        const ft = e.faded.tpl || e.tpl, fj = e.faded.js || e.js
        const f = await runWith(id, ft, fj)
        const sameAsSolution = ft === (e.solTpl || e.tpl) && fj === (e.solJs || e.js)
        const broken = /WRONG_SUB_FAILED/.test(ft + fj)
        const marks = ((e.faded.tpl || '') + (e.faded.js || '')).split('✏️').length - 1
        log(!f.all && !sameAsSolution && !broken && marks >= 1,
          `${id}: 半成品原样提交${f.all ? '通过(错)' : '不通过'}，${marks} 个 ✏️ 占位` + (sameAsSolution ? '，和参考答案相同(错)' : '') + (broken ? '，构造失败(错)' : '') + (marks < 1 ? '，没有占位(错)' : ''))
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

      // ---- 自测：答错不显示解析；答对才显示；刷新后状态仍在 ----
      const scCount = await p.$$eval('.vp-doc .sc:not(.predict)', es => es.length)
      if (scCount) {
        const meta = CHAPTERS.find(c => c.file === ch)
        const answers = meta.scAnswers
        const wrongIdx = answers.map(a => (a === 0 ? 1 : 0))
        // 每道题先选一个错的选项
        await p.evaluate(wrong => {
          document.querySelectorAll('.vp-doc .sc:not(.predict)').forEach((sc, i) => { sc.querySelectorAll('.sc-o')[wrong[i]].click() })
        }, wrongIdx)
        await p.waitForTimeout(200)
        const st = await p.evaluate(() => ({
          no: document.querySelectorAll('.vp-doc .sc.wrong .sc-x.no').length,
          explain: document.querySelectorAll('.vp-doc .sc:not(.predict) .sc-x:not(.no)').length,
          right: document.querySelectorAll('.vp-doc .sc:not(.predict) .sc-o.right').length,
          wrong: document.querySelectorAll('.vp-doc .sc:not(.predict) .sc-o.wrong').length
        }))
        log(st.no === scCount && st.explain === 0 && st.right === 0 && st.wrong === scCount, `${ch}: 选错后 ${scCount} 道自测都只提示再试：不显示解析、不亮正确答案`)
        await p.reload()
        await p.waitForSelector('.vp-doc .sc.wrong', { timeout: 10000 }).catch(() => {})
        await p.waitForTimeout(300)
        const after = await p.evaluate(() => [...document.querySelectorAll('.vp-doc .sc:not(.predict)')].map(sc => {
          const os = [...sc.querySelectorAll('.sc-o')]
          return { wrong: sc.classList.contains('wrong'), picked: os.findIndex(o => o.getAttribute('aria-pressed') === 'true'), explain: sc.querySelectorAll('.sc-x:not(.no)').length }
        }))
        log(after.every((x, i) => x.wrong && x.picked === wrongIdx[i] && x.explain === 0), `${ch}: 刷新后自测仍是答错状态`)
        // 重试：隐藏上次选错的项，再选正确项
        const retry = await p.evaluate(async right => {
          const out = []
          const scs = [...document.querySelectorAll('.vp-doc .sc:not(.predict)')]
          scs.forEach(sc => sc.querySelector('.sc-retry').click())
          await new Promise(r => setTimeout(r, 100))
          scs.forEach((sc, i) => {
            const os = [...sc.querySelectorAll('.sc-o')]
            out.push(os.filter(o => getComputedStyle(o).display !== 'none').length === os.length - 1)
            os[right[i]].click()
          })
          return out
        }, answers)
        log(retry.every(Boolean), `${ch}: 重试时每道题恰好隐藏了一个选项（上次选错的）`)
        await p.waitForTimeout(200)
        const shown = await p.$$eval('.vp-doc .sc.answered .sc-x', es => es.length)
        log(shown === scCount, `${ch}: 答对后 ${scCount} 道自测都显示解析`)
        await p.reload()
        await p.waitForSelector('.vp-doc .sc.answered', { timeout: 10000 }).catch(() => {})
        await p.waitForTimeout(300)
        const after2 = await p.evaluate(() => [...document.querySelectorAll('.vp-doc .sc:not(.predict)')].map(sc => {
          const os = [...sc.querySelectorAll('.sc-o')]
          return { answered: sc.classList.contains('answered'), picked: os.findIndex(o => o.getAttribute('aria-pressed') === 'true') }
        }))
        log(after2.every((x, i) => x.answered && x.picked === answers[i]), `${ch}: 刷新后自测答对状态仍在`)
        // 目标勾选：自测都答对、练习写成通过，刷新后所有目标都应完成
        await p.evaluate(([k, chId, answers, ids]) => {
          const sc = {}; answers.forEach((a, i) => { sc[i] = a })
          const ex = {}; ids.forEach(i => { ex[i] = { passed: true, help: false } })
          localStorage.setItem(k, JSON.stringify({ [chId]: { sc, ex, done: false } }))
        }, [STORE_KEY, meta.id, answers, ids])
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
    pv.stop()
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true })
  }
  console.log(bad ? '有 ' + bad + ' 项失败' : '全部通过')
  process.exit(bad ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
