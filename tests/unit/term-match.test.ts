// 术语标注的匹配规则（course/.vitepress/theme/composables/term-match.ts）：最长优先、复合词里的子串不标、纯英文术语要词边界。
import { describe, expect, it } from 'vitest'
import { buildMatcher, findTerms } from '../../course/.vitepress/theme/composables/term-match.ts'

const terms = (text: string, learned: string[], known: string[] = learned) => findTerms(text, buildMatcher(learned, known)).map(h => h.term)

describe('最长优先', () => {
  it('“单文件组件”优先于“组件”', () => {
    expect(terms('单文件组件很常用', ['组件', '单文件组件'])).toEqual(['单文件组件'])
  })
  it('位置对：返回每处的下标', () => {
    const m = buildMatcher(['组件', '插槽'])
    expect(findTerms('用组件和插槽', m)).toEqual([{ i: 1, term: '组件' }, { i: 4, term: '插槽' }])
  })
})

describe('复合词里的子串不标', () => {
  const known = ['组件', '子组件', '父组件', '响应式', '响应式数据']
  it('“子组件”是已知术语时，里面的“组件”不标；单独的“组件”照标', () => {
    expect(terms('子组件是一个组件', ['组件'], known)).toEqual(['组件'])
    expect(findTerms('子组件是一个组件', buildMatcher(['组件'], known)).map(h => h.i)).toEqual([6])
  })
  it('“父组件”同理', () => {
    expect(terms('父组件传给子组件', ['组件'], known)).toEqual([])
  })
  it('“响应式数据”是已知术语时，里面的“响应式”不标（即使响应式数据还没学到）', () => {
    expect(terms('响应式数据会变', ['响应式'], known)).toEqual([])
    expect(terms('这是响应式的', ['响应式'], known)).toEqual(['响应式'])
  })
  it('相邻的字没有组成已知术语时照标', () => {
    expect(terms('这个新组件不错', ['组件'], known)).toEqual(['组件'])
  })
  it('没有收录的复合词不拦截（只拦已知术语）', () => {
    expect(terms('子组件', ['组件'], ['组件'])).toEqual(['组件'])
  })
  it('前后各有字的复合词也能识别：术语在已知术语的中间', () => {
    expect(terms('可复用组件化', ['组件'], ['组件', '可复用组件化'])).toEqual([])
  })
  it('下标在开头附近不越界', () => {
    expect(terms('组件', ['组件'], ['组件', '子组件'])).toEqual(['组件'])
  })
})

describe('纯英文术语要词边界', () => {
  const learned = ['ref', 'key', 'props']
  it('单词本身标', () => {
    expect(terms('用 ref 保存，key 唯一，props 向下', learned)).toEqual(['ref', 'key', 'props'])
  })
  it('更长的标识符里不标', () => {
    expect(terms('refs keyup defineProps toRef template-ref $ref a_key', learned)).toEqual([])
  })
  it('前面是点（属性访问）不标', () => {
    expect(terms('a.ref b.key', learned)).toEqual([])
  })
  it('紧挨中文标，紧挨标点标', () => {
    expect(terms('用ref保存（key）', learned)).toEqual(['ref', 'key'])
  })
  it('带空格或符号的英文术语整体匹配', () => {
    expect(terms('provide / inject 一起用', ['provide / inject', 'h()'])).toEqual(['provide / inject'])
    expect(terms('调用 h() 创建', ['h()'])).toEqual(['h()'])
  })
  it('没有术语时不匹配任何内容', () => {
    expect(terms('随便什么', [])).toEqual([])
  })
})
