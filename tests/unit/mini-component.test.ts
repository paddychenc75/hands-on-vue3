// 迷你 Vue 的组件运行时与真实 Vue 对照（第 31 章）：父子组件的渲染次数、钩子顺序、更新队列的顺序、
// provide / inject、卸载、侦听器的 flush 时机。每个场景在两份实现上各跑一遍，比较宿主操作序列和事件序列。
import { describe, expect, it } from 'vitest'
import { same } from './mini-helpers'

describe('挂载：setup、render、mounted 的顺序', () => {
  it('父子嵌套：App setup → App render → Counter setup → Counter render → 子的 mounted 先于父的 mounted', async () => {
    const r = await same(({ api: { h, onMounted, onBeforeMount }, createApp, host, log }) => {
      const Counter = {
        props: ['count'],
        setup(props: any) {
          log('Counter setup')
          onBeforeMount(() => log('Counter beforeMount'))
          onMounted(() => log('Counter mounted'))
          return () => { log('Counter render'); return h('i', null, 'count = ' + props.count) }
        }
      }
      const App = {
        setup() {
          log('App setup')
          onBeforeMount(() => log('App beforeMount'))
          onMounted(() => log('App mounted'))
          return () => { log('App render'); return h('div', null, [h(Counter, { count: 1 }), h('p', null, 'label')]) }
        }
      }
      createApp(App).mount(host.root)
    })
    expect(r.events).toEqual([
      'App setup', 'App beforeMount', 'App render', 'Counter setup', 'Counter beforeMount', 'Counter render',
      'Counter mounted', 'App mounted'
    ])
  })

  it('mounted 运行时，整棵树已经在宿主里了', async () => {
    await same(({ api: { h, onMounted }, createApp, host, log }) => {
      const C = { setup() { onMounted(() => log('C sees ' + host.html())); return () => h('b', null, 'c') } }
      createApp({ setup() { onMounted(() => log('App sees ' + host.html())); return () => h('div', null, [h(C)]) } }).mount(host.root)
    })
  })

  it('函数式组件', async () => {
    await same(({ api: { h }, createApp, host }) => {
      const Hello = (props: any) => h('p', null, 'hello ' + props.name)
      createApp({ setup: () => () => h('div', null, [h(Hello, { name: 'a' })]) }).mount(host.root)
    })
  })
})

