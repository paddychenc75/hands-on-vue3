<script setup lang="ts">
// 做法一：状态提升到共同父组件，用 props 向下传，用事件向上通知
import { onUpdated, ref } from 'vue'
import { count } from './placeState'
import PlaceLayout from './PlaceLayout.vue'

const kw = ref('')
onUpdated(() => count('local', 'Owner'))
</script>

<template>
  <PlaceLayout side="local" :kw="kw" @set="v => (kw = v)" />
</template>
