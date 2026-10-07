<script setup lang="ts">
// CSS 中的 v-bind()（旧 demo-tool-cssvars）：真实的 useCssVars。左边是源码，右边是运行的组件。
import CssVarsDemo from './CssVarsDemo.vue'

const SRC = '<' + "script setup>\nconst color = ref('#23845a')\nconst size = ref(18)\n</" + "script>\n\n<style scoped>\n.title {\n  color: v-bind(color);\n  font-size: v-bind(size + 'px');\n}\n</style>\n\n// 编译器为 setup 生成：\nuseCssVars(_ctx => ({\n  '7ba5bd90-color': color.value,\n  '7ba5bd90-size': size.value + 'px'\n}))"
</script>

<template>
  <div class="cols">
    <LabCode :code="SRC" />
    <CssVarsDemo />
  </div>
  <div class="cap">拖动滑块。Vue 只修改根元素上的 CSS 变量，样式规则不变。</div>
</template>
