<script setup lang="ts">
// 实验台：同一个筛选条件，三种归属方式并排
import { onMounted, ref } from 'vue'
import { bar, canBack, counts, hooks, resetCounts, store, urlBack, urlText, type Part, type Side } from './placeState'
import PlaceVariantLocal from './PlaceVariantLocal.vue'
import PlaceVariantStore from './PlaceVariantStore.vue'
import PlaceVariantUrl from './PlaceVariantUrl.vue'

const root = ref<HTMLElement | null>(null)
const epoch = ref(0)

function paint() {
  root.value?.querySelectorAll<HTMLElement>('[data-c]').forEach(el => {
    const [side, part] = el.dataset.c!.split('-') as [Side, Part]
    el.textContent = String(counts[side][part])
  })
}
hooks.paint = paint
onMounted(paint)

const PARTS: [Part, string][] = [['Owner', '父组件'], ['Layout', '中间层'], ['Filter', '输入框'], ['Badge', '徽标'], ['List', '列表']]
const partsOf = (side: Side) => PARTS.filter(p => side === 'local' || p[0] !== 'Owner')

function refresh() {
  store.kw = ''          // 内存里的 store 随页面一起丢失
  epoch.value++          // 重新创建三个做法的组件。本地 ref 随之丢失
  resetCounts()          // 地址栏（bar）不动：刷新后地址还在
}
function reset() { resetCounts() }
</script>

<template>
  <div ref="root">
    <div class="row">
      <button class="b" @click="refresh">模拟刷新页面（F5）</button>
      <button class="b" @click="reset">计数归零</button>
    </div>
    <div class="cols">
      <div class="box" data-side="local">
        <b>提升到父组件</b>
        <div class="cap">地址栏：/tasks（不变）</div>
        <PlaceVariantLocal :key="epoch" />
        <div class="cap">更新次数：<span v-for="p in partsOf('local')" :key="p[0]">{{ p[1] }} <b :data-c="'local-' + p[0]">0</b>{{ ' · ' }}</span></div>
      </div>
      <div class="box" data-side="store">
        <b>Pinia store</b>
        <div class="cap">地址栏：/tasks（不变）</div>
        <PlaceVariantStore :key="epoch" />
        <div class="cap">更新次数：<span v-for="p in partsOf('store')" :key="p[0]">{{ p[1] }} <b :data-c="'store-' + p[0]">0</b>{{ ' · ' }}</span>（没有持有状态的父组件）</div>
      </div>
      <div class="box" data-side="url">
        <b>URL 查询串</b>
        <div class="cap">地址栏：<code class="pl-url">{{ urlText }}</code> <button class="b" :disabled="!canBack" @click="urlBack">后退</button></div>
        <PlaceVariantUrl :key="epoch" />
        <div class="cap">更新次数：<span v-for="p in partsOf('url')" :key="p[0]">{{ p[1] }} <b :data-c="'url-' + p[0]">0</b>{{ ' · ' }}</span>（没有持有状态的父组件）</div>
      </div>
    </div>
    <div class="cap">历史记录：{{ bar.entries.length }} 条（只有 URL 做法会产生）。输入文字用 replace，点预设按钮用 push，所以只有点预设能后退。</div>
  </div>
</template>
