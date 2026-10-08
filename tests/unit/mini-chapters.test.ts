// 章节里引用迷你 Vue 的代码块，必须和 course/mini 里的源码一致（防止正文和共享零件分叉）。
// 约定（见 course/mini/README.md 第 5 节）：在代码块前一行写
//   <!-- mini:零件名#区域名 -->
// 比较的是「去掉注释和空行之后的代码」，所以正文可以删掉长注释，但不能改代码。
// 现在还没有章节使用这个标记时，这个测试只检查自己的比较规则。
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PARTS, region, type PartName } from '../../course/mini'

const code = (s: string) =>
  s.split('\n').map(l => l.replace(/\s+\/\/.*$/, '').replace(/^\s*\/\/.*$/, '').replace(/\s+$/, '')).filter(l => l.trim()).join('\n')

const dir = path.resolve(import.meta.dirname, '../../course/chapters')
const MARK = /<!--\s*mini:(\w+)#(\w+)\s*-->\s*\n+```[\w-]*[^\n]*\n([\s\S]*?)\n```/g

describe('章节里的 mini 引用', () => {
  it('比较规则：忽略注释和空行', () => {
    expect(code('a // x\n\n// y\n  b  \n')).toBe('a\n  b')
  })

  it('标记的写法能被识别，并和源码比较', () => {
    const md = '正文\n\n<!-- mini:reactivity#cleanup -->\n```js\nfunction cleanup(e) {\n  e.deps.forEach(dep => dep.delete(e))\n  e.deps.length = 0\n}\n```\n'
    const [m] = [...md.matchAll(MARK)]
    expect(m.slice(1, 3)).toEqual(['reactivity', 'cleanup'])
    expect(code(m[3])).toBe(code(region(PARTS.reactivity, 'cleanup')))
  })

  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8')
    for (const m of text.matchAll(MARK)) {
      const [, part, name, body] = m
      it(`${f}：mini:${part}#${name} 和源码一致`, () => {
        expect(Object.keys(PARTS)).toContain(part)
        expect(code(body)).toBe(code(region(PARTS[part as PartName], name)))
      })
    }
  }
})
