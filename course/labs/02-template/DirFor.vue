<script setup lang="ts">
// 指令演练场：v-for 标签页
import { ref } from 'vue'

let id = 4
const pool = ['葡萄', '西瓜', '芒果', '草莓', '桃子', '梨']
const fruits = ref([
  { id: 1, name: '苹果' },
  { id: 2, name: '香蕉' },
  { id: 3, name: '橙子' }
])
const add = () => {
  fruits.value.push({ id: id++, name: pool[(id - 5) % pool.length] })
}
const remove = (i: number) => {
  fruits.value = fruits.value.filter(f => f.id !== i)
}
const shuffle = () => {
  fruits.value = fruits.value.slice().sort(() => Math.random() - 0.5)
}
</script>

<template>
  <div class="row">
    <button class="b" @click="add">添加</button>
    <button class="b" @click="shuffle">打乱</button>
  </div>
  <ul style="margin: 8px 0 0">
    <li v-for="(f, i) in fruits" :key="f.id">
      {{ i }}. {{ f.name }} <span class="cap">key={{ f.id }}</span>
      <button class="b" style="padding: 0 8px" @click="remove(f.id)" :aria-label="'删除' + f.name">×</button>
    </li>
  </ul>
  <div v-if="!fruits.length" class="cap">列表为空。点击“添加”。</div>
</template>
