/* 首页短片的编排：每个元素一条“轨道”（一串关键帧，时间单位是秒），film.ts 把它们变成暂停的 Web Animations，按影片时间擦洗。
 * 纯函数、不碰 DOM，有单元测试。只动 transform、opacity 和 SVG 描边。
 * 元素用 data-w 标记（见 HomeFilm.vue）；轨道名以 "css:" 开头的是 CSS 选择器。
 * 每一幕讲 Vue 的一代怎样“找到要改的那块 DOM”，史实依据见 HomeFilm.vue 里的注释。 */
import { CUE, DATA, DYNAMIC, ERA_COLORS, MARKS, MEM_DROP, MOVERS, MOVER_COLUMNS, NODES, STATIC_LEAVES, TOTAL, depthOf, nodeById, subtree } from './filmData.ts'

export interface KF {
  t: number
  easing?: string
  [prop: string]: string | number | undefined
}
export type Tracks = Record<string, KF[]>

const EASE = {
  out: 'cubic-bezier(.2,.8,.2,1)',
  inout: 'cubic-bezier(.45,.05,.25,1)',
  back: 'cubic-bezier(.34,1.56,.64,1)',
  lin: 'linear',
}
const M = MARKS
const U = 'translateZ'
// 颜色：和深色主题的语义色一致（数据变化 = 琥珀，观察者与渲染 = 青，更新 DOM = 品牌绿，跳过 = 紫）
const C = { data: '#f5b968', render: '#4fd3dc', commit: '#46d196', skip: '#bfacff' }
/** 数据绑定的四个 DOM 目标，和它们对应的响应式数据 */
const BIND: Record<string, string> = { Title: 'title', Item1: 'todos', Item2: 'todos', Counter: 'remaining' }

/** 相机姿态：rx 俯仰、rz 旋转、(x, y) 平移、s 缩放 */
type Pose = [number, number, number, number, number]
const poseCss = (p: Pose) => `rotateX(${p[0]}deg) rotateZ(${p[1]}deg) translate3d(${p[2]}px, ${p[3]}px, 0px) scale(${p[4]})`
const POSES_DESKTOP: Pose[] = [
  [58, -26, 200, 30, 0.8], // 0 开场
  [58, -18, 200, 20, 0.86], // 1 手动改 DOM
  [52, -14, 200, 10, 0.9], // 2 Vue 1.0
  [52, -12, 200, 0, 0.92], // 3 Vue 2.0
  [50, -10, 200, 0, 0.94], // 4 Vue 3.0
  [60, -14, 200, 30, 1.04], // 5 组合式
  [48, -10, 200, 10, 0.94], // 6 3.4 / 3.5
  [54, -14, 200, 10, 0.92], // 7 Vapor
  [64, -24, 0, -260, 0.34], // 8 收束
]
const POSES_MOBILE: Pose[] = [
  [50, -26, 0, 20, 0.8],
  [52, -20, 0, 10, 0.9],
  [44, -14, 0, 0, 0.98],
  [44, -12, 0, -10, 0.98],
  [42, -10, 0, -10, 1.0],
  [54, -16, 0, 20, 1.1],
  [42, -10, 0, 0, 1.0],
  [46, -14, 0, 10, 0.98],
  [60, -24, 0, -250, 0.34],
]

