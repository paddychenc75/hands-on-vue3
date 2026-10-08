import type { Exercise } from './types'
import { sub } from './types'

export const computedFill: Exercise = {
  title: '补全：迷你 computed 的缓存标记', ch: 24,
  task: '<p>脚本中的 miniComputed 只差两行。它用 dirty 标记决定是否重新计算。只补全两行 TODO。</p><ol><li>TODO 1：依赖改变时，scheduler 把 dirty 设为 true。它不计算。</li><li>TODO 2：重新计算后，把 dirty 设为 false。原因：否则每次读取都运行 getter，没有缓存。</li></ol>',
  tpl: '<p>total：{{ view.total }}</p>\n<p>getter 运行次数：{{ view.runs }}</p>\n<button @click="readTwice">读取两次 total.value</button>\n<button @click="changePrice">price 加 10</button>',
  js: `// ===== 已给出：迷你响应式系统（不用修改） =====
let activeEffect = null
const targetMap = new WeakMap()

function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))
  dep.add(activeEffect)
}

function trigger(target, key) {
  const dep = targetMap.get(target)?.get(key)
  if (!dep) return
  // 有 scheduler 时调用 scheduler，否则重新运行
  ;[...dep].forEach(e => e.scheduler ? e.scheduler() : e.run())
}

function effect(fn, options = {}) {
  const e = {
    scheduler: options.scheduler,
    run() {
      const prev = activeEffect
      activeEffect = e
      try { return fn() } finally { activeEffect = prev }
    }
  }
  if (!options.lazy) e.run()   // lazy: true 时不立即运行
  return e
}

function miniReactive(obj) {
  return new Proxy(obj, {
    get(t, k) { track(t, k); return t[k] },
    set(t, k, v) { t[k] = v; trigger(t, k); return true }
  })
}

// ===== miniComputed：补全两行 TODO =====
function miniComputed(getter) {
  let value
  let dirty = true                 // true：下次读取时要重新计算
  const runner = effect(getter, {
    lazy: true,                    // 创建时不运行 getter
    scheduler() {
      // TODO 1：依赖改变时，只做标记
    }
  })
  return {
    get value() {
      if (dirty) {
        value = runner.run()       // 运行 getter，同时收集依赖
        // TODO 2：计算完成，清除标记
      }
      return value
    }
  }
}

// ===== 已给出：使用 miniComputed =====
const state = miniReactive({ price: 10, qty: 2 })
let runs = 0
const total = miniComputed(() => {
  runs++
  return state.price * state.qty
})

const view = ref({ total: '未读取', runs })
function readTwice() {
  total.value
  view.value = { total: total.value, runs }
}
function changePrice() {
  state.price += 10
  view.value = { total: view.value.total, runs }
}

return { view, readTwice, changePrice }`,
  solJs: `// ===== 已给出：迷你响应式系统（不用修改） =====
let activeEffect = null
const targetMap = new WeakMap()

function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))
  dep.add(activeEffect)
}

function trigger(target, key) {
  const dep = targetMap.get(target)?.get(key)
  if (!dep) return
  // 有 scheduler 时调用 scheduler，否则重新运行
  ;[...dep].forEach(e => e.scheduler ? e.scheduler() : e.run())
}

function effect(fn, options = {}) {
  const e = {
    scheduler: options.scheduler,
    run() {
      const prev = activeEffect
      activeEffect = e
      try { return fn() } finally { activeEffect = prev }
    }
  }
  if (!options.lazy) e.run()   // lazy: true 时不立即运行
  return e
}

function miniReactive(obj) {
  return new Proxy(obj, {
    get(t, k) { track(t, k); return t[k] },
    set(t, k, v) { t[k] = v; trigger(t, k); return true }
  })
}

// ===== miniComputed：补全两行 TODO =====
function miniComputed(getter) {
  let value
  let dirty = true                 // true：下次读取时要重新计算
  const runner = effect(getter, {
    lazy: true,                    // 创建时不运行 getter
    scheduler() {
      dirty = true                 // 只做标记，不计算
    }
  })
  return {
    get value() {
      if (dirty) {
        value = runner.run()       // 运行 getter，同时收集依赖
        dirty = false              // 依赖不变时，直接返回 value
      }
      return value
    }
  }
}

// ===== 已给出：使用 miniComputed =====
const state = miniReactive({ price: 10, qty: 2 })
let runs = 0
const total = miniComputed(() => {
  runs++
  return state.price * state.qty
})

const view = ref({ total: '未读取', runs })
function readTwice() {
  total.value
  view.value = { total: total.value, runs }
}
function changePrice() {
  state.price += 10
  view.value = { total: view.value.total, runs }
}

return { view, readTwice, changePrice }`,
  faded: {
    js: `// ===== 已给出：迷你响应式系统（不用修改） =====
let activeEffect = null
const targetMap = new WeakMap()

function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))
  dep.add(activeEffect)
}

function trigger(target, key) {
  const dep = targetMap.get(target)?.get(key)
  if (!dep) return
  // 有 scheduler 时调用 scheduler，否则重新运行
  ;[...dep].forEach(e => e.scheduler ? e.scheduler() : e.run())
}

function effect(fn, options = {}) {
  const e = {
    scheduler: options.scheduler,
    run() {
      const prev = activeEffect
      activeEffect = e
      try { return fn() } finally { activeEffect = prev }
    }
  }
  if (!options.lazy) e.run()   // lazy: true 时不立即运行
  return e
}

function miniReactive(obj) {
  return new Proxy(obj, {
    get(t, k) { track(t, k); return t[k] },
    set(t, k, v) { t[k] = v; trigger(t, k); return true }
  })
}

// ===== miniComputed：补全两行 TODO =====
function miniComputed(getter) {
  let value
  let dirty = true                 // true：下次读取时要重新计算
  const runner = effect(getter, {
    lazy: true,                    // 创建时不运行 getter
    scheduler() {
      dirty = /* ✏️ 依赖改变了：下次读取要重新计算，该把标记设成什么 */ false
    }
  })
  return {
    get value() {
      if (dirty) {
        value = runner.run()       // 运行 getter，同时收集依赖
        dirty = /* ✏️ 刚计算完：缓存已是最新，该把标记设成什么 */ true
      }
      return value
    }
  }
}

// ===== 已给出：使用 miniComputed =====
const state = miniReactive({ price: 10, qty: 2 })
let runs = 0
const total = miniComputed(() => {
  runs++
  return state.price * state.qty
})

const view = ref({ total: '未读取', runs })
function readTwice() {
  total.value
  view.value = { total: total.value, runs }
}
function changePrice() {
  state.price += 10
  view.value = { total: view.value.total, runs }
}

return { view, readTwice, changePrice }`
  },
  hints: [
    'computed 用一个 dirty 标记实现缓存：依赖改变时设为 true，计算后设为 false。第 24 章的实验台“手写响应式”讲了 effect 和 trigger。trigger 在依赖改变时调用 scheduler。',
    'TODO 1 在 scheduler() 中，给 dirty 赋一个值。TODO 2 在 value = runner.run() 的下一行，给 dirty 赋另一个值。两行都只有一个赋值语句。',
    'scheduler() { dirty = true }\n…\nvalue = runner.run()\ndirty = false'
  ],
  async check(T) {
    const runs = () => { const m = T.text().match(/运行次数：\s*(\d+)/); return m ? +m[1] : -1; };
    const total = () => { const p = T.$$('p').find(x => /total：/.test(x.textContent)); return p ? p.textContent.replace(/^\s*total：\s*/, '').trim() : ''; };
    T.ok(runs() === 0, '创建后 getter 运行 0 次（当前 ' + runs() + ' 次）');
    const read = T.btn('读取两次'), change = T.btn('price 加 10');
    if (!read || !change) { T.ok(false, '找到“读取两次”和“price 加 10”按钮'); return; }
    await T.click(read);
    T.ok(total() === '20', '第一次读取：total = 20');
    T.ok(runs() === 1, '读取两次，getter 只运行 1 次（当前 ' + runs() + ' 次）');
    await T.click(T.btn('price 加 10'));
    T.ok(runs() === 1, '修改 price 后，getter 不立即运行（当前 ' + runs() + ' 次）');
    await T.click(T.btn('读取两次'));
    T.ok(total() === '40', '修改后读取：total = 40（当前 ' + total() + '）');
    T.ok(runs() === 2, '修改后读取，getter 共运行 2 次（当前 ' + runs() + ' 次）');
  },
  wrong: [
    { js: '// ===== 已给出：迷你响应式系统（不用修改） =====\nlet activeEffect = null\nconst targetMap = new WeakMap()\n\nfunction track(target, key) {\n  if (!activeEffect) return\n  let depsMap = targetMap.get(target)\n  if (!depsMap) targetMap.set(target, (depsMap = new Map()))\n  let dep = depsMap.get(key)\n  if (!dep) depsMap.set(key, (dep = new Set()))\n  dep.add(activeEffect)\n}\n\nfunction trigger(target, key) {\n  const dep = targetMap.get(target)?.get(key)\n  if (!dep) return\n  // 有 scheduler 时调用 scheduler，否则重新运行\n  ;[...dep].forEach(e => e.scheduler ? e.scheduler() : e.run())\n}\n\nfunction effect(fn, options = {}) {\n  const e = {\n    scheduler: options.scheduler,\n    run() {\n      const prev = activeEffect\n      activeEffect = e\n      try { return fn() } finally { activeEffect = prev }\n    }\n  }\n  if (!options.lazy) e.run()   // lazy: true 时不立即运行\n  return e\n}\n\nfunction miniReactive(obj) {\n  return new Proxy(obj, {\n    get(t, k) { track(t, k); return t[k] },\n    set(t, k, v) { t[k] = v; trigger(t, k); return true }\n  })\n}\n\n// ===== miniComputed：补全两行 TODO =====\nfunction miniComputed(getter) {\n  let value\n  let dirty = true                 // true：下次读取时要重新计算\n  const runner = effect(getter, {\n    lazy: true,                    // 创建时不运行 getter\n    scheduler() {\n      value = runner.run()           // 立即重新计算\n    }\n  })\n  return {\n    get value() {\n      if (dirty) {\n        value = runner.run()       // 运行 getter，同时收集依赖\n        dirty = false              // 依赖不变时，直接返回 value\n      }\n      return value\n    }\n  }\n}\n\n// ===== 已给出：使用 miniComputed =====\nconst state = miniReactive({ price: 10, qty: 2 })\nlet runs = 0\nconst total = miniComputed(() => {\n  runs++\n  return state.price * state.qty\n})\n\nconst view = ref({ total: \'未读取\', runs })\nfunction readTwice() {\n  total.value\n  view.value = { total: total.value, runs }\n}\nfunction changePrice() {\n  state.price += 10\n  view.value = { total: view.value.total, runs }\n}\n\nreturn { view, readTwice, changePrice }', why: 'scheduler 里立即重新计算。依赖一改变 getter 就运行，而不是等到下次读取，没有“惰性”，也浪费计算。scheduler 只应该做标记。' },
    { js: '// ===== 已给出：迷你响应式系统（不用修改） =====\nlet activeEffect = null\nconst targetMap = new WeakMap()\n\nfunction track(target, key) {\n  if (!activeEffect) return\n  let depsMap = targetMap.get(target)\n  if (!depsMap) targetMap.set(target, (depsMap = new Map()))\n  let dep = depsMap.get(key)\n  if (!dep) depsMap.set(key, (dep = new Set()))\n  dep.add(activeEffect)\n}\n\nfunction trigger(target, key) {\n  const dep = targetMap.get(target)?.get(key)\n  if (!dep) return\n  // 有 scheduler 时调用 scheduler，否则重新运行\n  ;[...dep].forEach(e => e.scheduler ? e.scheduler() : e.run())\n}\n\nfunction effect(fn, options = {}) {\n  const e = {\n    scheduler: options.scheduler,\n    run() {\n      const prev = activeEffect\n      activeEffect = e\n      try { return fn() } finally { activeEffect = prev }\n    }\n  }\n  if (!options.lazy) e.run()   // lazy: true 时不立即运行\n  return e\n}\n\nfunction miniReactive(obj) {\n  return new Proxy(obj, {\n    get(t, k) { track(t, k); return t[k] },\n    set(t, k, v) { t[k] = v; trigger(t, k); return true }\n  })\n}\n\n// ===== miniComputed：补全两行 TODO =====\nfunction miniComputed(getter) {\n  let value\n  let dirty = true                 // true：下次读取时要重新计算\n  const runner = effect(getter, {\n    lazy: true,                    // 创建时不运行 getter\n    scheduler() {\n      dirty = true                 // 只做标记，不计算\n    }\n  })\n  return {\n    get value() {\n      if (dirty) {\n        value = runner.run()       // 运行 getter，同时收集依赖\n      }\n      return value\n    }\n  }\n}\n\n// ===== 已给出：使用 miniComputed =====\nconst state = miniReactive({ price: 10, qty: 2 })\nlet runs = 0\nconst total = miniComputed(() => {\n  runs++\n  return state.price * state.qty\n})\n\nconst view = ref({ total: \'未读取\', runs })\nfunction readTwice() {\n  total.value\n  view.value = { total: total.value, runs }\n}\nfunction changePrice() {\n  state.price += 10\n  view.value = { total: view.value.total, runs }\n}\n\nreturn { view, readTwice, changePrice }', why: '计算后没有清除 dirty。dirty 一直是 true，每次读取都重新运行 getter，缓存没有生效。' }
  ]
}

