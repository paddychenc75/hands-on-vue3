<script setup lang="ts">
// 占位：首页大标题区右侧的演进动画还没做好，先渲染一个带品牌渐变底的圆角空框。
// 动画组件完成后会覆盖这个文件（外层容器的宽高比在 CourseHome 的 .hero-visual 里固定）。
</script>

<template>
  <div class="evolution-placeholder" aria-hidden="true"></div>
</template>

<style scoped>
.evolution-placeholder { width: 100%; height: 100%; border-radius: var(--r-lg, 18px); background: linear-gradient(135deg, var(--brand-soft, #dcf2e7), var(--teal-soft, #d6f0f2)); border: 1px solid var(--border, #d9e3de); }
</style>