describe('更新：父子组件各渲染几次', () => {
  const setupScene = ({ api: { h, ref, onMounted, onUpdated, onBeforeUpdate }, createApp, host, log }: any) => {
    const count = ref(0)
    const label = ref('a')
    const inner = ref(0)
    const Counter = {
      props: ['count'],
      setup(props: any) {
        onBeforeUpdate(() => log('Counter beforeUpdate'))
        onUpdated(() => log('Counter updated'))
        return () => { log('Counter render ' + props.count + '/' + inner.value); return h('i', null, 'count = ' + props.count + ' inner = ' + inner.value) }
      }
    }
    const App = {
      setup() {
        onUpdated(() => log('App updated'))
        onMounted(() => log('App mounted'))
        return () => { log('App render'); return h('div', null, [h(Counter, { count: count.value }), h('p', null, 'label = ' + label.value)]) }
      }
    }
    createApp(App).mount(host.root)
    return { count, label, inner }
  }

  it('同步改三次 count：父子各只渲染一次，updated 子先父后', async () => {
    const r = await same(async (ctx: any) => {
      const s = setupScene(ctx)
      ctx.log('--')
      s.count.value++; s.count.value++; s.count.value++
      await ctx.api.nextTick()
    })
    expect(r.events.filter(e => e === 'App render').length).toBe(2)
    expect(r.events.filter(e => e.startsWith('Counter render')).length).toBe(2)
    expect(r.events.slice(r.events.indexOf('--') + 1)).toEqual([
      'App render', 'Counter beforeUpdate', 'Counter render 3/0', 'Counter updated', 'App updated'
    ])
  })

  it('只改 label：Counter 的 props 没变，不渲染', async () => {
    const r = await same(async (ctx: any) => {
      const s = setupScene(ctx)
      s.label.value = 'b'
      await ctx.api.nextTick()
    })
    expect(r.events.filter(e => e.startsWith('Counter render')).length).toBe(1)
  })

  it('子组件自己的数据变了：只有子组件更新', async () => {
    const r = await same(async (ctx: any) => {
      const s = setupScene(ctx)
      ctx.log('--')
      s.inner.value++
      await ctx.api.nextTick()
    })
    expect(r.events.slice(r.events.indexOf('--') + 1)).toEqual(['Counter beforeUpdate', 'Counter render 0/1', 'Counter updated'])
  })

  it('父改 props 的同时子也改了自己的数据：子组件只渲染一次（父组件更新时直接更新子，队列里的子任务被跳过）', async () => {
    const r = await same(async (ctx: any) => {
      const s = setupScene(ctx)
      ctx.log('--')
      s.inner.value++
      s.count.value++
      await ctx.api.nextTick()
    })
    expect(r.events.slice(r.events.indexOf('--') + 1).filter(e => e.startsWith('Counter render'))).toEqual(['Counter render 1/1'])
  })

  it('emits 声明过的事件监听器变了，不触发子组件更新（shouldUpdateComponent）', async () => {
    const r = await same(async ({ api: { h, ref }, createApp, host, log }: any) => {
      const n = ref(0)
      const Child = {
        props: ['label'],
        emits: ['ping'],
        setup(props: any, { emit }: any) { return () => { log('Child render'); return h('button', { onClick: () => emit('ping', 1) }, 'x') } }
      }
      createApp({ setup: () => () => h('div', null, [h(Child, { onPing: () => n.value, label: 'x' }), h('p', null, String(n.value))]) }).mount(host.root)
      n.value++
      await Promise.resolve()
    })
    expect(r.events.filter(e => e === 'Child render').length).toBe(1)
  })

  it('props 里去掉一个属性：子组件拿到 undefined 并更新', async () => {
    await same(async ({ api: { h, ref, nextTick }, createApp, host, log }: any) => {
      const withX = ref(true)
      const Child = { props: ['x', 'y'], setup: (props: any) => () => { log('x=' + props.x); return h('i', null, String(props.x)) } }
      createApp({ setup: () => () => h('div', null, [h(Child, withX.value ? { x: 1, y: 2 } : { y: 2 })]) }).mount(host.root)
      withX.value = false
      await nextTick()
    })
  })

  it('子组件根节点类型变化：新节点插在旧位置', async () => {
    await same(async ({ api: { h, ref, nextTick }, createApp, host }: any) => {
      const tag = ref('a')
      const Child = { setup: () => () => h(tag.value, null, 'c') }
      createApp({ setup: () => () => h('div', null, [h('p', null, '1'), h(Child), h('p', null, '2')]) }).mount(host.root)
      tag.value = 'b'
      await nextTick()
    })
  })
})

describe('卸载', () => {
  it('v-if 式切换：beforeUnmount 同步运行，unmounted 在后置队列；卸载后数据再变不再渲染', async () => {
    const r = await same(async ({ api: { h, ref, onBeforeUnmount, onUnmounted, watch, nextTick }, createApp, host, log }: any) => {
      const show = ref(true)
      const data = ref(0)
      const Child = {
        setup() {
          onBeforeUnmount(() => log('Child beforeUnmount'))
          onUnmounted(() => log('Child unmounted'))
          watch(data, () => log('Child watch'))
          return () => { log('Child render'); return h('i', null, String(data.value)) }
        }
      }
      createApp({ setup: () => () => h('div', null, show.value ? [h(Child)] : []) }).mount(host.root)
      show.value = false
      data.value++
      await nextTick()
      data.value++
      await nextTick()
    })
    expect(r.events.filter(e => e === 'Child render').length).toBe(1)
    expect(r.events).toContain('Child unmounted')
  })

  it('app.unmount：整棵树的 unmounted 子先父后', async () => {
    await same(async ({ api: { h, onUnmounted, onBeforeUnmount, nextTick }, createApp, host, log }: any) => {
      const mk = (name: string, kids: any[]) => ({
        setup() {
          onBeforeUnmount(() => log(name + ' beforeUnmount'))
          onUnmounted(() => log(name + ' unmounted'))
          return () => h('div', null, kids)
        }
      })
      const C = mk('C', [])
      const app = createApp(mk('P', [h(C)]))
      app.mount(host.root)
      app.unmount()
      await nextTick()
    })
  })
})

