<script setup lang="ts">
// 实验台：key 用 index 还是 id。两个列表的输入框是不受控的（没有 v-model），
// 文字只存在于 DOM 里，所以能看出 Vue 复用了哪个元素。
import { ref } from 'vue'

let nextId = 4
const items = ref([
  { id: 1, name: '任务 A' },
  { id: 2, name: '任务 B' },
  { id: 3, name: '任务 C' }
])

function insertFirst() {
  items.value.unshift({ id: nextId, name: '新任务 ' + nextId })
  nextId++
}
function reset() {
  nextId = 4
  items.value = [
    { id: 1, name: '任务 A' },
    { id: 2, name: '任务 B' },
    { id: 3, name: '任务 C' }
  ]
  version.value++
}
const version = ref(0)
</script>

<template>
  <div class="row">
    <button class="b pri" @click="insertFirst">在开头插入一项</button>
    <button class="b" @click="reset">重置</button>
  </div>
  <p class="cap" style="margin: 6px 0">先在两边“任务 A”那一行的输入框里各输入一些文字，再点“在开头插入一项”。</p>
  <div class="cols" :key="version">
    <div class="box" data-key="index">
      <span class="cap">:key="index"</span>
      <div v-for="(item, index) in items" :key="index" class="vrow" style="gap: 8px">
        <span>{{ item.name }}</span>
        <input class="t" placeholder="输入备注" style="width: 8em" />
      </div>
    </div>
    <div class="box" data-key="id">
      <span class="cap">:key="item.id"</span>
      <div v-for="item in items" :key="item.id" class="vrow" style="gap: 8px">
        <span>{{ item.name }}</span>
        <input class="t" placeholder="输入备注" style="width: 8em" />
      </div>
    </div>
  </div>
</template>
