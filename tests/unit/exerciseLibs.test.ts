// 练习运行环境里的真实库（libs: ['pinia', 'vue-router']）：名字清单、每次运行的全新环境、memory history 守卫，以及 libs 字段的校验。
// 浏览器里的行为（同一份 Vue、响应式、RouterView 切换）由 tests/site/exercises.test.js 里 16、17 章的示范练习覆盖。
import { beforeAll, describe, expect, it } from 'vitest'
import * as piniaMod from 'pinia'
import * as routerMod from 'vue-router'
import { createApp } from 'vue'
import { LIB_NAMES, LIB_NAMESPACE, LIB_SKIPPED, createLibScope, disposeLibs, installRouter, libCompletionNames, loadLibs } from '../../course/.vitepress/theme/composables/exerciseLibs'
import type { LibRun } from '../../course/.vitepress/theme/composables/exerciseLibs'
import { collect } from '../../scripts/lib/collect.mjs'
import { EXERCISE_LIB_NAMES, applyExemptions, validate } from '../../scripts/lib/validate.mjs'
import { KNOWN_ISSUES } from '../../scripts/lib/known-issues.mjs'

const real = { pinia: Object.keys(piniaMod), 'vue-router': Object.keys(routerMod) } as const

describe('注入的名字清单', () => {
  for (const lib of ['pinia', 'vue-router'] as const) {
    it(`${lib}：注入的名字都是真实导出`, () => {
      for (const n of LIB_NAMES[lib]) expect(real[lib], n).toContain(n)
    })
    it(`${lib}：真实导出 = 注入的 + 故意不注入的（库升级后新增的导出会让这里失败，提醒更新清单）`, () => {
      expect([...LIB_NAMES[lib], ...LIB_SKIPPED[lib]].sort()).toEqual([...real[lib]].sort())
    })
    it(`${lib}：校验脚本里的名字表与运行器一致`, () => {
      expect([...EXERCISE_LIB_NAMES[lib]].sort()).toEqual([...LIB_NAMES[lib], LIB_NAMESPACE[lib]].sort())
    })
  }
  it('补全名单只含声明了的库，并带命名空间', () => {
    expect(libCompletionNames(undefined)).toEqual([])
    const p = libCompletionNames(['pinia'])
    expect(p).toContain('defineStore')
    expect(p).toContain('Pinia')
    expect(p).not.toContain('createRouter')
  })
  it('注入的名字不与练习脚本里已有的 Vue 名字冲突', () => {
    const vueNames = ['ref', 'reactive', 'computed', 'watch', 'h', 'createApp', 'inject', 'provide']
    for (const n of [...LIB_NAMES.pinia, ...LIB_NAMES['vue-router']]) expect(vueNames).not.toContain(n)
  })
})

