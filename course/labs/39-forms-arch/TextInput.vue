<script setup lang="ts">
// 输入控件：只认 v-model 和透传属性，不知道表单的存在。
defineOptions({ inheritAttrs: false })
const model = defineModel<string>()
</script>

<template>
  <input v-model="model" v-bind="$attrs">
</template>
