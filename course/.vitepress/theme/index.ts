import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import ChapterHead from './components/ChapterHead.vue'
import ChapterFoot from './components/ChapterFoot.vue'
import AppEffects from './components/AppEffects.vue'
import NavProgress from './components/NavProgress.vue'
import './style.css'

// components/ 下的 .vue 全局注册，组件名 = 文件名。
// 示意图（figures/）和实验台（labs/）不在这里注册，由章节的 <script setup> 导入。
const modules = import.meta.glob('./components/*.vue', { eager: true }) as Record<string, { default: any }>

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'doc-before': () => h(ChapterHead), // 章标题上方的“第 N 章”
      'doc-footer-before': () => h(ChapterFoot), // 章末：“掌握标准”条（还差什么，达标后自动完成）
      'nav-bar-content-after': () => h(NavProgress), // 顶栏右侧：总进度条和“已完成 N/26”
      'layout-bottom': () => h(AppEffects) // 全站的进度、阅读位置等效果
    }),
  enhanceApp({ app }) {
    for (const [path, mod] of Object.entries(modules)) {
      const name = path.replace(/^.*\/(.+)\.vue$/, '$1')
      app.component(name, mod.default)
    }
  }
} satisfies Theme