export const miniComputed: Exercise = {
  title: '手写一个迷你 computed', ch: 24,
  task: '<p>脚本中已有一个迷你响应式系统：<code>effect</code>、<code>track</code>、<code>trigger</code>。effect 支持两个选项：<code>lazy</code> 和 <code>scheduler</code>。完成 <code>miniComputed</code>，满足下面三个要求：</p><ol><li>创建时，不运行 getter。</li><li>依赖不变时，读取 .value 返回缓存的值，不运行 getter。</li><li>依赖改变后，不立即计算。下次读取时，重新运行 getter。</li></ol><p>只修改 TODO 部分。</p>',
  tpl: '<p>total：{{ view.total }}</p>\n<p>getter 运行次数：{{ view.runs }}</p>\n<button @click="readTwice">读取两次 total.value</button>\n<button @click="changePrice">price 加 10</button>',
  js: `// ===== 已给出：迷你响应式系统（不用修改） =====
let activeEffect = null
const targetMap = new WeakMap()

function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))
  dep.add(activeEffect)
}

function trigger(target, key) {
  const dep = targetMap.get(target)?.get(key)
  if (!dep) return
  // 有 scheduler 时调用 scheduler，否则重新运行
  ;[...dep].forEach(e => e.scheduler ? e.scheduler() : e.run())
}

function effect(fn, options = {}) {
  const e = {
    scheduler: options.scheduler,
    run() {
      const prev = activeEffect
      activeEffect = e
      try { return fn() } finally { activeEffect = prev }
    }
  }
  if (!options.lazy) e.run()   // lazy: true 时不立即运行
  return e
}

function miniReactive(obj) {
  return new Proxy(obj, {
    get(t, k) { track(t, k); return t[k] },
    set(t, k, v) { t[k] = v; trigger(t, k); return true }
  })
}

// ===== TODO：完成 miniComputed =====
function miniComputed(getter) {
  // 现在：每次读取 .value，都运行 getter
  return {
    get value() {
      return getter()
    }
  }
}

// ===== 已给出：使用 miniComputed =====
const state = miniReactive({ price: 10, qty: 2 })
let runs = 0
const total = miniComputed(() => {
  runs++
  return state.price * state.qty
})

const view = ref({ total: '未读取', runs })
function readTwice() {
  total.value
  view.value = { total: total.value, runs }
}
function changePrice() {
  state.price += 10
  view.value = { total: view.value.total, runs }
}

return { view, readTwice, changePrice }`,
  faded: {
    js: `// ===== 已给出：迷你响应式系统（不用修改） =====
let activeEffect = null
const targetMap = new WeakMap()

function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))
  dep.add(activeEffect)
}

function trigger(target, key) {
  const dep = targetMap.get(target)?.get(key)
  if (!dep) return
  // 有 scheduler 时调用 scheduler，否则重新运行
  ;[...dep].forEach(e => e.scheduler ? e.scheduler() : e.run())
}

function effect(fn, options = {}) {
  const e = {
    scheduler: options.scheduler,
    run() {
      const prev = activeEffect
      activeEffect = e
      try { return fn() } finally { activeEffect = prev }
    }
  }
  if (!options.lazy) e.run()   // lazy: true 时不立即运行
  return e
}

function miniReactive(obj) {
  return new Proxy(obj, {
    get(t, k) { track(t, k); return t[k] },
    set(t, k, v) { t[k] = v; trigger(t, k); return true }
  })
}

// ===== TODO：完成 miniComputed =====
function miniComputed(getter) {
  let value
  let dirty = true                 // true：下次读取时要重新计算
  const runner = effect(getter, {
    /* ✏️ 创建时不要运行 getter：给 effect 传什么选项 */
    scheduler() {
      /* ✏️ 依赖改变时，只做标记，不重新计算 */
    }
  })
  return {
    get value() {
      if (/* ✏️ 什么情况下需要重新计算 */ false) {
        value = runner.run()       // 运行 getter，同时收集依赖
        /* ✏️ 计算完成，更新标记 */
      }
      return value
    }
  }
}

// ===== 已给出：使用 miniComputed =====
const state = miniReactive({ price: 10, qty: 2 })
let runs = 0
const total = miniComputed(() => {
  runs++
  return state.price * state.qty
})

const view = ref({ total: '未读取', runs })
function readTwice() {
  total.value
  view.value = { total: total.value, runs }
}
function changePrice() {
  state.price += 10
  view.value = { total: view.value.total, runs }
}

return { view, readTwice, changePrice }`
  },
  hints: [
    'computed 用 lazy 的 effect 加一个 dirty 标记实现缓存。依赖改变时，scheduler 只设置 dirty，不计算。第 24 章的实验台“手写响应式”讲了 effect、track 和 trigger。本题的 effect 多了 lazy 和 scheduler 两个选项。',
    '在 miniComputed 中：1. 声明 let value 和 let dirty = true。2. 用 effect(getter, { lazy: true, scheduler() { … } }) 创建 runner。3. 在 get value() 中，dirty 为 true 时运行 runner.run()，保存结果，把 dirty 设为 false。',
    'let value\nlet dirty = true\nconst runner = effect(getter, {\n  lazy: true,\n  scheduler() { dirty = true }\n})\nreturn {\n  get value() {\n    if (dirty) { value = runner.run(); dirty = false }\n    return value\n  }\n}'
  ],
  async check(T) {
    const runs = () => { const m = T.text().match(/运行次数：\s*(\d+)/); return m ? +m[1] : -1; };
    const total = () => { const p = T.$$('p').find(x => /total：/.test(x.textContent)); return p ? p.textContent.replace(/^\s*total：\s*/, '').trim() : ''; };
    T.ok(runs() === 0, '创建后 getter 运行 0 次（当前 ' + runs() + ' 次）');
    const read = T.btn('读取两次'), change = T.btn('price 加 10');
    if (!read || !change) { T.ok(false, '找到“读取两次”和“price 加 10”按钮'); return; }
    await T.click(read);
    T.ok(total() === '20', '第一次读取：total = 20');
    T.ok(runs() === 1, '读取两次，getter 只运行 1 次（当前 ' + runs() + ' 次）');
    await T.click(T.btn('读取两次'));
    T.ok(runs() === 1, '依赖不变时再读取，getter 仍是 1 次（当前 ' + runs() + ' 次）');
    await T.click(T.btn('price 加 10'));
    T.ok(runs() === 1, '修改 price 后，getter 不立即运行（当前 ' + runs() + ' 次）');
    await T.click(T.btn('读取两次'));
    T.ok(total() === '40', '修改后读取：total = 40（当前 ' + total() + '）');
    T.ok(runs() === 2, '修改后读取，getter 共运行 2 次（当前 ' + runs() + ' 次）');
  },
  wrong: [
    { js: '// ===== 已给出：迷你响应式系统（不用修改） =====\nlet activeEffect = null\nconst targetMap = new WeakMap()\n\nfunction track(target, key) {\n  if (!activeEffect) return\n  let depsMap = targetMap.get(target)\n  if (!depsMap) targetMap.set(target, (depsMap = new Map()))\n  let dep = depsMap.get(key)\n  if (!dep) depsMap.set(key, (dep = new Set()))\n  dep.add(activeEffect)\n}\n\nfunction trigger(target, key) {\n  const dep = targetMap.get(target)?.get(key)\n  if (!dep) return\n  // 有 scheduler 时调用 scheduler，否则重新运行\n  ;[...dep].forEach(e => e.scheduler ? e.scheduler() : e.run())\n}\n\nfunction effect(fn, options = {}) {\n  const e = {\n    scheduler: options.scheduler,\n    run() {\n      const prev = activeEffect\n      activeEffect = e\n      try { return fn() } finally { activeEffect = prev }\n    }\n  }\n  if (!options.lazy) e.run()   // lazy: true 时不立即运行\n  return e\n}\n\nfunction miniReactive(obj) {\n  return new Proxy(obj, {\n    get(t, k) { track(t, k); return t[k] },\n    set(t, k, v) { t[k] = v; trigger(t, k); return true }\n  })\n}\n\n// ===== TODO：完成 miniComputed =====\nfunction miniComputed(getter) {\n  let value\n  let done = false\n  return {\n    get value() {\n      if (!done) { value = getter(); done = true }\n      return value\n    }\n  }\n}\n\n// ===== 已给出：使用 miniComputed =====\nconst state = miniReactive({ price: 10, qty: 2 })\nlet runs = 0\nconst total = miniComputed(() => {\n  runs++\n  return state.price * state.qty\n})\n\nconst view = ref({ total: \'未读取\', runs })\nfunction readTwice() {\n  total.value\n  view.value = { total: total.value, runs }\n}\nfunction changePrice() {\n  state.price += 10\n  view.value = { total: view.value.total, runs }\n}\n\nreturn { view, readTwice, changePrice }', why: '只缓存，不失效：第一次读取后永远返回缓存。依赖改变时，没有任何机制通知它重新计算，结果变旧。' },
    { js: '// ===== 已给出：迷你响应式系统（不用修改） =====\nlet activeEffect = null\nconst targetMap = new WeakMap()\n\nfunction track(target, key) {\n  if (!activeEffect) return\n  let depsMap = targetMap.get(target)\n  if (!depsMap) targetMap.set(target, (depsMap = new Map()))\n  let dep = depsMap.get(key)\n  if (!dep) depsMap.set(key, (dep = new Set()))\n  dep.add(activeEffect)\n}\n\nfunction trigger(target, key) {\n  const dep = targetMap.get(target)?.get(key)\n  if (!dep) return\n  // 有 scheduler 时调用 scheduler，否则重新运行\n  ;[...dep].forEach(e => e.scheduler ? e.scheduler() : e.run())\n}\n\nfunction effect(fn, options = {}) {\n  const e = {\n    scheduler: options.scheduler,\n    run() {\n      const prev = activeEffect\n      activeEffect = e\n      try { return fn() } finally { activeEffect = prev }\n    }\n  }\n  if (!options.lazy) e.run()   // lazy: true 时不立即运行\n  return e\n}\n\nfunction miniReactive(obj) {\n  return new Proxy(obj, {\n    get(t, k) { track(t, k); return t[k] },\n    set(t, k, v) { t[k] = v; trigger(t, k); return true }\n  })\n}\n\n// ===== TODO：完成 miniComputed =====\nfunction miniComputed(getter) {\n  let value\n  let dirty = true                 // true：下次读取时要重新计算\n  const runner = effect(getter, {\n    lazy: true,                    // 创建时不运行 getter\n    scheduler() { dirty = false; value = runner.run() }   // 依赖改变时立即重算\n  })\n  return {\n    get value() {\n      if (dirty) {\n        value = runner.run()       // 运行 getter，同时收集依赖\n        dirty = false\n      }\n      return value\n    }\n  }\n}\n\n// ===== 已给出：使用 miniComputed =====\nconst state = miniReactive({ price: 10, qty: 2 })\nlet runs = 0\nconst total = miniComputed(() => {\n  runs++\n  return state.price * state.qty\n})\n\nconst view = ref({ total: \'未读取\', runs })\nfunction readTwice() {\n  total.value\n  view.value = { total: total.value, runs }\n}\nfunction changePrice() {\n  state.price += 10\n  view.value = { total: view.value.total, runs }\n}\n\nreturn { view, readTwice, changePrice }', why: '依赖改变时，scheduler 立即重算。要求是“不立即计算，下次读取时再算”。这样 price 一改 getter 就运行。' },
    { js: '// ===== 已给出：迷你响应式系统（不用修改） =====\nlet activeEffect = null\nconst targetMap = new WeakMap()\n\nfunction track(target, key) {\n  if (!activeEffect) return\n  let depsMap = targetMap.get(target)\n  if (!depsMap) targetMap.set(target, (depsMap = new Map()))\n  let dep = depsMap.get(key)\n  if (!dep) depsMap.set(key, (dep = new Set()))\n  dep.add(activeEffect)\n}\n\nfunction trigger(target, key) {\n  const dep = targetMap.get(target)?.get(key)\n  if (!dep) return\n  // 有 scheduler 时调用 scheduler，否则重新运行\n  ;[...dep].forEach(e => e.scheduler ? e.scheduler() : e.run())\n}\n\nfunction effect(fn, options = {}) {\n  const e = {\n    scheduler: options.scheduler,\n    run() {\n      const prev = activeEffect\n      activeEffect = e\n      try { return fn() } finally { activeEffect = prev }\n    }\n  }\n  if (!options.lazy) e.run()   // lazy: true 时不立即运行\n  return e\n}\n\nfunction miniReactive(obj) {\n  return new Proxy(obj, {\n    get(t, k) { track(t, k); return t[k] },\n    set(t, k, v) { t[k] = v; trigger(t, k); return true }\n  })\n}\n\n// ===== TODO：完成 miniComputed =====\nfunction miniComputed(getter) {\n  let value\n  let dirty = true                 // true：下次读取时要重新计算\n  const runner = effect(getter, {\n    lazy: false,\n    scheduler() { dirty = true }   // 依赖改变时只做标记\n  })\n  return {\n    get value() {\n      if (dirty) {\n        value = runner.run()       // 运行 getter，同时收集依赖\n        dirty = false\n      }\n      return value\n    }\n  }\n}\n\n// ===== 已给出：使用 miniComputed =====\nconst state = miniReactive({ price: 10, qty: 2 })\nlet runs = 0\nconst total = miniComputed(() => {\n  runs++\n  return state.price * state.qty\n})\n\nconst view = ref({ total: \'未读取\', runs })\nfunction readTwice() {\n  total.value\n  view.value = { total: total.value, runs }\n}\nfunction changePrice() {\n  state.price += 10\n  view.value = { total: view.value.total, runs }\n}\n\nreturn { view, readTwice, changePrice }', why: '没有用 lazy。effect 创建时就运行了 getter，还没有人读取就计算了一次。' }
  ]
}

