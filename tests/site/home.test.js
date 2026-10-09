// 首页短片的测试：静态 HTML 里有全部幕的文案、没有 JS 时可读、首次进入自动播放且整片真实速度放完用时 45–60 秒、
// 用户接管不抢滚动、控制条各项功能、各种不自动播放的情形、手机和横屏没有横向滚动、Tab 走完、无水合警告、CLS 与长任务、首页 chunk 与主包体积。
// 用法：node tests/site/home.test.js     （用 course/.vitepress/dist，要先 npm run build；或 COURSE_OUT_DIR=<已构建目录>）
// 约 3 分钟（其中一条用真实速度放完整片，约 1 分钟）。画面截图：HOME_SHOTS=1 会把每一幕存到 tests/screenshots/home-film-*.png。
const { ROOT, makeReporter, startSite, loadChapters, seed, STORE_KEY } = require('./helpers')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const R = makeReporter()
const CH = loadChapters()
const SHOTS = process.env.HOME_SHOTS === '1'
const SCENE_COUNT = 9
// 每一幕的标题（静态 HTML 里必须有）。和 course/.vitepress/theme/components/HomeFilm.vue 里的文案一致
const TITLES = ['动手学 Vue 3', '数据变了，界面靠人去同步', '每个绑定一个 watcher', '虚拟 DOM：先重新生成，再比对', 'Proxy 响应式，编译器标出动态部分', '状态和逻辑按功能聚到一起', '值没变，就不再通知', 'Vapor：不经过虚拟 DOM', '每一代，都在解决上一代留下的问题']
const MARKS = [0, 5, 10, 16, 23, 30.5, 35.5, 42, 48.5]

const sleep = ms => new Promise(r => setTimeout(r, ms))
const state = p => p.evaluate(() => {
  const f = document.querySelector('.film')
  return { playing: f.classList.contains('playing'), ready: f.classList.contains('ready'), ended: f.classList.contains('ended'), scene: +(f.dataset.active ?? -1), y: scrollY, dyn: document.documentElement.classList.contains('film-dyn') }
})
/** 打开首页并等短片准备好（.ready）。opts.speed 是倍速（测试用） */
async function open(site, ctxOpts = {}, { speed = 1, played = false, hash = '' } = {}) {
  const ctx = await site.browser.newContext({ viewport: { width: 1280, height: 800 }, ...ctxOpts })
  const p = await ctx.newPage()
  p.errs = []
  p.msgs = []
  p.on('pageerror', e => p.errs.push(e.message))
  p.on('console', m => { p.msgs.push(m.type() + ': ' + m.text()); if (['error', 'warning'].includes(m.type())) p.errs.push(m.text()) })
  await p.addInitScript(([s, pl]) => {
    window.__filmSpeed = s; window.__filmTest = true
    if (pl) sessionStorage.setItem('hands-on-vue3-film-played', '1')
    // 记下创建过的 AudioContext，测试“默认静音、离开页面关闭”
    const AC = window.AudioContext
    if (AC) { window.__ctxs = []; window.AudioContext = class extends AC { constructor(...a) { super(...a); window.__ctxs.push(this) } } }
  }, [speed, played])
  p.ctx = ctx
  await p.goto(site.base + '/' + hash)
  if (!ctxOpts.reducedMotion && ctxOpts.javaScriptEnabled !== false) await p.waitForSelector('.film.ready', { timeout: 15000 })
  return p
}
const waitFor = async (p, fn, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(100) } return false }
const scrollToTime = (p, t) => p.evaluate(tt => { const total = +getComputedStyle(document.querySelector('.film')).getPropertyValue('--total'); window.scrollTo(0, (tt / total) * (document.documentElement.scrollHeight - innerHeight)) }, t)

function gz(file) { return zlib.gzipSync(fs.readFileSync(file)).length }

