// 在「和练习环境一样」的条件下运行迷你 Vue 的源码：new Function，没有模块系统，脚本顶层没有 import / export。
// 给单元测试和实验台（单步回放）用；练习文件不需要它（练习环境自己运行代码）。
// 用法见 course/mini/README.md 的「实验台怎么用」。

export interface TraceEvent {
  /** 函数名，例如 'patch'、'queueJob' */
  fn: string
  /** 调用时的参数（原样引用，不拷贝） */
  args: unknown[]
  /** 调用嵌套深度，最外层是 0 */
  depth: number
}

export interface RunOptions {
  /** 额外的全局名字，作为 new Function 的参数传进去。常用：document、Promise（换成手动微任务）、console */
  globals?: Record<string, unknown>
  /** 模拟练习环境：这些名字也作为参数传入，用来验证脚本里的 function 声明能覆盖它们（const 声明会报语法错误） */
  injected?: Record<string, unknown>
  /** 要导出的名字；省略时导出脚本顶层所有 function / const / class 声明的名字，加上 lets 里列的 let 变量 */
  expose?: string[]
  /** 额外导出的 let 变量（每次读取拿到最新值），例如 ['currentInstance', 'activeEffect'] */
  lets?: string[]
  /** 要追踪的函数名：每次调用前触发 trace。原理：运行后把同名的 function 声明重新赋值成一层包装，脚本内部的相互调用也会经过它 */
  traced?: string[]
  trace?: (e: TraceEvent) => void
  /** 被追踪的函数返回之后触发，带返回值（例如拿到 createComponentInstance 创建的实例）。抛错时不触发 */
  traceReturn?: (e: TraceEvent, result: unknown) => void
}

/** 脚本顶层 function / const / class 声明的名字（零件源码保证顶层声明都写在行首） */
export function topLevelNames(code: string): string[] {
  const names = new Set<string>()
  for (const m of code.matchAll(/^(?:function|const|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1])
  return [...names]
}

export function runMini<T = Record<string, any>>(code: string, opts: RunOptions = {}): T {
  const globals = opts.globals ?? {}
  const injected = opts.injected ?? {}
  const names = opts.expose ?? topLevelNames(code)
  const props = names.map(n => n).concat((opts.lets ?? []).map(n => n))
  const getters = [...new Set(props)].map(n => 'get ' + n + '() { return ' + n + ' }').join(', ')
  const wrap = (opts.traced ?? [])
    .map(n => n + ' = __wrap(' + JSON.stringify(n) + ', ' + n + ')')
    .join('\n')
  const body = code + '\n' + wrap + '\nreturn { ' + getters + ' }'

  let depth = 0
  const __wrap = (fn: string, orig: (...a: any[]) => any) =>
    function (this: unknown, ...args: unknown[]) {
      opts.trace?.({ fn, args, depth })
      depth++
      try {
        const result = orig.apply(this, args)
        opts.traceReturn?.({ fn, args, depth: depth - 1 }, result)
        return result
      } finally { depth-- }
    }

  const paramNames = [...Object.keys(globals), ...Object.keys(injected), '__wrap']
  const fn = new Function(...paramNames, body)
  return fn(...Object.values(globals), ...Object.values(injected), __wrap) as T
}
