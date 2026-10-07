<script setup lang="ts">
// 示意图外壳。标题有两种写法：
//   <Figure caption="纯文字标题"> 〈svg 组件〉 </Figure>
//   <Figure> 〈svg 组件〉 <template #caption>标题里可以有 <code>行内代码</code></template> </Figure>
// 点击图（或聚焦后按 Enter / 空格）放大到全屏，再点一下或按 Esc 还原。手机上图里的字很小，放大后能看清。
import { onBeforeUnmount, ref, watch } from 'vue'

defineProps<{ caption?: string }>()
const fig = ref<HTMLElement>()
const zoom = ref(false)

function fit(on: boolean) {
  const svg = fig.value?.querySelector('svg')
  if (!svg) return
  if (on) {
    // 放大后的宽度：至少是图原宽的 1.6 倍，窄屏上最多撑到屏宽（可横向滚动看全图）
    const vb = svg.viewBox.baseVal
    svg.style.maxWidth = 'none'
    svg.style.width = Math.max(vb.width * 1.6, Math.min(window.innerWidth - 32, vb.width * 2.2)) + 'px'
  } else {
    svg.style.maxWidth = ''
    svg.style.width = ''
  }
}
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') zoom.value = false }
watch(zoom, on => {
  fit(on)
  document.documentElement.classList.toggle('fig-open', on)
  if (on) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  if (zoom.value) document.documentElement.classList.remove('fig-open')
})
</script>

<template>
  <figure
    ref="fig"
    class="fig"
    :class="{ zoom }"
    :title="zoom ? '点击还原' : '点击放大'"
    role="button"
    tabindex="0"
    :aria-label="zoom ? '还原示意图' : '放大示意图'"
    @click="zoom = !zoom"
    @keydown.enter.prevent="zoom = !zoom"
    @keydown.space.prevent="zoom = !zoom"
  >
    <slot />
    <figcaption v-if="caption || $slots.caption"><slot name="caption">{{ caption }}</slot></figcaption>
  </figure>
</template>
