#!/usr/bin/env node
// 截图自查，两种模式。
//
// 1. 整页模式（旧）：给一章截浅色和深色整页图。会展开所有折叠块，并点开每个实验台的“先猜”。
//
//      node scripts/shot.mjs <章文件名，如 03-refs> [输出目录]
//
//    只构建这一章到临时目录，不碰 dist。整页长图缩小后看不清细节，只适合看整体版面。
//
// 2. 逐区块模式（--blocks）：一块一张图，不缩小，浅色和深色各一套（桌面宽度 1280），另外在 390px 宽度下截实验台和练习。
//
//      node scripts/shot.mjs --blocks <目标…> [--out 输出目录] [--no-mobile] [--no-dark]
//
//    目标：章文件名（如 13-project-board）、all（全部 42 章）、pages（首页、复习页、术语表页、阶段测验页、速查表页），可以写多个。
//    只在目标包含 all 或 pages 时才构建全站，否则只构建列出的章。构建到临时目录，不碰 dist。
//    每个页面的输出：<输出目录>/<页面>/<主题>-<序号>-<种类>.png，种类有：
//      head（章头与目标）、lab（实验台，先猜题答完之后）、lab0（先猜题没答时的样子，只在实验台有先猜时才有）、
//      ex（练习，编辑器加载完成后）、ex-unfold1（含折叠只读块的练习,只展开第一个折叠块）、ex-unfold（全部折叠块展开之后）、table、fig（示意图）、sc（自测块，答对一题之后）
//    手机宽度：<页面>/m-<序号>-lab.png、m-<序号>-ex.png(含折叠块的再有 m-<序号>-ex-unfold1.png)。
//    另外写 <输出目录>/findings.txt：自动发现的问题（残留的字面 ** / ::: / 【待写】 / HTML 实体，手机宽度下横向溢出，
//    控制台报错，实验台或练习没渲染出来）。图片仍然要用 Read 逐张看：自动检查只能发现“文字层面”的问题。
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright'
import { buildChapters, startPreview } from './lib/build.mjs'


async function pageMode([ch, outArg]) {
  if (!ch) { console.error('用法：node scripts/shot.mjs <章文件名> [输出目录]\n      node scripts/shot.mjs --blocks <章文件名|all|pages …> [--out 目录]'); process.exit(2) }
  const out = path.resolve(outArg || path.join(os.tmpdir(), 'shots-' + ch))
  fs.mkdirSync(out, { recursive: true })

  const built = buildChapters([ch.replace(/\.md$/, '')])
  const pv = await startPreview(built.env)
  const browser = await chromium.launch()
  try {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme })
      const p = await ctx.newPage()
      const errs = []
      p.on('pageerror', e => errs.push(e.message))
      p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
      await p.goto(`${pv.base}/chapters/${ch.replace(/\.md$/, '')}.html`)
      await p.waitForTimeout(800)
      // 展开所有折叠块（深入、想一想、速查表外层）。直接设 open，不用点击，嵌套的也一并展开
      await p.evaluate(() => document.querySelectorAll('.vp-doc details').forEach(d => { d.open = true }))
      // 点开实验台的“先猜”
      for (const l of await p.locator('.lab .sc.predict').all()) {
        await l.scrollIntoViewIfNeeded().catch(() => {})
        await l.locator('.sc-o').first().click().catch(() => {})
        await p.waitForTimeout(150)
      }
      // 滚一遍，触发实验台和练习的按需挂载
      const h = await p.evaluate(() => document.body.scrollHeight)
      for (let y = 0; y < h; y += 700) { await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(60) }
      await p.evaluate(() => window.scrollTo(0, 0))
      await p.waitForTimeout(800)
      const file = path.join(out, `${ch}-${scheme}.png`)
      await p.screenshot({ path: file, fullPage: true })
      console.log(`${scheme}: ${file}` + (errs.length ? `   控制台报错 ${errs.length} 条：${errs[0].slice(0, 120)}` : ''))
      await ctx.close()
    }
  } finally {
    await browser.close()
    pv.stop()
    built.cleanup()
  }
}

