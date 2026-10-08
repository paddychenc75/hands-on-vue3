<script setup lang="ts">
// 实验台：在线编译（旧版 #demo-compile）
// 调用真实的 Vue.compile()：运行时编译需要带编译器的构建，和 Exercise 一样动态导入。
import { ref, computed, onMounted } from 'vue'

const presets: [string, string][] = [
  ['动态文本', '<div>\n  <h1>静态标题</h1>\n  <p>{{ msg }}</p>\n</div>'],
  ['动态 class + 属性', '<div :class="{ active: on }" :title="tip" id="box">\n  <span>hello</span>\n</div>'],
  ['v-for 带 key', '<ul>\n  <li v-for="item in list" :key="item.id">{{ item.name }}</li>\n</ul>'],
  ['v-if / v-else', '<div>\n  <p v-if="ok">yes</p>\n  <p v-else>no</p>\n</div>'],
  ['事件与组件', '<div>\n  <button @click="count++">+1</button>\n  <MyComp :value="count" @change="onChange" />\n</div>'],
  ['插槽', '<Card>\n  <template #header>{{ title }}</template>\n  正文\n</Card>'],
  ['v-model 与修饰符', '<div>\n  <input v-model.trim="text">\n  <button @click.stop="go">go</button>\n  <input @keyup.enter="go">\n  <p v-show="ok">x</p>\n</div>']
]
const FLAG: Record<number, string> = { 1: 'TEXT', 2: 'CLASS', 4: 'STYLE', 8: 'PROPS', 16: 'FULL_PROPS', 32: 'NEED_HYDRATION', 64: 'STABLE_FRAGMENT', 128: 'KEYED_FRAGMENT', 256: 'UNKEYED_FRAGMENT', 512: 'NEED_PATCH', 1024: 'DYNAMIC_SLOTS', 2048: 'DEV_ROOT_FRAGMENT' }
const decode = (n: number) => Object.keys(FLAG).map(Number).filter(b => n & b).map(b => FLAG[b]).join(' | ')

const preset = ref(0)
const src = ref(presets[0][1])
const compileFn = ref<null | ((s: string, o: any) => Function)>(null)

const result = computed(() => {
  if (!compileFn.value) return { code: '', err: '', flags: '', ready: false }
  const errs: string[] = []
  try {
    const fn = compileFn.value(src.value, { onError: (e: Error) => errs.push(e.message), onWarn: () => {} })
    if (errs.length) return { code: '', err: '编译错误：\n' + errs.join('\n'), flags: '', ready: true }
    const code = fn.toString()
    const found = new Set<number>()
    const re = /,\s(-?\d+)(?:,\s(?:\[[^\]]*\]|_hoisted_\d+))?\)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(code))) found.add(+m[1])
    const flags = found.size
      ? '本示例的 patchFlag：' + [...found].map(n => n + (n > 0 ? '（' + decode(n) + '）' : n === -1 ? '（CACHED）' : '')).join('，')
      : '本示例没有 patchFlag。'
    return { code: code.trim(), err: '', flags, ready: true }
  } catch (e: any) {
    return { code: '', err: '编译错误：' + e.message, flags: '', ready: true }
  }
})

function onPreset() { src.value = presets[preset.value][1] }

onMounted(async () => {
  const vm: any = await import('vue/dist/vue.esm-bundler.js')
  compileFn.value = vm.compile
})
</script>

<template>
  <div class="row">
    <label class="ctl">示例 <select class="t" v-model.number="preset" @change="onPreset">
      <option v-for="(p, i) in presets" :key="i" :value="i">{{ p[0] }}</option>
    </select></label>
  </div>
  <textarea class="t" v-model="src" spellcheck="false" aria-label="模板源码"></textarea>
  <div class="cap">{{ result.flags }}</div>
  <pre v-if="result.err" class="code" style="max-height:360px">{{ result.err }}</pre>
  <LabCode v-else-if="result.ready" :code="result.code" style="max-height:360px" />
  <pre v-else class="code" style="max-height:360px">正在编译…</pre>
</template>
