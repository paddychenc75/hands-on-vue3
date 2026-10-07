<script setup lang="ts">
// 实验台：class 和 style 的结果（旧版 #demo-classes）
// 勾选开关，右边显示真实渲染出来的 class 和 style 属性。
import { computed, onMounted, ref, watch } from 'vue'

const isActive = ref(true)
const hasError = ref(false)
const useArray = ref(false)
const size = ref(14)
const box = ref<HTMLElement | null>(null)
const cls = ref('')
const sty = ref('')

// 读 DOM 上真实的属性。要等 DOM 更新之后读，所以 flush: 'post'。
const read = () => {
  const el = box.value && box.value.firstElementChild
  if (el) {
    cls.value = el.getAttribute('class') || ''
    sty.value = el.getAttribute('style') || ''
  }
}
onMounted(read)
watch([isActive, hasError, useArray, size], read, { flush: 'post' })

const code = computed(() =>
  useArray.value
    ? '<p class="item"\n   :class="[{ active: isActive }, hasError ? \'error\' : \'\']"\n   :style="[{ fontSize: size + \'px\' }, { color: \'var(--accent)\' }]">'
    : '<p class="item"\n   :class="{ active: isActive, error: hasError }"\n   :style="{ fontSize: size + \'px\' }">'
)
</script>

<template>
  <div class="row">
    <label class="ctl"><input type="checkbox" v-model="isActive" /> isActive</label>
    <label class="ctl"><input type="checkbox" v-model="hasError" /> hasError</label>
    <label class="ctl"><input type="checkbox" v-model="useArray" /> 数组语法</label>
    <label class="ctl">size <input type="range" min="12" max="22" v-model.number="size" /> {{ size }}</label>
  </div>
  <div class="cols" style="margin-top: 8px">
    <LabCode :code="code" style="margin: 0" />
    <div class="box">
      <span class="cap">运行效果</span>
      <div ref="box">
        <p
          v-if="useArray"
          class="item"
          :class="[{ active: isActive }, hasError ? 'error' : '']"
          :style="[{ fontSize: size + 'px' }, { color: 'var(--accent)' }]"
          style="margin: 0"
        >我是段落</p>
        <p
          v-else
          class="item"
          :class="{ active: isActive, error: hasError }"
          :style="{ fontSize: size + 'px' }"
          style="margin: 0"
        >我是段落</p>
      </div>
      <div class="cap" style="margin-top: 6px">渲染出的属性：</div>
      <div class="domview" data-view="attrs">{{ 'class="' + cls + '"\nstyle="' + sty + '"' }}</div>
    </div>
  </div>
  <div class="cap">说明：静态的 class 和 style 与绑定的值合并。数组语法中，空字符串不产生类名。</div>
</template>
