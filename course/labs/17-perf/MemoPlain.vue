<script setup lang="ts">
// 不用 v-memo 的 5000 行列表
import { memoItems as items, memoSel as sel } from './perfState'
</script>

<template>
  <div><div v-for="it in items" :key="it.id" class="vrow" :style="it.id === sel ? { background: 'var(--accent-soft)' } : null"><span>{{ it.label }}</span><span>{{ it.id === sel ? '已选中' : '' }}</span></div></div>
</template>
