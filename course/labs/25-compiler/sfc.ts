// 单文件组件编译查看器的算法部分：按 plugin-vue 的顺序调用 @vue/compiler-sfc 的 parse、compileScript、compileTemplate、compileStyle。
// 编译器模块由调用方传入（浏览器里动态 import compiler-sfc.esm-browser.js，Node 测试里直接 import）。

export interface SfcOut {
  errors: string[]
  blocks: string
  script: string
  template: string
  styles: string
  scopeId: string
}

export function runSfc(sfc: any, src: string, opts: { inline: boolean }): SfcOut {
  const id = '7ba5bd90'
  const out: SfcOut = { errors: [], blocks: '', script: '', template: '', styles: '', scopeId: 'data-v-' + id }
  const { descriptor, errors } = sfc.parse(src, { filename: 'Demo.vue' })
  if (errors.length) { out.errors = errors.map((e: any) => e.message || String(e)); return out }

  // ① parse：只拆块，不编译
  const lines: string[] = []
  const d = descriptor
  if (d.template) lines.push(`<template>  ${d.template.content.trim().split('\n').length} 行，lang=${d.template.lang || 'html'}`)
  if (d.script) lines.push(`<script>  ${d.script.content.trim().split('\n').length} 行，lang=${d.script.lang || 'js'}`)
  if (d.scriptSetup) lines.push(`<script setup>  ${d.scriptSetup.content.trim().split('\n').length} 行，lang=${d.scriptSetup.lang || 'js'}`)
  d.styles.forEach((s: any, i: number) => lines.push(`<style>[${i}]  scoped=${!!s.scoped}，lang=${s.lang || 'css'}`))
  out.blocks = lines.join('\n')

  // ② compileScript：<script setup> 变成 setup()。没有 script 块时跳过
  let bindings: Record<string, string> | undefined
  const hasScript = !!(d.script || d.scriptSetup)
  if (hasScript) {
    try {
      const r = sfc.compileScript(d, { id, inlineTemplate: opts.inline, templateOptions: { scoped: d.styles.some((s: any) => s.scoped) } })
      out.script = r.content.trim()
      bindings = r.bindings
    } catch (e: any) { out.errors.push('compileScript：' + e.message) }
  }

  // ③ compileTemplate：不内联时模板单独编译，用 bindingMetadata 知道每个变量来自哪里
  if (d.template && !(opts.inline && d.scriptSetup)) {
    const t = sfc.compileTemplate({
      source: d.template.content, filename: 'Demo.vue', id,
      scoped: d.styles.some((s: any) => s.scoped),
      compilerOptions: { bindingMetadata: bindings }
    })
    if (t.errors.length) out.errors.push(...t.errors.map((e: any) => '编译模板：' + (e.message || e)))
    out.template = t.code.trim()
  } else if (d.template) {
    out.template = '（内联模式：模板已经编译进上面 setup() 返回的渲染函数里，没有单独的 render）'
  }

  // ④ compileStyle：scoped 样式给选择器加属性
  out.styles = d.styles.map((s: any, i: number) => {
    const r = sfc.compileStyle({ source: s.content, filename: 'Demo.vue', id: 'data-v-' + id, scoped: !!s.scoped })
    if (r.errors.length) out.errors.push(...r.errors.map((e: any) => '编译样式：' + (e.message || e)))
    return `/* <style>[${i}] ${s.scoped ? 'scoped' : '非 scoped'} */\n` + r.code.trim()
  }).join('\n\n')
  return out
}
