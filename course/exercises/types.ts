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
}

/** 一个来自真实误解的错误解法。判题必须判它不通过。 */
export interface WrongSolution {
  /** 省略时用 solTpl */
  tpl?: string
  /** 省略时用 solJs */
  js?: string
  why?: string
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
}