;(async () => {
  const site = await startSite()
  const dist = process.env.COURSE_OUT_DIR || path.join(ROOT, 'course/.vitepress/dist')
  try {
    // ---------- 静态 HTML ----------
    {
      const g = R.group('静态 HTML：全部 9 幕的标题和说明都在，有“继续学习”之外的两个入口，不依赖 JS')
      const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
      const text = html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;|\u00a0/g, ' ').replace(/\s+/g, ' ')
      for (const t of TITLES) g.ok(text.includes(t), '缺标题：' + t)
      g.ok((html.match(/<section[^>]+class="[^"]*\bsc\b/g) || []).length === SCENE_COUNT, '9 个 section.sc')
      for (const w of ['2015', 'Vue 1.0', '2016', 'Vue 2.0', '候选版']) g.ok(text.includes(w), '缺 ' + w)
      g.ok(!text.includes('2014'), '没有 2014（第一个状态标 2015 · Vue 1.0）')
      g.ok(!/2\.0[^。]{0,12}引入单文件组件/.test(text), '没有“2.0 引入单文件组件”')
      g.ok(/film-dyn/.test(html) && /href="[^"]*\/roadmap/.test(html), '首屏前脚本加 film-dyn；有“查看课程地图”指向 /roadmap')
      g.end()
    }
    // ---------- 没有 JS ----------
    {
      const p = await open(site, { javaScriptEnabled: false })
      await sleep(500)
      const g = R.group('没有 JS：是一篇可读的长文，不是短片模式')
      const info = await p.evaluate(() => ({ dyn: document.documentElement.classList.contains('film-dyn'), pos: getComputedStyle(document.querySelector('.world')).position, h2: [...document.querySelectorAll('.film h2')].map(h => h.textContent.trim().length > 0), vis: [...document.querySelectorAll('.sc-copy')].every(c => getComputedStyle(c).visibility !== 'hidden' && getComputedStyle(c).opacity !== '0'), sw: document.documentElement.scrollWidth <= innerWidth }))
      g.ok(!info.dyn && info.pos !== 'fixed', '不是短片模式（.world 不是 fixed）')
      g.ok(info.vis && info.h2.length === 8 && info.h2.every(Boolean), '所有幕的文字都可见')
      g.ok(info.sw, '没有横向滚动')
      if (SHOTS) await p.screenshot({ path: path.join(ROOT, 'tests/screenshots/home-film-nojs.png'), fullPage: true })
      g.end()
      await p.ctx.close()
    }
    // ---------- 首次进入：自动播放，整片真实速度放完 45–60 秒 ----------
    {
      const p = await open(site, {}, { speed: 1 })
      const g = R.group('首次进入：约 1.2 秒后自动开始；整片真实速度放完用时 45–60 秒，停在收束幕')
      const t0 = Date.now()
      g.ok(await waitFor(p, async () => (await state(p)).playing, 4000), '3 秒内开始播放')
      const tStart = Date.now()
      const startedAfter = tStart - t0
      g.ok(startedAfter > 900, `开场停了约 1.2 秒再开始（${startedAfter}ms）`)
      const scenes = new Set()
      const ok = await waitFor(p, async () => { const s = await state(p); scenes.add(s.scene); return s.ended }, 70000)
      const dur = (Date.now() - tStart) / 1000
      g.ok(ok && dur >= 45 && dur <= 60, `整片用时 ${dur.toFixed(1)} 秒`)
      g.ok(scenes.size === SCENE_COUNT, '依次经过 9 幕：' + [...scenes].join(','))
      const s = await state(p)
      g.ok(!s.playing && s.scene === SCENE_COUNT - 1, '放完停在收束幕')
      g.ok(await p.locator('.player .play').getAttribute('aria-label') === '重播短片', '播放按钮变成“重播短片”')
      g.ok(await p.locator('.fin-actions .btn.big').isVisible(), '收束幕的主按钮可见')
      g.ok(p.errs.length === 0, '没有控制台报错或警告（含水合警告）：' + p.errs.join('|'))
      g.end()
      await p.ctx.close()
    }
    // ---------- 用户接管：不抢滚动 ----------
    {
      const g = R.group('用户接管：滚轮、触摸、键盘、拖滚动条立刻暂停，之后不再改滚动位置')
      for (const how of ['wheel', 'key', 'touch', 'scrollbar']) {
        const p = await open(site, { hasTouch: how === 'touch' }, { speed: 1 })
        await waitFor(p, async () => (await state(p)).playing, 4000)
        await sleep(1500)
        if (how === 'wheel') await p.mouse.wheel(0, 120)
        if (how === 'key') await p.keyboard.press('PageDown')
        if (how === 'touch') await p.touchscreen.tap(600, 400)
        if (how === 'scrollbar') await p.evaluate(() => window.scrollBy(0, 300)) // 无头浏览器的滚动条不占宽度，用脚本把滚动位置改掉来模拟拖滚动条
        await sleep(300)
        const a = await state(p)
        await sleep(1500)
        const b = await state(p)
        g.ok(!a.playing, how + '：立刻暂停')
        g.ok(Math.abs(b.y - a.y) < 2, `${how}：暂停后滚动位置不再被改（${a.y} → ${b.y}）`)
        await p.ctx.close()
      }
      g.end()
    }
    // ---------- 控制条 ----------
    {
      const p = await open(site, {}, { speed: 1 })
      const g = R.group('控制条：播放/暂停、上一幕/下一幕、进度条点击和键盘、重播、跳过')
      await waitFor(p, async () => (await state(p)).playing, 4000)
      const play = p.locator('.player .play')
      g.ok(await play.getAttribute('aria-label') === '暂停短片' && (await play.getAttribute('aria-pressed')) === 'true', '播放中：按钮是“暂停短片”')
      await play.click(); await sleep(200)
      g.ok(!(await state(p)).playing && (await play.getAttribute('aria-label')) === '继续播放短片' || (await play.getAttribute('aria-label')) === '播放短片', '点暂停：暂停')
      await p.locator('.player .next').click(); await sleep(1000)
      g.ok((await state(p)).scene === 1, '下一幕 → 第 1 幕')
      await p.locator('.player .next').click(); await sleep(1000)
      g.ok((await state(p)).scene === 2, '再下一幕 → 第 2 幕')
      await p.locator('.player .prev').click(); await sleep(1000)
      g.ok((await state(p)).scene === 1 || (await state(p)).scene === 2, '上一幕：回到本幕开头或上一幕')
      const box = await p.locator('.scrub').boundingBox()
      await p.mouse.click(box.x + box.width * 0.62, box.y + box.height / 2); await sleep(500)
      const sc = (await state(p)).scene
      g.ok(sc >= 5 && sc <= 6, '点进度条 62% 处 → 第 5 或 6 幕（实际 ' + sc + '）')
      await p.locator('.scrub').focus(); await p.keyboard.press('ArrowRight'); await sleep(1000)
      g.ok((await state(p)).scene === sc + 1, '进度条获得焦点后按 → 切到下一幕')
      await p.locator('.player .skip').click(); await sleep(1200)
      g.ok((await state(p)).scene === SCENE_COUNT - 1, '跳过：到收束幕，开始学习的按钮可见')
      await p.locator('.player .replay').click(); await sleep(600)
      const r = await state(p)
      g.ok(r.playing && r.y < 600, '重播：回到开头并播放')
      await play.focus(); await p.keyboard.press('Space'); await sleep(300)
      g.ok(!(await state(p)).playing, '播放按钮获得焦点后按空格 → 暂停')
      g.ok(await p.locator('.rail a').count() === SCENE_COUNT, '右侧 9 个幕进度圆点')
      await p.locator('.rail a').nth(4).click(); await sleep(1200)
      g.ok((await state(p)).scene === 4, '点圆点跳到第 4 幕')
      g.ok(p.errs.length === 0, '没有控制台报错：' + p.errs.join('|'))
      g.end()
      await p.ctx.close()
    }
    // ---------- 各种不自动播放的情形 ----------
    {
      const g = R.group('不自动播放：回访者、带锚点、本会话放过、减少动画、先滚动过、标签页在后台')
      // 回访者
      const seedP = await (await site.browser.newContext()).newPage()
      const first = CH.find(c => c.stage === 1)
      await seed(seedP, site.base, { [first.id]: { sc: {}, ex: {}, done: false }, __last: { path: '/chapters/' + first.file, anchor: '', h: '', t: Date.now() } })
      const ls = await seedP.evaluate(k => localStorage.getItem(k), STORE_KEY)
      await seedP.context().close()
      {
        const p = await open(site, { storageState: { cookies: [], origins: [{ origin: new URL(site.base).origin, localStorage: [{ name: STORE_KEY, value: ls }] }] } })
        await sleep(2500)
        const s = await state(p)
        g.ok(!s.playing, '回访者：不自动播放')
        g.ok(await p.locator('.film-play').isVisible() || await p.locator('.player').isVisible(), '回访者：有“播放短片”入口')
        g.ok(/继续学习/.test(await p.locator('.s0 .btn.primary').innerText()), '回访者：主按钮是“继续学习”')
        g.ok((await p.locator('.s0 .btn.primary').getAttribute('href')).includes('/chapters/'), '回访者：主按钮指向上次读的章')
        await p.ctx.close()
      }
      { const p = await open(site, {}, { hash: '#scene-3' }); await sleep(2500); const s = await state(p); g.ok(!s.playing && s.scene === 3, '带 #scene-3：停在第 3 幕，不播放（scene=' + s.scene + '）'); await p.ctx.close() }
      { const p = await open(site, {}, { played: true }); await sleep(2500); g.ok(!(await state(p)).playing, '本会话放过：不自动播放'); await p.ctx.close() }
      {
        const p = await open(site, { reducedMotion: 'reduce' }); await sleep(2000)
        const info = await p.evaluate(() => ({ pos: getComputedStyle(document.querySelector('.world')).position, player: !!document.querySelector('.player') && getComputedStyle(document.querySelector('.player')).display !== 'none', play: [...document.querySelectorAll('.film-play')].some(b => getComputedStyle(b).display !== 'none'), vis: [...document.querySelectorAll('.sc-copy')].every(c => getComputedStyle(c).visibility !== 'hidden'), sw: document.documentElement.scrollWidth <= innerWidth }))
        g.ok(info.pos !== 'fixed' && !info.player && !info.play && info.vis && info.sw, '减少动画：静态长文，没有播放控制，所有文字可见 ' + JSON.stringify(info))
        if (SHOTS) await p.screenshot({ path: path.join(ROOT, 'tests/screenshots/home-film-reduced.png'), fullPage: true })
        await p.ctx.close()
      }
      {
        const ctx = await site.browser.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); p.errs = []
        await p.goto(site.base + '/'); await p.waitForSelector('.film.ready'); await p.evaluate(() => window.scrollTo(0, 500)); await sleep(2500)
        g.ok(!(await state(p)).playing, '页面不在最上面（先滚动过）：不自动播放'); await ctx.close()
      }
      {
        const ctx = await site.browser.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage()
        await p.addInitScript(() => { Object.defineProperty(document, 'hidden', { get: () => true }) })
        await p.goto(site.base + '/'); await p.waitForSelector('.film.ready'); await sleep(2500)
        g.ok(!(await state(p)).playing, '标签页在后台时打开：不自动播放'); await ctx.close()
      }
      // 播放中切到后台：暂停，回来不自动续播，按钮变“继续播放”
      {
        const p = await open(site, {}, { speed: 1 }); await waitFor(p, async () => (await state(p)).playing, 4000)
        await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')) }); await sleep(300)
        g.ok(!(await state(p)).playing, '播放中切到后台：暂停')
        await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')) }); await sleep(800)
        g.ok(!(await state(p)).playing && (await p.locator('.player .play').getAttribute('aria-label')) === '继续播放短片', '回到前台：不自动续播，按钮是“继续播放短片”')
        await p.ctx.close()
      }
      g.end()
    }
    // ---------- 自动与手动同一画面 ----------
    {
      const g = R.group('自动与手动同一画面：同一影片时间，自动播放到那里和手动滚到那里，画面一样')
      const grab = async p => p.evaluate(() => [...document.querySelectorAll('[data-w^="n-"],[data-w^="nl-"],[data-w^="b-"]')].map(e => getComputedStyle(e).opacity + '|' + getComputedStyle(e).transform).join(';'))
      const a = await open(site, {}, { speed: 8 }); await waitFor(a, async () => (await state(a)).playing, 4000)
      await waitFor(a, async () => (await state(a)).scene >= 3, 20000); await a.locator('.player .play').click(); await sleep(300)
      const ya = (await state(a)).y
      const b = await open(site, {}, { played: true }); await b.evaluate(y => window.scrollTo(0, y), ya); await sleep(400)
      g.ok(await grab(a) === await grab(b), '同一滚动位置，自动播放暂停的画面 = 手动滚到的画面')
      await a.ctx.close(); await b.ctx.close(); g.end()
    }
    // ---------- 手机、横屏：没有横向滚动 ----------
    {
      const g = R.group('手机 390、360 和横屏 844×390：每一幕都没有横向滚动')
      for (const [w, h] of [[390, 844], [360, 740], [844, 390]]) {
        const p = await open(site, { viewport: { width: w, height: h } }, { played: true })
        const bad = []
        for (const t of [0.5, 7, 13, 20, 27, 33, 39, 45, 52, 54]) {
          await scrollToTime(p, t); await sleep(250)
          const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }))
          if (o.sw > o.iw) bad.push(`${t}s:${o.sw}>${o.iw}`)
          if (SHOTS && w === 390) await p.screenshot({ path: path.join(ROOT, `tests/screenshots/home-film-mobile-${Math.round(t)}.png`) })
        }
        g.ok(bad.length === 0, `${w}×${h}：` + (bad.join(',') || '没有横向滚动'))
        const pl = await p.locator('.player').boundingBox()
        g.ok(pl && pl.x >= 0 && pl.x + pl.width <= w + 1, `${w}×${h}：控制条在屏幕内`)
        const btns = await p.locator('.player button, .player a').evaluateAll(els => els.filter(e => e.getBoundingClientRect().width > 0).map(e => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height) }))
        g.ok(btns.every(v => v >= 36), `${w}×${h}：控制条按钮不小于 36px（` + btns.map(Math.round).join(',') + '）')
        await p.ctx.close()
      }
      g.end()
    }
    // ---------- Tab 走完 ----------
    {
      const p = await open(site, {}, { played: true })
      const g = R.group('键盘：Tab 能走遍所有可交互的元素，不被短片困住')
      const seen = []
      for (let i = 0; i < 40; i++) {
        await p.keyboard.press('Tab')
        const d = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return 'body'; const r = e.getBoundingClientRect(); return (e.className || e.tagName).toString().slice(0, 30) + '|' + (e.getAttribute('aria-label') || e.textContent.trim().slice(0, 12)) + '|' + (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight ? 'vis' : 'hid') })
        seen.push(d)
      }
      const uniq = new Set(seen)
      g.ok(uniq.size >= 14, '依次聚焦到不同的元素：' + uniq.size + ' 个')
      for (const k of ['play', 'prev', 'next', 'replay', 'skip']) g.ok(seen.some(s => s.includes(k)), 'Tab 到过播放器的 ' + k)
      g.ok(seen.some(s => s.includes('rail') || s.includes('第 0 幕')), 'Tab 到过幕进度圆点')
      g.ok(!seen.slice(-6).every(s => s === seen[seen.length - 1]), '焦点没有被困在同一个元素')
      g.end()
      await p.ctx.close()
    }
    // ---------- 链接 ----------
    {
      const g = R.group('收束幕的链接：每一站都指向真实存在的章，课程地图指向 /roadmap')
      const p = await open(site, {}, { played: true })
      const hrefs = await p.locator('.eras a').evaluateAll(a => a.map(x => x.getAttribute('href')))
      g.ok(hrefs.length >= 7, '各站链接 ' + hrefs.length + ' 个')
      const bad = []
      for (const h of hrefs) { const r = await fetch(new URL(h + (h.endsWith('.html') ? '' : '.html'), site.origin)); if (!r.ok) bad.push(h + ' ' + r.status) }
      g.ok(bad.length === 0, '章链接都能打开 ' + bad.join(','))
      const map = await p.locator('.fin-actions .btn.ghost').getAttribute('href')
      g.ok(/\/roadmap$/.test(map) && (await fetch(new URL(map + '.html', site.origin))).ok, '课程地图链接：' + map)
      g.ok((await p.locator('.s0 .btn.primary').getAttribute('href')).includes('/chapters/01'), '新访客的主按钮指向第 1 章')
      await p.ctx.close(); g.end()
    }
    // ---------- 收束幕：时间轴、数字滚动、深色顶栏 ----------
    {
      const g = R.group('收束幕：发光时间轴上 7 站、数字从 0 滚动到真实值、浅色模式下顶栏也是深色（对比度达标），离开首页恢复')
      const real = [CH.filter(c => c.stage != null).length, CH.reduce((a, c) => a + c.ex.length, 0), CH.filter(c => c.stage != null).reduce((a, c) => a + c.scCount, 0)]
      const p = await open(site, { colorScheme: 'light' }, { played: true })
      await scrollToTime(p, 48.5 + 0.5); await sleep(400)
      const zero = await p.evaluate(() => [...document.querySelectorAll('.stats3 dt')].map(e => e.textContent.trim()))
      g.ok(zero.every(v => v === '0'), '进入收束幕时三个数字是 0：' + zero)
      await scrollToTime(p, 54.4); await sleep(500)
      const end = await p.evaluate(() => [...document.querySelectorAll('.stats3 dt')].map(e => +e.textContent))
      g.ok(JSON.stringify(end) === JSON.stringify(real), `数字滚动到真实值 ${real}（实际 ${end}）`)
      g.ok((await p.locator('.eras li').count()) === 7 && (await p.locator('.eras li a.era-main').count()) === 7, '时间轴上 7 站，每站有章链接')
      g.ok(await p.locator('.tl-curve').isVisible() && await p.locator('.fin-actions .btn.big').isVisible() && await p.locator('.fin-actions .btn.ghost').isVisible(), '曲线、实心主按钮、描边的“查看课程地图”都可见')
      const nav = await p.evaluate(() => {
        const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }); return .2126 * r + .7152 * g + .0722 * b }
        const rgb = el => (getComputedStyle(el).color.match(/[\d.]+/g) || []).slice(0, 3).map(Number)
        const bgc = (getComputedStyle(document.querySelector('.VPNavBar')).backgroundColor.match(/[\d.]+/g) || []).map(Number)
        const base = [5, 11, 15], a = bgc.length > 3 ? bgc[3] : 1
        const bg = [0, 1, 2].map(i => bgc[i] * a + base[i] * (1 - a))
        const cr = el => { const L1 = lum(rgb(el)), L2 = lum(bg); return (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05) }
        const pick = sel => document.querySelector(sel)
        return { bgLum: lum(bg), title: cr(pick('.VPNavBarTitle .title')), np: cr(pick('.nav-progress .np-txt')), menu: cr(pick('.VPNavBarMenuLink')), search: cr(pick('.VPNavBarSearch .DocSearch-Button-Placeholder') || pick('.VPNavBarSearch')) }
      })
      g.ok(nav.bgLum < 0.05, '浅色模式下首页顶栏是深色（亮度 ' + nav.bgLum.toFixed(3) + '）')
      g.ok(nav.title >= 4.5 && nav.np >= 4.5 && nav.menu >= 4.5 && nav.search >= 4.5, '顶栏文字对比度 ≥ 4.5：' + JSON.stringify(nav))
      const bar = await p.locator('.nav-progress .np-bar').boundingBox()
      g.ok(!bar || bar.width > 20, '顶栏进度条可见')
      await p.locator('.eras a.era-main').first().click(); await p.waitForURL(/chapters/); await sleep(600)
      const lightNav = await p.evaluate(() => { const c = (getComputedStyle(document.querySelector('.VPNavBar')).backgroundColor.match(/[\d.]+/g) || []).map(Number); return c[0] + c[1] + c[2] })
      g.ok(lightNav > 600, '离开首页后顶栏恢复为浅色（亮度和 ' + lightNav + '）')
      await p.ctx.close(); g.end()
    }
    // ---------- 配乐：默认静音、点开才创建 AudioContext 和加载音频 chunk ----------
    {
      const g = R.group('配乐：默认静音；点开声音才创建上下文并加载音频 chunk；暂停/关掉/离开页面都会静音或关闭；偏好记在单独的键里')
      const dir = path.join(dist, 'assets/chunks')
      const audioChunk = fs.readdirSync(dir).find(f => !/^(theme|framework)/.test(f) && fs.readFileSync(path.join(dir, f), 'utf8').includes('createDynamicsCompressor'))
      g.ok(!!audioChunk, '音频代码在自己的 chunk 里：' + audioChunk)
      const p = await open(site, {}, { speed: 1 })
      const reqs = []
      p.on('request', r => reqs.push(r.url()))
      await waitFor(p, async () => (await state(p)).playing, 4000)
      const hook = () => p.evaluate(() => window.__filmHook.audio())
      const a0 = await p.evaluate(() => ({ ctxs: (window.__ctxs || []).length, hook: window.__filmHook.audio() }))
      g.ok(a0.ctxs === 0 && !a0.hook.created && !reqs.some(u => audioChunk && u.includes(audioChunk)), '默认静音：没有创建 AudioContext，也没有加载音频 chunk')
      g.ok((await p.getAttribute('.snd', 'aria-pressed')) === 'false', '声音开关 aria-pressed=false')
      g.ok(await p.locator('.snd-tip').isVisible(), '首次自动播放开始时出现“开启配乐”提示')
      await p.click('.snd'); await sleep(1800)
      const a1 = await hook()
      g.ok(a1.on && a1.created && a1.state === 'running' && a1.level > 0.003 && reqs.some(u => audioChunk && u.includes(audioChunk)), '点开声音：上下文 running、有电平、此时才加载音频 chunk ' + JSON.stringify(a1))
      const lsv = await p.evaluate(() => [localStorage.getItem('hands-on-vue3-film-sound'), localStorage.getItem('hands-on-vue3-film-tip'), localStorage.getItem('hands-on-vue3-v1')])
      g.ok(lsv[0] === 'on' && lsv[1] === '1' && !/film/.test(lsv[2] || ''), '偏好记在单独的 localStorage 键里，不写进学习进度的键')
      const f0 = a1.info.anchorF
      await p.click('.player .next'); await sleep(1500)
      const a2 = await hook()
      g.ok(a2.info.anchorF >= f0 + 2 && a2.playing, '换幕后重新排程：调度位置随影片时间改变 ' + JSON.stringify([f0, a2.info.anchorF]))
      await p.click('.player .play'); await sleep(550)
      const a3 = await hook(); await sleep(500); const a4 = await hook()
      g.ok(a3.level < 0.0008 && a4.state === 'suspended', '暂停：0.5 秒内输出静音，随后上下文 suspend ' + JSON.stringify([a3.level, a4.state]))
      await p.click('.player .play'); await sleep(1800)
      const a5 = await hook()
      g.ok(a5.state === 'running' && a5.level > 0.003, '继续播放：声音淡入回来')
      await p.click('.snd'); await sleep(900)
      const a6 = await hook()
      g.ok(!a6.on && a6.state === 'suspended' && (await p.getAttribute('.snd', 'aria-pressed')) === 'false', '关掉声音：上下文 suspend，aria-pressed=false')
      await p.click('.snd'); await sleep(1200)
      await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')) }); await sleep(900)
      const a7 = await hook()
      g.ok(a7.level < 0.0008, '标签页转到后台：声音静音')
      await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }) })
      await p.goto(site.base + '/glossary.html').catch(() => {}); await sleep(1500)
      const gone = await p.evaluate(() => ({ states: (window.__ctxs || []).map(c => c.state), hook: !!window.__filmHook }))
      g.ok(!gone.hook && gone.states.every(s2 => s2 === 'closed'), '离开首页：关闭 AudioContext、清掉测试钩子 ' + JSON.stringify(gone))
      await p.ctx.close()
      const q = await open(site, {}, { played: true })
      await q.evaluate(() => localStorage.setItem('hands-on-vue3-film-sound', 'on'))
      await q.click('.film-play'); await sleep(2200)
      const b1 = await q.evaluate(() => window.__filmHook.audio())
      g.ok(b1.on && b1.state === 'running' && b1.level > 0.003, '偏好开过声音：点“播放短片”直接带声音')
      await q.ctx.close()
      const r2 = await open(site, {}, { played: true })
      await r2.click('.film-play'); await sleep(1200)
      const b2 = await r2.evaluate(() => ({ h: window.__filmHook.audio(), tip: !document.querySelector('.snd-tip').hidden, ctxs: (window.__ctxs || []).length }))
      g.ok(!b2.h.on && b2.ctxs === 0 && b2.tip, '没有偏好：点播放仍然静音，并显示“开启配乐”提示')
      await r2.ctx.close(); g.end()
    }
    // ---------- 离线渲染整段配乐并检查 ----------
    {
      const g = R.group('配乐离线检查：无 NaN 无削波、峰值 ≤ -3 dBFS、响度适中、没有意外静音、立体声、频谱不刺耳、每个音效点有能量突起')
      const p = await open(site, {}, { played: true })
      const r = await p.evaluate(() => window.__filmHook.render())
      const st = r.stats
      if (process.env.SCORE_DIR) { fs.mkdirSync(process.env.SCORE_DIR, { recursive: true }); fs.writeFileSync(path.join(process.env.SCORE_DIR, 'score.wav'), Buffer.from(r.wav, 'base64')); fs.writeFileSync(path.join(process.env.SCORE_DIR, 'stats.json'), JSON.stringify(st, null, 1)) }
      console.log('  [数字] 配乐：' + JSON.stringify({ ...st, cues: undefined, perScene: undefined }))
      g.ok(st.nan === 0 && st.clipped === 0, '没有 NaN、没有削波 ' + [st.nan, st.clipped])
      g.ok(st.peakDb <= -3 && st.rmsDb > -26 && st.rmsDb < -14, `峰值 ${st.peakDb} dBFS ≤ -3，整体 RMS ${st.rmsDb} dBFS 适中`)
      g.ok(st.perScene.every(x => x.peakDb <= -3 && x.rmsDb > -32), '每一幕峰值 ≤ -3 dBFS、响度不低于 -32 dBFS ' + JSON.stringify(st.perScene))
      g.ok(st.longestQuiet <= 1.5, `没有超过 1.5 秒的意外静音（最长 ${st.longestQuiet}）`)
      g.ok(st.stereoDiff > 0.02, '左右声道不同 ' + st.stereoDiff)
      g.ok(st.bands['2k-5k'] + st.bands.gt5k < 0.2, '频谱不集中在刺耳的 2–5 kHz ' + JSON.stringify(st.bands))
      const bad = st.cues.filter(c => !c.ok)
      g.ok(bad.length === 0, `每个音效点都有能量突起（${st.cues.length - bad.length}/${st.cues.length}）` + bad.map(c => `${c.name}@${c.t.toFixed(2)}×${c.ratio}`).join(' '))
      await p.ctx.close(); g.end()
    }

    // ---------- 站内跳转和清理 ----------
    {
      const g = R.group('从首页点进章再回来：离开时清理（film-dyn 去掉、播放器移除），回来正常')
      const p = await open(site, {}, { speed: 1 })
      await waitFor(p, async () => (await state(p)).playing, 4000)
      await p.locator('.player .skip').click(); await sleep(1000)
      await p.locator('.eras a').first().click(); await p.waitForURL(/chapters/); await sleep(800)
      const left = await p.evaluate(() => ({ dyn: document.documentElement.classList.contains('film-dyn'), player: !!document.querySelector('.player'), film: !!document.querySelector('.film') }))
      g.ok(!left.dyn && !left.player && !left.film, '离开首页后没有残留 ' + JSON.stringify(left))
      await p.goBack(); await p.waitForSelector('.film.ready', { timeout: 10000 }); await sleep(800)
      const back = await state(p)
      g.ok(back.ready && back.dyn && (await p.locator('.player').count()) === 1, '回到首页：短片重新就绪，只有一个播放器')
      g.ok(!back.playing, '回来不自动播放（本会话放过）')
      g.ok(p.errs.length === 0, '没有控制台报错：' + p.errs.join('|'))
      await p.ctx.close(); g.end()
    }
    // ---------- 性能：CLS、长任务、帧间隔（4 倍 CPU 降速） ----------
    {
      const g = R.group('性能：开场到播放中的累计布局偏移很小；4 倍 CPU 降速下没有超长任务，帧间隔可接受')
      const ctx = await site.browser.newContext({ viewport: { width: 1280, height: 800 } })
      const p = await ctx.newPage()
      await p.addInitScript(() => {
        window.__cls = 0; window.__long = []; window.__frames = []
        new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true })
        new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)) }).observe({ type: 'longtask', buffered: true })
        let last = 0
        const tick = t => { if (last) window.__frames.push(t - last); last = t; requestAnimationFrame(tick) }
        requestAnimationFrame(tick)
      })
      const cdp = await ctx.newCDPSession(p)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
      await p.goto(site.base + '/'); await p.waitForSelector('.film.ready', { timeout: 30000 })
      await waitFor(p, async () => (await state(p)).playing, 6000)
      await sleep(12000)
      const r = await p.evaluate(() => { const f = window.__frames.slice(10).sort((a, b) => a - b); return { cls: window.__cls, long: window.__long, p50: f[Math.floor(f.length * .5)], p95: f[Math.floor(f.length * .95)], n: f.length } })
      console.log('  [数字] 4× 降速：CLS=' + r.cls.toFixed(4) + ' 长任务=' + JSON.stringify(r.long) + ' 帧间隔 p50=' + r.p50?.toFixed(1) + 'ms p95=' + r.p95?.toFixed(1) + 'ms（' + r.n + ' 帧）')
      g.ok(r.cls < 0.1, 'CLS < 0.1（' + r.cls.toFixed(4) + '）')
      g.ok(r.long.every(d => d < 400), '没有超过 400ms 的长任务：' + JSON.stringify(r.long))
      g.ok(r.p95 < 100, '帧间隔 p95 < 100ms（' + r.p95?.toFixed(1) + '）')
      await ctx.close(); g.end()
    }
    // ---------- 体积与按需加载 ----------
    {
      const g = R.group('首页 chunk 与主包体积：短片代码是首页自己的异步 chunk，章页不加载它')
      const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
      const files = [...new Set((html.match(/\/assets\/[^"' ]+\.js/g) || []))].map(f => path.join(dist, f.replace(/^.*?\/assets\//, 'assets/')))
      const main = files.reduce((s, f) => s + gz(f), 0)
      const filmChunk = fs.readdirSync(path.join(dist, 'assets/chunks')).filter(f => /^film\./.test(f)).map(f => path.join(dist, 'assets/chunks', f))
      g.ok(filmChunk.length === 1, '有一个 film chunk')
      const fg = filmChunk.length ? gz(filmChunk[0]) : 0
      console.log(`  [数字] 首页首屏 JS gzip ${(main / 1024).toFixed(1)} kB，film 异步 chunk gzip ${(fg / 1024).toFixed(1)} kB`)
      g.ok(!files.some(f => /film\./.test(f)), '首页 HTML 不预加载 film chunk（它是异步的）')
      g.ok(main < 150 * 1024, `首屏 JS gzip < 150 kB（${(main / 1024).toFixed(1)}）`)
      g.ok(fg < 12 * 1024, `film chunk gzip < 12 kB（${(fg / 1024).toFixed(1)}）`)
      const reqs = []
      const p = await open(site, {}, { played: true })
      g.ok(true, '首页就绪')
      const pg = await site.browser.newContext().then(c => c.newPage())
      pg.on('request', r => reqs.push(r.url()))
      await pg.goto(site.base + '/chapters/01-first.html'); await sleep(800)
      g.ok(!reqs.some(u => /film\./.test(u)), '章页不加载 film chunk')
      await p.ctx.close(); await pg.context().close(); g.end()
    }
    // ---------- 画面截图（HOME_SHOTS=1） ----------
    if (SHOTS) {
      const p = await open(site, { viewport: { width: 1440, height: 900 } }, { played: true })
      fs.mkdirSync(path.join(ROOT, 'tests/screenshots'), { recursive: true })
      for (let i = 0; i < SCENE_COUNT; i++) { await scrollToTime(p, MARKS[i] + (i === 0 ? 0.5 : 3.8)); await sleep(500); await p.screenshot({ path: path.join(ROOT, `tests/screenshots/home-film-desktop-${i}.png`) }) }
      await p.ctx.close()
    }
  } finally {
    await site.stop()
  }
  console.log(R.bad ? '有 ' + R.bad + ' 项失败' : '全部通过')
  process.exit(R.bad ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
