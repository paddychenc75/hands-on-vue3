<script setup lang="ts">
import { ref, useCssVars, onMounted, onUnmounted } from 'vue'

const color = ref('#23845a')
const size = ref(18)
const rootRef = ref<HTMLElement | null>(null)
const styleAttr = ref('')
const changes = ref(0)
useCssVars(() => ({ '7ba5bd90-color': color.value, '7ba5bd90-size': size.value + 'px' }))
let mo: MutationObserver | undefined
onMounted(() => {
  const read = () => { styleAttr.value = rootRef.value!.getAttribute('style') || ''; changes.value++ }
  read()
  mo = new MutationObserver(read)
  mo.observe(rootRef.value!, { attributes: true, attributeFilter: ['style'] })
})
onUnmounted(() => mo && mo.disconnect())
</script>

<template>
  <div ref="rootRef" class="box">
    <span class="cap">组件的根元素</span>
    <div class="row">
      <label class="ctl">color <input type="color" v-model="color"></label>
      <label class="ctl">size <input type="range" min="12" max="32" v-model.number="size"> {{ size }}px</label>
    </div>
    <p class="demo-tool-cv-title">这段文字的颜色和大小来自 CSS 变量</p>
    <div class="cap" style="margin-top:6px">根元素的 style 属性（第 {{ changes }} 次读取）：</div>
    <div class="domview">style="{{ styleAttr }}"</div>
  </div>
</template>

<style scoped>
.demo-tool-cv-title { color: var(--7ba5bd90-color); font-size: var(--7ba5bd90-size); margin: 0; transition: color .2s; }
</style>
