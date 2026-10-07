<script setup lang="ts">
// 只调用 store 的 action
import { ref } from 'vue'
import { useTaskStore } from './miniPinia'

const store = useTaskStore()
const draft = ref('')
function submit() {
  store.add(draft.value)
  draft.value = ''
}
</script>

<template>
  <div class="box">
    <span class="cap">&lt;TaskForm&gt; 只调用 action</span>
    <div class="row" style="flex-wrap: nowrap">
      <input class="t" v-model="draft" @keyup.enter="submit" placeholder="新任务" aria-label="新任务" style="flex: 1; min-width: 0" /><button class="b" @click="submit">添加</button>
    </div>
  </div>
</template>
