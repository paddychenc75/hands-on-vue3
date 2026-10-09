import { describe, expect, it, vi } from 'vitest'
import { PROGRESS_EVENT, STORE_KEY, createProgressStore, readLegacyValues, type StorageLike } from '../../course/engine/store.ts'
import type { MigrationContext } from '../../course/engine/logic/migrate.ts'

/** 内存里的假 localStorage */
function fakeStorage(init: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(init))
  return {
    data,
    get length() {
      return data.size
    },
    key: i => [...data.keys()][i] ?? null,
    getItem: k => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v)
  }
}
const ctx: MigrationContext = { chapters: [{ id: 'refs', scAnswers: [1], exercises: ['refsFill'] }] }
const legacy = () => ({
  'vue3deep:done': JSON.stringify({ refs: true }),
  'vue3deep:sc': JSON.stringify({ 'refs:0': 1 }),
  'vue3deep:ex': JSON.stringify({ refsFill: true }),
  'vue3deep:revAt': JSON.stringify({ refs: { t: 1, n: 1 } })
})

describe('存储键', () => {
  it('进度存进单个键 hands-on-vue3-v1，事件名固定', () => {
    expect(STORE_KEY).toBe('hands-on-vue3-v1')
    expect(PROGRESS_EVENT).toBe('hov-progress')
  })
})

describe('读写', () => {
  it('save 写出 JSON，新实例 init 能读回来', () => {
    const storage = fakeStorage()
    const a = createProgressStore({ storage })
    a.init()
    a.cp('refs').sc[0] = 1
    a.save()
    expect(JSON.parse(storage.data.get(STORE_KEY)!)).toEqual({ refs: { sc: { 0: 1 }, ex: {}, done: false } })
    const b = createProgressStore({ storage })
    expect(b.init().refs.sc[0]).toBe(1)
  })

  it('cp 没有就建一份空的，有就返回同一份', () => {
    const s = createProgressStore({ storage: fakeStorage() })
    expect(s.cp('a')).toEqual({ sc: {}, ex: {}, done: false })
    expect(s.cp('a')).toBe(s.cp('a'))
  })

  it('存的 JSON 坏了：当空进度，不抛错，也不触发迁移', () => {
    const storage = fakeStorage({ [STORE_KEY]: '{坏', ...legacy() })
    const s = createProgressStore({ storage })
    expect(s.init(ctx)).toEqual({})
  })

  it('写不进去（隐私模式等）：忽略，不抛错', () => {
    const storage = fakeStorage()
    storage.setItem = () => {
      throw new Error('quota')
    }
    const s = createProgressStore({ storage })
    s.init()
    expect(() => s.commit()).not.toThrow()
  })

  it('init 只读一次：之后内存里的改动不会被存储里的旧值冲掉', () => {
    const storage = fakeStorage({ [STORE_KEY]: JSON.stringify({ refs: { sc: {}, ex: {}, done: true } }) })
    const s = createProgressStore({ storage })
    s.init()
    s.cp('refs').done = false
    s.init()
    expect(s.progress.refs.done).toBe(false)
  })
})

describe('SSR 安全：没有 localStorage 时进度为空', () => {
  it('没有 storage 和 target：init、save、emit、subscribe 都不报错，进度是空对象', () => {
    const s = createProgressStore()
    expect(s.init(ctx)).toEqual({})
    expect(() => {
      s.save()
      s.emit()
      s.commit()
      s.subscribe(() => {})()
    }).not.toThrow()
    expect(s.progress).toEqual({})
  })

  it('默认实例在 Node（没有 window）里导入时是空壳', async () => {
    const m = await import('../../course/engine/store.ts')
    expect(m.progress).toEqual({})
    expect(m.initProgress(ctx)).toEqual({})
  })
})

