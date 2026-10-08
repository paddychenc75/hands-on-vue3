// 实验台共享的状态：三种归属方式各自的"家"，以及更新次数的计数
import { computed, reactive } from 'vue'

export type Side = 'local' | 'store' | 'url'
export type Part = 'Owner' | 'Layout' | 'Filter' | 'Badge' | 'List'

// 更新次数：普通对象，不是响应式（在更新钩子里改响应式数据会形成循环）
export const counts: Record<Side, Record<Part, number>> = {
  local: { Owner: 0, Layout: 0, Filter: 0, Badge: 0, List: 0 },
  store: { Owner: 0, Layout: 0, Filter: 0, Badge: 0, List: 0 },
  url: { Owner: 0, Layout: 0, Filter: 0, Badge: 0, List: 0 }
}
export const hooks = { paint: () => {} }
let pending = false
export function count(side: Side, part: Part) {
  counts[side][part]++
  if (pending) return
  pending = true
  Promise.resolve().then(() => { pending = false; hooks.paint() })
}
export function resetCounts() {
  for (const s of Object.values(counts)) for (const k of Object.keys(s) as Part[]) s[k] = 0
  hooks.paint()
}

// 使用方（输入框、徽标、列表）拿到的统一接口
export interface Source {
  kw: { readonly value: string }
  /** how：'type' 是连续输入，'pick' 是点了一个预设 */
  set(v: string, how: 'type' | 'pick'): void
}

// 方式二：store（模块级的 reactive 对象，相当于 Pinia store 的 state）。刷新页面会丢
export const store = reactive({ kw: '' })
export const storeSource: Source = {
  kw: computed(() => store.kw),
  set(v) { store.kw = v }
}

// 方式三：地址栏（历史栈 + 当前位置）。刷新页面时它还在
export const bar = reactive({ entries: [''] as string[], at: 0 })
const kwOfUrl = computed(() => new URLSearchParams(bar.entries[bar.at]).get('kw') ?? '')
const toQuery = (v: string) => (v ? 'kw=' + encodeURIComponent(v) : '')
export const urlSource: Source = {
  kw: kwOfUrl,
  set(v, how) {
    if (how === 'type') bar.entries[bar.at] = toQuery(v)                   // replace
    else { bar.entries = [...bar.entries.slice(0, bar.at + 1), toQuery(v)]; bar.at++ }   // push
  }
}
export const urlText = computed(() => '/tasks' + (bar.entries[bar.at] ? '?' + bar.entries[bar.at] : ''))
export function urlBack() { if (bar.at > 0) bar.at-- }
export const canBack = computed(() => bar.at > 0)

export const TASKS = ['学 Vue 路由', '写 Pinia store', '读 Vue 源码', '写 Vue 测试', '整理 Router 笔记', '部署 Vue 项目']
