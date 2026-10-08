// 浏览器测试入口（Playwright）。对应 hands-on-react 的 npm run test:e2e。
//
//   npm run test:e2e                          三个套件都跑，用已构建的站点（先 npm run build）
//   npm run test:e2e -- 03-refs 04-computed   只测指定章（exercises 套件；它自己只构建这些章，不需要先 build）
//   npm run test:e2e -- exercises 03-refs     同上，显式写套件名
//   npm run test:e2e -- mechanics progress    只跑这些套件
//   COURSE_OUT_DIR=<已构建目录> npm run test:e2e -- progress   四个套件都支持用独立的已构建目录，不碰 dist
//
// 套件：exercises（逐章：练习、自测、实验台）、progress（跨章功能）、mechanics（学习机制）、glossary（术语表和术语标注）。
// 依次运行，遇到第一个失败就停。本机 shell 设了 HTTP 代理时，这里会自动给 localhost 加上 NO_PROXY。
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SUITES = ['exercises', 'progress', 'mechanics', 'glossary']
const args = process.argv.slice(2)
const named = args.filter(a => SUITES.includes(a))
const chapters = args.filter(a => !SUITES.includes(a))

let plan
if (chapters.length) {
  if (named.some(s => s !== 'exercises')) {
    console.error('写了章名时只能跑 exercises 套件：progress 和 mechanics 是跨章测试，不能指定章')
    process.exit(2)
  }
  plan = [['exercises', chapters]]
} else plan = (named.length ? named : SUITES).map(s => [s, []])

const env = { ...process.env }
const noProxy = ['localhost', '127.0.0.1']
env.NO_PROXY = [env.NO_PROXY, ...noProxy].filter(Boolean).join(',')
env.no_proxy = env.NO_PROXY

for (const [suite, list] of plan) {
  console.log(`\n== ${suite}${list.length ? ' ' + list.join(' ') : ''} ==`)
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tests/site', `${suite}.test.js`), ...list], { stdio: 'inherit', env, cwd: ROOT })
  if (r.status !== 0) {
    console.error(`\n${suite} 失败`)
    process.exit(r.status || 1)
  }
}
