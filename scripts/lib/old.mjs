// 读旧课程 vue3-course.html：切出各章 <section>、脚本部分
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, elements, decodeEntities } from './html.mjs'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const OLD_HTML = path.join(ROOT, 'vue3-course.html')
let _lines
export function oldLines() { return _lines ||= fs.readFileSync(OLD_HTML, 'utf8').split('\n') }

/** 旧页面里每个 <section class="ch"> 的行范围（1 起，含首尾） */
export function sectionRanges() {
  const L = oldLines()
  const starts = []
  L.forEach((l, i) => { const m = /^<section class="ch"[^>]*\bid="([^"]+)"/.exec(l); if (m) starts.push([i, m[1]]) })
  return starts.map(([s, id]) => {
    let e = s
    while (e < L.length && !/^<\/section>/.test(L[e])) e++
    return { id, start: s + 1, end: e + 1 }
  })
}

/** 章序（旧 UI 的编号）：除 data-noprog 外按出现顺序编号 */
export function sectionMeta() {
  const L = oldLines()
  let n = 0
  return sectionRanges().map(r => {
    const tag = L[r.start - 1]
    const attr = k => { const m = new RegExp('\\b' + k + '="([^"]*)"').exec(tag); return m ? decodeEntities(m[1]) : '' }
    const noprog = /data-noprog/.test(tag)
    return { ...r, stage: +attr('data-stage'), title: attr('data-title'), desc: attr('data-desc'), noprog, chapter: noprog ? null : ++n }
  })
}

export function chapterFile(meta) { return meta.chapter ? String(meta.chapter).padStart(2, '0') + '-' + meta.id : meta.id }

/** 解析某章 <section>，返回 {meta, el, src, warns} */
export function loadSection(id) {
  const metas = sectionMeta()
  const meta = metas.find(m => m.id === id)
  if (!meta) throw new Error('旧 HTML 里没有这个 section id：' + id + '。可用：' + metas.map(m => m.id).join(' '))
  const src = oldLines().slice(meta.start - 1, meta.end).join('\n')
  const root = parse(src, meta.start)
  return { meta, el: elements(root)[0], src, warns: root.warns }
}

/** 旧页面脚本部分（8315 行之后）的文本 */
export function scriptText() {
  const L = oldLines()
  const i = L.findIndex(l => /^<script>/.test(l) || /^<script\b/.test(l) && !/src=/.test(l) && !/type=/.test(l))
  return { text: L.slice(i).join('\n'), startLine: i + 1 }
}

/** 旧脚本里手写的大型交互（行号范围是整段代码），按所属 section id 索引 */
export const BIG = {
  reactivity: { name: '手写响应式实验台', from: 8992, to: 9056 },
  diff: { name: 'diff 模拟器', from: 9059, to: 9181 },
  ts: { name: '宏编译对照（编译前和编译后）', from: 9184, to: 9213 },
  compiler: { name: '在线编译 + patchFlag 查看', from: 9749, to: 9778 },
  quiz: { name: '60 题测验（题库 + 渲染 + 复习模式）', from: 9216, to: 9440 },
  project: { name: '任务看板（五步 stepper）', from: 14697, to: 14762 }
}
