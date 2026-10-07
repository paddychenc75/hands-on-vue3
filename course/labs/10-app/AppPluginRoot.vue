<script setup lang="ts">
// 插件实验台里面那个应用的根组件（旧版 Root）
import { inject, onMounted, ref } from 'vue'
import AppPanel from './AppPanel.vue'

const lab: any = inject('lab')
const { L, attach, cfg } = lab
const i18n: any = inject('i18n')
const toast: any = inject('toast')
const logRef = ref<HTMLElement | null>(null)
const key = ref(0)
onMounted(() => { attach(logRef.value); L('m', '应用已挂载。点击按钮，观察日志。') })
function flip() { i18n.locale.value = i18n.locale.value === 'zh' ? 'en' : 'zh'; L('tr', 'locale = "' + i18n.locale.value + '"：使用 $t 的模板重新渲染') }
function say() { toast(i18n.t('saved')); L('tr', 'inject("toast") 得到的函数被调用') }
function reset() { key.value++; L('m', '重新挂载 Panel') }
function clear() { if (logRef.value) logRef.value.innerHTML = '' }
</script>

<template>
  <div class="cols">
    <div class="box"><span class="cap">插件 I18n：模板中使用 $t</span>
      <p style="margin:0 0 6px"><b>{{ $t('hello') }}</b>，{{ $t('welcome') }}</p>
      <div class="row"><button class="b" @click="flip">切换语言（{{ i18n.locale.value }}）</button></div></div>
    <div class="box"><span class="cap">插件 Toast：全局组件 + inject</span>
      <div class="row"><button class="b pri" @click="say">保存</button><button class="b" @click="$toast('来自 $toast')">$toast()</button></div>
      <ToastHost /></div>
  </div>
  <div class="row" style="margin-top:10px">
    <label class="ctl"><input type="checkbox" v-model="cfg.stopInner"> ErrorBoundary 返回 false</label>
    <label class="ctl"><input type="checkbox" v-model="cfg.stopOuter"> Panel 返回 false</label>
    <label class="ctl"><input type="checkbox" v-model="cfg.handler"> 设置 app.config.errorHandler</label>
  </div>
  <div class="cols" style="margin-top:8px">
    <div><AppPanel :key="key" /><div class="row" style="margin-top:6px"><button class="b" @click="reset">重新挂载 Panel</button><button class="b" @click="clear">清空日志</button></div></div>
    <div class="log" ref="logRef" style="height:230px"></div>
  </div>
  <div class="cap">取消两个“返回 false”，再点击“事件中抛错”。错误传到 errorHandler。再取消 errorHandler，错误打印到浏览器控制台。</div>
</template>
