import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// course/engine/logic/ 是"纯逻辑"目录：不碰 DOM、localStorage，也不读当前时间（时间由参数传入）。
// 这个测试挡住以后有人往里面加副作用。
const dir = path.resolve(import.meta.dirname, '../../course/engine/logic')
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'))

describe('engine/logic 保持纯净', () => {
  it('目录里有文件', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const f of files) {
    const src = fs
      .readFileSync(path.join(dir, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')

    it(`${f}：不读 Date.now()/new Date，不碰 window、document、localStorage`, () => {
      expect(src).not.toMatch(/Date\.now\(|new Date\(|\bwindow\b|\bdocument\b|localStorage|sessionStorage/)
    })

    it(`${f}：只依赖 logic/ 里的其他纯文件和 engine/types.ts（不依赖 store、cards、vue、vitepress）`, () => {
      const imports = [...src.matchAll(/^import [^\n]*from '([^']+)'/gm)].map(m => m[1])
      for (const i of imports) expect(i, `${f} 引用了 ${i}`).toMatch(/^(\.\/[A-Za-z]+\.ts|\.\.\/types\.ts)$/)
    })
  }
})
