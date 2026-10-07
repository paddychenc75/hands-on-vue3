import type { Exercise } from './types'

export const computedFill: Exercise = {
  title: '补全：迷你 computed 的缓存标记', ch: 12,
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
  hints: [
    'computed 用一个 dirty 标记实现缓存：依赖改变时设为 true，计算后设为 false。第 12 章的实验台“手写响应式”讲了 effect 和 trigger。trigger 在依赖改变时调用 scheduler。',
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
  title: '手写一个迷你 computed', ch: 12,
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
  hints: [
    'computed 用 lazy 的 effect 加一个 dirty 标记实现缓存。依赖改变时，scheduler 只设置 dirty，不计算。第 12 章的实验台“手写响应式”讲了 effect、track 和 trigger。本题的 effect 多了 lazy 和 scheduler 两个选项。',
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
