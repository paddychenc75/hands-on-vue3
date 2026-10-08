<script setup lang="ts">
// 实验台：真实的 Vue Router 里，一次导航按什么顺序运行守卫
// 用 memory history 造一个独立的 router，装在实验台自己的小应用里，不影响站点自己的页面。
import { createApp, defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

const logRef = ref<HTMLElement | null>(null)
const mountRef = ref<HTMLElement | null>(null)
const current = ref('/')
const links = ['/', '/user/1', '/user/2', '/admin']
// 按顺序往下追加（不用 domLog：它把最新的放在最上面，这里要从上往下读顺序）
function L(cls: string, msg: string) {
  const el = logRef.value
  if (!el) return
  const d = document.createElement('div')
  d.className = cls
  d.textContent = msg
  el.append(d)
  el.scrollTop = el.scrollHeight
}

// 三个页面组件，各带 beforeRouteEnter / beforeRouteUpdate / beforeRouteLeave 三种组件内守卫
function page(name: string) {
  return defineComponent({
    name,
    beforeRouteEnter() { L('tr', name + '：beforeRouteEnter') },
    beforeRouteUpdate() { L('tr', name + '：beforeRouteUpdate') },
    beforeRouteLeave() { L('tr', name + '：beforeRouteLeave') },
    render: () => h('p', { class: 'cap' }, '当前页面：' + name),
  })
}
const Home = page('Home')
const User = page('User')
const Admin = page('Admin')

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/user/:id', component: User, beforeEnter: () => { L('rn', '路由配置：beforeEnter') } },
    { path: '/admin', component: () => { L('m', '加载异步组件') ; return Promise.resolve(Admin) }, beforeEnter: () => { L('rn', '路由配置：beforeEnter') } },
  ],
})
router.beforeEach((to) => { L('x', '全局：beforeEach → ' + to.fullPath) })
router.beforeResolve(() => { L('rn', '全局：beforeResolve') })
router.afterEach((to) => { current.value = to.fullPath; L('x', '全局：afterEach（导航已确认）') })

async function go(to: string) {
  L('m', '—— router.push("' + to + '") ——')
  const failure = await router.push(to)
  if (failure) L('m', '导航失败：' + (failure.type === 16 ? 'duplicated（目标和当前相同）' : String(failure.type)))
}

let app: ReturnType<typeof createApp> | null = null
onMounted(() => {
  app = createApp({ render: () => h(RouterView) })
  app.use(router)
  app.mount(mountRef.value!)
  router.isReady().then(() => { if (logRef.value) logRef.value.textContent = '' })   // 初始导航的日志不要
})
onBeforeUnmount(() => app?.unmount())
</script>

<template>
  <div class="row"><button v-for="l in links" :key="l" class="b" :class="{ on: current === l }" @click="go(l)">{{ l }}</button><button class="b" @click="logRef && (logRef.textContent = '')">清空日志</button></div>
  <div class="cols"><div class="view"><span class="cap">&lt;RouterView&gt;</span><div ref="mountRef"></div></div><div class="log" ref="logRef" style="max-height: 320px; overflow: auto"></div></div>
</template>
