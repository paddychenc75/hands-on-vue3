<script setup lang="ts">
defineOptions({ inheritAttrs: false })
const model = defineModel<string>()
defineProps<{ options: { value: string; label: string }[] }>()
</script>

<template>
  <select v-model="model" v-bind="$attrs">
    <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
  </select>
</template>
