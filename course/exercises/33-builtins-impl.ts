import type { Exercise } from './types'
import { sub } from './types'

// 两道练习都不需要渲染器内部接口：迷你 KeepAlive 和迷你 Transition 直接操作 DOM，
// 机制和真实实现一致（搬家、按帧加减 class），差别写在章里。
// 练习脚本里的函数用 function 声明，避免和练习环境提供的同名参数冲突。

// ---------------------------------------------------------------------------
// 练习 1：迷你 KeepAlive
// ---------------------------------------------------------------------------

const KA_SOL = `function createKeepAlive(container, { max, create, on }) {
  const storage = document.createElement('div')   // 隐藏容器：从不挂到页面上
  const cache = new Map()                         // key -> el
  const keys = new Set()                          // 使用顺序：最前面最久没用
  let current = null

  function show(key) {
    if (key === current) return
    if (current !== null) {
      storage.appendChild(cache.get(current))     // 失活：DOM 搬进隐藏容器，不销毁
      on.deactivated(current)
    }
    if (cache.has(key)) {
      keys.delete(key)                            // 命中：移到最近使用的位置
      keys.add(key)
      container.appendChild(cache.get(key))       // 激活：DOM 搬回页面
    } else {
      const el = create(key)
      cache.set(key, el)
      keys.add(key)
      container.appendChild(el)
      on.mounted(key)
      if (max && keys.size > max) {
        const oldest = keys.values().next().value // Set 保持插入顺序：第一个就是最久没用的
        cache.get(oldest).remove()
        cache.delete(oldest)
        keys.delete(oldest)
        on.destroyed(oldest)
      }
    }
    current = key
    on.activated(key)
  }

  return { show, keys: () => [...keys] }
}
`

const KA_START = `// ===== 你要写的：迷你 KeepAlive =====
// container：页面上放当前组件的容器。
// max：最多缓存几个。create(key)：造出这个 key 对应的元素。on：四个钩子，按时机调用它们。
function createKeepAlive(container, { max, create, on }) {
  const storage = document.createElement('div')   // 隐藏容器：从不挂到页面上
  const cache = new Map()                         // key -> el
  const keys = new Set()                          // 使用顺序：最前面最久没用
  let current = null

  function show(key) {
    // TODO：显示 key 对应的元素。
    // 1. key 就是当前显示的：什么也不做。
    // 2. 把当前显示的元素搬进 storage，调用 on.deactivated(它的 key)。不要销毁它。
    // 3. 缓存里有 key：把它移到“最近使用”，搬回 container。
    //    没有：create(key)，放进缓存和 container，调用 on.mounted(key)；缓存超过 max 时，销毁最久没用的（从页面移除、清出缓存，调用 on.destroyed）。
    // 4. 记下 current，调用 on.activated(key)。
  }

  return { show, keys: () => [...keys] }
}
`

const KA_FADED = `function createKeepAlive(container, { max, create, on }) {
  const storage = document.createElement('div')   // 隐藏容器：从不挂到页面上
  const cache = new Map()                         // key -> el
  const keys = new Set()                          // 使用顺序：最前面最久没用
  let current = null

  function show(key) {
    if (key === current) return
    if (current !== null) {
      /* ✏️ 把当前元素搬进 storage（不销毁） */
      on.deactivated(current)
    }
    if (cache.has(key)) {
      /* ✏️ 命中：把 key 移到“最近使用”的位置（Set 里最后） */
      container.appendChild(cache.get(key))
    } else {
      const el = create(key)
      cache.set(key, el)
      keys.add(key)
      container.appendChild(el)
      on.mounted(key)
      if (max && keys.size > max) {
        const oldest = /* ✏️ 取出 keys 里最久没用的 key */
        cache.get(oldest).remove()
        cache.delete(oldest)
        keys.delete(oldest)
        on.destroyed(oldest)
      }
    }
    current = key
    on.activated(key)
  }

  return { show, keys: () => [...keys] }
}
`

