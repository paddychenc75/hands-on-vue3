<script setup lang="ts">
// 被卸载的子组件：在五个不同的位置创建侦听器，记录创建时的活动作用域
import { effectScope, getCurrentInstance, getCurrentScope, markRaw, onMounted, onScopeDispose, watch } from 'vue'

interface Row { name: string; where: string; fires: number; atUnmount: number | null }

const props = defineProps<{ store: any; addRow: (row: Row) => Row }>()
const store = props.store
const scope = getCurrentInstance()!.scope
store.scopeRef = markRaw(scope as any)

// 描述“此刻的活动作用域”是什么
function where(): string {
  const s: any = getCurrentScope()
  if (!s) return '没有活动作用域'
  if (s === scope) return '组件的 scope'
  if (s.parent === scope) return '组件 scope 的子作用域'
  return '游离的作用域（没有父作用域）'
}

function add(name: string): Row {
  return props.addRow({ name, where: where(), fires: 0, atUnmount: null })
}
function watchSrc(row: Row) {
  watch(() => store.src, () => { row.fires++ })
}

// A：setup 里
watchSrc(add('A  setup 里的 watch'))

// B：onMounted 里（钩子运行时 Vue 把组件的 scope 设为活动作用域）
onMounted(() => { watchSrc(add('B  onMounted 里的 watch')) })

// C：setTimeout 回调里（这时没有活动作用域）
setTimeout(() => { watchSrc(add('C  setTimeout 回调里的 watch')) }, 300)

// D：setup 里创建的 effectScope()，是组件 scope 的子作用域
const sd = effectScope()
sd.run(() => watchSrc(add('D  effectScope() 里的 watch')))

// E：effectScope(true)，游离的
const se = effectScope(true)
se.run(() => watchSrc(add('E  effectScope(true) 里的 watch')))
if (store.stopDetached) onScopeDispose(() => se.stop())
</script>

<template>
  <span class="cap">（子组件已挂载）</span>
</template>