// ---------------------------------------------------------------- 逐区块模式

function parseBlockArgs(a) {
  const o = { targets: [], out: path.join(os.tmpdir(), 'shots-blocks'), mobile: true, dark: true }
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--out') o.out = path.resolve(a[++i])
    else if (a[i] === '--no-mobile') o.mobile = false
    else if (a[i] === '--no-dark') o.dark = false
    else o.targets.push(a[i].replace(/\.md$/, ''))
  }
  if (!o.targets.length) { console.error('--blocks 后面要写目标：章文件名、all 或 pages'); process.exit(2) }
  return o
}

const BAD_TEXT = [
  [/\*\*[^*\s][^*]*\*\*/, '残留的字面 **'],
  [/^:::/m, '残留的字面 :::'],
  [/【待写】/, '【待写】'],
  [/&(?:amp|lt|gt|quot|nbsp|#\d+);/, 'HTML 实体'],
]

async function blocksMode(a) {
  const opt = parseBlockArgs(a)
  const chapterFiles = fs.readdirSync(path.resolve('course/chapters')).filter(f => /^\d\d-.*\.md$/.test(f) && f !== '27-quiz.md').map(f => f.replace(/\.md$/, ''))
  const pages = []
  const wantAll = opt.targets.includes('all')
  const wantPages = opt.targets.includes('pages')
  if (wantAll) pages.push(...chapterFiles.map(f => ({ name: f, url: `/chapters/${f}.html` })))
  else for (const t of opt.targets) if (t !== 'pages') pages.push({ name: t, url: `/chapters/${t}.html` })
  if (wantPages) pages.push(
    { name: 'home', url: '/' }, { name: 'review', url: '/review.html' }, { name: 'glossary', url: '/glossary.html' },
    { name: 'check-1', url: '/check/1.html' }, { name: 'cheat', url: '/chapters/cheat.html' })
  const chaptersToBuild = wantAll || wantPages ? [] : pages.map(p => p.name)
  fs.mkdirSync(opt.out, { recursive: true })
  const built = buildChapters(chaptersToBuild) // 空数组 = 全站
  const pv = await startPreview(built.env)
  const browser = await chromium.launch()
  const findings = []
  const note = (page, msg) => { findings.push(`${page}  ${msg}`); console.log(`  [发现] ${page}  ${msg}`) }
  try {
    for (const pg of pages) {
      const dir = path.join(opt.out, pg.name)
      fs.mkdirSync(dir, { recursive: true })
      console.log(pg.name)
      const schemes = opt.dark ? ['light', 'dark'] : ['light']
      for (const scheme of schemes) await shootDesktop(browser, pv.base + pg.url, dir, scheme, pg.name, note)
      if (opt.mobile) await shootMobile(browser, pv.base + pg.url, dir, pg.name, note)
    }
  } finally {
    await browser.close()
    pv.stop()
    built.cleanup()
    fs.writeFileSync(path.join(opt.out, 'findings.txt'), findings.join('\n') + (findings.length ? '\n' : ''))
    console.log(`\n图片在 ${opt.out}，自动发现的问题 ${findings.length} 条（${path.join(opt.out, 'findings.txt')}）`)
  }
}

/** 给一个元素截图，不可见或太小就跳过。返回是否截成 */
async function shotEl(loc, file) {
  try {
    await loc.scrollIntoViewIfNeeded({ timeout: 3000 })
    const box = await loc.boundingBox()
    if (!box || box.width < 40 || box.height < 12) return false
    await loc.screenshot({ path: file, timeout: 8000 })
    return true
  } catch { return false }
}

async function newPage(browser, scheme, width, note, name) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme })
  const p = await ctx.newPage()
  p.on('pageerror', e => note(name, `页面脚本报错（${scheme} ${width}）：${e.message.slice(0, 160)}`))
  p.on('console', m => { if (m.type() === 'error') note(name, `控制台报错（${scheme} ${width}）：${m.text().slice(0, 160)}`) })
  return { ctx, p }
}

