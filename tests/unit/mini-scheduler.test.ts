// 零件 2（调度器）和零件 3（watch、effectScope）与真实 Vue 对照。
// 真实的 queueJob 没有对外导出，所以调度器的规则（去重、按 id 排序、pre 在前、后置队列）直接断言，
// 并通过 watch（它用同一个队列）和 queuePostFlushCb 与真实版对照。
import * as RealCore from '@vue/runtime-core'
import { describe, expect, it } from 'vitest'
import { loadMiniCore } from './mini-helpers'

const m = loadMiniCore('watch')
const R = RealCore as any

/** 同一个场景在两份实现上各跑一次（场景是 async 的：可以 await nextTick），断言事件序列相同 */
async function same(scenario: (api: any, log: (s: string) => void) => Promise<void> | void) {
  const out: string[][] = []
  for (const api of [m, R]) {
    const log: string[] = []
    await scenario(api, s => log.push(s))
    out.push(log)
  }
  expect(out[0]).toEqual(out[1])
  return out[0]
}

describe('queueJob / flushJobs / nextTick（直接断言）', () => {
  const job = (log: string[], name: string, id?: number) => {
    const j: any = () => log.push(name)
    if (id !== undefined) j.id = id
    return j
  }

  it('同一个任务多次入队只运行一次；入队时不立即运行', async () => {
    const log: string[] = []
    const a = job(log, 'a', 1)
    m.queueJob(a); m.queueJob(a); m.queueJob(a)
    expect(log).toEqual([])
    await m.nextTick()
    expect(log).toEqual(['a'])
  })

  it('不管入队顺序，按 id 从小到大运行；没有 id 的排最后', async () => {
    const log: string[] = []
    m.queueJob(job(log, 'c', 3)); m.queueJob(job(log, 'none')); m.queueJob(job(log, 'a', 1)); m.queueJob(job(log, 'b', 2))
    await m.nextTick()
    expect(log).toEqual(['a', 'b', 'c', 'none'])
  })

  it('同一个 id 的前置任务排在更新任务前面；没有 id 的前置任务排最前', async () => {
    const log: string[] = []
    const upd = job(log, 'update1', 1)
    const pre: any = job(log, 'pre1', 1); pre.pre = true
    const preNoId: any = job(log, 'preNoId'); preNoId.pre = true
    m.queueJob(upd); m.queueJob(pre); m.queueJob(preNoId); m.queueJob(job(log, 'update0', 0))
    await m.nextTick()
    expect(log).toEqual(['preNoId', 'update0', 'pre1', 'update1'])
  })

  it('任务运行时让别的任务入队，同一次刷新里运行；id 更小的也排在当前任务之后立刻运行', async () => {
    const log: string[] = []
    const early = job(log, 'early', 1)
    const late = job(log, 'late', 9)
    const trigger: any = () => { log.push('trigger'); m.queueJob(late); m.queueJob(early) }
    trigger.id = 5
    m.queueJob(trigger)
    await m.nextTick()
    expect(log).toEqual(['trigger', 'early', 'late'])
  })

  it('已经运行过的任务可以再次入队；不允许递归的任务，运行期间让自己入队会被忽略', async () => {
    const log: string[] = []
    let n = 0
    const self: any = () => { log.push('self'); if (n++ < 2) m.queueJob(self) }
    self.id = 1
    m.queueJob(self)
    await m.nextTick()
    expect(log).toEqual(['self'])
    n = 0
    const rec: any = () => { log.push('rec'); if (n++ < 2) m.queueJob(rec) }
    rec.id = 1; rec.allowRecurse = true
    m.queueJob(rec)
    await m.nextTick()
    expect(log).toEqual(['self', 'rec', 'rec', 'rec'])
  })

  it('disposed 的任务被跳过', async () => {
    const log: string[] = []
    const a: any = job(log, 'a', 1); a.disposed = true
    m.queueJob(a); m.queueJob(job(log, 'b', 2))
    await m.nextTick()
    expect(log).toEqual(['b'])
  })

  it('nextTick：在已安排的刷新（含后置任务）结束之后；没有刷新时在下一个微任务', async () => {
    const log: string[] = []
    m.queueJob(job(log, 'job', 1))
    m.queuePostFlushCb(() => log.push('post'))
    const p = m.nextTick(() => log.push('tick callback'))
    log.push('sync end')
    await p
    expect(log).toEqual(['sync end', 'job', 'post', 'tick callback'])
    const q = m.nextTick().then(() => log.push('idle tick'))
    log.push('after')
    await q
    expect(log.slice(-2)).toEqual(['after', 'idle tick'])
  })

  it('后置队列：去重；有 id 的按 id 排序，没有 id 的保持入队顺序；后置任务里再入队的更新任务接着刷新', async () => {
    const log: string[] = []
    const dup = () => log.push('dup')
    m.queuePostFlushCb(dup); m.queuePostFlushCb(dup)
    const p2: any = () => log.push('id2'); p2.id = 2
    const p1: any = () => log.push('id1'); p1.id = 1
    m.queuePostFlushCb(p2); m.queuePostFlushCb(() => log.push('none')); m.queuePostFlushCb(p1)
    m.queuePostFlushCb(() => m.queueJob(job(log, 'job from post', 1)))
    await m.nextTick()
    await m.nextTick()
    expect(log).toEqual(['id1', 'id2', 'dup', 'none', 'job from post'])
  })

  it('真实 Vue 的后置队列顺序相同', async () => {
    const run = async (api: any) => {
      const log: string[] = []
      const dup = () => log.push('dup')
      api.queuePostFlushCb(dup); api.queuePostFlushCb(dup)
      const p2: any = () => log.push('id2'); p2.id = 2
      const p1: any = () => log.push('id1'); p1.id = 1
      api.queuePostFlushCb(p2); api.queuePostFlushCb(() => log.push('none')); api.queuePostFlushCb(p1)
      await api.nextTick()
      return log
    }
    expect(await run(m)).toEqual(await run(R))
  })
})

