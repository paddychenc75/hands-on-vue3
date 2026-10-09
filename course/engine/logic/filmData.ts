/* 首页短片的静态数据：每一幕的时长、三层空间里的节点和色块的坐标。
 * 服务端渲染（HomeFilm.vue）和动画（filmTracks.ts，在首页自己的异步 chunk 里）共用，所以只放数据，不放动画代码（主包要小）。
 * 设计坐标系 1000×620：三层平面（响应式数据 / 虚拟 DOM 树 / DOM 与屏幕）用同一套 x、y，只是 z 不同。
 * 主线：“数据变了，屏幕怎样跟着变”——Vue 每一代怎样找到要改的那块 DOM。 */

export const W = 1000
export const H = 620

/** 每一幕的时长（秒）。0 开场、1 手动改 DOM、2 Vue 1.0 细粒度绑定、3 Vue 2.0 虚拟 DOM、4 Vue 3.0 编译期优化、
 *  5 组合式 API 与 script setup、6 3.4/3.5 响应式系统、7 3.6 候选版 Vapor、8 收束。 */
export const DURATIONS = [5, 5, 6, 7, 7.5, 5, 6.5, 6.5, 6] as const
export const SCENE_COUNT = DURATIONS.length
export const LAST = SCENE_COUNT - 1
export const MARKS: number[] = DURATIONS.reduce<number[]>((a, _d, i) => {
  a.push(i ? a[i - 1] + DURATIONS[i - 1] : 0)
  return a
}, [])
export const TOTAL: number = DURATIONS.reduce((s, d) => s + d, 0)
/** 手动滚动：每秒对应多少个“舞台高 / 6”，整片约 9 个屏幕高 */
export const SECONDS_PER_SCREEN = 6

export interface FNode {
  id: string
  label: string
  parent: string | null
  x: number
  y: number
  /** 绑定了响应式数据的节点：Vue 3 的编译器会给它打补丁标记，更新时只比对它们 */
  dyn?: string
}
/** 虚拟 DOM 树（一个小的待办清单界面）：App → Header（Logo、Title）、List（两个 Item）、Footer（Hint、Counter）。
 *  Logo、Hint 是纯静态节点；Title、Item、Counter 各自绑定了一份响应式数据。 */
export const NODES: readonly FNode[] = [
  { id: 'App', label: 'App', parent: null, x: 500, y: 62 },
  { id: 'Header', label: 'Header', parent: 'App', x: 170, y: 190 },
  { id: 'List', label: 'List', parent: 'App', x: 540, y: 190 },
  { id: 'Footer', label: 'Footer', parent: 'App', x: 850, y: 190 },
  { id: 'Logo', label: 'Logo', parent: 'Header', x: 90, y: 318 },
  { id: 'Title', label: 'Title', parent: 'Header', x: 250, y: 318, dyn: 'title' },
  { id: 'Item1', label: 'Item', parent: 'List', x: 450, y: 318, dyn: 'todos' },
  { id: 'Item2', label: 'Item', parent: 'List', x: 630, y: 318, dyn: 'todos' },
  { id: 'Hint', label: 'Hint', parent: 'Footer', x: 790, y: 318 },
  { id: 'Counter', label: 'Counter', parent: 'Footer', x: 920, y: 318, dyn: 'remaining' },
]
export const nodeById = (id: string): FNode => NODES.find(n => n.id === id) as FNode
export const childrenOf = (id: string): string[] => NODES.filter(n => n.parent === id).map(n => n.id)
/** 一个节点和它的所有后代（先父后子、按层） */
export function subtree(id: string): string[] {
  const out = [id]
  for (let i = 0; i < out.length; i++) out.push(...childrenOf(out[i]))
  return out
}
export const depthOf = (id: string): number => {
  let d = 0
  for (let n = nodeById(id); n.parent; n = nodeById(n.parent)) d++
  return d
}
/** 动态节点（绑定了数据）和纯静态的叶子 */
export const DYNAMIC = NODES.filter(n => n.dyn).map(n => n.id)
export const STATIC_LEAVES = ['Logo', 'Hint']