const KA_DEMO = `
// ===== 使用你的 createKeepAlive（不用修改） =====
function log(msg) { document.getElementById('ka-log').textContent += msg + '\\n' }

let ka
onMounted(() => {
  ka = createKeepAlive(document.getElementById('ka-host'), {
    max: 2,
    create(key) {
      const el = document.createElement('section')
      el.id = 'sec-' + key
      el.innerHTML = '<b>' + key + '</b> <input id="in-' + key + '">'
      return el
    },
    on: {
      mounted: k => log('mounted ' + k),
      activated: k => log('activated ' + k),
      deactivated: k => log('deactivated ' + k),
      destroyed: k => log('destroyed ' + k)
    }
  })
})

function show(key) {
  ka.show(key)
  log('缓存顺序 ' + ka.keys().join(','))
}

return { show }`

const KA_TPL = `<button @click="show('A')">显示 A</button>
<button @click="show('B')">显示 B</button>
<button @click="show('C')">显示 C</button>
<div id="ka-host"></div>
<pre id="ka-log"></pre>`

const KA_NOTE = '// 下面是要写的函数，后面是使用它的页面代码（不用修改）。\n\n'

export const miniKeepAlive: Exercise = {
  title: '写一个迷你 KeepAlive：搬家加 LRU',
  ch: 33,
  task: '<p>补全 <code>createKeepAlive</code> 的 <code>show(key)</code>。它显示 key 对应的元素，并像真实的 KeepAlive 一样缓存：</p><ol><li>切走的元素<b>不销毁</b>：从页面搬进 <code>storage</code>（一个不在页面里的 <code>div</code>），输入框里的文字和元素本身都保留。</li><li>切回来时从缓存取出，搬回 <code>container</code>，不再调用 <code>create</code>。</li><li>缓存里的 key 超过 <code>max</code> 时，销毁<b>最久没有使用</b>的那个（LRU）。命中缓存也算“使用”。</li></ol><p>钩子的时机：切走时 <code>deactivated</code>，新建时 <code>mounted</code>，每次显示时 <code>activated</code>，淘汰时 <code>destroyed</code>。补全后，点“显示 A、B、A、C、B”，日志应该显示 B 先被淘汰，再轮到 A。</p>',
  tpl: KA_TPL,
  js: KA_NOTE + KA_START + KA_DEMO,
  solJs: KA_NOTE + KA_SOL + KA_DEMO,
  faded: { js: KA_NOTE + KA_FADED + KA_DEMO },
  hints: [
    '先看 33.2 节。切走和切回都是“搬家”，不是销毁再创建：搬家用 appendChild，同一个节点再次 appendChild 会自动从原来的父节点移走。',
    '缓存用 Map（key 到元素），使用顺序用 Set。Set 按插入顺序遍历，所以先 delete 再 add，就把一个 key 移到了最后。淘汰时取 keys.values().next().value，它就是最久没用的。',
    '命中缓存时要做两件事：刷新使用顺序（delete 再 add）和把元素搬回页面。新建时才检查 max。淘汰的是最久没用的 key，不是刚创建的，也不是刚切走的那个以外的任意一个。',
    KA_SOL
  ],
  async check(T) {
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
    const host = T.$('#ka-host')
    const logEl = T.$('#ka-log')
    if (!host || !logEl) { T.ok(false, '页面上有 #ka-host 和 #ka-log'); return }
    const lines = () => (logEl.textContent || '').split('\n').filter(Boolean)
    const count = (s: string) => lines().filter(l => l === s).length
    const idx = (s: string, from = 0) => lines().indexOf(s, from)
    const press = async (k: string) => { const b = T.btn('显示 ' + k); if (b) await T.click(b); await wait(5) }
    const lastOrder = () => { const l = lines().filter(x => x.startsWith('缓存顺序 ')); return l.length ? l[l.length - 1].slice(5) : '' }

    await press('A')
    T.ok(!!host.querySelector('#sec-A') && host.children.length === 1, '显示 A 后，页面上只有 A（现在有 ' + host.children.length + ' 个元素）')
    T.ok(count('mounted A') === 1 && count('activated A') === 1, '第一次显示 A：mounted 和 activated 各一次')
    const secA = host.querySelector('#sec-A') as HTMLElement | null
    const inA = host.querySelector('#in-A') as HTMLInputElement | null
    if (!secA || !inA) return
    inA.value = 'hello'
    await press('A')
    T.ok(count('activated A') === 1, '重复显示当前的 A，什么也不做（activated A 现在 ' + count('activated A') + ' 次）')

    await press('B')
    T.ok(!host.contains(secA) && !!host.querySelector('#sec-B') && host.children.length === 1, '切到 B 后，A 离开页面，页面上只有 B')
    T.ok(count('deactivated A') === 1 && count('destroyed A') === 0, '切走 A 触发 deactivated，但不销毁 A（deactivated A ' + count('deactivated A') + ' 次，destroyed A ' + count('destroyed A') + ' 次）')
    T.ok(idx('deactivated A') >= 0 && idx('deactivated A') < idx('activated B'), 'deactivated A 先于 activated B')

    await press('A')
    T.ok(host.contains(secA) && host.children.length === 1, '切回 A：同一个元素搬回了页面（输入框所在的元素没有被重新创建）')
    T.ok(inA.value === 'hello', '切回 A 后输入框里还是 “hello”（现在是 “' + inA.value + '”）：状态保留了')
    T.ok(count('mounted A') === 1 && count('activated A') === 2 && count('deactivated B') === 1, '切回 A：mounted 仍是 1 次，activated A 是 2 次，deactivated B 是 1 次')
    T.ok(lastOrder() === 'B,A', '访问了 A、B、A 之后，缓存顺序是 B,A（命中缓存要刷新使用顺序）。现在是 “' + lastOrder() + '”')

    await press('C')
    T.ok(count('destroyed B') === 1 && count('destroyed A') === 0, '放进 C 后缓存超过 max=2，淘汰最久没用的 B，不淘汰 A（destroyed B ' + count('destroyed B') + ' 次，destroyed A ' + count('destroyed A') + ' 次）')
    T.ok(lastOrder() === 'A,C', '淘汰后缓存顺序是 A,C（现在是 “' + lastOrder() + '”）')
    T.ok(host.contains(secA) === false && inA.value === 'hello', 'A 在缓存里，没有被淘汰：输入框仍是 “hello”')

    await press('B')
    T.ok(count('mounted B') === 2, 'B 已被淘汰，再显示会重新创建（mounted B 现在 ' + count('mounted B') + ' 次）')
    T.ok(count('destroyed A') === 1, '这次最久没用的是 A，被淘汰（destroyed A ' + count('destroyed A') + ' 次）')
    T.ok(!host.querySelector('#sec-A') && !!host.querySelector('#sec-B') && host.children.length === 1, '页面上只有新的 B')
    T.ok(!secA.parentNode, '被淘汰的 A 已经真正销毁：不在任何容器里')
  },
  wrong: [
    {
      js: KA_NOTE + sub(KA_SOL, '      keys.delete(key)                            // 命中：移到最近使用的位置\n      keys.add(key)\n', '') + KA_DEMO,
      why: '命中缓存时没有刷新使用顺序，Set 里 key 的位置还是第一次加入时的。淘汰变成了“先进先出”：先加入的 A 被淘汰，而刚用过的 B 留了下来。LRU 要求命中也算使用，要先 delete 再 add。',
      expectFail: /缓存顺序是 B,A|淘汰最久没用的 B/
    },
    {
      js: KA_NOTE + sub(KA_SOL, '      storage.appendChild(cache.get(current))     // 失活：DOM 搬进隐藏容器，不销毁\n', '      cache.get(current).remove()\n      cache.delete(current)\n      keys.delete(current)\n') + KA_DEMO,
      why: '切走时把元素销毁并清出缓存，等于没有缓存：切回来要重新 create，输入框里的文字丢了。KeepAlive 的关键是切走时只把 DOM 搬进隐藏容器。',
      expectFail: /输入框里还是|同一个元素|mounted 仍是 1 次/
    },
    {
      js: KA_NOTE + sub(KA_SOL, '      on.deactivated(current)\n', '      on.destroyed(current)\n') + KA_DEMO,
      why: '把“失活”当成“销毁”：切走时调用了 destroyed。失活的实例仍然活着，只是 DOM 在隐藏容器里，所以真实的 KeepAlive 触发的是 onDeactivated，不是 onUnmounted。',
      expectFail: /deactivated/
    },
    {
      js: KA_NOTE + sub(KA_SOL, 'if (max && keys.size > max) {', 'if (false) {') + KA_DEMO,
      why: '没有淘汰。缓存会无限增长，每个切走的组件都留在内存里。max 的作用就是限制隐藏容器里的数量。',
      expectFail: /淘汰/
    }
  ]
}

