// 迷你 Vue 的入口：从分段的源码字符串拼出练习和测试用的脚本。纯字符串处理，不依赖 Vite 或 Node，
// 所以 course/exercises/*.ts 既能在浏览器里（Vite）加载，也能被 scripts/ 和 tests/site/ 里的 esbuild 读到。
// 用法见 course/mini/README.md。
import reactivity from './src/01-reactivity'
import scheduler from './src/02-scheduler'
import watch from './src/03-watch'
import vnode from './src/04-vnode'
import host from './src/05-host'
import element from './src/06-element'
import component from './src/07-component'
import componentRender from './src/08-component-render'
import stringHost from './src/09-string-host'
import hydrate from './src/10-hydrate'

/** 全部零件的源码，按在课程里出现的顺序。键就是 README 零件清单里的「零件名」 */
export const PARTS = { reactivity, scheduler, watch, vnode, host, element, component, componentRender, stringHost, hydrate }
export type PartName = keyof typeof PARTS

/** DOM 形态的拼接顺序（第 24–31 章）。element 和 componentRender 是「渲染器本体」，在 DOM 形态里直接写在脚本顶层 */
export const DOM_ORDER: PartName[] = ['reactivity', 'scheduler', 'watch', 'vnode', 'host', 'element', 'component', 'componentRender']

/** 渲染器本体：第 32 章整体放进 createRenderer(options) */
export const RENDERER_BODY: PartName[] = ['element', 'componentRender']

/**
 * 练习环境（Exercise.vue 的 API）注入的名字。脚本顶层如果用 const / let / class 声明同名变量会是语法错误，
 * 只能用 function 声明（function 声明可以覆盖同名参数）。tests/unit/mini-source.test.ts 会检查零件源码遵守这条，
 * 并且和 Exercise.vue 里的 API 保持一致（那里改了名单，这里要同步）。
 */
export const EXERCISE_API_NAMES = [
  'ref', 'reactive', 'computed', 'watch', 'watchEffect', 'toRefs', 'toRef', 'shallowRef', 'nextTick',
  'onMounted', 'onUnmounted', 'provide', 'inject', 'onBeforeMount', 'onBeforeUnmount', 'onBeforeUpdate', 'onUpdated',
  'onActivated', 'onDeactivated', 'useTemplateRef', 'onWatcherCleanup', 'watchPostEffect', 'readonly', 'shallowReactive',
  'toRaw', 'markRaw', 'triggerRef', 'unref', 'isRef', 'toValue', 'customRef', 'useId', 'effectScope', 'onScopeDispose', 'Vue'
]

/** 从第一个零件拼到 upTo（含），DOM 形态。带 //#region 标记，交给 build / answer 处理 */
export function domSource(upTo: PartName = 'componentRender'): string {
  const end = DOM_ORDER.indexOf(upTo)
  if (end < 0) throw new Error('domSource：' + upTo + ' 不在 DOM 形态的零件里')
  return DOM_ORDER.slice(0, end + 1).map(n => PARTS[n]).join('\n')
}

/** 把渲染器本体包进 createRenderer(options)（第 32 章）。options 的键就是 nodeOps 的函数加 patchProp */
export function wrapCreateRenderer(body: string): string {
  const indented = body.split('\n').map(l => (l ? '  ' + l : l)).join('\n')
  return [
    '// ===== 零件 7a：createRenderer(options)（第 32 章） =====',
    '// 渲染器本体（零件 5b、6b）原样放进一个函数，宿主操作从 options 里取。nodeOps 的 DOM 版和字符串版都是它的 options。',
    'function createRenderer(options) {',
    '  const { insert: hostInsert, remove: hostRemove, createElement: hostCreateElement, createText: hostCreateText,',
    '    setText: hostSetText, setElementText: hostSetElementText, parentNode: hostParentNode, nextSibling: hostNextSibling,',
    '    patchProp: hostPatchProp } = options',
    indented.replace(/\s+$/, ''),
    '  return { render, createApp }',
    '}',
    ''
  ].join('\n')
}

