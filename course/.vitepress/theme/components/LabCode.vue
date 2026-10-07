<script setup lang="ts">
// 实验台里展示的代码（旧版的 pre.code）。用法：<LabCode :code="字符串" />
// 实验台是动态内容（代码会随开关变化），所以不走 Markdown 围栏代码块，用简单高亮。
import { computed } from 'vue'
import { hl } from '../composables/highlight'

const props = defineProps<{ code: string }>()
const html = computed(() => hl(props.code))
</script>

<template>
  <pre class="code" v-html="html"></pre>
</template>
