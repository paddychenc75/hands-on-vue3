// 跨设备同步的浏览器测试。全部用 Playwright 的 route 拦截 api.github.com，接一个内存里的假 Gist 服务（_fakegithub.mjs）：
// 不发任何真实请求，不用真实令牌（令牌是带标记的假字符串，全程搜索它有没有泄露）；没接假服务的浏览器上下文里，发往 github 的请求一律被中止并记下来。
// 两个浏览器上下文模拟两台设备。覆盖：未开启时不加载同步 chunk、不发请求；面板里的三步指引和令牌创建链接；开启、首次推送、另一台设备拉取合并；
// 离线各学后合并；同一张复习卡取较新；两台设备写了不同的笔记（另一份留在“另一台设备的版本”）；
// 401 / 403 限速 / 404 / 云端内容损坏 / schema 太新 / 断网恢复的提示和行为（失败后本地进度不变）；多标签页只有一个负责推送；
// 令牌不出现在 DOM、日志、URL、Referer、导出文件、Gist 内容、断开后的 localStorage；导出导入；恢复备份；断开同步。
// 用法：node tests/site/sync.test.js     （用 course/.vitepress/dist，要先 npm run build；或 COURSE_OUT_DIR=<已构建目录>）
// 截图：设了 SYNC_SHOTS=<目录> 才保存（每个状态浅色、深色各一张）。
const { makeReporter, startSite, loadChapters, STORE_KEY } = require('./helpers')
const fs = require('fs')
const os = require('os')
const path = require('path')

const R = makeReporter()
const CH = loadChapters().filter(c => c.stage != null && !c.optional && c.scAnswers.length > 0)
const TOKEN = 'ghp_ZZTESTMARKERTOKEN0123456789abcdef'
const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=hands-on-vue3-sync'
const TUNE = { debounce: 250, maxWait: 500, pullAfter: 0, initialDelay: 100, backoff: 150 }
const SHOTS = process.env.SYNC_SHOTS
const FILE = 'hands-on-vue3-progress.json'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const until = async (fn, ms = 8000, step = 100) => {
  const t = Date.now()
  while (Date.now() - t < ms) {
    try {
      const v = await fn()
      if (v) return v
    } catch (e) { /* 页面正在跳转，再试 */ }
    await sleep(step)
  }
  return false
}
const ok = (c, msg, extra) => R.log(!!c, msg + (!c && extra !== undefined ? ' → ' + extra : ''))
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k2 => [k2, x[k2]])) : x))

