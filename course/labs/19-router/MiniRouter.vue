<script setup lang="ts">
// 实验台：简化的路由和导航守卫（旧版 #demo-router）
// 手写的迷你 Router：路径匹配、动态参数、props: true、meta + beforeEach 守卫、404 通配路由。
import { computed, reactive, ref, shallowRef } from 'vue'
import { domLog } from '../_shared'
import RouterHome from './RouterHome.vue'
import RouterTaskDetail from './RouterTaskDetail.vue'
import RouterAdmin from './RouterAdmin.vue'
import RouterLogin from './RouterLogin.vue'
import RouterNotFound from './RouterNotFound.vue'

const auth = reactive({ loggedIn: false })
const routes: any[] = [
  { path: '/', component: RouterHome },
  { path: '/task/:id', component: RouterTaskDetail, props: true },
  { path: '/admin', component: RouterAdmin, meta: { requiresAuth: true } },
  { path: '/login', component: RouterLogin },
  { path: '/:pathMatch(.*)*', component: RouterNotFound }
]
function match(full: string): any {
  const [p, qs] = full.split('?')
  const query = Object.fromEntries(new URLSearchParams(qs || ''))
  for (const r of routes) {
    if (r.path.startsWith('/:pathMatch')) return { route: r, params: { pathMatch: p }, query, path: p, fullPath: full }
    const names: string[] = []
    const re = new RegExp('^' + r.path.replace(/:(\w+)/g, (_: string, n: string) => { names.push(n); return '([^/]+)' }) + '$')
    const m = p.match(re)
    if (m) return { route: r, params: Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(m[i + 1])])), query, path: p, fullPath: full }
  }
}

const current = shallowRef(match('/'))
const input = ref('/')
const logRef = ref<HTMLElement | null>(null)
const links = ['/', '/task/1', '/task/2', '/admin', '/not/exist']

function push(to: string) {
  const L = (c: string, m: string) => domLog(logRef.value, c, m)
  let target = match(to)
  L('m', 'router.push("' + to + '")')
  if (target.route.meta && target.route.meta.requiresAuth && !auth.loggedIn) {
    L('x', 'beforeEach：未登录，重定向到 /login')
    target = match('/login?redirect=' + encodeURIComponent(to))
  } else L('rn', 'beforeEach：放行')
  L('tr', '匹配到 ' + target.route.path + (Object.keys(target.params).length ? '，params = ' + JSON.stringify(target.params) : ''))
  current.value = target
  input.value = target.fullPath
}
const view = computed(() => {
  const c = current.value
  const comp = c.route.component
  const props: Record<string, any> = c.route.props ? { ...c.params } : {}
  if (comp === RouterLogin) {
    props.redirect = c.query.redirect
    props.onLogin = () => { auth.loggedIn = true; domLog(logRef.value, 'rn', 'auth.loggedIn = true'); push(c.query.redirect || '/') }
  }
  return { comp, props, key: c.route.path } // 同一条路由复用组件，和 Vue Router 相同
})
function logout() { auth.loggedIn = false; domLog(logRef.value, 'x', 'auth.loggedIn = false') }
</script>

<template>
  <div class="row"><button v-for="l in links" :key="l" class="b" :class="{ on: current.path === l }" @click="push(l)">{{ l }}</button></div>
  <form class="row" @submit.prevent="push(input || '/')"><input class="t" v-model="input" aria-label="地址" style="flex:1;min-width:0;font-family:var(--f-mono)"><button class="b pri">前往</button></form>
  <div class="row cap">登录状态 <span class="pill" :class="{ g: auth.loggedIn }">{{ auth.loggedIn ? '已登录' : '未登录' }}</span><button v-if="auth.loggedIn" class="b" @click="logout">退出登录</button></div>
  <div class="cols"><div class="view"><span class="cap">&lt;RouterView&gt;</span><component :is="view.comp" v-bind="view.props" :key="view.key" /></div><div class="log" ref="logRef"></div></div>
</template>
