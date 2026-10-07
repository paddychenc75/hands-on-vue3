import { reactive } from 'vue'

/**
 * 章内自测题登记表：键和存储里 sc 的键一致（"<章id>:<序号>"），值是正确选项序号。
 * Sc 组件挂载时登记。Goal 组件用它判断目标是否完成。
 */
export const scRegistry = reactive<Record<string, number>>({})