/** 响应式数据（第一层）：title、todos 是 ref，remaining 是 computed（由 todos 算出来）。(x, y) 是药丸的中心 */
export interface DataPill {
  id: string
  label: string
  kind: 'ref' | 'computed'
  x: number
  y: number
  /** 它绑定的 DOM 节点 */
  targets: string[]
  /** 第 5 幕里属于哪个组合式函数 */
  group: 'title' | 'todos'
}
export const DATA: readonly DataPill[] = [
  { id: 'title', label: 'title', kind: 'ref', x: 250, y: 252, targets: ['Title'], group: 'title' },
  { id: 'todos', label: 'todos', kind: 'ref', x: 540, y: 252, targets: ['Item1', 'Item2'], group: 'todos' },
  { id: 'remaining', label: 'remaining', kind: 'computed', x: 920, y: 252, targets: ['Counter'], group: 'todos' },
]
export const dataById = (id: string): DataPill => DATA.find(d => d.id === id) as DataPill

/** DOM 层的色块：和树的节点一一对应，位置在同一个 (x, y)，只是大小不同、没有文字 */
export const BLOCK_SIZE: Record<string, [number, number]> = {
  App: [980, 590],
  Header: [300, 84],
  List: [350, 84],
  Footer: [230, 84],
  Logo: [120, 96],
  Title: [150, 96],
  Item1: [150, 96],
  Item2: [150, 96],
  Hint: [100, 96],
  Counter: [90, 96],
}
export const BLOCK_HUE: Record<string, string> = {
  App: 'frame', Header: 'a', List: 'b', Footer: 'c', Logo: 'd', Title: 'a2', Item1: 'e', Item2: 'e', Hint: 'f', Counter: 'g',
}

/** 收束幕的时间轴：年份、一个词、对应的章 id（章名从章元数据里取，不写死章号） */
export const STATIONS: { year: string; name: string; chapters: string[]; note?: string }[] = [
  { year: '之前', name: '手动改 DOM', chapters: ['first'] },
  { year: '2015', name: '细粒度绑定', chapters: ['reactivity'], note: 'Vue 1.0' },
  { year: '2016', name: '虚拟 DOM', chapters: ['render'], note: 'Vue 2.0' },
  { year: '2020', name: '编译期优化', chapters: ['compiler'], note: 'Vue 3.0' },
  { year: '2020–21', name: '组合式与 script setup', chapters: ['composables'], note: 'Vue 3.0 / 3.2' },
  { year: '2023–24', name: '响应式系统', chapters: ['computed', 'reactivity'], note: 'Vue 3.4 / 3.5' },
  { year: '2026', name: 'Vapor', chapters: ['compiler'], note: '3.6 候选版' },
]
/** 每一幕的名字（进度条提示、读屏播报）和右侧幕进度圆点的标签 */
export const SCENE_NAMES = [
  '开场',
  'Vue 之前：手动改 DOM',
  '2015 · Vue 1.0 细粒度绑定',
  '2016 · Vue 2.0 虚拟 DOM',
  '2020 · Vue 3.0 编译期优化',
  '2020–21 · 组合式 API 与 script setup',
  '2023–24 · Vue 3.4 与 3.5 的响应式系统',
  '2026 · Vue 3.6 候选版 Vapor',
  '收束',
] as const
export const RAIL_LABELS = ['开场', '之前', '2015', '2016', '2020', '2021', '2023', '2026', '收束'] as const
/** 大号年份下面的版本小标签：key 对应 filmTracks 里的出现时段 */
export const TAGS: { key: string; text: string }[] = [
  { key: 't2', text: 'Vue 1.0' },
  { key: 't3', text: 'Vue 2.0' },
  { key: 't4', text: 'Vue 3.0' },
  { key: 't5', text: 'Vue 3.2' },
  { key: 't6a', text: 'Vue 3.4' },
  { key: 't6b', text: 'Vue 3.5' },
  { key: 't7', text: '3.6 候选版' },
]
