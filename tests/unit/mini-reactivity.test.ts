// 零件 1（响应式核心）与真实的 @vue/reactivity 对照：同一段使用代码在两边各跑一遍，比较 effect 的运行次数和顺序。
import { describe, expect, it } from 'vitest'
import { effectAdapters } from './mini-helpers'

const { mini, real } = effectAdapters()

/** 在两个实现上各跑一次场景，场景把可观察的东西写进 log；断言两份 log 相同，返回其中一份 */
function same(scenario: (api: typeof mini, log: (s: string) => void) => void): string[] {
  const out = [mini, real].map(api => {
    const log: string[] = []
    scenario(api, s => log.push(s))
    return log
  })
  expect(out[0]).toEqual(out[1])
  return out[0]
}

describe('effect 与 reactive', () => {
  it('读取时收集、写入时触发；写入相同的值不触发', () => {
    const log = same(({ effect, reactive }, log) => {
      const s = reactive({ n: 1 })
      effect(() => log('run ' + s.n))
      s.n = 2
      s.n = 2
      s.n = 3
    })
    expect(log).toEqual(['run 1', 'run 2', 'run 3'])
  })

  it('分支切换：不再读取的属性不再触发（依赖清理）', () => {
    const log = same(({ effect, reactive }, log) => {
      const s = reactive({ ok: true, a: 'A', b: 'B' })
      effect(() => log('run ' + (s.ok ? s.a : s.b)))
      s.b = 'B2' // 没读过 b
      s.ok = false
      s.a = 'A2' // 不再读 a
      s.b = 'B3'
    })
    expect(log).toEqual(['run A', 'run B2', 'run B3'])
  })

  it('嵌套对象深度响应；同一个对象只有一个代理', () => {
    same(({ effect, reactive }, log) => {
      const raw = { user: { name: 'a' } }
      const s = reactive(raw)
      log('same proxy ' + (reactive(raw) === s) + ' ' + (reactive(s) === s) + ' ' + (s.user === reactive(raw).user))
      effect(() => log('name ' + s.user.name))
      s.user.name = 'b'
    })
  })

  it('delete 触发', () => {
    same(({ effect, reactive }, log) => {
      const s: any = reactive({ a: 1 })
      effect(() => log('a ' + s.a))
      delete s.a
    })
  })

  it('多个订阅者按订阅顺序运行', () => {
    const log = same(({ effect, reactive }, log) => {
      const s = reactive({ n: 0 })
      effect(() => log('first ' + s.n))
      effect(() => log('second ' + s.n))
      effect(() => log('third ' + s.n))
      s.n = 1
      s.n = 2
    })
    expect(log.slice(3, 6)).toEqual(['first 1', 'second 1', 'third 1'])
  })

  it('嵌套的 effect：内层各自订阅各自的', () => {
    same(({ effect, reactive }, log) => {
      const s = reactive({ outer: 0, inner: 0 })
      effect(() => {
        log('outer ' + s.outer)
        effect(() => log('  inner ' + s.inner))
      })
      s.inner++
      s.outer++
    })
  })

  it('effect 里改自己读取的数据：不会无限循环，只运行一次', () => {
    const log = same(({ effect, reactive }, log) => {
      const s = reactive({ n: 0 })
      effect(() => { log('run'); s.n++ })
    })
    expect(log).toEqual(['run'])
  })

  it('scheduler：触发时调用 scheduler，不直接运行', () => {
    const log = same(({ effect, reactive }, log) => {
      const s = reactive({ n: 0 })
      effect(() => log('run ' + s.n), { scheduler: () => log('scheduled') })
      s.n++
      s.n++
    })
    expect(log).toEqual(['run 0', 'scheduled', 'scheduled'])
  })

  it('lazy：创建时不运行，手动 run 才运行并收集依赖', () => {
    const log = same(({ effect, reactive }, log) => {
      const s = reactive({ n: 0 })
      const e = effect(() => { log('run ' + s.n); return s.n * 2 }, { lazy: true })
      log('created')
      s.n++ // 还没收集过依赖
      log('result ' + e.run())
      s.n++
    })
    expect(log[0]).toBe('created')
  })

  it('stop：之后不再触发；stop 之后手动 run 只执行不订阅', () => {
    same(({ effect, reactive }, log) => {
      const s = reactive({ n: 0 })
      const e = effect(() => log('run ' + s.n))
      s.n++
      e.stop()
      s.n++
      e.run()
      s.n++
    })
  })
})

