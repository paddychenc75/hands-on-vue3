<script setup lang="ts">
// 实验台：搜索竞态（旧版 #demo-watch）
import { ref, watch } from 'vue'
import { domLog } from '../_shared'

const kw = ref('')
const result = ref('（还没有搜索）')
const useCleanup = ref(true)
const logEl = ref<HTMLElement | null>(null)
let seq = 0
watch(kw, (v, _o, onCleanup) => {
  const id = ++seq
  const delay = 200 + Math.floor(Math.random() * 1400)
  let cancelled = false
  if (useCleanup.value) onCleanup(() => { cancelled = true })
  domLog(logEl.value, 'tr', '#' + id + ' 请求 "' + v + '"，' + delay + 'ms 后返回')
  setTimeout(() => {
    if (cancelled) { domLog(logEl.value, 'x', '#' + id + ' 返回 "' + v + '"，已作废，丢弃'); return }
    result.value = v ? '关于 “' + v + '” 的 ' + (v.length * 7 + 3) + ' 条结果' : '（空）'
    const stale = v !== kw.value
    domLog(logEl.value, stale ? 'x' : 'rn', '#' + id + ' 返回 "' + v + '"，写入结果' + (stale ? '  ⚠ 旧请求的结果替换了新结果' : ''))
  }, delay)
})
</script>

<template>
  <div class="row">
    <label class="ctl">关键词 <input class="t" v-model="kw" placeholder="快速输入 vue3" style="width:180px"></label>
    <label class="ctl"><input type="checkbox" v-model="useCleanup"> 使用 onCleanup</label>
  </div>
  <dl class="kv"><dt>当前关键词</dt><dd>{{ kw || '（空）' }}</dd><dt>显示的结果</dt><dd>{{ result }}</dd></dl>
  <div class="log" ref="logEl"></div>
  <div class="cap">取消选择 onCleanup，然后快速输入。日志显示红色警告。这表示结果和当前关键词不一致。</div>
</template>
