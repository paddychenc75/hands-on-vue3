<script setup lang="ts">
// 实验台：用 provide/inject 实现 Tabs（旧版 #demo-pat-tabs）
import { onMounted, ref } from 'vue'
import { dLogBuf } from '../_shared'
import TabsBox from './TabsBox.vue'
import TabsPanel from './TabsPanel.vue'
import { tabsLog } from './patternKeys'

const { L, attach } = dLogBuf()
tabsLog.L = L
const showSec = ref(true)
const orphan = ref(false)
const logRef = ref<HTMLElement | null>(null)
const nick = ref('小明')
onMounted(() => attach(logRef.value))
</script>

<template>
  <div class="row">
    <label class="ctl"><input type="checkbox" v-model="showSec" /> 显示“安全”（v-if）</label>
    <label class="ctl"><input type="checkbox" v-model="orphan" /> 在 Tabs 外放一个 Tab</label>
  </div>
  <div class="box" style="margin-top: 8px">
    <TabsBox>
      <TabsPanel name="info" title="资料"><label class="ctl">昵称 <input class="t" v-model="nick" style="width: 120px" /></label></TabsPanel>
      <TabsPanel v-if="showSec" name="security" title="安全"><p style="margin: 0">两步验证：已开启</p></TabsPanel>
      <TabsPanel name="notice" title="通知"><p style="margin: 0">{{ nick }}，你有 3 条新消息。</p></TabsPanel>
    </TabsBox>
  </div>
  <div v-if="orphan" style="margin-top: 8px"><TabsPanel name="lost" title="迷路">…</TabsPanel></div>
  <div class="log" ref="logRef" style="margin-top: 8px"></div>
</template>
