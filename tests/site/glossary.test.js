// 术语表和术语标注的浏览器测试。
// 用法：
//   node tests/site/glossary.test.js                      有默认的 course/.vitepress/dist 就用它；没有就自己完整构建到临时目录再测（约 30 秒）
//   COURSE_OUT_DIR=<已构建目录> node tests/site/glossary.test.js   用已经构建好的目录（目录里要有 index.html），不重新构建
// 测什么：
//   1. 术语表页条目数 = 各章“本章术语”块去重后的总数（这里用独立的正则重新数一遍，不用站点自己的汇总函数）
//   2. 同名术语合并：出现在几章就链接到几章；每个条目的章链接都指向真的写了这个术语的章
//   3. 搜索过滤；没有结果时的提示
//   4. 侧边栏顶部入口：今日复习、术语表、速查表；术语表页的当前项高亮
//   5. 390px 宽没有横向滚动
//   6. 术语标注：只标已学过的术语，每小节每个术语最多标一次，不标代码、标题、链接、术语块、目标、自测、实验台、练习；悬停和聚焦显示定义；换页后不叠加
const { chromium } = require('playwright')
const { spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { makeReporter, startPreview, IGNORED_CONSOLE } = require('./helpers')

const ROOT = path.resolve(__dirname, '../..')
const { WRITING_TERMS } = require('../../course/writing-terms.mjs')
const R = makeReporter()

// ---- 独立地从章节 Markdown 里数术语 ----
function readTerms() {
  const dir = path.join(ROOT, 'course/chapters')
  const byTerm = new Map() // 术语 → 出现的章文件名（按章号顺序）
  const chapters = []
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8')
    const fm = /^---\n([\s\S]*?)\n---/.exec(src)?.[1] || ''
    if (!/^stage:\s*\d/m.test(fm)) continue // 只看有阶段的章
    const chapter = Number(/^chapter:\s*(\d+)/m.exec(fm)?.[1])
    const file = f.replace(/\.md$/, '')
    chapters.push({ file, chapter })
    const block = /^::: terms[^\n]*\n([\s\S]*?)\n:::[ \t]*$/m.exec(src)?.[1] || ''
    const lines = block.split('\n')
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i].trim() && !/^:\s/.test(lines[i]) && /^:\s/.test(lines[i + 1])) {
        const t = lines[i].trim()
        if (!byTerm.has(t)) byTerm.set(t, [])
        if (!byTerm.get(t).includes(file)) byTerm.get(t).push(file)
      }
    }
  }
  return { byTerm, chapters }
}

