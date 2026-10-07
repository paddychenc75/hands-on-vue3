// 性能实验台的共享状态（旧版放在脚本闭包里的变量）
import { ref } from 'vue'

// demo-stable：两侧子组件各自被更新了多少次（普通对象，不是响应式）
export const stableCounts = { stable: 0, unstable: 0 }

// demo-memo：5000 行冻结数据，以及当前选中的行
export const memoItems = Object.freeze(
  Array.from({ length: 5000 }, (_, i) => Object.freeze({ id: i, label: '第 ' + (i + 1) + ' 行' }))
)
export const memoSel = ref(-1)
