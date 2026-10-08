// check:content 的规则测试：先在真实内容上通过，再构造坏输入，断言每类错误都被报出来。
// 校验规则在 scripts/lib/validate.mjs；输入由 scripts/lib/collect.mjs 从仓库读出。
import { beforeAll, describe, expect, it } from 'vitest'
import { collect } from '../../scripts/lib/collect.mjs'
import { applyExemptions, validate } from '../../scripts/lib/validate.mjs'
import { KNOWN_ISSUES } from '../../scripts/lib/known-issues.mjs'
import { compareSnapshot, computeCards, fingerprint, nextSnapshot } from '../../scripts/lib/cards.mjs'
import { checkContainers, maskFences, scanSc } from '../../scripts/lib/content.mjs'

type Inp = any
let base: Inp

beforeAll(async () => {
  base = await collect()
})

const run = (inp: Inp, opts = {}) => {
  const res = validate(inp, opts)
  return applyExemptions(res.errors, KNOWN_ISSUES).errors.map((e: any) => e.text as string)
}
/** 改一章的源文件 */
const editChapter = (file: string, fn: (s: string) => string): Inp => ({ ...base, chapterFiles: { ...base.chapterFiles, [file]: fn(base.chapterFiles[file]) } })
/** 改一道练习 */
const editExercise = (file: string, id: string, patch: Record<string, unknown>): Inp => ({
  ...base,
  exercises: { ...base.exercises, [file]: { ...base.exercises[file], [id]: { ...base.exercises[file][id], ...patch } } },
})
const firstExercise = (file: string) => Object.keys(base.exercises[file])[0]
const expectError = (errs: string[], re: RegExp) => expect(errs.some(e => re.test(e)), `应当报出 ${re}，实际：\n${errs.join('\n')}`).toBe(true)

describe('真实内容', () => {
  it('当前仓库通过全部检查（除已登记的临时豁免外）', () => {
    expect(run(base)).toEqual([])
  })
  it('临时豁免没有失效的', () => {
    const res = validate(base)
    expect(applyExemptions(res.errors, KNOWN_ISSUES).stale).toEqual([])
  })
  it('统计数字合理（读到了章、自测、练习、实验台）', () => {
    const { stats } = validate(base)
    expect(stats.chapters).toBeGreaterThanOrEqual(26)
    expect(stats.sc).toBeGreaterThan(100)
    expect(stats.exercises).toBeGreaterThan(60)
    expect(stats.labs).toBeGreaterThan(40)
  })
})

