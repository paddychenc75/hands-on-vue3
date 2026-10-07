<script setup lang="ts">
// 指令演练场：v-if / v-show 标签页
// 读出上方区域真实的 HTML，让人看见 v-if 留下注释、v-show 只改 display。
import { onMounted, ref, watch } from 'vue'

const ok = ref(true)
const box = ref<HTMLElement | null>(null)
const dom = ref('')
const read = () => {
  if (box.value) dom.value = box.value.innerHTML.replace(/ data-v-[^=]+=""/g, '')
}
onMounted(read)
watch(ok, read, { flush: 'post' })
</script>

<template>
  <label class="ctl"><input type="checkbox" v-model="ok" /> ok = {{ ok }}</label>
  <div ref="box" style="margin-top: 6px">
    <p v-if="ok" style="margin: 0">我是 v-if</p>
    <p v-show="ok" style="margin: 0">我是 v-show</p>
  </div>
  <div class="cap" style="margin-top: 6px">上面区域的当前 HTML：</div>
  <div class="domview">{{ dom }}</div>
</template>
