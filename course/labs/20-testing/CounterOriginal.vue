<script>
// 被测试的组件：原版
export default {
  data() { return { count: 0 } }
}
</script>

<template>
  <div class="counter">
    <p class="count-value">已点 {{ count }} 次</p>
    <button class="btn-add" @click="count++">加一</button>
  </div>
</template>
