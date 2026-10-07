<script setup lang="ts">
// 实验台：有和没有 KeepAlive（旧版 #demo-bi-keep）
import { onMounted, ref, watch } from 'vue'
import { alive, L, setLogEl } from './keepState'
import KeepTabA from './KeepTabA.vue'
import KeepTabB from './KeepTabB.vue'
import KeepTabC from './KeepTabC.vue'

const comps: Record<string, any> = { A: KeepTabA, B: KeepTabB, C: KeepTabC }
const MODES = [
  { v: 'none', t: '不用 KeepAlive' },
  { v: 'keep', t: '<KeepAlive>' },
  { v: 'max', t: '<KeepAlive :max="2">' },
  { v: 'include', t: '<KeepAlive include="TabA,TabB">' }
]

const cur = ref('A')
const mode = ref('keep')
const logRef = ref<HTMLElement | null>(null)

onMounted(() => {
  setLogEl(logRef.value)
  L('m', '在 TabA 中输入文字，然后切换到 B，再回到 A。')
})
watch(mode, m => L('i', '—— 切换为 ' + MODES.find(x => x.v === m)!.t + '。旧的 KeepAlive 被卸载，缓存清空 ——'))

const clear = () => { if (logRef.value) logRef.value.innerHTML = '' }
</script>

<template>
  <div class="row">
    <label class="ctl">模式 <select class="t" v-model="mode"><option v-for="m in MODES" :key="m.v" :value="m.v">{{ m.t }}</option></select></label>
    <button class="b" @click="clear">清空日志</button>
  </div>
  <div class="tabs" style="margin-top: 8px">
    <button v-for="(c, k) in comps" :key="k" type="button" :class="{ on: cur === k }" @click="cur = k">Tab{{ k }}</button>
  </div>
  <div class="cols" style="margin-top: 8px">
    <div>
      <KeepAlive v-if="mode !== 'none'" :key="mode" :max="mode === 'max' ? 2 : undefined" :include="mode === 'include' ? 'TabA,TabB' : undefined">
        <component :is="comps[cur]" />
      </KeepAlive>
      <component v-else :is="comps[cur]" />
      <div class="cap" style="margin-top: 8px">存活的组件实例（左边最久没有使用）：</div>
      <div class="row" style="gap: 6px"><span v-for="n in alive" :key="n" class="pill" :class="{ g: n === 'Tab' + cur }">{{ n }}</span></div>
    </div>
    <div class="log" ref="logRef" style="height: 220px"></div>
  </div>
  <div class="cap">选择 max=2，依次打开 A、B、C。缓存超出 2 个，最久没有使用的 TabA 被卸载。</div>
</template>
