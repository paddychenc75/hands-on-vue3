import type { Exercise } from './types'
import { sub } from './types'

export const testAwait: Exercise = {
  title: '修复：组件没有错误，测试却失败', ch: 22,
  task: '<p>说明：练习台不能运行 Vitest。脚本中有一个迷你的 mount 和 expect，它们模仿 @vue/test-utils 和 Vitest。trigger 和真实的版本一样，返回一个 Promise。</p><ol><li>阅读测试 testCounter。Counter 组件没有错误，但是测试失败。</li><li>只修改 testCounter，让测试通过。不要修改 expect 的期望值。</li><li>脚本用同一个测试检查两个组件：Counter 正确，BrokenCounter 点击后不变。修好后 Counter 应通过，BrokenCounter 应失败。</li></ol>',
  tpl: '<p class="result">测试 Counter：{{ result }}</p>\n<p class="broken">测试 BrokenCounter：{{ broken }}</p>',
  js: `// ===== 已给出：迷你的 mount 和 expect（不用修改） =====
function mount(Comp) {
  const host = document.createElement('div')
  Vue.createApp(Comp).mount(host)
  return {
    text: () => host.textContent,
    find(selector) {
      const el = host.querySelector(selector)
      return {
        // 和 @vue/test-utils 一样：触发事件，返回 Promise
        trigger(type) {
          el.dispatchEvent(new Event(type))
          return nextTick()
        }
      }
    }
  }
}
function expect(actual) {
  return {
    toContain(s) {
      if (!String(actual).includes(s)) throw new Error('期望包含“' + s + '”，实际是“' + actual + '”')
    }
  }
}

// ===== 被测试的组件（不用修改） =====
const Counter = {
  setup() { return { n: ref(0) } },
  template: '<button @click="n++">点了 {{ n }} 次</button>'
}
const BrokenCounter = {           // 有错误：点击后不变。用来确认测试真的能发现问题
  setup() { return { n: ref(0) } },
  template: '<button>点了 {{ n }} 次</button>'
}

// ===== TODO：修复这个测试 =====
async function testCounter(Comp) {
  const wrapper = mount(Comp)
  wrapper.find('button').trigger('click')
  expect(wrapper.text()).toContain('点了 1 次')
}

// ===== 已给出：运行测试，显示结果 =====
const result = ref('运行中…'), broken = ref('运行中…')
function run(Comp, out) {
  testCounter(Comp).then(
    () => { out.value = '通过' },
    e => { out.value = '失败：' + e.message }
  )
}
run(Counter, result)
run(BrokenCounter, broken)
return { result, broken }`,
  solJs: `// ===== 已给出：迷你的 mount 和 expect（不用修改） =====
function mount(Comp) {
  const host = document.createElement('div')
  Vue.createApp(Comp).mount(host)
  return {
    text: () => host.textContent,
    find(selector) {
      const el = host.querySelector(selector)
      return {
        // 和 @vue/test-utils 一样：触发事件，返回 Promise
        trigger(type) {
          el.dispatchEvent(new Event(type))
          return nextTick()
        }
      }
    }
  }
}
function expect(actual) {
  return {
    toContain(s) {
      if (!String(actual).includes(s)) throw new Error('期望包含“' + s + '”，实际是“' + actual + '”')
    }
  }
}

// ===== 被测试的组件（不用修改） =====
const Counter = {
  setup() { return { n: ref(0) } },
  template: '<button @click="n++">点了 {{ n }} 次</button>'
}
const BrokenCounter = {           // 有错误：点击后不变。用来确认测试真的能发现问题
  setup() { return { n: ref(0) } },
  template: '<button>点了 {{ n }} 次</button>'
}

async function testCounter(Comp) {
  const wrapper = mount(Comp)
  await wrapper.find('button').trigger('click')   // 等待 DOM 更新
  expect(wrapper.text()).toContain('点了 1 次')
}

// ===== 已给出：运行测试，显示结果 =====
const result = ref('运行中…'), broken = ref('运行中…')
function run(Comp, out) {
  testCounter(Comp).then(
    () => { out.value = '通过' },
    e => { out.value = '失败：' + e.message }
  )
}
run(Counter, result)
run(BrokenCounter, broken)
return { result, broken }`,
  hints: [
    '原因：点击后，Vue 没有立即更新 DOM。测试在下一行就读取文字，读到的是点击之前的结果。组件没有错误，是测试检查得太早。测试要等 DOM 更新完成，再检查结果。第 22 章“22.6 测试组件”后面的注意事项讲了它。',
    '只改 trigger 这一行。在这一行前面加一个关键字，等待 trigger 返回的 Promise。testCounter 已经是 async 函数。',
    'await wrapper.find(\'button\').trigger(\'click\')'
  ],
  async check(T) {
    await new Promise(r => setTimeout(r, 50));
    const t = ((T.$('.result') || {}).textContent || '').replace(/^\s*测试 Counter：\s*/, '').trim();
    T.ok(t === '通过', 'Counter 的测试通过（当前：' + t + '）');
    const bt = ((T.$('.broken') || {}).textContent || '').replace(/^\s*测试 BrokenCounter：\s*/, '').trim();
    T.ok(/^失败/.test(bt), '同一个测试能发现 BrokenCounter 的错误（当前：' + bt + '）。删掉断言或放宽期望，测试就发现不了问题');
    T.ok(/点了 1 次/.test(bt), 'BrokenCounter 的失败信息说明期望包含“点了 1 次”（当前：' + bt + '）');
  }
}

