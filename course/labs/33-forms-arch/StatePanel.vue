<script setup lang="ts">
// 状态检查器：每个已注册字段一行，加上表单级状态。
import { useFormContext } from './formKit'
import PanelRow from './PanelRow.vue'
import { useRenderCount } from './renderCount'

const form = useFormContext()!
const badge = useRenderCount()
</script>

<template>
  <div class="sp">
    <table>
      <thead><tr><th>路径</th><th>值</th><th>touched</th><th>dirty</th><th>error</th><th>检查中</th></tr></thead>
      <tbody><PanelRow v-for="p in [...form.fields.keys()]" :key="p" :path="p" /></tbody>
    </table>
    <dl class="kv">
      <dt>isValid</dt><dd data-form="isValid">{{ form.isValid.value }}</dd>
      <dt>dirty</dt><dd data-form="dirty">{{ form.dirty.value }}</dd>
      <dt>isSubmitting</dt><dd data-form="isSubmitting">{{ form.isSubmitting.value }}</dd>
      <dt>submitCount</dt><dd data-form="submitCount">{{ form.submitCount.value }}</dd>
    </dl>
    <p class="cap">面板自己更新 <b ref="badge" data-count="Panel">0</b> 次（它列出字段，也读表单级状态）</p>
  </div>
</template>

<style scoped>
.sp { min-width: 0; overflow-x: auto; }
table { border-collapse: collapse; font-size: 12.5px; display: table; width: 100%; margin: 0; }
th, td { border: 1px solid var(--line); padding: 2px 6px; text-align: left; white-space: nowrap; }
td.v { font-family: var(--f-mono); max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
td.e { color: var(--bad); }
th { background: var(--sunken); font-weight: 500; }
tr:nth-child(2n) { background: transparent; }
</style>
