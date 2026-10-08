import type { Pinia } from 'pinia'
import type { NavigationFailure, RouteLocationRaw, Router } from 'vue-router'

/** 练习可以声明使用的真实库，见 AUTHORING.md 4.10 */
export type ExerciseLib = 'pinia' | 'vue-router'

/** 判题函数拿到的工具对象 T（和旧版运行器一致） */
export interface ExerciseHelper {
  /** 在输出区里 querySelector */
  $(selector: string): Element | null
  /** 在输出区里 querySelectorAll，返回数组 */
  $$(selector: string): Element[]
  /** 输出区的全部文字 */
  text(): string
  /** 找文字里包含 t 的第一个按钮 */
  btn(t: string): HTMLButtonElement | undefined
  /** 点击后等一次 nextTick */
  click(el: Element | null | undefined): Promise<void>
  /** 记一条检查结果：c 为真显示 ✓，否则 ✗ */
  ok(c: unknown, msg: string): void
  /** 等条件成立（每 10 毫秒查一次），最多等 ms 毫秒（默认 1000）。返回条件最终是否成立。用来等异步 action、懒加载路由组件 */
  waitFor(cond: () => unknown, ms?: number): Promise<boolean>
  /** 等一个宏任务加一次 nextTick：让已经排队的异步工作和渲染都做完 */
  settle(): Promise<void>
  /** 仅声明了 libs: ['pinia'] 的练习：这次运行的 pinia 实例（运行器已经 app.use 过）。用 store 时先 setActivePinia(T.pinia) 或在组件里用 */
  pinia?: Pinia
  /** 仅 pinia：按 id 取这次运行里已创建的 store（学习者的代码还没调用过 useXxxStore() 时是 undefined）。判题不用 import pinia，也不用知道 useXxxStore 叫什么 */
  store(id: string): any
  /** 仅声明了 libs: ['vue-router'] 且脚本 return 了 router 的练习：这次运行的 router（已经装好，初始导航已完成） */
  router?: Router
  /**
   * 仅 vue-router：router.push(to) 并等渲染完成。返回 NavigationFailure（被守卫取消、重复导航等）或 undefined。
   * 导航抛错（守卫抛错、懒加载失败）不会往外抛：错误显示在练习的错误区，这道检查记为失败。
   */
  push(to: RouteLocationRaw): Promise<NavigationFailure | void | undefined>
}

/** 一个来自真实误解的错误解法。判题必须判它不通过。 */
export interface WrongSolution {
  /** 省略时用 solTpl */
  tpl?: string
  /** 省略时用 solJs */
  js?: string
  why?: string
  /** 可选。一个正则：测试断言这个错解的失败信息里至少有一条匹配，确认它是因为预期的原因被拒 */
  expectFail?: RegExp
}

export interface Exercise {
  title: string
  /** 所在章号 */
  ch: number
  /** 题目说明（HTML 字符串） */
  task: string
  /** 初始模板 */
  tpl: string
  /** 初始脚本（setup 函数体，要 return 一个对象） */
  js: string
  /** 参考答案模板。省略时用 tpl */
  solTpl?: string
  /** 参考答案脚本。省略时用 js */
  solJs?: string
  /** 分级提示，由浅到深。最后一级通常是答案 */
  hints: string[]
  check(T: ExerciseHelper): Promise<void> | void
  wrong?: WrongSolution[]
  /** 为 true 时，进入页面不自动运行 */
  lazy?: boolean
  /** 半成品（先给一部分代码，删掉关键处让学习者补全）。check:content 要求每道练习都写；类型上保持可选，是因为引擎在没有它时要能跳过这一级（测试里会临时去掉） */
  faded?: { tpl?: string; js?: string }
  /**
   * 要用的真实库。声明后：按需加载这些库，把它们的 API 作为可直接使用的名字注入脚本（Pinia / VueRouter 是命名空间），
   * pinia 每次运行自动 app.use(createPinia())，vue-router 由脚本 createRouter（只能 createMemoryHistory）并 return { router } 交给运行器安装。
   * 不声明的练习不受影响（可以继续在脚本里写自己的迷你实现）。
   */
  libs?: ExerciseLib[]
}

/**
 * 在参考答案上做一处替换，造出 wrong 用的错误解法。
 * 替换串当作字面文字（不解释 $&、$' 等特殊模式）。
 * 找不到要替换的文字时不抛错（抛错会让整个练习模块加载失败，站点所有练习都不能用），
 * 而是返回一段以 WRONG_SUB_FAILED 开头的文字（当脚本或模板都只会运行失败），由测试报告出来。
 */
export function sub(src: string | undefined, from: string, to: string): string {
  if (!src || !src.includes(from)) return 'WRONG_SUB_FAILED：找不到 ' + from
  return src.replace(from, () => to)
}
