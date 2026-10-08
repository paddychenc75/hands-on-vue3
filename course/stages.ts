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
  { no: '01', name: '入门', en: 'Foundations', desc: '第一个 Vue 应用、模板语法与指令、ref 与 reactive、计算属性与侦听器。' },
  {
    no: '02',
    name: '进阶',
    en: 'Components in depth',
    desc: '组件通信、生命周期、内置组件、自定义指令、组合式函数、应用与插件，最后学会处理表单。'
  },
  { no: '03', name: '高级', en: 'Under the hood', desc: '响应式原理、更新队列与 nextTick、渲染函数与 JSX，知其然更知其所以然。' },
  { no: '04', name: '原理与架构', en: 'Compiler & architecture', desc: '模板编译、虚拟 DOM 与 diff、组件运行时与迷你 Vue，以及组件与组合式函数的 API 设计。' },
  {
    no: '05',
    name: '生态与实战',
    en: 'Ecosystem & projects',
    desc: 'Pinia 状态管理、Vue Router、状态归属与规模化、TypeScript、性能优化、工程化与测试，以及 Vue 2 迁移，把常用工具接进项目。'
  },
  { no: '06', name: '深入', en: 'In depth', desc: 'SSR 与水合、自定义渲染器、性能诊断实战，最后用一个综合项目收尾。' }
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
