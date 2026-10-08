<script setup lang="ts">
import { computed, inject, onUnmounted } from 'vue'
import { TabsKey, tabsLog } from './patternKeys'

const props = defineProps<{ name: string; title: string }>()
const ctx = inject(TabsKey, null)
let orphan = false
let isActive = computed(() => false)
if (!ctx) {
  tabsLog.L('x', '<Tab name="' + props.name + '"> 没有找到 Tabs：inject 返回 null')
  orphan = true
} else {
  onUnmounted(ctx.register({ name: props.name, title: props.title }))
  isActive = computed(() => ctx.active.value === props.name)
}
</script>

<template>
  <div v-if="orphan" style="color: var(--bad)">错误：Tab 必须放在 Tabs 中</div>
  <div v-else-if="isActive" role="tabpanel"><slot></slot></div>
</template>
