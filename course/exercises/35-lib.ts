import type { Exercise } from './types'
import { sub } from './types'

// 第 35 章的练习。两道都是纯函数实现：页面上显示结果，判题读取脚本 return 的函数，用固定用例逐个检验。
// 取脚本状态的办法和第 17 章的迷你编译器练习相同。
function libState(T: any): any {
  const host: any = T.$(':scope > div')
  return host && host._vnode && host._vnode.component && host._vnode.component.setupState
}

// ---------------------------------------------------------------------------
// 练习一：实现 exports 条件解析
// ---------------------------------------------------------------------------

const EXPORTS_FRONT = String.raw`
// ===== 已给出：本章 mini-ui 的 exports 和几个测试用的配置 =====
const miniUi = {
  '.': { types: './dist/index.d.ts', default: './dist/index.js' },
  './global': { types: './dist/global.d.ts' },
  './style.css': './dist/style.css'
}
`

const EXPORTS_SOL = String.raw`function resolveExports(exportsField, subpath, conditions) {
  let map = exportsField
  // 简写：字符串，或者键不以 . 开头的对象，都只描述主入口 "."
  if (typeof map === 'string' || Array.isArray(map) || !Object.keys(map).some(k => k.startsWith('.'))) {
    map = { '.': map }
  }
  if (!(subpath in map)) return null
  return resolveTarget(map[subpath], conditions)
}

function resolveTarget(target, conditions) {
  if (typeof target === 'string') return target
  if (target && typeof target === 'object') {
    // 按对象里键的书写顺序，第一个满足条件的键胜出
    for (const key of Object.keys(target)) {
      if (key === 'default' || conditions.includes(key)) {
        const found = resolveTarget(target[key], conditions)
        if (found !== null) return found
      }
    }
  }
  return null
}`

const EXPORTS_TODO = String.raw`// ===== TODO：解析 exports =====
// 返回命中的文件路径；这个子路径没有导出，或者没有任何条件命中时返回 null
function resolveExports(exportsField, subpath, conditions) {
  return null
}
`