describe('ref', () => {
  it('.value 读写；相同的值不触发；对象值是深度响应的', () => {
    same(({ effect, ref }, log) => {
      const r = ref(1)
      const o = ref({ a: { b: 1 } })
      effect(() => log('r ' + r.value))
      effect(() => log('o ' + o.value.a.b))
      r.value = 1
      r.value = 2
      o.value.a.b = 5
      o.value = { a: { b: 9 } }
    })
  })
})

describe('computed', () => {
  it('懒计算 + 缓存：读之前不算，依赖不变不重算，依赖变了下次读才重算', () => {
    const log = same(({ computed, reactive }, log) => {
      const s = reactive({ n: 1 })
      const c = computed(() => { log('compute'); return s.n * 2 })
      log('created')
      log('v ' + c.value)
      log('v ' + c.value)
      s.n = 2
      log('after set')
      log('v ' + c.value)
    })
    expect(log).toEqual(['created', 'compute', 'v 2', 'v 2', 'after set', 'compute', 'v 4'])
  })

  it('effect 读 computed：依赖的数据变了，effect 重新运行并拿到新值', () => {
    same(({ computed, effect, reactive }, log) => {
      const s = reactive({ n: 1 })
      const c = computed(() => s.n * 2)
      effect(() => log('effect ' + c.value))
      s.n = 2
      s.n = 3
    })
  })

  it('computed 链：a → b → effect，每个 computed 只多算一次，effect 拿到新值', () => {
    // 不比较 a、b 重新计算的先后：真实版是先检查依赖（a 先算），迷你版是 effect 读 b 时才拉动 a（b 先开始）
    const logs = [mini, real].map(({ computed, effect, reactive }) => {
      const log: string[] = []
      const s = reactive({ n: 1 })
      const a = computed(() => { log.push('a'); return s.n + 1 })
      const b = computed(() => { log.push('b'); return a.value * 2 })
      effect(() => log.push('effect ' + b.value))
      s.n = 5
      return log
    })
    for (const log of logs) {
      expect(log.filter(x => x === 'a').length).toBe(2)
      expect(log.filter(x => x === 'b').length).toBe(2)
      expect(log.filter(x => x.startsWith('effect'))).toEqual(['effect 4', 'effect 12'])
    }
  })

  it('两个 effect 读同一个 computed，computed 只算一次', () => {
    const log = same(({ computed, effect, reactive }, log) => {
      const s = reactive({ n: 1 })
      const c = computed(() => { log('compute'); return s.n })
      effect(() => log('e1 ' + c.value))
      effect(() => log('e2 ' + c.value))
      s.n = 2
    })
    expect(log.filter(x => x === 'compute').length).toBe(2) // 初始一次、变化后一次
  })
})

describe('effectScope', () => {
  it('scope.stop 停掉里面创建的 effect，并运行 onScopeDispose', () => {
    const log = same(({ effectScope, effect, reactive, onScopeDispose }, log) => {
      const s = reactive({ n: 0 })
      const scope = effectScope()
      scope.run(() => {
        effect(() => log('e ' + s.n))
        onScopeDispose(() => log('dispose'))
      })
      s.n++
      scope.stop()
      s.n++
    })
    expect(log).toEqual(['e 0', 'e 1', 'dispose'])
  })

  it('嵌套 scope 随父 scope 一起停；detached 的不会', () => {
    same(({ effectScope, effect, reactive }, log) => {
      const s = reactive({ n: 0 })
      const parent = effectScope()
      parent.run(() => {
        effectScope().run(() => effect(() => log('child ' + s.n)))
        effectScope(true).run(() => effect(() => log('detached ' + s.n)))
      })
      parent.stop()
      s.n++
    })
  })

  it('stop 之后 run 不再执行；getCurrentScope 只在 run 里有值', () => {
    same(({ effectScope, getCurrentScope }, log) => {
      const scope = effectScope()
      log('outside ' + (getCurrentScope() === undefined || getCurrentScope() === null))
      scope.run(() => log('inside ' + (getCurrentScope() === scope)))
      scope.stop()
      scope.run(() => log('should not run'))
    })
  })
})