/** 滚一遍页面，触发实验台和练习的按需挂载 */
async function scrollThrough(p) {
  const h = await p.evaluate(() => document.body.scrollHeight)
  for (let y = 0; y < h; y += 600) { await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(50) }
  await p.evaluate(() => window.scrollTo(0, 0))
  await p.waitForTimeout(400)
}

async function shootDesktop(browser, url, dir, scheme, name, note) {
  const { ctx, p } = await newPage(browser, scheme, 1280, note, name)
  try {
    await p.goto(url)
    await p.addStyleTag({ content: '.VPNav, .VPLocalNav, .VPSidebar { visibility: hidden !important }' }) // 固定的导航栏会盖住元素截图
    await p.waitForTimeout(700)
    await scrollThrough(p)
    // 文字层面的自动检查只在浅色跑一次
    if (scheme === 'light') {
      const text = await p.evaluate(() => (document.querySelector('.vp-doc') || document.body).innerText)
      for (const [re, what] of BAD_TEXT) { const m = re.exec(text); if (m) note(name, `${what}：「${m[0].slice(0, 40)}」`) }
    }
    const pre = `${scheme}-`
    let n = 0
    const idx = () => String(++n).padStart(2, '0')
    // 章头与目标：从页面顶部到第一个 .goal 之后
    const top = p.locator('.ch-meta, .VPHero, .course-home').first()
    if (await top.count()) await shotEl(top, path.join(dir, `${pre}${idx()}-head.png`))
    for (const g of await p.locator('.goal').all()) { await shotEl(g, path.join(dir, `${pre}${idx()}-head.png`)); break }
    // 示意图
    for (const f of await p.locator('.fig').all()) await shotEl(f, path.join(dir, `${pre}${idx()}-fig.png`))
    // 表格
    for (const t of await p.locator('.vp-doc table').all()) await shotEl(t, path.join(dir, `${pre}${idx()}-table.png`))
    // 实验台：先猜没答时一张，答完（点第一项并核对）之后一张
    for (const lab of await p.locator('.lab').all()) {
      const gated = await lab.evaluate(el => el.classList.contains('gated')).catch(() => false)
      const k = idx()
      if (gated) await shotEl(lab, path.join(dir, `${pre}${k}-lab0.png`))
      for (const s of await lab.locator('.sc.predict').all()) { await s.locator('.sc-o').first().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(150) }
      await lab.locator('.pr-check .b.pri').first().click({ timeout: 1500 }).catch(() => {})
      await p.waitForTimeout(500)
      const ok = await shotEl(lab, path.join(dir, `${pre}${k}-lab.png`))
      if (!ok && scheme === 'light') note(name, '实验台没有渲染出可见内容')
    }
    // 练习：等编辑器加载完成；有折叠块的再截一张展开后的
    for (const ex of await p.locator('.ex').all()) {
      await ex.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {})
      await p.waitForTimeout(250)
      const ready = await ex.locator('.cm-editor').first().waitFor({ timeout: 6000 }).then(() => true).catch(() => false)
      const id = (await ex.getAttribute('data-ex')) || (await ex.getAttribute('data-ex-ph')) || '?'
      if (!ready) { if (scheme === 'light') note(name, `练习 ${id} 的编辑器没有加载出来`); continue }
      if (scheme === 'light' && (await ex.locator('p.ex-err').count())) note(name, `练习 ${id} 显示了错误`)
      const k = idx()
      await shotEl(ex, path.join(dir, `${pre}${k}-ex.png`))
      // 折叠块的 widget 是 button.cm-foldBtn[data-fold-kind=block](折叠状态);展开后变成 head/end 标记行
      const folds = ex.locator('.cm-foldBtn[data-fold-kind="block"]')
      if (await folds.count()) {
        await clickFold(p, folds.first()); await p.waitForTimeout(200)
        await shotEl(ex, path.join(dir, `${pre}${k}-ex-unfold1.png`))
        for (let i = 0; i < 12 && (await folds.count()); i++) { await clickFold(p, folds.first()); await p.waitForTimeout(100) }
        await shotEl(ex, path.join(dir, `${pre}${k}-ex-unfold.png`))
      }
    }
    // 自测块：答对一题（选第一项，题库里第一项是正确答案的只是内部顺序，这里点一下看“答后”的样子）
    for (const sc of await p.locator('.selfcheck').all()) {
      const q = sc.locator('.sc').first()
      await q.locator('.sc-o').first().click({ timeout: 1500 }).catch(() => {})
      await p.waitForTimeout(250)
      await shotEl(sc, path.join(dir, `${pre}${idx()}-sc.png`))
      break
    }
  } catch (e) {
    note(name, `截图过程出错（${scheme}）：${String(e.message).slice(0, 160)}`)
  } finally { await ctx.close() }
}

