<script setup lang="ts">
// 实验台：Suspense 和 defineAsyncComponent（旧版 #demo-bi-async）
import { defineAsyncComponent, onErrorCaptured, onMounted, ref, shallowRef } from 'vue'
import { clearLog, L, setLogEl, t0 } from './asyncLog'
import AsyncProfile from './AsyncProfile.vue'
import AsyncSpinner from './AsyncSpinner.vue'
import AsyncFailed from './AsyncFailed.vue'
import AsyncLoaded from './AsyncLoaded.vue'

const ms = ref(1000)
const fail = ref(false)
const logRef = ref<HTMLElement | null>(null)
const sKey = ref(0)
const showS = ref(false)
const asyncComp = shallowRef<any>(null)
const aKey = ref(0)

onMounted(() => setLogEl(logRef.value))
onErrorCaptured(e => {
  L('x', '父组件 onErrorCaptured 捕获：' + (e as Error).message + '（返回 false，停止传递）')
  return false
})

function mountSuspense() {
  t0.v = performance.now()
  clearLog()
  showS.value = true
  sKey.value++
}
const onPending = () => L('i', 'Suspense pending 事件')
const onFallback = () => L('tg', 'Suspense fallback 事件：显示 #fallback')
const onResolve = () => L('rn', 'Suspense resolve 事件：显示默认插槽')

function load() {
  t0.v = performance.now()
  clearLog()
  const wait = ms.value
  const bad = fail.value
  L('m', '调用 defineAsyncComponent（delay 200, timeout 2000）')
  asyncComp.value = defineAsyncComponent({
    loader: () => {
      L('tr', 'loader 开始，耗时 ' + wait + 'ms' + (bad ? '，结果为失败' : ''))
      return new Promise<any>((res, rej) =>
        setTimeout(() => {
          L(bad ? 'x' : 'rn', 'loader ' + (bad ? '失败' : '完成'))
          bad ? rej(new Error('网络错误')) : res(AsyncLoaded)
        }, wait)
      )
    },
    loadingComponent: AsyncSpinner,
    errorComponent: AsyncFailed,
    delay: 200,
    timeout: 2000
  })
  aKey.value++
}
</script>

<template>
  <div class="row">
    <label class="ctl">加载耗时 <input type="range" min="0" max="3000" step="100" v-model.number="ms" /> {{ ms }}ms</label>
    <label class="ctl"><input type="checkbox" v-model="fail" /> 让 loader 失败</label>
  </div>
  <div class="cols" style="margin-top: 8px">
    <div style="display: flex; flex-direction: column; gap: 8px">
      <div class="box">
        <span class="cap">1. Suspense + async setup</span>
        <button class="b pri" @click="mountSuspense">挂载 Suspense</button>
        <div style="margin-top: 6px" v-if="showS">
          <Suspense :key="sKey" @pending="onPending" @fallback="onFallback" @resolve="onResolve">
            <AsyncProfile :ms="ms" />
            <template #fallback><div class="box cap">#fallback：加载中…</div></template>
          </Suspense>
        </div>
      </div>
      <div class="box">
        <span class="cap">2. defineAsyncComponent（不在 Suspense 中）</span>
        <button class="b pri" @click="load">创建并加载</button>
        <div style="margin-top: 6px"><component v-if="asyncComp" :is="asyncComp" :key="aKey" /></div>
      </div>
    </div>
    <div class="log" ref="logRef" style="height: 240px"></div>
  </div>
  <div class="cap">试一试：耗时 100ms 时，加载组件不出现。耗时 3000ms 时，2000ms 超时后显示错误组件。loader 之后完成时，Vue 仍然显示真正的组件。</div>
</template>