export function buildTracks(mobile = false): Tracks {
  const raw: Tracks = {}
  const k = (name: string, t: number, props: Omit<KF, 't'>, easing = EASE.inout) => {
    if (!raw[name]) raw[name] = []
    raw[name].push({ t, easing, ...props })
  }
  const fade = (name: string, t0: number, t1: number, from: number, to: number, easing = EASE.inout) => {
    k(name, t0, { opacity: from }, easing)
    k(name, t1, { opacity: to }, easing)
  }
  /** 脉冲：先亮起、停一会、再熄灭 */
  const flash = (name: string, t: number, hold = 0.35, peak = 1) => {
    k(name, t, { opacity: 0 }, EASE.out)
    k(name, t + 0.18, { opacity: peak })
    k(name, t + 0.18 + hold, { opacity: peak })
    k(name, t + 0.5 + hold, { opacity: 0 })
  }
  const pop = (name: string, t: number, d = 0.45, to = 1) => {
    k(name, t, { opacity: 0, transform: 'scale(.4)' }, EASE.back)
    k(name, t + d, { opacity: to, transform: 'scale(1)' })
  }
  /** 沿树的连线流动的光（从父节点流到子节点） */
  const comet = (id: string, t: number, dur = 0.45, color = C.render) => {
    for (const [pre, peak] of [['gw-', 0.3], ['g-', 1]] as const) {
      const n = pre + id
      k(n, t, { opacity: 0, strokeDashoffset: '0.16', stroke: color }, EASE.lin)
      k(n, t + 0.04, { opacity: peak, strokeDashoffset: '0.1', stroke: color }, EASE.lin)
      k(n, t + dur, { opacity: peak, strokeDashoffset: '-0.85', stroke: color }, EASE.lin)
      k(n, t + dur + 0.08, { opacity: 0, strokeDashoffset: '-1', stroke: color }, EASE.lin)
    }
  }
  /** 画一条线（描边从无到有），再保持，再淡出 */
  const draw = (name: string, t0: number, t1: number, stroke: string, until: number, reach = 1) => {
    k(name, 0, { strokeDashoffset: '1', opacity: 0, stroke }, EASE.inout)
    k(name, t0, { strokeDashoffset: '1', opacity: 1, stroke }, EASE.inout)
    k(name, t1, { strokeDashoffset: String(1 - reach), opacity: 1, stroke }, EASE.out)
    k(name, until, { strokeDashoffset: String(1 - reach), opacity: 1, stroke }, EASE.inout)
    k(name, until + 0.5, { strokeDashoffset: String(1 - reach), opacity: 0, stroke })
  }
  /** 垂直光束（数据层到 DOM 层）：亮一下 */
  const wire = (name: string, t: number, hold = 0.5) => {
    k(name, 0, { opacity: 0, transform: 'rotateX(90deg) scaleY(1)' }, EASE.out)
    k(name, t, { opacity: 0, transform: 'rotateX(90deg) scaleY(1)' }, EASE.out)
    k(name, t + 0.2, { opacity: 1, transform: 'rotateX(90deg) scaleY(1)' })
    k(name, t + 0.2 + hold, { opacity: 1, transform: 'rotateX(90deg) scaleY(1)' })
    k(name, t + 0.6 + hold, { opacity: 0, transform: 'rotateX(90deg) scaleY(1)' })
  }
  /** 从 p2 的节点落到 DOM 层的提交光束 */
  const commitBeam = (id: string, t: number) => {
    const b = 'bm-' + id
    k(b, 0, { opacity: 0, transform: 'rotateX(-90deg) scaleY(0)' }, EASE.out)
    k(b, t, { opacity: 0, transform: 'rotateX(-90deg) scaleY(0)' }, EASE.out)
    k(b, t + 0.1, { opacity: 1, transform: 'rotateX(-90deg) scaleY(0)' }, EASE.out)
    k(b, t + 0.6, { opacity: 1, transform: 'rotateX(-90deg) scaleY(1)' }, EASE.inout)
    k(b, t + 1.3, { opacity: 1, transform: 'rotateX(-90deg) scaleY(1)' }, EASE.inout)
    k(b, t + 1.9, { opacity: 0, transform: 'rotateX(-90deg) scaleY(1)' })
    flash('cm-' + id, t + 0.55, 0.7)
  }
  /** DOM 块被更新：闪一下，再带上绿色的“已更新”底色，在 until 之前保持 */
  const blockUpdate = (id: string, t: number, until: number) => {
    flash('bl-' + id, t, 0.15, 0.9)
    k('bo-' + id, 0, { opacity: 0 })
    k('bo-' + id, t, { opacity: 0 }, EASE.out)
    k('bo-' + id, t + 0.45, { opacity: 0.85 })
    k('bo-' + id, until, { opacity: 0.85 }, EASE.inout)
    k('bo-' + id, until + 0.6, { opacity: 0 })
  }
  const callout = (name: string, t0: number, t1: number) => {
    k(name, 0, { opacity: 0, transform: 'translateY(8px)' }, EASE.out)
    k(name, t0, { opacity: 0, transform: 'translateY(8px)' }, EASE.out)
    k(name, t0 + 0.45, { opacity: 1, transform: 'translateY(0px)' }, EASE.inout)
    k(name, t1 - 0.4, { opacity: 1, transform: 'translateY(0px)' }, EASE.out)
    k(name, t1, { opacity: 0, transform: 'translateY(-6px)' })
  }
  /** 响应式数据变了：“set”气泡落在药丸上，药丸发光 */
  const setPill = (id: string, t: number, hold = 1.2) => {
    flash('dp-' + id, t + 0.1, hold)
    if (id === 'todos') {
      k('spark', t - 0.5, { opacity: 0, transform: 'translateY(-30px) scale(.5)' }, EASE.back)
      k('spark', t, { opacity: 1, transform: 'translateY(0px) scale(1)' }, EASE.inout)
      k('spark', t + 0.5, { opacity: 1, transform: 'translateY(0px) scale(1)' }, EASE.out)
      k('spark', t + 0.8, { opacity: 0, transform: 'translateY(30px) scale(.4)' })
    }
  }

  /* ===== 相机 ===== */
  const poses = mobile ? POSES_MOBILE : POSES_DESKTOP
  k('cam', 0, { transform: poseCss([68, -40, poses[0][2] * 0.6, 60, poses[0][4] * 0.85]) }, EASE.inout)
  poses.forEach((p, i) => {
    const arrive = i === 0 ? 4.6 : M[i] + 0.9
    k('cam', arrive, { transform: poseCss(p) }, EASE.inout)
    const end = i === poses.length - 1 ? TOTAL : M[i + 1] - 0.05
    const drift: Pose = [p[0] + 1.5, p[1] + 2, p[2] - 8, p[3] + 4, p[4] * 1.025]
    k('cam', end, { transform: poseCss(drift) }, EASE.lin)
  })

  /* ===== 0 开场：三层空间由下往上搭起来 ===== */
  const PL: [string, number, number][] = [['pl4', -230, 0.2], ['pl3', -120, 0.5], ['pl2', 0, 0.9], ['pl1', 120, 1.3]]
  for (const [n, z, t] of PL) {
    k(n, 0, { opacity: 0, transform: `${U}(${z - 100}px)` }, EASE.out)
    k(n, t, { opacity: 0, transform: `${U}(${z - 100}px)` }, EASE.out)
    k(n, t + 0.9, { opacity: 1, transform: `${U}(${z}px)` })
  }
  // 第 1、2 幕：中间层（虚拟 DOM）退场，第 3 幕回来；第 7 幕 Vapor 又退场；收束时回来
  k('pl2', M[1] + 0.1, { opacity: 1, transform: `${U}(0px)` }, EASE.inout)
  k('pl2', M[1] + 0.7, { opacity: 0, transform: `${U}(-70px)` }, EASE.inout)
  k('pl2', M[3] + 0.1, { opacity: 0, transform: `${U}(-70px)` }, EASE.out)
  k('pl2', M[3] + 0.8, { opacity: 1, transform: `${U}(0px)` })
  k('pl2', M[5] + 0.1, { opacity: 1, transform: `${U}(0px)` }, EASE.inout)
  k('pl2', M[5] + 0.8, { opacity: 0.4, transform: `${U}(0px)` })
  k('pl2', M[6] + 0.1, { opacity: 0.4, transform: `${U}(0px)` }, EASE.inout)
  k('pl2', M[6] + 0.8, { opacity: 1, transform: `${U}(0px)` })
  k('pl2', M[7] + 1.3, { opacity: 1, transform: `${U}(0px)` }, EASE.inout)
  k('pl2', M[7] + 2.3, { opacity: 0, transform: `${U}(-160px)` })
  // 收束：三层空间整体缩成一个点（见 flyerTracks 的 fly-c），自己淡出；背景换成干净的深色
  for (const n of ['pl1', 'pl3', 'pl4']) {
    k(n, M[8] + 0.9, { opacity: 1 }, EASE.inout)
    k(n, M[8] + 1.5, { opacity: 0 })
  }
  k('cam', M[8] + 0.9, { opacity: 1 }, EASE.inout)
  k('cam', M[8] + 1.5, { opacity: 0 })
  // 组合式那一幕：数据层拉到最亮，下面两层退一步
  k('pl3', M[5] + 0.1, { opacity: 1 }, EASE.inout)
  k('pl3', M[5] + 0.8, { opacity: 0.4 })
  k('pl3', M[6] + 0.1, { opacity: 0.4 }, EASE.inout)
  k('pl3', M[6] + 0.8, { opacity: 1 })

  // DOM 层的色块一块块出现
  NODES.forEach((n, i) => {
    const t = 0.9 + (n.id === 'App' ? 0 : 0.18 + i * 0.09)
    k('b-' + n.id, 0, { opacity: 0, transform: 'scale(.92)' }, EASE.out)
    k('b-' + n.id, t, { opacity: 0, transform: 'scale(.92)' }, EASE.out)
    k('b-' + n.id, t + 0.6, { opacity: 1, transform: 'scale(1)' })
  })
  // 树：连线从根往下长出来，节点依次点亮
  NODES.forEach((n, i) => {
    const d = depthOf(n.id)
    const t = 2.0 + d * 0.38 + (i % 3) * 0.04
    k('n-' + n.id, 0, { opacity: 0, transform: 'scale(.4)' }, EASE.back)
    k('n-' + n.id, t, { opacity: 0, transform: 'scale(.4)' }, EASE.back)
    k('n-' + n.id, t + 0.45, { opacity: 1, transform: 'scale(1)' })
    if (n.parent) {
      k('e-' + n.id, 0, { strokeDashoffset: '1' }, EASE.inout)
      k('e-' + n.id, t - 0.4, { strokeDashoffset: '1' }, EASE.inout)
      k('e-' + n.id, t + 0.1, { strokeDashoffset: '0' })
    }
  })
  // 响应式数据：药丸从上面落下，药丸之间的依赖线（remaining 由 todos 算出）画出来
  DATA.forEach((d, i) => {
    const t = 3.2 + i * 0.3
    k('d-' + d.id, 0, { opacity: 0, transform: 'translateY(-26px)' }, EASE.out)
    k('d-' + d.id, t, { opacity: 0, transform: 'translateY(-26px)' }, EASE.out)
    k('d-' + d.id, t + 0.6, { opacity: 1, transform: 'translateY(0px)' })
  })
  k('dep', 0, { strokeDashoffset: '1', opacity: 1 }, EASE.inout)
  k('dep', 4.0, { strokeDashoffset: '1', opacity: 1 }, EASE.inout)
  k('dep', 4.7, { strokeDashoffset: '0', opacity: 1 })
  flash('nl-App', 2.0, 0.2, 0.9)

  /* ===== 1 手动改 DOM：数据变了，界面靠人去同步，漏掉一处 ===== */
  setPill('todos', M[1] + 1.1, 1.4)
  const MAN: [string, number, number, number][] = [['Item1', 1.8, 2.3, 1], ['Item2', 2.5, 3.0, 1], ['Counter', 3.2, 3.6, 0.45]]
  for (const [target, a, b, reach] of MAN) {
    draw('dl-' + target, M[1] + a, M[1] + b, C.data, M[2] - 0.1, reach)
    if (reach === 1) blockUpdate(target, M[1] + b - 0.05, M[2] + 0.2)
  }
  // 漏掉的那一块：红色闪烁
  k('bx-Counter', 0, { opacity: 0 })
  for (let i = 0; i < 3; i++) {
    const t = M[1] + 3.8 + i * 0.4
    k('bx-Counter', t, { opacity: 0 }, EASE.lin)
    k('bx-Counter', t + 0.15, { opacity: 0.85 }, EASE.lin)
    k('bx-Counter', t + 0.3, { opacity: 0.25 }, EASE.lin)
  }
  k('bx-Counter', M[2] + 0.1, { opacity: 0.25 }, EASE.inout)
  k('bx-Counter', M[2] + 0.7, { opacity: 0 })
  callout('cl-1', M[1] + 3.7, M[2] - 0.05)

  /* ===== 2 Vue 1.0：每个绑定一个 watcher，数据到 DOM 直接连线 ===== */
  const WT = Object.keys(BIND)
  WT.forEach((id, i) => {
    const t = M[2] + 0.5 + i * 0.3
    k('wt-' + id, 0, { opacity: 0, transform: 'scale(.3)' }, EASE.back)
    k('wt-' + id, t, { opacity: 0, transform: 'scale(.3)' }, EASE.back)
    k('wt-' + id, t + 0.4, { opacity: 1, transform: 'scale(1)' })
    k('wt-' + id, M[3] + 0.1, { opacity: 1, transform: 'scale(1)' }, EASE.inout)
    k('wt-' + id, M[3] + 0.6, { opacity: 0, transform: 'scale(.3)' })
    flash('wl-' + id, t + 0.1, 0.1, 0.6)
  })
  callout('cl-2', M[2] + 1.2, M[3] - 0.05)
  // todos 变：只通知依赖它的两个 watcher；remaining（computed）跟着变，再通知 Counter 的 watcher
  setPill('todos', M[2] + 2.5, 1.6)
  for (const [id, t] of [['Item1', 3.0], ['Item2', 3.3]] as const) {
    draw('dl-' + id, M[2] + t, M[2] + t + 0.4, C.render, M[3] - 0.3)
    wire('wr-' + id, M[2] + t + 0.4, 0.5)
    flash('wl-' + id, M[2] + t + 0.8, 0.5, 1)
    blockUpdate(id, M[2] + t + 0.9, M[3] + 0.2)
  }
  k('dep', M[2] + 3.3, { strokeDashoffset: '0', opacity: 1, stroke: '#7d8f8a' }, EASE.inout)
  flash('dp-remaining', M[2] + 4.0, 0.8)
  draw('dl-Counter', M[2] + 4.3, M[2] + 4.7, C.render, M[3] - 0.3)
  wire('wr-Counter', M[2] + 4.7, 0.5)
  flash('wl-Counter', M[2] + 5.1, 0.5, 1)
  blockUpdate('Counter', M[2] + 5.2, M[3] + 0.2)

  /* ===== 3 Vue 2.0：数据通知到组件，组件重新生成 vnode 子树，比对后只改差别 ===== */
  const COMP = ['App', 'Header', 'List', 'Footer']
  COMP.forEach((id, i) => {
    const t = M[3] + 1.0 + i * 0.22
    k('pw-' + id, 0, { opacity: 0, transform: 'scale(.3)' }, EASE.back)
    k('pw-' + id, t, { opacity: 0, transform: 'scale(.3)' }, EASE.back)
    k('pw-' + id, t + 0.4, { opacity: 1, transform: 'scale(1)' })
    k('pw-' + id, M[4] + 0.1, { opacity: 1, transform: 'scale(1)' }, EASE.inout)
    k('pw-' + id, M[4] + 0.6, { opacity: 0, transform: 'scale(.3)' })
  })
  setPill('todos', M[3] + 1.6, 1.6)
  draw('dl-List', M[3] + 2.0, M[3] + 2.5, C.render, M[3] + 3.6)
  flash('pl-List', M[3] + 2.5, 1.2, 1)
  draw('dl-Footer', M[3] + 2.7, M[3] + 3.2, C.render, M[3] + 4.0)
  flash('dp-remaining', M[3] + 2.5, 0.8)
  flash('pl-Footer', M[3] + 3.2, 1.2, 1)
  // 两个组件各自重新生成自己的 vnode 子树（新的一份：虚线），Header 没有被通知，不动
  const REDO: [string, number][] = [['List', M[3] + 2.6], ['Footer', M[3] + 3.3]]
  const redone: string[] = []
  for (const [root, t0] of REDO) {
    for (const id of subtree(root)) {
      const nd = nodeById(id)
      const arrive = t0 + (depthOf(id) - depthOf(root)) * 0.5
      redone.push(id)
      if (id !== root && nd.parent) comet(id, arrive - 0.35, 0.4)
      k('nl-' + id, 0, { opacity: 0 }, EASE.out)
      k('nl-' + id, arrive, { opacity: 0 }, EASE.out)
      k('nl-' + id, arrive + 0.25, { opacity: 1 })
      k('nl-' + id, M[4] + 0.1, { opacity: 1 }, EASE.inout)
      k('nl-' + id, M[4] + 0.6, { opacity: 0 })
      k('gn-' + id, 0, { opacity: 0, transform: 'translateY(-14px) scale(.6)' }, EASE.back)
      k('gn-' + id, arrive + 0.1, { opacity: 0, transform: 'translateY(-14px) scale(.6)' }, EASE.back)
      k('gn-' + id, arrive + 0.55, { opacity: 1, transform: 'translateY(0px) scale(1)' })
    }
  }
  k('p2b', 0, { opacity: 0, transform: `${U}(50px)` }, EASE.inout)
  k('p2b', M[3] + 2.6, { opacity: 0, transform: `${U}(50px)` }, EASE.inout)
  k('p2b', M[3] + 3.1, { opacity: 1, transform: `${U}(50px)` })
  callout('cl-3', M[3] + 3.0, M[4] - 0.05)
  // 叠合比对：没变的变暗，只有 Item1 和 Counter 有差别
  const DIFF3 = ['Item1', 'Counter']
  k('p2b', M[3] + 3.9, { opacity: 1, transform: `${U}(50px)` }, EASE.inout)
  k('p2b', M[3] + 4.5, { opacity: 1, transform: `${U}(8px)` }, EASE.inout)
  for (const id of redone) {
    const same = !DIFF3.includes(id)
    k('n-' + id, M[3] + 4.4, { opacity: 1 }, EASE.inout)
    k('n-' + id, M[3] + 4.9, { opacity: same ? 0.3 : 1 })
    k('gn-' + id, M[3] + 4.4, { opacity: 1 }, EASE.inout)
    k('gn-' + id, M[3] + 4.9, { opacity: same ? 0 : 1 })
    k('n-' + id, M[4] - 0.2, { opacity: same ? 0.3 : 1 }, EASE.inout)
    k('n-' + id, M[4] + 0.6, { opacity: 1 })
  }
  for (const id of DIFF3) {
    pop('fl-' + id, CUE.flag3, 0.4)
    k('fl-' + id, M[4] - 0.1, { opacity: 1, transform: 'scale(1)' }, EASE.inout)
    k('fl-' + id, M[4] + 0.5, { opacity: 0, transform: 'scale(1)' })
    commitBeam(id, CUE.land3 - 0.1)
    blockUpdate(id, M[3] + 5.9, M[4] + 0.2)
  }
  k('p2b', M[4] - 0.1, { opacity: 1, transform: `${U}(8px)` }, EASE.inout)
  k('p2b', M[4] + 0.5, { opacity: 0, transform: `${U}(-4px) rotateX(-80deg)` })

  /* ===== 4 Vue 3.0：Proxy 响应式 + 编译期优化——静态的不参与更新，比对只走动态节点 ===== */
  // 先说数据层：药丸外圈亮一下（Proxy 追踪读写）
  callout('cl-4a', M[4] + 0.4, M[4] + 2.6)
  DATA.forEach((d, i) => flash('px-' + d.id, M[4] + 0.8 + i * 0.25, 0.8, 0.9))
  // 编译器把静态的东西标出来（盾），容器节点变暗；动态节点之间拉一条扁平的“区块”连线
  for (const id of [...STATIC_LEAVES]) {
    pop('sh-' + id, CUE.shield, 0.5, 0.95)
    k('sh-' + id, M[5] + 0.1, { opacity: 0.95, transform: 'scale(1)' }, EASE.inout)
    k('sh-' + id, M[5] + 0.6, { opacity: 0, transform: 'scale(.6)' })
  }
  // 容器变暗；静态叶子（Logo、Hint）保持亮度，带着“跳过”的盾
  for (const id of ['App', 'Header', 'List', 'Footer']) {
    k('n-' + id, M[4] + 1.0, { opacity: 1 }, EASE.inout) // 与上一幕结尾衔接
    k('n-' + id, M[4] + 2.6, { opacity: id === 'App' ? 0.75 : 0.3 })
    k('n-' + id, M[5] + 0.1, { opacity: id === 'App' ? 0.75 : 0.3 }, EASE.inout)
    k('n-' + id, M[5] + 0.7, { opacity: 1 })
  }
  DYNAMIC.forEach((id, i) => {
    const t = M[4] + 3.0 + i * 0.2
    k('fx-' + id, 0, { strokeDashoffset: '1', opacity: 0 }, EASE.inout)
    k('fx-' + id, t, { strokeDashoffset: '1', opacity: 1 }, EASE.inout)
    k('fx-' + id, t + 0.6, { strokeDashoffset: '0', opacity: 1 })
    k('fx-' + id, M[5] + 0.1, { strokeDashoffset: '0', opacity: 1 }, EASE.inout)
    k('fx-' + id, M[5] + 0.6, { strokeDashoffset: '0', opacity: 0 })
  })
  k('blk', 0, { opacity: 0, transform: 'translateY(6px)' }, EASE.out)
  k('blk', M[4] + 3.2, { opacity: 0, transform: 'translateY(6px)' }, EASE.out)
  k('blk', M[4] + 3.7, { opacity: 1, transform: 'translateY(0px)' })
  k('blk', M[5] + 0.1, { opacity: 1, transform: 'translateY(0px)' }, EASE.inout)
  k('blk', M[5] + 0.6, { opacity: 0, transform: 'translateY(-4px)' })
  callout('cl-4b', M[4] + 3.3, M[5] - 0.05)
  // 更新：todos 变，只有绑定了它的动态节点被重新比对
  setPill('todos', M[4] + 3.9, 1.4)
  draw('dl-List', M[4] + 4.2, M[4] + 4.7, C.render, M[4] + 5.9)
  const UPD4 = ['Item1', 'Item2', 'Counter']
  UPD4.forEach((id, i) => {
    const t = M[4] + 4.8 + i * 0.15
    comet(id, t, 0.5)
    k('nl-' + id, 0, { opacity: 0 }, EASE.out)
    k('nl-' + id, t + 0.4, { opacity: 0 }, EASE.out)
    k('nl-' + id, t + 0.65, { opacity: 1 })
    k('nl-' + id, M[5] + 0.1, { opacity: 1 }, EASE.inout)
    k('nl-' + id, M[5] + 0.6, { opacity: 0 })
  })
  for (const id of ['Item1', 'Counter']) {
    pop('fl-' + id, CUE.flag4, 0.4)
    k('fl-' + id, M[5] - 0.1, { opacity: 1, transform: 'scale(1)' }, EASE.inout)
    k('fl-' + id, M[5] + 0.5, { opacity: 0, transform: 'scale(1)' })
    commitBeam(id, CUE.land4 - 0.1)
    blockUpdate(id, M[4] + 6.4, M[5] + 0.3)
  }

  /* ===== 5 组合式 API 与 <script setup>：同一功能的状态和逻辑，从按“选项类型”分散，聚到一起 ===== */
  // 真正的数据药丸先暗下去；五个小块（三份数据 + 两个方法）按选项类型散在 data / computed / methods 三列，
  // 颜色按功能分（紫 = 待办，琥珀 = 标题），所以能看出“同一功能被拆散在三处”；然后依次移动到各自的功能分组里
  for (const d of DATA) {
    const n = 'd-' + d.id
    k(n, M[5] + 0.1, { opacity: 1, transform: 'translateY(0px)' }, EASE.inout)
    k(n, M[5] + 0.7, { opacity: 0.15, transform: 'translateY(0px)' })
    k(n, M[5] + 4.7, { opacity: 0.15, transform: 'translateY(0px)' }, EASE.inout)
    k(n, M[5] + 5.2, { opacity: 1, transform: 'translateY(0px)' })
  }
  for (const c of MOVER_COLUMNS) {
    const n = 'col-' + c.id
    k(n, 0, { opacity: 0 }, EASE.out)
    k(n, M[5] + 0.3, { opacity: 0 }, EASE.out)
    k(n, M[5] + 0.8, { opacity: 1 })
    k(n, CUE.gather + 0.1, { opacity: 1 }, EASE.inout)
    k(n, CUE.gather + 0.9, { opacity: 0 })
  }
  const order = ['todos', 'remaining', 'addTodo', 'title', 'setTitle']
  for (const mv of MOVERS) {
    const n = 'mv-' + mv.id
    const from = `translate(${mv.sx - mv.fx}px, ${mv.sy - mv.fy}px) scale(1)`
    const hid = `translate(${mv.sx - mv.fx}px, ${mv.sy - mv.fy - 14}px) scale(.6)`
    const i = order.indexOf(mv.id)
    const t0 = CUE.gather + (mv.id === 'todos' ? 0 : 0.1 + i * 0.12)
    k(n, 0, { opacity: 0, transform: hid }, EASE.back)
    k(n, M[5] + 0.4 + i * 0.1, { opacity: 0, transform: hid }, EASE.back)
    k(n, M[5] + 0.9 + i * 0.1, { opacity: 1, transform: from }, EASE.out)
    k(n, t0, { opacity: 1, transform: from }, EASE.inout)
    k(n, t0 + 1.2, { opacity: 1, transform: 'translate(0px, 0px) scale(1)' })
    const end = mv.kind === 'fn' ? M[6] + 0.1 : M[5] + 4.7
    k(n, end, { opacity: 1, transform: 'translate(0px, 0px) scale(1)' }, EASE.inout)
    k(n, end + 0.5, { opacity: 0, transform: 'translate(0px, 0px) scale(1)' })
  }
  k('chip', 0, { opacity: 0, transform: 'translateY(8px)' }, EASE.out)
  k('chip', M[5] + 0.5, { opacity: 0, transform: 'translateY(8px)' }, EASE.out)
  k('chip', M[5] + 1.0, { opacity: 1, transform: 'translateY(0px)' })
  k('chip', M[6] + 0.1, { opacity: 1, transform: 'translateY(0px)' }, EASE.inout)
  k('chip', M[6] + 0.6, { opacity: 0, transform: 'translateY(-4px)' })
  for (const [id, t] of [['gf-todos', CUE.group], ['gf-title', CUE.group + 0.3]] as const) {
    k(id, 0, { opacity: 0, transform: 'scale(.94)' }, EASE.out)
    k(id, t, { opacity: 0, transform: 'scale(.94)' }, EASE.out)
    k(id, t + 0.6, { opacity: 1, transform: 'scale(1)' })
    k(id, M[6] + 0.1, { opacity: 1, transform: 'scale(1)' }, EASE.inout)
    k(id, M[6] + 0.6, { opacity: 0, transform: 'scale(1.02)' })
  }
  callout('cl-5', M[5] + 1.2, M[6] - 0.05)

  /* ===== 6 Vue 3.4 / 3.5：computed 的值没变就不再通知；3.5 重构响应式系统，内存占用降低 56% ===== */
  setPill('todos', M[6] + 1.0, 1.4)
  draw('dl-Item1', M[6] + 1.3, M[6] + 1.7, C.render, M[6] + 3.2)
  wire('wr-Item1', M[6] + 1.7, 0.6)
  blockUpdate('Item1', M[6] + 2.1, M[7] + 0.2)
  k('dep', M[6] + 1.4, { strokeDashoffset: '0', opacity: 1, stroke: C.data }, EASE.inout)
  k('dep', M[6] + 2.2, { strokeDashoffset: '0', opacity: 1, stroke: C.data }, EASE.inout)
  k('dep', M[6] + 3.0, { strokeDashoffset: '0', opacity: 1, stroke: '#7d8f8a' })
  flash('dp-remaining', M[6] + 2.0, 0.9)
  pop('eq', M[6] + 2.4, 0.4)
  k('eq', M[6] + 3.6, { opacity: 1, transform: 'scale(1)' }, EASE.inout)
  k('eq', M[6] + 4.0, { opacity: 0, transform: 'scale(1)' })
  pop('hold', M[6] + 2.7, 0.4)
  k('hold', M[6] + 3.6, { opacity: 1, transform: 'scale(1)' }, EASE.inout)
  k('hold', M[6] + 4.0, { opacity: 0, transform: 'scale(1)' })
  callout('cl-6a', M[6] + 1.6, M[6] + 3.7)
  // 3.5：响应式系统重构，内存占用降低 56%（官方博客的数字）：两根条，第二根缩到 44%
  k('mem', 0, { opacity: 0, transform: 'translateY(10px)' }, EASE.out)
  k('mem', M[6] + 3.9, { opacity: 0, transform: 'translateY(10px)' }, EASE.out)
  k('mem', M[6] + 4.3 - 0.1, { opacity: 1, transform: 'translateY(0px)' })
  k('mem', M[7] + 0.1, { opacity: 1, transform: 'translateY(0px)' }, EASE.inout)
  k('mem', M[7] + 0.5, { opacity: 0, transform: 'translateY(-6px)' })
  k('mem-b', 0, { transform: 'scaleX(1)' }, EASE.inout)
  k('mem-b', CUE.mem, { transform: 'scaleX(1)' }, EASE.inout)
  k('mem-b', CUE.mem + 0.9, { transform: `scaleX(${(1 - MEM_DROP).toFixed(2)})` })
  pop('mem-n', CUE.mem + 0.9, 0.4)
  k('mem-n', M[7] + 0.1, { opacity: 1, transform: 'scale(1)' }, EASE.inout)
  k('mem-n', M[7] + 0.5, { opacity: 0, transform: 'scale(1)' })
  callout('cl-6b', M[6] + 4.0, M[7] - 0.05)

  /* ===== 7 Vue 3.6 候选版 Vapor：不经过虚拟 DOM，编译器生成的代码直接更新 DOM ===== */
  WT.forEach((id, i) => {
    const t = CUE.vwatch(i)
    k('wt-' + id, M[7] + 0.5, { opacity: 0, transform: 'scale(.3)' }, EASE.back)
    k('wt-' + id, t, { opacity: 0, transform: 'scale(.3)' }, EASE.back)
    k('wt-' + id, t + 0.4, { opacity: 1, transform: 'scale(1)' })
    k('wt-' + id, M[8] + 0.1, { opacity: 1, transform: 'scale(1)' }, EASE.inout)
    k('wt-' + id, M[8] + 0.6, { opacity: 0, transform: 'scale(.3)' })
  })
  callout('cl-7', M[7] + 1.3, M[8] - 0.05)
  setPill('todos', M[7] + 2.8, 1.4)
  for (const [id, t] of [['Item1', 3.3], ['Item2', 3.5]] as const) {
    draw('dl-' + id, M[7] + t, M[7] + t + 0.4, C.commit, M[8] - 0.3)
    wire('wv-' + id, M[7] + t + 0.4, 0.5)
    blockUpdate(id, M[7] + t + 0.8, M[8] + 0.2)
  }
  k('dep', M[7] + 3.4, { strokeDashoffset: '0', opacity: 1, stroke: '#7d8f8a' }, EASE.inout)
  flash('dp-remaining', M[7] + 4.2, 0.8)
  draw('dl-Counter', M[7] + 4.5, M[7] + 4.9, C.commit, M[8] - 0.3)
  wire('wv-Counter', M[7] + 4.9, 0.5)
  blockUpdate('Counter', M[7] + 5.3, M[8] + 0.2)

  /* ===== 每个时代一个主色：背景光晕、年份下的色条 ===== */
  for (let i = 0; i < ERA_COLORS.length; i++) {
    const n = 'eg-' + i
    k(n, 0, { opacity: i === 0 ? 1 : 0 }, EASE.inout)
    if (i > 0) {
      k(n, M[i] + 0.1, { opacity: 0 }, EASE.inout)
      k(n, M[i] + 1.0, { opacity: 1 }, EASE.inout)
    }
    if (i < ERA_COLORS.length - 1) {
      k(n, M[i + 1] + 0.1, { opacity: 1 }, EASE.inout)
      k(n, M[i + 1] + 1.0, { opacity: 0 })
    }
    if (i >= 2 && i <= 7) {
      const y = 'yb-' + i
      k(y, 0, { opacity: 0, transform: 'scaleX(0)' }, EASE.out)
      k(y, M[i] + 0.5, { opacity: 0, transform: 'scaleX(0)' }, EASE.out)
      k(y, M[i] + 1.1, { opacity: 1, transform: 'scaleX(1)' }, EASE.inout)
      k(y, M[i + 1] + 0.1, { opacity: 1, transform: 'scaleX(1)' }, EASE.inout)
      k(y, M[i + 1] + 0.5, { opacity: 0, transform: 'scaleX(1)' })
    }
  }

  /* ===== 年份、版本标签、图例 ===== */
  const yrs: [number, string][] = [[M[2] + 0.3, '2015'], [M[3] + 0.3, '2016'], [M[4] + 0.3, '2020'], [M[5] + 2.6, '2021'], [M[6] + 0.3, '2023'], [M[6] + 3.5, '2024'], [M[7] + 0.3, '2026']]
  for (let d = 0; d < 4; d++) {
    k('yd-' + d, 0, { transform: 'translateY(0em)' }, EASE.inout)
    k('yd-' + d, M[2] + 0.2, { transform: 'translateY(0em)' }, EASE.inout)
    let prev = '0000'
    for (const [t, y] of yrs) {
      if (y[d] !== prev[d]) {
        k('yd-' + d, t, { transform: `translateY(${-Number(prev[d])}em)` }, EASE.inout)
        k('yd-' + d, t + 0.9, { transform: `translateY(${-Number(y[d])}em)` }, EASE.inout)
      }
      prev = y
    }
  }
  fade('year', 0, M[2] + 0.2, 0, 0)
  fade('year', M[2] + 0.2, M[2] + 0.7, 0, 1)
  k('year', M[8] + 0.1, { opacity: 1 }, EASE.inout)
  k('year', M[8] + 0.7, { opacity: 0 })
  const tagWin: Record<string, [number, number]> = {
    t2: [M[2] + 0.5, M[3] + 0.1], t3: [M[3] + 0.5, M[4] + 0.1], t4: [M[4] + 0.5, M[5] + 0.1], t5: [M[5] + 2.8, M[6] + 0.1],
    t6a: [M[6] + 0.5, M[6] + 3.5], t6b: [M[6] + 3.9, M[7] + 0.1], t7: [M[7] + 0.5, M[8] + 0.1],
  }
  for (const [key, [a, b]] of Object.entries(tagWin)) {
    k('yt-' + key, 0, { opacity: 0, transform: 'translateY(8px)' }, EASE.out)
    k('yt-' + key, a, { opacity: 0, transform: 'translateY(8px)' }, EASE.out)
    k('yt-' + key, a + 0.5, { opacity: 1, transform: 'translateY(0px)' }, EASE.inout)
    k('yt-' + key, b, { opacity: 1, transform: 'translateY(0px)' }, EASE.out)
    k('yt-' + key, b + 0.4, { opacity: 0, transform: 'translateY(-8px)' })
  }
  fade('css:.film .legend', 0, 0.01, 0, 0)
  fade('css:.film .legend', M[0] + 3.8, M[0] + 4.4, 0, 1)
  k('css:.film .legend', M[8] + 0.1, { opacity: 1 }, EASE.inout)
  k('css:.film .legend', M[8] + 0.6, { opacity: 0 })

  /* ===== 文字：标题从遮罩里擦入，说明依次升起，钩子在幕尾出现 ===== */
  k('cp-0', 0, { opacity: 1 }, EASE.inout)
  k('cp-0', M[1] - 0.8, { opacity: 1 }, EASE.inout)
  k('cp-0', M[1] - 0.1, { opacity: 0 })
  for (let i = 1; i <= 7; i++) {
    const c = `[data-w=cp-${i}]`
    k('cp-' + i, 0, { opacity: 0 }, EASE.inout)
    k('cp-' + i, M[i] + 0.15, { opacity: 0 }, EASE.inout)
    k('cp-' + i, M[i] + 0.55, { opacity: 1 }, EASE.inout)
    k('cp-' + i, M[i + 1] - 0.5, { opacity: 1 }, EASE.inout)
    k('cp-' + i, M[i + 1] - 0.05, { opacity: 0 })
    const s = (sub: string, t: number, d: number, from: string) => {
      const name = `css:${c} ${sub}`
      k(name, 0, { transform: from, opacity: 0 }, EASE.out)
      k(name, M[i] + t, { transform: from, opacity: 0 }, EASE.out)
      k(name, M[i] + t + d, { transform: 'translateY(0%)', opacity: 1 })
    }
    s('.eyebrow', 0.2, 0.5, 'translateY(10px)')
    s('.mk-in', 0.3, 0.7, 'translateY(108%)')
    s('.desc', 0.7, 0.6, 'translateY(14px)')
    if (i < 7) {
      const name = `css:${c} .hook`
      k(name, 0, { opacity: 0, transform: 'translateX(-10px)' }, EASE.out)
      k(name, M[i + 1] - 2.4, { opacity: 0, transform: 'translateX(-10px)' }, EASE.out)
      k(name, M[i + 1] - 1.7, { opacity: 1, transform: 'translateX(0px)' })
    }
  }
  k('cp-8', 0, { opacity: 0 }, EASE.inout)
  k('cp-8', M[8] + 0.5, { opacity: 0 }, EASE.inout)
  k('cp-8', M[8] + 1.2, { opacity: 1 })
  const s8 = (sel: string, t: number, d: number, from: string) => {
    const name = `css:[data-w=cp-8] ${sel}`
    k(name, 0, { opacity: 0, transform: from }, EASE.out)
    k(name, M[8] + t, { opacity: 0, transform: from }, EASE.out)
    k(name, M[8] + t + d, { opacity: 1, transform: 'translateY(0%)' })
  }
  s8('.fin-eyebrow', 0.45, 0.5, 'translateY(10px)')
  s8('.mk-in', 0.55, 0.7, 'translateY(108%)')
  s8('.fin-head .desc', 0.95, 0.5, 'translateY(10px)')
  s8('.stats3', 2.0, 0.5, 'translateY(14px)')
  s8('.fin-actions', 2.3, 0.5, 'translateY(14px)')
  s8('.foot', 2.9, 0.5, 'translateY(8px)')
  // 时间轴的曲线先从左到右画出来（桌面）；手机上是竖线从上到下
  k('tl-draw', 0, { strokeDashoffset: '1' }, EASE.inout)
  k('tl-draw', M[8] + 0.6, { strokeDashoffset: '1' }, EASE.inout)
  k('tl-draw', CUE.fin - 0.05, { strokeDashoffset: '0' })
  k('tl-line', 0, { opacity: 0, transform: 'scaleY(0)' }, EASE.inout)
  k('tl-line', M[8] + 0.6, { opacity: 0, transform: 'scaleY(0)' }, EASE.inout)
  k('tl-line', CUE.fin - 0.05, { opacity: 1, transform: 'scaleY(1)' })
  // 三层空间彻底收掉，换成干净的深色底和时间轴后面一团柔光
  k('finbg', 0, { opacity: 0 }, EASE.inout)
  k('finbg', M[8] + 0.4, { opacity: 0 }, EASE.inout)
  k('finbg', M[8] + 1.4, { opacity: 1 })

  return finalize(raw)
}

