<script setup lang="ts">
// 实验台:可单步的更新队列。跑的不是另一份模拟,而是第 25 章练习里的零件 2(course/mini 的调度器):
// 点“入队”按钮直接调用它的 queueJob;“单步”时先让它真的刷新一遍(微任务换成手动触发),
// 刷新过程中的每个动作都被记下来(带队列快照),再一步一步回放。
import { computed, reactive, ref } from 'vue'
import { PARTS } from '../../mini'
import { runMini } from '../../mini/load'

interface Pill { id: number | null; label: string; pre: boolean; queued: boolean }
interface Ev { msg: string; queue: Pill[]; post: string[]; running: string | null; kind: 'step' | 'done' }

const log = ref<string[]>([])
const chainA = ref(false)          // 组件 1 的更新运行时,又修改组件 3 的数据
const chainB = ref(false)          // 后置回调运行时,又修改组件 2 的数据
const L = (m: string) => log.value.unshift(m)

// 每个组件一个固定的更新任务:第二次入队时能看到它还带着 queued 标记
interface Job { (): void; id?: number; pre?: boolean; queued?: boolean; label: string }
const mkJob = (id: number, label: string, pre = false, run?: () => void): Job => {
  const j = (() => { onRun(j); run?.() }) as Job
  j.id = id; j.pre = pre; j.label = label
  return j
}
const updates: Record<number, Job> = {
  1: mkJob(1, '更新 #1', false, () => { if (chainA.value) { rec('  #1 的更新里修改了组件 3 的数据'); vue.queueJob(updates[3]) } }),
  2: mkJob(2, '更新 #2'),
  3: mkJob(3, '更新 #3')
}
const preWatch = mkJob(2, 'pre 侦听器 #2', true)
const postCb = Object.assign(() => { rec('运行后置回调:post 回调'); if (chainB.value) { rec('  后置回调里修改了组件 2 的数据'); vue.queueJob(updates[2]) } }, { label: 'post 回调' })

// 微任务换成手动:FakePromise.then 只把回调存起来
const callbacks: Array<() => void> = []
const FakePromise = { resolve: () => ({ then: (fn: () => void) => { callbacks.push(fn); return {} } }) }
const vue = runMini<any>(PARTS.scheduler, {
  globals: { Promise: FakePromise },
  traced: ['queueJob', 'queuePostFlushCb', 'flushJobs', 'flushPostFlushCbs'],
  trace: e => onTrace(e.fn, e.args),
  traceReturn: e => onReturn(e.fn)
})

const pills = (): Pill[] => vue.queue.map((j: Job) => ({ id: j.id ?? null, label: j.label, pre: !!j.pre, queued: !!j.queued }))
const posts = (): string[] => vue.pendingPostFlushCbs.map((c: any) => c.label)

// ---- 记录与回放 ----
const recording = ref(false)
const events: Ev[] = []
const shown = reactive<{ queue: Pill[]; post: string[]; running: string | null }>({ queue: [], post: [], running: null })
const idx = ref(-1)                // 回放到第几个事件;-1 表示没有在回放
const scheduled = ref(false)       // currentFlushPromise 是否存在
const live = () => { shown.queue = pills(); shown.post = posts(); shown.running = null }
function rec(msg: string, kind: Ev['kind'] = 'step', running: string | null = null) {
  if (recording.value) events.push({ msg, queue: pills(), post: posts(), running, kind })
  else L(msg)
}
function onRun(j: Job) { rec('运行 ' + j.label, 'step', j.label) }

let pending: { fn: string; label: string; was: boolean; len: number } | null = null
function onTrace(fn: string, args: unknown[]) {
  if (fn === 'queueJob') { const j = args[0] as Job; pending = { fn, label: j.label, was: !!j.queued, len: vue.queue.length } }
  else if (fn === 'queuePostFlushCb') pending = { fn, label: (args[0] as any).label, was: false, len: vue.pendingPostFlushCbs.length }
  else if (fn === 'flushJobs') rec(flushDepth++ === 0 ? '微任务到来:flushJobs 开始' : '后置任务里又有新任务:再来一轮 flushJobs')
  else if (fn === 'flushPostFlushCbs') rec('queue 遍历完;flushPostFlushCbs:后置队列去重、排序后逐个运行')
}
let flushDepth = 0
function onReturn(fn: string) {
  if ((fn === 'queueJob' || fn === 'queuePostFlushCb') && pending) {
    const p = pending; pending = null
    if (fn === 'queueJob' && p.was) rec(p.label + ' 已有 queued 标记,不再加入')
    else if (fn === 'queueJob') rec(p.label + ' 入队,插在下标 ' + vue.queue.indexOf(updatesAndPre(p.label)))
    else rec(p.label + ' 进入 pendingPostFlushCbs')
    scheduled.value = true
  }
}
const updatesAndPre = (label: string): Job => (Object.values(updates).concat(preWatch).find(j => j.label === label) as Job)

