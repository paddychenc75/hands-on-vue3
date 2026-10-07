// 站点测试的公共部分：起 vitepress preview、读章节数据、读练习和题库数据。
//   progress.test.js  跨章学习功能（进度、复习、开关、图片放大）
//   quiz.test.js      综合测验
// 都用已经构建好的 course/.vitepress/dist（npm run test:site 会先构建）。
const { chromium } = require('playwright')
const { spawn } = require('child_process')
const esbuild = require('esbuild')
const fs = require('fs')
const net = require('net')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const IGNORED_CONSOLE = [/Hydration (completed but contains mismatches|node mismatch|children mismatch|text content mismatch|class attribute mismatch|style mismatch|attribute mismatch)/i]

function makeReporter() {
  const r = { bad: 0 }
  r.log = (ok, msg) => { if (!ok) r.bad++; console.log((ok ? 'PASS ' : 'FAIL ') + msg) }
  // 把一组断言收集成一条结果：ok(条件, 说明)，结束时 report(名字)
  r.group = name => {
    const fails = []
    return { ok: (c, msg) => { if (!c) fails.push(msg) }, end: () => r.log(fails.length === 0, name + (fails.length ? ' → ' + fails.join('；') : '')) }
  }
  return r
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

/** 起 preview 和浏览器。返回 { base, browser, newPage(opts), stop() }。newPage 返回带控制台报错收集的页面 */
async function startSite() {
  if (!fs.existsSync(path.join(ROOT, 'course/.vitepress/dist/index.html'))) {
    console.error('没有构建产物。先运行 npm run build，或者用 npm run test:site'); process.exit(2)
  }
  const port = await freePort()
  const srv = spawn(process.execPath, [path.join(ROOT, 'node_modules/vitepress/bin/vitepress.js'), 'preview', 'course', '--port', String(port), '--strictPort'], { cwd: ROOT, stdio: 'ignore' })
  const base = 'http://127.0.0.1:' + port
  await waitUp(base + '/')
  const browser = await chromium.launch()
  const ctxs = []
  async function newPage(opts = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts })
    ctxs.push(ctx)
    const p = await ctx.newPage()
    p.errs = []
    p.on('pageerror', e => p.errs.push(e.message))
    p.on('console', m => { if (m.type() === 'error' && !IGNORED_CONSOLE.some(re => re.test(m.text()))) p.errs.push(m.text()) })
    return p
  }
  return { base, browser, newPage, async stop() { await browser.close(); srv.kill() } }
}

// 把 .ts / .mts 打成 CJS 在 Node 里读（只取数据）
function loadTs(file, external = []) {
  const r = esbuild.buildSync({ entryPoints: [file], bundle: true, platform: 'node', format: 'cjs', write: false, external: ['vue', ...external] })
  const m = { exports: {} }
  new Function('module', 'exports', 'require', r.outputFiles[0].text)(m, m.exports, require)
  return m.exports
}

/** 全部章的元数据（用站点同一份代码读 chapters/*.md） */
function loadChapters() {
  const mod = loadTs(path.join(ROOT, 'course/.vitepress/course-data.mts'), ['vitepress', 'vite'])
  return mod.readChapters(path.join(ROOT, 'course/chapters')).map(c => ({ ...c.meta, selfchecks: mod.parseSelfChecks(c.src) }))
}
function loadExercises() {
  const dir = path.join(ROOT, 'course/exercises')
  const all = {}
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'types.ts')) Object.assign(all, loadTs(path.join(dir, f)))
  return all
}
function loadQuestions() {
  return loadTs(path.join(ROOT, 'course/labs/27-quiz/questions.ts')).Q
}

/** 在浏览器里往 localStorage 写进度（键前缀 vue3deep:）。要在 goto 之前对同源页面调用，所以先打开一个空白的站内页 */
async function seed(p, base, data) {
  await p.goto(base + '/')
  await p.evaluate(d => { localStorage.clear(); for (const [k, v] of Object.entries(d)) localStorage.setItem('vue3deep:' + k, JSON.stringify(v)) }, data)
}
const read = (p, key) => p.evaluate(k => { const v = localStorage.getItem('vue3deep:' + k); return v == null ? null : JSON.parse(v) }, key)

module.exports = { ROOT, makeReporter, startSite, loadChapters, loadExercises, loadQuestions, seed, read }