/** 排序、去重、补上 0 秒和结束时的关键帧，并把时间夹在 [0, TOTAL] 里 */
export function finalize(raw: Tracks): Tracks {
  const out: Tracks = {}
  for (const [name, list] of Object.entries(raw)) {
    const sorted = list.map(kf => ({ ...kf, t: Math.min(TOTAL, Math.max(0, kf.t)) })).sort((a, b) => a.t - b.t)
    // 同一时刻只留最后一个；两个关键帧时间太近时保持顺序
    const dedup: KF[] = []
    for (const kf of sorted) {
      const last = dedup[dedup.length - 1]
      if (last && Math.abs(last.t - kf.t) < 1e-6) dedup[dedup.length - 1] = { ...last, ...kf }
      else dedup.push(kf)
    }
    if (dedup[0].t > 0) dedup.unshift({ ...dedup[0], t: 0 })
    const end = dedup[dedup.length - 1]
    if (end.t < TOTAL) dedup.push({ ...end, t: TOTAL })
    out[name] = dedup
  }
  return out
}

/* ===== 幕间的“过渡元素”和收束幕的时间轴卡片：起点终点要在布局稳定后量出来（film.ts 量，传进来），所以单独一个函数 ===== */
export interface Pt {
  x: number
  y: number
}
export interface Measure {
  /** 第 1 幕里三块 DOM（Item1、Item2、Counter）的中心（屏幕坐标，相对 .world） */
  a: [Pt, Pt, Pt]
  /** 第 2 幕里 todos 数据药丸的中心 */
  aEnd: Pt
  /** 第 3 幕里 Item1 上的差别标记 */
  bStart: Pt
  /** 第 4 幕里静态节点 Hint（Logo 在说明文字下面，看不见） */
  bEnd: Pt
  /** 收束：三层空间的中心 */
  cStart: Pt
  /** 收束幕时间轴上各站的圆点中心 */
  li: Pt[]
}

