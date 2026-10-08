<script setup lang="ts">
// 具名插槽实验台里的子组件 Card：header 有 v-if="$slots.header"，默认插槽有后备内容，footer 是作用域插槽
</script>

<template>
  <div class="box">
    <header v-if="$slots.header" style="font-weight: 700; border-bottom: 1px solid var(--line); margin-bottom: 6px"><slot name="header" /></header>
    <main><slot>没有内容（后备内容）</slot></main>
    <footer class="cap" style="margin-top: 6px"><slot name="footer" :year="2025">默认页脚</slot></footer>
  </div>
</template>
