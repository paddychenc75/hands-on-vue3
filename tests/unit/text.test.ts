import { describe, expect, it } from 'vitest'
import { esc, fmtOpt } from '../../course/engine/logic/text.ts'

describe('esc / fmtOpt', () => {
  it('esc 转义 & < >', () => {
    expect(esc('<a & b>')).toBe('&lt;a &amp; b&gt;')
  })
  it('选项文字是纯文本：转义后，形如 <Tag> 的标签名包成 code', () => {
    expect(fmtOpt('<div>')).toBe('<code>&lt;div&gt;</code>')
    expect(fmtOpt('a < b')).toBe('a &lt; b')
    expect(fmtOpt('&lt;Foo&gt; 和 <b>')).toBe('<code>&lt;Foo&gt;</code> 和 <code>&lt;b&gt;</code>')
  })
})
