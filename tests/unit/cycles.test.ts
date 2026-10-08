import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// 不允许循环依赖：扫描 course/ 里的相对 import（含 `import type` 和 `export … from`），找环。
// 扫 .ts / .mts / .vue（.vue 只读 import 语句）。构建产物和缓存目录不扫。
const root = path.resolve(import.meta.dirname, '../..')
const EXT = ['.ts', '.mts', '.vue']
const SKIP = new Set(['node_modules', 'dist', 'cache'])

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return SKIP.has(e.name) ? [] : walk(p)
    return EXT.includes(path.extname(p)) && !p.endsWith('.d.ts') ? [p] : []
  })
}

function importsOf(file: string): string[] {
  const src = fs.readFileSync(file, 'utf8')
  const out: string[] = []
  for (const m of src.matchAll(/^\s*(?:import|export)\s[^'"\n]*?from\s+['"](\.[^'"]+)['"]/gm)) {
    const base = path.resolve(path.dirname(file), m[1])
    const hit = [base, ...EXT.map(e => base + e), ...EXT.map(e => path.join(base, 'index' + e))].find(p => fs.existsSync(p) && fs.statSync(p).isFile())
    if (hit) out.push(hit)
  }
  return out
}

describe('模块之间没有循环依赖', () => {
  const files = walk(path.join(root, 'course'))
  const graph = new Map(files.map(f => [f, importsOf(f)]))

  it('扫到了引擎、题库和主题文件', () => {
    expect(files.length).toBeGreaterThan(50)
    expect(files.some(f => f.endsWith(path.join('engine', 'store.ts')))).toBe(true)
    expect(files.some(f => f.endsWith(path.join('engine', 'logic', 'srs.ts')))).toBe(true)
  })

  it('依赖图无环', () => {
    const state = new Map<string, 1 | 2>() // 1 = 正在访问，2 = 访问完
    const stack: string[] = []
    let cycle: string[] | null = null
    const visit = (f: string) => {
      if (cycle || state.get(f) === 2) return
      if (state.get(f) === 1) {
        cycle = [...stack.slice(stack.indexOf(f)), f]
        return
      }
      state.set(f, 1)
      stack.push(f)
      for (const g of graph.get(f) ?? []) visit(g)
      stack.pop()
      state.set(f, 2)
    }
    for (const f of files) visit(f)
    expect(cycle ? (cycle as string[]).map(f => path.relative(root, f)).join(' → ') : null).toBeNull()
  })

  it('logic/ 不依赖 logic/ 以外的引擎文件（store、cards 依赖 logic，反过来不行）', () => {
    const logic = path.join(root, 'course', 'engine', 'logic') + path.sep
    const types = path.join(root, 'course', 'engine', 'types.ts')
    for (const f of files.filter(f => f.startsWith(logic))) {
      for (const g of graph.get(f) ?? []) expect(g.startsWith(logic) || g === types, `${path.relative(root, f)} 引用了 ${path.relative(root, g)}`).toBe(true)
    }
  })
})
