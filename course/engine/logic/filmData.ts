/* 首页短片的静态数据：每一幕的时长、三层空间里的节点和色块的坐标。
 * 服务端渲染（HomeFilm.vue）和动画（filmTracks.ts，在首页自己的异步 chunk 里）共用，所以只放数据，不放动画代码（主包要小）。
 * 设计坐标系 1000×620：三层平面（响应式数据 / 虚拟 DOM 树 / DOM 与屏幕）用同一套 x、y，只是 z 不同。
 * 主线：“数据变了，屏幕怎样跟着变”——Vue 每一代怎样找到要改的那块 DOM。 */

export const W = 1000
export const H = 620

/** 每一幕的时长（秒）。0 开场、1 手动改 DOM、2 Vue 1.0 细粒度绑定、3 Vue 2.0 虚拟 DOM、4 Vue 3.0 编译期优化、
 *  5 组合式 API 与 script setup、6 3.4/3.5 响应式系统、7 3.6 候选版 Vapor、8 收束。 */
export const DURATIONS = [5, 5, 6, 7, 7.5, 6, 6.5, 6.5, 6] as const
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
  { year: '2020–21', name: '组合式 API', chapters: ['composables'], note: 'Vue 3.0 / 3.2' },
  { year: '2023–24', name: '响应式系统', chapters: ['computed'], note: 'Vue 3.4 / 3.5' },
  { year: '2026', name: 'Vapor', chapters: ['perf'], note: '3.6 候选版' }, // 性能优化一章（第 21 章）有“Vapor Mode”深入块，比第 29 章（已被 2020 那一站用了）更贴切且不重复
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
export const RAIL_LABELS = ['开场', '之前', '2015', '2016', '2020', '2020–21', '2023–24', '2026', '收束'] as const
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

/** 每一幕一个主色：背景光晕、年份下的色条、收束幕时间轴上各站的颜色（第 i 站用第 i+1 幕的颜色）。
 *  颜色取自深色主题的语义色：品牌绿、青、琥珀、紫，外加粉、蓝、金。0 开场和 8 收束用品牌绿。 */
export const ERA_COLORS = ['#46d196', '#f5b968', '#4fd3dc', '#bfacff', '#46d196', '#ff8fb8', '#6fa8ff', '#ffd36b', '#46d196']

/** 第 5 幕“按功能聚合”：五个小块（三份数据 + 两个方法）先按选项类型散在三列里，再移动到各自的功能分组里。
 *  (fx, fy) 是落点（数据层坐标，和真正的数据药丸重合），(sx, sy) 是散开时的位置。 */
export interface Mover {
  id: string
  label: string
  kind: 'ref' | 'computed' | 'fn'
  group: 'todos' | 'title'
  fx: number
  fy: number
  sx: number
  sy: number
}
export const MOVERS: readonly Mover[] = [
  { id: 'title', label: 'title', kind: 'ref', group: 'title', fx: 250, fy: 252, sx: 150, sy: 112 },
  { id: 'todos', label: 'todos', kind: 'ref', group: 'todos', fx: 540, fy: 252, sx: 150, sy: 156 },
  { id: 'remaining', label: 'remaining', kind: 'computed', group: 'todos', fx: 920, fy: 252, sx: 500, sy: 134 },
  { id: 'addTodo', label: 'addTodo()', kind: 'fn', group: 'todos', fx: 730, fy: 252, sx: 840, sy: 112 },
  { id: 'setTitle', label: 'setTitle()', kind: 'fn', group: 'title', fx: 250, fy: 300, sx: 840, sy: 156 },
]
/** 三列的标题（选项式 API 按“选项类型”分，不按功能分） */
export const MOVER_COLUMNS = [
  { id: 'data', label: 'data', x: 150 },
  { id: 'computed', label: 'computed', x: 500 },
  { id: 'methods', label: 'methods', x: 840 },
] as const

/** 第 6 幕 3.5 的内存条：官方博客写的是“内存占用降低 56%”，所以第二根条是第一根的 44% */
export const MEM_DROP = 0.56

