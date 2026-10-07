<script setup lang="ts">
// 实验台：真实的水合——客户端组件（旧版 createSSRApp 里的那个组件）
import { ref } from 'vue'

const title = '你好，水合'
const n = ref(0)
</script>

<template>
  <div><h3>{{ title }}</h3><button @click="n++">点击 {{ n }}</button></div>
</template>
