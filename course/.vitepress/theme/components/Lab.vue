<script setup lang="ts">
// 实验台外壳。
//   <Lab id="demo-xxx" title="实验台：…" note="运行真实的 Vue">
//     <template #predict><Sc predict :a="1">…</Sc></template>
//     <MyLab />
//   </Lab>
// 有 predict 插槽时，猜完（或点“跳过”）才显示实验台正文。
// 实验台正文只在浏览器里渲染，并且接近视口时才挂载。
import { onBeforeUnmount, onMounted, provide, ref, useSlots } from 'vue'
import { LabKey } from '../composables/keys'

const props = defineProps<{ id: string; title: string; note?: string }>()
const slots = useSlots()
const root = ref<HTMLElement>()
const gated = ref(!!slots.predict)
const visible = ref(false)
const pending = ref<{ text: string; check: () => void } | null>(null)

function open() {
  if (!gated.value) return
  gated.value = false
  window.dispatchEvent(new Event('resize'))
}
provide(LabKey, {
  id: props.id,
  open,
  setPending: p => { pending.value = p }
})

let io: IntersectionObserver | null = null
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') { visible.value = true; return }
  io = new IntersectionObserver(es => {
    if (es.some(e => e.isIntersecting)) { visible.value = true; io?.disconnect() }
  }, { rootMargin: '600px 0px' })
  io.observe(root.value!)
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <div ref="root" class="lab" :class="{ gated }">
    <div class="lab-title"><span class="pg-badge">LIVE</span><span>{{ title.replace(/^实验台[：:]\s*/, '') }}</span> <small v-if="note">{{ note }}</small></div>
    <slot name="predict" />
    <div class="lab-body" :id="id">
      <ClientOnly><slot v-if="visible" /></ClientOnly>
    </div>
    <div v-if="pending" class="pr-check">
      <span>你猜的是：{{ pending.text }}。先运行上面的实验台，再核对。</span>
      <button type="button" class="b pri" @click="pending.check()">核对我的猜测</button>
    </div>
  </div>
</template>