// ---------------------------------------------------------------------------
// 练习 2：迷你 Transition 的进入序列
// ---------------------------------------------------------------------------

const TR_SOL = `function enterElement(container, el, { name, duration, onAfterEnter, onCancelled }) {
  const cls = s => name + '-enter-' + s
  el.classList.add(cls('from'), cls('active'))      // 先加 class，再插入：第一帧就在起点
  container.appendChild(el)

  let finished = false
  let timer
  function finish(cancelled) {
    if (finished) return
    finished = true
    clearTimeout(timer)
    el.classList.remove(cls('from'), cls('to'), cls('active'))
    if (cancelled) onCancelled && onCancelled()
    else onAfterEnter && onAfterEnter()
  }

  nextFrame(() => {
    if (finished) return
    el.classList.remove(cls('from'))                // 下一帧：离开起点，去往终点
    el.classList.add(cls('to'))
    timer = setTimeout(() => finish(false), duration)
  })

  return () => finish(true)                         // 返回“取消”函数
}
`

const TR_START = `// ===== 你要写的：进入序列 =====
// name 是过渡名，class 是 name + '-enter-from' / '-enter-active' / '-enter-to'。
// duration 是显式时长（毫秒）。nextFrame 在下面，已经写好。
function enterElement(container, el, { name, duration, onAfterEnter, onCancelled }) {
  // TODO 1：插入之前，给 el 加 from 和 active 两个 class，然后 container.appendChild(el)。
  // TODO 2：下一帧（用 nextFrame）：去掉 from，加上 to；再等 duration 毫秒。
  // TODO 3：时间到：去掉 to 和 active，调用 onAfterEnter。
  // TODO 4：返回一个“取消”函数：立刻去掉所有 enter class，调用 onCancelled，并保证 onAfterEnter 以后不会被调用。
}
`