/** 用真实的鼠标点折叠块(locator.click 会为了“滚进视野”把编辑器横向滚几个像素,截图里每行的开头会被裁掉) */
async function clickFold(p, loc) {
  await loc.evaluate(el => { const r = el.getBoundingClientRect(); window.scrollBy(0, r.top - innerHeight / 2) }).catch(() => {})   // 只滚页面,不动编辑器自己的横向滚动
  const b = await loc.boundingBox({ timeout: 2000 }).catch(() => null)
  if (b) await p.mouse.click(b.x + Math.min(40, b.width / 2), b.y + b.height / 2)
}

async function shootMobile(browser, url, dir, name, note) {
  const { ctx, p } = await newPage(browser, 'light', 390, note, name)
  try {
    await p.goto(url)
    await p.addStyleTag({ content: '.VPNav, .VPLocalNav { visibility: hidden !important }' })
    await p.waitForTimeout(700)
    await scrollThrough(p)
    const over = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    if (over.sw > over.iw + 1) {
      const culprit = await p.evaluate(() => { const w = window.innerWidth; const bad = [...document.querySelectorAll('.vp-doc *')].filter(e => e.getBoundingClientRect().right > w + 1 && !e.closest('pre, .tbl-wrap, .cm-scroller, table, .overflow-x, [style*="overflow"]')).slice(0, 3); return bad.map(e => e.tagName + '.' + (e.className || '').toString().slice(0, 40)).join(' | ') })
      note(name, `手机宽度横向溢出（页面宽 ${over.sw} > ${over.iw}）${culprit ? '，可能的元素：' + culprit : ''}`)
    }
    let k = 0
    for (const lab of await p.locator('.lab').all()) {
      k++
      for (const s of await lab.locator('.sc.predict').all()) { await s.locator('.sc-o').first().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(150) }
      await p.waitForTimeout(300)
      await shotEl(lab, path.join(dir, `m-${String(k).padStart(2, '0')}-lab.png`))
    }
    k = 0
    for (const ex of await p.locator('.ex').all()) {
      k++
      await ex.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {})
      await ex.locator('.cm-editor').first().waitFor({ timeout: 6000 }).catch(() => {})
      await shotEl(ex, path.join(dir, `m-${String(k).padStart(2, '0')}-ex.png`))
      const mf = ex.locator('.cm-foldBtn[data-fold-kind="block"]')
      if (await mf.count()) {
        await clickFold(p, mf.first()); await p.waitForTimeout(200)
        await shotEl(ex, path.join(dir, `m-${String(k).padStart(2, '0')}-ex-unfold1.png`))
      }
    }
  } catch (e) {
    note(name, `手机宽度截图过程出错：${String(e.message).slice(0, 160)}`)
  } finally { await ctx.close() }
}

const args = process.argv.slice(2)
if (args[0] === '--blocks') await blocksMode(args.slice(1))
else await pageMode(args)
