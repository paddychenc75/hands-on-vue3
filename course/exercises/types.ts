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
  /** 半成品（先给一部分代码，删掉关键处让学习者补全）。可选：没有时提示阶梯跳过这一级。内容以后再填 */
  faded?: { tpl?: string; js?: string }
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