export const libExports: Exercise = {
  title: '实现：按 exports 条件找到入口文件',
  ch: 35,
  task: '<p>使用者写 <code>import ... from "mini-ui"</code> 时，Node、Vite 和 TypeScript 都按 <code>package.json</code> 的 <code>exports</code> 找文件。你来写这个查找的核心 <code>resolveExports(exportsField, subpath, conditions)</code>：</p><ol><li><code>exports</code> 可以是字符串，也可以是键都不以 <code>.</code> 开头的对象（条件对象）。这两种简写都只描述主入口 <code>"."</code>。</li><li>对象的键以 <code>.</code> 开头时，它们是子路径（<code>"."</code>、<code>"./global"</code>）。子路径不存在，返回 <code>null</code>。</li><li>目标是对象时，它的键是条件。<b>按书写顺序</b>检查每个键：键是 <code>default</code>，或者在 <code>conditions</code> 数组里，就进入这个键的值。进入后什么也没找到（<code>null</code>），继续检查下一个键。</li><li>目标是字符串，直接返回；子路径的目标是 <code>null</code>（作者故意不导出），返回 <code>null</code>。</li></ol><p>只改 <code>resolveExports</code>（可以自己加辅助函数）。页面下方可以改 exports、子路径和条件，看它解析到哪个文件。TypeScript 的类型查找带 <code>types</code> 条件，运行时查找不带。</p>',
  tpl: '<textarea v-model="exportsText" rows="7" style="width: 100%; font-family: monospace" aria-label="exports 字段（JSON）"></textarea>\n<p>\n  子路径 <input v-model="subpath" aria-label="子路径" style="width: 8em">\n  条件（逗号分隔）<input v-model="condText" aria-label="条件" style="width: 14em">\n</p>\n<pre class="out">{{ result }}</pre>',
  js: EXPORTS_FRONT + EXPORTS_TODO + String.raw`
// ===== 已给出：把输入交给 resolveExports，显示结果 =====
const exportsText = ref(JSON.stringify(miniUi, null, 2))
const subpath = ref('.')
const condText = ref('types, import')
const result = computed(() => {
  try {
    const conds = condText.value.split(',').map(s => s.trim()).filter(Boolean)
    const r = resolveExports(JSON.parse(exportsText.value), subpath.value, conds)
    return r === null ? '没有解析到文件（ERR_PACKAGE_PATH_NOT_EXPORTED）' : r
  } catch (e) { return '输入有误：' + e.message }
})

return { exportsText, subpath, condText, result, resolveExports }`,
  hints: [
    '分两步。第一步把简写统一成对象：整个 exports 变成 { ".": 原来的值 }。第二步在这个对象里找子路径，把它的值交给另一个函数，由它处理字符串、对象（条件）。条件对象里的值还可能是条件对象，所以第二个函数要递归。',
    '处理条件对象：for (const key of Object.keys(target))。对象的键顺序就是书写顺序，所以遍历键，而不是遍历 conditions。键是 default，或者 conditions.includes(key)，就递归进入它的值。递归结果不是 null 就返回；是 null 就继续下一个键。',
    EXPORTS_SOL
  ],
  async check(T) {
    const S = libState(T)
    if (!S || typeof S.resolveExports !== 'function') { T.ok(false, '脚本需要 return 的对象里有 resolveExports 函数（不要删掉已给出的部分）'); return }
    const miniUi = { '.': { types: './dist/index.d.ts', default: './dist/index.js' }, './global': { types: './dist/global.d.ts' }, './style.css': './dist/style.css' }
    const nested = { '.': { node: { import: './n.mjs', require: './n.cjs' }, default: './d.js' } }
    const cases: [string, any, string, string[], string | null][] = [
      ['字符串简写', './dist/index.js', '.', ['import'], './dist/index.js'],
      ['条件对象简写，import', { import: './a.mjs', require: './a.cjs' }, '.', ['import'], './a.mjs'],
      ['条件对象简写，require', { import: './a.mjs', require: './a.cjs' }, '.', ['node', 'require'], './a.cjs'],
      ['mini-ui 的类型查找', miniUi, '.', ['types', 'import'], './dist/index.d.ts'],
      ['mini-ui 的运行时查找（没有 types 条件，落到 default）', miniUi, '.', ['import'], './dist/index.js'],
      ['mini-ui 的子路径', miniUi, './global', ['types'], './dist/global.d.ts'],
      ['mini-ui 的样式子路径', miniUi, './style.css', ['import'], './dist/style.css'],
      ['没有导出的子路径', miniUi, './components/MiniButton', ['import'], null],
      ['条件的先后顺序决定结果（import 写在 types 前面）', { '.': { import: './i.js', types: './t.d.ts' } }, '.', ['types', 'import'], './i.js'],
      ['没有任何条件命中，也没有 default', { '.': { import: './x.js' } }, '.', ['require'], null],
      ['嵌套条件', nested, '.', ['node', 'require'], './n.cjs'],
      ['嵌套条件命中 node 但里面没有匹配时，回到下一个键', nested, '.', ['node'], './d.js'],
      ['嵌套条件，浏览器环境落到 default', nested, '.', ['browser', 'import'], './d.js'],
      ['作者故意不导出', { '.': './a.js', './internal': null }, './internal', ['import'], null]
    ]
    for (const [name, field, sp, conds, want] of cases) {
      let got: any
      try { got = S.resolveExports(JSON.parse(JSON.stringify(field)), sp, conds) } catch (e: any) { T.ok(false, name + ' 运行出错：' + e.message); continue }
      T.ok(got === want, name + '：期望 ' + JSON.stringify(want) + '，实际 ' + JSON.stringify(got))
    }
  },
  wrong: []
}

libExports.solJs = sub(libExports.js, EXPORTS_TODO.trim(), EXPORTS_SOL)

libExports.wrong = [
  {
    js: sub(libExports.solJs, "for (const key of Object.keys(target)) {\n      if (key === 'default' || conditions.includes(key)) {", "for (const key of [...conditions, 'default']) {\n      if (key in target) {"),
    why: '遍历了 conditions，而不是对象的键。真实的规则是：按 exports 里键的书写顺序，第一个命中的条件胜出。把 import 写在 types 前面时，TypeScript 会先命中 import，拿到 .js 文件，这正是 publint 要求 types 排第一的原因。',
    expectFail: /import 写在 types 前面/
  },
  {
    js: sub(libExports.solJs, "key === 'default' || conditions.includes(key)", "conditions.includes(key)"),
    why: '漏了 default。default 是兜底条件，任何环境都命中它。mini-ui 的运行时查找没有 types 条件，要靠 default 找到 index.js。',
    expectFail: /default|运行时/
  },
  {
    js: sub(libExports.solJs, "typeof map === 'string' || Array.isArray(map) || !Object.keys(map).some(k => k.startsWith('.'))", "typeof map === 'string'"),
    why: '只处理了字符串简写。键都不以 . 开头的对象（{ import, require }）也是简写，它描述的是主入口。',
    expectFail: /条件对象简写/
  },
  {
    js: sub(libExports.solJs, "        if (found !== null) return found\n", "        return found\n"),
    why: '命中一个键后就直接返回，没有处理“进去之后什么也没找到”。{ node: { import, require }, default } 在只有 node 条件时，node 里面找不到，应该继续检查下一个键 default。',
    expectFail: /回到下一个键/
  }
]