export const fbTooling: Exercise = {
  title: '补全：让测试能发现错误', ch: 22,
  task: '<p>说明：练习台不能运行 Vitest。脚本中有一个迷你的 mount 和 expect，它们模仿 @vue/test-utils 和 Vitest。</p><p>testToggle 测试一个开关组件。脚本用同一个测试检查两个组件：Toggle 正确，BrokenToggle 点击后不变。现在两个都“通过”。原因：测试点击后没有断言。没有断言的测试总是通过。</p><ol><li>只补全 testToggle 中的一行 TODO：断言点击后文字包含“开”。</li><li>确认 Toggle 通过，BrokenToggle 失败。</li></ol>',
  tpl: '<p class="good">测试 Toggle：{{ good }}</p>\n<p class="broken">测试 BrokenToggle：{{ broken }}</p>',
  js: `// ===== 已给出：迷你的 mount 和 expect（不用修改） =====
function mount(Comp) {
  const host = document.createElement('div')
  Vue.createApp(Comp).mount(host)
  return {
    text: () => host.textContent,
    find(selector) {
      const el = host.querySelector(selector)
      return {
        trigger(type) {                 // 触发事件，返回 Promise
          el.dispatchEvent(new Event(type))
          return nextTick()
        }
      }
    }
  }
}
function expect(actual) {
  return {
    toContain(s) {
      if (!String(actual).includes(s)) throw new Error('期望包含“' + s + '”，实际是“' + actual + '”')
    }
  }
}

// ===== 被测试的两个组件（不用修改） =====
const Toggle = {
  setup() { return { on: ref(false) } },
  template: '<button @click="on = !on">{{ on ? "开" : "关" }}</button>'
}
const BrokenToggle = {                  // 错误：点击后不改变
  setup() { return { on: ref(false) } },
  template: '<button>{{ on ? "开" : "关" }}</button>'
}

// ===== 测试：只差最后一行 =====
async function testToggle(Comp) {
  const wrapper = mount(Comp)
  expect(wrapper.text()).toContain('关')
  await wrapper.find('button').trigger('click')   // await：等待 DOM 更新
  // TODO：断言点击后文字包含“开”
}

// ===== 已给出：用同一个测试检查两个组件 =====
const good = ref('运行中…')
const broken = ref('运行中…')
function runTest(Comp, out) {
  testToggle(Comp).then(
    () => { out.value = '通过' },
    e => { out.value = '失败：' + e.message }
  )
}
runTest(Toggle, good)
runTest(BrokenToggle, broken)
return { good, broken }`,
  solJs: `// ===== 已给出：迷你的 mount 和 expect（不用修改） =====
function mount(Comp) {
  const host = document.createElement('div')
  Vue.createApp(Comp).mount(host)
  return {
    text: () => host.textContent,
    find(selector) {
      const el = host.querySelector(selector)
      return {
        trigger(type) {                 // 触发事件，返回 Promise
          el.dispatchEvent(new Event(type))
          return nextTick()
        }
      }
    }
  }
}
function expect(actual) {
  return {
    toContain(s) {
      if (!String(actual).includes(s)) throw new Error('期望包含“' + s + '”，实际是“' + actual + '”')
    }
  }
}

// ===== 被测试的两个组件（不用修改） =====
const Toggle = {
  setup() { return { on: ref(false) } },
  template: '<button @click="on = !on">{{ on ? "开" : "关" }}</button>'
}
const BrokenToggle = {                  // 错误：点击后不改变
  setup() { return { on: ref(false) } },
  template: '<button>{{ on ? "开" : "关" }}</button>'
}

// ===== 测试：只差最后一行 =====
async function testToggle(Comp) {
  const wrapper = mount(Comp)
  expect(wrapper.text()).toContain('关')
  await wrapper.find('button').trigger('click')   // await：等待 DOM 更新
  expect(wrapper.text()).toContain('开')          // 没有这一行，测试总是通过
}

// ===== 已给出：用同一个测试检查两个组件 =====
const good = ref('运行中…')
const broken = ref('运行中…')
function runTest(Comp, out) {
  testToggle(Comp).then(
    () => { out.value = '通过' },
    e => { out.value = '失败：' + e.message }
  )
}
runTest(Toggle, good)
runTest(BrokenToggle, broken)
return { good, broken }`,
  hints: [
    '组件测试分三步：挂载，触发事件，断言结果。没有断言时，测试函数不抛出错误，所以总是通过。第 22 章“22.6 测试组件”的 Counter.spec.js 示例讲了它。',
    '只改 TODO 这一行。照抄上面检查“关”的那一行，把期望的文字改为“开”。',
    "expect(wrapper.text()).toContain('开')"
  ],
  async check(T) {
    await new Promise(r => setTimeout(r, 50));
    const g = ((T.$('.good') || {}).textContent || '').replace(/^\s*测试 Toggle：\s*/, '').trim();
    const b = ((T.$('.broken') || {}).textContent || '').replace(/^\s*测试 BrokenToggle：\s*/, '').trim();
    T.ok(g === '通过', 'Toggle 的测试通过（当前：' + g + '）');
    T.ok(/^失败/.test(b), '测试发现 BrokenToggle 的错误，结果是“失败”（当前：' + b + '）');
    T.ok(/开/.test(b), '失败信息说明期望包含“开”（当前：' + b + '）');
  }
}

