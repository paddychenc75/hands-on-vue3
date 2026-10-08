import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import ChapterHead from './components/ChapterHead.vue'
import ChapterFoot from './components/ChapterFoot.vue'
import AppEffects from './components/AppEffects.vue'
import './style.css'

// components/ 下的 .vue 全局注册，组件名 = 文件名。
// 示意图（figures/）和实验台（labs/）不在这里注册，由章节的 <script setup> 导入。
const modules = import.meta.glob('./components/*.vue', { eager: true }) as Record<string, { default: any }>

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'doc-before': () => h(ChapterHead), // 章标题上方的“第 N 章”
      'doc-footer-before': () => h(ChapterFoot), // 章末：完成状态和标记按钮
      'layout-bottom': () => h(AppEffects) // 全站的进度、阅读位置等效果
    }),
  enhanceApp({ app }) {
    for (const [path, mod] of Object.entries(modules)) {
      const name = path.replace(/^.*\/(.+)\.vue$/, '$1')
      app.component(name, mod.default)
    }
  }
} satisfies Theme