// 旧脚本在对象外面补充的字段（原样保留，需要的话可以整理进上面的对象）
miniComputed.solJs = miniComputed.js.replace(`function miniComputed(getter) {
  // 现在：每次读取 .value，都运行 getter
  return {
    get value() {
      return getter()
    }
  }
}`, `function miniComputed(getter) {
  let value
  let dirty = true                 // true：下次读取时要重新计算
  const runner = effect(getter, {
    lazy: true,                    // 创建时不运行 getter
    scheduler() { dirty = true }   // 依赖改变时只做标记
  })
  return {
    get value() {
      if (dirty) {
        value = runner.run()       // 运行 getter，同时收集依赖
        dirty = false
      }
      return value
    }
  }
}`);


// ===== 练习：给迷你响应式加上依赖清理 =====
const CLEANUP_JS = (t1: string, t2: string, t3: string) => `// ===== 已给出：迷你响应式系统（reactive 和 trigger 不用修改） =====
let activeEffect = null
const targetMap = new WeakMap()

function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))
  dep.add(activeEffect)
  ${t1}
}

function trigger(target, key) {
  const dep = targetMap.get(target)?.get(key)
  if (!dep) return
  ;[...dep].forEach(e => e.run())   // 先复制一份：run() 会修改 dep 本身
}

function reactive(obj) {
  return new Proxy(obj, {
    get(t, k, r) { track(t, k); return Reflect.get(t, k, r) },
    set(t, k, v, r) {
      const old = t[k]
      const ok = Reflect.set(t, k, v, r)
      if (!Object.is(old, v)) trigger(t, k)
      return ok
    }
  })
}

// ===== 补全：依赖清理 =====
function cleanup(e) {
  ${t2}
}

function effect(fn) {
  const e = {
    deps: [],   // 这个 effect 订阅过的所有 dep（Set）
    run() {
      ${t3}
      const prev = activeEffect
      activeEffect = e
      try { fn() } finally { activeEffect = prev }
    }
  }
  e.run()
  return e
}

// ===== 已给出：使用 =====
const state = reactive({ useA: true, a: 1, b: 1 })
let runs = 0
const view = ref({ runs: 0, shown: '' })

effect(() => {
  runs++
  const shown = state.useA ? 'a = ' + state.a : 'b = ' + state.b
  view.value = { runs, shown }
})

const toggle = () => { state.useA = !state.useA }
const incA = () => { state.a++ }
const incB = () => { state.b++ }

return { view, toggle, incA, incB }`

