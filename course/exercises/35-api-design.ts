import type { Exercise } from './types'
import { nextTick } from 'vue'
import { sub } from './types'

// ===================== 35.2 受控与非受控 =====================
const CTRL_JS_TAIL = `
const Counter = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    // 传 undefined 表示非受控；其他值表示受控
    const n = useControllable(() => props.modelValue, 0, v => emit('update:modelValue', v))
    return { n }
  },
  template: '<button class="c" @click="n = n + 1">{{ n }}</button>'
}

const a = ref(5)
const freeSeen = ref([])
const lockedSeen = ref([])
return { a, freeSeen, lockedSeen, components: { Counter } }`
const CTRL_SOL = `// value：受控时的值，可以是 ref、getter 或普通值。undefined 表示非受控
function useControllable(value, defaultValue, onChange) {
  const inner = ref(defaultValue)
  const isControlled = () => toValue(value) !== undefined
  return computed({
    get: () => (isControlled() ? toValue(value) : inner.value),
    set(v) {
      if (!isControlled()) inner.value = v
      onChange?.(v)
    }
  })
}
`
export const useControllable: Exercise = {
  title: '实现受控与非受控的状态', ch: 35,
  task: '<p>写 <code>useControllable(value, defaultValue, onChange)</code>，返回一个可写的 computed。</p><ol><li><code>toValue(value)</code> 不是 undefined：受控。读到的永远是 <code>toValue(value)</code>。写入时只调用 <code>onChange</code>，不改内部状态。</li><li><code>toValue(value)</code> 是 undefined：非受控。读写内部状态（初值是 <code>defaultValue</code>），写入时也调用 <code>onChange</code>。</li><li>是否受控要在每次读写时重新判断。父组件随时可能改变传入的值。</li></ol>',
  tpl: `<p>非受控：<Counter class="free" @update:model-value="freeSeen.push($event)" /></p>
<p>受控：<Counter class="ctrl" v-model="a" />，父组件的 a = <span class="a">{{ a }}</span> <button class="set" @click="a = 10">父组件设为 10</button></p>
<p>受控，父组件不更新：<Counter class="locked" :model-value="7" @update:model-value="lockedSeen.push($event)" /></p>
<p class="cap">非受控收到：<span class="fs">{{ freeSeen.join() }}</span>。不更新的那个收到：<span class="ls">{{ lockedSeen.join() }}</span></p>`,
  js: '// value：受控时的值，可以是 ref、getter 或普通值。undefined 表示非受控\nfunction useControllable(value, defaultValue, onChange) {\n  // TODO\n  return ref(defaultValue)\n}\n' + CTRL_JS_TAIL,
  solJs: CTRL_SOL + CTRL_JS_TAIL,
  hints: [
    '“35.2 受控与非受控”讲了判断规则：值是 undefined 就是非受控。',
    '内部状态用 ref(defaultValue)。是否受控写成一个函数 () => toValue(value) !== undefined，每次读写时调用。',
    '返回 computed({ get, set })。get：受控时读 toValue(value)，否则读内部状态。set：非受控时才改内部状态，然后调用 onChange?.(v)。'
  ],
  async check(T) {
    const num = (s: string) => ((T.$(s) as any)?.textContent || '').trim()
    const btn = (s: string) => T.$(s) as HTMLElement
    // 非受控
    T.ok(num('.free') === '0', '非受控的初值是 defaultValue 0（当前：' + num('.free') + '）')
    await T.click(btn('.free')); await T.click(btn('.free'))
    T.ok(num('.free') === '2', '非受控：点两次后显示 2，值保存在内部（当前：' + num('.free') + '）')
    T.ok(num('.fs') === '1,2', '非受控也要调用 onChange，通知父组件（收到：' + num('.fs') + '）')
    // 受控
    T.ok(num('.ctrl') === '5', '受控：显示父组件传入的 5（当前：' + num('.ctrl') + '）')
    await T.click(btn('.ctrl'))
    T.ok(num('.ctrl') === '6' && num('.a') === '6', '受控：点击后 onChange 通知父组件，父组件更新 a，计数器显示 6（计数器 ' + num('.ctrl') + '，a=' + num('.a') + '）')
    await T.click(btn('.set'))
    T.ok(num('.ctrl') === '10', '受控：父组件把 a 改成 10 后，计数器显示 10（当前：' + num('.ctrl') + '）')
    await T.click(btn('.ctrl'))
    T.ok(num('.a') === '11' && num('.ctrl') === '11', '受控：父组件改值之后，再点击得到 11')
    // 受控，父组件不更新
    T.ok(num('.locked') === '7', '受控但父组件不更新：显示 7')
    await T.click(btn('.locked')); await T.click(btn('.locked'))
    T.ok(num('.locked') === '7', '受控：父组件不接受新值，计数器仍显示 7，不能改自己的内部状态（当前：' + num('.locked') + '）')
    T.ok(num('.ls') === '8,8', '受控：每次写入仍调用 onChange，把想要的新值交给父组件（收到：' + num('.ls') + '）')
  }
}
useControllable.wrong = [
  { js: sub(sub(sub(useControllable.solJs, 'const inner = ref(defaultValue)', 'const inner = ref(toValue(value) ?? defaultValue)'), 'get: () => (isControlled() ? toValue(value) : inner.value)', 'get: () => inner.value'), '      if (!isControlled()) inner.value = v\n', '      inner.value = v\n'), why: '把传入的值复制到内部状态，之后只读写内部状态。父组件改变传入的值时组件不会跟着变，父组件拒绝新值时组件却自己变了：状态有了两份。受控时，值只来自父组件。', expectFail: /改成 10|不能改自己/ },
  { js: sub(sub(useControllable.solJs, 'const inner = ref(defaultValue)\n', 'const inner = ref(defaultValue)\n  const first = toValue(value)\n'), 'get: () => (isControlled() ? toValue(value) : inner.value)', 'get: () => (isControlled() ? first : inner.value)'), why: '把受控的值读了一次就存下来，相当于把 prop 复制成本地状态。父组件之后改变这个值，组件不会跟着变。', expectFail: /更新 a|改成 10/ },
  { js: sub(useControllable.solJs, '      onChange?.(v)\n', '      if (isControlled()) onChange?.(v)\n'), why: '非受控时没有调用 onChange。使用者想在非受控模式下也得知变化（例如记日志），却收不到通知。', expectFail: /非受控也要调用/ }
]
useControllable.faded = {
  js: sub(useControllable.solJs, "  const isControlled = () => toValue(value) !== undefined\n  return computed({\n    get: () => (isControlled() ? toValue(value) : inner.value),\n    set(v) {\n      if (!isControlled()) inner.value = v\n      onChange?.(v)\n    }\n  })\n",
    "  const isControlled = () => /* ✏️ 怎样判断“受控”？每次读写时都要重新判断 */ false\n  return computed({\n    get: () => /* ✏️ 受控读 toValue(value)，非受控读 inner.value */ inner.value,\n    set(v) {\n      /* ✏️ 只有非受控才修改 inner */\n      onChange?.(v)\n    }\n  })\n")
}

