// 首页「学习路线」里的三条路线：想尽快能做项目、想系统掌握、已有 Vue 经验想补原理。
// 路线里不写章号：章用 id 引用，首页组件按章元数据显示“第 N 章”和标题，所以以后改章号、重排章，这里不用动，也不会过期。
// check:content 校验：id 都是真实存在的章、阶段号在范围内、同一条路线里章不重复、章按章号从小到大排列。
//
// 字段：
//   id      路线的稳定编号
//   title   路线名（首页的小标题）
//   who     一句话说明适合谁
//   parts   学习步骤，按先后排：
//             stage       这一步属于哪个阶段（1 到阶段数）；省略则不显示阶段名
//             ids         要学的章：章 id 数组；写 'all' 表示这个阶段的全部必读章（要同时写 stage）
//             checkStages 先做哪些阶段的阶段测验（阶段号数组），只补没通过的章
//             text        这一步的说明，一两句话，遵守写作规范
//   skip    可以跳过什么：{ stages: 整个跳过的阶段号, optional: true 表示选读章也先不学, text: 说明 }
//   test    （可选）怎样检验：一句话

export const LEARNING_PATHS = [
  {
    id: 'quick-project',
    title: '想尽快能做项目',
    who: '你想先做出能用的页面和应用，原理以后再补。',
    parts: [
      { stage: 1, ids: 'all', text: '入门全部学完，并做一个待办清单。' },
      { stage: 2, ids: 'all', text: '进阶全部学完。自定义指令里的实用指令可以以后再看。' },
      {
        stage: 3,
        ids: ['ts', 'tooling', 'pinia', 'router', 'data-fetching', 'testing', 'project'],
        text: '先学用得最多的工具，再用任务看板 Pro 把它们接起来。状态归属和性能优化，做完项目再回头学。'
      }
    ],
    skip: { stages: [4, 5, 6], optional: true, text: '原理和架构阶段先跳过，每章的“深入”块也先不展开。需要时再回来。' },
    test: '做完阶段 01 到 03 的阶段测验，就可以开始做自己的项目。'
  },
  {
    id: 'systematic',
    title: '想系统掌握',
    who: '你想知道每个知识点为什么这样设计，遇到新问题也能判断。',
    parts: [
      { stage: 1, ids: 'all', text: '从第一个应用开始，做完待办清单。' },
      { stage: 2, ids: 'all', text: '组件、组合式函数和表单，做完任务看板。' },
      { stage: 3, ids: 'all', text: '把常用工具接进项目，用任务看板 Pro 收尾。' },
      { stage: 4, ids: 'all', text: '搞清楚数据变化为什么能触发更新。' },
      { stage: 5, ids: 'all', text: '理解模板怎样变成页面，diff 怎样复用节点。' },
      { stage: 6, ids: 'all', text: '学组件设计、API 设计、SSR、错误处理和性能诊断，最后做架构升级。' }
    ],
    skip: { optional: true, text: '选读章可以最后再补，也可以不学。' },
    test: '每学完一个阶段，做一次阶段测验。'
  },
  {
    id: 'internals',
    title: '已有 Vue 经验，想补原理',
    who: '你已经用 Vue 做过项目，想知道它在内部怎样工作。',
    parts: [
      { checkStages: [1, 2, 3], text: '先做这三个阶段的阶段测验，只回去补没通过的章。' },
      {
        ids: ['reactivity', 'scheduler', 'watch-impl', 'reactivity-pitfalls', 'render', 'compiler', 'diff', 'runtime', 'renderer', 'builtins-impl', 'ssr'],
        text: '按这个顺序读：响应式、更新队列、渲染函数、模板编译、diff、组件运行时，最后到 SSR。其中的选读章也值得读。'
      }
    ],
    skip: { stages: [1, 2], text: '入门和进阶阶段的章，以及各个项目章，通过测验后可以跳过。' }
  }
]
