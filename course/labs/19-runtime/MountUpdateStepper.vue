<script setup lang="ts">
// 实验台：组件挂载与更新的单步回放。
// 用的是 19.8 节的迷你 Vue（miniTrace.ts），每个内部函数的入口记一条日志，
// 所以这里的函数名和调用顺序对应真实 Vue 的 runtime-core，但代码是简化版，不是真实 Vue 在跑。
import { computed, nextTick, ref, watch } from 'vue'
import { runScenario, SCENARIOS, type ScenarioId } from './miniTrace'

const scenarioId = ref<ScenarioId>('mount')
const result = computed(() => runScenario(scenarioId.value))
const steps = computed(() => result.value.steps)
const pos = ref(1)        // 当前显示到第几步（从 1 起）
const listEl = ref<HTMLElement | null>(null)

const cur = computed(() => steps.value[Math.min(pos.value, steps.value.length) - 1])
const desc = computed(() => SCENARIOS.find(s => s.id === scenarioId.value)!.desc)

function go(n: number) {
  pos.value = Math.max(1, Math.min(steps.value.length, n))
}
watch(scenarioId, () => { pos.value = 1 })
watch(pos, async () => {
  await nextTick()
  const box = listEl.value
  const row = box?.querySelector('.st.cur') as HTMLElement | null
  if (box && row) {
    if (row.offsetTop < box.scrollTop) box.scrollTop = row.offsetTop - 4
    else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight + 4
  }
})

const kindLabel: Record<string, string> = { call: '函数', dom: 'DOM', hook: '钩子', queue: '队列', flush: '微任务' }
</script>

<template>
  <div class="row">
    <label class="ctl">场景
      <select id="rtScenario" class="t" v-model="scenarioId">
        <option v-for="s in SCENARIOS" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
    </label>
    <button class="b" :disabled="pos <= 1" @click="go(pos - 1)">上一步</button>
    <button class="b pri" :disabled="pos >= steps.length" @click="go(pos + 1)">下一步</button>
    <button class="b" :disabled="pos >= steps.length" @click="go(steps.length)">运行到底</button>
    <button class="b" :disabled="pos <= 1" @click="go(1)">重来</button>
    <span class="cap" id="rtPos">第 {{ pos }} / {{ steps.length }} 步</span>
  </div>
  <div class="cap">{{ desc }}</div>

  <div class="cols rt-cols">
    <div class="box">
      <span class="cap">调用顺序（缩进表示调用层级，点一行可以跳到那一步）</span>
      <div ref="listEl" class="rt-list" id="rtList">
        <div
          v-for="(s, i) in steps"
          :key="i"
          class="st"
          :class="[s.kind, { cur: i + 1 === pos, future: i + 1 > pos }]"
          :style="{ paddingLeft: 6 + s.depth * 14 + 'px' }"
          @click="go(i + 1)"
        ><span class="no">{{ i + 1 }}</span> <code>{{ s.fn }}</code></div>
      </div>
    </div>
    <div class="box">
      <span class="cap">当前这一步 <span class="pill">{{ kindLabel[cur.kind] }}</span></span>
      <div class="rt-now" id="rtNow"><code>{{ cur.fn }}</code></div>
      <div class="rt-note" id="rtNote">{{ cur.note }}</div>

      <span class="cap">组件实例（“渲染”是渲染函数运行的次数）</span>
      <div class="rt-scroll"><table class="rt-tab" id="rtInst">
        <thead><tr><th>组件</th><th>uid</th><th>isMounted</th><th>props</th><th>next</th><th>渲染</th></tr></thead>
        <tbody>
          <tr v-for="i in cur.instances" :key="i.uid">
            <td>{{ i.name }}</td><td>{{ i.uid }}</td><td>{{ i.mounted }}</td><td><code>{{ i.props }}</code></td>
            <td>{{ i.next ? '有' : '无' }}</td><td>{{ i.renders }}</td>
          </tr>
          <tr v-if="!cur.instances.length"><td colspan="6" class="none">还没有创建组件实例</td></tr>
        </tbody>
      </table></div>

      <div class="rt-q" id="rtQueue">
        <span class="cap">更新队列</span>
        <span v-for="q in cur.queue" :key="q" class="pill">{{ q }}</span>
        <span v-if="!cur.queue.length" class="none">空</span>
      </div>
      <div class="rt-q" id="rtPost">
        <span class="cap">后置队列</span>
        <span v-for="q in cur.post" :key="q" class="pill">{{ q }}</span>
        <span v-if="!cur.post.length" class="none">空</span>
      </div>
      <span class="cap">容器里的 HTML</span>
      <pre class="rt-html" id="rtHtml">{{ cur.html || '（空）' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.rt-cols { align-items: flex-start }
.rt-list { max-height: 380px; overflow: auto; margin-top: 6px; border: 1px solid var(--line); border-radius: 6px; position: relative }
.st { padding: 2px 6px; font-size: 13px; cursor: pointer; white-space: nowrap; border-left: 3px solid transparent; line-height: 1.6 }
.st .no { display: inline-block; min-width: 1.6em; color: var(--muted); font-size: 12px }
.st code { font-size: 13px; background: none; padding: 0 }
.st.future { opacity: 0.45 }
.st.cur { background: var(--accent-soft); border-left-color: var(--accent); opacity: 1 }
.st.dom code { color: var(--muted) }
.st.queue code { color: var(--accent) }
.st.flush { font-weight: 600 }
.rt-now { margin: 4px 0 }
.rt-now code { font-size: 15px }
.rt-note { margin-bottom: 10px; min-height: 3em; line-height: 1.6 }
.rt-tab { width: 100%; font-size: 13px; border-collapse: collapse; margin: 4px 0 10px; display: table }
.rt-tab th, .rt-tab td { border: 1px solid var(--line); padding: 2px 6px; text-align: left }
.rt-tab code { font-size: 12px; word-break: break-all }
.rt-scroll { overflow-x: auto }
.rt-q { margin: 4px 0; display: flex; flex-wrap: wrap; gap: 6px; align-items: center }
.none { color: var(--muted); font-size: 13px }
.rt-html { font-size: 12px; margin: 4px 0 0; white-space: pre-wrap; word-break: break-all }
</style>
