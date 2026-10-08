<script setup lang="ts">
// 实验台:可单步的更新队列。算法照搬 runtime-core/scheduler.ts(简化):
// queueJob 的 QUEUED 去重、从 flushIndex + 1 开始的按 id 插入、
// flushJobs 的遍历、flushPostFlushCbs、清空后再检查一轮。
import { computed, reactive, ref } from 'vue'

interface Job { id: number; label: string; pre: boolean; queued: boolean; run?: () => void }
interface Post { id: number | null; label: string; run?: () => void }

const QUEUED = 1
const PRE = 2

const queue = reactive<Job[]>([])
const post = reactive<Post[]>([])
const flushIndex = ref(-1)
const scheduled = ref(false)       // currentFlushPromise 是否存在
const stage = ref<'idle' | 'jobs' | 'post'>('idle')
const log = ref<string[]>([])
const chainA = ref(false)          // 组件 1 的更新运行时,又修改组件 3 的数据
const chainB = ref(false)          // 后置回调运行时,又修改组件 2 的数据
const L = (m: string) => log.value.unshift(m)

// 每个组件一个固定的更新 job,所以第二次入队时能看到它还带着 QUEUED 标记
const updates: Record<number, Job> = {
  1: { id: 1, label: '更新 #1', pre: false, queued: false },
  2: { id: 2, label: '更新 #2', pre: false, queued: false },
  3: { id: 3, label: '更新 #3', pre: false, queued: false }
}
const preWatch: Job = { id: 2, label: 'pre 侦听器 #2', pre: true, queued: false }
updates[1].run = () => { if (chainA.value) { L('  #1 的更新里修改了组件 3 的数据'); queueJob(updates[3]) } }

const flags = (j: Job) => (j.queued ? QUEUED : 0) | (j.pre ? PRE : 0)
const flagText = (j: Job) => [flags(j) & QUEUED ? 'QUEUED' : '', flags(j) & PRE ? 'PRE' : ''].filter(Boolean).join(' | ') || '0'
const idOf = (j: Job) => j.id
const preferAfter = (mid: Job, job: Job) => idOf(mid) < idOf(job) || (idOf(mid) === idOf(job) && mid.pre)

function findInsertionIndex(job: Job) {
  let start = flushIndex.value + 1
  let end = queue.length
  while (start < end) {
    const middle = (start + end) >>> 1
    if (preferAfter(queue[middle], job)) start = middle + 1
    else end = middle
  }
  return start
}
function queueFlush() {
  if (!scheduled.value) { scheduled.value = true; L('安排一次微任务:currentFlushPromise = resolvedPromise.then(flushJobs)') }
}
function queueJob(job: Job) {
  if (job.queued) { L(job.label + ' 已有 QUEUED 标记,不再加入'); return }
  const i = findInsertionIndex(job)
  queue.splice(i, 0, job)
  job.queued = true
  L(job.label + ' 入队,插在下标 ' + i)
  queueFlush()
}
function queuePost(label: string, run?: () => void) {
  post.push({ id: null, label, run })
  L(label + ' 进入 pendingPostFlushCbs')
  queueFlush()
}

function step() {
  if (!scheduled.value) { L('没有安排刷新,没有事可做'); return }
  if (stage.value === 'idle') { stage.value = 'jobs'; flushIndex.value = 0; L('微任务到来:flushJobs 开始') }
  if (stage.value === 'jobs') {
    if (flushIndex.value < queue.length) {
      const job = queue[flushIndex.value]
      job.queued = false
      L('运行 ' + job.label + '(flushIndex = ' + flushIndex.value + ')')
      job.run?.()
      flushIndex.value++
      return
    }
    L('queue 遍历完,清空;进入 flushPostFlushCbs')
    flushIndex.value = -1
    queue.splice(0)
    stage.value = 'post'
    return
  }
  if (stage.value === 'post') {
    if (post.length) {
      const cbs = post.splice(0)
      cbs.forEach(cb => { L('运行后置回调:' + cb.label); cb.run?.() })
    }
    scheduled.value = false
    stage.value = 'idle'
    if (queue.length || post.length) {
      L('后置回调期间又有新任务:再来一轮 flushJobs')
      scheduled.value = true
      // 真实实现是在同一个微任务里递归调用 flushJobs,这里下一步继续
      stage.value = 'jobs'
      flushIndex.value = 0
    } else {
      L('刷新结束:currentFlushPromise = null,nextTick 的回调现在运行')
    }
  }
}
function runAll() { let n = 0; while (scheduled.value && n++ < 60) step() }
function reset() { queue.splice(0); post.splice(0); Object.values(updates).forEach(j => (j.queued = false)); preWatch.queued = false; flushIndex.value = -1; scheduled.value = false; stage.value = 'idle'; log.value = [] }
const postRun = () => { if (chainB.value) { L('  后置回调里修改了组件 2 的数据'); queueJob(updates[2]) } }
const stageText = computed(() => ({ idle: scheduled.value ? '等待微任务' : '空闲', jobs: '正在运行 queue', post: '正在运行后置回调' }[stage.value]))
</script>

<template>
  <div class="row">
    <button class="b" @click="queueJob(updates[3])">修改组件 3(id 3)</button>
    <button class="b" @click="queueJob(updates[1])">修改组件 1(id 1)</button>
    <button class="b" @click="queueJob(updates[2])">修改组件 2(id 2)</button>
    <button class="b" @click="queueJob(preWatch)">触发组件 2 的 pre 侦听器</button>
    <button class="b" @click="queuePost('post 回调', postRun)">加入一个后置回调</button>
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
      <div class="t">queue(状态:{{ stageText }},flushIndex = {{ flushIndex }})</div>
      <div class="row" data-test="queue">
        <span v-if="!queue.length" class="cap">空</span>
        <span v-for="(j, i) in queue" :key="j.label" class="pill" :class="{ g: i === flushIndex }">#{{ j.id }} {{ j.pre ? 'pre' : '更新' }} · flags {{ flagText(j) }}</span>
      </div>
    </div>
    <div class="box">
      <div class="t">pendingPostFlushCbs</div>
      <div class="row" data-test="post">
        <span v-if="!post.length" class="cap">空</span>
        <span v-for="(c, i) in post" :key="i" class="pill">{{ c.label }}</span>
      </div>
    </div>
  </div>
  <div class="log" data-test="log" style="height: 220px"><div v-for="(m, i) in log" :key="log.length - i">{{ m }}</div></div>
  <div class="cap">日志最新的在最上面。同一个 id 里,pre 侦听器排在更新前面。运行过程中入队的任务插在 flushIndex 之后,同一轮就会运行。</div>
</template>
