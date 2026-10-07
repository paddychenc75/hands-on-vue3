#!/usr/bin/env node
// 给一章截图自查：浅色和深色各一张整页图。会展开所有折叠块（深入、想一想、速查表），并点开每个实验台的“先猜”（选第一项）。
//
//   node scripts/shot.mjs <章文件名，如 03-refs> [输出目录]
//
// 只构建这一章到临时目录，不碰 dist。输出目录默认是系统临时目录下的 shots-<章>。
// 打印图片路径，用 Read 工具打开图片看版面（浅色和深色都要看）。页面很长时图片会很高，可以分段看。
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright'
import { buildChapters, startPreview } from './lib/build.mjs'

const [ch, outArg] = process.argv.slice(2)
if (!ch) { console.error('用法：node scripts/shot.mjs <章文件名> [输出目录]'); process.exit(2) }
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