// ===== 错误解法（基于参考答案做小改动）=====
testAwait.wrong = [
  { js: sub(testAwait.solJs, "  await wrapper.find('button').trigger('click')   // 等待 DOM 更新\n  expect(wrapper.text()).toContain('点了 1 次')", "  const text = wrapper.text()                     // 先读文字\n  await wrapper.find('button').trigger('click')\n  expect(text).toContain('点了 1 次')"), why: '在点击之前就读了文字，等待更新之后断言的还是旧文字。要在 await 之后再读 wrapper.text()。', expectFail: /Counter 的测试通过/ },
  { js: sub(testAwait.solJs, "  await wrapper.find('button').trigger('click')   // 等待 DOM 更新", "  const btn = await wrapper.find('button')        // await 加错了位置\n  btn.trigger('click')"), why: 'await 加在了 find 上。find 返回的不是 Promise，没有等待任何东西。要等的是 trigger 返回的 Promise。', expectFail: /Counter 的测试通过/ },
  { js: sub(testAwait.solJs, "  expect(wrapper.text()).toContain('点了 1 次')\n", ""), why: '删掉断言，Counter 的测试当然“通过”。但没有断言的测试什么都发现不了，BrokenCounter 也“通过”了。', expectFail: /BrokenCounter/ },
  { js: sub(testAwait.solJs, "toContain('点了 1 次')", "toContain('点了')"), why: '把期望放宽到“点了”，点击前后的文字都满足，BrokenCounter 也“通过”。断言要能区分对和错。', expectFail: /BrokenCounter/ }
]

fbTooling.wrong = [
  { js: sub(fbTooling.solJs, "  expect(wrapper.text()).toContain('开')          // 没有这一行，测试总是通过", "  expect(wrapper.text()).toContain('关')"), why: '照抄上一行，没有把期望改成“开”。点击后文字应该是“开”，这个断言让 Toggle 反而失败，并且发现不了 BrokenToggle。' },
  { js: sub(fbTooling.solJs, "  expect(wrapper.text()).toContain('关')\n  await wrapper.find('button').trigger('click')   // await：等待 DOM 更新\n  expect(wrapper.text()).toContain('开')          // 没有这一行，测试总是通过", "  expect(wrapper.text()).toContain('关')\n  expect(wrapper.text()).toContain('开')          // 断言放在点击之前\n  await wrapper.find('button').trigger('click')"), why: '断言放在了点击之前。这时文字还是“关”，两个组件的测试都失败，测试检查的不是点击的效果。' }
]

// ===== 半成品示例（参考答案挖掉关键处，占位说明做什么）=====
testAwait.faded = {
  js: sub(sub(testAwait.solJs, "await wrapper.find('button').trigger('click')   // 等待 DOM 更新",
    "/* ✏️ 点击后 DOM 不会立即更新：断言之前要先等什么？ */ wrapper.find('button').trigger('click')"),
    "toContain('点了 1 次')", "toContain('' /* ✏️ 点击一次后，按钮上应该显示的文字 */)")
}

fbTooling.faded = {
  js: sub(sub(fbTooling.solJs, "await wrapper.find('button').trigger('click')   // await：等待 DOM 更新",
    "/* ✏️ 点击后要先等 DOM 更新，才能断言 */ wrapper.find('button').trigger('click')"),
    "expect(wrapper.text()).toContain('开')          // 没有这一行，测试总是通过",
    "/* ✏️ 断言点击后文字包含“开”（没有断言的测试总是通过） */")
}