describe('watch：与真实 Vue 对照', () => {
  it('回调收到 (新值, 旧值)；同步改三次只运行一次（合并到微任务）', async () => {
    const log = await same(async ({ ref, watch, nextTick }, log) => {
      const n = ref(0)
      watch(n, (v: number, old: number) => log('cb ' + old + ' → ' + v))
      n.value++; n.value++; n.value++
      log('sync end')
      await nextTick()
    })
    expect(log).toEqual(['sync end', 'cb 0 → 3'])
  })

  it('新值和旧值相同时不调用回调（改了又改回去）', async () => {
    const log = await same(async ({ ref, watch, nextTick }, log) => {
      const n = ref(0)
      watch(n, () => log('cb'))
      n.value = 1; n.value = 0
      await nextTick()
    })
    expect(log).toEqual([])
  })

  it('immediate：创建时立刻调用一次，旧值是 undefined', async () => {
    await same(async ({ ref, watch, nextTick }, log) => {
      const n = ref(1)
      watch(n, (v: number, old: number) => log('cb ' + old + ' → ' + v), { immediate: true })
      n.value = 2
      await nextTick()
    })
  })

  it('getter 作为来源；getter 返回的对象每次都新建时每次都触发', async () => {
    await same(async ({ reactive, watch, nextTick }, log) => {
      const s = reactive({ a: 1, b: 2 })
      watch(() => s.a + s.b, (v: number, old: number) => log('sum ' + old + ' → ' + v))
      watch(() => ({ a: s.a }), () => log('object getter'))
      s.b = 3
      await nextTick()
    })
  })

  it('reactive 对象作为来源默认深度侦听；ref 里的对象需要 deep', async () => {
    await same(async ({ reactive, ref, watch, nextTick }, log) => {
      const s = reactive({ a: { b: 1 } })
      const r = ref({ a: { b: 1 } })
      watch(s, () => log('reactive deep'))
      watch(r, () => log('ref shallow'))
      watch(r, () => log('ref deep'), { deep: true })
      s.a.b++
      r.value.a.b++
      await nextTick()
    })
  })

  it('onCleanup：在下一次回调之前和停止时运行', async () => {
    const log = await same(async ({ ref, watch, nextTick }, log) => {
      const n = ref(0)
      const stop = watch(n, (v: number, _o: number, onCleanup: any) => {
        log('cb ' + v)
        onCleanup(() => log('cleanup ' + v))
      })
      n.value = 1; await nextTick()
      n.value = 2; await nextTick()
      stop()
      log('stopped')
    })
    expect(log).toEqual(['cb 1', 'cleanup 1', 'cb 2', 'cleanup 2', 'stopped'])
  })

  it('stop 之后不再运行，包括已经排进队列、还没运行的那一次', async () => {
    const log = await same(async ({ ref, watch, nextTick }, log) => {
      const n = ref(0)
      const stop = watch(n, () => log('cb'))
      n.value++
      stop()
      await nextTick()
      n.value++
      await nextTick()
    })
    expect(log).toEqual([])
  })

  it('flush: post 在更新队列之后；flush: sync 立刻运行', async () => {
    await same(async ({ ref, watch, nextTick }, log) => {
      const n = ref(0)
      watch(n, () => log('pre'))
      watch(n, () => log('post'), { flush: 'post' })
      watch(n, () => log('sync'), { flush: 'sync' })
      n.value++
      log('after set')
      await nextTick()
    })
  })

  it('回调里改自己的来源：允许再触发一次，直到稳定', async () => {
    const log = await same(async ({ ref, watch, nextTick }, log) => {
      const n = ref(0)
      watch(n, (v: number) => { log('cb ' + v); if (v < 3) n.value++ })
      n.value++
      await nextTick()
      await nextTick()
    })
    expect(log).toEqual(['cb 1', 'cb 2', 'cb 3'])
  })
})

describe('watchEffect：与真实 Vue 对照', () => {
  it('创建时立刻运行；依赖变了重新运行；onCleanup 在重新运行前、停止时运行', async () => {
    const log = await same(async ({ ref, watchEffect, nextTick }, log) => {
      const n = ref(0)
      const stop = watchEffect((onCleanup: any) => {
        log('run ' + n.value)
        onCleanup(() => log('cleanup ' + n.value))
      })
      log('created')
      n.value++; n.value++
      await nextTick()
      stop()
    })
    expect(log).toEqual(['run 0', 'created', 'cleanup 2', 'run 2', 'cleanup 2'])
  })

  it('flush: post 的 watchEffect 第一次运行也延后到后置队列', async () => {
    await same(async ({ ref, watchEffect, nextTick }, log) => {
      const n = ref(0)
      watchEffect(() => log('post ' + n.value), { flush: 'post' })
      log('created')
      await nextTick()
      n.value++
      await nextTick()
    })
  })
})
