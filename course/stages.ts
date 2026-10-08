/* 6 个阶段的唯一定义。侧边栏、首页、测验、引擎里用到阶段名称的地方都从这里取，不要再写第二份。
   一章属于哪个阶段，由这一章 frontmatter 里的 stage（1 到 6）决定，见 AUTHORING.md。
   结构和 hands-on-react 的 course/stages.ts 一致（no、name、en、desc），名称和编号两门课对齐。 */

export interface Stage {
  /** 编号，两位数字符串：'01' 到 '06' */
  no: string
  name: string
  /** 英文副标题 */
  en: string
  /** 一句话说明这个阶段学什么 */
  desc: string
}

export const STAGES: Stage[] = [
  { no: '01', name: '入门', en: 'Foundations', desc: '第一个 Vue 应用、模板语法与指令、ref 与 reactive、计算属性与侦听器，最后做一个待办清单项目。' },
  {
    no: '02',
    name: '进阶',
    en: 'Components in depth',
    desc: '组件通信、生命周期、组合式函数、内置组件、自定义指令、应用与插件、表单处理，最后做一个任务看板项目。'
  },
  {
    no: '03',
    name: '生态与实战',
    en: 'Ecosystem & projects',
    desc: 'TypeScript、工程化、Pinia、Vue Router、数据请求、状态归属、测试、性能优化和 Vue 2 迁移，最后用任务看板 Pro 把它们接成一个完整项目。'
  },
  { no: '04', name: '响应式原理', en: 'Reactivity internals', desc: '响应式原理、更新队列与 nextTick、watch 与 effectScope 的实现，以及响应式陷阱诊断，知其然更知其所以然。' },
  { no: '05', name: '渲染原理', en: 'Rendering internals', desc: '虚拟 DOM 与渲染函数（含 JSX）、模板编译、子节点的更新与 diff、组件运行时，以及自定义渲染器和内置组件的实现。' },
  {
    no: '06',
    name: '架构与工程',
    en: 'Architecture & engineering',
    desc: '组件设计模式、可复用 API 的设计、SSR 与 Nuxt、错误处理与监控、表单架构、性能诊断实战和组件库工程，最后用一个架构升级项目收尾。'
  }
]

/** 阶段数 */
export const STAGE_COUNT = STAGES.length

/** 阶段号（1 到 6）列表 */
export const STAGE_NUMBERS: number[] = STAGES.map((_, i) => i + 1)

/** 按阶段号（1 到 6）取阶段。号码不合法返回 undefined */
export const stageOf = (n: number): Stage | undefined => STAGES[n - 1]

/** 侧边栏和首页用的标题，例如 `01 入门` */
export const stageTitle = (n: number): string => {
  const s = stageOf(n)
  return s ? `${s.no} ${s.name}` : String(n)
}