libExports.faded = {
  js: sub(sub(sub(libExports.solJs,
    "if (typeof map === 'string' || Array.isArray(map) || !Object.keys(map).some(k => k.startsWith('.'))) {\n    map = { '.': map }\n  }", "if (/* ✏️ 什么情况下 exports 是简写 */ false) {\n    map = { '.': map }\n  }"),
    "for (const key of Object.keys(target)) {\n      if (key === 'default' || conditions.includes(key)) {", "for (const key of /* ✏️ 遍历哪个数组才能按书写顺序 */ conditions) {\n      if (/* ✏️ 什么键会被进入 */ false) {"),
    "        if (found !== null) return found\n", "        /* ✏️ 进去后找到了就返回，没找到就继续 */\n")
}

// ---------------------------------------------------------------------------
// 练习二：体检 package.json
// ---------------------------------------------------------------------------

const AUDIT_TODO = String.raw`// ===== TODO：体检 =====
// pkg 是 package.json 解析后的对象，files 是 npm pack 的文件清单（相对路径，没有 ./）
// 返回出问题的代码组成的数组（每个代码最多出现一次）
function audit(pkg, files) {
  const problems = []
  return problems
}
`

const AUDIT_SOL = String.raw`function audit(pkg, files) {
  const problems = new Set()
  const norm = p => p.replace(/^\.\//, '')
  const deps = pkg.dependencies || {}
  const peers = pkg.peerDependencies || {}
  if ('vue' in deps) problems.add('vue-in-dependencies')
  if (!('vue' in peers)) problems.add('vue-not-peer')

  // 找出一个值里所有的文件路径，同时检查每个条件对象里 types 是不是第一个
  const leaves = node => {
    if (typeof node === 'string') return [node]
    if (!node || typeof node !== 'object') return []
    const keys = Object.keys(node)
    if (keys.includes('types') && keys[0] !== 'types') problems.add('types-not-first')
    return keys.flatMap(k => leaves(node[k]))
  }
  const ex = pkg.exports
  const all = leaves(ex)
  if (all.some(t => !files.includes(norm(t)))) problems.add('exports-target-missing')

  // 主入口：键以 . 开头时取 "."，否则整个 exports 就是主入口
  const hasSubpaths = ex && typeof ex === 'object' && Object.keys(ex).some(k => k.startsWith('.'))
  const main = leaves(hasSubpaths ? ex['.'] : ex)
  const hasTypes = main.some(t => /\.d\.[cm]?ts$/.test(t)) ||
    main.some(t => files.includes(norm(t).replace(/\.[cm]?js$/, '.d.ts')))
  if (!hasTypes) problems.add('types-missing')

  if (!('sideEffects' in pkg)) problems.add('side-effects-undeclared')
  else if (pkg.sideEffects === false && files.some(f => f.endsWith('.css'))) problems.add('css-dropped')
  return [...problems]
}`

