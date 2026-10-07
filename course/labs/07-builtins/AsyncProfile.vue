<script setup lang="ts">
// 实验台：Suspense 里的异步组件 Profile。顶层 await 会让 setup 变成 async setup。
import { L } from './asyncLog'

const props = defineProps<{ ms: number }>()
const sleep = (n: number) => new Promise(r => setTimeout(r, n))

L('tr', 'Profile：async setup 开始，await ' + props.ms + 'ms')
await sleep(props.ms)
L('rn', 'Profile：await 结束，setup 返回')
const name = 'Alice'
</script>

<template>
  <div class="box"><b>用户：{{ name }}</b> <span class="cap">（async setup 完成后渲染）</span></div>
</template>
