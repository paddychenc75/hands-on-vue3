// 首页“本课程的写作规则”里的固定用词表：这些概念在正文里只用左边的说法，不用“不使用的同义词”。
// 它讲的是写作规范用词，和自动汇总的术语表（各章“本章术语”块）性质不同，所以数据单独放在这里，由三处使用：
//   - 课程地图页的写作规则表（RoadmapPage.vue）：label、meaning、avoid 三列
//   - 术语表页（GlossaryPage.vue）：terms 里的术语如果也在术语表里，多显示一栏“不这样说”（avoid）
//   - 术语标注（terms.ts）：terms 里的词也算“已知术语”，用来判断“子组件”这类复合词，不把里面的“组件”标出来
// check:content 校验 terms 里的每个术语都能在术语表里找到（找不到的会列出来，见 scripts/lib/known-issues.mjs）。
//
// 字段：
//   label    首页表格里“术语”一列的写法（可以带英文，可以写成“A / B”）
//   terms    它对应的术语表条目名，要和章里“本章术语”块的写法完全一致（一行可以对应多个条目）
//   meaning  首页表格里“意思”一列
//   avoid    不使用的同义词（首页表格第三列，也是术语表页的“不这样说”）
export const WRITING_TERMS = [
  { label: '响应式数据', terms: ['响应式数据'], meaning: 'Vue 跟踪读写的数据。数据改变时，Vue 更新页面。', avoid: '响应式状态、可观察数据' },
  { label: '副作用函数（effect）', terms: ['副作用函数（effect）'], meaning: '读取响应式数据并且在数据改变时再次运行的函数', avoid: '观察者（源码中的 Subscriber 译为“订阅者”，只在深入部分使用）' },
  { label: '收集依赖（track）', terms: ['收集依赖（track）'], meaning: '记录“哪个副作用函数读取了哪个属性”', avoid: '订阅、登记' },
  { label: '触发更新（trigger）', terms: ['触发更新（trigger）'], meaning: '再次运行读取了被修改属性的副作用函数', avoid: '通知、派发' },
  { label: '组件', terms: ['组件'], meaning: '有自己的模板、数据和逻辑的可复用单元', avoid: '控件、模块' },
  { label: '父组件 / 子组件', terms: ['父组件', '子组件'], meaning: '在模板中使用另一个组件的组件 / 被使用的组件', avoid: '上层组件、下层组件' },
  { label: 'props', terms: ['props'], meaning: '父组件传给子组件的数据', avoid: '参数、入参、属性' },
  { label: '事件（emit）', terms: ['事件（emit）'], meaning: '子组件发给父组件的消息', avoid: '回调、通知' },
  { label: '渲染函数（render）', terms: ['渲染函数（render）'], meaning: '返回虚拟节点的函数', avoid: '模板函数' },
  { label: '虚拟节点（VNode）', terms: ['虚拟节点（VNode）'], meaning: '描述一个 DOM 元素的 JavaScript 对象', avoid: '虚拟 DOM 节点' },
  { label: '挂载 / 卸载', terms: ['挂载', '卸载'], meaning: '把组件加入页面 / 从页面移除组件。“渲染”是另一个术语：运行渲染函数，得到虚拟节点', avoid: '销毁' },
  { label: '更新队列', terms: ['更新队列'], meaning: '等待执行的组件更新任务列表', avoid: '调度队列、任务池' },
  { label: '组合式函数（composable）', terms: ['组合式函数（composable）'], meaning: '以 use 开头、使用响应式 API 的函数', avoid: 'Hook、mixin' },
  { label: '编译宏', terms: ['编译宏'], meaning: '编译器在构建时替换的函数，例如 defineProps', avoid: '宏函数、全局函数' },
]
