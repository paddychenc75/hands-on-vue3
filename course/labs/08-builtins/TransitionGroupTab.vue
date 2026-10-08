<script setup lang="ts">
// TransitionGroup 标签页：打乱、随机插入、点击删除
import { ref } from 'vue'

let next = 7
const items = ref([1, 2, 3, 4, 5, 6])

function shuffle() {
  const a = items.value.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  items.value = a
}
function add() {
  const a = items.value.slice()
  a.splice(Math.floor(Math.random() * (a.length + 1)), 0, next++)
  items.value = a
}
function remove(n: number) {
  items.value = items.value.filter(x => x !== n)
}
</script>

<template>
  <div class="row"><button class="b pri" @click="shuffle">打乱</button><button class="b" @click="add">随机位置插入</button></div>
  <TransitionGroup name="bi-list" tag="ul" class="bi-list">
    <li v-for="n in items" :key="n" @click="remove(n)" :title="'点击删除 ' + n" style="cursor: pointer">{{ n }}</li>
  </TransitionGroup>
  <div class="cap" style="margin-top: 8px">点击数字删除它。其他元素通过 bi-list-move 类平滑移动到新位置。</div>
</template>
