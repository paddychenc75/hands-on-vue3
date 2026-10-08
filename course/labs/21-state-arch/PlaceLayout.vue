<script setup lang="ts">
// 中间层：自己不使用筛选条件，只是把页面拼起来。
// 提升到父组件的做法里，它必须接收 kw 并转交给子组件，所以每次输入它也会更新。
import { onUpdated } from 'vue'
import { count, type Side } from './placeState'
import PlaceFilterBox from './PlaceFilterBox.vue'
import PlaceBadge from './PlaceBadge.vue'
import PlaceList from './PlaceList.vue'

const props = defineProps<{ side: Side; kw?: string }>()
const emit = defineEmits<{ set: [v: string, how: 'type' | 'pick'] }>()
onUpdated(() => count(props.side, 'Layout'))
</script>

<template>
  <div>
    <PlaceBadge :side="side" :kw="kw" />
    <PlaceFilterBox :side="side" :kw="kw" @set="(v, h) => emit('set', v, h)" />
    <PlaceList :side="side" :kw="kw" />
  </div>
</template>