describe('provide / inject', () => {
  it('就近取值，没有就用默认值，子孙跨层读取', async () => {
    const r = await same(({ api: { h, provide, inject }, createApp, host, log }: any) => {
      const Leaf = { setup() { const a = inject('a'); const b = inject('b', 'default'); return () => h('i', null, a + '/' + b) } }
      const Mid = { setup() { provide('a', 'mid'); return () => h('div', null, [h(Leaf)]) } }
      const Sibling = { setup() { log('sibling a=' + inject('a', 'none')); return () => h('s') } }
      createApp({ setup() { provide('a', 'root'); provide('b', 'rootB'); return () => h('div', null, [h(Mid), h(Sibling)]) } }).mount(host.root)
    })
    expect(r.events).toEqual(['sibling a=root'])
    expect(r.html).toContain('mid/rootB')
  })
})

describe('侦听器的 flush 时机（和更新队列的关系）', () => {
  const scene = ({ api: { h, ref, watch, watchEffect, onUpdated }, createApp, host, log }: any, flush: string) => {
    const n = ref(0)
    createApp({
      setup() {
        watch(n, v => log('watch ' + flush + ' ' + v + ' dom=' + host.html()), { flush })
        onUpdated(() => log('updated'))
        return () => { log('render ' + n.value); return h('p', null, String(n.value)) }
      }
    }).mount(host.root)
    return n
  }
  for (const flush of ['pre', 'post', 'sync']) {
    it('flush: ' + flush, async () => {
      const r = await same(async (ctx: any) => {
        const n = scene(ctx, flush)
        n.value = 1
        ctx.log('after set')
        await ctx.api.nextTick()
      })
      const i = (e: string) => r.events.findIndex(x => x.startsWith(e))
      if (flush === 'pre') expect(i('watch pre')).toBeLessThan(i('render 1'))
      if (flush === 'post') {
        expect(i('watch post')).toBeGreaterThan(i('render 1')) // 渲染之后
        expect(r.events[i('watch post')]).toContain('<p>1</p>') // 回调里 DOM 已经是新的
      }
      if (flush === 'sync') expect(i('watch sync')).toBeLessThan(i('after set'))
    })
  }

  it('父组件改 props 触发子组件的 pre 侦听器：先于子组件的这次渲染', async () => {
    const r = await same(async ({ api: { h, ref, watch, nextTick }, createApp, host, log }: any) => {
      const n = ref(0)
      const Child = {
        props: ['n'],
        setup(props: any) {
          watch(() => props.n, v => log('child watch ' + v))
          return () => { log('child render ' + props.n); return h('i', null, String(props.n)) }
        }
      }
      createApp({ setup: () => () => h('div', null, [h(Child, { n: n.value })]) }).mount(host.root)
      n.value = 5
      await nextTick()
    })
    expect(r.events.slice(-2)).toEqual(['child watch 5', 'child render 5'])
  })

  it('watchEffect 和 setup 里创建的侦听器：卸载后停止', async () => {
    await same(async ({ api: { h, ref, watchEffect, nextTick }, createApp, host, log }: any) => {
      const n = ref(0)
      const app = createApp({ setup() { watchEffect(() => log('effect ' + n.value)); return () => h('p') } })
      app.mount(host.root)
      n.value++
      await nextTick()
      app.unmount()
      n.value++
      await nextTick()
    })
  })
})

describe('组件列表：keyed diff 里的组件移动', () => {
  it('组件按 key 重排：不重新创建组件，只移动它们的元素', async () => {
    const r = await same(async ({ api: { h, ref, nextTick }, createApp, host, log }: any) => {
      const keys = ref(['a', 'b', 'c', 'd'])
      const Item = { props: ['id'], setup(props: any) { log('setup ' + props.id); return () => h('li', null, props.id) } }
      createApp({ setup: () => () => h('ul', null, keys.value.map((k: string) => h(Item, { key: k, id: k }))) }).mount(host.root)
      keys.value = ['d', 'a', 'c', 'x']
      await nextTick()
    })
    expect(r.events.filter(e => e.startsWith('setup'))).toEqual(['setup a', 'setup b', 'setup c', 'setup d', 'setup x'])
  })
})
