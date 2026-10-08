// 迷你 Vue 零件 2：调度器（第 25 章）。全课程只有这一个 queueJob。
export default String.raw`// ===== 零件 2：调度器（第 25 章） =====
// 对应真实源码（vuejs/core v3.5.43）：packages/runtime-core/src/scheduler.ts
//   queueJob、findInsertionIndex、queueFlush、flushJobs、queuePostFlushCb、flushPostFlushCbs、flushPreFlushCbs、nextTick
// 和真实实现的差别：
//   去重用 job.queued 布尔值（真实版是 job.flags 里的 QUEUED 位）；job.allowRecurse、job.pre、job.disposed 同理；
//   没有递归更新上限（100 次）和错误处理（任务抛错会让整个队列停摆）；后置队列不处理嵌套刷新；没有 Suspense。
const queue = []                          // 更新队列：按 id 升序，id 相同的前置任务（pre）排在前面
const pendingPostFlushCbs = []            // 后置队列：mounted、updated、post 侦听器
const resolvedPromise = Promise.resolve()
let currentFlushPromise = null            // 已经安排了刷新：这一次刷新完成的 Promise

// 没有 id 的任务排最后；没有 id 的前置任务排最前
const getId = job => (job.id == null ? (job.pre ? -1 : Infinity) : job.id)

//#region nextTick
function nextTick(fn) {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(fn) : p
}
//#endregion

//#region queueJob
function queueJob(job) {
  if (job.queued) return                  // 去重：同一个任务只排一次
  if (!job.pre && (!queue.length || getId(job) >= getId(queue[queue.length - 1]))) {
    queue.push(job)                       // 快路径：id 不小于队尾
  } else {
    queue.splice(findInsertionIndex(job), 0, job)
  }
  job.queued = true
  queueFlush()
}

// 二分查找：保持按 id 升序，所以父组件（id 小）总在子组件前面更新
function findInsertionIndex(job) {
  const id = getId(job)
  let start = 0
  let end = queue.length
  while (start < end) {
    const middle = (start + end) >>> 1
    const mid = queue[middle]
    if (getId(mid) < id || (getId(mid) === id && mid.pre)) start = middle + 1
    else end = middle
  }
  return start
}
//#endregion

function queueFlush() {
  if (!currentFlushPromise) currentFlushPromise = resolvedPromise.then(flushJobs)
}

//#region queuePostFlushCb
function queuePostFlushCb(cb) {
  pendingPostFlushCbs.push(cb)
  queueFlush()
}
//#endregion

//#region flushJobs
function flushJobs() {
  while (queue.length) {
    const job = queue.shift()
    if (job.disposed) continue            // 所属组件已卸载
    if (job.allowRecurse) job.queued = false
    job()
    job.queued = false                    // 不允许递归的任务，运行期间再入队会被忽略
  }
  flushPostFlushCbs()
  currentFlushPromise = null
  if (queue.length || pendingPostFlushCbs.length) flushJobs()   // 后置任务里又改了数据：接着刷新
}
//#endregion

//#region flushPostFlushCbs
function flushPostFlushCbs() {
  const cbs = [...new Set(pendingPostFlushCbs)].sort((a, b) => getId(a) - getId(b))   // 去重；没有 id 的保持入队顺序
  pendingPostFlushCbs.length = 0
  cbs.forEach(cb => cb())
}
//#endregion

// 把队列里属于 instance 的前置任务（pre 侦听器）立刻运行；不传 instance 就运行全部前置任务
function flushPreFlushCbs(instance) {
  for (let i = 0; i < queue.length; i++) {
    const cb = queue[i]
    if (cb.pre && (!instance || cb.id === instance.uid)) {
      queue.splice(i--, 1)
      if (cb.allowRecurse) cb.queued = false
      cb()
      cb.queued = false
    }
  }
}
`
