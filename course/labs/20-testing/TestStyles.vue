<script setup lang="ts">
// 实验台：同一个计数器的三种测试写法，对三个版本（原版、行为不变的重构、有缺陷）各跑一遍。
// 全部是真实的 Vue：测试自己 createApp 挂载，用 DOM 事件触发点击。
import { ref, createApp, nextTick, type Component } from 'vue'
import CounterOriginal from './CounterOriginal.vue'
import CounterRefactored from './CounterRefactored.vue'
import CounterBroken from './CounterBroken.vue'

const SRC = `// 测试 1：断言实现细节（内部状态和类名）
const vm = mount(Counter)
host.querySelector('.btn-add').click()
await nextTick()
expect(vm.count).toBe(1)

// 测试 2：按用户看到的行为（按钮文字、页面文字）
mount(Counter)
buttonByText('加一').click()
await nextTick()
expect(text()).toContain('已点 1 次')

// 测试 3：同测试 2，但没有等待更新
mount(Counter)
buttonByText('加一').click()
expect(text()).toContain('已点 1 次')`

const impls: { id: string; label: string; comp: Component; ok: boolean }[] = [
  { id: 'orig', label: '原版', comp: CounterOriginal, ok: true },
  { id: 'refactor', label: '重构后（行为不变）', comp: CounterRefactored, ok: true },
  { id: 'broken', label: '有缺陷（点击无效）', comp: CounterBroken, ok: false }
]
const names = ['1 实现细节', '2 用户行为', '3 不等待更新']

type Cell = { res: 'pass' | 'fail'; msg: string }
const grid = ref<Record<string, Cell[]> | null>(null)
const running = ref(false)

function setup(Comp: Component) {
  const host = document.createElement('div')
  const vm: any = createApp(Comp).mount(host)
  const buttonByText = (t: string) => {
    const b = [...host.querySelectorAll('button')].find(x => x.textContent!.includes(t))
    if (!b) throw new Error('找不到文字为“' + t + '”的按钮')
    return b as HTMLButtonElement
  }
  const must = (c: boolean, m: string) => { if (!c) throw new Error(m) }
  return { host, vm, buttonByText, must }
}

const tests: ((Comp: Component) => Promise<void>)[] = [
  async Comp => {
    const { host, vm, must } = setup(Comp)
    const btn = host.querySelector('.btn-add') as HTMLButtonElement | null
    must(!!btn, '找不到 .btn-add（类名已经变了）')
    btn!.click()
    await nextTick()
    must(vm.count === 1, '期望 vm.count 是 1，实际是 ' + vm.count)
  },
  async Comp => {
    const { host, buttonByText, must } = setup(Comp)
    buttonByText('加一').click()
    await nextTick()
    must(host.textContent!.includes('已点 1 次'), '期望包含“已点 1 次”，实际是“' + host.textContent!.trim() + '”')
  },
  async Comp => {
    const { host, buttonByText, must } = setup(Comp)
    buttonByText('加一').click()
    must(host.textContent!.includes('已点 1 次'), '期望包含“已点 1 次”，实际是“' + host.textContent!.trim() + '”')
  }
]

async function runAll() {
  running.value = true
  const out: Record<string, Cell[]> = {}
  for (const impl of impls) {
    out[impl.id] = []
    for (const t of tests) {
      try { await t(impl.comp); out[impl.id].push({ res: 'pass', msg: '通过' }) }
      catch (e: any) { out[impl.id].push({ res: 'fail', msg: e.message }) }
    }
  }
  grid.value = out
  running.value = false
}

// 结果与“应该是什么”对照：好版本应通过，有缺陷的版本应失败
function verdict(impl: { ok: boolean }, c: Cell) {
  const want = impl.ok ? 'pass' : 'fail'
  if (c.res === want) return c.res === 'pass' ? '通过（对）' : '失败（对）'
  return c.res === 'fail' ? '失败（误报）' : '通过（漏报）'
}
</script>

<template>
  <div class="cols">
    <LabCode :code="SRC" />
    <div>
      <button class="b pri" :disabled="running" @click="runAll">运行三个测试 × 三个版本</button>
      <table v-if="grid" class="ts-table">
        <thead><tr><th>版本</th><th v-for="n in names" :key="n">{{ n }}</th></tr></thead>
        <tbody>
          <tr v-for="impl in impls" :key="impl.id" :data-impl="impl.id">
            <td>{{ impl.label }}</td>
            <td v-for="(c, i) in grid[impl.id]" :key="i" :data-t="i" :data-v="verdict(impl, c)" :class="verdict(impl, c).includes('误') ? 'bad' : ''" :title="c.msg">{{ verdict(impl, c) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="cap">点按钮运行。好的测试：原版和重构后通过，有缺陷的版本失败。</div>
    </div>
  </div>
  <div class="cap">“误报”是测试失败了，但组件其实没有错。“漏报”是组件有错，测试却通过。把鼠标放在格子上，可以看到失败信息。</div>
</template>

<style scoped>
.ts-table { border-collapse: collapse; margin-top: 8px; font-size: 13px; }
.ts-table th, .ts-table td { border: 1px solid var(--border, #ddd); padding: 4px 8px; text-align: left; }
.ts-table td.bad { color: #b45309; font-weight: 600; }
</style>