const TR_FADED = `function enterElement(container, el, { name, duration, onAfterEnter, onCancelled }) {
  const cls = s => name + '-enter-' + s
  /* ✏️ 插入之前加上 from 和 active */
  container.appendChild(el)

  let finished = false
  let timer
  function finish(cancelled) {
    if (finished) return
    finished = true
    clearTimeout(timer)
    el.classList.remove(cls('from'), cls('to'), cls('active'))
    if (cancelled) onCancelled && onCancelled()
    else onAfterEnter && onAfterEnter()
  }

  /* ✏️ 下一帧：去掉 from，加上 to，再等 duration 毫秒调用 finish(false) */

  return () => finish(true)
}
`

const TR_DEMO = `
// ===== 使用你的 enterElement（不用修改） =====
function nextFrame(cb) {
  requestAnimationFrame(() => requestAnimationFrame(cb))
}
function log(msg) { document.getElementById('tr-log').textContent += msg + '\\n' }

// 宿主包一层，记录“插入的那一刻”元素身上的 class
const host = { appendChild(el) { log('插入时 class="' + el.className + '"'); document.getElementById('tr-host').appendChild(el) } }
let cancelFn = null

function addBox() {
  const el = document.createElement('div')
  el.className = 'box'
  el.textContent = '新元素'
  cancelFn = enterElement(host, el, {
    name: 'fade', duration: 120,
    onAfterEnter: () => log('afterEnter'),
    onCancelled: () => log('cancelled')
  })
}
function cancel() { cancelFn && cancelFn() }

return { addBox, cancel }`