describe('自测题', () => {
  it('调换两道自测题 -> 报“现在放的是原来 X 的题”', () => {
    const inp = editChapter('03-refs', src => {
      const a = scanSc(src).filter((s: any) => !s.predict)
      const [s0, s1] = a
      // 交换两道题的题干文字（保持格式不变，只换文字）
      return src.replace(s0.stemSrc, '@@A@@').replace(s1.stemSrc, s0.stemSrc).replace('@@A@@', s1.stemSrc)
    })
    expectError(run(inp), /refs#0 现在放的是原来 refs#1 的题/)
  })
  it('删一道自测题 -> 报键消失', () => {
    const inp = editChapter('03-refs', src => {
      const last = scanSc(src).filter((s: any) => !s.predict).at(-1)
      const end = src.indexOf('</Sc>', last.index) + '</Sc>'.length
      return src.slice(0, last.index) + src.slice(end)
    })
    expectError(run(inp), /refs#\d+ 消失了/)
  })
  it('在末尾追加新题 -> 提示运行 --update', () => {
    const inp = editChapter('03-refs', src => {
      const last = scanSc(src).filter((s: any) => !s.predict).at(-1)
      const end = src.indexOf('</Sc>', last.index) + '</Sc>'.length
      const extra = '\n\n<Sc :a="0">\n\n新题\n\n<Opt>甲</Opt>\n<Opt>乙</Opt>\n\n<template #explain>\n\n解析：略\n\n</template>\n</Sc>'
      return src.slice(0, end) + extra + src.slice(end)
    })
    expectError(run(inp), /还没记进快照[\s\S]*--update/)
  })
  it('只有 1 个选项 / :a 超范围 / 没有解析', () => {
    const one = editChapter('01-first', src => {
      const s0 = scanSc(src)[0]
      const end = src.indexOf('</Sc>', s0.index)
      let seen = 0
      const block = src.slice(s0.index, end).replace(/^<Opt>.*<\/Opt>\n?/gm, m => (seen++ ? '' : m))
      return src.slice(0, s0.index) + block + src.slice(end)
    })
    expectError(run(one), /至少要 2 个 <Opt>|超出范围/)
    const big = editChapter('01-first', src => src.replace(/<Sc :a="\d+">/, '<Sc :a="9">'))
    expectError(run(big), /超出范围/)
    const noEx = editChapter('01-first', src => src.replace(/<template #explain>[\s\S]*?<\/template>/, ''))
    expectError(run(noEx), /没有解析/)
  })
  it('<Sc 数量和能被抽取的个数不一致 -> 报错', () => {
    expectError(run(editChapter('01-first', src => src.replace('</Sc>', ''))), /个能被抽取|<Sc/)
  })
})

describe('目标、练习、实验台', () => {
  it('Goal 引用不存在的练习 / 自测序号', () => {
    expectError(run(editChapter('01-first', s => s.replace('ex:counter', 'ex:nope'))), /练习 "nope"/)
    expectError(run(editChapter('01-first', s => s.replace('sc:2', 'sc:99'))), /sc:99/)
  })
  it('章里引用了不存在的练习', () => {
    expectError(run(editChapter('01-first', s => s.replace('<Exercise id="counter"', '<Exercise id="ghost"'))), /"ghost".*找不到/)
  })
  it('练习没有被任何章使用', () => {
    expectError(run(editChapter('01-first', s => s.replace(/<Exercise id="firstFill" \/>\n?/, ''))), /没有被任何一章/)
  })
  it('删掉一个 wrong -> 报至少要有 1 个 wrong', () => {
    const id = firstExercise('03-refs')
    expectError(run(editExercise('03-refs', id, { wrong: [] })), /至少要有 1 个 wrong/)
  })
  it('wrong 构造失败(WRONG_SUB_FAILED)', () => {
    const id = firstExercise('03-refs')
    expectError(run(editExercise('03-refs', id, { wrong: [{ tpl: 'WRONG_SUB_FAILED：找不到 x' }] })), /WRONG_SUB_FAILED/)
  })
  it('hints 为空 / 缺 title', () => {
    const id = firstExercise('03-refs')
    expectError(run(editExercise('03-refs', id, { hints: [] })), /hints 不能为空/)
    expectError(run(editExercise('03-refs', id, { title: '' })), /title 缺失或为空/)
  })
  it('faded 必填：没有时报错，格式错时报错', () => {
    const id = firstExercise('03-refs')
    expectError(run(editExercise('03-refs', id, { faded: undefined })), /缺少 faded/)
    expectError(run(editExercise('03-refs', id, { faded: {} })), /faded 是空对象/)
    expectError(run(editExercise('03-refs', id, { faded: { tpl: '' } })), /faded\.tpl 必须是非空字符串/)
    expectError(run(editExercise('03-refs', id, { faded: { html: 'x' } })), /faded 里有未知字段/)
  })
  it('faded 不能和参考答案相同、必须有 ✏️ 占位、不能含 WRONG_SUB_FAILED', () => {
    const id = firstExercise('03-refs')
    const ex = base.exercises['03-refs'][id]
    // 和参考答案相同（没写的那段用起始代码补；这里把两段都写成答案）
    expectError(run(editExercise('03-refs', id, { faded: { tpl: ex.solTpl ?? ex.tpl, js: ex.solJs ?? ex.js } })), /faded 和参考答案完全相同/)
    // 没有 ✏️ 占位
    expectError(run(editExercise('03-refs', id, { faded: { tpl: '<p>没有占位</p>' } })), /没有 ✏️ 占位/)
    expectError(run(editExercise('03-refs', id, { faded: { js: 'const a = 1 // TODO' } })), /没有 ✏️ 占位/)
    // WRONG_SUB_FAILED
    expectError(run(editExercise('03-refs', id, { faded: { tpl: 'WRONG_SUB_FAILED：找不到 x ✏️' } })), /faded 构造失败/)
    // 写了占位就通过（占位在 js 或 tpl 都行）
    expect(run(editExercise('03-refs', id, { faded: { js: 'const a = /* ✏️ 补这里 */ null' } }))).toEqual([])
  })
  it('真实内容里每道练习都有 faded', () => {
    for (const mod of Object.values(base.exercises) as any[])
      for (const [id, ex] of Object.entries(mod) as [string, any][])
        if (ex && typeof ex === 'object' && 'check' in ex) expect(ex.faded, `${id} 缺少 faded`).toBeTruthy()
  })
  it('练习 id 重复', () => {
    const id = firstExercise('03-refs')
    const inp = { ...base, exercises: { ...base.exercises, '04-computed': { ...base.exercises['04-computed'], [id]: base.exercises['03-refs'][id] } } }
    expectError(run(inp), /重复/)
  })
  it('实验台缺测试数据 / 测试数据多出 / id 重复', () => {
    expectError(run({ ...base, labTests: { ...base.labTests, '02-template': base.labTests['02-template'].slice(1) } }), /缺少实验台/)
    expectError(run({ ...base, labTests: { ...base.labTests, '02-template': [...base.labTests['02-template'], 'ghost-lab'] } }), /ghost-lab/)
    const dup = editChapter('03-refs', s => s.replace(/<Lab id="demo-[a-z-]+"/, '<Lab id="demo-classes"'))
    expectError(run(dup), /重复/)
  })
  it('import 的示意图文件不存在', () => {
    expectError(run(editChapter('03-refs', s => s.replace('RefVsReactiveAccess.vue', 'Nope.vue'))), /import 的文件不存在/)
  })
})

describe('章节与 frontmatter', () => {
  it('文件名与 id / 章号不一致', () => {
    expectError(run(editChapter('03-refs', s => s.replace('id: refs', 'id: other'))), /文件名里的 id/)
    expectError(run(editChapter('03-refs', s => s.replace('chapter: 3', 'chapter: 4'))), /章号|重复/)
  })
  it('stage 越界、缺 title', () => {
    expectError(run(editChapter('03-refs', s => s.replace('stage: 1', 'stage: 9').replace('stage: 2', 'stage: 9'))), /stage 必须是 1 到 6/)
    expectError(run(editChapter('03-refs', s => s.replace(/^title: .*\n/m, ''))), /缺少 title/)
  })
  it('一级标题不以 title 开头', () => {
    expectError(run(editChapter('01-first', s => s.replace('# 第一个 Vue 应用', '# 别的标题'))), /一级标题是/)
  })
  it('容器没闭合 / 多余的 :::', () => {
    expectError(run(editChapter('01-first', s => s.replace('::: rt', '::: rt\n::: note'))), /没有闭合/)
    expect(checkContainers('::: a\n:::\n:::').length).toBe(1)
    // 代码块里的 ::: 不算
    expect(checkContainers(maskFences('```\n::: x\n```').masked)).toEqual([])
  })
  it('TODO 残留报错，【待写】只提示', () => {
    expectError(run(editChapter('01-first', s => s + '\nTODO 补充\n')), /残留 TODO/)
    const marked = editChapter('01-first', s => s + '\n【待写】\n')
    expect(run(marked)).toEqual([])
    expectError(run(marked, { strict: true }), /【待写】占位/)
    expect(validate(marked).notes.join()).toMatch(/01-first/)
  })
  it('缺 summary', () => {
    expectError(run(editChapter('01-first', s => s.replace(/^::: summary/m, '::: note'))), /::: summary/)
  })
  it('小节编号不连续', () => {
    expectError(run(editChapter('01-first', s => s.replace('### 1.2 ', '### 1.5 '))), /小节编号不连续/)
  })
})

describe('站内引用', () => {
  it('不存在的第 99 章', () => {
    expectError(run(editChapter('01-first', s => s + '\n详见第 99 章。\n')), /引用了第 99 章，但课程只有 \d+ 章/)
  })
  it('N.M 节不存在', () => {
    expectError(run(editChapter('01-first', s => s + '\n见 3.99 节。\n')), /3\.99 节/)
    expectError(run(editChapter('01-first', s => s + '\n见第 4 章 3.1 节。\n')), /属于第 3 章/)
  })
  it('“第 N 章“词””的词不在那一章', () => {
    expectError(run(editChapter('01-first', s => s + '\n第 3 章“根本不存在的词语”讲了它。\n')), /找不到“根本不存在的词语”/)
  })
  it('章链接的章号和目标不一致 / 目标不存在', () => {
    expectError(run(editChapter('01-first', s => s + '\n[第 5 章](/chapters/03-refs)\n')), /链接文字写的是第 5 章/)
    expectError(run(editChapter('01-first', s => s + '\n[x](/chapters/99-none)\n')), /指向不存在的页面/)
    expectError(run(editChapter('01-first', s => s + '\n[x](/check/9)\n')), /指向不存在的页面/)
  })
})

describe('阶段与专用题', () => {
  it('专用题的章 id 不存在', () => {
    const q = [...base.questions, ['题', ['对', '错'], '解析', 'no-such-chapter']]
    expectError(run({ ...base, questions: q }), /章 id "no-such-chapter" 不存在/)
  })
  it('阶段题量不够抽题', () => {
    expectError(run({ ...base, stageQuestions: 999 }), /题目不够抽 999 题/)
  })
  it('删一道专用题 -> 键消失；调换 -> 现在放的是原来 X', () => {
    expectError(run({ ...base, questions: base.questions.slice(1) }), /#c\d+ 消失了|现在放的是原来/)
    const sw = [...base.questions]
    const i = sw.findIndex((r: any, k: number) => k > 0 && r[3] === sw[0][3])
    ;[sw[0], sw[i]] = [sw[i], sw[0]]
    expectError(run({ ...base, questions: sw }), /现在放的是原来/)
  })
})

describe('卡片键快照（纯函数）', () => {
  const cur = { cards: { 'a#0': 'x1', 'a#1': 'x2' }, predictions: ['lab-a'] }
  it('完全一致没有问题', () => {
    const r = compareSnapshot({ cards: cur.cards, predictions: cur.predictions }, cur)
    expect(r).toEqual({ problems: [], added: [], addedPred: [] })
  })
  it('先猜键消失', () => {
    const r = compareSnapshot({ cards: cur.cards, predictions: ['lab-a', 'lab-gone'] }, cur)
    expect(r.problems.join()).toMatch(/先猜题 lab-gone 消失了/)
  })
  it('新键只追加；--force 才改已有键', () => {
    const snap = { cards: { 'a#0': 'old' }, predictions: [] }
    const next = nextSnapshot(snap, cur)
    expect(next.cards).toEqual({ 'a#0': 'old', 'a#1': 'x2' })
    expect(nextSnapshot(snap, cur, { force: true }).cards).toEqual(cur.cards)
  })
  it('指纹对首尾空白不敏感，对文字敏感', () => {
    expect(fingerprint(' 题干 ')).toBe(fingerprint('题干'))
    expect(fingerprint('题干')).not.toBe(fingerprint('题干。'))
    expect(fingerprint('题干')).toHaveLength(8)
  })
  it('computeCards：专用题键按章内出现顺序编号', () => {
    const c = computeCards([{ id: 'a', stems: ['s0'], predictLabs: ['lab'] }], [['q0', [], '', 'a'], ['q1', [], '', 'b'], ['q2', [], '', 'a']])
    expect(Object.keys(c.cards)).toEqual(['a#0', 'a#c0', 'a#c1'])
    expect(c.predictions).toEqual(['lab'])
  })
})
