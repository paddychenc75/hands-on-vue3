<script setup lang="ts">
// Bomb：能在事件、渲染、侦听器里抛错的组件
import { ref, watch } from 'vue'

const mark = (msg: string) => { const e: any = new Error(msg); e.__lab = true; return e }
const broken = ref(false)
const n = ref(0)
watch(n, () => { throw mark('侦听器回调失败') })
function status() { if (broken.value) throw mark('渲染失败'); return '正常' }
function onClick() { throw mark('点击处理失败') }
</script>

<template>
  <div class="box"><span class="cap">Bomb 组件：状态 {{ status() }}</span>
    <div class="row"><button class="b" @click="onClick">事件中抛错</button><button class="b" @click="broken = true">渲染时抛错</button><button class="b" @click="n++">侦听器中抛错</button></div></div>
</template>