const M = MARKS
const COMP = ['App', 'Header', 'List', 'Footer']
/** 音效和画面共用的关键时间点（秒）：filmTracks.ts 的关键帧和 audio.ts 的音效都从这里取，保证对得上 */
export const CUE = {
  /** 第 1 幕：手动改了两块（闪一下），漏掉的那一块红色闪烁 */
  manual: [M[1] + 2.25, M[1] + 2.95],
  miss: M[1] + 3.95,
  /** 第 2 幕：四个绑定各冒出一个 watcher；todos 变了，三条光束依次落到 DOM */
  watch: (i: number) => M[2] + 0.5 + i * 0.3,
  wire2: [M[2] + 3.6, M[2] + 3.9, M[2] + 4.9],
  /** 第 3 幕：四个组件各有一个 watcher；List、Footer 重新生成 vnode 子树；标出差别；提交 */
  pw: (i: number) => M[3] + 1.0 + i * 0.22,
  redo: [M[3] + 2.6, M[3] + 3.3],
  flag3: M[3] + 5.0,
  land3: M[3] + 5.5,
  /** 第 4 幕：Proxy 环、静态盾、扁平的区块连线、差别标记、提交 */
  proxy: (i: number) => M[4] + 0.8 + i * 0.25,
  shield: M[4] + 1.7,
  flat: M[4] + 3.0,
  flag4: M[4] + 5.6,
  land4: M[4] + 6.0,
  /** 第 5 幕：五个小块从三列聚到两个功能分组 */
  gather: M[5] + 2.2,
  group: M[5] + 3.4,
  /** 第 6 幕：computed 的值没变，下游收不到通知；3.5 的内存条缩短 */
  hold: M[6] + 2.7,
  mem: M[6] + 4.3,
  /** 第 7 幕：Vapor 的 effect 标记，三条直连光束 */
  vwatch: (i: number) => M[7] + 2.2 + i * 0.25,
  vwire: [M[7] + 3.9, M[7] + 4.1, M[7] + 5.1],
  /** 年份数字滚动：个位数变化的时刻 */
  ticks: [M[2] + 0.3, M[3] + 0.3, M[4] + 0.3, M[5] + 2.6, M[6] + 0.3, M[6] + 3.5, M[7] + 0.3],
  /** 换幕：前一幕文字退场的时间 */
  whoosh: (i: number) => (i === 1 ? M[1] - 0.1 : M[i] - 0.05),
  /** 收束：三层空间缩成一个点落到时间轴上 */
  fin: M[8] + 1.5,
}
export { COMP as COMPONENTS }

/** 音效的时间点和它对应的画面轨道（轨道名见 filmTracks.ts）：单元测试检查每个时间点 ±50ms 内轨道上有关键帧，e2e 检查离线渲染的配乐在这些点上有能量突起 */
export interface CueRef {
  name: string
  t: number
  track: string
  /** 这个音效比较轻（whoosh 一类），能量突起的门槛放低 */
  soft?: boolean
}
const BIND_IDS = ['Title', 'Item1', 'Item2', 'Counter']
export function cueList(): CueRef[] {
  const out: CueRef[] = [
    { name: 'manual-0', t: CUE.manual[0], track: 'bl-Item1' },
    { name: 'manual-1', t: CUE.manual[1], track: 'bl-Item2' },
    { name: 'miss', t: CUE.miss, track: 'bx-Counter' },
  ]
  BIND_IDS.forEach((id, i) => out.push({ name: 'watch-' + id, t: CUE.watch(i), track: 'wt-' + id, soft: true }))
  ;['Item1', 'Item2', 'Counter'].forEach((id, i) => out.push({ name: 'wire2-' + id, t: CUE.wire2[i], track: 'wr-' + id }))
  COMP.forEach((id, i) => out.push({ name: 'pw-' + id, t: CUE.pw(i), track: 'pw-' + id, soft: true }))
  out.push({ name: 'redo-List', t: CUE.redo[0], track: 'nl-List' }, { name: 'redo-Footer', t: CUE.redo[1], track: 'nl-Footer' })
  out.push({ name: 'flag3', t: CUE.flag3, track: 'fl-Item1' }, { name: 'land3', t: CUE.land3, track: 'bm-Item1' })
  DATA.forEach((d, i) => out.push({ name: 'proxy-' + d.id, t: CUE.proxy(i), track: 'px-' + d.id, soft: true }))
  out.push({ name: 'shield', t: CUE.shield, track: 'sh-Logo' }, { name: 'flat', t: CUE.flat, track: 'fx-Title' })
  out.push({ name: 'flag4', t: CUE.flag4, track: 'fl-Item1' }, { name: 'land4', t: CUE.land4, track: 'bm-Item1' })
  out.push({ name: 'gather', t: CUE.gather, track: 'mv-todos' }, { name: 'group', t: CUE.group, track: 'gf-todos' })
  out.push({ name: 'hold', t: CUE.hold, track: 'hold' }, { name: 'mem', t: CUE.mem, track: 'mem-b' })
  BIND_IDS.slice(1).forEach((id, i) => out.push({ name: 'vwatch-' + id, t: CUE.vwatch(i + 1), track: 'wt-' + id, soft: true }))
  ;['Item1', 'Item2', 'Counter'].forEach((id, i) => out.push({ name: 'vwire-' + id, t: CUE.vwire[i], track: 'wv-' + id }))
  CUE.ticks.forEach((t, i) => out.push({ name: 'tick-' + i, t, track: 'yd-3', soft: true }))
  for (let i = 1; i <= 8; i++) out.push({ name: 'whoosh-' + i, t: CUE.whoosh(i), track: 'cp-' + (i - 1), soft: true })
  out.push({ name: 'fin', t: CUE.fin, track: 'fly-c' })
  return out
}
