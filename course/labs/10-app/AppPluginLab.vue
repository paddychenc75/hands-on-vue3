<script setup lang="ts">
// 实验台：插件和错误边界（旧版 #demo-app-plugin）
// 这里新建一个独立的 Vue 应用（createApp），才能演示 app.use、app.component、app.config.errorHandler。
// 日志、开关通过 app.provide 传给里面的组件。
import { onBeforeUnmount, onMounted, reactive, ref, watch, type App } from 'vue'
import { createApp } from 'vue'
import { dLogBuf } from '../_shared'
import AppPluginRoot from './AppPluginRoot.vue'
import AppToastHost from './AppToastHost.vue'

const host = ref<HTMLElement | null>(null)
const { L, attach } = dLogBuf()
const cfg = reactive({ stopInner: true, stopOuter: false, handler: true })
const INFO: Record<string, string> = { 'runtime-1': '渲染函数', 'runtime-3': '侦听器回调', 'runtime-5': '事件处理函数', 'runtime-0': 'setup' }
const infoText = (info: unknown) => { const k = String(info).split('#')[1] || String(info); return INFO[k] || k }

/* 插件 1：i18n。提供 $t 和 inject('i18n') */
const I18n = {
  install(app: App, options: any) {
    L('m', 'app.use(I18n, { locale: "' + options.locale + '" })：install 运行')
    const locale = ref(options.locale)
    const t = (key: string) => (options.messages[locale.value] || {})[key] || key
    app.config.globalProperties.$t = t
    app.provide('i18n', { locale, t })
  }
}
/* 插件 2：toast。注册全局组件 ToastHost，并提供 toast() */
const Toast = {
  install(app: App, options: any) {
    L('m', 'app.use(Toast, { duration: ' + options.duration + ' })：install 运行，注册全局组件 ToastHost')
    const list = reactive<{ id: number; msg: string }[]>([])
    let id = 0
    const toast = (msg: string) => {
      const item = { id: ++id, msg }
      list.push(item)
      setTimeout(() => { const i = list.indexOf(item); if (i >= 0) list.splice(i, 1) }, options.duration)
    }
    app.provide('toast', toast)
    app.config.globalProperties.$toast = toast
    app.provide('toast-list', list)
    app.component('ToastHost', AppToastHost)
  }
}

let app: App | null = null
const origErr = console.error
onMounted(() => {
  app = createApp(AppPluginRoot)
  app.use(I18n, { locale: 'zh', messages: { zh: { hello: '你好', welcome: '欢迎学习插件', saved: '已保存' }, en: { hello: 'Hello', welcome: 'welcome to plugins', saved: 'Saved' } } })
    .use(Toast, { duration: 1500 })
  app.provide('lab', { L, attach, cfg, infoText })
  const handler = (err: any, _inst: unknown, info: string) => L('x', '③ app.config.errorHandler：' + err.message + '（来源：' + infoText(info) + '）')
  app.config.errorHandler = handler
  const a = app
  watch(() => cfg.handler, on => { a.config.errorHandler = on ? handler : undefined })
  console.error = function (this: unknown, ...args: any[]) {
    if (args[0] && args[0].__lab) L('x', '④ 没有处理函数：生产构建调用 console.error（' + args[0].message + '）')
    return origErr.apply(this, args as any)
  }
  app.mount(host.value!)
})
onBeforeUnmount(() => {
  console.error = origErr
  if (app) app.unmount()
})
</script>

<template>
  <div ref="host"></div>
</template>
