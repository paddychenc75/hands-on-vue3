<script setup lang="ts">
// 带标签页的实验台通用外壳（旧版 TABS = [{name, tip, code, comp}] 的写法）。用法：在实验台 SFC 里
//
//   import DirBind from './DirBind.vue'
//   const TABS = [
//     { name: 'v-bind', tip: '说明文字', code: '<button :class="…">', comp: DirBind },
//   ]
//   // 模板：<TabbedLab :tabs="TABS" />
//
// 每个标签页：name 标签名；tip 标签下方的说明（可省略）；code 左边显示的代码（省略就只显示运行效果）；
// comp 右边“运行效果”里渲染的组件。切换标签页时用 :key 重新创建 comp，所以每个标签页的状态互相独立。
// 默认插槽（可选）显示在标签页内容下面，参数 { tab, index }，例如放“渲染出的 DOM”。
import { ref } from 'vue'

export interface LabTab {
  name: string
  tip?: string
  code?: string
  comp: any
}

const props = withDefaults(defineProps<{ tabs: LabTab[]; runLabel?: string; start?: number }>(), { runLabel: '运行效果', start: 0 })
const index = ref(props.start)
</script>

<template>
  <div class="tabs">
    <button v-for="(t, k) in tabs" :key="k" type="button" :class="{ on: index === k }" @click="index = k">{{ t.name }}</button>
  </div>
  <div v-if="tabs[index].tip" class="cap">{{ tabs[index].tip }}</div>
  <div class="cols">
    <LabCode v-if="tabs[index].code != null" :code="tabs[index].code!" style="margin: 0" />
    <div class="box">
      <span class="cap">{{ runLabel }}</span>
      <component :is="tabs[index].comp" :key="index" />
    </div>
  </div>
  <slot :tab="tabs[index]" :index="index" />
</template>
