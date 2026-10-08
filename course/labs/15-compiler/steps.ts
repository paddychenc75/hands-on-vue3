// 编译三步查看器的算法部分：把 @vue/compiler-dom 的 parse、transform、generate 分开调用，
// 并把前两步的中间产物整理成缩进的文字。编译器模块由调用方传入（浏览器里动态 import，Node 测试里直接 import）。
// 浏览器构建没有 Babel，不支持 prefixIdentifiers，所以只能用 function 模式（with 语句），
// 这一点和 baseCompile 里的限制一致；其余三步与 SFC 编译用的是同一套代码。

export interface Steps {
  ast: string
  transformed: string
  code: string
  /** 与 compile() 的结果是否一致（自检） */
  same: boolean
}

const FLAG_NAMES: Record<number, string> = { 1: 'TEXT', 2: 'CLASS', 4: 'STYLE', 8: 'PROPS', 16: 'FULL_PROPS', 32: 'NEED_HYDRATION', 64: 'STABLE_FRAGMENT', 128: 'KEYED_FRAGMENT', 256: 'UNKEYED_FRAGMENT', 512: 'NEED_PATCH', 1024: 'DYNAMIC_SLOTS', 2048: 'DEV_ROOT_FRAGMENT' }

export function decodeFlag(n: number): string {
  if (n === -1) return '-1 CACHED（静态，已缓存）'
  if (n === -2) return '-2 BAIL'
  const names = Object.keys(FLAG_NAMES).map(Number).filter(b => n & b).map(b => FLAG_NAMES[b])
  return n + (names.length ? ' ' + names.join(' | ') : '')
}

/** 开发构建里 patchFlag 是 "3 /* TEXT, CLASS *\/" 这样的字符串，取出开头的数字 */
function flagOf(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined
  const n = parseInt(String(v), 10)
  return Number.isNaN(n) ? undefined : n
}

export function dumpAst(d: any, node: any, depth = 0, out: string[] = []): string {
  const { NodeTypes, ElementTypes } = d
  const pad = '  '.repeat(depth)
  if (node.type === NodeTypes.ROOT) out.push(pad + 'ROOT')
  else if (node.type === NodeTypes.ELEMENT) {
    out.push(pad + `ELEMENT <${node.tag}>  tagType=${ElementTypes[node.tagType]}`)
    for (const p of node.props) {
      if (p.type === NodeTypes.ATTRIBUTE) out.push(pad + `  ATTRIBUTE ${p.name} = ${p.value ? JSON.stringify(p.value.content) : '（无值）'}`)
      else {
        const mods = p.modifiers.length ? `  modifiers=${p.modifiers.map((m: any) => (typeof m === 'string' ? m : m.content)).join('.')}` : ''
        out.push(pad + `  DIRECTIVE ${p.name}  arg=${p.arg ? p.arg.content : '-'}  exp=${p.exp ? JSON.stringify(p.exp.content) : '-'}${mods}`)
      }
    }
  } else if (node.type === NodeTypes.TEXT) out.push(pad + 'TEXT ' + JSON.stringify(node.content))
  else if (node.type === NodeTypes.INTERPOLATION) out.push(pad + 'INTERPOLATION exp=' + JSON.stringify(node.content.content))
  else if (node.type === NodeTypes.COMMENT) out.push(pad + 'COMMENT ' + JSON.stringify(node.content))
  else out.push(pad + NodeTypes[node.type])
  for (const c of node.children || []) dumpAst(d, c, depth + 1, out)
  return out.join('\n')
}

/** 转换之后的树：看每个节点的 codegenNode 带了什么优化信息 */
export function dumpTransformed(d: any, node: any, depth = 0, out: string[] = []): string {
  const { NodeTypes } = d
  const pad = '  '.repeat(depth)
  const info = (cg: any): string => {
    if (!cg) return ''
    let cached = false
    if (cg.type === NodeTypes.JS_CACHE_EXPRESSION) { cached = true; cg = cg.value }
    const bits: string[] = []
    if (cg.type === NodeTypes.VNODE_CALL) {
      const f = flagOf(cg.patchFlag)
      bits.push(f === undefined ? 'patchFlag=无' : 'patchFlag=' + decodeFlag(f))
      if (cg.dynamicProps) bits.push('dynamicProps=' + (typeof cg.dynamicProps === 'string' ? cg.dynamicProps : '（已提升）'))
      if (cg.isBlock) bits.push('Block')
    }
    if (cached) bits.push('放进 _cache')
    return bits.length ? '  → ' + bits.join('，') : ''
  }
  if (node.type === NodeTypes.ROOT) {
    const cg = node.codegenNode
    const kind = !cg ? '' : cg.type === NodeTypes.VNODE_CALL && flagOf(cg.patchFlag) === 64 ? '多个根节点 → Fragment Block' : '根 → ' + (cg.isBlock ? 'Block' : '非 Block')
    out.push(pad + 'ROOT  ' + kind)
  } else if (node.type === NodeTypes.ELEMENT) {
    out.push(pad + `ELEMENT <${node.tag}>` + info(node.codegenNode))
  } else if (node.type === NodeTypes.IF) {
    out.push(pad + 'IF  （v-if 链：每个分支是一个 Block，key 不同）')
  } else if (node.type === NodeTypes.IF_BRANCH) {
    out.push(pad + 'BRANCH')
  } else if (node.type === NodeTypes.FOR) {
    out.push(pad + 'FOR  （v-for：Fragment Block）')
  } else if (node.type === NodeTypes.TEXT_CALL) {
    out.push(pad + 'TEXT_CALL' + info(node.codegenNode))
  } else if (node.type === NodeTypes.COMPOUND_EXPRESSION) {
    out.push(pad + '文字（合并后的复合表达式）')
  } else if (node.type === NodeTypes.TEXT) out.push(pad + 'TEXT ' + JSON.stringify(node.content))
  else if (node.type === NodeTypes.INTERPOLATION) out.push(pad + 'INTERPOLATION')
  else if (node.type === NodeTypes.COMMENT) out.push(pad + 'COMMENT')
  else out.push(pad + NodeTypes[node.type])
  const kids = node.type === NodeTypes.IF ? node.branches : node.children
  // 元素的子节点如果全是文字，被合并成一个复合表达式，不再往下展开
  if (node.type === NodeTypes.ELEMENT && kids && kids.length === 1 && kids[0].type === NodeTypes.COMPOUND_EXPRESSION) return out.join('\n')
  for (const c of kids || []) if (typeof c !== 'string') dumpTransformed(d, c, depth + 1, out)
  return out.join('\n')
}

/** 分三步编译。d 是 @vue/compiler-dom 的模块。 */
export function runSteps(d: any, src: string): Steps {
  const opts = { mode: 'function', hoistStatic: true, onError: () => {}, onWarn: () => {} }
  const ast = d.parse(src, opts)
  const astText = dumpAst(d, ast)
  const [nodeTransforms, directiveTransforms] = d.getBaseTransformPreset(false)
  d.transform(ast, {
    ...opts,
    nodeTransforms: [...nodeTransforms, ...d.DOMNodeTransforms],
    directiveTransforms: { ...directiveTransforms, ...d.DOMDirectiveTransforms }
  })
  const transformed = dumpTransformed(d, ast)
  const code: string = d.generate(ast, opts).code
  let same = false
  try { same = code === d.compile(src, opts).code } catch { /* 忽略 */ }
  return { ast: astText, transformed, code, same }
}