const TR_NOTE = '// 下面是要写的函数，后面是使用它的页面代码（不用修改）。\n\n'

const TR_TPL = `<button @click="addBox">加入元素</button>
<button @click="cancel">取消进入</button>
<div id="tr-host"></div>
<pre id="tr-log"></pre>`

export const miniEnter: Exercise = {
  title: '写 Transition 的进入序列：按帧加减 class',
  ch: 33,
  task: '<p>补全 <code>enterElement(container, el, options)</code>，让 <code>el</code> 依次经过 Transition 的进入序列（<code>name</code> 是 <code>fade</code>）：</p><ol><li><b>插入前</b>：加 <code>fade-enter-from</code> 和 <code>fade-enter-active</code>，再 <code>container.appendChild(el)</code>。</li><li><b>下一帧</b>：去掉 <code>fade-enter-from</code>，加上 <code>fade-enter-to</code>。</li><li><b>过了 <code>duration</code> 毫秒</b>：去掉 <code>fade-enter-to</code> 和 <code>fade-enter-active</code>，调用 <code>onAfterEnter</code>。</li><li>返回一个<b>取消函数</b>：调用它会立刻清掉所有进入 class，调用 <code>onCancelled</code>，之后 <code>onAfterEnter</code> 不能再被调用。</li></ol><p>“下一帧”用页面里已经写好的 <code>nextFrame</code>（两层 <code>requestAnimationFrame</code>）。</p>',
  tpl: TR_TPL,
  js: TR_NOTE + TR_START + TR_DEMO,
  solJs: TR_NOTE + TR_SOL + TR_DEMO,
  faded: { js: TR_NOTE + TR_FADED + TR_DEMO },
  hints: [
    '先看 33.4 节。class 的变化是 “from + active” → 下一帧 “active + to” → 结束时全部清掉。from 必须在元素插入页面之前就加好，否则浏览器会先画出一帧没有起点样式的元素。',
    '“下一帧”不能用同步代码：同一个同步任务里先去掉 from 再加上 to，浏览器看到的只有最终状态，起点样式从来没有被应用过，过渡就不会发生。用 nextFrame(() => { … })。',
    '结束靠 setTimeout(…, duration)。要能取消，就把定时器 id 存下来，取消时 clearTimeout，并用一个 finished 标志保证收尾只做一次：正常结束和取消都走同一个 finish。注意取消可能发生在 nextFrame 的回调之前，回调里要先看 finished。',
    TR_SOL
  ],
  async check(T) {
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
    const host = T.$('#tr-host')
    const logEl = T.$('#tr-log')
    if (!host || !logEl) { T.ok(false, '页面上有 #tr-host 和 #tr-log'); return }
    const lines = () => (logEl.textContent || '').split('\n').filter(Boolean)
    const count = (s: string) => lines().filter(l => l === s).length
    const cls = (el: Element | null | undefined) => (el ? [...el.classList].filter(c => c !== 'box').sort().join(' ') : '(没有元素)')
    const add = T.btn('加入元素')
    const cancelBtn = T.btn('取消进入')
    if (!add || !cancelBtn) { T.ok(false, '页面上有“加入元素”和“取消进入”两个按钮'); return }

    await T.click(add)
    const box = host.querySelector('.box')
    T.ok(!!box, '点击后，元素被插入页面')
    if (!box) return
    T.ok(cls(box) === 'fade-enter-active fade-enter-from', '刚插入时有 fade-enter-from 和 fade-enter-active，没有别的（现在是 “' + cls(box) + '”）')
    T.ok(lines().some(l => l.startsWith('插入时 class=') && l.includes('fade-enter-from') && l.includes('fade-enter-active')), '插入页面的那一刻，class 已经加好了：先加 class，再插入')
    T.ok(count('afterEnter') === 0, '还没结束，afterEnter 不应该被调用')
    await wait(70)
    T.ok(cls(box) === 'fade-enter-active fade-enter-to', '下一帧之后是 fade-enter-active 和 fade-enter-to，fade-enter-from 已去掉（现在是 “' + cls(box) + '”）')
    T.ok(count('afterEnter') === 0, 'duration 还没到，afterEnter 不应该被调用')
    await wait(220)
    T.ok(cls(box) === '', '结束后所有 fade- 开头的 class 都被清掉（现在是 “' + cls(box) + '”）')
    T.ok(count('afterEnter') === 1, 'afterEnter 恰好调用一次（现在 ' + count('afterEnter') + ' 次）')

    await T.click(add)
    const boxes = host.querySelectorAll('.box')
    const box2 = boxes[boxes.length - 1]
    await wait(70)
    T.ok(cls(box2) === 'fade-enter-active fade-enter-to', '第二个元素进入到一半')
    await T.click(cancelBtn)
    T.ok(cls(box2) === '', '取消后立刻清掉所有进入 class（现在是 “' + cls(box2) + '”）')
    T.ok(count('cancelled') === 1, '取消调用一次 onCancelled（现在 ' + count('cancelled') + ' 次）')
    await wait(250)
    T.ok(count('afterEnter') === 1, '取消之后，原来的定时器不能再触发 afterEnter（afterEnter 现在 ' + count('afterEnter') + ' 次，应该仍是 1 次）')
    T.ok(cls(box2) === '', '取消之后，过一会儿元素上也没有被重新加回的 class')
  },
  wrong: [
    {
      js: TR_NOTE + sub(TR_SOL, "  nextFrame(() => {\n    if (finished) return\n    el.classList.remove(cls('from'))                // 下一帧：离开起点，去往终点\n    el.classList.add(cls('to'))\n    timer = setTimeout(() => finish(false), duration)\n  })", "  el.classList.remove(cls('from'))\n  el.classList.add(cls('to'))\n  timer = setTimeout(() => finish(false), duration)") + TR_DEMO,
      why: '没有等下一帧，同步地去掉 from、加上 to。浏览器还没有应用过 from 的样式，就看到了 to 的样式，起点到终点之间没有变化，过渡不会发生。这就是 nextFrame 存在的原因。',
      expectFail: /刚插入时有 fade-enter-from/
    },
    {
      js: TR_NOTE + sub(TR_SOL, "    el.classList.remove(cls('from'), cls('to'), cls('active'))", "    el.classList.remove(cls('from'), cls('to'))") + TR_DEMO,
      why: '结束时没有去掉 active。active 类通常放着 transition 属性，留在元素上会让以后每次样式变化（例如 hover）都带着过渡。结束时要把 to 和 active 都清掉。',
      expectFail: /所有 fade- 开头的 class 都被清掉/
    },
    {
      js: TR_NOTE + sub(TR_SOL, "  el.classList.add(cls('from'), cls('active'))      // 先加 class，再插入：第一帧就在起点\n  container.appendChild(el)\n", "  container.appendChild(el)\n  el.classList.add(cls('from'), cls('active'))\n") + TR_DEMO,
      why: '先插入再加 class。插入的那一刻元素没有起点样式，浏览器可能先画出一帧终点状态，再跳到起点，出现闪烁。真实的 Transition 在 beforeEnter 里就加好 from 和 active，然后才插入。',
      expectFail: /插入页面的那一刻/
    },
    {
      js: TR_NOTE + sub(TR_SOL, '    if (finished) return\n    finished = true\n    clearTimeout(timer)\n', '') + TR_DEMO,
      why: '取消时没有清掉定时器，收尾函数也没有“只做一次”的保护。duration 到了以后，原来的定时器照样触发，在已经取消的元素上又调用了 afterEnter。取消和正常结束要走同一个 finish，清掉定时器，并用标志保证只收尾一次。',
      expectFail: /取消之后|定时器/
    }
  ]
}
