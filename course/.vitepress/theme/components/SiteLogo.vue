<script setup lang="ts">
// 顶栏站名左边的标志：本课程原创的图形。V 形由左右两块面片拼成，顶上一块菱形正落进缺口，对应“一个零件一个零件拼出迷你 Vue”。
// 内联 SVG，没有外部请求；装饰用（站名文字已是链接的可读内容），所以 aria-hidden。颜色在 style.css 的 .site-logo，跟随主题。
// 另外两个候选（对勾 V、台阶 V）在 design/logo/，换用方法见 design/logo/README.md。
</script>

<template>
  <svg class="site-logo" viewBox="0 0 32 32" width="24" height="24" aria-hidden="true" focusable="false">
    <path class="lg-a" d="M3 8h8l5 11.5V30z" />
    <path class="lg-b" d="M29 8h-8l-5 11.5V30z" />
    <path class="lg-a" d="M16 6.2l3.2 3.2-3.2 3.2-3.2-3.2z" />
  </svg>
</template>
