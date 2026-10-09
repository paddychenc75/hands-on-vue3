import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import ChapterFoot from './components/ChapterFoot.vue'
import SelfExplain from './components/SelfExplain.vue'
import AppEffects from './components/AppEffects.vue'
import SiteLogo from './components/SiteLogo.vue'
import NavProgress from './components/NavProgress.vue'
import './style.css'

const SITE_CREDIT = '个人学习用的开源课程，与 Vue 官方无关。'

// components/ 下的 .vue 全局注册，组件名 = 文件名。
// 示意图（figures/）和实验台（labs/）不在这里注册，由章节的 <script setup> 导入。
const modules = import.meta.glob('./components/*.vue', { eager: true }) as Record<string, { default: any }>

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'doc-footer-before': () => [h(SelfExplain), h(ChapterFoot)], // 章末：自我解释，再往下是“掌握标准”条（还差什么，达标后自动完成）
      'nav-bar-content-after': () => h(NavProgress), // 顶栏右侧：总进度条和“已完成 N/26”
      'nav-bar-title-before': () => h(SiteLogo), // 站名左边的标志
      'doc-after': () => h('p', { class: 'site-credit' }, SITE_CREDIT), // 每页底部的署名
      'layout-bottom': () => h(AppEffects) // 全站的进度、阅读位置等效果
    }),
  enhanceApp({ app }) {
    for (const [path, mod] of Object.entries(modules)) {
      const name = path.replace(/^.*\/(.+)\.vue$/, '$1')
      app.component(name, mod.default)
    }
  }
} satisfies Theme
