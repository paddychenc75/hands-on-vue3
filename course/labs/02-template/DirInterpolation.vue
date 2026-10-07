<script setup lang="ts">
// 指令演练场：{{ }} 标签页
import { ref } from 'vue'

const name = ref('vue')
const price = 1999
const fmt = (n: number) => '¥' + n.toLocaleString()
</script>

<template>
  <input class="t" v-model="name" aria-label="name" />
  <p style="margin: 6px 0 0">原样：{{ name }}</p>
  <p style="margin: 0">大写：{{ name.toUpperCase() }}</p>
  <p style="margin: 0">长度：{{ name.length > 5 ? '长名字' : '短名字' }}</p>
  <p style="margin: 0">格式化：{{ fmt(price) }}</p>
</template>
