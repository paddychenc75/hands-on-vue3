// 迷你 Vue 源码本身的检查：形状、区域标记、和练习环境的兼容性、规模。
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DOM_ORDER, EXERCISE_API_NAMES, PARTS, answer, blank, build, countLines, domSource, note, region, rendererSource } from '../../course/mini'
import { runMini, topLevelNames } from '../../course/mini/load'
import { loadMiniDom, loadMiniRenderer, makeFakeDocument } from './mini-helpers'

const all = Object.entries(PARTS)

describe('每个零件的源码', () => {
  for (const [name, src] of all) {
    it(name + '：纯脚本（没有 import / export）、开头注释写明对应的真实源码和差别', () => {
      expect(src).not.toMatch(/^\s*(import|export)\s/m)
      expect(src).toMatch(/对应真实源码/)
      expect(src).toMatch(/packages\/[a-z-]+\/src\/[A-Za-z]+\.ts|没有直接对应/)
      expect(src).toMatch(/差别/)
    })

    it(name + '：区域标记成对、名字不重复', () => {
      const starts = [...src.matchAll(/^\s*\/\/#region (\S+)\s*$/gm)].map(m => m[1])
      const ends = src.match(/^\s*\/\/#endregion\s*$/gm) ?? []
      expect(ends.length).toBe(starts.length)
      expect(new Set(starts).size).toBe(starts.length)
      for (const r of starts) expect(() => region(src, r)).not.toThrow()
    })

    it(name + '：顶层的 const / let / class 不和练习环境注入的 API 重名（只能用 function 声明）', () => {
      for (const m of src.matchAll(/^(?:const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) {
        expect(EXERCISE_API_NAMES, '顶层 ' + m[1] + ' 和练习环境的 API 重名，要改成 function 声明').not.toContain(m[1])
      }
      for (const m of src.matchAll(/^const\s*\{([^}]*)\}/gm)) {
        for (const part of m[1].split(',')) {
          const local = part.split(':').pop()!.trim()
          expect(EXERCISE_API_NAMES).not.toContain(local)
        }
      }
    })
  }

  it('EXERCISE_API_NAMES 覆盖 Exercise.vue 里注入的 API（那边加了名字，这里要同步）', () => {
    const vue = fs.readFileSync(path.resolve(import.meta.dirname, '../../course/.vitepress/theme/components/Exercise.vue'), 'utf8')
    const block = vue.slice(vue.indexOf('API = {'), vue.indexOf('RUN = {'))
    const used = [...block.matchAll(/\bV\.(\w+)/g)].map(m => m[1])
    expect(used.length).toBeGreaterThan(20)
    for (const n of used) expect(EXERCISE_API_NAMES, n + ' 是 Exercise.vue 注入的，要加进 EXERCISE_API_NAMES').toContain(n)
  })
})

describe('拼出的脚本在练习环境里能直接运行', () => {
  it('DOM 形态：new Function、没有模块系统、真实 API 被作为参数注入；function 声明覆盖同名参数', () => {
    const dom = loadMiniDom(makeFakeDocument())
    // reactive、ref、computed、watch、nextTick、onMounted、provide、inject……都是迷你版自己的（没有被注入的真实版挡住）
    for (const n of ['reactive', 'ref', 'computed', 'watch', 'watchEffect', 'nextTick', 'onMounted', 'provide', 'inject', 'effectScope', 'onScopeDispose']) {
      expect(dom[n].toString(), n).not.toMatch(/\[native code\]/)
    }
    const r = dom.ref(1)
    expect(r.__v_isRef).toBe(true) // 真实 ref 的标记也是 __v_isRef，换成 isRef 的话两边无法区分，这里确认确实是迷你版
    expect(dom.activeEffect).toBe(null)
  })

  it('如果有人把顶层改成 const 声明同名变量，在注入同名参数的环境里是语法错误', () => {
    expect(() => runMini('const ref = 1', { injected: { ref: () => 0 } })).toThrow(/already been declared/)
    expect(() => runMini('function ref() { return 1 }', { injected: { ref: () => 0 } })).not.toThrow()
  })

  it('createRenderer 形态', () => {
    const api = loadMiniRenderer() as any
    expect(typeof api.createRenderer).toBe('function')
    expect(api.createRenderer.toString()).toContain('options')
  })

  it('每个 DOM 形态的前缀（只学到第 N 章）都能单独运行', () => {
    for (const upTo of DOM_ORDER) expect(() => loadMiniDom(makeFakeDocument(), upTo), upTo).not.toThrow()
  })
})

describe('区域标记工具', () => {
  it('answer 去掉标记；blank 换掉整段并保留缩进；build 一步生成；note 在区域前加一行注释', () => {
    const src = ['function f() {', '  //#region inner', '  const a = 1', '  const b = 2', '  //#endregion', '  return a', '}'].join('\n')
    expect(answer(src)).toBe(['function f() {', '  const a = 1', '  const b = 2', '  return a', '}'].join('\n'))
    expect(build(src, { inner: '// TODO\nconst a = 0' })).toBe(['function f() {', '  // TODO', '  const a = 0', '  return a', '}'].join('\n'))
    expect(answer(blank(src, 'inner', '/* ✏️ */'))).toContain('  /* ✏️ */\n  return a')
    expect(answer(note(src, 'inner', '这是你在第 28 章写的'))).toContain('  // 这是你在第 28 章写的\n  const a = 1')
    expect(region(src, 'inner')).toBe('  const a = 1\n  const b = 2')
    expect(() => blank(src, 'nope', 'x')).toThrow(/找不到区域/)
  })

  it('嵌套区域：外层挖空时内层标记一起消失', () => {
    const src = '//#region outer\na\n//#region inner\nb\n//#endregion\nc\n//#endregion\nd'
    expect(build(src, { outer: 'X' })).toBe('X\nd')
    expect(build(src, { inner: 'Y' })).toBe('a\nY\nc\nd')
  })

  it('真实零件里的挖空：每个挖空后的脚本仍然是合法的 JavaScript（语法）', () => {
    const full = domSource()
    const names = [...full.matchAll(/^\s*\/\/#region (\S+)\s*$/gm)].map(m => m[1])
    for (const n of names) {
      const src = build(full, { [n]: '// TODO' })
      expect(() => new Function('document', 'Promise', src), n).not.toThrow()
    }
  })
})

describe('规模', () => {
  it('DOM 形态全套的代码行数（不含注释和空行）不超过预算，防止零件越写越胖', () => {
    const n = countLines(domSource())
    expect(n.code).toBeLessThan(680)
    expect(n.total).toBeLessThan(780)
    expect(countLines(rendererSource()).code).toBeLessThan(760)
  })
  it('零件自身：topLevelNames 能抓到所有顶层声明', () => {
    expect(topLevelNames(PARTS.reactivity)).toEqual(expect.arrayContaining(['track', 'trigger', 'reactive', 'effect', 'ref', 'computed', 'targetMap']))
  })
})
