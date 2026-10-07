// 进度只存 localStorage。键前缀沿用旧版：vue3deep:<键>
// 约定的键：
//   sc      自测答案  { "<章id>:<序号>": 选项序号, "p:<实验台id>": 选项序号 }
//   guess   “先猜”的猜测（还没核对）
//   ex      练习通过状态  { <练习id>: true | 'sol' }
//   exSol   看过答案的练习  { <练习id>: true }
//   ex:<id> 练习草稿  { tpl, js }
import { ref } from 'vue'

const PREFIX = 'vue3deep:'

/** 每次写入加 1。读取时依赖它，界面就会随存储变化自动更新。 */
export const storeRev = ref(0)
/** 页面挂载后才读 localStorage，避免服务端渲染和客户端首次渲染不一致。 */
export const storeReady = ref(false)

export function markStoreReady() {
  storeReady.value = true
}

function read<T>(k: string, d: T): T {
  try {
    const v = localStorage.getItem(PREFIX + k)
    return v == null ? d : (JSON.parse(v) as T)
  } catch {
    return d
  }
}

export const store = {
  get<T = any>(k: string, d: T): T {
    void storeRev.value
    if (typeof localStorage === 'undefined') return d
    return read(k, d)
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(PREFIX + k, JSON.stringify(v))
    } catch {
      /* 隐私模式等情况下写不进去，忽略 */
    }
    storeRev.value++
  }
}

if (typeof window !== 'undefined') {
  // 另一个标签页改了进度
  window.addEventListener('storage', e => {
    if (e.key && e.key.startsWith(PREFIX)) storeRev.value++
  })
}
