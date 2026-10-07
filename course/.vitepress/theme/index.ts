import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import ChapterHead from './components/ChapterHead.vue'
import './style.css'

// components/ 下的 .vue 全局注册，组件名 = 文件名。
// 示意图（figures/）和实验台（labs/）不在这里注册，由章节的 <script setup> 导入。
const modules = import.meta.glob('./components/*.vue', { eager: true }) as Record<string, { default: any }>

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, { 'doc-before': () => h(ChapterHead) }),
  enhanceApp({ app }) {
    for (const [path, mod] of Object.entries(modules)) {
      const name = path.replace(/^.*\/(.+)\.vue$/, '$1')
      app.component(name, mod.default)
    }
  }
} satisfies Theme
