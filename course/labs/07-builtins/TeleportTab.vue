<script setup lang="ts">
// Teleport 标签页：弹窗渲染到 body；disabled 时留在原处
import { onMounted, ref, watch } from 'vue'

const open = ref(false)
const disabled = ref(false)
const where = ref('')

const read = () => {
  const m = document.querySelector('.bi-mask')
  const parent = m && m.parentElement
  where.value = parent
    ? '遮罩层的父元素：<' + parent.tagName.toLowerCase() + (parent.className ? ' class="' + parent.className + '"' : '') + '>'
    : '弹窗没有打开'
}
watch([open, disabled], read, { flush: 'post' })
onMounted(read)
</script>

<template>
  <div class="row">
    <button class="b pri" @click="open = true">打开弹窗</button>
    <label class="ctl"><input type="checkbox" v-model="disabled" /> disabled</label>
  </div>
  <div class="bi-trap" style="margin-top: 8px">
    <span class="cap">这个框有 overflow: hidden 和 transform</span>
    <Teleport to="body" :disabled="disabled">
      <div v-if="open" class="bi-mask" @click.self="open = false">
        <div class="bi-modal" role="dialog" aria-label="示例弹窗">
          <p style="margin: 0 0 8px">弹窗内容。disabled = {{ disabled }}</p>
          <button class="b pri" @click="open = false">关闭</button>
        </div>
      </div>
    </Teleport>
  </div>
  <div class="domview" style="margin-top: 6px">{{ where }}</div>
  <div class="cap">选择 disabled，然后打开弹窗。弹窗留在框内，被 transform 和 overflow 限制。</div>
</template>
