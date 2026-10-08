<script setup lang="ts">
// 两个组合式函数：useMouse 和 useDebounced（旧 demo-compose）。函数本身在 labs/_shared 里。
import { ref } from 'vue'
import { useMouse, useDebounced } from '../_shared'

const pad = ref<HTMLElement | null>(null)
const { x, y } = useMouse(pad)
const text = ref('')
const debounced = useDebounced(text, 500)
</script>

<template>
  <div class="cols">
    <div class="box">
      <span class="cap">useMouse(pad)：在虚线框中移动指针。</span>
      <div ref="pad" class="pad">
        <div class="dot" :style="{ left: x + 'px', top: y + 'px' }"></div>
        <div class="xy">x {{ x }} · y {{ y }}</div>
      </div>
    </div>
    <div class="box">
      <span class="cap">useDebounced(text, 500)：停止输入 0.5 秒后更新。</span>
      <input class="t" v-model="text" placeholder="输入试试" style="width:100%" />
      <dl class="kv" style="margin-top:8px">
        <dt>text</dt><dd>{{ text || '—' }}</dd>
        <dt>debounced</dt><dd>{{ debounced || '—' }}</dd>
      </dl>
    </div>
  </div>
</template>

<style scoped>
.pad { height: 120px; position: relative; touch-action: none; background: var(--bg); border-radius: 6px; }
.dot { position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: var(--accent); }
.xy { position: absolute; right: 8px; bottom: 6px; font-family: var(--f-mono); font-size: 12px; }
</style>
