<script setup lang="ts">
// 调试面板里常见的写法：把整个 values 转成 JSON 显示。它读了所有字段，所以每次输入都会更新。
import { useFormContext } from './formKit'
import { useRenderCount } from './renderCount'

const form = useFormContext()!
const badge = useRenderCount()
</script>

<template>
  <div>
    <pre class="code" style="margin:0;max-height:120px;overflow:auto;font-size:12px">{{ JSON.stringify(form.values) }}</pre>
    <span class="cap">这块更新 <b ref="badge" data-count="RawJson">0</b> 次（读了整个 values）</span>
  </div>
</template>