function enqueue(j: Job) { if (replaying.value) return; recording.value = false; vue.queueJob(j); live() }
function enqueuePost() { if (replaying.value) return; recording.value = false; vue.queuePostFlushCb(postCb); live() }

const replaying = computed(() => idx.value >= 0)
function begin() {
  events.length = 0; flushDepth = 0
  recording.value = true
  callbacks.shift()?.()            // 真的刷新一遍
  recording.value = false
  events.push({ msg: '刷新结束:currentFlushPromise = null,nextTick 的回调现在运行', queue: [], post: [], running: null, kind: 'done' })
  idx.value = 0
  show()
}
function show() {
  const e = events[idx.value]
  L(e.msg)
  shown.queue = e.queue; shown.post = e.post; shown.running = e.running
  if (e.kind === 'done') { idx.value = -1; scheduled.value = false; Object.values(updates).concat(preWatch).forEach(j => (j.queued = false)); live() }
  else idx.value++
}
function step() {
  if (replaying.value) return show()
  if (!callbacks.length) { L('没有安排刷新,没有事可做'); return }
  begin()
}
function runAll() { if (!replaying.value && !callbacks.length) { L('没有安排刷新,没有事可做'); return } if (!replaying.value) begin(); let n = 0; while (replaying.value && n++ < 200) show() }
function reset() { while (vue.queue.length) vue.queue.pop().queued = false; vue.pendingPostFlushCbs.length = 0; callbacks.length = 0; Object.values(updates).concat(preWatch).forEach(j => (j.queued = false)); idx.value = -1; scheduled.value = false; log.value = []; live() }
const stageText = computed(() => (replaying.value ? '正在回放一次刷新' : scheduled.value ? '等待微任务' : '空闲'))
</script>

<template>
  <div class="row">
    <button class="b" @click="enqueue(updates[3])">修改组件 3(id 3)</button>
    <button class="b" @click="enqueue(updates[1])">修改组件 1(id 1)</button>
    <button class="b" @click="enqueue(updates[2])">修改组件 2(id 2)</button>
    <button class="b" @click="enqueue(preWatch)">触发组件 2 的 pre 侦听器</button>
    <button class="b" @click="enqueuePost()">加入一个后置回调</button>
  </div>
  <div class="row">
    <button class="b pri" @click="step">单步</button>
    <button class="b" @click="runAll">全部运行</button>
    <button class="b" @click="reset">重置</button>
    <label class="ctl"><input type="checkbox" v-model="chainA"> #1 更新时又修改组件 3</label>
    <label class="ctl"><input type="checkbox" v-model="chainB"> 后置回调里又修改组件 2</label>
  </div>
  <div class="cols">
    <div class="box">
      <div class="t">queue(状态:{{ stageText }})</div>
      <div class="row" data-test="queue">
        <span v-if="!shown.queue.length" class="cap">空</span>
        <span v-for="j in shown.queue" :key="j.label" class="pill">#{{ j.id }} {{ j.pre ? 'pre' : '更新' }} · queued = {{ j.queued }}</span>
      </div>
    </div>
    <div class="box">
      <div class="t">pendingPostFlushCbs(后置队列)</div>
      <div class="row" data-test="post">
        <span v-if="!shown.post.length" class="cap">空</span>
        <span v-for="(c, i) in shown.post" :key="i" class="pill">{{ c }}</span>
      </div>
    </div>
  </div>
  <div class="log" data-test="log" style="height: 220px"><div v-for="(m, i) in log" :key="log.length - i">{{ m }}</div></div>
  <div class="cap">日志最新的在最上面。同一个 id 里,pre 侦听器排在更新前面。运行过程中入队的任务按 id 插进 queue,同一轮就会运行。</div>
</template>
