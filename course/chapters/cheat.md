---
title: 速查表
id: cheat
order: 100
desc: 常用 API 和响应式症状诊断表
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

::: cheat 响应式症状诊断表
先问四问，再查这张表。每行的三个原因按出现频率排序。

| 症状 | 最可能的三个原因 | 先查什么 |
|---|---|---|
| 数据变了，界面不动 | 1. 解构、`.value` 取值、整体替换（27.2）<br>2. 读取在 `await` 之后或回调里（27.5）<br>3. 模板里嵌套的 ref 没有解包（27.9） | `onRenderTracked` 有没有这份数据；`isRef`、`isReactive` |
| `watch`、`watchEffect` 不运行 | 1. 传了值不是 getter（27.6）<br>2. 依赖读取在 `await` 之后（27.5）<br>3. 侦听的对象被整体替换，或缺 `deep`（27.6） | `onTrack` 的日志；开发构建的警告 |
| 回调运行了，值是旧的 | 1. `setup` 里存的快照（27.4）<br>2. `deep` 侦听时新旧是同一个对象（27.4）<br>3. 回调读 DOM 但 `flush` 不对（27.6） | 回调里打印数据当前值，对比读到的值 |
| 运行次数太多，或卡死 | 1. 写自己依赖的数据（27.7）<br>2. 两个侦听器互相修改（27.7）<br>3. `deep` 范围过大（第 40 章） | 回调里计数；看控制台有没有 `Maximum recursive updates` |
| `===`、`includes` 找不到对象 | 1. 一边是代理一边是原始对象（27.3）<br>2. `Set`、`Map` 的键混用了两种身份（27.3）<br>3. 第三方实例被代理（27.3） | 两边都 `toRaw` 再比较 |
| 卸载后仍在运行，越用越卡 | 1. 异步里创建的 `watch`（27.8）<br>2. 定时器和监听器没有清理（第 40 章）<br>3. 模块级的单例 `ref`（27.8） | 卸载后改一次数据，看回调还运行不运行 |

详见[第 27 章](/chapters/27-reactivity-pitfalls)。
:::
