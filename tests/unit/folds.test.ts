import { describe, expect, it } from 'vitest'
import { EditorState } from '@codemirror/state'
import { blockIndexOfLine, clipChange, foldLabel, parseFolds, protectedZones } from '../../course/engine/logic/folds.ts'
// @ts-ignore 编辑器的 CodeMirror 扩展是 .js
import { foldExtension, foldBlocks, replaceAll, foldTitleAt } from '../../editor/folds.js'
import { normScript, normTemplate } from '../../course/engine/logic/ladder.ts'

const DOC = ['let a = 1', '//#fold 前面写过的零件', 'function f() {', '  return 1', '}', '//#endfold', 'let b = f()'].join('\n')

describe('parseFolds：解析折叠标记', () => {
  it('找到块、标题、行号、字符范围和正文行数', () => {
    const [b] = parseFolds(DOC)
    expect(b.title).toBe('前面写过的零件')
    expect([b.startLine, b.endLine, b.bodyLines]).toEqual([2, 6, 3])
    expect(DOC.slice(b.from, b.to)).toBe('//#fold 前面写过的零件\nfunction f() {\n  return 1\n}\n//#endfold')
    expect(foldLabel(b)).toBe('前面写过的零件（3 行）')
  })
  it('没有标记：空数组', () => expect(parseFolds('const a = 1\n// 普通注释')).toEqual([]))
  it('多个块；标题缺省用默认标题；允许缩进和 // 后的空格', () => {
    const bs = parseFolds('//#fold A\nx\n//#endfold\ny\n  // #fold\nz\n  // #endfold\n')
    expect(bs.map(b => [b.title, b.startLine, b.endLine])).toEqual([['A', 1, 3], ['已写好的代码', 5, 7]])
  })
  it('模板写法 <!--#fold 标题-->', () => {
    const bs = parseFolds('<!--#fold 模板标题-->\n<p>x</p>\n<!--#endfold-->\n<b/>')
    expect(bs).toHaveLength(1)
    expect(bs[0].title).toBe('模板标题')
    expect(bs[0].bodyLines).toBe(1)
  })
  it('不配对的标记、嵌套的标记、#folder 之类的前缀相同的词，都不当作块', () => {
    expect(parseFolds('//#fold A\nx')).toEqual([])
    expect(parseFolds('x\n//#endfold')).toEqual([])
    expect(parseFolds('//#folder 目录\n//#endfold')).toEqual([])
    const nested = parseFolds('//#fold 外\n//#fold 内\nx\n//#endfold\ny\n//#endfold')
    expect(nested).toHaveLength(1)
    expect([nested[0].title, nested[0].endLine]).toEqual(['外', 4])
  })
  it('空块（标记行紧挨着）正文 0 行', () => expect(parseFolds('//#fold A\n//#endfold')[0].bodyLines).toBe(0))
  it('CRLF 换行也能识别', () => expect(parseFolds('//#fold A\r\nx\r\n//#endfold\r\n')).toHaveLength(1))
})

describe('行号映射：真实行号落在哪个块里', () => {
  const bs = parseFolds(DOC)
  it('标记行和正文行都在块里，块外返回 -1', () => {
    expect([1, 2, 4, 6, 7].map(n => blockIndexOfLine(bs, n))).toEqual([-1, 0, 0, 0, -1])
  })
})

