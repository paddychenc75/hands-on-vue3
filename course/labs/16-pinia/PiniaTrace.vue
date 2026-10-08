<script setup lang="ts">
// 实验台：真实的 Pinia 怎样通知订阅者（$subscribe 和 $onAction）
// 这里用真实的 pinia，不是迷你实现。自己造一个 pinia，不影响站点。
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { createPinia, defineStore } from 'pinia'
import { domLog } from '../_shared'

const pinia = createPinia()
const useCounter = defineStore('trace-counter', () => {
  const count = ref(0)
  const label = ref('a')
  function inc() { count.value++ }
  async function save(ok: boolean) {
    await new Promise(resolve => setTimeout(resolve, 30))
    if (!ok) throw new Error('服务器拒绝了')
    count.value += 10
    return count.value
  }
  return { count, label, inc, save }
})
const store = useCounter(pinia)

const logRef = ref<HTMLElement | null>(null)
const L = (c: string, m: string) => domLog(logRef.value, c, m)
let stopSub: () => void = () => {}
let stopAct: () => void = () => {}

onMounted(() => {
  stopSub = store.$subscribe((mutation, state) => {
    L('rn', '$subscribe：type = ' + mutation.type + '，count = ' + state.count + '，label = ' + state.label)
  })
  stopAct = store.$onAction(({ name, args, after, onError }) => {
    L('tr', '$onAction：' + name + '(' + args.join(', ') + ') 开始')
    after(result => L('rn', '  after：' + name + ' 成功，返回 ' + result))
    onError(err => L('x', '  onError：' + name + ' 失败，' + (err as Error).message))
  })
})
onBeforeUnmount(() => { stopSub(); stopAct(); store.$dispose() })

function direct3() { store.count++; store.count++; store.label = 'b' }
function patchObj() { store.$patch({ count: store.count + 1, label: 'c' }) }
function patchFn() { store.$patch(s => { s.count++; s.label = 'd' }) }
function runInc() { store.inc() }
async function runSave(ok: boolean) {
  try { await store.save(ok) } catch { L('m', '调用方的 try/catch 也收到了这个错误') }
}
</script>

<template>
  <div class="row">
    <button class="b" @click="direct3">连续直接赋值 3 次</button>
    <button class="b" @click="patchObj">$patch(对象)</button>
    <button class="b" @click="patchFn">$patch(函数)</button>
    <button class="b" @click="runInc">调用 inc()</button>
    <button class="b" @click="runSave(true)">save(成功)</button>
    <button class="b" @click="runSave(false)">save(失败)</button>
  </div>
  <div class="cap">store.count = {{ store.count }}，store.label = {{ store.label }}</div>
  <div class="log" ref="logRef"></div>
</template>