const CLEANUP_SOL_1 = 'activeEffect.deps.push(dep)   // 反向记录：这个 effect 订阅了 dep'
const CLEANUP_SOL_2 = 'for (const dep of e.deps) dep.delete(e)   // 先从每个 dep 里退订\n  e.deps.length = 0                       // 再清空自己的记录'
const CLEANUP_SOL_3 = 'cleanup(e)   // 运行 fn 之前清理，运行时重新收集'

export const depCleanup: Exercise = {
  title: '给迷你响应式加上依赖清理', ch: 24,
  task: '<p>脚本里的 <code>effect</code> 读取 <code>state.useA ? state.a : state.b</code>。它还没有依赖清理，所以 <code>useA</code> 变成 false 以后，改 <code>a</code> 仍然会让它运行。补全 3 处 TODO：</p><ol><li>TODO 1：<code>track</code> 里让 effect 记住它订阅了哪个 dep（<code>activeEffect.deps</code> 是数组）。</li><li>TODO 2：<code>cleanup(e)</code> 把 e 从它订阅过的每个 dep 里删掉，再清空 <code>e.deps</code>。</li><li>TODO 3：<code>run</code> 在运行 <code>fn</code> 之前调用清理。</li></ol><p>目标：切换分支后，旧分支读过的属性不再触发这个 effect。</p>',
  tpl: '<p>{{ view.shown }}</p>\n<p>effect 运行次数：{{ view.runs }}</p>\n<button @click="toggle">切换 useA</button>\n<button @click="incA">a + 1</button>\n<button @click="incB">b + 1</button>',
  js: CLEANUP_JS('// TODO 1：让 activeEffect 记住这个 dep', '// TODO 2：把 e 从它订阅过的每个 dep 里删掉，再清空 e.deps', '// TODO 3：运行 fn 之前，先清理旧依赖'),
  solJs: CLEANUP_JS(CLEANUP_SOL_1, CLEANUP_SOL_2, CLEANUP_SOL_3),
  faded: {
    js: CLEANUP_JS(
      'activeEffect.deps.push(/* ✏️ 要记住的 dep */)',
      'for (const dep of e.deps) {\n    /* ✏️ 把 e 从这个 dep 里删掉 */\n  }\n  /* ✏️ 清空 e.deps，下一次运行重新收集 */',
      '/* ✏️ 运行 fn 之前，先做什么 */'
    )
  },
  hints: [
    '清理要做两件事：一是把 effect 从它订阅过的每个 dep（Set）里删掉，二是清空 effect 自己记的 deps。要做第一件事，effect 得先知道它订阅过哪些 dep，所以 track 要反向记录。',
    'track 里 dep.add(activeEffect) 之后，再 activeEffect.deps.push(dep)。cleanup 里遍历 e.deps，对每个 dep 调用 dep.delete(e)，最后 e.deps.length = 0。run 里第一件事是 cleanup(e)。',
    'track：activeEffect.deps.push(dep)\ncleanup：for (const dep of e.deps) dep.delete(e); e.deps.length = 0\nrun：在 const prev = activeEffect 之前调用 cleanup(e)'
  ],
  async check(T) {
    const runs = () => { const m = T.text().match(/运行次数：\s*(\d+)/); return m ? +m[1] : -1 }
    const shown = () => { const p = T.$$('p')[0]; return p ? p.textContent.trim() : '' }
    const press = async (name: string) => { const b = T.btn(name); if (b) await T.click(b); return !!b }
    for (const n of ['切换 useA', 'a + 1', 'b + 1']) if (!T.btn(n)) { T.ok(false, '找到按钮“' + n + '”'); return }
    T.ok(runs() === 1, '创建时运行 1 次（当前 ' + runs() + ' 次）')
    await press('b + 1')
    T.ok(runs() === 1, 'useA 为 true 时没读过 b，改 b 不运行（当前 ' + runs() + ' 次）')
    await press('切换 useA')
    T.ok(runs() === 2 && /b = 1/.test(shown()) === false && /b = 2/.test(shown()), '切换后运行第 2 次，改读 b（当前 ' + runs() + ' 次，显示 ' + shown() + '）')
    await press('a + 1')
    T.ok(runs() === 2, '切换后旧依赖 a 已清理，改 a 不再运行（当前 ' + runs() + ' 次）')
    await press('b + 1')
    T.ok(runs() === 3, '改 b 运行第 3 次（当前 ' + runs() + ' 次）')
    await press('切换 useA')
    T.ok(runs() === 4 && /a = 2/.test(shown()), '切回 useA 运行第 4 次，改读 a（当前 ' + runs() + ' 次，显示 ' + shown() + '）')
    await press('b + 1')
    T.ok(runs() === 4, '切回后旧依赖 b 已清理，改 b 不再运行（当前 ' + runs() + ' 次）')
    await press('a + 1')
    T.ok(runs() === 5, '改 a 运行第 5 次，一次改动只运行一次（当前 ' + runs() + ' 次）')
  },
  wrong: [
    {
      js: CLEANUP_JS(CLEANUP_SOL_1, 'e.deps.length = 0   // 清空记录', CLEANUP_SOL_3),
      why: '只清空了 effect 自己的数组，没有从 dep 里退订。dep 里仍然有这个 effect，旧依赖照样触发它。',
      expectFail: /旧依赖/
    },
    {
      js: CLEANUP_JS('// 忘了反向记录', CLEANUP_SOL_2, CLEANUP_SOL_3),
      why: 'track 没有把 dep 记进 activeEffect.deps，cleanup 遍历的是空数组，什么也删不掉。',
      expectFail: /旧依赖/
    },
    {
      js: sub(CLEANUP_JS(CLEANUP_SOL_1, CLEANUP_SOL_2, '// 不在这里清理'), 'try { fn() } finally { activeEffect = prev }', 'try { fn() } finally { activeEffect = prev; cleanup(e) }'),
      why: '在 fn 运行之后清理，会把刚收集到的依赖删光。effect 之后不再被任何数据触发。',
      expectFail: /切换后运行第 2 次/
    }
  ]
}