export const libAudit: Exercise = {
  title: '诊断：发布前体检 package.json',
  ch: 35,
  task: '<p>下面的 <code>audit(pkg, files)</code> 接收解析后的 <code>package.json</code> 和 <code>npm pack</code> 的文件清单（相对路径，没有 <code>./</code>），返回问题代码的数组。请实现这七条规则：</p><ol><li><code>vue-in-dependencies</code>：<code>dependencies</code> 里有 <code>vue</code>。</li><li><code>vue-not-peer</code>：<code>peerDependencies</code> 里没有 <code>vue</code>。</li><li><code>types-not-first</code>：<code>exports</code> 里任何一个条件对象含有 <code>types</code> 键，但它不是第一个键。</li><li><code>exports-target-missing</code>：<code>exports</code> 里任何一个文件路径不在 <code>files</code> 里（路径开头的 <code>./</code> 要去掉再比）。</li><li><code>types-missing</code>：主入口找不到类型。主入口是 <code>exports["."]</code>；如果 <code>exports</code> 的键都不以 <code>.</code> 开头，或者它是字符串，整个 <code>exports</code> 就是主入口。主入口里有 <code>.d.ts</code> 结尾的路径，或者某个 <code>.js</code> 路径旁边在 <code>files</code> 里有同名的 <code>.d.ts</code>，就不算缺。</li><li><code>side-effects-undeclared</code>：没有 <code>sideEffects</code> 字段。</li><li><code>css-dropped</code>：<code>sideEffects</code> 是 <code>false</code>，而 <code>files</code> 里有 <code>.css</code> 文件。已经有 <code>sideEffects</code> 字段时不报第 6 条。</li></ol><p>返回数组的顺序不限。页面下方可以改 <code>package.json</code> 和文件清单，看体检结果。</p>',
  tpl: '<textarea v-model="pkgText" rows="10" style="width: 100%; font-family: monospace" aria-label="package.json"></textarea>\n<textarea v-model="filesText" rows="4" style="width: 100%; font-family: monospace" aria-label="文件清单，每行一个"></textarea>\n<pre class="out">{{ result }}</pre>',
  js: String.raw`const sample = {
  name: 'mini-ui',
  version: '0.1.0',
  type: 'module',
  files: ['dist'],
  sideEffects: false,
  exports: {
    '.': { default: './dist/index.js', types: './dist/index.d.ts' },
    './style.css': './dist/style.css'
  },
  dependencies: { vue: '^3.5.0' }
}
const sampleFiles = ['package.json', 'dist/index.js', 'dist/index.d.ts', 'dist/style.css']

` + AUDIT_TODO + String.raw`
// ===== 已给出：把输入交给 audit，显示结果 =====
const pkgText = ref(JSON.stringify(sample, null, 2))
const filesText = ref(sampleFiles.join('\n'))
const result = computed(() => {
  try {
    const found = audit(JSON.parse(pkgText.value), filesText.value.split('\n').map(s => s.trim()).filter(Boolean))
    return found.length ? found.join('\n') : '没有发现问题'
  } catch (e) { return '输入有误：' + e.message }
})

return { pkgText, filesText, result, audit }`,
  hints: [
    '先写最简单的几条：看 dependencies、peerDependencies、sideEffects 这些字段在不在。再写需要遍历 exports 的几条。用 Set 保存问题代码，同一个问题出现几次也只记一次。',
    '写一个递归函数 leaves(node)：字符串就返回 [它]；对象就先检查 types 是不是第一个键，再把每个键的值交给自己，结果合并。用它拿到全部路径后，exports-target-missing 就是 some(t => !files.includes(去掉 ./ 的 t))。主入口的 types 要判断两种来源：路径本身是 .d.ts，或者同名的 .d.ts 在 files 里。',
    AUDIT_SOL
  ],
  async check(T) {
    const S = libState(T)
    if (!S || typeof S.audit !== 'function') { T.ok(false, '脚本需要 return 的对象里有 audit 函数（不要删掉已给出的部分）'); return }
    const good = {
      name: 'mini-ui', type: 'module', files: ['dist'], sideEffects: ['**/*.css'],
      exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' }, './style.css': './dist/style.css' },
      peerDependencies: { vue: '^3.5.0' }
    }
    const goodFiles = ['package.json', 'dist/index.js', 'dist/index.d.ts', 'dist/style.css']
    const mod = (f: (p: any) => void) => { const p = JSON.parse(JSON.stringify(good)); f(p); return p }
    const cases: [string, any, string[], string[]][] = [
      ['配置正确的包没有问题（sideEffects 列出了 css）', good, goodFiles, []],
      ['vue 只写在 dependencies', mod(p => { p.dependencies = { vue: '^3.5.0' }; delete p.peerDependencies }), goodFiles, ['vue-in-dependencies', 'vue-not-peer']],
      ['vue 在 dependencies 和 peerDependencies 里各写了一份', mod(p => { p.dependencies = { vue: '^3.5.0' } }), goodFiles, ['vue-in-dependencies']],
      ['types 排在 default 后面', mod(p => { p.exports['.'] = { default: './dist/index.js', types: './dist/index.d.ts' } }), goodFiles, ['types-not-first']],
      ['exports 指向不存在的文件', mod(p => { p.exports['.'].default = './dist/main.js' }), goodFiles, ['exports-target-missing']],
      ['sideEffects 是 false，而包里有 css', mod(p => { p.sideEffects = false }), goodFiles, ['css-dropped']],
      ['没有 sideEffects 字段', mod(p => { delete p.sideEffects }), goodFiles, ['side-effects-undeclared']],
      ['没有任何类型文件', mod(p => { p.exports['.'] = { default: './dist/index.js' } }), ['package.json', 'dist/index.js', 'dist/style.css'], ['types-missing']],
      ['exports 没写 types，但旁边有同名的 .d.ts', mod(p => { p.exports['.'] = { default: './dist/index.js' } }), goodFiles, []],
      ['exports 是字符串简写，旁边有 .d.ts', mod(p => { p.exports = './dist/index.js' }), goodFiles, []],
      ['exports 是条件对象简写，types 在最前面', mod(p => { p.exports = { types: './dist/index.d.ts', import: './dist/index.js' } }), goodFiles, []],
      ['几个问题同时出现', mod(p => { p.dependencies = { vue: '^3' }; p.sideEffects = false; p.exports['.'] = { default: './dist/index.js', types: './dist/index.d.ts' } }), goodFiles, ['vue-in-dependencies', 'types-not-first', 'css-dropped']]
    ]
    for (const [name, pkg, files, want] of cases) {
      let got: any
      try { got = S.audit(JSON.parse(JSON.stringify(pkg)), files.slice()) } catch (e: any) { T.ok(false, name + ' 运行出错：' + e.message); continue }
      const a = Array.isArray(got) ? [...new Set(got)].sort() : null
      const b = [...want].sort()
      T.ok(!!a && a.length === b.length && a.every((x, i) => x === b[i]), name + '：期望 ' + JSON.stringify(b) + '，实际 ' + JSON.stringify(a))
    }
  },
  wrong: []
}

