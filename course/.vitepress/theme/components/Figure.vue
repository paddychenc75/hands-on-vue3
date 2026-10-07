<script setup lang="ts">
defineProps<{ caption: string }>()
</script>

<template>
  <figure class="fig">
    <slot />
    <figcaption>{{ caption }}</figcaption>
  </figure>
</template>