// ===== 练习：带版本号的 computed 缓存 =====
const VC_JS = (body: string) => `// ===== 已给出：带版本号的迷你响应式（不用修改） =====
let globalVersion = 0         // 任何数据改变，加 1
let collecting = null         // 正在运行的 getter 把读到的 dep 记在这里
class Dep { version = 0 }     // 这个数据改变一次，加 1

function miniRef(initial) {
  const dep = new Dep()
  let value = initial
  return {
    get value() {
      if (collecting) collecting.set(dep, dep.version)   // 记下：读到了哪个 dep，当时的 version
      return value
    },
    set value(next) {
      if (Object.is(next, value)) return                 // 值没变：什么都不加
      value = next
      dep.version++
      globalVersion++
    }
  }
}

// 运行 getter。返回 { value, deps }，deps 是 Map(dep -> 读取时的 version)
function collect(getter) {
  const prev = collecting
  collecting = new Map()
  try { return { value: getter(), deps: collecting } }
  finally { collecting = prev }
}

// ===== 补全：只靠版本号做缓存。没有 dirty 标记，没有 scheduler =====
function miniComputed(getter) {
  let cached
  let deps = null        // 上次计算时的 Map(dep -> version)
  let seenGlobal = -1    // 上次检查时的 globalVersion
  return {
    get value() {
${body}
      return cached
    }
  }
}

// ===== 已给出：使用 =====
const a = miniRef(1)
const b = miniRef(2)
const c = miniRef(0)          // 和 total 无关
let runs = 0
const total = miniComputed(() => { runs++; return a.value + b.value })

const view = ref({ total: '未读取', runs: 0 })
const read = () => { view.value = { total: total.value, runs } }
const incA = () => { a.value++ }
const incB = () => { b.value++ }
const incC = () => { c.value++ }
const sameA = () => { a.value = a.value }

return { view, read, incA, incB, incC, sameA }`

