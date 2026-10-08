<script setup lang="ts">
// 实验台：渲染模式选择器。回答四个问题，给出建议的模式、routeRules 写法和理由。
import { computed, ref } from 'vue'

const personalized = ref<'same' | 'user'>('same')
const freq = ref<'rare' | 'hourly' | 'realtime'>('hourly')
const seo = ref(true)
const fast = ref(true)
const hasServer = ref(true)

const result = computed(() => {
  if (personalized.value === 'user') {
    if (!seo.value) {
      return { mode: '纯客户端渲染（SPA）', rule: "'/app/**': { ssr: false }", why: '内容因人而异，服务器渲染出来的 HTML 不能给别人用，又不需要被搜索引擎收录。省下服务器的渲染工作，把页面做成登录后的单页应用。' }
    }
    return { mode: 'SSR', rule: '不写规则（默认就是 SSR）', why: '内容因人而异，不能在构建时生成，也不能让所有人共用一份缓存。要被收录或要快的首屏，就在每次请求时由服务器渲染。' }
  }
  if (!seo.value && !fast.value) {
    return { mode: '纯客户端渲染（SPA）', rule: "'/tools/**': { ssr: false }", why: '所有人看到的内容相同，但既不需要收录，也不在乎首屏。纯客户端渲染最简单，什么服务器都不需要。' }
  }
  if (freq.value === 'rare') {
    return { mode: '预渲染（SSG）', rule: "'/docs/**': { prerender: true }", why: '内容几乎不变，构建时生成 HTML 就够了。产物是静态文件，部署最简单，速度最快。' }
  }
  if (freq.value === 'hourly') {
    if (hasServer.value) {
      return { mode: 'SWR 缓存（或 ISR）', rule: "'/products/**': { swr: 3600 }", why: '内容相同但会更新。服务器渲染一次后缓存一小时，过期后在后台重新生成，用户总是先拿到缓存。ISR 与 SWR 类似，另外把结果放在 CDN 上，目前只有 Netlify、Vercel 等平台支持。' }
    }
    return { mode: '预渲染 + 定时重新构建', rule: "'/products/**': { prerender: true }", why: '没有可运行的服务器，不能在请求时再生成。用预渲染，并用定时任务（例如每小时）重新构建部署。' }
  }
  if (hasServer.value) {
    return { mode: 'SSR', rule: '不写规则（默认就是 SSR）', why: '内容实时变化，缓存会让用户看到旧内容。每次请求时在服务器渲染。' }
  }
  return { mode: '纯客户端渲染（SPA）', rule: "'/live/**': { ssr: false }", why: '内容实时变化，又没有服务器可以渲染。只能先发空壳页面，数据在浏览器里取。' }
})
</script>

<template>
  <div class="row">
    <label class="ctl">内容是否因人而异
      <select class="t" v-model="personalized" aria-label="内容是否因人而异">
        <option value="same">所有人相同</option>
        <option value="user">因人而异</option>
      </select>
    </label>
    <label class="ctl">更新频率
      <select class="t" v-model="freq" aria-label="更新频率">
        <option value="rare">几乎不变</option>
        <option value="hourly">每小时到每天</option>
        <option value="realtime">实时</option>
      </select>
    </label>
  </div>
  <div class="row">
    <label class="ctl"><input type="checkbox" v-model="seo" aria-label="需要被搜索引擎收录"> 需要被搜索引擎收录</label>
    <label class="ctl"><input type="checkbox" v-model="fast" aria-label="首屏要求高"> 首屏要求高</label>
    <label class="ctl"><input type="checkbox" v-model="hasServer" aria-label="有可运行的服务器"> 有可运行的服务器</label>
  </div>
  <div class="box">
    <span class="cap">建议</span>
    <p class="mode" style="margin: 4px 0; font-weight: 700">{{ result.mode }}</p>
    <p class="rule" style="margin: 4px 0"><code>routeRules: { {{ result.rule }} }</code></p>
    <p class="why" style="margin: 4px 0">{{ result.why }}</p>
  </div>
</template>
