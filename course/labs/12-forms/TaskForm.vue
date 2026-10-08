<script setup lang="ts">
// 实验台：任务表单 TaskForm（旧版 #demo-form-reg）
import { ref, reactive, computed, watch, nextTick, onWatcherCleanup } from 'vue'
import { domLog } from '../_shared'

const TAKEN = ['build', 'deploy', 'review']
const sleep = (n: number) => new Promise(r => setTimeout(r, n))
const today = () => {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

const lg = ref<HTMLElement | null>(null)
const formEl = ref<HTMLFormElement | null>(null)
const L = (c: string, m: string) => domLog(lg.value, c, m)
const values = reactive<Record<string, string>>({ text: '', due: '' })
const touched = reactive<Record<string, boolean>>({})
const serverErrors = reactive<Record<string, string>>({})
const submitted = ref(false)
const checking = ref(false)
const loading = ref(false)
const done = ref('')

const rules: Record<string, ((v: string, all: Record<string, string>) => true | string)[]> = {
  text: [v => !!v || '请输入任务', v => v.length >= 3 || '至少 3 个字符'],
  due: [v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) || '日期格式：2026-06-01']
}
const errors = computed(() => {
  const out: Record<string, string> = {}
  for (const f in rules) {
    for (const r of rules[f]) {
      const x = r(values[f], values)
      if (x !== true) { out[f] = x; break }
    }
    if (!out[f] && serverErrors[f]) out[f] = serverErrors[f]
  }
  return out
})
const valid = computed(() => Object.keys(errors.value).length === 0 && !checking.value)
const errorOf = (f: string) => (touched[f] || submitted.value) ? (errors.value[f] || '') : ''
Object.keys(rules).forEach(f =>
  watch(() => values[f], () => {
    if (f !== 'text') delete serverErrors[f]
    done.value = ''
  })
)

let seq = 0
watch(() => values.text, text => {
  delete serverErrors.text
  if (text.length < 3) { checking.value = false; return }
  const id = ++seq
  let cancelled = false
  checking.value = true
  L('m', '#' + id + ' "' + text + '"：等待 400ms')
  const timer = setTimeout(async () => {
    L('tr', '#' + id + ' 请求服务器：是否已有任务 ' + text + '？')
    await sleep(500)
    if (cancelled) { L('x', '#' + id + ' 结果返回，但已过期，丢弃'); return }
    if (TAKEN.includes(text.toLowerCase())) serverErrors.text = '已有同名任务'
    checking.value = false
    L('rn', '#' + id + ' 结果：' + (serverErrors.text ? '已有同名任务' : '可以使用'))
  }, 400)
  onWatcherCleanup(() => {
    clearTimeout(timer)
    cancelled = true
    L('x', '#' + id + ' onWatcherCleanup：取消')
  })
})

async function submit() {
  submitted.value = true
  done.value = ''
  if (checking.value) { L('m', '提交：任务还在检查中，请稍候'); return }
  if (!valid.value) {
    const first = Object.keys(errors.value)[0]
    L('x', '提交：校验失败，聚焦 ' + first)
    await nextTick()
    ;(formEl.value!.elements.namedItem(first) as HTMLElement).focus()
    return
  }
  loading.value = true
  L('tr', '提交：发送请求…')
  await sleep(800)
  loading.value = false
  if (values.due && values.due < today()) {
    serverErrors.due = '截止日期不能早于今天'
    L('x', '服务器返回 422：{ errors: { due: "截止日期不能早于今天" } }')
    await nextTick()
    ;(formEl.value!.elements.namedItem('due') as HTMLElement).focus()
    return
  }
  L('rn', '服务器返回 201：任务已添加')
  done.value = '已添加任务：' + values.text
}

const debug = computed(() => JSON.stringify({
  values, touched, errors: errors.value, valid: valid.value, checking: checking.value,
  loading: loading.value, submitted: submitted.value
}, null, 2))

const fields = [
  { name: 'text', label: '任务', type: 'text', ac: 'off', ph: '' },
  { name: 'due', label: '截止日期（可以不填）', type: 'text', ac: 'off', ph: '2026-06-01' }
]

function reset() {
  Object.keys(values).forEach(k => { values[k] = '' })
  Object.keys(touched).forEach(k => delete touched[k])
  submitted.value = false
  done.value = ''
}
</script>

<template>
  <div class="cols">
    <form ref="formEl" novalidate @submit.prevent="submit" style="display:flex;flex-direction:column;gap:6px;min-width:0">
      <div v-for="f in fields" :key="f.name" style="display:flex;flex-direction:column;gap:2px">
        <label :for="'dfr-' + f.name" style="font-size:14px">{{ f.label }}</label>
        <input class="t" :id="'dfr-' + f.name" :name="f.name" :type="f.type" :autocomplete="f.ac" :placeholder="f.ph"
          v-model.trim="values[f.name]" @blur="touched[f.name] = true" :aria-invalid="!!errorOf(f.name)"
          :aria-describedby="errorOf(f.name) ? 'dfr-' + f.name + '-err' : undefined"
          :style="errorOf(f.name) ? 'border-color:var(--bad)' : ''" style="width:100%;box-sizing:border-box">
        <span v-if="f.name === 'text' && checking" class="cap">正在检查是否有同名任务…</span>
        <span v-if="errorOf(f.name)" :id="'dfr-' + f.name + '-err'" style="color:var(--bad);font-size:13px">{{ errorOf(f.name) }}</span>
      </div>
      <div class="row">
        <button class="b pri" :disabled="loading">{{ loading ? '保存中…' : '保存' }}</button>
        <button class="b" type="button" @click="reset">重置</button>
      </div>
      <div v-if="done" role="status" style="color:var(--accent)">{{ done }}</div>
    </form>
    <div class="box" style="min-width:0"><span class="cap">表单状态</span><div class="domview" style="max-height:300px;overflow:auto">{{ debug }}</div></div>
  </div>
  <div class="log" ref="lg" style="margin-top:8px"></div>
  <div class="cap">看板中已有的任务：build、deploy、review。服务器拒绝早于今天的截止日期，例如 2020-01-01。</div>
</template>
