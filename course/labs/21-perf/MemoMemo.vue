<script setup lang="ts">
// 用 v-memo 的 5000 行列表：只有“是否选中”变化的行才重新渲染
import { memoItems as items, memoSel as sel } from './perfState'
</script>

<template>
  <div><div v-for="it in items" :key="it.id" v-memo="[it.id === sel]" class="vrow" :style="it.id === sel ? { background: 'var(--accent-soft)' } : null"><span>{{ it.label }}</span><span>{{ it.id === sel ? '已选中' : '' }}</span></div></div>
</template>