libAudit.solJs = sub(libAudit.js, AUDIT_TODO.trim(), AUDIT_SOL)

libAudit.wrong = [
  {
    js: sub(libAudit.solJs, "pkg.sideEffects === false && files.some", "pkg.sideEffects !== true && files.some"),
    why: 'sideEffects 是列出 css 的数组时也报了错。["**/*.css"] 正是正确写法：它说明“只有 css 有副作用”，其余文件仍然可以被摇掉。只有 false 会让打包器把 css 导入也当成可以删掉的。',
    expectFail: /配置正确的包/
  },
  {
    js: sub(libAudit.solJs, "if ('vue' in deps) problems.add('vue-in-dependencies')", "if ('vue' in deps && !('vue' in peers)) problems.add('vue-in-dependencies')"),
    why: '只要 peerDependencies 里有 vue，就放过了 dependencies 里的 vue。两处都写，使用者安装时仍然会多装一份 vue，页面上出现两份 Vue。',
    expectFail: /各写了一份/
  },
  {
    js: sub(libAudit.solJs, "all.some(t => !files.includes(norm(t)))", "all.some(t => !files.includes(t))"),
    why: '没有去掉路径开头的 ./。exports 里写 ./dist/index.js，npm pack 的清单里是 dist/index.js，直接比较会把每个路径都当成缺失。',
    expectFail: /配置正确的包/
  },
  {
    js: sub(libAudit.solJs, "    return keys.flatMap(k => leaves(node[k]))", "    return keys.flatMap(k => typeof node[k] === 'string' ? [node[k]] : [])"),
    why: '没有递归，只看了对象第一层。条件对象可以嵌套，例如 exports["."] 本身就是一个条件对象；只看顶层，既查不到里面的 types 顺序，也收集不到里面的路径。',
    expectFail: /types 排在 default 后面|exports 指向不存在/
  },
  {
    js: sub(libAudit.solJs, "  const hasTypes = main.some(t => /\\.d\\.[cm]?ts$/.test(t)) ||\n    main.some(t => files.includes(norm(t).replace(/\\.[cm]?js$/, '.d.ts')))", "  const hasTypes = main.some(t => /\\.d\\.[cm]?ts$/.test(t))"),
    why: '只认 exports 里写出来的 types 条件。TypeScript 在找不到 types 条件时，会去看 js 文件旁边有没有同名的 .d.ts，所以这种包的类型是可用的，不该报缺失。要报的是“两种来源都没有”。',
    expectFail: /旁边有同名的 \.d\.ts|字符串简写/
  }
]

libAudit.faded = {
  js: sub(sub(sub(sub(libAudit.solJs,
    "if ('vue' in deps) problems.add('vue-in-dependencies')", "if (/* ✏️ vue 出现在哪个字段是问题 */ false) problems.add('vue-in-dependencies')"),
    "if (keys.includes('types') && keys[0] !== 'types') problems.add('types-not-first')", "/* ✏️ types 存在但不是第一个键时，记 types-not-first */"),
    "if (all.some(t => !files.includes(norm(t)))) problems.add('exports-target-missing')", "if (/* ✏️ 有路径不在 files 里（先去掉开头的 ./） */ false) problems.add('exports-target-missing')"),
    "else if (pkg.sideEffects === false && files.some(f => f.endsWith('.css')))", "else if (/* ✏️ sideEffects 是 false 并且有 css */ false)")
}
