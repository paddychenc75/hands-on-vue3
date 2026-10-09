<script setup lang="ts">
// 顶栏站名左边的标志：本课程原创的图形。一笔画成的“对勾形 V”：短左臂、长右臂，V 就是对勾（练习通过）。
// 内联 SVG，没有外部请求；装饰用（站名文字已是链接的可读内容），所以 aria-hidden。渐变用主题的品牌色，跟随浅色和深色（样式在 style.css 的 .site-logo）。
// 其余候选（拼积木 V、对勾 V、台阶 V）在 design/logo/，换用方法见 design/logo/README.md。
</script>

<template>
  <svg class="site-logo" viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="site-logo-g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" class="lg-s1" /><stop offset="1" class="lg-s2" /></linearGradient>
    </defs>
    <path d="M7.5 13.5l7 11.5L25 7" fill="none" stroke="url(#site-logo-g)" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