describe('一次性迁移', () => {
  it('新键不存在、旧键存在：迁过来，并写出新键；旧键不删', () => {
    const storage = fakeStorage(legacy())
    const s = createProgressStore({ storage })
    const p = s.init(ctx)
    expect(p.refs.done).toBe(true)
    expect(p.refs.sc[0]).toBe(1)
    expect(p.refs.ex.refsFill.passed).toBe(true)
    expect(storage.data.has(STORE_KEY)).toBe(true)
    for (const k of Object.keys(legacy())) expect(storage.data.has(k)).toBe(true)
    expect(storage.data.get('vue3deep:revAt')).toBe(legacy()['vue3deep:revAt'])
  })

  it('新键已经存在：不迁移，旧键的内容不会覆盖新进度', () => {
    const storage = fakeStorage({ ...legacy(), [STORE_KEY]: JSON.stringify({ refs: { sc: {}, ex: {}, done: false } }) })
    const p = createProgressStore({ storage }).init(ctx)
    expect(p.refs.done).toBe(false)
  })

  it('迁过一次后，再开一个新实例不会再迁（读新键）', () => {
    const storage = fakeStorage(legacy())
    createProgressStore({ storage }).init(ctx)
    const s2 = createProgressStore({ storage })
    s2.cp // 触发不了迁移：没有 ctx 也能读到新键
    expect(s2.init().refs.done).toBe(true)
  })

  it('只有不迁的旧键（revAt、quiz3）：不迁，也不写新键', () => {
    const storage = fakeStorage({ 'vue3deep:revAt': '{}', 'vue3deep:quiz3': '{}' })
    expect(createProgressStore({ storage }).init(ctx)).toEqual({})
    expect(storage.data.has(STORE_KEY)).toBe(false)
  })

  it('没传 ctx 时先不迁；之后带 ctx 再 init 才迁', () => {
    const storage = fakeStorage(legacy())
    const s = createProgressStore({ storage })
    expect(s.init()).toEqual({})
    expect(s.init(ctx).refs.done).toBe(true)
  })

  it('readLegacyValues：只读 vue3deep: 前缀的键，去掉前缀，坏 JSON 跳过', () => {
    const storage = fakeStorage({ 'vue3deep:done': '{"a":true}', 'vue3deep:bad': '{x', other: '1', 'vue3deep:ex:foo': '{"tpl":"t","js":"j"}' })
    expect(readLegacyValues(storage)).toEqual({ done: { a: true }, 'ex:foo': { tpl: 't', js: 'j' } })
  })
})

describe('订阅变化', () => {
  it('emit 发出进度变化事件，订阅者收到；取消订阅后不再收到', () => {
    const target = new EventTarget()
    const s = createProgressStore({ storage: fakeStorage(), target })
    const fn = vi.fn()
    const off = s.subscribe(fn)
    s.emit()
    s.commit()
    expect(fn).toHaveBeenCalledTimes(2)
    off()
    s.emit()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('直接监听事件名也能收到', () => {
    const target = new EventTarget()
    const s = createProgressStore({ storage: fakeStorage(), target })
    const fn = vi.fn()
    target.addEventListener(PROGRESS_EVENT, fn)
    s.emit()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('另一个标签页改了进度（storage 事件）：重新读入并通知；别的键的 storage 事件忽略', () => {
    const target = new EventTarget()
    const storage = fakeStorage()
    const s = createProgressStore({ storage, target })
    s.init()
    const fn = vi.fn()
    s.subscribe(fn)
    storage.setItem(STORE_KEY, JSON.stringify({ refs: { sc: { 0: 1 }, ex: {}, done: true } }))
    target.dispatchEvent(Object.assign(new Event('storage'), { key: 'other' }))
    expect(fn).not.toHaveBeenCalled()
    target.dispatchEvent(Object.assign(new Event('storage'), { key: STORE_KEY }))
    expect(fn).toHaveBeenCalledTimes(1)
    expect(s.progress.refs.done).toBe(true)
  })
})

describe('改动时间戳（跨设备同步用）', () => {
  it('保存时给变了的练习草稿和笔记盖章；读进来的旧数据不盖章', () => {
    const old = { refs: { sc: {}, ex: { f: { passed: false, code: { tpl: 'a', js: 'b' }, fails: 1 } }, done: false } }
    const storage = fakeStorage({ [STORE_KEY]: JSON.stringify(old) })
    let t = 1000
    const s = createProgressStore({ storage, now: () => t })
    s.init()
    s.save()
    expect(JSON.parse(storage.data.get(STORE_KEY)!)).toEqual(old) // 内容没变：没有任何新字段
    t = 2000
    s.cp('refs').ex.f.code = { tpl: 'a2', js: 'b' }
    s.cp('refs').note = '想法'
    s.save()
    const saved = JSON.parse(storage.data.get(STORE_KEY)!)
    expect(saved.refs.ex.f.t).toBe(2000)
    expect(saved.refs.ts).toEqual({ note: 2000 })
    expect(saved.refs.sc).toEqual({}) // 现有字段不变
  })
  it('resyncStamps 之后，换进来的内容不会被盖成刚改的', () => {
    const s = createProgressStore({ storage: fakeStorage(), now: () => 5000 })
    s.init()
    Object.assign(s.progress, { refs: { sc: {}, ex: { f: { passed: false, fails: 2 } }, done: false } })
    s.resyncStamps()
    s.save()
    expect(s.progress.refs.ex.f.t).toBeUndefined()
  })
  it('每次 save 发 hov-saved 事件', () => {
    const target = new EventTarget()
    const fn = vi.fn()
    target.addEventListener('hov-saved', fn)
    const s = createProgressStore({ storage: fakeStorage(), target })
    s.init()
    s.save()
    s.commit()
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
