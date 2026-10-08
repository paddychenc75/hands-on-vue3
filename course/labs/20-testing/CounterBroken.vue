<script>
// 有缺陷的组件：点击没有任何效果
export default {
  data() { return { count: 0 } }
}
</script>

<template>
  <div class="counter">
    <p class="count-value">已点 {{ count }} 次</p>
    <button class="btn-add">加一</button>
  </div>
</template>
