import { defineConfig } from 'vitest/config'

// 单元测试只测 course/engine/ 里的学习机制：logic/ 的纯函数，以及用假存储测的 store.ts、cards.ts。不需要浏览器和网络。
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node'
  }
})