// ===================== 35.4 实现 useListbox =====================
const LB_JS_HEAD = `const options = ref([
  { value: 'apple', label: '苹果' },
  { value: 'banana', label: '香蕉' },
  { value: 'cherry', label: '樱桃', disabled: true },
  { value: 'durian', label: '榴莲' },
  { value: 'grape', label: '葡萄' }
])

function useListbox(options) {
  const selected = ref(null)   // 选中项的 value
  const active = ref(-1)       // 高亮项的下标，-1 表示没有
  const uid = useId()
  const optId = i => uid + '-opt-' + i
  function select(i) {
    const o = options.value[i]
    if (o && !o.disabled) selected.value = o.value
  }

`
const LB_SOL_BODY = `  // 从 from 出发，朝 step（1 或 -1）方向找下一个没有 disabled 的下标。到头了就停在 from
  function move(from, step) {
    const n = options.value.length
    let i = from
    do { i += step } while (i >= 0 && i < n && options.value[i].disabled)
    return i >= 0 && i < n ? i : from
  }
  function onKeydown(e) {
    if (e.key === 'ArrowDown') active.value = move(active.value, 1)
    else if (e.key === 'ArrowUp') active.value = move(active.value, -1)
    else if (e.key === 'Home') active.value = move(-1, 1)
    else if (e.key === 'End') active.value = move(options.value.length, -1)
    else if (e.key === 'Enter' || e.key === ' ') select(active.value)
    else return
    e.preventDefault()   // 方向键和空格不要让页面滚动
  }

  const listboxProps = computed(() => ({
    role: 'listbox',
    tabindex: 0,
    'aria-activedescendant': active.value >= 0 ? optId(active.value) : undefined,
    onKeydown
  }))
  function optionProps(i) {
    const o = options.value[i]
    return {
      id: optId(i),
      role: 'option',
      'aria-selected': o.value === selected.value,
      'aria-disabled': o.disabled || undefined,
      onClick: () => { if (o.disabled) return; active.value = i; select(i) }
    }
  }
`
const LB_TAIL = `  return { listboxProps, optionProps }
}

const { listboxProps, optionProps } = useListbox(options)
return { options, listboxProps, optionProps }`
const LB_STARTER_BODY = `  // TODO 1：从 from 出发，朝 step（1 或 -1）方向找下一个没有 disabled 的下标。到头了就返回 from
  function move(from, step) {
    return from
  }
  // TODO 2：ArrowDown / ArrowUp / Home / End 改 active；Enter 和空格调用 select(active.value)
  function onKeydown(e) {
  }

  // TODO 3：listboxProps 给列表容器，optionProps(i) 给第 i 个选项
  const listboxProps = computed(() => ({}))
  function optionProps(i) {
    return {}
  }
`
export const useListbox: Exercise = {
  title: '实现 useListbox', ch: 35,
  task: '<p>useListbox 只管状态和行为，不管标记。它返回两组绑定对象，使用者用 <code>v-bind</code> 绑在自己的元素上。选项数组里有一项是 disabled。</p><ol><li><code>move(from, step)</code>：朝 step 方向找下一个没有 disabled 的下标。到头就停在原地，不循环。</li><li><code>onKeydown</code>：<code>ArrowDown</code> 和 <code>ArrowUp</code> 移动高亮。<code>Home</code> 和 <code>End</code> 跳到第一个和最后一个可用项。<code>Enter</code> 和空格选中高亮项。处理过的按键调用 <code>preventDefault()</code>，其他按键不处理。</li><li><code>listboxProps</code>：<code>role="listbox"</code>、<code>tabindex</code> 为 0、<code>aria-activedescendant</code> 指向高亮项的 id（没有高亮时不写）、<code>onKeydown</code>。</li><li><code>optionProps(i)</code>：<code>id</code>、<code>role="option"</code>、<code>aria-selected</code>、disabled 项的 <code>aria-disabled</code>，和点击处理（disabled 的项点击无效）。</li></ol><p>键盘焦点始终留在列表容器上，变化的是 aria-activedescendant。</p>',
  tpl: `<ul class="lb" v-bind="listboxProps">
  <li v-for="(o, i) in options" :key="o.value" class="opt" v-bind="optionProps(i)">{{ o.label }}</li>
</ul>`,
  js: LB_JS_HEAD + LB_STARTER_BODY + LB_TAIL,
  solJs: LB_JS_HEAD + LB_SOL_BODY + LB_TAIL,
  hints: [
    '“35.3 无渲染组件的三层”和“35.4 键盘与焦点：无障碍的最低要求”给出了这些行为的规则。先写 move，再写 onKeydown，最后写绑定对象。',
    'move 用一个循环：先加 step，遇到 disabled 就继续加。越界就返回 from。Home 相当于从 -1 往后找，End 相当于从 length 往前找。',
    '用户还没按过方向键时 active 是 -1。这时按 Enter，select(-1) 必须什么也不做（select 已经检查了）。',
    'aria-selected 写成 o.value === selected.value。aria-disabled 写成 o.disabled || undefined：不是 disabled 时不写这个属性。',
    '完整答案见参考答案。onKeydown 最后一行的 e.preventDefault() 只对处理过的按键执行，其他按键 return。'
  ],
  async check(T) {
    const ul = T.$('ul.lb') as HTMLElement
    if (!ul) { T.ok(false, '找到列表容器 ul.lb'); return }
    const lis = () => T.$$('li.opt') as HTMLElement[]
    const press = async (k: string) => {
      const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })
      ul.dispatchEvent(ev)
      await nextTick()
      return ev
    }
    const cur = () => {
      const id = ul.getAttribute('aria-activedescendant')
      return id ? (lis().find(l => l.id === id)?.textContent || '?') : '无'
    }
    const sel = () => lis().filter(l => l.getAttribute('aria-selected') === 'true').map(l => l.textContent).join()
    T.ok(ul.getAttribute('role') === 'listbox' && ul.getAttribute('tabindex') === '0', '容器有 role="listbox" 和 tabindex="0"，可以用 Tab 键进入')
    T.ok(lis().every(l => l.getAttribute('role') === 'option' && !!l.id) && new Set(lis().map(l => l.id)).size === 5, '每个选项有 role="option" 和互不相同的 id')
    T.ok(cur() === '无', '还没按键时没有高亮项（aria-activedescendant 不存在）')
    await press('Enter')
    T.ok(sel() === '', '没有高亮项时按 Enter，什么也不选')
    const steps: [string, string][] = [['ArrowDown', '苹果'], ['ArrowDown', '香蕉'], ['ArrowDown', '榴莲'], ['ArrowDown', '葡萄'], ['ArrowDown', '葡萄'], ['ArrowUp', '榴莲'], ['Home', '苹果'], ['ArrowUp', '苹果'], ['End', '葡萄']]
    let ev: KeyboardEvent | null = null
    for (const [k, want] of steps) {
      ev = await press(k)
      T.ok(cur() === want, k + ' 之后高亮“' + want + '”（当前：' + cur() + '）' + (want === '榴莲' && k === 'ArrowDown' ? '。第三项“樱桃”是 disabled，要跳过' : ''))
    }
    ev = await press('ArrowDown')
    T.ok(ev.defaultPrevented, '处理过的按键调用了 preventDefault（否则方向键会让页面滚动）')
    ev = await press('a')
    T.ok(!ev.defaultPrevented && cur() === '葡萄', '不认识的按键不处理，也不阻止默认行为')
    await press('Home'); await press('Enter')
    T.ok(sel() === '苹果', '高亮在“苹果”时按 Enter，选中“苹果”（当前选中：' + (sel() || '无') + '）')
    await press('ArrowDown'); await press('ArrowDown'); await press(' ')
    T.ok(sel() === '榴莲', '按空格选中高亮项“榴莲”，同一时刻只有一项 aria-selected 为 true（当前：' + (sel() || '无') + '）')
    T.ok(lis().filter(l => l.getAttribute('aria-selected') === 'false').length === 4, '未选中的项 aria-selected 是 "false"，不是缺省')
    const cherry = lis()[2]
    T.ok(cherry.getAttribute('aria-disabled') === 'true' && lis().filter(l => l.hasAttribute('aria-disabled')).length === 1, '只有 disabled 的“樱桃”有 aria-disabled="true"')
    await T.click(cherry)
    T.ok(sel() === '榴莲' && cur() === '榴莲', '点击 disabled 的“樱桃”无效：选中和高亮都不变')
    await T.click(lis()[4])
    T.ok(sel() === '葡萄' && cur() === '葡萄', '点击“葡萄”：选中，并且高亮跟到“葡萄”')
  }
}
useListbox.wrong = [
  { js: sub(useListbox.solJs, 'while (i >= 0 && i < n && options.value[i].disabled)', 'while (false)'), why: 'move 没有跳过 disabled 的项。键盘会停在不能选的“樱桃”上。', expectFail: /disabled|樱桃/ },
  { js: sub(useListbox.solJs, 'return i >= 0 && i < n ? i : from', 'return (i + n) % n'), why: '到头后循环到另一端。题目要求到头就停在原地（循环是另一种设计，要由使用者选择）。', expectFail: /葡萄/ },
  { js: sub(useListbox.solJs, '    e.preventDefault()   // 方向键和空格不要让页面滚动\n', ''), why: '没有调用 preventDefault。按方向键和空格时，页面会跟着滚动。', expectFail: /preventDefault/ },
  { js: sub(useListbox.solJs, "      'aria-selected': o.value === selected.value,\n", ''), why: '选项没有 aria-selected。屏幕阅读器不知道哪一项被选中。', expectFail: /aria-selected|选中/ },
  { js: sub(useListbox.solJs, 'if (o && !o.disabled) selected.value', 'if (!o.disabled) selected.value'), why: 'select 没有检查下标是否存在。没有高亮项时（active 是 -1）按 Enter，o 是 undefined，读 o.disabled 抛出错误。', expectFail: /运行时发生错误|代码没有运行|Enter/ },
  { js: sub(useListbox.solJs, "      onClick: () => { if (o.disabled) return; active.value = i; select(i) }", "      onClick: () => { active.value = i; select(i) }"), why: '点击 disabled 的项也移动了高亮。disabled 的项不应该能被点击激活。', expectFail: /点击 disabled/ }
]
useListbox.faded = {
  js: sub(sub(sub(useListbox.solJs,
    "    do { i += step } while (i >= 0 && i < n && options.value[i].disabled)\n    return i >= 0 && i < n ? i : from\n",
    "    /* ✏️ 先加 step；遇到 disabled 就继续加；越界就返回 from */\n    return i\n"),
    "    else if (e.key === 'Home') active.value = move(-1, 1)\n    else if (e.key === 'End') active.value = move(options.value.length, -1)\n",
    "    /* ✏️ Home 和 End：从哪里出发、朝哪个方向找？ */\n"),
    "      'aria-selected': o.value === selected.value,\n      'aria-disabled': o.disabled || undefined,\n",
    "      /* ✏️ aria-selected 和 aria-disabled */\n")
}