/** 从 p0 到 p1 的一条向上拱的弧线上取 n+1 个点 */
export function arcPoints(p0: Pt, p1: Pt, lift = 0.3, n = 8): Pt[] {
  const dx = p1.x - p0.x
  const dy = p1.y - p0.y
  const d = Math.hypot(dx, dy) || 1
  const c = { x: (p0.x + p1.x) / 2 + (dy / d) * d * lift, y: (p0.y + p1.y) / 2 - (dx / d) * d * lift - d * 0.1 }
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    out.push({ x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * c.x + t ** 2 * p1.x, y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * c.y + t ** 2 * p1.y })
  }
  return out
}

export function flyerTracks(m: Measure): Tracks {
  const raw: Tracks = {}
  const k = (name: string, t: number, props: Omit<KF, 't'>, easing = EASE.lin) => {
    if (!raw[name]) raw[name] = []
    raw[name].push({ t, easing, ...props })
  }
  const tf = (p: Pt, s = 1, r = 0) => `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) rotate(${r}deg) scale(${s})`
  /** 沿弧线飞：每个采样点一个关键帧 */
  const fly = (name: string, from: Pt, to: Pt, t0: number, t1: number, s0: number, s1: number, lift = 0.3, rot = 0) => {
    const pts = arcPoints(from, to, lift)
    pts.forEach((p, i) => {
      const u = i / (pts.length - 1)
      const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2
      k(name, t0 + (t1 - t0) * u, { transform: tf(p, s0 + (s1 - s0) * e, rot * e) })
    })
  }
  // (a) 第 1 幕：手动改的三块（含漏掉的那块）各飞出一个光点，汇到第 2 幕里 todos 的那一次变化上——三处手工的同步，变成“一份数据通知它的依赖”
  m.a.forEach((from, i) => {
    const name = `fly-a-${i}`
    const t0 = MARKS[2] + 0.1 + i * 0.12
    const t1 = MARKS[2] + 2.75
    k(name, 0, { opacity: 0, transform: tf(from, 0.6) })
    k(name, t0, { opacity: 0, transform: tf(from, 0.6) })
    k(name, t0 + 0.2, { opacity: 1, transform: tf(from, 1) })
    fly(name, from, m.aEnd, t0 + 0.2, t1, 1, 1.15, 0.35 - i * 0.3)
    k(name, t1, { opacity: 1 })
    k(name, t1 + 0.25, { opacity: 0, transform: tf(m.aEnd, 0.3) })
  })
  // (b) 第 3 幕剩下的那一处差别标记，飞到第 4 幕里静态节点 Hint 上，变成“跳过”的盾：Vue 3 的编译器事先知道哪些节点不会变
  const bT0 = MARKS[3] + 6.3
  const bT1 = CUE.shield
  k('fly-b', 0, { opacity: 0, transform: tf(m.bStart, 1) })
  k('fly-b', bT0, { opacity: 0, transform: tf(m.bStart, 1) })
  k('fly-b', bT0 + 0.1, { opacity: 1, transform: tf(m.bStart, 1) })
  k('fly-b', MARKS[4] + 0.1, { opacity: 1, transform: tf(m.bStart, 1) })
  fly('fly-b', m.bStart, m.bEnd, MARKS[4] + 0.1, bT1, 1, 0.55, 0.28, 90)
  k('fly-b', bT1 + 0.05, { opacity: 1 })
  k('fly-b', bT1 + 0.3, { opacity: 0, transform: tf(m.bEnd, 0.5, 90) })
  k('fly-b-ring', 0, { opacity: 0, transform: tf(m.bEnd, 0.3) })
  k('fly-b-ring', bT1, { opacity: 0, transform: tf(m.bEnd, 0.3) }, EASE.out)
  k('fly-b-ring', bT1 + 0.1, { opacity: 0.95, transform: tf(m.bEnd, 0.7) }, EASE.out)
  k('fly-b-ring', bT1 + 0.8, { opacity: 0, transform: tf(m.bEnd, 2.4) })
  // (c) 收束：三层空间整体缩小、旋转，落成时间轴上的最后一个点；其余各点依次从它“拉”出来
  const last = m.li[m.li.length - 1]
  const cT0 = MARKS[8] + 0.15
  const cT1 = CUE.fin
  k('fly-c', 0, { opacity: 0, transform: tf(m.cStart, 3, 0) })
  k('fly-c', cT0, { opacity: 0, transform: tf(m.cStart, 3, 0) }, EASE.out)
  k('fly-c', cT0 + 0.2, { opacity: 1, transform: tf(m.cStart, 3, 0) })
  fly('fly-c', m.cStart, last, cT0 + 0.2, cT1, 3, 0.5, 0.15, 360)
  k('fly-c', cT1 + 0.05, { opacity: 1 })
  k('fly-c', cT1 + 0.35, { opacity: 0, transform: tf(last, 0.4, 360) })
  m.li.forEach((p, j) => {
    const name = `css:[data-w="cp-8"] .eras li:nth-child(${j + 1})`
    const from = { x: last.x - p.x, y: last.y - p.y }
    const t = j === m.li.length - 1 ? cT1 - 0.05 : cT1 + 0.1 + (m.li.length - 2 - j) * 0.16
    const hid = `translate(${from.x.toFixed(1)}px, ${from.y.toFixed(1)}px) scale(.4)`
    k(name, 0, { opacity: 0, transform: hid }, EASE.out)
    k(name, t, { opacity: 0, transform: hid }, EASE.out)
    k(name, t + 0.6, { opacity: 1, transform: 'translate(0px, 0px) scale(1)' })
  })
  return finalize(raw)
}
