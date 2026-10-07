// 只构建指定章到独立的临时目录（多个 agent 同时跑互不覆盖），可选再起 preview 服务。
import fs from 'node:fs'
import os from 'node:os'
import net from 'node:net'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const VITEPRESS = path.join(ROOT, 'node_modules/vitepress/bin/vitepress.js')

/** 构建。成功返回 { dist, env, tmp, cleanup }；失败抛错（带构建输出） */
export function buildChapters(chapters) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-chapter-'))
  const env = { ...process.env, COURSE_CHAPTERS: chapters.join(','), COURSE_OUT_DIR: path.join(tmp, 'dist'), COURSE_CACHE_DIR: path.join(tmp, 'cache') }
  const r = spawnSync(process.execPath, [VITEPRESS, 'build', 'course'], { cwd: ROOT, env, encoding: 'utf8' })
  const cleanup = () => fs.rmSync(tmp, { recursive: true, force: true })
  if (r.status !== 0) { cleanup(); throw new Error('构建失败（只构建了 ' + chapters.join('、') + '）：\n' + r.stdout + r.stderr) }
  return { dist: env.COURSE_OUT_DIR, env, tmp, cleanup }
}

export function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => res(p)) })
    s.on('error', rej)
  })
}

/** 起 preview，返回 { base, stop } */
export async function startPreview(env) {
  const port = await freePort()
  const srv = spawn(process.execPath, [VITEPRESS, 'preview', 'course', '--port', String(port), '--strictPort'], { cwd: ROOT, env, stdio: 'ignore' })
  const base = 'http://127.0.0.1:' + port
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base + '/')).ok) return { base, stop: () => srv.kill() } } catch { /* 还没起来 */ }
    await new Promise(r => setTimeout(r, 250))
  }
  srv.kill()
  throw new Error('preview 没有启动')
}
