---
title: 速查表
id: cheat
stage: 4
order: 100
desc: 常用 API
---

# 速查表

::: cheat 展开速查表（30 条常用 API）
<div class="tbl-wrap">
<table v-pre class="t">
    <tr><th>类别</th><th>API</th><th>作用</th></tr>
    <tr><td rowspan="7">响应式</td><td><code>ref(v)</code></td><td>创建任意类型的响应式数据。使用 .value。</td></tr>
    <tr><td><code>reactive(obj)</code></td><td>创建对象的深层代理。</td></tr>
    <tr><td><code>computed(fn)</code></td><td>创建有缓存的计算属性。传入 {get,set} 时可写。</td></tr>
    <tr><td><code>watch(src, cb, opts)</code></td><td>侦听指定数据。选项：immediate、deep、once、flush。</td></tr>
    <tr><td><code>watchEffect(fn)</code></td><td>收集依赖，并立即运行。</td></tr>
    <tr><td><code>watch</code> 的返回值 / <code>onWatcherCleanup(fn)</code></td><td>返回的句柄有 stop() / pause() / resume()。在侦听器回调中登记清理函数（3.5 及以上）。</td></tr>
    <tr><td><code>toRefs / toRef / unref / isRef</code></td><td>在 ref 和普通值之间转换。</td></tr>
    <tr><td rowspan="3">高级响应式</td><td><code>shallowRef / shallowReactive</code></td><td>只跟踪第一层。</td></tr>
    <tr><td><code>readonly / markRaw / toRaw</code></td><td>只读。不代理。得到原始对象。</td></tr>
    <tr><td><code>effectScope / onScopeDispose</code></td><td>管理和停止一组副作用函数。</td></tr>
    <tr><td rowspan="3">生命周期</td><td><code>onMounted / onUnmounted</code></td><td>挂载后 / 卸载后运行。</td></tr>
    <tr><td><code>onBeforeUpdate / onUpdated</code></td><td>更新前 / 更新后运行。</td></tr>
    <tr><td><code>onActivated / onDeactivated / onErrorCaptured</code></td><td>KeepAlive 显示和隐藏时运行 / 捕获后代错误。</td></tr>
    <tr><td rowspan="7">组件（script setup）</td><td><code>defineProps / withDefaults</code></td><td>声明 props 和默认值。3.5 及以上可以解构 defineProps，并在解构时写默认值。</td></tr>
    <tr><td><code>defineEmits</code></td><td>声明事件。</td></tr>
    <tr><td><code>defineModel</code></td><td>声明 v-model。</td></tr>
    <tr><td><code>defineExpose</code></td><td>声明父组件可以调用的方法。</td></tr>
    <tr><td><code>defineSlots / useSlots / useAttrs</code></td><td>声明插槽类型。读取插槽和透传属性。</td></tr>
    <tr><td><code>defineOptions</code></td><td>在 script setup 中声明 name、inheritAttrs 等选项（3.3 及以上）。</td></tr>
    <tr><td><code>provide / inject</code></td><td>跨层传递数据。</td></tr>
    <tr><td rowspan="6">工具</td><td><code>nextTick()</code></td><td>等待 DOM 更新。</td></tr>
    <tr><td><code>useTemplateRef(key)</code></td><td>得到模板 ref（3.5 及以上）。</td></tr>
    <tr><td><code>useId()</code></td><td>生成服务器和浏览器一致的唯一 id（3.5 及以上）。</td></tr>
    <tr><td><code>toValue(x)</code></td><td>把 ref、getter 和普通值统一读成值。</td></tr>
    <tr><td><code>defineAsyncComponent</code></td><td>定义异步组件。</td></tr>
    <tr><td><code>KeepAlive / Teleport / Suspense / Transition</code></td><td>缓存组件 / 在其他位置渲染 / 等待异步组件 / 过渡动画。</td></tr>
    <tr><td rowspan="2">Pinia</td><td><code>defineStore / storeToRefs</code></td><td>定义 store / 解构 store。</td></tr>
    <tr><td><code>store.$patch / $reset / $subscribe</code></td><td>批量修改 / 重置 / 监听改变。$reset 只用于 options store。setup store 需要自己写 reset action。</td></tr>
    <tr><td rowspan="2">Router</td><td><code>useRoute / useRouter</code></td><td>读取当前路由 / 跳转。</td></tr>
    <tr><td><code>beforeEach / onBeforeRouteLeave</code></td><td>全局守卫 / 组件离开守卫。</td></tr>
  </table>
</div>
:::
