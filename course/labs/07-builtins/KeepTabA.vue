<script setup lang="ts">
// KeepAlive 实验台的标签页组件 TabA（组件名决定 include 能不能匹配到它）
import { ref } from 'vue'
import { useTabHooks } from './keepState'

defineOptions({ name: 'TabA' })
const text = ref('')
const count = ref(0)
useTabHooks('TabA')
</script>

<template>
  <div class="box">
    <span class="cap">组件 TabA</span>
    <div class="row">
      <input class="t" v-model="text" placeholder="输入一些文字" aria-label="TabA 输入框" style="width: 130px" />
      <button class="b" @click="count++">count = {{ count }}</button>
    </div>
  </div>
</template>
