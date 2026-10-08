<script setup lang="ts">
defineProps<{ title: string; count: number }>()
</script>

<template>
  <section class="column">
    <h3>{{ title }}（{{ count }}）</h3>
    <slot />
  </section>
</template>

<style scoped>
.column { background: var(--accent-soft, rgba(127,127,127,.08)); border-radius: 8px; padding: 8px; min-width: 0; }
.column h3 { font-size: 15px; margin: 0 0 6px; border: 0; padding: 0; }
</style>