describe('protectedZones / clipChange：只读保护', () => {
  const bs = parseFolds(DOC)
  const zones = protectedZones(bs, DOC.length)
  const from = bs[0].from, to = bs[0].to
  it('保护区比块两端各多一个换行', () => expect([zones[0].lo, zones[0].hi]).toEqual([from - 1, to + 1]))
  it('块里输入、删除、替换都被拦下', () => {
    expect(clipChange({ from: from + 12, to: from + 12, insert: 'x' }, zones).blocked).toBe(true)
    expect(clipChange({ from: from + 12, to: from + 13, insert: '' }, zones).parts).toEqual([])
    expect(clipChange({ from: from + 3, to: from + 5, insert: 'zz' }, zones).blocked).toBe(true)
  })
  it('块两端的换行不能删（否则标记行和相邻行粘在一起）', () => {
    expect(clipChange({ from: from - 1, to: from, insert: '' }, zones).blocked).toBe(true)
    expect(clipChange({ from: to, to: to + 1, insert: '' }, zones).blocked).toBe(true)
  })
  it('块外的输入和删除照常', () => {
    expect(clipChange({ from: 3, to: 3, insert: 'x' }, zones)).toEqual({ parts: [{ from: 3, to: 3, insert: 'x' }], blocked: false })
    expect(clipChange({ from: 0, to: from - 1, insert: '' }, zones).blocked).toBe(false)
    expect(clipChange({ from: to + 1, to: to + 4, insert: '' }, zones).blocked).toBe(false)
    // 块前一行行尾、块后一行行首插入：在块外
    expect(clipChange({ from: from - 1, to: from - 1, insert: 'x' }, zones).blocked).toBe(false)
    expect(clipChange({ from: to + 1, to: to + 1, insert: 'x' }, zones).blocked).toBe(false)
  })
  it('跨越块的删除：只删块外的两段，块原样保留', () => {
    const r = clipChange({ from: 0, to: DOC.length, insert: '' }, zones)
    expect(r.blocked).toBe(true)
    expect(r.parts).toEqual([{ from: 0, to: from - 1, insert: '' }, { from: to + 1, to: DOC.length, insert: '' }])
  })
  it('块贴着文档开头或结尾：插入的文字必须带换行才算在块外', () => {
    const d = '//#fold A\nx\n//#endfold'
    const z = protectedZones(parseFolds(d), d.length)
    expect(clipChange({ from: 0, to: 0, insert: 'a' }, z).blocked).toBe(true)
    expect(clipChange({ from: 0, to: 0, insert: 'a\n' }, z).blocked).toBe(false)
    expect(clipChange({ from: d.length, to: d.length, insert: 'a' }, z).blocked).toBe(true)
    expect(clipChange({ from: d.length, to: d.length, insert: '\na' }, z).blocked).toBe(false)
  })
  it('相邻的两个块合成一个保护区', () => {
    const d = '//#fold A\nx\n//#endfold\n//#fold B\ny\n//#endfold'
    expect(protectedZones(parseFolds(d), d.length)).toHaveLength(1)
  })
})

describe('折叠标记不影响“代码是否改过”的规范化比较', () => {
  it('脚本：标记是注释，规范化后有无标记相同', () => {
    expect(normScript('//#fold 标题\nlet a = 1\n//#endfold\nlet b = 2')).toBe(normScript('let a = 1\nlet b = 2'))
  })
  it('模板：<!--#fold--> 是 HTML 注释，规范化后有无标记相同', () => {
    expect(normTemplate('<!--#fold 标题-->\n<p>x</p>\n<!--#endfold-->')).toBe(normTemplate('<p>x</p>'))
  })
})

describe('CodeMirror 扩展：只读过滤和块位置（无 DOM，只用 EditorState）', () => {
  const mk = (doc: string) => EditorState.create({ doc, extensions: [foldExtension()] })
  const text = (s: EditorState) => s.doc.toString()
  it('初始所有块都折叠', () => {
    const s = mk(DOC)
    expect(foldBlocks(s).map((b: any) => b.open)).toEqual([false])
    expect(foldTitleAt(s, 4)).toBe('前面写过的零件')
    expect(foldTitleAt(s, 7)).toBe('')
  })
  it('块里输入无效，块外输入有效', () => {
    let s = mk(DOC)
    const inside = DOC.indexOf('return')
    s = s.update({ changes: { from: inside, insert: 'X' } }).state
    expect(text(s)).toBe(DOC)
    s = s.update({ changes: { from: 3, insert: 'X' } }).state
    expect(text(s)).toBe(DOC.slice(0, 3) + 'X' + DOC.slice(3))
  })
  it('全选删除：块外删掉，块完整保留', () => {
    const s = mk(DOC).update({ changes: { from: 0, to: DOC.length, insert: '' } }).state
    expect(text(s)).toContain('//#fold 前面写过的零件\nfunction f() {\n  return 1\n}\n//#endfold')
    expect(parseFolds(text(s))).toHaveLength(1)
    expect(foldBlocks(s)).toHaveLength(1)
  })
  it('块前面插入内容后，块的位置跟着走，仍然只读', () => {
    let s = mk(DOC).update({ changes: { from: 0, insert: 'let z = 0\n' } }).state
    const b = foldBlocks(s)[0]
    const orig = parseFolds(DOC)[0]
    expect(text(s).slice(b.from, b.to)).toBe(DOC.slice(orig.from, orig.to))
    const before = text(s)
    s = s.update({ changes: { from: b.from + 15, insert: 'X' } }).state
    expect(text(s)).toBe(before)
  })
  it('replaceAll 注解的整体替换不受限制，并重新解析', () => {
    const s = mk(DOC).update({ changes: { from: 0, to: DOC.length, insert: 'plain' }, annotations: replaceAll.of(true) }).state
    expect(text(s)).toBe('plain')
    expect(foldBlocks(s)).toHaveLength(0)
    const s2 = s.update({ changes: { from: 0, to: 5, insert: DOC }, annotations: replaceAll.of(true) }).state
    expect(foldBlocks(s2)).toHaveLength(1)
  })
  it('没有标记的文档：完全不拦', () => {
    const s = mk('a\nb').update({ changes: { from: 0, to: 3, insert: 'z' } }).state
    expect(text(s)).toBe('z')
  })
})
