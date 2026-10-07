<script setup lang="ts">
// 实验台：代理的身份（旧版 #demo-identity）
// 表格在挂载时算一次，每一行都是真实运行的 Vue。
import { isReactive, isReadonly, isRef, reactive, readonly, ref, shallowReactive, toRaw } from 'vue'

const raw = { nested: { a: 1 }, list: [ref(1)] }
const p: any = reactive(raw)
const p2: any = reactive({ r: ref(5) })

const rows: [string, () => unknown, string][] = [
  ['reactive(raw) === p', () => reactive(raw) === p, '同一个原始对象只有一个代理'],
  ['reactive(p) === p', () => reactive(p) === p, '代理再次传入时，返回它自己'],
  ['toRaw(p) === raw', () => toRaw(p) === raw, 'toRaw 读取 __v_raw 标记'],
  ['isReactive(p.nested)', () => isReactive(p.nested), '读取时才代理嵌套对象'],
  ['p.nested === p.nested', () => p.nested === p.nested, '嵌套代理也被缓存'],
  ['raw.nested === p.nested', () => raw.nested === p.nested, '代理和原始对象不相等'],
  ['p2.r', () => p2.r, '对象属性中的 ref 自动解包'],
  ['isRef(p.list[0])', () => isRef(p.list[0]), '数组元素中的 ref 不解包'],
  ['readonly(p) === p', () => readonly(p) === p, 'readonly 创建另一个代理'],
  ['isReadonly(readonly(p))', () => isReadonly(readonly(p)), ''],
  ['isReactive(shallowReactive({ o: {} }).o)', () => isReactive(shallowReactive({ o: {} }).o), 'shallowReactive 不代理嵌套对象']
]

const results = rows.map(([expr, fn, why]) => {
  let v: unknown
  try { v = fn() } catch (e: any) { v = '错误：' + e.message }
  return { expr, value: String(v), good: v === true, why }
})

const code = 'const raw = { nested: { a: 1 }, list: [ref(1)] }\nconst p = reactive(raw)\nconst p2 = reactive({ r: ref(5) })'
</script>

<template>
  <div class="tbl-wrap" style="margin: 0">
    <table class="t">
      <thead><tr><th>表达式</th><th>结果</th><th>原因</th></tr></thead>
      <tbody>
        <tr v-for="r in results" :key="r.expr">
          <td><code>{{ r.expr }}</code></td>
          <td><span class="pill" :class="{ g: r.good }">{{ r.value }}</span></td>
          <td>{{ r.why }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <LabCode :code="code" style="margin: 0" />
</template>