describe('每次运行的环境', () => {
  const load = () => loadLibs(['pinia', 'vue-router'])
  it('没声明的库不加载', async () => {
    expect(await loadLibs(undefined)).toEqual({ pinia: undefined, router: undefined })
    const m = await loadLibs(['pinia'])
    expect(m.pinia).toBeTruthy()
    expect(m.router).toBeUndefined()
  })
  it('只给声明了的库造名字；pinia 每次运行是新的实例', async () => {
    const mods = await load()
    const a: LibRun = { mods }, b: LibRun = { mods }
    const sa = createLibScope(mods, a), sb = createLibScope(mods, b)
    expect(typeof sa.defineStore).toBe('function')
    expect(typeof sa.RouterView).toBe('object')
    expect(sa.Pinia).toBeTruthy()
    expect(sa.VueRouter).toBeTruthy()
    expect(a.pinia).toBeTruthy()
    expect(a.pinia).not.toBe(b.pinia)
    const only = createLibScope({ pinia: mods.pinia }, { mods: { pinia: mods.pinia } })
    expect(only.createRouter).toBeUndefined()
  })
  it('createWebHistory / createWebHashHistory 给出明确的错误（含命名空间上的）', async () => {
    const mods = await load()
    const s: any = createLibScope(mods, { mods })
    expect(() => s.createWebHistory()).toThrow(/不能用 createWebHistory.*createMemoryHistory/)
    expect(() => s.createWebHashHistory()).toThrow(/createWebHashHistory/)
    expect(() => s.VueRouter.createWebHistory()).toThrow(/createWebHistory/)
  })
  it('createRouter 只接受 createMemoryHistory 创建的 history，且一次运行只能创建一个', async () => {
    const mods = await load()
    const run: LibRun = { mods }
    const s: any = createLibScope(mods, run)
    expect(() => s.createRouter({ history: { fake: true }, routes: [] })).toThrow(/必须是 createMemoryHistory/)
    const r = s.createRouter({ history: s.createMemoryHistory(), routes: [{ path: '/', component: {} }] })
    expect(run.createdRouter).toBe(r)
    expect(() => s.createRouter({ history: s.createMemoryHistory(), routes: [] })).toThrow(/只能创建一个/)
    // 直接用真实库造的 memory history 也不行：必须经过运行器的 createMemoryHistory
    expect(() => (createLibScope(mods, { mods }) as any).createRouter({ history: routerMod.createMemoryHistory(), routes: [] })).toThrow(/必须是 createMemoryHistory/)
  })
  it('installRouter：创建了却没返回 router -> 报错；返回了 -> 装上', async () => {
    const mods = await load()
    const run: LibRun = { mods }
    const s: any = createLibScope(mods, run)
    const router = s.createRouter({ history: s.createMemoryHistory(), routes: [{ path: '/', component: {} }] })
    const app = createApp({})
    const onError = () => {}
    expect(() => installRouter(app, run, { count: 1 }, onError)).toThrow(/没有 router/)
    installRouter(app, run, { router }, onError)
    expect(run.router).toBe(router)
  })
  it('没有创建 router 时 installRouter 什么也不做（起始代码还没写 router 的情况）', async () => {
    const mods = await load()
    const run: LibRun = { mods }
    installRouter(createApp({}), run, {}, () => {})
    expect(run.router).toBeUndefined()
  })
  it('disposeLibs 停掉 pinia，传 null 也不报错', async () => {
    const mods = await load()
    const run: LibRun = { mods }
    createLibScope(mods, run)
    disposeLibs(run)
    disposeLibs(null)
  })
})

describe('libs 字段的校验', () => {
  let base: any
  beforeAll(async () => { base = await collect() })
  const run = (inp: any) => applyExemptions(validate(inp).errors, KNOWN_ISSUES).errors.map((e: any) => e.text as string)
  const edit = (file: string, id: string, patch: Record<string, unknown>) => ({
    ...base,
    exercises: { ...base.exercises, [file]: { ...base.exercises[file], [id]: { ...base.exercises[file][id], ...patch } } },
  })
  const has = (errs: string[], re: RegExp) => expect(errs.some(e => re.test(e)), `应当报出 ${re}，实际：\n${errs.join('\n')}`).toBe(true)
  const id = () => Object.keys(base.exercises['03-refs'])[0]

  it('合法取值通过（一个或两个库）', () => {
    expect(run(edit('03-refs', id(), { libs: ['pinia'] }))).toEqual([])
    expect(run(edit('03-refs', id(), { libs: ['pinia', 'vue-router'] }))).toEqual([])
  })
  it('未知的库、空数组、不是数组、重复 -> 报错', () => {
    has(run(edit('03-refs', id(), { libs: ['vuex'] })), /未知的库 "vuex"/)
    has(run(edit('03-refs', id(), { libs: [] })), /libs 必须是非空数组/)
    has(run(edit('03-refs', id(), { libs: 'pinia' })), /libs 必须是非空数组/)
    has(run(edit('03-refs', id(), { libs: ['pinia', 'pinia'] })), /libs 里有重复项/)
  })
  it('脚本里声明了会被注入的同名变量 -> 报错；没声明 libs 时不管', () => {
    const ex = base.exercises['03-refs'][id()]
    const clash = { js: ex.js + '\nfunction defineStore(id, setup) {}\nconst { useRoute } = Vue' }
    const errs = run(edit('03-refs', id(), { ...clash, libs: ['pinia', 'vue-router'] }))
    has(errs, /js 里声明了 defineStore/)
    has(errs, /js 里声明了 useRoute/)
    expect(run(edit('03-refs', id(), { ...clash, libs: ['pinia'] })).some(e => /useRoute/.test(e))).toBe(false)
    expect(run(edit('03-refs', id(), clash)).some(e => /声明了 defineStore/.test(e))).toBe(false)
  })
})
