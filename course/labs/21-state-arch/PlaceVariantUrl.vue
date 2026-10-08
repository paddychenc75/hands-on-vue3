<script setup lang="ts">
// 做法三：状态放在地址栏，每个使用方从地址读取
import { provide } from 'vue'
import { urlSource } from './placeState'
import PlaceLayout from './PlaceLayout.vue'

provide('placeSrc', urlSource)
</script>

<template>
  <PlaceLayout side="url" />
</template>