;(async () => {
  const { byTerm, chapters } = readTerms()
  const firstChapterNo = Object.fromEntries(chapters.map(c => [c.file, c.chapter]))
  const env = { ...process.env, NO_PROXY: 'localhost,127.0.0.1' }
  let tmp = null
  // 目录选择和其他套件一致：COURSE_OUT_DIR；没设就用默认的 dist；都没有构建产物才自己构建到临时目录
  if (!env.COURSE_OUT_DIR && fs.existsSync(path.join(ROOT, 'course/.vitepress/dist/index.html'))) { /* 用默认 dist */ }
  else if (!env.COURSE_OUT_DIR || !fs.existsSync(path.join(env.COURSE_OUT_DIR, 'index.html'))) {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-glossary-'))
    env.COURSE_OUT_DIR = path.join(tmp, 'dist')
    env.COURSE_CACHE_DIR = path.join(tmp, 'cache')
    delete env.COURSE_CHAPTERS
    const b = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vitepress/bin/vitepress.js'), 'build', 'course'], { cwd: ROOT, env, encoding: 'utf8' })
    if (b.status !== 0) { console.error(b.stdout + b.stderr); console.error('构建失败'); process.exit(1) }
  }
  const pv = await startPreview(env)
  const base = pv.base
  const browser = await chromium.launch()
  const newPage = async (opts = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts })
    const p = await ctx.newPage()
    p.errs = []
    p.on('pageerror', e => p.errs.push(e.message))
    p.on('console', m => { if (m.type() === 'error' && !IGNORED_CONSOLE.some(re => re.test(m.text()))) p.errs.push(m.text()) })
    return p
  }
  try {

    // ---------- 1. 条目数和合并 ----------
    const p = await newPage()
    await p.goto(base + '/glossary.html')
    await p.waitForSelector('.glossary .gl-row')
    await p.waitForTimeout(300)
    const rows = await p.$$eval('.glossary .gl-row', es => es.map(e => ({ term: e.dataset.term, def: e.querySelector('.gl-def').innerText, links: [...e.querySelectorAll('.gl-src a')].map(a => a.getAttribute('href')) })))
    {
      const g = R.group(`术语表页条目数 = 各章术语块去重后的总数（${byTerm.size}）`)
      g.ok(rows.length === byTerm.size, `页面 ${rows.length} 条，章节里去重后 ${byTerm.size} 个`)
      g.ok(new Set(rows.map(r => r.term)).size === rows.length, '页面里没有重复的术语')
      g.ok(rows.every(r => byTerm.has(r.term)), '页面上的术语都来自章节：' + rows.filter(r => !byTerm.has(r.term)).map(r => r.term))
      g.ok(rows.every(r => r.def.trim().length > 0), '每条都有解释')
      g.ok(/共 \d+ 个术语/.test(await p.locator('.glossary .crumb').innerText()) && (await p.locator('.glossary .crumb').innerText()).includes(String(byTerm.size)), '页头显示总数')
      g.end()
    }
    {
      const g = R.group('同名术语合并：章链接和章节里写了这个术语的章一致，链接指向存在的章')
      for (const r of rows) {
        const want = byTerm.get(r.term).map(f => `/chapters/${f}`)
        const got = r.links.map(h => h.replace(/^.*(\/chapters\/[\w-]+?)(\.html)?$/, '$1'))
        g.ok(JSON.stringify(got) === JSON.stringify(want), `${r.term}：${got} ≠ ${want}`)
      }
      const multi = [...byTerm.entries()].filter(([, v]) => v.length > 1).map(([k]) => k)
      g.ok(multi.length > 0 && multi.every(t => rows.find(r => r.term === t).links.length > 1), '多章出现的术语只有一条，且链接列出全部章：' + multi)
      g.end()
    }
    {
      const g = R.group('点条目里的章链接：进入这一章')
      const first = rows.find(r => r.term === 'ref')
      const row = p.locator('.gl-row[data-term="ref"]')
      await row.locator('.gl-src a').first().click()
      await p.waitForURL(/03-refs/)
      await p.waitForSelector('.vp-doc .ch-meta')
      g.ok(p.url().includes(first.links[0].replace(/^.*(\/chapters\/[\w-]+).*$/, '$1')), '跳到 ' + p.url())
      g.ok((await p.locator('.vp-doc h1').innerText()).includes('响应式'), '标题是第 3 章')
      g.end()
    }

    // ---------- 3. 搜索 ----------
    {
      const g = R.group('搜索过滤：按术语、按解释；清空恢复；没有结果有提示')
      await p.goto(base + '/glossary.html'); await p.waitForSelector('.glossary .gl-row'); await p.waitForTimeout(300)
      const total = await p.locator('.gl-row').count()
      await p.fill('.gl-search', '挂载')
      const n1 = await p.locator('.gl-row').count()
      g.ok(n1 > 0 && n1 < total, `搜“挂载”：${n1} 条`)
      g.ok(await p.locator('.gl-row').evaluateAll(es => es.every(e => /挂载/.test(e.innerText))), '结果都含“挂载”')
      g.ok(await p.locator('.gl-row[data-term="挂载"]').count() === 1, '术语“挂载”在结果里')
      g.ok(new RegExp(`${n1} / ${total}`).test(await p.locator('.gl-count').innerText()), '计数：' + await p.locator('.gl-count').innerText())
      await p.fill('.gl-search', 'PROXY')
      g.ok(await p.locator('.gl-row').count() > 0, '搜解释里的词，不分大小写')
      await p.fill('.gl-search', 'zzzz不存在')
      g.ok(await p.locator('.gl-row').count() === 0 && await p.locator('.gl-empty').count() === 1, '没有结果：显示提示')
      await p.fill('.gl-search', '')
      g.ok(await p.locator('.gl-row').count() === total && await p.locator('.gl-empty').count() === 0, '清空后恢复全部')
      g.ok(p.errs.length === 0, '没有控制台报错 ' + p.errs.slice(0, 2))
      g.end()
    }

    // ---------- 4. 侧边栏 ----------
    {
      const g = R.group('侧边栏顶部：今日复习、术语表、速查表；术语表页高亮；其他页也有入口')
      await p.goto(base + '/glossary.html'); await p.waitForSelector('.VPSidebar')
      const top = await p.locator('.VPSidebar .VPSidebarItem.level-0').first().locator('a').allInnerTexts()
      g.ok(top.join('|') === '今日复习|术语表|速查表', '顶部入口：' + top)
      g.ok(await p.locator('.VPSidebar .is-active > .item .text').first().innerText() === '术语表', '术语表页：当前项是术语表')
      await p.goto(base + '/chapters/03-refs.html'); await p.waitForSelector('.VPSidebar')
      g.ok(await p.locator('.VPSidebar a[href$="/glossary.html"], .VPSidebar a[href$="/glossary"]').count() === 1, '章页的侧边栏也有术语表入口')
      const nav = await p.locator('.VPNavBar .VPNavBarMenuLink').count()
      g.ok(nav === 0, '顶栏没有“首页”“课程”导航项')
      g.ok(await p.locator('.VPNavBarTitle a').first().getAttribute('href').then(h => /\/(index\.html)?$/.test(h) || h === '/'), '站名链接回首页')
      g.end()
    }

    // ---------- 5. 手机宽度 ----------
    {
      const g = R.group('390px 宽：术语表页、标了术语的章页没有横向滚动')
      const m = await newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true })
      for (const u of ['/glossary.html', '/chapters/03-refs.html', '/chapters/05-comm.html', '/']) {
        await m.goto(base + u); await m.waitForSelector('.vp-doc h1, .home h1'); await m.waitForTimeout(500)
        const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        g.ok(over <= 0, `${u} 横向溢出 ${over}px`)
      }
      await m.goto(base + '/glossary.html'); await m.waitForSelector('.gl-row')
      g.ok(await m.locator('.gl-row').first().isVisible() && await m.locator('.gl-row .gl-def').first().isVisible(), '手机上条目可见')
      g.end()
    }

    // ---------- 6. 术语标注 ----------
    const SKIP_SEL = 'code, pre, a, h1, h2, h3, h4, h5, h6, summary, .terms, .goal, .analogy, .selfcheck, .sc, .q, .lab, .ex, .warmup, .selfx, .chapter-foot, .ch-meta, figure'
    {
      const g = R.group('术语标注：只标已学过的术语；每小节每个术语一次；不标代码、标题、链接、术语块、目标、类比、自测、实验台、练习')
      let total = 0
      for (const c of ['03-refs', '05-comm', '16-diff']) {
        const q = await newPage()
        await q.goto(base + `/chapters/${c}.html`)
        await q.waitForSelector('.vp-doc h1'); await q.waitForSelector('.vp-doc abbr.term', { timeout: 8000 }).catch(() => {})
        await q.waitForTimeout(600)
        const info = await q.evaluate(([skip]) => {
          const out = { n: 0, bad: [], dup: [], terms: [] }
          const seen = new Set()
          for (const el of document.querySelectorAll('.vp-doc h2, .vp-doc h3, .vp-doc abbr.term')) {
            if (/^H[23]$/.test(el.tagName)) { seen.clear(); continue }
            out.n++
            out.terms.push(el.dataset.term)
            if (el.parentElement.closest(skip)) out.bad.push(el.dataset.term + ' 在 ' + el.parentElement.closest(skip).tagName)
            if (seen.has(el.dataset.term)) out.dup.push(el.dataset.term)
            seen.add(el.dataset.term)
            if (el.querySelector('abbr') || el.parentElement.closest('abbr')) out.bad.push('嵌套 ' + el.dataset.term)
          }
          return out
        }, [SKIP_SEL])
        total += info.n
        const cn = firstChapterNo[c]
        g.ok(info.n > 0, `${c} 有标注`)
        g.ok(info.bad.length === 0, `${c} 标注位置不对：${info.bad.slice(0, 3)}`)
        g.ok(info.dup.length === 0, `${c} 同一小节重复标注：${info.dup.slice(0, 3)}`)
        g.ok(info.terms.every(t => byTerm.get(t) && Math.min(...byTerm.get(t).map(f => firstChapterNo[f])) <= cn), `${c} 标了还没学到的术语：${info.terms.filter(t => !(byTerm.get(t) && Math.min(...byTerm.get(t).map(f => firstChapterNo[f])) <= cn)).slice(0, 3)}`)
        g.ok(q.errs.length === 0, `${c} 没有控制台报错 ${q.errs.slice(0, 2)}`)
      }
      g.ok(total > 0, '共标注 ' + total + ' 处')
      g.end()
    }
    {
      // 复合词里的子串不标：对每一章，每个标注（abbr.term）的前后相邻文字不能和它一起组成另一个更长的已知术语
      // （已知术语 = 术语表全部术语 + 首页写作规则表里的术语）。例：第 2 到 7 章里的“自定义指令”不能把里面的“指令”标出来
      const g = R.group('术语标注：不标复合词里的子串（每章的每个标注都不是更长已知术语的一部分）')
      const known = [...new Set([...rows.map(r => r.term), ...WRITING_TERMS.flatMap(w => w.terms)])]
      const q = await newPage()
      let marked = 0, compoundTexts = 0
      const chapterFiles = [...chapters.map(c => c.file)]
      for (const c of chapterFiles) {
        await q.goto(base + `/chapters/${c}.html`)
        await q.waitForSelector('.vp-doc h1'); await q.waitForTimeout(500)
        const r = await q.evaluate(known => {
          const bad = []
          let n = 0, compounds = 0
          for (const ab of document.querySelectorAll('.vp-doc abbr.term')) {
            n++
            // 同一个文字节点前后的文字（标注把节点拆开了，所以取父元素的整段文字，按 abbr 在其中的位置切）
            const parent = ab.parentElement
            let before = '', after = '', seenSelf = false
            for (const node of parent.childNodes) {
              if (node === ab) { seenSelf = true; continue }
              if (seenSelf) after += node.textContent; else before += node.textContent
            }
            const t = ab.textContent
            for (const k of known) {
              if (k.length <= t.length || !k.includes(t)) continue
              for (let at = k.indexOf(t); at >= 0; at = k.indexOf(t, at + 1)) {
                if (before.endsWith(k.slice(0, at)) && after.startsWith(k.slice(at + t.length))) bad.push(`“${t}”在“${k}”里`)
              }
            }
          }
          // 页面上确实出现了复合词的文字（用来证明这个检查不是空转）
          const text = document.querySelector('.vp-doc')?.textContent || ''
          for (const k of known) if (text.includes(k)) compounds++
          return { n, bad, compounds }
        }, known)
        marked += r.n; compoundTexts += r.compounds
        g.ok(r.bad.length === 0, `${c} 标了复合词里的子串：${r.bad.slice(0, 3)}`)
      }
      g.ok(marked > 100, `共检查了 ${marked} 处标注`)
      g.ok(compoundTexts > 0, '页面里确实出现了已知术语的文字（这个检查不是空转）')
      g.end()
    }
    {
      const g = R.group('术语表页“不这样说”一栏：来自首页写作规则表（course/writing-terms.mjs），只有同名术语才有内容')
      const p3 = await newPage()
      await p3.goto(base + '/glossary.html'); await p3.waitForSelector('.glossary .gl-row'); await p3.waitForTimeout(300)
      const heads = await p3.locator('.gl-table thead th').allInnerTexts()
      g.ok(heads.join('|') === '术语|含义|不这样说|出自', '表头：' + heads)
      const avoids = await p3.$$eval('.glossary .gl-row', es => Object.fromEntries(es.map(e => [e.dataset.term, e.querySelector('.gl-avoid').textContent.trim()])))
      const expected = {}
      for (const w of WRITING_TERMS) for (const t of w.terms) if (byTerm.has(t)) expected[t] = w.avoid
      g.ok(Object.keys(expected).length >= 8, '写作规则表里至少有 8 个术语在术语表里：' + Object.keys(expected).length)
      for (const [t, a] of Object.entries(expected)) g.ok(avoids[t] === a, `“${t}”的不这样说：${avoids[t]}`)
      const others = Object.entries(avoids).filter(([t]) => !(t in expected)).filter(([, a]) => a !== '')
      g.ok(others.length === 0, '没有写作规则的术语，这一栏是空的：' + others.slice(0, 3).map(x => x[0]))
      // 首页的表和数据文件一致
      await p3.goto(base + '/'); await p3.waitForSelector('.home')
      await p3.evaluate(() => { document.querySelector('details.ste').open = true })
      const homeRows = await p3.$$eval('details.ste table tr', es => es.slice(1).map(e => [...e.children].map(c => c.textContent.trim())))
      g.ok(JSON.stringify(homeRows) === JSON.stringify(WRITING_TERMS.map(w => [w.label, w.meaning, w.avoid])), `首页写作规则表 ${homeRows.length} 行与数据文件一致`)
      g.end()
    }
    {
      const g = R.group('术语标注：悬停和聚焦显示定义，Esc 或移开隐藏；速查表和阶段测验页不标')
      const q = await newPage()
      await q.goto(base + '/chapters/03-refs.html'); await q.waitForSelector('.vp-doc abbr.term'); await q.waitForTimeout(500)
      const ab = q.locator('.vp-doc abbr.term').first()
      const term = await ab.getAttribute('data-term')
      g.ok(await q.locator('.term-tip').count() === 0 || !(await q.locator('.term-tip').isVisible()), '没悬停时不显示气泡')
      await ab.scrollIntoViewIfNeeded()
      await ab.hover()
      await q.waitForSelector('.term-tip:not([hidden])', { timeout: 3000 })
      const tip = await q.locator('.term-tip').innerText()
      const row = rows.find(r => r.term === term)
      g.ok(tip.includes(term) && row && tip.includes(row.def.slice(0, 8)), `悬停显示定义：${term} → ${tip.slice(0, 40)}`)
      g.ok(/第 \d+ 章/.test(tip), '气泡里写了出自哪一章')
      const box = await q.locator('.term-tip').boundingBox()
      g.ok(box.x >= 0 && box.x + box.width <= 1280, '气泡在窗口内')
      await q.mouse.move(5, 300)
      await q.waitForTimeout(150)
      g.ok(!(await q.locator('.term-tip').isVisible()), '移开后隐藏')
      await ab.focus()
      g.ok(await q.locator('.term-tip').isVisible(), '聚焦显示')
      await q.keyboard.press('Escape')
      g.ok(!(await q.locator('.term-tip').isVisible()), 'Esc 隐藏')
      // 换页：点侧边栏去另一章，再回来，不叠加
      const c3 = await q.locator('.vp-doc abbr.term').count()
      await q.locator('.VPSidebar a[href*="04-computed"]').click(); await q.waitForURL(/04-computed/); await q.waitForTimeout(700)
      g.ok(await q.locator('.vp-doc abbr.term abbr').count() === 0, '换页后没有嵌套标注')
      await q.locator('.VPSidebar a[href*="03-refs"]').click(); await q.waitForURL(/03-refs/); await q.waitForTimeout(700)
      g.ok(await q.locator('.vp-doc abbr.term').count() === c3 && await q.locator('.vp-doc abbr.term abbr').count() === 0, `回到本章标注数不变（${c3}）`)
      await q.goto(base + '/chapters/cheat.html'); await q.waitForSelector('.vp-doc h1'); await q.waitForTimeout(500)
      g.ok(await q.locator('.vp-doc abbr.term').count() === 0, '速查表不标注')
      await q.goto(base + '/check/1.html'); await q.waitForSelector('.vp-doc h1'); await q.waitForTimeout(500)
      g.ok(await q.locator('.vp-doc abbr.term').count() === 0, '阶段测验页不标注')
      g.ok(q.errs.length === 0, '没有控制台报错 ' + q.errs.slice(0, 2))
      g.end()
    }
    {
      const g = R.group('术语标注：触屏点一下显示，点别处隐藏')
      const m = await newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true })
      await m.goto(base + '/chapters/03-refs.html'); await m.waitForSelector('.vp-doc abbr.term'); await m.waitForTimeout(500)
      const ab = m.locator('.vp-doc abbr.term').first()
      await ab.scrollIntoViewIfNeeded()
      await ab.tap()
      await m.waitForSelector('.term-tip:not([hidden])', { timeout: 3000 })
      const box = await m.locator('.term-tip').boundingBox()
      g.ok(box.x >= 0 && box.x + box.width <= 390, '手机上气泡在窗口内：' + JSON.stringify(box))
      await m.tap('.vp-doc h1')
      await m.waitForTimeout(150)
      g.ok(!(await m.locator('.term-tip').isVisible()), '点别处隐藏')
      g.end()
    }
  } catch (e) {
    R.log(false, '测试异常：' + e.stack)
  } finally {
    await browser.close()
    pv.stop()
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true })
  }
  console.log(R.bad ? `\n${R.bad} 项没通过` : '\n全部通过')
  process.exit(R.bad ? 1 : 0)
})()
