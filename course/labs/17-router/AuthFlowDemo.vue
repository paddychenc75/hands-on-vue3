<script setup lang="ts">
// 实验台：真实的 Vue Router 里，未登录访问 /admin 的完整流程（旧版是手写的迷你路由）
// 用 memory history 造一个独立的 router，装在实验台自己的小应用里，不影响站点自己的页面。
import { createApp, h, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { domLog } from '../_shared'
import RouterHome from './RouterHome.vue'
import RouterTaskDetail from './RouterTaskDetail.vue'
import RouterAdmin from './RouterAdmin.vue'
import RouterLogin from './RouterLogin.vue'
import RouterNotFound from './RouterNotFound.vue'

const auth = reactive({ loggedIn: false })
const logRef = ref<HTMLElement | null>(null)
const mountRef = ref<HTMLElement | null>(null)
const current = ref('/')
const input = ref('/')
const links = ['/', '/task/1', '/task/2', '/admin', '/not/exist']
const L = (c: string, m: string) => domLog(logRef.value, c, m)

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: RouterHome },
    { path: '/task/:id', component: RouterTaskDetail, props: true },
    { path: '/admin', component: RouterAdmin, meta: { requiresAuth: true } },
    { path: '/login', component: RouterLogin, props: route => ({ redirect: route.query.redirect, onLogin: login }) },
    { path: '/:pathMatch(.*)*', component: RouterNotFound },
  ],
})

function login() {
  auth.loggedIn = true
  L('rn', 'auth.loggedIn = true')
  const back = router.currentRoute.value.query.redirect
  router.push(typeof back === 'string' ? back : '/')
}
function logout() {
  auth.loggedIn = false
  L('x', 'auth.loggedIn = false')
}
router.beforeEach((to) => {
  L('m', 'beforeEach：to = ' + to.fullPath)
  if (to.meta.requiresAuth && !auth.loggedIn) {
    L('x', 'beforeEach：未登录，重定向到 /login')
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})
router.afterEach((to) => {
  current.value = to.fullPath
  input.value = to.fullPath
  L('rn', 'afterEach：到达 ' + to.fullPath + (to.matched.length ? '，匹配 ' + to.matched[0].path : ''))
})
function go(to: string) {
  L('tr', 'router.push("' + to + '")')
  router.push(to)
}

let app: ReturnType<typeof createApp> | null = null
onMounted(() => {
  app = createApp({ render: () => h(RouterView) })
  app.use(router)
  app.mount(mountRef.value!)
})
onBeforeUnmount(() => app?.unmount())
</script>

<template>
  <div class="row"><button v-for="l in links" :key="l" class="b" :class="{ on: current === l }" @click="go(l)">{{ l }}</button></div>
  <form class="row" @submit.prevent="go(input || '/')"><input class="t" v-model="input" aria-label="地址" style="flex:1;min-width:0;font-family:var(--f-mono)"><button class="b pri">前往</button></form>
  <div class="row cap">登录状态 <span class="pill" :class="{ g: auth.loggedIn }">{{ auth.loggedIn ? '已登录' : '未登录' }}</span><button v-if="auth.loggedIn" class="b" @click="logout">退出登录</button></div>
  <div class="cols"><div class="view"><span class="cap">&lt;RouterView&gt;</span><div ref="mountRef"></div></div><div class="log" ref="logRef"></div></div>
</template>
