<script setup lang="ts">
// 指令演练场：v-on 标签页
import { ref } from 'vue'

const count = ref(0)
const msg = ref('')
const say = (e: Event) => {
  msg.value = '按回车提交：' + (e.target as HTMLInputElement).value
}
const sub = () => {
  msg.value = '表单已提交。页面没有刷新。'
}
</script>

<template>
  <div class="row">
    <button class="b" @click="count++">普通 +1</button>
    <button class="b" @click.once="count += 10">.once +10</button>
    <b>count = {{ count }}</b>
  </div>
  <div class="row" style="margin-top: 8px">
    <input class="t" placeholder="输入后按回车" @keyup.enter="say" aria-label="回车输入" />
    <form @submit.prevent="sub" style="display: inline"><button class="b">提交表单</button></form>
  </div>
  <div class="cap" style="margin-top: 6px">{{ msg || '（没有操作）' }}</div>
</template>
