<script setup lang="ts">
// 做法二：状态放在 store，每个使用方自己读取
import { provide } from 'vue'
import { storeSource } from './placeState'
import PlaceLayout from './PlaceLayout.vue'

provide('placeSrc', storeSource)
</script>

<template>
  <PlaceLayout side="store" />
</template>
