// 站点测试的公共部分：起 vitepress preview、读章节数据、读练习和题库数据。
//   progress.test.js  跨章学习功能（进度、自测答错、章完成、侧边栏和顶栏、首页、旧键迁移、图片放大）
//   mechanics.test.js 学习机制：提示阶梯、热身、自我解释、复习页、阶段测验、手机宽度
// 都用已经构建好的站点：默认 course/.vitepress/dist（npm run test:site 会先构建）；设了 COURSE_OUT_DIR 就用那个目录（独立构建，不碰 dist）。
const { chromium } = require('playwright')
const { spawn } = require('child_process')
const esbuild = require('esbuild')
const fs = require('fs')
const net = require('net')
const path = require('path')
const { BASE_NO_SLASH } = require('../../course/site.mjs')

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

/**
 * 起 vitepress preview（读 env 里的 COURSE_OUT_DIR，没有就读默认的 dist）。
 * 返回 { origin, base, stop }：origin 是 http://127.0.0.1:端口，base 是 origin 加站点的 base 路径（course/site.mjs，不带结尾斜杠），
 * 测试里页面地址一律写成 base + '/chapters/…'，所以 base 路径只在 course/site.mjs 一处定义。
 */
async function startPreview(env = process.env) {
  const port = await freePort()
  const srv = spawn(process.execPath, [path.join(ROOT, 'node_modules/vitepress/bin/vitepress.js'), 'preview', 'course', '--port', String(port), '--strictPort'], { cwd: ROOT, env, stdio: 'ignore' })
  const origin = 'http://127.0.0.1:' + port
  const base = origin + BASE_NO_SLASH
  try { await waitUp(base + '/') } catch (e) { srv.kill(); throw e }
  return { origin, base, stop: () => srv.kill() }
}

/** 起 preview 和浏览器。返回 { origin, base, browser, newPage(opts), stop() }。newPage 返回带控制台报错收集的页面 */
async function startSite() {
  const dist = process.env.COURSE_OUT_DIR || path.join(ROOT, 'course/.vitepress/dist')
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.error('没有构建产物（' + dist + '）。先运行 npm run build，或者用 npm run test:site；也可以设 COURSE_OUT_DIR 指向已构建的目录'); process.exit(2)
  }
  const pv = await startPreview()
  const { base, origin } = pv
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
  return { origin, base, browser, newPage, async stop() { await browser.close(); pv.stop() } }
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
  const { parseSelfChecks } = require('../../course/content-parse.mjs')
  return mod.readChapters(path.join(ROOT, 'course/chapters')).map(c => ({ ...c.meta, selfchecks: parseSelfChecks(c.src) }))
}
function loadExercises() {
  const dir = path.join(ROOT, 'course/exercises')
  const all = {}
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'types.ts')) Object.assign(all, loadTs(path.join(dir, f)))
  return all
}
/** 阶段定义（course/stages.ts）：{ STAGES, STAGE_COUNT } */
function loadStages() {
  return loadTs(path.join(ROOT, 'course/stages.ts'))
}
function loadQuestions() {
  return loadTs(path.join(ROOT, 'course/checks/questions.ts')).Q
}

/** 进度存储的键（单键，结构见 course/engine/types.ts 的 Progress） */
const STORE_KEY = 'hands-on-vue3-v1'

/** 在浏览器里写进度：清空 localStorage，再把 progress（引擎的 Progress 结构）写进单键。要在 goto 之前对同源页面调用，所以先打开一个空白的站内页 */
async function seed(p, base, progress = {}) {
  await p.goto(base + '/')
  await p.evaluate(([k, d]) => { localStorage.clear(); if (Object.keys(d).length) localStorage.setItem(k, JSON.stringify(d)) }, [STORE_KEY, progress])
}
/** 写旧版的零散进度键（前缀见引擎的迁移代码），用来测一次性迁移。data 的键是去掉前缀的键名 */
async function seedLegacy(p, base, data) {
  await p.goto(base + '/')
  await p.evaluate(d => { localStorage.clear(); for (const [k, v] of Object.entries(d)) localStorage.setItem('vue3deep:' + k, JSON.stringify(v)) }, data)
}
/** 读整个进度（没有返回 null） */
const read = p => p.evaluate(k => { const v = localStorage.getItem(k); return v == null ? null : JSON.parse(v) }, STORE_KEY)
/** 一章的进度：自测全部答对、练习全部通过时的样子。overrides 可以改其中的字段 */
function fullChapter(c, overrides = {}) {
  const sc = {}; c.scAnswers.forEach((a, i) => { sc[i] = a })
  const ex = {}; c.ex.forEach(id => { ex[id] = { passed: true, help: false } })
  return { sc, ex, done: false, ...overrides }
}

module.exports = { ROOT, IGNORED_CONSOLE, makeReporter, startSite, startPreview, loadChapters, loadExercises, loadQuestions, loadStages, seed, seedLegacy, read, fullChapter, STORE_KEY }