/**
 * createRenderer 形态（第 32 章）：零件 1–4、6a，加上包好的渲染器，加上 DOM 版的 options（零件 5a），可选再加字符串版 options。
 * 脚本里可以直接写 createRenderer({ ...nodeOps, patchProp }) 或 createRenderer({ ...stringHost, patchProp: stringHost.patchProp })。
 */
export function rendererSource(opts: { stringHost?: boolean } = {}): string {
  const top: PartName[] = ['reactivity', 'scheduler', 'watch', 'vnode', 'component', 'host']
  const body = RENDERER_BODY.map(n => PARTS[n]).join('\n')
  const out = [...top.map(n => PARTS[n]), wrapCreateRenderer(body)]
  if (opts.stringHost !== false) out.push(PARTS.stringHost)
  return out.join('\n')
}

// ---------------------------------------------------------------------------
// 区域标记：源码里用 //#region 名字 … //#endregion 圈出「学习者可能要写的一段」，区域可以嵌套。
// 下面几个函数都是纯字符串处理。区域不存在时抛错（拼写错了要马上发现，而不是悄悄生成一道没有挖空的题）。
// ---------------------------------------------------------------------------

const REGION_LINE = /^\s*\/\/#(region|endregion)\b.*$/

function findRegion(lines: string[], name: string): [number, number] {
  const start = lines.findIndex(l => new RegExp('^\\s*//#region ' + name + '\\s*$').test(l))
  if (start < 0) throw new Error('找不到区域 ' + name)
  let depth = 0
  for (let i = start; i < lines.length; i++) {
    if (/^\s*\/\/#region\b/.test(lines[i])) depth++
    else if (/^\s*\/\/#endregion\b/.test(lines[i]) && --depth === 0) return [start, i]
  }
  throw new Error('区域 ' + name + ' 没有结束标记')
}

/** 去掉所有区域标记行，得到学习者看到的完整答案 */
export function answer(code: string): string {
  return code.split('\n').filter(l => !REGION_LINE.test(l)).join('\n')
}

/** 把区域 name 整段换成 replacement（缩进自动加上区域的缩进）。其他区域标记保留，最后用 answer() 清掉 */
export function blank(code: string, name: string, replacement: string): string {
  const lines = code.split('\n')
  const [s, e] = findRegion(lines, name)
  const indent = /^\s*/.exec(lines[s])![0]
  const rep = replacement.replace(/\n$/, '').split('\n').map(l => (l ? indent + l : l))
  lines.splice(s, e - s + 1, ...rep)
  return lines.join('\n')
}

/** 一步生成起始代码或半成品：挖空 blanks 里的每个区域，再清掉全部标记 */
export function build(code: string, blanks: Record<string, string> = {}): string {
  let out = code
  for (const [name, rep] of Object.entries(blanks)) out = blank(out, name, rep)
  return answer(out)
}

/** 在区域 name 前面加一行注释（例如「这是你在第 28 章写的」） */
export function note(code: string, name: string, text: string): string {
  const lines = code.split('\n')
  const [s] = findRegion(lines, name)
  const indent = /^\s*/.exec(lines[s])![0]
  lines.splice(s, 0, indent + '// ' + text)
  return lines.join('\n')
}

/** 取出区域 name 里面的代码（不含标记行），用来在正文里引用或做提示的最后一级答案 */
export function region(code: string, name: string): string {
  const lines = code.split('\n')
  const [s, e] = findRegion(lines, name)
  return answer(lines.slice(s, e + 1).join('\n'))
}

/**
 * 把一大段「已经写好、不用改」的代码标成可折叠的只读块（练习编辑器的折叠能力见 README「需要的共享改动」）。
 * 编辑器还不支持时，这两行就是普通注释，不影响运行；判题和「代码是否真的改了」的比较都会忽略注释。
 */
export function fold(title: string, code: string): string {
  return '//#fold ' + title + '\n' + code.replace(/\n$/, '') + '\n//#endfold\n'
}

/** 统计：非空行、去掉整行注释和区域标记后的代码行 */
export function countLines(code: string): { total: number; code: number } {
  const lines = answer(code).split('\n').filter(l => l.trim())
  return { total: lines.length, code: lines.filter(l => !/^\s*\/\//.test(l)).length }
}
