// 用法：node tests/site/exercises.test.js [章文件名 ...]   （先运行 npm run build；npm run test:site 会自动先构建）
// 起 vitepress preview，对每章页面：
//   1. 每道练习：初始代码不通过，答案通过，每个 wrong 都不通过
//   2. 页面没有控制台报错
//   3. 自测题点选后刷新页面，选择仍在
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
  } finally {
    await browser.close()
    srv.kill()
  }
  console.log(bad ? '有 ' + bad + ' 项失败' : '全部通过')
  process.exit(bad ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