const VC_SOL = `      if (seenGlobal === globalVersion) return cached     // 1. 整个世界没变过：直接用缓存
      seenGlobal = globalVersion
      // 2. 世界变了，但只在 dep 的 version 真的变了才重算
      const stale = !deps || [...deps].some(([dep, v]) => dep.version !== v)
      if (stale) {
        const r = collect(getter)                          // 3. 重算，同时换成新的依赖记录
        cached = r.value
        deps = r.deps
      }`

export const versionComputed: Exercise = {
  title: '实现带版本号的 computed 缓存', ch: 24,
  task: '<p>Vue 3.5 的 computed 不靠 <code>scheduler</code> 打脏标记，而是靠版本号判断缓存能不能用。脚本里已经有 <code>globalVersion</code>、每个数据的 <code>dep.version</code>，以及 <code>collect(getter)</code>（运行 getter，并返回读到的 dep 和当时的 version）。补全 <code>miniComputed</code> 的 <code>value</code>：</p><ol><li>TODO 1：<code>globalVersion</code> 和上次检查时相同，直接返回 <code>cached</code>。</li><li>TODO 2：不同时，记下新的 <code>seenGlobal</code>。</li><li>TODO 3：从没算过，或任何一个依赖的 <code>dep.version</code> 和记录的不同，才重新计算，并更新 <code>cached</code> 和 <code>deps</code>。</li></ol><p>目标：无关数据 <code>c</code> 改变时，getter 不运行。</p>',
  tpl: '<p>total：{{ view.total }}</p>\n<p>getter 运行次数：{{ view.runs }}</p>\n<button @click="read">读取 total.value</button>\n<button @click="incA">a + 1</button>\n<button @click="incB">b + 1</button>\n<button @click="incC">c + 1（无关）</button>\n<button @click="sameA">把 a 设成相同的值</button>',
  js: VC_JS('      // TODO 1：globalVersion 没变，直接返回 cached\n      // TODO 2：否则，记下 seenGlobal\n      // TODO 3：从没算过，或有 dep 的 version 变了，才用 collect(getter) 重算，并更新 cached 和 deps'),
  solJs: VC_JS(VC_SOL),
  faded: {
    js: VC_JS(`      if (/* ✏️ 什么条件下可以直接返回缓存 */ false) return cached
      seenGlobal = globalVersion
      const stale = !deps || [...deps].some(([dep, v]) => /* ✏️ 一个依赖「变了」的条件 */ false)
      if (stale) {
        const r = collect(getter)
        cached = r.value
        /* ✏️ 换成这次读到的依赖记录 */
      }`)
  },
  hints: [
    'computed 不需要知道「是谁改了数据」，只需要比较版本号。先比较 globalVersion（便宜，一个数字）。它没变，什么都不用做。',
    'globalVersion 变了，只说明某个数据变过，不说明 total 的依赖变过。再遍历 deps（Map），把每个 dep.version 和记录的 version 比较，有一个不同才重算。重算后用 collect 返回的新 deps 覆盖旧的。',
    'if (seenGlobal === globalVersion) return cached\nseenGlobal = globalVersion\nconst stale = !deps || [...deps].some(([dep, v]) => dep.version !== v)\nif (stale) { const r = collect(getter); cached = r.value; deps = r.deps }'
  ],
  async check(T) {
    const runs = () => { const m = T.text().match(/运行次数：\s*(\d+)/); return m ? +m[1] : -1 }
    const total = () => { const p = T.$$('p').find(x => /total：/.test(x.textContent)); return p ? p.textContent.replace(/^\s*total：\s*/, '').trim() : '' }
    for (const n of ['读取', 'a + 1', 'b + 1', 'c + 1', '相同的值']) if (!T.btn(n)) { T.ok(false, '找到按钮“' + n + '”'); return }
    const press = async (name: string) => { await T.click(T.btn(name)) }
    T.ok(runs() === 0, '创建时 getter 不运行（当前 ' + runs() + ' 次）')
    await press('读取')
    T.ok(total() === '3' && runs() === 1, '第一次读取：total = 3，getter 运行 1 次（当前 ' + total() + '，' + runs() + ' 次）')
    await press('读取')
    T.ok(runs() === 1, '依赖没变，再读取一次不重算（当前 ' + runs() + ' 次）')
    await press('c + 1')
    await press('读取')
    T.ok(runs() === 1, '无关数据 c 改变后，globalVersion 变了但依赖的 version 没变，不重算（当前 ' + runs() + ' 次）')
    await press('a + 1')
    await press('读取')
    T.ok(total() === '4' && runs() === 2, 'a 改变后重算：total = 4，共 2 次（当前 ' + total() + '，' + runs() + ' 次）')
    await press('相同的值')
    await press('读取')
    T.ok(runs() === 2, '把 a 设成相同的值，version 不变，不重算（当前 ' + runs() + ' 次）')
    await press('b + 1')
    await press('读取')
    T.ok(total() === '5' && runs() === 3, 'b 改变后重算：total = 5，共 3 次（当前 ' + total() + '，' + runs() + ' 次）')
    await press('c + 1')
    await press('读取')
    T.ok(runs() === 3, '重算后换了新的依赖记录，无关数据 c 再改变，仍然不重算（当前 ' + runs() + ' 次）')
  },
  wrong: [
    {
      js: VC_JS(`      if (seenGlobal === globalVersion) return cached
      seenGlobal = globalVersion
      const r = collect(getter)
      cached = r.value
      deps = r.deps`),
      why: '只看 globalVersion：任何数据改变都重算。无关数据 c 一变，getter 就白白运行一次。',
      expectFail: /无关数据 c/
    },
    {
      js: VC_JS(`      if (seenGlobal === globalVersion) return cached
      seenGlobal = globalVersion
      const first = deps && [...deps][0]
      const stale = !deps || first[0].version !== first[1]
      if (stale) {
        const r = collect(getter)
        cached = r.value
        deps = r.deps
      }`),
      why: '只比较了第一个依赖。b 是第二个依赖，它变了却没被发现，读到的是过期的缓存。',
      expectFail: /b 改变后/
    },
    {
      js: VC_JS(`      if (seenGlobal === globalVersion) return cached
      seenGlobal = globalVersion
      const stale = !deps || [...deps].some(([dep, v]) => dep.version !== v)
      if (stale) {
        const r = collect(getter)
        cached = r.value
        if (!deps) deps = r.deps
      }`),
      why: '重算后没有换成新的依赖记录，记录里还是第一次的 version。a 改过以后，记录永远落后，之后无论哪个数据改变，都被认为「有依赖变了」。',
      expectFail: /换了新的依赖记录/
    }
  ]
}
