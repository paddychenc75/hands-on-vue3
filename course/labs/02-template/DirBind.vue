<script setup lang="ts">
// 指令演练场：v-bind 标签页
import { ref } from 'vue'

const color = ref('#23845a')
const size = ref(16)
const off = ref(false)
</script>

<template>
  <div class="row">
    <label class="ctl">color <input type="color" v-model="color" /></label>
    <label class="ctl">size <input type="range" min="12" max="40" v-model.number="size" /> {{ size }}</label>
    <label class="ctl"><input type="checkbox" v-model="off" /> disabled</label>
  </div>
  <div style="margin-top: 10px">
    <button class="b" :style="{ color, fontSize: size + 'px', fontWeight: size > 30 ? 700 : 400 }" :disabled="off">我是按钮</button>
  </div>
  <div class="cap" style="margin-top: 6px">class 中 big 是否生效：{{ size > 30 }}</div>
</template>