;(async () => {
  const { fakeGitHub } = await import('./_fakegithub.mjs')
  const site = await startSite()
  const base = site.base
  const all = { blocked: [] } // 没接假服务的上下文里被中止的 github 请求（正常应该一个都没有）

  /** 一台“设备”：独立的浏览器上下文，记录请求、控制台、页面错误 */
  async function device(gh, { viewport = { width: 1440, height: 900 }, tune = TUNE, colorScheme = 'light' } = {}) {
    const ctx = await site.browser.newContext({ viewport, colorScheme, acceptDownloads: true })
    await ctx.addInitScript(t => { if (t) window.__hovSyncTest = t }, tune)
    if (gh) await gh.install(ctx)
    else await ctx.route(/^https:\/\/(api\.github\.com|gist\.githubusercontent\.com|gist\.github\.com)\//, route => { all.blocked.push(route.request().url()); route.abort() })
    const d = { ctx, errs: [], logs: [], reqs: [] }
    ctx.on('page', p => {
      p.on('console', m => d.logs.push(m.text()))
      p.on('pageerror', e => d.errs.push(e.message))
      p.on('request', r => d.reqs.push({ url: r.url(), headers: r.headers() }))
    })
    d.page = await ctx.newPage()
    return d
  }
  const prog = p => p.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), STORE_KEY)
  const doneIds = async p => Object.entries(await prog(p)).filter(([k, v]) => !k.startsWith('__') && v && v.done).map(([k]) => k).sort()
  const cards = async p => (await prog(p)).__srs || {}
  const ids = CH.slice(0, 8).map(c => c.id)
  const chap = id => CH.find(c => c.id === id)
  const url = c => base + c.link + '.html'

  /** 学一章：先把这章标为完成（写进本机进度），再在章页里答对第 1 道自测——真实的保存路径，会写 sc、tried、first 和一张复习卡 */
  async function learn(p, id) {
    const c = chap(id)
    if (!p.url().startsWith(site.origin)) await p.goto(base + '/roadmap.html') // 先到站内页，才能读写这个站的 localStorage
    await p.evaluate(([k, cid]) => {
      const d = JSON.parse(localStorage.getItem(k) || '{}')
      const cur = d[cid] || { sc: {}, ex: {}, done: false }
      cur.done = true
      cur.doneAt = cur.doneAt || Date.now()
      d[cid] = cur
      localStorage.setItem(k, JSON.stringify(d))
    }, [STORE_KEY, id])
    await p.goto(url(c))
    await p.waitForSelector('.chapter-foot')
    await p.waitForTimeout(300)
    const box = p.locator('.vp-doc .sc:not(.predict)').nth(0)
    await box.locator('.sc-o').nth(c.scAnswers[0]).click()
    await box.locator('.sc-o.right').waitFor()
  }
  async function openPanel(p) {
    await p.goto(base + '/roadmap.html#sync')
    await p.waitForSelector('#sync-token, .sync-status', { timeout: 20000 })
  }
  async function enable(p, token = TOKEN) {
    await openPanel(p)
    await p.fill('#sync-token', token)
    await p.click('button:has-text("开启同步")')
    await p.waitForSelector('.sync-result .sync-msg', { timeout: 20000 })
    return p.textContent('.sync-result .sync-msg')
  }
  /** 超出窗口右边的元素（排查横向滚动用） */
  const overflowers = p => p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && e.getBoundingClientRect().width > 0).slice(0, 5).map(e => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right)))
  const foreground = async p => {
    await p.bringToFront()
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  }
  const syncStatus = p => p.evaluate(k => localStorage.getItem(k + ':sync-status') || '', STORE_KEY)
  const syncOf = p => p.getAttribute('.sync-badge', 'data-state').catch(() => null)
  /** 截图：当前主题一张，再切到深色一张（SYNC_SHOTS 没设就什么也不做） */
  async function shot(p, name, opts = {}) {
    if (!SHOTS) return
    fs.mkdirSync(SHOTS, { recursive: true })
    const w = p.viewportSize().width
    const set = async dark => {
      await p.evaluate(d => { document.documentElement.classList.toggle('dark', d) }, dark)
      await p.waitForTimeout(150)
      await p.screenshot({ path: path.join(SHOTS, `${name}-${w >= 1000 ? '1440' : '390'}-${dark ? 'dark' : 'light'}.png`), ...opts })
    }
    await set(false)
    await set(true)
    await set(false)
  }
  async function scrollTo(p, sel) {
    await p.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80) }, sel)
    await p.waitForTimeout(150)
  }

  try {
    /* =============== 0. 没开启同步：不加载同步代码、不发 github 请求；面板里的指引 =============== */
    {
      const d = await device(null)
      await d.page.goto(base + '/roadmap.html')
      await d.page.waitForSelector('.roadmap')
      await d.page.waitForTimeout(1500)
      await learn(d.page, ids[0])
      await d.page.goto(base + '/roadmap.html')
      await d.page.waitForSelector('#sync')
      await d.page.waitForTimeout(1500)
      const urls = d.reqs.map(r => r.url)
      ok(!urls.some(u => /github\.com|githubusercontent\.com/.test(u)), '未开启同步：不发任何到 github.com 的请求')
      ok(!urls.some(u => /syncEngine|syncFormat/.test(u)), '未开启同步：不加载同步引擎 chunk')
      ok(!urls.some(u => /SyncPanelBody/.test(u)), '面板收起时不加载面板内容的 chunk')
      ok(!urls.some(u => /SyncBadgeBody/.test(u)), '未开启同步：不加载顶栏标记的 chunk')
      ok((await d.page.locator('.sync-badge').count()) === 0, '未开启同步：顶栏不显示同步标记')
      ok(await d.page.evaluate(() => !document.querySelector('#sync').open), '“跨设备同步”面板默认收起')
      ok(/未开启 · 可选/.test(await d.page.textContent('#sync > summary')), '收起时的摘要写着“未开启 · 可选”')
      const l = (await prog(d.page))[ids[0]]
      ok(l && l.done && l.ts === undefined && Object.keys(l.ex).length === 0, '没开启同步时进度照常保存；没改过代码草稿或笔记，就没有多余的时间戳字段', JSON.stringify(l))
      ok(!(await d.page.evaluate(() => Object.keys(localStorage).some(k => /:sync|:backup/.test(k)))), '没开启同步：localStorage 里没有同步用的键')
      await shot(d.page, 'sync-panel-closed')
      await scrollTo(d.page, '#sync-title')
      await shot(d.page, 'sync-panel-closed-in-page')
      await d.page.click('#sync > summary')
      await d.page.waitForSelector('#sync-token')
      ok(d.reqs.some(r => /SyncPanelBody/.test(r.url)) && !d.reqs.some(r => /syncEngine/.test(r.url)), '展开面板只加载面板内容，仍不加载同步引擎')
      ok(!d.reqs.some(r => /github\.com/.test(r.url)), '展开面板也不发 github 请求')
      ok((await d.page.getAttribute('#sync-token', 'type')) === 'password' && (await d.page.getAttribute('#sync-token', 'autocomplete')) === 'off', '令牌输入框是 type=password、autocomplete=off')
      ok(await d.page.evaluate(() => !!document.querySelector('label[for="sync-token"]')), '令牌输入框有 label')
      ok(await d.page.evaluate(() => !!document.querySelector('.sync-result[aria-live="polite"]')), '结果区 aria-live=polite')
      // 三步指引
      const steps = await d.page.locator('.sync-steps li').allTextContents()
      ok(steps.length === 3, '展开后是三步指引', String(steps.length))
      ok(/创建令牌/.test(steps[0]) && /新标签页/.test(steps[0]), '第 1 步：点“创建令牌”链接，新标签页打开', steps[0])
      ok(/Generate token/.test(steps[1]) && /ghp_/.test(steps[1]) && /只显示一次/.test(steps[1]), '第 2 步：最下面点 Generate token，复制 ghp_ 开头的字符，只显示一次', steps[1])
      ok(/粘贴/.test(steps[2]) && /开启同步/.test(steps[2]) && /先检查令牌能不能用/.test(steps[2]) && /第一次同步/.test(steps[2]), '第 3 步：粘贴、点“开启同步”，先检查令牌再做第一次同步', steps[2])
      const link = d.page.locator('.sync-steps a')
      const href = await link.getAttribute('href')
      ok(href === TOKEN_URL, '“创建令牌”链接指向经典令牌创建页，权限预填 scopes=gist、名称含 hands-on-vue3', href)
      const u = new URL(href)
      ok(u.host === 'github.com' && u.searchParams.get('scopes') === 'gist' && /hands-on-vue3/.test(u.searchParams.get('description')), '链接的 scopes 和 description 参数正确')
      ok((await link.getAttribute('target')) === '_blank' && (await link.getAttribute('rel')) === 'noopener noreferrer', '链接在新标签页打开，rel=noopener noreferrer')
      const notes = await d.page.locator('.sync-notes').textContent()
      ok(/只勾 gist 权限，别的都不要勾/.test(notes) && /碰不到你的代码仓库/.test(notes), '说明：只勾 gist 权限，令牌泄露也碰不到代码仓库')
      ok(/过期/.test(notes) && /默认 30 天/.test(notes) && /同步会停/.test(notes) && /不过期/.test(notes), '说明：过期时间默认 30 天，过期后同步会停，可以选更长或不过期')
      ok(/在另一台设备上/.test(notes) && /重复第 3 步/.test(notes) && /同一个 GitHub 账号/.test(notes) && /hands-on-vue3-progress\.json/.test(notes) && /手动填 Gist/.test(notes), '说明：另一台设备重复第 3 步，同一账号，怎样找到同一份 Gist')
      ok(/Gists/.test(await d.page.textContent('.sync-fine')) && (await d.page.locator('.sync-fine a').getAttribute('href')).includes('gists=write'), '备选的细粒度令牌：写明官方权限表里有 Gists（只有写入），链接预填 gists=write')
      ok(/只给它 gist 权限/.test(await d.page.textContent('.sync-safe')) && /末四位|只存在这台设备/.test(await d.page.textContent('.sync-safe')), '安全说明：令牌只存在本机、只给 gist 权限')
      ok(!(await d.page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), '1440 宽度没有横向滚动')
      await scrollTo(d.page, '#sync')
      await shot(d.page, 'sync-panel-open-guide')
      await d.ctx.close()
    }
    // 手机宽度：展开后的指引
    {
      const d = await device(null, { viewport: { width: 390, height: 844 } })
      await d.page.goto(base + '/roadmap.html#sync')
      await d.page.waitForSelector('#sync-token')
      ok(!(await d.page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), '390px：展开的面板没有横向滚动')
      await scrollTo(d.page, '#sync')
      await shot(d.page, 'sync-panel-open-guide')
      await d.page.evaluate(() => document.querySelector('#sync').open = false)
      await shot(d.page, 'sync-panel-closed')
      await d.ctx.close()
    }

    /* =============== 1. 两台设备 A、B：开启、首次推送、拉取合并 =============== */
    const gh = fakeGitHub()
    gh.st.valid.add(TOKEN)
    const A = await device(gh)
    const B = await device(gh, { colorScheme: 'dark' })
    {
      await learn(A.page, ids[0])
      const aBefore = await prog(A.page)
      const msgA = await enable(A.page)
      ok(/已开启/.test(msgA) && /上传/.test(msgA), 'A 开启同步：创建私密 Gist 并上传本机进度', msgA)
      const g = gh.gist()
      ok(g && !g.description.includes(TOKEN) && /动手学 Vue 3 学习进度/.test(g.description), 'Gist 描述固定且不含令牌')
      const remote = gh.remote(FILE)
      ok(remote && remote.schema === 1 && remote.app === 'hands-on-vue3' && typeof remote.updatedAt === 'number' && /^[0-9a-f]{8}$/.test(remote.device), '云端文件带 schema、app、updatedAt、随机设备标识')
      ok(remote && remote.progress[ids[0]]?.done === true, '云端文件里有 A 的第 1 章进度')
      ok(JSON.stringify(remote).indexOf('ZZTESTMARKER') < 0, '云端文件（Gist 内容）里没有令牌')
      ok(gh.st.log.filter(r => r.method === 'POST').length === 1, '只创建了一个 Gist')
      ok(gh.st.log.every(r => r.method === 'OPTIONS' || r.host === 'api.github.com'), '所有请求都发往 api.github.com')
      ok(gh.st.log.filter(r => r.host === 'api.github.com').every(r => r.referer === undefined), '请求不带 Referer（referrerPolicy: no-referrer）')
      ok(gh.st.log.filter(r => r.auth).every(r => r.auth === 'Bearer ' + TOKEN && r.host === 'api.github.com'), '令牌只出现在发往 api.github.com 的 Authorization 头里')
      ok(gh.st.log.every(r => !r.url.includes('ZZTESTMARKER')), '请求地址里没有令牌')
      const aAfter = await prog(A.page)
      ok(aAfter[ids[0]].done && canon(aAfter.__srs) === canon(aBefore.__srs), 'A 开启同步后本机进度没有变')
      const status = await A.page.textContent('.sync-status')
      ok(/已同步/.test(status) && /tester/.test(status) && /…cdef/.test(status) && !status.includes('ghp_'), '状态区显示账号名和令牌末四位，不显示令牌', status)
      ok(/gist\.github\.com\/tester\//.test((await A.page.getAttribute('.sync-on a[href*="gist.github.com"]', 'href')) || ''), '状态区有 Gist 链接')
      ok(!(await A.page.evaluate(t => document.documentElement.outerHTML.includes(t) || document.body.innerText.includes(t) || [...document.querySelectorAll('input')].some(i => i.value.includes(t)), TOKEN)), '开启后页面 DOM、页面文字和输入框的值里没有令牌')
      ok((await A.page.inputValue('#sync-token').catch(() => '')) === '', '开启后令牌输入框已清空')
      ok((await syncOf(A.page)) === 'synced', '顶栏同步标记显示“已同步”')
      ok(/已开启 · 已同步/.test(await A.page.textContent('#sync > summary')), '收起时的摘要写着“已开启 · 已同步”')
      await scrollTo(A.page, '#sync')
      await shot(A.page, 'sync-panel-on')
      await A.page.evaluate(() => window.scrollTo(0, 0))
      await shot(A.page, 'sync-badge', { clip: { x: 760, y: 0, width: 680, height: 64 } })
      await A.page.click('.sync-btn')
      await A.page.waitForSelector('#sync-pop')
      const pop = await A.page.textContent('#sync-pop')
      ok(/上次同步/.test(pop) && /立即同步/.test(pop) && /同步设置/.test(pop), '点击标记显示“上次同步”“立即同步”和“同步设置”')
      await shot(A.page, 'sync-badge-popover', { clip: { x: 1040, y: 0, width: 400, height: 220 } })
      await A.page.keyboard.press('Escape')
      ok((await A.page.locator('#sync-pop').count()) === 0, 'Esc 关闭弹层')
      // “同步设置”：在课程地图页面板收起时点它，面板展开；在别的页面点它，跳到课程地图并展开
      await A.page.goto(base + '/roadmap.html')
      await A.page.waitForSelector('.sync-badge')
      await A.page.evaluate(() => { document.querySelector('#sync').open = false })
      await A.page.click('.sync-btn')
      await A.page.click('#sync-pop a:has-text("同步设置")')
      ok(await until(() => A.page.evaluate(() => document.querySelector('#sync').open)), '在课程地图页点“同步设置”：面板展开')
      await A.page.goto(url(chap(ids[0])))
      await A.page.waitForSelector('.sync-badge')
      await A.page.click('.sync-btn')
      await A.page.click('#sync-pop a:has-text("同步设置")')
      await A.page.waitForURL(/roadmap.*#sync/)
      ok(await until(() => A.page.evaluate(() => document.querySelector('#sync')?.open)), '在章页点“同步设置”：跳到课程地图并展开面板')

      // B 开启同步，看到第 1 章
      const msgB = await enable(B.page)
      ok(/已开启/.test(msgB) && /合并了 1 章/.test(msgB), 'B 开启同步：找到已有的 Gist 并合并了 1 章', msgB)
      ok(gh.st.log.filter(r => r.method === 'POST').length === 1, 'B 没有再创建新的 Gist（先列出账号的 gist 查找同名文件）')
      ok((await doneIds(B.page)).join() === ids[0], 'B 开启同步后第 1 章已完成')
      ok((await cards(B.page))[ids[0] + '#0'], 'B 也有了第 1 章自测的复习卡片')
      await scrollTo(B.page, '#sync')
      ok((await B.page.locator('.sync-backups li').count()) === 1, '合并改动了本机进度之前留了一份备份，面板里可以看到')
      await B.page.goto(base + '/roadmap.html')
      await B.page.waitForSelector('.np-txt')
      ok(/已完成 1\//.test(await B.page.textContent('.np-txt')), 'B 的顶栏进度更新为已完成 1 章', await B.page.textContent('.np-txt'))

      // B 学第 2 章 → 防抖后自动推送 → A 回到前台后两章都完成
      const w0 = gh.writes().length
      await learn(B.page, ids[1])
      ok(await until(() => gh.remote(FILE)?.progress[ids[1]]?.done === true), 'B 学完第 2 章后几秒内自动推送到云端')
      const burst = gh.writes().length - w0
      ok(burst >= 1 && burst <= 3, '多次改动被防抖合并，没有逐次推送', String(burst))
      await A.page.goto(base + '/roadmap.html')
      await foreground(A.page)
      ok(await until(async () => (await doneIds(A.page)).join() === [ids[0], ids[1]].sort().join()), 'A 回到前台后拉取并合并，两章都完成')
      ok(await until(async () => /已完成 2\//.test(await A.page.textContent('.np-txt'))), 'A 的顶栏进度随之更新')
      const n304 = gh.st.n304
      await foreground(A.page)
      await sleep(800)
      ok(gh.st.n304 > n304, '远端没变时用 If-None-Match 得到 304，不重复下载')
      ok(gh.st.log.some(r => r.ifNoneMatch), '请求带 If-None-Match')
      // 只读一章（只改阅读位置）不触发推送
      const w1 = gh.writes().length
      await A.page.goto(url(chap(ids[5])))
      await A.page.waitForSelector('.chapter-foot')
      await sleep(1800)
      ok((await prog(A.page)).__last?.path === chap(ids[5]).link, '读一章会记下阅读位置')
      ok(gh.writes().length === w1, '只改阅读位置（读一章）不触发推送')
      // 弹层上的“进度已从另一台设备更新”
      await shot(A.page, 'sync-chapter-page', { clip: { x: 0, y: 0, width: 1440, height: 400 } })
    }

    /* =============== 2. 多标签页：只有一个标签页负责推送；别的标签页的改动合并进来 =============== */
    {
      const A2 = await A.ctx.newPage()
      A2.on('pageerror', e => A.errs.push(e.message))
      await A2.goto(base + '/roadmap.html')
      await sleep(800)
      await A.page.bringToFront()
      const w0 = gh.writes().length
      await learn(A2, ids[2])
      const pushed2 = await until(() => gh.remote(FILE)?.progress[ids[2]]?.done === true)
      ok(pushed2, '多标签页：另一个标签页学的内容推送到了云端')
      await sleep(1200)
      const w = gh.writes().length - w0
      ok(w >= 1 && w <= 3, '多标签页：没有两个标签页同时推送（写入次数合理）', String(w))
      ok(await until(async () => (await doneIds(A.page)).includes(ids[2])), '第一个标签页的本机进度里也有了这一章')
      await A.page.goto(base + '/roadmap.html')
      ok(await until(async () => /已完成 3\//.test(await A.page.textContent('.np-txt'))), '第一个标签页的界面随之更新（已完成 3 章）')
      await A2.close()
    }

    /* =============== 3. 离线各学一章、同一张卡两边都复习、两边都写了笔记：上线后合并 =============== */
    {
      const gh2 = fakeGitHub()
      gh2.st.valid.add(TOKEN)
      const X = await device(gh2)
      const Y = await device(gh2)
      await learn(X.page, ids[0])
      await enable(X.page)
      await enable(Y.page)
      ok((await doneIds(Y.page)).join() === ids[0], '（第二组设备）Y 已有第 1 章')
      gh2.st.mode = 'offline'
      await learn(X.page, ids[1])
      await learn(Y.page, ids[2])
      // 同一张卡两边都复习过：Y 的更新、box 更高
      const now = Date.now()
      const key = ids[0] + '#0'
      await X.page.evaluate(([k, c, t]) => { const p = JSON.parse(localStorage.getItem(k)); p.__srs[c] = { box: 1, n: 2, due: t + 864e5, last: t - 5000 }; localStorage.setItem(k, JSON.stringify(p)) }, [STORE_KEY, key, now])
      await Y.page.evaluate(([k, c, t]) => { const p = JSON.parse(localStorage.getItem(k)); p.__srs[c] = { box: 4, n: 5, due: t + 16 * 864e5, last: t }; localStorage.setItem(k, JSON.stringify(p)) }, [STORE_KEY, key, now])
      // 两边对第 1 章各写一份自我解释笔记（真实输入框；Y 写得晚）
      const noteX = 'X 设备上写的：ref 是带 .value 的响应式引用，模板里自动解包，脚本里要写 .value。'
      const noteY = 'Y 设备上写的：reactive 代理对象，解构会丢响应性，所以要用 toRefs 或者直接写 ref。'
      await X.page.goto(url(chap(ids[0])))
      await X.page.fill('#sx-' + ids[0], noteX)
      await sleep(300)
      await Y.page.goto(url(chap(ids[0])))
      await Y.page.fill('#sx-' + ids[0], noteY)
      await sleep(1500)
      ok(/pending/.test(await syncStatus(X.page)), '离线时状态是“有未同步的更改”')
      const noteTs = (await prog(Y.page))[ids[0]].ts
      ok(noteTs && typeof noteTs.note === 'number', '写笔记时存储层盖了改动时间戳 ts.note（没有开同步的存储层也会盖）', JSON.stringify(noteTs))
      gh2.st.mode = 'ok'
      await learn(X.page, ids[3])
      await learn(Y.page, ids[4])
      const want = [ids[0], ids[1], ids[2], ids[3], ids[4]].sort().join()
      await sleep(1500)
      await foreground(X.page)
      await foreground(Y.page)
      await sleep(1500)
      await foreground(X.page)
      ok(await until(async () => (await doneIds(X.page)).join() === want && (await doneIds(Y.page)).join() === want, 20000), '离线各学后上线，最终两边都包含所有章', `${await doneIds(X.page)} | ${await doneIds(Y.page)}`)
      const cx = await cards(X.page)
      const cy = await cards(Y.page)
      ok(canon(cx) === canon(cy), '两边的复习卡片完全一致（并集）')
      ok(cx[ids[2] + '#0'] && cx[ids[1] + '#0'] && cx[ids[4] + '#0'], '复习卡片是并集：每台设备各自的卡都在')
      ok(cx[key].box === 4 && cx[key].n === 5, '同一张卡两边都复习过时保留较新的那条（整条取，不混拼）', JSON.stringify(cx[key]))
      ok(await until(() => canon(gh2.remote(FILE)?.progress.__srs) === canon(cx)), '云端也是合并后的结果')
      const nx = (await prog(X.page))[ids[0]]
      const ny = (await prog(Y.page))[ids[0]]
      ok(nx.note === noteY && ny.note === noteY, '两边写了不同的笔记：较新的一份是正文', `${nx.note} | ${ny.note}`)
      ok(JSON.stringify(nx.noteAlts) === JSON.stringify([noteX]) && JSON.stringify(ny.noteAlts) === JSON.stringify([noteX]), '较旧的那份笔记没有丢，留在 noteAlts')
      await X.page.goto(url(chap(ids[0])))
      await X.page.waitForSelector('.sx-alts')
      ok(/另一台设备的版本/.test(await X.page.textContent('.sx-alts summary')), '自我解释区折叠显示“另一台设备的版本”')
      await X.page.click('.sx-alts summary')
      await scrollTo(X.page, '.selfx')
      await shot(X.page, 'sync-note-alts')
      await X.page.click('.sx-alt button:has-text("用这一版")')
      ok(await until(async () => (await prog(X.page))[ids[0]].note === noteX), '点“用这一版”换成另一台设备的版本')
      await X.ctx.close()
      await Y.ctx.close()
    }

    /* =============== 4. 错误处理（每种失败之后本地进度都不变） =============== */
    {
      const gh3 = fakeGitHub()
      gh3.st.valid.add(TOKEN)
      const E = await device(gh3, { viewport: { width: 390, height: 844 } })
      await learn(E.page, ids[0])
      await openPanel(E.page)
      // 无效令牌：提示、不保存任何配置
      await E.page.fill('#sync-token', 'ghp_ZZTESTMARKERINVALID00000000000000')
      await E.page.click('button:has-text("开启同步")')
      await E.page.waitForSelector('.sync-result .sync-msg.bad')
      const bad = await E.page.textContent('.sync-result .sync-msg')
      ok(/令牌/.test(bad) && !bad.includes('INVALID'), '令牌无效：提示重新创建令牌，且提示里不含令牌', bad)
      ok(!(await E.page.evaluate(() => Object.keys(localStorage).some(k => k.endsWith(':sync')))), '令牌无效时不保存配置')
      await scrollTo(E.page, '.sync-form')
      await shot(E.page, 'sync-error-enable')
      await E.page.fill('#sync-token', 'abc')
      await E.page.click('button:has-text("开启同步")')
      await E.page.waitForSelector('.sync-result .sync-msg.bad')
      ok(/不是 GitHub 令牌/.test(await E.page.textContent('.sync-result')), '格式明显不对：提示这不是令牌')
      // 缺 gist 权限的经典令牌
      gh3.st.scopes = 'repo'
      await E.page.fill('#sync-token', TOKEN)
      await E.page.click('button:has-text("开启同步")')
      await E.page.waitForSelector('.sync-result .sync-msg.bad')
      ok(/没有 gist 权限/.test(await E.page.textContent('.sync-result')), '经典令牌没勾 gist：开启时就提示缺权限')
      ok(!(await E.page.evaluate(() => Object.keys(localStorage).some(k => k.endsWith(':sync')))), '缺权限时不保存配置')
      gh3.st.scopes = 'gist'
      // 正常开启
      await E.page.fill('#sync-token', TOKEN)
      await E.page.click('button:has-text("开启同步")')
      await E.page.waitForSelector('.sync-result .sync-msg.good')
      const base0 = canon(await prog(E.page))
      const badgeIs = s => until(async () => (await syncOf(E.page)) === s, 10000)
      const stText = () => E.page.textContent('.sync-status')

      // 4a. 401
      gh3.st.mode = '401'
      await E.page.click('.sync-actions button:has-text("立即同步")')
      ok(await badgeIs('error'), '401：状态标记变成“出错”')
      ok(/不认这个令牌/.test(await stText()) && /重新创建令牌/.test(await stText()), '401：提示令牌失效或过期，请重新创建令牌', await stText())
      ok(canon(await prog(E.page)) === base0, '401 之后本地进度不变')
      ok((await E.page.locator('#sync-token2').count()) === 1, '401：出现“换一个新令牌”的输入')
      ok((await E.page.locator('.sync-form a[href="' + TOKEN_URL + '"]').count()) === 1, '401：面板里有“重新创建令牌”的同一个链接（scopes=gist）')
      const n401 = gh3.st.log.length
      await sleep(1200)
      ok(gh3.st.log.length === n401, '401：停止自动同步，不再重试')
      await scrollTo(E.page, '.sync-status')
      await shot(E.page, 'sync-error-401')
      await E.page.evaluate(() => window.scrollTo(0, 0))
      await E.page.click('.sync-btn')
      await E.page.waitForSelector('#sync-pop')
      ok((await E.page.locator('#sync-pop a[href="' + TOKEN_URL + '"]').count()) === 1, '401：顶栏弹层里也有“重新创建令牌”的链接')
      await shot(E.page, 'sync-badge-popover-error', { clip: { x: 0, y: 0, width: 390, height: 300 } })
      await E.page.keyboard.press('Escape')
      gh3.st.mode = 'ok'
      await openPanel(E.page)
      await E.page.fill('#sync-token2', TOKEN)
      await E.page.click('button:has-text("保存新令牌")')
      await E.page.waitForSelector('.sync-result .sync-msg.good')
      ok(await badgeIs('synced'), '换了新令牌后恢复同步')

      // 4b. 403 限速：读 x-ratelimit-reset，到点自动再试
      gh3.st.mode = 'rate'
      gh3.st.rateReset = Date.now() + 2500
      await E.page.click('.sync-actions button:has-text("立即同步")')
      ok(await until(async () => /限制了请求次数/.test(await stText()), 5000), '403 限速：提示稍后自动重试', await stText())
      ok(canon(await prog(E.page)) === base0, '限速之后本地进度不变')
      await scrollTo(E.page, '.sync-status')
      await shot(E.page, 'sync-error-rate')
      ok(await until(async () => (await syncOf(E.page)) === 'synced', 12000), '限速到点后自动恢复同步')

      // 4c. 404：Gist 被删
      gh3.st.gists.clear()
      await E.page.click('.sync-actions button:has-text("立即同步")')
      ok(await badgeIs('error'), '404：状态标记变成“出错”')
      ok(/找不到了/.test(await stText()), '404：提示 Gist 被删除', await stText())
      ok(canon(await prog(E.page)) === base0, '404 之后本地进度不变')
      await scrollTo(E.page, '.sync-status')
      await shot(E.page, 'sync-error-404')
      await E.page.click('button:has-text("重新创建云端 Gist")')
      ok(await until(() => gh3.gist() && gh3.remote(FILE)?.progress[ids[0]]?.done, 8000), '404：重新创建后云端有了本机进度')
      ok(await badgeIs('synced'), '重新创建后恢复同步')

      // 4d. 云端内容损坏
      const g = gh3.gist()
      g.files[FILE] = '{"schema":1,"progress":{"x"'
      g.ver++
      await E.page.click('.sync-actions button:has-text("立即同步")')
      ok(await badgeIs('error'), '内容损坏：状态标记变成“出错”')
      ok(/读不懂/.test(await stText()), '内容损坏：提示读不懂且没有覆盖', await stText())
      ok(gh3.gist().files[FILE] === '{"schema":1,"progress":{"x"', '内容损坏：没有覆盖云端原文件')
      ok(Object.keys(gh3.gist().files).some(n => /backup/.test(n)), '内容损坏：在 Gist 里另存了原文件的备份')
      ok(canon(await prog(E.page)) === base0, '内容损坏之后本地进度不变')
      await scrollTo(E.page, '.sync-status')
      await shot(E.page, 'sync-error-corrupt')
      await E.page.click('button:has-text("用本机进度重建云端文件")')
      ok(await until(() => gh3.remote(FILE)?.progress[ids[0]]?.done, 8000), '内容损坏：点“重建”后云端恢复为本机进度')

      // 4e. 云端文件来自更新版本的站点（schema 太新）：只读合并，不覆盖
      await badgeIs('synced')
      const newerBody = JSON.stringify({ schema: 99, app: 'hands-on-vue3', updatedAt: 1, device: 'ffffffff', progress: { [ids[7]]: { sc: {}, ex: {}, done: true } } })
      g.files[FILE] = newerBody
      g.ver++
      await E.page.click('.sync-actions button:has-text("立即同步")')
      ok(await until(async () => /站点版本更新/.test(await stText()), 8000), 'schema 太新：提示另一台设备的站点版本更新，请刷新', await stText())
      ok(gh3.gist().files[FILE] === newerBody, 'schema 太新：不覆盖云端文件')
      g.files[FILE] = JSON.stringify({ schema: 1, app: 'hands-on-vue3', updatedAt: 1, device: 'ffffffff', progress: (await prog(E.page)) })
      g.ver++
      await E.page.click('.sync-actions button:has-text("立即同步")')
      ok(await badgeIs('synced'), '云端恢复后可以继续同步')

      // 4f. 断网后恢复
      gh3.st.mode = 'offline'
      await learn(E.page, ids[1])
      ok(await until(async () => (await syncStatus(E.page)).includes('"pending"'), 10000), '断网：状态是“有未同步的更改”并自动重试')
      ok((await doneIds(E.page)).includes(ids[1]), '断网时学习进度照常保存在本机')
      gh3.st.mode = 'ok'
      ok(await until(() => gh3.remote(FILE)?.progress[ids[1]]?.done === true, 20000), '网络恢复后自动重试并推送')
      await openPanel(E.page)
      await scrollTo(E.page, '#sync')
      await shot(E.page, 'sync-panel-on')
      await E.ctx.close()
    }

    /* =============== 5. 导出、导入、恢复备份 =============== */
    {
      await openPanel(A.page)
      const [dl] = await Promise.all([A.page.waitForEvent('download'), A.page.click('button:has-text("导出进度文件")')])
      ok(/^hands-on-vue3-progress-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), '导出的文件名带日期', dl.suggestedFilename())
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hov-sync-'))
      const tmp = path.join(tmpDir, 'export.json')
      await dl.saveAs(tmp)
      const text = fs.readFileSync(tmp, 'utf8')
      const exp = JSON.parse(text)
      ok(exp.schema === 1 && exp.app === 'hands-on-vue3' && exp.progress[ids[0]]?.done, '导出文件带 schema 和进度')
      ok(!text.includes('ZZTESTMARKER') && !/"token"/.test(text), '导出文件里没有令牌')
      // 导入到另一台没开同步的设备：本机有自己的一章
      const C = await device(null)
      await learn(C.page, ids[5])
      await openPanel(C.page)
      await C.page.setInputFiles('#sync-import', tmp)
      await C.page.waitForSelector('.sync-import')
      ok(/章有记录/.test(await C.page.textContent('.sync-import')), '选好文件后先显示文件概况再让用户确认')
      await scrollTo(C.page, '.sync-file')
      await shot(C.page, 'sync-import-confirm')
      await C.page.click('button:has-text("与本机进度合并")')
      await C.page.waitForSelector('.sync-result .sync-msg.good')
      const merged = await doneIds(C.page)
      ok(merged.includes(ids[5]) && merged.includes(ids[0]) && merged.includes(ids[1]), '导入（合并）：本机和文件里的进度都在', merged.join())
      // 替换需要二次确认，并先备份
      await openPanel(C.page)
      await C.page.setInputFiles('#sync-import', tmp)
      await C.page.waitForSelector('.sync-import')
      await C.page.click('button:has-text("用文件替换本机进度")')
      ok((await C.page.locator('button:has-text("确认替换")').count()) === 1, '替换需要二次确认')
      await scrollTo(C.page, '.sync-file')
      await shot(C.page, 'sync-import-replace')
      await C.page.click('button:has-text("确认替换")')
      await C.page.waitForSelector('.sync-result .sync-msg.good')
      const rep = await doneIds(C.page)
      ok(!rep.includes(ids[5]) && rep.includes(ids[0]), '导入（替换）：本机进度被文件替换', rep.join())
      const bks = await C.page.evaluate(k => JSON.parse(localStorage.getItem(k + ':backup') || '[]'), STORE_KEY)
      ok(bks.length >= 1 && bks.length <= 2 && JSON.parse(bks[0].data)[ids[5]]?.done, '替换前自动备份了本机进度（最多留 2 份）', String(bks.length))
      // 坏文件
      fs.writeFileSync(tmp, '{"hello":1}')
      await openPanel(C.page)
      await C.page.setInputFiles('#sync-import', tmp)
      await C.page.waitForSelector('.sync-result .sync-msg.bad')
      ok(/不是“动手学 Vue 3”导出的进度文件/.test(await C.page.textContent('.sync-result')), '导入前校验：不是本站的文件会被拒绝')
      fs.writeFileSync(tmp, '{坏')
      await C.page.setInputFiles('#sync-import', tmp)
      await C.page.waitForSelector('.sync-result .sync-msg.bad')
      ok(/不是有效的 JSON/.test(await C.page.textContent('.sync-result')), '导入前校验：不是 JSON 的文件会被拒绝')
      fs.writeFileSync(tmp, JSON.stringify({ schema: 99, progress: {} }))
      await C.page.setInputFiles('#sync-import', tmp)
      await C.page.waitForSelector('.sync-import')
      ok(/更新版本的站点/.test(await C.page.textContent('.sync-import')) && (await C.page.locator('button:has-text("与本机进度合并")').count()) === 0, '导入前校验 schema：比本站新的不让导入')
      fs.rmSync(tmpDir, { recursive: true, force: true })
      await C.ctx.close()

      // 恢复同步前的本地进度：B 开启同步时留了备份（备份里没有第 1 章）
      await openPanel(B.page)
      const before = await doneIds(B.page)
      gh.st.mode = 'offline'
      await B.page.click('.sync-backups li:last-child button:has-text("恢复")')
      await B.page.waitForSelector('.sync-result .sync-msg.good')
      const after = await doneIds(B.page)
      ok(after.length < before.length, '恢复同步前的本地进度：回到同步前的内容', `${before} → ${after}`)
      gh.st.mode = 'ok'
    }

    /* =============== 6. 断开同步 + 令牌泄露检查 =============== */
    {
      await openPanel(A.page)
      await A.page.click('button:has-text("断开同步")')
      await A.page.check('.sync-check input') // 同时删除云端 Gist
      await A.page.click('button:has-text("确认断开")')
      await A.page.waitForSelector('#sync-token')
      const ls = await A.page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))
      ok(!JSON.stringify(ls).includes('ZZTESTMARKER'), '断开同步后 localStorage 里没有令牌')
      ok(!Object.keys(ls).some(k => k.endsWith(':sync')), '断开同步后配置键已删除（令牌和 gist 编号）')
      ok(gh.st.gists.size === 0, '勾选后断开会删除云端 Gist')
      ok((await A.page.textContent('.sync-result')).includes('已断开'), '断开后给出提示')
      ok(JSON.parse(ls[STORE_KEY])[ids[0]].done, '断开同步不影响本机进度')
      ok((await A.page.locator('.sync-badge').count()) === 0, '断开后顶栏不再显示同步标记')
      const gitReqs = () => A.reqs.filter(r => /github\.com/.test(r.url)).length
      const before = gitReqs()
      await learn(A.page, ids[6])
      await sleep(1500)
      ok(gitReqs() === before, '断开后这个页面不再发任何到 github.com 的请求')
      // B 断开时保留云端
      await openPanel(B.page)
      await B.page.click('button:has-text("断开同步")')
      await B.page.click('button:has-text("确认断开")')
      await B.page.waitForSelector('#sync-token')
      ok(!(await B.page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))).includes('ZZTESTMARKER'))), 'B 断开后 localStorage 里没有令牌')

      // 全程搜索令牌
      const leaks = []
      for (const d of [A, B]) {
        for (const t of d.logs) if (/ZZTESTMARKER/.test(t)) leaks.push('console: ' + t)
        for (const t of d.errs) if (/ZZTESTMARKER/.test(t)) leaks.push('pageerror: ' + t)
        for (const r of d.reqs) {
          if (/ZZTESTMARKER/.test(r.url)) leaks.push('url: ' + r.url)
          if (/ZZTESTMARKER/.test(r.headers.referer || '')) leaks.push('referer')
          if (!/^https:\/\/api\.github\.com\//.test(r.url) && /ZZTESTMARKER/.test(JSON.stringify(r.headers))) leaks.push('header to ' + r.url)
        }
      }
      ok(!leaks.length, '控制台、页面错误、请求地址、Referer 和发往别处的请求头里都没有令牌', leaks.join(' | '))
      ok(A.logs.concat(B.logs).every(t => !/sync|同步/i.test(t) || !/token|令牌/i.test(t)), '同步相关的控制台输出里不提令牌')
      ok(A.errs.concat(B.errs).length === 0, '同步过程没有页面错误', A.errs.concat(B.errs).join(' | '))
      ok(all.blocked.length === 0, '没有接假服务的上下文里没有发出任何 github 请求', all.blocked.join(','))
      await A.ctx.close()
      await B.ctx.close()
    }

    /* =============== 7. 手机宽度与深色：开启后的面板和标记 =============== */
    {
      const gh4 = fakeGitHub()
      gh4.st.valid.add(TOKEN)
      const M = await device(gh4, { viewport: { width: 390, height: 844 }, colorScheme: 'dark' })
      await learn(M.page, ids[0])
      await enable(M.page)
      ok(!(await M.page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), '390px：开启后的面板没有横向滚动', JSON.stringify(await overflowers(M.page)))
      await scrollTo(M.page, '#sync')
      await shot(M.page, 'sync-panel-on')
      await M.page.goto(base + '/roadmap.html')
      await M.page.waitForSelector('.sync-badge')
      const box = await M.page.locator('.sync-btn').boundingBox()
      ok(box && box.x >= 0 && box.x + box.width <= 390 && box.width >= 24, '手机上顶栏同步标记可见且可点')
      await M.page.click('.sync-btn')
      await M.page.waitForSelector('#sync-pop')
      const pb = await M.page.locator('#sync-pop').boundingBox()
      ok(pb && pb.x >= 0 && pb.x + pb.width <= 391, '手机上弹层在屏幕内')
      ok(!(await M.page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), '390px：弹层打开时没有横向滚动', JSON.stringify(await overflowers(M.page)))
      await shot(M.page, 'sync-badge-popover', { clip: { x: 0, y: 0, width: 390, height: 260 } })
      await M.ctx.close()
    }
  } finally {
    await site.stop()
  }
  console.log(R.bad ? '有 ' + R.bad + ' 项失败' : '全部通过')
  process.exit(R.bad ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
